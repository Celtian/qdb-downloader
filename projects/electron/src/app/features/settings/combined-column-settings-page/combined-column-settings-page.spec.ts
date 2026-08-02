import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';

import axe from 'axe-core';

import { combinedEntityColumnPreferenceKey } from '../../project/combined-entity-page/combined-entity-column-preferences';
import { CombinedColumnSettingsPage } from './combined-column-settings-page';

describe('CombinedColumnSettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createPage = async () => {
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CombinedColumnSettingsPage],
      providers: [{ provide: MatSnackBar, useValue: snackBar }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinedColumnSettingsPage);
    await fixture.whenStable();
    return {
      element: fixture.nativeElement as HTMLElement,
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      snackBar,
    };
  };

  it('renders accessible combined entity tabs with source-aligned defaults', async () => {
    const { element, loader } = await createPage();
    const tabGroup = await loader.getHarness(
      MatTabGroupHarness.with({ selector: '.combined-column-tabs' }),
    );
    const tabs = await tabGroup.getTabs();
    const name = await loader.getHarness(MatCheckboxHarness.with({ label: 'Name' }));
    const actions = await loader.getHarness(MatCheckboxHarness.with({ label: 'Actions' }));
    const badges = await loader.getHarness(MatCheckboxHarness.with({ label: 'Badges' }));

    expect(await Promise.all(tabs.map((tab) => tab.getLabel()))).toEqual([
      'Leagues',
      'Teams',
      'Players',
    ]);
    expect(await name.isChecked()).toBe(true);
    expect(await name.isDisabled()).toBe(true);
    expect(await actions.isChecked()).toBe(true);
    expect(await actions.isDisabled()).toBe(true);
    expect(await badges.isChecked()).toBe(false);
    expect(element.querySelector('.eyebrow')?.textContent.trim()).toBe('Combined data');
    expect(element.textContent).toContain(
      'Manage combined finder column visibility and order across every project.',
    );
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('saves visibility and keyboard ordering independently for every table', async () => {
    const { fixture, loader } = await createPage();
    const tabGroup = await loader.getHarness(
      MatTabGroupHarness.with({ selector: '.combined-column-tabs' }),
    );
    const badges = await loader.getHarness(MatCheckboxHarness.with({ label: 'Badges' }));

    await badges.check();
    await fixture.whenStable();
    const badgeHandle = await loader.getHarness(
      MatButtonHarness.with({ selector: 'button[aria-label="Reorder Badges column"]' }),
    );
    await (await badgeHandle.host()).sendKeys(TestKey.DOWN_ARROW);
    await fixture.whenStable();

    const leaguePreference = JSON.parse(
      window.localStorage.getItem(combinedEntityColumnPreferenceKey('leagues')) ?? '{}',
    ) as { order: string[]; visible: string[] };
    expect(leaguePreference.visible).toContain('badge');
    expect(leaguePreference.order.slice(0, 3)).toEqual(['name', 'sources', 'badge']);

    await (await tabGroup.getTabs({ label: 'Teams' }))[0].select();
    await fixture.whenStable();
    const league = await loader.getHarness(MatCheckboxHarness.with({ label: 'League' }));
    await league.check();
    await fixture.whenStable();

    const teamPreference = JSON.parse(
      window.localStorage.getItem(combinedEntityColumnPreferenceKey('teams')) ?? '{}',
    ) as { visible: string[] };
    expect(teamPreference.visible).toContain('parent');
    expect(leaguePreference.visible).toContain('parent');
    expect(leaguePreference.visible).toContain('badge');
  });

  it('resets one layout and all combined layouts without affecting source preferences', async () => {
    const { fixture, loader, snackBar } = await createPage();
    const badges = await loader.getHarness(MatCheckboxHarness.with({ label: 'Badges' }));
    await badges.check();
    window.localStorage.setItem('qdb-downloader.visible-columns.leagues', 'source-layout');

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset league columns' }))
    ).click();
    await fixture.whenStable();
    expect(window.localStorage.getItem(combinedEntityColumnPreferenceKey('leagues'))).toBeNull();
    expect(await badges.isChecked()).toBe(false);
    expect(snackBar.open).toHaveBeenCalledWith('Leagues combined column layout reset.', 'Dismiss', {
      duration: 3000,
    });

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset all column layouts' }))
    ).click();
    await fixture.whenStable();
    expect(window.localStorage.getItem('qdb-downloader.visible-columns.leagues')).toBe(
      'source-layout',
    );
    expect(snackBar.open).toHaveBeenCalledWith('Combined finder column layouts reset.', 'Dismiss', {
      duration: 3000,
    });
  });
});
