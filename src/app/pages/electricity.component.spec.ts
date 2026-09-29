import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElectricityPageComponent } from './electricity.component';

/** Two local days of 15-minute prices, as api.porssisahko.net returns them (newest first). */
function twoDaysOfPrices(firstDay: Date) {
  const prices = [];
  for (let i = 0; i < 192; i++) {
    const start = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), 0, i * 15);
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
    const bars = [...page.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];
    const labels = bars.map((bar) => bar.getAttribute('aria-label'));
    expect(bars.length).toBe(192);
    expect(new Set(labels).size).toBe(192);
    expect(labels[5]).toMatch(/01:15: -0\.50 c\/kWh$/);
    expect(page.textContent).toContain('Negative');
    expect(bars[5].querySelector('.bg-pop-sky')).toBeTruthy();
  });
});
