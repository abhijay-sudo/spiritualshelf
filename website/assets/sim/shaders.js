(() => {
const G = window.SpiritualGPU; if (!G) return;
const V3 = '#version 300 es\n';
const TRI = V3 + `out vec2 vUv;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const HASH = `float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }`;
const water = (mode, bright) => V3 + `precision highp float;
#define MODE ${mode}
${bright ? '#define BRIGHT' : ''}
uniform sampler2D uTex, uH, uM;
uniform vec4 uCover, uBox, uL[14];
uniform vec2 uBuf, uTexel, uSun;
uniform float uScale, uT, uFade, uWL, uAsp, uK, uChop;
uniform vec3 uTint;
uniform int uNL;
out vec4 o;
${HASH}
void main(){
vec2 css = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / uScale;
vec2 uv = (css - uCover.xy) / uCover.zw;
vec2 g = (uv - uBox.xy) / (uBox.zw - uBox.xy);
if (g.x < 0.0 || g.y < 0.0 || g.x > 1.0 || g.y > 1.0) discard;
float depth = clamp((uv.y - uWL) / (1.0 - uWL), 0.0, 1.0);
float ramp = texture(uM, g).r * smoothstep(0.0, 0.085, uv.y - uBox.y);
float cov = ramp * uFade;
if (cov < 0.003) discard;
float hw = texture(uH, g - vec2(uTexel.x, 0.0)).r, he = texture(uH, g + vec2(uTexel.x, 0.0)).r;
float hn = texture(uH, g - vec2(0.0, uTexel.y)).r, hs = texture(uH, g + vec2(0.0, uTexel.y)).r;
float hc = texture(uH, g).r;
float per = mix(0.32, 1.0, depth);
vec2 sl = vec2(hw - he, hn - hs) * uK * per;
float z = 1.0 / (uv.y - uWL + 0.05);
vec2 q = vec2((uv.x - 0.5) * z * uAsp * 2.2, z * 1.3);
vec2 cn = vec2(sin(q.x * 3.1 + q.y * 1.3 + uT * 0.45) + sin(q.x * 5.7 - q.y * 2.1 - uT * 0.31), sin(q.x * 2.3 - q.y * 3.3 + uT * 0.37) + sin(q.x * 4.1 + q.y * 1.9 - uT * 0.27)) * 0.5;
sl += cn * uChop * per;
vec3 n = normalize(vec3(sl, 1.0));
vec2 off = sl * vec2(0.05, 0.034) * ramp;
vec3 add = vec3(0.0);
vec2 sd = (uSun - uv) * vec2(uAsp / 1.78, 1.0);
vec3 Lh = normalize(vec3(sd * vec2(0.22, 0.5), 0.9));
vec3 Hh = normalize(Lh + vec3(0.0, 0.0, 1.0));
float sp = pow(max(dot(n, Hh), 0.0), 700.0);
float col_w = exp(-pow((uv.x - uSun.x) * uAsp / (0.14 + 0.3 * depth), 2.0));
add += uTint * sp * 6.5 * col_w * (0.35 + 0.65 * depth) * clamp((length(sl) - 0.025) * 14.0, 0.0, 1.0);
float trough = smoothstep(0.0, 0.05, -hc) * 0.5;
for (int i = 0; i < 14; i++) {
if (i >= uNL) break;
vec4 L = uL[i];
vec2 d = vec2((uv.x - L.x) * uAsp, uv.y - L.y);
float r = L.w;
float glow = L.z / (1.0 + dot(d, d) / (r * r) * 9.0);
float sx = (d.x + sl.x * 0.05) / (r * 0.5);
float streak = exp(-sx * sx) * exp(-max(d.y, 0.0) / (r * 4.0)) * smoothstep(-r * 0.3, r * 0.2, d.y) * (0.75 + 2.0 * length(sl));
add += vec3(1.0, 0.5, 0.16) * (glow * 0.26 + streak * 0.5 * L.z) + vec3(1.0, 0.8, 0.45) * pow(max(glow, 0.0), 2.0) * 0.22;
}
add = min(add, vec3(1.6));
#ifdef BRIGHT
o = vec4(add * cov, 1.0);
#else
vec3 col;
#if MODE == 0
col = uTint * (0.10 + 0.05 * depth) + add * 0.8;
float a = min(cov, 0.35) * (0.55 + 0.45 * depth);
o = vec4(col * a, a);
#else
col = texture(uTex, uv + off).rgb;
#if MODE == 2
vec2 ru = vec2(uv.x + off.x * 1.6, 2.0 * uWL - uv.y + off.y * 2.2);
vec3 refl = textureLod(uTex, ru, 0.5 + depth * 2.2).rgb;
float Y = dot(refl, vec3(0.299, 0.587, 0.114));
float fres = 0.04 + 0.96 * pow(1.0 - n.z, 5.0);
col = mix(col, refl, clamp(fres * 1.6, 0.0, 0.2));
float rip = clamp((length(sl) - 0.08) * 8.0, 0.0, 1.0);
add += uTint * pow(smoothstep(0.86, 1.0, Y), 2.0) * rip * 0.45 * (0.3 + 0.7 * depth);
#endif
col *= 1.0 - trough * 0.22;
col += add;
col += (hash(gl_FragCoord.xy + fract(uT)) - 0.5) / 255.0;
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
