/**
 * The ONNX Runtime build that runs the model on WebGPU. This site serves it itself: the `ort`
 * assets in angular.json copy these two files out of `node_modules/onnxruntime-web/dist`, a
 * dependency of the model's library. An upgrade of that library can rename them, and a copy
 * that matches nothing doesn't fail the build, so the production smoke test asks for both.
 */
export const RUNTIME_PATH = '/ort/';

export const RUNTIME_FILES = {
  mjs: 'ort-wasm-simd-threaded.asyncify.mjs',
  wasm: 'ort-wasm-simd-threaded.asyncify.wasm',
} as const;
