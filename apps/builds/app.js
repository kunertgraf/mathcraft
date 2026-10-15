// Lego Builds: step-by-step instruction pages, one big page at a time like a LEGO booklet.
// Views: list (all builds) → book (one build's pages). Progress per build is saved.
import { store } from '../../shared/store.js';
import { BUILDS } from './builds.js';

const save = store.forApp('builds');
const root = document.getElementById('app');

let build = null;
let page = 0;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const img = (b, id) => `${b.id}/${id}.jpg`;
const progress = () => save.get('progress', {}); // build id → page index
const built = () => save.get('built', {}); // build id → times finished

function where(b, i) {
  const p = b.pages[i];
  if (p.label) return p.label;
  return `Step ${p.id} of ${b.steps}`;
}

// ---------- List ----------
function listView() {
  const prog = progress();
  const done = built();
  return `
    <main class="list">
      <header class="bar"><h1>Lego Builds</h1></header>
      <div class="builds">
        ${BUILDS.map((b) => {
          const at = prog[b.id] ?? 0;
          const status = done[b.id] && !at ? '✅ Built!' : at ? `Up to: ${where(b, at)}` : 'Not started';
          return `
            <button class="build" data-action="open" data-id="${b.id}">
              <img src="${img(b, b.cover)}" alt="">
              <span class="build-title">${esc(b.title)}</span>
              <span class="build-blurb">${esc(b.blurb)}</span>
              <span class="build-status">${esc(status)}</span>
            </button>`;
        }).join('')}
        <div class="build soon"><span>🧱</span>More builds coming soon!</div>
      </div>
    </main>`;
}

// ---------- Book ----------
function bookView() {
  const b = build;
  const last = b.pages.length - 1;
  const showTips = save.get('tips', false);
  return `
    <main class="book">
      <header class="bar">
        <button class="back" data-action="list" aria-label="All builds">◂ Builds</button>
        <h1>${esc(b.title)}</h1>
        <span class="where" aria-live="polite">${esc(where(b, page))}</span>
      </header>
      <div class="sheet ${b.pages[page].sub ? 'sub' : ''}">
        <img id="pic" src="${img(b, b.pages[page].id)}" alt="${esc(where(b, page))}" draggable="false">
        ${b.pages[page].sub ? '<span class="sub-tag">Mini build</span>' : ''}
      </div>
      <div class="nav">
        <button class="prev" data-action="prev" ${page ? '' : 'disabled'}>◂ Back</button>
        <button class="next" data-action="next">${page === 0 ? 'Start building ▸' : page === last ? 'Done! 🎉' : 'Next ▸'}</button>
      </div>
      <div class="strip" role="navigation" aria-label="Jump to a step">
        ${b.pages
          .map((p, i) => `<button class="${p.sub ? 'sub' : ''} ${i < page ? 'done' : ''}" data-action="go" data-i="${i}" ${i === page ? 'aria-current="true"' : ''}>${esc(p.label || p.id)}</button>`)
          .join('')}
      </div>
      <div class="tips">
        <button class="tip-toggle ${showTips ? 'on' : ''}" data-action="tips">💡 Hints ${showTips ? 'on' : 'off'}</button>
        ${showTips ? `<p class="tip">${esc(b.pages[page].tip || 'No extra hints for this step.')}</p>` : ''}
      </div>
    </main>`;
}

function show() {
  root.innerHTML = build ? bookView() : listView();
  root.querySelector('.strip [aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (build) preload();
}

// Load the next couple of pages so turning is instant.
function preload() {
  for (const k of [page + 1, page + 2, page - 1]) {
    if (build.pages[k]) new Image().src = img(build, build.pages[k].id);
  }
}

function open(id) {
  build = BUILDS.find((b) => b.id === id);
  page = Math.min(progress()[id] ?? 0, build.pages.length - 1);
  show();
}

function go(i) {
  page = Math.max(0, Math.min(build.pages.length - 1, i));
  save.set('progress', { ...progress(), [build.id]: page });
  show();
}

function finish() {
  const done = built();
  save.set('built', { ...done, [build.id]: (done[build.id] ?? 0) + 1 });
  save.set('progress', { ...progress(), [build.id]: 0 });
  save.addStars(3);
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="celebrate" data-action="list">
      <div class="trophy">🏆</div>
      <h2>You built the ${esc(build.title)}!</h2>
      <p>Tap to go back to your builds</p>
    </div>`,
  );
  confetti();
}

function confetti() {
  const colors = ['#e3000b', '#ffd500', '#0055bf', '#00852b', '#ffffff'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('span');
    c.className = 'brick';
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 1.2}s`;
    c.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    document.body.append(c);
    setTimeout(() => c.remove(), 4500);
  }
}

// ---------- Input ----------
root.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const act = btn.dataset.action;
  if (act === 'open') open(btn.dataset.id);
  else if (act === 'list') {
    build = null;
    show();
  } else if (act === 'prev') go(page - 1);
  else if (act === 'next') page === build.pages.length - 1 ? finish() : go(page + 1);
  else if (act === 'go') go(Number(btn.dataset.i));
  else if (act === 'tips') {
    save.set('tips', !save.get('tips', false));
    show();
  }
});

// Swipe the picture to turn pages.
let x0 = null;
root.addEventListener('touchstart', (e) => {
  x0 = e.target.closest('.sheet') ? e.touches[0].clientX : null;
}, { passive: true });
root.addEventListener('touchend', (e) => {
  if (x0 === null || !build) return;
  const dx = e.changedTouches[0].clientX - x0;
  x0 = null;
  if (Math.abs(dx) > 50) go(page + (dx < 0 ? 1 : -1));
});

addEventListener('keydown', (e) => {
  if (!build) return;
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    go(page + 1);
  }
  if (e.key === 'ArrowLeft') go(page - 1);
});

// ---------- Boot ----------
show();
if (new URLSearchParams(location.search).has('test')) {
  window.__builds = { open, go, finish, state: () => ({ build: build?.id, page }) };
}
