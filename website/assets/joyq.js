// [joyQ] The festival-night title sequence (cinema.css / joyq.css own the timing; this file does the few things CSS cannot):
// gives the four glimpses their paintings (first visit only, so a returning reader never downloads them), drifts marigold
// petals through the lamplight, rings the temple bell only if the reader has already switched the site's sound on, stands the
// whole layer down when the sequence ends, and, if the animation clock has stalled, puts the finished composition up at once.
(() => {
  const root = document.documentElement;
  const open = document.querySelector('.cx-home .cx-open');
  if (!open) return;
  const playing = () => root.classList.contains('cx-js') && !root.classList.contains('cx-seen');
  const tk = matchMedia('(max-width: 759px), (orientation: landscape) and (max-height: 520px)').matches ? .6 : 1;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const titles = playing();

  /* ---- glimpses: the paintings arrive only when the titles are going to play ---- */
  if (titles) for (const img of open.querySelectorAll('img.cx-glim[data-src]')) { img.srcset = img.dataset.srcset; img.src = img.dataset.src; }

  /* ---- the sequence's own clock: the line of light's animation (it started with the page) ---- */
  const spark = open.querySelector('.cx-spark');
  const clock = () => { try { return spark && spark.getAnimations()[0]; } catch (e) { return null; } };
  const age = () => { const a = clock(); return a && typeof a.currentTime === 'number' ? a.currentTime / 1000 / tk : (performance.now() / 1000 / tk); };

  if (titles) {
    // a stalled sequence (a throttled or frozen compositor, a browser that does not run the animation) must not hide the
    // words: if by 2.4 s the clock has hardly moved, the finished composition goes up at once
    setTimeout(() => { if (!playing()) return; const a = clock(); const w = open.querySelector('.cx-w'); const wa = w && w.getAnimations && w.getAnimations()[0];
      if (!a || a.playState === 'paused' || (typeof a.currentTime === 'number' && a.currentTime < 900) || (w && !wa)) root.classList.add('cx-seen'); }, 2400);
    // the bell: a ripple of light always; a sound only if the reader has already turned the site's sound on (site.js decides)
    const ring = open.querySelector('.cx-bell');
    const ra = ring && ring.getAnimations && ring.getAnimations()[0];
    if (ra) { const d = (ra.effect && ra.effect.getComputedTiming ? ra.effect.getComputedTiming().delay : 4900 * tk) - (ra.currentTime || 0); setTimeout(() => { if (playing()) document.dispatchEvent(new CustomEvent('spritual:bell')); }, Math.max(0, d)); }
    // when the way in has arrived, the layer is taken out of the page: nothing keeps animating under the finished opening
    const foot = open.querySelector('.cx-open-foot'); const fa = foot && foot.getAnimations && foot.getAnimations()[0];
    const end = () => root.classList.add('cx-fest-end');
    if (fa && fa.finished) fa.finished.then(end, () => {}); setTimeout(end, 11000 * Math.max(tk, .7));
  }

  /* ---- marigold petals drifting in the light: a few big soft petals on one small canvas ---- */
  const cv = open.querySelector('.cx-petals');
  const still = () => root.classList.contains('cx-seen') || root.classList.contains('cx-fest-end') || root.classList.contains('ep-lite') || root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still() || !cv || !cv.getContext || !root.classList.contains('cx-js') || root.classList.contains('ep-lite')) return;
  const g = cv.getContext('2d');
  const light = (navigator.deviceMemory || 8) < 4 || (navigator.hardwareConcurrency || 8) <= 2;
  const N = Math.round((tk < 1 ? 9 : 16) * (light ? .6 : 1));
  // one petal, drawn once and stamped: a marigold petal, saffron to gold, with a darker vein
  const sp = document.createElement('canvas'); sp.width = 40; sp.height = 64;
  { const c = sp.getContext('2d'); const gr = c.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#ffcf5a'); gr.addColorStop(.55, '#ff9a1c'); gr.addColorStop(1, '#d9580a');
    c.fillStyle = gr; c.beginPath(); c.moveTo(20, 2); c.bezierCurveTo(40, 16, 42, 46, 20, 62); c.bezierCurveTo(-2, 46, 0, 16, 20, 2); c.fill();
    c.strokeStyle = 'rgba(150,50,0,.35)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(20, 8); c.lineTo(20, 56); c.stroke(); }
  let seed = 20261122; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let W = 0, H = 0, ps = [], raf = 0, last = 0, onScreen = true;
  const make = (fresh) => { const z = .35 + .65 * rnd(); return { x: rnd() * W, y: fresh ? -30 - rnd() * H * .3 : rnd() * H, z, s: (11 + 15 * z) * (W < 760 ? .75 : 1), vy: 9 + 17 * z, ph: rnd() * 6.283, f: .35 + rnd() * .5, r: rnd() * 6.283, vr: (rnd() - .5) * 1.3, flip: rnd() * 6.283, vf: 1 + rnd() * 1.6, a: .5 + .45 * z }; };
  const size = () => { const k = Math.min(devicePixelRatio || 1, tk < 1 ? 1 : 1.5); const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; W = w; H = h; cv.width = Math.round(W * k); cv.height = Math.round(H * k); g.setTransform(k, 0, 0, k, 0, 0); ps = Array.from({ length: N }, () => make(false)); };
  const frame = (now) => {
    raf = 0; if (still()) { if (cv.width) g.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; return; }
    if (!onScreen || document.hidden) { last = 0; return; }
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; const t = now / 1000; const a = playing() ? age() : 99;
    g.clearRect(0, 0, W, H);
    // they begin once the lamps are lit (2.4 s), all of them through the sequence; afterwards a few keep falling, quietly
    const on = clamp((a - 2.4) / 1.6); const keep = a < 9.5 ? 1 : clamp(1 - (a - 9.5) / 2) * .6 + .4;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]; p.y += p.vy * dt; p.x += (Math.sin(t * p.f + p.ph) * 16 * p.z - 5) * dt; p.r += p.vr * dt; p.flip += p.vf * dt;
      if (p.y > H + 30 || p.x < -30) { Object.assign(p, make(true)); p.x = rnd() * (W + 60); }
      const share = i / ps.length; if (share > keep && keep < 1) continue;
      g.globalAlpha = p.a * on * (share > keep ? 0 : 1); if (g.globalAlpha < .02) continue;
      const fy = .35 + .65 * Math.abs(Math.cos(p.flip));   // a turning petal: foreshortened and back
      const k = cv.width / W; g.setTransform(k, 0, 0, k, 0, 0);
      g.translate(p.x, p.y); g.rotate(p.r); g.drawImage(sp, -p.s * .31, -p.s * .5 * fy, p.s * .62, p.s * fy);
      g.setTransform(k, 0, 0, k, 0, 0);
    }
    g.globalAlpha = 1; go();
  };
  const go = () => { if (!raf && !still() && onScreen && !document.hidden) raf = requestAnimationFrame(frame); };
  size(); addEventListener('resize', () => { size(); });
  // when the sequence ends, or reduced motion is switched on live, the canvas is cleared and left alone
  const stop = () => { if (still()) { if (raf) cancelAnimationFrame(raf); raf = 0; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; } };
  new MutationObserver(stop).observe(root, { attributes: true, attributeFilter: ['class', 'data-motion'] });
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', stop); } catch (e) {}
  document.addEventListener('visibilitychange', () => { last = 0; go(); });
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; last = 0; go(); }).observe(open);
  go();
})();
