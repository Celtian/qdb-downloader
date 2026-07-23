import { soccerway, transfermarkt } from 'soccerbot';
import type { EntityKind, SourceName } from '../shared/contracts.js';

export const sourceLabels: Record<SourceName, string> = {
  soccerway: 'Soccerway',
  transfermarkt: 'Transfermarkt',
};

export const buildSourceUrl = (
  sourceName: SourceName,
  entity: EntityKind,
  sourceId: string,
  season?: string,
): string | undefined => {
  const id = sourceId.trim();
  if (!id) return undefined;
  if (sourceName === 'soccerway') {
    if (entity === 'leagues') return soccerway.leagueUrl(id);
    if (entity === 'teams') return soccerway.teamUrl(id);
    return soccerway.playerUrl(id);
  }
  if (entity === 'leagues') return transfermarkt.leagueUrl(id, season);
  if (entity === 'teams') return transfermarkt.teamUrl(id, season);
  return undefined;
};
