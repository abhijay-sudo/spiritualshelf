// Spiritual [depth] sim/depth: the motion of the home opening's depth layers. Pure maths (no DOM, no clock): life-depth.js feeds it the pointer, the
// scroll and the time, and writes what it returns to two layers of the painting. It is spring / ODE motion (the exact damped oscillator of
// life-spring.js), not PhysX and not a shader.
//   hills   the far ridges: light, so they trail (a slow spring, a little ring)
//   trees   the near crowns: heavier follow, a quicker and more underdamped spring, so a scroll flick overshoots a pixel or two and settles in about half a second
//   the sea (the lake and the sky) is the reference plane: it does not move; the bank slides against it, the farther the less
// Everything is in CSS pixels at the size the painting is drawn; "scale" is how large the painting is drawn compared with a 1366 px wide
// screen (the amplitudes grow and shrink with the painting, up to a limit, so a wide screen is not a still one and a phone is not a shake).
// camera: when the title lands the rig is given a small displacement and let go: the layers behind the text settle (the text never moves).
export const CFG = {
  hills: { ax: 6.5, ay: 2.4, sk: 0.0115, svk: 0.00135, f: 2.2, z: 0.40 },       // pointer reach x and y (px at an edge of the screen), px of lag per px of scroll, px per px/s of scroll speed, frequency (Hz), damping
  trees: { ax: 12.5, ay: 4.6, sk: 0.020, svk: 0.0016, f: 3.0, z: 0.40 },
  lean: { f: 0.85, z: 0.34, deg: 1.6 },                                           // the crowns' lean to a gust (skew about the shore), a slow, loose spring
  kick: { trees: [2.6, 1.3], hills: [1.5, 0.8] },                                   // the camera settle: a start displacement (x, y px)
};
export function createRig(Spring, opt = {}) {
  const c = { ...CFG, ...opt };
  const mk = (k) => ({ x: new Spring(0, k.f, k.z), y: new Spring(0, k.f, k.z) });
  const L = { hills: mk(c.hills), trees: mk(c.trees) }, lean = new Spring(0, c.lean.f, c.lean.z);
  const out = { hills: { x: 0, y: 0 }, trees: { x: 0, y: 0 }, lean: 0, energy: 0 };
  let level = 0;                      // 0 whole, 1 hills hold still, 2 the crowns do not lean, 3 nothing moves (the governor's ladder)
  const rig = {
    out, get level() { return level; }, set level(v) { level = v | 0; },
    // inp: nx, ny (-1..1: the pointer, a finger or the tilt), sy (scroll past the top of the opening, px), svy (scroll speed, px/s), gust (-1..1 lean push), scale
    step(dt, inp) {
      const s = Math.max(0.55, Math.min(1.12, inp.scale || 1)), sy = Math.max(0, Math.min(inp.sy || 0, (inp.range || 900))), svy = Math.max(-1500, Math.min(inp.svy || 0, 1500));
      for (const k of ['hills', 'trees']) {
        const p = c[k], q = L[k];
        const frozen = level >= 3 || (k === 'hills' && level >= 1);
        q.x.target = frozen ? 0 : (inp.nx || 0) * p.ax * s;
        q.y.target = frozen ? 0 : (inp.ny || 0) * p.ay * s + (sy * p.sk + svy * p.svk) * Math.min(1, s * 1.1);
        q.x.step(dt); q.y.step(dt);
        out[k].x = q.x.x; out[k].y = q.y.x;   // (q.y is the vertical spring: its position is q.y.x)
      }
      lean.target = level >= 2 ? 0 : (inp.gust || 0) * c.lean.deg;
      lean.step(dt); out.lean = lean.x;
      out.energy = Math.abs(out.trees.x) + Math.abs(out.trees.y) + Math.abs(out.hills.x) + Math.abs(out.hills.y) + Math.abs(lean.v) * 0.1 + Math.abs(L.trees.x.v) * 0.05 + Math.abs(L.trees.y.v) * 0.05;
      return out;
    },
    // the camera settle: displace the layers behind the text and let them go (they were at rest, so they ring back through zero and fade)
    kick(sc = 1) {
      for (const k of ['hills', 'trees']) { const [kx, ky] = c.kick[k]; L[k].x.x += kx * sc; L[k].y.x += ky * sc; }
    },
    reset() { for (const k of ['hills', 'trees']) { L[k].x.set(0); L[k].y.set(0); } lean.set(0); out.hills.x = out.hills.y = out.trees.x = out.trees.y = out.lean = out.energy = 0; },
  };
  return rig;
}
