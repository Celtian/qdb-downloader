import { TestBed } from '@angular/core/testing';
import { THEME_PREFERENCE_STORAGE_KEY, ThemeService, type ThemePreference } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty('color-scheme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('color-scheme');
  });

  const createService = (): ThemeService => {
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  };

  it('defaults to System and enables both color schemes', () => {
    const service = createService();

    expect(service.preference()).toBe('system');
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it.each<ThemePreference>(['system', 'light', 'dark'])(
    'restores the persisted %s preference',
    (preference) => {
      window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);

      const service = createService();

      expect(service.preference()).toBe(preference);
      expect(document.documentElement.style.colorScheme).toBe(
        preference === 'system' ? 'light dark' : preference,
      );
    },
  );

  it('falls back to System for an invalid stored value', () => {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'sepia');

    const service = createService();

    expect(service.preference()).toBe('system');
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it('applies and persists a new preference', () => {
    const service = createService();

    service.setPreference('dark');

    expect(service.preference()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe('dark');
  });

  it('continues with System when local storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });
    const service = createService();

    expect(service.preference()).toBe('system');
    expect(() => service.setPreference('light')).not.toThrow();
    expect(service.preference()).toBe('light');
  });
});
