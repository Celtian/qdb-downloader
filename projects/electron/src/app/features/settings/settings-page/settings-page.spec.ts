import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { ThemeService, type ThemePreference } from '../../../core/theme.service';
import { EntityColumnPreferences } from '../../project/entity-table-page/entity-column-preferences';
import { EntityFilterPreferences } from '../../project/entity-table-page/entity-filter-preferences';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  const createPage = async (filtersReset = true, columnsReset = true) => {
    const preference = signal<ThemePreference>('system');
    const theme = {
      preference: preference.asReadonly(),
      setPreference: vi.fn((value: ThemePreference) => preference.set(value)),
    };
    const filterPreferences = { resetAll: vi.fn(() => filtersReset) };
    const columnPreferences = { resetAll: vi.fn(() => columnsReset) };
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: ThemeService, useValue: theme },
        { provide: EntityFilterPreferences, useValue: filterPreferences },
        { provide: EntityColumnPreferences, useValue: columnPreferences },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    await fixture.whenStable();
    return {
      columnPreferences,
      filterPreferences,
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      preference,
      snackBar,
      theme,
    };
  };

  it('lists System first, applies theme changes, and renders accessible finder settings', async () => {
    const { fixture, loader, preference, theme } = await createPage();
    const radios = await loader.getAllHarnesses(MatRadioButtonHarness);
    const element = fixture.nativeElement as HTMLElement;

    expect(await Promise.all(radios.map((radio) => radio.getValue()))).toEqual([
      'system',
      'light',
      'dark',
    ]);
    expect(await radios[0].isChecked()).toBe(true);

    await radios[2].check();
    await fixture.whenStable();

    expect(theme.setPreference).toHaveBeenCalledWith('dark');
    expect(preference()).toBe('dark');
    expect(element.textContent).toContain('Finder preferences');
    expect(element.textContent).toContain('Search text, databases and the application theme');
    expect(
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset filters and columns' })),
    ).toBeTruthy();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('resets filter and column preferences with success feedback', async () => {
    const { columnPreferences, filterPreferences, loader, preference, snackBar } =
      await createPage();
    await (await loader.getAllHarnesses(MatRadioButtonHarness))[2].check();

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset filters and columns' }))
    ).click();

    expect(filterPreferences.resetAll).toHaveBeenCalledOnce();
    expect(columnPreferences.resetAll).toHaveBeenCalledOnce();
    expect(snackBar.open).toHaveBeenCalledWith('Finder preferences reset.', 'Dismiss', {
      duration: 3000,
    });
    expect(preference()).toBe('dark');
  });

  it('reports when either finder preference store cannot be reset', async () => {
    const { loader, snackBar } = await createPage(false, true);

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset filters and columns' }))
    ).click();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Finder preferences could not be reset.',
      'Dismiss',
      { duration: 6000 },
    );
  });
});
