import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { ComponentFixture } from '@angular/core/testing';
import { SyncConfirmationDialog, type SyncConfirmationData } from './sync-confirmation-dialog';

describe('SyncConfirmationDialog', () => {
  let fixture: ComponentFixture<SyncConfirmationDialog>;

  beforeEach(async () => {
    const data: SyncConfirmationData = {
      name: 'Premier League',
      changes: {
        leagues: { added: 0, updated: 1, deleted: 0 },
        teams: { added: 2, updated: 3, detached: 1, deleted: 1 },
        players: { added: 10, updated: 20, deleted: 4 },
      },
      operation: {
        kind: 'synchronize',
        target: { entity: 'leagues', id: 'league-id' },
        options: {
          absentTeams: 'detach',
          absentPlayers: 'delete',
          overrideTeamNames: false,
          overridePlayerNames: true,
        },
      },
    };
    await TestBed.configureTestingModule({
      imports: [SyncConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SyncConfirmationDialog);
    await fixture.whenStable();
  });

  it('shows exact change counts and the selected update policies', () => {
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent;

    expect(text).toContain('Premier League');
    expect(text).toContain('Absent teams will be removed from this league');
    expect(text).toContain('Absent players will be permanently deleted.');
    expect(text).toContain('Existing team names will be preserved.');
    expect(text).toContain('Existing player names will be replaced');
    expect(text).toContain('5 stored records will be permanently deleted.');
    expect(text).toContain('1 team will be removed from this league');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelectorAll('td.destructive')).toHaveLength(2);
  });
});
