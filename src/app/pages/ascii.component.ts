import { DOCUMENT } from '@angular/common';
import { Component, signal, afterNextRender, OnDestroy, inject } from '@angular/core';
import { ASPECT_CORRECTION, COLS, generateGrid, ROWS, type AlgorithmId } from '../ascii/ascii-art';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { PageHeaderComponent } from '../components/shared/page-header.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { registerTranslations } from '../i18n/dictionaries';
import { LanguageService } from '../i18n/language.service';
import { ASCII_EN } from '../i18n/pages/ascii.en';
import type { TranslationKey } from '../i18n/translations';

interface ArtAlgorithm {
  id: AlgorithmId;
  labelKey: TranslationKey;
  icon: string;
}

const REVEAL_DURATION = 2000;

// This page's English copy; the Finnish copy is fetched by the route when it's needed.
registerTranslations('en', ASCII_EN);

@Component({
  selector: 'app-ascii-art-page',
  imports: [GlowCardComponent, FloatingOrbComponent, PageHeaderComponent],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20 overflow-hidden">
      <app-floating-orb
        class="hidden md:block absolute top-[12%] right-[12%] z-[1]"
        delay="0s"
        [size]="65"
        shape="triangle"
        color="lime"
        rotate="8deg"
      />
      <app-floating-orb
        class="hidden md:block absolute bottom-[25%] left-[8%] z-[1]"
        delay="3s"
        [size]="55"
        shape="square"
        color="orange"
        rotate="-5deg"
      />
      <app-floating-orb
        class="hidden lg:block absolute top-[48%] left-[4%] z-[1]"
        delay="1.5s"
        [size]="42"
        shape="circle"
        color="sky"
        rotate="3deg"
      />

      <div class="relative z-10 max-w-6xl mx-auto">
        <app-page-header titleKey="ascii.title" subtitleKey="ascii.subtitle" marker="lime" />

        <!-- Controls -->
        <div class="mb-6 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <div class="flex flex-wrap items-center gap-3">
              <span
                class="text-sm font-semibold text-text-secondary mr-1 uppercase tracking-wider"
                >{{ i18n.t('ascii.algorithm') }}</span
              >
              @for (algo of algorithms; track algo.id) {
                <button
                  (click)="selectAlgorithm(algo.id)"
                  [class]="
                    currentAlgorithm() === algo.id
                      ? 'px-3 py-1.5 text-sm font-semibold bg-pop-yellow text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform'
                      : 'px-3 py-1.5 text-sm font-semibold bg-bg-card text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform'
                  "
                  [attr.aria-pressed]="currentAlgorithm() === algo.id"
                >
                  {{ algo.icon }} {{ i18n.t(algo.labelKey) }}
                </button>
              }
              <button
                (click)="generate()"
                [disabled]="isAnimating()"
                class="sm:ml-auto px-4 py-1.5 text-sm font-semibold bg-pop-pink text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                [attr.aria-label]="i18n.t('ascii.generateAria')"
              >
                🎲 {{ i18n.t('ascii.generate') }}
              </button>
            </div>
          </app-glow-card>
        </div>

        <!-- ASCII Art Display -->
        <div class="animate-fade-slide-up stagger-2">
          <app-glow-card>
            <div
              class="overflow-x-auto"
              tabindex="0"
              role="region"
              [attr.aria-label]="i18n.t('ascii.outputRegion')"
            >
              <pre class="ascii-art" role="img" [attr.aria-label]="i18n.t('ascii.generatedArt')">{{
                displayText()
              }}</pre>
            </div>
          </app-glow-card>
        </div>
      </div>
    </section>
  `,
  styles: `
    .ascii-art {
      font-family: 'JetBrains Mono', monospace;
      font-size: clamp(8px, 1.1vw, 14px);
      line-height: 1.2;
      color: var(--color-ink);
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      box-shadow: 5px 5px 0 0 var(--color-ink);
      padding: 1rem;
      white-space: pre;
      margin: 0;
      min-height: 420px;
    }
  `,
})
export class AsciiArtPageComponent implements OnDestroy {
  protected readonly i18n = inject(LanguageService);
  private readonly document = inject(DOCUMENT);
  readonly algorithms: ArtAlgorithm[] = [
    { id: 'plasma', labelKey: 'ascii.plasma', icon: '🌊' },
    { id: 'mandelbrot', labelKey: 'ascii.mandelbrot', icon: '🔬' },
    { id: 'waves', labelKey: 'ascii.waves', icon: '🌀' },
    { id: 'spiral', labelKey: 'ascii.spiral', icon: '🌌' },
    { id: 'terrain', labelKey: 'ascii.terrain', icon: '⛰️' },
    { id: 'coral', labelKey: 'ascii.coral', icon: '🪸' },
    { id: 'windlines', labelKey: 'ascii.windlines', icon: '💨' },
    { id: 'island', labelKey: 'ascii.island', icon: '🗺️' },
  ];

  readonly currentAlgorithm = signal<AlgorithmId>('plasma');
  readonly displayText = signal('');
  readonly isAnimating = signal(false);

  private animationFrameId: number | null = null;

  constructor() {
    afterNextRender(() => this.generate());
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  selectAlgorithm(id: AlgorithmId): void {
    this.currentAlgorithm.set(id);
    this.generate();
  }

  generate(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const grid = generateGrid(this.currentAlgorithm(), Math.random() * 1000);
    this.animateReveal(grid);
  }

  // ── Animation ────────────────────────────────────────────────────────

  private animateReveal(grid: string[][]): void {
    this.isAnimating.set(true);

    // Skip animation for users who prefer reduced motion — show full grid immediately
    if (this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      this.displayText.set(grid.map((row) => row.join('')).join('\n'));
      this.isAnimating.set(false);
      return;
    }

    const centerR = ROWS / 2;
    const centerC = COLS / 2;
    const maxDist = Math.sqrt(centerR * centerR + (centerC * ASPECT_CORRECTION) ** 2);
    const startTime = performance.now();

    // Pre-compute delay for each cell (radial wave from center)
    const delays: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      delays[r] = [];
      for (let c = 0; c < COLS; c++) {
        const dist = Math.sqrt((r - centerR) ** 2 + ((c - centerC) * ASPECT_CORRECTION) ** 2);
        delays[r][c] = (dist / maxDist) * REVEAL_DURATION;
      }
    }

    const step = (): void => {
      const elapsed = performance.now() - startTime;
      const lines: string[] = [];

      for (let r = 0; r < ROWS; r++) {
        let line = '';
        for (let c = 0; c < COLS; c++) {
          if (elapsed >= delays[r][c]) {
            line += grid[r][c];
          } else {
            line += ' ';
          }
        }
        lines.push(line);
      }

      this.displayText.set(lines.join('\n'));

      if (elapsed < REVEAL_DURATION + 50) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.isAnimating.set(false);
      }
    };

    this.animationFrameId = requestAnimationFrame(step);
  }
}
