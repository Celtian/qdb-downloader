import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import axe from 'axe-core';
import { ThemeService, type ThemePreference } from '../../../core/theme.service';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  it('lists System first and applies theme changes immediately', async () => {
    const preference = signal<ThemePreference>('system');
    const theme = {
      preference: preference.asReadonly(),
      setPreference: vi.fn((value: ThemePreference) => preference.set(value)),
    };
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [{ provide: ThemeService, useValue: theme }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
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
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
