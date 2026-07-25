import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';
import axe from 'axe-core';
import type { ExportColumnSelection } from '../../../../shared/contracts';
import { exportColumnDefinitions } from '../../../../shared/export-schema';
import { ExportColumnEditor } from './export-column-editor';

describe('ExportColumnEditor', () => {
  const createEditor = async (
    selection: ExportColumnSelection = {
      leagues: ['id'],
      teams: ['id'],
      players: ['id'],
    },
    disabled = false,
  ) => {
    await TestBed.configureTestingModule({
      imports: [ExportColumnEditor],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportColumnEditor);
    fixture.componentRef.setInput('selection', selection);
    fixture.componentRef.setInput('disabled', disabled);
    await fixture.whenStable();
    return {
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
    };
  };

  it('renders accessible entity tabs with leagues selected initially', async () => {
    const { fixture, loader } = await createEditor();
    const tabGroup = await loader.getHarness(
      MatTabGroupHarness.with({ selector: '.export-column-tabs' }),
    );
    const tabs = await tabGroup.getTabs();
    const selectedTab = await tabGroup.getSelectedTab();

    expect(await Promise.all(tabs.map((tab) => tab.getLabel()))).toEqual([
      'Leagues',
      'Teams',
      'Players',
    ]);
    expect(await selectedTab.getLabel()).toBe('Leagues');
    expect(await (await tabGroup.host()).getAttribute('aria-label')).toBe(
      'Export columns by entity',
    );
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);
  });

  it('updates each entity independently and selects all columns for the active tab', async () => {
    const { fixture, loader } = await createEditor();
    const tabGroup = await loader.getHarness(
      MatTabGroupHarness.with({ selector: '.export-column-tabs' }),
    );
    const leaguesTab = (await tabGroup.getTabs({ label: 'Leagues' }))[0];
    const teamsTab = (await tabGroup.getTabs({ label: 'Teams' }))[0];
    const playersTab = (await tabGroup.getTabs({ label: 'Players' }))[0];

    await (await leaguesTab.getHarness(MatButtonHarness.with({ text: 'Select all' }))).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection().leagues).toHaveLength(
      exportColumnDefinitions.leagues.length,
    );

    await teamsTab.select();
    const playerCount = await teamsTab.getHarness(
      MatCheckboxHarness.with({ label: 'Player count' }),
    );
    await playerCount.check();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection().teams).toEqual(['id', 'playerCount']);

    await playersTab.select();
    const sourcePage = await playersTab.getHarness(
      MatCheckboxHarness.with({ label: 'Source page' }),
    );
    await sourcePage.check();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection().players).toEqual(['id', 'sourceUrl']);
    expect(fixture.componentInstance.selection().teams).toEqual(['id', 'playerCount']);
  });

  it('keeps the last selected column enabled only after another is chosen and disables all controls', async () => {
    const { fixture, loader } = await createEditor();
    const tabGroup = await loader.getHarness(
      MatTabGroupHarness.with({ selector: '.export-column-tabs' }),
    );
    const leaguesTab = (await tabGroup.getTabs({ label: 'Leagues' }))[0];
    const id = await leaguesTab.getHarness(MatCheckboxHarness.with({ label: 'ID' }));
    const source = await leaguesTab.getHarness(MatCheckboxHarness.with({ label: 'Source' }));

    expect(await id.isDisabled()).toBe(true);
    await source.check();
    await fixture.whenStable();
    expect(await id.isDisabled()).toBe(false);
    await id.uncheck();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection().leagues).toEqual(['sourceName']);
    expect(await source.isDisabled()).toBe(true);

    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    expect(await id.isDisabled()).toBe(true);
    expect(
      await leaguesTab
        .getHarness(MatButtonHarness.with({ text: 'Select all' }))
        .then((button) => button.isDisabled()),
    ).toBe(true);
  });
});
