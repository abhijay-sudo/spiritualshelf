const TINT = { leap: '255 236 208', ganga: '208 228 255', lokas: '255 206 178', atlas: '255 238 214' };
export default function mount(ctx) {
const { Spring, clamp } = ctx.spring, d = document, R = d.documentElement, bus = ctx.bus;
const main = d.querySelector('main[data-world]'), atlas = !main ? d.querySelector('.at-stage') : null;
if (!main && !atlas) { const home = d.querySelector('main.cx-home'); return home ? flow(ctx, home) : undefined; }
const kind = main ? main.getAttribute('data-world') : 'atlas';
const view = main ? main.querySelector('[data-wl-view]') : atlas, track = main ? main.querySelector('[data-wl-track]') : atlas;
if (!view || !track) return;
const phone = ctx.caps.phone, coupled = !phone && ctx.tier !== 'lite', fine = coupled && matchMedia('(pointer: fine)').matches;
let lagOn = coupled, depthOn = coupled, mistOn = true, layers = null, offF = null, relUse = null, vis = true, top = 0, span = 1, vh = innerHeight;
const gS = new Spring(0, 1.25, 0.85), pxS = new Spring(0, 1.7, 0.8), pyS = new Spring(0, 1.7, 0.8);
const L = [{ name: 'far', k: 0.12, sy: new Spring(0, 2.1, 0.9), base: 150, boost: 1.1, o0: 0.55, tint: 1 }, { name: 'near', k: 0.3, sy: new Spring(0, 2.1, 0.9), base: 85, boost: 1.6, o0: 0.62, tint: 1 }];
const h1 = ctx.budget.register({ id: 'worlds-momentum', label: 'spring/ODE', cost: 'waapi', priority: 2, drop() { lagOn = false; clearMomentum(); }, restore() { lagOn = coupled; wake(); } });
const h2 = ctx.budget.register({ id: 'worlds-depth', label: 'spring/ODE', cost: 'waapi', priority: 3, drop() { depthOn = false; clearDepth(); }, restore() { depthOn = coupled; wake(); } });
const h3 = ctx.budget.register({ id: 'worlds-mist', label: 'CSS', cost: 'css', priority: 4, drop() { mistOn = false; unbuild(); }, restore() { mistOn = true; build(); } });
const setVar = (k, v) => { if (view.__v[k] !== v) { view.__v[k] = v; view.style.setProperty(k, v); } };
view.__v = {};
const clearMomentum = () => { for (const k of ['--wl-push', '--wl-lag']) { delete view.__v[k]; view.style.removeProperty(k); } };
const clearDepth = () => { for (const k of ['--wl-px', '--wl-py']) { delete view.__v[k]; view.style.removeProperty(k); } if (layers) layers.forEach((l) => { l.inn.style.translate = ''; }); };
const measure = () => { vh = innerHeight; top = track.getBoundingClientRect().top + scrollY; span = Math.max(1, track.offsetHeight - (main ? view.clientHeight : vh)); };
const build = () => {
if (layers || !mistOn || (main && !R.classList.contains('wl-on'))) return;
view.style.setProperty('--wlm', TINT[kind] || TINT.leap);
layers = L.map((cfg) => {
const el = d.createElement('div'), inn = d.createElement('div'); el.className = 'wl-mist wl-mist--' + cfg.name; el.setAttribute('aria-hidden', 'true'); inn.className = 'wl-mist-in'; el.append(inn);
const dur = (cfg.name === 'far' ? 150 : 85) * 1000, anim = inn.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-50%,0,0)' }], { duration: dur, iterations: Infinity, easing: 'linear' });
return Object.assign({ el, inn, anim, rate: 1 }, cfg);
});
const anchor = main ? main.querySelector('[data-wl-canvas]') : null;
for (const l of layers) { if (anchor) anchor.before(l.el); else view.append(l.el); }
if (layers) { view.classList.add('wl-misty'); layers.forEach((l) => { l.sy.set(0); }); }
measure(); wake();
};
const unbuild = () => { if (!layers) return; for (const l of layers) { try { l.anim.cancel(); } catch (e) {} l.el.remove(); } layers = null; view.classList.remove('wl-misty'); view.style.removeProperty('--wlm'); };
if (main) { const mo = new MutationObserver(() => { if (R.classList.contains('wl-on')) { build(); } else { unbuild(); clearMomentum(); clearDepth(); } }); mo.observe(R, { attributes: true, attributeFilter: ['class'] }); ctx.dispose(() => mo.disconnect()); }
const frame = (dt, s) => {
h1.begin();
const g = clamp(s.svy / 2600, -1, 1); gS.target = g; gS.step(dt); const a = Math.min(1, Math.abs(gS.x));
let busy = a > 0.004 || Math.abs(gS.v) > 0.01 || Math.abs(g) > 0.01;
if (layers && vis) {
const p = main ? clamp((s.sy - top) / span, 0, 1) : clamp(0.5 + ((s.sy + vh * 0.5) - (top + track.offsetHeight / 2)) / (vh + track.offsetHeight), 0, 1);
if (depthOn) { pxS.target = fine ? s.nx : 0; pyS.target = fine ? s.ny : 0; pxS.step(dt); pyS.step(dt); if (!pxS.settled || !pyS.settled || Math.hypot(s.vx, s.vy) > 20) busy = true; }
const H = view.clientHeight || vh;
for (const l of layers) {
l.rate = 1 + a * l.boost * 5; if (Math.abs(l.anim.playbackRate - l.rate) > 0.03) l.anim.updatePlaybackRate(l.rate);   // (faster scroll, faster stream)
const y = depthOn ? (0.5 - p) * H * l.k * (main ? 1 : 0.6) : 0; l.sy.target = y; l.sy.step(dt); if (!l.sy.settled) busy = true;
if (depthOn) l.inn.style.translate = (-pxS.x * (l.name === 'far' ? 6 : 16)).toFixed(2) + 'px ' + (l.sy.x - pyS.x * (l.name === 'far' ? 3 : 8)).toFixed(2) + 'px';
const o = (l.o0 + a * 0.3).toFixed(3); if (l.__o !== o) { l.__o = o; l.inn.style.setProperty('--wlm-o', o); }
}
if (depthOn) { setVar('--wl-px', (pxS.x).toFixed(3)); setVar('--wl-py', (pyS.x).toFixed(3)); }
}
if (main && lagOn && vis) { setVar('--wl-push', (1 + a * 0.016).toFixed(4)); setVar('--wl-lag', (-gS.x * 7).toFixed(2)); }
h1.end();
if (!busy) { if (offF) { offF(); offF = null; } if (lagOn && main) { setVar('--wl-push', '1'); setVar('--wl-lag', '0'); } }
};
const wake = () => { if (!offF && coupled && (layers || main)) offF = bus.frame(frame); };
if (coupled) {
relUse = bus.use({ pointer: fine, scroll: true });
addEventListener('scroll', wake, { passive: true, signal: ctx.signal });
if (fine) addEventListener('pointermove', wake, { passive: true, signal: ctx.signal });
}
const io = new IntersectionObserver((es) => { for (const e of es) { vis = e.isIntersecting; if (layers) layers.forEach((l) => { try { vis ? l.anim.play() : l.anim.pause(); } catch (x) {} }); if (vis) { measure(); wake(); } } }, { rootMargin: '80px 0px' });
io.observe(track);
const ro = new ResizeObserver(measure); ro.observe(track); addEventListener('resize', measure, { passive: true, signal: ctx.signal });
ctx.dispose(() => { offF && offF(); offF = null; relUse && relUse(); io.disconnect(); ro.disconnect(); unbuild(); clearMomentum(); clearDepth(); delete view.__v; });
build();
if (ctx.debug) window.__lifeWorlds = { layers: () => (layers || []).map((l) => ({ name: l.name, rate: +l.anim.playbackRate.toFixed(2), y: +l.sy.x.toFixed(1), play: l.anim.playState })), get g() { return gS.x; }, vars: () => Object.assign({}, view.__v), on: () => ({ lagOn, depthOn, mistOn }) };
return { dispose() { delete window.__lifeWorlds; } };
}
function flow(ctx, home) {
const { Spring, clamp } = ctx.spring; if (ctx.caps.phone || ctx.tier === 'lite') return;
const els = Array.from(home.querySelectorAll('.cx-now-body, .cx-head, .cx-row-head')).map((el, i) => ({ el, sp: new Spring(0, 2 + (i % 5) * 0.12, 0.62), on: false, set: false }));
let off = null, on = true; const gS = new Spring(0, 1.4, 0.85);
const h = ctx.budget.register({ id: 'home-flow', label: 'spring/ODE', cost: 'waapi', priority: 2, drop() { on = false; clear(); }, restore() { on = true; } });
const clear = () => { for (const e of els) { e.sp.set(0); if (e.set) { e.el.style.translate = ''; e.set = false; } } };
const frame = (dt, s) => {
h.begin(); gS.target = clamp(s.svy / 3000, -1, 1); gS.step(dt); let busy = Math.abs(gS.x) > 0.003 || Math.abs(gS.v) > 0.01 || Math.abs(gS.target) > 0.01;
if (on) for (const e of els) {
if (!e.on) continue; const sp = e.sp; sp.target = gS.x * (e.el.classList.contains('cx-now-body') ? 9 : 6); sp.step(dt);
if (Math.abs(sp.x) < 0.04 && Math.abs(sp.v) < 0.08 && Math.abs(sp.target) < 0.04) { sp.set(0); if (e.set) { e.el.style.translate = ''; e.set = false; } continue; }
busy = true; e.el.style.translate = '0 ' + sp.x.toFixed(2) + 'px'; e.set = true;
}
h.end(); if (!busy && off) { off(); off = null; }
};
const wake = () => { if (!off && on) off = ctx.bus.frame(frame); };
const rel = ctx.bus.use({ scroll: true });
const io = new IntersectionObserver((es) => { for (const x of es) { const e = els.find((q) => q.el === x.target); if (e) e.on = x.isIntersecting; } }, { rootMargin: '100px 0px' });
els.forEach((e) => io.observe(e.el));
addEventListener('scroll', wake, { passive: true, signal: ctx.signal });
ctx.dispose(() => { off && off(); off = null; rel(); io.disconnect(); clear(); });
if (ctx.debug) window.__lifeFlow = { n: els.length, g: () => gS.x, set: () => els.filter((e) => e.set).length };
return { dispose() { delete window.__lifeFlow; } };
}
