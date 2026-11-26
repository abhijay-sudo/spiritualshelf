// Spiritual cinema layer: letterbox bars that open and close with the scroll, the film-strip rails,
// the sound invitation and the poster that opens into its story. Progressive enhancement only.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = () => root.dataset.motion === 'reduce' || !!root.dataset.light || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  if (!reduced()) root.classList.add('cx-js'); else root.classList.remove('cx-js');
  // phones and short landscape screens play a shorter title sequence (mobile.css): its clock runs at this pace here too
  const pocket = matchMedia('(max-width: 759px), (orientation: landscape) and (max-height: 520px)').matches;
  // [First Light] the title sequence's one shared timeline: desktop seconds x pace (--tk in joyhh.css). The hand-off is when the page
  // is usable again (skip listeners off, inert released); the teardown is when joyq.js takes the layer out. Both are also written
  // to the opening's data-cx-hand / data-cx-end, which joyq.js reads, so no timing is spelled out twice.
  const CX = { pace: pocket ? .62 : 1, handoffMs: pocket ? 4000 : 6000, teardownMs: pocket ? 5000 : 8200 };
  const titlePace = CX.pace;
  { const o = document.querySelector('.cx-home .cx-open'); if (o) { o.dataset.cxHand = String(CX.handoffMs); o.dataset.cxEnd = String(CX.teardownMs); } }

  /* ---------- One scroll loop for everything that follows the scroll ---------- */
  const jobs = [];
  let ticking = false;
  const run = () => { ticking = false; for (const j of jobs) j(); };
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);

  /* ---------- Letterbox: the bars open as the film starts, and close again at the finale ---------- */
  if (!reduced()) {
    for (const el of $$('[data-letterbox]')) {
      const closing = el.dataset.letterbox === 'in';
      let last = -1;
      jobs.push(() => {
        const r = el.getBoundingClientRect(); const vh = innerHeight;
        if (r.bottom < -50 || r.top > vh + 50) return;
        const v = closing ? clamp((vh - r.top) / (vh * .9)) : clamp(1 - Math.max(0, -r.top) / (vh * .45));
        const q = Math.round(v * 100) / 100; if (q === last) return;   // a hundredth is finer than a pixel of bar
        last = q; el.style.setProperty('--lb', q.toFixed(2));
      });
    }
  }

  let vtWho = false;
  let vtImg = null;   // the picture that opens into the next page (a poster, or the story select's stage)
  /* ---------- The opening's scenery leans with the pointer (rays, mist, birds and lamps at different depths) ---------- */
  const openEl = $('.cx-home .cx-open'); const lean = { x: 0, y: 0 };
  if (openEl && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let or = 0;
    openEl.addEventListener('pointermove', (e) => { if (or || reduced()) return; or = requestAnimationFrame(() => { or = 0; lean.x = (e.clientX / innerWidth) - .5; lean.y = (e.clientY / innerHeight) - .5; openEl.style.setProperty('--ox', lean.x.toFixed(3)); openEl.style.setProperty('--oy', lean.y.toFixed(3)); }); });
  }

  /* ---------- Gold dust in the lamplight: motes rise through the dark behind the name, sparks lift off the line of light
     as it is drawn, and a few keep drifting in the sunrise once the curtain has opened. One small canvas, drawn only
     while the opening is on screen and the tab is visible; never under reduced motion. ---------- */
  const dust = $('.cx-home .cx-dust');
  if (dust && openEl && dust.getContext && !reduced()) {
    const g = dust.getContext('2d');
    const titles = root.classList.contains('cx-js') && !root.classList.contains('cx-seen');   // the title sequence is playing
    const spark = $('.cx-spark', openEl); const letters = $('.cx-wm-letters', openEl);
    const light = (navigator.deviceMemory || 8) < 4 || (navigator.hardwareConcurrency || 8) <= 2;
    // one soft mote, drawn once and stamped many times
    const mote = document.createElement('canvas'); mote.width = mote.height = 64;
    { const m = mote.getContext('2d'); const gr = m.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,246,214,1)'); gr.addColorStop(.18, 'rgba(255,214,140,.85)'); gr.addColorStop(.45, 'rgba(255,170,80,.28)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
      m.fillStyle = gr; m.fillRect(0, 0, 64, 64); }
    const sparkAnim = titles && spark && spark.getAnimations ? spark.getAnimations()[0] : null;
    // rectangles inside the zoomed card (screens above 1920x1080): older engines report them divided by the zoom (see boot.js)
    let zf = 0; const zoomFix = () => {
      if (!zf) { const o = document.createElement('div'), i = document.createElement('div');
        o.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;zoom:2;visibility:hidden;pointer-events:none'; i.style.cssText = 'position:absolute;left:0;top:50px;width:1px;height:1px';
        o.appendChild(i); document.body.appendChild(o); zf = (i.getBoundingClientRect().top - o.getBoundingClientRect().top) < 75 ? 2 : 1; o.remove(); }
      return zf === 2 ? (parseFloat(root.style.getPropertyValue('--cx-k')) || 1) : 1; };
    let W = 0, H = 0, motes = [], sparks = [], raf = 0, seen = true, last = 0, born = sparkAnim && typeof sparkAnim.startTime === 'number' ? sparkAnim.startTime : performance.now(), lamp = null, lampAt = 0, carry = 0;
    // a small repeatable generator: the field looks the same on every visit, and nothing here needs real randomness
    let seed = 20261112; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const make = (anywhere) => { const z = .25 + .75 * rnd() * rnd(); return { x: rnd() * W, y: anywhere ? rnd() * H : H + 12 + rnd() * 30, z, r: 1 + 2.6 * z * z, vy: 5 + 20 * z, ph: rnd() * 6.283, f: .25 + rnd() * .5, tw: .6 + rnd() * 1.5, a: .22 + .6 * z }; };
    const size = () => {
      const k = Math.min(devicePixelRatio || 1, 2); const w = dust.clientWidth, h = dust.clientHeight;
      if (!w || !h) return;   // hidden (reduced motion): keep the last size
      W = w; H = h;
      dust.width = Math.round(W * k); dust.height = Math.round(H * k); g.setTransform(k, 0, 0, k, 0, 0);
      const n = Math.round(clamp(W * H / 15000, 30, 110) * (light ? .5 : 1) * (pocket ? .5 : 1));
      while (motes.length < n) motes.push(make(true)); motes.length = n;
    };
    const frame = (now) => {
      raf = 0;
      if (reduced()) { g.clearRect(0, 0, W, H); return; }
      // the sequence's own clock: the line of light's CSS animation says how far in we are (this script may start late)
      if (sparkAnim && sparkAnim.playState === 'running' && typeof sparkAnim.currentTime === 'number') born = now - sparkAnim.currentTime;
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; const t = now / 1000; const age = (now - born) / 1000 / titlePace;
      g.clearRect(0, 0, W, H);
      // in the dark the dust is at its brightest; once the curtain has opened it thins, so the river stays the picture
      let amb = !titles || root.classList.contains('cx-seen') ? .55 : 1 - .45 * clamp((age - 3.4) / 2.6);   // [First Light] the dust thins as the sun rises (3.2 s) and the grade lifts (5.4 s)
      { const Lk = window.SpiritualGPU && window.SpiritualGPU.lake; if (Lk && Lk.ready && Lk.fade > 0 && (!titles || age > 6.4 || root.classList.contains('cx-seen'))) amb *= 1 - .8 * clamp(Lk.fade); }   // once the live lake is shown the lingering gold dust all but goes: specks over the water read as confetti, not as light
      // the lamp's glow behind the name, while the screen is dark
      if (titles && letters && age < 6.6 && !root.classList.contains('cx-seen')) {   // [First Light] the glow behind the name peaks as it inks in (4.2 s)
        if (!lamp || now - lampAt > 400) { const z = zoomFix(), r = letters.getBoundingClientRect(), o = openEl.getBoundingClientRect(); lamp = { x: (r.left + r.width / 2) * z - o.left, y: (r.top + r.height / 2) * z - o.top, r: Math.max(r.width * z * .95, 180) }; lampAt = now; }
        const la = clamp((age - 3.0) / 1.2) * (1 - clamp((age - 4.6) / 1.8)) * (.9 + .1 * Math.sin(t * 5.1) * Math.sin(t * 1.7));
        if (la > .01) {
          // a wide, low ellipse with a long soft falloff (many stops), so no edge of it can be seen on the dark
          g.save(); g.translate(lamp.x, lamp.y); g.scale(1, .55);
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, lamp.r);
          [[0, .2], [.12, .17], [.26, .12], [.42, .07], [.58, .035], [.74, .014], [.88, .004], [1, 0]].forEach(([at, a]) => gr.addColorStop(at, `rgba(255,${Math.round(176 - 30 * at)},${Math.round(96 - 30 * at)},${(a * la).toFixed(4)})`));
          g.fillStyle = gr; g.fillRect(-lamp.r, -lamp.r, lamp.r * 2, lamp.r * 2);
          g.globalAlpha = 1; g.restore();
        }
      }
      // sparks lift off the line of light for as long as it is on screen, along exactly as much of it as has been drawn
      if (titles && spark && age < 1.8) {
        const r = spark.getBoundingClientRect();
        if (r.width > 6 && r.height > 0 && +getComputedStyle(spark).opacity > .3) {
          const o = openEl.getBoundingClientRect(); carry += dt * (light ? 26 : 60) * Math.min(1, r.width / 420);
          while (carry >= 1 && sparks.length < 150) { carry -= 1; const z = .4 + .6 * rnd(); sparks.push({ x: r.left - o.left + rnd() * r.width, y: r.top - o.top, z, r: .8 + 1.6 * z, vx: (rnd() - .5) * 26, vy: 16 + 64 * rnd() * z, life: 0, max: 1.1 + 1.9 * rnd() }); }
        }
      }
      g.globalCompositeOperation = 'lighter';
      for (const p of motes) {
        p.y -= p.vy * dt; p.x += (Math.sin(t * p.f + p.ph) * 7 * p.z + 2.5) * dt;
        if (p.y < -14) Object.assign(p, make(false)); if (p.x > W + 14) p.x = -14;
        const a = amb * p.a * (.62 + .38 * Math.sin(t * p.tw + p.ph)); const s = p.r * 5;
        g.globalAlpha = a; g.drawImage(mote, p.x - s / 2 - lean.x * 26 * p.z, p.y - s / 2 - lean.y * 14 * p.z, s, s);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.life += dt; if (p.life >= p.max) { sparks.splice(i, 1); continue; }
        p.y -= p.vy * dt; p.vy *= 1 - .35 * dt; p.x += (p.vx + Math.sin(t * 2 + p.y * .03) * 10) * dt;
        const k = p.life / p.max; const s = p.r * 6 * (1 - .4 * k);
        g.globalAlpha = Math.min(1, k * 8) * (1 - k) * (1 - k) * .95; g.drawImage(mote, p.x - s / 2, p.y - s / 2, s, s);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      go();
    };
    const go = () => { if (!raf && seen && !document.hidden && !reduced()) raf = requestAnimationFrame(frame); };
    size(); go();
    let sizeT = 0; addEventListener('resize', () => { clearTimeout(sizeT); sizeT = setTimeout(() => { size(); go(); }, 150); });
    root.classList.add('cx-open-on');
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { const en = es[es.length - 1]; seen = en.isIntersecting && en.intersectionRatio > 0; root.classList.toggle('cx-open-on', seen); last = 0; go(); }, { threshold: [0, .001] }).observe(openEl);   // (an opening scrolled exactly off the top still "intersects" at ratio 0: without a second threshold nothing reports it, and the dust kept drawing under the select)
    document.addEventListener('visibilitychange', () => { last = 0; go(); });
    // the motion switch (and the device's own setting) can be turned back on: the canvas is shown again, so wake the loop
    const wake = () => { last = 0; size(); go(); };
    if ('MutationObserver' in window) new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', wake);
  }

  /* ---------- Choose your story: the roster along the bottom, the one in hand on the stage ---------- */
  const sel = $('[data-select]');
  let selOnScreen = false, selWake = () => {};
  if (sel) {
    const tiles = $$('.cx-sel-tile', sel); const n = tiles.length; const grid = $('[data-sel-grid]', sel);
    // the four realms (Ramayana, Mahabharata, the gods, the antagonists): the roster shows one realm's characters at a time
    const realms = $('[data-sel-realms]', sel); const rBtns = realms ? $$('.cx-sel-realm', realms) : []; let grp = null;
    const inGrp = () => tiles.map((t, k) => k).filter((k) => !grp || tiles[k].parentElement.dataset.g === grp);
    const step = (d) => { const v = inGrp(); return v[(Math.max(0, v.indexOf(cur)) + d + v.length) % v.length]; };
    // When the roster changes under a mouse that is lying still, the browser reports it as "entering" whatever is now
    // beneath it. That is not a choice: only a pointer that has really moved since its last report picks anything.
    let lastX = -1, lastY = -1, lastT = 0, speed = 0; const moved = (e) => e.clientX !== lastX || e.clientY !== lastY;
    // [life-select] how fast the hand is going (px/s, smoothed): a hand sweeping across the wall chooses nobody on the way, one that slows or rests does
    addEventListener('pointermove', (e) => { const t = e.timeStamp; if (lastT && lastX >= 0 && t > lastT) { const v = Math.hypot(e.clientX - lastX, e.clientY - lastY) / (t - lastT) * 1000; speed += (Math.min(v, 6000) - speed) * .5; } lastX = e.clientX; lastY = e.clientY; lastT = t; }, { passive: true });
    const T = (k) => $(`[data-sel-${k}]`, sel);
    const out = { n: T('n'), coll: T('coll'), title: T('title'), sum: T('sum'), min: T('min'), scenes: T('scenes'), go: T('go'), hero: T('hero'), name: T('name'), who: T('who'), chips: T('chips'), goT: $('[data-sel-go-t]', sel), story: T('story'), storyT: $('[data-sel-story-t]', sel), storyN: $('[data-sel-story-n]', sel) };
    const whoLabel = out.who ? out.who.textContent.replace(out.name ? out.name.textContent : '', '').trim() : '';
    const layers = $$('.cx-sel-bg img', sel); const fig = $('[data-sel-fig]', sel); const auto = $('[data-sel-auto]', sel);
    // on a phone the frame is tall and narrow: the camera goes to the character's face, not the middle of the figure
    const narrow = matchMedia('(max-width: 699px)');
    let outT = 0;
    let cur = 0, front = 0, token = 0, stopped = reduced(), lastPointer = 'mouse', timer = 0, leaving = false;
    // how much of the screen the words leave above them (a phone held upright lays a close portrait's whole head in that band: cinema.css, .is-fit)
    const info = $('.cx-sel-info', sel); const band = () => { if (!info || !narrow.matches) return; const b = Math.round(info.getBoundingClientRect().top - sel.getBoundingClientRect().top); if (b > 0) sel.style.setProperty('--sel-band', b + 'px'); };
    band(); addEventListener('resize', band, { passive: true }); document.fonts?.ready.then(band);
    // [hanuman-arrival] when Hanuman is the chosen one, a short sunrise flare behind the painting, then a halo and a few embers: his own
    // script and styles (assets/hanuman-arrival.js, .css) are fetched the first time he is chosen, and never for anyone else
    const haSel = (t) => {
      const on = /(^|\/)characters\/hanuman\/?$/.test(t.getAttribute('href') || ''); const H = window.SpritualHanuman;
      if (H) return H.select(sel, on);
      if (!on || !sel.dataset.haJs || sel.dataset.haLoading) return; sel.dataset.haLoading = '1';
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = sel.dataset.haCss; document.head.append(l);
      const sc = document.createElement('script'); sc.src = sel.dataset.haJs; sc.onload = () => { if (window.SpritualHanuman) window.SpritualHanuman.select(sel, /(^|\/)characters\/hanuman\/?$/.test(tiles[cur].getAttribute('href') || '')); }; document.head.append(sc);
    };
    let flipR = 0; const flipKey = () => (sel.classList.contains('is-left') ? 'L' : '') + (sel.classList.contains('is-scene') ? 'S' : '') + (sel.classList.contains('is-calm') ? 'C' : '');
    const pick = (i, byUser) => {
      i = (i + n) % n; if (byUser) halt();
      if (i === cur) return;
      const t = tiles[i]; const d = t.dataset; cur = i;
      tiles.forEach((x, k) => { x.classList.toggle('is-on', k === i); if (k === i) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
      sel.style.setProperty('--sel-glow', d.glow); sel.style.setProperty('--sel-base', d.base);
      if (out.name) { out.name.textContent = d.name; out.name.style.setProperty('--nl', [...d.name].length); }
      if (out.who) out.who.textContent = d.who || '';
      // the world they come from (Ramayana, Mahabharata, the gods; an antagonist says so) is named above their name
      // (on short screens the same name sits in the counter's line instead: both copies are kept in step)
      if (d.world) $$('[data-sel-world]', sel).forEach((el) => { const w = el.firstElementChild; const was = w.textContent; w.textContent = d.world; el.classList.toggle('is-foe', 'foe' in d); if (was !== d.world && !reduced()) { el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new'); } });
      out.n.textContent = String(inGrp().indexOf(i) + 1).padStart(2, '0'); out.coll.textContent = d.coll; out.sum.textContent = d.sum;
      // the name rises whole: one piece per word (plain text, so its kerning and joins are the face's own), so a name is
      // never broken inside a word, set at the size its widest word allows (--nw: that word's width in em, from the title face)
      out.title.textContent = ''; if (d.nw) out.title.style.setProperty('--nw', d.nw);
      d.title.split(' ').forEach((word, wi) => { if (wi) out.title.append(' '); const w = document.createElement('span'); w.className = 'cx-sel-w'; w.textContent = word; out.title.append(w); });
      out.title.setAttribute('aria-label', d.title);
      if (out.chips) out.chips.innerHTML = d.chips || '';   // built by the site's own generator (escaped there)
      out.go.href = t.href; out.go.setAttribute('aria-label', d.meet || d.title); if (out.goT) out.goT.textContent = d.meet || d.title;
      if (out.story && d.story) { out.story.href = d.story; if (out.storyN) out.storyN.textContent = (d.storyT || '').replace(/ (\S+)$/u, '\u00a0$1');   // [joyHH] the button names the story it opens
        out.story.setAttribute('aria-label', `${out.storyT ? out.storyT.textContent : ''}: ${d.storyT || ''}`); }
      // a character with a cut-out portrait steps in front of their world; one painted inside a scene is found by the
      // camera instead: the world itself pushes in on them, and the words move to the other side
      const scene = d.mode === 'scene'; const wasCut = !sel.classList.contains('is-scene');
      const sidesWas = flipKey(); sel.classList.toggle('is-scene', scene); sel.classList.toggle('is-left', d.side === 'left'); sel.classList.toggle('is-calm', scene && d.calm === '1');
      // [life-select] the words changing sides is a layout shift the browser counts (about 0.33 each, 2.4 over a sweep, measured). For the frame in which it happens the
      // stage is held at opacity 0 (cinema.css, .ls-flip); its own fade-in starts from nothing anyway. Not under reduced motion or Light mode: the swap is then instant.
      if (sidesWas !== flipKey() && !reduced()) { sel.classList.add('ls-flip'); cancelAnimationFrame(flipR); flipR = requestAnimationFrame(() => { flipR = requestAnimationFrame(() => { sel.classList.remove('ls-flip'); }); }); }
      if (!scene && d.hero) {
        // the last figure stays where it stood and fades while the next fades in over it (cinema.css, .is-ghost): a cross-fade, not a cut
        if (wasCut && fig && !reduced() && !root.classList.contains('ep-lite')) { const g = fig.cloneNode(true); g.removeAttribute('data-sel-fig'); g.querySelector('img')?.removeAttribute('data-sel-hero'); g.classList.add('is-ghost'); fig.before(g); const bye = () => g.remove(); g.addEventListener('animationend', bye, { once: true }); setTimeout(bye, 700); }
        out.hero.srcset = d.heroset; out.hero.src = d.hero;
        // a figure not yet decoded fades in from the moment it is, rather than appearing part-way through its fade
        if (!out.hero.complete && fig) { const want = d.hero; out.hero.addEventListener('load', () => { if (out.hero.getAttribute('src') === want && !reduced()) { fig.style.animation = 'none'; void fig.offsetWidth; fig.style.animation = ''; } }, { once: true }); }
      }
      band(); haSel(t);
      // the painting: the roster's small copy at once (it is already loaded), the full one as soon as it has decoded
      // the new world comes in over the old one behind a blade of light; the old one leaves when it is covered
      const my = ++token; const next = layers[1 - front]; const prev = layers[front]; const thumb = $('img', t);
      next.removeAttribute('srcset'); next.removeAttribute('sizes'); { const face = d.ffx && narrow.matches; next.style.setProperty('--fx', `${face ? d.ffx : d.fx}%`); next.style.setProperty('--fy', `${face ? d.ffy : d.fy}%`); } next.style.setProperty('--z', d.z || 1); next.style.setProperty('--say', d.ay ? d.ay + '%' : ''); const fit = scene && !d.old; next.classList.toggle('is-fit', fit); if (fit) { next.style.setProperty('--fit-k', d.fk); next.style.setProperty('--fit-t', d.ft); next.style.setProperty('--fit-x', parseFloat(d.ffx) / 100); } next.src = thumb.currentSrc || thumb.src;
      layers.forEach((x) => x.classList.remove('is-out', 'is-in'));
      prev.classList.remove('is-on'); prev.classList.add('is-out'); next.classList.add('is-on');
      if (!reduced()) { void next.offsetWidth; next.classList.add('is-in'); }
      clearTimeout(outT); outT = setTimeout(() => { if (my === token) { prev.classList.remove('is-out'); next.classList.remove('is-in'); } }, 800);
      front = 1 - front;
      // [perf] on a slow or metered line the full painting is asked for no wider than 960 px (the widest cuts are a sharpness a weak line should not pay for)
      const picset = window.SpritualNet && window.SpritualNet.slow() ? (d.picset.split(',').filter((x) => (parseInt(x.trim().split(/\s+/)[1], 10) || 0) <= 960).join(',') || d.picset) : d.picset;
      const vw = `${Math.round(100 * (parseFloat(d.z) || 1))}vw`; const big = new Image(); big.sizes = vw; big.srcset = picset; big.src = d.pic;
      (big.decode ? big.decode() : Promise.resolve()).then(() => { if (my === token) { next.sizes = vw; next.srcset = picset; next.src = d.pic; } }).catch(() => {});
      if (!reduced()) { sel.classList.remove('is-swap'); void sel.offsetWidth; sel.classList.add('is-swap'); }
    };
    // left alone, the screen shows each story in turn; any choice by hand stops it, and the button starts it again
    // one fixed name ("Pause the showcase") with aria-pressed as its state: a toggle whose name also changes contradicts itself
    const showAuto = () => { if (auto) auto.setAttribute('aria-pressed', String(stopped)); };
    const halt = () => { if (!stopped) { stopped = true; showAuto(); } clearTimeout(timer); timer = 0; };
    const turn = () => { timer = 0; if (reduced()) { halt(); return; } if (stopped || !selOnScreen || document.hidden || leaving) return; pick(step(1), false); timer = setTimeout(turn, 4800); };
    // On a touch screen the showcase waits longer before its first turn (eight seconds), so a reader still taking in the
    // first character is not moved on; and a touch, a key or a wheel anywhere in the section stops it for good.
    const touchy = matchMedia('(hover: none)').matches; let firstTurn = true;
    selWake = () => { if (!timer && !stopped && selOnScreen && !document.hidden) { timer = setTimeout(turn, touchy && firstTurn ? 8000 : 4800); firstTurn = false; } };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => sel.addEventListener(ev, (e) => { if (!auto || !auto.contains(e.target)) halt(); }, { passive: true }));
    auto?.addEventListener('click', () => { if (stopped) { stopped = reduced() ? true : false; showAuto(); selWake(); } else halt(); });
    document.addEventListener('visibilitychange', selWake); showAuto();
    new MutationObserver(() => { if (reduced()) halt(); }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => { if (reduced()) halt(); });
    // leaving for a story: a flare, the name steps forward, and the painting opens into the story's own first frame
    const begin = (e, href) => {
      if (leaving) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0 || reduced()) return;
      e.preventDefault(); leaving = true; halt(); sel.classList.add('is-go');
      let url; try { url = new URL(href, location.href); } catch { location.href = href; return; }
      vtImg = layers[front]; try { sessionStorage.setItem('cx-vt', url.pathname); } catch {}
      setTimeout(() => { location.href = url.href; }, 430);
    };
    addEventListener('pageshow', (e) => { if (e.persisted) { leaving = false; sel.classList.remove('is-go'); } });
    // [roster] the wall can lie below the stage (a phone): a first tap chooses, and the screen rises to show who was chosen
    const lookUp = () => { const r = sel.getBoundingClientRect(); const st = $('.cx-sel-stage', sel).getBoundingClientRect(); if (st.top < 0 && st.bottom < innerHeight * .6 || r.top < -innerHeight * .15) scrollTo({ top: scrollY + r.top, behavior: reduced() ? 'auto' : 'smooth' }); };
    let downCur = 0;   // what was in hand when the finger came down (the tap's own focus changes it before the click arrives)
    sel.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; downCur = cur; }, true);
    let intT = 0, intR = 0;
    const intend = (i, wait) => { clearTimeout(intT); cancelAnimationFrame(intR); intT = intR = 0; if (i < 0) return; const go = () => { intT = 0; intR = requestAnimationFrame(() => { intR = 0; pick(i, true); }); }; if (wait) intT = setTimeout(go, wait); else go(); };
    tiles.forEach((t, i) => {
      // [life-select] a hand on the wall chooses once per frame, in the frame's own callback (not in the event), and a fast one waits 70 ms on a tile first:
      // each choice rebuilds the stage, so a sweep over eight tiles no longer rebuilds it eight times
      t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && moved(e)) intend(i, speed > 650 && !reduced() ? 70 : 0); });
      t.addEventListener('pointerleave', () => intend(-1, 0));
      t.addEventListener('focus', () => pick(i, true));
      t.addEventListener('click', (e) => {
        // by touch, the first tap looks and the second begins; a mouse or the keyboard is already looking
        if (lastPointer !== 'mouse' && e.detail > 0 && i !== downCur) { e.preventDefault(); pick(i, true); lookUp(); return; }
        if (i !== cur) pick(i, true);
        begin(e, t.href);
      });
      t.addEventListener('keydown', (e) => {
        if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
        // the arrows move among the characters of the realm on show
        // (the wall wraps: a row is every tile level with the first; Down from a short last row lands on its last tile)
        const v = inGrp(); const at = v.indexOf(i); const top = (k) => tiles[k].parentElement.getBoundingClientRect().top;
        const cols = v.filter((k) => Math.abs(top(k) - top(v[0])) < 8).length || v.length;
        const down = at + cols < v.length ? at + cols : (Math.floor(at / cols) < Math.floor((v.length - 1) / cols) ? v.length - 1 : at);
        const to = { ArrowRight: at + 1, ArrowLeft: at - 1, ArrowDown: down, ArrowUp: at - cols, Home: 0, End: v.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault(); if (to >= 0 && to < v.length) tiles[v[to]].focus();
      });
    });
    // [roster] the wall: every character of the realm on show, in even rows that fill the width. The widest row that keeps each
    // tile at least --tile-min wide gives the number of rows; the characters are then divided evenly among them
    // (35 on a wide screen is three rows of 12, never 13, 13 and 9). Without scripts, roster.css's own --cols stands.
    let probe = null;
    const minTile = () => { if (!probe) { probe = document.createElement('i'); probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--tile-min)'; } if (!probe.isConnected) sel.append(probe); return probe.getBoundingClientRect().width || 88; };
    const fitWall = () => {
      const k = tiles.filter((t) => !t.parentElement.hidden).length; if (!k) return;
      const cs = getComputedStyle(grid); const w = grid.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const gap = parseFloat(cs.columnGap) || 6;
      const maxC = Math.max(2, Math.floor((w + gap) / (minTile() + gap))); const rows = Math.ceil(k / maxC);
      grid.style.setProperty('--cols', String(Math.ceil(k / rows)));
    };
    if ('ResizeObserver' in window) new ResizeObserver(() => fitWall()).observe(grid); else addEventListener('resize', fitWall);
    document.fonts?.ready.then(fitWall);
    // choosing a realm: its characters take the roster, and its first one takes the stage (unless the one in hand is already of it)
    const total = T('total');
    // on a phone the realms are a rail that scrolls sideways: the one chosen (or focused) is brought wholly into it
    const showRealm = (b) => {
      if (!realms || realms.scrollWidth <= realms.clientWidth + 2) return;
      const box = realms.getBoundingClientRect(), r = b.getBoundingClientRect(); const pad = 12;
      if (r.left < box.left + pad) realms.scrollLeft += r.left - box.left - pad;
      else if (r.right > box.right - pad * 3) realms.scrollLeft += r.right - box.right + pad * 3;
    };
    rBtns.forEach((b) => b.addEventListener('focus', () => showRealm(b)));
    const setGroup = (g, byUser) => {
      if (g === grp) return; grp = g;
      rBtns.forEach((b) => { const on = b.dataset.realm === g; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); if (on) showRealm(b); });
      // a tile that holds the keyboard's focus may be about to leave the roster: the focus goes to the realm's own name
      const held = grid.contains(document.activeElement) && document.activeElement.closest('li')?.dataset.g !== g;
      let k = 0; tiles.forEach((t) => { const li = t.parentElement; const on = li.dataset.g === g; li.hidden = !on; if (on) li.style.setProperty('--gk', k++); });
      if (held) rBtns.find((b) => b.dataset.realm === g)?.focus({ preventScroll: true });
      if (total) total.textContent = String(k).padStart(2, '0');
      const v = inGrp(); fitWall();
      if (v.includes(cur)) { out.n.textContent = String(v.indexOf(cur) + 1).padStart(2, '0'); if (byUser) halt(); } else pick(v[0], byUser);
      if (byUser && !reduced() && !sel.classList.contains('sel-wait')) { grid.classList.remove('is-regroup'); void grid.offsetWidth; grid.classList.add('is-regroup'); }
    };
    if (realms && rBtns.length > 1) {
      realms.hidden = false; setGroup(tiles[cur].parentElement.dataset.g, false);
      // the medallions are cut from larger pictures placed far outside their small round frames, which a browser's lazy
      // loading can take for "never on screen" (notably inside the phone's scrolling rail): they are asked for outright
      $$('.cx-sel-realm-pic img', realms).forEach((im) => { im.loading = 'eager'; });
      let hoverT = 0;
      rBtns.forEach((b, k) => {
        // resting the pointer on a realm opens it (a short pause, so passing over one on the way elsewhere does not)
        // the pause is measured from the pointer's last movement, so a pointer on its way to a button above never opens one
        const arm = (e) => { if (e.pointerType !== 'mouse' || e.buttons || !moved(e)) return; clearTimeout(hoverT); hoverT = setTimeout(() => setGroup(b.dataset.realm, true), 220); };
        b.addEventListener('pointerenter', arm); b.addEventListener('pointermove', arm);
        b.addEventListener('pointerleave', () => clearTimeout(hoverT));
        b.addEventListener('click', () => { clearTimeout(hoverT); setGroup(b.dataset.realm, true); });
        b.addEventListener('keydown', (e) => {
          if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
          const to = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: rBtns.length - 1 }[e.key]; if (to === undefined) return;
          e.preventDefault(); const nb = rBtns[(to + rBtns.length) % rBtns.length]; nb.focus(); setGroup(nb.dataset.realm, true);
        });
      });
    }
    out.go.addEventListener('click', (e) => begin(e, out.go.href));
    out.story?.addEventListener('click', (e) => begin(e, out.story.href));
    // depth: the world, the lead and their name sit at different distances, and drift apart as the pointer moves
    // [life-select] --px/--py are written on the layers that read them (the painting, the figure; motion-select.js leans them on springs instead and this stands down while it does), never on the section: a custom
    // property written on the section is inherited by all of its 100+ roster tiles, and the browser restyled every one of them on every frame of
    // a sweep (about 3 s of style work over eight tiles at 4x CPU). The section's box is read once per scroll or resize, not in each frame.
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let pr = 0, rx = 0, ry = 0, rw = 1, rh = 1, stale = true, ex = 0, ey = 0; const lean = [$('.cx-sel-bg', sel), $('.cx-sel-hero', sel), $('.cx-sel-name', sel)].filter(Boolean);
      const put = (x, y) => { if (sel.classList.contains('ms-par')) return; for (const el of lean) { el.style.setProperty('--px', x); el.style.setProperty('--py', y); } };
      addEventListener('scroll', () => { stale = true; }, { passive: true }); addEventListener('resize', () => { stale = true; }, { passive: true });
      sel.addEventListener('pointermove', (e) => { ex = e.clientX; ey = e.clientY; if (pr || reduced()) return; pr = requestAnimationFrame(() => { pr = 0; if (stale) { const r = sel.getBoundingClientRect(); rx = r.left; ry = r.top; rw = r.width || 1; rh = r.height || 1; stale = false; } put((((ex - rx) / rw) - .5).toFixed(3), (((ey - ry) / rh) - .5).toFixed(3)); }); });
      sel.addEventListener('pointerleave', () => { put(0, 0); });
    }
    // the lead stands between the heading and the roster, whatever the screen and the reader's text size
    const roster = $('.cx-sel-roster', sel);
    const setRoster = () => sel.style.setProperty('--sel-roster-h', `${Math.round(roster.getBoundingClientRect().height)}px`);
    setRoster(); if ('ResizeObserver' in window) new ResizeObserver(setRoster).observe(roster); else addEventListener('resize', setRoster);
    // resting on, focusing or pressing the way in is a choice too: the story must not change under it
    out.go.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') halt(); });
    out.go.addEventListener('focus', () => halt());
    out.go.addEventListener('pointerdown', () => halt());
    // on a touch screen, a sideways swipe across the stage turns to the next or the previous story
    const stage = $('.cx-sel-stage', sel); let sx = 0, sy = 0;
    stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; const dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) pick(step(dx < 0 ? 1 : -1), true); }, { passive: true });
    $$('.cx-sel-grid > li', sel).forEach((li, k) => li.style.setProperty('--k', k));
    // a keyboard user arriving in the select gets all of it on screen, not a half-scrolled slice under the header
    sel.addEventListener('focusin', (e) => { const r = sel.getBoundingClientRect(); if (e.target.matches(':focus-visible') && Math.abs(r.top) > 2 && r.height <= innerHeight + 2) scrollTo({ top: scrollY + r.top, behavior: 'instant' }); });
    if ('IntersectionObserver' in window) {
      // the select waits in the dark until it is reached, then its world fades up and its lead steps in, once
      if (!reduced() && sel.getBoundingClientRect().top > innerHeight * .5) sel.classList.add('sel-wait');
      new IntersectionObserver((es) => {
        const en = es[0];
        // [roster] the select can be taller than the screen (the wall under the stage): half of it, or half the screen, counts as on screen
        const seen = en.intersectionRect.height; selOnScreen = seen >= Math.min(en.boundingClientRect.height * .5, innerHeight * .5);
        if (seen >= Math.min(en.boundingClientRect.height * .35, innerHeight * .35) && sel.classList.contains('sel-wait')) { sel.classList.replace('sel-wait', 'is-lit'); }
        selWake();
      }, { threshold: [0, .1, .2, .35, .5, .75] }).observe(sel);
    } else selOnScreen = true;
  }

  /* ---------- Ramcharitmanas: the transliteration under each line can be hidden; the choice is remembered ---------- */
  const mx = $('[data-manas]'); const trBtn = $('[data-mx-tr]');
  if (mx && trBtn) {
    const KEY = 'spritual:manas-tr';
    const apply = (on) => { mx.classList.toggle('no-tr', !on); trBtn.setAttribute('aria-pressed', String(on)); };
    let on = true; try { on = localStorage.getItem(KEY) !== '0'; } catch {}
    apply(on);
    trBtn.addEventListener('click', () => { on = !on; apply(on); try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {} });
  }
  // the doha list closes once a doha is chosen
  $$('.mx-jump a').forEach((a) => a.addEventListener('click', () => a.closest('details')?.removeAttribute('open')));

  /* ---------- A kand on a phone: one episode open at a time ----------
     The page is a whole kand (sixty dohas and more): on a phone each episode after the first shows its painting, title and
     summary, and its verses wait behind "Read this episode". Nothing is removed: the address of every episode and doha still
     works (the episode it is in opens, and the page goes there), and the browser's find-in-page still searches the verses
     (hidden="until-found", which opens the episode it finds them in). Wider screens keep the whole kand open. */
  const eps = $$('section.mx-ep[id^="ep-"]');
  if (eps.length > 2 && matchMedia('(max-width: 759px)').matches) {
    const hiL = root.lang === 'hi';
    const unfold = (ep) => {
      const tx = $('.mx-text', ep); if (!tx || !ep.classList.contains('is-folded')) return;
      tx.removeAttribute('hidden'); ep.classList.remove('is-folded');
      const b = $('.mx-ep-open', ep); if (b) b.remove();
    };
    const target = () => { let id = ''; try { id = decodeURIComponent(location.hash.slice(1)); } catch {} return id ? document.getElementById(id) : null; };
    const here = target(); const keep = here?.closest('section.mx-ep') || eps[0];
    eps.forEach((ep) => {
      if (ep === keep || ep === eps[0]) return;
      const tx = $('.mx-text', ep); if (!tx) return;
      ep.classList.add('is-folded'); tx.setAttribute('hidden', 'until-found'); if (!tx.id) tx.id = `${ep.id}-text`;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cx-btn cx-btn--line mx-ep-open'; b.setAttribute('aria-controls', tx.id); b.setAttribute('aria-expanded', 'false');
      b.textContent = hiL ? 'यह प्रसंग पढ़ें' : 'Read this episode';
      b.addEventListener('click', () => { unfold(ep); tx.querySelector('a, button, [tabindex]')?.focus({ preventScroll: true }); });
      tx.before(b);
      tx.addEventListener('beforematch', () => unfold(ep));
    });
    const go = () => { const t = target(); const ep = t?.closest('section.mx-ep'); if (ep && ep.classList.contains('is-folded')) { unfold(ep); requestAnimationFrame(() => t.scrollIntoView({ block: 'start' })); } };
    addEventListener('hashchange', go);
    // a link to the episode or doha already in the address (opened from a share): that episode was left open above
    if (here && keep !== eps[0]) requestAnimationFrame(() => here.scrollIntoView({ block: 'start' }));
  }

  /* ---------- Arrivals: tiles and titles come in once, in sequence, when they reach the screen, then stay put ---------- */
  if (!reduced() && 'IntersectionObserver' in window) {
    const targets = $$('[data-room="theatre"] .grid > .card, .cx-posters > li, .cast-tiles > li, .cast-rows > li, .cx-ways-grid > li, .cx-cast-row > li, .cx-rail > li, .cx-strip > li, .cx-head, .cx-row-head, .cast-h, .cx-now-body > *, .mx-opener, .mx-kand-grid > li');
    const vh = innerHeight;
    const fresh = targets.filter((el) => el.getBoundingClientRect().top > vh * .9);   // what is already on screen is left alone
    fresh.forEach((el) => el.classList.add('th-rv'));
    const io = new IntersectionObserver((es) => {
      const inNow = es.filter((en) => en.isIntersecting).map((en) => en.target).sort((a, b) => (a.getBoundingClientRect().top - b.getBoundingClientRect().top) || (a.getBoundingClientRect().left - b.getBoundingClientRect().left));
      inNow.forEach((el, k) => {
        io.unobserve(el); el.style.setProperty('--th-i', Math.min(k, 6)); el.classList.add('th-in');
        const done = () => { el.classList.remove('th-rv', 'th-in'); el.style.removeProperty('--th-i'); };
        el.addEventListener('animationend', (e) => { if (e.target === el) done(); }, { once: false });
        setTimeout(done, 2600);
      });
      // things start arriving a quarter of a screen before they are reached, so a quick scroll never lands on an empty frame
    }, { rootMargin: '0px 0px 25% 0px', threshold: 0 });
    fresh.forEach((el) => io.observe(el));
    // a library filter shows and hides cards: anything still waiting when the list changes is simply shown
    $('[data-filters]')?.addEventListener('input', () => fresh.forEach((el) => { el.classList.remove('th-rv', 'th-in'); io.unobserve(el); }));
  }

  /* ---------- Rails: film strips that scroll sideways, with buttons on pointer screens ---------- */
  for (const rail of $$('[data-rail-x]')) {
    const scope = rail.parentElement;
    const prev = $('[data-rail-prev]', scope); const next = $('[data-rail-next]', scope);
    const step = () => { const li = rail.querySelector('li'); return li ? li.getBoundingClientRect().width + (parseFloat(getComputedStyle(li.parentElement).columnGap) || 16) : 300; };
    const sync = () => { if (prev) prev.disabled = rail.scrollLeft < 4; if (next) next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4; };
    prev?.addEventListener('click', () => rail.scrollBy({ left: -step() * (innerWidth > 1000 ? 2 : 1), behavior: reduced() ? 'auto' : 'smooth' }));
    next?.addEventListener('click', () => rail.scrollBy({ left: step() * (innerWidth > 1000 ? 2 : 1), behavior: reduced() ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
  }

  /* ---------- The sound invitation on the opening screen mirrors the bar's sound switch ---------- */
  const invite = $('[data-sound-invite]'); const headBtn = $('.ed-head [data-sound]');
  if (invite && headBtn) {
    const lab = $('[data-sound-label]', invite);
    const sync = () => { const on = headBtn.getAttribute('aria-pressed') === 'true'; invite.setAttribute('aria-pressed', String(on)); if (lab) lab.textContent = on ? invite.dataset.lOn : invite.dataset.lOff; };
    invite.addEventListener('click', () => headBtn.click());
    new MutationObserver(sync).observe(headBtn, { attributes: true, attributeFilter: ['aria-pressed'] });
    sync();
  }

  /* ---------- A story poster opens into its story (cross-document view transition; the page also dissolves without it) ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]'); vtImg = null; vtWho = false;
    if (!a || a.target === '_blank' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    let url; try { url = new URL(a.href, location.href); } catch { return; }
    const who = /\/characters\/[^/]+\/$/.test(url.pathname);
    if (url.origin !== location.origin || !(who || /\/stories\//.test(url.pathname)) || url.hash) return;
    // (a person's tile opens into their page: the cut-out figure itself, or the tile's slice of their painting)
    const img = who ? a.querySelector('.cast-tile--scene .cast-tile-pic, .cast-tile-pic .art, .cx-cast-pic img') : a.querySelector('.cx-poster-pic img, .cx-now-screen img, .card-art img, .ed-card-pic img, .cx-next-pic img') || a.closest('.card')?.querySelector('.card-art img') || (a.matches('[data-vt-link], .cx-btn') ? $('.cx-now-screen img') : null);
    if (!img) return;
    // a picture only part in the screen (a card low under the foot, or half above the top) does not morph: it would grow from a place the reader cannot see
    const ir = img.getBoundingClientRect(); if (ir.top < 0 || ir.left < 0 || ir.bottom > innerHeight || ir.right > innerWidth) return;
    vtImg = img; vtWho = who;
    try { sessionStorage.setItem('cx-vt', url.pathname); sessionStorage.setItem('cx-vtk', who ? 'who' : ''); } catch {}
  }, true);
  addEventListener('pageswap', (e) => {
    if (!e.viewTransition || !vtImg) return;
    vtImg.style.viewTransitionName = 'cx-hero'; if (vtWho) document.documentElement.dataset.vt = 'who';
    e.viewTransition.finished?.finally?.(() => { if (vtImg) vtImg.style.viewTransitionName = ''; delete document.documentElement.dataset.vt; });
  });

  /* ---------- The cinematic layer (mobile.css): each scene's title card plays in, the painting on screen drifts slowly,
     openers are lamp-lit, and fire scenes send up embers. One observer for all of it; with reduced motion the CSS keeps
     everything still, and with Save-Data none of it starts. ---------- */
  const lowData = !!navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;
  if (!lowData) root.classList.add('cx-cine');
  const shots = $$('.shot'); const live = new Set(); let fireAt = 0, fire = null;
  const fireOn = () => [...live].some((el) => el.dataset.fx === 'embers');
  const lit = $$('.shot, .mx-opener, .cast-hero-pic');
  if (lit.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      for (const en of es) {
        const el = en.target;
        if (en.isIntersecting || en.boundingClientRect.bottom < 0) el.classList.add('is-seen');
        if (en.isIntersecting) live.add(el); else live.delete(el);
        // the next scene's painting is fetched while this one is on screen, so a reader never arrives at an empty frame
        if (en.isIntersecting && !lowData && !root.classList.contains('fm') && el.matches('.shot')) { const nx = shots[shots.indexOf(el) + 1]?.querySelector('img[loading="lazy"]'); if (nx) nx.loading = 'eager'; }
        if (!el.matches('.shot')) el.classList.toggle('is-live', en.isIntersecting);
      }
      // at most two paintings drift at once (the first two on screen)
      let k = 0; for (const el of shots) { const on = live.has(el) && k < 2; if (on) k++; el.classList.toggle('is-live', on); }
      if (fireOn()) fireAt = 0; else if (!fireAt) fireAt = performance.now();
      fire?.();
    }, { rootMargin: '0px 0px 12% 0px' });
    lit.forEach((el) => io.observe(el));
  }

  /* ---------- The title sequence can be skipped: any key, click, tap or scroll during it puts everything in place ---------- */
  if ($('.cx-home .cx-spark') && root.classList.contains('cx-js') && !root.classList.contains('cx-seen')) {
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const skip = $('[data-intro-skip]');
    // [fixA G08] The pill is the one stop in reach during the titles. Any key used to end the sequence on the spot, so a
    // keyboard reader never met it (the first Tab ended the intro and landed on the page's first link). Now Tab (or
    // Shift+Tab) lands on "Skip intro", Enter, Space or Esc skip, any other key still skips, and the header, the page's
    // "Skip to content" link and the opening's own buttons are inert, so Tab cannot wander under the curtain, until the
    // sequence is over (released by done(), or by the timer below).
    const under = [$('.ed-head'), $('.skip'), $('.cx-home .cx-open-card'), $('.cx-home .cx-open-foot'), ...$$('main.cx-home > *:not(.cx-open)')].filter((x) => x && !x.contains(skip));
    const rest = () => { for (const x of under) x.inert = false; };
    if (skip && !skip.hidden) for (const x of under) x.inert = true;
    const hold = (e) => {
      if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey || !skip || skip.hidden || document.activeElement === skip) return;
      e.preventDefault(); e.stopImmediatePropagation(); skip.focus({ preventScroll: true });
    };
    addEventListener('keydown', hold, true);
    const land = () => { for (const to of [$('.cx-home .cx-cue'), $('.cx-home h1')]) { if (!to) continue; if (!to.matches('a,button')) to.tabIndex = -1; try { to.focus({ preventScroll: true }); } catch (e) {} if (document.activeElement === to) break; } };
    const done = () => { const had = skip && document.activeElement === skip; root.classList.add('cx-seen'); rest(); removeEventListener('keydown', hold, true); if (had) land(); evs.forEach((n) => removeEventListener(n, done)); };
    evs.forEach((n) => addEventListener(n, done, { passive: true }));
    // the visible "Skip intro" pill (phones) does the same, and leaves once the sequence is over
    skip?.addEventListener('click', done);
    const sa = (() => { try { return $('.cx-home .cx-spark').getAnimations()[0]; } catch (e) { return null; } })();   // the sequence's own clock: the thread of light
    const spent = sa && typeof sa.startTime === 'number' ? performance.now() - sa.startTime : sa ? (sa.currentTime || 0) : performance.now();   // time since the thread began (a late script, or a finished animation, still reads true)
    setTimeout(() => { evs.forEach((n) => removeEventListener(n, done)); rest(); removeEventListener('keydown', hold, true); const had = skip && document.activeElement === skip; if (skip) skip.hidden = true; if (had) land(); }, Math.max(0, CX.handoffMs - spent));   // [First Light] hand-off at 6 s (4 s on a phone)
  }

  /* ---------- Theatre: the poster under the pointer leans toward it and catches the light ---------- */
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduced()) {
    for (const el of $$('[data-room="theatre"] .card, .cx-poster')) {
      el.classList.add('tilt');
      const sheen = document.createElement('span'); sheen.className = 'sheen'; sheen.setAttribute('aria-hidden', 'true'); el.append(sheen);
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        if (raf || reduced()) return;
        raf = requestAnimationFrame(() => {
          raf = 0; const r = el.getBoundingClientRect(); const x = clamp((e.clientX - r.left) / r.width); const y = clamp((e.clientY - r.top) / r.height);
          el.classList.add('is-lean');
          el.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((.5 - y) * 7).toFixed(2) + 'deg');
          el.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        });
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('is-lean'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    }
  }

  /* ---------- Theatre: dust in the projector's light, and a lamp that follows the hand ----------
     Forty-odd warm motes rising slowly behind everything, on the dark pages only. Stops when the tab is hidden, when
     motion is reduced, or when the reader chooses the light theme. */
  // one engine for both: warm motes (theatre) and embers (fire scenes); phones draw at 1x and 30 fps
  const motes = (cls, [glow, core], n, vy, ok, rk = 1, host = null, within = null) => {
    const cv = document.createElement('canvas'); cv.className = cls; cv.setAttribute('aria-hidden', 'true');
    const g = cv.getContext('2d');
    if (!g) return null;
    (host || document.body).append(cv);
    let W = 0, H = 0, ms = [], last = 0, on = false; const dpr = pocket ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    const make = (anyY) => ({ x: Math.random() * W, y: anyY ? Math.random() * H : H + 10, r: (.5 + Math.random() * 1.5) * rk, vy: vy[0] + Math.random() * vy[1], sway: 6 + Math.random() * 16, ph: Math.random() * 6.28, sp: .2 + Math.random() * .6, a: .12 + Math.random() * .4 });
    // a phone's toolbar sliding away changes the height mid-scroll: that alone does not rebuild the canvas
    const size = () => { if (W === innerWidth && (pocket ? Math.abs(H - innerHeight) < 160 : H === innerHeight)) return; W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); ms = Array.from({ length: n(W) }, () => make(true)); };
    // the page's own layers rest while the Watch theatre covers the page (watch.js); the theatre's layer is hosted inside it
    const quiet = () => document.hidden || reduced() || !ok() || (!host && root.classList.contains('wt-on'));
    let clipWas = '';
    const frame = (t) => {
      if (quiet()) { on = false; g.clearRect(0, 0, W, H); return; }
      requestAnimationFrame(frame);
      if (pocket && t - last < 30) return;
      // embers stay on their burning painting: the layer is clipped to it, so no spark drifts over the words being read
      if (within) { const b = within(); const c = b ? `inset(${Math.max(0, Math.round(b[0]))}px 0 ${Math.max(0, Math.round(H - b[1]))}px 0)` : clipWas; if (c !== clipWas) { clipWas = c; cv.style.clipPath = c; } }
      const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; g.clearRect(0, 0, W, H);
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i]; m.y -= m.vy * dt; m.ph += m.sp * dt; const x = m.x + Math.sin(m.ph) * m.sway;
        if (m.y < -12) ms[i] = make(false);
        const a = m.a * (.6 + .4 * Math.sin(m.ph * 2.3));
        g.fillStyle = `rgba(${glow},${(a * .18).toFixed(3)})`; g.beginPath(); g.arc(x, m.y, m.r * 3.4, 0, 6.283); g.fill();
        g.fillStyle = `rgba(${core},${a.toFixed(3)})`; g.beginPath(); g.arc(x, m.y, m.r, 0, 6.283); g.fill();
      }
    };
    const wake = () => { if (!on && !quiet()) { on = true; last = performance.now(); requestAnimationFrame(frame); } };
    size(); wake();
    addEventListener('resize', size);
    document.addEventListener('visibilitychange', wake);
    new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion', 'class'] });
    return { cv, wake };
  };
  // embers over a burning scene: they rise while it is on screen, and fade out (CSS) for a moment after it has gone
  const ember = !lowData && shots.some((el) => el.dataset.fx === 'embers') && motes('th-embers th-fire', ['255,110,30', '255,196,110'], (w) => (w < 760 ? 24 : Math.min(60, Math.round(w / 24))), [18, 40], () => fireOn() || (fireAt && performance.now() - fireAt < 900), 1.6, null, () => { let t = Infinity, b = -Infinity; for (const el of live) if (el.dataset.fx === 'embers') { const r = el.getBoundingClientRect(); t = Math.min(t, r.top); b = Math.max(b, r.bottom); } return b > t ? [t, b] : null; });
  if (ember) { fire = () => { ember.cv.classList.toggle('is-on', fireOn()); ember.wake(); }; fire(); }
  // the same embers for the Watch theatre (watch.js): drawn inside it, while ok() says a fire scene is on screen
  window.SpritualFx = { embers: (host, ok) => (lowData ? null : motes('th-embers wt-embers', ['255,110,30', '255,196,110'], (w) => (w < 760 ? 24 : Math.min(60, Math.round(w / 24))), [18, 40], ok, 1.6, host)) };
  // (not on a person's page or the People page: there a person's own light and air are the only ones, and nothing crosses a face)
  if (root.dataset.room === 'theatre' && !reduced() && !$('.cast-hero, .cast-wall')) {
    // the home opening has its own, richer dust (above): this layer rests while that one is on screen
    motes('th-embers', ['255,190,110', '255,214,160'], (w) => Math.round(Math.min(46, Math.max(14, w / 30))), [5, 16], () => root.dataset.theme !== 'light' && !root.classList.contains('cx-open-on'));
    if (fine) {
      const lamp = document.createElement('div'); lamp.className = 'th-lamp'; lamp.setAttribute('aria-hidden', 'true'); document.body.append(lamp);
      let lr = 0;
      addEventListener('pointermove', (e) => { if (lr) return; lr = requestAnimationFrame(() => { lr = 0; lamp.style.setProperty('--px', e.clientX + 'px'); lamp.style.setProperty('--py', e.clientY + 'px'); lamp.classList.add('is-on'); }); }, { passive: true });
      document.addEventListener('pointerleave', () => lamp.classList.remove('is-on'));
    }
  }

  kick();
  addEventListener('load', kick);
})();

