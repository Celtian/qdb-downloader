import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  CommitImportRequest,
  Entity,
  ImportResult,
  League,
  Page,
  PageRequest,
  Player,
  PlayerInput,
  Project,
  ProjectSummary,
  Team,
} from '../shared/contracts.js';
import { isReferenceDate } from '../shared/reference-date.js';
import { ApplicationError } from './errors.js';

type Row = Record<string, string | number | null>;

const entitySortColumns = {
  leagues: { name: 'name', externalId: 'external_id', season: 'season', updatedAt: 'updated_at' },
  teams: { name: 'name', externalId: 'external_id', season: 'season', updatedAt: 'updated_at' },
  players: {
    name: 'name',
    jerseyNumber: 'jersey_number',
    position: 'position',
    marketValue: 'market_value',
    updatedAt: 'updated_at',
  },
} as const;

const optionalString = (value: string | number | null): string | undefined =>
  value === null || String(value) === '' ? undefined : String(value);
const optionalNumber = (value: string | number | null): number | undefined =>
  value === null ? undefined : Number(value);

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
    const version = Number(
      (
        this.database
          .prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations')
          .get() as Row
      )['version'],
    );
    if (version >= 1) return;
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
        .prepare('INSERT INTO schema_migrations(version, applied_at) VALUES ($version, $appliedAt)')
        .run({ version: 1, appliedAt: new Date().toISOString() });
    });
  }

  listProjects(): Project[] {
    const rows = this.database
      .prepare('SELECT * FROM projects ORDER BY reference_date DESC, name COLLATE NOCASE ASC')
      .all() as Row[];
    return rows.map((row) => this.toProject(row));
  }

  createProject(input: { name: string; referenceDate: string }): Project {
    const name = input.name.trim();
    if (!name || name.length > 80 || !isReferenceDate(input.referenceDate)) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Enter a project name and a valid reference date.',
      });
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      referenceDate: input.referenceDate,
      createdAt: now,
      updatedAt: now,
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
    return {
      ...this.toProject(row),
      leagueCount: Number(row['league_count']),
      teamCount: Number(row['team_count']),
      playerCount: Number(row['player_count']),
    };
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
    const search = request.search.trim();
    if (search) {
      where.push("(name LIKE $search ESCAPE '\\' OR external_id LIKE $search ESCAPE '\\')");
      values['search'] =
        `%${search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    }
    if (table === 'teams' && request.leagueId) {
      where.push('league_id = $leagueId');
      values['leagueId'] = request.leagueId;
    }
    if (table === 'players' && request.teamId) {
      where.push('team_id = $teamId');
      values['teamId'] = request.teamId;
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
    const rows = this.database
      .prepare(
        `SELECT * FROM ${table} WHERE ${clause}
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

  commitImport(request: CommitImportRequest): ImportResult {
    this.getProjectSummary(request.projectId);
    if (!request.teams.length) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Select at least one team to import.',
      });
    }
    return this.transaction(() => {
      const now = new Date().toISOString();
      let leagueId: string | undefined;
      if (request.league) {
        leagueId = this.upsertLeague(request.projectId, request.league, now);
      }
      let playerCount = 0;
      for (const team of request.teams) {
        const teamId = this.upsertTeam(request.projectId, leagueId, team, now);
        for (const player of team.players) {
          this.upsertPlayer(request.projectId, teamId, player, now);
          playerCount += 1;
        }
      }
      this.database
        .prepare('UPDATE projects SET updated_at = $updatedAt WHERE id = $projectId')
        .run({ projectId: request.projectId, updatedAt: now });
      return { leagueCount: request.league ? 1 : 0, teamCount: request.teams.length, playerCount };
    });
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
    league: NonNullable<CommitImportRequest['league']>,
    now: string,
  ): string {
    const id = crypto.randomUUID();
    this.database
      .prepare(
        `INSERT INTO leagues(id, project_id, source, external_id, name, season, source_url, created_at, updated_at)
        VALUES ($id, $projectId, 'transfermarkt', $externalId, $name, $season, $sourceUrl, $now, $now)
        ON CONFLICT(project_id, source, external_id, season) DO UPDATE SET
          name = excluded.name, source_url = excluded.source_url, updated_at = excluded.updated_at`,
      )
      .run({ id, projectId, ...league, season: league.season ?? '', now });
    return String(
      (
        this.database
          .prepare(
            `SELECT id FROM leagues WHERE project_id = $projectId AND source = 'transfermarkt'
          AND external_id = $externalId AND season = $season`,
          )
          .get({ projectId, externalId: league.externalId, season: league.season ?? '' }) as Row
      )['id'],
    );
  }

  private upsertTeam(
    projectId: string,
    leagueId: string | undefined,
    team: CommitImportRequest['teams'][number],
    now: string,
  ): string {
    const id = crypto.randomUUID();
    this.database
      .prepare(
        `INSERT INTO teams(id, project_id, league_id, source, external_id, name, season, source_url, created_at, updated_at)
        VALUES ($id, $projectId, $leagueId, 'transfermarkt', $externalId, $name, $season, $sourceUrl, $now, $now)
        ON CONFLICT(project_id, source, external_id, season) DO UPDATE SET
          league_id = COALESCE(excluded.league_id, teams.league_id), name = excluded.name,
          source_url = excluded.source_url, updated_at = excluded.updated_at`,
      )
      .run({
        id,
        projectId,
        leagueId: leagueId ?? null,
        externalId: team.externalId,
        name: team.name,
        season: team.season ?? '',
        sourceUrl: team.sourceUrl,
        now,
      });
    return String(
      (
        this.database
          .prepare(
            `SELECT id FROM teams WHERE project_id = $projectId AND source = 'transfermarkt'
          AND external_id = $externalId AND season = $season`,
          )
          .get({ projectId, externalId: team.externalId, season: team.season ?? '' }) as Row
      )['id'],
    );
  }

  private upsertPlayer(projectId: string, teamId: string, player: PlayerInput, now: string): void {
    const externalId = player.externalId ?? `name:${player.name.trim().toLocaleLowerCase('en')}`;
    this.database
      .prepare(
        `INSERT INTO players(
        id, project_id, team_id, source, external_id, name, first_name, last_name, jersey_number,
        position, birthdate, height, weight, foot, joined, contract_expires, market_value,
        country_name, country_code2, country_code3, minutes_played, created_at, updated_at
      ) VALUES (
        $id, $projectId, $teamId, 'transfermarkt', $externalId, $name, $firstName, $lastName,
        $jerseyNumber, $position, $birthdate, $height, $weight, $foot, $joined, $contractExpires,
        $marketValue, $countryName, $countryCode2, $countryCode3, $minutesPlayed, $now, $now
      ) ON CONFLICT(project_id, team_id, source, external_id) DO UPDATE SET
        name = excluded.name, first_name = excluded.first_name, last_name = excluded.last_name,
        jersey_number = excluded.jersey_number, position = excluded.position, birthdate = excluded.birthdate,
        height = excluded.height, weight = excluded.weight, foot = excluded.foot, joined = excluded.joined,
        contract_expires = excluded.contract_expires, market_value = excluded.market_value,
        country_name = excluded.country_name, country_code2 = excluded.country_code2,
        country_code3 = excluded.country_code3, minutes_played = excluded.minutes_played,
        updated_at = excluded.updated_at`,
      )
      .run({
        id: crypto.randomUUID(),
        projectId,
        teamId,
        externalId,
        name: player.name.trim(),
        firstName: player.firstName ?? null,
        lastName: player.lastName ?? null,
        jerseyNumber: player.jerseyNumber ?? null,
        position: player.position ?? null,
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

  private toLeague(row: Row): League {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      source: 'transfermarkt',
      externalId: String(row['external_id']),
      name: String(row['name']),
      season: optionalString(row['season']),
      sourceUrl: String(row['source_url']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private toTeam(row: Row): Team {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      leagueId: optionalString(row['league_id']),
      source: 'transfermarkt',
      externalId: String(row['external_id']),
      name: String(row['name']),
      season: optionalString(row['season']),
      sourceUrl: String(row['source_url']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private toPlayer(row: Row): Player {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      teamId: String(row['team_id']),
      source: 'transfermarkt',
      externalId: optionalString(row['external_id']),
      name: String(row['name']),
      firstName: optionalString(row['first_name']),
      lastName: optionalString(row['last_name']),
      jerseyNumber: optionalNumber(row['jersey_number']),
      position: optionalString(row['position']) as Player['position'],
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
}
