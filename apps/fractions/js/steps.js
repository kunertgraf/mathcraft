// The four build-step types. Each step: `parts` (instruction), update/draw,
// pointer handlers (down/move/up), optional hint(), and reports to the
// mission via m.stepDone({ skill, correct, firstTry, precise, fixed }).
import { INK, UI, RAMPS } from '../../../shared/art/palette.js';
import { fillArea, drawGhost, drawText, drawFraction } from '../../../shared/art/render.js';
import { GROUND, WATER, X0, X1, SPAN, B, xAt, fAt } from './world.js';
import { button, hit, FONT } from './ui.js';
import { sfx } from './audio.js';
import { ease } from './fx.js';
import { firstTime, markSeen, DEN_LCM } from './learn.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Workbench content sits right of centre so Pip's speech bubble (left) never covers it.
const CX = 600;
const PIECE_NAMES = { 2: 'halves', 3: 'thirds', 4: 'fourths', 6: 'sixths', 8: 'eighths' };
const WOOD = RAMPS.wood;

// Small helper text under a workbench (white with shadow).
function helpText(ctx, text, y) {
  ctx.font = FONT(20, 600);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgb(0 0 0 / 0.5)';
  ctx.fillText(text, CX + 2, y + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, CX, y);
  ctx.textAlign = 'left';
}

// Translucent backdrop that groups a workbench task above the world.
function workbench(ctx, y, h) {
  ctx.fillStyle = 'rgb(20 21 43 / 0.55)';
  ctx.fillRect(CX - 290, y, 580, h);
}

// ===================================================================
// PLACE: drag a support along the bridge to a fraction position.
// ===================================================================
const RULER_Y = GROUND - 92;

function drawRuler(ctx, d, mode) {
  const h = 16;
  ctx.fillStyle = UI.ruler;
  ctx.fillRect(X0, RULER_Y, SPAN, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(X0, RULER_Y, SPAN, h);
  for (let k = 0; k <= d; k++) {
    const end = k === 0 || k === d;
    if (mode === 'bare' && !end) continue;
    const x = xAt(k / d);
    ctx.fillStyle = UI.rulerInk;
    ctx.fillRect(Math.round(x - 1.5), RULER_Y, 3, end ? h : h * 0.7);
    if (end) drawText(ctx, k === 0 ? '0' : '1', x, RULER_Y - 30, { align: 'center' });
    else if (mode === 'labels') drawFraction(ctx, k, d, x, RULER_Y - 48, { scale: 2 });
  }
}

function drawPost(ctx, x, { ghost = false, colour = '#ffffff' } = {}) {
  const w = 24, top = GROUND + 24, h = WATER + 12 - top;
  if (ghost) drawGhost(ctx, x - w / 2, top, w, h, colour);
  else fillArea(ctx, 'log', Math.round(x - w / 2), top, w, h, B);
}

function guideLine(ctx, x, colour = 'rgb(255 255 255 / 0.8)') {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, RULER_Y + 18);
  ctx.lineTo(x, GROUND + 20);
  ctx.stroke();
  ctx.restore();
}

export class PlaceStep {
  constructor(m, spec) {
    Object.assign(this, spec);
    this.m = m;
    this.skill = 'place';
    this.target = spec.n / spec.d;
    this.attempts = 0;
    this.ghost = null;
    this.state = 'ready';
    if (firstTime('place')) this.demo();
  }

  get parts() {
    return ['Put a support at ', { f: [this.n, this.d] }, ' of the bridge.'];
  }

  demo() {
    const { m } = this;
    this.state = 'demo';
    this.demoPost = { x: X0 + 20 };
    this.demoRuler = 2;
    m.say('Halfway across the bridge is 1/2. Watch me!', 4);
    m.fx.tween(this.demoPost, { x: xAt(0.5) }, 1.4, {
      delay: 0.6,
      easing: ease.outQuad,
      done: () => {
        sfx.thunk();
        m.fx.after(1.6, () => {
          this.demoPost = null;
          this.state = 'ready';
          markSeen('place');
          m.say('Your turn! Drag along the bridge, then let go to build.', 4);
        });
      },
    });
  }

  hint() {
    this.scaffold = 'labels';
  }

