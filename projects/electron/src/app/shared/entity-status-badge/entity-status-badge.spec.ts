import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { EntityStatus } from '../../../../shared/entity-status';
import { EntityStatusBadge, entityStatusDetails } from './entity-status-badge';

describe('EntityStatusBadge', () => {
  let fixture: ComponentFixture<EntityStatusBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EntityStatusBadge] }).compileComponents();
    fixture = TestBed.createComponent(EntityStatusBadge);
  });

  it.each([
    ['new', 'New', 'entity-status-badge--new'],
    ['needs-update', 'Needs update', 'entity-status-badge--needs-update'],
  ] as const)('renders the %s status accessibly', async (status, label, className) => {
    fixture.componentRef.setInput('status', status satisfies EntityStatus);
    await fixture.whenStable();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('span');

    expect(badge?.textContent.trim()).toBe(label);
    expect(badge?.classList).toContain(className);
    expect(badge?.getAttribute('title')).toBe(entityStatusDetails[status].description);
  });
});
