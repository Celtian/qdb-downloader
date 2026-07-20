import { SelectionModel } from '@angular/cdk/collections';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import type {
  AbsentPlayerPolicy,
  AbsentTeamPolicy,
  CommitImportRequest,
  EditableEntity,
  EditableEntityKind,
  ExternalTeam,
  ImportLeague,
  LeaguePreview,
  PlayerInput,
  SynchronizeImportOperation,
  TeamPreview,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { PositionBadge } from '../../../shared/position-badge/position-badge';
import {
  SyncConfirmationDialog,
  type SyncConfirmationData,
} from '../sync-confirmation-dialog/sync-confirmation-dialog';

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

interface UpdateBehaviorModel {
  absentTeams: AbsentTeamPolicy;
  absentPlayers: AbsentPlayerPolicy;
  overrideTeamNames: boolean;
  overridePlayerNames: boolean;
}

const defaultUpdateBehavior = (): UpdateBehaviorModel => ({
  absentTeams: 'keep',
  absentPlayers: 'keep',
  overrideTeamNames: false,
  overridePlayerNames: false,
});

@Component({
  selector: 'app-import-page',
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    FormField,
    PositionBadge,
  ],
  templateUrl: './import-page.html',
  styleUrl: './import-page.css',
})
export class ImportPage {
  private readonly api = inject(DesktopApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly operation = signal<'merge' | 'synchronize'>('merge');
  protected readonly mode = signal<'league' | 'team'>('league');
  protected readonly name = signal('');
  protected readonly identifier = signal('');
  protected readonly season = signal('');
  protected readonly leaguePreview = signal<LeaguePreview | undefined>(undefined);
  protected readonly teamSelection = new SelectionModel<ExternalTeam>(true);
  protected readonly squads = signal<SelectableSquad[]>([]);
  protected readonly readyToCommit = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly jobId = signal('');
  protected readonly progress = this.api.scrapeProgress;
  protected readonly targetSearch = signal('');
  protected readonly targets = signal<EditableEntity[]>([]);
  protected readonly selectedTarget = signal<EditableEntity | undefined>(undefined);
  protected readonly updateBehaviorModel = signal<UpdateBehaviorModel>(defaultUpdateBehavior());
  protected readonly updateBehaviorForm = form(this.updateBehaviorModel);
  protected readonly isSynchronize = computed(() => this.operation() === 'synchronize');
  protected readonly selectedPlayerCount = computed(() =>
    this.squads().reduce(
      (total, squad) => total + squad.players.filter((player) => player.selected).length,
      0,
    ),
  );
  protected readonly canCommit = computed(() =>
    this.isSynchronize()
      ? Boolean(this.selectedTarget() && this.readyToCommit())
      : this.selectedPlayerCount() > 0,
  );
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  private returnTo: EditableEntityKind | undefined;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
    void this.initializeFromQuery();
  }

  protected changeOperation(operation: 'merge' | 'synchronize'): void {
    if (this.operation() === operation) return;
    this.operation.set(operation);
    this.clearTarget(false);
    this.resetPreview();
    if (operation === 'synchronize') void this.loadTargets('');
  }

  protected changeMode(mode: 'league' | 'team'): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.clearTarget(false);
    this.resetPreview();
    if (this.isSynchronize()) void this.loadTargets('');
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

