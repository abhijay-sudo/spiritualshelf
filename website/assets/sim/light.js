(() => {
const G = window.SpiritualGPU; if (!G) return;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let pru = null, pcu = null, rU = null, keyU = '', env = null, pb = null, pr = null, pc = null, rA = null, rB = null, rC = null, rD = null, rR = null, key = '', W = 0, Hh = 0, kb = 0, kr = 0, safe = [0, 0, 0, 0], host = null, tierName = 'rich';
const free = () => { for (const r of [rA, rB, rC, rD, rR]) if (r && env) env.del(r); rA = rB = rC = rD = rR = null; key = ''; freeU(); };
const freeU = () => { if (rU && env) for (const r of rU) env.del(r); rU = null; keyU = ''; };
const makeU = (gl, U) => {
const sh = U.f.bloomHalf ? 2 : 1, fmt = U.f.hdr ? 'rgba16f' : 'rgba8', k = W + 'x' + Hh + fmt + sh; if (keyU === k && rU) return true; freeU();
const w0 = W / (4 * sh), h0 = Hh / (4 * sh); rU = [];
for (let i = 0; i < 4; i++) { rU.push(env.rt(w0 / (1 << i), h0 / (1 << i), fmt)); rU.push(env.rt(w0 / (1 << i), h0 / (1 << i), fmt)); }
rU.push(env.rt(W / 4, Hh / 4, 'rgba8')); keyU = k; return rU.every((r) => r.ok);
};
const make = (gl) => {
const k = W + 'x' + Hh; if (key === k && rA) return true; free();
rA = env.rt(W / 2, Hh / 2, 'rgba8'); rB = env.rt(W / 2, Hh / 2, 'rgba8'); rC = env.rt(W / 4, Hh / 4, 'rgba8'); rD = env.rt(W / 4, Hh / 4, 'rgba8'); rR = env.rt(W / 4, Hh / 4, 'rgba8');
key = k; return [rA, rB, rC, rD, rR].every((r) => r.ok);
};
const pass = (gl, P, rt, src, dx, dy) => { env.bind(rt); gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(P.loc('uSrc'), 0); gl.uniform2f(P.loc('uDir'), dx, dy); env.tri(); };
const drawU = (gl, e, U, L) => {
const tex = L.tex && L.tex(), f = L.fade, [a0, b0, a1, b1, a2, b2, a3, b3, rr] = rU;
gl.disable(gl.SCISSOR_TEST); L.drawBright(a0);
gl.disable(gl.BLEND);
pass(gl, pb, b0, a0, 1.5 / a0.w, 0); pass(gl, pb, a0, b0, 0, 1.5 / a0.h);
pass(gl, pb, b1, a0, 1.6 / a0.w, 0); pass(gl, pb, a1, b1, 0, 1.5 / b1.h);
pass(gl, pb, b2, a1, 1.6 / a1.w, 0); pass(gl, pb, a2, b2, 0, 1.5 / b2.h);
pass(gl, pb, b3, a2, 1.6 / a2.w, 0); pass(gl, pb, a3, b3, 0, 1.5 / b3.h);
const useR = tex && U.f.godrays;
if (useR) { env.bind(rr); gl.useProgram(pru.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pru.loc('uTex'), 0); gl.uniform4fv(pru.loc('uCover'), L.cover); gl.uniform2fv(pru.loc('uSun'), L.sun); gl.uniform1f(pru.loc('uAsp'), L.asp); gl.uniform2f(pru.loc('uHost'), W, Hh); gl.uniform1f(pru.loc('uT'), e.t); env.tri(); }
const br = 0.85 + 0.15 * Math.sin(e.t * Math.PI * 2 * 0.12), us = U.shade;
kb += ((0.087 + 0.062 * us) * f * e.intensity - kb) * 0.1; kr += ((useR ? 0.17 + 0.065 * us : 0) * br * f * e.intensity - kr) * 0.1;
env.bind(null); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(pcu.p);
[['uB1', a0], ['uB2', a1], ['uB3', a2], ['uB4', a3], ['uR', rr]].forEach(([n, r], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, r.tex); gl.uniform1i(pcu.loc(n), i); });
gl.uniform4fv(pcu.loc('uSafe'), safe); gl.uniform3f(pcu.loc('uK'), kb, kr, e.t); gl.uniform2f(pcu.loc('uHost'), W, Hh); env.tri();
gl.activeTexture(gl.TEXTURE0); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
};
const fx = {
name: 'light', order: 40, wants: () => true,
up(gl, e) { const S = G.sh; if (!S || !S.U || pru) return; pru = e.prog(S.TRI, S.U.RAYSU); pcu = e.prog(S.TRI, S.U.COMPU); },
init(gl, e) { env = e; pru = pcu = null; rA = rB = rC = rD = rR = null; key = ''; keyU = ''; rU = null; kb = kr = 0; const S = G.sh; if (!S) return; pb = e.prog(S.TRI, S.BLUR); pr = e.prog(S.TRI, S.RAYS); pc = e.prog(S.TRI, S.COMP); },
resize(w, h, sc, tier) {
W = Math.round(w); Hh = Math.round(h); tierName = tier; host = env && env.host;
if (tier !== 'rich') { free(); return; }
const card = host && host.querySelector('.cx-open-card'); if (card && host) { const a = host.getBoundingClientRect(), b = card.getBoundingClientRect(); safe = [b.left - a.left, b.top - a.top, b.right - a.left, b.bottom - a.top]; }
},
draw(gl, e) {
const L = G.lake; if (e.tier !== 'rich' || !L.ready || !pb || !pb.ok || !pr || !pr.ok || !pc || !pc.ok || !W) { if (rA && e.tier !== 'rich') free(); return; }
const U = e.U;
if (U && U.f.bloom && pru && pru.ok && pcu && pcu.ok) { if (rA) free(); if (makeU(gl, U)) { drawU(gl, e, U, L); return; } }
else if (rU) freeU();
if (!make(gl)) return;
const tex = L.tex && L.tex(), f = L.fade;
gl.disable(gl.SCISSOR_TEST);
L.drawBright(rA);
gl.disable(gl.BLEND);
pass(gl, pb, rB, rA, 1.4 / rA.w, 0); pass(gl, pb, rA, rB, 0, 1.4 / rA.h);
pass(gl, pb, rC, rA, 1.8 / rA.w, 0); pass(gl, pb, rD, rC, 0, 1.4 / rC.h);
if (tex) {
env.bind(rR); gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pr.loc('uTex'), 0);
gl.uniform4fv(pr.loc('uCover'), L.cover); gl.uniform2fv(pr.loc('uSun'), L.sun); gl.uniform1f(pr.loc('uAsp'), L.asp); gl.uniform2f(pr.loc('uHost'), W, Hh); env.tri();
}
const br = 0.85 + 0.15 * Math.sin(e.t * Math.PI * 2 * 0.12);
kb += (0.15 * f * e.intensity - kb) * 0.1; kr += ((tex ? 0.17 : 0) * br * f * e.intensity - kr) * 0.1;
env.bind(null); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(pc.p);
const un = [['uB1', rA], ['uB2', rD], ['uR', rR]]; un.forEach(([n, r], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, r.tex); gl.uniform1i(pc.loc(n), i); });
gl.uniform4fv(pc.loc('uSafe'), safe); gl.uniform3f(pc.loc('uK'), kb, kr, 0); gl.uniform2f(pc.loc('uHost'), W, Hh); env.tri();
gl.activeTexture(gl.TEXTURE0); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
},
dispose() { free(); env = pb = pr = pc = pru = pcu = null; host = null; },
};
G.register(fx);
})();
