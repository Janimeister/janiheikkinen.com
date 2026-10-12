/**
 * The weather page's data shaping, kept free of Angular so it can be tested on its own. Open-Meteo
 * reports times in the location's own time zone without an offset, so these functions compare the
 * raw strings rather than parsing them with `Date`, which would apply the browser's time zone.
 */
import type { TranslationKey } from '../i18n/translations';

export interface WeatherCurrent {
  time: string;
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

export interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  relative_humidity_2m: number[];
  cloud_cover: number[];
}

export interface WeatherDaily {
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

export interface WeatherResponse {
  current: WeatherCurrent;
  hourly: WeatherHourly;
  daily: WeatherDaily;
}

export interface GeocodingResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
  }>;
}

export const WEATHER_ICONS: Record<number, { labelKey: TranslationKey; icon: string }> = {
  0: { labelKey: 'weather.clearSky', icon: '☀️' },
  1: { labelKey: 'weather.mainlyClear', icon: '🌤️' },
  2: { labelKey: 'weather.partlyCloudy', icon: '⛅' },
  3: { labelKey: 'weather.overcast', icon: '☁️' },
  45: { labelKey: 'weather.foggy', icon: '🌫️' },
  48: { labelKey: 'weather.rimeFog', icon: '🌫️' },
  51: { labelKey: 'weather.lightDrizzle', icon: '🌦️' },
  53: { labelKey: 'weather.drizzle', icon: '🌦️' },
  55: { labelKey: 'weather.denseDrizzle', icon: '🌧️' },
  61: { labelKey: 'weather.slightRain', icon: '🌧️' },
  63: { labelKey: 'weather.moderateRain', icon: '🌧️' },
  65: { labelKey: 'weather.heavyRain', icon: '🌧️' },
  71: { labelKey: 'weather.slightSnow', icon: '🌨️' },
  73: { labelKey: 'weather.moderateSnow', icon: '❄️' },
  75: { labelKey: 'weather.heavySnow', icon: '❄️' },
  77: { labelKey: 'weather.snowGrains', icon: '🌨️' },
  80: { labelKey: 'weather.rainShowers', icon: '🌦️' },
  81: { labelKey: 'weather.moderateShowers', icon: '🌧️' },
  82: { labelKey: 'weather.violentShowers', icon: '⛈️' },
  85: { labelKey: 'weather.snowShowers', icon: '🌨️' },
  86: { labelKey: 'weather.heavySnowShowers', icon: '❄️' },
  95: { labelKey: 'weather.thunderstorm', icon: '⛈️' },
  96: { labelKey: 'weather.thunderstormHail', icon: '⛈️' },
  99: { labelKey: 'weather.thunderstormHeavyHail', icon: '⛈️' },
};

const UNKNOWN_WEATHER = { labelKey: 'common.unknown', icon: '🌍' } as const;

/** The label key and icon for a WMO weather code. */
export function weatherInfo(code: number): { labelKey: TranslationKey; icon: string } {
  return WEATHER_ICONS[code] ?? UNKNOWN_WEATHER;
}

const COMPASS_KEYS: readonly TranslationKey[] = [
  'weather.windN',
  'weather.windNE',
  'weather.windE',
  'weather.windSE',
  'weather.windS',
  'weather.windSW',
  'weather.windW',
  'weather.windNW',
];

/** The nearest of the eight compass points for a wind direction in degrees. */
export function compassKey(degrees: number): TranslationKey {
  const point = Math.round(degrees / 45) % 8;
  return COMPASS_KEYS[(point + 8) % 8];
}

