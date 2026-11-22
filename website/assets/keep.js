(function () {
var d = document, de = d.documentElement, U = null;
try { U = JSON.parse(d.getElementById('ui').textContent).keep || null; } catch (e) {}
var reader = d.querySelector('[data-reader]');
if (!U || !reader) return;
var T = U.t, lang = de.lang === 'hi' ? 'hi' : 'en', slug = reader.dataset.slug, ID = lang + '/' + slug;
var CACHE = 'spritual-keep', KEY = 'spritual:offline', INSTALL = 'spritual:install';
try { var oldv = JSON.parse(localStorage.getItem('spritual:kept') || 'null'); if (oldv && !Array.isArray(oldv) && typeof oldv === 'object') { if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(oldv)); localStorage.removeItem('spritual:kept'); } } catch (e) {}
var ls = { get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
var fmt = function (s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); };
var size = function (b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; };
var can = !!(window.caches && window.fetch && window.isSecureContext);
var origin = location.origin, pageUrl = origin + U.page;
var els = [].slice.call(d.querySelectorAll('[data-keep]'));
var cls = (Math.min(innerWidth, screen.width || innerWidth) * (devicePixelRatio || 1)) > 1000 ? 'hi' : 'lo';   // the painting width this screen would ask for
var total = +U[cls] || 0, state = 'idle', pct = 0, busy = false;
var records = function () { return ls.get(KEY) || {}; };
var RECP = origin + '/__kept/';
var recGet = function (c, id) { return c.match(RECP + id.replace('/', '-')).then(function (r) { return r ? r.json() : null; }, function () { return null; }); };
var recPut = function (c, id, rec) { return c.put(RECP + id.replace('/', '-'), new Response(JSON.stringify(rec), { headers: { 'content-type': 'application/json' } })); };
var recAll = function (c) {
return c.keys().then(function (ks) {
return Promise.all(ks.filter(function (k) { return k.url.indexOf(RECP) === 0; }).map(function (k) { return c.match(k).then(function (r) { return r.json().then(function (j) { return { id: k.url.slice(RECP.length), rec: j }; }, function () { return null; }); }); }));
}).then(function (a) { return a.filter(Boolean); }, function () { return []; });
};
function paint(note) {
els.forEach(function (el) {
var lab = el.querySelector('[data-keep-label]'), sz = el.querySelector('[data-keep-size]'), rm = el.querySelector('[data-keep-rm]'), go = el.querySelector('[data-keep-go]'), nt = el.querySelector('[data-keep-note]');
var hero = el.classList.contains('kp--hero');   // the hero's row never grows: a passing message takes the label's place
var text = hero && note ? note : state === 'kept' ? T.kept : state === 'stale' ? T.keepUpdate : state === 'working' ? fmt(T.keeping, { pct: pct + '%' }) : T.keep;
if (lab.textContent !== text) { lab.classList.add('is-swap'); setTimeout(function () { lab.textContent = text; lab.classList.remove('is-swap'); }, state === 'working' ? 0 : 140); }
sz.textContent = state === 'working' || (hero && (note || state === 'kept')) ? '' : '· ' + size(total);
rm.hidden = !(state === 'kept' || (state === 'stale' && !hero)); go.disabled = state === 'working'; go.setAttribute('aria-busy', String(state === 'working'));
go.setAttribute('aria-disabled', String(state === 'kept'));
el.dataset.state = state; el.style.setProperty('--kp', (pct / 100).toFixed(3));
var msg = note != null ? note : state === 'kept' ? T.keepNote : (state === 'idle' || state === 'stale') && total > U.warn ? fmt(T.keepBig, { size: size(total) }) : '';
if (hero) msg = ''; if (nt.textContent !== msg) nt.textContent = msg;
});
}
function status() {
return caches.open(CACHE).then(function (c) { return Promise.all([c.match(pageUrl), recGet(c, ID)]); }).then(function (g) {
var hit = g[0], r = g[1] || records()[ID];
if (hit && r && r.v === U.v) { state = 'kept'; total = r.b || total; }
else if (hit) state = 'stale';
else { state = 'idle'; if (records()[ID]) { var all = records(); delete all[ID]; ls.set(KEY, all); } }
paint();
}, function () { state = 'idle'; paint(); });
}
function pool(list, n, fn) {
var i = 0, out = new Array(list.length);
return new Promise(function (ok, no) {
var live = 0, fail = false;
(function next() {
if (fail) return; if (i >= list.length && !live) return ok(out);
while (live < n && i < list.length) {
(function (k) { live++; fn(list[k]).then(function (v) { out[k] = v; live--; next(); }, function (e) { fail = true; no(e); }); })(i++);
}
})();
});
}
function keep() {
if (busy) return; busy = true; state = 'working'; pct = 0; paint();
var est = navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null);
est.then(function (e) { if (e && e.quota && e.quota - (e.usage || 0) < total * 1.5) throw new Error('space'); })
.then(function () { return fetch(U.j, { headers: { 'x-keep': '1' } }); })
.then(function (r) { if (!r.ok) throw new Error('list'); return r.json(); })
.then(function (L) {
var items = [{ u: L.page.u, b: L.page.b, page: 1 }].concat(L.shared, L[cls]), sum = 0; total = items.reduce(function (a, x) { return a + x.b; }, 0) || total; var done = 0;
return pool(items, 4, function (it) {
return fetch(it.u, { headers: { 'x-keep': '1' }, cache: it.page ? 'reload' : 'default' }).then(function (r) {
if (!r.ok) throw new Error(String(r.status));
return r.blob().then(function (blob) { done += it.b; var p = Math.min(99, Math.round(done / total * 100)); if (p !== pct) { pct = p; paint(); } return { it: it, res: new Response(blob, { status: 200, headers: r.headers }) }; });
});
}).then(function (got) {
var rec = { v: U.v, cls: cls, at: Date.now(), b: total, own: [pageUrl].concat(L[cls].map(function (x) { return origin + x.u; })) };
return caches.open(CACHE).then(function (c) {
return Promise.all(got.map(function (g) { return c.put(g.it.page ? pageUrl : origin + g.it.u, g.res); })).then(function () { return recPut(c, ID, rec); });
}).then(function () {
var all = records(); all[ID] = rec; ls.set(KEY, all);
state = 'kept'; pct = 100; busy = false; paint();
});
});
})
.catch(function (e) { busy = false; state = 'idle'; pct = 0; paint(e && e.message === 'space' ? T.keepFail : T.keepFail); });
}
function remove() {
var all = records(); delete all[ID]; ls.set(KEY, all);
caches.open(CACHE).then(function (c) {
return Promise.all([recGet(c, ID), recAll(c)]).then(function (g) {
var mine = g[0], others = {};
g[1].forEach(function (o) { if (o.id !== ID.replace('/', '-')) (o.rec.own || []).forEach(function (u) { others[u] = 1; }); });
var left = g[1].filter(function (o) { return o.id !== ID.replace('/', '-'); }).length;
var gone = [pageUrl].concat(mine && mine.own || []).filter(function (u) { return !others[u]; });
return Promise.all(gone.concat(RECP + ID.replace('/', '-')).map(function (u) { return c.delete(u); })).then(function () { if (!left) return caches.delete(CACHE); });
});
}).then(function () { state = 'idle'; pct = 0; paint(T.removed); setTimeout(function () { if (state === 'idle') paint(); }, 3200); }, function () { state = 'idle'; paint(); });
}
d.addEventListener('click', function (e) {
var go = e.target.closest && e.target.closest('[data-keep-go]'), rm = e.target.closest && e.target.closest('[data-keep-rm]');
if (go && (state === 'idle' || state === 'stale')) keep(); else if (rm && !busy) remove();
});
function wake() {
var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = U.css;
var show = function () {
status().then(function () { els.forEach(function (el) { el.hidden = false; el.classList.add('is-live'); }); });
};
l.onload = show; l.onerror = show; d.head.appendChild(l);
}
if (!can) els.forEach(function (el) { el.style.display = 'none'; });   // nothing to keep with: no empty box, no promise
if (can && els.length) {
var idle = window.requestIdleCallback || function (f) { setTimeout(f, 500); };
if (d.readyState === 'complete') idle(wake); else addEventListener('load', function () { idle(wake); });
}
var offered = false;
var seen = function () { if (offered || ls.get(INSTALL)) return true; try { return !!sessionStorage.getItem(INSTALL); } catch (e) { return false; } };
var mark = function (v) { offered = true; ls.set(INSTALL, v); try { sessionStorage.setItem(INSTALL, '1'); } catch (e) {} };
var deferred = null;
addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
var standalone = function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; };
var ua = navigator.userAgent;
var ios = (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA|Snapchat|MicroMessenger/i.test(ua);
addEventListener('appinstalled', function () { mark({ s: 'done', at: Date.now() }); close(); });
var card = null;
function close() {
if (!card) return; var c = card; card = null; c.classList.remove('is-in');
var gone = function () { c.remove(); };
if (matchMedia('(prefers-reduced-motion: reduce)').matches || de.dataset.motion === 'reduce') gone(); else setTimeout(gone, 360);
}
function offer() {
if (card || seen() || standalone() || !(deferred || ios)) return;
mark({ s: 'shown', at: Date.now() });   // shown once: never again, whatever the reader does
var ldr = d.createElement('link'); ldr.rel = 'stylesheet'; ldr.href = U.css;
var build = function () {
card = d.createElement('section'); card.className = 'kp-install'; card.setAttribute('role', 'region'); card.setAttribute('aria-labelledby', 'kpi-h'); card.lang = lang;
var use = deferred, ic = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c1.6 2.1 2.4 3.7 2.4 5a2.4 2.4 0 1 1-4.8 0c0-1.3.8-2.9 2.4-5Z"/><path d="M4 14.5h16c-.6 3.3-4 5.5-8 5.5s-7.4-2.2-8-5.5Z"/></svg>';
card.innerHTML = '<span class="kp-i-ic" aria-hidden="true">' + ic + '</span><div class="kp-i-tx"><h2 id="kpi-h"></h2><p class="kp-i-p" aria-live="polite"></p></div><div class="kp-i-btns"><button type="button" class="kp-i-go"></button><button type="button" class="kp-i-no"></button></div>';
card.querySelector('h2').textContent = T.installTitle; card.querySelector('.kp-i-p').textContent = use ? T.installBody : T.installIos;
var go = card.querySelector('.kp-i-go'), no = card.querySelector('.kp-i-no'); no.textContent = T.installNo;
if (use) go.textContent = T.installYes; else go.remove();
var dismiss = function () { mark({ s: 'declined', at: Date.now() }); d.removeEventListener('keydown', esc); close(); };
var esc = function (e) { if (e.key === 'Escape' && card) dismiss(); };
no.addEventListener('click', dismiss);
go.addEventListener('click', function () {
if (!use) return; use.prompt(); use.userChoice.then(function (r) { mark({ s: r && r.outcome === 'accepted' ? 'done' : 'declined', at: Date.now() }); deferred = null; if (r && r.outcome === 'accepted') { card.querySelector('.kp-i-p').textContent = T.installDone; go.remove(); setTimeout(close, 2200); } else close(); }, close);
});
d.addEventListener('keydown', esc);   // Escape anywhere on the page, not only once focus is inside the card
d.body.appendChild(card);
var bar = d.querySelector('[data-consent]:not([hidden])'); if (bar) card.style.setProperty('--kp-lift', bar.getBoundingClientRect().height + 8 + 'px');
requestAnimationFrame(function () { requestAnimationFrame(function () { card && card.classList.add('is-in'); }); });
};
ldr.onload = build; ldr.onerror = build; d.head.appendChild(ldr);
}
var finished = false, endEl = d.querySelector('.cx-the-end') || d.querySelector('[data-done-line]'), endT = 0;
function arm() {
if (!endEl || !window.IntersectionObserver || seen()) return;
var io = new IntersectionObserver(function (es) {
es.forEach(function (en) {
clearTimeout(endT);
var seen = en.intersectionRect.height, need = Math.min(.6 * en.boundingClientRect.height, .5 * innerHeight);
if (en.isIntersecting && seen >= need - 1 && finished) { endT = setTimeout(function () { io.disconnect(); offer(); }, 1500); }
});
}, { threshold: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1] });
io.observe(endEl);
}
d.addEventListener('spritual:story', function (e) {
if (!e.detail || e.detail.kind !== 'complete') return;
finished = true; arm();
});
})();
