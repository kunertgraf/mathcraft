// The outdoor world: sky, hills, terrain, ravine, bridge and Pip.
import { RAMPS } from '../../../shared/art/palette.js';
import { drawBlock, drawPiece, fillArea, drawSprite } from '../../../shared/art/render.js';

export const B = 48; // block size in logical px
export const P = 3; // texture pixel size
export const GROUND = 576; // top of the grass
export const X0 = 240; // ravine left edge = number line 0
export const X1 = 768; // ravine right edge = number line 1
export const SPAN = X1 - X0;
export const WATER = 720;
export const DECK_SEGMENTS = (X1 - X0) / B; // 11

const variantAt = (col, row) => (((col * 73856093) ^ (row * 19349663)) >>> 0) % 4;
const ORES = { '1,14': 'gold_ore', '3,15': 'diamond_ore', '17,14': 'emerald_ore', '19,15': 'redstone_ore', '-1,15': 'gold_ore', '21,14': 'gold_ore' };

export const xAt = (f) => X0 + f * SPAN;
export const fAt = (x) => (x - X0) / SPAN;

export function drawSky(ctx, view, t) {
  const sky = RAMPS.sky;
  const bandH = GROUND / sky.length;
  ctx.fillStyle = sky[0];
  ctx.fillRect(view.x, view.y, view.w, GROUND - view.y);
  sky.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(view.x, i * bandH, view.w, bandH + 1);
    if (i === 0) return;
    ctx.fillStyle = sky[i - 1];
    const x0 = Math.floor(view.x / (P * 2)) * P * 2;
    for (let x = x0; x < view.x + view.w; x += P * 2)
      for (let r = 0; r < 2; r++) ctx.fillRect(x + (r % 2) * P, i * bandH + r * P, P, P);
  });

  // Drifting clouds.
  const clouds = [[100, 70, 1.5, 6], [520, 40, 1, 9], [820, 120, 1.3, 7], [1200, 90, 1.1, 8]];
  const wrap = view.w + 400;
  for (const [bx, cy, s, speed] of clouds) {
    const cx = view.x - 200 + ((((bx + t * speed) % wrap) + wrap) % wrap);
    const rows = [[3, 6], [1, 10], [0, 13], [0, 13]];
    rows.forEach(([x0, len], r) => {
      ctx.fillStyle = r === rows.length - 1 ? sky[2] : '#ffffff';
      ctx.fillRect(Math.round(cx + x0 * P * s), Math.round(cy + r * P * s), len * P * s, P * s);
    });
  }

  const hills = ([dark, light], base, amp, freq, phase) => {
    const x0 = Math.floor(view.x / P) * P;
    for (let x = x0; x < view.x + view.w; x += P) {
      const h = Math.round((base + amp * Math.sin(x * freq + phase) + amp * 0.4 * Math.sin(x * freq * 2.7)) / P) * P;
      ctx.fillStyle = dark;
      ctx.fillRect(x, GROUND - h, P, h);
      ctx.fillStyle = light;
      ctx.fillRect(x, GROUND - h, P, P);
    }
  };
  hills(RAMPS.hillFar, 2.4 * B, 0.6 * B, 0.006, 1);
  hills(RAMPS.hillNear, 1.3 * B, 0.45 * B, 0.011, 3);
}

export function drawTerrain(ctx, view, { ravine = true } = {}) {
  const c0 = Math.floor(view.x / B), c1 = Math.ceil((view.x + view.w) / B);
  const r1 = Math.ceil((view.y + view.h) / B);
  const g0 = X0 / B, g1 = X1 / B;
  for (let col = c0; col < c1; col++) {
    for (let row = GROUND / B; row < r1; row++) {
      const x = col * B, y = row * B;
      if (ravine && col >= g0 && col < g1) {
        drawBlock(ctx, row < 14 ? 'dirt' : 'stone', x, y, B, variantAt(col, row));
        ctx.fillStyle = 'rgb(10 10 30 / 0.55)';
        ctx.fillRect(x, y, B, B);
        if (y >= WATER) drawBlock(ctx, 'water', x, y, B);
        continue;
      }
      const name = ORES[`${col},${row}`] ?? (row === 12 ? 'grass' : row === 13 ? 'dirt' : 'stone');
      drawBlock(ctx, name, x, y, B, variantAt(col, row));
    }
  }
  if (ravine) {
    ctx.fillStyle = 'rgb(0 0 0 / 0.3)';
    ctx.fillRect(X0, GROUND, P * 2, view.y + view.h - GROUND);
    ctx.fillRect(X1 - P * 2, GROUND, P * 2, view.y + view.h - GROUND);
  }
}

// bridge: { deck: built segment count, drops: {i: {v: yOffset}}, supports: [{f, drop}], sag: {f, amt} | null }
export function drawBridge(ctx, bridge) {
  const postW = 24;
  for (const s of bridge.supports) {
    fillArea(ctx, 'log', Math.round(xAt(s.f) - postW / 2), GROUND + 24 + (s.drop ?? 0), postW, WATER + 12 - GROUND - 24, B);
  }
  for (let i = 0; i < bridge.deck; i++) {
    const cx = (i + 0.5) / DECK_SEGMENTS;
    let dy = bridge.drops[i]?.v ?? 0;
    if (bridge.sag) dy += bridge.sag.amt * Math.max(0, 1 - Math.abs(cx - bridge.sag.f) * 3);
    drawPiece(ctx, 'planks', X0 + i * B, GROUND + dy, B, { from: 0, to: 0.5, axis: 'y' });
  }
}

export function drawPip(ctx, pip) {
  const y = pip.y - (pip.jump ?? 0);
  ctx.fillStyle = 'rgb(0 0 0 / 0.25)';
  ctx.fillRect(Math.round(pip.x + P * 3), pip.y - P, P * 10, P);
  drawSprite(ctx, pip.outfit ?? 'pip', Math.round(pip.x), Math.round(y - 32 * P), P, { flip: pip.flip });
}

// A mine entrance (for camp): cobble arch with a dark doorway.
export function drawMineEntrance(ctx, x, y) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) drawBlock(ctx, 'cobble', x + c * B, y - (r + 1) * B, B, (c + r) % 4);
  ctx.fillStyle = '#0b0b18';
  ctx.fillRect(x + B, y - 2.5 * B, 2 * B, 2.5 * B);
  drawBlock(ctx, 'planks', x + B * 0.75, y - 2.75 * B, B);
  drawBlock(ctx, 'planks', x + B * 2.25, y - 2.75 * B, B);
  fillArea(ctx, 'log', x + B - 6, y - 2.5 * B, 12, 2.5 * B, B);
  fillArea(ctx, 'log', x + 3 * B - 6, y - 2.5 * B, 12, 2.5 * B, B);
}
