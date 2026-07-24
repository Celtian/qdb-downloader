import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { of } from 'rxjs';
import type {
  DeleteSourceDataResult,
  Result,
  SourceDataDeletionCounts,
  SourceName,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { EntityFilterPreferences } from '../../project/entity-table-page/entity-filter-preferences';
import { ProjectSettingsPage } from './settings-page';

describe('ProjectSettingsPage', () => {
  const sourceDeletionPreview: Result<SourceDataDeletionCounts> = {
    ok: true,
    value: { leagues: 1, teams: 2, players: 30 },
  };
  const sourceDeletionResult: Result<DeleteSourceDataResult> = {
    ok: true,
    value: {
      project: {
        id: 'project-id',
        name: 'Project',
        referenceDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        leagueCount: 0,
        teamCount: 0,
        playerCount: 0,
        sourceNames: [],
      },
      deleted: { leagues: 1, teams: 2, players: 30 },
    },
  };

  const createPage = async ({
    filtersReset = true,
    deleteResult = sourceDeletionResult,
    deletePromise,
    previewResult = sourceDeletionPreview,
    previewPromise,
    previewImplementation,
  }: {
    filtersReset?: boolean;
    deleteResult?: Result<DeleteSourceDataResult>;
    deletePromise?: Promise<Result<DeleteSourceDataResult>>;
    previewResult?: Result<SourceDataDeletionCounts>;
    previewPromise?: Promise<Result<SourceDataDeletionCounts>>;
    previewImplementation?: (
      projectId: string,
      sourceNames: SourceName[],
    ) => Promise<Result<SourceDataDeletionCounts>>;
  } = {}) => {
    const filterPreferences = { resetProject: vi.fn(() => filtersReset) };
    const api = {
      previewSourceDataDeletion: vi.fn(
        previewImplementation ?? (() => previewPromise ?? Promise.resolve(previewResult)),
      ),
      deleteSourceData: vi.fn(() => deletePromise ?? Promise.resolve(deleteResult)),
    };
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ProjectSettingsPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        { provide: EntityFilterPreferences, useValue: filterPreferences },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
          },
        },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectSettingsPage);
    await fixture.whenStable();
    return {
      api,
      dialog,
      filterPreferences,
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
      snackBar,
    };
  };

  it('renders accessible project filters and stored source settings', async () => {
    const { fixture, loader } = await createPage();
    const sourceCheckboxes = await loader.getAllHarnesses(MatCheckboxHarness);
    const deleteButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.delete-button' }),
    );
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Project settings');
    expect(element.textContent).toContain('Finder filters');
    expect(element.textContent).toContain('column layouts, and other projects are not affected');
    expect(
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset project filters' })),
    ).toBeTruthy();
    expect(await Promise.all(sourceCheckboxes.map((checkbox) => checkbox.getLabelText()))).toEqual([
      'Transfermarkt',
      'Soccerway',
      'WorldFootball',
      'Eurofotbal',
    ]);
    expect(await Promise.all(sourceCheckboxes.map((checkbox) => checkbox.isChecked()))).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(await deleteButton.isDisabled()).toBe(true);
    expect(element.textContent).toContain(
      'Select at least one source to preview affected records.',
    );
    const sourceDataCard = element.querySelector<HTMLElement>('mat-card.source-data');
    if (!sourceDataCard) throw new Error('Stored source data card was not rendered.');
    expect(
      getComputedStyle(sourceDataCard).getPropertyValue('--mat-card-outlined-outline-color'),
    ).toBe('var(--mat-sys-error)');
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('resets the current project filters with success feedback', async () => {
    const { filterPreferences, loader, snackBar } = await createPage();

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset project filters' }))
    ).click();

    expect(filterPreferences.resetProject).toHaveBeenCalledWith('project-id');
    expect(snackBar.open).toHaveBeenCalledWith('Project finder filters reset.', 'Dismiss', {
      duration: 3000,
    });
  });

  it('reports when project finder filters cannot be reset', async () => {
    const { loader, snackBar } = await createPage({ filtersReset: false });

    await (
      await loader.getHarness(MatButtonHarness.with({ text: 'Reset project filters' }))
    ).click();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Project finder filters could not be reset.',
      'Dismiss',
      { duration: 6000 },
    );
  });

  it('confirms and deletes selected sources from the current project', async () => {
    const { api, dialog, fixture, loader, snackBar } = await createPage();
    await (await loader.getHarness(MatCheckboxHarness.with({ label: 'Transfermarkt' }))).check();
    await (await loader.getHarness(MatCheckboxHarness.with({ label: 'WorldFootball' }))).check();
    const deleteButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.delete-button' }),
    );

    expect(await deleteButton.isDisabled()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This will delete 1 league, 2 teams, and 30 players.',
    );
    expect(api.previewSourceDataDeletion).toHaveBeenLastCalledWith('project-id', [
      'transfermarkt',
      'worldfootball',
    ]);
    await deleteButton.click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
      data: {
        sourceNames: ['transfermarkt', 'worldfootball'],
        counts: { leagues: 1, teams: 2, players: 30 },
      },
      role: 'alertdialog',
      autoFocus: 'first-tabbable',
    });
    expect(api.deleteSourceData).toHaveBeenCalledWith('project-id', [
      'transfermarkt',
      'worldfootball',
    ]);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Deleted 1 league, 2 teams, and 30 players.',
      'Dismiss',
      { duration: 4000 },
    );
    expect(
      await Promise.all(
        (await loader.getAllHarnesses(MatCheckboxHarness)).map((checkbox) => checkbox.isChecked()),
      ),
    ).toEqual([false, false, false, false]);
    expect(await deleteButton.isDisabled()).toBe(true);
  });

  it('retains selected sources when deletion fails', async () => {
    const { api, fixture, loader, snackBar } = await createPage({
      deleteResult: {
        ok: false,
        error: { code: 'DATABASE', message: 'Source data could not be deleted.' },
      },
    });
    const checkbox = await loader.getHarness(MatCheckboxHarness.with({ label: 'Soccerway' }));
    await checkbox.check();

    await (await loader.getHarness(MatButtonHarness.with({ selector: '.delete-button' }))).click();
    await fixture.whenStable();

    expect(api.deleteSourceData).toHaveBeenCalledWith('project-id', ['soccerway']);
    expect(await checkbox.isChecked()).toBe(true);
    expect(snackBar.open).toHaveBeenCalledWith('Source data could not be deleted.', 'Dismiss', {
      duration: 6000,
    });
  });

  it('keeps deletion disabled while totals load and enables it when they resolve', async () => {
    let resolvePreview!: (result: Result<SourceDataDeletionCounts>) => void;
    const previewPromise = new Promise<Result<SourceDataDeletionCounts>>((resolve) => {
      resolvePreview = resolve;
    });
    const { api, fixture } = await createPage({ previewPromise });
    const component = fixture.componentInstance as unknown as {
      sourceSelection: WritableSignal<Record<SourceName, boolean>>;
    };

    component.sourceSelection.set({
      transfermarkt: true,
      soccerway: false,
      worldfootball: false,
      eurofotbal: false,
    });
    await vi.waitFor(() => expect(api.previewSourceDataDeletion).toHaveBeenCalledOnce());

    const element = fixture.nativeElement as HTMLElement;
    const deleteButton = element.querySelector<HTMLButtonElement>('.delete-button');
    expect(element.textContent).toContain('Calculating affected records…');
    expect(deleteButton?.disabled).toBe(true);

    resolvePreview(sourceDeletionPreview);
    await fixture.whenStable();

    expect(element.textContent).toContain('This will delete 1 league, 2 teams, and 30 players.');
    expect(deleteButton?.disabled).toBe(false);
  });

  it('shows preview failures and keeps deletion disabled', async () => {
    const { fixture, loader } = await createPage({
      previewResult: {
        ok: false,
        error: { code: 'DATABASE', message: 'Counts are unavailable.' },
      },
    });

    await (await loader.getHarness(MatCheckboxHarness.with({ label: 'Soccerway' }))).check();

    const element = fixture.nativeElement as HTMLElement;
    const deleteButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.delete-button' }),
    );
    expect(element.textContent).toContain(
      'Deletion totals could not be loaded. Counts are unavailable.',
    );
    expect(await deleteButton.isDisabled()).toBe(true);
  });

  it('ignores stale preview results after the selected sources change', async () => {
    const requests: {
      sourceNames: SourceName[];
      resolve: (result: Result<SourceDataDeletionCounts>) => void;
    }[] = [];
    const previewImplementation = (
      _projectId: string,
      sourceNames: SourceName[],
    ): Promise<Result<SourceDataDeletionCounts>> =>
      new Promise((resolve) => requests.push({ sourceNames, resolve }));
    const { api, fixture } = await createPage({ previewImplementation });
    const component = fixture.componentInstance as unknown as {
      sourceSelection: WritableSignal<Record<SourceName, boolean>>;
    };

    component.sourceSelection.set({
      transfermarkt: true,
      soccerway: false,
      worldfootball: false,
      eurofotbal: false,
    });
    await vi.waitFor(() => expect(api.previewSourceDataDeletion).toHaveBeenCalledTimes(1));
    component.sourceSelection.set({
      transfermarkt: true,
      soccerway: true,
      worldfootball: false,
      eurofotbal: false,
    });
    await vi.waitFor(() => expect(api.previewSourceDataDeletion).toHaveBeenCalledTimes(2));

    expect(requests.map((request) => request.sourceNames)).toEqual([
      ['transfermarkt'],
      ['transfermarkt', 'soccerway'],
    ]);
    requests[1].resolve({
      ok: true,
      value: { leagues: 4, teams: 5, players: 60 },
    });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This will delete 4 leagues, 5 teams, and 60 players.',
    );

    requests[0].resolve(sourceDeletionPreview);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This will delete 4 leagues, 5 teams, and 60 players.',
    );
  });

  it('disables source controls while deletion is running', async () => {
    let resolveDeletion!: (result: Result<DeleteSourceDataResult>) => void;
    const deletePromise = new Promise<Result<DeleteSourceDataResult>>((resolve) => {
      resolveDeletion = resolve;
    });
    const { fixture, loader } = await createPage({ deletePromise });
    const checkbox = await loader.getHarness(MatCheckboxHarness.with({ label: 'Eurofotbal' }));
    await checkbox.check();
    const deleteButton = await loader.getHarness(
      MatButtonHarness.with({ selector: '.delete-button' }),
    );

    await deleteButton.click();
    await fixture.whenStable();

    expect(await checkbox.isDisabled()).toBe(true);
    expect(await deleteButton.getText()).toContain('Deleting…');

    resolveDeletion(sourceDeletionResult);
    await fixture.whenStable();

    expect(await checkbox.isDisabled()).toBe(false);
  });
});
