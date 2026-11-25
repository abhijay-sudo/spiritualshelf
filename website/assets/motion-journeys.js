// Journeys (motion-journeys.css): what the page-to-page transitions need to know, just in time.
// Loaded in the head, before the first paint, because pagereveal fires at the first paint. It only listens; it reads the
// page when a navigation is actually happening. Without it (or without cross-document view transitions) pages simply change.
// 1. which way the reader is going (data-nav="back" on a history step, also when the page comes back from the bfcache)
// 2. Back reverses the opening: a story's or a person's opening folds down into the picture it grew from
// 3. the home character select: the figure on the stage grows into that person's page
(() => {
  const d = document, root = d.documentElement;
  const calm = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORY = '.cx-poster-pic img, .cx-now-screen img, .card-art img, .ed-card-pic img, .cx-next-pic img';
  const WHO = '.cast-tile--scene .cast-tile-pic, .cast-tile-pic .art, .cx-cast-pic img';
  const isWho = (p) => /\/characters\/[^/]+\/$/.test(p);
  const isStory = (p) => /\/stories\//.test(p);
  // how much of a box is on screen (0 to 1)
  const seen = (el) => { const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return 0; const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); return w <= 0 || h <= 0 ? 0 : (w * h) / (r.width * r.height); };
  const taken = () => d.querySelector('[style*="cx-hero"]');
  const give = (el, vt, kind) => {
    el.style.viewTransitionName = 'cx-hero'; if (kind) root.dataset.vt = kind;
    const clear = () => { el.style.viewTransitionName = ''; if (kind && root.dataset.vt === kind) delete root.dataset.vt; };
    try { vt.finished.then(clear, clear); } catch (x) { clear(); }
  };
  const get = (k) => { try { const v = sessionStorage.getItem(k); sessionStorage.removeItem(k); return v; } catch (x) { return null; } };
  const put = (k, v) => { try { sessionStorage.setItem(k, v); } catch (x) {} };

  /* ---------- 3. the stage figure of the home select (cinema.js names every other card and tile) ---------- */
  let stage = null;
  d.addEventListener('click', (e) => {
    stage = null;
    const a = e.target.closest && e.target.closest('a.cx-sel-go[href], a.cx-sel-tile[href]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const sel = a.closest('[data-select]'); if (!sel || a.querySelector(WHO)) return;
    const fig = sel.querySelector('[data-sel-hero]');
    const pic = fig && fig.currentSrc && seen(fig) > .6 ? fig : null;
    if (pic) stage = { pic, path: a.pathname };
  }, true);

  addEventListener('pageswap', (e) => {
    const vt = e.viewTransition, act = e.activation; if (!vt || !act || calm()) return;
    let to; try { to = new URL(act.entry.url).pathname; } catch (x) { return; }
    if (act.navigationType === 'traverse') {
      // 2. leaving an opening by Back or Forward: it is the shared element while it is still on screen
      stage = null;
      const t = d.querySelector('[data-vt-target]');
      if (t && !taken() && (isStory(location.pathname) || isWho(location.pathname)) && seen(t) > .5) { put('mj-back', location.pathname); give(t, vt, ''); }
      return;
    }
    if (stage && stage.path === to && stage.pic.isConnected && !taken()) { put('cx-vt', to); put('cx-vtk', 'who'); give(stage.pic, vt, 'who'); }
    stage = null;
  });

  addEventListener('pagereveal', (e) => {
    const act = window.navigation && navigation.activation;
    const back = !!act && act.navigationType === 'traverse';
    if (act) { if (back) root.dataset.nav = 'back'; else delete root.dataset.nav; }
    const vt = e.viewTransition; if (!vt) return;
    const from = get('mj-back'); if (!from || !back || calm() || taken()) return;
    let was = ''; try { was = new URL(act.from.url).pathname; } catch (x) {}
    if (was !== from) return;
    // the picture this opening grew from: the first link to that page whose picture is whole on screen
    const who = isWho(from); let pic = null;
    const links = d.links;
    for (let i = 0; i < links.length && !pic; i++) {
      const a = links[i]; if (a.pathname !== from || a.origin !== location.origin) continue;
      let p = who ? a.querySelector(WHO) : (a.querySelector(STORY) || (a.closest('.card') && a.closest('.card').querySelector('.card-art img')));
      if (!p && who && a.matches('.cx-sel-go')) { const s = a.closest('[data-select]'); p = s && s.querySelector('[data-sel-hero]'); if (p && !p.currentSrc) p = null; }
      if (p && seen(p) > (who ? .6 : .98)) pic = p;
    }
    if (pic) give(pic, vt, 'back');
  });
})();
