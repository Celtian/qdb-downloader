import { contextBridge, ipcRenderer } from 'electron';
import type { QdbDesktopApi } from '../shared/contracts.js';

const channels = {
  getAppInfo: 'qdb:app:info',
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
  exportProject: 'qdb:export:project',
  openExportDirectory: 'qdb:export:open-directory',
  scrapeProgress: 'qdb:scrape:progress',
} as const;

const api: QdbDesktopApi = {
  getAppInfo: () => ipcRenderer.invoke(channels.getAppInfo),
  listProjects: () => ipcRenderer.invoke(channels.listProjects),
  createProject: (input) => ipcRenderer.invoke(channels.createProject, input),
  renameProject: (request) => ipcRenderer.invoke(channels.renameProject, request),
  deleteProject: (request) => ipcRenderer.invoke(channels.deleteProject, request),
  getProjectSummary: (request) => ipcRenderer.invoke(channels.getProjectSummary, request),
  getEntity: (request) => ipcRenderer.invoke(channels.getEntity, request),
  updateEntityMetadata: (request) => ipcRenderer.invoke(channels.updateEntityMetadata, request),
  listEntities: (request) => ipcRenderer.invoke(channels.listEntities, request),
  listEntityFilterOptions: (request) =>
    ipcRenderer.invoke(channels.listEntityFilterOptions, request),
  previewLeague: (request) => ipcRenderer.invoke(channels.previewLeague, request),
  previewTeam: (request) => ipcRenderer.invoke(channels.previewTeam, request),
  previewTeams: (request) => ipcRenderer.invoke(channels.previewTeams, request),
  cancelScrape: (request) => ipcRenderer.invoke(channels.cancelScrape, request),
  previewImportChanges: (request) => ipcRenderer.invoke(channels.previewImportChanges, request),
  commitImport: (request) => ipcRenderer.invoke(channels.commitImport, request),
  exportProject: (request) => ipcRenderer.invoke(channels.exportProject, request),
  openExportDirectory: (request) => ipcRenderer.invoke(channels.openExportDirectory, request),
  onScrapeProgress: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: Parameters<typeof listener>[0],
    ): void => listener(progress);
    ipcRenderer.on(channels.scrapeProgress, handler);
    return () => ipcRenderer.removeListener(channels.scrapeProgress, handler);
  },
};

contextBridge.exposeInMainWorld('qdb', api);
