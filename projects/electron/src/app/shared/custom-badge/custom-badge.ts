import { Component, computed, input } from '@angular/core';

import type { CustomBadge as CustomBadgeValue } from '../../../../shared/custom-badge';

const badgeColorClasses: Record<CustomBadgeValue['color'], string> = {
  blue: 'bg-badge-blue text-badge-blue-content',
  green: 'bg-badge-green text-badge-green-content',
  orange: 'bg-badge-orange text-badge-orange-content',
  pink: 'bg-badge-pink text-badge-pink-content',
  purple: 'bg-badge-purple text-badge-purple-content',
  red: 'bg-badge-red text-badge-red-content',
  teal: 'bg-badge-teal text-badge-teal-content',
  yellow: 'bg-badge-yellow text-badge-yellow-content',
};

@Component({
  selector: 'app-custom-badge',
  template: `
    <span
      class="inline-block rounded-full px-2.5 text-xs leading-6 font-bold whitespace-nowrap"
      [class]="colorClasses()"
      [title]="badge().description"
    >
      {{ badge().name }}
    </span>
  `,
  styleUrl: './custom-badge.css',
})
export class CustomBadge {
  readonly badge = input.required<CustomBadgeValue>();
  protected readonly colorClasses = computed(() => badgeColorClasses[this.badge().color]);
}
