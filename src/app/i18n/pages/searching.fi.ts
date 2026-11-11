import type { SEARCHING_EN } from './searching.en';

// Finnish copy for /searching, fetched when the page opens in Finnish.
export const SEARCHING_FI = {
  'searching.subtitle':
    'Seuraa lukua järjestetyssä listassa. Lineaarinen haku tarkistaa luvut yksi kerrallaan; binäärihaku puolittaa etsintäalueen jokaisella askeleella.',
  'searching.algorithm': 'Algoritmi',
  'searching.size': 'Lukujen määrä',
  'searching.sizeHelp': '1–80 erillistä, järjestettyä lukua.',
  'searching.target': 'Etsittävä luku',
  'searching.speed': 'Nopeus',
  'searching.speedHelp': '1–100 askelta sekunnissa.',
  'searching.start': 'Aloita haku',
  'searching.pause': 'Keskeytä',
  'searching.resume': 'Jatka',
  'searching.step': 'Yksi vaihe',
  'searching.reset': 'Palauta haku',
  'searching.regenerate': 'Uudet luvut',
  'searching.presentTarget': 'Valitse listassa oleva luku',
  'searching.missingTarget': 'Valitse puuttuva luku',
  'searching.elapsed': 'Visualisointiin kulunut aika',
  'searching.elapsedHelp':
    'Aika sisältää valitun animaatioviiveen; tämä ei ole suorittimen nopeustesti.',
  'searching.chart': 'Hakualgoritmin visualisointi: {count} järjestettyä lukua.',
  'searching.legend':
    '?: tarkistettu luku · M: binäärihaun keskikohta · Raidat: tarkistettu tai ohitettu · ✓: etsitty luku löytyi',
  'searching.comparisons': 'Vertailut',
  'searching.inspected': 'Tarkistetut luvut',
  'searching.result': 'Tulos',
  'searching.index': 'Luvun indeksi',
  'searching.values': 'Nykyiset järjestetyt luvut',
  'searching.time': 'Aika',
  'searching.space': 'Tila',
  'searching.requirements': 'Vaatimukset',
  'searching.complexity': 'Algoritmien erot',
  'searching.linear': 'Lineaarinen haku',
  'searching.binary': 'Binäärihaku',
  'searching.linearDescription':
    'Tarkista luvut vasemmalta oikealle, kunnes kohde löytyy tai lista loppuu. Toimii myös lajittelemattomalla datalla, mutta voi tarkistaa jokaisen luvun.',
  'searching.binaryDescription':
    'Vertaa keskimmäiseen lukuun ja hylkää puolet jäljellä olevasta alueesta kerrallaan. Varsinainen iteroiva haku vaatii järjestetyn syötteen, tekee O(log n) tarkistusta ja käyttää O(1) tilaa hakutilan ylläpitoon. Animaatiota varten generaattori luo lisäksi taulukoita hylätyistä indekseistä, joten animaatiotapahtumien tuottaminen vaatii pahimmillaan O(n) työtä ja O(n) lisätilaa.',
  'searching.unsortedAllowed': 'Toimii järjestämättömällä datalla; aika O(n), tila O(1).',
  'searching.sortedRequired':
    'Vaatii järjestetyn datan. Esitetyt aika- ja tilavaativuudet kuvaavat varsinaista hakua ilman animaatiotapahtumien tuottamista.',
  'searching.ready': 'Valmis aloittamaan',
  'searching.running': 'Etsitään…',
  'searching.paused': 'Keskeytetty',
  'searching.done': 'Haku valmis',
  'searching.found': 'Luku löytyi',
  'searching.notFound': 'Lukua ei löytynyt',
  'searching.foundBar': 'Etsitty luku löytyi',
  'searching.currentBar': 'Nykyinen luku',
  'searching.eliminatedBar': 'Jäljellä olevan alueen ulkopuolella',
  'searching.checkedBar': 'Jo tarkistettu',
  'searching.valueBar': 'Luku',
} satisfies Record<keyof typeof SEARCHING_EN, string>;
