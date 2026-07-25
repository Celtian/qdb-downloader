import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute, Router } from '@angular/router';
import {
  sourceLabels,
  sourceNames,
  type CombinedLeagueSelection,
  type CombineTeamCandidate,
  type League,
  type SourceName,
  type TeamCombinationPreview,
} from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { CountryFlag } from '../../../shared/country-flag/country-flag';
import { PageHeader } from '../../../shared/page-header/page-header';

type LeagueMode = 'none' | 'existing' | 'create';

@Component({
  selector: 'app-combined-team-import-page',
  imports: [
    CountryFlag,
    DecimalPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatStepperModule,
    PageHeader,
  ],
  templateUrl: './combined-team-import-page.html',
  styleUrl: './combined-team-import-page.css',
})
export class CombinedTeamImportPage {
  private readonly api = inject(DesktopApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly stepper = viewChild(MatStepper);
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  private leagueSearchTimer?: ReturnType<typeof setTimeout>;
  private teamSearchTimer?: ReturnType<typeof setTimeout>;
  private leagueSequence = 0;
  private teamSequence = 0;

  protected readonly sourceLabels = sourceLabels;
  protected readonly orderedSources = signal<SourceName[]>([...sourceNames]);
  protected readonly sourceName = signal<SourceName>('transfermarkt');
  protected readonly leagueCandidates = signal<League[]>([]);
  protected readonly teamCandidates = signal<CombineTeamCandidate[]>([]);
  protected readonly selectedLeagueId = signal('');
  protected readonly selectedTeamId = signal('');
  protected readonly leagueSearch = signal('');
  protected readonly teamSearch = signal('');
  protected readonly preview = signal<TeamCombinationPreview | undefined>(undefined);
  protected readonly leagueMode = signal<LeagueMode>('none');
  protected readonly combinedLeagueId = signal('');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly selectedLeague = computed(() =>
    this.leagueCandidates().find(({ id }) => id === this.selectedLeagueId()),
  );
  protected readonly selectedTeam = computed(() =>
    this.teamCandidates().find(({ id }) => id === this.selectedTeamId()),
  );
  protected readonly selectedCombinedLeague = computed(() =>
    this.preview()?.combinedLeagues.find(({ id }) => id === this.combinedLeagueId()),
  );
  protected readonly sourceTeam = computed(
    () => this.preview()?.sourceTeams[0] ?? this.selectedTeam(),
  );
  protected readonly leagueSelectionValid = computed(() => {
    if (this.leagueMode() === 'none') return true;
    if (this.leagueMode() === 'existing') return Boolean(this.combinedLeagueId());
    return Boolean(this.preview()?.sourceLeagues.length);
  });
  protected readonly destinationLeague = computed(() => {
    if (this.leagueMode() === 'none') return 'Unassigned';
    if (this.leagueMode() === 'existing') {
      return this.selectedCombinedLeague()?.name ?? 'Choose a combined league';
    }
    return this.preview()?.sourceLeagues[0]?.name ?? 'Source league';
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.leagueSearchTimer) clearTimeout(this.leagueSearchTimer);
      if (this.teamSearchTimer) clearTimeout(this.teamSearchTimer);
    });
    void this.initialize();
  }

  protected changeSource(sourceName: SourceName): void {
    if (sourceName === this.sourceName()) return;
    this.sourceName.set(sourceName);
    this.clearSelection();
    void Promise.all([this.loadLeagues(''), this.loadTeams('')]);
  }

  protected searchLeagues(value: string): void {
    const selected = this.selectedLeague();
    this.leagueSearch.set(value);
    if (selected && value !== selected.name) {
      this.selectedLeagueId.set('');
      this.clearTeamSelection();
      void this.loadTeams('');
    }
    if (this.leagueSearchTimer) clearTimeout(this.leagueSearchTimer);
    this.leagueSearchTimer = setTimeout(() => void this.loadLeagues(value), 250);
  }

  protected selectLeague(event: MatAutocompleteSelectedEvent): void {
    if (this.leagueSearchTimer) clearTimeout(this.leagueSearchTimer);
    this.leagueSearchTimer = undefined;
    const league = event.option.value as League;
    this.selectedLeagueId.set(league.id);
    this.leagueSearch.set(league.name);
    const selectedTeam = this.selectedTeam();
    if (selectedTeam?.leagueId !== league.id) this.clearTeamSelection();
    void this.loadTeams(this.teamSearch(), league.id);
  }

  protected clearLeague(): void {
    this.cancelSearchTimers();
    this.selectedLeagueId.set('');
    this.leagueSearch.set('');
    this.clearTeamSelection();
    void Promise.all([this.loadLeagues(''), this.loadTeams('')]);
  }

  protected readonly displayLeague = (league: League | string): string =>
    typeof league === 'string' ? league : league.name;

  protected searchTeams(value: string): void {
    const selected = this.selectedTeam();
    this.teamSearch.set(value);
    if (selected && value !== selected.name) {
      this.selectedTeamId.set('');
      this.invalidatePreview();
    }
    if (this.teamSearchTimer) clearTimeout(this.teamSearchTimer);
    this.teamSearchTimer = setTimeout(
      () => void this.loadTeams(value, this.selectedLeagueId() || undefined),
      250,
    );
  }

  protected selectTeam(event: MatAutocompleteSelectedEvent): void {
    if (this.teamSearchTimer) clearTimeout(this.teamSearchTimer);
    this.teamSearchTimer = undefined;
    const team = event.option.value as CombineTeamCandidate;
    if (team.combinedTeamId) return;
    this.selectedTeamId.set(team.id);
    this.teamSearch.set(team.name);
    this.invalidatePreview();
    if (team.leagueId) {
      this.selectedLeagueId.set(team.leagueId);
      this.leagueSearch.set(team.leagueName ?? '');
    } else {
      this.selectedLeagueId.set('');
      this.leagueSearch.set('');
    }
    void this.loadTeams(team.name, team.leagueId);
  }

  protected clearTeam(): void {
    if (this.teamSearchTimer) clearTimeout(this.teamSearchTimer);
    this.teamSearchTimer = undefined;
    this.clearTeamSelection();
    void this.loadTeams('', this.selectedLeagueId() || undefined);
  }

  protected readonly displayTeam = (team: CombineTeamCandidate | string): string =>
    typeof team === 'string' ? team : team.name;

  protected candidateDisabled(candidate: CombineTeamCandidate): boolean {
    return Boolean(candidate.combinedTeamId);
  }

  protected async previewImport(): Promise<void> {
    const teamId = this.selectedTeamId();
    if (!teamId) {
      this.error.set('Choose a source team to import.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const result = await this.api.previewTeamCombination({
      projectId: this.projectId,
      sourceTeamIds: [teamId],
    });
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.applyPreview(result.value);
    afterNextRender(() => this.stepper()?.next(), { injector: this.injector });
  }

  protected setLeagueMode(mode: LeagueMode): void {
    this.leagueMode.set(mode);
    if (mode !== 'existing') this.combinedLeagueId.set('');
    this.error.set('');
  }

  protected continueToSummary(): void {
    if (!this.leagueSelectionValid()) {
      this.error.set(
        this.leagueMode() === 'existing'
          ? 'Choose a combined league.'
          : 'The source team has no league to import.',
      );
      return;
    }
    this.error.set('');
    this.stepper()?.next();
  }

  protected async commit(): Promise<void> {
    const preview = this.preview();
    if (!preview) return;
    const league = this.buildLeagueSelection();
    if (!league) return;
    this.busy.set(true);
    this.error.set('');
    const result = await this.api.commitTeamCombination({
      projectId: this.projectId,
      sourceTeamIds: preview.sourceTeams.map(({ id }) => id),
      league,
      matchGroups: preview.matchGroups,
      teamResolutions: {},
      playerResolutions: {},
    });
    this.busy.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    const playerCount = result.value.players.length;
    this.snackBar.open(
      `${result.value.team.name} imported with ${playerCount} ${playerCount === 1 ? 'player' : 'players'}.`,
      'Dismiss',
      { duration: 6000 },
    );
    await this.router.navigate(['/projects', this.projectId, 'combined', 'teams']);
  }

  private async initialize(): Promise<void> {
    const priorityResult = await this.api.getSourcePriority();
    if (priorityResult.ok) {
      this.orderedSources.set(priorityResult.value);
      this.sourceName.set(priorityResult.value[0] ?? 'transfermarkt');
    } else {
      this.error.set(priorityResult.error.message);
    }
    await Promise.all([this.loadLeagues(''), this.loadTeams('')]);
    this.loading.set(false);
  }

  private async loadLeagues(search: string): Promise<void> {
    const sequence = ++this.leagueSequence;
    const sourceName = this.sourceName();
    const result = await this.api.listEntities({
      projectId: this.projectId,
      entity: 'leagues',
      pageIndex: 0,
      pageSize: 100,
      search,
      sort: 'name',
      direction: 'asc',
      sourceNames: [sourceName],
    });
    if (sequence !== this.leagueSequence || sourceName !== this.sourceName()) return;
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    const selected = this.selectedLeague();
    const leagues = result.value.rows as League[];
    this.leagueCandidates.set(
      selected && !leagues.some(({ id }) => id === selected.id) ? [selected, ...leagues] : leagues,
    );
  }

  private async loadTeams(search: string, leagueId?: string): Promise<void> {
    const sequence = ++this.teamSequence;
    const sourceName = this.sourceName();
    const result = await this.api.listCombineTeamCandidates(
      this.projectId,
      search,
      sourceName,
      undefined,
      leagueId,
    );
    if (sequence !== this.teamSequence || sourceName !== this.sourceName()) return;
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    const selected = this.selectedTeam();
    this.teamCandidates.set(
      selected && !result.value.some(({ id }) => id === selected.id)
        ? [selected, ...result.value]
        : result.value,
    );
  }

  private applyPreview(preview: TeamCombinationPreview): void {
    this.preview.set(preview);
    if (
      preview.detectedCombinedLeagueId &&
      preview.combinedLeagues.some(({ id }) => id === preview.detectedCombinedLeagueId)
    ) {
      this.leagueMode.set('existing');
      this.combinedLeagueId.set(preview.detectedCombinedLeagueId);
    } else if (preview.sourceLeagues.length) {
      this.leagueMode.set('create');
      this.combinedLeagueId.set('');
    } else {
      this.leagueMode.set('none');
      this.combinedLeagueId.set('');
    }
  }

  private buildLeagueSelection(): CombinedLeagueSelection | undefined {
    if (this.leagueMode() === 'none') return { kind: 'none' };
    if (this.leagueMode() === 'existing') {
      const combinedLeagueId = this.combinedLeagueId();
      if (!combinedLeagueId) {
        this.error.set('Choose a combined league.');
        return undefined;
      }
      return { kind: 'existing', combinedLeagueId };
    }
    const sourceLeagueIds = this.preview()?.sourceLeagues.map(({ id }) => id) ?? [];
    if (!sourceLeagueIds.length) {
      this.error.set('The source team has no league to import.');
      return undefined;
    }
    return { kind: 'create', sourceLeagueIds, resolutions: {} };
  }

  private clearSelection(): void {
    this.cancelSearchTimers();
    this.leagueSequence += 1;
    this.teamSequence += 1;
    this.selectedLeagueId.set('');
    this.leagueSearch.set('');
    this.leagueCandidates.set([]);
    this.clearTeamSelection();
  }

  private clearTeamSelection(): void {
    this.selectedTeamId.set('');
    this.teamSearch.set('');
    this.teamCandidates.set([]);
    this.invalidatePreview();
  }

  private invalidatePreview(): void {
    this.preview.set(undefined);
    this.leagueMode.set('none');
    this.combinedLeagueId.set('');
    this.error.set('');
  }

  private cancelSearchTimers(): void {
    if (this.leagueSearchTimer) clearTimeout(this.leagueSearchTimer);
    if (this.teamSearchTimer) clearTimeout(this.teamSearchTimer);
    this.leagueSearchTimer = undefined;
    this.teamSearchTimer = undefined;
  }
}
