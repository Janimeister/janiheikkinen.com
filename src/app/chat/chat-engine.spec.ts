import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CHAT_WORKER, ChatEngine, type ChatWorker } from './chat-engine';
import { FakeCaches } from './fake-caches';
import { MODEL_CACHE, MODEL_ID, MODEL_REVISION } from './model';
import type { ChatEvent, ChatRequest } from './protocol';

const WEIGHTS = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/onnx/model_q4.onnx_data`;

/** The model's worker, played by the test: it records what it is asked and says what it's told. */
class FakeWorker implements ChatWorker {
  readonly requests: ChatRequest[] = [];
  terminated = false;
  onmessage: ((event: MessageEvent<ChatEvent>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(request: ChatRequest): void {
    this.requests.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  say(event: ChatEvent): void {
    this.onmessage?.({ data: event } as MessageEvent<ChatEvent>);
  }
}

describe('ChatEngine', () => {
  let caches: FakeCaches;
  let workers: FakeWorker[];
  let engine: ChatEngine;
  const browser = () => document.defaultView!;

  function setGpu(features: string[] | null): void {
    Object.defineProperty(browser().navigator, 'gpu', {
      configurable: true,
      value: features && { requestAdapter: async () => ({ features: new Set(features) }) },
    });
  }

  beforeEach(() => {
    caches = new FakeCaches();
    workers = [];
    Object.defineProperty(browser(), 'caches', { configurable: true, value: caches });
    setGpu([]);
    TestBed.configureTestingModule({
      providers: [
        ChatEngine,
        {
          provide: CHAT_WORKER,
          useValue: () => {
            workers.push(new FakeWorker());
            return workers.at(-1)!;
          },
        },
      ],
    });
    engine = TestBed.inject(ChatEngine);
  });

  afterEach(() => {
    Reflect.deleteProperty(browser().navigator, 'gpu');
    Reflect.deleteProperty(browser(), 'caches');
  });

  /** Gets the model running, as a visitor who downloads it would. */
  async function start(): Promise<FakeWorker> {
    await engine.init();
    engine.load();
    const worker = workers.at(-1)!;
    caches.put(MODEL_CACHE, WEIGHTS, 500);
    worker.say({ type: 'ready' });
    await Promise.resolve();
    return worker;
  }

  it('cannot run without WebGPU', async () => {
    setGpu(null);

    await engine.init();

    expect(engine.phase()).toBe('unsupported');
  });

  it('starts idle with nothing stored and nothing downloaded', async () => {
    expect(engine.phase()).toBe('checking');

    await engine.init();

    expect(engine.phase()).toBe('idle');
    expect(engine.stored()).toBeNull();
    expect(engine.downloaded()).toBe(false);
    expect(workers).toHaveLength(0);
  });

  it('asks for the variant the GPU can run', async () => {
    setGpu(['shader-f16']);
    await engine.init();
    expect(engine.variant()?.dtype).toBe('q4f16');

    engine.load();

    expect(workers[0].requests).toEqual([{ type: 'load', dtype: 'q4f16' }]);
  });

  it('uses the variant already on the device, whatever the GPU prefers', async () => {
    setGpu(['shader-f16']);
    caches.put(MODEL_CACHE, WEIGHTS, 500);

    await engine.init();

    expect(engine.downloaded()).toBe(true);
    expect(engine.variant()?.dtype).toBe('q4');
  });

  it('reports the download and becomes ready', async () => {
    await engine.init();
    engine.load();
    expect(engine.phase()).toBe('loading');

    workers[0].say({ type: 'progress', loaded: 50, total: 200 });
    expect(engine.progress()).toEqual({ loaded: 50, total: 200 });

    caches.put(MODEL_CACHE, WEIGHTS, 500);
    workers[0].say({ type: 'ready' });
    await Promise.resolve();

    expect(engine.phase()).toBe('ready');
    expect(engine.progress()).toBeNull();
    await expect.poll(() => engine.stored()?.bytes).toBe(500);
  });

  it('cancels a download by ending the worker', async () => {
    await engine.init();
    engine.load();

    await engine.cancel();

    expect(workers[0].terminated).toBe(true);
    expect(engine.phase()).toBe('idle');
    expect(engine.failure()).toBeNull();
  });

  it('returns to idle with an explanation when the model fails to start', async () => {
    await engine.init();
    engine.load();

    workers[0].say({ type: 'error', stage: 'load', message: 'Out of memory' });

    expect(engine.phase()).toBe('idle');
    expect(engine.failure()).toBe('load');
    expect(workers[0].terminated).toBe(true);

    engine.load();
    expect(engine.failure()).toBeNull();
    expect(workers).toHaveLength(2);
  });

  it('sends the conversation and writes the answer as it arrives', async () => {
    const worker = await start();

    engine.send('  Hello  ');

    expect(worker.requests.at(-1)).toEqual({
      type: 'generate',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(engine.generating()).toBe(true);
    expect(engine.messages().at(-1)).toEqual({ role: 'assistant', content: '' });

    worker.say({ type: 'token', text: 'Hi' });
    worker.say({ type: 'token', text: ' there' });
    worker.say({ type: 'done' });

    expect(engine.generating()).toBe(false);
    expect(engine.messages()).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]);

    engine.send('And again');
    expect(worker.requests.at(-1)).toEqual({
      type: 'generate',
      messages: [...engine.messages().slice(0, 3)],
    });
  });

  it('ignores empty messages and messages sent while it is answering', async () => {
    const worker = await start();
    const asked = () => worker.requests.filter((request) => request.type === 'generate').length;

    engine.send('   ');
    expect(asked()).toBe(0);

    engine.send('One');
    engine.send('Two');
    expect(asked()).toBe(1);
  });

  it('stops an answer and keeps what was written', async () => {
    const worker = await start();
    engine.send('Tell me a story');
    worker.say({ type: 'token', text: 'Once' });

    engine.stop();
    expect(worker.requests.at(-1)).toEqual({ type: 'stop' });
    worker.say({ type: 'done' });

    expect(engine.messages().at(-1)).toEqual({ role: 'assistant', content: 'Once' });
    expect(engine.generating()).toBe(false);
  });

  it('drops an answer that failed before its first word, and stays ready', async () => {
    const worker = await start();
    engine.send('Hello');

    worker.say({ type: 'error', stage: 'generate', message: 'Device lost' });

    expect(engine.failure()).toBe('generate');
    expect(engine.phase()).toBe('ready');
    expect(engine.messages()).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('clears the conversation, but not while answering', async () => {
    const worker = await start();
    engine.send('Hello');

    engine.clear();
    expect(engine.messages()).toHaveLength(2);

    worker.say({ type: 'token', text: 'Hi' });
    worker.say({ type: 'done' });
    engine.clear();
    expect(engine.messages()).toEqual([]);
  });

  it('deletes the model from memory and from the device', async () => {
    const worker = await start();
    await expect.poll(() => engine.downloaded()).toBe(true);

    await engine.deleteModel();

    expect(worker.terminated).toBe(true);
    expect(caches.stores.size).toBe(0);
    expect(engine.stored()).toBeNull();
    expect(engine.phase()).toBe('idle');
    expect(engine.deleting()).toBe(false);
  });

  it('says so when deleting fails, and still shows what is on the device', async () => {
    await start();
    caches.failDelete = true;

    await engine.deleteModel();

    expect(engine.failure()).toBe('delete');
    expect(engine.stored()?.bytes).toBe(500);
    expect(engine.phase()).toBe('idle');
  });

  it('treats a worker that dies as a model that has to be started again', async () => {
    const worker = await start();
    engine.send('Hello');

    worker.onerror?.(new ErrorEvent('error'));

    expect(engine.phase()).toBe('idle');
    expect(engine.failure()).toBe('load');
    expect(engine.generating()).toBe(false);
  });
});
