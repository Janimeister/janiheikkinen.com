import { describe, expect, it } from 'vitest';
import { FakeCaches } from './fake-caches';
import { MODEL_CACHE, MODEL_ID, MODEL_REVISION } from './model';
import { deleteModel, deleteOutdated, inspectModel } from './model-storage';

const file = (path: string) =>
  `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/${path}`;

describe('model storage', () => {
  it('finds nothing on a device that never downloaded the model', async () => {
    const caches = new FakeCaches();

    expect(await inspectModel(caches)).toBeNull();
    // Looking must not leave an empty cache behind.
    expect(caches.stores.size).toBe(0);
  });

  it('adds up the stored files and names the variant whose weights are there', async () => {
    const caches = new FakeCaches();
    caches.put(MODEL_CACHE, file('tokenizer.json'), 200);
    caches.put(MODEL_CACHE, file('onnx/model_q4.onnx'), 30);
    // Some responses come without a declared length; their body is measured instead.
    caches.put(MODEL_CACHE, file('onnx/model_q4.onnx_data'), 1000, false);

    expect(await inspectModel(caches)).toEqual({
      bytes: 1230,
      variant: expect.objectContaining({ dtype: 'q4' }),
    });
  });

  it('reports files without the weights as an incomplete model', async () => {
    const caches = new FakeCaches();
    caches.put(MODEL_CACHE, file('tokenizer.json'), 200);

    expect(await inspectModel(caches)).toEqual({ bytes: 200, variant: null });
  });

  it("ignores another model's files", async () => {
    const caches = new FakeCaches();
    caches.put(MODEL_CACHE, 'https://huggingface.co/someone/else/resolve/main/model.onnx_data', 9);

    expect(await inspectModel(caches)).toBeNull();
  });

  it('does not take the weights of another revision for the model', async () => {
    const caches = new FakeCaches();
    const old = file('onnx/model_q4.onnx_data').replace(MODEL_REVISION, 'an-older-revision');
    caches.put(MODEL_CACHE, old, 1000);

    // They can't be loaded, but they do take space, so they are counted.
    expect(await inspectModel(caches)).toEqual({ bytes: 1000, variant: null });
  });

  it('removes the files of other revisions and keeps the rest', async () => {
    const caches = new FakeCaches();
    const other = 'https://huggingface.co/someone/else/resolve/main/model.onnx_data';
    caches.put(MODEL_CACHE, file('onnx/model_q4.onnx_data'), 1000);
    caches.put(MODEL_CACHE, file('config.json').replace(MODEL_REVISION, 'main'), 5);
    caches.put(MODEL_CACHE, file('onnx/model_q4.onnx_data').replace(MODEL_REVISION, 'old'), 900);
    caches.put(MODEL_CACHE, other, 9);

    await deleteOutdated(caches);

    expect([...caches.stores.get(MODEL_CACHE)!.keys()]).toEqual([
      file('onnx/model_q4.onnx_data'),
      other,
    ]);
    expect(await inspectModel(caches)).toEqual({
      bytes: 1000,
      variant: expect.objectContaining({ dtype: 'q4' }),
    });
  });

  it('leaves no empty cache behind when there was nothing outdated to remove', async () => {
    const caches = new FakeCaches();

    await deleteOutdated(caches);

    expect(caches.stores.size).toBe(0);
  });

  it('deletes everything that was stored', async () => {
    const caches = new FakeCaches();
    caches.put(MODEL_CACHE, file('onnx/model_q4f16.onnx_data'), 1000);

    await deleteModel(caches);

    expect(await inspectModel(caches)).toBeNull();
    expect(caches.stores.size).toBe(0);
  });
});
