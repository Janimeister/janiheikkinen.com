import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { LanguageService } from '../../i18n/language.service';
import { LanguageToggleComponent } from '../language-toggle/language-toggle.component';
import { PageDirectoryComponent } from '../../navigation/page-directory.component';
import { SITE_PAGES } from '../../navigation/page-registry';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, LanguageToggleComponent, PageDirectoryComponent],
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:keydown)': 'onShortcut($event)',
  },
  template: `
    <nav [class.nav-scrolled]="scrolled()" [attr.aria-label]="i18n.t('explore.navigation')">
      <div class="header-content">
        <a
          routerLink="/"
          class="logo brutal-hover brutal-press"
          [attr.aria-label]="i18n.t('nav.home')"
          >JH.</a
        >
        <span class="current-location">{{ currentLabel() }}</span>
        <app-language-toggle />
        <button
          #exploreButton
          type="button"
          class="explore-button brutal-hover brutal-press"
          (click)="open()"
          aria-haspopup="dialog"
          [attr.aria-expanded]="isOpen()"
          aria-controls="explore-launcher"
          aria-keyshortcuts="Control+k Meta+k"
        >
          {{ i18n.t('explore.open') }} <kbd aria-hidden="true">Ctrl / ⌘ K</kbd>
        </button>
      </div>
    </nav>
    <dialog
      #launcher
      id="explore-launcher"
      aria-labelledby="explore-title"
      (cancel)="onCancel($event)"
      (close)="finishClose()"
      (click)="onBackdrop($event)"
      (keydown)="onDialogKeydown($event)"
    >
      <div class="launcher-heading">
        <h2 id="explore-title">{{ i18n.t('explore.title') }}</h2>
        <button type="button" class="close-button brutal-hover brutal-press" (click)="close()">
          {{ i18n.t('explore.close') }} <span aria-hidden="true">×</span>
        </button>
      </div>
      <label for="explore-search">{{ i18n.t('explore.search') }}</label>
      <input
        #search
        id="explore-search"
        type="search"
        autocomplete="off"
        [value]="query()"
        [placeholder]="i18n.t('explore.placeholder')"
        (input)="query.set(search.value)"
      />
      <app-page-directory [query]="query()" (selected)="closeForNavigation()" />
      <button type="button" class="surprise-button brutal-hover brutal-press" (click)="surprise()">
        {{ i18n.t('explore.surprise') }}
      </button>
    </dialog>
  `,
  styles: `
    nav {
      position: fixed;
      inset: 0 0 auto;
      z-index: 50;
      background: var(--color-bg-primary);
      border-bottom: 2px solid transparent;
    }
    .nav-scrolled {
      border-color: var(--color-ink);
    }
    .header-content {
      max-width: 72rem;
      margin: auto;
      padding: 0 1.5rem;
      min-height: 4rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .logo {
      flex-shrink: 0;
      font-family: var(--font-display);
      font-size: 1.25rem;
      border: 2px solid var(--color-ink);
      background: var(--color-pop-yellow);
      padding: 0.125rem 0.5rem;
      box-shadow: var(--shadow-brutal-sm);
    }
    .current-location {
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    app-language-toggle {
      flex-shrink: 0;
    }
    button {
      cursor: pointer;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      font-weight: 700;
    }
    .explore-button {
      border: 2px solid var(--color-ink);
      background: var(--color-pop-yellow);
      box-shadow: var(--shadow-brutal-sm);
      flex-shrink: 0;
    }
    kbd {
      font: 0.7rem var(--font-mono);
      margin-left: 0.5rem;
    }
    dialog {
      color: var(--color-ink);
      background: var(--color-bg-primary);
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal-lg);
      width: min(44rem, calc(100% - 3rem));
      max-height: calc(100dvh - 3rem);
      margin: auto;
      padding: 1.5rem;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    dialog::backdrop {
      background: rgba(19, 19, 16, 0.55);
    }
    .launcher-heading {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    h2 {
      font-size: 1.5rem;
    }
    .close-button {
      border: 2px solid var(--color-ink);
      background: var(--color-bg-card);
      flex-shrink: 0;
    }
    .close-button:hover,
    .surprise-button:hover {
      background: var(--color-pop-yellow);
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.4rem;
    }
    input {
      width: 100%;
      border: 2px solid var(--color-ink);
      padding: 0.75rem;
      font-size: 1rem;
      background: var(--color-bg-card);
      margin-bottom: 1.5rem;
    }
    .surprise-button {
      border: 2px solid var(--color-ink);
      margin-top: 1.5rem;
      background: var(--color-pop-pink);
    }
    @media (max-width: 640px) {
      .header-content {
        gap: 0.65rem;
        padding: 0.65rem 1rem;
        flex-wrap: wrap;
      }
      .current-location {
        order: 4;
        flex-basis: 100%;
      }
      app-language-toggle {
        margin-left: auto;
      }
      kbd {
        display: none;
      }
      dialog {
        width: 100%;
        max-width: 100%;
        height: 100dvh;
        max-height: 100dvh;
        margin: 0;
        border: 0;
        box-shadow: none;
        padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
          max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
      }
      h2 {
        font-size: 1.25rem;
      }
    }
  `,
})
export class NavbarComponent implements OnDestroy {
  protected readonly i18n = inject(LanguageService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('launcher');
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('exploreButton');
  private returnFocus: HTMLElement | null = null;
  private previousOverflow = '';
  readonly isOpen = signal(false);
  readonly query = signal('');
  readonly scrolled = signal(false);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly currentPath = computed(
    () =>
      this.router
        .parseUrl(this.url())
        .root.children['primary']?.segments.map((segment) => segment.path)
        .join('/') ?? '',
  );
  readonly currentLabel = computed(() => {
    const page = SITE_PAGES.find((page) => page.path === this.currentPath());
    return this.i18n.t(page?.labelKey ?? 'thirdParty.title');
  });

  constructor() {
    // Close when a new navigation starts, not when an already-loading page finishes.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeForNavigation());
  }

  open(): void {
    if (this.isOpen()) return;
    this.returnFocus =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.query.set('');
    this.dialog().nativeElement.showModal();
    this.previousOverflow = this.document.documentElement.style.overflow;
    this.document.documentElement.style.overflow = 'hidden';
    this.isOpen.set(true);
    this.search().nativeElement.focus();
  }

  close(): void {
    if (!this.isOpen()) return;
    this.dialog().nativeElement.close();
    this.finishClose();
  }

  closeForNavigation(): void {
    // The previous page's focused control may be removed by the router.
    if (this.isOpen()) this.returnFocus = this.trigger().nativeElement;
    this.close();
  }

  finishClose(): void {
    // A queued close event from a previous opening must not close a reopened dialog.
    if (!this.isOpen() || this.dialog().nativeElement.open) return;
    this.isOpen.set(false);
    this.document.documentElement.style.overflow = this.previousOverflow;
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target !== this.dialog().nativeElement) return;
    const rect = this.dialog().nativeElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.close();
  }

  onShortcut(event: KeyboardEvent): void {
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      event.key.toLowerCase() === 'k' &&
      !event.repeat
    ) {
      event.preventDefault();
      if (this.isOpen()) this.close();
      else this.open();
    }
  }

  onDialogKeydown(event: KeyboardEvent): void {
    // Keep page-level game controls from reacting while browsing the launcher.
    event.stopPropagation();
    if (event.key === 'Tab') {
      const controls = this.dialog().nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && this.document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && this.document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    this.onShortcut(event);
  }

  surprise(): void {
    const pages = SITE_PAGES.filter(
      (page) =>
        (page.group === 'experiments' || page.group === 'play') && page.path !== this.currentPath(),
    );
    const page = pages[Math.floor(Math.random() * pages.length)];
    if (page) void this.router.navigateByUrl('/' + page.path);
  }

  onScroll(): void {
    this.scrolled.set(window.scrollY > 50);
  }
  ngOnDestroy(): void {
    this.close();
  }
}
