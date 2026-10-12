import { Component, computed, signal, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, form, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';
import {
  compassKey,
  dailyForecast,
  formatDuration,
  next24Hours,
  sanitizeLocation,
  tempRange,
  todaySummary,
  uvColor,
  weatherInfo,
  type GeocodingResponse,
  type WeatherResponse,
} from '../weather/forecast';

@Component({
  selector: 'app-weather-page',
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink, FormField, FormRoot],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <!-- Decorative shapes -->
      <app-floating-orb
        class="hidden md:block absolute top-[15%] right-[10%] z-[1]"
        delay="0s"
        [size]="60"
        shape="circle"
        color="sky"
        rotate="-4deg"
      />
      <app-floating-orb
        class="hidden md:block absolute bottom-[20%] left-[5%] z-[1]"
        delay="3s"
        [size]="80"
        shape="square"
        color="yellow"
        rotate="6deg"
      />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a
            routerLink="/"
            class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {{ i18n.t('common.backToHome') }}
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="marker marker-sky">{{ i18n.t('weather.title') }}</span>
          </h1>
          <p class="text-text-secondary mt-2">{{ i18n.t('weather.subtitle') }}</p>
          <!-- Location search -->
          <form [formRoot]="searchForm" class="mt-4 flex gap-2 max-w-sm">
            <input
              type="text"
              [formField]="searchForm.location"
              [attr.placeholder]="i18n.t('weather.searchPlaceholder')"
              [attr.aria-label]="i18n.t('weather.searchPlaceholder')"
              [attr.aria-invalid]="
                searchForm.location().invalid() && searchForm.location().touched()
              "
              autocomplete="off"
              class="flex-1 min-w-0 bg-bg-card border-2 border-ink px-4 py-2 text-sm text-text-primary placeholder-text-secondary/70 shadow-brutal-sm transition-colors"
            />
            <button
              type="submit"
              [disabled]="searchForm().submitting() || searchForm().invalid()"
              class="px-4 py-2 text-sm font-bold bg-pop-sky text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (searchForm().submitting()) {
                {{ i18n.t('weather.searching') }}
              } @else {
                {{ i18n.t('weather.search') }}
              }
            </button>
          </form>
          @if (searchError(); as err) {
            <p class="text-xs text-red-400 mt-2">{{ i18n.t(err.key, err.params) }}</p>
          }
        </div>

        @if (weather.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <app-glow-card>
                <div class="animate-pulse space-y-3">
                  <div class="h-6 bg-ink/10 w-1/2"></div>
                  <div class="h-20 bg-ink/10"></div>
                </div>
              </app-glow-card>
            }
          </div>
        } @else if (weather.error()) {
          <app-glow-card>
            <p class="text-red-400">{{ i18n.t('weather.loadError') }}</p>
          </app-glow-card>
        } @else if (weather.value(); as data) {
          <!-- Current Conditions Hero -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8 animate-fade-slide-up stagger-1">
            <div class="lg:col-span-2">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">📍</span>
                  <h2 class="text-lg font-semibold text-text-primary">
                    {{ i18n.t('weather.currentLocation', { location: locationName() }) }}
                  </h2>
                </div>
                <div class="flex items-center gap-6 mb-6">
                  <span class="text-7xl md:text-8xl">{{
                    weatherInfo(data.current.weather_code).icon
                  }}</span>
                  <div>
                    <div
                      class="text-5xl md:text-6xl font-bold text-text-primary font-[JetBrains_Mono,monospace]"
                    >
                      {{ data.current.temperature_2m }}°C
                    </div>
                    <div class="text-lg text-text-secondary mt-1">
                      {{ weatherInfo(data.current.weather_code).label }}
                    </div>
                    <div class="text-sm text-text-secondary">
                      {{
                        i18n.t('weather.feelsLike', {
                          temperature: data.current.apparent_temperature,
                        })
                      }}
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="bg-pop-sky border-2 border-ink p-3 shadow-brutal-sm">
                    <div class="text-xs text-ink mb-1">💨 {{ i18n.t('weather.wind') }}</div>
                    <div class="text-lg font-semibold text-ink">
                      {{ data.current.wind_speed_10m }} km/h
                    </div>
                    <div class="text-xs text-ink">
                      {{ windDirection(data.current.wind_direction_10m) }}
                    </div>
                  </div>
                  <div class="bg-pop-orange border-2 border-ink p-3 shadow-brutal-sm">
                    <div class="text-xs text-ink mb-1">🌊 {{ i18n.t('weather.gusts') }}</div>
                    <div class="text-lg font-semibold text-ink">
                      {{ data.current.wind_gusts_10m }} km/h
                    </div>
                  </div>
                  <div class="bg-pop-lime border-2 border-ink p-3 shadow-brutal-sm">
                    <div class="text-xs text-ink mb-1">💧 {{ i18n.t('weather.humidity') }}</div>
                    <div class="text-lg font-semibold text-ink">
                      {{ data.current.relative_humidity_2m }}%
                    </div>
                  </div>
                  <div class="bg-pop-yellow border-2 border-ink p-3 shadow-brutal-sm">
                    <div class="text-xs text-ink mb-1">☁️ {{ i18n.t('weather.cloudCover') }}</div>
                    <div class="text-lg font-semibold text-ink">
                      {{ data.current.cloud_cover }}%
                    </div>
                  </div>
                </div>
              </app-glow-card>
            </div>
            <div>
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">🌅</span>
                  <h2 class="text-lg font-semibold text-text-primary">
                    {{ i18n.t('common.today') }}
                  </h2>
                </div>
                @if (todayDaily(); as today) {
                  <div class="space-y-4">
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{
                        i18n.t('weather.sunrise')
                      }}</span>
                      <span class="text-sm font-medium text-data-orange">{{
                        formatTime(today.sunrise)
                      }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{
                        i18n.t('weather.sunset')
                      }}</span>
                      <span class="text-sm font-medium text-data-orange-deep">{{
                        formatTime(today.sunset)
                      }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{
                        i18n.t('weather.sunshine')
                      }}</span>
                      <span class="text-sm font-medium text-text-primary">{{
                        formatDuration(today.sunshineDuration)
                      }}</span>
                    </div>
                    <hr class="border-t-2 border-ink" />
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{
                        i18n.t('weather.uvIndex')
                      }}</span>
                      <span class="text-sm font-semibold" [class]="uvColor(today.uvIndex)">{{
                        today.uvIndex.toFixed(1)
                      }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{
                        i18n.t('weather.precipitation')
                      }}</span>
                      <span class="text-sm font-medium text-text-primary"
                        >{{ today.precipSum }} mm</span
                      >
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{
                        i18n.t('weather.precipChance')
                      }}</span>
                      <span class="text-sm font-medium text-text-primary"
                        >{{ today.precipProb }}%</span
                      >
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-text-secondary">{{
                        i18n.t('weather.pressure')
                      }}</span>
                      <span class="text-sm font-medium text-text-primary"
                        >{{ data.current.surface_pressure.toFixed(0) }} hPa</span
                      >
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
                <h2 class="text-lg font-semibold text-text-primary">
                  {{ i18n.t('weather.hourlyForecast') }}
                </h2>
              </div>
              <div
                class="overflow-x-auto -mx-4 px-4"
                tabindex="0"
                role="region"
                [attr.aria-label]="i18n.t('weather.hourlyForecastRegion')"
              >
                <div class="flex gap-3 min-w-max pb-2">
                  @for (hour of next24Hours(); track hour.time) {
                    <div
                      class="flex flex-col items-center gap-1 min-w-[60px] p-2 border-2 border-ink shadow-brutal-sm transition-colors"
                      [class]="
                        hour.isNow
                          ? 'bg-bg-card-hover shadow-brutal'
                          : 'bg-bg-card hover:bg-bg-card-hover'
                      "
                    >
                      <span class="text-xs text-text-secondary">{{ hour.timeLabel }}</span>
                      <span class="text-lg">{{ weatherInfo(hour.weatherCode).icon }}</span>
                      <span class="text-sm font-semibold text-text-primary">{{ hour.temp }}°</span>
                      <div class="flex items-center gap-0.5">
                        <svg class="w-3 h-3 text-data-blue" fill="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"
                          />
                        </svg>
                        <span class="text-[10px] text-data-blue">{{ hour.precipProb }}%</span>
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
                <h2 class="text-lg font-semibold text-text-primary">
                  {{ i18n.t('weather.temperatureTrend') }}
                </h2>
              </div>
              <div class="relative h-32 flex">
                <!-- Y-axis labels -->
                <div
                  class="flex flex-col justify-between items-end pr-2 text-[10px] text-text-secondary font-mono shrink-0 py-0.5"
                >
                  <span>{{ tempRange().max }}°</span>
                  <span>{{ tempRange().mid }}°</span>
                  <span>{{ tempRange().min }}°</span>
                </div>
                <!-- Chart area -->
                <div class="flex-1 relative">
                  <!-- Grid lines -->
                  <div
                    class="absolute inset-0 flex flex-col justify-between pointer-events-none py-0.5"
                  >
                    <div class="border-t-2 border-ink/15"></div>
                    <div class="border-t-2 border-ink/15"></div>
                    <div class="border-t-2 border-ink/15"></div>
                  </div>
                  <!-- Bars -->
                  <div class="flex items-end gap-0.5 h-full relative z-[1]">
                    @for (hour of next24Hours(); track hour.time) {
                      <div
                        class="flex-1 transition-all duration-300 group relative"
                        role="img"
                        [attr.aria-label]="hour.timeLabel + ': ' + hour.temp + '°C'"
                        [style.height.%]="hour.tempPct"
                      >
                        <div
                          class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-bg-card border-2 border-ink shadow-brutal-sm px-1.5 py-0.5 text-[10px] text-text-primary whitespace-nowrap z-20 pointer-events-none transition-opacity"
                        >
                          {{ hour.temp }}°C
                        </div>
                        <div
                          class="w-full h-full"
                          [class]="
                            hour.isNow
                              ? 'bg-accent-primary'
                              : hour.temp > 0
                                ? 'bg-pop-orange'
                                : 'bg-pop-sky'
                          "
                        ></div>
                      </div>
                    }
                  </div>
                </div>
              </div>
              <div class="flex justify-between text-[10px] text-text-secondary mt-1 pl-8">
                <span>{{ i18n.t('common.now') }}</span>
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
                <h2 class="text-lg font-semibold text-text-primary">
                  {{ i18n.t('weather.dailyForecast') }}
                </h2>
              </div>
              <div class="space-y-3">
                @for (day of dailyForecast(); track day.date) {
                  <div
                    class="flex items-center gap-4 p-3 border-2 border-ink shadow-brutal-sm transition-colors"
                    [class]="
                      day.isToday
                        ? 'bg-bg-card-hover shadow-brutal'
                        : 'bg-bg-card hover:bg-bg-card-hover'
                    "
                  >
                    <div class="w-20 text-sm font-medium text-text-primary">{{ day.dayLabel }}</div>
                    <span class="text-2xl w-10 text-center">{{
                      weatherInfo(day.weatherCode).icon
                    }}</span>
                    <div class="flex-1 flex items-center gap-2">
                      <!-- Temp range bar -->
                      <span class="text-sm text-data-blue w-10 text-right">{{ day.min }}°</span>
                      <div
                        class="flex-1 h-3 bg-bg-card border-2 border-ink relative overflow-hidden"
                      >
                        <div
                          class="absolute h-full bg-accent-secondary transition-all"
                          [style.left.%]="day.barLeft"
                          [style.width.%]="day.barWidth"
                        ></div>
                      </div>
                      <span class="text-sm text-data-orange-deep w-10">{{ day.max }}°</span>
                    </div>
                    <div class="hidden md:flex items-center gap-4 text-xs text-text-secondary">
                      <span [title]="i18n.t('weather.precipitationTitle')"
                        >💧 {{ day.precip }} mm</span
                      >
                      <span [title]="i18n.t('weather.precipitationProbabilityTitle')"
                        >☔ {{ day.precipProb }}%</span
                      >
                      <span [title]="i18n.t('weather.windTitle')">💨 {{ day.wind }} km/h</span>
                      <span [title]="i18n.t('weather.uvIndex')" [class]="uvColor(day.uv)"
                        >UV {{ day.uv.toFixed(0) }}</span
                      >
                    </div>
                  </div>
                }
              </div>
            </app-glow-card>
          </div>
        }

        <!-- Attribution -->
        <div class="mt-6 text-center">
          <a
            href="https://open-meteo.com"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-text-secondary hover:text-accent-light underline underline-offset-2 transition-colors"
          >
            {{ i18n.t('weather.attribution') }}
          </a>
        </div>
      </div>
    </section>
  `,
})
export class WeatherPageComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly http = inject(HttpClient);
  private coords = signal<{ lat: number; lon: number }>({ lat: 60.17, lon: 24.94 });
  locationName = signal('Helsinki');
  private readonly searchModel = signal({ location: '' });
  protected readonly searchForm = form(
    this.searchModel,
    (search) => {
      required(search.location);
      maxLength(search.location, 100);
    },
    {
      submission: {
        action: async (search) => this.searchLocation(search.location().value()),
      },
    },
  );
  searchError = signal<{ key: TranslationKey; params?: Record<string, string | number> } | null>(
    null,
  );

  private async searchLocation(location: string) {
    const raw = location.trim();
    if (!raw) return;

    const sanitized = sanitizeLocation(raw);
    if (!sanitized) {
      this.searchError.set({ key: 'weather.searchInvalid' });
      return;
    }

    this.searchError.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<GeocodingResponse>('https://geocoding-api.open-meteo.com/v1/search', {
          params: {
            name: sanitized,
            count: 1,
            language: this.i18n.language(),
            format: 'json',
          },
          timeout: 10_000,
        }),
      );

      if (!data.results?.length) {
        this.searchError.set({ key: 'weather.noResults', params: { location: sanitized } });
        return;
      }

      const result = data.results[0];
      this.coords.set({ lat: result.latitude, lon: result.longitude });
      this.locationName.set(result.name);
      this.searchForm.location().value.set('');
    } catch {
      this.searchError.set({ key: 'weather.searchFailed' });
    }
  }

  weather = httpResource<WeatherResponse>(() => {
    const { lat, lon } = this.coords();
    return {
      url: 'https://api.open-meteo.com/v1/forecast',
      params: {
        latitude: lat,
        longitude: lon,
        current:
          'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,surface_pressure,is_day',
        hourly:
          'temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,relative_humidity_2m,cloud_cover',
        daily:
          'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunshine_duration',
        timezone: 'auto',
        forecast_days: 7,
      },
      timeout: 10_000,
    };
  });

  private readonly data = computed(() =>
    this.weather.hasValue() ? this.weather.value() : undefined,
  );

  weatherInfo(code: number) {
    const weather = weatherInfo(code);
    return { label: this.i18n.t(weather.labelKey), icon: weather.icon };
  }

  windDirection(deg: number): string {
    return this.i18n.t(compassKey(deg));
  }

  formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString(this.i18n.locale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuration(seconds: number): string {
    return formatDuration(seconds, this.i18n.language());
  }

  protected readonly uvColor = uvColor;

  todayDaily = computed(() => {
    const data = this.data();
    return data ? todaySummary(data) : null;
  });

  next24Hours = computed(() => {
    const data = this.data();
    if (!data) return [];
    return next24Hours(data).map((hour) => ({
      ...hour,
      timeLabel: hour.isNow
        ? this.i18n.t('common.now')
        : new Date(hour.time).toLocaleTimeString(this.i18n.locale(), {
            hour: '2-digit',
            minute: '2-digit',
          }),
    }));
  });

  tempRange = computed(() => tempRange(this.next24Hours()));

  dailyForecast = computed(() => {
    const data = this.data();
    if (!data) return [];
    return dailyForecast(data).map((day) => ({
      ...day,
      dayLabel: day.isToday
        ? this.i18n.t('common.today')
        : new Date(day.date + 'T00:00').toLocaleDateString(this.i18n.locale(), {
            weekday: 'short',
            day: 'numeric',
          }),
    }));
  });
}
