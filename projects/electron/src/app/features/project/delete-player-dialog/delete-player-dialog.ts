import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { UiCountPipe } from '../../../shared/ui-count-pipe';

export interface DeletePlayerDialogData {
  bulk?: boolean;
  name?: string;
  playerCount?: number;
}

@Component({
  selector: 'app-delete-player-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, UiCountPipe],
  templateUrl: './delete-player-dialog.html',
  styleUrl: './delete-player-dialog.css',
})
export class DeletePlayerDialog {
  protected readonly data = inject<DeletePlayerDialogData>(MAT_DIALOG_DATA);
  protected readonly bulk = this.data.bulk ?? false;
  protected readonly playerCount = this.data.playerCount ?? 1;
}
