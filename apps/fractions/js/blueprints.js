// Blueprints: the structure a mission builds. Each one defines its number line
// (direction, length, where the ruler sits), what a Place step puts on it, how
// the structure grows as steps are answered, and its finale.
//
// line: { axis: 'x' | 'y', p0: pixel of 0, unit: pixels per 1 whole (negative = upward), max: wholes, cross: ruler position }
import { RAMPS, UI } from '../../../shared/art/palette.js';
import { drawBlock, drawPiece, fillArea, drawGhost } from '../../../shared/art/render.js';
import { drawSky, drawTerrain, drawBridge, B, GROUND, WATER, X0, SPAN, DECK_SEGMENTS } from './world.js';
import { sfx } from './audio.js';
import { ease } from './fx.js';

const WOOD = RAMPS.wood;

class Blueprint {
  constructor(fx) {
    this.fx = fx;
  }
  pos(f) {
    return this.line.p0 + f * this.line.unit;
  }
  fracAt(px) {
    return (px - this.line.p0) / this.line.unit;
  }
  // Pointer → position along the line, clamped to [0, max].
  clampPos(p) {
    const v = this.line.axis === 'x' ? p.x : p.y;
    const a = this.pos(0), b = this.pos(this.line.max);
    return Math.max(Math.min(a, b), Math.min(Math.max(a, b), v));
  }
  drawFront() {}
}

// ===================================================================
// Rope Bridge: horizontal 0 → 1 across a ravine. Supports go under the deck.
// ===================================================================
class Bridge extends Blueprint {
  id = 'bridge';
  title = 'Rope Bridge';
  doneTitle = 'BRIDGE COMPLETE!';
  order = ['cut', 'place', 'fill', 'compare', 'place', 'cut', 'fill', 'place'];
  line = { axis: 'x', p0: X0, unit: SPAN, max: 1, cross: GROUND - 92 };
  pipStart = { x: 96, y: GROUND };
  demo = { f: 0.5, text: 'Halfway across the bridge is 1/2. Watch me!', turn: 'Your turn! Drag along the bridge, then let go to build.' };

  constructor(fx) {
    super(fx);
    this.bridge = { deck: 0, drops: {}, supports: [], sag: null };
  }

  placeParts(n, d) {
    return ['Put a support at ', { f: [n, d] }, ' of the bridge.'];
  }

  inZone(p) {
    return p.y >= 170;
  }

  drawWorld(ctx, view, t) {
    drawSky(ctx, view, t);
    drawTerrain(ctx, view);
    drawBridge(ctx, this.bridge);
  }

  drawItem(ctx, px, { ghost = false, colour = '#ffffff' } = {}) {
    const w = 24, top = GROUND + 24, h = WATER + 12 - top;
    if (ghost) drawGhost(ctx, px - w / 2, top, w, h, colour);
    else fillArea(ctx, 'log', Math.round(px - w / 2), top, w, h, B);
  }

  // Where the guide line runs (from the ruler to the item).
  guideEnd() {
    return GROUND + 20;
  }

  labelAt(f) {
    return { x: this.pos(f), y: GROUND + 40 };
  }

  addItem(f) {
    const s = { f, drop: -220 };
    this.bridge.supports.push(s);
    this.fx.tween(s, { drop: 0 }, 0.45, { easing: ease.outBounce });
    this.fx.after(0.3, () => {
      sfx.thunk();
      this.fx.burst(this.pos(f), GROUND + 30, WOOD, { n: 16 });
    });
  }

  // Wrong answer: build it where he put it and let the deck sag there.
  addTemp(f) {
    const temp = { f, drop: 0 };
    this.bridge.supports.push(temp);
    this.bridge.sag = { f, amt: 0 };
    this.fx.tween(this.bridge.sag, { amt: 16 }, 0.5, { easing: ease.outBounce });
    return temp;
  }

  removeTemp(temp) {
    this.bridge.supports = this.bridge.supports.filter((s) => s !== temp);
    this.fx.burst(this.pos(temp.f), GROUND + 80, WOOD, { n: 18 });
    this.fx.tween(this.bridge.sag, { amt: 0 }, 0.3, { done: () => (this.bridge.sag = null) });
  }

