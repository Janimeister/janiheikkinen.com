import { Component, signal, computed, resource, ChangeDetectionStrategy } from '@angular/core';
import { ParticleCanvasComponent } from './particle-canvas.component';
import { TypingEffectComponent } from './typing-effect.component';
import { FloatingOrbComponent } from '../shared/floating-orb.component';

interface CatFact { fact: string }

@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ParticleCanvasComponent, TypingEffectComponent, FloatingOrbComponent],
  host: { '(window:mousemove)': 'onMouseMove($event)' },
  template: `
    <section id="hero" class="relative flex-1 flex items-center justify-center overflow-hidden">
      <!-- Gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a2e] via-[#0a0a0f] to-[#1a0a2e] animate-gradient-shift opacity-80"></div>

      <!-- Particle canvas -->
      <app-particle-canvas class="absolute inset-0 z-[1]" />

      <!-- Floating orbs -->
      <app-floating-orb class="absolute top-[10%] left-[15%] z-[1]" delay="0s" [size]="80" />
      <app-floating-orb class="absolute top-[60%] right-[10%] z-[1]" delay="2s" [size]="50" />
      <app-floating-orb class="absolute bottom-[20%] left-[60%] z-[1]" delay="4s" [size]="100" />

      <!-- Content -->
      <div class="relative z-10 text-center px-6" [style.transform]="parallaxTransform()">
        <h1 class="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
          <span class="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Jani Heikkinen
          </span>
        </h1>

        <div class="mb-8 h-8">
          <app-typing-effect />
        </div>

        <!-- Social links -->
        <div class="flex items-center justify-center gap-6 mb-10">
          <a href="https://github.com/Janimeister" target="_blank" rel="noopener noreferrer"
             class="social-link" aria-label="GitHub">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <a href="https://youtube.com/@Janimeister" target="_blank" rel="noopener noreferrer"
             class="social-link" aria-label="YouTube">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
          <a href="https://twitch.tv/Janimeister" target="_blank" rel="noopener noreferrer"
             class="social-link" aria-label="Twitch">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
          </a>
        </div>

        <!-- Cat fact -->
        <div class="max-w-sm mx-auto">
          @if (catFact.value(); as factData) {
            <p class="text-xs text-text-secondary/50 leading-relaxed" data-testid="catfact-text">
              🐱 {{ factData.fact }}
            </p>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      transition: all 0.3s ease;
    }
    .social-link:hover {
      color: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      box-shadow: 0 0 15px rgba(99,102,241,0.3);
      transform: translateY(-2px);
    }
    :host { display: flex; flex-direction: column; flex: 1; }
  `
})
export class HeroComponent {
  private mouseX = signal(0);
  private mouseY = signal(0);

  parallaxTransform = computed(() =>
    `translate(${this.mouseX() * 0.02}px, ${this.mouseY() * 0.02}px)`
  );

  catFact = resource({
    loader: async (): Promise<CatFact> => {
      const res = await fetch('https://catfact.ninja/fact?max_length=120');
      if (!res.ok) throw new Error('CatFact API error');
      return res.json();
    }
  });

  onMouseMove(event: MouseEvent) {
    this.mouseX.set(event.clientX - window.innerWidth / 2);
    this.mouseY.set(event.clientY - window.innerHeight / 2);
  }
}
