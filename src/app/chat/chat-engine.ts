import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { contextWindow, pickVariant, type ChatMessage, type ModelVariant } from './model';
import {
  deleteModel,
  deleteOutdated,
  inspectModel,
  type ModelCaches,
  type StoredModel,
} from './model-storage';
import type { ChatEvent, ChatRequest } from './protocol';

/** The worker as the engine uses it; tests hand in a stand-in. */
export interface ChatWorker {
  postMessage(request: ChatRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<ChatEvent>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

/** Starts the worker that runs the model. Its code, the model library, loads only then. */
export const CHAT_WORKER = new InjectionToken<() => ChatWorker>('CHAT_WORKER', {
  providedIn: 'root',
  factory: () => () =>
    new Worker(new URL('./chat.worker', import.meta.url), { type: 'module' }) as ChatWorker,
});

/**
 * Where the model is:
 * - `checking`: finding out what this device can do and what it already has
 * - `unsupported`: the browser can't run it
 * - `idle`: not in memory; it may or may not be stored on the device
 * - `loading`: being downloaded, or read from the device, and started
 * - `ready`: in memory, answering
 */
export type ModelPhase = 'checking' | 'unsupported' | 'idle' | 'loading' | 'ready';

/** What went wrong last, for the page to explain. */
export type ChatFailure = 'load' | 'generate' | 'delete';

/**
 * Runs the chat: the model's worker, what is stored on the device and the conversation. One
 * lives per chat page and ends with it, which is what frees the model's memory.
 */
@Injectable()
export class ChatEngine {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly startWorker = inject(CHAT_WORKER);
  private worker: ChatWorker | null = null;

  /** Which variant this device's GPU runs. */
  private readonly _preferred = signal<ModelVariant | null>(null);
  private readonly _phase = signal<ModelPhase>('checking');
  private readonly _stored = signal<StoredModel | null>(null);
  private readonly _progress = signal<{ loaded: number; total: number } | null>(null);
  private readonly _messages = signal<readonly ChatMessage[]>([]);
  private readonly _generating = signal(false);
  private readonly _failure = signal<ChatFailure | null>(null);
  private readonly _deleting = signal(false);

  readonly phase = this._phase.asReadonly();
  /** The model's files on this device, or null when there are none. */
  readonly stored = this._stored.asReadonly();
  /** Bytes fetched while loading; null before the first report. */
  readonly progress = this._progress.asReadonly();
  readonly messages = this._messages.asReadonly();
  /** An answer is being written. */
  readonly generating = this._generating.asReadonly();
  readonly failure = this._failure.asReadonly();
  readonly deleting = this._deleting.asReadonly();

  /** The variant in use: the one stored here, else the one this device should download. */
  readonly variant = computed(() => this._stored()?.variant ?? this._preferred());
  /** The weights are on the device, so loading needs no download. */
  readonly downloaded = computed(() => !!this._stored()?.variant);

  private get caches(): ModelCaches | undefined {
    return this.window?.caches;
  }

  /** Finds out whether the model can run here and what is already stored. Browser only. */
  async init(): Promise<void> {
    const gpu = this.window?.navigator.gpu;
    let adapter: GPUAdapter | null = null;
    try {
      adapter = (await gpu?.requestAdapter()) ?? null;
    } catch {
      // Treated like a browser without WebGPU.
    }
    if (!adapter || !this.caches) {
      this._phase.set('unsupported');
      return;
    }
    this._preferred.set(pickVariant(adapter.features));
    try {
      await deleteOutdated(this.caches);
    } catch {
      // They stay, and are counted in what the card says is stored, until the model is deleted.
    }
    await this.refreshStored();
    this._phase.set('idle');
  }

  /** Downloads the model, or reads it from the device, and starts it. */
  load(): void {
    const variant = this.variant();
    if (this._phase() !== 'idle' || !variant) return;
    this._failure.set(null);
    this._progress.set(null);
    this._phase.set('loading');
    // Asks the browser not to evict the download when space runs short; it may say no.
    void this.window?.navigator.storage?.persist?.().catch(() => false);

    const worker = this.startWorker();
    this.worker = worker;
    worker.onmessage = ({ data }) => this.handle(data);
    worker.onerror = () => this.fail('load');
    worker.postMessage({ type: 'load', dtype: variant.dtype });
  }

  /** Stops a download or a load. Files that arrived whole stay on the device. */
  async cancel(): Promise<void> {
    if (this._phase() !== 'loading') return;
    this.unload();
    await this.refreshStored();
  }

  /** Asks the model to answer `text`. */
  send(text: string): void {
    const content = text.trim();
    if (!content || this._phase() !== 'ready' || this._generating() || !this.worker) return;
    this._failure.set(null);
    const asked: ChatMessage[] = [...this._messages(), { role: 'user', content }];
    this._messages.set([...asked, { role: 'assistant', content: '' }]);
    this._generating.set(true);
    this.worker.postMessage({ type: 'generate', messages: contextWindow(asked) });
  }

  /** Ends the answer being written, keeping what there is of it. */
  stop(): void {
    if (this._generating()) this.worker?.postMessage({ type: 'stop' });
  }

  /** Forgets the conversation. */
  clear(): void {
    if (!this._generating()) this._messages.set([]);
  }

  /** Takes the model out of memory and off the device. */
  async deleteModel(): Promise<void> {
    if (this._deleting() || this._phase() === 'checking' || this._phase() === 'unsupported') return;
    this._deleting.set(true);
    this._failure.set(null);
    this.unload();
    try {
      if (this.caches) await deleteModel(this.caches);
    } catch {
      this._failure.set('delete');
    }
    // What is shown comes from the device, not from having asked.
    await this.refreshStored();
    this._deleting.set(false);
  }

  /** Ends the worker. The page calls this when it closes. */
  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private handle(event: ChatEvent): void {
    switch (event.type) {
      case 'progress':
        this._progress.set({ loaded: event.loaded, total: event.total });
        break;
      case 'ready':
        void this.becomeReady();
        break;
      case 'token':
        this.appendToAnswer(event.text);
        break;
      case 'done':
        this.finishAnswer();
        break;
      case 'error':
        this.fail(event.stage);
        break;
    }
  }

  /** Looks at the device before saying the model runs, so the card never shows a guess. */
  private async becomeReady(): Promise<void> {
    const worker = this.worker;
    await this.refreshStored();
    // Cancelled while looking.
    if (!worker || this.worker !== worker || this._phase() !== 'loading') return;
    this._progress.set(null);
    this._phase.set('ready');
  }

  private appendToAnswer(text: string): void {
    this._messages.update((messages) => {
      const answer = messages.at(-1);
      return answer?.role === 'assistant'
        ? [...messages.slice(0, -1), { ...answer, content: answer.content + text }]
        : messages;
    });
  }

  /**
   * An answer that never got a word is dropped, so the model isn't shown its own silence. Its
   * question stays in the conversation; `contextWindow()` leaves it out of what the model sees.
   */
  private finishAnswer(): void {
    this._generating.set(false);
    this._messages.update((messages) => {
      const answer = messages.at(-1);
      return answer?.role === 'assistant' && !answer.content.trim()
        ? messages.slice(0, -1)
        : messages;
    });
  }

  /**
   * A model that failed to start, or a worker that died, is gone. One that failed in the middle
   * of an answer (its GPU was taken away, memory ran out) would most likely fail the next one
   * too, with no way to start it again. Either way: end it and start over from idle.
   */
  private fail(stage: 'load' | 'generate'): void {
    this._failure.set(stage);
    this.unload();
    void this.refreshStored();
  }

  /** Ends the worker, which frees the model's memory, and returns to idle. */
  private unload(): void {
    this.destroy();
    if (this._generating()) this.finishAnswer();
    this._progress.set(null);
    this._phase.set('idle');
  }

  private async refreshStored(): Promise<void> {
    try {
      this._stored.set(this.caches ? await inspectModel(this.caches) : null);
    } catch {
      this._stored.set(null);
    }
  }
}
