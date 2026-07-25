import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableHarness } from '@angular/material/table/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import axe from 'axe-core';
import type {
  CombinedEntity,
  CombinedEntityKind,
  CombinedLeague,
  CombinedPlayer,
  CombinedTeam,
} from '../../../../../shared/contracts';
import { formatReferenceDate } from '../../../../../shared/reference-date';
import { DesktopApi } from '../../../core/desktop-api';
import { CombinedEntityPage } from './combined-entity-page';

const timestamps = {
  createdAt: '2026-07-25T00:00:00.000Z',
  updatedAt: '2026-07-25T00:00:00.000Z',
};

const league = (overrides: Partial<CombinedLeague> = {}): CombinedLeague => ({
  id: 'league-1',
  projectId: 'project-id',
  name: 'Premier League',
  teamCount: 20,
  sources: [],
  needsReview: false,
  ...timestamps,
  ...overrides,
});

const team = (overrides: Partial<CombinedTeam> = {}): CombinedTeam => ({
  id: 'team-1',
  projectId: 'project-id',
  leagueId: 'league-1',
  leagueName: 'Premier League',
  name: 'Sparta Prague',
  sources: [],
  needsReview: false,
  ...timestamps,
  ...overrides,
});

const player = (overrides: Partial<CombinedPlayer> = {}): CombinedPlayer => ({
  id: 'player-1',
  projectId: 'project-id',
  teamId: 'team-1',
  teamName: 'Sparta Prague',
  name: 'Adam Example',
  sources: [],
  needsReview: false,
  ...timestamps,
  ...overrides,
});

const renderPage = async (entity: CombinedEntityKind, rows: CombinedEntity[]) => {
  const api = {
    listCombinedEntities: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          rows,
          total: rows.length,
          pageIndex: 0,
          pageSize: 25,
        },
      }),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [CombinedEntityPage],
    providers: [
      provideRouter([]),
      { provide: DesktopApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
          snapshot: { data: { entity } },
        },
      },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CombinedEntityPage);
  await fixture.whenStable();

  return {
    element: fixture.nativeElement as HTMLElement,
    loader: TestbedHarnessEnvironment.loader(fixture),
  };
};

describe('CombinedEntityPage', () => {
  it('shows country and tier metadata for combined leagues', async () => {
    const { element, loader } = await renderPage('leagues', [
      league({
        countryName: 'England',
        countryCode2: 'GB',
        countryCode3: 'ENG',
        tier: 1,
      }),
      league({ id: 'league-2', name: 'Unknown League' }),
    ]);
    const table = await loader.getHarness(MatTableHarness);
    const header = (await table.getHeaderRows())[0];
    const rows = await table.getRows();

    expect(await header.getCellTextByIndex()).toEqual([
      'Name',
      'Parent',
      'Country',
      'Tier',
      'Sources',
      'Status',
      'Updated',
      'Actions',
    ]);
    expect(await rows[0].getCellTextByColumnName()).toMatchObject({
      country: 'England',
      tier: '1',
    });
    expect(await rows[1].getCellTextByColumnName()).toMatchObject({
      country: '—',
      tier: '—',
    });

    const renderedRows = element.querySelectorAll('tbody tr');
    const flag = renderedRows[0].querySelector<HTMLImageElement>('app-country-flag img');
    expect(flag?.getAttribute('alt')).toBe('');
    expect(flag?.getAttribute('src')).toContain('flags/20x15/gb-eng.png');
    expect(renderedRows[1].querySelector('app-country-flag')).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('shows country without player or tier columns for combined teams', async () => {
    const { element, loader } = await renderPage('teams', [
      team({
        countryName: 'Czech Republic',
        countryCode2: 'CZ',
        countryCode3: 'CZE',
      }),
    ]);
    const table = await loader.getHarness(MatTableHarness);
    const header = (await table.getHeaderRows())[0];
    const row = (await table.getRows())[0];

    expect(await header.getCellTextByIndex()).toEqual([
      'Name',
      'Parent',
      'Country',
      'Sources',
      'Status',
      'Updated',
      'Actions',
    ]);
    expect(await row.getCellTextByColumnName()).toMatchObject({
      country: 'Czech Republic',
    });
    expect(element.querySelector('.mat-column-tier')).toBeNull();
    expect(element.querySelector('.mat-column-jerseyNumber')).toBeNull();
    expect(
      element.querySelector<HTMLImageElement>('.mat-column-country app-country-flag img')?.src,
    ).toContain('flags/20x15/cz.png');
  });

  it('shows formatted player metadata and placeholders for missing values', async () => {
    const { element, loader } = await renderPage('players', [
      player({
        countryName: 'Senegal',
        countryCode2: 'SN',
        countryCode3: 'SEN',
        jerseyNumber: 9,
        position: 'ATTACKER',
        positionDetail: 'ST',
        birthdate: '1995-03-14',
        height: 183,
        foot: 'RIGHT',
      }),
      player({
        id: 'player-2',
        name: 'Unknown Player',
      }),
    ]);
    const table = await loader.getHarness(MatTableHarness);
    const header = (await table.getHeaderRows())[0];
    const rows = await table.getRows();

    expect(await header.getCellTextByIndex()).toEqual([
      'Name',
      'Parent',
      'Country',
      'Number',
      'Position',
      'Position detail',
      'Birth date',
      'Height',
      'Foot',
      'Sources',
      'Status',
      'Updated',
      'Actions',
    ]);
    expect(await rows[0].getCellTextByColumnName()).toMatchObject({
      country: 'Senegal',
      jerseyNumber: '9',
      position: 'ATT',
      positionDetail: 'ST',
      birthdate: formatReferenceDate('1995-03-14'),
      height: '183 cm',
      foot: 'Right',
    });
    expect(await rows[1].getCellTextByColumnName()).toMatchObject({
      country: '—',
      jerseyNumber: '—',
      position: '—',
      positionDetail: '—',
      birthdate: '—',
      height: '—',
      foot: '—',
    });

    const renderedRows = element.querySelectorAll('tbody tr');
    expect(
      renderedRows[0].querySelector('.mat-column-position abbr')?.getAttribute('aria-label'),
    ).toBe('Attacker');
    expect(
      renderedRows[0].querySelector('.mat-column-positionDetail abbr')?.getAttribute('aria-label'),
    ).toBe('Detailed position ST');
    expect(
      renderedRows[0].querySelector<HTMLImageElement>('.mat-column-country app-country-flag img')
        ?.src,
    ).toContain('flags/20x15/sn.png');
    expect(element.querySelector('.mat-column-tier')).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
