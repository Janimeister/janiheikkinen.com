import type { GITHUB_EN } from './github.en';

// Finnish copy for /github, fetched when the page opens in Finnish.
export const GITHUB_FI = {
  'github.subtitle': 'Julkiset repot ja aktiivisuus',
  'github.loadError':
    'GitHub-tietoja ei voitu ladata. API voi olla rajoitettu - yritä myöhemmin uudelleen.',
  'github.reposLoadError':
    'Repositorioita ei voitu ladata. API voi olla rajoitettu - yritä myöhemmin uudelleen.',
  'github.activityLoadError':
    'Viimeaikaista aktiivisuutta ei voitu ladata. API voi olla rajoitettu - yritä myöhemmin uudelleen.',
  'github.memberSince': 'Jäsen vuodesta {year}',
  'github.stats': 'Tilastot',
  'github.repositoriesCount': 'Repot',
  'github.followers': 'Seuraajat',
  'github.following': 'Seuratut',
  'github.gists': 'Gistit',
  'github.languages': 'Kielet',
  'github.repoCount': '{count} repositoriota',
  'github.repoCountOne': '1 repositorio',
  'github.repositories': 'Repot',
  'github.updated': 'Päivitetty {date}',
  'github.recentActivity': 'Viimeaikainen aktiivisuus',
  'github.today': 'tänään',
  'github.yesterday': 'eilen',
  'github.daysAgo': '{count} päivää sitten',
  'github.monthsAgo': '{count} kk sitten',
  'github.yearsAgo': '{count} v sitten',
  'github.eventPush': 'Puski muutoksia',
  'github.eventCreate': 'Loi haaran/tagin kohteessa',
  'github.eventDelete': 'Poisti haaran/tagin kohteessa',
  'github.eventIssues': 'Issue-aktiivisuutta kohteessa',
  'github.eventIssueComment': 'Kommentoi issueen kohteessa',
  'github.eventPullRequest': 'PR-aktiivisuutta kohteessa',
  'github.eventPullRequestReview': 'Katselmoi PR:n kohteessa',
  'github.eventWatch': 'Tähtimerkitsi',
  'github.eventFork': 'Forkkasi',
  'github.eventRelease': 'Julkaisi release-version kohteessa',
  'github.eventUnknown': 'Aktiivisuutta kohteessa',
} satisfies Record<keyof typeof GITHUB_EN, string>;
