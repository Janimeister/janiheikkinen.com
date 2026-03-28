import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="relative z-10 border-t border-white/[0.04] py-6 px-6">
      <div class="max-w-6xl mx-auto flex items-center justify-between text-xs text-text-secondary">
        <span>&copy; {{ year }} Jani Heikkinen</span>
        <span class="flex items-center gap-1">
          Built with &lt;3 &amp; GitHub Copilot &amp; Angular
        </span>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  year = new Date().getFullYear();
}
