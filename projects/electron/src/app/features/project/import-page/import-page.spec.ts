import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import axe from 'axe-core';
import { of } from 'rxjs';
import type {
  CommitImportRequest,
  League,
  MergeImportOptions,
  Team,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ImportPage } from './import-page';

describe('ImportPage', () => {
  it('shows a supported import icon on the final merge action', async () => {
    const api = { scrapeProgress: signal(undefined).asReadonly() };
    await TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ImportPage);
    const testPage = fixture.componentInstance as unknown as {
      readyToCommit: WritableSignal<boolean>;
    };
    testPage.readyToCommit.set(true);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const importButton = [...element.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Import selection'),
    );

    expect(importButton?.querySelector('mat-icon')?.textContent.trim()).toBe('cloud_download');
  });

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
      listEntities: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          value: { rows: [], total: 0, pageIndex: 0, pageSize: 25 },
        }),
      ),
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
    expect(element.textContent).toContain('The display name saved in your database');
    expect(element.textContent).toContain(
      'Paste a Transfermarkt URL or enter the league ID, e.g. GB1',
    );
    expect(element.textContent).toContain('Four-digit starting year, e.g. 2026');
    expect(element.textContent).toContain('Update behavior');
    expect(element.textContent).toContain('Override existing team names');
    expect(element.textContent).toContain('Override existing player names');
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const teamSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '.absent-team-select' }),
    );
    const playerSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '.absent-player-select' }),
    );
    const teamConflictSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '.team-league-conflict-select' }),
    );
    const playerConflictSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '.player-team-conflict-select' }),
    );
    const teamNameCheckbox = await loader.getHarness(
      MatCheckboxHarness.with({ label: 'Override existing team names' }),
    );
    const playerNameCheckbox = await loader.getHarness(
      MatCheckboxHarness.with({ label: 'Override existing player names' }),
    );
    expect(await teamSelect.getValueText()).toBe('Keep unchanged');
    expect(await playerSelect.getValueText()).toBe('Keep unchanged');
    expect(await teamConflictSelect.getValueText()).toBe('Move to this league');
    expect(await playerConflictSelect.getValueText()).toBe('Move to imported team');
    expect(await teamNameCheckbox.isChecked()).toBe(false);
    expect(await playerNameCheckbox.isChecked()).toBe(false);

    const testPage = fixture.componentInstance as unknown as {
      updateBehaviorModel: WritableSignal<{
        absentTeams: 'keep' | 'detach' | 'delete';
        absentPlayers: 'keep' | 'delete';
        overrideTeamNames: boolean;
        overridePlayerNames: boolean;
        teamLeagueConflicts: 'keep' | 'move';
        playerTeamConflicts: 'keep' | 'move';
      }>;
      clearTarget(reload: boolean): void;
      changeMode(mode: 'league' | 'team'): void;
      applyTarget(target: League | Team): void;
    };
    await teamSelect.open();
    await teamSelect.clickOptions({ text: 'Remove from league' });
    await teamNameCheckbox.check();
    expect(testPage.updateBehaviorModel()).toMatchObject({
      absentTeams: 'detach',
      overrideTeamNames: true,
    });

    testPage.updateBehaviorModel.set({
      absentTeams: 'delete',
      absentPlayers: 'delete',
      overrideTeamNames: true,
      overridePlayerNames: true,
      teamLeagueConflicts: 'keep',
      playerTeamConflicts: 'keep',
    });
    testPage.clearTarget(false);
    expect(testPage.updateBehaviorModel()).toEqual({
      absentTeams: 'keep',
      absentPlayers: 'keep',
      overrideTeamNames: false,
      overridePlayerNames: false,
      teamLeagueConflicts: 'move',
      playerTeamConflicts: 'move',
    });

    const team: Team = {
      id: 'team-id',
      projectId: 'project-id',
      leagueId: target.id,
      source: 'transfermarkt',
      externalId: '281',
      name: 'Manchester City',
      season: '2026',
      sourceUrl: 'https://example.test/281',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    testPage.changeMode('team');
    testPage.applyTarget(team);
    await fixture.whenStable();
    expect(element.textContent).toContain(
      'Paste a Transfermarkt URL or enter the team ID, e.g. 281',
    );
    expect(element.textContent).not.toContain('Absent teams');
    expect(element.textContent).not.toContain('Override existing team names');
    expect(element.textContent).not.toContain('Teams in another league');
    expect(element.textContent).toContain('Absent players');
    expect(element.textContent).toContain('Players in another team');
    expect(element.textContent).toContain('Use Edit to rename this team.');
    const results = await axe.run(element);
    expect(results.violations).toEqual([]);
  });

  it('previews merge conflicts and commits the policies selected in the review', async () => {
    const changes = {
      leagues: { added: 0, updated: 0, preserved: 0, deleted: 0 },
      teams: { added: 0, updated: 1, preserved: 0, moved: 0, detached: 0, deleted: 0 },
      players: {
        added: 0,
        updated: 1,
        preserved: 0,
        moved: 0,
        deduplicated: 0,
        deleted: 0,
      },
    };
    const conflicts = {
      existingRecords: [
        {
          entity: 'teams' as const,
          externalId: '281',
          storedName: 'Stored team',
          incomingName: 'Imported team',
        },
      ],
      teamLeagueConflicts: [],
      playerTeamConflicts: [],
    };
    const api = {
      scrapeProgress: signal(undefined).asReadonly(),
      previewImportChanges: vi.fn((request: CommitImportRequest) => {
        void request;
        return Promise.resolve({ ok: true as const, value: { changes, conflicts } });
      }),
      commitImport: vi.fn((request: CommitImportRequest) => {
        void request;
        return Promise.resolve({
          ok: true as const,
          value: { leagueCount: 0, teamCount: 1, playerCount: 1, changes },
        });
      }),
      getProjectSummary: vi.fn(() => Promise.resolve({ ok: true as const, value: {} })),
    };
    const dialog = {
      open: vi.fn(() => ({
        afterClosed: () =>
          of<MergeImportOptions | undefined>({
            existingRecords: 'keep' as const,
            teamLeagueConflicts: 'keep' as const,
            playerTeamConflicts: 'keep' as const,
          }),
      })),
    };
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    await TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [
        { provide: DesktopApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ projectId: 'project-id' }) } },
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ImportPage);
    const testPage = fixture.componentInstance as unknown as {
      squads: WritableSignal<
        {
          team: {
            externalId: string;
            name: string;
            sourceUrl: string;
            players: { externalId: string; name: string }[];
          };
          players: {
            key: string;
            player: { externalId: string; name: string };
            selected: boolean;
          }[];
          allSelected: boolean;
        }[]
      >;
      readyToCommit: WritableSignal<boolean>;
      commit(): Promise<void>;
    };
    testPage.squads.set([
      {
        team: {
          externalId: '281',
          name: 'Imported team',
          sourceUrl: 'https://example.test/281',
          players: [{ externalId: '10', name: 'Imported player' }],
        },
        players: [
          {
            key: '10',
            player: { externalId: '10', name: 'Imported player' },
            selected: true,
          },
        ],
        allSelected: true,
      },
    ]);
    testPage.readyToCommit.set(true);

    await testPage.commit();

    expect(api.previewImportChanges).toHaveBeenCalledOnce();
    expect(dialog.open).toHaveBeenCalledOnce();
    const committed = api.commitImport.mock.calls[0]?.[0];
    expect(committed.operation).toEqual({
      kind: 'merge',
      options: {
        existingRecords: 'keep',
        teamLeagueConflicts: 'keep',
        playerTeamConflicts: 'keep',
      },
    });
    expect(router.navigate).toHaveBeenCalled();

    api.commitImport.mockClear();
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    await testPage.commit();
    expect(api.commitImport).not.toHaveBeenCalled();
  });
});
