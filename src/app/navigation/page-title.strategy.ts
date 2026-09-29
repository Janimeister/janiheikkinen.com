import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { type ActivatedRouteSnapshot, type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LanguageService } from '../i18n/language.service';
import { canonicalUrl, pageTitle, type PageMeta } from './page-registry';

/**
 * Keeps the document title, description, canonical link and social tags in step with the route
 * and the chosen language.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(LanguageService);
  private readonly page = signal<{ url: string; data: PageMeta } | null>(null);

  constructor() {
    super();
    effect(() => {
      const page = this.page();
      if (page) this.apply(page.url, page.data);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route: ActivatedRouteSnapshot = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    this.page.set({ url: snapshot.url, data: route.data as PageMeta });
  }

  private apply(url: string, data: PageMeta): void {
    const title = pageTitle(data.titleKey ? this.i18n.t(data.titleKey) : null);
    const description = this.i18n.t(data.metaKey ?? 'meta.home');
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (data.noindex) {
      canonical?.remove();
      this.meta.removeTag('property="og:url"');
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      return;
    }
    const href = canonicalUrl(url);
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = href;
    this.meta.updateTag({ property: 'og:url', content: href });
    this.meta.removeTag('name="robots"');
  }
}
