import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../i18n/language.service';
import { findPageGroups } from './page-registry';

@Component({
  selector: 'app-page-directory',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="page-groups">
      @for (group of groups(); track group.id) {
        <section>
          <h3>{{ i18n.t(group.labelKey) }}</h3>
          <ul>
            @for (page of group.pages; track page.path) {
              <li>
                <a
                  class="brutal-hover brutal-press"
                  [routerLink]="'/' + page.path"
                  routerLinkActive="current-page"
                  [routerLinkActiveOptions]="{
                    paths: 'exact',
                    queryParams: 'ignored',
                    matrixParams: 'ignored',
                    fragment: 'ignored',
                  }"
                  ariaCurrentWhenActive="page"
                  (click)="onSelect($event)"
                >
                  <span
                    ><strong>{{ i18n.t(page.labelKey) }}</strong>
                    <span class="description">{{ i18n.t(page.descriptionKey) }}</span></span
                  >
                  <span aria-hidden="true">→</span>
                </a>
              </li>
            }
          </ul>
        </section>
      }
    </div>
    @if (query().trim()) {
      <p role="status">
        {{
          i18n.t(resultCount() ? 'explore.results' : 'explore.noResults', { count: resultCount() })
        }}
      </p>
    }
  `,
  styles: `
    .page-groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem;
    }
    h3 {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.65rem;
    }
    ul {
      display: grid;
      gap: 0.65rem;
    }
    a {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem;
      border: 2px solid var(--color-ink);
      background: var(--color-bg-card);
      color: var(--color-ink);
      text-decoration: none;
      min-height: 72px;
    }
    a:hover {
      background: var(--color-pop-yellow);
      box-shadow: var(--shadow-brutal-sm);
    }
    a.current-page {
      background: var(--color-pop-pink);
    }
    strong {
      font-size: 0.95rem;
    }
    .description {
      display: block;
      margin-top: 0.2rem;
      font-size: 0.8rem;
      overflow-wrap: anywhere;
    }
    p {
      margin-top: 1rem;
    }
    @media (max-width: 540px) {
      .page-groups {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PageDirectoryComponent {
  protected readonly i18n = inject(LanguageService);
  readonly query = input('');
  readonly selected = output<void>();
  readonly groups = computed(() => findPageGroups(this.query(), (key) => this.i18n.t(key)));
  readonly resultCount = computed(() =>
    this.groups().reduce((count, group) => count + group.pages.length, 0),
  );

  onSelect(event: MouseEvent): void {
    // Preserve the launcher when a link is opened in a new tab/window.
    if (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      this.selected.emit();
    }
  }
}
