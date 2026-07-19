import { app, ApplicationMenu, BrowserView, BrowserWindow, Utils } from 'electrobun';
import { join } from 'node:path';
import type { QdbRpc, Result, ScrapeProgress } from '../shared/contracts';
import { SnapshotDatabase } from './database';
import { SnapshotExporter } from './exporter';
import { success, wrap } from './errors';
import { TransfermarktScraper } from './scraper';

const databasePath =
  process.env['QDB_DATABASE_PATH'] ?? join(Utils.paths.userData, 'qdb-downloader.sqlite');
const database = new SnapshotDatabase(databasePath);
const scraper = new TransfermarktScraper();
const exporter = new SnapshotExporter(database);
let sendProgress: (progress: ScrapeProgress) => void = () => undefined;

const rpc = BrowserView.defineRPC<QdbRpc>({
  maxRequestTime: Infinity,
  handlers: {
    requests: {
      listProjects: () => wrap(() => database.listProjects()),
      createProject: (request) => wrap(() => database.createProject(request)),
      getProjectSummary: ({ projectId }) => wrap(() => database.getProjectSummary(projectId)),
      listEntities: (request) => wrap(() => database.listEntities(request)),
      previewLeague: (request) => wrap(() => scraper.previewLeague(request)),
      previewTeam: (request) => wrap(() => scraper.previewTeam(request)),
      previewTeams: ({ jobId, teams }) =>
        wrap(() => scraper.previewTeams(jobId, teams, (progress) => sendProgress(progress))),
      cancelScrape: ({ jobId }) => Promise.resolve(success(scraper.cancel(jobId))),
      commitImport: (request) => wrap(() => database.commitImport(request)),
      exportProject: ({ projectId, format }) =>
        wrap(async () => exporter.export(database.getProjectSummary(projectId), format)),
      openExportDirectory: ({ directory }) =>
        Promise.resolve<Result<boolean>>(success(Utils.openPath(directory))),
    },
  },
});
sendProgress = (progress) => rpc.send.scrapeProgress(progress);

ApplicationMenu.setApplicationMenu([
  { submenu: [{ role: 'quit' }] },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  },
]);

const rendererUrl = process.env['QDB_RENDERER_URL'] ?? 'views://app/index.html';
new BrowserWindow({
  title: 'QDB Downloader',
  url: rendererUrl,
  rpc,
  frame: { width: 1440, height: 900, x: 120, y: 80 },
  titleBarStyle: 'default',
});

app.on('before-quit', () => database.close());
