import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import axe from 'axe-core';
import { AboutDialogService } from '../../../shared/about-dialog/about-dialog';
import { GlobalSettingsShell } from './global-settings-shell';

@Component({ selector: 'app-general-test-page', template: '<p>General content</p>' })
class GeneralTestPage {
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

describe('GlobalSettingsShell', () => {
  it('renders routed navigation, toolbar, and footer actions', async () => {
    const aboutDialog = { open: vi.fn() };
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: GeneralTestPage },
          {
            path: 'settings',
            component: GlobalSettingsShell,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'general' },
              { path: 'general', component: GeneralTestPage },
              { path: 'badges', component: BadgesTestPage },
              { path: 'columns', component: ColumnsTestPage },
            ],
          },
        ]),
        { provide: AboutDialogService, useValue: aboutDialog },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create('/settings');
    const router = TestBed.inject(Router);
    const fixture = harness.fixture;
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const navigationLinks = [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    const footer = element.querySelector('.sidebar-footer');

    expect(element.querySelector('.settings-layout')).toBeTruthy();
    expect(router.url).toBe('/settings/general');
    expect(element.querySelector('.sidebar')).toBeTruthy();
    expect(navigationLinks.map((link) => link.textContent.trim())).toEqual([
      'tuneGeneral',
      'sellBadges',
      'view_columnColumns',
    ]);
    expect(navigationLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/settings/general',
      '/settings/badges',
      '/settings/columns',
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
    expect(navigationLinks[1].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain('Badges content');

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'nav a[href="/settings/columns"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(router.url).toBe('/settings/columns');
    expect(navigationLinks[2].classList).toContain('active');
    expect(element.querySelector('main#main-content')?.textContent).toContain('Columns content');

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: 'button.sidebar-action' }))
    ).click();

    expect(aboutDialog.open).toHaveBeenCalledOnce();
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
