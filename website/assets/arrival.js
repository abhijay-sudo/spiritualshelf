// [arrival] Two small jobs for the controls a first visit needs in reach (styles: arrival.css; markup: layout() and library() in src/build.mjs).
//  1. A control in the menu that opens another sheet (Reading comfort): the menu closes first, so one sheet is open at a time, and when that
//     sheet closes the focus goes back to the Menu button. site.js still does the opening (its [data-open] handler runs after this one).
//  2. Search: every page links to the library's field (library/#q). Arriving there puts the caret in the field; on the library itself the
//     link does not reload the page, it brings the field into view and focuses it.
// No storage, no network, nothing that moves by itself.
(() => {
  const d = document;
  const still = () => d.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  d.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('dialog.ed-menu [data-open]'); if (!b) return;
    const menu = b.closest('dialog'), next = d.getElementById(b.dataset.open); if (!menu.open || !next || next === menu) return;
    const opener = d.querySelector('[data-open="' + menu.id + '"]'), shown = opener && opener.getClientRects().length;
    menu.close();
    if (!shown) return;
    try { opener.focus({ preventScroll: true }); } catch (x) {}   // the sheet about to open records this as where it came from
    next.addEventListener('close', () => { const at = d.activeElement; if (!d.querySelector('dialog[open]') && (!at || at === d.body || menu.contains(at))) { try { opener.focus({ preventScroll: true }); } catch (x) {} } }, { once: true });
  }, true);

  const q = d.getElementById('q');
  if (q && q.matches('[data-filters] input')) {
    // (a field already in view, clear of a fixed header, is not moved: on a phone the page then stays at its top, heading whole)
    const inView = () => { const r = q.getBoundingClientRect(), h = d.querySelector('[data-ed-head]'), top = h && getComputedStyle(h).position === 'fixed' ? h.getBoundingClientRect().bottom : 0; return r.top >= top + 8 && r.bottom <= innerHeight * .75; };
    const land = (scroll) => { if (scroll && !inView()) q.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' }); try { q.focus({ preventScroll: true }); } catch (x) {} };
    if (location.hash === '#q') land(false);   // (the browser has already scrolled to the field: #q, with its scroll margin in arrival.css)
    addEventListener('hashchange', () => { if (location.hash === '#q') land(false); });
    d.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[data-arrival-search]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); try { history.replaceState(null, '', '#q'); } catch (x) {}
      // from inside the menu: after the menu's own close has handed the focus back to its button (whoever closed it), so the field keeps it
      const menu = a.closest('dialog');
      if (menu) { menu.addEventListener('close', () => land(true), { once: true }); if (menu.open) menu.close(); } else land(true);
    });
  }
})();
