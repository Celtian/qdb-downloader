import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { League } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ImportPage } from './import-page';

describe('ImportPage', () => {
  it('loads a row-selected league into locked synchronization mode', async () => {
    const target: League = {
      id: 'league-id',
      projectId: 'project-id',
      source: 'transfermarkt',
      externalId: 'GB1',
      name: 'Premier League',
      season: '2026',
      sourceUrl: 'https://example.test/GB1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const progress = signal(undefined);
    const api = {
      scrapeProgress: progress.asReadonly(),
      getEntity: vi.fn(() => Promise.resolve({ ok: true as const, value: target })),
    };
    await TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
            snapshot: {
              queryParamMap: convertToParamMap({
                operation: 'synchronize',
                entity: 'leagues',
                targetId: 'league-id',
                returnTo: 'leagues',
              }),
            },
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ImportPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const inputs = [...element.querySelectorAll<HTMLInputElement>('.fields input')];

    expect(api.getEntity).toHaveBeenCalledWith('project-id', 'leagues', 'league-id');
    expect(element.textContent).toContain('Update snapshot data');
    expect(element.textContent).toContain('Premier League');
    expect(inputs).toHaveLength(3);
    expect(inputs.every((input) => input.readOnly)).toBe(true);
    expect(inputs.map((input) => input.value)).toEqual(['Premier League', 'GB1', '2026']);
  });
});
