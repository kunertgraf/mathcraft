// Build: fortify the base with earned blocks before night falls.
import { UI } from '../../../shared/art/palette.js';
import { drawPiece, drawText } from '../../../shared/art/render.js';
import { drawSky, drawTerrain, drawPip, GROUND } from './world.js';
import { drawBase, cellAt, canPlace, key, HOUSE, FIELD, cellX, cellY } from './base.js';
import { instruction, bubble, hudGems, button, hit, FONT, panel } from './ui.js';
import { inventory, BLOCK_HP } from './learn.js';
import { sfx } from './audio.js';
import { W } from './stage.js';
import { store } from '../../../shared/store.js';

const save = store.forApp('fractions');
const SLOT = 64;
const BAR_Y = 680;

const strengthWord = (hp) => (hp <= 2 ? 'weak' : hp <= 4 ? 'medium' : hp <= 7 ? 'strong' : 'super strong');

export class Build {
  constructor(game) {
    this.game = game;
    this.fx = game.fx;
    inventory.ensureStarter();
    this.layout = { ...inventory.base() };
    this.pip = { x: HOUSE.x + 48, y: HOUSE.roofTop, jump: 0, outfit: save.get('outfit', 'pip') };
    this.selected = this.slots()[0]?.name ?? null;
    this.timeLeft = save.get('buildMinutes', 10) * 60;
    this.ending = false;
    this.nightBtn = { x: W - 236, y: 74, w: 212, h: 58, label: 'Start night', colour: '#8f8cff' };
    this.speech = 'Build walls to keep the mobs out! Tap a block below, then tap where it goes.';
    this.speechUntil = 6;
  }

  get t() {
    return this.game.t;
  }

  say(text, dur = 3) {
    this.speech = text;
    this.speechUntil = this.t + dur;
  }

  // Hotbar: every block type he owns, plus the strongest first.
  slots() {
    const owned = inventory.blocks();
    return Object.entries(owned)
      .filter(([, n]) => n > 0)
      .map(([name, n]) => ({ name, n, hp: BLOCK_HP[name] ?? 3 }))
      .sort((a, b) => b.hp - a.hp)
      .slice(0, 9);
  }

  slotRects() {
    const slots = this.slots();
    const w = slots.length * (SLOT + 8);
    const x0 = W / 2 - w / 2;
    return slots.map((s, i) => ({ ...s, x: x0 + i * (SLOT + 8), y: BAR_Y, w: SLOT, h: SLOT }));
  }

