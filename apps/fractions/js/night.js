// Night: mobs hide in the dark. Pip calls out where one is ("Zombie at 3/4!")
// and the player drops an anvil at that point on the field's number line.
// Misses reveal the mob, which marches on the walls; Pip's arrows help out.
// Nothing earned is ever lost: the base is repaired at sunrise.
import { UI, INK, RAMPS } from '../../../shared/art/palette.js';
import { drawSprite, drawText, drawFraction } from '../../../shared/art/render.js';
import { drawSky, drawTerrain, drawPip, GROUND } from './world.js';
import { drawBase, liveFrom, key, GRID, HOUSE, FIELD, FIELD_SPAN, fieldX, fieldF, cellX, cellY } from './base.js';
import { instruction, bubble, hudGems, button, hit, FONT, panel } from './ui.js';
import { inventory, record, denominators, mastery } from './learn.js';
import { sfx } from './audio.js';
import { ease } from './fx.js';
import { W } from './stage.js';
import { store } from '../../../shared/store.js';

const save = store.forApp('fractions');
const CALLS = 8;
const RULER_Y = 400;
// Pip's bow only reaches the near part of the field, so walls matter.
const BOW_RANGE_X = FIELD.x0 + 0.6 * FIELD_SPAN;
const ARROW_EVERY = 2.5;
const MOBS = {
  zombie: { name: 'Zombie', hp: 4, speed: 28, sprite: 'zombie', w: 48, h: 96, scale: 3 },
  fizzler: { name: 'Fizzler', hp: 3, speed: 34, sprite: 'fizzler', w: 48, h: 48, scale: 3 },
};

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Calls use the place skill one notch easier than missions (mastered material, mild pace).
function planCalls() {
  const dens = denominators('place');
  const easy = dens.length > 2 ? dens.slice(0, -1) : dens;
  const used = [];
  return Array.from({ length: CALLS }, (_, i) => {
    let n, d;
    for (let tries = 0; tries < 20; tries++) {
      d = rnd(easy);
      n = 1 + Math.floor(Math.random() * (d - 1));
      if (!used.some((u) => Math.abs(u - n / d) < 0.05)) break;
    }
    used.push(n / d);
    const kind = i >= 2 && Math.random() < 0.3 ? 'fizzler' : 'zombie';
    return { n, d, kind };
  });
}

export class Night {
  constructor(game) {
    this.game = game;
    this.fx = game.fx;
    this.live = liveFrom(inventory.base());
    this.calls = planCalls();
    this.callIdx = -1;
    this.mobs = [];
    this.arrows = [];
    this.anvil = null;
    this.flashes = [];
    this.houseHp = 10;
    this.dark = { v: 0 };
    this.stats = { stopped: 0, gems: 0 };
    const score = mastery('place').score;
    this.scaffold = score < 0.8 ? 'labels' : 'ticks';
    this.pip = { x: HOUSE.x + 48, y: HOUSE.roofTop, jump: 0, outfit: save.get('outfit', 'pip') };
    this.arrowTimer = 0;
    this.state = 'dusk';
    this.say('Night is falling. Listen for where the mobs are!', 3);
    this.fx.tween(this.dark, { v: 1 }, 1.5, { done: () => this.fx.after(1.2, () => this.nextCall()) });
  }

  get t() {
    return this.game.t;
  }

  get call() {
    return this.calls[this.callIdx];
  }

  say(text, dur = 3) {
    this.speech = text ? { text, until: this.t + dur } : null;
  }

  nextCall() {
    this.callIdx += 1;
    if (this.callIdx >= this.calls.length) {
      this.state = 'finishing';
      return;
    }
    const c = this.call;
    const spec = MOBS[c.kind];
    this.hidden = { kind: c.kind, f: c.n / c.d, x: fieldX(c.n / c.d), hp: spec.hp, state: 'hidden', bob: Math.random() * 6 };
    this.state = 'aim';
    sfx.oops();
  }

