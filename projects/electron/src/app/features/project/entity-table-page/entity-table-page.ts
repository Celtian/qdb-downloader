import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import type {
  Entity,
  EditableEntityKind,
  EntityKind,
  League,
  PageRequest,
  PlayerFoot,
  PlayerPosition,
  SourceName,
  Team,
} from '../../../../../shared/contracts';
import { formatReferenceDate } from '../../../../../shared/reference-date';
import { DesktopApi } from '../../../core/desktop-api';
import { CountryFlag } from '../../../shared/country-flag/country-flag';
import { PositionBadge, positionBadgeDetails } from '../../../shared/position-badge/position-badge';
import {
  EditEntityDialog,
  type EditEntityDialogData,
  type EditEntityValue,
} from '../edit-entity-dialog/edit-entity-dialog';

interface DisplayRow {
  id: string;
  entity: Entity;
  countryCode?: string;
  position?: PlayerPosition;
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

const columnsByEntity: Record<EntityKind, readonly string[]> = {
  leagues: [
    'name',
    'externalId',
    'season',
    'teamCount',
    'sourceUrl',
    'createdAt',
    'updatedAt',
    'actions',
  ],
  teams: [
    'name',
    'externalId',
    'season',
    'playerCount',
    'sourceUrl',
    'createdAt',
    'updatedAt',
    'actions',
  ],
  players: [
    'name',
    'countryName',
    'jerseyNumber',
    'position',
    'birthdate',
    'height',
    'foot',
    'joined',
    'contractExpires',
    'marketValue',
  ],
};

const labels: Record<string, string> = {
  name: 'Name',
  externalId: 'Transfermarkt ID',
  season: 'Season',
  teamCount: 'Teams',
  playerCount: 'Players',
  sourceUrl: 'Source',
  createdAt: 'Created',
  updatedAt: 'Updated',
  jerseyNumber: 'Number',
  position: 'Position',
  countryName: 'Nationality',
  birthdate: 'Birth date',
  height: 'Height',
  foot: 'Foot',
  joined: 'Joined',
  contractExpires: 'Contract until',
  marketValue: 'Market value',
  actions: 'Actions',
};

const playerDateColumns = new Set(['birthdate', 'joined', 'contractExpires']);
const timestampColumns = new Set(['createdAt', 'updatedAt']);

function isPlayerPosition(value: unknown): value is PlayerPosition {
  return typeof value === 'string' && value in positionBadgeDetails;
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
    PositionBadge,
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
  protected readonly entity = signal<EntityKind>('leagues');
  protected readonly rows = signal<DisplayRow[]>([]);
  protected readonly columns = signal<readonly string[]>(columnsByEntity.leagues);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly search = signal('');
  protected readonly sort = signal('name');
  protected readonly direction = signal<'asc' | 'desc'>('asc');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly labels = labels;
  protected readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  private leagueId: string | undefined;
  private teamId: string | undefined;

  constructor() {
    this.entity.set(this.route.snapshot.data['entity'] as EntityKind);
    this.columns.set(columnsByEntity[this.entity()]);
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.leagueId = params.get('leagueId') ?? undefined;
      this.teamId = params.get('teamId') ?? undefined;
      this.pageIndex.set(0);
      void this.load();
    });
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
    this.loading.set(true);
    const request: PageRequest = {
      projectId: this.projectId,
      entity: this.entity(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      search: this.search(),
      sort: this.sort(),
      direction: this.direction(),
      leagueId: this.leagueId,
      teamId: this.teamId,
    };
    const result = await this.api.listEntities(request);
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

  private async loadAllLeagues(): Promise<League[]> {
    const leagues: League[] = [];
    let pageIndex = 0;
    let total = 1;
    while (leagues.length < total) {
      const result = await this.api.listEntities({
        projectId: this.projectId,
        entity: 'leagues',
        pageIndex,
        pageSize: 200,
        search: '',
        sort: 'name',
        direction: 'asc',
      });
      if (!result.ok) {
        this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
        return [];
      }
      leagues.push(...(result.value.rows as League[]));
      total = result.value.total;
      pageIndex += 1;
    }
    return leagues;
  }

  private toDisplayRow(entity: Entity): DisplayRow {
    const record = entity as unknown as Record<string, unknown>;
    const cells: Record<string, string | number | undefined> = {};
    for (const column of this.columns()) {
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
      sourceLabel: isSourceName(record['source']) ? sourceLabels[record['source']] : undefined,
      sourceUrl: isHttpsUrl(record['sourceUrl']) ? record['sourceUrl'] : undefined,
      cells,
    };
  }
}
