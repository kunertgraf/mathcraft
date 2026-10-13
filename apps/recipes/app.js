// Cook Along: follow a recipe one big step at a time.
// Views: list → intro → gather (tools + ingredients) → step 1..n → done.
// Progress (and any running timer) is saved, so closing the app mid-recipe is safe.
import { store } from '../../shared/store.js';
import { RECIPES } from './recipes.js';

const save = store.forApp('recipes');
const root = document.getElementById('app');
const RESUME_HOURS = 12;

let state = { view: 'list' };

// ---------- Text and fractions ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Stacked fraction, like the ones in Pip's Mine.
const frac = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;

// Escape text, then turn "3/4" into a stacked fraction.
const rich = (s) => esc(s).replace(/\b(\d+)\/(\d+)\b/g, (_, n, d) => frac(n, d));

const FRACS = [[1, 8], [1, 4], [1, 3], [1, 2], [2, 3], [3, 4]];

// 1.5 → "1 ½" (stacked), 0.125 → "⅛"
function amountHTML(q) {
  const whole = Math.floor(q + 1e-9);
  const rest = q - whole;
  const f = FRACS.find(([n, d]) => Math.abs(rest - n / d) < 0.01);
  if (!f) return String(whole || q);
  return `${whole ? `${whole}&thinsp;` : ''}${frac(...f)}`;
}

// ---------- Measuring cups and spoons ----------
const TOOL_SIZES = { cup: [1, 1 / 2, 1 / 3, 1 / 4], tsp: [1, 1 / 2, 1 / 4, 1 / 8] };

// Which measuring tools to use: fewest scoops (1 ½ cups → 1 cup + ½ cup; ⅔ cup → ⅓ + ⅓).
export function measures(qty, unit) {
  const sizes = TOOL_SIZES[unit];
  if (!sizes) return [];
  const greedy = [];
  let left = qty;
  for (const s of sizes) {
    while (left >= s - 1e-6) {
      greedy.push(s);
      left -= s;
    }
  }
  const options = Math.abs(left) < 1e-6 ? [greedy] : [];
  for (const s of sizes) {
    const k = qty / s;
    if (Math.abs(k - Math.round(k)) < 1e-6) options.push(Array(Math.round(k)).fill(s));
  }
  return options.sort((a, b) => a.length - b.length)[0] ?? [];
}

const sizeLabel = (s) => (s === 1 ? '1' : frac(...FRACS.find(([n, d]) => Math.abs(s - n / d) < 1e-6)));

// Measuring cup / spoon picture, drawn bigger for bigger amounts.
function toolSVG(size, unit) {
  const k = 0.55 + 0.45 * Math.sqrt(size);
  if (unit === 'cup') {
    const w = 40 * k, h = 34 * k, x = 26 - w / 2, y = 44 - h;
    return `<svg viewBox="0 0 64 48" aria-hidden="true">
      <path d="M${x + w - 2} ${y + 8} h${14 * k + 8} a4 4 0 0 1 0 8 h-${14 * k + 8}z" fill="#9aa3b5"/>
      <path d="M${x} ${y} h${w} l-${w * 0.12} ${h} h-${w * 0.76}z" fill="#c9d1e0" stroke="#6b7489" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M${x + w * 0.06} ${y + h * 0.35} h${w * 0.88} l-${w * 0.07} ${h * 0.65 - 1.5} h-${w * 0.74}z" fill="#ffffff" opacity="0.9"/>
    </svg>`;
  }
  const r = 17 * k;
  return `<svg viewBox="0 0 64 48" aria-hidden="true">
    <rect x="${22 + r}" y="20" width="${40 - r}" height="7" rx="3" fill="#9aa3b5"/>
    <ellipse cx="${24}" cy="24" rx="${r}" ry="${r * 0.8}" fill="#c9d1e0" stroke="#6b7489" stroke-width="2.5"/>
    <ellipse cx="${24}" cy="25" rx="${r * 0.62}" ry="${r * 0.45}" fill="#ffffff" opacity="0.9"/>
  </svg>`;
}

const UNIT_WORD = { cup: ['cup', 'cups'], tsp: ['teaspoon', 'teaspoons'] };

