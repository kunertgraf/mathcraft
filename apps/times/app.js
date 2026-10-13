// Times Tables: old-school timed multiplication worksheets.
// Views: menu → ready → test (keypad + countdown) → graded (red pen) ; stickers.
import { store } from '../../shared/store.js';
import {
  TABLES, makeSheet, grade, bests, medal, misses, stickers, STICKERS, teacherNote, randomSticker, testsTaken,
} from './tests.js';

const root = document.getElementById('app');
const MAX_DIGITS = 3;

let view = 'menu';
let run = null; // { sheet, answers, cur, endsAt, left, result }
let tickTimer = null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const clock = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const today = () => new Date().toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });
const kidName = () => store.settings.get('kidName', '') || '';
const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };

function show(next) {
  if (next) view = next;
  root.innerHTML = { menu: menuView, ready: readyView, test: testView, graded: gradedView, stickers: stickersView }[view]();
  root.querySelector('.cur')?.scrollIntoView({ block: 'nearest' });
}

// ---------- Menu ----------
function sheetCard(id, title, blurb, total, extra = '') {
  const best = bests()[id];
  const m = medal(best, total);
  return `
    <button class="card" data-action="pick" data-id="${id}">
      <span class="card-title">${esc(title)}</span>
      <span class="card-blurb">${esc(blurb)}</span>
      <span class="card-best">${best ? `Best: <b>${best.score}</b>/${total}` : 'Not tried yet'}</span>
      ${m ? `<span class="medal">${MEDAL[m]}</span>` : ''}
      ${extra}
    </button>`;
}

function menuView() {
  const missCount = Object.keys(misses()).length;
  const have = Object.keys(stickers()).length;
  return `
    <main class="board">
      <header class="board-top">
        <h1 class="chalk">Times Tables</h1>
        <button class="sticker-btn" data-action="stickers">📒 Sticker Book <b>${have}/${STICKERS.length}</b></button>
      </header>
      <section>
        <h2 class="chalk small">Big tests</h2>
        <div class="cards big">
          ${sheetCard('mad', 'Mad Minute', '30 problems · 1 minute', 30)}
          ${sheetCard('big', 'The Big 100', '100 problems · 5 minutes', 100)}
          ${missCount >= 3 ? sheetCard('fix', 'Fix My Mistakes', `${missCount} facts to fix · 1 minute`, 20) : ''}
        </div>
      </section>
      <section>
        <h2 class="chalk small">One table at a time <span class="hint">30 problems · 1 minute</span></h2>
        <div class="cards tables">
          ${TABLES.map((n) => {
            const best = bests()[`t${n}`];
            const m = medal(best, 30);
            return `<button class="card table" data-action="pick" data-id="t${n}">
              <span class="table-n">${n}s</span>
              <span class="card-best">${best ? `${best.score}/30` : '—'}</span>
              ${m ? `<span class="medal">${MEDAL[m]}</span>` : ''}
            </button>`;
          }).join('')}
        </div>
      </section>
      <p class="chalk legend">🥉 15+ &nbsp; 🥈 24+ &nbsp; 🥇 perfect paper &nbsp;·&nbsp; Tests taken: ${testsTaken()}</p>
    </main>`;
}

// ---------- Worksheet ----------
function paperHead(sheet, right = '', score = null) {
  return `
    <div class="paper-head">
      <div class="field">Name: <span class="hand">${esc(kidName()) || '&nbsp;'.repeat(12)}</span></div>
      <div class="field">Date: <span class="hand">${today()}</span></div>
      <div class="field">Score: ${score == null ? '<span class="blank-line">____</span>' : `<span class="red-hand">${score}</span>`} / ${sheet.problems.length}</div>
      ${right}
    </div>
    <h1 class="paper-title">${esc(sheet.title)}</h1>`;
}

function problemsHTML(answers, marks, cur) {
  return run.sheet.problems
    .map((p, i) => {
      const mark = marks?.[i];
      const cls = ['prob', i === cur ? 'cur' : '', mark ?? ''].join(' ');
      return `
        <button class="${cls}" data-action="cell" data-i="${i}" style="--i:${i}">
          <span class="num">${i + 1}.</span>
          <span class="top">${p.a}</span>
          <span class="bot"><span class="x">×</span>${p.b}</span>
          <span class="ans hand">${esc(answers[i] ?? '')}</span>
          ${mark === 'right' ? '<span class="pen tick">✓</span>' : ''}
          ${mark === 'wrong' ? `<span class="pen fix">${p.a * p.b}</span>` : ''}
        </button>`;
    })
    .join('');
}

function readyView() {
  const { sheet } = run;
  const best = bests()[sheet.id];
  return `
    <main class="desk">
      <div class="paper ready">
        ${paperHead(sheet)}
        <div class="rules">
          <p><b>${sheet.problems.length} problems.</b> You have <b>${clock(sheet.seconds)}</b>.</p>
          <p>Do as many as you can! Skip any you don't know and come back later.</p>
          ${best ? `<p>Your best: <b>${best.score}</b> right. Can you beat it?</p>` : ''}
        </div>
        <div class="ready-buttons">
          <button class="btn quiet" data-action="menu">◀ Back</button>
          <button class="btn go" data-action="start">Start the clock!</button>
        </div>
      </div>
    </main>`;
}

