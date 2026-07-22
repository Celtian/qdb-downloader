import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { PlayerPositionDetail } from '../../../../shared/contracts';
import { PositionDetailBadge } from './position-detail-badge';

describe('PositionDetailBadge', () => {
  let fixture: ComponentFixture<PositionDetailBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PositionDetailBadge] }).compileComponents();
    fixture = TestBed.createComponent(PositionDetailBadge);
  });

  for (const [positionDetail, groupClass] of [
    ['GK', 'position-badge--goalkeeper'],
    ['RB', 'position-badge--defender'],
    ['RM', 'position-badge--midfielder'],
    ['RW', 'position-badge--attacker'],
  ] as const) {
    it(`renders ${positionDetail} with the ${groupClass} color`, async () => {
      fixture.componentRef.setInput(
        'positionDetail',
        positionDetail satisfies PlayerPositionDetail,
      );
      await fixture.whenStable();
      const badge = (fixture.nativeElement as HTMLElement).querySelector('abbr');

      expect(badge?.textContent.trim()).toBe(positionDetail);
      expect(badge?.classList).toContain(groupClass);
      expect(badge?.getAttribute('aria-label')).toBe(`Detailed position ${positionDetail}`);
      expect(badge?.getAttribute('title')).toBe(positionDetail);
    });
  }
});
