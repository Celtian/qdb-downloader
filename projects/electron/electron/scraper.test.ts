import { describe, expect, test } from 'vitest';
import { SoccerBotPositionDetail } from 'soccerbot/es5/shared/interfaces.js';
import { ApplicationError } from './errors.js';
import {
  normalizePlayer,
  parseTransfermarktIdentifier,
  parseTransfermarktLeagueName,
} from './scraper.js';

describe('Transfermarkt identifiers', () => {
  test('accepts IDs and supported league/team URLs', () => {
    expect(parseTransfermarktIdentifier('GB1', 'league')).toBe('GB1');
    expect(
      parseTransfermarktIdentifier(
        'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1',
        'league',
      ),
    ).toBe('GB1');
    expect(
      parseTransfermarktIdentifier(
        'https://www.transfermarkt.com/manchester-city/startseite/verein/281',
        'team',
      ),
    ).toBe('281');
  });

  test('extracts a clean league name from a Transfermarkt page title', () => {
    expect(
      parseTransfermarktLeagueName('<title>Premier League 25/26 | Transfermarkt</title>'),
    ).toBe('Premier League');
    expect(
      parseTransfermarktLeagueName('<title>Women&#39;s League 2025/26 | Transfermarkt</title>'),
    ).toBe("Women's League");
    expect(parseTransfermarktLeagueName('<main>No title</main>')).toBeUndefined();
  });

  test('rejects malformed IDs, unrelated hosts, and mismatched URLs', () => {
    for (const [value, kind] of [
      ['bad id', 'team'],
      ['https://example.com/team/281', 'team'],
      ['https://www.transfermarkt.com/league/GB1', 'league'],
    ] as const) {
      expect(() => parseTransfermarktIdentifier(value, kind)).toThrow(ApplicationError);
    }
  });
});

describe('Transfermarkt players', () => {
  test('normalizes detailed positions without synthesizing missing values', () => {
    expect(
      normalizePlayer({
        id: '10',
        name: 'Example Striker',
        positionDetail: SoccerBotPositionDetail.ST,
      }),
    ).toMatchObject({ externalId: '10', name: 'Example Striker', positionDetail: 'ST' });
    expect(normalizePlayer({ name: 'Unknown position' })).toMatchObject({
      name: 'Unknown position',
      positionDetail: undefined,
    });
  });
});
