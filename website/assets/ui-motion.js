// Spiritual UI motion system (lane E): the small script behind ui-motion.css. Progressive: every page works without it.
// 1. a soft gold lamp that follows a mouse across a card's painting (pointer devices only, never touch)
// 2. one behaviour for every bottom sheet: swipe down to put it away (touch), with the finger carrying the sheet
// 3. paintings that are still arriving rest as a warm sheen (.ui-ph) until they land
// 4. a menu or sheet gives focus back to the button that opened it (Escape, the scrim and a swipe included, in every browser)
(() => {
  const d = document, root = d.documentElement;
  const calm = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Lamp ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let host = null, raf = 0, px = 0, py = 0;
    const hostOf = (t) => { const c = t.closest && t.closest('.grid .card, .cx-poster'); return c ? (c.matches('.card') ? c.querySelector('.card-art') : c) : null; };
    const paint = () => { raf = 0; if (!host) return; const r = host.getBoundingClientRect(); host.style.setProperty('--mx', (px - r.left).toFixed(0) + 'px'); host.style.setProperty('--my', (py - r.top).toFixed(0) + 'px'); };
    d.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || calm()) return;
      const h = hostOf(e.target);
      if (h !== host) {
        if (host) host.classList.remove('is-lit');
        host = h;
        if (h) { if (!h.hasAttribute('data-lit')) { try { if (getComputedStyle(h, '::after').content !== 'none') { host = null; return; } } catch (x) {} h.setAttribute('data-lit', ''); } h.classList.add('is-lit'); }
      }
      px = e.clientX; py = e.clientY; if (host && !raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    d.addEventListener('pointerleave', () => { if (host) host.classList.remove('is-lit'); host = null; }, { passive: true });
  }

  /* ---------- 2. Sheets: swipe down ---------- */
  d.addEventListener('touchstart', (e) => {
    const dlg = e.target.closest && e.target.closest('dialog.sheet[open]'); if (!dlg || e.touches.length !== 1) return;
    // only a bottom sheet (the phone layout) is swiped; a centred card is not
    const rect = dlg.getBoundingClientRect(); if (rect.bottom < innerHeight - 4 || rect.width < innerWidth * .8) return;
    const y0 = e.touches[0].clientY, x0 = e.touches[0].clientX, t0 = e.timeStamp; let dy = 0, on = false, dead = false;
    const move = (m) => {
      if (dead) return; const t = m.touches[0]; dy = t.clientY - y0; const dx = t.clientX - x0;
      if (!on) {
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) { dead = true; return; }
        // the sheet's own text scrolls first; the swipe begins only from its top
        if (dy < 10 || dlg.scrollTop > 0) { if (dy < -6) dead = true; return; }
        on = true; dlg.classList.add('ui-drag');
      }
      m.preventDefault(); dlg.style.translate = '0 ' + Math.max(0, dy * .92) + 'px';
    };
    const end = (m) => {
      dlg.removeEventListener('touchmove', move); dlg.removeEventListener('touchend', end); dlg.removeEventListener('touchcancel', end);
      if (!on) return;
      const v = dy / Math.max(1, m.timeStamp - t0);
      if (dy > Math.min(110, rect.height * .28) || (dy > 40 && v > .55)) {
        // the finger's motion carries on downward: the sheet slides the rest of the way out, then closes (never back up)
        dlg.classList.remove('ui-drag'); dlg.classList.add('ui-away');
        let fin = false; const shut = () => { if (fin) return; fin = true; dlg.classList.remove('ui-away'); dlg.close(); };
        dlg.style.translate = '0 ' + Math.max(rect.height * .6, dy + 90) + 'px'; dlg.style.opacity = '0';
        dlg.addEventListener('transitionend', shut, { once: true }); setTimeout(shut, 340);
      } else { dlg.classList.remove('ui-drag'); dlg.style.translate = ''; }
    };
    dlg.addEventListener('touchmove', move, { passive: false }); dlg.addEventListener('touchend', end); dlg.addEventListener('touchcancel', end);
  }, { passive: true });
  // a sheet closed any way at all leaves nothing behind from a drag
  d.addEventListener('close', (e) => { const t = e.target; if (t && t.classList && t.classList.contains('sheet')) { t.classList.remove('ui-drag', 'ui-away'); t.style.translate = ''; t.style.opacity = ''; } }, true);

  /* ---------- 3. Paintings that are still arriving ---------- */
  const hosts = d.querySelectorAll('.card-art, .ed-mega-pic, .cx-poster-pic, .cast-tile-pic');
  hosts.forEach((h) => {
    const im = h.querySelector('img'); if (!im || im.complete || h.getBoundingClientRect().top > innerHeight * 1.5) return;
    h.classList.add('ui-ph'); const done = () => h.classList.remove('ui-ph');
    im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true });
  });

  /* ---------- 4. Focus goes back where it came from ---------- */
  // (Chromium does this for a modal dialog; WebKit does not, and the full-screen menu is ours.) The opener is whatever held
  // focus (or was pressed) a moment before the dialog opened; when the dialog closes any way at all, focus returns to it.
  let last = null; const back = new WeakMap();
  d.addEventListener('pointerdown', (e) => { last = e.target.closest && e.target.closest('button, a, summary, [role="button"]'); }, true);
  d.addEventListener('keydown', () => { last = null; }, true);
  d.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button, a, summary, [role="button"]'); if (b) last = b; }, true);
  new MutationObserver((rs) => rs.forEach((r) => {
    const t = r.target; if (!t.matches || !t.matches('dialog.sheet, .ed-menu') || r.attributeName !== 'open') return;
    if (t.hasAttribute('open') && !r.oldValue && t.hasAttribute('open')) { const from = (last && last.isConnected && last) || null; back.set(t, from); }
  })).observe(d.body, { attributes: true, attributeFilter: ['open'], subtree: true, attributeOldValue: true });
  d.addEventListener('close', (e) => { const t = e.target, from = back.get(t); if (!from) return; back.delete(t); if (from.isConnected && !t.contains(from)) { try { from.focus({ preventScroll: true }); } catch (x) {} } }, true);
})();
