const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SPRING_W = 2.5, SPRING_Z = 0.55;   // the pull toward the formation: about 2.5 rad/s, a little under critical, so a bird overshoots once and settles (about 2 s)
const READ_STRIDE = 8, MAXB = 24;
export default function mount(ctx) {
if (/[?&]nowb=1/.test(location.search)) return;   // (the bench's baseline: the same page with this package not mounted)
const G = window.SpiritualGPU, R = document.documentElement;
let css = null;
const sync = () => { const want = R.dataset.fxBirds !== '1' && (!ctx.caps.webgl || gpu.dropped()); if (want && !css) css = cssBirds(ctx); else if (!want && css) { css.stop(); css = null; } };   // (on Rich and Ultra the CSS flock waits until the governor has dropped the GPU flocks)
const gpu = gpuBirds(ctx, G, () => setTimeout(sync, 900));
const mo = new MutationObserver(sync); mo.observe(R, { attributes: true, attributeFilter: ['data-fx-birds'] });
sync();
return { dispose() { mo.disconnect(); gpu.stop(); if (css) { css.stop(); css = null; } } };
}
function gpuBirds(ctx, G, onChange) {
const bus = ctx.bus; let LB = null, offUse = null, offFrame = null, offGust = null, offDown = null;
const buf = new Float32Array(MAXB * READ_STRIDE), pr = [0, 0], seed = new Float32Array(MAXB).map((_, i) => 0.5 + 0.5 * Math.sin(i * 12.9898));
let dropped = false, cool = new Float32Array(MAXB), stuck = new Float32Array(MAXB), gone = new Uint8Array(MAXB);
let h = null;   // (registered with the governor once the flocks exist: on a phone, or with no WebGL2, there is nothing here to drop)
const reg = () => { if (!h) h = ctx.budget.register({ id: 'birds', cost: 'webgl', label: 'spring/ODE', priority: 2,
drop() { dropped = true; if (LB) { LB.disabled = true; LB.off.fill(0); LB.pan.fill(0); } onChange(); },
restore() { dropped = false; if (LB) LB.disabled = false; onChange(); } }); };
const gust = (g) => {
if (!LB || dropped || LB.engine === 'physx') return;
for (let i = 0; i < MAXB; i++) {
const s = seed[i], k = (0.5 + s) * g.strength, dx = (g.x || (Math.random() < 0.5 ? -1 : 1) * 0.4) * 190 * k, dy = -(40 + 90 * s) * k;
const o = i * 4; LB.off[o + 2] += dx; LB.off[o + 3] += dy; LB.pan[i] = Math.max(LB.pan[i], 0.6 + 0.4 * g.strength);
}
};
const frame = (dt, s) => {
if (!LB) { LB = G && G.birdsLife; if (!LB) return; reg(); }
if (dropped || LB.disabled || LB.engine === 'physx') { return; }
const r = LB.host(); if (!r || r.bottom < -40 || r.top > innerHeight + 40) return;   // (the opening is not on screen: nothing to do)
const live = LB.read(buf); if (!live) return;
const d = Math.min(dt, 0.05), ks = LB.ks(), inside = s.inside && (s.type === 'mouse' || s.type === 'pen' || s.type === '');
let mx = 0, my = 0; if (inside) { LB.toHost(s.px, s.py, pr); mx = pr[0]; my = pr[1]; }
const ps = Math.hypot(s.vx, s.vy), R = (150 + clamp(ps * 0.09, 0, 120)) * ks;
const w = SPRING_W, c = 2 * SPRING_Z * w, off = LB.off, pan = LB.pan, rects = LB.rects();
for (let n = 0; n < live; n++) {
const j = n * READ_STRIDE, i = buf[j] | 0, fx = buf[j + 1], fy = buf[j + 2], o = i * 4;
if (gone[i]) { LB.fade[i] = Math.max(0, LB.fade[i] - d * 3); if (LB.fade[i] <= 0) { off[o] = off[o + 1] = off[o + 2] = off[o + 3] = 0; pan[i] = 0; gone[i] = 0; stuck[i] = 0; } continue; }
if (LB.fade[i] < 1) LB.fade[i] = Math.min(1, LB.fade[i] + d * 1.2);
let ox = off[o], oy = off[o + 1], vx = off[o + 2], vy = off[o + 3];
let ax = -w * w * ox - c * vx, ay = -w * w * oy - c * vy;
if (inside) {
const dx = fx + ox - mx, dy = fy + oy - my, dd = Math.hypot(dx, dy) || 1;
if (dd < R) {
const k = 1 - dd / R, push = k * k * (700 + 1.1 * ps) * (0.8 + 0.4 * seed[i]);
ax += dx / dd * push; ay += dy / dd * push - k * 60;   // (away, and a little up: a startled bird climbs)
if (cool[i] <= 0 && k > 0.25) { cool[i] = 0.7; const kick = 90 + 0.12 * ps; vx += dx / dd * kick; vy += dy / dd * kick - 40; }   // the startle: one quick burst
pan[i] = Math.max(pan[i], clamp(k * 1.8, 0, 1));
}
}
cool[i] = Math.max(0, cool[i] - d);
vx += ax * d; vy += ay * d;
const sp = Math.hypot(vx, vy); if (sp > 420) { vx *= 420 / sp; vy *= 420 / sp; }
ox += vx * d; oy += vy * d;
const x = fx + ox, y = fy + oy;
for (let q = 0; q < rects.length; q++) {
const b = rects[q], pad = 8;
if (x > b[0] - pad && x < b[2] + pad && y > b[1] - pad && y < b[3] + pad) {
const l = x - (b[0] - pad), rr = b[2] + pad - x, t = y - (b[1] - pad), bt = b[3] + pad - y, m = Math.min(l, rr, t, bt);
if (m === l) { ox -= l; if (vx > 0) vx = -vx * 0.3; } else if (m === rr) { ox += rr; if (vx < 0) vx = -vx * 0.3; } else if (m === t) { oy -= t; if (vy > 0) vy = -vy * 0.3; } else { oy += bt; if (vy < 0) vy = -vy * 0.3; }
}
}
off[o] = ox; off[o + 1] = oy; off[o + 2] = vx; off[o + 3] = vy;
if (Math.hypot(ox, oy) > 50 && Math.hypot(vx + buf[j + 3], vy + buf[j + 4]) < 14) { if ((stuck[i] += d) > 0.9) gone[i] = 1; } else stuck[i] = Math.max(0, stuck[i] - d);
pan[i] = Math.max(clamp(Math.hypot(ox, oy) / 70, 0, 1) * 0.8, pan[i] * Math.exp(-d / 0.9));   // alarm fades over about a second, or stays while it is far from its place
}
};
offUse = bus.use({ pointer: true, scroll: true, wheel: true });
offFrame = bus.frame(frame); offGust = bus.on('gust', gust);
const stop = () => { offFrame && offFrame(); offGust && offGust(); offUse && offUse(); if (h) h.unregister(); clearInterval(poll); if (LB) { LB.disabled = false; LB.off.fill(0); LB.pan.fill(0); LB.fade.fill(1); LB.engine = ''; } };
const dbg = window.SpiritualLife && window.SpiritualLife.debug; if (dbg) dbg.birds = { lb: () => G.birdsLife, engine: () => (G.birdsLife && G.birdsLife.engine) || 'spring', dropped: () => dropped };
let poll = 0;
if (G && G.birdsLife) G.birdsLife.engine = G.birdsLife.engine || 'spring';
else poll = setInterval(() => { if (G && G.birdsLife) { G.birdsLife.engine = G.birdsLife.engine || 'spring'; clearInterval(poll); } }, 500);
return { stop, dropped: () => dropped };
}
function cssBirds(ctx) {
const flock = document.querySelector('.cx-open .cx-sky-flock'); if (!flock) return { stop() {} };
const host = flock.closest('.cx-open'), birds = Array.from(flock.querySelectorAll('.cx-bird'));
const bus = ctx.bus; let main = null, lane = null, dropped = false, offFrame = null, offGust = null, offUse = null, alarmT = 0, laneKey = '';
const anims = []; let lastScare = 0, still = false;
const R = document.documentElement;
const measure = () => {
const hr = host.getBoundingClientRect(), out = [];
for (const el of host.querySelectorAll('.cx-welcome-k, .cx-wm-letters, .cx-wm-sub, .cx-open-line, .cx-open-sub, .cx-open-card :is(a, button, p), .cx-open-foot :is(a, button)')) {
const b = el.getBoundingClientRect(); if (b.width < 24 || b.height < 6) continue; out.push([b.left - hr.left, b.top - hr.top, b.right - hr.left, b.bottom - hr.top]);
}
const top = Math.max(70, innerHeight * 0.08) - Math.max(0, -hr.top), floor = Math.min(hr.height, innerHeight) * 0.5;   // (the water's shore is about the middle)
let iv = [[top, Math.max(top + 10, floor)]];
for (const r of out) { const lo = r[1] - 18, hi = r[3] + 18, nx = []; for (const [a, b] of iv) { if (hi <= a || lo >= b) nx.push([a, b]); else { if (lo > a) nx.push([a, lo]); if (hi < b) nx.push([hi, b]); } } iv = nx; }
iv = iv.filter((v) => v[1] - v[0] >= 84).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
return { iv, hr };
};
const fly = () => {
const { iv } = measure(), key = iv.map((v) => v.map(Math.round).join('-')).join(',') + '|' + innerWidth; if (key === laneKey && main) return; laneKey = key;
if (main) { main.cancel(); main = null; }
if (!iv.length) { flock.style.display = 'none'; lane = null; return; }
const v = iv[0]; lane = v; flock.style.display = '';
const y0 = v[0] + 8, rise = Math.min(26, (v[1] - v[0] - 84) * 0.4);
flock.style.top = '0px'; flock.style.animation = 'none';
main = flock.animate([{ opacity: 0, transform: `translate(-12vw, ${y0}px)`, offset: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 1, offset: 0.55 }, { opacity: 0, transform: `translate(112vw, ${y0 - rise}px)`, offset: 0.62 }, { opacity: 0, transform: `translate(112vw, ${y0 - rise}px)`, offset: 1 }], { duration: 44000, delay: 7000, iterations: Infinity, easing: 'linear' });
};
const hc = ctx.budget.register({ id: 'birds-css', cost: 'waapi', label: 'CSS', priority: 2,
drop() { dropped = true; for (const a of anims) a.cancel(); anims.length = 0; if (main) main.pause(); flock.style.display = 'none'; },
restore() { dropped = false; if (main) main.play(); if (lane) flock.style.display = ''; } });
const scare = (dx, dy, strength) => {
if (dropped || still) return; const now = performance.now(); if (now - lastScare < 500) return; lastScare = now;
flock.dataset.alarm = '1'; clearTimeout(alarmT); alarmT = setTimeout(() => { delete flock.dataset.alarm; }, 1300);
const ease = getComputedStyle(R).getPropertyValue('--life-ease-spring').trim() || 'ease-out';
birds.forEach((b, i) => {
const s = 0.6 + 0.8 * ((i * 0.37) % 1), x = dx * 90 * strength * s + (i % 2 ? 14 : -14), y = dy * 90 * strength * s - 22 * strength * s;
const a = b.animate([{ translate: '0 0' }, { translate: `${x}px ${y}px`, offset: 0.22 }, { translate: '0 0' }], { duration: 1900 + i * 70, composite: 'add', easing: ease });
anims.push(a); a.onfinish = a.oncancel = () => { const k = anims.indexOf(a); if (k >= 0) anims.splice(k, 1); };
});
};
fly();
offUse = bus.use({ pointer: true, scroll: true, wheel: true });
offGust = bus.on('gust', (g) => scare(g.x || (Math.random() < 0.5 ? -1 : 1) * 0.5, -0.4, 0.5 + 0.5 * g.strength));
let tick = 0;
offFrame = bus.frame((dt, s) => {
if (dropped || !lane || s.type === 'touch' || !s.inside || (tick += dt) < 0.12) return; tick = 0;   // (a mouse only: a pointer near the flock, looked at about eight times a second)
const fr = flock.getBoundingClientRect(); if (fr.bottom < 0 || fr.top > innerHeight) return;
let best = 1e9, bx = 0, by = 0;
for (const b of birds) { const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = Math.hypot(cx - s.px, cy - s.py); if (d < best) { best = d; bx = cx - s.px; by = cy - s.py; } }
if (best < 120) { const m = Math.hypot(bx, by) || 1; scare(bx / m, by / m, clamp(1 - best / 140, 0.3, 1)); }
});
const offResize = bus.on('resize', () => { laneKey = ''; fly(); });
const ts = [1500, 4000, 8500, 13000].map((ms) => setTimeout(fly, ms));
const mo = new MutationObserver(() => { if (R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end')) { setTimeout(fly, 500); mo.disconnect(); } }); mo.observe(R, { attributes: true, attributeFilter: ['class'] });
const stop = () => { ts.forEach(clearTimeout); mo.disconnect(); hc.unregister(); clearTimeout(alarmT); offFrame && offFrame(); offGust && offGust(); offUse && offUse(); offResize && offResize(); for (const a of anims) a.cancel(); if (main) main.cancel(); flock.style.animation = ''; flock.style.top = ''; flock.style.display = ''; delete flock.dataset.alarm; };
return { stop };
}
