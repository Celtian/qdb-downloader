import { routes } from './app.routes';

describe('application routes', () => {
  it('defines separate lazy global and project settings routes', () => {
    const globalSettings = routes.find((route) => route.path === 'settings');
    const projects = routes.find((route) => route.path === 'projects/:projectId');
    const projectSettings = projects?.children?.find((route) => route.path === 'settings');

    expect(globalSettings?.title).toBe('Global settings · QDB Downloader');
    expect(projectSettings?.title).toBe('Project settings · QDB Downloader');
    expect(globalSettings?.loadComponent).toBeTypeOf('function');
    expect(projectSettings?.loadComponent).toBeTypeOf('function');
  });
});
