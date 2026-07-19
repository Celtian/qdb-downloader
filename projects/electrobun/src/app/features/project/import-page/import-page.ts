import { SelectionModel } from '@angular/cdk/collections';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import type {
  ExternalTeam,
  ImportLeague,
  LeaguePreview,
  PlayerInput,
  TeamPreview,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';

interface SelectablePlayer {
  key: string;
  player: PlayerInput;
  selected: boolean;
}

interface SelectableSquad {
  team: TeamPreview;
  players: SelectablePlayer[];
  allSelected: boolean;
}

@Component({
  selector: 'app-import-page',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './import-page.html',
  styleUrl: './import-page.css',
})
export class ImportPage {
  private readonly api = inject(DesktopApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly mode = signal<'league' | 'team'>('league');
  protected readonly name = signal('');
  protected readonly identifier = signal('');
  protected readonly season = signal('');
  protected readonly leaguePreview = signal<LeaguePreview | undefined>(undefined);
  protected readonly teamSelection = new SelectionModel<ExternalTeam>(true);
  protected readonly squads = signal<SelectableSquad[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly jobId = signal('');
  protected readonly progress = this.api.scrapeProgress;
  protected readonly selectedPlayerCount = computed(() =>
    this.squads().reduce(
      (total, squad) => total + squad.players.filter((player) => player.selected).length,
      0,
    ),
  );
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';

  protected changeMode(mode: 'league' | 'team'): void {
    this.mode.set(mode);
    this.leaguePreview.set(undefined);
    this.teamSelection.clear();
    this.squads.set([]);
    this.error.set('');
  }

  protected setName(value: string): void {
    this.name.set(value);
  }
  protected setIdentifier(value: string): void {
    this.identifier.set(value);
  }
  protected setSeason(value: string): void {
    this.season.set(value);
  }

  protected async preview(): Promise<void> {
    this.error.set('');
    if (!this.name().trim()) {
      this.error.set(`${this.mode() === 'league' ? 'League' : 'Team'} name is required.`);
      return;
    }
    this.busy.set(true);
    if (this.mode() === 'league') {
      const result = await this.api.previewLeague({
        identifierOrUrl: this.identifier(),
        season: this.season() || undefined,
      });
      this.busy.set(false);
      if (!result.ok) {
        this.error.set(result.error.message);
        return;
      }
      this.leaguePreview.set(result.value);
      this.teamSelection.clear();
      this.teamSelection.select(...result.value.teams);
      this.squads.set([]);
      return;
    }
    const result = await this.api.previewTeam({
      identifierOrUrl: this.identifier(),
      name: this.name(),
      season: this.season() || undefined,
    });
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.setSquads([result.value]);
  }

  protected async loadSelectedSquads(): Promise<void> {
    if (!this.teamSelection.selected.length) {
      this.error.set('Select at least one team.');
      return;
    }
    const jobId = crypto.randomUUID();
    this.jobId.set(jobId);
    this.busy.set(true);
    this.error.set('');
    const result = await this.api.previewTeams({ jobId, teams: this.teamSelection.selected });
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.setSquads(result.value);
  }

  protected cancel(): void {
    const jobId = this.jobId();
    if (jobId) void this.api.cancelScrape(jobId);
  }

  protected toggleTeam(team: ExternalTeam, selected: boolean): void {
    if (selected) this.teamSelection.select(team);
    else this.teamSelection.deselect(team);
  }

  protected togglePlayer(teamId: string, playerKey: string, selected: boolean): void {
    this.squads.update((squads) =>
      squads.map((squad) => {
        if (squad.team.externalId !== teamId) return squad;
        const players = squad.players.map((player) =>
          player.key === playerKey ? { ...player, selected } : player,
        );
        return { ...squad, players, allSelected: players.every((player) => player.selected) };
      }),
    );
  }

  protected toggleSquad(teamId: string, selected: boolean): void {
    this.squads.update((squads) =>
      squads.map((squad) =>
        squad.team.externalId === teamId
          ? {
              ...squad,
              players: squad.players.map((player) => ({ ...player, selected })),
              allSelected: selected,
            }
          : squad,
      ),
    );
  }

  protected async commit(): Promise<void> {
    const teams = this.squads()
      .map((squad) => ({
        ...squad.team,
        players: squad.players.filter((player) => player.selected).map((player) => player.player),
      }))
      .filter((team) => team.players.length > 0);
    if (!teams.length) {
      this.error.set('Select at least one player to import.');
      return;
    }
    let league: ImportLeague | undefined;
    const preview = this.leaguePreview();
    if (this.mode() === 'league' && preview) {
      league = {
        externalId: preview.externalId,
        name: this.name().trim(),
        season: preview.season,
        sourceUrl: preview.sourceUrl,
      };
    }
    this.busy.set(true);
    const result = await this.api.commitImport({ projectId: this.projectId, league, teams });
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.snackBar.open(
      `Imported ${result.value.teamCount} teams and ${result.value.playerCount} players.`,
      'Dismiss',
      { duration: 5000 },
    );
    await this.router.navigate(['../overview'], { relativeTo: this.route });
  }

  private setSquads(previews: TeamPreview[]): void {
    this.squads.set(
      previews.map((team) => ({
        team,
        allSelected: true,
        players: team.players.map((player, index) => ({
          key: player.externalId ?? `${player.name}:${index}`,
          player,
          selected: true,
        })),
      })),
    );
  }
}
