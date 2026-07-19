import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type {
  CommitImportRequest,
  ExportRequest,
  PageRequest,
  PreviewLeagueRequest,
  PreviewTeamRequest,
  PreviewTeamsRequest,
  ScrapeProgress,
} from '../shared/contracts';
import { SnapshotDatabase } from './database';
import { SnapshotExportWriter } from './export-writer';
import { success, toFailure, wrap } from './errors';
import { TransfermarktScraper } from './scraper';

const appDataDirectory =
  process.env['QDB_DATA_DIRECTORY'] ?? join(homedir(), '.local', 'share', 'qdb-downloader');
const databasePath =
  process.env['QDB_DATABASE_PATH'] ?? join(appDataDirectory, 'qdb-downloader.sqlite');
const downloadsDirectory = join(homedir(), 'Downloads');
const exportDirectory =
  process.env['QDB_EXPORT_DIRECTORY'] ??
  (existsSync(downloadsDirectory)
    ? join(downloadsDirectory, 'QDB Downloader')
    : join(appDataDirectory, 'exports'));
const port = Number(process.env['QDB_API_PORT'] ?? '4201');

const database = new SnapshotDatabase(databasePath);
const scraper = new TransfermarktScraper();
const exporter = new SnapshotExportWriter(database);
const progress = new Map<string, ScrapeProgress>();
const exportedDirectories = new Set<string>();

const json = (value: unknown, status = 200): Response => Response.json(value, { status });

const requestBody = async <T>(request: Request): Promise<T> => (await request.json()) as T;

const handleRpc = async (operation: string, request: Request): Promise<Response> => {
  try {
    switch (operation) {
      case 'listProjects':
        return json(await wrap(() => database.listProjects()));
      case 'createProject': {
        const body = await requestBody<{ name: string; referenceDate: string }>(request);
        return json(await wrap(() => database.createProject(body)));
      }
      case 'getProjectSummary': {
        const { projectId } = await requestBody<{ projectId: string }>(request);
        return json(await wrap(() => database.getProjectSummary(projectId)));
      }
      case 'listEntities': {
        const body = await requestBody<PageRequest>(request);
        return json(await wrap(() => database.listEntities(body)));
      }
      case 'previewLeague': {
        const body = await requestBody<PreviewLeagueRequest>(request);
        return json(await wrap(() => scraper.previewLeague(body)));
      }
      case 'previewTeam': {
        const body = await requestBody<PreviewTeamRequest>(request);
        return json(await wrap(() => scraper.previewTeam(body)));
      }
      case 'previewTeams': {
        const { jobId, teams } = await requestBody<PreviewTeamsRequest>(request);
        progress.delete(jobId);
        const result = await wrap(() =>
          scraper.previewTeams(jobId, teams, (value) => progress.set(jobId, value)),
        );
        return json(result);
      }
      case 'cancelScrape': {
        const { jobId } = await requestBody<{ jobId: string }>(request);
        return json(success(scraper.cancel(jobId)));
      }
      case 'commitImport': {
        const body = await requestBody<CommitImportRequest>(request);
        return json(await wrap(() => database.commitImport(body)));
      }
      case 'exportProject': {
        const { projectId, format } = await requestBody<ExportRequest>(request);
        const result = await wrap(() =>
          exporter.write(database.getProjectSummary(projectId), format, exportDirectory),
        );
        if (result.ok) exportedDirectories.add(resolve(result.value.directory));
        return json(result);
      }
      case 'openExportDirectory': {
        const { directory } = await requestBody<{ directory: string }>(request);
        const resolvedDirectory = resolve(directory);
        if (!exportedDirectories.has(resolvedDirectory)) {
          return json({
            ok: false,
            error: { code: 'INVALID_INPUT', message: 'Only an exported directory can be opened.' },
          });
        }
        const child = Bun.spawn(['xdg-open', resolvedDirectory], {
          cwd: dirname(resolvedDirectory),
          stdout: 'ignore',
          stderr: 'ignore',
        });
        return json(success((await child.exited) === 0));
      }
      default:
        return json(
          { ok: false, error: { code: 'NOT_FOUND', message: 'Unknown desktop operation.' } },
          404,
        );
    }
  } catch (error) {
    return json(toFailure(error));
  }
};

const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json({ ok: true, databasePath, exportDirectory });
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/progress/')) {
      const jobId = decodeURIComponent(url.pathname.slice('/api/progress/'.length));
      return json(progress.get(jobId) ?? null);
    }
    if (request.method === 'POST' && url.pathname.startsWith('/api/rpc/')) {
      return handleRpc(decodeURIComponent(url.pathname.slice('/api/rpc/'.length)), request);
    }
    return json({ error: 'Not found' }, 404);
  },
});

const close = (): void => {
  void server.stop(true);
  database.close();
};

process.once('SIGINT', close);
process.once('SIGTERM', close);

console.log(`QDB WSL backend: http://${server.hostname}:${server.port}`);
console.log(`SQLite database: ${databasePath}`);
console.log(`Exports: ${exportDirectory}`);
