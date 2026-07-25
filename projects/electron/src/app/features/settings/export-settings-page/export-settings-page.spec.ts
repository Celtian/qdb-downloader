import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import type {
  ExportFieldNamePresetPreference,
  ExportVisibilityPresetPreference,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ExportSettingsPage } from './export-settings-page';

describe('ExportSettingsPage', () => {
  let visibility: ExportVisibilityPresetPreference[];
  let fieldNames: ExportFieldNamePresetPreference[];
  let api: {
    getExportVisibilityPresets: ReturnType<typeof vi.fn>;
    updateExportVisibilityPresets: ReturnType<typeof vi.fn>;
    getExportFieldNamePresets: ReturnType<typeof vi.fn>;
    updateExportFieldNamePresets: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    window.localStorage.clear();
    visibility = [];
    fieldNames = [];
    api = {
      getExportVisibilityPresets: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: structuredClone(visibility),
        }),
      ),
      updateExportVisibilityPresets: vi.fn((presets: ExportVisibilityPresetPreference[]) => {
        visibility = structuredClone(presets);
        return Promise.resolve({ ok: true as const, value: structuredClone(presets) });
      }),
      getExportFieldNamePresets: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: structuredClone(fieldNames),
        }),
      ),
      updateExportFieldNamePresets: vi.fn((presets: ExportFieldNamePresetPreference[]) => {
        fieldNames = structuredClone(presets);
        return Promise.resolve({ ok: true as const, value: structuredClone(presets) });
      }),
    };
  });

  const createPage = async () => {
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ExportSettingsPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportSettingsPage);
    await fixture.whenStable();
    return {
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      snackBar,
    };
  };

  it('renders two accessible cards with independent read-only built-ins', async () => {
    const { fixture, loader } = await createPage();
    const visibilitySelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Visibility preset to manage"]' }),
    );
    const fieldNameSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Field-name preset to manage"]' }),
    );

    await visibilitySelect.open();
    expect(
      await Promise.all((await visibilitySelect.getOptions()).map((option) => option.getText())),
    ).toEqual(['Default (built-in)', 'Full (built-in)']);
    await visibilitySelect.close();
    await fieldNameSelect.open();
    expect(
      await Promise.all((await fieldNameSelect.getOptions()).map((option) => option.getText())),
    ).toEqual(['Camel case (built-in)', 'Snake case (built-in)']);
    await fieldNameSelect.close();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('mat-card')).toHaveLength(2);
    expect(element.textContent).toContain('Visibility presets');
    expect(element.textContent).toContain('Field-name presets');
    expect(
      await (
        await loader.getHarness(MatCheckboxHarness.with({ label: 'Team count' }))
      ).isDisabled(),
    ).toBe(true);
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('creates and updates a visibility preset without changing field-name storage', async () => {
    const { fixture, loader } = await createPage();
    const newButtons = await loader.getAllHarnesses(MatButtonHarness.with({ text: /New preset$/ }));
    await newButtons[0].click();
    await fixture.whenStable();

    const nameInputs = await loader.getAllHarnesses(MatInputHarness);
    await nameInputs[0].setValue('Public columns');
    const teamCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Team count' }));
    await teamCount.check();
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Create preset' }))).click();
    await fixture.whenStable();

    expect(visibility).toHaveLength(1);
    expect(visibility[0].name).toBe('Public columns');
    expect(visibility[0].columns.leagues).toContain('teamCount');
    expect(fieldNames).toEqual([]);

    await nameInputs[0].setValue('Partner columns');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Save preset' }))).click();
    await fixture.whenStable();
    expect(visibility[0].name).toBe('Partner columns');
  });

  it('validates and creates a complete field-name preset independently', async () => {
    const { fixture, loader } = await createPage();
    const newButtons = await loader.getAllHarnesses(MatButtonHarness.with({ text: /New preset$/ }));
    await newButtons[1].click();
    await fixture.whenStable();

    const inputs = await loader.getAllHarnesses(MatInputHarness);
    const presetName = inputs[0];
    const firstExportName = inputs[1];
    await presetName.setValue('API names');
    await firstExportName.setValue('not valid');
    await firstExportName.blur();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Use letters, numbers, and underscores',
    );
    expect(
      await (
        await loader.getHarness(MatButtonHarness.with({ text: 'Create preset' }))
      ).isDisabled(),
    ).toBe(true);

    await firstExportName.setValue('league_id');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Create preset' }))).click();
    await fixture.whenStable();

    expect(fieldNames).toHaveLength(1);
    expect(fieldNames[0].fieldNames.leagues).toHaveLength(13);
    expect(fieldNames[0].fieldNames.leagues[0].outputName).toBe('league_id');
    expect(visibility).toEqual([]);
  });
});
