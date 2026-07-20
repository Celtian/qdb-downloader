import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SnapshotDatabase } from './database.js';
import type { SnapshotExporter } from './exporter.js';
import type { TransfermarktScraper } from './scraper.js';

const electron = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  send: vi.fn(),
  openPath: vi.fn(() => Promise.resolve('')),
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: () => ({ isDestroyed: () => false, webContents: { send: electron.send } }),
  },
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) =>
      electron.handlers.set(channel, handler),
  },
}));

import { channels, registerIpcHandlers } from './ipc.js';

const invoke = (channel: string, input?: unknown): Promise<unknown> => {
  const handler = electron.handlers.get(channel);
  if (!handler) throw new Error(`Missing handler for ${channel}`);
  return Promise.resolve(handler({ sender: {} }, input));
};

describe('Electron IPC handlers', () => {
  beforeEach(() => {
    electron.handlers.clear();
    vi.clearAllMocks();
  });

  test('registers the complete API and forwards progress to the requesting renderer', async () => {
    const listProjects = vi.fn(() => []);
    const renameProject = vi.fn(() => ({ id: 'project', name: 'Renamed' }));
    const getEntity = vi.fn(() => ({ id: 'league', name: 'Premier League' }));
    const updateEntityMetadata = vi.fn(() => ({ id: 'league', name: 'Premier League' }));
    const previewImportChanges = vi.fn(() => ({
      leagues: { added: 0, updated: 1, deleted: 0 },
      teams: { added: 0, updated: 0, detached: 0, deleted: 0 },
      players: { added: 0, updated: 0, deleted: 0 },
    }));
    const database = {
      listProjects,
      renameProject,
      getProjectSummary: vi.fn(() => ({ id: 'project' })),
      getEntity,
      updateEntityMetadata,
      listEntities: vi.fn(() => ({ rows: [], total: 0, pageIndex: 0, pageSize: 25 })),
      previewImportChanges,
      commitImport: vi.fn(() => ({ leagueCount: 0, teamCount: 1, playerCount: 0 })),
    } as unknown as SnapshotDatabase;
    const scraper = {
      previewLeague: vi.fn(() => ({ externalId: 'GB1', sourceUrl: 'url', teams: [] })),
      previewTeam: vi.fn(() => ({
        externalId: '281',
        name: 'Team',
        sourceUrl: 'url',
        players: [],
      })),
      previewTeams: vi.fn((_jobId, _teams, progress) => {
        progress({ jobId: 'job', completed: 1, total: 1, currentTeam: 'Team', canceled: false });
        return [];
      }),
      cancel: vi.fn(() => true),
    } as unknown as TransfermarktScraper;
    const exporter = { export: vi.fn(() => undefined) } as unknown as SnapshotExporter;

    registerIpcHandlers({
      database,
      scraper,
      exporter,
      shell: { openPath: electron.openPath } as never,
    });

    expect(electron.handlers.size).toBe(15);
    await invoke(channels.listProjects);
    await invoke(channels.renameProject, { projectId: 'project', name: 'Renamed' });
    await invoke(channels.getEntity, { projectId: 'project', entity: 'leagues', id: 'league' });
    await invoke(channels.updateEntityMetadata, {
      projectId: 'project',
      entity: 'leagues',
      id: 'league',
      name: 'Premier League',
      externalId: 'GB1',
    });
    const importRequest = {
      projectId: 'project',
      operation: {
        kind: 'synchronize',
        target: { entity: 'leagues', id: 'league' },
        options: {
          absentTeams: 'keep',
          absentPlayers: 'keep',
          overrideTeamNames: false,
          overridePlayerNames: false,
        },
      },
      teams: [],
    };
    await invoke(channels.previewImportChanges, importRequest);
    await invoke(channels.previewTeams, { jobId: 'job', teams: [] });
    expect(listProjects).toHaveBeenCalledOnce();
    expect(renameProject).toHaveBeenCalledWith({ projectId: 'project', name: 'Renamed' });
    expect(getEntity).toHaveBeenCalledWith({
      projectId: 'project',
      entity: 'leagues',
      id: 'league',
    });
    expect(updateEntityMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'league', externalId: 'GB1' }),
      expect.stringContaining('GB1'),
    );
    expect(previewImportChanges).toHaveBeenCalledWith(importRequest);
    expect(electron.send).toHaveBeenCalledWith(
      channels.scrapeProgress,
      expect.objectContaining({ jobId: 'job', completed: 1 }),
    );
  });

  test('converts failures and only opens directories produced by export', async () => {
    const database = {
      listProjects: vi.fn(() => {
        throw new Error('database failed');
      }),
      getProjectSummary: vi.fn(() => ({ id: 'project' })),
    } as unknown as SnapshotDatabase;
    const scraper = {} as TransfermarktScraper;
    const exporter = {
      export: vi.fn(() => ({ directory: '/tmp/export', files: ['/tmp/export/leagues.json'] })),
    } as unknown as SnapshotExporter;
    registerIpcHandlers({
      database,
      scraper,
      exporter,
      shell: { openPath: electron.openPath } as never,
    });

    await expect(invoke(channels.listProjects)).resolves.toMatchObject({
      ok: false,
      error: { code: 'DATABASE' },
    });
    await expect(
      invoke(channels.openExportDirectory, { directory: '/tmp/not-exported' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    await invoke(channels.exportProject, { projectId: 'project', format: 'json' });
    await expect(
      invoke(channels.openExportDirectory, { directory: '/tmp/export' }),
    ).resolves.toEqual({ ok: true, value: true });
  });
});
