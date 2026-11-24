(() => {
const G = window.SpiritualGPU; if (!G) return;
const V3 = '#version 300 es\n';
const TRI = V3 + `out vec2 vUv;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const HASH = `float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }`;
const water = (mode, bright) => V3 + `precision highp float;
#define MODE ${mode}
#define NW ${mode === 2 ? 16 : 8}
${bright ? '#define BRIGHT' : ''}
uniform sampler2D uTex, uH, uM;
uniform vec4 uCover, uBox;
uniform vec2 uBuf, uTexel, uSun;
uniform float uScale, uT, uFade, uWL, uAsp, uK, uChop;
uniform vec3 uTint;
out vec4 o;
${HASH}
const float FOCAL = 0.9;          // the camera's focal length in picture heights (about a 58 degree view)
const float GRAV = 5.8;           // gravity in camera heights per second squared (the camera sits about 1.7 m up)
vec2 waves(vec2 P, float t, vec2 feet, float rms){
vec2 S = vec2(0.0);
float wind = 0.62 * sin(t * 0.0571) + 0.2 * sin(t * 0.0233 + 1.3);              // the wind turns about a hundred seconds round
float gust = 0.62 + 0.38 * sin(P.x * 0.55 + 0.9 * sin(P.y * 0.42 + t * 0.05) + t * 0.03) * sin(P.y * 0.33 - 0.7 * sin(P.x * 0.27 + 1.1) + t * 0.021);
float nrm = rms * sqrt(2.0 / float(NW));
for (int i = 0; i < NW; i++) {
float fi = float(i) / float(NW - 1);
float lam = 3.4 * pow(0.085, fi);                                                // wavelength, long swell to short chop (3.4 down to 0.29)
float k = 6.2832 / lam;
float r1 = hash(vec2(float(i) * 1.37, 1.7)), r2 = hash(vec2(float(i) * 2.11, 9.1));
float sp = mix(0.32, 0.95, fi);                                                  // chop scatters wider than swell
float a = wind + 0.22 + (r1 * 2.0 - 1.0) * sp;
vec2 d = vec2(sin(a), -cos(a));                                                  // toward the viewer, a little aslant
float w = 0.25 * sqrt(GRAV * k);                                                 // deep-water dispersion, slowed so the whole lake stays calm
float ph = k * dot(d, P) - w * t + r2 * 6.2832;
float amp = nrm * pow(k / 6.0, 0.32) * mix(0.55, 1.0, smoothstep(0.0, 0.4, fi)) * mix(1.0, gust, smoothstep(0.25, 0.8, fi));
float fade = 1.0 - smoothstep(0.3, 0.85, k * max(abs(d.x) * feet.x, abs(d.y) * feet.y));   // under about seven pixels: gone, not aliased or banded
S += d * (amp * fade * cos(ph));
}
return S;
}
void main(){
vec2 css = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / uScale;
vec2 uv = (css - uCover.xy) / uCover.zw;
vec2 g = (uv - uBox.xy) / (uBox.zw - uBox.xy);
if (g.x < 0.0 || g.y < 0.0 || g.x > 1.0 || g.y > 1.0) discard;
float h = max(uv.y - uWL, 0.004);                                                   // below the horizon, in picture heights
float depth = clamp(h / (1.0 - uWL), 0.0, 1.0);
float ramp = texture(uM, g).r * smoothstep(0.0, 0.05, uv.y - uBox.y);
float cov = ramp * uFade;
if (cov < 0.003) discard;
float xi = (uv.x - 0.5) * uAsp;
vec2 P = vec2(xi / h, FOCAL / h);
float pix = 1.0 / (uCover.w / uAsp * uScale);                                       // one device pixel in picture heights
vec2 feet = vec2(pix / h, pix * FOCAL / (h * h));              // a pixel's reach on the ground across and along the lake
vec2 S = waves(P, uT, feet, uChop * (0.3 + 0.7 * smoothstep(0.0, 0.32, h)));
float hw = texture(uH, g - vec2(uTexel.x * 1.5, 0.0)).r, he = texture(uH, g + vec2(uTexel.x * 1.5, 0.0)).r;
float hn = texture(uH, g - vec2(0.0, uTexel.y * 1.5)).r, hs = texture(uH, g + vec2(0.0, uTexel.y * 1.5)).r;
float hc = texture(uH, g).r;
vec2 wk = clamp(vec2(he - hw, hn - hs) * (uK * 0.22), vec2(-0.12), vec2(0.12));
S += wk * mix(0.45, 1.0, depth);
vec3 n = normalize(vec3(-S.x, 1.0, -S.y));
vec3 Vv = normalize(vec3(-P.x, 1.0, -P.y));
float cosT = max(dot(n, Vv), 0.0);
float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);                                   // Schlick, F0 0.02 for an index of 1.333
vec3 Ls = normalize(vec3((uSun.x - 0.5) * uAsp / FOCAL, (uWL - uSun.y) / FOCAL, 1.0));
vec3 Hs = normalize(Ls + Vv);
float ndh = max(dot(n, Hs), 0.0);
float colw = exp(-pow(xi / (0.05 + 0.30 * h), 2.0));
float glow = (pow(ndh, 70.0) * 0.30 + pow(ndh, 380.0) * 0.45);                     // broad soft glints, never pin-points
float steep = length(S);
float foam = smoothstep(0.075, 0.17, steep) * smoothstep(0.02, 0.2, h);
float lobe = exp(-pow(xi / (0.05 + 0.34 * h), 2.0));                              // the path itself: a soft gold column, wider as it comes toward the viewer
float sheen = clamp(0.62 + 7.0 * (-S.y), 0.25, 1.5);                              // brighter on the facets that lean toward the sun
vec3 add = uTint * (glow * colw * 0.7 + foam * colw * 0.2) * (0.3 + 0.7 * smoothstep(0.0, 0.25, h));
add += uTint * lobe * sheen * 0.045 * (1.0 - 0.55 * depth) * smoothstep(0.0, 0.05, h);
add = min(add, vec3(0.7));
#ifdef BRIGHT
o = vec4(add * cov, 1.0);
#else
vec3 col;
#if MODE == 0
col = uTint * (0.10 + 0.05 * depth) + add * 0.8;
float a = min(cov, 0.35) * (0.55 + 0.45 * depth);
o = vec4(col * a, a);
#else
float near = smoothstep(0.0, 0.34, h);
vec2 duv = vec2(S.x * 0.03, S.y * 0.2) * (0.25 + 0.75 * near);
vec3 body = textureLod(uTex, clamp(uv + duv, vec2(0.0), vec2(1.0)), 0.55 + 1.4 * (1.0 - near)).rgb;
float lum = dot(body, vec3(0.299, 0.587, 0.114));
float see = (1.0 - fres) * smoothstep(0.08, 0.8, h) * (1.0 - smoothstep(0.55, 0.9, lum));
body = mix(body, body * vec3(0.84, 0.95, 1.1), 0.5 * see);
float facet = clamp(-S.y * 2.6 - S.x * 0.5, -0.09, 0.09) * (0.35 + 0.65 * near);
col = body * (1.0 + facet);
col += uTint * max(facet, 0.0) * 0.45 * smoothstep(0.55, 0.0, lum);
vec3 haze = textureLod(uTex, vec2(uv.x, uWL - 0.05), 4.0).rgb;
float hz = 1.0 - smoothstep(0.0, 0.17, uv.y - uWL);
col = mix(col, mix(textureLod(uTex, uv, 3.0).rgb, haze, 0.5), hz * 0.8);
float trough = smoothstep(0.0, 0.05, -hc) * 0.5;
col *= 1.0 - trough * 0.22;
col += add;
col += (hash(gl_FragCoord.xy + fract(uT)) + hash(gl_FragCoord.yx * 1.7 + fract(uT * 0.7)) - 1.0) * (1.5 / 255.0);
o = vec4(col * cov, cov);
#endif
#endif
}`;
const BOWL_VS = V3 + `layout(location=0) in vec2 q;
layout(location=1) in vec4 a;
layout(location=2) in vec4 b;
uniform vec2 res;
out vec2 uv; out float al; out float dr;
void main(){
float c = cos(a.w), s = sin(a.w);
vec2 p = q * a.z; p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
vec2 pos = a.xy + vec2(p.x, -p.y) - vec2(0.0, b.x);
gl_Position = vec4(pos.x / res.x * 2.0 - 1.0, 1.0 - pos.y / res.y * 2.0, 0.0, 1.0);
uv = vec2(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5); al = b.y; dr = b.w;
}`;
const BOWL_FS = V3 + `precision mediump float;
in vec2 uv; in float al; in float dr;
uniform sampler2D uAtlas;
uniform float uGlow;
out vec4 o;
void main(){
vec4 c = texture(uAtlas, uv);
float lit = 0.8 + 0.5 * uGlow * smoothstep(0.7, 0.2, uv.y);
vec3 col = c.rgb * lit;
col = mix(col, col * vec3(0.78, 0.74, 0.86), smoothstep(0.55, 0.85, uv.y) * 0.55 * dr);
o = vec4(col, c.a) * al;
}`;
const FLAME_VS = V3 + `layout(location=0) in vec2 q;
layout(location=1) in vec4 a;
layout(location=2) in vec4 b;
uniform vec2 res;
out vec2 s; out float al; out float sd;
void main(){
float k = a.z * 3.6;
vec2 pos = a.xy + vec2(0.0, -a.z * 0.19 - b.x - a.z * 0.9) + vec2(q.x * k, -q.y * k);
gl_Position = vec4(pos.x / res.x * 2.0 - 1.0, 1.0 - pos.y / res.y * 2.0, 0.0, 1.0);
s = vec2(q.x * 3.6, 0.9 + q.y * 3.6); al = b.y; sd = b.z;
}`;
const FLAME_FS = V3 + `precision mediump float;
in vec2 s; in float al; in float sd;
uniform float uT, uHalo;
out vec4 o;
void main(){
float fl = 0.5 + 0.5 * (sin(1.7 * uT + sd * 17.0) + sin(2.3 * uT + sd * 31.0) * 0.6) / 1.6;
float inten = 0.88 + 0.24 * fl;
float sway = (sin(1.3 * uT + sd * 9.0) * 0.12 + sin(2.1 * uT + sd * 23.0) * 0.07);
float yy = s.y;
float u = clamp(yy / 2.1, 0.0, 1.0);
float wd = 0.36 * pow(max(1.0 - u, 0.0), 0.8) * smoothstep(0.0, 0.16, u) + 0.001;
float dx = (s.x - sway * u * u * 2.0) / wd;
float body = exp(-dx * dx * 1.7) * smoothstep(-0.02, 0.07, u) * (1.0 - smoothstep(0.82, 1.0, u));
float core = exp(-dx * dx * 6.0) * smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.38, 0.75, u));
vec3 fc = mix(vec3(1.0, 0.36, 0.05), vec3(1.0, 0.74, 0.24), clamp(core * 1.2, 0.0, 1.0));
fc = mix(fc, vec3(1.0, 0.9, 0.62), core * core * 0.7);
float r2 = dot(vec2(s.x, (yy - 0.8) * 0.9), vec2(s.x, (yy - 0.8) * 0.9));
float halo = exp(-r2 * 0.5) * uHalo;
vec3 c = fc * (body * 1.5 + core * 1.1) + vec3(1.0, 0.5, 0.16) * halo * 0.34;
o = vec4(c * inten * al, 0.0);
}`;
const BLUR = V3 + `precision mediump float;
in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uDir;
out vec4 o;
void main(){
vec4 c = texture(uSrc, vUv) * 0.2270270;
c += (texture(uSrc, vUv + uDir * 1.3846154) + texture(uSrc, vUv - uDir * 1.3846154)) * 0.3162162;
c += (texture(uSrc, vUv + uDir * 3.2307692) + texture(uSrc, vUv - uDir * 3.2307692)) * 0.0702703;
o = c;
}`;
const RAYS = V3 + `precision mediump float;
in vec2 vUv; uniform sampler2D uTex;
uniform vec4 uCover; uniform vec2 uSun, uHost; uniform float uAsp;
out vec4 o;
void main(){
vec2 css = vec2(vUv.x * uHost.x, (1.0 - vUv.y) * uHost.y);
vec2 uv = (css - uCover.xy) / uCover.zw;
float sky = 1.0 - smoothstep(0.43, 0.52, uv.y);
vec2 dl = (uSun - uv) / 12.0;
float w = 1.0, acc = 0.0;
for (int i = 0; i < 12; i++) {
uv += dl;
vec3 c = textureLod(uTex, uv, 2.0).rgb;
float Y = dot(c, vec3(0.299, 0.587, 0.114));
vec2 sq = (uv - uSun) * vec2(uAsp, 1.0);
acc += smoothstep(0.74, 0.99, Y) * exp(-dot(sq, sq) / 0.2) * w * step(uv.y, 0.505);
w *= 0.94;
}
o = vec4(vec3(1.0, 0.8, 0.5) * min(acc * 0.075, 0.4) * sky, 1.0);
}`;
const COMP = V3 + `precision mediump float;
in vec2 vUv; uniform sampler2D uB1, uB2, uR;
uniform vec4 uSafe; uniform vec3 uK; uniform vec2 uHost;
out vec4 o;
void main(){
vec2 css = vec2(vUv.x * uHost.x, (1.0 - vUv.y) * uHost.y);
vec2 lo = smoothstep(vec2(0.0), vec2(40.0), css - uSafe.xy), hi = smoothstep(vec2(0.0), vec2(40.0), uSafe.zw - css);
float safe = mix(1.0, 0.35, lo.x * lo.y * hi.x * hi.y);
vec3 c = (texture(uB1, vUv).rgb * uK.x + texture(uB2, vUv).rgb * uK.x * 1.2) * vec3(1.0, 0.7, 0.4) + texture(uR, vUv).rgb * uK.y;
c *= safe;
o = vec4(c, 0.0);
}`;
G.sh = { TRI, water, BOWL_VS, BOWL_FS, FLAME_VS, FLAME_FS, BLUR, RAYS, COMP };
})();
