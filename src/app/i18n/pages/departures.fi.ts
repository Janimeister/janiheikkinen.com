import type { DEPARTURES_EN } from './departures.en';

// Finnish copy for /departures, fetched when the page opens in Finnish.
export const DEPARTURES_FI = {
  'departures.subtitle':
    'Ajantasaiset lähdöt miltä tahansa HSL-pysäkiltä tai -asemalta, päivittyy 30 sekunnin välein.',
  'departures.findStop': 'Etsi pysäkki',
  'departures.searchPlaceholder': 'Pysäkin nimi tai tunnus',
  'departures.searchHelp':
    'Kirjoita vähintään 3 merkkiä, esim. Kamppi tai H1234. Asema kokoaa metro- tai juna-aseman laiturit yhteen.',
  'departures.searching': 'Haetaan…',
  'departures.searchError': 'Haku epäonnistui. Yritä uudelleen.',
  'departures.noMatches': 'Hakua "{query}" vastaavia pysäkkejä ei löytynyt.',
  'departures.matches': '{count} hakua vastaavaa pysäkkiä',
  'departures.recent': 'Viimeksi',
  'departures.try': 'Kokeile',
  'departures.platformShort': 'laituri {platform}',
  'departures.loadError': 'Lähtöjä ei voitu ladata. Yritä myöhemmin uudelleen.',
  'departures.notFound':
    'Pysäkkiä ei voitu ladata. Se on ehkä poistunut käytöstä; hae se uudelleen.',
  'departures.retry': 'Yritä uudelleen',
  'departures.updated': 'Päivitetty {time}',
  'departures.refresh': 'Päivitä',
  'departures.refreshFailed': 'Päivitys epäonnistui, näytetään {time}',
  'departures.boardRegion': 'Lähtötaulu',
  'departures.line': 'Linja',
  'departures.destination': 'Määränpää',
  'departures.platform': 'Lait.',
  'departures.departs': 'Lähtee',
  'departures.now': 'nyt',
  'departures.late': 'myöhässä',
  'departures.cancelled': 'Peruttu',
  'departures.realtime': 'Reaaliaikainen arvio:',
  'departures.legend': 'Reaaliaikainen arvio; muut ajat ovat aikataulusta.',
  'departures.noDepartures': 'Ei lähtöjä seuraavan 24 tunnin aikana.',
  'departures.attribution': 'Tiedot © Digitransit (HSL), CC BY 4.0',
  'departures.mode.bus': 'Bussi',
  'departures.mode.tram': 'Ratikka',
  'departures.mode.subway': 'Metro',
  'departures.mode.rail': 'Juna',
  'departures.mode.ferry': 'Lautta',
  'departures.mode.other': 'Pysäkki',
} satisfies Record<keyof typeof DEPARTURES_EN, string>;
