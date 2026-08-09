import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { type DebugElement, getDebugNode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortHarness } from '@angular/material/sort/testing';
import { MatTableHarness } from '@angular/material/table/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import axe from 'axe-core';
import { provideNullable } from 'ngx-nullable';
import { BehaviorSubject, of } from 'rxjs';

import type {
  Entity,
  EntityFilterOptions,
  EntityKind,
  League,
  PageRequest,
  Player,
  ProjectSummary,
  Result,
  Team,
} from '../../../../../shared/contracts';
import { formatUiTimestamp } from '../../../../../shared/ui-format';
import { DesktopApi } from '../../../core/desktop-api';
import { ENTITY_STATUS_SETTINGS_STORAGE_KEY } from '../../../core/entity-status-settings.service';
import { entityColumnPreferenceKey } from './entity-column-preferences';
import { entityFilterPreferenceKey } from './entity-filter-preferences';
import { EntityTablePage } from './entity-table-page';

interface PageSetup {
  entity: EntityKind;
  options: EntityFilterOptions;
  referenceDate?: string;
  initialQuery?: Record<string, string | string[]>;
  rows?: Entity[];
  rowsAfterDelete?: Entity[];
  rowsAfterUpdate?: Entity[];
  total?: number;
  deleteLeagueResult?: Result<ProjectSummary>;
  deleteLeaguesResult?: Result<ProjectSummary>;
  deleteTeamResult?: Result<ProjectSummary>;
  deleteTeamsResult?: Result<ProjectSummary>;
  deletePlayerResult?: Result<ProjectSummary>;
  deletePlayersResult?: Result<ProjectSummary>;
  updateLeagueCountriesResult?: Result<ProjectSummary>;
  updateLeagueTiersResult?: Result<ProjectSummary>;
  updateTeamCountriesResult?: Result<ProjectSummary>;
}

const projectSummary = (referenceDate = '2026-01-01'): ProjectSummary => ({
  id: 'project-id',
  name: 'Project',
  referenceDate,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  leagueCount: 1,
  teamCount: 0,
  playerCount: 0,
  sourceNames: [],
});

