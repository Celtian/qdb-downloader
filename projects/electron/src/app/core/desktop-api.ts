import { Service, signal } from '@angular/core';
import type {
  CommitImportRequest,
  DeleteLeagueMode,
  DeleteProjectResult,
  DeleteSourceDataResult,
  EditableEntity,
  EditableEntityKind,
  Entity,
  EntityFilterOptions,
  EntityFilterOptionsRequest,
  ExportRequest,
  ExportResult,
  ImportResult,
  ImportPreview,
  LeaguePreview,
  Page,
  PageRequest,
  PreviewLeagueRequest,
  PreviewTeamRequest,
  PreviewTeamsRequest,
  ProjectSummary,
  QdbDesktopApi,
  Result,
  ScrapeProgress,
  SourceDataDeletionCounts,
  SourceName,
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

  listProjects(): Promise<Result<ProjectSummary[]>> {
    return this.request((desktop) => desktop.listProjects());
  }

  createProject(name: string, referenceDate: string): Promise<Result<ProjectSummary>> {
    return this.request((desktop) => desktop.createProject({ name, referenceDate }));
  }

  async renameProject(projectId: string, name: string): Promise<Result<ProjectSummary>> {
    const result = await this.request((desktop) => desktop.renameProject({ projectId, name }));
    if (result.ok) this.projectUpdatedState.set(result.value);
    return result;
  }

  async deleteProject(projectId: string): Promise<Result<DeleteProjectResult>> {
    const result = await this.request((desktop) => desktop.deleteProject({ projectId }));
    if (result.ok && this.projectUpdatedState()?.id === projectId) {
      this.projectUpdatedState.set(undefined);
    }
    return result;
  }

  async deleteLeague(
    projectId: string,
    id: string,
    mode: DeleteLeagueMode,
  ): Promise<Result<ProjectSummary>> {
    const result = await this.request((desktop) => desktop.deleteLeague({ projectId, id, mode }));
    if (result.ok) this.projectUpdatedState.set(result.value);
    return result;
  }

  async deleteTeam(projectId: string, id: string): Promise<Result<ProjectSummary>> {
    const result = await this.request((desktop) => desktop.deleteTeam({ projectId, id }));
    if (result.ok) this.projectUpdatedState.set(result.value);
    return result;
  }

  async deleteSourceData(
    projectId: string,
    sourceNames: SourceName[],
  ): Promise<Result<DeleteSourceDataResult>> {
    const result = await this.request((desktop) =>
      desktop.deleteSourceData({ projectId, sourceNames }),
    );
    if (result.ok) this.projectUpdatedState.set(result.value.project);
    return result;
  }

  previewSourceDataDeletion(
    projectId: string,
    sourceNames: SourceName[],
  ): Promise<Result<SourceDataDeletionCounts>> {
    return this.request((desktop) => desktop.previewSourceDataDeletion({ projectId, sourceNames }));
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

  listEntityFilterOptions(
    request: EntityFilterOptionsRequest,
  ): Promise<Result<EntityFilterOptions>> {
    return this.request((desktop) => desktop.listEntityFilterOptions(request));
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

  previewImportChanges(request: CommitImportRequest): Promise<Result<ImportPreview>> {
    return this.request((desktop) => desktop.previewImportChanges(request));
  }

  commitImport(request: CommitImportRequest): Promise<Result<ImportResult>> {
    return this.request((desktop) => desktop.commitImport(request));
  }

  chooseExportDirectory(): Promise<Result<string | undefined>> {
    return this.request((desktop) => desktop.chooseExportDirectory());
  }

  exportProject(request: ExportRequest): Promise<Result<ExportResult>> {
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
