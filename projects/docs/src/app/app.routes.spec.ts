import type { DocContent } from './pages/doc-page/doc-page';
import { routes } from './app.routes';

describe('documentation routes', () => {
  const importingRoute = routes.find((route) => route.path === 'importing');
  const importing = importingRoute?.data?.['content'] as DocContent | undefined;

  it('documents every supported provider in the comparison table', () => {
    const providerTable = importing?.sections.find(
      (section) => section.table?.caption === 'Supported provider capabilities',
    )?.table;

    expect(providerTable?.rows.map((row) => row[0])).toEqual([
      'Transfermarkt',
      'Soccerway',
      'WorldFootball',
      'Eurofotbal',
    ]);
  });

  it('keeps provider season, performance, URL, and player-link guidance', () => {
    const content = JSON.stringify(importing);

    expect(content).toContain('Optional separate four-digit season');
    expect(content).toContain('Slower because requests are rate-limited');
    expect(content).toContain('fetch no more than two squads');
    expect(content).toContain('chance-liga/2026-2027');
    expect(content).toContain('redirected URLs cannot be loaded');
    expect(content).toContain('Transfermarkt and Eurofotbal player source pages are left absent');
  });
});
