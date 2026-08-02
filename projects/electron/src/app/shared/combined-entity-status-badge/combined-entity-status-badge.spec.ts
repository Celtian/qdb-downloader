import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatTooltipHarness } from '@angular/material/tooltip/testing';

import type { CombinedEntityKind } from '../../../../shared/contracts';
import {
  type CombinedEntityStatus,
  CombinedEntityStatusBadge,
  combinedEntityStatusDetails,
} from './combined-entity-status-badge';

describe('CombinedEntityStatusBadge', () => {
  const createBadge = async (status: CombinedEntityStatus, entityKind?: CombinedEntityKind) => {
    await TestBed.configureTestingModule({
      imports: [CombinedEntityStatusBadge],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombinedEntityStatusBadge);
    fixture.componentRef.setInput('status', status);
    if (entityKind) fixture.componentRef.setInput('entityKind', entityKind);
    await fixture.whenStable();
    return {
      fixture,
      loader: TestbedHarnessEnvironment.loader(fixture),
    };
  };

  it.each([
    ['ready', 'Ready', 'check_circle', 'record-status-badge--ready'],
    ['needsReview', 'Needs review', 'warning', 'record-status-badge--needs-review'],
  ] as const)(
    'renders the %s status with its shared presentation',
    async (status, label, icon, className) => {
      const { fixture, loader } = await createBadge(status);
      const badge = (fixture.nativeElement as HTMLElement).querySelector('span');

      expect(badge?.textContent.replace(/\s+/g, ' ').trim()).toBe(`${icon} ${label}`);
      expect(badge?.classList).toContain(className);
      expect(badge?.getAttribute('tabindex')).toBe('0');
      expect(badge?.querySelector('mat-icon')?.textContent.trim()).toBe(icon);

      const tooltip = await loader.getHarness(MatTooltipHarness);
      await tooltip.show();
      expect(await tooltip.getTooltipText()).toBe(combinedEntityStatusDetails[status].description);
    },
  );

  it('uses the entity-specific description when an entity kind is provided', async () => {
    const { loader } = await createBadge('needsReview', 'teams');
    const tooltip = await loader.getHarness(MatTooltipHarness);

    await tooltip.show();
    expect(await tooltip.getTooltipText()).toBe(
      'One or more source teams or players linked to this project team are missing. Review this project team.',
    );
  });
});
