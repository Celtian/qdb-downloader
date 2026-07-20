import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { provideNullable } from 'ngx-nullable';
import { BehaviorSubject, of } from 'rxjs';
import type {
  EntityFilterOptions,
  EntityKind,
  League,
  PageRequest,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { EntityTablePage } from './entity-table-page';

interface PageSetup {
  entity: EntityKind;
  options: EntityFilterOptions;
  initialQuery?: Record<string, string | string[]>;
}

const createPage = async ({ entity, options, initialQuery = {} }: PageSetup) => {
  const queryParams = new BehaviorSubject(convertToParamMap(initialQuery));
  const currentQuery: Record<string, unknown> = { ...initialQuery };
  const api = {
    listEntities: vi.fn((request: PageRequest) =>
      Promise.resolve({
        ok: true as const,
        value: { rows: [], total: 0, pageIndex: request.pageIndex, pageSize: request.pageSize },
      }),
    ),
    listEntityFilterOptions: vi.fn(() => Promise.resolve({ ok: true as const, value: options })),
  };
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
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
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
  };
};

describe('EntityTablePage', () => {
  it('shows accessible edit and refresh actions for league rows', async () => {
    const league: League = {
      id: 'league-id',
      projectId: 'project-id',
      source: 'transfermarkt',
      externalId: 'GB1',
      name: 'Premier League',
      season: '2026',
      sourceUrl: 'https://example.test/GB1',
      teamCount: 20,
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
          value: { entity: 'leagues' as const, seasons: ['2026'] },
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
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));
    await menu.open();
    const items = await menu.getItems();
    const itemTexts = await Promise.all(items.map((item) => item.getText()));
    expect(itemTexts.map((text) => text.endsWith('Edit'))).toContain(true);
    expect(itemTexts.map((text) => text.endsWith('Refresh'))).toContain(true);

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

  it('stages team filters in a right drawer, applies them together, and clears them', async () => {
    const { api, documentLoader, fixture, loader, router } = await createPage({
      entity: 'teams',
      options: {
        entity: 'teams',
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
    const leagueSelect = await documentLoader.getHarness(
      MatSelectHarness.with({ selector: 'mat-select[aria-label="Filter teams by leagues"]' }),
    );
    await leagueSelect.open();
    const leagues = await leagueSelect.getOptions();
    await leagues[0]?.click();
    await leagueSelect.close();
    const seasonSelect = await documentLoader.getHarness(
      MatSelectHarness.with({ selector: 'mat-select[aria-label="Filter teams by seasons"]' }),
    );
    await seasonSelect.open();
    const seasons = await seasonSelect.getOptions({ text: '2026' });
    await seasons[0]?.click();
    await seasonSelect.close();
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
        nationality: null,
        position: null,
        foot: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(api.listEntities.mock.calls.map(([request]) => request).at(-1)).toMatchObject({
      leagueId: 'league-a',
      leagueIds: ['league-a'],
      includeTeamsWithoutLeague: true,
      seasons: ['2026'],
      pageIndex: 0,
    });
    expect(await (await filterButton.host()).getAttribute('aria-label')).toBe(
      'Open filters, 2 active',
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
      pageIndex: 0,
    });
  });

  it('normalizes stale player URL filters and keeps cancelled edits unapplied', async () => {
    const { api, documentLoader, fixture, loader, queryParams, router } = await createPage({
      entity: 'players',
      initialQuery: {
        teamId: ['team-a', 'missing-team'],
        nationality: ['Senegal', 'Missing'],
        position: ['ATTACKER', 'INVALID'],
        foot: ['RIGHT'],
      },
      options: {
        entity: 'players',
        teams: [
          { id: 'team-a', name: 'Alpha FC' },
          { id: 'team-b', name: 'Beta FC' },
        ],
        nationalities: [
          { name: 'Guinea', code: 'GN' },
          { name: 'Senegal', code: 'SN' },
        ],
        positions: ['DEFENDER', 'ATTACKER'],
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
        nationality: ['Senegal'],
        position: ['ATTACKER'],
        foot: ['RIGHT'],
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const filterButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.filter-button' }),
    );
    expect(await (await filterButton.host()).getAttribute('aria-label')).toBe(
      'Open filters, 4 active',
    );

    await filterButton.click();
    const nationalitySelect = await documentLoader.getHarness(
      MatSelectHarness.with({
        selector: 'mat-select[aria-label="Filter players by nationalities"]',
      }),
    );
    await nationalitySelect.open();
    expect(await nationalitySelect.getOptions({ text: 'Guinea' })).toHaveLength(1);
    expect(
      [...document.querySelectorAll<HTMLImageElement>('.mat-mdc-option app-country-flag img')].map(
        (image) => image.getAttribute('src'),
      ),
    ).toEqual(['flags/20x15/gn.png', 'flags/20x15/sn.png']);
    await nationalitySelect.close();
    const positionSelect = await documentLoader.getHarness(
      MatSelectHarness.with({ selector: 'mat-select[aria-label="Filter players by positions"]' }),
    );
    expect(document.querySelector('.position-badges')?.textContent.trim()).toBe('ATT');
    await positionSelect.open();
    expect(await positionSelect.getOptions({ text: 'DEF' })).toHaveLength(1);
    expect(await positionSelect.getOptions({ text: 'ATT' })).toHaveLength(1);
    expect(document.querySelectorAll('.mat-mdc-option app-position-badge')).toHaveLength(2);
    await positionSelect.close();
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
        nationality: null,
        position: null,
        foot: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('keeps legacy string nationality options visible', async () => {
    const { documentLoader, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [],
        nationalities: ['Guinea', 'Senegal'],
        positions: [],
        feet: [],
      } as unknown as EntityFilterOptions,
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.filter-button' }))).click();
    const nationalitySelect = await documentLoader.getHarness(
      MatSelectHarness.with({
        selector: 'mat-select[aria-label="Filter players by nationalities"]',
      }),
    );
    await nationalitySelect.open();
    expect(await nationalitySelect.getOptions({ text: 'Guinea' })).toHaveLength(1);
    expect(await nationalitySelect.getOptions({ text: 'Senegal' })).toHaveLength(1);
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
          value: { entity: 'leagues' as const, seasons: ['2026'] },
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

  it('has no detectable AXE violations with the filter drawer open', async () => {
    const { fixture, loader } = await createPage({
      entity: 'players',
      options: {
        entity: 'players',
        teams: [{ id: 'team-a', name: 'Alpha FC' }],
        nationalities: [{ name: 'Senegal', code: 'SN' }],
        positions: ['ATTACKER'],
        feet: ['RIGHT'],
      },
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.filter-button' }))).click();
    await fixture.whenStable();

    const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
    if (!overlay) throw new Error('Filter drawer overlay was not created.');
    const results = await axe.run(overlay);
    expect(results.violations).toEqual([]);
  });
});
