import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import type { ProjectSummary } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ReferenceDatePipe } from '../../../shared/reference-date-pipe';

@Component({
  selector: 'app-project-shell',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatToolbarModule,
    ReferenceDatePipe,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './project-shell.html',
  styleUrl: './project-shell.css',
})
export class ProjectShell {
  private readonly api = inject(DesktopApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly project = signal<ProjectSummary | undefined>(undefined);
  protected readonly error = signal('');
  protected readonly projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
  protected readonly links = [
    { path: 'overview', icon: 'dashboard', label: 'Overview' },
    { path: 'leagues', icon: 'emoji_events', label: 'Leagues' },
    { path: 'teams', icon: 'shield', label: 'Teams' },
    { path: 'players', icon: 'groups', label: 'Players' },
    { path: 'import', icon: 'cloud_download', label: 'Import' },
    { path: 'export', icon: 'file_download', label: 'Export' },
  ] as const;

  constructor() {
    void this.loadProject();
  }

  private async loadProject(): Promise<void> {
    const result = await this.api.getProjectSummary(this.projectId);
    if (result.ok) this.project.set(result.value);
    else this.error.set(result.error.message);
  }
}
