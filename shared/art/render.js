// Drawing helpers shared by every app.
// Textures are pixel art at integer scale; maths geometry (cuts, ticks,
// positions) is drawn at exact fractional coordinates so 1/3 is truly 1/3.
import { texture } from './textures.js';
import { sprite, FONT, GLYPH_W, GLYPH_H } from './sprites.js';
import { INK } from './palette.js';

// Size a canvas for crisp pixels on high-DPI screens. Returns a ctx in CSS px.
export function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.aspectRatio = `${width} / ${height}`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function drawBlock(ctx, name, x, y, size, variant = 0) {
  ctx.drawImage(texture(name, variant), x, y, size, size);
}

// Draw part of a block: the span [from, to] (fractions of the block) along an axis.
// The texture is clipped, never squashed, so a slab looks cut from a real block.
export function drawPiece(ctx, name, x, y, size, { from = 0, to = 1, axis = 'x', outline = true } = {}) {
  const [px, py, pw, ph] =
    axis === 'x' ? [x + from * size, y, (to - from) * size, size] : [x, y + from * size, size, (to - from) * size];
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  drawBlock(ctx, name, x, y, size);
  // soft top-left light / bottom-right shade so loose pieces read as 3D objects
  const lw = Math.max(1, size / 16);
  ctx.fillStyle = 'rgb(255 255 255 / 0.22)';
  ctx.fillRect(px, py, pw, lw);
  ctx.fillRect(px, py, lw, ph);
  ctx.fillStyle = 'rgb(0 0 0 / 0.25)';
  ctx.fillRect(px, py + ph - lw, pw, lw);
  ctx.fillRect(px + pw - lw, py, lw, ph);
  ctx.restore();
  if (outline) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, size / 24);
    ctx.strokeRect(px, py, pw, ph);
  }
}

// Fill an arbitrary rectangle with a tiled block texture (posts, beams, long slabs).
// Tiles start at the rectangle's own corner so the texture moves with the object.
export function fillArea(ctx, name, x, y, w, h, tile, { outline = true, bevel = true } = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let ty = y; ty < y + h; ty += tile) for (let tx = x; tx < x + w; tx += tile) drawBlock(ctx, name, tx, ty, tile);
  if (bevel) {
    const lw = Math.max(1, tile / 16);
    ctx.fillStyle = 'rgb(255 255 255 / 0.22)';
    ctx.fillRect(x, y, w, lw);
    ctx.fillRect(x, y, lw, h);
    ctx.fillStyle = 'rgb(0 0 0 / 0.25)';
    ctx.fillRect(x, y + h - lw, w, lw);
    ctx.fillRect(x + w - lw, y, lw, h);
  }
  ctx.restore();
  if (outline) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, tile / 24);
    ctx.strokeRect(x, y, w, h);
  }
}

// Empty slot for a piece that isn't placed yet.
export function drawGhost(ctx, x, y, w, h, colour = '#ffffff') {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = colour;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

export function drawSprite(ctx, name, x, y, scale, { flip = false } = {}) {
  const img = sprite(name);
  ctx.save();
  if (flip) {
    ctx.translate(x + img.width * scale, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
  } else {
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }
  ctx.restore();
}

// ---------- Bitmap text ----------
export function textWidth(str, scale) {
  return str.length * (GLYPH_W + 1) * scale - scale;
}

function drawGlyphs(ctx, str, x, y, scale, colour) {
  ctx.fillStyle = colour;
  [...str.toUpperCase()].forEach((ch, i) => {
    const rows = FONT[ch] ?? FONT['?'];
    const gx = x + i * (GLYPH_W + 1) * scale;
    rows.forEach((row, ry) =>
      [...row].forEach((bit, rx) => {
        if (bit === '#') ctx.fillRect(gx + rx * scale, y + ry * scale, scale, scale);
      }),
    );
  });
}

// Pixel text with a hard drop shadow. align: 'left' | 'center' | 'right'.
export function drawText(ctx, str, x, y, { scale = 3, colour = '#ffffff', shadow = INK, align = 'left' } = {}) {
  const w = textWidth(str, scale);
  const left = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  if (shadow) drawGlyphs(ctx, str, left + scale, y + scale, scale, shadow);
  drawGlyphs(ctx, str, left, y, scale, colour);
  return w;
}

// Stacked fraction (numerator over a bar over denominator), centred on cx.
export function drawFraction(ctx, num, den, cx, y, { scale = 3, colour = '#ffffff', shadow = INK } = {}) {
  const n = String(num), d = String(den);
  const w = Math.max(textWidth(n, scale), textWidth(d, scale)) + scale * 2;
  drawText(ctx, n, cx, y, { scale, colour, shadow, align: 'center' });
  const barY = Math.round(y + (GLYPH_H + 2) * scale);
  const left = Math.round(cx - w / 2);
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillRect(left + scale, barY + scale, w, scale);
  }
  ctx.fillStyle = colour;
  ctx.fillRect(left, barY, w, scale);
  drawText(ctx, d, cx, barY + scale * 3, { scale, colour, shadow, align: 'center' });
  return { width: w, height: (GLYPH_H * 2 + 5) * scale };
}
