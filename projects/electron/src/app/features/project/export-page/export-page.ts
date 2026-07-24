import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute } from '@angular/router';
import {
  sourceLabels,
  type EntityFilterOption,
  type EntityKind,
  type ExportColumnSelection,
  type ExportFormat,
  type ExportResult,
} from '../../../../../shared/contracts';
import { defaultExportColumns, exportColumnDefinitions } from '../../../../../shared/export-schema';
import { findFootballCountryByName } from '../../../../../shared/football-countries';
import { DesktopApi } from '../../../core/desktop-api';
import {
  defaultExportColumnPresetId,
  ExportColumnPresetsService,
} from '../../../core/export-column-presets.service';
import { CountryFlag } from '../../../shared/country-flag/country-flag';
import { ExportColumnEditor } from '../../../shared/export-column-editor/export-column-editor';
import { PageHeader } from '../../../shared/page-header/page-header';

const exportFormatLabels: Record<ExportFormat, string> = {
  json: 'JSON',
  'single-json': 'Single JSON',
  csv: 'CSV',
};
const modifiedPresetId = 'modified';

const cloneColumns = (columns: ExportColumnSelection): ExportColumnSelection => ({
  leagues: [...columns.leagues],
  teams: [...columns.teams],
  players: [...columns.players],
});

@Component({
  selector: 'app-export-page',
  imports: [
    CountryFlag,
    ExportColumnEditor,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatStepperModule,
    PageHeader,
  ],
  templateUrl: './export-page.html',
  styleUrl: './export-page.css',
})
export class ExportPage {
  private readonly api = inject(DesktopApi);
  private readonly exportPresets = inject(ExportColumnPresetsService);
  private readonly route = inject(ActivatedRoute);
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  protected readonly presets = this.exportPresets.presets;
  protected readonly format = signal<ExportFormat>('single-json');
  protected readonly columns = signal<ExportColumnSelection>(defaultExportColumns());
  protected readonly selectedPresetId = signal(defaultExportColumnPresetId);
  protected readonly destination = signal('');
  protected readonly leagues = signal<readonly EntityFilterOption[]>([]);
  protected readonly hasTeamsWithoutLeague = signal(false);
  protected readonly includeTeamsWithoutLeague = signal(false);
  protected readonly selectedLeagueIds = signal<readonly string[]>([]);
  protected readonly loadingLeagues = signal(true);
  protected readonly choosingFolder = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<ExportResult | undefined>(undefined);
  protected readonly formatLabel = computed(() => exportFormatLabels[this.format()]);
  protected readonly columnPresetLabel = computed(
    () =>
      this.presets().find((preset) => preset.id === this.selectedPresetId())?.name ??
      'Custom (modified)',
  );
  protected readonly allLeaguesSelected = computed(
    () =>
      (this.leagues().length > 0 || this.hasTeamsWithoutLeague()) &&
      this.selectedLeagueIds().length === this.leagues().length &&
      (!this.hasTeamsWithoutLeague() || this.includeTeamsWithoutLeague()),
  );
  protected readonly someLeaguesSelected = computed(
    () =>
      (this.selectedLeagueIds().length > 0 || this.includeTeamsWithoutLeague()) &&
      !this.allLeaguesSelected(),
  );
  protected readonly leagueSelectionValid = computed(
    () =>
      !this.loadingLeagues() &&
      (this.leagues().length === 0 && !this.hasTeamsWithoutLeague()
        ? true
        : this.selectedLeagueIds().length > 0 || this.includeTeamsWithoutLeague()),
  );

  constructor() {
    void this.loadDestination();
    void this.loadLeagues();
  }

  protected selectFormat(value: unknown): void {
    if (value !== 'json' && value !== 'single-json' && value !== 'csv') return;
    this.format.set(value);
    this.result.set(undefined);
  }

  protected selectColumnPreset(value: unknown): void {
    if (typeof value !== 'string') return;
    const preset = this.presets().find((candidate) => candidate.id === value);
    if (!preset) return;
    this.selectedPresetId.set(preset.id);
    this.columns.set(cloneColumns(preset.columns));
    this.result.set(undefined);
  }

  protected updateColumns(columns: ExportColumnSelection): void {
    this.columns.set(columns);
    const selectedPreset = this.presets().find(
      (preset) =>
        preset.id === this.selectedPresetId() && this.sameColumns(preset.columns, columns),
    );
    const matchingPreset =
      selectedPreset ?? this.presets().find((preset) => this.sameColumns(preset.columns, columns));
    this.selectedPresetId.set(matchingPreset?.id ?? modifiedPresetId);
    this.result.set(undefined);
  }

  protected async chooseFolder(): Promise<void> {
    this.choosingFolder.set(true);
    this.error.set('');
    const response = await this.api.chooseExportDirectory();
    this.choosingFolder.set(false);
    if (!response.ok) {
      this.error.set(response.error.message);
      return;
    }
    if (response.value) {
      this.destination.set(response.value);
      this.result.set(undefined);
    }
  }