  // ---------- input: drag along the field, release to drop ----------
  down(p) {
    if (this.summary) {
      if (hit(this.campBtn, p)) {
        sfx.tap();
        this.game.go('camp');
      }
      return;
    }
    if (this.state !== 'aim' || p.y < 170 || p.y > GROUND + 40) return;
    this.ghost = { x: Math.max(FIELD.x0, Math.min(FIELD.x1, p.x)) };
    sfx.tap();
  }

  move(p) {
    if (this.ghost) this.ghost.x = Math.max(FIELD.x0, Math.min(FIELD.x1, p.x));
  }

  up() {
    if (!this.ghost) return;
    const x = this.ghost.x;
    this.ghost = null;
    this.drop(x);
  }

  drop(x) {
    this.state = 'dropping';
    this.anvil = { x, y: 170 };
    this.fx.tween(this.anvil, { y: GROUND - 24 }, 0.35, { easing: ease.inQuad, done: () => this.land(x) });
  }

  land(x) {
    const mob = this.hidden;
    const c = this.call;
    const f = fieldF(x);
    const tol = this.scaffold === 'labels' ? 1 / 20 : 1 / 24;
    const hitIt = Math.abs(f - mob.f) <= tol;
    record('place', hitIt);
    sfx.thunk();
    this.flashes.push({ x, r: 110, a: { v: 1 } });
    this.fx.tween(this.flashes[this.flashes.length - 1].a, { v: 0 }, 0.8);
    this.fx.burst(x, GROUND - 6, [RAMPS.dirt[3], RAMPS.stone[3]], { n: 16, speed: 200 });
    this.fx.after(0.6, () => (this.anvil = null));
    this.hidden = null;

    if (hitIt) {
      this.stats.stopped += 1;
      this.stats.gems += 1;
      inventory.addGem();
      this.poof(mob.x, MOBS[mob.kind]);
      sfx.ding();
      this.fx.after(0.3, () => sfx.gem());
      this.say(rnd(['Bonk! Got it!', 'Direct hit!', 'Nice aim!', 'Squashed!']), 1.6);
    } else {
      // Reveal the mob where it really was; it starts marching.
      this.mobs.push({ ...mob, state: 'walking', revealed: true, fuse: 0, bashT: 0 });
      sfx.oops();
      const k = Math.round(f * c.d);
      const where = k <= 0 ? 'near 0' : k >= c.d ? 'near 1' : `at about ${k}/${c.d}`;
      this.say(`You dropped it ${where}. The ${MOBS[mob.kind].name.toLowerCase()} was at ${c.n}/${c.d}!`, 3);
    }
    this.state = 'between';
    this.fx.after(hitIt ? 1.6 : 2.6, () => this.nextCall());
  }

  poof(x, spec) {
    this.fx.burst(x, GROUND - spec.h / 2, ['#ffffff', '#c9cbf2', RAMPS.grass[3]], { n: 26, speed: 260 });
  }

  // ---------- simulation ----------
  update(dt) {
    if (this.speech && this.t > this.speech.until) this.speech = null;
    if (this.summary) return;

    for (const m of this.mobs) this.updateMob(m, dt);
    this.mobs = this.mobs.filter((m) => m.state !== 'dead');

    // Pip shoots the closest revealed mob every couple of seconds.
    this.arrowTimer -= dt;
    const target = this.mobs.filter((m) => m.x >= BOW_RANGE_X).sort((a, b) => b.x - a.x)[0];
    if (target && this.arrowTimer <= 0) {
      this.arrowTimer = ARROW_EVERY;
      const arrow = { x: this.pip.x + 20, y: this.pip.y - 60, tx: target.x, ty: GROUND - 50, k: { v: 0 }, target };
      this.arrows.push(arrow);
      this.fx.tween(arrow.k, { v: 1 }, 0.45, {
        done: () => {
          this.arrows = this.arrows.filter((a) => a !== arrow);
          if (target.state === 'dead') return;
          target.hp -= 1;
          sfx.tap();
          if (target.hp <= 0) {
            target.state = 'dead';
            this.poof(target.x, MOBS[target.kind]);
          }
        },
      });
    }

    if (this.state === 'finishing' && !this.mobs.length && !this.arrows.length) this.dawn();
  }

