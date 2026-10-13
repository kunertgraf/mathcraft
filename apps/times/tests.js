// Worksheets, scoring, records and stickers for Times Tables.
import { store } from '../../shared/store.js';

const save = store.forApp('times');

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// A fact's key ignores order: 8×7 and 7×8 are the same fact.
export const factKey = (a, b) => (a <= b ? `${a}x${b}` : `${b}x${a}`);

// Deal `count` problems from a pool of facts, reshuffling as it runs out and never
// putting the same fact twice in a row. Each fact is randomly flipped (7×8 or 8×7).
function deal(pool, count) {
  const out = [];
  let deck = [];
  while (out.length < count) {
    if (!deck.length) deck = shuffle([...pool]);
    let i = deck.findIndex(([a, b]) => !out.length || factKey(a, b) !== factKey(out.at(-1).a, out.at(-1).b));
    if (i < 0) i = 0;
    const [a, b] = deck.splice(i, 1)[0];
    out.push(Math.random() < 0.5 ? { a, b } : { a: b, b: a });
  }
  return out;
}

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

// ---------- Sheets ----------
export const TABLES = range(2, 12);

export function tableSheet(n) {
  return {
    id: `t${n}`,
    title: `The ${n}s`,
    blurb: `${n} × 1 up to ${n} × 12`,
    seconds: 60,
    problems: deal(range(1, 12).map((k) => [n, k]), 30),
  };
}

export function madMinute() {
  const pool = range(2, 10).flatMap((a) => range(a, 10).map((b) => [a, b]));
  return { id: 'mad', title: 'Mad Minute', blurb: 'Mixed, 2s to 10s', seconds: 60, problems: deal(pool, 30) };
}

export function bigHundred() {
  const pool = range(1, 12).flatMap((a) => range(a, 12).map((b) => [a, b]));
  return { id: 'big', title: 'The Big 100', blurb: 'Mixed, 1s to 12s', seconds: 300, problems: deal(pool, 100) };
}

// Built from the facts he has missed most (they leave the list once he gets them right).
export function mistakesSheet() {
  const worst = Object.entries(misses())
    .sort((x, y) => y[1] - x[1])
    .slice(0, 10)
    .map(([k]) => k.split('x').map(Number));
  return { id: 'fix', title: 'Fix My Mistakes', blurb: 'The ones you missed', seconds: 60, problems: deal(worst, 20) };
}

export const SHEETS = { mad: madMinute, big: bigHundred, fix: mistakesSheet };
export const makeSheet = (id) => (id[0] === 't' ? tableSheet(Number(id.slice(1))) : SHEETS[id]());

// ---------- Records ----------
export const misses = () => save.get('misses', {});
export const bests = () => save.get('best', {});
export const testsTaken = () => save.get('tests', 0);

// Gold = a perfect paper; silver and bronze for most of the sheet.
export function medal(best, total) {
  if (!best) return null;
  if (best.score >= total) return 'gold';
  if (best.score >= total * 0.8) return 'silver';
  if (best.score >= total * 0.5) return 'bronze';
  return null;
}

// Grade a handed-in sheet and update records. Returns everything the results page shows.
export function grade(sheet, answers, timeLeft) {
  const marks = sheet.problems.map((p, i) => {
    const given = answers[i];
    if (given === '' || given == null) return 'blank';
    return Number(given) === p.a * p.b ? 'right' : 'wrong';
  });
  const score = marks.filter((m) => m === 'right').length;
  const tried = marks.filter((m) => m !== 'blank').length;
  const total = sheet.problems.length;
  let streak = 0, bestStreak = 0;
  for (const m of marks) {
    streak = m === 'right' ? streak + 1 : m === 'wrong' ? 0 : streak;
    bestStreak = Math.max(bestStreak, streak);
  }

  // Missed facts go on the "Fix My Mistakes" list; getting one right takes it back off.
  const miss = misses();
  sheet.problems.forEach((p, i) => {
    const k = factKey(p.a, p.b);
    if (marks[i] === 'wrong') miss[k] = (miss[k] ?? 0) + 1;
    else if (marks[i] === 'right' && miss[k]) {
      miss[k] -= 1;
      if (!miss[k]) delete miss[k];
    }
  });
  save.set('misses', miss);

  // Personal best: more right, or the same with more time left.
  const all = bests();
  const prev = all[sheet.id];
  const finished = tried === total;
  const left = finished ? Math.round(timeLeft) : 0;
  const record = !prev || score > prev.score || (score === prev.score && left > (prev.left ?? 0));
  if (record) all[sheet.id] = { score, total, left, at: Date.now() };
  save.set('best', all);

  save.set('tests', testsTaken() + 1);
  const today = new Date().toDateString();
  const days = save.get('days', []);
  if (!days.includes(today)) save.set('days', [...days, today].slice(-60));

  const result = { sheet, marks, score, tried, total, finished, left, bestStreak, prev, record: record && !!prev };
  result.stickers = awardStickers(result);
  save.addStars(1 + (result.record ? 1 : 0) + (score === total ? 1 : 0));
  return result;
}

