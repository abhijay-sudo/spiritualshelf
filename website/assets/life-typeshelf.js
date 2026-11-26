const d = document, R = d.documentElement, now = () => performance.now();
const hostEl = () => d.querySelector('section.cx-open[data-fx-water]');
const introOver = () => !R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end');
const UPPER = (s, tt) => (tt === 'uppercase' ? s.toUpperCase() : tt === 'lowercase' ? s.toLowerCase() : s);
export default async function mount(ctx) {
const ph = ctx.physics, G = window.SpiritualGPU; if (!ph || !G) return null;
const T = await import(ctx.deps[0]), atlas = ctx.deps[1], sec = hostEl(); if (!sec) return null;
const S = { gen: 0, boxes: [], bodies: [], petals: [], built: false, paused: false, dead: false, next: 0, spawned: 0, landed: 0, slid: 0, hid: 0, base: 0.12, lastBase: -1, lastSend: 0, rebuilds: 0, why: '', seed: 7 };
const rnd = () => { S.seed = (Math.imul(S.seed, 1664525) + 1013904223) >>> 0; return S.seed / 4294967296; };
const gShelf = ph.group('shelf', { cap: T.BOX_CAP, collide: ['petals'], self: false }), gPet = ph.group('petals', { cap: T.PETAL_CAP, collide: ['shelf'], self: false });
if (!gShelf || !gPet) return null;
let field = null, timer = 0, ro = null, mo = null, tries = 0, layer = null; const tracker = ctx.layout.track(sec), cv = d.createElement('canvas').getContext('2d'), wv = [0, 0], tmp = new Float32Array(8), mat = new Array(16), world = [0, 0];
const hP = ctx.budget.register({ id: 'typeshelf-physx', label: 'PhysX', cost: 'physx', priority: 2, drop: () => stop('governor'), restore: () => { rebuild('restored'); } });
const hW = ctx.budget.register({ id: 'typeshelf-air', label: 'custom force on PhysX', cost: 'physx', priority: 2, drop: () => { if (field) field.off(); }, restore: () => { if (field) field.set({ on: true }); } });
void hP; void hW;
const makeLayer = () => {
layer = d.createElement('div'); layer.className = 'lt-layer'; layer.setAttribute('aria-hidden', 'true'); layer.setAttribute('data-life-for', 'typeshelf'); layer.style.setProperty('--lt-atlas', `url("${atlas}")`);
sec.insertBefore(layer, sec.querySelector('.cx-open-card') || null);
};
makeLayer();
const rect = (r) => { const a = Array.from(r.getClientRects()).filter((b) => b.width > 0); if (!a.length) return null; let l = 1e9, t = 1e9, rr = -1e9, b = -1e9; for (const q of a) { l = Math.min(l, q.left); t = Math.min(t, q.top); rr = Math.max(rr, q.right); b = Math.max(b, q.bottom); } return { l, t, r: rr, b, h: b - t }; };
const ink = (el, text, rc) => {
const cs = getComputedStyle(el); cv.font = cs.font || `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const m = cv.measureText(UPPER(text, cs.textTransform));
const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent, aa = m.actualBoundingBoxAscent; if (!(fa > 0) || !(rc.h > 0)) return null;
const f = rc.h / (fa + fd), base = rc.t + fa * f, top = base - Math.max(aa, 0.4 * fa) * f; return { top, base };
};
const wordsOf = (el) => {
const w = d.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = []; let full = ''; while (w.nextNode()) { nodes.push({ n: w.currentNode, at: full.length }); full += w.currentNode.nodeValue; }
const at = (i) => { for (let k = nodes.length - 1; k >= 0; k--) if (i >= nodes[k].at) return { n: nodes[k].n, o: Math.min(i - nodes[k].at, nodes[k].n.nodeValue.length) }; return null; };
const out = [], seg = new Intl.Segmenter(el.lang || R.lang || undefined, { granularity: 'word' }), r = d.createRange();
for (const s of seg.segment(full)) { if (!s.isWordLike) continue; const a = at(s.index), b = at(s.index + s.segment.length - 1); if (!a || !b) continue; r.setStart(a.n, a.o); r.setEnd(b.n, Math.min(b.o + 1, b.n.nodeValue.length)); const rc = rect(r); if (rc) out.push({ text: s.segment, rc, host: a.n.parentElement || el }); }
return out;
};
const measure = () => ctx.layout.read(() => {
const sr = sec.getBoundingClientRect(), out = [], put = (el, text, rc) => { const k = ink(el, text, rc); if (k) out.push({ x: rc.l - sr.left, y: k.top - sr.top, w: rc.r - rc.l, h: k.base - k.top, text }); };
for (const el of sec.querySelectorAll('.cx-welcome-k')) for (const q of wordsOf(el)) put(q.host, q.text, q.rc);
for (const el of sec.querySelectorAll('.cx-wm-l')) { const t = el.textContent.trim(), r = d.createRange(); r.selectNodeContents(el); const rc = rect(r); if (t && rc) put(el, t, rc); }   // (the wordmark's letters stand apart: each is a box)
for (const el of sec.querySelectorAll('.cx-wm-sub, .cx-ol-a .cx-w')) { const t = el.textContent.trim(), r = d.createRange(); r.selectNodeContents(el); const rc = rect(r); if (t && rc) put(el, t, rc); }
const card = sec.querySelector('.cx-open-foot .cx-read'); if (card) { const b = card.getBoundingClientRect(); if (b.width > 0) out.push({ x: b.left - sr.left, y: b.top - sr.top, w: b.width, h: Math.min(b.height, 12), text: 'card' }); }   // (the edge of the choose-your-character card)
return { boxes: out, sw: sr.width, sh: sr.height, top: (d.querySelector('.ed-head') ? d.querySelector('.ed-head').getBoundingClientRect().bottom : 60) - sr.top };
});
const ready = () => { const L = G.lake; return !!(L && L.ready && introOver() && sec.isConnected && d.fonts && d.fonts.status !== 'loading'); };
const clearAll = () => { gShelf.clear(); gPet.clear(); for (const p of S.petals) { p.el.remove(); } S.petals = []; S.bodies = []; S.boxes = []; if (field) { field.off(); field = null; } };
const settled = () => new Promise((res) => { const t0 = now(), chk = () => { if ((gShelf.count === 0 && gPet.count === 0) || now() - t0 > 1500) res(); else setTimeout(chk, 30); }; chk(); });
async function build(why) {
const my = ++S.gen; S.why = why; if (S.dead) return;
const m = await measure(); if (my !== S.gen || S.dead) return;
clearAll(); await settled(); if (my !== S.gen || S.dead) return;
S.boxes = T.pickBoxes(m.boxes); S.top = Math.max(m.top + 24, 70); S.sw = m.sw; S.sh = m.sh;
for (const b of S.boxes) { const sp = T.boxSpec(b), body = gShelf.box({ pos: sp.pos, half: sp.half, kind: 'static' }); if (body) S.bodies.push(body); }
field = gPet.field(Object.assign({}, T.FIELD, { speed: S.base }));
S.built = true; S.paused = false; S.rebuilds++; S.next = now() + 1200;
}
const rebuild = (why) => { clearTimeout(timer); timer = setTimeout(() => { if (!S.dead && ready()) build(why); else if (!S.dead && ++tries < 600) rebuild(why); }, 250); };
const stop = (why) => { S.why = 'stopped: ' + why; clearAll(); S.built = false; };
const spawn = () => {
if (!S.boxes.length || S.petals.length >= T.PETAL_CAP) return;
const box = S.boxes[Math.floor(rnd() * S.boxes.length)], st = T.startAbove(box, S.top, rnd, S.boxes); T.toWorld(st.x, st.y, world);
const b = gPet.box({ pos: [world[0], world[1], 0], half: [T.PETAL.hx, T.PETAL.hy, T.PETAL.hz], kind: 'dynamic', quat: st.quat, density: T.PETAL.density, damp: T.PETAL.damp, sleep: T.PETAL.sleep, mat: T.PETAL.mat, ttl: T.PETAL.life, wind: 0.9 + rnd() * 0.3, seed: rnd() * 50, lockZ: true });
if (!b) return; const el = d.createElement('i'); el.className = 'lt-p'; el.dataset.c = String(Math.floor(rnd() * 4)); el.style.opacity = '0'; layer.appendChild(el);
S.petals.push({ b, el, born: now(), restAt: 0, shoves: 0, lastShove: 0, landed: false }); S.spawned++;
};
const onSnap = () => {
if (S.dead || !S.built) return; const t = now();
for (let i = S.petals.length - 1; i >= 0; i--) {
const p = S.petals[i], age = (t - p.born) / 1000;
if (!p.b.alive || age > T.PETAL.life + 0.2) { p.el.remove(); S.petals.splice(i, 1); continue; }
p.b.pose(tmp); const q = [tmp[3], tmp[4], tmp[5], tmp[6]]; T.petalMatrix(q, tmp[0], tmp[1], mat);
p.el.style.transform = `matrix3d(${mat[0].toFixed(3)},${mat[1].toFixed(3)},0,0,${mat[4].toFixed(3)},${mat[5].toFixed(3)},0,0,0,0,1,0,${mat[12].toFixed(1)},${mat[13].toFixed(1)},0,1)`;
p.el.style.opacity = T.alphaAt(age).toFixed(2);
const awake = p.b.awake;
if (!awake) { if (!p.restAt) { p.restAt = t; if (!p.landed) { p.landed = true; S.landed++; } } } else if (p.restAt && t - p.restAt > 200) p.restAt = 0;
if (p.restAt && t - p.restAt > 2600 + 700 * p.shoves && p.shoves < 3 && t - p.lastShove > 1800) {
const px = tmp[0] * T.PPM, py = -tmp[1] * T.PPM; let on = null; for (const b of S.boxes) if (px >= b.x - 4 && px <= b.x + b.w + 4 && Math.abs(py - b.y) < 22) { on = b; break; }
if (on) { const s = T.shove(px, on); p.b.impulse(s.impulse); p.shoves++; p.lastShove = t; p.restAt = 0; S.slid++; }
}
}
};
ph.onSnapshot(onSnap); ph.onLost((why) => stop('physics lost: ' + why));
const frame = () => { try { tick(); } catch (e) { S.err = String(e && e.stack || e).slice(0, 300); } };   // (the bus swallows a throw silently: this keeps the message for ?fxdebug=1)
const tick = () => {
if (!S.built || S.dead) return; const t = now(), vis = tracker.visible;
if (!vis) { if (++S.hid > 40 && !S.paused) { S.paused = true; } } else { S.hid = 0; if (S.paused) { S.paused = false; S.next = t + 800; } }
if (S.paused) return;
if (G.windAt) { G.windAt((S.sw || 800) * 0.5, (S.sh || 600) * 0.3, wv); S.base = Math.max(-1, Math.min(1, wv[0] / T.PPM)) + 0.02; }
if (field && (Math.abs(S.base - S.lastBase) > 0.03 || t - S.lastSend > 1500)) { S.lastBase = S.base; S.lastSend = t; field.set({ speed: S.base, on: true }); }
if (t >= S.next && S.petals.length < T.PETAL_CAP - 2) { spawn(); S.next = t + 2300 + rnd() * 2200; }
};
const offFrame = ctx.bus.frame(frame);
const poll = () => { if (S.dead) return; if (ready()) { build('first'); watch(); } else if (++tries < 600) setTimeout(poll, 250); };
const watch = () => {
ro = new ResizeObserver(() => { if (S.built) rebuild('resized'); }); ro.observe(sec);
try { d.fonts.ready.then(() => { if (!S.dead && S.built) rebuild('fonts'); }); } catch (e) { /* no font events: the resize observer covers it */ }
mo = new MutationObserver(() => { if (S.built) rebuild('lang or mode'); }); mo.observe(R, { attributes: true, attributeFilter: ['lang', 'data-light'] });
};
poll();
const dbg = window.SpiritualLife && window.SpiritualLife.debug;
if (dbg) dbg.typeshelf = {
get built() { return S.built; }, get why() { return S.why; }, get err() { return S.err || ''; }, vis: () => ({ visible: tracker.visible, paused: S.paused, next: Math.round(S.next - now()), petals: S.petals.length }), boxes: () => S.boxes.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), text: b.text })), counts: () => ({ boxes: gShelf.count, petals: gPet.count, spawned: S.spawned, landed: S.landed, slid: S.slid, rebuilds: S.rebuilds }),
petals: () => S.petals.map((p) => { p.b.pose(tmp); return { x: +(tmp[0] * T.PPM).toFixed(1), y: +(-tmp[1] * T.PPM).toFixed(1), awake: p.b.awake, age: +((now() - p.born) / 1000).toFixed(1), restS: p.restAt ? +((now() - p.restAt) / 1000).toFixed(1) : 0, shoves: p.shoves }; }),
spawn: (n) => { for (let i = 0; i < (n || 1); i++) spawn(); }, rebuild: () => rebuild('asked'), setNext: (ms) => { S.next = now() + ms; }, off: () => stop('asked'), on: () => rebuild('asked'),
};
return { dispose() { S.dead = true; S.gen++; clearTimeout(timer); offFrame(); tracker.dispose(); if (ro) ro.disconnect(); if (mo) mo.disconnect(); try { clearAll(); } catch (e) { /* the world is gone already */ } if (layer) layer.remove(); if (dbg) delete dbg.typeshelf; } };
}
