/* Spritual: the look-closer glint (lane G). Loaded with `defer` on the stories that have a brass lens (about 3 KB).
   In the film, while the painting on screen is one the lens has sourced details for (content/lens.json: the story's opening
   painting, a scene that borrows it, or a scene the file lists), one small gold glint rests at the edge of the screen.
   A tap (or Enter) opens the lens in a sheet over the film; Back, Esc, the close button or a tap beside it brings the
   reader to the same place in the story. In the closing beat (after the last painting) the glint gives way to a fourth door
   beside the other three (second in the row), "Look closer", so the lens is one tap from "The end" and not only far below it.
   Tap-first: nothing depends on hover. Quiet: it appears a moment after a painting settles, twinkles a few times and rests;
   its words ("Look closer") show only on keyboard focus and on hover, so no label ever lies over a painting being read.
   Reduced motion (or Light mode): a still mark, no twinkle, no fade. Nothing is fetched until the glint is first wanted
   (its stylesheet) and nothing more until it is tapped (the lens's own script, if the page has not loaded it yet).
   The lens itself is the section the story already carries (#look-closer, or a hidden one per scene): the sheet lends it
   the screen and gives it back. No claim is made here: every sentence is the lens's own, quoted from the telling with its scene. */
(function () {
  var d = document, root = d.documentElement, U = null;
  try { U = JSON.parse(d.getElementById('ui').textContent).glint || null; } catch (e) {}
  var reader = d.querySelector('[data-reader]'), hero = d.querySelector('.cx-film-open');
  if (!U || !reader || !hero || !window.IntersectionObserver) return;
  var T = U.t, btn = null, key = null, last = '0', held = 0, showT = 0, hideT = 0, raf = 0, cssP = null, dlg = null;
  var still = function () { return root.dataset.motion === 'reduce' || !!root.dataset.light || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };

  // resolves true only when the glint's stylesheet has really arrived (onload, or its sheet is there at the 2.5 s cap); false on an error or
  // a cap with nothing. A failure is forgotten, so a later wish tries again. Nothing is ever shown unstyled: the page's own #look-closer is the fallback.
  function css() {
    if (cssP) return cssP;
    var p = cssP = new Promise(function (ok) {
      var l = d.createElement('link'), fin = 0, end = function (v) {
        if (fin) return; fin = 1; clearTimeout(t); ok(v);
        if (!v) { if (l.parentNode) l.parentNode.removeChild(l); if (cssP === p) cssP = null; }
      }, t = setTimeout(function () { end(!!l.sheet); }, 2500);
      l.rel = 'stylesheet'; l.href = U.css; l.onload = function () { end(true); }; l.onerror = function () { end(false); }; d.head.appendChild(l);
    });
    return p;
  }
  // which painting is on screen, as a key into U.at: '0' the opening, 'n' a scene; null: none (or no film). While the glint has the
  // keyboard's focus, or its sheet is open, it stays for the reader to finish with, whatever the film does meanwhile.
  // (only a keyboard's focus keeps it, and only until the page moves: a finger that tapped it and closed the sheet does not hold it against the film)
  function kb(el) { try { return el.matches(':focus-visible'); } catch (e) { return true; } }
  function where() {
    var k = look();
    if (!k && key && ((btn && d.activeElement === btn && kb(btn) && Math.abs(scrollY - held) < 40) || (dlg && dlg.open))) return key;
    return k;
  }
  function look() {
    if (!root.classList.contains('fm-live') || root.classList.contains('fm-ended')) return null;
    var stage = d.querySelector('.fm-stage');
    if (stage && stage.classList.contains('cb-on')) return null;   // the closing beat carries its own door (below)
    var a = d.querySelector('.fm-rail ol a[aria-current]'), m = a && /page-(\d+)/.exec(a.getAttribute('href') || '');
    if (m) return U.at[m[1]] ? m[1] : null;
    return scrollY < hero.offsetHeight * 0.45 && U.at[0] ? '0' : null;
  }
  function make() {
    if (btn) return btn;
    btn = d.createElement('button'); btn.type = 'button'; btn.className = 'jg'; btn.hidden = true; btn.setAttribute('aria-haspopup', 'dialog');
    btn.dataset.side = U.side; btn.style.setProperty('--jg-y', U.y + '%');
    btn.innerHTML = '<span class="jg-s" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 1c.6 6.2 2.8 9.4 11 11-8.2 1.6-10.4 4.8-11 11-.6-6.2-2.8-9.4-11-11 8.2-1.6 10.4-4.8 11-11Z"/></svg></span><span class="jg-l" aria-hidden="true"></span>';
    btn.querySelector('.jg-l').textContent = T.say;
    btn.addEventListener('click', function () { open(U.at[key] || U.at[0], btn); });
    btn.addEventListener('blur', tick);
    // a keyboard that arrives while it is fading is kept: the glint stays, for the painting it was last shown for, until focus leaves
    btn.addEventListener('focus', function () { if (!kb(btn)) return; held = scrollY; clearTimeout(hideT); if (!key) key = last; btn.classList.add('is-on'); });
    park('0');
    return btn;
  }
  // Where it sits in the tab order (it is drawn at the screen's edge either way): by the painting it is for. On a scene, right after that scene's
  // share button, so a keyboard reader who has tabbed in to the scene reaches it with the next Tab; at the opening, after the scene thread.
  // Never moved while it holds the focus.
  function park(k) {
    if (!btn || btn.contains(d.activeElement)) return;
    var sc = k && k !== '0' && d.getElementById('page-' + k), at = sc && sc.querySelector('.sh-glyph, [data-share]');
    if (at) at.after(btn); else if (sc) sc.appendChild(btn);
    else { var rail = d.querySelector('.fm-rail'); if (rail) rail.after(btn); else reader.prepend(btn); }
  }
  function hide() {
    clearTimeout(showT); if (!btn) return;
    var b = btn; b.classList.remove('is-on');
    clearTimeout(hideT); hideT = setTimeout(function () { if (!b.classList.contains('is-on')) b.hidden = true; }, 700);   // out of the tab order once it has faded
  }
  function show() {
    var k = where(); if (k !== key || !k) return;
    css().then(function (ok) {
      if (!ok || where() !== key) return;
      var b = make(); park(key); b.hidden = false;
      b.setAttribute('aria-label', key === '0' ? T.hero : T.scene);
      void b.offsetWidth; b.classList.add('is-on');
    });
  }
  // the film moves its bead and its closing beat a moment after the scroll that caused them: watch them, not only the scroll
  var obs = null;
  function attach() {
    if (obs) return; var ol = d.querySelector('.fm-rail ol'), st = d.querySelector('.fm-stage'); if (!ol || !st) return;
    obs = new MutationObserver(tick); obs.observe(ol, { subtree: true, attributes: true, attributeFilter: ['aria-current'] }); obs.observe(st, { attributes: true, attributeFilter: ['class'] });
  }
  function sync() {
    raf = 0; attach(); var k = where(); if (k === key) return;
    key = k; if (k) last = k; hide();
    if (k) showT = setTimeout(show, 900);
  }
  var tick = function () { if (!raf) raf = requestAnimationFrame(sync); };
  addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick);
  new MutationObserver(tick).observe(root, { attributes: true, attributeFilter: ['class'] });
  addEventListener('pageshow', tick);
  tick();

  /* ---------- after the film: a fourth door in the closing beat (same markup as its three), so "Look closer" is one tap from "The end" ---------- */
  function door() {
    var nav = d.querySelector('.cb-doors'); if (!nav || nav.querySelector('[data-jg-door]')) return;
    var a = d.createElement('a'); a.className = 'cb-door cb-i'; a.href = '#' + U.at[0]; a.setAttribute('data-jg-door', '');
    a.innerHTML = '<span class="cb-dk"></span><b class="cb-dn"></b><svg class="cb-da" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
    a.firstChild.textContent = T.say; a.children[1].textContent = T.door;
    a.addEventListener('click', function (e) { e.preventDefault(); open(U.at[0], a); });
    // second, right after "next story": on a short phone the first screen of the closing beat holds about three doors, and this one is about the painting
    // the reader has just left, so it goes where it can be seen. The doors' staggered entrance is kept in order, set on each door itself.
    nav.insertBefore(a, nav.children[1] || null);
    Array.prototype.forEach.call(nav.children, function (el, i) { el.style.setProperty('--cb-d', (1700 + 80 * i) + 'ms'); });
  }
  door();

  /* ---------- the sheet: it lends the lens's own section the screen ---------- */
  var holder = null, mark = null, sec = null, pushed = false, opener = null, opening = false;
  // The lens's script and styles are fetched when the reader nears the section; a tap may come earlier. Resolves true once the lens's styles
  // are there (up to 8 s: the reader asked) and its first painting has decoded (capped at 2.5 s), so the sheet never rises on an unstyled or squeezed lens; false when
  // the styles did not come (the sheet then stays shut and the page's own section remains the way to it). The script need not be waited for.
  function lens(s) {
    var js = s.dataset.lensJs, cs = s.dataset.lensCss; if (!js) return Promise.resolve(true);
    var find = function (sel, attr, v) { var n = d.querySelectorAll(sel), u = new URL(v, location.href).href; for (var i = 0; i < n.length; i++) if (n[i][attr] === u) return n[i]; return null; };
    var cap = function (pr, v, ms) { return Promise.race([pr, new Promise(function (ok) { setTimeout(function () { ok(v); }, ms || 2500); })]); };
    var sheet = Promise.resolve(true);
    if (cs) {
      var l = find('link[rel="stylesheet"]', 'href', cs), fresh = !l;
      if (!l) { l = d.createElement('link'); l.rel = 'stylesheet'; l.href = cs; }
      if (!l.sheet) sheet = cap(new Promise(function (ok) { l.addEventListener('load', function () { ok(true); }); l.addEventListener('error', function () { if (fresh && l.parentNode) l.parentNode.removeChild(l); ok(false); }); }), !!l.sheet, 8000);   // the reader asked for it: the styles get longer than the glint's own
      if (fresh) d.head.appendChild(l);
    }
    if (!find('script[src]', 'src', js)) { var j = d.createElement('script'); j.src = js; j.defer = true; d.head.appendChild(j); }
    var im = s.querySelector('img'), pic = Promise.resolve(true);
    if (im) { im.loading = 'eager'; if (im.decode) pic = cap(im.decode().then(function () { return true; }, function () { return true; }), true); }
    return Promise.all([sheet, pic]).then(function (r) { return r[0]; });
  }
  function build() {
    if (dlg) return;
    dlg = d.createElement('dialog'); dlg.className = 'jg-sheet'; dlg.tabIndex = -1; dlg.lang = root.lang; dlg.setAttribute('aria-label', T.say);
    dlg.innerHTML = '<div class="jg-in"><button type="button" class="jg-x" aria-label="' + T.close.replace(/"/g, '&quot;') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div class="jg-hold"></div></div>';
    d.body.appendChild(dlg); holder = dlg.querySelector('.jg-hold');
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.jg-x')) close(); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    ['wheel', 'touchmove'].forEach(function (ev) { dlg.addEventListener(ev, function (e) { if (e.target === dlg) e.preventDefault(); }, { passive: false }); });
  }
  function open(id, from) {
    if (opening || (dlg && dlg.open)) return;   // a second tap while it opens does nothing
    sec = id && d.getElementById(id); if (!sec) return;
    opener = from; build(); opening = true;
    // the mark stays pressed (still, gold) while the lens's styles and first painting arrive; a failure just ends it, quietly
    if (from) { from.classList.add('is-wait'); from.setAttribute('aria-busy', 'true'); }
    var calm = function () { opening = false; if (from) { from.classList.remove('is-wait'); from.removeAttribute('aria-busy'); } };
    css().then(function (ok) { return ok ? lens(sec) : false; }).then(function (ok) {
      calm(); if (!ok) { if (from && from.hasAttribute('data-jg-door')) { try { location.hash = id; } catch (e) {} } return; }   // no styles: the page's own section is the way
      mark = d.createComment('jg'); sec.parentNode.replaceChild(mark, sec); holder.appendChild(sec);
      dlg.classList.remove('is-in'); dlg.showModal(); holder.parentNode.scrollTop = 0;
      try { history.pushState({ jg: 1 }, '', location.href); pushed = true; } catch (e) {}
      requestAnimationFrame(function () { requestAnimationFrame(function () { dlg.classList.add('is-in'); }); });
      // focus goes to the close button, and is put back if the engine (WebKit, while the lens script starts) lets it slip in the first moments
      var x = dlg.querySelector('.jg-x'), grab = function () { if (dlg.open && !dlg.contains(d.activeElement)) x.focus({ preventScroll: true }); };
      x.focus({ preventScroll: true }); requestAnimationFrame(function () { requestAnimationFrame(grab); }); setTimeout(grab, 150); setTimeout(grab, 450);
    });
  }
  addEventListener('popstate', function () { if (pushed && dlg && dlg.open) { pushed = false; close(true); } });
  function close(fromBack) {
    if (!dlg || !dlg.open) return;
    if (pushed && fromBack !== true) { pushed = false; try { if (history.state && history.state.jg) history.back(); } catch (e) {} }
    dlg.classList.remove('is-in');
    var done = function () {
      if (sec && mark && mark.parentNode) { mark.parentNode.replaceChild(sec, mark); mark = null; }
      if (dlg.open) dlg.close();
      held = scrollY;
      try { if (opener && !opener.hidden) opener.focus({ preventScroll: true }); } catch (e) {}
      tick();
    };
    if (still()) done(); else setTimeout(done, 340);
  }
})();
