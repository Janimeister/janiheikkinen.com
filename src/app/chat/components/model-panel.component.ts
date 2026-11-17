import { Component, computed, inject, signal } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import { ChatEngine } from '../chat-engine';
import { megabytes } from '../model';
import { CHAT_BUTTON_CLASS } from './chat-styles';

/**
 * The model's card: what it is, the button that downloads or starts it, the progress of that,
 * and what it takes on this device with the button that deletes it.
 */
@Component({
  selector: 'app-model-panel',
  template: `
    <h2 class="text-lg font-semibold mb-3">{{ i18n.t('chat.modelHeading') }}</h2>
    <p class="text-sm text-text-secondary max-w-2xl">{{ i18n.t('chat.intro') }}</p>

    <div class="mt-4" aria-live="polite" data-testid="chat-model-status">
      @switch (engine.phase()) {
        @case ('checking') {
          <p class="text-sm text-text-secondary">{{ i18n.t('chat.checking') }}</p>
        }
        @case ('unsupported') {
          <p class="text-sm font-semibold">{{ i18n.t('chat.unsupported') }}</p>
        }
        @case ('idle') {
          @if (stored(); as stored) {
            <p class="text-sm font-semibold">
              {{ i18n.t(engine.downloaded() ? 'chat.onDevice' : 'chat.partial', { size: stored }) }}
            </p>
          } @else if (deleted()) {
            <p class="text-sm font-semibold">{{ i18n.t('chat.deleted') }}</p>
          }
        }
        @case ('loading') {
          <p class="text-sm font-semibold" id="chat-progress-label">
            {{ i18n.t(engine.downloaded() ? 'chat.starting' : 'chat.downloading') }}…
            <!--
              Hidden from screen readers: in this live region every megabyte would be read out.
              They get the same figures from the progress bar's value.
            -->
            @if (progress(); as progress) {
              <span class="font-mono font-normal" aria-hidden="true">{{ progress.text }}</span>
            }
          </p>
          <div
            class="mt-2 h-5 border-2 border-ink bg-bg-primary"
            role="progressbar"
            aria-labelledby="chat-progress-label"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-valuenow]="progress()?.percent ?? null"
            [attr.aria-valuetext]="progress()?.text ?? null"
          >
            <div class="h-full bg-pop-lime" [style.width.%]="progress()?.percent ?? 0"></div>
          </div>
        }
        @case ('ready') {
          <p class="text-sm font-semibold">
            @if (engine.downloaded()) {
              {{ i18n.t('chat.running', { size: stored() ?? 0 }) }}
            } @else {
              {{ i18n.t('chat.notKept') }}
            }
          </p>
        }
      }
      @if (errorKey(); as key) {
        <p class="text-red-400 text-sm mt-2">{{ i18n.t(key) }}</p>
      }
    </div>

    <div class="flex flex-wrap items-center gap-3 mt-4">
      @if (engine.phase() === 'idle') {
        <button
          type="button"
          [class]="button + ' bg-pop-lime'"
          [disabled]="engine.deleting()"
          (click)="load()"
          data-testid="chat-load"
        >
          {{
            engine.downloaded()
              ? i18n.t('chat.start')
              : i18n.t('chat.download', { size: downloadSize() })
          }}
        </button>
      }
      @if (engine.phase() === 'loading') {
        <button
          type="button"
          [class]="button + ' bg-bg-card'"
          (click)="engine.cancel()"
          data-testid="chat-cancel"
        >
          {{ i18n.t('chat.cancel') }}
        </button>
      }
      @if (engine.stored() && engine.phase() !== 'loading') {
        <button
          type="button"
          [class]="button + ' bg-pop-pink'"
          [disabled]="engine.deleting()"
          (click)="delete()"
          data-testid="chat-delete"
        >
          {{ i18n.t(engine.deleting() ? 'chat.deleting' : 'chat.delete') }}
        </button>
      }
    </div>
    @if (engine.phase() === 'idle' && !engine.downloaded()) {
      <p class="text-xs text-text-secondary mt-3">{{ i18n.t('chat.downloadHelp') }}</p>
    }
  `,
  host: { class: 'block' },
})
export class ModelPanelComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly engine = inject(ChatEngine);
  protected readonly button = CHAT_BUTTON_CLASS;

  /** The model was deleted here, so the card can say so once it is gone. */
  protected readonly deleted = signal(false);

  /** What the model takes on this device, in megabytes; null when nothing is stored. */
  protected readonly stored = computed(() => {
    const stored = this.engine.stored();
    return stored ? Math.max(1, megabytes(stored.bytes)) : null;
  });

  protected readonly downloadSize = computed(() => megabytes(this.engine.variant()?.bytes ?? 0));

  protected readonly progress = computed(() => {
    const progress = this.engine.progress();
    if (!progress?.total) return null;
    return {
      text: this.i18n.t('chat.progress', {
        loaded: megabytes(progress.loaded),
        total: megabytes(progress.total),
      }),
      percent: Math.min(100, Math.round((progress.loaded / progress.total) * 100)),
    };
  });

  protected readonly errorKey = computed(() => {
    const failure = this.engine.failure();
    if (failure === 'load') return 'chat.errorLoad' as const;
    return failure === 'delete' ? ('chat.errorDelete' as const) : null;
  });

  protected load(): void {
    this.deleted.set(false);
    this.engine.load();
  }

  protected async delete(): Promise<void> {
    await this.engine.deleteModel();
    this.deleted.set(!this.engine.stored());
  }
}
