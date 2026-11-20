// Spritual epic layer (styles: epic.css). Progressive enhancement only: it reads what the page already says and adds light
// and motion around it. Three jobs: a person's own page (their light, for a person painted in a scene, and a legend's
// atmosphere and depth), the small living touches where the leads stand elsewhere (the cast row drifts, the wordmark
// catches the light), and arrivals for everything the cinema layer left still. Who is a legend or a lead, their light and
// their atmosphere are the page's own (content/cast.json, written into the page by src/build.mjs): only what each kind of
// atmosphere looks like is kept here (AIR). The entrance itself is CSS from the first paint; nothing here moves a word.
// External and dependency-free, so the site's strict CSP (script-src 'self') allows it.
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduced = function () { return root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var lowData = !!(navigator.connection && navigator.connection.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches;
  // Save-Data: every page is still (epic.css stops the entrances; nothing below starts)
  if (lowData) root.classList.add('ep-lite');
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------- 1. A person's own page ----------
     main[data-tier] says how much this person carries in the stories, data-air a legend's atmosphere, --ep-a their light. */
  // Each atmosphere: c colours ("r g b"), n motes on a wide screen (half that on a phone), s size and a strength ranges,
  // t seconds per flight, how they travel (up, down or across; dx and dy as shares of the stage), y where they start
  // (share of the stage's height), sw their sway in px, r a petal's turn in degrees, g glints that only brighten and fade.
  var AIR = {
    dawn: { c: ['255 226 170', '255 240 212'], n: 14, s: [5, 9], a: [.35, .6], t: [16, 24], y: [.35, 1], dy: [-.45, -.25], dx: [-.04, .04], sw: 18 },
    petals: { c: ['246 178 150', '250 206 172', '238 156 138'], n: 9, s: [7, 10], a: [.45, .65], t: [18, 26], y: [-.04, .4], dy: [.3, .5], dx: [-.12, .04], sw: 30, r: 260, petal: 1 },
    sparks: { c: ['255 178 90', '255 212 140'], n: 14, s: [5, 8], a: [.5, .8], t: [10, 15], y: [.5, 1], dy: [-.45, -.25], dx: [-.03, .05], sw: 14 },
    // (Ravana: the lamps of a scholar's hall, not fire: warm motes that hardly move, and a few gold glints)
    lamps: { c: ['255 214 150', '255 228 182'], n: 10, s: [4, 7], a: [.3, .55], t: [16, 24], y: [.4, .95], dy: [-.035, -.01], dx: [-.012, .012], sw: 5, g: ['255 217 138', 4] },
    motes: { c: ['156 200 255', '255 217 138'], n: 13, s: [5, 9], a: [.35, .55], t: [18, 26], y: [.2, .9], dy: [-.05, .05], dx: [.12, .22], sw: 12 },
    snow: { c: ['232 240 255', '212 226 255'], n: 14, s: [5, 8], a: [.4, .65], t: [18, 26], y: [-.04, .45], dy: [.3, .5], dx: [-.06, .03], sw: 22 },
    gold: { c: ['255 196 106', '255 226 160'], n: 14, s: [4, 8], a: [.45, .7], t: [11, 16], y: [.45, 1], dy: [-.4, -.22], dx: [-.03, .04], sw: 12 },
    field: { c: ['233 211 168', '214 190 150'], n: 12, s: [4, 8], a: [.3, .5], t: [16, 24], y: [.6, .98], dy: [-.06, 0], dx: [.15, .3], sw: 8 },
    sun: { c: ['255 213 106', '255 236 180'], n: 13, s: [5, 9], a: [.35, .6], t: [18, 26], y: [-.04, .5], dy: [.2, .35], dx: [-.08, .02], sw: 10 },
    wind: { c: ['227 192 142', '240 214 170'], n: 14, s: [4, 7], a: [.3, .5], t: [9, 13], y: [.15, .95], dy: [-.04, .04], dx: [.35, .55], sw: 6 }
  };
  var hero = $('.cast-hero'), main = hero && hero.closest('main'), tier = main ? main.dataset.tier : '';
  if (hero && (tier === 'legend' || tier === 'lead') && !lowData && !reduced()) {
    var stage = $('.cast-stage', hero), focus = $('.cast-focus', hero), scene = hero.classList.contains('cast-hero--scene');
    // their light: a drawn figure has it already (.cast-aura); a person painted in a scene has it laid in the box they stand in
    if (scene && focus) { var bl = d.createElement('i'); bl.className = 'ep-bloom'; bl.setAttribute('aria-hidden', 'true'); focus.appendChild(bl); }
    var kind = tier === 'legend' && AIR[main.dataset.air];
    if (kind && stage) {
      // a small repeatable generator, seeded by the person: their air falls the same way on every visit
      var seed = 7; (main.dataset.char || '').split('').forEach(function (ch) { seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; });
      var rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      var r = function (a) { return a[0] + rnd() * (a[1] - a[0]); };
      var air = d.createElement('div'); air.className = 'ep-air'; air.setAttribute('aria-hidden', 'true');
      // behind a drawn figure (between it and its world); over a painting, under the calm side's veil
      stage.insertBefore(air, stage.firstElementChild ? stage.firstElementChild.nextSibling : null);
      var lay = function () {
        var S = stage.getBoundingClientRect(), W = S.width, H = S.height; if (!W || !H) return;
        // every face is kept clear: the head of the figure (a drawn figure's top, or the face a painting is framed on), with room round it
        var faces = [], fr = focus && focus.getBoundingClientRect();
        if (fr && fr.width) {
          if (scene) { var hd = fr.width / 3.4; faces.push([fr.left - S.left + fr.width / 2, fr.top - S.top + hd * .9, hd * .85, hd * 1.05]); }
          else faces.push([fr.left - S.left + fr.width / 2, fr.top - S.top + fr.height * .13, Math.max(fr.width * .32, 60), fr.height * .16]);
        }
        var clear = function (x, y, pad) { return faces.every(function (f) { var u = (x - f[0]) / (f[2] + pad), v = (y - f[1]) / (f[3] + pad); return u * u + v * v > 1; }); };
        // they keep to the figure's side of the stage (the words are on the other, behind their veil); on a phone, everywhere
        var side = hero.dataset.side === 'l' ? -1 : 1, x0 = W < 700 ? 0 : side > 0 ? W * .4 : 0, x1 = W < 700 ? W : side > 0 ? W : W * .6;
        var n = Math.round(kind.n * (W < 700 ? .55 : 1) * ((navigator.deviceMemory || 8) < 4 ? .6 : 1)), html = '';
        var one = function (glint) {
          for (var tries = 0; tries < 40; tries++) {
            var s = glint ? r([4, 6]) : r(kind.s), x = x0 + rnd() * (x1 - x0), y = (glint ? r([.25, .85]) : r(kind.y)) * H;
            var dx = glint ? 0 : r(kind.dx) * W * (kind.dx[0] >= .1 ? side * -1 : 1), dy = glint ? 0 : r(kind.dy) * H, sw = glint ? 0 : (rnd() - .5) * 2 * kind.sw;
            var ok = true; for (var k = 0; k <= 8 && ok; k++) { var q = k / 8; ok = clear(x + dx * q + sw * Math.sin(q * Math.PI), y + dy * q, s + 24); }
            if (!ok) continue;
            var c = glint ? kind.g[0] : kind.c[Math.floor(rnd() * kind.c.length)], t = glint ? r([6, 10]) : r(kind.t);
            html += '<i' + (kind.petal && !glint ? ' class="ep-petal"' : glint ? ' class="ep-glint"' : '') + ' style="--x:' + x.toFixed(0) + 'px;--y:' + y.toFixed(0) + 'px;--s:' + s.toFixed(1) + 'px;--c:' + c +
              ';--a:' + (glint ? r([.3, .5]) : r(kind.a)).toFixed(2) + ';--t:' + t.toFixed(1) + 's;--dl:' + (-rnd() * t).toFixed(1) + 's;--dx:' + dx.toFixed(0) + 'px;--dy:' + dy.toFixed(0) + 'px;--sw:' + sw.toFixed(0) + 'px;--r:' + (kind.r ? ((rnd() - .5) * 2 * kind.r).toFixed(0) : 0) + 'deg"></i>';
            return;
          }
        };
        for (var i = 0; i < n; i++) one(false);
        if (kind.g) for (var j = 0; j < kind.g[1]; j++) one(true);
        air.innerHTML = html;
      };
      lay();
      var was = innerWidth, layT = 0;
      addEventListener('resize', function () { if (innerWidth === was) return; was = innerWidth; clearTimeout(layT); layT = setTimeout(lay, 250); });
      // switched to reduced motion part-way: the air goes (epic.css hides it), and is not laid again
    }
    // out of sight, the air rests
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { hero.classList.toggle('ep-off', !es[0].isIntersecting); }).observe(hero);
    // a legend's figure and its world at two depths, a few pixels apart with the hand (mouse only)
    if (tier === 'legend' && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.classList.add('ep-near');
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      var tick = function () {
        cx += (tx - cx) * .06; cy += (ty - cy) * .06;
        hero.style.setProperty('--ep-px', cx.toFixed(3)); hero.style.setProperty('--ep-py', cy.toFixed(3));
        raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .003) ? requestAnimationFrame(tick) : 0;
      };
      hero.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || reduced()) return;
        var b = hero.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width - .5) * 2)); ty = Math.max(-1, Math.min(1, ((e.clientY - b.top) / Math.max(1, Math.min(b.height, innerHeight)) - .5) * 2));
        if (!raf) raf = requestAnimationFrame(tick);
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    }
  }

  /* ---------- 1b. The leads, wherever else they stand ----------
     The build marks them in every line-up (.ep-star with their light; .ep-legend for the legends): epic.css lights them, and nothing there moves. */
  var castRow = $('.cx-cast-row');
  if (castRow) { castRow.classList.add('ep-float'); $$(':scope > li', castRow).forEach(function (li, k) { li.style.setProperty('--ep-n', k % 5); }); }
  var wm = $('.cx-credits-name'); if (wm) wm.classList.add('ep-shine');

  /* ---------- 2. Arrivals: what the cinema layer left still comes in once, when it is reached, then stays put ---------- */
  // (none of it with Save-Data either: nothing waits faint, everything is simply there)
  if (reduced() || lowData || !('IntersectionObserver' in window)) return;
  var SETS = [
    // plain pages, festival rows, today's blocks, the credits, the home feature cards, empty states
    // (not the study dossier: it is closed until a reader opens it, and what a reader opens is simply there)
    ['', '.cx-plain-in > h1, .cx-plain-text > *, .cx-plain-in > .cx-btn, .cx-credits-line, .cx-credits-sub, .cx-credits-list > *, .cx-credits-in > .cx-credits-btns, .cx-manas-card > *, .block-head, .empty, .moment, main > .wrap > .note, .mx-src, .cx-stotra-sa, .legend, .kept, .story-intro, .mx-ep-n, .mx-ep-t, .mx-sum'],
    ['ep-rv--side', '.fest-list > li, .fest-item'],
    ['ep-rv--grow', '.cx-credits-name, .pause-card, .mx-shot, .cx-finale-card > *'],
    // reading text never slides: it only comes up to full strength as it is reached
    ['ep-rv--soft', '.scene-text, .mx-cp, .mx-doha, .mx-shloka, .mx-chhand, .mx-mean, .st-v']
  ];
  var all = [];
  SETS.forEach(function (set) {
    $$(set[1]).forEach(function (el) {
      if (all.length > 700 || el.classList.contains('th-rv') || el.classList.contains('ep-rv') || el.closest('.ep-hero')) return;
      el.classList.add('ep-rv'); if (set[0]) el.classList.add(set[0]); all.push(el);
    });
  });
  if (!all.length) return;
  var settle = function (el) { el.classList.remove('ep-rv', 'ep-in', 'ep-rv--side', 'ep-rv--grow', 'ep-rv--soft'); el.style.removeProperty('--ep-i'); };
  var io = new IntersectionObserver(function (es) {
    var now = es.filter(function (en) { return en.isIntersecting; }).map(function (en) { return en.target; });
    now.sort(function (a, b) { var p = a.getBoundingClientRect(), q = b.getBoundingClientRect(); return (p.top - q.top) || (p.left - q.left); });
    now.forEach(function (el, k) {
      io.unobserve(el); el.style.setProperty('--ep-i', Math.min(k, 7)); el.classList.add('ep-in');
      el.addEventListener('animationend', function (e) { if (e.target === el) settle(el); });
      setTimeout(function () { settle(el); }, 2800);
    });
  // (they start well before they are reached, half a screen below the fold, so a flick down the page lands on text
  // at full strength instead of text still coming up from faint)
  }, { rootMargin: '0px 0px 50% 0px', threshold: 0 });
  all.forEach(function (el) { io.observe(el); });
  // printing, or the reader switching motion off part-way: everything is simply there
  addEventListener('beforeprint', function () { all.forEach(settle); });
  new MutationObserver(function () { if (root.dataset.motion === 'reduce') { io.disconnect(); all.forEach(settle); } }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
})();
