/* joyh: the roster strip's keyboard and wheel (lane H). A realm lists up to forty-five people; Tab used to walk through
   every one. Now the strip is one stop (roving tabindex): Tab enters on the character in hand, the arrows, Home and End
   move along it (cinema.js), Tab leaves. A name that had to be cut carries its whole self in a title. A mouse wheel over
   the strip moves it sideways while it can, and lets the page scroll when it cannot. */
(() => {
  'use strict';
  const grid = document.querySelector('[data-sel-grid]');
  if (!grid) return;
  const tiles = [...grid.querySelectorAll('.cx-sel-tile')];
  const rove = (to) => tiles.forEach((t) => t.setAttribute('tabindex', t === to ? '0' : '-1'));
  const home = () => tiles.find((t) => t.classList.contains('is-on')) || tiles.find((t) => !t.parentElement.hidden) || tiles[0];
  rove(home());
  grid.addEventListener('focusin', (e) => { const t = e.target.closest?.('.cx-sel-tile'); if (t) rove(t); });
  // the one in hand changes by hover, by the showcase or by a realm: the stop follows it (but never steals focus)
  new MutationObserver(() => { if (!grid.contains(document.activeElement)) rove(home()); }).observe(grid, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  const titleCut = () => tiles.forEach((t) => { const n = t.querySelector('.cx-sel-tile-n'); if (!n || t.parentElement.hidden) return; if (n.scrollWidth > n.clientWidth + 1) t.title = n.textContent.trim(); else t.removeAttribute('title'); });
  titleCut(); document.fonts?.ready.then(titleCut); addEventListener('resize', titleCut, { passive: true });
  new MutationObserver(() => requestAnimationFrame(titleCut)).observe(grid, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  grid.addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || grid.scrollWidth <= grid.clientWidth + 4) return;
    const max = grid.scrollWidth - grid.clientWidth; const at = grid.scrollLeft;
    if ((e.deltaY > 0 && at >= max - 1) || (e.deltaY < 0 && at <= 0)) return;
    e.preventDefault(); grid.scrollLeft = at + e.deltaY;
  }, { passive: false });
})();