  protected toggleAllLeagues(selected: boolean): void {
    this.selectedLeagueIds.set(selected ? this.leagues().map(({ id }) => id) : []);
    this.includeTeamsWithoutLeague.set(selected && this.hasTeamsWithoutLeague());
    this.result.set(undefined);
  }

  protected toggleLeague(leagueId: string, selected: boolean): void {
    this.selectedLeagueIds.update((current) =>
      selected ? [...new Set([...current, leagueId])] : current.filter((id) => id !== leagueId),
    );
    this.result.set(undefined);
  }

  protected isLeagueSelected(leagueId: string): boolean {
    return this.selectedLeagueIds().includes(leagueId);
  }

  protected providerLabel(league: EntityFilterOption): string {
    return league.sourceName ? sourceLabels[league.sourceName] : 'Provider not set';
  }

  protected toggleTeamsWithoutLeague(selected: boolean): void {
    this.includeTeamsWithoutLeague.set(selected);
    this.result.set(undefined);
  }

  protected columnSummary(entity: EntityKind): string {
    const selected = new Set<string>(this.columns()[entity]);
    return exportColumnDefinitions[entity]
      .filter(({ key }) => selected.has(key))
      .map(({ label }) => label)
      .join(', ');
  }

  protected leagueSummary(): string {
    if (this.leagues().length === 0 && !this.hasTeamsWithoutLeague()) {
      return 'No leagues available';
    }
    if (this.allLeaguesSelected()) {
      if (this.leagues().length === 0) return 'Teams without a league';
      return this.hasTeamsWithoutLeague()
        ? `All ${this.leagues().length} leagues and teams without a league`
        : `All ${this.leagues().length} leagues`;
    }
    const selected = new Set(this.selectedLeagueIds());
    const names = this.leagues()
      .filter(({ id }) => selected.has(id))
      .map(({ name }) => name);
    if (this.includeTeamsWithoutLeague()) names.push('Teams without a league');
    return names.join(', ');
  }

  protected async export(): Promise<void> {
    if (!this.destination() || !this.leagueSelectionValid()) return;
    this.busy.set(true);
    this.error.set('');
    this.result.set(undefined);
    const response = await this.api.exportProject({
      projectId: this.projectId,
      format: this.format(),
      columns: this.columns(),
      destination: this.destination(),
      includeTeamsWithoutLeague: this.includeTeamsWithoutLeague(),
      leagueIds: [...this.selectedLeagueIds()],
    });
    this.busy.set(false);
    if (!response.ok) {
      this.error.set(response.error.message);
      return;
    }
    this.result.set(response.value);
  }

  protected openDirectory(): void {
    const directory = this.result()?.directory;
    if (directory) void this.api.openExportDirectory(directory);
  }

  protected fileCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'file' : 'files'} created`;
  }

  private async loadDestination(): Promise<void> {
    const response = await this.api.getExportDestination();
    if (!response.ok) {
      this.error.set(response.error.message);
      return;
    }
    if (response.value) this.destination.set(response.value);
  }

  private async loadLeagues(): Promise<void> {
    const response = await this.api.listEntityFilterOptions({
      projectId: this.projectId,
      entity: 'teams',
    });
    if (!response.ok) {
      this.loadingLeagues.set(false);
      this.error.set(response.error.message);
      return;
    }
    if (response.value.entity !== 'teams') {
      this.loadingLeagues.set(false);
      this.error.set('League options could not be loaded.');
      return;
    }
    const leagues = await Promise.all(
      response.value.leagues.map(async (league) => {
        const countryCode =
          league.countryCode ??
          (league.countryName
            ? findFootballCountryByName(league.countryName)?.flagCode
            : undefined);
        const option = countryCode ? { ...league, countryCode } : league;
        if (!option.sourceId || option.name !== option.sourceId) return option;
        const preview = await this.api.previewLeague({
          sourceName: option.sourceName ?? 'transfermarkt',
          identifierOrUrl: option.sourceId,
        });
        return preview.ok && preview.value.name ? { ...option, name: preview.value.name } : option;
      }),
    );
    this.leagues.set(leagues);
    this.hasTeamsWithoutLeague.set(response.value.hasTeamsWithoutLeague);
    this.includeTeamsWithoutLeague.set(response.value.hasTeamsWithoutLeague);
    this.selectedLeagueIds.set(leagues.map(({ id }) => id));
    this.loadingLeagues.set(false);
  }

  private sameColumns(first: ExportColumnSelection, second: ExportColumnSelection): boolean {
    return (['leagues', 'teams', 'players'] as const).every((entity) => {
      const firstColumns = first[entity];
      const secondColumns = second[entity];
      return (
        firstColumns.length === secondColumns.length &&
        firstColumns.every((column, index) => column === secondColumns[index])
      );
    });
  }
}
