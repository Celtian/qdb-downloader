import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, disabled, form } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { sourceLabels, sourceNames, type SourceName } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { PageHeader } from '../../../shared/page-header/page-header';
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
  selector: 'app-project-settings-page',
  imports: [
    FormField,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    PageHeader,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class ProjectSettingsPage {
  private readonly api = inject(DesktopApi);
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
  protected resetFinderFilters(): void {
    if (this.filterPreferences.resetProject(this.projectId)) {
      this.snackBar.open('Project finder filters reset.', 'Dismiss', { duration: 3000 });
    } else {
      this.snackBar.open('Project finder filters could not be reset.', 'Dismiss', {
        duration: 6000,
      });
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
