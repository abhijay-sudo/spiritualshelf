(() => {
const G = window.SpiritualGPU; if (!G || G.physics) return;
const d = document, R = d.documentElement, now = () => performance.now();
const DBG = /[?&]fxdebug=1/.test(location.search) || (() => { try { return localStorage.getItem('spritual:fxdebug') === '1'; } catch (e) { return false; } })();
const tag = d.querySelector('script[data-physx]'); let cfg = null; try { cfg = tag && JSON.parse(tag.dataset.physx); } catch (e) {}
const state = (s) => { R.dataset.fxPhysx = s; };
const mark = (why) => { try { localStorage.setItem('spritual:fxu', JSON.stringify({ fail: Date.now(), why: String(why).slice(0, 80) })); } catch (e) {} };
let worker = null, direct = null, mode = '', ready = false, dead = false, inflight = 0, sentAt = 0, lastReply = 0, pingAt = 0, hb = 0, boot = 0, raf = 0, last = 0, auto = false;
let latest = null, spare = null, envBuf = null, snapInfo = null, nextId = 1, pend = new Map(), cmds = [], ev = [], stats = null, info0 = null, cbs = {}, verifyAuto = null;
let slotsFree = [], slotKind = [], hud = null, hudT = 0, dtAcc = 0, bodies = 0;
const listeners = [];
const on = (n, f) => { (cbs[n] || (cbs[n] = [])).push(f); return () => { const a = cbs[n], i = a ? a.indexOf(f) : -1; if (i >= 0) a.splice(i, 1); }; };   // (returns the way to stop listening)
const emit = (n, a) => { for (const f of cbs[n] || []) { try { f(a); } catch (e) {} } };
const fail = (why, stage) => {
if (dead) return; dead = true; ready = false; state('failed'); mark(why);
try { if (worker) worker.terminate(); } catch (e) {} worker = null;
try { if (direct) direct.dispose(); } catch (e) {} direct = null;
teardown(); for (const [, p] of pend) p.rej(new Error('physics failed: ' + why)); pend.clear();
emit('fail', { why, stage });
};
const teardown = () => { if (hb) { clearInterval(hb); hb = 0; } if (boot) { clearTimeout(boot); boot = 0; } if (raf) { cancelAnimationFrame(raf); raf = 0; } if (hud) { hud.remove(); hud = null; } };
const rpc = (m) => new Promise((res, rej) => {
if (dead || (!ready && m.t !== 'init')) return rej(new Error('physics is not running'));
const id = nextId++; m.id = id; pend.set(id, { res, rej });
if (direct) { try { const r = m.t === 'verify' ? direct.verify(m.steps) : m.t === 'bench' ? direct.bench(m.n, m.steps) : direct.info(); pend.delete(id); res({ r, info: direct.info() }); } catch (e) { pend.delete(id); rej(e); } return; }
worker.postMessage(m);
});
const onMsg = (m) => {
lastReply = now();
switch (m.t) {
case 'ready': ready = true; info0 = m.info; mode = direct ? 'main' : 'worker'; clearTimeout(boot); boot = 0; start(); break;
case 'fail': fail(m.message, m.stage); break;
case 'snap':
inflight = 0; spare = latest; latest = m.pose; envBuf = m.env; stats = m.stats; bodies = m.stats.bodies;
for (const e of m.ev) { if (e.e === 'gone') { slotsFree.push(e.slot); slotKind[e.slot] = null; } if (DBG) { ev.push(e); if (ev.length > 400) ev.shift(); } emit(e.e, e); }
break;
case 'verify': case 'bench': case 'info': { const p = pend.get(m.id); if (p) { pend.delete(m.id); snapInfo = m.info || snapInfo; p.res(m); } break; }
case 'pong': break;
}
};
const start = () => {
const mb = cfg.maxBodies; slotsFree = []; for (let i = mb - 1; i >= 0; i--) slotsFree.push(i); slotKind = new Array(mb).fill(null);
latest = new Float32Array(mb * 8); spare = new Float32Array(mb * 8); envBuf = new Float32Array(mb * 5);
state('ready');
rpc({ t: 'verify', steps: 60 }).then((m) => { verifyAuto = m.r; }).catch(() => {});
if (worker) hb = setInterval(() => {   // a worker that was killed says nothing: noticed here, within seconds
const t = now();
if (t - lastReply > 7000) { fail('worker silent', 'watchdog'); return; }
if (t - pingAt > 3000) { pingAt = t; worker.postMessage({ t: 'ping', id: 0 }); }
}, 1000);
emit('ready', info());
};
const step = (dt, fillEnv) => {
if (!ready || dead) return false;
dtAcc = Math.min(0.1, dtAcc + dt);
if (inflight) { if (now() - sentAt > 3000) fail('no reply to a frame', 'watchdog'); return false; }
if (fillEnv) fillEnv(envBuf);
const m = { t: 'frame', dt: dtAcc, env: envBuf, pose: spare, cmds }; dtAcc = 0; cmds = [];
inflight = 1; sentAt = now();
if (direct) { try { const r = direct.frame(m, m.pose); onMsg({ t: 'snap', pose: r.pose, env: m.env, ev: r.ev, stats: r.stats }); } catch (e) { fail(e.message, 'run'); } return true; }
try { worker.postMessage(m, [m.env.buffer, m.pose.buffer]); } catch (e) { fail(e.message, 'post'); }
return true;
};
const take = (kind, o) => {   // a free slot for a new body, or -1 when the world is full
if (!ready || !slotsFree.length) return -1;
const s = slotsFree.pop(); slotKind[s] = kind; cmds.push(Object.assign({ op: kind, slot: s }, o)); return s;
};
const cmd = (c) => { if (ready && !dead) cmds.push(c); };
const remove = (slot) => { if (slotKind[slot]) cmd({ op: 'remove', slot }); };
const loop = (t) => { raf = 0; if (!ready || dead || !auto) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; step(dt); if (hud && t - hudT > 250) { hudT = t; paintHud(); } raf = requestAnimationFrame(loop); };
const run = (v) => { auto = !!v; if (auto && !raf && ready) { last = now(); raf = requestAnimationFrame(loop); } };
const info = () => Object.assign({}, info0 || {}, snapInfo || {}, stats ? { bodies: stats.bodies, stepMsLast: stats.stepMs, stepMsMean: stats.stepMean, stepMsP95: stats.stepP95, stepsTotal: stats.steps, simTime: stats.t } : {}, { ready, mode, state: R.dataset.fxPhysx || 'off', packageVersion: cfg && cfg.packageVersion, verify: verifyAuto, pending: cmds.length });
const paintHud = () => { if (!hud) return; const i = info(); hud.textContent = `PhysX ${i.version || '?'} | ${i.bodies | 0} bodies | ${(i.stepMsMean || 0).toFixed(2)} ms`; };
const open = () => {
if (worker || direct || (ready && !dead)) return;   // already up or starting
dead = false; ready = false; inflight = 0; cmds = []; ev = []; stats = null; snapInfo = null; verifyAuto = null; mode = ''; dtAcc = 0; bodies = 0;
if (!cfg) return fail('no config', 'config');
state('loading');
const full = Object.assign({}, cfg); for (const k of ['glue', 'wasm', 'core']) full[k] = new URL(cfg[k], d.baseURI).href;   // (absolute: the worker resolves from its own address)
boot = setTimeout(() => fail('timed out starting', 'timeout'), cfg.timeoutMs || 15000);
let mk = null; try { mk = new Worker(new URL(cfg.worker, d.baseURI).href); } catch (e) { mk = null; }
if (mk) {
worker = mk; worker.onmessage = (e) => onMsg(e.data); worker.onerror = (e) => { try { e.preventDefault(); } catch (x) {} fail('worker error ' + (e && e.message), 'worker'); }; worker.onmessageerror = () => fail('worker message error', 'worker');
lastReply = now(); worker.postMessage({ t: 'init', cfg: full });
return;
}
const s = d.createElement('script'); s.src = full.core; s.async = true;
s.onload = () => { window.SpiritualPhysX.create(full).then((w) => { direct = w; onMsg({ t: 'ready', info: w.info() }); }, (e) => fail(e && e.message, (e && e.stage) || 'init')); };
s.onerror = () => fail('core did not load', 'fetch'); d.head.appendChild(s);
};
const dispose = () => {
if (!worker && !direct && !ready && R.dataset.fxPhysx !== 'loading') { if (R.dataset.fxPhysx !== 'failed') state('off'); return; }
dead = true; ready = false; teardown(); for (const [, p] of pend) p.rej(new Error('physics stopped')); pend.clear();
try { if (worker) worker.terminate(); } catch (e) {} worker = null;
try { if (direct) direct.dispose(); } catch (e) {} direct = null; latest = spare = envBuf = null; state('off'); emit('off', {});
};
G.physics = { open, dispose, step, take, cmd, remove, run, on, info, get ready() { return ready; }, get mode() { return mode; }, get pose() { return latest; }, get slotKind() { return slotKind; }, get maxBodies() { return cfg && cfg.maxBodies; }, ENVW: 5, get failed() { return dead && R.dataset.fxPhysx === 'failed'; } };
if (DBG) {
const api = {
info, refresh: () => rpc({ t: 'info' }).then((m) => m.info), verify: (n) => rpc({ t: 'verify', steps: n || 60 }).then((m) => m.r),
bench: (n, st) => rpc({ t: 'bench', n, steps: st }).then((m) => m.r),
drop: (o) => { o = Object.assign({ x: 0, y: 1.2, z: 10, yaw: Math.random() * 6.28, tilt: 0.3 }, o); const kind = o.kind === 'stone' ? 'stone' : 'petal'; const s = take(kind, o); if (s >= 0) run(true); return s; },
remove, events: () => ev.splice(0, ev.length), peek: () => ev.slice(), pose: (s) => { const p = latest; if (!p) return null; const j = s * 8; return Array.from(p.subarray(j, j + 8)); },
step: (dt, fn) => step(dt, fn), run, cmd,
hud: (v) => { if (v && !hud) { hud = d.createElement('div'); hud.setAttribute('aria-hidden', 'true'); hud.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483000;font:11px/1.2 ui-monospace,monospace;color:#f3e7cf;background:rgba(20,14,8,.7);padding:3px 6px;border-radius:3px;pointer-events:none'; d.body.appendChild(hud); run(true); paintHud(); } else if (!v && hud) { hud.remove(); hud = null; } },
killWorker: () => { if (worker) worker.terminate(); },   // simulates a crash: nothing is told, the watchdog has to notice
heartbeat: () => ({ lastReplyAgo: now() - lastReply, inflight }), cfg: () => cfg, ev,
};
G.debug = G.debug || {}; G.debug.physx = api;
}
if (G.ultraOk && !G.ultraOk()) state('off'); else open();
})();
