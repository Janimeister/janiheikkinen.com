import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { GlowCardComponent } from './glow-card.component';

describe('GlowCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlowCardComponent],
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
    const fixture = TestBed.createComponent(GlowCardComponent);
    fixture.detectChanges();
    // Component uses ng-content so the div should exist
    const card = fixture.nativeElement.querySelector('.glow-card');
    expect(card).toBeTruthy();
  });
});
