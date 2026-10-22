import { describe, expect, it } from 'vitest';
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
  type WeatherResponse,
} from './forecast';

/** `hours` hourly slots from 2026-10-12T00:00, with temperatures from `temp(i)`. */
function forecast(
  currentTime: string,
  hours = 48,
  temp: (i: number) => number = (i) => i,
): WeatherResponse {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = Array.from(
    { length: hours },
    (_, i) => `2026-10-${pad(12 + Math.floor(i / 24))}T${pad(i % 24)}:00`,
  );
  const fill = (value: number) => time.map(() => value);
  return {
    current: {
      time: currentTime,
      temperature_2m: 10,
      weather_code: 3,
      wind_speed_10m: 4,
      wind_direction_10m: 180,
      wind_gusts_10m: 8,
      relative_humidity_2m: 80,
      apparent_temperature: 8,
      precipitation: 0,
      cloud_cover: 90,
      surface_pressure: 1010,
      is_day: 1,
    },
    hourly: {
      time,
      temperature_2m: time.map((_, i) => temp(i)),
      weather_code: fill(3),
      precipitation_probability: fill(20),
      precipitation: fill(0),
      wind_speed_10m: fill(4.6),
      relative_humidity_2m: fill(80),
      cloud_cover: fill(90),
    },
    daily: {
      time: ['2026-10-12', '2026-10-13', '2026-10-14'],
      weather_code: [3, 61, 0],
      temperature_2m_max: [12, 8, 20],
      temperature_2m_min: [4, 6, 0],
      sunrise: ['2026-10-12T07:45', '2026-10-13T07:48', '2026-10-14T07:50'],
      sunset: ['2026-10-12T18:30', '2026-10-13T18:27', '2026-10-14T18:24'],
      uv_index_max: [1.5, 0.8, 2.2],
      precipitation_sum: [0.2, 6.4, 0],
      precipitation_probability_max: [30, 90, 5],
      wind_speed_10m_max: [5.4, 9.6, 3.1],
      wind_gusts_10m_max: [11, 18, 7],
      wind_direction_10m_dominant: [200, 230, 90],
      sunshine_duration: [18_000, 3_600, 32_700],
    },
  };
}

describe('next24Hours', () => {
  it('starts at the hour under way and covers the next 24', () => {
    const hours = next24Hours(forecast('2026-10-12T13:15'));
    expect(hours).toHaveLength(24);
    expect(hours[0]).toMatchObject({ time: '2026-10-12T13:00', isNow: true, temp: 13 });
    expect(hours[1].isNow).toBe(false);
    expect(hours.at(-1)!.time).toBe('2026-10-13T12:00');
  });

  it('compares times as written, in the location’s own time zone', () => {
    // On the hour, the hour that just began is the current one.
    expect(next24Hours(forecast('2026-10-12T13:00'))[0].time).toBe('2026-10-12T13:00');
  });

  it('shows what is left near the end of the forecast', () => {
    const hours = next24Hours(forecast('2026-10-13T20:30'));
    expect(hours.map((h) => h.time)).toEqual([
      '2026-10-13T20:00',
      '2026-10-13T21:00',
      '2026-10-13T22:00',
      '2026-10-13T23:00',
    ]);
    expect(next24Hours(forecast('2026-10-15T00:00')).map((h) => h.time)).toEqual([
      '2026-10-13T23:00',
    ]);
  });

  it('scales bars between 15 % and 100 % and rounds the numbers shown', () => {
    const hours = next24Hours(forecast('2026-10-12T00:00', 24, (i) => -2.4 + i / 2));
    expect(hours[0].tempPct).toBe(15);
    expect(hours.at(-1)!.tempPct).toBe(100);
    expect(hours[0].temp).toBe(-2);
    expect(hours[0].windSpeed).toBe(5);
  });

  it('draws a flat day at the bottom instead of dividing by zero', () => {
    const hours = next24Hours(forecast('2026-10-12T00:00', 24, () => 5));
    expect(hours.every((h) => h.tempPct === 15)).toBe(true);
  });

  it('is empty without hourly data', () => {
    expect(next24Hours({ ...forecast('2026-10-12T00:00'), hourly: undefined! })).toEqual([]);
  });
});

