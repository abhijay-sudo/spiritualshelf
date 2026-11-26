(() => {
const d = document, r = d.documentElement, K = 'spritual:fx', me = d.currentScript, L = [];
const G = window.SpiritualGPU = { q: [], register(f) { G.q.push(f); } };
let cap = null, loaded = 0, raf = 0;
const rd = () => { try { const v = localStorage.getItem(K); return v === 'ultra' || v === 'rich' || v === 'balanced' || v === 'off' ? v : ''; } catch (e) { return ''; } };
const still = () => { const c = navigator.connection; return r.dataset.motion === 'reduce' || !!r.dataset.light || r.classList.contains('ep-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches || !!(c && c.saveData); };
const SOFT = /SwiftShader|llvmpipe|Software|Mali-4|Adreno \(TM\) 3/i;
const probe = () => { if (cap === null) { const dbg = /[?&]fxdebug=1/.test(location.search); try { const c = d.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('webgl2', { failIfMajorPerformanceCaveat: !dbg }); cap = !!g;
if (g) { try { const x = g.getExtension('WEBGL_debug_renderer_info'); if (x && !dbg && SOFT.test(String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)))) cap = false; } catch (e) {} const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } } catch (e) { cap = false; } } return cap; };
G.auto = () => { const n = navigator, hc = n.hardwareConcurrency || 4, dm = n.deviceMemory;
const s = (hc >= 8 ? 2 : hc > 4 ? 1 : 0) + (dm == null ? 1 : dm >= 8 ? 2 : dm > 4 ? 1 : 0) - (matchMedia('(pointer: coarse)').matches ? 1 : 0) - (devicePixelRatio > 2.5 ? 1 : 0);
return s >= 3 ? 'rich' : s >= 1 ? 'balanced' : 'off'; };
G.get = rd;
G.supported = () => !still() && cap !== false;   // (no probe here: the sheet may ask at any time, the probe waits for idle)
const PK = 'spritual:fxpause', pz = () => r.hasAttribute('data-fx-paused');
try { if (sessionStorage.getItem(PK) === '1') r.setAttribute('data-fx-paused', ''); } catch (e) {}
const vt = () => { if (rd() === 'off' || pz()) r.setAttribute('data-life-vt', 'off'); else r.removeAttribute('data-life-vt'); };
G.paused = pz;
G.pref = () => { const p = rd(); return p === 'off' || pz() || still() || probe() === false || (!p && G.auto() === 'off') ? '' : p || 'auto'; };
const coarse = () => matchMedia('(pointer: coarse)').matches;
const ultraCan = () => !still() && cap !== false && !coarse();   // (the Ultra choice is on offer on any desktop that can run the layer; Auto is stricter)
G.ultraCan = ultraCan;
const ui = () => {
const f = d.querySelector('[data-comfort]'); if (!f) return;
const ok = G.supported(), p = rd(), fs = f.querySelector('input[name="fx"]'); if (fs) { const fl = fs.closest('fieldset'); fl.setAttribute('aria-disabled', ok ? 'false' : 'true'); fl.setAttribute('aria-describedby', 'fx-note'); }
const shown = p === 'ultra' && !f.querySelector('input[name="fx"][value="ultra"]') ? 'rich' : p;
for (const i of f.querySelectorAll('input[name="fx"]')) { i.checked = i.value === shown; i.disabled = !ok; const c = i.closest('.chip'); c && c.classList.toggle('is-wait', !ok); }
const un = f.querySelector('input[name="fx"][value="ultra"]'); if (un) { un.disabled = !ok || !ultraCan(); const c = un.closest('.chip'); c && c.classList.toggle('is-wait', un.disabled); }
const n = f.querySelector('.fx-note'); if (n) { let s = ok ? n.dataset.yes : n.dataset.no;
if (ok && !ultraCan() && n.dataset.ultraNo) s = s + ' ' + n.dataset.ultraNo;
else if (ok && p === 'ultra' && G.saver && n.dataset.ultraSaver) s = n.dataset.ultraSaver;
else if (ok && p === 'ultra' && n.dataset.ultra) s = (r.dataset.fx === 'rich' && r.dataset.fxState === 'live' && G.ultraHold && n.dataset.ultraRest) ? n.dataset.ultraRest : n.dataset.ultra;
if (s && n.textContent !== s) n.textContent = s; }
};
const go = (user) => {
if (!G.pref()) { if (G.run) G.run.stop('off'); else { r.dataset.fx = 'off'; r.dataset.fxState = 'off'; } return; }
if (G.run) { G.run.start(G.pref(), user); return; }
if (loaded || !me || !me.dataset.core) return; loaded = 1; r.dataset.fxState = 'loading';
const us = [me.dataset.core].concat((me.dataset.feat || '').split(' ').filter(Boolean)); let n = 0;
const off = () => { loaded = 0; r.dataset.fx = 'off'; r.dataset.fxState = 'off'; };
const fetchAll = () => { for (const u of us) { const s = d.createElement('script'); s.src = u; s.async = true; s.onload = () => { if (++n === us.length) go(); }; s.onerror = () => { r.dataset.fx = 'off'; r.dataset.fxState = 'off'; }; d.head.appendChild(s); } };
if (navigator.onLine === false) { try { caches.match(us[0]).then((h) => (h ? fetchAll() : off()), off); } catch (e) { off(); } } else fetchAll();
};
G.set = (m) => {
try { if (m === 'ultra' || m === 'rich' || m === 'balanced' || m === 'off') localStorage.setItem(K, m); else localStorage.removeItem(K); } catch (e) {}
G.ultraHold = false; if (m !== 'ultra') G.ultraAuto = false; vt(); ui(); go(true); ultra(); for (const f of L) { try { f(rd()); } catch (e) {} }
};
G.pause = (on) => {
try { if (on) sessionStorage.setItem(PK, '1'); else sessionStorage.removeItem(PK); } catch (e) {}
if (on) r.setAttribute('data-fx-paused', ''); else r.removeAttribute('data-fx-paused');
vt(); ui(); go(!on); ultra(); for (const f of L) { try { f(rd()); } catch (e) {} }
};
const dbgPx = /[?&]fxdebug=1/.test(location.search) && /[?&]fxphysx=1/.test(location.search);
const home = !!(me && me.dataset.ugfx);
const introOver = () => !r.classList.contains('cx-js') || r.classList.contains('cx-seen') || r.classList.contains('cx-fest-end');
const resting = () => { try { const o = JSON.parse(localStorage.getItem('spritual:fxu') || 'null'); if (!o) return false; const t = Math.max(o.fail || 0, o.no || 0, o.down || 0); return !!t && Date.now() - t < 6048e5; } catch (e) { return false; } };
const stepped = () => { try { return /^[012]$/.test(sessionStorage.getItem('spritual:fxc') || ''); } catch (e) { return false; } };
const autoOk = () => { const n = navigator; return home && !rd() && ultraCan() && !!G.pref() && (n.hardwareConcurrency || 4) >= 8 && (n.deviceMemory == null || n.deviceMemory >= 8) && devicePixelRatio <= 3 && !resting() && !stepped(); };
const ultraOk = () => !!(home && me.dataset.ultra && me.dataset.physx) && !G.ultraHold && !G.saver && ultraCan() && !!G.pref() && (rd() === 'ultra' || G.ultraAuto === true || dbgPx);
G.ultraOk = ultraOk; let uS = 0, gS = 0;
const later = (f) => { if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 4000 }); else setTimeout(f, 1500); };
const whenOver = (f) => { if (introOver()) { later(f); return; } const mo = new MutationObserver(() => { if (introOver()) { mo.disconnect(); later(f); } }); mo.observe(r, { attributes: true, attributeFilter: ['class'] }); };
const add = (fs, ok, bad) => { let n = 0; for (const u of fs) { const s = d.createElement('script'); s.src = u; s.async = false; s.onload = () => { if (++n === fs.length && ok) ok(); }; s.onerror = () => { if (bad) bad(); }; d.head.appendChild(s); } };
const gfx = () => {
if (!home || gS || G.saver || !((rd() === 'ultra' && ultraCan()) || autoOk())) return; gS = 1;
whenOver(() => { if (gS !== 1) return; if (G.saver || !((rd() === 'ultra' && ultraCan()) || autoOk())) { gS = 0; return; } gS = 2; add(me.dataset.ugfx.split(' ').filter(Boolean), () => { gS = 3; if (G.U) G.U.coreReady(); }, () => { gS = -1; r.dataset.fxUltra = 'failed'; }); });
};
const ultra = () => {
gfx();
if (!ultraOk()) { if (G.physics) G.physics.dispose(); if (uS === 1) uS = 0; return; }
if (uS === 3) { if (G.physics && r.dataset.fxPhysx === 'off') G.physics.open(); return; }
if (uS) return; uS = 1;
whenOver(() => {
if (uS !== 1) return; if (!ultraOk()) { uS = 0; return; } uS = 2; r.dataset.fxPhysx = 'loading';
add(me.dataset.ultra.split(' ').filter(Boolean), () => { uS = 3; }, () => { uS = 0; r.dataset.fxPhysx = 'failed'; });
});
};
G.ultraPhysics = () => { G.ultraAuto = true; ultra(); };
G.onchange = (f) => { if (typeof f === 'function') L.push(f); };
d.addEventListener('change', (e) => { const t = e.target; if (t && t.name === 'fx' && t.form && t.form.hasAttribute('data-comfort')) { e.stopPropagation(); G.set(t.value); } }, true);
const again = () => { ui(); go(); ultra(); };
{ const pn = d.querySelector('[data-life-panel]'), dl = pn && pn.closest('dialog');
const lp = () => { if (!pn || pn.dataset.loaded || !me || !me.dataset.panel) return; pn.dataset.loaded = '1'; pn.dataset.orient = me.dataset.orient || ''; const s = d.createElement('script'); s.src = me.dataset.panel; s.async = true; d.head.appendChild(s); };
if (dl) { if (dl.open) lp(); new MutationObserver(() => { if (dl.open) lp(); }).observe(dl, { attributes: true, attributeFilter: ['open'] }); } }
try { if (navigator.getBattery) navigator.getBattery().then((b) => { const f = () => { const v = !b.charging && b.level < 0.2; if (v !== !!G.saver) { G.saver = v; again(); } }; G.saver = !b.charging && b.level < 0.2; b.addEventListener('chargingchange', f); b.addEventListener('levelchange', f); again(); }).catch(() => {}); } catch (e) {}
const idle = (f) => { if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 4000 }); else setTimeout(f, 1500); };
const boot = () => { raf = requestAnimationFrame(() => requestAnimationFrame(() => idle(() => { if (!still()) probe(); again(); }))); };
let was = still(); const recheck = () => { const n = still(); if (n !== was) { was = n; again(); } };
new MutationObserver(recheck).observe(r, { attributes: true, attributeFilter: ['data-motion', 'data-light', 'class'] });
try { const c = navigator.connection; if (c && c.addEventListener) c.addEventListener('change', recheck); } catch (e) {}
addEventListener('online', again);
try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', again); } catch (e) {}
addEventListener('pageshow', (e) => { if (e.persisted) again(); });
try { new MutationObserver(() => ui()).observe(r, { attributes: true, attributeFilter: ['data-fx', 'data-fx-state'] }); } catch (e) {}
r.dataset.fx = r.dataset.fx || 'off'; r.dataset.fxState = 'off'; if (me && me.dataset.ultra) r.dataset.fxPhysx = 'off'; ui();
if (d.readyState === 'complete') boot(); else addEventListener('load', boot, { once: true });
})();
