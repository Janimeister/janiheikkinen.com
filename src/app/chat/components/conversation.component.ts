import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import { ChatEngine } from '../chat-engine';
import { MESSAGE_MAX_LENGTH } from '../model';
import { CHAT_BUTTON_CLASS } from './chat-styles';

/** The conversation: what has been said, and the field for saying more. */
@Component({
  selector: 'app-conversation',
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
      <h2 class="text-lg font-semibold">{{ i18n.t('chat.conversationHeading') }}</h2>
      @if (engine.messages().length) {
        <button
          type="button"
          class="text-xs font-semibold underline underline-offset-2 hover:text-accent-light cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          [disabled]="engine.generating()"
          (click)="engine.clear()"
          data-testid="chat-clear"
        >
          {{ i18n.t('chat.clear') }}
        </button>
      }
    </div>

    @if (engine.messages().length) {
      <!-- Focusable so the keyboard can scroll it. -->
      <ol
        #log
        class="log grid gap-3 mb-4"
        tabindex="0"
        [attr.aria-label]="i18n.t('chat.messages')"
        data-testid="chat-messages"
      >
        @for (message of engine.messages(); track $index) {
          <li
            class="message"
            [class.message-user]="message.role === 'user'"
            [attr.data-role]="message.role"
          >
            <span class="block text-xs font-mono font-bold uppercase mb-1">{{
              i18n.t(message.role === 'user' ? 'chat.you' : 'chat.gemma')
            }}</span>
            @if (message.content) {
              <span class="whitespace-pre-wrap break-words">{{ message.content }}</span>
            } @else {
              <span class="text-text-secondary">{{ i18n.t('chat.writing') }}</span>
            }
          </li>
        }
      </ol>
    } @else {
      <p class="text-sm text-text-secondary mb-4">
        {{ i18n.t(ready() ? 'chat.empty' : 'chat.locked') }}
      </p>
    }

    <!-- The finished answer, once, for screen readers; the log itself changes word by word. -->
    <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
    @if (engine.failure() === 'generate') {
      <p class="text-red-400 text-sm mb-3">{{ i18n.t('chat.errorGenerate') }}</p>
    }

    <!-- Not a form: Enter must never submit the page, even before the app has started. -->
    <div class="flex flex-col sm:flex-row gap-2">
      <textarea
        rows="2"
        [value]="draft()"
        (input)="draft.set($any($event.target).value)"
        (keydown.enter)="onEnter($event)"
        [disabled]="!ready()"
        [attr.placeholder]="i18n.t('chat.placeholder')"
        [attr.aria-label]="i18n.t('chat.inputLabel')"
        [attr.maxlength]="maxLength"
        class="flex-1 min-w-0 bg-bg-card border-2 border-ink px-4 py-2 text-sm text-text-primary placeholder-text-secondary/70 shadow-brutal-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="chat-input"
      ></textarea>
      @if (engine.generating()) {
        <button
          type="button"
          [class]="button + ' bg-pop-orange sm:self-end'"
          (click)="engine.stop()"
          data-testid="chat-stop"
        >
          {{ i18n.t('chat.stop') }}
        </button>
      } @else {
        <button
          type="button"
          [class]="button + ' bg-pop-lime sm:self-end'"
          [disabled]="!ready() || !draft().trim()"
          (click)="send()"
          data-testid="chat-send"
        >
          {{ i18n.t('chat.send') }}
        </button>
      }
    </div>

    <p class="text-xs text-text-secondary max-w-xl mt-4">{{ i18n.t('chat.disclaimer') }}</p>
  `,
  styles: `
    .log {
      max-height: min(28rem, 60vh);
      overflow-y: auto;
      padding: 0.25rem 0.5rem 0.5rem 0.25rem;
    }
    .message {
      max-width: 90%;
      justify-self: start;
      padding: 0.5rem 0.75rem;
      border: 2px solid var(--color-ink);
      background: var(--color-bg-primary);
      box-shadow: var(--shadow-brutal-sm);
      font-size: 0.9375rem;
    }
    .message-user {
      justify-self: end;
      background: var(--color-pop-sky);
    }
  `,
  host: { class: 'block' },
})
export class ConversationComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly engine = inject(ChatEngine);
  protected readonly button = CHAT_BUTTON_CLASS;
  protected readonly maxLength = MESSAGE_MAX_LENGTH;

  private readonly log = viewChild<ElementRef<HTMLElement>>('log');

  /** What is typed in the field. */
  protected readonly draft = signal('');
  protected readonly ready = computed(() => this.engine.phase() === 'ready');

  protected readonly announcement = computed(() => {
    const answer = this.engine.messages().at(-1);
    return answer?.role === 'assistant' && answer.content && !this.engine.generating()
      ? this.i18n.t('chat.answered', { answer: answer.content })
      : '';
  });

  constructor() {
    // Follow the answer as it grows. After rendering: the log's height is only then the new one.
    afterRenderEffect(() => {
      this.engine.messages();
      const log = this.log()?.nativeElement;
      if (log) log.scrollTop = log.scrollHeight;
    });
  }

  /** Enter sends; Shift+Enter starts a new line. */
  protected onEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey || (event as KeyboardEvent).isComposing) return;
    event.preventDefault();
    this.send();
  }

  protected send(): void {
    if (!this.ready() || this.engine.generating() || !this.draft().trim()) return;
    this.engine.send(this.draft());
    this.draft.set('');
  }
}
