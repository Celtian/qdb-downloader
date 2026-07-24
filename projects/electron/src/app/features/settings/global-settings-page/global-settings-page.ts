import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThemeService, type ThemePreference } from '../../../core/theme.service';
import { PageHeader } from '../../../shared/page-header/page-header';
import { EntityColumnPreferences } from '../../project/entity-table-page/entity-column-preferences';

@Component({
  selector: 'app-global-settings-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatRadioModule, PageHeader, RouterLink],
  templateUrl: './global-settings-page.html',
  styleUrl: './global-settings-page.css',
})
export class GlobalSettingsPage {
  protected readonly theme = inject(ThemeService);
  private readonly columnPreferences = inject(EntityColumnPreferences);
  private readonly snackBar = inject(MatSnackBar);
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

  protected resetColumnLayouts(): void {
    if (this.columnPreferences.resetAll()) {
      this.snackBar.open('Finder column layouts reset.', 'Dismiss', { duration: 3000 });
    } else {
      this.snackBar.open('Finder column layouts could not be reset.', 'Dismiss', {
        duration: 6000,
      });
    }
  }
}
