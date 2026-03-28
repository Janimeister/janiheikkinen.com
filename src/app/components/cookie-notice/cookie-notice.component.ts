import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-cookie-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6">
        <div class="max-w-3xl mx-auto bg-bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-2xl">
          <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div class="flex-1">
              <h3 class="text-sm font-semibold text-text-primary mb-1.5">🍪 Cookie & Privacy Notice</h3>
              <p class="text-xs text-text-secondary leading-relaxed">
                This site does not use tracking cookies or analytics.
                We use <strong class="text-text-primary">localStorage</strong> solely to remember your cookie consent preference.
                The weather page lets you search for locations — your search query is sent to
                <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" class="text-accent-primary hover:underline">Open-Meteo</a>
                for geocoding and forecasts. No personal data is collected or stored by us.
              </p>
            </div>
            <button (click)="accept()"
                    class="shrink-0 px-5 py-2 text-sm font-medium rounded-xl bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors cursor-pointer">
              Got it
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CookieNoticeComponent {
  visible = signal(!this.hasConsented());

  accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    this.visible.set(false);
  }

  private hasConsented(): boolean {
    try {
      return localStorage.getItem('cookie-consent') === 'accepted';
    } catch {
      return false;
    }
  }
}
