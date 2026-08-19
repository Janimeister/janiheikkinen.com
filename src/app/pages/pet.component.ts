import {
  Component,
  signal,
  computed,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';

type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'ghost';

interface EventLogEntry {
  readonly id: number;
  readonly timestamp: number;
  readonly key: TranslationKey;
  readonly params: Record<string, string | number>;
  /**
   * When set, `params.species` is resolved at render time by translating this key
   * so language switching updates already-logged entries.
   */
  readonly speciesNameKey?: TranslationKey;
}

interface Species {
  readonly id: string;
  readonly nameKey: TranslationKey;
  /** Emoji per life stage. Egg is shared across species (🥚). */
  readonly sprites: Readonly<Record<Exclude<LifeStage, 'egg' | 'ghost'>, string>>;
  readonly accent: string; // Tailwind text color class
  readonly traitKey: TranslationKey;  // short personality description
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
    nameKey: 'pet.species.cat.name',
    sprites: { baby: '🐱', child: '🐈', teen: '🐈', adult: '🐈‍⬛' },
    accent: 'text-accent-light',
    traitKey: 'pet.species.cat.trait',
  },
  {
    id: 'dog',
    nameKey: 'pet.species.dog.name',
    sprites: { baby: '🐶', child: '🐕', teen: '🐕', adult: '🐕‍🦺' },
    accent: 'text-accent-light',
    traitKey: 'pet.species.dog.trait',
  },
  {
    id: 'dragon',
    nameKey: 'pet.species.dragon.name',
    sprites: { baby: '🦎', child: '🐲', teen: '🐉', adult: '🐲' },
    accent: 'text-ink',
    traitKey: 'pet.species.dragon.trait',
  },
  {
    id: 'alien',
    nameKey: 'pet.species.alien.name',
    sprites: { baby: '👾', child: '👽', teen: '🛸', adult: '👽' },
    accent: 'text-accent-secondary',
    traitKey: 'pet.species.alien.trait',
  },
  {
    id: 'fox',
    nameKey: 'pet.species.fox.name',
    sprites: { baby: '🦊', child: '🦊', teen: '🦊', adult: '🦊' },
    accent: 'text-accent-light',
    traitKey: 'pet.species.fox.trait',
  },
  {
    id: 'bunny',
    nameKey: 'pet.species.bunny.name',
    sprites: { baby: '🐰', child: '🐇', teen: '🐇', adult: '🐇' },
    accent: 'text-accent-secondary',
    traitKey: 'pet.species.bunny.trait',
  },
  {
    id: 'chick',
    nameKey: 'pet.species.chick.name',
    sprites: { baby: '🐥', child: '🐤', teen: '🐔', adult: '🦅' },
    accent: 'text-ink',
    traitKey: 'pet.species.chick.trait',
  },
  {
    id: 'axolotl',
    nameKey: 'pet.species.axolotl.name',
    sprites: { baby: '🐣', child: '🐸', teen: '🐲', adult: '🐊' },
    accent: 'text-accent-secondary',
    traitKey: 'pet.species.axolotl.trait',
  },
];

const STORAGE_KEY = 'virtual-pet-v1';
const TICK_MS = 1000;                 // update cadence
const DECAY_PER_MINUTE = 4;           // stat point loss per minute (approx, per stat)
const MAX_OFFLINE_MINUTES = 60 * 8;   // cap offline decay at 8 hours so returning users aren't wiped

