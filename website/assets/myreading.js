/* My reading: "Stories in progress" (every story you stopped partway, not only the latest) and "Kept on this phone" (the stories
   the offline cache holds). Both are read on this device only (the places already kept in localStorage; the browser's own cache);
   nothing is sent anywhere. A section with nothing in it stays hidden. About 2 KB. */
(function () {
  var d = document, ui = {}; try { ui = JSON.parse(d.getElementById('ui').textContent); } catch (e) {}
  var IDX = ui.stories || {}, lang = ui.lang === 'hi' ? 'hi' : 'en', fmt = function (s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); };
  var nb = function (x) { return String(x).replace(/ (\S+)$/, ' $1'); };
  var secIn = d.querySelector('[data-myr="in"]'), secOff = d.querySelector('[data-myr="off"]');
  if (!secIn || !secOff) return;
  function item(s, i, href, sub, p) {
    var li = d.createElement('li'); li.style.setProperty('--i', Math.min(i, 8));
    var a = d.createElement('a'); a.className = 'myr-item'; a.href = href;
    var pic = d.createElement('span'); pic.className = 'myr-pic'; pic.setAttribute('aria-hidden', 'true');
    if (s.p) { var im = d.createElement('img'); im.src = s.p; im.alt = ''; im.width = 96; im.height = 96; im.decoding = 'async'; im.loading = i > 5 ? 'lazy' : 'eager'; pic.appendChild(im); }
    var tx = d.createElement('span'); tx.className = 'myr-txt';
    var t = d.createElement('strong'); t.textContent = nb(s.t); var sb = d.createElement('span'); sb.className = 'myr-sub'; sb.textContent = sub;
    tx.appendChild(t); tx.appendChild(sb);
    if (p != null) { var bar = d.createElement('span'); bar.className = 'myr-bar'; bar.setAttribute('aria-hidden', 'true'); var f = d.createElement('i'); bar.style.setProperty('--p', p.toFixed(3)); bar.appendChild(f); tx.appendChild(bar); }
    a.appendChild(pic); a.appendChild(tx); li.appendChild(a); return li;
  }
  function show(sec, items) { if (!items.length) return; sec.querySelector('ol').replaceChildren.apply(sec.querySelector('ol'), items); sec.hidden = false; }

  // stories you are in: a place was kept (assets/site.js) and the story is not finished; the one you read last first
  var places = {}; try { places = JSON.parse(localStorage.getItem('spritual:places') || '{}') || {}; } catch (e) {}
  show(secIn, Object.keys(places).filter(function (k) { var p = places[k]; return IDX[k] && p && !p.d && +p.s < +p.t && +p.s >= 1; })
    .sort(function (a, b) { return (places[b].at || 0) - (places[a].at || 0); })
    .map(function (k, i) { var p = places[k], s = IDX[k], n = Math.max(1, +p.s), t = Math.max(1, +p.t); return item(s, i, s.h.split('#')[0] + '#page-' + n, fmt(ui.sceneOf, { n: n, t: t }), n / t); }));

  // stories kept on this phone: the offline cache's own records (a story is kept under "<lang>-<slug>"), and its page must still be in it
  if (!window.caches) return;
  var origin = location.origin, REC = origin + '/__kept/';
  caches.open('spritual-keep').then(function (c) {
    return c.keys().then(function (ks) {
      var recs = ks.map(function (k) { return k.url; }).filter(function (u) { return u.indexOf(REC) === 0 && u.slice(REC.length, REC.length + 3) === lang + '-' && IDX[u.slice(REC.length + 3)]; });
      return Promise.all(recs.map(function (u) {
        var slug = u.slice(REC.length + 3), s = IDX[slug], page = new URL(s.h.split('#')[0], location.href).href;
        return Promise.all([c.match(page), c.match(u).then(function (r) { return r ? r.json() : null; }, function () { return null; })]).then(function (g) { return g[0] ? { s: s, b: g[1] && g[1].b } : null; });
      }));
    });
  }).then(function (all) {
    var size = function (b) { return b ? (b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB') : ui.myrOffline; };
    show(secOff, all.filter(Boolean).map(function (x, i) { return item(x.s, i, x.s.h.split('#')[0], size(x.b), null); }));
  }, function () {});
})();
