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
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/global-settings-shell/global-settings-shell').then(
        (module) => module.GlobalSettingsShell,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'general' },
      {
        path: 'general',
        title: 'General settings · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/general-settings-page/general-settings-page').then(
            (module) => module.GeneralSettingsPage,
          ),
      },
      {
        path: 'sources',
        title: 'Sources · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/source-settings-page/source-settings-page').then(
            (module) => module.SourceSettingsPage,
          ),
      },
      {
        path: 'badges',
        title: 'Badges · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/badge-settings-page/badge-settings-page').then(
            (module) => module.BadgeSettingsPage,
          ),
      },
      {
        path: 'columns',
        title: 'Columns · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/column-settings-page/column-settings-page').then(
            (module) => module.ColumnSettingsPage,
          ),
      },
      {
        path: 'export',
        title: 'Export settings · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/export-settings-page/export-settings-page').then(
            (module) => module.ExportSettingsPage,
          ),
      },
      {
        path: 'combined/badges',
        title: 'Combined badges · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/combined-badge-settings-page/combined-badge-settings-page').then(
            (module) => module.CombinedBadgeSettingsPage,
          ),
      },
      {
        path: 'combined/columns',
        title: 'Combined columns · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/combined-column-settings-page/combined-column-settings-page').then(
            (module) => module.CombinedColumnSettingsPage,
          ),
      },
    ],
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
      ...(['leagues', 'teams', 'players'] as const).map((entity) => ({
        path: `combined/${entity}`,
        title: `Project ${entity} · QDB Downloader`,
        data: { entity },
        loadComponent: () =>
          import('./features/project/combined-entity-page/combined-entity-page').then(
            (module) => module.CombinedEntityPage,
          ),
      })),
      {
        path: 'combine',
        title: 'Combine data · QDB Downloader',
        loadComponent: () =>
          import('./features/project/combine-page/combine-page').then(
            (module) => module.CombinePage,
          ),
      },
      {
        path: 'combined/import',
        title: 'Import team · QDB Downloader',
        loadComponent: () =>
          import('./features/project/combined-team-import-page/combined-team-import-page').then(
            (module) => module.CombinedTeamImportPage,
          ),
      },
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
        title: 'Project settings · QDB Downloader',
        loadComponent: () =>
          import('./features/settings/settings-page/settings-page').then(
            (module) => module.ProjectSettingsPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
