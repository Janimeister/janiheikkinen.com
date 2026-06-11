import { Component, input } from '@angular/core';

@Component({
  selector: 'app-glow-card',
  standalone: true,
  template: `
    <div class="glow-card" [class]="extraClass()">
      <ng-content />
    </div>
  `,
  styles: `
    .glow-card {
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      border-radius: 0;
      padding: 1.5rem;
      box-shadow: var(--shadow-brutal);
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      position: relative;
      overflow: hidden;
    }
    .glow-card:hover {
      transform: translate(-2px, -2px);
      background: var(--color-bg-card-hover);
      box-shadow: var(--shadow-brutal-lg);
    }
  `
})
export class GlowCardComponent {
  extraClass = input('');
}