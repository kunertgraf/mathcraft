// A Rope Bridge mission: 8 build steps; each correct answer grows the bridge.
import { UI, RAMPS } from '../../../shared/art/palette.js';
import { drawSprite, fillArea, drawText, drawPiece } from '../../../shared/art/render.js';
import { drawSky, drawTerrain, drawBridge, drawPip, GROUND, DECK_SEGMENTS } from './world.js';
import { instruction, bubble, hudGems, rewardBanner, button, panel, hit, FONT } from './ui.js';
import { STEPS } from './steps.js';
import { planMission, record, inventory } from './learn.js';
import { sfx } from './audio.js';
import { ease } from './fx.js';
import { W } from './stage.js';
import { store } from '../../../shared/store.js';

const RAPID_SEC = 3;

export class Mission {
  constructor(game) {
    this.game = game;
    this.fx = game.fx;
    this.steps = planMission();
    this.idx = 0;
    this.bridge = { deck: 0, drops: {}, supports: [], sag: null };
    this.pip = { x: 96, y: GROUND, jump: 0, outfit: store.forApp('fractions').get('outfit', 'pip') };
    this.earned = { gems: 0, stars: 0, unlocks: [], blocks: {} };
    this.correctCount = 0;
    this.speech = null;
    this.banners = []; // queued reward messages shown in the instruction slot
    this.flyingGems = [];
    this.flyingBlocks = [];
    this.rapid = 0;
    this.summary = null;
    this.startStep();
  }

  get t() {
    return this.game.t;
  }

  say(text, dur = 3) {
    this.speech = text ? { text, until: this.t + dur } : null;
  }

  // Queue a big message in the instruction slot. Returns its duration so callers can wait for it.
  showBanner(text, dur = 1.3) {
    this.banners.push({ text, dur, born: null });
    return dur;
  }

  startStep() {
    const spec = this.steps[this.idx];
    this.step = new STEPS[spec.type](this, spec);
    this.stepShownAt = this.t;
    this.lastActionAt = this.t;
    if (this.idx === this.steps.length - 2) this.showBanner('LAST 2 STEPS!', 1.4);
  }

  // Called by steps on every wrong answer. Two quick misses in a row → "measure twice".
  reportMiss() {
    const quick = this.t - this.lastActionAt < RAPID_SEC;
    this.lastActionAt = this.t;
    this.rapid = quick ? this.rapid + 1 : 0;
    if (this.rapid >= 2) {
      this.rapid = 0;
      this.step.hint?.();
      this.fx.after(2.4, () => this.say('Measure twice! Look at the marks carefully before you build.', 3.5));
    }
  }

  stepDone(r) {
    record(r.skill, r.firstTry);
    const at = r.at ?? { x: W / 2, y: GROUND };

    if (r.correct) {
      // Immediate, concrete reward: a gem flies to the counter, a material drops.
      inventory.addGem();
      const got = inventory.grantBlocks(3);
      this.earned.blocks[got.name] = (this.earned.blocks[got.name] ?? 0) + got.n;
      this.flyBlock(got.name, at);
      this.earned.gems += 1;
      this.correctCount += 1;
      const gem = { x: at.x, y: at.y - 40 };
      this.flyingGems.push(gem);
      this.fx.tween(gem, { x: W - 150, y: 18 }, 0.7, {
        easing: ease.inQuad,
        done: () => {
          this.flyingGems = this.flyingGems.filter((g) => g !== gem);
          sfx.gem();
          this.fx.burst(W - 134, 34, [RAMPS.diamond[1], RAMPS.diamond[2], '#ffffff'], { n: 10, speed: 140 });
        },
      });
      this.fx.tween(this.pip, { jump: 26 }, 0.15, {
        easing: ease.outQuad,
        done: () => this.fx.tween(this.pip, { jump: 0 }, 0.25, { easing: ease.outBounce }),
      });

    }
    let wait = 0.9;
    // Effort stars: precision, or fixing a mistake.
    if (r.precise || r.fixed) {
      inventory.addStar();
      this.earned.stars += 1;
      wait += this.showBanner(r.precise ? 'PERFECT AIM! +1 STAR' : 'GREAT FIX! +1 STAR');
    }
    if (r.correct && this.correctCount % 4 === 0) {
      const unlock = inventory.unlockNext();
      if (unlock) {
        this.earned.unlocks.push(unlock);
        wait += this.showBanner(`NEW: ${unlock.name.toUpperCase()}!`, 1.8);
      }
    }

    this.growDeck(this.idx + 1);
    this.idx += 1;
    this.step = null;
    if (this.idx < this.steps.length) this.fx.after(wait, () => this.startStep());
    else this.fx.after(1.0, () => this.finish());
  }

  // A small block icon pops up from the answer and drifts down to the hotbar area.
  flyBlock(name, at) {
    const b = { name, x: at.x - 16, y: at.y - 60, a: 1 };
    this.flyingBlocks.push(b);
    this.fx.tween(b, { y: at.y - 110 }, 0.4, {
      easing: ease.outQuad,
      done: () =>
        this.fx.tween(b, { x: 60, y: 700, a: 0.2 }, 0.6, {
          delay: 0.2,
          easing: ease.inQuad,
          done: () => (this.flyingBlocks = this.flyingBlocks.filter((x) => x !== b)),
        }),
    });
  }

