import { Component, input } from '@angular/core';

@Component({
  selector: 'app-floating-orb',
  standalone: true,
  template: `<div class="orb" [style.animation-delay]="delay()" [style.width.px]="size()" [style.height.px]="size()"></div>`,
  styles: `
    .orb {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
      animation: float 8s ease-in-out infinite;
      pointer-events: none;
      filter: blur(1px);
    }
  `
})
export class FloatingOrbComponent {
  delay = input('0s');
  size = input(60);
}
