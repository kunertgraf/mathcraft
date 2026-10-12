// Pip's base: a build grid in front of the house, plus the field mobs cross.
// Shared by the Build and Night scenes.
import { RAMPS } from '../../../shared/art/palette.js';
import { drawBlock, drawPiece, fillArea } from '../../../shared/art/render.js';
import { B } from './world.js';
import { BLOCK_HP } from './learn.js';

// Build grid: columns 10–17 (x 480–864), rows 7–11 (up to 5 blocks high).
export const GRID = { c0: 10, c1: 17, r0: 7, r1: 11 };
export const cellX = (c) => c * B;
export const cellY = (r) => r * B;
export const key = (c, r) => `${c},${r}`;

// The field: number line from the mob spawn (0) to the front of the base (1).
export const FIELD = { x0: 48, x1: GRID.c0 * B };
export const FIELD_SPAN = FIELD.x1 - FIELD.x0;
export const fieldX = (f) => FIELD.x0 + f * FIELD_SPAN;
export const fieldF = (x) => (x - FIELD.x0) / FIELD_SPAN;

// roofTop: where Pip stands (top of the half-slab roof).
export const HOUSE = { x: 18 * B, w: 3 * B, roofY: 8 * B, roofTop: 8 * B + B / 2 };

export function inGrid(c, r) {
  return c >= GRID.c0 && c <= GRID.c1 && r >= GRID.r0 && r <= GRID.r1;
}

export function cellAt(p) {
  const c = Math.floor(p.x / B), r = Math.floor(p.y / B);
  return inGrid(c, r) ? { c, r } : null;
}

// A block can go on the ground row or next to another block.
export function canPlace(layout, c, r) {
  if (!inGrid(c, r) || layout[key(c, r)]) return false;
  if (r === GRID.r1) return true;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => layout[key(c + dc, r + dr)]);
}

// Live copy of the layout with hit points, for a night.
export function liveFrom(layout) {
  const live = {};
  for (const [k, name] of Object.entries(layout)) live[k] = { name, hp: BLOCK_HP[name] ?? 3, max: BLOCK_HP[name] ?? 3 };
  return live;
}

// blocks: { "c,r": name } or live { "c,r": { name, hp, max } }
export function drawBase(ctx, blocks, { grid = false } = {}) {
  if (grid) {
    ctx.save();
    ctx.strokeStyle = 'rgb(255 255 255 / 0.22)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1;
    for (let c = GRID.c0; c <= GRID.c1; c++)
      for (let r = GRID.r0; r <= GRID.r1; r++) ctx.strokeRect(cellX(c) + 2, cellY(r) + 2, B - 4, B - 4);
    ctx.restore();
  }
  for (const [k, v] of Object.entries(blocks)) {
    const [c, r] = k.split(',').map(Number);
    const name = typeof v === 'string' ? v : v.name;
    drawPiece(ctx, name, cellX(c), cellY(r), B);
    if (typeof v !== 'string' && v.hp < v.max) drawCracks(ctx, cellX(c), cellY(r), 1 - v.hp / v.max);
  }
  drawHouse(ctx);
}

function drawCracks(ctx, x, y, dmg) {
  ctx.fillStyle = 'rgb(10 10 20 / 0.75)';
  const cracks = [[4, 4, 2, 10], [6, 12, 8, 2], [12, 6, 2, 12], [10, 22, 10, 2], [26, 8, 2, 14], [24, 30, 12, 2], [34, 16, 2, 12], [16, 34, 2, 10]];
  const n = Math.ceil(dmg * cracks.length);
  for (const [cx, cy, w, h] of cracks.slice(0, n)) ctx.fillRect(x + cx, y + cy, w, h);
}

export function drawHouse(ctx) {
  const { x, w, roofY } = HOUSE;
  // walls
  for (let c = 0; c < 3; c++) for (let r = 9; r <= 11; r++) drawBlock(ctx, 'planks', x + c * B, r * B, B);
  // log corner posts
  fillArea(ctx, 'log', x - 4, 9 * B, 12, 3 * B, B);
  fillArea(ctx, 'log', x + w - 8, 9 * B, 12, 3 * B, B);
  // door and window
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(x + B + 8, 10 * B, B - 16, 2 * B);
  ctx.fillStyle = RAMPS.wood[3];
  ctx.fillRect(x + 2 * B - 18, 11 * B - 8, 6, 6);
  drawPiece(ctx, 'glass', x + 12, 9 * B + 12, 28, { outline: false });
  ctx.fillStyle = 'rgb(255 214 120 / 0.55)';
  ctx.fillRect(x + 14, 9 * B + 14, 24, 24);
  // roof: a row of brick slabs with an overhang
  for (let c = 0; c < 4; c++) drawPiece(ctx, 'brick', x + c * B - B / 2, roofY, B, { from: 0.5, to: 1, axis: 'y' });
}
