import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ExportFormat, League, Player, Project, Team } from '../shared/contracts.js';
import type { SnapshotDatabase } from './database.js';
import { SnapshotExportWriter } from './export-writer.js';

const now = '2026-01-01T00:00:00.000Z';
const project: Project = {
  id: 'project',
  name: 'Winter snapshot',
  referenceDate: '2026-01-01',
  createdAt: now,
  updatedAt: now,
};
const leagues: League[] = [
  {
    id: 'league-1',
    projectId: project.id,
    sourceName: 'transfermarkt',
    sourceId: 'GB1',
    name: 'Premier League',
    countryName: 'England',
    countryCode2: 'GB',
    countryCode3: 'ENG',
    sourceUrl: 'https://example.test/GB1',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'league-2',
    projectId: project.id,
    sourceName: 'transfermarkt',
    sourceId: 'GB2',
    name: 'Championship',
    sourceUrl: 'https://example.test/GB2',
    createdAt: now,
    updatedAt: now,
  },
];
const teams: Team[] = leagues.map((league, index) => ({
  id: `team-${index + 1}`,
  projectId: project.id,
  leagueId: league.id,
  sourceName: 'transfermarkt',
  sourceId: String(index + 1),
  name: `Team ${index + 1}`,
  sourceUrl: `https://example.test/team-${index + 1}`,
  createdAt: now,
  updatedAt: now,
}));
teams.push({
  id: 'team-unassigned',
  projectId: project.id,
  sourceName: 'transfermarkt',
  sourceId: 'unassigned',
  name: 'Unassigned Team',
  sourceUrl: 'https://example.test/team-unassigned',
  createdAt: now,
  updatedAt: now,
});
const players: Player[] = teams.map((team, index) => ({
  id: `player-${index + 1}`,
  projectId: project.id,
  teamId: team.id,
  sourceName: 'transfermarkt',
  sourceId: `player-${index + 1}`,
  name: `Player ${index + 1}`,
  positionDetail: index === 0 ? 'ST' : undefined,
  createdAt: now,
  updatedAt: now,
}));

describe('SnapshotExportWriter', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
  });

  test('exports only selected leagues and columns', async () => {
    const destination = await mkdtemp(join(tmpdir(), 'qdb-export-test-'));
    directories.push(destination);
    const database = {
      exportRows: vi.fn(() => ({ leagues, teams, players })),
    } as unknown as SnapshotDatabase;
    const writer = new SnapshotExportWriter(database);

    const result = await writer.write(project, {
      projectId: project.id,
      format: 'json',
      destination,
      includeTeamsWithoutLeague: true,
      leagueIds: ['league-1'],
      columns: {
        leagues: ['name', 'countryName', 'countryCode3'],
        teams: ['name'],
        players: ['name', 'positionDetail'],
      },
    });
    const files = new Map(result.files.map((file) => [file.split('/').at(-1), file]));
    const leagueRows = JSON.parse(
      await readFile(files.get('leagues.json') ?? '', 'utf8'),
    ) as unknown;
    const teamRows = JSON.parse(await readFile(files.get('teams.json') ?? '', 'utf8')) as unknown;
    const playerRows = JSON.parse(
      await readFile(files.get('players.json') ?? '', 'utf8'),
    ) as unknown;

    expect(leagueRows).toEqual([
      { name: 'Premier League', countryName: 'England', countryCode3: 'ENG' },
    ]);
    expect(teamRows).toEqual([{ name: 'Team 1' }, { name: 'Unassigned Team' }]);
    expect(playerRows).toEqual([{ name: 'Player 1', positionDetail: 'ST' }, { name: 'Player 3' }]);
  });

  test('keeps CSV as three independent entity files', async () => {
    const destination = await mkdtemp(join(tmpdir(), 'qdb-export-test-'));
    directories.push(destination);
    const database = {
      exportRows: vi.fn(() => ({ leagues, teams, players })),
    } as unknown as SnapshotDatabase;
    const writer = new SnapshotExportWriter(database);

    const result = await writer.write(project, {
      projectId: project.id,
      format: 'csv',
      destination,
      includeTeamsWithoutLeague: false,
      leagueIds: ['league-1'],
      columns: {
        leagues: ['name'],
        teams: ['name'],
        players: ['name'],
      },
    });
    const files = new Map(result.files.map((file) => [file.split('/').at(-1), file]));

    expect([...files.keys()]).toEqual(['leagues.csv', 'teams.csv', 'players.csv']);
    await expect(readFile(files.get('leagues.csv') ?? '', 'utf8')).resolves.toBe(
      '\uFEFFname\r\nPremier League\r\n',
    );
    await expect(readFile(files.get('teams.csv') ?? '', 'utf8')).resolves.toBe(
      '\uFEFFname\r\nTeam 1\r\n',
    );
    await expect(readFile(files.get('players.csv') ?? '', 'utf8')).resolves.toBe(
      '\uFEFFname\r\nPlayer 1\r\n',
    );
  });

  test('writes one nested JSON snapshot after filtering and before projecting columns', async () => {
    const destination = await mkdtemp(join(tmpdir(), 'qdb-export-test-'));
    directories.push(destination);
    const teamWithoutPlayers: Team = {
      ...teams[0],
      id: 'team-empty',
      sourceId: 'empty',
      name: 'Empty Team',
      sourceUrl: 'https://example.test/team-empty',
    };
    const database = {
      exportRows: vi.fn(() => ({ leagues, teams: [...teams, teamWithoutPlayers], players })),
    } as unknown as SnapshotDatabase;
    const writer = new SnapshotExportWriter(database);

    const result = await writer.write(project, {
      projectId: project.id,
      format: 'single-json',
      destination,
      includeTeamsWithoutLeague: true,
      leagueIds: ['league-1'],
      columns: {
        leagues: ['name'],
        teams: ['name'],
        players: ['name', 'positionDetail'],
      },
    });

    expect(result.files).toEqual([join(result.directory, 'snapshot.json')]);
    const snapshot = JSON.parse(await readFile(result.files[0], 'utf8')) as unknown;
    expect(snapshot).toEqual({
      project: {
        name: 'Winter snapshot',
        referenceDate: '2026-01-01',
      },
      leagues: [{ name: 'Premier League' }],
      teams: [
        {
          name: 'Team 1',
          players: [{ name: 'Player 1', positionDetail: 'ST' }],
        },
        {
          name: 'Unassigned Team',
          players: [{ name: 'Player 3' }],
        },
        {
          name: 'Empty Team',
          players: [],
        },
      ],
    });
  });

  test('rejects unsupported export formats', async () => {
    const destination = await mkdtemp(join(tmpdir(), 'qdb-export-test-'));
    directories.push(destination);
    const database = {
      exportRows: vi.fn(() => ({ leagues, teams, players })),
    } as unknown as SnapshotDatabase;
    const writer = new SnapshotExportWriter(database);

    await expect(
      writer.write(project, {
        projectId: project.id,
        format: 'xml' as ExportFormat,
        destination,
        includeTeamsWithoutLeague: true,
        leagueIds: ['league-1'],
        columns: {
          leagues: ['name'],
          teams: ['name'],
          players: ['name'],
        },
      }),
    ).rejects.toMatchObject({
      appError: { code: 'INVALID_INPUT', message: 'Choose a valid export format.' },
    });
  });
});
