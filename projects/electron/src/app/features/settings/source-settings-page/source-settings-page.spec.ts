import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';

import axe from 'axe-core';

import type { SourceName } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { SourceSettingsPage } from './source-settings-page';

describe('SourceSettingsPage', () => {
  it('loads, reorders, and persists every provider accessibly', async () => {
    const initial: SourceName[] = ['transfermarkt', 'soccerway', 'worldfootball', 'eurofotbal'];
    const api = {
      getSourcePriority: vi.fn(() => Promise.resolve({ ok: true as const, value: initial })),
      updateSourcePriority: vi.fn((sourceNames: SourceName[]) =>
        Promise.resolve({ ok: true as const, value: sourceNames }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [SourceSettingsPage],
      providers: [{ provide: DesktopApi, useValue: api }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SourceSettingsPage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const element = fixture.nativeElement as HTMLElement;

    expect([...element.querySelectorAll('.priority-list li')]).toHaveLength(4);
    expect(element.querySelector('.eyebrow')?.textContent.trim()).toBe('Source data');
    await (
      await loader.getHarness(
        MatButtonHarness.with({ selector: '[aria-label="Move Transfermarkt down"]' }),
      )
    ).click();
    await fixture.whenStable();

    expect(api.updateSourcePriority).toHaveBeenCalledWith([
      'soccerway',
      'transfermarkt',
      'worldfootball',
      'eurofotbal',
    ]);
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
