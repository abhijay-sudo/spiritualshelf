// Spiritual (lane B): "Pick up where you left off", the quiet marks on the library cards, and the Closing Beat's Keep and
// leave-taking. Everything stays on this device (localStorage, in try/catch: the page is whole without it). No counts of
// days, no streaks, no "you haven't read in N days": a place is only a bookmark.
(() => {
  const d = document, root = d.documentElement, hi = (root.lang || 'en').startsWith('hi');
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  // the kept lines are an array; an older offline registry (an object) once shared this key: move it to its own key, never read it as lines
  try { const ov = JSON.parse(localStorage.getItem('spritual:kept') || 'null'); if (ov && !Array.isArray(ov) && typeof ov === 'object') { if (!localStorage.getItem('spritual:offline')) localStorage.setItem('spritual:offline', JSON.stringify(ov)); localStorage.removeItem('spritual:kept'); } } catch {}
  const get = (k, f) => { try { const v = localStorage.getItem('spritual:' + k); if (v == null) return f; const j = JSON.parse(v); return k === 'kept' && !Array.isArray(j) ? f : j; } catch { return f; } };
  const set = (k, v) => { try { localStorage.setItem('spritual:' + k, JSON.stringify(v)); return true; } catch { return false; } };
  const del = (k) => { try { localStorage.removeItem('spritual:' + k); } catch {} };
  const still = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = hi ? {
    pick: (n) => `दृश्य ${n} से आगे पढ़ें?`, resume: (n) => `दृश्य ${n} से आगे पढ़ें`, again: 'फिर से आरंभ करें', arc: (n, t) => `दृश्य ${n} / ${t} तक पढ़ी`, done: 'पूरी पढ़ी हुई कथा', capArc: (n, t) => `दृश्य ${n} / ${t}`, capDone: 'पूरी पढ़ी',
    forgot: 'आपकी जगहें भुला दी गईं।', gone: 'हटा दिया गया।', remove: 'हटाएँ',
  } : {
    pick: (n) => `Pick up at scene ${n}?`, resume: (n) => `Resume from scene ${n}`, again: 'Start again', arc: (n, t) => `Read to scene ${n} of ${t}`, done: 'A story you have finished', capArc: (n, t) => `Scene ${n} of ${t}`, capDone: 'Finished',
    forgot: 'Your places are forgotten.', gone: 'Removed.', remove: 'Remove',
  };
  // [fixS] straight quotes and apostrophes, set as the page sets them (Rama's, "word"): a line kept before the build did this still reads right
  const curl = (x) => String(x).replace(/(\p{L})'(?=\p{L}|\s|$)/gu, '$1\u2019').replace(/(^|[\s(\u2014])"(?=\S)/g, '$1\u201C').replace(/"/g, '\u201D').replace(/(^|[\s(\u2014])'(?=\S)/g, '$1\u2018').replace(/'/g, '\u2019');
  const nbsp = (x) => x.replace(/ (\S+)$/u, ' $1');

  /* ---------- places: one small record per story. The old single place ('last') is carried over once. ---------- */
  const places = () => {
    let pl = get('places', null);
    if (!pl) { const o = get('last', null); pl = {}; if (o && o.slug) pl[o.slug] = { s: +o.scene || 1, t: +o.total || 1, d: +o.scene >= +o.total ? 1 : 0, at: o.at || 0 }; if (Object.keys(pl).length) set('places', pl); }
    return pl;
  };

  /* ---------- marks on the cards: a thin arc for a story part read, a small lit lamp for one finished ---------- */
  const LAMP = '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="cb-fl" d="M24 3c4.4 6.4 7 10.2 7 14.6a7 7 0 0 1-14 0C17 13.2 19.6 9.4 24 3Z"/><path class="cb-wk" d="M24 28v-4.6"/><path class="cb-bw" d="M4 27c5.2 1.6 12 2.3 20 2.3S38.8 28.6 44 27c-1.2 8.3-8.6 14-20 14S5.2 35.3 4 27Z"/></svg>';
  const mark = () => {
    const pl = places(); const here = $('[data-reader]')?.dataset.slug;
    for (const c of $$('.card[data-slug]')) {
      const art = $('.card-art', c); if (!art) continue; const p = pl[c.dataset.slug]; const old = $('.pl-mark', art);
      const key = p ? (p.d ? 'd' : p.s >= 2 && p.s < p.t ? p.s + '/' + p.t : '') : '';
      if (!key) { old?.remove(); continue; }
      if (old && old.dataset.k === key) continue; old?.remove();
      const m = d.createElement('span'); m.className = 'pl-mark' + (p.d ? ' pl-mark--lamp' : ''); m.dataset.k = key; m.setAttribute('role', 'img');   // [fixS] a caption beside the ring or the lamp, so the mark is words and not a riddle
      const cap = d.createElement('span'); cap.className = 'pl-mark-t'; cap.setAttribute('aria-hidden', 'true'); cap.textContent = p.d ? S.capDone : S.capArc(p.s, p.t);
      if (p.d) { m.setAttribute('aria-label', S.done); m.innerHTML = LAMP; }
      else { const f = Math.min(1, Math.max(.04, p.s / p.t)), r = 12, L = 2 * Math.PI * r; m.setAttribute('aria-label', S.arc(p.s, p.t)); m.innerHTML = `<svg viewBox="0 0 30 30" aria-hidden="true"><circle class="pl-arc-bg" cx="15" cy="15" r="${r}"/><circle class="pl-arc" cx="15" cy="15" r="${r}" stroke-dasharray="${(L * f).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 15 15)"/></svg>`; }
      m.append(cap); art.append(m);
    }
  };
  { let q = 0; const go = () => { q = 0; mark(); }; const soon = () => { if (!q) q = requestAnimationFrame(go); };
    mark(); if ($('[data-saved-grid], [data-today], [data-more], [data-cards]') && 'MutationObserver' in window) new MutationObserver(soon).observe($('main') || d.body, { childList: true, subtree: true }); }

  /* ---------- home: the Continue slot is the story's own painting. site.js has set the small one; the larger is fetched once the page has loaded (never on Save-Data) ---------- */
  { const cc = $('.cx-open .cx-continue:not([hidden])'), im = cc && $('[data-continue-pic]', cc);
    if (im && !im.hidden && im.getAttribute('src')) {
      const small = im.getAttribute('src'), big = small.replace('-480.webp', '-900.webp'), on = () => im.classList.add('is-in');
      const sd = navigator.connection && navigator.connection.saveData;
      const go = () => { if (big === small || sd) return; const t = new Image(); t.onload = () => { im.src = big; }; t.src = big; };
      if (im.complete && im.naturalWidth) on(); else { im.addEventListener('load', on, { once: true }); im.addEventListener('error', on, { once: true }); }
      const later = () => (window.requestIdleCallback || setTimeout)(go, { timeout: 4000 });
      if (d.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
    } }

  /* ---------- a story page: one quiet line, "Pick up at scene 4?", and "Start again" beside it ----------
     It lives in the opening card's normal flow, between the buttons and the Keep control (never laid over either), in room that boot.js
     held from the first paint (html.pk-can, joyb.css), so nothing moves when it fades in. It stays until the reader chooses or
     leaves the opening: a timed line is gone before a slow reader has found it. */
  const reader = $('[data-reader]');
  if (reader) {
    const slug = reader.dataset.slug, btns = $('.cx-film-btns'), pl = places(), p = pl[slug];
    if (btns && p && !p.d && p.s >= 2 && p.s <= p.t && !/^#page-/.test(location.hash) && $(`#page-${p.s}`)) {
      // [hfixR G17] the primary button itself becomes "Resume from scene N" (it ignored the saved place and said "Begin the story"); the line beside it keeps only "Start again"
      const prim = $('a[href="#page-1"]', btns); if (prim) prim.dataset.begin = prim.textContent; const pickA = $(`#page-${p.s}`) ? true : false;
      if (prim && pickA) { prim.href = `#page-${p.s}`; prim.textContent = S.resume(p.s); prim.setAttribute('data-resume', String(p.s)); prim.addEventListener('click', () => { d.dispatchEvent(new CustomEvent('spritual:pickup')); }); }
      const el = d.createElement('p'); el.className = 'pk'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', S.pick(p.s));
      el.innerHTML = `<button type="button"></button>`; $('button', el).textContent = S.again;
      btns.after(el); root.classList.add('pk-in');
      const off = () => { el.classList.remove('is-on'); el.classList.add('is-off'); setTimeout(() => { if (!el.contains(d.activeElement)) { el.inert = true; el.hidden = true; root.classList.remove('pk-can', 'pk-in'); } }, still() ? 0 : 700); };
      requestAnimationFrame(() => setTimeout(() => { el.classList.add('is-on'); }, still() ? 0 : 900));
      prim?.addEventListener('click', () => setTimeout(off, 300));
      $('button', el).addEventListener('click', () => {
        const all = get('places', {}); delete all[slug]; set('places', all); const last = get('last', null); if (last && last.slug === slug) del('last');
        if (prim) { prim.href = '#page-1'; prim.textContent = prim.dataset.begin || prim.textContent; prim.removeAttribute('data-resume'); } off(); prim?.focus({ preventScroll: true });
      });
    } else root.classList.remove('pk-can');   // boot.js held room for a line that will not come
  }

  /* ---------- the Closing Beat: Keep this (privately, on this device) and the leave-taking to the next story ---------- */
  const cb = $('[data-closing]');
  if (cb) {
    const btn = $('[data-keepline]', cb), note = $('[data-keep-note]', cb), lbl = $('[data-keep-t]', cb);
    const idOf = (e) => e.slug === cb.dataset.slug && e.lang === (root.lang || 'en').slice(0, 2);
    if (btn) {
      const kept = () => get('kept', []).some(idOf);
      const paint = (say) => { const k = kept(); btn.setAttribute('aria-pressed', String(k)); const was = lbl.textContent; lbl.textContent = k ? cb.dataset.kept : lbl.dataset.label; note.classList.toggle('is-on', k && !!say); note.textContent = k && say ? cb.dataset.note : ''; if (!k) note.classList.remove('is-on'); return was; };
      lbl.dataset.label = lbl.textContent; btn.hidden = false;
      // (storage may be unavailable: then the lamp says nothing is kept rather than pretending)
      let ok = true; try { localStorage.setItem('spritual:probe', '1'); localStorage.removeItem('spritual:probe'); } catch { ok = false; }
      if (!ok) btn.hidden = true; else paint(false);
      btn.addEventListener('click', () => {
        const all = get('kept', []); const i = all.findIndex(idOf);
        if (i >= 0) all.splice(i, 1);
        else all.unshift({ slug: cb.dataset.slug, lang: (root.lang || 'en').slice(0, 2), scene: +cb.dataset.scene, title: cb.dataset.title, line: cb.dataset.line, src: cb.dataset.src, at: Date.now() });
        set('kept', all.slice(0, 80)); paint(true);
      });
    }
    // leaving for the next story: the dark closes over the painting, then the next opening takes it from there
    cb.addEventListener('click', (e) => {
      const a = e.target.closest('[data-cb-next]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || still() || !root.classList.contains('fm-live')) return;
      e.preventDefault(); const v = d.createElement('div'); v.className = 'cb-veil'; v.setAttribute('aria-hidden', 'true'); d.body.append(v);
      requestAnimationFrame(() => v.classList.add('is-on')); setTimeout(() => { location.href = a.href; }, 600);
      addEventListener('pageshow', () => v.remove(), { once: true });
    });
  }

  /* ---------- my reading: the lines kept, and a way to forget where you stopped ---------- */
  const list = $('[data-kept-list]');
  if (list) {
    const block = list.closest('[data-pl-block]');
    const render = () => {
      const all = get('kept', []).filter((e) => e && e.line); block.hidden = !all.length;
      list.replaceChildren(...all.map((e) => {
        const li = d.createElement('li'); li.className = 'kept-line'; const q = d.createElement('q'); q.lang = e.lang || ''; q.textContent = curl(e.line);
        const n = d.createElement('p'); n.className = 'note'; n.textContent = `${e.title} · ${hi ? 'दृश्य' : 'Scene'} ${e.scene} · ${e.src}`;
        const b = d.createElement('button'); b.type = 'button'; b.textContent = S.remove; b.setAttribute('aria-label', `${S.remove}: ${e.line}`);
        b.addEventListener('click', () => { const a = get('kept', []).filter((x) => !(x.slug === e.slug && x.lang === e.lang)); set('kept', a); render(); (list.querySelector('button') || $('[data-pl-forget] button'))?.focus(); });
        li.append(q, n, b); return li;
      }));
    };
    render();
  }
  const fg = $('[data-pl-forget]');
  if (fg) {
    const b = $('button', fg), msg = $('[role="status"]', fg);
    b.addEventListener('click', () => { del('places'); del('last'); msg.textContent = S.forgot; $$('.pl-mark').forEach((m) => m.remove()); $$('[data-continue-block], [data-continue]').forEach((x) => { x.hidden = true; }); });
  }
})();
