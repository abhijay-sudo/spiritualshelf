export const S = 150;            // pixels per metre of the world
export const CAP = 26;           // bodies alive at once, for the whole package
export const PAD = 36;           // px kept clear around the words
export function moodOf(rgba, w, h) {
const N = w * h; let green = 0, hot = 0, sat = 0, vsum = 0, gr = 0, gg = 0, gb = 0; const cells = new Map();
for (let i = 0; i < N; i++) {
const r = rgba[i * 4] / 255, g = rgba[i * 4 + 1] / 255, b = rgba[i * 4 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, s = mx ? d / mx : 0; let H = 0;
if (d > 0) { if (mx === r) H = ((g - b) / d) % 6; else if (mx === g) H = (b - r) / d + 2; else H = (r - g) / d + 4; H *= 60; if (H < 0) H += 360; }
sat += s; vsum += mx;
if (H >= 62 && H <= 168 && s > 0.2 && mx > 0.1 && mx < 0.93) { green++; gr += r; gg += g; gb += b; }
if (H >= 12 && H <= 46 && s > 0.72 && mx > 0.96) { hot++; const cx = (i % w) >> 3, cy = ((i / w) | 0) >> 3, key = cy * 64 + cx, c = cells.get(key) || { n: 0, x: 0, y: 0 }; c.n++; c.x += (i % w) / w; c.y += ((i / w) | 0) / h; cells.set(key, c); }
}
const flames = Array.from(cells.values()).filter((c) => c.n >= 3).sort((a, b) => b.n - a.n).slice(0, 3).map((c) => [c.x / c.n, c.y / c.n]);
const gf = green / N, hf = hot / N, avg = sat / N;
const kind = flames.length && vsum / N < 0.58 && hf > 0.0006 && hf < 0.02 ? 'embers' : gf > 0.05 ? 'leaves' : avg < 0.26 ? 'ash' : 'dust';
const tint = green ? [Math.round((gr / green) * 255), Math.round((gg / green) * 255), Math.round((gb / green) * 255)] : [96, 118, 58];
return { kind, flames, green: gf, hot: hf, sat: avg, tint };
}
export function zoneOf(rects, W, H, pad = PAD) {
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
for (const r of rects) { if (!r || r.width < 8 || r.height < 6 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue; n++; if (r.left < x0) x0 = r.left; if (r.right > x1) x1 = r.right; if (r.top < y0) y0 = r.top; if (r.bottom > y1) y1 = r.bottom; }
return n ? { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad, n } : null;
}
export const insideZone = (z, x, y, r = 0) => !!z && x > z.x0 - r && x < z.x1 + r && y > z.y0 - r && y < z.y1 + r;
export const sideOf = (z, x) => (x < (z.x0 + z.x1) / 2 ? -1 : 1);
export function matrix3d(q, tx, ty) {
const x = q[0], y = q[1], z = q[2], w = q[3];
const r00 = 1 - 2 * (y * y + z * z), r01 = 2 * (x * y - z * w), r02 = 2 * (x * z + y * w), r10 = 2 * (x * y + z * w), r11 = 1 - 2 * (x * x + z * z), r12 = 2 * (y * z - x * w), r20 = 2 * (x * z - y * w), r21 = 2 * (y * z + x * w), r22 = 1 - 2 * (x * x + y * y);
const f = (v) => (Math.abs(v) < 1e-5 ? 0 : +v.toFixed(4));
return `matrix3d(${f(r00)},${f(-r10)},${f(r20)},0,${f(-r01)},${f(r11)},${f(-r21)},0,${f(r02)},${f(-r12)},${f(r22)},0,${tx.toFixed(1)},${ty.toFixed(1)},0,1)`;
}
export const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const KINDS = {   // per kind: the body, its look, its air
leaves: { shape: 'box', half: [0.085, 0.06, 0.006], density: 90, ttl: 9.5, wind: 1.0, damp: [0.1, 0.25], field: { kind: 'wind', dir: [1, 0, 0], speed: 0.55, turb: 0.9, k: 22, gustGain: 5, freq: 0.8, lift: 0.7, wake: 0.3 } },
ash:    { shape: 'box', half: [0.03, 0.022, 0.004], density: 180, ttl: 8, wind: 1.4, damp: [0.1, 0.3], field: { kind: 'wind', dir: [1, 0, 0], speed: 0.4, turb: 0.7, k: 30, gustGain: 5, freq: 1.1, lift: 0.6, wake: 0.3 } },
dust:   { shape: 'sphere', r: 0.013, density: 120, ttl: 10, wind: 2.2, damp: [0.2, 0.2], field: { kind: 'wind', dir: [1, 0, 0], speed: 0.25, turb: 0.5, k: 60, gustGain: 4, freq: 0.6, lift: 0.5, wake: 0.3 } },
embers: { shape: 'sphere', r: 0.015, density: 400, ttl: 4.6, wind: 1.0, damp: [0.1, 0.1], field: { kind: 'wind', dir: [1, 0, 0], speed: 0.3, turb: 0.9, k: 4, gustGain: 5, freq: 1.4, lift: 0.5, wake: 0.3 }, lift: { kind: 'buoyancy', y: 60, rho: 760, drag: 5.5, drag2: 0.9 } },
};
export default async function mount(ctx) {
const ph = ctx.physics; if (!ph) return;
const R = document.documentElement, main = document.querySelector('[data-reader]'); if (!main) return;
const host = document.createElement('div'); host.className = 'ls-debris'; host.setAttribute('aria-hidden', 'true'); host.setAttribute('data-life-story', 'debris'); document.body.appendChild(host);
let W = innerWidth, H = innerHeight; const wx = (px) => (px - W / 2) / S, wy = (py) => (H / 2 - py) / S, px = (x) => x * S + W / 2, py = (y) => H / 2 - y * S;
const col = ['walls', 'zone', 'leaves', 'ash', 'dust', 'embers'];
const walls = ph.group('walls', { cap: 2, collide: col.slice(2) });
const zoneG = ph.group('zone', { cap: 3, collide: col.slice(2), self: false });
const G = { leaves: ph.group('leaves', { cap: 14, collide: ['walls', 'zone', 'leaves'] }), ash: ph.group('ash', { cap: 12, collide: ['walls', 'zone', 'ash'] }), dust: ph.group('dust', { cap: 14, collide: ['walls', 'zone'] }), embers: ph.group('embers', { cap: 14, collide: ['walls', 'zone'] }) };
if (!walls || !zoneG || Object.values(G).some((g) => !g)) { host.remove(); return; }
const wallZ = 0.2; let wallsOn = false;
const buildWalls = () => { if (wallsOn) return; wallsOn = true; for (const s of [-1, 1]) walls.box({ pos: [0, 0, s * wallZ], half: [W / S, H / S + 1, 0.05], kind: 'static' }); };
const fields = {}; let zoneSent = null;
const mkFields = () => { for (const k of Object.keys(G)) { const d = KINDS[k]; fields[k] = { wind: G[k].field(Object.assign({}, d.field)), lift: d.lift ? G[k].field(Object.assign({}, d.lift)) : null }; } };
let roof = null, left = null, right = null, shape = null;
const syncZone = (z, force) => {
if (!z) return;
const moved = !zoneSent || Math.abs(z.x0 - zoneSent.x0) > 8 || Math.abs(z.x1 - zoneSent.x1) > 8 || Math.abs(z.y0 - zoneSent.y0) > 6 || Math.abs(z.y1 - zoneSent.y1) > 6;
if (!moved && !force) return;
const widthChanged = !shape || Math.abs((z.x1 - z.x0) - shape.w) > 40, topOn = z.y0 > 24;
if (widthChanged || (topOn !== !!roof) || !left || !left.alive) {
for (const b of [roof, left, right]) b && b.alive && b.remove(); roof = left = right = null;
const hh = H / S + 1, midx = wx((z.x0 + z.x1) / 2), halfw = (z.x1 - z.x0) / 2 / S;
left = zoneG.box({ pos: [wx(z.x0) - 0.04, 0, 0], half: [0.04, hh, 0.3], kind: 'kinematic', density: 100 });
right = zoneG.box({ pos: [wx(z.x1) + 0.04, 0, 0], half: [0.04, hh, 0.3], kind: 'kinematic', density: 100 });
if (topOn) roof = zoneG.capsule({ pos: [midx, wy(z.y0) + 0.1, 0], r: 0.14, hh: halfw, axis: 'x', kind: 'kinematic', density: 100 });
shape = { w: z.x1 - z.x0 };
} else {
left.moveTo([wx(z.x0) - 0.04, 0, 0]); right.moveTo([wx(z.x1) + 0.04, 0, 0]); if (roof && roof.alive) roof.moveTo([wx((z.x0 + z.x1) / 2), wy(z.y0) + 0.1, 0]);
}
zoneSent = { x0: z.x0, x1: z.x1, y0: z.y0, y1: z.y1 };
};
let wordEls = [], zone = null, guardEls = [], frameN = 0;
const collect = () => { wordEls = Array.from(main.querySelectorAll('.cx-film-card, .fm-t, .fm-about, .cx-the-end')); guardEls = Array.from(document.querySelectorAll('.fm-rail, .ed-head, .fm-aa, .fm-whisper')); };
const measure = () => {
const rects = []; for (const e of wordEls) rects.push(e.getBoundingClientRect());
zone = zoneOf(rects, W, H); zoneAt = scrollY; zoneRaw = zone; const g = []; for (const e of guardEls) { const r = e.getBoundingClientRect(); if (r.width > 8 && r.height > 8) g.push(r); } guard = g;
};
let guard = [], zoneAt = 0, zoneRaw = null;
const slide = () => { if (!zoneRaw) { zone = null; return; } const dy = zoneAt - scrollY; zone = dy ? { x0: zoneRaw.x0, x1: zoneRaw.x1, y0: zoneRaw.y0 + dy, y1: zoneRaw.y1 + dy, n: zoneRaw.n } : zoneRaw; };
const blocked = (x, y, r) => { if (y < 78) return true; r += Math.min(90, Math.abs(ctx.bus.state.svy || 0) * 0.035); /* (the page may be a frame ahead of this layer: the faster it scrolls, the wider the berth) */ if (insideZone(zone, x, y, r)) return true; for (const b of guard) if (x > b.left - r - 8 && x < b.right + r + 8 && y > b.top - r - 8 && y < b.bottom + r + 8) return true; return false; };
const items = []; let alive = 0, dropped = false, last = '', seq = 0;
const rand = rng(0x5eed1234 ^ (location.pathname.length * 2654435761));
const spawn = (kind, o) => {
if (dropped || items.length >= CAP) return null; const g = G[kind], d = KINDS[kind], sc = 0.75 + rand() * 0.6; let b;
const p = { pos: o.pos, density: d.density, wind: d.wind * (0.85 + rand() * 0.3), seed: rand() * 100, ttl: d.ttl * (0.8 + rand() * 0.4), damp: d.damp, vel: o.vel, ang: [rand() * 2 - 1, rand() * 2 - 1, (rand() * 2 - 1) * 2.5].map((v) => v * (kind === 'dust' ? 0 : 1.4)), sleep: 0, quat: o.quat };
let wpx, hpx;
if (d.shape === 'box') { b = g.box(Object.assign(p, { half: d.half.map((v) => v * sc) })); wpx = d.half[0] * sc * 2 * S; hpx = d.half[1] * sc * 2 * S; } else { b = g.sphere(Object.assign(p, { r: d.r * sc })); wpx = hpx = d.r * sc * 2 * S * (kind === 'embers' ? 4 : 5); }
if (!b) return null;
const el = document.createElement('i'); el.className = kind === 'leaves' ? 'leaf' : kind; el.style.width = wpx.toFixed(1) + 'px'; el.style.height = hpx.toFixed(1) + 'px'; el.style.margin = `${(-hpx / 2).toFixed(1)}px 0 0 ${(-wpx / 2).toFixed(1)}px`;
if (kind === 'leaves') { const t = o.tint || [96, 118, 58], a = 0.78 + rand() * 0.45, mix = rand() < 0.3, c0 = mix ? [176, 132, 60] : t.map((v) => Math.min(255, v * a)), c1 = c0.map((v) => Math.min(255, v * 1.22)); el.style.background = `linear-gradient(100deg, rgb(${c0.map(Math.round)}), rgb(${c1.map(Math.round)}))`; el.style.boxShadow = 'inset 0 0 0 .6px rgb(0 0 0 / .25)'; }
host.appendChild(el); wake(); const vol = d.shape === 'box' ? 8 * d.half[0] * d.half[1] * d.half[2] * sc * sc * sc : (4 / 3) * Math.PI * Math.pow(d.r * sc, 3), it = { b, el, kind, born: performance.now(), ttl: p.ttl * 1000, r: Math.max(wpx, hpx) / 2, op: -1, mass: Math.max(1e-6, vol * d.density) }; items.push(it); return it;
};
const tmp = new Float32Array(8);
const draw = () => {
if (!items.length) return; frameN++; if (frameN % 3 === 1) measure(); else slide();
const now = performance.now(); alive = items.length;
for (let i = items.length - 1; i >= 0; i--) {
const it = items[i], b = it.b;
if (!b.alive) { it.el.remove(); items.splice(i, 1); continue; }
b.pose(tmp); const x = px(tmp[0]), y = py(tmp[1]);
if (zone && (frameN + i) % 3 === 0 && x > zone.x0 - 170 && x < zone.x1 + 170 && y > zone.y0 - 90 && y < zone.y1 + 90) {   // parting air: away from the words, harder the nearer
const side = sideOf(zone, x), near = side < 0 ? (x - (zone.x0 - 170)) / 170 : ((zone.x1 + 170) - x) / 170, dv = 0.5 * Math.max(0, Math.min(1, near)) * 0.35 + 0.05;   // (m/s of velocity change per push)
const m = it.mass; b.impulse([side * dv * m, 0, 0]);
}
if (y > H + 80 || y < -H || x < -120 || x > W + 120) { b.remove(); it.el.style.opacity = '0'; continue; }
const age = now - it.born, fin = Math.min(1, age / 450), fout = Math.min(1, (it.ttl - age) / 1100);
let op = Math.max(0, Math.min(fin, fout)) * (it.kind === 'dust' ? 0.7 : it.kind === 'ash' ? 0.8 : 1);
if (it.kind === 'embers') op *= 0.75 + 0.25 * Math.sin(age * 0.02 + it.r * 9);
if (blocked(x, y, it.r)) op = 0;
if (op !== it.op) { it.el.style.opacity = op.toFixed(2); it.op = op; }
it.el.style.transform = it.kind === 'dust' || it.kind === 'embers' ? `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)` : matrix3d([tmp[3], tmp[4], tmp[5], tmp[6]], x, y);
}
h.bodies(alive); hw.bodies(alive);
};
let unf = null; const wake = () => { if (!unf) unf = ctx.bus.frame(() => { if (!items.length) { unf(); unf = null; return; } try { draw(); } catch (e) { console.error('story-debris draw', e && e.message); } }); };
const analyse = (img) => {
try { const c = document.createElement('canvas'); c.width = 96; c.height = Math.max(8, Math.round(96 * img.naturalHeight / img.naturalWidth)); const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height); return moodOf(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height); } catch (e) { return null; }
};
const burst = async (img, n, label) => {
const my = ++seq; if (dropped || !img) return; if (!img.complete || !img.naturalWidth) { try { await img.decode(); } catch (e) { return; } } if (my !== seq || ctx.signal.aborted) return;
const m = analyse(img); if (!m) return; buildWalls(); if (!fields.leaves) mkFields(); collect(); measure(); syncZone(zone, !zoneSent);
const rect = img.getBoundingClientRect(); last = `${label}:${m.kind}`; const kinds = m.kind === 'embers' ? [['embers', 0.6], ['ash', 0.4]] : [[m.kind, 1]];
for (const [kind, share] of kinds) {
const count = Math.max(2, Math.round(n * share));
for (let i = 0; i < count; i++) {
setTimeout(() => {
if (my !== seq || dropped || ctx.signal.aborted || items.length >= CAP) return;
let x, y, vx = (rand() - 0.5) * 0.6, vy = 0;
if (kind === 'embers') { const f = m.flames[i % Math.max(1, m.flames.length)]; if (f && label === 'scene') { x = rect.left + f[0] * rect.width + (rand() - 0.5) * 24; y = rect.top + f[1] * rect.height + (rand() - 0.5) * 10; } else { x = rand() * W; y = H + 20; } vy = 0.25; }
else { x = rand() * W; y = -30 - rand() * 80; }
for (let t = 0; t < 4 && insideZone(zone, x, y, 10) ; t++) x = rand() * W;   // (a place over the words is not a place to begin)
if (blocked(x, y < 80 ? 90 : y, 4) && kind !== 'embers') { if (insideZone(zone, x, 90, 10)) return; }
spawn(kind, { pos: [wx(x), wy(y), (rand() - 0.5) * 0.12], vel: [vx, vy, 0], tint: m.tint, quat: undefined });
}, i * (kind === 'embers' ? 220 : 160) + rand() * 120);
}
}
};
const open = main.querySelector('.cx-film-open-pic img');
const startOpen = () => { if (scrollY < innerHeight * 0.6) burst(open, 16, 'opening'); };
let stage = null; for (let i = 0; i < 40 && !stage; i++) { stage = document.querySelector('.fm-stage'); if (!stage) await new Promise((r) => setTimeout(r, 150)); if (ctx.signal.aborted) { host.remove(); return; } }
const layers = stage ? Array.from(stage.querySelectorAll('.fm-ly')) : [], seen = new WeakSet();
const lmo = new MutationObserver((rs) => { for (const r of rs) { const l = r.target, on = l.classList.contains('on'); if (on && !seen.has(l)) { seen.add(l); const img = l.querySelector('img'); if (img && /(^|\/)shot-/.test(img.src) && R.classList.contains('fm-live') && !R.classList.contains('fm-ended')) setTimeout(() => burst(img, 9, 'scene'), 500); } else if (!on) seen.delete(l); } });
for (const l of layers) { lmo.observe(l, { attributes: true, attributeFilter: ['class'] }); if (l.classList.contains('on')) seen.add(l); }
startOpen();
const unr = ctx.bus.on('resize', () => { W = innerWidth; H = innerHeight; zoneSent = null; });
const h = ctx.budget.register({ id: 'story-debris', label: 'PhysX', cost: 'physx', priority: 3, drop() { dropped = true; seq++; for (const g of Object.values(G)) g.clear(); for (const it of items) it.el.remove(); items.length = 0; host.style.display = 'none'; }, restore() { dropped = false; host.style.display = ''; } });
const hw = ctx.budget.register({ id: 'story-air', label: 'custom force on PhysX', cost: 'physx', priority: 3, drop() { for (const f of Object.values(fields)) { f.wind && f.wind.off(); f.lift && f.lift.off(); } }, restore() { for (const k of Object.keys(fields)) { fields[k].wind && fields[k].wind.set({ on: true }); fields[k].lift && fields[k].lift.set({ on: true }); } } });
const dbg = window.SpiritualLife && window.SpiritualLife.debug;
if (dbg) dbg.debris = { count: () => items.length, cap: CAP, last: () => last, zone: () => zone, burst: (n = 9) => burst(layers.map((l) => l.querySelector('img')).find((i, k) => layers[k].classList.contains('on')) || open, n, 'scene'), items: () => items.map((it) => { it.b.pose(tmp); return { kind: it.kind, x: px(tmp[0]), y: py(tmp[1]), r: it.r, op: it.op }; }), guard: () => guard.length, bodies: () => Object.fromEntries(Object.entries(G).map(([k, g]) => [k, g.count])) };
return { dispose() { seq++; if (unf) unf(); lmo.disconnect(); unr(); for (const it of items) it.el.remove(); items.length = 0; host.remove(); if (dbg) delete dbg.debris; } };
}
