/* Spiritual [return]: what a reader finds on coming back. Loaded with `defer` on every page, before site.js (which asks it for today's story).
   - today's story: one a day, the same for everyone, walking the library in the order the stories were first published (so a newly
     published story joins the end of the round and never moves today's); a story this reader finished on an earlier day is stepped past
   - the home opening's "Today's story" line (only for a reader who has been here before or has a place), "Now showing" that knows the
     first story is read, and "N new stories since your last visit"
   - Your reading: a shelf of the stories read, as their paintings (no totals), and the paths under way
   - a story's end: the painted next door steps past a story already read; a finished story's opening says so and points onward
   - a person's path: the stops read say "Read" in words, the next one is pointed to
   - the menu's "Add to home screen" row: only when asked, never by itself
   Everything is read from what the site already keeps on this device (spritual:places, spritual:last). One record is added,
   spritual:visit = { at, prev, base, seen }: when this visit and the one before began, and which stories were on the shelf then, so
   "new" means new to this reader. Nothing is sent anywhere. Storage that throws (a private window) simply shows a first visit.
   No streaks, no counts of days, no "you have N left": a place is a bookmark and a shelf is a keepsake. */
(function () {
  var d = document, de = d.documentElement, UI = {};
  try { UI = JSON.parse(d.getElementById('ui').textContent) || {}; } catch (e) {}
  var IDX = UI.stories || {}, KEYS = Object.keys(IDX), hi = UI.lang === 'hi';
  // a title read from the index is set as the page sets it (Rama's -> Rama’s), once
  KEYS.forEach(function (k) { if (IDX[k] && IDX[k].t) IDX[k].t = String(IDX[k].t).replace(/([^\s'])'/g, '$1\u2019'); });
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var fmt = function (s, o) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); };
  var nb = function (x) { return String(x).replace(/ (\S+)$/, ' $1'); };   // no stranded last word
  var el = function (tag, cls, text) { var e = d.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var get = function (k, f) { try { var v = localStorage.getItem('spritual:' + k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } };
  var set = function (k, v) { try { localStorage.setItem('spritual:' + k, JSON.stringify(v)); } catch (e) {} };
  // the places the site keeps (site.js writes them; the older single place is read the same way joyb.js carries it over)
  var places = function () {
    var p = get('places', null); if (p && typeof p === 'object') return p;
    var o = get('last', null); p = {}; if (o && o.slug) p[o.slug] = { s: +o.scene || 1, t: +o.total || 1, d: +o.scene >= +o.total ? 1 : 0, at: o.at || 0 }; return p;
  };
  var done = function (pl, k) { return !!(pl[k] && pl[k].d); };
  var dayNo = function (t) { var x = t == null ? new Date() : new Date(t); return Math.floor((x - x.getTimezoneOffset() * 6e4) / 864e5); };

  /* ---------- today's story ---------- */
  // The round: stories in the order they were first published (the build writes each one's day, d; the library's own order breaks a tie).
  // Day by day the round moves one story on; when it reaches the end of what is published it starts again. A story joins the round the
  // day after it was first published and lengthens the round it joins, so publishing never changes the story of the day it happens on.
  var roundOf = function (idx) {
    var ks = Object.keys(idx), dated = ks.length > 0 && ks.every(function (k) { return idx[k].d > 0; });
    var o = ks.map(function (k, i) { return [dated ? idx[k].d : 0, i, k]; }); if (dated) o.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return { o: o, dated: dated };
  };
  var memo = {};
  var at = function (day, idx) {
    if (!idx && memo[day]) return memo[day];
    var q = roundOf(idx || IDX), o = q.o, n = o.length, out; if (!n) return null;
    if (!q.dated) out = o[((day % n) + n) % n][2];   // a build with no history: the plain rotation
    else if (day <= o[0][0]) out = o[0][2];
    else { var s = o[0][0], c = 0; for (var t = s; t <= day; t++) { while (c < n && o[c][0] < t) c++; if (t - s >= c) s = t; if (t === day) out = o[t - s][2]; } }
    if (!idx) memo[day] = out; return out;
  };
  // For this reader: the day's story, unless it was finished on an earlier day; then the next one in the round that was not. A story
  // finished today stays today's (read: true), so the day has one story and it does not turn into a treadmill.
  var today = function () {
    var day = dayNo(), s0 = at(day); if (!s0) return null;
    var pl = places(), o = roundOf(IDX).o.map(function (x) { return x[2]; }), i = o.indexOf(s0), n = o.length;
    for (var j = 0; j < n; j++) { var k = o[(i + j) % n]; if (!done(pl, k)) return { slug: k, read: false }; if (dayNo(pl[k].at) === day) return { slug: k, read: true }; }
    return { slug: s0, read: true };   // everything is read: the day's own
  };
  // "Up next" after a story: the one that follows it (the index's own order, x), stepping past stories already finished
  var next = function (slug) {
    var first = IDX[slug] && IDX[slug].x, pl = places(), k = first, n = 0;
    while (k && IDX[k] && done(pl, k) && n++ < KEYS.length) k = IDX[k].x;
    return k && IDX[k] && !done(pl, k) ? k : first || null;
  };

  /* ---------- this visit and the one before ---------- */
  var GAP = 216e5 /* six hours apart is another visit */, NEW = {}, back = false;
  (function () {
    if (!KEYS.length) return;
    var v = get('visit', null), now = Date.now(), had = v && typeof v === 'object' && v.at > 0;
    if (!had) v = { at: now, prev: 0, base: null, seen: KEYS };   // a first visit: nothing is new
    else if (now - v.at > GAP || now < v.at) v = { at: now, prev: v.at, base: Array.isArray(v.seen) ? v.seen : null, seen: KEYS };
    else { var seen = Array.isArray(v.seen) ? v.seen : [], add = KEYS.filter(function (k) { return seen.indexOf(k) < 0; }); if (!add.length) v = null; else v.seen = seen.concat(add); }
    if (v) set('visit', v);
    v = v || get('visit', null) || {};
    if (Array.isArray(v.base)) KEYS.forEach(function (k) { if (v.base.indexOf(k) < 0) NEW[k] = 1; });
    back = !!(had && v.prev) || Object.keys(places()).length > 0;
  })();
  var news = function () { return KEYS.filter(function (k) { return NEW[k]; }); };

  window.SpritualReturn = { day: dayNo, at: at, today: today, next: next, isNew: function (k) { return !!NEW[k]; } };

  /* ---------- shared pieces ---------- */
  // a painting with its title beneath, linking to the story (the shelf of stories read; what is new in the library)
  var tile = function (k, i) {
    var s = IDX[k], li = el('li'), a = el('a', 'rt-tile'), pic = el('span', 'rt-tile-pic'); a.href = s.h; pic.setAttribute('aria-hidden', 'true');
    if (s.p) { var im = d.createElement('img'); im.alt = ''; im.width = 480; im.height = 270; im.decoding = 'async'; im.loading = i > 5 ? 'lazy' : 'eager'; im.src = s.p; pic.appendChild(im); }
    a.appendChild(pic); a.appendChild(el('span', 'rt-tile-t', nb(s.t))); li.appendChild(a); return li;
  };
  // on a path: the stop to read next is the first unread one after the furthest stop read (else the first unread)
  var nextStop = function (stops, pl) {
    var far = -1, i; for (i = 0; i < stops.length; i++) if (done(pl, stops[i])) far = i;
    for (i = far + 1; i < stops.length; i++) if (!done(pl, stops[i])) return stops[i];
    for (i = 0; i < stops.length; i++) if (!done(pl, stops[i])) return stops[i];
    return null;
  };

  /* ---------- the home opening ---------- */
  function home() {
    var a = $('[data-rt-today]'); if (!a) return;
    var pick = back ? today() : null, s = pick && IDX[pick.slug];
    if (s) {
      a.href = s.h; $('[data-rt-today-t]', a).textContent = s.t;
      $('[data-rt-chip="read"]', a).hidden = !pick.read; $('[data-rt-chip="new"]', a).hidden = pick.read || !NEW[pick.slug];
      a.hidden = false; de.classList.add('rt-back');
    } else de.classList.remove('rt-back');   // boot.js kept room for a line that will not come
    var nl = $('[data-rt-newline]'), n = news().length;
    if (nl && s && n) { $('[data-rt-newline-t]', nl).textContent = n === 1 ? UI.rtNewLine1 : fmt(UI.rtNewLine, { n: n }); nl.hidden = false; de.classList.add('rt-news'); } else de.classList.remove('rt-news');
    // "Now showing" is the first story: once it is read it says so, and offers today's beside it
    var nf = $('[data-rt-now-first]'), nt = $('[data-rt-now-today]');
    if (nf && done(places(), nf.dataset.slug)) {
      nf.textContent = UI.rtAgain;
      if (nt && s && !pick.read && pick.slug !== nf.dataset.slug) { nt.href = s.h; $('[data-rt-now-t]', nt).textContent = s.t; nt.hidden = false; }
    }
  }

  /* ---------- the daily page says which day it is ---------- */
  function daily() {
    var p = $('[data-rt-date]'); if (!p) return;
    try { p.textContent = new Date().toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' }); p.hidden = false; } catch (e) {}
  }

  /* ---------- "New" on the cards, and the library's list of what is new ---------- */
  function fresh() {
    var list = news(); if (!list.length) return;
    var chip = function () { $$('.card[data-slug]').forEach(function (c) { var art = $('.card-art', c); if (!art || !NEW[c.dataset.slug] || $('.rt-chip', art)) return; art.appendChild(el('span', 'rt-chip rt-chip--new rt-chip--card', UI.rtNew)); }); };
    chip();
    // cards that are put in later (today's story, saved stories) get theirs too
    if ($('[data-today], [data-saved-grid], [data-more]') && 'MutationObserver' in window) { var q = 0; new MutationObserver(function () { if (!q) q = requestAnimationFrame(function () { q = 0; chip(); }); }).observe($('main') || d.body, { childList: true, subtree: true }); }
    var sec = $('[data-rt-newlist]'); if (!sec) return;
    var ul = $('ul', sec); list.forEach(function (k, i) { ul.appendChild(tile(k, i)); }); sec.hidden = false;
    if (location.hash === '#new') { sec.scrollIntoView({ block: 'start' }); try { sec.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------- Your reading: the shelf of stories read, the paths under way ---------- */
  function mine() {
    var sec = $('[data-myr="done"]'), secP = $('[data-myr="paths"]'); if (!sec) return;
    var ul = $('ul', sec), more = $('[data-rt-more]', sec), main = $('main');
    var render = function () {
      var pl = places(), read = Object.keys(pl).filter(function (k) { return IDX[k] && done(pl, k); }).sort(function (x, y) { return (pl[y].at || 0) - (pl[x].at || 0); });
      while (ul.firstChild) ul.removeChild(ul.firstChild);
      read.forEach(function (k, i) { var li = tile(k, i); if (i >= 8) li.hidden = true; ul.appendChild(li); });
      sec.hidden = !read.length; if (more) more.hidden = read.length <= 8; if (main) main.classList.toggle('myr-has-done', read.length > 0);
      if (!secP) return;
      // a path counts as under way once two of its stops are read (one story alone sits on several people's paths); the furthest along first, three at most
      var ol = $('ol', secP), rows = 0; while (ol.firstChild) ol.removeChild(ol.firstChild);
      (UI.rtPaths || []).map(function (p) { var stops = (p.s || []).filter(function (k) { return IDX[k]; }); return { p: p, stops: stops, n: stops.filter(function (k) { return done(pl, k); }).length }; })
      .filter(function (x) { return x.n >= 2; }).sort(function (x, y) { return y.n - x.n; }).slice(0, 3).forEach(function (x) {
        var p = x.p, k = nextStop(x.stops, pl);
        if (!k) return;   // walked to its end
        var s = IDX[k], li = el('li'), a = el('a', 'myr-item'), pic = el('span', 'myr-pic'), tx = el('span', 'myr-txt'); a.href = s.h; pic.setAttribute('aria-hidden', 'true');
        if (s.p) { var im = d.createElement('img'); im.alt = ''; im.width = 96; im.height = 96; im.decoding = 'async'; im.loading = 'lazy'; im.src = s.p; pic.appendChild(im); }
        tx.appendChild(el('strong', '', nb(s.t))); tx.appendChild(el('span', 'myr-sub', fmt(UI.rtPathOf, { name: p.n })));
        li.style.setProperty('--i', Math.min(rows++, 8)); a.appendChild(pic); a.appendChild(tx); li.appendChild(a); ol.appendChild(li);
      });
      secP.hidden = !rows;
    };
    render();
    if (more) more.addEventListener('click', function () { var hid = $$('li[hidden]', ul); hid.forEach(function (li) { li.hidden = false; }); more.hidden = true; if (hid[0]) $('a', hid[0]).focus(); });
    // "Forget my place" (joyb.js) and "Erase everything" (site.js) take the places away: the shelf goes with them, at once
    d.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-pl-forget] button')) setTimeout(render, 0); });
    d.addEventListener('spritual:erase', function () { setTimeout(render, 0); });
  }

  /* ---------- a story page: the finished story's opening, and the painted next door ---------- */
  function story() {
    var reader = $('[data-reader]'); if (!reader) return;
    var slug = reader.dataset.slug, pl = places(), btns = $('.cx-film-btns'), prim = btns && $('a[href="#page-1"]', btns);
    if (de.classList.contains('rt-read')) {
      var k = done(pl, slug) && prim && !/^#page-/.test(location.hash) ? next(slug) : null, s = k && k !== slug && IDX[k];
      if (s) {
        var lab = prim.firstElementChild ? $('span', prim) : prim; if (lab) lab.textContent = UI.rtAgain;
        var p = el('p', 'pk rt-pk'), go = el('a'); p.appendChild(el('span', 'rt-pk-t', UI.rtReadThis)); go.href = s.h; go.appendChild(el('b', '', fmt(UI.rtNextIs, { title: s.t }))); p.appendChild(go);
        btns.parentNode.insertBefore(p, btns.nextSibling); de.classList.add('rt-read-in');
        requestAnimationFrame(function () { p.classList.add('is-on'); });
      } else de.classList.remove('rt-read');   // boot.js kept room for a line that will not come
    }
    // the next door offers a story this reader has already finished: it becomes the next one they have not (same order, stepped on)
    var door = $('.cb-door--next[data-slug]');
    if (door && done(pl, door.dataset.slug)) {
      var k2 = next(slug), s2 = k2 && k2 !== slug && k2 !== door.dataset.slug && !done(pl, k2) && IDX[k2];
      if (s2) {
        door.href = s2.h; door.dataset.slug = k2; door.setAttribute('data-rt-swapped', '');
        var dn = $('.cb-dn', door), im = $('.cb-dp img', door); if (dn) dn.textContent = s2.t;
        if (im) { if (s2.p) im.src = s2.p; else im.parentNode.hidden = true; }
        $$('.cb-ds, .cb-dm, .cb-dsum', door).forEach(function (x) { x.hidden = true; });   // (they described the other story)
        $$('.cb-door--path').forEach(function (x) { if (x.getAttribute('href') === door.getAttribute('href')) x.hidden = true; });   // never the same story on two doors
      }
    }
  }

  /* ---------- a person's page: the path remembers ---------- */
  function path() {
    var sec = $('[data-path]'); if (!sec) return;
    var pl = places(), mark = function (li, cls, text) { if ($('.rt-cap', li)) return; li.classList.add(cls); var pic = $('.path-pic', li); if (pic) pic.appendChild(el('span', 'rt-cap', text)); };
    $$('.path-stop[data-slug]', sec).forEach(function (li) { if (done(pl, li.dataset.slug)) mark(li, 'is-read', UI.rtRead); });
    var main = $$('.path-list:not(.path-list--else) > .path-stop[data-slug]', sec), stops = main.map(function (li) { return li.dataset.slug; });
    var n = stops.filter(function (k) { return done(pl, k); }).length, k = n ? nextStop(stops, pl) : null; if (!k) return;
    var li = main[stops.indexOf(k)]; mark(li, 'is-next', UI.rtNextStop);
    // if the next stop is not in view the rail (only the rail: the page does not move) is brought to rest on it, where a swipe would leave it (the rail snaps to a stop's start)
    var go = function () { var r = $('.path-rail', sec); if (!r) return; var x = li.offsetLeft - r.scrollLeft; if (x < 0 || x + li.offsetWidth > r.clientWidth) r.scrollLeft = Math.max(0, li.offsetLeft - main[0].offsetLeft); };
    go(); addEventListener('load', go);
    var cta = $('.cast-begin[data-rt-cta]'), s = IDX[k];
    if (cta && s) { var t = fmt(UI.rtPathGo, { name: cta.getAttribute('data-rt-cta') }), sp = $('span', cta); if (sp) sp.textContent = t; cta.href = s.h; cta.setAttribute('aria-label', t + ': ' + s.t); }
  }

  /* ---------- the menu: "Add to home screen", only when the reader asks ---------- */
  function install() {
    var box = $('[data-rt-install]'); if (!box) return;
    var btn = $('button', box), how = $('[data-rt-install-how]', box), ua = navigator.userAgent || '';
    var alone = function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; };
    // iPhone Safari has "Add to Home Screen" under Share; in-app browsers and the other iOS browsers are not promised anything (the same test as keep.js)
    var apple = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA|Snapchat|MicroMessenger/i.test(ua), ios = apple && !inApp && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    var touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) && !apple && !inApp;
    var show = function () { box.hidden = alone() || !(window.SpritualInstall || ios || touch || !how.hidden); };
    var tell = function (text) { how.textContent = text; how.hidden = false; btn.setAttribute('aria-expanded', 'true'); };
    show(); addEventListener('beforeinstallprompt', function () { setTimeout(show, 0); }); addEventListener('appinstalled', function () { setTimeout(show, 0); });
    btn.addEventListener('click', function () {
      var ev = window.SpritualInstall;
      if (ev && ev.prompt) {
        window.SpritualInstall = null; de.classList.remove('can-install');   // a browser's offer can be used once
        // (an offer already spent elsewhere on the page, by the card at a story's end, cannot be asked again: the plain instructions instead)
        try { var ask = ev.prompt(); Promise.resolve(ask).then(function () { return ev.userChoice; }).then(function (r) { if (r && r.outcome === 'accepted') tell(how.dataset.done); }, function () { tell(how.dataset.any); }); return; } catch (e) {}
      }
      if (how.hidden) tell(ios ? how.dataset.ios : how.dataset.any); else { how.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  // (one part failing never stops the others; the error is still reported, a moment later)
  var run = function () { [home, daily, fresh, mine, story, path, install].forEach(function (f) { try { f(); } catch (e) { setTimeout(function () { throw e; }, 0); } }); };
  if (d.readyState === 'loading' || d.readyState === 'interactive') d.addEventListener('DOMContentLoaded', run); else run();
})();
