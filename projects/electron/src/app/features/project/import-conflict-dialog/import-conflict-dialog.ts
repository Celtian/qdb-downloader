import { Component, inject, signal } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import type { ImportConflictSummary, MergeImportOptions } from '../../../../../shared/contracts';

export interface ImportConflictDialogData {
  conflicts: ImportConflictSummary;
  options: MergeImportOptions;
}

@Component({
  selector: 'app-import-conflict-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatSelectModule, FormField],
  templateUrl: './import-conflict-dialog.html',
  styleUrl: './import-conflict-dialog.css',
})
export class ImportConflictDialog {
  protected readonly data = inject<ImportConflictDialogData>(MAT_DIALOG_DATA);
  protected readonly hasLegacyCopies = this.data.conflicts.playerTeamConflicts.some(
    (conflict) => conflict.legacyCopyCount > 1,
  );
  protected readonly conflictModel = signal<MergeImportOptions>({
    ...this.data.options,
    ...(this.hasLegacyCopies && { playerTeamConflicts: 'move' as const }),
  });
  protected readonly conflictForm = form(this.conflictModel, (path) => {
    disabled(path.playerTeamConflicts, { when: () => this.hasLegacyCopies });
  });
}
