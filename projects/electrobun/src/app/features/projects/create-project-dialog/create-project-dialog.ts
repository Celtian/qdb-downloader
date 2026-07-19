import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isReferenceDate } from '../../../../../shared/reference-date';

@Component({
  selector: 'app-create-project-dialog',
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './create-project-dialog.html',
  styleUrl: './create-project-dialog.css',
})
export class CreateProjectDialog {
  private readonly dialogRef = inject(MatDialogRef<CreateProjectDialog, CreateProjectValue>);
  protected readonly model = signal<CreateProjectValue>({ name: '', referenceDate: '' });
  protected readonly projectForm = form(this.model, (path) => {
    required(path.name, { message: 'Project name is required.' });
    maxLength(path.name, 80, { message: 'Use at most 80 characters.' });
    required(path.referenceDate, { message: 'Reference date is required.' });
    validate(path.referenceDate, ({ value }) =>
      !value() || isReferenceDate(value())
        ? undefined
        : { kind: 'reference-date', message: 'Enter a valid calendar date.' },
    );
  });

  protected save(): void {
    void submit(this.projectForm, () => {
      this.dialogRef.close({
        name: this.model().name.trim(),
        referenceDate: this.model().referenceDate,
      });
      return Promise.resolve();
    });
  }
}

export interface CreateProjectValue {
  name: string;
  referenceDate: string;
}
