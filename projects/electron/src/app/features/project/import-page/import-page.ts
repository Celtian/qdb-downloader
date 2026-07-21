import { SelectionModel } from '@angular/cdk/collections';
import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  AbsentPlayerPolicy,
  AbsentTeamPolicy,
  CommitImportRequest,
  EditableEntity,
  EditableEntityKind,
  ExternalTeam,
  ImportLeague,
  ImportPreview,
  LeaguePreview,
  MergeImportOptions,
  OwnershipConflictPolicy,
  PlayerInput,
  SynchronizeImportOperation,
  TeamPreview,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { PageHeader } from '../../../shared/page-header/page-header';
import { PositionBadge } from '../../../shared/position-badge/position-badge';
import { ImportSummary, type ImportSummaryDetails } from '../import-summary/import-summary';

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
  teamLeagueConflicts: OwnershipConflictPolicy;
  playerTeamConflicts: OwnershipConflictPolicy;
}

type ImportErrorLocation = 'page' | 'target' | 'name' | 'identifier';

const defaultUpdateBehavior = (): UpdateBehaviorModel => ({
  absentTeams: 'keep',
  absentPlayers: 'keep',
  overrideTeamNames: false,
  overridePlayerNames: false,
  teamLeagueConflicts: 'move',
  playerTeamConflicts: 'move',
});

const defaultMergeOptions = (): MergeImportOptions => ({
  existingRecords: 'refresh',
  teamLeagueConflicts: 'move',
  playerTeamConflicts: 'move',
});

