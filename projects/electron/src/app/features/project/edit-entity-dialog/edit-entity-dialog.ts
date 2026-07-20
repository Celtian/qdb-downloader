import { Component, inject, signal } from '@angular/core';
import { FormField, form, pattern, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { EditableEntityKind, League, Team } from '../../../../../shared/contracts';

export interface EditEntityDialogData {
  entity: League | Team;
  kind: EditableEntityKind;
  leagues: League[];
}

export interface EditEntityValue {
  name: string;
  externalId: string;
  season: string;
  leagueId: string;
}

@Component({
  selector: 'app-edit-entity-dialog',
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './edit-entity-dialog.html',
  styleUrl: './edit-entity-dialog.css',
})
export class EditEntityDialog {
  protected readonly data = inject<EditEntityDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EditEntityDialog, EditEntityValue>);
  protected readonly model = signal<EditEntityValue>({
    name: this.data.entity.name,
    externalId: this.data.entity.externalId,
    season: this.data.entity.season ?? '',
    leagueId: this.data.kind === 'teams' ? ((this.data.entity as Team).leagueId ?? '') : '',
  });
  protected readonly metadataForm = form(this.model, (path) => {
    required(path.name, { message: 'Name is required.' });
    required(path.externalId, { message: 'Transfermarkt ID is required.' });
    pattern(path.externalId, /^[a-zA-Z0-9_-]+$/, {
      message: 'Use letters, numbers, underscores, or hyphens.',
    });
    pattern(path.season, /^(|\d{4})$/, { message: 'Use a four-digit season or leave it empty.' });
  });

  protected save(): void {
    void submit(this.metadataForm, async () => {
      await Promise.resolve();
      this.dialogRef.close({
        ...this.model(),
        name: this.model().name.trim(),
        externalId: this.model().externalId.trim(),
        season: this.model().season.trim(),
      });
    });
  }
}
