(() => {
if (window.SpiritualLife) return;
const d = document, R = d.documentElement, me = d.currentScript, now = () => performance.now();
const DBG = /[?&]fxdebug=1/.test(location.search) || (() => { try { return localStorage.getItem('spritual:fxdebug') === '1'; } catch (e) { return false; } })();
let M = null; try { M = me && JSON.parse(me.dataset.pkgs || 'null'); } catch (e) { M = null; }
const TIERS = ['lite', 'rich', 'ultra'];
const S = { state: 'idle', tier: 'off', caps: null, mounted: [], failed: [], svc: null, t0: now(), startMs: 0 };
let gen = 0, battery = null, svcP = null, started = false;
const L = window.SpiritualLife = { version: 1, get state() { return S.state; }, get tier() { return S.tier; }, get caps() { return S.caps; }, packages: () => S.mounted.map((p) => ({ id: p.pkg.id, ms: p.ms, cost: p.pkg.cost })), failed: () => S.failed.slice(), teardown: () => teardown('asked'), reload: () => reload('asked') };
const pref = () => { try { const v = localStorage.getItem('spritual:fx'); return v === 'ultra' || v === 'rich' || v === 'balanced' || v === 'off' ? v : ''; } catch (e) { return ''; } };
const still = () => { const c = navigator.connection; return R.dataset.motion === 'reduce' || R.hasAttribute('data-fx-paused') || !!R.dataset.light || R.classList.contains('ep-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches || !!(c && c.saveData); };
const gate = () => {
const G = window.SpiritualGPU, p = pref(), st = still(), phone = matchMedia('(pointer: coarse)').matches || (innerWidth < 700 && 'ontouchstart' in window);
const low = !!battery && !battery.charging && battery.level < 0.2, saveData = !!(navigator.connection && navigator.connection.saveData);
const gpu = !st && !phone && !low && p !== 'off' && p !== 'balanced' && !!G && !!G.pref && !!G.pref() && (p === 'rich' || p === 'ultra' || (G.auto && G.auto() === 'rich'));
const ultra = gpu && !!M && !!M.physx && typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && ((p === 'ultra' && !!G.ultraCan && G.ultraCan()) || !!(G.run && G.run.rank === 3));
const tier = st || p === 'off' ? 'off' : ultra ? 'ultra' : gpu ? 'rich' : 'lite';
return { tier, caps: { still: st, phone, saveData, light: !!R.dataset.light || R.classList.contains('ep-lite'), lowBattery: low, hover: matchMedia('(hover: hover)').matches, css: tier !== 'off', waapi: tier !== 'off', webgl: gpu, physx: ultra, pref: p || 'auto' } };
};
const key = () => { const g = gate(); return g.tier + '|' + g.caps.lowBattery; };
const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 16)));
const css = (href) => new Promise((res) => { const l = d.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-life-css', ''); let done = false; const fin = () => { if (!done) { done = true; res(l); } }; l.onload = fin; l.onerror = fin; setTimeout(fin, 1500); d.head.appendChild(l); });
const abs = (u) => new URL(u, d.baseURI).href;
const surfaces = () => (R.dataset.life || '').split(/\s+/).filter(Boolean);
const services = async (needPhysics) => {
if (!S.svc) {
const g0 = gen;
svcP = svcP || Promise.all([import(abs(M.core.bus)), import(abs(M.core.spring)), import(abs(M.core.budget)), import(abs(M.core.layout))]).then(([b, sp, bu, la]) => {
if (g0 !== gen) return null;   // (a teardown happened while the files were on their way: nothing is made)
const bus = b.createBus(), budget = bu.createBudget({ bus, slowMs: M.world && M.world.slowMs || 24 }), layout = la.createLayout(bus);
S.svc = { bus, spring: sp, budget, layout, physics: null }; return S.svc;
});
await svcP; if (!S.svc) return null;
}
if (needPhysics && !S.svc.physics && S.caps.physx) {
const mod = await import(abs(M.core.physics)), caps = (M.world && M.world.tiers && M.world.tiers.ultra) || { global: 64, perGroup: 24, groups: 12 };
S.svc.physics = mod.createPhysics({ cfg: M.physx, caps, budget: S.svc.budget, bus: S.svc.bus }); S.svc.physics.open();
}
return S.svc;
};
const context = (pkg, svc, tier, caps) => {
const ac = new AbortController(), cleanups = [], handles = [];
const ctx = {
id: pkg.id, tier, caps, core: M.core, deps: (pkg.deps || []).map(abs), bus: svc.bus, spring: svc.spring, layout: svc.layout, signal: ac.signal, debug: DBG,
physics: pkg.needs && pkg.needs.includes('physx') && caps.physx && svc.physics ? svc.physics.scope(pkg.id) : null,
budget: { register: (o) => { const h = svc.budget.register(Object.assign({ cost: pkg.cost, label: pkg.label, priority: pkg.priority, owner: pkg.id }, o)); handles.push(h); return h; }, mark: svc.budget.mark },
els: () => Array.from(d.querySelectorAll('[data-life-for~="' + pkg.id + '"]')),
dispose: (fn) => { cleanups.push(fn); },
};
const end = () => { ac.abort(); for (const f of cleanups.reverse()) { try { f(); } catch (e) {} } for (const h of handles) { try { h.unregister(); } catch (e) {} } if (ctx.physics) { try { ctx.physics.dispose(); } catch (e) {} } };
return { ctx, end };
};
const mount = async (pkg, svc, tier, caps, my) => {
const t = now(); let link = null;
try {
if (pkg.css) link = await css(abs(pkg.css));
const mod = await import(abs(pkg.js)); if (my !== gen) { if (link) link.remove(); return; }
const { ctx, end } = context(pkg, svc, tier, caps);
if (ctx.physics) { try { await ctx.physics.ready; } catch (e) { end(); if (link) link.remove(); S.failed.push({ id: pkg.id, why: 'physics: ' + (e && e.message) }); return; } }
const a = now(); const inst = await (mod.mount || mod.default)(ctx); const sync = now() - a;
const rec = { pkg, end: () => { try { inst && inst.dispose && inst.dispose(); } catch (e) {} end(); if (link) link.remove(); }, ms: Math.round(now() - t), sync: Math.round(sync) };
if (my !== gen) { rec.end(); return; } S.mounted.push(rec);
} catch (e) { S.failed.push({ id: pkg.id, why: String(e && e.message || e).slice(0, 160) }); if (link) link.remove(); }
};
const ladder = () => {   // follow the lake's own ladder: when it STEPS DOWN (its governor judged the page slow), the heavier life effects go with it
const rank = { off: 0, balanced: 1, rich: 2, ultra: 3 }; let was = rank[R.dataset.fx] || 0;
const mo = new MutationObserver(() => {
if (!S.svc) return; const now_ = rank[R.dataset.fx] || 0, px = R.dataset.fxPhysx;
if (now_ < was) { if (now_ === 0) S.svc.budget.dropClass('webgl', 'lake ladder: off'); else S.svc.budget.dropClass('physx', 'lake ladder: ' + R.dataset.fx); }
if (px === 'failed') S.svc.budget.dropClass('physx', 'lake physics failed');
was = now_;
});
mo.observe(R, { attributes: true, attributeFilter: ['data-fx', 'data-fx-physx'] }); return mo;
};
let lmo = null;
async function start() {
const my = ++gen; if (!M || !M.pkgs) { S.state = 'none'; R.dataset.lifeState = 'none'; return; }
const g = gate(); S.tier = g.tier; S.caps = g.caps; R.dataset.lifeWhy = g.caps.still ? (R.hasAttribute('data-fx-paused') ? 'paused' : g.caps.saveData ? 'save-data' : g.caps.light ? 'light' : 'calm') : g.caps.lowBattery ? 'low-battery' : g.caps.phone ? 'phone' : '';   // (read once per start: why a package may not be running; the Effects sheet says it)
if (g.tier === 'off') { S.state = 'still'; R.dataset.lifeState = 'still'; return; }   // a still, complete page: nothing fetched, nothing started
const here = surfaces(), want = M.pkgs.filter((p) => (p.surface || []).some((s) => here.includes(s)) && (!p.debug || DBG) && TIERS.indexOf(g.tier) >= TIERS.indexOf(p.min || 'lite') && (!p.max || TIERS.indexOf(g.tier) <= TIERS.indexOf(p.max)) && !(p.needs || []).some((n) => n === 'webgl' && !g.caps.webgl) && !(p.needs || []).some((n) => n === 'physx' && !g.caps.physx));
R.dataset.lifeState = g.tier; S.state = 'running';
if (!want.length) { S.state = g.tier; return; }   // (nothing for this page: the services are not even fetched)
const svc = await services(want.some((p) => (p.needs || []).includes('physx'))); if (my !== gen || !svc) return;
if (M.core.ease && want.some((p) => p.css)) await css(abs(M.core.ease)).then((l) => { S.easeLink = l; });
if (DBG && M.core.debug) { try { const dm = await import(abs(M.core.debug)); if (my === gen) S.debug = dm.mountDebug({ life: L, budget: svc.budget, bus: svc.bus, physics: svc.physics, layout: svc.layout, state: S }); } catch (e) { S.failed.push({ id: 'debug', why: String(e && e.message || e) }); } }
for (const p of want) { if (my !== gen) return; await idle(); await mount(p, svc, g.tier, g.caps, my); }
if (my === gen) { S.state = g.tier; S.startMs = Math.round(now() - S.t0); if (!lmo) lmo = ladder(); }
}
function teardown(why) {
gen++; for (const m of S.mounted.splice(0).reverse()) { try { m.end(); } catch (e) {} }
if (S.debug) { try { S.debug.dispose(); } catch (e) {} S.debug = null; }
if (S.easeLink) { S.easeLink.remove(); S.easeLink = null; }
if (S.svc) { try { S.svc.physics && S.svc.physics.dispose(); S.svc.layout.dispose(); S.svc.budget.dispose(); S.svc.bus.dispose(); } catch (e) {} S.svc = null; svcP = null; }
if (lmo) { lmo.disconnect(); lmo = null; }
S.failed.length = 0; S.state = 'idle'; R.dataset.lifeState = 'off';
}
function reload(why) { teardown(why); return start(); }
if (DBG) L.debug = { get services() { return S.svc; }, gate: () => gate(), manifest: () => M, mounted: () => S.mounted.map((p) => ({ id: p.pkg.id, ms: p.ms, syncMs: p.sync })), stats: () => (S.svc ? S.svc.budget.stats() : null), physics: () => (S.svc && S.svc.physics ? S.svc.physics.info() : null), startMs: () => S.startMs };
const boot = () => requestAnimationFrame(() => requestAnimationFrame(() => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 3000 }) : setTimeout(go, 1200))));
const go = () => {
const bat = navigator.getBattery ? Promise.race([navigator.getBattery().catch(() => null), new Promise((r) => setTimeout(() => r(null), 400))]) : Promise.resolve(null);
bat.then((b) => { battery = b; if (b && !started) { const f = () => { if (started && key() !== lastKey) reload('battery'); }; b.addEventListener('chargingchange', f); b.addEventListener('levelchange', f); } started = true; lastKey = key(); start(); });
};
let lastKey = '';
const recheck = () => { if (!started) return; const k = key(); if (k !== lastKey) { lastKey = k; reload('gate changed'); } };
new MutationObserver(recheck).observe(R, { attributes: true, attributeFilter: ['data-motion', 'data-light', 'data-fx-paused', 'class'] });
try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', recheck); } catch (e) {}
try { const c = navigator.connection; c && c.addEventListener && c.addEventListener('change', recheck); } catch (e) {}
const hook = () => { const G = window.SpiritualGPU; if (G && G.onchange) G.onchange(() => setTimeout(recheck, 0)); };
hook();
addEventListener('pagehide', () => { if (started) teardown('pagehide'); });
addEventListener('pageshow', (e) => { if (e.persisted && started) { lastKey = key(); start(); } });
if (d.readyState === 'complete') boot(); else addEventListener('load', boot, { once: true });
})();
