import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, type Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NgxNullablePipe } from 'ngx-nullable';
import {
  isSourceName,
  playerPositionDetails,
  sourceLabels,
  type Entity,
  type EditableEntityKind,
  type EntityKind,
  type EntityFilterOption,
  type EntityFilterOptions,
  type League,
  type NationalityFilterOption,
  type PageRequest,
  type PlayerFoot,
  type PlayerPosition,
  type PlayerPositionDetail,
  type Team,
  type DeleteLeagueMode,
} from '../../../../../shared/contracts';
import { formatReferenceDate } from '../../../../../shared/reference-date';
import { findFootballCountryByCode3 } from '../../../../../shared/football-countries';
import { DesktopApi } from '../../../core/desktop-api';
import { CountryFlag } from '../../../shared/country-flag/country-flag';
import { PageHeader } from '../../../shared/page-header/page-header';
import { PositionBadge, positionBadgeDetails } from '../../../shared/position-badge/position-badge';
import { PositionDetailBadge } from '../../../shared/position-detail-badge/position-detail-badge';
import {
  EntityColumnDrawer,
  type EntityColumnDrawerData,
} from '../entity-column-drawer/entity-column-drawer';
import {
  EntityFilterDrawer,
  type EntityFilterDrawerData,
} from '../entity-filter-drawer/entity-filter-drawer';
import { emptyEntityFilters, type EntityFilters } from '../entity-filter-form/entity-filter-form';
import {
  DeleteLeagueDialog,
  type DeleteLeagueDialogData,
} from '../delete-league-dialog/delete-league-dialog';
import {
  DeleteTeamDialog,
  type DeleteTeamDialogData,
} from '../delete-team-dialog/delete-team-dialog';
import {
  EditEntityDialog,
  type EditEntityDialogData,
  type EditEntityValue,
} from '../edit-entity-dialog/edit-entity-dialog';
import { EntityColumnPreferences } from './entity-column-preferences';
import { EntityFilterPreferences } from './entity-filter-preferences';
import {
  columnsByEntity,
  defaultColumnPreference,
  entityColumnLabels,
  visibleColumnsFromPreference,
  type EntityColumnDefinition,
  type EntityColumnKey,
  type EntityColumnPreference,
} from './entity-table-columns';

interface DisplayRow {
  id: string;
  entity: Entity;
  countryCode?: string;
  position?: PlayerPosition;
  positionDetail?: PlayerPositionDetail;
  sourceLabel?: string;
  sourceUrl?: string;
  cells: Record<string, string | number | undefined>;
}

const footLabels: Record<PlayerFoot, string> = {
  LEFT: 'Left',
  RIGHT: 'Right',
};

const entityHeadings: Record<EntityKind, string> = {
  leagues: 'Leagues',
  teams: 'Teams',
  players: 'Players',
};

const playerDateColumns = new Set(['birthdate', 'joined', 'contractExpires']);
const timestampColumns = new Set(['createdAt', 'updatedAt']);
const filterQueryParameters: Record<EntityKind, readonly string[]> = {
  leagues: ['sourceName', 'country', 'season'],
  teams: ['sourceName', 'leagueId', 'noLeague', 'season'],
  players: ['sourceName', 'teamId', 'nationality', 'position', 'positionDetail', 'foot'],
};
function uniqueIds(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isPlayerPosition(value: unknown): value is PlayerPosition {
  return typeof value === 'string' && value in positionBadgeDetails;
}

function isPlayerPositionDetail(value: unknown): value is PlayerPositionDetail {
  return typeof value === 'string' && playerPositionDetails.includes(value as PlayerPositionDetail);
}

function normalizeFilterOptions(options: EntityFilterOptions): EntityFilterOptions {
  if (options.entity !== 'players') return options;
  const nationalities = options.nationalities as readonly (NationalityFilterOption | string)[];
  return {
    ...options,
    nationalities: nationalities.map((nationality) =>
      typeof nationality === 'string' ? { name: nationality } : nationality,
    ),
  };
}

function isPlayerFoot(value: unknown): value is PlayerFoot {
  return typeof value === 'string' && value in footLabels;
}

function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('https://');
}

