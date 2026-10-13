// Camp: the home screen. Pick a blueprint; tap Pip to change outfit.
import { UI, INK, RAMPS } from '../../../shared/art/palette.js';
import { drawBlock, drawPiece, fillArea, drawText } from '../../../shared/art/render.js';
import { drawSky, drawTerrain, drawPip, drawMineEntrance, GROUND, B } from './world.js';
import { bubble, hudGems, hit, FONT, panel } from './ui.js';
import { inventory, UNLOCKS } from './learn.js';
import { BLUEPRINT_ORDER } from './blueprints.js';
import { sfx } from './audio.js';
import { ease } from './fx.js';
import { W } from './stage.js';
import { store } from '../../../shared/store.js';

const save = store.forApp('fractions');
const BOARD = { x: 100, y: 120, w: 600, h: 330 };

export class Camp {
  constructor(game) {
    this.game = game;
    this.fx = game.fx;
    this.pip = { x: 720, y: GROUND, jump: 0, outfit: save.get('outfit', 'pip'), flip: true };
    // Each blueprint unlocks once the one before it has been built.
    const titles = Object.fromEntries(BLUEPRINT_ORDER.map((b) => [b.id, b.title]));
    this.cards = BLUEPRINT_ORDER.map((b, i) => ({
      id: b.id,
      title: b.title,
      active: !b.needs || inventory.built(b.needs) > 0,
      lockedText: b.needs ? `Build a ${titles[b.needs]} first!` : '',
      built: inventory.built(b.id),
      x: BOARD.x + 30 + i * 186, y: BOARD.y + 80, w: 168, h: 220, press: 0,
    }));
    const firstVisit = !save.get('visited', false);
    save.set('visited', true);
    this.speech = firstVisit ? "Hi, I'm Pip! Let's build something. Pick a blueprint!" : 'Pick a blueprint!';
    this.fx.after(5, () => (this.speech = null));
  }

  get t() {
    return this.game.t;
  }

  outfits() {
    const have = inventory.unlocked();
    return ['pip', ...UNLOCKS.filter((u) => u.kind === 'outfit' && have.includes(u.id)).map((u) => u.id)];
  }

  draw(ctx) {
    const view = this.game.stage.view;
    drawSky(ctx, view, this.t);
    drawTerrain(ctx, view, { ravine: false });
    drawMineEntrance(ctx, 800, GROUND);
    drawPip(ctx, this.pip);

    // Blueprint board: a plank frame holding cards.
    fillArea(ctx, 'planks', BOARD.x - 16, BOARD.y - 16, BOARD.w + 32, BOARD.h + 32, B);
    ctx.fillStyle = '#2a3a6e';
    ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
    ctx.fillStyle = 'rgb(255 255 255 / 0.06)';
    for (let gx = BOARD.x; gx < BOARD.x + BOARD.w; gx += 24) ctx.fillRect(gx, BOARD.y, 1, BOARD.h);
    for (let gy = BOARD.y; gy < BOARD.y + BOARD.h; gy += 24) ctx.fillRect(BOARD.x, gy, BOARD.w, 1);
    drawText(ctx, 'BLUEPRINTS', BOARD.x + BOARD.w / 2, BOARD.y + 26, { scale: 4, align: 'center' });
    // posts holding the board
    fillArea(ctx, 'log', BOARD.x + 40, BOARD.y + BOARD.h + 16, 24, GROUND - BOARD.y - BOARD.h - 16, B);
    fillArea(ctx, 'log', BOARD.x + BOARD.w - 64, BOARD.y + BOARD.h + 16, 24, GROUND - BOARD.y - BOARD.h - 16, B);

    for (const c of this.cards) this.drawCard(ctx, c);

    hudGems(ctx, inventory.gems(), W - 150, 18);
    const nights = inventory.nights();
    if (nights) drawText(ctx, `NIGHTS DEFENDED: ${nights}`, W - 24, 66, { scale: 2, align: 'right' });
    this.drawUnlocks(ctx);
    if (this.speech) bubble(ctx, this.speech, this.pip.x + 24, this.pip.y - 104, { maxW: 260 });
    this.fx.draw(ctx);
  }

