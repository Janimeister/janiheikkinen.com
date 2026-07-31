import { Component, resource, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';

interface GitHubUser {
  login: string;
  name: string | null;
  public_repos: number;
  followers: number;
  following: number;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  created_at: string;
  updated_at: string;
  public_gists: number;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
  fork: boolean;
}

interface GitHubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
}

/** Language swatch colors restricted to the design-system pop palette (docs/design-system.md §2). */
const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-pop-sky',
  JavaScript: 'bg-pop-yellow',
  Python: 'bg-pop-lime',
  HTML: 'bg-pop-orange',
  CSS: 'bg-pop-pink',
  PHP: 'bg-accent-secondary',
  Java: 'bg-red-400',
  'C#': 'bg-pop-lime',
  Go: 'bg-pop-sky',
  Rust: 'bg-pop-orange',
  Shell: 'bg-pop-lime',
};

@Component({
  selector: 'app-github-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20 overflow-hidden">
      <app-floating-orb class="hidden md:block absolute top-[12%] right-[12%] z-[1]" delay="0s" [size]="65" shape="square" color="sky" rotate="-6deg" />
      <app-floating-orb class="hidden md:block absolute bottom-[25%] left-[8%] z-[1]" delay="3s" [size]="55" shape="circle" color="pink" rotate="4deg" />
      <app-floating-orb class="hidden lg:block absolute top-[46%] left-[3%] z-[1]" delay="1.5s" [size]="44" shape="triangle" color="yellow" rotate="-12deg" />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            {{ i18n.t('common.backToHome') }}
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-3 leading-tight">
            <span class="marker marker-pink">{{ i18n.t('github.title') }}</span>
          </h1>
          <p class="text-text-secondary mt-3 text-lg">{{ i18n.t('github.subtitle') }}</p>
        </div>

        @if (profile.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            @for (i of [1,2,3]; track i) {
              <app-glow-card>
                <div class="animate-pulse space-y-3">
                  <div class="h-6 bg-ink/10 w-1/2"></div>
                  <div class="h-20 bg-ink/10"></div>
                </div>
              </app-glow-card>
            }
          </div>
        } @else if (profile.error()) {
          <app-glow-card>
            <p class="text-red-400">{{ i18n.t('github.loadError') }}</p>
          </app-glow-card>
        } @else if (profile.value(); as user) {
          <!-- Profile Hero -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8 animate-fade-slide-up stagger-1">
            <div class="lg:col-span-2">
              <app-glow-card>
                <div class="flex flex-col sm:flex-row items-start gap-5">
                  <img [src]="user.avatar_url" [alt]="user.login"
                       class="w-20 h-20 md:w-24 md:h-24 border-2 border-ink shadow-brutal-sm object-cover" width="96" height="96" />
                  <div class="flex-1 min-w-0">
                    <h2 class="text-2xl font-bold text-text-primary">{{ user.name || user.login }}</h2>
                    <a [href]="user.html_url" target="_blank" rel="noopener noreferrer"
                       class="text-sm text-accent-light hover:underline">{{"@"}}{{ user.login }}</a>
                    @if (user.bio) {
                      <p class="text-sm text-text-secondary mt-2">{{ user.bio }}</p>
                    }
                    <div class="flex flex-wrap items-center gap-4 mt-3 text-sm text-text-secondary">
                      @if (user.location) {
                        <span class="flex items-center gap-1">📍 {{ user.location }}</span>
                      }
                      @if (user.blog) {
                        <a [href]="blogUrl(user.blog)" target="_blank" rel="noopener noreferrer"
                           class="flex items-center gap-1 hover:text-accent-light transition-colors underline decoration-2 underline-offset-4">
                          🔗 {{ user.blog }}
                        </a>
                      }
                      <span class="flex items-center gap-1">📅 {{ i18n.t('github.memberSince', { year: memberYear(user.created_at) }) }}</span>
                    </div>
                  </div>
                </div>
              </app-glow-card>
            </div>
            <div>
              <app-glow-card>
                <h3 class="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">{{ i18n.t('github.stats') }}</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-pop-yellow border-2 border-ink shadow-brutal-sm p-3 text-center">
                    <div class="text-2xl font-display text-ink">{{ user.public_repos }}</div>
                    <div class="text-xs text-ink">{{ i18n.t('github.repositoriesCount') }}</div>
                  </div>
                  <div class="bg-pop-sky border-2 border-ink shadow-brutal-sm p-3 text-center">
                    <div class="text-2xl font-display text-ink">{{ user.followers }}</div>
                    <div class="text-xs text-ink">{{ i18n.t('github.followers') }}</div>
                  </div>
                  <div class="bg-pop-lime border-2 border-ink shadow-brutal-sm p-3 text-center">
                    <div class="text-2xl font-display text-ink">{{ user.following }}</div>
                    <div class="text-xs text-ink">{{ i18n.t('github.following') }}</div>
                  </div>
                  <div class="bg-pop-orange border-2 border-ink shadow-brutal-sm p-3 text-center">
                    <div class="text-2xl font-display text-ink">{{ user.public_gists }}</div>
                    <div class="text-xs text-ink">{{ i18n.t('github.gists') }}</div>
                  </div>
                </div>
              </app-glow-card>
            </div>
          </div>

          <!-- Language Breakdown -->
          @if (languages().length) {
            <div class="mb-8 animate-fade-slide-up stagger-2">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl" aria-hidden="true">🎨</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('github.languages') }}</h2>
                </div>
                <!-- Language bar -->
                <div class="flex h-5 overflow-hidden mb-4 border-2 border-ink shadow-brutal-sm bg-bg-card">
                  @for (lang of languages(); track lang.name) {
                    <div [class]="langColor(lang.name) + ' box-border border-r-2 border-ink transition-all hover:opacity-80'"
                         [style.width.%]="lang.pct"
                         [title]="lang.name + ': ' + (lang.count === 1 ? i18n.t('github.repoCountOne') : i18n.t('github.repoCount', { count: lang.count }))">
                    </div>
                  }
                </div>
                <div class="flex flex-wrap gap-4">
                  @for (lang of languages(); track lang.name) {
                    <div class="flex items-center gap-2 text-sm">
                      <span [class]="langColor(lang.name) + ' w-3 h-3 border border-ink shrink-0'"></span>
                      <span class="text-text-primary">{{ lang.name }}</span>
                      <span class="text-text-secondary text-xs">({{ lang.count }})</span>
                    </div>
                  }
                </div>
              </app-glow-card>
            </div>
          }

          <!-- Repositories -->
          @if (repoList(); as repoList) {
            <div class="mb-8 animate-fade-slide-up stagger-3">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl" aria-hidden="true">📦</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('github.repositories') }}</h2>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (repo of repoList; track repo.name) {
                    <a [href]="repo.html_url" target="_blank" rel="noopener noreferrer"
                       class="block p-4 bg-bg-card border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform group">
                      <div class="flex items-start justify-between mb-2">
                        <h3 class="text-sm font-semibold text-text-primary group-hover:text-accent-light transition-colors truncate">
                          {{ repo.name }}
                        </h3>
                        <div class="flex items-center gap-2 text-xs text-text-secondary shrink-0 ml-2">
                          @if (repo.stargazers_count > 0) {
                            <span class="flex items-center gap-0.5">⭐ {{ repo.stargazers_count }}</span>
                          }
                          @if (repo.forks_count > 0) {
                            <span class="flex items-center gap-0.5">🍴 {{ repo.forks_count }}</span>
                          }
                        </div>
                      </div>
                      @if (repo.description) {
                        <p class="text-xs text-text-secondary mb-2 line-clamp-2">{{ repo.description }}</p>
                      }
                      <div class="flex items-center gap-3 text-xs text-text-secondary">
                        @if (repo.language) {
                          <span class="flex items-center gap-1">
                            <span [class]="langColor(repo.language) + ' w-2.5 h-2.5 border border-ink shrink-0'"></span>
                            {{ repo.language }}
                          </span>
                        }
                        <span>{{ i18n.t('github.updated', { date: relativeDate(repo.updated_at) }) }}</span>
                      </div>
                    </a>
                  }
                </div>
              </app-glow-card>
            </div>
          } @else if (reposError()) {
            <div class="mb-8 animate-fade-slide-up stagger-3">
              <app-glow-card>
                <p class="text-red-400">{{ i18n.t('github.reposLoadError') }}</p>
              </app-glow-card>
            </div>
          }

          <!-- Recent Activity -->
          @if (recentActivity().length) {
            <div class="animate-fade-slide-up stagger-4">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl" aria-hidden="true">📡</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('github.recentActivity') }}</h2>
                </div>
                <div class="space-y-3">
                  @for (event of recentActivity(); track event.type + event.date + event.repo) {
                    <div class="flex items-start gap-3 p-3 bg-bg-card-hover border-2 border-ink shadow-brutal-sm">
                      <span class="text-lg mt-0.5">{{ event.icon }}</span>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm text-text-primary">
                          <span class="font-medium">{{ event.action }}</span>
                          <span class="text-accent-light"> {{ event.repo }}</span>
                        </div>
                        <div class="text-xs text-text-secondary mt-0.5">{{ relativeDate(event.date) }}</div>
                      </div>
                    </div>
                  }
                </div>
              </app-glow-card>
            </div>
          } @else if (activityError()) {
            <div class="animate-fade-slide-up stagger-4">
              <app-glow-card>
                <p class="text-red-400">{{ i18n.t('github.activityLoadError') }}</p>
              </app-glow-card>
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class GithubPageComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly username = 'Janimeister';

  profile = resource({
    loader: async ({ abortSignal }): Promise<GitHubUser> => {
      const res = await fetch(`https://api.github.com/users/${this.username}`, { signal: AbortSignal.any([abortSignal, AbortSignal.timeout(10_000)]) });
      if (!res.ok) throw new Error('GitHub API error');
      return res.json();
    },
  });

  repos = resource({
    loader: async ({ abortSignal }): Promise<GitHubRepo[]> => {
      const res = await fetch(`https://api.github.com/users/${this.username}/repos?sort=updated&per_page=30`, { signal: AbortSignal.any([abortSignal, AbortSignal.timeout(10_000)]) });
      if (!res.ok) throw new Error('GitHub repos API error');
      const data: GitHubRepo[] = await res.json();
      return data.filter(r => !r.fork).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    },
  });

  private events = resource({
    loader: async ({ abortSignal }): Promise<GitHubEvent[]> => {
      const res = await fetch(`https://api.github.com/users/${this.username}/events/public?per_page=15`, { signal: AbortSignal.any([abortSignal, AbortSignal.timeout(10_000)]) });
      if (!res.ok) throw new Error('GitHub events API error');
      return res.json();
    },
  });

  protected reposError = computed(() => this.repos.error() !== undefined);
  protected activityError = computed(() => this.events.error() !== undefined);

  /** Safe view of the repos resource - value() throws while in the error state. */
  protected repoList = computed(() => (this.repos.hasValue() ? this.repos.value() : undefined));

  languages = computed(() => {
    const repoList = this.repoList();
    if (!repoList?.length) return [];
    const counts: Record<string, number> = {};
    repoList.forEach(r => {
      if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count, pct: (count / total) * 100 }));
  });

  recentActivity = computed(() => {
    const eventList = this.events.hasValue() ? this.events.value() : undefined;
    if (!eventList?.length) return [];

    const eventMap: Record<string, { icon: string; actionKey: TranslationKey }> = {
      PushEvent: { icon: '🚀', actionKey: 'github.eventPush' },
      CreateEvent: { icon: '🌱', actionKey: 'github.eventCreate' },
      DeleteEvent: { icon: '🗑️', actionKey: 'github.eventDelete' },
      IssuesEvent: { icon: '📝', actionKey: 'github.eventIssues' },
      IssueCommentEvent: { icon: '💬', actionKey: 'github.eventIssueComment' },
      PullRequestEvent: { icon: '🔀', actionKey: 'github.eventPullRequest' },
      PullRequestReviewEvent: { icon: '👀', actionKey: 'github.eventPullRequestReview' },
      WatchEvent: { icon: '⭐', actionKey: 'github.eventWatch' },
      ForkEvent: { icon: '🍴', actionKey: 'github.eventFork' },
      ReleaseEvent: { icon: '🏷️', actionKey: 'github.eventRelease' },
    };

    return eventList.slice(0, 10).map(e => {
      const info = eventMap[e.type];
      return {
        type: e.type,
        icon: info?.icon ?? '📌',
        action: info ? this.i18n.t(info.actionKey) : this.i18n.t('github.eventUnknown'),
        repo: e.repo.name.split('/')[1] || e.repo.name,
        date: e.created_at,
      };
    });
  });

  langColor(lang: string): string {
    return LANG_COLORS[lang] ?? 'bg-gray-400';
  }

  blogUrl(blog: string): string {
    return blog.startsWith('http') ? blog : `https://${blog}`;
  }

  memberYear(dateStr: string): number {
    return new Date(dateStr).getFullYear();
  }

  relativeDate(dateStr: string): string {
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
    const days = Math.floor(diff / 86400000);
    if (days === 0) return this.i18n.t('github.today');
    if (days === 1) return this.i18n.t('github.yesterday');
    if (days < 30) return this.i18n.t('github.daysAgo', { count: days });
    const months = Math.floor(days / 30);
    if (months < 12) return this.i18n.t('github.monthsAgo', { count: months });
    return this.i18n.t('github.yearsAgo', { count: Math.floor(months / 12) });
  }
}
