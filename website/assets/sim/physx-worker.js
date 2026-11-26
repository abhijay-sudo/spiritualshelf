let world = null, life = null;   // life: the shared scene of the page's life packages (assets/sim/life-world.js), made on request, in this same PhysX instance
const post = (m, tr) => postMessage(m, tr || []);
onmessage = async (e) => {
const m = e.data;
try {
if (m.t === 'init') {
importScripts(m.cfg.core);
world = await SpiritualPhysX.create(m.cfg);
post({ t: 'ready', info: world.info() });
} else if (!world) {
return;
} else if (m.t === 'frame') {
const r = world.frame(m, m.pose);
post({ t: 'snap', pose: r.pose, env: m.env, ev: r.ev, stats: r.stats }, [r.pose.buffer, m.env.buffer]);
} else if (m.t === 'verify') {
post({ t: 'verify', id: m.id, r: world.verify(m.steps), info: world.info() });
} else if (m.t === 'bench') {
post({ t: 'bench', id: m.id, r: world.bench(m.n, m.steps), info: world.info() });
} else if (m.t === 'info') {
post({ t: 'info', id: m.id, info: world.info() });
} else if (m.t === 'ping') {
post({ t: 'pong', id: m.id });
} else if (m.t === 'life') {
if (m.op === 'init') { if (!self.SpiritualLifeWorld) importScripts(m.src); if (life) life.dispose(); life = self.SpiritualLifeWorld.create(world.engine, m.cfg); post({ t: 'life', op: 'ready', size: life.size, stats: life.stats() }); }
else if (!life) { return; }
else if (m.op === 'frame') { const r = life.frame(m); post({ t: 'life', op: 'snap', snap: r.snap, ev: r.ev, stats: r.stats, env: m.env }, [r.snap.buffer]); }
else if (m.op === 'stats') { post({ t: 'life', op: 'stats', id: m.id, stats: life.stats() }); }
else if (m.op === 'off') { life.dispose(); life = null; post({ t: 'life', op: 'off' }); }
} else if (m.t === 'dispose') {
if (life) { life.dispose(); life = null; }
world.dispose(); world = null; post({ t: 'disposed' });
}
} catch (err) {
post({ t: 'fail', stage: (err && err.stage) || (m && m.t) || 'run', message: String((err && err.message) || err).slice(0, 300) });
}
};
