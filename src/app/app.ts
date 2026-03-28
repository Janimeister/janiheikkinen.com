import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { CookieNoticeComponent } from './components/cookie-notice/cookie-notice.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CookieNoticeComponent],
  template: `
    <app-navbar />
    <main class="flex-1 flex flex-col">
      <router-outlet />
    </main>
    <app-footer />
    <app-cookie-notice />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      position: relative;
      z-index: 1;
    }
  `
})
export class App {}

