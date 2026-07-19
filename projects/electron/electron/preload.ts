import { contextBridge, ipcRenderer } from 'electron';
import type { QdbDesktopApi } from '../shared/contracts.js';

const channels = {
  listProjects: 'qdb:projects:list',
  createProject: 'qdb:projects:create',
  getProjectSummary: 'qdb:projects:summary',
  listEntities: 'qdb:entities:list',
  previewLeague: 'qdb:scrape:league',
  previewTeam: 'qdb:scrape:team',
  previewTeams: 'qdb:scrape:teams',
  cancelScrape: 'qdb:scrape:cancel',
  commitImport: 'qdb:import:commit',
  exportProject: 'qdb:export:project',
  openExportDirectory: 'qdb:export:open-directory',
  scrapeProgress: 'qdb:scrape:progress',
} as const;

const api: QdbDesktopApi = {
  listProjects: () => ipcRenderer.invoke(channels.listProjects),
  createProject: (input) => ipcRenderer.invoke(channels.createProject, input),
  getProjectSummary: (request) => ipcRenderer.invoke(channels.getProjectSummary, request),
  listEntities: (request) => ipcRenderer.invoke(channels.listEntities, request),
  previewLeague: (request) => ipcRenderer.invoke(channels.previewLeague, request),
  previewTeam: (request) => ipcRenderer.invoke(channels.previewTeam, request),
  previewTeams: (request) => ipcRenderer.invoke(channels.previewTeams, request),
  cancelScrape: (request) => ipcRenderer.invoke(channels.cancelScrape, request),
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
