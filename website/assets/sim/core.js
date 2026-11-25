(() => {
const G = window.SpiritualGPU; if (!G || G.run) return;
const d = document, R = d.documentElement, now = () => performance.now(), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DBG = /[?&]fxdebug=1/.test(location.search) || (() => { try { return localStorage.getItem('spritual:fxdebug') === '1'; } catch (e) { return false; } })();
const NAME = ['off', 'balanced', 'rich', 'ultra'], RANK = { off: 0, balanced: 1, rich: 2, ultra: 3 };
const TIER = { ultra: { dpr: 2, px: 3.8e6, step: 1 / 60, slow: 20 }, rich: { dpr: 1.5, px: 2.1e6, step: 1 / 60, slow: 22 }, balanced: { dpr: 1, px: 0.9e6, step: 1 / 30, slow: 40 } };
const feats = [], res = { programs: [], buffers: [], vaos: [], textures: [], framebuffers: [] };
const tn = () => (rank === 3 ? 'rich' : NAME[rank]);   // (Ultra is Rich plus a layer: the effects are told 'rich' and read env.U for the rest)
const dbg = (...a) => { try { console.debug('[fx]', ...a); } catch (e) {} };
let rank = 0, ceil = (() => { try { const v = sessionStorage.getItem('spritual:fxc'); return v === '0' || v === '1' || v === '2' ? +v : 3; } catch (e) { return 3; } })(), uGate = false, lostEver = false, meas = null, burn = 0, gl = null, cv = null, ac = null, host = null, hosts = new Map(), live = false, building = 0, ready = 0, started = 0, raf = 0, tmr = 0, hold = 0;
let pos = null, last = 0, acc = 0, warm = 0, ring = new Float32Array(90), ri = 0, rn = 0, fcount = 0, bad = 0, govern = true, ctxs = 0, nl = 0, saver = false, restored = 0, lostT = 0, t0 = 0, ramp = 0;
let obs = null, scale = 1, cw = 0, ch = 0, ext = null, soft = false, fps = 0;
let rectReads = 0, wN = 0, wSlow = 0, wMid = 0, wT = 0, slowWins = 0, goodT = 0, probe = 0, probeBuf = [], coolUntil = 0, upAt = 0, upFail = 0, ign = 0, lastPref = 'auto', paused = false, bgen = 0, dead = false, hr = null, hrDirty = true, hrT = 0, parkT = 0;
const SS = 'spritual:fxc';
const ssGet = () => { try { const v = sessionStorage.getItem(SS); return v === null ? null : +v; } catch (e) { return null; } };
const ssSet = (v) => { try { if (v === null) sessionStorage.removeItem(SS); else sessionStorage.setItem(SS, String(v)); } catch (e) {} };
const inp = { x: -1e4, y: -1e4, vx: 0, vy: 0, on: false, scrollVel: 0, down: false };
let lastPt = 0, lastSy = 0, lastSt = 0, vis = new Map();
const state = (s) => { R.dataset.fxState = s; };
const on = (t, e, f, o) => { t.addEventListener(e, f, Object.assign({ signal: ac.signal }, o)); nl++; };
const env = {
get gl() { return gl; }, get tier() { return tn(); }, get U() { return G.U && G.U.on ? G.U : null; }, w: 0, h: 0, dpr: 1, t: 0, intensity: 1, host: null, quality: 1,
prog(vs, fs) { const p = { p: null, u: {}, vs, fs, ok: false, loc(n) { return n in this.u ? this.u[n] : (this.u[n] = gl.getUniformLocation(this.p, n)); } }; res.programs.push(p); return p; },
buf() { const b = gl.createBuffer(); res.buffers.push(b); return b; },
vao() { const v = gl.createVertexArray(); res.vaos.push(v); return v; },
tex() { const t = gl.createTexture(); res.textures.push(t); return t; },
fbo() { const f = gl.createFramebuffer(); res.framebuffers.push(f); return f; },
rt(w, h, fmt, linear) {
w = Math.max(1, w | 0); h = Math.max(1, h | 0);
const f16 = fmt === 'rgba16f' && !!(gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float'));
const t = env.tex(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, f16 ? gl.RGBA16F : gl.RGBA8, w, h);
const fl = linear === false ? gl.NEAREST : gl.LINEAR; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, fl); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, fl);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const f = env.fbo(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null);
return { tex: t, fbo: f, w, h, ok };
},
bind(r) { if (r) { gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo); gl.viewport(0, 0, r.w, r.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); } },
tri() { if (!triV) triV = env.vao(); gl.bindVertexArray(triV); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); },
del(o) {
if (!o || !gl || gl.isContextLost()) return;
const t = o.tex || o, f = o.fbo; if (t) { gl.deleteTexture(t); const i = res.textures.indexOf(t); if (i >= 0) res.textures.splice(i, 1); }
if (f) { gl.deleteFramebuffer(f); const i = res.framebuffers.indexOf(f); if (i >= 0) res.framebuffers.splice(i, 1); }
},
on(t, e, f, o) { if (ac) on(t, e, f, o); },
rect() { if (!host) return null; if (hrDirty || !hr) { rectReads++; const b = host.el.getBoundingClientRect(); hr = { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; hrDirty = false; } return hr; },
settle() { ign = 4; },
get bw() { return cv ? cv.width : 0; }, get bh() { return cv ? cv.height : 0; },
};
let triV = null;
const compile = (done) => {
const queue = res.programs.filter((p) => !p.p); let k = 0;
const make = (r) => {
const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
const v = sh(gl.VERTEX_SHADER, r.vs), f = sh(gl.FRAGMENT_SHADER, r.fs), p = gl.createProgram();
gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); r.p = p; r.sh = [v, f];
};
const fin = () => {
for (const r of queue) { if (!gl.getProgramParameter(r.p, gl.LINK_STATUS)) { dbg('shader failed', gl.getProgramInfoLog(r.p)); return done(false); } r.ok = true; for (const s of r.sh) { gl.detachShader(r.p, s); gl.deleteShader(s); } r.sh = null; }
done(true);
};
if (!queue.length) return done(true);
if (ext && ext.par) {
const poll = () => { tmr = 0; if (!gl) return; if (queue.every((r) => gl.getProgramParameter(r.p, ext.par.COMPLETION_STATUS_KHR))) fin(); else tmr = setTimeout(poll, 8); };
const hand = () => { tmr = 0; if (!gl) return; make(queue[k++]); tmr = setTimeout(k < queue.length ? hand : poll, k < queue.length ? 0 : 8); };
hand();
} else {
const slice = () => { tmr = 0; if (!gl) return; make(queue[k++]); if (k < queue.length) tmr = window.requestIdleCallback ? (requestIdleCallback(slice, { timeout: 200 }), 0) : setTimeout(slice, 16); else fin(); };
slice();
}
};
const freeRes = (dead) => {   // (dead: the context was lost and came back empty, so the old objects are gone already)
if (!dead && gl && !gl.isContextLost()) {
for (const p of res.programs) { if (p.p) gl.deleteProgram(p.p); } for (const b of res.buffers) gl.deleteBuffer(b); for (const v of res.vaos) gl.deleteVertexArray(v);
for (const t of res.textures) gl.deleteTexture(t); for (const f of res.framebuffers) gl.deleteFramebuffer(f);
}
for (const k in res) res[k].length = 0;
triV = null;
};
const place = (h) => {
if (!cv || !h) return;
let z = null, anchor = null;
for (const f of h.fx) { if (f.z) { const v = f.z(h.el); if (v != null) { z = v; break; } } }
for (const f of h.fx) { if (f.anchor) { anchor = f.anchor(h.el); if (anchor) break; } }
const stage = h.el.classList.contains('fm-stage'), shot = !stage && h.el.matches('figure.shot'), open = !stage && !shot && h.el.matches('section.cx-film-open');
if (z == null) z = shot || open ? 0 : 3;
if (!anchor && open) anchor = h.el.querySelector(':scope > .cx-open-shade');
if (!anchor && stage) { const ly = h.el.querySelectorAll(':scope > .fm-ly'); anchor = ly[ly.length - 1] || null; }
if (!anchor && shot) { const im = h.el.querySelector('img'); anchor = im ? im.closest('picture') || im : null; }
cv.style.zIndex = String(z);
if (pos && pos.el !== h.el) { pos.el.style.position = pos.was; pos = null; }
if (!pos && getComputedStyle(h.el).position === 'static') { pos = { el: h.el, was: h.el.style.position }; h.el.style.position = 'relative'; }
if (anchor && anchor.parentNode === h.el) { if (anchor.nextSibling !== cv) anchor.after(cv); } else if (cv.parentNode !== h.el) h.el.appendChild(cv);
host = h; env.host = h.el; env.cfg = h.cfg;
};
const size = (w, h) => {
if (!cv || !w || !h) return;
const T = TIER[NAME[rank]], dprCap = rank === 3 && G.U ? Math.min(T.dpr, G.U.f.dpr) : T.dpr; env.dpr = clamp(devicePixelRatio || 1, 1, dprCap);
scale = Math.min(env.dpr, Math.sqrt(T.px / (w * h)));
const bw = Math.max(1, Math.round(w * scale)), bh = Math.max(1, Math.round(h * scale));
if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
cw = env.w = w; ch = env.h = h; env.scale = scale;
if (gl) gl.viewport(0, 0, bw, bh);
for (const f of host ? host.fx : []) f.resize && f.resize(w, h, scale, tn());
};
const frame = (t) => {
raf = 0; if (!live) return;
raf = requestAnimationFrame(frame);
const dtm = t - last; last = t;
if (warm < 8) { warm++; acc = 0; return; }
if (t - hrT > 1000) { hrT = t; hrDirty = true; }
if (probe) { probeBuf.push(dtm); acc = 0; if (++probe > 22) endProbe(); return; }   // (the probe: nothing is stepped or drawn, only the page's own pace is read)
ring[ri] = dtm; ri = (ri + 1) % 90; if (rn < 90) rn++;
const T = TIER[NAME[rank]]; acc += Math.min(dtm, 100) / 1000; env.t = (t - t0) / 1000;
ramp = Math.min(1, ramp + dtm / 1600); env.intensity = ramp * ramp * (3 - 2 * ramp);
const a = performance.now(); let n = 0;
while (acc >= T.step && n < 2) { step(T.step); acc -= T.step; n++; }
if (meas) meas.s = performance.now() - a;
if (acc >= T.step) acc = 0;   // two steps at most: a slow frame never snowballs into catch-up
if (n) draw();
cpu = cpu * .95 + (performance.now() - a) * .05;
if (govern) judge(dtm, T);
};
let cpu = 0;
const step = (dt) => {
const k = Math.exp(-dt * 9); inp.vx *= k; inp.vy *= k; inp.scrollVel *= Math.exp(-dt * 5);
for (const f of host.fx) f.update && f.update(dt, inp);
};
const px1 = new Uint8Array(4);
const draw = () => {
const a0 = meas ? performance.now() : 0;
gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
for (const f of host.fx) f.draw && f.draw(gl, env);
if (burn) { const e = performance.now() + burn; while (performance.now() < e); }   // (debug only: makes a frame slow on purpose, so the governor can be watched)
if (meas) {   // a measurement: wait for the GPU with a one-pixel read, so the time is the drawing's, not the display's
gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); const dt = performance.now() - a0;
if (meas.skip > 0) meas.skip--; else { meas.d.push(dt); meas.st.push(meas.s || 0); if (meas.d.length >= meas.n) { const m = meas; meas = null; const sd = m.d.slice().sort((x, y) => x - y), ss = m.st; m.cb({ drawMs: +(m.d.reduce((x, y) => x + y, 0) / m.d.length).toFixed(3), p95: +sd[Math.min(sd.length - 1, Math.floor(sd.length * .95))].toFixed(3), stepMs: +(ss.reduce((x, y) => x + y, 0) / ss.length).toFixed(3), n: m.d.length }); } }
}
};
const p95 = () => { if (!rn) return 0; const a = Array.from(ring.subarray(0, rn)).sort((x, y) => x - y); return a[Math.min(rn - 1, Math.floor(rn * .95))]; };
const judge = (dtm, T) => {
if (ign > 0) { ign--; return; }
if (meas) return;
if (dtm > 300) { return; }
wN++; wT += dtm; if (dtm > T.slow) wSlow++; if (dtm > T.slow * .6) wMid++;
if (wN < 60) return;
const frac = wSlow / wN; fps = 1000 / (wT / wN);
if (frac >= 0.3) { goodT = 0; if (++slowWins >= 2 && now() > coolUntil) { slowWins = 0; beginProbe(); } }
else {
slowWins = 0;
if (rank === 1 && wMid === 0 && now() > upAt && upFail < 2 && want() >= 2) { goodT += wT; if (goodT >= 25000) stepUp(); } else goodT = 0;
}
wN = wSlow = wMid = 0; wT = 0;
};
const beginProbe = () => { probe = 1; probeBuf = []; dbg('probe: effect paused to read the page'); };
const endProbe = () => {
probe = 0; const a = probeBuf.slice(4).sort((x, y) => x - y), p = a.length ? a[Math.min(a.length - 1, Math.floor(a.length * .8))] : 0, T = TIER[NAME[rank]]; probeBuf = [];
wN = wSlow = wMid = 0; wT = 0; warm = 4; acc = 0; ign = 4;
if (p > T.slow) { coolUntil = now() + 20000; dbg('probe: the page is slow without the effect too (' + p.toFixed(1) + ' ms), tier kept'); return; }
stepDown('slow with the effect, ' + p.toFixed(1) + ' ms without');
};
const stepDown = (why) => {
if (rank === 3) {
if (G.U && G.U.down(why)) { ri = rn = 0; ring.fill(0); wN = wSlow = wMid = 0; wT = 0; slowWins = 0; probe = 0; warm = 4; ign = 6; if (cw) size(cw, ch); return; }
dbg('step down from ultra', why); ceil = 2; uGate = false; if (lastPref === 'auto' || lastPref === 'ultra') { if (lastPref === 'auto') ssSet(2); }
try { if (G.U) G.U.left('slow'); } catch (e) {}
setTier(2); return;
}
dbg('step down from', NAME[rank], why); ceil = Math.min(ceil, rank - 1); if (upAt && now() - upAt < 30000) upFail++;
if (lastPref === 'auto') ssSet(ceil);
if (rank <= 1) { destroy('off'); return; }
setTier(rank - 1);
};
const stepUp = () => { goodT = 0; upAt = now(); dbg('step up to rich'); ceil = 2; if (lastPref === 'auto') ssSet(null); setTier(2); };
const setTier = (r) => {
meas = null; const was = rank; rank = r; R.dataset.fx = NAME[r]; if (G.U && (was === 3) !== (r === 3)) { try { G.U.tier(r === 3); } catch (e) { dbg('ultra tier', e); } } ri = rn = 0; ring.fill(0); wN = wSlow = wMid = 0; wT = 0; slowWins = 0; goodT = 0; probe = 0; warm = 4; ign = 4;
if (cw) size(cw, ch);
};
const go = () => {
if (live || !gl || !host || document.hidden) return; live = true; last = now(); acc = 0; warm = 0; ri = rn = 0; wN = wSlow = wMid = 0; wT = 0; probe = 0; ign = 4;
if (parkT) { clearTimeout(parkT); parkT = 0; }
if (paused) { paused = false; hrDirty = true; for (const f of host.fx) { try { f.resume && f.resume(); } catch (e) {} } }
state('live'); raf = requestAnimationFrame(frame);
};
const halt = (s) => {
const was = live; live = false; if (raf) cancelAnimationFrame(raf); raf = 0; probe = 0; if (s) state(s);
if (was && host && !paused && s) { paused = true; for (const f of host.fx) { try { f.pause && f.pause(); } catch (e) {} } }
};
const pick = () => {
let best = null, br = 0;
for (const h of hosts.values()) { if (!usable(h)) continue; const r = (vis.get(h.el) || 0) * (h === host ? 1.15 : 1); if (r > br) { br = r; best = h; } }
if (!best) { halt('paused'); return; }
if (best !== host) { const was = host; place(best); hrDirty = true; ign = 6; wN = wSlow = wMid = 0; wT = 0; if (was) { ramp = 0; for (const f of was.fx) f.leave && f.leave(); } size(best.el.clientWidth, best.el.clientHeight); for (const f of best.fx) f.enter && f.enter(); }
if (!live) go();
};
const MAP = [
{ sel: 'section.cx-open[data-fx-water]', cfg: { rope: 'home', wind: 'hero' }, feats: ['wind', 'water', 'far', 'birds', 'light', 'rigid', 'ultra', 'motes'] },
{ sel: 'section.cx-select', cfg: { rope: 'picker', wind: 'hero' }, feats: ['wind'] },
{ sel: '.fm-stage', when: 'live', cfg: { rope: 'pennant', wind: 'scene' }, feats: ['wind', 'relight'] },
{ sel: 'section.cx-film-open', when: 'still', cfg: { rope: 'pennant', wind: 'scene' }, feats: ['wind', 'relight'] },
{ sel: 'figure.shot[data-media]', when: 'still', cfg: { wind: 'scene' }, feats: ['wind', 'relight'] },
];
G.hostMap = MAP;
const usable = (h) => (h.when === 'live' ? R.classList.contains('fm-live') && !h.el.classList.contains('is-off') : h.when === 'still' ? !R.classList.contains('fm-live') : true);
const scan = () => {
const no = DBG ? ((location.search.match(/[?&]fxno=([a-z,]+)/) || [])[1] || '').split(',') : [];
for (const m of MAP) {
const fs = m.feats.map((n) => feats.find((f) => f.name === n)).filter((f) => f && !no.includes(f.name) && !(f.wants && !f.wants({ tier: tn() })));
if (!fs.length) continue;
for (const el of d.querySelectorAll(m.sel)) { if (hosts.has(el)) continue; hosts.set(el, { el, when: m.when || '', cfg: m.cfg || {}, fx: fs.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) }); }
}
return hosts.size;
};
const slot = (my, f) => { const run = () => { if (my !== bgen) return; try { f(); } catch (e) { dbg('start failed', e); ceil = 0; destroy('off'); } }; if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 300 }); else setTimeout(run, 16); };
const build = () => {
if (building || gl) return; building = 1; state('loading'); const my = ++bgen;
if (!scan()) { building = 0; R.dataset.fx = 'off'; state('off'); return; }
ac = new AbortController(); nl = 0; started = 1;
slot(my, () => {
cv = d.createElement('canvas'); cv.className = 'fx-canvas'; cv.setAttribute('aria-hidden', 'true'); cv.setAttribute('data-fx-canvas', '');
cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;contain:strict;z-index:3';
try { gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, depth: false, stencil: false, antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true, preserveDrawingBuffer: false }); } catch (e) { gl = null; }
if (!gl) { building = 0; destroy('off'); ceil = 0; return; }
ctxs++;
try { const x = gl.getExtension('WEBGL_debug_renderer_info'); soft = !!x && /SwiftShader|llvmpipe|Software|Mali-4|Adreno \(TM\) 3/i.test(String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL))); env.renderer = x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) { soft = false; }
if (soft && !DBG) { building = 0; ceil = 0; destroy('off'); return; }
ext = { par: gl.getExtension('KHR_parallel_shader_compile'), lose: gl.getExtension('WEBGL_lose_context') };
slot(my, () => {
const lo = { signal: ac.signal };
cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); dead = true; lostEver = true; halt('lost'); ready = 0; if (R.dataset.fxWater) R.dataset.fxWater = 'off'; if (!lostT) lostT = setTimeout(() => { lostT = 0; ceil = 0; destroy('off'); }, 3000); }, lo);
cv.addEventListener('webglcontextrestored', () => { if (lostT) { clearTimeout(lostT); lostT = 0; } if (restored++ > 0 || !gl) { ceil = 0; destroy('off'); return; } rebuildAfterRestore(); }, lo);
nl += 2;
on(d, 'visibilitychange', () => { if (d.hidden) halt('paused'); else if (ready) { acc = 0; pick(); } });
on(window, 'pagehide', () => destroy('off'));
on(window, 'pointermove', (e) => {
if (!host || e.pointerType === 'touch') return; const r = env.rect(), t = now(), dt = Math.max(8, t - lastPt) / 1000;
const x = e.clientX - r.left, y = e.clientY - r.top;
if (lastPt && t - lastPt < 200) { inp.vx = clamp((x - inp.x) / dt, -2400, 2400) * .5 + inp.vx * .5; inp.vy = clamp((y - inp.y) / dt, -2400, 2400) * .5 + inp.vy * .5; }
inp.x = x; inp.y = y; inp.on = true; lastPt = t;
}, { passive: true });
on(d.documentElement, 'pointerleave', () => { inp.on = false; inp.x = inp.y = -1e4; }, { passive: true });
on(window, 'scroll', () => { hrDirty = true; const y = window.scrollY, t = now(), dt = clamp(t - lastSt, 16, 100) / 1000; inp.scrollVel = inp.scrollVel * .5 + clamp((y - lastSy) / dt, -6000, 6000) * .5; lastSy = y; lastSt = t; }, { passive: true });
lastSy = window.scrollY;
const ro = new ResizeObserver((es) => { hrDirty = true; for (const e of es) if (host && e.target === host.el) { const b = e.contentBoxSize && e.contentBoxSize[0]; size(b ? b.inlineSize : e.contentRect.width, b ? b.blockSize : e.contentRect.height); } });
const io = new IntersectionObserver((es) => { hrDirty = true; for (const e of es) vis.set(e.target, e.isIntersecting ? e.intersectionRatio || .001 : 0); if (ready) pick(); }, { threshold: [0, .1, .25, .5, .75, 1] });
obs = { ro, io }; for (const h of hosts.values()) { ro.observe(h.el); io.observe(h.el); }
ac.signal.addEventListener('abort', () => { ro.disconnect(); io.disconnect(); obs = null; });
const mo = new MutationObserver((ms) => { if (ready && (rescan() || ms.length)) pick(); }); mo.observe(R, { attributes: true, attributeFilter: ['class'] });
ac.signal.addEventListener('abort', () => mo.disconnect());
on(window, 'spritual:layout', () => { hrDirty = true; G.host.refresh(); });
on(window, 'resize', () => { hrDirty = true; }, { passive: true });
try { const mq = matchMedia('(prefers-reduced-motion: reduce)'); on(mq, 'change', () => { if (mq.matches) destroy('off'); }); } catch (e) {}
slot(my, () => { initFeatures(() => { building = 0; if (!gl) return; t0 = now(); ramp = 0; compile((ok) => { if (!ok) { ceil = 0; destroy('off'); return; } if (!gl) return; ready = 1; slot(my, () => { pick(); if (G.U) G.U.coreReady(); }); }); }); });
});
});
};
const rescan = () => {
const st = d.querySelector('.fm-stage'); if (!obs || !st || hosts.has(st)) return false;
const before = new Set(hosts.keys()); scan(); let n = 0;
for (const h of hosts.values()) if (!before.has(h.el)) { vis.set(h.el, 0); obs.ro.observe(h.el); obs.io.observe(h.el); n++; }
return n > 0;
};
const attach = (name, cb) => {
const f = feats.find((x) => x.name === name); if (!f || !gl || !ready || !host || dead || (f.wants && !f.wants({ tier: tn() }))) return false;
const hs = []; for (const h of hosts.values()) { const m = MAP.find((mm) => h.el.matches(mm.sel)); if (m && m.feats.includes(name) && !h.fx.includes(f)) hs.push(h); }
if (!hs.length) return false;
const done = (ok) => { if (cb) { try { cb(ok); } catch (e) {} } };
try { f.init(gl, env); } catch (e) { dbg('attach failed', e); try { f.dispose && f.dispose(gl); } catch (x) {} return false; }
compile((ok) => {
if (!gl) return; if (!ok) { dbg('attach: shader failed'); try { f.dispose && f.dispose(gl); } catch (x) {} done(false); return; }
for (const h of hs) { if (!hosts.has(h.el) || h.fx.includes(f)) continue; h.fx.push(f); h.fx.sort((a, b) => (a.order || 0) - (b.order || 0)); if (h === host) { try { f.resize && f.resize(cw, ch, scale, NAME[rank]); f.enter && f.enter(); } catch (e) { dbg('attach enter failed', e); } } }
ign = 6; done(true);
});
return true;
};
const detach = (name) => {
const f = feats.find((x) => x.name === name); if (!f) return;
for (const h of hosts.values()) { const i = h.fx.indexOf(f); if (i < 0) continue; if (h === host) { try { f.leave && f.leave(); } catch (e) {} } h.fx.splice(i, 1); }
};
const initFeatures = (cb) => {
const all = new Set(); for (const h of hosts.values()) for (const f of h.fx) all.add(f);
for (const m of MAP) for (const n of m.feats) { const f = feats.find((x) => x.name === n); if (f && !(f.wants && !f.wants({ tier: tn() }))) all.add(f); }
try { for (const f of all) f.init(gl, env); } catch (e) { dbg('init failed', e); ceil = 0; destroy('off'); return; }
cb();
};
const rebuildAfterRestore = () => {
ready = 0; freeRes(true); dead = false; ext = { par: gl.getExtension('KHR_parallel_shader_compile'), lose: gl.getExtension('WEBGL_lose_context') };
const all = new Set(); for (const h of hosts.values()) for (const f of h.fx) all.add(f);
for (const m of MAP) for (const n of m.feats) { const f = feats.find((x) => x.name === n); if (f && !(f.wants && !f.wants({ tier: tn() }))) all.add(f); }
try { for (const f of all) f.init(gl, env); } catch (e) { ceil = 0; destroy('off'); return; }
compile((ok) => { if (!ok || !gl) { destroy('off'); return; } ready = 1; size(cw, ch); live = false; pick(); });
};
const destroy = (s) => {
bgen++; halt(); if (tmr) { clearTimeout(tmr); tmr = 0; } if (lostT) { clearTimeout(lostT); lostT = 0; } if (parkT) { clearTimeout(parkT); parkT = 0; }
try { if (ac) ac.abort(); } catch (e) {} ac = null; nl = 0;
const g0 = gl, gone = dead; if (gone) gl = null;
try { for (const f of feats) f.dispose && f.dispose(gl); } catch (e) {}
try { freeRes(gone); } catch (e) {}
gl = g0;
try { if (!gone && ext && ext.lose && gl && !gl.isContextLost()) ext.lose.loseContext(); } catch (e) {}
if (pos) { pos.el.style.position = pos.was; pos = null; }
if (cv) { cv.remove(); } if (gl) ctxs = Math.max(0, ctxs - 1);
gl = cv = ext = host = null; hosts = new Map(); vis = new Map(); building = 0; ready = 0; started = 0; restored = 0; cw = ch = 0; dead = false; paused = false; hr = null; probe = 0;
if (G.U) { try { G.U.destroyed(); } catch (e) {} }
window.__fxLive = 0; R.dataset.fx = 'off'; if (R.dataset.fxWater) R.dataset.fxWater = 'off'; state(s || 'off');
};
const target = (p, free) => {
let r = p === 'auto' ? RANK[G.auto()] : RANK[p] || 0;
if (p === 'auto' && uGate && r >= 2) r = 3;                         // (the capability gate said yes: Auto runs Ultra)
if (r === 3 && !(G.U && G.U.ready())) r = 2;                         // (Ultra's extra layer is not loaded and compiled yet: Rich until it is)
if (saver) r = p === 'auto' ? 0 : Math.min(r, 1);
return free ? r : Math.min(r, ceil);
};
const want = () => target(lastPref, true);
const start = (p, user) => {
lastPref = p;
if (user) { ceil = 3; upFail = 0; ssSet(null); uGate = false; if (G.U) G.U.chosen(); }   // a deliberate choice lifts the ceiling an earlier slow spell put on this page and session
const r = target(p);
if (!r) { if (gl || started) destroy('off'); else { R.dataset.fx = 'off'; state('off'); } return; }
window.__fxLive = 1;
if (!gl) { rank = Math.min(r, 2); R.dataset.fx = NAME[rank]; build(); return; }
if (r !== rank) setTier(r);
};
G.host = { refresh() { for (const f of feats) { try { f.refresh && f.refresh(); } catch (e) {} } }, get el() { return host && host.el; }, get cfg() { return host ? host.cfg : null; } };
G.run = { has: (n) => { const f = feats.find((x) => x.name === n); if (!f) return false; for (const h of hosts.values()) if (h.fx.includes(f)) return true; return false; }, get lostEver() { return lostEver; }, get ceil() { return ceil; }, get rank() { return rank; }, get pref() { return lastPref; }, get gl() { return gl; }, get live() { return live && ready; }, get ready() { return ready; }, soft: () => soft, reflow: () => { if (cw) size(cw, ch); },
measure: (n, skip, cb) => { if (!live || !ready || meas) return false; meas = { n, skip, d: [], st: [], s: 0, cb }; return true; }, abortMeasure: () => { meas = null; },
gate: (v) => { uGate = !!v; if (gl && ready) start(lastPref); }, enter: () => { if (gl && ready && rank !== 3) setTier(3); }, leave: () => { if (gl && rank === 3) setTier(2); }, start, stop: (s) => { if (gl || started) destroy(s || 'off'); else { R.dataset.fx = 'off'; state(s || 'off'); } } };
G.attach = attach; G.detach = detach; G.feat = (n) => feats.find((x) => x.name === n); G.env = env;
G.register = (f) => { feats.push(f); };   // (an effect registered while running joins at the next start)
while (G.q.length) feats.push(G.q.shift());
try { if (navigator.getBattery) navigator.getBattery().then((b) => { saver = !b.charging && b.level < .2; if (saver && G.pref()) start(G.pref()); }).catch(() => {}); } catch (e) {}
if (DBG) G.debug = Object.assign(G.debug || {}, {   // (merged: the physics host may have added its own debug.physx first)
tier: () => NAME[rank], fps: () => Math.round(fps), p95: () => +p95().toFixed(2), contexts: () => ctxs, listeners: () => nl,
resources: () => ({ programs: res.programs.length, buffers: res.buffers.length, vaos: res.vaos.length, textures: res.textures.length, framebuffers: res.framebuffers.length }),
cpu: () => +cpu.toFixed(3), renderer: () => env.renderer || '', host: () => host && host.el.className, canvases: () => d.querySelectorAll('canvas[data-fx-canvas]').length,
force: (t) => { const r = RANK[t]; if (r === undefined) return; if (!r) destroy('off'); else if (r === 3) { if (gl && G.U && G.U.ready()) setTier(3); else start(t, true); } else if (gl) setTier(r); else start(t, true); }, burn: (ms) => { burn = +ms || 0; }, ultra: () => (G.U ? G.U.info() : null), gate: () => (G.U ? G.U.gateInfo() : null), stepDown: () => stepDown('debug'),
stats: () => (host ? host.fx.map((f) => f.stats && f.stats(inp)) : []), input: () => ({ x: Math.round(inp.x), y: Math.round(inp.y), vx: Math.round(inp.vx), vy: Math.round(inp.vy), sv: Math.round(inp.scrollVel) }),
bench: (n) => { if (!gl || !host) return null; halt('bench'); const px = new Uint8Array(4); let ts = 0, td = 0; for (let i = 0; i < n; i++) { const a = performance.now(); step(TIER[NAME[rank]].step); const b = performance.now(); draw(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const c = performance.now(); ts += b - a; td += c - b; } go(); return { stepMs: +(ts / n).toFixed(3), drawMs: +(td / n).toFixed(3), n }; },
gov: () => ({ slowWins, goodT: Math.round(goodT), probe, ceil, wN, wSlow, coolIn: Math.max(0, Math.round(coolUntil - now())), upFail, paused, dead, pref: lastPref }), rectReads: () => rectReads,
govern: (v) => { govern = !!v; }, lose: () => ext && ext.lose && ext.lose.loseContext(), restore: () => ext && ext.lose && ext.lose.restoreContext(),
});
})();
