import type { DocContent } from './pages/doc-page/doc-page';

export const primaryPages: Record<string, DocContent> = {
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
          'Source filter selections are remembered per project and table, including New, Old, and custom badges. Source and combined finders keep independent column visibility and order, including keyboard-accessible reordering. Select records on the current page to manage custom badges, change supported metadata, or review and confirm deletion.',
        ],
        actions: [{ label: 'Manage stored data', route: '/managing-data' }],
      },
      {
        badge: 'Combine',
        title: 'Build one canonical squad from several providers',
        paragraphs: [
          'Link an already imported team from two or more providers, review conservative player matches, correct uncertain identities, and resolve each differing field from the provider you trust.',
          'Project leagues, teams, and players remain separate from source records and can be browsed or exported as their own dataset. Ready and Needs review statuses expose whether every linked source record is still available; combined custom badges and finder filters help classify the canonical result.',
        ],
      },
      {
        badge: '04 · Reuse',
        title: 'Take the whole snapshot with you',
        paragraphs: [
          'Choose leagues and unassigned teams, then combine a reusable visibility preset with a field-name preset. Export the resulting teams and players as separate JSON or CSV files or as one nested JSON snapshot. Built-in camelCase and snake_case names keep output predictable for analysis, scripts, spreadsheets, or archiving.',
          'The export wizard restores the last chosen destination. After an export succeeds, it also remembers the selected dataset, format, visible columns, and output field names across projects.',
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
        badge: 'Combined data',
        title: 'Import and identify players across providers',
        paragraphs: [
          'Choose one stored team or matching teams from up to four providers. QDB Downloader proposes only strong, unambiguous player matches and leaves uncertain players available for manual joining or splitting.',
        ],
        items: [
          'Dynamic Import steps for single-source and cross-provider teams',
          'Selectable resolved players on every summary, including one-click deselection when birthdates are missing',
          'Global drag-and-drop provider priority with keyboard controls',
          'Automatic per-field fallback plus direct value choices',
          'Separate project league, team, and player finders',
          'Ready and Needs review provenance statuses plus combined custom badges and filters',
          'Independent combined-finder column visibility, ordering, and reset controls',
          'Explicit recombination that never silently rewrites canonical records',
          'Individual or checkbox-based bulk deletion of project players without removing source records',
          'Provenance retained when source data is removed',
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
          'Remembered source filter selections plus independent source and combined column layouts',
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
          'Use Global settings to follow the operating-system appearance or choose a persistent light or dark theme, configure when New and Old badges appear, manage source and combined custom badges, configure their independent finder column layouts, and save independent export visibility and field-name presets. The export wizard also restores the destination and the dataset, format, columns, and field names from the last successful export. When opened from a project, the toolbar returns to the same project page. Project settings handles source cleanup and saved filters for only the active project, while Global settings can permanently clear every project after confirmation.',
        ],
      },
      {
        badge: 'Export',
        title: 'Create portable output',
        paragraphs: [
          'Select columns plus leagues or unassigned teams. Their teams and players are included automatically. Choose separate JSON for code and APIs, Single JSON for one nested snapshot, or CSV for spreadsheets and data tools.',
          'Reuse named presets or continue from the exact dataset, format, visibility, and field-name configuration that produced the last successful export.',
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
          'Select New, enter a unique name, and choose the snapshot reference date.',
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
};
