import { Component, resource, computed, ChangeDetectionStrategy, SecurityContext, ViewEncapsulation, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'app-third-party-notices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen pt-24 pb-16 px-6">
      <div class="max-w-4xl mx-auto">
        <a routerLink="/" class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press">
          ← {{ i18n.t('common.backToHome') }}
        </a>

        <h1 class="text-3xl md:text-4xl font-bold text-text-primary mb-4 animate-fade-slide-up">
          <span class="marker">{{ i18n.t('thirdParty.title') }}</span>
        </h1>

        @if (noticesResource.isLoading()) {
          <div class="space-y-4 animate-pulse">
            <div class="h-4 bg-ink/10 w-3/4"></div>
            <div class="h-4 bg-ink/10 w-1/2"></div>
            <div class="h-4 bg-ink/10 w-2/3"></div>
            <div class="h-64 bg-ink/10"></div>
          </div>
        } @else if (noticesResource.error()) {
          <p class="text-red-400">{{ i18n.t('thirdParty.loadError') }}</p>
        } @else {
          <div class="notices-content animate-fade-slide-up stagger-1"
               [innerHTML]="renderedHtml()">
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    app-third-party-notices {
      display: block;
    }

    .notices-content {
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal);
      color: var(--color-text-primary);
      padding: 1.5rem;
    }

    .notices-content h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-ink);
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--color-ink);
    }

    .notices-content h2:first-child {
      margin-top: 0;
    }

    .notices-content h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-ink);
      margin-top: 2rem;
      margin-bottom: 0.75rem;
    }

    .notices-content p {
      color: var(--color-text-secondary);
      line-height: 1.75;
      margin-bottom: 0.75rem;
    }

    .notices-content ul {
      list-style: disc;
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }

    .notices-content li {
      color: var(--color-text-secondary);
      line-height: 1.75;
      margin-bottom: 0.25rem;
    }

    .notices-content strong {
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .notices-content code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.875em;
      background: var(--color-pop-yellow);
      border: 2px solid var(--color-ink);
      padding: 0.125rem 0.375rem;
      color: var(--color-ink);
    }

    .notices-content pre {
      background: var(--color-bg-card-hover);
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal-sm);
      padding: 1rem 1.25rem;
      overflow-x: auto;
      margin-bottom: 1.5rem;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.6;
      color: var(--color-text-secondary);
    }

    .notices-content pre code {
      background: none;
      border: 0;
      padding: 0;
      font-size: inherit;
      color: inherit;
    }

    .notices-content hr {
      border: none;
      border-top: 2px solid var(--color-ink);
      margin: 2rem 0;
    }

    .notices-content a {
      color: var(--color-accent-light);
      text-decoration: underline;
      text-underline-offset: 2px;
      transition: color 0.2s;
    }

    .notices-content a:hover {
      color: var(--color-accent-primary);
    }
  `,
})
export class ThirdPartyNoticesComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  protected readonly i18n = inject(LanguageService);

  readonly noticesResource = resource({
    loader: async () => {
      const url = new URL('THIRD-PARTY-NOTICES.md', this.document.baseURI).href;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
  });

  readonly renderedHtml = computed(() => {
    const md = this.noticesResource.value();
    if (!md) return '';
    const html = this.markdownToHtml(md);
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  });

  private markdownToHtml(md: string): string {
    // Split into lines for processing
    const lines = md.split('\n');
    const output: string[] = [];
    let inCodeBlock = false;
    let inList = false;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code blocks
      if (line.startsWith('```')) {
        if (inList) {
          output.push('</ul>');
          inList = false;
        }
        if (inCodeBlock) {
          output.push('</code></pre>');
          inCodeBlock = false;
        } else {
          output.push('<pre><code>');
          inCodeBlock = true;
        }
        i++;
        continue;
      }

      if (inCodeBlock) {
        output.push(this.escapeHtml(line));
        i++;
        continue;
      }

      // Blank line
      if (line.trim() === '') {
        if (inList) {
          output.push('</ul>');
          inList = false;
        }
        i++;
        continue;
      }

      // Horizontal rule
      if (/^-{3,}$/.test(line.trim())) {
        if (inList) {
          output.push('</ul>');
          inList = false;
        }
        output.push('<hr>');
        i++;
        continue;
      }

      // Headings (skip H1 since we render it in the template)
      if (line.startsWith('# ')) {
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        if (inList) {
          output.push('</ul>');
          inList = false;
        }
        output.push(`<h3>${this.inlineFormat(line.slice(4))}</h3>`);
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        if (inList) {
          output.push('</ul>');
          inList = false;
        }
        output.push(`<h2>${this.inlineFormat(line.slice(3))}</h2>`);
        i++;
        continue;
      }

      // List items (may continue across multiple indented lines)
      if (line.startsWith('- ')) {
        if (!inList) {
          output.push('<ul>');
          inList = true;
        }
        let content = line.slice(2);
        // Collect continuation lines (indented)
        while (i + 1 < lines.length && lines[i + 1].startsWith('  ') && !lines[i + 1].trimStart().startsWith('- ')) {
          i++;
          content += ' ' + lines[i].trim();
        }
        output.push(`<li>${this.inlineFormat(content)}</li>`);
        i++;
        continue;
      }

      // Paragraph
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      let para = line;
      while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !lines[i + 1].startsWith('#') && !lines[i + 1].startsWith('-') && !lines[i + 1].startsWith('```') && !/^-{3,}$/.test(lines[i + 1].trim())) {
        i++;
        para += ' ' + lines[i];
      }
      output.push(`<p>${this.inlineFormat(para)}</p>`);
      i++;
    }

    if (inList) output.push('</ul>');
    if (inCodeBlock) output.push('</code></pre>');

    return output.join('\n');
  }

  private inlineFormat(text: string): string {
    let result = this.escapeHtml(text);
    // Bold
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Inline code
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links [text](url)
    result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Bare URLs
    result = result.replace(/(?<!="|'>)(https?:\/\/[^\s<,]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return result;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
