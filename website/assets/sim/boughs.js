// Spiritual [life] sim/boughs: the pure part of the far shore's boughs, roots and reeds (assets/life-boughs.js mounts it; assets/sim/far.js draws it).
// No DOM and no clock in here: layout (where each chain hangs, kept clear of the page's text and buttons), the PhysX rig builder, the spring chain
// that stands in for PhysX on the Rich tier, and the packing of either one's result into the float rows far.js reads.
// What is PhysX: on Ultra every chain is a line of real rigid capsules (PhysX 5.12) joined by D6 joints (swing limited about z, twist locked, an
// angular drive that is a spring plus a damper): the joint solver makes them bend, hang, swing and settle. What is not: the wind. The breeze, its
// curl-noise gusts, the pointer's wake and the scroll's gust are our own JavaScript forces (assets/sim/life-world.js, the 'wind' and 'wake' fields) that
// PhysX applies to the bodies; PhysX has no fluid and none is claimed. On Rich there is no PhysX: the same chains are a cascade of damped springs.
// The world: metres, x to the right, y up, origin at the painting's top-left corner; one metre is the painting's width / 27.3 css pixels.
const PXM_DIV = 27.3;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- the chains, placed along the far bank: t (0..1) is how far along the visible part of its side's bank, so the chains always sit on trees that are on screen ----
// kind: bough (hangs from a crown's edge), root (a thin prop root, hangs), reed (stands on the shore). n: bodies. len: metres. Every one is drawn
// as one or more strips (inst): a reed bundle wears three, so the cluster reads as a stand of stalks that move together but not in lock step.
export const CHAINS = [
  { id: 'L0', side: -1, kind: 'bough', t: 0.10, n: 7, len: 0.64, w: 1.0, inst: [{ cell: 'boughA', ws: 1.6, haze: 0.3 }, { cell: 'boughB', ws: 1.3, dx: 11, dy: 1, haze: 0.36, alpha: 0.85 }] },
  { id: 'L1', side: -1, kind: 'bough', t: 0.42, n: 7, len: 0.6, w: 1.15, inst: [{ cell: 'boughB', ws: 1.6, haze: 0.3 }] },
  { id: 'L2', side: -1, kind: 'root', t: 0.80, n: 7, len: 0.7, w: 0.8, inst: [{ cell: 'rootA', ws: 1.6, haze: 0.3 }, { cell: 'rootB', ws: 1.1, dx: -9, dy: 0, haze: 0.36, alpha: 0.8 }] },
  { id: 'L3', side: -1, kind: 'reed', t: 0.26, n: 5, len: 0.62, w: 1.0, inst: [{ cell: 'reedA', ws: 1.6, haze: 0.26 }, { cell: 'reedB', ws: 0.8, dx: 11, dy: 1, haze: 0.3, alpha: 0.9 }, { cell: 'reedA', ws: 0.7, dx: -12, dy: 0, haze: 0.3, alpha: 0.8, mirror: 1 }] },
  { id: 'R0', side: 1, kind: 'bough', t: 0.10, n: 7, len: 0.64, w: 1.1, inst: [{ cell: 'boughB', ws: 1.6, haze: 0.3 }, { cell: 'boughA', ws: 1.25, dx: -11, dy: 1, haze: 0.36, alpha: 0.85 }] },
  { id: 'R1', side: 1, kind: 'bough', t: 0.42, n: 7, len: 0.66, w: 0.9, inst: [{ cell: 'boughA', ws: 1.6, haze: 0.3 }] },
  { id: 'R2', side: 1, kind: 'root', t: 0.82, n: 7, len: 0.7, w: 0.85, inst: [{ cell: 'rootB', ws: 1.6, haze: 0.3 }, { cell: 'rootA', ws: 1.1, dx: 9, dy: 0, haze: 0.36, alpha: 0.8 }] },
  { id: 'R3', side: 1, kind: 'reed', t: 0.28, n: 5, len: 0.66, w: 1.0, inst: [{ cell: 'reedB', ws: 1.6, haze: 0.26 }, { cell: 'reedA', ws: 0.8, dx: -11, dy: 1, haze: 0.3, alpha: 0.9 }, { cell: 'reedB', ws: 0.7, dx: 12, dy: 0, haze: 0.3, alpha: 0.8, mirror: 1 }] },
];
export const bodiesOf = (chains = CHAINS) => chains.reduce((s, c) => s + c.n, 0);

