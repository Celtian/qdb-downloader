import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatRadioButtonHarness, MatRadioGroupHarness } from '@angular/material/radio/testing';
import { MatStepperHarness } from '@angular/material/stepper/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import axe from 'axe-core';
import type { ExportRequest } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ExportPage } from './export-page';

describe('ExportPage', () => {
  it('guides the user through five steps and exports the selected data', async () => {
    const api = {
      listEntityFilterOptions: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            entity: 'teams' as const,
            leagues: [
              {
                id: 'league-1',
                sourceName: 'transfermarkt' as const,
                sourceId: 'GB1',
                name: 'Premier League',
                countryName: 'England',
                tier: 1,
              },
              {
                id: 'league-2',
                sourceName: 'soccerway' as const,
                sourceId: 'GB2',
                name: 'Championship',
              },
            ],
            hasTeamsWithoutLeague: false,
            seasons: ['2026'],
          },
        }),
      ),
      getExportDestination: vi.fn(() => Promise.resolve({ ok: true as const, value: undefined })),
      chooseExportDirectory: vi.fn(() => Promise.resolve({ ok: true as const, value: '/exports' })),
      exportProject: vi.fn((request: ExportRequest) =>
        Promise.resolve({
          ok: true as const,
          value: {
            directory: `${request.destination}/snapshot`,
            files: [`${request.destination}/snapshot/snapshot.json`],
          },
        }),
      ),
      openExportDirectory: vi.fn(() => Promise.resolve({ ok: true as const, value: true })),
    };
    await TestBed.configureTestingModule({
      imports: [ExportPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    const steps = await stepper.getSteps();

    expect(await Promise.all(steps.map((step) => step.getLabel()))).toEqual([
      'Format',
      'Columns',
      'Folder',
      'Leagues',
      'Summary',
    ]);
    const stepIcons = [...element.querySelectorAll<HTMLElement>('.mat-step-icon-content')];
    expect(stepIcons.map((icon) => icon.textContent.trim())).toEqual(['1', '2', '3', '4', '5']);
    expect(stepIcons.every((icon) => !icon.querySelector('mat-icon'))).toBe(true);
    const formats = await loader.getHarness(MatRadioGroupHarness);
    expect(await formats.getCheckedValue()).toBe('single-json');
    const formatButtons = await loader.getAllHarnesses(MatRadioButtonHarness);
    expect(await Promise.all(formatButtons.map((button) => button.getValue()))).toEqual([
      'single-json',
      'json',
      'csv',
    ]);
    const singleJson = await loader.getHarness(
      MatRadioButtonHarness.with({ selector: 'mat-radio-button[value="single-json"]' }),
    );
    expect(await singleJson.getLabelText()).toContain(
      'One JSON file with players nested under teams',
    );

    await stepper.selectStep({ label: 'Columns' });
    const teamCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Team count' }));
    const playerCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Player count' }));
    const sourceUrls = await loader.getAllHarnesses(
      MatCheckboxHarness.with({ label: 'Source page' }),
    );
    const createdAt = await loader.getAllHarnesses(
      MatCheckboxHarness.with({ label: 'Created at' }),
    );
    const updatedAt = await loader.getAllHarnesses(
      MatCheckboxHarness.with({ label: 'Updated at' }),
    );
    expect(await teamCount.isChecked()).toBe(false);
    expect(await playerCount.isChecked()).toBe(false);
    expect(await Promise.all(sourceUrls.map((checkbox) => checkbox.isChecked()))).toEqual([
      false,
      false,
      false,
    ]);
    expect(await Promise.all(createdAt.map((checkbox) => checkbox.isChecked()))).toEqual([
      false,
      false,
      false,
    ]);
    expect(await Promise.all(updatedAt.map((checkbox) => checkbox.isChecked()))).toEqual([
      false,
      false,
      false,
    ]);

    await stepper.selectStep({ label: 'Folder' });
    const chooseFolder = [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent.includes('Choose folder'),
    );
    chooseFolder?.click();
    await fixture.whenStable();

    await stepper.selectStep({ label: 'Leagues' });
    const championship = await loader.getHarness(
      MatCheckboxHarness.with({ label: 'Select Championship' }),
    );
    const leagueList = element.querySelector<HTMLUListElement>('.league-options');
    const leagueRows = [...(leagueList?.querySelectorAll<HTMLLIElement>('.league-option') ?? [])];
    expect(leagueList?.tagName).toBe('UL');
    expect(leagueList?.querySelector('table')).toBeNull();
    expect(leagueRows).toHaveLength(2);
    expect(leagueRows[0]?.querySelector('.league-name')?.textContent).toBe('Premier League');
    expect(leagueRows[0]?.querySelector('.league-metadata')?.textContent).toContain(
      'EnglandTransfermarktTier 1',
    );
    expect(leagueRows[1]?.querySelector('.league-metadata')?.textContent).toContain(
      'Country not setSoccerwayTier not set',
    );
    const flag = leagueRows[0]?.querySelector<HTMLImageElement>('app-country-flag img');
    expect(flag?.getAttribute('src')).toContain('flags/20x15/gb-eng.png');
    expect(flag?.alt).toBe('');
    expect(element.textContent).not.toContain('GB1');
    expect(element.textContent).not.toContain('GB2');
    leagueRows[1]?.click();
    await fixture.whenStable();
    expect(await championship.isChecked()).toBe(true);
    await championship.uncheck();
    await stepper.selectStep({ label: 'Summary' });
    expect(element.textContent).toContain('Single JSON');

    const exportButton = [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent.includes('Export files'),
    );
    exportButton?.click();
    await fixture.whenStable();

    expect(api.chooseExportDirectory).toHaveBeenCalledOnce();
    expect(api.exportProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-id',
        format: 'single-json',
        destination: '/exports',
        includeTeamsWithoutLeague: false,
        leagueIds: ['league-1'],
        columns: expect.objectContaining({
          leagues: expect.not.arrayContaining([
            'projectId',
            'sourceUrl',
            'teamCount',
            'createdAt',
            'updatedAt',
          ]),
          teams: expect.not.arrayContaining([
            'projectId',
            'sourceUrl',
            'playerCount',
            'createdAt',
            'updatedAt',
          ]),
          players: expect.not.arrayContaining(['projectId', 'sourceUrl', 'createdAt', 'updatedAt']),
        }),
      }),
    );
    expect(api.exportProject.mock.calls[0]?.[0].columns.teams).toEqual(
      expect.arrayContaining(['countryName', 'countryCode2', 'countryCode3']),
    );
    expect(api.exportProject.mock.calls[0]?.[0].columns.players).toContain('positionDetail');
    expect(element.textContent).toContain('Export complete');
    expect(element.textContent).toContain('1 file created');
    expect((await axe.run(element)).violations).toEqual([]);
  }, 15_000);

  it('keeps the folder step incomplete when the picker is canceled', async () => {
    const api = {
      listEntityFilterOptions: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            entity: 'teams' as const,
            leagues: [],
            hasTeamsWithoutLeague: false,
            seasons: [],
          },
        }),
      ),
      getExportDestination: vi.fn(() => Promise.resolve({ ok: true as const, value: undefined })),
      chooseExportDirectory: vi.fn(() => Promise.resolve({ ok: true as const, value: undefined })),
    };
    await TestBed.configureTestingModule({
      imports: [ExportPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportPage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    await stepper.selectStep({ label: 'Folder' });
    const element = fixture.nativeElement as HTMLElement;
    const chooseFolder = [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent.includes('Choose folder'),
    );
    chooseFolder?.click();
    await fixture.whenStable();

    const folderStep = (await stepper.getSteps({ label: 'Folder' }))[0];
    expect(await folderStep.isCompleted()).toBe(false);
    expect(element.textContent).toContain('No folder selected');
  });

  it('restores a remembered folder and keeps it selected when changing it is canceled', async () => {
    const api = {
      listEntityFilterOptions: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            entity: 'teams' as const,
            leagues: [],
            hasTeamsWithoutLeague: false,
            seasons: [],
          },
        }),
      ),
      getExportDestination: vi.fn(() =>
        Promise.resolve({ ok: true as const, value: '/remembered/exports' }),
      ),
      chooseExportDirectory: vi.fn(() => Promise.resolve({ ok: true as const, value: undefined })),
      exportProject: vi.fn((request: ExportRequest) =>
        Promise.resolve({
          ok: true as const,
          value: {
            directory: `${request.destination}/snapshot`,
            files: [`${request.destination}/snapshot/snapshot.json`],
          },
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [ExportPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportPage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    await stepper.selectStep({ label: 'Folder' });
    const element = fixture.nativeElement as HTMLElement;
    const folderStep = (await stepper.getSteps({ label: 'Folder' }))[0];
    const changeFolder = [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent.includes('Change folder'),
    );
    const folderNext = [
      ...(changeFolder?.closest('.step-content')?.querySelectorAll<HTMLButtonElement>('button') ??
        []),
    ].find((button) => button.textContent.includes('Next'));

    expect(element.textContent).toContain('/remembered/exports');
    expect(folderNext?.disabled).toBe(false);
    changeFolder?.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('/remembered/exports');

    await stepper.selectStep({ label: 'Leagues' });
    expect(await folderStep.isCompleted()).toBe(true);
    await stepper.selectStep({ label: 'Summary' });
    const exportButton = [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent.includes('Export files'),
    );
    exportButton?.click();
    await fixture.whenStable();

    expect(api.getExportDestination).toHaveBeenCalledOnce();
    expect(api.chooseExportDirectory).toHaveBeenCalledOnce();
    expect(api.exportProject).toHaveBeenCalledWith(
      expect.objectContaining({ destination: '/remembered/exports' }),
    );
  });

  it('resolves a legacy league record whose name is only its source ID', async () => {
    const api = {
      listEntityFilterOptions: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            entity: 'teams' as const,
            leagues: [
              {
                id: 'league-1',
                sourceName: 'transfermarkt' as const,
                sourceId: 'GB1',
                name: 'GB1',
              },
            ],
            hasTeamsWithoutLeague: false,
            seasons: [],
          },
        }),
      ),
      getExportDestination: vi.fn(() => Promise.resolve({ ok: true as const, value: undefined })),
      previewLeague: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            sourceId: 'GB1',
            name: 'Premier League',
            sourceUrl: 'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1',
            teams: [],
          },
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [ExportPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportPage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const stepper = await loader.getHarness(MatStepperHarness);
    await stepper.selectStep({ label: 'Leagues' });
    const resolvedLeague = await loader.getHarness(
      MatCheckboxHarness.with({ label: 'Select Premier League' }),
    );

    expect(await resolvedLeague.isChecked()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('GB1');
    expect(api.previewLeague).toHaveBeenCalledWith({
      sourceName: 'transfermarkt',
      identifierOrUrl: 'GB1',
    });
  });
});
