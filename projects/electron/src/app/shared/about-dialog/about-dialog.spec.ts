import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import axe from 'axe-core';
import { VERSION_INFO } from '../../../../../version-info';
import { AboutDialogService } from './about-dialog';

@Component({
  imports: [MatButtonModule],
  template: `<button matButton type="button" (click)="openAbout()">About</button>`,
})
class AboutDialogHost {
  private readonly aboutDialog = inject(AboutDialogService);

  protected openAbout(): void {
    this.aboutDialog.open();
  }
}

describe('AboutDialog', () => {
  const configure = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AboutDialogHost, MatDialogModule],
    }).compileComponents();
  };

  it('shows application details and secure external links', async () => {
    await configure();
    const fixture = TestBed.createComponent(AboutDialogHost);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const documentLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'About' }))).click();
    const dialog = await documentLoader.getHarness(MatDialogHarness);
    await fixture.whenStable();

    expect(await dialog.getRole()).toBe('dialog');
    expect(await dialog.getTitleText()).toBe('QDB Downloader');
    expect(await dialog.getText()).toContain(`Version ${VERSION_INFO.version}`);
    expect(await dialog.getContentText()).toContain(
      'Local-first desktop app for creating date-based football-data snapshots from Transfermarkt, Soccerway, and WorldFootball.',
    );
    expect(await dialog.getContentText()).toContain(
      `© ${new Date(VERSION_INFO.date).getUTCFullYear()} ${VERSION_INFO.author.name} · MIT License`,
    );

    const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
    const documentation = overlay?.querySelector<HTMLAnchorElement>(
      'a[href="https://celtian.github.io/qdb-downloader/"]',
    );
    const github = overlay?.querySelector<HTMLAnchorElement>(
      'a[href="https://github.com/Celtian/qdb-downloader"]',
    );
    for (const link of [documentation, github]) {
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toBe('noopener noreferrer');
    }
  });

  it('closes from both controls and Escape and restores trigger focus', async () => {
    await configure();
    const fixture = TestBed.createComponent(AboutDialogHost);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const documentLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    const trigger = await loader.getHarness(MatButtonHarness.with({ text: 'About' }));

    await trigger.focus();
    await trigger.click();
    const topClose = await documentLoader.getHarness(
      MatButtonHarness.with({ selector: '[aria-label="Close About dialog"]' }),
    );
    expect(await topClose.isFocused()).toBe(true);
    await topClose.click();
    await vi.waitFor(async () => {
      expect(await documentLoader.getAllHarnesses(MatDialogHarness)).toHaveLength(0);
    });
    expect(await trigger.isFocused()).toBe(true);

    await trigger.click();
    const footerClose = await documentLoader.getHarness(MatButtonHarness.with({ text: 'Close' }));
    await footerClose.click();
    await vi.waitFor(async () => {
      expect(await documentLoader.getAllHarnesses(MatDialogHarness)).toHaveLength(0);
    });

    await trigger.click();
    await (await documentLoader.getHarness(MatDialogHarness)).close();
    await vi.waitFor(async () => {
      expect(await documentLoader.getAllHarnesses(MatDialogHarness)).toHaveLength(0);
    });
    expect(await trigger.isFocused()).toBe(true);
  });

  it('has no detectable AXE accessibility violations', async () => {
    await configure();
    const fixture = TestBed.createComponent(AboutDialogHost);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'About' }))).click();
    await fixture.whenStable();
    const overlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
    if (!overlay) throw new Error('Dialog overlay was not created.');

    const results = await axe.run(overlay);
    expect(results.violations).toEqual([]);
  });
});
