import type { PageTranslationKey } from './pages';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'EN', nativeName: 'English' },
  { code: 'fi', label: 'FI', nativeName: 'Suomi' },
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * Copy the whole site needs: navigation, the launcher, page headings and meta descriptions.
 * It ships in the main bundle. Each page's own copy lives in `./pages`.
 */
export const EN_TRANSLATIONS = {
  'explore.navigation': 'Main navigation',
  'explore.open': 'Explore',
  'explore.title': 'What will you explore?',
  'explore.close': 'Close',
  'explore.search': 'Find a page',
  'explore.placeholder': 'Try sorting, weather or games…',
  'explore.surprise': 'Surprise me',
  'explore.results': '{count} matching pages',
  'explore.noResults': 'No matching pages. Try another search.',
  'explore.everyday': 'Everyday',
  'explore.experiments': 'Experiments',
  'explore.play': 'Play',
  'explore.about': 'About',
  'explore.homeDescription': 'Meet Jani',
  'explore.homeKeywords': 'profile personal introduction',
  'explore.weatherDescription': 'Check the forecast',
  'explore.weatherKeywords': 'forecast temperature rain',
  'explore.electricityDescription': 'Explore electricity prices',
  'explore.electricityKeywords': 'energy power spot prices',
  'explore.githubDescription': 'Explore my coding activity',
  'explore.githubKeywords': 'code repositories projects',
  'explore.asciiDescription': 'Generate art from characters',
  'explore.asciiKeywords': 'generative art fractals graphics',
  'explore.snakeDescription': 'The classic arcade game',
  'explore.snakeKeywords': 'games arcade retro',
  'explore.petDescription': 'Meet your digital companion',
  'explore.petKeywords': 'games animal companion',
  'explore.sortingDescription': 'Watch algorithms in action',
  'explore.sortingKeywords': 'algorithms bubble insertion merge quick sort visualization',
  'explore.searchingDescription': 'See how search strategies narrow in on a value',
  'explore.searchingKeywords': 'algorithms search linear binary target find',
  'explore.pathfindingDescription': 'Explore routes across a weighted grid',
  'explore.pathfindingKeywords': 'algorithms pathfinding graph bfs dijkstra a star route',
  'explore.tramsDescription': "Helsinki's trams live on a text map",
  'explore.tramsKeywords': 'trams helsinki hsl live realtime public transport transit map',
  'explore.departuresDescription': 'Next departures from any HSL stop',
  'explore.departuresKeywords':
    'departures timetable bus tram metro train stop hsl public transport realtime',

  'language.label': 'Language',

  'algorithms.navigation': 'Algorithm visualizers',
  'algorithms.sorting': 'Sorting',
  'algorithms.searching': 'Searching',
  'algorithms.pathfinding': 'Pathfinding',

  'nav.home': 'Home',
  'nav.weather': 'Weather',

  'common.backToHome': 'Back to Home',
  'common.now': 'Now',
  'common.today': 'Today',
  'common.unknown': 'Unknown',

  'footer.thirdPartyNotices': 'Third-Party Notices',
  'footer.builtWith': 'Built with <3 & GitHub Copilot & Angular',

  'cookie.title': 'Privacy note',
  'cookie.storage':
    "This site sets no cookies and has no analytics. Your browser's localStorage keeps only your settings: language, tram map view, recent departure stops, appliance run settings, virtual pet, Snake high score and that you have read this note.",
  'cookie.services':
    'Pages with live data fetch it straight from the source, which sees your IP address: Open-Meteo (weather and location search), a Cloudflare Worker in front of Pörssisähkö (electricity prices), a Cloudflare Worker in front of Digitransit (departures), GitHub, catfact.ninja and HSL (live trams). Fonts are served from this site.',
  'cookie.accept': 'Got it',

  'hero.sticker': 'Hello there!',
  'hero.role1': 'Oh boy',
  'hero.role2': 'Best ever',
  'hero.catFactFallback':
    'Cats sleep for around 13 to 16 hours a day. (Fact service is napping too - try again later!)',

  'thirdParty.title': 'Third-Party Notices',
  'thirdParty.loadError': 'Could not load third-party notices.',

  'meta.home':
    'Personal site of Jani Heikkinen: live weather, Finnish electricity spot prices, Helsinki trams, HSL departures, GitHub activity, algorithm visualizers, ASCII art and small browser games.',
  'meta.weather':
    'Current conditions, a 24-hour forecast and the week ahead for any place, with data from Open-Meteo.',
  'meta.electricity':
    "Today's and tomorrow's Finnish electricity spot prices in 15-minute slots, VAT included, with the cheapest and priciest times.",
  'meta.trams':
    "Helsinki's tram network drawn in ASCII, with every tram moving live from HSL's real-time feed.",
  'meta.departures':
    'Live departures from any HSL stop or station in the Helsinki region: buses, trams, metro, trains and ferries.',
  'meta.github': "Jani Heikkinen's GitHub profile: repositories, languages and recent activity.",
  'meta.ascii':
    'Procedural ASCII art: plasma, fractals, galaxies, terrain and more, generated fresh every time.',
  'meta.snake':
    'The classic Snake game in the browser, with keyboard, swipe and on-screen controls.',
  'meta.pet': 'Hatch and look after a virtual pet that lives in your browser.',
  'meta.sorting':
    'Watch Bubble, Insertion, Merge and Quick Sort work step by step, with complexity notes.',
  'meta.searching': 'Compare Linear and Binary Search step by step on the same ordered values.',
  'meta.pathfinding': 'Compare BFS, Dijkstra and A* on a grid with walls and terrain costs.',
  'meta.thirdParty':
    'Licenses and attributions for the open source software, data and fonts this site uses.',
  'notFound.title': 'Page not found',
  'notFound.body': "There's nothing at this address. It may have moved, or the link has a typo.",
  'notFound.home': 'Go to the home page',

  // Page headings, also used by the launcher and the browser tab; the rest of each page's copy
  // lives in ./pages.
  'weather.title': 'Weather Conditions',
  'electricity.title': 'Electricity Prices',
  'trams.title': 'Tram Map',
  'departures.title': 'Departures',
  'github.title': 'GitHub Profile',
  'ascii.title': 'ASCII Art',
  'snake.title': 'Snake Game',
  'pet.title': 'Virtual Pet',
  'sorting.title': 'Sorting Algorithms',
  'searching.title': 'Search Algorithms',
  'pathfinding.title': 'Pathfinding Algorithms',
} as const;

export type CoreTranslationKey = keyof typeof EN_TRANSLATIONS;

/** Every key `LanguageService.t()` accepts: the shared copy plus each page's own. */
export type TranslationKey = CoreTranslationKey | PageTranslationKey;

export type Dictionary = Readonly<Record<string, string>>;
