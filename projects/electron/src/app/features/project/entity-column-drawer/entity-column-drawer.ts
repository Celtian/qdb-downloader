import { Component, inject, signal } from '@angular/core';
import { disabled, form, FormField, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { EntityKind } from '../../../../../shared/contracts';
import {
  fromColumnVisibility,
  toColumnVisibility,
  type EntityColumnDefinition,
  type EntityColumnKey,
} from '../entity-table-page/entity-table-columns';

export interface EntityColumnDrawerData {
  entity: EntityKind;
  columns: readonly EntityColumnDefinition[];
  defaultColumns: readonly EntityColumnKey[];
  visibleColumns: readonly EntityColumnKey[];
}

@Component({
  selector: 'app-entity-column-drawer',
  imports: [FormField, MatButtonModule, MatCheckboxModule, MatIconModule],
  templateUrl: './entity-column-drawer.html',
  styleUrl: './entity-column-drawer.css',
})
export class EntityColumnDrawer {
  protected readonly data = inject<EntityColumnDrawerData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EntityColumnDrawer, EntityColumnKey[]>);
  private readonly visibilityModel = signal(toColumnVisibility(this.data.visibleColumns));
  protected readonly columnsForm = form(this.visibilityModel, (path) => {
    disabled(path.name);
    disabled(path.actions);
  });

  protected resetDefaults(): void {
    this.visibilityModel.set(toColumnVisibility(this.data.defaultColumns));
  }

  protected apply(): void {
    void submit(this.columnsForm, async () => {
      await Promise.resolve();
      this.dialogRef.close(fromColumnVisibility(this.data.columns, this.visibilityModel()));
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
