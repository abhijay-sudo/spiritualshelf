/* The brass lens ("Look closer": markup from lensSection in src/build.mjs, styles in assets/lens.css).
   The page already holds everything: the painting and, under it, a list of its details, each with one sentence quoted
   from the story and the scene it comes from. This script only changes how that list is met. It lays a brass lens on the
   painting; inside it the paint gives way to gold line art traced from the same painting (assets/lens/<name>.webp,
   fetched when the painting nears the screen); where the lens rests on a marked detail, that detail's name and sentence
   bloom beneath the painting, under the lens. A mouse drags the lens; a finger slides it along the rail (or drags the lens itself); Tab walks the
   names. The glass always shows the paint that lies under its own centre, and never anything beyond the painting's edge:
   near an edge the lens leans a little past the painting instead (where the page has room for it). A gold mark that
   belongs to a face rests beside the face, never on it. Nothing runs on Save-Data, under reduced motion or on a weak device: those readers keep the still painting and
   the plain list. Only transforms and opacity move, and a frame is drawn only while the lens is travelling. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var secs = doc.querySelectorAll('[data-bl]');
  if (!secs.length || !window.PointerEvent || !('IntersectionObserver' in window)) return;
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
  var conn = navigator.connection;
  if (root.classList.contains('ep-lite') || (conn && conn.saveData) || mm('(prefers-reduced-data: reduce)') || mm('(prefers-reduced-motion: reduce)')) return;
  if ((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) return;

  var el = function (tag, cls, attrs) { var n = doc.createElement(tag); if (cls) n.className = cls; if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]); return n; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var txt = function (n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; };

  function init(sec) {
    var stage = sec.querySelector('[data-bl-stage]'), list = sec.querySelector('[data-bl-list]'), fig = stage && stage.parentNode, pic = stage && stage.querySelector('img');
    var edge = sec.getAttribute('data-edge');
    if (!stage || !list || !pic || !edge) return;
    var items = [].map.call(list.children, function (li) {
      var x = +li.getAttribute('data-x') / 100, y = +li.getAttribute('data-y') / 100, dx = li.getAttribute('data-dx'), dy = li.getAttribute('data-dy');
      return { li: li, x: x, y: y, r: +li.getAttribute('data-r') / 100, dx: dx ? +dx / 100 : x, dy: dy ? +dy / 100 : y, name: txt(li.querySelector('.bl-name')), text: txt(li.querySelector('.bl-text')), from: txt(li.querySelector('.bl-from')) };
    });
    var n = items.length; if (n < 2) return;
    var S = { hint: sec.getAttribute('data-hint') || '', rail: sec.getAttribute('data-rail') || '', between: sec.getAttribute('data-between') || '', chips: sec.getAttribute('data-chips') || '' };

    /* ---- what the lens adds to the page ---- */
    var lens = el('div', 'bl-lens', { 'aria-hidden': 'true' }), glass = el('div', 'bl-glass');
    var paint = el('img', 'bl-p', { alt: '', decoding: 'async' }), gold = el('img', 'bl-x', { alt: '', decoding: 'async' });
    glass.appendChild(paint); glass.appendChild(gold); lens.appendChild(glass); lens.appendChild(el('i', 'bl-ring'));
    var dots = items.map(function (it) { var d = el('i', 'bl-dot', { 'aria-hidden': 'true' }); d.style.left = it.dx * 100 + '%'; d.style.top = it.dy * 100 + '%'; stage.appendChild(d); return d; });
    stage.appendChild(lens);

    var rail = el('div', 'bl-rail'), range = el('input', '', { type: 'range', min: '0', max: '1000', step: '1', value: '0', 'aria-label': S.rail });
    rail.appendChild(range);
    items.forEach(function (it, i) { var b = el('i', 'bl-bead', { 'aria-hidden': 'true' }); b.style.left = 'calc(13px + (100% - 26px) * ' + (i / (n - 1)) + ')'; rail.appendChild(b); });

    var call = el('div', 'bl-call', { 'aria-hidden': 'true' }), callIn = el('div', 'bl-call-in'), cN = el('b', 'bl-call-n'), cT = el('p', 'bl-call-t'), cF = el('span', 'bl-call-f');
    callIn.appendChild(cN); callIn.appendChild(cT); callIn.appendChild(cF); call.appendChild(callIn);

    var chips = el('div', 'bl-chips', { role: 'group', 'aria-label': S.chips });
    var chipEls = items.map(function (it, i) {
      if (!it.li.id) it.li.id = 'bl-d' + (i + 1);
      var b = el('button', 'bl-chip', { type: 'button', 'aria-pressed': 'false', 'aria-describedby': it.li.id }); b.textContent = it.name;
      b.addEventListener('focus', function () { if (ready && b.matches(':focus-visible')) go(i, 190); });
      b.addEventListener('click', function () { go(i, 190); });
      chips.appendChild(b); return b;
    });
    fig.appendChild(rail); fig.appendChild(call); fig.appendChild(chips);
    [].forEach.call(list.querySelectorAll('a'), function (a) { a.setAttribute('tabindex', '-1'); });
    var plain = sec.querySelector('[data-bl-plain]'), lead = sec.querySelector('[data-bl-lead]'), goldNote = sec.querySelector('[data-bl-gold]');
    if (plain && lead) { plain.hidden = true; lead.hidden = false; }
    if (goldNote) goldNote.hidden = false; /* the sentence about the gold lines is shown only where the gold lines are */
    sec.classList.add('bl-on');

    /* ---- state ---- */
    var W = 0, H = 0, D = 120, M = 1.6, R = 55, cov = 34, loX = 60, hiX = 60, wide = false, ready = false, seen = false, loaded = false;
    var px = 0, py = 0, tx = 0, ty = 0, tau = 170, raf = 0, last = 0, active = -2, drag = null, rect = null, callW = 0, away = 0;

    function measure() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      var first = !W; var fx = W ? px / W : items[0].x, fy = H ? py / H : items[0].y, gx = W ? tx / W : fx, gy = H ? ty / H : fy;
      W = w; H = h;
      wide = W >= 600 && mm('(hover: hover) and (pointer: fine)');
      sec.classList.toggle('bl-wide', wide);
      D = Math.round(clamp(W * 0.165, W < 500 ? 88 : 112, 188)); M = W < 500 ? 2 : W < 700 ? 1.6 : 1.3;   var rim = D >= 160 ? 7 : 5; R = D / 2 - rim + 1;   // a phone's strip is short: a smaller glass that magnifies more, so it hides less of the painting and shows its detail larger
      /* cov: how far the glass sees from its centre, in painting pixels. The glass centre keeps at least that far from
         every edge, so it never shows anything outside the painting. The lens may lean past the painting by the rest of
         its radius: always above and below (the page keeps that room), and to the sides only as far as the screen has room. */
      cov = R / M; var sr = stage.getBoundingClientRect(), vw = root.clientWidth;
      loX = Math.max(cov, D / 2 - Math.max(0, sr.left - 6)); hiX = W - Math.max(cov, D / 2 - Math.max(0, vw - sr.right - 6));
      sec.style.setProperty('--bl-d', D + 'px'); sec.style.setProperty('--bl-rim', rim + 'px');
      paint.style.width = gold.style.width = W * M + 'px'; paint.style.height = gold.style.height = H * M + 'px';
      px = fx * W; py = fy * H; tx = gx * W; ty = gy * H;
      /* keep the callout's room fixed, so nothing below it moves as the lens travels */
      var max = 0; call.style.minHeight = ''; call.style.transform = ''; call.classList.remove('is-hint');
      items.forEach(function (it) { cN.textContent = it.name; cT.textContent = it.text; cF.textContent = it.from; max = Math.max(max, callIn.offsetHeight); });
      call.style.minHeight = max + 'px'; callW = call.offsetWidth;
      var a = active; active = -2; setActive(a < -1 ? -1 : a, true);
      if (first) { px = tx = W * 0.5; py = ty = H * 0.5; }
      draw();
    }

    /* where the lens sits (c) and what its glass is centred on (q) for a pointer at px, py. They are the same point
       wherever the lens has room; only at the left and right edge of a phone does the lens stay on the screen while
       the glass looks up to a quarter of its width further out. */
    function cX() { return clamp(px, loX, hiX); }
    function cY() { return clamp(py, cov, H - cov); }
    function dist(i, x, y) { var it = items[i]; return Math.min(Math.hypot(x - it.x * W, y - it.y * H), Math.hypot(x - it.dx * W, y - it.dy * H)); }
    function near(x, y) {
      var best = -1, bd = 1e9;
      for (var i = 0; i < n; i++) { var d = dist(i, x, y), rr = Math.max(items[i].r * W, 20); if (d < rr && d < bd) { bd = d; best = i; } }
      return best;
    }

    function place() { /* on a wide screen the callout keeps under the lens, inside the painting's width */
      if (!wide) return;
      call.style.transform = 'translate3d(' + Math.round(clamp(cX() - D / 2, 0, W - callW)) + 'px,0,0)';
    }

    function setActive(i, quiet) {
      if (i === active) return; active = i;
      for (var k = 0; k < n; k++) { chipEls[k].setAttribute('aria-pressed', k === i ? 'true' : 'false'); dots[k].classList.toggle('is-on', k === i); }
      if (i >= 0) {
        var it = items[i]; clearTimeout(away); cN.textContent = it.name; cT.textContent = it.text; cF.textContent = it.from; call.classList.remove('is-hint', 'is-away');
        if (!quiet) { call.classList.remove('is-new'); void call.offsetWidth; call.classList.add('is-new'); }
        range.setAttribute('aria-valuetext', it.name);
        if (!drag || drag.kind !== 'rail') range.value = String(Math.round(i / (n - 1) * 1000));
      } else {
        range.setAttribute('aria-valuetext', S.between);
        /* passing between two details: the last line dims and stays; only a lens left resting away from every mark gets the hint */
        call.classList.add('is-away'); clearTimeout(away);
        var hint = function () { if (active >= 0) return; cN.textContent = ''; cF.textContent = ''; cT.textContent = S.hint; call.classList.remove('is-away'); call.classList.add('is-hint'); call.classList.remove('is-new'); void call.offsetWidth; call.classList.add('is-new'); };
        if (quiet || !cN.textContent) { hint(); call.classList.remove('is-new'); } else away = setTimeout(hint, 900);
      }
    }

    function draw() {
      var cx = cX(), cy = cY(), qx = clamp(px, cov, W - cov);
      lens.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      var t = 'translate3d(' + (R - qx * M).toFixed(1) + 'px,' + (R - cy * M).toFixed(1) + 'px,0)';
      gold.style.transform = t; if (paint.parentNode) paint.style.transform = t;
      place();
    }

    function frame(now) {
      var dt = Math.min(48, now - (last || now - 16)); last = now;
      var k = 1 - Math.exp(-dt / tau), dx = tx - px, dy = ty - py;
      if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) { px = tx; py = ty; raf = 0; last = 0; } else { px += dx * k; py += dy * k; raf = requestAnimationFrame(frame); }
      draw(); setActive(near(px, py));
    }
    function run() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function aim(x, y, t) { tx = clamp(x, 0, W); ty = clamp(y, 0, H); tau = t; run(); }
    function go(i, t) { if (!W) return; aim(items[i].x * W, items[i].y * H, t || 190); }
    function settle() { var i = near(tx, ty); if (i >= 0) go(i, 170); }

    /* ---- pointer: a mouse drags from anywhere on the painting; a finger drags the lens, or taps where it should go ---- */
    stage.addEventListener('pointerdown', function (e) {
      if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
      rect = stage.getBoundingClientRect(); var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var onLens = Math.hypot(x - cX(), y - cY()) <= D / 2;
      if (e.pointerType === 'touch' && !onLens) { drag = { kind: 'tap', id: e.pointerId, x: x, y: y }; return; }
      drag = { kind: 'lens', id: e.pointerId, ox: onLens ? x - px : 0, oy: onLens ? y - py : 0, x: x, y: y, still: onLens };
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      stage.classList.add('is-drag'); e.preventDefault();
      if (!onLens) aim(x, y, 110);
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (drag.kind === 'tap') { if (Math.hypot(x - drag.x, y - drag.y) > 10) drag = null; return; }
      if (drag.still) { if (Math.hypot(x - drag.x, y - drag.y) <= 10) return; drag.still = false; } /* a press that has not moved is still a tap */
      aim(x - drag.ox, y - drag.oy, 70);
    });
    var up = function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var d = drag; drag = null; stage.classList.remove('is-drag');
      if (e.type === 'pointercancel') return;
      if (d.kind === 'tap') { var i = near(d.x, d.y); if (i >= 0) go(i, 190); else aim(d.x, d.y, 190); }
      else if (d.still) { /* a tap on the lens itself: a neighbouring detail lying under the lens can still be reached */
        var best = -1, bd = 1e9; for (var k = 0; k < n; k++) { if (k === active) continue; var dd = dist(k, d.x, d.y); if (dd < Math.max(items[k].r * W, 48) && dd < bd) { bd = dd; best = k; } }
        if (best >= 0) go(best, 190); else settle();
      } else settle();
    };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* ---- the rail: the lens rides a path through the details, in order; let go and it settles on the nearest ---- */
    var along = function (v) { var s = clamp(v / 1000, 0, 1) * (n - 1), i = Math.min(n - 2, Math.floor(s)), f = s - i, a = items[i], b = items[i + 1]; f = f * f * (3 - 2 * f); return [(a.x + (b.x - a.x) * f) * W, (a.y + (b.y - a.y) * f) * H]; };
    range.addEventListener('input', function () { if (!ready) return; drag = { kind: 'rail', id: -1 }; var p = along(+range.value); aim(p[0], p[1], 90); });
    var railEnd = function () { if (drag && drag.kind === 'rail') drag = null; if (!ready) return; var i = Math.round(+range.value / 1000 * (n - 1)); range.value = String(Math.round(i / (n - 1) * 1000)); go(i, 190); };
    range.addEventListener('change', railEnd);
    range.addEventListener('keydown', function (e) {
      var step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'Home' ? -n : e.key === 'End' ? n : 0; if (!step || !ready) return;
      e.preventDefault(); var i = clamp(Math.round(+range.value / 1000 * (n - 1)) + step, 0, n - 1); range.value = String(Math.round(i / (n - 1) * 1000)); go(i, 190);
    });

    /* ---- arrive: fetch the line art as the painting nears, then lay the lens down on the first detail ---- */
    function arrive() {
      if (ready || !seen || !loaded) return;
      if (!pic.complete) { pic.addEventListener('load', arrive, { once: true }); return; } /* never a lens on an unpainted stage */
      ready = true;
      measure(); sec.classList.add('bl-in'); go(0, 320);
      setTimeout(function () { if (paint.parentNode) paint.parentNode.removeChild(paint); }, 1700);
    }
    var far = new IntersectionObserver(function (es) {
      if (!es.some(function (x) { return x.isIntersecting; })) return; far.disconnect();
      gold.addEventListener('load', function () { var done = function () { loaded = true; arrive(); }; if (gold.decode) gold.decode().then(done, done); else done(); });
      gold.addEventListener('error', function () { /* no line art: give the plain list back */
        sec.classList.remove('bl-on', 'bl-in', 'bl-wide'); [lens, rail, call, chips].concat(dots).forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
        [].forEach.call(list.querySelectorAll('a'), function (a) { a.removeAttribute('tabindex'); }); if (plain && lead) { plain.hidden = false; lead.hidden = true; } if (goldNote) goldNote.hidden = true;
      });
      /* a wide or dense screen draws the lens from more pixels than the 1600 px drawing has: give it the 2400 px one */
      var big = sec.getAttribute('data-edge-2x'); gold.src = big && W * M * (window.devicePixelRatio || 1) > 1900 ? big : edge; paint.src = pic.currentSrc || pic.src;
    }, { rootMargin: '900px 0px' });
    far.observe(stage);
    var nearIO = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { seen = true; nearIO.disconnect(); arrive(); } }, { threshold: 0.35 });
    nearIO.observe(stage);

    var fit = 0, refit = function () { fit = 0; if (stage.clientWidth === W && stage.clientHeight === H) return; measure(); if (ready && active >= 0) { px = tx = items[active].x * W; py = ty = items[active].y * H; draw(); } };
    var later = function () { if (!fit) fit = requestAnimationFrame(refit); }; /* a frame later, so the observer never re-enters its own layout */
    if ('ResizeObserver' in window) new ResizeObserver(later).observe(stage); else window.addEventListener('resize', later);
    measure();
  }

  [].forEach.call(secs, init);
})();
