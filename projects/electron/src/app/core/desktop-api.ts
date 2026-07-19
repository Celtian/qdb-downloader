import { Service, signal } from '@angular/core';
import type {
  CommitImportRequest,
  Entity,
  ExportRequest,
  ExportResult,
  ImportResult,
  LeaguePreview,
  Page,
  PageRequest,
  PreviewLeagueRequest,
  PreviewTeamRequest,
  PreviewTeamsRequest,
  Project,
  ProjectSummary,
  QdbDesktopApi,
  Result,
  ScrapeProgress,
  TeamPreview,
} from '../../../shared/contracts';

@Service()
export class DesktopApi {
  private readonly progressState = signal<ScrapeProgress | undefined>(undefined);
  private readonly desktop: QdbDesktopApi | undefined = window.qdb;
  readonly scrapeProgress = this.progressState.asReadonly();

  constructor() {
    this.desktop?.onScrapeProgress((progress) => this.progressState.set(progress));
  }

  listProjects(): Promise<Result<Project[]>> {
    return this.request((desktop) => desktop.listProjects());
  }

  createProject(name: string, referenceDate: string): Promise<Result<Project>> {
    return this.request((desktop) => desktop.createProject({ name, referenceDate }));
  }

  getProjectSummary(projectId: string): Promise<Result<ProjectSummary>> {
    return this.request((desktop) => desktop.getProjectSummary({ projectId }));
  }

  listEntities(request: PageRequest): Promise<Result<Page<Entity>>> {
    return this.request((desktop) => desktop.listEntities(request));
  }

  previewLeague(request: PreviewLeagueRequest): Promise<Result<LeaguePreview>> {
    return this.request((desktop) => desktop.previewLeague(request));
  }

  previewTeam(request: PreviewTeamRequest): Promise<Result<TeamPreview>> {
    return this.request((desktop) => desktop.previewTeam(request));
  }

  previewTeams(request: PreviewTeamsRequest): Promise<Result<TeamPreview[]>> {
    this.progressState.set(undefined);
    return this.request((desktop) => desktop.previewTeams(request));
  }

  cancelScrape(jobId: string): Promise<Result<boolean>> {
    return this.request((desktop) => desktop.cancelScrape({ jobId }));
  }

  commitImport(request: CommitImportRequest): Promise<Result<ImportResult>> {
    return this.request((desktop) => desktop.commitImport(request));
  }

  exportProject(request: ExportRequest): Promise<Result<ExportResult | undefined>> {
    return this.request((desktop) => desktop.exportProject(request));
  }

  openExportDirectory(directory: string): Promise<Result<boolean>> {
    return this.request((desktop) => desktop.openExportDirectory({ directory }));
  }

  private request<T>(
    operation: (desktop: QdbDesktopApi) => Promise<Result<T>>,
  ): Promise<Result<T>> {
    if (!this.desktop) return Promise.resolve(this.unavailable());
    return operation(this.desktop).catch((error: unknown) => this.unavailable(error));
  }

  private unavailable<T>(error?: unknown): Result<T> {
    return {
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message:
          error instanceof Error
            ? error.message
            : 'The QDB desktop service is unavailable. Start the application with bun run start.',
      },
    };
  }
}
