import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render navbar, main content area, and footer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
    expect(compiled.querySelector('main')).toBeTruthy();
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });

  it('should render cookie notice', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-cookie-notice')).toBeTruthy();
  });

  it('should render router outlet inside main', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main');
    expect(main.querySelector('router-outlet')).toBeTruthy();
  });

  it('should have full-height flex column layout with footer pushed to bottom', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const main = host.querySelector('main') as HTMLElement;
    // Verify structural layout: navbar → main (flex-1) → footer as direct children
    const children = Array.from(host.children).map(el => el.tagName.toLowerCase());
    expect(children).toContain('app-navbar');
    expect(children).toContain('main');
    expect(children).toContain('app-footer');
    expect(children.indexOf('app-navbar')).toBeLessThan(children.indexOf('main'));
    expect(children.indexOf('main')).toBeLessThan(children.indexOf('app-footer'));
    // main must carry flex-1 so it fills the flex container and pushes the footer down
    expect(main.classList.contains('flex-1')).toBe(true);
  });
});
