import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import axe from 'axe-core';
import {
  DeleteSourceDataDialog,
  sourceDataDeletionMessage,
  sourceDataDeletionPreviewMessage,
} from './delete-source-data-dialog';

describe('DeleteSourceDataDialog', () => {
  it('lists selected sources and explains mixed-source deletion', async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteSourceDataDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            sourceNames: ['transfermarkt', 'worldfootball'],
            counts: { leagues: 1, teams: 2, players: 30 },
          },
        },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DeleteSourceDataDialog);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const buttons =
      await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(MatButtonHarness);

    expect(element.textContent).toContain('Transfermarkt');
    expect(element.textContent).toContain('WorldFootball');
    expect(element.textContent).toContain('This will delete 1 league, 2 teams, and 30 players.');
    expect(element.textContent).toContain('even if that player came from another source');
    expect(element.textContent).toContain('This action cannot be undone.');
    expect(await Promise.all(buttons.map((button) => button.getText()))).toEqual([
      'Cancel',
      'Delete selected data',
    ]);
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('formats deleted record counts', () => {
    expect(sourceDataDeletionPreviewMessage({ leagues: 0, teams: 1, players: 2 })).toBe(
      'This will delete 0 leagues, 1 team, and 2 players.',
    );
    expect(
      sourceDataDeletionMessage({
        project: {
          id: 'project',
          name: 'Project',
          referenceDate: '2026-01-01',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          leagueCount: 0,
          teamCount: 0,
          playerCount: 0,
        },
        deleted: { leagues: 1, teams: 2, players: 0 },
      }),
    ).toBe('Deleted 1 league, 2 teams, and 0 players.');
  });
});
