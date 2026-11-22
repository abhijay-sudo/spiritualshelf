// Dusk: the quiet moment (dusk.css). About seventy seconds of breathing, in rounds: in 4, hold 4, out 6 (a gentler pace:
// 4, 4, 4). The light on the painted water swells and settles with the breath; the hour of the day tints it. You choose
// silence, a soft tanpura, or (on a phone that can) a gentle buzz, and it ends in a bell. You can end it any time (the
// button, or Esc); it waits when the tab is hidden and asks nothing when you come back. Nothing here claims to treat
// or cure anything, and nothing is measured, kept or sent beyond the two choices you made, on this device.
(() => {
  window.SpritualDusk = ({ UI, store, reduced, Sound, pad }) => {
    const d = document, root = d.documentElement, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
    const el = $('[data-dusk]'); if (!el) return;
    const nb = (s) => s.replace(/\s+(\S+)$/, '\u00a0$1');   // the last two words never part
    const W = { ...UI.dusk.t, away: nb(UI.dusk.t.away) };
    const cue = $('[data-cue]', el), left = $('[data-left]', el), begin = $('[data-begin]', el), stop = $('[data-stop]', el), cont = $('[data-dusk-continue]', el);
    const done = $('[data-done]', el), ui = $('[data-dusk-ui]', el), ring = $('.dusk-ring', el), buzzBox = $('[data-dusk-buzz]', el), again = $('[data-again]', el);
    const PACE = { steady: [4, 4, 6], gentle: [4, 4, 4] }, ROUNDS = { steady: 5, gentle: 6 };
    const canBuzz = typeof navigator.vibrate === 'function' && matchMedia('(pointer: coarse)').matches;
    ui.hidden = false; if (canBuzz) buzzBox.hidden = false;
    const vib = (p) => { try { navigator.vibrate?.(p); } catch {} };
    const clock = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
    // the two choices, remembered on this device. Sound is never on until it is chosen here.
    const saved = store.get('dusk', {}) || {};
    let mode = ['silent', 'tanpura', 'buzz'].includes(saved.mode) ? saved.mode : Sound.on() ? 'tanpura' : 'silent'; if (mode === 'buzz' && !canBuzz) mode = 'silent';
    let pace = PACE[saved.pace] ? saved.pace : 'steady';
    const check = (name, v) => { const r = $(`input[name="${name}"][value="${v}"]`, el); if (r) r.checked = true; };
    check('dusk-mode', mode); check('dusk-pace', pace);
    el.addEventListener('change', (e) => {
      const t = e.target; if (!t.name) return;
      if (t.name === 'dusk-mode') { mode = t.value; if (mode === 'tanpura') { Sound.force(true); Sound.bell(659, 0.12); Sound.force(null); } else if (mode === 'buzz') vib(30); }
      if (t.name === 'dusk-pace') pace = t.value;
      store.set('dusk', { mode, pace });
    });
    // where the reader came from
    const from = store.get('pausedFrom', null);
    if (from && Date.now() - from.at < 864e5) {
      const box = $('[data-paused-from]', el); box.hidden = false; $('[data-paused-title]', el).textContent = from.title; $('[data-paused-q]', el).textContent = from.question;
      for (const a of $$('[data-return], [data-return-done]', el)) { a.hidden = false; a.href = from.url; a.addEventListener('click', () => store.set('returnTo', { slug: from.slug, scroll: from.scroll })); }
    }

    let run = null, lock = null;   // run: { a, b, c, cyc, total, acc, seg, cur, timer }
    const setState = (s) => { el.dataset.state = s; root.classList.toggle('dusk-lock', s === 'live' || s === 'paused'); };   // (the page itself is still while you breathe)
    const setCue = (txt) => { cue.textContent = txt; cue.classList.remove('is-new'); void cue.offsetWidth; cue.classList.add('is-new'); };
    const phase = (ph) => {
      run.cur = ph; el.dataset.phase = ph; setCue(W[ph]);
      if (mode === 'buzz' && ph !== 'hold') vib(34);
    };
    const tick = () => {
      if (!run) return;
      const e = run.acc + (performance.now() - run.seg) / 1000;
      if (e >= run.total) return end(true);
      const c = e % run.cyc, ph = c < run.a ? 'in' : c < run.a + run.b ? 'hold' : 'out';
      if (ph !== run.cur) phase(ph);
      const s = Math.ceil(run.total - e); if (s !== run.s) { run.s = s; left.textContent = clock(s); }
    };
    const sound = (on) => { if (mode !== 'tanpura') { Sound.force(false); Sound.droneStop(); return; } Sound.force(true); if (on) Sound.droneStart(); else Sound.droneStop(); };
    const hold = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch {} };
    const free = () => { lock?.release?.().catch(() => {}); lock = null; };
    const start = () => {
      const [a, b, c] = PACE[pace]; el.style.setProperty('--d-in', a + 's'); el.style.setProperty('--d-hold', b + 's'); el.style.setProperty('--d-out', c + 's');
      run = { a, b, c, cyc: a + b + c, total: (a + b + c) * ROUNDS[pace], acc: 0, seg: performance.now(), cur: '', s: -1, timer: 0 };
      done.hidden = true; ring.classList.remove('is-bell'); begin.hidden = true; cont.hidden = true; stop.hidden = false; setState('live');
      left.textContent = clock(run.total); sound(true); hold(); tick(); run.timer = setInterval(tick, 200); stop.focus({ preventScroll: true });
    };
    // back to the quiet: the light settles to rest
    const rest = () => { clearInterval(run?.timer); el.removeAttribute('data-phase'); Sound.droneStop(); Sound.force(null); vib(0); free(); };
    const end = (finished) => {
      if (!run) return; rest(); run = null; stop.hidden = true; cont.hidden = true;
      if (finished) {
        setState('done'); done.hidden = false; begin.hidden = true; cue.textContent = ''; left.textContent = '';
        // the bell: a ring of light over the water; the sound too if the tanpura was chosen, a soft pulse if the buzz was
        void ring.offsetWidth; ring.classList.add('is-bell');
        if (mode === 'tanpura') { Sound.force(true); Sound.bell(523, 0.25); Sound.force(null); } else if (mode === 'buzz') vib([60, 90, 60]);
        const h = $('h2', done); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      } else { setState('idle'); begin.hidden = false; cue.textContent = W.ready; left.textContent = ''; begin.focus({ preventScroll: true }); }
    };
    // a hidden tab pauses it (no sound, no buzz, nothing counted); coming back it waits to be continued or ended
    d.addEventListener('visibilitychange', () => {
      if (!run) return;
      if (d.hidden && el.dataset.state === 'live') { run.acc += (performance.now() - run.seg) / 1000; clearInterval(run.timer); run.timer = 0; el.removeAttribute('data-phase'); Sound.droneStop(); vib(0); setState('paused'); }
      else if (!d.hidden && el.dataset.state === 'paused') { cue.textContent = W.away; cue.classList.remove('is-new'); cont.hidden = false; stop.hidden = false; cont.focus({ preventScroll: true }); }
    });
    cont.addEventListener('click', () => { if (!run) return; cont.hidden = true; run.cur = ''; run.seg = performance.now(); setState('live'); sound(true); hold(); tick(); run.timer = setInterval(tick, 200); stop.focus({ preventScroll: true }); });
    begin.addEventListener('click', start); again?.addEventListener('click', start);
    stop.addEventListener('click', () => end(false));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && run && !d.querySelector('dialog[open]')) { e.preventDefault(); end(false); } });
    // leaving (or the page put away for the back button) ends it cleanly: coming back never shows a frozen cue
    addEventListener('pagehide', () => { if (run) end(false); });
    addEventListener('pageshow', (e) => { if (e.persisted && run) end(false); });
  };
})();
