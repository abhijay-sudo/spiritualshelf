export default function mount(ctx) {
const sp = new ctx.spring.Spring(0, 3, 0.7), h = ctx.budget.register({ id: 'probe-lite', label: 'spring/ODE', cost: 'waapi', priority: 1, drop() { off(); }, restore() { on(); } });
let release = null, off1 = null, burn = 0;
const frame = (dt, s) => { h.begin(); sp.target = s.nx; sp.step(dt); if (burn) { const e = performance.now() + burn; while (performance.now() < e); } window.__lifeProbe = { x: +sp.x.toFixed(3), gust: +s.gust.toFixed(2) }; h.end(); };
const on = () => { if (release) return; release = ctx.bus.use({ pointer: true, scroll: true, wheel: true }); off1 = ctx.bus.frame(frame); };
const off = () => { if (off1) off1(); if (release) release(); release = off1 = null; };
on();
if (window.SpiritualLife && window.SpiritualLife.debug) window.SpiritualLife.debug.burn = (ms) => { burn = +ms || 0; };
return { dispose() { off(); if (window.SpiritualLife && window.SpiritualLife.debug) delete window.SpiritualLife.debug.burn; delete window.__lifeProbe; } };
}
