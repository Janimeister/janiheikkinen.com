/// <reference lib="webworker" />
import {
  env,
  InterruptableStoppingCriteria,
  pipeline,
  TextStreamer,
  type ProgressInfo,
  type TextGenerationPipeline,
} from '@huggingface/transformers';
import { MODEL_ID, MODEL_REVISION } from './model';
import type { ChatEvent, ChatRequest } from './protocol';

// The model runs here, off the page's thread, so typing and scrolling stay smooth while it
// thinks. Ending this worker is also how the page frees the model's memory.

/** The longest answer, in tokens: a few paragraphs. */
const MAX_NEW_TOKENS = 512;

// The ONNX runtime is served by this site (see the `ort` assets in angular.json) instead of the
// CDN the library would use, so the model's files are the only thing fetched from elsewhere.
const runtime = new URL('/ort/', self.location.origin).href;
env.backends.onnx.wasm!.wasmPaths = {
  mjs: `${runtime}ort-wasm-simd-threaded.asyncify.mjs`,
  wasm: `${runtime}ort-wasm-simd-threaded.asyncify.wasm`,
};
// The browser's HTTP cache already keeps the runtime; the model's cache holds the model alone.
env.useWasmCache = false;
env.allowLocalModels = false;

const send = (event: ChatEvent) => self.postMessage(event);
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

let generator: TextGenerationPipeline | undefined;
const stopping = new InterruptableStoppingCriteria();

async function load(dtype: 'q4f16' | 'q4'): Promise<void> {
  try {
    generator = await pipeline('text-generation', MODEL_ID, {
      device: 'webgpu',
      dtype,
      revision: MODEL_REVISION,
      progress_callback: (info: ProgressInfo) => {
        if (info.status === 'progress_total') {
          send({ type: 'progress', loaded: info.loaded, total: info.total });
        }
      },
    });
    send({ type: 'ready' });
  } catch (error) {
    send({ type: 'error', stage: 'load', message: reason(error) });
  }
}

async function generate(messages: Extract<ChatRequest, { type: 'generate' }>['messages']) {
  if (!generator) {
    send({ type: 'error', stage: 'generate', message: 'The model is not loaded' });
    return;
  }
  stopping.reset();
  try {
    await generator(messages, {
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: true,
      streamer: new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => send({ type: 'token', text }),
      }),
      stopping_criteria: stopping,
    });
    send({ type: 'done' });
  } catch (error) {
    send({ type: 'error', stage: 'generate', message: reason(error) });
  }
}

self.addEventListener('message', ({ data }: MessageEvent<ChatRequest>) => {
  if (data.type === 'load') void load(data.dtype);
  else if (data.type === 'generate') void generate(data.messages);
  else stopping.interrupt();
});
