import { TestBed } from '@angular/core/testing';

import type {
  ExportFieldNamePresetPreference,
  ExportVisibilityPresetPreference,
} from '../../../shared/contracts';
import {
  camelCaseExportFieldNames,
  defaultExportColumns,
  fullExportColumns,
  snakeCaseExportFieldNames,
} from '../../../shared/export-schema';
import { DesktopApi } from './desktop-api';
import {
  EXPORT_COLUMN_PRESETS_STORAGE_KEY,
  ExportColumnPresetsService,
  camelCaseExportFieldNamePresetId,
  defaultExportVisibilityPresetId,
  fullExportVisibilityPresetId,
  snakeCaseExportFieldNamePresetId,
} from './export-column-presets.service';

describe('ExportColumnPresetsService', () => {
  let storedVisibility: ExportVisibilityPresetPreference[] | undefined;
  let storedFieldNames: ExportFieldNamePresetPreference[] | undefined;
  let api: {
    getExportVisibilityPresets: ReturnType<typeof vi.fn>;
    updateExportVisibilityPresets: ReturnType<typeof vi.fn>;
    getExportFieldNamePresets: ReturnType<typeof vi.fn>;
    updateExportFieldNamePresets: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    window.localStorage.clear();
    storedVisibility = undefined;
    storedFieldNames = undefined;
    api = {
      getExportVisibilityPresets: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: storedVisibility,
        }),
      ),
      updateExportVisibilityPresets: vi.fn((presets: ExportVisibilityPresetPreference[]) => {
        storedVisibility = structuredClone(presets);
        return Promise.resolve({ ok: true as const, value: structuredClone(presets) });
      }),
      getExportFieldNamePresets: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: storedFieldNames,
        }),
      ),
      updateExportFieldNamePresets: vi.fn((presets: ExportFieldNamePresetPreference[]) => {
        storedFieldNames = structuredClone(presets);
        return Promise.resolve({ ok: true as const, value: structuredClone(presets) });
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createService = async (): Promise<ExportColumnPresetsService> => {
    TestBed.configureTestingModule({
      providers: [{ provide: DesktopApi, useValue: api }],
    });
    const service = TestBed.inject(ExportColumnPresetsService);
    await vi.waitFor(() => expect(service.loading()).toBe(false));
    return service;
  };

  it('provides independent visibility and field-name built-ins', async () => {
    const service = await createService();

    expect(service.visibilityPresets()).toEqual([
      {
        id: defaultExportVisibilityPresetId,
        name: 'Default',
        columns: defaultExportColumns(),
        builtIn: true,
      },
      {
        id: fullExportVisibilityPresetId,
        name: 'Full',
        columns: fullExportColumns(),
        builtIn: true,
      },
    ]);
    expect(service.fieldNamePresets()).toEqual([
      {
        id: camelCaseExportFieldNamePresetId,
        name: 'Camel case',
        fieldNames: camelCaseExportFieldNames(),
        builtIn: true,
      },
      {
        id: snakeCaseExportFieldNamePresetId,
        name: 'Snake case',
        fieldNames: snakeCaseExportFieldNames(),
        builtIn: true,
      },
    ]);
    expect(storedVisibility).toEqual([]);
    expect(storedFieldNames).toEqual([]);
  });

  it('persists CRUD independently for both preset families', async () => {
    storedVisibility = [];
    storedFieldNames = [];
    const service = await createService();
    const visibility = defaultExportColumns();
    visibility.leagues = ['name'];
    const names = camelCaseExportFieldNames();
    const leagueName = names.leagues.find(({ sourceKey }) => sourceKey === 'name');
    if (!leagueName) throw new Error('Missing league name field.');
    leagueName.outputName = 'leagueName';

    const createdVisibility = await service.createVisibility('Public feed', visibility);
    expect(createdVisibility?.columns.leagues).toEqual(['name']);
    expect(storedFieldNames).toEqual([]);
    expect(await service.createVisibility('PUBLIC FEED', visibility)).toBeUndefined();

    const createdNames = await service.createFieldNames('Public feed', names);
    expect(createdNames?.fieldNames.leagues[4].outputName).toBe('leagueName');
    expect(storedVisibility).toHaveLength(1);
    expect(await service.createFieldNames('PUBLIC FEED', names)).toBeUndefined();

    expect(
      createdVisibility &&
        (await service.updateVisibility(createdVisibility.id, 'API feed', fullExportColumns())),
    ).toBe(true);
    expect(service.visibilityPresets().at(-1)?.name).toBe('API feed');
    expect(createdNames && (await service.deleteFieldNames(createdNames.id))).toBe(true);
    expect(service.fieldNamePresets()).toHaveLength(2);
    expect(storedVisibility).toHaveLength(1);
  });

  it('splits version 1 legacy presets and removes storage only after both writes', async () => {
    window.localStorage.setItem(
      EXPORT_COLUMN_PRESETS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        presets: [
          {
            id: 'custom-valid',
            name: 'Full',
            columns: {
              leagues: ['unknown', 'name', 'name'],
              teams: [],
              players: ['name'],
            },
          },
        ],
      }),
    );

    const service = await createService();

    expect(service.visibilityPresets().at(-1)).toEqual(
      expect.objectContaining({
        id: 'custom-valid',
        name: 'Full (custom)',
        columns: {
          leagues: ['name'],
          teams: defaultExportColumns().teams,
          players: ['name'],
        },
      }),
    );
    expect(service.fieldNamePresets().at(-1)).toEqual(
      expect.objectContaining({
        id: 'custom-valid',
        name: 'Full',
        fieldNames: camelCaseExportFieldNames(),
      }),
    );
    expect(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY)).toBeNull();
  });

  it('initializes only a missing collection and migrates version 2 aliases to a complete map', async () => {
    storedVisibility = [
      {
        id: 'custom-existing',
        name: 'Existing',
        columns: defaultExportColumns(),
      },
    ];
    window.localStorage.setItem(
      EXPORT_COLUMN_PRESETS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        presets: [
          {
            id: 'custom-legacy',
            name: 'Legacy names',
            columns: {
              nameStyle: 'snake_case',
              leagues: [{ sourceKey: 'name', outputName: 'competition_name' }],
              teams: [{ sourceKey: 'name', outputName: 'team_name' }],
              players: [{ sourceKey: 'name', outputName: 'player_name' }],
            },
          },
        ],
      }),
    );

    const service = await createService();
    const migratedNames = service.fieldNamePresets().at(-1)?.fieldNames;

    expect(api.updateExportVisibilityPresets).not.toHaveBeenCalled();
    expect(api.updateExportFieldNamePresets).toHaveBeenCalledOnce();
    expect(service.visibilityPresets().at(-1)?.name).toBe('Existing');
    expect(migratedNames?.leagues).toHaveLength(13);
    expect(migratedNames?.leagues.find(({ sourceKey }) => sourceKey === 'name')?.outputName).toBe(
      'competition_name',
    );
    expect(
      migratedNames?.leagues.find(({ sourceKey }) => sourceKey === 'countryCode2')?.outputName,
    ).toBe('country_code_2');
    expect(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY)).toBeNull();
  });

  it('keeps legacy storage when either SQLite write fails', async () => {
    window.localStorage.setItem(
      EXPORT_COLUMN_PRESETS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        presets: [
          {
            id: 'custom-retry',
            name: 'Retry',
            columns: {
              leagues: ['name'],
              teams: ['name'],
              players: ['name'],
            },
          },
        ],
      }),
    );
    api.updateExportFieldNamePresets.mockResolvedValue({
      ok: false,
      error: { code: 'DATABASE', message: 'Unavailable' },
    });

    const service = await createService();

    expect(service.visibilityPresets().at(-1)?.name).toBe('Retry');
    expect(service.fieldNamePresets().at(-1)?.name).toBe('Retry');
    expect(window.localStorage.getItem(EXPORT_COLUMN_PRESETS_STORAGE_KEY)).not.toBeNull();
    expect(service.error()).toBeTruthy();
  });
});
