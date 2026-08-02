import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { Router, type Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import axe from 'axe-core';

import { AboutDialogService } from '../../../shared/about-dialog/about-dialog';
import { GlobalSettingsShell } from './global-settings-shell';

@Component({ selector: 'app-general-test-page', template: '<p>General content</p>' })
class GeneralTestPage {
  protected readonly routeMarker = true;
}

@Component({ selector: 'app-sources-test-page', template: '<p>Sources content</p>' })
class SourcesTestPage {
  protected readonly routeMarker = true;
}

@Component({ selector: 'app-badges-test-page', template: '<p>Badges content</p>' })
class BadgesTestPage {
  protected readonly routeMarker = true;
}

@Component({ selector: 'app-columns-test-page', template: '<p>Columns content</p>' })
class ColumnsTestPage {
  protected readonly routeMarker = true;
}

@Component({
  selector: 'app-combined-badges-test-page',
  template: '<p>Combined badges content</p>',
})
class CombinedBadgesTestPage {
  protected readonly routeMarker = true;
}

@Component({
  selector: 'app-combined-columns-test-page',
  template: '<p>Combined columns content</p>',
})
class CombinedColumnsTestPage {
  protected readonly routeMarker = true;
}

@Component({ selector: 'app-export-test-page', template: '<p>Export content</p>' })
class ExportTestPage {
  protected readonly routeMarker = true;
}

const testRoutes: Routes = [
  { path: '', component: GeneralTestPage },
  {
    path: 'settings',
    component: GlobalSettingsShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'general' },
      { path: 'general', component: GeneralTestPage },
      { path: 'sources', component: SourcesTestPage },
      { path: 'badges', component: BadgesTestPage },
      { path: 'columns', component: ColumnsTestPage },
      { path: 'combined/badges', component: CombinedBadgesTestPage },
      { path: 'combined/columns', component: CombinedColumnsTestPage },
      { path: 'export', component: ExportTestPage },
    ],
  },
];

describe('GlobalSettingsShell', () => {
  it('renders routed navigation, toolbar, and footer actions', async () => {
    const aboutDialog = { open: vi.fn() };
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(testRoutes),
        { provide: AboutDialogService, useValue: aboutDialog },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create('/settings');
    const router = TestBed.inject(Router);
    const fixture = harness.fixture;
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const navigationGroups = [...element.querySelectorAll<HTMLElement>('nav .nav-group')];
    const navigationLinks = [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    const footer = element.querySelector('.sidebar-footer');

    expect(element.querySelector('.settings-layout')).toBeTruthy();
    expect(router.url).toBe('/settings/general');
    expect(element.querySelector('.sidebar')).toBeTruthy();
    expect(
      navigationGroups.map((group) => group.querySelector('.nav-group-label')?.textContent.trim()),
    ).toEqual(['Application', 'Source data', 'Combined data']);
    expect(
      navigationGroups.map((group) =>
        [...group.querySelectorAll('a')].map((link) => link.textContent.trim()),
      ),
    ).toEqual([
      ['tuneGeneral', 'file_downloadExport'],
      ['swap_vertSources', 'sellBadges', 'view_columnColumns'],
      ['sellBadges', 'view_columnColumns'],
    ]);
    expect(element.querySelectorAll('.nav-group + .nav-group')).toHaveLength(2);
    expect(navigationLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/settings/general',
      '/settings/export',
      '/settings/sources',
      '/settings/badges',
      '/settings/columns',
      '/settings/combined/badges',
      '/settings/combined/columns',
    ]);
    expect(navigationLinks.map((link) => link.getAttribute('aria-label'))).toEqual([
      'General',
      'Export',
      'Sources',
      'Badges',
      'Columns',
      'Badges',
      'Columns',
    ]);
    expect(navigationLinks[0].classList).toContain('active');
    expect([...(footer?.children ?? [])].map((item) => item.textContent.trim())).toEqual([
      'infoAbout',
    ]);
    expect(element.querySelector('mat-toolbar')?.textContent).toContain('Global settings');
    expect(element.querySelector('mat-toolbar a')?.textContent).toContain('Projects');
    expect(element.querySelector<HTMLAnchorElement>('.brand')?.getAttribute('href')).toBe('/');
    expect(element.querySelector<HTMLAnchorElement>('mat-toolbar a')?.getAttribute('href')).toBe(
      '/',
    );
    expect(element.querySelector('main#main-content')).toBeTruthy();
    expect(element.querySelector('main#main-content')?.textContent).toContain('General content');

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: 'nav a[href="/settings/badges"]' }))
    ).click();
    await fixture.whenStable();

    expect(router.url).toBe('/settings/badges');
    expect(navigationLinks[3].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain('Badges content');

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'nav a[href="/settings/columns"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(router.url).toBe('/settings/columns');
    expect(navigationLinks[4].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain('Columns content');

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'nav a[href="/settings/combined/badges"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(router.url).toBe('/settings/combined/badges');
    expect(navigationLinks[5].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain(
      'Combined badges content',
    );

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'nav a[href="/settings/combined/columns"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(router.url).toBe('/settings/combined/columns');
    expect(navigationLinks[6].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain(
      'Combined columns content',
    );

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: 'nav a[href="/settings/export"]' }))
    ).click();
    await fixture.whenStable();

    expect(router.url).toBe('/settings/export');
    expect(navigationLinks[1].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain('Export content');

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: 'button.sidebar-action' }))
    ).click();

    expect(aboutDialog.open).toHaveBeenCalledOnce();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('preserves a valid project return URL across settings navigation', async () => {
    const redirectUrl = '/projects/project-1/teams?leagueId=league-1';
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(testRoutes),
        { provide: AboutDialogService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create(
      `/settings?redirectUrl=${encodeURIComponent(redirectUrl)}`,
    );
    const router = TestBed.inject(Router);
    const fixture = harness.fixture;
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const returnLink = element.querySelector<HTMLAnchorElement>('mat-toolbar a');
    const navigationLinks = [...element.querySelectorAll<HTMLAnchorElement>('nav a')];

    expect(router.parseUrl(router.url).queryParams['redirectUrl']).toBe(redirectUrl);
    expect(returnLink?.textContent).toContain('Back to project');
    expect(returnLink?.getAttribute('href')).toBe(redirectUrl);
    expect(
      navigationLinks.map((link) => new URL(link.href).searchParams.get('redirectUrl')),
    ).toEqual(Array.from({ length: navigationLinks.length }, () => redirectUrl));

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'nav a[href^="/settings/badges?"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(router.url).toContain('/settings/badges?');
    expect(router.parseUrl(router.url).queryParams['redirectUrl']).toBe(redirectUrl);
    expect(returnLink?.getAttribute('href')).toBe(redirectUrl);
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('falls back to Projects for an invalid return URL', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(testRoutes),
        { provide: AboutDialogService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create(
      `/settings/general?redirectUrl=${encodeURIComponent('https://example.com/settings')}`,
    );
    const element = harness.fixture.nativeElement as HTMLElement;
    const returnLink = element.querySelector<HTMLAnchorElement>('mat-toolbar a');

    expect(returnLink?.textContent).toContain('Projects');
    expect(returnLink?.getAttribute('href')).toBe('/');
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
