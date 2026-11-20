(() => {
const d = document, root = d.documentElement, TAU = Math.PI * 2;
const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 1;
window.SpritualAura = ({ UI, reduced, Sound }) => {
const still = () => reduced() || root.classList.contains('ep-lite');
const wire = (b) => {
if (b.master._au) return; b.master._au = 1;
const L = b.ctx.createDynamicsCompressor(), post = b.ctx.createGain(); L.threshold.value = -6; L.knee.value = 3; L.ratio.value = 20; L.attack.value = .004; L.release.value = .22; post.gain.value = .715;
b.master.disconnect(); b.master.connect(L); L.connect(post); post.connect(b.ctx.destination);
};
let full = 0, hushT = 0;
d.addEventListener('visibilitychange', () => {
const b = Sound.bus(false); if (!b) return; const g = b.master.gain, t = b.ctx.currentTime;
clearTimeout(hushT); g.cancelScheduledValues(t);
if (d.hidden) { if (!full) full = g.value || .6; g.setTargetAtTime(0, t, .05); hushT = setTimeout(() => { if (d.hidden) b.ctx.suspend?.(); }, 320); }
else if (full) { const up = () => { try { b.ctx.resume?.()?.catch?.(() => {}); } catch {} }; up(); g.setTargetAtTime(full, b.ctx.currentTime, .35); for (const x of ['pointerdown', 'keydown']) addEventListener(x, up, { once: true, capture: true, passive: true }); }   // some browsers resume only on a touch
});
const score = (tags) => {
const scenes = $$('.scene[id^="page-"]'), hero = $('.cx-film-open'), end = $('.story-end');
const REST = 440, LEVEL = { r: .5, s: .5, f: .42, w: .8, t: .5, n: .5 };
let ctx, master, lp, out, duck, run = false, cur = 0, e = 0, ceil = 5200, lastY = scrollY, lastT = 0, restT = 0, house = 0, dv = 1;
const stems = {}, bufs = {};
const noise = (kind) => bufs[kind] || (bufs[kind] = (() => {
const sr = 22050, n = sr * (kind === 'white' ? 4 : 6), b = ctx.createBuffer(2, n, sr);
for (let ch = 0; ch < 2; ch++) {
const a = b.getChannelData(ch); let last = 0;
if (kind === 'white') for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
else if (kind === 'brown') for (let i = 0; i < n; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; a[i] = last * 3.5; }
else { // the crackle of a fire: small pops, each a little different, never in step
let t = 0;
while (t < n - sr * .2) { t += Math.floor(-Math.log(1 - Math.random()) * sr * .17); const len = Math.floor(sr * (.004 + Math.random() * .03)), amp = Math.pow(Math.random(), 2.2) * .9 + .05; for (let i = 0; i < len && t + i < n; i++) a[t + i] += (Math.random() * 2 - 1) * Math.exp(-i / (len * .22)) * amp; }
}
}
return b;
})());
const bq = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
const gain = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
const loop = (kind, dest, N) => { const s = ctx.createBufferSource(); s.buffer = noise(kind); s.loop = true; s.connect(dest); s.start(0, Math.random() * 2); N.push(s); };
const lfo = (hz, depth, param, N) => { const o = ctx.createOscillator(), g = gain(depth); o.frequency.value = hz; o.connect(g).connect(param); o.start(); N.push(o); };
const BUILD = {
r(g, N) { const a = bq('lowpass', 1500), h = bq('highpass', 260), v = gain(.42); loop('brown', a, N); a.connect(h).connect(v).connect(g); lfo(.23, .1, v.gain, N); lfo(.61, .05, v.gain, N);
const b = bq('bandpass', 2600, .7), w = gain(.03); loop('white', b, N); b.connect(w).connect(g); lfo(.37, .012, w.gain, N); },
s(g, N) { const a = bq('lowpass', 1100), h = bq('highpass', 110), v = gain(.42); loop('brown', a, N); a.connect(h).connect(v).connect(g); lfo(.085, .3, v.gain, N); lfo(.137, .1, v.gain, N); lfo(.085, 600, a.frequency, N);
const b = bq('bandpass', 2600, .4), w = gain(.05); loop('white', b, N); b.connect(w).connect(g); lfo(.085, .045, w.gain, N); },
f(g, N) { const a = bq('lowpass', 900), h = bq('highpass', 140), v = gain(.5); loop('brown', a, N); a.connect(h).connect(v).connect(g); lfo(.31, .12, v.gain, N); lfo(.83, .07, v.gain, N);
const b = bq('bandpass', 1400, .6), w = gain(.05); loop('white', b, N); b.connect(w).connect(g);
const c = bq('highpass', 1800), x = gain(.3); loop('crackle', c, N); c.connect(x).connect(g); },
w(g, N) { const a = bq('bandpass', 620, .8), v = gain(.09); loop('white', a, N); a.connect(v).connect(g); lfo(.07, 240, a.frequency, N); lfo(.11, .04, v.gain, N);
const b = bq('highpass', 3200), w = gain(.012); loop('white', b, N); b.connect(w).connect(g); lfo(.19, .007, w.gain, N); },
t(g, N) { const a = bq('bandpass', 300, .4), v = gain(.5); loop('brown', a, N); a.connect(v).connect(g); lfo(.09, 150, a.frequency, N); lfo(.13, .22, v.gain, N);
const b = bq('bandpass', 900, 1.4), w = gain(.035); loop('white', b, N); b.connect(w).connect(g); lfo(.05, 300, b.frequency, N); lfo(.17, .02, w.gain, N);
const c = bq('highpass', 2600), x = gain(.022); loop('white', c, N); c.connect(x).connect(g); },
n(g, N) { const a = bq('bandpass', 240, .3), v = gain(.2); loop('brown', a, N); a.connect(v).connect(g); lfo(.05, .06, v.gain, N); },
};
const halt = (s) => { for (const n of s.N) { try { n.stop(); } catch {} n.disconnect(); } s.g.disconnect(); };
const apply = () => {
if (!run) return; const tg = cur >= 0 ? tags[cur] || '' : '', t = ctx.currentTime, many = [...tg].filter((k) => BUILD[k]).length > 1;
for (const k in BUILD) {
const want = tg.includes(k); let s = stems[k];
if (want && !s) { const g = gain(0); g.connect(lp); const N = []; BUILD[k](g, N); s = stems[k] = { g, N, kill: 0 }; }
if (!s) continue; clearTimeout(s.kill);
s.g.gain.setTargetAtTime(want ? LEVEL[k] * (many ? .75 : 1) : 0, t, .7);
if (!want) s.kill = setTimeout(() => { halt(s); if (stems[k] === s) delete stems[k]; }, 4500);
}
ceil = tg.includes('n') ? 2400 : 5200;
};
const setScene = (i) => { if (i !== cur) { cur = i; apply(); } };
const filmOn = () => root.classList.contains('fm-live');
const sync = () => { if (!filmOn()) return; const b = $('.fm-beat.on'); if (!b) { if (end && end.getBoundingClientRect().top < innerHeight * .5) setScene(-1); return; } const sc = b.closest('.scene'); setScene(sc ? scenes.indexOf(sc) + 1 : b.closest('.reader-main') && !b.closest('.story-head') ? -1 : 0); };
const rest = () => { e = 0; if (!run) return; sync(); const t = ctx.currentTime; lp.frequency.setTargetAtTime(REST, t, 1.3); out.gain.setTargetAtTime(.26, t, 1.6); };
const onScroll = () => {
if (!run) return; const now = performance.now(), dt = now - lastT; if (dt < 50) return; sync(); clearTimeout(restT); restT = setTimeout(rest, 240);
const v = Math.abs(scrollY - lastY) / dt; lastY = scrollY; lastT = now; if (dt > 400) return;   // the first move after a rest has no speed yet
e = Math.max(e * .8, clamp(v / (innerHeight * .0016))); const t = ctx.currentTime;
lp.frequency.setTargetAtTime(REST * Math.pow(ceil / REST, e), t, .15); out.gain.setTargetAtTime(.26 + .74 * e, t, .25);
};
const keep = () => { if (!Sound.on()) return stop(); const v = d.querySelector('dialog[open]') ? 0 : window.speechSynthesis?.speaking ? .3 : 1; if (v !== dv) { dv = v; duck.gain.setTargetAtTime(v, ctx.currentTime, .6); } };
const start = () => {
if (!Sound.on()) return; const b = Sound.bus(); ctx = b.ctx; master = b.master; wire(b);
if (run) return; run = true;
if (!lp) { lp = bq('lowpass', REST, .4); out = gain(.26); duck = gain(0); lp.connect(out).connect(duck).connect(master); addEventListener('scroll', onScroll, { passive: true }); }
dv = -1; duck.gain.cancelScheduledValues(ctx.currentTime); lastY = scrollY; sync(); apply(); keep(); clearInterval(house); house = setInterval(keep, 1000);
};
const stop = () => {
if (!run) return; run = false; clearInterval(house); clearTimeout(restT); duck.gain.setTargetAtTime(0, ctx.currentTime, .3);
for (const k in stems) { const s = stems[k]; clearTimeout(s.kill); delete stems[k]; setTimeout(() => halt(s), 1600); }
};
const EV = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
const go = () => { if (!Sound.on()) return; start(); if (ctx && ctx.state === 'running') EV.forEach((x) => removeEventListener(x, go, true)); };
const arm = () => { const b = Sound.bus(false); if (b && b.ctx.state === 'running') return start(); EV.forEach((x) => addEventListener(x, go, { capture: true, passive: true })); if (b) { const up = () => { if (b.ctx.state === 'running') { b.ctx.removeEventListener('statechange', up); go(); } }; b.ctx.addEventListener('statechange', up); } };
d.addEventListener('spritual:sound', (ev) => { if (ev.detail) arm(); else stop(); });
if ('IntersectionObserver' in window) {
const io = new IntersectionObserver((es) => { for (const en of es) if (en.isIntersecting && !filmOn()) setScene(en.target === hero ? 0 : en.target === end ? -1 : scenes.indexOf(en.target) + 1); }, { rootMargin: '-50% 0px -50% 0px' });
[hero, ...scenes, end].filter(Boolean).forEach((el) => io.observe(el));
}
if (Sound.on()) arm();
};
const bowl = () => {
if (!Sound.on()) return null; const b = Sound.bus(), c = b.ctx; wire(b);
const g = c.createGain(), f = c.createBiquadFilter(), os = []; g.gain.value = 0; f.type = 'lowpass'; f.frequency.value = 2400; g.connect(f).connect(b.master);
[[1, 1], [2.71, .3], [5.15, .08]].forEach(([r, a]) => [-.6, .6].forEach((dt) => { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = 277.18 * r + dt * r; og.gain.value = a * .5; o.connect(og).connect(g); o.start(); os.push(o); }));
const end = (ms) => setTimeout(() => { os.forEach((o) => { try { o.stop(); } catch {} }); f.disconnect(); }, ms);
return {
swell: (p) => g.gain.setTargetAtTime(.03 + .09 * p, c.currentTime, .25),
seal: () => { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(.16, t, .04); g.gain.setTargetAtTime(0, t + .2, 1.2); end(7000); },
drop: () => { g.gain.setTargetAtTime(0, c.currentTime, .2); end(1500); },
};
};
const seal = (form) => {
const btn = $('button[type="submit"]', form); if (!btn || weak) return;
const PET = [[8, 24, 64, .27, 0, 2], [8, 15, 39, .33, TAU / 16, 1]];
const side = (i, n, r0, r1, w, off, sg, u) => [off + i * TAU / n + sg * w * Math.sin(Math.PI * u), r0 + (r1 - r0) * u];
const T = []; for (const [n, r0, r1, w, off, m] of PET) for (let i = 0; i < n; i++) { T.push(side(i, n, r0, r1, w, off, 0, 1)); for (const sg of [-1, 1]) for (let j = 1; j <= m; j++) T.push(side(i, n, r0, r1, w, off, sg, j / (m + .6))); }
let cv = null, g2, raf = 0, P = [], p = 0, held = false, sealed = 0, t0 = 0, last = 0, tone = null, S = 60, U = .3, ink = '255,222,154';
const done = () => { cancelAnimationFrame(raf); raf = 0; cv?.remove(); cv = null; if (tone && !sealed) tone.drop(); tone = null; held = false; sealed = 0; p = 0; };
const begin = () => {
if (cv) done(); if (still()) return false;
const r = btn.getBoundingClientRect(), fr = form.getBoundingClientRect(), R = clamp(r.height / 2, 16, 24), GAP = 10; S = Math.round(R * 2 + 14); U = R / 70;
const left = r.right + GAP, top = r.top + r.height / 2 - S / 2;
if (left + S > Math.min(fr.right, root.clientWidth - 8)) return false;   // no room beside the button: the page keeps its own mark of the keeping
let el = btn.parentElement, lum = 0; for (; el; el = el.parentElement) { const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g); if (m && (m[3] == null || +m[3] > .6)) { lum = (.299 * m[0] + .587 * m[1] + .114 * m[2]) / 255; break; } }
ink = lum > .55 ? '158,104,22' : '255,222,154';
const dpr = Math.min(3, devicePixelRatio || 1);
cv = d.createElement('canvas'); cv.className = 'au-seal'; cv.width = cv.height = Math.round(S * dpr); cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = `position:absolute;left:${left + scrollX}px;top:${top + scrollY}px;width:${S}px;height:${S}px;pointer-events:none;z-index:2`;
g2 = cv.getContext('2d'); if (!g2) { cv = null; return false; } g2.scale(dpr, dpr); d.body.append(cv);
const far = S / 2 / U;
P = T.map(([a, r]) => ({ a, r, r0: far * (.78 + Math.random() * .18), sw: (Math.random() < .5 ? -1 : 1) * (.7 + Math.random() * .9), dl: Math.random() * .42, s: (.45 + Math.random() * .5) / U, tw: Math.random() * TAU }));
p = 0; sealed = 0; t0 = last = performance.now(); tone = bowl(); raf = requestAnimationFrame(frame); return true;
};
const frame = (now) => {
raf = 0; if (!cv) return; const dt = Math.min(50, now - last) / 1000; last = now;
p = sealed ? Math.min(1, p + dt / .6) : held ? Math.min(1, p + dt / 1.8) : Math.max(0, p - dt / .5);
if (tone && !sealed) tone.swell(held ? p : 0);
const tt = (now - t0) / 1000, s = sealed ? (now - sealed) / 1000 : 0, fade = sealed ? clamp(1 - (s - 1.3) / 1.3) : 1, bloom = sealed ? Math.exp(-s * 2.4) : 0;
g2.clearRect(0, 0, S, S); g2.save(); g2.translate(S / 2, S / 2); g2.scale(U, U); const far = S / 2 / U;
const gl = g2.createRadialGradient(0, 0, 0, 0, 0, far); gl.addColorStop(0, `rgba(${ink},${((.14 * p + .22 * bloom) * fade).toFixed(3)})`); gl.addColorStop(1, `rgba(${ink},0)`); g2.fillStyle = gl; g2.beginPath(); g2.arc(0, 0, far, 0, TAU); g2.fill();
g2.rotate(tt * .2); const sc = 1 + (sealed ? .08 * (1 - Math.exp(-s * 3)) : 0); g2.scale(sc, sc);
if (sealed) { // the lotus is drawn whole
g2.strokeStyle = `rgba(${ink},${(clamp(s / .6) * .5 * fade).toFixed(3)})`; g2.lineWidth = .9 / U; g2.lineJoin = 'round'; g2.beginPath();
for (const [n, r0, r1, w, off] of PET) for (let i = 0; i < n; i++) for (const sg of [-1, 1]) for (let j = 0; j <= 10; j++) { const [a, r] = side(i, n, r0, r1, w, off, sg, j / 10); g2[j ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
g2.stroke();
}
g2.fillStyle = `rgb(${ink})`;
for (const q of P) {
const k = clamp((p - q.dl) / .58), e = ease(k); if (k <= 0) continue;
const r = q.r0 + (q.r - q.r0) * e, a = q.a + (1 - e) * q.sw;
g2.globalAlpha = clamp(k / .15) * (.3 + .6 * e) * fade * (.8 + .2 * Math.sin(tt * 3 + q.tw));
g2.beginPath(); g2.arc(Math.cos(a) * r, Math.sin(a) * r, q.s, 0, TAU); g2.fill();
}
g2.restore();
if ((sealed && fade <= 0) || (!sealed && !held && p <= 0)) return done();
raf = requestAnimationFrame(frame);
};
btn.addEventListener('pointerdown', (ev) => { if (ev.button) return; held = begin(); });
for (const x of ['pointerup', 'pointercancel']) addEventListener(x, () => { held = false; }, { passive: true });
form.addEventListener('submit', () => {
if (!cv && !begin()) return;
held = false; sealed = performance.now(); tone?.seal();
});
addEventListener('pagehide', done);
};
const orb = (box) => {
const core = $('.breath-core', box); if (still() || !core) return;
const cv = d.createElement('canvas'), g2 = cv.getContext('2d'); if (!g2) return;
cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'position:absolute;pointer-events:none';
box.prepend(cv); core.style.opacity = '0';
const M = weak ? [] : Array.from({ length: 26 }, () => ({ a: Math.random() * TAU, k: 1.06 + Math.random() * .34, v: (Math.random() < .5 ? -1 : 1) * (.04 + Math.random() * .09), s: .7 + Math.random() * 1.1, tw: Math.random() * TAU, x: 0, y: 0, o: 0 }));
let W = 0, B = 0, dpr = 1, raf = 0, vis = true, phase = '', pT = 0, s = 0, s0 = 0, lag = 0, last = 0, touch = false, near = false, tx = 0, ty = 0, lx = -.18, ly = -.22, press = 0, rip = null;
const size = () => { const r = box.getBoundingClientRect(); if (!r.width) return; B = r.width / 2; const o = Math.floor(clamp(Math.min(r.left, root.clientWidth - r.right) - 1, 0, r.width * .25)); W = r.width + o * 2; cv.style.left = cv.style.top = -o + 'px'; cv.style.width = cv.style.height = W + 'px'; dpr = Math.min(1.5, devicePixelRatio || 1); cv.width = cv.height = Math.round(W * dpr); draw(performance.now()); };
const draw = (now) => {
if (!B) return; const tt = now / 1000, R = B * (.4 + .38 * s + .03 * press), c = W / 2;
g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, W); g2.translate(c, c);
const H = Math.min(R * 1.55, c); let g = g2.createRadialGradient(0, 0, Math.min(R * .7, H * .6), 0, 0, H); g.addColorStop(0, `rgba(232,166,58,${(.2 + .12 * s).toFixed(3)})`); g.addColorStop(1, 'rgba(232,166,58,0)'); g2.fillStyle = g; g2.beginPath(); g2.arc(0, 0, H, 0, TAU); g2.fill();
g2.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, r = R * (1 + .012 * Math.sin(3 * a + tt * .55) + .009 * Math.sin(5 * a - tt * .4)); g2[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g2.closePath();
g = g2.createRadialGradient(lx * R, ly * R, R * .05, 0, 0, R * 1.02); g.addColorStop(0, 'rgba(255,244,208,.97)'); g.addColorStop(.5, 'rgba(248,212,132,.86)'); g.addColorStop(.86, 'rgba(236,180,88,.6)'); g.addColorStop(1, 'rgba(228,166,72,.3)'); g2.fillStyle = g; g2.fill();
if (rip) { const k = (now - rip.t) / 1400; if (k >= 1) rip = null; else { g2.strokeStyle = `rgba(255,236,186,${(.5 * (1 - k)).toFixed(3)})`; g2.lineWidth = 1.2; g2.beginPath(); g2.arc(rip.x, rip.y, 6 + ease(k) * B * .55, 0, TAU); g2.stroke(); } }
g2.fillStyle = 'rgb(214,150,48)';
for (const m of M) { const rr = Math.min(B * (.4 + .38 * lag) * m.k, c - 3); let x = Math.cos(m.a) * rr, y = Math.sin(m.a) * rr; if (touch) { const dx = tx - x, dy = ty - y, w = Math.exp(-(dx * dx + dy * dy) / (B * B * .5)); m.o += (w - m.o) * .06; } else m.o *= .95; x += (tx - x) * m.o * .7; y += (ty - y) * m.o * .7; g2.globalAlpha = .3 + .3 * Math.sin(tt * 1.3 + m.tw) ** 2; g2.beginPath(); g2.arc(x, y, m.s, 0, TAU); g2.fill(); }
g2.globalAlpha = 1;
};
const frame = (now) => {
raf = 0; if (!vis || d.hidden) return; const dt = Math.min(50, now - last || 16) / 1000; last = now;
const k = (now - pT) / 1000, to = phase === 'in' ? s0 + (1 - s0) * ease(clamp(k / 4)) : phase === 'hold' ? 1 : phase === 'out' ? s0 * (1 - ease(clamp(k / 6))) : s0 * (1 - ease(clamp(k / 1.4)));
s = to; lag += (s - lag) * Math.min(1, dt * 1.1); press += ((touch ? 1 : 0) - press) * Math.min(1, dt * 5);
const ax = touch || near ? clamp(tx / B, -1, 1) * .42 : -.18, ay = touch || near ? clamp(ty / B, -1, 1) * .42 : -.22; lx += (ax - lx) * Math.min(1, dt * 4); ly += (ay - ly) * Math.min(1, dt * 4);
for (const m of M) m.a += m.v * dt;
draw(now);
if (phase || touch || rip || press > .01 || s > .001 || Math.abs(lx - ax) + Math.abs(ly - ay) > .004) raf = requestAnimationFrame(frame);
};
const kick = () => { if (!raf && vis && !d.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
const at = (ev) => { const r = box.getBoundingClientRect(); tx = ev.clientX - r.left - r.width / 2; ty = ev.clientY - r.top - r.height / 2; };
box.addEventListener('pointerdown', (ev) => { at(ev); touch = true; rip = { x: tx, y: ty, t: performance.now() }; kick(); }, { passive: true });
box.addEventListener('pointermove', (ev) => { at(ev); near = ev.pointerType === 'mouse'; kick(); }, { passive: true });
for (const x of ['pointerup', 'pointercancel', 'pointerleave']) box.addEventListener(x, () => { touch = near = false; kick(); }, { passive: true });
new MutationObserver(() => { phase = box.dataset.phase || ''; pT = performance.now(); s0 = s; kick(); }).observe(box, { attributes: true, attributeFilter: ['data-phase'] });
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; if (vis) kick(); }).observe(box);
d.addEventListener('visibilitychange', kick);
if (window.ResizeObserver) new ResizeObserver(size).observe(box); addEventListener('resize', size, { passive: true });
size();
};
const A = UI.aura || {};
if (A.tags && !weak) score(A.tags);
const br = $('[data-breath]'); if (br) orb(br);
const it = $('[data-intent]'); if (it) seal(it);
};
})();
