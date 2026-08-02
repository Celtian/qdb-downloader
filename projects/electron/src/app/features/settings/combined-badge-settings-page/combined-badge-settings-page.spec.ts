import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';

import axe from 'axe-core';

import type { CombinedCustomBadgeSummary } from '../../../../../shared/combined-custom-badge';
import { DesktopApi } from '../../../core/desktop-api';
import { CombinedBadgeSettingsPage } from './combined-badge-settings-page';

describe('CombinedBadgeSettingsPage', () => {
  const createPage = async () => {
    let badges: CombinedCustomBadgeSummary[] = [];
    const api = {
      listCombinedCustomBadges: vi.fn(() => Promise.resolve({ ok: true as const, value: badges })),
      createCombinedCustomBadge: vi.fn((value) => {
        const badge = { id: 'combined-badge-review', ...value, assignmentCount: 0 };
        badges = [badge];
        return Promise.resolve({ ok: true as const, value: badge });
      }),
      updateCombinedCustomBadge: vi.fn(),
      deleteCombinedCustomBadge: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [CombinedBadgeSettingsPage],
      providers: [{ provide: DesktopApi, useValue: api }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinedBadgeSettingsPage);
    await fixture.whenStable();
    return {
      api,
      documentLoader: TestbedHarnessEnvironment.documentRootLoader(fixture),
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
    };
  };

  it('renders accessible built-in and custom combined badge catalogs', async () => {
    const { fixture, loader } = await createPage();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.eyebrow')?.textContent.trim()).toBe('Combined data');
    expect(element.textContent).toContain('Built-in badges');
    expect(element.textContent).toContain('Ready');
    expect(element.textContent).toContain('Needs review');
    expect(element.textContent).toContain('All linked source records are still available.');
    expect(element.textContent).toContain('One or more linked source records are missing.');
    expect(element.querySelectorAll('app-combined-entity-status-badge')).toHaveLength(2);
    expect(element.textContent).toContain('Custom badges');
    expect(
      await loader.getAllHarnesses(MatButtonHarness.with({ text: /Create badge$/ })),
    ).toHaveLength(1);
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('creates badges through the separate combined catalog API', async () => {
    const { api, documentLoader, fixture, loader } = await createPage();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Create badge$/ }))).click();
    expect(await (await documentLoader.getHarness(MatDialogHarness)).getTitleText()).toBe(
      'Create custom badge',
    );
    const inputs = await documentLoader.getAllHarnesses(MatInputHarness);
    await inputs[0].setValue('Review');
    await inputs[1].setValue('Needs canonical review');
    const color = await documentLoader.getHarness(MatSelectHarness);
    await color.open();
    await color.clickOptions({ text: 'Purple' });
    await fixture.whenStable();
    await (
      await documentLoader.getHarness(MatButtonHarness.with({ text: 'Create badge' }))
    ).click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(api.createCombinedCustomBadge).toHaveBeenCalledOnce());

    expect(api.createCombinedCustomBadge).toHaveBeenCalledWith({
      name: 'Review',
      description: 'Needs canonical review',
      color: 'purple',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Review');
  });
});
