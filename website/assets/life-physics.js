const HDR = 6, STRIDE = 8;   // (the snapshot's header: sim time, awake, bodies, last step ms, active, steps)
export function createPhysics({ cfg, caps, budget, bus }) {
const wstat = { stepMs: 0, mean: 0, p95: 0, awake: 0, bodies: 0, idleSteps: 0 };   // (one object, updated in place: the budget reads it, nothing is made per frame)
let worker = null, ready = false, dead = false, inflight = 0, sentAt = 0, latest = null, spare = null, stats = null, cmds = [], bootT = 0, hb = 0, lastReply = 0, pingAt = 0, offFrame = null, idleFrames = 0, rejected = 0;
const snapFns = new Set(), free = [], slotOwner = [], slotGroup = [], groups = new Map(), triggers = new Map(), lost = new Set();
const nSlots = Math.max(0, caps.global | 0);
for (let i = nSlots - 1; i >= 0; i--) free.push(i);
let res, rej; const readyP = new Promise((a, b) => { res = a; rej = b; }); readyP.catch(() => {});
let fieldsOn = 0, sent = 0, wantStats = true;
const fail = (why) => {
if (dead) return; dead = true; ready = false; clearTimeout(bootT); clearInterval(hb); if (offFrame) { offFrame(); offFrame = null; }
try { worker && worker.terminate(); } catch (e) {} worker = null; rej(new Error(why));
for (const f of lost) { try { f(why); } catch (e) {} }
if (budget) budget.dropClass('physx', 'physics failed: ' + why);
};
const onMsg = (e) => {
const m = e.data; lastReply = performance.now();
if (m.t === 'ready') { if (budget) budget.setWorker(wstat); worker.postMessage({ t: 'life', op: 'init', src: cfg.life, cfg: { global: nSlots, perGroup: caps.perGroup, maxGroups: caps.groups, groupBudgetMs: caps.groupBudgetMs, maxJoints: caps.joints || 24, maxTriggers: caps.triggers || 12 } }); }
else if (m.t === 'fail') fail(m.message || 'worker failed');
else if (m.t === 'life' && m.op === 'ready') { latest = new Float32Array(m.size); spare = new Float32Array(m.size); ready = true; clearTimeout(bootT); res(); hb = setInterval(() => { const t = performance.now(); if (t - lastReply > 7000) fail('worker silent'); else if (t - pingAt > 3000) { pingAt = t; worker.postMessage({ t: 'ping', id: 0 }); } }, 1000); want(); }
else if (m.t === 'life' && m.op === 'snap') {
inflight = 0; spare = latest; latest = m.snap; if (m.stats) { stats = m.stats; wstat.mean = +stats.stepMean.toFixed(3); wstat.p95 = +stats.stepP95.toFixed(3); wstat.idleSteps = stats.idleSteps; }
wstat.stepMs = +latest[3].toFixed(3); wstat.awake = latest[1]; wstat.bodies = latest[2]; head.active = latest[4] > 0; head.steps = latest[5];
for (const ev of m.ev) {
if (ev.e === 'gone' || (ev.e === 'reject' && ev.slot != null)) { releaseSlot(ev.slot); if (ev.e === 'reject') rejected++; }
else if (ev.e === 'over') { const g = groups.get(ev.group); if (g && g.onOver) g.onOver(ev); }
if (ev.e === 'enter' || ev.e === 'leave') { const t = triggers.get(ev.trigger); if (t) { const f = ev.e === 'enter' ? t.onEnter : t.onLeave, o = slotOwner[ev.slot]; if (f) { try { f(o && o.body); } catch (x) {} } } }
}
for (const f of snapFns) { try { f(); } catch (x) {} }
for (const g of groups.values()) if (g.onSnapshot) { try { g.onSnapshot(); } catch (x) {} }
}
};
const releaseSlot = (s) => { const g = slotGroup[s]; if (g) { g.count--; } if (slotOwner[s]) { slotOwner[s].body.alive = false; slotOwner[s] = null; slotGroup[s] = null; free.push(s); } };
const head = { active: false, steps: 0 };
const awake = () => (head.active ? 1 : 0);   // (active: something is awake, or the worker has not yet taken a step it owes)
const want = () => { if (!offFrame && ready && !dead && bus) offFrame = bus.frame(step); };
const step = (dt) => {
if (!ready || dead) return;
const gust = bus.state.gust, live = cmds.length > 0 || awake() > 0 || (fieldsOn > 0 && gust > 0.02);
if (!live) { if (++idleFrames > 30 && offFrame) { offFrame(); offFrame = null; } return; }   // (all asleep and nothing asked: the worker is not messaged at all)
idleFrames = 0; if (inflight) { if (performance.now() - sentAt > 3000) fail('no reply to a frame'); return; }
const m = { t: 'life', op: 'frame', dt, cmds, env: { gust, gx: Math.abs(bus.state.gustX) < 0.3 ? (bus.state.gustX < 0 ? -0.7 : 0.7) : bus.state.gustX }, snap: spare, stats: wantStats }; cmds = []; wantStats = false; inflight = 1; sent++; sentAt = performance.now();
try { worker.postMessage(m, [m.snap.buffer]); } catch (e) { fail('post failed'); }
};
const send = (c) => { if (dead) return; cmds.push(c); idleFrames = 0; want(); };
const open = () => {
if (worker || dead || !cfg || !cfg.worker || !cfg.life) return readyP;
try { worker = new Worker(new URL(cfg.worker, document.baseURI).href); } catch (e) { fail('no worker'); return readyP; }
const full = Object.assign({}, cfg); for (const k of ['glue', 'wasm', 'core']) full[k] = new URL(cfg[k], document.baseURI).href;
cfg = Object.assign({}, cfg, { life: new URL(cfg.life, document.baseURI).href });
worker.onmessage = onMsg; worker.onerror = (e) => { try { e.preventDefault(); } catch (x) {} fail('worker error ' + (e && e.message)); }; worker.onmessageerror = () => fail('worker message error');
bootT = setTimeout(() => fail('timed out starting'), cfg.timeoutMs || 15000); lastReply = performance.now();
worker.postMessage({ t: 'init', cfg: full });
return readyP;
};
const scope = (owner) => {
const mine = new Set(), mineFns = new Set(); let closed = false;
const group = (name, o = {}) => {
const id = owner + '/' + name; if (groups.has(id)) return groups.get(id).api;
if (groups.size >= caps.groups) return null;
const cap = Math.min(o.cap || caps.perGroup, caps.perGroup);
const g = { id, owner, name, cap, count: 0, api: null, onSnapshot: null, onOver: null };
const col = o.collide === '*' || o.collide == null ? '*' : o.collide.map((n) => (n.includes('/') ? n : owner + '/' + n));
send({ op: 'group', id, owner, cap, collide: col, self: o.self !== false });
const body = (shape, p) => {
if (closed || dead || g.count >= cap || free.length === 0) { rejected++; return null; }
const slot = free.pop(), b = { slot, group: id, alive: true, kind: p.kind || 'dynamic',
pose(out = new Float32Array(8)) { if (latest) { const j = HDR + slot * STRIDE; for (let k = 0; k < 8; k++) out[k] = latest[j + k]; } return out; },
get awake() { return !!latest && (latest[HDR + slot * STRIDE + 7] & 2) !== 0; },
moveTo(pos, quat) { send({ op: 'move', slot, pos, quat }); }, impulse(f, t) { send({ op: 'impulse', slot, f, t }); }, remove() { if (b.alive) send({ op: 'remove', slot }); } };
slotOwner[slot] = { body: b }; slotGroup[slot] = g; g.count++;
send({ op: 'spawn', slot, group: id, kind: p.kind || 'dynamic', shape, pos: p.pos, quat: p.quat, vel: p.vel, ang: p.ang, density: p.density, mat: p.mat, ttl: p.ttl, damp: p.damp, sleep: p.sleep, wind: p.wind, seed: p.seed, ccd: p.ccd, maxV: p.maxV, maxW: p.maxW, iters: p.iters, lockZ: p.lockZ, grav: p.grav });
return b;
};
let jn = 0;
const api = {
id, get count() { return g.count; }, cap,
box: (p) => body({ type: 'box', h: p.half }, p), sphere: (p) => body({ type: 'sphere', r: p.r }, p),
capsule: (p) => body({ type: 'capsule', r: p.r, hh: p.hh }, p.axis === 'x' ? p : Object.assign({}, p, { quat: p.quat || [0, 0, Math.SQRT1_2, Math.SQRT1_2] })),
joint(j) { if (!j.b || !j.b.alive) return null; const id2 = id + '#j' + ++jn; send(Object.assign({}, j, { op: 'joint', id: id2, a: j.a ? j.a.slot : -1, b: j.b.slot })); return { id: id2, set(p) { send(Object.assign({ op: 'jointSet', id: id2 }, p)); }, remove() { send({ op: 'jointKill', id: id2 }); } }; },
trigger(t) { const tid = id + '#t' + ++jn; triggers.set(tid, t); send({ op: 'trigger', id: tid, group: id, shape: t.shape, pos: t.pos, quat: t.quat }); return tid; },
field(f) { const fid = id + '#f' + ++jn; fieldsOn++; send(Object.assign({}, f, { op: 'field', id: fid, group: id })); return { id: fid, set(p) { send(Object.assign({}, f, p, { op: 'field', id: fid, group: id })); }, off() { send({ op: 'field', id: fid, group: id, on: false }); } }; },
clear() { send({ op: 'clearGroup', group: id }); }, unthrottle() { send({ op: 'unthrottle', group: id }); },
onSnapshot(f) { g.onSnapshot = f; }, onOver(f) { g.onOver = f; },
};
g.api = api; groups.set(id, g); mine.add(id); return api;
};
return { group, ready: readyP, onSnapshot(f) { snapFns.add(f); mineFns.add(f); return () => { snapFns.delete(f); mineFns.delete(f); }; }, onLost(f) { lost.add(f); return () => lost.delete(f); }, get dead() { return dead; }, get caps() { return caps; },
dispose() { closed = true; for (const f of mineFns) snapFns.delete(f); mineFns.clear(); for (const id of mine) { send({ op: 'clearGroup', group: id }); const g = groups.get(id); if (g) { g.onSnapshot = null; g.onOver = null; } } mine.clear(); } };
};
const info = () => { wantStats = true; return { ready, dead, mode: 'worker', inflight, queued: cmds.length, ticking: !!offFrame, frames: sent, caps, rejected, freeSlots: free.length, stats, groups: Array.from(groups.values()).map((g) => ({ id: g.id, count: g.count, cap: g.cap })) }; };
const dispose = () => { dead = true; ready = false; clearTimeout(bootT); clearInterval(hb); if (offFrame) offFrame(); offFrame = null; try { worker && worker.terminate(); } catch (e) {} worker = null; groups.clear(); triggers.clear(); lost.clear(); snapFns.clear(); };
const raw = (c) => send(c);
return { open, scope, info, raw, dispose, get ready() { return ready; }, get dead() { return dead; }, get started() { return !!worker; } };
}