  draw(ctx) {
    drawRuler(ctx, this.demoPost ? 2 : this.d, this.demoPost ? 'labels' : this.scaffold);
    if (this.demoPost) {
      guideLine(ctx, this.demoPost.x);
      drawPost(ctx, this.demoPost.x, { ghost: true, colour: UI.accent });
    }
    if (this.ghost) {
      guideLine(ctx, this.ghost.x);
      drawPost(ctx, this.ghost.x, { ghost: true, colour: '#ffffff' });
    }
    if (this.state === 'wrong') {
      const tx = xAt(this.target);
      guideLine(ctx, tx, UI.accent);
      drawPost(ctx, tx, { ghost: true, colour: UI.accent });
      drawFraction(ctx, this.n, this.d, tx, GROUND + 40, { scale: 3, colour: UI.accent });
    }
  }

  down(p) {
    if (this.state !== 'ready' || p.y < 170) return;
    this.ghost = { x: clamp(p.x, X0, X1) };
    sfx.tap();
  }

  move(p) {
    if (this.ghost) this.ghost.x = clamp(p.x, X0, X1);
  }

  up() {
    if (!this.ghost) return;
    const x = this.ghost.x;
    this.ghost = null;
    this.commit(fAt(x));
  }

  commit(f) {
    const { m } = this;
    const err = Math.abs(f - this.target);
    const tol = this.scaffold === 'labels' ? 1 / 20 : 1 / 24;
    if (err <= tol) return this.succeed(f, err <= 1 / 80);

    // Wrong: build where he put it, let the bridge sag there, and show the target.
    this.attempts += 1;
    m.reportMiss();
    this.state = 'wrong';
    const temp = { f, drop: 0 };
    m.bridge.supports.push(temp);
    m.bridge.sag = { f, amt: 0 };
    m.fx.tween(m.bridge.sag, { amt: 16 }, 0.5, { easing: ease.outBounce });
    sfx.crumble();
    const k = Math.round(f * this.d);
    let msg;
    if (k / this.d === this.target) msg = `So close! A little to the ${f > this.target ? 'left' : 'right'}.`;
    else if (k === 0) msg = `That's almost at 0. ${this.n}/${this.d} is here!`;
    else if (k === this.d) msg = `That's almost at 1. ${this.n}/${this.d} is here!`;
    else msg = `You built at about ${k}/${this.d}. ${this.n}/${this.d} is here!`;
    m.say(msg, 2.6);

    m.fx.after(2.2, () => {
      m.bridge.supports = m.bridge.supports.filter((s) => s !== temp);
      m.fx.burst(xAt(f), GROUND + 80, WOOD, { n: 18 });
      m.fx.tween(m.bridge.sag, { amt: 0 }, 0.3, { done: () => (m.bridge.sag = null) });
      if (this.attempts >= 3) return this.autoSolve();
      if (this.attempts >= 2) this.scaffold = 'labels';
      this.state = 'ready';
    });
  }

  autoSolve() {
    this.m.say(`Here's ${this.n}/${this.d}. Count the marks with me!`, 3);
    this.scaffold = 'labels';
    this.m.fx.after(1.2, () => this.succeed(this.target, false, false));
  }

  succeed(f, precise, earned = true) {
    const { m } = this;
    this.state = 'done';
    const support = { f, drop: -220 };
    m.bridge.supports.push(support);
    m.fx.tween(support, { drop: 0 }, 0.45, { easing: ease.outBounce });
    m.fx.after(0.3, () => {
      sfx.thunk();
      m.fx.burst(xAt(f), GROUND + 30, WOOD, { n: 16 });
    });
    m.fx.after(0.8, () =>
      m.stepDone({ skill: 'place', correct: earned, firstTry: earned && this.attempts === 0, precise, fixed: earned && this.attempts > 0, at: { x: xAt(f), y: GROUND } }),
    );
  }
}

// ===================================================================
// CUT: split a plank into d equal pieces, then take n of them.
// ===================================================================
const PLANK = { x: CX - 240, y: 250, w: 480, h: 56 };

