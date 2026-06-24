import { Component, resource, ChangeDetectionStrategy, inject } from '@angular/core';
import { TypingEffectComponent } from './typing-effect.component';
import { FloatingOrbComponent } from '../shared/floating-orb.component';
import { LanguageService } from '../../i18n/language.service';

interface CatFact { fact: string }

@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypingEffectComponent, FloatingOrbComponent],
  template: `
    <section id="hero" class="relative flex-1 flex items-center justify-center overflow-hidden px-6">
      <!-- Flat deco shapes -->
      <app-floating-orb class="absolute top-[14%] left-[12%] z-[1] hidden md:block" delay="0s" [size]="64" shape="square" color="yellow" rotate="-6deg" />
      <app-floating-orb class="absolute top-[58%] right-[10%] z-[1] hidden md:block" delay="1.5s" [size]="48" shape="circle" color="pink" />
      <app-floating-orb class="absolute bottom-[16%] left-[20%] z-[1] hidden md:block" delay="3s" [size]="56" shape="triangle" color="sky" />
      <app-floating-orb class="absolute top-[20%] right-[22%] z-[1] hidden lg:block" delay="2s" [size]="32" shape="square" color="lime" rotate="8deg" />

      <!-- Content -->
      <div class="relative z-10 text-center max-w-3xl">
        <p class="sticker mb-6">{{ i18n.t('hero.sticker') }}</p>

        <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span class="marker">Jani Heikkinen</span>
        </h1>

        <div class="mb-10 inline-block min-w-48 border-2 border-ink bg-bg-card px-5 py-2 shadow-[3px_3px_0_0_#131310]">
          <app-typing-effect />
        </div>

        <!-- Social links -->
        <div class="flex items-center justify-center gap-5 mb-12">
          <a href="https://github.com/Janimeister" target="_blank" rel="noopener noreferrer"
             class="social-link" style="--hover-bg: var(--color-pop-yellow)" aria-label="GitHub">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <a href="https://youtube.com/@Janimeister" target="_blank" rel="noopener noreferrer"
             class="social-link" style="--hover-bg: var(--color-pop-pink)" aria-label="YouTube">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
          <a href="https://twitch.tv/Janimeister" target="_blank" rel="noopener noreferrer"
             class="social-link" style="--hover-bg: var(--color-pop-sky)" aria-label="Twitch">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
          </a>
        </div>

        <!-- Cat fact -->
        <div class="max-w-sm mx-auto">
          @if (catFact.value(); as factData) {
            <p class="text-xs text-text-secondary leading-relaxed font-mono border-l-4 border-pop-orange pl-3 text-left"
               data-testid="catfact-text">
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
      border: 2px solid var(--color-ink);
      background: var(--color-bg-card);
      color: var(--color-ink);
      box-shadow: var(--shadow-brutal-sm);
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    .social-link:hover {
      background: var(--hover-bg, var(--color-pop-yellow));
      transform: translate(-2px, -2px);
      box-shadow: var(--shadow-brutal);
    }
    .social-link:active {
      transform: translate(2px, 2px);
      box-shadow: none;
    }
    :host { display: flex; flex-direction: column; flex: 1; }
  `
})
export class HeroComponent {
  protected readonly i18n = inject(LanguageService);

  catFact = resource({
    loader: async (): Promise<CatFact> => {
      const res = await fetch('https://catfact.ninja/fact?max_length=120');
      if (!res.ok) throw new Error('CatFact API error');
      return res.json();
    }
  });
}