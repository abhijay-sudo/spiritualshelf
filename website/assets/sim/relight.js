(() => {
const G = window.SpiritualGPU; if (!G) return;
const d = document, R = d.documentElement, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V3 = '#version 300 es\n';
const TRI = V3 + 'out vec2 vUv;\nvoid main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';
const FS = (rich) => V3 + `precision highp float;
#define RICH ${rich ? 1 : 0}
uniform sampler2D uTex, uDep;
uniform vec4 uRect, uClip;      // the painting's box and the part of the canvas it may light (css px, host coordinates)
uniform vec2 uBuf, uLight, uTexel;
uniform vec3 uCol;
uniform float uScale, uK, uAsp, uSoft;
out vec4 o;
void main(){
vec2 css = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / uScale;
if (css.x < uClip.x || css.y < uClip.y || css.x > uClip.z || css.y > uClip.w) discard;
vec2 uv = (css - uRect.xy) / uRect.zw;
if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
vec3 alb = texture(uTex, uv).rgb;
float dc = texture(uDep, uv).r;
vec2 e = uTexel * 1.5;
float gx = texture(uDep, uv + vec2(e.x, 0.0)).r - texture(uDep, uv - vec2(e.x, 0.0)).r;
float gy = texture(uDep, uv + vec2(0.0, e.y)).r - texture(uDep, uv - vec2(0.0, e.y)).r;
vec2 g = vec2(gx / (2.0 * e.x), gy / (2.0 * e.y)) * 0.11 * 2.0;
vec3 n = normalize(vec3(-g.x, -g.y * uAsp, 1.0));
vec2 pa = vec2(uv.x * uAsp, uv.y), la = vec2(uLight.x * uAsp, uLight.y);
vec3 Lv = vec3(la - pa, 0.30 - dc * 0.10);
float dist = length(Lv); vec3 L = Lv / dist;
float wrap = clamp((dot(n, L) + 0.35) / 1.35, 0.0, 1.0);
float R0 = 0.42, att = 1.0 / pow(1.0 + (dist * dist) / (R0 * R0), 1.6);
float lit = wrap * att;
#if RICH
float edge = smoothstep(0.0, 0.9, length(g)) * att * 0.6;
lit += edge * 0.5;
#endif
vec3 base = alb * 0.7 + 0.30 * vec3(sqrt((alb.r + alb.g + alb.b) / 3.0)) * alb + 0.04 + 0.12 * dc;
vec3 add = base * uCol * lit * uK;
o = vec4(add, 0.0);
}`;
let env = null, P = null, pr = null, texP = null, texD = null, curKey = '', want = '', loading = 0, gen = 0, hostEl = null, cfg = null, ac = null, io = null, tmr = 0, srcMap = new Map(), W = 0, Hh = 0, scale = 1, tierName = 'rich';
let kf = 0, kt = 0, t = 0, rect = [0, 0, 1, 1], rectT = [0, 0, 1, 1], clip = [0, 0, 1, 1], haveRect = false, focal = [0.5, 0.42], light = [0.5, 0.42], lightV = [0, 0], col = [1, 0.8, 0.58], asp = 16 / 9, fb = '', ptrOn = false, ptrUv = [0.5, 0.5], last = 0, live = false, tex = { w: 0, h: 0 }, stageTop = null, topSeen = '';
const keyOf = (s) => { const m = String(s || '').match(/\/([^/?#]+?)-\d+\.webp/); return m ? m[1] : ''; };
const parseCam = (el) => { try { const k = JSON.parse(el.dataset.cam || 'null'); if (k && k[0]) return [clamp(k[0][0] / 100, 0.05, 0.95), clamp(k[0][1] / 100, 0.05, 0.95)]; } catch (e) {} return [0.5, 0.42]; };
const tint = (el) => { const t = String(el.dataset.tint || '').split(/\s+/).map(Number); if (t.length < 3 || t.some(isNaN)) return [1, 0.8, 0.58]; const m = Math.max(1, ...t); return [t[0] / m, 0.28 + 0.72 * t[1] / m, 0.16 + 0.55 * t[2] / m]; };
const cands = (img) => { const out = []; for (const part of String(img.srcset || img.getAttribute('srcset') || '').split(',')) { const m = part.trim().match(/^(\S+)\s+(\d+)w$/); if (m) out.push({ u: m[1], w: +m[2] }); } return out.sort((a, b) => a.w - b.w); };
const pickPaint = (img) => { const c = cands(img); if (!c.length) return img.currentSrc || img.src; const cap = tierName === 'rich' ? 960 : 480, ok = c.filter((x) => x.w <= Math.max(cap, 900)); const pool = ok.length ? ok : c; return (pool.find((x) => x.w >= cap) || pool[pool.length - 1]).u; };
const catalog = () => {
srcMap = new Map();
const add = (sec, img) => { if (!sec || !img) return; const key = keyOf(img.getAttribute('src') || img.src) || keyOf(img.currentSrc); const dep = sec.dataset.depth; if (!key || !dep || srcMap.has(key)) return; srcMap.set(key, { key, sec, img, depth: dep, cam: parseCam(sec), tint: tint(sec) }); };
const op = d.querySelector('section.cx-film-open'); if (op) add(op, op.querySelector('.cx-film-open-pic img'));
for (const sc of d.querySelectorAll('section.scene[data-depth]')) { const im = sc.querySelector('figure.shot img'); add(sc, im); }
return srcMap.size;
};
const bmp = (u, w) => fetch(u, { credentials: 'same-origin' }).then((r) => (r.ok ? r.blob() : Promise.reject(0))).then((b) => createImageBitmap(b, w ? { resizeWidth: w, resizeQuality: 'medium', premultiplyAlpha: 'none', colorSpaceConversion: 'none' } : { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).catch(() => createImageBitmap(b)));
const upload = (gl, b, fmtI, fmtF, type, wrapLinear) => {
const tx = env.tex(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texImage2D(gl.TEXTURE_2D, 0, fmtI, fmtF, type, b);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); gl.bindTexture(gl.TEXTURE_2D, null); return tx;
};
const load = (key) => {
const s = srcMap.get(key); if (!s || !env || !env.gl) return; if (loading && want === key) return;
want = key; loading = 1; const my = ++gen;
Promise.all([bmp(pickPaint(s.img), tierName === 'rich' ? 960 : 640), bmp(s.depth)]).then(([bp, bd]) => {
if (my !== gen || !env || !env.gl || env.gl.isContextLost()) { bp.close(); bd.close(); return; }
const a0 = performance.now(), gl = env.gl; if (texP) env.del(texP); if (texD) env.del(texD); texP = texD = null;
texP = upload(gl, bp, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE); tex.w = bp.width; tex.h = bp.height;
texD = upload(gl, bd, gl.R8, gl.RED, gl.UNSIGNED_BYTE); bp.close(); bd.close();
G.relight.upMs = +(performance.now() - a0).toFixed(2); env.settle && env.settle(); curKey = key; focal = s.cam.slice(); col = s.tint.slice(); loading = 0; if (kf <= 0.001) light = focal.slice(); G.relight.key = key;
}).catch(() => { loading = 0; curKey = ''; want = ''; kt = 0; });
};
const free = () => { if (env && env.gl) { if (texP) env.del(texP); if (texD) env.del(texD); } texP = texD = null; curKey = ''; want = ''; loading = 0; gen++; };
const cover = (img, hostR) => {   // object-fit: cover of a 16:9 picture in the img's own box, honouring object-position
const b = img.getBoundingClientRect(); const cs = getComputedStyle(img), op = String(cs.objectPosition || '50% 50%').split(' ').map(parseFloat);
const px = isNaN(op[0]) ? 0.5 : op[0] / 100, py = isNaN(op[1]) ? 0.5 : op[1] / 100;
const bw = b.width, bh = b.height; if (bw < 4 || bh < 4) return null; const a = 16 / 9; let w = bw, h = bw / a; if (h < bh) { h = bh; w = bh * a; }
const x = b.left - hostR.left + (bw - w) * px, y = b.top - hostR.top + (bh - h) * py;
return { rect: [x, y, w, h], clip: [b.left - hostR.left, b.top - hostR.top, b.right - hostR.left, b.bottom - hostR.top] };
};
const layout = () => {
if (!hostEl || !hostEl.isConnected) return; lastLay = performance.now(); const hr = hostEl.getBoundingClientRect();
if (hostEl.classList.contains('fm-stage')) {
const lys = [...hostEl.querySelectorAll(':scope > .fm-ly.on')]; let top = null, tz = -1; for (const l of lys) { const z = +l.style.zIndex || 0; if (z >= tz) { tz = z; top = l; } }
if (!top) return; const cam = top.querySelector('.fm-cam'), im = top.querySelector('img'); if (!cam) return;
const key = im ? keyOf(im.getAttribute('src')) : ''; if (key !== topSeen) { topSeen = key; }
const b = cam.getBoundingClientRect(); rectT = [b.left - hr.left, b.top - hr.top, b.width, b.height]; clip = [0, 0, hr.width, hr.height];
if (!haveRect) { rect = rectT.slice(); haveRect = true; }
want = srcMap.has(key) ? key : '';
} else {
let sec = hostEl.closest('section.scene') || hostEl, img = hostEl.classList.contains('cx-film-open') ? hostEl.querySelector('.cx-film-open-pic img') : hostEl.querySelector('img');
if (!img) return; const key = keyOf(img.getAttribute('src') || img.src) || keyOf(img.currentSrc); const c = cover(img, hr); if (!c) return;
rectT = c.rect; clip = c.clip; if (!haveRect) { rect = rectT.slice(); haveRect = true; } want = srcMap.has(key) ? key : '';
}
};
const onMove = (e) => { if (e.pointerType === 'touch' || !hostEl) return; ptrOn = true; };
const now = () => performance.now();
let wake = 0, sleepT = 0;
const poll = () => { tmr = 0; if (!hostEl) return; layout(); tmr = setTimeout(poll, now() - wake < 700 ? 125 : 1000); };
const nudge = () => { wake = now(); if (hostEl && tmr && now() - lastLay > 100) { clearTimeout(tmr); poll(); } };
let lastLay = 0;
const fx = {
name: 'relight', order: 15, wants: () => true,
init(gl, e) { env = e; P = e.prog(TRI, FS(true)); pr = e.prog(TRI, FS(false)); kf = kt = 0; curKey = ''; },
resize(w, h, sc, tier) { W = w; Hh = h; scale = sc; tierName = tier; asp = w / Math.max(1, h) > 0 ? 16 / 9 : 16 / 9; if (hostEl) layout(); },
enter() {
hostEl = env.host; cfg = env.cfg; haveRect = false; kf = 0; topSeen = '';
if (!catalog()) { hostEl = null; return; }
ac = new AbortController(); const o = { signal: ac.signal, passive: true };
addEventListener('pointermove', onMove, o); addEventListener('pointerleave', () => { ptrOn = false; }, o); addEventListener('scroll', nudge, o); addEventListener('resize', nudge, o);
layout(); wake = now(); poll();
},
leave() { if (ac) { ac.abort(); ac = null; } if (tmr) { clearTimeout(tmr); tmr = 0; } if (sleepT) { clearTimeout(sleepT); sleepT = 0; } hostEl = null; kt = 0; kf = 0; free(); },
pause() { if (tmr) { clearTimeout(tmr); tmr = 0; } if (sleepT) clearTimeout(sleepT); sleepT = setTimeout(() => { sleepT = 0; free(); }, 6000); },
resume() { if (sleepT) { clearTimeout(sleepT); sleepT = 0; } if (hostEl && !tmr) { wake = now(); layout(); poll(); } },
refresh() { catalog(); if (hostEl) { haveRect = false; layout(); } },
update(dt, inp) {
if (!hostEl) return; t += dt;
const ready = curKey && curKey === want && texP && texD;
if (want && want !== curKey && !loading && kf < 0.02) load(want);
kt = ready && inp ? 1 : 0; if (ready && want && want !== curKey) kt = 0;
kf += (kt - kf) * (1 - Math.exp(-dt * (kt > kf ? 5 : 9)));
if (kt === 0 && kf < 0.004) kf = 0;
const e = 1 - Math.exp(-dt * 16); for (let i = 0; i < 4; i++) rect[i] += (rectT[i] - rect[i]) * e;
let tx, ty;
if (inp && inp.on && inp.x > -1e3 && rect[2] > 1) { tx = clamp((inp.x - rect[0]) / rect[2], -0.1, 1.1); ty = clamp((inp.y - rect[1]) / rect[3], -0.1, 1.1); }
else { tx = focal[0] + 0.06 * Math.sin(t * 0.11 * 6.2832) + 0.03 * Math.sin(t * 0.17 * 6.2832 + 1.3); ty = focal[1] + 0.045 * Math.cos(t * 0.08 * 6.2832) + 0.02 * Math.sin(t * 0.13 * 6.2832); }
const k = inp && inp.on ? 70 : 8, c = 2 * Math.sqrt(k);
lightV[0] += (k * (tx - light[0]) - c * lightV[0]) * dt; lightV[1] += (k * (ty - light[1]) - c * lightV[1]) * dt; light[0] += lightV[0] * dt; light[1] += lightV[1] * dt;
},
draw(gl, e) {
const prog = tierName === 'rich' ? P : pr; if (!prog || !prog.ok || !texP || !texD || kf <= 0.003 || !haveRect || rect[2] < 8) return;
const flick = 1 + 0.07 * (Math.sin(e.t * 1.7) + 0.6 * Math.sin(e.t * 2.3 + 1.1)) / 1.6;   // a flame's own unsteadiness, under 2.5 Hz
gl.disable(gl.SCISSOR_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.useProgram(prog.p);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texP); gl.uniform1i(prog.loc('uTex'), 0);
gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texD); gl.uniform1i(prog.loc('uDep'), 1);
gl.uniform4f(prog.loc('uRect'), rect[0], rect[1], rect[2], rect[3]); gl.uniform4f(prog.loc('uClip'), clip[0], clip[1], clip[2], clip[3]);
gl.uniform2f(prog.loc('uBuf'), e.bw, e.bh); gl.uniform2f(prog.loc('uLight'), light[0], light[1]); gl.uniform2f(prog.loc('uTexel'), 1 / 256, 1 / 144); gl.uniform3f(prog.loc('uCol'), col[0], col[1], col[2]);
gl.uniform1f(prog.loc('uScale'), scale); gl.uniform1f(prog.loc('uK'), 0.25 * kf * flick * e.intensity); gl.uniform1f(prog.loc('uAsp'), rect[2] / Math.max(1, rect[3]));
e.tri(); gl.activeTexture(gl.TEXTURE0);
},
stats() { return { key: curKey, want, kf: +kf.toFixed(2), rect: rect.map(Math.round), light: light.map((v) => +v.toFixed(3)), loading, tex: tex.w + 'x' + tex.h, upMs: G.relight.upMs }; },
dispose() { free(); if (ac) { ac.abort(); ac = null; } if (tmr) { clearTimeout(tmr); tmr = 0; } if (sleepT) { clearTimeout(sleepT); sleepT = 0; } env = P = pr = null; hostEl = null; },
};
G.relight = { key: '' };
G.register(fx);
})();
