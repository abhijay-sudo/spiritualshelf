// Journeys (motion-journeys.css): what the page-to-page transitions need to know, just in time.
// Loaded in the head, before the first paint, because pagereveal fires at the first paint. It only listens; it reads the
// page when a navigation is actually happening. Without it (or without cross-document view transitions) pages simply change.
// 1. which way the reader is going (data-nav="back" on a history step, also when the page comes back from the bfcache)
// 2. Back reverses the opening: a story's or a person's opening folds down into the picture it grew from
// 3. the home character select: the figure on the stage grows into that person's page
(() => {
  const d = document, root = d.documentElement;
  // [life chrome] effects Off, or paused in this tab: the page push (assets/life-vt.css) keeps to today's plain fade; read here because the push is chosen at the first paint
  try { if (localStorage.getItem('spritual:fx') === 'off') root.setAttribute('data-life-vt', 'off'); if (sessionStorage.getItem('spritual:fxpause') === '1') { root.setAttribute('data-life-vt', 'off'); root.setAttribute('data-fx-paused', ''); } } catch (x) {}
  const calm = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORY = '.cx-poster-pic img, .cx-now-screen img, .card-art img, .ed-card-pic img, .cx-next-pic img';
  const FRAME = '.card-art, .cx-poster-pic, .ed-card-pic, .cx-next-pic, .cx-now-screen';
  const WHO = '.cast-tile--scene .cast-tile-pic, .cast-tile-pic .art, .cx-cast-pic img';
  const isWho = (p) => /\/characters\/[^/]+\/$/.test(p);
  const isStory = (p) => /\/stories\//.test(p);
  // how much of a box is on screen (0 to 1)
  const seen = (el) => { const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return 0; const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); return w <= 0 || h <= 0 ? 0 : (w * h) / (r.width * r.height); };
  const taken = () => d.querySelector('[style*="cx-hero"]');
  const has = (img) => !!img.currentSrc && !img.currentSrc.startsWith('data:');   // [findings] a picture still on its clear stand-in has none yet
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
    const pic = fig && has(fig) && seen(fig) > .6 ? fig : null;
    if (pic) stage = { pic, path: a.pathname };
  }, true);

  addEventListener('pageswap', (e) => {
    const vt = e.viewTransition, act = e.activation; if (!vt || !act || calm()) return;
    let to; try { to = new URL(act.entry.url).pathname; } catch (x) { return; }
    // [alive] 0. a language switch inside a story's film (type.js has marked the leave .ty-leave): the film's stage (fixed; the painting and its shading) goes across as
    // its own layer, 'fm-hold', and is held over the arriving page until that page's own painting is up (pagereveal below, motion-journeys.css). Not the whole page: a
    // browser's snapshot of a whole page comes out empty once the page has been scrolled past about 16,000 px, which the later scenes of every story are.
    if (act.navigationType !== 'traverse' && root.classList.contains('ty-leave') && root.classList.contains('fm-live')) {
      const st = d.querySelector('.fm-stage');
      if (st) { st.style.viewTransitionName = 'fm-hold'; put('spritual:mj-hold', '1'); const clear = () => { st.style.viewTransitionName = ''; }; try { vt.finished.then(clear, clear); } catch (x) { clear(); } }
    }
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
    const hold = get('spritual:mj-hold');   // [alive] (read on every arrival, so it never outlives the page change it was left for)
    const vt = e.viewTransition; if (!vt) return;
    // [alive] 4. a language switch inside a story (boot.js has marked the arrival .ty-arr): the painting the reader was looking at is held over this page until this
    // page's own painting is up (motion-journeys.css): the film's stage by itself when the page being left sent it across ('lang-hold'), else that whole page ('lang')
    if (!back && !calm() && root.classList.contains('ty-arr') && !root.dataset.vt) { const k = hold ? 'lang-hold' : 'lang'; root.dataset.vt = k; const done = () => { if (root.dataset.vt === k) delete root.dataset.vt; }; try { vt.finished.then(done, done); } catch (x) { done(); } return; }
    const from = get('mj-back'); if (!from || !back || calm() || taken()) return;
    let was = ''; try { was = new URL(act.from.url).pathname; } catch (x) {}
    if (was !== from) return;
    // the picture this opening grew from: the first link to that page whose picture is whole on screen
    const who = isWho(from); let pic = null;
    const links = d.links;
    for (let i = 0; i < links.length && !pic; i++) {
      const a = links[i]; if (a.pathname !== from || a.origin !== location.origin) continue;
      let p = who ? a.querySelector(WHO) : (a.querySelector(STORY) || (a.closest('.card') && a.closest('.card').querySelector('.card-art img')) || (a.matches('[data-vt-link], .cx-btn') ? d.querySelector('.cx-now-screen img') : null));
      // a story card's picture is taller than its frame (the frame clips it): the frame is what the reader sees, so the frame
      // is what the opening folds into; naming the picture itself landed it over the caption and popped when the morph ended
      if (p && !who) p = p.closest(FRAME) || p;
      if (!p && who && a.matches('.cx-sel-go')) { const s = a.closest('[data-select]'); p = s && s.querySelector('[data-sel-hero]'); if (p && !has(p)) p = null; }
      if (p && seen(p) > (who ? .6 : .98)) pic = p;
    }
    if (!pic) return;
    give(pic, vt, 'back');
    // what lies over that picture on the shelf (a card's words, its Save button) rides above the fold on its own layer and
    // comes in as the picture lands; left in the page it sat hidden under the travelling picture and popped at the end
    const over = [], pr = pic.getBoundingClientRect(), sibs = pic.parentElement ? pic.parentElement.children : [];
    for (let i = 0; i < sibs.length && over.length < 3; i++) {
      const el = sibs[i]; if (el === pic || el.classList.contains('sheen') || el.style.viewTransitionName) continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right <= pr.left || r.left >= pr.right || r.bottom <= pr.top || r.top >= pr.bottom) continue;
      el.style.viewTransitionName = 'mj-cap-' + (over.length + 1); over.push(el);
    }
    const tidy = () => over.forEach((el) => { el.style.viewTransitionName = ''; });
    try { vt.finished.then(tidy, tidy); } catch (x) { tidy(); }
  });
})();
