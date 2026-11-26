// Spiritual [life] peoplefield: the tethered field under the People constellation. Pure maths: no DOM, no clock, no globals, so it runs
// the same in the page, in a test and in a bench. What it is, honestly: a damped spring network integrated by us (semi-implicit Euler at a
// fixed 1/120 s step, a few steps a frame). It is NOT PhysX. (PhysX was considered for it and measured out: see the people package's
// header in assets/life-people.js.)
//
// Every person is a point mass with a displacement u from the place the sky's own layout gave them (their home, in world units). The sky
// still decides where people stand; this only moves them a little around that. Forces on a person i, per unit of mass:
//   anchor     a spring to their home (or to a cohesion target near it): critically-ish damped, underdamped enough to ring a little
//   threads    each relationship is a damped spring to the other person, stiffer along the thread than across it, so pulling one person
//              stretches their threads and tugs their neighbours, who tug theirs in turn: a wave that decays
//   contact    two medallions that would overlap push apart (a soft spring), so a person dragged through a crowd nudges it aside
//   frame      the camera's own acceleration, as an inertial force on everybody: a flick of the sky leaves the people trailing, then recoiling
//   kicks      impulses (the pointer's wake, a release)
// A dragged person is kinematic: placed by the caller, their velocity read from how they moved, so the threads feel them.
// Nothing here allocates per step. A field in which nothing is moving sleeps and costs nothing until something wakes it.
const TAU = Math.PI * 2;

export const DEFAULTS = {
  homeHz: 1.3,      // the anchor's natural frequency
  homeZeta: 0.24,   // its damping ratio: rings about two cycles and is within a world unit of rest in about a second
  edgeK: 1.15,      // a named thread's stiffness along it, in anchor stiffnesses
  edgeKT: 0.4,      // across it, as a share of the along stiffness
  edgeC: 0.4,      // thread damping, in anchor damping
  contactK: 12,     // contact stiffness, in anchor stiffnesses
  contactGap: 5,    // world units kept between two medallions
  maxU: 150,        // a person is never carried further than this from their home (soft: tanh), world units
  sub: 1 / 120,     // fixed step
  maxSteps: 5,      // per frame
  sleepV: 0.05,     // world units per second below which (with the forces small too) a person is at rest
};