  grow(done, total) {
    const target = Math.round((DECK_SEGMENTS * done) / total);
    for (let i = this.bridge.deck; i < target; i++) {
      const k = i - this.bridge.deck;
      const drop = { v: -160 };
      this.bridge.drops[i] = drop;
      this.fx.tween(drop, { v: 0 }, 0.5, { delay: k * 0.12, easing: ease.outBounce });
      this.fx.after(0.3 + k * 0.12, () => sfx.thunk());
    }
    this.bridge.deck = Math.max(this.bridge.deck, target);
  }

  landing() {
    return { x: X0 + this.bridge.deck * B, y: GROUND, w: B, h: B / 2 };
  }

  finish(m, done) {
    m.say('We did it! Let me test it…', 3);
    this.fx.tween(m.pip, { x: 860 }, 3.2, { delay: 0.8, easing: ease.linear, done });
    m.walking = true;
  }
}

// ===================================================================
// Watchtower: vertical 0 (ground) → 1 (top). Windows go in the tower.
// It stands at the right edge, clear of Pip's speech bubble and the workbench.
// ===================================================================
const TOWER = { x: 896, w: 96, rows: 7 };
const TOWER_TOP = GROUND - TOWER.rows * B;

class Watchtower extends Blueprint {
  id = 'tower';
  title = 'Watchtower';
  doneTitle = 'TOWER COMPLETE!';
  order = ['place', 'cut', 'fill', 'place', 'compare', 'fill', 'place', 'cut'];
  line = { axis: 'y', p0: GROUND, unit: -TOWER.rows * B, max: 1, cross: TOWER.x - 34, labelSide: 'left' };
  pipStart = { x: 96, y: GROUND };
  demo = { f: 0.5, text: 'The bottom of the tower is 0 and the top is 1. Halfway up is 1/2. Watch me!', turn: 'Your turn! Drag up or down beside the tower, then let go.' };

  constructor(fx) {
    super(fx);
    this.rows = 0;
    this.drops = {};
    this.windows = [];
    this.shake = { v: 0 };
    this.platform = false;
  }

  placeParts(n, d) {
    return ['Put a window ', { f: [n, d] }, ' of the way up.'];
  }

  inZone(p) {
    return p.y >= 170 && p.x > 640;
  }

  drawWorld(ctx, view, t) {
    drawSky(ctx, view, t);
    drawTerrain(ctx, view, { ravine: false });
    const sx = Math.sin(t * 50) * this.shake.v;
    // The planned tower, as a dashed blueprint outline.
    ctx.save();
    ctx.strokeStyle = 'rgb(255 255 255 / 0.7)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(TOWER.x, TOWER_TOP, TOWER.w, GROUND - TOWER_TOP);
    ctx.restore();
    for (let r = 0; r < this.rows; r++) {
      const dy = this.drops[r]?.v ?? 0;
      const y = GROUND - (r + 1) * B + dy;
      drawBlock(ctx, 'cobble', TOWER.x + sx, y, B, r % 4);
      drawBlock(ctx, 'cobble', TOWER.x + B + sx, y, B, (r + 2) % 4);
    }
    for (const w of this.windows) this.drawItem(ctx, this.pos(w.f) + (w.drop ?? 0), { offset: sx });
    if (this.platform) {
      for (let c = -0.5; c < 2.5; c++) drawPiece(ctx, 'planks', TOWER.x + c * B, TOWER_TOP - B, B, { from: 0.5, to: 1, axis: 'y' });
      fillArea(ctx, 'log', TOWER.x - B / 2 + 4, TOWER_TOP - B - 12, 8, 36, B);
      // flag
      fillArea(ctx, 'log', TOWER.x + 2 * B + 12, TOWER_TOP - B - 90, 6, 80, B, { bevel: false });
      ctx.fillStyle = UI.accent;
      ctx.fillRect(TOWER.x + 2 * B - 22, TOWER_TOP - B - 88, 34, 22);
    }
  }

  drawItem(ctx, py, { ghost = false, colour = '#ffffff', offset = 0 } = {}) {
    const s = 34, x = TOWER.x + TOWER.w / 2 - s / 2 + offset, y = py - s / 2;
    if (ghost) return drawGhost(ctx, x, y, s, s, colour);
    drawPiece(ctx, 'glass', x, y, s);
    ctx.fillStyle = 'rgb(255 214 120 / 0.5)';
    ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
  }

  guideEnd() {
    return TOWER.x + TOWER.w / 2;
  }

