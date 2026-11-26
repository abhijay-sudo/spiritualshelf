const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export default function mount(ctx) {
const d = document, R = d.documentElement, bus = ctx.bus, layout = ctx.layout, Spring = ctx.spring.Spring, caps = ctx.caps;
if (!d.querySelector('[data-reader]')) return;
const offs = [], live = { prog: true, margins: true };
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
const bar = d.querySelector('.progress');
const progress = () => {
if (!bar) return;
const head = d.createElement('i'); head.className = 'll-prog-head'; head.setAttribute('aria-hidden', 'true'); d.body.appendChild(head);
const a = new Spring(0, 2.3, 0.82), b = new Spring(0, 4.2, 0.5);   // the bar trails, the glow leads and rings
let range = 1, off = null, release = null, last = -1;
const measure = () => { range = Math.max(1, R.scrollHeight - innerHeight); };
measure();
const ro = new ResizeObserver(() => measure()); ro.observe(R); ro.observe(d.body); offs.push(() => ro.disconnect());
const paint = () => {
const x = clamp(a.x, 0, 1.0), hx = b.x;
bar.style.transform = 'scaleX(' + x.toFixed(4) + ')';
head.style.translate = (hx * innerWidth).toFixed(1) + 'px 0px';
const v = Math.abs(b.v), op = clamp((hx * 40), 0, 1) * clamp(0.35 + v * 1.4, 0.35, 1); head.style.opacity = op.toFixed(3); head.style.scale = (1 + clamp(v * 2.2, 0, 1.6)).toFixed(3) + ' 1';
};
const h = ctx.budget.register({ id: 'reader-progress', cost: 'waapi', label: 'spring/ODE', priority: 3,
drop() { live.prog = false; stop(); R.removeAttribute('data-life-read'); bar.style.removeProperty('transform'); head.style.opacity = '0'; },
restore() { live.prog = true; R.dataset.lifeRead = '1'; wake(); } });
const step = (dt) => {
h.begin();
const p = clamp(scrollY / range, 0, 1); a.target = p; b.target = p; a.step(dt); b.step(dt); paint();
if (a.settled && b.settled && Math.abs(p - last) < 1e-5) { stop(); } last = p;
h.end();
};
const wake = () => { if (off || !live.prog) return; release = bus.use({ scroll: true }); off = bus.frame(step); };
const stop = () => { if (off) off(); if (release) release(); off = release = null; };
const p0 = clamp(scrollY / range, 0, 1); a.set(p0); b.set(p0); R.dataset.lifeRead = '1'; paint();
on(window, 'scroll', wake, { passive: true }); on(window, 'resize', () => { measure(); wake(); }, { passive: true });
offs.push(() => { stop(); R.removeAttribute('data-life-read'); bar.style.removeProperty('transform'); head.remove(); });
};
const margins = () => {
if (ctx.tier === 'lite' || caps.phone || !caps.hover || innerWidth < 1100) return;
const mk = (side) => { const c = d.createElement('canvas'); c.className = 'll-margin ll-margin--' + side; c.setAttribute('aria-hidden', 'true'); d.body.appendChild(c); return { side, c, g: c.getContext('2d'), w: 0 }; };
const L = mk('l'), Rr = mk('r'); if (!L.g || !Rr.g) { L.c.remove(); Rr.c.remove(); return; }
const dpr = Math.min(devicePixelRatio || 1, 1.5); let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const seeds = []; for (let i = 0; i < 14; i++) seeds.push({ side: i % 2 ? 'r' : 'l', x: rnd(), y: rnd(), z: 0.4 + rnd() * 0.6, vx: 0, vy: 0, a: rnd() * 6.28, w: (rnd() - 0.5) * 0.6, ph: rnd() * 6.28 });
let off = null, release = null, acc = 0;
const size = () => {
let minL = innerWidth, maxR = 0;
for (const t of d.querySelectorAll('.scene-no, .story-sum, .cx-film-title, .story-aka')) { const r = t.getBoundingClientRect(); if (r.width) minL = Math.min(minL, r.left); }
for (const t of d.querySelectorAll('.fm-t, .story-sum, .cx-film-card')) { const r = t.getBoundingClientRect(); if (r.width && r.width < innerWidth * 0.8) maxR = Math.max(maxR, r.right); }   // (the centred closing card is not a column)
for (const m of [L, Rr]) { const room = m === L ? minL - 14 : innerWidth - maxR - 14; m.w = clamp(Math.floor(room), 0, 84); m.c.style.display = m.w < 34 ? 'none' : ''; if (m.w >= 34) { m.c.style.width = m.w + 'px'; m.c.width = Math.round(m.w * dpr); m.c.height = Math.round(innerHeight * dpr); } }
};
layout.read(size); const ro = new ResizeObserver(() => layout.read(size)); ro.observe(R); offs.push(() => ro.disconnect());
let again = 0;   // (the text may change size or mode: look again every few seconds while the margins run)
const h = ctx.budget.register({ id: 'reader-margins', cost: 'waapi', label: 'spring/ODE', priority: 1, drop() { live.margins = false; stop(); for (const m of [L, Rr]) m.g.clearRect(0, 0, m.c.width, m.c.height); }, restore() { live.margins = true; start(); } });
const step = (dt, s) => {
acc += dt; if (acc < 1 / 36) return; const k = acc; acc = 0; h.begin(); if ((again += k) > 3) { again = 0; layout.read(size); }
for (const m of [L, Rr]) if (m.w >= 34) { m.g.setTransform(dpr, 0, 0, dpr, 0, 0); m.g.clearRect(0, 0, m.w, innerHeight); }
const t = s.t, H = innerHeight;
for (const p of seeds) {
const m = p.side === 'l' ? L : Rr; if (m.w < 34) continue;
const ax = Math.sin(t * 0.33 + p.ph) * 14 + s.gust * s.gustX * 120, ay = Math.cos(t * 0.27 + p.ph * 1.3) * 10 - 6 * p.z - s.svy * 0.02;
p.vx += ax * k; p.vy += ay * k; const f = Math.exp(-1.4 * k); p.vx *= f; p.vy *= f; p.a += p.w * k + p.vx * 0.01 * k;
p.x += (p.vx * k) / Math.max(m.w, 1); p.y += (p.vy * k) / H;
if (p.x < -0.15) p.x = 1.15; else if (p.x > 1.15) p.x = -0.15; if (p.y < -0.06) p.y = 1.06; else if (p.y > 1.06) p.y = -0.06;
const g = m.g, x = p.x * m.w, y = p.y * H, len = 5 + p.z * 5, al = 0.28 + 0.3 * p.z;
g.strokeStyle = 'rgba(255,243,222,' + al.toFixed(3) + ')'; g.fillStyle = 'rgba(255,248,232,' + (al + 0.15).toFixed(3) + ')'; g.lineWidth = 0.7; g.beginPath();
for (let i = 0; i < 7; i++) { const an = p.a + (i / 7) * 6.2832; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an + 0.5) * len * 0.6, y + Math.sin(an + 0.5) * len * 0.6, x + Math.cos(an) * len, y + Math.sin(an) * len); }
g.stroke(); g.beginPath(); g.arc(x, y, 1.1 + p.z * 0.6, 0, 6.2832); g.fill();
}
h.end();
};
const start = () => { if (off || !live.margins) return; release = bus.use({ scroll: true }); off = bus.frame(step); };
const stop = () => { if (off) off(); if (release) release(); off = release = null; };
start(); offs.push(() => { stop(); L.c.remove(); Rr.c.remove(); });
};
for (const f of [progress, margins]) { try { f(); } catch (e) { console.warn('life-reader', f.name, e); } }
return { dispose() { for (const f of offs.splice(0).reverse()) { try { f(); } catch (e) {} } } };
}
