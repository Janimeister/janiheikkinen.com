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

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-green-400',
  HTML: 'bg-orange-400',
  CSS: 'bg-purple-400',
  PHP: 'bg-indigo-400',
  Java: 'bg-red-400',
  'C#': 'bg-emerald-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-amber-600',
  Shell: 'bg-lime-400',
};

@Component({
  selector: 'app-github-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a1e] via-[#0a0a0f] to-[#1a0a1e] animate-gradient-shift opacity-40"></div>
      <app-floating-orb class="absolute top-[12%] right-[12%] z-[1]" delay="0s" [size]="65" />
      <app-floating-orb class="absolute bottom-[25%] left-[8%] z-[1]" delay="3s" [size]="55" />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm text-text-secondary hover:text-accent-primary transition-colors mb-4 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            {{ i18n.t('common.backToHome') }}
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="bg-gradient-to-r from-slate-200 via-indigo-300 to-purple-400 bg-clip-text text-transparent">{{ i18n.t('github.title') }}</span>
          </h1>
          <p class="text-text-secondary mt-2">{{ i18n.t('github.subtitle') }}</p>
        </div>

        @if (profile.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            @for (i of [1,2,3]; track i) {
              <app-glow-card>
                <div class="animate-pulse space-y-3">
                  <div class="h-6 bg-white/5 rounded w-1/2"></div>
                  <div class="h-20 bg-white/5 rounded"></div>
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
                <div class="flex items-start gap-5">
                  <img [src]="user.avatar_url" [alt]="user.login"
                       class="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-white/10 shadow-lg" width="96" height="96" />
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
                           class="flex items-center gap-1 hover:text-accent-primary transition-colors">
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
                  <div class="bg-white/[0.03] rounded-xl p-3 text-center">
                    <div class="text-2xl font-bold text-accent-primary font-[JetBrains_Mono,monospace]">{{ user.public_repos }}</div>
                    <div class="text-xs text-text-secondary">{{ i18n.t('github.repositoriesCount') }}</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-xl p-3 text-center">
                    <div class="text-2xl font-bold text-accent-secondary font-[JetBrains_Mono,monospace]">{{ user.followers }}</div>
                    <div class="text-xs text-text-secondary">{{ i18n.t('github.followers') }}</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-xl p-3 text-center">
                    <div class="text-2xl font-bold text-emerald-400 font-[JetBrains_Mono,monospace]">{{ user.following }}</div>
                    <div class="text-xs text-text-secondary">{{ i18n.t('github.following') }}</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-xl p-3 text-center">
                    <div class="text-2xl font-bold text-amber-400 font-[JetBrains_Mono,monospace]">{{ user.public_gists }}</div>
                    <div class="text-xs text-text-secondary">{{ i18n.t('github.gists') }}</div>
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
                  <span class="text-xl">🎨</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('github.languages') }}</h2>
                </div>
                <!-- Language bar -->
                <div class="flex h-4 rounded-full overflow-hidden mb-4">
                  @for (lang of languages(); track lang.name) {
                    <div [class]="langColor(lang.name)"
                         [style.width.%]="lang.pct"
                         [title]="lang.name + ': ' + (lang.count === 1 ? i18n.t('github.repoCountOne') : i18n.t('github.repoCount', { count: lang.count }))"
                         class="transition-all hover:opacity-80">
                    </div>
                  }
                </div>
                <div class="flex flex-wrap gap-4">
                  @for (lang of languages(); track lang.name) {
                    <div class="flex items-center gap-2 text-sm">
                      <span class="w-3 h-3 rounded-full" [class]="langColor(lang.name)"></span>
                      <span class="text-text-primary">{{ lang.name }}</span>
                      <span class="text-text-secondary text-xs">({{ lang.count }})</span>
                    </div>
                  }
                </div>
              </app-glow-card>
            </div>
          }

          <!-- Repositories -->
          @if (repos.value(); as repoList) {
            <div class="mb-8 animate-fade-slide-up stagger-3">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">📦</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('github.repositories') }}</h2>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (repo of repoList; track repo.name) {
                    <a [href]="repo.html_url" target="_blank" rel="noopener noreferrer"
                       class="block p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-accent-primary/30 hover:bg-white/[0.04] transition-all group">
                      <div class="flex items-start justify-between mb-2">
                        <h3 class="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
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
                            <span class="w-2.5 h-2.5 rounded-full" [class]="langColor(repo.language)"></span>
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
          }

          <!-- Recent Activity -->
          @if (recentActivity().length) {
            <div class="animate-fade-slide-up stagger-4">
              <app-glow-card>
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">📡</span>
                  <h2 class="text-lg font-semibold text-text-primary">{{ i18n.t('github.recentActivity') }}</h2>
                </div>
                <div class="space-y-3">
                  @for (event of recentActivity(); track $index) {
                    <div class="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
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
    loader: async (): Promise<GitHubUser> => {
      const res = await fetch(`https://api.github.com/users/${this.username}`);
      if (!res.ok) throw new Error('GitHub API error');
      return res.json();
    },
  });

  repos = resource({
    loader: async (): Promise<GitHubRepo[]> => {
      const res = await fetch(`https://api.github.com/users/${this.username}/repos?sort=updated&per_page=30`);
      if (!res.ok) return [];
      const data: GitHubRepo[] = await res.json();
      return data.filter(r => !r.fork).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    },
  });

  private events = resource({
    loader: async (): Promise<GitHubEvent[]> => {
      const res = await fetch(`https://api.github.com/users/${this.username}/events/public?per_page=15`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  languages = computed(() => {
    const repoList = this.repos.value();
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
    const eventList = this.events.value();
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
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return this.i18n.t('github.today');
    if (days === 1) return this.i18n.t('github.yesterday');
    if (days < 30) return this.i18n.t('github.daysAgo', { count: days });
    const months = Math.floor(days / 30);
    if (months < 12) return this.i18n.t('github.monthsAgo', { count: months });
    return this.i18n.t('github.yearsAgo', { count: Math.floor(months / 12) });
  }
}
