import { TestBed } from '@angular/core/testing';
import { defaultExportColumns, fullExportColumns } from '../../../shared/export-schema';
import {
  defaultExportColumnPresetId,
  EXPORT_COLUMN_PRESETS_STORAGE_KEY,
  ExportColumnPresetsService,
  fullExportColumnPresetId,
} from './export-column-presets.service';

describe('ExportColumnPresetsService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createService = (): ExportColumnPresetsService => {
    TestBed.configureTestingModule({});
    return TestBed.inject(ExportColumnPresetsService);
  };

  it('always provides immutable Default and Full presets', () => {
    const presets = createService().presets();

    expect(presets).toEqual([
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
    ]);
  });

  it('creates, updates, persists, and deletes custom presets', () => {
    const service = createService();
    const columns = defaultExportColumns();
    columns.leagues = ['name'];

    const created = service.create('Public feed', columns);

    expect(created).toEqual(
      expect.objectContaining({
        name: 'Public feed',
        columns: expect.objectContaining({ leagues: ['name'] }),
        builtIn: false,
      }),
    );
    expect(service.create('public FEED', columns)).toBeUndefined();
    expect(created && service.update(created.id, 'API feed', fullExportColumns())).toBe(true);
    expect(service.presets().at(-1)).toEqual(
      expect.objectContaining({ name: 'API feed', columns: fullExportColumns() }),
    );

    const stored = JSON.parse(
      window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY) ?? '{}',
    ) as { version: number; presets: unknown[] };
    expect(stored.version).toBe(1);
    expect(stored.presets).toHaveLength(1);

    expect(created && service.delete(created.id)).toBe(true);
    expect(service.presets()).toHaveLength(2);
  });

  it('normalizes stale stored columns and ignores invalid or reserved presets', () => {
    window.localStorage.setItem(
      EXPORT_COLUMN_PRESETS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        presets: [
          {
            id: 'custom-valid',
            name: 'Compact',
            columns: {
              leagues: ['unknown', 'name', 'name'],
              teams: [],
              players: ['name'],
            },
          },
          {
            id: 'custom-reserved',
            name: 'Default',
            columns: defaultExportColumns(),
          },
          { id: 'invalid', name: 'Ignored', columns: defaultExportColumns() },
        ],
      }),
    );

    const compact = createService().presets().at(-1);

    expect(compact).toEqual(
      expect.objectContaining({
        id: 'custom-valid',
        columns: {
          leagues: ['name'],
          teams: defaultExportColumns().teams,
          players: ['name'],
        },
      }),
    );
  });

  it('keeps built-in presets available when local storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });
    const service = createService();

    expect(service.presets()).toHaveLength(2);
    expect(service.create('Unavailable', defaultExportColumns())).toBeUndefined();
    expect(service.presets()).toHaveLength(2);
  });
});
