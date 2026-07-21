import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatStepperHarness } from '@angular/material/stepper/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import axe from 'axe-core';
import type {
  CommitImportRequest,
  ExternalTeam,
  ImportPreview,
  League,
  MergeImportOptions,
  TeamPreview,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ImportPage } from './import-page';

const emptyPreview = (): ImportPreview => ({
  changes: {
    leagues: { added: 1, updated: 0, preserved: 0, deleted: 0 },
    teams: { added: 1, updated: 0, preserved: 0, moved: 0, detached: 0, deleted: 0 },
    players: {
      added: 1,
      updated: 0,
      preserved: 0,
      moved: 0,
      deduplicated: 0,
      deleted: 0,
    },
  },
  conflicts: {
    existingRecords: [],
    teamLeagueConflicts: [],
    playerTeamConflicts: [],
  },
});

const route = (query: Record<string, string> = {}) => ({
  parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
  snapshot: { queryParamMap: convertToParamMap(query) },
});

const selectedStepLabel = (element: HTMLElement): string =>
  element
    .querySelector<HTMLElement>('.mat-step-header[aria-selected="true"]')
    ?.textContent.trim() ?? '';

interface TestImportPage {
  operation: WritableSignal<'merge' | 'synchronize'>;
  mode: WritableSignal<'league' | 'team'>;
  name: WritableSignal<string>;
  identifier: WritableSignal<string>;
  error: WritableSignal<string>;
  errorLocation: WritableSignal<'page' | 'target' | 'name' | 'identifier'>;
  teamSelection: { selected: ExternalTeam[] };
  mergeOptions: WritableSignal<MergeImportOptions>;
  preparedRequest: WritableSignal<CommitImportRequest | undefined>;
  jobId: WritableSignal<string>;
  changeOperation(operation: 'merge' | 'synchronize'): void;
  changeMode(mode: 'league' | 'team'): void;
  setIdentifier(value: string): void;
  preview(): Promise<void>;
  loadSelectedSquads(): Promise<void>;
  togglePlayer(teamId: string, playerKey: string, selected: boolean): void;
  review(): Promise<void>;
  commit(): Promise<void>;
  cancel(): void;
}

