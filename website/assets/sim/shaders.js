(() => {
const G = window.SpiritualGPU; if (!G) return;
const V3 = '#version 300 es\n';
const TRI = V3 + `out vec2 vUv;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const HASH = `float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }`;
const water = (mode, bright, ultra) => V3 + `precision highp float;
#define MODE ${mode}
#define NW ${mode === 2 ? 16 : 8}
${bright ? '#define BRIGHT' : ''}
${ultra ? '#define ULTRA' : ''}
uniform sampler2D uTex, uH, uM;
uniform vec4 uCover, uBox;
uniform vec2 uBuf, uTexel, uSun;
uniform float uScale, uT, uFade, uWL, uAsp, uK, uChop, uWind;   // uWind 0..1: a gust, steered by assets/life-water.js
uniform vec3 uTint;
#ifdef ULTRA
uniform float uU;                    // Ultra's strength, eased 0 to 1 by the caller (0: the Rich look exactly)
uniform vec4 uCa[4];                 // up to four floating petals: (x, y: place in the picture; z: reach; w: strength), for the light the water throws under them
uniform vec3 uUk;                    // switches: x fine ripples, y caustics, z glitter path
#endif
uniform vec4 uGl[2];                 // up to two soft pulses of extra glitter where a floating body crossed the sun's path (x, y: place in the picture; z: reach; w: strength, eased by the caller)
out vec4 o;
${HASH}
const float FOCAL = 0.9;          // the camera's focal length in picture heights (about a 58 degree view)
const float GRAV = 5.8;           // gravity in camera heights per second squared (the camera sits about 1.7 m up)
#ifndef ULTRA
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
#endif
#ifdef ULTRA
uniform vec4 uWa[30];
uniform vec2 uWb[30];
vec2 waves(vec2 P, float t, vec2 feet, float rms){
vec2 S = vec2(0.0);
float gust = 0.62 + 0.38 * sin(P.x * 0.55 + 0.9 * sin(P.y * 0.42 + t * 0.05) + t * 0.03) * sin(P.y * 0.33 - 0.7 * sin(P.x * 0.27 + 1.1) + t * 0.021);
float nrm = rms * 0.35355339;
for (int i = 0; i < 16; i++) {
vec4 a = uWa[i]; vec2 b = uWb[i];
float fade = 1.0 - smoothstep(0.3, 0.85, a.z * max(abs(a.x) * feet.x, abs(a.y) * feet.y));
S += a.xy * (nrm * b.x * mix(1.0, gust, b.y) * fade * cos(a.z * dot(a.xy, P) + a.w));
}
return S;
}
vec2 fineWaves(vec2 P, float t, vec2 feet, float rms){
vec2 S = vec2(0.0);
for (int i = 16; i < 30; i++) {
vec4 a = uWa[i];
float fade = 1.0 - smoothstep(0.35, 1.0, a.z * max(abs(a.x) * feet.x, abs(a.y) * feet.y));
S += a.xy * (rms * uWb[i].x * fade * cos(a.z * dot(a.xy, P) + a.w));
}
return S;
}
float caustic(vec2 p, float t){
vec2 q = p; float c = 0.0;
for (int i = 0; i < 3; i++) {
float f = float(i);
q += vec2(sin(q.y * 1.7 + t * 0.21 + f * 1.3), cos(q.x * 1.5 - t * 0.17 + f * 2.1)) * 0.5;
c += 1.0 - abs(sin(q.x * 2.1 + sin(q.y * 1.3 + f)) * 0.5 + sin(q.y * 1.9 - q.x * 0.7) * 0.5);
}
c *= 0.3333;
return pow(clamp(c, 0.0, 1.0), 6.0);
}
#endif
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
#ifdef ULTRA
S += fineWaves(P, uT, feet, uChop * (0.3 + 0.7 * smoothstep(0.0, 0.32, h))) * (uU * uUk.x * 1.9);
#endif
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
#ifdef ULTRA
{
vec3 dn = n - normalize(Ls + Vv) * dot(n, normalize(Ls + Vv));
float ac = exp(-(dn.x * dn.x / 0.0006 + dn.z * dn.z / 0.0070));
glow += (pow(ndh, 1500.0) * 0.85 + ac * 0.52) * uU * uUk.z;
}
#endif
float steep = length(S);
float foam = smoothstep(0.075, 0.17, steep) * smoothstep(0.02, 0.2, h);
float lobe = exp(-pow(xi / (0.05 + 0.34 * h), 2.0));                              // the path itself: a soft gold column, wider as it comes toward the viewer
float sheen = clamp(0.62 + 7.0 * (-S.y), 0.25, 1.5);                              // brighter on the facets that lean toward the sun
vec3 add = uTint * (glow * colw * 0.7 + foam * colw * 0.2) * (0.3 + 0.7 * smoothstep(0.0, 0.25, h));
add += uTint * lobe * sheen * 0.045 * (1.0 - 0.55 * depth) * smoothstep(0.0, 0.05, h);
if (uGl[0].w + uGl[1].w > 0.001) {
vec2 q0 = (uv - uGl[0].xy) * vec2(uAsp, 1.0), q1 = (uv - uGl[1].xy) * vec2(uAsp, 1.0);
add *= 1.0 + uGl[0].w * exp(-dot(q0, q0) / (uGl[0].z * uGl[0].z)) + uGl[1].w * exp(-dot(q1, q1) / (uGl[1].z * uGl[1].z));
}
#ifdef ULTRA
{
float cell = max(feet.x, feet.y) * 2.4;
float vis = (1.0 - smoothstep(0.30, 0.9, cell)) * uU * uUk.y;
if (vis > 0.002) {
float cz = caustic(P * 1.15, uT);
add += uTint * cz * lobe * 0.26 * vis * (0.4 + 0.6 * smoothstep(0.08, 0.35, h));
for (int i = 0; i < 4; i++) { if (uCa[i].w > 0.001) { vec2 qq = (uv - uCa[i].xy) * vec2(uAsp, 1.0); add += uTint * caustic(P * 2.3 + float(i) * 3.7, uT * 1.2) * exp(-dot(qq, qq) / (uCa[i].z * uCa[i].z)) * uCa[i].w * 0.18 * vis; } }
}
}
#endif
#if defined(ULTRA) && defined(BRIGHT)
add = min(add, vec3(1.5));      // (the bloom reads the light in HDR: a glint may be brighter than the page can show, and is tone-mapped when it is added back)
#else
add = min(add, vec3(0.7));
#endif
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
float bank = 1.0 - smoothstep(0.0, 0.14, h);
duv.x += sin(uv.y * 520.0 - uT * 1.9 + S.x * 40.0) * 0.0011 * bank * (0.35 + 1.4 * uWind);
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
#ifdef ULTRA
{
vec3 skyR = textureLod(uTex, vec2(uv.x + S.x * 0.03, uWL - 0.06 - 0.18 * h), 3.0).rgb;
col = mix(col, skyR, clamp(fres * 0.9, 0.0, 0.5) * uU * smoothstep(0.42, 0.04, h));
}
#endif
col += add;
col += (hash(gl_FragCoord.xy + fract(uT)) + hash(gl_FragCoord.yx * 1.7 + fract(uT * 0.7)) - 1.0) * (1.5 / 255.0);
o = vec4(col * cov, cov);
#endif
#endif
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
G.sh = { TRI, water, BLUR, RAYS, COMP };
})();
