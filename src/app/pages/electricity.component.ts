import { Component, resource, computed, ChangeDetectionStrategy, isDevMode } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';

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
      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#1a0a0a] via-[#0a0a0f] to-[#0a1a0a] animate-gradient-shift opacity-40"></div>
      <app-floating-orb class="absolute top-[10%] left-[15%] z-[1]" delay="1s" [size]="70" />
      <app-floating-orb class="absolute bottom-[30%] right-[8%] z-[1]" delay="4s" [size]="50" />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm text-text-secondary hover:text-accent-primary transition-colors mb-4 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            Back to Home
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent">Electricity Prices</span>
          </h1>
          <p class="text-text-secondary mt-2">Finland Nord Pool spot prices • Data from Porssisähkö</p>
        </div>

        @if (priceData.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (i of [1,2,3]; track i) {
              <app-glow-card>
                <div class="animate-pulse space-y-3">
                  <div class="h-6 bg-white/5 rounded w-1/2"></div>
                  <div class="h-20 bg-white/5 rounded"></div>
                </div>
              </app-glow-card>
            }
          </div>
        } @else if (priceData.error()) {
          <app-glow-card>
            <p class="text-red-400">Could not load electricity price data. Please try again later.</p>
          </app-glow-card>
        } @else {
          <!-- Current Price Hero -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 animate-fade-slide-up stagger-1">
            <div class="md:col-span-2">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">⚡</span>
                  <h2 class="text-lg font-semibold text-text-primary">Current Price</h2>
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
                    Spot price including VAT 25.5% • Valid {{ currentTimeRange() }}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full animate-glow-pulse" [class]="priceDotColor(currentPrice()!)"></span>
                    <span class="text-sm" [class]="priceColor(currentPrice()!)">{{ priceLevel(currentPrice()!) }}</span>
                  </div>
                } @else {
                  <p class="text-text-secondary">No current price available</p>
                }
              </app-glow-card>
            </div>
            <div>
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">📊</span>
                  <h2 class="text-lg font-semibold text-text-primary">Today Stats</h2>
                </div>
                @if (todayStats(); as stats) {
                  <div class="space-y-4">
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Average</span>
                      <span class="text-sm font-semibold" [class]="priceColor(stats.avg)">{{ stats.avg.toFixed(2) }} c/kWh</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Lowest</span>
                      <span class="text-sm font-semibold text-emerald-400">{{ stats.min.toFixed(2) }} c/kWh</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Highest</span>
                      <span class="text-sm font-semibold text-red-400">{{ stats.max.toFixed(2) }} c/kWh</span>
                    </div>
                    <hr class="border-white/5" />
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Cheapest Hour</span>
                      <span class="text-sm font-medium text-emerald-400">{{ stats.cheapestHour }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Priciest Hour</span>
                      <span class="text-sm font-medium text-red-400">{{ stats.priciestHour }}</span>
                    </div>
                  </div>
                } @else {
                  <p class="text-sm text-text-secondary">No data for today</p>
                }
              </app-glow-card>
            </div>
          </div>

          <!-- 24h Price Chart -->
          <div class="mb-8 animate-fade-slide-up stagger-2">
            <app-glow-card>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">📈</span>
                <h2 class="text-lg font-semibold text-text-primary">Price Chart (Today + Tomorrow)</h2>
              </div>
              <div class="relative">
                <!-- Y-axis labels -->
                <div class="flex items-end gap-0.5 h-48">
                  @for (bar of chartBars(); track bar.hour) {
                    <div class="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div class="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary whitespace-nowrap z-20 pointer-events-none transition-opacity">
                        {{ bar.hour }}: {{ bar.price.toFixed(2) }} c/kWh
                      </div>
                      <div class="w-full rounded-t-sm transition-all duration-300 cursor-pointer"
                           [class]="bar.isCurrent ? 'bg-accent-primary shadow-[0_0_10px_rgba(99,102,241,0.4)]' : bar.colorClass"
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
              <!-- Legend -->
              <div class="flex items-center gap-4 mt-4 text-xs text-text-secondary">
                <span class="flex items-center gap-1"><span class="w-3 h-2 rounded-sm bg-emerald-500/60"></span> &lt; 5 c/kWh</span>
                <span class="flex items-center gap-1"><span class="w-3 h-2 rounded-sm bg-amber-500/60"></span> 5–10 c/kWh</span>
                <span class="flex items-center gap-1"><span class="w-3 h-2 rounded-sm bg-red-500/60"></span> &gt; 10 c/kWh</span>
                <span class="flex items-center gap-1"><span class="w-3 h-2 rounded-sm bg-accent-primary"></span> Current</span>
              </div>
            </app-glow-card>
          </div>

          <!-- Price Table -->
          <div class="animate-fade-slide-up stagger-3">
            <app-glow-card>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">📋</span>
                <h2 class="text-lg font-semibold text-text-primary">Hourly Prices</h2>
              </div>
              <div class="overflow-x-auto -mx-4 px-4">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-text-secondary border-b border-white/5">
                      <th class="text-left py-2 pr-4">Time</th>
                      <th class="text-right py-2 pr-4">Price</th>
                      <th class="text-left py-2 hidden md:table-cell">Level</th>
                      <th class="text-left py-2">Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of priceTable(); track row.hour) {
                      <tr class="border-b border-white/[0.03] transition-colors"
                          [class]="row.isCurrent ? 'bg-accent-primary/5' : 'hover:bg-white/[0.02]'">
                        <td class="py-2 pr-4 font-mono text-text-primary">
                          {{ row.hour }}
                          @if (row.isCurrent) {
                            <span class="ml-1 text-[10px] text-accent-primary font-sans">NOW</span>
                          }
                        </td>
                        <td class="py-2 pr-4 text-right font-mono font-semibold" [class]="priceColor(row.price)">
                          {{ row.price.toFixed(2) }}
                        </td>
                        <td class="py-2 hidden md:table-cell text-text-secondary">{{ priceLevel(row.price) }}</td>
                        <td class="py-2">
                          <div class="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all" [class]="priceBarColor(row.price)"
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
               class="text-xs text-text-secondary/50 hover:text-text-secondary transition-colors">
              Data from porssisahko.net • Nord Pool spot prices
            </a>
          </div>
        }
      </div>
    </section>
  `,
})
export class ElectricityPageComponent {
  priceData = resource({
    loader: async (): Promise<PriceResponse> => {
      const baseUrl = isDevMode() ? '/api/porssisahko' : 'https://porssisahko-proxy.janimeister.workers.dev';
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
    const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
      return `${s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–${e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return { avg, min: minVal, max: maxVal, cheapestHour: fmtHour(cheapest), priciestHour: fmtHour(priciest) };
  });

  chartBars = computed(() => {
    const prices = this.sortedPrices();
    if (!prices.length) return [];
    const curIdx = this.currentIdx();
    const maxP = Math.max(...prices.map(p => Math.abs(p.price)), 1);

    return prices.map((p, i) => ({
      hour: new Date(p.startDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      price: p.price,
      heightPct: Math.max(3, (Math.max(0, p.price) / maxP) * 95),
      isCurrent: i === curIdx,
      colorClass: p.price < 5 ? 'bg-emerald-500/60' : p.price < 10 ? 'bg-amber-500/60' : 'bg-red-500/60',
    }));
  });

  priceTable = computed(() => {
    const prices = this.sortedPrices();
    if (!prices.length) return [];
    const curIdx = this.currentIdx();
    const maxP = Math.max(...prices.map(p => Math.abs(p.price)), 1);

    return prices.map((p, i) => ({
      hour: `${new Date(p.startDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–${new Date(p.endDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      price: p.price,
      isCurrent: i === curIdx,
      barPct: Math.max(3, (Math.max(0, p.price) / maxP) * 100),
    }));
  });

  priceColor(price: number): string {
    if (price < 5) return 'text-emerald-400';
    if (price < 10) return 'text-amber-400';
    return 'text-red-400';
  }

  priceBarColor(price: number): string {
    if (price < 5) return 'bg-emerald-500';
    if (price < 10) return 'bg-amber-500';
    return 'bg-red-500';
  }

  priceDotColor(price: number): string {
    if (price < 5) return 'bg-emerald-400';
    if (price < 10) return 'bg-amber-400';
    return 'bg-red-400';
  }

  priceLevel(price: number): string {
    if (price < 2) return 'Very cheap';
    if (price < 5) return 'Cheap';
    if (price < 10) return 'Moderate';
    if (price < 15) return 'Expensive';
    return 'Very expensive';
  }
}
