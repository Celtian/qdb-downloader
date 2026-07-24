import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { ThemeService, type ThemePreference } from '../../../core/theme.service';
import { EntityColumnPreferences } from '../../project/entity-table-page/entity-column-preferences';
import { GlobalSettingsPage } from './global-settings-page';

describe('GlobalSettingsPage', () => {
  const createPage = async (columnsReset = true) => {
    const preference = signal<ThemePreference>('system');
    const theme = {
      preference: preference.asReadonly(),
      setPreference: vi.fn((value: ThemePreference) => preference.set(value)),
    };
    const columnPreferences = { resetAll: vi.fn(() => columnsReset) };
    const snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GlobalSettingsPage],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: theme },
        { provide: EntityColumnPreferences, useValue: columnPreferences },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(GlobalSettingsPage);
    await fixture.whenStable();
    return {
      columnPreferences,
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      preference,
      snackBar,
      theme,
    };
  };

  it('changes the global theme and renders accessible navigation and column settings', async () => {
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
    expect(element.textContent).toContain('Global settings');
    expect(element.textContent).toContain('Finder column layouts');
    expect(element.textContent).toContain('Saved filters, search text, projects, and the theme');
    expect(element.querySelector('main#main-content')).toBeTruthy();
    expect(
      new URL(element.querySelector<HTMLAnchorElement>('.app-bar a[routerlink="/"]')?.href ?? '')
        .pathname,
    ).toBe('/');
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('resets global column layouts with success feedback', async () => {
    const { columnPreferences, loader, snackBar } = await createPage();

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset column layouts' }))
    ).click();

    expect(columnPreferences.resetAll).toHaveBeenCalledOnce();
    expect(snackBar.open).toHaveBeenCalledWith('Finder column layouts reset.', 'Dismiss', {
      duration: 3000,
    });
  });

  it('reports when global column layouts cannot be reset', async () => {
    const { loader, snackBar } = await createPage(false);

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset column layouts' }))
    ).click();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Finder column layouts could not be reset.',
      'Dismiss',
      { duration: 6000 },
    );
  });
});
