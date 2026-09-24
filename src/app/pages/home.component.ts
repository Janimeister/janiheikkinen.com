import { Component, inject } from '@angular/core';
import { HeroComponent } from '../components/hero/hero.component';
import { PageDirectoryComponent } from '../navigation/page-directory.component';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'app-home',
  imports: [HeroComponent, PageDirectoryComponent],
  template: `
    <app-hero />
    <section class="home-explore" aria-labelledby="home-explore-title">
      <h2 id="home-explore-title">{{ i18n.t('explore.title') }}</h2>
      <app-page-directory />
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    app-hero {
      display: flex;
      flex-direction: column;
      min-height: 34rem;
      padding: 4rem 0;
    }
    .home-explore {
      width: 100%;
      max-width: 64rem;
      margin: 0 auto;
      padding: 1.5rem 1.5rem 4rem;
    }
    h2 {
      font-size: 1.75rem;
      margin-bottom: 1.5rem;
    }
  `,
})
export class HomeComponent {
  protected readonly i18n = inject(LanguageService);
}
