import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CookieNoticeComponent } from './cookie-notice.component';

describe('CookieNoticeComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [CookieNoticeComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be visible when no consent stored', async () => {
    await TestBed.configureTestingModule({
      imports: [CookieNoticeComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    expect(fixture.componentInstance.visible()).toBe(true);
  });

  it('should not be visible when consent is already stored', async () => {
    localStorage.setItem('cookie-consent', 'accepted');
    await TestBed.configureTestingModule({
      imports: [CookieNoticeComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('should hide and store consent when accept is called', async () => {
    await TestBed.configureTestingModule({
      imports: [CookieNoticeComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    const component = fixture.componentInstance;
    expect(component.visible()).toBe(true);

    component.accept();

    expect(component.visible()).toBe(false);
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
  });

  it('should render the accept button when visible', async () => {
    await TestBed.configureTestingModule({
      imports: [CookieNoticeComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(CookieNoticeComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.textContent.trim()).toBe('Got it');
  });
});
