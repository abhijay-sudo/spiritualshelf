(() => {
const d = document, r = d.documentElement, K = 'spritual:fx', me = d.currentScript, L = [];
const G = window.SpiritualGPU = { q: [], register(f) { G.q.push(f); } };
let cap = null, loaded = 0, raf = 0;
const rd = () => { try { const v = localStorage.getItem(K); return v === 'rich' || v === 'balanced' || v === 'off' ? v : ''; } catch (e) { return ''; } };
const still = () => { const c = navigator.connection; return r.dataset.motion === 'reduce' || !!r.dataset.light || r.classList.contains('ep-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches || !!(c && c.saveData); };
const SOFT = /SwiftShader|llvmpipe|Software|Mali-4|Adreno \(TM\) 3/i;
const probe = () => { if (cap === null) { const dbg = /[?&]fxdebug=1/.test(location.search); try { const c = d.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('webgl2', { failIfMajorPerformanceCaveat: !dbg }); cap = !!g;
if (g) { try { const x = g.getExtension('WEBGL_debug_renderer_info'); if (x && !dbg && SOFT.test(String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)))) cap = false; } catch (e) {} const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } } catch (e) { cap = false; } } return cap; };
G.auto = () => { const n = navigator, hc = n.hardwareConcurrency || 4, dm = n.deviceMemory;
const s = (hc >= 8 ? 2 : hc > 4 ? 1 : 0) + (dm == null ? 1 : dm >= 8 ? 2 : dm > 4 ? 1 : 0) - (matchMedia('(pointer: coarse)').matches ? 1 : 0) - (devicePixelRatio > 2.5 ? 1 : 0);
return s >= 3 ? 'rich' : s >= 1 ? 'balanced' : 'off'; };
G.get = rd;
G.supported = () => !still() && cap !== false;   // (no probe here: the sheet may ask at any time, the probe waits for idle)
G.pref = () => { const p = rd(); return p === 'off' || still() || probe() === false || (!p && G.auto() === 'off') ? '' : p || 'auto'; };
const ui = () => {
const f = d.querySelector('[data-comfort]'); if (!f) return;
const ok = G.supported(), p = rd(), fs = f.querySelector('input[name="fx"]'); if (fs) { const fl = fs.closest('fieldset'); fl.setAttribute('aria-disabled', ok ? 'false' : 'true'); fl.setAttribute('aria-describedby', 'fx-note'); }
for (const i of f.querySelectorAll('input[name="fx"]')) { i.checked = i.value === p; i.disabled = !ok; const c = i.closest('.chip'); c && c.classList.toggle('is-wait', !ok); }
const n = f.querySelector('.fx-note'); if (n) { const s = ok ? n.dataset.yes : n.dataset.no; if (s && n.textContent !== s) n.textContent = s; }
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
try { if (m === 'rich' || m === 'balanced' || m === 'off') localStorage.setItem(K, m); else localStorage.removeItem(K); } catch (e) {}
ui(); go(true); for (const f of L) { try { f(rd()); } catch (e) {} }
};
G.onchange = (f) => { if (typeof f === 'function') L.push(f); };
d.addEventListener('change', (e) => { const t = e.target; if (t && t.name === 'fx' && t.form && t.form.hasAttribute('data-comfort')) { e.stopPropagation(); G.set(t.value); } }, true);
const again = () => { ui(); go(); };
const idle = (f) => { if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 4000 }); else setTimeout(f, 1500); };
const boot = () => { raf = requestAnimationFrame(() => requestAnimationFrame(() => idle(() => { probe(); again(); }))); };
let was = still(); const recheck = () => { const n = still(); if (n !== was) { was = n; again(); } };
new MutationObserver(recheck).observe(r, { attributes: true, attributeFilter: ['data-motion', 'data-light', 'class'] });
try { const c = navigator.connection; if (c && c.addEventListener) c.addEventListener('change', recheck); } catch (e) {}
addEventListener('online', again);
try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', again); } catch (e) {}
addEventListener('pageshow', (e) => { if (e.persisted) again(); });
r.dataset.fx = r.dataset.fx || 'off'; r.dataset.fxState = 'off'; ui();
if (d.readyState === 'complete') boot(); else addEventListener('load', boot, { once: true });
})();
