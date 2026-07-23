import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectHarness } from '@angular/material/select/testing';
import axe from 'axe-core';
import type { League, Team } from '../../../../../shared/contracts';
import { EditEntityDialog, type EditEntityDialogData } from './edit-entity-dialog';

const league = (id: string, name: string): League => ({
  id,
  projectId: 'project-id',
  sourceName: 'transfermarkt',
  sourceId: id,
  name,
  sourceUrl: `https://example.test/${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('EditEntityDialog', () => {
  it('validates identity fields and returns an updated team relationship', async () => {
    const currentLeague = league('GB1', 'Premier League');
    const nextLeague = league('GB2', 'Championship');
    const team: Team = {
      id: '281',
      projectId: 'project-id',
      leagueId: currentLeague.id,
      sourceName: 'transfermarkt',
      sourceId: '281',
      name: 'Manchester City',
      sourceUrl: 'https://example.test/281',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const close = vi.fn();
    const data: EditEntityDialogData = {
      entity: team,
      kind: 'teams',
      leagues: [currentLeague, nextLeague],
    };
    await TestBed.configureTestingModule({
      imports: [EditEntityDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EditEntityDialog);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const inputs = [...element.querySelectorAll<HTMLInputElement>('input')];
    const form = element.querySelector('form');
    const seasonInput = inputs[3];
    const leagueSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '.league-select' }),
    );
    if (!form) throw new Error('Metadata form did not render.');

    expect(element.querySelector('select')).toBeNull();
    expect(await leagueSelect.getValueText()).toBe('Premier League');
    expect(
      [...element.querySelectorAll('mat-hint strong')].map((example) => example.textContent),
    ).toEqual(['281', '2026']);
    expect((await axe.run(element)).violations).toEqual([]);

    seasonInput.value = '20';
    seasonInput.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(close).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Use a four-digit season or leave it empty.');

    seasonInput.value = '2026';
    seasonInput.dispatchEvent(new Event('input', { bubbles: true }));
    await leagueSelect.open();
    await leagueSelect.clickOptions({ text: 'Championship' });
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Manchester City', season: '2026', leagueId: nextLeague.id }),
    );
  });

  it('locks Soccerway, hides its season, validates path IDs, and explains regenerated URLs', async () => {
    const close = vi.fn();
    const team: Team = {
      id: 'team-id',
      projectId: 'project-id',
      sourceName: 'soccerway',
      sourceId: 'slavia-prague/viXGgnyB',
      name: 'Slavia Prague',
      sourceUrl: 'https://www.soccerway.com/team/slavia-prague/viXGgnyB/squad/',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await TestBed.configureTestingModule({
      imports: [EditEntityDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { entity: team, kind: 'teams', leagues: [] } satisfies EditEntityDialogData,
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EditEntityDialog);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const inputs = [...element.querySelectorAll<HTMLInputElement>('input')];
    const provider = inputs[1];
    const sourceId = inputs[2];
    const form = element.querySelector('form');
    if (!form) throw new Error('Soccerway metadata form did not render.');

    expect(provider.readOnly).toBe(true);
    expect(provider.value).toBe('Soccerway');
    expect(element.textContent).not.toContain('Season');
    expect(
      [...element.querySelectorAll('mat-hint strong')].map((example) => example.textContent),
    ).toEqual(['slavia-prague/viXGgnyB']);
    expect(element.textContent).toContain(
      'slavia-prague/viXGgnyB as https://www.soccerway.com/team/slavia-prague/viXGgnyB/squad/',
    );
    expect(element.textContent).toContain(
      'kolar-ondrej/xfBGcS1U becomes https://www.soccerway.com/player/kolar-ondrej/xfBGcS1U/',
    );

    sourceId.value = '281';
    sourceId.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(close).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Use the Soccerway path shown in the example.');

    sourceId.value = 'sparta-prague/hM8p0S1x';
    sourceId.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'sparta-prague/hM8p0S1x',
        season: '',
      }),
    );
  });

  it('locks WorldFootball, hides its season, and validates canonical path IDs', async () => {
    const close = vi.fn();
    const team: Team = {
      id: 'team-id',
      projectId: 'project-id',
      sourceName: 'worldfootball',
      sourceId: 'te237557/artesanos-metepec',
      name: 'Artesanos Metepec',
      sourceUrl: 'https://www.worldfootball.net/teams/te237557/artesanos-metepec/squad/',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await TestBed.configureTestingModule({
      imports: [EditEntityDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { entity: team, kind: 'teams', leagues: [] } satisfies EditEntityDialogData,
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EditEntityDialog);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const inputs = [...element.querySelectorAll<HTMLInputElement>('input')];
    const provider = inputs[1];
    const sourceId = inputs[2];
    const form = element.querySelector('form');
    if (!form) throw new Error('WorldFootball metadata form did not render.');

    expect(provider.value).toBe('WorldFootball');
    expect(element.textContent).not.toContain('Season');
    expect(
      [...element.querySelectorAll('mat-hint strong')].map((example) => example.textContent),
    ).toEqual(['te237557/artesanos-metepec']);
    expect(element.textContent).toContain(
      'pe599828/oscar-altamirano becomes https://www.worldfootball.net/person/pe599828/oscar-altamirano/',
    );

    sourceId.value = 'co7093/mexico-lp---serie-b';
    sourceId.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(close).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Use the WorldFootball path shown in the example.');

    sourceId.value = 'te162876/sporting-caneramy';
    sourceId.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'te162876/sporting-caneramy', season: '' }),
    );
  });
});
