import type { ModelCaches } from './model-storage';

/**
 * Cache Storage held in memory, for tests: jsdom has none. Only what the chat uses of it.
 * `failDelete` makes deleting throw, as a browser may when its storage is in trouble.
 */
export class FakeCaches implements ModelCaches {
  readonly stores = new Map<string, Map<string, Response>>();
  failDelete = false;

  /** Stores a file of `bytes` bytes under `url`, as the model's library would. */
  put(cache: string, url: string, bytes: number, declareLength = true): void {
    const store = this.stores.get(cache) ?? new Map<string, Response>();
    const headers = declareLength ? { 'content-length': String(bytes) } : undefined;
    store.set(url, new Response('x'.repeat(bytes), { headers }));
    this.stores.set(cache, store);
  }

  async has(cache: string): Promise<boolean> {
    return this.stores.has(cache);
  }

  async open(cache: string): Promise<Cache> {
    const store = this.stores.get(cache) ?? new Map<string, Response>();
    this.stores.set(cache, store);
    return {
      keys: async () => [...store.keys()].map((url) => ({ url }) as Request),
      match: async (request: Request) => store.get(request.url)?.clone(),
      delete: async (request: Request) => store.delete(request.url),
    } as unknown as Cache;
  }

  async delete(cache: string): Promise<boolean> {
    if (this.failDelete) throw new Error('Storage is unavailable');
    return this.stores.delete(cache);
  }
}
