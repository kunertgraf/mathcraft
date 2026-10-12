import { RAMPS, UI, INK, PAPER } from '../../shared/art/palette.js';
import { BLOCKS } from '../../shared/art/textures.js';
import {
  setupCanvas, drawBlock, drawPiece, fillArea, drawGhost, drawSprite, drawText, drawFraction,
} from '../../shared/art/render.js';

const $ = (id) => document.getElementById(id);
const sizeCss = (canvas, w) => (canvas.style.width = `${w}px`);
// Pick a stable texture variant per grid cell so terrain doesn't look stamped.
const variantAt = (col, row) => (((col * 73856093) ^ (row * 19349663)) >>> 0) % 4;

// ---------- Scene ----------
function scene() {
  const B = 48, P = B / 16; // block size, texture pixel size
  const W = 20 * B, H = 12 * B, GROUND = 7 * B;
  const canvas = $('scene');
  const ctx = setupCanvas(canvas, W, H);
  sizeCss(canvas, W);

  // Sky: flat bands with a dithered seam, like a retro gradient.
  const sky = RAMPS.sky;
  const bandH = GROUND / sky.length;
  sky.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * bandH, W, bandH + 1);
    if (i === 0) return;
    ctx.fillStyle = sky[i - 1];
    for (let x = 0; x < W; x += P * 2)
      for (let r = 0; r < 2; r++) ctx.fillRect(x + ((r % 2) * P), i * bandH + r * P, P, P);
  });

  // Clouds built from pixel rows.
  const cloud = (cx, cy, s) => {
    const rows = [[3, 6], [1, 10], [0, 13], [0, 13]];
    rows.forEach(([x0, len], r) => {
      ctx.fillStyle = r === rows.length - 1 ? sky[2] : '#ffffff';
      ctx.fillRect(cx + x0 * P * s, cy + r * P * s, len * P * s, P * s);
    });
  };
  cloud(2 * B, 1 * B, 1.5);
  cloud(11 * B, 0.6 * B, 1);
  cloud(15.5 * B, 1.8 * B, 1.3);

  // Hills, far then near, stepped to the pixel grid.
  const hills = ([dark, light], base, amp, freq, phase) => {
    for (let x = 0; x < W; x += P) {
      const h = Math.round((base + amp * Math.sin(x * freq + phase) + amp * 0.4 * Math.sin(x * freq * 2.7)) / P) * P;
      ctx.fillStyle = dark;
      ctx.fillRect(x, GROUND - h, P, h);
      ctx.fillStyle = light;
      ctx.fillRect(x, GROUND - h, P, P);
    }
  };
  hills(RAMPS.hillFar, 2.2 * B, 0.6 * B, 0.006, 1);
  hills(RAMPS.hillNear, 1.2 * B, 0.45 * B, 0.011, 3);

  // Terrain: cliffs on both sides of a ravine (cols 6–13).
  const GAP0 = 6, GAP1 = 14;
  const ores = { '2,10': 'diamond_ore', '17,9': 'gold_ore', '4,11': 'emerald_ore', '18,11': 'redstone_ore', '0,9': 'gold_ore' };
  for (let col = 0; col < 20; col++) {
    for (let row = 7; row < 12; row++) {
      const x = col * B, y = row * B;
      if (col >= GAP0 && col < GAP1) {
        // Ravine: darkened back wall, water at the bottom.
        drawBlock(ctx, row < 9 ? 'dirt' : 'stone', x, y, B, variantAt(col, row));
        ctx.fillStyle = 'rgb(10 10 30 / 0.55)';
        ctx.fillRect(x, y, B, B);
        if (row >= 10) drawBlock(ctx, 'water', x, y, B);
        continue;
      }
      const name = ores[`${col},${row}`] ?? (row === 7 ? 'grass' : row === 8 ? 'dirt' : 'stone');
      drawBlock(ctx, name, x, y, B, variantAt(col, row));
    }
  }
  // Shade the ravine edges so the gap reads as deep.
  ctx.fillStyle = 'rgb(0 0 0 / 0.3)';
  ctx.fillRect(GAP0 * B, GROUND, P * 2, 5 * B);
  ctx.fillRect(GAP1 * B - P * 2, GROUND, P * 2, 5 * B);

  // Tree on the right cliff.
  drawBlock(ctx, 'log', 17 * B, 6 * B, B);
  drawBlock(ctx, 'log', 17 * B, 5 * B, B);
  const canopy = [[16, 4], [17, 4], [18, 4], [16, 3], [17, 3], [18, 3], [17, 2]];
  for (const [c, r] of canopy) drawBlock(ctx, 'leaves', c * B, r * B, B);
  // Light the canopy from the top-left, shade its underside.
  ctx.fillStyle = 'rgb(255 255 220 / 0.18)';
  for (const [c, r] of canopy) if (!canopy.some(([c2, r2]) => c2 === c && r2 === r - 1)) ctx.fillRect(c * B, r * B, B, P * 2);
  ctx.fillStyle = 'rgb(0 20 0 / 0.3)';
  for (const [c, r] of canopy) if (!canopy.some(([c2, r2]) => c2 === c && r2 === r + 1)) ctx.fillRect(c * B, r * B + B - P * 3, B, P * 3);

  // Bridge deck: half-height plank slabs spanning the gap (the number line 0 → 1).
  const X0 = GAP0 * B, L = (GAP1 - GAP0) * B;
  for (let col = GAP0; col < GAP1; col++) drawPiece(ctx, 'planks', col * B, GROUND, B, { from: 0, to: 0.5, axis: 'y' });

  // Supports: one placed at 1/3, a ghost slot at 2/3.
  const postW = B / 2;
  const postTop = GROUND + B / 2, postH = 10 * B - postTop;
  const at = (f) => X0 + L * f - postW / 2;
  fillArea(ctx, 'log', at(1 / 3), postTop, postW, postH, B);
  drawGhost(ctx, at(2 / 3), postTop, postW, postH, UI.accent);

  // Ruler above the bridge: exact ticks at thirds.
  const RY = 5 * B, RH = B * 0.32;
  ctx.fillStyle = UI.ruler;
  ctx.fillRect(X0, RY, L, RH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(X0, RY, L, RH);
  for (let k = 0; k <= 3; k++) {
    const x = X0 + (L * k) / 3;
    ctx.fillStyle = UI.rulerInk;
    ctx.fillRect(Math.round(x - 1.5), RY, 3, k % 3 === 0 ? RH : RH * 0.7);
    if (k === 0) drawText(ctx, '0', x, RY - 34, { align: 'center' });
    else if (k === 3) drawText(ctx, '1', x, RY - 34, { align: 'center' });
    else drawFraction(ctx, k, 3, x, RY - 19 * 3 - 10, { scale: 3 });
    // Guide line from the tick down to the deck.
    if (k === 1 || k === 2) {
      ctx.save();
      ctx.strokeStyle = 'rgb(255 255 255 / 0.6)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, RY + RH + 4);
      ctx.lineTo(x, GROUND - 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Pip on the left cliff, looking at the bridge.
  drawSprite(ctx, 'pip', 3.8 * B, GROUND - 16 * 4, 4);

  // Instruction panel (system font for reading; pixel font for numbers).
  const panel = { x: 3.2 * B, y: 0.35 * B, w: 9.6 * B, h: 1.25 * B };
  ctx.fillStyle = INK;
  ctx.fillRect(panel.x - 3, panel.y - 3, panel.w + 6, panel.h + 6);
  ctx.fillStyle = PAPER;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.fillStyle = 'rgb(0 0 0 / 0.12)';
  ctx.fillRect(panel.x, panel.y + panel.h - P, panel.w, P);
  ctx.fillStyle = INK;
  ctx.font = '700 26px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Put a support at 2/3 of the bridge.', panel.x + 22, panel.y + panel.h / 2);

  // Reward counter.
  drawSprite(ctx, 'gem', W - 3.3 * B, 0.45 * B, 4);
  drawText(ctx, '12', W - 2.4 * B, 0.62 * B, { scale: 4 });
}

// ---------- Blocks gallery ----------
function blocks() {
  const S = 64, GAP = 28, COLS = 8;
  const W = COLS * (S + GAP) + GAP, rows = Math.ceil(BLOCKS.length / COLS);
  const H = rows * (S + GAP + 18) + GAP;
  const canvas = $('blocks');
  const ctx = setupCanvas(canvas, W, H);
  sizeCss(canvas, W);
  ctx.fillStyle = '#25264a';
  ctx.fillRect(0, 0, W, H);
  ctx.font = '600 13px ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'center';
  BLOCKS.forEach((name, i) => {
    const x = GAP + (i % COLS) * (S + GAP), y = GAP + Math.floor(i / COLS) * (S + GAP + 18);
    drawPiece(ctx, name, x, y, S);
    ctx.fillStyle = '#c9cbf2';
    ctx.fillText(name.replace('_', ' '), x + S / 2, y + S + 16);
  });
}

// ---------- Tiling ----------
function tiling() {
  const S = 48, names = ['stone', 'cobble', 'planks', 'brick', 'dirt', 'sand'];
  const W = names.length * (S * 3 + 16) + 16, H = S * 3 + 32;
  const canvas = $('tiling');
  const ctx = setupCanvas(canvas, W, H);
  sizeCss(canvas, W);
  ctx.fillStyle = '#25264a';
  ctx.fillRect(0, 0, W, H);
  names.forEach((name, i) => {
    const x0 = 16 + i * (S * 3 + 16);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) drawBlock(ctx, name, x0 + c * S, 16 + r * S, S);
  });
}

// ---------- Fractions ----------
function fractions() {
  const items = [[1, 2, 'planks'], [2, 3, 'brick'], [3, 4, 'cobble'], [3, 5, 'sand'], [5, 6, 'planks'], [3, 8, 'stone'], [7, 10, 'brick'], [5, 12, 'planks']];
  const LEFT = 90, BAR = 600, BH = 44, ROW = 82;
  const W = LEFT + BAR + 40, H = items.length * ROW + 20;
  const canvas = $('fractions');
  const ctx = setupCanvas(canvas, W, H);
  sizeCss(canvas, W);
  ctx.fillStyle = '#25264a';
  ctx.fillRect(0, 0, W, H);
  items.forEach(([n, d, mat], i) => {
    const y = 20 + i * ROW;
    drawFraction(ctx, n, d, 45, y - 2, { scale: 2 });
    const pw = BAR / d;
    for (let k = 0; k < d; k++) {
      const x = LEFT + k * pw;
      if (k < n) fillArea(ctx, mat, x, y, pw, BH, BH);
      else drawGhost(ctx, x, y, pw, BH);
    }
    // number line under each bar
    ctx.fillStyle = '#c9cbf2';
    ctx.fillRect(LEFT, y + BH + 10, BAR, 2);
    for (let k = 0; k <= d; k++) {
      ctx.fillRect(Math.round(LEFT + k * pw - 1), y + BH + 5, 2, k === n ? 14 : 8);
    }
    ctx.fillStyle = UI.accent;
    ctx.fillRect(Math.round(LEFT + n * pw - 2), y + BH + 2, 4, 18);
  });
}

// ---------- Decimals ----------
function decimals() {
  const S = 128, W = 820, H = 260;
  const canvas = $('decimals');
  const ctx = setupCanvas(canvas, W, H);
  sizeCss(canvas, W);
  ctx.fillStyle = '#25264a';
  ctx.fillRect(0, 0, W, H);
  const y = 40;
  // 1 whole block
  drawPiece(ctx, 'planks', 40, y, S);
  // 3 tenths (slices), 5 hundredths (cubelets)
  const tenth = S / 10;
  for (let k = 0; k < 3; k++) fillArea(ctx, 'planks', 220 + k * (tenth + 6), y, tenth, S, S / 2);
  for (let k = 0; k < 5; k++) fillArea(ctx, 'planks', 340 + k * (tenth + 6), y + S - tenth, tenth, tenth, S / 2);
  drawText(ctx, '1', 40 + S / 2, y + S + 20, { align: 'center' });
  drawText(ctx, '0.3', 250, y + S + 20, { align: 'center' });
  drawText(ctx, '0.05', 380, y + S + 20, { align: 'center' });
  drawText(ctx, '= 1.35', 480, y + S / 2 - 14, { scale: 5, colour: UI.accent });
}

// ---------- Sprites & type ----------
function sprites() {
  const W = 820, H = 220;
  const canvas = $('sprites');
  const ctx = setupCanvas(canvas, W, H);
  sizeCss(canvas, W);
  ctx.fillStyle = RAMPS.sky[1];
  ctx.fillRect(0, 0, W, H);
  drawSprite(ctx, 'pip', 30, 30, 8);
  drawSprite(ctx, 'gem', 160, 60, 8);
  drawSprite(ctx, 'star', 250, 50, 8);
  drawText(ctx, 'BUILD THE BRIDGE!', 360, 40, { scale: 4 });
  drawText(ctx, '0 1 2 3 4 5 6 7 8 9', 360, 100, { scale: 3, colour: UI.accent });
  drawText(ctx, '3/4 > 2/3  0.5 = 1/2', 360, 140, { scale: 3 });
}

// ---------- Palette ----------
function palette() {
  $('palette').replaceChildren(
    ...Object.entries(RAMPS).map(([name, colours]) => {
      const el = document.createElement('div');
      el.className = 'ramp';
      el.innerHTML = `<div>${colours.map((c) => `<span style="background:${c}" title="${c}"></span>`).join('')}</div>${name}`;
      return el;
    }),
  );
}

scene();
blocks();
tiling();
fractions();
decimals();
sprites();
palette();