  protected searchExisting(value: string): void {
    this.targetSearch.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadTargets(value), 250);
  }

  protected selectTarget(event: MatAutocompleteSelectedEvent): void {
    const target = event.option.value as EditableEntity;
    this.applyTarget(target);
  }

  protected clearTarget(reload = true): void {
    this.selectedTarget.set(undefined);
    this.targetSearch.set('');
    this.name.set('');
    this.identifier.set('');
    this.season.set('');
    this.resetPreview();
    this.resetUpdateBehavior();
    if (reload && this.isSynchronize()) void this.loadTargets('');
  }

  protected readonly displayTarget = (target: EditableEntity | string): string =>
    typeof target === 'string' ? target : target.name;

  protected async preview(): Promise<void> {
    this.error.set('');
    if (this.isSynchronize() && !this.selectedTarget()) {
      this.error.set(`Select an existing ${this.mode()} to update.`);
      return;
    }
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
      this.readyToCommit.set(false);
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
      if (this.isSynchronize() && this.mode() === 'league') {
        this.squads.set([]);
        this.readyToCommit.set(true);
        this.error.set('');
        return;
      }
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
    const selectedTeams = this.squads().map((squad) => ({
      ...squad.team,
      players: squad.players.filter((player) => player.selected).map((player) => player.player),
    }));
    const teams = this.isSynchronize()
      ? selectedTeams
      : selectedTeams.filter((team) => team.players.length > 0);
    if (!this.isSynchronize() && !teams.length) {
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
    const target = this.selectedTarget();
    const request: CommitImportRequest = {
      projectId: this.projectId,
      operation:
        this.isSynchronize() && target
          ? this.createSynchronizationOperation(target)
          : { kind: 'merge' },
      league,
      teams,
    };
    if (request.operation.kind === 'synchronize') {
      this.busy.set(true);
      const changeResult = await this.api.previewImportChanges(request);
      this.busy.set(false);
      if (!changeResult.ok) {
        this.error.set(changeResult.error.message);
        return;
      }
      const confirmed = await firstValueFrom(
        this.dialog
          .open<SyncConfirmationDialog, SyncConfirmationData, boolean>(SyncConfirmationDialog, {
            data: {
              name: target?.name ?? this.name(),
              changes: changeResult.value,
              operation: request.operation,
            },
            autoFocus: 'first-tabbable',
          })
          .afterClosed(),
      );
      if (!confirmed) return;
    }
    this.busy.set(true);
    const result = await this.api.commitImport(request);
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    await this.api.getProjectSummary(this.projectId);
    if (this.isSynchronize()) {
      const added =
        result.value.changes.leagues.added +
        result.value.changes.teams.added +
        result.value.changes.players.added;
      const updated =
        result.value.changes.leagues.updated +
        result.value.changes.teams.updated +
        result.value.changes.players.updated;
      const deleted =
        result.value.changes.leagues.deleted +
        result.value.changes.teams.deleted +
        result.value.changes.players.deleted;
      const detached = result.value.changes.teams.detached;
      this.snackBar.open(
        `Update complete. ${added} added, ${updated} updated, ${detached} detached, ${deleted} deleted.`,
        'Dismiss',
        { duration: 5000 },
      );
      await this.router.navigate([`../${this.returnTo ?? `${this.mode()}s`}`], {
        relativeTo: this.route,
      });
      return;
    }
    this.snackBar.open(
      `Imported ${result.value.teamCount} teams and ${result.value.playerCount} players.`,
      'Dismiss',
      { duration: 5000 },
    );
    await this.router.navigate(['../overview'], { relativeTo: this.route });
  }

  private async initializeFromQuery(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const entity = params.get('entity');
    const targetId = params.get('targetId');
    const returnTo = params.get('returnTo');
    if (returnTo === 'leagues' || returnTo === 'teams') this.returnTo = returnTo;
    if (
      params.get('operation') !== 'synchronize' ||
      !targetId ||
      (entity !== 'leagues' && entity !== 'teams')
    ) {
      return;
    }
    this.operation.set('synchronize');
    this.mode.set(entity === 'leagues' ? 'league' : 'team');
    this.busy.set(true);
    const result = await this.api.getEntity(this.projectId, entity, targetId);
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.applyTarget(result.value);
  }

  private applyTarget(target: EditableEntity): void {
    this.resetUpdateBehavior();
    this.selectedTarget.set(target);
    this.targetSearch.set(target.name);
    this.name.set(target.name);
    this.identifier.set(target.externalId);
    this.season.set(target.season ?? '');
    this.resetPreview();
  }

  private async loadTargets(search: string): Promise<void> {
    const entity: EditableEntityKind = this.mode() === 'league' ? 'leagues' : 'teams';
    const result = await this.api.listEntities({
      projectId: this.projectId,
      entity,
      pageIndex: 0,
      pageSize: 25,
      search,
      sort: 'name',
      direction: 'asc',
    });
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.targets.set(result.value.rows as EditableEntity[]);
  }

  private resetPreview(): void {
    this.leaguePreview.set(undefined);
    this.teamSelection.clear();
    this.squads.set([]);
    this.readyToCommit.set(false);
    this.error.set('');
  }

  private resetUpdateBehavior(): void {
    this.updateBehaviorModel.set(defaultUpdateBehavior());
  }

  private createSynchronizationOperation(target: EditableEntity): SynchronizeImportOperation {
    const behavior = this.updateBehaviorModel();
    if (this.mode() === 'league') {
      return {
        kind: 'synchronize',
        target: { entity: 'leagues', id: target.id },
        options: {
          absentTeams: behavior.absentTeams,
          absentPlayers: behavior.absentPlayers,
          overrideTeamNames: behavior.overrideTeamNames,
          overridePlayerNames: behavior.overridePlayerNames,
        },
      };
    }
    return {
      kind: 'synchronize',
      target: { entity: 'teams', id: target.id },
      options: {
        absentPlayers: behavior.absentPlayers,
        overridePlayerNames: behavior.overridePlayerNames,
      },
    };
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
    this.readyToCommit.set(true);
  }
}
