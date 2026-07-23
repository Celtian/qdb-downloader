import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type shell } from 'electron';
import type {
  ExportFormat,
  ExportResult,
  QdbDesktopApi,
  Result,
  ScrapeProgress,
} from '../shared/contracts.js';
import type { SnapshotDatabase } from './database.js';
import { success, wrap } from './errors.js';
import type { SnapshotExporter } from './exporter.js';
import type { SoccerbotScraper } from './scraper.js';

interface IpcDependencies {
  database: SnapshotDatabase;
  scraper: SoccerbotScraper;
  exporter: SnapshotExporter;
  shell: typeof shell;
  removeExportDirectory: (directory: string) => Promise<void>;
}

const channels = {
  listProjects: 'qdb:projects:list',
  createProject: 'qdb:projects:create',
  renameProject: 'qdb:projects:rename',
  deleteProject: 'qdb:projects:delete',
  getProjectSummary: 'qdb:projects:summary',
  getEntity: 'qdb:entities:get',
  updateEntityMetadata: 'qdb:entities:update-metadata',
  listEntities: 'qdb:entities:list',
  listEntityFilterOptions: 'qdb:entities:filter-options',
  previewLeague: 'qdb:scrape:league',
  previewTeam: 'qdb:scrape:team',
  previewTeams: 'qdb:scrape:teams',
  cancelScrape: 'qdb:scrape:cancel',
  previewImportChanges: 'qdb:import:preview-changes',
  commitImport: 'qdb:import:commit',
  chooseExportDirectory: 'qdb:export:choose-directory',
  exportProject: 'qdb:export:project',
  openExportDirectory: 'qdb:export:open-directory',
  scrapeProgress: 'qdb:scrape:progress',
} as const;
const exportFormats = new Set<ExportFormat>(['json', 'single-json', 'csv']);

const sendProgress = (event: IpcMainInvokeEvent, progress: ScrapeProgress): void => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed()) window.webContents.send(channels.scrapeProgress, progress);
};

export const registerIpcHandlers = ({
  database,
  scraper,
  exporter,
  shell,
  removeExportDirectory,
}: IpcDependencies): void => {
  const exportedDirectories = new Map<string, string>();
  const approvedExportDestinations = new Set<string>();
  ipcMain.handle(channels.listProjects, () => wrap(() => database.listProjects()));
  ipcMain.handle(
    channels.createProject,
    (_event, input: Parameters<QdbDesktopApi['createProject']>[0]) =>
      wrap(() => database.createProject(input)),
  );
  ipcMain.handle(
    channels.renameProject,
    (_event, request: Parameters<QdbDesktopApi['renameProject']>[0]) =>
      wrap(() => database.renameProject(request)),
  );
  ipcMain.handle(
    channels.deleteProject,
    async (_event, { projectId }: Parameters<QdbDesktopApi['deleteProject']>[0]) =>
      wrap(async () => {
        database.deleteProject(projectId);
        const directories = [...exportedDirectories.entries()]
          .filter(([, exportedProjectId]) => exportedProjectId === projectId)
          .map(([directory]) => directory);
        const cleanup = await Promise.all(
          directories.map(async (directory) => {
            try {
              await removeExportDirectory(directory);
              exportedDirectories.delete(directory);
              return undefined;
            } catch {
              return directory;
            }
          }),
        );
        return {
          projectId,
          deletedExportCount: cleanup.filter((directory) => !directory).length,
          failedExportDirectories: cleanup.filter((directory): directory is string =>
            Boolean(directory),
          ),
        };
      }),
  );
  ipcMain.handle(
    channels.getProjectSummary,
    (_event, { projectId }: Parameters<QdbDesktopApi['getProjectSummary']>[0]) =>
      wrap(() => database.getProjectSummary(projectId)),
  );
  ipcMain.handle(channels.getEntity, (_event, request: Parameters<QdbDesktopApi['getEntity']>[0]) =>
    wrap(() => database.getEntity(request)),
  );
  ipcMain.handle(
    channels.updateEntityMetadata,
    (_event, request: Parameters<QdbDesktopApi['updateEntityMetadata']>[0]) =>
      wrap(() => database.updateEntityMetadata(request)),
  );
  ipcMain.handle(
    channels.listEntities,
    (_event, request: Parameters<QdbDesktopApi['listEntities']>[0]) =>
      wrap(() => database.listEntities(request)),
  );
  ipcMain.handle(
    channels.listEntityFilterOptions,
    (_event, request: Parameters<QdbDesktopApi['listEntityFilterOptions']>[0]) =>
      wrap(() => database.listEntityFilterOptions(request)),
  );
  ipcMain.handle(
    channels.previewLeague,
    (_event, request: Parameters<QdbDesktopApi['previewLeague']>[0]) =>
      wrap(() => scraper.previewLeague(request)),
  );
  ipcMain.handle(
    channels.previewTeam,
    (_event, request: Parameters<QdbDesktopApi['previewTeam']>[0]) =>
      wrap(() => scraper.previewTeam(request)),
  );
  ipcMain.handle(
    channels.previewTeams,
    (event, { sourceName, jobId, teams }: Parameters<QdbDesktopApi['previewTeams']>[0]) =>
      wrap(() =>
        scraper.previewTeams(sourceName, jobId, teams, (progress) => sendProgress(event, progress)),
      ),
  );
  ipcMain.handle(
    channels.cancelScrape,
    (_event, { jobId }: Parameters<QdbDesktopApi['cancelScrape']>[0]) =>
      Promise.resolve(success(scraper.cancel(jobId))),
  );
  ipcMain.handle(
    channels.previewImportChanges,
    (_event, request: Parameters<QdbDesktopApi['previewImportChanges']>[0]) =>
      wrap(() => database.previewImportChanges(request)),
  );
  ipcMain.handle(
    channels.commitImport,
    (_event, request: Parameters<QdbDesktopApi['commitImport']>[0]) =>
      wrap(() => database.commitImport(request)),
  );
  ipcMain.handle(channels.chooseExportDirectory, async () => {
    const result = await wrap(() => exporter.chooseDirectory());
    if (result.ok && result.value) approvedExportDestinations.add(result.value);
    return result;
  });
  ipcMain.handle(
    channels.exportProject,
    async (_event, request: Parameters<QdbDesktopApi['exportProject']>[0]) => {
      if (!exportFormats.has(request.format)) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Choose a valid export format.' },
        } satisfies Result<ExportResult>;
      }
      if (!approvedExportDestinations.has(request.destination)) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Choose an export folder first.' },
        } satisfies Result<ExportResult>;
      }
      const result = await wrap(() =>
        exporter.export(database.getProjectSummary(request.projectId), request),
      );
      if (result.ok) exportedDirectories.set(result.value.directory, request.projectId);
      return result;
    },
  );
  ipcMain.handle(
    channels.openExportDirectory,
    async (_event, { directory }: Parameters<QdbDesktopApi['openExportDirectory']>[0]) => {
      if (!exportedDirectories.has(directory)) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Only an exported directory can be opened.' },
        } satisfies Result<boolean>;
      }
      return success((await shell.openPath(directory)) === '');
    },
  );
};

export { channels };
