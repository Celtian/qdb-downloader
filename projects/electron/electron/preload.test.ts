import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type { QdbDesktopApi } from '../shared/contracts.js';
import { defaultExportColumns } from '../shared/export-schema.js';

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
    await api.deleteProject({ projectId: 'project' });
    await api.deleteLeague({ projectId: 'project', id: 'league', mode: 'league-only' });
    await api.deleteLeagues({
      projectId: 'project',
      ids: ['league-a', 'league-b'],
      mode: 'league-and-teams',
    });
    await api.updateLeagueCountries({
      projectId: 'project',
      ids: ['league-a', 'league-b'],
      countryCode3: 'CZE',
    });
    await api.deleteTeam({ projectId: 'project', id: 'team' });
    await api.deleteTeams({ projectId: 'project', ids: ['team-a', 'team-b'] });
    await api.updateTeamCountries({
      projectId: 'project',
      ids: ['team-a', 'team-b'],
      countryCode3: 'CZE',
    });
    await api.deletePlayer({ projectId: 'project', id: 'player' });
    await api.deletePlayers({ projectId: 'project', ids: ['player-a', 'player-b'] });
    await api.previewSourceDataDeletion({
      projectId: 'project',
      sourceNames: ['transfermarkt', 'soccerway'],
    });
    await api.deleteSourceData({
      projectId: 'project',
      sourceNames: ['transfermarkt', 'soccerway'],
    });
    await api.getProjectSummary({ projectId: 'project' });
    await api.getEntity({ projectId: 'project', entity: 'teams', id: 'team' });
    await api.updateEntityMetadata({
      projectId: 'project',
      entity: 'teams',
      id: 'team',
      name: 'Team',
      sourceId: '281',
      countryCode3: 'ENG',
    });
    await api.listEntities({
      projectId: 'project',
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    });
    await api.listEntityFilterOptions({ projectId: 'project', entity: 'players' });
    await api.previewLeague({ sourceName: 'transfermarkt', identifierOrUrl: 'GB1' });
    await api.previewTeam({ sourceName: 'transfermarkt', identifierOrUrl: '281', name: 'Team' });
    await api.previewTeams({ sourceName: 'transfermarkt', jobId: 'job', teams: [] });
    await api.cancelScrape({ jobId: 'job' });
    const importRequest = {
      projectId: 'project',
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'teams' as const, id: 'team' },
        options: {
          absentPlayers: 'keep' as const,
          overridePlayerNames: false,
          playerTeamConflicts: 'move' as const,
        },
      },
      teams: [],
    };
    await api.previewImportChanges(importRequest);
    await api.commitImport(importRequest);
    await api.chooseExportDirectory();
    await api.exportProject({
      projectId: 'project',
      format: 'json',
      columns: defaultExportColumns(),
      destination: '/tmp',
      includeTeamsWithoutLeague: true,
      leagueIds: ['league'],
    });
    await api.openExportDirectory({ directory: '/tmp/export' });

    const calls = electron.invoke.mock.calls as unknown as [string, unknown?][];
    expect(calls.map(([channel]) => channel)).toEqual([
      'qdb:projects:list',
      'qdb:projects:create',
      'qdb:projects:rename',
      'qdb:projects:delete',
      'qdb:leagues:delete',
      'qdb:leagues:delete-many',
      'qdb:leagues:update-country-many',
      'qdb:teams:delete',
      'qdb:teams:delete-many',
      'qdb:teams:update-country-many',
      'qdb:players:delete',
      'qdb:players:delete-many',
      'qdb:data:preview-delete-sources',
      'qdb:data:delete-sources',
      'qdb:projects:summary',
      'qdb:entities:get',
      'qdb:entities:update-metadata',
      'qdb:entities:list',
      'qdb:entities:filter-options',
      'qdb:scrape:league',
      'qdb:scrape:team',
      'qdb:scrape:teams',
      'qdb:scrape:cancel',
      'qdb:import:preview-changes',
      'qdb:import:commit',
      'qdb:export:choose-directory',
      'qdb:export:project',
      'qdb:export:open-directory',
    ]);
    expect(calls.find(([channel]) => channel === 'qdb:entities:update-metadata')?.[1]).toEqual({
      projectId: 'project',
      entity: 'teams',
      id: 'team',
      name: 'Team',
      sourceId: '281',
      countryCode3: 'ENG',
    });
    expect(calls.find(([channel]) => channel === 'qdb:import:preview-changes')?.[1]).toEqual(
      importRequest,
    );
    expect(calls.find(([channel]) => channel === 'qdb:import:commit')?.[1]).toEqual(importRequest);
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
