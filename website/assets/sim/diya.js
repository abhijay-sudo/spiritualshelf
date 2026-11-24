(() => {
const G = window.SpiritualGPU; if (!G) return;
const d = document, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const KB = 18, CB = 3.2, GS = 9000, DRAG = 1.3, WINDAGE = 0.15, KSEP = 40, KT = 30, CT = 4.5, VMAX = 34, HOME = 0.12;
const MAXB = 14;
let env = null, prog = null, pflame = null, vao = null, bq = null, bi = null, atlas = null, I = new Float32Array(MAXB * 8), bodies = [], seed = 11, tier = 'rich', W = 0, Hh = 0, scale = 1, ac = null, tt = 0, ready = false, planted = false;
const L = () => G.lake, rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const o2 = [0, 0], o3 = [0, 0];
let tb = null, tbT = -9;
const words = () => { const el = env && env.host; if (!el) return; const hr = el.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
for (const q of el.querySelectorAll('.cx-open-line, .cx-open-sub, .cx-hi-hint:not([hidden])')) { const r = q.getBoundingClientRect(); if (r.width < 4) continue;
const rg = d.createRange(); rg.selectNodeContents(q); const t = rg.getBoundingClientRect(), u = t.width > 4 ? t : r; x0 = Math.min(x0, u.left - hr.left); x1 = Math.max(x1, u.right - hr.left); y0 = Math.min(y0, u.top - hr.top); y1 = Math.max(y1, u.bottom - hr.top); }
tb = x1 > x0 ? [x0 - 26, y0 - 18, x1 + 26, y1 + 30] : null; };
const inWords = (x, y, o) => { if (!tb) return 0; const px = 30; if (x < tb[0] - px || x > tb[2] + px || y < tb[1] - px || y > tb[3] + px) return 0;
const dl = x - tb[0], dr = tb[2] - x, du = y - tb[1], dd = tb[3] - y, m = Math.min(dl, dr, du * 1.6, dd);
if (o) { o[0] = m === dl ? -1 : m === dr ? 1 : 0; o[1] = m === dd ? 1 : m === du * 1.6 ? -1 : 0; }
return clamp((m + px) / (px + 30), 0, 1); };
const cap = () => (tier === 'rich' ? 14 : 8), start = () => { const l = L(), z = l.zone, a = (z[2] - z[0]) * l.cover[2] * (z[3] - z[1]) * l.cover[3]; return Math.max(4, Math.round((tier === 'rich' ? 10 : 5) * clamp(a / (900 * 330), 0.5, 1.2))); };
const sizeAt = (py) => { const l = L(), dp = l.depth(py); return clamp(l.W / 1366, 0.8, 1.15) * 24 * (0.5 + 0.65 * dp); };
const zonePx = () => { const l = L(), z = l.zone, c = l.cover; return [c[0] + z[0] * c[2], c[1] + z[1] * c[3], c[0] + z[2] * c[2], c[1] + z[3] * c[3]]; };
const paint = () => {
const cv = d.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); if (!g) return null;
g.beginPath(); g.moveTo(6, 29); g.bezierCurveTo(7, 46, 20, 55, 32, 55); g.bezierCurveTo(44, 55, 57, 46, 58, 29); g.closePath();
let gr = g.createLinearGradient(0, 28, 0, 55); gr.addColorStop(0, '#cf7a45'); gr.addColorStop(0.5, '#a24a25'); gr.addColorStop(1, '#5a2310'); g.fillStyle = gr; g.fill();
gr = g.createRadialGradient(20, 38, 2, 24, 40, 26); gr.addColorStop(0, 'rgba(255,196,140,.55)'); gr.addColorStop(1, 'rgba(255,196,140,0)'); g.fillStyle = gr; g.fill();
gr = g.createLinearGradient(0, 50, 0, 56); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,10,4,.55)'); g.fillStyle = gr; g.fill();
g.beginPath(); g.ellipse(32, 29, 26, 7.2, 0, 0, Math.PI * 2); g.fillStyle = '#e19a64'; g.fill();
g.beginPath(); g.ellipse(32, 29.6, 22.5, 5.4, 0, 0, Math.PI * 2); gr = g.createLinearGradient(0, 24, 0, 35); gr.addColorStop(0, '#3a1708'); gr.addColorStop(1, '#8a4512'); g.fillStyle = gr; g.fill();
g.beginPath(); g.ellipse(26, 28.4, 8, 1.7, -0.08, 0, Math.PI * 2); g.fillStyle = 'rgba(255,214,150,.38)'; g.fill();
g.lineWidth = 1.1; g.strokeStyle = 'rgba(255,226,180,.65)'; g.beginPath(); g.ellipse(32, 29, 25.4, 6.6, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
g.fillStyle = '#26110a'; g.fillRect(31, 22.5, 2, 7.5); g.fillStyle = '#ff9a3a'; g.fillRect(31, 22, 2, 1.6);
return cv;
};
const spawn = (x, y, delay) => {
const l = L(); const b = { x, y, vx: 0, vy: 0, z: 0, vz: 0, a: 0, w: 0, seed: rnd(), age: -delay, die: 0, hx: x, hy: y, sh: 0, al: 0, size: sizeAt(y) };
bodies.push(b); const live = bodies.filter((q) => !q.die); if (live.length > cap()) live[0].die = 0.0001;
return b;
};
const plant = () => {
const l = L(), z = zonePx(), n = start(); bodies.length = 0; words();
for (let k = 0, tries = 0; k < n && tries < 400; tries++) {
const x = z[0] + rnd() * (z[2] - z[0]), y = z[1] + rnd() * (z[3] - z[1]), s = sizeAt(y); let ok = inWords(x, y) === 0;
for (const q of bodies) if (Math.hypot(q.x - x, (q.y - y) * 2.2) < (s + q.size) * 1.9) { ok = false; break; }
if (ok) { spawn(x, y, k * 0.28 + rnd() * 0.5); k++; }
}
planted = true;
};
const fx = {
name: 'diya', order: 20, wants: () => true,
init(gl, e) {
env = e; prog = pflame = vao = bq = bi = atlas = null; ready = false;
const S = G.sh; if (!S) return;
prog = e.prog(S.BOWL_VS, S.BOWL_FS); pflame = e.prog(S.FLAME_VS, S.FLAME_FS); vao = e.vao(); bq = e.buf(); bi = e.buf();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, bq); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ARRAY_BUFFER, bi); gl.bufferData(gl.ARRAY_BUFFER, MAXB * 8 * 4, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(1, 1);
gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(2, 1);
gl.bindVertexArray(null);
const cv = paint(); if (cv) {
atlas = e.tex(); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.bindTexture(gl.TEXTURE_2D, null);
}
G.diya = api; if (G.debug && G.debug.water) G.debug.water.diyaCount = api.count;
},
resize(w, h, sc, t) { W = w; Hh = h; scale = sc; tier = t; tbT = -9; },
refresh() { tbT = -9; },
enter() {
ac = new AbortController(); const el = env.host;
el.addEventListener('click', (e) => {
const l = L(); if (!ready || !l.ready || e.target.closest('a,button,input,select,textarea,summary,label,[role]')) return;
l.toLocal(e.clientX, e.clientY, o2); if (!l.inWater(o2[0], o2[1]) || inWords(o2[0], o2[1]) > 0) return; const z = zonePx(); if (o2[1] < z[1] - 20) return;
for (const q of bodies) if (!q.die && Math.hypot(q.x - o2[0], (q.y - o2[1]) * 2) < q.size * 1.2) return;
const b = spawn(o2[0], o2[1], 0); b.hx = b.x; b.hy = b.y; l.disturb(o2[0], o2[1], 0.05, b.size * 1.6);
}, { signal: ac.signal, passive: true });
},
leave() { if (ac) { ac.abort(); ac = null; } },
update(dt) {
const l = L(); if (!l.ready) { ready = false; return; } ready = true; tt += dt;
if (!planted) plant();
if (tt - tbT > 2.5) { tbT = tt; words(); }
const zp = zonePx(), wind = G.windAt, o = o2, sl = o3, wo = [0, 0];
for (let i = bodies.length - 1; i >= 0; i--) {
const b = bodies[i]; b.age += dt; if (b.age < 0) continue;
if (b.die) { b.die += dt; if (b.die > 0.8) { bodies.splice(i, 1); continue; } }
b.size = sizeAt(b.y);
const h = l.hAt(b.x, b.y); l.slope(b.x, b.y, sl);
const zt = h * 150 * (0.6 + 0.4 * l.depth(b.y)); b.vz += (KB * (zt - b.z) - CB * b.vz) * dt; b.z += b.vz * dt;
let ax = -GS * sl[0], ay = -GS * sl[1] * 0.45, wx = 0, wy = 0;
if (wind) { wind(clamp(b.x, 0, W), clamp(b.y, 0, Hh), o); wx = o[0] * WINDAGE; wy = o[1] * WINDAGE * 0.4; }
ax += (wx - b.vx) * DRAG + HOME * (b.hx - b.x); ay += (wy - b.vy) * DRAG + HOME * (b.hy - b.y) * 1.4;
if (b.x < zp[0]) ax += 0.6 * (zp[0] - b.x); else if (b.x > zp[2]) ax -= 0.6 * (b.x - zp[2]);
if (b.y < zp[1]) ay += 0.6 * (zp[1] - b.y); else if (b.y > zp[3]) ay -= 0.6 * (b.y - zp[3]);
for (const q of bodies) { if (q === b || q.age < 0) continue; const dx = b.x - q.x, dy = (b.y - q.y) * 2.2, dd = Math.hypot(dx, dy), r = (b.size + q.size) * 0.95; if (dd < r && dd > 0.01) { const f = KSEP * (r - dd) / dd; ax += dx * f; ay += dy * f * 0.45; } }
{ const k = inWords(b.x, b.y, wo); b.wk = k; if (k > 0) { ax += wo[0] * 160 * k; ay += wo[1] * 160 * k; if (b.hx > tb[0] - 20 && b.hx < tb[2] + 20 && b.hy > tb[1] - 20 && b.hy < tb[3] + 20) { b.hx = b.x; b.hy = b.y; } } }
b.vx += ax * dt; b.vy += ay * dt; const sp = Math.hypot(b.vx, b.vy * 2); if (sp > VMAX * l.depth(b.y) + 14) { const k = (VMAX * l.depth(b.y) + 14) / sp; b.vx *= k; b.vy *= k; }
b.x += b.vx * dt; b.y += b.vy * dt;
const tgt = clamp(-sl[0] * l.sx * 26, -0.32, 0.32); b.w += (KT * (tgt - b.a) - CT * b.w) * dt; b.a += b.w * dt;
b.sh -= dt; if (b.sh <= 0 && b.age > 1 && l.coupling) { b.sh = 0.16; const m = Math.abs(b.vz) * 0.0003 + Math.hypot(b.vx, b.vy) * 0.00022; if (m > 0.0015) l.disturb(b.x, b.y + b.size * 0.2, Math.min(m, 0.008), b.size * 1.1); }
b.al = Math.min(1, b.age / 1.4) * (b.die ? Math.max(0, 1 - b.die / 0.8) : 1) * (1 - 0.85 * (b.wk || 0));
}
},
draw(gl, e) {
const l = L(); if (!ready || !prog || !prog.ok || !pflame || !pflame.ok || !atlas || !l.ready) { if (l) l.nl = 0; return; }
let n = 0, nl = 0; const f = l.fade;
for (const b of bodies) {
if (b.age < 0 || b.al <= 0.001) continue; const j = n * 8, k = n * 4, dp = l.depth(b.y), t = e.t;
const fl = 0.5 + 0.5 * (Math.sin(1.7 * t + b.seed * 17) + Math.sin(2.3 * t + b.seed * 31) * 0.6) / 1.6, inten = 0.88 + 0.24 * fl;
I[j] = b.x; I[j + 1] = b.y; I[j + 2] = b.size; I[j + 3] = b.a * 0.6; I[j + 4] = b.z * (0.04 + 0.04 * dp) * b.size / 19 * 4; I[j + 5] = b.al * f; I[j + 6] = b.seed; I[j + 7] = 0.6 + 0.4 * dp;
const c = l.cover; l.lights[k] = (b.x - c[0]) / c[2]; l.lights[k + 1] = (b.y - b.size * 0.19 - c[1]) / c[3]; l.lights[k + 2] = b.al * f * inten; l.lights[k + 3] = b.size * 1.5 / c[3];
n++;
}
l.nl = n; this.n = n; if (!n) return;
gl.bindBuffer(gl.ARRAY_BUFFER, bi); gl.bufferSubData(gl.ARRAY_BUFFER, 0, I, 0, n * 8);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.bindVertexArray(vao);
gl.useProgram(prog.p); gl.uniform2f(prog.loc('res'), W, Hh); gl.uniform1i(prog.loc('uAtlas'), 0); gl.uniform1f(prog.loc('uGlow'), 1);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
gl.useProgram(pflame.p); gl.uniform2f(pflame.loc('res'), W, Hh); gl.uniform1f(pflame.loc('uT'), e.t); gl.uniform1f(pflame.loc('uHalo'), 1);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); gl.bindVertexArray(null);
},
dispose() { if (ac) { ac.abort(); ac = null; } bodies.length = 0; planted = false; ready = false; tb = null; env = prog = pflame = vao = bq = bi = atlas = null; G.diya = null; },
};
const api = {
count: () => bodies.filter((b) => !b.die && b.age > 0).length,
bodies: () => bodies.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), vx: +b.vx.toFixed(1), vy: +b.vy.toFixed(1), z: +b.z.toFixed(2), a: +b.a.toFixed(3), al: +b.al.toFixed(2) })),
drawFlames(rt) {
const gl = env && env.gl; if (!gl || !fx.n || !pflame || !pflame.ok) return;
env.bind(rt); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.bindVertexArray(vao);
gl.useProgram(pflame.p); gl.uniform2f(pflame.loc('res'), W, Hh); gl.uniform1f(pflame.loc('uT'), env.t); gl.uniform1f(pflame.loc('uHalo'), 1.6);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, fx.n); gl.bindVertexArray(null); env.bind(null);
},
};
fx.n = 0;
G.register(fx);
})();
