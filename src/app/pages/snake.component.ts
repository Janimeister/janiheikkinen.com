import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  NgZone,
  inject,
  OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-snake-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#0a1e0a] via-[#0a0a0f] to-[#0a0a1e] animate-gradient-shift opacity-40"></div>
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
            <span class="bg-gradient-to-r from-emerald-300 via-green-400 to-teal-400 bg-clip-text text-transparent">Snake Game</span>
          </h1>
          <p class="text-text-secondary mt-2">Classic snake — use keyboard or swipe to play</p>
        </div>

        <!-- Score & Controls -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <div class="text-center">
              <div class="text-xs text-text-secondary uppercase tracking-wider mb-1">Score</div>
              <div class="text-3xl font-bold text-emerald-400 font-[JetBrains_Mono,monospace]" data-testid="snake-score">{{ score() }}</div>
            </div>
          </app-glow-card>
          <app-glow-card>
            <div class="text-center">
              <div class="text-xs text-text-secondary uppercase tracking-wider mb-1">High Score</div>
              <div class="text-3xl font-bold text-accent-primary font-[JetBrains_Mono,monospace]" data-testid="snake-highscore">{{ highScore() }}</div>
            </div>
          </app-glow-card>
          <app-glow-card>
            <div class="text-center">
              <div class="text-xs text-text-secondary uppercase tracking-wider mb-1">Speed</div>
              <div class="text-3xl font-bold text-amber-400 font-[JetBrains_Mono,monospace]">{{ speed() }}</div>
            </div>
          </app-glow-card>
        </div>

        <!-- Game Board -->
        <div class="animate-fade-slide-up stagger-2">
          <app-glow-card>
            <div class="flex flex-col items-center">
              <canvas #gameCanvas
                      data-testid="snake-canvas"
                      class="rounded-lg border border-white/10 touch-none max-w-full"
                      [width]="canvasWidth()"
                      [height]="canvasHeight()"
                      [style.width.px]="displayWidth()"
                      [style.height.px]="displayHeight()"
                      (touchstart)="onTouchStart($event)"
                      (touchend)="onTouchEnd($event)">
              </canvas>

              <!-- Game state overlays -->
              @if (gameState() === 'idle') {
                <div class="mt-6 text-center">
                  <button (click)="startGame()"
                          data-testid="snake-start-btn"
                          class="px-8 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition-all text-lg">
                    Start Game
                  </button>
                  <p class="text-text-secondary text-sm mt-3">Use arrow keys or WASD · Swipe on mobile</p>
                </div>
              }
              @if (gameState() === 'over') {
                <div class="mt-6 text-center">
                  <p class="text-red-400 text-lg font-semibold mb-2" data-testid="snake-game-over">Game Over!</p>
                  <p class="text-text-secondary text-sm mb-4">Final score: {{ score() }}</p>
                  <button (click)="startGame()"
                          data-testid="snake-restart-btn"
                          class="px-8 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition-all text-lg">
                    Play Again
                  </button>
                </div>
              }
              @if (gameState() === 'paused') {
                <div class="mt-6 text-center">
                  <p class="text-amber-400 text-lg font-semibold mb-2">Paused</p>
                  <button (click)="resumeGame()"
                          class="px-8 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold hover:bg-amber-500/30 transition-all text-lg">
                    Resume
                  </button>
                </div>
              }
            </div>
          </app-glow-card>
        </div>

        <!-- Mobile D-Pad Controls -->
        <div class="mt-6 animate-fade-slide-up stagger-3 md:hidden">
          <app-glow-card>
            <div class="flex flex-col items-center gap-2" role="group" aria-label="Directional controls">
              <button (click)="setDirection('UP')" class="dpad-btn w-16 h-16 rounded-xl" aria-label="Move up">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
              </button>
              <div class="flex gap-2">
                <button (click)="setDirection('LEFT')" class="dpad-btn w-16 h-16 rounded-xl" aria-label="Move left">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button (click)="handlePausePlay()"
                        class="dpad-btn w-16 h-16 rounded-xl"
                        [attr.aria-label]="gameState() === 'playing' ? 'Pause game' : 'Start game'">
                  @if (gameState() === 'playing') {
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6"/></svg>
                  } @else {
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3l14 9-14 9V3z"/></svg>
                  }
                </button>
                <button (click)="setDirection('RIGHT')" class="dpad-btn w-16 h-16 rounded-xl" aria-label="Move right">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
              <button (click)="setDirection('DOWN')" class="dpad-btn w-16 h-16 rounded-xl" aria-label="Move down">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
          </app-glow-card>
        </div>

        <!-- Instructions -->
        <div class="mt-6 animate-fade-slide-up stagger-4">
          <app-glow-card>
            <h2 class="text-lg font-semibold text-text-primary mb-3">How to Play</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
              <div>
                <h3 class="text-text-primary font-medium mb-1">🖥️ Desktop</h3>
                <ul class="space-y-1 list-disc list-inside">
                  <li>Arrow keys or WASD to move</li>
                  <li>Space or P to pause/resume</li>
                  <li>Enter to start/restart</li>
                </ul>
              </div>
              <div>
                <h3 class="text-text-primary font-medium mb-1">📱 Mobile</h3>
                <ul class="space-y-1 list-disc list-inside">
                  <li>Swipe on the game area to change direction</li>
                  <li>Use the D-pad buttons below the game</li>
                  <li>Tap center button to pause/start</li>
                </ul>
              </div>
            </div>
          </app-glow-card>
        </div>
      </div>
    </section>
  `,
  styles: `
    .dpad-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--color-text-secondary);
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .dpad-btn:hover {
      background: rgba(52, 211, 153, 0.15);
      border-color: rgba(52, 211, 153, 0.3);
      color: #34d399;
    }
    .dpad-btn:active {
      background: rgba(52, 211, 153, 0.25);
      transform: scale(0.95);
    }
  `,
})
export class SnakePageComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('gameCanvas');

  // Grid dimensions
  private readonly COLS = 20;
  private readonly ROWS = 20;
  private readonly CELL_SIZE = 20;

  // Canvas sizing
  canvasWidth = computed(() => this.COLS * this.CELL_SIZE);
  canvasHeight = computed(() => this.ROWS * this.CELL_SIZE);
  displayWidth = computed(() => this.COLS * this.CELL_SIZE);
  displayHeight = computed(() => this.ROWS * this.CELL_SIZE);

  // Game state
  gameState = signal<'idle' | 'playing' | 'paused' | 'over'>('idle');
  score = signal(0);
  highScore = signal(this.loadHighScore());
  speed = computed(() => {
    const s = this.score();
    if (s >= 50) return 5;
    if (s >= 30) return 4;
    if (s >= 15) return 3;
    if (s >= 5) return 2;
    return 1;
  });

  // Snake internals
  private snake: Point[] = [];
  private direction: Direction = 'RIGHT';
  private nextDirection: Direction = 'RIGHT';
  private food: Point = { x: 0, y: 0 };
  private animFrameId = 0;
  private lastTick = 0;
  private touchStartX = 0;
  private touchStartY = 0;

  private get tickInterval(): number {
    const base = 150;
    const s = this.score();
    if (s >= 50) return 70;
    if (s >= 30) return 90;
    if (s >= 15) return 110;
    if (s >= 5) return 130;
    return base;
  }

  ngOnDestroy() {
    this.stopLoop();
  }

  startGame() {
    this.snake = [
      { x: Math.floor(this.COLS / 2), y: Math.floor(this.ROWS / 2) },
      { x: Math.floor(this.COLS / 2) - 1, y: Math.floor(this.ROWS / 2) },
      { x: Math.floor(this.COLS / 2) - 2, y: Math.floor(this.ROWS / 2) },
    ];
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';
    this.score.set(0);
    this.placeFood();
    this.gameState.set('playing');
    this.lastTick = 0;
    this.startLoop();
    this.draw();
  }

  resumeGame() {
    this.gameState.set('playing');
    this.lastTick = 0;
    this.startLoop();
  }

  handlePausePlay() {
    const state = this.gameState();
    if (state === 'playing') {
      this.pauseGame();
    } else if (state === 'paused') {
      this.resumeGame();
    } else {
      this.startGame();
    }
  }

  setDirection(dir: Direction) {
    if (this.gameState() !== 'playing') return;
    if (!this.isOppositeDirection(dir, this.direction)) {
      this.nextDirection = dir;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    const key = event.key;
    const state = this.gameState();

    // Start/restart with Enter
    if (key === 'Enter' && (state === 'idle' || state === 'over')) {
      event.preventDefault();
      this.startGame();
      return;
    }

    // Pause/resume with Space or P
    if ((key === ' ' || key === 'p' || key === 'P') && (state === 'playing' || state === 'paused')) {
      event.preventDefault();
      if (state === 'playing') this.pauseGame();
      else this.resumeGame();
      return;
    }

    if (state !== 'playing') return;

    const dirMap: Record<string, Direction> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      w: 'UP', W: 'UP', s: 'DOWN', S: 'DOWN', a: 'LEFT', A: 'LEFT', d: 'RIGHT', D: 'RIGHT',
    };

    const dir = dirMap[key];
    if (dir) {
      event.preventDefault();
      this.setDirection(dir);
    }
  }

  onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  onTouchEnd(event: TouchEvent) {
    if (this.gameState() !== 'playing') return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.setDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      this.setDirection(dy > 0 ? 'DOWN' : 'UP');
    }
  }

  private pauseGame() {
    this.gameState.set('paused');
    this.stopLoop();
  }

  private placeFood() {
    let pos: Point;
    do {
      pos = {
        x: Math.floor(Math.random() * this.COLS),
        y: Math.floor(Math.random() * this.ROWS),
      };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    this.food = pos;
  }

  private tick() {
    this.direction = this.nextDirection;
    const head = this.snake[0];
    const newHead: Point = { ...head };

    switch (this.direction) {
      case 'UP': newHead.y--; break;
      case 'DOWN': newHead.y++; break;
      case 'LEFT': newHead.x--; break;
      case 'RIGHT': newHead.x++; break;
    }

    // Wall collision
    if (newHead.x < 0 || newHead.x >= this.COLS || newHead.y < 0 || newHead.y >= this.ROWS) {
      this.endGame();
      return;
    }

    // Self collision
    if (this.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      this.endGame();
      return;
    }

    this.snake.unshift(newHead);

    // Food collision
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score.update(s => s + 1);
      this.placeFood();
    } else {
      this.snake.pop();
    }
  }

  private endGame() {
    this.gameState.set('over');
    this.stopLoop();
    const s = this.score();
    if (s > this.highScore()) {
      this.highScore.set(s);
      this.saveHighScore(s);
    }
    this.draw();
  }

  private startLoop() {
    this.stopLoop();
    this.zone.runOutsideAngular(() => {
      const loop = (timestamp: number) => {
        this.animFrameId = requestAnimationFrame(loop);
        if (!this.lastTick) this.lastTick = timestamp;
        if (timestamp - this.lastTick >= this.tickInterval) {
          this.lastTick = timestamp;
          this.zone.run(() => this.tick());
          this.draw();
        }
      };
      this.animFrameId = requestAnimationFrame(loop);
    });
  }

  private stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private draw() {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cs = this.CELL_SIZE;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += cs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += cs) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Food
    const fx = this.food.x * cs + cs / 2;
    const fy = this.food.y * cs + cs / 2;
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(fx, fy, cs / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    this.snake.forEach((segment, i) => {
      const sx = segment.x * cs;
      const sy = segment.y * cs;
      const radius = 4;

      if (i === 0) {
        // Head - brighter
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 8;
      } else {
        // Body - gradient fade
        const t = i / this.snake.length;
        const g = Math.round(211 - t * 80);
        const b = Math.round(153 - t * 50);
        ctx.fillStyle = `rgb(52, ${g}, ${b})`;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(sx + 1, sy + 1, cs - 2, cs - 2, radius);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  private isOppositeDirection(a: Direction, b: Direction): boolean {
    return (
      (a === 'UP' && b === 'DOWN') ||
      (a === 'DOWN' && b === 'UP') ||
      (a === 'LEFT' && b === 'RIGHT') ||
      (a === 'RIGHT' && b === 'LEFT')
    );
  }

  private loadHighScore(): number {
    try {
      return parseInt(localStorage.getItem('snake-highscore') ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(score: number) {
    try {
      localStorage.setItem('snake-highscore', String(score));
    } catch {
      // Storage unavailable
    }
  }
}
