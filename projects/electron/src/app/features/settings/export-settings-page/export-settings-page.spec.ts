import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';
import axe from 'axe-core';
import { defaultExportColumns } from '../../../../../shared/export-schema';
import { EXPORT_COLUMN_PRESETS_STORAGE_KEY } from '../../../core/export-column-presets.service';
import { ExportSettingsPage } from './export-settings-page';

describe('ExportSettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createPage = async () => {
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ExportSettingsPage],
      providers: [{ provide: MatSnackBar, useValue: snackBar }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportSettingsPage);
    await fixture.whenStable();
    return {
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      snackBar,
    };
  };

  it('renders accessible built-in presets as read-only', async () => {
    const { fixture, loader } = await createPage();
    const presetSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Export column preset to manage"]' }),
    );
    const exportTabs = await loader.getHarness(
      MatTabGroupHarness.with({ selector: '.export-column-tabs' }),
    );
    const teamCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Team count' }));
    const element = fixture.nativeElement as HTMLElement;

    await presetSelect.open();
    expect(
      await Promise.all((await presetSelect.getOptions()).map((option) => option.getText())),
    ).toEqual(['Default (built-in)', 'Full (built-in)']);
    await presetSelect.close();

    expect(await Promise.all((await exportTabs.getTabs()).map((tab) => tab.getLabel()))).toEqual([
      'Leagues',
      'Teams',
      'Players',
    ]);
    expect(await teamCount.isDisabled()).toBe(true);
    expect(element.querySelector('.eyebrow')?.textContent.trim()).toBe('Transfers');
    expect(element.querySelector('h1')?.textContent.trim()).toBe('Export');
    expect(element.textContent).toContain(
      'This built-in preset is always available and cannot be changed or deleted.',
    );
    expect(element.querySelector('.preset-name')).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('loads persisted presets and creates, renames, and deletes custom presets', async () => {
    window.localStorage.setItem(
      EXPORT_COLUMN_PRESETS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        presets: [
          {
            id: 'custom-saved',
            name: 'Saved feed',
            columns: defaultExportColumns(),
          },
        ],
      }),
    );
    const { fixture, loader, snackBar } = await createPage();
    const exportTabGroup = await loader.getHarness(
      MatTabGroupHarness.with({ selector: '.export-column-tabs' }),
    );
    const presetSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Export column preset to manage"]' }),
    );

    await presetSelect.open();
    expect(
      await Promise.all((await presetSelect.getOptions()).map((option) => option.getText())),
    ).toEqual(['Default (built-in)', 'Full (built-in)', 'Saved feed']);
    await presetSelect.clickOptions({ text: 'Saved feed' });
    expect(await presetSelect.getValueText()).toBe('Saved feed');

    const teamCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Team count' }));
    await (await loader.getHarness(MatButtonHarness.with({ text: /New preset$/ }))).click();
    await fixture.whenStable();

    const name = await loader.getHarness(MatInputHarness.with({ selector: 'input' }));
    await name.setValue('Public feed');
    await teamCount.check();
    await exportTabGroup.selectTab({ label: 'Teams' });
    const teamsTab = (await exportTabGroup.getTabs({ label: 'Teams' }))[0];
    const playerCount = await teamsTab.getHarness(
      MatCheckboxHarness.with({ label: 'Player count' }),
    );
    await playerCount.check();
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Create preset' }))).click();
    await fixture.whenStable();

    expect(
      (
        JSON.parse(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY) ?? '{}') as {
          presets: { name: string; columns: { leagues: string[] } }[];
        }
      ).presets[1],
    ).toEqual(
      expect.objectContaining({
        name: 'Public feed',
        columns: expect.objectContaining({
          leagues: expect.arrayContaining(['teamCount']),
          teams: expect.arrayContaining(['playerCount']),
        }),
      }),
    );

    await name.setValue('Partner feed');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Save preset' }))).click();
    await fixture.whenStable();
    expect(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY)).toContain(
      'Partner feed',
    );

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Delete preset' }))).click();
    await fixture.whenStable();
    expect(
      (
        JSON.parse(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY) ?? '{}') as {
          presets: { name: string }[];
        }
      ).presets.map(({ name: presetName }) => presetName),
    ).toEqual(['Saved feed']);
    expect(snackBar.open).toHaveBeenLastCalledWith(
      'Partner feed export preset deleted.',
      'Dismiss',
      { duration: 3000 },
    );
  });

  it('requires a unique preset name of at most 60 characters', async () => {
    const { fixture, loader } = await createPage();
    await (await loader.getHarness(MatButtonHarness.with({ text: /New preset$/ }))).click();
    await fixture.whenStable();

    const name = await loader.getHarness(MatInputHarness.with({ selector: 'input' }));
    const create = await loader.getHarness(MatButtonHarness.with({ text: 'Create preset' }));

    expect(await create.isDisabled()).toBe(true);

    await name.setValue('default');
    await name.blur();
    await fixture.whenStable();
    expect(await create.isDisabled()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Preset names must be unique.',
    );

    await name.setValue('a'.repeat(61));
    await name.blur();
    await fixture.whenStable();
    expect(await create.isDisabled()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Use 60 characters or fewer.',
    );

    await name.setValue('Valid preset');
    await fixture.whenStable();
    expect(await create.isDisabled()).toBe(false);
  });
});
