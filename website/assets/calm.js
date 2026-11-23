// The calm tier. Light mode (data-light on the page) is set before the first paint by boot.js; this script keeps it in
// step with the Reading comfort switch, and is the automatic governor.
//
// The governor, last and gentlest: only after the page has loaded, only while the reader is scrolling, and only when
// two stretches of scrolling in a row (thirty frames each) drop many frames. Then the motion rests for this tab (Light mode, data-light="auto") and a kind
// note says so, with one touch to bring it back. What is kept: the single word "rest" or "back" in this tab's
// sessionStorage, so the next page of the tab starts as this one ended. The measurement itself is never stored, sent or
// compared with anything, and it reads nothing about the device: it is only how this page felt, a moment ago.
(() => {
  const root = document.documentElement, d = document;
  const hi = root.lang === 'hi';
  // the language switch reads as two segments: a touch on the one you are already reading in changes nothing (the link
  // itself, by keyboard or with scripts off, still switches)
  d.addEventListener('click', (e) => { const c = e.target && e.target.closest && e.target.closest('.ed-lang-cur, .fm-lang-o.is-cur'); if (c) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  const nb = (s) => s.replace(/\s+(\S+)$/, '\u00a0$1');   // the last two words never part
  const WORDS = hi ? { note: 'बैटरी बचाने के लिए गति को आराम दे रहे हैं।', back: 'गति वापस लाएँ' } : { note: 'Resting the motion to save your battery.', back: 'Bring it back' };
  const ss = { get: () => { try { return sessionStorage.getItem('spritual:calm'); } catch { return null; } }, set: (v) => { try { sessionStorage.setItem('spritual:calm', v); } catch {} } };
  const reduced = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = () => root.classList.contains('ep-lite');

  // Reading comfort > Motion: "Light mode" sets data-motion="light"; any other choice clears Light mode, this tab's own included
  const follow = () => { if (root.dataset.motion === 'light') { if (root.dataset.light !== 'manual') root.dataset.light = 'manual'; } else if (root.dataset.light) { delete root.dataset.light; if (ss.get() === 'rest') ss.set('back'); } };
  // the Motion switch in Reading comfort shows what is true: Light mode is marked while this tab is resting its motion, so
  // choosing "Match my device" there is a change, and is the way back (a choice that changes nothing would not be heard)
  // [gfixA] ...but it shows the READER's choice. A device that asks for less motion sets data-motion="reduce" itself (boot.js); that is not
  // something the reader picked, so "Match my device" stays marked and a line says what the device is doing.
  const mine = () => { try { return JSON.parse(localStorage.getItem('spritual:prefs') || '{}').motion || ''; } catch { return root.dataset.motion === 'reduce' && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : ''; } };
  const paint = () => { const f = d.querySelector('[data-comfort]'); if (!f) return; const r = f.querySelector(`input[name="motion"][value="${root.dataset.light ? 'light' : mine()}"]`); if (r) r.checked = true;
    const os = f.querySelector('.motion-os'); if (os) os.hidden = !matchMedia('(prefers-reduced-motion: reduce)').matches || mine() === 'reduce'; };
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', paint); } catch {}
  new MutationObserver(follow).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-light'] });
  d.addEventListener('change', (e) => { if (e.target && e.target.name === 'motion') setTimeout(follow, 0); });
  paint();

  let note = null, noteT = 0;
  const hide = () => { clearTimeout(noteT); if (!note) return; const n = note; note = null; n.classList.remove('is-in'); setTimeout(() => n.remove(), 700); };
  const show = () => {
    note = d.createElement('div'); note.className = 'calm-note'; note.setAttribute('role', 'status'); note.lang = root.lang;
    const p = d.createElement('p'), b = d.createElement('button'); b.type = 'button'; b.textContent = WORDS.back; note.append(p, b); d.body.append(note);
    void note.offsetWidth; requestAnimationFrame(() => { if (!note) return; p.textContent = nb(WORDS.note); note.classList.add('is-in'); });
    b.addEventListener('click', () => { delete root.dataset.light; ss.set('back'); hide(); });
    note.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    noteT = setTimeout(hide, 14000);
  };
  const rest = () => { if (root.dataset.light || reduced() || lite()) return; root.dataset.light = 'auto'; ss.set('rest'); show(); };

  if (root.dataset.light || reduced() || lite() || ss.get() === 'back' || !('requestAnimationFrame' in window)) return;
  // The frames that come while the reader is scrolling are counted in windows of 30. A window is bad when a quarter of its
  // frames took over 45 ms (under 22 a second), or its frames averaged over 34 ms. Two bad windows in a row rest the
  // motion; a good one (under one frame in eight slow) starts the count again. Frames that come while the page is
  // still, or while the tab is hidden, are never counted.
  let on = false, n = 0, slow = 0, sum = 0, prev = 0, last = 0, lastDt = 16, bad = 0, raf = 0, armed = false;
  const reset = () => { n = slow = sum = 0; };
  const judge = () => { if (slow / n >= .25 || sum / n > 34) { if (++bad >= 2) rest(); } else if (slow / n < .125) bad = 0; reset(); };
  const frame = (t) => {
    raf = 0; if (!on) return;
    if (d.hidden) { on = false; prev = 0; reset(); return; }
    if (prev) { const dt = t - prev; if (dt < 1000) { lastDt = dt; n++; sum += dt; if (dt > 45) slow++; if (n === 30) judge(); } }
    prev = t;
    if (performance.now() - last > 170 + Math.min(400, 2 * lastDt)) { on = false; prev = 0; return; }
    raf = requestAnimationFrame(frame);
  };
  addEventListener('scroll', () => { if (!armed || root.dataset.light) return; last = performance.now(); if (!on) { on = true; prev = 0; raf = requestAnimationFrame(frame); } }, { passive: true });
  d.addEventListener('visibilitychange', () => { if (d.hidden) { on = false; cancelAnimationFrame(raf); raf = 0; prev = 0; reset(); } });
  // only after the page has loaded, and then only after the first moments have passed
  const arm = () => setTimeout(() => { armed = true; }, 2500);
  if (d.readyState === 'complete') arm(); else addEventListener('load', arm, { once: true });
})();