  labelAt(f) {
    return { x: TOWER.x - 110, y: this.pos(f) - 28 };
  }

  addItem(f) {
    const w = { f, drop: -60 };
    this.windows.push(w);
    this.fx.tween(w, { drop: 0 }, 0.35, { easing: ease.outBounce });
    this.fx.after(0.2, () => {
      sfx.thunk();
      this.fx.burst(TOWER.x + TOWER.w / 2, this.pos(f), [RAMPS.glass[0], '#ffffff'], { n: 14 });
    });
  }

  // Wrong answer: the window goes where he put it and the tower wobbles.
  addTemp(f) {
    const temp = { f };
    this.windows.push(temp);
    this.fx.tween(this.shake, { v: 5 }, 0.15, { done: () => this.fx.tween(this.shake, { v: 0 }, 0.6) });
    return temp;
  }

  removeTemp(temp) {
    this.windows = this.windows.filter((w) => w !== temp);
    this.fx.burst(TOWER.x + TOWER.w / 2, this.pos(temp.f), [RAMPS.glass[0], '#ffffff'], { n: 18 });
  }

  grow(done, total) {
    const target = Math.round((TOWER.rows * done) / total);
    for (let r = this.rows; r < target; r++) {
      const k = r - this.rows;
      const drop = { v: -200 };
      this.drops[r] = drop;
      this.fx.tween(drop, { v: 0 }, 0.5, { delay: k * 0.15, easing: ease.outBounce });
      this.fx.after(0.3 + k * 0.15, () => sfx.thunk());
    }
    this.rows = Math.max(this.rows, target);
  }

  landing() {
    return { x: TOWER.x, y: GROUND - this.rows * B - B / 2, w: TOWER.w, h: B / 2 };
  }

  finish(m, done) {
    this.platform = true;
    sfx.thunk();
    m.say('Up we go! I can see for miles!', 3);
    // Pip hops up to the top in a big arc.
    const arc = { k: 0 };
    const from = { x: m.pip.x, y: m.pip.y }, to = { x: TOWER.x + 24, y: TOWER_TOP - B / 2 };
    this.fx.tween(arc, { k: 1 }, 1.4, {
      delay: 0.6,
      easing: ease.outQuad,
      done,
    });
    m.pipPath = () => ({
      x: from.x + (to.x - from.x) * arc.k,
      y: from.y + (to.y - from.y) * arc.k - Math.sin(arc.k * Math.PI) * 80,
    });
  }
}

// ===================================================================
// Minecart Track: horizontal 0 → 2 (fractions greater than 1). Lamps line the track.
// ===================================================================
const TRACK = { x0: 112, unit: 392 };
const TRACK_LEN = TRACK.unit * 2;

class MinecartTrack extends Blueprint {
  id = 'track';
  title = 'Minecart Track';
  doneTitle = 'TRACK COMPLETE!';
  order = ['place', 'fill', 'cut', 'place', 'compare', 'place', 'fill', 'place'];
  line = { axis: 'x', p0: TRACK.x0, unit: TRACK.unit, max: 2, cross: GROUND - 92 };
  pipStart = { x: 8, y: GROUND };
  demo = {
    f: 1,
    d: 4,
    text: 'This track is 2 blocks long! The middle is 1. Past 1, we keep counting: 5/4, 6/4, 7/4… Watch!',
    turn: 'Your turn! Drag along the track, then let go to place the lamp.',
  };

  constructor(fx) {
    super(fx);
    this.built = { v: 0 };
    this.lamps = [];
    this.cart = null;
  }

  placeParts(n, d) {
    return ['Put a lamp at ', { f: [n, d] }, ' on the track.'];
  }

  inZone(p) {
    return p.y >= 170;
  }

