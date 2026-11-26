const d = document, R = d.documentElement;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export default function mount(ctx) {
if (ctx.id === 'boughs') return run(ctx, true);
if (ctx.id === 'boughs-spring') return run(ctx, false);
if (ctx.id === 'boughs-lite') return lite(ctx);
return null;
}
const introOver = () => !R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end');
const hostEl = () => d.querySelector('section.cx-open[data-fx-water]');
function obstacles(ctx, sec) {
return ctx.layout.read(() => {
const sr = sec.getBoundingClientRect(), ox = sr.left + scrollX, oy = sr.top + scrollY, out = [];
const add = (x, y, w, h) => { if (w > 1 && h > 1) out.push({ x: x - ox, y: y - oy, w, h }); };
for (const el of sec.querySelectorAll('.cx-welcome-k, .cx-wm-sub, .cx-open-line, .cx-open-sub')) for (const w of ctx.layout.words(el)) for (const r of w.rects) add(r.x, r.y, r.w, r.h);   // (one box per word: a block is as wide as its column, the ink is not)
for (const el of sec.querySelectorAll('.cx-wm-l, .cx-wm-line, .cx-open-foot a, .cx-open-foot button, .cx-open-card button, .cx-open-card a')) { const b = el.getBoundingClientRect(); add(b.left + scrollX, b.top + scrollY, b.width, b.height); }
return out;
});
}
async function run(ctx, wantPhysx) {
const G = window.SpiritualGPU, ph = wantPhysx ? ctx.physics : null;
if (!G || (wantPhysx && !ph)) return null;
const mod = await import(ctx.deps[0]), atlas = ctx.deps[1];
const sec = hostEl(); if (!sec) return null;
const S = { gen: 0, rig: null, phys: null, spring: null, mode: ph ? 'physx' : 'spring', paused: false, built: false, cover: null, pxm: 0, base: 0, tipRest: [], dead: false, field: [], wake: [], wakeOn: false, lastSpeed: -1, lastSend: 0, why: '', rebuilds: 0, packN: 0 };
const rows = () => G.far && G.far.boughs && G.far.boughs.data;
const world = [0, 0], tmp = new Float32Array(8), wv = [0, 0];
const off = ctx.bus.use({ pointer: true, scroll: true }), tracker = ctx.layout.track(sec);
let timer = 0, mo = null, ro = null, tries = 0, groupL = null, groupR = null;
const hP = ph ? ctx.budget.register({ id: 'boughs-physx', label: 'PhysX', cost: 'physx', priority: 4, drop: () => degrade('governor'), restore: () => { rebuild('restored'); } }) : null;
const hW = ph ? ctx.budget.register({ id: 'boughs-wind', label: 'custom force on PhysX', cost: 'physx', priority: 4, drop: () => { for (const f of S.field) f.off(); }, restore: () => { for (const f of S.field) f.set({ on: true }); } }) : null;
const hS = ctx.budget.register({ id: 'boughs-gpu', label: ph ? 'shader' : 'spring/ODE', cost: 'webgl', priority: 3, drop: () => { G.far.boughs.amount(0); }, restore: () => { if (S.built) G.far.boughs.amount(1); } });
void hS;
const ready = () => { const L = G.lake, B = G.far && G.far.boughs; return !!(L && L.ready && L.cover && L.cover[2] > 50 && B && introOver() && sec.isConnected); };
const clearPhysx = () => { if (groupL) groupL.clear(); if (groupR) groupR.clear(); for (const f of S.field) f.off(); S.field = []; S.wake = []; S.wakeOn = false; S.phys = null; };
const settled = () => new Promise((res) => { const t0 = performance.now(); const chk = () => { if (!ph || ((!groupL || groupL.count === 0) && (!groupR || groupR.count === 0)) || performance.now() - t0 > 1500) res(); else setTimeout(chk, 30); }; chk(); });
async function build(why) {
const my = ++S.gen; S.why = why; if (S.dead) return;
const L = G.lake, B = G.far.boughs, obs = await obstacles(ctx, sec); if (my !== S.gen || S.dead) return;
const cover = L.cover.slice(), rig = mod.layoutRig(cover, L.W || sec.clientWidth, L.H_ || sec.clientHeight, obs); S.rig = rig; S.cover = cover; S.pxm = rig.pxm;
const okList = rig.chains.filter((c) => c.ok);
B.amount(0);
if (S.mode === 'physx' && ph) {
clearPhysx(); await settled(); if (my !== S.gen || S.dead) return;
const built = mod.buildPhysx(ph, rig, cover, rig.pxm);
if (!built || !built.chains.length) { degrade('world refused'); return; }
S.phys = built; groupL = built.groups.L; groupR = built.groups.R;
const sp = mod.buildSpec(rig, atlas, built.chains.map((c) => c.c)); B.set(sp);
for (const [g, side] of [[groupL, -1], [groupR, 1]]) {
S.field.push(g.field({ kind: 'wind', group: g.id, dir: [1, 0, 0], speed: 0, k: 1.2, gustGain: 0, gustAdd: 7, curl: { amp: 0.8, speed: 1 }, wake: 0.05 }));
S.wake.push(g.field({ kind: 'wake', k: 6, r: 0.9, on: false, p: [0, 0], v: [0, 0] })); void side;
}
} else {
S.spring = mod.createSpringRig(okList, rig, ctx.spring, cover, rig.pxm); B.set(mod.buildSpec(rig, atlas, okList));
}
S.built = true; S.packN = 0; S.rebuilds++; S.paused = false; S.tipRest = null; tick0(); B.amount(1);
}
const degrade = (why) => {
if (S.mode !== 'physx') return; S.mode = 'spring'; S.why = 'degraded: ' + why; clearPhysx(); if (S.rig) rebuild('fallback to springs');
};
const rebuild = (why) => { clearTimeout(timer); timer = setTimeout(() => { if (!S.dead && ready()) build(why); else if (!S.dead) rebuild(why); }, 220); };
const tick0 = () => { S.lastSend = 0; };
const pointerWorld = (s) => { const r = tracker.rect(); return r ? { x: s.px - r.x, y: s.py - r.y } : { x: s.px, y: s.py }; };   // (the host's box from the layout cache: nothing is measured in a frame)
const frame = (dt, s) => {
if (!S.built || S.dead) return;
const vis = tracker.visible;
if (!vis && !S.paused) { if (++S.hid > 40) { S.paused = true; S.hid = 0; if (S.mode === 'physx') { clearPhysx(); } } return; }
if (vis) S.hid = 0;
if (S.paused) { if (vis && ready()) { S.paused = false; rebuild('visible again'); } return; }
const B = G.far.boughs, r = B.data; if (!r) return;
if (G.windAt) { G.windAt(S.cover[0] + S.cover[2] * 0.5, S.cover[1] + S.cover[3] * 0.47, wv); } else { wv[0] = 24; wv[1] = 0; }
S.base = S.fixed != null ? S.fixed : clamp(wv[0] / S.pxm, -2, 2) + 0.3 + (s.inside && s.type !== 'touch' ? 0.45 * clamp(s.nx, -1, 1) : 0);   // (the air leans a little toward where the pointer is, the way the lake's crowns do)
let wk = null;
if (s.inside && s.type !== 'touch') { const p = pointerWorld(s), sp = Math.hypot(s.vx, s.vy); if (sp > 40) wk = { px: p.x, py: p.y, vx: s.vx, vy: s.vy }; }
if (S.mode === 'physx' && S.phys) {
const now = performance.now();
if (Math.abs(S.base - S.lastSpeed) > 0.04 || now - S.lastSend > 1500) { S.lastSpeed = S.base; S.lastSend = now; for (const f of S.field) f.set({ speed: S.base, on: true }); }
if (wk) { mod.toWorld(S.cover, S.pxm, wk.px, wk.py, world); const vx = clamp(wk.vx / S.pxm, -4, 4), vy = clamp(-wk.vy / S.pxm, -4, 4); for (const f of S.wake) f.set({ on: true, p: [world[0], world[1]], v: [vx, vy], r: 0.9 }); S.wakeOn = true; }
else if (S.wakeOn) { for (const f of S.wake) f.set({ on: false }); S.wakeOn = false; }
} else if (S.spring) {
S.spring.step(dt, S.base, 2.4 * s.gust * (Math.abs(s.gustX) < 0.3 ? (s.gustX < 0 ? -0.7 : 0.7) : s.gustX), wk);
S.spring.pack(r, B.COLS); B.touch();
}
};
S.hid = 0;
const offFrame = ctx.bus.frame(frame);
const onSnap = () => { if (S.mode !== 'physx' || !S.phys || S.paused) return; const r = rows(); if (!r) return; mod.packPhysx(S.phys.chains, r, G.far.boughs.COLS, tmp); G.far.boughs.touch(); S.packN++; };
if (ph) { ph.onSnapshot(onSnap); ph.onLost((why) => degrade('physics lost: ' + why)); }
const poll = () => { if (S.dead) return; if (ready()) { build('first'); watch(); } else if (++tries < 400) setTimeout(poll, 250); };
const watch = () => {
ro = new ResizeObserver(() => { if (S.built) rebuild('resized'); }); ro.observe(sec);
try { d.fonts && d.fonts.ready.then(() => { if (!S.dead && S.built) rebuild('fonts'); }); } catch (e) { /* no font events: the resize observer still covers it */ }
mo = new MutationObserver(() => { if (S.built) rebuild('class'); }); mo.observe(R, { attributes: true, attributeFilter: ['lang', 'data-light'] });
};
poll();
const dbg = window.SpiritualLife && window.SpiritualLife.debug;
if (dbg) {
const api = dbg.boughs = dbg.boughs || {};
api[ph ? 'physx' : 'spring'] = {
get mode() { return S.mode; }, get why() { return S.why; }, get built() { return S.built; }, get paused() { return S.paused; }, rebuilds: () => S.rebuilds, packs: () => S.packN, rig: () => S.rig && S.rig.chains.map((c) => ({ id: c.def.id, ok: c.ok, rx: Math.round(c.rx), ry: Math.round(c.ry), box: c.box })),
bodies: () => (S.phys ? S.phys.chains.reduce((n, c) => n + c.bodies.length, 0) : 0), joints: () => (S.phys ? S.phys.chains.reduce((n, c) => n + c.joints.length, 0) : 0),
tips: () => { const r = rows(); if (!r || !S.rig) return null; const list = S.mode === 'physx' && S.phys ? S.phys.chains.map((c) => c.c) : S.rig.chains.filter((c) => c.ok), cols = G.far.boughs.COLS, out = []; list.forEach((c, i) => { const n = c.def.n, o = (i * cols + n) * 4; out.push({ id: c.def.id, x: +(c.rx + r[o] * S.pxm).toFixed(2), y: +(c.ry - r[o + 1] * S.pxm).toFixed(2), rx: Math.round(c.rx), ry: Math.round(c.ry) }); }); return out; },
gust: (v, dir) => { const b = ctx.bus.state; b.gust = clamp(v == null ? 1 : v, 0, 1); b.gustX = dir == null ? 1 : dir; },
off: () => { S.off = true; clearPhysx(); S.built = false; G.far.boughs.amount(0); }, on: () => { S.off = false; rebuild('asked'); },
degrade: () => degrade('asked'), rebuild: () => rebuild('asked'), amount: (v) => G.far.boughs.amount(v),
tune: (p) => { if (p.fixed != null) S.fixed = p.fixed; for (const f of S.field) f.set(p.wind || {}); }, obstacles: () => obstacles(ctx, sec),
};
}
return {
dispose() {
S.dead = true; S.gen++; clearTimeout(timer); off(); offFrame(); tracker.dispose(); if (ro) ro.disconnect(); if (mo) mo.disconnect();
try { clearPhysx(); } catch (e) { /* the world is already gone */ } try { G.far && G.far.boughs && G.far.boughs.clear(); } catch (e) { /* the lake is already gone */ }
if (dbg && dbg.boughs) delete dbg.boughs[ph ? 'physx' : 'spring'];
},
};
}
async function lite(ctx) {
const sec = hostEl(), img = sec && sec.querySelector('img.ed-still'); if (!sec || !img) return null;
const mod = await import(ctx.deps[0]), atlas = ctx.deps[1], A = mod.ATLAS, ease = ctx.spring.linearEase(1.25, 0.3, 24);
const box = d.createElement('div'); box.className = 'lb-lite'; box.setAttribute('aria-hidden', 'true'); box.setAttribute('data-life-for', 'boughs-lite'); box.style.setProperty('--lb-atlas', `url("${atlas}")`);
sec.insertBefore(box, sec.querySelector('.cx-open-card') || null);
const S = { items: [], gen: 0, dead: false, off: false, built: 0 }; let timer = 0, ro = null, kick = 0;
const tracker = ctx.layout.track(sec), offBus = ctx.bus.use({ scroll: true, pointer: true });
const h = ctx.budget.register({ id: 'boughs-css', label: 'spring/ODE', cost: 'waapi', priority: 2, drop: () => { box.hidden = true; }, restore: () => { box.hidden = false; } });
void h;
const coverOf = () => {
const W = sec.clientWidth, H = sec.clientHeight, por = /portrait/.test(img.currentSrc || img.src), asp = por ? 608 / 1080 : 16 / 9, op = (getComputedStyle(img).objectPosition || '50% 50%').split(' '), pct = (v) => (/%$/.test(v || '') ? parseFloat(v) / 100 : 0.5);
const dw = W / H > asp ? W : H * asp, dh = dw / asp; return { cover: [(W - dw) * pct(op[0]), (H - dh) * pct(op[1] || op[0]), dw, dh], W, H, por };
};
async function build() {
const my = ++S.gen; const obs = await obstacles(ctx, sec); if (my !== S.gen || S.dead) return;
const c = coverOf(), phone = c.W < 700, rig = mod.layoutRig(c.cover, c.W, c.H, obs, undefined, undefined, { portrait: c.por, pxm: c.por ? Math.max(34, c.W / 9.5) : undefined });
box.textContent = ''; S.items = [];
let n = 0; for (const ch of rig.chains) {
if (!ch.ok || (c.por && ch.def.kind !== 'reed') || (phone && ch.def.kind === 'root')) continue; const def = ch.def, reed = def.kind === 'reed', lenPx = def.len * rig.pxm, unit = (q) => A.cells[q.cell];
for (const q of def.inst.slice(0, 2)) {
const cell = unit(q), sc = lenPx / cell[3], w = cell[2] * sc * (q.ws || 1), hgt = lenPx;
const o = d.createElement('i'), b = d.createElement('b'); o.className = 'lb-s' + (reed ? ' is-reed' : ''); o.style.cssText = `left:${(ch.rx + (q.dx || 0) - w / 2).toFixed(1)}px;top:${(reed ? ch.ry - hgt : ch.ry).toFixed(1)}px;width:${w.toFixed(1)}px;height:${hgt.toFixed(1)}px;--lb-a:${(0.9 + 1.6 * ((n * 0.37) % 1)).toFixed(2)}deg;--lb-t:${(5.2 + 3.1 * ((n * 0.53) % 1)).toFixed(1)}s;--lb-d:-${(n * 1.7 % 6).toFixed(1)}s;opacity:${0.88 - 0.1 * (q.haze || 0)}`;
b.style.cssText = `width:100%;height:100%;background-size:${(A.w * sc * (q.ws || 1)).toFixed(1)}px ${(A.h * sc).toFixed(1)}px;background-position:${(-cell[0] * sc * (q.ws || 1)).toFixed(1)}px ${(-cell[1] * sc).toFixed(1)}px${q.mirror ? ';transform:scaleX(-1)' : ''}`;
o.appendChild(b); box.appendChild(o); S.items.push({ o, b, k: reed ? 0.7 : 1 }); n++;
}
}
S.built = n;
}
const ring = (g) => { if (S.off) return; const dir = Math.abs(g.x) > 0.25 ? Math.sign(g.x) : (kick++ % 2 ? 1 : -1), ang = (4 + 9 * g.strength) * dir; for (const it of S.items) { try { it.b.getAnimations().forEach((a) => a.cancel()); it.b.animate([{ rotate: `${(ang * it.k).toFixed(2)}deg` }, { rotate: '0deg' }], { duration: ease.ms, easing: ease.css }); } catch (e) { /* no Web Animations: the CSS sway stays */ } } };
const offGust = ctx.bus.on('gust', ring), offTrack = tracker.onChange((t) => { S.off = !t.visible; box.classList.toggle('is-off', S.off); });
const go = () => { if (S.dead) return; if (introOver() && sec.isConnected) { build(); ro = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(build, 250); }); ro.observe(sec); try { d.fonts && d.fonts.ready.then(() => { clearTimeout(timer); timer = setTimeout(build, 250); }); } catch (e) { /* the resize observer covers it */ } } else setTimeout(go, 300); };
go();
const dbg = window.SpiritualLife && window.SpiritualLife.debug; if (dbg) { dbg.boughs = dbg.boughs || {}; dbg.boughs.lite = { count: () => S.items.length, ring: () => ring({ x: 1, strength: 1 }), items: () => S.items.map((it) => { const r = it.o.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }) }; }
return { dispose() { S.dead = true; S.gen++; clearTimeout(timer); offGust(); offTrack(); offBus(); tracker.dispose(); if (ro) ro.disconnect(); box.remove(); if (dbg && dbg.boughs) delete dbg.boughs.lite; } };
}
