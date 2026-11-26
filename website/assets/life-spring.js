const TAU = Math.PI * 2;
function advance(x, v, w, z, dt) {
if (w <= 0 || dt <= 0) return [x, v];
if (z < 1 - 1e-4) {   // underdamped: rings at wd and fades at z w
const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * dt), c = Math.cos(wd * dt), s = Math.sin(wd * dt), k = (v + z * w * x) / wd;
return [e * (x * c + k * s), e * (v * c - ((w * w * x + z * w * v) / wd) * s)];
}
if (z > 1 + 1e-4) {   // overdamped: two decays, no ring
const r = w * Math.sqrt(z * z - 1), a = -w * z + r, b = -w * z - r, A = (v - b * x) / (a - b), B = x - A, ea = Math.exp(a * dt), eb = Math.exp(b * dt);
return [A * ea + B * eb, A * a * ea + B * b * eb];
}
const e = Math.exp(-w * dt), c1 = v + w * x;   // critically damped
return [(x + c1 * dt) * e, (v - c1 * w * dt) * e];
}
class Spring {
constructor(x = 0, freq = 2, zeta = 1) { this.x = x; this.v = 0; this.target = x; this.freq = freq; this.zeta = zeta; }
step(dt) { const [x, v] = advance(this.x - this.target, this.v, this.freq * TAU, this.zeta, Math.min(dt, 0.1)); this.x = this.target + x; this.v = v; return this.x; }
set(x) { this.x = this.target = x; this.v = 0; }
kick(v) { this.v += v; }   // an instant push (a gust, a tap)
get settled() { return Math.abs(this.x - this.target) < 1e-3 && Math.abs(this.v) < 1e-2; }
}
class SpringN {
constructor(n, freq = 2, zeta = 1) { this.n = n; this.x = new Float32Array(n); this.v = new Float32Array(n); this.target = new Float32Array(n); this.freq = freq; this.zeta = zeta; }
step(dt) { const w = this.freq * TAU, d = Math.min(dt, 0.1); for (let i = 0; i < this.n; i++) { const [x, v] = advance(this.x[i] - this.target[i], this.v[i], w, this.zeta, d); this.x[i] = this.target[i] + x; this.v[i] = v; } return this.x; }
set(a) { for (let i = 0; i < this.n; i++) { this.x[i] = this.target[i] = a[i] || 0; this.v[i] = 0; } }
get settled() { for (let i = 0; i < this.n; i++) if (Math.abs(this.x[i] - this.target[i]) > 1e-3 || Math.abs(this.v[i]) > 1e-2) return false; return true; }
}
function friction(v, viscous, coulomb, dt) {
v *= Math.exp(-viscous * dt); const s = Math.sign(v), m = Math.abs(v) - coulomb * dt; return m > 0 ? s * m : 0;
}
const damp = (v, rate, dt) => v * Math.exp(-rate * dt);                      // exponential approach to zero, any frame rate
const approach = (x, target, rate, dt) => target + (x - target) * Math.exp(-rate * dt);   // the same toward a value
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const stepResponse = (freq, zeta) => (t) => { const [x] = advance(-1, 0, freq * TAU, zeta, t); return 1 + x; };
function settleTime(freq, zeta) { const f = stepResponse(freq, zeta); let last = 0; for (let t = 0; t < 12; t += 0.005) if (Math.abs(f(t) - 1) > 0.005) last = t; return last + 0.005; }
function linearEase(freq, zeta, stops = 28) {
const T = settleTime(freq, zeta), f = stepResponse(freq, zeta), pts = [];
for (let i = 0; i <= 200; i++) pts.push([i / 200, f((i / 200) * T)]);
let tol = 0.002, keep = [0, 200];
for (let n = 0; n < 40; n++) {
keep = [0, 200]; const rec = (a, b) => { let m = -1, d = 0; for (let i = a + 1; i < b; i++) { const y = pts[a][1] + (pts[b][1] - pts[a][1]) * (i - a) / (b - a), e = Math.abs(pts[i][1] - y); if (e > d) { d = e; m = i; } } if (m >= 0 && d > tol) { keep.push(m); rec(a, m); rec(m, b); } };
rec(0, 200); if (keep.length <= stops) break; tol *= 1.35;
}
keep.sort((a, b) => a - b);
const css = 'linear(' + keep.map((i, k) => { const y = +pts[i][1].toFixed(4); return k === 0 ? `${y}` : k === keep.length - 1 ? `${y}` : `${y} ${+(pts[i][0] * 100).toFixed(2)}%`; }).join(', ') + ')';
return { css, ms: Math.round(T * 1000) };
}
export { Spring, SpringN, advance, friction, damp, approach, clamp, stepResponse, settleTime, linearEase, TAU };
