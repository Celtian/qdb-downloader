import { Component, inject, signal } from '@angular/core';
import { FormField, form, pattern, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  sourceLabels,
  sourceSupportsSeason,
  type EditableEntityKind,
  type EntityFilterOption,
  type League,
  type Team,
} from '../../../../../shared/contracts';

export interface EditEntityDialogData {
  entity: League | Team;
  kind: EditableEntityKind;
  leagues: EntityFilterOption[];
}

export interface EditEntityValue {
  name: string;
  sourceId: string;
  season: string;
  leagueId: string;
}

@Component({
  selector: 'app-edit-entity-dialog',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './edit-entity-dialog.html',
  styleUrl: './edit-entity-dialog.css',
})
export class EditEntityDialog {
  protected readonly data = inject<EditEntityDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EditEntityDialog, EditEntityValue>);
  protected readonly model = signal<EditEntityValue>({
    name: this.data.entity.name,
    sourceId: this.data.entity.sourceId,
    season: sourceSupportsSeason[this.data.entity.sourceName]
      ? (this.data.entity.season ?? '')
      : '',
    leagueId: this.data.kind === 'teams' ? ((this.data.entity as Team).leagueId ?? '') : '',
  });
  protected readonly metadataForm = form(this.model, (path) => {
    required(path.name, { message: 'Name is required.' });
    required(path.sourceId, { message: 'Source ID is required.' });
    validate(path.sourceId, ({ value }) => {
      const pattern = this.sourceIdPattern();
      return pattern.test(value())
        ? undefined
        : {
            kind: 'sourceId',
            message:
              this.data.entity.sourceName === 'soccerway'
                ? 'Use the Soccerway path shown in the example.'
                : this.data.entity.sourceName === 'worldfootball'
                  ? 'Use the WorldFootball path shown in the example.'
                  : 'Use letters, numbers, underscores, or hyphens.',
          };
    });
    pattern(path.season, /^(|\d{4})$/, { message: 'Use a four-digit season or leave it empty.' });
  });
  protected readonly sourceLabel = sourceLabels[this.data.entity.sourceName];
  protected readonly supportsSeason = sourceSupportsSeason[this.data.entity.sourceName];
  protected readonly sourceIdExample = this.sourceExample();
  protected readonly sourceUrlExplanation = this.sourceExplanation();

  protected save(): void {
    void submit(this.metadataForm, async () => {
      await Promise.resolve();
      this.dialogRef.close({
        ...this.model(),
        name: this.model().name.trim(),
        sourceId: this.model().sourceId.trim(),
        season: this.model().season.trim(),
      });
    });
  }

  private sourceIdPattern(): RegExp {
    if (this.data.entity.sourceName === 'transfermarkt') return /^[a-zA-Z0-9_-]+$/;
    if (this.data.entity.sourceName === 'soccerway') {
      return this.data.kind === 'leagues'
        ? /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/standings\/[a-zA-Z0-9_-]+$/
        : /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
    }
    return this.data.kind === 'leagues' ? /^co\d+\/[a-zA-Z0-9_-]+$/ : /^te\d+\/[a-zA-Z0-9_-]+$/;
  }

  private sourceExample(): string {
    if (this.data.entity.sourceName === 'transfermarkt') {
      return this.data.kind === 'leagues' ? 'GB1' : '281';
    }
    if (this.data.entity.sourceName === 'soccerway') {
      return this.data.kind === 'leagues'
        ? 'czech-republic/chance-liga/standings/bNFMkskm'
        : 'slavia-prague/viXGgnyB';
    }
    return this.data.kind === 'leagues'
      ? 'co7093/mexico-lp---serie-b'
      : 'te237557/artesanos-metepec';
  }

  private sourceExplanation(): string {
    if (this.data.entity.sourceName === 'transfermarkt') {
      return this.data.kind === 'leagues'
        ? 'Soccerbot combines GB1 as https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1; season 2026 adds /plus?saison_id=2026.'
        : 'Soccerbot combines 281 as https://www.transfermarkt.com/slug/kader/verein/281/plus/1; season 2026 adds ?saison_id=2026.';
    }
    if (this.data.entity.sourceName === 'soccerway') {
      return this.data.kind === 'leagues'
        ? 'Soccerbot combines czech-republic/chance-liga/standings/bNFMkskm as https://www.soccerway.com/czech-republic/chance-liga/standings/bNFMkskm/standings/overall/.'
        : 'Soccerbot combines slavia-prague/viXGgnyB as https://www.soccerway.com/team/slavia-prague/viXGgnyB/squad/. A player such as kolar-ondrej/xfBGcS1U becomes https://www.soccerway.com/player/kolar-ondrej/xfBGcS1U/.';
    }
    return this.data.kind === 'leagues'
      ? 'Soccerbot combines co7093/mexico-lp---serie-b as https://www.worldfootball.net/competition/co7093/mexico-lp---serie-b/.'
      : 'Soccerbot combines te237557/artesanos-metepec as https://www.worldfootball.net/teams/te237557/artesanos-metepec/squad/. A player such as pe599828/oscar-altamirano becomes https://www.worldfootball.net/person/pe599828/oscar-altamirano/.';
  }
}
