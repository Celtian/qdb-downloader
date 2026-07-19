import type { Routes } from '@angular/router';
import type { DocContent } from './pages/doc-page/doc-page';

const pages: Record<string, DocContent> = {
  overview: {
    eyebrow: 'Desktop snapshots',
    title: 'Football data at a precise point in time',
    summary:
      'QDB Downloader stores normalized Transfermarkt leagues, teams, and players in isolated, date-based SQLite projects.',
    sections: [
      {
        title: 'A project is a snapshot',
        paragraphs: [
          'Create projects such as 2026/1 with a reference date of 2026-01-01. The date is stored as a calendar value and applies to every imported record in that project.',
          'Project names are unique without regard to letter case. Multiple projects may use the same reference date.',
        ],
      },
      {
        title: 'Browse without losing context',
        paragraphs: [
          'The desktop workspace provides overview, leagues, teams, players, import, and export areas. Large tables are searched, sorted, and paged by SQLite.',
        ],
      },
      {
        title: 'Local by design',
        paragraphs: [
          'SQLite and Soccerbot run only in the Electrobun process. The Angular view communicates through a typed RPC boundary and never receives direct filesystem or database access.',
        ],
      },
    ],
  },
  importing: {
    eyebrow: 'Transfermarkt',
    title: 'Preview first, commit once',
    summary:
      'Build a snapshot from selected teams and players without leaving partially imported data.',
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
          'Selected records are upserted inside one SQLite transaction. Cancellation and network failures during preview do not change the database.',
        ],
      },
    ],
  },
  exporting: {
    eyebrow: 'Portable data',
    title: 'Three complete files per export',
    summary: 'Export every league, team, and player from the active project as JSON or CSV.',
    sections: [
      {
        title: 'Predictable output',
        paragraphs: [
          'Choose a destination directory. QDB Downloader creates a collision-safe folder derived from the project name, reference date, and timestamp, then writes leagues, teams, and players separately.',
        ],
      },
      {
        title: 'JSON and CSV',
        paragraphs: [
          'JSON contains normalized arrays. CSV uses stable headers, UTF-8, CRLF rows, and RFC 4180 escaping. Empty data produces an empty array or a header-only CSV.',
        ],
      },
    ],
  },
  development: {
    eyebrow: 'Contributor guide',
    title: 'Strict from the first commit',
    summary:
      'The Bun-managed Angular workspace validates application, desktop, and documentation code together.',
    sections: [
      {
        title: 'Workspace layout',
        paragraphs: [
          'projects/electrobun contains the standalone zoneless desktop renderer, shared RPC contracts, Bun backend, SQLite migrations, and tests. projects/docs contains this statically generated site.',
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
    sections: [
      {
        title: 'Stable tags',
        paragraphs: [
          'Push vMAJOR.MINOR.PATCH from master to run the complete validation pipeline, package an unsigned Windows x64 Electrobun build, and publish artifacts with SHA-256 checksums.',
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
  doc('importing', 'Importing · QDB Downloader', pages['importing']),
  doc('exporting', 'Exporting · QDB Downloader', pages['exporting']),
  doc('development', 'Development · QDB Downloader', pages['development']),
  doc('releases', 'Releases · QDB Downloader', pages['releases']),
  { path: '**', redirectTo: '' },
];