describe('tempRange', () => {
  it('gives the lowest, middle and highest temperature', () => {
    const hours = next24Hours(forecast('2026-10-12T00:00', 24, (i) => i - 3));
    expect(tempRange(hours)).toEqual({ min: -3, mid: 9, max: 20 });
    expect(tempRange([])).toEqual({ min: 0, mid: 0, max: 0 });
  });
});

describe('dailyForecast', () => {
  it('marks today from the location’s date and places bars on the week’s scale', () => {
    const days = dailyForecast(forecast('2026-10-13T00:30'));
    expect(days.map((d) => d.isToday)).toEqual([false, true, false]);
    // The week runs from 0 to 20 degrees.
    expect(days[0]).toMatchObject({ min: 4, max: 12, barLeft: 20, barWidth: 40 });
    expect(days[2]).toMatchObject({ barLeft: 0, barWidth: 100 });
    // A narrow range still gets a visible bar.
    expect(days[1].barWidth).toBe(10);
    expect(days[1]).toMatchObject({ precip: 6.4, precipProb: 90, wind: 10, uv: 0.8 });
  });

  it('keeps a minimum bar width for a day with no spread', () => {
    const data = forecast('2026-10-12T12:00');
    data.daily.temperature_2m_min = [5, 5, 5];
    data.daily.temperature_2m_max = [5, 5, 5];
    expect(dailyForecast(data).map((d) => d.barWidth)).toEqual([5, 5, 5]);
  });
});

describe('todaySummary', () => {
  it('takes the first daily row', () => {
    expect(todaySummary(forecast('2026-10-12T12:00'))).toEqual({
      sunrise: '2026-10-12T07:45',
      sunset: '2026-10-12T18:30',
      uvIndex: 1.5,
      precipSum: 0.2,
      precipProb: 30,
      sunshineDuration: 18_000,
    });
    expect(todaySummary({ ...forecast('2026-10-12T12:00'), daily: undefined! })).toBeNull();
  });
});

describe('helpers', () => {
  it('names the nearest compass point', () => {
    expect(compassKey(0)).toBe('weather.windN');
    expect(compassKey(22)).toBe('weather.windN');
    expect(compassKey(23)).toBe('weather.windNE');
    expect(compassKey(180)).toBe('weather.windS');
    expect(compassKey(337.5)).toBe('weather.windN');
    expect(compassKey(360)).toBe('weather.windN');
    expect(compassKey(-90)).toBe('weather.windW');
  });

  it('strips a typed place name to safe characters', () => {
    expect(sanitizeLocation('  Helsinki  ')).toBe('Helsinki');
    expect(sanitizeLocation("St. John's")).toBe("St. John's");
    expect(sanitizeLocation('São Paulo-2')).toBe('São Paulo-2');
    expect(sanitizeLocation('<script>x</script>')).toBe('scriptxscript');
    expect(sanitizeLocation('a'.repeat(150))).toHaveLength(100);
    expect(sanitizeLocation('<>{}')).toBe('');
  });

  it('colours UV by WHO band', () => {
    expect([0, 2.9, 3, 5.9, 6, 7.9, 8, 11].map(uvColor)).toEqual([
      'text-data-green',
      'text-data-green',
      'text-data-orange',
      'text-data-orange',
      'text-data-orange-deep',
      'text-data-orange-deep',
      'text-red-400',
      'text-red-400',
    ]);
  });

  it('formats sunshine per language', () => {
    expect(formatDuration(32_700, 'en')).toBe('9h 5m');
    expect(formatDuration(32_700, 'fi')).toBe('9 t 5 min');
  });

  it('falls back for unknown weather codes', () => {
    expect(weatherInfo(61)).toEqual({ labelKey: 'weather.slightRain', icon: '🌧️' });
    expect(weatherInfo(42)).toEqual({ labelKey: 'common.unknown', icon: '🌍' });
  });
});
