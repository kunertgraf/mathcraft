// UI pieces drawn on the canvas: panels, buttons, instruction lines with
// stacked fractions, speech bubbles and the HUD.
import { INK, PAPER, UI } from '../../../shared/art/palette.js';
import { drawFraction, drawSprite, drawText, textWidth } from '../../../shared/art/render.js';
import { W } from './stage.js';

export const FONT = (size, weight = 700) => `${weight} ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
export const FRAC_INK = '#b4541e';

export const hit = (r, p) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export function panel(ctx, x, y, w, h, { fill = PAPER, alpha = 1 } = {}) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = INK;
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgb(0 0 0 / 0.1)';
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.globalAlpha = 1;
}

// b: { x, y, w, h, label, enabled = true, colour }
export function button(ctx, b) {
  const enabled = b.enabled !== false;
  const base = enabled ? b.colour ?? UI.accent : '#b9b6c9';
  const press = b.pressed ? 4 : 0;
  ctx.fillStyle = INK;
  ctx.fillRect(b.x - 3, b.y - 3 + press, b.w + 6, b.h + 6 - press);
  ctx.fillStyle = 'rgb(0 0 0 / 0.35)';
  if (!press) ctx.fillRect(b.x, b.y + b.h - 6, b.w, 6);
  ctx.fillStyle = base;
  ctx.fillRect(b.x, b.y + press, b.w, b.h - 6);
  ctx.fillStyle = 'rgb(255 255 255 / 0.35)';
  ctx.fillRect(b.x, b.y + press, b.w, 4);
  ctx.fillStyle = enabled ? INK : '#6e6b80';
  ctx.font = FONT(26);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + press + (b.h - 6) / 2 + 1);
  ctx.textAlign = 'left';
}

// parts: strings and { f: [n, d] } stacked fractions. Returns total width.
function measure(ctx, parts, size, fs) {
  ctx.font = FONT(size);
  return parts.reduce((w, p) => w + (typeof p === 'string' ? ctx.measureText(p).width : fracWidth(p.f, fs) + 12), 0);
}
const fracWidth = ([n, d], fs) => Math.max(textWidth(String(n), fs), textWidth(String(d), fs)) + 4;

// fs: pixel-font scale for stacked fractions (height = 19 × fs).
export function richLine(ctx, parts, cx, cy, { size = 28, colour = INK, fs = 2 } = {}) {
  const w = measure(ctx, parts, size, fs);
  let x = cx - w / 2;
  ctx.textBaseline = 'middle';
  for (const p of parts) {
    if (typeof p === 'string') {
      ctx.font = FONT(size);
      ctx.fillStyle = colour;
      ctx.fillText(p, x, cy);
      x += ctx.measureText(p).width;
    } else {
      const fw = fracWidth(p.f, fs);
      drawFraction(ctx, p.f[0], p.f[1], x + 6 + fw / 2, cy - (19 * fs) / 2, { scale: fs, colour: FRAC_INK, shadow: null });
      x += fw + 12;
    }
  }
  return w;
}

// The instruction panel at the top of the screen.
export function instruction(ctx, parts, { y = 80 } = {}) {
  const w = Math.max(360, measure(ctx, parts, 28, 3) + 64);
  panel(ctx, (W - w) / 2, y, w, 76);
  richLine(ctx, parts, W / 2, y + 38, { fs: 3 });
}

// Speech bubble pointing down at (x, y).
export function bubble(ctx, text, x, y, { maxW = 300 } = {}) {
  ctx.font = FONT(22);
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  lines.push(line);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 32;
  const h = lines.length * 28 + 20;
  const bx = Math.max(16, Math.min(W - w - 16, x - 40)), by = y - h - 16;
  panel(ctx, bx, by, w, h, { fill: '#ffffff' });
  ctx.fillStyle = INK;
  ctx.fillRect(x - 6, by + h + 3, 12, 6);
  ctx.fillRect(x - 3, by + h + 9, 6, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 3, by + h, 6, 6);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + 16, by + 24 + i * 28));
}

export function hudGems(ctx, n, x, y) {
  drawSprite(ctx, 'gem', x, y, 4);
  drawText(ctx, String(n), x + 40, y + 4, { scale: 4 });
}

// Big celebratory message in the instruction slot; pops in with a little overshoot.
export function rewardBanner(ctx, text, age) {
  const pop = age < 0.25 ? 0.6 + 0.6 * Math.sin((age / 0.25) * Math.PI * 0.75) : 1;
  const scale = 5, tw = textWidth(text, scale), w = (tw + 48) * pop, h = 76 * pop;
  ctx.fillStyle = INK;
  ctx.fillRect(W / 2 - w / 2 - 3, 118 - h / 2 - 3, w + 6, h + 6);
  ctx.fillStyle = '#2a3a6e';
  ctx.fillRect(W / 2 - w / 2, 118 - h / 2, w, h);
  if (pop >= 1) drawText(ctx, text, W / 2, 118 - 17, { scale, colour: UI.accent, align: 'center' });
}
