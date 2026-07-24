import type { EntityKind, ExportColumnSelection, League, Player, Team } from './contracts.js';

export interface ExportColumnDefinition<Key extends string = string> {
  key: Key;
  label: string;
}

interface ExportModels {
  leagues: League;
  teams: Team;
  players: Player;
}

type ExportColumnDefinitions = {
  [Entity in EntityKind]: readonly ExportColumnDefinition<keyof ExportModels[Entity] & string>[];
};

export const exportColumnDefinitions = {
  leagues: [
    { key: 'id', label: 'ID' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'sourceName', label: 'Source' },
    { key: 'sourceId', label: 'Source ID' },
    { key: 'name', label: 'Name' },
    { key: 'countryName', label: 'Country name' },
    { key: 'countryCode2', label: 'Country code (2)' },
    { key: 'countryCode3', label: 'Country code (3)' },
    { key: 'season', label: 'Season' },
    { key: 'sourceUrl', label: 'Source page' },
    { key: 'teamCount', label: 'Team count' },
    { key: 'createdAt', label: 'Created at' },
    { key: 'updatedAt', label: 'Updated at' },
  ],
  teams: [
    { key: 'id', label: 'ID' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'leagueId', label: 'League ID' },
    { key: 'sourceName', label: 'Source' },
    { key: 'sourceId', label: 'Source ID' },
    { key: 'name', label: 'Name' },
    { key: 'season', label: 'Season' },
    { key: 'sourceUrl', label: 'Source page' },
    { key: 'playerCount', label: 'Player count' },
    { key: 'createdAt', label: 'Created at' },
    { key: 'updatedAt', label: 'Updated at' },
  ],
  players: [
    { key: 'id', label: 'ID' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'teamId', label: 'Team ID' },
    { key: 'sourceName', label: 'Source' },
    { key: 'sourceId', label: 'Source ID' },
    { key: 'name', label: 'Name' },
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'jerseyNumber', label: 'Jersey number' },
    { key: 'position', label: 'Position' },
    { key: 'positionDetail', label: 'Position detail' },
    { key: 'birthdate', label: 'Birthdate' },
    { key: 'height', label: 'Height' },
    { key: 'weight', label: 'Weight' },
    { key: 'foot', label: 'Foot' },
    { key: 'joined', label: 'Joined' },
    { key: 'contractExpires', label: 'Contract expires' },
    { key: 'marketValue', label: 'Market value' },
    { key: 'countryName', label: 'Country name' },
    { key: 'countryCode2', label: 'Country code (2)' },
    { key: 'countryCode3', label: 'Country code (3)' },
    { key: 'minutesPlayed', label: 'Minutes played' },
    { key: 'sourceUrl', label: 'Source page' },
    { key: 'createdAt', label: 'Created at' },
    { key: 'updatedAt', label: 'Updated at' },
  ],
} as const satisfies ExportColumnDefinitions;

const defaultExcludedColumns = {
  leagues: new Set<string>(['projectId', 'sourceUrl', 'teamCount', 'createdAt', 'updatedAt']),
  teams: new Set<string>(['projectId', 'sourceUrl', 'playerCount', 'createdAt', 'updatedAt']),
  players: new Set<string>(['projectId', 'sourceUrl', 'createdAt', 'updatedAt']),
} satisfies Record<EntityKind, ReadonlySet<string>>;

export const defaultExportColumns = (): ExportColumnSelection => ({
  leagues: exportColumnDefinitions.leagues
    .filter(({ key }) => !defaultExcludedColumns.leagues.has(key))
    .map(({ key }) => key),
  teams: exportColumnDefinitions.teams
    .filter(({ key }) => !defaultExcludedColumns.teams.has(key))
    .map(({ key }) => key),
  players: exportColumnDefinitions.players
    .filter(({ key }) => !defaultExcludedColumns.players.has(key))
    .map(({ key }) => key),
});
