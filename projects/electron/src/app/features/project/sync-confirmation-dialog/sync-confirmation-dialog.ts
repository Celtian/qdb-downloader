import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type {
  ImportConflictSummary,
  ImportChangeSummary,
  LeagueSynchronizeImportOperation,
  SynchronizeImportOperation,
} from '../../../../../shared/contracts';

const isLeagueSynchronization = (
  operation: SynchronizeImportOperation,
): operation is LeagueSynchronizeImportOperation => operation.target.entity === 'leagues';

export interface SyncConfirmationData {
  name: string;
  changes: ImportChangeSummary;
  conflicts: ImportConflictSummary;
  operation: SynchronizeImportOperation;
}

@Component({
  selector: 'app-sync-confirmation-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './sync-confirmation-dialog.html',
  styleUrl: './sync-confirmation-dialog.css',
})
export class SyncConfirmationDialog {
  protected readonly data = inject<SyncConfirmationData>(MAT_DIALOG_DATA);
  protected readonly rows = [
    {
      label: 'Leagues',
      counts: { ...this.data.changes.leagues, moved: 0, detached: 0, deduplicated: 0 },
    },
    { label: 'Teams', counts: { ...this.data.changes.teams, deduplicated: 0 } },
    { label: 'Players', counts: { ...this.data.changes.players, detached: 0 } },
  ];
  protected readonly policies = this.describePolicies(this.data.operation);
  protected readonly deletedCount =
    this.data.changes.leagues.deleted +
    this.data.changes.teams.deleted +
    this.data.changes.players.deleted;
  protected readonly detachedCount = this.data.changes.teams.detached;
  protected readonly deduplicatedCount = this.data.changes.players.deduplicated;

  private describePolicies(operation: SynchronizeImportOperation): string[] {
    const playerPolicy =
      operation.options.absentPlayers === 'delete'
        ? 'Absent players will be permanently deleted.'
        : 'Absent players will be kept unchanged.';
    const playerNames = operation.options.overridePlayerNames
      ? 'Existing player names will be replaced with Transfermarkt names.'
      : 'Existing player names will be preserved.';
    const playerOwnership =
      operation.options.playerTeamConflicts === 'move'
        ? 'Players found in another team will be moved to the imported team.'
        : 'Players found in another team will remain there and be skipped.';
    if (!isLeagueSynchronization(operation)) return [playerPolicy, playerNames, playerOwnership];

    const teamPolicy = {
      keep: 'Absent teams will be kept in this league unchanged.',
      detach: 'Absent teams will be removed from this league but kept with their squads.',
      delete: 'Absent teams and their squads will be permanently deleted.',
    }[operation.options.absentTeams];
    const teamNames = operation.options.overrideTeamNames
      ? 'Existing team names will be replaced with Transfermarkt names.'
      : 'Existing team names will be preserved.';
    const teamOwnership =
      operation.options.teamLeagueConflicts === 'move'
        ? 'Teams found in another league will be moved to this league.'
        : 'Teams found in another league will remain there.';
    return [teamPolicy, playerPolicy, teamNames, playerNames, teamOwnership, playerOwnership];
  }
}
