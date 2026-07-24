import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { CustomBadge } from './custom-badge';

describe('CustomBadge', () => {
  it('renders its palette color, name, and tooltip accessibly', async () => {
    const fixture = TestBed.createComponent(CustomBadge);
    fixture.componentRef.setInput('badge', {
      id: 'badge-review',
      name: 'Review',
      description: 'Needs manual review',
      color: 'purple',
    });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const badge = element.querySelector('span');

    expect(badge?.textContent.trim()).toBe('Review');
    expect(badge?.classList).toContain('custom-badge--purple');
    expect(badge?.getAttribute('title')).toBe('Needs manual review');
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
