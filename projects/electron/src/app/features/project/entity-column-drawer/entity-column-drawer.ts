import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, computed, inject, signal } from '@angular/core';
import { disabled, form, FormField, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { EntityKind } from '../../../../../shared/contracts';
import {
  defaultColumnPreference,
  fromColumnVisibility,
  toColumnVisibility,
  type EntityColumnDefinition,
  type EntityColumnKey,
  type EntityColumnPreference,
} from '../entity-table-page/entity-table-columns';

export interface EntityColumnDrawerData {
  entity: EntityKind;
  columns: readonly EntityColumnDefinition[];
  preference: EntityColumnPreference;
}

@Component({
  selector: 'app-entity-column-drawer',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPreview,
    CdkDropList,
    CdkScrollable,
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './entity-column-drawer.html',
  styleUrl: './entity-column-drawer.css',
})
export class EntityColumnDrawer {
  protected readonly data = inject<EntityColumnDrawerData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EntityColumnDrawer, EntityColumnPreference>);
  private readonly order = signal<readonly EntityColumnKey[]>(this.data.preference.order);
  private readonly visibilityModel = signal(toColumnVisibility(this.data.preference.visible));
  protected readonly announcement = signal('');
  protected readonly orderedColumns = computed(() => {
    const definitions = new Map(this.data.columns.map((column) => [column.key, column]));
    return this.order().flatMap((key) => {
      const definition = definitions.get(key);
      return definition ? [definition] : [];
    });
  });
  protected readonly columnsForm = form(this.visibilityModel, (path) => {
    disabled(path.name);
    disabled(path.actions);
  });

  protected resetDefaults(): void {
    const defaults = defaultColumnPreference(this.data.entity);
    this.order.set(defaults.order);
    this.visibilityModel.set(toColumnVisibility(defaults.visible));
    this.announcement.set('Default column order and visibility restored.');
  }

  protected drop(event: CdkDragDrop<EntityColumnDefinition[]>): void {
    this.reorder(event.previousIndex, event.currentIndex);
  }

  protected moveColumn(column: EntityColumnDefinition, offset: -1 | 1): void {
    const previousIndex = this.order().indexOf(column.key);
    const currentIndex = previousIndex + offset;
    if (currentIndex < 0 || currentIndex >= this.order().length) {
      this.announcement.set(
        `${column.label} is already the ${offset < 0 ? 'first' : 'last'} column.`,
      );
      return;
    }
    this.reorder(previousIndex, currentIndex);
  }

  protected apply(): void {
    void submit(this.columnsForm, async () => {
      await Promise.resolve();
      this.dialogRef.close({
        version: 2,
        order: this.order(),
        visible: fromColumnVisibility(this.orderedColumns(), this.visibilityModel()),
      });
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private reorder(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) return;
    const order = [...this.order()];
    moveItemInArray(order, previousIndex, currentIndex);
    this.order.set(order);
    const column = this.data.columns.find(({ key }) => key === order[currentIndex]);
    if (column) {
      this.announcement.set(
        `${column.label} moved to position ${currentIndex + 1} of ${order.length}.`,
      );
    }
  }
}
