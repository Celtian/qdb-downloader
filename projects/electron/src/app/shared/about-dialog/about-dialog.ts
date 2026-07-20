import { NgOptimizedImage } from '@angular/common';
import { Component, Service, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DesktopApi } from '../../core/desktop-api';

@Component({
  selector: 'app-about-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, NgOptimizedImage],
  templateUrl: './about-dialog.html',
  styleUrl: './about-dialog.css',
})
export class AboutDialog {
  private readonly api = inject(DesktopApi);
  protected readonly version = signal<string | undefined>(undefined);
  protected readonly currentYear = new Date().getFullYear();

  constructor() {
    void this.loadAppInfo();
  }

  private async loadAppInfo(): Promise<void> {
    const result = await this.api.getAppInfo();
    this.version.set(result.ok ? result.value.version : 'unavailable');
  }
}

@Service()
export class AboutDialogService {
  private readonly dialog = inject(MatDialog);

  open(): void {
    this.dialog.open(AboutDialog, {
      ariaModal: true,
      autoFocus: '[aria-label="Close About dialog"]',
      delayFocusTrap: false,
      disableClose: false,
      maxWidth: 'calc(100vw - 2rem)',
      panelClass: 'about-dialog-panel',
      restoreFocus: true,
      width: '35rem',
    });
  }
}
