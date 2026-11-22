/* The brass dial: three rings (collections, then the chosen one's books and parts, then its stories) that turn by drag,
   wheel or arrow keys and settle on gentle detents. A second way around the site; the bar, the menu and every link stay as
   they are. Fetched the first time the emblem in the bar is pressed (see the [atlas] block at the end of site.js).
   A native <dialog>: focus stays inside while it is open, Escape closes it, and focus returns to the emblem. */
(() => {
  if (window.SpritualDial) return;
  const root = document.documentElement; const NS = 'http://www.w3.org/2000/svg';
  const still = () => root.dataset.motion === 'reduce' || !!root.dataset.light || root.classList.contains('ep-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)); const mod = (a, n) => ((a % n) + n) % n;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const UI = (() => { try { return JSON.parse(document.getElementById('ui').textContent); } catch (e) { return {}; } })();
  const R = [{ r: 86, w: 30 }, { r: 124, w: 30 }, { r: 164, w: 34 }];   // ring radius and band width, in a 400-unit face
  let dlg, data, T, base, rings = [], sel = [0, 0, 0], opener, audio, act = 0;

  /* a small brass tick on each detent, only once the reader has lit the lamp (the site's own sound setting) */
  const lamp = () => { try { return JSON.parse(localStorage.getItem('spritual:sound')) === true; } catch (e) { return false; } };
  const tick = (n) => { if (!lamp()) return; try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const t = audio.currentTime; const g = audio.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + .09); g.connect(audio.destination);
    for (const f of [1870 + n * 140, 2805 + n * 210]) { const o = audio.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + .1); } } catch (e) {} };

  const svg = (inner, cls) => `<svg class="${cls}" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">${inner}</svg>`;
  const baseArt = () => { const band = R.map((b, i) => `<circle r="${b.r}" fill="none" stroke="url(#dl-brass${i % 2})" stroke-width="${b.w}"/><circle r="${b.r + b.w / 2}" class="dl-groove"/><circle r="${b.r - b.w / 2}" class="dl-groove"/><circle r="${b.r + b.w / 2 - 2.2}" class="dl-shine"/>`).join('');
    const petals = Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M0 -58 C9 -50 9 -42 0 -36 C-9 -42 -9 -50 0 -58Z"/>`).join('');
    const lotus = Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45})" d="M0 -30 C8.5 -22 8.5 -14 0 -7 C-8.5 -14 -8.5 -22 0 -30Z"/>`).join('');   // an eight-petalled lotus round the bindu
    return svg(`<defs><linearGradient id="dl-brass0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4dc9c"/><stop offset=".32" stop-color="#c99a3d"/><stop offset=".62" stop-color="#8f6420"/><stop offset="1" stop-color="#d7ae56"/></linearGradient><linearGradient id="dl-brass1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecd08a"/><stop offset=".4" stop-color="#b98a32"/><stop offset=".7" stop-color="#7c5518"/><stop offset="1" stop-color="#c79d49"/></linearGradient><radialGradient id="dl-hub" cx=".38" cy=".3" r=".9"><stop offset="0" stop-color="#3a2512"/><stop offset="1" stop-color="#150c05"/></radialGradient></defs>
<circle r="190" fill="#120a04"/><circle r="188" fill="none" stroke="url(#dl-brass0)" stroke-width="5"/>${band}
<circle r="68" fill="url(#dl-hub)"/><circle r="68" class="dl-groove"/><g class="dl-yantra"><g class="dl-petals">${petals}</g><circle r="34"/>${lotus}<circle r="3.2" class="dl-bindu"/></g>
<path class="dl-index" d="M0 -193 L7 -205 H-7Z"/><path class="dl-index-line" d="M0 -186V-70"/>`, 'dl-base'); };
  const ringArt = (k, n, pitch) => { const b = R[k]; const beads = Array.from({ length: n }, (_, i) => { const a = i * pitch * Math.PI / 180; return `<circle class="dl-bead" data-i="${i}" cx="${(b.r * Math.sin(a)).toFixed(2)}" cy="${(-b.r * Math.cos(a)).toFixed(2)}" r="${k === 2 ? 5.6 : 6.2}"/>`; }).join('');
    return svg(`<circle r="${b.r + b.w / 2 - 5}" class="dl-ticks" pathLength="360" stroke-dasharray=".7 ${k === 2 ? 3.3 : 5.3}"/><circle r="${b.r}" class="dl-focus" stroke-width="${b.w - 2}"/>${beads}`, 'dl-ring-art'); };

  // a part is named with its book, unless its own name already carries the book's ("Ramayana, Bala Kanda")
  const arcName = (a) => (a.n.includes(a.b.split(' ').pop()) ? a.n : `${a.b} · ${a.n}`);
  const collOf = () => data.c[sel[0]]; const arcsOf = () => collOf().a; const storiesOf = () => arcsOf().flatMap((a) => a.s);
  const arcOfStory = (i) => { let n = 0; const arcs = arcsOf(); for (let a = 0; a < arcs.length; a++) { n += arcs[a].s.length; if (i < n) return a; } return 0; };
  const firstOfArc = (a) => arcsOf().slice(0, a).reduce((n, x) => n + x.s.length, 0);
  const items = (k) => (k === 0 ? data.c.map((c) => c.n) : k === 1 ? arcsOf().map(arcName) : storiesOf().map((s) => (UI.stories && UI.stories[s] ? UI.stories[s].t : s)));

  function setRing(k, keep) {
    const g = rings[k]; const list = items(k); const n = list.length; g.n = n; g.list = list; g.wrap = n >= 6; g.pitch = g.wrap ? 360 / n : 40;
    g.art.innerHTML = ringArt(k, n, g.pitch); if (!keep) { g.ang = -sel[k] * g.pitch; g.el.style.transition = 'none'; g.el.style.transform = `rotate(${g.ang}deg)`; }
    g.el.setAttribute('aria-valuemax', n); mark(k); if (k === act) near();
  }
  // beside the rings, in straight text: which ring is in hand, and the names waiting on either side of the mark
  function near() { if (!dlg) return; const g = rings[act]; if (!g || !g.list) return; const q = (x) => dlg.querySelector(x); const i = sel[act];
    rings.forEach((r, k) => r.el.classList.toggle('is-act', k === act));
    q('[data-dl-near-k]').textContent = `${T['r' + act]} · ${T.of.replace('{n}', i + 1).replace('{m}', g.n)}`;
    for (const [key, d] of [['prev', -1], ['next', 1]]) { const j = g.wrap ? mod(i + d, g.n) : i + d; const ok = g.n > 1 && j >= 0 && j < g.n && j !== i; const b = q(`[data-dl-${key}]`); b.classList.toggle('is-none', !ok); b.disabled = !ok; b.querySelector('b').textContent = ok ? g.list[j] : ''; } }
  function hold(k) { if (k !== act) { act = k; near(); } }
  function mark(k) { const g = rings[k]; g.art.querySelectorAll('.dl-bead').forEach((c, i) => c.classList.toggle('is-sel', i === sel[k])); g.el.setAttribute('aria-valuenow', sel[k] + 1); g.el.setAttribute('aria-valuetext', `${g.list[sel[k]]}, ${T.of.replace('{n}', sel[k] + 1).replace('{m}', g.n)}`); }
  function turnTo(k, i, quick) { const g = rings[k]; const n = g.n; if (g.wrap) { const cur = Math.round(-g.ang / g.pitch); let d = mod(i - cur, n); if (d > n / 2) d -= n; g.ang = -(cur + d) * g.pitch; } else g.ang = -clamp(i, 0, n - 1) * g.pitch;
    g.el.style.transition = still() || quick ? 'none' : ''; g.el.style.transform = `rotate(${g.ang}deg)`; }
  function read() {
    const c = collOf(), a = arcsOf()[sel[1]], slug = storiesOf()[sel[2]], s = UI.stories && UI.stories[slug]; const q = (x) => dlg.querySelector(x);
    q('[data-dl-c]').textContent = c.n; q('[data-dl-a]').textContent = arcName(a); q('[data-dl-t]').textContent = s ? s.t : '';
    q('[data-dl-go]').href = s ? s.h : base + c.p; q('[data-dl-coll]').href = base + c.p;
  }
  // choose item i on ring k; the rings are geared: a new collection resets the two outer rings, a part brings its first
  // story, and a story brings its part
  function choose(k, i, from) {
    const g = rings[k]; i = g.wrap ? mod(i, g.n) : clamp(i, 0, g.n - 1); if (i === sel[k] && from !== 'drag') { turnTo(k, i); return; }
    const changed = i !== sel[k]; sel[k] = i; if (from !== 'drag') turnTo(k, i); mark(k); if (changed) tick(k);
    if (k === 0) { sel[1] = 0; sel[2] = 0; for (const j of [1, 2]) { const el = rings[j].el; el.classList.add('is-swap'); setTimeout(() => { setRing(j); el.classList.remove('is-swap'); }, still() ? 0 : 160); } }
    else if (k === 1) { sel[2] = firstOfArc(i); turnTo(2, sel[2]); mark(2); }
    else { const a = arcOfStory(i); if (a !== sel[1]) { sel[1] = a; turnTo(1, a); mark(1); } }
    read(); act = k; near();
  }

  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'dl'; dlg.setAttribute('aria-label', T.title);
    dlg.innerHTML = `<div class="dl-in"><button type="button" class="dl-close" data-dl-close>${esc(T.close)}<span aria-hidden="true"> ×</span></button>
<div class="dl-face" data-dl-face>${baseArt()}${[0, 1, 2].map((k) => `<div class="dl-ring" data-k="${k}" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="${esc(T['r' + k])}" aria-valuemin="1"><div class="dl-ring-in"></div></div>`).join('')}</div>
<div class="dl-near"><p class="dl-near-k" data-dl-near-k></p><p class="dl-near-row"><button type="button" class="dl-near-b" data-dl-prev tabindex="-1" aria-hidden="true"><span>‹</span><b></b></button><button type="button" class="dl-near-b dl-near-b--n" data-dl-next tabindex="-1" aria-hidden="true"><b></b><span>›</span></button></p></div>
<div class="dl-read"><p class="dl-k" data-dl-c></p><p class="dl-a" data-dl-a></p><p class="dl-t" data-dl-t aria-live="polite"></p></div>
<p class="dl-acts"><a class="dl-go" data-dl-go href="#">${esc(T.go)}</a><a data-dl-coll href="#">${esc(T.coll)}</a><a href="${esc(base)}atlas/">${esc(T.atlas)}</a></p>
<p class="dl-hint">${esc(T.hint)}</p></div>`;
    document.body.append(dlg); const face = dlg.querySelector('[data-dl-face]');
    rings = [...dlg.querySelectorAll('.dl-ring')].map((el) => ({ el, art: el.firstChild, ang: 0 }));
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-dl-close]')) shut(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); shut(); });
    dlg.querySelector('[data-dl-prev]').addEventListener('click', () => choose(act, sel[act] - 1)); dlg.querySelector('[data-dl-next]').addEventListener('click', () => choose(act, sel[act] + 1));
    rings.forEach((g, k) => g.el.addEventListener('focus', () => hold(k)));
    rings.forEach((g, k) => g.el.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 1, PageUp: -1 }[e.key];
      if (d) { e.preventDefault(); choose(k, sel[k] + d); } else if (e.key === 'Home') { e.preventDefault(); choose(k, 0); } else if (e.key === 'End') { e.preventDefault(); choose(k, g.n - 1); } else if (e.key === 'Enter') { e.preventDefault(); dlg.querySelector('[data-dl-go]').click(); } }));
    // drag: the ring under the finger follows it, leaning into each detent, and settles on the nearest when let go
    const geo = (e) => { const b = face.getBoundingClientRect(); const u = 400 / b.width; const px = (e.clientX - b.left) * u - 200, py = (e.clientY - b.top) * u - 200; return { r: Math.hypot(px, py), a: Math.atan2(px, -py) * 180 / Math.PI }; };
    const ringAt = (r) => R.findIndex((b) => Math.abs(r - b.r) <= b.w / 2 + 5); let drag = null;
    const lean = (g, raw) => raw - .5 * (g.pitch / (2 * Math.PI)) * Math.sin(2 * Math.PI * raw / g.pitch);
    const bound = (g, raw) => { if (g.wrap) return raw; const lo = -(g.n - 1) * g.pitch; return raw > 0 ? raw * .3 : raw < lo ? lo + (raw - lo) * .3 : raw; };
    face.addEventListener('pointerdown', (e) => { if (e.button) return; const p = geo(e); const k = ringAt(p.r); if (k < 0) return; e.preventDefault(); const g = rings[k]; drag = { k, last: p.a, raw: g.ang, moved: 0, v: 0, t: e.timeStamp, a0: p.a }; try { face.setPointerCapture(e.pointerId); } catch (err) {} g.el.focus({ preventScroll: true }); });
    face.addEventListener('pointermove', (e) => { if (!drag) return; const p = geo(e); let d = p.a - drag.last; if (d > 180) d -= 360; if (d < -180) d += 360; drag.last = p.a; drag.raw += d; drag.moved += Math.abs(d); const dt = Math.max(1, e.timeStamp - drag.t); drag.v = .7 * drag.v + .3 * (d / dt); drag.t = e.timeStamp;
      if (drag.moved < 1.5) return; const g = rings[drag.k]; g.ang = bound(g, drag.raw); g.el.style.transition = 'none'; g.el.style.transform = `rotate(${lean(g, g.ang).toFixed(2)}deg)`;
      const i = g.wrap ? mod(Math.round(-g.ang / g.pitch), g.n) : clamp(Math.round(-g.ang / g.pitch), 0, g.n - 1); if (i !== sel[drag.k]) choose(drag.k, i, 'drag'); });
    const end = (e) => { if (!drag) return; const g = rings[drag.k], k = drag.k;
      if (drag.moved < 1.5) { const i = Math.round((mod(drag.a0 - g.ang + 180, 360) - 180) / g.pitch); if (g.wrap || (i >= 0 && i < g.n)) choose(k, g.wrap ? mod(i, g.n) : i); }   // a tap on a bead brings it to the mark
      else { const flick = still() ? 0 : clamp(drag.v * 130, -g.pitch * 1.4, g.pitch * 1.4); const tgt = Math.round(-(bound(g, drag.raw) + flick) / g.pitch); g.ang = bound(g, drag.raw); const i = g.wrap ? mod(tgt, g.n) : clamp(tgt, 0, g.n - 1); if (i !== sel[k]) choose(k, i, 'drag'); turnTo(k, i); }
      drag = null; };
    face.addEventListener('pointerup', end); face.addEventListener('pointercancel', end);
    let acc = 0; face.addEventListener('wheel', (e) => { e.preventDefault(); const p = geo(e); let k = ringAt(p.r); if (k < 0) k = p.r > R[2].r ? 2 : 0; hold(k); acc += e.deltaY; if (Math.abs(acc) >= 50) { choose(k, sel[k] + Math.sign(acc)); acc = 0; } }, { passive: false });
  }

  function open(btn) {
    opener = btn; base = btn.dataset.dialRoot || ''; const go = () => {
      if (!dlg) { build(); const here = location.pathname; let found = false;
        data.c.forEach((c, ci) => { let n = 0; c.a.forEach((a, ai) => a.s.forEach((s) => { const u = UI.stories && UI.stories[s]; if (!found && u && new URL(u.h, location.href).pathname === here) { sel = [ci, ai, n]; found = true; } n++; })); if (!found && here.includes('/collections/' + c.id + '/')) { sel = [ci, 0, 0]; found = true; } });
        if (!found) { // not on a story or a collection page: begin at the first story this page itself leads to, if any
          const here2 = new Map(); data.c.forEach((c, ci) => { let n = 0; c.a.forEach((a, ai) => a.s.forEach((s) => { const u = UI.stories && UI.stories[s]; if (u) here2.set(new URL(u.h, location.href).pathname, [ci, ai, n]); n++; })); });
          for (const a of document.querySelectorAll('main a[href]')) { let p; try { p = new URL(a.getAttribute('href'), location.href).pathname; } catch (e) { continue; } if (here2.has(p)) { sel = here2.get(p); found = true; break; } } }
        [0, 1, 2].forEach((k) => setRing(k)); read(); }
      dlg.classList.remove('is-shut', 'is-in'); dlg.showModal(); btn.setAttribute('aria-expanded', 'true');
      if (!still()) { const b = btn.getBoundingClientRect(), f = dlg.querySelector('[data-dl-face]').getBoundingClientRect(); dlg.style.setProperty('--dl-x', `${(b.left + b.width / 2 - f.left - f.width / 2).toFixed(0)}px`); dlg.style.setProperty('--dl-y', `${(b.top + b.height / 2 - f.top - f.height / 2).toFixed(0)}px`); dlg.classList.add('is-in'); setTimeout(() => dlg.classList.remove('is-in'), 1100); }
      act = 0; near(); rings[0].el.focus({ preventScroll: true }); };   // in order: collection, then its parts, then its stories
    if (data) return go();
    return fetch(btn.dataset.dial).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => { data = j; T = j.t; go(); });
  }
  function shut() { if (!dlg || !dlg.open) return; const done = () => { dlg.classList.remove('is-shut'); dlg.close(); if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); } };
    if (still()) return done(); dlg.classList.add('is-shut'); setTimeout(done, 260); }
  window.SpritualDial = { open, close: shut };
})();
