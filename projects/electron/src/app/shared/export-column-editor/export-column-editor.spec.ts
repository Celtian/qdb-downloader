import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';

import axe from 'axe-core';

import type {
  ExportColumnSelection,
  ExportFieldNameConfiguration,
} from '../../../../shared/contracts';
import {
  camelCaseExportFieldNames,
  exportColumnDefinitions,
  snakeCaseExportFieldNames,
} from '../../../../shared/export-schema';
import { ExportColumnEditor, type ExportColumnEditorMode } from './export-column-editor';

describe('ExportColumnEditor', () => {
  const minimalSelection = (): ExportColumnSelection => ({
    leagues: ['id'],
    teams: ['id'],
    players: ['id'],
  });

  const createEditor = async (
    selection = minimalSelection(),
    fieldNames: ExportFieldNameConfiguration = camelCaseExportFieldNames(),
    disabled = false,
    mode: ExportColumnEditorMode = 'combined',
  ) => {
    await TestBed.configureTestingModule({
      imports: [ExportColumnEditor],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExportColumnEditor);
    fixture.componentRef.setInput('selection', selection);
    fixture.componentRef.setInput('fieldNames', fieldNames);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.componentRef.setInput('mode', mode);
    await fixture.whenStable();
    return {
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
    };
  };

  it('renders accessible entity tabs with leagues selected initially', async () => {
    const { fixture, loader } = await createEditor();
    const tabGroup = await loader.getHarness(MatTabGroupHarness);
    const tabs = await tabGroup.getTabs();

    expect(await Promise.all(tabs.map((tab) => tab.getLabel()))).toEqual([
      'Leagues',
      'Teams',
      'Players',
    ]);
    expect(await (await tabGroup.getSelectedTab()).getLabel()).toBe('Leagues');
    expect(await (await tabGroup.host()).getAttribute('aria-label')).toBe(
      'Export fields by entity',
    );
    expect((await axe.run(fixture.nativeElement as HTMLElement)).violations).toEqual([]);
  });

  it('updates visibility independently and selects all fields for the active tab', async () => {
    const { fixture, loader } = await createEditor();
    const tabGroup = await loader.getHarness(MatTabGroupHarness);
    const leaguesTab = (await tabGroup.getTabs({ label: 'Leagues' }))[0];
    const teamsTab = (await tabGroup.getTabs({ label: 'Teams' }))[0];
    const playersTab = (await tabGroup.getTabs({ label: 'Players' }))[0];

    await (await leaguesTab.getHarness(MatButtonHarness.with({ text: 'Select all' }))).click();
    expect(fixture.componentInstance.selection().leagues).toHaveLength(
      exportColumnDefinitions.leagues.length,
    );

    await teamsTab.select();
    await (await teamsTab.getHarness(MatCheckboxHarness.with({ label: 'Player count' }))).check();
    expect(fixture.componentInstance.selection().teams).toEqual(['id', 'playerCount']);

    await playersTab.select();
    await (await playersTab.getHarness(MatCheckboxHarness.with({ label: 'Source page' }))).check();
    expect(fixture.componentInstance.selection().players).toEqual(['id', 'sourceUrl']);
    expect(fixture.componentInstance.selection().teams).toEqual(['id', 'playerCount']);
  });

  it('keeps one visible field per entity and disables all controls when read-only', async () => {
    const { fixture, loader } = await createEditor();
    const leaguesTab = (
      await (
        await loader.getHarness(MatTabGroupHarness)
      ).getTabs({
        label: 'Leagues',
      })
    )[0];
    const id = await leaguesTab.getHarness(MatCheckboxHarness.with({ label: 'ID' }));
    const source = await leaguesTab.getHarness(MatCheckboxHarness.with({ label: 'Source' }));

    expect(await id.isDisabled()).toBe(true);
    await source.check();
    await id.uncheck();
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

  it('keeps complete snake-case names while visibility changes and accepts a custom name', async () => {
    const fieldNames = snakeCaseExportFieldNames();
    const selection: ExportColumnSelection = {
      ...minimalSelection(),
      leagues: ['countryCode2'],
    };
    const { fixture, loader } = await createEditor(selection, fieldNames);
    const leaguesTab = (
      await (
        await loader.getHarness(MatTabGroupHarness)
      ).getTabs({
        label: 'Leagues',
      })
    )[0];

    await (await leaguesTab.getHarness(MatCheckboxHarness.with({ label: 'Source page' }))).check();
    expect(fixture.componentInstance.selection().leagues).toEqual(['countryCode2', 'sourceUrl']);
    expect(
      fixture.componentInstance
        .fieldNames()
        .leagues.find(({ sourceKey }) => sourceKey === 'sourceUrl')?.outputName,
    ).toBe('source_url');

    const inputs = await leaguesTab.getAllHarnesses(MatInputHarness);
    await inputs[6].setValue('country_iso_2');
    expect(fixture.componentInstance.fieldNames().leagues[6].outputName).toBe('country_iso_2');
  });

  it('shows validation for malformed and duplicate names across hidden fields', async () => {
    const { fixture, loader } = await createEditor(
      minimalSelection(),
      camelCaseExportFieldNames(),
      false,
      'fieldNames',
    );
    const leaguesTab = (
      await (
        await loader.getHarness(MatTabGroupHarness)
      ).getTabs({
        label: 'Leagues',
      })
    )[0];
    const inputs = await leaguesTab.getAllHarnesses(MatInputHarness);

    await inputs[0].setValue('shared_name');
    await inputs[4].setValue('SHARED_NAME');
    await inputs[4].blur();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Exported field names must be unique.',
    );

    await inputs[4].setValue('not valid');
    await inputs[4].blur();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Use letters, numbers, and underscores',
    );
  });
});
