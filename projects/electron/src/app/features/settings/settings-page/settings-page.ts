import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, disabled, form } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { sourceLabels, sourceNames, type SourceName } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ThemeService, type ThemePreference } from '../../../core/theme.service';
import { PageHeader } from '../../../shared/page-header/page-header';
import { EntityColumnPreferences } from '../../project/entity-table-page/entity-column-preferences';
import { EntityFilterPreferences } from '../../project/entity-table-page/entity-filter-preferences';
import {
  DeleteSourceDataDialog,
  type DeleteSourceDataDialogData,
  sourceDataDeletionMessage,
  sourceDataDeletionPreviewMessage,
} from '../delete-source-data-dialog/delete-source-data-dialog';

interface SourceSelection {
  transfermarkt: boolean;
  soccerway: boolean;
  worldfootball: boolean;
  eurofotbal: boolean;
}

const emptySourceSelection = (): SourceSelection => ({
  transfermarkt: false,
  soccerway: false,
  worldfootball: false,
  eurofotbal: false,
});

@Component({
  selector: 'app-settings-page',
  imports: [
    FormField,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatRadioModule,
    PageHeader,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
  private readonly api = inject(DesktopApi);
  private readonly columnPreferences = inject(EntityColumnPreferences);
  private readonly filterPreferences = inject(EntityFilterPreferences);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  protected readonly deletingSourceData = signal(false);
  protected readonly sourceSelection = signal<SourceSelection>(emptySourceSelection());
  protected readonly sourceForm = form(this.sourceSelection, (path) => {
    const whenDeleting = { when: () => this.deletingSourceData() };
    disabled(path.transfermarkt, whenDeleting);
    disabled(path.soccerway, whenDeleting);
    disabled(path.worldfootball, whenDeleting);
    disabled(path.eurofotbal, whenDeleting);
  });
  protected readonly selectedSourceNames = computed(() =>
    sourceNames.filter((sourceName) => this.sourceSelection()[sourceName]),
  );
  protected readonly sourceDataDeletionPreview = resource({
    params: () => {
      const selectedSourceNames = this.selectedSourceNames();
      return selectedSourceNames.length ? [...selectedSourceNames] : undefined;
    },
    loader: ({ params: selectedSourceNames }) =>
      this.api.previewSourceDataDeletion(this.projectId, selectedSourceNames),
  });
  protected readonly sourceDataDeletionCounts = computed(() => {
    const result = this.sourceDataDeletionPreview.value();
    return result?.ok ? result.value : undefined;
  });
  protected readonly sourceDataDeletionPreviewError = computed(() => {
    const result = this.sourceDataDeletionPreview.value();
    if (result && !result.ok) return result.error.message;
    return this.sourceDataDeletionPreview.error()?.message ?? '';
  });
  protected readonly sourceDataDeletionPreviewText = computed(() => {
    const counts = this.sourceDataDeletionCounts();
    return counts ? sourceDataDeletionPreviewMessage(counts) : '';
  });
  protected readonly sourceDataDeletionPreviewFailureText = computed(() => {
    const error = this.sourceDataDeletionPreviewError();
    return `Deletion totals could not be loaded.${error ? ` ${error}` : ''}`;
  });
  protected readonly canDeleteSourceData = computed(
    () =>
      this.selectedSourceNames().length > 0 &&
      Boolean(this.sourceDataDeletionCounts()) &&
      !this.sourceDataDeletionPreview.isLoading() &&
      !this.deletingSourceData(),
  );
  protected readonly sourceOptions = sourceNames.map((value) => ({
    value,
    label: sourceLabels[value],
  }));
  protected readonly themeOptions = [
    {
      value: 'system',
      icon: 'brightness_auto',
      label: 'System',
      description: 'Follow your operating system appearance.',
    },
    {
      value: 'light',
      icon: 'light_mode',
      label: 'Light',
      description: 'Always use the light appearance.',
    },
    {
      value: 'dark',
      icon: 'dark_mode',
      label: 'Dark',
      description: 'Always use the dark appearance.',
    },
  ] as const satisfies readonly {
    value: ThemePreference;
    icon: string;
    label: string;
    description: string;
  }[];

  protected selectTheme(preference: ThemePreference): void {
    this.theme.setPreference(preference);
  }

  protected resetFinderPreferences(): void {
    const filtersReset = this.filterPreferences.resetAll();
    const columnsReset = this.columnPreferences.resetAll();
    if (filtersReset && columnsReset) {
      this.snackBar.open('Finder preferences reset.', 'Dismiss', { duration: 3000 });
    } else {
      this.snackBar.open('Finder preferences could not be reset.', 'Dismiss', { duration: 6000 });
    }
  }

  protected confirmSourceDataDeletion(): void {
    const sourceNamesToDelete = [...this.selectedSourceNames()];
    const counts = this.sourceDataDeletionCounts();
    if (!sourceNamesToDelete.length || !counts || !this.canDeleteSourceData()) return;
    this.dialog
      .open<DeleteSourceDataDialog, DeleteSourceDataDialogData, boolean>(DeleteSourceDataDialog, {
        data: { sourceNames: sourceNamesToDelete, counts },
        role: 'alertdialog',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) void this.deleteSourceData(sourceNamesToDelete);
      });
  }

  private async deleteSourceData(sourceNamesToDelete: SourceName[]): Promise<void> {
    if (this.deletingSourceData()) return;
    this.deletingSourceData.set(true);
    const result = await this.api.deleteSourceData(this.projectId, sourceNamesToDelete);
    this.deletingSourceData.set(false);
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return;
    }
    this.sourceSelection.set(emptySourceSelection());
    this.snackBar.open(sourceDataDeletionMessage(result.value), 'Dismiss', { duration: 4000 });
  }
}
