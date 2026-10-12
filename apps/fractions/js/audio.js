// Retro sound effects synthesised with WebAudio — no audio files.
// iOS only allows audio after a user gesture, so unlockAudio() runs on first touch.
let ac = null;

export function unlockAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
}

function tone(freq, dur, { type = 'square', vol = 0.12, slide = 0, when = 0 } = {}) {
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur, { vol = 0.2, freq = 1200, when = 0 } = {}) {
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  tap: () => tone(660, 0.05, { vol: 0.06 }),
  thunk: () => {
    noise(0.12, { vol: 0.35, freq: 500 });
    tone(110, 0.12, { type: 'triangle', vol: 0.25, slide: -50 });
  },
  saw: () => {
    for (let i = 0; i < 3; i++) noise(0.07, { vol: 0.18, freq: 3000, when: i * 0.09 });
  },
  ding: () => {
    tone(880, 0.12, { vol: 0.1 });
    tone(1320, 0.2, { vol: 0.1, when: 0.08 });
  },
  gem: () => {
    tone(1046, 0.08, { type: 'triangle', vol: 0.12 });
    tone(1568, 0.14, { type: 'triangle', vol: 0.12, when: 0.06 });
  },
  crumble: () => {
    noise(0.35, { vol: 0.3, freq: 700 });
    tone(150, 0.3, { type: 'sawtooth', vol: 0.06, slide: -80 });
  },
  oops: () => {
    tone(330, 0.12, { vol: 0.08 });
    tone(262, 0.18, { vol: 0.08, when: 0.1 });
  },
  unlock: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.1, when: i * 0.09 })),
  fanfare: () =>
    [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.14, when: i * 0.12 })),
};
