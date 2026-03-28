import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeroComponent } from '../components/hero/hero.component';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroComponent],
  template: `<app-hero />`,
  styles: `:host { display: flex; flex-direction: column; flex: 1; } app-hero { display: flex; flex-direction: column; flex: 1; }`,
})
export class HomeComponent {}
