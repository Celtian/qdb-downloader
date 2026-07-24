import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { EntityStatus } from '../../../../shared/entity-status';
import { EntityStatusSettingsService } from '../../core/entity-status-settings.service';
import { EntityStatusBadge, entityStatusDetails } from './entity-status-badge';

describe('EntityStatusBadge', () => {
  let fixture: ComponentFixture<EntityStatusBadge>;

  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({ imports: [EntityStatusBadge] }).compileComponents();
    fixture = TestBed.createComponent(EntityStatusBadge);
  });

  it.each([
    ['new', 'New', 'entity-status-badge--new'],
    ['old', 'Old', 'entity-status-badge--old'],
  ] as const)('renders the %s status accessibly', async (status, label, className) => {
    fixture.componentRef.setInput('status', status satisfies EntityStatus);
    await fixture.whenStable();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('span');

    expect(badge?.textContent.trim()).toBe(label);
    expect(badge?.classList).toContain(className);
    expect(badge?.getAttribute('title')).toBe(entityStatusDetails[status].description);
  });

  it('updates tooltip descriptions from the global badge settings', async () => {
    const settings = TestBed.inject(EntityStatusSettingsService);
    fixture.componentRef.setInput('status', 'new' satisfies EntityStatus);
    await fixture.whenStable();

    settings.setSettings({ newDays: 1, oldMonths: 2 });
    await fixture.whenStable();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('span');
    expect(badge?.getAttribute('title')).toBe('Created within the last 1 day');

    fixture.componentRef.setInput('status', 'old' satisfies EntityStatus);
    await fixture.whenStable();
    expect(badge?.getAttribute('title')).toBe(
      'Last updated at least 2 months before the project reference date',
    );
  });
});
