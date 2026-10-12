// The one palette every asset draws from. Ramps run dark → light.
// Light comes from the top-left everywhere.

export const INK = '#14152b';
export const PAPER = '#f6f1e7';
export const WHITE = '#ffffff';

export const RAMPS = {
  stone: ['#2c2e3e', '#44475c', '#5e6279', '#7c8099', '#a2a7bf'],
  dirt: ['#3a271f', '#59392a', '#7a5136', '#9b6b45', '#b98a5e'],
  grass: ['#244a2b', '#336b33', '#4d9440', '#76bd4c', '#ade06a'],
  wood: ['#3f2718', '#623f25', '#8a5d33', '#b6844a', '#dcae6c'],
  bark: ['#2a1d14', '#43301f', '#5e442b', '#7a5b3a'],
  sand: ['#a8854f', '#c9a86a', '#e0c68c', '#f1e2b2'],
  brick: ['#5c231f', '#86362c', '#ad4d3b', '#cc6c52'],
  mortar: ['#a59c8f', '#cfc6b6'],
  water: ['#16294d', '#1f4778', '#2f6aa6', '#4d97cf', '#86c6ea'],
  glass: ['#9fd8ee', '#d6f2fb'],
  sky: ['#7ec4ec', '#9dd3f0', '#bfe3f4', '#dff1f8'],
  hillFar: ['#7fae9a', '#93c0aa'],
  hillNear: ['#4f8a5c', '#5f9e66'],
  diamond: ['#1c8a83', '#45dccf', '#c1fbf4'],
  gold: ['#a1701a', '#f7c843', '#fff1ae'],
  emerald: ['#14733f', '#35d07c', '#b6f4d0'],
  redstone: ['#851d18', '#e2413a', '#ff9d90'],
};

// Accent colours for UI and maths overlays.
export const UI = {
  accent: '#ffcf3f',
  good: '#4cd38a',
  bad: '#ff6b6b',
  ruler: '#fff6dc',
  rulerInk: '#3a2a1a',
  skin: '#e7b086',
  skinShade: '#c48a62',
  cheek: '#f08f84',
  shirt: '#3f63d6',
  shirtShade: '#2d47a3',
  hat: '#ffcf3f',
  hatShade: '#d39a1c',
};

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
