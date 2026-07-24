import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { getDebugNode, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatChipGridHarness } from '@angular/material/chips/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortHarness } from '@angular/material/sort/testing';
import { MatTableHarness } from '@angular/material/table/testing';
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
import { DesktopApi } from '../../../core/desktop-api';
import { entityColumnPreferenceKey } from './entity-column-preferences';
import { entityFilterPreferenceKey } from './entity-filter-preferences';
import { EntityTablePage } from './entity-table-page';

interface PageSetup {
  entity: EntityKind;
  options: EntityFilterOptions;
  initialQuery?: Record<string, string | string[]>;
  rows?: Entity[];
  rowsAfterDelete?: Entity[];
  total?: number;
  deleteLeagueResult?: Result<ProjectSummary>;
  deleteTeamResult?: Result<ProjectSummary>;
}

const createPage = async ({
  entity,
  options,
  initialQuery = {},
  rows = [],
  rowsAfterDelete = rows,
  total = rows.length,
  deleteTeamResult = {
    ok: true,
    value: {
      id: 'project-id',
      name: 'Project',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 0,
      playerCount: 0,
      sourceNames: [],
    },
  },
  deleteLeagueResult = deleteTeamResult,
}: PageSetup) => {
  const queryParams = new BehaviorSubject(convertToParamMap(initialQuery));
  const currentQuery: Record<string, unknown> = { ...initialQuery };
  let entityDeleted = false;
  const api = {
    listEntities: vi.fn((request: PageRequest) =>
      Promise.resolve({
        ok: true as const,
        value: {
          rows: entityDeleted ? rowsAfterDelete : rows,
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
    deleteTeam: vi.fn(() => {
      if (deleteTeamResult.ok) entityDeleted = true;
      return Promise.resolve(deleteTeamResult);
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

describe('EntityTablePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each<{ entity: EntityKind; options: EntityFilterOptions }>([
    { entity: 'leagues', options: { entity: 'leagues', countries: [], seasons: [] } },
    {
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: false,
        seasons: [],
      },
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
    },
  ])(
    'hides timestamps and Source ID by default in the $entity table',
    async ({ entity, options }) => {
      const { loader } = await createPage({ entity, options });
      const table = await loader.getHarness(MatTableHarness);
      const headers = await table.getHeaderRows();

      expect(await headers[0]?.getCellTextByIndex()).not.toContain('Source ID');
      expect(await headers[0]?.getCellTextByIndex()).not.toContain('Created');
      const headerCells = await headers[0]?.getCellTextByIndex();
      expect(headerCells).not.toContain('Updated');
      if (entity === 'players') expect(headerCells).toContain('Position detail');
    },
  );

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
    expect(detailBadge?.classList).toContain('position-badge--attacker');

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
        teamId: ['team-a'],
        season: null,
        country: null,
        nationality: ['Senegal'],
        position: ['ATTACKER'],
        positionDetail: ['ST'],
        foot: ['RIGHT'],
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
      version: 2,
      filters: {
        parentIds: ['team-a'],
        includeTeamsWithoutLeague: false,
        seasons: [],
        countries: [],
        nationalities: ['Senegal'],
        positions: ['ATTACKER'],
        positionDetails: ['ST'],
        feet: ['RIGHT'],
        sourceNames: [],
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
        seasons: ['2025'],
      },
    });

    await vi.waitFor(() =>
      expect(
        JSON.parse(
          window.localStorage.getItem(entityFilterPreferenceKey('project-id', 'teams')) ?? '',
        ),
      ).toEqual({
        version: 2,
        filters: {
          parentIds: ['league-b'],
          includeTeamsWithoutLeague: false,
          seasons: [],
          countries: [],
          nationalities: [],
          positions: [],
          positionDetails: [],
          feet: [],
          sourceNames: [],
        },
      }),
    );
  });

  it('stages, persists, cancels, and resets configurable columns with required actions', async () => {
    const { documentLoader, fixture, loader } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
    });
    const columnButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.column-button' }),
    );
    expect(await (await columnButton.host()).getAttribute('aria-label')).toBe(
      'Choose columns, 3 hidden',
    );

    await columnButton.click();
    await fixture.whenStable();
    const drawer = await documentLoader.getHarness(MatDialogHarness);
    expect(await drawer.getAriaLabelledby()).toBe('entity-column-title');
    const name = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Name' }));
    const created = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Created' }));
    const actions = await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Actions' }));
    expect(await name.isChecked()).toBe(true);
    expect(await name.isDisabled()).toBe(true);
    expect(await created.isChecked()).toBe(false);
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
      'Name',
      'Source',
      'Country',
      'Season',
      'Teams',
      'Source page',
      'Actions',
    ]);

    await columnButton.click();
    await (await documentLoader.getHarness(MatCheckboxHarness.with({ label: 'Created' }))).check();
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
        'sourceName',
        'leagueCountry',
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
          'sourceName',
          'leagueCountry',
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
          'season',
          'teamCount',
          'sourceUrl',
          'actions',
        ],
      }),
    );
    header = (await loader.getHarness(MatTableHarness).then((table) => table.getHeaderRows()))[0];
    expect(await header.getCellTextByIndex()).toContain('Actions');
    expect(await header.getCellTextByIndex()).not.toContain('Created');
  });

  it('reorders hidden columns by pointer drop and retains their position when enabled', async () => {
    const { documentLoader, fixture, loader } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
    });
    const columnButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.column-button' }),
    );
    await columnButton.click();
    await fixture.whenStable();

    const dropList = document.querySelector<HTMLElement>('.column-list');
    if (!dropList) throw new Error('Column drop list was not created.');
    const debugElement = getDebugNode(dropList) as DebugElement | null;
    if (!debugElement) throw new Error('Column drop list debug element was not created.');
    debugElement.triggerEventHandler('cdkDropListDropped', {
      previousIndex: 3,
      currentIndex: 6,
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
        'sourceName',
        'leagueCountry',
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
      'Name',
      'Source',
      'Country',
      'Season',
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
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.column-button' }))).click();
    await fixture.whenStable();
    const nameHandle = await documentLoader.getHarness(
      MatButtonHarness.with({ selector: 'button[aria-label="Reorder Name column"]' }),
    );
    const handleElement = await nameHandle.host();
    await handleElement.sendKeys(TestKey.DOWN_ARROW, TestKey.DOWN_ARROW);
    await fixture.whenStable();
    expect(document.querySelector('.live-announcement')?.textContent).toContain(
      'Name moved to position 3 of 10.',
    );
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
      'Source',
      'Country',
      'Name',
      'Season',
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
    expect(rowText['createdAt']).toBe(new Date(player.createdAt).toLocaleString());
    expect(rowText['updatedAt']).toBe(new Date(player.updatedAt).toLocaleString());

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

    await (await loader.getHarness(MatButtonHarness.with({ selector: '.column-button' }))).click();
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
    expect((await header.getCellTextByIndex()).slice(0, 3)).toEqual(['Name', 'Source', 'Country']);
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

  it.each([
    { mode: 'league-only' as const, selectCascade: false },
    { mode: 'league-and-teams' as const, selectCascade: true },
  ])(
    'confirms league deletion with $mode and returns from an empty last page',
    async ({ mode, selectCascade }) => {
      const league: League = {
        id: 'league-id',
        projectId: 'project-id',
        sourceName: 'transfermarkt',
        sourceId: 'GB1',
        name: 'Premier League',
        sourceUrl: 'https://example.test/GB1',
        teamCount: 20,
        playerCount: 501,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const { api, documentLoader, fixture, loader, snackBar } = await createPage({
        entity: 'leagues',
        options: { entity: 'leagues', countries: [], seasons: [] },
        rows: [league],
        rowsAfterDelete: [],
        total: 26,
      });
      const paginator = await loader.getHarness(MatPaginatorHarness);
      await paginator.goToNextPage();
      const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));

      await menu.open();
      await menu.clickItem({ text: /Delete$/ });
      let dialog = await documentLoader.getHarness(MatDialogHarness);
      expect(await dialog.getRole()).toBe('alertdialog');
      expect(await dialog.getTitleText()).toBe('Delete league?');
      expect(await dialog.getText()).toContain('Premier League');
      expect(await dialog.getText()).toContain('20 teams');
      expect(await dialog.getText()).toContain('501 players');
      const safeOption = await dialog.getHarness(
        MatRadioButtonHarness.with({ label: /Delete league only/ }),
      );
      expect(await safeOption.isChecked()).toBe(true);

      if (!selectCascade) {
        await (await dialog.getHarness(MatButtonHarness.with({ text: 'Cancel' }))).click();
        expect(api.deleteLeague).not.toHaveBeenCalled();
        await menu.open();
        await menu.clickItem({ text: /Delete$/ });
        dialog = await documentLoader.getHarness(MatDialogHarness);
      } else {
        await (
          await dialog.getHarness(
            MatRadioButtonHarness.with({ label: /Delete league, teams and players/ }),
          )
        ).check();
      }
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete league' }))).click();

      await vi.waitFor(() =>
        expect(api.deleteLeague).toHaveBeenCalledWith('project-id', 'league-id', mode),
      );
      await fixture.whenStable();
      expect(api.listEntities.mock.calls.at(-1)?.[0]).toMatchObject({ pageIndex: 0 });
      expect(api.listEntityFilterOptions).toHaveBeenCalledTimes(2);
      expect(snackBar.open).toHaveBeenCalledWith('League deleted.', 'Dismiss', {
        duration: 3000,
      });
    },
  );

  it('keeps the league visible and reports an error when deletion fails', async () => {
    const league: League = {
      id: 'league-id',
      projectId: 'project-id',
      sourceName: 'soccerway',
      sourceId: 'premier-league',
      name: 'Premier League',
      sourceUrl: 'https://example.test/premier-league',
      teamCount: 20,
      playerCount: 501,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
      rows: [league],
      deleteLeagueResult: {
        ok: false,
        error: { code: 'DATABASE', message: 'The league could not be deleted.' },
      },
    });
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));

    await menu.open();
    await menu.clickItem({ text: /Delete$/ });
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete league' }))).click();

    await vi.waitFor(() =>
      expect(api.deleteLeague).toHaveBeenCalledWith('project-id', 'league-id', 'league-only'),
    );
    await fixture.whenStable();
    expect(api.listEntities).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Premier League');
    expect(snackBar.open).toHaveBeenCalledWith('The league could not be deleted.', 'Dismiss', {
      duration: 6000,
    });
  });

  it('confirms team deletion, cascades the player warning, and returns from an empty last page', async () => {
    const team: Team = {
      id: 'team-id',
      projectId: 'project-id',
      leagueId: 'league-id',
      sourceName: 'eurofotbal',
      sourceId: 'bohemians-1905',
      name: 'Bohemians Praha 1905',
      countryName: 'Czech Republic',
      countryCode2: 'CZ',
      countryCode3: 'CZE',
      sourceUrl: 'https://example.test/bohemians-1905',
      playerCount: 28,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [{ id: 'league-id', name: 'League' }],
        hasTeamsWithoutLeague: false,
        seasons: [],
      },
      rows: [team],
      rowsAfterDelete: [],
      total: 26,
    });
    const table = await loader.getHarness(MatTableHarness);
    const header = (await table.getHeaderRows())[0];
    expect((await header.getCellTextByIndex()).slice(0, 3)).toEqual(['Name', 'Source', 'Country']);
    expect(await (await table.getRows())[0].getCellTextByColumnName()).toMatchObject({
      teamCountry: 'Czech Republic',
    });
    const countryFlag = (fixture.nativeElement as HTMLElement).querySelector(
      '.mat-column-teamCountry img',
    );
    expect(countryFlag?.getAttribute('alt')).toBe('');
    expect(countryFlag?.getAttribute('src')).toContain('flags/20x15/cz.png');
    const paginator = await loader.getHarness(MatPaginatorHarness);
    await paginator.goToNextPage();
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));

    await menu.open();
    expect(await Promise.all((await menu.getItems()).map((item) => item.getText()))).toEqual([
      'editEdit',
      'syncRefresh',
      'deleteDelete',
    ]);
    await menu.clickItem({ text: /Delete$/ });
    let dialog = await documentLoader.getHarness(MatDialogHarness);
    expect(await dialog.getRole()).toBe('alertdialog');
    expect(await dialog.getTitleText()).toBe('Delete team?');
    expect(await dialog.getText()).toContain('Bohemians Praha 1905');
    expect(await dialog.getText()).toContain('28 players');
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Cancel' }))).click();
    expect(api.deleteTeam).not.toHaveBeenCalled();

    await menu.open();
    await menu.clickItem({ text: /Delete$/ });
    dialog = await documentLoader.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete team' }))).click();

    await vi.waitFor(() => expect(api.deleteTeam).toHaveBeenCalledWith('project-id', 'team-id'));
    await fixture.whenStable();
    expect(api.listEntities.mock.calls.at(-1)?.[0]).toMatchObject({ pageIndex: 0 });
    expect(snackBar.open).toHaveBeenCalledWith('Team deleted.', 'Dismiss', { duration: 3000 });
  });

  it('keeps the team visible and reports the error when deletion fails', async () => {
    const team: Team = {
      id: 'team-id',
      projectId: 'project-id',
      sourceName: 'soccerway',
      sourceId: 'slavia-prague',
      name: 'Slavia Prague',
      sourceUrl: 'https://example.test/slavia-prague',
      playerCount: 30,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { api, documentLoader, fixture, loader, snackBar } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        leagues: [],
        hasTeamsWithoutLeague: true,
        seasons: [],
      },
      rows: [team],
      deleteTeamResult: {
        ok: false,
        error: { code: 'DATABASE', message: 'The team could not be deleted.' },
      },
    });
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));

    await menu.open();
    await menu.clickItem({ text: /Delete$/ });
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete team' }))).click();

    await vi.waitFor(() => expect(api.deleteTeam).toHaveBeenCalledWith('project-id', 'team-id'));
    await fixture.whenStable();
    expect(api.listEntities).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Slavia Prague');
    expect(snackBar.open).toHaveBeenCalledWith('The team could not be deleted.', 'Dismiss', {
      duration: 6000,
    });
  });

  it('stages team filters in a right drawer, applies them together, and clears them', async () => {
    const { api, documentLoader, fixture, loader, router } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
        sourceNames: ['transfermarkt', 'soccerway', 'worldfootball'],
        leagues: [
          { id: 'league-a', name: 'League A' },
          { id: 'league-b', name: 'League B' },
        ],
        hasTeamsWithoutLeague: true,
        seasons: ['2025', '2026'],
      },
    });
    const filterButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.filter-button' }),
    );
    expect(await filterButton.getAppearance()).toBe('tonal');

    await filterButton.click();
    await fixture.whenStable();
    const drawer = await documentLoader.getHarness(MatDialogHarness);
    expect(await drawer.getRole()).toBe('dialog');
    expect(await drawer.getAriaLabelledby()).toBe('entity-filter-title');
    const panel = document.querySelector<HTMLElement>('.entity-filter-drawer-panel');
    expect(panel?.style.height).toBe('100vh');
    expect(panel?.parentElement?.style.justifyContent).toBe('flex-end');
    expect(panel?.querySelector('.filter-form > footer')).toBeTruthy();
    const leagueAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter teams by leagues"]',
      }),
    );
    await leagueAutocomplete.enterText('LEAGUE A');
    expect(await leagueAutocomplete.getOptions({ text: 'League A' })).toHaveLength(1);
    expect(await leagueAutocomplete.getOptions({ text: 'League B' })).toHaveLength(0);
    await leagueAutocomplete.selectOption({ text: 'League A' });
    await leagueAutocomplete.enterText('league a');
    expect(await leagueAutocomplete.getOptions({ text: 'League A' })).toHaveLength(0);
    expect(await leagueAutocomplete.getOptions({ text: 'No matching leagues' })).toHaveLength(1);
    await leagueAutocomplete.clear();
    await leagueAutocomplete.enterText('league b');
    await leagueAutocomplete.selectOption({ text: 'League B' });
    const leagueGrid = await documentLoader.getHarness(
      MatChipGridHarness.with({ selector: '.parent-chip-grid' }),
    );
    const selectedLeagues = await leagueGrid.getRows();
    expect(await Promise.all(selectedLeagues.map((row) => row.getText()))).toEqual([
      'League A',
      'League B',
    ]);
    await selectedLeagues[1]?.remove();
    const seasonSelect = await documentLoader.getHarness(
      MatSelectHarness.with({ selector: 'mat-select[aria-label="Filter teams by seasons"]' }),
    );
    await seasonSelect.open();
    const seasons = await seasonSelect.getOptions({ text: '2026' });
    await seasons[0]?.click();
    await seasonSelect.close();
    const sourceSelect = await documentLoader.getHarness(
      MatSelectHarness.with({ selector: 'mat-select[aria-label="Filter teams by sources"]' }),
    );
    await sourceSelect.open();
    await sourceSelect.clickOptions({ text: /Transfermarkt|Soccerway|WorldFootball/ });
    await sourceSelect.close();
    const noLeague = await documentLoader.getHarness(MatCheckboxHarness);
    await noLeague.check();
    await fixture.whenStable();
    expect(router.navigate).not.toHaveBeenCalled();

    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledOnce());
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        leagueId: ['league-a'],
        noLeague: 'true',
        teamId: null,
        season: ['2026'],
        country: null,
        nationality: null,
        position: null,
        positionDetail: null,
        foot: null,
        sourceName: ['transfermarkt', 'soccerway', 'worldfootball'],
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      leagueId: 'league-a',
      leagueIds: ['league-a'],
      includeTeamsWithoutLeague: true,
      seasons: ['2026'],
      sourceNames: ['transfermarkt', 'soccerway', 'worldfootball'],
      pageIndex: 0,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(entityFilterPreferenceKey('project-id', 'teams')) ?? '',
      ),
    ).toEqual({
      version: 2,
      filters: {
        parentIds: ['league-a'],
        includeTeamsWithoutLeague: true,
        seasons: ['2026'],
        countries: [],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
        sourceNames: ['transfermarkt', 'soccerway', 'worldfootball'],
      },
    });
    expect(await (await filterButton.host()).getAttribute('aria-label')).toBe(
      'Open filters, 3 active',
    );

    await filterButton.click();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Clear all' }))).click();
    expect(router.navigate).toHaveBeenCalledOnce();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledTimes(2));
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      leagueIds: [],
      includeTeamsWithoutLeague: false,
      seasons: [],
      sourceNames: [],
      pageIndex: 0,
    });
    expect(
      window.localStorage.getItem(entityFilterPreferenceKey('project-id', 'teams')),
    ).toBeNull();
  });

  it('searches, selects, removes, persists, and clears league country filters', async () => {
    const { api, documentLoader, fixture, loader, router } = await createPage({
      entity: 'leagues',
      options: {
        entity: 'leagues',
        countries: [
          { name: 'England', code: 'GB-ENG' },
          { name: 'Portugal', code: 'PT' },
          { name: 'Scotland', code: 'GB-SCT' },
        ],
        seasons: ['2026'],
      },
    });
    const filterButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.filter-button' }),
    );
    await filterButton.click();

    const countryAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter leagues by countries"]',
      }),
    );
    await countryAutocomplete.enterText('ENG');
    expect(await countryAutocomplete.getOptions({ text: 'England' })).toHaveLength(1);
    expect(await countryAutocomplete.getOptions({ text: 'Scotland' })).toHaveLength(0);
    await countryAutocomplete.selectOption({ text: 'England' });
    await countryAutocomplete.enterText('sco');
    await countryAutocomplete.selectOption({ text: 'Scotland' });
    expect(await countryAutocomplete.getValue()).toBe('');
    await countryAutocomplete.enterText('ENG');
    expect(await countryAutocomplete.getOptions({ text: 'England' })).toHaveLength(0);
    expect(await countryAutocomplete.getOptions({ text: 'No matching countries' })).toHaveLength(1);
    await countryAutocomplete.blur();

    const countryGrid = await documentLoader.getHarness(
      MatChipGridHarness.with({ selector: '.country-chip-grid' }),
    );
    const selectedCountries = await countryGrid.getRows();
    expect(await Promise.all(selectedCountries.map((row) => row.getText()))).toEqual([
      'England',
      'Scotland',
    ]);
    const selectedFlagSources = Array.from(
      document.querySelectorAll<HTMLImageElement>('.country-chip-grid img'),
      (image) => image.getAttribute('src'),
    );
    expect(selectedFlagSources).toEqual(
      expect.arrayContaining([
        expect.stringContaining('flags/20x15/gb-eng.png'),
        expect.stringContaining('flags/20x15/gb-sct.png'),
      ]),
    );
    await selectedCountries[0]?.remove();

    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledOnce());
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        leagueId: null,
        noLeague: null,
        teamId: null,
        season: null,
        country: ['Scotland'],
        nationality: null,
        position: null,
        positionDetail: null,
        foot: null,
        sourceName: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      countries: ['Scotland'],
      pageIndex: 0,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(entityFilterPreferenceKey('project-id', 'leagues')) ?? '',
      ),
    ).toEqual({
      version: 2,
      filters: {
        sourceNames: [],
        parentIds: [],
        includeTeamsWithoutLeague: false,
        seasons: [],
        countries: ['Scotland'],
        nationalities: [],
        positions: [],
        positionDetails: [],
        feet: [],
      },
    });
    expect(await (await filterButton.host()).getAttribute('aria-label')).toBe(
      'Open filters, 1 active',
    );

    await filterButton.click();
    const reopenedCountryAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter leagues by countries"]',
      }),
    );
    await reopenedCountryAutocomplete.enterText('por');
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Clear all' }))).click();
    expect(await reopenedCountryAutocomplete.getValue()).toBe('');
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledTimes(2));
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      countries: [],
    });
    expect(
      window.localStorage.getItem(entityFilterPreferenceKey('project-id', 'leagues')),
    ).toBeNull();
  });

  it('normalizes stale league country URL filters', async () => {
    const { api, router } = await createPage({
      entity: 'leagues',
      initialQuery: { country: ['England', 'Missing'] },
      options: {
        entity: 'leagues',
        countries: [
          { name: 'England', code: 'GB-ENG' },
          { name: 'Scotland', code: 'GB-SCT' },
        ],
        seasons: [],
      },
    });

    expect(router.navigate).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        leagueId: null,
        noLeague: null,
        teamId: null,
        season: null,
        country: ['England'],
        nationality: null,
        position: null,
        positionDetail: null,
        foot: null,
        sourceName: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      countries: ['England'],
    });
  });

  it('normalizes stale player URL filters and keeps cancelled edits unapplied', async () => {
    const { api, documentLoader, fixture, loader, queryParams, router } = await createPage({
      entity: 'players',
      initialQuery: {
        sourceName: ['soccerway', 'stale-source'],
        teamId: ['team-a', 'missing-team'],
        nationality: ['Senegal', 'Missing'],
        position: ['ATTACKER', 'INVALID'],
        positionDetail: ['ST', 'INVALID'],
        foot: ['RIGHT'],
      },
      options: {
        entity: 'players',
        sourceNames: ['soccerway', 'transfermarkt'],
        teams: [
          { id: 'team-a', name: 'Alpha FC' },
          { id: 'team-b', name: 'Beta FC' },
        ],
        nationalities: [
          { name: 'Guinea', code: 'GN' },
          { name: 'Senegal', code: 'SN' },
        ],
        positions: ['DEFENDER', 'ATTACKER'],
        positionDetails: ['CB', 'ST'],
        feet: ['LEFT', 'RIGHT'],
      },
    });
    expect(router.navigate).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        leagueId: null,
        noLeague: null,
        teamId: ['team-a'],
        season: null,
        country: null,
        nationality: ['Senegal'],
        position: ['ATTACKER'],
        positionDetail: ['ST'],
        foot: ['RIGHT'],
        sourceName: ['soccerway'],
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const filterButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.filter-button' }),
    );
    expect(await (await filterButton.host()).getAttribute('aria-label')).toBe(
      'Open filters, 6 active',
    );
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      sourceNames: ['soccerway'],
    });

    await filterButton.click();
    const teamGrid = await documentLoader.getHarness(
      MatChipGridHarness.with({ selector: '.parent-chip-grid' }),
    );
    expect(await Promise.all((await teamGrid.getRows()).map((row) => row.getText()))).toEqual([
      'Alpha FC',
    ]);
    const teamAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter players by teams"]',
      }),
    );
    await teamAutocomplete.enterText('BETA');
    expect(await teamAutocomplete.getOptions({ text: 'Beta FC' })).toHaveLength(1);
    expect(await teamAutocomplete.getOptions({ text: 'Alpha FC' })).toHaveLength(0);
    await teamAutocomplete.selectOption({ text: 'Beta FC' });
    expect(await teamAutocomplete.getValue()).toBe('');
    const nationalityGrid = await documentLoader.getHarness(
      MatChipGridHarness.with({
        selector: '.nationality-chip-grid',
      }),
    );
    expect(
      await Promise.all((await nationalityGrid.getRows()).map((row) => row.getText())),
    ).toEqual(['Senegal']);
    const nationalityAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter players by nationalities"]',
      }),
    );
    await nationalityAutocomplete.enterText('gui');
    expect(await nationalityAutocomplete.getOptions({ text: 'Guinea' })).toHaveLength(1);
    expect(
      [...document.querySelectorAll<HTMLImageElement>('.mat-mdc-option app-country-flag img')].map(
        (image) => image.getAttribute('src'),
      ),
    ).toEqual(['flags/20x15/gn.png']);
    expect(
      document.querySelector<HTMLImageElement>('mat-chip-row app-country-flag img')?.src,
    ).toContain('flags/20x15/sn.png');
    await nationalityAutocomplete.selectOption({ text: 'Guinea' });
    expect(await nationalityAutocomplete.getValue()).toBe('');
    const positionSelect = await documentLoader.getHarness(
      MatSelectHarness.with({ selector: 'mat-select[aria-label="Filter players by positions"]' }),
    );
    expect(document.querySelector('.position-badges')?.textContent.trim()).toBe('ATT');
    await positionSelect.open();
    expect(await positionSelect.getOptions({ text: 'DEF' })).toHaveLength(1);
    expect(await positionSelect.getOptions({ text: 'ATT' })).toHaveLength(1);
    expect(document.querySelectorAll('.mat-mdc-option app-position-badge')).toHaveLength(2);
    await positionSelect.close();
    const positionDetailSelect = await documentLoader.getHarness(
      MatSelectHarness.with({
        selector: 'mat-select[aria-label="Filter players by position details"]',
      }),
    );
    expect(await positionDetailSelect.getValueText()).toBe('ST');
    await positionDetailSelect.open();
    expect(await positionDetailSelect.getOptions({ text: 'CB' })).toHaveLength(1);
    expect(await positionDetailSelect.getOptions({ text: 'ST' })).toHaveLength(1);
    expect(document.querySelectorAll('.mat-mdc-option app-position-detail-badge')).toHaveLength(2);
    await positionDetailSelect.close();
    const footSelect = await documentLoader.getHarness(
      MatSelectHarness.with({
        selector: 'mat-select[aria-label="Filter players by preferred foot"]',
      }),
    );
    await footSelect.open();
    await (await footSelect.getOptions({ text: 'Left' }))[0]?.click();
    await footSelect.close();
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Cancel' }))).click();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledOnce();

    queryParams.next(convertToParamMap({ teamId: ['team-b'], nationality: ['Guinea'] }));
    await fixture.whenStable();
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      teamId: 'team-b',
      teamIds: ['team-b'],
      nationalities: ['Guinea'],
      positions: [],
      positionDetails: [],
      feet: [],
      pageIndex: 0,
    });

    queryParams.next(convertToParamMap({ teamId: ['missing-team'], position: ['INVALID'] }));
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        leagueId: null,
        noLeague: null,
        teamId: null,
        season: null,
        country: null,
        nationality: null,
        position: null,
        positionDetail: null,
        foot: null,
        sourceName: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('searches, selects, removes, and applies multiple team and nationality filters', async () => {
    const { api, documentLoader, fixture, loader, router } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [
          { id: 'team-a', name: 'Alpha FC' },
          { id: 'team-b', name: 'Beta FC' },
          { id: 'team-c', name: 'Gamma FC' },
        ],
        nationalities: [
          { name: 'Guinea', code: 'GN' },
          { name: 'Senegal', code: 'SN' },
          { name: 'Spain', code: 'ES' },
        ],
        positions: [],
        positionDetails: [],
        feet: [],
      },
    });
    const filterButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.filter-button' }),
    );
    await filterButton.click();

    const teamAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter players by teams"]',
      }),
    );
    await teamAutocomplete.enterText('ALP');
    expect(await teamAutocomplete.getOptions({ text: 'Alpha FC' })).toHaveLength(1);
    expect(await teamAutocomplete.getOptions({ text: 'Beta FC' })).toHaveLength(0);
    await teamAutocomplete.selectOption({ text: 'Alpha FC' });
    await teamAutocomplete.enterText('beta');
    await teamAutocomplete.selectOption({ text: 'Beta FC' });
    expect(await teamAutocomplete.getValue()).toBe('');
    await teamAutocomplete.enterText('BETA');
    expect(await teamAutocomplete.getOptions({ text: 'Beta FC' })).toHaveLength(0);
    expect(await teamAutocomplete.getOptions({ text: 'No matching teams' })).toHaveLength(1);
    await teamAutocomplete.blur();

    const teamGrid = await documentLoader.getHarness(
      MatChipGridHarness.with({ selector: '.parent-chip-grid' }),
    );
    const selectedTeams = await teamGrid.getRows();
    expect(await Promise.all(selectedTeams.map((row) => row.getText()))).toEqual([
      'Alpha FC',
      'Beta FC',
    ]);
    await selectedTeams[0]?.remove();

    const nationalityAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter players by nationalities"]',
      }),
    );
    await nationalityAutocomplete.enterText('gui');
    await nationalityAutocomplete.selectOption({ text: 'Guinea' });
    await nationalityAutocomplete.enterText('SEN');
    await nationalityAutocomplete.selectOption({ text: 'Senegal' });
    const nationalityGrid = await documentLoader.getHarness(
      MatChipGridHarness.with({
        selector: '.nationality-chip-grid',
      }),
    );
    const selectedNationalities = await nationalityGrid.getRows();
    expect(await Promise.all(selectedNationalities.map((row) => row.getText()))).toEqual([
      'Guinea',
      'Senegal',
    ]);
    await selectedNationalities[0]?.remove();

    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Apply' }))).click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledOnce());
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        leagueId: null,
        noLeague: null,
        teamId: ['team-b'],
        season: null,
        country: null,
        nationality: ['Senegal'],
        position: null,
        positionDetail: null,
        foot: null,
        sourceName: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      teamId: 'team-b',
      teamIds: ['team-b'],
      nationalities: ['Senegal'],
    });

    await filterButton.click();
    const reopenedTeamAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter players by teams"]',
      }),
    );
    const reopenedNationalityAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter players by nationalities"]',
      }),
    );
    await reopenedTeamAutocomplete.enterText('gam');
    await reopenedNationalityAutocomplete.enterText('spa');
    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Clear all' }))).click();
    expect(await reopenedTeamAutocomplete.getValue()).toBe('');
    expect(await reopenedNationalityAutocomplete.getValue()).toBe('');
  });

  it('keeps legacy string nationality options visible', async () => {
    const { documentLoader, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: ['Guinea', 'Senegal'],
        positions: [],
        positionDetails: [],
        feet: [],
      } as unknown as EntityFilterOptions,
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.filter-button' }))).click();
    const nationalityAutocomplete = await documentLoader.getHarness(
      MatAutocompleteHarness.with({
        selector: 'input[aria-label="Filter players by nationalities"]',
      }),
    );
    await nationalityAutocomplete.focus();
    expect(await nationalityAutocomplete.getOptions({ text: 'Guinea' })).toHaveLength(1);
    expect(await nationalityAutocomplete.getOptions({ text: 'Senegal' })).toHaveLength(1);
  });

  it('keeps the table available and retries filter-option loading errors', async () => {
    const api = {
      listEntities: vi.fn((request: PageRequest) =>
        Promise.resolve({
          ok: true as const,
          value: { rows: [], total: 0, pageIndex: request.pageIndex, pageSize: request.pageSize },
        }),
      ),
      listEntityFilterOptions: vi
        .fn()
        .mockResolvedValueOnce({
          ok: false as const,
          error: { code: 'DATABASE' as const, message: 'Options unavailable' },
        })
        .mockResolvedValueOnce({
          ok: true as const,
          value: { entity: 'leagues' as const, countries: [], seasons: ['2026'] },
        }),
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
            snapshot: { data: { entity: 'leagues' } },
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntityTablePage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const documentLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.filter-button' }))).click();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
    expect(overlay?.querySelector('[role="alert"]')?.textContent).toContain(
      'Filters could not be loaded: Options unavailable',
    );
    expect(element.textContent).toContain('0 records');

    await (await documentLoader.getHarness(MatButtonHarness.with({ text: 'Retry' }))).click();
    await fixture.whenStable();
    expect(api.listEntityFilterOptions).toHaveBeenCalledTimes(2);
    expect(overlay?.querySelector('[role="alert"]')).toBeNull();
    const select = await documentLoader.getHarness(MatSelectHarness);
    expect(await select.isDisabled()).toBe(false);
  });

  it.each<{ state: string; initialQuery: Record<string, string | string[]> }>([
    { state: 'empty', initialQuery: {} },
    {
      state: 'selected',
      initialQuery: { teamId: ['team-a'], nationality: ['Senegal'] },
    },
  ])(
    'has no detectable AXE violations with the $state filter drawer open',
    async ({ initialQuery }) => {
      const { fixture, loader } = await createPage({
        entity: 'players',
        initialQuery,
        options: {
          entity: 'players',
          teams: [{ id: 'team-a', name: 'Alpha FC' }],
          nationalities: [{ name: 'Senegal', code: 'SN' }],
          positions: ['ATTACKER'],
          positionDetails: ['ST'],
          feet: ['RIGHT'],
        },
      });
      await (
        await loader.getHarness(MatButtonHarness.with({ selector: '.filter-button' }))
      ).click();
      await fixture.whenStable();

      const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
      if (!overlay) throw new Error('Filter drawer overlay was not created.');
      const results = await axe.run(overlay);
      expect(results.violations).toEqual([]);
    },
  );

  it('has no detectable AXE violations with a selected league filter', async () => {
    const { fixture, loader } = await createPage({
      entity: 'teams',
      initialQuery: { leagueId: ['league-a'] },
      options: {
        entity: 'teams',
        leagues: [{ id: 'league-a', name: 'League A' }],
        hasTeamsWithoutLeague: false,
        seasons: [],
      },
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.filter-button' }))).click();
    await fixture.whenStable();

    const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
    if (!overlay) throw new Error('Filter drawer overlay was not created.');
    const results = await axe.run(overlay);
    expect(results.violations).toEqual([]);
  });

  it('has no detectable AXE violations with a selected country filter', async () => {
    const { fixture, loader } = await createPage({
      entity: 'leagues',
      initialQuery: { country: ['England'] },
      options: {
        entity: 'leagues',
        countries: [{ name: 'England', code: 'GB-ENG' }],
        seasons: [],
      },
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.filter-button' }))).click();
    await fixture.whenStable();

    const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
    if (!overlay) throw new Error('Filter drawer overlay was not created.');
    const results = await axe.run(overlay);
    expect(results.violations).toEqual([]);
  });

  it('has no detectable AXE violations with the columns drawer open', async () => {
    const { fixture, loader } = await createPage({
      entity: 'leagues',
      options: { entity: 'leagues', countries: [], seasons: [] },
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.column-button' }))).click();
    await fixture.whenStable();

    const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
    if (!overlay) throw new Error('Columns drawer overlay was not created.');
    const results = await axe.run(overlay);
    expect(results.violations).toEqual([]);
  });
});
