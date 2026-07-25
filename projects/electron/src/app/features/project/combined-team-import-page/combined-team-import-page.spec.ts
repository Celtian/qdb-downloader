import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatStepperHarness } from '@angular/material/stepper/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import axe from 'axe-core';
import type {
  CombinedLeague,
  CombinedTeam,
  CombineTeamCandidate,
  League,
  PlayerMatchGroup,
  SourceName,
  TeamCombinationPreview,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { CombinedTeamImportPage } from './combined-team-import-page';

@Component({ template: '<p>{{ heading }}</p>' })
class CombinedTeamsTestPage {
  protected readonly heading = 'Combined teams';
}

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

const team = (
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

const combinedLeague = (id: string, name: string): CombinedLeague => ({
  id,
  projectId: 'project',
  name,
  sources: [],
  needsReview: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const playerGroup: PlayerMatchGroup = {
  id: 'player-group',
  players: [
    {
      id: 'source-player',
      sourceName: 'transfermarkt',
      sourceId: 'source-player',
      teamId: 'available-team',
      teamName: 'Available Team',
      name: 'Player One',
    },
  ],
  automatic: false,
  ambiguous: false,
};

const importedTeam: CombinedTeam = {
  id: 'combined-team',
  projectId: 'project',
  name: 'Available Team',
  sources: [],
  needsReview: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createPage = async (previewTeamCombination: ReturnType<typeof vi.fn>) => {
  const transfermarktLeague = league('tm-league', 'transfermarkt', 'Czech First League', {
    countryCode2: 'CZ',
    tier: 1,
  });
  const availableTeam = team('available-team', 'transfermarkt', 'Available Team', {
    leagueId: transfermarktLeague.id,
    leagueName: transfermarktLeague.name,
    countryCode2: 'CZ',
    playerCount: 1,
  });
  const linkedTeam = team('linked-team', 'transfermarkt', 'Used Team', {
    leagueId: transfermarktLeague.id,
    leagueName: transfermarktLeague.name,
    combinedTeamId: 'existing-team',
    combinedTeamName: 'Existing Combined Team',
    playerCount: 12,
  });
  const leagues: Record<SourceName, League[]> = {
    transfermarkt: [transfermarktLeague],
    soccerway: [],
    worldfootball: [],
    eurofotbal: [],
  };
  const teams: Record<SourceName, CombineTeamCandidate[]> = {
    transfermarkt: [availableTeam, linkedTeam],
    soccerway: [],
    worldfootball: [],
    eurofotbal: [],
  };
  const api = {
    projectUpdated: signal(undefined).asReadonly(),
    getSourcePriority: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: ['transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal'] as SourceName[],
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
            item.sourceId.toLocaleLowerCase().includes(search),
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
            (candidate) =>
              (!leagueId || candidate.leagueId === leagueId) &&
              (candidate.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
                candidate.sourceId.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
          ),
        }),
    ),
    previewTeamCombination,
    commitTeamCombination: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          team: importedTeam,
          players: [{ id: 'combined-player' }],
          addedPlayers: 1,
          updatedPlayers: 0,
          deletedPlayers: 0,
        },
      }),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [CombinedTeamImportPage],
    providers: [
      provideRouter([
        {
          path: 'projects/:projectId/combined/teams',
          component: CombinedTeamsTestPage,
        },
      ]),
      { provide: DesktopApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project' }) } },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CombinedTeamImportPage);
  await fixture.whenStable();
  return {
    api,
    availableTeam,
    fixture,
    loader: TestbedHarnessEnvironment.loader(fixture),
    router: TestBed.inject(Router),
    transfermarktLeague,
  };
};

describe('CombinedTeamImportPage', () => {
  it('imports one source team through the accessible streamlined workflow', async () => {
    const projectLeague: CombinedLeague = {
      ...combinedLeague('combined-league', 'Combined Czech League'),
      countryCode2: 'CZ',
      tier: 1,
    };
    const leagueWithoutMetadata = combinedLeague(
      'combined-league-without-metadata',
      'League without metadata',
    );
    const preview: TeamCombinationPreview = {
      sourceTeams: [
        team('available-team', 'transfermarkt', 'Available Team', {
          leagueId: 'tm-league',
          leagueName: 'Czech First League',
          playerCount: 1,
        }),
      ],
      matchGroups: [playerGroup],
      conflicts: [],
      sourceLeagues: [league('tm-league', 'transfermarkt', 'Czech First League')],
      combinedLeagues: [projectLeague, leagueWithoutMetadata],
      detectedCombinedLeagueId: projectLeague.id,
      existingResolutions: {},
      existingPlayerResolutions: {},
    };
    const previewTeamCombination = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: preview }),
    );
    const { api, fixture, loader, router } = await createPage(previewTeamCombination);
    const element = fixture.nativeElement as HTMLElement;
    const stepper = await loader.getHarness(MatStepperHarness);

    expect(await Promise.all((await stepper.getSteps()).map((step) => step.getLabel()))).toEqual([
      'Source team',
      'League',
      'Summary',
    ]);
    expect(element.querySelector('.eyebrow')?.textContent).toContain('Combined data');
    expect(element.querySelector('h1')?.textContent).toContain('Import team');
    expect(element.textContent).toContain('Source records remain unchanged.');
    expect((await axe.run(element)).violations).toEqual([]);

    const providerSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '.provider-select' }),
    );
    await providerSelect.open();
    expect(
      await Promise.all((await providerSelect.getOptions()).map((option) => option.getText())),
    ).toEqual(['Transfermarkt', 'Soccerway', 'WorldFootball', 'Eurofotbal']);
    await providerSelect.clickOptions({ text: 'Soccerway' });
    await fixture.whenStable();
    expect(api.listCombineTeamCandidates).toHaveBeenLastCalledWith(
      'project',
      '',
      'soccerway',
      undefined,
      undefined,
    );
    await providerSelect.clickOptions({ text: 'Transfermarkt' });
    await fixture.whenStable();

    const leagueAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({ selector: '[aria-label="Search source leagues"]' }),
    );
    await leagueAutocomplete.enterText('Czech');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
    expect(api.listEntities).toHaveBeenLastCalledWith(
      expect.objectContaining({
        entity: 'leagues',
        search: 'Czech',
        sourceNames: ['transfermarkt'],
      }),
    );
    await leagueAutocomplete.selectOption({ text: /Czech First League/ });

    const teamAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({ selector: '[aria-label="Search source teams"]' }),
    );
    await teamAutocomplete.enterText('Team');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
    const teamOptions = await teamAutocomplete.getOptions();
    expect(await Promise.all(teamOptions.map((option) => option.getText()))).toEqual([
      'Available Team 1 players',
      'Used Team Already linked to Existing Combined Team',
    ]);
    expect(await teamOptions[1].isDisabled()).toBe(true);
    await teamAutocomplete.selectOption({ text: /Available Team/ });

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Choose league' }))).click();
    await fixture.whenStable();
    expect(previewTeamCombination).toHaveBeenCalledWith({
      projectId: 'project',
      sourceTeamIds: ['available-team'],
    });
    expect(await (await stepper.getSteps())[1].isSelected()).toBe(true);

    const existingLeagueMode = await loader.getHarness(
      MatRadioButtonHarness.with({ label: 'Use an existing combined league' }),
    );
    expect(await existingLeagueMode.isChecked()).toBe(true);
    const combinedLeagueSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '.combined-league-select' }),
    );
    expect(await combinedLeagueSelect.getValueText()).toMatch(/Combined Czech League.*Tier 1/);
    expect(
      element.querySelector<HTMLImageElement>('.mat-mdc-select-value app-country-flag img')?.src,
    ).toContain('/flags/20x15/cz.png');
    await combinedLeagueSelect.open();
    expect(
      await Promise.all(
        (await combinedLeagueSelect.getOptions()).map((option) => option.getText()),
      ),
    ).toEqual(['Combined Czech League Tier 1', 'League without metadata Tier not set']);
    await combinedLeagueSelect.clickOptions({ text: /League without metadata/ });
    await fixture.whenStable();
    expect(await combinedLeagueSelect.getValueText()).toMatch(
      /League without metadata.*Tier not set/,
    );
    expect(element.querySelector('.mat-mdc-select-value app-country-flag')).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);

    await (
      await loader.getHarness(
        MatRadioButtonHarness.with({ label: 'Leave the combined team unassigned' }),
      )
    ).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Review import' }))).click();
    await fixture.whenStable();
    expect(await (await stepper.getSteps())[2].isSelected()).toBe(true);
    expect(element.textContent).toContain('Available Team');
    expect(element.textContent).toContain('Transfermarkt');
    expect(element.textContent).toContain('Unassigned');
    expect((await axe.run(element)).violations).toEqual([]);

    await (await loader.getHarness(MatButtonHarness.with({ text: /Import team/ }))).click();
    await fixture.whenStable();
    expect(api.commitTeamCombination).toHaveBeenCalledWith({
      projectId: 'project',
      sourceTeamIds: ['available-team'],
      league: { kind: 'none' },
      matchGroups: [playerGroup],
      teamResolutions: {},
      playerResolutions: {},
    });
    expect(router.url).toBe('/projects/project/combined/teams');
    expect(document.body.textContent).toContain('Available Team imported with 1 player.');
  });

  it('reports preview failures and defaults to creating the source league on retry', async () => {
    const sourceLeague = league('tm-league', 'transfermarkt', 'Czech First League');
    const preview: TeamCombinationPreview = {
      sourceTeams: [team('available-team', 'transfermarkt', 'Available Team')],
      matchGroups: [playerGroup],
      conflicts: [],
      sourceLeagues: [sourceLeague],
      combinedLeagues: [],
      existingResolutions: {},
      existingPlayerResolutions: {},
    };
    const previewTeamCombination = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false as const,
        error: { code: 'DATABASE' as const, message: 'Could not prepare the import.' },
      })
      .mockResolvedValue({ ok: true as const, value: preview });
    const { fixture, loader } = await createPage(previewTeamCombination);
    const element = fixture.nativeElement as HTMLElement;
    const chooseLeague = await loader.getHarness(MatButtonHarness.with({ text: 'Choose league' }));
    expect(await chooseLeague.isDisabled()).toBe(true);

    const teamAutocomplete = await loader.getHarness(
      MatAutocompleteHarness.with({ selector: '[aria-label="Search source teams"]' }),
    );
    await teamAutocomplete.enterText('Available');
    await teamAutocomplete.selectOption({ text: /Available Team/ });
    expect(await chooseLeague.isDisabled()).toBe(false);
    await chooseLeague.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not prepare the import.',
    );

    await chooseLeague.click();
    await fixture.whenStable();
    const createLeagueMode = await loader.getHarness(
      MatRadioButtonHarness.with({
        label: 'Create a combined league from the source league',
      }),
    );
    expect(await createLeagueMode.isChecked()).toBe(true);
    expect(element.textContent).toContain('Czech First League');
  });
});
