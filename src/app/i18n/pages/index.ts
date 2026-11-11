// Type-only imports: the English copy is bundled with each page, not with this file.
import type { WEATHER_EN } from './weather.en';
import type { ELECTRICITY_EN } from './electricity.en';
import type { TRAMS_EN } from './trams.en';
import type { DEPARTURES_EN } from './departures.en';
import type { GITHUB_EN } from './github.en';
import type { ASCII_EN } from './ascii.en';
import type { SNAKE_EN } from './snake.en';
import type { PET_EN } from './pet.en';
import type { SORTING_EN } from './sorting.en';
import type { SEARCHING_EN } from './searching.en';
import type { PATHFINDING_EN } from './pathfinding.en';
import type { Dictionary } from '../translations';

export type PageTranslationKey =
  | keyof typeof WEATHER_EN
  | keyof typeof ELECTRICITY_EN
  | keyof typeof TRAMS_EN
  | keyof typeof DEPARTURES_EN
  | keyof typeof GITHUB_EN
  | keyof typeof ASCII_EN
  | keyof typeof SNAKE_EN
  | keyof typeof PET_EN
  | keyof typeof SORTING_EN
  | keyof typeof SEARCHING_EN
  | keyof typeof PATHFINDING_EN;

/** Finnish page copy by page path, fetched the first time that page opens in Finnish. */
export const FI_PAGE_LOADERS: Readonly<Partial<Record<string, () => Promise<Dictionary>>>> = {
  weather: () => import('./weather.fi').then((m) => m.WEATHER_FI),
  electricity: () => import('./electricity.fi').then((m) => m.ELECTRICITY_FI),
  trams: () => import('./trams.fi').then((m) => m.TRAMS_FI),
  departures: () => import('./departures.fi').then((m) => m.DEPARTURES_FI),
  github: () => import('./github.fi').then((m) => m.GITHUB_FI),
  ascii: () => import('./ascii.fi').then((m) => m.ASCII_FI),
  snake: () => import('./snake.fi').then((m) => m.SNAKE_FI),
  pet: () => import('./pet.fi').then((m) => m.PET_FI),
  sorting: () => import('./sorting.fi').then((m) => m.SORTING_FI),
  searching: () => import('./searching.fi').then((m) => m.SEARCHING_FI),
  pathfinding: () => import('./pathfinding.fi').then((m) => m.PATHFINDING_FI),
};
