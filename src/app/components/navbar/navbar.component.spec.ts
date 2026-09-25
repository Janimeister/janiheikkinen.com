import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, provideRouter, Router } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { LanguageService } from '../../i18n/language.service';

@Component({ template: '' })
class TestPage {}

describe('NavbarComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([{ path: '**', component: TestPage }])],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog')!;
    // jsdom has no modal dialog implementation; browser behavior is covered in e2e.
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    return { fixture, element, dialog, component: fixture.componentInstance };
  }

  it('renders a compact header with a home link, language controls and Explore', () => {
    const { element } = setup();
    expect(element.querySelectorAll('nav a')).toHaveLength(1);
    expect(element.querySelector('nav a')?.getAttribute('href')).toBe('/');
    expect(element.querySelector('nav app-language-toggle')).toBeTruthy();
    expect(element.querySelector('.explore-button')?.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('opens, focuses search, locks scrolling, and restores focus and scrolling on close', () => {
    const { fixture, element, component, dialog } = setup();
    const trigger = element.querySelector<HTMLButtonElement>('.explore-button')!;
    document.documentElement.style.overflow = 'auto';
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(element.querySelector('input'));
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    component.close();
    fixture.detectChanges();
    expect(document.activeElement).toBe(trigger);
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    document.documentElement.style.overflow = '';
  });

  it('filters results by keywords and shows a no-results message', () => {
    const { fixture, element, component } = setup();
    component.open();
    const search = element.querySelector('input')!;
    search.value = '  MERGE  ';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelectorAll('dialog a')).toHaveLength(1);
    expect(element.querySelector('dialog a')?.getAttribute('href')).toBe('/sorting');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('1 matching pages');
    component.query.set('no-such-page');
    fixture.detectChanges();
    expect(element.querySelectorAll('dialog a')).toHaveLength(0);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('No matching pages');
    component.close();
    component.open();
    fixture.detectChanges();
    expect(search.value).toBe('');
    expect(element.querySelectorAll('dialog a')).toHaveLength(10);
  });

  it('reacts to language changes in labels, groups, and search', () => {
    const { fixture, element, component } = setup();
    component.open();
    TestBed.inject(LanguageService).setLanguage('fi');
    component.query.set('eläin');
    fixture.detectChanges();
    expect(element.querySelector('.explore-button')?.textContent).toContain('Tutustu');
    expect(element.querySelector('dialog h3')?.textContent).toBe('Pelit');
    expect(element.querySelectorAll('dialog a')).toHaveLength(1);
    expect(element.querySelector('dialog a')?.getAttribute('href')).toBe('/pet');
  });

  it('opens with either keyboard shortcut and cancels cleanly', () => {
    const { component } = setup();
    for (const modifier of ['ctrlKey', 'metaKey']) {
      const shortcut = new KeyboardEvent('keydown', {
        key: 'k',
        [modifier]: true,
        cancelable: true,
      });
      component.onShortcut(shortcut);
      expect(component.isOpen()).toBe(true);
      expect(shortcut.defaultPrevented).toBe(true);
      const cancel = new Event('cancel', { cancelable: true });
      component.onCancel(cancel);
      expect(cancel.defaultPrevented).toBe(true);
      expect(component.isOpen()).toBe(false);
    }
  });

  it('updates the current page on direct navigation and closes after navigation', async () => {
    const { fixture, element, component } = setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/sorting?size=20#chart');
    fixture.detectChanges();
    expect(element.querySelector('.current-location')?.textContent).toBe('Sorting Algorithms');
    expect(element.querySelector('a[href="/sorting"]')?.getAttribute('aria-current')).toBe('page');
    component.open();
    await router.navigateByUrl('/third-party-notices');
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
    expect(element.querySelector('.current-location')?.textContent).toBe('Third-Party Notices');
  });

  it('keeps the launcher open if it was opened while a page was still loading', async () => {
    const { component } = setup();
    const router = TestBed.inject(Router);
    const subscription = router.events.subscribe((event) => {
      if (event instanceof NavigationStart) component.open();
    });
    await router.navigateByUrl('/weather');
    subscription.unsubscribe();
    expect(component.isOpen()).toBe(true);
  });

  it('only dismisses ordinary link clicks, preserving modified-click behavior', () => {
    const { fixture, element, component } = setup();
    component.open();
    fixture.detectChanges();
    const home = element.querySelector<HTMLAnchorElement>('dialog a[href="/"]')!;
    home.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true, cancelable: true }));
    expect(component.isOpen()).toBe(true);
    home.click();
    expect(component.isOpen()).toBe(false);
  });

  it('surprises with an experiment or game other than the current page', async () => {
    const { component } = setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/ascii');
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.surprise();
    expect(['/sorting', '/searching', '/pathfinding', '/snake', '/pet']).toContain(
      navigate.mock.calls[0][0],
    );
  });

  it('restores scrolling when destroyed while open', () => {
    const { fixture, component } = setup();
    component.open();
    fixture.destroy();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