  // First column (left to right) with a block in the bottom two rows, ahead of the mob.
  blockerAhead(m) {
    for (let c = GRID.c0; c <= GRID.c1; c++) {
      for (const r of [GRID.r1, GRID.r1 - 1]) {
        const b = this.live[key(c, r)];
        if (b && cellX(c) >= m.x - 8) return { c, r, b };
      }
    }
    return null;
  }

  updateMob(m, dt) {
    const spec = MOBS[m.kind];
    m.bob += dt * 8;
    const blocker = this.blockerAhead(m);
    const front = m.x + spec.w / 2;
    const stopAt = blocker ? cellX(blocker.c) : HOUSE.x;
    if (m.state === 'walking') {
      if (front < stopAt) m.x = Math.min(stopAt - spec.w / 2, m.x + spec.speed * dt);
      else m.state = m.kind === 'fizzler' ? 'fusing' : 'bashing';
      return;
    }
    if (m.state === 'bashing') {
      if (front < stopAt - 2) return void (m.state = 'walking');
      m.bashT += dt;
      if (m.bashT >= 1) {
        m.bashT = 0;
        if (blocker) this.damage(blocker.c, blocker.r, 1);
        else this.hitHouse(1);
      }
      return;
    }
    if (m.state === 'fusing') {
      m.fuse += dt;
      if (m.fuse >= 1.5) this.explode(m);
    }
  }

  damage(c, r, n) {
    const k = key(c, r);
    const b = this.live[k];
    if (!b) return;
    b.hp -= n;
    sfx.thunk();
    this.fx.burst(cellX(c) + 24, cellY(r) + 24, [RAMPS.stone[3], '#ffffff'], { n: 6, speed: 120, size: 4 });
    if (b.hp <= 0) {
      delete this.live[k];
      sfx.crumble();
      this.fx.burst(cellX(c) + 24, cellY(r) + 24, [RAMPS.stone[2], RAMPS.dirt[3], '#ffffff'], { n: 18, speed: 200 });
    }
  }

  hitHouse(n) {
    this.houseHp = Math.max(0, this.houseHp - n);
    sfx.thunk();
    this.fx.burst(HOUSE.x + 8, GROUND - 40, [RAMPS.wood[3], RAMPS.wood[2]], { n: 8, speed: 140, size: 4 });
  }

  explode(m) {
    m.state = 'dead';
    const cx = m.x, cy = GROUND - 24;
    sfx.crumble();
    sfx.thunk();
    this.fx.burst(cx, cy, ['#ffffff', UI.accent, '#7bc94a', '#e0782f'], { n: 40, speed: 320 });
    this.flashes.push({ x: cx, r: 150, a: { v: 1 } });
    this.fx.tween(this.flashes[this.flashes.length - 1].a, { v: 0 }, 0.6);
    for (const k of Object.keys(this.live)) {
      const [c, r] = k.split(',').map(Number);
      const d = Math.hypot(cellX(c) + 24 - cx, cellY(r) + 24 - cy) / 48;
      if (d <= 1.6) this.damage(c, r, 3);
    }
    if (Math.abs(HOUSE.x - cx) < 80) this.hitHouse(3);
  }

  dawn() {
    if (this.state === 'dawn') return;
    this.state = 'dawn';
    const held = this.houseHp > 0;
    const bonus = held ? 3 : 0;
    if (bonus) inventory.addGem(bonus);
    this.stats.gems += bonus;
    inventory.addNight();
    sfx.fanfare();
    this.fx.tween(this.dark, { v: 0 }, 2, {
      done: () => {
        // Repair everything: nothing earned is ever lost.
        this.live = liveFrom(inventory.base());
        this.houseHp = 10;
        this.summary = { held, bonus };
      },
    });
  }

