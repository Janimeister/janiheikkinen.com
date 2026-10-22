import { describe, expect, it } from 'vitest';
import {
  activityItems,
  blogUrl,
  langColor,
  languageShares,
  ownRepos,
  relativeAge,
  type GitHubEvent,
  type GitHubRepo,
} from './github-data';

function repo(name: string, overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name,
    description: null,
    html_url: `https://github.com/Janimeister/${name}`,
    language: 'TypeScript',
    stargazers_count: 0,
    forks_count: 0,
    updated_at: '2026-10-01T12:00:00Z',
    topics: [],
    fork: false,
    ...overrides,
  };
}

function event(type: string, id = type, repoName = 'Janimeister/site'): GitHubEvent {
  return { id, type, repo: { name: repoName }, created_at: '2026-10-10T08:00:00Z', payload: {} };
}

describe('ownRepos', () => {
  it('drops forks and puts the most recently updated first', () => {
    const repos = [
      repo('old', { updated_at: '2025-01-01T00:00:00Z' }),
      repo('forked', { fork: true, updated_at: '2026-10-11T00:00:00Z' }),
      repo('new', { updated_at: '2026-10-10T00:00:00Z' }),
    ];
    expect(ownRepos(repos).map((r) => r.name)).toEqual(['new', 'old']);
    expect(repos.map((r) => r.name)).toEqual(['old', 'forked', 'new']);
  });
});

describe('languageShares', () => {
  it('counts main languages, most used first, ignoring repositories without one', () => {
    const shares = languageShares([
      repo('a', { language: 'Python' }),
      repo('b', { language: 'TypeScript' }),
      repo('c', { language: 'TypeScript' }),
      repo('d', { language: null }),
      repo('e', { language: 'Go' }),
    ]);
    expect(shares).toEqual([
      { name: 'TypeScript', count: 2, pct: 50 },
      { name: 'Python', count: 1, pct: 25 },
      { name: 'Go', count: 1, pct: 25 },
    ]);
  });

  it('is empty when nothing has a language', () => {
    expect(languageShares([])).toEqual([]);
    expect(languageShares([repo('a', { language: null })])).toEqual([]);
  });
});

describe('activityItems', () => {
  it('labels known events, falls back for others and drops the owner from repo names', () => {
    const items = activityItems([
      event('PushEvent'),
      event('GollumEvent', 'wiki'),
      event('WatchEvent', 'star', 'someone/else'),
    ]);
    expect(items).toEqual([
      {
        id: 'PushEvent',
        type: 'PushEvent',
        icon: '🚀',
        actionKey: 'github.eventPush',
        repo: 'site',
        date: '2026-10-10T08:00:00Z',
      },
      expect.objectContaining({ icon: '📌', actionKey: 'github.eventUnknown' }),
      expect.objectContaining({ icon: '⭐', repo: 'else' }),
    ]);
  });

  it('keeps the ten latest', () => {
    const events = Array.from({ length: 15 }, (_, i) => event('PushEvent', String(i)));
    expect(activityItems(events).map((e) => e.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => String(i)),
    );
  });
});

describe('relativeAge', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

  it('steps from days to months to years', () => {
    expect(relativeAge(ago(0.5), now)).toEqual({ key: 'github.today' });
    expect(relativeAge(ago(1), now)).toEqual({ key: 'github.yesterday' });
    expect(relativeAge(ago(29), now)).toEqual({ key: 'github.daysAgo', count: 29 });
    expect(relativeAge(ago(30), now)).toEqual({ key: 'github.monthsAgo', count: 1 });
    expect(relativeAge(ago(359), now)).toEqual({ key: 'github.monthsAgo', count: 11 });
    expect(relativeAge(ago(360), now)).toEqual({ key: 'github.yearsAgo', count: 1 });
    expect(relativeAge(ago(800), now)).toEqual({ key: 'github.yearsAgo', count: 2 });
  });

  it('treats a time in the future (clock skew) as today', () => {
    expect(relativeAge(ago(-2), now)).toEqual({ key: 'github.today' });
  });
});

describe('helpers', () => {
  it('turns a bare domain into a link and keeps full URLs', () => {
    expect(blogUrl('janiheikkinen.com')).toBe('https://janiheikkinen.com');
    expect(blogUrl('https://janiheikkinen.com')).toBe('https://janiheikkinen.com');
    expect(blogUrl('HTTP://example.com')).toBe('HTTP://example.com');
    // Only a real scheme counts, not a name that happens to start with "http".
    expect(blogUrl('httpbin.org')).toBe('https://httpbin.org');
  });

  it('colours known languages and greys out the rest', () => {
    expect(langColor('TypeScript')).toBe('bg-pop-sky');
    expect(langColor('COBOL')).toBe('bg-gray-400');
  });
});
