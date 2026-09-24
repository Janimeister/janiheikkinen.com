import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';
import type { VisualizerCategory } from './algorithm-metadata';

@Component({
  selector: 'app-visualizer-nav',
  imports: [RouterLink],
  template: `
    <nav class="visualizer-nav" [attr.aria-label]="i18n.t('algorithms.navigation')">
      @for (item of items; track item.id) {
        <a
          [routerLink]="item.path"
          [attr.aria-current]="category() === item.id ? 'page' : null"
          [class.current]="category() === item.id"
        >
          {{ i18n.t(item.label) }}
        </a>
      }
    </nav>
  `,
  styles: `
    .visualizer-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1.5rem 0;
    }
    a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 0.85rem;
      border: 2px solid var(--color-ink);
      background: var(--color-bg-card);
      font-weight: 700;
      box-shadow: var(--shadow-brutal-sm);
    }
    a.current {
      background: var(--color-pop-yellow);
    }
  `,
})
export class VisualizerNavComponent {
  readonly i18n = inject(LanguageService);
  readonly category = input.required<VisualizerCategory>();
  readonly items: readonly { id: VisualizerCategory; path: string; label: TranslationKey }[] = [
    { id: 'sorting', path: '/sorting', label: 'algorithms.sorting' },
    { id: 'searching', path: '/searching', label: 'algorithms.searching' },
    { id: 'pathfinding', path: '/pathfinding', label: 'algorithms.pathfinding' },
  ];
}