  drawWorld(ctx, view, t) {
    drawSky(ctx, view, t);
    drawTerrain(ctx, view, { ravine: false });
    // planned track (dashed) and buffer stops
    ctx.save();
    ctx.strokeStyle = 'rgb(255 255 255 / 0.6)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(TRACK.x0, GROUND - 14, TRACK_LEN, 12);
    ctx.restore();
    const len = TRACK_LEN * this.built.v;
    for (let x = TRACK.x0 + 6; x < TRACK.x0 + len; x += 24) fillArea(ctx, 'planks', x, GROUND - 8, 14, 8, 16, { bevel: false });
    if (len > 0) {
      ctx.fillStyle = RAMPS.stone[3];
      ctx.fillRect(TRACK.x0, GROUND - 14, len, 4);
      ctx.fillStyle = RAMPS.stone[1];
      ctx.fillRect(TRACK.x0, GROUND - 10, len, 2);
    }
    drawBlock(ctx, 'cobble', TRACK.x0 - B, GROUND - B, B);
    drawBlock(ctx, 'cobble', TRACK.x0 + TRACK_LEN, GROUND - B, B);
    for (const l of this.lamps) this.drawItem(ctx, this.pos(l.f), { tilt: l.tilt?.v ?? 0, drop: l.drop ?? 0 });
  }

  drawItem(ctx, px, { ghost = false, colour = '#ffffff', tilt = 0, drop = 0 } = {}) {
    const h = 64, w = 10;
    if (ghost) return drawGhost(ctx, px - 12, GROUND - h - 14, 24, h + 14, colour);
    ctx.save();
    ctx.translate(px, GROUND + drop);
    ctx.rotate(tilt);
    fillArea(ctx, 'log', -w / 2, -h, w, h, 32, { bevel: false });
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(-10, -h - 18, 20, 20);
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(-6, -h - 14, 12, 12);
    ctx.restore();
  }

  guideEnd() {
    return GROUND - 70;
  }

  labelAt(f) {
    return { x: this.pos(f), y: GROUND + 30 };
  }

  addItem(f) {
    const l = { f, drop: -200 };
    this.lamps.push(l);
    this.fx.tween(l, { drop: 0 }, 0.4, { easing: ease.outBounce });
    this.fx.after(0.25, () => {
      sfx.thunk();
      this.fx.burst(this.pos(f), GROUND - 70, ['#ffd36b', '#ffffff'], { n: 14 });
    });
  }

  // Wrong answer: the lamp goes where he put it, then topples over.
  addTemp(f) {
    const temp = { f, tilt: { v: 0 } };
    this.lamps.push(temp);
    this.fx.tween(temp.tilt, { v: (f > 1 ? -1 : 1) * 1.2 }, 0.6, { delay: 0.3, easing: ease.outBounce });
    return temp;
  }

  removeTemp(temp) {
    this.lamps = this.lamps.filter((l) => l !== temp);
    this.fx.burst(this.pos(temp.f), GROUND - 20, WOOD, { n: 16 });
  }

  grow(done, total) {
    this.fx.tween(this.built, { v: done / total }, 0.6, { easing: ease.outQuad });
    sfx.thunk();
  }

  landing() {
    return { x: TRACK.x0 + TRACK_LEN * this.built.v - 24, y: GROUND - 12, w: 48, h: 12 };
  }

  finish(m, done) {
    m.say('All aboard! Wheee!', 3);
    this.cart = { x: TRACK.x0 };
    m.pipPath = () => ({ x: this.cart.x - 24, y: GROUND - 22 });
    this.fx.tween(this.cart, { x: TRACK.x0 + TRACK_LEN }, 3, { delay: 0.6, easing: ease.inQuad, done });
  }

  // The cart is drawn in front of Pip so he sits inside it.
  drawFront(ctx) {
    if (!this.cart) return;
    const x = this.cart.x - 30, y = GROUND - 40;
    ctx.fillStyle = RAMPS.stone[0];
    ctx.fillRect(x, y, 60, 30);
    ctx.fillStyle = RAMPS.stone[2];
    ctx.fillRect(x + 4, y + 4, 52, 22);
    ctx.fillStyle = RAMPS.stone[3];
    ctx.fillRect(x + 4, y + 4, 52, 4);
    ctx.fillStyle = '#14152b';
    ctx.fillRect(x + 6, y + 28, 12, 12);
    ctx.fillRect(x + 42, y + 28, 12, 12);
  }
}

export const BLUEPRINTS = { bridge: Bridge, tower: Watchtower, track: MinecartTrack };
// Card order in camp. `needs` can gate a blueprint behind another (null = open from the start).
export const BLUEPRINT_ORDER = [
  { id: 'bridge', title: 'Rope Bridge', needs: null },
  { id: 'tower', title: 'Watchtower', needs: null },
  { id: 'track', title: 'Minecart Track', needs: null },
];
