import { Component, computed, effect, input, output, signal } from '@angular/core';
import { disabled, form, FormField, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import type {
  EntityFilterOptions,
  EntityKind,
  PlayerFoot,
  PlayerPosition,
} from '../../../../../shared/contracts';
import { CountryFlag } from '../../../shared/country-flag/country-flag';
import { PositionBadge, positionBadgeDetails } from '../../../shared/position-badge/position-badge';

export interface EntityFilters {
  parentIds: string[];
  includeTeamsWithoutLeague: boolean;
  seasons: string[];
  nationalities: string[];
  positions: PlayerPosition[];
  feet: PlayerFoot[];
}

const footLabels: Record<PlayerFoot, string> = {
  LEFT: 'Left',
  RIGHT: 'Right',
};

export const emptyEntityFilters = (): EntityFilters => ({
  parentIds: [],
  includeTeamsWithoutLeague: false,
  seasons: [],
  nationalities: [],
  positions: [],
  feet: [],
});

export const copyEntityFilters = (filters: EntityFilters): EntityFilters => ({
  parentIds: [...filters.parentIds],
  includeTeamsWithoutLeague: filters.includeTeamsWithoutLeague,
  seasons: [...filters.seasons],
  nationalities: [...filters.nationalities],
  positions: [...filters.positions],
  feet: [...filters.feet],
});

@Component({
  selector: 'app-entity-filter-form',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    CountryFlag,
    PositionBadge,
  ],
  templateUrl: './entity-filter-form.html',
  styleUrl: './entity-filter-form.css',
})
export class EntityFilterForm {
  readonly entity = input.required<EntityKind>();
  readonly initialFilters = input<EntityFilters>(emptyEntityFilters());
  readonly options = input<EntityFilterOptions>();
  readonly loading = input(false);
  readonly error = input('');
  readonly filtersApplied = output<EntityFilters>();
  readonly cancelled = output();
  readonly retryRequested = output();

  private readonly filtersModel = signal<EntityFilters>(emptyEntityFilters());
  protected readonly controlsDisabled = computed(
    () => this.loading() || Boolean(this.error()) || !this.options(),
  );
  protected readonly filtersForm = form(this.filtersModel, (path) => {
    disabled(path.parentIds, { when: () => this.controlsDisabled() });
    disabled(path.includeTeamsWithoutLeague, { when: () => this.controlsDisabled() });
    disabled(path.seasons, { when: () => this.controlsDisabled() });
    disabled(path.nationalities, { when: () => this.controlsDisabled() });
    disabled(path.positions, { when: () => this.controlsDisabled() });
    disabled(path.feet, { when: () => this.controlsDisabled() });
  });
  protected readonly parentOptions = computed(() => {
    const options = this.options();
    if (options?.entity === 'teams') return options.leagues;
    if (options?.entity === 'players') return options.teams;
    return [];
  });
  protected readonly seasonOptions = computed(() => {
    const options = this.options();
    return options?.entity === 'leagues' || options?.entity === 'teams' ? options.seasons : [];
  });
  protected readonly nationalityOptions = computed(() => {
    const options = this.options();
    return options?.entity === 'players' ? options.nationalities : [];
  });
  protected readonly positionOptions = computed(() => {
    const options = this.options();
    return options?.entity === 'players' ? options.positions : [];
  });
  protected readonly selectedPositions = computed(() => this.filtersModel().positions);
  protected readonly footOptions = computed(() => {
    const options = this.options();
    return options?.entity === 'players' ? options.feet : [];
  });
  protected readonly hasNoLeagueOption = computed(() => {
    const options = this.options();
    return options?.entity === 'teams' && options.hasTeamsWithoutLeague;
  });

  constructor() {
    effect(() => this.reset(this.initialFilters()));
  }

  reset(filters: EntityFilters): void {
    this.filtersModel.set(copyEntityFilters(filters));
  }

  protected clearAll(): void {
    this.filtersModel.set(emptyEntityFilters());
  }

  protected applyFilters(): void {
    void submit(this.filtersForm, async () => {
      await Promise.resolve();
      this.filtersApplied.emit(copyEntityFilters(this.filtersModel()));
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected positionLabel(position: PlayerPosition): string {
    return positionBadgeDetails[position].label;
  }

  protected footLabel(foot: PlayerFoot): string {
    return footLabels[foot];
  }
}
