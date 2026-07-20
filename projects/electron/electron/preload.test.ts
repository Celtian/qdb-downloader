import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type { QdbDesktopApi } from '../shared/contracts.js';

const electron = vi.hoisted(() => {
  let exposed: unknown;
  return {
    getExposed: (): unknown => exposed,
    exposeInMainWorld: vi.fn((_name: string, api: unknown) => {
      exposed = api;
    }),
    invoke: vi.fn(() => Promise.resolve({ ok: true, value: undefined })),
    on: vi.fn(),
    removeListener: vi.fn(),
  };
});

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: electron.exposeInMainWorld },
  ipcRenderer: {
    invoke: electron.invoke,
    on: electron.on,
    removeListener: electron.removeListener,
  },
}));

describe('Electron preload bridge', () => {
  let api: QdbDesktopApi;

  beforeAll(async () => {
    await import('./preload.js');
    const exposed = electron.getExposed();
    if (typeof exposed !== 'object' || exposed === null) {
      throw new Error('Preload API was not exposed.');
    }
    api = exposed as QdbDesktopApi;
  });

  beforeEach(() => {
    electron.invoke.mockClear();
    electron.on.mockClear();
    electron.removeListener.mockClear();
  });

  test('exposes every desktop operation through fixed IPC channels', async () => {
    expect(electron.exposeInMainWorld).toHaveBeenCalledOnce();

    await api.listProjects();
    await api.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    await api.renameProject({ projectId: 'project', name: 'Winter 2026' });
    await api.getProjectSummary({ projectId: 'project' });
    await api.listEntities({
      projectId: 'project',
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    });
    await api.previewLeague({ identifierOrUrl: 'GB1' });
    await api.previewTeam({ identifierOrUrl: '281', name: 'Team' });
    await api.previewTeams({ jobId: 'job', teams: [] });
    await api.cancelScrape({ jobId: 'job' });
    await api.commitImport({ projectId: 'project', teams: [] });
    await api.exportProject({ projectId: 'project', format: 'json' });
    await api.openExportDirectory({ directory: '/tmp/export' });

    const calls = electron.invoke.mock.calls as unknown as [string, unknown?][];
    expect(calls.map(([channel]) => channel)).toEqual([
      'qdb:projects:list',
      'qdb:projects:create',
      'qdb:projects:rename',
      'qdb:projects:summary',
      'qdb:entities:list',
      'qdb:scrape:league',
      'qdb:scrape:team',
      'qdb:scrape:teams',
      'qdb:scrape:cancel',
      'qdb:import:commit',
      'qdb:export:project',
      'qdb:export:open-directory',
    ]);
  });

  test('removes the exact scrape progress listener when unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = api.onScrapeProgress(listener);
    const handler = electron.on.mock.calls[0]?.[1];

    handler({}, { jobId: 'job', completed: 1, total: 1, currentTeam: 'Team', canceled: false });
    unsubscribe();

    expect(listener).toHaveBeenCalledOnce();
    expect(electron.removeListener).toHaveBeenCalledWith('qdb:scrape:progress', handler);
  });
});