function unitWord(qty, unit) {
  const w = UNIT_WORD[unit];
  return w ? w[qty > 1 ? 1 : 0] : unit;
}

function measureRow(ing) {
  const tools = measures(ing.qty, ing.unit);
  if (!tools.length) return '';
  const short = ing.unit === 'cup' ? 'cup' : 'tsp';
  return `<div class="measures">${tools
    .map((s) => `<span class="measure">${toolSVG(s, ing.unit)}<span class="measure-label">${sizeLabel(s)} ${short}</span></span>`)
    .join('<span class="plus">+</span>')}</div>`;
}

// ---------- Saved progress ----------
function saveProgress() {
  const { view, recipe, step, got, added, timer } = state;
  if (view === 'done') return save.set('progress', null);
  if (view !== 'gather' && view !== 'step') return; // list/intro leave the saved spot alone
  save.set('progress', { id: recipe.id, view, step, got: [...got], added: [...added], timer, at: Date.now() });
}

function savedProgress(recipe) {
  const p = save.get('progress', null);
  if (!p || p.id !== recipe.id || Date.now() - p.at > RESUME_HOURS * 3600e3) return null;
  return p;
}

function startRecipe(recipe, resume) {
  state = {
    view: resume?.view ?? 'gather',
    recipe,
    step: resume?.step ?? 0,
    got: new Set(resume?.got ?? []),
    added: new Set(resume?.added ?? []),
    timer: resume?.timer ?? null,
    alarm: false,
  };
  // A timer that ran out while the app was closed: ring if it's recent, otherwise forget it.
  const ended = state.timer?.endsAt ? Date.now() - state.timer.endsAt : -1;
  if (ended > 5 * 60e3) state.timer = null;
  else if (ended >= 0) ringAlarm();
  show();
}

// ---------- Views ----------
function show() {
  saveProgress();
  const views = { list: listView, intro: introView, gather: gatherView, step: stepView, done: doneView };
  root.innerHTML = views[state.view]() + alarmView();
  root.scrollTop = 0;
  document.querySelector('.scroll')?.scrollTo(0, 0);
  updateTimers();
  keepAwake(['gather', 'step'].includes(state.view) || !!state.timer);
}

function listView() {
  return `
    <header class="bar"><h1>Cook Along</h1></header>
    <main class="scroll list">
      ${RECIPES.map(
        (r) => `
        <button class="recipe-card" data-action="open" data-id="${r.id}" style="--c:${r.colour}">
          <span class="recipe-hero">${r.hero.map((e) => `<span>${e}</span>`).join('')}</span>
          <span class="recipe-name">${esc(r.title)}</span>
          <span class="recipe-meta">${esc(r.makes)} · ${esc(r.time)}</span>
          ${madeCount(r) ? `<span class="made">Made ${madeCount(r)}×</span>` : ''}
        </button>`,
      ).join('')}
      <div class="recipe-card soon"><span class="recipe-hero"><span>🍪</span><span>🥞</span><span>🍕</span></span>
        <span class="recipe-name">More recipes coming soon</span></div>
    </main>`;
}

const madeCount = (r) => save.get('made', {})[r.id] ?? 0;

function introView() {
  const r = state.recipe;
  const resume = savedProgress(r);
  const where = resume && (resume.view === 'gather' ? 'Getting ready' : `Step ${resume.step + 1}`);
  return `
    <header class="bar"><button class="back" data-action="list">◀ Recipes</button></header>
    <main class="scroll intro" style="--c:${r.colour}">
      <div class="intro-hero">${r.hero.map((e) => `<span>${e}</span>`).join('')}</div>
      <h1>${esc(r.title)}</h1>
      <div class="facts">
        <span class="fact">🧁 Makes ${esc(r.makes)}</span>
        <span class="fact">⏱️ ${esc(r.time)}</span>
        <span class="fact">🔥 Oven ${esc(r.oven)}</span>
        <span class="fact">📋 ${r.steps.length} steps</span>
      </div>
      <p class="grownup-note">🧑‍🍳 Cook with a grown-up. Steps with the <span class="badge hot">🔥 Grown-up</span> sign use the hot oven.</p>
      <div class="intro-actions">
        ${resume ? `<button class="big go" data-action="resume">Keep going: ${esc(where)} ▶</button>` : ''}
        <button class="big ${resume ? 'quiet' : 'go'}" data-action="begin">${resume ? 'Start over' : 'Let’s get ready ▶'}</button>
      </div>
      <p class="source">${esc(r.source)}</p>
    </main>`;
}

