import type { ASCII_EN } from './ascii.en';

// Finnish copy for /ascii, fetched when the page opens in Finnish.
export const ASCII_FI = {
  'ascii.subtitle': 'Proseduraalisesti luotua ASCII-taidetta',
  'ascii.algorithm': 'Algoritmi:',
  'ascii.generate': 'Luo',
  'ascii.generateAria': 'Luo uusi ASCII-taide',
  'ascii.outputRegion': 'ASCII-taiteen tulos',
  'ascii.generatedArt': 'Luotu ASCII-taide',
  'ascii.plasma': 'Plasma',
  'ascii.mandelbrot': 'Mandelbrot',
  'ascii.waves': 'Aallot',
  'ascii.spiral': 'Galaksi',
  'ascii.terrain': 'Maasto',
  'ascii.coral': 'Korallikukinto',
  'ascii.windlines': 'Tuuliviivat',
  'ascii.island': 'Saaren korkeuskäyrät',
} satisfies Record<keyof typeof ASCII_EN, string>;
