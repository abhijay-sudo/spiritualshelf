(function () {
var d = document, U = null;
try { U = JSON.parse(d.getElementById('ui').textContent).share || null; } catch (e) {}
var reader = d.querySelector('[data-reader]');
if (!U || !reader) return;
var stylesP = null, sheetP = null;
function styles() {
if (stylesP) return stylesP;
stylesP = new Promise(function (ok) {
var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = U.css;
l.onload = ok; l.onerror = ok; d.head.appendChild(l);
});
return stylesP;
}
function sheet() {
if (sheetP) return sheetP;
sheetP = styles().then(function () {
return new Promise(function (ok, no) {
var s = d.createElement('script'); s.src = U.sheet; s.onload = ok;
s.onerror = function () { sheetP = null; no(new Error('share sheet')); };
d.head.appendChild(s);
});
});
return sheetP;
}
function current() {
var a = d.querySelector('.fm-rail ol a[aria-current]'), m = a && /page-(\d+)/.exec(a.getAttribute('href') || '');
if (m) return +m[1];
var secs = d.querySelectorAll('.scene'), mid = innerHeight * 0.4, best = 1;
for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top <= mid) best = i + 1;
return best;
}
function open(o) {
o = o || {};
return sheet().then(function () { return window.__spritualShareSheet.open({ scene: o.scene || current(), text: o.text || '', from: o.from }); }, function () { return false; });
}
var api = function (o) { return open(o); };
api.sceneLink = function (n) { return sheet().then(function () { return window.__spritualShareSheet.link(n); }); };
window.spritualShare = api;
d.addEventListener('click', function (e) {
var b = e.target.closest && e.target.closest('[data-share-scene]');
if (b) { e.preventDefault(); open({ scene: +b.getAttribute('data-share-scene'), from: b }); }
});
['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) {
d.addEventListener(ev, function (e) { if (e.target.closest && e.target.closest('.sh-glyph, .sh-rail')) sheet().catch(function () {}); }, { passive: true, capture: true });
});
function rail() {
var r = d.querySelector('.fm-rail'); if (!r) return false;
if (r.querySelector('.sh-rail')) return true;
var b = d.createElement('button'); b.type = 'button'; b.className = 'sh-rail';
b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-label', U.t.glyphRail); b.title = U.t.glyphRail; b.innerHTML = U.icon;
b.addEventListener('click', function () { open({ scene: current(), from: b }); });
r.insertBefore(b, r.querySelector('[data-fm="off"]'));
var old = d.querySelector('.sh-bar'); if (old) old.remove();
return true;
}
function bar() {
var b0 = d.querySelector('.reader-bar'); if (!b0 || d.querySelector('.fm-rail') || b0.querySelector('.sh-bar')) return;
var b = d.createElement('button'); b.type = 'button'; b.className = 'btn btn-quiet sh-bar';
b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-label', U.t.glyphRail); b.title = U.t.glyphRail; b.innerHTML = U.icon;
b.addEventListener('click', function () { open({ scene: current(), from: b }); });
var c = b0.querySelector('[data-open="comfort"]'); b0.insertBefore(b, c);
}
function wake() {
styles().then(function () {
var g = d.querySelectorAll('.sh-glyph'); for (var i = 0; i < g.length; i++) g[i].hidden = false;
d.documentElement.classList.add('sh-on');
if (!rail()) {
var mo = new MutationObserver(function () { if (rail()) mo.disconnect(); });
mo.observe(reader, { childList: true, subtree: true });
setTimeout(function () { mo.disconnect(); }, 20000);
setTimeout(bar, 3000);
}
});
}
var idle = window.requestIdleCallback || function (f) { setTimeout(f, 600); };
if (d.readyState === 'complete') idle(wake); else addEventListener('load', function () { idle(wake); });
})();