export function createField(n, edges, mass, radius, cfg0) {
  const cfg = Object.assign({}, DEFAULTS, cfg0 || {});
  const ux = new Float32Array(n), uy = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
  const hx = new Float32Array(n), hy = new Float32Array(n);       // homes (the caller writes these each frame)
  const tx = new Float32Array(n), ty = new Float32Array(n);       // where the anchor pulls to, relative to home (cohesion): 0 at rest
  const ax = new Float32Array(n), ay = new Float32Array(n);
  const active = new Uint8Array(n).fill(1);                       // 0: frozen at its home (the governor's first step)
  const m = Float32Array.from(mass), rad = Float32Array.from(radius);
  const E = edges.length, ea = new Int32Array(E), eb = new Int32Array(E), ek = new Float32Array(E), edx = new Float32Array(E), edy = new Float32Array(E), rest = new Float32Array(E), sn = new Float32Array(E);
  for (let e = 0; e < E; e++) { ea[e] = edges[e][0]; eb[e] = edges[e][1]; ek[e] = edges[e][2]; }
  let pairs = new Int32Array(0), np = 0;
  const S = { grab: -1, gx: 0, gy: 0, awake: true, calm: 0, edgesOn: true, contactOn: true, on: true, steps: 0, lastHomeSum: NaN, maxV: 0, maxU: 0, sinceRefresh: 999 };
  const w0 = () => TAU * cfg.homeHz;

  // the directions of the threads and the pairs that could touch, from the current homes: rebuilt when the layout moves (a realm unfolding)
  function refresh() {
    for (let e = 0; e < E; e++) { const dx = hx[eb[e]] - hx[ea[e]], dy = hy[eb[e]] - hy[ea[e]], d = Math.hypot(dx, dy) || 1; edx[e] = dx / d; edy[e] = dy / d; rest[e] = d; }
    const list = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(hx[j] - hx[i], hy[j] - hy[i]);
      if (d < rad[i] + rad[j] + cfg.maxU * 0.55 + 30) list.push(i, j);
    }
    pairs = Int32Array.from(list); np = pairs.length >> 1; S.sinceRefresh = 0;
    let s = 0; for (let i = 0; i < n; i++) s += hx[i] * 1.7 + hy[i]; S.lastHomeSum = s;
  }
  // true when the homes have moved enough that the cached directions are stale (cheap: one pass)
  function homesMoved() {
    let s = 0; for (let i = 0; i < n; i++) s += hx[i] * 1.7 + hy[i];
    return !(Math.abs(s - S.lastHomeSum) < 6);
  }

  // a person follows freely up to 60 per cent of the reach, then the last 40 per cent is a rubber stop (tanh), so a hold feels like holding
  const soft = (x, R) => { const k = R * 0.6; return x <= k ? x : k + (R - k) * Math.tanh((x - k) / (R - k)); };

  function wake() { S.awake = true; S.calm = 0; }

  function substep(dt) {
    const w = w0(), kh = w * w, ch = 2 * cfg.homeZeta * w;
    for (let i = 0; i < n; i++) {
      if (!active[i]) { ax[i] = 0; ay[i] = 0; continue; }
      ax[i] = -kh * (ux[i] - tx[i]) - ch * vx[i] + S.gx;
      ay[i] = -kh * (uy[i] - ty[i]) - ch * vy[i] + S.gy;
    }
    if (S.edgesOn) {
      const cE = cfg.edgeC * ch;
      for (let e = 0; e < E; e++) {
        const a = ea[e], b = eb[e]; const ua = active[a] ? ux[a] : 0, va = active[a] ? uy[a] : 0, ub = active[b] ? ux[b] : 0, vb = active[b] ? uy[b] : 0;
        const dX = ub - ua, dY = vb - va; const dxn = edx[e], dyn = edy[e];
        const al = dX * dxn + dY * dyn, tX = dX - al * dxn, tY = dY - al * dyn;
        const k = kh * cfg.edgeK * ek[e];
        let fx = k * al * dxn + k * cfg.edgeKT * tX, fy = k * al * dyn + k * cfg.edgeKT * tY;
        const rX = (active[b] ? vx[b] : 0) - (active[a] ? vx[a] : 0), rY = (active[b] ? vy[b] : 0) - (active[a] ? vy[a] : 0);
        fx += cE * ek[e] * rX; fy += cE * ek[e] * rY;
        // the lighter of the two moves more: a force on masses m_a and m_b (the anchor stiffness scales with the mass, the thread's does not)
        if (active[a]) { ax[a] += fx / m[a]; ay[a] += fy / m[a]; }
        if (active[b]) { ax[b] -= fx / m[b]; ay[b] -= fy / m[b]; }
      }
    }
    if (S.contactOn) {
      const kc = kh * cfg.contactK, cc = ch * 0.8;
      for (let p = 0; p < np; p++) {
        const i = pairs[p * 2], j = pairs[p * 2 + 1]; if (!active[i] && !active[j]) continue;
        const sx = hx[j] + ux[j] - hx[i] - ux[i], sy = hy[j] + uy[j] - hy[i] - uy[i]; const need = rad[i] + rad[j] + cfg.contactGap;
        if (Math.abs(sx) >= need || Math.abs(sy) >= need) continue;
        const d = Math.hypot(sx, sy); if (d >= need) continue;
        const nx = d > 1e-4 ? sx / d : 1, ny = d > 1e-4 ? sy / d : 0, pen = need - d;
        const rv = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny; const f = kc * pen - (rv < 0 ? cc * rv : 0);   // (it pushes apart; it never pulls)
        if (active[i]) { ax[i] -= f * nx / m[i]; ay[i] -= f * ny / m[i]; }
        if (active[j]) { ax[j] += f * nx / m[j]; ay[j] += f * ny / m[j]; }
      }
    }
    let mv = 0, mu = 0, ma = 0;
    for (let i = 0; i < n; i++) {
      if (!active[i]) { ux[i] *= 0.82; uy[i] *= 0.82; vx[i] = vy[i] = 0; continue; }
      if (i === S.grab) { continue; }   // (a dragged person is placed by the caller, not integrated)
      vx[i] += ax[i] * dt; vy[i] += ay[i] * dt; ux[i] += vx[i] * dt; uy[i] += vy[i] * dt;
      const r = Math.hypot(ux[i], uy[i]); if (r > cfg.maxU * 0.6) { const c = soft(r, cfg.maxU) / r; ux[i] *= c; uy[i] *= c; }
      const sp = Math.abs(vx[i]) + Math.abs(vy[i]); if (sp > mv) mv = sp; const ac = Math.abs(ax[i]) + Math.abs(ay[i]); if (ac > ma) ma = ac; const er = Math.abs(ux[i] - tx[i]) + Math.abs(uy[i] - ty[i]); if (er > mu) mu = er;
    }
    S.maxV = mv; S.maxU = mu; S.maxA = ma;
  }

  // advance by dt seconds of real time (the frame's): a few fixed steps. Returns false when the field is asleep (nothing was done).
  function step(dt) {
    if (!S.on) return false;
    if (!S.awake && !(S.grab >= 0)) return false;
    if (S.sinceRefresh > 20 && homesMoved()) refresh(); else S.sinceRefresh++;
    let acc = Math.min(dt, 0.05) + (S.rest || 0), k = 0; const h = cfg.sub;
    while (acc >= h && k < cfg.maxSteps) { substep(h); acc -= h; k++; S.steps++; }
    S.rest = k >= cfg.maxSteps ? 0 : acc;
    // asleep when nothing moves and nothing pulls: not while a person is held
    if (S.grab < 0 && S.maxV < cfg.sleepV && S.maxU < 0.04 && Math.abs(S.gx) + Math.abs(S.gy) < 1) { if (++S.calm > 12) S.awake = false; } else S.calm = 0;
    for (let e = 0; e < E; e++) { const a = ea[e], b = eb[e]; const dX = ux[b] - ux[a], dY = uy[b] - uy[a]; sn[e] = (dX * edx[e] + dY * edy[e]) / rest[e]; }
    return true;
  }

  const api = {
    n, E, cfg, ux, uy, vx, vy, hx, hy, tx, ty, active, sn, rest, ea, eb, S,
    refresh, step, wake,
    get awake() { return S.awake || S.grab >= 0; },
    set on(v) { S.on = !!v; if (!v) { ux.fill(0); uy.fill(0); vx.fill(0); vy.fill(0); sn.fill(0); S.awake = false; S.grab = -1; } else wake(); },
    get on() { return S.on; },
    set edgesOn(v) { S.edgesOn = !!v; wake(); }, get edgesOn() { return S.edgesOn; },
    set contactOn(v) { S.contactOn = !!v; wake(); }, get contactOn() { return S.contactOn; },
    // the frame of reference accelerates (the camera): everybody is pushed the other way
    setFrameAccel(x, y) { if (x !== S.gx || y !== S.gy) { S.gx = x; S.gy = y; if (Math.abs(x) + Math.abs(y) > 0.5) wake(); } },
    setTarget(i, x, y) { if (Math.abs(tx[i] - x) + Math.abs(ty[i] - y) > 0.03) { tx[i] = x; ty[i] = y; wake(); } },
    kick(i, dvx, dvy) { if (!active[i]) return; vx[i] += dvx; vy[i] += dvy; wake(); },
    grab(i) { S.grab = i; wake(); },
    // the dragged person is placed (a displacement from home), and their velocity is what the placement implies
    dragTo(i, x, y, dt) {
      const r = Math.hypot(x, y), c = r > 1e-6 ? soft(r, cfg.maxU) / r : 1, nx = x * c, ny = y * c;
      if (dt > 0) { vx[i] = (nx - ux[i]) / dt; vy[i] = (ny - uy[i]) / dt; } ux[i] = nx; uy[i] = ny; active[i] = 1; wake();
    },
    release(i, wx, wy) { if (S.grab === i) S.grab = -1; const sp = Math.hypot(wx, wy), cap = 900; const c = sp > cap ? cap / sp : 1; vx[i] = wx * c; vy[i] = wy * c; wake(); },
    get grabbed() { return S.grab; },
    stats() { return { awake: api.awake, maxV: +S.maxV.toFixed(3), maxErr: +S.maxU.toFixed(3), steps: S.steps, edges: E, pairs: np, nodes: n }; },
  };
  return api;
}
