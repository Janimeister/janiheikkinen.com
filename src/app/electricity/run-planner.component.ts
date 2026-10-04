import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';
import { cheapestRun, nextTimeOfDay, type PriceSlot } from './cheapest-run';

interface Appliance {
  id: string;
  icon: string;
  labelKey: TranslationKey;
  minutes: number;
  kwh: number;
}

/** Typical runs; the visitor can tune both numbers to their own machine. */
export const APPLIANCES: readonly Appliance[] = [
  { id: 'dishwasher', icon: '🍽️', labelKey: 'run.dishwasher', minutes: 180, kwh: 1 },
  { id: 'washer', icon: '👕', labelKey: 'run.washer', minutes: 120, kwh: 0.8 },
  { id: 'sauna', icon: '🧖', labelKey: 'run.sauna', minutes: 90, kwh: 8 },
  { id: 'ev', icon: '🔌', labelKey: 'run.ev', minutes: 360, kwh: 20 },
];

const PREFS_KEY = 'electricity-run';
const STEP_MINUTES = 15;
const MAX_MINUTES = 12 * 60;
const MAX_KWH = 200;
const MIN = 60_000;

interface RunPrefs {
  appliance: string | null;
  minutes: number;
  kwh: number;
  readyBy: string;
}

const DEFAULT_PREFS: RunPrefs = { appliance: 'dishwasher', minutes: 180, kwh: 1, readyBy: '' };

const OPTION_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform cursor-pointer';

