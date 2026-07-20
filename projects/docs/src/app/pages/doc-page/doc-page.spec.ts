import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import axe from 'axe-core';
import { DocPage, type DocContent } from './doc-page';

describe('DocPage', () => {
  const content = {
    eyebrow: 'Get started',
    title: 'Download the app',
    summary: 'Install QDB Downloader on Windows.',
    actions: [
      { label: 'Latest release', href: 'https://example.com/release', primary: true },
      { label: 'Features', route: '/features' },
    ],
    facts: [{ label: 'Platform', value: 'Windows x64' }],
    sections: [
      {
        badge: 'Recommended',
        title: 'Install with Setup',
        paragraphs: ['Use the installer.'],
        items: ['A feature'],
        steps: ['Download the file.', 'Run the installer.'],
        note: 'Verify the checksum.',
      },
    ],
  } satisfies DocContent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { content } } },
        },
      ],
    }).compileComponents();
  });

  it('renders Material actions and cards with facts, lists, steps, and notes', async () => {
    const fixture = TestBed.createComponent(DocPage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('Download the app');
    expect(page.querySelector('.primary-action')?.getAttribute('href')).toBe(
      'https://example.com/release',
    );
    expect(page.querySelector('.primary-action mat-icon')?.textContent).toContain('open_in_new');
    expect(page.querySelector('.facts dd')?.textContent).toContain('Windows x64');
    expect(page.querySelectorAll('mat-card')).toHaveLength(2);
    expect(page.querySelectorAll('ul li')).toHaveLength(1);
    expect(page.querySelectorAll('ol li')).toHaveLength(2);
    expect(page.querySelector('aside')?.textContent).toContain('Verify the checksum');
  });

  it('has no detectable AXE accessibility violations', async () => {
    const fixture = TestBed.createComponent(DocPage);
    await fixture.whenStable();

    const results = await axe.run(fixture.nativeElement as HTMLElement);
    expect(results.violations).toEqual([]);
  });
});
