import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { EntityKind } from '../../../../../shared/contracts';
import { EntityColumnEditor } from '../entity-column-editor/entity-column-editor';
import type {
  EntityColumnDefinition,
  EntityColumnPreference,
} from '../entity-table-page/entity-table-columns';

export interface EntityColumnDrawerData {
  entity: EntityKind;
  columns: readonly EntityColumnDefinition[];
  preference: EntityColumnPreference;
}

@Component({
  selector: 'app-entity-column-drawer',
  imports: [CdkScrollable, EntityColumnEditor, MatButtonModule, MatIconModule],
  templateUrl: './entity-column-drawer.html',
  styleUrl: './entity-column-drawer.css',
})
export class EntityColumnDrawer {
  protected readonly data = inject<EntityColumnDrawerData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EntityColumnDrawer, EntityColumnPreference>);
  private readonly editor = viewChild.required(EntityColumnEditor);
  protected readonly draftPreference = signal(this.data.preference);

  protected resetDefaults(): void {
    this.editor().resetToDefaults();
  }

  protected apply(): void {
    this.dialogRef.close(this.draftPreference());
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
