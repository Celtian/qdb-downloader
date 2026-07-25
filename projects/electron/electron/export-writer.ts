import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ExportColumnSelection,
  ExportFormat,
  ExportRequest,
  ExportResult,
  CombinedSourceRef,
  CombinedPlayer,
  Player,
  Project,
} from '../shared/contracts.js';
import { exportColumnDefinitions } from '../shared/export-schema.js';
import { toCsv, toJson } from '../shared/export-format.js';
import { slugifySnapshotName } from '../shared/reference-date.js';
import type { SnapshotDatabase } from './database.js';
import { ApplicationError } from './errors.js';

const timestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');
const exportFormats = new Set<ExportFormat>(['json', 'single-json', 'csv']);

const pickColumns = (row: object, columns: readonly string[]): Record<string, unknown> => {
  const selected: Record<string, unknown> = {};
  const values = row as Record<string, unknown>;
  for (const column of columns) selected[column] = values[column];
  return selected;
};

const withCombinedSources = (
  row: object,
  selected: Record<string, unknown>,
  format: ExportFormat,
): Record<string, unknown> => {
  const sources = (row as { sources?: CombinedSourceRef[] }).sources ?? [];
  return format === 'csv'
    ? {
        ...selected,
        sourceNames: sources.map(({ sourceName }) => sourceName).join(';'),
        sourceIds: sources.map(({ sourceId }) => sourceId).join(';'),
      }
    : { ...selected, sources };
};

const validateColumns = (columns: ExportColumnSelection): void => {
  for (const entity of ['leagues', 'teams', 'players'] as const) {
    const allowed = new Set<string>(exportColumnDefinitions[entity].map(({ key }) => key));
    if (columns[entity].length === 0 || columns[entity].some((column) => !allowed.has(column))) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: `Choose at least one valid ${entity} column.`,
      });
    }
  }
};

export class SnapshotExportWriter {
  constructor(private readonly database: SnapshotDatabase) {}

  async write(project: Project, request: ExportRequest): Promise<ExportResult> {
    validateColumns(request.columns);
    const { destination, format } = request;
    if (!exportFormats.has(format)) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'Choose a valid export format.',
      });
    }
    if (!destination.trim()) {
      throw new ApplicationError({ code: 'INVALID_INPUT', message: 'Choose an export folder.' });
    }
    const baseName = `${slugifySnapshotName(project.name)}_${project.referenceDate}_${timestamp()}`;
    let directory = join(destination, baseName);
    let suffix = 1;
    while (existsSync(directory)) directory = join(destination, `${baseName}_${suffix++}`);
    try {
      mkdirSync(destination, { recursive: true });
      mkdirSync(directory, { recursive: false });
      const combined = request.dataset === 'combined';
      const rows = combined
        ? this.database.exportCombinedRows(project.id)
        : this.database.exportRows(project.id);
      const leagueIds = new Set(request.leagueIds);
      const leagues = rows.leagues.filter(({ id }) => leagueIds.has(id));
      const teams = rows.teams.filter(({ leagueId }) =>
        leagueId ? leagueIds.has(leagueId) : request.includeTeamsWithoutLeague,
      );
      const teamIds = new Set(teams.map(({ id }) => id));
      const players = rows.players.filter(({ teamId }) => teamIds.has(teamId));
      if (format === 'single-json') {
        const playersByTeam = new Map<string, (Player | CombinedPlayer)[]>();
        for (const player of players) {
          const teamPlayers = playersByTeam.get(player.teamId) ?? [];
          teamPlayers.push(player);
          playersByTeam.set(player.teamId, teamPlayers);
        }
        const snapshot = {
          project: {
            name: project.name,
            referenceDate: project.referenceDate,
          },
          leagues: leagues.map((row) => {
            const selected = pickColumns(row, request.columns.leagues);
            return combined ? withCombinedSources(row, selected, format) : selected;
          }),
          teams: teams.map((row) => ({
            ...(combined
              ? withCombinedSources(row, pickColumns(row, request.columns.teams), format)
              : pickColumns(row, request.columns.teams)),
            players: (playersByTeam.get(row.id) ?? []).map((player) =>
              combined
                ? withCombinedSources(player, pickColumns(player, request.columns.players), format)
                : pickColumns(player, request.columns.players),
            ),
          })),
        };
        const path = join(directory, 'snapshot.json');
        await writeFile(path, toJson(snapshot), 'utf8');
        return { directory, files: [path] };
      }
      const selectedRows = {
        leagues: leagues.map((row) => {
          const selected = pickColumns(row, request.columns.leagues);
          return combined ? withCombinedSources(row, selected, format) : selected;
        }),
        teams: teams.map((row) => {
          const selected = pickColumns(row, request.columns.teams);
          return combined ? withCombinedSources(row, selected, format) : selected;
        }),
        players: players.map((row) => {
          const selected = pickColumns(row, request.columns.players);
          return combined ? withCombinedSources(row, selected, format) : selected;
        }),
      };
      const entries = Object.entries(selectedRows) as [
        keyof typeof selectedRows,
        Record<string, unknown>[],
      ][];
      const files: string[] = [];
      for (const [name, values] of entries) {
        const path = join(directory, `${name}.${format}`);
        const columns = [
          ...(request.columns[name] as readonly string[]),
          ...(combined && format === 'csv' ? ['sourceNames', 'sourceIds'] : []),
        ];
        const content = format === 'json' ? toJson(values) : toCsv(values, columns);
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
