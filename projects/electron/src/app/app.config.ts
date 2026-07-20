import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAppVersion } from 'ngx-app-version';
import { provideNullable } from 'ngx-nullable';

import { VERSION_INFO } from '../../../version-info';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideNullable(),
    provideAppVersion({ version: VERSION_INFO.version }),
  ],
};
