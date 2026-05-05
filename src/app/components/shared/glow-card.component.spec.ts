import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { GlowCardComponent } from './glow-card.component';

@Component({
  imports: [GlowCardComponent],
  template: `<app-glow-card><span class="projected-content">projected text</span></app-glow-card>`,
})
class TestHostComponent {}

describe('GlowCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlowCardComponent, TestHostComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(GlowCardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a glow-card div', () => {
    const fixture = TestBed.createComponent(GlowCardComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.glow-card');
    expect(card).toBeTruthy();
  });

  it('should apply extra class when provided', () => {
    const fixture = TestBed.createComponent(GlowCardComponent);
    fixture.componentRef.setInput('extraClass', 'my-custom-class');
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.glow-card');
    expect(card.classList.contains('my-custom-class')).toBe(true);
  });

  it('should project content via ng-content', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const projected = fixture.nativeElement.querySelector('.projected-content');
    expect(projected).toBeTruthy();
    expect(projected.textContent).toBe('projected text');
  });
});
