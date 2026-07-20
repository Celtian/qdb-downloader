import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { ImportChangeSummary } from '../../../../../shared/contracts';

export interface SyncConfirmationData {
  name: string;
  changes: ImportChangeSummary;
}

@Component({
  selector: 'app-sync-confirmation-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './sync-confirmation-dialog.html',
  styleUrl: './sync-confirmation-dialog.css',
})
export class SyncConfirmationDialog {
  protected readonly data = inject<SyncConfirmationData>(MAT_DIALOG_DATA);
  protected readonly rows = [
    { label: 'Leagues', counts: this.data.changes.leagues },
    { label: 'Teams', counts: this.data.changes.teams },
    { label: 'Players', counts: this.data.changes.players },
  ];
}
