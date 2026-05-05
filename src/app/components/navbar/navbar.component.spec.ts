import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have correct nav links', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    expect(component.navLinks).toHaveLength(7);
    expect(component.navLinks[0]).toEqual({ label: 'Home', route: '/' });
    expect(component.navLinks[1]).toEqual({ label: 'Weather', route: '/weather' });
    expect(component.navLinks[2]).toEqual({ label: 'Electricity', route: '/electricity' });
    expect(component.navLinks[3]).toEqual({ label: 'GitHub', route: '/github' });
    expect(component.navLinks[4]).toEqual({ label: 'ASCII', route: '/ascii' });
    expect(component.navLinks[5]).toEqual({ label: 'Snake', route: '/snake' });
    expect(component.navLinks[6]).toEqual({ label: 'Pet', route: '/pet' });
  });

  it('should render all nav links in template', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a');
    // logo + 7 nav links = 8
    expect(links.length).toBe(8);
  });

  it('should start with scrolled=false', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    expect(fixture.componentInstance.scrolled()).toBe(false);
  });

  it('should set scrolled when onScroll is called', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    // Define once as configurable+writable so the value can be changed between assertions
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
    component.onScroll();
    expect(component.scrolled()).toBe(true);

    (window as Window & { scrollY: number }).scrollY = 10;
    component.onScroll();
    expect(component.scrolled()).toBe(false);
  });
});
