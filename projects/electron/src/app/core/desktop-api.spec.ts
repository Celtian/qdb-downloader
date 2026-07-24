import { TestBed } from '@angular/core/testing';
import type { ProjectSummary } from '../../../shared/contracts';
import { DesktopApi } from './desktop-api';

describe('DesktopApi', () => {
  let service: DesktopApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesktopApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('forwards entity filter option requests to the desktop bridge', async () => {
    const listEntityFilterOptions = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          entity: 'players' as const,
          teams: [],
          nationalities: [],
          positions: [],
          positionDetails: [],
          feet: [],
        },
      }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        listEntityFilterOptions,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.listEntityFilterOptions({ projectId: 'project', entity: 'players' }),
    ).resolves.toMatchObject({ ok: true, value: { entity: 'players' } });
    expect(listEntityFilterOptions).toHaveBeenCalledWith({
      projectId: 'project',
      entity: 'players',
    });
  });

  it('forwards export folder selection to the desktop bridge', async () => {
    const chooseExportDirectory = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: '/tmp/export' }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        chooseExportDirectory,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(connectedService.chooseExportDirectory()).resolves.toEqual({
      ok: true,
      value: '/tmp/export',
    });
    expect(chooseExportDirectory).toHaveBeenCalledOnce();
  });

  it('deletes source data and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 2,
      playerCount: 3,
      sourceNames: ['transfermarkt'],
    };
    const deleteSourceData = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          project,
          deleted: { leagues: 2, teams: 3, players: 4 },
        },
      }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        deleteSourceData,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.deleteSourceData('project', ['transfermarkt', 'soccerway']),
    ).resolves.toMatchObject({
      ok: true,
      value: { deleted: { leagues: 2, teams: 3, players: 4 } },
    });
    expect(deleteSourceData).toHaveBeenCalledWith({
      projectId: 'project',
      sourceNames: ['transfermarkt', 'soccerway'],
    });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('deletes a team and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 1,
      playerCount: 10,
      sourceNames: ['transfermarkt'],
    };
    const deleteTeam = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        deleteTeam,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(connectedService.deleteTeam('project', 'team')).resolves.toEqual({
      ok: true,
      value: project,
    });
    expect(deleteTeam).toHaveBeenCalledWith({ projectId: 'project', id: 'team' });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('deletes a league with the selected mode and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
      sourceNames: [],
    };
    const deleteLeague = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        deleteLeague,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.deleteLeague('project', 'league', 'league-and-teams'),
    ).resolves.toEqual({
      ok: true,
      value: project,
    });
    expect(deleteLeague).toHaveBeenCalledWith({
      projectId: 'project',
      id: 'league',
      mode: 'league-and-teams',
    });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('previews source data deletion without publishing a project update', async () => {
    const previewSourceDataDeletion = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { leagues: 2, teams: 3, players: 40 },
      }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        previewSourceDataDeletion,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.previewSourceDataDeletion('project', ['transfermarkt', 'soccerway']),
    ).resolves.toEqual({
      ok: true,
      value: { leagues: 2, teams: 3, players: 40 },
    });
    expect(previewSourceDataDeletion).toHaveBeenCalledWith({
      projectId: 'project',
      sourceNames: ['transfermarkt', 'soccerway'],
    });
    expect(connectedService.projectUpdated()).toBeUndefined();
  });
});