  growDeck(stepsDone) {
    const target = Math.round((DECK_SEGMENTS * stepsDone) / this.steps.length);
    for (let i = this.bridge.deck; i < target; i++) {
      const k = i - this.bridge.deck;
      const drop = { v: -160 };
      this.bridge.drops[i] = drop;
      this.fx.tween(drop, { v: 0 }, 0.5, { delay: k * 0.12, easing: ease.outBounce });
      this.fx.after(0.3 + k * 0.12, () => sfx.thunk());
    }
    this.bridge.deck = Math.max(this.bridge.deck, target);
  }

  finish() {
    const { fx } = this;
    inventory.addBridge();
    sfx.fanfare();
    this.say('We did it! Let me test it…', 3);
    for (let k = 0; k < 6; k++)
      fx.after(k * 0.25, () =>
        fx.burst(200 + Math.random() * 620, 200 + Math.random() * 150, [UI.accent, UI.good, '#ffffff', RAMPS.diamond[1], UI.bad], { n: 26, speed: 300 }),
      );
    fx.tween(this.pip, { x: 860 }, 3.2, {
      delay: 0.8,
      easing: ease.linear,
      done: () => {
        this.summary = { born: this.t };
        this.say(null);
      },
    });
  }

  update() {
    if (this.speech && this.t > this.speech.until) this.speech = null;
    const b = this.banners[0];
    if (b) {
      if (b.born === null) {
        b.born = this.t;
        if (b.text.startsWith('NEW')) sfx.unlock();
      }
      if (this.t - b.born > b.dur) this.banners.shift();
    }
  }

  draw(ctx) {
    const view = this.game.stage.view;
    drawSky(ctx, view, this.t);
    drawTerrain(ctx, view);
    drawBridge(ctx, this.bridge);
    // walking bob while crossing
    const walking = this.idx >= this.steps.length && !this.summary;
    const bob = walking ? Math.abs(Math.sin(this.t * 10)) * 4 : 0;
    drawPip(ctx, { ...this.pip, jump: this.pip.jump + bob });

    const b = this.banners[0];
    if (this.step) {
      this.step.draw(ctx);
      if (!b) instruction(ctx, this.step.parts);
    }
    this.fx.draw(ctx);
    for (const g of this.flyingGems) drawSprite(ctx, 'gem', g.x, g.y, 4);
    for (const b of this.flyingBlocks) {
      ctx.globalAlpha = b.a;
      drawPiece(ctx, b.name, b.x, b.y, 32);
      drawText(ctx, '+3', b.x + 38, b.y + 8, { scale: 2 });
      ctx.globalAlpha = 1;
    }

    if (this.speech) bubble(ctx, this.speech.text, this.pip.x + 24, this.pip.y - 104, { maxW: 220 });

    this.drawHud(ctx);

    if (b?.born != null) rewardBanner(ctx, b.text, this.t - b.born);
    if (this.summary) this.drawSummary(ctx);
  }

  drawHud(ctx) {
    // Step progress: one small plank per step, left of centre (top-left is the hub's home button).
    const n = this.steps.length, s = 30, gap = 8;
    const x0 = W / 2 - (n * (s + gap)) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (s + gap);
      if (i < this.idx) fillArea(ctx, 'planks', x, 22, s, s, s);
      else {
        ctx.fillStyle = i === this.idx ? 'rgb(255 255 255 / 0.55)' : 'rgb(0 0 0 / 0.25)';
        ctx.fillRect(x, 22, s, s);
      }
    }
    hudGems(ctx, inventory.gems(), W - 150, 18);
  }

  drawSummary(ctx) {
    const w = 520, h = 330, x = (W - w) / 2, y = 150;
    panel(ctx, x, y, w, h);
    drawText(ctx, 'BRIDGE COMPLETE!', W / 2, y + 28, { scale: 4, colour: '#b4541e', shadow: null, align: 'center' });
    ctx.font = FONT(26);
    ctx.fillStyle = '#14152b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = [`Gems: ${this.earned.gems}   Effort stars: ${this.earned.stars}`];
    if (this.earned.unlocks.length) lines.push(`Unlocked: ${this.earned.unlocks.map((u) => u.name).join(', ')}`);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 84 + i * 36));
    ctx.textAlign = 'left';
    // Blocks earned, as icons with counts.
    const got = Object.entries(this.earned.blocks);
    const PER_ROW = 5, SP = 88;
    got.forEach(([name, n], i) => {
      const row = Math.floor(i / PER_ROW), inRow = Math.min(PER_ROW, got.length - row * PER_ROW);
      const bx = W / 2 - (inRow * SP) / 2 + (i % PER_ROW) * SP;
      const by = y + 132 + row * 48;
      drawPiece(ctx, name, bx + 8, by, 36);
      drawText(ctx, `+${n}`, bx + 50, by + 10, { scale: 2, colour: '#b4541e', shadow: null });
    });
    this.campBtn = { x: W / 2 - 150, y: y + h - 86, w: 300, h: 64, label: 'Build your base!' };
    button(ctx, this.campBtn);
  }

  down(p) {
    if (this.summary) {
      if (hit(this.campBtn, p)) {
        sfx.tap();
        this.game.go('build');
      }
      return;
    }
    this.step?.down?.(p);
  }

  move(p) {
    this.step?.move?.(p);
  }

  up(p) {
    this.step?.up?.(p);
  }
}
