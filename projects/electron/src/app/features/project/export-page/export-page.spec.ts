import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
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
              { id: 'league-1', externalId: 'GB1', name: 'Premier League' },
              { id: 'league-2', externalId: 'GB2', name: 'Championship' },
            ],
            hasTeamsWithoutLeague: false,
            seasons: ['2026'],
          },
        }),
      ),
      chooseExportDirectory: vi.fn(() => Promise.resolve({ ok: true as const, value: '/exports' })),
      exportProject: vi.fn((request: ExportRequest) =>
        Promise.resolve({
          ok: true as const,
          value: {
            directory: `${request.destination}/snapshot`,
            files: [`${request.destination}/snapshot/leagues.${request.format}`],
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
    expect(await formats.getCheckedValue()).toBe('json');

    await stepper.selectStep({ label: 'Columns' });
    const teamCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Team count' }));
    const playerCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Player count' }));
    const sourceUrls = await loader.getAllHarnesses(
      MatCheckboxHarness.with({ label: 'Source URL' }),
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
      MatCheckboxHarness.with({ label: 'GB2 — Championship' }),
    );
    expect(element.textContent).toContain('GB1 — Premier League');
    await championship.uncheck();
    await stepper.selectStep({ label: 'Summary' });

    const exportButton = [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent.includes('Export files'),
    );
    exportButton?.click();
    await fixture.whenStable();

    expect(api.chooseExportDirectory).toHaveBeenCalledOnce();
    expect(api.exportProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-id',
        format: 'json',
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
          players: expect.not.arrayContaining(['projectId', 'createdAt', 'updatedAt']),
        }),
      }),
    );
    expect(element.textContent).toContain('Export complete');
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

  it('resolves a legacy league record whose name is only its external ID', async () => {
    const api = {
      listEntityFilterOptions: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            entity: 'teams' as const,
            leagues: [{ id: 'league-1', externalId: 'GB1', name: 'GB1' }],
            hasTeamsWithoutLeague: false,
            seasons: [],
          },
        }),
      ),
      previewLeague: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            externalId: 'GB1',
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
      MatCheckboxHarness.with({ label: 'GB1 — Premier League' }),
    );

    expect(await resolvedLeague.isChecked()).toBe(true);
    expect(api.previewLeague).toHaveBeenCalledWith({ identifierOrUrl: 'GB1' });
  });
});
