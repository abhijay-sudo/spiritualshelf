const TIER = { legend: 1.7, lead: 1.25, cast: 1 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const EXTRA = { en: 'Drag a face and its threads follow.', hi: 'किसी चेहरे को खींचिए, उसके धागे साथ खिंचेंगे।' };
const EXTRA_TOUCH = { en: 'Hold a face, then drag, to tug its threads.', hi: 'चेहरे को दबाए रखकर खींचिए, उसके धागे खिंचेंगे।' };
export default function mount(ctx) {
const sky = document.querySelector('[data-stars]'); if (!sky) return;
let inst = null, ended = false, early = null, going = false;
const start = async (api) => { if (ended || going || !api) return; going = true; const r = await run(api, ctx, sky); if (ended) { r && r.dispose && r.dispose(); return; } inst = r; };
if (sky.spritualSky) start(sky.spritualSky);
else { early = (e) => start(e.detail); sky.addEventListener('spritual:sky', early, { once: true }); }   // (stars.js is fetched after the page: it may not be here yet; if it never comes, nothing was done)
return { dispose() { ended = true; if (early) sky.removeEventListener('spritual:sky', early); if (inst) { inst.dispose(); inst = null; } } };
}
async function run(api, ctx, sky) {
const mod = await import(ctx.deps[0]); if (ctx.signal.aborted) return { dispose() {} };
const { createField } = mod;
const nodes = api.nodes, edges = api.edges, N = nodes.length, hi = document.documentElement.lang === 'hi';
const phone = !!(ctx.caps.phone || api.coarse);
const idx = new Map(nodes.map((n, i) => [n.id, i]));
const el = [];
for (const e of edges) { const w = e.named ? 1 : clamp(0.1 + 0.05 * Math.min(e.n || 1, 6), 0.1, 0.4); el.push([idx.get(e.a.id), idx.get(e.b.id), w]); }
const field = createField(N, el, nodes.map((n) => TIER[n.tier] || 1), nodes.map((n) => n.r), phone ? { maxU: 70, maxSteps: 3 } : {});
const near = nodes.map((n) => Array.from(n.near || [], (k) => idx.get(k)).filter((k) => k != null));
const kin = nodes.map((n) => new Set(Array.from(n.kin || [], (k) => idx.get(k))));
let homesSet = false;
const setHomes = () => { for (let i = 0; i < N; i++) { field.hx[i] = nodes[i].x; field.hy[i] = nodes[i].y; } if (!homesSet) { homesSet = true; field.refresh(); } };
const reg = (id, priority, drop, restore) => ctx.budget.register({ id, label: 'spring/ODE', cost: 'waapi', priority, drop, restore });
let freezeFar = false, wholeOff = false;
const hFar = reg('people-far', 1, () => { freezeFar = true; }, () => { freezeFar = false; });
const hEdge = reg('people-threads', 2, () => { field.edgesOn = false; for (const e of edges) { e.bk = 1; e.sn = 0; } }, () => { field.edgesOn = true; });
const hAll = reg('people-field', 3, () => { wholeOff = true; zero(); }, () => { wholeOff = false; field.on = true; });
hAll.bodies(N); void hFar; void hEdge;
const zero = () => { field.on = false; for (const n of nodes) { n.tx = 0; n.ty = 0; } for (const e of edges) { e.bk = 1; e.sn = 0; } api.wake(); };
const P = { x: 0, y: 0, lx: 0, ly: 0, vx: 0, vy: 0, in: false, t: 0, mouse: false };
const onMove = (e) => { if (e.pointerType !== 'mouse') return; P.mouse = true; P.in = true; P.x = e.clientX; P.y = e.clientY; P.t = performance.now(); };
const onLeave = () => { P.in = false; };
api.stage.addEventListener('pointermove', onMove, { passive: true, signal: ctx.signal });
api.stage.addEventListener('pointerleave', onLeave, { passive: true, signal: ctx.signal });
let last = null;
let held = null;   // { i, n, ox, oy, tx, ty, samples: [[t, x, y]], flick: bool }
const sample = (h, e) => { const t = performance.now(); h.samples.push([t, e.clientX, e.clientY]); while (h.samples.length > 2 && t - h.samples[0][0] > 110) h.samples.shift(); };
const hold = phone ? 170 : 0;
api.hook({
down(e, d) { d.pn = api.at(e.clientX, e.clientY, d.touch ? 6 : 1); d.t0 = performance.now(); },
claim(e, d) {
if (wholeOff || !d.pn) return false;
if (d.own === undefined) { d.own = !e.shiftKey && !e.ctrlKey && !e.metaKey && (!d.touch || performance.now() - d.t0 >= hold) && !api.still(); if (d.own) begin(d, e); }
if (!d.own || !held) return false;
const w = api.toWorld(e.clientX, e.clientY); held.tx = w[0] - held.ox - held.n.x; held.ty = w[1] - held.oy - held.n.y; sample(held, e); return true;
},
up(e, d) {
if (!d.own || !held) return false;
const h = held; held = null; sample(h, e); let vx = 0, vy = 0, sv = 0;
if (h.samples.length > 1) { const a = h.samples[0], b = h.samples[h.samples.length - 1], dt = Math.max(16, b[0] - a[0]) / 1000; vx = (b[1] - a[1]) / dt; vy = (b[2] - a[2]) / dt; sv = Math.hypot(vx, vy); }
const k = api.zoom(); field.release(h.i, vx / k * 0.6, vy / k * 0.6);
last = { speed: Math.round(sv), disp: +Math.hypot(field.ux[h.i], field.uy[h.i]).toFixed(1), samples: h.samples.length, type: e.type };
if (e.type === 'pointerup' && sv > 650 && Math.hypot(field.ux[h.i], field.uy[h.i]) > 18) flick(h.i, vx, vy);
api.wake(); return true;
},
step, busy: () => !wholeOff && (field.awake || !!held), over: draw,
});
const begin = (d, e) => {
const n = d.pn, i = idx.get(n.id); if (i == null) { d.own = false; return; }
const w = api.toWorld(e.clientX, e.clientY);
held = { i, n, ox: w[0] - (n.x + field.ux[i]), oy: w[1] - (n.y + field.uy[i]), tx: field.ux[i], ty: field.uy[i], samples: [], t: performance.now() };
field.grab(i); sample(held, e);
};
const flick = (i, vx, vy) => {
const n = nodes[i], len = Math.hypot(vx, vy) || 1; let best = null, bc = 0.8;
for (const j of near[i]) {
const m = nodes[j]; if (m.in < 0.5) continue; const dx = m.x - n.x, dy = m.y - n.y, d = Math.hypot(dx, dy) || 1; if (d > 1100) continue;
const c = (dx * vx + dy * vy) / (d * len) + (kin[i].has(j) ? 0.06 : 0); if (c > bc) { bc = c; best = m; }
}
if (best) api.pick(best, { by: 'flick', via: n });
};
const tgx = new Float32Array(N), tgy = new Float32Array(N);
let prev = { x: api.cam.x, y: api.cam.y, vx: 0, vy: 0, t: 0 }, ax = 0, ay = 0, lastNow = 0, stepMs = new Float32Array(240), sm = 0, sn = 0, applied = false;
function step(now, dt, still) {
if (wholeOff) return;
if (still || ctx.signal.aborted) { if (applied) { zero(); applied = false; } return; }
if (!field.on) field.on = true;
const t0 = performance.now(); hAll.begin();
setHomes();
if (held && !api.gesture()) { field.release(held.i, 0, 0); held = null; }
const cvx = (api.cam.x - prev.x) / Math.max(dt, 0.004), cvy = (api.cam.y - prev.y) / Math.max(dt, 0.004);
const gx = (cvx - prev.vx) / Math.max(dt, 0.004), gy = (cvy - prev.vy) / Math.max(dt, 0.004);
prev.x = api.cam.x; prev.y = api.cam.y; prev.vx = cvx; prev.vy = cvy;
const cap = phone ? 900 : 1600, cpl = phone ? 0.5 : 0.85;
ax += (clamp(gx, -cap, cap) - ax) * 0.35; ay += (clamp(gy, -cap, cap) - ay) * 0.35;
field.setFrameAccel(-ax * cpl, -ay * cpl);
const f = api.focus(), fi = f ? idx.get(f.id) : -1, h = api.hover(), hi_ = h ? idx.get(h.id) : -1, K = api.zoom();
const reach = phone ? 11 : 18; tgx.fill(0); tgy.fill(0);
if (fi >= 0 && !held) {
for (let i = 0; i < N; i++) {
if (i === fi) continue; const isKin = kin[fi].has(i); if (!isKin && !f.near.has(nodes[i].id)) continue;
const dx = f.x - nodes[i].x, dy = f.y - nodes[i].y, d = Math.hypot(dx, dy) || 1;
if (d < 520) { const pull = Math.min(reach, d * (isKin ? 0.09 : 0.045)), c = pull / d; tgx[i] = dx * c; tgy[i] = dy * c; }
}
}
if (hi_ >= 0 && !held && P.mouse && P.in) {
const w = api.toWorld(P.x, P.y), n = nodes[hi_], dx = w[0] - n.x, dy = w[1] - n.y, d = Math.hypot(dx, dy) || 1, lean = Math.min(9 / K + 4, d * 0.22);
tgx[hi_] = dx / d * lean; tgy[hi_] = dy / d * lean;
}
for (let i = 0; i < N; i++) field.setTarget(i, tgx[i], tgy[i]);
if (P.mouse && P.in && !api.gesture() && !held) {
const dtp = Math.max(0.004, (now - lastNow) / 1000); const pvx = (P.x - P.lx) / dtp, pvy = (P.y - P.ly) / dtp; P.vx += (pvx - P.vx) * 0.4; P.vy += (pvy - P.vy) * 0.4;
const sp = Math.hypot(P.vx, P.vy);
if (sp > 160 && P.t > now - 120) {
const w = api.toWorld(P.x, P.y), R = 120 / K; let k0 = Math.min(1, (sp - 160) / 900);
for (let i = 0; i < N; i++) { const n = nodes[i]; if (!n.vis) continue; const dx = n.x + field.ux[i] - w[0], dy = n.y + field.uy[i] - w[1]; if (Math.abs(dx) > R || Math.abs(dy) > R) continue; const d = Math.hypot(dx, dy); if (d >= R) continue; const s = (1 - d / R); const g = s * s * 0.075 * k0 / (K < 1 ? K : 1); field.kick(i, clamp(P.vx / K * g, -34, 34), clamp(P.vy / K * g, -34, 34)); }
}
} else { P.vx = P.vy = 0; }
P.lx = P.x; P.ly = P.y; lastNow = now;
if (held) field.dragTo(held.i, held.tx, held.ty, Math.max(dt, 0.004));
if (freezeFar) {
const keep = new Set(); const seeds = [held && held.i, fi, hi_].filter((v) => v != null && v >= 0);
for (const s of seeds) { keep.add(s); for (const j of near[s]) keep.add(j); }
for (let i = 0; i < N; i++) field.active[i] = keep.has(i) ? 1 : 0;
if (keep.size) field.wake();
} else { for (let i = 0; i < N; i++) field.active[i] = 1; }
const ran = field.step(dt);
if (ran) {
for (let i = 0; i < N; i++) { nodes[i].tx = field.ux[i]; nodes[i].ty = field.uy[i]; }
if (field.edgesOn) for (let e = 0; e < edges.length; e++) { const s = field.sn[e]; edges[e].sn = s; edges[e].bk = clamp(1 - 2.2 * s, 0.15, 2.4); }
applied = true;
}
hAll.end(); const ms = performance.now() - t0; stepMs[sm % 240] = ms; sm++; sn++;
}
function draw(g, qpath, lw) {
if (wholeOff || !field.on) return; const K = api.zoom();
let any = false;
for (let e = 0; e < edges.length; e++) {
const ed = edges[e], s = ed.sn; if (!ed.vis || (s < 0.03 && s > -0.05)) continue;
if (!any) { any = true; g.save(); g.lineCap = 'round'; g.globalCompositeOperation = 'lighter'; }
const a = Math.min(1, Math.abs(s) * 5), fade = ed.a.dim * ed.b.dim;
if (s > 0) {
g.globalAlpha = 1; g.lineWidth = lw * 3.4; g.strokeStyle = `rgba(243,196,126,${(0.05 + 0.1 * a) * fade})`; g.beginPath(); qpath(ed, 1); g.stroke();
g.lineWidth = Math.max(0.6, lw * (0.95 - 0.35 * a)); g.strokeStyle = `rgba(255,243,214,${(0.22 + 0.55 * a) * fade})`; g.beginPath(); qpath(ed, 1); g.stroke();
g.setLineDash([lw * 5, lw * 2.4, lw * 1.2, lw * 2.4]); g.lineWidth = Math.max(0.5, lw * 0.5); g.strokeStyle = `rgba(243,196,126,${(0.18 + 0.35 * a) * fade})`; g.lineDashOffset = e * 3.1; g.beginPath(); qpath(ed, 1); g.stroke(); g.setLineDash([]);
} else {
g.lineWidth = lw * 1.1; g.strokeStyle = `rgba(214,150,118,${(0.1 + 0.28 * a) * fade})`; g.beginPath(); qpath(ed, 1); g.stroke();
}
}
if (any) g.restore();
if (held) {
const n = held.n, hx = n.px - n.tx * K, hy = n.py - n.ty * K;
if (Math.hypot(n.tx, n.ty) * K > 6) {
g.save(); g.globalCompositeOperation = 'lighter'; g.setLineDash([1.5, 5]); g.lineCap = 'round'; g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,236,196,.55)'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(n.px, n.py); g.stroke();
g.setLineDash([]); g.lineWidth = 1; g.strokeStyle = 'rgba(255,236,196,.4)'; g.beginPath(); g.arc(hx, hy, 3.2, 0, Math.PI * 2); g.stroke(); g.restore();
}
}
}
const hints = [];
for (const [sel, txt] of [['.st-hint', phone ? EXTRA_TOUCH : EXTRA], ['.st-tap', EXTRA_TOUCH]]) {
const h = sky.querySelector(sel); if (h && !h.dataset.lpBase) { h.dataset.lpBase = h.textContent; h.textContent = h.dataset.lpBase + (/[.।!]\s*$/.test(h.dataset.lpBase) ? ' ' : ' · ') + (hi ? txt.hi : txt.en); hints.push(h); }
}
sky.setAttribute('data-people-field', ctx.tier);
api.wake();
const q = (p) => { const n = Math.min(sm, 240); if (!n) return 0; const a = Array.from(stepMs.subarray(0, n)).sort((x, y) => x - y); return +a[Math.min(n - 1, Math.floor(n * p))].toFixed(4); };
const dbg = ctx.debug && window.SpiritualLife && window.SpiritualLife.debug;
if (dbg) dbg.people = {
label: 'spring/ODE (not PhysX)', field, nodes: () => nodes.map((n, i) => ({ id: n.id, tx: +field.ux[i].toFixed(2), ty: +field.uy[i].toFixed(2) })),
kick: (id, dx, dy) => { const i = idx.get(id); if (i != null) field.kick(i, dx, dy); api.wake(); }, ids: () => nodes.map((n) => n.id),
stats: () => Object.assign(field.stats(), { frames: sn, workP50: q(0.5), workP95: q(0.95), workMax: q(1), freezeFar, wholeOff, edgesOn: field.edgesOn, held: !!held }),
maxOffset: () => { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, Math.hypot(field.ux[i], field.uy[i])); return +m.toFixed(2); },
resetStats: () => { sm = 0; sn = 0; }, lastRelease: () => last,
};
return {
dispose() {
api.unhook(); held = null;
for (const h of hints) { h.textContent = h.dataset.lpBase; delete h.dataset.lpBase; }
sky.removeAttribute('data-people-field'); if (dbg) delete dbg.people;
},
};
}
