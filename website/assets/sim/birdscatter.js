// Spiritual [life] birdscatter: the Ultra tier's scatter of the home opening's birds, in the shared PhysX world (assets/sim/life-world.js, in the worker).
// What is PhysX here, and nothing else is claimed:
//   - a small number of rigid spheres, one for each bird that is near the pointer or has been struck by a gust (at most 12), with gravity off: a bird in the air
//     is carried, not dropped;
//   - a kinematic sphere that follows the pointer: a moving body, whose contacts push a bird away with the speed the pointer had;
//   - static boxes laid over every line of words and every button of the opening, so a bird that is pushed is stopped at their edge by the solver;
//   - a D6 joint with a damped position drive for each sphere: the spring that draws a scattered bird home to its place in the formation (regroup), with the
//     formation's own velocity as the drive's velocity, so a bird in formation lags by nothing;
//   - impulses for the startle (a bird the pointer comes at quickly) and for a gust.
// What is not PhysX: the formation (the flocks' paths and the wing beats are assets/sim/birds.js), and the picture (the GPU draws the birds where this puts them).
// The offset of each bird from its place in the formation (the sphere's place minus the formation's) is handed back to birds.js through G.birdsLife.off.
// 100 px is one metre. If this package is dropped (the governor) or the world fails, G.birdsLife.engine goes back to 'spring' and assets/life-birds.js carries on from the very state this left.
const PX = 0.01, MAXP = 12, RSCARE = 150, K_W = 2.5, K_Z = 0.5;   // (the drive: 2.5 rad/s, a little under critical, so it overshoots once and settles in about two seconds)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const READ = 8;