  update(dt) {
    if (this.speech && this.t > this.speechUntil) this.speech = null;
    if (this.ending) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 120 && !this.warned) {
      this.warned = true;
      this.say('2 minutes until sunset!', 3);
    }
    if (this.timeLeft <= 0) this.startNight();
  }

  startNight() {
    if (this.ending) return;
    this.ending = true;
    inventory.setBase(this.layout);
    sfx.unlock();
    this.say('The sun is setting… here they come!', 3);
    this.fx.after(1.6, () => this.game.go('night'));
  }

  draw(ctx) {
    const view = this.game.stage.view;
    drawSky(ctx, view, this.t);
    drawTerrain(ctx, view, { ravine: false });
    drawBase(ctx, this.layout, { grid: !this.ending, t: this.t });
    // Field edge marker (where mobs come from).
    ctx.fillStyle = 'rgb(40 20 20 / 0.25)';
    ctx.fillRect(FIELD.x0 - 48, GROUND - 6, 48, 6);
    drawPip(ctx, this.pip);
    if (this.ghost) {
      ctx.globalAlpha = 0.5;
      drawPiece(ctx, this.selected, cellX(this.ghost.c), cellY(this.ghost.r), 48);
      ctx.globalAlpha = 1;
    }

    instruction(ctx, ['Build your base! Mobs come tonight.']);
    this.drawHotbar(ctx);
    hudGems(ctx, inventory.gems(), W - 150, 18);
    const m = Math.max(0, Math.floor(this.timeLeft / 60)), sec = Math.max(0, Math.floor(this.timeLeft % 60));
    drawText(ctx, `${m}:${String(sec).padStart(2, '0')}`, 96, 24, { scale: 4, colour: this.timeLeft < 120 ? UI.accent : '#ffffff' });
    if (!this.ending) button(ctx, this.nightBtn);
    if (this.speech) bubble(ctx, this.speech, this.pip.x + 24, this.pip.y - 104, { maxW: 240 });
    this.fx.draw(ctx);
  }

  drawHotbar(ctx) {
    const rects = this.slotRects();
    if (!rects.length) {
      panel(ctx, W / 2 - 220, BAR_Y, 440, SLOT, { fill: '#1d1e3a', alpha: 0.9 });
      ctx.font = FONT(20, 600);
      ctx.fillStyle = '#c9cbf2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No blocks left! Win more on missions.', W / 2, BAR_Y + SLOT / 2);
      ctx.textAlign = 'left';
      return;
    }
    const x0 = rects[0].x - 10, w = rects.length * (SLOT + 8) + 12;
    panel(ctx, x0, BAR_Y - 10, w, SLOT + 20, { fill: '#1d1e3a', alpha: 0.9 });
    for (const r of rects) {
      ctx.fillStyle = '#3b3e7a';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      drawPiece(ctx, r.name, r.x + 8, r.y + 4, 48);
      drawText(ctx, String(r.n), r.x + r.w - 4, r.y + r.h - 18, { scale: 2, align: 'right' });
      // strength pips
      for (let k = 0; k < Math.min(10, r.hp); k++) {
        ctx.fillStyle = UI.good;
        ctx.fillRect(r.x + 4 + k * 4, r.y + r.h - 6, 3, 3);
      }
      if (r.name === this.selected) {
        ctx.strokeStyle = UI.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
      }
    }
  }

  down(p) {
    if (this.ending) return;
    if (hit(this.nightBtn, p)) {
      sfx.tap();
      return this.startNight();
    }
    const slot = this.slotRects().find((r) => hit(r, p));
    if (slot) {
      this.selected = slot.name;
      sfx.tap();
      const label = slot.name.replace('_', ' ');
      this.say(`${label[0].toUpperCase()}${label.slice(1)}: ${strengthWord(slot.hp)} (takes ${slot.hp} hits).`, 2.5);
      return;
    }
    const cell = cellAt(p);
    if (!cell) return;
    const k = key(cell.c, cell.r);
    if (this.layout[k]) return this.remove(cell, k);
    this.ghost = cell;
  }

  move(p) {
    if (this.ghost) this.ghost = cellAt(p) ?? this.ghost;
  }

  up() {
    const cell = this.ghost;
    this.ghost = null;
    if (cell) this.place(cell);
  }

  place({ c, r }) {
    if (!this.selected || !this.slots().some((s) => s.name === this.selected)) {
      sfx.oops();
      return this.say('Pick a block from the bar first!', 2);
    }
    if (!canPlace(this.layout, c, r)) {
      sfx.oops();
      return this.say('Blocks go on the ground or next to another block.', 2.5);
    }
    inventory.takeBlock(this.selected);
    this.layout[key(c, r)] = this.selected;
    inventory.setBase(this.layout);
    sfx.thunk();
    this.fx.burst(cellX(c) + 24, cellY(r) + 40, ['#ffffff', '#c9cbf2'], { n: 8, speed: 120, size: 4 });
    if (!this.slots().some((s) => s.name === this.selected)) this.selected = this.slots()[0]?.name ?? null;
  }

  remove({ c, r }, k) {
    // Only remove blocks nothing else depends on (keep it simple: top-most in the column).
    if (this.layout[key(c, r - 1)]) {
      sfx.oops();
      return this.say('Take off the block on top first.', 2);
    }
    const name = this.layout[k];
    delete this.layout[k];
    inventory.addBlocks(name, 1);
    inventory.setBase(this.layout);
    this.selected = name;
    sfx.tap();
    this.fx.burst(cellX(c) + 24, cellY(r) + 24, ['#ffffff'], { n: 6, speed: 100, size: 4 });
  }
}

