// Fixed logical resolution (1024×768, iPad 4:3) scaled to fit the screen.
// `view` is the visible area in logical coords — wider or taller than the
// logical frame on other aspect ratios — so backgrounds can fill it edge to edge.
export const W = 1024;
export const H = 768;

export function createStage(canvas) {
  const ctx = canvas.getContext('2d');
  const stage = { canvas, ctx, scale: 1, ox: 0, oy: 0, dpr: 1, view: { x: 0, y: 0, w: W, h: H } };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    const s = Math.min(vw / W, vh / H);
    Object.assign(stage, { scale: s, ox: (vw - W * s) / 2, oy: (vh - H * s) / 2, dpr });
    stage.view = { x: -stage.ox / s, y: -stage.oy / s, w: vw / s, h: vh / s };
  }
  resize();
  window.addEventListener('resize', resize);

  stage.begin = () => {
    const { dpr, scale, ox, oy } = stage;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#14152b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    ctx.imageSmoothingEnabled = false;
  };

  stage.toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - stage.ox) / stage.scale, y: (e.clientY - r.top - stage.oy) / stage.scale };
  };

  return stage;
}