  drawCard(ctx, c) {
    const y = c.y + c.press;
    panel(ctx, c.x, y, c.w, c.h, { fill: c.active ? '#f6f1e7' : '#c9c6d6' });
    // Mini illustration.
    const ix = c.x + 14, iy = y + 16, iw = c.w - 28, ih = 110;
    ctx.fillStyle = RAMPS.sky[1];
    ctx.fillRect(ix, iy, iw, ih);
    if (c.id === 'bridge') {
      fillArea(ctx, 'grass', ix, iy + 70, 34, 40, 20, { outline: false, bevel: false });
      fillArea(ctx, 'grass', ix + iw - 34, iy + 70, 34, 40, 20, { outline: false, bevel: false });
      ctx.fillStyle = RAMPS.water[2];
      ctx.fillRect(ix + 34, iy + 96, iw - 68, 14);
      fillArea(ctx, 'planks', ix + 30, iy + 66, iw - 60, 8, 16, { bevel: false });
      fillArea(ctx, 'log', ix + 34 + (iw - 68) / 3 - 3, iy + 74, 6, 22, 16, { bevel: false });
      fillArea(ctx, 'log', ix + 34 + (2 * (iw - 68)) / 3 - 3, iy + 74, 6, 22, 16, { bevel: false });
    } else if (c.id === 'tower') {
      fillArea(ctx, 'grass', ix, iy + 90, iw, 20, 20, { outline: false, bevel: false });
      fillArea(ctx, 'cobble', ix + iw / 2 - 20, iy + 30, 40, 60, 20, { bevel: false });
      fillArea(ctx, 'planks', ix + iw / 2 - 30, iy + 22, 60, 10, 20, { bevel: false });
    } else {
      fillArea(ctx, 'grass', ix, iy + 90, iw, 20, 20, { outline: false, bevel: false });
      ctx.fillStyle = RAMPS.stone[1];
      ctx.fillRect(ix + 8, iy + 84, iw - 16, 4);
      for (let k = 0; k < 6; k++) ctx.fillRect(ix + 12 + k * 20, iy + 82, 6, 8);
      fillArea(ctx, 'planks', ix + iw / 2 - 22, iy + 60, 44, 22, 22, { bevel: false });
    }
    if (!c.active) {
      ctx.fillStyle = 'rgb(40 40 60 / 0.45)';
      ctx.fillRect(ix, iy, iw, ih);
    }
    ctx.fillStyle = INK;
    ctx.font = FONT(22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.title, c.x + c.w / 2, y + 150);
    ctx.font = FONT(18, 600);
    ctx.fillStyle = c.active ? '#5a5670' : '#6e6b80';
    ctx.fillText(c.active ? (c.built ? `Built: ${c.built}` : 'Tap to build!') : '🔒 Locked', c.x + c.w / 2, y + 186);
    ctx.textAlign = 'left';
  }

  // Unlocked blocks and outfits, shown as a little collection shelf.
  drawUnlocks(ctx) {
    const have = inventory.unlocked();
    const x0 = 120, y0 = GROUND + 2.2 * B, s = 40;
    panel(ctx, x0 - 12, y0 - 12, 560, s + 24, { fill: '#1d1e3a', alpha: 0.85 });
    ctx.font = FONT(18, 600);
    ctx.fillStyle = '#c9cbf2';
    ctx.textBaseline = 'middle';
    ctx.fillText(have.length ? 'Collected:' : 'Build things to collect new blocks!', x0, y0 + s / 2);
    let x = x0 + 110;
    for (const u of UNLOCKS.filter((u) => have.includes(u.id))) {
      ctx.fillStyle = '#3b3e7a';
      ctx.fillRect(x, y0, s, s);
      if (u.kind === 'block') drawPiece(ctx, u.id, x, y0, s);
      else {
        ctx.fillStyle = UI.accent;
        ctx.fillRect(x, y0, s, s);
        drawText(ctx, 'P', x + s / 2, y0 + 10, { scale: 3, align: 'center', colour: INK, shadow: null });
      }
      x += s + 10;
    }
  }

  down(p) {
    for (const c of this.cards) {
      if (hit(c, p)) {
        if (!c.active) {
          sfx.oops();
          this.speech = c.lockedText;
          this.fx.after(3, () => (this.speech = null));
          return;
        }
        sfx.tap();
        c.press = 4;
        this.fx.after(0.15, () => this.game.go('mission', { blueprint: c.id }));
        return;
      }
    }
    // Tap Pip to try on unlocked outfits.
    if (hit({ x: this.pip.x - 10, y: this.pip.y - 110, w: 70, h: 110 }, p)) {
      const list = this.outfits();
      const next = list[(list.indexOf(this.pip.outfit) + 1) % list.length];
      this.pip.outfit = next;
      save.set('outfit', next);
      sfx.tap();
      this.fx.tween(this.pip, { jump: 20 }, 0.12, { done: () => this.fx.tween(this.pip, { jump: 0 }, 0.25, { easing: ease.outBounce }) });
      this.speech = list.length > 1 ? 'New look!' : 'Unlock outfits by building!';
      this.fx.after(2, () => (this.speech = null));
    }
  }
}
