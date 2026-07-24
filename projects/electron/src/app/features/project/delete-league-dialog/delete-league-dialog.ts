import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import type { DeleteLeagueMode } from '../../../../../shared/contracts';

export interface DeleteLeagueDialogData {
  name: string;
  teamCount: number;
  playerCount: number;
}

const countLabel = (count: number, singular: string): string =>
  `${count} ${singular}${count === 1 ? '' : 's'}`;

@Component({
  selector: 'app-delete-league-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Delete league?</h2>
    <mat-dialog-content>
      <p class="warning-heading">
        <mat-icon aria-hidden="true">warning</mat-icon>
        <strong>{{ data.name }}</strong>
      </p>
      <p>
        Choose what should happen to {{ countLabel(data.teamCount, 'team') }} and
        {{ countLabel(data.playerCount, 'player') }} in this league.
      </p>
      <mat-radio-group
        aria-label="League deletion scope"
        [value]="mode()"
        (change)="selectMode($event.value)"
      >
        <mat-radio-button value="league-only">
          <span class="option-title">Delete league only</span>
          <span class="option-description">
            Keep {{ countLabel(data.teamCount, 'team') }} and
            {{ countLabel(data.playerCount, 'player') }}. The teams will no longer belong to a
            league.
          </span>
        </mat-radio-button>
        <mat-radio-button value="league-and-teams">
          <span class="option-title">Delete league, teams and players</span>
          <span class="option-description">
            Permanently delete the league, {{ countLabel(data.teamCount, 'team') }}, and
            {{ countLabel(data.playerCount, 'player') }}.
          </span>
        </mat-radio-button>
      </mat-radio-group>
      <p>This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Cancel</button>
      <button class="delete-button" matButton="filled" [mat-dialog-close]="mode()" type="button">
        Delete league
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .warning-heading {
      align-items: center;
      display: flex;
      gap: 0.65rem;
    }
    .warning-heading mat-icon {
      color: var(--mat-sys-error);
    }
    mat-radio-group {
      display: grid;
      gap: 0.75rem;
      margin-block: 1.25rem;
    }
    mat-radio-button {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
      padding: 0.75rem;
    }
    .option-title,
    .option-description {
      display: block;
    }
    .option-title {
      font-weight: 500;
    }
    .option-description {
      color: var(--mat-sys-on-surface-variant);
      margin-top: 0.25rem;
    }
    .delete-button:not(:disabled) {
      background-color: var(--mat-sys-error);
      color: var(--mat-sys-on-error);
    }
  `,
})
export class DeleteLeagueDialog {
  protected readonly data = inject<DeleteLeagueDialogData>(MAT_DIALOG_DATA);
  protected readonly mode = signal<DeleteLeagueMode>('league-only');
  protected readonly countLabel = countLabel;

  protected selectMode(mode: DeleteLeagueMode): void {
    this.mode.set(mode);
  }
}