@Component({
  selector: 'app-entity-table-page',
  imports: [
    CountryFlag,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    NgxNullablePipe,
    PageHeader,
    PositionBadge,
    PositionDetailBadge,
    RouterLink,
  ],
  templateUrl: './entity-table-page.html',
  styleUrl: './entity-table-page.css',
})
export class EntityTablePage {
  private readonly api = inject(DesktopApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly columnPreferences = inject(EntityColumnPreferences);
  private readonly filterPreferences = inject(EntityFilterPreferences);
  protected readonly entity = signal<EntityKind>('leagues');
  protected readonly entityHeading = computed(() => entityHeadings[this.entity()]);
  protected readonly rows = signal<DisplayRow[]>([]);
  protected readonly columnDefinitions = signal<readonly EntityColumnDefinition[]>(
    columnsByEntity.leagues,
  );
  private readonly columnPreference = signal<EntityColumnPreference>(
    defaultColumnPreference('leagues'),
  );
  protected readonly columns = computed(() =>
    visibleColumnsFromPreference(this.columnPreference()),
  );
  protected readonly hiddenColumnCount = computed(
    () => this.columnDefinitions().length - this.columns().length,
  );
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly search = signal('');
  protected readonly sort = signal('name');
  protected readonly direction = signal<'asc' | 'desc'>('asc');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly filterOptions = signal<EntityFilterOptions | undefined>(undefined);
  protected readonly filterLoading = signal(false);
  protected readonly filterError = signal('');
  protected readonly filters = signal<EntityFilters>(emptyEntityFilters());
  protected readonly activeFilterCount = computed(() => {
    const filters = this.filters();
    return (
      Number(filters.sourceNames.length > 0) +
      Number(filters.parentIds.length > 0 || filters.includeTeamsWithoutLeague) +
      Number(filters.seasons.length > 0) +
      Number(filters.countries.length > 0) +
      Number(filters.nationalities.length > 0) +
      Number(filters.positions.length > 0) +
      Number(filters.positionDetails.length > 0) +
      Number(filters.feet.length > 0)
    );
  });
  protected readonly labels = entityColumnLabels;
  protected readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  private loadRequestId = 0;
  private hasInvalidFilterQuery = false;
  private filterPreferencesInitialized = false;

  constructor() {
    const entity = this.route.snapshot.data['entity'] as EntityKind;
    this.entity.set(entity);
    this.columnDefinitions.set(columnsByEntity[entity]);
    this.columnPreference.set(this.columnPreferences.load(entity));
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const entity = this.entity();
      let restoredFilters: EntityFilters | undefined;
      if (!this.filterPreferencesInitialized) {
        this.filterPreferencesInitialized = true;
        const hasExplicitFilters = filterQueryParameters[entity].some((parameter) =>
          params.has(parameter),
        );
        if (!hasExplicitFilters) {
          restoredFilters = this.filterPreferences.load(this.projectId, entity);
          if (restoredFilters) void this.updateFilterUrl(restoredFilters, false);
        }
      }
      const parentParameter = entity === 'teams' ? 'leagueId' : 'teamId';
      const positionValues = entity === 'players' ? uniqueIds(params.getAll('position')) : [];
      const positionDetailValues =
        entity === 'players' ? uniqueIds(params.getAll('positionDetail')) : [];
      const footValues = entity === 'players' ? uniqueIds(params.getAll('foot')) : [];
      const sourceValues = uniqueIds(params.getAll('sourceName'));
      const sourceNames = sourceValues.filter(isSourceName);
      const positions = positionValues.filter(isPlayerPosition);
      const positionDetails = positionDetailValues.filter(isPlayerPositionDetail);
      const feet = footValues.filter(isPlayerFoot);
      this.hasInvalidFilterQuery =
        sourceNames.length !== sourceValues.length ||
        positions.length !== positionValues.length ||
        positionDetails.length !== positionDetailValues.length ||
        feet.length !== footValues.length;
      const filters: EntityFilters =
        restoredFilters ??
        ({
          sourceNames,
          parentIds: entity === 'leagues' ? [] : uniqueIds(params.getAll(parentParameter)),
          includeTeamsWithoutLeague: entity === 'teams' && params.get('noLeague') === 'true',
          seasons: entity === 'players' ? [] : uniqueIds(params.getAll('season')),
          countries: entity === 'leagues' ? uniqueIds(params.getAll('country')) : [],
          nationalities: entity === 'players' ? uniqueIds(params.getAll('nationality')) : [],
          positions,
          positionDetails,
          feet,
        } satisfies EntityFilters);
      this.filters.set(filters);
      this.pageIndex.set(0);
      const options = this.filterOptions();
      if (options) {
        const normalized = this.normalizeFilters(filters, options);
        if (this.hasInvalidFilterQuery || !this.filtersEqual(normalized, filters)) {
          void this.updateFilterUrl(normalized);
          return;
        }
        this.filterPreferences.save(this.projectId, entity, normalized);
      }
      void this.load();
    });
    void this.loadFilterOptions();
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
    void this.load();
  }

  protected pageChanged(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.load();
  }

  protected sortChanged(event: Sort): void {
    this.sort.set(event.active || 'name');
    this.direction.set(event.direction === 'desc' ? 'desc' : 'asc');
    this.pageIndex.set(0);
    void this.load();
  }

  protected openFilters(): void {
    this.dialog
      .open<EntityFilterDrawer, EntityFilterDrawerData, EntityFilters>(EntityFilterDrawer, {
        ariaLabelledBy: 'entity-filter-title',
        ariaModal: true,
        autoFocus: 'first-tabbable',
        data: {
          entity: this.entity(),
          filters: this.filters(),
          options: this.filterOptions,
          loading: this.filterLoading,
          error: this.filterError,
          retry: () => this.retryFilterOptions(),
        },
        delayFocusTrap: false,
        disableClose: false,
        height: '100vh',
        maxHeight: '100vh',
        maxWidth: '100vw',
        panelClass: 'entity-filter-drawer-panel',
        position: { right: '0', top: '0' },
        restoreFocus: true,
        width: '28rem',
      })
      .afterClosed()
      .subscribe((filters) => {
        if (filters) this.applyFilters(filters);
      });
  }

  protected openColumns(): void {
    const entity = this.entity();
    this.dialog
      .open<EntityColumnDrawer, EntityColumnDrawerData, EntityColumnPreference>(
        EntityColumnDrawer,
        {
          ariaLabelledBy: 'entity-column-title',
          ariaModal: true,
          autoFocus: 'first-tabbable',
          data: {
            entity,
            columns: this.columnDefinitions(),
            preference: this.columnPreference(),
          },
          delayFocusTrap: false,
          disableClose: false,
          height: '100vh',
          maxHeight: '100vh',
          maxWidth: '100vw',
          panelClass: 'entity-side-drawer-panel',
          position: { right: '0', top: '0' },
          restoreFocus: true,
          width: '28rem',
        },
      )
      .afterClosed()
      .subscribe((columns) => {
        if (columns) this.applyColumns(columns);
      });
  }

  protected applyFilters(filters: EntityFilters): void {
    void this.updateFilterUrl(filters);
  }

  protected retryFilterOptions(): void {
    void this.loadFilterOptions();
  }

  private applyColumns(preference: EntityColumnPreference): void {
    const columns = visibleColumnsFromPreference(preference);
    this.columnPreferences.save(this.entity(), preference);
    this.columnPreference.set(preference);
    if (columns.includes(this.sort() as EntityColumnKey)) return;
    this.sort.set('name');
    this.direction.set('asc');
    this.pageIndex.set(0);
    void this.load();
  }

  protected async editEntity(entity: Entity): Promise<void> {
    const kind = this.entity();
    if (kind === 'players') return;
    const leagues = kind === 'teams' ? await this.loadAllLeagues() : [];
    const value = await new Promise<EditEntityValue | undefined>((resolve) => {
      this.dialog
        .open<EditEntityDialog, EditEntityDialogData, EditEntityValue>(EditEntityDialog, {
          data: { entity: entity as League | Team, kind, leagues },
          autoFocus: 'first-tabbable',
        })
        .afterClosed()
        .subscribe(resolve);
    });
    if (value) await this.saveEntityMetadata(kind, entity.id, value);
  }

  protected refreshEntity(entity: Entity): void {
    const kind = this.entity();
    if (kind === 'players') return;
    void this.router.navigate(['../import'], {
      relativeTo: this.route,
      queryParams: {
        operation: 'synchronize',
        entity: kind,
        targetId: entity.id,
        returnTo: kind,
      },
    });
  }

  protected confirmTeamDeletion(entity: Entity): void {
    if (this.entity() !== 'teams') return;
    const team = entity as Team;
    this.dialog
      .open<DeleteTeamDialog, DeleteTeamDialogData, boolean>(DeleteTeamDialog, {
        data: { name: team.name, playerCount: team.playerCount ?? 0 },
        role: 'alertdialog',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) void this.deleteTeam(team.id);
      });
  }

  protected confirmLeagueDeletion(entity: Entity): void {
    if (this.entity() !== 'leagues') return;
    const league = entity as League;
    this.dialog
      .open<DeleteLeagueDialog, DeleteLeagueDialogData, DeleteLeagueMode>(DeleteLeagueDialog, {
        data: {
          name: league.name,
          teamCount: league.teamCount ?? 0,
          playerCount: league.playerCount ?? 0,
        },
        role: 'alertdialog',
        autoFocus: 'first-tabbable',
        maxWidth: '36rem',
      })
      .afterClosed()
      .subscribe((mode) => {
        if (mode) void this.deleteLeague(league.id, mode);
      });
  }

  private async load(): Promise<void> {
    const requestId = ++this.loadRequestId;
    const entity = this.entity();
    const filters = this.filters();
    this.loading.set(true);
    const request: PageRequest = {
      projectId: this.projectId,
      entity,
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      search: this.search(),
      sort: this.sort(),
      direction: this.direction(),
      sourceNames: [...filters.sourceNames],
      leagueId: entity === 'teams' ? filters.parentIds[0] : undefined,
      leagueIds: entity === 'teams' ? [...filters.parentIds] : undefined,
      teamId: entity === 'players' ? filters.parentIds[0] : undefined,
      teamIds: entity === 'players' ? [...filters.parentIds] : undefined,
      includeTeamsWithoutLeague: entity === 'teams' ? filters.includeTeamsWithoutLeague : undefined,
      seasons: entity === 'players' ? undefined : [...filters.seasons],
      countries: entity === 'leagues' ? [...filters.countries] : undefined,
      nationalities: entity === 'players' ? [...filters.nationalities] : undefined,
      positions: entity === 'players' ? [...filters.positions] : undefined,
      positionDetails: entity === 'players' ? [...filters.positionDetails] : undefined,
      feet: entity === 'players' ? [...filters.feet] : undefined,
    };
    const result = await this.api.listEntities(request);
    if (requestId !== this.loadRequestId) return;
    this.loading.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.error.set('');
    this.total.set(result.value.total);
    this.rows.set(result.value.rows.map((entity) => this.toDisplayRow(entity)));
  }

  private async deleteTeam(id: string): Promise<void> {
    const deletingLastRowOnPage = this.rows().length === 1 && this.pageIndex() > 0;
    const result = await this.api.deleteTeam(this.projectId, id);
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return;
    }
    if (deletingLastRowOnPage) this.pageIndex.update((pageIndex) => pageIndex - 1);
    await this.loadFilterOptions();
    await this.load();
    this.snackBar.open('Team deleted.', 'Dismiss', { duration: 3000 });
  }

  private async deleteLeague(id: string, mode: DeleteLeagueMode): Promise<void> {
    const deletingLastRowOnPage = this.rows().length === 1 && this.pageIndex() > 0;
    const result = await this.api.deleteLeague(this.projectId, id, mode);
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return;
    }
    if (deletingLastRowOnPage) this.pageIndex.update((pageIndex) => pageIndex - 1);
    await this.loadFilterOptions();
    await this.load();
    this.snackBar.open('League deleted.', 'Dismiss', { duration: 3000 });
  }

  private async saveEntityMetadata(
    kind: EditableEntityKind,
    id: string,
    value: EditEntityValue,
  ): Promise<void> {
    const common = {
      projectId: this.projectId,
      id,
      name: value.name,
      sourceId: value.sourceId,
      season: value.season || undefined,
    };
    const result =
      kind === 'leagues'
        ? await this.api.updateEntityMetadata({
            ...common,
            entity: 'leagues',
            countryCode3: value.countryCode3 || undefined,
          })
        : await this.api.updateEntityMetadata({
            ...common,
            entity: 'teams',
            countryCode3: value.countryCode3 || undefined,
            leagueId: value.leagueId || undefined,
          });
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return;
    }
    await this.api.getProjectSummary(this.projectId);
    await this.load();
    this.snackBar.open(`${kind === 'leagues' ? 'League' : 'Team'} updated.`, 'Dismiss', {
      duration: 3000,
    });
  }

  private async loadAllLeagues(): Promise<EntityFilterOption[]> {
    const result = await this.api.listEntityFilterOptions({
      projectId: this.projectId,
      entity: 'teams',
    });
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return [];
    }
    return result.value.entity === 'teams' ? result.value.leagues : [];
  }

  private async loadFilterOptions(): Promise<void> {
    this.filterLoading.set(true);
    this.filterError.set('');
    const result = await this.api.listEntityFilterOptions({
      projectId: this.projectId,
      entity: this.entity(),
    });
    this.filterLoading.set(false);
    if (!result.ok) {
      this.filterError.set(result.error.message);
      return;
    }
    const options = normalizeFilterOptions(result.value);
    this.filterError.set('');
    this.filterOptions.set(options);
    const normalized = this.normalizeFilters(this.filters(), options);
    if (this.hasInvalidFilterQuery || !this.filtersEqual(normalized, this.filters())) {
      await this.updateFilterUrl(normalized);
    } else {
      this.filterPreferences.save(this.projectId, this.entity(), normalized);
    }
  }

  private updateFilterUrl(filters: EntityFilters, persist = true): Promise<boolean> {
    this.pageIndex.set(0);
    const entity = this.entity();
    if (persist) this.filterPreferences.save(this.projectId, entity, filters);
    const queryParams = {
      sourceName: filters.sourceNames.length ? [...filters.sourceNames] : null,
      leagueId: entity === 'teams' && filters.parentIds.length ? [...filters.parentIds] : null,
      noLeague: entity === 'teams' && filters.includeTeamsWithoutLeague ? ('true' as const) : null,
      teamId: entity === 'players' && filters.parentIds.length ? [...filters.parentIds] : null,
      season: entity !== 'players' && filters.seasons.length ? [...filters.seasons] : null,
      country: entity === 'leagues' && filters.countries.length ? [...filters.countries] : null,
      nationality:
        entity === 'players' && filters.nationalities.length ? [...filters.nationalities] : null,
      position: entity === 'players' && filters.positions.length ? [...filters.positions] : null,
      positionDetail:
        entity === 'players' && filters.positionDetails.length
          ? [...filters.positionDetails]
          : null,
      foot: entity === 'players' && filters.feet.length ? [...filters.feet] : null,
    };
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private normalizeFilters(filters: EntityFilters, options: EntityFilterOptions): EntityFilters {
    const normalized = emptyEntityFilters();
    const sourceNames = new Set(options.sourceNames ?? []);
    normalized.sourceNames = filters.sourceNames.filter((sourceName) =>
      sourceNames.has(sourceName),
    );
    if (options.entity === 'leagues') {
      const seasons = new Set(options.seasons);
      const countries = new Set(options.countries.map((country) => country.name));
      normalized.seasons = filters.seasons.filter((season) => seasons.has(season));
      normalized.countries = filters.countries.filter((country) => countries.has(country));
      return normalized;
    }
    if (options.entity === 'teams') {
      const leagueIds = new Set(options.leagues.map((league) => league.id));
      const seasons = new Set(options.seasons);
      normalized.parentIds = filters.parentIds.filter((id) => leagueIds.has(id));
      normalized.includeTeamsWithoutLeague =
        filters.includeTeamsWithoutLeague && options.hasTeamsWithoutLeague;
      normalized.seasons = filters.seasons.filter((season) => seasons.has(season));
      return normalized;
    }
    const teamIds = new Set(options.teams.map((team) => team.id));
    const nationalities = new Set(options.nationalities.map((nationality) => nationality.name));
    const positions = new Set(options.positions);
    const positionDetails = new Set(options.positionDetails);
    const feet = new Set(options.feet);
    normalized.parentIds = filters.parentIds.filter((id) => teamIds.has(id));
    normalized.nationalities = filters.nationalities.filter((nationality) =>
      nationalities.has(nationality),
    );
    normalized.positions = filters.positions.filter((position) => positions.has(position));
    normalized.positionDetails = filters.positionDetails.filter((positionDetail) =>
      positionDetails.has(positionDetail),
    );
    normalized.feet = filters.feet.filter((foot) => feet.has(foot));
    return normalized;
  }

  private filtersEqual(left: EntityFilters, right: EntityFilters): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private toDisplayRow(entity: Entity): DisplayRow {
    const record = entity as unknown as Record<string, unknown>;
    const cells: Record<string, string | number | undefined> = {};
    for (const { key: column } of this.columnDefinitions()) {
      const value =
        column === 'leagueCountry' || column === 'teamCountry'
          ? record['countryName']
          : record[column];
      if (timestampColumns.has(column) && typeof value === 'string')
        cells[column] = new Date(value).toLocaleString();
      else if (playerDateColumns.has(column) && typeof value === 'string')
        cells[column] = formatReferenceDate(value);
      else if (column === 'position' && isPlayerPosition(value))
        cells[column] = positionBadgeDetails[value].abbreviation;
      else if (column === 'sourceName' && isSourceName(value)) cells[column] = sourceLabels[value];
      else if (column === 'foot' && isPlayerFoot(value)) cells[column] = footLabels[value];
      else if (column === 'height' && typeof value === 'number') cells[column] = `${value} cm`;
      else if (column === 'marketValue' && typeof value === 'number') {
        cells[column] = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(value);
      } else if (typeof value === 'string' || typeof value === 'number') {
        cells[column] = value;
      } else if (typeof value === 'boolean') {
        cells[column] = String(value);
      } else {
        cells[column] = undefined;
      }
    }
    return {
      id: entity.id,
      entity,
      countryCode:
        typeof record['countryCode3'] === 'string'
          ? findFootballCountryByCode3(record['countryCode3'])?.flagCode
          : typeof record['countryCode2'] === 'string'
            ? record['countryCode2']
            : undefined,
      position: isPlayerPosition(record['position']) ? record['position'] : undefined,
      positionDetail: isPlayerPositionDetail(record['positionDetail'])
        ? record['positionDetail']
        : undefined,
      sourceLabel: isSourceName(record['sourceName'])
        ? sourceLabels[record['sourceName']]
        : undefined,
      sourceUrl: isHttpsUrl(record['sourceUrl']) ? record['sourceUrl'] : undefined,
      cells,
    };
  }
}
