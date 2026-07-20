import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  CommitImportRequest,
  EditableEntity,
  EditableEntityKind,
  Entity,
  ImportChangeSummary,
  ImportResult,
  ImportTeam,
  League,
  Page,
  PageRequest,
  Player,
  PlayerInput,
  Project,
  ProjectSummary,
  Team,
  UpdateEntityMetadataRequest,
} from '../shared/contracts.js';
import { isReferenceDate } from '../shared/reference-date.js';
import { ApplicationError } from './errors.js';

type Row = Record<string, string | number | null>;

const entitySortColumns = {
  leagues: {
    name: 'name',
    externalId: 'external_id',
    season: 'season',
    teamCount: 'team_count',
    sourceUrl: 'source_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  teams: {
    name: 'name',
    externalId: 'external_id',
    season: 'season',
    playerCount: 'player_count',
    sourceUrl: 'source_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  players: {
    name: 'name',
    countryName: 'country_name',
    jerseyNumber: 'jersey_number',
    position: 'position',
    birthdate: 'birthdate',
    height: 'height',
    foot: 'foot',
    joined: 'joined',
    contractExpires: 'contract_expires',
    marketValue: 'market_value',
    updatedAt: 'updated_at',
  },
} as const;

const optionalString = (value: string | number | null): string | undefined =>
  value === null || String(value) === '' ? undefined : String(value);
const optionalNumber = (value: string | number | null | undefined): number | undefined =>
  value == null ? undefined : Number(value);
const teamIdentity = (externalId: string, season: string | undefined): string =>
  `${externalId}\u0000${season ?? ''}`;
const playerIdentity = (player: PlayerInput): string =>
  player.externalId ?? `name:${player.name.trim().toLocaleLowerCase('en')}`;
