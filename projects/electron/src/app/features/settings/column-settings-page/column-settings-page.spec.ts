import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';
import axe from 'axe-core';
import type { EntityKind } from '../../../../../shared/contracts';
import { EXPORT_COLUMN_PRESETS_STORAGE_KEY } from '../../../core/export-column-presets.service';
import {
  EntityColumnPreferences,
  entityColumnPreferenceKey,
} from '../../project/entity-table-page/entity-column-preferences';
import { defaultColumnPreference } from '../../project/entity-table-page/entity-table-columns';
import { ColumnSettingsPage } from './column-settings-page';

describe('ColumnSettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createPage = async (columnPreferences?: Partial<EntityColumnPreferences>) => {
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ColumnSettingsPage],
      providers: [
        { provide: MatSnackBar, useValue: snackBar },
        ...(columnPreferences
          ? [{ provide: EntityColumnPreferences, useValue: columnPreferences }]
          : []),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ColumnSettingsPage);
    await fixture.whenStable();
    return {
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      snackBar,
    };
  };

  it('renders accessible entity tabs with required columns enabled', async () => {
    const { fixture, loader } = await createPage();
    const tabGroup = await loader.getHarness(MatTabGroupHarness);
    const tabs = await tabGroup.getTabs();
    const name = await loader.getHarness(MatCheckboxHarness.with({ label: 'Name' }));
    const actions = await loader.getHarness(MatCheckboxHarness.with({ label: 'Actions' }));
    const badge = await loader.getHarness(MatCheckboxHarness.with({ label: 'Badge' }));
    const element = fixture.nativeElement as HTMLElement;

    expect(await Promise.all(tabs.map((tab) => tab.getLabel()))).toEqual([
      'Leagues',
      'Teams',
      'Players',
    ]);
    expect(await name.isChecked()).toBe(true);
    expect(await name.isDisabled()).toBe(true);
    expect(await actions.isChecked()).toBe(true);
    expect(await actions.isDisabled()).toBe(true);
    expect(await badge.isChecked()).toBe(false);
    expect(element.textContent).toContain(
      'Manage finder layouts and reusable export column presets.',
    );
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('saves visibility and keyboard ordering immediately for each table', async () => {
    const { fixture, loader } = await createPage();
    const tabGroup = await loader.getHarness(MatTabGroupHarness);
    const badge = await loader.getHarness(MatCheckboxHarness.with({ label: 'Badge' }));

    await badge.check();
    await fixture.whenStable();

    expect(
      (
        JSON.parse(window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? '{}') as {
          visible: string[];
        }
      ).visible,
    ).toContain('badge');

    const badgeHandle = await loader.getHarness(
      MatButtonHarness.with({ selector: 'button[aria-label="Reorder Badge column"]' }),
    );
    await (await badgeHandle.host()).sendKeys(TestKey.DOWN_ARROW);
    await fixture.whenStable();

    const leaguePreference = JSON.parse(
      window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? '{}',
    ) as { order: string[] };
    expect(leaguePreference.order.slice(0, 3)).toEqual(['name', 'sourceName', 'badge']);

    const teamsTab = (await tabGroup.getTabs({ label: 'Teams' }))[0];
    await teamsTab.select();
    await fixture.whenStable();
    const league = await teamsTab.getHarness(MatCheckboxHarness.with({ label: 'League' }));
    await league.check();
    await fixture.whenStable();

    expect(
      (
        JSON.parse(window.localStorage.getItem(entityColumnPreferenceKey('teams')) ?? '{}') as {
          visible: string[];
        }
      ).visible,
    ).toContain('leagueName');
    expect(leaguePreference.order).not.toContain('leagueName');
  });

  it('creates, renames, and deletes custom export column presets', async () => {
    const { fixture, loader, snackBar } = await createPage();
    const presetSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Export column preset to manage"]' }),
    );

    await presetSelect.open();
    expect(
      await Promise.all((await presetSelect.getOptions()).map((option) => option.getText())),
    ).toEqual(['Default (built-in)', 'Full (built-in)']);
    await presetSelect.close();

    const teamCount = await loader.getHarness(MatCheckboxHarness.with({ label: 'Team count' }));
    expect(await teamCount.isDisabled()).toBe(true);
    await (await loader.getHarness(MatButtonHarness.with({ text: 'New preset' }))).click();
    await fixture.whenStable();

    const name = await loader.getHarness(MatInputHarness.with({ selector: 'input' }));
    await name.setValue('Public feed');
    await teamCount.check();
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Create preset' }))).click();
    await fixture.whenStable();

    expect(
      (
        JSON.parse(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY) ?? '{}') as {
          presets: { name: string; columns: { leagues: string[] } }[];
        }
      ).presets[0],
    ).toEqual(
      expect.objectContaining({
        name: 'Public feed',
        columns: expect.objectContaining({ leagues: expect.arrayContaining(['teamCount']) }),
      }),
    );

    await name.setValue('Partner feed');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Save preset' }))).click();
    await fixture.whenStable();
    expect(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY)).toContain(
      'Partner feed',
    );

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Delete preset' }))).click();
    await fixture.whenStable();
    expect(
      (
        JSON.parse(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY) ?? '{}') as {
          presets: unknown[];
        }
      ).presets,
    ).toEqual([]);
    expect(snackBar.open).toHaveBeenLastCalledWith(
      'Partner feed export preset deleted.',
      'Dismiss',
      { duration: 3000 },
    );
  });

  it('resets one table without changing the other layouts', async () => {
    window.localStorage.setItem(
      entityColumnPreferenceKey('leagues'),
      JSON.stringify({
        ...defaultColumnPreference('leagues'),
        visible: ['name', 'actions'],
      }),
    );
    window.localStorage.setItem(
      entityColumnPreferenceKey('teams'),
      JSON.stringify({
        ...defaultColumnPreference('teams'),
        visible: ['name', 'actions'],
      }),
    );
    const storedTeams = window.localStorage.getItem(entityColumnPreferenceKey('teams'));
    const { fixture, loader, snackBar } = await createPage();

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset league columns' }))
    ).click();
    await fixture.whenStable();

    expect(window.localStorage.getItem(entityColumnPreferenceKey('leagues'))).toBeNull();
    expect(window.localStorage.getItem(entityColumnPreferenceKey('teams'))).toBe(storedTeams);
    expect(
      await loader
        .getHarness(MatCheckboxHarness.with({ label: 'Source' }))
        .then((item) => item.isChecked()),
    ).toBe(true);
    expect(snackBar.open).toHaveBeenCalledWith('Leagues column layout reset.', 'Dismiss', {
      duration: 3000,
    });
  });

  it('resets all table layouts without removing unrelated preferences', async () => {
    for (const entity of ['leagues', 'teams', 'players'] as const) {
      window.localStorage.setItem(entityColumnPreferenceKey(entity), '{}');
    }
    window.localStorage.setItem('qdb-downloader.theme', 'dark');
    const { fixture, loader, snackBar } = await createPage();

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset all column layouts' }))
    ).click();
    await fixture.whenStable();

    for (const entity of ['leagues', 'teams', 'players'] as const) {
      expect(window.localStorage.getItem(entityColumnPreferenceKey(entity))).toBeNull();
    }
    expect(window.localStorage.getItem('qdb-downloader.theme')).toBe('dark');
    expect(snackBar.open).toHaveBeenCalledWith('Finder column layouts reset.', 'Dismiss', {
      duration: 3000,
    });
  });

  it('reports entity and reset-all storage failures', async () => {
    const columnPreferences = {
      load: vi.fn((entity: EntityKind) => defaultColumnPreference(entity)),
      reset: vi.fn(() => false),
      resetAll: vi.fn(() => false),
      save: vi.fn(),
    } satisfies Pick<EntityColumnPreferences, 'load' | 'reset' | 'resetAll' | 'save'>;
    const { loader, snackBar } = await createPage(columnPreferences);

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset league columns' }))
    ).click();
    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset all column layouts' }))
    ).click();

    expect(snackBar.open).toHaveBeenNthCalledWith(
      1,
      'Leagues column layout could not be reset.',
      'Dismiss',
      { duration: 6000 },
    );
    expect(snackBar.open).toHaveBeenNthCalledWith(
      2,
      'Finder column layouts could not be reset.',
      'Dismiss',
      { duration: 6000 },
    );
  });
});
