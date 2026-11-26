import { createRig } from './sim/depth.js';
const V = '5';
const GEO = {   // the strips of the two paintings (from assets/depth/hero-depth.json): where the band sits in the painting, the pad on each side, the shore
land: { w: 1920, h: 1080, v0: 0.35208, ht: 0.18056, pad: 0.016797, shore: 0.50648, files: 'hero' },
port: { w: 1216, h: 2160, v0: 0.44444, ht: 0.069444, pad: 0.026316, shore: 0.50278, files: 'hero-p' },
};
export default function mount(ctx) {
const d = document, R = d.documentElement, hero = d.querySelector('.cx-open'), media = hero && hero.querySelector('.cx-open-media');
if (!hero || !media || hero.querySelector('.cx-depth')) return null;
const phone = !!ctx.caps.phone, mq = matchMedia('(max-aspect-ratio: 3/5)');
let kind = mq.matches ? 'port' : 'land', alive = true, on = false, visible = true, loaded = false, scale = 1, heroH = 800, kicked = false;
const rig = createRig(ctx.spring.Spring, phone ? { hills: { ax: 3.2, ay: 1.2, sk: 0.006, svk: 0.001, f: 2.1, z: 0.46 }, trees: { ax: 6, ay: 2.2, sk: 0.011, svk: 0.0018, f: 3.0, z: 0.4 } } : {});
const url = (k, n) => new URL(`depth/${GEO[k].files}-${n}.webp?v=${V}`, import.meta.url).href;
const box = d.createElement('div'); box.className = 'cx-depth'; box.setAttribute('aria-hidden', 'true'); box.dataset.lifeFor = 'depth';
const mkImg = (n) => { const i = new Image(); i.alt = ''; i.decoding = 'async'; i.draggable = false; i.dataset.n = n; return i; };
const clip = d.createElement('div'), back = d.createElement('div'), hills = d.createElement('div'), trees = d.createElement('div'), tin = d.createElement('div'), hin = d.createElement('div');
clip.className = 'dp-clip'; back.className = 'dp dp--back'; hills.className = 'dp dp--hills'; trees.className = 'dp dp--trees'; tin.className = 'dp-in'; hin.className = 'dp-in';
const iB = mkImg('back'), iH = mkImg('hills'), iT = mkImg('trees');
back.append(iB); hin.append(iH); hills.append(hin); tin.append(iT); trees.append(tin); clip.append(back, hills, trees); box.append(clip);
media.after(box);
const setKind = (k) => {
kind = k; const g = GEO[k]; box.dataset.k = k;
box.style.setProperty('--dp-t', (g.v0 * 100).toFixed(3) + '%'); box.style.setProperty('--dp-ch', ((g.shore - g.v0) * 100).toFixed(3) + '%'); box.style.setProperty('--dp-sh', ((g.ht / (g.shore - g.v0)) * 100).toFixed(3) + '%');
box.style.setProperty('--dp-pl', (-g.pad * 100).toFixed(3) + '%'); box.style.setProperty('--dp-pw', ((1 + 2 * g.pad) * 100).toFixed(3) + '%'); box.style.setProperty('--dp-o', (((g.shore - g.v0) / g.ht) * 100).toFixed(2) + '%');
iB.src = url(k, 'back'); iH.src = url(k, 'hills'); iT.src = url(k, 'trees');
};
const geo = () => {   // where the painting is drawn: the same cover fit and position as the still, in the hero's own coordinates (read on resize only)
const g = GEO[kind], r = media.getBoundingClientRect(), h = hero.getBoundingClientRect(), still = media.querySelector('img.ed-still');
const op = ((still && getComputedStyle(still).objectPosition) || '50% 50%').split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
const k = Math.max(r.width / g.w, r.height / g.h), dw = g.w * k, dh = g.h * k;
box.style.setProperty('--dp-x', (r.left - h.left + (r.width - dw) * (op[0] ?? 0.5)).toFixed(2) + 'px'); box.style.setProperty('--dp-y', (r.top - h.top + (r.height - dh) * (op[1] ?? 0.5)).toFixed(2) + 'px');
box.style.setProperty('--dp-w', dw.toFixed(2) + 'px'); box.style.setProperty('--dp-h', dh.toFixed(2) + 'px');
scale = dw / 1366; heroH = Math.max(1, h.height);
};
const ready = () => Promise.all([iB, iH, iT].map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())));
const introOver = () => !R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end');
const h1 = ctx.budget.register({ id: 'depth-ridges', label: 'spring/ODE', cost: 'css', priority: 3, drop() { rig.level = Math.max(rig.level, 1); }, restore() { if (rig.level === 1) rig.level = 0; } });
const h2 = ctx.budget.register({ id: 'depth-lean', label: 'spring/ODE', cost: 'css', priority: 4, drop() { rig.level = Math.max(rig.level, 2); }, restore() { if (rig.level === 2) rig.level = h1.dropped ? 1 : 0; } });
const h3 = ctx.budget.register({ id: 'depth-layers', label: 'spring/ODE', cost: 'css', priority: 5, drop() { rig.level = 3; box.classList.add('is-off'); }, restore() { rig.level = h2.dropped ? 2 : h1.dropped ? 1 : 0; box.classList.remove('is-off'); } });
let lx = NaN, ly = NaN, tx2 = NaN, ty2 = NaN, tl = NaN;
const pub = { active: false, hills: rig.out.hills, trees: rig.out.trees, lean: 0, level: 0, kind };
const publish = () => { pub.active = alive && on && !box.classList.contains('is-off'); pub.lean = rig.out.lean; pub.level = rig.level; pub.kind = kind; if (window.SpiritualDepth !== pub) window.SpiritualDepth = pub; };
const frame = (dt, s) => {
if (!on || !visible || d.hidden) return;
h1.begin();
const touch = s.type === 'touch' || s.type === 'pen';
let nx = s.inside && (!touch || s.down) ? s.nx : 0, ny = s.inside && (!touch || s.down) ? s.ny : 0;
if (ctx.caps.phone && (s.tx || s.ty)) { nx += s.tx; ny += s.ty; }
const o = rig.step(dt, { nx: Math.max(-1, Math.min(1, nx)), ny: Math.max(-1, Math.min(1, ny)), sy: s.sy, svy: s.svy, gust: s.gust * s.gustX, scale, range: heroH });
const a = o.hills, b = o.trees;
if (!(Math.abs(a.x - lx) <= 0.02 && Math.abs(a.y - ly) <= 0.02)) { lx = a.x; ly = a.y; hills.style.transform = `translate3d(${a.x.toFixed(2)}px,${a.y.toFixed(2)}px,0)`; }
if (!(Math.abs(b.x - tx2) <= 0.02 && Math.abs(b.y - ty2) <= 0.02 && Math.abs(o.lean - tl) <= 0.01)) { tx2 = b.x; ty2 = b.y; tl = o.lean; trees.style.transform = `translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0) skewX(${(-o.lean).toFixed(3)}deg)`; }
publish(); h1.end();
};
const show = async () => {
if (!alive || on) return;
if (!loaded) { await ready(); if (!alive) return; loaded = true; }
geo(); on = true; publish(); requestAnimationFrame(() => box.classList.add('is-on'));
if (!kicked) { kicked = true; setTimeout(() => { if (alive) rig.kick(R.classList.contains('cx-seen') ? 0.8 : 1); }, 380); }
};
setKind(kind);
let mo = null;
const go = () => { if (introOver()) show(); else { mo = new MutationObserver(() => { if (introOver()) { mo.disconnect(); mo = null; show(); } }); mo.observe(R, { attributes: true, attributeFilter: ['class'] }); } };
iT.addEventListener('error', () => { alive = false; box.remove(); }, { once: true });
go();
const rs = new ResizeObserver(() => { if (on || loaded) geo(); }); rs.observe(media);
const io = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; }); io.observe(hero);
const onMq = () => { const k = mq.matches ? 'port' : 'land'; if (k !== kind) { setKind(k); loaded = false; if (on) { on = false; box.classList.remove('is-on'); show(); } } };
mq.addEventListener('change', onMq);
const onAnim = (e) => { if (on && e.animationName === 'cx-fl-settle') rig.kick(1); };
d.addEventListener('animationend', onAnim, true);
const release = ctx.bus.use({ pointer: true, scroll: true, tilt: phone });
const off1 = ctx.bus.frame(frame);
return { dispose() {
alive = false; on = false; off1(); release(); rs.disconnect(); io.disconnect(); if (mo) mo.disconnect(); mq.removeEventListener('change', onMq); d.removeEventListener('animationend', onAnim, true);
h1.unregister(); h2.unregister(); h3.unregister(); box.remove(); delete window.SpiritualDepth;
} };
}
