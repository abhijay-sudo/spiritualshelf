(() => {
const sky = document.querySelector('[data-stars]'); if (!sky) return;
const root = document.documentElement;
const off = () => sky.classList.add('is-off');
if (root.classList.contains('ep-lite')) return off();
const stage = sky.querySelector('[data-st-stage]'); const cv = stage.querySelector('canvas'); const ctx = cv.getContext && cv.getContext('2d');
if (!ctx || !window.ResizeObserver) return off();
sky.classList.add('is-on');
const ac = new AbortController();
const on = (t, ev, fn, o) => t.addEventListener(ev, fn, Object.assign({ signal: ac.signal }, o));
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const calm = () => root.dataset.motion === 'reduce' || !!root.dataset.light || mq.matches;
let wasCalm = calm();
const UI = JSON.parse(sky.querySelector('[data-st-ui]').textContent);
const hi = root.lang === 'hi';
const card = sky.querySelector('[data-st-card]'); const live = sky.querySelector('[data-st-live]'); const cap = sky.querySelector('[data-st-cap]'); const topEl = sky.querySelector('[data-st-top]');
const wbtn = sky.querySelector('[data-st-wander]'); const wlabel = sky.querySelector('[data-st-wlabel]'); const boxEl = stage.parentNode;
const TAU = Math.PI * 2; const GOLD = '243,196,126'; const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const clamp01 = (v) => Math.max(0, Math.min(1, v)); const lerp = (a, b, t) => a + (b - a) * t;
const ss = (s) => s * s * s * (s * (s * 6 - 15) + 10);                  // smootherstep
const easeOut = (s) => 1 - Math.pow(1 - s, 3);
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const nb = (s) => s.replace(/\s+(\S+)$/, ' $1');                      // no stranded last word
const coarse = matchMedia('(pointer: coarse)').matches;
const mem = navigator.deviceMemory || 8; const cores = navigator.hardwareConcurrency || 8;
let Q = mem <= 2 || cores <= 2 ? 2 : coarse || mem <= 4 || cores <= 4 ? 1 : 0;
const QP = [{ dpr: 2, dust: 1, comets: 34, neb: 3, fps: 0, wide: 1, px: 8e6 }, { dpr: 1.5, dust: 0.6, comets: 20, neb: 2, fps: 0, wide: 0, px: 4e6 }, { dpr: 1.25, dust: 0.32, comets: 10, neb: 1, fps: 30, wide: 0, px: 2.5e6 }, { dpr: 1, dust: 0.18, comets: 5, neb: 1, fps: 30, wide: 0, px: 1.2e6 }];
const realms = [...document.querySelectorAll('.st-realm')].map((el, i) => ({ id: el.dataset.realm, i, hw: +el.dataset.hw, hh: +el.dataset.hh, name: el.querySelector('.st-h3').firstChild.textContent.trim(), cx: 0, cy: 0, a: 1, m: 0, sx: 0, sy: 0 }));
const nodes = []; const byId = {};
for (const el of document.querySelectorAll('.st-p')) {
const d = el.dataset; const a = el.querySelector('.st-p-a'); const i = nodes.length;
const n = { id: d.id, el, i, realm: realms.find((r) => r.id === el.closest('.st-realm').dataset.realm), lx: +d.x, ly: +d.y, r: +d.r, tier: d.tier, light: d.light, cell: +d.cell,
sc: +d.sc || 0, name: el.querySelector('.st-p-n').textContent, other: d.o, en: d.en, href: a.getAttribute('href'), title: el.querySelector('.st-p-k')?.textContent || '', line: el.querySelector('.st-p-l').textContent,
ties: [...el.querySelectorAll('.st-ties > li')].map((li) => ({ k: li.dataset.k, ph: li.dataset.ph, fl: li.dataset.fl || '', ev: li.dataset.ev || '' })), withs: [...el.querySelectorAll('.st-with a')].map((x) => ({ k: x.dataset.k, n: +x.dataset.n })),
x: 0, y: 0, px: 0, py: 0, pr: 0, vis: false, ph: (i * 2.399) % TAU, sp: 0.36 + ((i * 7) % 11) * 0.02, near: null, kin: null, lab: null,
in: 0, dr: 0, bt: 0, sm: null, under: 1, pulseAt: 0, wd: -1, dim: 1, hot: 0, glow: 0, pulse: -1e9, la: 0, bu: 0, lci: 0, spr: null, halo: null, rgb: null, rank: 0 };
nodes.push(n); byId[n.id] = n;
}
if (!nodes.length) return off();
const short = (n) => n.name.replace(/\s*\(.*\)$/, '');
const rgbOf = (c) => { let m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (m) { const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; } m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c || ''); if (m) return [17 * parseInt(m[1], 16), 17 * parseInt(m[2], 16), 17 * parseInt(m[3], 16)]; m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c || ''); return m ? [+m[1], +m[2], +m[3]] : [243, 196, 126]; };
const TIER = { legend: 0, lead: 1, cast: 2 };
nodes.forEach((n) => { n.rgb = rgbOf(n.light); n.rank = TIER[n.tier] ?? 2; });
const FLOORS = { wide: { legend: 12, lead: 11, cast: 10 }, narrow: { legend: 13, lead: 12, cast: 11 } }; let FLOOR = FLOORS.wide;   // a face is never drawn smaller than this, so a far sky is still faces, not blobs of light
for (const r of realms) { let hub = null; for (const n of nodes) if (n.realm === r && (!hub || n.rank < hub.rank || (n.rank === hub.rank && n.ties.length > hub.ties.length))) hub = n; r.hub = hub; }
nodes.forEach((n) => { const h = n.realm.hub; n.bt = 1.2 + n.realm.i * 0.3 + Math.hypot(n.lx - h.lx, n.ly - h.ly) / Math.max(n.realm.hw, 1) * 1.15 + (n.i % 5) * 0.025; });
const easeBack = (x) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const edges = []; const named = []; const withE = []; const edgeAt = {}; const key = (a, b) => (a.i < b.i ? a.i + '-' + b.i : b.i + '-' + a.i);
for (const n of nodes) for (const t of n.ties) {
const m = byId[t.k]; if (!m || edgeAt[key(n, m)]) continue;
const back = m.ties.find((u) => u.k === n.id); const fl = t.fl === 'o' ? 1 : t.fl === 'i' ? -1 : back && back.fl === 'o' ? -1 : back && back.fl === 'i' ? 1 : 0;
const e = { a: n, b: m, bow: (n.i + m.i) % 2 ? 1 : -1, named: true, n: 3, flow: fl, ev: t.ev, ph: t.ph, g: edges.length % 4, hot: 0, prog: 1, t0: 0, len: 1, ax: 0, ay: 0, bx: 0, by: 0, mx: 0, my: 0, vis: false };
edges.push(e); named.push(e); edgeAt[key(n, m)] = e;
}
for (const n of nodes) for (const t of n.withs) {
const m = byId[t.k]; if (!m || m.i < n.i || edgeAt[key(n, m)]) continue;
const e = { a: n, b: m, bow: (n.i + m.i) % 2 ? 1 : -1, named: false, n: t.n, flow: 0, ev: '', ph: '', g: edges.length % 4, hot: 0, prog: 1, t0: 0, len: 1, ax: 0, ay: 0, bx: 0, by: 0, mx: 0, my: 0, vis: false };
edges.push(e); withE.push(e); edgeAt[key(n, m)] = e;
}
edges.forEach((e, i) => { const ra = e.a.realm.i * 0.35 + e.a.rank * 0.45; const rb = e.b.realm.i * 0.35 + e.b.rank * 0.45; e.fb = rb < ra; e.t0 = 1.9 + Math.min(ra, rb) * 0.6 + (e.named ? 0 : 0.6) + (i % 17) * 0.03; });
for (const n of nodes) { n.near = new Set([...n.ties.map((t) => t.k), ...n.withs.map((t) => t.k)]); n.kin = new Set(n.ties.map((t) => t.k)); n.edges = []; n.namedE = []; }
for (const e of edges) { e.a.edges.push(e); e.b.edges.push(e); if (e.named) { e.a.namedE.push(e); e.b.namedE.push(e); } }
let boxHpx = 0; let W = 0; let H = 0; let dpr = 1; let wide = null; let narrow = false; let box = { x0: 0, y0: 0, x1: 1, y1: 1 }; let arrangeInfo = null; let topH = 80; let first = true; let atHome = true; let homeSel = 'rest'; let restRealm = null; let lastKey = ''; const rest = { x: 0, y: 0, k: 1 }; let panel = 'none';
const cam = { x: 0, y: 0, k: 1 }; const to = { x: 0, y: 0, k: 1 }; let ease = 0.22; let kMin = 0.2; const K_MAX = 4; const home = { x: 0, y: 0, k: 1 };
let flight = null; const vel = { x: 0, y: 0 };
const WALL = 7; let GX = 14; let GY = 17; let TITLE = 50; const packs = new Map();
const pack = (r, asp) => {
const key = r.id + asp.toFixed(2) + GX; const got = packs.get(key); if (got) return got;
const P = nodes.filter((n) => n.realm === r); const m = P.length; const ix = new Map(P.map((n, i) => [n, i]));
let mx = 1; let my = 1; for (const n of P) { mx = Math.max(mx, Math.abs(n.lx)); my = Math.max(my, Math.abs(n.ly)); }
let A = 0; for (const n of P) A += Math.PI * (n.r + GX / 2) * (n.r + GY / 2);
let a = Math.sqrt(A / (0.62 * asp)) * 0.75; let b = a * asp; const x = P.map((n) => n.lx / mx * a * 0.9); const y = P.map((n) => n.ly / my * b * 0.9);
const rr = P.map((n) => n.r); const sp = []; for (const n of P) for (const e of n.namedE) if (e.a === n && ix.has(e.b)) sp.push([ix.get(n), ix.get(e.b)]);
const sx0 = []; const sy0 = []; for (let i = 0; i < m; i++) { sx0[i] = []; sy0[i] = []; for (let j = 0; j < m; j++) { sx0[i][j] = rr[i] + rr[j] + GX; sy0[i][j] = rr[i] + rr[j] + GY; } }
let good = null; const snap = () => ({ x: x.slice(), y: y.slice(), a, b });
const relax = (rounds) => {
let worst = 0;
for (let rd = 0; rd < rounds; rd++) {
for (let pass = 0; pass < 8; pass++) {
if (pass === 0) for (const [i, j] of sp) { const dx = x[j] - x[i]; const dy = y[j] - y[i]; const d = Math.hypot(dx, dy) || 1; const want = rr[i] + rr[j] + GX + 30; if (d > want) { const k = (d - want) * 0.006; x[i] += dx / d * k; y[i] += dy / d * k; x[j] -= dx / d * k; y[j] -= dy / d * k; } }
worst = 0;
for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) {
let dx = x[j] - x[i]; let dy = y[j] - y[i]; if (!dx && !dy) { dx = 0.3 * (i - j); dy = 0.2; }
const sx = sx0[i][j]; const sy = sy0[i][j]; if (Math.abs(dx) >= sx || Math.abs(dy) >= sy) continue; const d = Math.hypot(dx / sx, dy / sy); if (d >= 1) continue;
const g = (1 - d) * Math.min(sx, sy); if (g > worst) worst = g; const k = (1 / d - 1) * 0.52; x[i] -= dx * k; y[i] -= dy * k; x[j] += dx * k; y[j] += dy * k;
}
for (let i = 0; i < m; i++) { const ax = Math.max(8, a - rr[i]); const ay = Math.max(8, b - rr[i]); const q = Math.pow(Math.abs(x[i]) / ax, WALL) + Math.pow(Math.abs(y[i]) / ay, WALL); if (q > 1) { const c = Math.pow(q, -1 / WALL); x[i] *= c; y[i] *= c; } }
}
if (worst < 3) break;
}
return worst;
};
relax(14); good = snap();
for (let it = 0; it < 120; it++) {
const f = 0.99; a *= f; b *= f; for (let i = 0; i < m; i++) { x[i] *= f; y[i] *= f; }
const w2 = relax(it < 8 ? 6 : 10); if (w2 > 3) break; good = snap();
}
const S = good || snap(); let x0 = 1e9; let x1 = -1e9; let y0 = 1e9; let y1 = -1e9;
for (let i = 0; i < m; i++) { x0 = Math.min(x0, S.x[i] - rr[i]); x1 = Math.max(x1, S.x[i] + rr[i]); y0 = Math.min(y0, S.y[i] - rr[i]); y1 = Math.max(y1, S.y[i] + rr[i] + 10); }
const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2; const pos = new Map(P.map((n, i) => [n, [S.x[i] - cx, S.y[i] - cy]]));
const res = { hw: Math.ceil((x1 - x0) / 2) + 4, hh: Math.ceil((y1 - y0) / 2) + 2, pos }; packs.set(key, res); return res;
};
const ASPS = [0.3, 0.4, 0.52, 0.66, 0.82, 1, 1.2, 1.45, 1.75, 2.1]; const ARRS = [[[0, 1, 2]], [[0], [1], [2]], [[0, 1], [2]], [[0], [1, 2]], [[0, 2], [1]]];
const RGAP = 22; const VGAP = 20;
const place = (arr, pk) => {
const cl = []; let tw = 0; let ty = 0; const rows = arr.map((row) => { const w = row.reduce((s2, i) => s2 + pk[i].hw * 2, 0) + RGAP * (row.length - 1); const h = Math.max(...row.map((i) => pk[i].hh * 2)) + TITLE; tw = Math.max(tw, w); return { row, w, h }; });
for (const o of rows) ty += o.h; ty += VGAP * (rows.length - 1); let y = -ty / 2;
for (const o of rows) { let x = -o.w / 2; for (const i of o.row) { cl[i] = { cx: x + pk[i].hw, cy: y + TITLE + pk[i].hh }; x += pk[i].hw * 2 + RGAP; } y += o.h + VGAP; }
return { cl, w: tw, h: ty };
};
let layoutKey = '';
const padOf = () => (narrow ? 9 : 14);
const arrange = () => {
const dense = narrow || W <= 900; GX = dense ? 11 : 14; GY = dense ? 13 : 17; TITLE = dense ? 40 : 44;
const rf = freeRect('none'); const pd = padOf(); const FW = rf.x1 - rf.x0 - pd * 2; const FH = rf.y1 - rf.y0 - pd * 2; let best = null;
const nA = ASPS.length; const CAP = 3;
const kr = realms.map((r) => ASPS.map((asp) => { const p = pack(r, asp); return Math.min(CAP, FW / (p.hw * 2), FH / (p.hh * 2 + TITLE + 10)); }));
const cands = []; let kTop = 0;
for (const arr of ARRS) for (let a0 = 0; a0 < nA; a0++) for (let a1 = 0; a1 < nA; a1++) for (let a2 = 0; a2 < nA; a2++) {
const ix = [a0, a1, a2]; const pl = place(arr, realms.map((r, i) => pack(r, ASPS[ix[i]]))); const k = Math.min(FW / pl.w, FH / pl.h); if (k > kTop) kTop = k;
cands.push({ arr, ix, k, kg: Math.pow(kr[0][a0] * kr[1][a1] * kr[2][a2], 1 / 3) });
}
for (const c of cands) { if (c.k < kTop * 0.985) continue; const sc = c.k + c.kg * 0.02; if (!best || sc > best.sc) best = { sc, k: c.k, kg: c.kg, ix: c.ix, arr: c.arr }; }
const pk = realms.map((r, i) => pack(r, ASPS[best.ix[i]])); const pl = place(best.arr, pk);
const rix = realms.map((r, i) => { let bi = 0; for (let a = 1; a < nA; a++) if (kr[i][a] > kr[i][bi]) bi = a; return bi; });
layoutKey = best.ix.join('/') + ':' + JSON.stringify(best.arr) + ':' + rix.join('/'); arrangeInfo = { asp: best.ix.map((a) => ASPS[a]).join('/'), arr: best.arr, k: best.k, kr: best.kg, realmAsp: rix.map((a) => ASPS[a]).join('/'), realmK: rix.map((a, i) => +kr[i][a].toFixed(2)) };
realms.forEach((r, i) => { r.ov = { cx: pl.cl[i].cx, cy: pl.cl[i].cy, hw: pk[i].hw, hh: pk[i].hh }; const q = pack(r, ASPS[rix[i]]); r.rl = { hw: q.hw, hh: q.hh, pos: q.pos }; });
for (const n of nodes) { const p = pk[n.realm.i].pos.get(n); n.ox = p[0]; n.oy = p[1]; const q = n.realm.rl.pos.get(n); n.rx = q[0]; n.ry = q[1]; }
ovBox = { x0: Math.min(...realms.map((r) => r.ov.cx - r.ov.hw)), x1: Math.max(...realms.map((r) => r.ov.cx + r.ov.hw)), y0: Math.min(...realms.map((r) => r.ov.cy - r.ov.hh - TITLE)), y1: Math.max(...realms.map((r) => r.ov.cy + r.ov.hh)) };
morph();
};
let unf = null; let ovBox = { x0: 0, y0: 0, x1: 1, y1: 1 };
const pushOf = (j, u) => {
const dx = j.ov.cx - u.ov.cx; const dy = j.ov.cy - u.ov.cy; const nx = u.rl.hw + j.ov.hw + 150; const ny = u.rl.hh + j.ov.hh + TITLE + 110;
if (Math.abs(dx) / (u.ov.hw + j.ov.hw) >= Math.abs(dy) / (u.ov.hh + j.ov.hh)) return [(dx < 0 ? -1 : 1) * Math.max(Math.abs(dx), nx) - dx, 0];
return [0, (dy < 0 ? -1 : 1) * Math.max(Math.abs(dy), ny) - dy];
};
const morph = () => {
for (const r of realms) { r.sx = 0; r.sy = 0; }
for (const u of realms) { if (u.m < 0.001) continue; const e = ss(u.m); for (const j of realms) if (j !== u) { const o = pushOf(j, u); j.sx += o[0] * e; j.sy += o[1] * e; } }
for (const r of realms) { const e = ss(r.m); r.cx = r.ov.cx + r.sx; r.cy = r.ov.cy + r.sy; r.hw = lerp(r.ov.hw, r.rl.hw, e); r.hh = lerp(r.ov.hh, r.rl.hh, e); }
for (const n of nodes) { const r = n.realm; const e = ss(r.m); n.x = r.cx + lerp(n.ox, n.rx, e); n.y = r.cy + lerp(n.oy, n.ry, e); }
for (const b of blobs) { b.rx = b.fx * b.r.hw; b.ry = b.fy * b.r.hh; b.rad = Math.max(b.r.hw, b.r.hh) * b.rf; }
box = { x0: Math.min(...realms.map((r) => r.cx - r.hw)), x1: Math.max(...realms.map((r) => r.cx + r.hw)), y0: Math.min(...realms.map((r) => r.cy - r.hh - TITLE)), y1: Math.max(...realms.map((r) => r.cy + r.hh)) };
for (const e of edges) e.len = Math.hypot(e.a.x - e.b.x, e.a.y - e.b.y) || 1;
};
const morphBusy = () => realms.some((r) => r.m !== (r === unf ? 1 : 0));
const setUnf = (r, now) => { unf = r || null; if (now || calm() || !W) { for (const x of realms) x.m = x === unf ? 1 : 0; morph(); } wake(); };
const freeRect = (mode) => {
const top = Math.min(H * 0.36, topH + (narrow ? 14 : 4)); const bot = narrow ? 56 : H < 560 ? 64 : mode === 'cap' || mode === 'card' ? 138 : 78; const r = { x0: 12, x1: W - (narrow ? 12 : 44), y0: top, y1: H - bot };
if (mode === 'cap' || mode === 'card') { if (narrow) { if (mode === 'card') { r.y1 = boxHpx * 0.52 - 8; r.y0 += 10; } else r.y1 = H - Math.max(250, H * 0.4) - 6; } else r.x0 = Math.min(W * 0.42, 540); }
if (r.y1 - r.y0 < 140) r.y1 = r.y0 + 140;
return r;
};
const camFor = (px, py, k, r) => ({ x: px - ((r.x0 + r.x1) / 2 - W / 2) / k, y: py - ((r.y0 + r.y1) / 2 - H / 2) / k, k });
const fitK = (b, r, pad) => Math.min(K_MAX, (r.x1 - r.x0 - pad * 2) / (b.x1 - b.x0), (r.y1 - r.y0 - pad * 2) / (b.y1 - b.y0));
const fitBox = (b, r, pad) => camFor((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, fitK(b, r, pad), r);
const realmBox = (r) => ({ x0: r.ov.cx - r.rl.hw, x1: r.ov.cx + r.rl.hw, y0: r.ov.cy - r.rl.hh - TITLE, y1: r.ov.cy + r.rl.hh + 10 });
const camOfRealm = (r) => { const rr = freeRect('none'); const b = realmBox(r); return camFor((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, clamp(Math.max(fitK(b, rr, padOf()), narrow ? 0.62 : 0.5), kMin, K_MAX), rr); };
const clampCam = (c) => {
c.k = clamp(c.k, kMin, K_MAX); const mx = W / 2 / c.k * 0.35; const my = H / 2 / c.k * 0.35;
c.x = clamp(c.x, box.x0 - mx, box.x1 + mx); c.y = clamp(c.y, box.y0 - my, box.y1 + my); return c;
};
const setCam = (c) => { Object.assign(cam, c); Object.assign(to, c); flight = null; vel.x = vel.y = 0; wake(); };
const fly = (tg, sec, o = {}) => {
tg = clampCam({ x: tg.x, y: tg.y, k: tg.k });
if (calm() || !W) { setCam(tg); o.done && o.done(); return; }
const d = Math.hypot((tg.x - cam.x) * cam.k, (tg.y - cam.y) * cam.k);
flight = { t0: performance.now(), dur: (sec || clamp(0.9 + d / 900, 1.1, 2.6)) * 1000, from: { x: cam.x, y: cam.y, k: cam.k }, to: tg, bump: o.bump != null ? o.bump : Math.min(0.34, d / Math.max(W, H) * 0.4), edge: o.edge || null, rev: !!o.rev, out: !!o.out, done: o.done || null, r: o.r || null };
vel.x = vel.y = 0; wake();
};
const stopFlight = () => { if (flight) { flight = null; Object.assign(to, cam); } };
let faces = null; let cell = 0; const cols = +sky.dataset.cols || 10; let hd = !sky.dataset.atlasHd; let xl = !sky.dataset.atlasXl;
const netSlow = () => !!(window.SpritualNet && window.SpritualNet.slow());
const loadFaces = (src, then) => {
if (!src) return; const ok = (pic) => { if (!faces || faces.width < pic.width) { faces = pic; cell = pic.width / cols; bakeAll(); } if (then) then(); };
const plain = () => { const im = new Image(); im.decoding = 'async'; im.onload = () => ok(im); im.src = src; };
const early = window.SpritualAtlas; if (early && early.src === src && !early.used) { early.used = true; early.p.then(ok, plain); return; }
if (window.createImageBitmap && window.fetch) fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject())).then((bl) => createImageBitmap(bl)).then(ok, plain); else plain();
};
const wantHd = (now) => { if (hd) return; hd = true; if (now === true) { loadFaces(sky.dataset.atlasHd); return; } setTimeout(() => (window.requestIdleCallback || setTimeout)(() => loadFaces(sky.dataset.atlasHd)), 400); };   // [perf] now: asked for the moment the small sheet is in, one after the other (never two sheets sharing a weak line)
const wantXl = () => { if (xl) return; xl = true; (window.requestIdleCallback || setTimeout)(() => loadFaces(sky.dataset.atlasXl)); };
on(sky, 'pointerup', wantHd, { capture: true, passive: true }); on(sky, 'keyup', wantHd, { capture: true, passive: true });
const SPR = { legend: 256, lead: 224, cast: 192 };
let baking = 0;
const sprD = (n) => (Q >= 1 && dpr < 1.75 ? 136 : Math.round(SPR[n.tier] * (dpr >= 1.75 ? 1 : 0.8))); const bake = (n) => { n.spr = paint(n, sprD(n), n.spr); n.sm = paint(n, 44, n.sm); };
const paint = (n, D, old) => {
const c = old && old.width === D ? old : document.createElement('canvas'); c.width = c.height = D; const g = c.getContext('2d'); g.clearRect(0, 0, D, D); g.imageSmoothingQuality = 'high';
const r = D / 2 - 1; const rw = Math.max(1.6, D * 0.016, D < 60 ? 3 : 0);
g.save(); g.beginPath(); g.arc(D / 2, D / 2, r - rw * 0.4, 0, TAU); g.clip();
if (faces && n.cell >= 0) g.drawImage(faces, (n.cell % cols) * cell, Math.floor(n.cell / cols) * cell, cell, cell, 0, 0, D, D); else { const dg = g.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2); dg.addColorStop(0, '#fff3d6'); dg.addColorStop(0.38, n.light); dg.addColorStop(1, '#2a1b11'); g.fillStyle = dg; g.fillRect(0, 0, D, D); }   // [perf] before the faces arrive: a glowing dot in the person's own light, never an empty dark disc
const gr = g.createRadialGradient(D / 2, D / 2, r * 0.6, D / 2, D / 2, r); gr.addColorStop(0, 'rgba(8,4,12,0)'); gr.addColorStop(1, 'rgba(8,4,12,.42)'); g.fillStyle = gr; g.fillRect(0, 0, D, D); g.restore();
g.beginPath(); g.arc(D / 2, D / 2, r - rw * 0.5, 0, TAU); g.strokeStyle = n.light; g.globalAlpha = 0.9; g.lineWidth = rw; g.stroke(); return c;
};
const bigs = []; let bigTick = 0;
const bigOf = (n, need) => {
if (!faces) return null; n.bu = bigTick; if (n.big && n.big.width >= need) return n.big;
const D = Math.min(640, Math.ceil(need * 1.12 / 64) * 64); if (!n.big) { bigs.push(n); if (bigs.length > 14) { let o = bigs[0]; for (const q of bigs) if (q.bu < o.bu) o = q; bigs.splice(bigs.indexOf(o), 1); if (o.big) o.big.width = 0; o.big = null; } }
n.big = paint(n, D, n.big); return n.big;
};
const bakeAll = () => {
for (const o of bigs) { if (o.big) o.big.width = 0; o.big = null; } bigs.length = 0;
const job = ++baking; let i = 0; const some = () => { if (job !== baking) return; for (const end = Math.min(nodes.length, i + 12); i < end; i++) bake(nodes[i]); wake(); if (i < nodes.length) requestAnimationFrame(some); };
some();
};
const sprite = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
const haloCache = {};
const haloOf = (rgb) => { const k = rgb.join(','); return haloCache[k] || (haloCache[k] = sprite(96, 96, (g) => { const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48); gr.addColorStop(0, `rgba(${k},.7)`); gr.addColorStop(0.3, `rgba(${k},.4)`); gr.addColorStop(0.55, `rgba(${k},.14)`); gr.addColorStop(1, `rgba(${k},0)`); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); })); };
const core = sprite(48, 48, (g) => { const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,252,240,1)'); gr.addColorStop(0.16, 'rgba(255,242,212,.9)'); gr.addColorStop(0.45, 'rgba(255,214,150,.26)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); });
const glint = sprite(64, 64, (g) => { for (const [x0, y0, x1, y1] of [[0, 32, 64, 32], [32, 0, 32, 64]]) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(255,240,210,0)'); gr.addColorStop(0.5, 'rgba(255,244,222,.95)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; if (x0 === 0) g.fillRect(0, 31, 64, 2); else g.fillRect(31, 0, 2, 64); } const c = g.createRadialGradient(32, 32, 0, 32, 32, 12); c.addColorStop(0, 'rgba(255,250,235,1)'); c.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = c; g.fillRect(20, 20, 24, 24); });
const TINT = { ramayana: [255, 205, 130], mahabharata: [205, 198, 255], gods: [255, 226, 178] }; const tintOf = (r) => TINT[r.id] || TINT.gods;
const cometSpr = {};
const cometOf = (rgb) => { const k = rgb.join(','); return cometSpr[k] || (cometSpr[k] = { tail: sprite(128, 8, (g) => { const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, `rgba(${k},0)`); gr.addColorStop(0.7, `rgba(${k},.55)`); gr.addColorStop(1, 'rgba(255,248,230,.95)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 4); g.lineTo(128, 0.3); g.lineTo(128, 7.7); g.closePath(); g.fill(); }),
head: sprite(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,253,244,1)'); gr.addColorStop(0.12, 'rgba(255,246,222,.95)'); gr.addColorStop(0.32, `rgba(${k},.42)`); gr.addColorStop(1, `rgba(${k},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }) }); };
const NEB = { ramayana: [[255, 140, 52], [208, 54, 38]], mahabharata: [[74, 92, 224], [200, 42, 86]], gods: [[152, 84, 224], [242, 192, 94]] };
const blobCache = {};
const blobOf = (rgb) => { const k = rgb.join(','); return blobCache[k] || (blobCache[k] = sprite(256, 256, (g) => { for (const [x, y, rr, a] of [[128, 128, 128, 0.9], [92, 104, 90, 0.55], [168, 150, 80, 0.5]]) { const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${k},${a})`); gr.addColorStop(0.5, `rgba(${k},${a * 0.38})`); gr.addColorStop(1, `rgba(${k},0)`); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } })); };
const blobs = [];
{ const R = rng(7); for (const r of realms) { const tn = NEB[r.id] || NEB.gods; for (let j = 0; j < 3; j++) blobs.push({ r, tint: tn[j % 2], fx: (R() - 0.5) * (j ? 1.3 : 0.5), fy: (R() - 0.5) * (j ? 1.1 : 0.4), rx: 0, ry: 0, rf: j === 0 ? 1.28 : j === 1 ? 0.95 : 0.72, rad: 1, asp: 0.7 + R() * 0.3, rot: R() * TAU, rv: (R() - 0.5) * 0.012, a: j === 0 ? 0.2 : 0.15, ds: 0.03 + R() * 0.03, ph: R() * TAU }); } }
const font = getComputedStyle(sky.querySelector('.st-h1')).fontFamily; const SIZE = { legend: hi ? 17.5 : 15.5, lead: hi ? 16 : 14, cast: hi ? 15 : 13 };
let labels = null; let labelJob = 0; let labelDpr = 0;
const makeLabels = () => {
const job = ++labelJob; const s = Math.min(2, dpr); labelDpr = dpr; const rowH = hi ? 32 : 24; const SH = 1024 / s; const c = document.createElement('canvas'); c.width = 1024; c.height = Math.ceil(rowH * s * 28); const g = c.getContext('2d');
g.scale(s, s); g.textBaseline = 'middle'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(8,5,12,.85)'; g.fillStyle = '#f6ead9'; let x = 0; let y = 0; let i = 0; const lab = [];
const some = () => {
if (job !== labelJob) return;
for (const end = Math.min(nodes.length, i + 12); i < end; i++) { const n = nodes[i]; g.font = `500 ${SIZE[n.tier]}px ${font}`; const w = Math.ceil(g.measureText(short(n)).width) + 12; if (x + w > SH) { x = 0; y += rowH; } lab[i] = { x, y, w, h: rowH }; g.strokeText(short(n), x + w / 2, y + rowH / 2 + 1); g.fillText(short(n), x + w / 2, y + rowH / 2 + 1); x += w; }
if (i < nodes.length) return requestAnimationFrame(some);
nodes.forEach((n, j) => { n.lab = lab[j]; }); labels = { c, s }; wake();
};
requestAnimationFrame(some);
};
const LAYERS = [{ pf: 0.05, n: 250, s0: 0.6, s1: 1.0, a: 0.62, rgb: '196,204,255', v: 1.2 }, { pf: 0.13, n: 160, s0: 0.8, s1: 1.4, a: 0.75, rgb: '255,236,206', v: 2.2 }, { pf: 0.28, n: 80, s0: 1.1, s1: 2.0, a: 0.9, rgb: '255,226,184', v: 3.6 }];
let dust = [];
const dustInit = () => {
const R = rng(11); const area = clamp(W * H / (1440 * 900), 0.35, 1.5); dust = LAYERS.map((L, li) => {
const cnt = Math.round(L.n * area * QP[Q].dust); const p = [];
for (let i = 0; i < cnt; i++) {
let fx = R(); let fy = R();
if (li === 0 && R() < 0.4) { const u = R(); const off = (R() + R() + R() - 1.5) * 0.12; fx = u; fy = 0.78 - u * 0.56 + off; fy = ((fy % 1) + 1) % 1; }
p.push({ fx, fy, s: lerp(L.s0, L.s1, R() * R()), a: 0.35 + R() * 0.65, tw: R() < 0.5 ? 0.15 + R() * 0.45 : 0.05, ts: 0.5 + R() * 1.8, ph: R() * TAU, vx: (R() - 0.3) * L.v, vy: (R() - 0.5) * L.v * 0.5, bright: li > 0 && R() < (li === 2 ? 0.1 : 0.04) });
}
return p;
});
};
let sel = null; let hover = null; let kbd = false; let fr = null; let pressed = ''; let fs = 0; const pts = new Map();
const wander = { run: false, user: false, cur: null, nxt: null, e: null, rev: false, mode: 'off', t0: 0, hold: 8000, recent: [], visits: {}, hops: 0, fnode: null, guide: null, started: false };
const focusOf = () => sel || hover || (wander.run ? wander.fnode : null);
const sx = (x) => (x - cam.x) * cam.k + W / 2; const sy = (y) => (y - cam.y) * cam.k + H / 2;
const hit = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
const bez = (e, t) => { const u = 1 - t; const ax = e.a.x; const ay = e.a.y; const bx = e.b.x; const by = e.b.y; const mx = (ax + bx) / 2 - (by - ay) * 0.1 * e.bow; const my = (ay + by) / 2 + (bx - ax) * 0.1 * e.bow; return { x: u * u * ax + 2 * u * t * mx + t * t * bx, y: u * u * ay + 2 * u * t * my + t * t * by }; };
const qpath = (e, p) => {
const x0 = e.fb ? e.bx : e.ax; const y0 = e.fb ? e.by : e.ay; const x1 = e.fb ? e.ax : e.bx; const y1 = e.fb ? e.ay : e.by; ctx.moveTo(x0, y0);
if (p >= 0.999) return ctx.quadraticCurveTo(e.mx, e.my, x1, y1);
const u = 1 - p; ctx.quadraticCurveTo(x0 + (e.mx - x0) * p, y0 + (e.my - y0) * p, u * u * x0 + 2 * u * p * e.mx + p * p * x1, u * u * y0 + 2 * u * p * e.my + p * p * y1);
};
const QP4 = [0, 0, 0, 0]; const qpt = (e, t) => { const u = 1 - t; QP4[0] = u * u * e.ax + 2 * u * t * e.mx + t * t * e.bx; QP4[1] = u * u * e.ay + 2 * u * t * e.my + t * t * e.by; QP4[2] = 2 * u * (e.mx - e.ax) + 2 * t * (e.bx - e.mx); QP4[3] = 2 * u * (e.my - e.ay) + 2 * t * (e.by - e.my); return QP4; };
const labAt = (n, ci, f) => { const L = n.lab; const r = n.dr * (n === f ? 1.1 : 1); if (ci === 4) return [n.px - L.w / 2, n.py + r * 0.7 - L.h / 2]; return ci === 0 ? [n.px - L.w / 2, n.py + r + 5] : ci === 1 ? [n.px - L.w / 2, n.py - r - 5 - L.h] : ci === 2 ? [n.px + r - 5, n.py - L.h / 2] : [n.px - r + 5 - L.w, n.py - L.h / 2]; };
const edgeA = (x0, x1) => { const g = Math.min(W * 0.05, 36); return clamp01((Math.min(x0, W - x1) - g * 0.4) / g); };
const byRank = [...nodes].sort((a, b) => b.r - a.r || b.sc - a.sc || b.ties.length - a.ties.length || a.i - b.i); const titles = []; const placed = [];
const glow = document.createElement('canvas'); const gx = glow.getContext('2d'); let glowS = 3; let capR = null; let capF = 0; let introT = 0; let introDone = false; let introFast = false; let introHold = 0; let comets = []; let ripples = []; let shoot = null; let shootAt = 0;
const ptr = { x: 0, y: 0, tx: 0, ty: 0 }; const rwid = {};
const rnd = rng(5); const rndr = Math.random;
const draw = (now, dt, still) => {
const t = still ? 0 : now / 1000; const k = cam.k; const f = focusOf(); const d = dpr;
bigTick++; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingQuality = Q >= 1 ? 'low' : 'medium';
const intro = still || introDone ? 1 : clamp01(introT / 6.2); const neb = still || introDone ? 1 : clamp01((introT - 0.9) / 3.2); const ia = still || introDone ? 1 : clamp01((introT - 1.6) / 1.2); const capA = cap.classList.contains('is-in') && capR ? 1 : 0; capF += (capA - capF) * (still ? 1 : Math.min(1, dt * 3));
for (const n of nodes) {
const fl = still ? 0 : 3 / k * 0.85; const dx = Math.sin(t * n.sp + n.ph) * fl; const dy = Math.cos(t * n.sp * 0.8 + n.ph * 1.7) * fl;
n.px = sx(n.x + dx); n.py = sy(n.y + dy); n.pr = n.r * k; n.dr = Math.max(n.pr, FLOOR[n.tier]); n.vis = n.px > -n.dr * 3 - 40 && n.px < W + n.dr * 3 + 40 && n.py > -n.dr * 3 - 40 && n.py < H + n.dr * 3 + 40;
n.under = capF > 0.01 && capR && n.px > capR[0] - n.dr && n.px < capR[0] + capR[2] + n.dr && n.py > capR[1] - n.dr && n.py < capR[1] + capR[3] + n.dr ? 1 - 0.7 * capF : 1;
if (narrow && sel && n !== sel && n.py - n.dr * 0.7 < topH) n.under *= 0.2;   // a phone's card: nobody half under the chips
n.in = still || introDone ? 1 : clamp01((introT - n.bt) / 0.75);
}
for (const e of edges) {
const a = e.a; const b = e.b; e.ax = a.px; e.ay = a.py; e.bx = b.px; e.by = b.py; e.mx = (e.ax + e.bx) / 2 - (e.by - e.ay) * 0.1 * e.bow; e.my = (e.ay + e.by) / 2 + (e.bx - e.ax) * 0.1 * e.bow;
e.vis = Math.min(e.ax, e.bx, e.mx) < W + 40 && Math.max(e.ax, e.bx, e.mx) > -40 && Math.min(e.ay, e.by, e.my) < H + 40 && Math.max(e.ay, e.by, e.my) > -40;
e.hot = Math.max(a.hot, b.hot); e.prog = still || introDone ? 1 : ease01(introT, e);
}
const dimG = 1 - 0.76 * fs; ctx.globalCompositeOperation = 'lighter';
const gs = glowS; gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, glow.width, glow.height); gx.setTransform(1 / gs, 0, 0, 1 / gs, 0, 0); gx.globalCompositeOperation = 'lighter';
if (blobs.length) {
const ho = (x, y) => [(x - home.x) * home.k + W / 2, (y - home.y) * home.k + H / 2]; const ks = home.k + (k - home.k) * 0.55; const na = QP[Q].neb; const px = -ptr.x * 7; const py = -ptr.y * 5;
for (let i = 0; i < blobs.length; i++) {
const b = blobs[i]; if (i % 3 >= na) continue; const wx = b.r.cx + b.rx + Math.sin(t * b.ds + b.ph) * 36; const wy = b.r.cy + b.ry + Math.cos(t * b.ds * 0.8 + b.ph) * 28; const h = ho(wx, wy);
const x = h[0] + (sx(wx) - h[0]) * 0.58 + px; const y = h[1] + (sy(wy) - h[1]) * 0.58 + py; const rad = b.rad * ks; if (x < -rad || x > W + rad || y < -rad || y > H + rad) continue;
const al = b.a * (0.82 + 0.18 * Math.sin(t * 0.17 + b.ph * 2)) * neb * (0.6 + 0.4 * b.r.a) * (1 - 0.34 * fs); const ang = b.rot + t * b.rv; const cs = Math.cos(ang) * d; const sn = Math.sin(ang) * d;
gx.globalAlpha = al; gx.setTransform(cs / gs, sn / gs, -sn / gs, cs / gs, x / gs, y / gs); gx.drawImage(blobOf(b.tint), -rad, -rad * b.asp, rad * 2, rad * 2 * b.asp);
}
gx.setTransform(1 / gs, 0, 0, 1 / gs, 0, 0);
}
for (const n of nodes) {
if (!n.vis || n.in <= 0.01) continue; const lit = !f || n === f || f.near.has(n.id); const a = n.in * n.dim * n.under * (0.45 + 0.55 * n.realm.a); const br = still ? 0 : Math.sin(t * 0.8 + n.ph);
const zf = clamp01((n.pr - 12) / 26); const hr = n.dr * lerp(1.55, n.tier === 'legend' ? 3.2 : n.tier === 'lead' ? 2.7 : 2.3, zf) * (1 + 0.5 * n.glow + 0.25 * n.hot); const ha = Math.min(1, a * lerp(0.4, 1, zf) * (n.tier === 'cast' && !lit ? 0.5 : 0.62 + 0.14 * br + 0.5 * n.glow + 0.5 * n.hot)); if (ha < 0.01 || !halo(n)) continue;
gx.globalAlpha = ha; gx.drawImage(halo(n), n.px - hr, n.py - hr, hr * 2, hr * 2);
}
ctx.globalAlpha = 1; ctx.drawImage(glow, 0, 0, W, H);
{ const PXs = W + 160; const PYs = H + 160; const fade = still || introDone ? 1 : clamp01(introT / 1.3); const sh = still ? 0 : 1;
dust.forEach((L, li) => {
const Ly = LAYERS[li]; const zs = Math.pow(k / home.k, Ly.pf * 0.5); const sxp = cam.x * home.k * Ly.pf; const syp = cam.y * home.k * Ly.pf; const ox = -ptr.x * Ly.pf * 30; const oy = -ptr.y * Ly.pf * 20;
const P = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]; let gl = null;
for (const p of L) {
let x = ((p.fx * PXs + p.vx * t * sh - sxp + ox) % PXs + PXs) % PXs - 80; let y = ((p.fy * PYs + p.vy * t * sh - syp + oy) % PYs + PYs) % PYs - 80; x = W / 2 + (x - W / 2) * zs; y = H / 2 + (y - H / 2) * zs;
if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue; const a = p.a * (1 - p.tw * (1 + Math.sin(t * p.ts + p.ph))) * Ly.a;
if (p.bright) { (gl || (gl = [])).push(x, y, p.s, a); continue; }
P[Math.min(3, (a * 4.6) | 0)].rect(x - p.s / 2, y - p.s / 2, p.s, p.s);
}
ctx.globalAlpha = fade; for (let q = 0; q < 4; q++) { ctx.fillStyle = `rgba(${Ly.rgb},${((q + 1) * 0.22).toFixed(2)})`; ctx.fill(P[q]); }
if (gl) for (let q = 0; q < gl.length; q += 4) { const g = gl[q + 2] * (li === 2 ? 6.5 : 4.5) * (0.8 + 0.4 * Math.sin(t * 1.3 + q)); ctx.globalAlpha = fade * clamp01(gl[q + 3] * 1.2); ctx.drawImage(glint, gl[q] - g, gl[q + 1] - g, g * 2, g * 2); }
});
}
if (!still && intro >= 1) {
if (!shoot && now > shootAt && !(shootAt === 0)) { const ang = (0.25 + rndr() * 0.3) * (rndr() < 0.5 ? 1 : -1) + (rndr() < 0.5 ? 0 : PI); shoot = { t0: now, x: W * (0.15 + rndr() * 0.7), y: H * (0.1 + rndr() * 0.35), a: ang, L: 240 + rndr() * 160, dur: 1100 + rndr() * 500 }; }
if (!shootAt) shootAt = now + 9000 + rndr() * 8000;
if (shoot) { const s = (now - shoot.t0) / shoot.dur; if (s >= 1) { shoot = null; shootAt = now + 20000 + rndr() * 20000; } else { const hx = shoot.x + Math.cos(shoot.a) * shoot.L * 2.2 * s; const hy = shoot.y + Math.sin(shoot.a) * shoot.L * 2.2 * s; const tx = hx - Math.cos(shoot.a) * shoot.L; const ty = hy - Math.sin(shoot.a) * shoot.L; const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(255,236,200,0)'); g.addColorStop(1, 'rgba(255,248,232,.9)'); ctx.globalAlpha = Math.sin(PI * s) * 0.8; ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke(); ctx.globalAlpha = Math.sin(PI * s); ctx.drawImage(core, hx - 7, hy - 7, 14, 14); } }
}
ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const lw = 0.9 + 0.35 * Math.min(1, k);
for (let g = 0; g < 4; g++) {
const sh = still ? 1 : 0.78 + 0.22 * Math.sin(t * 0.55 + g * 1.7); ctx.globalAlpha = ia * dimG; ctx.lineWidth = lw;
ctx.beginPath(); for (const e of withE) if (e.g === g && e.n > 1 && e.vis && e.hot < 0.02 && e.prog > 0) qpath(e, e.prog); ctx.strokeStyle = `rgba(222,216,255,${(0.085 * sh).toFixed(3)})`; ctx.stroke();
ctx.beginPath(); for (const e of named) if (e.g === g && e.vis && e.hot < 0.02 && e.prog > 0) qpath(e, e.prog); if (QP[Q].wide) { ctx.lineWidth = lw * 4.2; ctx.strokeStyle = `rgba(${GOLD},${(0.05 * sh).toFixed(3)})`; ctx.stroke(); } ctx.lineWidth = lw * 1.15; ctx.strokeStyle = `rgba(${GOLD},${(0.4 * sh).toFixed(3)})`; ctx.stroke();
}
if (f || fs > 0.01) for (const e of edges) {
if (e.hot < 0.02 || !e.vis) continue; const tour = wander.run && wander.e && f === wander.fnode; const h = e.hot * (tour && e !== wander.e ? 0.36 : 1); const tw = tour && e === wander.e ? 1.5 : 1; ctx.globalAlpha = 1;
if (e.named) { ctx.lineWidth = lw * 6 * tw; ctx.strokeStyle = `rgba(${GOLD},${(0.16 * h).toFixed(3)})`; ctx.beginPath(); qpath(e, 1); ctx.stroke(); ctx.lineWidth = lw * 1.8 * tw; ctx.strokeStyle = `rgba(255,228,176,${(0.92 * h).toFixed(3)})`; ctx.stroke(); }
else { ctx.lineWidth = lw * 1.1; ctx.strokeStyle = `rgba(232,226,255,${(0.34 * h * (e.n > 1 ? 1 : 0.7)).toFixed(3)})`; ctx.beginPath(); qpath(e, 1); ctx.stroke(); }
}
if (!still) { drawComets(now, dt, f); if (wander.guide && wander.guide.e) drawComet(wander.guide, 1.9); }
for (const n of nodes) {
if (!n.vis || n.in <= 0.01) continue; const a = n.in * n.dim * n.under * (0.45 + 0.55 * n.realm.a); const pr = n.dr; const br = still ? 0 : Math.sin(t * 0.8 + n.ph);
if (pr > 12) { const rr = pr * (1.14 + 0.04 * br) * (1 + 0.1 * n.glow); ctx.globalAlpha = a * (0.22 + 0.1 * br + 0.5 * n.hot) * clamp01((pr - 12) / 6); ctx.lineWidth = 1; ctx.strokeStyle = `rgb(${n.rgb[0]},${n.rgb[1]},${n.rgb[2]})`; ctx.beginPath(); ctx.arc(n.px, n.py, rr, 0, TAU); ctx.stroke(); }
}
if (!still) { for (const n of nodes) { const u = (now - n.pulse) / 1500; if (u < 0 || u > 1 || !n.vis) continue; ctx.globalAlpha = 0.5 * Math.pow(1 - u, 1.6) * n.dim; ctx.lineWidth = 1.5 * (1 - u) + 0.5; ctx.strokeStyle = `rgb(${n.rgb[0]},${n.rgb[1]},${n.rgb[2]})`; ctx.beginPath(); ctx.arc(n.px, n.py, n.dr * (1.08 + 0.85 * easeOut(u)), 0, TAU); ctx.stroke(); } }
ctx.globalCompositeOperation = 'source-over';
for (let pass = 0; pass < 2; pass++) for (const n of nodes) {
if (!n.vis || n.px < -n.dr * 1.3 || n.px > W + n.dr * 1.3 || n.py < -n.dr * 1.3 || n.py > H + n.dr * 1.3 || n.in <= 0.01 || (pass === 0) === (f ? n === f || f.near.has(n.id) : false)) continue;
const a = n.in * n.dim * n.under * (0.3 + 0.7 * n.realm.a); if (a <= 0.01) continue;
const br = still ? 0 : Math.sin(t * 0.8 + n.ph); const r = n.dr * (1 + 0.012 * br + 0.07 * n.hot + 0.04 * n.glow) * (0.6 + 0.4 * easeBack(n.in));
let sp = r * 2 * dpr < 76 && n.sm ? n.sm : n.spr; if (n === f && sp === n.spr && sp && r * 2 * dpr > sp.width * 1.12) sp = bigOf(n, r * 2 * dpr) || sp; ctx.globalAlpha = a; if (sp) ctx.drawImage(sp, n.px - r, n.py - r, r * 2, r * 2); else { ctx.fillStyle = '#2a1b11'; ctx.beginPath(); ctx.arc(n.px, n.py, r, 0, TAU); ctx.fill(); }
if (r < 16) { ctx.globalAlpha = a * 0.85; ctx.lineWidth = 1; ctx.strokeStyle = n.light; ctx.beginPath(); ctx.arc(n.px, n.py, r, 0, TAU); ctx.stroke(); }
}
if (f && f.vis) { ctx.globalCompositeOperation = 'lighter'; const r = f.dr * 1.1; ctx.globalAlpha = 0.5 + (still ? 0 : 0.2 * Math.sin(t * 1.6)); ctx.lineWidth = 1.6; ctx.strokeStyle = `rgb(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]})`; ctx.beginPath(); ctx.arc(f.px, f.py, r * 1.07, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
if (f && f.vis && kbd && document.activeElement === stage) { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(f.px, f.py, f.dr * 1.1 + 6, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
if (!still && wander.run && wander.mode === 'hold' && wander.nxt && f === wander.fnode) {
const m = wander.nxt; const ra = clamp01((now - wander.t0 - 900) / 900); const R = freeRect('cap');
if (ra > 0.01) {
if (m.px > R.x0 - 24 && m.px < R.x1 + 24 && m.py > R.y0 - 24 && m.py < R.y1 + 24) {
const u = (t * 0.55) % 1; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgb(255,226,170)'; ctx.lineWidth = 1.4; ctx.globalAlpha = ra * 0.55; ctx.beginPath(); ctx.arc(m.px, m.py, m.dr * 1.2, 0, TAU); ctx.stroke();
ctx.lineWidth = 1.1; ctx.globalAlpha = ra * 0.5 * (1 - u); ctx.beginPath(); ctx.arc(m.px, m.py, m.dr * (1.2 + 0.75 * u), 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
} else {
let dx = m.px - f.px; let dy = m.py - f.py; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl; const tx = dx > 0 ? (R.x1 - 16 - f.px) / dx : dx < 0 ? (R.x0 + 16 - f.px) / dx : 1e9; const ty = dy > 0 ? (R.y1 - 16 - f.py) / dy : dy < 0 ? (R.y0 + 16 - f.py) / dy : 1e9; const tt = Math.max(0, Math.min(tx, ty));
const bx = f.px + dx * tt + dx * 3 * Math.sin(t * 3); const by = f.py + dy * tt + dy * 3 * Math.sin(t * 3); ctx.globalAlpha = ra * 0.9; ctx.fillStyle = 'rgb(255,226,170)'; ctx.strokeStyle = 'rgba(8,5,16,.7)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
ctx.beginPath(); ctx.moveTo(bx + dx * 9, by + dy * 9); ctx.lineTo(bx - dx * 5 - dy * 8, by - dy * 5 + dx * 8); ctx.lineTo(bx - dx * 5 + dy * 8, by - dy * 5 - dx * 8); ctx.closePath(); ctx.stroke(); ctx.fill();
}
}
}
titles.length = 0; placed.length = 0;
const far = clamp01((rest.k * 1.5 - k) / (rest.k * 0.5)); const ta = far * 0.78 * (f ? 0.3 : 1) * clamp01(intro * 3 - 1.4);
if (ta > 0.01) {
const base = Math.max(13, Math.min(narrow ? 21 : 30, 40 * k)); ctx.fillStyle = `rgb(${GOLD})`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `500 ${base.toFixed(1)}px ${font}`; try { ctx.letterSpacing = hi ? '0px' : '0.16em'; } catch (e) {}
let bs = base; let items = [];
for (let it = 0; it < 7; it++) {
ctx.font = `500 ${bs.toFixed(1)}px ${font}`;
items = realms.map((r) => { const s = hi ? r.name : r.name.toUpperCase(); const ck = s + bs.toFixed(1); const w = (rwid[ck] || (rwid[ck] = ctx.measureText(s).width)) + 10; const x0 = sx(r.cx); const xc = clamp(x0, w / 2 + 12, W - w / 2 - 12); const pin = Math.abs(xc - x0) < w * 0.7; return { r, s, w, x: pin ? xc : x0, pin, y: sy(r.cy - r.hh - (TITLE - 20)) }; });
const vis = items.filter((u) => u.pin && u.r.a > 0.3); let ok = true;
for (const u of vis) for (const v of vis) if (u !== v && u.x < v.x && u.x + u.w / 2 + 8 > v.x - v.w / 2 && Math.abs(u.y - v.y) < bs * 2.4) ok = false;
if (ok || bs <= 11) break; bs *= 0.88;
}
for (const u of items) { const r = u.r; const { s, w, x, y } = u; const a = ta * r.a * (u.pin ? 1 : edgeA(x - w / 2, x + w / 2)) * clamp01((y - bs - topH) / 12) * clamp01((H - 80 - y) / 12); if (a < 0.02) continue; ctx.globalAlpha = a; ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,5,16,.88)'; ctx.strokeText(s, x, y); ctx.fillText(s, x, y); titles.push([x - w / 2, y - bs / 2, w, bs]); }
try { ctx.letterSpacing = '0px'; } catch (e) {}
}
if (labels) {
for (const p of titles) placed.push(p);
if (narrow && sel) placed.push([0, boxHpx * 0.52 - 6, W, 400]);   // a phone's card holds the lower half: no name is set across its edge
for (const q of ctlRects) placed.push(q); if (capR && capF > 0.01) placed.push(capR);
const touring = f && wander.run && !sel && !hover; const order = touring ? [f, ...(wander.nxt ? [wander.nxt] : []), ...f.kinL].filter((n, i, a) => a.indexOf(n) === i) : f ? [f, ...f.kinL, ...f.nearL] : byRank; const sfar = 1;
for (const n of nodes) n.want = 0; let nl = 0; const lmax = f || !narrow ? 99 : k < home.k * 1.35 ? 8 : 12;   // (a phone's whole sky names only the few best known; a realm, a dozen)
for (const n of order) {
if (nl >= lmax) break; if (!n.vis || n.in < 0.5) continue; if (!f && n.tier === 'cast' && n.pr < 15) continue; if (!f && n.tier === 'lead' && n.pr < 13) continue; if (!f && n.pr < 12) continue; if (f && n !== f && (n.pr < 9 || n.dim < 0.4)) continue;
const L = n.lab; if (!L) continue; let done = false;
const seq = n.lci > 0 ? [n.lci, 0, 1, 2, 3] : [0, 1, 2, 3];
const top = n.rank <= 1 && !f;
for (let pas = 0; pas < (top ? 3 : 2) && !done; pas++) for (const ci of pas === 2 ? [4, 0, 1] : seq) {
const cp = labAt(n, ci, f); const lx = cp[0]; const ly = cp[1];
const la = (f ? 1 : n.realm.a) * edgeA(lx + 4, lx + L.w - 4) * clamp01((ly + 4 - topH) / 8) * clamp01((H - 60 - ly - L.h + 4) / 8); if (la < (pas ? 0.5 * (f ? 1 : n.realm.a) : 0.9 * (f ? 1 : n.realm.a))) continue;
const ty = ly + L.h / 2 - 7; let ok = true; for (const p of placed) if (hit(lx - 4, ty - 4, L.w + 8, 22, p[0], p[1], p[2], p[3])) { ok = false; break; }   // [fixGC] a little more air between two names
const mg = pas === 2 || ci === 0 ? 0 : ci === 1 ? 4 : 10;
if (ok && n !== f) for (const m of nodes) if (m !== n && !(pas === 2 && m.rank > n.rank) && m.vis && m.in > 0.3 && hit(lx + 6 - mg, ty + 1 - mg, L.w - 12 + mg * 2, 12 + mg * 2, m.px - m.dr * 0.9, m.py - m.dr * 0.9, m.dr * 1.8, m.dr * 1.8)) { ok = false; break; }
if (!ok) continue; placed.push([lx, ty, L.w, 14]); n.want = la; n.lci = ci; done = true; nl++; break;
}
if (!done) n.lci = 0;
}
for (const n of nodes) {
n.la += (n.want - n.la) * (still ? 1 : Math.min(1, dt * 7)); if (n.la < 0.03 || !n.vis) continue; const L = n.lab; const cp = labAt(n, n.lci, f); const lx = cp[0]; const ly = cp[1];
ctx.globalAlpha = n.la * n.in * (f ? (n === f || f.kin.has(n.id) ? 1 : 0.86) : 1) * Math.max(0.72, n.dim); ctx.drawImage(labels.c, L.x * labels.s, L.y * labels.s, L.w * labels.s, L.h * labels.s, lx, ly, L.w, L.h);
}
}
if (f && f.vis && k >= 0.75 && fs > 0.6 && labels) {
ctx.font = `italic 400 ${hi ? 13.5 : 13}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 4.6; ctx.strokeStyle = 'rgba(8,5,16,.9)'; let cnt = 0; const tourE = wander.run && f === wander.fnode ? wander.e : null;
for (const e of f.namedE) {
if (!e.vis || e.hot < 0.9 || cnt > 7) continue; const o = e.a === f ? e.b : e.a; if (!o.vis || o.pr < 12 || (tourE && e !== tourE)) continue; const t = f.ties.find((u) => u.k === o.id); if (!t) continue;
const txt = t.ph.replace('{n}', short(o)); const pt = qpt(e, 0.5); const mx = pt[0]; const my = pt[1]; const tl = Math.hypot(pt[2], pt[3]) || 1; let nx = -pt[3] / tl; let ny = pt[2] / tl; if (ny > 0) { nx = -nx; ny = -ny; }
const w = (e.lw && e.lwT === txt ? e.lw : (e.lw = ctx.measureText(txt).width, e.lwT = txt, e.lw)) + 8; const x = mx + nx * 12; const y = my + ny * 12 - 2;
let cl = 1; for (const c of comets) if (c.e === e && c.wait <= 0) { const q2 = qpt(e, clamp01(c.fwd ? c.u : 1 - c.u)); cl = Math.min(cl, clamp01(Math.hypot(q2[0] - mx, q2[1] - my) / 64)); }
if (x - w / 2 < 8 || x + w / 2 > W - 8 || y < topH + 6 || y > H - 70) continue; let ok = true; for (const p of placed) if (hit(x - w / 2, y - 8, w, 16, p[0], p[1], p[2], p[3])) { ok = false; break; } for (const m of nodes) if (m.vis && m.in > 0.3 && hit(x - w / 2, y - 8, w, 16, m.px - m.dr * 1.05, m.py - m.dr * 1.05, m.dr * 2.1, m.dr * 2.1)) { ok = false; break; } if (!ok) continue;
if (Math.hypot(x - f.px, y - f.py) < f.dr * 1.6 || Math.hypot(x - o.px, y - o.py) < o.dr * 1.4) continue;
placed.push([x - w / 2, y - 8, w, 16]); ctx.globalAlpha = 0.9 * fs * (0.3 + 0.7 * cl); ctx.strokeText(txt, x, y); ctx.fillStyle = 'rgb(247,214,150)'; ctx.fillText(txt, x, y); cnt++;
}
}
ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
};
const ease01 = (T, e) => { const s = clamp01((T - e.t0) / 1.5); return s * s * (3 - 2 * s); };
const halo = (n) => n.halo || (n.rgb ? (n.halo = haloOf(n.rgb)) : null);
const guideOf = () => (wander.guide || (wander.guide = { e: null, fwd: true, u: 0, v: 0, tint: [255, 236, 200], a: 1, tail: 120, rad: 1 }));
const drawComet = (c, sc) => {
const e = c.e; const u = c.fwd ? c.u : 1 - c.u; const p = qpt(e, clamp01(u)); const sgn = c.fwd ? 1 : -1; const ang = Math.atan2(p[3] * sgn, p[2] * sgn); const cs = Math.cos(ang) * dpr; const sn = Math.sin(ang) * dpr; const ts = cometOf(c.tint);
const da = Math.hypot(p[0] - e.a.px, p[1] - e.a.py) - e.a.dr - 3; const db = Math.hypot(p[0] - e.b.px, p[1] - e.b.py) - e.b.dr - 3;
const fade = Math.min(1, c.u / 0.1, (1 - c.u) / 0.1, clamp01(da / 10), clamp01(db / 10)); const edim = e.hot > 0.02 ? 1 : 1 - 0.7 * fs; ctx.globalAlpha = fade * c.a * edim; ctx.setTransform(cs, sn, -sn, cs, p[0] * dpr, p[1] * dpr);
const L = Math.min(c.tail * Math.max(0.5, cam.k), 120 * sc) * (0.4 + 0.6 * Math.min(1, c.u * 4)); const h = 3.4 * sc; ctx.drawImage(ts.tail, -L, -h / 2, L, h); const g = 11 * sc * c.rad; ctx.drawImage(ts.head, -g, -g, g * 2, g * 2);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
const spawn = (c, f) => {
const list = named; let e = null; let tries = 0;
while (tries++ < 7) {
const tour = wander.run && wander.e && f === wander.fnode; const cand = tour && rndr() < 0.5 ? wander.e : f && f.namedE.length && rndr() < (tour ? 0.4 : 0.72) ? f.namedE[(rndr() * f.namedE.length) | 0] : list[(rndr() * list.length) | 0];
if (cand && cand.vis && cand.prog >= 0.999) { e = cand; break; }
}
if (!e) { c.e = null; c.wait = 0.4 + rndr(); return; }
c.e = e; c.u = 0; c.v = (62 + rndr() * 50) / e.len * (f && (e.a === f || e.b === f) ? 1.35 : 1); c.fwd = e.flow ? e.flow > 0 : rndr() < 0.5; if (f && (e.a === f || e.b === f) && !e.flow) c.fwd = e.a === f;
const src = c.fwd ? e.a : e.b; c.tint = tintOf(src.realm); c.a = 0.62 + rndr() * 0.3; c.tail = 38 + rndr() * 50; c.rad = 0.8 + rndr() * 0.5;
};
const drawComets = (now, dt, f) => {
ctx.globalCompositeOperation = 'lighter'; const want = introDone || introT > 4.2 ? QP[Q].comets : 0;
while (comets.length < want) comets.push({ e: null, wait: rndr() * 2.5, u: 0, v: 0, fwd: true, tint: TINT.gods, a: 1, tail: 60, rad: 1 });
if (comets.length > want) comets.length = want;
for (const c of comets) {
if (c.wait > 0) { c.wait -= dt; continue; }
if (!c.e) { spawn(c, f); continue; }
c.u += c.v * dt;
if (c.u >= 1) { const dest = c.fwd ? c.e.b : c.e.a; dest.pulse = now; dest.glow = Math.min(1, dest.glow + 0.45); c.e = null; c.wait = 0.2 + rndr() * 2.2; continue; }
if (c.e.vis) drawComet(c, 1);
}
};
let raf = 0; let last = 0; let shown = true; let dirty = true; let ema = 16; let slow = 0; let lastQ = 0; let lastInput = performance.now(); let wanderBusy = 0;
const wake = () => { dirty = true; if (!raf && shown) raf = requestAnimationFrame(frame); };
const ctlRects = [];
const update = (now, dt, still) => {
if (morphBusy()) { const step = still ? 1 : dt / 1.1; for (const r of realms) { const tg = r === unf ? 1 : 0; r.m = r.m < tg ? Math.min(tg, r.m + step) : Math.max(tg, r.m - step * 1.2); } morph(); }
if (!introDone) {
const hold = !faces && introT > 1.05 && introHold < 1.2 && !introFast; if (hold) introHold += dt; else introT += dt * (introFast ? 6 : 1);
if (introT >= 5.7 || still) { introDone = true; introT = 7; }
}
if (!hd && cam.k > 1.3 && !netSlow()) wantHd(); if (!xl && introDone && (cam.k > 1.4 || sel || wander.run) && (!netSlow() || sel)) wantXl();   // [perf] the sky's own drift never pulls the 0.4-0.65 MB sheets over a slow line; a touch or a chosen person still does
if (flight) {
let s = clamp01((now - flight.t0) / flight.dur); const e = flight.out ? easeOut(s) : ss(s); const F = flight; const k = Math.exp(lerp(Math.log(F.from.k), Math.log(F.to.k), e)) * (1 - F.bump * Math.sin(PI * e));
if (F.edge) { const p = bez(F.edge, F.rev ? 1 - e : e); const c = camFor(p.x, p.y, k, F.r || freeRect(panel)); cam.x = c.x; cam.y = c.y; cam.k = c.k; }
else { cam.x = lerp(F.from.x, F.to.x, e); cam.y = lerp(F.from.y, F.to.y, e); cam.k = k; }
if (s >= 1) { flight = null; cam.x = F.to.x; cam.y = F.to.y; cam.k = F.to.k; Object.assign(to, cam); F.done && F.done(); }
if (wander.guide && wander.guide.e && wander.mode === 'travel') { const g = wander.guide; g.u = clamp01(s + 0.05 * (1 - s) + 0.02); }
} else {
if (Math.abs(vel.x) + Math.abs(vel.y) > 2) { to.x -= vel.x * dt / cam.k; to.y -= vel.y * dt / cam.k; clampCam(to); const fr2 = Math.exp(-dt / 0.28); vel.x *= fr2; vel.y *= fr2; cam.x = to.x; cam.y = to.y; }
const a = ease && !still ? 1 - Math.exp(-dt / ease) : 1; const dx = to.x - cam.x; const dy = to.y - cam.y; const dk = to.k - cam.k;
if (Math.abs(dx) * cam.k > 0.15 || Math.abs(dy) * cam.k > 0.15 || Math.abs(dk) > 0.0004) { cam.x += dx * a; cam.y += dy * a; cam.k += dk * a; } else { cam.x = to.x; cam.y = to.y; cam.k = to.k; }
}
const f = focusOf(); const tf = f ? 1 : 0; const tour = wander.run && wander.nxt && f === wander.fnode; fs += (tf - fs) * (still ? 1 : Math.min(1, dt * 2.4));
const rate = still ? 1 : Math.min(1, dt * 3);
for (const n of nodes) { const lit = !f || n === f || f.near.has(n.id); const tg = !lit ? 0.25 : tour && n !== f && n !== wander.nxt ? 0.55 : 1; n.dim += (tg - n.dim) * (tg > n.dim ? rate : rate * 0.6); n.hot += ((n === f ? 1 : 0) - n.hot) * (n === f ? rate * 1.2 : rate * 0.7); n.glow = still ? 0 : n.glow * Math.exp(-dt * 1.5); if (Math.abs(n.dim - tg) < 0.004) n.dim = tg; if (n.hot < 0.003 && n !== f) n.hot = 0; }
for (const r of realms) { const tg = !fr || r === fr ? 1 : 0.16; r.a += (tg - r.a) * (still ? 1 : Math.min(1, dt * 4)); if (Math.abs(r.a - tg) < 0.004) r.a = tg; }
if (!still && !coarse) { ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 2.2); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 2.2); } else { ptr.x = ptr.y = 0; }
if (!still && introDone) { if (!nextWave) nextWave = now + 12000; else if (now > nextWave) { wave(now); nextWave = now + 26000 + rndr() * 18000; } wavePulse(now); }
wTick(now, still);
};
const moving = () => flight || morphBusy() || vel.x * vel.x + vel.y * vel.y > 4 || Math.abs(to.x - cam.x) * cam.k > 0.15 || Math.abs(to.y - cam.y) * cam.k > 0.15 || Math.abs(to.k - cam.k) > 0.0004;
const frame = (now) => {
raf = 0; if (!shown) return;
const q = QP[Q]; const gap = now - last;
const idle = !wander.run && !flight && !pts.size && !drag && !sel && !hover && introDone && !calm() && !moving(); const fcap = q.fps || (idle ? 30 : 0);
if (fcap && last && gap < 1000 / fcap - 2) { if (!raf) raf = requestAnimationFrame(frame); return; }
if (last && gap > 400) { const shift = gap - 16; if (flight) flight.t0 += shift; wander.t0 += shift; wanderBusy += shift; lastInput += shift; if (shoot) shoot.t0 += shift; if (shootAt) shootAt += shift; if (nextWave) nextWave += shift; }
const dt = Math.min(0.05, Math.max(0.001, (last ? gap : 16) / 1000)); last = now;
const still = calm(); if (still !== wasCalm) calmChanged(still);
update(now, dt, still);
if (!still || dirty || moving()) { draw(now, dt, still); dirty = false; }
if (!still && introT > 1.5 && gap < 250) { ema += (gap - ema) * 0.08; if (ema > (fcap ? 1000 / fcap * 1.25 : 24)) slow++; else slow = Math.max(0, slow - 2); if (slow > 24 && Q < QP.length - 1 && now - lastQ > 2500) { Q++; lastQ = now; slow = 0; ema = 16; applyQ(); } }
if (shown && !raf && (!still || dirty || moving())) raf = requestAnimationFrame(frame);
};
const applyQ = () => { size(true); dustInit(); comets.length = 0; };
const calmChanged = (still) => {
wasCalm = still; sky.classList.toggle('is-calm', still);
if (still) { stopFlight(); Object.assign(cam, to); wStop(); capHide(); if (!sel) setPanel('none'); introDone = true; introT = 7; comets.length = 0; shoot = null; wander.guide = null; ripples.length = 0; }
else { wander.user = false; if (introDone && !sel) wSoon(); }
wLabel(); wake();
};
const io = new IntersectionObserver((es) => {
const r = es[0].intersectionRatio; shown = r > 0.04 && !document.hidden; if (shown) { last = 0; wake(); }
for (const b of sky.querySelectorAll('[data-st-view]')) b.setAttribute('aria-pressed', String((b.dataset.stView === 'sky') === (r >= 0.5)));
}, { threshold: [0, 0.04, 0.5] });
io.observe(sky);
on(document, 'visibilitychange', () => { const v = !document.hidden; if (v && !shown) { shown = true; last = 0; wake(); } else if (!v) shown = false; });
let metrics = false;
const measureCtl = () => { ctlRects.length = 0; const s = stage.getBoundingClientRect(); for (const el of sky.querySelectorAll('.st-ctl, .st-wander, .st-cue')) { const z = el.getBoundingClientRect(); if (z.width) ctlRects.push([z.left - s.left - 6, z.top - s.top - 6, z.width + 12, z.height + 12]); } dirty = true; };
on(sky, 'animationend', (e) => { if (e.target.matches('.st-top, .st-ctl, .st-foot')) { measureCtl(); wake(); } });
const size = (force) => {
const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
const d0 = Math.min(QP[Q].dpr, window.devicePixelRatio || 1); const d = Math.min(d0, Math.sqrt(QP[Q].px / (r.width * r.height)));
if (!force && r.width === W && r.height === H && d === dpr) return;
const was = W; boxHpx = boxEl.getBoundingClientRect().height || r.height; W = r.width; H = r.height; dpr = d; cv.width = Math.round(W * d); cv.height = Math.round(H * d); narrow = W <= 700; FLOOR = narrow ? FLOORS.narrow : FLOORS.wide; glowS = Q >= 2 ? 4 : 3; glow.width = Math.ceil(W / glowS); glow.height = Math.ceil(H / glowS); gx.imageSmoothingQuality = 'low';
{ const tr = topEl.getBoundingClientRect(); const br = boxEl.getBoundingClientRect(); topH = Math.max(56, Math.round(tr.top - br.top + [...topEl.children].reduce((m, c) => Math.max(m, c.getBoundingClientRect().bottom - tr.top), 0) + 6)); sky.style.setProperty('--st-top', topH + 'px'); }
measureCtl();
wide = W > H * 1.15; arrange(); const rearr = layoutKey !== lastKey; lastKey = layoutKey;
kMin = fitK(ovBox, freeRect('none'), padOf()) * 0.9; const hm = fitBox(ovBox, freeRect('none'), padOf()); hm.k = Math.min(hm.k, narrow ? 1.3 : 1.6); Object.assign(home, camFor((ovBox.x0 + ovBox.x1) / 2, (ovBox.y0 + ovBox.y1) / 2, hm.k, freeRect('none')));
{ const rr = freeRect('none'); const b = realmBox(realms[0]); const kr = clamp(fitK(b, rr, padOf()), kMin, K_MAX); restRealm = !wide && home.k * 54 < 46 && kr > home.k * 1.2 ? realms[0] : null;
Object.assign(rest, restRealm ? camFor((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, kr, rr) : home); }
if (first || (atHome && homeSel !== 'sky')) setUnf(restRealm, true); else if (atHome) setUnf(null, true); else setUnf(unf, true);
if (first) {
first = false; const calmNow = calm(); sky.classList.toggle('is-calm', calmNow); wasCalm = calmNow;
Object.assign(cam, rest); Object.assign(to, rest); if (restRealm) quietRealm(restRealm); if (!calmNow) { cam.k = rest.k * 0.82; flight = { t0: performance.now(), dur: 4600, from: { x: cam.x, y: cam.y, k: cam.k }, to: { x: rest.x, y: rest.y, k: rest.k }, bump: 0, edge: null, rev: false, out: true, done: null, r: null }; }
else { introDone = true; introT = 7; }
if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(makeLabels); else makeLabels();
dustInit(); bakeAll();
loadFaces(sky.dataset.atlas, () => { if (Q < 2 && !(window.SpritualNet && window.SpritualNet.slow())) wantHd(true); });
} else {
if (rearr || atHome) { stopFlight(); const g = !atHome && unf ? camOfRealm(unf) : homeSel === 'sky' ? home : rest; Object.assign(to, g); Object.assign(cam, g); } else if (sel) { fly(nodeCam(sel), 0.6); } else clampCam(to);
dustInit(); if (labelDpr !== dpr) makeLabels(); if (nodes[0].spr && nodes[0].spr.width !== sprD(nodes[0])) bakeAll();
}
wake();
};
new ResizeObserver(() => size(false)).observe(stage); on(window, 'orientationchange', () => setTimeout(() => size(false), 300));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
let cardFor = null; let cardPeek = null; let liftPx = 0; let liftF = 0; let liftT = 0;
const lift = () => {
let px = 0; const b = document.querySelector('.cx-consent:not([hidden])');
if (b && getComputedStyle(b).visibility !== 'hidden') { const br = b.getBoundingClientRect(); const xr = sky.getBoundingClientRect(); if (br.top < xr.bottom && br.bottom > xr.top) px = Math.round(Math.min(xr.height * 0.45, Math.max(0, xr.bottom - br.top + 8))); }
if (px !== liftPx) { liftPx = px; sky.style.setProperty('--st-lift', px + 'px'); }
};
const liftSoon = () => { if (!liftF) liftF = requestAnimationFrame(() => { liftF = 0; lift(); }); clearTimeout(liftT); liftT = setTimeout(lift, 480); };
on(window, 'scroll', liftSoon, { passive: true }); on(window, 'resize', liftSoon); on(document, 'click', liftSoon);
const showCard = (n, peek) => {
if (!n) { card.hidden = true; cardFor = null; return; }
if (cardFor === n && cardPeek === peek) return; cardFor = n; cardPeek = peek;
card.textContent = ''; card.classList.toggle('is-peek', peek); card.hidden = false; card.scrollTop = 0;
const top = el('div', 'st-card-top'); const pic = el('span', 'st-card-pic'); const face = n.el.querySelector('.st-face > *'); if (face) { const c = face.cloneNode(true); c.querySelector('img')?.removeAttribute('loading'); pic.append(c); }
if (n.id === 'vishvamitra' || n.id === 'shurpanakha') pic.style.filter = getComputedStyle(n.el.querySelector('.st-face img')).filter;
const h = el('h2', 'st-card-n', n.name); h.id = 'st-card-n'; const o = el('span', '', n.other); o.lang = hi ? 'en' : 'hi'; h.append(o);
top.append(pic, h, el('p', 'st-card-k', n.title)); card.append(top, el('p', 'st-card-l', nb(n.line))); { const al = n.el.querySelector('.st-p-also'); if (al) card.append(el('p', 'st-card-also', al.textContent)); } card.classList.remove('is-more');   // [fixGC] also in another epic's stories
card.setAttribute('aria-labelledby', 'st-card-n'); lift();
if (peek) return;
const more = el('div', 'st-card-more'); const open = el('a', 'st-card-open', fill(UI.open, { name: short(n) })); open.href = n.href; more.append(open);
const x = el('button', 'st-card-x', '×'); x.type = 'button'; x.setAttribute('aria-label', UI.close); on(x, 'click', () => { pick(null); stage.focus({ preventScroll: true }); });
if (n.ties.length || n.withs.length) {
more.append(el('h3', 'st-card-h', UI.ties)); const ul = el('ul', 'st-card-ties');
const row = (k, phrase, cls) => { const m = byId[k]; if (!m) return; const li = el('li', cls); const [pre, post] = phrase.split('{n}'); const b = el('button', '', short(m)); b.type = 'button'; on(b, 'click', () => { pick(m, { by: 'card', via: n }); }); if (pre) li.append(pre); li.append(b); if (post) li.append(post); ul.append(li); };
for (const t of n.ties) row(t.k, t.ph, 'is-named');
for (const t of n.withs) if (!n.kin.has(t.k)) row(t.k, '{n} · ' + (t.n === 1 ? UI.with1 : fill(UI.withN, { n: t.n })), 'is-with');
more.append(ul);
}
card.append(x, more);
card.append(el('span', 'st-card-fade')); moreCheck();
};
const moreCheck = () => { card.classList.toggle('is-more', card.scrollHeight - card.clientHeight - card.scrollTop > 6); };
on(card, 'scroll', moreCheck, { passive: true }); on(window, 'resize', moreCheck);
const say = (s) => { live.textContent = ''; setTimeout(() => { live.textContent = s; }, 60); };
const TPX = { legend: 96, lead: 84, cast: 74 }; const scOf = () => clamp(Math.min(W, H) / 780, 0.75, 1.15);
const nodeK = (n, nxt, r) => {
let px = TPX[n.tier] * (narrow ? clamp(Math.min(W, H) / 780, 0.92, 1.15) : scOf()); if (narrow && r && !nxt) px = Math.min(px, 0.41 * (r.y1 - r.y0)); let k = Math.min(K_MAX, px / n.r);
if (nxt) { const dx = Math.abs(nxt.x - n.x) || 1; const dy = Math.abs(nxt.y - n.y) || 1; const kf = Math.min(0.42 * (r.x1 - r.x0) / dx, 0.42 * (r.y1 - r.y0) / dy); k = Math.min(k, Math.max(kf, 0.78 * px / n.r)); }
return Math.max(k, kMin);
};
const nodeCam = (n, nxt, mode, hopNo) => {
const r = freeRect(mode || panel);
const tcap = (k) => (mode === 'cap' && wander.run ? Math.max(kMin, Math.min(k, 2 * home.k)) : k);
if (!nxt || mode !== 'cap') return camFor(n.x, n.y, tcap(nodeK(n, nxt, r)), r);
const sc = scOf(); const kc = TPX[n.tier] * sc / n.r; const m = 18; const hw = (r.x1 - r.x0) / 2; const hh = (r.y1 - r.y0) / 2;
const dx = Math.abs(nxt.x - n.x) || 1; const dy = Math.abs(nxt.y - n.y) || 1; const re = Math.max(n.r, nxt.r);
const kfit = Math.min((2 * hw - 2 * m) / (dx + 2 * re), (2 * hh - 2 * m) / (dy + 2 * re));
const wide = (hopNo | 0) % 3 === 0;
const k = tcap(Math.max(kMin, Math.min(K_MAX, wide ? clamp(kfit * 0.75, 0.58 * kc, 0.9 * kc) : clamp(kfit, (narrow ? 0.78 : 0.7) * kc, 1.1 * kc))));
const tx = (hw - n.r * k - m) / (dx * k); const ty = (hh - n.r * k - m) / (dy * k); const t = clamp(Math.min(0.5, tx, ty), 0, 0.5);
return camFor(lerp(n.x, nxt.x, t), lerp(n.y, nxt.y, t), k, r);
};
const pressRealm = (id) => { pressed = id; fr = realms.find((r) => r.id === id) || null; remember(); for (const b of sky.querySelectorAll('[data-st-go]')) b.setAttribute('aria-pressed', String(b.dataset.stGo === id)); wake(); };
const quietRealm = (r) => { pressed = r.id; fr = r; for (const b of sky.querySelectorAll('[data-st-go]')) b.setAttribute('aria-pressed', String(b.dataset.stGo === r.id)); };
const free = () => { if (pressed) pressRealm(''); };
const setPanel = (m) => { panel = m; };
const goHome = () => { pick(null); setPanel('none'); setUnf(null); atHome = true; homeSel = 'sky'; fly(home, 1.8); pressRealm('all'); sky.classList.add('is-used'); };
const goRest = () => { if (restRealm) goRealm(restRealm); else goHome(); };
const goRealm = (r) => {
userInput(); pick(null); setPanel('none'); atHome = false; setUnf(r); fly(camOfRealm(r), 1.7); pressRealm(r.id); sky.classList.add('is-used');
};
const remember = () => { try { const u = new URL(location.href); if (sel) u.searchParams.set('p', sel.id); else u.searchParams.delete('p'); if (pressed && pressed !== 'all') u.searchParams.set('r', pressed); else u.searchParams.delete('r'); history.replaceState(history.state, '', u); } catch (e) {} };
const ripple = (n) => { n.pulse = performance.now(); n.glow = Math.min(1, n.glow + 0.6); };
const pick = (n, { by = 'tap', travel = true, via = null } = {}) => {
if (n) userInput(); sel = n; hover = null; sky.classList.add('is-used'); showCard(n, false); pressRealm(''); remember(); setPanel(n ? 'card' : (wander.run ? 'cap' : 'none')); capHide();
if (n) {
atHome = false; ripple(n);
if (travel) { const e = via && edgeAt[key(via, n)]; fly(nodeCam(n), 1.7, e && !calm() ? { edge: e, rev: e.a !== via, bump: 0.12, r: freeRect('card') } : {}); }
say(`${n.name}. ${n.title ? n.title + '. ' : ''}${n.ties.map((t) => t.ph.replace('{n}', short(byId[t.k] || n))).join('; ')}`);
if (by === 'card' || by === 'find') card.querySelector('.st-card-open')?.focus({ preventScroll: true });
}
wake();
};
const at = (cx, cy, slop) => { const r = stage.getBoundingClientRect(); const x = (cx - r.left - W / 2) / cam.k + cam.x; const y = (cy - r.top - H / 2) / cam.k + cam.y; let best = null; let bd = 1e9; for (const n of nodes) { if (n.in < 0.5) continue; const d = Math.hypot(n.x - x, n.y - y); if (d < Math.max(n.r, n.dr / cam.k) + slop / cam.k && d < bd) { bd = d; best = n; } } return best; };
const zoomAt = (px, py, mul, t = 0.18) => { stopFlight(); free(); atHome = false; const k = clamp(to.k * mul, kMin, K_MAX); const wx = (px - W / 2) / to.k + to.x; const wy = (py - H / 2) / to.k + to.y; Object.assign(to, clampCam({ x: wx - (px - W / 2) / k, y: wy - (py - H / 2) / k, k })); ease = t; wake(); };
const capHide = () => { cap.classList.remove('is-in'); wake(); };
const capShow = (n, hop) => {
cap.textContent = ''; if (n.title) cap.append(el('p', 'st-cap-k', n.title));
const h = el('h3', 'st-cap-n', n.name); const o = el('span', '', n.other); o.lang = hi ? 'en' : 'hi'; h.append(o); cap.append(h, el('p', 'st-cap-l', nb(n.line)));
if (hop) { const p = el('div', 'st-cap-hop'); p.append(el('span', 'st-cap-hk', UI.follow)); p.append(el('span', 'st-cap-ar', '→')); const s = el('span'); const [pre, post] = hop.ph.split('{n}'); if (pre) s.append(pre); s.append(el('b', '', short(hop.m))); if (post) s.append(post); p.append(s); if (hop.ev) p.append(el('q', 'st-cap-q', nb(hop.ev))); cap.append(p); }
cap.classList.add('is-in'); requestAnimationFrame(() => { const r = cap.getBoundingClientRect(); const s = stage.getBoundingClientRect(); capR = [r.left - s.left - 20, r.top - s.top - 24, r.width + 60, r.height + 40]; wake(); });
};
const wLabel = () => {
const asking = wander.started && !wander.run && !wander.user && !calm(); const idle = wander.started && !wander.run && !calm();
wbtn.setAttribute('aria-pressed', String(wander.run)); wbtn.classList.toggle('is-asking', asking); wbtn.classList.toggle('is-run', wander.run); sky.classList.toggle('is-tour', wander.run);
wlabel.textContent = wander.run ? (UI.pause || UI.wander) : idle ? UI.resume : UI.wander;
};
const phraseOf = (n, m) => { const t = n.ties.find((u) => u.k === m.id); if (t) return t; const w = n.withs.find((u) => u.k === m.id); return { ph: '{n} · ' + (!w || w.n === 1 ? UI.with1 : fill(UI.withN, { n: w.n })), ev: '' }; };
const choose = (cur) => {
const w2 = wander; const cand = [];
const add = (t, nn) => { const m = byId[t.k]; if (!m || m === cur) return; const e = edgeAt[key(cur, m)]; if (!e) return; let w = e.named ? 1 : 0.1 + 0.04 * Math.min(nn, 4); const seen = w2.recent.lastIndexOf(m); if (seen >= 0 && seen >= w2.recent.length - 12) w *= 0.015; w /= 1 + 0.8 * (w2.visits[m.id] || 0); if (m.realm !== cur.realm && w2.hops >= 4) w *= 8; else if (m.realm === cur.realm && w2.hops >= 7) w *= 0.15; w *= m.rank === 0 ? 1.5 : m.rank === 1 ? 1.15 : 1; const p = phraseOf(cur, m); cand.push({ m, e, w, ph: p.ph, ev: p.ev }); };
for (const t of cur.ties) add(t, 3);
if (!cand.some((c) => c.w > 0.08) || (w2.hops >= 4 && !cand.some((c) => c.m.realm !== cur.realm))) for (const t of cur.withs) if (!cur.kin.has(t.k)) add(t, t.n);
if (!cand.length) return null;
let sum = 0; for (const c of cand) sum += c.w; let r = rndr() * sum; for (const c of cand) { r -= c.w; if (r <= 0) return c; } return cand[cand.length - 1];
};
const nextOf = (n) => {
const w2 = wander;
if (w2.script) { const i = w2.script.indexOf(n.id); const m = i >= 0 && byId[w2.script[i + 1]]; const e = m && edgeAt[key(n, m)]; if (e) { const p = phraseOf(n, m); return { m, e, ph: p.ph, ev: p.ev }; } w2.script = null; }
return choose(n);
};
const farNode = (cur) => { let best = null; let bs = -1; for (const n of nodes) { if (n === cur || wander.recent.slice(-14).includes(n)) continue; const s = (n.rank === 0 ? 3 : n.rank === 1 ? 2 : 1) / (1 + (wander.visits[n.id] || 0) * 2) * (n.realm !== cur.realm ? 1.6 : 1) * (0.5 + rndr()); if (s > bs) { bs = s; best = n; } } return best || nodes[0]; };
const arrive = (n, hop) => {
const w = wander; if (!w.run) return; w.cur = n; w.fnode = n; w.visits[n.id] = (w.visits[n.id] || 0) + 1; w.recent.push(n); if (w.recent.length > 40) w.recent.shift(); ripple(n); if (w.guide) w.guide.e = null;
if (hop === undefined) hop = nextOf(n);
w.nxt = hop ? hop.m : null; w.e = hop ? hop.e : null; w.rev = hop ? hop.e.a !== n : false; w.hop = hop; if (hop && hop.m.realm === n.realm) w.hops++; else w.hops = 0;
w.nHop = (w.nHop || 0) + 1; w.mode = 'hold'; w.t0 = performance.now(); w.nextC = w.t0 + 1100; w.hold = 6800 + Math.min(2400, (n.line.length + (hop ? hop.ev.length : 0)) * 7); setPanel('cap');
const c = nodeCam(n, w.nxt, 'cap', w.nHop); const dx = w.nxt ? (w.nxt.x - n.x) * 0.03 : 0; const dy = w.nxt ? (w.nxt.y - n.y) * 0.03 : 0;
flight = { t0: w.t0, dur: w.hold + 600, from: { x: cam.x, y: cam.y, k: cam.k }, to: { x: c.x + dx, y: c.y + dy, k: c.k * 1.035 }, bump: 0, edge: null, rev: false, out: false, done: null, r: null };
setTimeout(() => { if (w.run && w.cur === n && w.mode === 'hold') capShow(n, hop); }, 600);
surge(n); wake();
};
const launch = (e, from, wait, strong) => { const c = comets.find((x) => !x.e && x.wait <= 0.3) || comets[(rndr() * comets.length) | 0]; if (!c) return; c.e = e; c.u = 0; c.fwd = e.a === from; c.v = ((strong ? 82 : 70) + rndr() * 30) / e.len; c.tint = tintOf(from.realm); c.a = strong ? 0.95 : 0.85; c.tail = strong ? 80 : 64; c.rad = strong ? 1.3 : 1.1; c.wait = wait; };
const surge = (n) => {
if (calm() || !comets.length) return; const w = wander; let j = 0;
if (w.run && w.e) { launch(w.e, n, 0.5, true); for (const e of n.namedE) if (e !== w.e && j < 2) launch(e, n, 1.1 + j++ * 0.6, false); return; }
for (const e of n.namedE) { launch(e, n, 0.6 + j++ * 0.3, true); if (j > 7) break; }
};
let nextWave = 0; let lastHub = null;
const wave = (now) => {
const hubs = nodes.filter((n) => n.rank === 0 && n.namedE.length >= 3 && n !== lastHub); const h = hubs[(rndr() * hubs.length) | 0]; if (!h) return; lastHub = h;
for (const n of nodes) n.wd = -1; h.wd = 0; const q = [h];
while (q.length) { const x = q.shift(); if (x.wd >= 4) continue; for (const e of x.namedE) { const y = e.a === x ? e.b : e.a; if (y.wd < 0) { y.wd = x.wd + 1; q.push(y); } } }
for (const n of nodes) if (n.wd >= 0) n.pulseAt = now + n.wd * 700;
};
const wavePulse = (now) => {
for (const n of nodes) { if (!n.pulseAt || now < n.pulseAt) continue; n.pulseAt = 0; n.pulse = now; n.glow = Math.min(1, n.glow + 0.5); if (comets.length && n.wd < 4) for (const e of n.namedE) { const o = e.a === n ? e.b : e.a; if (o.wd === n.wd + 1) launch(e, n, 0.05, false); } }
};
const travel = () => {
const w = wander; capHide(); const n = w.cur; let m = w.nxt; const e = m ? w.e : null; let rev = w.rev;
if (!m) { m = farNode(n); rev = false; w.hops = 0; }
w.mode = 'travel'; w.fnode = m; const pre = nextOf(m); const c = nodeCam(m, pre && pre.m, 'cap', (w.nHop || 0) + 1); const g = guideOf();
if (e) { g.e = e; g.fwd = !rev; g.u = 0.02; g.tint = [255, 238, 205]; g.a = 1; g.tail = 130; g.rad = 1.4; } else g.e = null;
const dur = clamp(3.4 + Math.hypot(n.x - m.x, n.y - m.y) / 380, 3.4, 5.4);
fly(c, dur, e ? { edge: e, rev, bump: 0.1, r: freeRect('cap'), done: () => arrive(m, pre) } : { bump: 0.3, done: () => arrive(m, pre) });
};
const wanderLock = () => form.classList.contains('is-open') && document.activeElement === q;
const wTick = (now, still) => {
const w = wander;
if (!w.run) {
if (hover && !sel && !pts.size && now - lastInput > 25000) { hover = null; stage.classList.remove('is-over'); showCard(null); setPanel('none'); wake(); }
if (still || !introDone || w.user || sel || hover || pts.size || card.contains(document.activeElement) || document.activeElement === q || q.value || !card.hidden || wanderLock()) return;
if (w.started ? now - lastInput > 25000 : wanderBusy && now > wanderBusy) wStart(w.started);
return;
}
if (still) return wStop();
if (w.mode === 'hold' && w.e && w.cur && now > w.nextC && now - w.t0 < w.hold - 600) { launch(w.e, w.cur, 0, true); w.nextC = now + 1200; }
if (w.mode === 'hold' && now - w.t0 > w.hold) travel();
};
let wDelay = 0;
const wSoon = () => { wanderBusy = performance.now() + 1200; };
const wStart = (resume) => {
const w = wander; if (calm()) return;
if (unf) { if (!wDelay) { const li = lastInput; setUnf(null); wDelay = setTimeout(() => { wDelay = 0; if (lastInput === li && !sel && !hover && !pts.size && !wander.run) wStart(resume); }, 850); } return; }
w.run = true; w.started = true; w.user = false;
if (sel) { w.cur = sel; pick(null); }
if (!w.cur && !w.toured) { w.script = ['dasharatha', 'rama', 'sita', 'hanuman'].filter((id) => byId[id]); w.toured = true; }
const n = w.script && w.script.length ? byId[w.script[0]] : (w.cur || byRank[0]); w.mode = 'fly'; w.fnode = n; setPanel('cap'); pressRealm('all'); atHome = false;
const pre = nextOf(n); const c = nodeCam(n, pre && pre.m, 'cap', (w.nHop || 0) + 1); fly(c, clamp(1.6 + Math.hypot(n.x - cam.x, n.y - cam.y) * cam.k / 700, 1.8, 3.2), { done: () => arrive(n, pre) }); wLabel(); wake();
};
const wStop = () => { const w = wander; if (!w.run) return; w.run = false; w.mode = 'off'; w.fnode = null; w.nxt = null; w.e = null; if (w.guide) w.guide.e = null; capHide(); if (!sel) setPanel('none'); stopFlight(); wLabel(); wake(); };
const userInput = () => { lastInput = performance.now(); if (!introDone) { introFast = true; } wander.started = true; if (wander.run) wStop(); else wLabel(); };
on(wbtn, 'click', () => { lastInput = performance.now(); if (wander.run) { wander.user = true; wStop(); } else { wander.user = false; if (!introDone) introFast = true; wStart(true); } wLabel(); });
const wanderToggle = () => { if (calm()) return; if (wander.run) { wander.user = true; wStop(); } else { wander.user = false; wStart(true); } wLabel(); };
let drag = null; let pinch = 0; let tapAt = 0; let tapX = 0; let tapY = 0;
on(stage, 'pointerdown', (e) => {
if (e.button) return; kbd = false; userInput(); stopFlight(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { stage.setPointerCapture(e.pointerId); } catch (err) {}
vel.x = vel.y = 0; drag = { x: e.clientX, y: e.clientY, moved: false, t: performance.now(), touch: e.pointerType !== 'mouse' };
if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag.moved = true; }
});
on(stage, 'pointermove', (e) => {
const p = pts.get(e.pointerId);
if (!p) { if (e.pointerType === 'mouse') { const r = stage.getBoundingClientRect(); ptr.tx = clamp((e.clientX - r.left) / W * 2 - 1, -1, 1); ptr.ty = clamp((e.clientY - r.top) / H * 2 - 1, -1, 1); const n = at(e.clientX, e.clientY, 4); if (n !== hover) { if (n) userInput(); hover = n; stage.classList.toggle('is-over', !!n); if (!sel) { showCard(n, true); setPanel(n ? 'card' : wander.run ? 'cap' : 'none'); } wake(); } } return; }
const dx = e.clientX - p.x; const dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = stage.getBoundingClientRect(); if (pinch) { zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch, 0); to.x -= dx / 2 / to.k; to.y -= dy / 2 / to.k; clampCam(to); Object.assign(cam, to); } pinch = d; sky.classList.add('is-used'); wake(); return; }
if (!drag) return;
if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < (drag.touch ? 8 : 4)) return;
if (!drag.moved) { drag.moved = true; stage.classList.add('is-drag'); sky.classList.add('is-used'); free(); atHome = false; if (hover) { hover = null; if (!sel) showCard(null); } }
to.x -= dx / cam.k; to.y -= dy / cam.k; clampCam(to); cam.x = to.x; cam.y = to.y; ease = 0;
const now = performance.now(); const dt = Math.max(8, now - drag.t) / 1000; drag.t = now; vel.x = vel.x * 0.6 + dx / dt * 0.25; vel.y = vel.y * 0.6 + dy / dt * 0.25; wake();
});
const up = (e) => {
if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); pinch = 0; stage.classList.remove('is-drag');
if (pts.size) { drag = { moved: true, t: performance.now() }; vel.x = vel.y = 0; return; }
const d = drag; drag = null; if (!d) return;
if (!d.moved && e.type === 'pointerup') {
vel.x = vel.y = 0; const n = at(e.clientX, e.clientY, d.touch ? 12 : 4); const now = performance.now();
if (!n && d.touch && now - tapAt < 330 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 36) { tapAt = 0; goRest(); }
else if (n) { tapAt = 0; pick(n); } else { tapAt = now; tapX = e.clientX; tapY = e.clientY; if (sel) pick(null); }
} else if (performance.now() - d.t > 90 || calm()) vel.x = vel.y = 0;
ease = 0.22; wake();
};
on(stage, 'pointerup', up); on(stage, 'pointercancel', up);
on(stage, 'pointerleave', (e) => { if (e.pointerType === 'mouse') { ptr.tx = ptr.ty = 0; if (hover) { hover = null; stage.classList.remove('is-over'); if (!sel) { showCard(null); setPanel(wander.run ? 'cap' : 'none'); } wake(); } } });
on(stage, 'wheel', (e) => {
if (!e.ctrlKey && !e.metaKey) return;
e.preventDefault(); userInput(); const r = stage.getBoundingClientRect(); const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-dy * (e.ctrlKey ? 0.011 : 0.0017)), 0.13); sky.classList.add('is-used');
}, { passive: false });
on(stage, 'dblclick', (e) => { if (e.pointerType === 'touch') return; if (!at(e.clientX, e.clientY, 4)) goRest(); });
on(stage, 'keydown', (e) => {
if (e.altKey || e.ctrlKey || e.metaKey || e.key === 'w' || e.key === 'W') return; userInput();
const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
if (dir) {
e.preventDefault(); kbd = true; let cur = sel || (wander.cur && wander.cur) ;
if (!cur) { let bd = 1e9; for (const n of nodes) { const d = Math.hypot(n.x - cam.x, n.y - cam.y) - n.r * 2; if (d < bd) { bd = d; cur = n; } } return pick(cur, { by: 'key' }); }
let best = null; let bs = 1e9; for (const n of nodes) { if (n === cur) continue; const dx = n.x - cur.x; const dy = n.y - cur.y; const along = dx * dir[0] + dy * dir[1]; if (along <= 0) continue; const side = Math.abs(dx * dir[1] - dy * dir[0]); const s = along + side * 2.2; if (side < along * 1.6 && s < bs) { bs = s; best = n; } }
pick(best || cur, { by: 'key' });
} else if (e.key === 'Enter' || e.key === ' ') { if (sel) { e.preventDefault(); card.querySelector('.st-card-open')?.focus({ preventScroll: true }); } }
else if (e.key === 'Escape') { if (sel) { e.preventDefault(); pick(null); } }
else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(W / 2, H / 2, 1.35, 0.3); }
else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(W / 2, H / 2, 1 / 1.35, 0.3); }
else if (e.key === 'Home' || e.key === '0') { e.preventDefault(); goHome(); }
});
on(document, 'keydown', (e) => { if (e.key !== 'Escape' || e.defaultPrevented || !wander.run || !shown || sel || document.querySelector('dialog[open]')) return; if (document.activeElement && document.activeElement !== document.body && !sky.contains(document.activeElement) && document.activeElement.closest('[role="dialog"], [aria-modal="true"], nav details[open]')) return; lastInput = performance.now(); wander.user = true; wStop(); wLabel(); });
on(sky, 'keydown', (e) => { if ((e.key === 'w' || e.key === 'W') && !e.altKey && !e.ctrlKey && !e.metaKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.preventDefault(); wanderToggle(); } });
on(card, 'keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); pick(null); stage.focus({ preventScroll: true }); } });
const scrollTo = (el2) => { const calmNow = calm(); if (el2) { const y = el2.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(root).getPropertyValue('--ed-head-h')) || 68) - 8; window.scrollTo({ top: y, behavior: calmNow ? 'instant' : 'smooth' }); } else window.scrollTo({ top: 0, behavior: calmNow ? 'instant' : 'smooth' }); };
on(sky, 'click', (e) => {
const g = e.target.closest('[data-st-go]'); const z = e.target.closest('[data-st-zoom]'); const h = e.target.closest('[data-st-home]'); const v = e.target.closest('[data-st-view]'); const cue = e.target.closest('[data-st-cue]'); const fb = e.target.closest('[data-st-findbtn]');
if (g) { if (g.dataset.stGo === 'all') { userInput(); goHome(); } else goRealm(realms.find((x) => x.id === g.dataset.stGo)); }
if (z) { userInput(); zoomAt(W / 2, H / 2, +z.dataset.stZoom > 0 ? 1.4 : 1 / 1.4, 0.3); sky.classList.add('is-used'); }
if (h) { userInput(); goRest(); }
if (v) { scrollTo(v.dataset.stView === 'wall' ? document.getElementById('cast-wall') : null); viewNow(v.dataset.stView); }
if (cue) { e.preventDefault(); scrollTo(document.getElementById('cast-wall')); }
if (fb) { const f2 = fb.closest('.st-find'); f2.classList.add('is-open'); fb.setAttribute('aria-expanded', 'true'); q.focus(); }
});
const wallEl = document.getElementById('cast-wall'); let viewing = 'sky';
const viewNow = (v) => { if (v === viewing) return; viewing = v; for (const b of sky.querySelectorAll('[data-st-view]')) b.setAttribute('aria-pressed', String(b.dataset.stView === v)); };
if (wallEl) { let vr = 0; const vcheck = () => { vr = 0; viewNow(wallEl.getBoundingClientRect().top < innerHeight * 0.55 ? 'wall' : 'sky'); }; on(window, 'scroll', () => { if (!vr) vr = requestAnimationFrame(vcheck); }, { passive: true }); }
const form = sky.querySelector('[data-st-find]'); const q = form.querySelector('input'); const sug = form.querySelector('[data-st-sug]'); const note = form.querySelector('[data-st-note]');
const FD = window.SpritualFind; if (FD) FD.setSyn(UI.syn);
const norm = FD ? FD.key : (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
for (const n of nodes) { n.kn = norm(n.name + ' ' + n.other + ' ' + n.en); n.ka = norm(n.el.dataset.al || ''); n.kl = norm(n.title + ' ' + n.line + ' ' + (n.el.dataset.al || '')); }
const rankFind = (raw) => {
const ws = FD ? FD.words(raw) : [norm(raw)].filter(Boolean); if (!ws.length) return [];
const nameB = (n, w) => { const a = FD ? FD.find(n.kn, w) : n.kn.includes(w) ? 4 : 0; return a >= 4 ? (a === 5 ? 100 : 80) : FD && FD.find(n.ka, w) >= 4 ? 78 : a === 3 ? 50 : 0; };
const lineB = (n, w) => (FD && FD.find(n.kl, w) >= 2 ? 20 : FD && FD.find(n.kn + ' ' + n.ka, w, true) === 1 ? 35 : 0);
const order = (x, y) => y.s - x.s || y.n.sc - x.n.sc || x.n.rank - y.n.rank || x.n.i - y.n.i;
const pass = (need, line) => { const out = []; for (const n of nodes) { let tot = 0; let hit = 0; for (const w of ws) { const b = nameB(n, w) || (line ? lineB(n, w) : 0); if (b) { tot += b; hit++; } } if (hit >= need && hit) out.push({ n, s: tot + hit * 1000 }); } return out.sort(order); };
let r = pass(ws.length, false);   // every word is a name
if (!r.length && ws.length > 1) r = pass(1, false);   // "Sita Ram": the two of them
if (!r.length) r = pass(ws.length, true);   // then their lines and a slip of a letter
return r;
};
let sugList = []; let sugAt = -1; let noteT = 0;
const hideNote = () => { clearTimeout(noteT); note.hidden = true; note.textContent = ''; };
const showNote = (txt) => { note.textContent = (UI.noneQ || UI.none).replace('{q}', () => txt).replace(/ (\S+)$/, ' $1'); note.hidden = false; };
const setSug = (list) => {
sugList = list; sugAt = -1; sug.textContent = '';
for (const [i, r] of list.entries()) {
const li = document.createElement('li'); li.id = 'st-o' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false'); li.dataset.i = i;
const a = document.createElement('span'); a.className = 'st-sug-n'; a.textContent = r.n.name; li.append(a);
if (r.n.other && r.n.other !== r.n.name) { const o = document.createElement('span'); o.className = 'st-sug-o'; o.lang = hi ? 'en' : 'hi'; o.textContent = r.n.other; li.append(o); }
if (r.n.title) { const t = document.createElement('span'); t.className = 'st-sug-t'; t.textContent = r.n.title; li.append(t); }
sug.append(li);
}
sug.hidden = !list.length; q.setAttribute('aria-expanded', String(!!list.length)); q.removeAttribute('aria-activedescendant');
};
const mark = (i) => { sugAt = i; for (const li of sug.children) { const hot = +li.dataset.i === i; li.setAttribute('aria-selected', String(hot)); if (hot) li.scrollIntoView({ block: 'nearest' }); } if (i >= 0) q.setAttribute('aria-activedescendant', 'st-o' + i); else q.removeAttribute('aria-activedescendant'); };
const closeFind = () => { form.classList.remove('is-open'); form.querySelector('[data-st-findbtn]').setAttribute('aria-expanded', 'false'); setSug([]); hideNote(); };
const chooseNode = (n) => { pick(n, { by: 'find' }); q.value = ''; closeFind(); };
const findUpdate = () => {
const raw = q.value.trim(); clearTimeout(noteT); if (!raw) { setSug([]); hideNote(); return; }
const res = rankFind(raw); setSug(res.slice(0, 6));
if (res.length) hideNote(); else { note.hidden = true; noteT = setTimeout(() => showNote(raw), 450); }
};
const find = () => {
const raw = q.value.trim(); if (!raw) return; const res = rankFind(raw);
if (sugAt >= 0 && sugList[sugAt]) return chooseNode(sugList[sugAt].n);
if (res.length) return chooseNode(res[0].n);
setSug([]); clearTimeout(noteT); showNote(raw); say(note.textContent);
};
on(form, 'submit', (e) => { e.preventDefault(); find(); });
on(q, 'input', findUpdate);
on(q, 'keydown', (e) => {
if (e.key === 'Enter') { e.preventDefault(); find(); }
else if (e.key === 'Escape') { if (!sug.hidden) { setSug([]); } else closeFind(); }
else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && sugList.length) { e.preventDefault(); mark(e.key === 'ArrowDown' ? (sugAt + 1) % sugList.length : (sugAt <= 0 ? sugList.length : sugAt) - 1); }
e.stopPropagation(); userInput();
});
on(sug, 'pointerdown', (e) => e.preventDefault());
on(sug, 'click', (e) => { const li = e.target.closest('li'); if (li && sugList[+li.dataset.i]) chooseNode(sugList[+li.dataset.i].n); });
on(q, 'focus', () => { userInput(); findUpdate(); }); on(q, 'blur', () => setTimeout(() => { if (!q.value) closeFind(); else { setSug([]); } }, 150));
on(topEl, 'pointerdown', () => { lastInput = performance.now(); });
on(mq, 'change', () => { wake(); });
on(window, 'pagehide', (e) => { cancelAnimationFrame(raf); raf = 0; shown = false; if (!e.persisted) { ac.abort(); io.disconnect(); } });
on(window, 'pageshow', (e) => { if (e.persisted) { shown = !document.hidden; last = 0; wake(); } });
try { new MutationObserver(() => wake()).observe(root, { attributes: true, attributeFilter: ['data-motion'] }); } catch (e) {}
for (const n of nodes) { n.kinL = [...n.kin].map((k) => byId[k]).filter(Boolean); n.nearL = [...n.near].filter((k) => !n.kin.has(k)).map((k) => byId[k]).filter(Boolean); n.want = 0; }
for (const b of sky.querySelectorAll('[data-st-go]')) b.setAttribute('aria-pressed', String(b.dataset.stGo === 'all')); pressed = 'all';
sky.stProbe = () => ({ arr: arrangeInfo, restRealm: restRealm && restRealm.id, restK: rest.k, W, H, k: cam.k, home: home.k, wander: wander.run && wander.mode, fnode: wander.fnode && wander.fnode.id, nodes: nodes.map((n) => ({ id: n.id, tier: n.tier, x: n.px, y: n.py, d: n.dr * 2, vis: n.vis, in: n.in })) });
size(false); wLabel();
{ let pid = null; let rid = null; try { const u = new URL(location.href); pid = u.searchParams.get('p'); rid = u.searchParams.get('r'); } catch (e) {}
if ((pid && byId[pid]) || (rid && realms.some((r) => r.id === rid))) sky.classList.add('is-quick');
if (pid && byId[pid]) { introDone = true; introT = 7; flight = null; wander.started = true; pick(byId[pid], { by: 'link', travel: false }); setCam(nodeCam(byId[pid], null, 'card')); }
else if (rid && realms.some((r) => r.id === rid)) { introDone = true; introT = 7; flight = null; wander.started = true; const rl0 = realms.find((r) => r.id === rid); setUnf(rl0, true); goRealm(rl0); setCam(camOfRealm(rl0)); }
else wanderBusy = performance.now() + 5800; }
if (calm()) { sky.classList.add('is-calm'); }
wLabel(); wake();
})();
