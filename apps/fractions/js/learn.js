// Learning engine: per-skill mastery, step generation, and rewards.
// Fractions are handled as integers over 24ths (LCM of 2, 3, 4, 6, 8) so
// arithmetic stays exact.
import { store } from '../../../shared/store.js';

const save = store.forApp('fractions');
export const DEN_LCM = 24;

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// ---------- Mastery ----------
// Exponential moving average of "correct on the first try", per skill.
const ALPHA = 0.25;

export function mastery(skill) {
  return save.get('mastery', {})[skill] ?? { score: 0.3, n: 0 };
}

export function record(skill, firstTry) {
  const all = save.get('mastery', {});
  const m = all[skill] ?? { score: 0.3, n: 0 };
  m.score += ALPHA * ((firstTry ? 1 : 0) - m.score);
  m.n += 1;
  all[skill] = m;
  save.set('mastery', all);
}

// Denominators widen as a skill gets solid: halves/fourths → thirds → sixths/eighths.
export function denominators(skill) {
  const { score } = mastery(skill);
  if (score < 0.5) return [2, 4];
  if (score < 0.75) return [2, 3, 4];
  return [2, 3, 4, 6, 8];
}

// How much help the ruler gives: labelled ticks → bare ticks → only 0 and 1.
export function scaffold(skill) {
  const { score } = mastery(skill);
  return score < 0.55 ? 'labels' : score < 0.8 ? 'ticks' : 'bare';
}

export function firstTime(stepType) {
  return !save.get('seen', {})[stepType];
}

export function markSeen(stepType) {
  const seen = save.get('seen', {});
  seen[stepType] = true;
  save.set('seen', seen);
}

// ---------- Step generation ----------
function makePlace(avoid) {
  const dens = denominators('place');
  for (let tries = 0; tries < 20; tries++) {
    const d = rnd(dens);
    const n = randInt(1, d - 1);
    if (!avoid.some((f) => Math.abs(f - n / d) < 0.09)) return { type: 'place', n, d, scaffold: scaffold('place') };
  }
  return { type: 'place', n: 1, d: 2, scaffold: scaffold('place') };
}

function makeCut() {
  const d = rnd(denominators('cut'));
  return { type: 'cut', d, take: randInt(1, d - 1) };
}

function makeFill() {
  const dens = denominators('fill');
  // Tray pieces come from one family (halves/fourths/eighths or thirds/sixths) so exact fills exist.
  const useThirds = dens.includes(3) && Math.random() < 0.4;
  const tray = useThirds ? (dens.includes(6) ? [3, 6] : [3]) : [2, 4, 8].filter((d) => dens.includes(d));
  const d = rnd(tray.filter((x) => x > 2));
  return { type: 'fill', n: randInt(1, d - 1), d, tray };
}

function makeCompare() {
  const dens = denominators('compare');
  if (Math.random() < 0.5) {
    // Same numerator: bigger denominator means smaller pieces (beats whole-number bias).
    const [d1, d2] = [...dens].sort(() => Math.random() - 0.5).slice(0, 2);
    const n = randInt(1, Math.min(d1, d2) - 1);
    return { type: 'compare', a: [n, d1], b: [n, d2], kind: 'sameNum' };
  }
  const d = rnd(dens.filter((x) => x > 2));
  const n1 = randInt(1, d - 1);
  let n2 = randInt(1, d - 1);
  while (n2 === n1) n2 = randInt(1, d - 1);
  return { type: 'compare', a: [n1, d], b: [n2, d], kind: 'sameDen' };
}

// A Rope Bridge mission: 8 interleaved steps.
export function planMission() {
  const order = ['cut', 'place', 'fill', 'compare', 'place', 'cut', 'fill', 'place'];
  const placed = [];
  return order.map((type) => {
    if (type === 'place') {
      const s = makePlace(placed);
      placed.push(s.n / s.d);
      return s;
    }
    return { cut: makeCut, fill: makeFill, compare: makeCompare }[type]();
  });
}

// ---------- Rewards ----------
export const UNLOCKS = [
  { id: 'glass', kind: 'block', name: 'Glass' },
  { id: 'brick', kind: 'block', name: 'Bricks' },
  { id: 'pip_builder', kind: 'outfit', name: 'Builder outfit' },
  { id: 'gold_ore', kind: 'block', name: 'Gold ore' },
  { id: 'cobble', kind: 'block', name: 'Cobblestone' },
  { id: 'emerald_ore', kind: 'block', name: 'Emerald ore' },
  { id: 'pip_explorer', kind: 'outfit', name: 'Explorer outfit' },
  { id: 'diamond_ore', kind: 'block', name: 'Diamond ore' },
];

const MATERIALS = ['planks', 'stone', 'log', 'dirt', 'sand'];

export const inventory = {
  gems: () => save.get('gems', 0),
  addGem() {
    save.set('gems', inventory.gems() + 1);
  },
  materials: () => save.get('materials', {}),
  addMaterial() {
    const name = rnd(MATERIALS);
    const m = inventory.materials();
    m[name] = (m[name] ?? 0) + 1;
    save.set('materials', m);
    return name;
  },
  unlocked: () => save.get('unlocked', []),
  unlockNext() {
    const have = inventory.unlocked();
    const next = UNLOCKS.find((u) => !have.includes(u.id));
    if (!next) return null;
    save.set('unlocked', [...have, next.id]);
    return next;
  },
  bridges: () => save.get('bridges', 0),
  addBridge() {
    save.set('bridges', inventory.bridges() + 1);
  },
  addStar: () => save.addStars(1),
  stars: () => save.stars(),
};
