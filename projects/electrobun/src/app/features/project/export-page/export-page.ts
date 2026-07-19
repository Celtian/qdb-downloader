import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute } from '@angular/router';
import type { ExportFormat, ExportResult } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';

@Component({
  selector: 'app-export-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './export-page.html',
  styleUrl: './export-page.css',
})
export class ExportPage {
  private readonly api = inject(DesktopApi);
  private readonly route = inject(ActivatedRoute);
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<ExportResult | undefined>(undefined);

  protected async export(format: ExportFormat): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.result.set(undefined);
    const response = await this.api.exportProject({ projectId: this.projectId, format });
    this.busy.set(false);
    if (!response.ok) {
      this.error.set(response.error.message);
      return;
    }
    this.result.set(response.value);
  }

  protected openDirectory(): void {
    const directory = this.result()?.directory;
    if (directory) void this.api.openExportDirectory(directory);
  }
}
