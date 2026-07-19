import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SnapshotDatabase } from './database';
import { ApplicationError } from './errors';

const directories: string[] = [];

const createDatabase = (): SnapshotDatabase => {
  const directory = mkdtempSync(join(tmpdir(), 'qdb-downloader-test-'));
  directories.push(directory);
  return new SnapshotDatabase(join(directory, 'snapshot.sqlite'));
};

afterEach(() => {
  while (directories.length) {
    const directory = directories.pop();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

describe('SnapshotDatabase', () => {
  test('normalizes names, rejects case-insensitive duplicates, and sorts by reference date', () => {
    const database = createDatabase();
    const first = database.createProject({ name: ' 2026/1 ', referenceDate: '2026-01-01' });
    database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });

    expect(first.name).toBe('2026/1');
    expect(database.listProjects().map((project) => project.name)).toEqual(['2026/2', '2026/1']);
    expect(() => database.createProject({ name: '2026/1', referenceDate: '2025-01-01' })).toThrow(
      ApplicationError,
    );
    database.close();
  });

  test('isolates projects, pages data, and deduplicates imports without a season', () => {
    const database = createDatabase();
    const first = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });
    const second = database.createProject({ name: '2026/2', referenceDate: '2026-07-01' });
    const request = {
      projectId: first.id,
      league: {
        externalId: 'GB1',
        name: 'Premier League',
        sourceUrl: 'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1',
      },
      teams: [
        {
          externalId: '281',
          name: 'Manchester City',
          sourceUrl: 'https://www.transfermarkt.com/manchester-city/startseite/verein/281',
          players: [{ externalId: '1', name: 'One, Player' }],
        },
      ],
    };

    database.commitImport(request);
    database.commitImport(request);
    expect(database.getProjectSummary(first.id)).toMatchObject({
      leagueCount: 1,
      teamCount: 1,
      playerCount: 1,
    });
    expect(database.getProjectSummary(second.id)).toMatchObject({
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    });
    const page = database.listEntities({
      projectId: first.id,
      entity: 'players',
      pageIndex: 0,
      pageSize: 1,
      search: 'One',
      sort: 'name',
      direction: 'asc',
    });
    expect(page.total).toBe(1);
    expect(page.rows[0]?.name).toBe('One, Player');
    database.close();
  });

  test('rolls back every row when an import fails', () => {
    const database = createDatabase();
    const project = database.createProject({ name: '2026/1', referenceDate: '2026-01-01' });

    expect(() =>
      database.commitImport({
        projectId: project.id,
        teams: [
          {
            externalId: 'valid',
            name: 'Valid team',
            sourceUrl: 'https://example.test/valid',
            players: [{ name: 'Valid player' }],
          },
          {
            externalId: 'invalid',
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
});
