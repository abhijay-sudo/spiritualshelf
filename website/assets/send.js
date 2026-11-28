(function () {
var d = document;
function data(b) { return { title: b.getAttribute('data-send-title') || d.title, text: b.getAttribute('data-send-text') || '', url: b.getAttribute('data-send-url') || location.href.split('#')[0] }; }
function close(b, focus) {
var m = b.parentNode.querySelector('[data-send-more]'); if (m) m.hidden = true; b.parentNode.classList.remove('is-open');
b.setAttribute('aria-expanded', 'false'); if (focus) b.focus();
}
function more(b, o, focus) {
var w = b.parentNode, m = w.querySelector('[data-send-more]');
if (!m) {
var L = d.querySelector('[data-snd-wa]'); if (!L) return;
m = d.createElement('span'); m.className = 'snd-more'; m.setAttribute('data-send-more', '');
var a = d.createElement('a'); a.className = 'snd-a'; a.setAttribute('data-send-wa', ''); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = L.getAttribute('data-snd-wa');
a.href = 'https://wa.me/?text=' + encodeURIComponent((o.text ? o.text + '\n' : '') + o.url);
var c = d.createElement('button'); c.type = 'button'; c.className = 'snd-a'; c.setAttribute('data-send-copy', ''); c.textContent = L.getAttribute('data-snd-copy');
var s = d.createElement('span'); s.className = 'snd-say'; s.setAttribute('role', 'status'); s.setAttribute('data-ok', L.getAttribute('data-snd-ok'));
m.appendChild(a); m.appendChild(c); m.appendChild(s); w.appendChild(m);
}
m.hidden = false; w.classList.add('is-open'); b.setAttribute('aria-expanded', 'true');
if (focus) m.querySelector('[data-send-wa]').focus();
}
function copy(text) {
if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
try { var t = d.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0'; d.body.appendChild(t); t.select(); var ok = d.execCommand('copy'); t.remove(); return Promise.resolve(ok); } catch (e) { return Promise.resolve(false); }
}
d.addEventListener('click', function (e) {
var t = e.target; if (!t || !t.closest) return;
var b = t.closest('[data-send]');
if (b) {
var o = data(b);
if (b.getAttribute('aria-expanded') === 'true') return close(b);
if (navigator.share) {
var p; try { p = navigator.share({ title: o.title, text: o.text, url: o.url }); } catch (x) { p = Promise.reject(x); }
Promise.resolve(p).then(null, function (x) { if (!x || x.name !== 'AbortError') more(b, o, false); });
} else more(b, o, true);
return;
}
var c = t.closest('[data-send-copy]');
if (c) {
var w = c.closest('.snd'), b2 = w && w.querySelector('[data-send]'), say = w && w.querySelector('.snd-say'); if (!b2) return;
var u = data(b2).url;
copy(u).then(function (ok) { if (say) { say.textContent = ok ? say.getAttribute('data-ok') : u; clearTimeout(say._t); say._t = setTimeout(function () { say.textContent = ''; }, 4000); } });
}
});
d.addEventListener('keydown', function (e) {
if (e.key !== 'Escape' || !e.target || !e.target.closest) return;
var w = e.target.closest('.snd'), b = w && w.querySelector('[data-send][aria-expanded="true"]');
if (b) { e.stopPropagation(); close(b, true); }
});
var reader = d.querySelector('[data-reader]'), strip = d.querySelector('[data-arv]');
var n = reader && +reader.getAttribute('data-arrived');
if (!strip || !n) return;
var root = d.documentElement, scenes = d.querySelectorAll('.scene'), moved = false, raf = 0;
var k = strip.querySelector('[data-arv-k]');
if (k) k.textContent = (strip.getAttribute('data-fmt') || '').replace('{n}', n).replace('{t}', strip.getAttribute('data-total'));
function now() {
var f = root.classList.contains('fm') && window.SpritualFilmNow ? window.SpritualFilmNow() : null;
if (f) return f.ended || f.closing ? 0 : Math.floor(f.at + .1);   // (a scene's title is held a little before its own number begins)
if (root.classList.contains('fm')) return n;   // the film is still being built: wait
var mid = innerHeight * .4, best = 0;
for (var i = 0; i < scenes.length; i++) if (scenes[i].getBoundingClientRect().top <= mid) best = i + 1;
return best;
}
function leave() {
if (strip.hidden) return;
var had = strip.contains(d.activeElement);
strip.hidden = true; removeEventListener('scroll', onScroll); d.removeEventListener('keydown', onKey, true);
if (had) { var s = d.getElementById('page-' + n); if (s) { s.tabIndex = -1; s.focus({ preventScroll: true }); } }
}
var again = 0;
function check(tries) { raf = 0; clearTimeout(again); if (now() !== n) return leave(); if (tries > 0) again = setTimeout(function () { check(tries - 1); }, 300); }
function onScroll() { if (!moved || raf) return; raf = requestAnimationFrame(function () { check(6); }); }
function onKey(e) { if (e.key === 'Escape' && !d.querySelector('dialog[open]') && !(e.target.closest && e.target.closest('.snd'))) leave(); }
['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(function (ev) { addEventListener(ev, function (e) { if (ev !== 'keydown' || /^(Arrow|Page|Home|End|Tab| )/.test(e.key)) moved = true; }, { passive: true, capture: true }); });
addEventListener('hashchange', function () { moved = true; onScroll(); });
addEventListener('scroll', onScroll, { passive: true });
d.addEventListener('keydown', onKey, true);
strip.querySelector('[data-arv-x]').addEventListener('click', leave);
strip.hidden = false;
})();
