import { MODEL_CACHE, MODEL_ID, MODEL_VARIANTS, type ModelVariant } from './model';

/** What of the model is on this device. */
export interface StoredModel {
  /** How much space its files take. */
  bytes: number;
  /** The variant whose weights are here; null when only smaller files made it. */
  variant: ModelVariant | null;
}

/** The part of the browser's Cache Storage this needs, so tests can stand in for it. */
export type ModelCaches = Pick<CacheStorage, 'has' | 'open' | 'delete'>;

async function size(response: Response | undefined): Promise<number> {
  if (!response) return 0;
  const declared = Number(response.headers.get('content-length'));
  return declared > 0 ? declared : (await response.blob()).size;
}

/**
 * Looks at what the browser has kept of the model, without loading any of it. A file is only
 * stored once it has arrived whole, so weights that are here are complete.
 */
export async function inspectModel(caches: ModelCaches): Promise<StoredModel | null> {
  if (!(await caches.has(MODEL_CACHE))) return null;
  const cache = await caches.open(MODEL_CACHE);
  const files = (await cache.keys()).filter(({ url }) => url.includes(`/${MODEL_ID}/`));
  if (!files.length) return null;

  const sizes = await Promise.all(files.map(async (file) => size(await cache.match(file))));
  const variant =
    MODEL_VARIANTS.find(({ weights }) => files.some(({ url }) => url.endsWith(`/${weights}`))) ??
    null;
  return { bytes: sizes.reduce((sum, bytes) => sum + bytes, 0), variant };
}

/** Removes everything the model's library stored. The cache holds nothing else. */
export async function deleteModel(caches: ModelCaches): Promise<void> {
  await caches.delete(MODEL_CACHE);
}
