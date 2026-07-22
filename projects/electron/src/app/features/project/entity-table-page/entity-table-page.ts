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
  playerPositionDetails,
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
  type SourceName,
  type Team,
} from '../../../../../shared/contracts';
import { formatReferenceDate } from '../../../../../shared/reference-date';
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
  EditEntityDialog,
  type EditEntityDialogData,
  type EditEntityValue,
} from '../edit-entity-dialog/edit-entity-dialog';
import { EntityColumnPreferences } from './entity-column-preferences';
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

const sourceLabels: Record<SourceName, string> = {
  transfermarkt: 'Transfermarkt',
};

const entityHeadings: Record<EntityKind, string> = {
  leagues: 'Leagues',
  teams: 'Teams',
  players: 'Players',
};

const playerDateColumns = new Set(['birthdate', 'joined', 'contractExpires']);
const timestampColumns = new Set(['createdAt', 'updatedAt']);
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

function isSourceName(value: unknown): value is SourceName {
  return typeof value === 'string' && value in sourceLabels;
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
      Number(filters.parentIds.length > 0 || filters.includeTeamsWithoutLeague) +
      Number(filters.seasons.length > 0) +
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

  constructor() {
    const entity = this.route.snapshot.data['entity'] as EntityKind;
    this.entity.set(entity);
    this.columnDefinitions.set(columnsByEntity[entity]);
    this.columnPreference.set(this.columnPreferences.load(entity));
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const entity = this.entity();
      const parentParameter = entity === 'teams' ? 'leagueId' : 'teamId';
      const positionValues = entity === 'players' ? uniqueIds(params.getAll('position')) : [];
      const positionDetailValues =
        entity === 'players' ? uniqueIds(params.getAll('positionDetail')) : [];
      const footValues = entity === 'players' ? uniqueIds(params.getAll('foot')) : [];
      const positions = positionValues.filter(isPlayerPosition);
      const positionDetails = positionDetailValues.filter(isPlayerPositionDetail);
      const feet = footValues.filter(isPlayerFoot);
      this.hasInvalidFilterQuery =
        positions.length !== positionValues.length ||
        positionDetails.length !== positionDetailValues.length ||
        feet.length !== footValues.length;
      const filters: EntityFilters = {
        parentIds: entity === 'leagues' ? [] : uniqueIds(params.getAll(parentParameter)),
        includeTeamsWithoutLeague: entity === 'teams' && params.get('noLeague') === 'true',
        seasons: entity === 'players' ? [] : uniqueIds(params.getAll('season')),
        nationalities: entity === 'players' ? uniqueIds(params.getAll('nationality')) : [],
        positions,
        positionDetails,
        feet,
      };
      this.filters.set(filters);
      this.pageIndex.set(0);
      const options = this.filterOptions();
      if (options) {
        const normalized = this.normalizeFilters(filters, options);
        if (this.hasInvalidFilterQuery || !this.filtersEqual(normalized, filters)) {
          void this.updateFilterUrl(normalized);
          return;
        }
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
      leagueId: entity === 'teams' ? filters.parentIds[0] : undefined,
      leagueIds: entity === 'teams' ? [...filters.parentIds] : undefined,
      teamId: entity === 'players' ? filters.parentIds[0] : undefined,
      teamIds: entity === 'players' ? [...filters.parentIds] : undefined,
      includeTeamsWithoutLeague: entity === 'teams' ? filters.includeTeamsWithoutLeague : undefined,
      seasons: entity === 'players' ? undefined : [...filters.seasons],
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

  private async saveEntityMetadata(
    kind: EditableEntityKind,
    id: string,
    value: EditEntityValue,
  ): Promise<void> {
    const common = {
      projectId: this.projectId,
      id,
      name: value.name,
      externalId: value.externalId,
      season: value.season || undefined,
    };
    const result =
      kind === 'leagues'
        ? await this.api.updateEntityMetadata({ ...common, entity: 'leagues' })
        : await this.api.updateEntityMetadata({
            ...common,
            entity: 'teams',
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
    }
  }

  private updateFilterUrl(filters: EntityFilters): Promise<boolean> {
    this.pageIndex.set(0);
    const entity = this.entity();
    const queryParams = {
      leagueId: entity === 'teams' && filters.parentIds.length ? [...filters.parentIds] : null,
      noLeague: entity === 'teams' && filters.includeTeamsWithoutLeague ? ('true' as const) : null,
      teamId: entity === 'players' && filters.parentIds.length ? [...filters.parentIds] : null,
      season: entity !== 'players' && filters.seasons.length ? [...filters.seasons] : null,
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
    if (options.entity === 'leagues') {
      const seasons = new Set(options.seasons);
      normalized.seasons = filters.seasons.filter((season) => seasons.has(season));
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
      const value = record[column];
      if (timestampColumns.has(column) && typeof value === 'string')
        cells[column] = new Date(value).toLocaleString();
      else if (playerDateColumns.has(column) && typeof value === 'string')
        cells[column] = formatReferenceDate(value);
      else if (column === 'position' && isPlayerPosition(value))
        cells[column] = positionBadgeDetails[value].abbreviation;
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
      countryCode: typeof record['countryCode2'] === 'string' ? record['countryCode2'] : undefined,
      position: isPlayerPosition(record['position']) ? record['position'] : undefined,
      positionDetail: isPlayerPositionDetail(record['positionDetail'])
        ? record['positionDetail']
        : undefined,
      sourceLabel: isSourceName(record['source']) ? sourceLabels[record['source']] : undefined,
      sourceUrl: isHttpsUrl(record['sourceUrl']) ? record['sourceUrl'] : undefined,
      cells,
    };
  }
}
