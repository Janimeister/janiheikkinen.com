import { Component, signal, ChangeDetectionStrategy, ElementRef, viewChild, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../../i18n/language.service';
import { LanguageToggleComponent } from '../language-toggle/language-toggle.component';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LanguageToggleComponent],
  host: {
    '(window:scroll)': 'onScroll()',
    '(window:resize)': 'checkOverflow()',
  },
  template: `
    <nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
         [class.nav-scrolled]="scrolled()">
      <div class="max-w-6xl mx-auto px-6 md:px-12 lg:px-20 h-16 flex items-center justify-between gap-4">
        <a routerLink="/" class="text-lg font-semibold text-text-primary tracking-tight hover:text-accent-primary transition-colors shrink-0">
          JH<span class="text-accent-primary">.</span>
        </a>
        <app-language-toggle class="shrink-0" />
        <div class="relative min-w-0 flex-1 flex items-center justify-end gap-3">
          <div class="relative min-w-0">
            <!-- Left fade hint -->
            @if (canScrollLeft()) {
              <div class="nav-fade nav-fade-left" aria-hidden="true"></div>
            }
            <div #navScroll
                 class="flex items-center gap-6 overflow-x-auto scrollbar-hide scroll-smooth"
                 (scroll)="checkOverflow()">
              @for (link of navLinks; track link.route) {
                <a [routerLink]="link.route"
                   routerLinkActive="text-accent-primary!"
                   [routerLinkActiveOptions]="{ exact: link.route === '/' }"
                   class="text-sm text-text-secondary hover:text-accent-primary transition-colors relative group whitespace-nowrap shrink-0">
                  {{ i18n.t(link.labelKey) }}
                  <span class="absolute -bottom-1 left-0 w-0 h-px bg-accent-primary transition-all duration-300 group-hover:w-full animate-breathing-border"></span>
                </a>
              }
            </div>
            <!-- Right fade hint -->
            @if (canScrollRight()) {
              <div class="nav-fade nav-fade-right" aria-hidden="true"></div>
            }
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: `
    nav {
      backdrop-filter: blur(0px);
      background: transparent;
    }
    .nav-scrolled {
      backdrop-filter: blur(12px);
      background: rgba(10, 10, 15, 0.8);
      border-bottom: 1px solid var(--color-border);
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .nav-fade {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2rem;
      pointer-events: none;
      z-index: 2;
    }
    .nav-fade-left {
      left: 0;
      background: linear-gradient(to right, rgba(10, 10, 15, 0.9), transparent);
    }
    .nav-fade-right {
      right: 0;
      background: linear-gradient(to left, rgba(10, 10, 15, 0.9), transparent);
    }
    .nav-scrolled .nav-fade-left {
      background: linear-gradient(to right, rgba(10, 10, 15, 0.8), transparent);
    }
    .nav-scrolled .nav-fade-right {
      background: linear-gradient(to left, rgba(10, 10, 15, 0.8), transparent);
    }
  `
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  protected readonly i18n = inject(LanguageService);
  private readonly navScrollRef = viewChild<ElementRef<HTMLElement>>('navScroll');

  scrolled = signal(false);
  canScrollLeft = signal(false);
  canScrollRight = signal(false);

  navLinks = [
    { labelKey: 'nav.home', route: '/' },
    { labelKey: 'nav.weather', route: '/weather' },
    { labelKey: 'nav.electricity', route: '/electricity' },
    { labelKey: 'nav.github', route: '/github' },
    { labelKey: 'nav.ascii', route: '/ascii' },
    { labelKey: 'nav.snake', route: '/snake' },
    { labelKey: 'nav.pet', route: '/pet' },
  ] as const;

  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    effect(() => {
      this.i18n.language(); // track language changes
      queueMicrotask(() => this.checkOverflow());
    });
  }

  ngAfterViewInit() {
    this.checkOverflow();
    const el = this.navScrollRef()?.nativeElement;
    if (el) {
      this.resizeObserver = new ResizeObserver(() => this.checkOverflow());
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  onScroll() {
    this.scrolled.set(window.scrollY > 50);
  }

  checkOverflow() {
    const el = this.navScrollRef()?.nativeElement;
    if (!el) return;
    this.canScrollLeft.set(el.scrollLeft > 2);
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }
}
