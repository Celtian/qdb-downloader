import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { of } from 'rxjs';
import type {
  DeleteAllProjectsResult,
  ProjectSummary,
  Result,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ThemeService, type ThemePreference } from '../../../core/theme.service';
import { GeneralSettingsPage } from './general-settings-page';

@Component({ template: '' })
class TestRoute {
  protected readonly routeMarker = true;
}

const projectSummary = (id: string): ProjectSummary => ({
  id,
  name: `Project ${id}`,
  referenceDate: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  leagueCount: 1,
  teamCount: 2,
  playerCount: 3,
  sourceNames: ['transfermarkt'],
});

interface CreatePageOptions {
  confirmed?: boolean;
  listProjects?: () => Promise<Result<ProjectSummary[]>>;
  deleteResult?: Result<DeleteAllProjectsResult>;
}

describe('GeneralSettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createPage = async ({
    confirmed = true,
    listProjects = () =>
      Promise.resolve({
        ok: true as const,
        value: [projectSummary('one'), projectSummary('two')],
      }),
    deleteResult = {
      ok: true,
      value: {
        deletedProjectCount: 2,
        deletedExportCount: 0,
        failedExportDirectories: [],
      },
    },
  }: CreatePageOptions = {}) => {
    const preference = signal<ThemePreference>('system');
    const theme = {
      preference: preference.asReadonly(),
      setPreference: vi.fn((value: ThemePreference) => preference.set(value)),
    };
    const api = {
      listProjects: vi.fn(listProjects),
      deleteAllProjects: vi.fn(() => Promise.resolve(deleteResult)),
    };
    const dialog = {
      open: vi.fn(() => ({ afterClosed: () => of(confirmed) })),
    };
    const snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GeneralSettingsPage],
      providers: [
        provideRouter([
          { path: '', component: TestRoute },
          { path: 'settings/general', component: TestRoute },
        ]),
        { provide: DesktopApi, useValue: api },
        { provide: ThemeService, useValue: theme },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    await RouterTestingHarness.create('/settings/general');
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(GeneralSettingsPage);
    await fixture.whenStable();
    return {
      api,
      dialog,
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      preference,
      router,
      snackBar,
      theme,
    };
  };

  it('changes the theme and renders accessible general settings with the project count', async () => {
    const { fixture, loader, preference, theme } = await createPage();
    const radios = await loader.getAllHarnesses(MatRadioButtonHarness);
    const clearButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.clear-projects-button' }),
    );
    const element = fixture.nativeElement as HTMLElement;

    expect(await Promise.all(radios.map((radio) => radio.getValue()))).toEqual([
      'system',
      'light',
      'dark',
    ]);
    expect(await radios[0].isChecked()).toBe(true);

    await radios[2].check();
    await fixture.whenStable();

    expect(theme.setPreference).toHaveBeenCalledWith('dark');
    expect(preference()).toBe('dark');
    expect(element.textContent).toContain('General');
    expect(element.textContent).not.toContain('Finder column layouts');
    expect(element.textContent).toContain('Project data');
    expect(element.textContent).toContain('2 projects are currently stored.');
    expect(element.textContent).toContain(
      'Theme, badge settings and custom badge definitions, finder layouts, and saved finder filters',
    );
    expect(await clearButton.isDisabled()).toBe(false);
    expect(element.querySelector('section[aria-labelledby="settings-title"]')).toBeTruthy();
    expect(element.querySelector('main')).toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('confirms clearing all projects and navigates to the empty projects page', async () => {
    const { api, dialog, fixture, loader, router, snackBar } = await createPage();

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: '.clear-projects-button' }))
    ).click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
      data: { projectCount: 2 },
      role: 'alertdialog',
      autoFocus: 'first-tabbable',
    });
    expect(api.deleteAllProjects).toHaveBeenCalledOnce();
    expect(snackBar.open).toHaveBeenCalledWith('2 projects deleted.', 'Dismiss', {
      duration: 4000,
    });
    expect(router.url).toBe('/');
  });

  it('does nothing when project clearing is canceled', async () => {
    const { api, loader, router } = await createPage({ confirmed: false });

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: '.clear-projects-button' }))
    ).click();

    expect(api.deleteAllProjects).not.toHaveBeenCalled();
    expect(router.url).toBe('/settings/general');
  });

  it('stays in settings and reports a bulk deletion failure', async () => {
    const { api, loader, router, snackBar } = await createPage({
      deleteResult: {
        ok: false,
        error: { code: 'DATABASE', message: 'Projects could not be deleted.' },
      },
    });

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: '.clear-projects-button' }))
    ).click();

    expect(api.deleteAllProjects).toHaveBeenCalledOnce();
    expect(snackBar.open).toHaveBeenCalledWith('Projects could not be deleted.', 'Dismiss', {
      duration: 6000,
    });
    expect(router.url).toBe('/settings/general');
  });

  it('reports export cleanup failures as a warning after projects are deleted', async () => {
    const { loader, snackBar } = await createPage({
      deleteResult: {
        ok: true,
        value: {
          deletedProjectCount: 2,
          deletedExportCount: 1,
          failedExportDirectories: ['/locked'],
        },
      },
    });

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: '.clear-projects-button' }))
    ).click();

    expect(snackBar.open).toHaveBeenCalledWith(
      '2 projects deleted. 1 export folder could not be removed.',
      'Dismiss',
      { duration: 8000, panelClass: ['warning-snackbar'] },
    );
  });

  it('disables clearing when there are no projects', async () => {
    const { fixture, loader } = await createPage({
      listProjects: () => Promise.resolve({ ok: true, value: [] }),
    });
    const button = await loader.getHarness(
      MatButtonHarness.with({ selector: '.clear-projects-button' }),
    );
    expect(await button.isDisabled()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      '0 projects are currently stored.',
    );
  });

  it('keeps clearing disabled while the project count is loading', async () => {
    let resolveProjects!: (result: Result<ProjectSummary[]>) => void;
    const pendingProjects = new Promise<Result<ProjectSummary[]>>((resolve) => {
      resolveProjects = resolve;
    });
    const { fixture, loader } = await createPage({
      listProjects: () => pendingProjects,
    });
    const button = await loader.getHarness(
      MatButtonHarness.with({ selector: '.clear-projects-button' }),
    );

    expect(await button.isDisabled()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Checking stored projects…',
    );

    resolveProjects({ ok: true, value: [projectSummary('loaded')] });
    await fixture.whenStable();

    expect(await button.isDisabled()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      '1 project is currently stored.',
    );
  });

  it('disables clearing and reports when the project count cannot be loaded', async () => {
    const { fixture, loader } = await createPage({
      listProjects: () =>
        Promise.resolve({
          ok: false,
          error: { code: 'DATABASE', message: 'Database unavailable.' },
        }),
    });
    const button = await loader.getHarness(
      MatButtonHarness.with({ selector: '.clear-projects-button' }),
    );
    expect(await button.isDisabled()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Project count could not be loaded. Database unavailable.',
    );
  });

  it('prevents duplicate bulk deletion requests while one is pending', async () => {
    let resolveDeletion!: (result: Result<DeleteAllProjectsResult>) => void;
    const pendingDeletion = new Promise<Result<DeleteAllProjectsResult>>((resolve) => {
      resolveDeletion = resolve;
    });
    const { api, fixture } = await createPage();
    api.deleteAllProjects.mockImplementation(() => pendingDeletion);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.clear-projects-button',
    );
    if (!button) throw new Error('Clear projects button was not rendered.');

    button.click();
    button.click();
    await Promise.resolve();

    expect(api.deleteAllProjects).toHaveBeenCalledOnce();
    resolveDeletion({
      ok: false,
      error: { code: 'DATABASE', message: 'Deletion canceled by the test.' },
    });
    await fixture.whenStable();
  });
});
