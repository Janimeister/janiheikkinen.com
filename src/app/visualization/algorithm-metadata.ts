import type { TranslationKey } from '../i18n/translations';

export type VisualizerCategory = 'sorting' | 'searching' | 'pathfinding';

export interface ComplexityCases {
  readonly best: string;
  readonly average: string;
  readonly worst: string;
}

/** Shared catalog fields used by every visualizer's declarative algorithm list. */
export interface AlgorithmMetadata<Category extends VisualizerCategory> {
  readonly id: string;
  readonly category: Category;
  readonly nameKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly time: string | ComplexityCases;
  readonly space: string;
  readonly requirements: readonly TranslationKey[];
  readonly characteristics?: readonly TranslationKey[];
  readonly stable?: boolean;
  readonly inPlace?: boolean;
}
