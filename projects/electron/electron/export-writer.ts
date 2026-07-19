import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ExportFormat,
  ExportResult,
  League,
  Player,
  Project,
  Team,
} from '../shared/contracts.js';
import { toCsv, toJson } from '../shared/export-format.js';
import { slugifySnapshotName } from '../shared/reference-date.js';
import type { SnapshotDatabase } from './database.js';
import { ApplicationError } from './errors.js';

const csvColumns: Record<'leagues' | 'teams' | 'players', readonly string[]> = {
  leagues: [
    'id',
    'projectId',
    'source',
    'externalId',
    'name',
    'season',
    'sourceUrl',
    'createdAt',
    'updatedAt',
  ],
  teams: [
    'id',
    'projectId',
    'leagueId',
    'source',
    'externalId',
    'name',
    'season',
    'sourceUrl',
    'createdAt',
    'updatedAt',
  ],
  players: [
    'id',
    'projectId',
    'teamId',
    'source',
    'externalId',
    'name',
    'firstName',
    'lastName',
    'jerseyNumber',
    'position',
    'birthdate',
    'height',
    'weight',
    'foot',
    'joined',
    'contractExpires',
    'marketValue',
    'countryName',
    'countryCode2',
    'countryCode3',
    'minutesPlayed',
    'createdAt',
    'updatedAt',
  ],
};

const timestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');

export class SnapshotExportWriter {
  constructor(private readonly database: SnapshotDatabase) {}

  async write(project: Project, format: ExportFormat, destination: string): Promise<ExportResult> {
    const baseName = `${slugifySnapshotName(project.name)}_${project.referenceDate}_${timestamp()}`;
    let directory = join(destination, baseName);
    let suffix = 1;
    while (existsSync(directory)) directory = join(destination, `${baseName}_${suffix++}`);
    try {
      mkdirSync(destination, { recursive: true });
      mkdirSync(directory, { recursive: false });
      const rows = this.database.exportRows(project.id);
      const entries = Object.entries(rows) as [keyof typeof rows, League[] | Team[] | Player[]][];
      const files: string[] = [];
      for (const [name, values] of entries) {
        const path = join(directory, `${name}.${format}`);
        const content = format === 'json' ? toJson(values) : toCsv(values, csvColumns[name]);
        await writeFile(path, content, 'utf8');
        files.push(path);
      }
      return { directory, files };
    } catch (error) {
      throw new ApplicationError(
        { code: 'EXPORT', message: 'The project could not be exported.', details: String(error) },
        { cause: error },
      );
    }
  }
}
