/* Scroll worlds (/worlds/…). The page is a complete article without this file. When motion is welcome (no reduced
   motion, no Save-Data, not a weak device) the article's stages are stacked in a view pinned to the screen, and the
   reader's own scrolling is the camera: paintings cross-fade and travel, the words of each stage rise in the lower third,
   and a canvas draws what no painting shows (wind over the sea, the river of heaven, the light of each world).
   Nothing here takes the scroll away from the reader: the page scrolls natively and can be left at any point. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, main = d.querySelector('[data-world]');
  if (!main) return;
  var track = main.querySelector('[data-wl-track]'), view = main.querySelector('[data-wl-view]'), cv = main.querySelector('[data-wl-canvas]');
  if (!track || !view || !cv || !cv.getContext || !('IntersectionObserver' in window)) return;
  var kind = main.getAttribute('data-world'), unit = parseFloat(main.getAttribute('data-unit')) || 1;
  var mq = matchMedia('(prefers-reduced-motion: reduce)');
  var calm = function () {
    var c = navigator.connection;
    return mq.matches || root.dataset.motion === 'reduce' || root.classList.contains('ep-lite') || !!(c && c.saveData) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var sm = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var q = function (s) { return main.querySelector(s); };

  // ---- the stages ----
  var S = [].map.call(main.querySelectorAll('.wl-stage'), function (el) {
    var ds = el.dataset;
    return { el: el, w: parseFloat(ds.w) || 1, pic: el.querySelector('.wl-pic'), img: el.querySelector('.wl-pic img'), text: el.querySelector('.wl-text'),
      x: (ds.x || '50,50').split(',').map(Number), xp: ds.xp ? ds.xp.split(',').map(Number) : null, y: ds.y != null ? +ds.y : 38, same: 'same' in ds, fly: +(ds.fly || 0), river: ds.river || '', measure: 'measure' in ds,
      tone: ds.tone ? ds.tone.split(',').map(Number) : null, glow: 'glow' in ds, loka: +(ds.loka || 0), mark: ds.mark || '' };
  });
  var N = S.length, B = [0], total = 0, i;
  for (i = 0; i < N; i++) { total += S[i].w; B.push(total); }
  // a stage marked "same" keeps the painting before it, and the camera simply travels on across both
  var G = [];
  for (i = 0; i < N; i++) { if (S[i].pic) G.push({ first: i, last: i, pic: S[i].pic, img: S[i].img, y: S[i].y, held: false, shown: -1 }); else if (G.length) G[G.length - 1].last = i; }
  var F = 0.15;                       // half the length of a cross-fade, in stages
  var pxU = 0;                        // stage lengths per pixel of scroll (progress()): the hand-over between words is measured in pixels
  var stageAt = function (p) { var k = 0; while (k < N - 1 && p >= B[k + 1]) k++; return k; };

  var on = false, vw = 0, vh = 0, pw = 0, ph = 0, iw = 0, ih = 0, dpr = 1, portrait = false;
  var target = 0, pp = 0, last = 0, seen = true, raf = 0, ctx = null, painter = null, lastK = -1;
  var cue = q('[data-wl-cue]'), prevB = q('[data-wl-prev]'), nextB = q('[data-wl-next]'), stillB = q('[data-wl-still]'), again = q('[data-wl-again]');

  function measure() {
    vw = view.clientWidth; vh = view.clientHeight; portrait = vw / vh < 0.8;
    var r = G.length ? G[0].pic.getBoundingClientRect() : { width: vw, height: vh };
    pw = r.width || vw; ph = r.height || vh;
    iw = Math.max(pw, ph * 16 / 9); ih = iw * 9 / 16;
    dpr = Math.min(window.devicePixelRatio || 1, portrait ? 1.5 : 2);
    G.forEach(function (g) { if (g.img) { g.img.style.width = iw.toFixed(1) + 'px'; g.img.style.height = ih.toFixed(1) + 'px'; fit(g); } });
    var scale = kind === 'lokas' ? 1 : dpr;
    cv.width = Math.round(vw * scale); cv.height = Math.round(vh * scale);
    ctx = cv.getContext('2d'); ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (painter && painter.size) painter.size();
  }
  // which file a painting is drawn from. A painting that has arrived is asked for again only if it came too small for
  // this screen; one still on its way is left to arrive first. Nothing in flight is thrown away.
  function want() { return Math.round(iw * Math.min(1, 2 / (window.devicePixelRatio || 1))) + 'px'; }
  function fit(g) {
    var im = g.img;
    if (g.held) return;
    if (!im.naturalWidth) { if (!g.wait) { g.wait = true; im.addEventListener('load', function () { g.wait = false; if (on) fit(g); }, { once: true }); } return; }
    if (im.naturalWidth >= iw * Math.min(window.devicePixelRatio || 1, 2) * 0.7) return;
    if (im.sizes !== want()) im.sizes = want();
  }
  function progress() {
    var r = track.getBoundingClientRect(); var span = r.height - vh;
    target = span > 0 ? clamp(-r.top / span, 0, 1) * total : 0; pxU = span > 0 ? total / span : 0;
  }
  // a painting is asked of the network only when its stage is near. Its address is never taken away (that would cancel a
  // request already on its way): a painting not yet arrived is simply kept out of the layout, where a lazy image waits.
  function hold(g) { var im = g.img; if (!im || g.held || g.first === 0 || im.naturalWidth) return; g.held = true; im.style.display = 'none'; }
  function give(g) { if (!g.held) return; g.held = false; var im = g.img; if (!im.naturalWidth) { im.sizes = want(); im.loading = 'eager'; } im.style.display = ''; fit(g); }

  function render(p, now, dt) {
    var k = stageAt(p), j, g, a, o, s, t, u, fx, sc, st, e, x, pu = pxU || 0.001;
    for (j = 0; j < G.length; j++) {
      g = G[j]; a = B[g.first]; e = B[g.last + 1];
      if (p > a - 1.3) give(g);
      o = g.first === 0 ? 1 : sm((p - (a - F)) / (2 * F));
      // covered by the next painting, or not yet arrived: leave it alone
      if (j < G.length - 1 && p >= B[G[j + 1].first] + F) o = 0;
      if (o !== g.shown) { g.pic.style.opacity = o.toFixed(3); g.pic.style.visibility = o ? 'visible' : 'hidden'; g.shown = o; }
      if (!o || !g.img) continue;
      s = clamp(stageAt(clamp(p, a, e - 1e-6)), g.first, g.last); st = S[s];
      t = clamp((p - B[s]) / st.w, 0, 1); if (p < a) { s = g.first; st = S[s]; t = 0; }
      x = portrait && st.xp ? st.xp : st.x; fx = lerp(x[0], x[1], sm(t)) / 100;
      u = clamp((p - (a - F)) / (e - a + 2 * F), 0, 1); sc = 1 + 0.07 * u;
      g.img.style.transform = 'translate3d(' + ((pw - iw * sc) * fx).toFixed(2) + 'px,' + ((ph - ih * sc) * g.y / 100).toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
    }
    for (j = 0; j < N; j++) {
      st = S[j]; if (!st.text) continue;
      o = 0;
      if (j >= k - 1 && j <= k + 1) {
        // the words of one stage give way to the next one's in turn, never both at once: the outgoing words fade out over
        // the 24 px of scroll that end 6 px before the boundary, the incoming words fade in (rising a little) over the 24 px
        // that begin 6 px after it. Both are below half strength for 36 px only, and are never both half readable together.
        a = j === 0 ? 1 : sm((p - (B[j] + 6 * pu)) / (24 * pu));
        e = j === N - 1 ? 1 : 1 - sm((p - (B[j + 1] - 30 * pu)) / (24 * pu));
        o = Math.min(a, e); x = j === 0 ? 0 : (1 - a) * 16 - (1 - e) * 10;
      }
      if (o !== st.shown) { st.text.style.opacity = o.toFixed(3); st.text.style.transform = o ? 'translate3d(0,' + x.toFixed(1) + 'px,0)' : 'none'; st.shown = o; }
    }
    if (k !== lastK) { lastK = k; if (prevB) prevB.disabled = k === 0; }
    if (painter) painter.draw(p, k, clamp((p - B[k]) / S[k].w, 0, 1), now, dt);
  }
  function frame(now) {
    raf = 0; if (!on) return;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var dlt = target - pp; pp = Math.abs(dlt) < 0.0004 ? target : pp + dlt * Math.min(1, dt * 9);
    render(pp, now / 1000, dt);
    if (seen && !d.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() { if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function onScroll() { if (on) { progress(); wake(); } }
  var resizeT = 0;
  function onResize() { if (!on) return; cancelAnimationFrame(resizeT); resizeT = requestAnimationFrame(function () { measure(); progress(); pp = target; wake(); }); }
  function goTo(k) {
    if (k >= N) { var af = q('#wl-after'); af.scrollIntoView({ behavior: 'smooth' }); af.focus({ preventScroll: true }); return; }
    k = clamp(k, 0, N - 1);
    var r = track.getBoundingClientRect(), span = r.height - vh, at = k === 0 ? 0 : B[k] + Math.min(0.5, S[k].w * 0.45);
    window.scrollTo({ top: window.scrollY + r.top + span * at / total, behavior: 'smooth' });
  }

  function enable() {
    if (on) return; on = true;
    root.classList.add('wl-on');
    track.style.height = 'calc(' + (total * unit * 100).toFixed(1) + 'svh + 100svh)';
    G.forEach(hold);
    // only one painting is on screen at a time, so a screen reader is given each painting's description with its stage's words
    G.forEach(function (g) { var tx = S[g.first].text; if (!g.img || !g.img.alt || !tx || g.alt) return; g.alt = d.createElement('span'); g.alt.className = 'visually-hidden'; g.alt.textContent = g.img.alt; tx.insertBefore(g.alt, tx.firstChild); g.pic.setAttribute('aria-hidden', 'true'); });
    // the consent question waits beside a full-screen stage (consent.js); it is set aside here at once so it never flashes over the words
    var ask = d.querySelector('.cx-consent'); if (ask && !ask.hidden && !ask.contains(d.activeElement)) { ask.classList.add('is-aside'); ask.inert = true; }
    measure(); progress(); pp = target;
    [cue, prevB, nextB].forEach(function (b) { if (b) b.hidden = false; });
    if (stillB) stillB.textContent = stillB.dataset.still;
    wake();
    // the canvas is made ready in a later task of its own, so taking over the page is never one long piece of work
    setTimeout(function () {
      if (!on || painter) return;
      painter = (PAINT[kind] || function () { return null; })();
      if (painter && painter.size) painter.size();
      requestAnimationFrame(function () { cv.classList.add('is-live'); main.classList.add('is-live'); });
    }, 60);
  }
  function disable() {
    if (!on) return; on = false; cancelAnimationFrame(raf); raf = 0;
    root.classList.remove('wl-on'); main.classList.remove('is-live'); cv.classList.remove('is-live');
    track.style.height = '';
    G.forEach(function (g) { g.held = false; g.shown = -1; if (g.alt) { g.alt.remove(); g.alt = null; g.pic.removeAttribute('aria-hidden'); } g.pic.style.opacity = ''; g.pic.style.visibility = ''; if (g.img) g.img.style.cssText = g.img.style.cssText.replace(/(width|height|transform|display)[^;]*;?/g, ''); });
    S.forEach(function (st) { st.shown = -1; if (st.text) { st.text.style.opacity = ''; st.text.style.transform = ''; } });
    if (painter && painter.off) painter.off(); painter = null;
    [cue, prevB, nextB].forEach(function (b) { if (b) b.hidden = true; });
    if (stillB) stillB.textContent = stillB.dataset.move;
  }

  // ---- what the canvas draws, one painter for each world ----
  var PAINT = {};

  // Hanuman's leap: wind over the water while he is in the air; the two measures of Surasa's contest; the gauge
  PAINT.leap = function () {
    var gauge = q('[data-wl-gauge]'), bead = q('[data-wl-bead]'), rail = gauge && gauge.querySelector('.wl-gauge-rail'), box = q('[data-wl-measure]');
    var mhW = 0, mh = box && box.querySelector('.wl-m--h'), ms = box && box.querySelector('.wl-m--s'), bh = box && box.querySelector('[data-m-h]'), bs = box && box.querySelector('[data-m-s]');
    var iA = 0, iZ = N - 1, marks = [], streaks = [], railH = 0, room = 1e4, roof = 0, floor = 1e4, shownH = '', shownS = '', boxO = -1;
    S.forEach(function (st, j) { if (st.mark === 'start') iA = j; if (st.mark === 'end') iZ = j; });
    var pA = B[iA + 1], pZ = B[iZ] + 0.3, at = function (p) { return clamp((p - pA) / (pZ - pA), 0, 1); };
    if (rail) S.forEach(function (st, j) { if (!st.mark || st.mark === 'start' || st.mark === 'end') return; var em = d.createElement('em'); em.textContent = st.mark; var f = at(B[j] + st.w * 0.45); em.style.top = (f * 100).toFixed(1) + '%'; rail.appendChild(em); marks.push({ el: em, a: B[j], z: B[j + 1], f: f }); });
    if (gauge) gauge.classList.add('is-live');
    for (var n = 0; n < 26; n++) streaks.push({ x: Math.random(), y: Math.random(), l: 0.04 + Math.random() * 0.09, v: 0.25 + Math.random() * 0.5, a: 0.06 + Math.random() * 0.16 });
    var num = function (v) { return v ? v + ' ' + box.dataset.unit : ''; };
    return {
      size: function () {
        var vr = view.getBoundingClientRect(), gr, low = vh;
        // the gauge ends above the highest line of words that runs beneath it (a small phone, a long paragraph)
        if (rail) {
          rail.style.height = ''; gr = gauge.getBoundingClientRect();
          S.forEach(function (st) { if (!st.text) return; var r = st.text.getBoundingClientRect(); if (r.right > gr.left - 8) low = Math.min(low, r.top - vr.top); });
          if (gr.bottom - vr.top > low - 10) rail.style.height = Math.max(40, rail.clientHeight - (gr.bottom - vr.top - low + 10)) + 'px';
        }
        railH = rail ? rail.clientHeight : 0; mhW = mh ? mh.offsetWidth : 0;
        // the two measures and their labels stand wholly above the words of their stage, however short the screen
        var ms0 = S.filter(function (st) { return st.measure && st.text; })[0], out = q('.wl-out'), ob = out ? out.getBoundingClientRect() : null;
        roof = Math.max(vh * (portrait ? 0.1 : 0.14), portrait && ob ? ob.bottom - vr.top + 8 : 0);   // on a phone the measures begin below the way out
        floor = ms0 ? ms0.text.getBoundingClientRect().top - vr.top - (mh ? mh.offsetHeight + 26 : 72) - 26 : vh; room = floor - roof;
      },
      off: function () { marks.forEach(function (m) { m.el.remove(); }); if (rail) rail.style.height = ''; if (gauge) gauge.classList.remove('is-live'); if (box) box.style.opacity = ''; },
      draw: function (p, k, t, now, dt) {
        var st = S[k], nx = S[Math.min(N - 1, k + 1)], fly = lerp(st.fly, nx.fly, sm((t - 0.8) / 0.2)), j, s, x, y;
        ctx.clearRect(0, 0, vw, vh);
        if (bead) bead.style.transform = 'translate3d(0,' + (at(p) * railH).toFixed(1) + 'px,0)';
        for (j = 0; j < marks.length; j++) marks[j].el.classList.toggle('is-at', p >= marks[j].a && p < marks[j].z);
        if (fly > 0.01) {
          ctx.lineCap = 'round'; ctx.lineWidth = 1;
          var top = vh * 0.1, band = (portrait ? ph * 0.86 : vh * 0.62) - top, cnt = portrait ? 14 : streaks.length;
          for (j = 0; j < cnt; j++) {
            s = streaks[j]; s.x -= s.v * dt * fly * 0.55; if (s.x < -0.15) { s.x = 1.05; s.y = Math.random(); }
            x = s.x * vw; y = top + s.y * band;
            ctx.strokeStyle = 'rgba(255,246,226,' + (s.a * fly).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s.l * vw, y - s.l * vw * 0.05); ctx.stroke();
          }
        }
        // Surasa: Hanuman ten, her mouth twenty; then her mouth eighty, he ninety; then a thumb. Only the story's figures.
        var o = st.measure && room >= 70 ? Math.min(sm((t - 0.06) / 0.1), 1 - sm((t - 0.9) / 0.08)) : 0;   // with no room above the words, the words alone carry the contest
        if (box && o !== boxO) { box.style.opacity = o.toFixed(3); boxO = o; }
        if (!o) return;
        var H, M, hs = '', ss = '', per = Math.min(vh * (portrait ? 0.3 : 0.4), room) / 90, mid = clamp(vh * (portrait ? 0.27 : 0.34), roof + 45 * per, floor - 45 * per), hx = Math.max(vw * (portrait ? 0.24 : 0.36), mhW / 2 + 20), jx0 = vw * (portrait ? 0.43 : 0.47), jx1 = vw * (portrait ? 0.7 : 0.66);   // his label stays inside the gutter; her jaws end clear of the gauge
        var g1 = sm((t - 0.1) / 0.12), g2 = sm((t - 0.32) / 0.26), th = sm((t - 0.66) / 0.06), dart = clamp((t - 0.72) / 0.16, 0, 1);
        H = lerp(lerp(0, 10, g1), 90, g2) * (1 - th); M = lerp(lerp(0, 20, g1), 80, g2);
        if (g1 >= 1 && g2 <= 0) { hs = num(10); ss = num(20); } else if (g2 >= 1) { ss = num(80); hs = th >= 1 ? box.dataset.thumb : th <= 0 ? num(90) : ''; }
        if (hs !== shownH) { bh.textContent = hs; shownH = hs; } if (ss !== shownS) { bs.textContent = ss; shownS = ss; }
        var base = mid + 90 * per / 2 + 14;
        mh.style.transform = 'translate3d(' + hx.toFixed(1) + 'px,' + base.toFixed(1) + 'px,0)'; ms.style.transform = 'translate3d(' + ((jx0 + jx1) / 2).toFixed(1) + 'px,' + base.toFixed(1) + 'px,0)';
        ctx.globalAlpha = o; ctx.lineCap = 'round';
        var half = M * per / 2, pass = [[7, 'rgba(170,225,220,.13)'], [1.4, 'rgba(214,240,236,.85)']];
        if (M > 0.5) for (j = 0; j < 2; j++) {   // her jaws: two curves hinged on the right, open toward him
          ctx.lineWidth = pass[j][0]; ctx.strokeStyle = pass[j][1]; ctx.beginPath();
          ctx.moveTo(jx0, mid - half); ctx.quadraticCurveTo(lerp(jx0, jx1, 0.55), mid - half * 1.05, jx1, mid);
          ctx.quadraticCurveTo(lerp(jx0, jx1, 0.55), mid + half * 1.05, jx0, mid + half); ctx.stroke();
        }
        var hh = H * per / 2;
        if (th < 1) { pass = [[9, 'rgba(255,205,120,.16)'], [2.4, 'rgba(255,220,150,.95)']]; for (j = 0; j < 2; j++) { ctx.lineWidth = pass[j][0]; ctx.strokeStyle = pass[j][1]; ctx.beginPath(); ctx.moveTo(hx, mid - hh); ctx.lineTo(hx, mid + hh); ctx.stroke(); } }
        if (th > 0) {              // the size of a thumb: in, out, and standing in the air
          var into = Math.sin(Math.min(1, dart / 0.7) * Math.PI), out = sm((dart - 0.7) / 0.3);
          x = lerp(hx, lerp(jx0, jx1, 0.5), into) ; y = mid - out * vh * 0.06;
          ctx.fillStyle = 'rgba(255,205,120,.2)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(255,232,170,.98)'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
  };

  // The descent of Ganga: one unbroken ribbon of light, falling, caught and circling, released, and running to the sea
  PAINT.ganga = function () {
    var X = [], Y = [], top = [], sec = {}, cx = 0, gw = 0, R = 0, lakeI = 0, motes = [];
    var plan = { wait: ['fall', 0, 0], fall: ['fall', 0, 1], strike: ['coil', 0, 0.1], locks: ['coil', 0.1, 0.55], locks2: ['coil', 0.55, 1], seven: ['free', 0, 1], run: ['run', 0, 1], sea: ['sea', 0, 1] };
    for (var n = 0; n < 34; n++) motes.push({ x: Math.random(), y: Math.random(), v: 0.03 + Math.random() * 0.05, a: 0.2 + Math.random() * 0.5, r: 0.6 + Math.random() * 1.1 });
    function build() {
      X = []; Y = []; top = []; sec = {};
      gw = measureGutter();
      cx = gw * 0.5; R = Math.min(gw * 0.36, vh * 0.085);
      var amp = gw * 0.16, y, a, r, i0, m, turns = 5.5, cy;
      var add = function (name, fn, steps) { i0 = X.length; for (m = 0; m <= steps; m++) fn(m / steps); sec[name] = [i0, X.length - 1]; };
      add('fall', function (u) { y = lerp(-0.06, 0.4, u) * vh; X.push(cx + Math.sin(u * 5) * amp * 0.35); Y.push(y); }, 60);
      cy = 0.4 * vh + R;
      add('coil', function (u) { a = -Math.PI / 2 + u * turns * 2 * Math.PI; r = R * (0.5 + 0.5 * Math.abs(Math.cos(u * turns * Math.PI * 0.66 + 0.5))); r = lerp(R, r, sm(u * 6) * sm((1 - u) * 6)); X.push(cx + Math.cos(a) * r * 1.05); Y.push(cy + Math.sin(a) * r); }, 320);
      var y0 = cy + R, x0 = X[X.length - 1];
      add('free', function (u) { X.push(lerp(x0, cx, sm(u * 2)) + Math.sin(u * 4.2) * amp * sm(u * 3)); Y.push(y0 + u * 0.5 * vh); }, 60);
      lakeI = X.length - 1; var y1 = Y[lakeI], x1 = X[lakeI];
      add('run', function (u) { X.push(lerp(x1, cx, sm(u * 3)) + Math.sin(u * 9.5 + 1) * amp * 1.5 * sm(u * 4)); Y.push(y1 + u * 1.25 * vh); }, 130);
      var y2 = Y[X.length - 1], x2 = X[X.length - 1];
      add('sea', function (u) { X.push(lerp(x2, cx, sm(u)) + Math.sin(u * 3) * amp * (1 - u)); Y.push(y2 + u * 0.55 * vh); }, 50);
      var mx = -1e9; for (m = 0; m < X.length; m++) { mx = Math.max(mx, Y[m]); top.push(mx); }
    }
    function measureGutter() { var probe = d.createElement('i'); probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--wl-gutter)'; main.appendChild(probe); var w = probe.offsetWidth; probe.remove(); return w || vw * 0.2; }
    function stroke(a, b, fa, cam, w, style, dash, off) {
      if (b <= a) return; var i0 = Math.floor(a), i1 = Math.floor(b), m;
      ctx.lineWidth = w; ctx.strokeStyle = style; ctx.setLineDash(dash || []); ctx.lineDashOffset = off || 0;
      ctx.beginPath(); ctx.moveTo(X[i0], Y[i0] - cam);
      for (m = i0 + 1; m <= i1; m++) ctx.lineTo(X[m], Y[m] - cam);
      if (i1 < X.length - 1 && fa > 0) ctx.lineTo(lerp(X[i1], X[i1 + 1], fa), lerp(Y[i1], Y[i1 + 1], fa) - cam);
      ctx.stroke();
    }
    return {
      size: build,
      draw: function (p, k, t, now) {
        ctx.clearRect(0, 0, vw, vh);
        var st = S[k], pl = plan[st.river] || plan.wait, r = sec[pl[0]], e = st.river === 'fall' ? t * t : st.river === 'locks' || st.river === 'locks2' ? sm(sm(t)) : sm(t);
        if (st.river === 'fall' || st.river === 'seven' || st.river === 'sea') e = clamp(e / 0.7, 0, 1);
        var tip = lerp(r[0], r[1], lerp(pl[1], pl[2], e)), ti = Math.floor(tip), tf = tip - ti, cam = Math.max(0, lerp(top[ti], top[Math.min(top.length - 1, ti + 1)], tf) - vh * 0.5), a = 0, m;
        while (a < ti && Y[a] - cam < -40) a += 4;
        a = Math.max(0, a - 4);
        // the river of heaven, waiting: a glow at the top of the margin
        var wait = st.river === 'wait' ? 1 : st.river === 'fall' ? 1 - sm(t * 2) : 0, g;
        if (wait > 0) { g = ctx.createRadialGradient(cx, -vh * 0.02, 0, cx, -vh * 0.02, gw * 1.3); g.addColorStop(0, 'rgba(200,230,255,' + (0.42 + 0.08 * Math.sin(now * 1.3)) * wait + ')'); g.addColorStop(1, 'rgba(200,230,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, gw * 2.4, vh * 0.4); }
        if (st.river === 'wait') return;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
        var wide = portrait ? 1 : 1.25, slow = st.river === 'locks' || st.river === 'locks2' ? 16 : st.river === 'fall' ? 190 : 70;
        stroke(a, tip, tf, cam, 20 * wide, 'rgba(96,160,235,.12)');
        stroke(a, tip, tf, cam, 8 * wide, 'rgba(150,205,255,.26)');
        stroke(a, tip, tf, cam, 2.6 * wide, 'rgba(236,247,255,.95)');
        stroke(a, tip, tf, cam, 1.6 * wide, 'rgba(255,255,255,.55)', [5, 34], -now * slow);
        ctx.setLineDash([]);
        // Bindu Lake: a pool of light where the water rests. The seven streams are in the painting itself.
        if (tip >= lakeI - 1 && Y[lakeI] - cam > -vh * 0.3) {
          var lx = X[lakeI], ly = Y[lakeI] - cam, len = Math.min(gw * 0.44, vh * 0.12);
          g = ctx.createRadialGradient(lx, ly, 0, lx, ly, len * 0.8); g.addColorStop(0, 'rgba(190,225,255,.5)'); g.addColorStop(1, 'rgba(190,225,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx, ly, len * 0.8, len * 0.34, 0, 0, 6.2832); ctx.fill();
        }
        // the head of the water
        var hx = lerp(X[ti], X[Math.min(X.length - 1, ti + 1)], tf), hy = lerp(Y[ti], Y[Math.min(Y.length - 1, ti + 1)], tf) - cam;
        g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 13 * wide); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.35, 'rgba(170,215,255,.4)'); g.addColorStop(1, 'rgba(170,215,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 13 * wide, 0, 6.2832); ctx.fill();
        // the sea: the water lies down across the whole width, and light rises from it
        if (st.river === 'sea') {
          var sp = sm((t - 0.58) / 0.3), up = sm((t - 0.7) / 0.25), sy = vh * 0.5, wd = vw * sp;
          if (sp > 0) {
            g = ctx.createLinearGradient(0, sy - 26, 0, sy + 26); g.addColorStop(0, 'rgba(150,205,255,0)'); g.addColorStop(0.5, 'rgba(190,228,255,' + 0.42 * sp + ')'); g.addColorStop(1, 'rgba(150,205,255,0)');
            ctx.fillStyle = g; ctx.fillRect(hx - 2, sy - 26, wd, 52);
            ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(240,250,255,' + 0.8 * sp + ')'; ctx.beginPath(); ctx.moveTo(hx, sy); ctx.lineTo(hx + wd, sy); ctx.stroke();
          }
          if (up > 0) for (m = 0; m < motes.length; m++) {
            var mo = motes[m], yy = 1 - ((now * mo.v + mo.y) % 1);
            ctx.fillStyle = 'rgba(255,244,214,' + (mo.a * up * Math.sin(yy * Math.PI)).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(gw + mo.x * (vw - gw), yy * sy, mo.r, 0, 6.2832); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  };

  // The fourteen lokas: one column of light; its colour, where the light comes from and how the motes drift all change with depth
  PAINT.lokas = function () {
    var rail = q('[data-wl-rail]'), ticks = rail ? [].slice.call(rail.children) : [], motes = [], cnt = 0, lastP = null, atTick = -1;
    var earth = 0; S.forEach(function (st, j) { if (st.loka === 7) earth = B[j + 1]; });
    for (var n = 0; n < 90; n++) motes.push({ x: Math.random(), y: Math.random(), z: 0.35 + Math.random() * 0.65, ph: Math.random() * 6.28, r: 0.5 + Math.random() * 1.2 });
    var c3 = function (c, kf, add) { return 'rgb(' + Math.round(clamp(c[0] * kf + add, 0, 255)) + ',' + Math.round(clamp(c[1] * kf + add, 0, 255)) + ',' + Math.round(clamp(c[2] * kf + add, 0, 255)) + ')'; };
    return {
      size: function () { cnt = portrait ? 44 : motes.length; },
      off: function () { ticks.forEach(function (li) { li.classList.remove('is-at'); }); },
      draw: function (p, k, t, now, dt) {
        var a = S[k].tone, b = S[Math.min(N - 1, k + 1)].tone, f = sm((t - 0.62) / 0.38), c = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)], m, g;
        var depth = p / total, below = sm((p - earth + 0.4) / 1.2), glow = lerp(S[k].glow ? 1 : 0, S[Math.min(N - 1, k + 1)].glow ? 1 : 0, f);
        g = ctx.createLinearGradient(0, 0, 0, vh); g.addColorStop(0, c3(c, 0.5, 4)); g.addColorStop(0.55, c3(c, 0.3, 4)); g.addColorStop(1, c3(c, 0.12, 6));
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
        ctx.globalCompositeOperation = 'lighter';
        // above the earth the light comes from above and thins as you go down; below it, from beneath, where the jewels are
        var up = (1 - below) * lerp(0.55, 0.16, clamp(p / Math.max(1, earth), 0, 1)), dn = below * lerp(0.1, 0.3, clamp((p - earth) / Math.max(1, total - earth), 0, 1)) + glow * 0.35, rad = Math.max(vw, vh) * 0.85;
        if (up > 0.01) { g = ctx.createRadialGradient(vw * 0.5, -vh * 0.12, 0, vw * 0.5, -vh * 0.12, rad); g.addColorStop(0, c3(c, 0.9 * up, 60 * up)); g.addColorStop(1, 'rgb(0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh); }
        if (dn > 0.01) { g = ctx.createRadialGradient(vw * 0.5, vh * 1.1, 0, vw * 0.5, vh * 1.1, rad); g.addColorStop(0, c3(c, 0.9 * dn, 70 * dn)); g.addColorStop(1, 'rgb(0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh); }
        // the motes: weightless and rising in the high worlds, sinking the deeper you go; they pass you as you descend
        var vy = lerp(-0.018, 0.05, sm(depth)), dp = lastP == null ? 0 : p - lastP; lastP = p;
        for (m = 0; m < cnt; m++) {
          var mo = motes[m]; mo.y += (vy * dt - dp * unit * 0.22) * mo.z; mo.y = mo.y - Math.floor(mo.y);
          var x = (mo.x + Math.sin(now * 0.25 + mo.ph) * 0.012) * vw, al = (0.16 + 0.34 * mo.z) * (0.75 + 0.25 * Math.sin(now * 1.1 + mo.ph));
          ctx.fillStyle = 'rgba(255,246,226,' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, mo.y * vh, mo.r * mo.z, 0, 6.2832); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        var tick = S[k].loka ? S[k].loka - 1 : -1;
        if (tick !== atTick) { if (ticks[atTick]) ticks[atTick].classList.remove('is-at'); if (ticks[tick]) ticks[tick].classList.add('is-at'); atTick = tick; }
      }
    };
  };

  // ---- wiring ----
  new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen) wake(); }, { rootMargin: '20% 0px' }).observe(view);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  d.addEventListener('visibilitychange', function () { if (!d.hidden) wake(); });
  if (prevB) prevB.addEventListener('click', function () { goTo(stageAt(target + 0.001) - 1); });
  if (nextB) nextB.addEventListener('click', function () { goTo(stageAt(target + 0.001) + 1); });
  if (again) again.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' }); var h = main.querySelector('.wl-h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } });
  if (stillB) { stillB.hidden = calm(); stillB.addEventListener('click', function () { if (on) { disable(); } else { enable(); } window.scrollTo(0, 0); }); }
  var settle = function () { if (calm()) disable(); else if (!stillB || stillB.textContent !== stillB.dataset.move) enable(); if (stillB) stillB.hidden = calm(); };
  if (mq.addEventListener) mq.addEventListener('change', settle);
  new MutationObserver(settle).observe(root, { attributes: true, attributeFilter: ['data-motion', 'class'] });
  if (!calm()) enable();
})();