export class CutStep {
  constructor(m, spec) {
    Object.assign(this, spec);
    this.m = m;
    this.skill = 'cut';
    this.marks = [];
    this.phase = 'cut';
    this.attempts = 0;
    this.takeAttempts = 0;
    this.selected = new Set();
    this.guides = false;
    this.state = 'ready';
    this.sawBtn = { x: CX - 80, y: 352, w: 160, h: 62, label: 'Saw!' };
    this.doneBtn = { x: CX - 80, y: 382, w: 160, h: 62, label: 'Done' };
    if (firstTime('cut')) this.demo();
  }

  get parts() {
    if (this.phase === 'cut') return [`Cut the plank into ${this.d} equal pieces.`];
    return ['Take ', { f: [this.take, this.d] }, ' of the plank.'];
  }

  demo() {
    const { m } = this;
    this.state = 'demo';
    this.demoMark = { f: 0.15, split: 0 };
    m.say('Equal pieces are all the same size. Watch me cut this into 2!', 4);
    m.fx.tween(this.demoMark, { f: 0.5 }, 1.2, {
      delay: 0.6,
      done: () => {
        sfx.saw();
        m.fx.tween(this.demoMark, { split: 14 }, 0.4, { easing: ease.outBack });
        m.say('2 equal pieces. Each one is 1/2 of the plank!', 3);
        m.fx.after(2.2, () => {
          this.demoMark = null;
          this.state = 'ready';
          markSeen('cut');
          m.say('Your turn! Tap the plank to add saw marks. Slide them to fix.', 4);
        });
      },
    });
  }

  hint() {
    this.guides = true;
  }

  piecesFrom(marks) {
    const cuts = [0, ...[...marks].sort((a, b) => a - b), 1];
    return cuts.slice(1).map((c, i) => [cuts[i], c]);
  }

  // Layout of separated pieces for the "take" phase.
  pieceRects() {
    const gap = 12;
    const pw = PLANK.w / this.d;
    const total = PLANK.w + gap * (this.d - 1);
    const x0 = CX - total / 2;
    return Array.from({ length: this.d }, (_, i) => ({
      x: x0 + i * (pw + gap),
      y: PLANK.y - (this.selected.has(i) ? 18 : 0),
      w: pw,
      h: PLANK.h,
    }));
  }

  draw(ctx) {
    workbench(ctx, 200, 260);
    const { x, y, w, h } = PLANK;

    if (this.state === 'demo' && this.demoMark) {
      const mx = x + this.demoMark.f * w, s = this.demoMark.split;
      fillArea(ctx, 'planks', x - s, y, mx - x, h, h);
      fillArea(ctx, 'planks', mx + s, y, x + w - mx, h, h);
      if (!s) this.drawMark(ctx, mx, UI.accent);
      return;
    }

    if (this.phase === 'cut') {
      if (this.wrongPieces) {
        // Show the uneven pieces apart, biggest in red, smallest in yellow.
        const sizes = this.wrongPieces.map(([a, b]) => b - a);
        const max = Math.max(...sizes), min = Math.min(...sizes);
        this.wrongPieces.forEach(([a, b], i) => {
          const px = x + a * w + i * 8 - ((this.d - 1) * 8) / 2;
          fillArea(ctx, 'planks', px, y, (b - a) * w, h, h);
          const tint = sizes[i] === max ? UI.bad : sizes[i] === min ? UI.accent : null;
          if (tint) {
            ctx.fillStyle = tint;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(px, y, (b - a) * w, h);
            ctx.globalAlpha = 1;
          }
        });
      } else {
        fillArea(ctx, 'planks', x, y, w, h, h);
        if (this.guides) {
          ctx.fillStyle = 'rgb(255 255 255 / 0.7)';
          for (let k = 1; k < this.d; k++) ctx.fillRect(Math.round(x + (k / this.d) * w - 1), y - 14, 2, 10);
        }
        for (const f of this.marks) this.drawMark(ctx, x + f * w, f === this.dragging?.f ? UI.accent : '#ffffff');
      }
      const left = this.d - 1 - this.marks.length;
      this.sawBtn.enabled = left === 0 && this.state === 'ready';
      button(ctx, this.sawBtn);
      if (left > 0) helpText(ctx, `Tap the plank to add ${left} more saw mark${left > 1 ? 's' : ''}.`, y + h + 26);
      else if (left < 0) helpText(ctx, 'Too many marks! Tap one to remove it.', y + h + 26);
    } else {
      this.pieceRects().forEach((r, i) => {
        if (this.flown?.has(i)) return;
        fillArea(ctx, 'planks', r.x, r.y, r.w, r.h, PLANK.h);
        if (this.selected.has(i)) {
          ctx.strokeStyle = UI.accent;
          ctx.lineWidth = 4;
          ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
        }
      });
      if (this.flying) for (const fp of this.flying) fillArea(ctx, 'planks', fp.x, fp.y, fp.w, fp.h, fp.h);
      if (this.state === 'ready') {
        this.doneBtn.enabled = this.selected.size > 0;
        button(ctx, this.doneBtn);
        helpText(ctx, `Each piece is 1/${this.d}. Tap pieces to pick them up.`, PLANK.y + PLANK.h + 32);
      }
    }
  }

