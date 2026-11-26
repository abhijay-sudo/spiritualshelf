(() => {
const G = window.SpiritualGPU; if (!G) return;
const d = document, R = d.documentElement;
const DBG = /[?&]fxdebug=1/.test(location.search);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), mix = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2, MAXB = 24, FL = 6, STRIDE = 12;
const CAP = { rich: 20, balanced: 8 };
const capNow = () => (env && env.U ? env.U.f.birds : CAP[tierName] || 8);   // Ultra: up to 24, and fewer as the governor steps down
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 a;   // x, y (host px), half span (px), tilt (rad)
layout(location=1) in vec4 b;   // wing phase, flap amount 0..1 (0 = gliding), bank (rad), alpha
layout(location=2) in vec4 c;   // far 0..1, direction (+1 right, -1 left), seed, 0
uniform vec2 uRes;
uniform vec4 uCover;
uniform sampler2D uTex;
uniform float uHas, uMir, uT;   // uMir: 0, or the horizon's y (host px) when the flock is drawn again as its reflection in the lake (Ultra)
flat out vec4 vCol;
out vec3 vv;
out float vSoft;
const int TW[6] = int[6](0, 1, 2, 1, 3, 2);
const int TB[6] = int[6](0, 1, 2, 0, 2, 3);
vec2 dir2(float t){ return vec2(cos(t), sin(t)); }
void main(){
float span = a.z, far = c.x, dirn = c.y, seed = c.z, ph = b.x, amp = b.y, bank = b.z;
int vid = gl_VertexID;
float s1 = sin(ph), s2 = sin(ph - 0.62);
float ta = 0.26 + amp * 0.52 * s1;
float th = -0.08 + amp * 0.72 * s2;
float tc = th - 0.20 - 0.10 * amp * cos(ph - 0.62);   // the tip feathers bend away from the air
float roll = bank * 0.46, sp = cos(bank * 0.8);
vSoft = amp * abs(cos(ph - 0.62)) * 0.6;
vec2 lp; vec3 ev;
if (vid < 36) {
int wing = vid / 18, r = vid - wing * 18, q = r / 6, t = r - q * 6;
int corner = TW[t]; int lead = 1 - (corner & 1); int k = q + (corner >> 1);
float sd = wing == 0 ? -1.0 : 1.0;
float fwd = sd * dirn > 0.0 ? 0.80 : 1.0;           // seen a little from the side: the wing toward us is foreshortened
float L1 = 0.46 * span * fwd * sp, L2 = 0.54 * span * fwd * sp;
vec2 S = vec2(sd * 0.05 * span, 0.0);
vec2 E = S + vec2(sd * cos(ta), sin(ta)) * L1;
vec2 H = E + vec2(sd * cos(th), sin(th)) * L2 * 0.56;
vec2 T = H + vec2(sd * cos(tc), sin(tc)) * L2 * 0.44;
vec2 P0 = k == 0 ? S : k == 1 ? E : k == 2 ? H : T;
vec2 pa = k == 0 ? S : k == 1 ? S : k == 2 ? E : H;
vec2 pb = k == 0 ? E : k == 1 ? H : k == 2 ? T : T;
vec2 tg = normalize(pb - pa + vec2(1e-4)); vec2 nr = vec2(-tg.y, tg.x) * sd;   // up (for the right wing) is the leading edge
float wd = k == 0 ? 0.22 : k == 1 ? 0.19 : k == 2 ? 0.11 : 0.04;
float hw = max(wd * span * 0.5, 0.42) * (1.0 + 0.30 * vSoft);
lp = P0 + nr * hw * (lead == 1 ? 1.0 : -1.0);
ev = vec3(lead == 1 ? 1.0 : -1.0, 0.0, 0.0);
} else {
int t = TB[vid - 36];
vec2 u = t == 0 ? vec2(-1.0, 0.0) : t == 1 ? vec2(0.0, 1.0) : t == 2 ? vec2(1.0, 0.0) : vec2(0.0, -1.0);
lp = vec2(dirn * (u.x > 0.0 ? 0.20 * span : u.x < 0.0 ? -0.36 * span : 0.0), u.y * 0.075 * span);
ev = vec3(u, 1.0);
}
float rho = a.w + roll; float cr = cos(rho), sr = sin(rho);
vec2 q2 = vec2(lp.x * cr - lp.y * sr, lp.x * sr + lp.y * cr);
vec2 pos = a.xy + vec2(q2.x, -q2.y);
float refl = 1.0;
if (uMir > 0.0) {   // the same bird, upside down in the water, a little shorter, rippled sideways and fading with its depth in the lake
float dd = uMir - pos.y;
pos.y = uMir + dd * 0.86; pos.x += sin(dd * 0.05 + uT * 0.6 + seed * 6.0) * (1.0 + 1.8 * far) * 0.9;
refl = 0.30 * (1.0 - smoothstep(60.0, 520.0, dd));
}
gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
vv = ev;
vec3 plum = vec3(0.33, 0.21, 0.24) + (seed - 0.5) * vec3(0.04, 0.02, 0.03);
vec3 sky = vec3(0.80, 0.55, 0.52);
if (uHas > 0.5) sky = textureLod(uTex, clamp((a.xy - uCover.xy) / uCover.zw, 0.0, 1.0), 4.5).rgb;
vec3 skyD = sky * vec3(0.80, 0.70, 0.74);
vCol = vec4(mix(plum, skyD, 0.34 + 0.46 * far) * (uMir > 0.0 ? vec3(0.9, 0.95, 1.05) : vec3(1.0)), b.w * refl);
}`;
const FS = `#version 300 es
precision mediump float;
flat in vec4 vCol;
in vec3 vv;
in float vSoft;
out vec4 o;
void main(){
float m = vv.z < 0.5 ? 1.0 - abs(vv.x) : 1.0 - abs(vv.x) - abs(vv.y);
float cov = smoothstep(0.0, 1.0, clamp(m / (fwidth(m) * (1.7 + 1.6 * vSoft)), 0.0, 1.0));
cov *= 1.0 - 0.22 * vSoft;
float al = vCol.a * cov;
o = vec4(vCol.rgb * al, al);
}`;
let env = null, prog = null, vao = null, bI = null, W = 0, H = 0, tierName = 'rich', hostEl = null, I = null;
let t = 0, seed = 12345, on = false, introDone = 0, introAt = 0, tRects = 0, rects = [], rectsAt = -1e9, dirtyRects = true, laid = 0;
let nextMain = 0, nextSmall = 0, nextLarge = 0, firstDone = false, glideT = 0, ks = 1, topLim = 70, horizon = 450, spawned = 0, lastKind = '';
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();
const wv = [0, 0];
const mk = () => ({ on: 0, fl: 0, x: 0, y: 0, ox: 0, oy: 0, vx: 0, vy: 0, z: .5, span: 8, f: 2.5, ph: 0, amp: 1, gl: 0, gT: 1, bank: 0, hd: 0, hdp: 0, seed: 0, sx: 0, sy: 0, tilt: 0 });
const B = Array.from({ length: MAXB }, mk);
const F = Array.from({ length: FL }, () => ({ on: 0, dir: 1, x: 0, y: 0, vx: 0, lane: 0, A: 0, per: 40, ph: 0, t: 0, z: .5, speed: 30, age: 0, yw: 0, n: 0, fresh: 0 }));
const order = new Array(MAXB).fill(0);
const LB = G.birdsLife = { v: 1, max: MAXB, off: new Float32Array(MAXB * 4), pan: new Float32Array(MAXB), fade: new Float32Array(MAXB).fill(1), disabled: false, rectsVer: 0, live: 0,
read(out) { let n = 0; for (let i = 0; i < MAXB; i++) { const b = B[i]; if (!b.on) continue; const o = n * 8; out[o] = i; out[o + 1] = b.x; out[o + 2] = b.y; out[o + 3] = b.vx; out[o + 4] = b.vy; out[o + 5] = b.span; out[o + 6] = b.z; out[o + 7] = b.fl; n++; } return n; },
toHost(cx, cy, o) { const r = env && env.rect(); if (!r) return false; o[0] = cx - r.left; o[1] = cy - r.top; return true; },
host() { return env && env.rect(); }, size() { return [W, H]; }, rects: () => rects, horizon: () => horizon, topLim: () => topLim, ks: () => ks };
let kOn = 1;
const readRects = () => {
rectsAt = performance.now(); dirtyRects = false; if (!hostEl || !env) return;
const hr = env.rect(); if (!hr) return; const out = [];
for (const el of hostEl.querySelectorAll('.cx-welcome-k, .cx-wm-letters, .cx-wm-sub, .cx-open-line, .cx-open-sub, .cx-open-card :is(a, button, p), .cx-open-foot :is(a, button)')) {
const b = el.getBoundingClientRect(); if (b.width < 30 || b.height < 8) continue;
out.push([b.left - hr.left, b.top - hr.top, b.right - hr.left, b.bottom - hr.top]);
}
rects = out; LB.rectsVer++;
};
const layout = () => {
const L = G.lake; horizon = L && L.ready ? (L.cover[1] + L.wl * L.cover[3]) : H * 0.5;
ks = clamp(Math.sqrt(W * H) / 1100, 0.75, 1.25); topLim = Math.max(86, H * 0.1); laid = 1;
};
const lanes = (pad) => {
let iv = [[topLim, horizon - 10]];
for (const r of rects) {
if (r[2] - r[0] < W * 0.3) continue;
const lo = r[1] - pad, hi = r[3] + pad, nx = [];
for (const [a, b] of iv) { if (hi <= a || lo >= b) nx.push([a, b]); else { if (lo > a) nx.push([a, lo]); if (hi < b) nx.push([hi, b]); } }
iv = nx;
}
return iv.filter((v) => v[1] - v[0] > 26);
};
const spawn = (kind, o) => {
const cap = capNow(), up = env && env.U ? 1 : 0; let alive = 0; for (const b of B) alive += b.on;
let n = kind === 'main' ? (tierName === 'rich' ? 5 + (rnd() * 4 | 0) + up * 3 : 4 + (rnd() * 2 | 0)) : kind === 'large' ? 10 + (rnd() * 4 | 0) + up * 3 : 2 + (rnd() * 2 | 0) + up * 2;
if (tierName !== 'rich') n = Math.min(n, kind === 'small' ? 2 : 5);
n = Math.min(n, cap - alive, MAXB); if (n < 2) return false;
const fi = F.findIndex((f) => !f.on); if (fi < 0) return false;
const f = F[fi]; if (!laid) layout(); if (dirtyRects || performance.now() - rectsAt > 4000) readRects();
const z = kind === 'large' ? rr(.05, .22) : kind === 'small' ? rr(.12, .52) : rr(.45, .9);
const dir = o && o.dir ? o.dir : (kind === 'large' ? -1 : (rnd() < .28 ? -1 : 1));
const span0 = mix(4.6, 11.5, z) * ks, pad = span0 * 3.4 + 12;
const iv = lanes(pad); let lane, room;
if (iv.length) { let tot = 0; for (const v of iv) tot += v[1] - v[0]; let pick = rnd() * tot, v = iv[0]; for (const w of iv) { pick -= w[1] - w[0]; if (pick <= 0) { v = w; break; } } lane = rr(v[0] + 6, v[1] - 6); room = Math.max(4, (v[1] - v[0]) / 2 - 8); lane = clamp(lane, v[0] + room * .5 + 2, v[1] - room * .5 - 2); }
else { lane = topLim + 22; room = 14; }
let zz = z; if (lane > horizon - 80 && zz > .3) zz = rr(.1, .28);
const dur = kind === 'large' ? rr(72, 90) : kind === 'small' ? rr(52, 70) : rr(40, 56);
Object.assign(f, { on: 1, dir, lane, A: Math.min(room, rr(7, 18) * ks) * (rnd() < .5 ? 1 : -1), per: rr(34, 58), ph: rr(0, TAU), t: 0, z: zz, speed: (W + 300) / dur, age: 0, yw: 0, n, fresh: o && o.fresh ? 1 : 0 });
f.x = dir > 0 ? -90 : W + 90;
if (o && o.at != null) f.x = o.at * W;
f.y = lane;
const loose = kind !== 'main' && kind !== 'large' || n < 5;
let j = 0;
for (const b of B) {
if (b.on || j >= n) continue; j++;
const zi = clamp(zz + rr(-.07, .07), 0, 1), sp = mix(4.6, 11.5, zi) * ks;
let sx, sy;
if (loose) { sx = rr(-2.6, 1.2) * sp * 2 * dir; sy = rr(-1.5, 1.5) * sp * 1.4; }
else { const row = Math.ceil(j / 2), side = j % 2 ? 1 : -1; sx = -dir * (row * sp * 1.45 + rr(-.4, .4) * sp) + (j === 1 ? 0 : 0); sy = side * row * sp * .95 * (j === 1 ? 0 : 1) + rr(-.35, .35) * sp; if (j === 1) { sx = 0; sy = 0; } }
{ const bi = B.indexOf(b); LB.off.fill(0, bi * 4, bi * 4 + 4); LB.pan[bi] = 0; LB.fade[bi] = 1; }
Object.assign(b, { face: 0, ft: 0, on: 1, fl: fi + 1, z: zi, span: sp, f: mix(3.2, 2.1, zi) + rr(-.3, .3), ph: rr(0, TAU), amp: 1, gl: 0, gT: rr(1, 4), bank: 0, seed: rnd(), sx, sy, vx: 0, vy: 0 });
b.x = f.x + sx; b.y = f.y + sy; b.ox = b.x; b.oy = b.y; b.tilt = 0; b.hd = 0; b.hdp = 0;
b.vx = dir * f.speed * mix(.8, 1.1, zi); b.vy = 0;
}
spawned++; lastKind = kind; return true;
};
const stepFlock = (f, dt) => {
f.t += dt; f.age += dt;
const sp = f.speed * mix(.7, 1.15, f.z);
if (G.windAt) { G.windAt(clamp(f.x, 0, W), clamp(f.y, 0, H), wv); } else { wv[0] = 24; wv[1] = 0; }
f.yw += (clamp(wv[1] * .35, -10, 10) - f.yw) * Math.min(1, dt * .4);
f.vx = f.dir * sp + clamp(wv[0], -40, 60) * .18;
f.x += f.vx * dt;
f.y = f.lane + f.A * Math.sin(TAU * f.t / f.per + f.ph) + f.yw + 1.2 * Math.sin(f.t * .9 + f.ph);
if ((f.dir > 0 && f.x > W + 140) || (f.dir < 0 && f.x < -140)) { f.on = 0; for (const b of B) if (b.fl && F[b.fl - 1] === f) { b.on = 0; b.fl = 0; } }
};
const stepBirds = (dt) => {
for (const b of B) {
if (!b.on) continue; const f = F[b.fl - 1];
const lvx = f.vx, lvy = (f.A * Math.cos(TAU * f.t / f.per + f.ph) * TAU / f.per);
const wob = Math.sin(f.t * .35 + b.seed * 20);
const tx = f.x + b.sx * (1 + .1 * wob) , ty = f.y + b.sy * (1 + .12 * wob) - (1 - b.amp) * 0;
const zv = mix(.84, 1.12, b.z);
let ax = (tx - b.x) * 1.3, ay = (ty - b.y) * 1.3;
for (const o of B) {
if (o === b || !o.on || o.fl !== b.fl) continue; const dx = b.x - o.x, dy = b.y - o.y, rr2 = (b.span + o.span) * 1.5, d2 = dx * dx + dy * dy;
if (d2 < rr2 * rr2 && d2 > 1e-4) { const dd = Math.sqrt(d2), k = (1 - dd / rr2) * 26; ax += dx / dd * k; ay += dy / dd * k; }
}
let wx = 0, wy = 0; if (G.windAt) { G.windAt(clamp(b.x, 0, W), clamp(b.y, 0, H), wv); wx = wv[0] * .08; wy = wv[1] * .1; }
const tvx = lvx * zv + wx + ax, tvy = lvy + wy + ay;
b.vx += (tvx - b.vx) * Math.min(1, dt * 2.2); b.vy += (tvy - b.vy) * Math.min(1, dt * 2.2);
const sc = clamp(Math.hypot(b.vx, b.vy) / (f.speed * 2.2 + 30), 0, 1); if (sc >= 1) { const m = (f.speed * 2.2 + 30) / Math.hypot(b.vx, b.vy); b.vx *= m; b.vy *= m; }
b.ox = b.x; b.oy = b.y; b.x += b.vx * dt; b.y += b.vy * dt;
}
for (let it = 0; it < 2; it++) {
for (let i = 0; i < MAXB; i++) {
const a = B[i]; if (!a.on) continue; const f = F[a.fl - 1];
for (let j = i + 1; j < MAXB; j++) {
const c = B[j]; if (!c.on || c.fl !== a.fl) continue;
const dx = c.x - a.x, dy = c.y - a.y, dm = (a.span + c.span) * 0.95, d2 = dx * dx + dy * dy;
if (d2 < dm * dm && d2 > 1e-6) { const dd = Math.sqrt(d2), k = (dm - dd) / dd * .5; a.x -= dx * k; a.y -= dy * k; c.x += dx * k; c.y += dy * k; }
}
const lx = a.x - f.x, ly = a.y - f.y, rm = 14 * a.span + 40, dl = Math.hypot(lx, ly);
if (dl > rm) { a.x = f.x + lx / dl * rm; a.y = f.y + ly / dl * rm; }
}
}
const inv = 1 / dt;
for (const b of B) {
if (!b.on) continue; const f = F[b.fl - 1];
b.vx = (b.x - b.ox) * inv; b.vy = (b.y - b.oy) * inv;
const hd = Math.atan2(-b.vy, Math.max(12, Math.abs(b.vx))) * .9;
b.hd += (clamp(hd, -.42, .42) - b.hd) * Math.min(1, dt * 3.5);
const turn = (b.hd - b.hdp) / dt; b.hdp = b.hd;
const bt = clamp(turn * 7 * (f.dir > 0 ? 1 : -1) + .07 * Math.sin(t * .45 + b.seed * 30), -.55, .55);
b.bank += (bt - b.bank) * Math.min(1, dt * 2.2);
{ const tvx = b.vx + LB.off[B.indexOf(b) * 4 + 2]; if (!b.face) b.face = f.dir; if (Math.abs(tvx) > 28 && (tvx > 0 ? 1 : -1) !== b.face) { b.ft += dt; if (b.ft > .22) { b.face = tvx > 0 ? 1 : -1; b.ft = 0; } } else b.ft = 0; }   // [life] a pushed bird turns about only after a quarter second of flying the other way
b.gT -= dt; const alarm = LB.pan[B.indexOf(b)] || 0; if (alarm > 0.12) { b.gl = 0; if (b.gT < 0.6) b.gT = 0.6; }
if (b.gT <= 0) { if (b.gl) { b.gl = 0; b.gT = rr(1.8, 4.6); } else { b.gl = 1; b.gT = rr(.8, 2.1); } }
b.amp += ((b.gl ? 0 : 1) - b.amp) * (1 - Math.exp(-dt * 3.2));
b.ph += TAU * b.f * dt * (.35 + .65 * b.amp) * (1 + alarm * .75);
}
glideT -= dt;
if (glideT <= 0) { glideT = rr(5, 11); const k = rnd() < .5 ? 1 : 0; if (k) for (const b of B) if (b.on && !b.gl && rnd() < .7) { b.gT = rr(.05, 1.1); } }
};
const schedule = (dt) => {
if (!introDone || LB.disabled) return;
const ti = t - introAt;
if (!firstDone) {
if (ti < 0.4) return; firstDone = true;
spawn('main', { dir: 1, at: .1 + rnd() * .12, fresh: 1 }); nextMain = t + rr(38, 52); nextSmall = t + rr(12, 20); nextLarge = t + rr(70, 120);
return;
}
if (t > nextMain) { if (spawn('main')) nextMain = t + rr(36, 62); else nextMain = t + 6; }
if (t > nextSmall) { if (spawn('small')) nextSmall = t + rr(20, 34); else nextSmall = t + 5; }
if (t > nextLarge && tierName === 'rich') { if (spawn('large')) nextLarge = t + rr(150, 210); else nextLarge = t + 8; }
};
const clearAll = () => { for (const b of B) { b.on = 0; b.fl = 0; } for (const f of F) f.on = 0; };
const hide = (v) => { if (v) R.dataset.fxBirds = '1'; else delete R.dataset.fxBirds; };
const fx = {
name: 'birds', order: 35, wants: () => true,
init(gl, e) {
env = e; prog = e.prog(VS, FS); vao = e.vao(); bI = e.buf(); I = new Float32Array(MAXB * STRIDE);
gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, bI); gl.bufferData(gl.ARRAY_BUFFER, I.byteLength, gl.DYNAMIC_DRAW);
for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(k); gl.vertexAttribPointer(k, 4, gl.FLOAT, false, STRIDE * 4, k * 16); gl.vertexAttribDivisor(k, 1); }
gl.bindVertexArray(null);
},
resize(w, h, sc, tier) { W = w; H = h; tierName = tier; layout(); dirtyRects = true; const cap = capNow(); let n = 0; for (const b of B) { if (b.on) { n++; if (n > cap) { b.on = 0; b.fl = 0; } } } },
enter() { hostEl = env.host; t = t || 0; clearAll(); on = true; firstDone = false; introDone = 0; dirtyRects = true; layout(); if (!tRects) tRects = setInterval(() => { dirtyRects = true; }, 2500); },
leave() { on = false; hide(false); if (tRects) { clearInterval(tRects); tRects = 0; } clearAll(); hostEl = null; },
pause() { if (tRects) { clearInterval(tRects); tRects = 0; } },
resume() { dirtyRects = true; if (hostEl && !tRects) tRects = setInterval(() => { dirtyRects = true; }, 2500); },
refresh() { dirtyRects = true; laid = 0; },
update(dt) {
if (!on) return; t += dt;
kOn += ((LB.disabled ? 0 : 1) - kOn) * Math.min(1, dt * 3); if (LB.disabled && kOn < .02) { let any = 0; for (const b of B) any += b.on; if (any) clearAll(); }
if (!introDone) { if (!R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end')) { introDone = 1; introAt = t; } else return; }
if (dirtyRects && performance.now() - rectsAt > 1200) { readRects(); laid = 0; }
if (!laid) layout();
schedule(dt);
for (const f of F) if (f.on) stepFlock(f, dt);
stepBirds(dt);
},
draw(gl, e) {
if (!on || !prog || !prog.ok || !introDone) return;
let n = 0; for (let i = 0; i < MAXB; i++) if (B[i].on) order[n++] = i;
if (!n) { hide(!LB.disabled); return; }   // ([life] dropped by the governor: the plain CSS flock shows instead)
for (let i = 1; i < n; i++) { const v = order[i]; let j = i - 1; while (j >= 0 && B[order[j]].z > B[v].z) { order[j + 1] = order[j]; j--; } order[j + 1] = v; }   // far first
const k = e.intensity;
for (let q = 0; q < n; q++) {
const bi = order[q], b = B[bi], f = F[b.fl - 1], o = q * STRIDE, far = 1 - b.z, oi = bi * 4;
const ox = LB.off[oi], oy = LB.off[oi + 1], ovx = LB.off[oi + 2], ovy = LB.off[oi + 3], px = b.x + ox, py = b.y + oy;   // [life] where it is drawn: its place in the formation and how far it has been pushed
const edge = sstep(-30, 110, Math.min(px, W - px));
let kf = 1; for (let i = 0; i < rects.length; i++) { const r = rects[i]; const dx = Math.max(r[0] - px, 0, px - r[2]), dy = Math.max(r[1] - py, 0, py - r[3]); const dd = Math.hypot(dx, dy); if (dd < 34) kf = Math.min(kf, dd < 5 ? 0 : .16 + .84 * sstep(5, 34, dd)); }   // (never on the words: inside a line or a button it is not drawn at all)
const born = f.fresh ? sstep(0, 2.6, f.age) : 1;
const al = mix(.78, .52, far) * edge * kf * born * k * kOn * LB.fade[bi];
const push = clamp(Math.hypot(ovx, ovy) / 80, 0, 1), face = b.face || f.dir;
const hdT = clamp(Math.atan2(-(b.vy + ovy), Math.max(12, Math.abs(b.vx + ovx))) * .9, -.7, .7), tilt = b.hd + (hdT - b.hd) * push;
const bob = -b.amp * b.span * .07 * Math.sin(b.ph);
I[o] = px; I[o + 1] = py + bob; I[o + 2] = b.span; I[o + 3] = tilt;
I[o + 4] = b.ph; I[o + 5] = b.amp; I[o + 6] = clamp(b.bank + clamp(ovy / 220, -.4, .4) * face * push, -.7, .7); I[o + 7] = al;
I[o + 8] = far; I[o + 9] = face; I[o + 10] = b.seed; I[o + 11] = 0;
}
const L = G.lake, tex = L && L.tex && L.tex();
gl.useProgram(prog.p); gl.uniform2f(prog.loc('uRes'), W, H);
gl.uniform4f(prog.loc('uCover'), L ? L.cover[0] : 0, L ? L.cover[1] : 0, L ? L.cover[2] : W, L ? L.cover[3] : H);
gl.uniform1f(prog.loc('uHas'), tex ? 1 : 0);
if (tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(prog.loc('uTex'), 0); }
gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, bI); gl.bufferSubData(gl.ARRAY_BUFFER, 0, I, 0, n * STRIDE);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.uniform1f(prog.loc('uT'), t); gl.uniform1f(prog.loc('uMir'), 0);
gl.drawArraysInstanced(gl.TRIANGLES, 0, 42, n);
if (e.U && e.U.f.birdsRefl && L && L.ready && horizon > 0) { gl.uniform1f(prog.loc('uMir'), horizon); gl.drawArraysInstanced(gl.TRIANGLES, 0, 42, n); gl.uniform1f(prog.loc('uMir'), 0); }
gl.bindVertexArray(null);
hide(true);
},
stats() { let n = 0; for (const b of B) n += b.on; return { birds: n, flocks: F.filter((f) => f.on).length, spawned, lastKind, rects: rects.length, lanes: lanes(30).map((v) => v.map(Math.round)), t: +t.toFixed(1) }; },
dispose() { hide(false); if (tRects) { clearInterval(tRects); tRects = 0; } clearAll(); env = prog = vao = bI = I = null; hostEl = null; on = false; laid = 0; firstDone = false; introDone = 0; },
};
if (DBG) G.birds = { spawn: (k, o) => spawn(k || 'main', o), stats: () => fx.stats(), clear: clearAll };
G.register(fx);
})();
