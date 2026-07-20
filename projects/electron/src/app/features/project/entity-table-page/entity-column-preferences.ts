import { Service } from '@angular/core';
import type { EntityKind } from '../../../../../shared/contracts';
import {
  columnsByEntity,
  defaultVisibleColumns,
  type EntityColumnKey,
} from './entity-table-columns';

export const entityColumnPreferenceKey = (entity: EntityKind): string =>
  `qdb-downloader.visible-columns.${entity}`;

@Service()
export class EntityColumnPreferences {
  load(entity: EntityKind): EntityColumnKey[] {
    const defaults = defaultVisibleColumns(entity);
    try {
      const stored = window.localStorage.getItem(entityColumnPreferenceKey(entity));
      if (stored === null) return defaults;
      const value: unknown = JSON.parse(stored);
      if (!Array.isArray(value)) return defaults;
      return this.normalize(entity, value);
    } catch {
      return defaults;
    }
  }

  save(entity: EntityKind, columns: readonly EntityColumnKey[]): void {
    try {
      window.localStorage.setItem(
        entityColumnPreferenceKey(entity),
        JSON.stringify(this.normalize(entity, columns)),
      );
    } catch {
      // Column preferences are optional when local storage is unavailable.
    }
  }

  private normalize(entity: EntityKind, values: readonly unknown[]): EntityColumnKey[] {
    const selected = new Set(values.filter((value): value is string => typeof value === 'string'));
    return columnsByEntity[entity]
      .filter((column) => column.required || selected.has(column.key))
      .map((column) => column.key);
  }
}