@Component({
  selector: 'app-run-planner',
  template: `
    <div class="flex items-center gap-2 mb-1">
      <span class="text-xl" aria-hidden="true">⏱️</span>
      <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('run.title') }}</h2>
    </div>
    <p class="text-sm text-text-secondary mb-4">{{ i18n.t('run.intro') }}</p>

    <div class="flex flex-wrap gap-2 mb-5" role="group" [attr.aria-label]="i18n.t('run.appliance')">
      @for (option of appliances; track option.id) {
        <button
          type="button"
          [class]="optionClass(prefs().appliance === option.id)"
          [attr.aria-pressed]="prefs().appliance === option.id"
          (click)="choose(option)"
        >
          <span aria-hidden="true">{{ option.icon }}</span>
          {{ i18n.t(option.labelKey) }}
        </button>
      }
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      <div>
        <label for="run-duration" class="field-label">{{ i18n.t('run.duration') }}</label>
        <div class="flex items-center gap-3">
          <input
            id="run-duration"
            type="range"
            class="flex-1 min-w-0 accent-ink"
            min="1"
            [max]="maxSteps"
            step="1"
            [value]="prefs().minutes / step"
            [attr.aria-valuetext]="formatDuration(prefs().minutes)"
            (input)="setMinutes(+$any($event.target).value * step)"
          />
          <output for="run-duration" class="font-mono text-sm font-semibold whitespace-nowrap">{{
            formatDuration(prefs().minutes)
          }}</output>
        </div>
      </div>
      <div>
        <label for="run-energy" class="field-label">{{ i18n.t('run.energy') }}</label>
        <div class="flex items-center gap-2">
          <input
            id="run-energy"
            type="number"
            inputmode="decimal"
            min="0.1"
            [max]="maxKwh"
            step="0.1"
            class="field-input w-24"
            [value]="prefs().kwh"
            (change)="setKwh($any($event.target))"
          />
          <span class="text-sm text-text-secondary">kWh</span>
        </div>
      </div>
      <div>
        <label for="run-ready-by" class="field-label">{{ i18n.t('run.readyBy') }}</label>
        <div class="flex items-center gap-2">
          <input
            id="run-ready-by"
            type="time"
            step="900"
            class="field-input"
            [value]="prefs().readyBy"
            (change)="setReadyBy($any($event.target).value)"
          />
          @if (prefs().readyBy) {
            <button
              type="button"
              [class]="optionClass(false)"
              [attr.aria-label]="i18n.t('run.clearReadyBy')"
              (click)="setReadyBy('')"
            >
              ✕
            </button>
          }
        </div>
      </div>
    </div>

    <div class="border-t-2 border-ink pt-4" aria-live="polite" data-testid="run-result">
      @if (run(); as r) {
        @if (r.startsNow) {
          <p class="text-2xl md:text-3xl font-bold">{{ i18n.t('run.startNow') }}</p>
          <p class="text-sm text-text-secondary mt-1">
            {{ i18n.t('run.readyAt', { time: r.end }) }}
          </p>
        } @else {
          <p class="text-sm text-text-secondary">{{ i18n.t('run.bestStart') }}</p>
          <p class="text-2xl md:text-3xl font-bold">
            {{ r.start }}
            <span class="block sm:inline text-base font-semibold text-text-secondary"
              >→ {{ i18n.t('run.readyAt', { time: r.end }) }}</span
            >
          </p>
          <p
            class="mt-2 inline-block bg-pop-yellow border-2 border-ink px-2 py-0.5 text-sm font-semibold"
          >
            {{ i18n.t('run.delay', { delay: r.delay }) }}
          </p>
        }
        <dl class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <dt class="text-text-secondary">{{ i18n.t('run.average') }}</dt>
            <dd class="font-mono font-semibold" [class]="priceColor(r.average)">
              {{ r.average.toFixed(2) }} c/kWh
            </dd>
          </div>
          <div>
            <dt class="text-text-secondary">{{ i18n.t('run.cost') }}</dt>
            <dd class="font-mono font-semibold">{{ r.cost }}</dd>
          </div>
          @if (r.nowCost !== null) {
            <div>
              <dt class="text-text-secondary">{{ i18n.t('run.costNow') }}</dt>
              <dd class="font-mono font-semibold">{{ r.nowCost }}</dd>
            </div>
          }
          @if (r.saving !== null) {
            <div>
              <dt class="text-text-secondary">{{ i18n.t('run.saving') }}</dt>
              <dd class="font-mono font-semibold text-data-green">{{ r.saving }}</dd>
            </div>
          }
        </dl>
      } @else {
        <p class="text-sm font-semibold">{{ i18n.t(noRunKey()) }}</p>
      }
      <p class="text-xs text-text-secondary mt-4">{{ i18n.t('run.note') }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .field-label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }
    .field-input {
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal-sm);
      padding: 0.375rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-ink);
    }
  `,
})
export class RunPlannerComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;

  /** Sorted price slots. */
  readonly slots = input.required<readonly PriceSlot[]>();
  /** The current time in ms, ticking from the page. */
  readonly now = input.required<number>();

  protected readonly appliances = APPLIANCES;
  protected readonly step = STEP_MINUTES;
  protected readonly maxSteps = MAX_MINUTES / STEP_MINUTES;
  protected readonly maxKwh = MAX_KWH;
  protected readonly prefs = signal<RunPrefs>(this.loadPrefs());

  private readonly deadline = computed(() => nextTimeOfDay(this.prefs().readyBy, this.now()));

  /** The cheapest window, for the page to mark on its chart. */
  readonly window = computed(() => {
    const { minutes } = this.prefs();
    return cheapestRun(this.slots(), minutes * MIN, this.now(), this.deadline());
  });

  protected readonly run = computed(() => {
    const result = this.window();
    if (!result) return null;
    const { best, now } = result;
    const kwh = this.prefs().kwh;
    const startsNow = best.start === this.now();
    const saving = now && !startsNow ? (now.average - best.average) * kwh : null;
    return {
      startsNow,
      start: this.when(best.start),
      end: this.when(best.end),
      delay: this.formatDuration(Math.ceil((best.start - this.now()) / MIN)),
      average: best.average,
      cost: this.formatCents(best.average * kwh),
      nowCost: now && !startsNow ? this.formatCents(now.average * kwh) : null,
      saving: saving !== null && saving >= 0.005 ? this.formatCents(saving) : null,
    };
  });

  /** Why there's no answer: the deadline is too close, or prices aren't known that far ahead. */
  protected readonly noRunKey = computed<TranslationKey>(() => {
    if (this.deadline() === null) return 'run.noData';
    const free = cheapestRun(this.slots(), this.prefs().minutes * MIN, this.now());
    return free ? 'run.tooTight' : 'run.noData';
  });

  protected choose(appliance: Appliance): void {
    this.updatePrefs((prefs) => ({
      ...prefs,
      appliance: appliance.id,
      minutes: appliance.minutes,
      kwh: appliance.kwh,
    }));
  }

  protected setMinutes(minutes: number): void {
    const clamped = clampMinutes(minutes);
    this.updatePrefs((prefs) =>
      prefs.minutes === clamped ? prefs : { ...prefs, appliance: null, minutes: clamped },
    );
  }

  protected setKwh(field: HTMLInputElement): void {
    const kwh = Number(field.value);
    if (!Number.isFinite(kwh) || kwh <= 0) {
      field.value = String(this.prefs().kwh);
      return;
    }
    const clamped = Math.min(MAX_KWH, Math.round(kwh * 10) / 10 || 0.1);
    field.value = String(clamped);
    this.updatePrefs((prefs) =>
      prefs.kwh === clamped ? prefs : { ...prefs, appliance: null, kwh: clamped },
    );
  }

  protected setReadyBy(value: string): void {
    const readyBy = value.slice(0, 5);
    this.updatePrefs((prefs) => (prefs.readyBy === readyBy ? prefs : { ...prefs, readyBy }));
  }

  /** Changes the settings and remembers them, only once the visitor has changed something. */
  private updatePrefs(change: (prefs: RunPrefs) => RunPrefs): void {
    const before = this.prefs();
    const after = change(before);
    if (after === before) return;
    this.prefs.set(after);
    try {
      this.storage?.setItem(PREFS_KEY, JSON.stringify(after));
    } catch {
      // Storage can be full or blocked; the planner still works for this visit.
    }
  }

  protected optionClass(active: boolean): string {
    return `${OPTION_CLASS} ${active ? 'bg-pop-yellow' : 'bg-bg-card'}`;
  }

  protected priceColor(price: number): string {
    if (price < 0) return 'text-data-blue';
    if (price < 5) return 'text-data-green';
    if (price < 10) return 'text-data-orange';
    return 'text-red-400';
  }

  /** "3 h 15 min", "45 min", "0 min". */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) return `${rest} min`;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }

  /** Cents under a euro, euros from there: "0.04 c", "8.6 c", "€1.24" / "1.24 €". */
  private formatCents(cents: number): string {
    if (Math.abs(cents) < 1) return `${cents.toFixed(2)} c`;
    if (Math.abs(cents) < 100) return `${cents.toFixed(1)} c`;
    return (cents / 100).toLocaleString(this.i18n.locale(), {
      style: 'currency',
      currency: 'EUR',
    });
  }

  /** "Today 22:15", "Tomorrow 02:00". */
  private when(time: number): string {
    const date = new Date(time);
    const clock = date.toLocaleTimeString(this.i18n.locale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
    const today = new Date(this.now());
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((dayStart(date) - dayStart(today)) / 86_400_000);
    if (days === 0) return `${this.i18n.t('common.today')} ${clock}`;
    if (days === 1) return `${this.i18n.t('electricity.tomorrow')} ${clock}`;
    return `${date.toLocaleDateString(this.i18n.locale(), { weekday: 'short' })} ${clock}`;
  }

  private loadPrefs(): RunPrefs {
    try {
      const stored = JSON.parse(this.storage?.getItem(PREFS_KEY) ?? 'null') as Partial<RunPrefs>;
      if (!stored || typeof stored !== 'object') return DEFAULT_PREFS;
      const appliance = APPLIANCES.some((a) => a.id === stored.appliance)
        ? stored.appliance!
        : null;
      const kwh = Number(stored.kwh);
      return {
        appliance,
        minutes: clampMinutes(Number(stored.minutes)),
        kwh: Number.isFinite(kwh) && kwh > 0 ? Math.min(MAX_KWH, kwh) : DEFAULT_PREFS.kwh,
        readyBy:
          typeof stored.readyBy === 'string' && nextTimeOfDay(stored.readyBy, 0) !== null
            ? stored.readyBy
            : '',
      };
    } catch {
      return DEFAULT_PREFS;
    }
  }
}

function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_PREFS.minutes;
  const steps = Math.round(minutes / STEP_MINUTES);
  return Math.min(MAX_MINUTES, Math.max(STEP_MINUTES, steps * STEP_MINUTES));
}
