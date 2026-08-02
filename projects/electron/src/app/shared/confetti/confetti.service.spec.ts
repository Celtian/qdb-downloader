import { Overlay } from '@angular/cdk/overlay';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Confetti } from './confetti';
import { ConfettiService } from './confetti.service';

describe('ConfettiService', () => {
  let service: ConfettiService;
  let burst: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let componentRef: ComponentRef<Confetti>;
  let overlayRef: {
    attach: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    hostElement: HTMLElement;
    overlayElement: HTMLElement;
  };
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    burst = vi.fn();
    clear = vi.fn();
    componentRef = {
      instance: { burst, clear } as unknown as Confetti,
    } as ComponentRef<Confetti>;
    overlayRef = {
      attach: vi.fn().mockReturnValue(componentRef),
      dispose: vi.fn(),
      hostElement: document.createElement('div'),
      overlayElement: document.createElement('div'),
    };
    create = vi.fn().mockReturnValue(overlayRef);
    const left = vi.fn().mockReturnValue('position-strategy');
    const top = vi.fn().mockReturnValue({ left });

    TestBed.configureTestingModule({
      providers: [
        ConfettiService,
        {
          provide: Overlay,
          useValue: {
            create,
            position: () => ({ global: () => ({ top }) }),
            scrollStrategies: { noop: () => 'noop-strategy' },
          },
        },
      ],
    });
    service = TestBed.inject(ConfettiService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates one full-screen overlay and forwards repeated bursts', () => {
    service.burst({ particleCount: 5 });
    service.burst({ particleCount: 5 });

    expect(create).toHaveBeenCalledOnce();
    expect(overlayRef.attach).toHaveBeenCalledOnce();
    expect(burst).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        hasBackdrop: false,
        height: '100vh',
        panelClass: 'confetti-overlay-pane',
        width: '100vw',
      }),
    );
    expect(overlayRef.hostElement.style.zIndex).toBe('1000000000');
  });

  it('performs the three celebration bursts', () => {
    const callbacks = new Map<number, VoidFunction>();
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay) => {
      if (typeof callback === 'function') {
        callbacks.set(Number(delay), () => {
          callback();
        });
      }
      return 1;
    });

    service.celebrate({ colors: ['gold'], particleCount: 10 });
    callbacks.get(140)?.();
    callbacks.get(260)?.();

    expect(burst).toHaveBeenCalledTimes(3);
    expect(burst).toHaveBeenNthCalledWith(1, {
      particleCount: 10,
      spread: 80,
      startVelocity: 28,
      colors: ['gold'],
    });
    expect(burst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ origin: { x: 0.25, y: 0.45 } }),
    );
    expect(burst).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ origin: { x: 0.75, y: 0.45 } }),
    );
  });

  it('clears, disposes, and recreates the overlay', () => {
    service.burst();
    service.clear();
    service.dispose();
    service.burst();

    expect(clear).toHaveBeenCalledOnce();
    expect(overlayRef.dispose).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledTimes(2);
  });
});
