import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { WeatherPageComponent } from './pages/weather.component';
import { ElectricityPageComponent } from './pages/electricity.component';
import { GithubPageComponent } from './pages/github.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'weather', component: WeatherPageComponent },
  { path: 'electricity', component: ElectricityPageComponent },
  { path: 'github', component: GithubPageComponent },
  { path: '**', redirectTo: '' },
];
