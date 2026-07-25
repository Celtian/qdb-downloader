import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ExportColumnSelection } from '../../../../../shared/contracts';
import { defaultExportColumns } from '../../../../../shared/export-schema';
import {
  defaultExportColumnPresetId,
  ExportColumnPresetsService,
  type ExportColumnPreset,
} from '../../../core/export-column-presets.service';
import { ExportColumnEditor } from '../../../shared/export-column-editor/export-column-editor';
import { PageHeader } from '../../../shared/page-header/page-header';

const newPresetId = 'new';

const cloneExportColumns = (columns: ExportColumnSelection): ExportColumnSelection => ({
  leagues: [...columns.leagues],
  teams: [...columns.teams],
  players: [...columns.players],
});

@Component({
  selector: 'app-export-settings-page',
  imports: [
    ExportColumnEditor,
    FormField,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeader,
  ],
  templateUrl: './export-settings-page.html',
  styleUrl: './export-settings-page.css',
})
export class ExportSettingsPage {
  private readonly exportPresets = inject(ExportColumnPresetsService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly presets = this.exportPresets.presets;
  protected readonly selectedPresetId = signal(defaultExportColumnPresetId);
  protected readonly selectedPreset = computed<ExportColumnPreset | undefined>(() =>
    this.presets().find((preset) => preset.id === this.selectedPresetId()),
  );
  protected readonly creatingPreset = computed(() => this.selectedPresetId() === newPresetId);
  protected readonly selectedPresetIsBuiltIn = computed(
    () => this.selectedPreset()?.builtIn ?? false,
  );
  protected readonly presetNameModel = signal({ name: 'Default' });
  protected readonly presetNameForm = form(this.presetNameModel, (path) => {
    required(path.name, { message: 'Enter a preset name.' });
    maxLength(path.name, 60, { message: 'Use 60 characters or fewer.' });
    validate(path.name, ({ value }) => {
      const name = value().trim().toLocaleLowerCase();
      if (!name) return undefined;
      const duplicate = this.presets().some(
        (preset) =>
          preset.id !== this.selectedPresetId() && preset.name.toLocaleLowerCase() === name,
      );
      return duplicate ? { kind: 'duplicate', message: 'Preset names must be unique.' } : undefined;
    });
  });
  protected readonly exportColumns = signal<ExportColumnSelection>(defaultExportColumns());

  protected selectExportPreset(value: unknown): void {
    if (typeof value !== 'string') return;
    const preset = this.presets().find((candidate) => candidate.id === value);
    if (!preset) return;
    this.presetNameForm().reset();
    this.selectedPresetId.set(preset.id);
    this.presetNameModel.set({ name: preset.name });
    this.exportColumns.set(cloneExportColumns(preset.columns));
  }

  protected startNewPreset(): void {
    this.presetNameForm().reset();
    this.selectedPresetId.set(newPresetId);
    this.presetNameModel.set({ name: '' });
    this.exportColumns.set(defaultExportColumns());
  }

  protected saveExportPreset(): void {
    void submit(this.presetNameForm, async () => {
      await Promise.resolve();
      const name = this.presetNameModel().name;
      if (this.creatingPreset()) {
        const preset = this.exportPresets.create(name, this.exportColumns());
        if (!preset) {
          this.showPresetSaveError();
          return;
        }
        this.selectExportPreset(preset.id);
        this.snackBar.open(`${preset.name} export preset created.`, 'Dismiss', { duration: 3000 });
        return;
      }

      const preset = this.selectedPreset();
      if (!preset || preset.builtIn) return;
      if (!this.exportPresets.update(preset.id, name, this.exportColumns())) {
        this.showPresetSaveError();
        return;
      }
      this.selectExportPreset(preset.id);
      this.snackBar.open(`${name.trim()} export preset saved.`, 'Dismiss', { duration: 3000 });
    });
  }

  protected deleteExportPreset(): void {
    const preset = this.selectedPreset();
    if (!preset || preset.builtIn) return;
    if (!this.exportPresets.delete(preset.id)) {
      this.snackBar.open('Export preset could not be deleted.', 'Dismiss', { duration: 6000 });
      return;
    }
    this.selectExportPreset(defaultExportColumnPresetId);
    this.snackBar.open(`${preset.name} export preset deleted.`, 'Dismiss', { duration: 3000 });
  }

  private showPresetSaveError(): void {
    this.snackBar.open(
      'Export preset could not be saved. Check its name and try again.',
      'Dismiss',
      { duration: 6000 },
    );
  }
}
