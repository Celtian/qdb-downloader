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
    expect(compiled.querySelector('.brand')?.textContent).toContain('QDB Downloader');
    expect(compiled.querySelector('.brand mat-icon')?.textContent).toContain('storage');
  });

  it('should link to feature and download documentation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('header nav a')];

    expect(links.map((link) => link.textContent.trim())).toEqual(
      expect.arrayContaining(['Features', 'Download']),
    );
  });

  it('opens the documentation navigation from the menu button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const menuButton = page.querySelector<HTMLButtonElement>('.menu-button');
    const brand = page.querySelector<HTMLElement>('.brand');

    expect(menuButton?.getAttribute('aria-expanded')).toBe('false');
    expect(brand?.nextElementSibling).toBe(menuButton);
    expect(page.querySelectorAll('.drawer-nav a')).toHaveLength(7);

    menuButton?.click();
    await fixture.whenStable();

    expect(menuButton?.getAttribute('aria-expanded')).toBe('true');

    page.querySelector<HTMLButtonElement>('.drawer-header button')?.click();
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
    const versionLink = footer?.querySelector<HTMLAnchorElement>('.footer-meta a');
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

  it('has no detectable AXE accessibility violations', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.menu-button')
      ?.click();
    await fixture.whenStable();

    const results = await axe.run(fixture.nativeElement as HTMLElement);
    expect(results.violations).toEqual([]);
  });
});
