import type { PATHFINDING_EN } from './pathfinding.en';

// Finnish copy for /pathfinding, fetched when the page opens in Finnish.
export const PATHFINDING_FI = {
  'pathfinding.subtitle':
    'Vertaa reittejä nelisuuntaisessa ruudukossa. Ruudun hinta maksetaan siihen siirryttäessä: tavallinen 1, keskihintainen 3, kallis 8.',
  'pathfinding.algorithm': 'Algoritmi',
  'pathfinding.speed': 'Nopeus',
  'pathfinding.speedHelp': '1–100 visualisointiaskelta sekunnissa.',
  'pathfinding.start': 'Aloita haku',
  'pathfinding.pause': 'Keskeytä',
  'pathfinding.resume': 'Jatka',
  'pathfinding.step': 'Yksi vaihe',
  'pathfinding.resetRun': 'Palauta ajo',
  'pathfinding.editTools': 'Ruudukon muokkaustyökalut',
  'pathfinding.moveStart': 'Siirrä alkua',
  'pathfinding.moveDestination': 'Siirrä kohdetta',
  'pathfinding.wallTool': 'Lisää tai poista seinä',
  'pathfinding.mediumTool': 'Keskihinta ×3',
  'pathfinding.highTool': 'Korkea hinta ×8',
  'pathfinding.eraseTool': 'Poista maasto',
  'pathfinding.clearGrid': 'Tyhjennä ruudukko',
  'pathfinding.newLayout': 'Uusi esimerkkiasettelu',
  'pathfinding.editHelp':
    'Valitse työkalu ja napsauta ruutua tai siirry siihen ja paina Enter. Nuolinäppäimillä voit liikkua ruutujen välillä. Seinät estävät kulun; vinottaisliikettä ei ole.',
  'pathfinding.ready': 'Valmis aloittamaan',
  'pathfinding.running': 'Tutkitaan…',
  'pathfinding.paused': 'Keskeytetty',
  'pathfinding.done': 'Haku valmis',
  'pathfinding.found': 'Reitti löytyi',
  'pathfinding.noRoute': 'Reittiä ei ole',
  'pathfinding.costModel': 'Ruudun hinta: 1 / 3 / 8',
  'pathfinding.elapsed': 'Visualisointiin kulunut aika',
  'pathfinding.elapsedHelp':
    'Aika sisältää toiston viiveet ja kertoo animaation keston, ei algoritmin raakaa suorituskykyä.',
  'pathfinding.gridLabel': 'Muokattava reitinhakuruudukko',
  'pathfinding.legend':
    'S: alku · G: kohde · ■: seinä · 3 / 8: maaston hinta · O: avoin · V: vierailtu · C: nykyinen · vihreät raidat: reitti',
  'pathfinding.visitedCount': 'Käydyt solmut',
  'pathfinding.pathLength': 'Reitin pituus (askelta)',
  'pathfinding.pathCost': 'Reitin hinta',
  'pathfinding.complexity': 'Aikavaativuus',
  'pathfinding.space': 'Tilavaativuus',
  'pathfinding.algorithms': 'Algoritmien erot',
  'pathfinding.time': 'Aika',
  'pathfinding.characteristics': 'Valintaperuste',
  'pathfinding.bfs': 'Leveyshaku',
  'pathfinding.dijkstra': 'Dijkstran algoritmi',
  'pathfinding.astar': 'A*-haku',
  'pathfinding.bfsDescription':
    'Tutki ruudukkoa kerros kerrallaan. Leveyshaku löytää vähiten siirtoja sisältävän reitin, kun jokaisen siirron hinta on sama. Se sivuuttaa maaston painot.',
  'pathfinding.dijkstraDescription':
    'Laajenna aina tähän asti edullisin reitti. Dijkstra huomioi maaston hinnat ja löytää minimihintaisen reitin, vaikka se olisi pidempi.',
  'pathfinding.astarDescription':
    'Valitse pienin arvioitu kokonaishinta: tähänastinen hinta sekä Manhattan-etäisyys kohteeseen. Heuristiikka on sallittu eikä vinottaisia siirtoja ole.',
  'pathfinding.bfsRequirement':
    'Lyhin reitti siirtojen määrällä mitattuna; maaston hinnat eivät vaikuta reitin valintaan.',
  'pathfinding.weightedRequirement':
    'Painotettu lyhin reitti; keskihintainen maasto maksaa 3 ja kallis 8.',
  'pathfinding.astarRequirement':
    'Painotettu lyhin reitti Manhattan-etäisyyden ohjaamana; optimaalinen tässä nelisuuntaisessa ruudukossa.',
  'pathfinding.startNode': 'Lähtösolmu',
  'pathfinding.startAndDestinationNode': 'Lähtö ja kohde',
  'pathfinding.destinationNode': 'Kohdesolmu',
  'pathfinding.wallNode': 'Seinä, kulku estetty',
  'pathfinding.normalNode': 'Tavallinen maasto, hinta 1',
  'pathfinding.mediumNode': 'Keskihintainen maasto, hinta 3',
  'pathfinding.highNode': 'Kallis maasto, hinta 8',
  'pathfinding.pathState': 'lopullinen reitti',
  'pathfinding.currentState': 'nykyinen solmu',
  'pathfinding.visitedState': 'vierailtu solmu',
  'pathfinding.frontierState': 'avoin solmu',
  'pathfinding.row': 'Rivi',
  'pathfinding.column': 'sarake',
} satisfies Record<keyof typeof PATHFINDING_EN, string>;
