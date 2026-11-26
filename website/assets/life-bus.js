const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export function createBus() {
const s = { t: 0, dt: 0, px: -1e4, py: -1e4, vx: 0, vy: 0, nx: 0, ny: 0, inside: false, down: false, type: '', sy: 0, svy: 0, sdir: 0, wheel: 0, w: innerWidth, h: innerHeight, hidden: document.hidden, gust: 0, gustX: 0, tx: 0, ty: 0 };
const frames = new Set(), taps = new Set(), subs = { gust: new Set(), down: new Set(), up: new Set(), resize: new Set(), visibility: new Set() };
const want = { pointer: 0, scroll: 0, wheel: 0, tilt: 0 }, ac = { pointer: null, scroll: null, wheel: null, tilt: null };
let raf = 0, last = 0, rawX = -1e4, rawY = -1e4, prevX = -1e4, prevY = -1e4, havePrev = false, scrollDirty = false, sizeDirty = false, wheelAcc = 0, lastGust = 0, prevSy = 0, disposed = false, tiltRaw = [0, 0];
const emit = (n, a) => { for (const f of subs[n]) { try { f(a); } catch (e) { /* one package's mistake never stops another's */ } } };
const kick = () => { if (!raf && !disposed && !s.hidden) raf = requestAnimationFrame(tick); };   // (last is the previous frame's own timestamp: it is never reset here, or the time a frame's work took would vanish from the next delta)
const tick = (now) => {
raf = 0; if (disposed || s.hidden) { last = 0; return; }
const raw = last ? now - last : 16.7; last = now; const dt = Math.min(raw, 50) / 1000; s.dt = dt; s.t = now / 1000;
for (const f of taps) { try { f(raw, now); } catch (e) {} }
if (dt > 0) {
if (want.pointer) {
s.px = rawX; s.py = rawY; s.nx = clamp(rawX / s.w * 2 - 1, -1, 1); s.ny = clamp(rawY / s.h * 2 - 1, -1, 1);
if (havePrev && s.inside) { const k = 1 - Math.exp(-dt / 0.06); s.vx += ((rawX - prevX) / dt - s.vx) * k; s.vy += ((rawY - prevY) / dt - s.vy) * k; } else { s.vx *= Math.exp(-dt * 12); s.vy *= Math.exp(-dt * 12); }
prevX = rawX; prevY = rawY; havePrev = s.inside;
}
if (want.scroll) {
const y = scrollY; if (scrollDirty || y !== s.sy) { const k = 1 - Math.exp(-dt / 0.08); s.svy += (clamp((y - prevSy) / dt, -9000, 9000) - s.svy) * k; s.sdir = y > prevSy ? 1 : y < prevSy ? -1 : s.sdir; prevSy = y; s.sy = y; scrollDirty = false; } else { s.svy *= Math.exp(-dt * 8); if (Math.abs(s.svy) < 1) s.svy = 0; }
}
if (want.wheel) { s.wheel += wheelAcc; wheelAcc = 0; s.wheel *= Math.exp(-dt * 6); if (Math.abs(s.wheel) < 1) s.wheel = 0; }
if (want.tilt) { const k = 1 - Math.exp(-dt / 0.12); s.tx += (tiltRaw[0] - s.tx) * k; s.ty += (tiltRaw[1] - s.ty) * k; }
if (sizeDirty) { sizeDirty = false; s.w = innerWidth; s.h = innerHeight; emit('resize', s); }
const sp = Math.hypot(s.vx, s.vy), push = Math.max(sp / 3200, Math.abs(s.svy) / 4200, Math.abs(s.wheel) / 900);
if (push > 0.55 && now - lastGust > 350) { lastGust = now; const st = clamp(push, 0, 1); s.gust = Math.max(s.gust, st); s.gustX = sp > Math.abs(s.svy) ? clamp(s.vx / (sp || 1), -1, 1) : 0; emit('gust', { strength: st, x: s.gustX, y: s.sdir }); }
s.gust *= Math.exp(-dt / 0.8); if (s.gust < 0.01) s.gust = 0;
for (const f of frames) { try { f(dt, s); } catch (e) {} }
}
const moving = s.gust > 0 || Math.abs(s.vx) > 2 || Math.abs(s.vy) > 2 || Math.abs(s.svy) > 2 || Math.abs(s.wheel) > 1;
if (frames.size || taps.size || moving) kick(); else last = 0;   // (resting: the next wake-up starts from a clean frame)
};
const note = () => kick();
const open = {
pointer() {
const a = ac.pointer = new AbortController(), o = { passive: true, signal: a.signal };
addEventListener('pointermove', (e) => { rawX = e.clientX; rawY = e.clientY; s.inside = true; s.type = e.pointerType; note(); }, o);
addEventListener('pointerdown', (e) => { rawX = e.clientX; rawY = e.clientY; s.inside = true; s.down = true; s.type = e.pointerType; emit('down', { x: rawX, y: rawY, type: e.pointerType }); note(); }, o);
const up = (e) => { s.down = false; emit('up', { x: e.clientX, y: e.clientY, type: e.pointerType }); note(); };
addEventListener('pointerup', up, o); addEventListener('pointercancel', up, o);
document.documentElement.addEventListener('pointerleave', () => { s.inside = false; note(); }, o);
},
scroll() { const a = ac.scroll = new AbortController(); prevSy = s.sy = scrollY; addEventListener('scroll', () => { scrollDirty = true; note(); }, { passive: true, signal: a.signal }); },
wheel() { const a = ac.wheel = new AbortController(); addEventListener('wheel', (e) => { wheelAcc += clamp(e.deltaY, -400, 400); note(); }, { passive: true, signal: a.signal }); },
tilt() {
if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission === 'function') return;
const a = ac.tilt = new AbortController(); addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; tiltRaw[0] = clamp(e.gamma / 45, -1, 1); tiltRaw[1] = clamp((e.beta - 45) / 45, -1, 1); note(); }, { passive: true, signal: a.signal });
},
};
const base = new AbortController();
addEventListener('resize', () => { sizeDirty = true; note(); }, { passive: true, signal: base.signal });
document.addEventListener('visibilitychange', () => { s.hidden = document.hidden; if (!s.hidden) { s.vx = s.vy = s.svy = 0; havePrev = false; kick(); } emit('visibility', s); }, { passive: true, signal: base.signal });
const use = (o) => {
const got = [];
for (const k of Object.keys(want)) if (o && o[k]) { got.push(k); if (want[k]++ === 0) open[k](); }
if (got.length) kick();
let done = false;
return () => { if (done) return; done = true; for (const k of got) if (--want[k] === 0 && ac[k]) { ac[k].abort(); ac[k] = null; } };
};
const frame = (fn) => { frames.add(fn); kick(); return () => frames.delete(fn); };
const tap = (fn) => { taps.add(fn); kick(); return () => taps.delete(fn); };
const on = (n, fn) => { if (!subs[n]) return () => {}; subs[n].add(fn); return () => subs[n].delete(fn); };
const dispose = () => { disposed = true; if (raf) cancelAnimationFrame(raf); raf = 0; for (const k in ac) if (ac[k]) ac[k].abort(); base.abort(); frames.clear(); taps.clear(); for (const k in subs) subs[k].clear(); };
return { state: s, use, frame, tap, on, dispose, get running() { return !!raf; }, get listeners() { return Object.keys(want).filter((k) => want[k]).length + 2; } };
}
