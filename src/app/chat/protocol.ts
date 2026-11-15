import type { ChatMessage, ModelVariant } from './model';

/** What the page asks of the worker that runs the model. */
export type ChatRequest =
  /** Fetch the model (from the browser's cache when it is there) and get it ready. */
  | { type: 'load'; dtype: ModelVariant['dtype'] }
  /** Answer the conversation so far. */
  | { type: 'generate'; messages: ChatMessage[] }
  /** Stop the answer being written. */
  | { type: 'stop' };

/** What the worker tells the page. */
export type ChatEvent =
  /** Bytes fetched so far, over every file of the model. */
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  /** The next piece of the answer. */
  | { type: 'token'; text: string }
  /** The answer is complete, or was stopped. */
  | { type: 'done' }
  | { type: 'error'; stage: 'load' | 'generate'; message: string };
