import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  CommitImportRequest,
  EditableEntity,
  EditableEntityKind,
  Entity,
  EntityFilterOptions,
  EntityFilterOptionsRequest,
  ImportChangeSummary,
  ImportResult,
  ImportTeam,
  LeagueSynchronizeImportOperation,
  League,
  NationalityFilterOption,
  Page,
  PageRequest,
  Player,
  PlayerInput,
  Project,
  ProjectSummary,
  Team,
  SynchronizeImportOperation,
  UpdateEntityMetadataRequest,
} from '../shared/contracts.js';
import { isReferenceDate } from '../shared/reference-date.js';
import { ApplicationError } from './errors.js';

type Row = Record<string, string | number | null>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLeagueSynchronization = (
  operation: SynchronizeImportOperation,
): operation is LeagueSynchronizeImportOperation => operation.target.entity === 'leagues';

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
    externalId: 'external_id',
    countryName: 'country_name',
    jerseyNumber: 'jersey_number',
    position: 'position',
    birthdate: 'birthdate',
    height: 'height',
    foot: 'foot',
    joined: 'joined',
    contractExpires: 'contract_expires',
    marketValue: 'market_value',
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
const teamIdentity = (externalId: string, season: string | undefined): string =>
  `${externalId}\u0000${season ?? ''}`;
const playerIdentity = (player: PlayerInput): string =>
  player.externalId ?? `name:${player.name.trim().toLocaleLowerCase('en')}`;
