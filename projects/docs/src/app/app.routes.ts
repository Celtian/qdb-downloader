import type { Routes } from '@angular/router';
import type { DocContent } from './pages/doc-page/doc-page';

const pages: Record<string, DocContent> = {
  overview: {
    eyebrow: 'Local-first desktop app',
    title: 'Football data, frozen at the date you choose',
    summary:
      'Create focused Transfermarkt snapshots, review every import, browse normalized leagues, teams, and players, then export the complete dataset when you need it.',
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
      { label: 'Exports', value: 'JSON, nested JSON, and CSV' },
    ],
    sections: [
      {
        badge: '01 · Organize',
        title: 'A project is a snapshot',
        paragraphs: [
          'Create projects such as 2026/1 with a reference date of 2026-01-01. The date is stored as a calendar value and applies to every imported record in that project.',
          'Project names are unique without regard to letter case. Multiple projects may use the same reference date.',
        ],
      },
      {
        badge: '02 · Collect',
        title: 'Choose what enters your data',
        paragraphs: [
          'Preview a Transfermarkt league or team before anything is saved. Select the squads and individual players that belong in the snapshot, then review conflicts and commit the change as one transaction.',
        ],
      },
      {
        badge: '03 · Explore',
        title: 'Browse without losing context',
        paragraphs: [
          'Search, filter, sort, page, and customize columns across league, team, and player tables. Follow a league into its teams and a team into its players while staying inside the active snapshot.',
        ],
      },
      {
        badge: '04 · Reuse',
        title: 'Take the whole snapshot with you',
        paragraphs: [
          'Export selected leagues, teams, and players as separate JSON or CSV files, or keep players nested under teams in one JSON snapshot. The output is complete and predictable, ready for analysis, scripts, spreadsheets, or archiving.',
        ],
      },
      {
        badge: 'Privacy',
        title: 'Local by design',
        paragraphs: [
          'Your projects live in a local SQLite database. SQLite and Soccerbot run only in the Electron main process, while the Angular interface stays behind a typed, restricted desktop boundary.',
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
    ],
    sections: [
      {
        badge: 'Snapshots',
        title: 'Separate projects by date',
        paragraphs: [
          'Give each project a name and a required reference date. Every project remains isolated, so you can keep multiple historical or planned datasets side by side.',
        ],
        items: [
          'Timezone-independent calendar dates',
          'At-a-glance league, team, and player totals',
          'Rename or delete projects from the project list',
        ],
      },
      {
        badge: 'Import',
        title: 'Preview before saving',
        paragraphs: [
          'Start with a supported Transfermarkt URL or ID, load its data, and narrow the result before it reaches the database.',
        ],
        items: [
          'League and direct-team import workflows',
          'Optional source season independent of the reference date',
          'Team, squad, and individual-player selection',
        ],
      },
      {
        badge: 'Updates',
        title: 'Control conflicts and ownership',
        paragraphs: [
          'Refresh existing sources without blindly overwriting the snapshot. Review matching identities and decide how names, missing records, leagues, and teams should be handled.',
        ],
        items: [
          'Keep, move, detach, refresh, or delete records',
          'Independent team and player ownership choices',
          'One final synchronization summary before commit',
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
          'Filters for parents, seasons, nationalities, positions, and preferred foot',
          'Remembered column visibility for each table',
        ],
      },
      {
        badge: 'Edit',
        title: 'Correct source metadata',
        paragraphs: [
          'Edit league and team names, Transfermarkt identities, source seasons, and league relationships. Source links are regenerated and duplicate source identities are rejected.',
        ],
      },
      {
        badge: 'Export',
        title: 'Create portable output',
        paragraphs: [
          'Choose separate JSON for code and APIs, Single JSON for one nested snapshot, or CSV for spreadsheets and data tools. Every export is written to a collision-safe folder.',
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
          'QDB Downloader stores its project database locally. An internet connection is required when fetching or refreshing Transfermarkt data.',
        ],
        steps: [
          'Select New project, enter a unique name, and choose the snapshot reference date.',
          'Open the project and select Import.',
          'Enter a league or team name plus a supported Transfermarkt URL or ID.',
          'Preview the result, select teams and players, then confirm the import.',
          'Browse the saved records or export the complete snapshot as separate JSON, nested JSON, or CSV.',
        ],
        actions: [{ label: 'Continue to importing', route: '/importing' }],
        wide: true,
      },
    ],
  },
  importing: {
    eyebrow: 'Transfermarkt',
    title: 'Preview first, commit once',
    summary:
      'Build a snapshot from selected teams and players without leaving partially imported data.',
    actions: [
      { label: 'Download QDB Downloader', route: '/download', primary: true },
      { label: 'Review all features', route: '/features' },
    ],
    sections: [
      {
        title: 'League workflow',
        paragraphs: [
          'Enter a league ID or supported Transfermarkt URL, a display name, and an optional source season. Preview its teams, choose the squads to fetch, then select individual players.',
        ],
      },
      {
        title: 'Team workflow',
        paragraphs: [
          'A team can also be fetched directly. Players are always selected from its returned squad because Soccerbot does not expose a direct single-player scraper.',
        ],
      },
      {
        title: 'Transactional commit',
        paragraphs: [
          'Selected records are written inside one SQLite transaction. Cancellation and network failures during preview do not change the database.',
          'When a new import matches stored Transfermarkt identities, review the conflicts before committing. You can keep or refresh stored data and independently keep or move team and player ownership.',
        ],
      },
      {
        title: 'Updating existing data',
        paragraphs: [
          'Use Refresh from a league or team table, or choose Update existing on Import. The checked preview becomes authoritative: unchecked stored teams and players are removed only after an add, refresh, preserve, move, detach, deduplicate, and delete summary is confirmed.',
        ],
      },
      {
        title: 'Editing source metadata',
        paragraphs: [
          'League and team table actions can change names, Transfermarkt IDs, seasons, and team-to-league relationships. Source URLs are regenerated and conflicting source identities are rejected.',
        ],
      },
    ],
  },
  exporting: {
    eyebrow: 'Portable data',
    title: 'Portable exports for every workflow',
    summary:
      'Export selected leagues, teams, and players as separate JSON or CSV files, or as one nested JSON snapshot.',
    actions: [{ label: 'Download QDB Downloader', route: '/download', primary: true }],
    sections: [
      {
        title: 'Predictable output',
        paragraphs: [
          'Choose a destination directory. QDB Downloader creates a collision-safe folder derived from the project name, reference date, and timestamp, then writes either separate entity files or one snapshot.json file.',
        ],
      },
      {
        title: 'Three export layouts',
        paragraphs: [
          'JSON writes normalized league, team, and player arrays to separate files. Single JSON adds portable project metadata and nests every selected player under its team, while keeping selected leagues at the root. CSV uses stable headers, UTF-8, CRLF rows, and RFC 4180 escaping. Empty data produces an empty array or a header-only CSV.',
        ],
      },
    ],
  },
  development: {
    eyebrow: 'Contributor guide',
    title: 'Strict from the first commit',
    summary:
      'The Bun-managed Angular workspace validates application, desktop, and documentation code together.',
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
        title: 'Workspace layout',
        paragraphs: [
          'projects/electron contains the standalone zoneless renderer, shared IPC contracts, Electron main and preload code, SQLite migrations, and tests. projects/docs contains this statically generated site.',
        ],
        code: 'bun install\nbun run start\nbun run validate',
      },
      {
        title: 'Quality gates',
        paragraphs: [
          'TypeScript strict mode, typed ESLint, Angular template accessibility checks, Prettier, Vitest, lint-staged, Commitlint, and Husky are enforced through root scripts and CI.',
        ],
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
          'Push vMAJOR.MINOR.PATCH from master to run the complete validation pipeline, package unsigned Windows x64 Squirrel and ZIP builds with Electron Forge, and publish artifacts with SHA-256 checksums.',
        ],
      },
      {
        title: 'Documentation',
        paragraphs: [
          'The static documentation is built with the /qdb-downloader/ base path and deployed to GitHub Pages only after the release succeeds.',
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
  doc('exporting', 'Exporting · QDB Downloader', pages['exporting']),
  doc('development', 'Development · QDB Downloader', pages['development']),
  doc('releases', 'Releases · QDB Downloader', pages['releases']),
  { path: '**', redirectTo: '' },
];
