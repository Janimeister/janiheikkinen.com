import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { LanguageService } from './i18n/language.service';
import { PageTitleStrategy } from './navigation/page-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    // A visitor who chose Finnish sees Finnish from the first paint.
    provideAppInitializer(() => inject(LanguageService).ready),
  ],
};
