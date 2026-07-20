import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type shell } from 'electron';
import type { QdbDesktopApi, Result, ScrapeProgress } from '../shared/contracts.js';
import type { SnapshotDatabase } from './database.js';
import { success, wrap } from './errors.js';
import type { SnapshotExporter } from './exporter.js';
import { transfermarktSourceUrl, type TransfermarktScraper } from './scraper.js';

interface IpcDependencies {
  database: SnapshotDatabase;
  scraper: TransfermarktScraper;
  exporter: SnapshotExporter;
  shell: typeof shell;
}

const channels = {
  listProjects: 'qdb:projects:list',
  createProject: 'qdb:projects:create',
  renameProject: 'qdb:projects:rename',
  getProjectSummary: 'qdb:projects:summary',
  getEntity: 'qdb:entities:get',
  updateEntityMetadata: 'qdb:entities:update-metadata',
  listEntities: 'qdb:entities:list',
  previewLeague: 'qdb:scrape:league',
  previewTeam: 'qdb:scrape:team',
  previewTeams: 'qdb:scrape:teams',
  cancelScrape: 'qdb:scrape:cancel',
  previewImportChanges: 'qdb:import:preview-changes',
  commitImport: 'qdb:import:commit',
  exportProject: 'qdb:export:project',
  openExportDirectory: 'qdb:export:open-directory',
  scrapeProgress: 'qdb:scrape:progress',
} as const;

const sendProgress = (event: IpcMainInvokeEvent, progress: ScrapeProgress): void => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed()) window.webContents.send(channels.scrapeProgress, progress);
};

export const registerIpcHandlers = ({
  database,
  scraper,
  exporter,
  shell,
}: IpcDependencies): void => {
  const exportedDirectories = new Set<string>();
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
      wrap(() =>
        database.updateEntityMetadata(
          request,
          transfermarktSourceUrl(request.entity, request.externalId.trim(), request.season?.trim()),
        ),
      ),
  );
  ipcMain.handle(
    channels.listEntities,
    (_event, request: Parameters<QdbDesktopApi['listEntities']>[0]) =>
      wrap(() => database.listEntities(request)),
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
    (event, { jobId, teams }: Parameters<QdbDesktopApi['previewTeams']>[0]) =>
      wrap(() => scraper.previewTeams(jobId, teams, (progress) => sendProgress(event, progress))),
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
  ipcMain.handle(
    channels.exportProject,
    async (_event, { projectId, format }: Parameters<QdbDesktopApi['exportProject']>[0]) => {
      const result = await wrap(() =>
        exporter.export(database.getProjectSummary(projectId), format),
      );
      if (result.ok && result.value) exportedDirectories.add(result.value.directory);
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
