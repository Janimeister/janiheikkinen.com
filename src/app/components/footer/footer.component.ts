import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="relative z-10 border-t border-white/[0.04] py-6 px-6">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-secondary">
        <span>&copy; {{ year }} Jani Heikkinen</span>
        <div class="flex items-center gap-4">
          <a routerLink="/third-party-notices"
             class="hover:text-accent-light transition-colors">
            Third-Party Notices
          </a>
          <span class="flex items-center gap-1">
            Built with &lt;3 &amp; GitHub Copilot &amp; Angular
          </span>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  year = new Date().getFullYear();
}
