import { TestBed } from '@angular/core/testing';
import { EntityColumnPreferences, entityColumnPreferenceKey } from './entity-column-preferences';

describe('EntityColumnPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses timestamp-hidden defaults independently for every entity', () => {
    const preferences = TestBed.inject(EntityColumnPreferences);

    expect(preferences.load('leagues')).toEqual([
      'name',
      'season',
      'teamCount',
      'sourceUrl',
      'actions',
    ]);
    expect(preferences.load('teams')).toEqual([
      'name',
      'season',
      'playerCount',
      'sourceUrl',
      'actions',
    ]);
    expect(preferences.load('players')).toEqual([
      'name',
      'countryName',
      'jerseyNumber',
      'position',
      'birthdate',
      'height',
      'foot',
      'joined',
      'contractExpires',
      'marketValue',
    ]);
  });

  it('normalizes persisted columns and keeps preferences separate by entity', () => {
    const preferences = TestBed.inject(EntityColumnPreferences);
    window.localStorage.setItem(
      entityColumnPreferenceKey('teams'),
      JSON.stringify(['updatedAt', 'unknown', 'updatedAt', 42]),
    );

    expect(preferences.load('teams')).toEqual(['name', 'updatedAt', 'actions']);
    expect(preferences.load('leagues')).toContain('actions');

    preferences.save('players', ['name', 'createdAt', 'updatedAt']);
    expect(
      JSON.parse(window.localStorage.getItem(entityColumnPreferenceKey('players')) ?? ''),
    ).toEqual(['name', 'createdAt', 'updatedAt']);

    preferences.save('leagues', ['name']);
    expect(
      JSON.parse(window.localStorage.getItem(entityColumnPreferenceKey('leagues')) ?? ''),
    ).toEqual(['name', 'actions']);
  });

  it('falls back to defaults for malformed or unavailable storage', () => {
    const preferences = TestBed.inject(EntityColumnPreferences);
    window.localStorage.setItem(entityColumnPreferenceKey('leagues'), '{invalid');
    expect(preferences.load('leagues')).toContain('teamCount');

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(preferences.load('teams')).toContain('playerCount');
    getItem.mockRestore();
  });
});
