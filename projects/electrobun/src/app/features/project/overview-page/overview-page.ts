import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { ProjectSummary } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ReferenceDatePipe } from '../../../shared/reference-date-pipe';

@Component({
  selector: 'app-overview-page',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReferenceDatePipe,
    RouterLink,
  ],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class OverviewPage {
  private readonly api = inject(DesktopApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly project = signal<ProjectSummary | undefined>(undefined);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
    const result = await this.api.getProjectSummary(projectId);
    if (result.ok) this.project.set(result.value);
    else this.error.set(result.error.message);
  }
}
