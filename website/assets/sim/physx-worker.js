let world = null;
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
} else if (m.t === 'dispose') {
world.dispose(); world = null; post({ t: 'disposed' });
}
} catch (err) {
post({ t: 'fail', stage: (err && err.stage) || (m && m.t) || 'run', message: String((err && err.message) || err).slice(0, 300) });
}
};
