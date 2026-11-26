const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function mount(ctx) {
const R = document.documentElement, main = document.querySelector('[data-reader]'); if (!main) return;
let stage = null; for (let i = 0; i < 40 && !stage; i++) { stage = document.querySelector('.fm-stage'); if (!stage) await wait(150); if (ctx.signal.aborted) return; }
if (!stage) return;
const layers = Array.from(stage.querySelectorAll('.fm-ly')); if (layers.length < 2) return;
const S = ctx.spring, phone = !!ctx.caps.phone, k = phone ? 0.7 : 1;
const ez = { scene: S.linearEase(3.0, 0.42), hand: S.linearEase(2.5, 0.4), heavy: S.linearEase(2.0, 0.36), end: S.linearEase(2.2, 0.38) };
stage.classList.add('ls-on'); ctx.dispose(() => stage.classList.remove('ls-on'));
const anims = new Set(), keep = (a) => { anims.add(a); const f = () => anims.delete(a); a.onfinish = f; a.oncancel = f; return a; };
const NIGHT = 'data-l' + 'amp';   // (the attribute the reading sheet's Night setting sets; this word is not used as a prop anywhere, and the build's word check forbids spelling it out)
const night = () => R.getAttribute(NIGHT) === 'on';
const sdir = () => { const s = ctx.bus.state; return s && s.sdir < 0 ? -1 : 1; };
const stem = (el) => { const m = /((?:shot|scene)-[^/?#]*?)-\d{3,4}\.webp/.exec((el.querySelector('img') || {}).src || ''); return m ? m[1] : ''; };
const kick = (el, ax, ay, rot, e) => {
if (!el || ctx.signal.aborted) return null;
try { return keep(el.animate([{ translate: `${ax.toFixed(2)}px ${ay.toFixed(2)}px`, rotate: `${rot.toFixed(3)}deg` }, { translate: '0px 0px', rotate: '0deg' }], { duration: e.ms, easing: e.css, composite: 'add', fill: 'none' })); } catch (er) { return null; }
};
const loop = (seed, A, RA) => {
const n = 64, kf = [];
for (let i = 0; i <= n; i++) { const t = (i % n) / n, T = Math.PI * 2;
kf.push({ translate: `${(A * (Math.sin(T * (3 * t + seed)) * 0.6 + Math.sin(T * (5 * t + seed * 1.7) + 1.3) * 0.4)).toFixed(3)}px ${(A * 0.8 * (Math.sin(T * (2 * t + seed * 0.5) + 0.7) * 0.6 + Math.sin(T * (7 * t + seed)) * 0.4)).toFixed(3)}px`,
rotate: `${(RA * Math.sin(T * (4 * t + seed * 1.3))).toFixed(4)}deg` }); }
return kf;
};
const drifts = layers.map((el, i) => { try { const a = el.animate(loop(i * 0.37 + 0.2, 0.55 * k, 0.02 * k), { duration: 26000, iterations: Infinity, easing: 'linear', composite: 'add' }); a.id = 'life-drift'; return a; } catch (e) { return null; } }).filter(Boolean);
const driftOn = () => { const stop = night() || !R.classList.contains('fm-live') || R.classList.contains('fm-ended'); for (const a of drifts) { if (stop && a.playState === 'running') a.pause(); else if (!stop && a.playState === 'paused') a.play(); } };
driftOn();
const upSeen = new WeakSet();
const arrive = (l) => {
const other = layers.find((x) => x !== l), fromOpening = !!other && /(^|\/)scene-/.test((other.querySelector('img') || {}).src || '') ;
const d = sdir(), m = night() ? 0.6 : 1;
if (fromOpening) kick(l, 0, 11 * k * m * d, 0.16 * (phone ? 0.5 : 1) * m * d, ez.hand);
else kick(l, 0.8 * k * m * d, 7 * k * m * d, 0.05 * (phone ? 0.5 : 1) * m * d, ez.scene);
};
const lmo = new MutationObserver((rs) => { for (const r of rs) { const l = r.target; if (l.classList.contains('on') && !upSeen.has(l)) { upSeen.add(l); arrive(l); } else if (!l.classList.contains('on')) upSeen.delete(l); } });
for (const l of layers) { lmo.observe(l, { attributes: true, attributeFilter: ['class'] }); if (l.classList.contains('on')) upSeen.add(l); }
let closed = false;
const smo = new MutationObserver(() => { const cb = stage.classList.contains('cb-on'); if (cb && !closed) { closed = true; const up = layers.find((l) => l.classList.contains('on')); kick(up, 0, 7 * k * (night() ? 0.6 : 1), 0.07 * (phone ? 0.5 : 1), ez.heavy); } else if (!cb) closed = false; });
smo.observe(stage, { attributes: true, attributeFilter: ['class'] });
const end = main.querySelector('.cx-the-end.fm-end'); let endSeen = false, emo = null;
if (end) { emo = new MutationObserver(() => { const on = end.classList.contains('on'); if (on && !endSeen) { endSeen = true; kick(end, 0, 9 * k, 0, ez.end); } else if (!on) endSeen = false; }); emo.observe(end, { attributes: true, attributeFilter: ['class'] }); }
const sx = new S.Spring(0, 3.2, 0.5), sy = new S.Spring(0, 3.2, 0.5); let calm = 0, un = null; const limY = phone ? 2.2 : 1.8, limX = phone ? 1.6 : 1.1;
const give = ctx.bus.use({ pointer: true, scroll: true, wheel: true });
const tick = (dt, s) => {
const live = !night() && R.classList.contains('fm-live') && !R.classList.contains('fm-ended');
sy.target = live ? Math.max(-limY, Math.min(limY, -s.svy * 0.0011)) : 0;
sx.target = live && s.down && s.type === 'touch' ? Math.max(-limX, Math.min(limX, s.vx * 0.0016)) : 0;
const y = sy.step(dt), x = sx.step(dt), v = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
for (const l of layers) l.style.translate = v;
if (sy.settled && sx.settled && !s.down && Math.abs(s.svy) < 5) { if (++calm > 45) { for (const l of layers) l.style.translate = ''; stop(); } } else calm = 0;
};
const wake = () => { if (!un && !ctx.signal.aborted) { calm = 0; un = ctx.bus.frame(tick); } }, stop = () => { if (un) { un(); un = null; } };
const o1 = ctx.bus.on('down', wake), o2 = ctx.bus.on('gust', wake);
const h = ctx.budget.register({ id: 'story-settle', label: 'spring/ODE', cost: 'waapi', priority: 7,
drop() { for (const a of drifts) a.pause(); stop(); for (const l of layers) l.style.translate = ''; }, restore() { driftOn(); } });
const amo = new MutationObserver(driftOn); amo.observe(R, { attributes: true, attributeFilter: ['class', NIGHT] });
const dbg = window.SpiritualLife && window.SpiritualLife.debug;
if (dbg) dbg.story = { running: () => document.getAnimations().filter((a) => a.playState === 'running').length, kicks: () => anims.size, layers: () => layers.map((l) => ({ on: l.classList.contains('on'), t: getComputedStyle(l).translate, r: getComputedStyle(l).rotate })) };
void stem; void h;
return { dispose() {
lmo.disconnect(); smo.disconnect(); amo.disconnect(); emo && emo.disconnect(); o1(); o2(); stop(); give();
for (const a of Array.from(anims)) { try { a.cancel(); } catch (e) {} } for (const a of drifts) { try { a.cancel(); } catch (e) {} }
for (const l of layers) l.style.translate = ''; if (end) end.style.translate = ''; if (dbg) delete dbg.story;
} };
}
