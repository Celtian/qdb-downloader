export type EntityKind = 'leagues' | 'teams' | 'players';
export type SortDirection = 'asc' | 'desc';
export type ExportFormat = 'json' | 'csv';
export type SourceName = 'transfermarkt';

export interface AppError {
  code:
    | 'CONFLICT'
    | 'DATABASE'
    | 'EXPORT'
    | 'INVALID_INPUT'
    | 'NOT_FOUND'
    | 'SCRAPE_FAILED'
    | 'UNAVAILABLE';
  message: string;
  details?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export interface Project {
  id: string;
  name: string;
  referenceDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  leagueCount: number;
  teamCount: number;
  playerCount: number;
}

export interface League {
  id: string;
  projectId: string;
  source: SourceName;
  externalId: string;
  name: string;
  season?: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  projectId: string;
  leagueId?: string;
  source: SourceName;
  externalId: string;
  name: string;
  season?: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type PlayerPosition = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'ATTACKER';
export type PlayerFoot = 'LEFT' | 'RIGHT';

export interface PlayerInput {
  externalId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  jerseyNumber?: number;
  position?: PlayerPosition;
  birthdate?: string;
  height?: number;
  weight?: number;
  foot?: PlayerFoot;
  joined?: string;
  contractExpires?: string;
  marketValue?: number;
  countryName?: string;
  countryCode2?: string;
  countryCode3?: string;
  minutesPlayed?: number;
}

export interface Player extends PlayerInput {
  id: string;
  projectId: string;
  teamId: string;
  source: SourceName;
  createdAt: string;
  updatedAt: string;
}

export type Entity = League | Team | Player;

export interface PageRequest {
  projectId: string;
  entity: EntityKind;
  pageIndex: number;
  pageSize: number;
  search: string;
  sort: string;
  direction: SortDirection;
  leagueId?: string;
  teamId?: string;
}

export interface Page<T> {
  rows: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface ExternalTeam {
  externalId: string;
  name: string;
  season?: string;
  sourceUrl: string;
}

export interface LeaguePreview {
  externalId: string;
  season?: string;
  sourceUrl: string;
  teams: ExternalTeam[];
}

export interface TeamPreview extends ExternalTeam {
  players: PlayerInput[];
}

export interface PreviewLeagueRequest {
  identifierOrUrl: string;
  season?: string;
}

export interface PreviewTeamRequest {
  identifierOrUrl: string;
  name: string;
  season?: string;
}

export interface PreviewTeamsRequest {
  jobId: string;
  teams: ExternalTeam[];
}

export interface ImportLeague {
  externalId: string;
  name: string;
  season?: string;
  sourceUrl: string;
}

export interface ImportTeam extends ExternalTeam {
  players: PlayerInput[];
}

export interface CommitImportRequest {
  projectId: string;
  league?: ImportLeague;
  teams: ImportTeam[];
}

export interface ImportResult {
  leagueCount: number;
  teamCount: number;
  playerCount: number;
}

export interface ScrapeProgress {
  jobId: string;
  completed: number;
  total: number;
  currentTeam: string;
  canceled: boolean;
}

export interface ExportRequest {
  projectId: string;
  format: ExportFormat;
}

export interface ExportResult {
  directory: string;
  files: string[];
}

export interface QdbDesktopApi {
  listProjects(): Promise<Result<Project[]>>;
  createProject(input: { name: string; referenceDate: string }): Promise<Result<Project>>;
  getProjectSummary(request: { projectId: string }): Promise<Result<ProjectSummary>>;
  listEntities(request: PageRequest): Promise<Result<Page<Entity>>>;
  previewLeague(request: PreviewLeagueRequest): Promise<Result<LeaguePreview>>;
  previewTeam(request: PreviewTeamRequest): Promise<Result<TeamPreview>>;
  previewTeams(request: PreviewTeamsRequest): Promise<Result<TeamPreview[]>>;
  cancelScrape(request: { jobId: string }): Promise<Result<boolean>>;
  commitImport(request: CommitImportRequest): Promise<Result<ImportResult>>;
  exportProject(request: ExportRequest): Promise<Result<ExportResult | undefined>>;
  openExportDirectory(request: { directory: string }): Promise<Result<boolean>>;
  onScrapeProgress(listener: (progress: ScrapeProgress) => void): () => void;
}
