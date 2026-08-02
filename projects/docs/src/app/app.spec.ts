import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import axe from 'axe-core';
import { provideAppVersion } from 'ngx-app-version';

import { VERSION_INFO } from '../../../version-info';
import { App } from './app';
import { siteMetadata } from './site-metadata';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideAppVersion({ version: VERSION_INFO.version })],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the product name', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const brand = compiled.querySelector('a[aria-label="QDB Downloader documentation overview"]');

    expect(brand?.textContent).toContain('QDB Downloader');
    expect(brand?.querySelector('mat-icon')?.textContent).toContain('storage');
  });

  it('should link to feature, download, and data-management documentation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('header nav a')];

    expect(links.map((link) => link.textContent.trim())).toEqual(
      expect.arrayContaining(['Features', 'Download', 'Managing data']),
    );
  });

  it('opens the documentation navigation from the menu button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const menuButton = page.querySelector<HTMLButtonElement>(
      'button[aria-label="Open documentation navigation"]',
    );
    const brand = page.querySelector<HTMLElement>(
      'a[aria-label="QDB Downloader documentation overview"]',
    );

    expect(menuButton?.getAttribute('aria-expanded')).toBe('false');
    expect(brand?.nextElementSibling).toBe(menuButton);
    expect(page.querySelectorAll('#documentation-navigation a')).toHaveLength(8);
    expect(
      [...page.querySelectorAll('#documentation-navigation a')].map((link) =>
        link.textContent.trim(),
      ),
    ).toContain('Managing data');

    menuButton?.click();
    await fixture.whenStable();

    expect(menuButton?.getAttribute('aria-expanded')).toBe('true');

    page
      .querySelector<HTMLButtonElement>('button[aria-label="Close documentation navigation"]')
      ?.click();
    await fixture.whenStable();

    expect(menuButton?.getAttribute('aria-expanded')).toBe('false');
  });

  it('exposes the generated version on the root element', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.getAttribute('app-version')).toBe(VERSION_INFO.version);
  });

  it('renders generated version metadata in the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer');
    const versionLink = footer?.querySelector<HTMLAnchorElement>(
      `a[href="${siteMetadata.links.version}"]`,
    );
    const versionInfo = VERSION_INFO as {
      version: string;
      date: string;
      author: { name: string };
      git?: { branch: string; commit: string };
    };

    expect(Number.isNaN(Date.parse(versionInfo.date))).toBe(false);
    expect(siteMetadata.version).toBe(versionInfo.version);
    expect(versionInfo.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
    expect(versionInfo.author.name).toBe('Dominik Hladík');
    if (versionInfo.git) {
      expect(versionInfo.git.branch).toBeTruthy();
      expect(versionInfo.git.commit).toMatch(/^[0-9a-f]{40}$/);
    }
    expect(footer?.textContent).toContain(`QDB Downloader ${siteMetadata.versionLabel}`);
    expect(footer?.textContent).toContain(String(siteMetadata.copyrightYear));
    expect(versionLink?.href).toBe(siteMetadata.links.version);
  });

  it('invites users to star the GitHub repository', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const starLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'nav[aria-label="Project links"] a[href="https://github.com/Celtian/qdb-downloader"]',
    );

    expect(starLink?.textContent).toContain('Star on GitHub');
    expect(starLink?.querySelector('mat-icon')?.textContent).toContain('star');
    expect(starLink?.href).toBe('https://github.com/Celtian/qdb-downloader');
    expect(starLink?.target).toBe('_blank');
    expect(starLink?.rel).toBe('noopener noreferrer');
    expect(starLink?.getAttribute('aria-label')).toBe('Star on GitHub (opens in a new tab)');
  });

  it('has no detectable AXE accessibility violations', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Open documentation navigation"]')
      ?.click();
    await fixture.whenStable();

    const results = await axe.run(fixture.nativeElement as HTMLElement);
    expect(results.violations).toEqual([]);
  });
});
