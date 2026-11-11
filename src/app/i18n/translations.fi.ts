import type { CoreTranslationKey } from './translations';

// Loaded on demand by LanguageService, so English-only visits never download it.
export const FI_TRANSLATIONS = {
  'explore.navigation': 'Päänavigaatio',
  'explore.open': 'Tutustu',
  'explore.title': 'Mitä haluat tutkia?',
  'explore.close': 'Sulje',
  'explore.search': 'Etsi sivu',
  'explore.placeholder': 'Kokeile lajittelua, säätä tai pelejä…',
  'explore.surprise': 'Yllätä minut',
  'explore.results': '{count} hakua vastaavaa sivua',
  'explore.noResults': 'Sivuja ei löytynyt. Kokeile toista hakua.',
  'explore.everyday': 'Arki',
  'explore.experiments': 'Kokeilut',
  'explore.play': 'Pelit',
  'explore.about': 'Tietoa',
  'explore.homeDescription': 'Tutustu Janiin',
  'explore.homeKeywords': 'profiili henkilö esittely',
  'explore.weatherDescription': 'Katso sääennuste',
  'explore.weatherKeywords': 'sää ennuste lämpötila sade',
  'explore.electricityDescription': 'Tutki sähkön hintoja',
  'explore.electricityKeywords': 'energia sähkö pörssisähkö hinta',
  'explore.githubDescription': 'Tutki koodausprojektejani',
  'explore.githubKeywords': 'koodi projektit repositoriot',
  'explore.asciiDescription': 'Luo taidetta merkeistä',
  'explore.asciiKeywords': 'generatiivinen taide fraktaalit grafiikka',
  'explore.snakeDescription': 'Klassinen matopeli',
  'explore.snakeKeywords': 'pelit arcade retro mato',
  'explore.petDescription': 'Tapaa digitaalinen lemmikkisi',
  'explore.petKeywords': 'pelit eläin lemmikki',
  'explore.sortingDescription': 'Katso algoritmeja toiminnassa',
  'explore.sortingKeywords': 'algoritmit kupla lisäys lomitus pika lajittelu visualisointi',
  'explore.searchingDescription': 'Katso, miten hakualgoritmit löytävät arvon',
  'explore.searchingKeywords': 'algoritmit haku lineaarinen binääriarvo etsi',
  'explore.pathfindingDescription': 'Tutki reittejä painotetulla ruudukolla',
  'explore.pathfindingKeywords': 'algoritmit reitinhaku verkko leveys dijkstra a tähti reitti',
  'explore.tramsDescription': 'Helsingin ratikat reaaliajassa merkkikartalla',
  'explore.tramsKeywords': 'ratikka raitiovaunu hsl reaaliaikainen joukkoliikenne kartta helsinki',

  'language.label': 'Kieli',

  'algorithms.navigation': 'Algoritmien visualisoinnit',
  'algorithms.sorting': 'Lajittelu',
  'algorithms.searching': 'Haku',
  'algorithms.pathfinding': 'Reitinhaku',

  'nav.home': 'Etusivu',
  'nav.weather': 'Sää',

  'common.backToHome': 'Takaisin etusivulle',
  'common.now': 'Nyt',
  'common.today': 'Tänään',
  'common.unknown': 'Tuntematon',

  'footer.thirdPartyNotices': 'Kolmansien osapuolten ilmoitukset',
  'footer.builtWith': 'Rakennettu <3 GitHub Copilotin ja Angularin avulla',

  'cookie.title': 'Tietosuoja',
  'cookie.storage':
    'Sivusto ei käytä evästeitä eikä analytiikkaa. Selaimesi localStorage säilyttää vain asetuksesi: kielen, raitiovaunukartan näkymän, viimeksi katsotut pysäkit, laitteiden käyttöasetukset, virtuaalilemmikin, matopelin ennätyksen ja tiedon, että olet lukenut tämän ilmoituksen.',
  'cookie.services':
    'Sivut, joilla on ajantasaista tietoa, hakevat sen suoraan lähteestä, joka näkee IP-osoitteesi: Open-Meteo (sää ja sijaintihaku), Pörssisähkön edessä oleva Cloudflare Worker (sähkön hinnat), Digitransitin edessä oleva Cloudflare Worker (lähdöt), GitHub, catfact.ninja ja HSL (raitiovaunut livenä). Fontit tulevat tältä sivustolta.',
  'cookie.accept': 'Selvä',

  'hero.sticker': 'Moikka!',
  'hero.role1': 'Voi pojat',
  'hero.role2': 'Parasta ikinä',
  'hero.catFactFallback':
    'Kissat nukkuvat noin 13-16 tuntia päivässä. (Faktapalvelukin taitaa olla päiväunilla - yritä myöhemmin uudelleen!)',

  'thirdParty.title': 'Kolmansien osapuolten ilmoitukset',
  'thirdParty.loadError': 'Kolmansien osapuolten ilmoituksia ei voitu ladata.',

  'meta.home':
    'Jani Heikkisen kotisivu: ajantasainen sää, Suomen pörssisähkön hinnat, Helsingin raitiovaunut, HSL-lähdöt, GitHub-aktiivisuus, algoritmien visualisoinnit, ASCII-taidetta ja pieniä selainpelejä.',
  'meta.weather':
    'Mikä tahansa paikka: sää nyt, 24 tunnin ennuste ja tuleva viikko Open-Meteon tiedoilla.',
  'meta.electricity':
    'Suomen pörssisähkön hinnat tänään ja huomenna vartin välein, sis. ALV, sekä halvimmat ja kalleimmat ajat.',
  'meta.trams':
    'Helsingin raitiovaunuverkko ASCII-merkein, ja jokainen ratikka liikkuu livenä HSL:n reaaliaikaisen syötteen mukaan.',
  'meta.github': 'Jani Heikkisen GitHub-profiili: repositoriot, kielet ja viimeaikainen toiminta.',
  'meta.ascii':
    'Proseduraalista ASCII-taidetta: plasmaa, fraktaaleja, galakseja, maastoa ja muuta, joka kerta uutena.',
  'meta.snake':
    'Klassinen matopeli selaimessa näppäimistöllä, pyyhkäisyillä tai näytön painikkeilla.',
  'meta.pet': 'Kuoriuta virtuaalilemmikki ja pidä siitä huolta selaimessasi.',
  'meta.sorting':
    'Katso kupla-, lisäys-, lomitus- ja pikalajittelu vaihe vaiheelta vaativuustietojen kera.',
  'meta.searching':
    'Vertaa peräkkäishakua ja binäärihakua vaihe vaiheelta samoilla järjestetyillä arvoilla.',
  'meta.pathfinding':
    'Vertaa BFS-, Dijkstra- ja A*-algoritmeja ruudukossa, jossa on seiniä ja maastokustannuksia.',
  'meta.thirdParty':
    'Sivuston käyttämien avoimen lähdekoodin ohjelmistojen, aineistojen ja fonttien lisenssit ja lähdetiedot.',
  'notFound.title': 'Sivua ei löytynyt',
  'notFound.body':
    'Tästä osoitteesta ei löydy mitään. Sivu on ehkä siirtynyt, tai linkissä on kirjoitusvirhe.',
  'notFound.home': 'Siirry etusivulle',

  'explore.departuresDescription': 'Seuraavat lähdöt miltä tahansa HSL-pysäkiltä',
  'explore.departuresKeywords':
    'lähdöt aikataulu bussi ratikka raitiovaunu metro juna pysäkki hsl joukkoliikenne reaaliaikainen',
  'meta.departures':
    'Ajantasaiset lähdöt miltä tahansa HSL-alueen pysäkiltä tai asemalta: bussit, raitiovaunut, metro, junat ja lautat.',

  // Page headings, also used by the launcher and the browser tab; the rest of each page's copy
  // lives in ./pages.
  'weather.title': 'Sääolosuhteet',
  'electricity.title': 'Sähkön hinnat',
  'trams.title': 'Ratikkakartta',
  'departures.title': 'Lähdöt',
  'github.title': 'GitHub-profiili',
  'ascii.title': 'ASCII-taide',
  'snake.title': 'Matopeli',
  'pet.title': 'Virtuaalilemmikki',
  'sorting.title': 'Lajittelualgoritmit',
  'searching.title': 'Hakualgoritmit',
  'pathfinding.title': 'Reitinhakualgoritmit',
} satisfies Record<CoreTranslationKey, string>;