function testView() {
  const { sheet, answers, cur } = run;
  const done = answers.filter((a) => a !== '').length;
  const all = done === sheet.problems.length;
  return `
    <main class="desk testing">
      <div class="paper sheet">
        ${paperHead(sheet)}
        <div class="grid ${sheet.problems.length > 30 ? 'dense' : ''}">${problemsHTML(answers, null, cur)}</div>
      </div>
      <aside class="side">
        <div class="lcd ${run.left <= 10 ? 'low' : ''}" data-clock>${clock(run.left)}</div>
        <div class="count">${done} of ${sheet.problems.length} done</div>
        <div class="pad">
          ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button class="key" data-action="key" data-k="${d}">${d}</button>`).join('')}
          <button class="key fn" data-action="back">⌫</button>
          <button class="key" data-action="key" data-k="0">0</button>
          <button class="key fn next" data-action="next">Next</button>
        </div>
        <button class="btn ${all ? 'go' : 'quiet'} hand-in" data-action="handin">${all ? 'Hand it in! ✓' : 'Hand in early'}</button>
      </aside>
      ${run.countdown != null ? `<div class="overlay"><div class="big-count">${run.countdown || 'GO!'}</div></div>` : ''}
      ${run.pencilsDown ? '<div class="overlay"><div class="big-count small">Pencils down!</div></div>' : ''}
    </main>`;
}

function gradedView() {
  const r = run.result;
  const pct = r.score / r.total;
  const stamp = `<div class="grade-circle">${r.score}<small>/${r.total}</small></div>`;
  return `
    <main class="desk graded">
      <div class="paper sheet">
        ${paperHead(r.sheet, stamp, r.score)}
        <div class="teacher">${esc(teacherNote(r))}</div>
        <div class="sticker-slap">${randomSticker(r.score, r.total)}</div>
        <div class="grid ${r.total > 30 ? 'dense' : ''}">${problemsHTML(run.answers, r.marks, -1)}</div>
      </div>
      <aside class="side report">
        <h2>Report card</h2>
        <div class="stat"><span>Right</span><b>${r.score}</b></div>
        <div class="stat"><span>Tried</span><b>${r.tried} of ${r.total}</b></div>
        <div class="stat"><span>Best run</span><b>${r.bestStreak} in a row</b></div>
        ${r.finished ? `<div class="stat"><span>Time left</span><b>${clock(r.left)}</b></div>` : ''}
        ${r.record ? `<div class="record">🏆 NEW RECORD!<small>Beat your old best of ${r.prev.score}</small></div>` : r.prev ? `<div class="stat"><span>Your best</span><b>${bests()[r.sheet.id].score}</b></div>` : '<div class="record first">First try on this sheet!</div>'}
        ${r.stickers.length ? `<div class="new-stickers"><h3>New sticker${r.stickers.length > 1 ? 's' : ''}!</h3>${r.stickers.map((s) => `<div class="new-sticker"><span>${s.emoji}</span><b>${esc(s.name)}</b></div>`).join('')}</div>` : ''}
        <div class="stars-earned">⭐ +${1 + (r.record ? 1 : 0) + (pct === 1 ? 1 : 0)}</div>
        <button class="btn go" data-action="again">Try again</button>
        <button class="btn quiet" data-action="menu">All tests</button>
      </aside>
    </main>`;
}

// ---------- Sticker book ----------
function stickersView() {
  const have = stickers();
  return `
    <main class="board">
      <header class="board-top">
        <button class="btn quiet small-btn" data-action="menu">◀ Tests</button>
        <h1 class="chalk">Sticker Book</h1>
        <span class="chalk hint">${Object.keys(have).length} of ${STICKERS.length}</span>
      </header>
      <div class="book">
        ${STICKERS.map(
          (s) => `
          <div class="slot ${have[s.id] ? 'got' : ''}">
            <span class="slot-emoji">${have[s.id] ? s.emoji : '?'}</span>
            <b>${esc(s.name)}</b>
            <small>${esc(s.how)}</small>
          </div>`,
        ).join('')}
      </div>
    </main>`;
}

// ---------- Test flow ----------
function pick(id) {
  run = { sheet: makeSheet(id) };
  run.answers = run.sheet.problems.map(() => '');
  run.cur = 0;
  run.left = run.sheet.seconds;
  show('ready');
}

function start() {
  unlockAudio();
  show('test');
  let n = 3;
  run.countdown = n;
  show();
  beep(520, 0.12);
  const step = () => {
    n -= 1;
    run.countdown = n;
    if (n < 0) {
      run.countdown = null;
      run.endsAt = Date.now() + run.sheet.seconds * 1000;
      tickTimer = setInterval(tick, 200);
      return show();
    }
    beep(n === 0 ? 880 : 520, n === 0 ? 0.3 : 0.12);
    show();
    setTimeout(step, 700);
  };
  setTimeout(step, 700);
}

let lastWhole = null;
function tick() {
  run.left = (run.endsAt - Date.now()) / 1000;
  const el = root.querySelector('[data-clock]');
  if (el) {
    el.textContent = clock(run.left);
    el.classList.toggle('low', run.left <= 10);
  }
  const whole = Math.ceil(run.left);
  if (whole !== lastWhole && whole <= 5 && whole > 0) beep(660, 0.08);
  lastWhole = whole;
  if (run.left <= 0) {
    stopClock();
    run.pencilsDown = true;
    buzzer();
    show();
    setTimeout(() => view === 'test' && run && handIn(), 1300);
  }
}

function stopClock() {
  clearInterval(tickTimer);
  tickTimer = null;
}

function handIn() {
  stopClock();
  run.pencilsDown = false;
  run.result = grade(run.sheet, run.answers, run.endsAt ? (run.endsAt - Date.now()) / 1000 : 0);
  show('graded');
  // Red pen marks go on one by one, then the score.
  const cells = [...root.querySelectorAll('.prob')];
  const gap = cells.length > 30 ? 25 : 60;
  const r = run.result;
  const still = () => view === 'graded' && run?.result === r; // he may leave before the marking finishes
  cells.forEach((c, i) => setTimeout(() => {
    if (!still()) return;
    c.classList.add('marked');
    if (c.classList.contains('right')) beep(1200 + (i % 5) * 40, 0.04, 0.05);
  }, 300 + i * gap));
  setTimeout(() => {
    if (!still()) return;
    root.querySelector('.graded')?.classList.add('scored');
    if (r.record || r.score === r.total) fanfare();
    else beep(700, 0.2);
  }, 400 + cells.length * gap);
}

function nextBlank(from) {
  const n = run.answers.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (run.answers[i] === '') return i;
  }
  return Math.min(from + 1, n - 1);
}

function refreshTest() {
  // Light update so typing never rebuilds the whole sheet.
  const cells = root.querySelectorAll('.prob');
  cells.forEach((c, i) => {
    c.classList.toggle('cur', i === run.cur);
    c.querySelector('.ans').textContent = run.answers[i];
  });
  const done = run.answers.filter((a) => a !== '').length;
  root.querySelector('.count').textContent = `${done} of ${run.answers.length} done`;
  const btn = root.querySelector('.hand-in');
  const all = done === run.answers.length;
  btn.classList.toggle('go', all);
  btn.classList.toggle('quiet', !all);
  btn.textContent = all ? 'Hand it in! ✓' : 'Hand in early';
  cells[run.cur]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

const testing = () => view === 'test' && run?.endsAt && tickTimer;

function typeDigit(d) {
  if (!testing()) return;
  const a = run.answers[run.cur];
  if (a.length >= MAX_DIGITS) return;
  run.answers[run.cur] = a === '0' ? String(d) : a + d;
  click();
  refreshTest();
}

function backspace() {
  if (!testing()) return;
  run.answers[run.cur] = run.answers[run.cur].slice(0, -1);
  click();
  refreshTest();
}

function next() {
  if (!testing()) return;
  click();
  run.cur = nextBlank(run.cur);
  refreshTest();
}

// ---------- Input ----------
const actions = {
  menu: () => {
    stopClock();
    run = null;
    show('menu');
  },
  stickers: () => show('stickers'),
  pick: (el) => pick(el.dataset.id),
  start,
  again: () => pick(run.sheet.id),
  key: (el) => typeDigit(el.dataset.k),
  back: backspace,
  next,
  cell: (el) => {
    if (!testing()) return;
    run.cur = Number(el.dataset.i);
    refreshTest();
  },
  handin: () => {
    if (testing()) handIn();
  },
};

// pointerdown for the keypad so fast tapping never loses digits; click for everything else.
root.addEventListener('pointerdown', (e) => {
  unlockAudio();
  const el = e.target.closest('[data-action]');
  if (!el || !['key', 'back', 'next', 'cell'].includes(el.dataset.action)) return;
  e.preventDefault();
  el.classList.add('pressed');
  setTimeout(() => el.classList.remove('pressed'), 120);
  actions[el.dataset.action](el);
});
root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || ['key', 'back', 'next', 'cell'].includes(el.dataset.action)) return;
  actions[el.dataset.action]?.(el);
});

// Hardware keyboard too.
document.addEventListener('keydown', (e) => {
  if (/^\d$/.test(e.key)) typeDigit(e.key);
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowRight') {
    e.preventDefault();
    next();
  }
});

// ---------- Sound ----------
let audio;
function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

function beep(freq, dur, vol = 0.15, type = 'square', at = 0) {
  if (!audio) return;
  const t = audio.currentTime + at;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + dur);
}

const click = () => beep(1800, 0.02, 0.04);
const buzzer = () => beep(110, 0.7, 0.2, 'sawtooth');
const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.25, 0.12, 'square', i * 0.13));

// ---------- Boot ----------
show('menu');
if (new URLSearchParams(location.search).has('test')) {
  window.__times = { run: () => run, show, pick, handIn, setLeft: (s) => (run.endsAt = Date.now() + s * 1000) };
}
