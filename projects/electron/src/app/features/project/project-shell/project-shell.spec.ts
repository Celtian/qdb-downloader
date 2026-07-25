import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import axe from 'axe-core';
import type { ProjectSummary } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { AboutDialogService } from '../../../shared/about-dialog/about-dialog';
import { ProjectShell } from './project-shell';

@Component({ selector: 'app-test-project-page', template: '<p>Teams content</p>' })
class TestProjectPage {
  protected readonly routeMarker = true;
}

@Component({ selector: 'app-project-export-test-page', template: '<p>Export content</p>' })
class ProjectExportTestPage {
  protected readonly routeMarker = true;
}

describe('ProjectShell', () => {
  it('renders project navigation and footer actions inside a selected project', async () => {
    const aboutDialog = { open: vi.fn() };
    const project: ProjectSummary = {
      id: 'project-1',
      name: '2026/1',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
      sourceNames: [],
    };
    await TestBed.configureTestingModule({
      imports: [ProjectShell],
      providers: [
        provideRouter([
          {
            path: 'projects/:projectId',
            component: ProjectShell,
            children: [
              { path: 'teams', component: TestProjectPage },
              { path: 'export', component: ProjectExportTestPage },
            ],
          },
        ]),
        {
          provide: DesktopApi,
          useValue: {
            projectUpdated: signal(undefined).asReadonly(),
            getProjectSummary: vi.fn(() =>
              Promise.resolve({
                ok: true as const,
                value: project,
              }),
            ),
          },
        },
        { provide: AboutDialogService, useValue: aboutDialog },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create(
      '/projects/project-1/teams?leagueId=league-1',
    );
    const fixture = harness.fixture;
    const router = TestBed.inject(Router);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const navigationGroups = [...element.querySelectorAll<HTMLElement>('nav .nav-group')];
    const navigationLinks = [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    const footer = element.querySelector('.sidebar-footer');
    const toolbarLinks = [...element.querySelectorAll<HTMLAnchorElement>('mat-toolbar a')];
    const globalSettingsUrl = new URL(toolbarLinks[0].href);

    expect(element.querySelector('.sidebar')).toBeTruthy();
    expect(
      navigationGroups.map((group) => group.querySelector('.nav-group-label')?.textContent.trim()),
    ).toEqual(['Project', 'Source data', 'Combined data']);
    expect(
      navigationGroups.map((group) =>
        [...group.querySelectorAll('a')].map((link) => link.textContent.trim()),
      ),
    ).toEqual([
      ['dashboardOverview', 'settingsSettings', 'file_downloadExport'],
      ['cloud_downloadImport', 'emoji_eventsLeagues', 'shieldTeams', 'groupsPlayers'],
      ['mergeCombine', 'emoji_eventsLeagues', 'shieldTeams', 'groupsPlayers'],
    ]);
    expect(element.querySelectorAll('.nav-group + .nav-group')).toHaveLength(2);
    expect(navigationLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/projects/project-1/overview',
      '/projects/project-1/settings',
      '/projects/project-1/export',
      '/projects/project-1/import',
      '/projects/project-1/leagues',
      '/projects/project-1/teams',
      '/projects/project-1/players',
      '/projects/project-1/combine',
      '/projects/project-1/combined/leagues',
      '/projects/project-1/combined/teams',
      '/projects/project-1/combined/players',
    ]);
    expect([...(footer?.children ?? [])].map((item) => item.textContent.trim())).toEqual([
      'infoAbout',
    ]);
    expect(
      element.querySelector<HTMLAnchorElement>('nav a[href$="/settings"]')?.textContent.trim(),
    ).toBe('settingsSettings');
    expect(footer?.querySelector<HTMLAnchorElement>('a[href$="/settings"]')).toBeNull();
    expect(element.querySelector('mat-toolbar')?.textContent).toContain('2026/1');
    expect(toolbarLinks.map((link) => link.textContent.trim())).toEqual([
      'settings Global settings',
      'arrow_backProjects',
    ]);
    expect(globalSettingsUrl.pathname).toBe('/settings');
    expect(globalSettingsUrl.searchParams.get('redirectUrl')).toBe(
      '/projects/project-1/teams?leagueId=league-1',
    );
    expect(toolbarLinks[1].getAttribute('href')).toBe('/');

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'nav a[href="/projects/project-1/export"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(router.url).toBe('/projects/project-1/export');
    expect(navigationLinks[2].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain('Export content');

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: 'button.sidebar-action' }))
    ).click();

    expect(aboutDialog.open).toHaveBeenCalledOnce();
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
