import { TestBed } from '@angular/core/testing';
import {
  convertToParamMap,
  Router,
  provideRouter,
  type PartialMatchRouteSnapshot,
  type RedirectFunction,
  type UrlTree,
} from '@angular/router';
import { routes } from './app.routes';

describe('application routes', () => {
  it('defines nested lazy global settings pages and separate project settings', () => {
    const globalSettings = routes.find((route) => route.path === 'settings');
    const defaultGlobalSettings = globalSettings?.children?.find((route) => route.path === '');
    const generalSettings = globalSettings?.children?.find((route) => route.path === 'general');
    const badgeSettings = globalSettings?.children?.find((route) => route.path === 'badges');
    const columnSettings = globalSettings?.children?.find((route) => route.path === 'columns');
    const exportSettings = globalSettings?.children?.find((route) => route.path === 'export');
    const combinedBadgeSettings = globalSettings?.children?.find(
      (route) => route.path === 'combined/badges',
    );
    const combinedColumnSettings = globalSettings?.children?.find(
      (route) => route.path === 'combined/columns',
    );
    const projects = routes.find((route) => route.path === 'projects/:projectId');
    const projectSettings = projects?.children?.find((route) => route.path === 'settings');
    const projectLeagues = projects?.children?.find((route) => route.path === 'combined/leagues');
    const combine = projects?.children?.find((route) => route.path === 'combine');
    const combinedImport = projects?.children?.find((route) => route.path === 'combined/import');

    expect(globalSettings?.loadComponent).toBeTypeOf('function');
    expect(defaultGlobalSettings).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'general',
    });
    expect(generalSettings?.title).toBe('General settings · QDB Downloader');
    expect(generalSettings?.loadComponent).toBeTypeOf('function');
    expect(badgeSettings?.title).toBe('Badges · QDB Downloader');
    expect(badgeSettings?.loadComponent).toBeTypeOf('function');
    expect(columnSettings?.title).toBe('Columns · QDB Downloader');
    expect(columnSettings?.loadComponent).toBeTypeOf('function');
    expect(exportSettings?.title).toBe('Export settings · QDB Downloader');
    expect(exportSettings?.loadComponent).toBeTypeOf('function');
    expect(combinedBadgeSettings?.title).toBe('Combined badges · QDB Downloader');
    expect(combinedBadgeSettings?.loadComponent).toBeTypeOf('function');
    expect(combinedColumnSettings?.title).toBe('Combined columns · QDB Downloader');
    expect(combinedColumnSettings?.loadComponent).toBeTypeOf('function');
    expect(projectSettings?.title).toBe('Project settings · QDB Downloader');
    expect(projectSettings?.loadComponent).toBeTypeOf('function');
    expect(projectLeagues?.title).toBe('Project leagues · QDB Downloader');
    expect(combine?.redirectTo).toBeTypeOf('function');
    expect(combinedImport?.title).toBe('Import team · QDB Downloader');
    expect(combinedImport?.loadComponent).toBeTypeOf('function');
  });

  it('redirects legacy Combine URLs to Import and preserves recombination parameters', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);
    const projectRoutes = routes.find((route) => route.path === 'projects/:projectId');
    const redirect = projectRoutes?.children?.find((route) => route.path === 'combine')
      ?.redirectTo as RedirectFunction;

    const snapshot = {
      routeConfig: { path: 'combine' },
      url: [],
      params: { projectId: 'project-1' },
      queryParams: { teamId: 'team-1' },
      fragment: null,
      data: {},
      outlet: 'primary',
      title: undefined,
      paramMap: convertToParamMap({ projectId: 'project-1' }),
      queryParamMap: convertToParamMap({ teamId: 'team-1' }),
    } satisfies PartialMatchRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => redirect(snapshot)) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/projects/project-1/combined/import?teamId=team-1');
  });
});
