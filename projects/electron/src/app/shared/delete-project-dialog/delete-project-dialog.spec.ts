import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeleteProjectDialog, projectDeletionMessage } from './delete-project-dialog';

describe('DeleteProjectDialog', () => {
  it('shows the permanent deletion warning and safe action order', async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteProjectDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { name: 'Winter 2026' } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DeleteProjectDialog);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent;
    const buttons =
      await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(MatButtonHarness);

    expect(text).toContain('Winter 2026');
    expect(text).toContain('This action cannot be undone.');
    expect(await Promise.all(buttons.map((button) => button.getText()))).toEqual([
      'Cancel',
      'Delete project',
    ]);
  });

  it('describes complete and partial export cleanup', () => {
    expect(
      projectDeletionMessage({
        projectId: 'project',
        deletedExportCount: 2,
        failedExportDirectories: [],
      }),
    ).toBe('Project and 2 export folders deleted.');
    expect(
      projectDeletionMessage({
        projectId: 'project',
        deletedExportCount: 1,
        failedExportDirectories: ['/locked'],
      }),
    ).toBe('Project deleted. 1 export folder could not be removed.');
  });
});
