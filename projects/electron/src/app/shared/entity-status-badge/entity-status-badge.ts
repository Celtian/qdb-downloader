import { Component, computed, input } from '@angular/core';
import type { EntityStatus } from '../../../../shared/entity-status';

interface EntityStatusDetails {
  className: string;
  label: string;
  description: string;
}

export const entityStatusDetails: Record<EntityStatus, EntityStatusDetails> = {
  new: {
    className: 'entity-status-badge entity-status-badge--new',
    label: 'New',
    description: 'Created within the last 72 hours',
  },
  'needs-update': {
    className: 'entity-status-badge entity-status-badge--needs-update',
    label: 'Needs update',
    description: 'Last updated at least six months before the project reference date',
  },
};

@Component({
  selector: 'app-entity-status-badge',
  template: `
    <span [class]="details().className" [title]="details().description">
      {{ details().label }}
    </span>
  `,
  styleUrl: './entity-status-badge.css',
})
export class EntityStatusBadge {
  readonly status = input.required<EntityStatus>();
  protected readonly details = computed(() => entityStatusDetails[this.status()]);
}
