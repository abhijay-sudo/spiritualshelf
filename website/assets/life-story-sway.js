const MW = 192;   // the mask's width in texels (its height follows the painting)
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function hsv(r, g, b) {
const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
if (d > 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
return [h, mx === 0 ? 0 : d / mx, mx];
}
function blur(src, w, h, ch, n) {   // a box blur, n passes, on one channel of an interleaved (stride 4) float array
const t = new Float32Array(w * h);
for (let p = 0; p < n; p++) {
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let k = -1; k <= 1; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[(y * w + xx) * 4 + ch]; c++; } } t[y * w + x] = s / c; }
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let k = -1; k <= 1; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += t[yy * w + x]; c++; } } src[(y * w + x) * 4 + ch] = s / c; }
}
}
export function buildMask(rgba, w, h, faces = []) {
const N = w * h, out = new Float32Array(N * 4), fl = new Uint8Array(N); let fo = 0, wa = 0, sr = 0, sg = 0, sb = 0, vs = 0;
for (let y = 0; y < h; y++) {
const yy = y / h;
for (let x = 0; x < w; x++) {
const i = y * w + x, r = rgba[i * 4] / 255, g = rgba[i * 4 + 1] / 255, b = rgba[i * 4 + 2] / 255, [H, S, V] = hsv(r, g, b); vs += V;
if (H >= 62 && H <= 168 && S > 0.2 && V > 0.1 && V < 0.93) { const q = sstep(0.2, 0.42, S) * sstep(0.1, 0.22, V); out[i * 4] = q; fo += q; sr += r * q; sg += g * q; sb += b * q; }
if (H >= 172 && H <= 236 && S > 0.3 && V > 0.2 && yy > 0.5) { const q = sstep(0.3, 0.45, S) * sstep(0.2, 0.34, V) * sstep(0.5, 0.58, yy); out[i * 4 + 1] = q; wa += q; }
if (H >= 12 && H <= 46 && S > 0.72 && V > 0.96) fl[i] = 1;
}
}
const seen = new Uint8Array(N), stack = []; let flames = 0; const dark = vs / N < 0.58;   // (a bright, golden painting has no flame to speak of: its gold is not one)
for (let s0 = 0; s0 < N && dark; s0++) {
if (!fl[s0] || seen[s0]) continue;
const cells = []; let x0 = w, x1 = 0, y0 = h, y1 = 0; stack.push(s0); seen[s0] = 1;
while (stack.length) {
const c = stack.pop(); cells.push(c); const cx = c % w, cy = (c / w) | 0; if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (fl[j] && !seen[j]) { seen[j] = 1; stack.push(j); } }
}
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
if (cells.length >= 3 && cells.length <= N * 0.0015 && bh >= bw * 1.0) { flames++; for (const c of cells) out[c * 4 + 2] = 1; }
}
for (const f of faces) {
const cx = (f[0] / 100) * w, cy = (f[1] / 100) * h, r = Math.max(2, (f[2] / 100) * w * 0.78), small = f[2] < 3.5, reach = cy + r * (small ? 7 : 40);
for (let y = Math.max(0, Math.floor(cy - r * 1.7)); y < h; y++) for (let x = 0; x < w; x++) {
const dx = x - cx, dy = y - cy;
let p = 1 - sstep(1, 1.75, Math.hypot(dx / (r * 1.35), dy / (r * 1.5)));   // the head, with its hair
if (dy > r * 0.4 && y < reach) { const hw = r * (1.9 + Math.min(dy / r, 6) * 0.38); p = Math.max(p, (1 - sstep(0.8, 1.35, Math.abs(dx) / hw)) * sstep(r * 0.2, r * 1.0, dy)); }
if (p > out[(y * w + x) * 4 + 3]) out[(y * w + x) * 4 + 3] = p;
}
}
blur(out, w, h, 0, 2); blur(out, w, h, 1, 2); blur(out, w, h, 2, 1); blur(out, w, h, 3, 1);
const data = new Uint8Array(N * 4); for (let i = 0; i < N * 4; i++) data[i] = Math.round(Math.min(1, Math.max(0, out[i])) * 255);
let free = 0; for (let i = 0; i < N; i++) free += (Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) / 255) * (1 - data[i * 4 + 3] / 255);
const nf = fo || 1;
return { data, w, h, stats: { foliage: fo / N, water: wa / N, flames, free: free / N }, tint: [sr / nf, sg / nf, sb / nf] };
}
const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D uImg, uMask; uniform float uT, uAmp, uGust, uFlick; uniform vec2 uTexel;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ return .6 * vn(p) + .4 * vn(p * 2.07 + 7.3); }
void main(){
vec4 m = texture(uMask, v);
float free = 1. - smoothstep(.12, .7, m.a);
float fo = m.r * free, wa = m.g * free, fl = m.b * free, cover = max(max(fo, wa), fl);
if (cover < .012) { o = vec4(0.); return; }
float t = uT, g = 1. + uGust * 1.5; vec2 d = vec2(0.);
float n1 = fbm(v * vec2(8., 6.) + vec2(t * .21, t * .12)) - .5, n2 = fbm(v * vec2(22., 16.) + vec2(-t * .4, t * .29)) - .5;
d += fo * vec2(n1 * 2.1 + n2 * 1.2, n2 * .8) * g;
float rip = sin(v.y * 260. + t * 1.7 + fbm(v * vec2(6., 2.) + t * .1) * 6.);
d += wa * vec2(rip * .6, sin(v.x * 80. + t * 1.1) * .14);
float fk = fbm(v * vec2(110., 55.) + vec2(0., -t * 3.4)) - .5;
d += fl * vec2(fk * .9, -abs(fk) * 1.1);
vec3 c = texture(uImg, v + d * uAmp * uTexel).rgb;
float gl = pow(clamp(fbm(v * vec2(70., 210.) + vec2(t * .5, t * .2)) * 1.7 - .5, 0., 1.), 3.);
c += wa * gl * .09 * vec3(1., .96, .88);
c *= 1. + fl * (sin(t * 9. + fbm(v * 30. + t) * 12.) * .5) * .13 * uFlick;
float a = smoothstep(0., .5, cover);
o = vec4(c * a, a);
}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function mount(ctx) {
const R = document.documentElement, main = document.querySelector('[data-reader]'); if (!main || !ctx.caps.webgl) return;
let stage = null; for (let i = 0; i < 40 && !stage; i++) { stage = document.querySelector('.fm-stage'); if (!stage) await wait(150); if (ctx.signal.aborted) return; }
if (!stage) return;
const layers = Array.from(stage.querySelectorAll('.fm-ly')).map((el) => ({ el, cam: el.querySelector('.fm-cam'), img: el.querySelector('.fm-cam img') })); if (layers.length < 2) return;
const stem = (u) => { const m = /((?:shot|scene)-[^/?#]*?)-\d{3,4}\.webp/.exec(u || ''); return m ? m[1] : ''; };
const sceneBy = new Map(); for (const s of main.querySelectorAll('.scene')) { const im = s.querySelector('.shot img'); const u = im && (im.getAttribute('srcset') || im.getAttribute('src') || ''); const k = stem(u.split(',')[0]); if (k) sceneBy.set(k, s); }
const stripped = []; for (const s of main.querySelectorAll('.scene[data-life-sway][data-depth]')) { stripped.push([s, s.dataset.depth]); delete s.dataset.depth; }
const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.setAttribute('data-life-story', 'sway'); cv.className = 'ls-sway';
const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false }); if (!gl) return;
const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog); const U = {}; for (const n of ['uImg', 'uMask', 'uT', 'uAmp', 'uGust', 'uFlick', 'uTexel']) U[n] = gl.getUniformLocation(prog, n);
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uMask, 1); gl.disable(gl.BLEND);
const tex = (unit, filter) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); return t; };
const texImg = tex(0, gl.LINEAR_MIPMAP_LINEAR), texMask = tex(1, gl.LINEAR);
const phone = !!ctx.caps.phone, depthUp = () => !!stage.querySelector('.fm-cam canvas:not([data-life-story])');
const cache = new Map();   // stem -> mask | null (a painting with nothing worth moving)
let cur = null, tOn = 0, gust = 0, on = true, dropped = false, since = 0, seq = 0, backing = [0, 0];
const amp = ctx.tier === 'ultra' ? 1.7 : 1.4, period = ctx.tier === 'ultra' ? 0 : 33;   // (Rich draws at about 30 a second, Ultra at the display's rate)
const maskOf = (key, img, scene) => {
if (cache.has(key)) return cache.get(key);
const cw = MW, ch = Math.max(8, Math.round(MW * img.naturalHeight / img.naturalWidth)), c2 = document.createElement('canvas'); c2.width = cw; c2.height = ch;
const x = c2.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, cw, ch);
const faces = (scene && scene.dataset.lifeFaces || '').split(';').filter(Boolean).map((s) => s.split(',').map(Number));
const m = buildMask(x.getImageData(0, 0, cw, ch).data, cw, ch, faces);
const worth = m.stats.free > 0.006 || m.stats.flames > 0; cache.set(key, worth ? m : null); return worth ? m : null;
};
const cost = [];   // (ms of each attach, for the debug overlay)
const detach = () => { if (cv.parentNode) cv.remove(); if (phone && cur) { for (const [u, t] of [[0, texImg], [1, texMask]]) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); } cv.width = cv.height = 2; backing = [0, 0]; } cur = null; };
const draw = () => {
if (!cur) return;
gl.uniform1f(U.uT, tOn); gl.uniform1f(U.uAmp, amp); gl.uniform1f(U.uGust, gust); gl.uniform1f(U.uFlick, 1);
gl.drawArrays(gl.TRIANGLES, 0, 3);
};
const attach = async (l, my) => {
const t0 = performance.now();
const img = l.img, key = stem(img.currentSrc || img.src), scene = sceneBy.get(key);
if (!key || !scene) return;
if (scene.dataset.depth && l.cam.querySelector('canvas:not([data-life-story])')) return;   // the depth camera draws this one
if (phone && depthUp()) return;   // (a phone: not beside the depth camera on either layer; the watch below comes back here when its canvas has gone)
if (!img.complete || !img.naturalWidth) { try { await img.decode(); } catch (e) { return; } }
if (my !== seq || ctx.signal.aborted) return;
await wait(0); if (my !== seq) return; const m = maskOf(key, img, scene); if (!m) return;   // (each heavy step is its own task, so none is a long one)
let bmp; try { const o = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }; if (img.naturalWidth > 1700) { o.resizeWidth = 1600; o.resizeQuality = 'medium'; } bmp = await createImageBitmap(img, o); } catch (e) { return; }
if (my !== seq || ctx.signal.aborted) { bmp.close && bmp.close(); return; }
await wait(0); if (my !== seq || ctx.signal.aborted) { bmp.close && bmp.close(); return; }
const cssW = l.cam.offsetWidth, cssH = l.cam.offsetHeight; if (!cssW || !cssH) { bmp.close && bmp.close(); return; }
if (phone && depthUp()) { bmp.close && bmp.close(); return; }
const k = Math.min(devicePixelRatio || 1, 1.5) * 1.1 * (phone ? 0.5 : 1), bw = Math.min(2048, Math.round(cssW * k)), bh = Math.round(bw * cssH / cssW);
if (backing[0] !== bw || backing[1] !== bh) { cv.width = bw; cv.height = bh; backing = [bw, bh]; }
gl.viewport(0, 0, bw, bh);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texImg); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp); gl.generateMipmap(gl.TEXTURE_2D);
gl.uniform2f(U.uTexel, 1 / bmp.width, 1 / bmp.height); bmp.close && bmp.close();
gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texMask); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, m.w, m.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, m.data);
cv.style.opacity = '0'; l.cam.appendChild(cv); cur = { l, key, m }; draw(); void cv.offsetWidth;   // one frame is on it before it fades up
cv.style.opacity = '1'; cost.push(Math.round(performance.now() - t0));
};
const settleOn = () => {
const my = ++seq, up = layers.find((l) => l.el.classList.contains('on')); if (!up) return;
if (cur && cur.l !== up) detach();
if (cur && cur.l === up) return;
Promise.all(up.el.getAnimations().filter((a) => a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).map((a) => a.finished.catch(() => 0))).then(() => wait(40)).then(() => { if (my === seq && up.el.classList.contains('on')) return attach(up, my); }).catch(() => {});
};
const mo = new MutationObserver(settleOn); for (const l of layers) mo.observe(l.el, { attributes: true, attributeFilter: ['class'] });
const imo = new MutationObserver(() => { if (cur && stem(cur.l.img.currentSrc || cur.l.img.src) !== cur.key) { seq++; detach(); settleOn(); } });
for (const l of layers) imo.observe(l.img, { attributes: true, attributeFilter: ['src', 'srcset'] });
const dmo = phone ? new MutationObserver(() => { if (depthUp()) { if (cur) { seq++; detach(); } } else if (!cur) settleOn(); }) : null;
if (dmo) for (const l of layers) dmo.observe(l.cam, { childList: true });
settleOn();
const live = () => on && !dropped && !R.classList.contains('fm-ended') && R.classList.contains('fm-live') && R.getAttribute('data-l' + 'amp') !== 'on';
ctx.budget.register({ id: 'story-sway', label: 'shader', cost: 'webgl', priority: 4, drop() { dropped = true; cv.style.display = 'none'; }, restore() { dropped = false; cv.style.display = ''; } });
const give = ctx.bus.use({ pointer: true, scroll: true, wheel: true });
const un = ctx.bus.frame((dt, s) => {
tOn += dt; gust = Math.max(gust * Math.exp(-dt * 1.6), s.gust || 0);
if (!cur || !live()) { if (cv.style.visibility !== 'hidden') cv.style.visibility = 'hidden'; return; }
if (cv.style.visibility) cv.style.visibility = '';
since += dt * 1000; if (period && since < period - 3) return; since = 0; draw();
});
const lost = (e) => { e.preventDefault(); on = false; detach(); }; cv.addEventListener('webglcontextlost', lost);
const dbg = window.SpiritualLife && window.SpiritualLife.debug; if (dbg) dbg.sway = { cost: () => cost.slice(), current: () => cur && { key: cur.key, stats: cur.m.stats }, canvas: () => cv, cache: () => Array.from(cache.entries()).map(([k, v]) => [k, v && v.stats]) };
return { dispose() { for (const [s, d] of stripped) s.dataset.depth = d; un(); give(); mo.disconnect(); imo.disconnect(); dmo && dmo.disconnect(); detach(); cv.removeEventListener('webglcontextlost', lost); try { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); } catch (e) {} if (dbg) delete dbg.sway; } };
}