// ---- the sprite atlas (assets/life-boughs-sprites.json is written by scripts/boughs-sprites.mjs; this is the same table) ----
export const ATLAS = { w: 312, h: 240, cells: { boughA: [0, 0, 72, 200], boughB: [72, 0, 72, 200], rootA: [144, 0, 36, 200], rootB: [180, 0, 36, 200], reedA: [216, 0, 48, 160], reedB: [264, 0, 48, 160], petalMarigold: [0, 208, 40, 28], petalRose: [40, 208, 40, 28], petalLotus: [80, 208, 40, 28], petalCream: [120, 208, 40, 28] } };

// ---- the breeze: a curl-noise field (divergence free, so it swirls and never piles up) plus a slow steady push. The same constants are in
// assets/sim/life-world.js, where the Ultra tier applies it as a force on PhysX bodies; here it feeds the spring chains of the Rich tier ----
const CW = [[0.5, 0.9, 0.55, 0.31, 0.9], [0.8, 2.1, 1.35, -0.43, 1.7], [0.35, 4.4, 2.9, 0.77, 3.1]];   // amplitude, kx, ky, omega, phase
export const curl = (x, y, t, out) => {
  let u = 0, v = 0;
  for (let j = 0; j < 3; j++) { const [a, kx, ky, w, p] = CW[j], A = Math.sin(kx * x + w * t + p), B = Math.sin(ky * y - w * 0.8 * t + p * 1.7), dA = Math.cos(kx * x + w * t + p), dB = Math.cos(ky * y - w * 0.8 * t + p * 1.7); u += a * A * ky * dB; v -= a * kx * dA * B; }
  out[0] = u; out[1] = v; return out;
};

// ---- the far bank of the home painting, measured: where the crowns' tops are (v) at u, left bank and right bank; the shore (waterline) is v 0.5035 ----
const SKY = { L: [[0, 0.435], [0.05, 0.425], [0.08, 0.418], [0.10, 0.425], [0.13, 0.44], [0.15, 0.435], [0.18, 0.45], [0.20, 0.455], [0.22, 0.46], [0.25, 0.475], [0.28, 0.478], [0.30, 0.475]],
  R: [[0.78, 0.487], [0.80, 0.478], [0.82, 0.472], [0.84, 0.47], [0.86, 0.467], [0.88, 0.466], [0.90, 0.462], [0.92, 0.455], [0.94, 0.447], [0.96, 0.445], [0.98, 0.46], [1, 0.45]] };
