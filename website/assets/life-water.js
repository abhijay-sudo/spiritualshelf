const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export default function mount(ctx) {
if (/[?&]nowb=1/.test(location.search)) return;
if (ctx.id === 'watershine') return ctx.caps.webgl ? undefined : shine(ctx);
const G = window.SpiritualGPU; if (!G || !G.lake) return;
const L = G.lake, bus = ctx.bus;
let wind = 0, acc = 0, front = null, dropRip = false, dropMotion = false, lastGust = 0;
const hr = ctx.budget.register({ id: 'water-ripples', cost: 'webgl', label: 'shader', priority: 3,
drop() { dropRip = true; L.ripples = 0; front = null; }, restore() { dropRip = false; L.ripples = 1; } });
const hm = ctx.budget.register({ id: 'water-motion', cost: 'webgl', label: 'shader', priority: 4,
drop() { dropMotion = true; L.motion = 0; L.wind = 0; wind = 0; }, restore() { dropMotion = false; L.motion = 1; } });
const zone = () => { const z = L.zone, c = L.cover; return { x0: c[0] + z[0] * c[2], x1: c[0] + z[2] * c[2], y0: c[1] + z[1] * c[3], y1: c[1] + z[3] * c[3] }; };
const g = (n) => Math.max(1, L.nx / 192) * n;   // (a width in cells that keeps its look on Ultra's finer grid)
L.onPetal = (x, y, speed) => { if (dropRip || !L.ripples || !L.ready) return; if (L.inWater(x, y)) L.disturb(x, y, 0.034 + Math.min(0.03, speed * 0.0004), g(2.4) * L.sx); };
const onGust = (e) => {
if (dropMotion) return; const now = performance.now(); lastGust = now;
wind = Math.max(wind, 0.45 + 0.55 * e.strength);
if (!dropRip && L.ready && !front) front = { t: 0, dir: e.x >= 0 ? 1 : -1, s: e.strength, k: 0 };
};
const offGust = bus.on('gust', onGust);
const offUse = bus.use({ pointer: true, scroll: true, wheel: true });
const frame = (dt, s) => {
if (!L.ready) { if (wind > 0) { wind *= Math.exp(-dt / 1.6); if (wind < 0.004) wind = 0; L.wind = dropMotion ? 0 : wind; } return; }   // (the lake is not on screen: nothing is drawn, but the wind still dies down)
h0.begin();
const push = clamp(Math.max(s.gust, Math.abs(s.svy) / 4200, Math.abs(s.wheel) / 900), 0, 1);
if (push > wind) wind += (push - wind) * (1 - Math.exp(-dt / 0.12)); else wind += (push - wind) * (1 - Math.exp(-dt / 1.6));
if (wind < 0.004) wind = 0;
L.wind = dropMotion ? 0 : wind;
if (!L.ripples || dropRip) { h0.end(); return; }
const z = zone();
if (wind > 0.1) {
acc += (6 + 18 * wind) * dt * clamp(L.nx / 192, 0.8, 1.6);
let n = 0; while (acc >= 1 && n < 3) { acc -= 1; n++; const x = z.x0 + Math.random() * (z.x1 - z.x0), y = z.y0 + Math.random() * (z.y1 - z.y0); L.disturb(x, y, (0.003 + 0.008 * Math.random()) * (0.5 + wind), g(1.6 + 2.2 * Math.random()) * L.sx); }
acc = Math.min(acc, 2);
} else acc = 0;
if (front) {
front.t += dt; const u = front.t / 0.9;
if (u >= 1) front = null;
else if (u >= front.k * 0.14) {   // (a row every 0.14 s)
front.k++; const y = z.y0 + (z.y1 - z.y0) * (u * u * 0.85 + 0.02), cnt = 7, amp = 0.005 + 0.007 * front.s;
for (let i = 0; i < cnt; i++) { const f = (i + 0.5 + (Math.random() - 0.5) * 0.7) / cnt, x = z.x0 + (z.x1 - z.x0) * (front.dir > 0 ? f : 1 - f), yy = y + (f - 0.5) * 30 * front.dir; L.disturb(x, yy, amp * (1 - u * 0.5), g(2.6) * L.sx * (0.7 + u)); }
}
}
h0.end();
};
const h0 = hr;   // (the ripples effect is the one that times the frame's work)
const offFrame = bus.frame(frame);
ctx.dispose(() => { offFrame(); offGust(); offUse(); L.wind = 0; L.motion = 1; L.ripples = 1; L.onPetal = null; });
const dbg = window.SpiritualLife && window.SpiritualLife.debug; if (dbg) dbg.water = { wind: () => L.wind, ripples: () => L.ripples, motion: () => L.motion, gust: onGust, lastGust: () => lastGust, dropped: () => ({ ripples: dropRip, motion: dropMotion }) };
void hm;
}
function shine(ctx) {
const R = document.documentElement, G = window.SpiritualGPU, host = document.querySelector('.cx-open'), img = host && host.querySelector('img.ed-still'); if (!host || !img) return;
const bus = ctx.bus; let el = null, dropped = false, wind = 0, q = false, t1 = 0;
const anims = [];
const place = () => {
if (!el) return;
const hr = host.getBoundingClientRect(), nw = img.naturalWidth || 16, nh = img.naturalHeight || 9, asp = nw / nh, W = hr.width, H = hr.height;
const dw = W / H > asp ? W : H * asp, dh = dw / asp, op = (getComputedStyle(img).objectPosition || '50% 50%').split(' '), py = /%$/.test(op[1] || op[0]) ? parseFloat(op[1] || op[0]) / 100 : 0.5;
el.style.setProperty('--lw-top', Math.max(0, Math.round((H - dh) * py + dh * 0.512)) + 'px');
};
const build = () => {
if (el || dropped) return;
el = document.createElement('span'); el.className = 'lw-shine'; el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-life-for', 'watershine'); el.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
const media = host.querySelector('.cx-open-media'); (media || host).after(el); place();
el.querySelectorAll('i').forEach((b, i) => anims.push(b.animate([{ transform: 'translateX(-30%)' }, { transform: 'translateX(30%)' }], { duration: 15000 + i * 5200, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -i * 3300 })));
};
const unbuild = () => { for (const a of anims) a.cancel(); anims.length = 0; if (el) { el.remove(); el = null; } };
const sync = () => { if (R.dataset.fxWater === 'live') unbuild(); else build(); };
const h = ctx.budget.register({ id: 'water-shine', cost: 'waapi', label: 'CSS', priority: 3, drop() { dropped = true; unbuild(); }, restore() { dropped = false; sync(); } });
const mo = new MutationObserver(sync); mo.observe(R, { attributes: true, attributeFilter: ['data-fx-water'] });
const off = bus.use({ scroll: true, wheel: true, pointer: true });
const offFrame = bus.frame((dt, s) => {
if (dropped) return; const push = clamp(Math.max(s.gust, Math.abs(s.svy) / 4200, Math.abs(s.wheel) / 900), 0, 1);
if (push > wind) wind += (push - wind) * (1 - Math.exp(-dt / 0.15)); else wind += (push - wind) * (1 - Math.exp(-dt / 1.4));
if (wind < 0.01) { wind = 0; if (!q) return; q = false; } else q = true;
if (el) { const r = 1 + 2.6 * wind; for (const a of anims) a.updatePlaybackRate(r); }
else if (G && G.lake && R.dataset.fxWater === 'live') G.lake.wind = wind * 0.85;   // (the lake's own wind, which its shader reads; no ripples are added here)
});
const offResize = bus.on('resize', place); const t = setTimeout(() => { place(); sync(); }, 1200); t1 = setTimeout(place, 5000);
if (!img.complete) img.addEventListener('load', place, { once: true });
sync();
ctx.dispose(() => { clearTimeout(t); clearTimeout(t1); mo.disconnect(); offFrame(); offResize(); off(); unbuild(); h.unregister(); if (G && G.lake) G.lake.wind = 0; });
}
