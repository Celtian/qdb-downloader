import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { CommitImportRequest, Player, Team } from '../shared/contracts.js';
import { SnapshotDatabase } from './database.js';

const directories: string[] = [];

const createDatabasePath = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'qdb-downloader-test-'));
  directories.push(directory);
  return join(directory, 'snapshot.sqlite');
};

const createDatabase = (): SnapshotDatabase => new SnapshotDatabase(createDatabasePath());

const mergeOperation = () =>
  ({
    kind: 'merge',
    options: {
      existingRecords: 'refresh',
      teamLeagueConflicts: 'move',
      playerTeamConflicts: 'move',
    },
  }) as const;

afterEach(() => {
  while (directories.length) {
    const directory = directories.pop();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

describe('SnapshotDatabase', () => {
  test('filters league, team, and player pages by badge status before counting and pagination', () => {
    vi.useFakeTimers();
    const database = createDatabase();
    try {
      vi.setSystemTime(new Date('2026-01-24T12:00:00.000Z'));
      const project = database.createProject({
        name: 'Badge filters',
        referenceDate: '2026-07-24',
      });
      const importSnapshot = (suffix: string, label: string): void => {
        database.commitImport({
          projectId: project.id,
          sourceName: 'transfermarkt',
          operation: mergeOperation(),
          league: {
            sourceId: `league-${suffix}`,
            name: `${label} League`,
            sourceUrl: `https://example.test/league-${suffix}`,
          },
          teams: [
            {
              sourceId: `team-${suffix}`,
              name: `${label} Team`,
              sourceUrl: `https://example.test/team-${suffix}`,
              players: [{ sourceId: `player-${suffix}`, name: `${label} Player` }],
            },
          ],
        });
      };
      importSnapshot('old', 'Old');

      const statusAsOf = '2026-07-24T12:00:00.000Z';
      vi.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
      importSnapshot('recent', 'Recent');
      vi.setSystemTime(new Date(statusAsOf));
      importSnapshot('new', 'New');
      const customBadge = database.createCustomBadge({
        name: 'Review status',
        description: 'Included through the custom badge filter',
        color: 'blue',
      });

      for (const entity of ['leagues', 'teams', 'players'] as const) {
        const entityLabel = { leagues: 'League', teams: 'Team', players: 'Player' }[entity];
        const list = (
          statuses: ('new' | 'old')[],
          pageIndex = 0,
          pageSize = 25,
          statusSettings = { newDays: 3, oldMonths: 6 },
        ) =>
          database.listEntities({
            projectId: project.id,
            entity,
            pageIndex,
            pageSize,
            search: '',
            sort: 'name',
            direction: 'asc',
            statuses,
            statusAsOf,
            statusSettings,
          });

        expect(list(['new'])).toMatchObject({
          total: 1,
          rows: [expect.objectContaining({ name: `New ${entityLabel}` })],
        });
        expect(list(['old'])).toMatchObject({
          total: 1,
          rows: [expect.objectContaining({ name: `Old ${entityLabel}` })],
        });
        const oldRow = list([]).rows.find(({ name }) => name === `Old ${entityLabel}`);
        if (!oldRow) throw new Error('Old badge fixture is missing.');
        database.updateEntityCustomBadges({
          projectId: project.id,
          entity,
          ids: [oldRow.id],
          addBadgeIds: [customBadge.id],
          removeBadgeIds: [],
        });
        expect(
          database
            .listEntities({
              projectId: project.id,
              entity,
              pageIndex: 0,
              pageSize: 25,
              search: '',
              sort: 'name',
              direction: 'asc',
              statuses: ['new'],
              customBadgeIds: [customBadge.id],
              statusAsOf,
            })
            .rows.map(({ name }) => name),
        ).toEqual([`New ${entityLabel}`, `Old ${entityLabel}`]);

        const firstPage = list(['new', 'old'], 0, 1);
        const secondPage = list(['new', 'old'], 1, 1);
        expect(firstPage.total).toBe(2);
        expect(firstPage.rows).toHaveLength(1);
        expect(secondPage.total).toBe(2);
        expect(secondPage.rows).toHaveLength(1);

        expect(list(['new'], 0, 25, { newDays: 30, oldMonths: 6 }).total).toBe(2);
        expect(list(['old'], 0, 25, { newDays: 3, oldMonths: 1 }).total).toBe(1);
        expect(new Set([...firstPage.rows, ...secondPage.rows].map(({ name }) => name))).toEqual(
          new Set([`New ${entityLabel}`, `Old ${entityLabel}`]),
        );
      }

      const invalidRequest = {
        projectId: project.id,
        entity: 'leagues' as const,
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc' as const,
      };
      expect(
        database.listEntities({
          ...invalidRequest,
          statuses: ['new'],
          statusAsOf: 'not-a-timestamp',
        }).total,
      ).toBe(1);
      expect(
        database.listEntities({
          ...invalidRequest,
          statuses: ['not-a-status' as never],
          statusAsOf,
        }).total,
      ).toBe(3);
    } finally {
      database.close();
      vi.useRealTimers();
    }
  });

  test('creates global custom badges and assigns, filters, and deletes them across entity tables', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Custom badges',
      referenceDate: '2026-07-24',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      league: {
        sourceId: 'badge-league',
        name: 'Badge League',
        sourceUrl: 'https://example.test/badge-league',
      },
      teams: [
        {
          sourceId: 'badge-team',
          name: 'Badge Team',
          sourceUrl: 'https://example.test/badge-team',
          players: [{ sourceId: 'badge-player', name: 'Badge Player' }],
        },
      ],
    });
    const badge = database.createCustomBadge({
      name: 'Review',
      description: 'Needs manual review',
      color: 'purple',
    });
    expect(badge).toMatchObject({ assignmentCount: 0, name: 'Review', color: 'purple' });
    expect(() =>
      database.createCustomBadge({
        name: ' review ',
        description: 'Duplicate',
        color: 'red',
      }),
    ).toThrow('already exists');

    for (const entity of ['leagues', 'teams', 'players'] as const) {
      const row = database.listEntities({
        projectId: project.id,
        entity,
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0];
      database.updateEntityCustomBadges({
        projectId: project.id,
        entity,
        ids: [row.id],
        addBadgeIds: [badge.id],
        removeBadgeIds: [],
      });
      expect(
        database.listEntities({
          projectId: project.id,
          entity,
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          customBadgeIds: [badge.id],
        }),
      ).toMatchObject({
        total: 1,
        rows: [
          expect.objectContaining({
            customBadges: [
              expect.objectContaining({
                id: badge.id,
                name: 'Review',
                description: 'Needs manual review',
                color: 'purple',
              }),
            ],
          }),
        ],
      });
      expect(
        database.listEntityFilterOptions({ projectId: project.id, entity }).customBadges,
      ).toEqual([expect.objectContaining({ id: badge.id, name: 'Review' })]);
    }

    expect(database.listCustomBadges()).toEqual([
      expect.objectContaining({ id: badge.id, assignmentCount: 3 }),
    ]);
    expect(database.deleteCustomBadge(badge.id)).toEqual({
      id: badge.id,
      deletedAssignmentCount: 3,
    });
    expect(database.listCustomBadges()).toEqual([]);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0]?.customBadges,
    ).toEqual([]);
    database.close();
  });

  test('keeps combined custom badges separate and assigns, filters, and deletes them', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Combined custom badges',
      referenceDate: '2026-07-24',
    });
    for (const sourceName of ['transfermarkt', 'soccerway'] as const) {
      database.commitImport({
        projectId: project.id,
        sourceName,
        operation: mergeOperation(),
        league: {
          sourceId: `${sourceName}-badge-league`,
          name: 'Badge League',
          sourceUrl: `${sourceName}-badge-league-url`,
        },
        teams: [
          {
            sourceId: `${sourceName}-badge-team`,
            name: 'Badge Team',
            sourceUrl: `${sourceName}-badge-team-url`,
            players: [
              {
                sourceId: `${sourceName}-badge-player`,
                name: 'Badge Player',
                birthdate: '2000-01-01',
              },
            ],
          },
        ],
      });
    }
    const candidates = database.listCombineTeamCandidates({
      projectId: project.id,
      search: 'Badge Team',
    });
    const preview = database.previewTeamCombination({
      projectId: project.id,
      sourceTeamIds: candidates.map(({ id }) => id),
    });
    const combined = database.commitTeamCombination({
      projectId: project.id,
      sourceTeamIds: candidates.map(({ id }) => id),
      league: {
        kind: 'create',
        sourceLeagueIds: preview.sourceLeagues.map(({ id }) => id),
        resolutions: {},
      },
      matchGroups: preview.matchGroups,
      selectedPlayerGroupIds: preview.matchGroups.map(({ id }) => id),
      teamResolutions: {},
      playerResolutions: {},
    });
    if (!combined.league || !combined.players[0]) {
      throw new Error('Expected combined badge fixtures.');
    }

    const sourceBadge = database.createCustomBadge({
      name: 'Review',
      description: 'Source review',
      color: 'red',
    });
    const badge = database.createCombinedCustomBadge({
      name: 'Review',
      description: 'Combined review',
      color: 'purple',
    });
    expect(sourceBadge.name).toBe(badge.name);
    expect(database.listCustomBadges()).toHaveLength(1);
    expect(database.listCombinedCustomBadges()).toEqual([
      expect.objectContaining({ id: badge.id, assignmentCount: 0 }),
    ]);
    expect(() =>
      database.createCombinedCustomBadge({
        name: ' review ',
        description: 'Duplicate combined badge',
        color: 'green',
      }),
    ).toThrow('already exists');

    const combinedEntities = {
      leagues: combined.league,
      teams: combined.team,
      players: combined.players[0],
    } as const;
    for (const entity of ['leagues', 'teams', 'players'] as const) {
      database.updateCombinedEntityCustomBadges({
        projectId: project.id,
        entity,
        ids: [combinedEntities[entity].id],
        addBadgeIds: [badge.id],
        removeBadgeIds: [],
      });
      expect(
        database.listCombinedEntities({
          projectId: project.id,
          entity,
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          customBadgeIds: [badge.id],
        }),
      ).toMatchObject({
        total: 1,
        rows: [
          expect.objectContaining({
            customBadges: [
              expect.objectContaining({
                id: badge.id,
                name: 'Review',
                description: 'Combined review',
                color: 'purple',
              }),
            ],
          }),
        ],
      });
      expect(
        database.listCombinedEntityFilterOptions({ projectId: project.id, entity }).customBadges,
      ).toEqual([expect.objectContaining({ id: badge.id, name: 'Review' })]);
    }

    expect(
      database.listCombinedEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
        needsReview: true,
        customBadgeIds: [badge.id],
      }).total,
    ).toBe(1);
    expect(database.listCombinedCustomBadges()).toEqual([
      expect.objectContaining({ id: badge.id, assignmentCount: 3 }),
    ]);

    database.deleteSourceData({
      projectId: project.id,
      sourceNames: ['transfermarkt'],
    });
    expect(
      database.listCombinedEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      needsReview: true,
      customBadges: [expect.objectContaining({ id: badge.id })],
    });

    expect(database.deleteCombinedCustomBadge(badge.id)).toEqual({
      id: badge.id,
      deletedAssignmentCount: 3,
    });
    expect(database.listCombinedCustomBadges()).toEqual([]);
    expect(database.listCustomBadges()).toEqual([
      expect.objectContaining({ id: sourceBadge.id, assignmentCount: 0 }),
    ]);
    database.close();
  });

  test('sorts players by creation timestamp', () => {
    vi.useFakeTimers();
    try {
      const database = createDatabase();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const project = database.createProject({
        name: 'Timestamp sort',
        referenceDate: '2026-01-01',
      });
      const request = {
        projectId: project.id,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        teams: [
          {
            sourceId: 'team',
            name: 'Team',
            sourceUrl: 'https://example.test/team',
            players: [{ sourceId: 'older', name: 'Older Player' }],
          },
        ],
      };
      database.commitImport(request);

      vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      database.commitImport({
        ...request,
        teams: [
          {
            ...request.teams[0],
            players: [...request.teams[0].players, { sourceId: 'newer', name: 'Newer Player' }],
          },
        ],
      });

      const list = (direction: 'asc' | 'desc') =>
        database
          .listEntities({
            projectId: project.id,
            entity: 'players',
            pageIndex: 0,
            pageSize: 25,
            search: '',
            sort: 'createdAt',
            direction,
          })
          .rows.map((player) => player.name);
      expect(list('asc')).toEqual(['Older Player', 'Newer Player']);
      expect(list('desc')).toEqual(['Newer Player', 'Older Player']);
      expect(
        database
          .listEntities({
            projectId: project.id,
            entity: 'players',
            pageIndex: 0,
            pageSize: 25,
            search: '',
            sort: 'sourceId',
            direction: 'asc',
          })
          .rows.map((player) => player.name),
      ).toEqual(['Newer Player', 'Older Player']);
      database.close();
    } finally {
      vi.useRealTimers();
    }
  });

  test('sorts players numerically by weight', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Weight sort',
      referenceDate: '2026-01-01',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team',
          name: 'Team',
          sourceUrl: 'https://example.test/team',
          players: [
            { sourceId: 'heavier', name: 'Heavier Player', weight: 82 },
            { sourceId: 'lighter', name: 'Lighter Player', weight: 75 },
          ],
        },
      ],
    });

    const list = (direction: 'asc' | 'desc') =>
      database
        .listEntities({
          projectId: project.id,
          entity: 'players',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'weight',
          direction,
        })
        .rows.map((player) => player.name);

    expect(list('asc')).toEqual(['Lighter Player', 'Heavier Player']);
    expect(list('desc')).toEqual(['Heavier Player', 'Lighter Player']);
    database.close();
  });

  test('filters teams and players by multiple parents, including teams without a league', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Filtered', referenceDate: '2026-01-01' });
    const otherProject = database.createProject({ name: 'Other', referenceDate: '2026-07-01' });
    const importLeague = (
      projectId: string,
      leagueId: string,
      leagueName: string,
      teamId: string,
      teamName: string,
      playerName: string,
    ) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: {
          sourceId: leagueId,
          name: leagueName,
          sourceUrl: `https://example.test/${leagueId}`,
        },
        teams: [
          {
            sourceId: teamId,
            name: teamName,
            sourceUrl: `https://example.test/${teamId}`,
            players: [{ sourceId: `player-${teamId}`, name: playerName }],
          },
        ],
      });
    importLeague(project.id, 'league-a', 'alpha League', 'team-a', 'Alpha United', 'Selected One');
    importLeague(project.id, 'league-b', 'Beta League', 'team-b', 'Beta City', 'Selected Two');
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-independent',
          name: 'Independent Alpha',
          sourceUrl: 'https://example.test/team-independent',
          players: [{ sourceId: 'player-independent', name: 'Independent Player' }],
        },
      ],
    });
    importLeague(
      otherProject.id,
      'league-other',
      'Other League',
      'team-other',
      'Other Team',
      'Other Player',
    );
    const list = (projectId: string, entity: 'leagues' | 'teams') =>
      database.listEntities({
        projectId,
        entity,
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows;
    const leagues = list(project.id, 'leagues');
    const teams = list(project.id, 'teams');
    const leagueA = leagues.find((league) => league.name === 'alpha League');
    const leagueB = leagues.find((league) => league.name === 'Beta League');
    const teamA = teams.find((team) => team.name === 'Alpha United');
    const teamB = teams.find((team) => team.name === 'Beta City');
    const otherTeam = list(otherProject.id, 'teams')[0];
    if (!leagueA || !leagueB || !teamA || !teamB) {
      throw new Error('Filter fixture missing.');
    }
    expect((teams as Team[]).map((team) => team.leagueName)).toEqual([
      'alpha League',
      'Beta League',
      undefined,
    ]);

    const teamsByLeague = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'leagueName',
      direction: 'desc',
    });
    expect(teamsByLeague.rows.map((team) => team.name)).toEqual([
      'Beta City',
      'Alpha United',
      'Independent Alpha',
    ]);

    const leaguePage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 1,
      search: '',
      sort: 'name',
      direction: 'asc',
      leagueIds: [leagueA.id, leagueB.id, leagueA.id],
    });
    expect(leaguePage.total).toBe(2);
    expect(leaguePage.rows).toHaveLength(1);

    const legacyLeaguePage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      leagueId: leagueA.id,
    });
    expect(legacyLeaguePage.rows.map((team) => team.name)).toEqual(['Alpha United']);

    const mixedPage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: 'Alpha',
      sort: 'name',
      direction: 'asc',
      leagueIds: [leagueA.id],
      includeTeamsWithoutLeague: true,
    });
    expect(mixedPage.rows.map((team) => team.name)).toEqual(['Alpha United', 'Independent Alpha']);

    const detachedPage = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      leagueIds: [],
      includeTeamsWithoutLeague: true,
    });
    expect(detachedPage.rows.map((team) => team.name)).toEqual(['Independent Alpha']);

    const playerPage = database.listEntities({
      projectId: project.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: 'Selected',
      sort: 'name',
      direction: 'asc',
      teamIds: [teamA.id, teamB.id, otherTeam.id, teamA.id],
    });
    expect(playerPage.rows.map((player) => player.name)).toEqual(['Selected One', 'Selected Two']);
    expect((playerPage.rows as Player[]).map((player) => player.teamName)).toEqual([
      'Alpha United',
      'Beta City',
    ]);
    expect((playerPage.rows as Player[]).map((player) => player.leagueName)).toEqual([
      'alpha League',
      'Beta League',
    ]);

    const playersByTeam = database.listEntities({
      projectId: project.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'teamName',
      direction: 'desc',
    });
    expect((playersByTeam.rows as Player[]).map((player) => player.teamName)).toEqual([
      'Independent Alpha',
      'Beta City',
      'Alpha United',
    ]);

    const playersByLeague = database.listEntities({
      projectId: project.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'leagueName',
      direction: 'desc',
    });
    expect(playersByLeague.rows.map((player) => player.name)).toEqual([
      'Selected Two',
      'Selected One',
      'Independent Player',
    ]);
    expect((playersByLeague.rows as Player[]).map((player) => player.leagueName)).toEqual([
      'Beta League',
      'alpha League',
      undefined,
    ]);

    const legacyPlayerPage = database.listEntities({
      projectId: project.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      teamId: teamB.id,
    });
    expect(legacyPlayerPage.rows.map((player) => player.name)).toEqual(['Selected Two']);

    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
        leagueIds: [],
      }).total,
    ).toBe(3);
    database.close();
  });

  test('lists project-scoped filter options and combines categorical entity filters', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Facets', referenceDate: '2026-01-01' });
    const otherProject = database.createProject({
      name: 'Other facets',
      referenceDate: '2026-07-01',
    });
    const importLeague = (
      projectId: string,
      leagueId: string,
      leagueName: string,
      season: string,
      teamId: string,
      teamName: string,
      players: CommitImportRequest['teams'][number]['players'],
    ) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: {
          sourceId: leagueId,
          name: leagueName,
          season,
          sourceUrl: `https://example.test/${leagueId}`,
        },
        teams: [
          {
            sourceId: teamId,
            name: teamName,
            season,
            sourceUrl: `https://example.test/${teamId}`,
            players,
          },
        ],
      });
    importLeague(project.id, 'league-z', 'Zulu League', '2025', 'team-b', 'Beta FC', [
      {
        sourceId: 'player-a',
        name: 'Attacker One',
        countryName: 'Senegal',
        countryCode2: 'SN',
        position: 'ATTACKER',
        positionDetail: 'ST',
        foot: 'RIGHT',
      },
      {
        sourceId: 'player-b',
        name: 'Defender One',
        countryName: 'Guinea',
        countryCode2: 'GN',
        position: 'DEFENDER',
        positionDetail: 'CB',
        foot: 'LEFT',
      },
    ]);
    importLeague(project.id, 'league-a', 'alpha League', '2026', 'team-a', 'Alpha FC', [
      {
        sourceId: 'player-c',
        name: 'Midfielder One',
        countryName: 'Senegal',
        countryCode2: 'SN',
        position: 'MIDFIELDER',
        positionDetail: 'CAM',
        foot: 'LEFT',
      },
    ]);
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'independent',
          name: 'Independent',
          season: '2024',
          sourceUrl: 'https://example.test/independent',
          players: [],
        },
      ],
    });
    importLeague(otherProject.id, 'other', 'Other League', '2030', 'other-team', 'Other FC', [
      {
        sourceId: 'other-player',
        name: 'Other Player',
        countryName: 'Portugal',
        countryCode2: 'PT',
        position: 'GOALKEEPER',
        positionDetail: 'GK',
        foot: 'RIGHT',
      },
    ]);

    expect(database.listEntityFilterOptions({ projectId: project.id, entity: 'leagues' })).toEqual({
      entity: 'leagues',
      sourceNames: ['transfermarkt'],
      countries: [],
      seasons: ['2025', '2026'],
      tiers: [],
      hasLeaguesWithoutTier: true,
      customBadges: [],
    });
    const teamOptions = database.listEntityFilterOptions({
      projectId: project.id,
      entity: 'teams',
    });
    expect(teamOptions).toMatchObject({
      entity: 'teams',
      hasTeamsWithoutLeague: true,
      seasons: ['2024', '2025', '2026'],
      leagues: [
        { sourceId: 'league-a', name: 'alpha League' },
        { sourceId: 'league-z', name: 'Zulu League' },
      ],
    });
    const playerOptions = database.listEntityFilterOptions({
      projectId: project.id,
      entity: 'players',
    });
    expect(playerOptions).toMatchObject({
      entity: 'players',
      teams: [{ name: 'Alpha FC' }, { name: 'Beta FC' }, { name: 'Independent' }],
      nationalities: [
        { name: 'Guinea', code: 'GN' },
        { name: 'Senegal', code: 'SN' },
      ],
      positions: ['DEFENDER', 'MIDFIELDER', 'ATTACKER'],
      positionDetails: ['CB', 'CAM', 'ST'],
      feet: ['LEFT', 'RIGHT'],
    });

    const leagueRows = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
      seasons: ['2026', '2026', ''],
    }).rows;
    expect(leagueRows.map((row) => row.name)).toEqual(['alpha League']);
    const betaTeam =
      playerOptions.entity === 'players'
        ? playerOptions.teams.find((team) => team.name === 'Beta FC')
        : undefined;
    const zuluLeague =
      teamOptions.entity === 'teams'
        ? teamOptions.leagues.find((league) => league.name === 'Zulu League')
        : undefined;
    if (!betaTeam || !zuluLeague) throw new Error('Filter option fixture missing.');
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'teams',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          leagueIds: [zuluLeague.id],
          seasons: ['2025'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Beta FC']);
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'players',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          teamIds: [betaTeam.id],
          nationalities: ['senegal', 'Guinea'],
          positions: ['ATTACKER'],
          positionDetails: ['ST'],
          feet: ['RIGHT'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Attacker One']);
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'players',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          positions: ['DEFENDER', 'ATTACKER'],
          positionDetails: ['CB', 'ST'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Attacker One', 'Defender One']);
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'players',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'positionDetail',
          direction: 'asc',
        })
        .rows.map((row) => row.name),
    ).toEqual(['Midfielder One', 'Defender One', 'Attacker One']);
    expect(
      database.listEntityFilterOptions({ projectId: otherProject.id, entity: 'players' }),
    ).toMatchObject({
      nationalities: [{ name: 'Portugal', code: 'PT' }],
      positions: ['GOALKEEPER'],
      positionDetails: ['GK'],
    });
    database.close();
  });

  test('lists and combines project-scoped league country filters', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Countries', referenceDate: '2026-01-01' });
    const otherProject = database.createProject({
      name: 'Other countries',
      referenceDate: '2026-07-01',
    });
    const importLeague = (
      projectId: string,
      sourceId: string,
      name: string,
      season: string,
    ): void => {
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId,
          name,
          season,
          sourceUrl: `https://example.test/${sourceId}`,
        },
        teams: [
          {
            sourceId: `${sourceId}-team`,
            name: `${name} Team`,
            season,
            sourceUrl: `https://example.test/${sourceId}-team`,
            players: [],
          },
        ],
      });
    };
    importLeague(project.id, 'league-a', 'Alpha League', '2026');
    importLeague(project.id, 'league-b', 'Championship', '2025');
    importLeague(project.id, 'league-c', 'Scottish League', '2026');
    importLeague(project.id, 'league-d', 'Unassigned League', '2026');
    importLeague(otherProject.id, 'league-e', 'Other League', '2026');

    const updateCountry = (projectId: string, sourceId: string, countryCode3: string): void => {
      const league = database
        .listEntities({
          projectId,
          entity: 'leagues',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
        })
        .rows.find((row) => row.sourceId === sourceId);
      if (!league || !('season' in league)) throw new Error(`League ${sourceId} is missing.`);
      database.updateEntityMetadata({
        projectId,
        entity: 'leagues',
        id: league.id,
        name: league.name,
        sourceId: league.sourceId,
        countryCode3,
        season: league.season,
      });
    };
    updateCountry(project.id, 'league-a', 'ENG');
    updateCountry(project.id, 'league-b', 'ENG');
    updateCountry(project.id, 'league-c', 'SCO');
    updateCountry(otherProject.id, 'league-e', 'PRT');
    const alphaLeague = database
      .listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      })
      .rows.find(({ sourceId }) => sourceId === 'league-a');
    if (!alphaLeague) throw new Error('Alpha League is missing.');
    database.updateLeagueTiers({
      projectId: project.id,
      ids: [alphaLeague.id],
      tier: 2,
    });

    expect(database.listEntityFilterOptions({ projectId: project.id, entity: 'leagues' })).toEqual({
      entity: 'leagues',
      sourceNames: ['transfermarkt'],
      countries: [
        { name: 'England', code: 'GB-ENG' },
        { name: 'Scotland', code: 'GB-SCT' },
      ],
      seasons: ['2025', '2026'],
      tiers: [2],
      hasLeaguesWithoutTier: true,
      customBadges: [],
    });
    const teamFilterOptions = database.listEntityFilterOptions({
      projectId: project.id,
      entity: 'teams',
    });
    if (teamFilterOptions.entity !== 'teams') throw new Error('Team filter options are missing.');
    expect(
      teamFilterOptions.leagues.map(({ name, countryName, countryCode, tier }) => ({
        name,
        countryName,
        countryCode,
        tier,
      })),
    ).toEqual([
      { name: 'Alpha League', countryName: 'England', countryCode: 'GB-ENG', tier: 2 },
      {
        name: 'Championship',
        countryName: 'England',
        countryCode: 'GB-ENG',
        tier: undefined,
      },
      {
        name: 'Scottish League',
        countryName: 'Scotland',
        countryCode: 'GB-SCT',
        tier: undefined,
      },
      {
        name: 'Unassigned League',
        countryName: undefined,
        countryCode: undefined,
        tier: undefined,
      },
    ]);
    expect(
      database.listEntityFilterOptions({ projectId: otherProject.id, entity: 'leagues' }),
    ).toMatchObject({
      countries: [{ name: 'Portugal', code: 'PT' }],
    });
    const otherTeamFilterOptions = database.listEntityFilterOptions({
      projectId: otherProject.id,
      entity: 'teams',
    });
    if (otherTeamFilterOptions.entity !== 'teams') {
      throw new Error('Other team filter options are missing.');
    }
    expect(otherTeamFilterOptions.leagues).toHaveLength(1);
    expect(otherTeamFilterOptions.leagues[0]).toMatchObject({
      name: 'Other League',
      countryName: 'Portugal',
      countryCode: 'PT',
    });
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'leagues',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          sourceNames: ['transfermarkt'],
          seasons: ['2026'],
          countries: ['england', 'SCOTLAND'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Alpha League', 'Scottish League']);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).total,
    ).toBe(4);
    database.close();
  });

  test('lists and combines project-scoped team country filters', () => {
    const database = createDatabase();
    const project = database.createProject({
      name: 'Team countries',
      referenceDate: '2026-01-01',
    });
    const otherProject = database.createProject({
      name: 'Other team countries',
      referenceDate: '2026-07-01',
    });
    const importLeague = (
      projectId: string,
      sourceId: string,
      leagueName: string,
      season: string,
      teamName: string,
    ): void => {
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt',
        operation: mergeOperation(),
        league: {
          sourceId,
          name: leagueName,
          season,
          sourceUrl: `https://example.test/${sourceId}`,
        },
        teams: [
          {
            sourceId: `${sourceId}-team`,
            name: teamName,
            season,
            sourceUrl: `https://example.test/${sourceId}-team`,
            players: [],
          },
        ],
      });
    };
    importLeague(project.id, 'league-a', 'Alpha League', '2026', 'Alpha FC');
    importLeague(project.id, 'league-b', 'Beta League', '2025', 'Beta FC');
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'independent',
          name: 'Independent FC',
          season: '2026',
          sourceUrl: 'https://example.test/independent',
          players: [],
        },
      ],
    });
    database.commitImport({
      projectId: otherProject.id,
      sourceName: 'transfermarkt',
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'other-team',
          name: 'Other FC',
          season: '2026',
          sourceUrl: 'https://example.test/other-team',
          players: [],
        },
      ],
    });

    const listTeams = (projectId: string) =>
      database.listEntities({
        projectId,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows;
    const updateCountry = (projectId: string, sourceId: string, countryCode3: string): void => {
      const team = listTeams(projectId).find((row) => row.sourceId === sourceId);
      if (!team) throw new Error(`Team ${sourceId} is missing.`);
      database.updateEntityMetadata({
        projectId,
        entity: 'teams',
        id: team.id,
        name: team.name,
        sourceId: team.sourceId,
        countryCode3,
        season: 'season' in team ? team.season : undefined,
        leagueId: 'leagueId' in team ? team.leagueId : undefined,
      });
    };
    updateCountry(project.id, 'league-a-team', 'ENG');
    updateCountry(project.id, 'league-b-team', 'SCO');
    updateCountry(project.id, 'independent', 'ENG');
    updateCountry(otherProject.id, 'other-team', 'PRT');

    expect(
      database.listEntityFilterOptions({ projectId: project.id, entity: 'teams' }),
    ).toMatchObject({
      countries: [
        { name: 'England', code: 'GB-ENG' },
        { name: 'Scotland', code: 'GB-SCT' },
      ],
    });
    expect(
      database.listEntityFilterOptions({ projectId: otherProject.id, entity: 'teams' }),
    ).toMatchObject({
      countries: [{ name: 'Portugal', code: 'PT' }],
    });
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'teams',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          countries: ['england', 'SCOTLAND'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Alpha FC', 'Beta FC', 'Independent FC']);

    const teamOptions = database.listEntityFilterOptions({
      projectId: project.id,
      entity: 'teams',
    });
    if (teamOptions.entity !== 'teams') throw new Error('Team options are missing.');
    const leagueA = teamOptions.leagues.find(({ sourceId }) => sourceId === 'league-a');
    if (!leagueA) throw new Error('League A is missing.');
    expect(
      database
        .listEntities({
          projectId: project.id,
          entity: 'teams',
          pageIndex: 0,
          pageSize: 25,
          search: '',
          sort: 'name',
          direction: 'asc',
          sourceNames: ['transfermarkt'],
          leagueIds: [leagueA.id],
          includeTeamsWithoutLeague: true,
          seasons: ['2026'],
          countries: ['England'],
        })
        .rows.map((row) => row.name),
    ).toEqual(['Alpha FC', 'Independent FC']);
    database.close();
  });
});
