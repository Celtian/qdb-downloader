import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import type { CommitImportRequest } from '../shared/contracts.js';
import { SnapshotDatabase } from './database.js';
import { ApplicationError } from './errors.js';

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
  test('rolls back every row when an import fails', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });

    expect(() =>
      database.commitImport({
        projectId: project.id,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        teams: [
          {
            sourceId: 'valid',
            name: 'Valid team',
            sourceUrl: 'https://example.test/valid',
            players: [{ name: 'Valid player' }],
          },
          {
            sourceId: 'invalid',
            name: '',
            sourceUrl: 'https://example.test/invalid',
            players: [{ name: 'Never committed' }],
          },
        ],
      }),
    ).toThrow();
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 0, playerCount: 0 });
    database.close();
  });

  test('previews and commits an authoritative league synchronization', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    const leagueUrl = 'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1';
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'Premier League', sourceUrl: leagueUrl },
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://example.test/281',
          players: [
            { sourceId: '1', name: 'Existing player' },
            { sourceId: '2', name: 'Removed player' },
          ],
        },
        {
          sourceId: '985',
          name: 'Removed team',
          sourceUrl: 'https://example.test/985',
          players: [{ sourceId: '3', name: 'Removed with team' }],
        },
      ],
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: {
        sourceId: 'ES1',
        name: 'Unrelated league',
        sourceUrl: 'https://example.test/ES1',
      },
      teams: [
        {
          sourceId: '999',
          name: 'Unrelated team',
          sourceUrl: 'https://example.test/999',
          players: [{ sourceId: '9', name: 'Unrelated player' }],
        },
      ],
    });
    const leagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: 'Premier',
      sort: 'name',
      direction: 'asc',
    });
    const target = leagues.rows[0];
    const request = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: target.id },
        options: {
          absentTeams: 'delete' as const,
          absentPlayers: 'delete' as const,
          overrideTeamNames: true,
          overridePlayerNames: true,
          teamLeagueConflicts: 'move' as const,
          playerTeamConflicts: 'move' as const,
        },
      },
      league: { sourceId: 'GB1', name: 'Premier League', sourceUrl: leagueUrl },
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City updated',
          sourceUrl: 'https://example.test/281',
          players: [
            { sourceId: '1', name: 'Existing player updated' },
            { sourceId: '4', name: 'New player' },
          ],
        },
        {
          sourceId: '777',
          name: 'New team',
          sourceUrl: 'https://example.test/777',
          players: [{ sourceId: '7', name: 'New team player' }],
        },
      ],
    };

    const expectedChanges = {
      leagues: { added: 0, updated: 1, preserved: 0, deleted: 0 },
      teams: { added: 1, updated: 1, preserved: 0, moved: 0, detached: 0, deleted: 1 },
      players: {
        added: 2,
        updated: 1,
        preserved: 0,
        moved: 0,
        deduplicated: 0,
        deleted: 2,
      },
    };
    expect(database.previewImportChanges(request).changes).toEqual(expectedChanges);
    expect(database.commitImport(request).changes).toEqual(expectedChanges);
    expect(database.getProjectSummary(project.id)).toMatchObject({
      leagueCount: 2,
      teamCount: 3,
      playerCount: 4,
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Manchester City updated' }),
        expect.objectContaining({ name: 'New team' }),
        expect.objectContaining({ name: 'Unrelated team' }),
      ]),
    );
    database.close();
  });

  test('synchronizes a team to an empty squad without deleting the team', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Removed player' }],
        },
      ],
    });
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const request = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'teams' as const, id: team.id },
        options: {
          absentPlayers: 'delete' as const,
          overridePlayerNames: true,
          playerTeamConflicts: 'move' as const,
        },
      },
      teams: [
        {
          sourceId: '281',
          name: 'Manchester City refreshed',
          sourceUrl: 'https://example.test/281',
          players: [],
        },
      ],
    };

    expect(database.commitImport(request).changes.players.deleted).toBe(1);
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 1, playerCount: 0 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({ name: 'Manchester City', playerCount: 0 });
    database.close();
  });

  test('keeps absent records and preserves existing names while refreshing other metadata', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: {
        sourceId: 'GB1',
        name: 'Stored league',
        sourceUrl: 'https://example.test/GB1',
      },
      teams: [
        {
          sourceId: '281',
          name: 'Stored team',
          sourceUrl: 'https://example.test/281',
          players: [
            {
              sourceId: '1',
              name: 'Stored Player',
              firstName: 'Stored',
              lastName: 'Player',
              jerseyNumber: 7,
            },
            { sourceId: '2', name: 'Absent Player' },
          ],
        },
        {
          sourceId: '985',
          name: 'Absent team',
          sourceUrl: 'https://example.test/985',
          players: [{ sourceId: '3', name: 'Absent team player' }],
        },
      ],
    });
    const league = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const teamsBefore = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const storedTeam = teamsBefore.find((team) => team.sourceId === '281');
    if (!storedTeam) throw new Error('Stored team fixture missing.');
    const playersBefore = database.listEntities({
      projectId: project.id,
      entity: 'players',
      teamIds: [storedTeam.id],
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const storedPlayer = playersBefore.find((player) => player.sourceId === '1');
    if (!storedPlayer) throw new Error('Stored player fixture missing.');
    const request = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: league.id },
        options: {
          absentTeams: 'keep' as const,
          absentPlayers: 'keep' as const,
          overrideTeamNames: false,
          overridePlayerNames: false,
          teamLeagueConflicts: 'move' as const,
          playerTeamConflicts: 'move' as const,
        },
      },
      league: {
        sourceId: 'GB1',
        name: 'Scraped league',
        sourceUrl: 'https://example.test/GB1-refreshed',
      },
      teams: [
        {
          sourceId: '281',
          name: 'Scraped team',
          sourceUrl: 'https://example.test/281-refreshed',
          players: [
            {
              sourceId: '1',
              name: 'Scraped Name',
              firstName: 'Scraped',
              lastName: 'Name',
              jerseyNumber: 10,
              position: 'ATTACKER' as const,
            },
          ],
        },
      ],
    };

    const expectedChanges = {
      leagues: { added: 0, updated: 1, preserved: 0, deleted: 0 },
      teams: { added: 0, updated: 1, preserved: 0, moved: 0, detached: 0, deleted: 0 },
      players: {
        added: 0,
        updated: 1,
        preserved: 0,
        moved: 0,
        deduplicated: 0,
        deleted: 0,
      },
    };
    expect(database.previewImportChanges(request).changes).toEqual(expectedChanges);
    expect(database.commitImport(request).changes).toEqual(expectedChanges);
    expect(
      database.getEntity({ projectId: project.id, entity: 'leagues', id: league.id }),
    ).toMatchObject({ name: 'Stored league', teamCount: 2 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: storedTeam.id }),
    ).toMatchObject({
      id: storedTeam.id,
      name: 'Stored team',
      leagueId: league.id,
      playerCount: 2,
    });
    const playersAfter = database.listEntities({
      projectId: project.id,
      entity: 'players',
      teamIds: [storedTeam.id],
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    expect(playersAfter).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: storedPlayer.id,
          name: 'Stored Player',
          firstName: 'Stored',
          lastName: 'Player',
          jerseyNumber: 10,
          position: 'ATTACKER',
        }),
        expect.objectContaining({ name: 'Absent Player' }),
      ]),
    );

    request.operation.options.overrideTeamNames = true;
    request.operation.options.overridePlayerNames = true;
    database.commitImport(request);
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: storedTeam.id }),
    ).toMatchObject({ id: storedTeam.id, name: 'Scraped team' });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        teamIds: [storedTeam.id],
        pageIndex: 0,
        pageSize: 25,
        search: 'Scraped',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      id: storedPlayer.id,
      name: 'Scraped Name',
      firstName: 'Scraped',
      lastName: 'Name',
    });
    database.close();
  });

  test('detaches absent teams while preserving their squads', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'League', sourceUrl: 'https://example.test/GB1' },
      teams: [
        {
          sourceId: '281',
          name: 'Detached team',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Preserved player' }],
        },
      ],
    });
    const league = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const request = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize' as const,
        target: { entity: 'leagues' as const, id: league.id },
        options: {
          absentTeams: 'detach' as const,
          absentPlayers: 'delete' as const,
          overrideTeamNames: false,
          overridePlayerNames: false,
          teamLeagueConflicts: 'move' as const,
          playerTeamConflicts: 'move' as const,
        },
      },
      league: { sourceId: 'GB1', name: 'League', sourceUrl: 'https://example.test/GB1' },
      teams: [],
    };

    expect(database.previewImportChanges(request).changes).toEqual({
      leagues: { added: 0, updated: 1, preserved: 0, deleted: 0 },
      teams: { added: 0, updated: 0, preserved: 0, moved: 0, detached: 1, deleted: 0 },
      players: {
        added: 0,
        updated: 0,
        preserved: 0,
        moved: 0,
        deduplicated: 0,
        deleted: 0,
      },
    });
    expect(database.commitImport(request).changes.teams.detached).toBe(1);
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 1, playerCount: 1 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({ leagueId: undefined, playerCount: 1 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'leagues', id: league.id }),
    ).toMatchObject({ teamCount: 0 });
    database.close();
  });

  test('rolls back all synchronized updates and deletions when one row fails', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'Premier League', sourceUrl: 'https://example.test/GB1' },
      teams: [
        {
          sourceId: '281',
          name: 'Original team',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Original player' }],
        },
        {
          sourceId: '985',
          name: 'Team that must survive rollback',
          sourceUrl: 'https://example.test/985',
          players: [{ sourceId: '2', name: 'Second player' }],
        },
      ],
    });
    const league = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];

    expect(() =>
      database.commitImport({
        projectId: project.id,
        sourceName: 'transfermarkt' as const,
        operation: {
          kind: 'synchronize',
          target: { entity: 'leagues', id: league.id },
          options: {
            absentTeams: 'delete',
            absentPlayers: 'delete',
            overrideTeamNames: true,
            overridePlayerNames: true,
            teamLeagueConflicts: 'move',
            playerTeamConflicts: 'move',
          },
        },
        league: {
          sourceId: 'GB1',
          name: 'Premier League changed',
          sourceUrl: 'https://example.test/GB1',
        },
        teams: [
          {
            sourceId: '281',
            name: 'Changed before failure',
            sourceUrl: 'https://example.test/281',
            players: [],
          },
          {
            sourceId: 'invalid',
            name: '',
            sourceUrl: 'https://example.test/invalid',
            players: [],
          },
        ],
      }),
    ).toThrow();
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 2, playerCount: 2 });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Original team' }),
        expect.objectContaining({ name: 'Team that must survive rollback' }),
      ]),
    );
    database.close();
  });

  test('rejects invalid synchronization policies without changing stored data', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: '281',
          name: 'Stored team',
          sourceUrl: 'https://example.test/281',
          players: [{ sourceId: '1', name: 'Stored player' }],
        },
      ],
    });
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    const request = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize',
        target: { entity: 'teams', id: team.id },
        options: {
          absentPlayers: 'archive',
          overridePlayerNames: false,
          playerTeamConflicts: 'move',
        },
      },
      teams: [
        {
          sourceId: '281',
          name: 'Changed team',
          sourceUrl: 'https://example.test/281-changed',
          players: [],
        },
      ],
    } as unknown as CommitImportRequest;

    expect(() => database.previewImportChanges(request)).toThrow(ApplicationError);
    expect(() => database.commitImport(request)).toThrow(ApplicationError);
    expect(database.getProjectSummary(project.id)).toMatchObject({ teamCount: 1, playerCount: 1 });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({ name: 'Stored team', playerCount: 1 });
    database.close();
  });

  test('edits source identity and team relationships with project-scoped validation', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    const otherProject = database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });
    const importLeague = (projectId: string, sourceId: string, name: string) =>
      database.commitImport({
        projectId,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: { sourceId, name, sourceUrl: `https://example.test/${sourceId}` },
        teams: [
          {
            sourceId: `${sourceId}-team`,
            name: `${name} team`,
            sourceUrl: `https://example.test/${sourceId}-team`,
            players: [],
          },
        ],
      });
    importLeague(project.id, 'GB1', 'Premier League');
    importLeague(project.id, 'GB2', 'Championship');
    importLeague(otherProject.id, 'DE1', 'Bundesliga');
    database.commitImport({
      projectId: project.id,
      sourceName: 'soccerway',
      operation: mergeOperation(),
      league: {
        sourceId: 'czech-republic/chance-liga/standings/bNFMkskm',
        name: 'Chance Liga',
        sourceUrl: 'https://example.test/chance-liga',
      },
      teams: [
        {
          sourceId: 'slavia-prague/viXGgnyB',
          name: 'Slavia Prague',
          sourceUrl: 'https://example.test/slavia-prague',
          players: [],
        },
      ],
    });
    const projectLeagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const premier = projectLeagues.find((league) => league.sourceId === 'GB1');
    const championship = projectLeagues.find((league) => league.sourceId === 'GB2');
    const chanceLiga = projectLeagues.find((league) => league.sourceName === 'soccerway');
    const bundesliga = database.listEntities({
      projectId: otherProject.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    if (!premier || !championship || !chanceLiga) throw new Error('League fixtures missing.');
    const updatedLeague = database.updateEntityMetadata({
      projectId: project.id,
      entity: 'leagues',
      id: premier.id,
      name: 'Premier League renamed',
      countryCode3: 'ENG',
      sourceId: 'GBX',
      season: '2026',
    });
    expect(updatedLeague).toMatchObject({
      id: premier.id,
      sourceId: 'GBX',
      countryName: 'England',
      countryCode2: 'GB',
      countryCode3: 'ENG',
      season: '2026',
      sourceUrl: 'https://www.transfermarkt.com/slug/startseite/wettbewerb/GBX/plus?saison_id=2026',
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: 'England',
        sort: 'leagueCountry',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ id: premier.id, countryCode3: 'ENG' })]);
    expect(() =>
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'leagues',
        id: premier.id,
        name: 'Invalid country',
        countryCode3: 'XXX',
        sourceId: 'GBX',
        season: '2026',
      }),
    ).toThrow('Choose a valid country or leave it empty.');
    const team = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: 'Premier',
      sort: 'name',
      direction: 'asc',
    }).rows[0];
    expect(
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: team.id,
        name: 'Moved team',
        countryCode3: 'CZE',
        sourceId: 'moved-team',
        season: '2026',
        leagueId: championship.id,
      }),
    ).toMatchObject({
      id: team.id,
      leagueId: championship.id,
      sourceId: 'moved-team',
      countryName: 'Czech Republic',
      countryCode2: 'CZ',
      countryCode3: 'CZE',
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'teams',
        pageIndex: 0,
        pageSize: 25,
        search: 'Czech Republic',
        sort: 'teamCountry',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ id: team.id, countryCode3: 'CZE' })]);
    expect(() =>
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: team.id,
        name: 'Invalid country',
        countryCode3: 'XXX',
        sourceId: 'moved-team',
        season: '2026',
        leagueId: championship.id,
      }),
    ).toThrow('Choose a valid country or leave it empty.');
    expect(() =>
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: team.id,
        name: 'Invalid move',
        sourceId: 'moved-team',
        season: '2026',
        leagueId: bundesliga.id,
      }),
    ).toThrow(ApplicationError);
    expect(() =>
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: team.id,
        name: 'Invalid cross-source move',
        sourceId: 'moved-team',
        season: '2026',
        leagueId: chanceLiga.id,
      }),
    ).toThrow('A team can only belong to a league from the same provider.');
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({
      name: 'Moved team',
      sourceId: 'moved-team',
      leagueId: championship.id,
      countryCode3: 'CZE',
    });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt',
      operation: {
        kind: 'synchronize',
        target: { entity: 'teams', id: team.id },
        options: {
          absentPlayers: 'keep',
          overridePlayerNames: false,
          playerTeamConflicts: 'move',
        },
      },
      teams: [
        {
          sourceId: 'moved-team',
          name: 'Incoming team name',
          season: '2026',
          sourceUrl: 'https://example.test/team',
          players: [],
        },
      ],
    });
    expect(
      database.getEntity({ projectId: project.id, entity: 'teams', id: team.id }),
    ).toMatchObject({ countryCode3: 'CZE' });
    expect(
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'teams',
        id: team.id,
        name: 'Unassigned team',
        sourceId: 'moved-team',
        season: '2026',
      }),
    ).toMatchObject({ id: team.id, leagueId: undefined, countryCode3: undefined });
    expect(() =>
      database.updateEntityMetadata({
        projectId: project.id,
        entity: 'leagues',
        id: premier.id,
        name: 'Duplicate',
        sourceId: 'GB2',
      }),
    ).toThrow(ApplicationError);
    database.close();
  });

  test('previews and applies global keep or refresh policies for matching records', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Conflicts', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      league: { sourceId: 'GB1', name: 'Stored league', sourceUrl: 'https://old.test/league' },
      teams: [
        {
          sourceId: '281',
          name: 'Stored team',
          sourceUrl: 'https://old.test/team',
          players: [
            {
              sourceId: '10',
              name: 'Stored player',
              position: 'DEFENDER',
              positionDetail: 'CB',
            },
          ],
        },
      ],
    });
    const request: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'keep',
          teamLeagueConflicts: 'move',
          playerTeamConflicts: 'move',
        },
      },
      league: { sourceId: 'GB1', name: 'Fresh league', sourceUrl: 'https://new.test/league' },
      teams: [
        {
          sourceId: '281',
          name: 'Fresh team',
          sourceUrl: 'https://new.test/team',
          players: [
            {
              sourceId: '10',
              name: 'Fresh player',
              position: 'ATTACKER',
              positionDetail: 'ST',
            },
          ],
        },
      ],
    };

    const preview = database.previewImportChanges(request);
    expect(preview.conflicts.existingRecords).toHaveLength(3);
    expect(preview.changes).toMatchObject({
      leagues: { preserved: 1 },
      teams: { preserved: 1 },
      players: { preserved: 1 },
    });
    database.commitImport(request);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      name: 'Stored league',
      sourceUrl: 'https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1',
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({ name: 'Stored player', position: 'DEFENDER', positionDetail: 'CB' });

    if (request.operation.kind !== 'merge') throw new Error('Expected merge operation.');
    request.operation.options.existingRecords = 'refresh';
    database.commitImport(request);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'leagues',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({
      name: 'Fresh league',
      sourceUrl: 'https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1',
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows[0],
    ).toMatchObject({ name: 'Fresh player', position: 'ATTACKER', positionDetail: 'ST' });
    database.close();
  });

  test('keeps or moves team and player ownership without creating player copies', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Ownership', referenceDate: '2026-01-01' });
    const importLeague = (leagueId: string, teamId: string, playerId?: string) =>
      database.commitImport({
        projectId: project.id,
        sourceName: 'transfermarkt' as const,
        operation: mergeOperation(),
        league: { sourceId: leagueId, name: `League ${leagueId}`, sourceUrl: leagueId },
        teams: [
          {
            sourceId: teamId,
            name: `Team ${teamId}`,
            sourceUrl: teamId,
            players: playerId ? [{ sourceId: playerId, name: 'Shared player' }] : [],
          },
        ],
      });
    importLeague('A', 'team-a', 'player');
    importLeague('B', 'team-b');
    const leagues = database.listEntities({
      projectId: project.id,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const leagueA = leagues.find((league) => league.sourceId === 'A');
    const leagueB = leagues.find((league) => league.sourceId === 'B');
    if (!leagueA || !leagueB) throw new Error('Expected test leagues.');
    const teamMove: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'refresh',
          teamLeagueConflicts: 'keep',
          playerTeamConflicts: 'move',
        },
      },
      league: { sourceId: 'B', name: 'League B', sourceUrl: 'B' },
      teams: [{ sourceId: 'team-a', name: 'Team A', sourceUrl: 'team-a', players: [] }],
    };
    expect(database.previewImportChanges(teamMove).conflicts.teamLeagueConflicts).toHaveLength(1);
    database.commitImport(teamMove);
    const findTeam = (sourceId: string) =>
      database
        .listEntities({
          projectId: project.id,
          entity: 'teams',
          pageIndex: 0,
          pageSize: 25,
          search: sourceId,
          sort: 'name',
          direction: 'asc',
        })
        .rows.find((team) => team.sourceId === sourceId);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueA.id });
    if (teamMove.operation.kind !== 'merge') throw new Error('Expected merge operation.');
    teamMove.operation.options.teamLeagueConflicts = 'move';
    database.commitImport(teamMove);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueB.id });

    const playerMove: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'refresh',
          teamLeagueConflicts: 'move',
          playerTeamConflicts: 'keep',
        },
      },
      teams: [
        {
          sourceId: 'team-b',
          name: 'Team B',
          sourceUrl: 'team-b',
          players: [{ sourceId: 'player', name: 'Shared player' }],
        },
      ],
    };
    expect(database.previewImportChanges(playerMove).conflicts.playerTeamConflicts).toHaveLength(1);
    database.commitImport(playerMove);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ teamId: findTeam('team-a')?.id })]);
    playerMove.operation.options.playerTeamConflicts = 'move';
    database.commitImport(playerMove);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ teamId: findTeam('team-b')?.id })]);

    const leagueSync: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize',
        target: { entity: 'leagues', id: leagueA.id },
        options: {
          absentTeams: 'keep',
          absentPlayers: 'keep',
          overrideTeamNames: false,
          overridePlayerNames: false,
          teamLeagueConflicts: 'keep',
          playerTeamConflicts: 'keep',
        },
      },
      league: { sourceId: 'A', name: 'League A', sourceUrl: 'A' },
      teams: [{ sourceId: 'team-a', name: 'Team A', sourceUrl: 'team-a', players: [] }],
    };
    expect(database.previewImportChanges(leagueSync).conflicts.teamLeagueConflicts).toHaveLength(1);
    database.commitImport(leagueSync);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueB.id });
    if (
      leagueSync.operation.kind !== 'synchronize' ||
      !('teamLeagueConflicts' in leagueSync.operation.options)
    ) {
      throw new Error('Expected league synchronization.');
    }
    leagueSync.operation.options.teamLeagueConflicts = 'move';
    database.commitImport(leagueSync);
    expect(findTeam('team-a')).toMatchObject({ leagueId: leagueA.id });

    const teamA = findTeam('team-a');
    if (!teamA) throw new Error('Expected team A.');
    const teamSync: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'synchronize',
        target: { entity: 'teams', id: teamA.id },
        options: {
          absentPlayers: 'keep',
          overridePlayerNames: false,
          playerTeamConflicts: 'keep',
        },
      },
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'player', name: 'Shared player' }],
        },
      ],
    };
    expect(database.previewImportChanges(teamSync).conflicts.playerTeamConflicts).toHaveLength(1);
    database.commitImport(teamSync);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ teamId: findTeam('team-b')?.id })]);
    teamSync.operation.options.playerTeamConflicts = 'move';
    database.commitImport(teamSync);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ teamId: teamA.id })]);
    database.close();
  });

  test('consolidates legacy player copies on import and rejects ambiguous incoming squads', () => {
    const database = createDatabase();
    const project = database.createProject({ name: 'Legacy copies', referenceDate: '2026-01-01' });
    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'player', name: 'Older copy' }],
        },
        { sourceId: 'team-b', name: 'Team B', sourceUrl: 'team-b', players: [] },
      ],
    });
    const teams = database.listEntities({
      projectId: project.id,
      entity: 'teams',
      pageIndex: 0,
      pageSize: 25,
      search: '',
      sort: 'name',
      direction: 'asc',
    }).rows;
    const teamA = teams.find((team) => team.sourceId === 'team-a');
    const teamB = teams.find((team) => team.sourceId === 'team-b');
    if (!teamA || !teamB) throw new Error('Expected test teams.');
    const sqlite = (
      database as unknown as {
        database: {
          prepare(sql: string): { run(values: Record<string, string>): unknown };
        };
      }
    ).database;
    sqlite
      .prepare(
        `INSERT INTO players(
           id, project_id, team_id, source_name, source_id, name, created_at, updated_at
         )
         VALUES (
           $id, $projectId, $teamId, 'transfermarkt', $sourceId, $name, $createdAt, $updatedAt
         )`,
      )
      .run({
        id: 'legacy-copy',
        projectId: project.id,
        teamId: teamB.id,
        sourceId: 'player',
        name: 'Newest legacy copy',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2099-01-01T00:00:00.000Z',
      });
    const request: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: {
        kind: 'merge',
        options: {
          existingRecords: 'keep',
          teamLeagueConflicts: 'keep',
          playerTeamConflicts: 'keep',
        },
      },
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'player', name: 'Incoming player' }],
        },
      ],
    };
    const preview = database.previewImportChanges(request);
    expect(preview.conflicts.playerTeamConflicts[0]).toMatchObject({ legacyCopyCount: 2 });
    expect(preview.changes.players).toMatchObject({ moved: 1, deduplicated: 1 });
    database.commitImport(request);
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: '',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toEqual([expect.objectContaining({ name: 'Newest legacy copy', teamId: teamA.id })]);

    database.commitImport({
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ name: 'Unknown identity' }],
        },
        {
          sourceId: 'team-b',
          name: 'Team B',
          sourceUrl: 'team-b',
          players: [{ name: 'Unknown identity' }],
        },
      ],
    });
    expect(
      database.listEntities({
        projectId: project.id,
        entity: 'players',
        pageIndex: 0,
        pageSize: 25,
        search: 'Unknown identity',
        sort: 'name',
        direction: 'asc',
      }).rows,
    ).toHaveLength(2);

    const duplicateRequest: CommitImportRequest = {
      projectId: project.id,
      sourceName: 'transfermarkt' as const,
      operation: mergeOperation(),
      teams: [
        {
          sourceId: 'team-a',
          name: 'Team A',
          sourceUrl: 'team-a',
          players: [{ sourceId: 'duplicate', name: 'Duplicate player' }],
        },
        {
          sourceId: 'team-b',
          name: 'Team B',
          sourceUrl: 'team-b',
          players: [{ sourceId: 'duplicate', name: 'Duplicate player' }],
        },
      ],
    };
    expect(() => database.previewImportChanges(duplicateRequest)).toThrow(
      /selected for multiple teams/,
    );
    database.close();
  });
});
