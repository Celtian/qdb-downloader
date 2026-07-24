import { Component, input, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { EntityKind, ExportColumnSelection } from '../../../../shared/contracts';
import { exportColumnDefinitions } from '../../../../shared/export-schema';

const entityKinds = ['leagues', 'teams', 'players'] as const satisfies readonly EntityKind[];

@Component({
  selector: 'app-export-column-editor',
  imports: [MatButtonModule, MatCheckboxModule],
  templateUrl: './export-column-editor.html',
  styleUrl: './export-column-editor.css',
})
export class ExportColumnEditor {
  readonly selection = model.required<ExportColumnSelection>();
  readonly disabled = input(false);
  protected readonly entities = entityKinds;
  protected readonly columnDefinitions = exportColumnDefinitions;
  protected readonly entityLabels: Record<EntityKind, string> = {
    leagues: 'Leagues',
    teams: 'Teams',
    players: 'Players',
  };

  protected isSelected<Entity extends EntityKind>(
    entity: Entity,
    column: ExportColumnSelection[Entity][number],
  ): boolean {
    return (this.selection()[entity] as readonly string[]).includes(column);
  }

  protected isLastSelected<Entity extends EntityKind>(
    entity: Entity,
    column: ExportColumnSelection[Entity][number],
  ): boolean {
    return this.selection()[entity].length === 1 && this.isSelected(entity, column);
  }

  protected toggle<Entity extends EntityKind>(
    entity: Entity,
    column: ExportColumnSelection[Entity][number],
    selected: boolean,
  ): void {
    const current = this.selection();
    const entityColumns = current[entity] as readonly string[];
    const next = selected
      ? [...new Set([...entityColumns, column])]
      : entityColumns.filter((candidate) => candidate !== column);
    this.selection.set({ ...current, [entity]: next });
  }

  protected selectAll(entity: EntityKind): void {
    this.selection.update((current) => ({
      ...current,
      [entity]: exportColumnDefinitions[entity].map(({ key }) => key),
    }));
  }
}
