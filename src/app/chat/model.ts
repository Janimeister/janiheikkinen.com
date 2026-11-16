/**
 * The model the chat runs: Gemma 3 270M, converted to ONNX for the browser. Its files are far
 * too big for the site's own hosting, so the visitor's browser fetches them from Hugging Face,
 * and only after the visitor asks for them.
 */
export const MODEL_ID = 'onnx-community/gemma-3-270m-it-ONNX';

/**
 * The exact files, so an update on the Hub can't change what visitors run. Don't go back past
 * this one: older 16-bit files answered with garbage on WebGPU.
 */
export const MODEL_REVISION = '2dbbfdb1b59bd034eb959428c6a7da9dd7ea27f0';

/** Where Transformers.js keeps what it downloads, in the browser's Cache Storage. */
export const MODEL_CACHE = 'transformers-cache';

/**
 * How the weights are stored. Both keep them in 4 bits; `q4f16` also computes in 16-bit floats,
 * which is smaller and lighter on a phone but needs a GPU feature not every device has.
 */
export interface ModelVariant {
  dtype: 'q4f16' | 'q4';
  /** The file that holds the weights: nearly all of the download. */
  weights: string;
  /** The whole download, weights and tokenizer together. */
  bytes: number;
}

export const MODEL_VARIANTS = [
  { dtype: 'q4f16', weights: 'onnx/model_q4f16.onnx_data', bytes: 293_200_000 },
  { dtype: 'q4', weights: 'onnx/model_q4.onnx_data', bytes: 343_500_000 },
] as const satisfies readonly ModelVariant[];

/** The lighter variant when the GPU can run it, the plain one otherwise. */
export function pickVariant(gpuFeatures: { has(feature: string): boolean }): ModelVariant {
  return gpuFeatures.has('shader-f16') ? MODEL_VARIANTS[0] : MODEL_VARIANTS[1];
}

/** A size for people: whole megabytes. */
export function megabytes(bytes: number): number {
  return Math.round(bytes / 1_000_000);
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** The longest message the input accepts. */
export const MESSAGE_MAX_LENGTH = 1000;

/** How much of the conversation the model is shown: a phone has little memory to spare. */
const CONTEXT_MAX_MESSAGES = 8;
const CONTEXT_MAX_CHARS = 4000;

/**
 * The end of the conversation that fits the budget, starting from a user message as the
 * model's chat format expects. The newest message is always kept.
 *
 * The format also refuses two messages in a row from the same side, so a question that got no
 * answer (it was stopped, or failed, before its first word) is left out.
 */
export function contextWindow(messages: readonly ChatMessage[]): ChatMessage[] {
  const turns = messages.filter(({ role }, i) => role !== messages[i + 1]?.role);
  const kept: ChatMessage[] = [];
  let chars = 0;
  for (let i = turns.length - 1; i >= 0 && kept.length < CONTEXT_MAX_MESSAGES; i--) {
    chars += turns[i].content.length;
    if (kept.length && chars > CONTEXT_MAX_CHARS) break;
    kept.unshift(turns[i]);
  }
  while (kept.length > 1 && kept[0].role !== 'user') kept.shift();
  return kept;
}