const emptyChanges = (): ImportChangeSummary => ({
  leagues: { added: 0, updated: 0, deleted: 0 },
  teams: { added: 0, updated: 0, deleted: 0 },
  players: { added: 0, updated: 0, deleted: 0 },
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

  updateEntityMetadata(request: UpdateEntityMetadataRequest, sourceUrl: string): EditableEntity {
    const name = request.name.trim();
    const externalId = request.externalId.trim();
    const season = request.season?.trim() ?? '';
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(externalId) || (season && !/^\d{4}$/.test(season))) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Enter a name, a valid Transfermarkt ID, and an optional four-digit season.',
      });
    }
    this.getEntity(request);
    if (request.entity === 'teams' && request.leagueId) {
      this.getEntity({ projectId: request.projectId, entity: 'leagues', id: request.leagueId });
    }
    try {
      return this.transaction(() => {
        const now = new Date().toISOString();
        if (request.entity === 'leagues') {
          this.database
            .prepare(
              `UPDATE leagues SET name = $name, external_id = $externalId, season = $season,
               source_url = $sourceUrl, updated_at = $now
               WHERE project_id = $projectId AND id = $id`,
            )
            .run({
              projectId: request.projectId,
              id: request.id,
              name,
              externalId,
              season,
              sourceUrl,
              now,
            });
        } else {
          this.database
            .prepare(
              `UPDATE teams SET name = $name, external_id = $externalId, season = $season,
               league_id = $leagueId, source_url = $sourceUrl, updated_at = $now
               WHERE project_id = $projectId AND id = $id`,
            )
            .run({
              projectId: request.projectId,
              id: request.id,
              name,
              externalId,
              season,
              leagueId: request.leagueId ?? null,
              sourceUrl,
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
          message: `A ${request.entity === 'leagues' ? 'league' : 'team'} with this Transfermarkt ID and season already exists.`,
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

  previewImportChanges(request: CommitImportRequest): ImportChangeSummary {
    this.getProjectSummary(request.projectId);
    this.validateImportRequest(request);
    if (request.operation.kind !== 'synchronize') {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Change previews are only available for synchronized updates.',
      });
    }
    return this.calculateImportChanges(request);
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
    if (request.operation.kind === 'merge') {
      if (!request.teams.length) {
        throw new ApplicationError({
          code: 'INVALID_INPUT',
          message: 'Select at least one team to import.',
        });
      }
      return;
    }
    const target = this.getEntity({ projectId: request.projectId, ...request.operation.target });
    if (request.operation.target.entity === 'leagues') {
      if (!request.league) {
        throw new ApplicationError({
          code: 'INVALID_INPUT',
          message: 'The synchronized league payload is invalid.',
        });
      }
      this.assertIdentityMatches(target, request.league.externalId, request.league.season);
    } else {
      if (request.league || request.teams.length !== 1) {
        throw new ApplicationError({
          code: 'INVALID_INPUT',
          message: 'A synchronized team update must contain exactly one team.',
        });
      }
      const team = request.teams[0];
      this.assertIdentityMatches(target, team.externalId, team.season);
    }
    const teamKeys = new Set<string>();
    for (const team of request.teams) {
      const key = teamIdentity(team.externalId, team.season);
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
      }
    }
  }

  private assertIdentityMatches(
    target: EditableEntity,
    externalId: string,
    season: string | undefined,
  ): void {
    if (teamIdentity(target.externalId, target.season) !== teamIdentity(externalId, season)) {
      throw new ApplicationError({
        code: 'CONFLICT',
        message: 'The selected record changed. Reload it before synchronizing.',
      });
    }
  }

  private calculateImportChanges(request: CommitImportRequest): ImportChangeSummary {
    const changes = emptyChanges();
    if (request.operation.kind === 'merge') {
      if (request.league) {
        const existingLeague = this.findEntityByIdentity(
          'leagues',
          request.projectId,
          request.league.externalId,
          request.league.season,
        );
        changes.leagues[existingLeague ? 'updated' : 'added'] += 1;
      }
      for (const team of request.teams) {
        const existingTeam = this.findEntityByIdentity(
          'teams',
          request.projectId,
          team.externalId,
          team.season,
        );
        changes.teams[existingTeam ? 'updated' : 'added'] += 1;
        this.calculatePlayerChanges(changes, existingTeam, team.players, false);
      }
      return changes;
    }

    const { entity, id } = request.operation.target;
    if (entity === 'teams') {
      changes.teams.updated = 1;
      const targetRow = this.getEntityRow('teams', request.projectId, id);
      this.calculatePlayerChanges(changes, targetRow, request.teams[0]?.players ?? [], true);
      return changes;
    }

    changes.leagues.updated = 1;
    const existingTargetTeams = this.getTeamRowsForLeague(request.projectId, id);
    const selectedTeamKeys = new Set(
      request.teams.map((team) => teamIdentity(team.externalId, team.season)),
    );
    for (const team of request.teams) {
      const existingTeam = this.findEntityByIdentity(
        'teams',
        request.projectId,
        team.externalId,
        team.season,
      );
      changes.teams[existingTeam ? 'updated' : 'added'] += 1;
      this.calculatePlayerChanges(changes, existingTeam, team.players, true);
    }
    for (const teamRow of existingTargetTeams) {
      const key = teamIdentity(String(teamRow['external_id']), optionalString(teamRow['season']));
      if (selectedTeamKeys.has(key)) continue;
      changes.teams.deleted += 1;
      changes.players.deleted += this.getPlayerRows(String(teamRow['id'])).length;
    }
    return changes;
  }

  private calculatePlayerChanges(
    changes: ImportChangeSummary,
    existingTeam: Row | undefined,
    players: PlayerInput[],
    deleteMissing: boolean,
  ): void {
    const existingPlayers = existingTeam
      ? this.getPlayerRows(String(existingTeam['id']))
      : ([] as Row[]);
    const existingKeys = new Set(existingPlayers.map((row) => String(row['external_id'])));
    const selectedKeys = new Set<string>();
    for (const player of players) {
      const key = playerIdentity(player);
      selectedKeys.add(key);
      changes.players[existingKeys.has(key) ? 'updated' : 'added'] += 1;
    }
    if (deleteMissing) {
      changes.players.deleted += existingPlayers.filter(
        (row) => !selectedKeys.has(String(row['external_id'])),
      ).length;
    }
  }

  private mergeImport(request: CommitImportRequest, now: string): void {
    let leagueId: string | undefined;
    if (request.league) leagueId = this.upsertLeague(request.projectId, request.league, now);
    for (const team of request.teams) {
      const teamId = this.upsertTeam(request.projectId, leagueId, team, now);
      for (const player of team.players) this.upsertPlayer(request.projectId, teamId, player, now);
    }
  }

  private synchronizeImport(request: CommitImportRequest, now: string): void {
    if (request.operation.kind !== 'synchronize') return;
    const { entity, id } = request.operation.target;
    if (entity === 'teams') {
      const team = request.teams[0];
      this.updateTeamFromImport(request.projectId, id, team, now);
      this.synchronizePlayers(request.projectId, id, team.players, now);
      return;
    }

    const league = request.league;
    if (!league) return;
    this.updateLeagueFromImport(request.projectId, id, league, now);
    const selectedTeamKeys = new Set(
      request.teams.map((team) => teamIdentity(team.externalId, team.season)),
    );
    const existingTargetTeams = this.getTeamRowsForLeague(request.projectId, id);
    for (const team of request.teams) {
      const teamId = this.upsertTeam(request.projectId, id, team, now);
      this.synchronizePlayers(request.projectId, teamId, team.players, now);
    }
    for (const teamRow of existingTargetTeams) {
      const key = teamIdentity(String(teamRow['external_id']), optionalString(teamRow['season']));
      if (!selectedTeamKeys.has(key)) {
        this.database.prepare('DELETE FROM teams WHERE id = $id').run({ id: teamRow['id'] });
      }
    }
  }

  private synchronizePlayers(
    projectId: string,
    teamId: string,
    players: PlayerInput[],
    now: string,
  ): void {
    const selectedKeys = new Set(players.map(playerIdentity));
    for (const player of players) this.upsertPlayer(projectId, teamId, player, now);
    for (const row of this.getPlayerRows(teamId)) {
      if (!selectedKeys.has(String(row['external_id']))) {
        this.database.prepare('DELETE FROM players WHERE id = $id').run({ id: row['id'] });
      }
    }
  }

  private updateLeagueFromImport(
    projectId: string,
    id: string,
    league: NonNullable<CommitImportRequest['league']>,
    now: string,
  ): void {
    this.database
      .prepare(
        `UPDATE leagues SET name = $name, source_url = $sourceUrl, updated_at = $now
         WHERE project_id = $projectId AND id = $id`,
      )
      .run({ projectId, id, name: league.name.trim(), sourceUrl: league.sourceUrl, now });
  }

  private updateTeamFromImport(projectId: string, id: string, team: ImportTeam, now: string): void {
    this.database
      .prepare(
        `UPDATE teams SET name = $name, source_url = $sourceUrl, updated_at = $now
         WHERE project_id = $projectId AND id = $id`,
      )
      .run({ projectId, id, name: team.name.trim(), sourceUrl: team.sourceUrl, now });
  }

  private findEntityByIdentity(
    entity: EditableEntityKind,
    projectId: string,
    externalId: string,
    season: string | undefined,
  ): Row | undefined {
    return this.database
      .prepare(
        `SELECT * FROM ${entity} WHERE project_id = $projectId AND source = 'transfermarkt'
         AND external_id = $externalId AND season = $season`,
      )
      .get({ projectId, externalId, season: season ?? '' }) as Row | undefined;
  }

  private getEntityRow(entity: EditableEntityKind, projectId: string, id: string): Row {
    const row = this.database
      .prepare(`SELECT * FROM ${entity} WHERE project_id = $projectId AND id = $id`)
      .get({ projectId, id }) as Row | undefined;
    if (!row) throw new ApplicationError({ code: 'NOT_FOUND', message: 'Record was not found.' });
    return row;
  }

  private getTeamRowsForLeague(projectId: string, leagueId: string): Row[] {
    return this.database
      .prepare('SELECT * FROM teams WHERE project_id = $projectId AND league_id = $leagueId')
      .all({ projectId, leagueId }) as Row[];
  }

  private getPlayerRows(teamId: string): Row[] {
    return this.database.prepare('SELECT * FROM players WHERE team_id = $teamId').all({
      teamId,
    }) as Row[];
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
      teamCount: optionalNumber(row['team_count']),
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
      playerCount: optionalNumber(row['player_count']),
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
