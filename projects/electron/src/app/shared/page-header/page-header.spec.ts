import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import axe from 'axe-core';

import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header
      eyebrow="Combined data"
      description="Browse the leagues in this snapshot."
      headingId="leagues-heading"
      [heading]="heading"
    >
      <button pageHeaderTitleAction type="button">Title action</button>
      <a pageHeaderActions href="/import">Page action</a>
    </app-page-header>
  `,
})
class TestHost {
  protected readonly heading = 'Leagues';
}

describe('PageHeader', () => {
  it('renders the labelled heading, supporting copy, and projected actions', async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const heading = element.querySelector('h1');

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(heading?.id).toBe('leagues-heading');
    expect(heading?.textContent).toContain('Leagues');
    expect(element.querySelector('header > div > p:first-child')?.textContent).toContain(
      'Combined data',
    );
    expect(element.querySelector('header > div > p:last-child')?.textContent).toContain(
      'Browse the leagues in this snapshot.',
    );
    expect(element.querySelector('button[pageheadertitleaction]')?.textContent).toContain(
      'Title action',
    );
    expect(element.querySelector('a[pageheaderactions]')?.textContent).toContain('Page action');
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
