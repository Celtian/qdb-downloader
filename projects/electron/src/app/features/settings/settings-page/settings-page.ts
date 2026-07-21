import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { ThemeService, type ThemePreference } from '../../../core/theme.service';

@Component({
  selector: 'app-settings-page',
  imports: [MatCardModule, MatIconModule, MatRadioModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
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
}