  drawMark(ctx, mx, colour) {
    const { y, h } = PLANK;
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(mx - 3), y - 12, 6, h + 24);
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(mx - 1.5), y - 10, 3, h + 20);
    // little saw-handle nub on top
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(mx - 9), y - 24, 18, 12);
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(mx - 6), y - 21, 12, 6);
  }

  down(p) {
    if (this.state !== 'ready') return;
    if (this.phase === 'cut') {
      if (this.wrongPieces) return;
      if (hit(this.sawBtn, p)) {
        if (this.marks.length === this.d - 1) this.saw();
        return;
      }
      const { x, y, w, h } = PLANK;
      if (p.y < y - 40 || p.y > y + h + 30 || p.x < x - 20 || p.x > x + w + 20) return;
      const f = clamp((p.x - x) / w, 0.02, 0.98);
      const near = this.marks.find((mf) => Math.abs(x + mf * w - p.x) < 24);
      if (near !== undefined) {
        this.dragging = { f: near, startX: p.x, moved: false, isNew: false };
      } else {
        this.marks.push(f);
        this.dragging = { f, startX: p.x, moved: false, isNew: true };
      }
      sfx.tap();
    } else {
      if (hit(this.doneBtn, p)) {
        if (this.selected.size > 0) this.checkTake();
        return;
      }
      this.pieceRects().forEach((r, i) => {
        if (hit({ x: r.x, y: r.y - 20, w: r.w, h: r.h + 40 }, p)) {
          this.selected.has(i) ? this.selected.delete(i) : this.selected.add(i);
          sfx.tap();
        }
      });
    }
  }

  move(p) {
    const dr = this.dragging;
    if (!dr) return;
    if (Math.abs(p.x - dr.startX) > 6) dr.moved = true;
    const i = this.marks.indexOf(dr.f);
    const f = clamp((p.x - PLANK.x) / PLANK.w, 0.02, 0.98);
    this.marks[i] = f;
    dr.f = f;
  }

  up() {
    const dr = this.dragging;
    this.dragging = null;
    if (dr && !dr.moved && !dr.isNew) this.marks = this.marks.filter((f) => f !== dr.f);
  }

  saw() {
    const { m } = this;
    const pieces = this.piecesFrom(this.marks);
    const tol = (this.attempts >= 1 ? 0.35 : 0.28) / this.d;
    const even = pieces.every(([a, b]) => Math.abs(b - a - 1 / this.d) <= tol);
    sfx.saw();
    if (even) return this.cutDone();

    this.attempts += 1;
    m.reportMiss();
    this.state = 'wrong';
    this.wrongPieces = pieces;
    m.fx.after(0.3, () => sfx.oops());
    m.say("Those pieces aren't the same size! The red one is too big.", 3);
    m.fx.after(2.2, () => {
      this.wrongPieces = null;
      this.state = 'ready';
      if (this.attempts >= 2) this.guides = true;
      if (this.attempts >= 3) {
        m.say("Let's make them equal together. Look at the little marks!", 3);
        this.marks = Array.from({ length: this.d - 1 }, (_, k) => (k + 1) / this.d);
        this.state = 'auto';
        m.fx.after(1.6, () => this.cutDone());
      }
    });
  }

  cutDone() {
    const { m } = this;
    this.marks.forEach((f) => m.fx.burst(PLANK.x + f * PLANK.w, PLANK.y + PLANK.h / 2, [WOOD[3], WOOD[4]], { n: 10, speed: 160 }));
    this.phase = 'take';
    this.state = 'ready';
    sfx.ding();
    m.say(`${this.d} equal pieces! Each one is 1/${this.d}.`, 2.5);
  }

  checkTake() {
    const { m } = this;
    const k = this.selected.size;
    if (k === this.take) {
      sfx.ding();
      this.state = 'done';
      const rects = this.pieceRects();
      this.flown = new Set(this.selected);
      this.flying = [...this.selected].map((i) => ({ ...rects[i] }));
      const slot = X0 + m.bridge.deck * B;
      this.flying.forEach((fp, j) =>
        m.fx.tween(fp, { x: slot, y: GROUND, w: B, h: B / 2 }, 0.6, { delay: j * 0.08, easing: ease.inQuad }),
      );
      const firstTry = this.attempts === 0 && this.takeAttempts === 0;
      m.fx.after(0.8, () =>
        m.stepDone({ skill: 'cut', correct: true, firstTry, precise: false, fixed: !firstTry, at: { x: X0 + B * 3, y: GROUND } }),
      );
      return;
    }
    this.takeAttempts += 1;
    m.reportMiss();
    sfx.oops();
    m.say(`That's ${k}/${this.d}. We need ${this.take}/${this.d} — that's ${this.take} piece${this.take > 1 ? 's' : ''}.`, 3);
    if (this.takeAttempts >= 3) {
      this.selected = new Set(Array.from({ length: this.take }, (_, i) => i));
      m.fx.after(1.2, () => this.checkTake());
    }
  }
}