// ---------- Stickers (achievements) ----------
const tableGold = (n) => medal(bests()[`t${n}`], 30) === 'gold';

export const STICKERS = [
  { id: 'first', emoji: '📝', name: 'First Test', how: 'Hand in your first test.' },
  { id: 'tests10', emoji: '📚', name: 'Test Taker', how: 'Hand in 10 tests.' },
  { id: 'tests50', emoji: '🎓', name: 'Test Champ', how: 'Hand in 50 tests.' },
  { id: 'days5', emoji: '📅', name: 'Regular', how: 'Take tests on 5 different days.' },
  { id: 'record', emoji: '🏆', name: 'New Record', how: 'Beat your best score on a sheet.' },
  { id: 'streak15', emoji: '🔥', name: 'On a Roll', how: 'Get 15 right in a row.' },
  { id: 'streak30', emoji: '☄️', name: 'Unstoppable', how: 'Get 30 right in a row.' },
  { id: 'perfect', emoji: '💯', name: 'Perfect Paper', how: 'Get every problem on a sheet right.' },
  { id: 'clock', emoji: '⏰', name: 'Beat the Clock', how: 'Finish a whole sheet before time runs out.' },
  { id: 'lightning', emoji: '⚡', name: 'Lightning', how: 'Get a perfect paper with 15 seconds to spare.' },
  { id: 'mad20', emoji: '🥉', name: 'Mad 20', how: 'Get 20 right on the Mad Minute.' },
  { id: 'mad25', emoji: '🥈', name: 'Mad 25', how: 'Get 25 right on the Mad Minute.' },
  { id: 'mad30', emoji: '🥇', name: 'Mad Master', how: 'Get all 30 right on the Mad Minute.' },
  { id: 'big80', emoji: '🎖️', name: 'Big 80', how: 'Get 80 right on the Big 100.' },
  { id: 'big100', emoji: '👑', name: 'Century', how: 'Get all 100 right on the Big 100.' },
  { id: 'fixer', emoji: '🩹', name: 'Mistake Fixer', how: 'Get a perfect paper on Fix My Mistakes.' },
  { id: 'tough', emoji: '🍪', name: 'Tough Cookie', how: 'Gold stars on the 6s, 7s and 8s.' },
  { id: 'dozen', emoji: '🥚', name: 'Dozen Hero', how: 'Gold star on the 12s.' },
  { id: 'half', emoji: '⭐', name: 'Star Student', how: 'Gold stars on 6 different tables.' },
  { id: 'allgold', emoji: '🌈', name: 'Table Champion', how: 'Gold stars on every table, 2s to 12s.' },
];

export const stickers = () => save.get('stickers', {});

function awardStickers(r) {
  const { sheet, score, total, finished, left, bestStreak } = r;
  const golds = TABLES.filter(tableGold).length;
  const earned = {
    first: true,
    tests10: testsTaken() >= 10,
    tests50: testsTaken() >= 50,
    days5: save.get('days', []).length >= 5,
    record: r.record,
    streak15: bestStreak >= 15,
    streak30: bestStreak >= 30,
    perfect: score === total,
    clock: finished && left > 0,
    lightning: score === total && left >= 15,
    mad20: sheet.id === 'mad' && score >= 20,
    mad25: sheet.id === 'mad' && score >= 25,
    mad30: sheet.id === 'mad' && score === total,
    big80: sheet.id === 'big' && score >= 80,
    big100: sheet.id === 'big' && score === total,
    fixer: sheet.id === 'fix' && score === total,
    tough: [6, 7, 8].every(tableGold),
    dozen: tableGold(12),
    half: golds >= 6,
    allgold: golds === TABLES.length,
  };
  const have = stickers();
  const fresh = STICKERS.filter((s) => earned[s.id] && !have[s.id]);
  for (const s of fresh) have[s.id] = Date.now();
  save.set('stickers', have);
  return fresh;
}

// What the teacher writes at the top in red pen.
export function teacherNote({ score, total, tried }) {
  if (score === total) return 'PERFECT!';
  const acc = tried ? score / tried : 0;
  if (score === 0) return 'Give it another go!';
  if (acc === 1) return 'All correct! Faster next time!';
  if (acc >= 0.9) return 'Excellent work!';
  if (acc >= 0.75) return 'Great job!';
  return 'Good try! Check the red ones.';
}

export const randomSticker = (score, total) => {
  const set = score === total ? ['🌟', '🦄', '🚀', '🏆'] : score / total >= 0.6 ? ['😀', '🦖', '🐙', '🍕', '⭐'] : ['👍', '🐢', '🙂'];
  return set[randInt(0, set.length - 1)];
};