@Component({
  selector: 'app-import-page',
  imports: [
    FormField,
    ImportSummary,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatStepperModule,
    PageHeader,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly stepper = viewChild(MatStepper);
  private readonly inputs = viewChildren(MatInput);
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  private returnTo: EditableEntityKind | undefined;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private sourceSequence = 0;
  private squadSequence = 0;
  private reviewSequence = 0;

  protected readonly operation = signal<'merge' | 'synchronize'>('merge');
  protected readonly mode = signal<'league' | 'team'>('league');
  protected readonly name = signal('');
  protected readonly identifier = signal('');
  protected readonly season = signal('');
  protected readonly leaguePreview = signal<LeaguePreview | undefined>(undefined);
  protected readonly teamSelection = new SelectionModel<ExternalTeam>(true);
  private readonly teamSelectionVersion = signal(0);
  protected readonly squads = signal<SelectableSquad[]>([]);
  protected readonly readyToCommit = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly errorLocation = signal<ImportErrorLocation>('page');
  protected readonly jobId = signal('');
  protected readonly progress = this.api.scrapeProgress;
  protected readonly targetSearch = signal('');
  protected readonly targets = signal<EditableEntity[]>([]);
  protected readonly selectedTarget = signal<EditableEntity | undefined>(undefined);
  protected readonly updateBehaviorModel = signal<UpdateBehaviorModel>(defaultUpdateBehavior());
  protected readonly updateBehaviorForm = form(this.updateBehaviorModel);
  protected readonly mergeOptions = signal<MergeImportOptions>(defaultMergeOptions());
  protected readonly preparedRequest = signal<CommitImportRequest | undefined>(undefined);
  protected readonly importPreview = signal<ImportPreview | undefined>(undefined);
  protected readonly targetErrorMatcher: ErrorStateMatcher = {
    isErrorState: () => this.errorLocation() === 'target' && Boolean(this.error()),
  };
  protected readonly nameErrorMatcher: ErrorStateMatcher = {
    isErrorState: () => this.errorLocation() === 'name' && Boolean(this.error()),
  };
  protected readonly identifierErrorMatcher: ErrorStateMatcher = {
    isErrorState: () => this.errorLocation() === 'identifier' && Boolean(this.error()),
  };
  protected readonly isSynchronize = computed(() => this.operation() === 'synchronize');
  protected readonly selectedPlayerCount = computed(() =>
    this.squads().reduce(
      (total, squad) => total + squad.players.filter((player) => player.selected).length,
      0,
    ),
  );
  protected readonly allTeamsSelected = computed(() => {
    this.teamSelectionVersion();
    const teams = this.leaguePreview()?.teams ?? [];
    return teams.length > 0 && this.teamSelection.selected.length === teams.length;
  });
  protected readonly someTeamsSelected = computed(() => {
    this.teamSelectionVersion();
    return this.teamSelection.selected.length > 0 && !this.allTeamsSelected();
  });
  protected readonly canReview = computed(() =>
    this.isSynchronize()
      ? Boolean(this.selectedTarget() && this.readyToCommit())
      : this.selectedPlayerCount() > 0,
  );
  protected readonly sourceComplete = computed(() =>
    this.mode() === 'league' ? Boolean(this.leaguePreview()) : this.readyToCommit(),
  );
  protected readonly summaryDetails = computed<ImportSummaryDetails | undefined>(() => {
    const request = this.preparedRequest();
    if (!request) return undefined;
    const source = request.league ?? request.teams.at(0);
    return {
      operation: this.isSynchronize() ? 'Update existing' : 'New import',
      entity: this.mode() === 'league' ? 'League' : 'Team',
      name: source?.name ?? this.name(),
      identifier: source?.externalId ?? this.identifier(),
      season: source?.season,
      teamCount: request.teams.length,
      playerCount: request.teams.reduce((total, team) => total + team.players.length, 0),
    };
  });

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
    this.mergeOptions.set(defaultMergeOptions());
    this.resetStepper();
    if (operation === 'synchronize') void this.loadTargets('');
  }

  protected changeMode(mode: 'league' | 'team'): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.clearTarget(false);
    this.mergeOptions.set(defaultMergeOptions());
    this.resetStepper(1);
    if (this.isSynchronize()) void this.loadTargets('');
  }

  protected setName(value: string): void {
    if (this.name() === value) return;
    this.name.set(value);
    this.resetPreview();
  }

  protected setIdentifier(value: string): void {
    if (this.identifier() === value) return;
    this.identifier.set(value);
    this.resetPreview();
  }

  protected setSeason(value: string): void {
    if (this.season() === value) return;
    this.season.set(value);
    this.resetPreview();
  }

  protected searchExisting(value: string): void {
    this.targetSearch.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadTargets(value), 250);
  }

  protected selectTarget(event: MatAutocompleteSelectedEvent): void {
    this.applyTarget(event.option.value as EditableEntity);
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
    this.clearError();
    if (this.isSynchronize() && !this.selectedTarget()) {
      this.setError(`Select an existing ${this.mode()} to update.`, 'target');
      return;
    }
    if (this.mode() === 'team' && !this.name().trim()) {
      this.setError('Team name is required.', 'name');
      return;
    }
    if (!this.identifier().trim()) {
      this.setError('Enter a Transfermarkt ID or URL.', 'identifier');
      return;
    }
    const sequence = ++this.sourceSequence;
    this.busy.set(true);
    if (this.mode() === 'league') {
      const result = await this.api.previewLeague({
        identifierOrUrl: this.identifier(),
        season: this.season() || undefined,
      });
      if (sequence !== this.sourceSequence) return;
      this.busy.set(false);
      if (!result.ok) {
        this.setError(result.error.message, 'identifier');
        return;
      }
      if (
        result.value.name &&
        (!this.name().trim() ||
          this.name().trim().toLowerCase() === result.value.externalId.toLowerCase())
      ) {
        this.name.set(result.value.name);
      }
      this.leaguePreview.set(result.value);
      this.teamSelection.clear();
      this.teamSelection.select(...result.value.teams);
      this.teamSelectionVersion.update((version) => version + 1);
      this.squads.set([]);
      this.readyToCommit.set(false);
      this.invalidateReview();
      this.advance();
      return;
    }
    const result = await this.api.previewTeam({
      identifierOrUrl: this.identifier(),
      name: this.name(),
      season: this.season() || undefined,
    });
    if (sequence !== this.sourceSequence) return;
    this.busy.set(false);
    if (!result.ok) {
      this.setError(result.error.message, 'identifier');
      return;
    }
    this.setSquads([result.value]);
    this.advance();
  }

  protected continueUpdateOptions(): void {
    this.invalidateReview();
    this.advance();
  }

  protected async loadSelectedSquads(): Promise<void> {
    if (!this.teamSelection.selected.length) {
      if (this.isSynchronize() && this.mode() === 'league') {
        this.squads.set([]);
        this.readyToCommit.set(true);
        this.clearError();
        this.invalidateReview();
        this.advance();
        return;
      }
      this.setError('Select at least one team.');
      return;
    }
    const jobId = crypto.randomUUID();
    const sequence = ++this.squadSequence;
    this.jobId.set(jobId);
    this.busy.set(true);
    this.clearError();
    const result = await this.api.previewTeams({ jobId, teams: this.teamSelection.selected });
    if (sequence !== this.squadSequence) return;
    this.busy.set(false);
    if (!result.ok) {
      this.setError(result.error.message);
      return;
    }
    this.setSquads(result.value);
    this.advance();
  }

  protected cancel(): void {
    const jobId = this.jobId();
    if (jobId) void this.api.cancelScrape(jobId);
  }

  protected toggleTeam(team: ExternalTeam, selected: boolean): void {
    if (selected) this.teamSelection.select(team);
    else this.teamSelection.deselect(team);
    this.teamSelectionVersion.update((version) => version + 1);
    this.squads.set([]);
    this.readyToCommit.set(false);
    this.invalidateReview();
  }

  protected toggleAllTeams(selected: boolean): void {
    this.teamSelection.clear();
    if (selected) this.teamSelection.select(...(this.leaguePreview()?.teams ?? []));
    this.teamSelectionVersion.update((version) => version + 1);
    this.squads.set([]);
    this.readyToCommit.set(false);
    this.invalidateReview();
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
    this.invalidateReview();
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
    this.invalidateReview();
  }

  protected invalidateReview(): void {
    this.reviewSequence += 1;
    this.busy.set(false);
    this.preparedRequest.set(undefined);
    this.importPreview.set(undefined);
  }

  protected async review(): Promise<void> {
    const prepared = await this.preparePreview(this.mergeOptions());
    if (!prepared) return;
    this.preparedRequest.set(prepared.request);
    this.importPreview.set(prepared.preview);
    this.advance();
  }

  protected async updateMergeOptions(options: MergeImportOptions): Promise<void> {
    const prepared = await this.preparePreview(options, this.importPreview());
    if (!prepared) return;
    this.preparedRequest.set(prepared.request);
    this.importPreview.set(prepared.preview);
  }

  protected async commit(): Promise<void> {
    const request = this.preparedRequest();
    if (!request) return;
    this.busy.set(true);
    this.clearError();
    const result = await this.api.commitImport(request);
    this.busy.set(false);
    if (!result.ok) {
      this.setError(result.error.message);
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
      const moved = result.value.changes.teams.moved + result.value.changes.players.moved;
      const preserved =
        result.value.changes.leagues.preserved +
        result.value.changes.teams.preserved +
        result.value.changes.players.preserved;
      const deduplicated = result.value.changes.players.deduplicated;
      this.snackBar.open(
        `Update complete. ${added} added, ${updated} refreshed, ${preserved} preserved, ${moved} moved, ${detached} detached, ${deduplicated} duplicates removed, ${deleted} deleted.`,
        'Dismiss',
        { duration: 5000 },
      );
      await this.router.navigate([`../${this.returnTo ?? `${this.mode()}s`}`], {
        relativeTo: this.route,
      });
      return;
    }
    const changes = result.value.changes;
    const refreshed = changes.leagues.updated + changes.teams.updated + changes.players.updated;
    const preserved =
      changes.leagues.preserved + changes.teams.preserved + changes.players.preserved;
    const moved = changes.teams.moved + changes.players.moved;
    this.snackBar.open(
      `Import complete. ${refreshed} refreshed, ${preserved} preserved, ${moved} moved, ${changes.players.deduplicated} duplicates removed.`,
      'Dismiss',
      { duration: 5000 },
    );
    await this.router.navigate(['../overview'], { relativeTo: this.route });
  }

  private buildRequest(mergeOptions: MergeImportOptions): CommitImportRequest | undefined {
    if (this.isSynchronize() && !this.selectedTarget()) {
      this.setError(`Select an existing ${this.mode()} to update.`);
      return undefined;
    }
    const selectedTeams = this.squads().map((squad) => ({
      ...squad.team,
      players: squad.players.filter((player) => player.selected).map((player) => player.player),
    }));
    const teams = this.isSynchronize()
      ? selectedTeams
      : selectedTeams.filter((team) => team.players.length > 0);
    if (!this.isSynchronize() && !teams.length) {
      this.setError('Select at least one player to import.');
      return undefined;
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
    return {
      projectId: this.projectId,
      operation:
        this.isSynchronize() && target
          ? this.createSynchronizationOperation(target)
          : { kind: 'merge', options: mergeOptions },
      league,
      teams,
    };
  }

  private async loadImportPreview(
    request: CommitImportRequest,
  ): Promise<ImportPreview | undefined> {
    const sequence = ++this.reviewSequence;
    this.busy.set(true);
    this.clearError();
    const result = await this.api.previewImportChanges(request);
    if (sequence !== this.reviewSequence) return undefined;
    this.busy.set(false);
    if (!result.ok) {
      this.setError(result.error.message);
      return undefined;
    }
    return result.value;
  }

  private async preparePreview(
    options: MergeImportOptions,
    currentPreview?: ImportPreview,
  ): Promise<{ request: CommitImportRequest; preview: ImportPreview } | undefined> {
    let normalized = this.normalizeMergeOptions(options, currentPreview);
    this.mergeOptions.set(normalized);
    let request = this.buildRequest(normalized);
    if (!request) return undefined;
    let preview = await this.loadImportPreview(request);
    if (!preview) return undefined;

    const previewOptions = this.normalizeMergeOptions(normalized, preview);
    if (previewOptions.playerTeamConflicts !== normalized.playerTeamConflicts) {
      normalized = previewOptions;
      this.mergeOptions.set(normalized);
      request = this.buildRequest(normalized);
      if (!request) return undefined;
      const refreshedPreview = await this.loadImportPreview(request);
      if (!refreshedPreview) return undefined;
      preview = refreshedPreview;
    }
    return { request, preview };
  }

  private normalizeMergeOptions(
    options: MergeImportOptions,
    preview?: ImportPreview,
  ): MergeImportOptions {
    if (this.isSynchronize()) return options;
    const hasLegacyCopies = preview?.conflicts.playerTeamConflicts.some(
      ({ legacyCopyCount }) => legacyCopyCount > 1,
    );
    return hasLegacyCopies ? { ...options, playerTeamConflicts: 'move' } : options;
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
      this.setError(result.error.message, 'target');
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
      this.setError(result.error.message, 'target');
      return;
    }
    this.targets.set(result.value.rows as EditableEntity[]);
  }

  private resetPreview(): void {
    this.sourceSequence += 1;
    this.squadSequence += 1;
    this.leaguePreview.set(undefined);
    this.teamSelection.clear();
    this.teamSelectionVersion.update((version) => version + 1);
    this.squads.set([]);
    this.readyToCommit.set(false);
    this.clearError();
    this.invalidateReview();
  }

  private resetUpdateBehavior(): void {
    this.updateBehaviorModel.set(defaultUpdateBehavior());
  }

  private setError(message: string, location: ImportErrorLocation = 'page'): void {
    this.errorLocation.set(location);
    this.error.set(message);
    this.updateInputErrorStates();
  }

  private clearError(): void {
    this.error.set('');
    this.errorLocation.set('page');
    this.updateInputErrorStates();
  }

  private updateInputErrorStates(): void {
    for (const input of this.inputs()) input.updateErrorState();
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
          teamLeagueConflicts: behavior.teamLeagueConflicts,
          playerTeamConflicts: behavior.playerTeamConflicts,
        },
      };
    }
    return {
      kind: 'synchronize',
      target: { entity: 'teams', id: target.id },
      options: {
        absentPlayers: behavior.absentPlayers,
        overridePlayerNames: behavior.overridePlayerNames,
        playerTeamConflicts: behavior.playerTeamConflicts,
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
    this.invalidateReview();
  }

  private advance(): void {
    this.changeDetector.detectChanges();
    this.stepper()?.next();
  }

  private resetStepper(index = 0): void {
    const stepper = this.stepper();
    if (stepper) stepper.selectedIndex = index;
  }
}
