// Paths (paths.css): the arrival (the gold thread draws, the stops settle one after another) and two arrows for a mouse.
// Nothing here is needed to read the path: the page is complete without it, and with reduced motion it never runs.
(() => {
  const root = document.documentElement, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sec = $('[data-path]'); if (!sec) return;
  const rail = $('.path-rail', sec);
  if (root.classList.contains('cx-js') && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { sec.classList.add('is-in'); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
    io.observe(sec); setTimeout(() => sec.classList.add('is-in'), 6000);   // (a safety: never leave it unseen)
  }
  if (!rail || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const lang = root.lang === 'hi', arr = (dir) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'path-arr path-arr--' + (dir < 0 ? 'l' : 'r'); b.setAttribute('aria-label', dir < 0 ? (lang ? 'पिछली कथाएँ' : 'Earlier stories') : (lang ? 'अगली कथाएँ' : 'Later stories')); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'; b.addEventListener('click', () => { const w = $('.path-stop', rail)?.offsetWidth || 300; rail.scrollBy({ left: dir * w * 1.6, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'reduce' ? 'auto' : 'smooth' }); }); return b; };
  // the arrows sit on the paintings' middle, over the rail's two ends: a wrapper that is only theirs
  const wrap = document.createElement('div'); wrap.className = 'path-rail-wrap'; rail.replaceWith(wrap); wrap.append(rail);
  const l = arr(-1), r = arr(1); wrap.append(l, r);
  let t = 0; const sync = () => { t = 0; const pic = $('.path-pic', rail); if (pic) wrap.style.setProperty('--ay', Math.round(pic.getBoundingClientRect().top - wrap.getBoundingClientRect().top + pic.offsetHeight / 2 - 22) + 'px'); const max = rail.scrollWidth - rail.clientWidth; l.classList.toggle('is-on', rail.scrollLeft > 8); r.classList.toggle('is-on', rail.scrollLeft < max - 8); };
  rail.addEventListener('scroll', () => { if (!t) t = requestAnimationFrame(sync); }, { passive: true }); addEventListener('resize', sync); sync();
})();
