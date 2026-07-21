import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatButtonHarness } from '@angular/material/button/testing';
import axe from 'axe-core';
import type { ProjectSummary } from '../../../../../shared/contracts';
import { DesktopApi } from '../../../core/desktop-api';
import { AboutDialogService } from '../../../shared/about-dialog/about-dialog';
import { ProjectShell } from './project-shell';

describe('ProjectShell', () => {
  it('renders project navigation and footer actions inside a selected project', async () => {
    const aboutDialog = { open: vi.fn() };
    const project: ProjectSummary = {
      id: '',
      name: '2026/1',
      referenceDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
    };
    await TestBed.configureTestingModule({
      imports: [ProjectShell],
      providers: [
        provideRouter([]),
        {
          provide: DesktopApi,
          useValue: {
            projectUpdated: signal(undefined).asReadonly(),
            getProjectSummary: vi.fn(() =>
              Promise.resolve({
                ok: true as const,
                value: project,
              }),
            ),
          },
        },
        { provide: AboutDialogService, useValue: aboutDialog },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectShell);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const footer = element.querySelector('.sidebar-footer');

    expect(element.querySelector('.sidebar')).toBeTruthy();
    expect([...element.querySelectorAll('nav a')].map((link) => link.textContent.trim())).toEqual([
      'dashboardOverview',
      'emoji_eventsLeagues',
      'shieldTeams',
      'groupsPlayers',
      'cloud_downloadImport',
      'file_downloadExport',
    ]);
    expect([...(footer?.children ?? [])].map((item) => item.textContent.trim())).toEqual([
      'settingsSettings',
      'infoAbout',
    ]);
    expect(element.querySelector('mat-toolbar')?.textContent).toContain('2026/1');
    expect(element.querySelector('mat-toolbar a')?.textContent).toContain('Projects');

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: 'button.sidebar-action' }))
    ).click();

    expect(aboutDialog.open).toHaveBeenCalledOnce();
    expect((await axe.run(element)).violations).toEqual([]);
  });
});
