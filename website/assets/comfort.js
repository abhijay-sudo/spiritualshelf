// Spritual [comfort]: the scene whisper ("Scene 4 of 9 · about 5 min left") and the comfort sheet's small behaviours.
// The choices themselves (text size, line spacing, width, Hindi size, Night Lamp, the Aa chip) are set on <html> by boot.js
// before the first paint and changed by site.js's comfort form; the page is complete without this file.
// The whisper: about 170 words a minute, always said as "about". In the film the reading position is film.js's own
// (window.SpritualFilmNow); on the reading page it is measured from the scenes on screen. Nothing is stored or sent.
(() => {
  const d = document, root = d.documentElement;
  root.classList.add('cmf-js');   // the chip and the whisper need a script to work; with motion reduced (no cx-js) they are still wanted
  const w = d.querySelector('[data-whisper]'), reader = d.querySelector('[data-reader]');
  const scenes = [...d.querySelectorAll('.scene[data-w]')];
  if (w && reader && scenes.length) {
    const W = scenes.map((s) => +s.dataset.w || 0), N = scenes.length;
    const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] ?? m));
    const ws = w.querySelector('[data-ws]'), wl = w.querySelector('[data-wl]');
    const hero = reader.querySelector('.cx-film-open'), endSec = reader.querySelector('.story-end');
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    let lastS = '', lastL = '', on = false, raf = 0, tail = 0;
    // words from the reader's place to the end, in the minutes a reader of about 170 words a minute would take
    const leftWords = (k, frac) => { let n = W[k - 1] * (1 - frac); for (let j = k; j < N; j++) n += W[j]; return n; };
    const place = () => {
      raf = 0; const y = scrollY, vh = innerHeight; let k = 1, frac = 0, show = false;
      const f = root.classList.contains('fm') ? window.SpritualFilmNow?.() : null;
      if (f) {
        // film: the film's own position (scene + fraction); the opening and the afterword are not the story
        if (f.at >= 1 && !f.ended) { k = clamp(Math.floor(f.at), 1, N); frac = clamp(f.at - Math.floor(f.at), 0, 1); show = true; }
      } else if (!root.classList.contains('fm')) {
        const hb = hero ? hero.getBoundingClientRect().bottom : 0, et = endSec ? endSec.getBoundingClientRect().top : Infinity;
        if (hb < vh * .2 && et > vh * .6) {
          show = true; const mid = vh * .4;
          for (let i = 0; i < N; i++) { const r = scenes[i].getBoundingClientRect(); if (r.top <= mid) { k = i + 1; frac = clamp((mid - r.top) / Math.max(1, r.height), 0, 1); } }
        }
      }
      if (show !== on) { on = show; w.classList.toggle('is-on', on); }
      if (!show) return;
      const m = leftWords(k, frac) / 170;
      const s = fmt(w.dataset.fmt, { n: k, t: N }), l = m < .75 ? w.dataset.under : fmt(w.dataset.left, { n: Math.max(1, Math.round(m)) });
      if (s !== lastS) { lastS = s; ws.textContent = s; }
      if (l !== lastL) { lastL = l; wl.textContent = l; }
    };
    // (once now, and once more after the film's own easing has settled)
    const kick = () => { if (!raf) raf = requestAnimationFrame(place); clearTimeout(tail); tail = setTimeout(() => { if (!raf) raf = requestAnimationFrame(place); }, 340); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
    // the film starts later than this file: look again when it is live, and when the reading mode changes
    new MutationObserver(kick).observe(root, { attributes: true, attributeFilter: ['class', 'data-read', 'data-mode'] });
    place();
  }
  // Night Lamp is a dark theme of its own: while it is on, the colour choice waits (it is given back when the Lamp goes out)
  const form = d.querySelector('[data-comfort]');
  const sync = () => { const lamp = root.dataset.lamp === 'on'; for (const i of d.querySelectorAll('[data-comfort] input[name="theme"]')) { i.disabled = lamp; i.closest('.chip')?.classList.toggle('is-wait', lamp); } };
  if (form) { sync(); new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-lamp'] }); }
})();
