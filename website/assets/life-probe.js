const W = 300, H = 150, X0 = -2.4, X1 = 2.4, Y1 = 2.2;   // the panel's pixels and the world window (metres) it shows
export default async function mount(ctx) {
const ph = ctx.physics; if (!ph) return;
const host = document.createElement('div'), panel = document.createElement('div'); host.setAttribute('aria-hidden', 'true'); host.setAttribute('data-life-probe', ''); host.attachShadow({ mode: 'open' }).appendChild(panel);
host.style.cssText = `position:fixed;left:8px;bottom:8px;width:${W}px;height:${H}px;z-index:2147482999;pointer-events:none;contain:layout style paint`;
panel.style.cssText = `position:absolute;inset:0;background:rgba(20,14,8,.55);border-radius:4px;overflow:hidden`;
document.body.appendChild(host);
const sx = (x) => ((x - X0) / (X1 - X0)) * W, sy = (y) => H - (y / Y1) * H, ppm = W / (X1 - X0);
const dots = [];
const dot = (b, w, h, color) => { const e = document.createElement('i'); e.style.cssText = `position:absolute;left:0;top:0;width:${w * ppm}px;height:${h * ppm}px;margin:${-h * ppm / 2}px 0 0 ${-w * ppm / 2}px;background:${color};opacity:.85;will-change:transform`; panel.appendChild(e); dots.push({ b, e }); };
const solid = ph.group('solid', { cap: 4, collide: '*' }), bodies = ph.group('bodies', { cap: 12, collide: ['bodies', 'solid'] }), rig = ph.group('rig', { cap: 4, collide: ['solid'] }), leaves = ph.group('leaves', { cap: 8, collide: ['solid', 'leaves'] });
let wind = null, hits = 0, built = false;
const floor = solid.box({ pos: [0, -0.05, 0], half: [3, 0.05, 1], kind: 'static' });
const build = () => {
for (let i = 0; i < 5; i++) { const b = bodies.box({ pos: [-1.6 + i * 0.28, 1.3 + i * 0.22, 0], half: [0.11, 0.09, 0.11], density: 400, quat: [0, 0, Math.sin(i * 0.2), Math.cos(i * 0.2)] }); if (b) dot(b, 0.22, 0.18, '#d9a45b'); }
for (let i = 0; i < 2; i++) { const b = bodies.capsule({ pos: [-0.4 + i * 0.35, 1.9 + i * 0.3, 0], r: 0.05, hh: 0.12, density: 400, axis: 'x' }); if (b) dot(b, 0.34, 0.1, '#c4694d'); }
const pend = rig.capsule({ pos: [1.4, 1.35, 0], r: 0.04, hh: 0.28, density: 300, damp: [0.02, 0.4], sleep: 0 });
if (pend) { dot(pend, 0.08, 0.64, '#8fb8c8'); rig.joint({ type: 'd6', a: null, b: pend, anchorPos: [1.4, 1.95, 0], fa: { p: [0, 0, 0] }, fb: { p: [0, 0.3 + 0.02, 0] }, motion: { swing1: 'limited', swing2: 'limited', twist: 'locked' }, swing: [1.1, 0.01], drives: [{ axis: 'slerp', stiffness: 0, damping: 0.4 }] }); }
rig.trigger({ shape: { type: 'box', h: [0.5, 0.4, 1] }, pos: [-1.5, 0.45, 0], onEnter: () => { hits++; } });
for (let i = 0; i < 6; i++) { const b = leaves.box({ pos: [-0.9 + i * 0.3, 0.1 + (i % 3) * 0.05, 0], half: [0.09, 0.01, 0.06], density: 60, wind: 1.4, seed: i * 1.7, sleep: 0.001 }); if (b) dot(b, 0.18, 0.04, '#a7c46b'); }
wind = leaves.field({ kind: 'wind', dir: [1, 0, 0], speed: 0.9, turb: 0.5, gustGain: 7, wake: 0.3, lift: 1.5 });
built = true;
};
const h = ctx.budget.register({ id: 'probe-physx', label: 'PhysX', cost: 'physx', priority: 1, drop() { for (const g of [bodies, rig, leaves]) g.clear(); for (const d of dots) d.e.remove(); dots.length = 0; built = false; }, restore() { build(); } });
const hw = ctx.budget.register({ id: 'probe-wind', label: 'custom force on PhysX', cost: 'physx', priority: 1, drop() { wind && wind.off(); }, restore() { wind && wind.set({ on: true }); } });
build(); void floor;
const off = ctx.bus.use({ pointer: true, scroll: true, wheel: true }), tmp = new Float32Array(8);
const unGust = ctx.bus.on('gust', (g) => { for (const d of dots) if (d.b.group.endsWith('/rig') && d.b.alive) d.b.impulse([g.strength * 0.5 * (g.x || 1), 0, 0]); });
const draw = () => { h.bodies(bodies.count + rig.count); hw.bodies(leaves.count); for (const d of dots) { if (!d.b.alive) continue; d.b.pose(tmp); if (d.drawn && !(tmp[7] & 2)) continue; d.drawn = true;   // (a body that sleeps is left where it is)
const ang = 2 * Math.atan2(tmp[5], tmp[6]);   d.e.style.transform = `translate(${sx(tmp[0])}px,${sy(tmp[1])}px) rotate(${-ang}rad)`; } };
ph.onSnapshot(draw);
draw();
const dbg = window.SpiritualLife && window.SpiritualLife.debug; if (dbg) dbg.probe = { hits: () => hits, built: () => built, drop: () => { const b = bodies.box({ pos: [-1.5 + Math.random() * 3, 2, 0], half: [0.1, 0.1, 0.1], density: 400 }); if (b) dot(b, 0.2, 0.2, '#d9a45b'); return !!b; }, spam: (n) => { let ok = 0; for (let i = 0; i < n; i++) if (bodies.box({ pos: [-1 + i * 0.02, 2, 0], half: [0.05, 0.05, 0.05], density: 400 })) ok++; return ok; }, groups: () => ({ bodies: bodies.count, rig: rig.count, leaves: leaves.count }) };
return { dispose() { off(); unGust(); host.remove(); if (dbg) delete dbg.probe; } };
}
