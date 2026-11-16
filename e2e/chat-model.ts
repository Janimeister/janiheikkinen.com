import type { Page } from '@playwright/test';

/** What the stand-in model does. */
export interface ChatModelOptions {
  /**
   * The model is already on the device, as on a later visit. Reloading can't show that:
   * WebKit's throwaway test profile empties Cache Storage on every page load.
   */
  stored?: boolean;
  /** Holds the download at a quarter until the test lets it go on (see `finishDownload`). */
  holdDownload?: boolean;
  /** The model fails to start. */
  failLoad?: boolean;
  /** Holds each answer after its first word until the page asks it to stop. */
  holdAnswer?: boolean;
}

/** The answer the stand-in gives to everything. */
export const ANSWER = 'The capital of France is Paris.';

/** The size of the plain 4-bit variant, the one a GPU without 16-bit floats gets. */
const MODEL_BYTES = 343_502_950;

/**
 * Stands in for WebGPU and for the worker that runs the model, so no test downloads 344 MB
 * from Hugging Face or needs a GPU. It speaks the worker's protocol
 * (`src/app/chat/protocol.ts`) and stores a token file in the real Cache Storage where the
 * model's library would put the weights, so storage and deletion are tested for real.
 */
export async function mockChatModel(page: Page, options: ChatModelOptions = {}): Promise<void> {
  await page.addInitScript(
    ({ options, answer, bytes }) => {
      const weights =
        'https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX/resolve/test/onnx/model_q4.onnx_data';
      const state = window as unknown as { releaseDownload?: () => void };

      const store = async () => {
        const cache = await caches.open('transformers-cache');
        await cache.put(
          weights,
          new Response('weights', { headers: { 'content-length': String(bytes) } }),
        );
      };
      const seeded = options.stored ? store() : Promise.resolve();

      Object.defineProperty(navigator, 'gpu', {
        configurable: true,
        value: {
          // The page asks for the GPU before it looks at what is stored, so it sees the seed.
          requestAdapter: async () => {
            await seeded;
            return { features: new Set<string>() };
          },
        },
      });

      class FakeModelWorker {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        private ended = false;
        private stopAnswer: (() => void) | null = null;

        private say(data: unknown): void {
          if (!this.ended) this.onmessage?.({ data });
        }

        postMessage(request: { type: string }): void {
          if (request.type === 'load') void this.load();
          else if (request.type === 'generate') void this.generate();
          else this.stopAnswer?.();
        }

        terminate(): void {
          this.ended = true;
        }

        private async load(): Promise<void> {
          this.say({ type: 'progress', loaded: bytes / 4, total: bytes });
          if (options.holdDownload) {
            await new Promise<void>((resolve) => (state.releaseDownload = resolve));
          }
          if (options.failLoad) {
            this.say({ type: 'error', stage: 'load', message: 'Out of memory' });
            return;
          }
          if (this.ended) return;
          await store();
          this.say({ type: 'progress', loaded: bytes, total: bytes });
          this.say({ type: 'ready' });
        }

        private async generate(): Promise<void> {
          const [first, ...rest] = answer.split(/(?= )/);
          this.say({ type: 'token', text: first });
          if (options.holdAnswer) {
            await new Promise<void>((resolve) => (this.stopAnswer = resolve));
          } else {
            for (const word of rest) this.say({ type: 'token', text: word });
          }
          this.say({ type: 'done' });
        }
      }

      (window as unknown as { Worker: unknown }).Worker = FakeModelWorker;
    },
    { options, answer: ANSWER, bytes: MODEL_BYTES },
  );
}

/** Lets a download held by `holdDownload` run to its end. */
export async function finishDownload(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { releaseDownload(): void }).releaseDownload());
}

/** The names of the caches the page's origin holds. */
export function cacheNames(page: Page): Promise<string[]> {
  return page.evaluate(() => caches.keys());
}
