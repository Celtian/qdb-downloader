import { transfermarkt } from 'soccerbot';
import type { SoccerBotPlayer } from 'soccerbot/es5/shared/interfaces.js';
import type {
  ExternalTeam,
  LeaguePreview,
  PlayerInput,
  PreviewLeagueRequest,
  PreviewTeamRequest,
  ScrapeProgress,
  TeamPreview,
} from '../shared/contracts.js';
import { ApplicationError } from './errors.js';

type IdentifierKind = 'league' | 'team';

export const transfermarktSourceUrl = (
  entity: 'leagues' | 'teams',
  externalId: string,
  season: string | undefined,
): string =>
  entity === 'leagues'
    ? transfermarkt.leagueUrl(externalId, season)
    : transfermarkt.teamUrl(externalId, season);

export const parseTransfermarktIdentifier = (value: string, kind: IdentifierKind): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApplicationError({
      code: 'INVALID_INPUT',
      message: 'Enter a Transfermarkt ID or URL.',
    });
  }
  if (!trimmed.includes('://')) {
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new ApplicationError({
        code: 'INVALID_INPUT',
        message: 'The Transfermarkt ID is invalid.',
      });
    }
    return trimmed;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ApplicationError({
      code: 'INVALID_INPUT',
      message: 'The Transfermarkt URL is invalid.',
    });
  }
  if (!/(^|\.)transfermarkt\.[a-z.]+$/i.test(url.hostname)) {
    throw new ApplicationError({
      code: 'INVALID_INPUT',
      message: 'Only Transfermarkt URLs are supported.',
    });
  }
  const segment = kind === 'league' ? 'wettbewerb' : 'verein';
  const parts = url.pathname.split('/').filter(Boolean);
  const index = parts.indexOf(segment);
  const identifier = index >= 0 ? parts[index + 1] : undefined;
  if (!identifier || !/^[a-zA-Z0-9_-]+$/.test(identifier)) {
    throw new ApplicationError({
      code: 'INVALID_INPUT',
      message: `The URL does not contain a Transfermarkt ${kind} ID.`,
    });
  }
  return identifier;
};

const cleanSeason = (season: string | undefined): string | undefined => {
  const value = season?.trim();
  if (!value) return undefined;
  if (!/^\d{4}$/.test(value)) {
    throw new ApplicationError({
      code: 'INVALID_INPUT',
      message: 'Season must be a four-digit year.',
    });
  }
  return value;
};

const decodeHtmlText = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

export const parseTransfermarktLeagueName = (html: string): string | undefined => {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (!title) return undefined;
  const name = decodeHtmlText(title)
    .replace(/<[^>]+>/g, '')
    .split('|')[0]
    ?.trim()
    .replace(/\s+(?:\d{2}|\d{4})\/\d{2}$/, '')
    .trim();
  return name || undefined;
};

const loadTransfermarktLeagueName = async (sourceUrl: string): Promise<string | undefined> => {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114 Safari/537.36',
      },
    });
    if (!response.ok) return undefined;
    return parseTransfermarktLeagueName(await response.text());
  } catch {
    return undefined;
  }
};

export const normalizePlayer = (player: SoccerBotPlayer): PlayerInput | undefined => {
  const scrapedName = player.name?.trim();
  const composedName = [player.firstName, player.lastName].filter(Boolean).join(' ').trim();
  const name = [scrapedName ?? '', composedName].find((candidate) => candidate.length > 0) ?? '';
  if (!name) return undefined;
  return {
    externalId: player.id,
    name,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    positionDetail: player.positionDetail,
    birthdate: player.birthdate,
    height: player.height,
    weight: player.weight,
    foot: player.foot,
    joined: player.joined,
    contractExpires: player.contractExpires,
    marketValue: player.marketValue,
    countryName: player.country?.databaseName,
    countryCode2: player.country?.code2,
    countryCode3: player.country?.code3,
    minutesPlayed: player.minutesPlayed,
  };
};

export class TransfermarktScraper {
  private readonly canceledJobs = new Set<string>();

  cancel(jobId: string): boolean {
    this.canceledJobs.add(jobId);
    return true;
  }

  async previewLeague(request: PreviewLeagueRequest): Promise<LeaguePreview> {
    const externalId = parseTransfermarktIdentifier(request.identifierOrUrl, 'league');
    const season = cleanSeason(request.season);
    const sourceUrl = transfermarkt.leagueUrl(externalId, season);
    const namePromise = loadTransfermarktLeagueName(sourceUrl);
    let response: Awaited<ReturnType<typeof transfermarkt.league>>;
    try {
      response = await transfermarkt.league(externalId, season);
    } catch (error) {
      throw new ApplicationError(
        {
          code: 'SCRAPE_FAILED',
          message: 'Transfermarkt could not be reached.',
          details: String(error),
        },
        { cause: error },
      );
    }
    if (!response.ok || !response.data) {
      throw new ApplicationError({
        code: 'SCRAPE_FAILED',
        message: 'Transfermarkt league could not be loaded.',
        details: response.errors ? JSON.stringify(response.errors) : undefined,
      });
    }
    const teams = response.data
      .filter((team) => Boolean(team.id && team.name.trim()))
      .map<ExternalTeam>((team) => ({
        externalId: team.id,
        name: team.name.trim(),
        season,
        sourceUrl: transfermarkt.teamUrl(team.id, season),
      }));
    return { externalId, name: await namePromise, season, sourceUrl, teams };
  }

  async previewTeam(request: PreviewTeamRequest): Promise<TeamPreview> {
    const externalId = parseTransfermarktIdentifier(request.identifierOrUrl, 'team');
    const season = cleanSeason(request.season);
    return this.loadTeam({
      externalId,
      name: request.name.trim(),
      season,
      sourceUrl: transfermarkt.teamUrl(externalId, season),
    });
  }

  async previewTeams(
    jobId: string,
    teams: ExternalTeam[],
    onProgress: (progress: ScrapeProgress) => void,
  ): Promise<TeamPreview[]> {
    this.canceledJobs.delete(jobId);
    const previews: TeamPreview[] = [];
    for (const [index, team] of teams.entries()) {
      if (this.canceledJobs.has(jobId)) {
        onProgress({
          jobId,
          completed: index,
          total: teams.length,
          currentTeam: team.name,
          canceled: true,
        });
        break;
      }
      previews.push(await this.loadTeam(team));
      onProgress({
        jobId,
        completed: index + 1,
        total: teams.length,
        currentTeam: team.name,
        canceled: false,
      });
    }
    this.canceledJobs.delete(jobId);
    return previews;
  }

  private async loadTeam(team: ExternalTeam): Promise<TeamPreview> {
    if (!team.name.trim()) {
      throw new ApplicationError({ code: 'INVALID_INPUT', message: 'Team name is required.' });
    }
    let response: Awaited<ReturnType<typeof transfermarkt.team>>;
    try {
      response = await transfermarkt.team(team.externalId, team.season);
    } catch (error) {
      throw new ApplicationError(
        {
          code: 'SCRAPE_FAILED',
          message: `${team.name} could not be fetched because Transfermarkt could not be reached.`,
          details: String(error),
        },
        { cause: error },
      );
    }
    if (!response.ok || !response.data) {
      throw new ApplicationError({
        code: 'SCRAPE_FAILED',
        message: `${team.name} could not be loaded from Transfermarkt.`,
        details: response.errors ? JSON.stringify(response.errors) : undefined,
      });
    }
    return {
      ...team,
      players: response.data
        .map(normalizePlayer)
        .filter((player): player is PlayerInput => Boolean(player)),
    };
  }
}
