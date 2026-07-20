import { afterEach, describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommitImportRequest } from '../shared/contracts.js';
import { SnapshotDatabase } from './database.js';
import { ApplicationError } from './errors.js';

const directories: string[] = [];

const createDatabase = (): SnapshotDatabase => {
  const directory = mkdtempSync(join(tmpdir(), 'qdb-downloader-test-'));
  directories.push(directory);
  return new SnapshotDatabase(join(directory, 'snapshot.sqlite'));
};

afterEach(() => {
  while (directories.length) {
    const directory = directories.pop();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

describe('SnapshotDatabase', () => {
  test('normalizes names, rejects case-insensitive duplicates, and sorts by reference date', () => {
    const database = createDatabase();
    const first = database.createProject({ name: ' 2026/1 ', referenceDate: '2026-01-01' });
    database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });

    expect(first.name).toBe('2026/1');
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

  test('isolates projects, pages data, and deduplicates imports without a season', () => {
    const database = createDatabase();
    const first = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    const second = database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });
    const request = {
      projectId: first.id,
      operation: { kind: 'merge' as const },
      league: {
        externalId: 'GB1',
        name: 'Premier League',
        sourceUrl: 'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1',
      },
      teams: [
        {
          externalId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://www.transfermarkt.com/manchester-city/startseite/verein/281',
          players: [{ externalId: '1', name: 'One, Player' }],
        },
      ],
    };

    database.commitImport(request);
    database.commitImport(request);
    expect(database.getProjectSummary(first.id)).toMatchObject({
      leagueCount: 1,
      teamCount: 1,
      playerCount: 1,
    });
    expect(database.getProjectSummary(second.id)).toMatchObject({
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    });
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

  test('rolls back every row when an import fails', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });

    expect(() =>
      database.commitImport({
        projectId: project.id,
        operation: { kind: 'merge' },
        teams: [
          {
            externalId: 'valid',
            name: 'Valid team',
            sourceUrl: 'https://example.test/valid',
            players: [{ name: 'Valid player' }],
          },
          {
            externalId: 'invalid',
            name: '',
            sourceUrl: 'https://example.test/invalid',
            players: [{ name: 'Never committed' }],
          },
        ],
      }),
    ).toThrow();
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 0, playerCount: 0 });
    database.close();
  });

  test('previews and commits an authoritative league synchronization', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    const leagueUrl = 'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1';
    database.commitImport({
      projectId: project.id,
      operation: { kind: 'merge' },
      league: { externalId: 'GB1', name: 'Premier League', sourceUrl: leagueUrl },
      teams: [
        {
          externalId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://example.test/281',
          players: [
            { externalId: '1', name: 'Existing player' },
            { externalId: '2', name: 'Removed player' },
          ],
        },
        {
          externalId: '985',
          name: 'Removed team',
          sourceUrl: 'https://example.test/985',
          players: [{ externalId: '3', name: 'Removed with team' }],
        },
      ],
    });
    database.commitImport({
      projectId: project.id,
      operation: { kind: 'merge' },
      league: {
        externalId: 'ES1',
        name: 'Unrelated league',
        sourceUrl: 'https://example.test/ES1',
      },
      teams: [
        {
          externalId: '999',
          name: 'Unrelated team',
          sourceUrl: 'https://example.test/999',
          players: [{ externalId: '9', name: 'Unrelated player' }],
        },
      ],
    });
    const leagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: 'Premier',
      sort: 'name',
      direction: 'asc',
    });
    const target = leagues.rows[0];
    const request = {
      projectId: project.id,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: target.id },
        options: {
          absentTeams: 'delete' as const,
          absentPlayers: 'delete' as const,
          overrideTeamNames: true,
          overridePlayerNames: true,
        },
      },
      league: { externalId: 'GB1', name: 'Premier League', sourceUrl: leagueUrl },
      teams: [
        {
          externalId: '281',
          name: 'Manchester City updated',
          sourceUrl: 'https://example.test/281',
          players: [
            { externalId: '1', name: 'Existing player updated' },
            { externalId: '4', name: 'New player' },
          ],
        },
        {
          externalId: '777',
          name: 'New team',
          sourceUrl: 'https://example.test/777',
          players: [{ externalId: '7', name: 'New team player' }],
        },
      ],
    };

    const expectedChanges = {
      leagues: { added: 0, updated: 1, deleted: 0 },
      teams: { added: 1, updated: 1, detached: 0, deleted: 1 },
      players: { added: 2, updated: 1, deleted: 2 },
    };
    expect(database.previewImportChanges(request)).toEqual(expectedChanges);
    expect(database.commitImport(request).changes).toEqual(expectedChanges);
    expect(database.getProjectSummary(project.id)).toMatchObject({
      leagueCount: 2,
      teamCount: 3,
      playerCount: 4,
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
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Manchester City updated' }),
        expect.objectContaining({ name: 'New team' }),
        expect.objectContaining({ name: 'Unrelated team' }),
      ]),
    );
    database.close();
  });

  test('synchronizes a team to an empty squad without deleting the team', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      operation: { kind: 'merge' },
      teams: [
        {
          externalId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://example.test/281',
          players: [{ externalId: '1', name: 'Removed player' }],
        },
      ],
    });
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const request = {
      projectId: project.id,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'teams' as const, id: team.id },
        options: { absentPlayers: 'delete' as const, overridePlayerNames: true },
      },
      teams: [
        {
          externalId: '281',
          name: 'Manchester City refreshed',
          sourceUrl: 'https://example.test/281',
          players: [],
        },
      ],
    };

    expect(database.commitImport(request).changes.players.deleted).toBe(1);
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 1, playerCount: 0 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({ name: 'Manchester City', playerCount: 0 });
    database.close();
  });

  test('keeps absent records and preserves existing names while refreshing other metadata', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      operation: { kind: 'merge' },
      league: {
        externalId: 'GB1',
        name: 'Stored league',
        sourceUrl: 'https://example.test/GB1',
      },
      teams: [
        {
          externalId: '281',
          name: 'Stored team',
          sourceUrl: 'https://example.test/281',
          players: [
            {
              externalId: '1',
              name: 'Stored Player',
              firstName: 'Stored',
              lastName: 'Player',
              jerseyNumber: 7,
            },
            { externalId: '2', name: 'Absent Player' },
          ],
        },
        {
          externalId: '985',
          name: 'Absent team',
          sourceUrl: 'https://example.test/985',
          players: [{ externalId: '3', name: 'Absent team player' }],
        },
      ],
    });
    const league = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const teamsBefore = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const storedTeam = teamsBefore.find((team) => team.externalId === '281');
    if (!storedTeam) throw new Error('Stored team fixture missing.');
    const playersBefore = database.listEntities({
      projectId: project.id,
      entity: 'players',
      teamId: storedTeam.id,
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const storedPlayer = playersBefore.find((player) => player.externalId === '1');
    if (!storedPlayer) throw new Error('Stored player fixture missing.');
    const request = {
      projectId: project.id,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: league.id },
        options: {
          absentTeams: 'keep' as const,
          absentPlayers: 'keep' as const,
          overrideTeamNames: false,
          overridePlayerNames: false,
        },
      },
      league: {
        externalId: 'GB1',
        name: 'Scraped league',
        sourceUrl: 'https://example.test/GB1-refreshed',
      },
      teams: [
        {
          externalId: '281',
          name: 'Scraped team',
          sourceUrl: 'https://example.test/281-refreshed',
          players: [
            {
              externalId: '1',
              name: 'Scraped Name',
              firstName: 'Scraped',
              lastName: 'Name',
              jerseyNumber: 10,
              position: 'ATTACKER' as const,
            },
          ],
        },
      ],
    };

    const expectedChanges = {
      leagues: { added: 0, updated: 1, deleted: 0 },
      teams: { added: 0, updated: 1, detached: 0, deleted: 0 },
      players: { added: 0, updated: 1, deleted: 0 },
    };
    expect(database.previewImportChanges(request)).toEqual(expectedChanges);
    expect(database.commitImport(request).changes).toEqual(expectedChanges);
    expect(
      database.getEntity({ projectId: project.id, entity: 'leagues', id: league.id }),
    ).toMatchObject({ name: 'Stored league', teamCount: 2 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: storedTeam.id }),
    ).toMatchObject({
      id: storedTeam.id,
      name: 'Stored team',
      leagueId: league.id,
      playerCount: 2,
    });
    const playersAfter = database.listEntities({
      projectId: project.id,
      entity: 'players',
      teamId: storedTeam.id,
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    expect(playersAfter).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: storedPlayer.id,
          name: 'Stored Player',
          firstName: 'Stored',
          lastName: 'Player',
          jerseyNumber: 10,
          position: 'ATTACKER',
        }),
        expect.objectContaining({ name: 'Absent Player' }),
      ]),
    );

    request.operation.options.overrideTeamNames = true;
    request.operation.options.overridePlayerNames = true;
    database.commitImport(request);
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: storedTeam.id }),
    ).toMatchObject({ id: storedTeam.id, name: 'Scraped team' });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        teamId: storedTeam.id,
        pageIndex: 0,
        pageSize: 25,
        search: 'Scraped',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      id: storedPlayer.id,
      name: 'Scraped Name',
      firstName: 'Scraped',
      lastName: 'Name',
    });
    database.close();
  });

  test('detaches absent teams while preserving their squads', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      operation: { kind: 'merge' },
      league: { externalId: 'GB1', name: 'League', sourceUrl: 'https://example.test/GB1' },
      teams: [
        {
          externalId: '281',
          name: 'Detached team',
          sourceUrl: 'https://example.test/281',
          players: [{ externalId: '1', name: 'Preserved player' }],
        },
      ],
    });
    const league = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const request = {
      projectId: project.id,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: league.id },
        options: {
          absentTeams: 'detach' as const,
          absentPlayers: 'delete' as const,
          overrideTeamNames: false,
          overridePlayerNames: false,
        },
      },
      league: { externalId: 'GB1', name: 'League', sourceUrl: 'https://example.test/GB1' },
      teams: [],
    };

    expect(database.previewImportChanges(request)).toEqual({
      leagues: { added: 0, updated: 1, deleted: 0 },
      teams: { added: 0, updated: 0, detached: 1, deleted: 0 },
      players: { added: 0, updated: 0, deleted: 0 },
    });
    expect(database.commitImport(request).changes.teams.detached).toBe(1);
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 1, playerCount: 1 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({ leagueId: undefined, playerCount: 1 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'leagues', id: league.id }),
    ).toMatchObject({ teamCount: 0 });
    database.close();
  });

  test('rolls back all synchronized updates and deletions when one row fails', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      operation: { kind: 'merge' },
      league: { externalId: 'GB1', name: 'Premier League', sourceUrl: 'https://example.test/GB1' },
      teams: [
        {
          externalId: '281',
          name: 'Original team',
          sourceUrl: 'https://example.test/281',
          players: [{ externalId: '1', name: 'Original player' }],
        },
        {
          externalId: '985',
          name: 'Team that must survive rollback',
          sourceUrl: 'https://example.test/985',
          players: [{ externalId: '2', name: 'Second player' }],
        },
      ],
    });
    const league = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];

    expect(() =>
      database.commitImport({
        projectId: project.id,
        operation: {
          kind: 'synchronize',
          target: { entity: 'leagues', id: league.id },
          options: {
            absentTeams: 'delete',
            absentPlayers: 'delete',
            overrideTeamNames: true,
            overridePlayerNames: true,
          },
        },
        league: {
          externalId: 'GB1',
          name: 'Premier League changed',
          sourceUrl: 'https://example.test/GB1',
        },
        teams: [
          {
            externalId: '281',
            name: 'Changed before failure',
            sourceUrl: 'https://example.test/281',
            players: [],
          },
          {
            externalId: 'invalid',
            name: '',
            sourceUrl: 'https://example.test/invalid',
            players: [],
          },
        ],
      }),
    ).toThrow();
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 2, playerCount: 2 });
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
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Original team' }),
        expect.objectContaining({ name: 'Team that must survive rollback' }),
      ]),
    );
    database.close();
  });

  test('rejects invalid synchronization policies without changing stored data', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      operation: { kind: 'merge' },
      teams: [
        {
          externalId: '281',
          name: 'Stored team',
          sourceUrl: 'https://example.test/281',
          players: [{ externalId: '1', name: 'Stored player' }],
        },
      ],
    });
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const request = {
      projectId: project.id,
      operation: {
        kind: 'synchronize',
        target: { entity: 'teams', id: team.id },
        options: { absentPlayers: 'archive', overridePlayerNames: false },
      },
      teams: [
        {
          externalId: '281',
          name: 'Changed team',
          sourceUrl: 'https://example.test/281-changed',
          players: [],
        },
      ],
    } as unknown as CommitImportRequest;

    expect(() => database.previewImportChanges(request)).toThrow(ApplicationError);
    expect(() => database.commitImport(request)).toThrow(ApplicationError);
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 1, playerCount: 1 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({ name: 'Stored team', playerCount: 1 });
    database.close();
  });

  test('edits source identity and team relationships with project-scoped validation', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    const otherProject = database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });
    const importLeague = (projectId: string, externalId: string, name: string) =>
      database.commitImport({
        projectId,
        operation: { kind: 'merge' },
        league: { externalId, name, sourceUrl: `https://example.test/${externalId}` },
        teams: [
          {
            externalId: `${externalId}-team`,
            name: `${name} team`,
            sourceUrl: `https://example.test/${externalId}-team`,
            players: [],
          },
        ],
      });
    importLeague(project.id, 'GB1', 'Premier League');
    importLeague(project.id, 'GB2', 'Championship');
    importLeague(otherProject.id, 'DE1', 'Bundesliga');
    const projectLeagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const premier = projectLeagues.find((league) => league.externalId === 'GB1');
    const championship = projectLeagues.find((league) => league.externalId === 'GB2');
    const bundesliga = database.listEntities({
      projectId: otherProject.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    if (!premier || !championship) throw new Error('League fixtures missing.');
    const updatedLeague = database.updateEntityMetadata(
      {
        projectId: project.id,
        entity: 'leagues',
        id: premier.id,
        name: 'Premier League renamed',
        externalId: 'GBX',
        season: '2026',
      },
      'https://example.test/GBX/2026',
    );
    expect(updatedLeague).toMatchObject({
      id: premier.id,
      externalId: 'GBX',
      season: '2026',
      sourceUrl: 'https://example.test/GBX/2026',
    });
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: 'Premier',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    expect(
      database.updateEntityMetadata(
        {
          projectId: project.id,
          entity: 'teams',
          id: team.id,
          name: 'Moved team',
          externalId: 'moved-team',
          season: '2026',
          leagueId: championship.id,
        },
        'https://example.test/moved-team/2026',
      ),
    ).toMatchObject({ id: team.id, leagueId: championship.id, externalId: 'moved-team' });
    expect(() =>
      database.updateEntityMetadata(
        {
          projectId: project.id,
          entity: 'teams',
          id: team.id,
          name: 'Invalid move',
          externalId: 'moved-team',
          season: '2026',
          leagueId: bundesliga.id,
        },
        'https://example.test/moved-team/2026',
      ),
    ).toThrow(ApplicationError);
    expect(() =>
      database.updateEntityMetadata(
        {
          projectId: project.id,
          entity: 'leagues',
          id: premier.id,
          name: 'Duplicate',
          externalId: 'GB2',
        },
        'https://example.test/GB2',
      ),
    ).toThrow(ApplicationError);
    database.close();
  });
});
