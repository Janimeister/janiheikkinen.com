// Fixed responses for the third-party APIs the site reads, so browser tests check what the pages
// render instead of whatever the live APIs return that day. Times are in Helsinki (UTC+3 on the
// fixed date); specs that depend on "now" freeze the clock at FIXED_NOW in that time zone.

export const TIME_ZONE = 'Europe/Helsinki';
/** Monday 12 October 2026, 13:05 in Helsinki. */
export const FIXED_NOW = new Date('2026-10-12T13:05:00+03:00');

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];

// ── Open-Meteo ──────────────────────────────────────────────────────

/** Hourly temperature: 5 °C at midnight rising to 16 °C at 13:00, then back down. */
const hourlyTemp = (hour: number) => 5 + 11 * Math.sin((Math.PI * Math.min(hour, 26)) / 26);

export const WEATHER = {
  current: {
    time: '2026-10-12T13:00',
    temperature_2m: 15.8,
    weather_code: 3,
    wind_speed_10m: 12.6,
    wind_direction_10m: 225,
    wind_gusts_10m: 24.1,
    relative_humidity_2m: 71,
    apparent_temperature: 13.9,
    precipitation: 0,
    cloud_cover: 96,
    surface_pressure: 1012.4,
    is_day: 1,
  },
  hourly: (() => {
    const time = DAYS.flatMap((day) => Array.from({ length: 24 }, (_, h) => `${day}T${pad(h)}:00`));
    const fill = (value: number) => time.map(() => value);
    return {
      time,
      temperature_2m: time.map((_, i) => Math.round(hourlyTemp(i % 24) * 10) / 10),
      weather_code: time.map((_, i) => (i % 24 < 6 ? 0 : 3)),
      precipitation_probability: fill(10),
      precipitation: fill(0),
      wind_speed_10m: fill(12.6),
      relative_humidity_2m: fill(71),
      cloud_cover: fill(96),
    };
  })(),
  daily: {
    time: DAYS,
    weather_code: [3, 61, 61, 0, 2, 71, 3],
    temperature_2m_max: [16.2, 12.4, 10.9, 11.5, 9.8, 2.1, 4.4],
    temperature_2m_min: [4.9, 7.2, 6.1, 3.0, 1.2, -3.4, -1.0],
    sunrise: DAYS.map((d) => `${d}T07:48`),
    sunset: DAYS.map((d) => `${d}T18:22`),
    uv_index_max: [1.9, 1.1, 0.8, 1.5, 1.4, 0.6, 0.9],
    precipitation_sum: [0, 6.4, 3.2, 0, 0.1, 4.8, 0.3],
    precipitation_probability_max: [10, 90, 80, 5, 20, 70, 30],
    wind_speed_10m_max: [14.2, 22.8, 18.1, 9.4, 11.0, 25.6, 16.3],
    wind_gusts_10m_max: [28, 41, 35, 19, 22, 47, 30],
    wind_direction_10m_dominant: [225, 200, 250, 90, 180, 10, 300],
    sunshine_duration: [18_000, 3_600, 7_200, 25_200, 14_400, 0, 10_800],
  },
};

export const GEOCODING_TAMPERE = {
  results: [{ latitude: 61.5, longitude: 23.79, name: 'Tampere' }],
};

// ── Pörssisähkö ─────────────────────────────────────────────────────

/**
 * 15-minute prices for the fixed day: every quarter of hour `h` costs `h` c/kWh, so midnight is
 * cheapest (0.00), 23:00 priciest (23.00), the day averages 11.50 and 13:05 costs 13.00.
 */
export const ELECTRICITY = {
  prices: Array.from({ length: 96 }, (_, i) => {
    const start = Date.parse('2026-10-12T00:00:00+03:00') + i * 15 * 60_000;
    return {
      price: Math.floor(i / 4),
      startDate: new Date(start).toISOString(),
      endDate: new Date(start + 15 * 60_000 - 1).toISOString(),
    };
  }).reverse(), // The API lists the newest first.
};

// ── GitHub ──────────────────────────────────────────────────────────

export const GITHUB_USER = {
  login: 'Janimeister',
  name: 'Jani Heikkinen',
  public_repos: 3,
  followers: 12,
  following: 4,
  avatar_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
  html_url: 'https://github.com/Janimeister',
  bio: 'Builds small things for the web.',
  location: 'Finland',
  company: null,
  blog: 'janiheikkinen.com',
  created_at: '2016-02-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
  public_gists: 1,
};

const repo = (name: string, language: string | null, updated: string, extra = {}) => ({
  name,
  description: `${name} description`,
  html_url: `https://github.com/Janimeister/${name}`,
  language,
  stargazers_count: 0,
  forks_count: 0,
  updated_at: updated,
  topics: [],
  fork: false,
  ...extra,
});

export const GITHUB_REPOS = [
  repo('pixel-garden', 'JavaScript', '2026-07-01T10:00:00Z'),
  repo('janiheikkinen.com', 'TypeScript', '2026-10-11T10:00:00Z', { stargazers_count: 3 }),
  repo('forked-lib', 'Rust', '2026-10-12T09:00:00Z', { fork: true }),
  repo('dotfiles', 'TypeScript', '2026-09-20T10:00:00Z', { forks_count: 1 }),
];

export const GITHUB_EVENTS = [
  {
    id: '1',
    type: 'PushEvent',
    repo: { name: 'Janimeister/janiheikkinen.com' },
    created_at: '2026-10-12T08:00:00Z',
    payload: {},
  },
  {
    id: '2',
    type: 'WatchEvent',
    repo: { name: 'someone/awesome-list' },
    created_at: '2026-10-09T08:00:00Z',
    payload: {},
  },
];

// ── Cat facts ───────────────────────────────────────────────────────

export const CAT_FACT = { fact: 'A group of cats is called a clowder.', length: 36 };
