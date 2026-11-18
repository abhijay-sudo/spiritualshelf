// Spritual epic layer (styles: epic.css). Progressive enhancement only: it reads what the page already says and adds light
// and motion around it. Three jobs: the leads' own pages (sparks, their name letter by letter, the lean toward the hand),
// the small living touches where the leads stand elsewhere (the cast row drifts, the wordmark catches the light), and
// arrivals for everything the cinema layer left still. Who is a lead, their light and their title are the page's own
// (content/cast.json and extras.json, written into the page by src/build.mjs): nothing about a person is kept here.
// External and dependency-free, so the site's strict CSP (script-src 'self') allows it.
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var hi = /^hi/i.test(root.lang || '') || /^\/hi(\/|$)/.test(location.pathname);
  var reduced = function () { return root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var lowData = !!(navigator.connection && navigator.connection.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------- 1. A lead's own page ----------
     The page is whole as built (the stage, the name, the title, the story so far: cast.css). main[data-tier] says how
     much this person carries in the stories ("legend", "lead" or "cast"), and --ep-a is their light. For the leads this
     adds what only a script can: sparks round them, the name as letters, the lean toward the hand. */
  var hero = $('.cast-hero'), main = hero && (hero.closest('main') || d.body), tier = main ? main.dataset.tier : '';
  if (hero && (tier === 'lead' || tier === 'legend')) {
    var pic = $('.cast-focus', hero), txt = $('.cast-hero-txt', hero);
    main.classList.add('ep-major');

    // sparks rising round them (not with reduce-motion or Save-Data)
    if (pic && !reduced() && !lowData) {
      var motes = d.createElement('div'); motes.className = 'ep-motes'; motes.setAttribute('aria-hidden', 'true');
      var n = innerWidth < 700 ? 10 : 18, html = '';
      for (var i = 0; i < n; i++) {
        var r = function (a, b) { return a + Math.random() * (b - a); };
        html += '<i style="--x:' + r(4, 96).toFixed(1) + '%;--b:' + r(0, 46).toFixed(1) + '%;--s:' + r(2, 4.5).toFixed(1) + 'px;--t:' + r(6, 13).toFixed(1) + 's;--dl:' + (-r(0, 13)).toFixed(1) + 's;--dx:' + r(-46, 46).toFixed(0) + 'px"></i>';
      }
      motes.innerHTML = html; pic.appendChild(motes);
    }

    // the name: each letter its own piece of gold (Devanagari is kept whole: its letters join). The letters set exactly
    // as wide as the whole name was measured (content/name-widths.json), so the name does not move when it is split.
    var name = $('.cast-name', hero), whole = name && $('.cast-name-t', name);
    if (whole) {
      var text = whole.textContent.trim(), plain = /^[\x20-\x7eÀ-ɏ]+$/.test(text);
      if (!name.hasAttribute('aria-label')) name.setAttribute('aria-label', text);
      name.removeChild(whole);
      if (plain && !hi) {
        Array.from(text).forEach(function (ch, k) {
          var s = d.createElement('span'); s.setAttribute('aria-hidden', 'true');
          if (ch === ' ') { s.textContent = ' '; } else { s.className = 'ep-l'; s.textContent = ch; s.style.setProperty('--i', k); }
          name.appendChild(s);
        });
      } else {
        var w = d.createElement('span'); w.className = 'ep-w'; w.setAttribute('aria-hidden', 'true'); w.textContent = text; name.appendChild(w);
      }
    }

    // everything beside the name arrives in order
    if (txt) { var k = 0; $$(':scope > *', txt).forEach(function (el) { if (el === name) return; el.classList.add('ep-k'); el.style.setProperty('--ep-k', k++); }); }

    hero.classList.add('ep-hero', 'ep-on');

    // a painted figure and the world behind it sit at two depths and lean with the hand (mouse only); at rest when out of sight
    var seen = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; hero.classList.toggle('ep-off', !seen); }).observe(hero);
    if (!reduced() && $('.cast-figure', hero) && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      var tick = function () {
        cx += (tx - cx) * .07; cy += (ty - cy) * .07;
        hero.style.setProperty('--ep-px', cx.toFixed(3)); hero.style.setProperty('--ep-py', cy.toFixed(3));
        raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .002) ? requestAnimationFrame(tick) : 0;
      };
      hero.addEventListener('pointermove', function (e) {
        if (!seen || reduced()) return;
        var b = hero.getBoundingClientRect();
        tx = ((e.clientX - b.left) / b.width - .5) * 2; ty = ((e.clientY - b.top) / Math.max(1, Math.min(b.height, innerHeight)) - .5) * 2;
        ty = Math.max(-1, Math.min(1, ty));
        if (!raf) raf = requestAnimationFrame(tick);
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    }
  }

  /* ---------- 1b. The leads, wherever else they stand ----------
     The build marks them in every line-up (.ep-star with their light; .ep-legend for the four): epic.css lights them. */
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
