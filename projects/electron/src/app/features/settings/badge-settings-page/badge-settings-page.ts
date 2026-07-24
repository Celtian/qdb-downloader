import { Component, inject, signal } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import {
  entityStatusSettingLimits,
  type EntityStatusSettings,
} from '../../../../../shared/entity-status';
import { EntityStatusSettingsService } from '../../../core/entity-status-settings.service';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-badge-settings-page',
  imports: [FormField, MatCardModule, MatIconModule, MatSliderModule, PageHeader],
  templateUrl: './badge-settings-page.html',
  styleUrl: './badge-settings-page.css',
})
export class BadgeSettingsPage {
  private readonly entityStatusSettings = inject(EntityStatusSettingsService);
  protected readonly badgeSettingsModel = signal<EntityStatusSettings>({
    ...this.entityStatusSettings.settings(),
  });
  protected readonly badgeSettingsForm = form(this.badgeSettingsModel, (path) => {
    min(path.newDays, entityStatusSettingLimits.newDays.min);
    max(path.newDays, entityStatusSettingLimits.newDays.max);
    min(path.oldMonths, entityStatusSettingLimits.oldMonths.min);
    max(path.oldMonths, entityStatusSettingLimits.oldMonths.max);
  });
  protected readonly badgeSettingLimits = entityStatusSettingLimits;

  protected setNewDays(newDays: number): void {
    this.saveBadgeSettings({ ...this.badgeSettingsModel(), newDays });
  }

  protected setOldMonths(oldMonths: number): void {
    this.saveBadgeSettings({ ...this.badgeSettingsModel(), oldMonths });
  }

  protected dayUnit(value: number): string {
    return value === 1 ? 'day' : 'days';
  }

  protected monthUnit(value: number): string {
    return value === 1 ? 'month' : 'months';
  }

  private saveBadgeSettings(settings: EntityStatusSettings): void {
    this.badgeSettingsModel.set(settings);
    this.entityStatusSettings.setSettings(settings);
  }
}
