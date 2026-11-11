import { Location } from '@angular/common';
import { inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * The address of the page being shown. Until the router has opened its first page that is
 * wherever the browser already is, so the header of a prerendered page never points at the home
 * page for a moment while the page's own code loads.
 */
export function injectCurrentUrl(): Signal<string> {
  const router = inject(Router);
  const location = inject(Location);
  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: router.navigated ? router.url : location.path(true) || '/' },
  );
}
