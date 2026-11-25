// Home motion (motion-home.css): the page below the hero. Progressive: the page is whole without this script.
// 1. a gold rule under each section heading (drawn once as the heading arrives; simply there when motion is off)
// 2. arrivals: a group (a header, a shelf of cards, the footer) comes in once, in sequence, when about 15% of it is on
//    screen. Only what is below the fold at load is ever hidden, and it is shown at once if it was already scrolled past.
// 3. the character select: where each tile is dealt from (a shallow arc), measured once just before the select is reached
(() => {
  const d = document, root = d.documentElement, home = d.querySelector('main.cx-home');
  if (!home) return;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => root.dataset.motion === 'reduce' || root.dataset.motion === 'light' || !!root.dataset.light || mq.matches;
  const $$ = (s, c) => [...(c || home).querySelectorAll(s)];

  /* ---------- 1. the rule ---------- */
  for (const h of $$('.cx-head > .cx-h2')) {
    const r = d.createElement('span'); r.className = 'mh-rule'; r.setAttribute('aria-hidden', 'true'); h.classList.add('mh-h'); h.append(r);
  }
  if (calm() || !('IntersectionObserver' in window)) return;

  /* ---------- 2. arrivals ---------- */
  const groups = $$('.cx-head, .cx-now-body, .cx-posters, .cx-cast-row, .cx-ways-grid, .cx-strip, .cx-rail, .mx-kand-grid, .cx-manas-card, .cx-finale-card').concat($$('.cx-credits', d));
  const fresh = groups.filter((g) => g.getBoundingClientRect().top > innerHeight * .9);
  const done = (g) => {
    g.classList.remove('mh-g', 'mh-in');
    for (const c of g.children) c.style.removeProperty('--mh-i');
    const m = g.closest('.cx-manas'); if (m) m.classList.remove('mh-lit');
  };
  root.classList.add('mh-js');
  fresh.forEach((g) => { g.classList.add('mh-g'); [...g.children].forEach((c, i) => c.style.setProperty('--mh-i', Math.min(i, 7))); });
  const io = new IntersectionObserver((es) => es.forEach((en) => {
    const g = en.target, r = en.boundingClientRect;
    if (r.bottom < 0 || calm()) { io.unobserve(g); done(g); return; }                       // already passed, or motion was put to rest
    if (!en.isIntersecting || en.intersectionRect.height < Math.min(r.height, innerHeight) * .15) return;
    io.unobserve(g); g.classList.add('mh-in');
    const m = g.closest('.cx-manas'); if (m) m.classList.add('mh-lit');
    setTimeout(() => done(g), 2600);
  }), { threshold: [0, .05, .15, .3, .6] });
  fresh.forEach((g) => io.observe(g));
  // a print while hidden groups were waiting: nothing stays hidden
  addEventListener('beforeprint', () => fresh.forEach((g) => { io.unobserve(g); done(g); }));

  /* ---------- 3. the select ---------- */
  const sel = home.querySelector('.cx-select'), grid = sel && sel.querySelector('.cx-sel-grid');
  if (grid) {
    const once = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return; once.disconnect();
      const r = grid.getBoundingClientRect(), cx = r.left + r.width / 2, half = r.width / 2 || 1;
      const rows = [...grid.children].map((li) => [li, li.getBoundingClientRect()]);
      for (const [li, b] of rows) {
        const t = Math.max(-1, Math.min(1, (b.left + b.width / 2 - cx) / half));
        li.style.setProperty('--mh-rot', (t * 2.4).toFixed(2) + 'deg');
        li.style.setProperty('--mh-dx', (-t * 16).toFixed(1) + 'px');
        li.style.setProperty('--mh-dy', (9 + Math.abs(t) * 9).toFixed(1) + 'px');
      }
    }, { rootMargin: '60% 0px' });
    once.observe(sel);
  }
})();
