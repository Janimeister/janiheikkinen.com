import { Component, signal, ChangeDetectionStrategy, afterNextRender, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';

type AlgorithmId = 'plasma' | 'mandelbrot' | 'waves' | 'spiral' | 'terrain';

interface ArtAlgorithm {
  id: AlgorithmId;
  label: string;
  icon: string;
}

const CHAR_RAMP = ' .·:;=+*#%@';
const COLS = 80;
const ROWS = 35;
const REVEAL_DURATION = 2000;
/** Aspect ratio correction: characters are ~2× taller than wide */
const ASPECT_CORRECTION = 0.5;

@Component({
  selector: 'app-ascii-art-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a1e] via-[#0a0a0f] to-[#1a0a1e] animate-gradient-shift opacity-40"></div>
      <app-floating-orb class="absolute top-[12%] right-[12%] z-[1]" delay="0s" [size]="65" />
      <app-floating-orb class="absolute bottom-[25%] left-[8%] z-[1]" delay="3s" [size]="55" />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm text-text-secondary hover:text-accent-primary transition-colors mb-4 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            Back to Home
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="bg-gradient-to-r from-slate-200 via-indigo-300 to-purple-400 bg-clip-text text-transparent">ASCII Art</span>
          </h1>
          <p class="text-text-secondary mt-2">Procedurally generated ASCII art</p>
        </div>

        <!-- Controls -->
        <div class="mb-6 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm text-text-secondary mr-1">Algorithm:</span>
              @for (algo of algorithms; track algo.id) {
                <button
                  (click)="selectAlgorithm(algo.id)"
                  [class]="currentAlgorithm() === algo.id
                    ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                    : 'px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 border border-white/5 transition-colors'"
                  [attr.aria-pressed]="currentAlgorithm() === algo.id">
                  {{ algo.icon }} {{ algo.label }}
                </button>
              }
              <button
                (click)="generate()"
                [disabled]="isAnimating()"
                class="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Generate new ASCII art">
                🎲 Generate
              </button>
            </div>
          </app-glow-card>
        </div>

        <!-- ASCII Art Display -->
        <div class="animate-fade-slide-up stagger-2">
          <app-glow-card>
            <div class="overflow-x-auto">
              <pre class="ascii-art" role="img" aria-label="Generated ASCII art">{{ displayText() }}</pre>
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
      color: var(--color-accent-primary);
      text-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
      white-space: pre;
      margin: 0;
      min-height: 420px;
    }
  `,
})
export class AsciiArtPageComponent implements OnDestroy {
  readonly algorithms: ArtAlgorithm[] = [
    { id: 'plasma', label: 'Plasma', icon: '🌊' },
    { id: 'mandelbrot', label: 'Mandelbrot', icon: '🔬' },
    { id: 'waves', label: 'Waves', icon: '🌀' },
    { id: 'spiral', label: 'Galaxy', icon: '🌌' },
    { id: 'terrain', label: 'Terrain', icon: '⛰️' },
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
    const grid = this.generateGrid(this.currentAlgorithm());
    this.animateReveal(grid);
  }

  // ── Animation ────────────────────────────────────────────────────────

  private animateReveal(grid: string[][]): void {
    this.isAnimating.set(true);
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

  // ── Grid generation ──────────────────────────────────────────────────

  private generateGrid(algorithm: AlgorithmId): string[][] {
    const seed = Math.random() * 1000;
    switch (algorithm) {
      case 'mandelbrot':
        return this.generateMandelbrot(seed);
      case 'waves':
        return this.generateWaves(seed);
      case 'spiral':
        return this.generateSpiral(seed);
      case 'terrain':
        return this.generateTerrain(seed);
      default:
        return this.generatePlasma(seed);
    }
  }

  private charFromValue(value: number): string {
    const idx = Math.floor(Math.max(0, Math.min(1, value)) * (CHAR_RAMP.length - 1));
    return CHAR_RAMP[idx];
  }

  /** Hash-based PRNG returning a value in [0, 1) for pseudo-random patterns */
  private hashNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  // ── Algorithms ───────────────────────────────────────────────────────

  private generatePlasma(seed: number): string[][] {
    const grid: string[][] = [];
    const s1 = 3 + Math.sin(seed) * 2;
    const s2 = 4 + Math.cos(seed * 1.3) * 2;
    const s3 = 5 + Math.sin(seed * 0.7) * 3;
    const s4 = 6 + Math.cos(seed * 2.1) * 2;
    const p1 = seed * 1.1;
    const p2 = seed * 0.7;
    const p3 = seed * 1.3;
    const p4 = seed * 0.5;

    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        const x = (c / COLS) * 10;
        const y = (r / ROWS) * 10;
        let v = 0;
        v += Math.sin(x / s1 + p1);
        v += Math.sin(y / s2 + p2);
        v += Math.sin((x + y) / s3 + p3);
        v += Math.sin(Math.sqrt(x * x + y * y) / s4 + p4);
        v += Math.sin(x * Math.cos(p1 * 0.3) + y * Math.sin(p2 * 0.3)) * 0.5;
        v += Math.cos(Math.sqrt((x - 5) ** 2 + (y - 5) ** 2) * 1.5 + p3) * 0.4;
        // Normalize sum of ~6 sine components (range ≈ ±5.9) to [0, 1]
        v = (v + 5.9) / 11.8;
        grid[r][c] = this.charFromValue(v);
      }
    }
    return grid;
  }

  private generateMandelbrot(seed: number): string[][] {
    const grid: string[][] = [];
    const maxIter = 80;

    const regions = [
      { x: -0.75, y: 0, zoom: 18 },
      { x: -0.77568377, y: 0.13646737, zoom: 200 },
      { x: -0.1011, y: 0.9563, zoom: 50 },
      { x: -1.25066, y: 0.02012, zoom: 120 },
      { x: -0.7463, y: 0.1102, zoom: 80 },
      { x: -0.16, y: 1.0405, zoom: 60 },
    ];

    const region = regions[Math.floor(Math.abs(Math.sin(seed * 7.3)) * regions.length)];

    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        const x0 = region.x + ((c - COLS / 2) / (region.zoom * 10)) * 2;
        // Correct aspect ratio: COLS/ROWS compensates for character cell proportions
        const y0 = region.y + ((r - ROWS / 2) / (region.zoom * 10)) * (COLS / ROWS);

        let x = 0,
          y = 0,
          iter = 0;
        while (x * x + y * y <= 4 && iter < maxIter) {
          const xn = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xn;
          iter++;
        }

        // Smooth coloring
        let v: number;
        if (iter === maxIter) {
          v = 0;
        } else {
          const logZn = Math.log(x * x + y * y) / 2;
          const nu = Math.log(logZn / Math.LN2) / Math.LN2;
          v = (iter + 1 - nu) / maxIter;
        }
        grid[r][c] = this.charFromValue(Math.abs(v));
      }
    }
    return grid;
  }

  private generateWaves(seed: number): string[][] {
    const grid: string[][] = [];
    const numSources = 3 + Math.floor(Math.abs(Math.sin(seed * 3.7)) * 3);
    const sources: { x: number; y: number; wl: number; phase: number }[] = [];

    for (let i = 0; i < numSources; i++) {
      sources.push({
        x: Math.sin(seed * (i + 1) * 1.7) * COLS * 0.35 + COLS / 2,
        y: Math.cos(seed * (i + 1) * 2.3) * ROWS * 0.35 + ROWS / 2,
        wl: 2 + Math.abs(Math.sin(seed * (i + 1) * 0.9)) * 4,
        phase: seed * (i + 1) * 0.5,
      });
    }

    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let v = 0;
        for (const src of sources) {
          const dx = c - src.x;
          const dy = (r - src.y) * 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          v += Math.sin(dist / src.wl + src.phase);
        }
        v = (v / numSources + 1) / 2;
        grid[r][c] = this.charFromValue(v);
      }
    }
    return grid;
  }

  private generateSpiral(seed: number): string[][] {
    const grid: string[][] = [];
    const numArms = 2 + Math.floor(Math.abs(Math.sin(seed * 5.1)) * 3);
    const tightness = 2 + Math.abs(Math.cos(seed * 3.3)) * 4;
    const rotation = seed;

    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        const dx = (c - COLS / 2) / (COLS / 2);
        const dy = ((r - ROWS / 2) / (ROWS / 2)) * 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const theta = Math.atan2(dy, dx) + rotation;

        let v = 0;

        // Spiral arms
        for (let i = 0; i < numArms; i++) {
          const armAngle = (2 * Math.PI * i) / numArms;
          const spiralAngle = Math.log(dist + 0.001) * tightness + armAngle;
          const raw = ((theta - spiralAngle) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
          v += Math.exp(-raw * raw * 5) * Math.max(0, 1 - dist * 0.85);
        }

        // Bright galactic center
        v += Math.exp(-dist * dist * 10) * 0.9;

        // Star field (hash-based PRNG)
        const noise = this.hashNoise(c, r, seed);
        if (noise > 0.96) v += 0.25;

        grid[r][c] = this.charFromValue(Math.min(v, 1));
      }
    }
    return grid;
  }

  private generateTerrain(seed: number): string[][] {
    const grid: string[][] = [];

    // Foreground mountain heights via layered sine
    const fgHeights: number[] = [];
    for (let c = 0; c < COLS; c++) {
      let h = 0;
      h += Math.sin(c * 0.04 + seed) * 0.35;
      h += Math.sin(c * 0.09 + seed * 1.7) * 0.2;
      h += Math.sin(c * 0.17 + seed * 2.3) * 0.1;
      h += Math.sin(c * 0.37 + seed * 3.1) * 0.05;
      fgHeights.push((h + 0.7) * 0.55);
    }

    // Background mountain heights
    const bgHeights: number[] = [];
    for (let c = 0; c < COLS; c++) {
      let h = 0;
      h += Math.sin(c * 0.025 + seed * 0.5) * 0.25;
      h += Math.sin(c * 0.06 + seed * 1.2) * 0.12;
      bgHeights.push((h + 0.37) * 0.4);
    }

    // Moon position
    const moonX = Math.floor(COLS * 0.7 + Math.sin(seed) * COLS * 0.12);
    const moonY = Math.floor(ROWS * 0.08 + Math.abs(Math.cos(seed)) * ROWS * 0.06);
    const moonR = 2;

    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      const yNorm = r / ROWS;

      for (let c = 0; c < COLS; c++) {
        const bgLine = 1 - bgHeights[c] - 0.12;
        const fgLine = 1 - fgHeights[c];

        // Moon
        const mdx = (c - moonX) / 2;
        const mdy = r - moonY;
        const moonDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (moonDist <= moonR) {
          grid[r][c] = moonDist < moonR * 0.5 ? '@' : '*';
          continue;
        }

        if (yNorm < 0.12) {
          // Stars (hash-based PRNG for pseudo-random placement)
          grid[r][c] = this.hashNoise(c, r, seed) > 0.94 ? '·' : ' ';
        } else if (yNorm < bgLine) {
          // Open sky
          grid[r][c] = this.hashNoise(c, r, seed) > 0.97 ? '·' : ' ';
        } else if (yNorm < fgLine) {
          // Background mountains
          const depth = (yNorm - bgLine) / (fgLine - bgLine);
          grid[r][c] = this.charFromValue(depth * 0.35 + 0.1);
        } else {
          // Foreground terrain
          const depth = (yNorm - fgLine) / (1 - fgLine);
          grid[r][c] = this.charFromValue(depth * 0.55 + 0.4);

          // Trees near the terrain line
          if (depth < 0.18) {
            if (this.hashNoise(c, 0, seed * 2) > 0.6) {
              grid[r][c] = depth < 0.06 ? '^' : '|';
            }
          }
        }
      }
    }

    // Water at the bottom
    for (let r = Math.floor(ROWS * 0.88); r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const wave = Math.sin(c * 0.3 + seed + r * 0.5) * 0.5 + 0.5;
        if (grid[r][c] === ' ' || grid[r][c] === '·') {
          grid[r][c] = wave > 0.6 ? '~' : wave > 0.3 ? '-' : ' ';
        }
      }
    }

    return grid;
  }
}
