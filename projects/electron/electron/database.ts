import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  isSourceName,
  playerPositionDetails,
  sourceLabels,
  sourceSupportsSeason,
  type CommitImportRequest,
  type DeleteSourceDataRequest,
  type DeleteSourceDataResult,
  type EditableEntity,
  type EditableEntityKind,
  type Entity,
  type EntityFilterOptions,
  type EntityFilterOptionsRequest,
  type ImportConflictSummary,
  type ImportChangeSummary,
  type ImportPreview,
  type ImportResult,
  type ImportTeam,
  type LeagueSynchronizeImportOperation,
  type League,
  type NationalityFilterOption,
  type Page,
  type PageRequest,
  type Player,
  type PlayerInput,
  type Project,
  type ProjectSummary,
  type SourceDataDeletionCounts,
  type SourceName,
  type Team,
  type SynchronizeImportOperation,
  type UpdateEntityMetadataRequest,
} from '../shared/contracts.js';
import { findFootballCountryByCode3 } from '../shared/football-countries.js';
import { isReferenceDate } from '../shared/reference-date.js';
import { ApplicationError } from './errors.js';
import { parseSourceIdentifier } from './scraper.js';
import { buildSourceUrl } from './source-url.js';

type Row = Record<string, string | number | null>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLeagueSynchronization = (
  operation: SynchronizeImportOperation,
): operation is LeagueSynchronizeImportOperation => operation.target.entity === 'leagues';

const entitySortColumns = {
  leagues: {
    sourceName: 'source_name',
    name: 'name',
    leagueCountry: 'country_name',
    sourceId: 'source_id',
    season: 'season',
    teamCount: 'team_count',
    sourceUrl: 'source_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  teams: {
    sourceName: 'source_name',
    name: 'name',
    sourceId: 'source_id',
    season: 'season',
    playerCount: 'player_count',
    sourceUrl: 'source_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  players: {
    sourceName: 'source_name',
    name: 'name',
    sourceId: 'source_id',
    countryName: 'country_name',
    jerseyNumber: 'jersey_number',
    position: 'position',
    positionDetail: 'position_detail',
    birthdate: 'birthdate',
    height: 'height',
    foot: 'foot',
    joined: 'joined',
    contractExpires: 'contract_expires',
    marketValue: 'market_value',
    sourceUrl: 'source_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
} as const;

const playerPositions = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'ATTACKER'] as const;
const playerFeet = ['LEFT', 'RIGHT'] as const;

const uniqueStrings = (values: readonly string[]): string[] => [
  ...new Set(values.map((value) => value.trim()).filter(Boolean)),
];

const optionalString = (value: string | number | null): string | undefined =>
  value === null || String(value) === '' ? undefined : String(value);
const optionalNumber = (value: string | number | null | undefined): number | undefined =>
  value == null ? undefined : Number(value);
const teamIdentity = (sourceId: string, season: string | undefined): string =>
  `${sourceId}\u0000${season ?? ''}`;
const playerIdentity = (player: PlayerInput): string =>
  player.sourceId ?? `name:${player.name.trim().toLocaleLowerCase('en')}`;
const isStablePlayerIdentity = (
  player: PlayerInput,
): player is PlayerInput & { sourceId: string } => Boolean(player.sourceId);
const emptyChanges = (): ImportChangeSummary => ({
  leagues: { added: 0, updated: 0, preserved: 0, deleted: 0 },
  teams: { added: 0, updated: 0, preserved: 0, moved: 0, detached: 0, deleted: 0 },
  players: { added: 0, updated: 0, preserved: 0, moved: 0, deduplicated: 0, deleted: 0 },
});
const emptyConflicts = (): ImportConflictSummary => ({
  existingRecords: [],
  teamLeagueConflicts: [],
  playerTeamConflicts: [],
});

