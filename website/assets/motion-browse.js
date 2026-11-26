// Browse motion (lane 4): the small script behind motion-browse.css. Progressive: every page shows everything without it.
// 1. the first screen of a grid or list carries on the rise the stylesheet began (same animation, so nothing restarts)
// 2. what lies below waits, then rises once when about a sixth of it is in view (IntersectionObserver, no scroll listener)
// 3. long text pages reveal by block below the first screen only: what is on screen at load is never delayed
// 4. filtering: anything still waiting is shown at once, and the results breathe once as a whole
(() => {
  const d = document, root = d.documentElement;
  const still = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LIST = '.grid > .card, .fest-list > li, .cx-terms > .cx-term, .cx-qs > li, .mx-kand-grid > li';
  const TEXT = '.cast-notes-in > div, .cast-chips > li';
  // epic.js dims these (.ep-rv) after the first paint and brings them back; on the first screen that reads as a flicker,
  // so there they are simply left as they were drawn. Below the first screen epic.js keeps its own arrival.
  const FIRST = '.cx-plain-in > h1, .cx-plain-text > *, .cx-plain-in > .cx-btn, .fest-list > li, .fest-item, .block-head, .legend, main > .wrap > .note';
  if (still() || !('IntersectionObserver' in window)) { root.classList.add('mb-js'); return; }

  const vh = innerHeight, edge = vh * .92;
  const settle = (el) => { el.classList.remove('mb-in', 'mb-wait', 'mb-text'); el.style.removeProperty('--mb-i'); el.style.removeProperty('--mb-t'); };
  const arm = (el) => {
    let fin = false;
    const done = (e) => { if (fin || (e && e.target !== el)) return; fin = true; el.removeEventListener('animationend', done); el.removeEventListener('animationcancel', done); settle(el); };
    el.addEventListener('animationend', done); el.addEventListener('animationcancel', done); setTimeout(done, 2600);
  };

  // measure everything first, then write, so the browser lays the page out once
  const undim = [...d.querySelectorAll(FIRST)].filter((el) => el.classList.contains('ep-rv')).map((el) => ({ el, r: el.getBoundingClientRect() })).filter((x) => x.r.top < edge && x.r.bottom > 0);
  undim.forEach(({ el }) => el.classList.remove('ep-rv', 'ep-rv--side', 'ep-rv--grow', 'ep-rv--soft'));
  const pick = (sel, text) => [...d.querySelectorAll(sel)].filter((el) => !el.classList.contains('th-rv') && !el.classList.contains('ep-rv') && !el.hidden)
    .map((el) => ({ el, text, r: el.getBoundingClientRect() })).filter((x) => x.r.width || x.r.height);
  const items = pick(LIST, false).concat(pick(TEXT, true));
  const waiting = [];
  items.forEach(({ el, text, r }) => {
    if (r.top >= edge) { if (r.height <= vh * 1.5) { el.classList.add('mb-wait'); if (text) el.classList.add('mb-text'); waiting.push(el); } }
    else if (!text && r.bottom > 0 && Array.prototype.indexOf.call(el.parentNode.children, el) < 12) { el.classList.add('mb-in'); arm(el); }
  });
  root.classList.add('mb-js');

  const io = new IntersectionObserver((es) => {
    const now = es.filter((en) => en.isIntersecting && en.intersectionRatio >= .15 && en.target.classList.contains('mb-wait'));
    if (!now.length) return;
    now.sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left));
    now.forEach((en, k) => {
      const el = en.target; io.unobserve(el);
      el.style.setProperty('--mb-i', Math.min(k, 8)); el.style.setProperty('--mb-t', '0ms');
      el.classList.remove('mb-wait'); el.classList.add('mb-in'); arm(el);
    });
  }, { threshold: [.15, .3] });
  waiting.forEach((el) => io.observe(el));
  const showAll = () => waiting.forEach((el) => { if (el.classList.contains('mb-wait')) { io.unobserve(el); settle(el); } });
  addEventListener('beforeprint', showAll);

  // Filtering. site.js hides and shows cards with the hidden attribute, a moment after the reader chooses; the grid breathes
  // once at the instant the set of cards really changes (seen by a MutationObserver, so the two can never be out of step).
  const form = d.querySelector('[data-filters]'), grid = d.querySelector('[data-grid]');
  if (form) form.addEventListener('input', showAll);
  if (grid && 'MutationObserver' in window) {
    let t = 0;
    new MutationObserver((rs) => {
      if (!rs.some((m) => m.target.parentNode === grid && (m.oldValue !== null) !== m.target.hasAttribute('hidden'))) return;
      showAll();
      if (root.dataset.lifeLibFlip) return;   // [life] life-library moves the cards itself (FLIP): no dim and re-form
      const n = performance.now(); if (n - t < 840 || still()) return; t = n;
      // where a hidden card leaves the layout late (display in its transition), dim first and re-form in the dark; else just come up
      const c = grid.querySelector('.card'), late = !!c && getComputedStyle(c).transitionProperty.indexOf('display') > -1;
      grid.classList.remove('mb-swap', 'mb-swap2'); void grid.offsetWidth; grid.classList.add(late ? 'mb-swap2' : 'mb-swap');
    }).observe(grid, { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true, subtree: true });
  }
})();
