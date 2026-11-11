import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureEarlyInput, recordEarlyInput, restoreEarlyInput } from './early-input';

describe('input made before the app starts', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.innerHTML = `
      <input id="text" type="text" />
      <input id="prefilled" type="text" value="Helsinki" />
      <input id="box" type="checkbox" />
      <input id="ticked" type="checkbox" checked />
      <select id="plain"><option value="a">A</option><option value="b">B</option></select>
      <select id="preset">
        <option value="a">A</option>
        <option value="b" selected>B</option>
      </select>
      <textarea id="area"></textarea>
    `;
    document.body.appendChild(root);
  });

  afterEach(() => root.remove());

  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;

  it('ignores controls that still show what the HTML gave them', () => {
    expect(captureEarlyInput(root)).toEqual([]);
  });

  it('notes text, ticks and choices the visitor has made', () => {
    get<HTMLInputElement>('text').value = 'Tampere';
    get<HTMLInputElement>('prefilled').value = '';
    get<HTMLInputElement>('box').checked = true;
    get<HTMLInputElement>('ticked').checked = false;
    get<HTMLSelectElement>('plain').value = 'b';
    get<HTMLSelectElement>('preset').value = 'a';
    get<HTMLTextAreaElement>('area').value = 'notes';

    const inputs = captureEarlyInput(root);

    expect(inputs.map(({ control, value, checked }) => [control.id, value, checked])).toEqual([
      ['text', 'Tampere', false],
      ['prefilled', '', false],
      ['box', 'on', true],
      ['ticked', 'on', false],
      ['plain', 'b', false],
      ['preset', 'a', false],
      ['area', 'notes', false],
    ]);
  });

  it('gives the input back after the app has overwritten it, and tells the app', () => {
    const text = get<HTMLInputElement>('text');
    const box = get<HTMLInputElement>('box');
    const select = get<HTMLSelectElement>('plain');
    text.value = 'Tampere';
    box.checked = true;
    select.value = 'b';
    const inputs = captureEarlyInput(root);

    // The app takes the page over and writes its own state.
    text.value = '';
    box.checked = false;
    select.value = 'a';
    const heard: string[] = [];
    root.addEventListener('input', (event) => heard.push(`input ${(event.target as Element).id}`));
    root.addEventListener('change', (event) =>
      heard.push(`change ${(event.target as Element).id}`),
    );

    restoreEarlyInput(inputs);

    expect(text.value).toBe('Tampere');
    expect(box.checked).toBe(true);
    expect(select.value).toBe('b');
    expect(heard).toEqual([
      'input text',
      'change text',
      'input box',
      'change box',
      'input plain',
      'change plain',
    ]);
  });

  it('keeps noting input until told to stop, the latest state of each control', () => {
    const text = get<HTMLInputElement>('text');
    const box = get<HTMLInputElement>('box');
    get<HTMLTextAreaElement>('area').value = 'typed before the app loaded';
    const type = (value: string) => {
      text.value = value;
      text.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const recording = recordEarlyInput(root);
    type('Tam');
    type('Tampere');
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    const inputs = recording.stop();
    type('later');

    expect(inputs.map(({ control, value, checked }) => [control.id, value, checked])).toEqual([
      ['area', 'typed before the app loaded', false],
      ['text', 'Tampere', false],
      ['box', 'on', true],
    ]);
  });

  it('leaves alone input the app already has', () => {
    const text = get<HTMLInputElement>('text');
    text.value = 'Tampere';
    const inputs = captureEarlyInput(root);
    const listener = vi.fn();
    text.addEventListener('input', listener);

    restoreEarlyInput(inputs);

    expect(text.value).toBe('Tampere');
    expect(listener).not.toHaveBeenCalled();
  });

  it('skips a control the app has removed', () => {
    const text = get<HTMLInputElement>('text');
    text.value = 'Tampere';
    const inputs = captureEarlyInput(root);
    const listener = vi.fn();
    text.addEventListener('input', listener);
    text.remove();

    restoreEarlyInput(inputs);

    expect(listener).not.toHaveBeenCalled();
  });
});
