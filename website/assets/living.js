(() => {
const root = document.documentElement;
const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}';
const FS = 'precision mediump float;uniform sampler2D A,D;uniform vec2 o,s,m,c;uniform float k,b;varying vec2 v;void main(){vec2 u=o+v*s,q=u;for(int i=0;i<4;i++){float d=texture2D(D,q).r-b;q=u-m*d-(u-c)*k*d;}gl_FragColor=texture2D(A,clamp(q,0.,1.));}';
const AMP = .006;
const make = () => {
let cv, gl, U = {}, texA, texD, host = null, img = null, src = '', dsrc = '', map = null, raf = 0, last = 0, t0 = 0, run = false, dead = false, scale = 1, n = 0, sum = 0, prev = 0, px = 0, py = 0, tx = 0, ty = 0, ready = false, dir = 1, scrub = null, kk = 0, turn = 0;
const lite = () => root.classList.contains('ep-lite') || !!navigator.connection?.saveData;
const still = () => root.dataset.motion === 'reduce' || !!root.dataset.light || matchMedia('(prefers-reduced-motion: reduce)').matches;
const ok = () => !dead && !lite() && !still() && (navigator.deviceMemory || 4) >= 4 && (navigator.hardwareConcurrency || 4) >= 4 && !!window.WebGLRenderingContext;
const kill = () => { dead = true; stop(); cv?.remove(); host = null; scrub?.lost?.(); };
const init = () => {
if (gl || dead) return !dead;
cv = document.createElement('canvas'); cv.className = 'lv'; cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .8s ease;pointer-events:none';
gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
if (!gl) { dead = true; return false; }
cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); kill(); });
const sh = (t, c) => { const x = gl.createShader(t); gl.shaderSource(x, c); gl.compileShader(x); return x; };
const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { dead = true; return false; }
gl.useProgram(pr);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
for (const u of ['A', 'D', 'o', 's', 'm', 'c', 'k', 'b']) U[u] = gl.getUniformLocation(pr, u);
gl.uniform1i(U.A, 0); gl.uniform1i(U.D, 1);
const tex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); for (const [a, b] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, a, b); return t; };
texA = tex(0); texD = tex(1);
if (scrub) return true;
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; } }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf), raf = 0; else if (run) go(); });
return true;
};
const size = () => {
if (!host) return;
const w = host.clientWidth, h = host.clientHeight, d = scrub ? Math.min(devicePixelRatio || 1, 2, (img?.naturalWidth || w) / Math.max(1, w)) : Math.min(devicePixelRatio || 1, 1.5) * scale, cap = Math.min(1, Math.sqrt((scrub ? scrub.px || 3.3e6 : 1.3e6) / Math.max(1, w * h * d * d)));
cv.width = Math.max(2, Math.round(w * d * cap)); cv.height = Math.max(2, Math.round(h * d * cap)); gl.viewport(0, 0, cv.width, cv.height);
let ox = 0, oy = 0, sx = 1, sy = 1;
if (map) { const ia = 16 / 9, ca = w / h; if (ca < ia) { sx = ca / ia; ox = (1 - sx) * map.x / 100; } else { sy = ia / ca; oy = (1 - sy) * map.y / 100; } }
gl.uniform2f(U.o, ox, oy); gl.uniform2f(U.s, sx, sy);
const cc = scrub?.c || (map ? [map.cx ?? .5, map.cy ?? .4] : [.5, .4]);
gl.uniform2f(U.c, Math.min(1, Math.max(0, cc[0])), Math.min(1, Math.max(0, cc[1]))); gl.uniform1f(U.b, scrub ? 0 : .5);
if (scrub && ready) paint();
};
const paint = () => { if (dead || !host || !gl) return; gl.uniform2f(U.m, 0, 0); gl.uniform1f(U.k, kk); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); if (!ready) { ready = true; cv.style.opacity = '1'; } };
const set = (k) => { if (k === kk) return; kk = k; if (ready) paint(); };
const release = () => { detach(); if (!gl || dead) return; for (const [u, t] of [[0, texA], [1, texD]]) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0])); } src = dsrc = ''; cv.width = cv.height = 2; };
const frame = (now) => {
raf = 0; if (!run || dead || !host) return;
raf = requestAnimationFrame(frame);
if (n < 20) { if (prev) { sum += now - prev; n++; } prev = now; if (n === 20) { if (sum / 20 > 24) { if (scale === 1) { scale = .5; n = 0; sum = 0; prev = 0; size(); } else return kill(); } } }
else if (now - last < 30) return;
last = now;
const t = (now - t0) / 1000, env = Math.min(1, t / 2.5), e = env * env * (3 - 2 * env);
px += (tx - px) * .06; py += (ty - py) * .06;
gl.uniform2f(U.m, AMP * e * (Math.cos(t * .42) * .8 + px * 1.6), AMP * e * (16 / 9) * (Math.sin(t * .31) * .45 + py * 1.2));
gl.uniform1f(U.k, dir * .012 * e * Math.min(1, t / 12));
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
if (!ready) { ready = true; cv.style.opacity = '1'; }
};
const go = () => { if (!raf && run && !dead && !document.hidden) { prev = 0; raf = requestAnimationFrame(frame); } };
const stop = () => { run = false; cancelAnimationFrame(raf); raf = 0; };
const detach = () => { turn++; stop(); if (cv) { cv.style.transition = 'none'; cv.style.opacity = '0'; cv.remove(); } host = null; ready = false; };
const attach = (h, el, depth, m, push = 1, sc = null) => {
scrub = sc;
if (!ok() || !init() || !el.naturalWidth) return false;
detach(); host = h; img = el; map = m || null; dir = push;
const mine = ++turn, key = el.currentSrc || el.src, use = (pic) => {
if (turn !== mine || dead) return pic?.close?.();
try {
if (src !== key) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pic || el); src = key; }
} catch { return kill(); }
pic?.close?.();
cv.style.transition = scrub ? 'opacity .35s linear' : 'opacity .8s ease'; host.append(cv); size(); if (scrub) return paint(); t0 = performance.now(); run = true; go();
}, go1 = () => { if (src !== key && window.createImageBitmap) fetch(key).then((r) => r.blob()).then((b) => createImageBitmap(b)).then(use, () => use()); else use(); };
if (dsrc === depth) go1();
else {
const upD = (d) => { if (dead) return d?.close?.(); try { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texD); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, d); dsrc = depth; } catch { return kill(); } d?.close?.(); go1(); };
const viaImg = () => { const d = new Image(); d.onload = () => upD(d); d.src = depth; };
if (window.createImageBitmap) fetch(depth).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => createImageBitmap(b)).then(upD, viaImg); else viaImg();
}
return true;
};
addEventListener('resize', () => { if (host && !dead && !scrub) size(); });
document.addEventListener('visibilitychange', () => { if (scrub && ready && !document.hidden) paint(); });
return { ok, attach, detach, release, set, size: () => { if (host && !dead) size(); }, on: () => ready && !dead, pause: stop, play: () => { if (host && !dead) { run = true; go(); } } };
};
window.SpritualLiving = { ...make(), make };
})();
