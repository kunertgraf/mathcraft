// Procedural 16×16 block textures. Deterministic (seeded) and seamlessly
// tileable, generated once per page and cached as canvases.
import { RAMPS, hexToRgb } from './palette.js';

export const TEX = 16;

export const BLOCKS = [
  'grass', 'dirt', 'stone', 'cobble', 'planks', 'log', 'leaves', 'sand',
  'brick', 'glass', 'water', 'diamond_ore', 'gold_ore', 'emerald_ore', 'redstone_ore',
];

// ---------- helpers ----------
function rng(seed) {
  // mulberry32
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Tileable value noise: a coarse random grid, bilinearly interpolated with wrap-around.
function valueNoise(rand, cells) {
  const g = Array.from({ length: cells * cells }, rand);
  const at = (i, j) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
  const step = TEX / cells;
  return (x, y) => {
    const fx = x / step, fy = y / step;
    const i = Math.floor(fx), j = Math.floor(fy);
    const tx = fx - i, ty = fy - j;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return a + (b - a) * sy;
  };
}

const clampIdx = (v, n) => Math.max(0, Math.min(n - 1, Math.floor(v)));
const pickRamp = (ramp, v, lo = 0, hi = ramp.length - 1) => ramp[clampIdx(lo + v * (hi - lo + 1), ramp.length)];

class Pixels {
  constructor() {
    this.data = new Uint8ClampedArray(TEX * TEX * 4);
  }
  set(x, y, hex, alpha = 255) {
    x = ((x % TEX) + TEX) % TEX;
    y = ((y % TEX) + TEX) % TEX;
    const [r, g, b] = hexToRgb(hex);
    const i = (y * TEX + x) * 4;
    this.data.set([r, g, b, alpha], i);
  }
  each(fn) {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) fn(x, y);
  }
  toCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = TEX;
    c.getContext('2d').putImageData(new ImageData(this.data, TEX, TEX), 0, 0);
    return c;
  }
}

// ---------- block painters ----------
function stoneBase(p, rand) {
  // Calm mid-grey with soft darker/lighter patches; few tones reads cleaner at scale.
  const n = valueNoise(rand, 4);
  const s = RAMPS.stone;
  p.each((x, y) => {
    const v = n(x, y) * 0.8 + rand() * 0.2;
    p.set(x, y, v < 0.32 ? s[1] : v > 0.74 ? s[3] : s[2]);
  });
  for (let k = 0; k < 4; k++) p.set(Math.floor(rand() * TEX), Math.floor(rand() * TEX), s[4]);
  for (let k = 0; k < 2; k++) {
    const x = Math.floor(rand() * TEX), y = Math.floor(rand() * TEX);
    p.set(x, y, s[0]);
    p.set(x + 1, y + 1, s[0]);
  }
}

