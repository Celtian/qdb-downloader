import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { CommitImportRequest, League } from '../shared/contracts.js';
import { camelCaseExportFieldNames, defaultExportColumns } from '../shared/export-schema.js';
import { SnapshotDatabase } from './database.js';
import { ApplicationError } from './errors.js';

const directories: string[] = [];

const createDatabasePath = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'qdb-downloader-test-'));
  directories.push(directory);
  return join(directory, 'snapshot.sqlite');
};

const createDatabase = (): SnapshotDatabase => new SnapshotDatabase(createDatabasePath());

const mergeOperation = () =>
  ({
    kind: 'merge',
    options: {
      existingRecords: 'refresh',
      teamLeagueConflicts: 'move',
      playerTeamConflicts: 'move',
    },
  }) as const;

afterEach(() => {
  while (directories.length) {
    const directory = directories.pop();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

describe('SnapshotDatabase', () => {
  test('persists one global export destination across database sessions', () => {
    const path = createDatabasePath();
    let database = new SnapshotDatabase(path);

    expect(database.getExportDestination()).toBeUndefined();
    database.setExportDestination('/exports/first');
    expect(database.getExportDestination()).toBe('/exports/first');
    database.setExportDestination('/exports/latest');
    database.close();

    database = new SnapshotDatabase(path);
    expect(database.getExportDestination()).toBe('/exports/latest');
    expect(() => database.setExportDestination('   ')).toThrow(ApplicationError);
    database.close();
  });

  test('persists one global export configuration and ignores invalid stored values', () => {
    const path = createDatabasePath();
    const configuration = {
      dataset: 'combined' as const,
      format: 'csv' as const,
      columns: defaultExportColumns(),
      fieldNames: camelCaseExportFieldNames(),
    };
    let database = new SnapshotDatabase(path);

    expect(database.getExportConfiguration()).toBeUndefined();
    expect(database.updateExportConfiguration(configuration)).toEqual(configuration);
    database.close();

    database = new SnapshotDatabase(path);
    expect(database.getExportConfiguration()).toEqual(configuration);
    const invalidConfiguration = {
      ...configuration,
      columns: { ...defaultExportColumns(), leagues: [] },
    };
    expect(() => database.updateExportConfiguration(invalidConfiguration)).toThrow(
      ApplicationError,
    );
    database.close();

    const rawDatabase = new DatabaseSync(path);
    rawDatabase
      .prepare("UPDATE application_preferences SET value = 'invalid' WHERE key = $key")
      .run({ key: 'export.configuration' });
    rawDatabase.close();

    database = new SnapshotDatabase(path);
    expect(database.getExportConfiguration()).toBeUndefined();
    database.close();
  });

  test('persists visibility and field-name preset collections independently', () => {
    const path = createDatabasePath();
    let database = new SnapshotDatabase(path);

    expect(database.getExportVisibilityPresets()).toBeUndefined();
    expect(database.getExportFieldNamePresets()).toBeUndefined();
    database.updateExportVisibilityPresets([
      {
        id: 'custom-visible',
        name: 'Public fields',
        columns: defaultExportColumns(),
      },
    ]);
    expect(database.getExportFieldNamePresets()).toBeUndefined();
    database.updateExportFieldNamePresets([]);
    expect(database.getExportFieldNamePresets()).toEqual([]);
    database.close();

    database = new SnapshotDatabase(path);
    expect(database.getExportVisibilityPresets()).toEqual([
      {
        id: 'custom-visible',
        name: 'Public fields',
        columns: defaultExportColumns(),
      },
    ]);
    expect(database.getExportFieldNamePresets()).toEqual([]);
    database.updateExportFieldNamePresets([
      {
        id: 'custom-api-names',
        name: 'API names',
        fieldNames: camelCaseExportFieldNames(),
      },
    ]);
    expect(database.getExportVisibilityPresets()).toHaveLength(1);
    database.close();
  });

  test('rejects invalid presets in either SQLite preference collection', () => {
    const database = createDatabase();
    const invalidColumns = defaultExportColumns();
    invalidColumns.leagues = [];
    const invalidNames = camelCaseExportFieldNames();
    invalidNames.players[0].outputName = 'sources';

    expect(() =>
      database.updateExportVisibilityPresets([
        { id: 'custom-empty', name: 'Empty', columns: invalidColumns },
      ]),
    ).toThrow(ApplicationError);
    expect(() =>
      database.updateExportFieldNamePresets([
        { id: 'custom-reserved', name: 'Reserved', fieldNames: invalidNames },
      ]),
    ).toThrow(ApplicationError);
    expect(database.getExportVisibilityPresets()).toBeUndefined();
    expect(database.getExportFieldNamePresets()).toBeUndefined();
    database.close();
  });

  test('normalizes names, rejects case-insensitive duplicates, and sorts by reference date', () => {
    const database = createDatabase();
    const first = database.createProject({ name: ' 2026/1 ', referenceDate: '2026-01-01' });
    database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });

    expect(first.name).toBe('2026/1');
    expect(first).toMatchObject({
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
      sourceNames: [],
    });
    expect(database.listProjects().map((project) => project.name)).toEqual(['2026/2', '2026/1']);
    expect(() => database.createProject({ name: '2026/1', referenceDate: '2025-01-01' })).toThrow(
      ApplicationError,
    );
    const renamed = database.renameProject({ projectId: first.id, name: '  Winter 2026  ' });
    expect(renamed).toMatchObject({ id: first.id, name: 'Winter 2026' });
    expect(() => database.renameProject({ projectId: first.id, name: '2026/2' })).toThrow(
      ApplicationError,
    );
    database.close();
  });

  test('deletes a project with all related data and preserves unrelated projects', () => {
    const database = createDatabase();
    const deletedProject = database.createProject({
      name: 'Deleted project',
      referenceDate: '2026-01-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved project',
      referenceDate: '2026-07-01',
    });
    const importProject = (projectId: string, suffix: string) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: {
          sourceId: `league-${suffix}`,
          name: `League ${suffix}`,
          sourceUrl: `https://example.test/league-${suffix}`,
        },
        teams: [
          {
            sourceId: `team-${suffix}`,
            name: `Team ${suffix}`,
            sourceUrl: `https://example.test/team-${suffix}`,
            players: [{ sourceId: `player-${suffix}`, name: `Player ${suffix}` }],
          },
        ],
      });
    importProject(deletedProject.id, 'deleted');
    importProject(preservedProject.id, 'preserved');

    expect(database.deleteProject(deletedProject.id)).toMatchObject({
      id: deletedProject.id,
      leagueCount: 1,
      teamCount: 1,
      playerCount: 1,
    });
    expect(() => database.getProjectSummary(deletedProject.id)).toThrow(ApplicationError);
    expect(() => database.deleteProject(deletedProject.id)).toThrow(ApplicationError);
    expect(database.listProjects()).toEqual([expect.objectContaining({ id: preservedProject.id })]);
    expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
      leagueCount: 1,
      teamCount: 1,
      playerCount: 1,
    });
    database.close();
  });

  test('deletes all projects and their related data in one operation', () => {
    const database = createDatabase();
    const first = database.createProject({
      name: 'First project',
      referenceDate: '2026-01-01',
    });
    const second = database.createProject({
      name: 'Second project',
      referenceDate: '2026-07-01',
    });
    const importProject = (projectId: string, suffix: string) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId: `league-${suffix}`,
          name: `League ${suffix}`,
          sourceUrl: `https://example.test/league-${suffix}`,
        },
        teams: [
          {
            sourceId: `team-${suffix}`,
            name: `Team ${suffix}`,
            sourceUrl: `https://example.test/team-${suffix}`,
            players: [{ sourceId: `player-${suffix}`, name: `Player ${suffix}` }],
          },
        ],
      });
    importProject(first.id, 'first');
    importProject(second.id, 'second');

    expect(database.deleteAllProjects()).toEqual([first.id, second.id].sort());
    expect(database.listProjects()).toEqual([]);
    expect(() => database.getProjectSummary(first.id)).toThrow(ApplicationError);
    expect(() => database.getProjectSummary(second.id)).toThrow(ApplicationError);
    expect(database.deleteAllProjects()).toEqual([]);
    database.close();
  });

  test('deletes a project-scoped team with its players and refreshes the project summary', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Team deletion',
      referenceDate: '2026-01-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved team project',
      referenceDate: '2026-07-01',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'league-delete-team',
        name: 'League',
        sourceUrl: 'https://example.test/league',
      },
      teams: [
        {
          sourceId: 'delete-team',
          name: 'Delete Team',
          sourceUrl: 'https://example.test/delete-team',
          players: [
            { sourceId: 'delete-player-1', name: 'Delete Player 1' },
            { sourceId: 'delete-player-2', name: 'Delete Player 2' },
          ],
        },
        {
          sourceId: 'keep-team',
          name: 'Keep Team',
          sourceUrl: 'https://example.test/keep-team',
          players: [{ sourceId: 'keep-player', name: 'Keep Player' }],
        },
      ],
    });
    const deletedTeam = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: 'Delete Team',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    expect(deletedTeam).toMatchObject({ name: 'Delete Team', playerCount: 2 });
    expect(() =>
      database.deleteTeam({ projectId: preservedProject.id, id: deletedTeam.id }),
    ).toThrow(ApplicationError);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const summary = database.deleteTeam({ projectId: project.id, id: deletedTeam.id });
    vi.useRealTimers();

    expect(summary).toMatchObject({
      id: project.id,
      leagueCount: 1,
      teamCount: 1,
      playerCount: 1,
      updatedAt: '2030-01-01T00:00:00.000Z',
    });
    expect(() =>
      database.getEntity({ projectId: project.id, entity: 'teams', id: deletedTeam.id }),
    ).toThrow(ApplicationError);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ name: 'Keep Player' })]);
    expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
      teamCount: 0,
      playerCount: 0,
    });
    expect(() => database.deleteTeam({ projectId: project.id, id: deletedTeam.id })).toThrow(
      ApplicationError,
    );
    database.close();
  });

  test('atomically deletes selected project teams with their players', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Bulk team deletion',
      referenceDate: '2026-01-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved bulk team deletion',
      referenceDate: '2026-07-01',
    });
    const importTeams = (projectId: string, suffix: string): void => {
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId: `bulk-league-${suffix}`,
          name: `Bulk League ${suffix}`,
          sourceUrl: `https://example.test/bulk-league-${suffix}`,
        },
        teams: [
          {
            sourceId: `bulk-team-a-${suffix}`,
            name: `Bulk Team A ${suffix}`,
            sourceUrl: `https://example.test/bulk-team-a-${suffix}`,
            players: [
              { sourceId: `bulk-player-a1-${suffix}`, name: `Bulk Player A1 ${suffix}` },
              { sourceId: `bulk-player-a2-${suffix}`, name: `Bulk Player A2 ${suffix}` },
            ],
          },
          {
            sourceId: `bulk-team-b-${suffix}`,
            name: `Bulk Team B ${suffix}`,
            sourceUrl: `https://example.test/bulk-team-b-${suffix}`,
            players: [{ sourceId: `bulk-player-b-${suffix}`, name: `Bulk Player B ${suffix}` }],
          },
        ],
      });
    };
    importTeams(project.id, 'selected');
    importTeams(preservedProject.id, 'preserved');
    const selectedTeams = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const preservedTeam = database.listEntities({
      projectId: preservedProject.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];

    expect(() =>
      database.deleteTeams({
        projectId: project.id,
        ids: [selectedTeams[0].id, preservedTeam.id],
      }),
    ).toThrow('One or more selected teams were not found.');
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 2, playerCount: 3 });
    expect(() => database.deleteTeams({ projectId: project.id, ids: [] })).toThrow(
      'Choose at least one valid team.',
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2033-01-01T00:00:00.000Z'));
    const summary = database.deleteTeams({
      projectId: project.id,
      ids: [...selectedTeams.map(({ id }) => id), selectedTeams[0].id],
    });
    vi.useRealTimers();

    expect(summary).toMatchObject({
      leagueCount: 1,
      teamCount: 0,
      playerCount: 0,
      updatedAt: '2033-01-01T00:00:00.000Z',
    });
    expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
      leagueCount: 1,
      teamCount: 2,
      playerCount: 3,
    });
    database.close();
  });

  test('deletes single and selected players within the requested project', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Player deletion',
      referenceDate: '2026-01-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved player deletion',
      referenceDate: '2026-07-01',
    });
    const importPlayers = (projectId: string, suffix: string): void => {
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        teams: [
          {
            sourceId: `player-team-${suffix}`,
            name: `Player Team ${suffix}`,
            sourceUrl: `https://example.test/player-team-${suffix}`,
            players: [
              { sourceId: `player-a-${suffix}`, name: `Player A ${suffix}` },
              { sourceId: `player-b-${suffix}`, name: `Player B ${suffix}` },
              { sourceId: `player-c-${suffix}`, name: `Player C ${suffix}` },
            ],
          },
        ],
      });
    };
    importPlayers(project.id, 'selected');
    importPlayers(preservedProject.id, 'preserved');
    const players = database.listEntities({
      projectId: project.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const preservedPlayer = database.listEntities({
      projectId: preservedProject.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];

    expect(() =>
      database.deletePlayers({
        projectId: project.id,
        ids: [players[0].id, preservedPlayer.id],
      }),
    ).toThrow('One or more selected players were not found.');
    expect(() => database.deletePlayers({ projectId: project.id, ids: [] })).toThrow(
      'Choose at least one valid player.',
    );

    database.deletePlayer({ projectId: project.id, id: players[0].id });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2034-01-01T00:00:00.000Z'));
    const summary = database.deletePlayers({
      projectId: project.id,
      ids: [players[1].id, players[2].id, players[1].id],
    });
    vi.useRealTimers();

    expect(summary).toMatchObject({
      leagueCount: 0,
      teamCount: 1,
      playerCount: 0,
      updatedAt: '2034-01-01T00:00:00.000Z',
    });
    expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
      teamCount: 1,
      playerCount: 3,
    });
    database.close();
  });

  test('atomically applies and clears a canonical country for selected teams', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Bulk team countries',
      referenceDate: '2026-01-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved bulk team countries',
      referenceDate: '2026-07-01',
    });
    const importTeam = (projectId: string, suffix: string): void => {
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        teams: [
          {
            sourceId: `country-team-${suffix}`,
            name: `Country Team ${suffix}`,
            sourceUrl: `https://example.test/country-team-${suffix}`,
            players: [],
          },
        ],
      });
    };
    importTeam(project.id, 'a');
    importTeam(project.id, 'b');
    importTeam(preservedProject.id, 'preserved');
    const teams = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const preservedTeam = database.listEntities({
      projectId: preservedProject.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];

    expect(() =>
      database.updateTeamCountries({
        projectId: project.id,
        ids: [teams[0].id, preservedTeam.id],
        countryCode3: 'CZE',
      }),
    ).toThrow('One or more selected teams were not found.');
    expect(() =>
      database.updateTeamCountries({
        projectId: project.id,
        ids: teams.map(({ id }) => id),
        countryCode3: 'invalid',
      }),
    ).toThrow('Choose a valid country or leave it empty.');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2034-01-01T00:00:00.000Z'));
    const summary = database.updateTeamCountries({
      projectId: project.id,
      ids: [...teams.map(({ id }) => id), teams[0].id],
      countryCode3: 'CZE',
    });
    vi.useRealTimers();

    expect(summary.updatedAt).toBe('2034-01-01T00:00:00.000Z');
    for (const team of teams) {
      expect(
        database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
      ).toMatchObject({
        countryName: 'Czech Republic',
        countryCode2: 'CZ',
        countryCode3: 'CZE',
        updatedAt: '2034-01-01T00:00:00.000Z',
      });
    }

    database.updateTeamCountries({
      projectId: project.id,
      ids: teams.map(({ id }) => id),
    });
    for (const team of teams) {
      expect(
        database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
      ).toMatchObject({
        countryName: undefined,
        countryCode2: undefined,
        countryCode3: undefined,
      });
    }
    expect(
      database.getEntity({
        projectId: preservedProject.id,
        entity: 'teams',
        id: preservedTeam.id,
      }),
    ).toMatchObject({ countryName: undefined });
    database.close();
  });

  test.each(['league-only', 'league-and-teams'] as const)(
    'deletes a project-scoped league using the %s mode',
    (mode) => {
      const database = createDatabase();
      const project = database.createProject({
        name: `League deletion ${mode}`,
        referenceDate: '2026-01-01',
      });
      const preservedProject = database.createProject({
        name: `Preserved league project ${mode}`,
        referenceDate: '2026-07-01',
      });
      database.commitImport({
        projectId: project.id,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId: 'league-delete',
          name: 'Delete League',
          sourceUrl: 'https://example.test/delete-league',
        },
        teams: [
          {
            sourceId: 'delete-team-one',
            name: 'Delete Team One',
            sourceUrl: 'https://example.test/delete-team-one',
            players: [
              { sourceId: 'delete-player-one', name: 'Delete Player One' },
              { sourceId: 'delete-player-two', name: 'Delete Player Two' },
            ],
          },
          {
            sourceId: 'delete-team-two',
            name: 'Delete Team Two',
            sourceUrl: 'https://example.test/delete-team-two',
            players: [{ sourceId: 'delete-player-three', name: 'Delete Player Three' }],
          },
        ],
      });
      database.commitImport({
        projectId: project.id,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId: 'league-keep',
          name: 'Keep League',
          sourceUrl: 'https://example.test/keep-league',
        },
        teams: [
          {
            sourceId: 'keep-team',
            name: 'Keep Team',
            sourceUrl: 'https://example.test/keep-team',
            players: [{ sourceId: 'keep-player', name: 'Keep Player' }],
          },
        ],
      });
      const deletedLeague = database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: 'Delete League',
        sort: 'name',
        direction: 'asc',
      }).rows[0];
      expect(deletedLeague).toMatchObject({
        name: 'Delete League',
        teamCount: 2,
        playerCount: 3,
      });
      expect(
        database.getEntity({
          projectId: project.id,
          entity: 'leagues',
          id: deletedLeague.id,
        }),
      ).toMatchObject({ teamCount: 2, playerCount: 3 });
      expect(() =>
        database.deleteLeague({
          projectId: preservedProject.id,
          id: deletedLeague.id,
          mode,
        }),
      ).toThrow(ApplicationError);
      expect(() =>
        database.deleteLeague({
          projectId: project.id,
          id: deletedLeague.id,
          mode: 'invalid' as never,
        }),
      ).toThrow('Choose a valid league deletion option.');

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
      const summary = database.deleteLeague({
        projectId: project.id,
        id: deletedLeague.id,
        mode,
      });
      vi.useRealTimers();

      expect(summary).toMatchObject({
        id: project.id,
        leagueCount: 1,
        teamCount: mode === 'league-only' ? 3 : 1,
        playerCount: mode === 'league-only' ? 4 : 1,
        updatedAt: '2030-01-01T00:00:00.000Z',
      });
      const teams = database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows;
      expect(teams.map((team) => team.name)).toEqual(
        mode === 'league-only'
          ? ['Delete Team One', 'Delete Team Two', 'Keep Team']
          : ['Keep Team'],
      );
      if (mode === 'league-only') {
        expect(teams.filter((team) => team.name.startsWith('Delete'))).toEqual([
          expect.objectContaining({ leagueId: undefined, playerCount: 2 }),
          expect.objectContaining({ leagueId: undefined, playerCount: 1 }),
        ]);
      }
      expect(
        database
          .listEntities({
            projectId: project.id,
            entity: 'players',
            pageIndex: 0,
            pageSize: 25,
            search: '',
            sort: 'name',
            direction: 'asc',
          })
          .rows.map((player) => player.name),
      ).toEqual(
        mode === 'league-only'
          ? ['Delete Player One', 'Delete Player Three', 'Delete Player Two', 'Keep Player']
          : ['Keep Player'],
      );
      expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
        leagueCount: 0,
        teamCount: 0,
        playerCount: 0,
      });
      expect(() =>
        database.deleteLeague({ projectId: project.id, id: deletedLeague.id, mode }),
      ).toThrow(ApplicationError);
      database.close();
    },
  );

  test.each(['league-only', 'league-and-teams'] as const)(
    'atomically deletes selected leagues using the %s mode',
    (mode) => {
      const database = createDatabase();
      const project = database.createProject({
        name: `Bulk league deletion ${mode}`,
        referenceDate: '2026-01-01',
      });
      const preservedProject = database.createProject({
        name: `Preserved bulk deletion ${mode}`,
        referenceDate: '2026-07-01',
      });
      const importLeague = (projectId: string, suffix: string, name: string): void => {
        database.commitImport({
          projectId,
          sourceName: 'transfermarkt',
          operation: mergeOperation(),
          league: {
            sourceId: `league-${suffix}`,
            name,
            sourceUrl: `https://example.test/league-${suffix}`,
          },
          teams: [
            {
              sourceId: `team-${suffix}`,
              name: `Team ${suffix}`,
              sourceUrl: `https://example.test/team-${suffix}`,
              players: [{ sourceId: `player-${suffix}`, name: `Player ${suffix}` }],
            },
          ],
        });
      };
      importLeague(project.id, 'a', 'Delete League A');
      importLeague(project.id, 'b', 'Delete League B');
      importLeague(project.id, 'keep', 'Keep League');
      importLeague(preservedProject.id, 'other', 'Other Project League');
      const selectedLeagues = database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: 'Delete League',
        sort: 'name',
        direction: 'asc',
      }).rows;
      const preservedLeague = database.listEntities({
        projectId: preservedProject.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0];

      expect(() =>
        database.deleteLeagues({
          projectId: project.id,
          ids: [selectedLeagues[0].id, preservedLeague.id],
          mode,
        }),
      ).toThrow('One or more selected leagues were not found.');
      expect(database.getProjectSummary(project.id).leagueCount).toBe(3);
      expect(() => database.deleteLeagues({ projectId: project.id, ids: [], mode })).toThrow(
        'Choose at least one valid league.',
      );

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2031-01-01T00:00:00.000Z'));
      const summary = database.deleteLeagues({
        projectId: project.id,
        ids: [...selectedLeagues.map(({ id }) => id), selectedLeagues[0].id],
        mode,
      });
      vi.useRealTimers();

      expect(summary).toMatchObject({
        leagueCount: 1,
        teamCount: mode === 'league-only' ? 3 : 1,
        playerCount: mode === 'league-only' ? 3 : 1,
        updatedAt: '2031-01-01T00:00:00.000Z',
      });
      expect(
        database
          .listEntities({
            projectId: project.id,
            entity: 'leagues',
            pageIndex: 0,
            pageSize: 25,
            search: '',
            sort: 'name',
            direction: 'asc',
          })
          .rows.map(({ name }) => name),
      ).toEqual(['Keep League']);
      const teams = database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows;
      expect(teams.map(({ name }) => name)).toEqual(
        mode === 'league-only' ? ['Team a', 'Team b', 'Team keep'] : ['Team keep'],
      );
      if (mode === 'league-only') {
        expect(teams.filter(({ name }) => name !== 'Team keep')).toEqual([
          expect.objectContaining({ leagueId: undefined }),
          expect.objectContaining({ leagueId: undefined }),
        ]);
      }
      expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
        leagueCount: 1,
        teamCount: 1,
        playerCount: 1,
      });
      database.close();
    },
  );

  test('atomically applies and clears a canonical country for selected leagues', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Bulk league countries',
      referenceDate: '2026-01-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved bulk countries',
      referenceDate: '2026-07-01',
    });
    const importLeague = (projectId: string, suffix: string): void => {
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId: `country-${suffix}`,
          name: `Country League ${suffix}`,
          sourceUrl: `https://example.test/country-${suffix}`,
        },
        teams: [
          {
            sourceId: `country-team-${suffix}`,
            name: `Country Team ${suffix}`,
            sourceUrl: `https://example.test/country-team-${suffix}`,
            players: [],
          },
        ],
      });
    };
    importLeague(project.id, 'a');
    importLeague(project.id, 'b');
    importLeague(preservedProject.id, 'other');
    const leagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const preservedLeague = database.listEntities({
      projectId: preservedProject.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];

    expect(() =>
      database.updateLeagueCountries({
        projectId: project.id,
        ids: [leagues[0].id, preservedLeague.id],
        countryCode3: 'CZE',
      }),
    ).toThrow('One or more selected leagues were not found.');
    expect(() =>
      database.updateLeagueCountries({
        projectId: project.id,
        ids: leagues.map(({ id }) => id),
        countryCode3: 'invalid',
      }),
    ).toThrow('Choose a valid country or leave it empty.');
    expect(
      database.getEntity({ projectId: project.id, entity: 'leagues', id: leagues[0].id }),
    ).toMatchObject({ countryName: undefined });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2032-01-01T00:00:00.000Z'));
    const summary = database.updateLeagueCountries({
      projectId: project.id,
      ids: leagues.map(({ id }) => id),
      countryCode3: 'CZE',
    });
    vi.useRealTimers();

    expect(summary.updatedAt).toBe('2032-01-01T00:00:00.000Z');
    for (const league of leagues) {
      expect(
        database.getEntity({ projectId: project.id, entity: 'leagues', id: league.id }),
      ).toMatchObject({
        countryName: 'Czech Republic',
        countryCode2: 'CZ',
        countryCode3: 'CZE',
        updatedAt: '2032-01-01T00:00:00.000Z',
      });
    }

    database.updateLeagueCountries({
      projectId: project.id,
      ids: leagues.map(({ id }) => id),
    });
    for (const league of leagues) {
      expect(
        database.getEntity({ projectId: project.id, entity: 'leagues', id: league.id }),
      ).toMatchObject({
        countryName: undefined,
        countryCode2: undefined,
        countryCode3: undefined,
      });
    }
    expect(
      database.getEntity({
        projectId: preservedProject.id,
        entity: 'leagues',
        id: preservedLeague.id,
      }),
    ).toMatchObject({ countryName: undefined });
    database.close();
  });

  test('validates, preserves, sorts, and filters optional league tiers', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'League tiers',
      referenceDate: '2026-01-01',
    });
    const otherProject = database.createProject({
      name: 'Other league tiers',
      referenceDate: '2026-07-01',
    });
    const importLeague = (projectId: string, suffix: string): void => {
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId: `tier-${suffix}`,
          name: `Tier League ${suffix}`,
          sourceUrl: `https://example.test/tier-${suffix}`,
        },
        teams: [
          {
            sourceId: `tier-team-${suffix}`,
            name: `Tier Team ${suffix}`,
            sourceUrl: `https://example.test/tier-team-${suffix}`,
            players: [],
          },
        ],
      });
    };
    importLeague(project.id, 'a');
    importLeague(project.id, 'b');
    importLeague(project.id, 'unset');
    importLeague(otherProject.id, 'other');
    const leagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const otherLeague = database.listEntities({
      projectId: otherProject.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];

    for (const tier of [0, 1.5, 11]) {
      expect(() =>
        database.updateLeagueTiers({
          projectId: project.id,
          ids: [leagues[0].id],
          tier,
        }),
      ).toThrow('Choose a tier from 1 to 10 or leave it empty.');
    }
    expect(() =>
      database.updateLeagueTiers({
        projectId: project.id,
        ids: [leagues[0].id, otherLeague.id],
        tier: 2,
      }),
    ).toThrow('One or more selected leagues were not found.');

    const first = leagues[0];
    expect(
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'leagues',
        id: first.id,
        name: first.name,
        sourceId: first.sourceId,
        tier: 3,
      }),
    ).toMatchObject({ tier: 3 });
    database.updateLeagueTiers({
      projectId: project.id,
      ids: [leagues[1].id],
      tier: 7,
    });

    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'tier',
        direction: 'asc',
      }).rows as League[],
    ).toEqual([
      expect.objectContaining({ tier: undefined }),
      expect.objectContaining({ tier: 3 }),
      expect.objectContaining({ tier: 7 }),
    ]);
    expect(
      database.listEntityFilterOptions({ projectId: project.id, entity: 'leagues' }),
    ).toMatchObject({
      tiers: [3, 7],
      hasLeaguesWithoutTier: true,
    });
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'leagues',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          tiers: [3],
          includeLeaguesWithoutTier: true,
        })
        .rows.map(({ name }) => name),
    ).toEqual(['Tier League a', 'Tier League unset']);

    importLeague(project.id, 'a');
    expect(
      database.getEntity({ projectId: project.id, entity: 'leagues', id: first.id }),
    ).toMatchObject({ tier: 3 });

    database.updateLeagueTiers({ projectId: project.id, ids: [first.id] });
    expect(
      database.getEntity({ projectId: project.id, entity: 'leagues', id: first.id }),
    ).toMatchObject({ tier: undefined });
    expect(
      database.getEntity({
        projectId: otherProject.id,
        entity: 'leagues',
        id: otherLeague.id,
      }),
    ).toMatchObject({ tier: undefined });
    database.close();
  });

  test('deletes selected source data with mixed-source descendants and preserves other projects', () => {
    const path = createDatabasePath();
    let database = new SnapshotDatabase(path);
    const project = database.createProject({
      name: 'Source deletion',
      referenceDate: '2026-01-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved project',
      referenceDate: '2026-07-01',
    });
    const importSource = (
      projectId: string,
      sourceName: 'transfermarkt' | 'soccerway',
      suffix: string,
    ) =>
      database.commitImport({
        projectId,
        sourceName,
        operation: mergeOperation(),
        league: {
          sourceId: `league-${suffix}`,
          name: `League ${suffix}`,
          sourceUrl: `https://example.test/league-${suffix}`,
        },
        teams: [
          {
            sourceId: `team-${suffix}`,
            name: `Team ${suffix}`,
            sourceUrl: `https://example.test/team-${suffix}`,
            players: [{ sourceId: `player-${suffix}`, name: `Player ${suffix}` }],
          },
        ],
      });
    importSource(project.id, 'transfermarkt', 'transfer');
    importSource(project.id, 'soccerway', 'soccer');
    importSource(preservedProject.id, 'transfermarkt', 'preserved');
    const transferLeague = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: 'League transfer',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const soccerTeam = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: 'Team soccer',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    expect(transferLeague.id).toBeTruthy();
    expect(soccerTeam.id).toBeTruthy();
    database.close();

    const rawDatabase = new DatabaseSync(path);
    rawDatabase
      .prepare('UPDATE teams SET league_id = $leagueId WHERE id = $teamId')
      .run({ leagueId: transferLeague.id, teamId: soccerTeam.id });
    rawDatabase
      .prepare(
        `UPDATE players SET source_name = 'worldfootball'
         WHERE project_id = $projectId AND source_id = 'player-transfer'`,
      )
      .run({ projectId: project.id });
    rawDatabase
      .prepare(
        `UPDATE players SET source_name = 'transfermarkt'
         WHERE project_id = $projectId AND source_id = 'player-soccer'`,
      )
      .run({ projectId: project.id });
    rawDatabase.close();
    database = new SnapshotDatabase(path);

    const preview = database.previewSourceDataDeletion({
      projectId: project.id,
      sourceNames: ['transfermarkt', 'eurofotbal', 'transfermarkt'],
    });

    expect(preview).toEqual({ leagues: 1, teams: 1, players: 2 });
    expect(database.getProjectSummary(project.id)).toMatchObject({
      leagueCount: 2,
      teamCount: 2,
      playerCount: 2,
      sourceNames: ['transfermarkt', 'soccerway', 'worldfootball'],
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const result = database.deleteSourceData({
      projectId: project.id,
      sourceNames: ['transfermarkt', 'eurofotbal', 'transfermarkt'],
    });
    vi.useRealTimers();

    expect(result.deleted).toEqual(preview);
    expect(result.project).toMatchObject({
      id: project.id,
      leagueCount: 1,
      teamCount: 1,
      playerCount: 0,
      sourceNames: ['soccerway'],
      updatedAt: '2030-01-01T00:00:00.000Z',
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([
      expect.objectContaining({
        id: soccerTeam.id,
        sourceName: 'soccerway',
        leagueId: undefined,
      }),
    ]);
    expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
      leagueCount: 1,
      teamCount: 1,
      playerCount: 1,
      sourceNames: ['transfermarkt'],
    });
    database.close();
  });

  test('rejects empty or unsupported source deletion requests', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Invalid source deletion',
      referenceDate: '2026-01-01',
    });

    expect(() => database.deleteSourceData({ projectId: project.id, sourceNames: [] })).toThrow(
      ApplicationError,
    );
    expect(() =>
      database.previewSourceDataDeletion({ projectId: project.id, sourceNames: [] }),
    ).toThrow(ApplicationError);
    expect(() =>
      database.deleteSourceData({
        projectId: project.id,
        sourceNames: ['unsupported' as never],
      }),
    ).toThrow(ApplicationError);
    expect(() =>
      database.previewSourceDataDeletion({
        projectId: project.id,
        sourceNames: ['unsupported' as never],
      }),
    ).toThrow(ApplicationError);
    expect(database.getProjectSummary(project.id)).toMatchObject({
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    });
    database.close();
  });

  test('isolates projects, pages data, and deduplicates imports without a season', () => {
    const database = createDatabase();
    const first = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    const second = database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });
    const request = {
      projectId: first.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: {
        sourceId: 'GB1',
        name: 'Premier League',
        sourceUrl: 'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1',
      },
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://www.transfermarkt.com/manchester-city/startseite/verein/281',
          players: [{ sourceId: '1', name: 'One, Player' }],
        },
      ],
    };

    database.commitImport(request);
    database.commitImport(request);
    expect(database.getProjectSummary(first.id)).toMatchObject({
      leagueCount: 1,
      teamCount: 1,
      playerCount: 1,
      sourceNames: ['transfermarkt'],
    });
    expect(database.getProjectSummary(second.id)).toMatchObject({
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
      sourceNames: [],
    });
    expect(database.listProjects()).toEqual([
      expect.objectContaining({
        id: second.id,
        leagueCount: 0,
        teamCount: 0,
        playerCount: 0,
        sourceNames: [],
      }),
      expect.objectContaining({
        id: first.id,
        leagueCount: 1,
        teamCount: 1,
        playerCount: 1,
        sourceNames: ['transfermarkt'],
      }),
    ]);
    const page = database.listEntities({
      projectId: first.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 1,
      search: 'One',
      sort: 'name',
      direction: 'asc',
    });
    expect(page.total).toBe(1);
    expect(page.rows[0]?.name).toBe('One, Player');
    const leagues = database.listEntities({
      projectId: first.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'teamCount',
      direction: 'desc',
    });
    const teams = database.listEntities({
      projectId: first.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'playerCount',
      direction: 'desc',
    });
    expect(leagues.rows[0]).toMatchObject({ name: 'Premier League', teamCount: 1 });
    expect(teams.rows[0]).toMatchObject({ name: 'Manchester City', playerCount: 1 });
    database.close();
  });

  test('keeps provider identities independent, derives URLs, and filters every entity by source', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Provider identities',
      referenceDate: '2026-01-01',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'CZ1',
        name: 'Czech First League',
        season: '2026',
        sourceUrl: 'https://ignored.test/transfermarkt-league',
      },
      teams: [
        {
          sourceId: '281',
          name: 'Transfermarkt Team',
          season: '2026',
          sourceUrl: 'https://ignored.test/transfermarkt-team',
          players: [{ sourceId: 'shared-player', name: 'Transfermarkt Player' }],
        },
      ],
    });
    const soccerwayRequest: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'soccerway',
      operation: mergeOperation(),
      league: {
        sourceId: 'czech-republic/chance-liga/standings/bNFMkskm',
        name: 'Chance Liga',
        sourceUrl: 'https://ignored.test/soccerway-league',
      },
      teams: [
        {
          sourceId: 'slavia-prague/viXGgnyB',
          name: 'Soccerway Team',
          sourceUrl: 'https://ignored.test/soccerway-team',
          players: [{ sourceId: 'shared-player', name: 'Soccerway Player' }],
        },
      ],
    };
    database.commitImport(soccerwayRequest);
    database.commitImport(soccerwayRequest);
    const worldFootballRequest: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'worldfootball',
      operation: mergeOperation(),
      league: {
        sourceId: 'co7093/mexico-lp---serie-b',
        name: 'Mexico LP - Serie B',
        sourceUrl: 'https://ignored.test/worldfootball-league',
      },
      teams: [
        {
          sourceId: 'te237557/artesanos-metepec',
          name: 'WorldFootball Team',
          sourceUrl: 'https://ignored.test/worldfootball-team',
          players: [{ sourceId: 'pe599828/oscar-altamirano', name: 'WorldFootball Player' }],
        },
      ],
    };
    database.commitImport(worldFootballRequest);
    database.commitImport(worldFootballRequest);
    const eurofotbalRequest: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'eurofotbal',
      operation: mergeOperation(),
      league: {
        sourceId: 'chance-liga/2026-2027',
        name: 'Chance Liga',
        sourceUrl: 'https://ignored.test/eurofotbal-league',
      },
      teams: [
        {
          sourceId: 'cesko/sparta-praha',
          name: 'Eurofotbal Team',
          sourceUrl: 'https://ignored.test/eurofotbal-team',
          players: [{ sourceId: 'cesko/example-player', name: 'Eurofotbal Player' }],
        },
      ],
    };
    database.commitImport(eurofotbalRequest);
    database.commitImport(eurofotbalRequest);

    expect(database.getProjectSummary(project.id)).toMatchObject({
      leagueCount: 4,
      teamCount: 4,
      playerCount: 4,
    });
    const listBySource = (
      entity: 'leagues' | 'teams' | 'players',
      sourceName: 'soccerway' | 'worldfootball' | 'eurofotbal',
    ) =>
      database.listEntities({
        projectId: project.id,
        entity,
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
        sourceNames: [sourceName, 'invalid' as never],
      });
    const soccerwayLeague = listBySource('leagues', 'soccerway').rows[0];
    const soccerwayTeam = listBySource('teams', 'soccerway').rows[0];
    const soccerwayPlayer = listBySource('players', 'soccerway').rows[0];
    expect(soccerwayLeague).toMatchObject({
      sourceName: 'soccerway',
      sourceId: 'czech-republic/chance-liga/standings/bNFMkskm',
      season: undefined,
      sourceUrl:
        'https://www.soccerway.com/czech-republic/chance-liga/standings/bNFMkskm/standings/overall/',
    });
    expect(soccerwayTeam).toMatchObject({
      sourceName: 'soccerway',
      sourceId: 'slavia-prague/viXGgnyB',
      season: undefined,
      sourceUrl: 'https://www.soccerway.com/team/slavia-prague/viXGgnyB/squad/',
    });
    expect(
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: soccerwayTeam.id,
        name: 'Soccerway Team',
        sourceId: 'sparta-prague/hM8p0S1x',
        season: '2027',
      }),
    ).toMatchObject({
      sourceName: 'soccerway',
      sourceId: 'sparta-prague/hM8p0S1x',
      season: undefined,
      sourceUrl: 'https://www.soccerway.com/team/sparta-prague/hM8p0S1x/squad/',
    });
    expect(soccerwayPlayer).toMatchObject({
      sourceName: 'soccerway',
      sourceId: 'shared-player',
      sourceUrl: 'https://www.soccerway.com/player/shared-player/',
    });
    const worldFootballLeague = listBySource('leagues', 'worldfootball').rows[0];
    const worldFootballTeam = listBySource('teams', 'worldfootball').rows[0];
    const worldFootballPlayer = listBySource('players', 'worldfootball').rows[0];
    expect(worldFootballLeague).toMatchObject({
      sourceName: 'worldfootball',
      sourceId: 'co7093/mexico-lp---serie-b',
      season: undefined,
      sourceUrl: 'https://www.worldfootball.net/competition/co7093/mexico-lp---serie-b/',
    });
    expect(worldFootballTeam).toMatchObject({
      sourceName: 'worldfootball',
      sourceId: 'te237557/artesanos-metepec',
      season: undefined,
      sourceUrl: 'https://www.worldfootball.net/teams/te237557/artesanos-metepec/squad/',
    });
    expect(worldFootballPlayer).toMatchObject({
      sourceName: 'worldfootball',
      sourceId: 'pe599828/oscar-altamirano',
      sourceUrl: 'https://www.worldfootball.net/person/pe599828/oscar-altamirano/',
    });
    expect(
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: worldFootballTeam.id,
        name: 'WorldFootball Team',
        sourceId: 'te162876/sporting-caneramy',
        season: '2027',
      }),
    ).toMatchObject({
      sourceId: 'te162876/sporting-caneramy',
      season: undefined,
      sourceUrl: 'https://www.worldfootball.net/teams/te162876/sporting-caneramy/squad/',
    });
    const eurofotbalLeague = listBySource('leagues', 'eurofotbal').rows[0];
    const eurofotbalTeam = listBySource('teams', 'eurofotbal').rows[0];
    const eurofotbalPlayer = listBySource('players', 'eurofotbal').rows[0];
    expect(eurofotbalLeague).toMatchObject({
      sourceName: 'eurofotbal',
      sourceId: 'chance-liga/2026-2027',
      season: undefined,
      sourceUrl: 'https://www.eurofotbal.cz/chance-liga/2026-2027/tabulky/',
    });
    expect(eurofotbalTeam).toMatchObject({
      sourceName: 'eurofotbal',
      sourceId: 'cesko/sparta-praha',
      season: undefined,
      sourceUrl: 'https://www.eurofotbal.cz/kluby/cesko/sparta-praha/soupiska',
    });
    expect(eurofotbalPlayer).toMatchObject({
      sourceName: 'eurofotbal',
      sourceId: 'cesko/example-player',
    });
    expect(eurofotbalPlayer).not.toHaveProperty('sourceUrl');
    expect(
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: eurofotbalTeam.id,
        name: 'Eurofotbal Team',
        sourceId: 'cesko/slavia-praha',
        season: '2027',
      }),
    ).toMatchObject({
      sourceId: 'cesko/slavia-praha',
      season: undefined,
      sourceUrl: 'https://www.eurofotbal.cz/kluby/cesko/slavia-praha/soupiska',
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
        sourceNames: ['transfermarkt'],
      }).rows[0],
    ).toMatchObject({
      sourceName: 'transfermarkt',
      sourceId: 'shared-player',
    });
    for (const entity of ['leagues', 'teams', 'players'] as const) {
      expect(
        database.listEntityFilterOptions({ projectId: project.id, entity }).sourceNames,
      ).toEqual(['eurofotbal', 'soccerway', 'transfermarkt', 'worldfootball']);
    }
    if (!soccerwayRequest.league) throw new Error('Expected a Soccerway league fixture.');
    const soccerwayImportLeague = soccerwayRequest.league;
    expect(() =>
      database.commitImport({
        ...soccerwayRequest,
        league: { ...soccerwayImportLeague, season: '2026' },
      }),
    ).toThrow('Soccerway imports do not support seasons.');
    if (!worldFootballRequest.league) throw new Error('Expected a WorldFootball league fixture.');
    const worldFootballImportLeague = worldFootballRequest.league;
    expect(() =>
      database.commitImport({
        ...worldFootballRequest,
        league: { ...worldFootballImportLeague, season: '2026' },
      }),
    ).toThrow('WorldFootball imports do not support seasons.');
    if (!eurofotbalRequest.league) throw new Error('Expected a Eurofotbal league fixture.');
    const eurofotbalImportLeague = eurofotbalRequest.league;
    expect(() =>
      database.commitImport({
        ...eurofotbalRequest,
        league: { ...eurofotbalImportLeague, season: '2026' },
      }),
    ).toThrow('Eurofotbal imports do not support seasons.');
    database.close();
  });
});
