import { Component } from '@angular/core';
import { HeroComponent } from '../components/hero/hero.component';

@Component({
  selector: 'app-home',
  imports: [HeroComponent],
  template: `<app-hero />`,
  styles: `:host { display: flex; flex-direction: column; flex: 1; } app-hero { display: flex; flex-direction: column; flex: 1; }`,
})
export class HomeComponent {}