function gatherView() {
  const r = state.recipe;
  const total = r.ingredients.length + r.tools.length;
  const have = state.got.size;
  const card = (key, emoji, name, extra = '') => `
    <button class="get ${state.got.has(key) ? 'got' : ''}" data-action="got" data-key="${esc(key)}">
      <span class="get-emoji">${emoji}</span>
      <span class="get-body"><span class="get-name">${esc(name)}</span>${extra}</span>
      <span class="check">${state.got.has(key) ? '✓' : ''}</span>
    </button>`;
  return `
    <header class="bar">
      <button class="back" data-action="intro">◀</button>
      <div class="bar-title">Get everything ready</div>
      <div class="count">${have} of ${total}</div>
    </header>
    <main class="scroll gather">
      <p class="lead">Find each thing and tap it when it’s on the counter.</p>
      <h2>Ingredients</h2>
      <div class="grid">
        ${r.ingredients
          .map((i) =>
            card(
              `ing:${i.id}`,
              i.emoji,
              i.name,
              `<span class="get-amount">${amountHTML(i.qty)} ${esc(unitWord(i.qty, i.unit))}</span>
               ${i.note ? `<span class="get-note">${esc(i.note)}</span>` : ''}`,
            ),
          )
          .join('')}
      </div>
      <h2>Tools</h2>
      <div class="grid tools">
        ${r.tools.map((t) => card(`tool:${t.name}`, t.emoji, t.name)).join('')}
      </div>
    </main>
    <footer class="nav">
      <span></span>
      <button class="big go" data-action="next">${have >= total ? 'All ready! Start cooking ▶' : 'Start cooking ▶'}</button>
    </footer>`;
}

function stepView() {
  const r = state.recipe;
  const s = r.steps[state.step];
  const n = r.steps.length;
  const last = state.step === n - 1;
  const uses = (s.uses ?? []).map((id) => r.ingredients.find((i) => i.id === id));
  const badge = { hot: '<span class="badge hot">🔥 Grown-up step</span>', help: '<span class="badge help">🤝 Grown-up helps</span>' }[s.grownup] ?? '';
  return `
    <header class="bar">
      <button class="back" data-action="intro">◀</button>
      <div class="bar-title">Step ${state.step + 1} <span class="of">of ${n}</span></div>
      <div class="progress"><span style="width:${((state.step + 1) / n) * 100}%"></span></div>
      ${timerPill()}
    </header>
    <main class="scroll step" data-swipe>
      <div class="step-card">
        <div class="step-art"><span>${s.emoji}</span></div>
        <div class="step-body">
          ${badge}
          <h1>${esc(s.title)}</h1>
          <p class="step-text">${rich(s.text)}</p>
          ${uses.length ? `<div class="uses">${uses.map(useCard).join('')}</div>` : ''}
          ${s.timer ? timerCard(s) : ''}
          ${s.tip ? `<p class="tip"><span>💡</span> ${rich(s.tip)}</p>` : ''}
        </div>
      </div>
    </main>
    <footer class="nav">
      <button class="big quiet" data-action="prev">◀ Back</button>
      <button class="big go" data-action="next">${last ? 'Finish! 🎉' : 'Next ▶'}</button>
    </footer>`;
}

function useCard(i) {
  const key = `${state.step}:${i.id}`;
  const done = state.added.has(key);
  return `
    <button class="use ${done ? 'got' : ''}" data-action="added" data-key="${esc(key)}">
      <span class="use-top">
        <span class="get-emoji">${i.emoji}</span>
        <span class="use-name">${esc(i.name)}</span>
        <span class="check">${done ? '✓' : ''}</span>
      </span>
      <span class="use-amount">${amountHTML(i.qty)} ${esc(unitWord(i.qty, i.unit))}</span>
      ${measureRow(i)}
      ${i.note ? `<span class="get-note">${esc(i.note)}</span>` : ''}
    </button>`;
}

