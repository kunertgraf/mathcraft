// Tweens and pixel particles — the "juice" that makes each answer feel good.

export const ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

export class FX {
  constructor() {
    this.parts = [];
    this.tweens = [];
    this.timers = [];
  }

  // Square pixel particles flying out from a point.
  burst(x, y, colours, { n = 14, speed = 240, gravity = 700, size = 6, life = 0.7, up = 0.6 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * up,
        g: gravity,
        size: size * (0.6 + Math.random() * 0.6),
        colour: colours[Math.floor(Math.random() * colours.length)],
        life, age: 0,
      });
    }
  }

  // Animate numeric props of obj to target values.
  tween(obj, to, dur, { easing = ease.outQuad, delay = 0, done } = {}) {
    const from = {};
    for (const k of Object.keys(to)) from[k] = obj[k];
    this.tweens.push({ obj, from, to, dur, easing, t: -delay, done });
  }

  after(sec, fn) {
    this.timers.push({ t: sec, fn });
  }

  clear() {
    this.parts.length = 0;
    this.tweens.length = 0;
    this.timers.length = 0;
  }

  update(dt) {
    for (const p of this.parts) {
      p.age += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);

    const finished = [];
    for (const tw of this.tweens) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur);
      const e = tw.easing(k);
      for (const key of Object.keys(tw.to)) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      if (k >= 1) finished.push(tw);
    }
    this.tweens = this.tweens.filter((tw) => !finished.includes(tw));
    finished.forEach((tw) => tw.done?.());

    const due = [];
    for (const tm of this.timers) if ((tm.t -= dt) <= 0) due.push(tm);
    this.timers = this.timers.filter((tm) => !due.includes(tm));
    due.forEach((tm) => tm.fn());
  }

  draw(ctx) {
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.colour;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
