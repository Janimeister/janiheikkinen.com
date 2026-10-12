/**
 * The GitHub page's data shaping, kept free of Angular so it can be tested on its own. The page
 * reads three unauthenticated endpoints: the profile, the repositories and recent public events.
 */
import type { TranslationKey } from '../i18n/translations';

export interface GitHubUser {
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

export interface GitHubRepo {
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

export interface GitHubEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
}

/** Language swatch colors restricted to the design-system pop palette (docs/design-system.md §2). */
export const LANG_COLORS: Record<string, string> = {
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

/** The colour class for a language's swatch; grey for languages without one. */
export function langColor(language: string): string {
  return LANG_COLORS[language] ?? 'bg-gray-400';
}

/** Own repositories, not forks, most recently updated first. */
export function ownRepos(repos: readonly GitHubRepo[]): GitHubRepo[] {
  return repos
    .filter((repo) => !repo.fork)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export interface LanguageShare {
  name: string;
  /** Repositories whose main language this is. */
  count: number;
  /** Share of the repositories that have a language, in %. */
  pct: number;
}

/** Languages by how many repositories use them, most first; ties keep first-seen order. */
export function languageShares(repos: readonly GitHubRepo[]): LanguageShare[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts]
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count, pct: (count / total) * 100 }));
}

const EVENT_INFO: Record<string, { icon: string; actionKey: TranslationKey }> = {
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

export const ACTIVITY_LIMIT = 10;

export interface ActivityItem {
  id: string;
  type: string;
  icon: string;
  actionKey: TranslationKey;
  /** The repository's name without its owner. */
  repo: string;
  date: string;
}

/** The latest events, each with an icon and a translatable action. */
export function activityItems(events: readonly GitHubEvent[]): ActivityItem[] {
  return events.slice(0, ACTIVITY_LIMIT).map((event) => {
    const info = EVENT_INFO[event.type];
    return {
      id: event.id,
      type: event.type,
      icon: info?.icon ?? '📌',
      actionKey: info?.actionKey ?? 'github.eventUnknown',
      repo: event.repo.name.split('/')[1] || event.repo.name,
      date: event.created_at,
    };
  });
}

/** The profile's website as a link: `example.com` gets `https://`. */
export function blogUrl(blog: string): string {
  return /^https?:\/\//i.test(blog) ? blog : `https://${blog}`;
}

/** How long ago `date` was, as a translation key and count: days, then 30-day months, then years. */
export function relativeAge(date: string, now: number): { key: TranslationKey; count?: number } {
  const days = Math.floor(Math.max(0, now - new Date(date).getTime()) / 86_400_000);
  if (days === 0) return { key: 'github.today' };
  if (days === 1) return { key: 'github.yesterday' };
  if (days < 30) return { key: 'github.daysAgo', count: days };
  const months = Math.floor(days / 30);
  if (months < 12) return { key: 'github.monthsAgo', count: months };
  return { key: 'github.yearsAgo', count: Math.floor(months / 12) };
}