export class SnapshotDatabase {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec(
      'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;',
    );
    this.migrate();
  }

  close(): void {
    this.database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    this.database.close();
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      ) STRICT
    `);
    let version = Number(
      (
        this.database
          .prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations')
          .get() as Row
      )['version'],
    );
    if (version < 1)
      this.transaction(() => {
        this.database.exec(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 80),
          reference_date TEXT NOT NULL CHECK(reference_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE leagues (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          source TEXT NOT NULL CHECK(source = 'transfermarkt'),
          external_id TEXT NOT NULL,
          name TEXT NOT NULL CHECK(length(trim(name)) > 0),
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
          name TEXT NOT NULL CHECK(length(trim(name)) > 0),
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
          name TEXT NOT NULL CHECK(length(trim(name)) > 0),
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
        CREATE INDEX leagues_project_name ON leagues(project_id, name COLLATE NOCASE);
        CREATE INDEX teams_project_name ON teams(project_id, name COLLATE NOCASE);
        CREATE INDEX teams_league ON teams(league_id);
        CREATE INDEX players_project_name ON players(project_id, name COLLATE NOCASE);
        CREATE INDEX players_team ON players(team_id);
      `);
        this.database
          .prepare(
            'INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)',
          )
          .run({ version: 1, appliedAt: new Date().toISOString() });
      });
    if (version < 1) version = 1;
    if (version < 2) {
      this.transaction(() => {
        this.database.exec(
          `CREATE INDEX IF NOT EXISTS players_project_external
           ON players(project_id, source, external_id)`,
        );
        this.database
          .prepare(
            'INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)',
          )
          .run({ version: 2, appliedAt: new Date().toISOString() });
      });
    }
    if (version < 3) {
      this.transaction(() => {
        this.database.exec('ALTER TABLE players ADD COLUMN position_detail TEXT');
        this.database
          .prepare(
            'INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)',
          )
          .run({ version: 3, appliedAt: new Date().toISOString() });
      });
    }
    if (version < 4) {
      this.transaction(() => {
        this.database.exec(`
          CREATE TABLE leagues_v4 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
            season TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, source_name, source_id, season)
          ) STRICT;
          CREATE TABLE teams_v4 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            league_id TEXT REFERENCES leagues_v4(id) ON DELETE SET NULL,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
            season TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, source_name, source_id, season)
          ) STRICT;
          CREATE TABLE players_v4 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            team_id TEXT NOT NULL REFERENCES teams_v4(id) ON DELETE CASCADE,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
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
          INSERT INTO leagues_v4(
            id, project_id, source_name, source_id, name, season, created_at, updated_at
          )
          SELECT id, project_id, source, external_id, name, season, created_at, updated_at
          FROM leagues;
          INSERT INTO teams_v4(
            id, project_id, league_id, source_name, source_id, name, season, created_at, updated_at
          )
          SELECT id, project_id, league_id, source, external_id, name, season, created_at, updated_at
          FROM teams;
          INSERT INTO players_v4(
            id, project_id, team_id, source_name, source_id, name, first_name, last_name,
            jersey_number, position, birthdate, height, weight, foot, joined, contract_expires,
            market_value, country_name, country_code2, country_code3, minutes_played, created_at,
            updated_at, position_detail
          )
          SELECT id, project_id, team_id, source, external_id, name, first_name, last_name,
            jersey_number, position, birthdate, height, weight, foot, joined, contract_expires,
            market_value, country_name, country_code2, country_code3, minutes_played, created_at,
            updated_at, position_detail
          FROM players;
          DROP TABLE players;
          DROP TABLE teams;
          DROP TABLE leagues;
          ALTER TABLE leagues_v4 RENAME TO leagues;
          ALTER TABLE teams_v4 RENAME TO teams;
          ALTER TABLE players_v4 RENAME TO players;
          CREATE INDEX leagues_project_name ON leagues(project_id, name COLLATE NOCASE);
          CREATE INDEX teams_project_name ON teams(project_id, name COLLATE NOCASE);
          CREATE INDEX teams_league ON teams(league_id);
          CREATE INDEX players_project_name ON players(project_id, name COLLATE NOCASE);
          CREATE INDEX players_team ON players(team_id);
          CREATE INDEX players_project_source
            ON players(project_id, source_name, source_id);
        `);
        this.database
          .prepare(
            'INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)',
          )
          .run({ version: 4, appliedAt: new Date().toISOString() });
      });
    }
    if (version < 4) version = 4;
    if (version < 5) {
      this.transaction(() => {
        this.database.exec(`
          CREATE TABLE leagues_v5 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
            season TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, source_name, source_id, season)
          ) STRICT;
          CREATE TABLE teams_v5 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            league_id TEXT REFERENCES leagues_v5(id) ON DELETE SET NULL,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
            season TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, source_name, source_id, season)
          ) STRICT;
          CREATE TABLE players_v5 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            team_id TEXT NOT NULL REFERENCES teams_v5(id) ON DELETE CASCADE,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
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
          INSERT INTO leagues_v5
          SELECT * FROM leagues;
          INSERT INTO teams_v5
          SELECT * FROM teams;
          INSERT INTO players_v5
          SELECT * FROM players;
          DROP TABLE players;
          DROP TABLE teams;
          DROP TABLE leagues;
          ALTER TABLE leagues_v5 RENAME TO leagues;
          ALTER TABLE teams_v5 RENAME TO teams;
          ALTER TABLE players_v5 RENAME TO players;
          CREATE INDEX leagues_project_name ON leagues(project_id, name COLLATE NOCASE);
          CREATE INDEX teams_project_name ON teams(project_id, name COLLATE NOCASE);
          CREATE INDEX teams_league ON teams(league_id);
          CREATE INDEX players_project_name ON players(project_id, name COLLATE NOCASE);
          CREATE INDEX players_team ON players(team_id);
          CREATE INDEX players_project_source
            ON players(project_id, source_name, source_id);
        `);
        this.database
          .prepare(
            'INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)',
          )
          .run({ version: 5, appliedAt: new Date().toISOString() });
      });
    }
    if (version < 5) version = 5;
    if (version < 6) {
      this.transaction(() => {
        this.database.exec(`
          CREATE TABLE leagues_v6 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
            season TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, source_name, source_id, season)
          ) STRICT;
          CREATE TABLE teams_v6 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            league_id TEXT REFERENCES leagues_v6(id) ON DELETE SET NULL,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
            season TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, source_name, source_id, season)
          ) STRICT;
          CREATE TABLE players_v6 (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            team_id TEXT NOT NULL REFERENCES teams_v6(id) ON DELETE CASCADE,
            source_name TEXT NOT NULL CHECK(source_name IN ('transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal')),
            source_id TEXT NOT NULL CHECK(length(trim(source_id)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
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
          INSERT INTO leagues_v6
          SELECT * FROM leagues;
          INSERT INTO teams_v6
          SELECT * FROM teams;
          INSERT INTO players_v6
          SELECT * FROM players;
          DROP TABLE players;
          DROP TABLE teams;
          DROP TABLE leagues;
          ALTER TABLE leagues_v6 RENAME TO leagues;
          ALTER TABLE teams_v6 RENAME TO teams;
          ALTER TABLE players_v6 RENAME TO players;
          CREATE INDEX leagues_project_name ON leagues(project_id, name COLLATE NOCASE);
          CREATE INDEX teams_project_name ON teams(project_id, name COLLATE NOCASE);
          CREATE INDEX teams_league ON teams(league_id);
          CREATE INDEX players_project_name ON players(project_id, name COLLATE NOCASE);
          CREATE INDEX players_team ON players(team_id);
          CREATE INDEX players_project_source
            ON players(project_id, source_name, source_id);
        `);
        this.database
          .prepare(
            'INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)',
          )
          .run({ version: 6, appliedAt: new Date().toISOString() });
      });
    }
    if (version < 6) version = 6;
    if (version < 7) {
      this.transaction(() => {
        this.database.exec(`
          ALTER TABLE leagues ADD COLUMN country_name TEXT
            CHECK(country_name IS NULL OR length(trim(country_name)) > 0);
          ALTER TABLE leagues ADD COLUMN country_code2 TEXT
            CHECK(country_code2 IS NULL OR length(country_code2) = 2);
          ALTER TABLE leagues ADD COLUMN country_code3 TEXT
            CHECK(country_code3 IS NULL OR length(country_code3) = 3);
        `);
        this.database
          .prepare(
            'INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)',
          )
          .run({ version: 7, appliedAt: new Date().toISOString() });
      });
    }
  }

  listProjects(): ProjectSummary[] {
    const rows = this.database
      .prepare(
        `SELECT p.*,
         COALESCE(l.league_count, 0) AS league_count,
         COALESCE(t.team_count, 0) AS team_count,
         COALESCE(pl.player_count, 0) AS player_count
         FROM projects p
         LEFT JOIN (
           SELECT project_id, count(*) AS league_count FROM leagues GROUP BY project_id
         ) l ON l.project_id = p.id
         LEFT JOIN (
           SELECT project_id, count(*) AS team_count FROM teams GROUP BY project_id
         ) t ON t.project_id = p.id
         LEFT JOIN (
           SELECT project_id, count(*) AS player_count FROM players GROUP BY project_id
         ) pl ON pl.project_id = p.id
         ORDER BY p.reference_date DESC, p.name COLLATE NOCASE ASC`,
      )
      .all() as Row[];
    return rows.map((row) => this.toProjectSummary(row));
  }

  createProject(input: { name: string; referenceDate: string }): ProjectSummary {
    const name = input.name.trim();
    if (!name || name.length > 80 || !isReferenceDate(input.referenceDate)) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Enter a project name and a valid reference date.',
      });
    }
    const now = new Date().toISOString();
    const project: ProjectSummary = {
      id: crypto.randomUUID(),
      name,
      referenceDate: input.referenceDate,
      createdAt: now,
      updatedAt: now,
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    };
    try {
      this.database
        .prepare(
          `INSERT INTO projects(id, name, reference_date, created_at, updated_at)
                VALUES ($id, $name, $referenceDate, $createdAt, $updatedAt)`,
        )
        .run({
          id: project.id,
          name: project.name,
          referenceDate: project.referenceDate,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'A project with this name already exists.',
        });
      }
      throw error;
    }
    return project;
  }

  renameProject(input: { projectId: string; name: string }): ProjectSummary {
    const name = input.name.trim();
    if (!name || name.length > 80) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Enter a project name using at most 80 characters.',
      });
    }
    this.getProjectSummary(input.projectId);
    try {
      this.database
        .prepare(`UPDATE projects SET name = $name, updated_at = $updatedAt WHERE id = $projectId`)
        .run({ projectId: input.projectId, name, updatedAt: new Date().toISOString() });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'A project with this name already exists.',
        });
      }
      throw error;
    }
    return this.getProjectSummary(input.projectId);
  }

  deleteProject(projectId: string): ProjectSummary {
    const project = this.getProjectSummary(projectId);
    this.database.prepare('DELETE FROM projects WHERE id = $projectId').run({ projectId });
    return project;
  }

  deleteTeam(request: { projectId: string; id: string }): ProjectSummary {
    this.getEntity({ ...request, entity: 'teams' });
    return this.transaction(() => {
      const now = new Date().toISOString();
      this.database
        .prepare('DELETE FROM teams WHERE project_id = $projectId AND id = $id')
        .run(request);
      this.touchProject(request.projectId, now);
      return this.getProjectSummary(request.projectId);
    });
  }

  previewSourceDataDeletion(request: DeleteSourceDataRequest): SourceDataDeletionCounts {
    const query = this.prepareSourceDataDeletion(request);
    return this.countSourceDataDeletion(query);
  }

  deleteSourceData(request: DeleteSourceDataRequest): DeleteSourceDataResult {
    const query = this.prepareSourceDataDeletion(request);

    return this.transaction(() => {
      const deleted = this.countSourceDataDeletion(query);
      this.database
        .prepare(
          `DELETE FROM players
           WHERE project_id = $projectId AND source_name IN (${query.sourceFilter})`,
        )
        .run(query.parameters);
      this.database
        .prepare(
          `DELETE FROM teams
           WHERE project_id = $projectId AND source_name IN (${query.sourceFilter})`,
        )
        .run(query.parameters);
      this.database
        .prepare(
          `DELETE FROM leagues
           WHERE project_id = $projectId AND source_name IN (${query.sourceFilter})`,
        )
        .run(query.parameters);
      this.touchProject(request.projectId, new Date().toISOString());
      return {
        project: this.getProjectSummary(request.projectId),
        deleted,
      };
    });
  }

  private prepareSourceDataDeletion(request: DeleteSourceDataRequest): {
    parameters: Record<string, string>;
    sourceFilter: string;
  } {
    if (
      !Array.isArray(request.sourceNames) ||
      request.sourceNames.length === 0 ||
      request.sourceNames.some((sourceName) => !isSourceName(sourceName))
    ) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Choose at least one valid source to delete.',
      });
    }
    this.getProjectSummary(request.projectId);
    const sourceNames = [...new Set(request.sourceNames)];
    const parameters: Record<string, string> = { projectId: request.projectId };
    const placeholders = sourceNames.map((sourceName, index) => {
      const key = `sourceName${index}`;
      parameters[key] = sourceName;
      return `$${key}`;
    });
    return { parameters, sourceFilter: placeholders.join(', ') };
  }

  private countSourceDataDeletion(query: {
    parameters: Record<string, string>;
    sourceFilter: string;
  }): SourceDataDeletionCounts {
    const count = (statement: string): number =>
      Number((this.database.prepare(statement).get(query.parameters) as Row)['count']);
    return {
      leagues: count(
        `SELECT count(*) AS count FROM leagues
         WHERE project_id = $projectId AND source_name IN (${query.sourceFilter})`,
      ),
      teams: count(
        `SELECT count(*) AS count FROM teams
         WHERE project_id = $projectId AND source_name IN (${query.sourceFilter})`,
      ),
      players: count(
        `SELECT count(*) AS count FROM players
         WHERE project_id = $projectId
         AND (
           source_name IN (${query.sourceFilter})
           OR team_id IN (
             SELECT id FROM teams
             WHERE project_id = $projectId AND source_name IN (${query.sourceFilter})
           )
         )`,
      ),
    };
  }

  getProjectSummary(projectId: string): ProjectSummary {
    const row = this.database
      .prepare(
        `SELECT p.*,
        (SELECT count(*) FROM leagues WHERE project_id = p.id) AS league_count,
        (SELECT count(*) FROM teams WHERE project_id = p.id) AS team_count,
        (SELECT count(*) FROM players WHERE project_id = p.id) AS player_count
        FROM projects p WHERE p.id = $projectId`,
      )
      .get({ projectId }) as Row | null;
    if (!row) throw new ApplicationError({ code: 'NOT_FOUND', message: 'Project was not found.' });
    return this.toProjectSummary(row);
  }

  getEntity(request: {
    projectId: string;
    entity: EditableEntityKind;
    id: string;
  }): EditableEntity {
    this.getProjectSummary(request.projectId);
    const row =
      request.entity === 'leagues'
        ? (this.database
            .prepare(
              `SELECT leagues.*,
               (SELECT count(*) FROM teams WHERE teams.league_id = leagues.id) AS team_count
               FROM leagues WHERE leagues.project_id = $projectId AND leagues.id = $id`,
            )
            .get({ projectId: request.projectId, id: request.id }) as Row | null)
        : (this.database
            .prepare(
              `SELECT teams.*,
               (SELECT count(*) FROM players WHERE players.team_id = teams.id) AS player_count
               FROM teams WHERE teams.project_id = $projectId AND teams.id = $id`,
            )
            .get({ projectId: request.projectId, id: request.id }) as Row | null);
    if (!row) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: `${request.entity === 'leagues' ? 'League' : 'Team'} was not found.`,
      });
    }
    return request.entity === 'leagues' ? this.toLeague(row) : this.toTeam(row);
  }

  updateEntityMetadata(request: UpdateEntityMetadataRequest): EditableEntity {
    const name = request.name.trim();
    const current = this.getEntity(request);
    const sourceId = parseSourceIdentifier(
      current.sourceName,
      request.sourceId,
      request.entity === 'leagues' ? 'league' : 'team',
    );
    const season = sourceSupportsSeason[current.sourceName] ? (request.season?.trim() ?? '') : '';
    const country =
      request.entity === 'leagues' && request.countryCode3
        ? findFootballCountryByCode3(request.countryCode3)
        : undefined;
    if (!name || (season && !/^\d{4}$/.test(season))) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Enter a name, a valid Source ID, and an optional four-digit season.',
      });
    }
    if (request.entity === 'leagues' && request.countryCode3 && !country) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Choose a valid country or leave it empty.',
      });
    }
    if (request.entity === 'teams' && request.leagueId) {
      const league = this.getEntity({
        projectId: request.projectId,
        entity: 'leagues',
        id: request.leagueId,
      });
      if (league.sourceName !== current.sourceName) {
        throw new ApplicationError({
          code: 'INVALID_INPUT',
          message: 'A team can only belong to a league from the same provider.',
        });
      }
    }
    try {
      return this.transaction(() => {
        const now = new Date().toISOString();
        if (request.entity === 'leagues') {
          this.database
            .prepare(
              `UPDATE leagues SET name = $name, country_name = $countryName,
               country_code2 = $countryCode2, country_code3 = $countryCode3,
               source_id = $sourceId, season = $season, updated_at = $now
               WHERE project_id = $projectId AND id = $id`,
            )
            .run({
              projectId: request.projectId,
              id: request.id,
              name,
              countryName: country?.name ?? null,
              countryCode2: country?.code2 ?? null,
              countryCode3: country?.code3 ?? null,
              sourceId,
              season,
              now,
            });
        } else {
          this.database
            .prepare(
              `UPDATE teams SET name = $name, source_id = $sourceId, season = $season,
               league_id = $leagueId, updated_at = $now
               WHERE project_id = $projectId AND id = $id`,
            )
            .run({
              projectId: request.projectId,
              id: request.id,
              name,
              sourceId,
              season,
              leagueId: request.leagueId ?? null,
              now,
            });
        }
        this.touchProject(request.projectId, now);
        return this.getEntity(request);
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: `A ${request.entity === 'leagues' ? 'league' : 'team'} with this Source ID and season already exists.`,
        });
      }
      throw error;
    }
  }

  listEntities(request: PageRequest): Page<Entity> {
    if (!['leagues', 'teams', 'players'].includes(request.entity)) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'The requested table is invalid.',
      });
    }
    this.getProjectSummary(request.projectId);
    const pageSize = Math.min(Math.max(request.pageSize, 1), 200);
    const pageIndex = Math.max(request.pageIndex, 0);
    const offset = pageIndex * pageSize;
    const table = request.entity;
    const where = ['project_id = $projectId'];
    const values: Record<string, string | number | null> = { projectId: request.projectId };
    const addInFilter = (
      column: string,
      parameterPrefix: string,
      selectedValues: readonly string[],
    ): void => {
      if (!selectedValues.length) return;
      const parameters = selectedValues.map((value, index) => {
        const key = `${parameterPrefix}${index}`;
        values[key] = value;
        return `$${key}`;
      });
      where.push(`${column} IN (${parameters.join(', ')})`);
    };
    const search = request.search.trim();
    if (search) {
      where.push(
        table === 'leagues'
          ? "(name LIKE $search ESCAPE '\\' OR source_id LIKE $search ESCAPE '\\' OR country_name LIKE $search ESCAPE '\\')"
          : "(name LIKE $search ESCAPE '\\' OR source_id LIKE $search ESCAPE '\\')",
      );
      values['search'] =
        `%${search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    }
    addInFilter(
      'source_name',
      'sourceName',
      uniqueStrings(request.sourceNames ?? []).filter((sourceName): sourceName is SourceName =>
        isSourceName(sourceName),
      ),
    );
    addInFilter('season', 'season', uniqueStrings(request.seasons ?? []));
    const leagueIds = [
      ...new Set(
        [...(request.leagueIds ?? []), request.leagueId ?? '']
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (table === 'teams' && (leagueIds.length || request.includeTeamsWithoutLeague)) {
      const leagueFilters: string[] = [];
      if (leagueIds.length) {
        const parameters = leagueIds.map((leagueId, index) => {
          const key = `leagueId${index}`;
          values[key] = leagueId;
          return `$${key}`;
        });
        leagueFilters.push(`league_id IN (${parameters.join(', ')})`);
      }
      if (request.includeTeamsWithoutLeague) leagueFilters.push('league_id IS NULL');
      where.push(`(${leagueFilters.join(' OR ')})`);
    }
    const teamIds = [
      ...new Set(
        [...(request.teamIds ?? []), request.teamId ?? ''].map((id) => id.trim()).filter(Boolean),
      ),
    ];
    if (table === 'players' && teamIds.length) {
      const parameters = teamIds.map((teamId, index) => {
        const key = `teamId${index}`;
        values[key] = teamId;
        return `$${key}`;
      });
      where.push(`team_id IN (${parameters.join(', ')})`);
    }
    if (table === 'players') {
      addInFilter(
        'country_name COLLATE NOCASE',
        'nationality',
        uniqueStrings(request.nationalities ?? []),
      );
      addInFilter(
        'position',
        'position',
        uniqueStrings(request.positions ?? []).filter((position) =>
          playerPositions.includes(position as (typeof playerPositions)[number]),
        ),
      );
      addInFilter(
        'position_detail',
        'positionDetail',
        uniqueStrings(request.positionDetails ?? []).filter((positionDetail) =>
          playerPositionDetails.includes(positionDetail as (typeof playerPositionDetails)[number]),
        ),
      );
      addInFilter(
        'foot',
        'foot',
        uniqueStrings(request.feet ?? []).filter((foot) =>
          playerFeet.includes(foot as (typeof playerFeet)[number]),
        ),
      );
    }
    const clause = where.join(' AND ');
    const total = Number(
      (
        this.database
          .prepare(`SELECT count(*) AS total FROM ${table} WHERE ${clause}`)
          .get(values) as Row
      )['total'],
    );
    const columns = entitySortColumns[table] as Record<string, string>;
    const sort = columns[request.sort] ?? columns['name'];
    const direction = request.direction === 'desc' ? 'DESC' : 'ASC';
    const select =
      table === 'leagues'
        ? `SELECT leagues.*,
           (SELECT count(*) FROM teams WHERE teams.league_id = leagues.id) AS team_count
           FROM leagues`
        : table === 'teams'
          ? `SELECT teams.*,
             (SELECT count(*) FROM players WHERE players.team_id = teams.id) AS player_count
             FROM teams`
          : 'SELECT * FROM players';
    const rows = this.database
      .prepare(
        `${select} WHERE ${clause}
         ORDER BY ${sort} ${direction}, name COLLATE NOCASE ASC, id ASC LIMIT $pageSize OFFSET $offset`,
      )
      .all({ ...values, pageSize, offset }) as Row[];
    const mapped = rows.map((row) => {
      if (table === 'leagues') return this.toLeague(row);
      if (table === 'teams') return this.toTeam(row);
      return this.toPlayer(row);
    });
    return { rows: mapped, total, pageIndex, pageSize };
  }

  listEntityFilterOptions(request: EntityFilterOptionsRequest): EntityFilterOptions {
    if (!['leagues', 'teams', 'players'].includes(request.entity)) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'The requested table is invalid.',
      });
    }
    this.getProjectSummary(request.projectId);
    if (request.entity === 'leagues') {
      return {
        entity: 'leagues',
        sourceNames: this.listSourceNames('leagues', request.projectId),
        seasons: this.listDistinctText('leagues', 'season', request.projectId),
      };
    }
    if (request.entity === 'teams') {
      const leagues = this.database
        .prepare(
          `SELECT id, source_name, source_id, name FROM leagues WHERE project_id = $projectId
           ORDER BY name COLLATE NOCASE ASC, id ASC`,
        )
        .all({ projectId: request.projectId }) as Row[];
      const withoutLeague = this.database
        .prepare(
          `SELECT EXISTS(
             SELECT 1 FROM teams WHERE project_id = $projectId AND league_id IS NULL
           ) AS present`,
        )
        .get({ projectId: request.projectId }) as Row;
      return {
        entity: 'teams',
        sourceNames: this.listSourceNames('teams', request.projectId),
        leagues: leagues.map((row) => ({
          id: String(row['id']),
          sourceName: String(row['source_name']) as SourceName,
          sourceId: String(row['source_id']),
          name: String(row['name']),
        })),
        hasTeamsWithoutLeague: Boolean(withoutLeague['present']),
        seasons: this.listDistinctText('teams', 'season', request.projectId),
      };
    }
    const teams = this.database
      .prepare(
        `SELECT id, source_name, source_id, name FROM teams WHERE project_id = $projectId
         ORDER BY name COLLATE NOCASE ASC, id ASC`,
      )
      .all({ projectId: request.projectId }) as Row[];
    const presentPositions = new Set(
      this.listDistinctText('players', 'position', request.projectId),
    );
    const presentPositionDetails = new Set(
      this.listDistinctText('players', 'position_detail', request.projectId),
    );
    const presentFeet = new Set(this.listDistinctText('players', 'foot', request.projectId));
    return {
      entity: 'players',
      sourceNames: this.listSourceNames('players', request.projectId),
      teams: teams.map((row) => ({
        id: String(row['id']),
        sourceName: String(row['source_name']) as SourceName,
        sourceId: String(row['source_id']),
        name: String(row['name']),
      })),
      nationalities: this.listNationalityOptions(request.projectId),
      positions: playerPositions.filter((position) => presentPositions.has(position)),
      positionDetails: playerPositionDetails.filter((positionDetail) =>
        presentPositionDetails.has(positionDetail),
      ),
      feet: playerFeet.filter((foot) => presentFeet.has(foot)),
    };
  }

  previewImportChanges(request: CommitImportRequest): ImportPreview {
    this.getProjectSummary(request.projectId);
    this.validateImportRequest(request);
    return {
      changes: this.calculateImportChanges(request),
      conflicts: this.calculateImportConflicts(request),
    };
  }

  commitImport(request: CommitImportRequest): ImportResult {
    this.getProjectSummary(request.projectId);
    this.validateImportRequest(request);
    return this.transaction(() => {
      const now = new Date().toISOString();
      const changes = this.calculateImportChanges(request);
      if (request.operation.kind === 'merge') this.mergeImport(request, now);
      else this.synchronizeImport(request, now);
      this.touchProject(request.projectId, now);
      return {
        leagueCount: request.league ? 1 : 0,
        teamCount: request.teams.length,
        playerCount: request.teams.reduce((total, team) => total + team.players.length, 0),
        changes,
      };
    });
  }

  private validateImportRequest(request: CommitImportRequest): void {
    if (!isSourceName(request.sourceName)) {
      throw new ApplicationError({ code: 'INVALID_INPUT', message: 'Choose a valid source.' });
    }
    if (
      !sourceSupportsSeason[request.sourceName] &&
      (request.league?.season || request.teams.some((team) => Boolean(team.season)))
    ) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: `${sourceLabels[request.sourceName]} imports do not support seasons.`,
      });
    }
    if (request.operation.kind === 'merge') {
      const options: unknown = request.operation.options;
      if (!request.teams.length) {
        throw new ApplicationError({
          code: 'INVALID_INPUT',
          message: 'Select at least one team to import.',
        });
      }
      if (
        !isRecord(options) ||
        !['keep', 'refresh'].includes(String(options['existingRecords'])) ||
        !['keep', 'move'].includes(String(options['teamLeagueConflicts'])) ||
        !['keep', 'move'].includes(String(options['playerTeamConflicts']))
      ) {
        throw new ApplicationError({
          code: 'INVALID_INPUT',
          message: 'The import conflict behavior is invalid.',
        });
      }
    } else {
      const operation = request.operation;
      const target = this.getEntity({ projectId: request.projectId, ...operation.target });
      const options: unknown = operation.options;
      if (isLeagueSynchronization(operation)) {
        if (
          !isRecord(options) ||
          !['keep', 'detach', 'delete'].includes(String(options['absentTeams'])) ||
          !['keep', 'delete'].includes(String(options['absentPlayers'])) ||
          typeof options['overrideTeamNames'] !== 'boolean' ||
          typeof options['overridePlayerNames'] !== 'boolean' ||
          !['keep', 'move'].includes(String(options['teamLeagueConflicts'])) ||
          !['keep', 'move'].includes(String(options['playerTeamConflicts']))
        ) {
          throw new ApplicationError({
            code: 'INVALID_INPUT',
            message: 'The league update behavior is invalid.',
          });
        }
        if (!request.league) {
          throw new ApplicationError({
            code: 'INVALID_INPUT',
            message: 'The synchronized league payload is invalid.',
          });
        }
        this.assertIdentityMatches(
          target,
          request.sourceName,
          request.league.sourceId,
          request.league.season,
        );
      } else {
        if (
          !isRecord(options) ||
          !['keep', 'delete'].includes(String(options['absentPlayers'])) ||
          typeof options['overridePlayerNames'] !== 'boolean' ||
          !['keep', 'move'].includes(String(options['playerTeamConflicts']))
        ) {
          throw new ApplicationError({
            code: 'INVALID_INPUT',
            message: 'The team update behavior is invalid.',
          });
        }
        if (request.league || request.teams.length !== 1) {
          throw new ApplicationError({
            code: 'INVALID_INPUT',
            message: 'A synchronized team update must contain exactly one team.',
          });
        }
        const team = request.teams[0];
        this.assertIdentityMatches(target, request.sourceName, team.sourceId, team.season);
      }
    }
    const teamKeys = new Set<string>();
    const stablePlayerKeys = new Set<string>();
    for (const team of request.teams) {
      const key = teamIdentity(team.sourceId, team.season);
      if (teamKeys.has(key)) {
        throw new ApplicationError({ code: 'INVALID_INPUT', message: 'Duplicate team selected.' });
      }
      teamKeys.add(key);
      const playerKeys = new Set<string>();
      for (const player of team.players) {
        const playerKey = playerIdentity(player);
        if (playerKeys.has(playerKey)) {
          throw new ApplicationError({
            code: 'INVALID_INPUT',
            message: 'Duplicate player selected.',
          });
        }
        playerKeys.add(playerKey);
        if (isStablePlayerIdentity(player)) {
          if (stablePlayerKeys.has(player.sourceId)) {
            throw new ApplicationError({
              code: 'INVALID_INPUT',
              message: `The same ${sourceLabels[request.sourceName]} player is selected for multiple teams. Deselect one occurrence.`,
            });
          }
          stablePlayerKeys.add(player.sourceId);
        }
      }
    }
  }

  private assertIdentityMatches(
    target: EditableEntity,
    sourceName: SourceName,
    sourceId: string,
    season: string | undefined,
  ): void {
    if (
      target.sourceName !== sourceName ||
      teamIdentity(target.sourceId, target.season) !== teamIdentity(sourceId, season)
    ) {
      throw new ApplicationError({
        code: 'CONFLICT',
        message: 'The selected record changed. Reload it before synchronizing.',
      });
    }
  }

  private calculateImportChanges(request: CommitImportRequest): ImportChangeSummary {
    const changes = emptyChanges();
    if (request.operation.kind === 'merge') {
      const refresh = request.operation.options.existingRecords === 'refresh';
      if (request.league) {
        const existingLeague = this.findEntityByIdentity(
          'leagues',
          request.projectId,
          request.sourceName,
          request.league.sourceId,
          request.league.season,
        );
        changes.leagues[existingLeague ? (refresh ? 'updated' : 'preserved') : 'added'] += 1;
      }
      const incomingLeague = request.league
        ? this.findEntityByIdentity(
            'leagues',
            request.projectId,
            request.sourceName,
            request.league.sourceId,
            request.league.season,
          )
        : undefined;
      for (const team of request.teams) {
        const existingTeam = this.findEntityByIdentity(
          'teams',
          request.projectId,
          request.sourceName,
          team.sourceId,
          team.season,
        );
        changes.teams[existingTeam ? (refresh ? 'updated' : 'preserved') : 'added'] += 1;
        if (
          request.league &&
          existingTeam?.['league_id'] &&
          existingTeam['league_id'] !== incomingLeague?.['id'] &&
          request.operation.options.teamLeagueConflicts === 'move'
        ) {
          changes.teams.moved += 1;
        }
        this.calculatePlayerChanges(
          changes,
          request.projectId,
          request.sourceName,
          existingTeam,
          team.players,
          'keep',
          refresh,
          request.operation.options.playerTeamConflicts,
        );
      }
      return changes;
    }

    const operation = request.operation;
    const { entity, id } = operation.target;
    if (entity === 'teams') {
      changes.teams.updated = 1;
      const targetRow = this.getEntityRow('teams', request.projectId, id);
      this.calculatePlayerChanges(
        changes,
        request.projectId,
        request.sourceName,
        targetRow,
        request.teams[0]?.players ?? [],
        operation.options.absentPlayers,
        true,
        operation.options.playerTeamConflicts,
      );
      return changes;
    }

    if (!isLeagueSynchronization(operation)) return changes;
    changes.leagues.updated = 1;
    const existingTargetTeams = this.getTeamRowsForLeague(
      request.projectId,
      id,
      request.sourceName,
    );
    const selectedTeamKeys = new Set(
      request.teams.map((team) => teamIdentity(team.sourceId, team.season)),
    );
    for (const team of request.teams) {
      const existingTeam = this.findEntityByIdentity(
        'teams',
        request.projectId,
        request.sourceName,
        team.sourceId,
        team.season,
      );
      changes.teams[existingTeam ? 'updated' : 'added'] += 1;
      if (
        existingTeam?.['league_id'] &&
        existingTeam['league_id'] !== id &&
        operation.options.teamLeagueConflicts === 'move'
      ) {
        changes.teams.moved += 1;
      }
      this.calculatePlayerChanges(
        changes,
        request.projectId,
        request.sourceName,
        existingTeam,
        team.players,
        operation.options.absentPlayers,
        true,
        operation.options.playerTeamConflicts,
      );
    }
    for (const teamRow of existingTargetTeams) {
      const key = teamIdentity(String(teamRow['source_id']), optionalString(teamRow['season']));
      if (selectedTeamKeys.has(key)) continue;
      if (operation.options.absentTeams === 'delete') {
        changes.teams.deleted += 1;
        changes.players.deleted += this.getPlayerRows(String(teamRow['id'])).length;
      } else if (operation.options.absentTeams === 'detach') {
        changes.teams.detached += 1;
      }
    }
    return changes;
  }

  private calculatePlayerChanges(
    changes: ImportChangeSummary,
    projectId: string,
    sourceName: SourceName,
    existingTeam: Row | undefined,
    players: PlayerInput[],
    absentPlayers: 'keep' | 'delete',
    refreshExisting: boolean,
    ownershipPolicy: 'keep' | 'move',
  ): void {
    const existingPlayers = existingTeam
      ? this.getPlayerRows(String(existingTeam['id']), sourceName)
      : ([] as Row[]);
    const selectedKeys = new Set<string>();
    for (const player of players) {
      const key = playerIdentity(player);
      selectedKeys.add(key);
      const rows = this.getPlayerRowsByIdentity(projectId, sourceName, existingTeam, player);
      if (!rows.length) {
        changes.players.added += 1;
        continue;
      }
      const canonical = rows[0];
      const isDifferentTeam = canonical['team_id'] !== existingTeam?.['id'];
      const forcedMove = rows.length > 1;
      if (isDifferentTeam && ownershipPolicy === 'keep' && !forcedMove) {
        changes.players.preserved += 1;
        continue;
      }
      changes.players[refreshExisting ? 'updated' : 'preserved'] += 1;
      if (isDifferentTeam && (ownershipPolicy === 'move' || forcedMove)) {
        changes.players.moved += 1;
      }
      changes.players.deduplicated += Math.max(0, rows.length - 1);
    }
    if (absentPlayers === 'delete') {
      changes.players.deleted += existingPlayers.filter(
        (row) => !selectedKeys.has(String(row['source_id'])),
      ).length;
    }
  }

  private calculateImportConflicts(request: CommitImportRequest): ImportConflictSummary {
    const conflicts = emptyConflicts();
    const incomingLeague = request.league
      ? this.findEntityByIdentity(
          'leagues',
          request.projectId,
          request.sourceName,
          request.league.sourceId,
          request.league.season,
        )
      : undefined;
    if (request.league && incomingLeague) {
      conflicts.existingRecords.push({
        entity: 'leagues',
        sourceName: request.sourceName,
        sourceId: request.league.sourceId,
        ...(request.league.season && { season: request.league.season }),
        storedName: String(incomingLeague['name']),
        incomingName: request.league.name,
      });
    }
    for (const team of request.teams) {
      const existingTeam = this.findEntityByIdentity(
        'teams',
        request.projectId,
        request.sourceName,
        team.sourceId,
        team.season,
      );
      if (existingTeam) {
        conflicts.existingRecords.push({
          entity: 'teams',
          sourceName: request.sourceName,
          sourceId: team.sourceId,
          ...(team.season && { season: team.season }),
          storedName: String(existingTeam['name']),
          incomingName: team.name,
        });
      }
      if (
        request.league &&
        existingTeam?.['league_id'] &&
        existingTeam['league_id'] !== incomingLeague?.['id']
      ) {
        conflicts.teamLeagueConflicts.push({
          entity: 'teams',
          sourceName: request.sourceName,
          sourceId: team.sourceId,
          name: team.name,
          currentParents: [this.getLeagueName(String(existingTeam['league_id']))],
          incomingParent: request.league.name,
          legacyCopyCount: 1,
        });
      }
      for (const player of team.players) {
        const rows = this.getPlayerRowsByIdentity(
          request.projectId,
          request.sourceName,
          existingTeam,
          player,
        );
        if (!rows.length) continue;
        const canonical = rows[0];
        conflicts.existingRecords.push({
          entity: 'players',
          sourceName: request.sourceName,
          sourceId: playerIdentity(player),
          storedName: String(canonical['name']),
          incomingName: player.name,
        });
        const currentTeamIds = uniqueStrings(rows.map((row) => String(row['team_id'])));
        const differentTeam =
          !existingTeam || currentTeamIds.some((id) => id !== existingTeam['id']);
        if (differentTeam) {
          conflicts.playerTeamConflicts.push({
            entity: 'players',
            sourceName: request.sourceName,
            sourceId: playerIdentity(player),
            name: player.name,
            currentParents: currentTeamIds.map((id) => this.getTeamName(id)),
            incomingParent: team.name,
            legacyCopyCount: rows.length,
          });
        }
      }
    }
    return conflicts;
  }

  private mergeImport(request: CommitImportRequest, now: string): void {
    if (request.operation.kind !== 'merge') return;
    const refresh = request.operation.options.existingRecords === 'refresh';
    let leagueId: string | undefined;
    if (request.league) {
      leagueId = this.upsertLeague(
        request.projectId,
        request.sourceName,
        request.league,
        now,
        refresh,
      );
    }
    for (const team of request.teams) {
      const existingTeam = this.findEntityByIdentity(
        'teams',
        request.projectId,
        request.sourceName,
        team.sourceId,
        team.season,
      );
      const hasLeagueConflict = Boolean(
        leagueId && existingTeam?.['league_id'] && existingTeam['league_id'] !== leagueId,
      );
      const applyLeague = Boolean(
        leagueId &&
        (!existingTeam ||
          (!existingTeam['league_id'] && existingTeam['league_id'] !== leagueId) ||
          (hasLeagueConflict && request.operation.options.teamLeagueConflicts === 'move')),
      );
      const teamId = this.upsertTeam(
        request.projectId,
        request.sourceName,
        leagueId,
        team,
        now,
        refresh,
        refresh,
        applyLeague,
      );
      for (const player of team.players) {
        this.importPlayer(
          request.projectId,
          request.sourceName,
          teamId,
          player,
          now,
          refresh,
          true,
          request.operation.options.playerTeamConflicts,
        );
      }
    }
  }

  private synchronizeImport(request: CommitImportRequest, now: string): void {
    if (request.operation.kind !== 'synchronize') return;
    const operation = request.operation;
    const { entity, id } = operation.target;
    if (entity === 'teams') {
      const team = request.teams[0];
      this.updateTeamFromImport(request.projectId, id, team, now);
      this.synchronizePlayers(
        request.projectId,
        request.sourceName,
        id,
        team.players,
        now,
        operation.options.absentPlayers,
        operation.options.overridePlayerNames,
        operation.options.playerTeamConflicts,
      );
      return;
    }

    if (!isLeagueSynchronization(operation)) return;
    const league = request.league;
    if (!league) return;
    this.updateLeagueFromImport(request.projectId, id, league, now);
    const selectedTeamKeys = new Set(
      request.teams.map((team) => teamIdentity(team.sourceId, team.season)),
    );
    const existingTargetTeams = this.getTeamRowsForLeague(
      request.projectId,
      id,
      request.sourceName,
    );
    for (const team of request.teams) {
      const existingTeam = this.findEntityByIdentity(
        'teams',
        request.projectId,
        request.sourceName,
        team.sourceId,
        team.season,
      );
      const hasLeagueConflict = Boolean(
        existingTeam?.['league_id'] && existingTeam['league_id'] !== id,
      );
      const teamId = this.upsertTeam(
        request.projectId,
        request.sourceName,
        id,
        team,
        now,
        operation.options.overrideTeamNames,
        true,
        !hasLeagueConflict || operation.options.teamLeagueConflicts === 'move',
      );
      this.synchronizePlayers(
        request.projectId,
        request.sourceName,
        teamId,
        team.players,
        now,
        operation.options.absentPlayers,
        operation.options.overridePlayerNames,
        operation.options.playerTeamConflicts,
      );
    }
    for (const teamRow of existingTargetTeams) {
      const key = teamIdentity(String(teamRow['source_id']), optionalString(teamRow['season']));
      if (selectedTeamKeys.has(key)) continue;
      if (operation.options.absentTeams === 'delete') {
        this.database.prepare('DELETE FROM teams WHERE id = $id').run({ id: teamRow['id'] });
      } else if (operation.options.absentTeams === 'detach') {
        this.database
          .prepare(
            `UPDATE teams SET league_id = NULL, updated_at = $now
             WHERE project_id = $projectId AND league_id = $leagueId AND id = $id`,
          )
          .run({ projectId: request.projectId, leagueId: id, id: teamRow['id'], now });
      }
    }
  }

  private synchronizePlayers(
    projectId: string,
    sourceName: SourceName,
    teamId: string,
    players: PlayerInput[],
    now: string,
    absentPlayers: 'keep' | 'delete',
    overridePlayerNames: boolean,
    ownershipPolicy: 'keep' | 'move',
  ): void {
    const selectedKeys = new Set(players.map(playerIdentity));
    for (const player of players) {
      this.importPlayer(
        projectId,
        sourceName,
        teamId,
        player,
        now,
        true,
        overridePlayerNames,
        ownershipPolicy,
      );
    }
    if (absentPlayers === 'keep') return;
    for (const row of this.getPlayerRows(teamId, sourceName)) {
      if (!selectedKeys.has(String(row['source_id']))) {
        this.database.prepare('DELETE FROM players WHERE id = $id').run({ id: row['id'] });
      }
    }
  }

  private updateLeagueFromImport(
    projectId: string,
    id: string,
    _league: NonNullable<CommitImportRequest['league']>,
    now: string,
  ): void {
    this.database
      .prepare('UPDATE leagues SET updated_at = $now WHERE project_id = $projectId AND id = $id')
      .run({ projectId, id, now });
  }

  private updateTeamFromImport(
    projectId: string,
    id: string,
    _team: ImportTeam,
    now: string,
  ): void {
    this.database
      .prepare('UPDATE teams SET updated_at = $now WHERE project_id = $projectId AND id = $id')
      .run({ projectId, id, now });
  }

  private findEntityByIdentity(
    entity: EditableEntityKind,
    projectId: string,
    sourceName: SourceName,
    sourceId: string,
    season: string | undefined,
  ): Row | undefined {
    return this.database
      .prepare(
        `SELECT * FROM ${entity} WHERE project_id = $projectId AND source_name = $sourceName
         AND source_id = $sourceId AND season = $season`,
      )
      .get({ projectId, sourceName, sourceId, season: season ?? '' }) as Row | undefined;
  }

  private getEntityRow(entity: EditableEntityKind, projectId: string, id: string): Row {
    const row = this.database
      .prepare(`SELECT * FROM ${entity} WHERE project_id = $projectId AND id = $id`)
      .get({ projectId, id }) as Row | undefined;
    if (!row) throw new ApplicationError({ code: 'NOT_FOUND', message: 'Record was not found.' });
    return row;
  }

  private getTeamRowsForLeague(
    projectId: string,
    leagueId: string,
    sourceName?: SourceName,
  ): Row[] {
    return this.database
      .prepare(
        `SELECT * FROM teams WHERE project_id = $projectId AND league_id = $leagueId
         AND ($sourceName IS NULL OR source_name = $sourceName)`,
      )
      .all({ projectId, leagueId, sourceName: sourceName ?? null }) as Row[];
  }

  private getPlayerRows(teamId: string, sourceName?: SourceName): Row[] {
    return this.database
      .prepare(
        `SELECT * FROM players WHERE team_id = $teamId
         AND ($sourceName IS NULL OR source_name = $sourceName)`,
      )
      .all({ teamId, sourceName: sourceName ?? null }) as Row[];
  }

  private getPlayerRowsByIdentity(
    projectId: string,
    sourceName: SourceName,
    team: Row | undefined,
    player: PlayerInput,
  ): Row[] {
    if (!isStablePlayerIdentity(player)) {
      if (!team) return [];
      return this.database
        .prepare(
          `SELECT * FROM players WHERE project_id = $projectId AND team_id = $teamId
           AND source_name = $sourceName AND source_id = $sourceId
           ORDER BY updated_at DESC, id DESC`,
        )
        .all({
          projectId,
          sourceName,
          teamId: team['id'],
          sourceId: playerIdentity(player),
        }) as Row[];
    }
    return this.database
      .prepare(
        `SELECT * FROM players WHERE project_id = $projectId AND source_name = $sourceName
         AND source_id = $sourceId ORDER BY updated_at DESC, id DESC`,
      )
      .all({ projectId, sourceName, sourceId: player.sourceId }) as Row[];
  }

  private getLeagueName(id: string): string {
    const row = this.database.prepare('SELECT name FROM leagues WHERE id = $id').get({ id }) as
      Row | undefined;
    return row ? String(row['name']) : 'Unknown league';
  }

  private getTeamName(id: string): string {
    const row = this.database.prepare('SELECT name FROM teams WHERE id = $id').get({ id }) as
      Row | undefined;
    return row ? String(row['name']) : 'Unknown team';
  }

  private touchProject(projectId: string, updatedAt: string): void {
    this.database
      .prepare('UPDATE projects SET updated_at = $updatedAt WHERE id = $projectId')
      .run({ projectId, updatedAt });
  }

  private transaction<T>(operation: () => T): T {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  exportRows(projectId: string): { leagues: League[]; teams: Team[]; players: Player[] } {
    this.getProjectSummary(projectId);
    const collect = (entity: PageRequest['entity']): Entity[] => {
      const rows: Entity[] = [];
      let pageIndex = 0;
      let total = 1;
      while (rows.length < total) {
        const page = this.listEntities({
          projectId,
          entity,
          pageIndex,
          pageSize: 200,
          search: '',
          sort: 'name',
          direction: 'asc',
        });
        rows.push(...page.rows);
        total = page.total;
        pageIndex += 1;
      }
      return rows;
    };
    return {
      leagues: collect('leagues') as League[],
      teams: collect('teams') as Team[],
      players: collect('players') as Player[],
    };
  }

  private upsertLeague(
    projectId: string,
    sourceName: SourceName,
    league: NonNullable<CommitImportRequest['league']>,
    now: string,
    refresh: boolean,
  ): string {
    const id = crypto.randomUUID();
    this.database
      .prepare(
        `INSERT INTO leagues(
          id, project_id, source_name, source_id, name, season, created_at, updated_at
        )
        VALUES ($id, $projectId, $sourceName, $sourceId, $name, $season, $now, $now)
        ON CONFLICT(project_id, source_name, source_id, season) DO UPDATE SET
          name = CASE WHEN $refresh = 1 THEN excluded.name ELSE leagues.name END,
          updated_at = CASE WHEN $refresh = 1 THEN excluded.updated_at ELSE leagues.updated_at END`,
      )
      .run({
        id,
        projectId,
        sourceName,
        sourceId: league.sourceId,
        name: league.name,
        season: league.season ?? '',
        refresh: refresh ? 1 : 0,
        now,
      });
    return String(
      (
        this.database
          .prepare(
            `SELECT id FROM leagues WHERE project_id = $projectId AND source_name = $sourceName
          AND source_id = $sourceId AND season = $season`,
          )
          .get({
            projectId,
            sourceName,
            sourceId: league.sourceId,
            season: league.season ?? '',
          }) as Row
      )['id'],
    );
  }

  private upsertTeam(
    projectId: string,
    sourceName: SourceName,
    leagueId: string | undefined,
    team: CommitImportRequest['teams'][number],
    now: string,
    overrideName: boolean,
    refreshSource: boolean,
    applyLeague: boolean,
  ): string {
    const id = crypto.randomUUID();
    this.database
      .prepare(
        `INSERT INTO teams(
          id, project_id, league_id, source_name, source_id, name, season, created_at, updated_at
        )
        VALUES ($id, $projectId, $leagueId, $sourceName, $sourceId, $name, $season, $now, $now)
        ON CONFLICT(project_id, source_name, source_id, season) DO UPDATE SET
          league_id = CASE WHEN $applyLeague = 1 THEN excluded.league_id ELSE teams.league_id END,
          name = CASE WHEN $overrideName = 1 THEN excluded.name ELSE teams.name END,
          updated_at = CASE
            WHEN $applyLeague = 1 OR $overrideName = 1 OR $refreshSource = 1
            THEN excluded.updated_at ELSE teams.updated_at END`,
      )
      .run({
        id,
        projectId,
        sourceName,
        leagueId: leagueId ?? null,
        sourceId: team.sourceId,
        name: team.name,
        season: team.season ?? '',
        overrideName: overrideName ? 1 : 0,
        refreshSource: refreshSource ? 1 : 0,
        applyLeague: applyLeague ? 1 : 0,
        now,
      });
    return String(
      (
        this.database
          .prepare(
            `SELECT id FROM teams WHERE project_id = $projectId AND source_name = $sourceName
          AND source_id = $sourceId AND season = $season`,
          )
          .get({
            projectId,
            sourceName,
            sourceId: team.sourceId,
            season: team.season ?? '',
          }) as Row
      )['id'],
    );
  }

  private upsertPlayer(
    projectId: string,
    sourceName: SourceName,
    teamId: string,
    player: PlayerInput,
    now: string,
    overrideNames: boolean,
  ): void {
    const sourceId = player.sourceId ?? `name:${player.name.trim().toLocaleLowerCase('en')}`;
    this.database
      .prepare(
        `INSERT INTO players(
        id, project_id, team_id, source_name, source_id, name, first_name, last_name, jersey_number,
        position, position_detail, birthdate, height, weight, foot, joined, contract_expires, market_value,
        country_name, country_code2, country_code3, minutes_played, created_at, updated_at
      ) VALUES (
        $id, $projectId, $teamId, $sourceName, $sourceId, $name, $firstName, $lastName,
        $jerseyNumber, $position, $positionDetail, $birthdate, $height, $weight, $foot, $joined, $contractExpires,
        $marketValue, $countryName, $countryCode2, $countryCode3, $minutesPlayed, $now, $now
      ) ON CONFLICT(project_id, team_id, source_name, source_id) DO UPDATE SET
        name = CASE WHEN $overrideNames = 1 THEN excluded.name ELSE players.name END,
        first_name = CASE
          WHEN $overrideNames = 1 THEN excluded.first_name ELSE players.first_name END,
        last_name = CASE
          WHEN $overrideNames = 1 THEN excluded.last_name ELSE players.last_name END,
        jersey_number = excluded.jersey_number, position = excluded.position,
        position_detail = excluded.position_detail, birthdate = excluded.birthdate,
        height = excluded.height, weight = excluded.weight, foot = excluded.foot, joined = excluded.joined,
        contract_expires = excluded.contract_expires, market_value = excluded.market_value,
        country_name = excluded.country_name, country_code2 = excluded.country_code2,
        country_code3 = excluded.country_code3, minutes_played = excluded.minutes_played,
        updated_at = excluded.updated_at`,
      )
      .run({
        id: crypto.randomUUID(),
        projectId,
        sourceName,
        teamId,
        sourceId,
        name: player.name.trim(),
        firstName: player.firstName ?? null,
        lastName: player.lastName ?? null,
        jerseyNumber: player.jerseyNumber ?? null,
        position: player.position ?? null,
        positionDetail: player.positionDetail ?? null,
        birthdate: player.birthdate ?? null,
        height: player.height ?? null,
        weight: player.weight ?? null,
        foot: player.foot ?? null,
        joined: player.joined ?? null,
        contractExpires: player.contractExpires ?? null,
        marketValue: player.marketValue ?? null,
        countryName: player.countryName ?? null,
        countryCode2: player.countryCode2 ?? null,
        countryCode3: player.countryCode3 ?? null,
        minutesPlayed: player.minutesPlayed ?? null,
        overrideNames: overrideNames ? 1 : 0,
        now,
      });
  }

  private importPlayer(
    projectId: string,
    sourceName: SourceName,
    teamId: string,
    player: PlayerInput,
    now: string,
    refreshData: boolean,
    overrideNames: boolean,
    ownershipPolicy: 'keep' | 'move',
  ): void {
    const team = this.getEntityRow('teams', projectId, teamId);
    const rows = this.getPlayerRowsByIdentity(projectId, sourceName, team, player);
    if (!rows.length) {
      this.upsertPlayer(projectId, sourceName, teamId, player, now, true);
      return;
    }
    if (!isStablePlayerIdentity(player)) {
      if (refreshData) this.upsertPlayer(projectId, sourceName, teamId, player, now, overrideNames);
      return;
    }
    const canonical = rows[0];
    const legacyCopies = rows.length > 1;
    const differentTeam = canonical['team_id'] !== teamId;
    if (differentTeam && ownershipPolicy === 'keep' && !legacyCopies) return;

    for (const row of rows.slice(1)) {
      this.database.prepare('DELETE FROM players WHERE id = $id').run({ id: row['id'] });
    }
    const move = differentTeam && (ownershipPolicy === 'move' || legacyCopies);
    if (refreshData) {
      this.updatePlayerFromImport(
        String(canonical['id']),
        move ? teamId : String(canonical['team_id']),
        player,
        now,
        overrideNames,
      );
    } else if (move || legacyCopies) {
      this.database
        .prepare('UPDATE players SET team_id = $teamId, updated_at = $now WHERE id = $id')
        .run({ id: canonical['id'], teamId: move ? teamId : canonical['team_id'], now });
    }
  }

  private updatePlayerFromImport(
    id: string,
    teamId: string,
    player: PlayerInput,
    now: string,
    overrideNames: boolean,
  ): void {
    this.database
      .prepare(
        `UPDATE players SET
          team_id = $teamId,
          name = CASE WHEN $overrideNames = 1 THEN $name ELSE name END,
          first_name = CASE WHEN $overrideNames = 1 THEN $firstName ELSE first_name END,
          last_name = CASE WHEN $overrideNames = 1 THEN $lastName ELSE last_name END,
          jersey_number = $jerseyNumber, position = $position,
          position_detail = $positionDetail, birthdate = $birthdate,
          height = $height, weight = $weight, foot = $foot, joined = $joined,
          contract_expires = $contractExpires, market_value = $marketValue,
          country_name = $countryName, country_code2 = $countryCode2,
          country_code3 = $countryCode3, minutes_played = $minutesPlayed, updated_at = $now
         WHERE id = $id`,
      )
      .run({
        id,
        teamId,
        name: player.name.trim(),
        firstName: player.firstName ?? null,
        lastName: player.lastName ?? null,
        jerseyNumber: player.jerseyNumber ?? null,
        position: player.position ?? null,
        positionDetail: player.positionDetail ?? null,
        birthdate: player.birthdate ?? null,
        height: player.height ?? null,
        weight: player.weight ?? null,
        foot: player.foot ?? null,
        joined: player.joined ?? null,
        contractExpires: player.contractExpires ?? null,
        marketValue: player.marketValue ?? null,
        countryName: player.countryName ?? null,
        countryCode2: player.countryCode2 ?? null,
        countryCode3: player.countryCode3 ?? null,
        minutesPlayed: player.minutesPlayed ?? null,
        overrideNames: overrideNames ? 1 : 0,
        now,
      });
  }

  private toProject(row: Row): Project {
    return {
      id: String(row['id']),
      name: String(row['name']),
      referenceDate: String(row['reference_date']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private toProjectSummary(row: Row): ProjectSummary {
    return {
      ...this.toProject(row),
      leagueCount: Number(row['league_count']),
      teamCount: Number(row['team_count']),
      playerCount: Number(row['player_count']),
    };
  }

  private toLeague(row: Row): League {
    const sourceName = String(row['source_name']) as SourceName;
    const sourceId = String(row['source_id']);
    const season = optionalString(row['season']);
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      sourceName,
      sourceId,
      name: String(row['name']),
      countryName: optionalString(row['country_name']),
      countryCode2: optionalString(row['country_code2']),
      countryCode3: optionalString(row['country_code3']),
      season,
      sourceUrl: buildSourceUrl(sourceName, 'leagues', sourceId, season) ?? '',
      teamCount: optionalNumber(row['team_count']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private toTeam(row: Row): Team {
    const sourceName = String(row['source_name']) as SourceName;
    const sourceId = String(row['source_id']);
    const season = optionalString(row['season']);
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      leagueId: optionalString(row['league_id']),
      sourceName,
      sourceId,
      name: String(row['name']),
      season,
      sourceUrl: buildSourceUrl(sourceName, 'teams', sourceId, season) ?? '',
      playerCount: optionalNumber(row['player_count']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private toPlayer(row: Row): Player {
    const sourceName = String(row['source_name']) as SourceName;
    const sourceId = String(row['source_id']);
    const sourceUrl = buildSourceUrl(sourceName, 'players', sourceId);
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      teamId: String(row['team_id']),
      sourceName,
      sourceId,
      ...(sourceUrl && { sourceUrl }),
      name: String(row['name']),
      firstName: optionalString(row['first_name']),
      lastName: optionalString(row['last_name']),
      jerseyNumber: optionalNumber(row['jersey_number']),
      position: optionalString(row['position']) as Player['position'],
      positionDetail: optionalString(row['position_detail']) as Player['positionDetail'],
      birthdate: optionalString(row['birthdate']),
      height: optionalNumber(row['height']),
      weight: optionalNumber(row['weight']),
      foot: optionalString(row['foot']) as Player['foot'],
      joined: optionalString(row['joined']),
      contractExpires: optionalString(row['contract_expires']),
      marketValue: optionalNumber(row['market_value']),
      countryName: optionalString(row['country_name']),
      countryCode2: optionalString(row['country_code2']),
      countryCode3: optionalString(row['country_code3']),
      minutesPlayed: optionalNumber(row['minutes_played']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private listDistinctText(table: string, column: string, projectId: string): string[] {
    const rows = this.database
      .prepare(
        `SELECT DISTINCT ${column} AS value FROM ${table}
         WHERE project_id = $projectId AND ${column} IS NOT NULL AND trim(${column}) != ''
         ORDER BY value COLLATE NOCASE ASC`,
      )
      .all({ projectId }) as Row[];
    return rows.map((row) => String(row['value']));
  }

  private listSourceNames(table: string, projectId: string): SourceName[] {
    return this.listDistinctText(table, 'source_name', projectId).filter(isSourceName);
  }

  private listNationalityOptions(projectId: string): NationalityFilterOption[] {
    const rows = this.database
      .prepare(
        `SELECT country_name AS name, country_code2 AS code FROM players
         WHERE project_id = $projectId
           AND country_name IS NOT NULL
           AND trim(country_name) != ''
         ORDER BY name COLLATE NOCASE ASC, code COLLATE NOCASE ASC`,
      )
      .all({ projectId }) as Row[];
    const options = new Map<string, NationalityFilterOption>();
    for (const row of rows) {
      const name = String(row['name']);
      const code = optionalString(row['code']);
      const key = name.toLocaleLowerCase('en');
      const existing = options.get(key);
      if (!existing || (!existing.code && code)) options.set(key, { name, ...(code && { code }) });
    }
    return [...options.values()];
  }
}