@Component({
  selector: 'app-pet-page',
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink, FormField],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <app-floating-orb class="hidden md:block absolute top-[10%] right-[10%] z-[1]" delay="0s" [size]="70" shape="circle" color="orange" rotate="4deg" />
      <app-floating-orb class="hidden md:block absolute bottom-[20%] left-[12%] z-[1]" delay="2s" [size]="60" shape="square" color="pink" rotate="-7deg" />

      <div class="relative z-10 max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            {{ i18n.t('common.backToHome') }}
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="marker marker-orange">{{ i18n.t('pet.title') }}</span>
          </h1>
          <p class="text-text-secondary mt-2">{{ i18n.t('pet.subtitle') }}</p>
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
                         [class.animate-bob]="!p.dead && !p.asleep"
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
                            class="mt-2 px-6 py-2 bg-pop-sky border-2 border-ink text-ink shadow-brutal-sm brutal-hover brutal-press font-semibold transition-all disabled:opacity-50">
                      {{ i18n.t('pet.findNewEgg') }}
                    </button>
                  } @else {
                    <button (click)="reset()"
                            data-testid="pet-reset-btn"
                            class="mt-2 px-4 py-2 bg-pop-orange border-2 border-ink text-ink shadow-brutal-sm brutal-hover brutal-press font-semibold text-xs transition-all disabled:opacity-50">
                      {{ i18n.t('pet.release') }}
                    </button>
                  }
                </div>
              </app-glow-card>
            </div>

            <!-- Stats + actions -->
            <div class="lg:col-span-2 flex flex-col gap-5">
              <div class="animate-fade-slide-up stagger-2">
                <app-glow-card>
                  <h3 class="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">{{ i18n.t('pet.stats') }}</h3>
                  <div class="flex flex-col gap-3" data-testid="pet-stats">
                    @for (stat of stats(); track stat.key) {
                      <div>
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-text-secondary">{{ stat.icon }} {{ stat.label }}</span>
                          <span class="text-text-primary font-mono">{{ stat.value }}</span>
                        </div>
                        <div class="h-3 bg-ink/10 border-2 border-ink overflow-hidden">
                          <div class="h-full transition-all duration-300"
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
                  <h3 class="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">{{ i18n.t('pet.care') }}</h3>
                  <div class="grid grid-cols-2 gap-2">
                    <button (click)="feed()"
                            [disabled]="!canAct()"
                            data-testid="pet-feed-btn"
                            class="care-btn care-btn-amber">
                      {{ i18n.t('pet.feed') }}
                    </button>
                    <button (click)="play()"
                            [disabled]="!canAct() || p.asleep"
                            data-testid="pet-play-btn"
                            class="care-btn care-btn-pink">
                      {{ i18n.t('pet.play') }}
                    </button>
                    <button (click)="clean()"
                            [disabled]="!canAct()"
                            data-testid="pet-clean-btn"
                            class="care-btn care-btn-sky">
                      {{ i18n.t('pet.clean') }}
                    </button>
                    <button (click)="toggleSleep()"
                            [disabled]="p.dead"
                            data-testid="pet-sleep-btn"
                            class="care-btn care-btn-indigo">
                      {{ p.asleep ? i18n.t('pet.wake') : i18n.t('pet.sleep') }}
                    </button>
                    <button (click)="heal()"
                            [disabled]="!canAct() || p.health >= 100"
                            data-testid="pet-heal-btn"
                            class="care-btn care-btn-emerald col-span-2">
                      {{ i18n.t('pet.medicine') }}
                    </button>
                  </div>
                </app-glow-card>
              </div>
            </div>
          </div>

          <!-- Event log -->
          <div class="mt-5 animate-fade-slide-up stagger-4">
            <app-glow-card>
              <h3 class="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">{{ i18n.t('pet.recentEvents') }}</h3>
              @if (eventLog().length === 0) {
                <p class="text-text-secondary text-sm">{{ i18n.t('pet.noEvents') }}</p>
              } @else {
                <ul class="flex flex-col gap-1 text-sm" data-testid="pet-log">
                  @for (entry of eventLog(); track entry.id) {
                    <li class="text-text-secondary">
                      <span class="text-text-primary/70 font-mono text-xs mr-2">{{ formatEventTime(entry.timestamp) }}</span>
                      {{ entryMessage(entry) }}
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
                  <h2 class="text-xl font-semibold text-text-primary mb-2">{{ i18n.t('pet.eggTitle') }}</h2>
                  <p class="text-text-secondary text-sm max-w-md">
                    {{ i18n.t('pet.eggBody') }}
                  </p>
                </div>
                <div class="w-full max-w-sm flex flex-col gap-3">
                  <label for="pet-name" class="text-xs text-text-secondary uppercase tracking-wider text-left">{{ i18n.t('pet.name') }}</label>
                  <input id="pet-name"
                         type="text"
                         [formField]="nameForm.name"
                         [attr.placeholder]="i18n.t('pet.namePlaceholder')"
                         [attr.aria-invalid]="nameForm.name().invalid() && nameForm.name().touched()"
                         data-testid="pet-name-input"
                         class="w-full px-4 py-2.5 bg-bg-card border-2 border-ink text-ink placeholder:text-text-secondary focus:outline-none focus:shadow-brutal-sm transition-all" />
                  <button (click)="hatch()"
                          [disabled]="!canHatch()"
                          data-testid="pet-hatch-btn"
                          class="px-8 py-3 bg-pop-pink border-2 border-ink text-ink shadow-brutal-sm brutal-hover brutal-press font-semibold transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ i18n.t('pet.hatch') }}
                  </button>
                </div>
              </div>
            </app-glow-card>
          </div>
        }

        <!-- Instructions -->
        <div class="mt-5 animate-fade-slide-up stagger-4">
          <app-glow-card>
            <h2 class="text-lg font-semibold text-text-primary mb-3">{{ i18n.t('pet.howToPlay') }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
              <ul class="space-y-1 list-disc list-inside">
                <li>{{ i18n.t('pet.instructionRandom') }}</li>
                <li>{{ i18n.t('pet.instructionCare') }}</li>
                <li>{{ i18n.t('pet.instructionDecay') }}</li>
              </ul>
              <ul class="space-y-1 list-disc list-inside">
                <li>{{ i18n.t('pet.instructionHealth') }}</li>
                <li>{{ i18n.t('pet.instructionMedicine') }}</li>
                <li>{{ i18n.t('pet.instructionEvents') }}</li>
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
      font-weight: 600;
      font-size: 0.875rem;
      border: 2px solid var(--color-ink);
      color: var(--color-ink);
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .care-btn:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 5px 5px 0 var(--color-ink);
    }
    .care-btn:active:not(:disabled) {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 var(--color-ink);
    }
    .care-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .care-btn-amber   { background: var(--color-pop-orange); }
    .care-btn-pink    { background: var(--color-pop-pink); }
    .care-btn-sky     { background: var(--color-pop-sky); }
    .care-btn-indigo  { background: var(--color-pop-yellow); }
    .care-btn-emerald { background: var(--color-pop-lime); }
  `,
})
export class PetPageComponent implements OnInit, OnDestroy {
  protected readonly i18n = inject(LanguageService);

  // ── State ─────────────────────────────────────────────────────────
  protected readonly pet = signal<PetState | null>(null);
  private readonly nameModel = signal({ name: '' });
  protected readonly nameForm = form(this.nameModel, name => {
    required(name.name);
    maxLength(name.name, 16);
  });
  protected readonly eventLog = signal<readonly EventLogEntry[]>([]);

  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private logSeq = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit() {
    this.loadFromStorage();
    this.tickHandle = setInterval(() => {
      const pet = this.pet();
      if (!pet || pet.dead) {
        return;
      }

      this.tick();
    }, TICK_MS);
  }

  ngOnDestroy() {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  // ── Derived view data ─────────────────────────────────────────────
  protected readonly canHatch = computed(() =>
    this.nameForm.name().valid() && this.nameModel().name.trim().length > 0
  );
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
  protected readonly speciesTrait = computed(() => {
    const species = this.species();
    return species ? this.i18n.t(species.traitKey) : '';
  });

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
    const stageKeys: Record<LifeStage, TranslationKey> = {
      egg: 'pet.stageEgg',
      baby: 'pet.stageBaby',
      child: 'pet.stageChild',
      teen: 'pet.stageTeen',
      adult: 'pet.stageAdult',
      ghost: 'pet.stageGhost',
    };
    return this.i18n.t(stageKeys[stage]);
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
    if (seconds < 60) return this.i18n.t('pet.ageSeconds', { count: seconds });
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return this.i18n.t('pet.ageMinutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    return this.i18n.t('pet.ageHours', { hours, minutes: minutes % 60 });
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
    if (p.dead) return this.i18n.t('pet.moodDead', { name: p.name });
    if (p.asleep) return this.i18n.t('pet.moodSleeping', { name: p.name });
    if (p.health < 25) return this.i18n.t('pet.moodSick', { name: p.name });
    if (p.hunger < 20) return this.i18n.t('pet.moodStarving', { name: p.name });
    if (p.cleanliness < 20) return this.i18n.t('pet.moodDirty', { name: p.name });
    if (p.energy < 20) return this.i18n.t('pet.moodExhausted', { name: p.name });
    if (p.happiness < 20) return this.i18n.t('pet.moodLonely', { name: p.name });
    if (p.hunger > 80 && p.happiness > 70 && p.cleanliness > 70) return this.i18n.t('pet.moodThriving', { name: p.name });
    return this.i18n.t('pet.moodOkay', { name: p.name });
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
      { key: 'hunger',      label: this.i18n.t('pet.statHunger'),      icon: '🍽️', value: Math.round(p.hunger),      barClass: this.barClass('hunger') },
      { key: 'happiness',   label: this.i18n.t('pet.statHappiness'),   icon: '😊', value: Math.round(p.happiness),   barClass: this.barClass('happiness') },
      { key: 'energy',      label: this.i18n.t('pet.statEnergy'),      icon: '⚡',  value: Math.round(p.energy),      barClass: this.barClass('energy') },
      { key: 'cleanliness', label: this.i18n.t('pet.statCleanliness'), icon: '🫧', value: Math.round(p.cleanliness), barClass: this.barClass('cleanliness') },
      { key: 'health',      label: this.i18n.t('pet.statHealth'),      icon: '❤️', value: Math.round(p.health),      barClass: this.barClass('health') },
    ];
  });

  private barClass(stat: 'hunger' | 'happiness' | 'energy' | 'cleanliness' | 'health'): string {
    const classes: Record<typeof stat, string> = {
      hunger: 'bg-pop-orange',
      happiness: 'bg-pop-pink',
      energy: 'bg-pop-yellow',
      cleanliness: 'bg-pop-sky',
      health: 'bg-pop-lime',
    };
    return classes[stat];
  }

  // ── Actions ──────────────────────────────────────────────────────
  protected hatch() {
    const name = this.nameModel().name.trim().slice(0, 16);
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
    this.logEvent('pet.hatchedEvent', { name }, species.nameKey);
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
    this.logEvent(next.asleep ? 'pet.sleepEvent' : 'pet.wakeEvent', { name: p.name });
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
        this.logEvent('pet.feedEvent', { name: p.name });
        break;
      case 'play':
        if (next.asleep) return;
        next.happiness = clamp(next.happiness + 20);
        next.energy = clamp(next.energy - 12);
        next.hunger = clamp(next.hunger - 5);
        this.logEvent('pet.playEvent', { name: p.name });
        break;
      case 'clean':
        next.cleanliness = clamp(next.cleanliness + 30);
        next.happiness = clamp(next.happiness - 2);
        this.logEvent('pet.cleanEvent', { name: p.name });
        break;
      case 'heal':
        if (next.health >= 100) return;
        next.health = clamp(next.health + 30);
        next.happiness = clamp(next.happiness - 3);
        this.logEvent('pet.healEvent', { name: p.name });
        break;
    }

    this.pet.set(next);
    this.persist();
  }

  protected reset() {
    this.pet.set(null);
    this.nameModel.set({ name: '' });
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
      this.logEvent('pet.deathEvent', { name: p.name });
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
    const events: readonly { messageKey: TranslationKey; apply: (p: PetState) => void }[] = [
      { messageKey: 'pet.randomSnack',   apply: p => { p.hunger = clamp(p.hunger + 10); } },
      { messageKey: 'pet.randomDream',   apply: p => { p.happiness = clamp(p.happiness + 8); } },
      { messageKey: 'pet.randomMud',     apply: p => { p.cleanliness = clamp(p.cleanliness - 12); } },
      { messageKey: 'pet.randomEnergy',  apply: p => { p.energy = clamp(p.energy + 15); } },
      { messageKey: 'pet.randomHiccups', apply: p => { p.happiness = clamp(p.happiness - 4); } },
      { messageKey: 'pet.randomFriend',  apply: p => { p.happiness = clamp(p.happiness + 12); } },
      { messageKey: 'pet.randomSneeze',  apply: p => { p.health = clamp(p.health - 3); } },
      { messageKey: 'pet.randomTrick',   apply: p => { p.happiness = clamp(p.happiness + 6); } },
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    ev.apply(pet);
    this.logEvent(ev.messageKey, { name: pet.name });
  }

  // ── Event log ────────────────────────────────────────────────────
  private logEvent(key: TranslationKey, params: Record<string, string | number> = {}, speciesNameKey?: TranslationKey) {
    const entry: EventLogEntry = { id: ++this.logSeq, timestamp: Date.now(), key, params, speciesNameKey };
    this.eventLog.update(list => [entry, ...list].slice(0, 8));
  }

  protected formatEventTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' });
  }

  protected entryMessage(entry: EventLogEntry): string {
    const params = entry.speciesNameKey
      ? { ...entry.params, species: this.i18n.t(entry.speciesNameKey) }
      : entry.params;
    return this.i18n.t(entry.key, params);
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
