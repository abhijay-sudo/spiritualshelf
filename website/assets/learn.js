// Spiritual [learn]: the small client side of who's who on tap, the word hint and the recall card (src/learn-build.mjs,
// assets/learn.css). Deferred on every story page. Everything it shows was written into the page by the build; nothing is
// fetched, and the only thing kept on the device is that the word hint has been shown once (spritual:learn).
(() => {
  const d = document, root = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const el = (tag, cls, text) => { const x = d.createElement(tag); if (cls) x.className = cls; if (text) x.textContent = text; return x; };
  root.classList.add('lrn-js');

  /* ---------- who's who: the body of a person's card (site.js and type.js place it where a word's meaning would go) ---------- */
  window.SpritualWho = {
    card(def) {
      const f = d.createDocumentFragment();
      if (def.alt || def.title) { const t = el('span', 'lrn-who-t'); if (def.alt) { const a = el('span', '', def.alt); a.lang = def.altLang || ''; t.append(a); } if (def.title) t.append(def.alt ? ' · ' : '', def.title); f.append(t); }
      f.append(el('span', 'lrn-who-l', def.def));
      if (def.ties && def.ties.length) { const r = el('span', 'lrn-who-r'); r.append(el('i', '', def.tiesK), def.ties.join(' · ')); f.append(r); }
      if (def.href) { const a = el('a', 'lrn-who-a', def.meet); a.href = def.href; f.append(a); }
      return f;
    },
  };
  // In the film the card is a popover at the end of the page: Tab from the open name goes into it, and back out again.
  const gloss = $('#gloss');
  const glossOpen = () => { try { return !!gloss && gloss.matches(':popover-open'); } catch { return !!gloss && !gloss.hidden; } };
  d.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !glossOpen()) return;
    const a = $('a', gloss), btn = $('.term--who[aria-expanded="true"]'); if (!a || !btn) return;
    if (!e.shiftKey && d.activeElement === btn) { e.preventDefault(); a.focus(); }
    else if (d.activeElement === a) { if (e.shiftKey) e.preventDefault(); btn.focus({ preventScroll: true }); if (!e.shiftKey) { try { gloss.hidePopover(); } catch { gloss.hidden = true; } } }
  });

  /* ---------- the word hint: shown once, in the film, with the first lit words that carry an underlined word ---------- */
  const hint = $('[data-lrn-hint]');
  const kept = () => { try { return JSON.parse(localStorage.getItem('spritual:learn') || '{}') || {}; } catch { return {}; } };
  const keep = (k) => { try { const v = kept(); v[k] = 1; localStorage.setItem('spritual:learn', JSON.stringify(v)); } catch {} };
  if (hint && !kept().hint && 'MutationObserver' in window) {
    const pair = $$('[data-reader] .scene-text .pair').find((p) => $('.term', p));
    if (pair) {
      let on = false, done = false;
      const place = () => { const t = $(':scope > .fm-t', pair) || pair, r = t.getBoundingClientRect(), cs = getComputedStyle(t), x = r.left + (parseFloat(cs.paddingLeft) || 0); hint.style.left = Math.round(x) + 'px'; hint.style.top = Math.round(Math.min(r.bottom + 8, innerHeight - 30)) + 'px'; hint.style.maxWidth = Math.max(160, Math.round(r.width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0))) + 'px'; };
      const off = () => { if (!on) return; on = false; hint.classList.remove('is-on'); };
      const check = () => {
        const lit = root.classList.contains('fm-live') && pair.classList.contains('on');
        if (lit && !on && !done) { on = done = true; hint.textContent = hint.dataset.lrnHint; place(); hint.classList.add('is-on'); keep('hint'); }
        else if (!lit) off();
      };
      new MutationObserver(check).observe(pair, { attributes: true, attributeFilter: ['class'] });
      d.addEventListener('click', (e) => { if (on && e.target.closest && e.target.closest('.term')) off(); });
      addEventListener('resize', () => { if (on) place(); });
      check();
    }
  }

  /* ---------- before you begin, in the film: the story's first words must stay a beat the film can hold (film.js calls a beat
     taller than a little over half the screen "long" and lets it pass by instead). So on a short screen or at a large text size this
     block lets go of its parts one step at a time (learn.css, data-fit), asking the film to measure again, until it is held. ---------- */
  const begin = $('.story-intro .lrn-begin'), head = $('.story-head'), intro = $('.story-intro');
  if (begin && head && intro && 'MutationObserver' in window) {
    let sig = '', t = 0;
    const fit = () => {
      if (!root.classList.contains('fm-live') || !intro.classList.contains('fm-t') || head.classList.contains('is-open') || !window.SpritualFilmMeasure) return;
      const sum = $('.story-sum', intro), cs = sum ? getComputedStyle(sum) : null, now = [innerWidth, innerHeight, intro.offsetWidth, cs && cs.fontSize, cs && cs.lineHeight].join('|');
      if (now === sig) return; sig = now;
      let lv = 0; begin.removeAttribute('data-fit'); window.SpritualFilmMeasure();
      while (head.classList.contains('fm-long') && lv < 5) { begin.dataset.fit = String(++lv); window.SpritualFilmMeasure(); }
    };
    const soon = () => { clearTimeout(t); t = setTimeout(fit, 260); };
    new MutationObserver(soon).observe(root, { attributes: true, attributeFilter: ['class', 'data-size', 'data-hisize', 'data-lead', 'data-measure', 'data-read', 'data-mode'] });   // the film coming up, and the reader's text settings
    new MutationObserver(soon).observe(intro, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', soon, { passive: true });
    soon();
  }

  /* ---------- the recall card: the reader's own order beside the story's; a miss is never marked ---------- */
  for (const q of $$('[data-lrn-order]')) {
    const cards = $$('.lrn-card', q), say = $('.lrn-say', q), ans = $('.lrn-ans', q), seq = [];
    const paint = () => cards.forEach((b) => { const i = seq.indexOf(b), t = $('.lrn-card-t', b).textContent; b.setAttribute('aria-pressed', String(i >= 0)); $('.lrn-no', b).textContent = i >= 0 ? i + 1 : ''; if (i >= 0) b.setAttribute('aria-label', `${i + 1}. ${t}`); else b.removeAttribute('aria-label'); });
    cards.forEach((b) => { b.disabled = false; b.addEventListener('click', () => {
      const i = seq.indexOf(b); if (i >= 0) seq.splice(i, 1); else seq.push(b);
      paint();
      if (seq.length === cards.length) { say.textContent = seq.every((x, j) => !j || +x.dataset.k > +seq[j - 1].dataset.k) ? say.dataset.yes : say.dataset.is; ans.open = true; } else say.textContent = '';
    }); });
  }
  for (const q of $$('[data-lrn-line]')) {
    const it = q.dataset.lrnLine, opts = $$('.lrn-opt', q), say = $('.lrn-say', q), ans = $('.lrn-ans', q);
    opts.forEach((b) => { b.disabled = false; b.addEventListener('click', () => {
      opts.forEach((x) => { x.setAttribute('aria-pressed', String(x === b)); x.classList.toggle('is-it', x.dataset.k === it); });
      say.textContent = b.dataset.k === it ? say.dataset.yes : ''; ans.open = true;
    }); });
  }
})();
