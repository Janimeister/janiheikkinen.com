import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageService } from '../../i18n/language.service';
import { PageHeaderComponent } from './page-header.component';

@Component({
  imports: [PageHeaderComponent],
  template: `
    <app-page-header titleKey="trams.title" [subtitleKey]="subtitle" marker="lime">
      <p class="extra">Projected</p>
    </app-page-header>
  `,
})
class HostComponent {
  subtitle: 'meta.trams' | undefined = 'meta.trams';
}

describe('PageHeaderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
  });

  function render() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows the way home, the heading on its marker and the subtitle', () => {
    const { element } = render();

    expect(element.querySelector('a[href="/"]')?.textContent).toContain('Back to Home');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Tram Map');
    expect(element.querySelector('h1 .marker')?.classList).toContain('marker-lime');
    expect(element.querySelector('header > p')?.textContent).toContain('Helsinki');
  });

  it('puts what the page adds after the subtitle', () => {
    const { element } = render();
    const children = [...element.querySelector('header')!.children].map((el) => el.tagName);

    expect(children).toEqual(['A', 'H1', 'P', 'P']);
    expect(element.querySelector('header > .extra')?.textContent).toBe('Projected');
  });

  it('leaves the subtitle out when the page has none', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.subtitle = undefined;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('header > p')).toHaveLength(1);
  });

  it('follows the language, in its text and its link home', async () => {
    const { fixture, element } = render();

    await TestBed.inject(LanguageService).setLanguage('fi');
    fixture.detectChanges();

    expect(element.querySelector('a[href="/fi"]')?.textContent).toContain('Takaisin etusivulle');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Ratikkakartta');
  });
});
