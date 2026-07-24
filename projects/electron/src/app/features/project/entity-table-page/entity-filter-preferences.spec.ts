import { TestBed } from '@angular/core/testing';
import { THEME_PREFERENCE_STORAGE_KEY } from '../../../core/theme.service';
import { emptyEntityFilters } from '../entity-filter-form/entity-filter-form';
import { EntityFilterPreferences, entityFilterPreferenceKey } from './entity-filter-preferences';

describe('EntityFilterPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores normalized filters independently by project and entity', () => {
    const preferences = TestBed.inject(EntityFilterPreferences);
    preferences.save('project-a', 'teams', {
      ...emptyEntityFilters(),
      parentIds: ['league-a', ' league-a ', 'league-b'],
      includeTeamsWithoutLeague: true,
      seasons: ['2026'],
      nationalities: ['Ignored'],
    });
    preferences.save('project-b', 'players', {
      ...emptyEntityFilters(),
      parentIds: ['team-a'],
      positions: ['ATTACKER'],
      positionDetails: ['ST'],
      feet: ['RIGHT'],
    });
    preferences.save('project-c', 'leagues', {
      ...emptyEntityFilters(),
      countries: ['England', ' England ', 'Scotland'],
      seasons: ['2026'],
    });

    expect(preferences.load('project-a', 'teams')).toEqual({
      ...emptyEntityFilters(),
      parentIds: ['league-a', 'league-b'],
      includeTeamsWithoutLeague: true,
      seasons: ['2026'],
    });
    expect(preferences.load('project-b', 'players')).toEqual({
      ...emptyEntityFilters(),
      parentIds: ['team-a'],
      positions: ['ATTACKER'],
      positionDetails: ['ST'],
      feet: ['RIGHT'],
    });
    expect(preferences.load('project-c', 'leagues')).toEqual({
      ...emptyEntityFilters(),
      countries: ['England', 'Scotland'],
      seasons: ['2026'],
    });
    expect(preferences.load('project-a', 'players')).toBeUndefined();
    expect(
      JSON.parse(
        window.localStorage.getItem(entityFilterPreferenceKey('project-a', 'teams')) ?? '',
      ),
    ).toMatchObject({ version: 2 });
  });

  it('removes empty preferences and rejects malformed or unsupported values', () => {
    const preferences = TestBed.inject(EntityFilterPreferences);
    const key = entityFilterPreferenceKey('project-a', 'leagues');
    preferences.save('project-a', 'leagues', {
      ...emptyEntityFilters(),
      seasons: ['2026'],
    });
    expect(window.localStorage.getItem(key)).not.toBeNull();

    preferences.save('project-a', 'leagues', emptyEntityFilters());
    expect(window.localStorage.getItem(key)).toBeNull();

    window.localStorage.setItem(key, '{invalid');
    expect(preferences.load('project-a', 'leagues')).toBeUndefined();
    window.localStorage.setItem(key, JSON.stringify({ version: 3, filters: {} }));
    expect(preferences.load('project-a', 'leagues')).toBeUndefined();

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(preferences.load('project-a', 'leagues')).toBeUndefined();
    getItem.mockRestore();
  });

  it('sanitizes stored player values before exposing them', () => {
    const preferences = TestBed.inject(EntityFilterPreferences);
    window.localStorage.setItem(
      entityFilterPreferenceKey('project-a', 'players'),
      JSON.stringify({
        version: 1,
        filters: {
          parentIds: ['team-a', 42],
          nationalities: ['Scotland', 'Scotland'],
          positions: ['ATTACKER', 'INVALID'],
          positionDetails: ['ST', 'INVALID'],
          feet: ['RIGHT', 'INVALID'],
          sourceNames: ['soccerway', 'worldfootball', 'eurofotbal', 'INVALID'],
        },
      }),
    );

    expect(preferences.load('project-a', 'players')).toEqual({
      ...emptyEntityFilters(),
      parentIds: ['team-a'],
      nationalities: ['Scotland'],
      positions: ['ATTACKER'],
      positionDetails: ['ST'],
      feet: ['RIGHT'],
      sourceNames: ['soccerway', 'worldfootball', 'eurofotbal'],
    });
  });

  it('resets only filter preferences and reports unavailable storage', () => {
    const preferences = TestBed.inject(EntityFilterPreferences);
    window.localStorage.setItem(entityFilterPreferenceKey('project-a', 'teams'), '{}');
    window.localStorage.setItem(entityFilterPreferenceKey('project-b', 'players'), '{}');
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'dark');
    window.localStorage.setItem('unrelated', 'value');

    expect(preferences.resetAll()).toBe(true);
    expect(window.localStorage.getItem(entityFilterPreferenceKey('project-a', 'teams'))).toBeNull();
    expect(
      window.localStorage.getItem(entityFilterPreferenceKey('project-b', 'players')),
    ).toBeNull();
    expect(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe('dark');
    expect(window.localStorage.getItem('unrelated')).toBe('value');

    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    window.localStorage.setItem(entityFilterPreferenceKey('project-c', 'leagues'), '{}');
    expect(preferences.resetAll()).toBe(false);
    expect(preferences.save('project-c', 'leagues', emptyEntityFilters())).toBe(false);
    removeItem.mockRestore();
  });
});
