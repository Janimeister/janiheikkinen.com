import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeparturesPageComponent } from './departures.component';

// Local times, so clock labels read the same in any time zone.
const NOW = new Date(2026, 9, 4, 13, 5).getTime();
const SERVICE_DAY = new Date(2026, 9, 4).getTime() / 1000;
const at = (h: number, m: number) => h * 3600 + m * 60;

const place = {
  gtfsId: 'HSL:1130446',
  name: 'Kauppatori',
  code: 'H0405',
  platformCode: null,
  desc: 'Pohjoisesplanadi',
  vehicleMode: 'TRAM',
  routes: [{ shortName: '2' }, { shortName: '4' }],
};

function stoptime(line: string, headsign: string, minute: number, extra = {}) {
  return {
    serviceDay: SERVICE_DAY,
    scheduledDeparture: at(13, minute),
    realtimeDeparture: at(13, minute),
    departureDelay: 0,
    realtime: true,
    realtimeState: 'UPDATED',
    headsign,
    stop: { platformCode: null },
    trip: { gtfsId: `HSL:${line}_${minute}`, route: { shortName: line, mode: 'TRAM' } },
    ...extra,
  };
}

const BOARD = {
  data: {
    place: {
      ...place,
      stoptimesWithoutPatterns: [
        stoptime('4', 'Munkkiniemi', 5, { realtimeDeparture: at(13, 5) + 20 }),
        stoptime('2', 'Pasila', 8, { realtimeDeparture: at(13, 11), departureDelay: 180 }),
        stoptime('4', 'Katajanokka', 25, { realtime: false, realtimeState: 'SCHEDULED' }),
        stoptime('2', 'Olympiaterminaali', 30, { realtimeState: 'CANCELED' }),
      ],
    },
  },
};

const SEARCH = {
  data: {
    stations: [],
    stops: [place, { ...place, gtfsId: 'HSL:1130447', code: 'H0406', name: 'Kauppatori' }],
  },
};

describe('DeparturesPageComponent', () => {
  let requests: { query: string; variables: Record<string, unknown> }[];

  beforeEach(async () => {
    localStorage.clear();
    requests = [];
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      requests.push(body);
      const payload = body.query.includes('query Search') ? SEARCH : BOARD;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'departures', component: DeparturesPageComponent }])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, DeparturesPageComponent);
    return harness;
  }

  it('shows the board for the stop in the address', async () => {
    const harness = await open('/departures?stop=HSL:1130446');
    const page = harness.routeNativeElement!;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(page.querySelectorAll('[data-testid="departure-row"]').length).toBe(4);
    });
    expect(requests[0].variables).toEqual({ id: 'HSL:1130446', count: 12 });

    const rows = [...page.querySelectorAll('[data-testid="departure-row"]')].map((row) =>
      [...row.querySelectorAll('td')].map((td) => td.textContent!.replace(/\s+/g, ' ').trim()),
    );
    expect(rows[0]).toEqual(['Tram 4', 'Munkkiniemi', '●Real-time estimate: now 13:05']);
    expect(rows[1]).toEqual(['Tram 2', 'Pasila, +3 min late', '●Real-time estimate: 6 min 13:11']);
    expect(rows[2]).toEqual(['Tram 4', 'Katajanokka', '13:25']);
    expect(rows[3][1]).toBe('Olympiaterminaali, Cancelled');
    expect(page.querySelectorAll('tr.cancelled').length).toBe(1);
    expect(page.querySelector('h2')?.textContent).toContain('Find a Stop');
    expect(page.textContent).toContain('Kauppatori');
    expect(page.textContent).toContain('H0405');
  });

  it('searches, opens a stop and remembers it', async () => {
    const harness = await open('/departures');
    const page = harness.routeNativeElement!;
    expect(page.querySelector('[data-testid="departure-board"]')).toBeNull();

    const input = page.querySelector<HTMLInputElement>('[data-testid="departures-search"]')!;
    input.value = 'kauppa';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(page.querySelectorAll('[data-testid="departures-results"] button').length).toBe(2);
    });
    expect(requests[0].variables).toEqual({ name: 'kauppa' });

    page.querySelector<HTMLButtonElement>('[data-testid="departures-results"] button')!.click();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(page.querySelector('[data-testid="departure-board"]')).toBeTruthy();
    });
    expect(TestBed.inject(Router).url).toBe('/departures?stop=HSL:1130446');
    expect(JSON.parse(localStorage.getItem('departures-recent')!)).toEqual([
      { kind: 'stop', id: 'HSL:1130446', name: 'Kauppatori', code: 'H0405', mode: 'TRAM' },
    ]);
  });

  it('does not search for fewer than three characters', async () => {
    const harness = await open('/departures');
    const page = harness.routeNativeElement!;
    const input = page.querySelector<HTMLInputElement>('[data-testid="departures-search"]')!;
    input.value = 'ka';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    harness.detectChanges();
    expect(requests).toEqual([]);
    expect(page.textContent).toContain('Rautatientori');
  });

  it('opens the most recent stop when the address names none', async () => {
    localStorage.setItem(
      'departures-recent',
      JSON.stringify([{ kind: 'stop', id: 'HSL:1130446', name: 'Kauppatori', code: 'H0405' }]),
    );
    const harness = await open('/departures');
    const page = harness.routeNativeElement!;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(page.querySelector('[data-testid="departure-board"]')).toBeTruthy();
    });
    expect(page.textContent).toContain('Recent');
  });

  it('says so when the stop is unknown', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { place: null } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const harness = await open('/departures?stop=HSL:0');
    const page = harness.routeNativeElement!;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(page.querySelector('.text-red-400')?.textContent).toContain(
        'Could not load this stop',
      );
    });
  });
});
