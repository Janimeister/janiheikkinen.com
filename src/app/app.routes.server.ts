import { RenderMode, type ServerRoute } from '@angular/ssr';

// The site is hosted as static files, so every page is written to HTML at build time. Catch-all
// routes have no address of their own and are skipped; `/404` stands in for them.
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];
