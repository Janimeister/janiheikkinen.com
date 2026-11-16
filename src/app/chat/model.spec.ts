import { describe, expect, it } from 'vitest';
import { contextWindow, megabytes, MODEL_VARIANTS, pickVariant, type ChatMessage } from './model';

const user = (content: string): ChatMessage => ({ role: 'user', content });
const gemma = (content: string): ChatMessage => ({ role: 'assistant', content });

describe('chat model', () => {
  it('picks the 16-bit variant only for a GPU that can run it', () => {
    expect(pickVariant(new Set(['shader-f16'])).dtype).toBe('q4f16');
    expect(pickVariant(new Set(['timestamp-query'])).dtype).toBe('q4');
  });

  it('names sizes in whole megabytes, the smaller variant first', () => {
    expect(megabytes(343_502_950)).toBe(344);
    expect(MODEL_VARIANTS[0].bytes).toBeLessThan(MODEL_VARIANTS[1].bytes);
  });

  it('shows the model a short conversation whole', () => {
    const messages = [user('hi'), gemma('hello'), user('how are you?')];

    expect(contextWindow(messages)).toEqual(messages);
  });

  it('keeps the newest messages of a long conversation, starting from a question', () => {
    const messages = Array.from({ length: 11 }, (_, i) =>
      i % 2 ? gemma(`answer ${i}`) : user(`question ${i}`),
    );

    const shown = contextWindow(messages);

    expect(shown.at(-1)).toEqual(user('question 10'));
    expect(shown[0]).toEqual(user('question 4'));
    expect(shown).toHaveLength(7);
  });

  it('leaves out a question that got no answer, so the two sides take turns', () => {
    const messages = [user('hi'), gemma('hello'), user('unanswered'), user('still unanswered')];

    expect(contextWindow([...messages, user('how are you?')])).toEqual([
      user('hi'),
      gemma('hello'),
      user('how are you?'),
    ]);
  });

  it('drops old messages that are too long, but never the newest', () => {
    const long = 'x'.repeat(3000);

    expect(contextWindow([user(long), gemma(long), user('short')])).toEqual([user('short')]);
    expect(contextWindow([user(long + long)])).toEqual([user(long + long)]);
  });
});
