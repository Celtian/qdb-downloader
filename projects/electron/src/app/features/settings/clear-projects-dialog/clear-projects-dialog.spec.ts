import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import axe from 'axe-core';
import {
  allProjectsDeletionMessage,
  allProjectsDeletionNotificationConfig,
  ClearProjectsDialog,
} from './clear-projects-dialog';

describe('ClearProjectsDialog', () => {
  it('shows the affected project count, permanent warning, and safe action order', async () => {
    await TestBed.configureTestingModule({
      imports: [ClearProjectsDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { projectCount: 3 } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ClearProjectsDialog);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const buttons =
      await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(MatButtonHarness);

    expect(element.textContent).toContain('Clear all projects?');
    expect(element.textContent).toContain(
      'This will permanently delete 3 projects and all related data.',
    );
    expect(element.textContent).toContain('This action cannot be undone.');
    expect(element.textContent).toContain('Export folders created during this app session');
    expect(await Promise.all(buttons.map((button) => button.getText()))).toEqual([
      'Cancel',
      'Clear all projects',
    ]);
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('formats complete and partial cleanup notifications', () => {
    expect(
      allProjectsDeletionMessage({
        deletedProjectCount: 2,
        deletedExportCount: 3,
        failedExportDirectories: [],
      }),
    ).toBe('2 projects and 3 export folders deleted.');
    const partialResult = {
      deletedProjectCount: 1,
      deletedExportCount: 1,
      failedExportDirectories: ['/locked'],
    };
    expect(allProjectsDeletionMessage(partialResult)).toBe(
      '1 project deleted. 1 export folder could not be removed.',
    );
    expect(allProjectsDeletionNotificationConfig(partialResult)).toEqual({
      duration: 8000,
      panelClass: ['warning-snackbar'],
    });
  });
});
