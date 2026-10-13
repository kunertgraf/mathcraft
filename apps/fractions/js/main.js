import { createStage } from './stage.js';
import { FX } from './fx.js';
import { unlockAudio } from './audio.js';
import { Camp } from './camp.js';
import { Mission } from './mission.js';
import { Build } from './build.js';
import { Night } from './night.js';

const canvas = document.getElementById('game');
const stage = createStage(canvas);

const SCENES = { camp: Camp, mission: Mission, build: Build, night: Night };

const game = {
  stage,
  fx: new FX(),
  t: 0,
  scene: null,
  go(name, params = {}) {
    this.fx.clear();
    this.scene = new SCENES[name](this, params);
  },
};
game.go('camp');

function tick(dt) {
  game.t += dt;
  game.fx.update(dt);
  game.scene.update?.(dt);
  stage.begin();
  game.scene.draw(stage.ctx);
}

let last = performance.now();
function frame(now) {
  tick(Math.min(0.05, (now - last) / 1000));
  last = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// `?test`: expose hooks so scripted play-tests can step time deterministically
// (browsers pause animation frames in hidden tabs).
if (new URLSearchParams(location.search).has('test')) {
  window.__game = game;
  window.__advance = (sec) => {
    for (let t = 0; t < sec; t += 1 / 60) tick(1 / 60);
  };
}

// Single-pointer input in logical coordinates.
let activePointer = null;
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (activePointer !== null) return;
  activePointer = e.pointerId;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    // synthetic or already-released pointers can't be captured; input still works
  }
  game.scene.down?.(stage.toLogical(e));
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === activePointer) game.scene.move?.(stage.toLogical(e));
});
for (const type of ['pointerup', 'pointercancel']) {
  canvas.addEventListener(type, (e) => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    game.scene.up?.(stage.toLogical(e));
  });
}
