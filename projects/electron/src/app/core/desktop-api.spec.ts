import { TestBed } from '@angular/core/testing';
import { DesktopApi } from './desktop-api';

describe('DesktopApi', () => {
  let service: DesktopApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesktopApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('forwards entity filter option requests to the desktop bridge', async () => {
    const listEntityFilterOptions = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          entity: 'players' as const,
          teams: [],
          nationalities: [],
          positions: [],
          feet: [],
        },
      }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        listEntityFilterOptions,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(
      connectedService.listEntityFilterOptions({ projectId: 'project', entity: 'players' }),
    ).resolves.toMatchObject({ ok: true, value: { entity: 'players' } });
    expect(listEntityFilterOptions).toHaveBeenCalledWith({
      projectId: 'project',
      entity: 'players',
    });
  });

  it('forwards export folder selection to the desktop bridge', async () => {
    const chooseExportDirectory = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: '/tmp/export' }),
    );
    Object.defineProperty(window, 'qdb', {
      configurable: true,
      value: {
        chooseExportDirectory,
        onScrapeProgress: vi.fn(),
      },
    });
    const connectedService = new DesktopApi();

    await expect(connectedService.chooseExportDirectory()).resolves.toEqual({
      ok: true,
      value: '/tmp/export',
    });
    expect(chooseExportDirectory).toHaveBeenCalledOnce();
  });
});
