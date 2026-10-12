// Hand-authored sprites and a 5×7 bitmap font, as text grids.
import { INK, UI, RAMPS } from './palette.js';

// ---------- Characters & items ----------
// Each char maps to a colour; '.' is transparent.
// Characters use Minecraft-style proportions (16×32 front view: 8×8 head,
// 8×12 body, 4-wide arms and legs), no outline, and `texture: true` for a
// subtle per-pixel shade variation like a skin texture.

// One body layout; outfits are palette swaps.
const PERSON_ROWS = [
  '....HHwwHHHH....', // hat / hair top
  '....hHHHHHHh....',
  '....yyyyyyyy....', // hat brim / hairline
  '....RSSSSSSR....', // hair at the temples
  '....SWESSEWS....', // eyes: white + pupil
  '....SSSssSSS....', // nose shadow
  '....SSSMMSSS....', // mouth
  '....sSSSSSSs....', // chin
  'TTTTTTTSSTTTTTTT', // shoulders + neck
  'TTTTOTTTTTTOTTTT', // overall straps
  'TTTtOTTTTTTOtTTT',
  'TTTtOOOOOOOOtTTT', // bib top
  'SSSsObOOOObOsSSS', // buttons; hands start
  'SSSsOOOOOOOOsSSS',
  'SSSsOOooooOOsSSS', // bib pocket
  'SSSsOOOOOOOOsSSS',
  'SSSsOOOOOOOOsSSS',
  'SSSsoOOOOOOosSSS',
  'SSSsoOOOOOOosSSS',
  'ssssllllllllssss', // belt; hands
  '....OOOooOOO....', // legs
  '....OOOooOOO....',
  '....OOOooOOO....',
  '....OOOooOOO....',
  '....OOOooOOO....',
  '....OOOooOOO....',
  '....OOOooOOO....',
  '....OOOooOOO....',
  '....oOOooOOo....',
  '....oOOooOOo....',
  '....BBBkkBBB....', // boots
  '....kkkkkkkk....',
];

const SKIN = { S: UI.skin, s: UI.skinShade, M: '#a8614a', W: '#f4f2ee', E: '#2b3a8a' };

const OUTFITS = {
  // Unlockable: builder — yellow hard hat, red shirt, blue overalls.
  pip_builder: {
    H: UI.hat, h: UI.hatShade, w: '#fff3c4', y: '#b88416',
    R: RAMPS.dirt[1],
    T: RAMPS.brick[2], t: RAMPS.brick[1],
    O: UI.shirt, o: UI.shirtShade, b: RAMPS.gold[1], l: '#22306e',
    B: RAMPS.wood[1], k: RAMPS.bark[0],
  },
  // Unlockable: explorer — no hat, auburn hair, green shirt, brown work overalls.
  pip_explorer: {
    H: '#8a4a26', h: '#6a3519', w: '#a8613a', y: '#6a3519',
    R: '#6a3519',
    T: RAMPS.grass[2], t: RAMPS.grass[1],
    O: RAMPS.wood[2], o: RAMPS.wood[1], b: RAMPS.gold[1], l: RAMPS.wood[0],
    B: RAMPS.bark[1], k: RAMPS.bark[0],
  },
  // Default Pip: miner — grey helmet with a lamp, orange shirt, charcoal overalls.
  pip: {
    H: RAMPS.stone[3], h: RAMPS.stone[2], w: RAMPS.gold[2], y: RAMPS.stone[1],
    R: RAMPS.dirt[0],
    T: '#e0782f', t: '#b45a1e',
    O: RAMPS.stone[1], o: RAMPS.stone[0], b: RAMPS.gold[1], l: '#1e1f2c',
    B: RAMPS.wood[1], k: RAMPS.bark[0],
  },
};

// Mobs. The zombie reuses the person layout with its own palette (deliberately
// not Minecraft's teal-shirt zombie).
const ZOMBIE = {
  H: '#3b4a2e', h: '#2f3b25', w: '#4a5c39', y: '#2f3b25', R: '#2f3b25',
  S: '#76a05f', s: '#5a8048', M: '#2d3b26', W: '#1e2a18', E: '#c8f06a',
  T: '#7a5a3a', t: '#5e4429',
  O: '#3d3f5c', o: '#2b2c44', b: '#3d3f5c', l: '#2b2c44',
  B: '#2b2c44', k: '#1b1b2a',
};

export const SPRITES = {
  zombie: { colours: ZOMBIE, rows: PERSON_ROWS, texture: true },
  // The Fizzler: our own exploding mob. A blocky lime slime with orange
  // spots and a fizzing fuse; it hisses and pops when it reaches a wall. 16×16.
  fizzler: {
    texture: true,
    colours: {
      G: '#7bc94a', g: '#5a9e36', d: '#3e7426', o: '#e0782f',
      W: '#ffffff', E: '#14152b', M: '#2a4a1c', F: '#8a5d33', s: '#ffd34e', S: '#fff3c4',
    },
    rows: [
      '.......sS.......',
      '......sFs.......',
      '.......F........',
      '....gggGGggg....',
      '...gGGGGGGGGg...',
      '..gGGoGGGGGGGg..',
      '..gGGGGGGGoGGg..',
      '..gGWWGGGGWWGg..',
      '..gGWEGGGGWEGg..',
      '..gGGGGGGGGGGg..',
      '..gGGGMMMMGGGg..',
      '..gGGGGMMGGGGg..',
      '..dgGGGGGGGGgd..',
      '...dggggggggd...',
      '...dd..dd..dd...',
      '................',
    ],
  },
  // Anvil dropped by the dispenser. 12×8.
  anvil: {
    colours: { a: RAMPS.stone[1], b: RAMPS.stone[2], c: RAMPS.stone[4] },
    rows: [
      '.cccccccccc.',
      'cbbbbbbbbbbb',
      '.aaabbbbaaa.',
      '....bbbb....',
      '....abba....',
      '...bbbbbb...',
      '..bbbbbbbb..',
      '..aaaaaaaa..',
    ],
  },
  ...Object.fromEntries(
    Object.entries(OUTFITS).map(([name, outfit]) => [
      name,
      { colours: { ...SKIN, ...outfit }, rows: PERSON_ROWS, texture: true },
    ]),
  ),
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

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${c.join(' ')})`;
}

export function sprite(name) {
  if (!spriteCache.has(name)) {
    const { colours, rows, texture } = SPRITES[name];
    let seed = 1234567;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    const ctx = c.getContext('2d');
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        let colour = colours[ch];
        if (texture) {
          const r = rand();
          if (r < 0.14) colour = shade(colour, 0.9);
          else if (r < 0.22) colour = shade(colour, 1.08);
        }
        ctx.fillStyle = colour;
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
