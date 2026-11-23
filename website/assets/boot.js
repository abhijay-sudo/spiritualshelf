// Runs first, before the page paints: language, saved reading preferences, the motion switch, the service worker,
// and the second half of the poster-to-story transition. External (not inline) so a strict CSP (script-src 'self') allows it.
(function () {
  var d = document.documentElement, me = document.currentScript;
  d.lang = (me && me.dataset.lang) || d.lang || 'en';
  // [dusk] the hour, for the pages that take their colours from it: dawn, day, dusk or night (a word, for this moment only)
  try { var hr = new Date(), hm = hr.getHours() * 60 + hr.getMinutes(); d.dataset.hour = hm < 300 || hm >= 1170 ? 'night' : hm < 480 ? 'dawn' : hm < 990 ? 'day' : 'dusk'; } catch (e) {}
  // the not-found page carries both languages; a missing address under /hi/ gets the Hindi one (see lost.js)
  if (me && me.hasAttribute('data-lost') && /^\/hi(\/|$)/.test(location.pathname)) { d.lang = 'hi'; d.dataset.lostLang = 'hi'; }
  // [lang] the language a reader chose with the pill (any page) is remembered on this device, and English pages that have a Hindi
  // edition open in it (before the first paint, so nothing flashes). Taking the pill back to English is remembered the same way, and
  // "?lang=en" on an English page chooses English. Nothing is sent anywhere; no preference, no change.
  try {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-lang-switch], [data-hi-hint] a'); if (!a) return;
      try { localStorage.setItem('spritual:lang', (a.getAttribute('hreflang') || a.getAttribute('lang')) === 'hi' ? 'hi' : 'en'); } catch (x) {}
    }, true);
    if (/[?&]lang=en\b/.test(location.search)) { try { localStorage.setItem('spritual:lang', 'en'); } catch (x) {} }
    if (d.lang === 'en' && !(me && me.hasAttribute('data-lost')) && localStorage.getItem('spritual:lang') === 'hi' && !/[?&]lang=en\b/.test(location.search)) {
      var alt = document.querySelector('link[rel="alternate"][hreflang="hi"]');
      if (alt) { var au = new URL(alt.href, location.href); if (/^\/hi\//.test(au.pathname)) { location.replace(au.pathname + location.search + location.hash); return; } }   // (the path only: the same site, whichever host it is served from)
    }
  } catch (e) {}
  var calm = false;
  try {
    var p = JSON.parse(localStorage.getItem('spritual:prefs') || '{}');
    if (p.size) d.dataset.size = p.size;
    if (p.theme) d.dataset.theme = p.theme;
    if (p.motion) d.dataset.motion = p.motion;
    // [comfort] the reader's own comfort choices (comfort.css, the Aa sheet): set here so the first paint is already theirs.
    // Night Lamp is the dark theme with warm amber text (comfort.css); it wins over the colour choice while it is on.
    if (p.lead) d.dataset.lead = p.lead;
    if (p.measure) d.dataset.measure = p.measure;
    if (p.hisize) d.dataset.hisize = p.hisize;
    if (p.aa) d.dataset.aa = p.aa;
    if (p.lamp === 'on') { d.dataset.lamp = 'on'; d.dataset.theme = 'sanctum'; }
    calm = p.motion === 'reduce';
  } catch (e) { p = {}; }
  // A story page carries its own language only (the other edition is its own page; site.js fetches it when the reader
  // has chosen side by side), so the reading edition before the first paint is always the page's language, whatever
  // was chosen on another page. data-read on this script marks a story page.
  if (me && me.hasAttribute('data-read')) d.dataset.read = d.lang;
  // the device's own "reduce motion" setting counts exactly like the site's switch, for every rule that asks
  var mq = matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) d.dataset.motion = 'reduce';
  if (mq.addEventListener) mq.addEventListener('change', function () {
    var mine; try { mine = JSON.parse(localStorage.getItem('spritual:prefs') || '{}').motion; } catch (e) {}
    if (mq.matches || mine === 'reduce') d.dataset.motion = 'reduce'; else delete d.dataset.motion;
  });
  // [keep] a browser that can keep a story for offline reading (the Cache API on a secure page): the hero's quiet keep control
  // holds its place from the first paint (site.css .kp-can), so it never moves the story's buttons when it appears
  if (window.caches && window.fetch && window.isSecureContext) d.classList.add('kp-can');
  // [joyB] "Pick up at scene N?" (assets/joyb.js) takes one line in the story opening's flow; when this story has a place on this device the
  // room for it is held from the first paint (joyb.css html.pk-can), so the line fades in without moving Keep or the buttons
  try { if (me && me.hasAttribute('data-read')) { var pkS = location.pathname.replace(/\/+$/, '').split('/').pop(), pkP = (JSON.parse(localStorage.getItem('spritual:places') || 'null') || {})[pkS];
    if (pkP && !pkP.d && pkP.s >= 2 && pkP.s <= pkP.t && !/^#page-/.test(location.hash)) d.classList.add('pk-can'); } } catch (e) {}
  d.classList.add('lst-js');   // [lane F] script is running: the Listen buttons may show
  // [K2] Paintings arrive whole. A hero painting marked data-arrive waits invisible (html.arr) over its tiny inline placeholder and
  // fades in the moment the browser has the whole file, instead of being drawn top to bottom over a bare dark page on a slow line.
  // load and error do not bubble, so one capture listener (registered before any image exists) sees them all; nothing else runs.
  // Whatever happens, nothing stays hidden: an error shows the alt text, and after 6 s every waiting painting is shown as it is.
  d.classList.add('arr');
  try { if (document.referrer.indexOf(location.origin + '/') === 0) d.classList.add('nav-in'); } catch (e) {}   // arrived from another page of this site: the header does not replay its entrance
  var here = function (e) { var t = e.target; if (!t || t.tagName !== 'IMG' || !t.hasAttribute('data-arrive')) return; var on = function () { t.classList.add('is-here'); }; if (e.type === 'load' && t.decode) t.decode().then(on, on); else on(); };   // decoded first: the fade never stalls on a big painting
  document.addEventListener('load', here, true); document.addEventListener('error', here, true);
  setTimeout(function () { var w = document.querySelectorAll('img[data-arrive]:not(.is-here)'); for (var i = 0; i < w.length; i++) w[i].classList.add('is-here'); }, 6000);
  if (!calm && !mq.matches) d.classList.add('cx-js');
  // [calm] Light mode (assets/calm.js, calm.css): the reader's own choice (Reading comfort > Motion), or this tab's own
  // "resting the motion" after the device struggled (calm.js keeps only that word, for this tab: never a measurement).
  // data-light is read live by every script that moves anything; set here, before the first paint, so nothing flashes.
  try { if (p.motion === 'light') d.dataset.light = 'manual'; else if (sessionStorage.getItem('spritual:calm') === 'rest') d.dataset.light = 'auto'; } catch (e) {}
  if (d.dataset.light) d.classList.remove('cx-js');   // Light mode keeps the entrances still, like reduced motion
  // [type] a language switch that carries the reader's paragraph across (assets/type.js): the story's words wait unseen
  // until they are in place (cinema.css, .ty-arr and .ty-arw, which also show them by themselves if that script never arrives)
  try { var ty = me && me.hasAttribute('data-read') && d.classList.contains('cx-js') && JSON.parse(sessionStorage.getItem('spritual:ty-lang') || 'null'); if (ty && Date.now() - ty.t < 20000 && /#page-\d+$/.test(location.hash)) d.classList.add('ty-arr', 'ty-arw'); } catch (e) {}
  // ...and whatever happens, neither waits past about 1.2 s from the start of the page: a slow phone never shows a bare painting for long
  try { if (d.classList.contains('ty-arw')) setTimeout(function () { d.classList.remove('ty-arr', 'ty-arw'); }, Math.max(0, 1200 - performance.now())); } catch (e) {}
  try { if ((navigator.connection && navigator.connection.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches) d.classList.add('ep-lite'); } catch (e) {}
  // [perf] How heavy this line is, and which width of a painting to ask for. Shared by the reader (film.js, site.js).
  // slow(): Save-Data, a reported 2g/3g (or under 1.2 Mbit/s), or, where the browser reports nothing (Safari), what this page's
  // own big files have actually achieved so far (under about 150 KB/s). pick(): the smallest width that covers a stage cw px
  // wide at this screen's density; on a slow line a width one step softer (a painting is soft, a wait is not).
  window.SpritualNet = (function () {
    var c = navigator.connection || {};
    function measured() {
      try {
        var big = performance.getEntriesByType('resource').filter(function (r) { return r.transferSize > 20000 && r.responseEnd > r.responseStart; });
        if (big.length < 3) return false;
        // [perf] bytes over the time the line was actually busy (overlapping downloads counted once, gaps between them not at all),
        // so a quiet moment on a fast line is never read as a slow one
        var iv = big.map(function (r) { return [r.responseStart, r.responseEnd]; }).sort(function (a, b) { return a[0] - b[0]; });
        var b = 0, busy = 0, cs = iv[0][0], ce = iv[0][1];
        big.forEach(function (r) { b += r.transferSize; });
        for (var i = 1; i < iv.length; i++) { if (iv[i][0] > ce) { busy += ce - cs; cs = iv[i][0]; ce = iv[i][1]; } else if (iv[i][1] > ce) ce = iv[i][1]; }
        busy += ce - cs;
        return busy > 400 && b / busy * 1000 < 150000;
      } catch (e) { return false; }
    }
    return {
      slow: function () { return !!c.saveData || /^(slow-)?[23]g$/.test(c.effectiveType || '') || (c.downlink > 0 && c.downlink < 1.2) || measured(); },
      pick: function (set, cw, narrow) {
        var need = cw * Math.min(window.devicePixelRatio || 1, narrow ? 1 : 1.5) * .93; if (this.slow()) need *= .62;
        for (var i = 0; i < set.length; i++) if (set[i][1] >= need) return set[i][0];
        return set[set.length - 1][0];
      }
    };
  })();
  // [perf] Save-Data or a reported 2g/3g line: a painting that waits to be fetched (loading="lazy") is asked for no wider than 960 px, rewritten as the
  // parser inserts it, i.e. before the browser decides to fetch it (site.js repeats this for any that slipped by, and for lines measured slow later)
  try {
    var cn = navigator.connection || {};
    if (d.classList.contains('ep-lite') || /^(slow-)?[23]g$/.test(cn.effectiveType || '')) {
      var capImg = function (im) {
        if (im.nodeType !== 1 || im.tagName !== 'IMG' || im.loading !== 'lazy' || !im.getAttribute('srcset') || im.dataset.capped) return;
        var keep = im.getAttribute('srcset').split(',').filter(function (x) { return (parseInt(x.trim().split(/\s+/)[1], 10) || 0) <= 960; });
        im.dataset.capped = '1'; if (keep.length) im.setAttribute('srcset', keep.join(','));
      };
      var capMo = new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType !== 1) return; capImg(n); if (n.querySelectorAll) n.querySelectorAll('img[srcset][loading=lazy]').forEach(capImg); }); }); });
      capMo.observe(d, { childList: true, subtree: true });
      addEventListener('DOMContentLoaded', function () { capMo.disconnect(); });
    }
  } catch (e) {}
  // [perf] A shared scene link (#page-N): the painting of that scene is asked for first, at high priority, at the width the
  // film will pick, so the title is never held over an empty stage while the story's cover loads first.
  var deepLink = false;
  try {
    var ss = me && me.dataset.sceneSets, hm = /^#page-(\d+)$/.exec(location.hash);
    if (ss && hm && me.dataset.film && !d.classList.contains('ep-lite')) {
      var sset = JSON.parse(ss)[+hm[1] - 1];
      if (sset) {
        var ent = sset.split(',').map(function (x) { x = x.trim().split(/\s+/); return [x[0], parseInt(x[1], 10) || 0]; }).sort(function (a, b) { return a[1] - b[1]; });
        var sw = innerWidth, sh = innerHeight, scw = 16 * Math.max(sw / 16, sh / 9);
        // [perf] the smallest cut (about 20 KB) is asked for first and shown blurred (film.css, .fm-deep::before) while the full painting
        // comes, so a shared scene never opens on a black screen; the full width is chosen from the rest
        var ph = ent.length > 1 ? ent.shift() : null, pl2 = null;
        if (ph) { var pl2 = document.createElement('link'); pl2.rel = 'preload'; pl2.as = 'image'; pl2.href = ph[0]; pl2.setAttribute('fetchpriority', 'high'); document.head.appendChild(pl2); d.style.setProperty('--fm-ph', 'url("' + new URL(ph[0], location.href).href + '")'); }
        var sp = document.createElement('link'); sp.rel = 'preload'; sp.as = 'image'; sp.href = window.SpritualNet.pick(ent, scw, sw < 900); sp.setAttribute('fetchpriority', 'high'); document.head.appendChild(sp); window.SpritualDeepPic = [+hm[1], sp.getAttribute('href')];   // film.js shows this very file for that scene (never a second cut of it)
        // the story's cover is not what this reader came for: its early request is dropped, and the words wait (film.css) for the painting
        var cp = document.querySelector('link[rel=preload][as=image][fetchpriority][imagesrcset]'); if (cp && cp !== sp && cp !== pl2 && cp.getAttribute('imagesrcset')) cp.parentNode.removeChild(cp);
        deepLink = true;
      }
    }
  } catch (e) {}
  // [perf] The People page's sky: its script and its small sheet of faces are asked for now, at high priority, instead of
  // after site.js has run (an injected script is fetched last, behind every painting on the page). Not with Save-Data (ep-lite).
  try {
    var sj = me && me.dataset.skyJs;
    if (sj && !d.classList.contains('ep-lite')) {
      var pl = document.createElement('link'); pl.rel = 'preload'; pl.as = 'script'; pl.href = sj; document.head.appendChild(pl);
      var sa = me.dataset.skyAtlas;
      // [perf] the sky's small sheet of faces is fetched (and decoded off the main thread) right here, once; stars.js takes this same
      // request (window.SpritualAtlas) instead of a preload that it may or may not match, which had left the sheet downloaded twice
      if (sa && window.fetch && window.createImageBitmap) { try { var pa = { src: sa, used: false }; pa.p = fetch(sa, { priority: 'high' }).then(function (r) { return r.ok ? r.blob() : Promise.reject(); }).then(function (b) { return createImageBitmap(b); }); pa.p.catch(function () {}); window.SpritualAtlas = pa; } catch (e) {} }
    }
  } catch (e) {}
  // The Unbroken Shot (film.js, film.css): a story page is laid out as a film from its first paint, so a reader arriving
  // in the middle of a story never sees the page change under them. Its styles are fetched here, off the critical path.
  // Not with Save-Data, page-by-page or side-by-side reading, a very short screen, or once the reader has chosen the
  // reading page. [calm] Reduced motion keeps the film too, and stays in the dark: still paintings, soft cross-fades,
  // no camera (film.js).
  try {
    var fc = me && me.dataset.film;
    if (fc && !d.classList.contains('ep-lite') && p.film !== 'off' && p.mode !== 'leaf' && p.read !== 'both' && innerHeight >= 480) {
      d.classList.add('fm'); if (document.querySelector('link[data-film-css]')) throw 0; var fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = fc; document.head.appendChild(fl);
    }
  } catch (e) {}
  if (d.classList.contains('fm')) setTimeout(function () { d.classList.add('hero-ok'); }, 6000);
  if (deepLink && d.classList.contains('fm')) { d.classList.add('fm-deep'); setTimeout(function () { if (!d.classList.contains('fm-live')) d.classList.remove('fm-deep'); }, 5000); }
  // Until the analytics question is answered (consent.js: no valid choice, or one older than a year), a painted opening
  // keeps room at its foot for it (cinema.css, --cx-consent-room). The room is reserved here, before the first paint, at
  // the bar's measured height for this screen, language and text size (Chromium and WebKit alike); consent.js, which
  // builds the bar later, only ever widens it. The opening's card is placed once and never moves up under the reader.
  try {
    var cq = null; try { cq = JSON.parse(localStorage.getItem('spritual:consent') || 'null'); } catch (e) {}
    var cat = cq && Date.parse(cq.date);
    var asked = 0; try { asked = parseInt(sessionStorage.getItem('spritual:consent-asked') || '0', 10) || 0; } catch (e) {}   // [fixA G01] consent.js asks on a visit's first two pages only
    if ((!cq || (cq.value !== 'granted' && cq.value !== 'denied') || !cat || Date.now() - cat > 365 * 864e5) && asked < 2) {
      var cw = innerWidth, ch = innerHeight, hi = d.lang === 'hi', k = d.dataset.size === 'xl' ? 2 : d.dataset.size === 'l' ? 1 : 0;
      var land = cw > ch && ch <= 520, room = matchMedia('(min-width: 860px) and (min-height: 520.02px)').matches ? [118, 133, 149][k]
        : land || (cw < 760 && cw >= 600) ? [70, 75, 85][k]
        : cw >= 760 ? (ch >= cw ? [76, 81, 89] : [83, 91, 104])[k]
        // a phone held upright: the question takes one, two or three lines beside its answers
        : [hi ? (cw < 375 ? 92 : 70) : (cw < 360 ? 101 : 70), hi ? (cw <= 340 ? 121 : cw < 360 ? 143 : cw < 390 ? 121 : cw < 430 ? 99 : 76) : (cw < 360 ? 134 : cw < 375 ? 114 : cw < 430 ? 93 : 75), cw < 430 ? (hi ? 162 : 152) : (hi ? 137 : 128)][k];
      room += 4; /* [A] 44px answers */ d.style.setProperty('--cx-consent-room', room + 'px'); d.setAttribute('data-consent-room', '');
    }
  } catch (e) {}
  // the home opening is composed at 1920x1080; on bigger screens (a 4K monitor at 100%, a television) the composition
  // grows with the screen, by the smaller of its width and height ratios (so a 32:9 screen still fits it in one screen).
  // Only the opening's words and buttons use it (cinema.css, zoom); the rest of the site keeps the reader's text size.
  // (only the home has that opening: elsewhere nothing reads the size on every resize, which forced a whole-page layout)
  var kAt = '', setK = function () { var k = Math.max(1, Math.min(innerWidth / 1920, innerHeight / 1080)).toFixed(4); if (k !== kAt) { kAt = k; d.style.setProperty('--cx-k', k); } };
  if (me && me.hasAttribute('data-titles')) { setK(); addEventListener('resize', setK); }
  // the English home's line under the name is set, until Newsreader arrives, in a width-matched stand-in (fonts.css, a
  // local face): asked for here, before the first layout, so that layout already uses it and nothing re-wraps after
  if (me && me.hasAttribute('data-titles') && d.lang !== 'hi' && document.fonts && document.fonts.load) try { document.fonts.load('400 1em "Newsreader Stand-in"').then(null, function () {}); } catch (e) {}
  // the opening titles play once; a reader who has been here before gets the words and buttons at once
  // The home page's title sequence plays at most once a week on this device: a link opened into a new tab (from a chat,
  // a feed or a search) does not replay it. Only the time it last played is kept, here on the device. A tab that has
  // already seen it (the older per-tab flag) counts as seen too. Other pages keep their own first-visit-only entrances.
  // A reader who arrives from another site (a search, a feed) came for what they were promised and gets the page at once,
  // as a returning reader does, for the rest of that tab; typing the address, or coming from a page of this site, still
  // plays the titles (not having been seen, they are not counted as played this week).
  try {
    if (me && me.hasAttribute('data-titles')) {
      // [joyHH] the sequence is shown once a week per language: a reader who saw the English titles and then chose Hindi (or the other way round) still gets the opening in the language they are reading
      var tk = d.lang === 'hi' ? '-hi' : '', titlesAt = +localStorage.getItem('spritual:titlesAt' + tk) || 0, ref = document.referrer || '';
      if (sessionStorage.getItem('spritual:titles' + tk) || Date.now() - titlesAt < 6048e5 || d.classList.contains('ep-lite') || matchMedia('(forced-colors: active)').matches) d.classList.add('cx-seen');   // [A] forced colours too: the finished page, not words waiting on animation   // [joyQ] Save-Data gets the finished composition, not the sequence
      else if (ref && ref.indexOf(location.origin + '/') !== 0) { d.classList.add('cx-seen'); sessionStorage.setItem('spritual:titles' + tk, '1'); }
      else { localStorage.setItem('spritual:titlesAt' + tk, String(Date.now())); sessionStorage.setItem('spritual:titles' + tk, '1'); }
      // [joyHH] a returning reader's "Continue reading" card arrives after the first paint (site.js); its room is kept from the start so the opening does not move when it does
      try { var lastRead = JSON.parse(localStorage.getItem('spritual:last') || 'null'); if (lastRead && lastRead.slug) d.classList.add('cx-has-last'); } catch (e2) {}
      localStorage.setItem('spritual:seen', '1');
    }
    else if (localStorage.getItem('spritual:seen')) d.classList.add('cx-seen'); else localStorage.setItem('spritual:seen', '1');
  } catch (e) {}
  // The title sequence's curtain parts along the line of light under the name, and where that line sits depends on the
  // screen and the language. It is measured here, in the frame before each paint, from before the first one until the
  // sequence is over (fonts arriving can move it), and handed to the stylesheet as --seam (cinema.css).
  if (me && me.hasAttribute('data-titles') && d.classList.contains('cx-js') && !d.classList.contains('cx-seen') && window.requestAnimationFrame) {
    var seamFrom = 0, seamAt = -1, zf = 0;
    // The name sits in a part of the page that is zoomed on screens larger than 1920x1080 (--cx-k). Newer engines report
    // such an element's rectangle as it is seen; older ones (Safari, Chrome before 128) report it divided by the zoom.
    // A probe tells which, once: a box 50px down inside a twice-zoomed parent is seen at 100px.
    var zoomFix = function () {
      if (!zf) {
        var o = document.createElement('div'), i = document.createElement('div');
        o.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;zoom:2;visibility:hidden;pointer-events:none';
        i.style.cssText = 'position:absolute;left:0;top:50px;width:1px;height:1px';
        o.appendChild(i); document.body.appendChild(o);
        zf = (i.getBoundingClientRect().top - o.getBoundingClientRect().top) < 75 ? 2 : 1;   // 2: divided by the zoom
        document.body.removeChild(o);
      }
      return zf === 2 ? (parseFloat(d.style.getPropertyValue('--cx-k')) || 1) : 1;
    };
    var seam = function () {
      var line = document.querySelector('.cx-home .cx-open .cx-wm-line'), open = line && line.closest('.cx-open');
      if (open) {
        if (!seamFrom) seamFrom = Date.now();   // the seven seconds run from the first frame that has the name in it
        var z = zoomFix(), r = line.getBoundingClientRect(), y = Math.round((r.top + r.height / 2) * z - open.getBoundingClientRect().top);
        if (y > 0 && y !== seamAt) { seamAt = y; d.style.setProperty('--seam', y + 'px'); }
      }
      if ((!seamFrom || Date.now() - seamFrom < 11000) && !d.classList.contains('cx-seen')) requestAnimationFrame(seam);
    };
    requestAnimationFrame(seam);
  }
  // A page that opens dark (the home titles, a story's or a kand's painted opening) is dark from its very first frame: the
  // canvas under the page is set to the opening's dusk until the page has been revealed, so the dissolve from one dark page
  // into another never passes through the paper colour.
  var dark = me && me.hasAttribute('data-dark');
  var undark = function () { d.style.backgroundColor = ''; var s = document.getElementById('pre-dark'); if (s) s.parentNode.removeChild(s); };
  // A painted opening's title card (a story's, a hymn's, a kand of the Manas) waits, unseen, while its title face (Eczar,
  // preloaded) is still on its way at the first paint, and makes its entrance once the face has arrived (at most 1.2 s
  // later; cinema.css .cx-hold). Drawn first in a stand-in face, the title re-wrapped when Eczar landed and the card
  // jumped. When the face is already there (a fast line, a second visit) nothing waits.
  var fs = document.fonts;
  if (dark && !(me && me.hasAttribute('data-titles')) && fs && fs.load && fs.check && window.requestAnimationFrame) {
    var face = '500 1em Eczar', glyph = d.lang === 'hi' ? '\u0915' : 'A', held = true;
    var release = function () { if (held) { held = false; d.classList.remove('cx-hold'); } };
    try {
      d.classList.add('cx-hold');
      fs.load(face, glyph).then(release, release);
      requestAnimationFrame(function () { try { if (fs.check(face, glyph)) release(); } catch (e) { release(); } setTimeout(release, 1200); });
    } catch (e) { release(); }
  }
  if (dark) {
    d.style.backgroundColor = '#160c05';
    if (!('onpagereveal' in window)) addEventListener('load', undark);
  }
  // lane E: a back or forward step only dissolves (ui-motion.css reads data-nav); a fresh visit rises
  try { var nv = performance.getEntriesByType('navigation')[0]; if (nv && nv.type === 'back_forward') d.dataset.nav = 'back'; } catch (e) {}
  addEventListener('pagereveal', function (e) {
    if (dark) { if (e.viewTransition) e.viewTransition.finished.then(undark, undark); else undark(); }
    if (!e.viewTransition) return;
    var w; try { w = sessionStorage.getItem('cx-vt'); sessionStorage.removeItem('cx-vt'); } catch (x) { return; }
    if (!w || w !== location.pathname) return;
    var t = document.querySelector('[data-vt-target]'); if (!t) return;   // [K2] the whole opening (painting, scrim and words) is the shared element: a bare painting travelled above its own scrim and popped dark when it landed
    t.style.viewTransitionName = 'cx-hero';
    var who = ''; try { who = sessionStorage.getItem('cx-vtk'); sessionStorage.removeItem('cx-vtk'); } catch (x) {}
    d.dataset.vt = who ? 'who' : 'story'; /* lane E: ui-motion.css lets the painting's morph land before the page rises */
    var clear = function () { t.style.viewTransitionName = ''; delete d.dataset.vt; };
    e.viewTransition.finished.then(clear, clear);
  });
  var sw = me && me.dataset.sw;
  // [perf] The service worker's first install (its shell is a few hundred KB) waits until the page has loaded and gone quiet, so it never
  // shares a weak line with the painting the reader came for; the extra core pages are warmed only on a line that is not slow (sw.js).
  var later = function (fn, ms) { var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(fn, { timeout: ms }); }; if (document.readyState === 'complete') go(); else addEventListener('load', go); };
  if (sw && 'serviceWorker' in navigator) later(function () {
    navigator.serviceWorker.register(sw).then(function () { return navigator.serviceWorker.ready; }).then(function (reg) {
      if (!window.SpritualNet.slow() && reg.active) setTimeout(function () { try { reg.active.postMessage('spritual:warm'); } catch (e) {} }, 4000);
    }).catch(function () {});
  }, 6000);
  // [perf] the Devanagari faces of the English home are decoration there (the names beside the characters): fetched once the page has
  // loaded, never on Save-Data or a slow line (the device's own Devanagari stands in), instead of ~245 KB competing with the first screen
  var lateCss = me && me.dataset.lateCss;
  if (lateCss && !window.SpritualNet.slow() && !d.classList.contains('ep-lite')) later(function () { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = lateCss; document.head.appendChild(l); }, 3000);
})();