function doneView() {
  const r = state.recipe;
  return `
    <main class="scroll done" style="--c:${r.colour}">
      <div class="confetti" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="--i:${i};left:${Math.random() * 100}%;animation-delay:${-Math.random() * 3}s;animation-duration:${2.2 + Math.random() * 1.6}s"></i>`).join('')}</div>
      <div class="done-hero">${r.emoji}</div>
      <h1>You made it!</h1>
      <p class="done-name">${esc(r.title)}</p>
      <p class="done-star">⭐ +1 star</p>
      <p class="lead">${esc(r.finish)}</p>
      <button class="big go" data-action="list">Back to recipes</button>
    </main>`;
}

// ---------- Timers ----------
// state.timer = { step, label, total, endsAt (running) | left (paused) }
const timeLeft = (t) => (t.endsAt ? Math.max(0, (t.endsAt - Date.now()) / 1000) : t.left);
const clock = (sec) => {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function timerCard(s) {
  const t = state.timer?.step === state.step ? state.timer : null;
  const other = state.timer && !t;
  const running = t?.endsAt;
  const total = s.timer.min * 60;
  const btn = running
    ? '<button class="big quiet" data-action="timer-pause">Pause</button>'
    : `<button class="big timer-go" data-action="timer-start" ${other ? 'disabled' : ''}>${t ? 'Keep going' : `Start ${s.timer.min} minute timer`}</button>`;
  return `
    <div class="timer ${running ? 'running' : ''}">
      <div class="timer-face" ${t ? 'data-timer' : ''}>${clock(t ? timeLeft(t) : total)}</div>
      <div class="timer-ring"><span ${t ? 'data-timer-bar' : ''} style="width:${t ? (timeLeft(t) / t.total) * 100 : 100}%"></span></div>
      <div class="timer-buttons">${btn}${t ? '<button class="big quiet" data-action="timer-reset">Reset</button>' : ''}</div>
      ${other ? '<p class="get-note">Another timer is running. Wait for it to finish first.</p>' : ''}
      ${s.optionalTimer && !t ? '<p class="get-note">Only if they need more time.</p>' : ''}
    </div>`;
}

// Small floating clock while a timer runs on another step. Tap it to jump back.
function timerPill() {
  const t = state.timer;
  if (!t || state.view !== 'step' || t.step === state.step) return '';
  return `<button class="timer-pill" data-action="goto-timer">⏱️ ${esc(t.label)} <b data-timer>${clock(timeLeft(t))}</b></button>`;
}

function alarmView() {
  if (!state.alarm) return '';
  const t = state.timer;
  return `
    <div class="alarm">
      <div class="alarm-box">
        <div class="alarm-bell">⏰</div>
        <h1>Time’s up!</h1>
        <p>${esc(t?.label ?? 'Timer')} is done. Get your grown-up!</p>
        <button class="big go" data-action="alarm-ok">OK</button>
      </div>
    </div>`;
}

function updateTimers() {
  const t = state.timer;
  if (!t) return;
  const left = timeLeft(t);
  for (const el of root.querySelectorAll('[data-timer]')) el.textContent = clock(left);
  for (const el of root.querySelectorAll('[data-timer-bar]')) el.style.width = `${(left / t.total) * 100}%`;
  if (t.endsAt && left <= 0 && !state.alarm) ringAlarm();
}

function ringAlarm() {
  state.alarm = true;
  state.timer.left = 0;
  state.timer.endsAt = null;
  chime();
  clearInterval(state.ringing);
  state.ringing = setInterval(chime, 2500);
  if (root.childElementCount) show();
}

setInterval(updateTimers, 250);

// ---------- Sound (WebAudio, unlocked by the first tap) ----------
let audio;
function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

function tone(freq, at, dur, vol = 0.25) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(audio.destination);
  o.start(at);
  o.stop(at + dur);
}

function chime() {
  if (!audio) return;
  const t = audio.currentTime;
  [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.16, 0.5));
}

function pop() {
  if (!audio) return;
  tone(660, audio.currentTime, 0.12, 0.12);
}

function fanfare() {
  if (!audio) return;
  const t = audio.currentTime;
  [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.12, 0.35, 0.2));
}

// ---------- Keep the screen on while cooking ----------
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && document.visibilityState === 'visible') {
      wake = await navigator.wakeLock?.request('screen');
      wake?.addEventListener('release', () => (wake = null));
    } else if (!on && wake) {
      await wake.release();
      wake = null;
    }
  } catch {
    wake = null; // not supported or not allowed: cooking still works, the screen may just dim
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  updateTimers();
  keepAwake(['gather', 'step'].includes(state.view) || !!state.timer);
});

// ---------- Actions ----------
function go(delta) {
  const n = state.recipe.steps.length;
  if (state.view === 'gather') {
    if (delta > 0) Object.assign(state, { view: 'step', step: 0 });
    else state.view = 'intro';
  } else if (state.view === 'step') {
    const next = state.step + delta;
    if (next < 0) state.view = 'gather';
    else if (next >= n) return finish();
    else state.step = next;
  }
  show();
}

function finish() {
  const r = state.recipe;
  const made = save.get('made', {});
  made[r.id] = (made[r.id] ?? 0) + 1;
  save.set('made', made);
  save.addStars(1);
  Object.assign(state, { view: 'done', timer: null, alarm: false });
  clearInterval(state.ringing);
  fanfare();
  show();
}

const actions = {
  list: () => {
    state = { view: 'list' };
    show();
  },
  open: (el) => {
    state = { view: 'intro', recipe: RECIPES.find((r) => r.id === el.dataset.id) };
    show();
  },
  intro: () => {
    saveProgress();
    const { recipe } = state;
    clearInterval(state.ringing);
    state = { view: 'intro', recipe };
    show();
  },
  resume: () => startRecipe(state.recipe, savedProgress(state.recipe)),
  begin: () => startRecipe(state.recipe, null),
  got: (el) => toggle(state.got, el.dataset.key),
  added: (el) => toggle(state.added, el.dataset.key),
  next: () => go(1),
  prev: () => go(-1),
  'timer-start': () => {
    const s = state.recipe.steps[state.step];
    const t = state.timer?.step === state.step ? state.timer : { step: state.step, label: s.timer.label, total: s.timer.min * 60, left: s.timer.min * 60 };
    t.endsAt = Date.now() + t.left * 1000;
    state.timer = t;
    show();
  },
  'timer-pause': () => {
    state.timer.left = timeLeft(state.timer);
    state.timer.endsAt = null;
    show();
  },
  'timer-reset': () => {
    state.timer = null;
    show();
  },
  'goto-timer': () => {
    state.step = state.timer.step;
    show();
  },
  'alarm-ok': () => {
    clearInterval(state.ringing);
    state.alarm = false;
    state.timer = null;
    show();
  },
};

function toggle(set, key) {
  if (set.has(key)) set.delete(key);
  else {
    set.add(key);
    pop();
  }
  show();
}

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  actions[el.dataset.action]?.(el);
});

// Swipe left/right between steps.
let swipe = null;
root.addEventListener('pointerdown', (e) => {
  unlockAudio();
  swipe = e.target.closest('[data-swipe]') ? { x: e.clientX, y: e.clientY } : null;
});
root.addEventListener('pointerup', (e) => {
  if (!swipe || state.view !== 'step' || state.alarm) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 90 && Math.abs(dx) > 2 * Math.abs(dy)) go(dx < 0 ? 1 : -1);
});

// ---------- Boot ----------
// With one recipe in progress, go straight back to it.
const p = save.get('progress', null);
const inProgress = p && RECIPES.find((r) => r.id === p.id && savedProgress(r));
state = inProgress ? { view: 'intro', recipe: inProgress } : { view: 'list' };
show();

if (new URLSearchParams(location.search).has('test')) window.__cook = { state: () => state, show, RECIPES, measures };
