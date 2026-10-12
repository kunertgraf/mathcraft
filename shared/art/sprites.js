// Hand-authored sprites and a 5×7 bitmap font, as text grids.
import { INK, UI, RAMPS } from './palette.js';

// ---------- Characters & items ----------
// Each char maps to a colour; '.' is transparent.
const PIP_COLOURS = {
  K: INK,
  Y: UI.hat,
  y: UI.hatShade,
  w: '#fff3c4',
  S: UI.skin,
  s: UI.skinShade,
  E: INK,
  p: UI.cheek,
  B: UI.shirt,
  b: UI.shirtShade,
  D: RAMPS.wood[1],
};

export const SPRITES = {
  // Pip, the builder guide. 12×16.
  pip: {
    colours: PIP_COLOURS,
    rows: [
      '....KKKK....',
      '...KYwYYK...',
      '..KYwYYYyK..',
      '.KyyyyyyyyK.',
      '..KSSSSSSK..',
      '..KSESSESK..',
      '..KSSSSSSK..',
      '..KpSSSSpK..',
      '...KKKKKK...',
      '..KBBBBBBK..',
      '.KSBBBBBBSK.',
      '.KSBbBBbBSK.',
      '..KBBBBBBK..',
      '..KDDDDDDK..',
      '..KDDKKDDK..',
      '..KKK..KKK..',
    ],
  },
  // Gem / reward. 8×8.
  gem: {
    colours: { K: INK, a: RAMPS.diamond[0], b: RAMPS.diamond[1], c: RAMPS.diamond[2], w: '#ffffff' },
    rows: [
      '..KKKK..',
      '.KcwbbK.',
      'KcwbbbbK',
      'KbbbbbaK',
      '.KbbbaK.',
      '..KbaK..',
      '...KK...',
      '........',
    ],
  },
  // Star for effort rewards. 9×9.
  star: {
    colours: { K: INK, a: RAMPS.gold[0], b: RAMPS.gold[1], c: RAMPS.gold[2] },
    rows: [
      '....K....',
      '...KcK...',
      'KKKKcbKKK',
      'KccbbbbaK',
      '.KbbbbaK.',
      '.KbbKbaK.',
      'KbaK.KbaK',
      'KaK...KaK',
      'KK.....KK',
    ],
  },
};

const spriteCache = new Map();

export function sprite(name) {
  if (!spriteCache.has(name)) {
    const { colours, rows } = SPRITES[name];
    const c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    const ctx = c.getContext('2d');
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = colours[ch];
        ctx.fillRect(x, y, 1, 1);
      }),
    );
    spriteCache.set(name, c);
  }
  return spriteCache.get(name);
}

// ---------- 5×7 bitmap font (titles, numbers) ----------
const G = (s) => s.split(' ');
export const FONT = {
  0: G('.###. #...# #...# #...# #...# #...# .###.'),
  1: G('..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.'),
  2: G('.###. #...# ....# ...#. ..#.. .#... #####'),
  3: G('##### ...#. ..#.. ...#. ....# #...# .###.'),
  4: G('...#. ..##. .#.#. #..#. ##### ...#. ...#.'),
  5: G('##### #.... ####. ....# ....# #...# .###.'),
  6: G('..##. .#... #.... ####. #...# #...# .###.'),
  7: G('##### ....# ...#. ..#.. .#... .#... .#...'),
  8: G('.###. #...# #...# .###. #...# #...# .###.'),
  9: G('.###. #...# #...# .#### ....# ...#. .##..'),
  A: G('.###. #...# #...# ##### #...# #...# #...#'),
  B: G('####. #...# #...# ####. #...# #...# ####.'),
  C: G('.###. #...# #.... #.... #.... #...# .###.'),
  D: G('####. #...# #...# #...# #...# #...# ####.'),
  E: G('##### #.... #.... ####. #.... #.... #####'),
  F: G('##### #.... #.... ####. #.... #.... #....'),
  G: G('.###. #...# #.... #.### #...# #...# .####'),
  H: G('#...# #...# #...# ##### #...# #...# #...#'),
  I: G('.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.'),
  J: G('..### ...#. ...#. ...#. ...#. #..#. .##..'),
  K: G('#...# #..#. #.#.. ##... #.#.. #..#. #...#'),
  L: G('#.... #.... #.... #.... #.... #.... #####'),
  M: G('#...# ##.## #.#.# #.#.# #...# #...# #...#'),
  N: G('#...# #...# ##..# #.#.# #..## #...# #...#'),
  O: G('.###. #...# #...# #...# #...# #...# .###.'),
  P: G('####. #...# #...# ####. #.... #.... #....'),
  Q: G('.###. #...# #...# #...# #.#.# #..#. .##.#'),
  R: G('####. #...# #...# ####. #.#.. #..#. #...#'),
  S: G('.#### #.... #.... .###. ....# ....# ####.'),
  T: G('##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..'),
  U: G('#...# #...# #...# #...# #...# #...# .###.'),
  V: G('#...# #...# #...# #...# #...# .#.#. ..#..'),
  W: G('#...# #...# #...# #.#.# #.#.# #.#.# .#.#.'),
  X: G('#...# #...# .#.#. ..#.. .#.#. #...# #...#'),
  Y: G('#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..'),
  Z: G('##### ....# ...#. ..#.. .#... #.... #####'),
  '/': G('....# ....# ...#. ..#.. .#... #.... #....'),
  '.': G('..... ..... ..... ..... ..... .##.. .##..'),
  '!': G('..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..'),
  '?': G('.###. #...# ....# ...#. ..#.. ..... ..#..'),
  '-': G('..... ..... ..... ##### ..... ..... .....'),
  '+': G('..... ..#.. ..#.. ##### ..#.. ..#.. .....'),
  '=': G('..... ..... ##### ..... ##### ..... .....'),
  '<': G('...#. ..#.. .#... #.... .#... ..#.. ...#.'),
  '>': G('.#... ..#.. ...#. ....# ...#. ..#.. .#...'),
  ':': G('..... .##.. .##.. ..... .##.. .##.. .....'),
  ' ': G('..... ..... ..... ..... ..... ..... .....'),
};
export const GLYPH_W = 5;
export const GLYPH_H = 7;
