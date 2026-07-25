import type { ApplicationConfig } from '@angular/core';
import { LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAppVersion } from 'ngx-app-version';
import { provideNullable } from 'ngx-nullable';

import { VERSION_INFO } from '../../../version-info';
import { UI_LOCALE } from '../../shared/ui-format';
import { uiPaginatorIntlFactory } from './shared/ui-paginator';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideNullable(),
    provideAppVersion({ version: VERSION_INFO.version }),
    { provide: LOCALE_ID, useValue: UI_LOCALE },
    { provide: MAT_DATE_LOCALE, useValue: UI_LOCALE },
    { provide: MatPaginatorIntl, useFactory: uiPaginatorIntlFactory },
  ],
};
