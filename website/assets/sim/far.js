(() => {
const G = window.SpiritualGPU; if (!G) return;
const d = document, R = d.documentElement;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const GX = 64, GY = 16, V0 = 0.455, V1 = 0.585;           // the mist grid and the part of the picture (v) it covers
const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex, uMist, uVid;
uniform vec4 uCover;
uniform vec2 uBuf, uSun;
uniform float uScale, uT, uFade, uWL, uAsp, uQ, uHasV;
uniform vec3 uTint, uPar, uSw;                 // uPar: lean x, lean y, scroll; uSw: the crowns' push (sway x, sway y, gust)
out vec4 o;
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
vec2 css = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / uScale;
vec2 uv = (css - uCover.xy) / uCover.zw;
float v = uv.y;
if (v < 0.36 || v > 0.6 || uv.x < 0.0 || uv.x > 1.0) discard;
float pxu = 1.0 / uCover.z;                                                      // one css pixel across, in picture widths
float prof = smoothstep(0.503, 0.455, v) * (1.0 - 0.72 * smoothstep(0.445, 0.405, v));
float crown = 0.5 + 0.5 * sin(uv.x * 140.0 + vnoise(vec2(uv.x * 22.0, 1.0)) * 6.0);          // each crown its own phase
float push = uSw.x * (0.55 + 0.45 * sin(uv.x * 61.0 + vnoise(vec2(uv.x * 9.0, 3.0)) * 4.0)) * (0.7 + 0.3 * crown) + uPar.x * 2.2;
vec2 sh = vec2(push * prof, uSw.y * prof * 0.3 - uPar.y * 0.9 * prof - uPar.z * 1.5 * prof) * pxu * vec2(1.0, uAsp);
vec2 su = clamp(uv + sh, vec2(0.0), vec2(1.0));
vec3 c = uHasV > 0.5 ? texture(uVid, su).rgb : texture(uTex, su).rgb;      // the film's own frame: its mist and its light are the picture, we only move the crowns
vec3 sky = textureLod(uTex, vec2(uv.x, 0.395), 5.5).rgb;
vec3 lake = textureLod(uTex, vec2(uv.x, 0.53), 5.5).rgb;                            // the pale lilac of the water just below the shore: the air over the lake is this colour
vec3 glow = mix(sky, lake, 0.7) * 1.07;
float far = smoothstep(0.50, 0.415, v);                                          // 0 at the shore, 1 at the hills' tops
c = mix(c, glow * vec3(0.98, 0.97, 1.04), 0.30 * far * far + 0.06 * far);                                       // and drift toward the colour of the air they sit in
c = mix(c, c * vec3(0.93, 0.97, 1.09), far * 0.7);                               // the far hills a touch cooler
float sx = exp(-pow((uv.x - uSun.x) / 0.3, 2.0));
c += uTint * 0.03 * sx * smoothstep(0.43, 0.50, v) * (1.0 - smoothstep(0.50, 0.512, v));   // the sun side of the bank warms
float top = smoothstep(0.372, 0.415, v), bot = 1.0 - smoothstep(0.506, 0.512, v);
float a1 = top * bot * uFade * step(0.5, uHasV);          // (with no film frame the bank is left to the picture: only haze and mist)
float hb = exp(-pow((v - 0.493) / 0.024, 2.0));
vec3 hz = glow * 1.06;
float hn = 0.65 + 0.35 * vnoise(vec2(uv.x * uAsp * 5.0 - uT * 0.004, 7.0));
c = mix(c, hz, 0.12 * hb * hn * bot);
float gy = (v - ${V0}) / ${(V1 - V0).toFixed(3)};
float m = gy > 0.0 && gy < 1.0 ? texture(uMist, vec2(uv.x, gy)).r : 0.0;
float x1 = uv.x * uAsp;
float dt1 = vnoise(vec2(x1 * 13.0 - uT * 0.05, v * 150.0)), dt2 = uQ > 0.5 ? vnoise(vec2(x1 * 31.0 - uT * 0.09 + 5.0, v * 470.0)) : 0.5;
float det = 0.12 + 1.5 * smoothstep(0.15, 0.85, dt1 * 0.62 + dt2 * 0.38);
float vp = smoothstep(0.462, 0.492, v) * (1.0 - smoothstep(0.525, 0.58, v));
float am = smoothstep(0.0, 1.0, clamp(m * det * 2.8, 0.0, 1.0)) * vp * 0.62 * uFade;
vec3 mc = mix(glow, uTint * lum(glow), 0.35) * 1.34 + 0.035;                    // mist is lighter than the water it lies on: pale, a little warm
mc = mix(mc, mc * vec3(1.02, 1.0, 1.04), 0.5);
float hh = exp(-pow((v - 0.425) / 0.05, 2.0)), hl = exp(-pow((v - 0.478) / 0.034, 2.0));
float dr1 = 0.55 + 0.45 * sin(x1 * 2.1 + uT * 0.022), dr2 = 0.55 + 0.45 * sin(x1 * 2.9 - uT * 0.017 + 2.0);
float hv = (0.24 * hh * dr1 + 0.26 * hl * dr2 + 0.16 * hb * hn) * bot * uFade * (1.0 - step(0.5, uHasV) * 0.5);
vec3 hc = mix(glow, vec3(1.0, 0.93, 0.87), 0.62) * vec3(1.0, 0.99, 1.02);
vec3 col = mc * am + (hc * hv + c * a1 * (1.0 - hv)) * (1.0 - am);
float al = am + (hv + a1 * (1.0 - hv)) * (1.0 - am);
col += (hash(gl_FragCoord.xy + fract(uT)) - 0.5) * (2.0 / 255.0) * al;
o = vec4(col, al);
}`;
let env = null, prog = null, el = null, mistTex = null, vtex = null, vid = null, vNew = false, vOk = false, vW = 0, vH = 0, vCb = 0, W = 0, H = 0, scale = 1, tier = 'rich';
let D = null, D2 = null, M = null, t = 0, tSim = 0, acc = 0, seed = 11, leanX = 0, leanY = 0, scroll = 0, sw = 0, swV = 0, sy = 0, syV = 0, fade = 0, seen = false, mo = null, lift = true, dirty = true, upT = 0;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const wv = [0, 0];
const introOver = () => !R.classList.contains('cx-js') || R.classList.contains('cx-seen') || R.classList.contains('cx-fest-end');
const F = G.far = { ready: false, freeze: false, lanes: () => Array.from(D || []) };
const lane = (y, tt) => {
let s = 0;
const a = [[0.22, 0.10, 0.017, 0.0], [0.52, 0.12, 0.021, 2.3], [0.80, 0.09, 0.013, 4.1]];
for (const [c, w, f, p] of a) { const cc = c + 0.06 * Math.sin(tt * f * 6.2832 + p), z = (y - cc) / w; s += Math.exp(-z * z); }
return Math.min(1, s);
};
const stepMist = (dt, tt, wx) => {
const base = clamp(wx * 0.0045, -0.5, 0.5) + 0.075;                          // cells per second (one cell is 1/64 of the picture's width: about 22 px)
const n = GX * GY;
for (let j = 0; j < GY; j++) {
const vy = Math.sin(tt * 0.031 + j * 0.8) * 0.01, ux = base * (0.55 + 0.9 * (1 - j / (GY - 1))) * (0.8 + 0.4 * Math.sin(tt * 0.043 + j * 1.3));
for (let i = 0; i < GX; i++) {
const sx = i - ux * dt, sy2 = j - vy * dt * GY;
const x = clamp(sx, 0, GX - 1.001), y = clamp(sy2, 0, GY - 1.001), x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, k = y0 * GX + x0;
let v = (D[k] * (1 - fx) + D[k + 1] * fx) * (1 - fy) + (D[k + GX] * (1 - fx) + D[k + GX + 1] * fx) * fy;
if (sx < 0) { const q = Math.min(1, -sx); v = inflow(j, tt) * q + v * (1 - q); }     // the upwind edge feeds in new mist
D2[j * GX + i] = v;
}
}
const k1 = Math.exp(-dt * 0.012);
for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
const k = j * GX + i, a = D2[k], l = D2[j * GX + Math.max(i - 1, 0)], r = D2[j * GX + Math.min(i + 1, GX - 1)], u = D2[Math.max(j - 1, 0) * GX + i], dn = D2[Math.min(j + 1, GY - 1) * GX + i];
D[k] = clamp((a * 0.8 + (l + r) * 0.075 + (u + dn) * 0.025) * k1, 0, 1);
}
for (let j = 0; j < GY; j++) { const edge = Math.min(1, j / 2.5, (GY - 1 - j) / 3.5); for (let i = 0; i < GX; i++) D[j * GX + i] *= 0.4 + 0.6 * Math.max(0, edge); }
for (let j = 0; j < GY; j++) { const l = lane(j / (GY - 1), tt); for (let i = 0; i < GX; i++) { const k = j * GX + i; D[k] = Math.max(D[k], l * 0.06 * (0.5 + 0.5 * Math.sin(i * 0.31 + tt * 0.02 + j))); } }
void n;
};
const inflow = (j, tt) => lane(j / (GY - 1), tt) * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(tt * 0.071 + j * 0.9))) * 1.7;
const warm = () => {
D.fill(0);
for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) D[j * GX + i] = lane(j / (GY - 1), i * 1.9) * (0.45 + 0.55 * Math.sin(i * 0.23 + j * 1.7 + 1.1)) * 1.4;
for (let s = 0; s < 80; s++) stepMist(0.4, -(80 - s) * 0.4, 20);
tSim = 0;
};
const upload = (gl) => {
for (let k = 0; k < GX * GY; k++) M[k] = Math.round(clamp(D[k], 0, 1) * 255);
gl.bindTexture(gl.TEXTURE_2D, mistTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GX, GY, gl.RED, gl.UNSIGNED_BYTE, M); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); gl.bindTexture(gl.TEXTURE_2D, null);
dirty = false;
};
const watchVideo = () => {
vid = el ? el.querySelector('.cx-open-media video') : null; vOk = false; vNew = false;
if (!vid) return;
const ask = () => { vCb = 0; if (!vid) return; vNew = true; vCb = vid.requestVideoFrameCallback(ask); };
if (typeof vid.requestVideoFrameCallback === 'function') vCb = vid.requestVideoFrameCallback(ask);
};
const unwatchVideo = () => { if (vid && vCb && vid.cancelVideoFrameCallback) { try { vid.cancelVideoFrameCallback(vCb); } catch (x) {} } vCb = 0; vid = null; vOk = false; };
const grab = (gl) => {
if (!vid || vid.paused || vid.readyState < 2 || !vid.videoWidth) return vOk;
if (!vNew && vOk) return true;
if (typeof vid.requestVideoFrameCallback !== 'function' && vOk && (t - upT) < 0.04) return true;   // (no callback API: about 24 a second)
vNew = false; upT = t;
gl.bindTexture(gl.TEXTURE_2D, vtex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
try {
if (vW !== vid.videoWidth || vH !== vid.videoHeight) { vW = vid.videoWidth; vH = vid.videoHeight; gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid); }
else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
vOk = true;
} catch (x) { vOk = false; }
gl.bindTexture(gl.TEXTURE_2D, null);
return vOk;
};
const fx = {
name: 'far', order: 12, wants: () => true,
init(gl, e) {
env = e; prog = e.prog(G.sh.TRI, FS);
mistTex = e.tex(); gl.bindTexture(gl.TEXTURE_2D, mistTex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, GX, GY);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.bindTexture(gl.TEXTURE_2D, null);
vtex = e.tex(); gl.bindTexture(gl.TEXTURE_2D, vtex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.bindTexture(gl.TEXTURE_2D, null); vW = vH = 0;
D = new Float32Array(GX * GY); D2 = new Float32Array(GX * GY); M = new Uint8Array(GX * GY); warm(); dirty = true;
},
resize(w, h, sc, tr) { W = w; H = h; scale = sc; tier = tr; },
enter() {
el = env.host; seen = introOver(); t = 0; fade = 0;
mo = new MutationObserver(() => { if (!seen && introOver()) seen = true; }); mo.observe(R, { attributes: true, attributeFilter: ['class'] }); watchVideo();
},
leave() { unwatchVideo(); if (mo) { mo.disconnect(); mo = null; } F.ready = false; delete R.dataset.fxFar; el = null; },
update(dt, inp) {
if (!D) return; t += dt;
if (seen && fade < 1) fade = Math.min(1, fade + dt / 2.4);
const lx = inp && inp.on ? clamp(inp.x / Math.max(1, W) - 0.5, -0.5, 0.5) : 0, ly = inp && inp.on ? clamp(inp.y / Math.max(1, H) - 0.5, -0.5, 0.5) : 0;
const kk = 1 - Math.exp(-dt * 0.9); leanX += (lx - leanX) * kk; leanY += (ly - leanY) * kk;
const sc = clamp(window.scrollY / Math.max(1, H), 0, 1); scroll += (sc - scroll) * (1 - Math.exp(-dt * 2));
if (G.windAt) G.windAt(W * 0.5, H * 0.45, wv); else { wv[0] = 24; wv[1] = 0; }
const gust = 0.55 + 0.45 * Math.sin(t * 0.16) * Math.sin(t * 0.093 + 1.1), tgt = clamp(wv[0] * 0.03, -1.2, 1.2) * gust + 0.9 * Math.sin(t * 0.52) * (0.4 + 0.6 * gust) + 0.5 * Math.sin(t * 0.97 + 2.0) * 0.5;
const w0 = 2.2, k2 = w0 * w0, c2 = 2 * w0;
let n = Math.max(1, Math.ceil(dt / 0.02)), h = dt / n; for (let i = 0; i < n; i++) { swV += (k2 * (tgt - sw) - c2 * swV) * h; sw += swV * h; const tg2 = 0.35 * Math.sin(t * 0.4 + 1.0); syV += (k2 * (tg2 - sy) - c2 * syV) * h; sy += syV * h; }
acc += dt; const step = tier === 'rich' ? 1 / 12 : 1 / 8;
if (acc >= step) { const a = Math.min(acc, 0.3); acc = 0; tSim += a; stepMist(a, tSim, wv[0]); dirty = true; }
},
draw(gl, e) {
const L = G.lake, tex = L && L.tex && L.tex();
if (!prog || !prog.ok || !tex || !fade || !L.ready) { F.ready = false; return; }
if (dirty) upload(gl);
const hv = grab(gl);
gl.useProgram(prog.p);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(prog.loc('uTex'), 0);
gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mistTex); gl.uniform1i(prog.loc('uMist'), 1);
gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, vtex); gl.uniform1i(prog.loc('uVid'), 2); gl.uniform1f(prog.loc('uHasV'), hv ? 1 : 0);
const c0 = L.cover, f = fade * fade * (3 - 2 * fade) * e.intensity;
gl.uniform4f(prog.loc('uCover'), c0[0], c0[1], c0[2], c0[3]);
gl.uniform2f(prog.loc('uBuf'), e.bw, e.bh); gl.uniform2f(prog.loc('uSun'), L.sun[0], L.sun[1]);
gl.uniform1f(prog.loc('uScale'), scale); gl.uniform1f(prog.loc('uT'), t); gl.uniform1f(prog.loc('uFade'), f);
gl.uniform1f(prog.loc('uWL'), L.wl); gl.uniform1f(prog.loc('uAsp'), L.asp); gl.uniform1f(prog.loc('uQ'), tier === 'rich' ? 1 : 0);
gl.uniform3f(prog.loc('uTint'), L.tint[0], L.tint[1], L.tint[2]);
const fz = F.freeze ? 0 : 1; gl.uniform3f(prog.loc('uPar'), leanX * fz, leanY * fz, scroll * fz); gl.uniform3f(prog.loc('uSw'), sw * fz, sy * fz, 0);
const x0 = Math.max(0, Math.floor(c0[0] * scale)), x1 = Math.min(e.bw, Math.ceil((c0[0] + c0[2]) * scale)), y0 = Math.max(0, Math.floor((c0[1] + 0.36 * c0[3]) * scale)), y1 = Math.min(e.bh, Math.ceil((c0[1] + 0.6 * c0[3]) * scale));
if (x1 <= x0 || y1 <= y0) return;
gl.enable(gl.SCISSOR_TEST); gl.scissor(x0, e.bh - y1, x1 - x0, y1 - y0);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
e.tri(); gl.disable(gl.SCISSOR_TEST);
F.ready = true; R.dataset.fxFar = '1';
},
dispose() { unwatchVideo(); if (mo) { mo.disconnect(); mo = null; } delete R.dataset.fxFar; F.ready = false; env = prog = mistTex = vtex = null; D = D2 = M = null; el = null; },
};
G.register(fx);
})();
