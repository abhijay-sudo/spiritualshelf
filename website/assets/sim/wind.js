(() => {
const G = window.SpiritualGPU; if (!G) return;
const d = document, GX = 16, GY = 9, DRAG = 1.2;
const hash = (x, y) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), e = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v; };
const psi = (x, y, t) => { let s = 0, a = 1, f = 1; for (let o = 0; o < 3; o++) { s += a * vn(x * f + t * .11 * (o + 1) + o * 17.3, y * f - t * .07 * (o + 1) + o * 5.1); a *= .5; f *= 2.1; } return s; };
const VS = `#version 300 es
layout(location=0) in vec2 q;
layout(location=1) in vec4 a;
layout(location=2) in vec4 b;
uniform vec2 res;
out vec2 uv; out vec4 vb;
void main(){
float petal = b.y;
float half_ = mix(a.z * 3.4, a.z, petal);
vec2 p = q * half_;
p.x *= mix(1.0, 0.3 + 0.7 * abs(cos(b.w)), petal);
float c = cos(a.w), s = sin(a.w);
p = mix(p, vec2(c * p.x - s * p.y, s * p.x + c * p.y), petal);
vec2 pos = a.xy + p;
gl_Position = vec4(pos.x / res.x * 2.0 - 1.0, 1.0 - pos.y / res.y * 2.0, 0.0, 1.0);
uv = q; vb = b;
}`;
const FS = `#version 300 es
precision mediump float;
in vec2 uv; in vec4 vb;
uniform float ti;
out vec4 o;
void main(){
float r = length(uv);
float seed = vb.z;
if (vb.y < 0.5) {
float fl = 0.84 + 0.16 * sin(ti * 6.2832 * (0.5 + 1.3 * fract(seed * 7.31)) + seed * 40.0);
float core = exp(-r * r * 22.0);
float halo = exp(-r * r * 4.6) * (1.0 - smoothstep(0.7, 1.0, r));
vec3 col = mix(vec3(1.0, 0.38, 0.08), vec3(1.0, 0.86, 0.5), core);
o = vec4(col * (core * 1.1 + halo * 0.34) * vb.x * fl, 0.0);
} else {
vec2 e = vec2(uv.x / 0.52, uv.y);
float d = length(e);
float m = 1.0 - smoothstep(0.82, 1.0, d);
float face = abs(cos(vb.w));
float shade = (0.5 + 0.34 * (uv.y * 0.5 + 0.5) + 0.3 * (1.0 - d)) * (0.62 + 0.55 * face);
float vein = 1.0 - 0.22 * smoothstep(0.12, 0.0, abs(uv.x)) * (1.0 - d);
vec3 marigold = mix(vec3(0.95, 0.42, 0.04), vec3(1.0, 0.66, 0.12), fract(seed * 3.7));
vec3 col = mix(marigold, vec3(1.0, 0.42, 0.34), step(0.86, fract(seed * 5.3)));
float al = m * vb.x * 0.34;
o = vec4(col * shade * vein * al * 1.6, al * 0.5);
}
}`;
let env0 = null, scene = false, tr = [], trT = 0, hostEl = null, w = 0, h = 0, N = 0, P = null, I = null, wg = new Float32Array(GX * GY * 2), gridT = -1, tt = 0, seed = 1, prog = null, vao = null, bq = null, bi = null, scale = 1, tierName = 'rich';
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const count = (tier, W, H) => Math.max(24, Math.round((scene ? (tier === 'rich' ? 120 : 50) : (tier === 'rich' ? 220 : 90)) * clamp(Math.sqrt((W * H) / 1.1e6), .5, 1.1)));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const kindOf = (s) => (s * 100 % 1 < .32 ? 1 : 0);
const spawn = (i, fresh) => {
const o = i * 6, s = rnd(), petal = kindOf(s), life = 6 + rnd() * 6;
if (fresh) { P[o] = rnd() * w; P[o + 1] = rnd() * h; } else if (petal) { if (rnd() < .5) { P[o] = -12; P[o + 1] = rnd() * h * .6; } else { P[o] = rnd() * w * .8; P[o + 1] = -12; } } else { P[o] = rnd() * w; P[o + 1] = h + 10; }
P[o + 2] = (rnd() - .3) * 20; P[o + 3] = petal ? rnd() * 14 : -(10 + rnd() * 24); P[o + 4] = fresh ? life * (.2 + rnd() * .8) : life; P[o + 5] = s;
};
const field = (t) => {
const e = .08;
for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
const x = i / (GX - 1) * 2.4, y = j / (GY - 1) * 1.4, k = (j * GX + i) * 2;
wg[k] = 34 + 150 * (psi(x, y + e, t) - psi(x, y - e, t)) / (2 * e) * .22;
wg[k + 1] = -150 * (psi(x + e, y, t) - psi(x - e, y, t)) / (2 * e) * .22 - 10;
}
};
const sample = (x, y, out) => {
const gx = clamp(x / w * (GX - 1), 0, GX - 1.001), gy = clamp(y / h * (GY - 1), 0, GY - 1.001), i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j;
const a = (j * GX + i) * 2, b = a + 2, c = a + GX * 2, e = c + 2;
out[0] = (wg[a] * (1 - fx) + wg[b] * fx) * (1 - fy) + (wg[c] * (1 - fx) + wg[e] * fx) * fy;
out[1] = (wg[a + 1] * (1 - fx) + wg[b + 1] * fx) * (1 - fy) + (wg[c + 1] * (1 - fx) + wg[e + 1] * fx) * fy;
};
const v = [0, 0];
const rects = () => {
if (!hostEl) return; const hr = (env0 && env0.rect && env0.rect()) || hostEl.getBoundingClientRect(), out = [], hb = hr.top + hr.height;
for (const el of d.querySelectorAll('.cx-film-card, .fm-beat.on, .fm-beat.on .fm-t, .shot-card, .cx-open-card')) { const b = el.getBoundingClientRect(); if (b.width < 30 || b.height < 12 || b.bottom < hr.top || b.top > hb) continue; out.push([b.left - hr.left - 10, b.top - hr.top - 10, b.right - hr.left + 10, b.bottom - hr.top + 10]); if (out.length > 6) break; }
tr = out;
};
const safe = (x, y) => { for (let i = 0; i < tr.length; i++) { const r = tr[i]; if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return .5; } return 1; };
const fx = {
name: 'wind',
order: 30,
z: (el) => (el.classList.contains('cx-select') ? 1 : null),
wants: () => true,
init(gl, env) {
env0 = env; prog = env.prog(VS, FS); vao = env.vao(); bq = env.buf(); bi = env.buf();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, bq); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ARRAY_BUFFER, bi); gl.bufferData(gl.ARRAY_BUFFER, 220 * 1.15 * 8 * 4 + 4096, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(1, 1);
gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(2, 1);
gl.bindVertexArray(null);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
},
resize(W, H, sc, tier) {
w = W; h = H; scale = sc; tierName = tier;
const n = count(tier, W, H);
if (!P || n !== N) { const old = N, oldP = P; N = n; P = new Float32Array(N * 6); I = new Float32Array(N * 8); for (let i = 0; i < N; i++) { if (oldP && i < old) P.set(oldP.subarray(i * 6, i * 6 + 6), i * 6); else spawn(i, true); } }
else for (let i = 0; i < N; i++) { if (P[i * 6] > w + 40 || P[i * 6 + 1] > h + 40) spawn(i, true); }
gridT = -1;
},
enter() {
hostEl = env0.host; scene = !!(env0.cfg && env0.cfg.wind === 'scene'); tr = [];
if (w) { const n = count(tierName, w, h); if (n !== N) fx.resize(w, h, scale, tierName); }
if (P) for (let i = 0; i < N; i++) spawn(i, true); gridT = -1;
if (scene) { rects(); trT = setInterval(rects, 700); }
},
leave() { if (trT) { clearInterval(trT); trT = 0; } tr = []; hostEl = null; },
pause() { if (trT) { clearInterval(trT); trT = 0; } },
resume() { if (scene && hostEl && !trT) { rects(); trT = setInterval(rects, 700); } },
refresh() { if (scene) rects(); },
update(dt, inp) {
tt += dt;
if (gridT < 0 || tt - gridT >= .1) { gridT = tt; field(tt); }
const gust = clamp(inp.scrollVel / 1500, -1, 1) * 120;   // 1 m/s of scroll gust is about 40 px/s, three at the strongest
const on = inp.on, R = 90, R2 = R * R;
for (let i = 0; i < N; i++) {
const o = i * 6; let x = P[o], y = P[o + 1], vx = P[o + 2], vy = P[o + 3]; const life = P[o + 4] - dt, s = P[o + 5], petal = kindOf(s), dr = .6 + .8 * (s * 53.7 % 1);   // nearer ones (larger dr) are bigger, brighter and quicker
if (life <= 0 || x < -40 || x > w + 40 || y < -40 || y > h + 40) { spawn(i, false); continue; }
sample(x, y, v);
let wx = (v[0] * (petal ? 2.2 : 1) + gust * (petal ? 1.2 : 1)) * dr, wy = v[1] * dr;
if (on) { const dx = x - inp.x, dy = y - inp.y, d2 = dx * dx + dy * dy; if (d2 < R2) { const d = Math.sqrt(d2) + .001, f = (1 - d / R) * (1 - d / R); wx += inp.vx * f * .5 + dx / d * f * 90; wy += inp.vy * f * .5 + dy / d * f * 90; } }
vx += DRAG * (wx - vx) * dt; vy += (DRAG * (wy - vy) + (petal ? 25 : -42) * dr) * dt; x += vx * dt; y += vy * dt;
P[o] = x; P[o + 1] = y; P[o + 2] = vx; P[o + 3] = vy; P[o + 4] = life;
}
},
draw(gl, env) {
if (!prog || !prog.ok || !N) return;
const t = env.t, k = env.intensity;
for (let i = 0; i < N; i++) {
const o = i * 6, s = P[o + 5], petal = kindOf(s), j = i * 8, life = P[o + 4];
const born = Math.min(1, (Math.max(0, 9 - life)) * .9), fade = Math.min(1, life / 1.6);   // eased in and out, never a pop
I[j] = P[o]; I[j + 1] = P[o + 1];
const dp = .6 + .8 * (s * 53.7 % 1); I[j + 2] = (petal ? 3.4 + (s * 13 % 1) * 3.2 : 1.4 + (s * 17 % 1) * 2) * dp;
I[j + 3] = petal ? s * 40 + t * (.6 + (s * 9 % 1)) * (s > .5 ? 1 : -1) + P[o + 2] * .01 : 0;
I[j + 4] = safe(P[o], P[o + 1]) * Math.min(fade, 1) * k * (petal ? 1 : .9) * (.4 + .6 * (s * 29 % 1)) * (.55 + .45 * (dp - .6) / .8); I[j + 5] = petal; I[j + 6] = s; I[j + 7] = t * (1.1 + (s * 9 % 1) * 1.6) + s * 20;
}
gl.useProgram(prog.p); gl.uniform2f(prog.loc('res'), w, h); gl.uniform1f(prog.loc('ti'), t);
gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, bi); gl.bufferSubData(gl.ARRAY_BUFFER, 0, I, 0, N * 8);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, N);
gl.bindVertexArray(null);
},
stats(inp) { let n = 0, vn = 0, f = 0, vf = 0, px = 0; for (let i = 0; i < N; i++) { const o = i * 6, sp = Math.hypot(P[o + 2], P[o + 3]), d = Math.hypot(P[o] - inp.x, P[o + 1] - inp.y); if (d < 120) { n++; vn += sp; } else { f++; vf += sp; } } return { n: N, textRects: tr.length, scene, near: n, vNear: n ? vn / n : 0, vFar: f ? vf / f : 0 }; },
dispose() { if (trT) { clearInterval(trT); trT = 0; } tr = []; hostEl = env0 = null; P = I = null; N = 0; prog = vao = bq = bi = null; gridT = -1; },
};
G.windAt = (x, y, o) => { if (w) sample(x, y, o); else { o[0] = 24; o[1] = 0; } };
G.register(fx);
})();
