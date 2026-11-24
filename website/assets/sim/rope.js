(() => {
const G = window.SpiritualGPU; if (!G) return;
const d = document, R = d.documentElement, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const GRAV = 900, DAMP = 0.985, SUB = 4;
const hash = (n) => { let h = Math.imul(n + 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const V3 = '#version 300 es\n';
const STRIP_VS = V3 + `layout(location=0) in vec3 p;
uniform vec2 res; uniform vec2 off;
out float side;
void main(){ vec2 q = p.xy + off; gl_Position = vec4(q.x / res.x * 2.0 - 1.0, 1.0 - q.y / res.y * 2.0, 0.0, 1.0); side = p.z; }`;
const STRIP_FS = V3 + `precision mediump float;
in float side; uniform vec4 col; out vec4 o;
void main(){ float a = 1.0 - smoothstep(0.55, 1.0, abs(side)); o = vec4(col.rgb * col.a * a, col.a * a); }`;
const BL_VS = V3 + `layout(location=0) in vec2 q; layout(location=1) in vec4 a; layout(location=2) in vec4 b;
uniform vec2 res; out vec2 uv; out vec4 vb;
void main(){
vec2 p = q * a.z; if (b.x > 0.5 && b.x < 1.5) p.x *= 1.9; if (b.x > 1.5) { p.x *= 0.78; p.y = p.y * 1.0 + a.z; }
float c = cos(a.w), s = sin(a.w); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
vec2 pos = a.xy + p; gl_Position = vec4(pos.x / res.x * 2.0 - 1.0, 1.0 - pos.y / res.y * 2.0, 0.0, 1.0); uv = q; vb = b; }`;
const BL_FS = V3 + `precision highp float;
in vec2 uv; in vec4 vb; uniform vec2 lit; uniform float ti; out vec4 o;
float h1(float n){ return fract(sin(n * 91.3458) * 47453.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = h1(i.x + i.y * 57.0), b = h1(i.x + 1.0 + i.y * 57.0), c = h1(i.x + (i.y + 1.0) * 57.0), d = h1(i.x + 1.0 + (i.y + 1.0) * 57.0); return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
void main(){
float seed = vb.y, al = vb.z; vec4 res_ = vec4(0.0);
float aa = 0.035;
if (vb.x < 0.5) {
float r = length(uv), ang = atan(uv.y, uv.x);
float n1 = 11.0 + floor(seed * 3.0), pet = 0.5 + 0.5 * cos(ang * n1 + seed * 40.0);
float ruf = vn(vec2(ang * 3.0 + seed * 9.0, r * 5.0)) - 0.5;
float edge = 0.82 + 0.15 * pow(pet, 0.8) + 0.05 * ruf;
float m = 1.0 - smoothstep(edge - aa, edge + aa, r);
float rad = r / edge;
vec3 deep = vec3(0.80, 0.26, 0.02), orange = vec3(1.0, 0.50, 0.05), gold = vec3(1.0, 0.76, 0.18), core = vec3(0.42, 0.14, 0.02);
float jit = fract(seed * 7.7);
vec3 tone = mix(orange, gold, jit * 0.55);
vec3 col = mix(tone, deep, smoothstep(0.55, 1.0, rad) * 0.75);
col *= 0.74 + 0.36 * smoothstep(0.0, 0.7, pet);                       // the crease between two petals is darker
float n2 = 8.0, pet2 = 0.5 + 0.5 * cos(ang * n2 + 2.1 + seed * 17.0), e2 = 0.60 + 0.07 * pet2;
float inner = 1.0 - smoothstep(e2 - aa, e2 + aa, r);
vec3 c2 = mix(gold, tone, 0.35) * (0.80 + 0.32 * pet2);
col = mix(col, c2, inner);
float e3 = 0.30 + 0.04 * sin(ang * 5.0 + seed * 20.0), in3 = 1.0 - smoothstep(e3 - aa, e3 + aa, r);
col = mix(col, mix(vec3(0.95, 0.62, 0.10), core, smoothstep(0.0, 0.3, 0.3 - r) * 0.0 + (1.0 - smoothstep(0.0, 0.26, r))), in3);
vec2 L = normalize(lit); float lam = clamp(dot(uv / max(r, 0.001), L), -1.0, 1.0);
col *= 0.88 + 0.22 * lam * smoothstep(0.2, 0.95, rad) + 0.10 * (1.0 - rad);
col += vec3(1.0, 0.8, 0.4) * 0.10 * pow(max(lam, 0.0), 2.0) * smoothstep(0.6, 1.0, rad);
float shadow = 1.0 - 0.45 * smoothstep(0.5, 1.0, rad) * (1.0 - smoothstep(-0.2, 0.9, lam)) * 0.5;
col *= shadow;
res_ = vec4(col * m, m);
} else if (vb.x < 1.5) {
float x = uv.x * 0.5 + 0.5, w = 0.40 * pow(sin(3.14159 * clamp(x, 0.0, 1.0)), 0.85) * (1.0 - 0.28 * x), dy = abs(uv.y) * 0.92;
float m = (1.0 - smoothstep(w - 0.04, w + 0.01, dy)) * step(0.0, x) * step(x, 1.0);
vec3 col = mix(vec3(0.07, 0.22, 0.09), vec3(0.28, 0.50, 0.16), smoothstep(-0.2, 1.0, dy / max(w, 0.001) * -0.6 + 0.8 + uv.y * 0.25));
col = mix(col, vec3(0.50, 0.66, 0.26), (1.0 - smoothstep(0.0, 0.05, abs(uv.y))) * 0.55);
col *= 0.7 + 0.45 * x;
res_ = vec4(col * m, m);
} else {
float fl = vb.w, y = uv.y * 0.5 + 0.5;
float xs = uv.x + fl * y * y * 0.55 * sin(ti * 2.4 + y * 3.0 + seed * 20.0 + fl * 4.0);
float half_ = (1.0 - y) * 1.0, m = (1.0 - smoothstep(half_ - 0.05, half_ + 0.02, abs(xs))) * step(0.0, y) * step(y, 1.0);
float k = fract(seed * 5.0);
vec3 dye = k < 0.2 ? vec3(0.93, 0.45, 0.10) : k < 0.4 ? vec3(0.96, 0.69, 0.14) : k < 0.6 ? vec3(0.78, 0.18, 0.12) : k < 0.8 ? vec3(0.95, 0.86, 0.66) : vec3(0.30, 0.50, 0.24);
float fold = 0.82 + 0.22 * sin(xs * 9.0 + ti * 1.7 + seed * 11.0) * y + 0.12 * (1.0 - y);
float edge = smoothstep(half_ - 0.16, half_ - 0.05, abs(xs)) * 0.18;
vec3 col = dye * fold + edge * vec3(0.9, 0.7, 0.35);
res_ = vec4(col * m, m);
}
o = res_ * al;
}`;
const BELL_VS = V3 + `layout(location=0) in vec2 q; layout(location=1) in vec4 a; layout(location=2) in vec4 b;
uniform vec2 res; out vec2 uv; out vec4 vb;
void main(){ vec2 p = vec2(q.x * a.z * 0.8, q.y * a.z); float c = cos(a.w), s = sin(a.w); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
vec2 pos = a.xy + p; gl_Position = vec4(pos.x / res.x * 2.0 - 1.0, 1.0 - pos.y / res.y * 2.0, 0.0, 1.0); uv = q; vb = b; }`;
const BELL_FS = V3 + `precision highp float;
in vec2 uv; in vec4 vb; uniform vec2 lit; uniform vec3 glow; uniform float ti; out vec4 o;
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
void main(){
float sw = vb.x, shim = vb.y, seed = vb.z, al = vb.w;
float px = fwidth(uv.y) * 1.2;
float y = uv.y * 1.16, x = uv.x * 1.06;
float t = clamp((y + 0.62) / 1.2, 0.0, 1.0);
float hw = 0.34 + 0.60 * pow(t, 1.9) + 0.07 * sin(t * 3.14159) * (1.0 - t * 0.5);
hw += 0.07 * smoothstep(0.88, 0.96, t) * (1.0 - smoothstep(0.98, 1.0, t));      // the lip rolls out
float body = max(abs(x) - hw, max(-0.62 - y, y - 0.58));
float crown = sdBox(vec2(x, y + 0.70), vec2(0.20, 0.07)) - 0.03;                  // the cap
float ring = abs(length(vec2(x, y + 0.92)) - 0.17) - 0.04;                          // the loop it hangs by
float clap = min(length(vec2(x, y - 0.66)) - 0.13, sdBox(vec2(x, y - 0.55), vec2(0.025, 0.1)));
float dd = min(min(body, crown), min(ring, clap));
float m = 1.0 - smoothstep(-px, px, dd);
if (m < 0.003) discard;
float u = clamp(x / max(hw, 0.12), -1.0, 1.0), nz = sqrt(max(0.0, 1.0 - u * u));
vec3 n = vec3(u * 0.92, -0.18 + 0.22 * t, nz);
n = normalize(n);
vec3 L = normalize(vec3(lit.x, lit.y, 0.7));
float diff = max(dot(n, L), 0.0) * 0.8 + 0.28;
vec3 brass = mix(vec3(0.46, 0.27, 0.07), vec3(0.98, 0.76, 0.30), diff);
float band = smoothstep(0.012, 0.0, abs(fract(t * 4.0 + 0.12) - 0.5) - 0.47) * step(0.15, t) * step(t, 0.9) * step(body, 0.0);
brass *= 1.0 - 0.30 * band;
vec3 hv = normalize(L + vec3(0.0, 0.0, 1.0)); float spec = pow(max(dot(n, hv), 0.0), 26.0);
vec3 col = brass + vec3(1.0, 0.92, 0.7) * spec * 0.8;
float fres = pow(1.0 - nz, 2.5);
col += glow * fres * (0.38 + 0.9 * shim);
col += glow * 0.10 * shim * (0.5 + 0.5 * sin(ti * 1.6 + seed * 6.28));
col *= 0.9 + 0.1 * sin(x * 3.0);
col *= 1.22;
o = vec4(col * m * al, m * al);
}`;
let env = null, w = 0, h = 0, scale = 1, tierName = 'rich', cfg = null, hostEl = null, ac = null;
let pS = null, pB = null, pL = null, vS = null, vB = null, vL = null, bufS = null, bufQ = null, bufB = null, bufL = null, bufQ2 = null;
let io = null, pen = 0, penT = 1, ropes = [], bells = [], t = 0, t0 = -1, fade = 0, gustT = 2, gust = 0, gustDir = 1, awakeUntil = 4, quietT = 0, seen = false, first = false, mo = null, tmr = 0, headB = 0, tile = null, tileKey = '';
const pt = { x: 0, y: 0, px: 0, py: 0, sp: 0, on: false, touch: false, tt: 0, near: false };
const SW = new Float32Array(4000), IB = new Float32Array(8 * 420), IL = new Float32Array(8 * 8);
const v2 = [0, 0];
const introOver = () => !R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end');
const iters = () => (tierName === 'rich' ? 6 : 4);
const mk = (n, L, kind, o) => {
const r = Object.assign({ n, X: new Float32Array(n * 2), P: new Float32Array(n * 2), inv: new Float32Array(n).fill(1), rest: L / (n - 1), k: 1, kb: 0.15, wind: 0.8, kind, a: [0, 0], b: [0, 0], ta: [0, 0], tb: [0, 0], root: null, drift: 0 }, o || {});
return r;
};
const lay = (r, ax, ay, bx, by, sag) => {  // a parabolic swag from a to b
for (let i = 0; i < r.n; i++) { const u = i / (r.n - 1), x = ax + (bx - ax) * u, y = ay + (by - ay) * u + 4 * sag * u * (1 - u); r.X[i * 2] = r.P[i * 2] = x; r.X[i * 2 + 1] = r.P[i * 2 + 1] = y; }
r.a = [ax, ay]; r.b = [bx, by]; r.ta = [ax, ay]; r.tb = [bx, by]; r.inv[0] = 0; r.inv[r.n - 1] = 0;
};
const arc = (a, b, sag) => { const s = Math.hypot(b[0] - a[0], b[1] - a[1]); return s + 8 * sag * sag / (3 * s); };
const slots = (rr, len, sc, seed0) => {
const r0 = 11.5 * sc, step = r0 * 1.9, n = Math.max(4, Math.round(len / step)), out = [];
for (let i = 0; i < n; i++) { const u = (i + 0.5 + (hash(seed0 + i) - 0.5) * 0.28) / n; out.push({ u, off: (hash(seed0 + i * 3) - 0.5) * 2.2 * sc, s: r0 * (0.9 + hash(seed0 + i * 5) * 0.32), seed: hash(seed0 + i * 7), leaf: 0 });
out.push({ u: (i + 0.02 + hash(seed0 + i * 11) * 0.12) / n, off: (hash(seed0 + i) > 0.5 ? 1 : -1) * (3.5 + hash(seed0 + i * 13) * 3.5) * sc, s: r0 * 0.56, seed: hash(seed0 + i * 9), leaf: 1, rot: (hash(seed0 + i * 2) > 0.5 ? 1 : -1) * (0.7 + hash(seed0 + i * 4) * 0.5) }); }
rr.slots = out.sort((a, b) => a.leaf - b.leaf); rr.len = len;
};
const headBottom = () => { const hd = d.querySelector('.ed-head, header.ed-header, header'); if (!hd || !hostEl) return 0; const a = hd.getBoundingClientRect(), b = hostEl.getBoundingClientRect(); return clamp(a.bottom - b.top, 0, 120); };
const buntingOk = (low) => {
const op = d.querySelector('section.cx-film-open'); if (!op || !hostEl || op.dataset.fxBunting === undefined) return false;
let fc; try { fc = JSON.parse(op.dataset.fxBunting || '[]'); } catch (e) { return false; } if (!fc.length) return true;
const im = op.querySelector('.cx-film-open-pic img'); if (!im) return false;
const b = im.getBoundingClientRect(), hr = hostEl.getBoundingClientRect(); if (b.width < 4) return false;
const cs = getComputedStyle(im), op2 = String(cs.objectPosition || '50% 50%').split(' ').map(parseFloat), py = isNaN(op2[1]) ? 0.5 : op2[1] / 100, a = 16 / 9;
let pw = b.width, ph = pw / a; if (ph < b.height) { ph = b.height; pw = ph * a; }
const oy = b.top - hr.top + (b.height - ph) * py, top0 = b.top - hr.top, bot = b.bottom - hr.top;
for (const f of fc) { const cy = oy + f[1] / 100 * ph, r = f[2] / 100 * pw * 0.75, top = cy - r; if (cy < top0 || cy > bot) continue; if (top - 14 < low) return false; }
return true;
};
const build = () => {
ropes = []; bells = []; if (!w || !h || !cfg) return;
const sc = clamp(w / 1366, 0.62, 1);
if (cfg.rope === 'home') {
headB = headBottom();
let maxY = 1e9; { const tt2 = hostEl.querySelector('.cx-welcome-k') || hostEl.querySelector('.cx-welcome'); if (tt2) { const a = tt2.getBoundingClientRect(), b2 = hostEl.getBoundingClientRect(); if (a.width > 4) maxY = a.top - b2.top - 14 * clamp(w / 1366, 0.62, 1); } }
const y0 = Math.max(10, headB - 4), pad = 6, mid = w / 2;
const xs = [pad, mid, w - pad];
for (let k = 0; k < 2; k++) {
const ax = xs[k], bx = xs[k + 1], span = bx - ax, sag = Math.max(34, 0.135 * span), L = arc([ax, y0], [bx, y0], sag), n = 14;
const r = mk(n, L, 'garland', { k: 0.6, kb: 0.15, wind: 0.9, sc }); r.maxY = maxY; lay(r, ax, y0, bx, y0, sag); slots(r, L, sc, 11 + k * 101); ropes.push(r);
}
const bl = [[xs[0] + 22 * sc, 74 * sc, 1.0], [mid, 62 * sc, 1.15], [xs[2] - 22 * sc, 74 * sc, 1.0]];
bl.forEach(([bx, len, sz], i) => { const r = mk(8, len, 'chain', { k: 1.0, kb: 0.15, wind: 2.2, sc, size: 21 * sc * sz, seed: i * 0.37 + 0.11 }); r.inv.fill(1); r.inv[7] = 1 / 3; for (let j = 0; j < 8; j++) { r.X[j * 2] = r.P[j * 2] = bx; r.X[j * 2 + 1] = r.P[j * 2 + 1] = y0 + len * j / 7; } r.inv[0] = 0; r.root = { x: bx, y: y0 }; r.a = [bx, y0]; r.ta = [bx, y0]; bells.push(r); });
} else if (cfg.rope === 'pennant') {
const y0 = Math.max(8, headBottom() - 2) + 2, span = w + 24, sag = Math.max(26, 0.05 * w);
if (!buntingOk(y0 + sag + 46 * clamp(w / 1366, 0.62, 1))) return;   // no clear band above the faces (or a solemn story): the opening stays the plain painting
const L = arc([0, 0], [span, 0], sag), r = mk(12, L, 'rope', { k: 1.0, kb: 0.15, wind: 1.1, sc }); lay(r, -12, y0, w + 12, y0, sag); ropes.push(r);
} else if (cfg.rope === 'picker') {
tileKey = ''; refreshTile(true);
}
for (const r of ropes) { r.ke = 0; }
awakeUntil = t + 3;
};
const refreshTile = (hard) => {
if (!hostEl || cfg.rope !== 'picker') return;
const el = hostEl.querySelector('.cx-sel-tile[aria-current], .cx-sel-tile.is-on'); if (!el) { tile = null; ropes = []; return; }
const a = el.getBoundingClientRect(), b = hostEl.getBoundingClientRect(); if (a.width < 20) { tile = null; return; }
const key = Math.round(a.left) + ',' + Math.round(a.top) + ',' + Math.round(a.width);
tile = { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
if (key === tileKey && ropes.length && !hard) return; tileKey = key;
const sc = clamp(a.width / 96, 0.5, 1) * 0.7, ax = tile.x - 2, bx = tile.x + tile.w + 2, ay = tile.y - 6, by = ay, span = bx - ax, sag = Math.max(7, 0.075 * span);
if (!ropes.length || hard) { const L = arc([ax, ay], [bx, by], sag), r = mk(14, L, 'garland', { k: 0.6, kb: 0.15, wind: 0.9, sc }); lay(r, ax, ay, bx, by, sag); slots(r, L, sc, 777); ropes = [r]; }
else { const r = ropes[0]; r.ta = [ax, ay]; r.tb = [bx, by]; awakeUntil = t + 4; }
};
const nearest = (ax, ay, bx, by, px, py, o) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = l2 > 1e-6 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0; o[0] = ax + dx * u; o[1] = ay + dy * u; };
const stepRope = (r, dt, inp, wf, gustK) => {
const n = r.n, X = r.X, P = r.P, inv = r.inv, k2 = dt * dt, damp = Math.pow(DAMP, dt * 60);
if (r.kind === 'garland' || r.kind === 'rope') {
const e = 1 - Math.exp(-dt * 7);
r.a[0] += (r.ta[0] - r.a[0]) * e; r.a[1] += (r.ta[1] - r.a[1]) * e; r.b[0] += (r.tb[0] - r.b[0]) * e; r.b[1] += (r.tb[1] - r.b[1]) * e;
X[0] = r.a[0]; X[1] = r.a[1]; X[n * 2 - 2] = r.b[0]; X[n * 2 - 1] = r.b[1]; P[0] = X[0]; P[1] = X[1]; P[n * 2 - 2] = X[n * 2 - 2]; P[n * 2 - 1] = X[n * 2 - 1];
} else if (r.kind === 'chain' && r.root) { X[0] = P[0] = r.root.x; X[1] = P[1] = r.root.y; }
let sv = inp ? clamp(inp.scrollVel / 1500, -1, 1) : 0, pk = 0;
for (let i = 0; i < n; i++) {
if (!inv[i]) continue; const o = i * 2;
let ax = 0, ay = GRAV;
G.windAt(X[o], X[o + 1], v2); ax += v2[0] * r.wind * gustK + sv * 260 * r.wind * 0.5; ay += v2[1] * r.wind * gustK * 0.4;
const vx = (X[o] - P[o]) * damp, vy = (X[o + 1] - P[o + 1]) * damp;
P[o] = X[o]; P[o + 1] = X[o + 1]; X[o] += vx + ax * k2; X[o + 1] += vy + ay * k2;
}
if (pt.on) {
const sp = pt.sp, kk = Math.min(sp, 1500) / 1500, RAD = 28;
if (kk > 0.03) for (let i = 0; i < n; i++) {
if (!inv[i]) continue; const o = i * 2; nearest(pt.px, pt.py, pt.x, pt.y, X[o], X[o + 1], v2); let dx = X[o] - v2[0], dy = X[o + 1] - v2[1]; const dd = Math.hypot(dx, dy);
if (dd < RAD) { if (dd < 1e-3) { dx = pt.x - pt.px; dy = pt.y - pt.py; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; } else { dx /= dd; dy /= dd; } const f = (1 - dd / RAD) * kk * 9 * (inv[i] ? 1 / (inv[i] > 0.9 ? 1 : 1.6) : 1); X[o] += dx * f * 0.7 + (pt.x - pt.px) * 0.02 * kk; X[o + 1] += dy * f * 0.7; }
}
}
const it = iters(), rest = r.rest, stf = r.k, kb = r.kb, bend = rest * 2 * (r.kind === 'garland' ? 0.94 : 1);
for (let q = 0; q < it; q++) {
for (let i = 0; i < n - 1; i++) {
const a = i * 2, b = a + 2, dx = X[b] - X[a], dy = X[b + 1] - X[a + 1], l = Math.hypot(dx, dy) || 1e-6, wa = inv[i], wb = inv[i + 1], ws = wa + wb; if (!ws) continue;
const c = (l - rest) / l / ws * stf, cx = dx * c, cy = dy * c;
X[a] += cx * wa; X[a + 1] += cy * wa; X[b] -= cx * wb; X[b + 1] -= cy * wb;
}
if (q < it - 2) for (let i = 0; i < n - 2; i += 2) {
const a = i * 2, b = a + 4, dx = X[b] - X[a], dy = X[b + 1] - X[a + 1], l = Math.hypot(dx, dy) || 1e-6, wa = inv[i], wb = inv[i + 2], ws = wa + wb; if (!ws) continue;
if (l >= bend) continue;   // only pushes apart: a swag may sag but not fold
const c = (l - bend) / l / ws * kb, cx = dx * c, cy = dy * c;
X[a] += cx * wa; X[a + 1] += cy * wa; X[b] -= cx * wb; X[b + 1] -= cy * wb;
}
}
if (r.maxY !== undefined) for (let i = 1; i < n - 1; i++) { if (X[i * 2 + 1] > r.maxY) { X[i * 2 + 1] = r.maxY; if (P[i * 2 + 1] > r.maxY) P[i * 2 + 1] = r.maxY; } }
let ke = 0; for (let i = 0; i < n; i++) { const o = i * 2, vx = X[o] - P[o], vy = X[o + 1] - P[o + 1]; ke += vx * vx + vy * vy; }
r.ke = ke / n;
};
const fx = {
name: 'rope', order: 25, wants: () => true,
z: (el) => (el.classList.contains('cx-select') ? 5 : null),
init(gl, e) {
env = e; first = false; t = 0; t0 = -1; fade = 0;
pS = e.prog(STRIP_VS, STRIP_FS); pB = e.prog(BL_VS, BL_FS); pL = e.prog(BELL_VS, BELL_FS);
bufS = e.buf(); vS = e.vao(); gl.bindVertexArray(vS); gl.bindBuffer(gl.ARRAY_BUFFER, bufS); gl.bufferData(gl.ARRAY_BUFFER, SW.byteLength, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const inst = (vao, qb, ib, bytes) => { gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(1, 1); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(2, 1); };
bufQ = e.buf(); bufB = e.buf(); vB = e.vao(); inst(vB, bufQ, bufB, IB.byteLength);
bufQ2 = e.buf(); bufL = e.buf(); vL = e.vao(); inst(vL, bufQ2, bufL, IL.byteLength);
gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null);
},
resize(W, H, sc, tier) { w = W; h = H; scale = sc; tierName = tier; if (hostEl) { cfg = env.cfg; build(); } },
enter() {
hostEl = env.host; cfg = env.cfg; if (!cfg || !cfg.rope) { ropes = []; bells = []; return; }
seen = cfg.rope === 'home' ? introOver() : true; t0 = seen ? t : -1; fade = 0; first = false;
ac = new AbortController(); const o = { signal: ac.signal, passive: true };
addEventListener('pointermove', (ev) => { if (ev.pointerType !== 'touch' || !hostEl) return; const r = hostEl.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, n = performance.now(), dtm = Math.max(8, n - pt.tt) / 1000; pt.px = pt.on && n - pt.tt < 200 ? pt.x : x; pt.py = pt.on && n - pt.tt < 200 ? pt.y : y; pt.sp = Math.hypot(x - pt.px, y - pt.py) / dtm; pt.x = x; pt.y = y; pt.on = true; pt.touch = true; pt.tt = n; awakeUntil = t + 2.5; }, o);
addEventListener('pointerup', () => { if (pt.touch) { pt.on = false; pt.touch = false; } }, o); addEventListener('pointercancel', () => { if (pt.touch) { pt.on = false; pt.touch = false; } }, o);
mo = new MutationObserver(() => { if (!seen && introOver()) { seen = true; t0 = t; if (w) build(); } if (cfg.rope === 'picker') refreshTile(false); }); mo.observe(R, { attributes: true, attributeFilter: ['class'] });
if (cfg.rope === 'picker') { mo.observe(hostEl, { attributes: true, attributeFilter: ['aria-current', 'class'], subtree: true }); tmr = setInterval(() => refreshTile(false), 160); }
pen = cfg.rope === 'pennant' ? 0 : 1; penT = 1;
if (cfg.rope === 'pennant') { const hero = d.querySelector('section.cx-film-open'); if (hero && window.IntersectionObserver) { io = new IntersectionObserver((es) => { for (const x of es) penT = x.intersectionRatio > 0.45 ? 1 : 0; }, { threshold: [0, 0.2, 0.45, 0.7, 1] }); io.observe(hero); } }
if (w) build();
},
leave() { if (io) { io.disconnect(); io = null; } if (ac) { ac.abort(); ac = null; } if (mo) { mo.disconnect(); mo = null; } if (tmr) { clearInterval(tmr); tmr = 0; } ropes = []; bells = []; hostEl = null; pt.on = false; first = false; if (R.dataset.fxRope) delete R.dataset.fxRope; },
refresh() { if (hostEl && cfg && w) { if (cfg.rope === 'picker') refreshTile(true); else build(); } },
update(dt, inp) {
if (!ropes.length && !bells.length) return;
t += dt; pen += (penT - pen) * (1 - Math.exp(-dt * 4)); if (!seen) return;
if (t0 < 0) t0 = t; fade = sstep(0, 1.4, t - t0);
if (!pt.touch) { const on = inp.on && inp.x > -1e3; if (on) { pt.px = pt.on ? pt.x : inp.x; pt.py = pt.on ? pt.y : inp.y; pt.x = inp.x; pt.y = inp.y; pt.sp = Math.hypot(inp.vx, inp.vy); pt.on = true; } else pt.on = false; }
gustT -= dt; if (gustT <= 0) { gustT = 5 + hash(Math.floor(t * 7)) * 5; gust = 1; awakeUntil = Math.max(awakeUntil, t + 3.6); gustDir = hash(Math.floor(t * 3)) > 0.35 ? 1 : -1; }
gust = Math.max(0, gust - dt / 3.2); const gk = 0.12 + 1.5 * Math.sin(Math.PI * clamp(gust, 0, 1)) * Math.min(1, gust * 3);
let near = false; if (pt.on) { for (const r of ropes) { for (let i = 0; i < r.n && !near; i += 3) if (Math.hypot(r.X[i * 2] - pt.x, r.X[i * 2 + 1] - pt.y) < 120) near = true; } for (const r of bells) { if (Math.hypot(r.X[14] - pt.x, r.X[15] - pt.y) < 140) near = true; } }
if (near || Math.abs(inp.scrollVel) > 160) awakeUntil = Math.max(awakeUntil, t + 1.5);
if (cfg && cfg.rope === 'pennant' && pen < 0.01) return;
if (t > awakeUntil) return;
for (const r of ropes) stepRope(r, dt, inp, null, gk);
for (const c of bells) stepRope(c, dt, inp, null, gk);
let ke = 0; for (const r of ropes) ke += r.ke; for (const r of bells) ke += r.ke;
if (ke < 0.0009 && !near) quietT += dt; else quietT = 0;
if (quietT > 1.5) { awakeUntil = t; quietT = 0; }
},
draw(gl, e) {
if (!pS || !pS.ok || !pB || !pB.ok || !pL || !pL.ok || !(ropes.length || bells.length) || fade <= 0.002) return;
const sun = [-0.45, -0.85], al = fade * pen; if (al < 0.003) return;
let nv = 0; const runs = [];
const curve = (r, halfW, out) => {
const n = r.n, X = r.X, S = (n - 1) * 4 + 1, start = nv; let k = 0; const pts = out || [];
for (let i = 0; i < n - 1; i++) {
const p0 = Math.max(0, i - 1) * 2, p1 = i * 2, p2 = (i + 1) * 2, p3 = Math.min(n - 1, i + 2) * 2;
for (let s = 0; s < 4; s++) { const u = s / 4, u2 = u * u, u3 = u2 * u;
const x = 0.5 * (2 * X[p1] + (-X[p0] + X[p2]) * u + (2 * X[p0] - 5 * X[p1] + 4 * X[p2] - X[p3]) * u2 + (-X[p0] + 3 * X[p1] - 3 * X[p2] + X[p3]) * u3);
const y = 0.5 * (2 * X[p1 + 1] + (-X[p0 + 1] + X[p2 + 1]) * u + (2 * X[p0 + 1] - 5 * X[p1 + 1] + 4 * X[p2 + 1] - X[p3 + 1]) * u2 + (-X[p0 + 1] + 3 * X[p1 + 1] - 3 * X[p2 + 1] + X[p3 + 1]) * u3);
pts[k * 2] = x; pts[k * 2 + 1] = y; k++; } }
pts[k * 2] = X[(n - 1) * 2]; pts[k * 2 + 1] = X[(n - 1) * 2 + 1]; k++;
for (let i = 0; i < k; i++) { const a = Math.max(0, i - 1), b = Math.min(k - 1, i + 1); let tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
const nx = -ty * halfW, ny = tx * halfW; SW[nv++] = pts[i * 2] + nx; SW[nv++] = pts[i * 2 + 1] + ny; SW[nv++] = -1; SW[nv++] = pts[i * 2] - nx; SW[nv++] = pts[i * 2 + 1] - ny; SW[nv++] = 1; }
runs.push([start / 3, k * 2]); return pts;
};
const dense = [];
for (const r of ropes) { const pts = curve(r, r.kind === 'rope' ? 1.7 : 2.2, []); dense.push(pts); }
gl.bindBuffer(gl.ARRAY_BUFFER, bufS); gl.bufferSubData(gl.ARRAY_BUFFER, 0, SW, 0, nv);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.bindVertexArray(vS); gl.useProgram(pS.p); gl.uniform2f(pS.loc('res'), w, h);
gl.uniform2f(pS.loc('off'), 3, 7); gl.uniform4f(pS.loc('col'), 0.05, 0.02, 0.0, 0.25 * al); for (const [f, c] of runs) gl.drawArrays(gl.TRIANGLE_STRIP, f, c);
gl.uniform2f(pS.loc('off'), 0, 0); gl.uniform4f(pS.loc('col'), 0.36, 0.10, 0.05, 0.95 * al); for (const [f, c] of runs) gl.drawArrays(gl.TRIANGLE_STRIP, f, c);
let ni = 0;
const put = (x, y, s, rot, kind, seed, a, fl) => { if (ni >= 420) return; const o = ni * 8; IB[o] = x; IB[o + 1] = y; IB[o + 2] = s; IB[o + 3] = rot; IB[o + 4] = kind; IB[o + 5] = seed; IB[o + 6] = a; IB[o + 7] = fl; ni++; };
ropes.forEach((r, ri) => {
const pts = dense[ri], K = pts.length / 2;
if (r.kind === 'garland') {
const cum = [0]; for (let i = 1; i < K; i++) cum.push(cum[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]));
const tot = cum[K - 1] || 1;
for (const s of r.slots) {
const target = clamp(s.u, 0, 1) * tot; let i = 1; while (i < K - 1 && cum[i] < target) i++;
const f = (target - cum[i - 1]) / Math.max(1e-4, cum[i] - cum[i - 1]), x = pts[i * 2 - 2] + (pts[i * 2] - pts[i * 2 - 2]) * f, y = pts[i * 2 - 1] + (pts[i * 2 + 1] - pts[i * 2 - 1]) * f;
let tx = pts[i * 2] - pts[i * 2 - 2], ty = pts[i * 2 + 1] - pts[i * 2 - 1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const ang = Math.atan2(ty, tx);
if (s.leaf) put(x - ty * s.off, y + tx * s.off, s.s, ang + s.rot, 1, s.seed, al, 0); else put(x - ty * s.off, y + tx * s.off, s.s, ang + s.seed * 6.28 + t * 0.0, 0, s.seed, al, 0);
}
for (const e2 of [0, K - 1]) put(pts[e2 * 2], pts[e2 * 2 + 1], 13 * r.sc * 1.25, e2 * 0.7, 0, 0.37 + e2 * 0.01, al, 0);
} else if (r.kind === 'rope') {
for (let i = 1; i < r.n - 1; i++) { const o = i * 2, ang = 0; G.windAt(r.X[o], r.X[o + 1], v2); const wf = clamp(v2[0] / 90, -1, 1), sz = (17 + 5 * hash(i * 3)) * r.sc; put(r.X[o], r.X[o + 1] + 1, sz, ang + wf * 0.12, 2, hash(i + 5), al * 0.92, wf * 0.8 + 0.25); }
}
});
if (ni) {
gl.bindVertexArray(vB); gl.bindBuffer(gl.ARRAY_BUFFER, bufB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, IB, 0, ni * 8);
gl.useProgram(pB.p); gl.uniform2f(pB.loc('res'), w, h); gl.uniform2f(pB.loc('lit'), sun[0], sun[1]); gl.uniform1f(pB.loc('ti'), e.t);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ni);
}
if (bells.length) {
let nb = 0; const nv0 = nv;
for (const c of bells) { const pts = curve(c, 0.9, []); }
gl.bindVertexArray(vS); gl.bindBuffer(gl.ARRAY_BUFFER, bufS); gl.bufferSubData(gl.ARRAY_BUFFER, nv0 * 4, SW, nv0, nv - nv0);
gl.useProgram(pS.p); gl.uniform2f(pS.loc('off'), 2, 4); gl.uniform4f(pS.loc('col'), 0.05, 0.02, 0.0, 0.18 * al); for (let i = runs.length - bells.length; i < runs.length; i++) gl.drawArrays(gl.TRIANGLE_STRIP, runs[i][0], runs[i][1]);
gl.uniform2f(pS.loc('off'), 0, 0); gl.uniform4f(pS.loc('col'), 0.78, 0.58, 0.22, 0.95 * al); for (let i = runs.length - bells.length; i < runs.length; i++) gl.drawArrays(gl.TRIANGLE_STRIP, runs[i][0], runs[i][1]);
for (const c of bells) {
const X = c.X, e7 = 14, e6 = 12, dx = X[e7] - X[e6], dy = X[e7 + 1] - X[e6 + 1], ang = Math.atan2(-dx, dy), sz = c.size;
const shim = sstep(0.35, 0.62, Math.abs(ang)) * (0.55 + 0.45 * Math.sin(e.t * 1.4 + c.seed * 9));
const o = nb * 8, off = sz * 0.974; IL[o] = X[e7] - Math.sin(ang) * off; IL[o + 1] = X[e7 + 1] + Math.cos(ang) * off; IL[o + 2] = sz; IL[o + 3] = ang; IL[o + 4] = ang; IL[o + 5] = shim; IL[o + 6] = c.seed; IL[o + 7] = al;
nb++;
}
gl.bindVertexArray(vL); gl.bindBuffer(gl.ARRAY_BUFFER, bufL); gl.bufferSubData(gl.ARRAY_BUFFER, 0, IL, 0, nb * 8);
gl.useProgram(pL.p); gl.uniform2f(pL.loc('res'), w, h); gl.uniform2f(pL.loc('lit'), sun[0], sun[1]); gl.uniform3f(pL.loc('glow'), 1.0, 0.74, 0.46); gl.uniform1f(pL.loc('ti'), e.t);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nb);
}
gl.bindVertexArray(null);
if (!first) { first = true; R.dataset.fxRope = 'live'; }
},
stats() { return { ropes: ropes.map((r) => ({ kind: r.kind, n: r.n, ke: +r.ke.toFixed(4) })), bells: bells.map((r) => ({ ke: +r.ke.toFixed(4), x: Math.round(r.X[14]), y: Math.round(r.X[15]) })), asleep: t > awakeUntil, fade: +fade.toFixed(2), cfg: cfg && cfg.rope }; },
dispose() { delete R.dataset.fxRope; if (io) { io.disconnect(); io = null; } if (ac) { ac.abort(); ac = null; } if (mo) { mo.disconnect(); mo = null; } if (tmr) { clearInterval(tmr); tmr = 0; } ropes = []; bells = []; env = pS = pB = pL = vS = vB = vL = bufS = bufQ = bufB = bufL = bufQ2 = null; hostEl = null; },
};
G.rope = { nodes: () => ropes.map((r) => Array.from(r.X)), bellNodes: () => bells.map((r) => Array.from(r.X)), poke: (x, y, vx, vy) => { pt.on = true; pt.touch = true; pt.px = x - vx * 0.016; pt.py = y - vy * 0.016; pt.x = x; pt.y = y; pt.sp = Math.hypot(vx, vy); pt.tt = performance.now(); awakeUntil = t + 3; } };
G.register(fx);
})();
