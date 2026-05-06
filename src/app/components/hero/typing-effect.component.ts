import { Component, signal, ChangeDetectionStrategy, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-typing-effect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="text-text-secondary text-lg md:text-xl font-light font-[JetBrains_Mono,monospace]">
      {{ displayText() }}<span class="animate-cursor-blink text-accent-primary">|</span>
    </span>
  `,
})
export class TypingEffectComponent implements OnDestroy {
  private roles = [
    'Voi pojat',
    'Parasta ikinä',
  ];

  displayText = signal('');
  private roleIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.displayText.set(this.roles[0]);
      return;
    }
    this.tick();
  }

  private tick() {
    const currentRole = this.roles[this.roleIndex];

    if (this.isDeleting) {
      this.charIndex--;
      this.displayText.set(currentRole.substring(0, this.charIndex));
    } else {
      this.charIndex++;
      this.displayText.set(currentRole.substring(0, this.charIndex));
    }

    let delay = this.isDeleting ? 40 : 80;

    if (!this.isDeleting && this.charIndex === currentRole.length) {
      delay = 2000;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.roleIndex = (this.roleIndex + 1) % this.roles.length;
      delay = 500;
    }

    this.timerId = setTimeout(() => this.tick(), delay);
  }

  ngOnDestroy() {
    if (this.timerId) clearTimeout(this.timerId);
  }
}
