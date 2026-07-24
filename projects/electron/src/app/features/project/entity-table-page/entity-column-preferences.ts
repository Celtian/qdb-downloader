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

const entityKinds = ['leagues', 'teams', 'players'] as const satisfies readonly EntityKind[];

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

  resetAll(): boolean {
    try {
      for (const entity of entityKinds) {
        window.localStorage.removeItem(entityColumnPreferenceKey(entity));
      }
      return true;
    } catch {
      return false;
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
    const toCurrentKey = (value: unknown): EntityColumnKey | undefined => {
      const renamed = value === 'externalId' ? 'sourceId' : value;
      return typeof renamed === 'string' && validKeys.has(renamed as EntityColumnKey)
        ? (renamed as EntityColumnKey)
        : undefined;
    };

    for (const value of orderValues) {
      const key = toCurrentKey(value);
      if (!key) continue;
      if (ordered.has(key)) continue;
      ordered.add(key);
      order.push(key);
    }

    const selected = new Set(
      visibleValues.map(toCurrentKey).filter((value): value is EntityColumnKey => Boolean(value)),
    );
    for (const column of definitions) {
      if (!ordered.has(column.key)) {
        if (column.key === 'leagueCountry') {
          const sourceIndex = order.indexOf('sourceName');
          order.splice(sourceIndex < 0 ? order.length : sourceIndex + 1, 0, column.key);
        } else {
          order.push(column.key);
        }
        ordered.add(column.key);
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
