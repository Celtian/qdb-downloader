import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNullable } from 'ngx-nullable';
import { BehaviorSubject, of } from 'rxjs';
import type { League, PageRequest, Team } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { EntityTablePage } from './entity-table-page';

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

    expect(api.listEntities).toHaveBeenCalled();
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

  it('filters teams by multiple leagues and teams without a league, then clears the filter', async () => {
    const leagues: League[] = [
      {
        id: 'league-a',
        projectId: 'project-id',
        source: 'transfermarkt',
        externalId: 'A',
        name: 'League A',
        sourceUrl: 'https://example.test/league-a',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'league-b',
        projectId: 'project-id',
        source: 'transfermarkt',
        externalId: 'B',
        name: 'League B',
        sourceUrl: 'https://example.test/league-b',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const team: Team = {
      id: 'team-id',
      projectId: 'project-id',
      leagueId: leagues[0]?.id,
      source: 'transfermarkt',
      externalId: '1',
      name: 'Test Team',
      sourceUrl: 'https://example.test/team-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const queryParams = new BehaviorSubject(convertToParamMap({}));
    const api = {
      listEntities: vi.fn((request: PageRequest) =>
        Promise.resolve({
          ok: true as const,
          value: {
            rows: request.entity === 'leagues' ? leagues : [team],
            total: request.entity === 'leagues' ? leagues.length : 1,
            pageIndex: request.pageIndex,
            pageSize: request.pageSize,
          },
        }),
      ),
    };
    const router = {
      navigate: vi.fn(
        (
          _commands: unknown[],
          extras: { queryParams?: Record<string, unknown> },
        ): Promise<boolean> => {
          const nextParams = Object.fromEntries(
            Object.entries(extras.queryParams ?? {}).filter(([, value]) => value !== null),
          );
          queryParams.next(convertToParamMap(nextParams));
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
            snapshot: { data: { entity: 'teams' } },
            queryParamMap: queryParams.asObservable(),
          },
        },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntityTablePage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const select = await loader.getHarness(
      MatSelectHarness.with({ selector: '.parent-filter mat-select' }),
    );

    expect(await (await select.host()).getAttribute('aria-label')).toBe('Filter teams by leagues');
    await select.open();
    const options = await select.getOptions();
    const optionTexts = await Promise.all(options.map((option) => option.getText()));
    expect(optionTexts).toEqual(['No league', 'League A', 'League B']);
    await options[0]?.click();
    await options[1]?.click();
    await select.close();
    await fixture.whenStable();

    expect(await select.getValueText()).toBe('2 leagues selected');
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { leagueId: ['league-a'], noLeague: 'true' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const filteredRequest = api.listEntities.mock.calls
      .map(([request]) => request)
      .filter((request) => request.entity === 'teams')
      .at(-1);
    expect(filteredRequest).toMatchObject({
      leagueIds: ['league-a'],
      includeTeamsWithoutLeague: true,
      pageIndex: 0,
    });

    const clearButton = await loader.getHarness(
      MatButtonHarness.with({ selector: 'button[aria-label="Clear league filters"]' }),
    );
    expect(await (await clearButton.host()).getAttribute('aria-label')).toBe(
      'Clear league filters',
    );
    await clearButton.click();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { leagueId: null, noLeague: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(
      api.listEntities.mock.calls
        .map(([request]) => request)
        .filter((request) => request.entity === 'teams')
        .at(-1),
    ).toMatchObject({ leagueIds: [], includeTeamsWithoutLeague: false, pageIndex: 0 });
  });

  it('loads every team option and normalizes stale player filters from the URL', async () => {
    const teams = Array.from({ length: 201 }, (_, index): Team => ({
      id: `team-${index}`,
      projectId: 'project-id',
      source: 'transfermarkt',
      externalId: String(index),
      name: `Team ${index}`,
      sourceUrl: `https://example.test/team-${index}`,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
    const queryParams = new BehaviorSubject(
      convertToParamMap({ teamId: ['team-200', 'missing-team'] }),
    );
    const api = {
      listEntities: vi.fn((request: PageRequest) => {
        const rows =
          request.entity === 'teams'
            ? teams.slice(
                request.pageIndex * request.pageSize,
                (request.pageIndex + 1) * request.pageSize,
              )
            : [];
        return Promise.resolve({
          ok: true as const,
          value: {
            rows,
            total: request.entity === 'teams' ? teams.length : 0,
            pageIndex: request.pageIndex,
            pageSize: request.pageSize,
          },
        });
      }),
    };
    const router = {
      navigate: vi.fn(
        (
          _commands: unknown[],
          extras: { queryParams?: Record<string, unknown> },
        ): Promise<boolean> => {
          queryParams.next(convertToParamMap(extras.queryParams ?? {}));
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
            snapshot: { data: { entity: 'players' } },
            queryParamMap: queryParams.asObservable(),
          },
        },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntityTablePage);
    await fixture.whenStable();
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatSelectHarness.with({ selector: '.parent-filter mat-select' }),
    );

    expect(await (await select.host()).getAttribute('aria-label')).toBe('Filter players by teams');
    expect(await select.getValueText()).toBe('Team 200');
    expect(
      api.listEntities.mock.calls
        .map(([request]) => request)
        .filter((request) => request.entity === 'teams')
        .map((request) => request.pageIndex),
    ).toEqual([0, 1]);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { teamId: ['team-200'] },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(
      api.listEntities.mock.calls
        .map(([request]) => request)
        .filter((request) => request.entity === 'players')
        .at(-1),
    ).toMatchObject({ teamIds: ['team-200'] });
  });

  it('keeps the table available and reports filter-option loading errors', async () => {
    const api = {
      listEntities: vi.fn((request: PageRequest) =>
        request.entity === 'leagues'
          ? Promise.resolve({
              ok: false as const,
              error: { code: 'DATABASE' as const, message: 'Options unavailable' },
            })
          : Promise.resolve({
              ok: true as const,
              value: { rows: [], total: 0, pageIndex: 0, pageSize: 25 },
            }),
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
            snapshot: { data: { entity: 'teams' } },
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntityTablePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);

    expect(await select.isDisabled()).toBe(true);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Filters could not be loaded: Options unavailable',
    );
    expect(element.textContent).toContain('0 records');
  });
});
