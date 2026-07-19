import { signal } from '@angular/core';
import { Electroview } from 'electrobun/view';
import type {
  CommitImportRequest,
  Entity,
  ExportRequest,
  ExportResult,
  LeaguePreview,
  Page,
  PageRequest,
  PreviewLeagueRequest,
  PreviewTeamRequest,
  PreviewTeamsRequest,
  Project,
  ProjectSummary,
  QdbRpc,
  Result,
  ScrapeProgress,
  TeamPreview,
  ImportResult,
} from '../../../shared/contracts';
import { Service } from '@angular/core';

@Service()
export class DesktopApi {
  private readonly progressState = signal<ScrapeProgress | undefined>(undefined);
  readonly scrapeProgress = this.progressState.asReadonly();
  private readonly rpc = this.createRpc();

  listProjects(): Promise<Result<Project[]>> {
    return this.request('listProjects', undefined, (rpc) => rpc.request.listProjects());
  }

  createProject(name: string, referenceDate: string): Promise<Result<Project>> {
    const body = { name, referenceDate };
    return this.request('createProject', body, (rpc) => rpc.request.createProject(body));
  }

  getProjectSummary(projectId: string): Promise<Result<ProjectSummary>> {
    const body = { projectId };
    return this.request('getProjectSummary', body, (rpc) => rpc.request.getProjectSummary(body));
  }

  listEntities(request: PageRequest): Promise<Result<Page<Entity>>> {
    return this.request('listEntities', request, (rpc) => rpc.request.listEntities(request));
  }

  previewLeague(request: PreviewLeagueRequest): Promise<Result<LeaguePreview>> {
    return this.request('previewLeague', request, (rpc) => rpc.request.previewLeague(request));
  }

  previewTeam(request: PreviewTeamRequest): Promise<Result<TeamPreview>> {
    return this.request('previewTeam', request, (rpc) => rpc.request.previewTeam(request));
  }

  previewTeams(request: PreviewTeamsRequest): Promise<Result<TeamPreview[]>> {
    this.progressState.set(undefined);
    if (this.rpc) {
      return this.rpc.request
        .previewTeams(request)
        .catch((error: unknown) => this.unavailable(error));
    }
    const poll = window.setInterval(() => void this.pollProgress(request.jobId), 200);
    return this.httpRequest<TeamPreview[]>('previewTeams', request).finally(() =>
      window.clearInterval(poll),
    );
  }

  cancelScrape(jobId: string): Promise<Result<boolean>> {
    const body = { jobId };
    return this.request('cancelScrape', body, (rpc) => rpc.request.cancelScrape(body));
  }

  commitImport(request: CommitImportRequest): Promise<Result<ImportResult>> {
    return this.request('commitImport', request, (rpc) => rpc.request.commitImport(request));
  }

  exportProject(request: ExportRequest): Promise<Result<ExportResult | undefined>> {
    return this.request('exportProject', request, (rpc) => rpc.request.exportProject(request));
  }

  openExportDirectory(directory: string): Promise<Result<boolean>> {
    const body = { directory };
    return this.request('openExportDirectory', body, (rpc) =>
      rpc.request.openExportDirectory(body),
    );
  }

  private createRpc() {
    if (!window.__electrobun) return undefined;
    const rpc = Electroview.defineRPC<QdbRpc>({
      maxRequestTime: Infinity,
      handlers: {
        messages: {
          scrapeProgress: (progress) => this.progressState.set(progress),
        },
      },
    });
    new Electroview({ rpc });
    return rpc;
  }

  private request<T>(
    operationName: string,
    body: unknown,
    operation: (rpc: NonNullable<typeof this.rpc>) => Promise<Result<T>>,
  ): Promise<Result<T>> {
    const rpc = this.rpc;
    if (!rpc) return this.httpRequest<T>(operationName, body);
    return operation(rpc).catch((error: unknown) => this.unavailable(error));
  }

  private async httpRequest<T>(operation: string, body: unknown): Promise<Result<T>> {
    try {
      const response = await fetch(`/api/rpc/${encodeURIComponent(operation)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      if (!response.ok) throw new Error(`Desktop service returned HTTP ${response.status}.`);
      return (await response.json()) as Result<T>;
    } catch (error) {
      return this.unavailable(error);
    }
  }

  private async pollProgress(jobId: string): Promise<void> {
    try {
      const response = await fetch(`/api/progress/${encodeURIComponent(jobId)}`);
      if (!response.ok) return;
      const value = (await response.json()) as ScrapeProgress | null;
      if (value) this.progressState.set(value);
    } catch {
      // The main request reports backend connectivity errors to the user.
    }
  }

  private unavailable<T>(error: unknown): Result<T> {
    return {
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message:
          error instanceof Error
            ? error.message
            : 'The QDB desktop service is not available. Start it with bun run start:wsl.',
      },
    };
  }
}
