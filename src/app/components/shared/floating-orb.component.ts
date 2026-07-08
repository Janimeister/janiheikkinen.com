import { Component, input } from '@angular/core';

/** Flat geometric decoration shape (square, circle or triangle) in a pop color. */
@Component({
  selector: 'app-floating-orb',
  template: `
    <div class="deco animate-bob"
         [class.deco-circle]="shape() === 'circle'"
         [class.deco-triangle]="shape() === 'triangle'"
         [style.animation-delay]="delay()"
         [style.--bob-rotate]="rotate()"
         [style.width.px]="size()"
         [style.height.px]="size()"
         [style.background]="'var(--color-pop-' + color() + ')'"
         aria-hidden="true"></div>
  `,
  styles: `
    .deco {
      position: absolute;
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal-sm);
      pointer-events: none;
      opacity: 0.9;
    }
    .deco-circle {
      border-radius: 50%;
    }
    .deco-triangle {
      clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    }
  `
})
export class FloatingOrbComponent {
  delay = input('0s');
  size = input(60);
  shape = input<'square' | 'circle' | 'triangle'>('square');
  color = input<'yellow' | 'pink' | 'lime' | 'sky' | 'orange'>('yellow');
  rotate = input('-3deg');
}