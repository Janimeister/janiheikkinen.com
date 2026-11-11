import type { SORTING_EN } from './sorting.en';

// Finnish copy for /sorting, fetched when the page opens in Finnish.
export const SORTING_FI = {
  'sorting.elapsed': 'Animaatioon kulunut aika',
  'sorting.elapsedHelp':
    'Todellinen toistoaika sisältää valitun nopeuden mukaiset animaatioviiveet. Tauot ja käsin suoritetut vaiheet eivät lisää aikaa. Nopeuden vaihto vaikuttaa jäljellä olevaan toistoon, ei jo kuluneeseen aikaan. Tämä ei ole suorittimen nopeustesti.',
  'sorting.complexity': 'Aikavaativuus',
  'sorting.best': 'Paras tapaus',
  'sorting.average': 'Keskimäärin',
  'sorting.worst': 'Pahin tapaus',
  'sorting.complexityHelp':
    'n on lukujen määrä. O-merkintä kuvaa työmäärän kasvua n:n kasvaessa; animaation nopeus ei muuta sitä. Kuplalajittelu voi pysähtyä ajassa O(n), ja lisäyslajittelu toimii lähes järjestetyllä syötteellä ajassa O(n). Lomituslajittelu on aina O(n log n). Tämä pikalajittelu käyttää viimeistä lukua pivotina, joten järjestetty syöte voi hidastua aikaan O(n²). Tilavaativuus kuvaa tavallista algoritmia ilman visualisoinnin tilaa.',
  'sorting.subtitle':
    'Seuraa järjestyksen syntymistä vaihe kerrallaan. Vertaa neljää menetelmää samoilla sekoitetuilla luvuilla.',
  'sorting.algorithm': 'Algoritmi',
  'sorting.size': 'Lukujen määrä',
  'sorting.sizeHelp': '5–80 lukua, jotta pylväät erottuvat selkeästi.',
  'sorting.speed': 'Nopeus',
  'sorting.speedHelp': '1–100 vaihetta sekunnissa. Voit säätää myös ajon aikana.',
  'sorting.start': 'Aloita',
  'sorting.pause': 'Keskeytä',
  'sorting.resume': 'Jatka',
  'sorting.step': 'Yksi vaihe',
  'sorting.reset': 'Palauta',
  'sorting.shuffle': 'Sekoita',
  'sorting.controlsHelp':
    'Palautus ja algoritmin vaihto palauttavat samat luvut. Määrän muuttaminen tai sekoitus luo uuden joukon. Yksi vaihe -painikkeella voit tutkia ilman automaattista toistoa.',
  'sorting.comparisons': 'Vertailut',
  'sorting.writes': 'Kirjoitukset',
  'sorting.chart': 'Lajittelun visualisointi: {count} lukua. Nykyiset arvot löytyvät alta.',
  'sorting.legend':
    'Paksu yläreuna: vertailu · ⇄: vaihto · Katkoviiva: osa · P: pivot · Vaakaraidat: järjestetty alkuosa (voi siirtyä) · Vinoraidat: siirto tai lopullinen paikka · K: talteen otettu luku · ↓: lisäyskohta',
  'sorting.values': 'Nykyiset arvot',
  'sorting.space': 'Työmuisti',
  'sorting.spaceHelp':
    'Arvot kuvaavat tavanomaista algoritmia; tapahtumageneraattori ja visualisointi käyttävät lisäksi muistia.',
  'sorting.bubble': 'Kuplalajittelu',
  'sorting.merge': 'Lomituslajittelu',
  'sorting.bubbleDescription':
    'Vertaa vierekkäisiä lukuja ja vaihda niiden paikat tarvittaessa. Jokainen kierros siirtää suurimman jäljellä olevan luvun loppuun. Lajittelu päättyy, kun vaihtoja ei enää tarvita.',
  'sorting.mergeDescription':
    'Jaa taulukko puoliksi, lajittele puolikkaat ja lomita ne järjestykseen. Animaatio vertaa puolikkaita ja kirjoittaa sitten lomitetun tuloksen takaisin. Kirjoituksen aikana sama arvo voi näkyä väliaikaisesti useasti.',
  'sorting.ready': 'Valmis aloittamaan',
  'sorting.running': 'Lajitellaan…',
  'sorting.paused': 'Keskeytetty',
  'sorting.done': 'Lajiteltu!',
  'sorting.insertion': 'Lisäyslajittelu',
  'sorting.quick': 'Pikalajittelu',
  'sorting.insertionDescription':
    'Pidä alkuosa järjestyksessä ja lisää seuraava luku oikealle paikalleen. Vakaa ja paikallinen algoritmi toimii hyvin lyhyillä ja lähes järjestetyillä listoilla.',
  'sorting.quickDescription':
    'Jaa lista viimeisen luvun eli pivotin avulla ja lajittele osat erikseen. Keskimäärin nopea ja paikallinen, mutta tämä pivot-valinta voi hidastua neliölliseksi jo valmiiksi järjestetyllä listalla.',
  'sorting.stability': 'Vakaa',
  'sorting.inPlace': 'Paikallinen',
  'sorting.stable': 'Kyllä',
  'sorting.unstable': 'Ei',
  'sorting.yes': 'Kyllä',
  'sorting.no': 'Ei',
  'sorting.pivotLabel': 'Pivot',
  'sorting.keyLabel': 'Lisättävä luku',
  'sorting.sortedLabel': 'Lopullinen järjestetty paikka',
  'sorting.prefixLabel': 'Järjestetty alkuosa (voi vielä siirtyä)',
  'sorting.valueLabel': 'Luku',
  'sorting.insertingValue':
    'Lisätään lukua {value}; K merkitsee tallennettua lukua ja nuoli sen lopullista paikkaa.',
} satisfies Record<keyof typeof SORTING_EN, string>;
