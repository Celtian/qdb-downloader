import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AboutDialogService } from '../../../shared/about-dialog/about-dialog';

@Component({
  selector: 'app-global-settings-shell',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './global-settings-shell.html',
  styleUrl: './global-settings-shell.css',
})
export class GlobalSettingsShell {
  private readonly aboutDialog = inject(AboutDialogService);
  protected readonly linkGroups = [
    {
      id: 'application',
      label: 'Application',
      links: [{ path: 'general', icon: 'tune', label: 'General' }],
    },
    {
      id: 'source-data',
      label: 'Source data',
      links: [
        { path: 'sources', icon: 'swap_vert', label: 'Sources' },
        { path: 'badges', icon: 'sell', label: 'Badges' },
        { path: 'columns', icon: 'view_column', label: 'Columns' },
      ],
    },
    {
      id: 'combined-data',
      label: 'Combined data',
      links: [{ path: 'combined/badges', icon: 'sell', label: 'Badges' }],
    },
    {
      id: 'transfers',
      label: 'Transfers',
      links: [{ path: 'export', icon: 'file_download', label: 'Export' }],
    },
  ] as const;

  protected openAbout(): void {
    this.aboutDialog.open();
  }
}
