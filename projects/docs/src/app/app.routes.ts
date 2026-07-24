import type { Routes } from '@angular/router';
import type { DocContent } from './pages/doc-page/doc-page';

const pages: Record<string, DocContent> = {
  overview: {
    eyebrow: 'Local-first desktop app',
    title: 'Football data, frozen at the date you choose',
    summary:
      'Create focused football-data snapshots, review every database change, browse normalized leagues, teams, and players, then export the exact data you need.',
    actions: [
      {
        label: 'Download for Windows',
        href: 'https://github.com/Celtian/qdb-downloader/releases/latest',
        primary: true,
      },
      { label: 'Explore the features', route: '/features' },
    ],
    facts: [
      { label: 'Platform', value: 'Windows x64' },
      { label: 'Storage', value: 'Local SQLite' },
      { label: 'Sources', value: '4 online providers' },
      { label: 'Exports', value: 'JSON, nested JSON, and CSV' },
    ],
    sections: [
      {
        badge: '01 · Organize',
        title: 'A project is a snapshot',
        paragraphs: [
          'Create projects such as 2026/1 with a reference date of 2026-01-01. The timezone-independent calendar date describes the project snapshot as a whole. Transfermarkt can use a separate optional season, while Eurofotbal includes a league season in its Source ID.',
          'Project names are unique without regard to letter case. Search larger project lists, review record totals, and rename or delete projects without affecting other snapshots.',
        ],
      },
      {
        badge: '02 · Collect',
        title: 'Choose what enters your data',
        paragraphs: [
          'Preview a league or team from Transfermarkt, Soccerway, WorldFootball, or Eurofotbal before anything is saved. Select the squads and individual players that belong in the snapshot, then review conflicts and commit the change as one transaction.',
        ],
      },
      {
        badge: '03 · Explore',
        title: 'Browse without losing context',
        paragraphs: [
          'Search, filter, sort, page, and customize columns across league, team, and player tables. Follow a league into its teams and a team into its players while staying inside the active snapshot.',
          'Filter selections are remembered per project and table, including New, Old, and custom badges. Column visibility and order are remembered for each entity, including keyboard-accessible reordering. Select records on the current page to manage custom badges, change countries or league tiers, or review and confirm deletion.',
        ],
        actions: [{ label: 'Manage stored data', route: '/managing-data' }],
      },
      {
        badge: '04 · Reuse',
        title: 'Take the whole snapshot with you',
        paragraphs: [
          'Choose leagues, unassigned teams, and a reusable column preset, then export the resulting teams and players as separate JSON or CSV files or as one nested JSON snapshot. The predictable output is ready for analysis, scripts, spreadsheets, or archiving.',
        ],
      },
      {
        badge: 'Privacy',
        title: 'Local by design',
        paragraphs: [
          'Your projects live in a local SQLite database with transactional writes, foreign keys, and WAL. SQLite and Soccerbot run only in the Electron main process, while the Angular interface stays behind a typed, restricted desktop boundary.',
        ],
        actions: [{ label: 'See every feature', route: '/features' }],
        wide: true,
      },
    ],
  },
  features: {
    eyebrow: 'What you can do',
    title: 'From a source page to a reusable snapshot',
    summary:
      'QDB Downloader keeps collection, review, storage, exploration, and export in one focused desktop workflow.',
    actions: [
      { label: 'Download the app', route: '/download', primary: true },
      { label: 'Read the import guide', route: '/importing' },
      { label: 'Manage stored data', route: '/managing-data' },
    ],
    sections: [
      {
        badge: 'Snapshots',
        title: 'Manage snapshots by date',
        paragraphs: [
          'Give each project a name and a required reference date. Every project remains isolated, so you can keep multiple historical or planned datasets side by side.',
        ],
        items: [
          'Timezone-independent calendar dates',
          'Case-insensitive unique project names',
          'Search plus at-a-glance league, team, and player totals',
          'Rename or permanently delete projects and their stored records',
        ],
      },
      {
        badge: 'Import',
        title: 'Preview before saving',
        paragraphs: [
          'Start with a supported source URL or ID, load its data, and narrow the result before it reaches the database.',
        ],
        items: [
          'League and direct-team import workflows',
          'Transfermarkt, Soccerway, WorldFootball, and Eurofotbal provider identities kept separate',
          'Optional Transfermarkt seasons independent of the reference date',
          'Eurofotbal league seasons embedded in their Source IDs',
          'Team, squad, and individual-player selection',
          'Progress reporting and cancellation after the current squad',
        ],
      },
      {
        badge: 'Updates',
        title: 'Control conflicts and ownership',
        paragraphs: [
          'Refresh existing sources without blindly overwriting the snapshot. Review matching identities and decide how names, missing records, leagues, and teams should be handled.',
        ],
        items: [
          'Keep, refresh, move, detach, deduplicate, or delete records',
          'Missing-team, missing-player, name, and ownership policies',
          'One final add, update, preserve, move, detach, deduplicate, and delete summary',
        ],
      },
      {
        badge: 'Browse',
        title: 'Find the records that matter',
        paragraphs: [
          'Explore normalized tables without loading the entire dataset into the interface. SQLite handles large result sets behind the scenes.',
        ],
        items: [
          'Search, sorting, filters, and pagination',
          'Filters for source, parents, seasons, league tiers, nationalities, positions, preferred foot, and time-based or custom badges',
          'League tier sorting plus filters for tiers 1 to 10 and leagues without a tier',
          'General and detailed player positions, including GK, CB, CAM, and ST',
          'Remembered filter selections plus column visibility and order',
          'Mouse, touch, and keyboard column reordering',
        ],
      },
      {
        badge: 'Manage',
        title: 'Keep stored data accurate',
        paragraphs: [
          'Edit league and team names, countries, source identities, optional Transfermarkt seasons, league tiers, and team-to-league relationships. Assign reusable custom badges from any row or page selection, then use them to build focused finder views.',
        ],
        items: [
          'Optional league tiers from 1 to 10',
          'Global custom badges with names, tooltip descriptions, and accessible palette colors',
          'Single-record and page-selection metadata changes',
          'League-only deletion that keeps teams unassigned',
          'Cascading league, team, and player deletion with affected-record counts',
          'Source-based cleanup from Project settings with a deletion preview',
        ],
        actions: [{ label: 'Read the managing data guide', route: '/managing-data' }],
      },
      {
        badge: 'Preferences',
        title: 'Keep the workspace comfortable',
        paragraphs: [
          'Use Global settings to follow the operating-system appearance or choose a persistent light or dark theme, configure when New and Old badges appear, create reusable custom badges, manage finder column layouts, and save reusable export column presets. Project settings can clear saved filters for only the active project, while Global settings can permanently clear every project after confirmation.',
        ],
      },
      {
        badge: 'Export',
        title: 'Create portable output',
        paragraphs: [
          'Select columns plus leagues or unassigned teams. Their teams and players are included automatically. Choose separate JSON for code and APIs, Single JSON for one nested snapshot, or CSV for spreadsheets and data tools.',
        ],
        actions: [{ label: 'Learn about exports', route: '/exporting' }],
      },
    ],
  },
  download: {
    eyebrow: 'Windows x64',
    title: 'Download, install, and start your first snapshot',
    summary:
      'Get QDB Downloader from the official GitHub Releases page. Use the installer for automatic setup, or choose the ZIP when you prefer a portable copy.',
    actions: [
      {
        label: 'Open the latest release',
        href: 'https://github.com/Celtian/qdb-downloader/releases/latest',
        primary: true,
      },
      {
        label: 'View all releases',
        href: 'https://github.com/Celtian/qdb-downloader/releases',
      },
    ],
    facts: [
      { label: 'Recommended', value: 'Setup installer' },
      { label: 'Alternative', value: 'Portable ZIP' },
      { label: 'License', value: 'MIT' },
    ],
    sections: [
      {
        badge: 'Recommended',
        title: 'Install with Setup',
        paragraphs: [
          'The Setup build is the simplest choice for regular use and receives packaged-app update checks.',
        ],
        steps: [
          'Open the latest release and expand Assets if GitHub has collapsed the file list.',
          'Download QDB-Downloader-Setup.exe and its matching .sha256 file.',
          'Run QDB-Downloader-Setup.exe and follow the Windows prompts.',
          'Launch QDB Downloader from the installed application shortcut.',
        ],
        note: 'The application is currently unsigned. Windows SmartScreen or antivirus software may show a warning. Confirm that the download came from the official Celtian/qdb-downloader release and verify its checksum before deciding whether to continue. Do not disable antivirus globally.',
        actions: [
          {
            label: 'Download the latest Setup',
            href: 'https://github.com/Celtian/qdb-downloader/releases/latest',
          },
        ],
      },
      {
        badge: 'Portable option',
        title: 'Run from the ZIP',
        paragraphs: [
          'The ZIP does not need the normal installer and can live in a folder you choose.',
        ],
        steps: [
          'Download the Windows x64 ZIP and its matching .sha256 file from the release assets.',
          'Extract the entire archive to a writable folder. Do not run the executable from inside the ZIP preview.',
          'Open the extracted folder and run QDB Downloader.exe.',
        ],
        note: 'Keep the extracted files together. Moving only the executable will leave behind files the desktop app needs to start.',
      },
      {
        badge: 'Integrity check',
        title: 'Verify the download',
        paragraphs: [
          'Open PowerShell in the download folder and calculate the SHA-256 hash. Compare the resulting hash with the first value in the matching checksum file.',
        ],
        code: 'Get-FileHash .\\QDB-Downloader-Setup.exe -Algorithm SHA256\nGet-Content .\\QDB-Downloader-Setup.exe.sha256',
      },
      {
        badge: 'First run',
        title: 'Create your first project',
        paragraphs: [
          'QDB Downloader stores its project database locally. An internet connection is required when fetching or refreshing data from an online source.',
        ],
        steps: [
          'Select New project, enter a unique name, and choose the snapshot reference date.',
          'Open the project and select Import.',
          'Enter a league or team name plus a supported source URL or ID.',
          'Preview the result, select teams and players, review every proposed change, then confirm the import.',
          'Browse the saved records or choose the leagues, columns, and format for an export.',
        ],
        actions: [{ label: 'Continue to importing', route: '/importing' }],
        wide: true,
      },
    ],
  },
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
        note: 'An import job always uses one provider. Equal player IDs from different providers remain separate records; cross-provider player matching is not performed. Soccerbot may use LiveFutbol internally if WorldFootball is blocked, but QDB Downloader accepts and stores only canonical WorldFootball identities.',
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
        title: 'Refresh or edit a stored source',
        paragraphs: [
          'Use Refresh from a league or team table to open the update workflow for that record. Its stored provider is locked and automatically selects the matching scraper. Use Edit to change league or team names, league and team countries, source IDs, optional Transfermarkt seasons, and team-to-league relationships. Eurofotbal league seasons are edited as part of the Source ID. Regenerated source links and provider-aware duplicate checks keep the stored source consistent. Teams can also be permanently deleted with their attached players after confirmation.',
        ],
        actions: [{ label: 'Manage existing records', route: '/managing-data' }],
      },
    ],
  },
  managingData: {
    eyebrow: 'Stored project data',
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
          'Open Project settings and use Stored source data when an entire provider should be removed from the current project. Select one or more sources and wait for the preview to show the exact league, team, and player counts before deletion is enabled.',
          'The cleanup removes leagues, teams, and players whose provider is selected. Deleting a selected-source team also deletes every player attached to it, even when a player came from another source. A team from another source under a deleted league is retained without a league.',
        ],
        note: 'Source cleanup does not delete the project, existing export folders, global settings, or saved finder filters. The confirmed database deletion is permanent.',
      },
      {
        badge: 'Global settings',
        title: 'Clear every project',
        paragraphs: [
          'Open General in Global settings and use Clear all projects when every snapshot should be removed. The confirmation shows the project count and permanently deletes every project, league, team, player, and badge assignment.',
          'Export folders created during the current app session are also removed when possible. Any folder that could not be removed is reported and remains available on disk.',
        ],
        note: 'Theme and badge-age settings, custom badge definitions, finder column layouts, saved finder filters, and export column presets are preserved. This action cannot be undone.',
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
          'Select one or more leagues and optionally include teams that are not assigned to a league. Teams belonging to the selected leagues and all players belonging to the included teams are added automatically.',
        ],
      },
      {
        title: 'Choose the columns',
        paragraphs: [
          'Select at least one column for leagues, teams, and players. Defaults include portable identities and football data while leaving project IDs, source URLs, totals, and timestamps available when you need them.',
          'Choose the built-in Default or Full preset, or create reusable presets in Global settings → Columns. Custom presets are available in every project. Changing a preset selection for one export shows Custom (modified) without overwriting the saved preset.',
        ],
      },
      {
        title: 'Choose one of three layouts',
        paragraphs: [
          'JSON writes normalized league, team, and player arrays to three files. Single JSON writes snapshot.json with portable project metadata, selected leagues at the root, and players nested under their teams. CSV writes three UTF-8 tables with stable headers, CRLF rows, and RFC 4180 escaping.',
        ],
      },
      {
        title: 'Create and open the export',
        paragraphs: [
          'Choose a destination directory and review the format, scope, and columns. QDB Downloader creates a collision-safe folder from the project name, reference date, and timestamp, then offers to open it when writing succeeds.',
          'Empty entity selections produce an empty JSON array or a header-only CSV; Single JSON always keeps its project, leagues, and teams structure.',
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

const doc = (path: string, title: string, content: DocContent): Routes[number] => ({
  path,
  title,
  data: { content },
  loadComponent: () => import('./pages/doc-page/doc-page').then((module) => module.DocPage),
});

export const routes: Routes = [
  doc('', 'QDB Downloader documentation', pages['overview']),
  doc('features', 'Features · QDB Downloader', pages['features']),
  doc('download', 'Download · QDB Downloader', pages['download']),
  doc('importing', 'Importing · QDB Downloader', pages['importing']),
  doc('managing-data', 'Managing data · QDB Downloader', pages['managingData']),
  doc('exporting', 'Exporting · QDB Downloader', pages['exporting']),
  doc('development', 'Development · QDB Downloader', pages['development']),
  doc('releases', 'Releases · QDB Downloader', pages['releases']),
  { path: '**', redirectTo: '' },
];