const painters = {
  stone: stoneBase,

  dirt(p, rand) {
    const n = valueNoise(rand, 4);
    const d = RAMPS.dirt;
    p.each((x, y) => p.set(x, y, pickRamp(d, n(x, y) * 0.5 + rand() * 0.5, 1, 3)));
    for (let k = 0; k < 6; k++) p.set(Math.floor(rand() * TEX), Math.floor(rand() * TEX), d[4]);
    for (let k = 0; k < 6; k++) p.set(Math.floor(rand() * TEX), Math.floor(rand() * TEX), d[0]);
  },

  grass(p, rand) {
    painters.dirt(p, rand);
    const g = RAMPS.grass;
    for (let x = 0; x < TEX; x++) {
      const drip = 3 + Math.floor(rand() * 3) - (x % 5 === 0 ? 1 : 0);
      for (let y = 0; y < drip; y++) {
        const shade = y === 0 ? g[4] : y === drip - 1 ? g[1] : rand() < 0.35 ? g[2] : g[3];
        p.set(x, y, shade);
      }
    }
  },

  planks(p, rand) {
    const w = RAMPS.wood;
    for (let board = 0; board < 4; board++) {
      const y0 = board * 4;
      const seam = (board * 7 + 3) % TEX;
      const tone = board % 2 ? 2 : 3;
      for (let y = y0; y < y0 + 4; y++) {
        for (let x = 0; x < TEX; x++) {
          let c = w[tone];
          if (y === y0 + 3) c = w[1]; // gap between boards
          else if (y === y0) c = w[Math.min(4, tone + 1)]; // lit top edge
          else if (y === y0 + 1 + ((x * 7 + board * 3) % 2) && (x * 5 + board * 11) % 9 < 3) c = w[tone - 1]; // grain streaks
          if (x === seam && y !== y0 + 3) c = w[1];
          p.set(x, y, c);
        }
      }
      p.set(seam + 2, y0 + 1, w[0]); // nail
    }
  },

  log(p, rand) {
    const b = RAMPS.bark;
    const n = valueNoise(rand, 2);
    p.each((x, y) => {
      const stripe = (x + Math.floor(n(x, y) * 3)) % 4;
      const c = stripe === 0 ? b[0] : stripe === 1 ? b[3] : b[2 - (rand() < 0.3 ? 1 : 0)];
      p.set(x, y, c);
    });
  },

  leaves(p, rand) {
    const g = RAMPS.grass;
    const n = valueNoise(rand, 4);
    p.each((x, y) => {
      const v = n(x, y) * 0.6 + rand() * 0.4;
      p.set(x, y, v < 0.18 ? g[0] : pickRamp(g, v, 1, 3));
    });
  },

  sand(p, rand) {
    const s = RAMPS.sand;
    const n = valueNoise(rand, 4);
    p.each((x, y) => p.set(x, y, pickRamp(s, n(x, y) * 0.4 + rand() * 0.6, 1, 3)));
    for (let k = 0; k < 5; k++) p.set(Math.floor(rand() * TEX), Math.floor(rand() * TEX), s[0]);
  },

  brick(p, rand) {
    const b = RAMPS.brick, m = RAMPS.mortar;
    p.each((x, y) => {
      const row = Math.floor(y / 4);
      const xo = (x + (row % 2) * 4) % 8;
      if (y % 4 === 3 || xo === 7) return p.set(x, y, y % 4 === 3 ? m[0] : m[1]);
      let c = b[2 - (rand() < 0.25 ? 1 : 0)];
      if (y % 4 === 0) c = b[3]; // lit top edge
      p.set(x, y, c);
    });
  },

  cobble(p, rand) {
    // Wrapped Voronoi: each pixel belongs to its nearest stone centre.
    const s = RAMPS.stone;
    const seeds = Array.from({ length: 9 }, () => [rand() * TEX, rand() * TEX, 2 + Math.floor(rand() * 2)]);
    const dist = (x, y, [sx, sy]) => {
      const dx = Math.min(Math.abs(x - sx), TEX - Math.abs(x - sx));
      const dy = Math.min(Math.abs(y - sy), TEX - Math.abs(y - sy));
      return Math.hypot(dx, dy);
    };
    p.each((x, y) => {
      const ds = seeds.map((sd, i) => [dist(x + 0.5, y + 0.5, sd), i]).sort((a, b) => a[0] - b[0]);
      const [d1, i1] = ds[0];
      const d2 = ds[1][0];
      if (d2 - d1 < 1.1) return p.set(x, y, s[0]); // mortar between stones
      const [sx, sy, tone] = seeds[i1];
      // top-left of each stone catches the light
      const lit = x + 0.5 - sx + (y + 0.5 - sy) < -1.5;
      p.set(x, y, lit ? s[Math.min(4, tone + 1)] : s[tone]);
    });
  },

  glass(p) {
    const g = RAMPS.glass;
    p.each((x, y) => {
      const edge = x === 0 || y === 0 || x === TEX - 1 || y === TEX - 1;
      if (edge) return p.set(x, y, g[0], 255);
      p.set(x, y, g[1], 46);
    });
    for (const [x, y] of [[3, 3], [4, 4], [5, 5], [3, 5], [10, 11], [11, 12]]) p.set(x, y, '#ffffff', 220);
  },

  water(p, rand) {
    // Calm water: flat mid-blue with staggered horizontal ripples and a few glints.
    const w = RAMPS.water;
    const off = Math.floor(rand() * TEX);
    p.each((x, y) => {
      const ripple = y % 4 === 1 && (x + off + (y >> 2) * 6) % 10 < 4;
      p.set(x, y, ripple ? w[3] : w[2], 230);
    });
    for (let k = 0; k < 2; k++) {
      const x = Math.floor(rand() * 12), y = 4 * Math.floor(rand() * 4) + 1;
      p.set(x, y, w[4], 240);
      p.set(x + 1, y, w[4], 240);
    }
  },
};

function ore(rampName) {
  return (p, rand) => {
    stoneBase(p, rand);
    const r = RAMPS[rampName];
    const clusters = [[3, 3], [10, 5], [5, 11], [12, 12]];
    for (const [cx, cy] of clusters) {
      const ox = cx + Math.floor(rand() * 2), oy = cy + Math.floor(rand() * 2);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (rand() < 0.2) continue;
        p.set(ox + dx, oy + dy, r[1]);
      }
      p.set(ox, oy, r[2]); // sparkle highlight
      p.set(ox + 1, oy + 2, r[0]); // shadow underneath
    }
  };
}
painters.diamond_ore = ore('diamond');
painters.gold_ore = ore('gold');
painters.emerald_ore = ore('emerald');
painters.redstone_ore = ore('redstone');

// ---------- public ----------
const cache = new Map();

export function texture(name, variant = 0) {
  const key = `${name}:${variant}`;
  if (!cache.has(key)) {
    const paint = painters[name];
    if (!paint) throw new Error(`Unknown block: ${name}`);
    const p = new Pixels();
    paint(p, rng(hashSeed(key)));
    cache.set(key, p.toCanvas());
  }
  return cache.get(key);
}