/** A typed place name stripped to letters, digits, spaces, `.`, `'` and `-`, at most 100 long. */
export function sanitizeLocation(raw: string): string {
  return raw
    .trim()
    .replace(/[^\p{L}\p{N}\s.'-]/gu, '')
    .substring(0, 100);
}

/** The colour class for a UV index, following the WHO bands. */
export function uvColor(uv: number): string {
  if (uv < 3) return 'text-data-green';
  if (uv < 6) return 'text-data-orange';
  if (uv < 8) return 'text-data-orange-deep';
  return 'text-red-400';
}

/** "9h 5m", or "9 t 5 min" in Finnish. */
export function formatDuration(seconds: number, language: string): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return language === 'fi' ? `${h} t ${m} min` : `${h}h ${m}m`;
}

export interface TodaySummary {
  sunrise: string;
  sunset: string;
  uvIndex: number;
  precipSum: number;
  precipProb: number;
  sunshineDuration: number;
}

/** Today's row of the daily forecast. */
export function todaySummary(data: WeatherResponse): TodaySummary | null {
  if (!data.daily) return null;
  return {
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
    uvIndex: data.daily.uv_index_max[0],
    precipSum: data.daily.precipitation_sum[0],
    precipProb: data.daily.precipitation_probability_max[0],
    sunshineDuration: data.daily.sunshine_duration[0],
  };
}

export interface HourSlot {
  time: string;
  isNow: boolean;
  temp: number;
  /** The bar's height in the temperature chart, 15–100 %. */
  tempPct: number;
  weatherCode: number;
  precipProb: number;
  windSpeed: number;
}

/**
 * Up to 24 hours from the one under way: the hour before the first one later than
 * `current.time`, or the last hour when the forecast has run out.
 */
export function next24Hours(data: WeatherResponse): HourSlot[] {
  const hourly = data.hourly;
  if (!hourly) return [];
  const nextHourIdx = hourly.time.findIndex((t) => t > data.current.time);
  const startIdx = Math.max(0, nextHourIdx === -1 ? hourly.time.length - 1 : nextHourIdx - 1);
  const slice = Array.from({ length: 24 }, (_, i) => startIdx + i).filter(
    (i) => i < hourly.time.length,
  );

  const temps = slice.map((i) => hourly.temperature_2m[i]);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const range = maxTemp - minTemp || 1;

  return slice.map((i, idx) => ({
    time: hourly.time[i],
    isNow: idx === 0,
    temp: Math.round(hourly.temperature_2m[i]),
    tempPct: Math.max(8, ((hourly.temperature_2m[i] - minTemp) / range) * 85 + 15),
    weatherCode: hourly.weather_code[i],
    precipProb: hourly.precipitation_probability[i],
    windSpeed: Math.round(hourly.wind_speed_10m[i]),
  }));
}

/** The chart's axis labels: the lowest, middle and highest rounded temperature. */
export function tempRange(hours: readonly HourSlot[]): { min: number; mid: number; max: number } {
  if (!hours.length) return { min: 0, mid: 0, max: 0 };
  const temps = hours.map((h) => h.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  return { min, mid: Math.round((min + max) / 2), max };
}

export interface DaySlot {
  date: string;
  isToday: boolean;
  weatherCode: number;
  min: number;
  max: number;
  /** Where the day's temperature bar starts and how wide it is, in % of the week's range. */
  barLeft: number;
  barWidth: number;
  precip: number;
  precipProb: number;
  wind: number;
  uv: number;
}

/** The week, each day's bar placed on one scale from the week's lowest to highest temperature. */
export function dailyForecast(data: WeatherResponse): DaySlot[] {
  const daily = data.daily;
  if (!daily) return [];
  const today = data.current.time.split('T')[0];

  const allMin = Math.min(...daily.temperature_2m_min);
  const allMax = Math.max(...daily.temperature_2m_max);
  const totalRange = allMax - allMin || 1;

  return daily.time.map((date, i) => ({
    date,
    isToday: date === today,
    weatherCode: daily.weather_code[i],
    min: Math.round(daily.temperature_2m_min[i]),
    max: Math.round(daily.temperature_2m_max[i]),
    barLeft: ((daily.temperature_2m_min[i] - allMin) / totalRange) * 100,
    barWidth: Math.max(
      5,
      ((daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / totalRange) * 100,
    ),
    precip: daily.precipitation_sum[i],
    precipProb: daily.precipitation_probability_max[i],
    wind: Math.round(daily.wind_speed_10m_max[i]),
    uv: daily.uv_index_max[i],
  }));
}
