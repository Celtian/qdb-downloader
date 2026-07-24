import { routes } from './app.routes';

describe('application routes', () => {
  it('defines nested lazy global settings pages and separate project settings', () => {
    const globalSettings = routes.find((route) => route.path === 'settings');
    const defaultGlobalSettings = globalSettings?.children?.find((route) => route.path === '');
    const generalSettings = globalSettings?.children?.find((route) => route.path === 'general');
    const badgeSettings = globalSettings?.children?.find((route) => route.path === 'badges');
    const projects = routes.find((route) => route.path === 'projects/:projectId');
    const projectSettings = projects?.children?.find((route) => route.path === 'settings');

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
    expect(projectSettings?.title).toBe('Project settings · QDB Downloader');
    expect(projectSettings?.loadComponent).toBeTypeOf('function');
  });
});
