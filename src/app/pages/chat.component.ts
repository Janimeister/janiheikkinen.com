import { afterNextRender, Component, DestroyRef, inject } from '@angular/core';
import { ChatEngine } from '../chat/chat-engine';
import { ConversationComponent } from '../chat/components/conversation.component';
import { ModelPanelComponent } from '../chat/components/model-panel.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { PageHeaderComponent } from '../components/shared/page-header.component';
import { registerTranslations } from '../i18n/dictionaries';
import { LanguageService } from '../i18n/language.service';
import { CHAT_EN } from '../i18n/pages/chat.en';

// This page's English copy; the Finnish copy is fetched by the route when it's needed.
registerTranslations('en', CHAT_EN);

/**
 * A chat with a small language model that runs in the visitor's browser. Nothing is downloaded
 * until the visitor asks for it, and the same page deletes it again.
 */
@Component({
  selector: 'app-chat-page',
  imports: [
    GlowCardComponent,
    FloatingOrbComponent,
    PageHeaderComponent,
    ModelPanelComponent,
    ConversationComponent,
  ],
  // The engine lives and dies with the page, so leaving it frees the model's memory.
  providers: [ChatEngine],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <app-floating-orb
        class="hidden md:block absolute top-[14%] right-[9%] z-[1]"
        delay="1s"
        [size]="56"
        shape="square"
        color="orange"
        rotate="10deg"
      />
      <app-floating-orb
        class="hidden md:block absolute bottom-[22%] left-[5%] z-[1]"
        delay="4s"
        [size]="44"
        shape="circle"
        color="sky"
      />

      <div class="relative z-10 max-w-4xl mx-auto">
        <app-page-header titleKey="chat.title" subtitleKey="chat.subtitle" marker="orange" />

        <div class="mb-8 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <app-model-panel />
          </app-glow-card>
        </div>

        <div class="mb-8 animate-fade-slide-up stagger-2">
          <app-glow-card>
            <app-conversation />
          </app-glow-card>
        </div>

        <div class="mt-6 text-center text-xs text-text-secondary space-y-1">
          <p>
            <a
              href="https://ai.google.dev/gemma/terms"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-accent-light underline underline-offset-2 transition-colors"
              >{{ i18n.t('chat.terms') }}</a
            >
          </p>
          <p>
            <a
              href="https://huggingface.co/docs/transformers.js"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-accent-light underline underline-offset-2 transition-colors"
              >{{ i18n.t('chat.runtime') }}</a
            >
          </p>
        </div>
      </div>
    </section>
  `,
})
export class ChatPageComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly engine = inject(ChatEngine);

  constructor() {
    // The prerendered page knows nothing of the visitor's device; the browser finds out.
    afterNextRender(() => void this.engine.init());
    inject(DestroyRef).onDestroy(() => this.engine.destroy());
  }
}
