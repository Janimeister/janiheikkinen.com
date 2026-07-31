import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Jani Heikkinen', loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },
  { path: 'weather', title: 'Weather · Jani Heikkinen', loadComponent: () => import('./pages/weather.component').then(m => m.WeatherPageComponent) },
  { path: 'electricity', title: 'Electricity Prices · Jani Heikkinen', loadComponent: () => import('./pages/electricity.component').then(m => m.ElectricityPageComponent) },
  { path: 'github', title: 'GitHub Profile · Jani Heikkinen', loadComponent: () => import('./pages/github.component').then(m => m.GithubPageComponent) },
  { path: 'ascii', title: 'ASCII Art · Jani Heikkinen', loadComponent: () => import('./pages/ascii.component').then(m => m.AsciiArtPageComponent) },
  { path: 'snake', title: 'Snake Game · Jani Heikkinen', loadComponent: () => import('./pages/snake.component').then(m => m.SnakePageComponent) },
  { path: 'pet', title: 'Virtual Pet · Jani Heikkinen', loadComponent: () => import('./pages/pet.component').then(m => m.PetPageComponent) },
  { path: 'third-party-notices', title: 'Third-Party Notices · Jani Heikkinen', loadComponent: () => import('./pages/third-party-notices.component').then(m => m.ThirdPartyNoticesComponent) },
  { path: '**', redirectTo: '' },
];
