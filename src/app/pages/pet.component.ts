import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy,
  NgZone,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';

type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'ghost';

interface Species {
  readonly id: string;
  readonly name: string;
  /** Emoji per life stage. Egg is shared across species (🥚). */
  readonly sprites: Readonly<Record<Exclude<LifeStage, 'egg' | 'ghost'>, string>>;
  readonly accent: string; // Tailwind text color class
  readonly trait: string;  // short personality description
}

interface PetState {
  speciesId: string;
  name: string;
  bornAt: number;      // ms epoch when hatched
  lastTick: number;    // ms epoch of last stat update
  hunger: number;      // 0..100 (0 = starving, 100 = full)
  happiness: number;   // 0..100
  energy: number;      // 0..100
  cleanliness: number; // 0..100
  health: number;      // 0..100
  dead: boolean;
  asleep: boolean;
}

const SPECIES: readonly Species[] = [
  {
    id: 'cat',
    name: 'Kitten',
    sprites: { baby: '🐱', child: '🐈', teen: '🐈', adult: '🐈‍⬛' },
    accent: 'text-amber-300',
    trait: 'Curious and independent',
  },
  {
    id: 'dog',
    name: 'Puppy',
    sprites: { baby: '🐶', child: '🐕', teen: '🐕', adult: '🐕‍🦺' },
    accent: 'text-orange-300',
    trait: 'Loyal and playful',
  },
  {
    id: 'dragon',
    name: 'Dragonling',
    sprites: { baby: '🦎', child: '🐲', teen: '🐉', adult: '🐲' },
    accent: 'text-emerald-300',
    trait: 'Fierce and noble',
  },
  {
    id: 'alien',
    name: 'Cosmo',
    sprites: { baby: '👾', child: '👽', teen: '🛸', adult: '👽' },
    accent: 'text-fuchsia-300',
    trait: 'Mysterious and clever',
  },
  {
    id: 'fox',
    name: 'Kit',
    sprites: { baby: '🦊', child: '🦊', teen: '🦊', adult: '🦊' },
    accent: 'text-rose-300',
    trait: 'Sly and energetic',
  },
  {
    id: 'bunny',
    name: 'Bun',
    sprites: { baby: '🐰', child: '🐇', teen: '🐇', adult: '🐇' },
    accent: 'text-pink-300',
    trait: 'Gentle and bouncy',
  },
  {
    id: 'chick',
    name: 'Chick',
    sprites: { baby: '🐥', child: '🐤', teen: '🐔', adult: '🦅' },
    accent: 'text-yellow-300',
    trait: 'Eager and brave',
  },
  {
    id: 'axolotl',
    name: 'Axo',
    sprites: { baby: '🐣', child: '🐸', teen: '🐲', adult: '🐊' },
    accent: 'text-teal-300',
    trait: 'Chill and dreamy',
  },
];

const STORAGE_KEY = 'virtual-pet-v1';
const TICK_MS = 1000;                 // update cadence
const DECAY_PER_MINUTE = 4;           // stat point loss per minute (approx, per stat)
const MAX_OFFLINE_MINUTES = 60 * 8;   // cap offline decay at 8 hours so returning users aren't wiped

