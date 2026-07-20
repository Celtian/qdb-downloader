import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { PlayerPosition } from '../../../../shared/contracts';
import { PositionBadge } from './position-badge';

describe('PositionBadge', () => {
  let fixture: ComponentFixture<PositionBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PositionBadge] }).compileComponents();
    fixture = TestBed.createComponent(PositionBadge);
  });

  for (const [position, abbreviation, label] of [
    ['GOALKEEPER', 'GK', 'Goalkeeper'],
    ['DEFENDER', 'DEF', 'Defender'],
    ['MIDFIELDER', 'MID', 'Midfielder'],
    ['ATTACKER', 'ATT', 'Attacker'],
  ] as const) {
    it(`renders ${abbreviation} for ${position}`, async () => {
      fixture.componentRef.setInput('position', position satisfies PlayerPosition);
      await fixture.whenStable();
      const badge = (fixture.nativeElement as HTMLElement).querySelector('abbr');

      expect(badge?.textContent.trim()).toBe(abbreviation);
      expect(badge?.getAttribute('aria-label')).toBe(label);
      expect(badge?.getAttribute('title')).toBe(label);
    });
  }
});
