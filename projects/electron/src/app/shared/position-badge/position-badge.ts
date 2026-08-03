import { Component, computed, input } from '@angular/core';

import type { PlayerPosition } from '../../../../shared/contracts';

export interface PositionBadgeDetails {
  abbreviation: string;
  className: string;
  label: string;
}

export const positionBadgeDetails: Record<PlayerPosition, PositionBadgeDetails> = {
  GOALKEEPER: {
    abbreviation: 'GK',
    className: 'bg-position-goalkeeper text-white',
    label: 'Goalkeeper',
  },
  DEFENDER: {
    abbreviation: 'DEF',
    className: 'bg-position-defender text-position-defender-content',
    label: 'Defender',
  },
  MIDFIELDER: {
    abbreviation: 'MID',
    className: 'bg-position-midfielder text-white',
    label: 'Midfielder',
  },
  ATTACKER: {
    abbreviation: 'ATT',
    className: 'bg-position-attacker text-white',
    label: 'Attacker',
  },
};

@Component({
  selector: 'app-position-badge',
  template: `
    <abbr
      class="inline-block min-w-11 rounded-full px-2 text-center text-xs leading-6 font-bold tracking-wide whitespace-nowrap no-underline"
      [class]="details().className"
      [attr.aria-label]="details().label"
      [title]="details().label"
    >
      {{ details().abbreviation }}
    </abbr>
  `,
  styleUrl: './position-badge.css',
})
export class PositionBadge {
  readonly position = input.required<PlayerPosition>();
  protected readonly details = computed(() => positionBadgeDetails[this.position()]);
}
