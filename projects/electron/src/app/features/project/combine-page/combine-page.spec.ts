import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MatStepperHarness } from '@angular/material/stepper/testing';
import { MatTooltipHarness } from '@angular/material/tooltip/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import axe from 'axe-core';
import type {
  CombineTeamCandidate,
  FieldConflict,
  League,
  PlayerMatchGroup,
  PlayerSourceRecord,
  SourceName,
  TeamCombinationPreview,
} from '../../../../../shared/contracts';
import { formatReferenceDate } from '../../../../../shared/reference-date';
import { DesktopApi } from '../../../core/desktop-api';
import { CombinePage } from './combine-page';

const candidate = (
  id: string,
  sourceName: SourceName,
  name: string,
  overrides: Partial<CombineTeamCandidate> = {},
): CombineTeamCandidate => ({
  id,
  projectId: 'project',
  sourceName,
  sourceId: id,
  name,
  sourceUrl: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const league = (
  id: string,
  sourceName: SourceName,
  name: string,
  overrides: Partial<League> = {},
): League => ({
  id,
  projectId: 'project',
  sourceName,
  sourceId: id,
  name,
  sourceUrl: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const player = (
  id: string,
  sourceName: SourceName,
  name: string,
  team: CombineTeamCandidate,
  overrides: Partial<PlayerSourceRecord> = {},
): PlayerSourceRecord => ({
  id,
  sourceName,
  sourceId: id,
  teamId: team.id,
  teamName: team.name,
  name,
  birthdate: '2000-01-01',
  ...overrides,
});

describe('CombinePage', () => {
  it('requires two providers and previews conservative player groups', async () => {
    const transfermarktLeague = league('tm-league', 'transfermarkt', 'Czech First League', {
      countryName: 'Czechia',
      countryCode2: 'CZ',
      tier: 1,
    });
    const transfermarktSecondLeague = league(
      'tm-league-two',
      'transfermarkt',
      'Czech Second League',
      {
        countryName: 'Czechia',
        countryCode2: 'CZ',
        tier: 2,
      },
    );
    const soccerwayLeague = league('sw-league', 'soccerway', 'Czech First League', {
      countryName: 'Czechia',
      countryCode2: 'CZ',
      tier: 1,
    });
    const transfermarkt = candidate('tm-team', 'transfermarkt', 'Team A', {
      leagueId: transfermarktLeague.id,
      leagueName: transfermarktLeague.name,
      countryName: 'Czechia',
      countryCode2: 'CZ',
    });
    const soccerway = candidate('sw-team', 'soccerway', 'Team A', {
      leagueId: soccerwayLeague.id,
      leagueName: soccerwayLeague.name,
      countryName: 'Czechia',
      countryCode2: 'CZ',
    });
    const linkedTeam = candidate('wf-team', 'worldfootball', 'Used Team', {
      combinedTeamId: 'another-combined-team',
      combinedTeamName: 'Already Combined',
    });
    const unassignedTeam = candidate('ef-team', 'eurofotbal', 'Unassigned Team', {
      countryName: 'Czechia',
      countryCode2: 'CZ',
    });
    const leagues: Record<SourceName, League[]> = {
      transfermarkt: [transfermarktLeague, transfermarktSecondLeague],
      soccerway: [soccerwayLeague],
      worldfootball: [],
      eurofotbal: [],
    };
    const teams: Record<SourceName, CombineTeamCandidate[]> = {
      transfermarkt: [transfermarkt],
      soccerway: [soccerway],
      worldfootball: [linkedTeam],
      eurofotbal: [unassignedTeam],
    };
    const players: PlayerSourceRecord[] = [
      {
        id: 'tm-player',
        sourceName: 'transfermarkt',
        sourceId: 'tm-player',
        teamId: transfermarkt.id,
        teamName: transfermarkt.name,
        name: 'Player One',
      },
      {
        id: 'sw-player',
        sourceName: 'soccerway',
        sourceId: 'sw-player',
        teamId: soccerway.id,
        teamName: soccerway.name,
        name: 'Player One',
      },
    ];
    const preview: TeamCombinationPreview = {
      sourceTeams: [transfermarkt, soccerway],
      matchGroups: [
        {
          id: 'group',
          players,
          automatic: true,
          ambiguous: false,
        },
      ],
      conflicts: [],
      sourceLeagues: [],
      combinedLeagues: [],
      existingResolutions: {},
      existingPlayerResolutions: {},
    };
    const api = {
      getSourcePriority: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: ['transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal'] as SourceName[],
        }),
      ),
      listCombineTeamCandidates: vi.fn(
        (
          _projectId: string,
          search: string,
          sourceName: SourceName,
          _combinedTeamId?: string,
          leagueId?: string,
        ) =>
          Promise.resolve({
            ok: true as const,
            value: teams[sourceName].filter(
              (team) =>
                (!leagueId || team.leagueId === leagueId) &&
                team.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            ),
          }),
      ),
      listEntities: vi.fn(
        (request: {
          sourceNames?: SourceName[];
          search: string;
          pageIndex: number;
          pageSize: number;
        }) => {
          const sourceName = request.sourceNames?.[0] ?? 'transfermarkt';
          const search = request.search.toLocaleLowerCase();
          const rows = leagues[sourceName].filter(
            (item) =>
              item.name.toLocaleLowerCase().includes(search) ||
              item.sourceId.toLocaleLowerCase().includes(search) ||
              item.countryName?.toLocaleLowerCase().includes(search),
          );
          return Promise.resolve({
            ok: true as const,
            value: {
              rows,
              total: rows.length,
              pageIndex: request.pageIndex,
              pageSize: request.pageSize,
            },
          });
        },
      ),
      getEntity: vi.fn(),
      previewTeamCombination: vi.fn(() => Promise.resolve({ ok: true as const, value: preview })),
    };
    await TestBed.configureTestingModule({
      imports: [CombinePage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);

    expect(await Promise.all((await stepper.getSteps()).map((step) => step.getLabel()))).toEqual([
      'Source teams',
      'League',
      'Player matches',
      'Conflicts',
      'Summary',
    ]);
    const stepIcons = [...element.querySelectorAll<HTMLElement>('.mat-step-icon-content')];
    expect(stepIcons.map((icon) => icon.textContent.trim())).toEqual(['1', '2', '3', '4', '5']);
    expect(stepIcons.every((icon) => !icon.querySelector('mat-icon'))).toBe(true);
    expect(element.querySelector('mat-stepper')?.classList.contains('qdb-wizard')).toBe(true);
    expect(element.querySelector('h1')?.textContent).toContain('Combine teams');
    expect(element.textContent).toContain('Source records remain unchanged.');
    expect(
      [...element.querySelectorAll('fieldset.provider-group > legend')].map((legend) =>
        legend.textContent.trim(),
      ),
    ).toEqual(['Transfermarkt', 'Soccerway', 'WorldFootball', 'Eurofotbal']);
    expect((await axe.run(element)).violations).toEqual([]);

    const autocompletes = await loader.getAllHarnesses(MatAutocompleteHarness);
    expect(autocompletes).toHaveLength(8);
    const transfermarktLeagueAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Transfermarkt leagues"]',
      }),
    );
    const transfermarktTeamAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Transfermarkt teams"]',
      }),
    );
    const soccerwayTeamAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Soccerway teams"]',
      }),
    );

    await transfermarktLeagueAutocomplete.enterText('Czech');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
    expect(api.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'leagues',
        search: 'Czech',
        sourceNames: ['transfermarkt'],
      }),
    );
    const leagueOptions = await transfermarktLeagueAutocomplete.getOptions();
    expect(await Promise.all(leagueOptions.map((option) => option.getText()))).toEqual([
      'Czech First League Tier 1',
      'Czech Second League Tier 2',
    ]);
    expect(
      document.querySelector<HTMLImageElement>('.mat-mdc-option app-country-flag img')?.src,
    ).toContain('/flags/20x15/cz.png');
    await transfermarktLeagueAutocomplete.selectOption({ text: /Czech First League/ });
    await fixture.whenStable();

    await transfermarktTeamAutocomplete.enterText('Team A');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
    expect(api.listCombineTeamCandidates).toHaveBeenCalledWith(
      'project',
      'Team A',
      'transfermarkt',
      undefined,
      'tm-league',
    );
    await transfermarktTeamAutocomplete.selectOption({ text: /Team A/ });
    await fixture.whenStable();
    expect(await transfermarktLeagueAutocomplete.getValue()).toBe('Czech First League');
    const leagueInput = element.querySelector<HTMLInputElement>(
      '[aria-label="Search Transfermarkt leagues"]',
    );
    const teamInput = element.querySelector<HTMLInputElement>(
      '[aria-label="Search Transfermarkt teams"]',
    );
    expect(
      leagueInput?.closest('.autocomplete-control')?.querySelector('app-country-flag'),
    ).not.toBeNull();
    expect(
      teamInput?.closest('.autocomplete-control')?.querySelector('app-country-flag'),
    ).not.toBeNull();
    expect(element.querySelector('.selected-tier')?.textContent).toContain('Tier 1');
    expect(element.querySelector('button[aria-label="Clear Transfermarkt league"]')).not.toBeNull();
    expect(element.querySelector('button[aria-label="Clear Transfermarkt team"]')).not.toBeNull();

    await transfermarktLeagueAutocomplete.clear();
    await transfermarktLeagueAutocomplete.enterText('Czech Second');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
    expect(api.listEntities).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Czech Second' }),
    );
    expect(
      await Promise.all(
        (await transfermarktLeagueAutocomplete.getOptions()).map((option) => option.getText()),
      ),
    ).toContain('Czech Second League Tier 2');
    await transfermarktLeagueAutocomplete.selectOption({ text: /Czech Second League/ });
    expect(await transfermarktTeamAutocomplete.getValue()).toBe('');

    await transfermarktLeagueAutocomplete.clear();
    await transfermarktLeagueAutocomplete.enterText('Czech First');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
    await transfermarktLeagueAutocomplete.selectOption({ text: /Czech First League/ });
    await transfermarktTeamAutocomplete.enterText('Team A');
    await transfermarktTeamAutocomplete.selectOption({ text: /Team A/ });
    await (
      await loader.getHarness(
        MatButtonHarness.with({
          selector: 'button[aria-label="Clear Transfermarkt league"]',
        }),
      )
    ).click();
    expect(await transfermarktLeagueAutocomplete.getValue()).toBe('');
    expect(await transfermarktTeamAutocomplete.getValue()).toBe('Team A');

    await soccerwayTeamAutocomplete.enterText('Team A');
    await soccerwayTeamAutocomplete.selectOption({ text: /Team A/ });
    const soccerwayLeagueAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Soccerway leagues"]',
      }),
    );
    expect(await soccerwayLeagueAutocomplete.getValue()).toBe('Czech First League');

    const worldFootballTeamAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search WorldFootball teams"]',
      }),
    );
    await worldFootballTeamAutocomplete.enterText('Used');
    const [usedOption] = await worldFootballTeamAutocomplete.getOptions({
      text: /Already Combined/,
    });
    expect(usedOption).toBeDefined();
    expect(await usedOption.isDisabled()).toBe(true);

    const eurofotbalTeamAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Eurofotbal teams"]',
      }),
    );
    await eurofotbalTeamAutocomplete.enterText('Unassigned');
    await eurofotbalTeamAutocomplete.selectOption({ text: /Unassigned Team/ });
    const eurofotbalLeagueAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Eurofotbal leagues"]',
      }),
    );
    expect(await eurofotbalLeagueAutocomplete.getValue()).toBe('');
    await fixture.whenStable();

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Identify players' }))).click();
    await fixture.whenStable();

    expect(api.previewTeamCombination).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project',
        sourceTeamIds: expect.arrayContaining(['tm-team', 'sw-team']),
      }),
    );
    expect(api.previewTeamCombination).toHaveBeenCalledTimes(1);
    const stepsAfterIdentification = await stepper.getSteps();
    expect(await stepsAfterIdentification[0].isCompleted()).toBe(true);
    expect(await stepsAfterIdentification[1].isSelected()).toBe(true);
  });

  it('starts recombination at source teams with existing links preselected', async () => {
    const linkedLeague = league('tm-league', 'transfermarkt', 'Czech First League');
    const linkedTeam: CombineTeamCandidate = {
      ...candidate('tm-team', 'transfermarkt', 'Team A', {
        leagueId: linkedLeague.id,
        leagueName: linkedLeague.name,
      }),
      combinedTeamId: 'combined-team',
      combinedTeamName: 'Team A',
    };
    const api = {
      getSourcePriority: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: ['transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal'] as SourceName[],
        }),
      ),
      listCombineTeamCandidates: vi.fn(
        (_projectId: string, _search: string, sourceName: SourceName) =>
          Promise.resolve({
            ok: true as const,
            value: sourceName === 'transfermarkt' ? [linkedTeam] : [],
          }),
      ),
      listEntities: vi.fn((request: { sourceNames?: SourceName[] }) =>
        Promise.resolve({
          ok: true as const,
          value: {
            rows: request.sourceNames?.[0] === 'transfermarkt' ? [linkedLeague] : [],
            total: request.sourceNames?.[0] === 'transfermarkt' ? 1 : 0,
            pageIndex: 0,
            pageSize: 100,
          },
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [CombinePage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
            snapshot: { queryParamMap: convertToParamMap({ teamId: 'combined-team' }) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);

    expect(element.querySelector('h1')?.textContent).toContain('Recombine team');
    expect(element.textContent).toContain('Existing linked teams are preselected.');
    expect(await Promise.all((await stepper.getSteps()).map((step) => step.getLabel()))).toEqual([
      'Source teams',
      'League',
      'Player matches',
      'Conflicts',
      'Summary',
    ]);
    const teamAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Transfermarkt teams"]',
      }),
    );
    const leagueAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Transfermarkt leagues"]',
      }),
    );
    expect(await teamAutocomplete.getValue()).toBe('Team A');
    expect(await leagueAutocomplete.getValue()).toBe('Czech First League');
    expect(element.textContent).not.toContain('Matched automatically from');
    expect(element.textContent).toContain('1 providers selected');
  });

  it('remains on source teams when player identification fails', async () => {
    const soccerway = candidate('sw-team', 'soccerway', 'Artis Brno', {
      combinedTeamId: 'combined-team',
      combinedTeamName: 'Artis Brno',
    });
    const eurofotbal = candidate('ef-team', 'eurofotbal', 'Artis Brno', {
      combinedTeamId: 'combined-team',
      combinedTeamName: 'Artis Brno',
    });
    const api = {
      getSourcePriority: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: ['soccerway', 'eurofotbal', 'transfermarkt', 'worldfootball'] as SourceName[],
        }),
      ),
      listCombineTeamCandidates: vi.fn(
        (_projectId: string, _search: string, sourceName: SourceName) =>
          Promise.resolve({
            ok: true as const,
            value:
              sourceName === 'soccerway'
                ? [soccerway]
                : sourceName === 'eurofotbal'
                  ? [eurofotbal]
                  : [],
          }),
      ),
      listEntities: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { rows: [], total: 0, pageIndex: 0, pageSize: 100 },
        }),
      ),
      previewTeamCombination: vi.fn(() =>
        Promise.resolve({
          ok: false as const,
          error: { code: 'INVALID_INPUT' as const, message: 'Unable to identify players.' },
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [CombinePage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
            snapshot: { queryParamMap: convertToParamMap({ teamId: 'combined-team' }) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    const identifyPlayers = await loader.getHarness(
      MatButtonHarness.with({ text: 'Identify players' }),
    );

    await identifyPlayers.click();
    await fixture.whenStable();

    expect(api.previewTeamCombination).toHaveBeenCalledTimes(1);
    const steps = await stepper.getSteps();
    expect(await steps[0].isSelected()).toBe(true);
    expect(await steps[0].isCompleted()).toBe(false);
    expect(await identifyPlayers.isDisabled()).toBe(false);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to identify players.',
    );
  });

  it('automatically selects only a unique normalized and country-compatible team', async () => {
    const soccerwayLeague = league('sw-league', 'soccerway', 'Chance Liga');
    const eurofotbalLeague = league('ef-league', 'eurofotbal', 'Chance Liga');
    const soccerway = candidate('sw-team', 'soccerway', 'Artís—Brno', {
      leagueId: soccerwayLeague.id,
      leagueName: soccerwayLeague.name,
      countryCode2: 'cz',
      countryCode3: 'cze',
    });
    const eurofotbal = candidate('ef-team', 'eurofotbal', 'ARTIS BRNO', {
      leagueId: eurofotbalLeague.id,
      leagueName: eurofotbalLeague.name,
      countryCode2: 'CZ',
      countryCode3: 'CZE',
    });
    const linkedEurofotbal = candidate('ef-linked', 'eurofotbal', 'Artis / Brno', {
      countryCode2: 'CZ',
      combinedTeamId: 'different-combined-team',
      combinedTeamName: 'Other canonical team',
    });
    const ambiguousWorldFootball = [
      candidate('wf-team-one', 'worldfootball', 'Artis Brno', { countryCode2: 'CZ' }),
      candidate('wf-team-two', 'worldfootball', 'Artís / Brno', { countryCode2: 'CZ' }),
    ];
    const wrongCountry = candidate('tm-team', 'transfermarkt', 'Artis Brno', {
      countryCode2: 'SK',
      countryCode3: 'SVK',
    });
    const teams: Record<SourceName, CombineTeamCandidate[]> = {
      transfermarkt: [wrongCountry],
      soccerway: [soccerway],
      worldfootball: ambiguousWorldFootball,
      eurofotbal: [eurofotbal, linkedEurofotbal],
    };
    const leagues: Record<SourceName, League[]> = {
      transfermarkt: [],
      soccerway: [soccerwayLeague],
      worldfootball: [],
      eurofotbal: [eurofotbalLeague],
    };
    const preview: TeamCombinationPreview = {
      sourceTeams: [soccerway, eurofotbal],
      matchGroups: [],
      conflicts: [],
      sourceLeagues: [],
      combinedLeagues: [],
      existingResolutions: {},
      existingPlayerResolutions: {},
    };
    const api = {
      getSourcePriority: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: ['transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal'] as SourceName[],
        }),
      ),
      listCombineTeamCandidates: vi.fn(
        (_projectId: string, _search: string, sourceName: SourceName) =>
          Promise.resolve({ ok: true as const, value: teams[sourceName] }),
      ),
      listEntities: vi.fn((request: { sourceNames?: SourceName[] }) => {
        const rows = leagues[request.sourceNames?.[0] ?? 'transfermarkt'];
        return Promise.resolve({
          ok: true as const,
          value: { rows, total: rows.length, pageIndex: 0, pageSize: 100 },
        });
      }),
      previewTeamCombination: vi.fn(() => Promise.resolve({ ok: true as const, value: preview })),
    };
    await TestBed.configureTestingModule({
      imports: [CombinePage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    const soccerwayAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Soccerway teams"]',
      }),
    );

    await soccerwayAutocomplete.enterText('Artís');
    await soccerwayAutocomplete.selectOption({ text: /Artís—Brno/ });
    await fixture.whenStable();

    const eurofotbalAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Eurofotbal teams"]',
      }),
    );
    const eurofotbalLeagueAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Eurofotbal leagues"]',
      }),
    );
    const worldFootballAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search WorldFootball teams"]',
      }),
    );
    const transfermarktAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({
        selector: '[aria-label="Search Transfermarkt teams"]',
      }),
    );
    expect(await eurofotbalAutocomplete.getValue()).toBe('ARTIS BRNO');
    expect(await eurofotbalLeagueAutocomplete.getValue()).toBe('Chance Liga');
    expect(await worldFootballAutocomplete.getValue()).toBe('');
    expect(await transfermarktAutocomplete.getValue()).toBe('');
    expect(element.textContent).toContain('Matched automatically from Soccerway');
    expect(element.textContent).toContain('2 providers selected');
    expect(element.textContent).toContain('1 matched automatically');
    expect(api.listCombineTeamCandidates).toHaveBeenCalledWith(
      'project',
      'artis',
      'eurofotbal',
      undefined,
      undefined,
    );
    const identifyPlayers = await loader.getHarness(
      MatButtonHarness.with({ text: 'Identify players' }),
    );
    expect(await identifyPlayers.isDisabled()).toBe(false);
    expect((await axe.run(element)).violations).toEqual([]);

    await identifyPlayers.click();
    await fixture.whenStable();

    expect(api.previewTeamCombination).toHaveBeenCalledTimes(1);
    const stepsAfterIdentification = await stepper.getSteps();
    expect(await stepsAfterIdentification[0].isCompleted()).toBe(true);
    expect(await stepsAfterIdentification[1].isSelected()).toBe(true);

    await stepper.selectStep({ label: 'Source teams' });
    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'button[aria-label="Clear Soccerway team"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(await soccerwayAutocomplete.getValue()).toBe('');
    expect(await eurofotbalAutocomplete.getValue()).toBe('');
    expect(await eurofotbalLeagueAutocomplete.getValue()).toBe('');
    expect(element.textContent).not.toContain('Matched automatically from');
    expect(element.textContent).toContain('0 providers selected');
  });

  it('ignores automatic matches that finish after the anchor is cleared', async () => {
    const transfermarkt = candidate('tm-team', 'transfermarkt', 'Team A');
    const soccerway = candidate('sw-team', 'soccerway', 'Team A');
    const pendingResolvers: ((result: { ok: true; value: CombineTeamCandidate[] }) => void)[] = [];
    const api = {
      getSourcePriority: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: ['transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal'] as SourceName[],
        }),
      ),
      listCombineTeamCandidates: vi.fn(
        (_projectId: string, search: string, sourceName: SourceName) => {
          if (sourceName === 'soccerway' && search) {
            return new Promise<{ ok: true; value: CombineTeamCandidate[] }>((resolve) => {
              pendingResolvers.push(resolve);
            });
          }
          return Promise.resolve({
            ok: true as const,
            value:
              sourceName === 'transfermarkt'
                ? [transfermarkt]
                : sourceName === 'soccerway'
                  ? [soccerway]
                  : [],
          });
        },
      ),
      listEntities: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { rows: [], total: 0, pageIndex: 0, pageSize: 100 },
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [CombinePage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinePage);
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      selectTeam(sourceName: SourceName, event: { option: { value: CombineTeamCandidate } }): void;
      clearTeam(sourceName: SourceName): void;
      autoMatching(): boolean;
      selectedTeamIds(): Partial<Record<SourceName, string>>;
    };

    component.selectTeam('transfermarkt', { option: { value: transfermarkt } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.autoMatching()).toBe(true);
    expect(pendingResolvers).toHaveLength(2);
    const element = fixture.nativeElement as HTMLElement;
    const identifyButton = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent.includes('Identify players'),
    );
    expect(element.textContent).toContain('Finding matching teams in other providers');
    expect(identifyButton?.disabled).toBe(true);

    component.clearTeam('transfermarkt');
    for (const resolve of pendingResolvers) {
      resolve({ ok: true, value: [soccerway] });
    }
    await fixture.whenStable();

    expect(component.autoMatching()).toBe(false);
    expect(component.selectedTeamIds().transfermarkt).toBeUndefined();
    expect(component.selectedTeamIds().soccerway).toBeUndefined();
    expect(element.textContent).not.toContain('Matched automatically from');
  });

  it('aligns selected providers and supports swap, merge, and split drops', async () => {
    const { fixture, element, loader } = await createAlignmentFixture();

    expect(
      [...element.querySelectorAll<HTMLElement>('.alignment-header [role="columnheader"]')].map(
        (header) => header.textContent.trim(),
      ),
    ).toEqual(['Soccerway', 'Eurofotbal']);
    expect(element.querySelector('[data-group-id="group-a"]')?.textContent).toContain(
      'Automatic match',
    );
    const soccerwayAdam = element.querySelector<HTMLElement>('[data-player-id="sw-adam"]');
    expect(soccerwayAdam?.querySelector('.player-birthdate')?.textContent.trim()).toBe(
      formatReferenceDate('2000-01-01'),
    );
    expect(soccerwayAdam?.querySelector<HTMLImageElement>('app-country-flag img')?.src).toContain(
      '/flags/20x15/cz.png',
    );
    expect(
      soccerwayAdam?.querySelector('app-country-flag picture')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(soccerwayAdam?.querySelector('.player-country-name')?.textContent.trim()).toBe(
      'Czechia',
    );
    const goalkeeperBadge = soccerwayAdam?.querySelector('app-position-badge abbr');
    expect(goalkeeperBadge?.textContent.trim()).toBe('GK');
    expect(goalkeeperBadge?.getAttribute('aria-label')).toBe('Goalkeeper');
    expect(goalkeeperBadge?.getAttribute('title')).toBe('Goalkeeper');
    const eurofotbalAdam = element.querySelector<HTMLElement>('[data-player-id="ef-adam"]');
    expect(eurofotbalAdam?.querySelector('.player-country-name')?.textContent.trim()).toBe(
      'Czechia',
    );
    expect(eurofotbalAdam?.querySelector('app-country-flag')).toBeNull();
    const soccerwayBruno = element.querySelector<HTMLElement>('[data-player-id="sw-bruno"]');
    expect(soccerwayBruno?.querySelector('.player-country-name')?.textContent.trim()).toBe('SK');
    const eurofotbalBruno = element.querySelector<HTMLElement>('[data-player-id="ef-bruno"]');
    expect(eurofotbalBruno?.querySelector('.player-birthdate')?.textContent.trim()).toBe(
      'Birthdate unknown',
    );
    expect(eurofotbalBruno?.querySelector('.player-country')).toBeNull();
    expect(eurofotbalBruno?.querySelector('app-position-badge')).toBeNull();
    expect(
      ['ef-adam', 'sw-bruno', 'sw-carlo'].map((id) =>
        element
          .querySelector(`[data-player-id="${id}"] app-position-badge abbr`)
          ?.textContent.trim(),
      ),
    ).toEqual(['DEF', 'MID', 'ATT']);
    for (const [action, text] of [
      ['drag', 'Drag to align this player with another row'],
      ['up', 'Move this player up one row'],
      ['down', 'Move this player down one row'],
      ['separate', 'Separate this player into a new unmatched row'],
    ] as const) {
      const tooltip = await loader.getHarness(
        MatTooltipHarness.with({ selector: `[data-player-action="${action}-sw-adam"]` }),
      );
      await tooltip.show();
      expect(await tooltip.getTooltipText()).toBe(text);
      await tooltip.hide();
    }
    const disabledUpButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '[aria-label="Move Adam SW up one row"]' }),
    );
    expect(await disabledUpButton.isDisabled()).toBe(true);
    expect(
      element
        .querySelector('[data-player-action="drag-sw-adam"] button')
        ?.classList.contains('player-drag-handle'),
    ).toBe(true);
    expect((await axe.run(element)).violations).toEqual([]);

    await dropPlayer(fixture, 'group-b', 'eurofotbal', {
      groupId: 'group-a',
      playerId: 'ef-adam',
      sourceName: 'eurofotbal',
      canSeparate: true,
    });
    expect(playersInRow(element, 'group-a')).toEqual(['sw-adam', 'ef-bruno']);
    expect(playersInRow(element, 'group-b')).toEqual(['sw-bruno', 'ef-adam']);

    await dropPlayer(fixture, 'group-d', 'soccerway', {
      groupId: 'group-c',
      playerId: 'sw-carlo',
      sourceName: 'soccerway',
      canSeparate: false,
    });
    expect(element.querySelector('[data-group-id="group-c"]')).toBeNull();
    expect(playersInRow(element, 'group-d')).toEqual(['sw-carlo', 'ef-dora']);

    await dropPlayer(fixture, undefined, 'soccerway', {
      groupId: 'group-a',
      playerId: 'sw-adam',
      sourceName: 'soccerway',
      canSeparate: true,
    });
    expect(playersInRow(element, 'group-a')).toEqual(['ef-bruno']);
    const rows = readMatchGroups(fixture);
    expect(rows.at(-1)?.players.map(({ id }) => id)).toEqual(['sw-adam']);
    expect(rows.flatMap(({ players }) => players.map(({ id }) => id)).sort()).toEqual(
      [
        'ef-adam',
        'ef-bruno',
        'ef-dora',
        'ef-evan',
        'sw-adam',
        'sw-bruno',
        'sw-carlo',
        'sw-evan',
      ].sort(),
    );
    expect(readPlayerResolutions(fixture)).toEqual({
      'group-e': { name: { mode: 'custom', value: 'Evan' } },
    });
  });

  it('provides keyboard-equivalent row movement and separation controls', async () => {
    const { fixture, element, loader } = await createAlignmentFixture();

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: '[aria-label="Move Adam SW down one row"]' }),
      )
    ).click();
    await fixture.whenStable();
    expect(playersInRow(element, 'group-a')).toEqual(['sw-bruno', 'ef-adam']);
    expect(playersInRow(element, 'group-b')).toEqual(['sw-adam', 'ef-bruno']);
    expect(
      element.querySelector<HTMLButtonElement>('[data-player-id="sw-adam"] .player-drag-handle'),
    ).toBe(document.activeElement);

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: '[aria-label="Separate Adam SW into a new row"]' }),
      )
    ).click();
    await fixture.whenStable();
    expect(
      readMatchGroups(fixture)
        .at(-1)
        ?.players.map(({ id }) => id),
    ).toEqual(['sw-adam']);
    expect(
      element.querySelector<HTMLButtonElement>('[data-player-id="sw-adam"] .player-drag-handle'),
    ).toBe(document.activeElement);
  });

  it('reviews only conflicting entities and fields with distinct, automatically selected values', async () => {
    const { fixture, element, loader } = await createConflictReviewFixture();
    const cards = [...element.querySelectorAll<HTMLElement>('[data-review-card]')];

    expect(cards.map((card) => card.dataset['reviewCard'])).toEqual(['team', 'player-group-a']);
    expect(cards[0]?.textContent).toContain('Český Team');
    expect(cards[0]?.querySelector('mat-card-subtitle')).toBeNull();
    expect(
      [...(cards[0]?.querySelectorAll<HTMLElement>('[data-review-field]') ?? [])].map(
        (field) => field.dataset['reviewField'],
      ),
    ).toEqual(['name']);
    expect(cards[1]?.querySelector('mat-card-subtitle')).toBeNull();
    expect(cards[0]?.querySelector('.player-metadata')).toBeNull();
    expect(cards[1]?.querySelector('.player-birthdate')?.textContent.trim()).toBe(
      formatReferenceDate('2000-01-01'),
    );
    expect(cards[1]?.querySelector<HTMLImageElement>('app-country-flag img')?.src).toContain(
      '/flags/20x15/cz.png',
    );
    expect(cards[1]?.querySelector('app-country-flag picture')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(cards[1]?.querySelector('.player-country-name')?.textContent.trim()).toBe('Czechia');
    expect(
      [...(cards[1]?.querySelectorAll<HTMLElement>('[data-review-field]') ?? [])].map(
        (field) => field.dataset['reviewField'],
      ),
    ).toEqual(['name', 'position', 'positionDetail', 'height']);

    const teamNameGroup = await loader.getHarness(
      MatButtonToggleGroupHarness.with({
        selector: '[data-review-card="team"] [data-review-field="name"] mat-button-toggle-group',
      }),
    );
    const teamNameOptions = await teamNameGroup.getToggles();
    expect(teamNameOptions).toHaveLength(2);
    expect(await teamNameOptions[0].getText()).toBe('Cesky Team');
    expect(await teamNameOptions[0].isChecked()).toBe(false);
    expect(await teamNameOptions[1].getText()).toBe('Český Team');
    expect(await teamNameOptions[1].isChecked()).toBe(true);

    const playerNameGroup = await loader.getHarness(
      MatButtonToggleGroupHarness.with({
        selector:
          '[data-review-card="player-group-a"] [data-review-field="name"] mat-button-toggle-group',
      }),
    );
    const playerNameOptions = await playerNameGroup.getToggles();
    expect(await playerNameOptions[0].getText()).toBe('David Simek');
    expect(await playerNameOptions[0].isChecked()).toBe(false);
    expect(await playerNameOptions[1].getText()).toBe('David Šimek');
    expect(await playerNameOptions[1].isChecked()).toBe(true);
    await playerNameOptions[0].check();
    await fixture.whenStable();
    expect(
      element
        .querySelector('[data-review-card="player-group-a"] mat-card-title span')
        ?.textContent.trim(),
    ).toBe('David Simek');
    expect(readPlayerResolutions(fixture)).toMatchObject({
      'group-a': { name: { mode: 'source', sourceName: 'soccerway' } },
    });

    const positionGroup = await loader.getHarness(
      MatButtonToggleGroupHarness.with({
        selector:
          '[data-review-card="player-group-a"] [data-review-field="position"] mat-button-toggle-group',
      }),
    );
    const positionOptions = await positionGroup.getToggles();
    expect(positionOptions).toHaveLength(2);
    const defender = await positionGroup.getToggles({
      text: /Defender/,
    });
    expect(await defender[0].getText()).toBe('Defender');
    expect(await defender[0].isChecked()).toBe(true);

    const midfielder = await positionGroup.getToggles({ text: /Midfielder/ });
    await midfielder[0].check();
    await fixture.whenStable();
    expect(
      element
        .querySelector(
          '[data-review-card="player-group-a"] mat-card-header > app-position-badge abbr',
        )
        ?.textContent.trim(),
    ).toBe('MID');
    expect(readPlayerResolutions(fixture)).toMatchObject({
      'group-a': { position: { mode: 'source', sourceName: 'eurofotbal' } },
    });

    expect(element.querySelector('.custom-resolution')).toBeNull();
    expect(
      await loader.getHarnessOrNull(MatButtonHarness.with({ text: /Auto-resolve all/ })),
    ).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('shows an accessible empty state when there are no conflicts', async () => {
    const { fixture, element, loader } = await createConflictReviewFixture({
      withoutConflicts: true,
    });

    expect(element.querySelector('[data-review-card]')).toBeNull();
    expect(element.querySelector('[role="status"]')?.textContent.trim()).toBe(
      'No conflicts to resolve.',
    );
    expect(
      await loader.getHarnessOrNull(MatButtonHarness.with({ text: /Auto-resolve all/ })),
    ).toBeNull();
    expect(await loader.getHarness(MatButtonHarness.with({ text: 'Back' }))).toBeDefined();
    expect((await axe.run(element)).violations).toEqual([]);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Review summary' }))).click();
    await fixture.whenStable();
    const steps = await (await loader.getHarness(MatStepperHarness)).getSteps();
    expect(await steps[4].isSelected()).toBe(true);
  });
});

const createConflictReviewFixture = async ({
  withoutConflicts = false,
}: { withoutConflicts?: boolean } = {}) => {
  const soccerway = candidate('sw-team', 'soccerway', 'Cesky Team', {
    combinedTeamId: 'combined-team',
    combinedTeamName: 'Český Team',
    countryName: 'Czechia',
  });
  const eurofotbal = candidate(
    'ef-team',
    'eurofotbal',
    withoutConflicts ? 'Cesky Team' : 'Český Team',
    {
      combinedTeamId: 'combined-team',
      combinedTeamName: 'Český Team',
      countryName: 'Czechia',
    },
  );
  const worldfootball = candidate('wf-team', 'worldfootball', 'Cesky Team', {
    combinedTeamId: 'combined-team',
    combinedTeamName: 'Český Team',
    countryName: 'Czechia',
  });
  const playerGroups: PlayerMatchGroup[] = [
    {
      id: 'group-a',
      players: withoutConflicts
        ? [player('sw-adam', 'soccerway', 'David Simek', soccerway)]
        : [
            player('sw-adam', 'soccerway', 'David Simek', soccerway, {
              position: 'DEFENDER',
              positionDetail: 'CB',
              height: 180,
              countryName: 'Czechia',
              countryCode2: 'CZ',
              joined: '2024-07-01',
              marketValue: 1_000_000,
              minutesPlayed: 1200,
            }),
            player('ef-adam', 'eurofotbal', 'David Šimek', eurofotbal, {
              position: 'MIDFIELDER',
              positionDetail: 'CM',
              height: 181,
              countryName: 'Czechia',
            }),
            player('wf-adam', 'worldfootball', 'David Simek', worldfootball, {
              position: 'DEFENDER',
              positionDetail: 'CB',
              height: 180,
              countryName: 'Czechia',
            }),
          ],
      automatic: true,
      ambiguous: false,
    },
    {
      id: 'group-b',
      players: [
        player('wf-bruno', 'worldfootball', 'Bruno', worldfootball, {
          position: 'ATTACKER',
          jerseyNumber: 9,
        }),
      ],
      automatic: false,
      ambiguous: false,
    },
  ];
  const teamConflicts: FieldConflict[] = withoutConflicts
    ? []
    : [
        {
          entity: 'team',
          entityId: 'team',
          field: 'name',
          values: [
            { sourceName: 'soccerway', value: 'Cesky Team' },
            { sourceName: 'eurofotbal', value: 'Český Team' },
            { sourceName: 'worldfootball', value: 'Cesky Team' },
          ],
          resolvedValue: 'Český Team',
        },
      ];
  const preview: TeamCombinationPreview = {
    sourceTeams: [soccerway, eurofotbal, worldfootball],
    matchGroups: playerGroups,
    conflicts: teamConflicts,
    sourceLeagues: [],
    combinedLeagues: [],
    existingResolutions: {},
    existingPlayerResolutions: {},
  };
  const teams: Partial<Record<SourceName, CombineTeamCandidate>> = {
    soccerway,
    eurofotbal,
    worldfootball,
  };
  const api = {
    getSourcePriority: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: ['soccerway', 'eurofotbal', 'worldfootball', 'transfermarkt'] as SourceName[],
      }),
    ),
    listCombineTeamCandidates: vi.fn(
      (_projectId: string, _search: string, sourceName: SourceName) =>
        Promise.resolve({
          ok: true as const,
          value: teams[sourceName] ? [teams[sourceName]] : [],
        }),
    ),
    listEntities: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { rows: [], total: 0, pageIndex: 0, pageSize: 100 },
      }),
    ),
    previewTeamCombination: vi.fn(() => Promise.resolve({ ok: true as const, value: preview })),
  };
  await TestBed.configureTestingModule({
    imports: [CombinePage],
    providers: [
      provideRouter([]),
      { provide: DesktopApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
          snapshot: { queryParamMap: convertToParamMap({ teamId: 'combined-team' }) },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CombinePage);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  await (await loader.getHarness(MatButtonHarness.with({ text: 'Identify players' }))).click();
  await fixture.whenStable();
  await (await loader.getHarness(MatButtonHarness.with({ text: 'Review matches' }))).click();
  await fixture.whenStable();
  await (await loader.getHarness(MatButtonHarness.with({ text: 'Resolve fields' }))).click();
  await fixture.whenStable();
  return { fixture, loader, element: fixture.nativeElement as HTMLElement };
};

const createAlignmentFixture = async () => {
  const soccerway = candidate('sw-team', 'soccerway', 'Team A', {
    combinedTeamId: 'combined-team',
    combinedTeamName: 'Team A',
  });
  const eurofotbal = candidate('ef-team', 'eurofotbal', 'Team A', {
    combinedTeamId: 'combined-team',
    combinedTeamName: 'Team A',
  });
  const matchGroups: PlayerMatchGroup[] = [
    {
      id: 'group-a',
      players: [
        player('sw-adam', 'soccerway', 'Adam SW', soccerway, {
          countryName: 'Czechia',
          countryCode2: 'CZ',
          position: 'GOALKEEPER',
        }),
        player('ef-adam', 'eurofotbal', 'Adam EF', eurofotbal, {
          countryName: 'Czechia',
          position: 'DEFENDER',
        }),
      ],
      automatic: true,
      ambiguous: false,
    },
    {
      id: 'group-b',
      players: [
        player('sw-bruno', 'soccerway', 'Bruno SW', soccerway, {
          countryCode2: 'SK',
          position: 'MIDFIELDER',
        }),
        player('ef-bruno', 'eurofotbal', 'Bruno EF', eurofotbal, {
          birthdate: undefined,
        }),
      ],
      automatic: true,
      ambiguous: false,
    },
    {
      id: 'group-c',
      players: [
        player('sw-carlo', 'soccerway', 'Carlo SW', soccerway, {
          position: 'ATTACKER',
        }),
      ],
      automatic: false,
      ambiguous: false,
    },
    {
      id: 'group-d',
      players: [player('ef-dora', 'eurofotbal', 'Dora EF', eurofotbal)],
      automatic: false,
      ambiguous: false,
    },
    {
      id: 'group-e',
      players: [
        player('sw-evan', 'soccerway', 'Evan SW', soccerway),
        player('ef-evan', 'eurofotbal', 'Evan EF', eurofotbal),
      ],
      automatic: false,
      ambiguous: false,
    },
  ];
  const preview: TeamCombinationPreview = {
    sourceTeams: [soccerway, eurofotbal],
    matchGroups,
    conflicts: [],
    sourceLeagues: [],
    combinedLeagues: [],
    existingResolutions: {},
    existingPlayerResolutions: {
      'group-a': { name: { mode: 'custom', value: 'Adam' } },
      'group-b': { name: { mode: 'custom', value: 'Bruno' } },
      'group-c': { name: { mode: 'custom', value: 'Carlo' } },
      'group-d': { name: { mode: 'custom', value: 'Dora' } },
      'group-e': { name: { mode: 'custom', value: 'Evan' } },
    },
  };
  const api = {
    getSourcePriority: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: ['soccerway', 'eurofotbal', 'transfermarkt', 'worldfootball'] as SourceName[],
      }),
    ),
    listCombineTeamCandidates: vi.fn(
      (_projectId: string, _search: string, sourceName: SourceName) =>
        Promise.resolve({
          ok: true as const,
          value:
            sourceName === 'soccerway'
              ? [soccerway]
              : sourceName === 'eurofotbal'
                ? [eurofotbal]
                : [],
        }),
    ),
    listEntities: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { rows: [], total: 0, pageIndex: 0, pageSize: 100 },
      }),
    ),
    previewTeamCombination: vi.fn(() => Promise.resolve({ ok: true as const, value: preview })),
  };
  await TestBed.configureTestingModule({
    imports: [CombinePage],
    providers: [
      provideRouter([]),
      { provide: DesktopApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
          snapshot: { queryParamMap: convertToParamMap({ teamId: 'combined-team' }) },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CombinePage);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const stepper = await loader.getHarness(MatStepperHarness);
  await (await loader.getHarness(MatButtonHarness.with({ text: 'Identify players' }))).click();
  await fixture.whenStable();
  expect(await (await stepper.getSteps())[1].isSelected()).toBe(true);
  await (await loader.getHarness(MatButtonHarness.with({ text: 'Review matches' }))).click();
  await fixture.whenStable();
  expect(await (await stepper.getSteps())[2].isSelected()).toBe(true);
  return { fixture, loader, element: fixture.nativeElement as HTMLElement };
};

const dropPlayer = async (
  fixture: ComponentFixture<CombinePage>,
  groupId: string | undefined,
  sourceName: SourceName,
  data: {
    groupId: string;
    playerId: string;
    sourceName: SourceName;
    canSeparate: boolean;
  },
): Promise<void> => {
  const selector = groupId
    ? `[data-cell-group-id="${groupId}"][data-source-name="${sourceName}"]`
    : `[data-new-row="true"][data-source-name="${sourceName}"]`;
  const cell = fixture.debugElement.query(By.css(selector));
  expect(cell).not.toBeNull();
  cell.triggerEventHandler('cdkDropListDropped', {
    item: { data },
    container: { data: { groupId, sourceName, newRow: !groupId } },
  });
  await fixture.whenStable();
};

const playersInRow = (element: HTMLElement, groupId: string): string[] =>
  [
    ...(element
      .querySelector(`[data-group-id="${groupId}"]`)
      ?.querySelectorAll('[data-player-id]') ?? []),
  ].map((tile) => (tile as HTMLElement).dataset['playerId'] ?? '');

const readMatchGroups = (fixture: ComponentFixture<CombinePage>) =>
  (
    fixture.componentInstance as unknown as {
      matchGroups: () => PlayerMatchGroup[];
    }
  ).matchGroups();

const readPlayerResolutions = (fixture: ComponentFixture<CombinePage>) =>
  (
    fixture.componentInstance as unknown as {
      playerResolutions: () => Record<string, unknown>;
    }
  ).playerResolutions();
