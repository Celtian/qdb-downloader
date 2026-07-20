import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ProjectSummary } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ReferenceDatePipe } from '../../../shared/reference-date-pipe';
import {
  RenameProjectDialog,
  type RenameProjectValue,
} from '../rename-project-dialog/rename-project-dialog';

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
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? '';
  private readonly loadedProject = signal<ProjectSummary | undefined>(undefined);
  protected readonly project = computed(() => {
    const updatedProject = this.api.projectUpdated();
    return updatedProject?.id === this.projectId ? updatedProject : this.loadedProject();
  });
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  protected renameProject(project: ProjectSummary): void {
    this.dialog
      .open<RenameProjectDialog, { name: string }, RenameProjectValue>(RenameProjectDialog, {
        data: { name: project.name },
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((value) => {
        if (value && value.name !== project.name) void this.saveProjectName(value.name);
      });
  }

  private async load(): Promise<void> {
    const result = await this.api.getProjectSummary(this.projectId);
    if (result.ok) this.loadedProject.set(result.value);
    else this.error.set(result.error.message);
  }

  private async saveProjectName(name: string): Promise<void> {
    const result = await this.api.renameProject(this.projectId, name);
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return;
    }
    this.snackBar.open('Project renamed.', 'Dismiss', { duration: 3000 });
  }
}
