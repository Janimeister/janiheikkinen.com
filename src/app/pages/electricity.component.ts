import { Component, resource, computed, signal, ChangeDetectionStrategy, effect, ElementRef, inject, afterNextRender, Injector } from '@angular/core';
import { environment } from '../../environments/environment';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { LanguageService } from '../i18n/language.service';

interface PriceEntry {
  price: number;
  startDate: string;
  endDate: string;
}

interface PriceResponse {
  prices: PriceEntry[];
}

@Component({
  selector: 'app-electricity-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <!-- Decorative shapes -->
      <app-floating-orb class="hidden md:block absolute top-[10%] left-[15%] z-[1]" delay="1s" [size]="70" shape="triangle" color="orange" rotate="-8deg" />
      <app-floating-orb class="hidden md:block absolute bottom-[30%] right-[8%] z-[1]" delay="4s" [size]="50" shape="square" color="pink" rotate="5deg" />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            {{ i18n.t('common.backToHome') }}
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="marker marker-orange">{{ i18n.t('electricity.title') }}</span>
          </h1>
          <p class="text-text-secondary mt-2">{{ i18n.t('electricity.subtitle') }}</p>
        </div>

        @if (priceData.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (i of [1,2,3]; track i) {
              <app-glow-card>
                <div class="animate-pulse space-y-3">
                  <div class="h-6 bg-ink/10 w-1/2"></div>
                  <div class="h-20 bg-ink/10"></div>
                </div>
              </app-glow-card>
            }
          </div>
        } @else if (priceData.error()) {
          <app-glow-card>
            <p class="text-red-400">{{ i18n.t('electricity.loadError') }}</p>
          </app-glow-card>
        } @else {
          <!-- Current Price Hero -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 animate-fade-slide-up stagger-1">
            <div class="md:col-span-2">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">⚡</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('electricity.currentPrice') }}</h2>
                </div>
                @if (currentPrice() !== null) {
                  <div class="flex items-baseline gap-3 mb-2">
                    <span class="text-6xl md:text-7xl font-bold font-[JetBrains_Mono,monospace]"
                          [class]="priceColor(currentPrice()!)">
                      {{ currentPrice()!.toFixed(2) }}
                    </span>
                    <span class="text-2xl text-text-secondary">c/kWh</span>
                  </div>
                  <div class="text-sm text-text-secondary mb-4">
                    {{ i18n.t('electricity.vatNotice', { range: currentTimeRange() }) }}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 border-2 border-ink shadow-brutal-sm" [class]="priceDotColor(currentPrice()!)"></span>
                    <span class="text-sm" [class]="priceColor(currentPrice()!)">{{ priceLevel(currentPrice()!) }}</span>
                  </div>
                } @else {
                  <p class="text-text-secondary">{{ i18n.t('electricity.noCurrentPrice') }}</p>
                }
              </app-glow-card>
            </div>
            <div>
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">📊</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('electricity.todayStats') }}</h2>
                </div>
                @if (todayStats(); as stats) {
                  <div class="space-y-4">
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{ i18n.t('electricity.average') }}</span>
                      <span class="text-sm font-semibold" [class]="priceColor(stats.avg)">{{ stats.avg.toFixed(2) }} c/kWh</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{ i18n.t('electricity.lowest') }}</span>
                      <span class="text-sm font-semibold text-[#287234]">{{ stats.min.toFixed(2) }} c/kWh</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{ i18n.t('electricity.highest') }}</span>
                      <span class="text-sm font-semibold text-red-400">{{ stats.max.toFixed(2) }} c/kWh</span>
                    </div>
                    <hr class="border-t-2 border-ink" />
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{ i18n.t('electricity.cheapestHour') }}</span>
                      <span class="text-sm font-medium text-[#287234]">{{ stats.cheapestHour }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{ i18n.t('electricity.priciestHour') }}</span>
                      <span class="text-sm font-medium text-red-400">{{ stats.priciestHour }}</span>
                    </div>
                  </div>
                } @else {
                  <p class="text-sm text-text-secondary">{{ i18n.t('electricity.noDataToday') }}</p>
                }
              </app-glow-card>
            </div>
          </div>

          <!-- 24h Price Chart -->
          <div class="mb-8 animate-fade-slide-up stagger-2">
            <app-glow-card>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">📈</span>
                <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('electricity.priceChart') }}</h2>
              </div>
              <div class="flex">
                <!-- Y-axis (outside scroll container) -->
                <div class="flex flex-col justify-between h-48 pr-1.5 shrink-0 mt-8">
                  @for (tick of yAxisTicks(); track $index) {
                    <span class="text-[9px] text-text-secondary leading-none text-right font-mono">{{ tick }}</span>
                  }
                </div>
                <!-- Scrollable chart -->
                <div class="overflow-x-auto flex-1 min-w-0 -mr-4 pr-4" tabindex="0" role="region" [attr.aria-label]="i18n.t('electricity.priceChartRegion')" #chartScroller (click)="activeBarIdx.set(null)">
                  <div [style.min-width.px]="chartBars().length * 10" class="pt-8">
                    <div class="flex items-end gap-0.5 h-48">
                      @for (bar of chartBars(); track bar.hour; let i = $index) {
                        <div class="flex-1 flex flex-col items-center justify-end h-full group relative"
                             (click)="onBarClick($event, i)"
                             [attr.data-current]="bar.isCurrent || null">
                          <div class="absolute bottom-full mb-1 bg-bg-card border-2 border-ink shadow-brutal-sm px-2 py-1 text-xs text-text-primary whitespace-nowrap z-20 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"
                               [style.opacity]="activeBarIdx() === i ? 1 : null">
                            {{ bar.hour }}: {{ bar.price.toFixed(2) }} c/kWh
                          </div>
                          <div class="w-full transition-all duration-300 cursor-pointer"
                               [class]="bar.isCurrent ? 'bg-accent-primary border-2 border-ink' : bar.colorClass"
                               [style.height.%]="bar.heightPct">
                          </div>
                        </div>
                      }
                    </div>
                    <!-- X-axis labels -->
                    <div class="flex mt-1">
                      @for (bar of chartBars(); track bar.hour; let i = $index) {
                        @if (i % 12 === 0) {
                          <div class="text-[9px] text-text-secondary" [style.width.%]="(12 / chartBars().length) * 100">
                            {{ bar.hour }}
                          </div>
                        }
                      }
                    </div>
                  </div>
                </div>
              </div>
              <!-- Legend -->
              <div class="flex items-center gap-4 mt-4 text-xs text-text-secondary">
                <span class="flex items-center gap-1"><span class="w-3 h-2 border-2 border-ink bg-pop-lime"></span> &lt; 5 c/kWh</span>
                <span class="flex items-center gap-1"><span class="w-3 h-2 border-2 border-ink bg-pop-yellow"></span> 5–10 c/kWh</span>
                <span class="flex items-center gap-1"><span class="w-3 h-2 border-2 border-ink bg-[#c92a2a]"></span> &gt; 10 c/kWh</span>
                <span class="flex items-center gap-1"><span class="w-3 h-2 border-2 border-ink bg-accent-primary"></span> {{ i18n.t('electricity.currentLegend') }}</span>
              </div>
            </app-glow-card>
          </div>

          <!-- Price Table -->
          <div class="animate-fade-slide-up stagger-3">
            <app-glow-card>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">📋</span>
                <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('electricity.hourlyPrices') }}</h2>
              </div>
              <div class="overflow-x-auto -mx-4 px-4" tabindex="0" role="region" [attr.aria-label]="i18n.t('electricity.hourlyPricesRegion')">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-text-secondary border-b-2 border-ink">
                      <th class="text-left py-2 pr-4">{{ i18n.t('electricity.time') }}</th>
                      <th class="text-right py-2 pr-4">{{ i18n.t('electricity.price') }}</th>
                      <th class="text-left py-2 hidden md:table-cell">{{ i18n.t('electricity.level') }}</th>
                      <th class="text-left py-2">{{ i18n.t('electricity.bar') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of priceTable(); track row.hour) {
                      <tr class="border-b-2 border-ink transition-colors"
                          [class]="row.isCurrent ? 'bg-bg-card-hover' : 'hover:bg-bg-card-hover'">
                        <td class="py-2 pr-4 font-mono text-text-primary">
                          {{ row.hour }}
                          @if (row.isCurrent) {
                            <span class="ml-1 text-[10px] text-accent-light font-sans">{{ i18n.t('electricity.now') }}</span>
                          }
                        </td>
                        <td class="py-2 pr-4 text-right font-mono font-semibold" [class]="priceColor(row.price)">
                          {{ row.price.toFixed(2) }}
                        </td>
                        <td class="py-2 hidden md:table-cell text-text-secondary">{{ priceLevel(row.price) }}</td>
                        <td class="py-2">
                          <div class="w-full h-3 bg-bg-card border-2 border-ink overflow-hidden">
                            <div class="h-full transition-all" [class]="priceBarColor(row.price)"
                                 [style.width.%]="row.barPct">
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </app-glow-card>
          </div>

          <!-- Attribution -->
          <div class="mt-6 text-center">
            <a href="https://porssisahko.net" target="_blank" rel="noopener noreferrer"
               class="text-xs text-text-secondary hover:text-accent-light underline underline-offset-2 transition-colors">
              {{ i18n.t('electricity.attribution') }}
            </a>
          </div>
        }
      </div>
    </section>
  `,
})
export class ElectricityPageComponent {
  private el = inject(ElementRef);
  private injector = inject(Injector);
  protected readonly i18n = inject(LanguageService);
  activeBarIdx = signal<number | null>(null);

  constructor() {
    effect(() => {
      const bars = this.chartBars();
      if (!bars.length || !bars.some(b => b.isCurrent)) return;
      afterNextRender(() => {
        const scroller = this.el.nativeElement.querySelector('[data-current]')?.closest('.overflow-x-auto');
        const currentBar = scroller?.querySelector('[data-current]') as HTMLElement | null;
        if (scroller && currentBar) {
          const scrollLeft = currentBar.offsetLeft - scroller.clientWidth / 2 + currentBar.offsetWidth / 2;
          scroller.scrollTo({ left: scrollLeft, behavior: 'instant' });
        }
      }, { injector: this.injector });
    });
  }

  priceData = resource({
    loader: async (): Promise<PriceResponse> => {
      const baseUrl = environment.workerUrl;
      const res = await fetch(`${baseUrl}/v2/latest-prices.json`);
      if (!res.ok) throw new Error('Electricity API error');
      return res.json();
    },
  });

  private sortedPrices = computed(() => {
    const data = this.priceData.value();
    if (!data?.prices?.length) return [];
    return [...data.prices].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  });

  private currentIdx = computed(() => {
    const prices = this.sortedPrices();
    const now = new Date();
    return prices.findIndex(p => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return now >= start && now < end;
    });
  });

  currentPrice = computed(() => {
    const idx = this.currentIdx();
    const prices = this.sortedPrices();
    if (idx >= 0) return prices[idx].price;
    return prices.length ? prices[0].price : null;
  });

  currentTimeRange = computed(() => {
    const idx = this.currentIdx();
    const prices = this.sortedPrices();
    if (idx < 0 || !prices[idx]) return '';
    const start = new Date(prices[idx].startDate);
    const end = new Date(prices[idx].endDate);
    const fmt = (d: Date) => d.toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' });
    return `${fmt(start)} – ${fmt(end)}`;
  });

  todayStats = computed(() => {
    const prices = this.sortedPrices();
    if (!prices.length) return null;
    const today = new Date().toISOString().split('T')[0];
    const todayPrices = prices.filter(p => p.startDate.startsWith(today));
    if (!todayPrices.length) return null;

    const vals = todayPrices.map(p => p.price);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const cheapest = todayPrices.find(p => p.price === minVal)!;
    const priciest = todayPrices.find(p => p.price === maxVal)!;
    const fmtHour = (p: PriceEntry) => {
      const s = new Date(p.startDate);
      const e = new Date(p.endDate);
      return `${s.toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' })}–${e.toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' })}`;
    };

    return { avg, min: minVal, max: maxVal, cheapestHour: fmtHour(cheapest), priciestHour: fmtHour(priciest) };
  });

  private chartMax = computed(() => {
    const prices = this.sortedPrices();
    if (!prices.length) return 1;
    return Math.ceil(Math.max(...prices.map(p => p.price), 1));
  });

  yAxisTicks = computed(() => {
    const max = this.chartMax();
    const tickCount = 5;
    return Array.from({ length: tickCount }, (_, i) =>
      +((max * (tickCount - 1 - i)) / (tickCount - 1)).toFixed(1)
    );
  });

  chartBars = computed(() => {
    const prices = this.sortedPrices();
    if (!prices.length) return [];
    const curIdx = this.currentIdx();
    const maxP = this.chartMax();

    return prices.map((p, i) => ({
      hour: new Date(p.startDate).toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' }),
      price: p.price,
      heightPct: Math.max(2, (Math.max(0, p.price) / maxP) * 100),
      isCurrent: i === curIdx,
      colorClass: p.price < 5 ? 'bg-pop-lime' : p.price < 10 ? 'bg-pop-yellow' : 'bg-[#c92a2a]',
    }));
  });

  priceTable = computed(() => {
    const prices = this.sortedPrices();
    if (!prices.length) return [];
    const curIdx = this.currentIdx();
    const maxP = Math.max(...prices.map(p => Math.abs(p.price)), 1);

    return prices.map((p, i) => ({
      hour: `${new Date(p.startDate).toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' })}–${new Date(p.endDate).toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' })}`,
      price: p.price,
      isCurrent: i === curIdx,
      barPct: Math.max(3, (Math.max(0, p.price) / maxP) * 100),
    }));
  });

  priceColor(price: number): string {
    if (price < 5) return 'text-[#287234]';
    if (price < 10) return 'text-[#a85100]';
    return 'text-red-400';
  }

  priceBarColor(price: number): string {
    if (price < 5) return 'bg-pop-lime';
    if (price < 10) return 'bg-pop-yellow';
    return 'bg-[#c92a2a]';
  }

  priceDotColor(price: number): string {
    if (price < 5) return 'bg-pop-lime';
    if (price < 10) return 'bg-pop-yellow';
    return 'bg-[#c92a2a]';
  }

  onBarClick(event: Event, i: number) {
    event.stopPropagation();
    this.activeBarIdx.set(this.activeBarIdx() === i ? null : i);
  }

  priceLevel(price: number): string {
    if (price < 2) return this.i18n.t('electricity.veryCheap');
    if (price < 5) return this.i18n.t('electricity.cheap');
    if (price < 10) return this.i18n.t('electricity.moderate');
    if (price < 15) return this.i18n.t('electricity.expensive');
    return this.i18n.t('electricity.veryExpensive');
  }
}
