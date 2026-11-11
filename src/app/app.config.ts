import { Location } from '@angular/common';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { keepEarlyInput } from './early-input';
import { LanguageService } from './i18n/language.service';
import { languageOfUrl, pageOfUrl } from './i18n/localized-url';
import { PageTitleStrategy } from './navigation/page-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    // The header and footer start before the router has opened the page. On a Finnish address
    // they wait for the Finnish copy, so the prerendered Finnish never flips to English and back.
    provideAppInitializer(() => {
      const url = inject(Location).path();
      return inject(LanguageService).setLanguage(languageOfUrl(url), pageOfUrl(url));
    }),
    // Pages are prerendered at build time; the browser picks up that HTML instead of redrawing
    // it, and clicks made before the app has started are replayed once it has.
    provideClientHydration(withEventReplay()),
    keepEarlyInput(),
  ],
};
