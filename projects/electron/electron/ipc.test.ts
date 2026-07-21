import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SnapshotDatabase } from './database.js';
import type { SnapshotExporter } from './exporter.js';
import type { TransfermarktScraper } from './scraper.js';
import { defaultExportColumns } from '../shared/export-schema.js';

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
    const deleteProject = vi.fn(() => ({ id: 'project' }));
    const getEntity = vi.fn(() => ({ id: 'league', name: 'Premier League' }));
    const updateEntityMetadata = vi.fn(() => ({ id: 'league', name: 'Premier League' }));
    const listEntityFilterOptions = vi.fn(() => ({ entity: 'leagues', seasons: ['2026'] }));
    const previewImportChanges = vi.fn(() => ({
      changes: {
        leagues: { added: 0, updated: 1, preserved: 0, deleted: 0 },
        teams: { added: 0, updated: 0, preserved: 0, moved: 0, detached: 0, deleted: 0 },
        players: {
          added: 0,
          updated: 0,
          preserved: 0,
          moved: 0,
          deduplicated: 0,
          deleted: 0,
        },
      },
      conflicts: {
        existingRecords: [],
        teamLeagueConflicts: [],
        playerTeamConflicts: [],
      },
    }));
    const database = {
      listProjects,
      renameProject,
      deleteProject,
      getProjectSummary: vi.fn(() => ({ id: 'project' })),
      getEntity,
      updateEntityMetadata,
      listEntities: vi.fn(() => ({ rows: [], total: 0, pageIndex: 0, pageSize: 25 })),
      listEntityFilterOptions,
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
    const exporter = {
      chooseDirectory: vi.fn(() => undefined),
      export: vi.fn(() => undefined),
    } as unknown as SnapshotExporter;

    registerIpcHandlers({
      database,
      scraper,
      exporter,
      shell: { openPath: electron.openPath } as never,
      removeExportDirectory: vi.fn(() => Promise.resolve()),
    });

    expect(electron.handlers.size).toBe(18);
    await invoke(channels.listProjects);
    await invoke(channels.renameProject, { projectId: 'project', name: 'Renamed' });
    await invoke(channels.deleteProject, { projectId: 'project' });
    await invoke(channels.getEntity, { projectId: 'project', entity: 'leagues', id: 'league' });
    await invoke(channels.updateEntityMetadata, {
      projectId: 'project',
      entity: 'leagues',
      id: 'league',
      name: 'Premier League',
      externalId: 'GB1',
    });
    await invoke(channels.listEntityFilterOptions, {
      projectId: 'project',
      entity: 'leagues',
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
          teamLeagueConflicts: 'move',
          playerTeamConflicts: 'move',
        },
      },
      teams: [],
    };
    await invoke(channels.previewImportChanges, importRequest);
    await invoke(channels.previewTeams, { jobId: 'job', teams: [] });
    expect(listProjects).toHaveBeenCalledOnce();
    expect(renameProject).toHaveBeenCalledWith({ projectId: 'project', name: 'Renamed' });
    expect(deleteProject).toHaveBeenCalledWith('project');
    expect(getEntity).toHaveBeenCalledWith({
      projectId: 'project',
      entity: 'leagues',
      id: 'league',
    });
    expect(updateEntityMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'league', externalId: 'GB1' }),
      expect.stringContaining('GB1'),
    );
    expect(listEntityFilterOptions).toHaveBeenCalledWith({
      projectId: 'project',
      entity: 'leagues',
    });
    expect(previewImportChanges).toHaveBeenCalledWith(importRequest);
    expect(electron.send).toHaveBeenCalledWith(
      channels.scrapeProgress,
      expect.objectContaining({ jobId: 'job', completed: 1 }),
    );
  });

  test('cleans known project exports, reports failures, and keeps failed folders accessible', async () => {
    const deleteProject = vi.fn(() => ({ id: 'project' }));
    const database = {
      listProjects: vi.fn(() => {
        throw new Error('database failed');
      }),
      getProjectSummary: vi.fn(() => ({ id: 'project' })),
      deleteProject,
    } as unknown as SnapshotDatabase;
    const scraper = {} as TransfermarktScraper;
    const exporter = {
      chooseDirectory: vi.fn(() => '/tmp/destination'),
      export: vi
        .fn()
        .mockResolvedValueOnce({
          directory: '/tmp/export',
          files: ['/tmp/export/leagues.json'],
        })
        .mockResolvedValueOnce({
          directory: '/tmp/export-failed',
          files: ['/tmp/export-failed/leagues.json'],
        }),
    } as unknown as SnapshotExporter;
    const removeExportDirectory = vi.fn((directory: string) =>
      directory.endsWith('failed')
        ? Promise.reject(new Error('folder is locked'))
        : Promise.resolve(),
    );
    registerIpcHandlers({
      database,
      scraper,
      exporter,
      shell: { openPath: electron.openPath } as never,
      removeExportDirectory,
    });

    await expect(invoke(channels.listProjects)).resolves.toMatchObject({
      ok: false,
      error: { code: 'DATABASE' },
    });
    await expect(
      invoke(channels.openExportDirectory, { directory: '/tmp/not-exported' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    const exportRequest = {
      projectId: 'project',
      format: 'json' as const,
      columns: defaultExportColumns(),
      destination: '/tmp/destination',
      includeTeamsWithoutLeague: true,
      leagueIds: ['league'],
    };
    await expect(invoke(channels.exportProject, exportRequest)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
    await invoke(channels.chooseExportDirectory);
    await invoke(channels.exportProject, exportRequest);
    await invoke(channels.exportProject, { ...exportRequest, format: 'csv' });
    await expect(
      invoke(channels.openExportDirectory, { directory: '/tmp/export' }),
    ).resolves.toEqual({ ok: true, value: true });
    await expect(invoke(channels.deleteProject, { projectId: 'project' })).resolves.toEqual({
      ok: true,
      value: {
        projectId: 'project',
        deletedExportCount: 1,
        failedExportDirectories: ['/tmp/export-failed'],
      },
    });
    expect(deleteProject).toHaveBeenCalledWith('project');
    expect(removeExportDirectory).toHaveBeenCalledWith('/tmp/export');
    expect(removeExportDirectory).toHaveBeenCalledWith('/tmp/export-failed');
    await expect(
      invoke(channels.openExportDirectory, { directory: '/tmp/export' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    await expect(
      invoke(channels.openExportDirectory, { directory: '/tmp/export-failed' }),
    ).resolves.toEqual({ ok: true, value: true });
  });
});