// ===================================================================
// FILL: fill a gap of n/d of a block with tray pieces (equivalence).
// ===================================================================
const BLOCK = { x: CX - 240, y: 236, w: 480, h: 64 };

export class FillStep {
  constructor(m, spec) {
    Object.assign(this, spec);
    this.m = m;
    this.skill = 'fill';
    this.need = (spec.n * DEN_LCM) / spec.d; // in 24ths
    this.placed = []; // denominators of placed pieces
    this.attempts = 0;
    this.state = 'ready';
    this.guides = false;
    this.overflowCounted = false;
    if (firstTime('fill')) {
      m.say('Drag pieces into the empty gap until it is exactly full!', 4.5);
      markSeen('fill');
    }
  }

  get parts() {
    return ['Fill the gap. It needs ', { f: [this.n, this.d] }, ' of a block.'];
  }

  hint() {
    this.guides = true;
  }

  total() {
    return this.placed.reduce((s, d) => s + DEN_LCM / d, 0);
  }

  trayRects() {
    const pieces = [...this.tray].sort((a, b) => a - b).map((d) => ({ d, w: BLOCK.w / d }));
    const gap = 40;
    const total = pieces.reduce((s, p) => s + p.w, 0) + gap * (pieces.length - 1);
    let x = CX - total / 2;
    return pieces.map((p) => {
      const r = { d: p.d, x, y: 336, w: p.w, h: 44 };
      x += p.w + gap;
      return r;
    });
  }

  placedRects() {
    let x = BLOCK.x;
    return this.placed.map((d) => {
      const r = { d, x, y: BLOCK.y, w: BLOCK.w / d, h: BLOCK.h };
      x += r.w;
      return r;
    });
  }

  draw(ctx) {
    workbench(ctx, 170, 290);
    const { x, y, w, h } = BLOCK;
    const gapW = (this.need / DEN_LCM) * w;
    // The block: an empty gap on the left, solid stone on the right.
    drawGhost(ctx, x, y, gapW, h, UI.accent);
    fillArea(ctx, 'stone', x + gapW, y, w - gapW, h, h);
    drawFraction(ctx, this.n, this.d, x + gapW / 2, y - 64, { scale: 3, colour: UI.accent });
    if (this.guides) {
      const fine = Math.max(...this.tray);
      ctx.fillStyle = 'rgb(255 255 255 / 0.7)';
      for (let k = 1; k < fine; k++) ctx.fillRect(Math.round(x + (k / fine) * w - 1), y + h + 4, 2, 10);
    }

    const over = this.total() > this.need;
    for (const r of this.placedRects()) {
      fillArea(ctx, 'planks', r.x, r.y, r.w, r.h, BLOCK.h);
      if (over) {
        ctx.fillStyle = UI.bad;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.globalAlpha = 1;
      }
    }

    if (this.state !== 'done') {
      for (const r of this.trayRects()) {
        fillArea(ctx, 'planks', r.x, r.y, r.w, r.h, r.h);
        drawFraction(ctx, 1, r.d, r.x + r.w / 2, r.y + r.h + 8, { scale: 2 });
      }
      helpText(ctx, over ? 'Too much! Tap a piece in the block to take it out.' : 'Drag pieces up into the gap.', 444);
    }
    if (this.drag) fillArea(ctx, 'planks', this.drag.x - this.drag.w / 2, this.drag.y - 22, this.drag.w, 44, 44);
  }

