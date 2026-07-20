import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import type { Project } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ProjectsPage } from './projects-page';

describe('ProjectsPage', () => {
  it('renames a project from the project actions menu', async () => {
    const project: Project = {
      id: 'project-id',
      name: 'Winter 2026',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const renamedProject = {
      ...project,
      name: 'Summer 2026',
      updatedAt: '2026-01-02T00:00:00.000Z',
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    };
    const api = {
      listProjects: vi.fn(() => Promise.resolve({ ok: true as const, value: [project] })),
      renameProject: vi.fn(() => Promise.resolve({ ok: true as const, value: renamedProject })),
    };
    const dialog = {
      open: vi.fn(() => ({ afterClosed: () => of({ name: renamedProject.name }) })),
    };
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));

    await menu.open();
    await menu.clickItem({ text: /Rename$/ });
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        data: { name: 'Winter 2026' },
        autoFocus: 'first-tabbable',
      }),
    );
    expect(api.renameProject).toHaveBeenCalledWith(project.id, 'Summer 2026');
    expect(element.textContent).toContain('Summer 2026');
    expect(element.textContent).not.toContain('Winter 2026');
    expect(element.querySelector('button[aria-label="Actions for Summer 2026"]')).toBeTruthy();
    expect(snackBar.open).toHaveBeenCalledWith('Project renamed.', 'Dismiss', { duration: 3000 });
  });

  it('confirms deletion, prevents duplicates, and removes the project card', async () => {
    const project: Project = {
      id: 'project-id',
      name: 'Winter 2026',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const api = {
      projectUpdated: signal(undefined).asReadonly(),
      listProjects: vi.fn(() => Promise.resolve({ ok: true as const, value: [project] })),
      deleteProject: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: {
            projectId: project.id,
            deletedExportCount: 0,
            failedExportDirectories: ['/locked-export'],
          },
        }),
      ),
    };
    const dialog = {
      open: vi
        .fn()
        .mockReturnValueOnce({ afterClosed: () => of(false) })
        .mockReturnValue({ afterClosed: () => of(true) }),
    };
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));

    expect(element.querySelector('button[aria-label="Actions for Winter 2026"]')).toBeTruthy();
    await menu.open();
    await menu.clickItem({ text: /Delete$/ });
    expect(api.deleteProject).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Winter 2026');

    const testPage = fixture.componentInstance as unknown as {
      deletingProjectId: WritableSignal<string | undefined>;
      deleteProject(project: Project): void;
    };
    testPage.deletingProjectId.set(project.id);
    testPage.deleteProject(project);
    expect(dialog.open).toHaveBeenCalledOnce();
    testPage.deletingProjectId.set(undefined);

    await menu.open();
    await menu.clickItem({ text: /Delete$/ });
    expect(dialog.open).toHaveBeenCalledTimes(2);
    expect(dialog.open.mock.calls[1]?.[1]).toMatchObject({
      data: { name: 'Winter 2026' },
      role: 'alertdialog',
      autoFocus: 'first-tabbable',
    });
    expect(api.deleteProject).toHaveBeenCalledOnce();
    await fixture.whenStable();

    expect(element.textContent).not.toContain('Winter 2026');
    expect(element.textContent).toContain('Create your first snapshot');
    expect(document.activeElement).toBe(element.querySelector('#main-content'));
    expect(snackBar.open).toHaveBeenCalledWith(
      'Project deleted. 1 export folder could not be removed.',
      'Dismiss',
      { duration: 8000, panelClass: ['warning-snackbar'] },
    );
  });
});
