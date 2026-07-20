import { Service, signal } from '@angular/core';
import type {
  CommitImportRequest,
  EditableEntity,
  EditableEntityKind,
  Entity,
  ExportRequest,
  ExportResult,
  ImportResult,
  ImportChangeSummary,
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
  UpdateEntityMetadataRequest,
} from '../../../shared/contracts';

@Service()
export class DesktopApi {
  private readonly progressState = signal<ScrapeProgress | undefined>(undefined);
  private readonly projectUpdatedState = signal<ProjectSummary | undefined>(undefined);
  private readonly desktop: QdbDesktopApi | undefined = window.qdb;
  readonly scrapeProgress = this.progressState.asReadonly();
  readonly projectUpdated = this.projectUpdatedState.asReadonly();

  constructor() {
    this.desktop?.onScrapeProgress((progress) => this.progressState.set(progress));
  }

  listProjects(): Promise<Result<Project[]>> {
    return this.request((desktop) => desktop.listProjects());
  }

  createProject(name: string, referenceDate: string): Promise<Result<Project>> {
    return this.request((desktop) => desktop.createProject({ name, referenceDate }));
  }

  async renameProject(projectId: string, name: string): Promise<Result<ProjectSummary>> {
    const result = await this.request((desktop) => desktop.renameProject({ projectId, name }));
    if (result.ok) this.projectUpdatedState.set(result.value);
    return result;
  }

  async getProjectSummary(projectId: string): Promise<Result<ProjectSummary>> {
    const result = await this.request((desktop) => desktop.getProjectSummary({ projectId }));
    if (result.ok) this.projectUpdatedState.set(result.value);
    return result;
  }

  getEntity(
    projectId: string,
    entity: EditableEntityKind,
    id: string,
  ): Promise<Result<EditableEntity>> {
    return this.request((desktop) => desktop.getEntity({ projectId, entity, id }));
  }

  updateEntityMetadata(request: UpdateEntityMetadataRequest): Promise<Result<EditableEntity>> {
    return this.request((desktop) => desktop.updateEntityMetadata(request));
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

  previewImportChanges(request: CommitImportRequest): Promise<Result<ImportChangeSummary>> {
    return this.request((desktop) => desktop.previewImportChanges(request));
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
