import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { of } from 'rxjs';
import type { ProjectSummary } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { OverviewPage } from './overview-page';

describe('OverviewPage', () => {
  it('offers rename and confirmed deletion, then returns to projects', async () => {
    const project: ProjectSummary = {
      id: 'project-id',
      name: 'Winter 2026',
      referenceDate: '2026-01-01',
      leagueCount: 1,
      teamCount: 2,
      playerCount: 30,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const api = {
      projectUpdated: signal(undefined).asReadonly(),
      getProjectSummary: vi.fn(() => Promise.resolve({ ok: true as const, value: project })),
      deleteProject: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            projectId: project.id,
            deletedExportCount: 1,
            failedExportDirectories: [],
          },
        }),
      ),
    };
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
    const snackBar = { open: vi.fn() };
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    await TestBed.configureTestingModule({
      imports: [OverviewPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: project.id }) } },
          },
        },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatMenuHarness.with({ triggerIconName: 'more_vert' }),
    );

    expect(element.querySelector('button[aria-label="Actions for Winter 2026"]')).toBeTruthy();
    expect((await axe.run(element)).violations).toEqual([]);
    await menu.open();
    const itemTexts = await Promise.all((await menu.getItems()).map((item) => item.getText()));
    expect(itemTexts.some((text) => text.endsWith('Rename'))).toBe(true);
    expect(itemTexts.some((text) => text.endsWith('Delete'))).toBe(true);
    await menu.clickItem({ text: /Delete$/ });
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
      data: { name: 'Winter 2026' },
      role: 'alertdialog',
      autoFocus: 'first-tabbable',
    });
    expect(api.deleteProject).toHaveBeenCalledWith(project.id);
    expect(snackBar.open).toHaveBeenCalledWith('Project and 1 export folder deleted.', 'Dismiss', {
      duration: 4000,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
  });
});
