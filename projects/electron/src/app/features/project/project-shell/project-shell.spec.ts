import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatButtonHarness } from '@angular/material/button/testing';
import { DesktopApi } from '../../../core/desktop-api';
import { AboutDialogService } from '../../../shared/about-dialog/about-dialog';
import { ProjectShell } from './project-shell';

describe('ProjectShell', () => {
  it('opens the About dialog from the project toolbar', async () => {
    const aboutDialog = { open: vi.fn() };
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
                ok: false as const,
                error: { code: 'NOT_FOUND' as const, message: 'Project not found' },
              }),
            ),
          },
        },
        { provide: AboutDialogService, useValue: aboutDialog },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectShell);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    await (await loader.getHarness(MatButtonHarness.with({ text: /About/ }))).click();

    expect(aboutDialog.open).toHaveBeenCalledOnce();
  });
});
