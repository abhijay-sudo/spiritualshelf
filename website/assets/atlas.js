/* The Atlas of Bharatvarsha: pan and zoom, the card a place lifts, and the thread that draws Rama's road.
   The page is complete without this file (assets/atlas.css); everything here is an addition to it. */
(() => {
  const root = document.documentElement; const map = document.querySelector('[data-at-map]'); const dataEl = document.getElementById('atlas-data');
  if (!map || !dataEl) return;
  const D = JSON.parse(dataEl.textContent); const view = map.querySelector('[data-at-view]'); const sheet = map.querySelector('[data-at-sheet]');
  const still = () => root.dataset.motion === 'reduce' || !!root.dataset.light || root.classList.contains('ep-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)); const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k]);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
  root.classList.add('at-live'); root.classList.toggle('at-still', still()); if (!still()) { root.classList.add('at-draw'); setTimeout(() => root.classList.remove('at-draw'), 3200); }

  /* ---------- pan and zoom: one transform on the sheet; names keep their size ---------- */
  // the closest view stops where the 1600 px sheet would begin to go soft on this screen
  const relief = sheet.querySelector('.at-relief'); let k = 1, x = 0, y = 0, W = view.clientWidth, H = view.clientHeight;
  const kmax = () => clamp(2000 / (W * (window.devicePixelRatio || 1)), 2.56, 4); let KMAX = kmax(), sharp = false;
  // two names never lie over one another: where their labels meet, the one of the lower rank gives way (it is still in the list below and
  // comes back as the sheet is opened out); a name that has the keyboard's focus never gives way
  const pinsAll = [].slice.call(map.querySelectorAll('.at-pin')); let dcT = 0, dcK = 0;
  const declutter = () => {
    const live = pinsAll.filter((li) => li.dataset.rank !== '2' || k >= 1.5);
    live.forEach((li) => li.classList.remove('is-clash'));
    const keep = []; const hit = (a, b) => a.left < b.right + 2 && a.right > b.left - 2 && a.top < b.bottom + 1 && a.bottom > b.top - 1;
    live.slice().sort((a, b) => (+a.dataset.rank || 1) - (+b.dataset.rank || 1)).forEach((li) => {
      const sp = li.querySelector('span'), r = sp.getBoundingClientRect(); if (!r.width) return;
      if (!li.contains(document.activeElement) && keep.some((q) => hit(r, q))) li.classList.add('is-clash'); else keep.push(r);
    });
  };
  function declutterSoon() { if (dcK === k && dcT) return; dcK = k; clearTimeout(dcT); dcT = setTimeout(() => { declutter(); setTimeout(declutter, 520); dcT = 0; }, 80); }
  const apply = () => {
    k = clamp(k, 1, KMAX); x = clamp(x, W - W * k, 0); y = clamp(y, H - H * k, 0);
    sheet.style.transform = k === 1 ? '' : `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${k.toFixed(4)})`; sheet.style.setProperty('--inv', (1 / k).toFixed(4));
    map.classList.toggle('at-zoomed', k > 1.01); map.classList.toggle('at-z2', k >= 1.5); map.classList.toggle('at-z3', W * k / D.view[0] >= .75);
    if (!sharp && k > 1.15 && relief) { sharp = true; relief.sizes = '1600px'; }   // the full sheet, once the reader comes closer
    declutterSoon();
    if (bOut) { bOut.disabled = k <= 1.01; bIn.disabled = k >= KMAX - .01; bAll.disabled = k <= 1.01; }
  };
  const ease = (on) => { sheet.classList.toggle('is-ease', on && !still()); };
  const zoomAt = (nk, cx, cy, smooth) => { nk = clamp(nk, 1, KMAX); const px = (cx - x) / k, py = (cy - y) / k; ease(smooth); k = nk; x = cx - px * k; y = cy - py * k; apply(); closeCard(); };
  const centreOn = (sx, sy, smooth) => { ease(smooth); x = W / 2 - sx * W * k; y = H / 2 - sy * H * k; apply(); };
  let bIn, bOut, bAll;
  // [fixGC] the map's controls (follow the road, step, zoom) stand in a bar under the sheet, not on it: they used to lie over place names
  const dock = el('div', 'at-dock'); view.after(dock);
  { const tools = el('div', 'at-tools'); const ic = { in: '<path d="M4 12h16M12 4v16"/>', out: '<path d="M4 12h16"/>', all: '<path d="M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4"/>' };
    const btn = (key, label, fn) => { const b = el('button', '', `<svg viewBox="0 0 24 24" aria-hidden="true">${ic[key]}</svg><span class="visually-hidden">${label}</span>`); b.type = 'button'; b.title = label; b.addEventListener('click', fn); tools.append(b); return b; };
    bIn = btn('in', D.t.zoomIn, () => zoomAt(k * 1.6, W / 2, H / 2, true)); bOut = btn('out', D.t.zoomOut, () => zoomAt(k / 1.6, W / 2, H / 2, true)); bAll = btn('all', D.t.reset, () => zoomAt(1, W / 2, H / 2, true));
    dock.append(tools); }
  const ptrs = new Map(); let drag = null, moved = false, engaged = false;
  const local = (e) => { const r = view.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  view.addEventListener('pointerdown', (e) => { if (e.button) return; engaged = true; ptrs.set(e.pointerId, local(e)); moved = false; ease(false);
    if (ptrs.size === 1) drag = { x, y, at: local(e) }; else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), k }; } });
  view.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId) || !drag) return; const p = local(e); ptrs.set(e.pointerId, p);
    if (ptrs.size >= 2 && drag.pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2; const px = (cx - x) / k, py = (cy - y) / k; k = clamp(drag.k * d / drag.pinch, 1, KMAX); x = cx - px * k; y = cy - py * k; moved = true; sheet.classList.add('is-moving'); apply(); closeCard(); return; }
    if (k <= 1.01 || !drag.at) return; const dx = p[0] - drag.at[0], dy = p[1] - drag.at[1]; if (!moved && Math.hypot(dx, dy) < 6) return;
    if (!moved) { moved = true; view.classList.add('is-drag'); sheet.classList.add('is-moving'); try { view.setPointerCapture(e.pointerId); } catch (err) {} closeCard(); }
    x = drag.x + dx; y = drag.y + dy; apply(); });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size === 1) drag = { x, y, at: [...ptrs.values()][0] }; if (!ptrs.size) { drag = null; view.classList.remove('is-drag'); sheet.classList.remove('is-moving'); } };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  view.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  view.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !ptrs.size) engaged = false; });
  view.addEventListener('wheel', (e) => { if (!(e.ctrlKey || engaged || k > 1.01)) return; e.preventDefault(); const [cx, cy] = local(e); zoomAt(k * Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0022)), cx, cy, false); }, { passive: false });
  view.addEventListener('dblclick', (e) => { if (e.target.closest('a')) return; const [cx, cy] = local(e); zoomAt(k > 2.4 ? 1 : k * 1.8, cx, cy, true); });
  view.addEventListener('keydown', (e) => { if (e.target !== view) return; const step = 70; const go = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (go) { if (k <= 1.01) return; e.preventDefault(); ease(true); x += go[0]; y += go[1]; apply(); } else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(k * 1.6, W / 2, H / 2, true); } else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(k / 1.6, W / 2, H / 2, true); } else if (e.key === '0') { e.preventDefault(); zoomAt(1, W / 2, H / 2, true); } });
  addEventListener('resize', () => { const w = view.clientWidth; if (!w || w === W) return; const r = w / W; W = w; H = view.clientHeight; KMAX = kmax(); x *= r; y *= r; apply(); placeBead(); });

  /* ---------- the card a place lifts: its painting, where tradition places it, its stories ---------- */
  const card = el('div', 'at-card'); card.setAttribute('role', 'group'); map.append(card); let cardFor = null, sticky = false, hideT = 0, showT = 0;
  const pinOf = (id) => map.querySelector(`[data-at-pin="${id}"]`);
  function openCard(a, stick) {
    if (flying && !stick) return;
    const id = a.dataset.atPin; const src = document.getElementById('p-' + id); if (!src) return; clearTimeout(hideT);
    if (cardFor !== id) { const artEl = src.querySelector('.at-art'); const rest = [...src.children].filter((n) => n !== artEl).map((n) => (n.classList.contains('at-place-txt') ? n.innerHTML : n.outerHTML)).join('');
      card.innerHTML = `<button type="button" class="at-card-x" aria-label="${D.t.close}">×</button>${artEl ? artEl.outerHTML : ''}<div class="at-card-txt">${rest}</div>`; card.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')); card.querySelectorAll('details.at-more').forEach((d) => { const sm = d.querySelector('summary'); if (sm) sm.remove(); d.replaceWith(...d.childNodes); });   /* [A] the card shows the stories at once */
      card.querySelectorAll('img').forEach((im) => { im.loading = 'eager'; im.sizes = '280px'; if (im.complete && im.naturalWidth) im.classList.add('is-in'); else im.addEventListener('load', () => im.classList.add('is-in'), { once: true }); }); card.querySelectorAll('.at-art').forEach((n) => { n.removeAttribute('tabindex'); n.removeAttribute('aria-hidden'); n.setAttribute('aria-label', src.querySelector('h3').textContent); }); card.setAttribute('aria-label', src.querySelector('h3').textContent); }
    map.querySelectorAll('.at-pin.is-on').forEach((n) => n.classList.remove('is-on')); a.parentNode.classList.add('is-on'); cardFor = id; sticky = !!stick;
    const m = map.getBoundingClientRect(), r = a.querySelector('i').getBoundingClientRect(); const dock = m.width < 520; card.classList.toggle('is-dock', dock); const cw = card.offsetWidth, ch = card.offsetHeight;
    if (dock) { const low = r.top + r.height / 2 - m.top > H * .5; card.style.left = ''; card.style.top = (low ? 6 : Math.max(6, H - ch - 6)) + 'px'; card.style.setProperty('--ox', '50%'); card.style.setProperty('--oy', low ? '0%' : '100%'); card.classList.add('is-open'); return; } const px = r.left + r.width / 2 - m.left, py = r.top + r.height / 2 - m.top;
    const left = clamp(px - cw / 2, 4, m.width - cw - 4); const above = py - ch - 16 > -40 || py > m.height / 2; const top = above ? Math.max(py - ch - 16, -40) : py + 18;
    card.style.left = left + 'px'; card.style.top = top + 'px'; card.style.setProperty('--ox', `${px - left}px`); card.style.setProperty('--oy', above ? '100%' : '0%'); card.classList.add('is-open');
  }
  function closeCard() { clearTimeout(showT); if (!cardFor) return; card.classList.remove('is-open'); map.querySelectorAll('.at-pin.is-on').forEach((n) => n.classList.remove('is-on')); cardFor = null; sticky = false; }
  const later = () => { clearTimeout(hideT); hideT = setTimeout(() => { if (!sticky) closeCard(); }, 260); };
  map.querySelectorAll('[data-at-pin]').forEach((a) => {
    a.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || ptrs.size || flying) return; clearTimeout(showT); showT = setTimeout(() => { if (!sticky) openCard(a, false); }, 90); });
    a.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { clearTimeout(showT); later(); } });
    a.addEventListener('focus', () => { if (flying || !a.matches(':focus-visible')) return; if (k > 1.01) { const li = a.parentNode; centreOn(parseFloat(li.style.left) / 100, parseFloat(li.style.top) / 100, true); setTimeout(() => openCard(a, false), still() ? 0 : 520); } else openCard(a, false); });
    a.addEventListener('blur', () => { if (!sticky) later(); });
    // a pointer lifts the card and keeps it; the keyboard's Enter follows the link to the place's entry in the list
    a.addEventListener('click', (e) => { if (e.detail === 0) return; e.preventDefault(); if (cardFor === a.dataset.atPin && sticky) closeCard(); else openCard(a, true); });
  });
  card.addEventListener('pointerenter', () => clearTimeout(hideT)); card.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') later(); });
  card.addEventListener('click', (e) => { if (e.target.closest('.at-card-x')) { const a = pinOf(cardFor); closeCard(); if (a) a.focus({ preventScroll: true }); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cardFor) { const a = pinOf(cardFor); closeCard(); if (a && card.contains(document.activeElement)) a.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (cardFor && sticky && !card.contains(e.target) && !e.target.closest('[data-at-pin]')) closeCard(); });

  /* ---------- Rama's road: the thread draws it; each stop brings its scene ---------- */
  const N = D.stops.length; const golds = map.querySelectorAll('[data-at-gold]'); const offs = [...map.querySelectorAll('[data-at-off]')];
  const bead = map.querySelector('[data-at-bead]'); const stops = [...document.querySelectorAll('[data-at-stop]')];
  const cum = [0]; for (let i = 1; i < D.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(D.pts[i][0] - D.pts[i - 1][0], D.pts[i][1] - D.pts[i - 1][1]));
  const at = (s) => { const t = clamp(s, 0, 1) * cum[cum.length - 1]; let lo = 1, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < t) lo = m + 1; else hi = m; } const u = (t - cum[lo - 1]) / (cum[lo] - cum[lo - 1] || 1); const a = D.pts[lo - 1], b = D.pts[lo]; return [(a[0] + (b[0] - a[0]) * u) / D.view[0], (a[1] + (b[1] - a[1]) * u) / D.view[1]]; };
  const far = D.stops.indexOf(Math.max(...D.stops)); let v = 0, goal = 0, shown = -1, beadAt = [0, 0], raf = 0; let flying = false;   // the flight (below) holds the camera itself while it plays
  const placeBead = () => { bead.style.transform = `translate(${(beadAt[0] * W).toFixed(1)}px,${(beadAt[1] * H).toFixed(1)}px)`; };
  const scrub = el('div', 'at-scrub'); const prev = el('button', '', D.t.prev), next = el('button', '', D.t.next); prev.type = next.type = 'button';
  const range = el('input', 'at-range'); range.type = 'range'; range.min = 0; range.max = (N - 1) * 100; range.step = 1; range.value = 0; range.setAttribute('aria-label', D.t.slider);
  const ticks = el('div', 'at-ticks', D.stops.map(() => '<i></i>').join('')); ticks.setAttribute('aria-hidden', 'true'); scrub.append(prev, range, next, ticks); map.append(scrub);
  const render = () => {
    const i = Math.min(N - 2, Math.floor(v)), f = v - i; const s = D.stops[i] + (D.stops[i + 1] - D.stops[i]) * f; const drawn = v <= far ? s : 1;
    const off = (1 - drawn).toFixed(4); golds.forEach((g) => { g.style.strokeDashoffset = off; });
    beadAt = at(s); placeBead(); range.style.setProperty('--p', (v / (N - 1) * 100).toFixed(2) + '%');
    const n = Math.round(v); if (n !== shown) { shown = n; stops.forEach((li, j) => li.classList.toggle('is-on', j === n)); map.querySelectorAll('.at-pin.is-here').forEach((li) => li.classList.remove('is-here')); const here = D.ids[n] && pinOf(D.ids[n]); if (here) here.parentNode.classList.add('is-here'); bead.classList.toggle('is-off', !!D.off[n]); offs.forEach((a) => a.classList.toggle('is-here', a.dataset.atOff === D.off[n])); [...ticks.children].forEach((t, j) => t.classList.toggle('is-on', j <= n)); range.setAttribute('aria-valuetext', `${fill(D.t.stopOf, { n: n + 1, m: N })}: ${D.names[n]}`); }
    prev.disabled = goal === 0 && v < .01; next.disabled = goal === N - 1 && v > N - 1.01;
    if (k > 1.01 && !flying) { const bx = beadAt[0] * W * k + x, by = beadAt[1] * H * k + y; if (bx < 40 || bx > W - 40 || by < 40 || by > H - 40) centreOn(beadAt[0], beadAt[1], false); }
  };
  const travel = (to) => { to = goal = clamp(to, 0, N - 1); cancelAnimationFrame(raf); if (still() || Math.abs(to - v) < .004) { v = to; range.value = Math.round(v * 100); render(); return; }
    const from = v, t0 = performance.now(), dur = 420 + 520 * Math.min(1.6, Math.abs(to - from)); const tick = (now) => { const p = clamp((now - t0) / dur, 0, 1), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; v = from + (to - from) * e; range.value = Math.round(v * 100); render(); if (p < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); };
  range.addEventListener('input', () => { cancelAnimationFrame(raf); v = range.value / 100; goal = Math.round(v); render(); });
  range.addEventListener('change', () => travel(Math.round(v)));
  range.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 1, PageDown: -1 }[e.key]; if (d) { e.preventDefault(); travel(goal + d); } else if (e.key === 'Home') { e.preventDefault(); travel(0); } else if (e.key === 'End') { e.preventDefault(); travel(N - 1); } });
  prev.addEventListener('click', () => travel(goal - 1)); next.addEventListener('click', () => travel(goal + 1));
  apply(); render();

  /* ---------- the flight: Rama's road, flown stop by stop ----------
     A slow glide along the thread; at each stop the camera holds, the scene's painting rises with its line (taken word for
     word from the scene, with its source) and sinks again before the map moves on. Pause, skip and end are always on screen,
     and any touch of the map takes the camera back. With reduced motion there is no flight: the stops stand as a list. */
  const ic = { play: '<path d="M8 5.5v13l11-6.5z"/>', pause: '<path d="M8 5.5v13M16 5.5v13"/>', prev: '<path d="M6 5.5v13M18 5.5 9 12l9 6.5z"/>', next: '<path d="M18 5.5v13M6 5.5 15 12l-9 6.5z"/>', end: '<path d="M6 6l12 12M18 6 6 18"/>' };
  const icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ic[n]}</svg>`;
  const layer = el('div', 'at-fly-layer'); const bar = el('div', 'at-fly-bar'); const sheetUp = el('div', 'at-fly-sheet'); sheetUp.setAttribute('role', 'group'); sheetUp.setAttribute('aria-label', D.t.fly); const say = el('p', 'visually-hidden'); say.setAttribute('aria-live', 'polite'); say.setAttribute('aria-atomic', 'true');
  const mk = (cls, label, ico, text) => { const b = el('button', cls, icon(ico) + (text ? `<span>${text}</span>` : '')); b.type = 'button'; if (!text) { b.setAttribute('aria-label', label); b.title = label; } return b; };
  const bMain = mk('at-fly-main', D.t.fly, 'play', D.t.fly), bPrev = mk('at-fly-sm', D.t.prev, 'prev'), bNext = mk('at-fly-sm', D.t.next, 'next'), bEnd = mk('at-fly-sm', D.t.flyEnd, 'end');
  const tags = el('div', 'at-fly-tags'); const tag = el('p', 'at-fly-tag', D.t.routeTag); const tagOff = el('p', 'at-fly-tag at-fly-off', D.t.offTag); tags.append(tag, tagOff); const mainLabel = (ico, text) => { bMain.innerHTML = icon(ico) + `<span>${text}</span>`; };
  bar.append(bMain, bPrev, bNext, bEnd); layer.append(tags, sheetUp, say); dock.prepend(bar); map.append(layer);
  const fl = { st: 'idle', i: 0, ph: '', t: 0, dur: 0, v0: 0, fk: 1, oy: 0, oyT: 0, kT: 1, last: 0, raf: 0, blend: 1, ucam: null, dirty: false, hold: 0 };
  const KF = () => clamp(W < 520 ? 2.3 : 2.05, 1, KMAX);
  const dwellFor = (i) => { const q = stops[i].querySelector('.at-stop-q'); return clamp(3.6 + (q ? q.textContent.length : 60) * .055, 5.6, 9.6); };
  const setUi = () => {
    const live = fl.st !== 'idle'; const hadFocus = bar.contains(document.activeElement); map.classList.toggle('at-flying', live); flying = live;
    [bPrev, bNext, bEnd].forEach((b) => { b.hidden = !live; }); bPrev.disabled = live && fl.i === 0;
    tagOff.classList.toggle('is-on', live && !!D.off[fl.i] && fl.ph !== 'out');
    // the focused button never vanishes under the keyboard: focus moves to the main button, or to Next when Earlier has just run out
    if (hadFocus) { const f = document.activeElement; if (f === bPrev && bPrev.disabled) bNext.focus({ preventScroll: true }); else if (f.hidden || !live) bMain.focus({ preventScroll: true }); }
    if (fl.st === 'play') { mainLabel('pause', D.t.flyPause); } else if (fl.st === 'pause') { mainLabel('play', D.t.flyPlay); } else { mainLabel('play', D.t.fly); }
    bMain.classList.toggle('is-idle', !live);
  };
  const showSheet = (i) => {
    const li = stops[i]; const pic = li.querySelector('.at-stop-pic'), txt = li.querySelector('.at-stop-txt');
    sheetUp.innerHTML = `<div class="at-fly-pic">${pic ? pic.innerHTML.replace(/ alt="[^"]*"/, ' alt=""') : ''}</div><div class="at-fly-txt">${txt ? txt.innerHTML : ''}</div>`;
    sheetUp.querySelectorAll('img').forEach((im) => { im.loading = 'eager'; im.sizes = '(max-width: 900px) 92vw, 36rem'; if (im.complete && im.naturalWidth) im.classList.add('is-in'); else im.addEventListener('load', () => im.classList.add('is-in'), { once: true }); });
    const q = txt && txt.querySelector('.at-stop-q'); say.textContent = `${fill(D.t.stopOf, { n: i + 1, m: N })}: ${D.names[i]}.${q ? ' ' + q.textContent.trim() : ''}`;
    sheetUp.classList.add('is-up'); const h = sheetUp.offsetHeight + 8; fl.oyT = Math.max(H * .2, (H - h) / 2);
  };
  const hideSheet = () => { sheetUp.classList.remove('is-up'); fl.oyT = H / 2; };
  const camera = (dt) => {
    fl.fk += (fl.kT - fl.fk) * (1 - Math.exp(-dt * 2.4)); fl.oy += (fl.oyT - fl.oy) * (1 - Math.exp(-dt * 3.2));
    let kk = clamp(fl.fk, 1, KMAX), tx = W / 2 - beadAt[0] * W * kk, ty = fl.oy - beadAt[1] * H * kk;
    if (fl.blend < 1 && fl.ucam) { fl.blend = Math.min(1, fl.blend + dt / .9); const b = fl.blend * fl.blend * (3 - 2 * fl.blend), u = fl.ucam; kk = u.k + (kk - u.k) * b; tx = u.x + (tx - u.x) * b; ty = u.y + (ty - u.y) * b; }
    k = kk; x = tx; y = ty; apply();
  };
  const go = (ph, dur) => { fl.ph = ph; fl.t = 0; fl.dur = dur; if (ph === 'glide') fl.v0 = v; };
  const toStop = (i) => { fl.i = i; goal = i; hideSheet(); go('drop', .45); setUi(); };
  const finish = () => { fl.st = 'idle'; fl.ph = ''; cancelAnimationFrame(fl.raf); hideSheet(); setUi(); zoomAt(1, W / 2, H / 2, true); };
  const tick = (dt) => {
    if (fl.hold > 0) { fl.hold -= dt; return; } fl.t += dt; const p = fl.dur ? clamp(fl.t / fl.dur, 0, 1) : 1;
    if (fl.ph === 'drop') { if (p >= 1) { const d = Math.abs(D.stops[fl.i] - D.stops[clamp(Math.round(v), 0, N - 1)]); go('glide', clamp(2.2 + d * 6, v === fl.i ? .9 : 2.2, 5.2)); } }
    else if (fl.ph === 'glide') { const e = p * p * p * (p * (6 * p - 15) + 10); v = fl.v0 + (fl.i - fl.v0) * e; range.value = Math.round(v * 100); render(); if (p >= 1) { v = fl.i; render(); go('dwell', dwellFor(fl.i)); showSheet(fl.i); } }
    else if (fl.ph === 'dwell') { if (p >= 1) { if (fl.i >= N - 1) { hideSheet(); go('out', 1.4); fl.kT = 1; } else { toStop(fl.i + 1); } } }
    else if (fl.ph === 'out') { if (p >= 1) { finish(); return; } }
    camera(dt);
  };
  const loop = (now) => { fl.raf = 0; if (fl.st !== 'play') return; const dt = Math.min(.05, (now - (fl.last || now)) / 1000); fl.last = now; tick(dt); if (fl.st === 'play') fl.raf = requestAnimationFrame(loop); };
  const run = () => { fl.st = 'play'; fl.last = 0; setUi(); if (!fl.raf) fl.raf = requestAnimationFrame(loop); };
  // the map is brought fully into view before the camera moves: the flight is the page's signature, so it is never started below the fold
  const frameMap = () => { const r = view.getBoundingClientRect(), vh = innerHeight, top = 76; if (r.top >= top - 2 && r.bottom <= vh + 2) return 0; view.scrollIntoView({ block: r.height > vh - top ? 'start' : 'center', behavior: still() ? 'auto' : 'smooth' }); return .6; };
  const start = () => {
    if (still()) return; closeCard(); stops.forEach((li) => { const im = li.querySelector('img'); if (im) im.loading = 'eager'; }); sheet.classList.remove('is-ease'); ease(false);
    fl.i = 0; goal = 0; fl.hold = frameMap(); fl.fk = k; fl.kT = KF(); fl.oy = fl.oyT = H / 2; fl.blend = 1; fl.ucam = null; fl.dirty = false; sheetUp.classList.remove('is-up'); go('glide', v < .01 ? 1.6 : 2.4); run();
  };
  const pause = () => { if (fl.st !== 'play') return; fl.st = 'pause'; cancelAnimationFrame(fl.raf); fl.raf = 0; setUi(); };
  const resume = () => {
    if (fl.st !== 'pause') return; fl.blend = 0; fl.ucam = { k, x, y }; fl.fk = k; fl.kT = KF(); fl.oy = fl.oyT = H / 2;
    if (fl.dirty) { fl.dirty = false; fl.v0 = v; const n = clamp(Math.round(v), 0, N - 1); sheetUp.classList.remove('is-up'); fl.i = n; goal = n; go('glide', 1.2); } else if (sheetUp.classList.contains('is-up')) { fl.oyT = Math.max(H * .2, (H - sheetUp.offsetHeight - 8) / 2); }
    run();
  };
  const skip = (d) => { if (fl.st === 'idle') return; const i = fl.i + d; if (i >= N) { if (fl.ph === 'out') return; hideSheet(); go('out', 1.4); fl.kT = 1; if (fl.st === 'pause') run(); return; } if (i < 0) return; toStop(i); if (fl.st === 'pause') { fl.blend = 1; run(); } };
  bMain.addEventListener('click', () => { if (fl.st === 'idle') start(); else if (fl.st === 'play') pause(); else resume(); });
  bPrev.addEventListener('click', () => skip(-1)); bNext.addEventListener('click', () => skip(1)); bEnd.addEventListener('click', () => { if (fl.st !== 'idle') finish(); });
  // a touch of the map, the zoom buttons or the thread takes the camera back: the flight waits where it is
  const taken = () => { if (fl.st === 'play') { fl.dirty = true; pause(); } else if (fl.st === 'pause') fl.dirty = true; };
  view.addEventListener('pointerdown', taken); view.addEventListener('wheel', taken, { passive: true }); view.addEventListener('keydown', (e) => { if (e.target === view && /^(Arrow|[-+=_0])/.test(e.key)) taken(); });
  scrub.addEventListener('pointerdown', taken); scrub.addEventListener('keydown', taken); bIn.addEventListener('click', taken); bOut.addEventListener('click', taken); bAll.addEventListener('click', taken);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fl.st !== 'idle' && !cardFor) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  new IntersectionObserver((es) => { if (!es[0].isIntersecting) pause(); }, { threshold: 0 }).observe(map);
  addEventListener('resize', () => { if (fl.st !== 'idle') { fl.kT = KF(); fl.oyT = sheetUp.classList.contains('is-up') ? Math.max(H * .2, (H - sheetUp.offsetHeight - 8) / 2) : H / 2; } });
  // reduced motion (the system's, the site's, Light mode) holds no flight: the stops stand as a list; this follows the setting live
  const settleStill = () => { const s = still(); root.classList.toggle('at-still', s); if (s && fl.st !== 'idle') { fl.st = 'idle'; cancelAnimationFrame(fl.raf); hideSheet(); setUi(); } };
  new MutationObserver(settleStill).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-light', 'class'] }); matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', settleStill);
  setUi();
  // the scenes' paintings are decoded one at a time while the page is idle, so a stop never waits on its picture mid-scrub
  if (!root.classList.contains('ep-lite')) { const imgs = stops.map((li) => li.querySelector('img')).filter(Boolean); const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200)); let i = 1;
    const nextImg = () => { const im = imgs[i++]; if (!im) return; im.loading = 'eager'; const go = () => idle(nextImg); (im.decode ? im.decode() : Promise.resolve()).then(go, go); }; addEventListener('load', () => setTimeout(() => idle(nextImg), 1200), { once: true }); if (document.readyState === 'complete') setTimeout(() => idle(nextImg), 1200); }
})();
