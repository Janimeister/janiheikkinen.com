import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ThirdPartyNoticesComponent,
  splitTrailingPunctuation,
} from './third-party-notices.component';
import { LanguageService } from '../i18n/language.service';

describe('ThirdPartyNoticesComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    // Default: keep fetch pending so component stays in loading state;
    // individual tests override this spy as needed.
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    await TestBed.configureTestingModule({
      imports: [ThirdPartyNoticesComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have a back link to home', () => {
    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const backLink = compiled.querySelector('a[href="/"]');
    expect(backLink).toBeTruthy();
    expect(backLink?.textContent).toContain('Back to Home');
  });

  it('should display heading', () => {
    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1?.textContent).toContain('Third-Party Notices');
  });

  it('should translate heading and back link when language changes', async () => {
    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    const language = TestBed.inject(LanguageService);

    await language.setLanguage('fi');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/"]')?.textContent).toContain('Takaisin etusivulle');
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Kolmansien osapuolten ilmoitukset',
    );
  });

  it('should show loading state initially', () => {
    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const pulse = compiled.querySelector('.animate-pulse');
    expect(pulse).toBeTruthy();
  });

  it('should render markdown content after loading', async () => {
    const sampleMd = '## Test Section\n\n- **Item:** value\n\n```\nLicense text\n```';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(sampleMd, { status: 200 }));

    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    fixture.detectChanges();

    // Wait for resource to resolve
    await vi.waitFor(() => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.notices-content')).toBeTruthy();
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.querySelector('.notices-content');
    expect(content?.querySelector('h2')?.textContent).toContain('Test Section');
    expect(content?.querySelector('li')).toBeTruthy();
    expect(content?.querySelector('pre')).toBeTruthy();
  });

  it('should show error state on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));

    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.text-red-400')).toBeTruthy();
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Could not load');
  });

  it('should escape HTML in markdown to prevent XSS', async () => {
    const maliciousMd = '## Safe\n\n- <script>alert("xss")</script>';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(maliciousMd, { status: 200 }));

    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.notices-content')).toBeTruthy();
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('script')).toBeNull();
  });

  it('should keep sentence punctuation out of bare links', async () => {
    const md =
      '- Feed (https://example.org/feed.zip) and https://example.org/wiki/A_(b), see [Docs](https://example.org/docs).';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(md, { status: 200 }));

    const fixture = TestBed.createComponent(ThirdPartyNoticesComponent);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('.notices-content a'),
      ).toBeTruthy();
    });

    const links = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.notices-content a'),
    ];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://example.org/feed.zip',
      'https://example.org/wiki/A_(b)',
      'https://example.org/docs',
    ]);
    expect(links[2].textContent).toBe('Docs');
  });
});

describe('splitTrailingPunctuation', () => {
  it('splits closing parentheses and sentence punctuation off a URL', () => {
    expect(splitTrailingPunctuation('https://a.org/x)')).toEqual(['https://a.org/x', ')']);
    expect(splitTrailingPunctuation('https://a.org/x).')).toEqual(['https://a.org/x', ').']);
    expect(splitTrailingPunctuation('https://a.org/x')).toEqual(['https://a.org/x', '']);
  });

  it('keeps a closing parenthesis the URL opened', () => {
    expect(splitTrailingPunctuation('https://a.org/A_(b)')).toEqual(['https://a.org/A_(b)', '']);
    expect(splitTrailingPunctuation('https://a.org/A_(b))')).toEqual(['https://a.org/A_(b)', ')']);
  });
});
