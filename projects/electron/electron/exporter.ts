import { app, dialog } from 'electron';
import type { ExportFormat, ExportResult, Project } from '../shared/contracts.js';
import type { SnapshotDatabase } from './database.js';
import { SnapshotExportWriter } from './export-writer.js';

export class SnapshotExporter {
  private readonly writer: SnapshotExportWriter;

  constructor(database: SnapshotDatabase) {
    this.writer = new SnapshotExportWriter(database);
  }

  async export(project: Project, format: ExportFormat): Promise<ExportResult | undefined> {
    const result = await dialog.showOpenDialog({
      title: 'Choose export destination',
      defaultPath: app.getPath('documents'),
      properties: ['openDirectory', 'createDirectory'],
    });
    const destination = result.filePaths.find((path) => path.trim());
    if (result.canceled || !destination) return undefined;
    return this.writer.write(project, format, destination);
  }
}
