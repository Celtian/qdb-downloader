import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Component, computed, linkedSignal, input, model, signal } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import type { EntityKind } from '../../../../../shared/contracts';
import {
  defaultColumnPreference,
  fromColumnVisibility,
  toColumnVisibility,
  type EntityColumnDefinition,
  type EntityColumnKey,
  type EntityColumnPreference,
  type EntityColumnVisibility,
} from '../entity-table-page/entity-table-columns';

@Component({
  selector: 'app-entity-column-editor',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPreview,
    CdkDropList,
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './entity-column-editor.html',
  styleUrl: './entity-column-editor.css',
})
export class EntityColumnEditor {
  readonly entity = input.required<EntityKind>();
  readonly columns = input.required<readonly EntityColumnDefinition[]>();
  readonly preference = model.required<EntityColumnPreference>();
  private readonly visibilityModel = linkedSignal(() =>
    toColumnVisibility(this.preference().visible),
  );
  protected readonly announcement = signal('');
  protected readonly instructionsId = computed(() => `${this.entity()}-column-order-instructions`);
  protected readonly orderedColumns = computed(() => {
    const definitions = new Map(this.columns().map((column) => [column.key, column]));
    return this.preference().order.flatMap((key) => {
      const definition = definitions.get(key);
      return definition ? [definition] : [];
    });
  });
  protected readonly columnsForm = form(this.visibilityModel, (path) => {
    disabled(path.name);
    disabled(path.actions);
  });

  resetToDefaults(): void {
    this.preference.set(defaultColumnPreference(this.entity()));
    this.announcement.set('Default column order and visibility restored.');
  }

  protected setColumnVisibility(column: EntityColumnDefinition, checked: boolean): void {
    const visibility: EntityColumnVisibility = {
      ...this.visibilityModel(),
      [column.key]: checked,
    };
    this.visibilityModel.set(visibility);
    this.preference.set({
      version: 2,
      order: this.preference().order,
      visible: fromColumnVisibility(this.orderedColumns(), visibility),
    });
  }

  protected drop(event: CdkDragDrop<EntityColumnDefinition[]>): void {
    this.reorder(event.previousIndex, event.currentIndex);
  }

  protected moveColumn(column: EntityColumnDefinition, offset: -1 | 1): void {
    const previousIndex = this.preference().order.indexOf(column.key);
    const currentIndex = previousIndex + offset;
    if (currentIndex < 0 || currentIndex >= this.preference().order.length) {
      this.announcement.set(
        `${column.label} is already the ${offset < 0 ? 'first' : 'last'} column.`,
      );
      return;
    }
    this.reorder(previousIndex, currentIndex);
  }

  private reorder(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) return;
    const order = [...this.preference().order];
    moveItemInArray(order, previousIndex, currentIndex);
    const visible = new Set(this.preference().visible);
    this.preference.set({
      version: 2,
      order,
      visible: order.filter((key): key is EntityColumnKey => visible.has(key)),
    });
    const column = this.columns().find(({ key }) => key === order[currentIndex]);
    if (column) {
      this.announcement.set(
        `${column.label} moved to position ${currentIndex + 1} of ${order.length}.`,
      );
    }
  }
}
