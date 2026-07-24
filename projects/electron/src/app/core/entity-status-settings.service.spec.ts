import { TestBed } from '@angular/core/testing';
import {
  ENTITY_STATUS_SETTINGS_STORAGE_KEY,
  EntityStatusSettingsService,
} from './entity-status-settings.service';

describe('EntityStatusSettingsService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createService = (): EntityStatusSettingsService => {
    TestBed.configureTestingModule({});
    return TestBed.inject(EntityStatusSettingsService);
  };

  it('uses the default badge ages when no settings are stored', () => {
    expect(createService().settings()).toEqual({ newDays: 3, oldMonths: 6 });
  });

  it('restores valid fields and defaults invalid fields independently', () => {
    window.localStorage.setItem(
      ENTITY_STATUS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ newDays: 12, oldMonths: 13 }),
    );

    expect(createService().settings()).toEqual({ newDays: 12, oldMonths: 6 });
  });

  it('falls back to defaults for malformed stored settings', () => {
    window.localStorage.setItem(ENTITY_STATUS_SETTINGS_STORAGE_KEY, '{invalid');

    expect(createService().settings()).toEqual({ newDays: 3, oldMonths: 6 });
  });

  it('normalizes, updates, and persists settings', () => {
    const service = createService();

    service.setSettings({ newDays: 30, oldMonths: 1 });

    expect(service.settings()).toEqual({ newDays: 30, oldMonths: 1 });
    expect(
      JSON.parse(window.localStorage.getItem(ENTITY_STATUS_SETTINGS_STORAGE_KEY) ?? ''),
    ).toEqual({ newDays: 30, oldMonths: 1 });
  });

  it('keeps working when local storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });
    const service = createService();

    expect(service.settings()).toEqual({ newDays: 3, oldMonths: 6 });
    expect(() => service.setSettings({ newDays: 7, oldMonths: 2 })).not.toThrow();
    expect(service.settings()).toEqual({ newDays: 7, oldMonths: 2 });
  });
});
