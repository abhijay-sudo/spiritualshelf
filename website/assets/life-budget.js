const COST = { css: 0, waapi: 1, webgl: 2, physx: 3 };
const LABELS = new Set(['PhysX', 'custom force on PhysX', 'spring/ODE', 'shader', 'CSS']);
export function createBudget({ bus, slowMs = 24, hz = 60 } = {}) {
const effects = new Map(), dropped = [], log = [];
const ring = new Float32Array(180); let ri = 0, rn = 0, wN = 0, wSlow = 0, wMid = 0, slowWins = 0, ignore = 0, coolUntil = 0, goodMs = 0, wMs = 0, offTap = null, offUse = null, disposed = false;
const lt = { total: 0, sweep: 0, swap: 0, over100: 0, max: 0, recent: [] };
const marks = { sweep: 0, swap: 0 };
let worker = null, po = null, taps = 0, seq = 0;
const now = () => performance.now();
const note = (what, why) => { log.push({ t: Math.round(now()), what, why }); if (log.length > 40) log.shift(); };
const register = (o) => {
if (!o || !o.id || !(o.cost in COST)) throw new Error('life-budget: an effect needs an id and a cost class (css, waapi, webgl, physx)');
if (!LABELS.has(o.label)) throw new Error('life-budget: label must be one of ' + Array.from(LABELS).join(', '));
const id = o.id + '#' + ++seq;
const e = { id, name: o.id, owner: o.owner || o.id, cost: o.cost, label: o.label, priority: o.priority == null ? 5 : o.priority, drop: o.drop || (() => {}), restore: o.restore || (() => {}), dropped: false, ms: 0, bodies: 0, restores: 0, t: 0 };
effects.set(id, e); arm();
return {
id, get dropped() { return e.dropped; },
begin() { e.t = performance.now(); }, end() { if (e.t) { e.ms = e.ms * 0.9 + (performance.now() - e.t) * 0.1; e.t = 0; } },
bodies(n) { e.bodies = n | 0; },
unregister() { effects.delete(id); const k = dropped.indexOf(e); if (k >= 0) dropped.splice(k, 1); disarm(); },
};
};
const arm = () => {
if (!offTap && bus && effects.size) { offTap = bus.tap(onFrame); offUse = bus.use({ pointer: true, scroll: true }); }   // (the same two listeners every package shares: they tell a sweep from a still page)
if (!po && effects.size) { try { po = new PerformanceObserver((l) => { for (const en of l.getEntries()) onLong(en); }); po.observe({ type: 'longtask', buffered: false }); } catch (e) { po = null; /* no long-task API (Firefox, Safari): frames only, and the overlay says so */ } }
};
const disarm = () => { if (!effects.size) { if (offTap) { offTap(); offTap = null; } if (offUse) { offUse(); offUse = null; } if (po) { po.disconnect(); po = null; } } };
const onFrame = (raw) => {
if (raw > 300 || raw <= 0) return;   // a tab that was away, a debugger, a first frame: not the page's pace
ring[ri] = raw; ri = (ri + 1) % ring.length; if (rn < ring.length) rn++;
{ const s = bus.state; if (Math.hypot(s.vx, s.vy) > 500 || Math.abs(s.svy) > 800) marks.sweep = now(); }
if (ignore > 0) { ignore--; return; }
wN++; wMs += raw; if (raw > slowMs) wSlow++; if (raw > slowMs * 0.7) wMid++;
if (wN < 60) return;
if (wSlow / wN >= 0.3) { goodMs = 0; if (++slowWins >= 2) { slowWins = 0; govern('two slow windows: ' + Math.round(1000 / (wMs / wN)) + ' fps'); } }
else { slowWins = 0; if (wMid === 0 && !lt.recent.length) goodMs += wMs; else goodMs = 0; if (goodMs >= 30000 && dropped.length) { goodMs = 0; restoreNext('30 s of clean frames'); } }
wN = wSlow = wMid = 0; wMs = 0;
};
const onLong = (en) => {
const t = now(), d = en.duration, during = t - marks.sweep < 400 ? 'sweep' : t - marks.swap < 600 ? 'swap' : '';
lt.total++; if (d > lt.max) lt.max = d; if (d > 100) lt.over100++; if (during) lt[during]++;
lt.recent.push(t); while (lt.recent.length && t - lt.recent[0] > 3000) lt.recent.shift();
if (lt.recent.length >= 3 || (during && d > 200)) { lt.recent.length = 0; govern(`long tasks (${Math.round(d)} ms${during ? ' during a ' + during : ''})`); }
};
const quantile = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const frames = () => { if (!rn) return { n: 0, p50: 0, p95: 0, max: 0, fps: 0 }; const a = Array.from(ring.subarray(0, rn)).sort((x, y) => x - y); let s = 0; for (const v of a) s += v; return { n: rn, p50: +quantile(a, 0.5).toFixed(2), p95: +quantile(a, 0.95).toFixed(2), max: +a[a.length - 1].toFixed(2), fps: +(1000 / (s / rn)).toFixed(1) }; };
const order = () => Array.from(effects.values()).filter((e) => !e.dropped).sort((a, b) => a.priority - b.priority || COST[b.cost] - COST[a.cost]);
const dropEffect = (e, why) => { if (e.dropped) return; e.dropped = true; dropped.push(e); try { e.drop(why); } catch (x) {} note('drop ' + e.name + ' [' + e.cost + ']', why); };
const govern = (why) => {
if (now() < coolUntil) return; const e = order()[0]; if (!e) return;
dropEffect(e, why); coolUntil = now() + 3000; ignore = 45; wN = wSlow = wMid = 0; wMs = 0; slowWins = 0; goodMs = 0;
};
const restoreNext = (why) => {
for (let i = dropped.length - 1; i >= 0; i--) {
const e = dropped[i]; if (e.restores >= 2) continue; dropped.splice(i, 1); e.dropped = false; e.restores++; try { e.restore(why); } catch (x) {} note('restore ' + e.name, why); ignore = 45; coolUntil = now() + 3000; return true;
}
return false;
};
const dropClass = (cost, why) => { for (const e of effects.values()) if (!e.dropped && COST[e.cost] >= COST[cost]) dropEffect(e, why); };   // (this class and every heavier one)
const dropAll = (why) => { for (const e of effects.values()) dropEffect(e, why); };
const stats = () => ({
frames: frames(), slowMs, longTasks: { supported: !!po || typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes || []).includes('longtask'), total: lt.total, sweep: lt.sweep, swap: lt.swap, over100: lt.over100, maxMs: +lt.max.toFixed(1) },
worker: worker, governor: { slowWins, goodS: Math.round(goodMs / 1000), coolMs: Math.max(0, Math.round(coolUntil - now())), dropped: dropped.map((e) => e.name), log: log.slice(-8) },
effects: Array.from(effects.values()).map((e) => ({ id: e.id, owner: e.owner, cost: e.cost, label: e.label, priority: e.priority, dropped: e.dropped, ms: e.cost === 'css' ? null : +e.ms.toFixed(3), bodies: e.bodies })),
});
const dispose = () => { disposed = true; if (offTap) offTap(); offTap = null; if (offUse) offUse(); offUse = null; if (po) po.disconnect(); po = null; effects.clear(); dropped.length = 0; };
return {
register, stats, dropClass, dropAll, restoreNext, dropNext: (why) => govern(why || 'asked'), dispose,
setWorker(w) { worker = w; },
mark(kind) { if (kind in marks) marks[kind] = now(); },
get armed() { return !!offTap; }, get disposed() { return disposed; }, COST,
};
}
