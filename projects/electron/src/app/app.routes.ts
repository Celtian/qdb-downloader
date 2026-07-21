import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Projects · QDB Downloader',
    loadComponent: () =>
      import('./features/projects/projects-page/projects-page').then(
        (module) => module.ProjectsPage,
      ),
  },
  {
    path: 'projects/:projectId',
    loadComponent: () =>
      import('./features/project/project-shell/project-shell').then(
        (module) => module.ProjectShell,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        title: 'Overview · QDB Downloader',
        loadComponent: () =>
          import('./features/project/overview-page/overview-page').then(
            (module) => module.OverviewPage,
          ),
      },
      ...(['leagues', 'teams', 'players'] as const).map((entity) => ({
        path: entity,
        title: `${entity[0].toUpperCase()}${entity.slice(1)} · QDB Downloader`,
        data: { entity },
        loadComponent: () =>
          import('./features/project/entity-table-page/entity-table-page').then(
            (module) => module.EntityTablePage,
          ),
      })),
      {
        path: 'import',
        title: 'Import · QDB Downloader',
        loadComponent: () =>
          import('./features/project/import-page/import-page').then((module) => module.ImportPage),
      },
      {
        path: 'export',
        title: 'Export · QDB Downloader',
        loadComponent: () =>
          import('./features/project/export-page/export-page').then((module) => module.ExportPage),
      },
      {
        path: 'settings',
        title: 'Settings · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/settings-page/settings-page').then(
            (module) => module.SettingsPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