const createPage = async ({
  entity,
  options,
  referenceDate = '2026-01-01',
  initialQuery = {},
  rows = [],
  rowsAfterDelete = rows,
  rowsAfterUpdate = rows,
  total = rows.length,
  deleteTeamResult = {
    ok: true,
    value: projectSummary(),
  },
  deleteLeagueResult = deleteTeamResult,
  deleteLeaguesResult = deleteLeagueResult,
  deleteTeamsResult = deleteTeamResult,
  deletePlayerResult = deleteTeamResult,
  deletePlayersResult = deletePlayerResult,
  updateLeagueCountriesResult = deleteTeamResult,
  updateLeagueTiersResult = deleteTeamResult,
  updateTeamCountriesResult = deleteTeamResult,
}: PageSetup) => {
  const queryParams = new BehaviorSubject(convertToParamMap(initialQuery));
  const currentQuery: Record<string, unknown> = { ...initialQuery };
  let entityDeleted = false;
  let entityUpdated = false;
  const api = {
    getProjectSummary: vi.fn(() =>
      Promise.resolve({ ok: true as const, value: projectSummary(referenceDate) }),
    ),
    listEntities: vi.fn((request: PageRequest) =>
      Promise.resolve({
        ok: true as const,
        value: {
          rows: entityDeleted ? rowsAfterDelete : entityUpdated ? rowsAfterUpdate : rows,
          total: entityDeleted ? rowsAfterDelete.length : total,
          pageIndex: request.pageIndex,
          pageSize: request.pageSize,
        },
      }),
    ),
    listEntityFilterOptions: vi.fn(() => Promise.resolve({ ok: true as const, value: options })),
    deleteLeague: vi.fn(() => {
      if (deleteLeagueResult.ok) entityDeleted = true;
      return Promise.resolve(deleteLeagueResult);
    }),
    deleteLeagues: vi.fn(() => {
      if (deleteLeaguesResult.ok) entityDeleted = true;
      return Promise.resolve(deleteLeaguesResult);
    }),
    updateLeagueCountries: vi.fn(() => {
      if (updateLeagueCountriesResult.ok) entityUpdated = true;
      return Promise.resolve(updateLeagueCountriesResult);
    }),
    updateLeagueTiers: vi.fn(() => {
      if (updateLeagueTiersResult.ok) entityUpdated = true;
      return Promise.resolve(updateLeagueTiersResult);
    }),
    deleteTeam: vi.fn(() => {
      if (deleteTeamResult.ok) entityDeleted = true;
      return Promise.resolve(deleteTeamResult);
    }),
    deleteTeams: vi.fn(() => {
      if (deleteTeamsResult.ok) entityDeleted = true;
      return Promise.resolve(deleteTeamsResult);
    }),
    updateTeamCountries: vi.fn(() => {
      if (updateTeamCountriesResult.ok) entityUpdated = true;
      return Promise.resolve(updateTeamCountriesResult);
    }),
    updateEntityCustomBadges: vi.fn(() => {
      entityUpdated = true;
      return Promise.resolve({
        ok: true as const,
        value: { updatedEntityCount: 1 },
      });
    }),
    deletePlayer: vi.fn(() => {
      if (deletePlayerResult.ok) entityDeleted = true;
      return Promise.resolve(deletePlayerResult);
    }),
    deletePlayers: vi.fn(() => {
      if (deletePlayersResult.ok) entityDeleted = true;
      return Promise.resolve(deletePlayersResult);
    }),
  };
  const snackBar = { open: vi.fn() };
  const router = {
    navigate: vi.fn(
      (
        _commands: unknown[],
        extras: { queryParams?: Record<string, unknown> },
      ): Promise<boolean> => {
        for (const [key, value] of Object.entries(extras.queryParams ?? {})) {
          if (value === null) Reflect.deleteProperty(currentQuery, key);
          else currentQuery[key] = value;
        }
        queryParams.next(convertToParamMap(currentQuery));
        return Promise.resolve(true);
      },
    ),
  };
  await TestBed.configureTestingModule({
    imports: [EntityTablePage],
    providers: [
      provideNullable(),
      { provide: DesktopApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
          snapshot: { data: { entity } },
          queryParamMap: queryParams.asObservable(),
        },
      },
      { provide: Router, useValue: router },
      { provide: MatSnackBar, useValue: snackBar },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(EntityTablePage);
  await fixture.whenStable();
  return {
    api,
    fixture,
    documentLoader: TestbedHarnessEnvironment.documentRootLoader(fixture),
    loader: TestbedHarnessEnvironment.loader(fixture),
    queryParams,
    router,
    snackBar,
  };
};

const leagueRecord = (
  id: string,
  name: string,
  country?: { name: string; code2: string; code3: string },
): League => ({
  id,
  projectId: 'project-id',
  sourceName: 'transfermarkt',
  sourceId: id,
  name,
  countryName: country?.name,
  countryCode2: country?.code2,
  countryCode3: country?.code3,
  sourceUrl: `https://example.test/${id}`,
  teamCount: id === 'league-a' ? 20 : 16,
  playerCount: id === 'league-a' ? 500 : 300,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const teamRecord = (
  id: string,
  name: string,
  playerCount: number,
  country?: { name: string; code2: string; code3: string },
): Team => ({
  id,
  projectId: 'project-id',
  sourceName: 'transfermarkt',
  sourceId: id,
  name,
  countryName: country?.name,
  countryCode2: country?.code2,
  countryCode3: country?.code3,
  sourceUrl: `https://example.test/${id}`,
  playerCount,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const playerRecord = (id: string, name: string): Player => ({
  id,
  projectId: 'project-id',
  teamId: 'team-id',
  sourceName: 'transfermarkt',
  sourceId: id,
  name,
  sourceUrl: `https://example.test/${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const columnButtonHarness = MatButtonHarness.with({ selector: '[aria-label^="Choose columns"]' });
const rowCheckboxHarness = MatCheckboxHarness.with({
  selector: 'td.mat-column-select mat-checkbox',
});
const selectAllCheckboxHarness = MatCheckboxHarness.with({
  selector: 'th.mat-column-select mat-checkbox',
});
const selectedActions = 'aside[aria-label^="Selected "]';

describe('EntityTablePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each<{ entity: EntityKind; options: EntityFilterOptions; hiddenColumns: number }>([
    {
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
      hiddenColumns: 5,
    },
    {
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      hiddenColumns: 6,
    },
    {
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      hiddenColumns: 7,
    },
  ])(
    'hides optional columns by default in the $entity table',
    async ({ entity, options, hiddenColumns }) => {
      const { fixture, loader } = await createPage({ entity, options });
      const table = await loader.getHarness(MatTableHarness);
      const headers = await table.getHeaderRows();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-page-header p')?.textContent,
      ).toContain('Source data');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-page-header p:last-of-type')
          ?.textContent,
      ).toContain(`Search and browse imported provider ${entity}`);
      expect(await headers[0]?.getCellTextByIndex()).not.toContain('Source ID');
      expect(await headers[0]?.getCellTextByIndex()).not.toContain('Created');
      const headerCells = await headers[0]?.getCellTextByIndex();
      expect(headerCells).not.toContain('Badge');
      expect(headerCells).not.toContain('Updated');
      expect(
        await (
          await loader.getHarness(columnButtonHarness)
        )
          .host()
          .then((host) => host.getAttribute('aria-label')),
      ).toBe(`Choose columns, ${hiddenColumns} hidden`);
      if (entity !== 'leagues') expect(headerCells).not.toContain('League');
      if (entity !== 'players') expect(headerCells).not.toContain('Season');
      if (entity === 'players') {
        expect(headerCells).toContain('Position detail');
        expect(headerCells).not.toContain('Team');
        expect(headerCells).not.toContain('Weight');
      }
    },
  );

  it('renders source player names with the same emphasis as combined player names', async () => {
    const { fixture } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      rows: [playerRecord('player-a', 'Ada Striker')],
    });
    const name = (fixture.nativeElement as HTMLElement).querySelector(
      'tbody .mat-column-name strong',
    );

    expect(name?.textContent).toContain('Ada Striker');
  });

  it('assigns a global custom badge from a row action and filters by it', async () => {
    const badge = {
      id: 'badge-review',
      name: 'Review',
      description: 'Needs manual review',
      color: 'purple' as const,
    };
    const player = playerRecord('player-a', 'Ada Striker');
    const { api, documentLoader, fixture, loader, router } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
        customBadges: [badge],
      },
      rows: [player],
      rowsAfterUpdate: [{ ...player, customBadges: [badge] }],
    });

    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));
    await menu.open();
    await menu.clickItem({ text: /Manage badges$/ });
    await documentLoader.getHarness(MatDialogHarness);
    const badgeCheckbox = await documentLoader.getHarness(
      MatCheckboxHarness.with({ label: /Review/ }),
    );
    await badgeCheckbox.check();
    await fixture.whenStable();
    const applyBadges = await documentLoader.getHarness(
      MatButtonHarness.with({ text: 'Apply badges' }),
    );
    expect(await applyBadges.isDisabled()).toBe(false);
    await applyBadges.click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(api.updateEntityCustomBadges).toHaveBeenCalledOnce());

    expect(api.updateEntityCustomBadges).toHaveBeenCalledWith({
      projectId: 'project-id',
      entity: 'players',
      ids: ['player-a'],
      addBadgeIds: ['badge-review'],
      removeBadgeIds: [],
    });
    expect(await documentLoader.getAllHarnesses(MatDialogHarness)).toHaveLength(0);

    await (await loader.getHarness(MatButtonHarness.with({ text: /Filters/ }))).click();
    const badges = await documentLoader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Filter players by badges"]' }),
    );
    await badges.open();
    await badges.clickOptions({ text: /Review/ });
    await fixture.whenStable();
    expect(await badges.getValueText()).toContain('Review');
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalled());

    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: expect.objectContaining({ badge: ['badge-review'] }),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      statuses: [],
      customBadgeIds: ['badge-review'],
    });
  });

  it.each([
    {
      entity: 'leagues' as const,
      options: { entity: 'leagues' as const, countries: [], seasons: [] },
      row: leagueRecord('league-status', 'Status League'),
    },
    {
      entity: 'teams' as const,
      options: {
        entity: 'teams' as const,
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      row: teamRecord('team-status', 'Status Team', 20),
    },
    {
      entity: 'players' as const,
      options: {
        entity: 'players' as const,
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      row: playerRecord('player-status', 'Status Player'),
    },
  ])(
    'renders derived statuses and an empty marker in the $entity badge column',
    async ({ entity, options, row }) => {
      window.localStorage.setItem(
        entityColumnPreferenceKey(entity),
        JSON.stringify({
          version: 2,
          order: ['name', 'badge', 'actions'],
          visible: ['name', 'badge', 'actions'],
        }),
      );
      const recentCreatedAt = new Date().toISOString();
      const { api, fixture, loader } = await createPage({
        entity,
        options,
        referenceDate: '2020-07-24',
        rows: [
          {
            ...row,
            createdAt: recentCreatedAt,
            updatedAt: '2020-01-24T23:59:59.999Z',
            customBadges: [
              {
                id: 'badge-review',
                name: 'Review',
                description: 'Needs manual review',
                color: 'purple',
              },
            ],
          },
          {
            ...row,
            id: `${row.id}-plain`,
            name: `${row.name} Plain`,
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-25T00:00:00.000Z',
          },
        ],
      });
      const table = await loader.getHarness(MatTableHarness);
      const rows = await table.getRows();

      expect((await rows[0].getCellTextByColumnName())['badge'].replace(/\s+/g, ' ').trim()).toBe(
        'New Old Review',
      );
      expect((await rows[1].getCellTextByColumnName())['badge']).toBe('—');
      expect(
        Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll(
            '.mat-column-badge app-entity-status-badge span',
          ),
          (badge) => badge.textContent.trim(),
        ),
      ).toEqual(['New', 'Old']);
      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector('.mat-column-badge app-custom-badge span')
          ?.getAttribute('title'),
      ).toBe('Needs manual review');
      expect(api.getProjectSummary).toHaveBeenCalledWith('project-id');
      if (entity === 'teams') {
        expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);
      }
    },
  );

  it('uses the global badge ages for finder requests and displayed statuses', async () => {
    window.localStorage.setItem(
      ENTITY_STATUS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ newDays: 10, oldMonths: 2 }),
    );
    window.localStorage.setItem(
      entityColumnPreferenceKey('teams'),
      JSON.stringify({
        version: 2,
        order: ['name', 'badge', 'actions'],
        visible: ['name', 'badge', 'actions'],
      }),
    );
    const createdAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { api, loader } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      referenceDate: '2020-07-24',
      rows: [
        {
          ...teamRecord('configured-status', 'Configured status', 1),
          createdAt,
          updatedAt: '2020-05-24T23:59:59.999Z',
        },
      ],
    });

    const rows = await (await loader.getHarness(MatTableHarness)).getRows();
    expect((await rows[0].getCellTextByColumnName())['badge'].replace(/\s+/g, ' ').trim()).toBe(
      'New Old',
    );
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      statusSettings: { newDays: 10, oldMonths: 2 },
    });
  });

  it('keeps the Badge column configurable and non-sortable', async () => {
    const { api, documentLoader, fixture, loader } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      rows: [teamRecord('team-id', 'Team', 20)],
    });
    await (await loader.getHarness(columnButtonHarness)).click();
    const badgeColumn = await documentLoader.getHarness(
      MatCheckboxHarness.with({ label: 'Badge' }),
    );
    expect(await badgeColumn.isChecked()).toBe(false);
    expect(await badgeColumn.isDisabled()).toBe(false);
    await badgeColumn.check();
    await fixture.whenStable();
    expect(await badgeColumn.isChecked()).toBe(true);
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(entityColumnPreferenceKey('teams')) ?? '{}',
      ) as { visible?: string[] };
      expect(stored.visible).toContain('badge');
    });

    const header = (await (await loader.getHarness(MatTableHarness)).getHeaderRows())[0];
    expect(await header.getCellTextByIndex()).toContain('Badge');
    const sort = await loader.getHarness(MatSortHarness);
    const badgeHeader = (await sort.getSortHeaders({ label: 'Badge' }))[0];
    const callsBeforeClick = api.listEntities.mock.calls.length;

    expect(await badgeHeader.isDisabled()).toBe(true);
    await badgeHeader.click();
    await fixture.whenStable();
    expect(api.listEntities).toHaveBeenCalledTimes(callsBeforeClick);
  });

  it.each([
    {
      entity: 'teams' as const,
      options: {
        entity: 'teams' as const,
        leagues: [{ id: 'league-id', name: 'Alpha League' }],
        hasTeamsWithoutLeague: true,
        countries: [],
        seasons: [],
      },
      rows: [
        {
          ...teamRecord('team-with-league', 'Alpha FC', 20),
          leagueId: 'league-id',
          leagueName: 'Alpha League',
        },
        teamRecord('team-without-league', 'Independent FC', 18),
      ],
    },
    {
      entity: 'players' as const,
      options: {
        entity: 'players' as const,
        teams: [{ id: 'team-id', name: 'Alpha FC' }],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      rows: [
        {
          id: 'player-with-league',
          projectId: 'project-id',
          teamId: 'team-id',
          teamName: 'Alpha FC',
          leagueName: 'Alpha League',
          sourceName: 'transfermarkt' as const,
          sourceId: 'player-with-league',
          name: 'Player One',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'player-without-league',
          projectId: 'project-id',
          teamId: 'independent-team',
          teamName: 'Independent FC',
          sourceName: 'transfermarkt' as const,
          sourceId: 'player-without-league',
          name: 'Player Two',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ])(
    'offers League as a hidden, persisted, sortable $entity column',
    async ({ entity, options, rows }) => {
      const { api, documentLoader, fixture, loader } = await createPage({
        entity,
        options,
        rows,
      });

      await (await loader.getHarness(columnButtonHarness)).click();
      const leagueColumn = await documentLoader.getHarness(
        MatCheckboxHarness.with({ label: 'League' }),
      );
      expect(await leagueColumn.isChecked()).toBe(false);
      await leagueColumn.check();
      await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
      await fixture.whenStable();

      await vi.waitFor(() => {
        const stored = JSON.parse(
          window.localStorage.getItem(entityColumnPreferenceKey(entity)) ?? '{}',
        ) as { visible?: string[] };
        expect(stored.visible).toContain('leagueName');
      });
      const table = await loader.getHarness(MatTableHarness);
      const header = (await table.getHeaderRows())[0];
      expect(await header.getCellTextByIndex()).toContain('League');
      const tableRows = await table.getRows();
      const firstRow = tableRows[0];
      const secondRow = tableRows[1];
      expect((await firstRow.getCellTextByColumnName())['leagueName']).toBe('Alpha League');
      expect((await secondRow.getCellTextByColumnName())['leagueName']).toBe('—');

      const sort = await loader.getHarness(MatSortHarness);
      await (await sort.getSortHeaders({ label: 'League' }))[0]?.click();
      await fixture.whenStable();
      expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
        sort: 'leagueName',
        direction: 'asc',
      });
    },
  );

  it('offers the owning team as a hidden player column and sorts it when displayed', async () => {
    const player: Player = {
      id: 'player-id',
      projectId: 'project-id',
      teamId: 'team-id',
      teamName: 'Alpha FC',
      sourceName: 'transfermarkt',
      sourceId: 'player-id',
      name: 'Player One',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { api, documentLoader, fixture, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [{ id: 'team-id', name: 'Alpha FC' }],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      rows: [player],
    });

    await (await loader.getHarness(columnButtonHarness)).click();
    const teamColumn = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Team' }));
    expect(await teamColumn.isChecked()).toBe(false);
    await teamColumn.check();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(entityColumnPreferenceKey('players')) ?? '{}',
      ) as { visible?: string[] };
      expect(stored.visible).toContain('teamName');
    });

    const table = await loader.getHarness(MatTableHarness);
    const header = (await table.getHeaderRows())[0];
    expect(await header.getCellTextByIndex()).toContain('Team');
    const firstRow = (await table.getRows())[0];
    expect((await firstRow.getCellTextByColumnName())['teamName']).toBe('Alpha FC');

    const sort = await loader.getHarness(MatSortHarness);
    const teamSortHeader = (await sort.getSortHeaders({ label: 'Team' }))[0];
    await teamSortHeader.click();
    await fixture.whenStable();
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      sort: 'teamName',
      direction: 'asc',
    });
  });

  it('offers Weight as a hidden player column, formats kilograms, and sorts it when displayed', async () => {
    const { api, documentLoader, fixture, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      rows: [
        { ...playerRecord('weighted-player', 'Weighted Player'), weight: 82 },
        playerRecord('unknown-weight', 'Unknown Weight'),
      ],
    });

    const table = await loader.getHarness(MatTableHarness);
    expect(await (await table.getHeaderRows())[0].getCellTextByIndex()).not.toContain('Weight');

    await (await loader.getHarness(columnButtonHarness)).click();
    const weightColumn = await documentLoader.getHarness(
      MatCheckboxHarness.with({ label: 'Weight' }),
    );
    expect(await weightColumn.isChecked()).toBe(false);
    await weightColumn.check();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();

    await vi.waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(entityColumnPreferenceKey('players')) ?? '{}',
      ) as { visible?: string[] };
      expect(stored.visible).toContain('weight');
    });
    const rows = await table.getRows();
    expect((await rows[0].getCellTextByColumnName())['weight']).toBe('82 kg');
    expect((await rows[1].getCellTextByColumnName())['weight']).toBe('—');

    const sort = await loader.getHarness(MatSortHarness);
    await (await sort.getSortHeaders({ label: 'Weight' }))[0]?.click();
    await fixture.whenStable();
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      sort: 'weight',
      direction: 'asc',
    });
  });

  it('renders and sorts the detailed player position as a raw code', async () => {
    const player: Player = {
      id: 'player-id',
      projectId: 'project-id',
      teamId: 'team-id',
      sourceName: 'transfermarkt',
      sourceId: 'striker-id',
      name: 'Striker',
      positionDetail: 'ST',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { api, fixture, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: ['ST'],
        feet: [],
      },
      rows: [player],
    });
    const row = (await (await loader.getHarness(MatTableHarness)).getRows())[0];
    expect((await row.getCellTextByColumnName())['positionDetail']).toBe('ST');
    const detailBadge = (fixture.nativeElement as HTMLElement).querySelector(
      'app-position-detail-badge abbr',
    );
    expect(detailBadge?.classList).toContain('bg-position-attacker');

    const sort = await loader.getHarness(MatSortHarness);
    await (await sort.getSortHeaders({ label: 'Position detail' }))[0]?.click();
    await fixture.whenStable();
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      sort: 'positionDetail',
      direction: 'asc',
    });
  });

  it('restores saved filters for an unfiltered project table', async () => {
    window.localStorage.setItem(
      entityFilterPreferenceKey('project-id', 'players'),
      JSON.stringify({
        version: 1,
        filters: {
          parentIds: ['team-a', 'missing-team'],
          includeTeamsWithoutLeague: false,
          seasons: [],
          nationalities: ['Senegal', 'Missing'],
          positions: ['ATTACKER'],
          positionDetails: ['ST'],
          feet: ['RIGHT'],
        },
      }),
    );
    const { api, router } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [{ id: 'team-a', name: 'Alpha FC' }],
        nationalities: [{ name: 'Senegal', code: 'SN' }],
        positions: ['ATTACKER'],
        positionDetails: ['ST'],
        feet: ['RIGHT'],
      },
    });

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        leagueId: null,
        noLeague: null,
        noTier: null,
        tier: null,
        teamId: ['team-a'],
        season: null,
        country: null,
        nationality: ['Senegal'],
        position: ['ATTACKER'],
        positionDetail: ['ST'],
        foot: ['RIGHT'],
        badge: null,
        sourceName: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      teamIds: ['team-a'],
      nationalities: ['Senegal'],
      positions: ['ATTACKER'],
      positionDetails: ['ST'],
      feet: ['RIGHT'],
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(entityFilterPreferenceKey('project-id', 'players')) ?? '',
      ),
    ).toEqual({
      version: 6,
      filters: {
        parentIds: ['team-a'],
        includeTeamsWithoutLeague: false,
        tiers: [],
        includeLeaguesWithoutTier: false,
        seasons: [],
        countries: [],
        nationalities: ['Senegal'],
        positions: ['ATTACKER'],
        positionDetails: ['ST'],
        feet: ['RIGHT'],
        sourceNames: [],
        statuses: [],
        customBadgeIds: [],
      },
    });
  });

  it('lets an explicit filtered link replace the complete saved filter set', async () => {
    window.localStorage.setItem(
      entityFilterPreferenceKey('project-id', 'teams'),
      JSON.stringify({
        version: 2,
        filters: {
          parentIds: ['league-a'],
          includeTeamsWithoutLeague: false,
          seasons: ['2025'],
          nationalities: [],
          positions: [],
          positionDetails: [],
          feet: [],
          sourceNames: [],
        },
      }),
    );
    await createPage({
      entity: 'teams',
      initialQuery: { leagueId: ['league-b'] },
      options: {
        entity: 'teams',
        sourceNames: ['transfermarkt', 'soccerway'],
        leagues: [
          { id: 'league-a', name: 'League A' },
          { id: 'league-b', name: 'League B' },
        ],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: ['2025'],
      },
    });

    await vi.waitFor(() =>
      expect(
        JSON.parse(
          window.localStorage.getItem(entityFilterPreferenceKey('project-id', 'teams')) ?? '',
        ),
      ).toEqual({
        version: 6,
        filters: {
          parentIds: ['league-b'],
          includeTeamsWithoutLeague: false,
          tiers: [],
          includeLeaguesWithoutTier: false,
          seasons: [],
          countries: [],
          nationalities: [],
          positions: [],
          positionDetails: [],
          feet: [],
          sourceNames: [],
          statuses: [],
          customBadgeIds: [],
        },
      }),
    );
  });

  it('stages, persists, cancels, and resets configurable columns with required actions', async () => {
    const { documentLoader, fixture, loader } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
    });
    const columnButton = await loader.getHarness(columnButtonHarness);
    expect(await (await columnButton.host()).getAttribute('aria-label')).toBe(
      'Choose columns, 5 hidden',
    );

    await columnButton.click();
    await fixture.whenStable();
    const drawer = await documentLoader.getHarness(MatDialogHarness);
    expect(await drawer.getAriaLabelledby()).toBe('entity-column-title');
    const name = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Name' }));
    const created = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Created' }));
    const season = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Season' }));
    const actions = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Actions' }));
    expect(await name.isChecked()).toBe(true);
    expect(await name.isDisabled()).toBe(true);
    expect(await created.isChecked()).toBe(false);
    expect(await season.isChecked()).toBe(false);
    expect(await actions.isChecked()).toBe(true);
    expect(await actions.isDisabled()).toBe(true);
    await created.check();
    const stagedNameHandle = await documentLoader.getHarness(
      MatButtonHarness.with({ selector: 'button[aria-label="Reorder Name column"]' }),
    );
    await (await stagedNameHandle.host()).sendKeys(TestKey.DOWN_ARROW, TestKey.DOWN_ARROW);
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Cancel' }))).click();
    await fixture.whenStable();
    await vi.waitFor(async () =>
      expect(await documentLoader.getAllHarnesses(MatDialogHarness)).toHaveLength(0),
    );

    let header = (
      await loader.getHarness(MatTableHarness).then((table) => table.getHeaderRows())
    )[0];
    expect(await header.getCellTextByIndex()).toEqual([
      '',
      'Name',
      'Source',
      'Country',
      'Tier',
      'Teams',
      'Source page',
      'Actions',
    ]);

    await columnButton.click();
    await (await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Created' }))).check();
    await (await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Season' }))).check();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? '{}',
      ) as { visible?: string[] };
      expect(stored.visible).toContain('createdAt');
    });

    header = (await loader.getHarness(MatTableHarness).then((table) => table.getHeaderRows()))[0];
    expect(await header.getCellTextByIndex()).toContain('Created');
    expect(await header.getCellTextByIndex()).toContain('Actions');
    expect(
      JSON.parse(
        window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? '',
      ) as unknown,
    ).toEqual({
      version: 2,
      order: [
        'name',
        'badge',
        'sourceName',
        'leagueCountry',
        'tier',
        'sourceId',
        'season',
        'teamCount',
        'sourceUrl',
        'createdAt',
        'updatedAt',
        'actions',
      ],
      visible: [
        'name',
        'sourceName',
        'leagueCountry',
        'tier',
        'season',
        'teamCount',
        'sourceUrl',
        'createdAt',
        'actions',
      ],
    });

    await columnButton.click();
    const resetNameHandle = await documentLoader.getHarness(
      MatButtonHarness.with({ selector: 'button[aria-label="Reorder Name column"]' }),
    );
    await (await resetNameHandle.host()).sendKeys(TestKey.DOWN_ARROW, TestKey.DOWN_ARROW);
    await (
      await documentLoader.getHarness(MatButtonHarness.with({ text: 'Reset to defaults' }))
    ).click();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(
        JSON.parse(window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? ''),
      ).toEqual({
        version: 2,
        order: [
          'name',
          'badge',
          'sourceName',
          'leagueCountry',
          'tier',
          'sourceId',
          'season',
          'teamCount',
          'sourceUrl',
          'createdAt',
          'updatedAt',
          'actions',
        ],
        visible: [
          'name',
          'sourceName',
          'leagueCountry',
          'tier',
          'teamCount',
          'sourceUrl',
          'actions',
        ],
      }),
    );
    header = (await loader.getHarness(MatTableHarness).then((table) => table.getHeaderRows()))[0];
    expect(await header.getCellTextByIndex()).toContain('Actions');
    expect(await header.getCellTextByIndex()).not.toContain('Created');
    expect(await header.getCellTextByIndex()).not.toContain('Season');
  });

  it('reorders hidden columns by pointer drop and retains their position when enabled', async () => {
    const { documentLoader, fixture, loader } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
    });
    const columnButton = await loader.getHarness(columnButtonHarness);
    await columnButton.click();
    await fixture.whenStable();

    const dropList = document.querySelector<HTMLElement>(
      'app-entity-column-editor div[role="list"]',
    );
    if (!dropList) throw new Error('Column drop list was not created.');
    const debugElement = getDebugNode(dropList) as DebugElement | null;
    if (!debugElement) throw new Error('Column drop list debug element was not created.');
    debugElement.triggerEventHandler('cdkDropListDropped', {
      previousIndex: 5,
      currentIndex: 8,
    });
    await fixture.whenStable();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(window.localStorage.getItem(entityColumnPreferenceKey('leagues'))).not.toBeNull(),
    );

    expect(
      JSON.parse(window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? ''),
    ).toMatchObject({
      order: [
        'name',
        'badge',
        'sourceName',
        'leagueCountry',
        'tier',
        'season',
        'teamCount',
        'sourceUrl',
        'sourceId',
        'createdAt',
        'updatedAt',
        'actions',
      ],
    });

    await columnButton.click();
    await (
      await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Source ID' }))
    ).check();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? '{}',
      ) as { visible?: string[] };
      expect(stored.visible).toContain('sourceId');
    });

    const header = (await (await loader.getHarness(MatTableHarness)).getHeaderRows())[0];
    expect(await header.getCellTextByIndex()).toEqual([
      '',
      'Name',
      'Source',
      'Country',
      'Tier',
      'Teams',
      'Source page',
      'Source ID',
      'Actions',
    ]);
  });

  it('moves required columns with the keyboard without reloading table data', async () => {
    const { api, documentLoader, fixture, loader } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
    });
    const callsBeforeReordering = api.listEntities.mock.calls.length;
    await (await loader.getHarness(columnButtonHarness)).click();
    await fixture.whenStable();
    const nameHandle = await documentLoader.getHarness(
      MatButtonHarness.with({ selector: 'button[aria-label="Reorder Name column"]' }),
    );
    const handleElement = await nameHandle.host();
    await handleElement.sendKeys(TestKey.DOWN_ARROW, TestKey.DOWN_ARROW);
    await fixture.whenStable();
    expect(
      document.querySelector('app-entity-column-editor [aria-live="polite"]')?.textContent,
    ).toContain('Name moved to position 3 of 12.');
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? '{}',
      ) as { order?: string[] };
      expect(stored.order?.indexOf('name')).toBe(2);
    });

    const header = (await (await loader.getHarness(MatTableHarness)).getHeaderRows())[0];
    expect(await header.getCellTextByIndex()).toEqual([
      '',
      'Source',
      'Name',
      'Country',
      'Tier',
      'Teams',
      'Source page',
      'Actions',
    ]);
    expect(api.listEntities).toHaveBeenCalledTimes(callsBeforeReordering);
  });

  it('shows player timestamps and resets hidden active sorting and pagination', async () => {
    const player: Player = {
      id: 'player-id',
      projectId: 'project-id',
      teamId: 'team-id',
      sourceName: 'transfermarkt',
      sourceId: 'player-1',
      name: 'Player One',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    };
    window.localStorage.setItem(
      entityColumnPreferenceKey('players'),
      JSON.stringify([
        'name',
        'sourceId',
        'countryName',
        'jerseyNumber',
        'position',
        'birthdate',
        'height',
        'foot',
        'joined',
        'contractExpires',
        'marketValue',
        'createdAt',
        'updatedAt',
      ]),
    );
    const { api, documentLoader, fixture, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      rows: [player],
      total: 100,
    });
    const table = await loader.getHarness(MatTableHarness);
    const row = (await table.getRows())[0];
    const rowText = await row.getCellTextByColumnName();
    expect(rowText['sourceId']).toBe(player.sourceId);
    expect(rowText['positionDetail']).toBeUndefined();
    expect(rowText['createdAt']).toBe(formatUiTimestamp(player.createdAt));
    expect(rowText['updatedAt']).toBe(formatUiTimestamp(player.updatedAt));

    const sort = await loader.getHarness(MatSortHarness);
    const createdHeader = (await sort.getSortHeaders({ label: 'Created' }))[0];
    await createdHeader.click();
    await fixture.whenStable();
    await (await loader.getHarness(MatPaginatorHarness)).goToNextPage();
    await fixture.whenStable();
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      sort: 'createdAt',
      direction: 'asc',
      pageIndex: 1,
    });

    await (await loader.getHarness(columnButtonHarness)).click();
    await (
      await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Created' }))
    ).uncheck();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
        sort: 'name',
        direction: 'asc',
        pageIndex: 0,
      }),
    );
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      sort: 'name',
      direction: 'asc',
      pageIndex: 0,
    });
  });

  it('shows accessible edit and refresh actions for league rows', async () => {
    const league: League = {
      id: 'league-id',
      projectId: 'project-id',
      sourceName: 'transfermarkt',
      sourceId: 'GB1',
      name: 'Premier League',
      countryName: 'England',
      countryCode2: 'GB',
      countryCode3: 'ENG',
      season: '2026',
      sourceUrl: 'https://example.test/GB1',
      teamCount: 20,
      playerCount: 501,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const api = {
      getProjectSummary: vi.fn(() =>
        Promise.resolve({ ok: true as const, value: projectSummary() }),
      ),
      listEntities: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { rows: [league], total: 1, pageIndex: 0, pageSize: 25 },
        }),
      ),
      listEntityFilterOptions: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { entity: 'leagues' as const, countries: [], seasons: ['2026'] },
        }),
      ),
    };
    const router = { navigate: vi.fn() };
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(undefined) })) };
    await TestBed.configureTestingModule({
      imports: [EntityTablePage],
      providers: [
        provideNullable(),
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
            snapshot: { data: { entity: 'leagues' } },
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntityTablePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('button[aria-label="Actions for Premier League"]')).toBeTruthy();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const table = await loader.getHarness(MatTableHarness);
    const header = (await table.getHeaderRows())[0];
    expect((await header.getCellTextByIndex()).slice(0, 4)).toEqual([
      '',
      'Name',
      'Source',
      'Country',
    ]);
    expect(await (await table.getRows())[0].getCellTextByColumnName()).toMatchObject({
      leagueCountry: 'England',
    });
    const countryFlag = element.querySelector('.mat-column-leagueCountry img');
    expect(countryFlag?.getAttribute('alt')).toBe('');
    expect(countryFlag?.getAttribute('src')).toContain('flags/20x15/gb-eng.png');
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));
    await menu.open();
    const items = await menu.getItems();
    const itemTexts = await Promise.all(items.map((item) => item.getText()));
    expect(itemTexts.map((text) => text.endsWith('Edit'))).toContain(true);
    expect(itemTexts.map((text) => text.endsWith('Refresh'))).toContain(true);
    expect(itemTexts.map((text) => text.endsWith('Delete'))).toContain(true);

    await menu.clickItem({ text: /Edit$/ });
    expect(dialog.open).toHaveBeenCalledOnce();
    await menu.open();
    await menu.clickItem({ text: /Refresh$/ });
    expect(router.navigate).toHaveBeenCalledWith(['../import'], {
      relativeTo: expect.anything(),
      queryParams: {
        operation: 'synchronize',
        entity: 'leagues',
        targetId: 'league-id',
        returnTo: 'leagues',
      },
    });
  });

  it('selects visible leagues with accessible row and indeterminate header checkboxes', async () => {
    const { fixture, loader } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
      rows: [leagueRecord('league-a', 'Alpha League'), leagueRecord('league-b', 'Beta League')],
      total: 51,
    });
    const alpha = await loader.getHarness(rowCheckboxHarness);
    const selectAll = await loader.getHarness(selectAllCheckboxHarness);

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLInputElement>('td.mat-column-select mat-checkbox input')
        ?.getAttribute('aria-label'),
    ).toBe('Select Alpha League');
    expect((fixture.nativeElement as HTMLElement).querySelector(selectedActions)).toBeNull();
    await alpha.check();
    await fixture.whenStable();
    expect(await selectAll.isIndeterminate()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 league selected');
    expect(
      await loader.getHarness(MatButtonHarness.with({ text: /Change country$/ })),
    ).toBeTruthy();
    expect(await loader.getHarness(MatButtonHarness.with({ text: /Delete$/ }))).toBeTruthy();
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);

    await selectAll.check();
    await fixture.whenStable();
    expect(await selectAll.isChecked()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 leagues selected');

    const paginator = await loader.getHarness(MatPaginatorHarness);
    await paginator.goToNextPage();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector(selectedActions)).toBeNull();

    await (await loader.getHarness(selectAllCheckboxHarness)).check();
    const sort = await loader.getHarness(MatSortHarness);
    await (await sort.getSortHeaders({ label: 'Name' }))[0]?.click();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector(selectedActions)).toBeNull();
  });

  it('selects visible teams with entity-aware accessible labels', async () => {
    const { fixture, loader } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      rows: [teamRecord('team-a', 'Alpha FC', 28), teamRecord('team-b', 'Beta FC', 29)],
    });
    const rowCheckboxes = await loader.getAllHarnesses(rowCheckboxHarness);
    const selectAll = await loader.getHarness(selectAllCheckboxHarness);

    expect(rowCheckboxes).toHaveLength(2);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLInputElement>('td.mat-column-select mat-checkbox input')
        ?.getAttribute('aria-label'),
    ).toBe('Select Alpha FC');
    await rowCheckboxes[0]?.check();
    await fixture.whenStable();

    const footer = (fixture.nativeElement as HTMLElement).querySelector(
      'aside[aria-label^="Selected "]',
    );
    expect(footer?.getAttribute('aria-label')).toBe('Selected team actions');
    expect(footer?.textContent).toContain('1 team selected');
    expect(await selectAll.isIndeterminate()).toBe(true);
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);

    await selectAll.check();
    await fixture.whenStable();
    expect(await selectAll.isChecked()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 teams selected');
  });

  it('preserves mixed custom badge assignments until a bulk tri-state choice changes them', async () => {
    const badge = {
      id: 'badge-review',
      name: 'Review',
      description: 'Needs manual review',
      color: 'purple' as const,
    };
    const { api, documentLoader, fixture, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
        customBadges: [badge],
      },
      rows: [
        { ...playerRecord('player-a', 'Ada Striker'), customBadges: [badge] },
        playerRecord('player-b', 'Bea Keeper'),
      ],
    });
    await (await loader.getHarness(selectAllCheckboxHarness)).check();
    await fixture.whenStable();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Manage badges$/ }))).click();
    const badgeCheckbox = await documentLoader.getHarness(
      MatCheckboxHarness.with({ label: /Review/ }),
    );
    expect(await badgeCheckbox.isIndeterminate()).toBe(true);

    await badgeCheckbox.check();
    await fixture.whenStable();
    await (
      await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply badges' }))
    ).click();
    await vi.waitFor(() => expect(api.updateEntityCustomBadges).toHaveBeenCalledOnce());
    expect(api.updateEntityCustomBadges).toHaveBeenCalledWith({
      projectId: 'project-id',
      entity: 'players',
      ids: ['player-a', 'player-b'],
      addBadgeIds: ['badge-review'],
      removeBadgeIds: [],
    });
  });

  it('keeps player rows read-only and deletes one player from its actions dropdown', async () => {
    const player = playerRecord('player-a', 'Ada Striker');
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      rows: [player],
      rowsAfterDelete: [],
    });
    const table = await loader.getHarness(MatTableHarness);
    const headerCells = await (await table.getHeaderRows())[0].getCellTextByIndex();
    expect(headerCells[0]).toBe('');
    expect(headerCells).toContain('Actions');

    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));
    await menu.open();
    expect(await Promise.all((await menu.getItems()).map((item) => item.getText()))).toEqual([
      'labelManage badges',
      'deleteDelete',
    ]);
    await menu.clickItem({ text: /Delete$/ });
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    expect(await dialog.getRole()).toBe('alertdialog');
    expect(await dialog.getTitleText()).toBe('Delete player?');
    expect(await dialog.getText()).toContain('Ada Striker');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete player' }))).click();

    await vi.waitFor(() => expect(api.deletePlayer).toHaveBeenCalledWith('project-id', 'player-a'));
    await fixture.whenStable();
    expect(snackBar.open).toHaveBeenCalledWith('Player deleted.', 'Dismiss', { duration: 3000 });
  });

  it('multiselects and bulk deletes players without exposing editable bulk fields', async () => {
    const players = [
      playerRecord('player-a', 'Ada Striker'),
      playerRecord('player-b', 'Ben Keeper'),
    ];
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
      rows: players,
      rowsAfterDelete: [],
    });

    await (await loader.getHarness(selectAllCheckboxHarness)).check();
    await fixture.whenStable();
    const footer = (fixture.nativeElement as HTMLElement).querySelector(
      'aside[aria-label^="Selected "]',
    );
    expect(footer?.getAttribute('aria-label')).toBe('Selected player actions');
    expect(footer?.textContent).toContain('2 players selected');
    expect(
      await loader.getAllHarnesses(MatButtonHarness.with({ text: /Change country$/ })),
    ).toHaveLength(0);
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);

    await (await loader.getHarness(MatButtonHarness.with({ text: /Delete$/ }))).click();
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe('Delete selected players?');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete 2 players' }))).click();

    await vi.waitFor(() =>
      expect(api.deletePlayers).toHaveBeenCalledWith('project-id', ['player-a', 'player-b']),
    );
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector(selectedActions)).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('2 players deleted.', 'Dismiss', {
      duration: 3000,
    });
  });

  it('bulk deletes selected teams with aggregate player counts and clamps pagination', async () => {
    const teams = [teamRecord('team-a', 'Alpha FC', 28), teamRecord('team-b', 'Beta FC', 29)];
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      rows: teams,
      rowsAfterDelete: [],
      total: 27,
    });
    const paginator = await loader.getHarness(MatPaginatorHarness);
    await paginator.goToNextPage();
    await (await loader.getHarness(selectAllCheckboxHarness)).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Delete$/ }))).click();
    const dialog = await documentLoader.getHarness(MatDialogHarness);

    expect(await dialog.getTitleText()).toBe('Delete selected teams?');
    expect(await dialog.getText()).toContain('2 teams selected');
    expect(await dialog.getText()).toContain('57 players');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete 2 teams' }))).click();

    await vi.waitFor(() =>
      expect(api.deleteTeams).toHaveBeenCalledWith('project-id', ['team-a', 'team-b']),
    );
    await fixture.whenStable();
    expect(api.listEntities.mock.calls.at(-1)?.[0]).toMatchObject({ pageIndex: 0 });
    expect((fixture.nativeElement as HTMLElement).querySelector(selectedActions)).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('2 teams deleted.', 'Dismiss', {
      duration: 3000,
    });
  });

  it('changes the country for selected teams', async () => {
    const teams = [
      teamRecord('team-a', 'Alpha FC', 28, {
        name: 'Czech Republic',
        code2: 'CZ',
        code3: 'CZE',
      }),
      teamRecord('team-b', 'Beta FC', 29, {
        name: 'England',
        code2: 'GB',
        code3: 'ENG',
      }),
    ];
    const updated = teams.map((team) => ({
      ...team,
      countryName: 'Slovakia',
      countryCode2: 'SK',
      countryCode3: 'SVK',
    }));
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      rows: teams,
      rowsAfterUpdate: updated,
    });
    await (await loader.getHarness(selectAllCheckboxHarness)).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Change country$/ }))).click();
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe('Change country for selected teams');
    expect(await dialog.getText()).toContain('selected teams currently have different countries');
    const autocomplete = await documentLoader.getHarness(MatAutocompleteHarness);
    await autocomplete.enterText('svk');
    await autocomplete.selectOption({ text: 'Slovakia' });
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Apply country' }))).click();

    await vi.waitFor(() =>
      expect(api.updateTeamCountries).toHaveBeenCalledWith(
        'project-id',
        ['team-a', 'team-b'],
        'SVK',
      ),
    );
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector(selectedActions)).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Country updated for 2 teams.', 'Dismiss', {
      duration: 3000,
    });
  });

  it('clears a common team country and retains selection when the update fails', async () => {
    const teams = [
      teamRecord('team-a', 'Alpha FC', 28, {
        name: 'Czech Republic',
        code2: 'CZ',
        code3: 'CZE',
      }),
      teamRecord('team-b', 'Beta FC', 29, {
        name: 'Czech Republic',
        code2: 'CZ',
        code3: 'CZE',
      }),
    ];
    const failure: Result<ProjectSummary> = {
      ok: false,
      error: { code: 'DATABASE', message: 'Team countries could not be updated.' },
    };
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      rows: teams,
      updateTeamCountriesResult: failure,
    });
    await (await loader.getHarness(selectAllCheckboxHarness)).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Change country$/ }))).click();
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    const autocomplete = await documentLoader.getHarness(MatAutocompleteHarness);
    expect(await autocomplete.getValue()).toBe('Czech Republic');
    await autocomplete.clear();
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Clear country' }))).click();

    await vi.waitFor(() =>
      expect(api.updateTeamCountries).toHaveBeenCalledWith(
        'project-id',
        ['team-a', 'team-b'],
        undefined,
      ),
    );
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 teams selected');
    expect(api.listEntities).toHaveBeenCalledOnce();
    expect(snackBar.open).toHaveBeenCalledWith('Team countries could not be updated.', 'Dismiss', {
      duration: 6000,
    });
  });

  it('disables team bulk actions while deleting and retains selection when deletion fails', async () => {
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        countries: [],
        seasons: [],
      },
      rows: [teamRecord('team-a', 'Alpha FC', 28)],
    });
    let resolveDelete!: (result: Result<ProjectSummary>) => void;
    api.deleteTeams.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );
    await (await loader.getHarness(selectAllCheckboxHarness)).check();
    const countryButton = await loader.getHarness(
      MatButtonHarness.with({ text: /Change country$/ }),
    );
    const deleteButton = await loader.getHarness(MatButtonHarness.with({ text: /Delete$/ }));
    await deleteButton.click();
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete 1 team' }))).click();

    await vi.waitFor(() => expect(api.deleteTeams).toHaveBeenCalledWith('project-id', ['team-a']));
    await fixture.whenStable();
    expect(await countryButton.isDisabled()).toBe(true);
    expect(await deleteButton.isDisabled()).toBe(true);

    resolveDelete({
      ok: false,
      error: { code: 'DATABASE', message: 'Selected teams could not be deleted.' },
    });
    await vi.waitFor(() =>
      expect(snackBar.open).toHaveBeenCalledWith(
        'Selected teams could not be deleted.',
        'Dismiss',
        { duration: 6000 },
      ),
    );
    await fixture.whenStable();
    expect(await countryButton.isDisabled()).toBe(false);
    expect(await deleteButton.isDisabled()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 team selected');
    expect(api.listEntities).toHaveBeenCalledOnce();
  });
});