  // ---------- drawing ----------
  draw(ctx) {
    const view = this.game.stage.view;
    drawSky(ctx, view, this.t * 0.3);
    drawTerrain(ctx, view, { ravine: false });
    drawBase(ctx, this.live);
    drawPip(ctx, this.pip);
    for (const m of this.mobs) this.drawMob(ctx, m);

    this.drawDarkness(ctx, view);
    this.drawStars(ctx, view);

    for (const a of this.arrows) {
      const x = a.x + (a.tx - a.x) * a.k.v, y = a.y + (a.ty - a.y) * a.k.v - Math.sin(a.k.v * Math.PI) * 60;
      ctx.fillStyle = '#f6f1e7';
      ctx.fillRect(Math.round(x - 10), Math.round(y - 1), 20, 3);
      ctx.fillStyle = INK;
      ctx.fillRect(Math.round(x - 12), Math.round(y - 2), 4, 5);
    }
    if (this.anvil) drawSprite(ctx, 'anvil', this.anvil.x - 18, this.anvil.y - 12, 3);
    this.fx.draw(ctx);

    if (this.state === 'aim' || this.state === 'dropping') this.drawRuler(ctx);
    if (this.ghost) {
      ctx.save();
      ctx.strokeStyle = UI.accent;
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.ghost.x, RULER_Y + 18);
      ctx.lineTo(this.ghost.x, GROUND);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 0.6;
      drawSprite(ctx, 'anvil', this.ghost.x - 18, RULER_Y + 28, 3);
      ctx.globalAlpha = 1;
    }

    if (this.state === 'aim' || this.state === 'dropping') {
      const c = this.call;
      instruction(ctx, [`${MOBS[c.kind].name} at `, { f: [c.n, c.d] }, '! Drop the anvil there.']);
    } else if (this.state === 'dusk') {
      instruction(ctx, ['Night is falling…']);
    }