@Component({
  selector: 'app-pet-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <div class="absolute inset-0 bg-gradient-to-br from-[#1a0a2e] via-[#0a0a0f] to-[#0a1a2e] animate-gradient-shift opacity-40"></div>
      <app-floating-orb class="absolute top-[10%] right-[10%] z-[1]" delay="0s" [size]="70" />
      <app-floating-orb class="absolute bottom-[20%] left-[12%] z-[1]" delay="2s" [size]="60" />

      <div class="relative z-10 max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm text-text-secondary hover:text-accent-primary transition-colors mb-4 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            Back to Home
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="bg-gradient-to-r from-pink-300 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">Virtual Pet</span>
          </h1>
          <p class="text-text-secondary mt-2">Hatch a mystery egg and raise your very own companion</p>
        </div>

        @if (pet(); as p) {
          <!-- Pet dashboard -->
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <!-- Pet display -->
            <div class="lg:col-span-3 animate-fade-slide-up stagger-1">
              <app-glow-card>
                <div class="flex flex-col items-center text-center gap-4 py-4">
                  <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    <h2 class="text-2xl font-bold" [class]="speciesAccent()" data-testid="pet-name">{{ p.name }}</h2>
                    <span class="text-xs text-text-secondary uppercase tracking-wider" data-testid="pet-stage">
                      {{ stageLabel() }} · {{ ageLabel() }}
                    </span>
                  </div>
                  <p class="text-text-secondary text-sm -mt-2">{{ speciesTrait() }}</p>

                  <div class="relative w-full flex items-center justify-center py-6">
                    <div class="text-8xl md:text-9xl select-none transition-transform duration-300"
                         [class.animate-float]="!p.dead && !p.asleep"
                         [style.filter]="spriteFilter()"
                         aria-hidden="true"
                         data-testid="pet-sprite">
                      {{ sprite() }}
                    </div>
                    @if (p.asleep) {
                      <span class="absolute top-2 right-1/3 text-3xl animate-pulse" aria-hidden="true">💤</span>
                    }
                  </div>

                  <p class="text-sm min-h-5" [class]="moodColorClass()" data-testid="pet-mood">{{ moodMessage() }}</p>

                  @if (p.dead) {
                    <button (click)="reset()"
                            data-testid="pet-reset-btn"
                            class="mt-2 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all">
                      Find a new egg
                    </button>
                  } @else {
                    <button (click)="reset()"
                            data-testid="pet-reset-btn"
                            class="mt-2 text-xs text-text-secondary/60 hover:text-text-secondary transition-colors underline underline-offset-2">
                      Release pet &amp; start over
                    </button>
                  }
                </div>
              </app-glow-card>
            </div>

            <!-- Stats + actions -->
            <div class="lg:col-span-2 flex flex-col gap-5">
              <div class="animate-fade-slide-up stagger-2">
                <app-glow-card>
                  <h3 class="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Stats</h3>
                  <div class="flex flex-col gap-3" data-testid="pet-stats">
                    @for (stat of stats(); track stat.key) {
                      <div>
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-text-secondary">{{ stat.icon }} {{ stat.label }}</span>
                          <span class="text-text-primary font-[JetBrains_Mono,monospace]">{{ stat.value }}</span>
                        </div>
                        <div class="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-300"
                               [class]="stat.barClass"
                               [style.width.%]="stat.value"></div>
                        </div>
                      </div>
                    }
                  </div>
                </app-glow-card>
              </div>

              <div class="animate-fade-slide-up stagger-3">
                <app-glow-card>
                  <h3 class="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Care</h3>
                  <div class="grid grid-cols-2 gap-2">
                    <button (click)="feed()"
                            [disabled]="!canAct()"
                            data-testid="pet-feed-btn"
                            class="care-btn care-btn-amber">
                      🍎 Feed
                    </button>
                    <button (click)="play()"
                            [disabled]="!canAct() || p.asleep"
                            data-testid="pet-play-btn"
                            class="care-btn care-btn-pink">
                      🎲 Play
                    </button>
                    <button (click)="clean()"
                            [disabled]="!canAct()"
                            data-testid="pet-clean-btn"
                            class="care-btn care-btn-sky">
                      🛁 Clean
                    </button>
                    <button (click)="toggleSleep()"
                            [disabled]="p.dead"
                            data-testid="pet-sleep-btn"
                            class="care-btn care-btn-indigo">
                      {{ p.asleep ? '☀️ Wake' : '🌙 Sleep' }}
                    </button>
                    <button (click)="heal()"
                            [disabled]="!canAct() || p.health >= 100"
                            data-testid="pet-heal-btn"
                            class="care-btn care-btn-emerald col-span-2">
                      💊 Give Medicine
                    </button>
                  </div>
                </app-glow-card>
              </div>
            </div>
          </div>

          <!-- Event log -->
          <div class="mt-5 animate-fade-slide-up stagger-4">
            <app-glow-card>
              <h3 class="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Recent events</h3>
              @if (eventLog().length === 0) {
                <p class="text-text-secondary text-sm">No events yet — try interacting with your pet!</p>
              } @else {
                <ul class="flex flex-col gap-1 text-sm" data-testid="pet-log">
                  @for (entry of eventLog(); track entry.id) {
                    <li class="text-text-secondary">
                      <span class="text-text-primary/70 font-[JetBrains_Mono,monospace] text-xs mr-2">{{ entry.time }}</span>
                      {{ entry.message }}
                    </li>
                  }
                </ul>
              }
            </app-glow-card>
          </div>
        } @else {
          <!-- No pet yet: show egg hatching card -->
          <div class="animate-fade-slide-up stagger-1">
            <app-glow-card>
              <div class="flex flex-col items-center text-center py-8 gap-6" data-testid="pet-hatch">
                <div class="text-8xl md:text-9xl select-none" aria-hidden="true">🥚</div>
                <div>
                  <h2 class="text-xl font-semibold text-text-primary mb-2">A mysterious egg</h2>
                  <p class="text-text-secondary text-sm max-w-md">
                    You found an unidentified egg. Give it a name and hatch it to discover which creature lives inside —
                    each hatch reveals a random species with its own personality.
                  </p>
                </div>
                <div class="w-full max-w-sm flex flex-col gap-3">
                  <label for="pet-name" class="text-xs text-text-secondary uppercase tracking-wider text-left">Name</label>
                  <input id="pet-name"
                         type="text"
                         maxlength="16"
                         [value]="nameInput()"
                         (input)="onNameInput($event)"
                         placeholder="Give your pet a name"
                         data-testid="pet-name-input"
                         class="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary transition-colors" />
                  <button (click)="hatch()"
                          [disabled]="!canHatch()"
                          data-testid="pet-hatch-btn"
                          class="px-8 py-3 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 font-semibold hover:bg-fuchsia-500/30 transition-all text-lg disabled:opacity-40 disabled:cursor-not-allowed">
                    Hatch!
                  </button>
                </div>
              </div>
            </app-glow-card>
          </div>
        }

        <!-- Instructions -->
        <div class="mt-5 animate-fade-slide-up stagger-4">
          <app-glow-card>
            <h2 class="text-lg font-semibold text-text-primary mb-3">How to play</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
              <ul class="space-y-1 list-disc list-inside">
                <li>Each egg hatches into a random species, so every run is different.</li>
                <li>Feed, play with, clean and put your pet to sleep to keep its stats up.</li>
                <li>Stats decay over time, even while you are away.</li>
              </ul>
              <ul class="space-y-1 list-disc list-inside">
                <li>If stats stay at zero for too long, health drops.</li>
                <li>Medicine restores health — but only use it when your pet needs it.</li>
                <li>Random events may surprise you — keep an eye on the event log!</li>
              </ul>
            </div>
          </app-glow-card>
        </div>
      </div>
    </section>
  `,
  styles: `
    .care-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.625rem 0.75rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.875rem;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--color-text-secondary);
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
      cursor: pointer;
    }
    .care-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .care-btn:active:not(:disabled) { transform: translateY(0); }
    .care-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .care-btn-amber:hover:not(:disabled)   { background: rgba(245,158,11,0.15);  border-color: rgba(245,158,11,0.35);  color: #fbbf24; }
    .care-btn-pink:hover:not(:disabled)    { background: rgba(236,72,153,0.15);  border-color: rgba(236,72,153,0.35);  color: #f472b6; }
    .care-btn-sky:hover:not(:disabled)     { background: rgba(14,165,233,0.15);  border-color: rgba(14,165,233,0.35);  color: #38bdf8; }
    .care-btn-indigo:hover:not(:disabled)  { background: rgba(99,102,241,0.15);  border-color: rgba(99,102,241,0.35);  color: #818cf8; }
    .care-btn-emerald:hover:not(:disabled) { background: rgba(16,185,129,0.15);  border-color: rgba(16,185,129,0.35);  color: #34d399; }
  `,
})
export class PetPageComponent implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);

  // ── State ─────────────────────────────────────────────────────────
  protected readonly pet = signal<PetState | null>(null);
  protected readonly nameInput = signal('');
  protected readonly eventLog = signal<readonly { id: number; time: string; message: string }[]>([]);

  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private logSeq = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit() {
    this.loadFromStorage();
    this.zone.runOutsideAngular(() => {
      this.tickHandle = setInterval(() => this.zone.run(() => this.tick()), TICK_MS);
    });
  }

  ngOnDestroy() {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  // ── Derived view data ─────────────────────────────────────────────
  protected readonly canHatch = computed(() => this.nameInput().trim().length > 0);
  protected readonly canAct = computed(() => {
    const p = this.pet();
    return !!p && !p.dead;
  });

  protected readonly species = computed<Species | null>(() => {
    const p = this.pet();
    if (!p) return null;
    return SPECIES.find(s => s.id === p.speciesId) ?? SPECIES[0];
  });

  protected readonly speciesAccent = computed(() => this.species()?.accent ?? 'text-text-primary');
  protected readonly speciesTrait = computed(() => this.species()?.trait ?? '');

  protected readonly lifeStage = computed<LifeStage>(() => {
    const p = this.pet();
    if (!p) return 'egg';
    if (p.dead) return 'ghost';
    const ageMin = Math.max(0, (Date.now() - p.bornAt) / 60_000);
    if (ageMin < 2) return 'baby';
    if (ageMin < 10) return 'child';
    if (ageMin < 30) return 'teen';
    return 'adult';
  });

  protected readonly stageLabel = computed(() => {
    const stage = this.lifeStage();
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  });

  protected readonly sprite = computed(() => {
    const p = this.pet();
    const sp = this.species();
    if (!p || !sp) return '🥚';
    if (p.dead) return '👻';
    const stage = this.lifeStage() as Exclude<LifeStage, 'egg' | 'ghost'>;
    return sp.sprites[stage];
  });

  protected readonly ageLabel = computed(() => {
    const p = this.pet();
    if (!p) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - p.bornAt) / 1000));
    if (seconds < 60) return `${seconds}s old`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m old`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m old`;
  });

  protected readonly spriteFilter = computed(() => {
    const p = this.pet();
    if (!p) return 'none';
    if (p.dead) return 'grayscale(100%) opacity(0.7)';
    if (p.asleep) return 'brightness(0.75)';
    if (p.health < 30) return 'hue-rotate(-30deg) saturate(0.6)';
    return 'none';
  });

  protected readonly moodMessage = computed(() => {
    const p = this.pet();
    if (!p) return '';
    if (p.dead) return `${p.name} has left for the great beyond. 🌈`;
    if (p.asleep) return `${p.name} is sleeping peacefully...`;
    if (p.health < 25) return `${p.name} is feeling very sick!`;
    if (p.hunger < 20) return `${p.name} is starving!`;
    if (p.cleanliness < 20) return `${p.name} really needs a bath.`;
    if (p.energy < 20) return `${p.name} is exhausted.`;
    if (p.happiness < 20) return `${p.name} is feeling lonely.`;
    if (p.hunger > 80 && p.happiness > 70 && p.cleanliness > 70) return `${p.name} is thriving! ✨`;
    return `${p.name} is doing okay.`;
  });

  protected readonly moodColorClass = computed(() => {
    const p = this.pet();
    if (!p) return 'text-text-secondary';
    if (p.dead) return 'text-text-secondary';
    if (p.health < 25 || p.hunger < 20 || p.cleanliness < 20 || p.energy < 20 || p.happiness < 20) {
      return 'text-red-400';
    }
    return 'text-text-secondary';
  });

  protected readonly stats = computed(() => {
    const p = this.pet();
    if (!p) return [];
    return [
      { key: 'hunger',      label: 'Hunger',      icon: '🍽️', value: Math.round(p.hunger),      barClass: this.barClass(p.hunger) },
      { key: 'happiness',   label: 'Happiness',   icon: '😊', value: Math.round(p.happiness),   barClass: this.barClass(p.happiness) },
      { key: 'energy',      label: 'Energy',      icon: '⚡',  value: Math.round(p.energy),      barClass: this.barClass(p.energy) },
      { key: 'cleanliness', label: 'Cleanliness', icon: '🫧', value: Math.round(p.cleanliness), barClass: this.barClass(p.cleanliness) },
      { key: 'health',      label: 'Health',      icon: '❤️', value: Math.round(p.health),      barClass: this.barClass(p.health) },
    ];
  });

  private barClass(value: number): string {
    if (value >= 60) return 'bg-emerald-400';
    if (value >= 30) return 'bg-amber-400';
    return 'bg-red-400';
  }

  // ── Input handlers ───────────────────────────────────────────────
  protected onNameInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.nameInput.set(target?.value ?? '');
  }

  // ── Actions ──────────────────────────────────────────────────────
  protected hatch() {
    const name = this.nameInput().trim().slice(0, 16);
    if (!name) return;
    const species = SPECIES[Math.floor(Math.random() * SPECIES.length)];
    const now = Date.now();
    const pet: PetState = {
      speciesId: species.id,
      name,
      bornAt: now,
      lastTick: now,
      hunger: 80,
      happiness: 80,
      energy: 80,
      cleanliness: 90,
      health: 100,
      dead: false,
      asleep: false,
    };
    this.pet.set(pet);
    this.eventLog.set([]);
    this.logEvent(`A ${species.name.toLowerCase()} hatched! Meet ${name}.`);
    this.persist();
  }

  protected feed()  { this.applyAction('feed'); }
  protected play()  { this.applyAction('play'); }
  protected clean() { this.applyAction('clean'); }
  protected heal()  { this.applyAction('heal'); }

  protected toggleSleep() {
    const p = this.pet();
    if (!p || p.dead) return;
    const next = { ...p, asleep: !p.asleep };
    this.pet.set(next);
    this.logEvent(next.asleep ? `${p.name} lay down for a nap.` : `${p.name} woke up.`);
    this.persist();
  }

  private applyAction(kind: 'feed' | 'play' | 'clean' | 'heal') {
    const p = this.pet();
    if (!p || p.dead) return;
    const next: PetState = { ...p };

    switch (kind) {
      case 'feed':
        next.hunger = clamp(next.hunger + 25);
        next.happiness = clamp(next.happiness + 3);
        next.cleanliness = clamp(next.cleanliness - 4);
        this.logEvent(`${p.name} enjoyed a meal.`);
        break;
      case 'play':
        if (next.asleep) return;
        next.happiness = clamp(next.happiness + 20);
        next.energy = clamp(next.energy - 12);
        next.hunger = clamp(next.hunger - 5);
        this.logEvent(`${p.name} had some playtime!`);
        break;
      case 'clean':
        next.cleanliness = clamp(next.cleanliness + 30);
        next.happiness = clamp(next.happiness - 2);
        this.logEvent(`${p.name} is squeaky clean.`);
        break;
      case 'heal':
        if (next.health >= 100) return;
        next.health = clamp(next.health + 30);
        next.happiness = clamp(next.happiness - 3);
        this.logEvent(`${p.name} took some medicine.`);
        break;
    }

    this.pet.set(next);
    this.persist();
  }

  protected reset() {
    this.pet.set(null);
    this.nameInput.set('');
    this.eventLog.set([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  // ── Tick loop ────────────────────────────────────────────────────
  private tick() {
    const p = this.pet();
    if (!p || p.dead) return;

    const now = Date.now();
    // If the system clock moved backwards, reset lastTick to now so
    // stat decay doesn't freeze until the clock catches up again.
    if (now < p.lastTick) {
      this.pet.update(s => s ? { ...s, lastTick: now, bornAt: Math.min(s.bornAt, now) } : s);
      return;
    }
    const elapsedMs = now - p.lastTick;
    if (elapsedMs < 500) return;

    const minutes = Math.min(elapsedMs / 60_000, MAX_OFFLINE_MINUTES);
    const decay = minutes * DECAY_PER_MINUTE;
    // Energy regenerates while asleep, still decays while awake.
    const energyDelta = p.asleep ? +minutes * DECAY_PER_MINUTE * 2 : -decay;

    const next: PetState = {
      ...p,
      lastTick: now,
      hunger:      clamp(p.hunger      - decay),
      happiness:   clamp(p.happiness   - decay * (p.asleep ? 0.5 : 1)),
      energy:      clamp(p.energy      + energyDelta),
      cleanliness: clamp(p.cleanliness - decay * 0.6),
    };

    // Health effects from critical stats
    const critical = [next.hunger, next.cleanliness, next.happiness].filter(v => v <= 0).length;
    if (critical > 0) {
      next.health = clamp(next.health - critical * decay * 0.5);
    } else if (next.hunger > 60 && next.cleanliness > 60 && next.happiness > 60 && next.energy > 40) {
      // Gentle passive recovery when well cared for
      next.health = clamp(next.health + minutes * 1);
    }

    if (next.health <= 0) {
      next.health = 0;
      next.dead = true;
      this.pet.set(next);
      this.logEvent(`${p.name} has passed away. 💔`);
      this.persist();
      return;
    }

    // Random events: small chance each second, but only when enough time passed (≈1/120 per tick).
    if (!next.asleep && Math.random() < 0.008) {
      this.triggerRandomEvent(next);
    }

    this.pet.set(next);
    // Persist infrequently — every ~15s — to reduce write load.
    if (Math.floor(now / 15_000) !== Math.floor(p.lastTick / 15_000)) {
      this.persist();
    }
  }

  private triggerRandomEvent(pet: PetState) {
    const events: readonly { message: (name: string) => string; apply: (p: PetState) => void }[] = [
      { message: n => `${n} found a tasty snack!`,            apply: p => { p.hunger = clamp(p.hunger + 10); } },
      { message: n => `${n} is dreaming of adventures...`,    apply: p => { p.happiness = clamp(p.happiness + 8); } },
      { message: n => `${n} tracked mud around the room.`,    apply: p => { p.cleanliness = clamp(p.cleanliness - 12); } },
      { message: n => `${n} had a burst of energy!`,          apply: p => { p.energy = clamp(p.energy + 15); } },
      { message: n => `${n} got the hiccups 😅`,              apply: p => { p.happiness = clamp(p.happiness - 4); } },
      { message: n => `${n} made a new friend!`,              apply: p => { p.happiness = clamp(p.happiness + 12); } },
      { message: n => `${n} sneezed loudly.`,                 apply: p => { p.health = clamp(p.health - 3); } },
      { message: n => `${n} learned a new trick!`,            apply: p => { p.happiness = clamp(p.happiness + 6); } },
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    ev.apply(pet);
    this.logEvent(ev.message(pet.name));
  }

  // ── Event log ────────────────────────────────────────────────────
  private logEvent(message: string) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const entry = { id: ++this.logSeq, time, message };
    this.eventLog.update(list => [entry, ...list].slice(0, 8));
  }

  // ── Persistence ──────────────────────────────────────────────────
  private persist() {
    const p = this.pet();
    if (!p) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }

  private loadFromStorage() {
    let raw: string | null = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch { raw = null; }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<PetState>;
      if (!parsed || typeof parsed !== 'object') return;
      if (!parsed.speciesId || !SPECIES.some(s => s.id === parsed.speciesId)) return;
      // Sanitize
      const now = Date.now();
      const persistedBornAt =
        typeof parsed.bornAt === 'number' && Number.isFinite(parsed.bornAt) ? parsed.bornAt : now;
      const persistedLastTick =
        typeof parsed.lastTick === 'number' && Number.isFinite(parsed.lastTick) ? parsed.lastTick : now;
      const lastTick = Math.min(persistedLastTick, now);
      const bornAt = Math.min(persistedBornAt, lastTick);

      const pet: PetState = {
        speciesId: parsed.speciesId,
        name: typeof parsed.name === 'string' && parsed.name.trim()
          ? parsed.name.trim().slice(0, 16)
          : 'Pet',
        bornAt,
        lastTick,
        hunger:      clamp(asNumber(parsed.hunger, 80)),
        happiness:   clamp(asNumber(parsed.happiness, 80)),
        energy:      clamp(asNumber(parsed.energy, 80)),
        cleanliness: clamp(asNumber(parsed.cleanliness, 80)),
        health:      clamp(asNumber(parsed.health, 100)),
        dead: !!parsed.dead,
        asleep: !!parsed.asleep,
      };
      this.pet.set(pet);
    } catch {
      // Corrupt state — ignore and leave pet null
    }
  }
}

function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