/* [life-select] A row (.grid, .cx-posters, .cx-rail) whose card is under the pointer or holds the focus is marked .is-hand, so the rest of the row can step
   back (cinema.css). This replaced a :has() rule, which made every DOM change on the page cost the browser a re-check of all of those rows. */
(() => {
  if (!matchMedia('(hover: hover)').matches) return;
  const ROW = '.grid, .cx-posters, .cx-rail'; let hov = new Set(), foc = new Set(), on = new Set();
  const rowsOf = (el) => { const s = new Set(); for (let n = el; n && n.parentElement; n = n.parentElement) if (n.parentElement.matches && n.parentElement.matches(ROW)) s.add(n.parentElement); return s; };
  const sync = () => { const want = new Set([...hov, ...foc]); for (const r of on) if (!want.has(r)) r.classList.remove('is-hand'); for (const r of want) if (!on.has(r)) r.classList.add('is-hand'); on = want; };
  document.addEventListener('pointerover', (e) => { if (e.pointerType === 'touch') return; const n = rowsOf(e.target); if (n.size === hov.size && [...n].every((r) => hov.has(r))) return; hov = n; sync(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (hov.size) { hov = new Set(); sync(); } }, { passive: true });
  document.addEventListener('focusin', (e) => { foc = rowsOf(e.target); sync(); });
  document.addEventListener('focusout', () => { foc = new Set(); sync(); });
})();

/* A row that scrolls sideways ends in a soft fade while more lies beyond its edge, so the next item never shows as words cut
   mid-letter; at the end of the row the fade is gone. */
(() => {
  const rows = document.querySelectorAll('.cx-cast-row, .cx-ways-grid, .cx-scroll, .cx-posters');
  rows.forEach((r) => {
    // a card that the row's edge cuts shows its picture only: its label would show as half a word (cinema.css, .is-peek)
    let raf = 0;
    const peek = () => { raf = 0; const b = r.getBoundingClientRect(), lo = Math.max(b.left, 0), hi = Math.min(b.right, innerWidth); for (const li of (r.classList.contains('cx-scroll') && r.firstElementChild ? r.firstElementChild : r).children) { const x = li.getBoundingClientRect(); li.classList.toggle('is-peek', x.width > 0 && ((x.right > hi + 1 && x.left < hi - 1) || (x.left < lo - 1 && x.right > lo + 1))); } };
    const upd = () => { const more = r.scrollWidth - r.clientWidth - r.scrollLeft > 4 && r.scrollWidth > r.clientWidth + 4; r.classList.toggle('has-more', more); if (!raf) raf = requestAnimationFrame(peek); };
    upd(); r.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); addEventListener('load', upd);
    if ('ResizeObserver' in window) new ResizeObserver(upd).observe(r);
  });
})();

/* "Look closer" (the brass lens): its script and styles are fetched only when the reader nears the section, not with the story's first screens. */
(() => {
  const s = document.getElementById('look-closer'); if (!s || !s.dataset.lensJs || !('IntersectionObserver' in window)) return;
  let done = false;
  const go = () => { if (done) return; done = true; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = s.dataset.lensCss; document.head.appendChild(l); const j = document.createElement('script'); j.src = s.dataset.lensJs; j.defer = true; document.head.appendChild(j); };
  const o = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); go(); } }, { rootMargin: '1600px 0px' });
  o.observe(s); addEventListener('hashchange', () => { if (location.hash === '#look-closer') go(); });
})();