    hudGems(ctx, inventory.gems(), W - 150, 18);
    this.drawHouseHp(ctx);
    if (this.callIdx >= 0 && !this.summary) drawText(ctx, `${Math.min(this.callIdx + 1, CALLS)}/${CALLS}`, 96, 24, { scale: 4 });
    if (this.speech) bubble(ctx, this.speech.text, this.pip.x + 24, this.pip.y - 104, { maxW: 240 });
    if (this.summary) this.drawSummary(ctx);
  }

  drawMob(ctx, m) {
    const spec = MOBS[m.kind];
    const bob = m.state === 'walking' ? Math.abs(Math.sin(m.bob)) * 4 : 0;
    const shake = m.state === 'bashing' ? Math.sin(m.bob * 3) * 3 : 0;
    const flash = m.state === 'fusing' && Math.floor(m.fuse * 8) % 2 === 0;
    const x = m.x - spec.w / 2 + shake, y = GROUND - spec.h - bob;
    drawSprite(ctx, spec.sprite, Math.round(x), Math.round(y), spec.scale);
    if (flash) {
      ctx.fillStyle = 'rgb(255 255 255 / 0.6)';
      ctx.fillRect(x + 6, y + 6, spec.w - 12, spec.h - 6);
    }
  }

  // Darkness is painted on an offscreen layer and light sources are cut out of it
  // (destination-out), so overlapping lights merge instead of cancelling.
  drawDarkness(ctx, view) {
    const a = this.dark.v;
    if (a <= 0) return;
    const lights = [
      { x: (GRID.c0 + GRID.c1 + 1) * 24, y: GROUND - 60, r: 210, s: 0.55 }, // lanterns around the base
      { x: HOUSE.x + 26, y: 9 * 48 + 26, r: 80, s: 1 },
      { x: this.pip.x + 24, y: this.pip.y - 50, r: 66, s: 1 },
      ...this.mobs.map((m) => ({ x: m.x, y: GROUND - MOBS[m.kind].h / 2, r: 62, s: 1 })),
      ...this.flashes.filter((f) => f.a.v > 0.05).map((f) => ({ x: f.x, y: GROUND - 40, r: f.r * f.a.v, s: 1 })),
    ];
    const main = ctx.canvas;
    this.shade ??= document.createElement('canvas');
    const sc = this.shade;
    if (sc.width !== main.width || sc.height !== main.height) Object.assign(sc, { width: main.width, height: main.height });
    const sx = sc.getContext('2d');
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, sc.width, sc.height);
    sx.setTransform(ctx.getTransform());
    sx.fillStyle = `rgb(8 10 34 / ${0.74 * a})`;
    sx.fillRect(view.x, view.y, view.w, view.h);
    sx.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      // soft edge: a half-strength outer ring, then the full-strength core
      for (const [rr, k] of [[1.3, 0.5], [1, 1]]) {
        sx.globalAlpha = l.s * k;
        sx.beginPath();
        sx.arc(l.x, l.y, l.r * rr, 0, Math.PI * 2);
        sx.fill();
      }
    }
    sx.globalAlpha = 1;
    sx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(sc, 0, 0);
    ctx.restore();
    this.flashes = this.flashes.filter((f) => f.a.v > 0.01);
  }

  drawStars(ctx, view) {
    const a = this.dark.v;
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f6f1e7';
    for (let i = 0; i < 40; i++) {
      const x = view.x + ((i * 7919) % 1000) / 1000 * view.w, y = 20 + ((i * 104729) % 1000) / 1000 * 220;
      ctx.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 4 : 2, i % 5 === 0 ? 4 : 2);
    }
    ctx.fillStyle = '#fff7d6';
    ctx.fillRect(700, 36, 36, 36);
    ctx.fillStyle = '#e8dfb8';
    ctx.fillRect(708, 44, 8, 8);
    ctx.fillRect(722, 56, 6, 6);
    ctx.globalAlpha = 1;
  }

  drawRuler(ctx) {
    const c = this.call;
    const h = 16;
    ctx.fillStyle = UI.ruler;
    ctx.fillRect(FIELD.x0, RULER_Y, FIELD_SPAN, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(FIELD.x0, RULER_Y, FIELD_SPAN, h);
    for (let k = 0; k <= c.d; k++) {
      const end = k === 0 || k === c.d;
      const x = fieldX(k / c.d);
      ctx.fillStyle = UI.rulerInk;
      ctx.fillRect(Math.round(x - 1.5), RULER_Y, 3, end ? h : h * 0.7);
      if (end) drawText(ctx, k === 0 ? '0' : '1', x, RULER_Y - 30, { align: 'center' });
      else if (this.scaffold === 'labels') drawFraction(ctx, k, c.d, x, RULER_Y - 48, { scale: 2 });
    }
  }

  drawHouseHp(ctx) {
    const x = W - 170, y = 70;
    drawText(ctx, 'HOUSE', x, y, { scale: 2 });
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i < this.houseHp ? UI.bad : 'rgb(255 255 255 / 0.2)';
      ctx.fillRect(x + 64 + i * 9, y, 7, 14);
    }
  }

  drawSummary(ctx) {
    const w = 540, h = 300, x = (W - w) / 2, y = 150;
    panel(ctx, x, y, w, h);
    const title = this.summary.held ? 'THE BASE HELD!' : 'SUNRISE!';
    drawText(ctx, title, W / 2, y + 28, { scale: 4, colour: '#b4541e', shadow: null, align: 'center' });
    ctx.font = FONT(24);
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = [
      `Anvil hits: ${this.stats.stopped} of ${CALLS}  (+${this.stats.stopped} gems)`,
      this.summary.held ? `House defended! +${this.summary.bonus} gems` : 'Pip hid in the basement! Build stronger walls tomorrow.',
      'Pip fixed the walls overnight.',
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 96 + i * 38, w - 40));
    ctx.textAlign = 'left';
    this.campBtn = { x: W / 2 - 130, y: y + h - 84, w: 260, h: 62, label: 'Back to camp' };
    button(ctx, this.campBtn);
  }
}

