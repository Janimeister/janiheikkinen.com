import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CookieNoticeComponent } from './cookie-notice.component';

describe('CookieNoticeComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CookieNoticeComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be visible when no consent stored', () => {
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    expect(fixture.componentInstance.visible()).toBe(true);
  });

  it('should not be visible when consent is already stored', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('should hide and store consent when accept is called', () => {
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    const component = fixture.componentInstance;
    expect(component.visible()).toBe(true);

    component.accept();

    expect(component.visible()).toBe(false);
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
  });

  it('should render the accept button when visible', () => {
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.textContent.trim()).toBe('Got it');
  });
});
