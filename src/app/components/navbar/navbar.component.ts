import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  host: { '(window:scroll)': 'onScroll()' },
  template: `
    <nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
         [class.nav-scrolled]="scrolled()">
      <div class="max-w-6xl mx-auto px-6 md:px-12 lg:px-20 h-16 flex items-center justify-between">
        <a routerLink="/" class="text-lg font-semibold text-text-primary tracking-tight hover:text-accent-primary transition-colors">
          JH<span class="text-accent-primary">.</span>
        </a>
        <div class="flex items-center gap-6">
          @for (link of navLinks; track link.route) {
            <a [routerLink]="link.route"
               routerLinkActive="text-accent-primary!"
               [routerLinkActiveOptions]="{ exact: link.route === '/' }"
               class="text-sm text-text-secondary hover:text-accent-primary transition-colors relative group">
              {{ link.label }}
              <span class="absolute -bottom-1 left-0 w-0 h-px bg-accent-primary transition-all duration-300 group-hover:w-full animate-breathing-border"></span>
            </a>
          }
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
  `
})
export class NavbarComponent {
  scrolled = signal(false);

  navLinks = [
    { label: 'Home', route: '/' },
    { label: 'Weather', route: '/weather' },
    { label: 'Electricity', route: '/electricity' },
    { label: 'GitHub', route: '/github' },
  ];

  onScroll() {
    this.scrolled.set(window.scrollY > 50);
  }
}
