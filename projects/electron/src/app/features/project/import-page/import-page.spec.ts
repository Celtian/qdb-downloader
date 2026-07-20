import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { League, Team } from '../../../../../shared/contracts';
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
    const teamNameCheckbox = await loader.getHarness(
      MatCheckboxHarness.with({ label: 'Override existing team names' }),
    );
    const playerNameCheckbox = await loader.getHarness(
      MatCheckboxHarness.with({ label: 'Override existing player names' }),
    );
    expect(await teamSelect.getValueText()).toBe('Keep unchanged');
    expect(await playerSelect.getValueText()).toBe('Keep unchanged');
    expect(await teamNameCheckbox.isChecked()).toBe(false);
    expect(await playerNameCheckbox.isChecked()).toBe(false);

    const testPage = fixture.componentInstance as unknown as {
      updateBehaviorModel: WritableSignal<{
        absentTeams: 'keep' | 'detach' | 'delete';
        absentPlayers: 'keep' | 'delete';
        overrideTeamNames: boolean;
        overridePlayerNames: boolean;
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
    });
    testPage.clearTarget(false);
    expect(testPage.updateBehaviorModel()).toEqual({
      absentTeams: 'keep',
      absentPlayers: 'keep',
      overrideTeamNames: false,
      overridePlayerNames: false,
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
    expect(element.textContent).not.toContain('Absent teams');
    expect(element.textContent).not.toContain('Override existing team names');
    expect(element.textContent).toContain('Absent players');
    expect(element.textContent).toContain('Use Edit to rename this team.');
  });
});