async function createPage(
  api: object,
  query: Record<string, string> = {},
): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<ImportPage>>;
  page: TestImportPage;
  router: { navigate: ReturnType<typeof vi.fn> };
}> {
  const router = { navigate: vi.fn(() => Promise.resolve(true)) };
  await TestBed.configureTestingModule({
    imports: [ImportPage],
    providers: [
      { provide: DesktopApi, useValue: api },
      { provide: ActivatedRoute, useValue: route(query) },
      { provide: Router, useValue: router },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ImportPage);
  await fixture.whenStable();
  return {
    fixture,
    page: fixture.componentInstance as unknown as TestImportPage,
    router,
  };
}

describe('ImportPage', () => {
  it('uses numbered dynamic wizard steps for all operation and entity combinations', async () => {
    const api = {
      scrapeProgress: signal(undefined).asReadonly(),
      listEntities: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { rows: [], total: 0, pageIndex: 0, pageSize: 25 },
        }),
      ),
    };
    const { fixture, page } = await createPage(api);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    const labels = async () =>
      Promise.all((await stepper.getSteps()).map((step) => step.getLabel()));

    expect(await labels()).toEqual([
      'Operation',
      'Entity',
      'Source',
      'Teams',
      'Players',
      'Summary',
    ]);
    const icons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.mat-step-icon-content',
      ),
    ];
    expect(icons.map((icon) => icon.textContent.trim())).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(icons.every((icon) => !icon.querySelector('mat-icon'))).toBe(true);
    const operationOptions = await loader.getHarness(
      MatRadioGroupHarness.with({ selector: '.operation-options' }),
    );
    const entityOptions = await loader.getHarness(
      MatRadioGroupHarness.with({ selector: '.entity-options' }),
    );
    expect(await operationOptions.getCheckedValue()).toBe('merge');
    expect(await entityOptions.getCheckedValue()).toBe('league');
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('mat-button-toggle').length,
    ).toBe(0);

    page.changeMode('team');
    await fixture.whenStable();
    expect(await labels()).toEqual(['Operation', 'Entity', 'Source', 'Players', 'Summary']);

    page.changeOperation('synchronize');
    await fixture.whenStable();
    expect(await labels()).toEqual([
      'Operation',
      'Entity',
      'Source',
      'Update options',
      'Players',
      'Summary',
    ]);

    page.changeMode('league');
    await fixture.whenStable();
    expect(await labels()).toEqual([
      'Operation',
      'Entity',
      'Source',
      'Update options',
      'Teams',
      'Players',
      'Summary',
    ]);
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);
  }, 15_000);

  it('shows source validation with mat-error without leaving the current step', async () => {
    const api = {
      scrapeProgress: signal(undefined).asReadonly(),
      previewLeague: vi.fn(),
    };
    const { fixture, page } = await createPage(api);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    await stepper.selectStep({ label: 'Source' });

    const element = fixture.nativeElement as HTMLElement;
    const continueButton = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent.includes('Continue'),
    );
    continueButton?.click();
    await fixture.whenStable();

    const identifierField = await loader.getHarness(
      MatFormFieldHarness.with({ floatingLabelText: 'Transfermarkt ID or URL' }),
    );
    expect(api.previewLeague).not.toHaveBeenCalled();
    expect(page.error()).toBe('Enter a Transfermarkt ID or URL.');
    expect(page.errorLocation()).toBe('identifier');
    expect(selectedStepLabel(element)).toContain('Source');
    expect(await identifierField.getTextErrors()).toEqual(['Enter a Transfermarkt ID or URL.']);
    expect(element.querySelectorAll<HTMLInputElement>('.fields input')[1].ariaInvalid).toBe('true');
    expect(element.querySelector('.page-error')).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('runs a new league import through team and player selection into inline review', async () => {
    const teams: ExternalTeam[] = [
      {
        externalId: '281',
        name: 'Manchester City',
        season: '2026',
        sourceUrl: 'https://example.test/281',
      },
      {
        externalId: '31',
        name: 'Liverpool',
        season: '2026',
        sourceUrl: 'https://example.test/31',
      },
    ];
    const squad: TeamPreview = {
      ...teams[0],
      players: [
        { externalId: '10', name: 'First Player' },
        { externalId: '11', name: 'Second Player' },
      ],
    };
    const importPreview: ImportPreview = {
      ...emptyPreview(),
      conflicts: {
        existingRecords: [
          {
            entity: 'teams',
            externalId: '281',
            storedName: 'Stored City',
            incomingName: 'Manchester City',
          },
        ],
        teamLeagueConflicts: [],
        playerTeamConflicts: [
          {
            entity: 'players',
            externalId: '10',
            name: 'First Player',
            currentParents: ['Old Team'],
            incomingParent: 'Manchester City',
            legacyCopyCount: 2,
          },
        ],
      },
    };
    const api = {
      scrapeProgress: signal(undefined).asReadonly(),
      previewLeague: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            externalId: 'GB1',
            name: 'Premier League',
            season: '2026',
            sourceUrl: 'https://example.test/GB1',
            teams,
          },
        }),
      ),
      previewTeams: vi.fn(() => Promise.resolve({ ok: true as const, value: [squad] })),
      previewImportChanges: vi.fn(() =>
        Promise.resolve({ ok: true as const, value: importPreview }),
      ),
      commitImport: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { leagueCount: 1, teamCount: 1, playerCount: 1, changes: importPreview.changes },
        }),
      ),
      getProjectSummary: vi.fn(() => Promise.resolve({ ok: true as const, value: {} })),
      cancelScrape: vi.fn(() => Promise.resolve({ ok: true as const, value: true })),
    };
    const { fixture, page, router } = await createPage(api);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    await stepper.selectStep({ label: 'Source' });
    page.setIdentifier('GB1');

    await page.preview();
    await fixture.whenStable();
    expect(page.name()).toBe('Premier League');
    expect(page.teamSelection.selected).toHaveLength(2);
    expect(selectedStepLabel(fixture.nativeElement as HTMLElement)).toContain('Teams');
    const allTeams = await loader.getHarness(MatCheckboxHarness.with({ label: 'All 2 teams' }));
    const liverpool = await loader.getHarness(MatCheckboxHarness.with({ label: 'Liverpool' }));
    expect(await allTeams.isChecked()).toBe(true);
    await liverpool.uncheck();
    expect(await allTeams.isIndeterminate()).toBe(true);

    await page.loadSelectedSquads();
    await fixture.whenStable();
    expect(api.previewTeams).toHaveBeenCalledWith({
      jobId: expect.any(String),
      teams: [teams[0]],
    });
    expect(selectedStepLabel(fixture.nativeElement as HTMLElement)).toContain('Players');
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);

    page.togglePlayer('281', '11', false);
    page.mergeOptions.set({
      existingRecords: 'refresh',
      teamLeagueConflicts: 'move',
      playerTeamConflicts: 'keep',
    });
    await page.review();
    await fixture.whenStable();
    expect(selectedStepLabel(fixture.nativeElement as HTMLElement)).toContain('Summary');
    expect(api.previewImportChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-id',
        teams: [expect.objectContaining({ players: [{ externalId: '10', name: 'First Player' }] })],
      }),
    );
    expect(fixture.nativeElement.textContent).toContain('GB1 — Premier League');
    expect(api.previewImportChanges).toHaveBeenCalledTimes(2);
    expect(page.preparedRequest()?.operation).toEqual({
      kind: 'merge',
      options: {
        existingRecords: 'refresh',
        teamLeagueConflicts: 'move',
        playerTeamConflicts: 'move',
      },
    });

    const existingPolicy = await loader.getHarness(
      MatSelectHarness.with({ selector: '.existing-record-policy' }),
    );
    await existingPolicy.open();
    await existingPolicy.clickOptions({ text: 'Keep stored data' });
    await fixture.whenStable();
    expect(api.previewImportChanges).toHaveBeenCalledTimes(3);
    expect(page.preparedRequest()?.operation).toEqual({
      kind: 'merge',
      options: {
        existingRecords: 'keep',
        teamLeagueConflicts: 'move',
        playerTeamConflicts: 'move',
      },
    });
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);

    await page.commit();
    expect(api.commitImport).toHaveBeenCalledWith(page.preparedRequest());
    expect(router.navigate).toHaveBeenCalledWith(['../overview'], {
      relativeTo: expect.anything(),
    });

    page.jobId.set('job-id');
    page.cancel();
    expect(api.cancelScrape).toHaveBeenCalledWith('job-id');
  }, 15_000);

  it('preloads and locks a directly selected synchronization target', async () => {
    const target: League = {
      id: 'league-id',
      projectId: 'project-id',
      source: 'transfermarkt',
      externalId: 'GB1',
      name: 'Premier League',
      season: '2026',
      sourceUrl: 'https://example.test/GB1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const api = {
      scrapeProgress: signal(undefined).asReadonly(),
      getEntity: vi.fn(() => Promise.resolve({ ok: true as const, value: target })),
    };
    const { fixture } = await createPage(api, {
      operation: 'synchronize',
      entity: 'leagues',
      targetId: 'league-id',
      returnTo: 'leagues',
    });
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    const inputs = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.fields input'),
    ];

    expect(api.getEntity).toHaveBeenCalledWith('project-id', 'leagues', 'league-id');
    expect(await Promise.all((await stepper.getSteps()).map((step) => step.getLabel()))).toEqual([
      'Operation',
      'Entity',
      'Source',
      'Update options',
      'Teams',
      'Players',
      'Summary',
    ]);
    expect(inputs.every((input) => input.readOnly)).toBe(true);
    expect(inputs.map((input) => input.value)).toEqual(['Premier League', 'GB1', '2026']);
    const absentTeams = await loader.getHarness(
      MatSelectHarness.with({ selector: '.absent-team-select' }),
    );
    const absentPlayers = await loader.getHarness(
      MatSelectHarness.with({ selector: '.absent-player-select' }),
    );
    expect(await absentTeams.getValueText()).toBe('Keep unchanged');
    expect(await absentPlayers.getValueText()).toBe('Keep unchanged');
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);
  }, 15_000);
});