  down(p) {
    if (this.state !== 'ready') return;
    const tray = this.trayRects().find((r) => hit({ x: r.x - 8, y: r.y - 12, w: r.w + 16, h: r.h + 50 }, p));
    if (tray) {
      this.drag = { d: tray.d, x: p.x, y: p.y, w: tray.w };
      sfx.tap();
      return;
    }
    const rects = this.placedRects();
    const i = rects.findIndex((r) => hit(r, p));
    if (i >= 0) {
      this.placed.splice(i, 1);
      sfx.tap();
      if (this.total() <= this.need) this.overflowCounted = false;
    }
  }

  move(p) {
    if (this.drag) Object.assign(this.drag, { x: p.x, y: p.y });
  }

  up(p) {
    const dr = this.drag;
    this.drag = null;
    if (!dr) return;
    const overBlock = p.y > BLOCK.y - 80 && p.y < BLOCK.y + BLOCK.h + 40 && p.x > BLOCK.x - 60 && p.x < BLOCK.x + BLOCK.w + 60;
    if (!overBlock) return;
    // Already too full: refuse more pieces until one is taken out.
    if (this.total() > this.need) {
      sfx.oops();
      this.m.say('It\'s already too full! Tap a piece in the block to take it out.', 2.5);
      return;
    }
    this.placed.push(dr.d);
    sfx.thunk();
    const total = this.total();
    if (total === this.need) return this.succeed();
    if (total > this.need && !this.overflowCounted) {
      this.overflowCounted = true;
      this.attempts += 1;
      this.m.reportMiss();
      sfx.oops();
      if (this.attempts >= 2) this.guides = true;
    }
  }

  succeed() {
    const { m } = this;
    this.state = 'done';
    sfx.ding();
    const gapW = (this.need / DEN_LCM) * BLOCK.w;
    m.fx.burst(BLOCK.x + gapW / 2, BLOCK.y + BLOCK.h / 2, [UI.accent, '#ffffff', WOOD[4]], { n: 22 });
    const names = [...new Set(this.placed)].length > 1 ? 'Different pieces, same amount!' : 'Exactly full!';
    m.say(`${names} That's ${this.n}/${this.d}.`, 2.4);
    m.fx.after(1.2, () =>
      m.stepDone({ skill: 'fill', correct: true, firstTry: this.attempts === 0, precise: false, fixed: this.attempts > 0, at: { x: CX, y: BLOCK.y } }),
    );
  }
}

// ===================================================================
// COMPARE: which fraction is bigger? A pure number question; the
// bar-and-ruler picture appears only afterwards, as the explanation.
// ===================================================================
const CARD = { y: 196, w: 190, h: 136 };
const CARD_X = [CX - 225, CX + 35];
const BARS = { x: CX - 200, w: 440, y: [346, 412], h: 32 };

export class CompareStep {
  constructor(m, spec) {
    Object.assign(this, spec);
    this.m = m;
    this.skill = 'compare';
    this.state = 'ready';
    this.fill = { v: 0 };
    this.choice = null;
    this.nextBtn = { x: CX - 80, y: 474, w: 160, h: 62, label: 'Next' };
  }

  get parts() {
    return ['Which fraction is bigger?'];
  }

  get fracs() {
    return [this.a, this.b];
  }

  get bigger() {
    const [[n1, d1], [n2, d2]] = this.fracs;
    return n1 / d1 > n2 / d2 ? 0 : 1;
  }

