import { Component, signal, OnDestroy, effect, inject } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-typing-effect',
  template: `
    <span class="text-text-primary text-lg md:text-xl font-mono font-medium">
      {{ displayText() }}<span class="animate-cursor-blink text-accent-primary font-bold" aria-hidden="true">█</span>
    </span>
  `,
})
export class TypingEffectComponent implements OnDestroy {
  private readonly i18n = inject(LanguageService);
  private readonly prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  displayText = signal('');
  private roleIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (this.prefersReducedMotion) {
      effect(() => this.displayText.set(this.roles()[0]));
      return;
    }
    effect(() => {
      this.i18n.language(); // track language changes and restart animation
      this.restartAnimation();
    });
  }

  private restartAnimation() {
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = null;
    this.roleIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.displayText.set('');
    this.tick();
  }

  private roles(): string[] {
    return [
      this.i18n.t('hero.role1'),
      this.i18n.t('hero.role2'),
    ];
  }

  private tick() {
    const roles = this.roles();
    const currentRole = roles[this.roleIndex] ?? roles[0];

    if (this.isDeleting) {
      this.charIndex = Math.max(0, this.charIndex - 1);
      this.displayText.set(currentRole.substring(0, this.charIndex));
    } else {
      this.charIndex = Math.min(currentRole.length, this.charIndex + 1);
      this.displayText.set(currentRole.substring(0, this.charIndex));
    }

    let delay = this.isDeleting ? 40 : 80;

    if (!this.isDeleting && this.charIndex === currentRole.length) {
      delay = 2000;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.roleIndex = (this.roleIndex + 1) % roles.length;
      delay = 500;
    }

    this.timerId = setTimeout(() => this.tick(), delay);
  }

  ngOnDestroy() {
    if (this.timerId) clearTimeout(this.timerId);
  }
}
