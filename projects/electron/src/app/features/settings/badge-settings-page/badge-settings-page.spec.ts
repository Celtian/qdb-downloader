import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSliderHarness } from '@angular/material/slider/testing';
import axe from 'axe-core';
import type { CustomBadgeSummary } from '../../../../../shared/custom-badge';
import { DesktopApi } from '../../../core/desktop-api';
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
    let badges: CustomBadgeSummary[] = [];
    const api = {
      listCustomBadges: vi.fn(() => Promise.resolve({ ok: true as const, value: badges })),
      createCustomBadge: vi.fn((value) => {
        const badge = { id: 'badge-review', ...value, assignmentCount: 0 };
        badges = [badge];
        return Promise.resolve({ ok: true as const, value: badge });
      }),
      updateCustomBadge: vi.fn(),
      deleteCustomBadge: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [BadgeSettingsPage],
      providers: [{ provide: DesktopApi, useValue: api }],
    }).compileComponents();
    const fixture = TestBed.createComponent(BadgeSettingsPage);
    await fixture.whenStable();
    return {
      badgeSettings: TestBed.inject(EntityStatusSettingsService),
      api,
      documentLoader: TestbedHarnessEnvironment.documentRootLoader(fixture),
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
      { min: 1, max: 12, value: 6 },
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

  it('creates a reusable custom badge with a required tooltip and palette color', async () => {
    const { api, documentLoader, fixture, loader } = await createPage();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Create badge$/ }))).click();
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe('Create custom badge');
    const inputs = await documentLoader.getAllHarnesses(MatInputHarness);
    await inputs[0].setValue('Review');
    await inputs[1].setValue('Needs manual review');
    const color = await documentLoader.getHarness(MatSelectHarness);
    await color.open();
    await color.clickOptions({ text: 'Purple' });
    await fixture.whenStable();
    const create = await documentLoader.getHarness(MatButtonHarness.with({ text: 'Create badge' }));
    expect(await create.isDisabled()).toBe(false);
    await create.click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(api.createCustomBadge).toHaveBeenCalledOnce());

    expect(api.createCustomBadge).toHaveBeenCalledWith({
      name: 'Review',
      description: 'Needs manual review',
      color: 'purple',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Review');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('0 assignments');
  });
});
