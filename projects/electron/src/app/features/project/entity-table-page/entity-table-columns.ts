import type { EntityKind } from '../../../../../shared/contracts';

export type EntityColumnKey =
  | 'actions'
  | 'birthdate'
  | 'contractExpires'
  | 'countryName'
  | 'createdAt'
  | 'externalId'
  | 'foot'
  | 'height'
  | 'jerseyNumber'
  | 'joined'
  | 'marketValue'
  | 'name'
  | 'playerCount'
  | 'position'
  | 'season'
  | 'sourceUrl'
  | 'teamCount'
  | 'updatedAt';

export interface EntityColumnDefinition {
  key: EntityColumnKey;
  label: string;
  defaultVisible: boolean;
  required: boolean;
}

export type EntityColumnVisibility = Record<EntityColumnKey, boolean>;

export const entityColumnLabels: Record<EntityColumnKey, string> = {
  actions: 'Actions',
  birthdate: 'Birth date',
  contractExpires: 'Contract until',
  countryName: 'Nationality',
  createdAt: 'Created',
  externalId: 'Transfermarkt ID',
  foot: 'Foot',
  height: 'Height',
  jerseyNumber: 'Number',
  joined: 'Joined',
  marketValue: 'Market value',
  name: 'Name',
  playerCount: 'Players',
  position: 'Position',
  season: 'Season',
  sourceUrl: 'Source',
  teamCount: 'Teams',
  updatedAt: 'Updated',
};

const defineColumn = (key: EntityColumnKey, defaultVisible = true): EntityColumnDefinition => ({
  key,
  label: entityColumnLabels[key],
  defaultVisible,
  required: key === 'name' || key === 'actions',
});

export const columnsByEntity: Record<EntityKind, readonly EntityColumnDefinition[]> = {
  leagues: [
    defineColumn('name'),
    defineColumn('externalId', false),
    defineColumn('season'),
    defineColumn('teamCount'),
    defineColumn('sourceUrl'),
    defineColumn('createdAt', false),
    defineColumn('updatedAt', false),
    defineColumn('actions'),
  ],
  teams: [
    defineColumn('name'),
    defineColumn('externalId', false),
    defineColumn('season'),
    defineColumn('playerCount'),
    defineColumn('sourceUrl'),
    defineColumn('createdAt', false),
    defineColumn('updatedAt', false),
    defineColumn('actions'),
  ],
  players: [
    defineColumn('name'),
    defineColumn('externalId', false),
    defineColumn('countryName'),
    defineColumn('jerseyNumber'),
    defineColumn('position'),
    defineColumn('birthdate'),
    defineColumn('height'),
    defineColumn('foot'),
    defineColumn('joined'),
    defineColumn('contractExpires'),
    defineColumn('marketValue'),
    defineColumn('createdAt', false),
    defineColumn('updatedAt', false),
  ],
};

const allColumnKeys = Object.keys(entityColumnLabels) as EntityColumnKey[];

export function defaultVisibleColumns(entity: EntityKind): EntityColumnKey[] {
  return columnsByEntity[entity]
    .filter((column) => column.required || column.defaultVisible)
    .map((column) => column.key);
}

export function toColumnVisibility(
  visibleColumns: readonly EntityColumnKey[],
): EntityColumnVisibility {
  const visible = new Set(visibleColumns);
  return Object.fromEntries(
    allColumnKeys.map((key) => [key, visible.has(key)]),
  ) as EntityColumnVisibility;
}

export function fromColumnVisibility(
  definitions: readonly EntityColumnDefinition[],
  visibility: EntityColumnVisibility,
): EntityColumnKey[] {
  return definitions
    .filter((column) => column.required || visibility[column.key])
    .map((column) => column.key);
}