const BANK = { L: [0, 0.27], R: [0.83, 1.0] }, BANK_P = { L: [0.02, 0.16], R: [0.84, 0.98] }, SHORE_V = 0.5035, HANG = { bough: 0.016, root: 0.008 };
const skyline = (side, u) => { const t = SKY[side < 0 ? 'L' : 'R']; if (u <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (u <= t[i][0]) { const a = t[i - 1], b = t[i], k = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; } return t[t.length - 1][1]; };

// ---- layout: where each chain really hangs on this screen ----
// cover: the painting's box in css px [x, y, w, h]; vw, vh: the viewport; obstacles: rects { x, y, w, h } of the page's text and buttons (ink, not blocks).
// Returns { pxm, chains: [{ def, rx, ry, len, box, ok }] }, with a chain nudged along the shore or dropped when it would touch an obstacle.
// opt.portrait: the phone's painting (the far bank is only a thin dark line near each edge, v about 0.49): a single shore line, bank ranges at the edges, and opt.pxm sets the size
// (a phone's chains are drawn larger than the picture's own scale, or they would be a few pixels).
export const layoutRig = (cover, vw, vh, obstacles, defs = CHAINS, cellAspect = { boughA: 0.36, boughB: 0.36, rootA: 0.18, rootB: 0.18, reedA: 0.3, reedB: 0.3 }, opt = {}) => {
  const pxm = opt.pxm || cover[2] / PXM_DIV, out = [], pad = 8, uMin = -cover[0] / cover[2], uMax = (vw - cover[0]) / cover[2], por = !!opt.portrait, shoreV = por ? 0.4975 : SHORE_V;
  const hit = (b) => obstacles.some((o) => b.x < o.x + o.w + pad && b.x + b.w > o.x - pad && b.y < o.y + o.h + pad && b.y + b.h > o.y - pad);
  const boxOf = (def, rx, ry) => {
    const lenPx = def.len * pxm, widest = Math.max(...def.inst.map((q) => (cellAspect[q.cell] || 0.3) * lenPx * (q.ws || 1) * 0.5 + Math.abs(q.dx || 0))), swing = lenPx * 0.42 + widest;
    return def.kind === 'reed' ? { x: rx - swing, y: ry - lenPx - 6, w: swing * 2, h: lenPx + 8 } : { x: rx - swing, y: ry - 6, w: swing * 2, h: lenPx + 8 };
  };
  for (const def of defs) {
    const bank = por ? BANK_P[def.side < 0 ? 'L' : 'R'] : BANK[def.side < 0 ? 'L' : 'R'], a = Math.max(bank[0], uMin + 0.04), b = Math.min(bank[1], uMax - 0.04);
    let ok = false, rx = 0, ry = 0, u = 0;
    if (b - a > 0.03) for (const step of [0, 0.07, -0.07, 0.14, -0.14]) {
      const t = clamp(def.t + step, 0, 1); u = a + (b - a) * t; rx = cover[0] + u * cover[2];
      const v = def.kind === 'reed' ? shoreV : por ? 0.487 + HANG[def.kind] : skyline(def.side, u) + HANG[def.kind]; ry = cover[1] + v * cover[3];
      // a hanging chain starts below any text that is above it (the brush stroke under the title sits on the crowns): its root is lowered, never the text moved
      if (def.kind !== 'reed') for (let k = 0; k < 3; k++) { const bx0 = boxOf(def, rx, ry); const o = obstacles.find((q) => bx0.x < q.x + q.w + pad && bx0.x + bx0.w > q.x - pad && ry - 6 < q.y + q.h + pad && ry + 10 > q.y - pad); if (!o) break; ry = o.y + o.h + pad + 7; }
      const bx = boxOf(def, rx, ry), inView = bx.x >= 6 && bx.x + bx.w <= vw - 6 && ry > 0 && ry < vh;
      if (inView && !hit(bx)) { ok = true; break; }
    }
    out.push({ def, rx, ry, len: def.len, ok, u, box: boxOf(def, rx, ry) });
  }
  // two chains of one side may not end up on top of each other (a nudge can bring them together): the later one is dropped
  for (let i = 0; i < out.length; i++) for (let j = 0; j < i; j++) if (out[i].ok && out[j].ok && out[i].def.side === out[j].def.side && Math.abs(out[i].rx - out[j].rx) < 0.55 * (out[i].box.w + out[j].box.w) * 0.5 && Math.abs(out[i].ry - out[j].ry) < 40 && out[i].def.kind !== 'reed' && out[j].def.kind !== 'reed') out[i].ok = false;
  return { pxm, cover, chains: out };
};

// ---- the PhysX rig: one group per side (each under the per-group cap), capsules along the chain, D6 joints with an angular drive ----
// ph: a package's physics scope (assets/life-physics.js). Returns { chains: [{ def, bodies, joints }], groups, field, wake } or null when the world refuses.
const qz = (a) => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
export const toWorld = (cover, pxm, cx, cy, o) => { o[0] = (cx - cover[0]) / pxm; o[1] = -(cy - cover[1]) / pxm; return o; };
export const toCss = (cover, pxm, wx, wy, o) => { o[0] = cover[0] + wx * pxm; o[1] = cover[1] - wy * pxm; return o; };
// per-kind rod: f1 is the frequency of the chain's first bending mode in hertz and zeta its damping ratio. The joints are all alike (a bending
// stiffness EI / L, the way a rod is): k = (w1 / 3.516)^2 m n^4 L^2 from the first-mode frequency of a cantilever of n beads, and the damping is
// proportional to the stiffness (c = 2 zeta k / w1), which damps the fast wobbles more than the slow sway: it never jitters.
export const KIND = {
  bough: { r: 0.02, dens: 260, f1: 1.0, zeta: 0.4, wind: 1.0, lim: 1.1, iters: [32, 4], damp: [0.7, 1.5] },
  root: { r: 0.012, dens: 220, f1: 0.8, zeta: 0.35, wind: 1.35, lim: 1.2, iters: [32, 4], damp: [0.6, 1.3] },
  reed: { r: 0.016, dens: 300, f1: 1.8, zeta: 0.25, wind: 1.15, lim: 0.8, iters: [48, 6], damp: [0.4, 1.0] },
};
// the stiffness and damping of one joint of a chain (N m per radian, N m s per radian)
export const joint = (def, K) => {
  const L = def.len / def.n, hh = L / 2 - K.r, m = K.dens * (Math.PI * K.r * K.r * 2 * hh + (4 / 3) * Math.PI * K.r ** 3), w1 = 2 * Math.PI * K.f1;
  const k = (w1 / 3.516) ** 2 * m * def.n ** 4 * L * L; return { k, c: 2 * K.zeta * k / w1, m };
};
export function buildPhysx(ph, rig, cover, pxm) {
  const groups = {}, outChains = [], tmp = [0, 0];
  for (const side of ['L', 'R']) { groups[side] = ph.group('boughs-' + side, { cap: 32, collide: [], self: false }); if (!groups[side]) return null; }
  let seedN = 1;
  for (const c of rig.chains) {
    if (!c.ok) continue;
    const def = c.def, K = KIND[def.kind], jt = joint(def, K), g = groups[def.side < 0 ? 'L' : 'R'], reed = def.kind === 'reed', L = def.len / def.n, hh = L / 2 - K.r, rest = reed ? Math.PI / 2 : -Math.PI / 2, q0 = qz(rest), d0 = reed ? 1 : -1;
    toWorld(cover, pxm, c.rx, c.ry, tmp); const rx = tmp[0], ry = tmp[1], bodies = [], joints = []; let prev = null, fail = false;
    for (let i = 0; i < def.n; i++) {
      const b = g.capsule({ pos: [rx, ry + d0 * L * (i + 0.5), 0], quat: q0, r: K.r, hh, axis: 'x', density: K.dens, damp: K.damp, sleep: 0, wind: K.wind * (0.85 + 0.3 * (i / def.n)), seed: seedN++ * 1.7, maxW: 12, iters: K.iters });
      if (!b) { fail = true; break; }
      bodies.push(b);
      // the joint's angular drive is a spring and a damper on the bend (the rod's bending stiffness and its damping)
      const j = g.joint({ type: 'd6', a: prev, b, anchorPos: prev ? undefined : [rx, ry, 0], fa: prev ? { p: [L / 2, 0, 0] } : { p: [0, 0, 0], q: q0 }, fb: { p: [-L / 2, 0, 0] }, motion: { swing1: 'locked', swing2: 'limited', twist: 'locked' }, swing: [0.05, K.lim],
        drives: [{ axis: 'swing2', stiffness: jt.k, damping: jt.c, accel: false, force: 1e9 }] });
      if (j) joints.push(j);
      prev = b;
    }
    if (fail) { for (const b of bodies) b.remove(); continue; }
    outChains.push({ def, c, bodies, joints, root: [rx, ry], L, d0 });
  }
  return { chains: outChains, groups };
}

// ---- pose rows: the nodes of every chain (metres from its root), what far.js reads ----
// From PhysX snapshot poses: node k is where capsule k-1 ends and capsule k begins (averaged), the tip is the last capsule's far end; the tangent at a node is the
// mean of the two capsule axes there. rows: Float32Array(COLS * ROWS * 4); texel (k, chain) = (x, y, tangent angle, 0).
export function packPhysx(chains, rows, cols, tmp) {
  for (let ci = 0; ci < chains.length; ci++) {
    const ch = chains[ci], n = ch.bodies.length, L = ch.L, ox = ch.root[0], oy = ch.root[1], base = ci * cols * 4;
    let ax0 = 0, ay0 = 0, cx0 = 0, cy0 = 0;
    for (let k = 0; k <= n; k++) {
      let px = 0, py = 0, ang = 0;
      if (k < n) { ch.bodies[k].pose(tmp); const qx = tmp[3], qy = tmp[4], qz_ = tmp[5], qw = tmp[6], ax = 1 - 2 * (qy * qy + qz_ * qz_), ay = 2 * (qx * qy + qw * qz_); px = tmp[0] - ax * L / 2; py = tmp[1] - ay * L / 2; ang = Math.atan2(ay, ax); if (k > 0) { px = (px + (cx0 + ax0 * L / 2)) / 2; py = (py + (cy0 + ay0 * L / 2)) / 2; ang = Math.atan2(ay + ay0, ax + ax0); } ax0 = ax; ay0 = ay; cx0 = tmp[0]; cy0 = tmp[1]; }
      else { px = cx0 + ax0 * L / 2; py = cy0 + ay0 * L / 2; ang = Math.atan2(ay0, ax0); }
      const o = base + k * 4; rows[o] = px - ox; rows[o + 1] = py - oy; rows[o + 2] = ang; rows[o + 3] = 0;
    }
  }
}

// ---- the Rich tier: the same chains as a cascade of damped springs (no PhysX, no worker) ----
// Segment i's absolute bend b_i (radians, toward +x) follows its parent's (b_{i-1}, coupling kappa) and is pushed by the breeze. Each spring is solved exactly
// (the shared integrator, so any frame time is stable). Honest label: spring/ODE.
export function createSpringRig(chains, rig, spring, cover, pxm) {
  const list = [];
  for (const c of rig.chains) {
    if (!c.ok) continue; const def = c.def, K = KIND[def.kind], reed = def.kind === 'reed', sp = [];
    for (let i = 0; i < def.n; i++) { sp.push(new spring.Spring(0, K.f1 * (1 + 0.25 * i / Math.max(1, def.n - 1)), Math.min(0.55, K.zeta * 1.1))); }
    list.push({ def, c, sp, reed, L: def.len / def.n, rx: 0, ry: 0, gain: K.wind });
  }
  const w2 = [0, 0], tmpW = [0, 0], css = [0, 0]; let t = 0;
  return {
    chains: list,
    // base: the sky's own wind in m/s; gustU: what a flick or a scroll adds to the breeze, m/s; wake: { px, py (host css px), vx (css px/s) } or null
    step(dt, base, gustU, wake) {
      t += dt;
      for (const ch of list) {
        toWorld(cover, pxm, ch.c.rx, ch.c.ry, tmpW); const wx = tmpW[0], wy = tmpW[1]; let prev = 0;
        for (let i = 0; i < ch.sp.length; i++) {
          const s = ch.sp[i], f = (i + 0.5) / ch.sp.length, y = wy + (ch.reed ? 1 : -1) * ch.L * (i + 0.5);
          curl(wx, y, t, w2); const u = base + w2[0] * 0.9;   // m/s: the steady push and the curl's swirl
          // the bend the breeze would hold (radians per m/s, more toward the tip); each segment also follows its parent a little. A gust is a stronger push than the same speed of breeze
          const lean = ((ch.reed ? 0.018 : 0.034) * u + (ch.reed ? 0.05 : 0.1) * gustU) * ch.gain * (0.55 + 0.9 * f);
          s.target = clamp(prev * 0.55 + lean * 0.7, -0.95, 0.95);
          if (wake) { toCss(cover, pxm, wx, y, css); const dx = css[0] - wake.px, dy = css[1] - wake.py, d2 = dx * dx + dy * dy, R = 80 * (pxm / 58); if (d2 < R * R * 4) s.v += clamp(wake.vx / 900, -2.5, 2.5) * Math.exp(-d2 / (R * R)) * dt * 3.2 * ch.gain * (ch.reed ? 0.7 : 1); }
          s.step(dt); prev = s.x;
        }
      }
    },
    pack(rows, cols) {
      list.forEach((ch, ci) => {
        let x = 0, y = 0; const base = ci * cols * 4;
        for (let k = 0; k <= ch.sp.length; k++) {
          const b = ch.sp[Math.min(k, ch.sp.length - 1)].x, ang = ch.reed ? Math.PI / 2 - b : -Math.PI / 2 + b;   // bend toward +x
          const o = base + k * 4; rows[o] = x; rows[o + 1] = y; rows[o + 2] = ang; rows[o + 3] = 0;
          if (k < ch.sp.length) { const a = ch.reed ? Math.PI / 2 - ch.sp[k].x : -Math.PI / 2 + ch.sp[k].x; x += Math.cos(a) * ch.L; y += Math.sin(a) * ch.L; }
        }
              });
    },
    get t() { return t; },
  };
}

// ---- what the strips are: one instance per sprite, in the form far.js's set() takes ----
export const buildSpec = (rig, atlasUrl, list) => {
  const chains = [], inst = [];
  list.forEach((c, ci) => {
    chains.push({ u: (c.rx - rig.cover[0]) / rig.cover[2], v: (c.ry - rig.cover[1]) / rig.cover[3], n: c.def.n, len: c.def.len });
    for (const q of c.def.inst) inst.push({ chain: ci, cell: q.cell, ws: q.ws, reed: c.def.kind === 'reed', mirror: q.mirror, dx: q.dx || 0, dy: q.dy || 0, haze: q.haze, alpha: q.alpha });
  });
  return { atlas: atlasUrl, atlasSize: [ATLAS.w, ATLAS.h], cells: ATLAS.cells, chains, inst };
};
