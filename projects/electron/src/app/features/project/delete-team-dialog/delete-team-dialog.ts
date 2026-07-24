import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DeleteTeamDialogData {
  name: string;
  playerCount: number;
}

const playerCountLabel = (count: number): string => `${count} player${count === 1 ? '' : 's'}`;

@Component({
  selector: 'app-delete-team-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Delete team?</h2>
    <mat-dialog-content>
      <p class="warning-heading">
        <mat-icon aria-hidden="true">warning</mat-icon>
        <strong>{{ data.name }}</strong>
      </p>
      <p>
        This permanently deletes the team and all {{ playerCountLabel(data.playerCount) }} attached
        to it.
      </p>
      <p>This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Cancel</button>
      <button class="delete-button" matButton="filled" [mat-dialog-close]="true" type="button">
        Delete team
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
    .delete-button:not(:disabled) {
      background-color: var(--mat-sys-error);
      color: var(--mat-sys-on-error);
    }
  `,
})
export class DeleteTeamDialog {
  protected readonly data = inject<DeleteTeamDialogData>(MAT_DIALOG_DATA);
  protected readonly playerCountLabel = playerCountLabel;
}
