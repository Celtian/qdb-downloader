import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Project } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { ReferenceDatePipe } from '../../../shared/reference-date-pipe';
import {
  CreateProjectDialog,
  type CreateProjectValue,
} from '../create-project-dialog/create-project-dialog';

@Component({
  selector: 'app-projects-page',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReferenceDatePipe,
    RouterLink,
  ],
  templateUrl: './projects-page.html',
  styleUrl: './projects-page.css',
})
export class ProjectsPage {
  private readonly api = inject(DesktopApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly projects = signal<Project[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    void this.loadProjects();
  }

  protected createProject(): void {
    this.dialog
      .open<CreateProjectDialog, undefined, CreateProjectValue>(CreateProjectDialog, {
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((value) => {
        if (value) void this.saveProject(value);
      });
  }

  private async loadProjects(): Promise<void> {
    this.loading.set(true);
    const result = await this.api.listProjects();
    this.loading.set(false);
    if (result.ok) {
      this.projects.set(result.value);
      this.error.set('');
    } else {
      this.error.set(result.error.message);
    }
  }

  private async saveProject(value: CreateProjectValue): Promise<void> {
    const result = await this.api.createProject(value.name, value.referenceDate);
    if (!result.ok) {
      this.snackBar.open(result.error.message, 'Dismiss', { duration: 6000 });
      return;
    }
    this.projects.update((projects) =>
      [...projects, result.value].sort(
        (left, right) =>
          right.referenceDate.localeCompare(left.referenceDate) ||
          left.name.localeCompare(right.name),
      ),
    );
    this.snackBar.open('Snapshot project created.', 'Dismiss', { duration: 3000 });
  }
}
