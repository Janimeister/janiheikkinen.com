import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  makeStateKey,
  PLATFORM_ID,
  TransferState,
  type ResourceStatus,
} from '@angular/core';

/**
 * False while the build writes each page's HTML (see `app.routes.server.ts`). Pages are written
 * without calling any API, so a build never depends on one and no stale data is published;
 * requests, timers and stored settings start in the browser.
 */
export function injectIsBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}

/**
 * A resource with nothing to show yet: its request is in flight, or it was left unrequested
 * while the page was prerendered. Either way the page shows its loading placeholders.
 */
export function isWaiting(resource: { isLoading(): boolean; status(): ResourceStatus }): boolean {
  return resource.isLoading() || resource.status() === 'idle';
}

/**
 * A value that is made up while the page is prerendered (random numbers, say) and handed to the
 * browser with the HTML, so the app starts from exactly what the visitor is already looking at.
 * It is used once: opening the page again later makes a fresh one.
 */
export function injectPrerendered<T>(name: string, create: () => T): T {
  const state = inject(TransferState);
  const key = makeStateKey<T>(name);
  if (state.hasKey(key)) {
    const value = state.get(key, null as T);
    state.remove(key);
    return value;
  }
  const value = create();
  if (!injectIsBrowser()) state.set(key, value);
  return value;
}
