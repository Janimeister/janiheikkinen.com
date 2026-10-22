import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElectricityPageComponent } from './electricity.component';

/** Two local days of 15-minute prices, as api.porssisahko.net returns them (newest first). */
function twoDaysOfPrices(firstDay: Date) {
  const prices = [];
  for (let i = 0; i < 192; i++) {
    const start = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      firstDay.getDate(),
      0,
      i * 15,
    );
    const end = new Date(start.getTime() + 15 * 60_000 - 1);
    prices.push({
      price: i === 5 ? -0.5 : 1 + (i % 20),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  }
  return { prices: prices.reverse() };
}

describe('ElectricityPageComponent', () => {
  const today = new Date(2026, 8, 29);

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 29, 13, 5));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(twoDaysOfPrices(today)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await TestBed.configureTestingModule({
      imports: [ElectricityPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function render() {
    const fixture = TestBed.createComponent(ElectricityPageComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('table tbody tr')).toBeTruthy();
    });
    return fixture.nativeElement as HTMLElement;
  }

  it('groups the price table by day', async () => {
    const page = await render();
    const dayHeaders = [...page.querySelectorAll('tbody th[scope="colgroup"]')].map((th) =>
      th.textContent?.trim(),
    );
    expect(dayHeaders).toEqual(['Today', 'Tomorrow']);
    expect(page.querySelectorAll('tbody tr').length).toBe(192 + 2);
  });

  it('shows whole-minute slot ends and the current slot', async () => {
    const page = await render();
    const firstRow = page.querySelectorAll('tbody tr')[1];
    expect(firstRow.querySelector('td')?.textContent).toContain('00:00–00:15');
    expect(page.textContent).toContain('13:00 – 13:15');
    expect(page.textContent).toContain('Cheapest 15 min');
  });

  it('labels every chart bar with its day, and marks negative prices', async () => {
    const page = await render();
    const bars = [...page.querySelectorAll<HTMLButtonElement>('[aria-label="Price chart"] button')];
    const labels = bars.map((bar) => bar.getAttribute('aria-label'));
    expect(bars.length).toBe(192);
    expect(new Set(labels).size).toBe(192);
    expect(labels[5]).toMatch(/01:15: -0\.50 c\/kWh$/);
    expect(page.textContent).toContain('Negative');
    expect(bars[5].querySelector('.bg-pop-sky')).toBeTruthy();
  });

  describe('best time to run', () => {
    const result = (page: HTMLElement) =>
      page.querySelector('[data-testid="run-result"]')!.textContent!.replace(/\s+/g, ' ');

    it('finds the cheapest start for the dishwasher and marks it on the chart', async () => {
      const page = await render();
      // Prices cycle 1…20 c/kWh every 5 hours; the next cycle starts at 15:00.
      expect(result(page)).toContain('Cheapest start');
      expect(result(page)).toContain('Today 15:00');
      expect(result(page)).toContain('ready Today 18:00');
      expect(result(page)).toContain('Delay start by 1 h 55 min');
      expect(result(page)).toContain('6.50 c/kWh');
      expect(page.querySelectorAll('[data-run]').length).toBe(12);
    });

    it('switches appliances and remembers the choice', async () => {
      const page = await render();
      const sauna = [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.textContent?.includes('Sauna'),
      )!;
      sauna.click();
      await vi.waitFor(() => {
        TestBed.inject(ApplicationRef).tick();
        expect(sauna.getAttribute('aria-pressed')).toBe('true');
        expect(page.querySelector('output')?.textContent).toContain('1 h 30 min');
        expect(page.querySelectorAll('[data-run]').length).toBe(6);
      });
      expect(JSON.parse(localStorage.getItem('electricity-run')!)).toMatchObject({
        appliance: 'sauna',
        minutes: 90,
        kwh: 8,
      });
    });

    it('explains when the run cannot finish by the ready-by time', async () => {
      localStorage.setItem(
        'electricity-run',
        JSON.stringify({ appliance: 'dishwasher', minutes: 180, kwh: 1, readyBy: '14:00' }),
      );
      const page = await render();
      expect(result(page)).toContain("The run can't finish by then");
      expect(page.querySelectorAll('[data-run]').length).toBe(0);
    });
  });
});
