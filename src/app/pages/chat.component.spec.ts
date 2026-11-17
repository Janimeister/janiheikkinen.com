import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { CHAT_WORKER } from '../chat/chat-engine';
import { ChatPageComponent } from './chat.component';

describe('ChatPageComponent', () => {
  let workersStarted: number;

  beforeEach(() => {
    workersStarted = 0;
    TestBed.configureTestingModule({
      imports: [ChatPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: CHAT_WORKER,
          useValue: () => {
            workersStarted++;
            throw new Error('No model in unit tests');
          },
        },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(ChatPageComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows its heading and what the model is', async () => {
    const page = await render();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Local AI Chat');
    expect(page.textContent).toContain('Gemma 3 270M');
    expect(page.querySelector('a[href="https://ai.google.dev/gemma/terms"]')).toBeTruthy();
  });

  // jsdom has no WebGPU, like a browser too old for the model.
  it('explains that a browser without WebGPU cannot run the model', async () => {
    const page = await render();

    await expect
      .poll(() => page.querySelector('[data-testid="chat-model-status"]')?.textContent)
      .toContain("This browser can't run the model");
    expect(page.querySelector('[data-testid="chat-load"]')).toBeNull();
    expect(page.querySelector<HTMLTextAreaElement>('[data-testid="chat-input"]')?.disabled).toBe(
      true,
    );
    expect(workersStarted).toBe(0);
  });
});