export default async function mount(ctx) {
  const ph = ctx.physics, G = window.SpiritualGPU; if (!ph || !G) return;
  if (/[?&]nowb=1/.test(location.search)) return;
  const bus = ctx.bus;
  // two groups only (the world has twelve in all, shared with every other package): the birds, and what stops them (the boxes over the words and the pointer's body)
  const hits = ph.group('hits', { cap: 12, collide: ['birds'] }), birds = ph.group('birds', { cap: MAXP, collide: ['birds', 'hits'] }), solid = hits, cursor = hits;
  if (!hits || !birds) return;
  const buf = new Float32Array(24 * READ), pose = new Float32Array(8), pr = [0, 0];
  let LB = null, active = false, dropped = false, statics = [], sig = '', cur = null, curPx = [-1e5, -1e5], idle = 0, lastCur = 0, gustAt = 0, nspawned = 0, frames = 0;
  const returning = new Set(), prox = new Map();   // bird index -> { body, joint, ox, oy, t (last time it mattered), cool }
  const own = () => { LB = LB || G.birdsLife; return LB; };
  const h = ctx.budget.register({ id: 'bird-scatter', cost: 'physx', label: 'PhysX', priority: 1,
    drop() { release(); }, restore() { dropped = false; setup(); } });

  const setup = () => {
    if (!own() || dropped) return false;
    if (!cur) cur = cursor.sphere({ pos: [-1e3, -1e3, 0], r: RSCARE * 0.5 * PX, kind: 'kinematic', density: 800 });
    active = !!cur; if (active) LB.engine = 'physx';
    return active;
  };
  const release = () => {
    clearTimeout(layT); layT = 0; dropped = true; active = false; if (LB && LB.engine === 'physx') LB.engine = 'spring';   // (the springs of life-birds.js take over from the state in LB.off)
    for (const p of prox.values()) { try { p.body.remove(); } catch (e) {} } prox.clear();
    for (const b of statics) { try { b.remove(); } catch (e) {} } statics = []; sig = '';
    if (cur) { try { cur.remove(); } catch (e) {} cur = null; }
    hits.clear(); birds.clear();
  };

  // the words and the buttons, as static boxes (rebuilt only when their places change)
  let layT = 0;
  const layout = () => {
    const rects = LB.rects(), s2 = rects.map((r) => r.map(Math.round).join(',')).join(';'); if (s2 === sig || layT) return; sig = s2;
    for (const b of statics) b.remove(); statics = [];
    layT = setTimeout(() => {   // (the old boxes are given back by the world on its next snapshot; the new ones are made after that)
      layT = 0; if (!active || dropped || !LB) return;
      const top = LB.rects().slice().sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1])).slice(0, 10);
      for (const r of top) { const pad = 6, w = (r[2] - r[0]) / 2 + pad, hh = (r[3] - r[1]) / 2 + pad, b = solid.box({ pos: [(r[0] + r[2]) / 2 * PX, -(r[1] + r[3]) / 2 * PX, 0], half: [w * PX, hh * PX, 0.3], kind: 'static' }); if (b) statics.push(b); }
    }, 120);
  };

  // a bird gets a sphere where it is drawn now; the drive holds the sphere to the bird's place in the formation
  const give = (i, fx, fy, vx, vy, span, ox, oy) => {
    let p = prox.get(i); if (p) return p;
    if (prox.size >= MAXP) return null;
    const r = clamp(span * 0.8, 5, 11) * PX, x = fx + ox, y = fy + oy;
    const body = birds.sphere({ pos: [x * PX, -y * PX, 0], r, density: 400, damp: [0.35, 4], sleep: 0, grav: 0, maxV: 5.5, mat: [0.1, 0.1, 0.55] });
    if (!body) return null;
    const joint = birds.joint({ type: 'd6', a: null, b: body, anchorPos: [0, 0, 0], fa: { p: [0, 0, 0] }, fb: { p: [0, 0, 0] }, motion: { x: 'free', y: 'free', z: 'locked', twist: 'locked', swing1: 'locked', swing2: 'locked' },
      drives: [{ axis: 'x', stiffness: K_W * K_W, damping: 2 * K_Z * K_W, accel: true }, { axis: 'y', stiffness: K_W * K_W, damping: 2 * K_Z * K_W, accel: true }], drivePose: { p: [fx * PX, -fy * PX, 0] } });
    p = { body, joint, ox, oy, vx: 0, vy: 0, t: performance.now(), mass: (4 / 3) * Math.PI * r * r * r * 400, r }; prox.set(i, p); nspawned++;
    if (vx || vy) body.impulse([vx * PX * p.mass, -vy * PX * p.mass, 0]);
    return p;
  };
  const startle = (p, dx, dy, speed) => { const m = Math.hypot(dx, dy) || 1; p.body.impulse([dx / m * speed * PX * p.mass, -dy / m * speed * PX * p.mass, 0]); };

  const gust = (g) => {
    if (!active || dropped || !own()) return; gustAt = performance.now();
    const n = LB.read(buf), s = bus.state, pxm = s.inside ? (LB.toHost(s.px, s.py, pr), pr[0]) : 0;
    const idx = []; for (let k = 0; k < n; k++) idx.push(k); idx.sort((a, b) => Math.abs(buf[a * READ + 1] - pxm) - Math.abs(buf[b * READ + 1] - pxm));
    for (const k of idx.slice(0, MAXP)) {
      const j = k * READ, i = buf[j] | 0, fx = buf[j + 1], fy = buf[j + 2], span = buf[j + 5], p = give(i, fx, fy, buf[j + 3], buf[j + 4], span, LB.off[i * 4], LB.off[i * 4 + 1]); if (!p) continue;
      const sd = 0.5 + 0.5 * Math.abs(Math.sin(i * 7.1)), sp = Math.min(300, (170 + 90 * g.strength) * sd * (0.4 + g.strength));
      p.t = performance.now(); startle(p, (g.x || (Math.sin(i * 3.3) > 0 ? 1 : -1) * 0.5) * 3, -1.1 - Math.sin(i * 1.7) * 0.4, sp); LB.pan[i] = Math.max(LB.pan[i], 0.7);
    }
  };

  const frame = (dt, s) => {
    if (!own() || dropped) return; if (!active && !setup()) return;
    const r = LB.host(); if (!r || r.bottom < -40 || r.top > innerHeight + 40) return;
    const now = performance.now(), n = LB.read(buf); if (!n && !prox.size) return;
    h.begin(); frames++;
    layout();
    const ks = LB.ks(), inside = s.inside && (s.type === 'mouse' || s.type === 'pen' || s.type === ''), ps = Math.hypot(s.vx, s.vy);
    let mx = 0, my = 0; if (inside) { LB.toHost(s.px, s.py, pr); mx = pr[0]; my = pr[1]; }
    // the pointer's body: it follows the pointer while the pointer moves, and rests where it is
    if (cur) {
      if (inside && my > -30 && my < r.height + 30) { const ddx = mx - curPx[0], ddy = my - curPx[1], dd = Math.hypot(ddx, ddy); if (dd > 0.5) { if (curPx[0] < -9e4) { curPx[0] = mx; curPx[1] = my; } else { const m = Math.min(1, 1100 * Math.min(dt, 0.05) / dd); curPx[0] += ddx * m; curPx[1] += ddy * m; } cur.moveTo([curPx[0] * PX, -curPx[1] * PX, 0]); lastCur = now; } }   // (the body's own speed is capped at about 1100 px/s: a flick that jumps across the screen does not fire a bird across it)
      else if (curPx[0] > -9e4 && now - lastCur > 150) { curPx[0] = curPx[1] = -1e5; cur.moveTo([-1e3, -1e3, 0]); }
    }
    const R = (RSCARE + clamp(ps * 0.08, 0, 90)) * ks;
    // which birds matter now: one the pointer is near, or already moving away from its place; its sphere is made then and given back when it is home and the pointer far
    for (let k = 0; k < n; k++) {
      const j = k * READ, i = buf[j] | 0, fx = buf[j + 1], fy = buf[j + 2], vx = buf[j + 3], vy = buf[j + 4], span = buf[j + 5];
      let p = prox.get(i);
      const ox = p ? p.ox : LB.off[i * 4], oy = p ? p.oy : LB.off[i * 4 + 1];
      const d = inside ? Math.hypot(fx + ox - mx, fy + oy - my) : 1e9;
      if (!p && inside && d < R * 1.3) p = give(i, fx, fy, vx, vy, span, ox, oy);
      if (!p) continue;
      p.joint && p.joint.set({ drivePose: { p: [fx * PX, -fy * PX, 0] }, driveVel: [vx * PX, -vy * PX, 0] });
      // the startle: the pointer coming at it, or very near, once in a while for each bird
      if (inside && d < R && now - (p.cool || 0) > 700 && (ps > 160 || d < R * 0.45)) { p.cool = now; p.t = now; startle(p, fx + p.ox - mx, fy + p.oy - my, Math.min(260, 110 + 0.14 * ps) * (1 - d / R * 0.6)); LB.pan[i] = Math.max(LB.pan[i], clamp(1 - d / R, 0.5, 1)); }
      if (d < R * 1.3) p.t = now;
      p.fx = fx; p.fy = fy; p.fvx = vx; p.fvy = vy;
    }
    h.end(); h.bodies(prox.size + statics.length + (cur ? 1 : 0));
  };

  // each snapshot: where the spheres are now, and from that how far each bird is from its place (and its speed), handed to birds.js
  ph.onSnapshot(() => {
    if (!active || dropped || !LB) return; const now = performance.now(), dtv = 1 / 60, rects = LB.rects();
    for (const [i, p] of prox) {
      if (!p.body.alive) { prox.delete(i); continue; }
      p.body.pose(pose); const x = pose[0] / PX, y = -pose[1] / PX;
      if (p.fx === undefined) continue;
      const ox = x - p.fx, oy = y - p.fy, o = i * 4, vx = (ox - p.ox) / dtv, vy = (oy - p.oy) / dtv;
      p.ox = ox; p.oy = oy; p.vx += (vx - p.vx) * 0.35; p.vy += (vy - p.vy) * 0.35;
      LB.off[o] = ox; LB.off[o + 1] = oy; LB.off[o + 2] = clamp(p.vx, -500, 500); LB.off[o + 3] = clamp(p.vy, -500, 500);
      const dev = Math.hypot(ox, oy), sp = Math.hypot(p.vx, p.vy);
      // held away from its place for a while (a box of words between it and its formation): it fades out, its sphere is given back, and the bird fades in again in its formation
      if (dev > 50 && Math.hypot(p.vx + (p.fvx || 0), p.vy + (p.fvy || 0)) < 14) p.stuck = (p.stuck || 0) + dtv; else p.stuck = Math.max(0, (p.stuck || 0) - dtv);
      if (p.stuck > 0.9) p.gone = true;
      if (p.gone) { LB.fade[i] = Math.max(0, LB.fade[i] - dtv * 3); if (LB.fade[i] <= 0) { LB.off[o] = LB.off[o + 1] = LB.off[o + 2] = LB.off[o + 3] = 0; LB.pan[i] = 0; try { p.body.remove(); } catch (e) {} prox.delete(i); returning.add(i); } continue; }
      LB.pan[i] = Math.max(clamp(dev / 70, 0, 1) * 0.8, LB.pan[i] * 0.97);
      // home again and the pointer long gone: the sphere is given back (the bird is then simply in its formation)
      if (dev < 1.5 && sp < 8 && now - p.t > 2500) { LB.off[o] = LB.off[o + 1] = LB.off[o + 2] = LB.off[o + 3] = 0; LB.pan[i] = 0; try { p.body.remove(); } catch (e) {} prox.delete(i); }
    }
    for (const i of returning) { LB.fade[i] = Math.min(1, LB.fade[i] + dtv * 1.2); if (LB.fade[i] >= 1) returning.delete(i); }
    void rects;
  });

  const offUse = bus.use({ pointer: true, scroll: true, wheel: true }), offFrame = bus.frame(frame), offGust = bus.on('gust', gust);
  setup();
  const dbg = window.SpiritualLife && window.SpiritualLife.debug; if (dbg) dbg.birdscatter = { proxies: () => prox.size, statics: () => statics.length, active: () => active, spawned: () => nspawned, frames: () => frames, engine: () => (LB && LB.engine) || '', dump: () => Array.from(prox).map(([i, p]) => { p.body.pose(pose); return { i, fx: Math.round(p.fx), fy: Math.round(p.fy), x: Math.round(pose[0] / PX), y: Math.round(-pose[1] / PX), ox: Math.round(p.ox), oy: Math.round(p.oy) }; }), rects: () => statics.length };
  return { dispose() { clearTimeout(layT); offFrame(); offGust(); offUse(); if (LB && LB.engine === 'physx') { LB.engine = 'spring'; } if (dbg) delete dbg.birdscatter; for (const p of prox.values()) { try { p.body.remove(); } catch (e) {} } prox.clear(); try { hits.clear(); birds.clear(); } catch (e) {} } };
}
