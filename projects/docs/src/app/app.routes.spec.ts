import type { DocContent } from './pages/doc-page/doc-page';
import { routes } from './app.routes';

describe('documentation routes', () => {
  const importingRoute = routes.find((route) => route.path === 'importing');
  const importing = importingRoute?.data?.['content'] as DocContent | undefined;
  const managingDataRoute = routes.find((route) => route.path === 'managing-data');
  const managingData = managingDataRoute?.data?.['content'] as DocContent | undefined;
  const exportingRoute = routes.find((route) => route.path === 'exporting');
  const exporting = exportingRoute?.data?.['content'] as DocContent | undefined;

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

  it('documents league classification and bulk metadata changes', () => {
    const content = JSON.stringify(managingData);

    expect(managingDataRoute?.title).toBe('Managing data · QDB Downloader');
    expect(content).toContain('optional tier from 1 to 10');
    expect(content).toContain('include leagues without a tier');
    expect(content).toContain('Change country');
    expect(content).toContain('current page');
  });

  it('documents deletion choices and source-cleanup boundaries', () => {
    const content = JSON.stringify(managingData);

    expect(content).toContain('Deleting a team permanently removes that team and every player');
    expect(content).toContain('Deleting a league only keeps its teams and players');
    expect(content).toContain('Deleting a league with teams permanently removes');
    expect(content).toContain('even when a player came from another source');
    expect(content).toContain('team from another source under a deleted league is retained');
    expect(content).toContain('does not delete the project, existing export folders');
    expect(content).toContain('cannot be undone');
  });

  it('documents status timing and reusable custom badges', () => {
    const content = JSON.stringify(managingData);

    expect(content).toContain('1 to 30 days relative to the current time');
    expect(content).toContain('1 to 12 calendar months before the project reference date');
    expect(content).toContain('default is 3 days');
    expect(content).toContain('default is 6 months');
    expect(content).toContain('removes those assignments across all projects');
  });

  it('documents reusable export column presets', () => {
    const content = JSON.stringify(exporting);

    expect(exportingRoute?.title).toBe('Exporting · QDB Downloader');
    expect(content).toContain('built-in Default or Full preset');
    expect(content).toContain('Global settings → Columns');
    expect(content).toContain('Custom (modified)');
    expect(content).toContain('without overwriting the saved preset');
  });

  it('documents clear-all-projects behavior and preserved preferences', () => {
    const content = JSON.stringify(managingData);

    expect(content).toContain('Clear all projects');
    expect(content).toContain('permanently deletes every project, league, team, player');
    expect(content).toContain('created during the current app session');
    expect(content).toContain('custom badge definitions');
    expect(content).toContain('export column presets are preserved');
  });

  it('registers managing data before the wildcard redirect', () => {
    const managingDataIndex = routes.findIndex((route) => route.path === 'managing-data');
    const wildcardIndex = routes.findIndex((route) => route.path === '**');

    expect(managingDataIndex).toBeGreaterThanOrEqual(0);
    expect(managingDataIndex).toBeLessThan(wildcardIndex);
  });
});
