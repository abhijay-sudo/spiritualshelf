// Spritual, the four legends (styles: legend.css). Loaded only on the pages of Rama, Ravana, Hanuman and Parashurama, after
// epic.js. It measures where the portrait and the name stand, writes that onto the hero as custom properties, and adds two
// inert layers of light (one behind the page's content, one in front) that legend.css animates. The page is readable and
// usable throughout: nothing here takes a pointer, moves the layout or waits for anything. A first showing is the whole
// entrance; later in the same visit it begins part-way (sessionStorage); any tap, key or scroll ends it; a small button
// plays it again. With reduce-motion (device or site) or Save-Data only the still end state is drawn.
(function () {
  'use strict';
  var d = document, root = d.documentElement, main = d.querySelector('main'), hero = d.querySelector('.cast-hero.ep-hero');
  if (!main || !hero) return;
  var me = main.dataset.legend || '', q = /[?&]legend=([a-z]+)/.exec(location.search);
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  // how far into the entrance a repeat showing begins (seconds)
  var CUT = { rama: 1.2, ravana: .95, hanuman: .6, parashurama: .5 };
  var pic = hero.querySelector('.cast-hero-pic'), name = hero.querySelector('.cast-name');
  if (q && local && CUT[q[1]]) {   // a test hook for local previews only: any legend's sequence on this page
    me = main.dataset.legend = q[1];
    var tint = { rama: '#f6b45c', ravana: '#e0492f', hanuman: '#ff8a3c', parashurama: '#ff7043' }[me];
    hero.style.setProperty('--ep-a', tint); main.style.setProperty('--ep-a', tint);
    var nm = /[?&]name=([^&]+)/.exec(location.search);
    if (nm && name) {
      var txt = decodeURIComponent(nm[1]), old = [].slice.call(name.querySelectorAll('.ep-l')); name.style.setProperty('--ep-nl', Math.max(4, Array.from(txt).length));
      if (old.length) { old.forEach(function (s) { s.remove(); }); Array.from(txt).forEach(function (ch, k) { var s = d.createElement('span'); if (ch === ' ') s.textContent = ' '; else { s.className = 'ep-l'; s.textContent = ch; s.style.setProperty('--i', k); } name.appendChild(s); }); }
      else if (name.firstElementChild) name.firstElementChild.textContent = txt;
    }
  }
  if (!CUT[me] || !pic || !name) return;
  var hi = /^hi/i.test(root.lang || '');
  var still = function () { return root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches || !!(navigator.connection && navigator.connection.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches; };
  var r = function (a, b) { return a + Math.random() * (b - a); };
  var px = function (v) { return v.toFixed(1) + 'px'; };

  // where things stand, in the hero's own coordinates (layout boxes, so a transform in progress does not skew them)
  var box = function (e) { var x = 0, y = 0, w = e.offsetWidth, h = e.offsetHeight; while (e && e !== hero) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return [x, y, w, h]; };
  var measure = function () {
    var art = pic.querySelector('.art, .sc-crop, .fig') || pic, a = box(art), n = box(name), S = hero.style;
    var sp = [].filter.call(name.children, function (c) { return !c.classList.contains('lg-n2'); });
    var nl = n[0], nw = n[2];
    if (sp.length) { var f = sp[0], l = sp[sp.length - 1]; if (l.offsetTop - f.offsetTop < f.offsetHeight / 2) { nl = n[0] + f.offsetLeft; nw = l.offsetLeft + l.offsetWidth - f.offsetLeft; } }
    var sw = hero.clientWidth, sh = Math.min(hero.offsetHeight, innerHeight);
    var lx = a[0] + a[2] / 2, ly = a[1] + a[3] / 2, lr = Math.min(a[2], a[3]) / 2, nx = nl + nw / 2, ny = n[1] + n[3] / 2;
    var V = { lx: lx, ly: ly, lr: lr, lw: a[2], lh: a[3], lt: a[1], pl: a[0], nx: nx, ny: ny, nw: nw, nh: n[3], sw: sw, sh: sh, tx: lx, ty: ly };
    if (me === 'rama') {   // the bow is aimed at the first letter of the name; the arrow lands there
      var tx = nl + Math.min(nw * .1, 34), dx = tx - lx, dy = ny - ly;
      V.tx = tx; V.ty = ny; V.ad = Math.sqrt(dx * dx + dy * dy); S.setProperty('--ba', (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2) + 'deg');
    } else if (me === 'ravana') {   // the crowns crest the arch of his portrait (or stand round a cut-out figure)
      var arch = art.classList.contains('sc-crop');
      V.kx = lx; V.ky = arch ? a[1] + a[2] / 2 : ly - lr * .1; V.kr = arch ? a[2] / 2 + 6 : lr * .98; V.kw = V.kr * .17;
      V.tx = nx; V.ty = ny + n[3] * .3;
    } else if (me === 'parashurama') { V.ar = Math.max(sw, 560) * .95; V.cy = Math.min(ny, sh - 48); }   // the cut runs through the name (or as near as the first screen allows)
    for (var k in V) S.setProperty('--' + k, px(V[k]));
  };

  var layers = [], timer = 0, playing = false, btn = null;
  var layer = function (cls, html, before) { var e = d.createElement('div'); e.className = 'lg ' + cls + ' lg--' + me; e.setAttribute('aria-hidden', 'true'); e.innerHTML = html; hero.insertBefore(e, before); layers.push(e); return e; };
  var many = function (n, fn) { var s = ''; for (var i = 0; i < n; i++) s += '<i style="' + fn(i) + '"></i>'; return s; };
  var sparks = function (n, t0, spread, rmax, both) {
    return many(n, function (i) { var a = (both && i % 2 ? 180 : 0) + r(-spread, spread); return '--a:' + a.toFixed(0) + 'deg;--r:' + r(rmax * .35, rmax).toFixed(0) + 'px;--w:' + r(8, 20).toFixed(0) + 'px;--t:' + (t0 + r(0, .12)).toFixed(2) + 's;--d:' + r(.5, .95).toFixed(2) + 's'; });
  };
  var build = function (on) {
    layers.forEach(function (e) { e.remove(); }); layers = [];
    var old = name.querySelector('.lg-n2'); if (old) old.remove();
    var small = innerWidth < 700, B = '', F = '', back = hero.querySelector('.ep-back');
    if (me === 'rama') {
      B = '<i class="lg-sun"></i><i class="lg-rays"></i><i class="lg-hz lg-e"></i><div class="lg-bow"><div class="lg-wipe"><div><i class="lg-limb"></i></div></div><i class="lg-s1 lg-e"></i><i class="lg-s2 lg-e"></i><i class="lg-s0"></i></div>';
      F = '<div class="lg-arrow lg-e"><i></i></div><i class="lg-glow lg-e"></i><i class="lg-flash lg-e"></i><div class="lg-sp lg-e">' + sparks(small ? 9 : 14, 1.9, 180, small ? 90 : 150) + '</div>' +
        many(small ? 5 : 8, function (i) { return '--x:' + r(4, 94).toFixed(1) + '%;--dx:' + r(-70, 70).toFixed(0) + 'px;--s:' + r(11, 18).toFixed(0) + 'px;--d:' + r(15, 24).toFixed(1) + 's;--t:' + (2.2 + i * r(1.6, 2.6)).toFixed(1) + 's'; }).replace(/<i /g, '<i class="lg-petal" ');
    } else if (me === 'ravana') {
      B = '<i class="lg-storm"></i><i class="lg-maj"></i><div class="lg-crowns">' + many(10, function (i) { var o = Math.abs(i - 4.5); return '--a:' + ((i - 4.5) * 12.6).toFixed(1) + 'deg;--k:' + (o - .5) + ';--o:' + (1 - o * .09).toFixed(2); }) + '</div>';
      F = '<i class="lg-str"></i><i class="lg-bead"></i><i class="lg-glow lg-e"></i><div class="lg-emb lg-e">' + many(small ? 10 : 16, function () { return '--x:' + r(3, 97).toFixed(1) + '%;--dx:' + r(-60, 60).toFixed(0) + 'px;--s:' + r(4, 9).toFixed(0) + 'px;--d:' + r(2.2, 3.6).toFixed(1) + 's;--t:' + r(.1, 1.7).toFixed(2) + 's'; }) + '</div>' +
        '<div class="lg-sp lg-e">' + [1.25, 1.58, 1.92].map(function (t) { return sparks(small ? 5 : 7, t, 62, small ? 80 : 130).replace(/--a:(-?\d+)/g, function (m, a) { return '--a:' + (+a - 90); }); }).join('') + '</div>';
    } else if (me === 'hanuman') {
      B = '<div class="lg-wind lg-e">' + many(small ? 5 : 8, function (i) { return '--y:' + r(6, 92).toFixed(1) + '%;--w:' + r(22, 52).toFixed(0) + '%;--o:' + r(.35, .8).toFixed(2) + ';--d:' + r(.55, .95).toFixed(2) + 's;--t:' + (i * .16 + r(0, .1)).toFixed(2) + 's'; }) + '</div>' +
        '<div class="lg-wind">' + many(3, function (i) { return '--y:' + r(10, 80).toFixed(1) + '%;--w:' + r(18, 34).toFixed(0) + '%;--d:' + r(8, 13).toFixed(1) + 's;--t:' + (3.6 + i * 2.7).toFixed(1) + 's'; }).replace(/<i /g, '<i class="lg-id" ') + '</div>';
      F = '<div class="lg-leap lg-e"><b><i></i></b></div><i class="lg-flash lg-e"></i><i class="lg-ring lg-e"></i><i class="lg-ring lg-ring2 lg-e"></i>' +
        '<div class="lg-wind lg-e"><i style="--y:var(--ny);--w:46%;--o:.9;--d:.7s;--t:1.22s"></i><i style="--y:calc(var(--ny) + var(--nh) * .32);--w:30%;--o:.6;--d:.8s;--t:1.4s"></i></div>' +
        '<div class="lg-sp lg-e" style="top:calc(var(--lt) + var(--lh) * .94)">' + sparks(small ? 8 : 12, 1.05, 16, small ? 120 : 200, true) + '</div>' +
        '<i class="lg-glint"></i><div class="lg-heart"><b lang="hi">राम</b></div>';
    } else {
      B = '<i class="lg-tapas"></i><i class="lg-tapas2"></i><div class="lg-emb">' + many(small ? 5 : 8, function (i) { return '--x:' + r(-70, 70).toFixed(0) + 'px;--dx:' + r(-34, 34).toFixed(0) + 'px;--s:' + r(3, 6).toFixed(0) + 'px;--d:' + r(3.4, 6).toFixed(1) + 's;--t:' + (1.4 + i * r(.5, .9)).toFixed(1) + 's'; }) + '</div>';
      F = '<div class="lg-cut lg-e"><i class="lg-veil lg-v1"></i><i class="lg-veil lg-v2"></i><i class="lg-band"></i><i class="lg-arc"></i><i class="lg-seam"></i><div class="lg-sp">' + sparks(small ? 12 : 18, .95, 24, small ? 170 : 300, true) + '</div></div>';
    }
    layer('lg-b' + (on ? ' lg-on' : ''), B, back ? back.nextSibling : hero.firstChild);
    layer('lg-f' + (on ? ' lg-on' : ''), F, null);
    if (on && me !== 'hanuman') {   // the name again, over itself, in the colour of the moment
      var n2 = d.createElement('span'); n2.className = 'lg-n2'; n2.setAttribute('aria-hidden', 'true');
      [].forEach.call(name.children, function (c) { n2.appendChild(c.cloneNode(true)); }); name.appendChild(n2);
    }
  };

  var done = function () {
    if (!playing) return; playing = false; clearTimeout(timer); main.classList.add('lg-done');
    layers.forEach(function (e) { [].forEach.call(e.querySelectorAll('.lg-e'), function (x) { x.remove(); }); });   // the entrance's own pieces are spent
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { removeEventListener(ev, skip, true); }); removeEventListener('scroll', skip);
  };
  // skipping is the same animations, long finished
  function skip() { if (!playing || performance.now() - t0 < 250) return; main.style.setProperty('--c', '9s'); done(); }
  var t0 = 0;
  var play = function (cut) {
    main.classList.remove('lg-done'); main.classList.add('lg-hold'); main.style.setProperty('--c', cut + 's');
    build(true); measure();
    void main.offsetWidth; main.classList.remove('lg-hold');
    playing = true; t0 = performance.now(); clearTimeout(timer); timer = setTimeout(done, (4.3 - cut) * 1000);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { addEventListener(ev, skip, { capture: true, passive: true }); }); addEventListener('scroll', skip, { passive: true });
  };

  var start = function () {
    if (still()) { main.classList.add('lg-off'); build(false); measure(); return; }
    main.classList.remove('lg-off');
    var key = 'spritual:legend:' + me, seen = false;
    try { seen = !!sessionStorage.getItem(key); sessionStorage.setItem(key, '1'); } catch (e) {}
    play(seen ? CUT[me] : 0);
    if (!btn) {
      btn = d.createElement('button'); btn.type = 'button'; btn.className = 'lg-replay';
      var label = hi ? 'प्रवेश दोबारा देखें' : 'Replay the entrance'; btn.setAttribute('aria-label', label); btn.title = label;
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.4 9.6A7 7 0 1 1 5 12M5 4.5v5.1h5.1"/></svg>';
      btn.addEventListener('click', function () { if (!still()) play(0); });
      hero.appendChild(btn);
    }
  };
  start();

  // the page settles (fonts, the portrait, a turn of the phone): measure again; the layers follow the properties
  var rt = 0, again = function () { clearTimeout(rt); rt = setTimeout(measure, 120); };
  addEventListener('resize', again, { passive: true }); addEventListener('load', again);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(again);
  // the reader switches motion off (or on) part-way
  new MutationObserver(function () { var off = still(); if (off === main.classList.contains('lg-off')) return; if (off) { done(); main.classList.add('lg-off'); main.style.setProperty('--c', '9s'); } else { main.classList.remove('lg-off'); } }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
})();
