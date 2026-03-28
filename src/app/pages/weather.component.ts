import { Component, resource, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';

interface WeatherCurrent {
  temperature_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  precipitation: number;
  cloud_cover: number;
  surface_pressure: number;
  is_day: number;
}

interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  relative_humidity_2m: number[];
  cloud_cover: number[];
}

interface WeatherDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  wind_gusts_10m_max: number[];
  wind_direction_10m_dominant: number[];
  sunshine_duration: number[];
}

interface WeatherResponse {
  current: WeatherCurrent;
  hourly: WeatherHourly;
  daily: WeatherDaily;
}

const WEATHER_ICONS: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌧️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '🌨️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Moderate showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm w/ hail', icon: '⛈️' },
  99: { label: 'Thunderstorm w/ heavy hail', icon: '⛈️' },
};

@Component({
  selector: 'app-weather-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink, FormsModule],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a2e] via-[#0a0a0f] to-[#0a1a2e] animate-gradient-shift opacity-40"></div>
      <app-floating-orb class="absolute top-[15%] right-[10%] z-[1]" delay="0s" [size]="60" />
      <app-floating-orb class="absolute bottom-[20%] left-[5%] z-[1]" delay="3s" [size]="80" />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm text-text-secondary hover:text-accent-primary transition-colors mb-4 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            Back to Home
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="bg-gradient-to-r from-sky-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">{{ locationName() }} Weather</span>
          </h1>
          <p class="text-text-secondary mt-2">Detailed forecast from Open-Meteo • Updated every 15 minutes</p>
          <!-- Location search -->
          <div class="mt-4 flex gap-2 max-w-sm">
            <input type="text"
                   [(ngModel)]="searchQuery"
                   (keydown.enter)="searchLocation()"
                   placeholder="Search location..."
                   maxlength="100"
                   autocomplete="off"
                   class="flex-1 bg-white/[0.05] border border-border rounded-xl px-4 py-2 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-accent-primary/50 transition-colors" />
            <button (click)="searchLocation()"
                    [disabled]="searching()"
                    class="px-4 py-2 text-sm font-medium rounded-xl bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 border border-accent-primary/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              @if (searching()) { Searching... } @else { Search }
            </button>
          </div>
          @if (searchError()) {
            <p class="text-xs text-red-400 mt-2">{{ searchError() }}</p>
          }
        </div>

        @if (weather.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (i of [1,2,3,4,5,6]; track i) {
              <app-glow-card>
                <div class="animate-pulse space-y-3">
                  <div class="h-6 bg-white/5 rounded w-1/2"></div>
                  <div class="h-20 bg-white/5 rounded"></div>
                </div>
              </app-glow-card>
            }
          </div>
        } @else if (weather.error()) {
          <app-glow-card>
            <p class="text-red-400">Could not load weather data. Please try again later.</p>
          </app-glow-card>
        } @else if (weather.value(); as data) {
          <!-- Current Conditions Hero -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8 animate-fade-slide-up stagger-1">
            <div class="lg:col-span-2">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">📍</span>
                  <h2 class="text-lg font-semibold text-text-primary">Current Conditions</h2>
                </div>
                <div class="flex items-center gap-6 mb-6">
                  <span class="text-7xl md:text-8xl">{{ weatherInfo(data.current.weather_code).icon }}</span>
                  <div>
                    <div class="text-5xl md:text-6xl font-bold text-text-primary font-[JetBrains_Mono,monospace]">
                      {{ data.current.temperature_2m }}°C
                    </div>
                    <div class="text-lg text-text-secondary mt-1">
                      {{ weatherInfo(data.current.weather_code).label }}
                    </div>
                    <div class="text-sm text-text-secondary">
                      Feels like {{ data.current.apparent_temperature }}°C
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-xs text-text-secondary mb-1">💨 Wind</div>
                    <div class="text-lg font-semibold text-text-primary">{{ data.current.wind_speed_10m }} km/h</div>
                    <div class="text-xs text-text-secondary">{{ windDirection(data.current.wind_direction_10m) }}</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-xs text-text-secondary mb-1">🌊 Gusts</div>
                    <div class="text-lg font-semibold text-text-primary">{{ data.current.wind_gusts_10m }} km/h</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-xs text-text-secondary mb-1">💧 Humidity</div>
                    <div class="text-lg font-semibold text-text-primary">{{ data.current.relative_humidity_2m }}%</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-xs text-text-secondary mb-1">☁️ Cloud Cover</div>
                    <div class="text-lg font-semibold text-text-primary">{{ data.current.cloud_cover }}%</div>
                  </div>
                </div>
              </app-glow-card>
            </div>
            <div>
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">🌅</span>
                  <h2 class="text-lg font-semibold text-text-primary">Today</h2>
                </div>
                @if (todayDaily(); as today) {
                  <div class="space-y-4">
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Sunrise</span>
                      <span class="text-sm font-medium text-amber-300">{{ formatTime(today.sunrise) }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Sunset</span>
                      <span class="text-sm font-medium text-orange-400">{{ formatTime(today.sunset) }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Sunshine</span>
                      <span class="text-sm font-medium text-text-primary">{{ formatDuration(today.sunshineDuration) }}</span>
                    </div>
                    <hr class="border-white/5" />
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">UV Index</span>
                      <span class="text-sm font-semibold" [class]="uvColor(today.uvIndex)">{{ today.uvIndex.toFixed(1) }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Precipitation</span>
                      <span class="text-sm font-medium text-text-primary">{{ today.precipSum }} mm</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Precip. Chance</span>
                      <span class="text-sm font-medium text-text-primary">{{ today.precipProb }}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">Pressure</span>
                      <span class="text-sm font-medium text-text-primary">{{ data.current.surface_pressure.toFixed(0) }} hPa</span>
                    </div>
                  </div>
                }
              </app-glow-card>
            </div>
          </div>

          <!-- Hourly Forecast -->
          <div class="mb-8 animate-fade-slide-up stagger-2">
            <app-glow-card>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">🕐</span>
                <h2 class="text-lg font-semibold text-text-primary">24-Hour Forecast</h2>
              </div>
              <div class="overflow-x-auto -mx-4 px-4">
                <div class="flex gap-3 min-w-max pb-2">
                  @for (hour of next24Hours(); track hour.time) {
                    <div class="flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl transition-colors"
                         [class]="hour.isNow ? 'bg-accent-primary/10 border border-accent-primary/30' : 'bg-white/[0.02]'">
                      <span class="text-xs text-text-secondary">{{ hour.timeLabel }}</span>
                      <span class="text-lg">{{ weatherInfo(hour.weatherCode).icon }}</span>
                      <span class="text-sm font-semibold text-text-primary">{{ hour.temp }}°</span>
                      <div class="flex items-center gap-0.5">
                        <svg class="w-3 h-3 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>
                        <span class="text-[10px] text-sky-400">{{ hour.precipProb }}%</span>
                      </div>
                      <span class="text-[10px] text-text-secondary">{{ hour.windSpeed }} km/h</span>
                    </div>
                  }
                </div>
              </div>
            </app-glow-card>
          </div>

          <!-- Temperature Chart -->
          <div class="mb-8 animate-fade-slide-up stagger-3">
            <app-glow-card>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">📈</span>
                <h2 class="text-lg font-semibold text-text-primary">Temperature Trend (24h)</h2>
              </div>
              <div class="relative h-32 flex">
                <!-- Y-axis labels -->
                <div class="flex flex-col justify-between items-end pr-2 text-[10px] text-text-secondary font-mono shrink-0 py-0.5">
                  <span>{{ tempRange().max }}°</span>
                  <span>{{ tempRange().mid }}°</span>
                  <span>{{ tempRange().min }}°</span>
                </div>
                <!-- Chart area -->
                <div class="flex-1 relative">
                  <!-- Grid lines -->
                  <div class="absolute inset-0 flex flex-col justify-between pointer-events-none py-0.5">
                    <div class="border-t border-white/[0.06]"></div>
                    <div class="border-t border-white/[0.06]"></div>
                    <div class="border-t border-white/[0.06]"></div>
                  </div>
                  <!-- Bars -->
                  <div class="flex items-end gap-0.5 h-full relative z-[1]">
                    @for (hour of next24Hours(); track hour.time) {
                      <div class="flex-1 rounded-t-sm transition-all duration-300 group relative"
                           [style.height.%]="hour.tempPct">
                        <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-bg-card border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary whitespace-nowrap z-20 pointer-events-none transition-opacity">
                          {{ hour.temp }}°C
                        </div>
                        <div class="w-full h-full rounded-t-sm"
                             [class]="hour.isNow ? 'bg-accent-primary' : (hour.temp > 0 ? 'bg-sky-500/40' : 'bg-blue-400/40')">
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
              <div class="flex justify-between text-[10px] text-text-secondary mt-1 pl-8">
                <span>Now</span>
                <span>+6h</span>
                <span>+12h</span>
                <span>+18h</span>
                <span>+24h</span>
              </div>
            </app-glow-card>
          </div>

          <!-- 7 Day Forecast -->
          <div class="animate-fade-slide-up stagger-4">
            <app-glow-card>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">📅</span>
                <h2 class="text-lg font-semibold text-text-primary">7-Day Forecast</h2>
              </div>
              <div class="space-y-3">
                @for (day of dailyForecast(); track day.date) {
                  <div class="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                       [class]="day.isToday ? 'border border-accent-primary/20' : ''">
                    <div class="w-20 text-sm font-medium text-text-primary">{{ day.dayLabel }}</div>
                    <span class="text-2xl w-10 text-center">{{ weatherInfo(day.weatherCode).icon }}</span>
                    <div class="flex-1 flex items-center gap-2">
                      <!-- Temp range bar -->
                      <span class="text-sm text-blue-300 w-10 text-right">{{ day.min }}°</span>
                      <div class="flex-1 h-2 rounded-full bg-white/5 relative overflow-hidden">
                        <div class="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400 transition-all"
                             [style.left.%]="day.barLeft"
                             [style.width.%]="day.barWidth">
                        </div>
                      </div>
                      <span class="text-sm text-orange-300 w-10">{{ day.max }}°</span>
                    </div>
                    <div class="hidden md:flex items-center gap-4 text-xs text-text-secondary">
                      <span title="Precipitation">💧 {{ day.precip }} mm</span>
                      <span title="Precipitation probability">☔ {{ day.precipProb }}%</span>
                      <span title="Wind">💨 {{ day.wind }} km/h</span>
                      <span title="UV Index" [class]="uvColor(day.uv)">UV {{ day.uv.toFixed(0) }}</span>
                    </div>
                  </div>
                }
              </div>
            </app-glow-card>
          </div>

          <!-- Attribution -->
          <div class="mt-6 text-center">
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer"
               class="text-xs text-text-secondary/50 hover:text-text-secondary transition-colors">
              Weather data provided by Open-Meteo.com (CC BY 4.0)
            </a>
          </div>
        }
      </div>
    </section>
  `,
})
export class WeatherPageComponent {
  private coords = signal<{ lat: number; lon: number }>({ lat: 60.17, lon: 24.94 });
  locationName = signal('Helsinki');
  searchQuery = '';
  searching = signal(false);
  searchError = signal('');

  async searchLocation() {
    const raw = this.searchQuery.trim();
    if (!raw) return;

    // Sanitize: allow only letters, spaces, hyphens, apostrophes, periods, and digits
    const sanitized = raw.replace(/[^\p{L}\p{N}\s.'-]/gu, '').substring(0, 100);
    if (!sanitized) {
      this.searchError.set('Please enter a valid location name.');
      return;
    }

    this.searching.set(true);
    this.searchError.set('');

    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(sanitized)}&count=1&language=en&format=json`
      );
      if (!res.ok) throw new Error('Geocoding request failed');
      const data = await res.json();

      if (!data.results?.length) {
        this.searchError.set(`No results found for "${sanitized}".`);
        return;
      }

      const result = data.results[0];
      this.coords.set({ lat: result.latitude, lon: result.longitude });
      this.locationName.set(result.name);
      this.searchQuery = '';
      this.weather.reload();
    } catch {
      this.searchError.set('Search failed. Please try again.');
    } finally {
      this.searching.set(false);
    }
  }

  weather = resource({
    loader: async (): Promise<WeatherResponse> => {
      const { lat, lon } = this.coords();
      const params = [
        `latitude=${lat}`,
        `longitude=${lon}`,
        'current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,surface_pressure,is_day',
        'hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,relative_humidity_2m,cloud_cover',
        'daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunshine_duration',
        'timezone=auto',
        'forecast_days=7',
      ].join('&');
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) throw new Error('Weather API error');
      return res.json();
    },
  });

  weatherInfo(code: number) {
    return WEATHER_ICONS[code] ?? { label: 'Unknown', icon: '🌍' };
  }

  windDirection(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  uvColor(uv: number): string {
    if (uv < 3) return 'text-emerald-400';
    if (uv < 6) return 'text-amber-400';
    if (uv < 8) return 'text-orange-400';
    return 'text-red-400';
  }

  todayDaily = computed(() => {
    const data = this.weather.value();
    if (!data?.daily) return null;
    return {
      sunrise: data.daily.sunrise[0],
      sunset: data.daily.sunset[0],
      uvIndex: data.daily.uv_index_max[0],
      precipSum: data.daily.precipitation_sum[0],
      precipProb: data.daily.precipitation_probability_max[0],
      sunshineDuration: data.daily.sunshine_duration[0],
    };
  });

  next24Hours = computed(() => {
    const data = this.weather.value();
    if (!data?.hourly) return [];
    const now = new Date();
    const currentHourIdx = data.hourly.time.findIndex(t => new Date(t) >= now);
    const startIdx = Math.max(0, currentHourIdx);
    const slice = Array.from({ length: 24 }, (_, i) => startIdx + i).filter(
      i => i < data.hourly.time.length
    );

    const temps = slice.map(i => data.hourly.temperature_2m[i]);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp || 1;

    return slice.map((i, idx) => ({
      time: data.hourly.time[i],
      timeLabel: idx === 0 ? 'Now' : new Date(data.hourly.time[i]).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      temp: Math.round(data.hourly.temperature_2m[i]),
      tempPct: Math.max(8, ((data.hourly.temperature_2m[i] - minTemp) / range) * 85 + 15),
      weatherCode: data.hourly.weather_code[i],
      precipProb: data.hourly.precipitation_probability[i],
      windSpeed: Math.round(data.hourly.wind_speed_10m[i]),
      isNow: idx === 0,
    }));
  });

  tempRange = computed(() => {
    const hours = this.next24Hours();
    if (!hours.length) return { min: 0, mid: 0, max: 0 };
    const temps = hours.map(h => h.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    return { min, mid: Math.round((min + max) / 2), max };
  });

  dailyForecast = computed(() => {
    const data = this.weather.value();
    if (!data?.daily) return [];
    const today = new Date().toISOString().split('T')[0];

    const allMin = Math.min(...data.daily.temperature_2m_min);
    const allMax = Math.max(...data.daily.temperature_2m_max);
    const totalRange = allMax - allMin || 1;

    return data.daily.time.map((date, i) => ({
      date,
      dayLabel: date === today ? 'Today' : new Date(date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      isToday: date === today,
      weatherCode: data.daily.weather_code[i],
      min: Math.round(data.daily.temperature_2m_min[i]),
      max: Math.round(data.daily.temperature_2m_max[i]),
      barLeft: ((data.daily.temperature_2m_min[i] - allMin) / totalRange) * 100,
      barWidth: Math.max(5, ((data.daily.temperature_2m_max[i] - data.daily.temperature_2m_min[i]) / totalRange) * 100),
      precip: data.daily.precipitation_sum[i],
      precipProb: data.daily.precipitation_probability_max[i],
      wind: Math.round(data.daily.wind_speed_10m_max[i]),
      uv: data.daily.uv_index_max[i],
    }));
  });
}
