import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { of } from 'rxjs';
import type { ProjectSummary } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ProjectsPage } from './projects-page';

const projectSummary = (
  index: number,
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary => ({
  id: `project-${index}`,
  name: `Snapshot ${index}`,
  referenceDate: `2026-01-${String(index).padStart(2, '0')}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  leagueCount: index,
  teamCount: index * 2,
  playerCount: index * 20,
  sourceNames: [],
  ...overrides,
});

describe('ProjectsPage', () => {
  it('shows settings without an About action in the hero', async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        {
          provide: DesktopApi,
          useValue: { listProjects: vi.fn(() => Promise.resolve({ ok: true, value: [] })) },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const settingsLink = element.querySelector<HTMLAnchorElement>('a[href="/settings"]');
    expect(settingsLink?.textContent).toContain('Settings');
    expect(settingsLink?.getAttribute('aria-label')).toBe('Global settings');
    expect(element.querySelector('.hero-actions')?.textContent).not.toContain('About');
  });

  it('renders project summaries and hides search when there are five cards', async () => {
    const projects = Array.from({ length: 5 }, (_, index) => projectSummary(index + 1));
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        {
          provide: DesktopApi,
          useValue: {
            listProjects: vi.fn(() => Promise.resolve({ ok: true as const, value: projects })),
          },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const firstCard = element.querySelector<HTMLElement>('.project-card');

    expect(element.querySelectorAll('.project-card')).toHaveLength(5);
    expect(element.querySelector('.search-field')).toBeNull();
    expect(
      [...(firstCard?.querySelectorAll('.project-metric') ?? [])].map((metric) => ({
        count: metric.querySelector('dd')?.textContent.trim(),
        label: metric.querySelector('dt')?.textContent.trim(),
      })),
    ).toEqual([
      { count: '1', label: 'Leagues' },
      { count: '2', label: 'Teams' },
      { count: '20', label: 'Players' },
    ]);
    const dateRows = [...(firstCard?.querySelectorAll('.project-date') ?? [])].map((row) => ({
      label: row.querySelector('dt')?.textContent.trim(),
      value: row.querySelector('dd')?.textContent.trim(),
    }));
    expect(dateRows.map(({ label }) => label)).toEqual(['Created', 'Updated']);
    expect(dateRows.every(({ value }) => value?.includes('2026'))).toBe(true);
    expect(firstCard?.querySelector('button[aria-label="Actions for Snapshot 1"]')).toBeTruthy();
    const openProject = firstCard?.querySelector<HTMLAnchorElement>('a[href]');
    expect(openProject?.textContent).toContain('Open project');
    expect(openProject?.getAttribute('href')).toBe('/projects/project-1/overview');
  });

  it('renders a zero-count summary and reveals search after creating the sixth project', async () => {
    const projects = Array.from({ length: 5 }, (_, index) => projectSummary(index + 1));
    const createdProject = projectSummary(6, {
      name: 'New snapshot',
      referenceDate: '2026-07-01',
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    });
    const api = {
      listProjects: vi.fn(() => Promise.resolve({ ok: true as const, value: projects })),
      createProject: vi.fn(() => Promise.resolve({ ok: true as const, value: createdProject })),
    };
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn(() => ({
              afterClosed: () =>
                of({ name: createdProject.name, referenceDate: createdProject.referenceDate }),
            })),
          },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: /New project/ }))).click();
    await vi.waitFor(() => expect(api.createProject).toHaveBeenCalledOnce());
    await fixture.whenStable();

    expect(element.querySelectorAll('.project-card')).toHaveLength(6);
    expect(
      await loader.getAllHarnesses(MatInputHarness.with({ selector: '.search-field input' })),
    ).toHaveLength(1);
    const firstCard = element.querySelector<HTMLElement>('.project-card');
    expect(firstCard?.querySelector('mat-card-title')?.textContent).toContain('New snapshot');
    expect(
      [...(firstCard?.querySelectorAll('.project-metric dd') ?? [])].map((metric) =>
        metric.textContent.trim(),
      ),
    ).toEqual(['0', '0', '0']);
  });

  it('searches six project cards by name and clears empty results accessibly', async () => {
    const projects = [
      projectSummary(1, { name: 'Winter Archive' }),
      projectSummary(2, { name: 'Summer Archive' }),
      ...Array.from({ length: 4 }, (_, index) => projectSummary(index + 3)),
    ];
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        {
          provide: DesktopApi,
          useValue: {
            listProjects: vi.fn(() => Promise.resolve({ ok: true as const, value: projects })),
          },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const search = await loader.getHarness(
      MatInputHarness.with({ selector: '.search-field input' }),
    );

    expect(element.querySelectorAll('.project-card')).toHaveLength(6);
    expect((await axe.run(element)).violations).toEqual([]);

    await search.setValue('  WINTER  ');
    await fixture.whenStable();
    expect(
      [...element.querySelectorAll('mat-card-title')].map((title) => title.textContent.trim()),
    ).toEqual(['Winter Archive']);

    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: 'button[aria-label="Clear project search"]' }),
      )
    ).click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.project-card')).toHaveLength(6);

    await search.setValue('missing');
    await fixture.whenStable();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('No projects found');
    expect(element.querySelectorAll('.project-card')).toHaveLength(0);

    await (await loader.getHarness(MatButtonHarness.with({ text: 'Clear search' }))).click();
    await fixture.whenStable();
    expect(await search.getValue()).toBe('');
    expect(element.querySelectorAll('.project-card')).toHaveLength(6);
  });

  it('clears and hides search when deleting the sixth project', async () => {
    const projects = Array.from({ length: 6 }, (_, index) => projectSummary(index + 1));
    const api = {
      listProjects: vi.fn(() => Promise.resolve({ ok: true as const, value: projects })),
      deleteProject: vi.fn((projectId: string) =>
        Promise.resolve({
          ok: true as const,
          value: { projectId, deletedExportCount: 0, failedExportDirectories: [] },
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        provideRouter([]),
        { provide: DesktopApi, useValue: api },
        {
          provide: MatDialog,
          useValue: { open: vi.fn(() => ({ afterClosed: () => of(true) })) },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const search = await loader.getHarness(
      MatInputHarness.with({ selector: '.search-field input' }),
    );

    await search.setValue('Snapshot 6');
    await fixture.whenStable();
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerIconName: 'more_vert' }));
    await menu.open();
    await menu.clickItem({ text: /Delete$/ });
    await fixture.whenStable();

    expect(api.deleteProject).toHaveBeenCalledWith('project-6');
    expect(
      await loader.getAllHarnesses(MatInputHarness.with({ selector: '.search-field input' })),
    ).toHaveLength(0);
    expect(
      [...element.querySelectorAll('mat-card-title')].map((title) => title.textContent.trim()),
    ).toEqual(['Snapshot 1', 'Snapshot 2', 'Snapshot 3', 'Snapshot 4', 'Snapshot 5']);
  });

  it('renames a project from the project actions menu', async () => {
    const project: ProjectSummary = {
      id: 'project-id',
      name: 'Winter 2026',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 2,
      playerCount: 30,
      sourceNames: ['transfermarkt'],
    };
    const renamedProject = {
      ...project,
      name: 'Summer 2026',
      updatedAt: '2026-01-02T00:00:00.000Z',
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
    expect(
      [...element.querySelectorAll<HTMLElement>('.project-metric dd')].map((metric) =>
        metric.textContent.trim(),
      ),
    ).toEqual(['1', '2', '30']);
    expect(element.querySelector('button[aria-label="Actions for Summer 2026"]')).toBeTruthy();
    expect(snackBar.open).toHaveBeenCalledWith('Project renamed.', 'Dismiss', { duration: 3000 });
  });

  it('confirms deletion, prevents duplicates, and removes the project card', async () => {
    const project: ProjectSummary = {
      id: 'project-id',
      name: 'Winter 2026',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      leagueCount: 1,
      teamCount: 2,
      playerCount: 30,
      sourceNames: ['transfermarkt'],
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
      deleteProject(project: ProjectSummary): void;
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
