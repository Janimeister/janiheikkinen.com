import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },
  { path: 'weather', loadComponent: () => import('./pages/weather.component').then(m => m.WeatherPageComponent) },
  { path: 'electricity', loadComponent: () => import('./pages/electricity.component').then(m => m.ElectricityPageComponent) },
  { path: 'github', loadComponent: () => import('./pages/github.component').then(m => m.GithubPageComponent) },
  { path: 'ascii', loadComponent: () => import('./pages/ascii.component').then(m => m.AsciiPageComponent) },
  { path: '**', redirectTo: '' },
];
