(() => {
const G = window.SpiritualGPU; if (!G) return;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let env = null, pb = null, pr = null, pc = null, rA = null, rB = null, rC = null, rD = null, rR = null, key = '', W = 0, Hh = 0, kb = 0, kr = 0, safe = [0, 0, 0, 0], host = null, tierName = 'rich';
const free = () => { for (const r of [rA, rB, rC, rD, rR]) if (r && env) env.del(r); rA = rB = rC = rD = rR = null; key = ''; };
const make = (gl) => {
const k = W + 'x' + Hh; if (key === k && rA) return true; free();
rA = env.rt(W / 2, Hh / 2, 'rgba8'); rB = env.rt(W / 2, Hh / 2, 'rgba8'); rC = env.rt(W / 4, Hh / 4, 'rgba8'); rD = env.rt(W / 4, Hh / 4, 'rgba8'); rR = env.rt(W / 4, Hh / 4, 'rgba8');
key = k; return [rA, rB, rC, rD, rR].every((r) => r.ok);
};
const pass = (gl, P, rt, src, dx, dy) => { env.bind(rt); gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(P.loc('uSrc'), 0); gl.uniform2f(P.loc('uDir'), dx, dy); env.tri(); };
const fx = {
name: 'light', order: 40, wants: () => true,
init(gl, e) { env = e; rA = rB = rC = rD = rR = null; key = ''; kb = kr = 0; const S = G.sh; if (!S) return; pb = e.prog(S.TRI, S.BLUR); pr = e.prog(S.TRI, S.RAYS); pc = e.prog(S.TRI, S.COMP); },
resize(w, h, sc, tier) {
W = Math.round(w); Hh = Math.round(h); tierName = tier; host = env && env.host;
if (tier !== 'rich') { free(); return; }
const card = host && host.querySelector('.cx-open-card'); if (card && host) { const a = host.getBoundingClientRect(), b = card.getBoundingClientRect(); safe = [b.left - a.left, b.top - a.top, b.right - a.left, b.bottom - a.top]; }
},
draw(gl, e) {
const L = G.lake; if (e.tier !== 'rich' || !L.ready || !pb || !pb.ok || !pr || !pr.ok || !pc || !pc.ok || !W) { if (rA && e.tier !== 'rich') free(); return; }
if (!make(gl)) return;
const tex = L.tex && L.tex(), f = L.fade;
gl.disable(gl.SCISSOR_TEST);
L.drawBright(rA); if (G.diya) G.diya.drawFlames(rA);
gl.disable(gl.BLEND);
pass(gl, pb, rB, rA, 1.4 / rA.w, 0); pass(gl, pb, rA, rB, 0, 1.4 / rA.h);
pass(gl, pb, rC, rA, 1.8 / rA.w, 0); pass(gl, pb, rD, rC, 0, 1.4 / rC.h);
if (tex) {
env.bind(rR); gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pr.loc('uTex'), 0);
gl.uniform4fv(pr.loc('uCover'), L.cover); gl.uniform2fv(pr.loc('uSun'), L.sun); gl.uniform1f(pr.loc('uAsp'), L.asp); gl.uniform2f(pr.loc('uHost'), W, Hh); env.tri();
}
const br = 0.85 + 0.15 * Math.sin(e.t * Math.PI * 2 * 0.12);
kb += (0.24 * f * e.intensity - kb) * 0.1; kr += ((tex ? 0.4 : 0) * br * f * e.intensity - kr) * 0.1;
env.bind(null); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(pc.p);
const un = [['uB1', rA], ['uB2', rD], ['uR', rR]]; un.forEach(([n, r], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, r.tex); gl.uniform1i(pc.loc(n), i); });
gl.uniform4fv(pc.loc('uSafe'), safe); gl.uniform3f(pc.loc('uK'), kb, kr, 0); gl.uniform2f(pc.loc('uHost'), W, Hh); env.tri();
gl.activeTexture(gl.TEXTURE0); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
},
dispose() { free(); env = pb = pr = pc = null; host = null; },
};
G.register(fx);
})();
