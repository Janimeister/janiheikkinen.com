import { MODEL_CACHE, MODEL_ID, MODEL_REVISION, MODEL_VARIANTS, type ModelVariant } from './model';

/** What of the model is on this device. */
export interface StoredModel {
  /** How much space its files take. */
  bytes: number;
  /** The variant whose weights are here; null when only smaller files made it. */
  variant: ModelVariant | null;
}

/** The part of the browser's Cache Storage this needs, so tests can stand in for it. */
export type ModelCaches = Pick<CacheStorage, 'has' | 'open' | 'delete'>;

/** Every file of the model, whichever revision it came from. */
const isModelFile = ({ url }: Request) => url.includes(`/${MODEL_ID}/`);
/** A file of the revision this site runs: the only ones the model's library reads. */
const isCurrentFile = ({ url }: Request) => url.includes(`/${MODEL_ID}/resolve/${MODEL_REVISION}/`);

async function size(response: Response | undefined): Promise<number> {
  if (!response) return 0;
  const declared = Number(response.headers.get('content-length'));
  return declared > 0 ? declared : (await response.blob()).size;
}

/**
 * Looks at what the browser has kept of the model, without loading any of it. A file is only
 * stored once it has arrived whole, so weights that are here are complete. Only weights of
 * the revision this site runs count as the model being here; any other file still takes space.
 */
export async function inspectModel(caches: ModelCaches): Promise<StoredModel | null> {
  if (!(await caches.has(MODEL_CACHE))) return null;
  const cache = await caches.open(MODEL_CACHE);
  const files = (await cache.keys()).filter(isModelFile);
  if (!files.length) return null;

  const sizes = await Promise.all(files.map(async (file) => size(await cache.match(file))));
  const current = files.filter(isCurrentFile);
  const variant =
    MODEL_VARIANTS.find(({ weights }) => current.some(({ url }) => url.endsWith(`/${weights}`))) ??
    null;
  return { bytes: sizes.reduce((sum, bytes) => sum + bytes, 0), variant };
}

/**
 * Removes the files of revisions this site no longer runs. After `MODEL_REVISION` changes
 * nothing reads them, and they would take their space until the model was deleted.
 */
export async function deleteOutdated(caches: ModelCaches): Promise<void> {
  if (!(await caches.has(MODEL_CACHE))) return;
  const cache = await caches.open(MODEL_CACHE);
  const outdated = (await cache.keys()).filter((file) => isModelFile(file) && !isCurrentFile(file));
  await Promise.all(outdated.map((file) => cache.delete(file)));
}

/** Removes everything the model's library stored. The cache holds nothing else. */
export async function deleteModel(caches: ModelCaches): Promise<void> {
  await caches.delete(MODEL_CACHE);
}
