import type { CHAT_EN } from './chat.en';

// Finnish copy for /chat, fetched when the page opens in Finnish.
export const CHAT_FI = {
  'chat.subtitle':
    'Pieni tekoälymalli, joka toimii selaimessasi omalla laitteellasi. Kirjoittamaasi ei lähetetä minnekään.',
  'chat.modelHeading': 'Malli',
  'chat.intro':
    'Gemma 3 270M on Googlen pieni avoin malli. Selaimesi lataa sen kerran Hugging Facesta ja säilyttää sen tällä laitteella, jossa malli tekee kaiken työnsä.',
  'chat.checking': 'Tarkistetaan laitetta…',
  'chat.unsupported':
    'Tämä selain ei pysty ajamaan mallia. Se tarvitsee WebGPU:n, joka on Chromen, Edgen ja Safarin uusissa versioissa.',
  'chat.download': 'Lataa malli ({size} Mt)',
  'chat.downloadHelp': 'Lataus on suuri, joten puhelimella se kannattaa tehdä Wi-Fi-verkossa.',
  'chat.onDevice': 'Malli on tällä laitteella ja vie {size} Mt.',
  'chat.partial': 'Osa mallista on tällä laitteella ja vie {size} Mt.',
  'chat.start': 'Käynnistä malli',
  'chat.downloading': 'Ladataan mallia',
  'chat.starting': 'Käynnistetään mallia',
  'chat.progress': '{loaded} / {total} Mt',
  'chat.cancel': 'Peruuta',
  'chat.running': 'Malli on käynnissä ja vie tällä laitteella {size} Mt.',
  'chat.notKept':
    'Malli on käynnissä, mutta selaimesi ei tallentanut sen tiedostoja. Se ladataan ensi kerralla uudelleen.',
  'chat.delete': 'Poista malli',
  'chat.deleting': 'Poistetaan…',
  'chat.deleted': 'Malli on poistettu tältä laitteelta.',
  'chat.errorLoad':
    'Mallia ei voitu käynnistää. Lataus on voinut keskeytyä, tai laitteen muisti ei ehkä riitä mallille.',
  'chat.errorGenerate':
    'Malli pysähtyi ennen kuin vastaus valmistui. Käynnistä se uudelleen, niin voit jatkaa keskustelua.',
  'chat.errorDelete':
    'Mallia ei voitu poistaa. Se poistuu myös, kun tyhjennät tämän sivuston tiedot selaimen asetuksista.',
  'chat.conversationHeading': 'Keskustelu',
  'chat.locked': 'Käynnistä malli, niin voit keskustella sen kanssa.',
  'chat.empty': 'Kysy siltä jotain. Malli osaa englantia selvästi paremmin kuin suomea.',
  'chat.messages': 'Viestit',
  'chat.you': 'Sinä',
  'chat.gemma': 'Gemma',
  'chat.writing': 'Kirjoittaa…',
  'chat.answered': 'Gemma vastasi: {answer}',
  'chat.inputLabel': 'Viestisi',
  'chat.placeholder': 'Kirjoita viesti',
  'chat.send': 'Lähetä',
  'chat.stop': 'Pysäytä',
  'chat.clear': 'Tyhjennä keskustelu',
  'chat.disclaimer':
    'Näin pieni malli erehtyy usein ja keksii asioita, joten älä luota sen vastauksiin. Keskustelu säilyy vain siihen asti, kun poistut sivulta.',
  'chat.terms': 'Gemmaa koskevat Gemman käyttöehdot',
  'chat.runtime': 'Toimii Transformers.js-kirjastolla',
} satisfies Record<keyof typeof CHAT_EN, string>;
