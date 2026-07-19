import { Utils } from 'electrobun';
import type { ExportFormat, ExportResult, Project } from '../shared/contracts';
import type { SnapshotDatabase } from './database';
import { SnapshotExportWriter } from './export-writer';

export class SnapshotExporter {
  private readonly writer: SnapshotExportWriter;

  constructor(database: SnapshotDatabase) {
    this.writer = new SnapshotExportWriter(database);
  }

  async export(project: Project, format: ExportFormat): Promise<ExportResult | undefined> {
    const directories = await Utils.openFileDialog({
      startingFolder: Utils.paths.documents,
      canChooseFiles: false,
      canChooseDirectory: true,
      allowsMultipleSelection: false,
    });
    const destination = directories.find((path) => path.trim());
    if (!destination) return undefined;
    return this.writer.write(project, format, destination);
  }
}
