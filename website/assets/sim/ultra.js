(() => {
const G = window.SpiritualGPU; if (!G || G.U) return;
const d = document, R = d.documentElement, now = () => performance.now(), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DBG = /[?&]fxdebug=1/.test(location.search) || (() => { try { return localStorage.getItem('spritual:fxdebug') === '1'; } catch (e) { return false; } })();
const tag = d.querySelector('script[data-ucfg]'); let C = {}; try { C = JSON.parse(tag.dataset.ucfg) || {}; } catch (e) {}
const GF = C.graphics || {}, GATE = Object.assign({ drawMs: 7, stepMs: 2, p95: 9, ratio: 1.9, drawMsMax: 11, p95Max: 12.5, instantiateMs: 1500, restDays: 7, minCores: 8, minMemory: 8 }, C.gate || {});
const DAY = 864e5, V3 = '#version 300 es\n';
let kset = null;
const kills = () => { if (kset) return kset; kset = new Set(); try { const v = localStorage.getItem('spritual:fxk'); if (v) v.split(',').forEach((x) => kset.add(x.trim())); } catch (e) {} if (DBG) { const m = location.search.match(/[?&]fxoff=([A-Za-z,]+)/); if (m) m[1].split(',').forEach((x) => kset.add(x)); } return kset; };
const can = (k) => !(GF[k] && GF[k].enabled === false) && !kills().has(k);
const num = (k, key, def) => (GF[k] && typeof GF[k][key] === 'number' ? GF[k][key] : def);
const U = G.U = {
on: false, ramp: 0, get shade() { return U.trial ? 0.004 : U.ramp; }, level: 0, trial: false, mode: '', f: {}, prepared: false, loaded: true,
ready: () => U.prepared && !!G.run && !G.run.lostEver,
};
const LEVELS = ['full', 'L1 caustics off, mist steps halved', 'L2 godrays off, bloom at half size, motes halved', 'L3 birds 12, water grid 256', 'L4 pixel density 1.5, bodies 12', 'L5 physics off', 'L6 Rich'];
const base = () => ({
fine: can('waterDetail'), glitter: can('waterDetail'), caustics: can('caustics'), bloom: can('bloom'), hdr: can('hdr'), bloomHalf: false, godrays: can('godrays'),
mist: can('mist'), mistSteps: num('mist', 'steps', 8), farDepth: can('farDepth'), birds: can('birds') ? num('birds', 'max', 24) : 20, birdsRefl: can('birds'),
motes: can('motes') ? num('motes', 'count', 120000) : 0, grid: can('waterGrid') ? num('waterGrid', 'nx', 384) : 0, dpr: num('hdr', 'dpr', 2), bodies: (C.physics && C.physics.maxBodies) || 24, physx: can('physx'),
});
U.f = base();
U.ss = () => (G.get() === 'ultra' && !U.trial && U.level < 1 && can('hdr') ? 1.5 : 1);
const apply = (lv) => {
const f = U.f = base();
if (lv >= 1) { f.caustics = false; f.mistSteps = Math.max(3, f.mistSteps >> 1); }
if (lv >= 2) { f.godrays = false; f.bloomHalf = true; f.motes = f.motes >> 1; }
if (lv >= 3) { f.birds = Math.min(f.birds, 12); if (f.grid) f.grid = Math.min(f.grid, 256); }
if (lv >= 4) { f.dpr = Math.min(f.dpr, 1.5); f.bodies = Math.min(f.bodies, 12); }
if (lv >= 5) { f.physx = false; }
};
const physicsOff = () => { G.ultraHold = true; try { if (G.detach) G.detach('rigid'); } catch (e) {} try { if (G.physics) G.physics.dispose(); } catch (e) {} };
U.down = (why) => {
if (U.level >= 5) return false;
U.level++; apply(U.level); if (U.level === 5) physicsOff();
if (DBG) { try { console.debug('[fx] ultra ladder', LEVELS[U.level], why); } catch (e) {} }
G.run.reflow(); return true;
};
const mark = (k, why, soft) => { try { localStorage.setItem('spritual:fxu', JSON.stringify({ [k]: Date.now() - (soft ? (GATE.restDays - 1) * DAY : 0), why: String(why || '').slice(0, 80) })); } catch (e) {} };
const resting = () => { try { const o = JSON.parse(localStorage.getItem('spritual:fxu') || 'null'); if (!o) return 0; const t = Math.max(o.fail || 0, o.no || 0, o.down || 0); return t && Date.now() - t < GATE.restDays * DAY ? t : 0; } catch (e) { return 0; } };
U.left = (why) => { G.ultraHold = true; try { physicsOff(); } catch (e) {} mark('down', why); U.on = false; };   // (Ultra gave way to Rich: Auto does not return for a week)
U.chosen = () => { G.ultraHold = false; gateRetried = false; U.level = 0; apply(0); booted = false; U.mode = ''; G.ultraAuto = false; setTimeout(boot, G.get() === '' ? 2500 : 0); };
U.tier = (on) => { U.on = on; U.ramp = 0; raw = 0; if (on) { U.level = 0; apply(0); } };
U.destroyed = () => { U.on = false; U.prepared = false; U.trial = false; prepping = false; try { if (G.physics) G.physics.dispose(); } catch (e) {} };   // (the layer is gone for any reason, a second context loss too: the world and its 5 MB heap go with it)
let raw = 0, prepping = false, booted = false, gateRetried = false, gateInfo = { ok: null, reasons: [] };
const HASH = `float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }`;
const MIST = V3 + `precision highp float;
uniform sampler2D uTex; uniform vec4 uCover, uSafe; uniform vec2 uBuf, uSun, uWind;
uniform float uScale, uAsp, uWL, uT, uK, uSteps; uniform vec3 uTint;
out vec4 o;
${HASH}
void main(){
vec2 css = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / uScale;
vec2 uv = (css - uCover.xy) / uCover.zw;
float h = uv.y - uWL;
if (h < 0.004 || h > 0.34) discard;
float xi = (uv.x - 0.5) * uAsp;
float X = xi / h, Z0 = 0.9 / h, Zm = Z0 * 1.7 + 10.0;
float jit = hash(gl_FragCoord.xy);
float od = 0.0, wsum = 0.0;
for (int i = 0; i < 12; i++) {
if (float(i) >= uSteps) break;
float s = (float(i) + jit) / uSteps, Z = mix(Z0, Zm, s * s);
vec2 q = vec2(X * 0.30 + uWind.x * uT * 0.020, Z * 0.085 - uT * 0.045 + uWind.y * uT * 0.004);
float n = vnoise(q) * 0.62 + vnoise(q * 2.3 + 7.0) * 0.38;
float dn = smoothstep(0.38, 0.82, n);
od += dn * (Zm - Z0) / uSteps * 0.0105;
wsum += 1.0;
}
float a = (1.0 - exp(-od)) * uK;
float vp = smoothstep(0.004, 0.05, h) * (1.0 - smoothstep(0.10, 0.34, h));          // thickest low over the far water, gone before the near shore
vec2 lo = smoothstep(vec2(0.0), vec2(40.0), css - uSafe.xy), hi = smoothstep(vec2(0.0), vec2(40.0), uSafe.zw - css);
float safe = mix(1.0, 0.3, lo.x * lo.y * hi.x * hi.y);                                // thinner inside the title card, so the words keep their contrast
a = clamp(a * vp * safe, 0.0, 0.34);
vec3 haze = textureLod(uTex, vec2(uv.x, uWL - 0.05), 5.0).rgb * 1.16 + 0.028;
float sw = exp(-pow((uv.x - uSun.x) * uAsp / 0.42, 2.0));
vec3 col = mix(haze, uTint * (0.55 + 0.5 * dot(haze, vec3(0.33))), 0.34 * sw) ;
col += (hash(gl_FragCoord.xy * 1.3) - 0.5) * (1.5 / 255.0);
o = vec4(max(col, 0.0) * a, a);
}`;
const MOTE_VS = V3 + `precision highp float;
uniform sampler2D uTex; uniform vec4 uCover, uSafe; uniform vec2 uHost, uSun, uWind;
uniform float uScale, uAsp, uWL, uT, uK;
out float vA; out float vS;
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float u01(uint x){ return float(x & 0xFFFFFFu) / 16777215.0; }
void main(){
uint a = pcg(uint(gl_VertexID) + 1u), b = pcg(a ^ 0x68E31DA4u), c = pcg(b ^ 0xB5297A4Du), e = pcg(c ^ 0x1B56C4E9u);
float x0 = u01(a), y0 = u01(b), z0 = u01(c), sd = u01(e);
float near = 1.0 - z0, ds = mix(0.25, 1.0, near);
vec3 wf = vec3(sin(y0 * 7.1 + uT * 0.23 + sd * 6.0) + 0.6 * sin(z0 * 9.7 - uT * 0.17), 0.7 * sin(x0 * 6.3 + uT * 0.19) + 0.4 * sin(z0 * 5.1 + uT * 0.11 + sd * 3.0), 0.5 * sin(x0 * 4.4 + y0 * 3.9 - uT * 0.13));
float drift = (uWind.x * 0.00028 + 0.0035) * mix(0.35, 1.0, near);
float u = fract(x0 + drift * uT + wf.x * 0.010 * ds);
float yy = fract(y0 - uT * 0.00045 * mix(0.3, 1.0, near) + wf.z * 0.004 * ds);
float vtop = uWL - mix(0.21, 0.07, z0), vbot = uWL + mix(0.34, 0.02, z0);
float v = mix(vtop, vbot, yy) + wf.y * 0.008 * ds;
vec2 uv = vec2(u, v);
vec2 css = uCover.xy + uv * uCover.zw;
vec2 ndc = vec2(css.x / uHost.x * 2.0 - 1.0, 1.0 - css.y / uHost.y * 2.0);
gl_Position = vec4(ndc, 0.0, 1.0);
float lw = smoothstep(0.34, 0.9, dot(textureLod(uTex, uv, 5.0).rgb, vec3(0.299, 0.587, 0.114)));
vec2 q = (uv - uSun) * vec2(uAsp, 1.0);
float sw = exp(-q.x * q.x / 0.10) * exp(-q.y * q.y / 0.16);
float bok = step(z0, 0.07);
float al = (0.036 + 0.044 * sd) * (0.08 + 0.75 * lw + 1.7 * sw) * mix(1.0, 0.28, bok) * mix(0.55, 1.0, near) * mix(0.30, 1.0, smoothstep(uWL - 0.12, uWL + 0.02, v));   // (in the sky only a few, over the water the most: no snow over the clouds)
vec2 lo = smoothstep(vec2(0.0), vec2(40.0), css - uSafe.xy), hi = smoothstep(vec2(0.0), vec2(40.0), uSafe.zw - css);
al *= mix(1.0, 0.25, lo.x * lo.y * hi.x * hi.y);
al *= smoothstep(0.0, 0.03, u) * smoothstep(1.0, 0.97, u) * smoothstep(uWL + 0.44, uWL + 0.30, v);
vA = al * uK; vS = bok;
gl_PointSize = (mix(1.0, 3.3, near * near) + bok * 4.5) * uScale;
}`;
const MOTE_FS = V3 + `precision mediump float;
in float vA; in float vS; uniform vec3 uTint;
out vec4 o;
void main(){
vec2 p = gl_PointCoord * 2.0 - 1.0; float r2 = dot(p, p);
float a = exp(-r2 * mix(3.0, 1.4, vS));
if (r2 > 1.0 || vA < 0.0002) discard;
o = vec4(mix(vec3(1.0, 0.80, 0.50), uTint, 0.30) * a * vA, 0.0);
}`;
const RAYSU = V3 + `precision highp float;
in vec2 vUv; uniform sampler2D uTex;
uniform vec4 uCover; uniform vec2 uSun, uHost; uniform float uAsp, uT;
out vec4 o;
${HASH}
void main(){
vec2 css = vec2(vUv.x * uHost.x, (1.0 - vUv.y) * uHost.y);
vec2 uv = (css - uCover.xy) / uCover.zw;
float sky = 1.0 - smoothstep(0.43, 0.52, uv.y);
vec2 dl = (uSun - uv) / 20.0;
uv += dl * hash(gl_FragCoord.xy);
float w = 1.0, acc = 0.0;
for (int i = 0; i < 20; i++) {
uv += dl;
vec3 c = textureLod(uTex, uv, 2.0).rgb;
float Y = dot(c, vec3(0.299, 0.587, 0.114));
vec2 sq = (uv - uSun) * vec2(uAsp, 1.0);
float air = 0.72 + 0.56 * vnoise(vec2(uv.x * uAsp * 5.0 + uT * 0.012, uv.y * 9.0 - uT * 0.006));
acc += smoothstep(0.72, 0.99, Y) * exp(-dot(sq, sq) / 0.2) * w * air * step(uv.y, 0.505);
w *= 0.955;
}
o = vec4(vec3(1.0, 0.8, 0.5) * min(acc * 0.047, 0.4) * sky, 1.0);
}`;
const COMPU = V3 + `precision highp float;
in vec2 vUv; uniform sampler2D uB1, uB2, uB3, uB4, uR;
uniform vec4 uSafe; uniform vec3 uK; uniform vec2 uHost;
out vec4 o;
${HASH}
void main(){
vec2 css = vec2(vUv.x * uHost.x, (1.0 - vUv.y) * uHost.y);
vec2 lo = smoothstep(vec2(0.0), vec2(40.0), css - uSafe.xy), hi = smoothstep(vec2(0.0), vec2(40.0), uSafe.zw - css);
float safe = mix(1.0, 0.35, lo.x * lo.y * hi.x * hi.y);
vec3 b = (texture(uB1, vUv).rgb * 0.8 + texture(uB2, vUv).rgb * 1.0 + texture(uB3, vUv).rgb * 1.1 + texture(uB4, vUv).rgb * 0.9) * uK.x * vec3(1.0, 0.72, 0.42);
b = b / (1.0 + b * 1.3);                                           // the shoulder: a very bright glint spreads and warms, it never goes white or neon
vec3 c = (b + texture(uR, vUv).rgb * uK.y) * safe;
c = min(c, vec3(0.46));
c += (hash(gl_FragCoord.xy + fract(uK.z * 0.37) * 91.0) - 0.5) * (1.6 / 255.0) * step(0.003, max(c.r, max(c.g, c.b)));
o = vec4(max(c, 0.0), 0.0);
}`;
G.sh = G.sh || {}; G.sh.U = { RAYSU, COMPU };
let env = null, pM = null, pP = null, vaoP = null, W = 0, Hh = 0, scale = 1, safe = [0, 0, 0, 0], wv = [0, 0], tt = 0, drawn = { mist: 0, motes: 0 }, host = null;
const cardRect = () => { host = env && env.host; const card = host && host.querySelector('.cx-open-card'); if (card && host) { const a = host.getBoundingClientRect(), b = card.getBoundingClientRect(); safe = [b.left - a.left, b.top - a.top, b.right - a.left, b.bottom - a.top]; } };
const live = () => U.on && U.ramp > 0.002 && G.lake && G.lake.ready;
const fxMist = {
name: 'ultra', order: 20, wants: () => !!(U.mode || G.get() === 'ultra'),
init(gl, e) {
env = e; const S = G.sh; if (!S) return; pM = e.prog(S.TRI, MIST);
for (const n of ['water', 'far', 'birds', 'light']) { const f = G.feat(n); if (f && f.up) f.up(gl, e); }
},
resize(w, h, sc) { W = w; Hh = h; scale = sc; cardRect(); },
enter() { cardRect(); },
refresh() { cardRect(); },
update(dt) {
tt += dt;
if (U.trial) { raw = 0; U.ramp = 0; return; }
if (U.on) { raw = Math.min(1, raw + dt / 3.5); U.ramp = raw * raw * (3 - 2 * raw); }
},
draw(gl, e) {
drawn.mist = 0; const f = U.f;
if (!U.on || !f.mist || !pM || !pM.ok || !(U.ramp > 0.002 || U.trial) || !G.lake.ready) return;
const L = G.lake, c0 = L.cover, tex = L.tex && L.tex(); if (!tex) return;
G.windAt && G.windAt(W * 0.5, Hh * 0.55, wv);
gl.useProgram(pM.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pM.loc('uTex'), 0);
gl.uniform4f(pM.loc('uCover'), c0[0], c0[1], c0[2], c0[3]); gl.uniform4fv(pM.loc('uSafe'), safe); gl.uniform2f(pM.loc('uBuf'), e.bw, e.bh); gl.uniform2f(pM.loc('uSun'), L.sun[0], L.sun[1]);
gl.uniform2f(pM.loc('uWind'), clamp(wv[0], -80, 80), clamp(wv[1], -40, 40));
gl.uniform1f(pM.loc('uScale'), scale); gl.uniform1f(pM.loc('uAsp'), L.asp); gl.uniform1f(pM.loc('uWL'), L.wl); gl.uniform1f(pM.loc('uT'), tt);
gl.uniform1f(pM.loc('uK'), U.shade * num('mist', 'density', 0.55) * L.fade * e.intensity); gl.uniform1f(pM.loc('uSteps'), f.mistSteps); gl.uniform3f(pM.loc('uTint'), L.tint[0], L.tint[1], L.tint[2]);
const y0 = Math.max(0, Math.floor((c0[1] + (L.wl + 0.0) * c0[3]) * scale)), y1 = Math.min(e.bh, Math.ceil((c0[1] + (L.wl + 0.34) * c0[3]) * scale)), x0 = Math.max(0, Math.floor(c0[0] * scale)), x1 = Math.min(e.bw, Math.ceil((c0[0] + c0[2]) * scale));
if (x1 <= x0 || y1 <= y0) return;
gl.enable(gl.SCISSOR_TEST); gl.scissor(x0, e.bh - y1, x1 - x0, y1 - y0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
e.tri(); gl.disable(gl.SCISSOR_TEST); drawn.mist = 1;
},
stats: () => ({ mist: drawn.mist, motes: drawn.motes, ramp: +U.ramp.toFixed(3) }),
dispose() { pM = null; env = null; },
};
const fxMotes = {
name: 'motes', order: 38, wants: () => !!(U.mode || G.get() === 'ultra'),
init(gl, e) { env = env || e; const S = G.sh; if (!S) return; pP = e.prog(MOTE_VS, MOTE_FS); vaoP = e.vao(); },
resize(w, h, sc) { W = w; Hh = h; scale = sc; },
draw(gl, e) {
drawn.motes = 0; const f = U.f;
if (!U.on || !f.motes || !pP || !pP.ok || !(U.ramp > 0.002 || U.trial) || !G.lake.ready) return;
const L = G.lake, c0 = L.cover, tex = L.tex && L.tex(); if (!tex) return;
gl.useProgram(pP.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pP.loc('uTex'), 0);
gl.uniform4f(pP.loc('uCover'), c0[0], c0[1], c0[2], c0[3]); gl.uniform4fv(pP.loc('uSafe'), safe); gl.uniform2f(pP.loc('uHost'), W, Hh); gl.uniform2f(pP.loc('uSun'), L.sun[0], L.sun[1]);
gl.uniform2f(pP.loc('uWind'), clamp(wv[0], -80, 80), 0);
gl.uniform1f(pP.loc('uScale'), scale); gl.uniform1f(pP.loc('uAsp'), L.asp); gl.uniform1f(pP.loc('uWL'), L.wl); gl.uniform1f(pP.loc('uT'), tt);
gl.uniform1f(pP.loc('uK'), U.shade * num('motes', 'strength', 1) * L.fade * e.intensity); gl.uniform3f(pP.loc('uTint'), L.tint[0], L.tint[1], L.tint[2]);
gl.disable(gl.SCISSOR_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.bindVertexArray(vaoP); gl.drawArrays(gl.POINTS, 0, f.motes); gl.bindVertexArray(null); drawn.motes = f.motes;
},
dispose() { pP = vaoP = null; },
};
G.register(fxMist); G.register(fxMotes);
const prep = (cb) => {
if (U.prepared) return cb(true); if (prepping) return;
if (G.run && G.run.has && G.run.has('ultra') && G.run.has('motes')) { U.prepared = true; return cb(true); }
prepping = true;
const ok = G.attach('ultra', (ok1) => { if (!ok1) { prepping = false; return cb(false); } const ok2 = G.attach('motes', (ok3) => { prepping = false; U.prepared = !!ok3; if (!ok3) { try { G.detach('ultra'); } catch (e) {} } cb(!!ok3); }); if (!ok2) { prepping = false; cb(false); } });
if (!ok) { prepping = false; cb(false); }
};
const introOver = () => !R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end');
const blockers = () => {
const n = navigator, why = [], c = n.connection;
if (C.enabled === false) why.push('switched off in fx.json');
if (R.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches) why.push('reduced motion');
if (R.dataset.light) why.push('Light mode'); if (R.classList.contains('ep-lite')) why.push('lite page');
if (c && c.saveData) why.push('Save-Data');
if (matchMedia('(pointer: coarse)').matches) why.push('touch screen');
if ((n.hardwareConcurrency || 4) < GATE.minCores) why.push('fewer than ' + GATE.minCores + ' cores');
if (n.deviceMemory != null && n.deviceMemory < GATE.minMemory) why.push('less than ' + GATE.minMemory + ' GB of memory');
if (devicePixelRatio > 3) why.push('pixel density above 3');
if (G.run && G.run.soft()) why.push('software renderer');
if (G.run && G.run.lostEver) why.push('the GPU context was lost earlier');
if (G.run && G.run.ceil < 3) why.push('this session already stepped down');
const t = resting(); if (t) why.push('resting (an earlier trial or step-down, ' + Math.max(1, Math.round((GATE.restDays * DAY - (Date.now() - t)) / DAY)) + ' d left)');
if (d.hidden) why.push('tab hidden');
return why;
};
let lastScroll = 0; addEventListener('scroll', () => { lastScroll = now(); }, { passive: true });
const decide = (richM, ultM, why) => {
const ratio = ultM && richM && richM.drawMs > 0 ? ultM.drawMs / richM.drawMs : 99;
const fixedOk = !!ultM && ultM.drawMs <= GATE.drawMs && ultM.stepMs <= GATE.stepMs && ultM.p95 <= GATE.p95;
const relOk = !!ultM && ultM.stepMs <= GATE.stepMs && ratio <= GATE.ratio && ultM.drawMs <= GATE.drawMsMax && ultM.p95 <= GATE.p95Max;
const ok = fixedOk || relOk;
const clear = !ultM || ultM.drawMs > GATE.drawMsMax * 1.4 || ratio > GATE.ratio * 1.6;
if (!ok && !clear && !gateRetried && !why) { gateRetried = true; U.trial = false; G.run.leave(); U.mode = ''; booted = true; gateInfo = { ok: null, reasons: ['measuring again'] }; setTimeout(gateRun, 4000); return; }
gateInfo = { ok, drawMs: ultM && ultM.drawMs, stepMs: ultM && ultM.stepMs, p95: ultM && ultM.p95, rich: richM, ultra: ultM, instantiateMs: gateInfo.instantiateMs, reasons: ok ? [] : [why || ('over budget: draw ' + (ultM && ultM.drawMs) + ' ms (limit ' + GATE.drawMs + '), p95 ' + (ultM && ultM.p95) + ' ms (limit ' + GATE.p95 + ')')], budget: { drawMs: GATE.drawMs, stepMs: GATE.stepMs, p95: GATE.p95 } };
U.trial = false;
if (!ok) { G.run.leave(); mark('no', gateInfo.reasons[0], !clear); return; }
U.mode = 'auto'; G.ultraAuto = true; G.run.gate(true);   // (Auto now runs Ultra; the graphics are eased in, and the physics is fetched)
if (G.ultraPhysics) G.ultraPhysics();
};
const gateRun = () => {
const why = blockers(); if (why.length) { gateInfo = { ok: false, reasons: why }; return; }
const go = () => {
if (!G.run || !G.run.live || G.get() !== '' ) { setTimeout(go, 700); return; }
if (!introOver() || now() - lastScroll < 1200 || d.hidden || !G.lake.ready) { setTimeout(go, 700); return; }
U.mode = 'auto'; gateInfo = { ok: null, reasons: ['measuring'] };
prep((ok) => {
if (!ok) { U.mode = ''; gateInfo = { ok: false, reasons: ['the Ultra programs did not compile'] }; mark('no', 'shader'); return; }
const t0 = now(), guard = setTimeout(() => { if (U.trial) { U.trial = false; G.run.abortMeasure(); G.run.leave(); U.mode = ''; gateInfo = { ok: null, reasons: ['measurement interrupted (hidden tab or slow start); not counted'] }; } }, 20000);
const m1 = G.run.measure(16, 6, (richM) => {
if (!G.run.enter) { clearTimeout(guard); return; }
U.trial = true; G.run.enter();    // the Ultra pipeline, drawn at full cost but with its extras at strength 0: the page looks exactly as it did
const m2 = G.run.measure(40, 12, (ultM) => { clearTimeout(guard); decide(richM, ultM); });
if (!m2) { clearTimeout(guard); decide(richM, null, 'could not measure'); }
});
if (!m1) { clearTimeout(guard); U.mode = ''; setTimeout(go, 1500); }
});
};
go();
};
U.gateInfo = () => Object.assign({ mode: U.mode, resting: !!resting(), blockers: blockers() }, gateInfo);
U.info = () => ({ on: U.on, level: U.level, levelName: LEVELS[U.level], ramp: +U.ramp.toFixed(3), mode: U.mode, trial: U.trial, prepared: U.prepared, f: Object.assign({}, U.f), killed: Array.from(kills()), cfg: { gate: GATE, enabled: C.enabled !== false } });
const boot = () => {
if (!G.run || !G.run.ready || booted && U.prepared) return;
const pref = G.get();
if (pref === 'ultra') { booted = true; U.mode = 'explicit'; prep((ok) => { if (!ok) { U.mode = ''; mark('fail', 'shader'); return; } G.run.start(G.pref()); }); }
else if (pref === '' && !booted) { booted = true; gateRun(); }
else if (pref === '' && U.mode === 'auto' && G.ultraAuto) { prep((ok) => { if (ok) G.run.start(G.pref()); }); }
};
U.coreReady = () => { if (G.run) setTimeout(boot, 0); };
if (G.run && G.run.ready) boot();
new MutationObserver(() => {
if (R.dataset.fxPhysx === 'ready' && U.mode === 'auto' && G.physics) { const i = G.physics.info(); gateInfo.instantiateMs = i && i.instantiateMs; if (i && i.instantiateMs > GATE.instantiateMs) { gateInfo.reasons = ['the physics took ' + Math.round(i.instantiateMs) + ' ms to start (limit ' + GATE.instantiateMs + ')']; physicsOff(); mark('no', 'physics start'); } }
}).observe(R, { attributes: true, attributeFilter: ['data-fx-physx'] });
if (DBG) { G.debug = G.debug || {}; G.debug.U = U; }
})();
