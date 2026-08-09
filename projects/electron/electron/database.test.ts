import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type {
  CombinedLeague,
  CombinedPlayer,
  CombinedTeam,
  League,
  SourceName,
  Team,
} from '../shared/contracts.js';
import { SnapshotDatabase } from './database.js';

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
  test('transactionally migrates the legacy schema and preserves IDs, links, dates, and seasons', () => {
    const path = createDatabasePath();
    const legacyDatabase = new DatabaseSync(path);
    legacyDatabase.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      ) STRICT;
      INSERT INTO schema_migrations VALUES
        (1, '2025-01-01T00:00:00.000Z'),
        (2, '2025-01-02T00:00:00.000Z');
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        reference_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE leagues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source TEXT NOT NULL CHECK(source = 'transfermarkt'),
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        season TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, source, external_id, season)
      ) STRICT;
      CREATE TABLE teams (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL,
        source TEXT NOT NULL CHECK(source = 'transfermarkt'),
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        season TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, source, external_id, season)
      ) STRICT;
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        source TEXT NOT NULL CHECK(source = 'transfermarkt'),
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        jersey_number INTEGER,
        position TEXT,
        birthdate TEXT,
        height REAL,
        weight REAL,
        foot TEXT,
        joined TEXT,
        contract_expires TEXT,
        market_value REAL,
        country_name TEXT,
        country_code2 TEXT,
        country_code3 TEXT,
        minutes_played INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, team_id, source, external_id)
      ) STRICT;
      CREATE INDEX players_project_external
        ON players(project_id, source, external_id);
      INSERT INTO projects VALUES (
        'project-legacy', 'Legacy schema', '2026-01-01',
        '2025-01-01T00:00:00.000Z', '2025-01-04T00:00:00.000Z'
      );
      INSERT INTO leagues VALUES (
        'league-legacy', 'project-legacy', 'transfermarkt', 'GB1',
        'Premier League', '2026', 'https://legacy.test/league',
        '2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z'
      );
      INSERT INTO teams VALUES (
        'team-legacy', 'project-legacy', 'league-legacy', 'transfermarkt', '281',
        'Manchester City', '2026', 'https://legacy.test/team',
        '2025-01-02T00:00:00.000Z', '2025-01-03T00:00:00.000Z'
      );
      INSERT INTO players(
        id, project_id, team_id, source, external_id, name, created_at, updated_at
      ) VALUES (
        'player-legacy', 'project-legacy', 'team-legacy', 'transfermarkt', '10',
        'Legacy player', '2025-01-03T00:00:00.000Z', '2025-01-04T00:00:00.000Z'
      );
    `);
    legacyDatabase.close();

    const database = new SnapshotDatabase(path);
    expect(
      database.getEntity({
        projectId: 'project-legacy',
        entity: 'leagues',
        id: 'league-legacy',
      }),
    ).toMatchObject({
      sourceName: 'transfermarkt',
      sourceId: 'GB1',
      tier: undefined,
      season: '2026',
      sourceUrl: 'https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1/plus?saison_id=2026',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    });
    expect(
      database.getEntity({
        projectId: 'project-legacy',
        entity: 'teams',
        id: 'team-legacy',
      }),
    ).toMatchObject({ leagueId: 'league-legacy', sourceName: 'transfermarkt', sourceId: '281' });
    const legacyPlayer = database.listEntities({
      projectId: 'project-legacy',
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    expect(legacyPlayer).toMatchObject({
      id: 'player-legacy',
      teamId: 'team-legacy',
      sourceName: 'transfermarkt',
      sourceId: '10',
      name: 'Legacy player',
      positionDetail: undefined,
    });

    database.commitImport({
      projectId: 'project-legacy',
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      teams: [
        {
          sourceId: '281',
          name: 'Team',
          season: '2026',
          sourceUrl: 'https://example.test/team',
          players: [{ sourceId: 'fresh', name: 'Fresh player', positionDetail: 'ST' }],
        },
      ],
    });
    expect(
      database.listEntities({
        projectId: 'project-legacy',
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: 'Fresh',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({ name: 'Fresh player', positionDetail: 'ST' });

    database.close();
    const migratedDatabase = new DatabaseSync(path);
    const leagueColumns = migratedDatabase.prepare('PRAGMA table_info(leagues)').all() as {
      name: string;
    }[];
    const teamColumns = migratedDatabase.prepare('PRAGMA table_info(teams)').all() as {
      name: string;
    }[];
    expect(leagueColumns.map(({ name }) => name)).toContain('source_name');
    expect(leagueColumns.map(({ name }) => name)).toContain('source_id');
    expect(leagueColumns.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['country_name', 'country_code2', 'country_code3']),
    );
    expect(leagueColumns.map(({ name }) => name)).not.toContain('source_url');
    expect(leagueColumns.map(({ name }) => name)).not.toContain('external_id');
    expect(teamColumns.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['country_name', 'country_code2', 'country_code3']),
    );
    expect(
      migratedDatabase.prepare('SELECT max(version) AS version FROM schema_migrations').get(),
    ).toMatchObject({ version: 13 });
    migratedDatabase.close();
  });

  test('combines teams across providers and preserves canonical data after source deletion', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Combined', referenceDate: '2026-07-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'tm-league',
        name: 'Ceska Liga',
        sourceUrl: 'league',
      },
      teams: [
        {
          sourceId: 'tm-team',
          name: 'Cesky Team',
          sourceUrl: 'team',
          players: [
            {
              sourceId: 'tm-player',
              name: 'Ondrej Kolar',
              firstName: 'Ondrej',
              lastName: 'Kolar',
              birthdate: '1994-10-17',
              height: 193,
            },
          ],
        },
      ],
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'soccerway',
      operation: mergeOperation(),
      league: {
        sourceId: 'sw-league',
        name: 'Česká Liga',
        sourceUrl: 'league',
      },
      teams: [
        {
          sourceId: 'sw-team',
          name: 'Český Team',
          sourceUrl: 'team',
          players: [
            {
              sourceId: 'sw-player',
              name: 'Ondřej Kolář',
              firstName: 'Ondřej',
              lastName: 'Kolář',
              birthdate: '1994-10-17',
              height: 192,
            },
          ],
        },
      ],
    });
    const candidates = database.listCombineTeamCandidates({
      projectId: project.id,
      search: '',
    });
    const preview = database.previewTeamCombination({
      projectId: project.id,
      sourceTeamIds: candidates.map(({ id }) => id),
    });
    expect(preview.matchGroups).toHaveLength(1);
    expect(preview.matchGroups[0].players).toHaveLength(2);

    const result = database.commitTeamCombination({
      projectId: project.id,
      sourceTeamIds: candidates.map(({ id }) => id),
      league: {
        kind: 'create',
        sourceLeagueIds: preview.sourceLeagues.map(({ id }) => id),
        resolutions: {},
      },
      matchGroups: preview.matchGroups,
      selectedPlayerGroupIds: preview.matchGroups.map(({ id }) => id),
      teamResolutions: {},
      playerResolutions: {},
    });
    expect(result.team).toMatchObject({
      name: 'Český Team',
      needsReview: false,
    });
    expect(result.league).toMatchObject({ name: 'Česká Liga' });
    expect(result.team.sources).toHaveLength(2);
    expect(result.players).toEqual([
      expect.objectContaining({
        name: 'Ondřej Kolář',
        firstName: 'Ondřej',
        lastName: 'Kolář',
        height: 193,
      }),
    ]);
    expect(database.getProjectSummary(project.id)).toMatchObject({
      combinedLeagueCount: 1,
      combinedTeamCount: 1,
      combinedPlayerCount: 1,
    });

    database.deleteSourceData({
      projectId: project.id,
      sourceNames: ['transfermarkt'],
    });
    const combinedTeams = database.listCombinedEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    });
    expect(combinedTeams.rows).toEqual([
      expect.objectContaining({
        name: 'Český Team',
        needsReview: true,
        sources: expect.arrayContaining([
          expect.objectContaining({ sourceName: 'transfermarkt', available: false }),
        ]),
      }),
    ]);
    database.close();
  });

  test('validates selected player groups and removes deselected canonical players on recombine', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Selected combined players',
      referenceDate: '2026-07-01',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'tm-selected-league',
        name: 'Selected League',
        sourceUrl: 'league',
      },
      teams: [
        {
          sourceId: 'tm-selected-team',
          name: 'Selected Team',
          sourceUrl: 'team',
          players: [
            {
              sourceId: 'tm-selected-one',
              name: 'Selected One',
              birthdate: '2000-01-01',
            },
            {
              sourceId: 'tm-selected-two',
              name: 'Selected Two',
            },
          ],
        },
      ],
    });
    const sourceTeam = database.listCombineTeamCandidates({
      projectId: project.id,
      sourceName: 'transfermarkt',
      search: 'Selected Team',
    })[0];
    const preview = database.previewTeamCombination({
      projectId: project.id,
      sourceTeamIds: [sourceTeam.id],
    });
    const groupIds = preview.matchGroups.map(({ id }) => id);
    const commit = (selectedPlayerGroupIds: string[]) =>
      database.commitTeamCombination({
        projectId: project.id,
        sourceTeamIds: [sourceTeam.id],
        league: { kind: 'none' },
        matchGroups: preview.matchGroups,
        selectedPlayerGroupIds,
        teamResolutions: {},
        playerResolutions: {},
      });

    expect(() => commit([])).toThrow('Select at least one project player.');
    expect(() => commit([groupIds[0], 'unknown-group'])).toThrow(
      'Selected player groups are invalid.',
    );
    expect(() => commit([groupIds[0], groupIds[0]])).toThrow('Selected player groups are invalid.');

    const imported = commit(groupIds);
    expect(imported.players).toHaveLength(2);
    expect(imported.addedPlayers).toBe(2);

    const recombinePreview = database.previewTeamCombination({
      projectId: project.id,
      combinedTeamId: imported.team.id,
      sourceTeamIds: [sourceTeam.id],
    });
    const retainedGroupId = recombinePreview.matchGroups[0].id;
    const recombined = database.commitTeamCombination({
      projectId: project.id,
      combinedTeamId: imported.team.id,
      sourceTeamIds: [sourceTeam.id],
      league: { kind: 'none' },
      matchGroups: recombinePreview.matchGroups,
      selectedPlayerGroupIds: [retainedGroupId],
      teamResolutions: {},
      playerResolutions: {},
    });

    expect(recombined.players).toHaveLength(1);
    expect(recombined.addedPlayers).toBe(0);
    expect(recombined.updatedPlayers).toBe(1);
    expect(recombined.deletedPlayers).toBe(1);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).total,
    ).toBe(2);
    database.close();
  });

  test('imports one source team into combined data and later recombines it', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Single-source combined import',
      referenceDate: '2026-07-01',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'tm-league',
        name: 'Czech First League',
        sourceUrl: 'tm-league-url',
      },
      teams: [
        {
          sourceId: 'tm-team',
          name: 'Solo Team',
          sourceUrl: 'tm-team-url',
          players: [
            {
              sourceId: 'tm-player',
              name: 'Player One',
              birthdate: '2000-01-01',
              height: 180,
            },
          ],
        },
      ],
    });

    const transfermarktTeam = database.listCombineTeamCandidates({
      projectId: project.id,
      sourceName: 'transfermarkt',
      search: 'Solo Team',
    })[0];
    const preview = database.previewTeamCombination({
      projectId: project.id,
      sourceTeamIds: [transfermarktTeam.id],
    });
    expect(preview.sourceTeams).toEqual([
      expect.objectContaining({ id: transfermarktTeam.id, sourceName: 'transfermarkt' }),
    ]);
    expect(preview.matchGroups).toEqual([
      expect.objectContaining({
        automatic: false,
        players: [expect.objectContaining({ sourceId: 'tm-player' })],
      }),
    ]);

    const imported = database.commitTeamCombination({
      projectId: project.id,
      sourceTeamIds: [transfermarktTeam.id],
      league: {
        kind: 'create',
        sourceLeagueIds: preview.sourceLeagues.map(({ id }) => id),
        resolutions: {},
      },
      matchGroups: preview.matchGroups,
      selectedPlayerGroupIds: preview.matchGroups.map(({ id }) => id),
      teamResolutions: {},
      playerResolutions: {},
    });
    expect(imported.team).toMatchObject({
      name: 'Solo Team',
      needsReview: false,
      sources: [expect.objectContaining({ sourceName: 'transfermarkt', available: true })],
    });
    expect(imported.league).toMatchObject({
      name: 'Czech First League',
      sources: [expect.objectContaining({ sourceName: 'transfermarkt', available: true })],
    });
    expect(imported.players).toEqual([
      expect.objectContaining({
        name: 'Player One',
        sources: [expect.objectContaining({ sourceName: 'transfermarkt', available: true })],
      }),
    ]);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }),
    ).toMatchObject({ total: 1 });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }),
    ).toMatchObject({ total: 1 });
    expect(() =>
      database.previewTeamCombination({
        projectId: project.id,
        sourceTeamIds: [transfermarktTeam.id],
      }),
    ).toThrow('already belongs to Solo Team');
    if (!imported.league || !imported.players[0]) {
      throw new Error('Expected the source league and player to be imported.');
    }

    database.commitImport({
      projectId: project.id,
      sourceName: 'soccerway',
      operation: mergeOperation(),
      league: {
        sourceId: 'sw-league',
        name: 'Czech First League',
        sourceUrl: 'sw-league-url',
      },
      teams: [
        {
          sourceId: 'sw-team',
          name: 'Solo Team',
          sourceUrl: 'sw-team-url',
          players: [
            {
              sourceId: 'sw-player',
              name: 'Player One',
              birthdate: '2000-01-01',
              height: 181,
            },
          ],
        },
      ],
    });
    const soccerwayTeam = database.listCombineTeamCandidates({
      projectId: project.id,
      sourceName: 'soccerway',
      search: 'Solo Team',
    })[0];
    const recombinePreview = database.previewTeamCombination({
      projectId: project.id,
      combinedTeamId: imported.team.id,
      sourceTeamIds: [transfermarktTeam.id, soccerwayTeam.id],
    });
    const matchedPlayers = [
      {
        ...recombinePreview.matchGroups[0],
        players: recombinePreview.matchGroups.flatMap(({ players }) => players),
        automatic: false,
      },
    ];
    const recombined = database.commitTeamCombination({
      projectId: project.id,
      combinedTeamId: imported.team.id,
      sourceTeamIds: [transfermarktTeam.id, soccerwayTeam.id],
      league: { kind: 'existing', combinedLeagueId: imported.league.id },
      matchGroups: matchedPlayers,
      selectedPlayerGroupIds: matchedPlayers.map(({ id }) => id),
      teamResolutions: {},
      playerResolutions: {},
    });
    expect(recombined.team.id).toBe(imported.team.id);
    expect(recombined.team.sources).toHaveLength(2);
    expect(recombined.players).toEqual([
      expect.objectContaining({
        id: imported.players[0].id,
        sources: [
          expect.objectContaining({ sourceName: 'transfermarkt' }),
          expect.objectContaining({ sourceName: 'soccerway' }),
        ],
      }),
    ]);
    expect(database.getProjectSummary(project.id)).toMatchObject({
      teamCount: 2,
      playerCount: 2,
      combinedLeagueCount: 1,
      combinedTeamCount: 1,
      combinedPlayerCount: 1,
    });
    expect(() =>
      database.previewTeamCombination({
        projectId: project.id,
        sourceTeamIds: [],
      }),
    ).toThrow('Choose between one and four source teams.');
    database.close();
  });

  test('lists canonical combined filter options and applies entity-specific filters', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Combined filters',
      referenceDate: '2026-07-01',
    });
    const importTeam = (input: {
      sourceId: string;
      name: string;
      season: string;
      countryCode3: string;
      league?: {
        sourceId: string;
        name: string;
        tier?: number;
        countryCode3: string;
      };
      player?: {
        sourceId: string;
        name: string;
        countryName: string;
        countryCode2: string;
        countryCode3: string;
        position: 'ATTACKER' | 'DEFENDER';
        positionDetail: 'ST' | 'CB';
        foot: 'RIGHT' | 'LEFT';
      };
    }) => {
      for (const sourceName of ['transfermarkt', 'soccerway'] as const) {
        const season = sourceName === 'transfermarkt' ? input.season : undefined;
        database.commitImport({
          projectId: project.id,
          sourceName,
          operation: mergeOperation(),
          ...(input.league && {
            league: {
              ...input.league,
              sourceId: `${sourceName}-${input.league.sourceId}`,
              season,
              sourceUrl: `${sourceName}-${input.league.sourceId}-url`,
            },
          }),
          teams: [
            {
              sourceId: `${sourceName}-${input.sourceId}`,
              name: input.name,
              season,
              sourceUrl: `${sourceName}-${input.sourceId}-url`,
              players: input.player
                ? [
                    {
                      ...input.player,
                      sourceId: `${sourceName}-${input.player.sourceId}`,
                    },
                  ]
                : [],
            },
          ],
        });
      }
      if (input.league) {
        const sourceLeagues = database.listEntities({
          projectId: project.id,
          entity: 'leagues',
          pageIndex: 0,
          pageSize: 25,
          search: input.league.name,
          sort: 'name',
          direction: 'asc',
        }).rows as League[];
        database.updateLeagueCountries({
          projectId: project.id,
          ids: sourceLeagues.map(({ id }) => id),
          countryCode3: input.league.countryCode3,
        });
        if (input.league.tier !== undefined) {
          database.updateLeagueTiers({
            projectId: project.id,
            ids: sourceLeagues.map(({ id }) => id),
            tier: input.league.tier,
          });
        }
      }
      const importedTeams = database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: input.name,
        sort: 'name',
        direction: 'asc',
      }).rows as Team[];
      database.updateTeamCountries({
        projectId: project.id,
        ids: importedTeams.map(({ id }) => id),
        countryCode3: input.countryCode3,
      });
      const sourceTeams = database
        .listCombineTeamCandidates({
          projectId: project.id,
          search: input.name,
        })
        .filter(({ name }) => name === input.name);
      if (sourceTeams.length !== 2) throw new Error(`Expected two source teams for ${input.name}`);
      const preview = database.previewTeamCombination({
        projectId: project.id,
        sourceTeamIds: sourceTeams.map(({ id }) => id),
      });
      return database.commitTeamCombination({
        projectId: project.id,
        sourceTeamIds: sourceTeams.map(({ id }) => id),
        league: input.league
          ? {
              kind: 'create',
              sourceLeagueIds: preview.sourceLeagues.map(({ id }) => id),
              resolutions: {},
            }
          : { kind: 'none' },
        matchGroups: preview.matchGroups,
        selectedPlayerGroupIds: preview.matchGroups.map(({ id }) => id),
        teamResolutions: {},
        playerResolutions: {},
      });
    };

    const english = importTeam({
      sourceId: 'alpha',
      name: 'Alpha FC',
      season: '2026',
      countryCode3: 'ENG',
      league: {
        sourceId: 'premier',
        name: 'Premier League',
        tier: 1,
        countryCode3: 'ENG',
      },
      player: {
        sourceId: 'alpha-player',
        name: 'Alpha Striker',
        countryName: 'Senegal',
        countryCode2: 'SN',
        countryCode3: 'SEN',
        position: 'ATTACKER',
        positionDetail: 'ST',
        foot: 'RIGHT',
      },
    });
    const czech = importTeam({
      sourceId: 'beta',
      name: 'Beta FC',
      season: '2025',
      countryCode3: 'CZE',
      league: {
        sourceId: 'czech-league',
        name: 'Czech First League',
        countryCode3: 'CZE',
      },
      player: {
        sourceId: 'beta-player',
        name: 'Beta Defender',
        countryName: 'Czech Republic',
        countryCode2: 'CZ',
        countryCode3: 'CZE',
        position: 'DEFENDER',
        positionDetail: 'CB',
        foot: 'LEFT',
      },
    });
    const unassigned = importTeam({
      sourceId: 'gamma',
      name: 'Gamma FC',
      season: '2024',
      countryCode3: 'DEU',
      player: {
        sourceId: 'gamma-player',
        name: 'Gamma Defender',
        countryName: 'Czech Republic',
        countryCode2: 'CZ',
        countryCode3: 'CZE',
        position: 'DEFENDER',
        positionDetail: 'CB',
        foot: 'LEFT',
      },
    });

    const leagueOptions = database.listCombinedEntityFilterOptions({
      projectId: project.id,
      entity: 'leagues',
    });
    expect(leagueOptions).toMatchObject({
      entity: 'leagues',
      tiers: [1],
      hasLeaguesWithoutTier: true,
    });
    expect(leagueOptions).not.toHaveProperty('seasons');
    if (leagueOptions.entity !== 'leagues') throw new Error('Expected league options');
    expect(leagueOptions.countries.map(({ name }) => name)).toEqual(['Czech Republic', 'England']);

    const teamOptions = database.listCombinedEntityFilterOptions({
      projectId: project.id,
      entity: 'teams',
    });
    expect(teamOptions).toMatchObject({
      entity: 'teams',
      hasTeamsWithoutLeague: true,
    });
    expect(teamOptions).not.toHaveProperty('seasons');
    if (teamOptions.entity !== 'teams') throw new Error('Expected team options');
    expect(teamOptions.leagues.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: czech.league?.id, name: 'Czech First League' },
      { id: english.league?.id, name: 'Premier League' },
    ]);

    const playerOptions = database.listCombinedEntityFilterOptions({
      projectId: project.id,
      entity: 'players',
    });
    expect(playerOptions).toMatchObject({
      entity: 'players',
      positions: ['DEFENDER', 'ATTACKER'],
      positionDetails: ['CB', 'ST'],
      feet: ['LEFT', 'RIGHT'],
    });
    if (playerOptions.entity !== 'players') throw new Error('Expected player options');
    expect(playerOptions.teams.map(({ id }) => id)).toEqual([
      english.team.id,
      czech.team.id,
      unassigned.team.id,
    ]);
    expect(playerOptions.nationalities.map(({ name }) => name)).toEqual([
      'Czech Republic',
      'Senegal',
    ]);

    const list = (
      entity: 'leagues' | 'teams' | 'players',
      filters: Partial<Parameters<SnapshotDatabase['listCombinedEntities']>[0]>,
    ) =>
      database.listCombinedEntities({
        projectId: project.id,
        entity,
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
        ...filters,
      });

    expect(
      list('leagues', {
        countries: ['Czech Republic', 'England'],
      }).total,
    ).toBe(2);
    expect(
      list('leagues', {
        tiers: [1],
        includeLeaguesWithoutTier: true,
      }).total,
    ).toBe(2);
    expect(
      list('leagues', {
        countries: ['England'],
      }).rows.map(({ name }) => name),
    ).toEqual(['Premier League']);
    expect(
      list('teams', {
        leagueIds: [english.league?.id ?? ''],
        includeTeamsWithoutLeague: true,
      }).rows.map(({ name }) => name),
    ).toEqual(['Alpha FC', 'Gamma FC']);
    expect(
      list('teams', {
        countries: ['Czech Republic', 'Germany'],
      }).rows.map(({ name }) => name),
    ).toEqual(['Beta FC', 'Gamma FC']);
    expect(
      list('players', {
        teamIds: [english.team.id, czech.team.id],
        nationalities: ['Czech Republic', 'Senegal'],
      }).total,
    ).toBe(2);
    expect(
      list('players', {
        positions: ['ATTACKER'],
        positionDetails: ['ST'],
        feet: ['RIGHT'],
      }).rows.map(({ name }) => name),
    ).toEqual(['Alpha Striker']);

    const otherProject = database.createProject({
      name: 'Other combined filters',
      referenceDate: '2026-08-01',
    });
    expect(
      database.listCombinedEntityFilterOptions({
        projectId: otherProject.id,
        entity: 'players',
      }),
    ).toEqual({
      entity: 'players',
      teams: [],
      nationalities: [],
      positions: [],
      positionDetails: [],
      feet: [],
      customBadges: [],
    });
    database.close();
  });

  test('atomically deletes selected combined players while preserving source records', () => {
    const database = createDatabase();
    const createCombinedPlayers = (
      projectName: string,
      playerNames: readonly string[],
    ): {
      projectId: string;
      combinedPlayers: CombinedPlayer[];
      sourcePlayerCount: number;
    } => {
      const project = database.createProject({
        name: projectName,
        referenceDate: '2026-07-01',
      });
      for (const sourceName of ['transfermarkt', 'soccerway'] as const) {
        database.commitImport({
          projectId: project.id,
          sourceName,
          operation: mergeOperation(),
          teams: [
            {
              sourceId: `${sourceName}-team`,
              name: `${projectName} Team`,
              sourceUrl: `${sourceName}-team-url`,
              players: playerNames.map((name, index) => ({
                sourceId: `${sourceName}-player-${index}`,
                name,
                birthdate: `199${index}-01-01`,
              })),
            },
          ],
        });
      }
      const candidates = database.listCombineTeamCandidates({
        projectId: project.id,
        search: `${projectName} Team`,
      });
      const preview = database.previewTeamCombination({
        projectId: project.id,
        sourceTeamIds: candidates.map(({ id }) => id),
      });
      const result = database.commitTeamCombination({
        projectId: project.id,
        sourceTeamIds: candidates.map(({ id }) => id),
        league: { kind: 'none' },
        matchGroups: preview.matchGroups,
        selectedPlayerGroupIds: preview.matchGroups.map(({ id }) => id),
        teamResolutions: {},
        playerResolutions: {},
      });
      const sourcePlayerCount = database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).total;
      return { projectId: project.id, combinedPlayers: result.players, sourcePlayerCount };
    };
    const selected = createCombinedPlayers('Combined player deletion', [
      'Ada Striker',
      'Bea Keeper',
      'Cia Midfielder',
    ]);
    const preserved = createCombinedPlayers('Preserved combined player deletion', ['Dee Defender']);

    expect(() =>
      database.deleteCombinedPlayers({
        projectId: selected.projectId,
        ids: [selected.combinedPlayers[0].id, preserved.combinedPlayers[0].id],
      }),
    ).toThrow('One or more selected combined players were not found.');
    expect(() =>
      database.deleteCombinedPlayers({ projectId: selected.projectId, ids: [] }),
    ).toThrow('Choose at least one valid combined player.');
    expect(database.getProjectSummary(selected.projectId)).toMatchObject({
      combinedPlayerCount: 3,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-01-01T00:00:00.000Z'));
    const summary = database.deleteCombinedPlayers({
      projectId: selected.projectId,
      ids: [
        selected.combinedPlayers[0].id,
        selected.combinedPlayers[1].id,
        selected.combinedPlayers[0].id,
      ],
    });
    vi.useRealTimers();

    expect(summary).toMatchObject({
      combinedPlayerCount: 1,
      playerCount: selected.sourcePlayerCount,
      updatedAt: '2035-01-01T00:00:00.000Z',
    });
    expect(
      database.listEntities({
        projectId: selected.projectId,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).total,
    ).toBe(selected.sourcePlayerCount);
    expect(database.getProjectSummary(preserved.projectId)).toMatchObject({
      combinedPlayerCount: 1,
      playerCount: preserved.sourcePlayerCount,
    });
    database.close();
  });

  test('atomically deletes selected combined leagues and teams with detach or cascade behavior', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Combined league and team deletion',
      referenceDate: '2026-07-01',
    });
    const preservedProject = database.createProject({
      name: 'Preserved combined deletion',
      referenceDate: '2026-07-01',
    });
    const combineTeam = (
      projectId: string,
      suffix: string,
    ): { league: CombinedLeague; team: CombinedTeam; players: CombinedPlayer[] } => {
      for (const sourceName of ['transfermarkt', 'soccerway'] as const) {
        database.commitImport({
          projectId,
          sourceName,
          operation: mergeOperation(),
          league: {
            sourceId: `${sourceName}-league-${suffix}`,
            name: `League ${suffix}`,
            sourceUrl: `${sourceName}-league-${suffix}-url`,
          },
          teams: [
            {
              sourceId: `${sourceName}-team-${suffix}`,
              name: `Team ${suffix}`,
              sourceUrl: `${sourceName}-team-${suffix}-url`,
              players: [
                {
                  sourceId: `${sourceName}-player-${suffix}`,
                  name: `Player ${suffix}`,
                },
              ],
            },
          ],
        });
      }
      const candidates = database.listCombineTeamCandidates({
        projectId,
        search: `Team ${suffix}`,
      });
      const preview = database.previewTeamCombination({
        projectId,
        sourceTeamIds: candidates.map(({ id }) => id),
      });
      const result = database.commitTeamCombination({
        projectId,
        sourceTeamIds: candidates.map(({ id }) => id),
        league: {
          kind: 'create',
          sourceLeagueIds: preview.sourceLeagues.map(({ id }) => id),
          resolutions: {},
        },
        matchGroups: preview.matchGroups,
        selectedPlayerGroupIds: preview.matchGroups.map(({ id }) => id),
        teamResolutions: {},
        playerResolutions: {},
      });
      if (!result.league) throw new Error('Expected a combined league.');
      return { league: result.league, team: result.team, players: result.players };
    };
    const first = combineTeam(project.id, 'A');
    const second = combineTeam(project.id, 'B');
    const preserved = combineTeam(preservedProject.id, 'C');
    const combinedPlayerCount = first.players.length + second.players.length;

    expect(() =>
      database.deleteCombinedLeagues({
        projectId: project.id,
        ids: [first.league.id, preserved.league.id],
        cascade: false,
      }),
    ).toThrow('One or more selected combined leagues were not found.');
    expect(() =>
      database.deleteCombinedLeagues({ projectId: project.id, ids: [], cascade: false }),
    ).toThrow('Choose at least one valid combined league.');
    expect(() => database.deleteCombinedTeams({ projectId: project.id, ids: [] })).toThrow(
      'Choose at least one valid combined team.',
    );
    expect(database.getProjectSummary(project.id)).toMatchObject({
      combinedLeagueCount: 2,
      combinedTeamCount: 2,
      combinedPlayerCount,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-02-01T00:00:00.000Z'));
    const detachedSummary = database.deleteCombinedLeagues({
      projectId: project.id,
      ids: [first.league.id, first.league.id],
      cascade: false,
    });
    vi.useRealTimers();
    expect(detachedSummary).toMatchObject({
      combinedLeagueCount: 1,
      combinedTeamCount: 2,
      combinedPlayerCount,
      updatedAt: '2035-02-01T00:00:00.000Z',
    });
    expect(
      database.listCombinedEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: 'Team A',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ id: first.team.id, leagueId: undefined })]);

    expect(
      database.deleteCombinedLeagues({
        projectId: project.id,
        ids: [second.league.id],
        cascade: true,
      }),
    ).toMatchObject({
      combinedLeagueCount: 0,
      combinedTeamCount: 1,
      combinedPlayerCount: first.players.length,
    });
    expect(
      database.deleteCombinedTeams({
        projectId: project.id,
        ids: [first.team.id, first.team.id],
      }),
    ).toMatchObject({
      combinedLeagueCount: 0,
      combinedTeamCount: 0,
      combinedPlayerCount: 0,
      leagueCount: 4,
      teamCount: 4,
      playerCount: 4,
    });
    expect(database.getProjectSummary(preservedProject.id)).toMatchObject({
      combinedLeagueCount: 1,
      combinedTeamCount: 1,
      combinedPlayerCount: preserved.players.length,
      leagueCount: 2,
      teamCount: 2,
      playerCount: 2,
    });
    database.close();
  });

  test('detects an unambiguous existing combined league for team previews', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Detected combined leagues',
      referenceDate: '2026-07-01',
    });
    const importLeague = (
      sourceName: SourceName,
      leagueSourceId: string,
      leagueName: string,
      teamSourceIds: string[],
    ) => {
      database.commitImport({
        projectId: project.id,
        sourceName,
        operation: mergeOperation(),
        league: {
          sourceId: leagueSourceId,
          name: leagueName,
          sourceUrl: `${leagueSourceId}-url`,
        },
        teams: teamSourceIds.map((sourceId) => ({
          sourceId,
          name: sourceId,
          sourceUrl: `${sourceId}-url`,
          players: [
            {
              sourceId: `${sourceId}-player`,
              name: `${sourceId} Player`,
            },
          ],
        })),
      });
    };
    importLeague('transfermarkt', 'tm-a', 'League A', ['tm-a-1', 'tm-a-2']);
    importLeague('soccerway', 'sw-a', 'League A', ['sw-a-1', 'sw-a-2']);
    importLeague('worldfootball', 'wf-b', 'League B', ['wf-b-1', 'wf-b-2']);
    importLeague('eurofotbal', 'ef-b', 'League B', ['ef-b-1', 'ef-b-2']);

    const teamId = (sourceName: SourceName, sourceId: string): string => {
      const team = database
        .listCombineTeamCandidates({ projectId: project.id, sourceName, search: sourceId })
        .find((candidate) => candidate.sourceId === sourceId);
      if (!team) throw new Error(`Expected source team ${sourceId}`);
      return team.id;
    };
    const createCombinedTeam = (sourceTeamIds: string[]) => {
      const preview = database.previewTeamCombination({
        projectId: project.id,
        sourceTeamIds,
      });
      return database.commitTeamCombination({
        projectId: project.id,
        sourceTeamIds,
        league: {
          kind: 'create',
          sourceLeagueIds: preview.sourceLeagues.map(({ id }) => id),
          resolutions: {},
        },
        matchGroups: preview.matchGroups,
        selectedPlayerGroupIds: preview.matchGroups.map(({ id }) => id),
        teamResolutions: {},
        playerResolutions: {},
      });
    };

    const leagueBTeamIds = [teamId('worldfootball', 'wf-b-2'), teamId('eurofotbal', 'ef-b-2')];
    expect(
      database.previewTeamCombination({
        projectId: project.id,
        sourceTeamIds: leagueBTeamIds,
      }).detectedCombinedLeagueId,
    ).toBeUndefined();

    const combinedA = createCombinedTeam([
      teamId('transfermarkt', 'tm-a-1'),
      teamId('soccerway', 'sw-a-1'),
    ]);
    expect(combinedA.league).toBeDefined();
    const combinedB = createCombinedTeam([
      teamId('worldfootball', 'wf-b-1'),
      teamId('eurofotbal', 'ef-b-1'),
    ]);
    expect(combinedB.league).toBeDefined();
    if (!combinedA.league || !combinedB.league) {
      throw new Error('Expected both combined leagues');
    }

    const detectedPreview = database.previewTeamCombination({
      projectId: project.id,
      sourceTeamIds: [teamId('transfermarkt', 'tm-a-2'), teamId('soccerway', 'sw-a-2')],
    });
    expect(detectedPreview.detectedCombinedLeagueId).toBe(combinedA.league.id);
    expect(detectedPreview.combinedLeagues).toContainEqual(
      expect.objectContaining({ id: combinedA.league.id }),
    );

    expect(
      database.previewTeamCombination({
        projectId: project.id,
        sourceTeamIds: [teamId('transfermarkt', 'tm-a-2'), teamId('worldfootball', 'wf-b-2')],
      }).detectedCombinedLeagueId,
    ).toBeUndefined();

    expect(
      database.previewTeamCombination({
        projectId: project.id,
        combinedTeamId: combinedA.team.id,
        sourceTeamIds: [
          teamId('transfermarkt', 'tm-a-1'),
          teamId('soccerway', 'sw-a-1'),
          teamId('worldfootball', 'wf-b-2'),
        ],
      }).detectedCombinedLeagueId,
    ).toBe(combinedA.league.id);
    database.close();
  });

  test('filters combine team candidates by their stored source league', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'League-filtered candidates',
      referenceDate: '2026-07-01',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'first-league',
        name: 'First League',
        sourceUrl: 'first-league',
      },
      teams: [
        {
          sourceId: 'first-team',
          name: 'First Team',
          sourceUrl: 'first-team',
          players: [],
        },
      ],
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'second-league',
        name: 'Second League',
        sourceUrl: 'second-league',
      },
      teams: [
        {
          sourceId: 'second-team',
          name: 'Second Team',
          sourceUrl: 'second-team',
          players: [],
        },
      ],
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'unassigned-team',
          name: 'Unassigned Team',
          sourceUrl: 'unassigned-team',
          players: [],
        },
      ],
    });

    const leagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      sourceNames: ['transfermarkt'],
    }).rows as League[];
    const firstLeague = leagues.find(({ sourceId }) => sourceId === 'first-league');
    expect(firstLeague).toBeDefined();
    if (!firstLeague) throw new Error('Expected the imported first league');

    expect(
      database.listCombineTeamCandidates({
        projectId: project.id,
        sourceName: 'transfermarkt',
        search: '',
      }),
    ).toHaveLength(3);
    expect(
      database.listCombineTeamCandidates({
        projectId: project.id,
        sourceName: 'transfermarkt',
        leagueId: firstLeague.id,
        search: '',
      }),
    ).toEqual([expect.objectContaining({ sourceId: 'first-team' })]);
    database.close();
  });

  test('widens v5 source constraints without changing existing WorldFootball records', () => {
    const path = createDatabasePath();
    const v5Database = new DatabaseSync(path);
    v5Database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      ) STRICT;
      INSERT INTO schema_migrations VALUES
        (1, '2025-01-01T00:00:00.000Z'),
        (2, '2025-01-02T00:00:00.000Z'),
        (3, '2025-01-03T00:00:00.000Z'),
        (4, '2025-01-04T00:00:00.000Z'),
        (5, '2025-01-05T00:00:00.000Z');
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        reference_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE leagues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball')),
        source_id TEXT NOT NULL,
        name TEXT NOT NULL,
        season TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, source_name, source_id, season)
      ) STRICT;
      CREATE TABLE teams (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL,
        source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball')),
        source_id TEXT NOT NULL,
        name TEXT NOT NULL,
        season TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, source_name, source_id, season)
      ) STRICT;
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball')),
        source_id TEXT NOT NULL,
        name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        jersey_number INTEGER,
        position TEXT,
        birthdate TEXT,
        height REAL,
        weight REAL,
        foot TEXT,
        joined TEXT,
        contract_expires TEXT,
        market_value REAL,
        country_name TEXT,
        country_code2 TEXT,
        country_code3 TEXT,
        minutes_played INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        position_detail TEXT,
        UNIQUE(project_id, team_id, source_name, source_id)
      ) STRICT;
      INSERT INTO projects VALUES (
        'project-v5', 'WorldFootball v5', '2026-01-01',
        '2025-01-01T00:00:00.000Z', '2025-01-04T00:00:00.000Z'
      );
      INSERT INTO leagues VALUES (
        'league-v5', 'project-v5', 'worldfootball',
        'co7093/mexico-lp---serie-b', 'Mexico LP - Serie B', '',
        '2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z'
      );
      INSERT INTO teams VALUES (
        'team-v5', 'project-v5', 'league-v5', 'worldfootball',
        'te237557/artesanos-metepec', 'Artesanos Metepec', '',
        '2025-01-02T00:00:00.000Z', '2025-01-03T00:00:00.000Z'
      );
      INSERT INTO players(
        id, project_id, team_id, source_name, source_id, name, position,
        created_at, updated_at, position_detail
      ) VALUES (
        'player-v5', 'project-v5', 'team-v5', 'worldfootball',
        'pe599828/oscar-altamirano', 'Óscar Altamirano', 'ATTACKER',
        '2025-01-03T00:00:00.000Z', '2025-01-04T00:00:00.000Z', 'GK'
      );
    `);
    v5Database.close();

    const database = new SnapshotDatabase(path);
    expect(
      database.getEntity({ projectId: 'project-v5', entity: 'leagues', id: 'league-v5' }),
    ).toMatchObject({
      sourceName: 'worldfootball',
      sourceId: 'co7093/mexico-lp---serie-b',
      sourceUrl: 'https://www.worldfootball.net/competition/co7093/mexico-lp---serie-b/',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    });
    expect(
      database.getEntity({ projectId: 'project-v5', entity: 'teams', id: 'team-v5' }),
    ).toMatchObject({ leagueId: 'league-v5', sourceName: 'worldfootball' });
    expect(
      database.listEntities({
        projectId: 'project-v5',
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      id: 'player-v5',
      teamId: 'team-v5',
      sourceName: 'worldfootball',
      sourceId: 'pe599828/oscar-altamirano',
      position: 'ATTACKER',
      positionDetail: 'GK',
    });
    database.close();

    const migratedDatabase = new DatabaseSync(path);
    expect(
      migratedDatabase.prepare('SELECT max(version) AS version FROM schema_migrations').get(),
    ).toMatchObject({ version: 13 });
    const leagueSchema = migratedDatabase
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'leagues'")
      .get() as { sql: string };
    expect(leagueSchema.sql).toContain("'eurofotbal'");
    expect(migratedDatabase.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    migratedDatabase.close();
  });
});
