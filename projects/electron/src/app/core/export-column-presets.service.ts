import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';
import type { EntityKind, ExportColumnSelection } from '../../../shared/contracts';
import {
  defaultExportColumns,
  exportColumnDefinitions,
  fullExportColumns,
} from '../../../shared/export-schema';

export const EXPORT_COLUMN_PRESETS_STORAGE_KEY = 'qdb-downloader.export-column-presets';
export const defaultExportColumnPresetId = 'default';
export const fullExportColumnPresetId = 'full';

export interface ExportColumnPreset {
  id: string;
  name: string;
  columns: ExportColumnSelection;
  builtIn: boolean;
}

interface StoredExportColumnPreset {
  id: string;
  name: string;
  columns: ExportColumnSelection;
}

const cloneColumns = (columns: ExportColumnSelection): ExportColumnSelection => ({
  leagues: [...columns.leagues],
  teams: [...columns.teams],
  players: [...columns.players],
});

const builtInPresets = (): readonly ExportColumnPreset[] => [
  {
    id: defaultExportColumnPresetId,
    name: 'Default',
    columns: defaultExportColumns(),
    builtIn: true,
  },
  {
    id: fullExportColumnPresetId,
    name: 'Full',
    columns: fullExportColumns(),
    builtIn: true,
  },
];

@Service()
export class ExportColumnPresetsService {
  private readonly document = inject(DOCUMENT);
  private readonly customPresets = signal<readonly StoredExportColumnPreset[]>(
    this.loadCustomPresets(),
  );

  readonly presets = computed<readonly ExportColumnPreset[]>(() => [
    ...builtInPresets(),
    ...this.customPresets().map((preset) => ({
      ...preset,
      columns: cloneColumns(preset.columns),
      builtIn: false,
    })),
  ]);

  create(name: string, columns: ExportColumnSelection): ExportColumnPreset | undefined {
    const normalizedName = name.trim();
    if (!normalizedName || this.hasName(normalizedName)) return undefined;
    const preset: StoredExportColumnPreset = {
      id: `custom-${globalThis.crypto.randomUUID()}`,
      name: normalizedName,
      columns: this.normalizeColumns(columns),
    };
    const next = [...this.customPresets(), preset];
    if (!this.persist(next)) return undefined;
    this.customPresets.set(next);
    return { ...preset, columns: cloneColumns(preset.columns), builtIn: false };
  }

  update(id: string, name: string, columns: ExportColumnSelection): boolean {
    const normalizedName = name.trim();
    if (
      id === defaultExportColumnPresetId ||
      id === fullExportColumnPresetId ||
      !normalizedName ||
      this.hasName(normalizedName, id)
    ) {
      return false;
    }
    const index = this.customPresets().findIndex((preset) => preset.id === id);
    if (index < 0) return false;
    const next = this.customPresets().map((preset) =>
      preset.id === id
        ? { ...preset, name: normalizedName, columns: this.normalizeColumns(columns) }
        : preset,
    );
    if (!this.persist(next)) return false;
    this.customPresets.set(next);
    return true;
  }

  delete(id: string): boolean {
    const next = this.customPresets().filter((preset) => preset.id !== id);
    if (next.length === this.customPresets().length || !this.persist(next)) return false;
    this.customPresets.set(next);
    return true;
  }

  private hasName(name: string, excludedId?: string): boolean {
    const normalizedName = name.toLocaleLowerCase();
    return this.presets().some(
      (preset) => preset.id !== excludedId && preset.name.toLocaleLowerCase() === normalizedName,
    );
  }

  private loadCustomPresets(): readonly StoredExportColumnPreset[] {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(
        EXPORT_COLUMN_PRESETS_STORAGE_KEY,
      );
      if (stored === undefined || stored === null) return [];
      const value: unknown = JSON.parse(stored);
      if (!this.isStoredCollection(value)) return [];
      const presets: StoredExportColumnPreset[] = [];
      const ids = new Set<string>();
      const names = new Set(['default', 'full']);
      for (const candidate of value.presets) {
        if (!this.isStoredPreset(candidate)) continue;
        const name = candidate.name.trim();
        const normalizedName = name.toLocaleLowerCase();
        if (!name || ids.has(candidate.id) || names.has(normalizedName)) continue;
        ids.add(candidate.id);
        names.add(normalizedName);
        presets.push({
          id: candidate.id,
          name,
          columns: this.normalizeColumns(candidate.columns),
        });
      }
      return presets;
    } catch {
      return [];
    }
  }

  private persist(presets: readonly StoredExportColumnPreset[]): boolean {
    try {
      const storage = this.document.defaultView?.localStorage;
      if (!storage) return false;
      storage.setItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY, JSON.stringify({ version: 1, presets }));
      return true;
    } catch {
      return false;
    }
  }

  private isStoredCollection(value: unknown): value is { version: 1; presets: readonly unknown[] } {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return candidate['version'] === 1 && Array.isArray(candidate['presets']);
  }

  private isStoredPreset(value: unknown): value is { id: string; name: string; columns: unknown } {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate['id'] === 'string' &&
      candidate['id'].startsWith('custom-') &&
      typeof candidate['name'] === 'string' &&
      typeof candidate['columns'] === 'object' &&
      candidate['columns'] !== null
    );
  }

  private normalizeColumns(value: unknown): ExportColumnSelection {
    const defaults = defaultExportColumns();
    const source =
      typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    return {
      leagues: this.normalizeEntityColumns('leagues', source['leagues'], defaults.leagues),
      teams: this.normalizeEntityColumns('teams', source['teams'], defaults.teams),
      players: this.normalizeEntityColumns('players', source['players'], defaults.players),
    };
  }

  private normalizeEntityColumns<Entity extends EntityKind>(
    entity: Entity,
    value: unknown,
    fallback: ExportColumnSelection[Entity],
  ): ExportColumnSelection[Entity] {
    if (!Array.isArray(value)) return [...fallback] as ExportColumnSelection[Entity];
    const selected = new Set(value.filter((item): item is string => typeof item === 'string'));
    const normalized = exportColumnDefinitions[entity]
      .filter(({ key }) => selected.has(key))
      .map(({ key }) => key) as ExportColumnSelection[Entity];
    return normalized.length > 0 ? normalized : ([...fallback] as ExportColumnSelection[Entity]);
  }
}
