import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectHarness } from '@angular/material/select/testing';
import axe from 'axe-core';
import type { ImportConflictDialogData } from './import-conflict-dialog';
import { ImportConflictDialog } from './import-conflict-dialog';

const conflictData = (legacyCopyCount = 1): ImportConflictDialogData => ({
  options: {
    existingRecords: 'refresh',
    teamLeagueConflicts: 'move',
    playerTeamConflicts: 'move',
  },
  conflicts: {
    existingRecords: [
      {
        entity: 'teams',
        externalId: '281',
        storedName: 'Stored City',
        incomingName: 'Manchester City',
      },
    ],
    teamLeagueConflicts: [
      {
        entity: 'teams',
        externalId: '281',
        name: 'Manchester City',
        currentParents: ['Championship'],
        incomingParent: 'Premier League',
        legacyCopyCount: 1,
      },
    ],
    playerTeamConflicts: [
      {
        entity: 'players',
        externalId: '10',
        name: 'Example Player',
        currentParents: ['Old Team'],
        incomingParent: 'Manchester City',
        legacyCopyCount,
      },
    ],
  },
});

describe('ImportConflictDialog', () => {
  it('shows conflicts with authoritative defaults and passes accessibility checks', async () => {
    await TestBed.configureTestingModule({
      imports: [ImportConflictDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: conflictData() },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ImportConflictDialog);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const existingPolicy = await loader.getHarness(
      MatSelectHarness.with({ selector: '.existing-record-policy' }),
    );
    const teamPolicy = await loader.getHarness(
      MatSelectHarness.with({ selector: '.team-league-policy' }),
    );
    const playerPolicy = await loader.getHarness(
      MatSelectHarness.with({ selector: '.player-team-policy' }),
    );

    expect(await existingPolicy.getValueText()).toBe('Refresh from Transfermarkt');
    expect(await teamPolicy.getValueText()).toBe('Move to imported league');
    expect(await playerPolicy.getValueText()).toBe('Move to imported team');
    expect(fixture.nativeElement.textContent).toContain('Stored City');
    expect(fixture.nativeElement.textContent).toContain('Championship → Premier League');
    const element = fixture.nativeElement as HTMLElement;
    const results = await axe.run(element);
    expect(results.violations).toEqual([]);
  });

  it('forces player movement when historical copies must be consolidated', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ImportConflictDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: conflictData(2) },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ImportConflictDialog);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const playerPolicy = await loader.getHarness(
      MatSelectHarness.with({ selector: '.player-team-policy' }),
    );

    expect(await playerPolicy.isDisabled()).toBe(true);
    expect(await playerPolicy.getValueText()).toBe('Move to imported team');
    expect(fixture.nativeElement.textContent).toContain('must be consolidated');
  });
});
