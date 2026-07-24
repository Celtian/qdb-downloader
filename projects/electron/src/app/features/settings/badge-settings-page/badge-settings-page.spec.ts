import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatSliderHarness } from '@angular/material/slider/testing';
import axe from 'axe-core';
import {
  ENTITY_STATUS_SETTINGS_STORAGE_KEY,
  EntityStatusSettingsService,
} from '../../../core/entity-status-settings.service';
import { BadgeSettingsPage } from './badge-settings-page';

describe('BadgeSettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createPage = async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeSettingsPage],
    }).compileComponents();
    const fixture = TestBed.createComponent(BadgeSettingsPage);
    await fixture.whenStable();
    return {
      badgeSettings: TestBed.inject(EntityStatusSettingsService),
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
    };
  };

  it('renders accessible bounded badge age sliders', async () => {
    const { fixture, loader } = await createPage();
    const sliders = await loader.getAllHarnesses(MatSliderHarness);
    const element = fixture.nativeElement as HTMLElement;

    expect(sliders).toHaveLength(2);
    expect(
      await Promise.all(
        sliders.map(async (slider) => ({
          min: await slider.getMinValue(),
          max: await slider.getMaxValue(),
          value: await (await slider.getEndThumb()).getValue(),
        })),
      ),
    ).toEqual([
      { min: 1, max: 30, value: 3 },
      { min: 1, max: 6, value: 6 },
    ]);
    expect(element.textContent).toContain('Badges');
    expect(element.textContent).toContain('Badge age');
    expect(element.querySelector('section[aria-labelledby="badges-title"]')).toBeTruthy();
    expect(element.querySelector('main')).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('saves badge age changes immediately', async () => {
    const { badgeSettings, fixture, loader } = await createPage();
    const sliders = await loader.getAllHarnesses(MatSliderHarness);

    await (await sliders[0].getEndThumb()).setValue(1);
    await (await sliders[1].getEndThumb()).setValue(2);
    await fixture.whenStable();

    expect(badgeSettings.settings()).toEqual({ newDays: 1, oldMonths: 2 });
    expect(
      JSON.parse(window.localStorage.getItem(ENTITY_STATUS_SETTINGS_STORAGE_KEY) ?? ''),
    ).toEqual({ newDays: 1, oldMonths: 2 });
    const outputs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('output'),
      (output) => output.textContent.replace(/\s+/g, ' ').trim(),
    );
    expect(outputs).toEqual(['1 day', '2 months']);
  });
});