const emptyChanges = (): ImportChangeSummary => ({
  leagues: { added: 0, updated: 0, deleted: 0 },
  teams: { added: 0, updated: 0, detached: 0, deleted: 0 },
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

  deleteProject(projectId: string): ProjectSummary {
    const project = this.getProjectSummary(projectId);
    this.database.prepare('DELETE FROM projects WHERE id = $projectId').run({ projectId });
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
      where.push("(name LIKE $search ESCAPE '\\' OR external_id LIKE $search ESCAPE '\\')");
      values['search'] =
        `%${search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    }
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
        seasons: this.listDistinctText('leagues', 'season', request.projectId),
      };
    }
    if (request.entity === 'teams') {
      const leagues = this.database
        .prepare(
          `SELECT id, name FROM leagues WHERE project_id = $projectId
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
        leagues: leagues.map((row) => ({ id: String(row['id']), name: String(row['name']) })),
        hasTeamsWithoutLeague: Boolean(withoutLeague['present']),
        seasons: this.listDistinctText('teams', 'season', request.projectId),
      };
    }
    const teams = this.database
      .prepare(
        `SELECT id, name FROM teams WHERE project_id = $projectId
         ORDER BY name COLLATE NOCASE ASC, id ASC`,
      )
      .all({ projectId: request.projectId }) as Row[];
    const presentPositions = new Set(
      this.listDistinctText('players', 'position', request.projectId),
    );
    const presentFeet = new Set(this.listDistinctText('players', 'foot', request.projectId));
    return {
      entity: 'players',
      teams: teams.map((row) => ({ id: String(row['id']), name: String(row['name']) })),
      nationalities: this.listNationalityOptions(request.projectId),
      positions: playerPositions.filter((position) => presentPositions.has(position)),
      feet: playerFeet.filter((foot) => presentFeet.has(foot)),
    };
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
    const operation = request.operation;
    const target = this.getEntity({ projectId: request.projectId, ...operation.target });
    const options: unknown = operation.options;
    if (isLeagueSynchronization(operation)) {
      if (
        !isRecord(options) ||
        !['keep', 'detach', 'delete'].includes(String(options['absentTeams'])) ||
        !['keep', 'delete'].includes(String(options['absentPlayers'])) ||
        typeof options['overrideTeamNames'] !== 'boolean' ||
        typeof options['overridePlayerNames'] !== 'boolean'
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
      this.assertIdentityMatches(target, request.league.externalId, request.league.season);
    } else {
      if (
        !isRecord(options) ||
        !['keep', 'delete'].includes(String(options['absentPlayers'])) ||
        typeof options['overridePlayerNames'] !== 'boolean'
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
        this.calculatePlayerChanges(changes, existingTeam, team.players, 'keep');
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
        targetRow,
        request.teams[0]?.players ?? [],
        operation.options.absentPlayers,
      );
      return changes;
    }

    if (!isLeagueSynchronization(operation)) return changes;
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
      this.calculatePlayerChanges(
        changes,
        existingTeam,
        team.players,
        operation.options.absentPlayers,
      );
    }
    for (const teamRow of existingTargetTeams) {
      const key = teamIdentity(String(teamRow['external_id']), optionalString(teamRow['season']));
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
    existingTeam: Row | undefined,
    players: PlayerInput[],
    absentPlayers: 'keep' | 'delete',
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
    if (absentPlayers === 'delete') {
      changes.players.deleted += existingPlayers.filter(
        (row) => !selectedKeys.has(String(row['external_id'])),
      ).length;
    }
  }

  private mergeImport(request: CommitImportRequest, now: string): void {
    let leagueId: string | undefined;
    if (request.league) leagueId = this.upsertLeague(request.projectId, request.league, now);
    for (const team of request.teams) {
      const teamId = this.upsertTeam(request.projectId, leagueId, team, now, true);
      for (const player of team.players) {
        this.upsertPlayer(request.projectId, teamId, player, now, true);
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
        id,
        team.players,
        now,
        operation.options.absentPlayers,
        operation.options.overridePlayerNames,
      );
      return;
    }

    if (!isLeagueSynchronization(operation)) return;
    const league = request.league;
    if (!league) return;
    this.updateLeagueFromImport(request.projectId, id, league, now);
    const selectedTeamKeys = new Set(
      request.teams.map((team) => teamIdentity(team.externalId, team.season)),
    );
    const existingTargetTeams = this.getTeamRowsForLeague(request.projectId, id);
    for (const team of request.teams) {
      const teamId = this.upsertTeam(
        request.projectId,
        id,
        team,
        now,
        operation.options.overrideTeamNames,
      );
      this.synchronizePlayers(
        request.projectId,
        teamId,
        team.players,
        now,
        operation.options.absentPlayers,
        operation.options.overridePlayerNames,
      );
    }
    for (const teamRow of existingTargetTeams) {
      const key = teamIdentity(String(teamRow['external_id']), optionalString(teamRow['season']));
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
    teamId: string,
    players: PlayerInput[],
    now: string,
    absentPlayers: 'keep' | 'delete',
    overridePlayerNames: boolean,
  ): void {
    const selectedKeys = new Set(players.map(playerIdentity));
    for (const player of players) {
      this.upsertPlayer(projectId, teamId, player, now, overridePlayerNames);
    }
    if (absentPlayers === 'keep') return;
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
        `UPDATE leagues SET source_url = $sourceUrl, updated_at = $now
         WHERE project_id = $projectId AND id = $id`,
      )
      .run({ projectId, id, sourceUrl: league.sourceUrl, now });
  }

  private updateTeamFromImport(projectId: string, id: string, team: ImportTeam, now: string): void {
    this.database
      .prepare(
        `UPDATE teams SET source_url = $sourceUrl, updated_at = $now
         WHERE project_id = $projectId AND id = $id`,
      )
      .run({ projectId, id, sourceUrl: team.sourceUrl, now });
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
    overrideName: boolean,
  ): string {
    const id = crypto.randomUUID();
    this.database
      .prepare(
        `INSERT INTO teams(id, project_id, league_id, source, external_id, name, season, source_url, created_at, updated_at)
        VALUES ($id, $projectId, $leagueId, 'transfermarkt', $externalId, $name, $season, $sourceUrl, $now, $now)
        ON CONFLICT(project_id, source, external_id, season) DO UPDATE SET
          league_id = COALESCE(excluded.league_id, teams.league_id),
          name = CASE WHEN $overrideName = 1 THEN excluded.name ELSE teams.name END,
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
        overrideName: overrideName ? 1 : 0,
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

  private upsertPlayer(
    projectId: string,
    teamId: string,
    player: PlayerInput,
    now: string,
    overrideNames: boolean,
  ): void {
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
        name = CASE WHEN $overrideNames = 1 THEN excluded.name ELSE players.name END,
        first_name = CASE
          WHEN $overrideNames = 1 THEN excluded.first_name ELSE players.first_name END,
        last_name = CASE
          WHEN $overrideNames = 1 THEN excluded.last_name ELSE players.last_name END,
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
