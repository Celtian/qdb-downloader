import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNullable } from 'ngx-nullable';
import { of } from 'rxjs';
import type { League } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { EntityTablePage } from './entity-table-page';

describe('EntityTablePage', () => {
  it('shows accessible edit and refresh actions for league rows', async () => {
    const league: League = {
      id: 'league-id',
      projectId: 'project-id',
      source: 'transfermarkt',
      externalId: 'GB1',
      name: 'Premier League',
      season: '2026',
      sourceUrl: 'https://example.test/GB1',
      teamCount: 20,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const api = {
      listEntities: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { rows: [league], total: 1, pageIndex: 0, pageSize: 25 },
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [EntityTablePage],
      providers: [
        provideNullable(),
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
            snapshot: { data: { entity: 'leagues' } },
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntityTablePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(api.listEntities).toHaveBeenCalled();
    expect(element.querySelector('button[aria-label="Edit Premier League"]')).toBeTruthy();
    expect(
      element.querySelector('button[aria-label="Refresh data for Premier League"]'),
    ).toBeTruthy();
  });
});
