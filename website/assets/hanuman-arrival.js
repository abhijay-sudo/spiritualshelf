// Spritual: "The Arrival", Hanuman's signature entrance (styles: hanuman-arrival.css). Two places, one person:
//   1. his page (/characters/hanuman/, /hi/...): the sky, the flight and the landing are CSS from the first paint; this script adds
//      what CSS cannot: the letters of his name, the embers (one small canvas), a phone's tilt, the wait for the picture to decode, and
//      "press a key or touch the stage and it ends at once".
//   2. the home page's character select (loaded lazily by cinema.js the first time he is chosen): a short sunrise flare behind the
//      painting, then a halo and a few embers, for as long as he is the chosen one.
// Nothing here makes a sound, asks for a permission or reaches another origin. Still and complete: reduced motion, Save-Data, Light mode.
(() => {
  'use strict';
  const d = document, root = d.documentElement;
  if (window.SpritualHanuman) return;
  const $ = (s, r = d) => r.querySelector(s);
  const reduced = () => root.dataset.motion === 'reduce' || !!root.dataset.light || root.classList.contains('ep-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = navigator, mem = nav.deviceMemory || 8, cores = nav.hardwareConcurrency || 8;
  const weak = mem <= 2 || cores <= 3 || /(^|-)[23]g$/.test((nav.connection && nav.connection.effectiveType) || '');
  const mid = !weak && (mem <= 4 || cores <= 6);
  const lite = weak || mid;                             // these also lose the turning rays and the highlight (the light stays)
  const COUNT = weak ? 30 : mid ? 42 : 56;             // embers, by device tier (30 to 60)
  const DPR = () => Math.min(devicePixelRatio || 1, weak ? 1.5 : 2);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Embers: one small canvas, a glow sprite drawn per ember; it rests when hidden, off-screen or in reduced motion ---------- */
  const sprite = (() => { const c = d.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); if (!g) return null;
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,244,210,1)'); r.addColorStop(.3, 'rgba(255,190,100,.8)'); r.addColorStop(1, 'rgba(255,130,50,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; })();
  const Embers = (canvas, area, n, ramp) => {
    // area() -> { x, y, w, h } of the canvas on screen and the box the embers rise around (px, viewport coordinates)
    const g = canvas.getContext('2d'); if (!g || !sprite) return { start() {}, stop() {}, fit() {} };
    let ps = [], raf = 0, last = 0, W = 0, H = 0, bx = 0, bw = 0, by = 0, bh = 0, t0 = 0, run = false, sc = 1;
    const fit = () => { const a = area(); if (!a || !a.w || !a.h) return; const k = DPR(); W = a.w; H = a.h; bx = a.bx; bw = a.bw; by = a.by; bh = a.bh; sc = clamp(bh / 640, .7, 1.4);
      canvas.style.left = a.x + 'px'; canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; canvas.width = Math.round(W * k); canvas.height = Math.round(H * k); g.setTransform(k, 0, 0, k, 0, 0); };
    const spawn = (p, fresh) => { p.x = bx + rnd(-.2, 1.2) * bw; p.y = by + bh * (fresh ? rnd(.1, 1) : rnd(.7, 1.02)); p.vy = rnd(14, 40) * sc; p.sw = rnd(4, 14) * sc; p.f = rnd(.5, 1.2); p.ph = rnd(0, 6.28); p.s = rnd(5, 15) * sc;
      p.L = rnd(5, 11); p.t = fresh ? rnd(0, p.L) : 0; p.a = rnd(.35, .9); p.c = Math.random() < .25 ? 1 : 0; return p; };
    const frame = (now) => { raf = 0; if (!run) return; raf = requestAnimationFrame(frame);
      const dt = now - last; if (weak && dt < 33) return; last = now; const s = Math.min(dt, 64) / 1000;
      const ease = clamp((now - t0) / 2200, 0, 1); g.clearRect(0, 0, W, H);
      for (const p of ps) { p.t += s; if (p.t >= p.L) spawn(p, false); const u = p.t / p.L; const y = p.y - p.vy * p.t; const x = p.x + Math.sin(p.ph + p.t * p.f) * p.sw;
        const a = p.a * ease * Math.min(1, u / .15) * Math.min(1, (1 - u) / .4); if (a < .01) continue;
        g.globalAlpha = a; const z = p.s * (1 - .45 * u); g.drawImage(sprite, x - z / 2, y - z / 2, z, z); }
      g.globalAlpha = 1; };
    return {
      fit,
      start(delay) { if (run) return; fit(); if (!W) return; if (!ps.length) for (let i = 0; i < n; i++) ps.push(spawn({}, true)); run = true; last = performance.now(); t0 = last + (delay || 0) - (ramp ? 0 : 2200); canvas.hidden = false; raf = requestAnimationFrame(frame); },
      stop() { run = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      hide() { this.stop(); canvas.hidden = true; if (W) g.clearRect(0, 0, W, H); },
    };
  };

  /* ---------- 1. His page ---------- */
  const main = $('main.cast-page[data-char="hanuman"]');
  if (main) {
    const hero = $('.cast-hero', main), stage = $('.cast-stage', main), img = $('.cast-cut > img.art', main), h1 = $('.cast-name', main);
    const early = performance.now() < 1400;
    if (lite) main.classList.add('ha-lite');
    // the picture: the sequence waits (a moment at most) for the small copy to decode; the larger copy is swapped in once decoded
    if (img && early && !reduced() && !(img.complete && img.naturalWidth)) {
      main.classList.add('ha-wait');
      let fin = false; const done = () => { if (fin) return; fin = true; main.classList.remove('ha-wait'); };
      (img.decode ? img.decode() : new Promise((r) => img.addEventListener('load', r, { once: true }))).then(done, done);
      // 600 ms at most: only the stage waits, the words never do. Too late for the flight: he is simply there, and fades in once decoded
      setTimeout(() => { if (fin) return; done(); main.classList.add('ha-late'); const ok = () => img.classList.add('ha-ok'); if (img.complete && img.naturalWidth) ok(); else img.addEventListener('load', ok, { once: true }); skip(); }, 600);
    }
    const big = img && img.dataset.srcset;
    if (big) {
      const swap = () => { const t = new Image(); t.sizes = img.sizes || '(max-width: 859px) 70vw, 460px'; t.srcset = big; const go = () => { img.srcset = big; }; (t.decode ? t.decode() : Promise.resolve()).then(go, go); };
      const ready = () => (window.requestIdleCallback ? requestIdleCallback(swap, { timeout: 1500 }) : setTimeout(swap, 400));
      if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
    }
    // the name: letter by letter on a wind (only when it has not begun to arrive: otherwise it stays whole and never flickers)
    if (h1 && early && !reduced() && !h1.querySelector('.ep-l')) {
      const t = $('.cast-name-t', h1); const txt = t && t.textContent;
      if (txt) {
        if (!h1.hasAttribute('aria-label')) h1.setAttribute('aria-label', txt);
        const parts = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter(d.documentElement.lang || 'en', { granularity: 'grapheme' }).segment(txt)].map((x) => x.segment) : [...txt];
        t.textContent = ''; let i = 0;
        for (const ch of parts) { if (/\s/.test(ch)) { t.append(ch); continue; } const s = d.createElement('span'); s.className = 'ep-l'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i++); s.textContent = ch; t.append(s); }
        h1.classList.add('ha-split');
      }
    }
    // the end, at once: any key, or a touch on the stage (the whole first screen), while the sequence is still playing (about four seconds)
    const skip = (e) => { if (e && e.type === 'keydown' && !/^(Escape|Enter| |Spacebar|Arrow(Up|Down|Left|Right)|PageUp|PageDown|Home|End)$/.test(e.key)) return;   // Tab, Shift and the other modifiers on their own do not end it
       main.classList.add('ha-skip'); main.classList.remove('ha-wait'); off(); };
    const off = () => { d.removeEventListener('keydown', skip); if (hero) hero.removeEventListener('pointerdown', skip); };
    d.addEventListener('keydown', skip, { passive: true }); if (hero) hero.addEventListener('pointerdown', skip, { passive: true });
    setTimeout(off, 4600);
    // a device that cannot keep up with the film (most frames over 28 ms in its first seconds) is spared the rest of it: it ends at once, in the still composition
    if (!reduced() && !weak && 'requestAnimationFrame' in window) { let n = 0, slow = 0, last = 0; const probe = (t) => { if (main.classList.contains('ha-skip')) return; if (last) { n++; if (t - last > 28) slow++; } last = t; if (n >= 24) { if (slow > 12) { main.classList.add('ha-lite'); skip(); } return; } requestAnimationFrame(probe); }; setTimeout(() => requestAnimationFrame(probe), 600); }
    // out of sight, everything that loops rests
    let vis = true;
    const layers = () => main.classList.toggle('ha-off', !vis || d.hidden);
    if (hero && 'IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; layers(); sync(); }).observe(hero);
    d.addEventListener('visibilitychange', () => { layers(); sync(); });
    // embers: one canvas over the stage, only as wide as the figure's neighbourhood
    let em = null;
    const front = $('.ha-front', main), box = front && $('.ha-box', front);
    if (front && box && stage) {
      const cv = d.createElement('canvas'); cv.className = 'ha-embers'; cv.setAttribute('aria-hidden', 'true'); cv.hidden = true; front.append(cv);
      em = Embers(cv, () => { const s = stage.getBoundingClientRect(), b = box.getBoundingClientRect(); if (!b.width) return null; const x = Math.max(0, b.left - s.left - b.width * .45), w = Math.min(s.width - x, b.width * 1.9);
        return { x, w, h: s.height, bx: b.left - s.left - x, bw: b.width, by: b.top - s.top, bh: b.height }; }, COUNT, true);
    }
    const live = () => !!em && vis && !d.hidden && !reduced();
    function sync() { if (!em) return; if (live()) em.start(main.classList.contains('ha-skip') ? 0 : 1900); else if (reduced()) em.hide(); else em.stop(); }
    let wasW = innerWidth;
    addEventListener('resize', () => { if (innerWidth !== wasW) { wasW = innerWidth; em && em.fit(); } }, { passive: true });   // never a replay: only the canvas is re-fitted
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-light', 'class'] });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener && matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', sync);
    sync();
    // a phone's tilt, only where the browser needs no permission for it (never asked for): the figure and the sun move a few pixels against each other
    if (hero && matchMedia('(pointer: coarse)').matches && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      let b0 = null, tx = 0, ty = 0, lt = 0;
      addEventListener('deviceorientation', (e) => {
        if (e.gamma == null || e.beta == null || reduced() || !vis || d.hidden) return; const now = performance.now(); if (now - lt < 33) return; lt = now;
        if (b0 == null) { b0 = e.beta; hero.classList.add('ha-tilt'); }
        tx += (clamp(e.gamma / 22, -1, 1) - tx) * .25; ty += (clamp((e.beta - b0) / 22, -1, 1) - ty) * .25;
        hero.style.setProperty('--ep-px', tx.toFixed(3)); hero.style.setProperty('--ep-py', ty.toFixed(3));
      }, { passive: true });
    }
  }

  /* ---------- 2. The home page's select: a flare as he is chosen, then a halo and a few embers ---------- */
  // (he is painted in a scene there, so the rig lies over the painting, on the side his face is: the select's own text is on the other)
  const rigs = new WeakMap();
  const select = (sel, on) => {
    let r = rigs.get(sel);
    if (!r && on) {
      const shade = $('.cx-sel-shade', sel); if (!shade) return;
      const rig = d.createElement('div'); rig.className = 'ha-sel-rig'; rig.setAttribute('aria-hidden', 'true'); rig.innerHTML = '<i class="ha-sel-flare"></i><i class="ha-sel-halo"></i>';
      const cv = d.createElement('canvas'); cv.className = 'ha-sel-embers'; cv.hidden = true; rig.append(cv); shade.after(rig);
      const em = Embers(cv, () => { const b = sel.getBoundingClientRect(); if (!b.width) return null; const phone = b.width < 700, left = sel.classList.contains('is-left');
        const w = phone ? b.width : b.width * .5, x = phone || !left ? b.width - w : 0; const h = b.height * (phone ? .55 : .8);
        return { x, w, h, bx: w * .1, bw: w * .8, by: h * .15, bh: h * .85 }; }, Math.round(COUNT * .4), true);
      r = { rig, em, vis: true }; rigs.set(sel, r);
      if ('IntersectionObserver' in window) new IntersectionObserver((es) => { r.vis = es[0].isIntersecting; if (!sel.classList.contains('ha-on')) return; if (r.vis && !d.hidden && !reduced()) em.start(0); else em.stop(); }).observe(sel);
    }
    if (!r) return;
    const { rig, em } = r;
    if (on && !reduced()) {
      sel.classList.add('ha-on'); rig.classList.remove('is-fire'); void rig.offsetWidth; rig.classList.add('is-fire');
      if (!d.hidden && r.vis) em.start(900);
    } else if (on) { sel.classList.add('ha-on'); em.hide(); }
    else { sel.classList.remove('ha-on'); em.stop(); }
  };
  if (!main) {
    // rest while the page is hidden, wake when it is back; and on a switch to reduced motion
    d.addEventListener('visibilitychange', () => { const s = $('.cx-select.ha-on'); if (!s) return; const r = rigs.get(s); if (!r) return; if (d.hidden) r.em.stop(); else if (!reduced()) r.em.start(0); });
    new MutationObserver(() => { const s = $('.cx-select.ha-on'); const r = s && rigs.get(s); if (r && reduced()) r.em.hide(); }).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-light', 'class'] });
  }
  window.SpritualHanuman = { select };
})();
