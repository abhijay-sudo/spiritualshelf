(() => {
const G = window.SpiritualGPU; if (!G) return;
const d = document, R = d.documentElement, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const C2X = 0.40, ANIS = 0.32, DAMP = 0.006, SPONGE = 6, GAIN_PTR = 0.62;
const L = G.lake = { ready: false, fade: 0, nx: 0, ny: 0, H: null, lights: new Float32Array(14 * 4), nl: 0, cover: [0, 0, 1, 1], box: [0, 0.5, 1, 1], W: 0, H_: 0, wl: 0.5, sun: [0.5, 0.45], tint: [1, 0.74, 0.46], zone: [0, 0, 1, 1], asp: 16 / 9, sx: 1, sy: 1, x0: 0, y0: 0, tier: 'rich', hero: null, ambient: true, coupling: true, gl4: new Float32Array(8), tapHook: null };
let cfg = null, el = null, env = null, tierName = 'rich', W = 0, Hh = 0, scale = 1, nx = 0, ny = 0;
let A = null, B = null, Cn = null, MK = null, MKb = null, DM = null, CX = null, CY = null;
let progs = null, tex = null, texH = null, texM = null, texKey = '', texState = 0, tw = 0, th = 0, gen = 0, gpu = 0;
let t = 0, t0 = -1, quiet = true, dirty = false, bucket = 1.2, nextDrop = 1.2, seed = 7, away = 0, awayT = 0, ac = null, mo = null, io = null, seen = false, top0 = 0, left0 = 0, listening = false;
const ptr = { x: 0, y: 0, px: 0, py: 0, on: false, v: 0, pend: false, t: 0 };
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const introOver = () => !R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end');
const parse = (e) => { let c = null; try { c = JSON.parse(e.dataset.fxWater || 'null'); } catch (x) {} c = c || {}; return { mask: c.mask || [[0, 0.512], [1, 0.512], [1, 1], [0, 1]], wl: c.waterline || 0.5, light: c.light || [0.497, 0.455], color: c.color || [1, 0.74, 0.46], zone: c.diyaZone || [0.06, 0.6, 0.94, 0.95], portrait: c.portrait || {} }; };
const candidates = (img, portrait) => {
const src = portrait ? (img.parentNode.querySelector('source[srcset]') || {}).srcset : img.srcset; const out = [];
for (const part of String(src || '').split(',')) { const m = part.trim().match(/^(\S+)\s+(\d+)w$/); if (m) out.push({ u: m[1], w: +m[2] }); }
return out.sort((a, b) => a.w - b.w);
};
const want = (img) => {
const portrait = /portrait/.test(img.currentSrc || img.src), list = candidates(img, portrait); if (!list.length) return null;
const cap = portrait ? 608 : tierName === 'rich' ? 1920 : 960, need = L.cover[2] * scale * 0.75;
const ok = list.filter((c) => c.w <= cap); const pool = ok.length ? ok : list.slice(0, 1);
const pickC = pool.find((c) => c.w >= need) || pool[pool.length - 1];
return { url: pickC.u, w: pickC.w, key: (portrait ? 'p' : 'l') + pickC.w, portrait };
};
const loadTex = (img) => {
const w = want(img); if (!w || texState === 1 || (texState === 2 && texKey === w.key)) return;
texState = 1; const my = ++gen;
fetch(w.url, { credentials: 'same-origin' }).then((r) => (r.ok ? r.blob() : Promise.reject(0))).then((b) => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then((bm) => {
if (my !== gen || !env || !env.gl) { bm.close(); return; }
const gl = env.gl; if (tex) env.del(tex);
tex = env.tex(); gl.bindTexture(gl.TEXTURE_2D, tex);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
const lv = Math.floor(Math.log2(Math.max(bm.width, bm.height))) + 1;
gl.texStorage2D(gl.TEXTURE_2D, lv, gl.RGBA8, bm.width, bm.height); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bm);
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
tw = bm.width; th = bm.height; bm.close(); texKey = w.key; texState = 2; L.asp = tw / th; layout(true);
}).catch(() => { if (my === gen) texState = 3; });
};
const layout = (force) => {
if (!W || !Hh || !el) return;
const img = el.querySelector('img.ed-still'), op = img ? (getComputedStyle(img).objectPosition || '50% 50%').split(' ') : ['50%', '50%'];
const pct = (v) => (/%$/.test(v || '') ? parseFloat(v) / 100 : 0.5);
if (img && texState !== 2) L.asp = /portrait/.test(img.currentSrc || img.src) ? 608 / 1080 : 16 / 9;
const asp = L.asp;
const por = asp < 1, o = por ? cfg.portrait : {};
const dw = W / Hh > asp ? W : Hh * asp, dh = dw / asp, l = (W - dw) * pct(op[0]), tp = (Hh - dh) * pct(op[1] || op[0]);
L.cover = [l, tp, dw, dh]; L.W = W; L.H_ = Hh; L.scale = scale; L.wl = cfg.wl; L.sun = o.light || cfg.light; L.tint = cfg.color; L.zone = o.diyaZone || cfg.zone; L.hero = img;
let u0 = 1, v0 = 1, u1 = 0, v1 = 0; for (const [u, v] of cfg.mask) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
L.box = [u0, v0, u1, v1];
/* Ultra: a finer grid, up to 384 across, so the wake and a petal's ring keep their shape */ const U = env && env.U && env.U.f.grid ? env.U : null, bw = (u1 - u0) * dw, bh = (v1 - v0) * dh, budget = Math.min(U ? 1.7e5 * Math.pow(U.f.grid / 384, 2) : tierName === 'rich' ? 36000 : 14000, bw * bh / 9);
let gx = Math.round(Math.sqrt(budget * bw / bh)); gx = clamp(gx, 48, U ? U.f.grid : 440); let gy = Math.max(24, Math.round(budget / gx));
if (!force && A && Math.abs(gx - nx) / nx < 0.08 && Math.abs(gy - ny) / ny < 0.08) { fixXY(); return; }
nx = gx; ny = gy; alloc(); fixXY();
};
const fixXY = () => { const b = L.box, c = L.cover; L.sx = (b[2] - b[0]) * c[2] / nx; L.sy = (b[3] - b[1]) * c[3] / ny; L.x0 = c[0] + b[0] * c[2]; L.y0 = c[1] + b[1] * c[3]; L.nx = nx; L.ny = ny; };
const alloc = () => {
A = new Float32Array(nx * ny); B = new Float32Array(nx * ny); Cn = new Float32Array(nx * ny); L.H = A;
MK = new Uint8Array(nx * ny); MKb = new Uint8Array(nx * ny); DM = new Float32Array(nx * ny); CX = new Float32Array(ny); CY = new Float32Array(ny);
const cv = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(nx, ny) : Object.assign(d.createElement('canvas'), { width: nx, height: ny }), g = cv.getContext('2d'), b = L.box;
g.fillStyle = '#fff'; g.beginPath(); cfg.mask.forEach(([u, v], i) => { const x = (u - b[0]) / (b[2] - b[0]) * nx, y = (v - b[1]) / (b[3] - b[1]) * ny; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill();
const px = g.getImageData(0, 0, nx, ny).data; for (let k = 0; k < nx * ny; k++) { MKb[k] = px[k * 4 + 3]; MK[k] = MKb[k] > 127 ? 1 : 0; }
const dist = new Float32Array(nx * ny), BIG = 1e4;
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; dist[k] = !MK[k] || i === 0 || j === 0 || i === nx - 1 || j === ny - 1 ? 0 : BIG; }
for (let j = 1; j < ny; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; dist[k] = Math.min(dist[k], dist[k - 1] + 1, dist[k - nx] + 1, dist[k - nx - 1] + 1.41, dist[k - nx + 1] + 1.41); }
for (let j = ny - 2; j >= 0; j--) for (let i = nx - 2; i > 0; i--) { const k = j * nx + i; dist[k] = Math.min(dist[k], dist[k + 1] + 1, dist[k + nx] + 1, dist[k + nx - 1] + 1.41, dist[k + nx + 1] + 1.41); }
for (let k = 0; k < nx * ny; k++) { const s = Math.max(0, 1 - dist[k] / SPONGE); DM[k] = DAMP + (0.25 - DAMP) * s * s; }
for (let j = 0; j < ny; j++) { const v = b[1] + (j + 0.5) / ny * (b[3] - b[1]), dd = clamp((v - L.wl) / (1 - L.wl), 0, 1), s = 0.2 + 0.8 * sstep(0, 1, Math.pow(dd, 0.8)); CX[j] = C2X * s; CY[j] = C2X * s * ANIS; }
quiet = true; dirty = true; gpuFree(); L.ready = false;
};
const splat = (cx, cy, amp, sg) => {
const sy = sg * 0.62, rx = Math.ceil(sg * 3), ry = Math.ceil(sy * 3), i0 = Math.max(1, Math.floor(cx - rx)), i1 = Math.min(nx - 2, Math.ceil(cx + rx)), j0 = Math.max(1, Math.floor(cy - ry)), j1 = Math.min(ny - 2, Math.ceil(cy + ry));
const ix = 1 / (sg * sg), iy = 1 / (sy * sy);
for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * nx + i; if (!MK[k]) continue; const dx = i - cx, dy = j - cy; A[k] = clamp(A[k] + amp * Math.exp(-(dx * dx * ix + dy * dy * iy)), -1, 1); }
quiet = false;
};
const cellOf = (px, py, o) => { o[0] = (px - L.x0) / L.sx - 0.5; o[1] = (py - L.y0) / L.sy - 0.5; };
const spend = (a) => { const s = Math.min(1, bucket / Math.max(a, 1e-6)); bucket = Math.max(0, bucket - a * s); return s; };   // the energy a second may inject is capped, so a scribble cannot blow the field up
const c = [0, 0];
L.disturb = (px, py, amp, pxWidth) => { if (!A) return; cellOf(px, py, c); if (c[0] < 1 || c[1] < 1 || c[0] > nx - 2 || c[1] > ny - 2) return; const s = spend(Math.abs(amp)); if (s > 0.05) splat(c[0], c[1], amp * s, Math.max(1.5, pxWidth / L.sx)); };
L.inWater = (px, py) => { if (!A) return false; cellOf(px, py, c); const i = Math.round(c[0]), j = Math.round(c[1]); return i > SPONGE && j > SPONGE && i < nx - SPONGE && j < ny - SPONGE && !!MK[j * nx + i]; };
L.hAt = (px, py) => { if (!A) return 0; cellOf(px, py, c); const x = clamp(c[0], 0, nx - 1.001), y = clamp(c[1], 0, ny - 1.001), i = x | 0, j = y | 0, fx = x - i, fy = y - j, k = j * nx + i; return (A[k] * (1 - fx) + A[k + 1] * fx) * (1 - fy) + (A[k + nx] * (1 - fx) + A[k + nx + 1] * fx) * fy; };
L.slope = (px, py, o) => { if (!A) { o[0] = o[1] = 0; return; } cellOf(px, py, c); const i = clamp(Math.round(c[0]), 1, nx - 2), j = clamp(Math.round(c[1]), 1, ny - 2), k = j * nx + i; o[0] = (A[k + 1] - A[k - 1]) / (2 * L.sx); o[1] = (A[k + nx] - A[k - nx]) / (2 * L.sy); };
L.toPx = (u, v, o) => { o[0] = L.cover[0] + u * L.cover[2]; o[1] = L.cover[1] + v * L.cover[3]; };
L.toLocal = (cx, cy, o) => { o[0] = cx - (left0 - window.scrollX); o[1] = cy - (top0 - window.scrollY); };
L.tex = () => (texState === 2 ? tex : null);
L.depth = (py) => clamp(((py - L.cover[1]) / L.cover[3] - L.wl) / (1 - L.wl), 0, 1);
const stepSim = () => {
const a = A, p = B, n = Cn; let pk = 0;
for (let j = 1; j < ny - 1; j++) {
const cx = CX[j], cy = CY[j], row = j * nx;
for (let i = 1; i < nx - 1; i++) {
const k = row + i, h = a[k], pv = p[k], v = 2 * h - pv + cx * (a[k - 1] + a[k + 1] - 2 * h) + cy * (a[k - nx] + a[k + nx] - 2 * h) - DM[k] * (h - pv);
const w = v > 1 ? 1 : v < -1 ? -1 : v; n[k] = MK[k] ? w : 0; const m = w < 0 ? -w : w; if (m > pk) pk = m;
}
}
Cn = p; B = a; A = n; L.H = A; return pk;
};
const progLoc = (P, gl, u) => { for (const k in u) { const v = u[k], l = P.loc(k); if (l == null) continue; if (typeof v === 'number') gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else gl.uniform4fv(l, v); } };
const gpuFree = () => { if (!env || !env.gl) { texH = texM = null; gpu = 0; return; } if (texH) env.del(texH); if (texM) env.del(texM); texH = texM = null; gpu = 0; };
const gpuMake = (gl) => {
texH = env.tex(); gl.bindTexture(gl.TEXTURE_2D, texH); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R16F, nx, ny);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
texM = env.tex(); gl.bindTexture(gl.TEXTURE_2D, texM); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, nx, ny); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RED, gl.UNSIGNED_BYTE, MKb); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.bindTexture(gl.TEXTURE_2D, null); gpu = 1; dirty = true;
};
const uniforms = (P, gl, bw, bh, sc, fade) => {
gl.useProgram(P.p);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.loc('uTex'), 0);
gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texH); gl.uniform1i(P.loc('uH'), 1);
gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texM); gl.uniform1i(P.loc('uM'), 2);
gl.uniform4fv(P.loc('uGl'), L.gl4);
progLoc(P, gl, { uCover: L.cover, uBox: L.box, uBuf: [bw, bh], uTexel: [1 / nx, 1 / ny], uSun: L.sun, uScale: sc, uT: t, uFade: fade, uWL: L.wl, uAsp: L.asp, uK: 11, uChop: 0.045, uTint: L.tint });
if (P.ult) {   // Ultra's own: its strength (eased by ultra.js), its three switches and where the floating petals are (for the light under them)
const U = env.U, f = U && U.f; gl.uniform1f(P.loc('uU'), U ? U.shade : 0); gl.uniform3f(P.loc('uUk'), f && f.fine ? 1 : 0, f && f.caustics ? 1 : 0, f && f.glitter ? 1 : 0);
waveTable(t); gl.uniform4fv(P.loc('uWa'), WA); gl.uniform2fv(P.loc('uWb'), WB);
ca.fill(0); if (U && f.caustics && G.rigid && G.rigid.spots) { const n = G.rigid.spots(sp); for (let i = 0; i < Math.min(4, n); i++) { ca[i * 4] = (sp[i * 2] - L.cover[0]) / L.cover[2]; ca[i * 4 + 1] = (sp[i * 2 + 1] - L.cover[1]) / L.cover[3]; ca[i * 4 + 2] = 0.05; ca[i * 4 + 3] = 1; } }
gl.uniform4fv(P.loc('uCa'), ca);
}
};
const ca = new Float32Array(16), sp = new Float32Array(12);
const WA = new Float32Array(120), WB = new Float32Array(60), TAU = Math.PI * 2, GRAV = 5.8;
const fr = (x) => x - Math.floor(x), hash2 = (px, py) => { let qx = fr(px * 0.1031), qy = fr(py * 0.1031), qz = qx; const dd = qx * (qy + 33.33) + qy * (qz + 33.33) + qz * (qx + 33.33); qx += dd; qy += dd; qz += dd; return fr((qx + qy) * qz); };
const COMP = []; for (let i = 0; i < 30; i++) {
const fine = i >= 16, j = fine ? i - 16 : i, fi = fine ? j / 13 : j / 15, lam = fine ? 0.30 * Math.pow(0.14, fi) : 3.4 * Math.pow(0.085, fi), k = TAU / lam;
const r1 = fine ? hash2(j * 3.71, 5.3) : hash2(j * 1.37, 1.7), r2 = fine ? hash2(j * 1.93, 2.9) : hash2(j * 2.11, 9.1);
COMP.push({ k, r2, w: (fine ? 0.15 : 0.25) * Math.sqrt(GRAV * k), spread: fine ? 0.55 : 0.32 + (0.95 - 0.32) * fi, r1, amp: fine ? 0.058 * Math.pow(k / 20, -0.08) : Math.pow(k / 6, 0.32) * (0.55 + 0.45 * sstep(0, 0.4, fi)), gm: fine ? 0 : sstep(0.25, 0.8, fi) });
}
const waveTable = (tt) => {
const wind = 0.62 * Math.sin(tt * 0.0571) + 0.2 * Math.sin(tt * 0.0233 + 1.3);
for (let i = 0; i < 30; i++) { const c = COMP[i], a = wind + 0.22 + (c.r1 * 2 - 1) * c.spread; WA[i * 4] = Math.sin(a); WA[i * 4 + 1] = -Math.cos(a); WA[i * 4 + 2] = c.k; WA[i * 4 + 3] = fr((c.r2 * TAU - c.w * tt) / TAU) * TAU; WB[i * 2] = c.amp; WB[i * 2 + 1] = c.gm; }
};
L.drawBright = (rt) => {
const gl = env.gl, U = env.U, P = progs && (U && (U.f.fine || U.f.caustics || U.f.glitter) && progs.b3 && progs.b3.ok ? progs.b3 : progs.bright); if (!L.ready || !P || !P.ok || !texH) return;
env.bind(rt); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
uniforms(P, gl, rt.w, rt.h, rt.w / W, L.fade); env.tri(); env.bind(null);
};
const fx = {
name: 'water', order: 10,
z: () => -1, anchor: (host) => host.querySelector('.cx-open-media'),
wants: () => true,
init(gl, e) {
env = e; progs = null; tex = texH = texM = null; texState = 0; texKey = ''; gpu = 0; L.ready = false; gen++;
const S = G.sh; if (!S) return;
progs = { m2: e.prog(S.TRI, S.water(2, false)), m1: e.prog(S.TRI, S.water(1, false)), m0: e.prog(S.TRI, S.water(0, false)), bright: e.prog(S.TRI, S.water(2, true)) };
if (G.debug) G.debug.water = debugApi;
},
up(gl, e) { const S = G.sh; if (!S || !progs || progs.m3) return; progs.m3 = e.prog(S.TRI, S.water(2, false, true)); progs.m3.ult = true; progs.b3 = e.prog(S.TRI, S.water(2, true, true)); progs.b3.ult = true; },
resize(w, h, sc, tier) {
W = w; Hh = h; scale = sc; tierName = tier; L.tier = tier; L.scale = sc;
if (!el) return;
layout(false); const top = el.getBoundingClientRect(); top0 = top.top + window.scrollY; left0 = top.left + window.scrollX;
const img = el.querySelector('img.ed-still'); if (img && texState !== 1) loadTex(img);
},
enter() {
el = env.host; if (!el || !G.sh) return; cfg = parse(el); seen = introOver(); t0 = seen ? 0 : -1; t = 0; L.fade = 0;
ac = new AbortController(); const o = { signal: ac.signal, passive: true };
const opts = o;
el.addEventListener('pointermove', onMove, opts); el.addEventListener('pointerdown', onDown, opts); listening = true;
mo = new MutationObserver(() => { if (!seen && introOver()) { seen = true; t0 = t; } }); mo.observe(R, { attributes: true, attributeFilter: ['class'] });
io = new IntersectionObserver((es) => { for (const x of es) { if (x.isIntersecting) { away = 0; if (awayT) { clearTimeout(awayT); awayT = 0; } if (!A || !texH) wake(); } else if (!away) { away = 1; awayT = setTimeout(sleep, 5000); } } }, { rootMargin: '25% 0px 25% 0px' }); io.observe(el);
layout(true); const r = el.getBoundingClientRect(); top0 = r.top + window.scrollY; left0 = r.left + window.scrollX;
const img = el.querySelector('img.ed-still'); if (img) { if (img.complete) loadTex(img); else img.addEventListener('load', () => loadTex(img), { once: true, signal: ac.signal }); }
},
leave() { release(); },
update(dt, inp) {
if (!A || !seen) return;
t += dt;
const fade = L.fade = t0 < 0 ? 0 : sstep(0, 1, (t - t0) / 1.2);
bucket = Math.min(1.6, bucket + dt * 1.2);
if (ptr.pend) {
ptr.pend = false; const dx = ptr.x - ptr.px, dy = ptr.y - ptr.py, dist = Math.hypot(dx, dy);
if (ptr.on && dist > 0.5 && L.inWater(ptr.x, ptr.y)) {
const amp = 0.05 * GAIN_PTR * Math.min(ptr.v, 1200) / 1200, sg = clamp(2.2 * (nx / 192), 2.4, 4.5), n = Math.min(12, Math.ceil(dist / (sg * L.sx * 1.2)));
for (let k = 1; k <= n; k++) L.disturb(ptr.px + dx * k / n, ptr.py + dy * k / n, amp / Math.sqrt(n), sg * L.sx);
}
ptr.px = ptr.x; ptr.py = ptr.y;
}
if (L.ambient && t > nextDrop) {
nextDrop = t + 7 + rnd() * 9;
if (G.lake.hero) { const z = L.zone, u = z[0] + rnd() * (z[2] - z[0]), v = clamp(z[1] + rnd() * (z[3] - z[1]), L.box[1] + 0.06, 0.98); L.disturb(L.cover[0] + u * L.cover[2], L.cover[1] + v * L.cover[3], 0.022 + rnd() * 0.03, 5 + rnd() * 5); }
}
const sv = inp ? inp.scrollVel : 0;
if (Math.abs(sv) > 120) { const sw = clamp(sv / 1500, -1, 1) * 0.009, j0 = SPONGE + 3; for (let j = j0; j < j0 + 2; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; if (MK[k]) A[k] = clamp(A[k] + sw * Math.sin(i / nx * 21 - t * 4.4) * (j === j0 ? 1 : 0.6), -1, 1); } quiet = false; }
if (!quiet) {
const subs = tierName === 'rich' ? 2 : 1; let pk = 0; for (let s = 0; s < subs; s++) pk = stepSim();
dirty = true; if (pk < 2e-5) { quiet = true; A.fill(0); B.fill(0); Cn.fill(0); }
}
},
draw(gl, e) {
if (!A || !progs || !L.fade) { L.ready = false; return; }
const mode = texState === 2 ? (tierName === 'rich' ? (e.U && (e.U.f.fine || e.U.f.caustics || e.U.f.glitter) && progs.m3 && progs.m3.ok ? 'm3' : 'm2') : 'm1') : 'm0', P = progs[mode];
if (!P || !P.ok) return;
if (!gpu) gpuMake(gl);
if (dirty) { gl.bindTexture(gl.TEXTURE_2D, texH); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RED, gl.FLOAT, A); dirty = false; }
L.ready = true;
if (R.dataset.fxWater !== 'live') R.dataset.fxWater = 'live';
uniforms(P, gl, e.bw, e.bh, scale, L.fade);
const c0 = L.cover, b = L.box, sc = scale;
const x0 = Math.max(0, Math.floor((c0[0] + b[0] * c0[2]) * sc)), x1 = Math.min(e.bw, Math.ceil((c0[0] + b[2] * c0[2]) * sc)), y0 = Math.max(0, Math.floor((c0[1] + b[1] * c0[3]) * sc)), y1 = Math.min(e.bh, Math.ceil((c0[1] + b[3] * c0[3]) * sc));
if (x1 <= x0 || y1 <= y0) return;
gl.enable(gl.SCISSOR_TEST); gl.scissor(x0, e.bh - y1, x1 - x0, y1 - y0);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
e.tri(); gl.disable(gl.SCISSOR_TEST);
},
dispose() { release(); R.dataset.fxWater = 'off'; env = null; progs = null; },
};
const sleep = () => { awayT = 0; if (!env || !env.gl) return; gen++; if (tex) env.del(tex); tex = null; texState = 0; texKey = ''; gpuFree(); L.ready = false; A = B = Cn = null; L.H = null; nx = ny = 0; R.dataset.fxWater = 'off'; };
const wake = () => { if (!el || !env || !env.gl) return; layout(true); const img = el.querySelector('img.ed-still'); if (img) loadTex(img); };
const release = () => {
gen++; if (ac) { ac.abort(); ac = null; } if (mo) { mo.disconnect(); mo = null; } if (io) { io.disconnect(); io = null; } if (awayT) { clearTimeout(awayT); awayT = 0; } away = 0; listening = false;
if (env && env.gl) { if (tex) env.del(tex); gpuFree(); }
A = B = Cn = MK = MKb = DM = CX = CY = null; L.H = null; L.ready = false; L.fade = 0; L.nl = 0; tex = texH = texM = null; texState = 0; texKey = ''; gpu = 0; nx = ny = 0; el = null; R.dataset.fxWater = 'off';
};
const onMove = (e) => {
if (!A) return; const now = performance.now(); L.toLocal(e.clientX, e.clientY, c);
const dt = Math.max(8, now - ptr.t) / 1000, sp = ptr.on ? Math.hypot(c[0] - ptr.x, c[1] - ptr.y) / dt : 0;
if (!ptr.on || now - ptr.t > 250) { ptr.px = c[0]; ptr.py = c[1]; ptr.v = 0; } else ptr.v = ptr.v * 0.5 + sp * 0.5;
ptr.x = c[0]; ptr.y = c[1]; ptr.on = true; ptr.t = now; ptr.pend = true;
};
const onDown = (e) => {
if (!A || !seen || e.target.closest('a,button,input,select,textarea,summary,label,[role]')) return; L.toLocal(e.clientX, e.clientY, c);
ptr.px = ptr.x = c[0]; ptr.py = ptr.y = c[1]; ptr.on = true; ptr.t = performance.now(); ptr.v = 0;
if (L.tapHook && L.tapHook(c[0], c[1], e)) return;   // Ultra: the rigid-body layer takes the touch (a petal is offered, and its landing makes the ring)
if (L.inWater(c[0], c[1])) L.disturb(c[0], c[1], 0.09, 3 * L.sx * Math.max(1, nx / 192) * 0.9);
};
const debugApi = {
energy: () => { if (!A) return 0; let s = 0; for (let k = 0; k < A.length; k++) s += A[k] * A[k]; return s; },
maxHeight: () => { if (!A) return 0; let m = 0; for (let k = 0; k < A.length; k++) { const v = Math.abs(A[k]); if (v > m) m = v; } return m; },
diyaCount: () => (G.diya ? G.diya.count() : 0), bodies: () => (G.diya ? G.diya.bodies() : []),
grid: () => ({ nx, ny, tex: texState, texKey, mode: texState === 2 ? tierName : 'overlay', fade: +L.fade.toFixed(2), cover: L.cover.map((v) => Math.round(v)), box: L.box }),
splat: (u, v, amp, sg) => L.disturb(L.cover[0] + u * L.cover[2], L.cover[1] + v * L.cover[3], amp, (sg || 6) * L.sx), ambient: (v) => { L.ambient = !!v; }, coupling: (v) => { L.coupling = !!v; }, state: () => ({ seen, quiet, away, listening }),
};
G.register(fx);
})();
