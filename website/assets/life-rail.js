const RAILS = '[data-life-for~="rail"], .path-rail, .path-list--else, .cx-scroll[data-rail-x]';
const TEXTY = (el) => { for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true; return false; };
export default function mount(ctx) {
const { Spring, friction, clamp } = ctx.spring, d = document, phone = ctx.caps.phone;
const rails = [];
let leanOn = true, dragOn = !phone, off = null, awake = 0;
const regLean = ctx.budget.register({ id: 'rail-lean', label: 'spring/ODE', cost: 'waapi', priority: 2, drop() { leanOn = false; rails.forEach((r) => r.rest()); }, restore() { leanOn = true; } });
const regDrag = phone ? null : ctx.budget.register({ id: 'rail-drag', label: 'spring/ODE', cost: 'waapi', priority: 3, drop() { dragOn = false; rails.forEach((r) => r.release()); }, restore() { dragOn = true; } });
const make = (el) => {
const list = (el.matches('ul, ol') ? el : el.querySelector(':scope > ul, :scope > ol')) || el;
const R = { el, list, mode: 'idle', X: el.scrollLeft, V: 0, o: 0, max: 0, snaps: [], offs: [], lw: [], vis: false, sl: el.scrollLeft, vm: 0, lastW: -1, still: 0 };
const items = () => Array.from(list.children).filter((c) => c.nodeType === 1);
let cards = [], springs = [];
const S = new Spring(0, 2.6, 0.68);   // the one position spring: snap (and the rubber band) both use it
let pad = 0;
R.measure = () => {
if (R.mode !== 'idle' || R.o) return;
const e = el.getBoundingClientRect(), sl = el.scrollLeft; cards = items(); R.offs = cards.map((c) => c.getBoundingClientRect().left - e.left + sl); R.lw = cards.map((c) => c.offsetWidth);
pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0; R.max = Math.max(0, el.scrollWidth - el.clientWidth);
R.snaps = Array.from(new Set(R.offs.map((x) => Math.round(clamp(x - pad, 0, R.max))))).sort((a, b) => a - b);
while (springs.length < cards.length) springs.push(new Spring(0, 2.1 + (springs.length % 5) * 0.09, 0.4));
};
R.active = () => R.mode !== 'idle';
const shift = (o) => { if (R.o === o) return; R.o = o; list.style.translate = o ? (-o).toFixed(2) + 'px 0' : ''; };
const rubber = (excess) => { const dim = el.clientWidth || 600; return Math.sign(excess) * dim * 0.5 * (1 - 1 / (Math.abs(excess) * 0.55 / dim + 1)); };   // the farther it is pulled, the harder it resists
const write = (X) => { const sl = clamp(X, 0, R.max); if (Math.abs(el.scrollLeft - sl) > 0.01) el.scrollLeft = sl; R.sl = sl; shift(clamp(X - sl, -140, 140)); R.X = X; };
const nearest = (x, v) => {   // the card a throw comes to rest on: the snap point nearest where it was headed, never back against the throw
const proj = x + v * 0.16; let best = R.snaps[0] || 0, bd = 1e9;
for (const s of R.snaps) { const dd = Math.abs(s - proj) + (v > 60 && s < x - 4 ? 400 : v < -60 && s > x + 4 ? 400 : 0); if (dd < bd) { bd = dd; best = s; } }
return best;
};
const go = (mode) => { R.mode = mode; el.dataset.lr = mode; wake(); };
const settle = () => { R.mode = 'idle'; R.V = 0; delete el.dataset.lr; shift(0); R.X = el.scrollLeft; R.sl = el.scrollLeft; };
R.release = () => { if (R.mode === 'drag') { endDrag(false); } if (R.mode !== 'idle') { const sl = clamp(R.X, 0, R.max); if (R.X !== sl) { S.x = R.X; S.v = R.V * 0.4; S.target = sl; S.freq = 1.7; S.zeta = 0.8; R.mode = 'edge'; } else settle(); } };   // (let go of whatever moves it; a stretch relaxes by itself)
R.rest = () => { cards.forEach((c, i) => { if (c.style.getPropertyValue('--lr')) { c.style.removeProperty('--lr'); c.style.removeProperty('--lr-y'); } if (springs[i]) { springs[i].set(0); } }); R.vm = 0; delete el.dataset.lrLean; };
let pid = -1, sx = 0, ssl = 0, armed = false, dragging = false, px = 0, pt = 0, pxPrev = 0, hold = false;
const endDrag = (fling) => {
if (!dragging && !armed) return; const was = dragging; armed = dragging = false; removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
try { el.releasePointerCapture(pid); } catch (e) {} delete el.dataset.lrGrab;
if (!was) { if (R.mode === 'drag') R.mode = 'idle'; return; }
hold = true; setTimeout(() => { hold = false; }, 0);   // (the click that follows a drag is not a click)
if (!fling) { settle(); return; }
if (Math.abs(R.V) < 90 && R.X >= 0 && R.X <= R.max) { snapTo(R.V); } else { go('fling'); }
};
const snapTo = (v) => { S.x = R.X; S.v = v; S.target = nearest(R.X, v); S.freq = 2.6; S.zeta = 0.68; go('snap'); };
const move = (e) => {
if (e.pointerId !== pid) return;
if (!dragging) {
const dx = e.clientX - sx; if (Math.abs(dx) < 5) return;
dragging = true; R.measure(); ssl = el.scrollLeft; R.X = ssl; R.V = 0; try { el.setPointerCapture(pid); } catch (x) {} el.dataset.lrGrab = '1'; { const g = getSelection && getSelection(); if (g && g.rangeCount && el.contains(g.anchorNode)) g.removeAllRanges(); } go('drag'); pxPrev = px = e.clientX; pt = performance.now(); sx = e.clientX;
}
px = e.clientX;
};
const up = (e) => { if (e.pointerId !== pid) return; endDrag(e.type === 'pointerup'); };
const down = (e) => {
if (!dragOn || e.pointerType !== 'mouse' || e.button !== 0 || e.isPrimary === false) return;
const t = e.target; if (!(t instanceof Element) || TEXTY(t) || t.closest('button, input, select, textarea, summary, [contenteditable="true"]')) return;
const r = el.getBoundingClientRect(); if (e.clientY - r.top > el.clientHeight || e.clientX - r.left > el.clientWidth) return;   // (the scrollbar is the browser's)
R.measure(); if (R.max < 2) return;
if (R.mode === 'fling' || R.mode === 'snap' || R.mode === 'edge') { R.mode = 'idle'; delete el.dataset.lr; }   // (a hand catches a moving rail: it stops, then follows the hand)
pid = e.pointerId; sx = px = pxPrev = e.clientX; armed = true; ssl = el.scrollLeft; R.X = ssl;
addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
};
const native = () => { if (R.mode === 'fling' || R.mode === 'snap' || R.mode === 'edge') { const sl = clamp(R.X, 0, R.max); if (R.mode !== 'edge' || Math.abs(R.X - sl) < 1) { settle(); } else { S.x = R.X; S.v = R.V * 0.4; S.target = sl; S.freq = 1.7; S.zeta = 0.85; R.mode = 'edge'; delete el.dataset.lr; } } };
const stopFor = (e) => { if (R.mode === 'drag') return; native(); };
const swallow = (e) => { if (hold) { e.preventDefault(); e.stopPropagation(); } };
const noDrag = (e) => { if (armed || dragging) e.preventDefault(); };
const wheel = (e) => {
stopFor(e); if (!dragOn || R.mode !== 'idle' || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || e.ctrlKey) return;
R.measure(); const sl = el.scrollLeft; if ((e.deltaX < 0 && sl <= 0.5) || (e.deltaX > 0 && sl >= R.max - 0.5)) { S.x = R.X = sl + clamp(e.deltaX * 0.35, -60, 60) + 0; S.v = 0; S.target = sl; S.freq = 2.2; S.zeta = 0.7; R.V = 0; R.mode = 'edge'; el.dataset.lr = 'edge'; wake(); }
};
const key = () => stopFor();
const onScroll = () => { if (R.mode === 'fling' || R.mode === 'snap' || R.mode === 'edge') { if (Math.abs(el.scrollLeft - R.sl) > 2.5) native(); } wake(); };
el.addEventListener('pointerdown', down, { passive: true, signal: ctx.signal });
el.addEventListener('wheel', wheel, { passive: true, signal: ctx.signal });
el.addEventListener('keydown', key, { passive: true, signal: ctx.signal });
el.addEventListener('touchstart', key, { passive: true, signal: ctx.signal });
el.addEventListener('scroll', onScroll, { passive: true, signal: ctx.signal });
el.addEventListener('click', swallow, { capture: true, signal: ctx.signal });
el.addEventListener('dragstart', noDrag, { signal: ctx.signal });
const marked = []; if (!phone) { for (const x of el.querySelectorAll('a, img')) { if (x.draggable !== false) { x.draggable = false; marked.push(x); } } el.dataset.lrReady = ''; }
R.undo = () => { R.rest(); settle(); for (const x of marked) x.draggable = true; delete el.dataset.lrReady; delete el.dataset.lr; delete el.dataset.lrGrab; };
const vref = phone ? 2400 : 2800, A = phone ? 1.4 : 2.4;   // the speed (px/s) that swings a card fully, and how far (degrees) that is
R.frame = (dt, gv) => {
if (!R.vis && R.mode === 'idle') return false;
const sl0 = el.scrollLeft;
if (R.mode === 'drag') {
const target = ssl - (px - sx), tx = target;   // where the hand says the rail is: past an end it is stretched, not followed
const clamped = clamp(tx, 0, R.max), ex = tx - clamped, X = clamped + rubber(ex);
const vi = (X - R.X) / Math.max(dt, 0.001); R.V += (clamp(vi, -9000, 9000) - R.V) * (1 - Math.exp(-dt / 0.045)); write(X);
} else if (R.mode === 'fling') {
R.V = friction(R.V, 1.9, 140, dt); let X = R.X + R.V * dt;
if (X < 0 || X > R.max) { const b = X < 0 ? 0 : R.max; S.x = X; S.v = R.V * 0.55; S.target = b; S.freq = 1.7; S.zeta = 0.78; R.mode = 'edge'; el.dataset.lr = 'edge'; write(X); }
else { write(X); if (Math.abs(R.V) < 240) snapTo(R.V); }
} else if (R.mode === 'snap' || R.mode === 'edge') {
S.step(dt); R.V = S.v; write(S.x);
if (R.mode === 'edge' && Math.abs(S.x - S.target) < 0.5 && Math.abs(S.v) < 12) { if (R.snaps.length > 1 && !R.snaps.includes(Math.round(S.target))) { R.X = S.target; snapTo(0); } else { write(S.target); settle(); } }
else if (R.mode === 'snap' && Math.abs(S.x - S.target) < 0.35 && Math.abs(S.v) < 6) { write(S.target); settle(); }
} else { R.X = sl0; }
const sl = el.scrollLeft; const vi = (sl - R.lastW) / Math.max(dt, 0.001); R.lastW = sl;
R.vm += (clamp(vi, -12000, 12000) - R.vm) * (1 - Math.exp(-dt / 0.05));
let live = R.mode !== 'idle' || Math.abs(R.vm) > 6;
if (leanOn) {
if (!cards.length || !R.offs.length) R.measure();
const tgt = -clamp(R.vm / vref, -1, 1) * A, gy = clamp(gv, -1, 1) * 5, w = el.clientWidth;
let any = false;
for (let i = 0; i < cards.length; i++) {
const x0 = R.offs[i] - sl; if (x0 > w + 220 || x0 + (R.lw[i] || 0) < -220) { if (cards[i].style.getPropertyValue('--lr')) { cards[i].style.removeProperty('--lr'); cards[i].style.removeProperty('--lr-y'); springs[i] && springs[i].set(0); } continue; }
const s = springs[i]; s.target = tgt; s.step(dt);
const y = gy * (1 + (i % 4) * 0.12);
if (Math.abs(s.x) < 0.01 && Math.abs(s.v) < 0.02 && Math.abs(tgt) < 0.01 && Math.abs(gy) < 0.02) { if (cards[i].style.getPropertyValue('--lr')) { cards[i].style.removeProperty('--lr'); cards[i].style.removeProperty('--lr-y'); } s.set(0); continue; }
any = true; cards[i].style.setProperty('--lr', s.x.toFixed(2)); cards[i].style.setProperty('--lr-y', y.toFixed(2));
}
if (any) { live = true; el.dataset.lrLean = '1'; } else delete el.dataset.lrLean;
}
return live;
};
R.debug = () => ({ mode: R.mode, X: +R.X.toFixed(1), V: +R.V.toFixed(1), o: +R.o.toFixed(1), max: R.max, sl: el.scrollLeft, snaps: R.snaps.slice(), vm: +R.vm.toFixed(1), leans: cards.map((c) => +(c.style.getPropertyValue('--lr') || 0)), vis: R.vis });
R.measure(); R.lastW = el.scrollLeft;
return R;
};
const frame = (dt, s) => {
regLean.begin(); const gv = clamp(s.svy / 3200, -1, 1); let live = false;
for (const r of rails) { if (r.frame(dt, gv)) live = true; }
regLean.end(); if (!live && off) { off(); off = null; }
};
const wake = () => { if (!off) { off = ctx.bus.frame(frame); } };
const rel = ctx.bus.use({ scroll: true });
const found = Array.from(new Set([...ctx.els(), ...d.querySelectorAll(RAILS)]));
for (const el of found) { if (!(el instanceof HTMLElement)) continue; const r = make(el); rails.push(r); }
const io = new IntersectionObserver((es) => { for (const e of es) { const r = rails.find((x) => x.el === e.target); if (r) { r.vis = e.isIntersecting; if (r.vis) { r.lastW = r.el.scrollLeft; r.measure(); } } } }, { rootMargin: '120px 0px' });
rails.forEach((r) => io.observe(r.el));
const ro = new ResizeObserver(() => rails.forEach((r) => r.measure())); rails.forEach((r) => { ro.observe(r.el); ro.observe(r.list); });
ctx.dispose(() => { off && off(); off = null; rel(); io.disconnect(); ro.disconnect(); rails.forEach((r) => r.undo()); });
if (ctx.debug) window.__lifeRails = { rails: () => rails.map((r) => r.debug()), get raw() { return rails; }, leanOn: () => leanOn, dragOn: () => dragOn };
return { dispose() { delete window.__lifeRails; } };
}
