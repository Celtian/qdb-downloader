import { Service } from '@angular/core';
import type { EntityKind } from '../../../../../shared/contracts';
import {
  columnsByEntity,
  defaultColumnPreference,
  type EntityColumnPreference,
  type EntityColumnKey,
} from './entity-table-columns';

export const entityColumnPreferenceKey = (entity: EntityKind): string =>
  `qdb-downloader.visible-columns.${entity}`;

@Service()
export class EntityColumnPreferences {
  load(entity: EntityKind): EntityColumnPreference {
    const defaults = defaultColumnPreference(entity);
    try {
      const stored = window.localStorage.getItem(entityColumnPreferenceKey(entity));
      if (stored === null) return defaults;
      const value: unknown = JSON.parse(stored);
      if (Array.isArray(value)) return this.normalize(entity, defaults.order, value, false);
      if (!this.isStoredPreference(value)) return defaults;
      return this.normalize(entity, value.order, value.visible, true);
    } catch {
      return defaults;
    }
  }

  save(entity: EntityKind, preference: EntityColumnPreference): void {
    try {
      window.localStorage.setItem(
        entityColumnPreferenceKey(entity),
        JSON.stringify(this.normalize(entity, preference.order, preference.visible, true)),
      );
    } catch {
      // Column preferences are optional when local storage is unavailable.
    }
  }

  private isStoredPreference(
    value: unknown,
  ): value is { version: 2; order: unknown[]; visible: unknown[] } {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      candidate['version'] === 2 &&
      Array.isArray(candidate['order']) &&
      Array.isArray(candidate['visible'])
    );
  }

  private normalize(
    entity: EntityKind,
    orderValues: readonly unknown[],
    visibleValues: readonly unknown[],
    showNewDefaults: boolean,
  ): EntityColumnPreference {
    const definitions = columnsByEntity[entity];
    const validKeys = new Set(definitions.map((column) => column.key));
    const order: EntityColumnKey[] = [];
    const ordered = new Set<EntityColumnKey>();

    for (const value of orderValues) {
      if (typeof value !== 'string' || !validKeys.has(value as EntityColumnKey)) continue;
      const key = value as EntityColumnKey;
      if (ordered.has(key)) continue;
      ordered.add(key);
      order.push(key);
    }

    const selected = new Set(
      visibleValues.filter(
        (value): value is EntityColumnKey =>
          typeof value === 'string' && validKeys.has(value as EntityColumnKey),
      ),
    );
    for (const column of definitions) {
      if (!ordered.has(column.key)) {
        order.push(column.key);
        if (showNewDefaults && column.defaultVisible) selected.add(column.key);
      }
      if (column.required) selected.add(column.key);
    }

    return {
      version: 2,
      order,
      visible: order.filter((column) => selected.has(column)),
    };
  }
}
