// Character select, physics (motion-select.css). Progressive: the select is whole and works without this script, and
// cinema.js still does all the choosing; this only moves things. Transform and opacity only, never layout.
// Under a fine pointer (a mouse or trackpad):
//   - every tile is a small critically damped spring (position, tilt, scale): the one in hand is pulled toward the hand
//     and tilts under it with inertia; its neighbours are pushed apart, and a choice sends one bump outward through the
//     wall, each tile a little later than the one before it, like a wave
//   - a rim light and a sheen follow the hand across the tile in hand
//   - the painting and the figure behind the wall lean on springs, and each new character arrives with a soft dolly
//   - a few gold motes drift off the hand, carried by how fast it moves (more on Ultra, none when effects are off)
// Keyboard focus gets the same light, held still. Touch: only a press. Reduced motion, Light mode and print: nothing.
// One requestAnimationFrame loop, running only while something is still moving and the select is on screen.
// [life-select] No pointer handler reads the page's geometry any more: a handler only keeps where the pointer is; the loop, at the start of
// its frame and before it writes anything, takes the section's and the tiles' boxes (from life-select's cache when that package is running,
// else one read) and only then moves things. will-change is held by the tiles in motion only, not by the whole wall. When the budget governor
// drops an effect, html[data-ls-drop] lists it (tilt, lean, dolly, in that order): without tilt the tiles are left to CSS (the chosen one
// rises and scales 1.07 on a spring curve, no script), without lean the painting and the figure go back to CSS, without dolly a new
// character arrives without the push-in.
(() => {
  const d = document, root = d.documentElement;
  const sel = d.querySelector('main.cx-home .cx-select[data-select]');
  const grid = sel && sel.querySelector('[data-sel-grid]');
  if (!grid) return;
  const mqR = matchMedia('(prefers-reduced-motion: reduce)');
  const mqF = matchMedia('(hover: hover) and (pointer: fine)');
  const calm = () => root.dataset.motion === 'reduce' || root.dataset.motion === 'light' || !!root.dataset.light || mqR.matches;
  const fine = () => mqF.matches && !calm();
  const fxLevel = () => { const f = root.dataset.fx; return root.classList.contains('ep-lite') || f === 'off' ? 0 : f === 'ultra' ? 3 : f === 'balanced' ? 1 : 2; };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const now = () => performance.now();
  const dropped = (k) => { const v = root.dataset.lsDrop; return !!v && (' ' + v + ' ').includes(' ' + k + ' '); };
  const LSX = () => window.LifeSelect || null;

  /* ---------- touch: a press, nothing else ---------- */
  grid.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || calm()) return;
    const t = e.target.closest && e.target.closest('.cx-sel-tile'); if (!t) return;
    t.classList.add('ms-press');
    const up = () => { t.classList.remove('ms-press'); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }, { passive: true });

  /* ---------- the springs ---------- */
  // a critically damped spring: x'' = k (target - x) - 2 sqrt(k) x', stepped at 120 Hz or finer (stable for any frame rate)
  const K = { p: 230, r: 150, s: 260, par: 70, dolly: 34, hero: 95 };
  const C = {}; for (const k in K) C[k] = 2 * Math.sqrt(K[k]);
  const step = (o, key, t, k, c, dt) => { const v = o['v' + key] + (k * (t - o[key]) - c * o['v' + key]) * dt; o['v' + key] = v; o[key] += v * dt; };
  const still = (o, key, t, eps) => Math.abs(o[key] - t) < eps && Math.abs(o['v' + key]) < eps * 4;

  const tiles = [...grid.querySelectorAll('.cx-sel-tile')];
  const S = tiles.map((el) => ({ el, x: 0, vx: 0, y: 0, vy: 0, rx: 0, vrx: 0, ry: 0, vry: 0, s: 1, vs: 0, cx: 0, cy: 0, w: 0, h: 0, on: false, hot: false, vis: false, done: false, wx: 0, wy: 0, wrx: 0, wry: 0, ws: 1 }));
  const index = new Map(tiles.map((t, i) => [t, i]));
  let base = '';                                   // the tile's own transform (its slant), kept after ours
  let pitchX = 120, pitchY = 80, gridL = 0, gridT = 0, selL = 0, selT = 0, selW = 0, selH = 0, dirty = true, stale = true;
  // where the wall and the section sit on screen: read once after a scroll or a change, never on every move (a read after
  // the springs have written would make the browser restyle the page in the middle of the hand's own events)
  const place = () => {
    const c = LSX(), cr = c && c.rects && c.rects();   // life-select's cached boxes (kept in page coordinates, shifted by the live scroll): no layout read
    if (cr) { gridL = cr.grid.left; gridT = cr.grid.top; selL = cr.sel.left; selT = cr.sel.top; selW = cr.sel.width; selH = cr.sel.height; stale = false; return; }
    const g = grid.getBoundingClientRect(), r = sel.getBoundingClientRect(); gridL = g.left; gridT = g.top; selL = r.left; selT = r.top; selW = r.width; selH = r.height; stale = false;
  };
  const measure = () => {
    place(); const g = { left: gridL, top: gridT }; dirty = false;
    let first = null, second = null, below = null;
    for (const o of S) {
      const li = o.el.parentElement; o.vis = !li.hidden && li.offsetParent !== null;
      if (!o.vis) continue;
      const r = li.getBoundingClientRect(); o.cx = r.left + r.width / 2 - g.left; o.cy = r.top + r.height / 2 - g.top; o.w = r.width; o.h = r.height;
      if (!first) first = o; else if (!second && Math.abs(o.cy - first.cy) < 2) second = o; else if (!below && o.cy - first.cy > 2) below = o;
    }
    if (first && second) pitchX = Math.max(20, second.cx - first.cx); else if (first) pitchX = first.w + 8;
    if (first && below) pitchY = Math.max(20, below.cy - first.cy); else if (first) pitchY = first.h + 8;
    if (cv) sizeCanvas();
    if (!base && tiles[0]) { const tf = getComputedStyle(tiles[0]).transform; base = tf && tf !== 'none' ? ' ' + tf : ''; }
  };
  new MutationObserver(() => { dirty = true; }).observe(grid, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', () => { dirty = true; }, { passive: true });
  addEventListener('scroll', () => { stale = true; }, { passive: true });

  /* ---------- pointer state ---------- */
  let px = 0, py = 0, rawX = 0, rawY = 0, inGrid = false, hand = -1, lastHand = -1, live = false, msOn = false, kick = -1;   // rawX/rawY: the pointer in the window; px/py, sx/sy are taken from them in the frame, after the boxes are read
  let sx = 0, sy = 0, inSel = false, pvx = 0, pvy = 0, lastMove = 0, lastT = 0, lastX = 0, lastY = 0;
  const waves = [];                                // pending bumps: { i, at, ix, iy }
  const kickWave = (h) => {
    const o = S[h]; const t0 = now();
    for (let j = 0; j < S.length; j++) {
      const q = S[j]; if (j === h || !q.vis) continue;
      const dx = (q.cx - o.cx) / pitchX, dy = (q.cy - o.cy) / pitchY, u = Math.hypot(dx, dy);
      if (u > 3.6) continue;
      const len = u || 1, a = Math.exp(-u * .62);
      waves.push({ i: j, at: t0 + u * 52, ix: (dx / len) * 150 * a, iy: (dy / len) * 110 * a, is: -.55 * a });
    }
  };

  // will-change is held by the tiles that are about to move (the one in hand and the ring around it) and let go when each has settled
  const heat = (h) => {
    const o = S[h];
    for (const q of S) { if (!q.vis || q.hot) continue; const dx = (q.cx - o.cx) / pitchX, dy = (q.cy - o.cy) / pitchY; if (Math.hypot(dx, dy) < 2.9) { q.hot = true; q.el.classList.add('ms-hot'); } }
  };
  const cool = (o) => { if (o.hot) { o.hot = false; o.el.classList.remove('ms-hot'); } };

  /* ---------- the light on the tile in hand: two layers, so the one left behind can fade ---------- */
  const mkFx = () => {
    const f = d.createElement('span'); f.className = 'ms-fx'; f.setAttribute('aria-hidden', 'true');
    const sh = d.createElement('span'); sh.className = 'ms-sheen';
    const rim = d.createElement('span'); rim.className = 'ms-rim'; const g = d.createElement('span'); g.className = 'ms-rim-g'; rim.append(g);
    f.append(rim, sh); return { f, sh, g, tile: null, lx: 0, ly: 0, ang: 0, w: 0, h: 0, bye: 0 };
  };
  const pool = [mkFx(), mkFx()]; let lit = null;
  const light = (tile, kb) => {
    if (lit && lit.tile === tile) { lit.f.classList.toggle('is-kb', !!kb); return lit; }
    if (lit) { const old = lit; old.f.classList.remove('is-in'); clearTimeout(old.bye); old.bye = setTimeout(() => { if (old !== lit) { old.f.remove(); old.tile = null; } }, 320); }
    const L = pool[0] === lit ? pool[1] : pool[0]; clearTimeout(L.bye);
    const o = S[index.get(tile)]; L.tile = tile; L.w = o.w || 100; L.h = o.h || 70; L.lx = L.w / 2; L.ly = L.h * .38; L.ang = 0;
    L.f.style.setProperty('--ms-sw', Math.round(Math.max(L.w, L.h) * 1.6) + 'px');
    L.f.style.setProperty('--ms-rd', Math.round(Math.hypot(L.w, L.h) * 1.2) + 'px');
    L.f.classList.toggle('is-kb', !!kb); L.f.classList.remove('is-in'); L.f.classList.add('is-in'); tile.append(L.f);
    paintFx(L); lit = L; return L;
  };
  const unlight = () => { if (!lit) return; const old = lit; lit = null; old.f.classList.remove('is-in'); clearTimeout(old.bye); old.bye = setTimeout(() => { if (old !== lit) { old.f.remove(); old.tile = null; } }, 320); };
  const paintFx = (L) => { L.sh.style.transform = `translate3d(${L.lx.toFixed(1)}px, ${L.ly.toFixed(1)}px, 0)`; L.g.style.transform = `rotate(${L.ang.toFixed(1)}deg)`; };

  /* ---------- the stage: painting and figure on springs ---------- */
  const bg = sel.querySelector('.cx-sel-bg'), hero = sel.querySelector(':scope > .cx-sel-hero');
  const P = { bx: 0, vbx: 0, by: 0, vby: 0, hx: 0, vhx: 0, hy: 0, vhy: 0, z: 0, vz: 0, k: 0, vk: 0 };
  let parOn = false;
  const parStart = () => { if (parOn) return; parOn = true; sel.classList.add('ms-par'); };
  const parStop = () => { if (!parOn) return; parOn = false; sel.classList.remove('ms-par'); if (bg) bg.style.transform = ''; if (hero) hero.style.transform = ''; for (const k in P) P[k] = 0; };
  // a new character: the painting breathes in a little and settles, the figure slides in from the side the hand travelled
  let lastPicked = tiles.findIndex((t) => t.classList.contains('is-on'));
  new MutationObserver(() => {
    const i = tiles.findIndex((t) => t.classList.contains('is-on'));
    if (i < 0 || i === lastPicked) return;
    const from = lastPicked; lastPicked = i;
    if (!parOn) return;
    if (dropped('dolly')) return;
    P.z = Math.max(P.z, .028); P.vz = 0;
    const dir = from >= 0 && S[from].vis && S[i].vis ? Math.sign(S[i].cx - S[from].cx) : 0;
    P.hx += dir * 22; P.vhx = 0; wake();
  }).observe(grid, { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- motes ---------- */
  let cv = null, cx2 = null, sprite = null, cw = 0, ch = 0, dpr = 1; const motes = [];
  const ensureCanvas = () => {
    if (cv) return true; if (!fxLevel()) return false;
    cv = d.createElement('canvas'); cv.className = 'ms-motes'; cv.setAttribute('aria-hidden', 'true');
    cx2 = cv.getContext('2d'); if (!cx2) { cv = null; return false; }
    sprite = d.createElement('canvas'); sprite.width = sprite.height = 32; const s = sprite.getContext('2d');
    const gr = s.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,246,222,1)'); gr.addColorStop(.25, 'rgba(255,214,140,.75)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    s.fillStyle = gr; s.fillRect(0, 0, 32, 32);
    sel.append(cv); sizeCanvas(); return true;
  };
  const sizeCanvas = () => {
    if (!cv) return; const r = Math.min(devicePixelRatio || 1, fxLevel() >= 3 ? 1.5 : 1);
    const W = Math.round(selW || sel.clientWidth), H = Math.round(selH || sel.clientHeight);
    if (r === dpr && cw === W && ch === H && cv.width) return;
    dpr = r; cw = W; ch = H; drawn = false; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  };
  addEventListener('resize', () => { if (cv) sizeCanvas(); }, { passive: true });
  const cap = () => [0, 18, 48, 110][fxLevel()];
  let spawnDebt = 0, drawn = false, glowX = 0, glowY = 0, glowA = 0;
  const spawn = (dt) => {
    const lv = fxLevel(); if (!lv || !inSel) return;
    const sp = Math.hypot(pvx, pvy); if (sp < 90) return;
    spawnDebt += sp * dt * [0, .012, .03, .065][lv];
    while (spawnDebt >= 1 && motes.length < cap()) {
      spawnDebt -= 1; const life = .8 + Math.random() * .9;
      motes.push({ x: sx + (Math.random() - .5) * 12, y: sy + (Math.random() - .5) * 12, vx: pvx * .16 + (Math.random() - .5) * 40, vy: pvy * .16 - 18 - Math.random() * 34,
        r: .8 + Math.random() * (lv >= 3 ? 2.2 : 1.5), life, age: 0, tw: Math.random() * 6.28 });
    }
    if (spawnDebt > 3) spawnDebt = 3;
  };
  const drawMotes = (dt) => {
    if (!cv) return false;
    const lv = fxLevel(); const ultra = lv >= 3;
    // the hand's own light on Ultra: a wide, faint glow that follows it on a spring
    let glowMoving = false;
    if (ultra) {
      const want = inSel ? .11 : 0; glowMoving = Math.abs(want - glowA) > .002 || Math.abs(sx - glowX) + Math.abs(sy - glowY) > .6;
      glowA += (want - glowA) * (1 - Math.exp(-dt * 6)); const f = 1 - Math.exp(-dt * 10); glowX += (sx - glowX) * f; glowY += (sy - glowY) * f;
    } else glowA = 0;
    if (!motes.length && glowA < .004) { if (drawn) { cx2.setTransform(1, 0, 0, 1, 0, 0); cx2.clearRect(0, 0, cv.width, cv.height); drawn = false; } return false; }
    if (!motes.length && !glowMoving && drawn) return false;   // a resting glow stays as drawn: nothing to redraw
    cx2.setTransform(dpr, 0, 0, dpr, 0, 0); cx2.clearRect(0, 0, cw, ch); cx2.globalCompositeOperation = 'lighter';
    if (ultra && glowA >= .004) { cx2.globalAlpha = glowA; const R = 240; cx2.drawImage(sprite, glowX - R, glowY - R, R * 2, R * 2); }
    const drag = Math.exp(-dt * 1.7);
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]; m.age += dt; if (m.age >= m.life) { motes[i] = motes[motes.length - 1]; motes.pop(); continue; }
      // carried by the hand's speed nearby, rising like ash in warm air
      const dx = m.x - sx, dy = m.y - sy, near = inSel ? Math.exp(-(dx * dx + dy * dy) / (2 * 120 * 120)) : 0;
      m.vx = m.vx * drag + pvx * near * dt * 1.4; m.vy = m.vy * drag + pvy * near * dt * 1.4 - 16 * dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
      const t = m.age / m.life, a = Math.sin(Math.PI * t) * (.62 + .38 * Math.sin(m.tw + m.age * 9));
      cx2.globalAlpha = clamp(a, 0, 1); const R = m.r * 4; cx2.drawImage(sprite, m.x - R, m.y - R, R * 2, R * 2);
    }
    cx2.globalAlpha = 1; cx2.globalCompositeOperation = 'source-over'; drawn = true; return motes.length > 0 || glowMoving;
  };

  /* ---------- the loop ---------- */
  let raf = 0, prevT = 0, onScreen = false;
  const wake = () => { if (!raf && onScreen && !d.hidden && !calm()) { prevT = 0; raf = requestAnimationFrame(frame); } };
  const frame = (t) => {
    raf = 0; if (!onScreen || d.hidden || calm()) { reset(); return; }
    const dt = prevT ? Math.min(.05, (t - prevT) / 1000) : 1 / 60; prevT = t;
    if (dirty) measure(); else if (stale) place();     // the frame's one read, before any write
    px = rawX - gridL; py = rawY - gridT; sx = rawX - selL; sy = rawY - selT;
    if (kick >= 0) { const k = kick; kick = -1; if (S[k] && S[k].vis) { kickWave(k); heat(k); } }
    // the hand's speed fades once it stops reporting
    if (now() - lastMove > 60) { const f = Math.exp(-dt * 9); pvx *= f; pvy *= f; }
    let busy = false;
    const T = now();
    for (let w = waves.length - 1; w >= 0; w--) { const q = waves[w]; if (q.at > T) { busy = true; continue; } const o = S[q.i]; o.vx += q.ix; o.vy += q.iy; o.vs += q.is; o.on = true; waves[w] = waves[waves.length - 1]; waves.pop(); busy = true; }
    const h = inGrid && hand >= 0 && S[hand].vis ? S[hand] : null;
    let nx = 0, ny = 0;
    if (h) { nx = clamp((px - h.cx) / (h.w / 2), -1, 1); ny = clamp((py - h.cy) / (h.h / 2), -1, 1); }
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), sdt = dt / n;
    for (const o of S) {
      if (!o.vis) continue;
      let tx = 0, ty = 0, trx = 0, tr_y = 0, ts = 1;
      if (h) {
        if (o === h) { tx = nx * 6; ty = ny * 4 - 4; trx = -ny * 10 + clamp(-pvy * .004, -4, 4); tr_y = nx * 12 + clamp(pvx * .004, -5, 5); ts = 1.075; }
        else {
          const dx = (o.cx - h.cx) / pitchX, dy = (o.cy - h.cy) / pitchY, u = Math.hypot(dx, dy);
          if (u < 2.9) { const f = Math.exp(-(u * u) / 2.4), len = u || 1; tx = (dx / len) * 7 * f; ty = (dy / len) * 5 * f; tr_y = (dx / len) * 5 * f; trx = -(dy / len) * 4 * f; ts = 1 - .035 * f; }
        }
      }
      if (!o.on && tx === 0 && ty === 0 && ts === 1 && trx === 0 && tr_y === 0) { cool(o); continue; }
      for (let s = 0; s < n; s++) {
        step(o, 'x', tx, K.p, C.p, sdt); step(o, 'y', ty, K.p, C.p, sdt);
        step(o, 'rx', trx, K.r, C.r, sdt); step(o, 'ry', tr_y, K.r, C.r, sdt); step(o, 's', ts, K.s, C.s, sdt);
      }
      const settled = still(o, 'x', tx, .02) && still(o, 'y', ty, .02) && still(o, 'rx', trx, .02) && still(o, 'ry', tr_y, .02) && still(o, 's', ts, .0005);
      if (settled && tx === 0 && ty === 0 && trx === 0 && tr_y === 0 && ts === 1) { o.x = o.y = o.rx = o.ry = o.vx = o.vy = o.vrx = o.vry = o.vs = 0; o.s = 1; o.on = false; o.done = false; o.wx = o.wy = o.wrx = o.wry = 0; o.ws = 1; o.el.style.transform = ''; cool(o); continue; }
      o.on = true; if (!o.hot) { o.hot = true; o.el.classList.add('ms-hot'); } if (!settled) busy = true; else if (o.done) continue;
      o.done = settled;
      // a change too small to see is not written (each write restyles the tile)
      if (!settled && Math.abs(o.x - o.wx) < .04 && Math.abs(o.y - o.wy) < .04 && Math.abs(o.rx - o.wrx) < .04 && Math.abs(o.ry - o.wry) < .04 && Math.abs(o.s - o.ws) < .0006) continue;
      o.wx = o.x; o.wy = o.y; o.wrx = o.rx; o.wry = o.ry; o.ws = o.s;
      o.el.style.transform = `perspective(640px) translate3d(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px, 0) rotateX(${o.rx.toFixed(2)}deg) rotateY(${o.ry.toFixed(2)}deg) scale(${o.s.toFixed(4)})${base}`;
    }
    // the light follows the hand inside the tile, the rim turns toward it
    if (lit && h && lit.tile === h.el && !lit.f.classList.contains('is-kb')) {
      const lx = (nx + 1) / 2 * lit.w, ly = (ny + 1) / 2 * lit.h, f = 1 - Math.exp(-dt * 22);
      const ang = Math.atan2(nx * lit.w, -ny * lit.h) * 180 / Math.PI; let da = ((ang - lit.ang + 540) % 360) - 180;
      if (Math.abs(nx) + Math.abs(ny) < .08) da = 0;
      const mv = Math.abs(lx - lit.lx) + Math.abs(ly - lit.ly) + Math.abs(da);
      lit.lx += (lx - lit.lx) * f; lit.ly += (ly - lit.ly) * f; lit.ang += da * f; paintFx(lit); if (mv > .3) busy = true;
    }
    // the stage
    if (parOn) {
      const ax = inSel ? clamp(sx / (selW || 1) - .5, -.5, .5) : 0, ay = inSel ? clamp(sy / Math.min(innerHeight, selH || 1) - .5, -.5, .5) : 0;
      for (let s = 0; s < n; s++) {
        step(P, 'bx', -ax * 18, K.par, C.par, sdt); step(P, 'by', -ay * 10, K.par, C.par, sdt);
        step(P, 'hx', ax * 22, K.hero, C.hero, sdt); step(P, 'hy', ay * 9, K.hero, C.hero, sdt); step(P, 'z', 0, K.dolly, C.dolly, sdt);
      }
      if (bg) bg.style.transform = `translate3d(${P.bx.toFixed(2)}px, ${P.by.toFixed(2)}px, 0) scale(${(1.012 + P.z).toFixed(4)})`;
      if (hero) hero.style.transform = `translate3d(${P.hx.toFixed(2)}px, ${P.hy.toFixed(2)}px, 0) scale(${(1 + P.z * .5).toFixed(4)})`;
      if (!(still(P, 'bx', -ax * 18, .02) && still(P, 'by', -ay * 10, .02) && still(P, 'hx', ax * 22, .02) && still(P, 'hy', ay * 9, .02) && still(P, 'z', 0, .0003))) busy = true;
    }
    spawn(dt); if (drawMotes(dt)) busy = true;
    if (busy) raf = requestAnimationFrame(frame);
  };
  const reset = () => {
    cancelAnimationFrame(raf); raf = 0; waves.length = 0; motes.length = 0;
    for (const o of S) { if (o.on || o.el.style.transform) { o.el.style.transform = ''; } cool(o); o.x = o.y = o.rx = o.ry = o.vx = o.vy = o.vrx = o.vry = o.vs = 0; o.s = 1; o.on = false; }
    if (cv && drawn) { cx2.setTransform(1, 0, 0, 1, 0, 0); cx2.clearRect(0, 0, cv.width, cv.height); drawn = false; }
    glowA = 0; unlight(); parStop(); live = false; msOn = false; sel.classList.remove('ms-live'); root.classList.remove('ms-on');
  };

  /* ---------- events ---------- */
  const track = (e) => {
    const t = e.timeStamp || now(); rawX = e.clientX; rawY = e.clientY;
    if (lastT && t > lastT) { const k = Math.min(1, (t - lastT) / 40); pvx += ((e.clientX - lastX) / ((t - lastT) / 1000) - pvx) * k; pvy += ((e.clientY - lastY) / ((t - lastT) / 1000) - pvy) * k; }
    pvx = clamp(pvx, -4000, 4000); pvy = clamp(pvy, -4000, 4000);
    lastT = t; lastX = e.clientX; lastY = e.clientY; lastMove = now();
  };
  sel.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine()) return;
    if (!msOn) { msOn = true; root.classList.add('ms-on'); } inSel = true; track(e); if (!dropped('lean')) parStart(); ensureCanvas(); wake();
  }, { passive: true });
  sel.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; inSel = false; lastT = 0; wake(); });
  grid.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine() || dropped('tilt')) return;
    rawX = e.clientX; rawY = e.clientY;      // (no layout read here: the frame takes the boxes)
    inGrid = true; if (!live) { live = true; sel.classList.add('ms-live'); }
    const t = e.target.closest && e.target.closest('.cx-sel-tile'); const i = t ? index.get(t) : undefined;
    if (i !== undefined && i !== hand) { hand = i; if (i !== lastHand) { lastHand = i; kick = i; } light(t, false); }
    else if (i === undefined && hand >= 0) { hand = -1; }
    wake();
  }, { passive: true });
  grid.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; inGrid = false; hand = -1; lastHand = -1; unlight(); live = false; sel.classList.remove('ms-live'); wake(); });
  // keyboard: the same light on the focused tile, held still (no springs move)
  grid.addEventListener('focusin', (e) => {
    const t = e.target.closest && e.target.closest('.cx-sel-tile'); if (!t || calm()) return;
    let kb = false; try { kb = t.matches(':focus-visible'); } catch {} if (!kb || inGrid) return;
    const L = light(t, true); L.lx = L.w / 2; L.ly = L.h * .38; L.ang = 0; paintFx(L);
  });
  grid.addEventListener('focusout', () => { if (!inGrid) unlight(); });

  // only while the select is on screen
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; if (onScreen) { dirty = true; } else reset(); }).observe(sel);
  else onScreen = true;
  d.addEventListener('visibilitychange', () => { if (d.hidden) reset(); });
  // motion put to rest (the site's switch, Light mode, the system setting): everything returns to its place at once
  const rest = () => { if (calm()) reset(); };
  new MutationObserver(rest).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-light'] });
  try { mqR.addEventListener('change', rest); mqF.addEventListener('change', () => { if (!mqF.matches) reset(); }); } catch {}
  // the budget governor (life-select.js) lists what it has dropped in html[data-ls-drop]: apply it at once, and again when it is restored
  new MutationObserver(() => {
    if (dropped('tilt')) { waves.length = 0; kick = -1; inGrid = false; hand = -1; lastHand = -1; unlight(); live = false; sel.classList.remove('ms-live'); wake(); }
    if (dropped('lean')) parStop();
  }).observe(root, { attributes: true, attributeFilter: ['data-ls-drop'] });
  let lvSeen = fxLevel();
  new MutationObserver(() => { const lv = fxLevel(); if (lv === lvSeen) return; lvSeen = lv; if (!lv && cv) { motes.length = 0; if (drawn) { cx2.setTransform(1, 0, 0, 1, 0, 0); cx2.clearRect(0, 0, cv.width, cv.height); drawn = false; } } else if (cv) sizeCanvas(); }).observe(root, { attributes: true, attributeFilter: ['data-fx', 'class'] });
})();
