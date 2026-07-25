import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  sourceLabels,
  sourceNames,
  type CombinedEntity,
  type CombinedEntityKind,
  type CombinedLeague,
  type CombinedPlayer,
  type PlayerFoot,
  type SourceName,
} from '../../../../../shared/contracts';
import { findFootballCountryByCode3 } from '../../../../../shared/football-countries';
import { formatReferenceDate } from '../../../../../shared/reference-date';
import { DesktopApi } from '../../../core/desktop-api';
import { CountryFlag } from '../../../shared/country-flag/country-flag';
import { PageHeader } from '../../../shared/page-header/page-header';
import { PositionBadge } from '../../../shared/position-badge/position-badge';
import { PositionDetailBadge } from '../../../shared/position-detail-badge/position-detail-badge';

interface DeleteCombinedDialogData {
  entity: CombinedEntityKind;
  name: string;
}

@Component({
  selector: 'app-delete-combined-dialog',
  imports: [MatButtonModule, MatDialogModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Delete {{ singular }}</h2>
    <mat-dialog-content>
      <p>
        Delete <strong>{{ data.name }}</strong
        >? Source records are not affected.
      </p>
      @if (data.entity === 'leagues') {
        <mat-radio-group aria-label="Combined league deletion behavior" [value]="mode()">
          <mat-radio-button value="detach" (change)="mode.set('detach')">
            Delete the league and keep its teams unassigned
          </mat-radio-button>
          <mat-radio-button value="cascade" (change)="mode.set('cascade')">
            Delete the league, its teams, and combined players
          </mat-radio-button>
        </mat-radio-group>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Cancel</button>
      <button
        matButton="filled"
        type="button"
        [mat-dialog-close]="data.entity === 'leagues' ? mode() : 'delete'"
      >
        Delete
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-radio-group {
      display: grid;
      gap: 0.75rem;
      margin-top: 1rem;
    }
  `,
})
export class DeleteCombinedDialog {
  protected readonly data = inject<DeleteCombinedDialogData>(MAT_DIALOG_DATA);
  protected readonly mode = signal<'detach' | 'cascade'>('detach');
  protected readonly singular =
    this.data.entity === 'leagues' ? 'combined league' : this.data.entity.slice(0, -1);
}

const headings: Record<CombinedEntityKind, string> = {
  leagues: 'Combined leagues',
  teams: 'Combined teams',
  players: 'Combined players',
};

const footLabels: Record<PlayerFoot, string> = {
  LEFT: 'Left',
  RIGHT: 'Right',
};

@Component({
  selector: 'app-combined-entity-page',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    CountryFlag,
    PageHeader,
    PositionBadge,
    PositionDetailBadge,
    RouterLink,
  ],
  templateUrl: './combined-entity-page.html',
  styleUrl: './combined-entity-page.css',
})
export class CombinedEntityPage {
  private readonly api = inject(DesktopApi);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  protected readonly entity = this.route.snapshot.data['entity'] as CombinedEntityKind;
  protected readonly heading = headings[this.entity];
  protected readonly rows = signal<CombinedEntity[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly search = signal('');
  protected readonly selectedSources = signal<SourceName[]>([]);
  protected readonly needsReview = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly displayedColumns = [
    'name',
    'parent',
    'country',
    ...(this.entity === 'players'
      ? ['jerseyNumber', 'position', 'positionDetail', 'birthdate', 'height', 'foot']
      : []),
    ...(this.entity === 'leagues' ? ['tier'] : []),
    'sources',
    'review',
    'updated',
    'actions',
  ];
  protected readonly sourceNames = sourceNames;
  protected readonly sourceLabels = sourceLabels;
  protected readonly description = computed(
    () =>
      `Browse canonical ${this.entity} assembled from multiple providers without changing source records.`,
  );

  constructor() {
    void this.load();
  }

  protected setSearch(search: string): void {
    this.search.set(search);
    this.pageIndex.set(0);
    void this.load();
  }

  protected setSources(value: SourceName[]): void {
    this.selectedSources.set(value);
    this.pageIndex.set(0);
    void this.load();
  }

  protected setNeedsReview(value: boolean): void {
    this.needsReview.set(value);
    this.pageIndex.set(0);
    void this.load();
  }

  protected paginate(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.load();
  }

  protected parentName(row: CombinedEntity): string {
    if ('teamId' in row) return row.teamName ?? 'Unknown team';
    if ('leagueId' in row) return row.leagueName ?? 'No league';
    return `${(row as CombinedLeague).teamCount ?? 0} teams`;
  }

  protected countryFlagCode(row: CombinedEntity): string | undefined {
    return row.countryCode3
      ? (findFootballCountryByCode3(row.countryCode3)?.flagCode ?? row.countryCode2)
      : row.countryCode2;
  }

  protected tier(row: CombinedEntity): number | string {
    return 'tier' in row ? (row.tier ?? '—') : '—';
  }

  protected playerData(row: CombinedEntity): CombinedPlayer {
    return row as CombinedPlayer;
  }

  protected birthdate(row: CombinedEntity): string {
    const birthdate = this.playerData(row).birthdate;
    return birthdate ? formatReferenceDate(birthdate) : '—';
  }

  protected foot(row: CombinedEntity): string {
    const foot = this.playerData(row).foot;
    return foot ? footLabels[foot] : '—';
  }

  protected sourceLabel(sourceName: SourceName): string {
    return sourceLabels[sourceName];
  }

  protected recombineId(row: CombinedEntity): string | undefined {
    if (this.entity === 'teams') return row.id;
    if (this.entity === 'players') return (row as CombinedPlayer).teamId;
    return undefined;
  }

  protected confirmDelete(row: CombinedEntity): void {
    this.dialog
      .open<DeleteCombinedDialog, DeleteCombinedDialogData, 'delete' | 'detach' | 'cascade'>(
        DeleteCombinedDialog,
        {
          data: { entity: this.entity, name: row.name },
          role: 'alertdialog',
          autoFocus: 'first-tabbable',
        },
      )
      .afterClosed()
      .subscribe((mode) => {
        if (mode) void this.delete(row, mode === 'cascade');
      });
  }

  private async delete(row: CombinedEntity, cascade: boolean): Promise<void> {
    const result = await this.api.deleteCombinedEntity(
      this.projectId,
      this.entity,
      row.id,
      cascade,
    );
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return;
    }
    this.snackBar.open(`${row.name} deleted. Source data was preserved.`, 'Dismiss', {
      duration: 4000,
    });
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    const result = await this.api.listCombinedEntities({
      projectId: this.projectId,
      entity: this.entity,
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      search: this.search(),
      sort: 'name',
      direction: 'asc',
      sourceNames: this.selectedSources(),
      ...(this.needsReview() && { needsReview: true }),
    });
    this.loading.set(false);
    if (!result.ok) {
      this.error.set(result.error.message);
      return;
    }
    this.rows.set(result.value.rows);
    this.total.set(result.value.total);
  }
}
