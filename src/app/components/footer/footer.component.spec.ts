import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { FooterComponent } from './footer.component';
import { LanguageService } from '../../i18n/language.service';

describe('FooterComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the current year', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const currentYear = new Date().getFullYear().toString();
    expect(compiled.textContent).toContain(currentYear);
  });

  it('should display copyright text', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jani Heikkinen');
  });

  it('should mention Angular in credits', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Angular');
  });

  it('should have a Third-Party Notices link', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a[href="/third-party-notices"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Third-Party Notices');
  });

  it('should translate footer links when language changes', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    const language = TestBed.inject(LanguageService);

    language.setLanguage('fi');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Kolmansien osapuolten ilmoitukset');
  });
});
