const SEL_CARD = '.grid > .card', SEL_POSTER = '.mx-kand-grid > li > .mx-kand';
const ROWS = '.ed-lib .filters .chips, .ed-rail, .cx-scroll, .path-rail, .cx-posters';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export default function mount(ctx) {
const d = document, R = d.documentElement, bus = ctx.bus, layout = ctx.layout, caps = ctx.caps, S = ctx.spring, Spring = S.Spring;
const fine = !!caps.hover && !caps.phone, rich = ctx.tier !== 'lite';
const offs = [];                                            // everything to give back
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
const live = { depth: true, motes: true, tilt: true, flip: true, arrive: true };
const reg = (id, cost, priority, drop, restore) => ctx.budget.register({ id: 'library-' + id, cost, label: 'spring/ODE', priority, drop, restore });
const head = d.querySelector('.ed-page-head');
let cleanupHead = null;
const depth = () => {
if (!head || !fine) return;
const pics = [...head.querySelectorAll('.ed-page-media img, .ed-page-media video')], inn = head.querySelector('.ed-page-head-in');
if (!pics.length) return;
const sx = new Spring(0, 1.7, 0.78), sy = new Spring(0, 1.7, 0.78), tr = layout.track(head);
let off = null, release = null, near = false, hv = { x: 0, y: 0 };
const MAXX = 24, MAXY = 15, TX = 4.5, TY = 3;
const paint = () => { const x = sx.x, y = sy.x; for (const p of pics) p.style.translate = (-x * MAXX).toFixed(2) + 'px ' + (-y * MAXY).toFixed(2) + 'px'; if (inn) inn.style.translate = (x * TX).toFixed(2) + 'px ' + (y * TY).toFixed(2) + 'px'; };
const h = reg('depth', 'waapi', 2, () => { live.depth = false; stop(); sx.set(0); sy.set(0); paint(); R.removeAttribute('data-life-lib-depth'); }, () => { live.depth = true; R.dataset.lifeLibDepth = '1'; wake(); });
const step = (dt, s) => {
h.begin();
if (live.depth) {
const b = tr.rect();
if (b && s.inside && s.py >= b.top && s.py <= b.bottom) { sx.target = clamp((s.px - (b.left + b.w / 2)) / (b.w / 2), -1, 1); sy.target = clamp((s.py - (b.top + b.h / 2)) / (b.h / 2), -1, 1); near = true; }
else { sx.target = 0; sy.target = 0; near = false; }
}
sx.step(dt); sy.step(dt); paint();
if (!near && sx.settled && sy.settled) { sx.set(0); sy.set(0); paint(); stop(); }
h.end();
};
const wake = () => { if (!live.depth || off) return; release = bus.use({ pointer: true }); off = bus.frame(step); };
const stop = () => { if (off) off(); if (release) release(); off = release = null; };
R.dataset.lifeLibDepth = '1';
on(head, 'pointermove', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') wake(); }, { passive: true });
on(head, 'pointerleave', () => { if (off) { sx.target = 0; sy.target = 0; } else wake(); }, { passive: true });
offs.push(() => { stop(); pics.forEach((p) => p.style.removeProperty('translate')); if (inn) inn.style.removeProperty('translate'); tr.dispose(); R.removeAttribute('data-life-lib-depth'); });
void hv;
};
const motes = () => {
if (!head || !rich || !fine || !/(^|\/)library\/$/.test(location.pathname.replace(/index\.html$/, ''))) return;
const cv = d.createElement('canvas'), cx = cv.getContext('2d', { alpha: true }); if (!cx) return;
cv.className = 'll-motes'; cv.setAttribute('aria-hidden', 'true'); head.prepend(cv);
const N = 28, P = [], dpr = Math.min(devicePixelRatio || 1, 1.5); let W = 0, H = 0, vis = true, off = null, hold = null, seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const spr = d.createElement('canvas'); spr.width = spr.height = 32; { const g = spr.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,238,200,1)'); gr.addColorStop(0.35, 'rgba(255,208,140,.55)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
const size = () => { const r = head.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
layout.read(size).then(() => { for (let i = 0; i < N; i++) P.push({ x: rnd() * W, y: rnd() * H, z: 0.35 + rnd() * 0.65, vx: 0, vy: 0, ph: rnd() * 6.28, tw: 0.4 + rnd() * 0.9 }); });
const ro = new ResizeObserver(() => layout.read(size)); ro.observe(head);
const h = reg('motes', 'waapi', 1, () => { live.motes = false; stop(); cx.clearRect(0, 0, cv.width, cv.height); }, () => { live.motes = true; start(); });
const tr = layout.track(head); const un = tr.onChange((t) => { vis = t.visible; if (vis) start(); else stop(); }); offs.push(() => { un(); tr.dispose(); });
let acc = 0;
const step = (dt, s) => {
acc += dt; if (acc < 1 / 40) return; const k = acc; acc = 0;   // (drawn at 40 a second at most: a mote is slow)
h.begin(); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = 'lighter';
const r = tr.rect(); const px = r && s.inside ? s.px - r.left : -1e4, py = r && s.inside ? s.py - r.top : -1e4, t = s.t;
for (const p of P) {
let ax = Math.sin(t * 0.21 + p.ph) * 5 + 3, ay = Math.cos(t * 0.17 + p.ph * 1.7) * 4 - 2.5 * p.z;
const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
if (d2 < 22500) { const q = 1 - Math.sqrt(d2) / 150; ax += (dx / (Math.sqrt(d2) + 1)) * 260 * q * q + (s.vx || 0) * 0.05 * q; ay += (dy / (Math.sqrt(d2) + 1)) * 260 * q * q + (s.vy || 0) * 0.05 * q; }
ax += s.gust * s.gustX * 220; ay += s.gust * -50 * (p.z + 0.2);
p.vx += ax * k; p.vy += ay * k; const f = Math.exp(-1.7 * k); p.vx *= f; p.vy *= f;
p.x += p.vx * k * (0.5 + p.z); p.y += p.vy * k * (0.5 + p.z);
if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
const a = (0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * p.tw * 1.6 + p.ph))) * p.z, sz = 6 + p.z * 14;
cx.globalAlpha = a; cx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz);
}
cx.globalAlpha = 1; h.end();
};
const start = () => { if (off || !live.motes || !vis) return; hold = bus.use({ pointer: true, scroll: true }); off = bus.frame(step); };
const stop = () => { if (off) off(); if (hold) hold(); off = hold = null; };
start();
offs.push(() => { stop(); ro.disconnect(); cv.remove(); });
};
const cards = [...d.querySelectorAll(SEL_CARD)], posters = [...d.querySelectorAll(SEL_POSTER)];
const tilt = () => {
if (!cards.length && !posters.length) return;
const E = new Map(), active = new Set(), grid = d.querySelector('[data-grid]');
const mk = (el, kind) => ({ el, kind, hot: false, r: null, sy0: 0, a: kind === 'poster' ? 9 : 5.5, rx: new Spring(0, 2.6, kind === 'poster' ? 0.42 : 0.52), ry: new Spring(0, 2.6, kind === 'poster' ? 0.42 : 0.52), u: new Spring(0, 3, 0.7), v: new Spring(0, 3, 0.7), lift: new Spring(0, 3.2, 0.62), on: false });
const get = (el, kind) => { let e = E.get(el); if (!e) { e = mk(el, kind); E.set(el, e); } return e; };
let off = null, release = null, hot = null, shadow = null, shHost = null, shCard = null, hostPos = '';
if (grid && cards.length && fine) {
shHost = grid.parentElement; shadow = d.createElement('div'); shadow.className = 'll-shadow'; shadow.setAttribute('aria-hidden', 'true');
if (getComputedStyle(shHost).position === 'static') { hostPos = 'static'; shHost.style.position = 'relative'; }
shHost.insertBefore(shadow, grid);
}
const h = reg('tilt', 'waapi', 3, () => { live.tilt = false; for (const e of E.values()) { e.hot = false; settle(e); } hot = null; stop(); }, () => { live.tilt = true; });
const settle = (e) => { e.rx.set(0); e.ry.set(0); e.u.set(0); e.v.set(0); e.lift.set(0); paint(e); active.delete(e); };
const paint = (e) => {
const el = e.el, s = el.style, on_ = e.lift.x > 0.002 || Math.abs(e.rx.x) > 0.02 || Math.abs(e.ry.x) > 0.02;
if (!on_ && e.on) { e.on = false; el.classList.remove('ll-on'); ['--ll-rx', '--ll-ry', '--ll-s', '--ll-ty', '--ll-u', '--ll-v', '--ll-a', '--ll-gx', '--ll-gy'].forEach((k) => s.removeProperty(k)); return; }
if (on_ && !e.on) { e.on = true; el.classList.add('ll-on'); }
if (!e.on) return;
const L = e.lift.x;
s.setProperty('--ll-rx', e.rx.x.toFixed(3) + 'deg'); s.setProperty('--ll-ry', e.ry.x.toFixed(3) + 'deg');
s.setProperty('--ll-s', (1 + L * (e.kind === 'poster' ? 0.035 : 0.028)).toFixed(4)); s.setProperty('--ll-ty', (-L * (e.kind === 'poster' ? 5 : 7)).toFixed(2) + 'px');
s.setProperty('--ll-u', e.u.x.toFixed(3)); s.setProperty('--ll-v', e.v.x.toFixed(3));
s.setProperty('--ll-a', clamp(L, 0, 1).toFixed(3)); s.setProperty('--ll-gx', (50 + e.u.x * 40).toFixed(1) + '%'); s.setProperty('--ll-gy', (40 + e.v.x * 40).toFixed(1) + '%');
};
const step = (dt, s) => {
h.begin();
for (const e of active) {
if (e.hot && e.r) {
const top = e.r.top - (scrollY - e.sy0), u = clamp((s.px - (e.r.left + e.r.w / 2)) / (e.r.w / 2), -1, 1), v = clamp((s.py - (top + e.r.h / 2)) / (e.r.h / 2), -1, 1);
if (e.pointer) { e.ry.target = u * e.a; e.rx.target = -v * e.a; e.u.target = u; e.v.target = v; } else { e.ry.target = e.rx.target = e.u.target = e.v.target = 0; }
e.lift.target = 1;
} else { e.rx.target = e.ry.target = e.u.target = e.v.target = 0; e.lift.target = 0; }
e.rx.step(dt); e.ry.step(dt); e.u.step(dt); e.v.step(dt); e.lift.step(dt); paint(e);
if (!e.hot && e.lift.settled && e.rx.settled && e.ry.settled) settle(e);
}
if (shadow) {
const e = shCard && E.get(shCard); if (e && e.r) {
const L = clamp(e.lift.x, 0, 1.2);
shadow.style.transform = 'translate3d(' + (-e.u.x * 14).toFixed(1) + 'px,' + (10 + L * 16 - e.v.x * 8).toFixed(1) + 'px,0) scale(' + (1 + L * 0.03).toFixed(4) + ')'; shadow.style.opacity = clamp(L, 0, 1).toFixed(3);
if (!e.hot && e.lift.x < 0.01) { shadow.style.opacity = '0'; shCard = null; }
}
}
if (!active.size) stop();
h.end();
};
const run = () => { if (off || !live.tilt) return; release = bus.use({ pointer: true }); off = bus.frame(step); };
const stop = () => { if (off) off(); if (release) release(); off = release = null; };
const engage = (el, kind, pointer) => {
if (!live.tilt) return; if (hot && hot.el !== el) { hot.hot = false; } const e = get(el, kind); e.pointer = pointer;
layout.read(() => { const r = el.getBoundingClientRect(); e.r = { left: r.left, top: r.top, w: r.width, h: r.height }; e.sy0 = scrollY; if (shadow && kind === 'card') { const hr = shHost.getBoundingClientRect(); shadow.style.left = r.left - hr.left + 'px'; shadow.style.top = r.top - hr.top + 'px'; shadow.style.width = r.width + 'px'; shadow.style.height = r.height + 'px'; shCard = el; } });
e.hot = true; hot = e; active.add(e); run();
};
const release_ = () => { if (hot) { hot.hot = false; active.add(hot); hot = null; run(); } };
let intent = 0, into = null, lastScroll = -1e9;
const scrolling = () => performance.now() - lastScroll < 160;
const over = (e) => {
if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
const el = e.target.closest && e.target.closest(SEL_CARD + ',' + SEL_POSTER); if (el === into) return; clearTimeout(intent); into = el; if (!el) { release_(); return; }
const kind = el.matches(SEL_POSTER) ? 'poster' : 'card'; let n = 0;
const tryIt = () => { intent = setTimeout(() => { if (into !== el) return; const sp = Math.hypot(bus.state.vx, bus.state.vy); if ((sp > 1200 || scrolling()) && n++ < 8) return tryIt(); if (hot && hot.el !== el) release_(); engage(el, kind, true); }, n ? 60 : kind === 'poster' ? 30 : 80); };
if (hot && hot.el === el) return; tryIt();
};
if (fine) {
on(window, 'scroll', () => { lastScroll = performance.now(); if (hot && hot.pointer) release_(); clearTimeout(intent); into = null; }, { passive: true });
for (const root of [grid, d.querySelector('.mx-kand-grid')].filter(Boolean)) { on(root, 'pointerover', over, { passive: true }); on(root, 'pointerleave', () => { clearTimeout(intent); into = null; release_(); }, { passive: true }); }
on(d, 'focusin', (e) => { const el = e.target.closest && e.target.closest(SEL_CARD + ',' + SEL_POSTER); if (!el || !e.target.matches(':focus-visible')) return; if (hot && hot.el !== el) release_(); engage(el, el.matches(SEL_POSTER) ? 'poster' : 'card', false); });
on(d, 'focusout', (e) => { const el = e.target.closest && e.target.closest(SEL_CARD + ',' + SEL_POSTER); if (el && hot && hot.el === el && !hot.pointer) release_(); });
}
if (posters.length && 'IntersectionObserver' in window) {
const io = new IntersectionObserver((es) => {
for (const en of es) { if (!en.isIntersecting) continue; io.unobserve(en.target); const e = get(en.target, 'poster'), i = posters.indexOf(en.target), sgn = i % 2 ? 1 : -1;
setTimeout(() => { if (!live.tilt) return; e.ry.x = sgn * 7; e.rx.x = 5; e.u.x = sgn * 0.8; e.v.x = 0.5; e.lift.x = 0.25; active.add(e); paint(e); run(); }, 120 + (i % 4) * 70); }
}, { threshold: 0.45 });
posters.forEach((p) => io.observe(p)); offs.push(() => io.disconnect());
}
offs.push(() => { stop(); for (const e of E.values()) { e.hot = false; settle(e); } if (shadow) { shadow.remove(); if (hostPos) shHost.style.removeProperty('position'); } });
};
const flip = () => {
const form = d.querySelector('[data-filters]'), grid = d.querySelector('[data-grid]'); if (!form || !grid) return;
const host = grid.parentElement; let hostSet = false; if (getComputedStyle(host).position === 'static') { host.style.position = 'relative'; hostSet = true; }
const spr = S.linearEase(2.4, 0.56), sprLong = S.linearEase(2.2, 0.74), enter = S.linearEase(2.9, 0.5), cap = caps.phone ? 14 : 30;
let snap = null, snapAt = 0, running = [];
const h = reg('flip', 'waapi', 4, () => { live.flip = false; R.removeAttribute('data-life-lib-flip'); cancel(); }, () => { live.flip = true; R.dataset.lifeLibFlip = '1'; });
R.dataset.lifeLibFlip = '1';
const cancel = () => { for (const a of running.splice(0)) { try { a.cancel(); } catch (e) {} } d.querySelectorAll('.ll-ghost').forEach((g) => g.remove()); };
const all = () => [...grid.children].filter((c) => c.classList && c.classList.contains('card'));
const take = () => {
if (!live.flip) return; const vh = innerHeight, m = new Map();
for (const c of all()) { if (c.hidden) continue; const r = c.getBoundingClientRect(); if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue; m.set(c, { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, vis: r.bottom > -60 && r.top < vh + 60, html: null }); }
snap = m; snapAt = performance.now();
};
for (const ev of ['input', 'change', 'reset']) on(form, ev, take, { capture: true });
on(d, 'click', (e) => { if (e.target.closest && e.target.closest('[data-lib-pick], [data-clear], .chip, .chip-link')) take(); }, { capture: true });
const run = () => {
const s0 = snap, fresh = s0 && performance.now() - snapAt < 700; snap = null;
if (!live.flip || !fresh || !s0.size) return;
const gone = running.splice(0); for (const a of gone) { try { a.cancel(); } catch (e) {} }   // (a filter chosen mid-flight: the first rects above already include the flight, the last must not)
d.querySelectorAll('.ll-ghost').forEach((g) => g.remove());
const vh = innerHeight, hr = host.getBoundingClientRect(), sy = scrollY, sx = scrollX, plan = [], leave = [];
for (const c of all()) {
const f = s0.get(c);
if (c.hidden) { if (f && f.vis) leave.push({ c, f }); continue; }
const r = c.getBoundingClientRect(), vis = r.bottom > -60 && r.top < vh + 60;
if (f) { const dx = f.x - (r.left + sx), dy = f.y - (r.top + sy); if ((Math.abs(dx) > 1 || Math.abs(dy) > 1) && (vis || f.vis)) plan.push({ c, dx, dy, kind: 'move', cx: r.left, cy: r.top }); }
else if (vis) plan.push({ c, dx: 0, dy: 0, kind: 'enter', cx: r.left, cy: r.top });
}
let n = 0;
for (const { c, f } of leave.slice(0, caps.phone ? 8 : 16)) {
const g = c.cloneNode(true); g.hidden = false; g.removeAttribute('data-slug'); g.classList.add('ll-ghost'); g.setAttribute('aria-hidden', 'true'); g.setAttribute('inert', ''); g.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
Object.assign(g.style, { position: 'absolute', left: f.x - sx - hr.left + 'px', top: f.y - sy - hr.top + 'px', width: f.w + 'px', height: f.h + 'px', margin: '0', zIndex: '2', pointerEvents: 'none', transform: 'none' });
host.appendChild(g);
const an = g.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9 }], { duration: 240, easing: 'cubic-bezier(.4,0,.8,.4)', fill: 'forwards', delay: Math.min(n * 8, 80) });
an.onfinish = () => g.remove(); running.push(an); n++;
}
plan.sort((a, b) => a.cy - b.cy || a.cx - b.cx); let k = 0;
for (const p of plan.slice(0, cap * 2)) {
const delay = Math.min(k * 14, 150); k++;
if (p.kind === 'move') running.push(p.c.animate([{ translate: p.dx + 'px ' + p.dy + 'px' }, { translate: '0px 0px' }], (Math.hypot(p.dx, p.dy) > 160 ? { duration: sprLong.ms, easing: sprLong.css, delay, fill: 'backwards' } : { duration: spr.ms, easing: spr.css, delay, fill: 'backwards' })));
else running.push(p.c.animate([{ opacity: 0, scale: 0.86, translate: '0px 14px' }, { opacity: 1, scale: 1, translate: '0px 0px' }], { duration: enter.ms, easing: enter.css, delay: 90 + delay, fill: 'backwards' }));
}
};
const mo = new MutationObserver((rs) => { if (rs.some((m) => m.type === 'childList' || (m.target.parentNode === grid && (m.oldValue !== null) !== m.target.hasAttribute('hidden')))) run(); });
mo.observe(grid, { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true, subtree: true, childList: true }); offs.push(() => mo.disconnect());
offs.push(() => { cancel(); R.removeAttribute('data-life-lib-flip'); if (hostSet) host.style.removeProperty('position'); });
R.dataset.lifeLibChip = '1'; offs.push(() => R.removeAttribute('data-life-lib-chip'));
};
const rows = () => {
if (!fine) return;
const done = new WeakSet(), handles = [];
const attach = (row) => {
if (done.has(row)) return; done.add(row);
let down = false, drag = false, x0 = 0, s0 = 0, vx = 0, lx = 0, lt = 0, raf = 0, id = -1, swallow = false;
const snapType = () => getComputedStyle(row).scrollSnapType;
const free = () => row.classList.add('ll-throw'), fix = () => row.classList.remove('ll-throw');
const stopAnim = () => { cancelAnimationFrame(raf); raf = 0; };
const rest = () => {   // come to rest on a snap point: spring to the nearest child edge, then give the browser its snapping back
if (snapType() === 'none' || !row.children.length) { fix(); return; }
const rr = row.getBoundingClientRect(), pad = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0; let best = 1e9;
for (const c of row.children) { const dd = c.getBoundingClientRect().left - rr.left - pad; if (Math.abs(dd) < Math.abs(best)) best = dd; }
const sp = new Spring(row.scrollLeft, 3.2, 0.95); sp.target = row.scrollLeft + best; let last = performance.now();
const f = (t) => { sp.step(Math.min((t - last) / 1000, 0.05)); last = t; row.scrollLeft = sp.x; if (sp.settled) { row.scrollLeft = sp.target; fix(); raf = 0; } else raf = requestAnimationFrame(f); };
raf = requestAnimationFrame(f);
};
const coast = () => {
let last = performance.now();
const f = (t) => { const dt = Math.min((t - last) / 1000, 0.05); last = t; vx = S.friction(vx, 2.6, 60, dt); const before = row.scrollLeft; row.scrollLeft -= vx * dt; if (Math.abs(vx) < 8 || row.scrollLeft === before) { raf = 0; rest(); } else raf = requestAnimationFrame(f); };
raf = requestAnimationFrame(f);
};
const move = (e) => {
if (!down || e.pointerId !== id) return; const dx = e.clientX - x0;
if (!drag && Math.abs(dx) > 6) { drag = true; swallow = true; free(); row.classList.add('ll-drag'); try { row.setPointerCapture(id); } catch (x) {} getSelection().removeAllRanges(); }
if (!drag) return; row.scrollLeft = s0 - dx;
const t = performance.now(), dt = (t - lt) / 1000; if (dt > 0) { const inst = (e.clientX - lx) / dt; vx += (inst - vx) * 0.4; } lx = e.clientX; lt = t;
};
const up = (e) => { if (!down || (e && e.pointerId !== id)) return; down = false; row.classList.remove('ll-drag'); if (!drag) return; drag = false; try { row.releasePointerCapture(id); } catch (x) {} if (performance.now() - lt > 90) vx = 0; if (Math.abs(vx) > 60) coast(); else rest(); setTimeout(() => { swallow = false; }, 0); };
on(row, 'pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || row.scrollWidth <= row.clientWidth + 4) return; if (e.target.closest('select, textarea, input:not([type=radio]):not([type=checkbox])')) return; stopAnim(); down = true; drag = false; id = e.pointerId; x0 = lx = e.clientX; s0 = row.scrollLeft; vx = 0; lt = performance.now(); }, { passive: true });
on(row, 'pointermove', move, { passive: true }); on(row, 'pointerup', up); on(row, 'pointercancel', up);
on(row, 'click', (e) => { if (swallow) { e.preventDefault(); e.stopPropagation(); } }, { capture: true });
on(row, 'dragstart', (e) => { if (down) e.preventDefault(); });
handles.push(() => { stopAnim(); fix(); row.classList.remove('ll-drag'); });
};
const scan = () => d.querySelectorAll(ROWS).forEach((r) => { if (r.scrollWidth > r.clientWidth + 4) attach(r); });
scan(); on(window, 'resize', scan, { passive: true }); offs.push(() => handles.forEach((f) => f()));
};
const arrive = () => { reg('arrive', 'css', 5, () => { live.arrive = false; R.dataset.lifeLibCalm = '1'; }, () => { live.arrive = true; R.removeAttribute('data-life-lib-calm'); }); offs.push(() => R.removeAttribute('data-life-lib-calm')); };
for (const f of [arrive, depth, motes, tilt, flip, rows]) { try { f(); } catch (e) { console.warn('life-library', f.name, e); } }
R.dataset.lifeLib = '1';
void cleanupHead;
return { dispose() { for (const f of offs.splice(0).reverse()) { try { f(); } catch (e) {} } R.removeAttribute('data-life-lib'); } };
}
