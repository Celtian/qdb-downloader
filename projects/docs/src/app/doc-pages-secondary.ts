import type { DocContent } from './pages/doc-page/doc-page';

export const secondaryPages: Record<string, DocContent> = {
  importing: {
    eyebrow: 'Source data',
    title: 'Preview first, commit once',
    summary:
      'Use the guided workflow to add or update selected teams and players without leaving partially imported data.',
    actions: [
      { label: 'Download QDB Downloader', route: '/download', primary: true },
      { label: 'Review all features', route: '/features' },
    ],
    sections: [
      {
        title: 'Choose the operation and provider',
        paragraphs: [
          'Choose New import to add source data or Update existing to synchronize a stored league or team. Then choose whether the selected source represents a league or one team.',
          'Enter the selected provider’s source ID or paste a complete provider URL. Only the extracted source ID is stored. League names are detected when possible from provider metadata or source slugs; direct-team imports require the display name. When updating an existing record, the selected provider filters the available targets.',
        ],
        table: {
          caption: 'Supported provider capabilities',
          columns: ['Provider', 'Best for', 'Import behavior', 'Season handling', 'Player links'],
          rows: [
            [
              'Transfermarkt',
              'Recommended for the broadest coverage',
              'Fast imports',
              'Optional separate four-digit season',
              'Not available',
            ],
            [
              'Soccerway',
              'Global alternative when Transfermarkt data is unavailable',
              'Slower because requests are rate-limited',
              'Not used',
              'Available',
            ],
            [
              'WorldFootball',
              'Global coverage with detailed player profiles',
              'Profiles load separately; fetch no more than two squads per batch',
              'Not used',
              'Available',
            ],
            [
              'Eurofotbal',
              'Very fast, Europe-focused imports',
              'Final canonical URLs only; redirected URLs cannot be loaded',
              'League season embedded in the Source ID; no separate team season',
              'Not available',
            ],
          ],
        },
        wide: true,
      },
      {
        title: 'How Soccerbot combines stored source IDs into URLs',
        paragraphs: [
          'QDB Downloader stores sourceName and sourceId, then asks Soccerbot to derive the source page. The URL is not stored, so changing a source ID immediately regenerates the link.',
          'Transfermarkt league: GB1 → https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1. Supplying season 2026 adds /plus?saison_id=2026.',
          'Transfermarkt team: 281 → https://www.transfermarkt.com/slug/kader/verein/281/plus/1. Supplying season 2026 adds ?saison_id=2026.',
          'Soccerway league: czech-republic/chance-liga/standings/bNFMkskm → https://www.soccerway.com/czech-republic/chance-liga/standings/bNFMkskm/standings/overall/.',
          'Soccerway team: slavia-prague/viXGgnyB → https://www.soccerway.com/team/slavia-prague/viXGgnyB/squad/. Soccerway player: kolar-ondrej/xfBGcS1U → https://www.soccerway.com/player/kolar-ondrej/xfBGcS1U/.',
          'WorldFootball league: co7093/mexico-lp---serie-b → https://www.worldfootball.net/competition/co7093/mexico-lp---serie-b/.',
          'WorldFootball team: te237557/artesanos-metepec → https://www.worldfootball.net/teams/te237557/artesanos-metepec/squad/. WorldFootball player: pe599828/oscar-altamirano → https://www.worldfootball.net/person/pe599828/oscar-altamirano/.',
          'Eurofotbal league: chance-liga/2026-2027 → https://www.eurofotbal.cz/chance-liga/2026-2027/tabulky/. The season is part of the Eurofotbal league Source ID. Paste only the final canonical URL because redirected URLs cannot be loaded.',
          'Eurofotbal team: cesko/sparta-praha → https://www.eurofotbal.cz/kluby/cesko/sparta-praha/soupiska.',
          'Transfermarkt and Eurofotbal player source pages are left absent because Soccerbot does not provide player URL APIs for those providers.',
        ],
        note: 'A source import job still uses one provider and preserves that provider identity. Canonical single-source import and cross-provider identification happen later in Combined data → Import, using records already stored in the current project. Soccerbot may use LiveFutbol internally if WorldFootball is blocked, but QDB Downloader accepts and stores only canonical WorldFootball identities.',
      },
      {
        title: 'Build the selection',
        paragraphs: [
          'Preview a league, select the teams whose squads should be fetched, and then choose entire squads or individual players. A direct-team import starts with its returned squad; individual players are selected from that result.',
        ],
        note: 'During a multi-team fetch, Cancel after current team stops before the next squad while preserving the squads already loaded for review. With WorldFootball, fetch no more than two squads at a time because larger batches may be temporarily blocked.',
      },
      {
        title: 'Control update behavior',
        paragraphs: [
          'For an existing league, decide whether absent teams stay unchanged, become unassigned, or are deleted with their players. For league and team updates, decide whether absent players stay or are deleted.',
        ],
        items: [
          'Keep or move teams already owned by another league',
          'Keep or move players already owned by another team',
          'Keep stored names or replace them with incoming source names',
        ],
      },
      {
        title: 'Resolve matches before importing',
        paragraphs: [
          'A new import that matches stored source identities shows the conflicts before commit. Choose whether matching data is kept or refreshed and whether team and player ownership stays where it is or moves to the imported parent.',
          'Historical duplicate player copies are identified and consolidated when required.',
        ],
      },
      {
        title: 'Review and commit once',
        paragraphs: [
          'The final summary shows the source, selection, policies, conflicts, and add, update, preserve, move, detach, deduplicate, and delete counts. Destructive changes are called out before the action is enabled.',
          'Only the final confirmation writes to SQLite, and all selected changes are applied in one transaction. Cancellation, preview errors, and network failures do not modify the database.',
        ],
      },
      {
        title: 'Import stored provider teams into combined data',
        paragraphs: [
          'Open Combined data → Import and select one stored team or matching teams from up to four providers. Import suggests unique exact-name matches, then shows only the player-matching and conflict steps that are needed.',
          'Automatic matches require the same normalized name plus a matching birthdate or multiple supporting details. Ambiguous players remain separate until you join them manually. Differing fields follow Global settings → Sources unless you choose another available value.',
          'The Summary always lists resolved project players. Deselect individual players or remove every selected player without a resolved birthdate in one action before committing. Project values remain unchanged when source records are refreshed; use Recombine to preview and apply source changes explicitly.',
        ],
      },
      {
        title: 'Refresh or edit a stored source',
        paragraphs: [
          'Use Refresh from a league or team table to open the update workflow for that record. Its stored provider is locked and automatically selects the matching scraper. Use Edit to change league or team names, league and team countries, source IDs, optional Transfermarkt seasons, and team-to-league relationships. Eurofotbal league seasons are edited as part of the Source ID. Regenerated source links and provider-aware duplicate checks keep the stored source consistent. Teams can also be permanently deleted with their attached players after confirmation.',
        ],
        actions: [{ label: 'Manage existing records', route: '/managing-data' }],
      },
    ],
  },
  managingData: {
    eyebrow: 'Stored data',
    title: 'Keep every snapshot accurate and intentional',
    summary:
      'Classify records with badges, update metadata in bulk, and remove data with a clear preview of what will be retained or permanently deleted.',
    actions: [
      { label: 'Review all features', route: '/features', primary: true },
      { label: 'Read the import guide', route: '/importing' },
    ],
    sections: [
      {
        badge: 'Select',
        title: 'Work with one record or a page selection',
        paragraphs: [
          'Open a league or team row action menu to manage custom badges, edit, refresh, or delete that record. Player row actions support badge management and deletion. To manage several records together, select their checkboxes in a league, team, or player finder. Select all applies to the records on the current page, and changing the page, search, sort, or filters clears the selection.',
          'The selection bar shows how many records are selected and exposes only the actions supported by that entity: custom badges for every entity, countries for leagues and teams, tiers for leagues, and deletion for every entity.',
        ],
      },
      {
        badge: 'Badges',
        title: 'Build reusable custom classifications',
        paragraphs: [
          'Create a custom badge in Global settings with a unique name, tooltip description, and one of eight colors. The definition is available in league, team, and player finders across every project.',
          'Use Manage badges on one row or a page selection. Mixed checkboxes preserve differing assignments until you explicitly add or remove that badge for the whole selection. Show the Badge column to see assignments beside New and Old statuses.',
          'The Badges filter combines time-based and custom choices: selecting several badges matches records carrying any selected badge. Saved finder filters remember custom badge choices for each project and table.',
          'New marks records created within the configured 1 to 30 days relative to the current time; the default is 3 days. Old marks records last updated at least the configured 1 to 12 calendar months before the project reference date; the default is 6 months. Change both thresholds in Global settings.',
        ],
        note: 'Deleting a custom badge shows its assignment count and removes those assignments across all projects after confirmation.',
      },
      {
        badge: 'Classify',
        title: 'Organize leagues by tier',
        paragraphs: [
          'A league can have an optional tier from 1 to 10. Set it while editing one league, or select leagues and use Change tier to apply the same tier or clear it from every selected league.',
          'Show the Tier column when you want to sort the finder by tier. The league filters can include one or more tiers and can separately include leagues without a tier. Tier filters and column choices are remembered like the other finder preferences.',
        ],
      },
      {
        badge: 'Countries',
        title: 'Correct countries individually or in bulk',
        paragraphs: [
          'Edit one league or team to choose a country from the football-country and association autocomplete. Flags and normalized country metadata are shown throughout the finders.',
          'For a larger correction, select leagues or teams on the current page and choose Change country. Apply one country to the selection or clear the country from every selected record.',
        ],
      },
      {
        badge: 'Delete',
        title: 'Review the impact before deleting records',
        paragraphs: [
          'Delete one record from its row action menu, or select records and use the selection bar. Every confirmation names or counts the affected records and warns that the action cannot be undone.',
        ],
        items: [
          'Deleting players removes only the selected player records.',
          'Deleting a team permanently removes that team and every player attached to it.',
          'Deleting a league only keeps its teams and players, but the teams become unassigned.',
          'Deleting a league with teams permanently removes the league, its teams, and their players.',
        ],
        note: 'League deletion defaults to “Delete league only.” Choose the cascading option explicitly when the teams and players should also be removed.',
      },
      {
        badge: 'Project settings',
        title: 'Remove stored data by source',
        paragraphs: [
          'Use Finder filters in Project settings to clear saved league, team, and player filter selections for Source data, Combined data, or both. Search text, column layouts, filters in other projects, and filters in bookmarked or historical URLs are not affected.',
          'Open Project settings and use Stored source data when an entire provider should be removed from the current project. Select one or more sources and wait for the preview to show the exact league, team, and player counts before deletion is enabled. Project rows retain their last values and mark missing provenance as needing review.',
          'The cleanup removes leagues, teams, and players whose provider is selected. Deleting a selected-source team also deletes every player attached to it, even when a player came from another source. A team from another source under a deleted league is retained without a league.',
        ],
        note: 'Source cleanup does not delete the project, existing export folders, global settings, or saved finder filters. The confirmed database deletion is permanent.',
      },
      {
        badge: 'Combined data',
        title: 'Review and organize canonical records',
        paragraphs: [
          'Combined league, team, and player finders keep canonical project records separate from their linked source rows. Ready means every linked source record is still available. Needs review means at least one linked league, team, or player is missing; the status tooltip identifies the affected canonical entity.',
          'Filter combined finders by provider, Ready or Needs review status, combined custom badges, parents, and entity-specific football fields. Saved filters are remembered independently for each project and combined table. The Badges column shows built-in provenance status beside custom assignments when enabled.',
          'Manage combined custom badges from one row or a current-page selection. Combined deletion removes only canonical project records and preserves raw source data; league deletion can either leave project teams unassigned or cascade through their project teams and players.',
          'Choose Columns in a combined finder for a temporary draft that can be applied, cancelled, or reset. Global settings → Combined data → Columns manages the same league, team, and player layouts across every project. Source and combined layouts use independent saved preferences.',
        ],
        note: 'Open Global settings from the project toolbar to manage combined badges or columns. The Back to project action returns to the project page, query filters included.',
      },
      {
        badge: 'Global settings',
        title: 'Clear every project',
        paragraphs: [
          'Open General in Global settings and use Clear all projects when every snapshot should be removed. The confirmation shows the project count and permanently deletes every project, league, team, player, and badge assignment.',
          'Export folders created during the current app session are also removed when possible. Any folder that could not be removed is reported and remains available on disk.',
        ],
        note: 'Theme and badge-age settings, custom badge definitions, finder column layouts, saved finder filters, both export preset families, the export destination, and the last successful export configuration are preserved. This action cannot be undone.',
      },
    ],
  },
  exporting: {
    eyebrow: 'Portable data',
    title: 'Portable exports for every workflow',
    summary:
      'Choose the scope and columns, then export related leagues, teams, and players as separate JSON or CSV files or as one nested JSON snapshot.',
    actions: [{ label: 'Download QDB Downloader', route: '/download', primary: true }],
    sections: [
      {
        title: 'Choose the scope',
        paragraphs: [
          'First choose Source data or Combined data. Then select one or more leagues and optionally include teams that are not assigned to a league. Teams belonging to the selected leagues and all players belonging to the included teams are added automatically.',
        ],
      },
      {
        title: 'Choose the columns',
        paragraphs: [
          'Select at least one field for leagues, teams, and players, then choose the identifier written to JSON and CSV. Exported names use letters, numbers, and underscores, start with a letter or underscore, and stay unique within each entity.',
          'Choose visibility separately with the built-in Default or Full preset. Choose names with the built-in Camel case or Snake case preset; for example, countryCode2 becomes country_code_2 in Snake case. Global settings → Export lets you clone and save custom presets in either family.',
          'A field-name preset defines every exportable field, including fields hidden by the current visibility preset. Names must be unique case-insensitively within each entity and cannot use players, sources, sourceNames, or sourceIds because export formats reserve those keys.',
          'While editing, the visibility and field-name choices remain independent. Each selector independently shows Custom (modified), and returns to a saved preset name whenever its complete configuration matches again. A successful export remembers the exact configuration even when it is not saved as a named preset.',
        ],
      },
      {
        title: 'Choose one of three layouts',
        paragraphs: [
          'JSON writes normalized league, team, and player arrays to three files. Single JSON writes snapshot.json with portable project metadata, selected leagues at the root, and players nested under their teams. CSV writes three UTF-8 tables with stable headers, CRLF rows, and RFC 4180 escaping.',
          'Combined data JSON records include a sources collection. Combined data CSV exports flatten aligned provider names and source IDs into provenance columns.',
        ],
      },
      {
        title: 'Reuse the last successful setup',
        paragraphs: [
          'The destination folder is remembered when you choose it. After files are exported successfully, QDB Downloader also stores the selected Source or Combined dataset, output format, visible columns, and output field names. These application-wide choices are restored when Export is opened from any project.',
          'League selections and the Include teams without a league choice are rebuilt from the active project and are not remembered. A failed export does not replace the last successful configuration. If restored columns or field names no longer match a named preset, the corresponding selector shows Custom (modified).',
        ],
      },
      {
        title: 'Create and open the export',
        paragraphs: [
          'Review the destination, format, scope, and columns. QDB Downloader creates a collision-safe folder from the project name, reference date, and timestamp, then offers to open it when writing succeeds.',
          'An entity with no matching records produces an empty JSON array or a header-only CSV; Single JSON always keeps its project, leagues, and teams structure.',
        ],
      },
    ],
  },
  development: {
    eyebrow: 'Contributor guide',
    title: 'Strict from the first commit',
    summary:
      'The Bun-managed Angular 22 workspace validates renderer, desktop, shared, and documentation code together.',
    actions: [
      {
        label: 'Browse the source',
        href: 'https://github.com/Celtian/qdb-downloader',
        primary: true,
      },
      {
        label: 'Read the contributor guide',
        href: 'https://github.com/Celtian/qdb-downloader/blob/master/CONTRIBUTING.md',
      },
    ],
    sections: [
      {
        title: 'Install and run',
        paragraphs: [
          'Use Bun 1.3.14 and Node.js 24.18 or newer, but earlier than Node.js 25. The main start command compiles Electron code, serves the renderer on 127.0.0.1:4200, and opens the desktop window; start the docs separately when needed.',
        ],
        code: 'bun install --frozen-lockfile\nbun run start\nbun run start:docs',
      },
      {
        title: 'Workspace layout',
        paragraphs: [
          'projects/electron contains the standalone zoneless renderer, shared IPC contracts, Electron main and preload code, SQLite, Soccerbot integration, exports, and tests. projects/docs contains this statically generated site.',
        ],
      },
      {
        title: 'Quality gates',
        paragraphs: [
          'TypeScript strict mode, typed ESLint, Angular template accessibility checks, AXE tests, Prettier, Vitest, lint-staged, commit-message validation, and Husky are enforced through root scripts and CI.',
        ],
        code: 'bun run format:check\nbun run lint\nbun run typecheck\nbun run test\nbun run validate',
      },
    ],
  },
  releases: {
    eyebrow: 'Delivery',
    title: 'Windows builds and GitHub Pages',
    summary:
      'Stable semantic-version tags publish the app and documentation as one validated release.',
    actions: [
      {
        label: 'Latest release',
        href: 'https://github.com/Celtian/qdb-downloader/releases/latest',
        primary: true,
      },
      {
        label: 'Release history',
        href: 'https://github.com/Celtian/qdb-downloader/releases',
      },
    ],
    sections: [
      {
        title: 'Stable tags',
        paragraphs: [
          'Push a stable vMAJOR.MINOR.PATCH tag from master to run validation, package unsigned Windows x64 Squirrel Setup and portable ZIP builds with Electron Forge, and publish the artifacts with SHA-256 checksums.',
        ],
      },
      {
        title: 'Updates and documentation',
        paragraphs: [
          'Packaged Windows builds check GitHub Releases for updates. The static documentation is built with the /qdb-downloader/ base path and deployed to GitHub Pages only after the Windows release succeeds.',
        ],
      },
    ],
  },
};
