// Analytics only with the reader's permission (Google Analytics 4 under Google Consent Mode v2, everything denied by default).
// Until the reader presses Allow nothing from Google is loaded: no script, no cookie, no request to any Google host.
// Decline is remembered and nothing loads. The choice (spritual:consent = {"value":"granted"|"denied","date":ISO}) is
// asked again after 12 months, and "Privacy choices" in the footer and on the privacy page reopens the question.
// Withdrawing sets consent back to denied, switches the tag off for the rest of the page (and forbids the page any further
// connection to Google, so not even a batch the tag was holding is sent) and removes the _ga cookies.
// What is sent: page views (address without its query or fragment) and five events with fixed, non-personal values:
// story_start / story_complete {story_slug, lang}, hymn_open {hymn, lang}, character_open {character, lang},
// language_switch {to}. Never reflections, saved notes, search words or any other text a reader types.
// The property's own "enhanced measurement" (set in Google Analytics, not here) adds scroll, form_start, click (outbound),
// file_download and user_engagement; the privacy page (content/legal.json) describes those too.
(function () {
  'use strict';
  var ID = 'G-P7YG57M2CP', KEY = 'spritual:consent', YEAR = 365 * 864e5;
  var d = document, root = d.documentElement;
  var ui = {}; try { ui = JSON.parse(d.getElementById('ui').textContent) || {}; } catch (e) {}
  var T = ui.consent; if (!T) return;
  var lang = function () { return (root.lang || 'en').slice(0, 2) === 'hi' ? 'hi' : 'en'; };

  var read = function () {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!c || (c.value !== 'granted' && c.value !== 'denied')) return null;
      var at = Date.parse(c.date); if (!at || Date.now() - at > YEAR) return null;   // a year on, ask again
      return c;
    } catch (e) { return null; }
  };
  var write = function (value) { var c = { value: value, date: new Date().toISOString() }; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} return c; };

  /* ---------- The tag: loaded only after Allow ---------- */
  var loaded = false;
  var clean = function (u) { try { var x = new URL(u, location.href); return x.origin + x.pathname; } catch (e) { return ''; } };
  var gtag = function () { (window.dataLayer = window.dataLayer || []).push(arguments); };
  var start = function () {
    if (sealed) return;                         // allowed again on a page where it was withdrawn: from the next page on
    window['ga-disable-' + ID] = false;
    if (loaded) { gtag('consent', 'update', { analytics_storage: 'granted' }); return; }
    loaded = true;
    window.gtag = gtag;
    // Consent Mode v2: every purpose denied first; then only measurement is granted. Advertising stays denied.
    gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    var cfg = { allow_google_signals: false, allow_ad_personalization_signals: false, page_location: clean(location.href) };
    if (d.referrer) cfg.page_referrer = clean(d.referrer);
    gtag('config', ID, cfg);
    var s = d.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    d.head.appendChild(s);
    pageEvents();
  };
  // remove the Analytics cookies from this host and every parent domain they could have been set on
  var dropCookies = function () {
    var names = d.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); }).filter(function (n) { return n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid' || n === '_gat' || n.indexOf('_gat_') === 0; });
    var parts = location.hostname.split('.'), doms = [''];
    for (var i = 0; i < parts.length - 1; i++) { var dm = parts.slice(i).join('.'); doms.push(dm, '.' + dm); }
    names.forEach(function (n) { doms.forEach(function (dm) { d.cookie = n + '=; Max-Age=0; path=/' + (dm ? '; domain=' + dm : ''); }); });
  };
  // A tag already running keeps a batch of events (and its own automatic ones) to send when the page is left. Withdrawal
  // must stop that too, so the page also forbids itself, from this moment, any connection to Google (a second, stricter
  // Content Security Policy, which can only narrow the site's own): nothing more leaves for Google from this page.
  var sealed = false;
  var seal = function () {
    if (sealed || !loaded) return; sealed = true;
    var m = d.createElement('meta'); m.httpEquiv = 'Content-Security-Policy';
    m.content = "script-src 'self'; connect-src 'self'; img-src 'self' data: blob:";
    d.head.appendChild(m);
  };
  var stop = function () {
    window['ga-disable-' + ID] = true;          // the tag sends nothing more from this page
    if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
    seal();
    try { sessionStorage.removeItem('spritual:ga-switch'); } catch (e) {}
    dropCookies();
  };
  var allowed = function () { var c = read(); return !!c && c.value === 'granted' && window['ga-disable-' + ID] !== true; };
  // events with fixed values only; dropped (not queued) when the reader has not allowed analytics
  var track = function (name, params) { if (loaded && allowed()) gtag('event', name, params); };

  /* ---------- What the events measure ---------- */
  var pageDone = false;
  var pageEvents = function () {
    if (pageDone) return; pageDone = true;
    pending();
    var p = location.pathname.replace(/^\/hi(?=\/)/, '');
    var m = /^\/(hanuman-chalisa|shiva-tandava-stotram)\/$/.exec(p); if (m) track('hymn_open', { hymn: m[1], lang: lang() });
    m = /^\/characters\/([a-z0-9-]+)\/$/.exec(p); if (m) track('character_open', { character: m[1], lang: lang() });
  };
  var storySent = {};
  d.addEventListener('spritual:story', function (e) {
    var x = e.detail || {}; if (!/^[a-z0-9-]+$/.test(x.slug || '') || (x.kind !== 'start' && x.kind !== 'complete')) return;
    if (storySent[x.kind]) return; storySent[x.kind] = true;
    track('story_' + x.kind, { story_slug: x.slug, lang: lang() });
  });
  // The switch leaves the page at once, before Analytics would send a batched event, so the event is handed to the next
  // page in this tab (sessionStorage, only when analytics is allowed) and sent from there.
  var PEND = 'spritual:ga-switch';
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lang-switch]'); if (!a || !loaded || !allowed()) return;
    try { sessionStorage.setItem(PEND, a.getAttribute('lang') === 'hi' ? 'hi' : 'en'); } catch (x) {}
  }, true);
  var pending = function () {
    var to = null; try { to = sessionStorage.getItem(PEND); sessionStorage.removeItem(PEND); } catch (x) {}
    if (to === 'hi' || to === 'en') track('language_switch', { to: to });
  };

  /* ---------- The bar ---------- */
  var bar = null, status = null, opener = null;
  var privacyHref = function () { var a = d.querySelector('.cx-credits-bar a[href*="privacy"]'); return a ? a.getAttribute('href') : ''; };
  var el = function (tag, attrs, text) { var n = d.createElement(tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };
  var build = function () {
    status = el('p', { class: 'visually-hidden', role: 'status', 'data-consent-status': '' });
    bar = el('section', { class: 'cx-consent', 'aria-labelledby': 'cx-consent-h', 'data-consent': '', hidden: '' });
    var h = el('p', { id: 'cx-consent-h', class: 'cx-consent-h', tabindex: '-1' }, T.title);
    if (T.short) h.setAttribute('data-short', T.short);   // phones show this one-line form (cinema.css)
    var p = el('p', { class: 'cx-consent-text' }, T.text + ' ');
    var href = privacyHref(); if (href) p.appendChild(el('a', { href: href }, T.more));
    var row = el('div', { class: 'cx-consent-btns' });
    var yes = el('button', { type: 'button', class: 'cx-consent-btn', 'data-consent-yes': '' }, T.allow);
    var no = el('button', { type: 'button', class: 'cx-consent-btn', 'data-consent-no': '' }, T.decline);
    row.appendChild(yes); row.appendChild(no);
    bar.appendChild(h); bar.appendChild(p); bar.appendChild(row);
    // early in the reading order (just after "Skip to content"), shown at the foot of the screen
    var skip = d.querySelector('.skip'); var at = skip ? skip.nextSibling : d.body.firstChild;
    d.body.insertBefore(status, at); d.body.insertBefore(bar, at);
    yes.addEventListener('click', function () { choose('granted'); });
    no.addEventListener('click', function () { choose('denied'); });
    bar.addEventListener('keydown', function (e) { if (e.key === 'Escape' && opener) { e.preventDefault(); hide(); } });
  };
  // keep clear of the story's reader dock: its height and its gap from the bottom, while it is on screen
  var dock = d.querySelector('.reader-bar'), watching = false;
  // The question steps out of the way of the reading. On a page that is read (a story, a hymn, a kand of the Manas)
  // scrolling on down tucks it away, at every width, and it comes back only where nothing is being read: at the top of
  // the page or at its foot. It is never tucked from under a finger or focus, nor when the reader asked for it
  // ("Privacy choices"). On every other page it stays where it is until it is answered.
  var reading = !!d.querySelector('[data-reader], [data-manas]');
  var away = false, lastY = 0, run = 0, footOn = false;
  var foot = d.querySelector('.cx-credits');
  // [A] One placement everywhere: fixed to the foot of the screen (a slim strip on a phone, a small card in the lower corner
  // on a wide screen), seen on arrival and answered where it is, on every page. (It used to be parked at the very end of the
  // page on a wide screen and on a phone's maps and lists, where nobody reached it and a Tab jumped the page thousands of
  // pixels.) Only a phone on its side, with almost no height, still asks at the foot of the page, as a strip there would
  // take a third of the screen. Pages the footer keeps room for it (--cx-consent-room), so it lies on no link.
  var footOnly = !reading && !!foot && 'IntersectionObserver' in window && matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  if (footOnly) reading = true;
  var atTop = function () { return (window.scrollY || 0) < innerHeight * .5; };
  var clear = function () {
    if (!bar || bar.hidden) return;
    var on = dock && !dock.classList.contains('is-away') && !dock.classList.contains('is-tucked') && dock.offsetHeight > 0;
    var px = on ? dock.offsetHeight + (parseFloat(getComputedStyle(dock).bottom) || 0) : 0;
    // out of sight (tucked away, or waiting beside a stage) it takes its new place at once and then comes in there:
    // sliding its foot (bottom) to the new place as it came in moved it on screen, a layout shift
    if (bar.style.getPropertyValue('--cx-dock-clear') !== px + 'px') {
      var out = bar.classList.contains('is-tucked') || bar.classList.contains('is-aside');
      if (out) bar.style.transition = 'none';
      bar.style.setProperty('--cx-dock-clear', px + 'px');
      if (out) { void bar.offsetWidth; bar.style.transition = ''; }
    }
    // on a page that is read it never shares the screen with the reader's dock: one bar at the foot at a time
    var tuck = (away || (reading && on)) && !bar.contains(d.activeElement) && !bar.hasAttribute('data-reopened');
    bar.classList.toggle('is-tucked', tuck); bar.inert = tuck || bar.classList.contains('is-aside');
  };
  // The room the bar takes at the foot of the screen, which the openings and the footer keep free (cinema.css). It is the
  // bar's own height and its resting gap only, never the dock's clearance: this value pads the story's opening, which is
  // in the page's flow above the reading, so it must not change while someone reads (a change there moves the text).
  // boot.js reserved it before the first paint; here it is only ever widened (a few pixels to spare never move anything),
  // and fitted exactly only when the screen's width changes (a phone turned on its side), when everything is laid out anew.
  var fitW = 0;
  var room = function () {
    if (!bar || bar.hidden || !bar.offsetHeight) return;
    var base = innerWidth <= 759 || (innerWidth > innerHeight && innerHeight <= 520) ? 6 : 12;
    var px = Math.ceil(bar.offsetHeight + base + 8), was = root.hasAttribute('data-consent-room') ? parseFloat(root.style.getPropertyValue('--cx-consent-room')) || 0 : 0;
    var turned = fitW && innerWidth !== fitW; fitW = innerWidth;
    if (turned ? px !== was : px > was) root.style.setProperty('--cx-consent-room', px + 'px');
    root.setAttribute('data-consent-room', '');
  };
  var scrolled = function () {
    if (!reading) return;
    var y = window.scrollY || 0, dy = y - lastY; lastY = y;
    run = dy > 0 === run > 0 ? run + dy : dy;         // travel in one direction
    var was = away;
    // only the opening and the foot of the page are free of reading: anywhere else it waits out of the way, whichever way
    // the reader is going (scrolling back up from the foot used to leave it on screen over the verses all the way up)
    away = footOnly ? !footOn : !(atTop() || footOn);
    if (away !== was) clear();
  };
  // a full-screen stage (the home opening, the character select, a person's own stage) keeps its whole screen, composed
  // to fit it: the question waits beside it, not over it (on a person's page it would lie on the figure's feet, the study
  // row or "Begin their story"), and appears once the reader moves on
  var stages = [].slice.call(d.querySelectorAll('.cx-home .cx-open, .cx-select, .cast-hero, .cx-film-open, [data-wl-view]' /* [worlds] a pinned scroll world is a stage too */));
  var watchStage = function () {
    if (!stages.length) return;
    var seenSet = [], inside = false;
    var place = function () {
      var on = seenSet.length > 0 || inside;
      if (on && bar.contains(d.activeElement)) return;   // never pull the question away from someone answering it
      bar.classList.toggle('is-aside', on); bar.inert = on; clear();
    };
    // decided before the bar first paints, so it never flashes over a stage on arrival
    stages.forEach(function (st) { var r = st.getBoundingClientRect(), vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); if (r.height && vis / r.height >= .5) seenSet.push(st); });
    place();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { var k = seenSet.indexOf(en.target); if (en.intersectionRatio >= .5) { if (k < 0) seenSet.push(en.target); } else if (k >= 0) seenSet.splice(k, 1); });
        place();
      }, { threshold: [0, .5, 1] });
      stages.forEach(function (st) { io.observe(st); });
    }
    // a keyboard reader tabbing into a stage gets it whole at once, before the browser scrolls the stop into view
    d.addEventListener('focusin', function (e) { var now = stages.some(function (st) { return st.contains(e.target); }); if (now !== inside) { inside = now; place(); } });
  };
  var watchDock = function () {
    if (watching) return; watching = true;
    watchStage();
    if (dock && window.MutationObserver) new MutationObserver(clear).observe(dock, { attributes: true, attributeFilter: ['class', 'style'] });
    var both = function () { room(); clear(); };
    addEventListener('resize', both);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(both);
    lastY = window.scrollY || 0; away = footOnly || (reading && !atTop());     // arriving part-way down a page (a kept place): it waits out of the way
    var tick = false;
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; scrolled(); }); } }, { passive: true });
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { footOn = es[es.length - 1].isIntersecting; var was = away; away = reading ? (footOnly ? !footOn : !(atTop() || footOn)) : away && !footOn; if (away !== was) clear(); }).observe(foot);
  };
  var show = function (focus) {
    if (!bar) build();
    watchDock();
    bar.hidden = false; root.setAttribute('data-consent-ask', '');
    var c = read(); bar.toggleAttribute('data-reopened', !!focus);
    bar.querySelector('[data-consent-yes]').setAttribute('aria-pressed', String(!!c && c.value === 'granted'));
    bar.querySelector('[data-consent-no]').setAttribute('aria-pressed', String(!!c && c.value === 'denied'));
    room(); clear();
    if (focus) bar.querySelector('.cx-consent-h').focus({ preventScroll: true });
  };
  var hide = function () {
    if (!bar) return;
    var had = bar.contains(d.activeElement); bar.hidden = true; root.removeAttribute('data-consent-ask');
    // the room it kept in a story's opening is given back only while that opening is on screen: once the reader is past
    // it, taking it away would shorten the page above them and move the line they are reading
    var hero = d.querySelector('.cx-film-open, .mx-open');
    if (!hero || hero.getBoundingClientRect().bottom > 0) { root.style.removeProperty('--cx-consent-room'); root.removeAttribute('data-consent-room'); }
    // a reopened question returns focus to the button that opened it, also when the answer was clicked (Safari does not
    // focus a clicked button, so the focus would otherwise fall back to the page)
    if (had || (opener && (!d.activeElement || d.activeElement === d.body))) {
      if (opener && d.contains(opener) && !opener.hidden) opener.focus();
      else { var main = d.getElementById('main'); if (main) { if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); } }
    }
    opener = null;
  };
  var choose = function (value) {
    var before = read(); var c = write(value);
    if (value === 'granted') start(); else if (before && before.value === 'granted' || loaded) stop(); else dropCookies();
    hide();
    status.textContent = value === 'granted' ? T.savedOn : T.savedOff;
    setTimeout(function () { if (status) status.textContent = ''; }, 6000);
    paintState(c);
  };

  /* ---------- "Privacy choices": footer and privacy page ---------- */
  var paintState = function (c) {
    c = c === undefined ? read() : c;
    var when = c ? new Date(c.date).toLocaleDateString(lang() === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    var txt = !c ? T.stateNone : (c.value === 'granted' ? T.stateOn : T.stateOff).replace('{date}', when);
    var all = d.querySelectorAll('[data-consent-state]'); for (var i = 0; i < all.length; i++) all[i].textContent = txt;
  };
  var openers = d.querySelectorAll('[data-consent-open]');
  for (var i = 0; i < openers.length; i++) {
    openers[i].hidden = false;
    openers[i].addEventListener('click', function (e) { e.preventDefault(); opener = e.currentTarget; show(true); });
  }
  paintState();
  // "Erase everything" (site.js) also erases the stored answer: analytics stops at once and is asked about again next time
  d.addEventListener('spritual:erase', function () { stop(); paintState(null); });

  var c = read();
  if (c && c.value === 'granted') start();
  else if (!c) {
    try { localStorage.removeItem(KEY); } catch (e) {} dropCookies();
    // [joyB] the first visit's title sequence (the home page's titles, or the opening screen) is not asked over: the question
    // comes once it has finished. A safety timer asks anyway if the opening never reports its end.
    var titles = root.classList.contains('cx-js') && !root.classList.contains('cx-seen') && d.querySelector('.cx-spark');
    if (root.dataset.opening === 'live' || titles) {
      var asked = false, ask = function () { if (asked) return; asked = true; d.removeEventListener('spritual:enter', onEnter); if (!read()) show(false); };
      var onEnter = function () { setTimeout(ask, 900); };
      if (root.dataset.opening === 'live') d.addEventListener('spritual:enter', onEnter);
      setTimeout(ask, titles ? Math.max(1200, ((window.matchMedia && matchMedia('(max-width: 759px), (orientation: landscape) and (max-height: 520px)').matches) ? 6400 : 10200) - (window.performance ? performance.now() : 0))   /* [joyQ] the festival-night sequence runs about 8.5 s (5 s on a phone) */ : 16000);
    } else show(false);
  }
})();
