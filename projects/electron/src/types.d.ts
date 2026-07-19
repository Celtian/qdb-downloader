import type { QdbDesktopApi } from '../shared/contracts';

declare global {
  interface Window {
    qdb: QdbDesktopApi;
  }
}

export {};
