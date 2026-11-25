(() => {
const G = window.SpiritualGPU; if (!G || G.rigid) return;
const d = document, R = d.documentElement, now = () => performance.now();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const DBG = /[?&]fxdebug=1/.test(location.search) || (() => { try { return localStorage.getItem('spritual:fxdebug') === '1'; } catch (e) { return false; } })();
const tag = d.querySelector('script[data-physx]'); let C = {}; try { C = (tag && JSON.parse(tag.dataset.physx)) || {}; } catch (e) { C = {}; }
const RC = Object.assign({ waveMetres: 0.1, splashK: 0.16, windGain: 1.6, eye: 1.7, focal: 0.9, maxTapPetals: 6, maxSkyPetals: 3, skyEveryS: [6, 10], flickMinPxS: 700, flickMaxMs: 140, stoneEveryS: 2.5, glintLift: 0.6, glintSeconds: 1.2 }, C.render || {});
const IC = Object.assign({ petalOffering: true, skyPetals: true, paddle: true, skipStone: true, sunTrigger: true }, C.interactions || {});
const BND = Object.assign({ x: 34, zNear: 2.2, zFar: 40 }, C.bounds || {});
const STONE_R = (C.stone && C.stone.r) || 0.05, PET = Object.assign({ hx: 0.08, hz: 0.035, life: 35 }, C.petal || {});
let kset = null;
const kills = () => { if (kset) return kset; kset = new Set(); try { const v = localStorage.getItem('spritual:fxk'); if (v) v.split(',').forEach((x) => kset.add(x.trim())); } catch (e) {} if (DBG) { const m = location.search.match(/[?&]fxoff=([A-Za-z,]+)/); if (m) m[1].split(',').forEach((x) => kset.add(x)); } return kset; };
const can = (n) => IC[n] !== false && !kills().has(n);
const V3 = '#version 300 es\n';
const QROT = 'vec3 rot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }';
const PROJ = `uniform vec2 uRes; uniform vec4 uCam;
vec2 proj(vec3 p){ float Z = max(p.z, 0.6); return vec2(uCam.y + uCam.x * p.x / Z, uCam.z + uCam.x * (uCam.w - p.y) / Z); }
vec4 clip(vec2 s){ return vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, 0.0, 1.0); }`;
const PETAL_VS = V3 + `layout(location=0) in vec2 m;
layout(location=1) in vec4 iP;
layout(location=2) in vec4 iQ;
layout(location=3) in vec4 iA;
${PROJ}
uniform vec2 uSize; uniform float uT, uMirror;
out vec3 vN; out vec3 vV; out vec2 vM; out vec2 vUv; out vec4 vI; out float vZ; out float vY;
${QROT}
vec3 petal(vec2 q){
float wd = pow(max(1.0 - q.y * q.y, 0.0), 0.7) * (1.0 - 0.2 * q.y);
float x = q.y * uSize.x, z = q.x * wd * uSize.y;
float y = (0.8 * q.x * q.x * wd) * uSize.y + 0.3 * q.y * q.y * uSize.x * 0.5;
return vec3(x, y, z);
}
void main(){
vec3 p0 = petal(m);
vec3 pu = petal(m + vec2(0.03, 0.0)) - petal(m - vec2(0.03, 0.0)) + vec3(0.0, 0.0, 1e-4);
vec3 ps = petal(m + vec2(0.0, 0.03)) - petal(m - vec2(0.0, 0.03)) + vec3(1e-4, 0.0, 0.0);
vec3 n = normalize(cross(pu, ps) + vec3(0.0, 1e-7, 0.0));
float sc = iA.z;
vec3 w = rot(iQ, p0 * sc) + iP.xyz; vec3 wn = rot(iQ, n);
if (uMirror > 0.5) { w.y = -w.y; wn.y = -wn.y; }
vec2 s = proj(w);
if (uMirror > 0.5) s.x += (sin(s.y * 0.05 + uT * 1.7 + iA.y * 6.0) * 1.0 + sin(s.y * 0.13 - uT * 2.3 + iA.y) * 0.5) * uCam.x / max(w.z, 0.6) * 0.009;
gl_Position = clip(s);
vN = wn; vV = normalize(vec3(-w.x, uCam.w - w.y, -w.z)); vM = m; vUv = s; vI = vec4(iP.w, iA.y, iA.x, iA.w); vZ = w.z; vY = w.y;
}`;
const PETAL_FS = V3 + `precision highp float;
in vec3 vN; in vec3 vV; in vec2 vM; in vec2 vUv; in vec4 vI; in float vZ; in float vY;
uniform sampler2D uTex; uniform vec4 uCover; uniform float uHas, uWL, uMirror;
uniform vec3 uTint, uL;
out vec4 o;
void main(){
vec3 N = normalize(vN), V = normalize(vV);
float facing = dot(N, V); if (facing < 0.0) { N = -N; facing = -facing; }
float kind = vI.x, seed = vI.y, al = vI.z;
float e = 1.0 - abs(vM.x);
float aa = smoothstep(0.0, max(fwidth(e) * 1.5, 0.03), e);
vec2 uv = clamp((vUv - uCover.xy) / uCover.zw, vec2(0.0), vec2(1.0));
vec3 amb = mix(vec3(0.96, 0.92, 0.88), textureLod(uTex, vec2(uv.x, uWL - 0.1), 5.0).rgb * 1.5 + 0.2, uHas * 0.4);
vec3 haze = mix(vec3(0.86, 0.72, 0.58), textureLod(uTex, vec2(uv.x, uWL - 0.05), 4.0).rgb, uHas);
float tipw = smoothstep(0.3, 1.0, abs(vM.y));
vec3 base;
if (kind < 0.5) base = mix(vec3(0.99, 0.86, 0.89), vec3(0.88, 0.42, 0.60), clamp(tipw * 0.95 + 0.28 * abs(vM.x) + 0.08, 0.0, 1.0));
else base = mix(vec3(0.96, 0.52, 0.07), vec3(1.0, 0.70, 0.16), fract(seed * 3.7)) * (1.0 - 0.1 * abs(vM.x));
base *= 0.97 + 0.03 * cos(vM.x * 6.0);
float ndl = dot(N, uL), wrap = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
float back = pow(clamp(dot(-V, uL), 0.0, 1.0), 4.0);
vec3 col = base * (amb * 0.82 + uTint * 0.2 * wrap);
col += base * uTint * back * 0.42 * (1.0 - 0.5 * facing);
col += uTint * pow(1.0 - facing, 3.0) * (0.04 + 0.2 * back);
col = col * 1.12 / (1.0 + 0.14 * col);
float fog = smoothstep(9.0, 42.0, vZ) * 0.6;
col = mix(col, haze, fog);
float a = al * aa * (0.94 - 0.1 * (1.0 - facing));
if (uMirror > 0.5) { col *= vec3(0.58, 0.66, 0.76); a *= 0.34 * (1.0 - fog) * exp(-abs(vY) * 2.6); }
o = vec4(col * a, a);
}`;
const STONE_VS = V3 + `layout(location=0) in vec3 m;
layout(location=1) in vec4 iP;
layout(location=2) in vec4 iQ;
layout(location=3) in vec4 iA;
${PROJ}
uniform float uR, uT, uMirror;
out vec3 vN; out vec3 vV; out vec3 vL; out vec2 vUv; out vec4 vI; out float vZ; out float vY;
${QROT}
void main(){
vec3 lp = m * vec3(1.0, 0.4, 1.0) * uR * iA.z;
vec3 ln = normalize(vec3(m.x, m.y / 0.16, m.z));
vec3 w = rot(iQ, lp) + iP.xyz; vec3 wn = rot(iQ, ln);
if (uMirror > 0.5) { w.y = -w.y; wn.y = -wn.y; }
vec2 s = proj(w);
if (uMirror > 0.5) s.x += (sin(s.y * 0.05 + uT * 1.7) + 0.5 * sin(s.y * 0.13 - uT * 2.3)) * uCam.x / max(w.z, 0.6) * 0.009;
gl_Position = clip(s);
vN = wn; vV = normalize(vec3(-w.x, uCam.w - w.y, -w.z)); vL = m; vUv = s; vI = vec4(iP.w, iA.y, iA.x, iA.w); vZ = w.z; vY = w.y;
}`;
const STONE_FS = V3 + `precision highp float;
in vec3 vN; in vec3 vV; in vec3 vL; in vec2 vUv; in vec4 vI; in float vZ; in float vY;
uniform sampler2D uTex; uniform vec4 uCover; uniform float uHas, uWL, uMirror;
uniform vec3 uTint, uL;
out vec4 o;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
vec3 N = normalize(vN), V = normalize(vV);
float seed = vI.y, al = vI.z, deep = vI.w;
vec2 uv = clamp((vUv - uCover.xy) / uCover.zw, vec2(0.0), vec2(1.0));
vec3 amb = mix(vec3(0.80, 0.68, 0.55), textureLod(uTex, vec2(uv.x, uWL - 0.1), 5.0).rgb, uHas);
vec3 haze = mix(vec3(0.86, 0.72, 0.58), textureLod(uTex, vec2(uv.x, uWL - 0.05), 4.0).rgb, uHas);
float n = vn3(vL * 9.0 + seed * 7.0) * 0.6 + vn3(vL * 31.0 + seed) * 0.4;
vec3 base = mix(vec3(0.46, 0.425, 0.40), vec3(0.72, 0.64, 0.54), n);
float ndl = dot(N, uL), wrap = clamp((ndl + 0.5) / 1.5, 0.0, 1.0);
float wet = smoothstep(0.02, -0.02, vY) * 0.5 + 0.18;
vec3 col = base * (1.0 - 0.35 * wet) * (amb * 0.7 + uTint * 0.3 * wrap);
vec3 Hh = normalize(uL + V);
col += uTint * pow(max(dot(N, Hh), 0.0), 26.0) * (0.22 + 0.5 * wet);
col += uTint * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.14;
col += amb * max(N.y, 0.0) * 0.22 * (1.0 - 0.6 * wet);   // (the sky's own light on its upper skin)
col = col * 1.1 / (1.0 + 0.12 * col);
float under = smoothstep(0.004, -0.03, vY);
col = mix(col, vec3(0.12, 0.19, 0.23) * (0.6 + 0.4 * deep), under * 0.7);
float fog = smoothstep(9.0, 42.0, vZ) * 0.6;
col = mix(col, haze, fog);
float a = al * deep * mix(1.0, 0.55, under) * smoothstep(0.0, 0.16, abs(dot(N, V)));   // (the skin is an exact ellipsoid: where the normal turns edge-on is its outline, feathered over about a pixel)
if (uMirror > 0.5) { col *= vec3(0.58, 0.66, 0.76); a *= 0.34 * (1.0 - fog) * exp(-abs(vY) * 2.6); }
o = vec4(col * a, a);
}`;
const SHADOW_VS = V3 + `layout(location=0) in vec2 q;
layout(location=1) in vec4 iP;
layout(location=3) in vec4 iA;
${PROJ}
out vec2 vq; out float vA;
void main(){
float Z = max(iP.z, 0.6), y = max(iP.y, 0.0);
float r = (iP.w > 1.5 ? 0.1 : 0.14) * iA.z * (1.0 + y * 0.9);
vec2 c = proj(vec3(iP.x, 0.0, Z));
vec2 s = c + vec2(q.x * r * uCam.x / Z, q.y * r * uCam.x * uCam.w / (Z * Z) * 1.4);
gl_Position = clip(s); vq = q; vA = iA.x * 0.2 * exp(-y * 2.4) * smoothstep(-0.06, 0.0, iP.y);
}`;
const SHADOW_FS = V3 + `precision mediump float;
in vec2 vq; in float vA;
out vec4 o;
void main(){ float r = dot(vq, vq); float a = vA * exp(-3.2 * r) * (1.0 - smoothstep(0.7, 1.0, r)); o = vec4(vec3(0.03, 0.05, 0.07) * a, a); }`;
const DROP_VS = V3 + `layout(location=0) in vec2 q;
layout(location=1) in vec4 iD;
layout(location=2) in vec4 iE;
${PROJ}
out vec2 vq; out float vA;
void main(){
vec2 c = proj(iD.xyz); float rad = max(1.2, iD.w * uCam.x / max(iD.z, 0.6));
gl_Position = clip(c + q * rad); vq = q; vA = iE.x;
}`;
const DROP_FS = V3 + `precision mediump float;
in vec2 vq; in float vA;
out vec4 o;
void main(){ float r = dot(vq, vq); float a = vA * 0.6 * exp(-2.6 * r) * (1.0 - smoothstep(0.55, 1.0, r)); o = vec4(vec3(1.0, 0.92, 0.80) * a, a * 0.7); }`;
const L = G.lake; let env = null, P = null, progs = null, tex1 = null, vaos = null, bufs = null, nIdxP = 0, nIdxS = 0;
let host = null, W = 0, Hh = 0, active = false, attaching = 0, ac = null, T = 0, tier = 'rich', retry = 0, cardT = 0;
const cal = { f: 1, cx: 0, wl: 0, eye: RC.eye, ok: false };
const MB = Math.max(8, C.maxBodies || 24), B = new Array(MB).fill(null), cnt = { splash: 0, skip: 0, glint: 0, sink: 0, gone: 0, tap: 0, flick: 0, sky: 0, fallback: 0, drops: 0, offscreen: 0 };
const instP = new Float32Array(MB * 12), instS = new Float32Array(MB * 12), ordP = new Int16Array(MB), ordS = new Int16Array(MB);
let nP = 0, nS = 0, nDrawn = 0, drawCalls = 0, cards = [];
const DM = 48, drop = new Float32Array(DM * 8), dinst = new Float32Array(DM * 8); let nDrop = 0;
const pulses = []; let stoneAt = -9, skyAt = 0, rs = 12345, downS = null, paddleSent = null, wakeBudget = 0, lastStats = 0;
const rnd = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
const sp = [0, 0], wp = [0, 0], o2 = [0, 0];
const calib = () => {
if (!L.ready || !L.cover) { cal.ok = false; return false; }
cal.f = RC.focal * L.cover[3]; cal.cx = L.cover[0] + 0.5 * L.cover[2]; cal.wl = L.cover[1] + L.wl * L.cover[3]; cal.eye = RC.eye; cal.ok = cal.f > 10; return cal.ok;
};
const toWorld = (px, py, o) => { const z = clamp(cal.f * cal.eye / Math.max(py - cal.wl, 4), BND.zNear + 0.2, BND.zFar - 1); o[0] = (px - cal.cx) * z / cal.f; o[1] = z; };
const toScreen = (x, y, z, o) => { o[0] = cal.cx + cal.f * x / z; o[1] = cal.wl + cal.f * (cal.eye - y) / z; };
const overCard = (px, py) => { for (let i = 0; i < cards.length; i++) { const c = cards[i]; if (px > c[0] && px < c[2] && py > c[1] && py < c[3]) return true; } return false; };
const readCards = () => {
cards = []; if (!host || !env) return; const hr = env.rect && env.rect(); if (!hr) return;
for (const el of host.querySelectorAll('.cx-open-card .cx-welcome-k, .cx-open-card .cx-wm, .cx-open-card .cx-open-line, .cx-open-card .cx-open-sub, .cx-open-card .cx-hi-hint')) { const b = el.getBoundingClientRect(); if (b.width < 30 || b.height < 12) continue; cards.push([b.left - hr.left - 10, b.top - hr.top - 10, b.right - hr.left + 10, b.bottom - hr.top + 10]); }
};
const live = () => !!(P && P.ready && active && cal.ok);
const count = (src) => { let n = 0; for (let i = 0; i < MB; i++) if (B[i] && B[i].src === src) n++; return n; };
const addBody = (slot, kind, src, x, y, z, extra) => { B[slot] = Object.assign({ kind, src, t0: T, x, y, z, px: 0, py: 0, vx: 0, vy: 0, vz: 0, pt: T, has: false, seen: false, q: [0, 0, 0, 1], sun: false, wk: 0, seed: rnd() * 100, lsp: -9, yaw: rnd() * 6.28, ttl: kind === 'stone' ? 14 : PET.life, bounces: 0, gone: false }, extra || {}); return B[slot]; };
const spawnPetal = (x, y, z, o) => {
o = o || {}; const seed = rnd() * 100; if (liveCount() >= bodyCap()) return -1;
const slot = P.take('petal', { x, y, z, yaw: rnd() * 6.28, tilt: 0.25 + rnd() * 0.5, vx: o.vx || 0, vy: o.vy || -0.2, vz: o.vz || 0, sx: (rnd() - 0.5) * 3, sy: (rnd() - 0.5) * 4, sz: (rnd() - 0.5) * 3, seed, ttl: o.ttl || PET.life });
if (slot < 0) return -1; addBody(slot, 'petal', o.src || 'tap', x, y, z, { seed, marigold: !!o.marigold, ttl: o.ttl || PET.life }); return slot;
};
const spawnStone = (x, z, vx, vz) => {
if (liveCount() >= bodyCap()) return -1;
const slot = P.take('stone', { x, y: 0.28, z, vx, vy: 0.9, vz, sx: 0, sy: 6, sz: 0, seed: rnd() * 100 }); if (slot < 0) return -1;
addBody(slot, 'stone', 'stone', x, 0.28, z, { ttl: 14, spin: 5 + rnd() * 4 }); stoneAt = T; return slot;
};
const removeBody = (slot) => { const b = B[slot]; if (b && !b.gone) { b.gone = true; P.remove(slot); } };
const fan = (x, z, dx, dz, spd, n) => {
for (let k = 0; k < n && nDrop < DM; k++) {
const j = nDrop++ * 8, a = (rnd() - 0.5) * 1.5, c = Math.cos(a), s = Math.sin(a), f = 0.15 + rnd() * 0.28;
drop[j] = x + (rnd() - 0.5) * 0.06; drop[j + 1] = 0.02; drop[j + 2] = z + (rnd() - 0.5) * 0.06;
drop[j + 3] = (dx * c - dz * s) * spd * f + (rnd() - 0.5) * 0.5; drop[j + 4] = 0.9 + rnd() * 1.5; drop[j + 5] = (dx * s + dz * c) * spd * f + (rnd() - 0.5) * 0.5; drop[j + 6] = 0.55 + rnd() * 0.3; drop[j + 7] = 0.011 + rnd() * 0.008;
}
};
const stepDrops = (dt) => {
for (let i = 0; i < nDrop;) {
const j = i * 8; drop[j + 4] -= 9.81 * dt; drop[j] += drop[j + 3] * dt; drop[j + 1] += drop[j + 4] * dt; drop[j + 2] += drop[j + 5] * dt; drop[j + 6] -= dt;
if (drop[j + 6] <= 0 || drop[j + 1] < 0) { nDrop--; if (i < nDrop) drop.copyWithin(j, nDrop * 8, nDrop * 8 + 8); continue; } i++;
}
};
const ring = (x, z, amp, rad) => { toScreen(x, 0, z, sp); L.disturb(sp[0], sp[1], amp, rad * 2 * cal.f / z); };
const onSplash = (e) => {
const b = B[e.slot]; if (!b || !cal.ok) return;
if (b.kind === 'petal' && (T - b.lsp < 1.2 || e.impulse < 0.006)) return; b.lsp = T; cnt.splash++;   // (a petal riding the ripples does not splash again and again)
const stone = b.kind === 'stone', amp = clamp(0.012 + RC.splashK * e.impulse, 0.01, stone ? 0.07 : 0.05);
ring(e.x, e.z, amp, stone ? 0.2 : 0.13);
if (stone) { cnt.skip += e.skip ? 1 : 0; const h = Math.hypot(b.vx, b.vz) || 1; fan(e.x, e.z, b.vx / h, b.vz / h, h, e.skip ? 9 : 12); }
else if (e.impulse > 0.04) fan(e.x, e.z, 0, 1, 1.4, 3);
};
const onGlint = (e) => {
const b = B[e.slot]; if (!b || !cal.ok || !can('sunTrigger')) return; cnt.glint++;
toScreen(b.x, 0, b.z, sp); const c = L.cover;
pulses.push({ u: (sp[0] - c[0]) / c[2], v: (sp[1] - c[1]) / c[3], r: clamp(0.8 * cal.f / Math.max(b.z, 2) / c[3], 0.03, 0.2), t: 0 }); if (pulses.length > 2) pulses.shift();
};
const onSink = (e) => { const b = B[e.slot]; if (!b || !cal.ok) return; cnt.sink++; if (b.kind === 'stone') { ring(e.x, e.z, 0.04, 0.2); const h = Math.hypot(b.vx, b.vz) || 1; fan(e.x, e.z, b.vx / h, b.vz / h, 1.5, 5); } };
const onGone = (e) => { cnt.gone++; B[e.slot] = null; };
let offs = [];
const hook = () => { if (offs.length || !P) return; offs = [P.on('splash', onSplash), P.on('glint', onGlint), P.on('sink', onSink), P.on('gone', onGone), P.on('fail', () => setTimeout(() => stop('physics failed'), 0)), P.on('off', () => setTimeout(() => stop('physics off'), 0))]; };
const unhook = () => { for (const f of offs) { try { f(); } catch (e) {} } offs = []; };
const readPose = () => {
const pose = P.pose; if (!pose) return;
for (let i = 0; i < MB; i++) {
const b = B[i]; if (!b) continue; const j = i * 8;
if (pose[j + 7] <= 0) { if (T - b.t0 > 2.5 && !b.seen) { B[i] = null; } continue; }
const x = pose[j], y = pose[j + 1], z = pose[j + 2];
if (b.has && (x !== b.x || y !== b.y || z !== b.z)) { const dt = Math.max(T - b.pt, 1 / 120); b.vx = (x - b.x) / dt; b.vy = (y - b.y) / dt; b.vz = (z - b.z) / dt; b.pt = T; }
b.x = x; b.y = y; b.z = z; b.q[0] = pose[j + 3]; b.q[1] = pose[j + 4]; b.q[2] = pose[j + 5]; b.q[3] = pose[j + 6]; b.sun = (pose[j + 7] & 4) > 0; b.has = true; b.seen = true;
toScreen(x, 0, z, sp); b.px = sp[0]; b.py = sp[1];
}
};
const fillEnv = (buf) => {
const k = RC.waveMetres, f = cal.f, eye = cal.eye;
for (let i = 0; i < MB; i++) {
const b = B[i]; if (!b || !b.has) continue; const e = i * 5, z = b.z, ppm = f / z;
buf[e] = L.hAt(b.px, b.py) * k; L.slope(b.px, b.py, o2); buf[e + 1] = o2[0] * k * ppm; buf[e + 2] = -o2[1] * k * f * eye / (z * z);
G.windAt(b.px, b.py, wp); buf[e + 3] = wp[0] / ppm * RC.windGain; buf[e + 4] = -wp[1] * z * z / (f * eye) * RC.windGain;
}
};
const guard = (x, y, e) => !(e && e.target && e.target.closest && e.target.closest('a,button,input,select,textarea,summary,label,[role]')) && L.inWater(x, y) && !overCard(x, y);
const tapHook = (x, y, e) => {
if (!live() || (!can('petalOffering') && !can('skipStone')) || !e.isPrimary || (e.button != null && e.button > 0) || !guard(x, y, e)) return false;
downS = { id: e.pointerId, type: e.pointerType || 'mouse', x, y, t: now(), hist: [{ x, y, t: now() }] }; return true;
};
const onMove = (e) => {
if (!downS || e.pointerId !== downS.id) return; L.toLocal(e.clientX, e.clientY, o2); const t = now(), h = downS.hist; h.push({ x: o2[0], y: o2[1], t }); while (h.length > 2 && t - h[0].t > 220) h.shift(); if (h.length > 12) h.shift();
};
const onUp = (e) => {
if (!downS || e.pointerId !== downS.id) return; const s = downS; downS = null; if (e.type === 'pointercancel' || !live()) return;
L.toLocal(e.clientX, e.clientY, o2); finish(s, o2[0], o2[1], now());
};
const finish = (s, x, y, t) => {
const dist = Math.hypot(x - s.x, y - s.y), h = s.hist; let i0 = h.length - 1; while (i0 > 0 && t - h[i0 - 1].t <= RC.flickMaxMs) i0--;
const a = h[Math.max(0, i0)], dt = Math.max(8, t - a.t) / 1000, vx = (x - a.x) / dt, vy = (y - a.y) / dt, spd = Math.hypot(vx, vy);
if (s.type !== 'touch' && can('skipStone') && spd > RC.flickMinPxS && dist > 24) return throwStone(x, y, vx, vy);
if (dist < 12 && t - s.t < 600 && can('petalOffering')) return offer(x, y);
if (dist < 12 && t - s.t < 600) L.disturb(x, y, 0.09, 3 * L.sx);   // (petals switched off: the ordinary ring)
};
const offer = (px, py) => {
if (!L.inWater(px, py)) return false;
const w = [0, 0]; toWorld(px, py, w); const y0 = clamp(110 * w[1] / cal.f, 0.35, 1.3);
if (count('tap') >= RC.maxTapPetals) { let old = -1, ot = 1e9; for (let i = 0; i < MB; i++) { const b = B[i]; if (b && b.src === 'tap' && !b.gone && b.t0 < ot) { ot = b.t0; old = i; } } if (old >= 0) removeBody(old); }
const s = spawnPetal(w[0] + (rnd() - 0.5) * 0.05, y0, w[1], { src: 'tap', vx: (rnd() - 0.5) * 0.2 });
if (s < 0) { L.disturb(px, py, 0.09, 3 * L.sx); cnt.fallback++; return false; }   // (the world is full: the ordinary ring, so a tap is never silent)
cnt.tap++; return true;
};
const throwStone = (px, py, vx, vy) => {
if (T - stoneAt < RC.stoneEveryS || count('stone') > 0 || !L.inWater(px, py)) return false;
const w = [0, 0]; toWorld(px, py, w); const z = w[1];
let hx = vx * z / cal.f, hz = -vy * z * z / (cal.f * cal.eye); hz = Math.max(hz, Math.abs(hx) * 0.2 + 0.4);   // (always away from the viewer, never toward the shore)
const m = Math.hypot(hx, hz) || 1, s = clamp(m, 5, 8.5) / m; hx *= s; hz *= s;
cnt.flick++; return spawnStone(w[0], z, hx, hz) >= 0;
};
const skyPetal = () => {
if (!can('skyPetals') || count('sky') >= RC.maxSkyPetals || (bodyCap() - liveCount()) < 6) return;
const yb = Math.min(Hh, L.cover[1] + L.cover[3] * L.box[3]) - 24, y0 = cal.wl + (yb - cal.wl) * 0.1, out = [0, 0, 0, 0], w = [0, 0];
if (G.wind && G.wind.takePetal && G.wind.takePetal(out, y0, yb)) {
const yh = 0.4 + rnd() * 0.5, z = clamp(cal.f * (cal.eye - yh) / Math.max(out[1] - cal.wl, 4), BND.zNear + 0.5, 18), x = (out[0] - cal.cx) * z / cal.f;
if (spawnPetal(x, yh, z, { src: 'sky', marigold: true, vx: out[2] * z / cal.f, vy: -0.25, ttl: 30 }) >= 0) cnt.sky++; return;
}
const z = 6 + rnd() * 12, x = (rnd() - 0.45) * (W * 0.8) * z / cal.f; G.windAt(cal.cx, cal.wl + cal.f * cal.eye / z, wp);
if (spawnPetal(x, 1.1, z, { src: 'sky', marigold: true, vx: wp[0] * z / cal.f, vy: -0.2, ttl: 30 }) >= 0) cnt.sky++;
};
const bodyCap = () => { const U = G.U; return U && U.on ? Math.min(P.maxBodies, U.f.bodies) : P.maxBodies; };   // (the governor lowers Ultra's allowance from 24 to 12 before it turns the physics off)
const liveCount = () => { let n = 0; for (let i = 0; i < MB; i++) if (B[i]) n++; return n; };
const makeMesh = (gl, e) => {
const NU = 7, NS = 13, pv = [], pi = [];
for (let j = 0; j < NS; j++) for (let i = 0; i < NU; i++) pv.push(i / (NU - 1) * 2 - 1, j / (NS - 1) * 2 - 1);
for (let j = 0; j < NS - 1; j++) for (let i = 0; i < NU - 1; i++) { const a = j * NU + i, b = a + 1, c = a + NU, d2 = c + 1; pi.push(a, b, c, b, d2, c); }
const LA = 9, LO = 14, sv = [], si = [];
for (let a = 0; a <= LA; a++) { const th = a / LA * Math.PI; for (let b = 0; b <= LO; b++) { const ph = b / LO * 6.2831853; sv.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); } }
for (let a = 0; a < LA; a++) for (let b = 0; b < LO; b++) { const p0 = a * (LO + 1) + b, p1 = p0 + 1, p2 = p0 + LO + 1, p3 = p2 + 1; si.push(p0, p2, p1, p1, p2, p3); }
const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const mk = (target, data, usage) => { const b = e.buf(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage || gl.STATIC_DRAW); return b; };
bufs = { pm: mk(gl.ARRAY_BUFFER, new Float32Array(pv)), pi: null, sm: mk(gl.ARRAY_BUFFER, new Float32Array(sv)), si: null, q: mk(gl.ARRAY_BUFFER, quad), ip: mk(gl.ARRAY_BUFFER, instP.byteLength, gl.DYNAMIC_DRAW), is: mk(gl.ARRAY_BUFFER, instS.byteLength, gl.DYNAMIC_DRAW), id: mk(gl.ARRAY_BUFFER, dinst.byteLength, gl.DYNAMIC_DRAW) };
nIdxP = pi.length; nIdxS = si.length;
const inst = (buf, loc0) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(loc0 + k); gl.vertexAttribPointer(loc0 + k, 4, gl.FLOAT, false, 48, k * 16); gl.vertexAttribDivisor(loc0 + k, 1); } };
vaos = {};
vaos.p = e.vao(); gl.bindVertexArray(vaos.p); gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pm); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); inst(bufs.ip, 1);
bufs.pi = e.buf(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.pi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(pi), gl.STATIC_DRAW);
vaos.s = e.vao(); gl.bindVertexArray(vaos.s); gl.bindBuffer(gl.ARRAY_BUFFER, bufs.sm); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); inst(bufs.is, 1);
bufs.si = e.buf(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.si); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(si), gl.STATIC_DRAW);
vaos.hp = e.vao(); gl.bindVertexArray(vaos.hp); gl.bindBuffer(gl.ARRAY_BUFFER, bufs.q); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); inst(bufs.ip, 1);
vaos.hs = e.vao(); gl.bindVertexArray(vaos.hs); gl.bindBuffer(gl.ARRAY_BUFFER, bufs.q); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); inst(bufs.is, 1);
vaos.d = e.vao(); gl.bindVertexArray(vaos.d); gl.bindBuffer(gl.ARRAY_BUFFER, bufs.q); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ARRAY_BUFFER, bufs.id); for (let k = 0; k < 2; k++) { gl.enableVertexAttribArray(1 + k); gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, 32, k * 16); gl.vertexAttribDivisor(1 + k, 1); }
gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};
const alphaOf = (b) => {
const age = T - b.t0; let a = sstep(0, 0.45, age) * sstep(0, 2.2, b.ttl - age) * L.fade;
if (overCard(b.px, b.py)) a *= 0.55;
return a;
};
const stoneQ = (b, dt) => {
b.yaw += dt * (b.spin || 5); const hs = Math.hypot(b.vx, b.vz), t = clamp(b.vy * 0.1, -0.3, 0.3) * 0.5, sy = Math.sin(b.yaw / 2), cy = Math.cos(b.yaw / 2);
const ax = hs > 0.1 ? b.vz / hs : 0, az = hs > 0.1 ? -b.vx / hs : 0, st = Math.sin(t), ct = Math.cos(t), qx = ax * st, qz = az * st, qw = ct;
return [cy * qx - sy * qz, qw * sy, cy * qz + sy * qx, qw * cy];
};
const fx = {
name: 'rigid', order: 20,
wants: () => !!(P && P.ready) && !kills().has('physx') && (can('petalOffering') || can('skipStone') || can('skyPetals') || can('paddle')),
init(gl, e) {
env = e; P = G.physics; if (progs) return;
tex1 = e.tex(); gl.bindTexture(gl.TEXTURE_2D, tex1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([210, 176, 140, 255]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.bindTexture(gl.TEXTURE_2D, null);
progs = { petal: e.prog(PETAL_VS, PETAL_FS), stone: e.prog(STONE_VS, STONE_FS), shadow: e.prog(SHADOW_VS, SHADOW_FS), drop: e.prog(DROP_VS, DROP_FS) };
makeMesh(gl, e);
},
resize(w, h) { W = w; Hh = h; readCards(); },
enter() {
host = env.host; active = true; hook(); T = 0; skyAt = 3 + rnd() * 3; L.tapHook = tapHook; calib(); readCards();
if (!ac) { ac = new AbortController(); const o = { signal: ac.signal, passive: true }; window.addEventListener('pointermove', onMove, o); window.addEventListener('pointerup', onUp, o); window.addEventListener('pointercancel', onUp, o);
const nd = (e) => { if (downS && downS.type !== 'touch') e.preventDefault(); }; window.addEventListener('dragstart', nd, { signal: ac.signal }); window.addEventListener('selectstart', nd, { signal: ac.signal }); }
if (!cardT) cardT = setInterval(readCards, 900);
R.dataset.fxRigid = 'live';
},
leave() { shut(); },
refresh() { readCards(); },
update(dt, inp) {
if (!active || !P || !P.ready) return;
tier = env.tier; if (tier !== 'rich') { stop('tier ' + tier); return; }
if (!calib()) return;
T += dt; wakeBudget = Math.min(3, wakeBudget + dt * 3);
readPose(); stepDrops(dt);
for (let p = pulses.length - 1; p >= 0; p--) { pulses[p].t += dt; if (pulses[p].t > RC.glintSeconds) pulses.splice(p, 1); }
const g4 = L.gl4; g4.fill(0); for (let p = 0; p < pulses.length; p++) { const u = pulses[p], s = u.t / RC.glintSeconds, k = sstep(0, 0.3, s) * (1 - sstep(0.3, 1, s)); g4[p * 4] = u.u; g4[p * 4 + 1] = u.v; g4[p * 4 + 2] = u.r; g4[p * 4 + 3] = RC.glintLift * k; }
for (let i = 0; i < MB; i++) {
const b = B[i]; if (!b || !b.has || b.gone) continue;
if (b.px < -70 || b.px > W + 70 || b.py > Hh + 70) { removeBody(i); cnt.offscreen++; continue; }
const spd = Math.hypot(b.vx, b.vz);
if (b.kind === 'petal' && b.y < 0.03 && spd > 0.12 && T - b.wk > 0.4 && wakeBudget >= 1) { b.wk = T; wakeBudget--; L.disturb(b.px, b.py, 0.004, 0.2 * cal.f / b.z); }
else if (b.kind === 'stone' && b.y < 0.07 && b.y > -0.1 && spd > 3 && T - b.wk > 0.09) { b.wk = T; L.disturb(b.px, b.py, 0.011, 0.22 * cal.f / b.z); }
}
if (T > skyAt) { skyAt = T + RC.skyEveryS[0] + rnd() * (RC.skyEveryS[1] - RC.skyEveryS[0]); skyPetal(); }
let want = null;
if (can('paddle') && inp && inp.on && L.inWater(inp.x, inp.y)) { const w = [0, 0]; toWorld(inp.x, inp.y, w); want = w; }
if (want) {
if (!paddleSent) { paddleSent = [want[0], want[1]]; P.cmd({ op: 'paddle', on: true, x: want[0], z: want[1] }); }
else { const dx = want[0] - paddleSent[0], dz = want[1] - paddleSent[1], dd = Math.hypot(dx, dz), st = Math.min(dd, 2.5 * dt); if (dd > 0.002) { paddleSent[0] += dx / dd * st; paddleSent[1] += dz / dd * st; P.cmd({ op: 'paddle', on: true, x: paddleSent[0], z: paddleSent[1] }); } }
}
else if (paddleSent) { P.cmd({ op: 'paddle', on: false, x: 0, z: 0 }); paddleSent = null; }
P.step(dt, fillEnv);
},
draw(gl, e) {
if (!active || !progs || !progs.petal.ok || !progs.stone.ok || !progs.shadow.ok || !progs.drop.ok || !cal.ok || !L.fade) return;
nP = nS = 0; const dtf = 1 / 60;
for (let i = 0; i < MB; i++) { const b = B[i]; if (!b || !b.has || b.gone) continue; if (b.kind === 'stone') ordS[nS++] = i; else ordP[nP++] = i; }
const sortBy = (ord, n) => { for (let a = 1; a < n; a++) { const v = ord[a], z = B[v].z; let k = a - 1; while (k >= 0 && B[ord[k]].z < z) { ord[k + 1] = ord[k]; k--; } ord[k + 1] = v; } };
sortBy(ordP, nP); sortBy(ordS, nS);
for (let n = 0; n < nP; n++) { const b = B[ordP[n]], o = n * 12, q = b.q; instP[o] = b.x; instP[o + 1] = b.y; instP[o + 2] = b.z; instP[o + 3] = b.marigold ? 1 : 0; instP[o + 4] = q[0]; instP[o + 5] = q[1]; instP[o + 6] = q[2]; instP[o + 7] = q[3]; instP[o + 8] = alphaOf(b); instP[o + 9] = b.seed; instP[o + 10] = (b.marigold ? 1.0 : 2.1) * (1 + 0.07 * Math.max(b.z - 3.5, 0)); instP[o + 11] = b.sun ? 1 : 0; }
for (let n = 0; n < nS; n++) { const b = B[ordS[n]], o = n * 12, q = stoneQ(b, dtf); instS[o] = b.x; instS[o + 1] = b.y; instS[o + 2] = b.z; instS[o + 3] = 2; instS[o + 4] = q[0]; instS[o + 5] = q[1]; instS[o + 6] = q[2]; instS[o + 7] = q[3]; instS[o + 8] = alphaOf(b); instS[o + 9] = b.seed; instS[o + 10] = 1.6 * (1 + 0.07 * Math.max(b.z - 3.5, 0)); instS[o + 11] = sstep(-0.34, -0.06, b.y); }
for (let n = 0; n < nDrop; n++) { const j = n * 8; dinst[j] = drop[j]; dinst[j + 1] = drop[j + 1]; dinst[j + 2] = drop[j + 2]; dinst[j + 3] = drop[j + 7]; dinst[j + 4] = clamp(drop[j + 6] * 1.6, 0, 1) * 0.7 * L.fade; dinst[j + 5] = dinst[j + 6] = dinst[j + 7] = 0; }
nDrawn = nP + nS; if (!nDrawn && !nDrop) return;
const f = cal.f, tex = (L.tex && L.tex()) || null, c = L.cover;
gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
const setCam = (Pg) => { gl.uniform2f(Pg.loc('uRes'), W, Hh); gl.uniform4f(Pg.loc('uCam'), f, cal.cx, cal.wl, cal.eye); };
const lit = (Pg) => {
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex || tex1); gl.uniform1i(Pg.loc('uTex'), 0); gl.uniform4fv(Pg.loc('uCover'), c); gl.uniform1f(Pg.loc('uHas'), tex ? 1 : 0); gl.uniform1f(Pg.loc('uWL'), L.wl);
const t = L.tint || [1, 0.74, 0.46], s = L.sun || [0.5, 0.45], fl = RC.focal; let lx = (s[0] - 0.5) * L.asp / fl, ly = (L.wl - s[1]) / fl, lz = 1; const m = Math.hypot(lx, ly, lz); gl.uniform3f(Pg.loc('uTint'), t[0], t[1], t[2]); gl.uniform3f(Pg.loc('uL'), lx / m, ly / m, lz / m);
};
drawCalls = 0;
gl.bindBuffer(gl.ARRAY_BUFFER, bufs.ip); if (nP) gl.bufferSubData(gl.ARRAY_BUFFER, 0, instP, 0, nP * 12);
gl.bindBuffer(gl.ARRAY_BUFFER, bufs.is); if (nS) gl.bufferSubData(gl.ARRAY_BUFFER, 0, instS, 0, nS * 12);
gl.bindBuffer(gl.ARRAY_BUFFER, bufs.id); if (nDrop) gl.bufferSubData(gl.ARRAY_BUFFER, 0, dinst, 0, nDrop * 8);
const Sh = progs.shadow; gl.useProgram(Sh.p); setCam(Sh);
if (nP) { gl.bindVertexArray(vaos.hp); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nP); drawCalls++; }
if (nS) { gl.bindVertexArray(vaos.hs); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nS); drawCalls++; }
for (let pass = 1; pass >= 0; pass--) {
if (nP) { const Pg = progs.petal; gl.useProgram(Pg.p); setCam(Pg); lit(Pg); gl.uniform2f(Pg.loc('uSize'), PET.hx, PET.hz); gl.uniform1f(Pg.loc('uT'), e.t); gl.uniform1f(Pg.loc('uMirror'), pass); gl.bindVertexArray(vaos.p); gl.drawElementsInstanced(gl.TRIANGLES, nIdxP, gl.UNSIGNED_SHORT, 0, nP); drawCalls++; }
if (nS) { const Pg = progs.stone; gl.useProgram(Pg.p); setCam(Pg); lit(Pg); gl.uniform1f(Pg.loc('uR'), STONE_R); gl.uniform1f(Pg.loc('uT'), e.t); gl.uniform1f(Pg.loc('uMirror'), pass); gl.bindVertexArray(vaos.s); gl.drawElementsInstanced(gl.TRIANGLES, nIdxS, gl.UNSIGNED_SHORT, 0, nS); drawCalls++; }
}
if (nDrop) { const Pg = progs.drop; gl.useProgram(Pg.p); setCam(Pg); gl.bindVertexArray(vaos.d); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nDrop); drawCalls++; }
gl.bindVertexArray(null); gl.activeTexture(gl.TEXTURE0);
},
stats() { return { bodies: liveCount(), drawn: nDrawn, draws: drawCalls, droplets: nDrop, pulses: pulses.length, counters: Object.assign({}, cnt) }; },
dispose() { shut(); progs = null; vaos = bufs = tex1 = null; env = null; },
};
const shut = () => {
const was = active; active = false;
if (L.tapHook === tapHook) L.tapHook = null; if (ac) { ac.abort(); ac = null; } if (cardT) { clearInterval(cardT); cardT = 0; }
if (L.gl4) L.gl4.fill(0); pulses.length = 0; nDrop = 0; nP = nS = 0; downS = null; cards = [];
if (was && P && P.ready) { if (paddleSent) P.cmd({ op: 'paddle', on: false, x: 0, z: 0 }); for (let i = 0; i < MB; i++) if (B[i] && !B[i].gone) removeBody(i); }
paddleSent = null; for (let i = 0; i < MB; i++) B[i] = null;
if (R.dataset.fxRigid) R.dataset.fxRigid = 'off';
};
const stop = (why) => { if (G.detach) G.detach('rigid'); shut(); unhook(); if (/tier/.test(why) && P && P.dispose) P.dispose(); if (DBG) { try { console.debug('[fx] rigid stopped:', why); } catch (e) {} } };
G.register(fx);
G.rigid = { get active() { return active; }, get bodies() { return liveCount(); },
spots(out) { let n = 0; for (let i = 0; i < MB && n < 6; i++) { const b = B[i]; if (b && b.kind === 'petal' && !b.gone && isFinite(b.px)) { out[n * 2] = b.px; out[n * 2 + 1] = b.py; n++; } } return n; } };
let tries = 0;
const join = () => {
if (retry) { clearTimeout(retry); retry = 0; }
if (!G.physics) return; P = G.physics; if (kills().has('physx')) { try { P.dispose(); } catch (e) {} return; }
if (!P.ready || active) return;
hook(); if (attaching < now() && G.attach && G.attach('rigid')) attaching = now() + 4000;
if (++tries < 60) retry = setTimeout(join, 800);
};
if (G.physics) { G.physics.on('ready', () => { tries = 0; hook(); join(); }); G.physics.on('fail', () => { if (retry) { clearTimeout(retry); retry = 0; } }); join(); }
if (DBG) {
G.debug = G.debug || {};
G.debug.rigid = {
state: () => ({ active, cal: Object.assign({}, cal), tier, bodies: B.map((b, i) => b && { slot: i, kind: b.kind, src: b.src, x: +b.x.toFixed(3), y: +b.y.toFixed(4), z: +b.z.toFixed(3), px: Math.round(b.px), py: Math.round(b.py), age: +(T - b.t0).toFixed(1), has: b.has, vx: +b.vx.toFixed(2), vz: +b.vz.toFixed(2), bounces: b.bounces, q: b.q.map((v) => +v.toFixed(3)) }).filter(Boolean), counters: Object.assign({}, cnt), pulses: pulses.length, gl4: L.gl4 && Array.from(L.gl4) }),
tap: (px, py) => offer(px, py), flick: (x0, y0, x1, y1, ms) => throwStone(x1, y1, (x1 - x0) / (ms / 1000), (y1 - y0) / (ms / 1000)),
petalAt: (x, y, z, o) => spawnPetal(x, y, z, o), stoneAt: (x, z, vx, vz) => spawnStone(x, z, vx, vz), toScreen: (x, y, z) => { toScreen(x, y, z, sp); return [sp[0], sp[1]]; }, toWorld: (px, py) => { const w = [0, 0]; toWorld(px, py, w); return w; },
kill: (n, v) => { if (v === false) kills().delete(n); else kills().add(n); }, cfg: () => ({ RC, IC, BND }), fill: () => ({ nP, nS, nDrop }),
};
}
})();
