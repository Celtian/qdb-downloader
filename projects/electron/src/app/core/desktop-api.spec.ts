import { TestBed } from '@angular/core/testing';
import type {
  ExportConfigurationPreference,
  ExportFieldNamePresetPreference,
  ExportVisibilityPresetPreference,
  ProjectSummary,
} from '../../../shared/contracts';
import { camelCaseExportFieldNames, defaultExportColumns } from '../../../shared/export-schema';
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

  it('forwards custom badge definitions and entity assignments to the desktop bridge', async () => {
    const listCustomBadges = vi.fn(() => Promise.resolve({ ok: true as const, value: [] }));
    const createCustomBadge = vi.fn((request) =>
      Promise.resolve({
        ok: true as const,
        value: { id: 'badge-review', ...request, assignmentCount: 0 },
      }),
    );
    const updateEntityCustomBadges = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: { updatedEntityCount: 2 } }),
    );
    const listCombinedCustomBadges = vi.fn(() => Promise.resolve({ ok: true as const, value: [] }));
    const createCombinedCustomBadge = vi.fn((request) =>
      Promise.resolve({
        ok: true as const,
        value: { id: 'combined-badge-review', ...request, assignmentCount: 0 },
      }),
    );
    const updateCombinedEntityCustomBadges = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: { updatedEntityCount: 2 } }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        listCustomBadges,
        createCustomBadge,
        updateEntityCustomBadges,
        listCombinedCustomBadges,
        createCombinedCustomBadge,
        updateCombinedEntityCustomBadges,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();
    const badgeInput = {
      name: 'Review',
      description: 'Needs manual review',
      color: 'purple' as const,
    };
    const assignment = {
      projectId: 'project',
      entity: 'players' as const,
      ids: ['player-a', 'player-b'],
      addBadgeIds: ['badge-review'],
      removeBadgeIds: [],
    };

    await connectedService.listCustomBadges();
    await connectedService.createCustomBadge(badgeInput);
    await connectedService.updateEntityCustomBadges(assignment);
    await connectedService.listCombinedCustomBadges();
    await connectedService.createCombinedCustomBadge(badgeInput);
    await connectedService.updateCombinedEntityCustomBadges(assignment);

    expect(listCustomBadges).toHaveBeenCalledOnce();
    expect(createCustomBadge).toHaveBeenCalledWith(badgeInput);
    expect(updateEntityCustomBadges).toHaveBeenCalledWith(assignment);
    expect(listCombinedCustomBadges).toHaveBeenCalledOnce();
    expect(createCombinedCustomBadge).toHaveBeenCalledWith(badgeInput);
    expect(updateCombinedEntityCustomBadges).toHaveBeenCalledWith(assignment);
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

  it('forwards export preferences to the desktop bridge', async () => {
    const getExportVisibilityPresets = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [],
      }),
    );
    const updateExportVisibilityPresets = vi.fn(
      ({ presets }: { presets: ExportVisibilityPresetPreference[] }) =>
        Promise.resolve({
          ok: true as const,
          value: presets,
        }),
    );
    const getExportFieldNamePresets = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: undefined,
      }),
    );
    const updateExportFieldNamePresets = vi.fn(
      ({ presets }: { presets: ExportFieldNamePresetPreference[] }) =>
        Promise.resolve({
          ok: true as const,
          value: presets,
        }),
    );
    const configuration: ExportConfigurationPreference = {
      dataset: 'combined',
      format: 'csv',
      columns: defaultExportColumns(),
      fieldNames: camelCaseExportFieldNames(),
    };
    const getExportConfiguration = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: configuration }),
    );
    const updateExportConfiguration = vi.fn(
      ({ configuration: updated }: { configuration: ExportConfigurationPreference }) =>
        Promise.resolve({ ok: true as const, value: updated }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        getExportVisibilityPresets,
        updateExportVisibilityPresets,
        getExportFieldNamePresets,
        updateExportFieldNamePresets,
        getExportConfiguration,
        updateExportConfiguration,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await connectedService.getExportVisibilityPresets();
    await connectedService.updateExportVisibilityPresets([]);
    await connectedService.getExportFieldNamePresets();
    await connectedService.updateExportFieldNamePresets([]);
    await connectedService.getExportConfiguration();
    await connectedService.updateExportConfiguration(configuration);

    expect(getExportVisibilityPresets).toHaveBeenCalledOnce();
    expect(updateExportVisibilityPresets).toHaveBeenCalledWith({ presets: [] });
    expect(getExportFieldNamePresets).toHaveBeenCalledOnce();
    expect(updateExportFieldNamePresets).toHaveBeenCalledWith({ presets: [] });
    expect(getExportConfiguration).toHaveBeenCalledOnce();
    expect(updateExportConfiguration).toHaveBeenCalledWith({ configuration });
  });

  it('forwards source priority and combined-data operations through the desktop bridge', async () => {
    const getSourcePriority = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: ['transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal'] as const,
      }),
    );
    const updateSourcePriority = vi.fn((request) =>
      Promise.resolve({ ok: true as const, value: request.sourceNames }),
    );
    const listCombinedEntities = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { rows: [], total: 0, pageIndex: 0, pageSize: 25 },
      }),
    );
    const listCombinedEntityFilterOptions = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          entity: 'teams' as const,
          leagues: [],
          hasTeamsWithoutLeague: false,
          countries: [],
        },
      }),
    );
    const listCombineTeamCandidates = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [],
      }),
    );
    const previewTeamCombination = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          sourceTeams: [],
          matchGroups: [],
          conflicts: [],
          sourceLeagues: [],
          combinedLeagues: [],
          existingResolutions: {},
          existingPlayerResolutions: {},
        },
      }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        getSourcePriority,
        updateSourcePriority,
        listCombinedEntityFilterOptions,
        listCombinedEntities,
        listCombineTeamCandidates,
        previewTeamCombination,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();
    const priority = ['soccerway', 'transfermarkt', 'worldfootball', 'eurofotbal'] as const;

    await connectedService.getSourcePriority();
    await connectedService.updateSourcePriority([...priority]);
    await connectedService.listCombinedEntityFilterOptions({
      projectId: 'project',
      entity: 'teams',
    });
    await connectedService.listCombinedEntities({
      projectId: 'project',
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    });
    await connectedService.listCombineTeamCandidates(
      'project',
      'Team',
      'transfermarkt',
      'combined-team',
      'source-league',
    );
    await connectedService.previewTeamCombination({
      projectId: 'project',
      sourceTeamIds: ['one', 'two'],
    });

    expect(updateSourcePriority).toHaveBeenCalledWith({ sourceNames: [...priority] });
    expect(listCombinedEntityFilterOptions).toHaveBeenCalledWith({
      projectId: 'project',
      entity: 'teams',
    });
    expect(listCombinedEntities).toHaveBeenCalledOnce();
    expect(listCombineTeamCandidates).toHaveBeenCalledWith({
      projectId: 'project',
      search: 'Team',
      sourceName: 'transfermarkt',
      combinedTeamId: 'combined-team',
      leagueId: 'source-league',
    });
    expect(previewTeamCombination).toHaveBeenCalledOnce();
  });

  it('forwards export folder restoration and selection to the desktop bridge', async () => {
    const getExportDestination = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: '/tmp/remembered' }),
    );
    const chooseExportDirectory = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: '/tmp/export' }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        getExportDestination,
        chooseExportDirectory,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(connectedService.getExportDestination()).resolves.toEqual({
      ok: true,
      value: '/tmp/remembered',
    });
    await expect(connectedService.chooseExportDirectory()).resolves.toEqual({
      ok: true,
      value: '/tmp/export',
    });
    expect(getExportDestination).toHaveBeenCalledOnce();
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

  it('deletes all projects and clears the published project summary', async () => {
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
    const renameProject = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    const deleteAllProjects = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          deletedProjectCount: 2,
          deletedExportCount: 1,
          failedExportDirectories: [],
        },
      }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        renameProject,
        deleteAllProjects,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();
    await connectedService.renameProject('project', 'Project');

    await expect(connectedService.deleteAllProjects()).resolves.toMatchObject({
      ok: true,
      value: { deletedProjectCount: 2 },
    });
    expect(deleteAllProjects).toHaveBeenCalledOnce();
    expect(connectedService.projectUpdated()).toBeUndefined();
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

  it('deletes selected teams and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 0,
      playerCount: 0,
      sourceNames: [],
    };
    const deleteTeams = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        deleteTeams,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(connectedService.deleteTeams('project', ['team-a', 'team-b'])).resolves.toEqual({
      ok: true,
      value: project,
    });
    expect(deleteTeams).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['team-a', 'team-b'],
    });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('deletes players and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 1,
      playerCount: 0,
      sourceNames: ['transfermarkt'],
    };
    const deletePlayer = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    const deletePlayers = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        deletePlayer,
        deletePlayers,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(connectedService.deletePlayer('project', 'player-a')).resolves.toEqual({
      ok: true,
      value: project,
    });
    await expect(
      connectedService.deletePlayers('project', ['player-a', 'player-b']),
    ).resolves.toEqual({ ok: true, value: project });
    expect(deletePlayer).toHaveBeenCalledWith({ projectId: 'project', id: 'player-a' });
    expect(deletePlayers).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['player-a', 'player-b'],
    });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('deletes selected combined entities and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 1,
      playerCount: 20,
      combinedLeagueCount: 1,
      combinedTeamCount: 1,
      combinedPlayerCount: 1,
      sourceNames: ['transfermarkt', 'soccerway'],
    };
    const deleteCombinedLeagues = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: project }),
    );
    const deleteCombinedTeams = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    const deleteCombinedPlayers = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: project }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        deleteCombinedLeagues,
        deleteCombinedTeams,
        deleteCombinedPlayers,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.deleteCombinedLeagues(
        'project',
        ['combined-league-a', 'combined-league-b'],
        true,
      ),
    ).resolves.toEqual({ ok: true, value: project });
    await expect(
      connectedService.deleteCombinedTeams('project', ['combined-team-a', 'combined-team-b']),
    ).resolves.toEqual({ ok: true, value: project });
    await expect(
      connectedService.deleteCombinedPlayers('project', ['combined-player-a', 'combined-player-b']),
    ).resolves.toEqual({ ok: true, value: project });
    expect(deleteCombinedLeagues).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['combined-league-a', 'combined-league-b'],
      cascade: true,
    });
    expect(deleteCombinedTeams).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['combined-team-a', 'combined-team-b'],
    });
    expect(deleteCombinedPlayers).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['combined-player-a', 'combined-player-b'],
    });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('updates selected team countries and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 2,
      playerCount: 20,
      sourceNames: ['transfermarkt'],
    };
    const updateTeamCountries = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        updateTeamCountries,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.updateTeamCountries('project', ['team-a', 'team-b'], 'CZE'),
    ).resolves.toEqual({ ok: true, value: project });
    expect(updateTeamCountries).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['team-a', 'team-b'],
      countryCode3: 'CZE',
    });
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

  it('deletes selected leagues and publishes the refreshed project summary', async () => {
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
    const deleteLeagues = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        deleteLeagues,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.deleteLeagues('project', ['league-a', 'league-b'], 'league-and-teams'),
    ).resolves.toEqual({ ok: true, value: project });
    expect(deleteLeagues).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['league-a', 'league-b'],
      mode: 'league-and-teams',
    });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('updates selected league countries and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 2,
      teamCount: 0,
      playerCount: 0,
      sourceNames: ['transfermarkt'],
    };
    const updateLeagueCountries = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: project }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        updateLeagueCountries,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.updateLeagueCountries('project', ['league-a', 'league-b'], 'CZE'),
    ).resolves.toEqual({ ok: true, value: project });
    expect(updateLeagueCountries).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['league-a', 'league-b'],
      countryCode3: 'CZE',
    });
    expect(connectedService.projectUpdated()).toEqual(project);
  });

  it('updates selected league tiers and publishes the refreshed project summary', async () => {
    const project: ProjectSummary = {
      id: 'project',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 2,
      teamCount: 0,
      playerCount: 0,
      sourceNames: ['transfermarkt'],
    };
    const updateLeagueTiers = vi.fn(() => Promise.resolve({ ok: true as const, value: project }));
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        updateLeagueTiers,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.updateLeagueTiers('project', ['league-a', 'league-b'], 4),
    ).resolves.toEqual({ ok: true, value: project });
    expect(updateLeagueTiers).toHaveBeenCalledWith({
      projectId: 'project',
      ids: ['league-a', 'league-b'],
      tier: 4,
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
