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
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      padding: 1.5rem;
      animation: glow-pulse 4s ease-in-out infinite;
      transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .glow-card:hover {
      transform: translateY(-4px);
      background: var(--color-bg-card-hover);
      box-shadow: 0 0 30px rgba(99,102,241,0.2);
    }
  `
})
export class GlowCardComponent {
  extraClass = input('');
}