  draw(ctx) {
    workbench(ctx, 172, 332);
    // The two fraction cards.
    CARD_X.forEach((x, i) => {
      const [n, d] = this.fracs[i];
      const chosen = this.choice === i;
      const lift = chosen ? -6 : 0;
      ctx.fillStyle = INK;
      ctx.fillRect(x - 3, CARD.y - 3 + lift, CARD.w + 6, CARD.h + 6);
      ctx.fillStyle = '#f6f1e7';
      ctx.fillRect(x, CARD.y + lift, CARD.w, CARD.h);
      ctx.fillStyle = 'rgb(0 0 0 / 0.1)';
      ctx.fillRect(x, CARD.y + lift + CARD.h - 6, CARD.w, 6);
      drawFraction(ctx, n, d, x + CARD.w / 2, CARD.y + lift + 20, { scale: 5, colour: '#b4541e', shadow: null });
      if (chosen) {
        ctx.strokeStyle = this.correct ? UI.good : UI.bad;
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 8, CARD.y - 8 + lift, CARD.w + 16, CARD.h + 16);
      }
    });

    if (this.choice === null) {
      helpText(ctx, 'Tap the bigger one.', 380);
      return;
    }

    // Explanation: each fraction as part of the same whole bar, over one 0–1 ruler.
    const { x, w, h } = BARS;
    this.fracs.forEach(([n, d], i) => {
      const y = BARS.y[i];
      drawGhost(ctx, x, y, w, h);
      const filled = (n / d) * w * this.fill.v;
      if (filled > 0) fillArea(ctx, i === this.bigger ? 'gold_ore' : 'planks', x, y, filled, h, h);
      ctx.fillStyle = INK;
      for (let k = 1; k < d; k++) ctx.fillRect(Math.round(x + (k / d) * w - 1), y, 2, h);
      drawFraction(ctx, n, d, x - 40, y - 4, { scale: 2 });
    });
    const ry = BARS.y[1] + h + 10;
    ctx.fillStyle = UI.ruler;
    ctx.fillRect(x, ry, w, 6);
    drawText(ctx, '0', x, ry + 12, { scale: 2, align: 'center' });
    drawText(ctx, '1', x + w, ry + 12, { scale: 2, align: 'center' });
    if (this.state === 'reveal') button(ctx, this.nextBtn);
  }

  down(p) {
    if (this.state === 'reveal') {
      if (hit(this.nextBtn, p)) this.finish();
      return;
    }
    if (this.state !== 'ready') return;
    const i = CARD_X.findIndex((x) => hit({ x: x - 12, y: CARD.y - 12, w: CARD.w + 24, h: CARD.h + 24 }, p));
    if (i >= 0) this.choose(i);
  }

  choose(i) {
    this.choice = i;
    this.correct = i === this.bigger;
    this.state = 'showing';
    sfx.tap();
    this.m.fx.tween(this.fill, { v: 1 }, 0.9, { delay: 0.2, easing: ease.outQuad, done: () => this.reveal() });
  }

  reveal() {
    const { m } = this;
    this.state = 'reveal';
    const big = this.bigger;
    const [bn, bd] = this.fracs[big];
    const [sn, sd] = this.fracs[1 - big];
    const why =
      this.kind === 'sameNum'
        ? `${PIECE_NAMES[bd][0].toUpperCase()}${PIECE_NAMES[bd].slice(1)} are bigger pieces than ${PIECE_NAMES[sd]}!`
        : `Same size pieces, and ${bn} pieces is more than ${sn}.`;
    if (this.correct) {
      sfx.ding();
      m.fx.burst(CARD_X[big] + CARD.w / 2, CARD.y + CARD.h / 2, [UI.good, '#ffffff', UI.accent], { n: 20 });
      m.say(`Yes! ${bn}/${bd} is bigger. ${why}`, 99);
    } else {
      sfx.oops();
      m.reportMiss();
      m.say(`${bn}/${bd} is bigger. ${why}`, 99);
    }
  }

  finish() {
    this.state = 'done';
    this.m.say(null);
    const big = this.bigger;
    this.m.stepDone({
      skill: 'compare', correct: this.correct, firstTry: this.correct, precise: false, fixed: false,
      at: { x: CARD_X[big] + CARD.w / 2, y: CARD.y },
    });
  }
}

export const STEPS = { place: PlaceStep, cut: CutStep, fill: FillStep, compare: CompareStep };
