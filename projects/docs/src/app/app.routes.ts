import type { Routes } from '@angular/router';

import { primaryPages } from './doc-pages-primary';
import { secondaryPages } from './doc-pages-secondary';
import type { DocContent } from './pages/doc-page/doc-page';

const pages: Record<string, DocContent> = {
  ...primaryPages,
  ...secondaryPages,
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
