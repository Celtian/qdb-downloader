import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { League, Player, Project, Team } from '../shared/contracts.js';
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
    source: 'transfermarkt',
    externalId: 'GB1',
    name: 'Premier League',
    sourceUrl: 'https://example.test/GB1',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'league-2',
    projectId: project.id,
    source: 'transfermarkt',
    externalId: 'GB2',
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
  source: 'transfermarkt',
  externalId: String(index + 1),
  name: `Team ${index + 1}`,
  sourceUrl: `https://example.test/team-${index + 1}`,
  createdAt: now,
  updatedAt: now,
}));
teams.push({
  id: 'team-unassigned',
  projectId: project.id,
  source: 'transfermarkt',
  externalId: 'unassigned',
  name: 'Unassigned Team',
  sourceUrl: 'https://example.test/team-unassigned',
  createdAt: now,
  updatedAt: now,
});
const players: Player[] = teams.map((team, index) => ({
  id: `player-${index + 1}`,
  projectId: project.id,
  teamId: team.id,
  source: 'transfermarkt',
  name: `Player ${index + 1}`,
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
        leagues: ['name'],
        teams: ['name'],
        players: ['name'],
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

    expect(leagueRows).toEqual([{ name: 'Premier League' }]);
    expect(teamRows).toEqual([{ name: 'Team 1' }, { name: 'Unassigned Team' }]);
    expect(playerRows).toEqual([{ name: 'Player 1' }, { name: 'Player 3' }]);
  });
});
