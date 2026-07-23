import { afterEach, describe, expect, test, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { CommitImportRequest } from '../shared/contracts.js';
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
    expect(leagueColumns.map(({ name }) => name)).toContain('source_name');
    expect(leagueColumns.map(({ name }) => name)).toContain('source_id');
    expect(leagueColumns.map(({ name }) => name)).not.toContain('source_url');
    expect(leagueColumns.map(({ name }) => name)).not.toContain('external_id');
    expect(
      migratedDatabase.prepare('SELECT max(version) AS version FROM schema_migrations').get(),
    ).toMatchObject({ version: 6 });
    migratedDatabase.close();
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
    ).toMatchObject({ version: 6 });
    const leagueSchema = migratedDatabase
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'leagues'")
      .get() as { sql: string };
    expect(leagueSchema.sql).toContain("'eurofotbal'");
    expect(migratedDatabase.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    migratedDatabase.close();
  });

  test('normalizes names, rejects case-insensitive duplicates, and sorts by reference date', () => {
    const database = createDatabase();
    const first = database.createProject({ name: ' 2026/1 ', referenceDate: '2026-01-01' });
    database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });

    expect(first.name).toBe('2026/1');
    expect(first).toMatchObject({ leagueCount: 0, teamCount: 0, playerCount: 0 });
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
    });
    expect(database.getProjectSummary(second.id)).toMatchObject({
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    });
    expect(database.listProjects()).toEqual([
      expect.objectContaining({
        id: second.id,
        leagueCount: 0,
        teamCount: 0,
        playerCount: 0,
      }),
      expect.objectContaining({
        id: first.id,
        leagueCount: 1,
        teamCount: 1,
        playerCount: 1,
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

  test('sorts players by creation timestamp', () => {
    vi.useFakeTimers();
    try {
      const database = createDatabase();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const project = database.createProject({
        name: 'Timestamp sort',
        referenceDate: '2026-01-01',
      });
      const request = {
        projectId: project.id,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        teams: [
          {
            sourceId: 'team',
            name: 'Team',
            sourceUrl: 'https://example.test/team',
            players: [{ sourceId: 'older', name: 'Older Player' }],
          },
        ],
      };
      database.commitImport(request);

      vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      database.commitImport({
        ...request,
        teams: [
          {
            ...request.teams[0],
            players: [...request.teams[0].players, { sourceId: 'newer', name: 'Newer Player' }],
          },
        ],
      });

      const list = (direction: 'asc' | 'desc') =>
        database
          .listEntities({
            projectId: project.id,
            entity: 'players',
            pageIndex: 0,
            pageSize: 25,
            search: '',
            sort: 'createdAt',
            direction,
          })
          .rows.map((player) => player.name);
      expect(list('asc')).toEqual(['Older Player', 'Newer Player']);
      expect(list('desc')).toEqual(['Newer Player', 'Older Player']);
      expect(
        database
          .listEntities({
            projectId: project.id,
            entity: 'players',
            pageIndex: 0,
            pageSize: 25,
            search: '',
            sort: 'sourceId',
            direction: 'asc',
          })
          .rows.map((player) => player.name),
      ).toEqual(['Newer Player', 'Older Player']);
      database.close();
    } finally {
      vi.useRealTimers();
    }
  });

  test('filters teams and players by multiple parents, including teams without a league', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Filtered', referenceDate: '2026-01-01' });
    const otherProject = database.createProject({ name: 'Other', referenceDate: '2026-07-01' });
    const importLeague = (
      projectId: string,
      leagueId: string,
      leagueName: string,
      teamId: string,
      teamName: string,
      playerName: string,
    ) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: {
          sourceId: leagueId,
          name: leagueName,
          sourceUrl: `https://example.test/${leagueId}`,
        },
        teams: [
          {
            sourceId: teamId,
            name: teamName,
            sourceUrl: `https://example.test/${teamId}`,
            players: [{ sourceId: `player-${teamId}`, name: playerName }],
          },
        ],
      });
    importLeague(project.id, 'league-a', 'League A', 'team-a', 'Alpha United', 'Selected One');
    importLeague(project.id, 'league-b', 'League B', 'team-b', 'Beta City', 'Selected Two');
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-independent',
          name: 'Independent Alpha',
          sourceUrl: 'https://example.test/team-independent',
          players: [{ sourceId: 'player-independent', name: 'Independent Player' }],
        },
      ],
    });
    importLeague(
      otherProject.id,
      'league-other',
      'Other League',
      'team-other',
      'Other Team',
      'Other Player',
    );
    const list = (projectId: string, entity: 'leagues' | 'teams') =>
      database.listEntities({
        projectId,
        entity,
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows;
    const leagues = list(project.id, 'leagues');
    const teams = list(project.id, 'teams');
    const leagueA = leagues.find((league) => league.name === 'League A');
    const leagueB = leagues.find((league) => league.name === 'League B');
    const teamA = teams.find((team) => team.name === 'Alpha United');
    const teamB = teams.find((team) => team.name === 'Beta City');
    const otherTeam = list(otherProject.id, 'teams')[0];
    if (!leagueA || !leagueB || !teamA || !teamB) {
      throw new Error('Filter fixture missing.');
    }

    const leaguePage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 1,
      search: '',
      sort: 'name',
      direction: 'asc',
      leagueIds: [leagueA.id, leagueB.id, leagueA.id],
    });
    expect(leaguePage.total).toBe(2);
    expect(leaguePage.rows).toHaveLength(1);

    const legacyLeaguePage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      leagueId: leagueA.id,
    });
    expect(legacyLeaguePage.rows.map((team) => team.name)).toEqual(['Alpha United']);

    const mixedPage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: 'Alpha',
      sort: 'name',
      direction: 'asc',
      leagueIds: [leagueA.id],
      includeTeamsWithoutLeague: true,
    });
    expect(mixedPage.rows.map((team) => team.name)).toEqual(['Alpha United', 'Independent Alpha']);

    const detachedPage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      leagueIds: [],
      includeTeamsWithoutLeague: true,
    });
    expect(detachedPage.rows.map((team) => team.name)).toEqual(['Independent Alpha']);

    const playerPage = database.listEntities({
      projectId: project.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: 'Selected',
      sort: 'name',
      direction: 'asc',
      teamIds: [teamA.id, teamB.id, otherTeam.id, teamA.id],
    });
    expect(playerPage.rows.map((player) => player.name)).toEqual(['Selected One', 'Selected Two']);

    const legacyPlayerPage = database.listEntities({
      projectId: project.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      teamId: teamB.id,
    });
    expect(legacyPlayerPage.rows.map((player) => player.name)).toEqual(['Selected Two']);

    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
        leagueIds: [],
      }).total,
    ).toBe(3);
    database.close();
  });

  test('lists project-scoped filter options and combines categorical entity filters', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Facets', referenceDate: '2026-01-01' });
    const otherProject = database.createProject({
      name: 'Other facets',
      referenceDate: '2026-07-01',
    });
    const importLeague = (
      projectId: string,
      leagueId: string,
      leagueName: string,
      season: string,
      teamId: string,
      teamName: string,
      players: CommitImportRequest['teams'][number]['players'],
    ) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: {
          sourceId: leagueId,
          name: leagueName,
          season,
          sourceUrl: `https://example.test/${leagueId}`,
        },
        teams: [
          {
            sourceId: teamId,
            name: teamName,
            season,
            sourceUrl: `https://example.test/${teamId}`,
            players,
          },
        ],
      });
    importLeague(project.id, 'league-z', 'Zulu League', '2025', 'team-b', 'Beta FC', [
      {
        sourceId: 'player-a',
        name: 'Attacker One',
        countryName: 'Senegal',
        countryCode2: 'SN',
        position: 'ATTACKER',
        positionDetail: 'ST',
        foot: 'RIGHT',
      },
      {
        sourceId: 'player-b',
        name: 'Defender One',
        countryName: 'Guinea',
        countryCode2: 'GN',
        position: 'DEFENDER',
        positionDetail: 'CB',
        foot: 'LEFT',
      },
    ]);
    importLeague(project.id, 'league-a', 'alpha League', '2026', 'team-a', 'Alpha FC', [
      {
        sourceId: 'player-c',
        name: 'Midfielder One',
        countryName: 'Senegal',
        countryCode2: 'SN',
        position: 'MIDFIELDER',
        positionDetail: 'CAM',
        foot: 'LEFT',
      },
    ]);
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'independent',
          name: 'Independent',
          season: '2024',
          sourceUrl: 'https://example.test/independent',
          players: [],
        },
      ],
    });
    importLeague(otherProject.id, 'other', 'Other League', '2030', 'other-team', 'Other FC', [
      {
        sourceId: 'other-player',
        name: 'Other Player',
        countryName: 'Portugal',
        countryCode2: 'PT',
        position: 'GOALKEEPER',
        positionDetail: 'GK',
        foot: 'RIGHT',
      },
    ]);

    expect(database.listEntityFilterOptions({ projectId: project.id, entity: 'leagues' })).toEqual({
      entity: 'leagues',
      sourceNames: ['transfermarkt'],
      seasons: ['2025', '2026'],
    });
    const teamOptions = database.listEntityFilterOptions({
      projectId: project.id,
      entity: 'teams',
    });
    expect(teamOptions).toMatchObject({
      entity: 'teams',
      hasTeamsWithoutLeague: true,
      seasons: ['2024', '2025', '2026'],
      leagues: [
        { sourceId: 'league-a', name: 'alpha League' },
        { sourceId: 'league-z', name: 'Zulu League' },
      ],
    });
    const playerOptions = database.listEntityFilterOptions({
      projectId: project.id,
      entity: 'players',
    });
    expect(playerOptions).toMatchObject({
      entity: 'players',
      teams: [{ name: 'Alpha FC' }, { name: 'Beta FC' }, { name: 'Independent' }],
      nationalities: [
        { name: 'Guinea', code: 'GN' },
        { name: 'Senegal', code: 'SN' },
      ],
      positions: ['DEFENDER', 'MIDFIELDER', 'ATTACKER'],
      positionDetails: ['CB', 'CAM', 'ST'],
      feet: ['LEFT', 'RIGHT'],
    });

    const leagueRows = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      seasons: ['2026', '2026', ''],
    }).rows;
    expect(leagueRows.map((row) => row.name)).toEqual(['alpha League']);
    const betaTeam =
      playerOptions.entity === 'players'
        ? playerOptions.teams.find((team) => team.name === 'Beta FC')
        : undefined;
    const zuluLeague =
      teamOptions.entity === 'teams'
        ? teamOptions.leagues.find((league) => league.name === 'Zulu League')
        : undefined;
    if (!betaTeam || !zuluLeague) throw new Error('Filter option fixture missing.');
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'teams',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          leagueIds: [zuluLeague.id],
          seasons: ['2025'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Beta FC']);
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
          teamIds: [betaTeam.id],
          nationalities: ['senegal', 'Guinea'],
          positions: ['ATTACKER'],
          positionDetails: ['ST'],
          feet: ['RIGHT'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Attacker One']);
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
          positions: ['DEFENDER', 'ATTACKER'],
          positionDetails: ['CB', 'ST'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Attacker One', 'Defender One']);
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'players',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'positionDetail',
          direction: 'asc',
        })
        .rows.map((row) => row.name),
    ).toEqual(['Midfielder One', 'Defender One', 'Attacker One']);
    expect(
      database.listEntityFilterOptions({ projectId: otherProject.id, entity: 'players' }),
    ).toMatchObject({
      nationalities: [{ name: 'Portugal', code: 'PT' }],
      positions: ['GOALKEEPER'],
      positionDetails: ['GK'],
    });
    database.close();
  });

  test('rolls back every row when an import fails', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });

    expect(() =>
      database.commitImport({
        projectId: project.id,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        teams: [
          {
            sourceId: 'valid',
            name: 'Valid team',
            sourceUrl: 'https://example.test/valid',
            players: [{ name: 'Valid player' }],
          },
          {
            sourceId: 'invalid',
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
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'Premier League', sourceUrl: leagueUrl },
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://example.test/281',
          players: [
            { sourceId: '1', name: 'Existing player' },
            { sourceId: '2', name: 'Removed player' },
          ],
        },
        {
          sourceId: '985',
          name: 'Removed team',
          sourceUrl: 'https://example.test/985',
          players: [{ sourceId: '3', name: 'Removed with team' }],
        },
      ],
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: {
        sourceId: 'ES1',
        name: 'Unrelated league',
        sourceUrl: 'https://example.test/ES1',
      },
      teams: [
        {
          sourceId: '999',
          name: 'Unrelated team',
          sourceUrl: 'https://example.test/999',
          players: [{ sourceId: '9', name: 'Unrelated player' }],
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
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: target.id },
        options: {
          absentTeams: 'delete' as const,
          absentPlayers: 'delete' as const,
          overrideTeamNames: true,
          overridePlayerNames: true,
          teamLeagueConflicts: 'move' as const,
          playerTeamConflicts: 'move' as const,
        },
      },
      league: { sourceId: 'GB1', name: 'Premier League', sourceUrl: leagueUrl },
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City updated',
          sourceUrl: 'https://example.test/281',
          players: [
            { sourceId: '1', name: 'Existing player updated' },
            { sourceId: '4', name: 'New player' },
          ],
        },
        {
          sourceId: '777',
          name: 'New team',
          sourceUrl: 'https://example.test/777',
          players: [{ sourceId: '7', name: 'New team player' }],
        },
      ],
    };

    const expectedChanges = {
      leagues: { added: 0, updated: 1, preserved: 0, deleted: 0 },
      teams: { added: 1, updated: 1, preserved: 0, moved: 0, detached: 0, deleted: 1 },
      players: {
        added: 2,
        updated: 1,
        preserved: 0,
        moved: 0,
        deduplicated: 0,
        deleted: 2,
      },
    };
    expect(database.previewImportChanges(request).changes).toEqual(expectedChanges);
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
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Removed player' }],
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
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'teams' as const, id: team.id },
        options: {
          absentPlayers: 'delete' as const,
          overridePlayerNames: true,
          playerTeamConflicts: 'move' as const,
        },
      },
      teams: [
        {
          sourceId: '281',
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
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: {
        sourceId: 'GB1',
        name: 'Stored league',
        sourceUrl: 'https://example.test/GB1',
      },
      teams: [
        {
          sourceId: '281',
          name: 'Stored team',
          sourceUrl: 'https://example.test/281',
          players: [
            {
              sourceId: '1',
              name: 'Stored Player',
              firstName: 'Stored',
              lastName: 'Player',
              jerseyNumber: 7,
            },
            { sourceId: '2', name: 'Absent Player' },
          ],
        },
        {
          sourceId: '985',
          name: 'Absent team',
          sourceUrl: 'https://example.test/985',
          players: [{ sourceId: '3', name: 'Absent team player' }],
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
    const storedTeam = teamsBefore.find((team) => team.sourceId === '281');
    if (!storedTeam) throw new Error('Stored team fixture missing.');
    const playersBefore = database.listEntities({
      projectId: project.id,
      entity: 'players',
      teamIds: [storedTeam.id],
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const storedPlayer = playersBefore.find((player) => player.sourceId === '1');
    if (!storedPlayer) throw new Error('Stored player fixture missing.');
    const request = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: league.id },
        options: {
          absentTeams: 'keep' as const,
          absentPlayers: 'keep' as const,
          overrideTeamNames: false,
          overridePlayerNames: false,
          teamLeagueConflicts: 'move' as const,
          playerTeamConflicts: 'move' as const,
        },
      },
      league: {
        sourceId: 'GB1',
        name: 'Scraped league',
        sourceUrl: 'https://example.test/GB1-refreshed',
      },
      teams: [
        {
          sourceId: '281',
          name: 'Scraped team',
          sourceUrl: 'https://example.test/281-refreshed',
          players: [
            {
              sourceId: '1',
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
      leagues: { added: 0, updated: 1, preserved: 0, deleted: 0 },
      teams: { added: 0, updated: 1, preserved: 0, moved: 0, detached: 0, deleted: 0 },
      players: {
        added: 0,
        updated: 1,
        preserved: 0,
        moved: 0,
        deduplicated: 0,
        deleted: 0,
      },
    };
    expect(database.previewImportChanges(request).changes).toEqual(expectedChanges);
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
      teamIds: [storedTeam.id],
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
        teamIds: [storedTeam.id],
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
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'League', sourceUrl: 'https://example.test/GB1' },
      teams: [
        {
          sourceId: '281',
          name: 'Detached team',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Preserved player' }],
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
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: league.id },
        options: {
          absentTeams: 'detach' as const,
          absentPlayers: 'delete' as const,
          overrideTeamNames: false,
          overridePlayerNames: false,
          teamLeagueConflicts: 'move' as const,
          playerTeamConflicts: 'move' as const,
        },
      },
      league: { sourceId: 'GB1', name: 'League', sourceUrl: 'https://example.test/GB1' },
      teams: [],
    };

    expect(database.previewImportChanges(request).changes).toEqual({
      leagues: { added: 0, updated: 1, preserved: 0, deleted: 0 },
      teams: { added: 0, updated: 0, preserved: 0, moved: 0, detached: 1, deleted: 0 },
      players: {
        added: 0,
        updated: 0,
        preserved: 0,
        moved: 0,
        deduplicated: 0,
        deleted: 0,
      },
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
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'Premier League', sourceUrl: 'https://example.test/GB1' },
      teams: [
        {
          sourceId: '281',
          name: 'Original team',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Original player' }],
        },
        {
          sourceId: '985',
          name: 'Team that must survive rollback',
          sourceUrl: 'https://example.test/985',
          players: [{ sourceId: '2', name: 'Second player' }],
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
        sourceName: 'transfermarkt' as const,
        operation: {
          kind: 'synchronize',
          target: { entity: 'leagues', id: league.id },
          options: {
            absentTeams: 'delete',
            absentPlayers: 'delete',
            overrideTeamNames: true,
            overridePlayerNames: true,
            teamLeagueConflicts: 'move',
            playerTeamConflicts: 'move',
          },
        },
        league: {
          sourceId: 'GB1',
          name: 'Premier League changed',
          sourceUrl: 'https://example.test/GB1',
        },
        teams: [
          {
            sourceId: '281',
            name: 'Changed before failure',
            sourceUrl: 'https://example.test/281',
            players: [],
          },
          {
            sourceId: 'invalid',
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
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: '281',
          name: 'Stored team',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Stored player' }],
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
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize',
        target: { entity: 'teams', id: team.id },
        options: {
          absentPlayers: 'archive',
          overridePlayerNames: false,
          playerTeamConflicts: 'move',
        },
      },
      teams: [
        {
          sourceId: '281',
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
    const importLeague = (projectId: string, sourceId: string, name: string) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: { sourceId, name, sourceUrl: `https://example.test/${sourceId}` },
        teams: [
          {
            sourceId: `${sourceId}-team`,
            name: `${name} team`,
            sourceUrl: `https://example.test/${sourceId}-team`,
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
    const premier = projectLeagues.find((league) => league.sourceId === 'GB1');
    const championship = projectLeagues.find((league) => league.sourceId === 'GB2');
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
    const updatedLeague = database.updateEntityMetadata({
      projectId: project.id,
      entity: 'leagues',
      id: premier.id,
      name: 'Premier League renamed',
      sourceId: 'GBX',
      season: '2026',
    });
    expect(updatedLeague).toMatchObject({
      id: premier.id,
      sourceId: 'GBX',
      season: '2026',
      sourceUrl: 'https://www.transfermarkt.com/slug/startseite/wettbewerb/GBX/plus?saison_id=2026',
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
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: team.id,
        name: 'Moved team',
        sourceId: 'moved-team',
        season: '2026',
        leagueId: championship.id,
      }),
    ).toMatchObject({ id: team.id, leagueId: championship.id, sourceId: 'moved-team' });
    expect(() =>
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: team.id,
        name: 'Invalid move',
        sourceId: 'moved-team',
        season: '2026',
        leagueId: bundesliga.id,
      }),
    ).toThrow(ApplicationError);
    expect(() =>
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'leagues',
        id: premier.id,
        name: 'Duplicate',
        sourceId: 'GB2',
      }),
    ).toThrow(ApplicationError);
    database.close();
  });

  test('previews and applies global keep or refresh policies for matching records', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Conflicts', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'Stored league', sourceUrl: 'https://old.test/league' },
      teams: [
        {
          sourceId: '281',
          name: 'Stored team',
          sourceUrl: 'https://old.test/team',
          players: [
            {
              sourceId: '10',
              name: 'Stored player',
              position: 'DEFENDER',
              positionDetail: 'CB',
            },
          ],
        },
      ],
    });
    const request: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'keep',
          teamLeagueConflicts: 'move',
          playerTeamConflicts: 'move',
        },
      },
      league: { sourceId: 'GB1', name: 'Fresh league', sourceUrl: 'https://new.test/league' },
      teams: [
        {
          sourceId: '281',
          name: 'Fresh team',
          sourceUrl: 'https://new.test/team',
          players: [
            {
              sourceId: '10',
              name: 'Fresh player',
              position: 'ATTACKER',
              positionDetail: 'ST',
            },
          ],
        },
      ],
    };

    const preview = database.previewImportChanges(request);
    expect(preview.conflicts.existingRecords).toHaveLength(3);
    expect(preview.changes).toMatchObject({
      leagues: { preserved: 1 },
      teams: { preserved: 1 },
      players: { preserved: 1 },
    });
    database.commitImport(request);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      name: 'Stored league',
      sourceUrl: 'https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1',
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
      }).rows[0],
    ).toMatchObject({ name: 'Stored player', position: 'DEFENDER', positionDetail: 'CB' });

    if (request.operation.kind !== 'merge') throw new Error('Expected merge operation.');
    request.operation.options.existingRecords = 'refresh';
    database.commitImport(request);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      name: 'Fresh league',
      sourceUrl: 'https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1',
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
      }).rows[0],
    ).toMatchObject({ name: 'Fresh player', position: 'ATTACKER', positionDetail: 'ST' });
    database.close();
  });

  test('keeps or moves team and player ownership without creating player copies', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Ownership', referenceDate: '2026-01-01' });
    const importLeague = (leagueId: string, teamId: string, playerId?: string) =>
      database.commitImport({
        projectId: project.id,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: { sourceId: leagueId, name: `League ${leagueId}`, sourceUrl: leagueId },
        teams: [
          {
            sourceId: teamId,
            name: `Team ${teamId}`,
            sourceUrl: teamId,
            players: playerId ? [{ sourceId: playerId, name: 'Shared player' }] : [],
          },
        ],
      });
    importLeague('A', 'team-a', 'player');
    importLeague('B', 'team-b');
    const leagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const leagueA = leagues.find((league) => league.sourceId === 'A');
    const leagueB = leagues.find((league) => league.sourceId === 'B');
    if (!leagueA || !leagueB) throw new Error('Expected test leagues.');
    const teamMove: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'refresh',
          teamLeagueConflicts: 'keep',
          playerTeamConflicts: 'move',
        },
      },
      league: { sourceId: 'B', name: 'League B', sourceUrl: 'B' },
      teams: [{ sourceId: 'team-a', name: 'Team A', sourceUrl: 'team-a', players: [] }],
    };
    expect(database.previewImportChanges(teamMove).conflicts.teamLeagueConflicts).toHaveLength(1);
    database.commitImport(teamMove);
    const findTeam = (sourceId: string) =>
      database
        .listEntities({
          projectId: project.id,
          entity: 'teams',
          pageIndex: 0,
          pageSize: 25,
          search: sourceId,
          sort: 'name',
          direction: 'asc',
        })
        .rows.find((team) => team.sourceId === sourceId);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueA.id });
    if (teamMove.operation.kind !== 'merge') throw new Error('Expected merge operation.');
    teamMove.operation.options.teamLeagueConflicts = 'move';
    database.commitImport(teamMove);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueB.id });

    const playerMove: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'refresh',
          teamLeagueConflicts: 'move',
          playerTeamConflicts: 'keep',
        },
      },
      teams: [
        {
          sourceId: 'team-b',
          name: 'Team B',
          sourceUrl: 'team-b',
          players: [{ sourceId: 'player', name: 'Shared player' }],
        },
      ],
    };
    expect(database.previewImportChanges(playerMove).conflicts.playerTeamConflicts).toHaveLength(1);
    database.commitImport(playerMove);
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
    ).toEqual([expect.objectContaining({ teamId: findTeam('team-a')?.id })]);
    playerMove.operation.options.playerTeamConflicts = 'move';
    database.commitImport(playerMove);
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
    ).toEqual([expect.objectContaining({ teamId: findTeam('team-b')?.id })]);

    const leagueSync: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize',
        target: { entity: 'leagues', id: leagueA.id },
        options: {
          absentTeams: 'keep',
          absentPlayers: 'keep',
          overrideTeamNames: false,
          overridePlayerNames: false,
          teamLeagueConflicts: 'keep',
          playerTeamConflicts: 'keep',
        },
      },
      league: { sourceId: 'A', name: 'League A', sourceUrl: 'A' },
      teams: [{ sourceId: 'team-a', name: 'Team A', sourceUrl: 'team-a', players: [] }],
    };
    expect(database.previewImportChanges(leagueSync).conflicts.teamLeagueConflicts).toHaveLength(1);
    database.commitImport(leagueSync);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueB.id });
    if (
      leagueSync.operation.kind !== 'synchronize' ||
      !('teamLeagueConflicts' in leagueSync.operation.options)
    ) {
      throw new Error('Expected league synchronization.');
    }
    leagueSync.operation.options.teamLeagueConflicts = 'move';
    database.commitImport(leagueSync);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueA.id });

    const teamA = findTeam('team-a');
    if (!teamA) throw new Error('Expected team A.');
    const teamSync: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize',
        target: { entity: 'teams', id: teamA.id },
        options: {
          absentPlayers: 'keep',
          overridePlayerNames: false,
          playerTeamConflicts: 'keep',
        },
      },
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'player', name: 'Shared player' }],
        },
      ],
    };
    expect(database.previewImportChanges(teamSync).conflicts.playerTeamConflicts).toHaveLength(1);
    database.commitImport(teamSync);
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
    ).toEqual([expect.objectContaining({ teamId: findTeam('team-b')?.id })]);
    teamSync.operation.options.playerTeamConflicts = 'move';
    database.commitImport(teamSync);
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
    ).toEqual([expect.objectContaining({ teamId: teamA.id })]);
    database.close();
  });

  test('consolidates legacy player copies on import and rejects ambiguous incoming squads', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Legacy copies', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'player', name: 'Older copy' }],
        },
        { sourceId: 'team-b', name: 'Team B', sourceUrl: 'team-b', players: [] },
      ],
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
    const teamA = teams.find((team) => team.sourceId === 'team-a');
    const teamB = teams.find((team) => team.sourceId === 'team-b');
    if (!teamA || !teamB) throw new Error('Expected test teams.');
    const sqlite = (
      database as unknown as {
        database: {
          prepare(sql: string): { run(values: Record<string, string>): unknown };
        };
      }
    ).database;
    sqlite
      .prepare(
        `INSERT INTO players(
           id, project_id, team_id, source_name, source_id, name, created_at, updated_at
         )
         VALUES (
           $id, $projectId, $teamId, 'transfermarkt', $sourceId, $name, $createdAt, $updatedAt
         )`,
      )
      .run({
        id: 'legacy-copy',
        projectId: project.id,
        teamId: teamB.id,
        sourceId: 'player',
        name: 'Newest legacy copy',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2099-01-01T00:00:00.000Z',
      });
    const request: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'keep',
          teamLeagueConflicts: 'keep',
          playerTeamConflicts: 'keep',
        },
      },
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'player', name: 'Incoming player' }],
        },
      ],
    };
    const preview = database.previewImportChanges(request);
    expect(preview.conflicts.playerTeamConflicts[0]).toMatchObject({ legacyCopyCount: 2 });
    expect(preview.changes.players).toMatchObject({ moved: 1, deduplicated: 1 });
    database.commitImport(request);
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
    ).toEqual([expect.objectContaining({ name: 'Newest legacy copy', teamId: teamA.id })]);

    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ name: 'Unknown identity' }],
        },
        {
          sourceId: 'team-b',
          name: 'Team B',
          sourceUrl: 'team-b',
          players: [{ name: 'Unknown identity' }],
        },
      ],
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: 'Unknown identity',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toHaveLength(2);

    const duplicateRequest: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'duplicate', name: 'Duplicate player' }],
        },
        {
          sourceId: 'team-b',
          name: 'Team B',
          sourceUrl: 'team-b',
          players: [{ sourceId: 'duplicate', name: 'Duplicate player' }],
        },
      ],
    };
    expect(() => database.previewImportChanges(duplicateRequest)).toThrow(
      /selected for multiple teams/,
    );
    database.close();
  });
});
