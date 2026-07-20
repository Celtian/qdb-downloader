import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, type Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NgxNullablePipe } from 'ngx-nullable';
import type { Entity, EntityKind, PageRequest } from '../../../../../shared/contracts';
import { formatReferenceDate } from '../../../../../shared/reference-date';
import { DesktopApi } from '../../../core/desktop-api';
import { CountryFlag } from '../../../shared/country-flag/country-flag';

interface DisplayRow {
  id: string;
  entity: Entity;
  countryCode?: string;
  cells: Record<string, string | number | undefined>;
}

const columnsByEntity: Record<EntityKind, readonly string[]> = {
  leagues: ['name', 'externalId', 'season', 'updatedAt'],
  teams: ['name', 'externalId', 'season', 'updatedAt'],
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
};

const playerDateColumns = new Set(['birthdate', 'joined', 'contractExpires']);

@Component({
  selector: 'app-entity-table-page',
  imports: [
    CountryFlag,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    NgxNullablePipe,
    RouterLink,
  ],
  templateUrl: './entity-table-page.html',
  styleUrl: './entity-table-page.css',
})
export class EntityTablePage {
  private readonly api = inject(DesktopApi);
  private readonly route = inject(ActivatedRoute);
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

  private toDisplayRow(entity: Entity): DisplayRow {
    const record = entity as unknown as Record<string, unknown>;
    const cells: Record<string, string | number | undefined> = {};
    for (const column of this.columns()) {
      const value = record[column];
      if (column === 'updatedAt' && typeof value === 'string')
        cells[column] = new Date(value).toLocaleString();
      else if (playerDateColumns.has(column) && typeof value === 'string')
        cells[column] = formatReferenceDate(value);
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
      cells,
    };
  }
}
