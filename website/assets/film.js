(() => {
const d = document, root = d.documentElement;
const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), ss = (t) => t * t * (3 - 2 * t);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const still = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const low = () => still() || !!root.dataset.light;
const DIYA = (cls = '') => `<svg class="fm-diya ${cls}" viewBox="0 0 48 48" aria-hidden="true"><path class="fl" d="M24 4c4.2 6.2 6.6 9.8 6.6 13.9a6.6 6.6 0 0 1-13.2 0C17.4 13.8 19.8 10.2 24 4Z"/><path class="wk" d="M24 28v-4.5"/><path class="bw" d="M4 27c5.2 1.6 12 2.3 20 2.3S38.8 28.6 44 27c-1.2 8.3-8.6 14-20 14S5.2 35.3 4 27Z"/></svg>`;
const langChip = () => { const a = d.querySelector('a.ed-lang[data-lang-switch]'); if (!a) return ''; const o = [...a.querySelectorAll('.ed-lang-opt')]; if (!o.length) return ''; const lbl = ($('.visually-hidden', a)?.textContent || '').replace(/^[\s—–-]+/, ''); return `<button type="button" class="fm-lang" data-fm-lang lang="${esc(a.getAttribute('lang') || '')}" aria-label="${esc(lbl)}" title="${esc(lbl)}">${o.map((x) => `<span class="fm-lang-o${x.classList.contains('ed-lang-cur') ? ' is-cur' : ''}" lang="${esc(x.lang)}" aria-hidden="true">${esc($('.l-s', x)?.textContent || x.textContent)}</span>`).join('')}</button>`; };
const LAMP = (id, cls = '') => `<svg class="fm-lampx ${cls}" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset=".35" stop-color="#ff9a3c" stop-opacity=".2"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient><linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9713f"/><stop offset=".5" stop-color="#8a4a26"/><stop offset="1" stop-color="#4a2412"/></linearGradient><linearGradient id="${id}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff8a1f"/><stop offset=".55" stop-color="#ffc24a"/><stop offset="1" stop-color="#fff0b8"/></linearGradient><radialGradient id="${id}o" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#3a1c0c"/><stop offset="1" stop-color="#1c0d06"/></radialGradient></defs><circle class="lh" cx="60" cy="46" r="58" fill="url(#${id}h)"/><path class="lb" d="M14 74c10 3 26 4.6 46 4.6S96 77 106 74c-3 17-20 29-46 29S17 91 14 74Z" fill="url(#${id}c)"/><ellipse class="lo" cx="60" cy="74.5" rx="45.5" ry="6.4" fill="url(#${id}o)" stroke="#c98652" stroke-width="1.6"/><path class="ls" d="M24 84c8 9 21 13.5 36 13.5" fill="none" stroke="#e0a674" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/><path class="lw" d="M60 75v-8" stroke="#2a160b" stroke-width="2.4" stroke-linecap="round"/><g class="lf"><path d="M60 22c8.4 12.6 13.4 20 13.4 28.6a13.4 13.4 0 0 1-26.8 0C46.6 42 51.6 34.6 60 22Z" fill="url(#${id}f)"/><path d="M60 41c3.6 5.6 5.6 8.8 5.6 12.4a5.6 5.6 0 0 1-11.2 0C54.4 49.8 56.4 46.6 60 41Z" fill="#fff6d6" fill-opacity=".85"/></g></svg>`;
const PAGE = '<svg viewBox="0 0 24 24" aria-hidden="true" class="fm-ic"><path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5Z"/><path d="M9.5 11h5.5M9.5 14.5h5.5"/></svg>';
const cssHref = $('script[data-film]')?.dataset.film;
const css = () => {
let l = $('link[href*="film.css"]');
if (!l && cssHref) { l = d.createElement('link'); l.rel = 'stylesheet'; l.href = cssHref; d.head.append(l); }
return !l || l.sheet ? Promise.resolve() : new Promise((r) => { l.addEventListener('load', r, { once: true }); l.addEventListener('error', r, { once: true }); setTimeout(r, 4000); });
};
window.SpritualDoor = ({ title, kicker, F, onChoice }) => css().then(() => new Promise((res) => {
const dlg = d.createElement('dialog'); dlg.className = 'fm-door'; dlg.lang = root.lang; dlg.setAttribute('aria-label', F.fDoor);
dlg.innerHTML = `<div class="fm-door-veil" aria-hidden="true"></div><div class="fm-door-in"><p class="fm-door-k">${esc(kicker)}</p><h2 class="fm-door-t">${esc(title)}</h2>${LAMP('fmd')}<div class="fm-door-btns"><button type="button" data-c="sound" autofocus>${esc(F.fLamp)}</button><button type="button" data-c="silent">${esc(F.fSilent)}</button></div></div>`;
d.body.append(dlg); dlg.showModal();
requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-in')));
let gone = false;
const done = (c) => { if (gone) return; gone = true; dlg.close(); dlg.remove(); res(c); };
dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(null); });
dlg.addEventListener('click', (e) => {
const b = e.target.closest('[data-c]'); if (!b || dlg.classList.contains('is-opening')) return;
const c = b.dataset.c, lamp = $('.fm-lampx', dlg), r = lamp.getBoundingClientRect();
onChoice?.(c);
if (c === 'sound') { lamp.classList.add('lit'); dlg.classList.add('is-lit'); }
const veil = $('.fm-door-veil', dlg); veil.style.setProperty('--fy', ((r.top + r.height * .36) / innerHeight * 100).toFixed(1) + '%');
if (still()) return done(c);
dlg.classList.add('is-opening');
const t0 = performance.now() + (c === 'sound' ? 900 : 350), step = (now) => { const t = clamp((now - t0) / 1700), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; veil.style.setProperty('--r', (e * 175).toFixed(2)); if (t < 1 && !gone) requestAnimationFrame(step); else done(c); };
requestAnimationFrame(step);
});
}));
window.SpritualFilm = (ctx) => {
const { UI, store, scenes } = ctx, F = UI.f || {}, N = scenes.length;
const reader = $('[data-reader]'), hero = $('.cx-film-open'), heroImg = $('.cx-film-open-pic img'), wrap = $('.scenes', reader);
const head = $('.story-head', reader), intro = head && $('.story-intro', head), endP = $('.cx-the-end', reader), closeEl = $('[data-closing]', reader), endSec = $('.story-end', reader);
if (!reader || !hero || !heroImg || !wrap || !head || !intro || !N) return;
{ const pic = heroImg.parentNode, rdy = () => pic.classList.add('is-ready'); heroImg.addEventListener('error', rdy, { once: true });
if (heroImg.complete && heroImg.naturalWidth) (heroImg.decode ? heroImg.decode().then(rdy, rdy) : rdy()); else heroImg.addEventListener('load', () => (heroImg.decode ? heroImg.decode().then(rdy, rdy) : rdy()), { once: true }); }
const title = hero.querySelector('h1')?.getAttribute('aria-label') || d.title, kicker = $$('.cx-film-k span', hero).map((s) => s.textContent).join(' · ');
const prefs = () => store.get('prefs', {});
let printing = false;
const can = () => !root.classList.contains('ep-lite') && root.dataset.mode !== 'leaf' && root.dataset.read !== 'both' && innerHeight >= 480 && !printing;
const want = () => can() && prefs().film !== 'off';
let built = false, active = false, live = false, stage, layers, rail, ticks = [], beats = [], aboutBtn, endLamp;
let vw = 0, VH = 0, cw = 0, ch = 0, B = 0, keys = [], heroKeys = [], cut = [], tints = [], heroH = 0, stageEnd = Infinity, wrapH = 0;
let cur = -1, raf = 0, lastT = 0, onBeat = null, gone = null, top = 0, busy = false, loading = false, pending = null, first = true, off = false, lastBell = 0;
let cbT = 0, thread, links = [], peek, peekI = -1, peekT = 0, drag = null, dragged = false, ptr = '', armed = false, SV = 0, nowK = -1, lastP = '';
let dzT = 0, KZ = 0, cen = [], LV = null, lvAsk = false, gN = 0, gSum = 0, gPrev = 0, gSlow = 0;
let lastH = 0, freeT = 0, railIn = false, awake = false, sleepT = 0, lastY = -1, cardF = -1, heroP = -1;
let soft = false;   // [calm] a framing changed by Light mode being chosen or given back glides there instead of jumping
const themes = $$('meta[name="theme-color"]'), themeWas = themes.map((m) => m.content);
const build = () => {
built = true;
stage = d.createElement('div'); stage.className = 'fm-stage'; stage.setAttribute('aria-hidden', 'true');
const ly = '<div class="fm-ly"><div class="fm-cam"><img alt="" decoding="async"></div></div>';
stage.innerHTML = ly + ly + '<div class="fm-vig"></div><div class="fm-scrim"></div><i class="fm-sv"></i>';
reader.prepend(stage);
layers = $$('.fm-ly', stage).map((el) => ({ el, cam: $('.fm-cam', el), img: $('img', el), k: -1, s: '', q: null, z: -1, amp: 1, lv: null, deep: false }));
const add = (c, t, type, k) => { c.classList.add('fm-beat'); t.classList.add('fm-t'); const sp = d.createElement('i'); sp.className = 'fm-sp'; sp.setAttribute('aria-hidden', 'true'); c.prepend(sp); beats.push({ c, t, sp, type, k, a: 0, b: 0, e: 0, ht: 0, long: false, q: null }); };
aboutBtn = d.createElement('button'); aboutBtn.type = 'button'; aboutBtn.className = 'fm-about'; aboutBtn.setAttribute('aria-expanded', 'false'); aboutBtn.textContent = F.fAbout || '';
intro.append(aboutBtn);
add(head, intro, 'head', 0);
scenes.forEach((s, i) => {
const fig = $('.shot', s), sc = $('.shot-card', s), im = fig && $('img', fig);
if (fig && sc) add(fig, sc, 'title', i + 1);
const dsc = im && d.getElementById(im.getAttribute('aria-describedby') || '-')?.textContent;   // [gfixA] the image's short alt is its name; its long description is what the film reads
if (im?.alt && !$('.fm-alt', fig)) { const a = d.createElement('span'); a.className = 'visually-hidden fm-alt'; a.textContent = dsc || im.alt; fig.prepend(a); }
$$('.scene-text > .pair', s).forEach((p) => { if (p.firstElementChild) add(p, p.firstElementChild, 'p', i + 1); });
tints[i + 1] = s.dataset.tint || '18 10 7';
});
tints[0] = hero.dataset.tint || tints[1];
if (endP) { const sp = d.createElement('span'); sp.innerHTML = LAMP('fme', 'fm-end-lamp'); while (endP.firstChild && endP.firstChild !== sp) sp.append(endP.firstChild); endP.append(sp); endP.classList.add('fm-end'); endLamp = $('.fm-lampx', sp); add(endP, sp, 'end', N); }
if (closeEl && $('.cb-in', closeEl)) add(closeEl, $('.cb-in', closeEl), 'close', N);
endSec?.style.setProperty('--t', tints[N]); document.documentElement.style.setProperty('--fm-end', 'rgb(' + tints[N] + ')');   // [fixL G34] the footer's rise starts from the afterword's own tint
const on = ctx.sound.on(), beads = $$('[data-bead]', reader), lbl = on ? UI.soundDrone : UI.soundOffLong;
rail = d.createElement('nav'); rail.className = 'fm-rail'; rail.setAttribute('aria-label', F.fScenes || '');
rail.innerHTML = `<button type="button" class="fm-lamp" data-sound aria-pressed="${on}" title="${esc(lbl)}">${DIYA()}<span class="visually-hidden">${esc(lbl)}</span></button><ol>${scenes.map((s, i) => `<li><a href="#page-${i + 1}" draggable="false" aria-label="${esc(beads[i]?.getAttribute('aria-label') || i + 1)}"><i></i></a></li>`).join('')}</ol><button type="button" data-fm="off" aria-label="${esc(F.fPaper)}" title="${esc(F.fPaper)}">${PAGE}</button>${langChip()}`;
head.after(rail); ticks = $$('a i', rail); thread = $('ol', rail); links = $$('a', thread);
peek = d.createElement('div'); peek.className = 'fm-peek'; peek.setAttribute('aria-hidden', 'true'); peek.innerHTML = '<img alt="" decoding="async" width="160" height="90"><span><i></i><b></b></span>'; rail.append(peek);
const bi = (t) => links.indexOf(t?.closest?.('a'));
thread.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse' && !drag?.on) { const i = bi(e.target); if (i >= 0) showPeek(i); } });
thread.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag?.on) showPeek(-1); });
thread.addEventListener('focusin', (e) => { const i = bi(e.target); if (i >= 0 && e.target.matches(':focus-visible')) showPeek(i); });
thread.addEventListener('focusout', () => { if (!drag?.on) showPeek(-1); });
thread.addEventListener('keydown', (e) => { const i = bi(e.target), j = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? N - 1 : -2; if (i < 0 || j < -1) return; e.preventDefault(); links[clamp(j, 0, N - 1)].focus(); });
d.addEventListener('pointerdown', (e) => { ptr = e.pointerType; armed = railIn; }, true);
rail.addEventListener('click', (e) => { if (e.isTrusted && e.detail && ptr === 'touch' && !armed) { e.preventDefault(); e.stopPropagation(); } }, true);
rail.addEventListener('touchend', () => { if (active && live) wake(3200); }, { passive: true });
thread.addEventListener('pointerdown', (e) => { if (e.button || e.pointerType === 'touch') return; drag = { id: e.pointerId, y: e.clientY, on: false }; });
thread.addEventListener('pointermove', (e) => {
if (!drag || e.pointerId !== drag.id) return;
if (!drag.on) { if (Math.abs(e.clientY - drag.y) < 6) return; drag.on = true; try { thread.setPointerCapture(e.pointerId); } catch {} rail.classList.add('is-drag'); }
drag.py = e.clientY; if (!drag.raf) drag.raf = requestAnimationFrame(() => { if (!drag) return; drag.raf = 0; scrub(drag.py); });
});
const drop = (e) => {
if (!drag || e.pointerId !== drag.id) return; const was = drag.on; cancelAnimationFrame(drag.raf); drag = null; if (!was) return;
rail.classList.remove('is-drag'); dragged = true; setTimeout(() => { dragged = false; }, 60);
const Y = scrollY + innerHeight; reveal(beats.find((b) => b.a >= Y - 60) || beats[beats.length - 1], true); peekT = setTimeout(() => showPeek(-1), 900);
};
thread.addEventListener('dragstart', (e) => e.preventDefault());
thread.addEventListener('pointerup', drop); thread.addEventListener('pointercancel', drop);
thread.addEventListener('click', (e) => {
const i = bi(e.target); if (i < 0) return;
if (dragged) return e.preventDefault();
clearTimeout(peekT); if (ptr === 'touch') showPeek(i); peekT = setTimeout(() => showPeek(-1), ptr === 'touch' ? 700 : 1100);
});
const acts = $('.story-actions', head);
if (acts) for (const [v, t, c] of [['off', F.fPaper, ' fm-only'], ['on', F.fFilm, '']]) { const b = d.createElement('button'); b.type = 'button'; b.className = 'btn btn-quiet fm-switch' + c; b.dataset.fm = v; b.textContent = t || ''; acts.append(b); }
};
const fitRail = () => {
if (!rail || !rail.offsetHeight) return; rail.style.setProperty('--fm-bead', '28px');
const rest = rail.offsetHeight - links.length * 28, H = innerHeight, bead = clamp(Math.floor((H - 76 - rest) / links.length), 24, 28), rh = rest + links.length * bead;
rail.style.setProperty('--fm-bead', bead + 'px'); rail.style.setProperty('--fm-rt', Math.round(clamp(H * .4, 64 + rh / 2, Math.max(64 + rh / 2, H - 12 - rh / 2))) + 'px');
};
const measure = () => {
const vh = innerHeight, sv = $('.fm-sv', stage).offsetHeight || vh; SV = sv;
vw = stage.clientWidth; VH = stage.clientHeight;
const s = Math.max(vw / 16, VH / 9); cw = 16 * s; ch = 9 * s;
layers.forEach((l) => { l.cam.style.width = cw + 'px'; l.cam.style.height = ch + 'px'; });
const wide = vw / VH > 1.15;
const res = wide ? (x, y, z) => { const w = cw * z, h = ch * z; return [clamp(vw / 2 + (x / 100 - .5) * cw - x / 100 * w, vw - w, 0), clamp(VH / 2 + (y / 100 - .5) * ch - y / 100 * h, VH - h, 0), z]; }
: (x, y, z) => { const w = cw * z, h = ch * z; return [clamp(vw * .5 - x / 100 * w, vw - w, 0), clamp(VH * .36 - y / 100 * h, VH - h, 0), z]; };
const raw = scenes.map((sc) => { let K = []; try { K = JSON.parse(sc.dataset.cam); } catch {} return K.length ? K : [[50, 40, 1]]; });
cen = [[(isNaN(parseFloat(getComputedStyle(heroImg).objectPosition)) ? 50 : parseFloat(getComputedStyle(heroImg).objectPosition)) / 100, .42], ...raw.map((K) => [K[0][0] / 100, K[0][1] / 100])]; KZ = wide ? .03 : .055;
const arr = scenes.map((sc) => sc.dataset.tempo === 'arrival');
keys = raw.map((K, si) => K.map((q, i) => res(q[0], q[1], arr[si] ? 1 : wide ? (i ? 1.05 : 1.015) : q[2])));
const near = raw.map((K, si) => res(K[0][0], K[0][1], arr[si] ? 1.03 : wide ? 1.06 : K[0][2] + .05)), mid = raw.map((K, si) => res(K[0][0], K[0][1], arr[si] ? 1.015 : wide ? 1.035 : K[0][2] + .025));
const op = getComputedStyle(heroImg).objectPosition.split(' ').map(parseFloat), k0 = [(vw - cw) * (isNaN(op[0]) ? 50 : op[0]) / 100, (VH - ch) * (isNaN(op[1]) ? 50 : op[1]) / 100, 1], z1 = wide ? 1.04 : 1;
heroKeys = [k0, [clamp(vw * .5 - (vw * .5 - k0[0]) * z1, vw - cw * z1, 0), clamp(VH * .4 - (VH * .4 - k0[1]) * z1, VH - ch * z1, 0), z1]];
for (let k = 1; k <= N; k++) {
const K = keys[k - 1], n = K.length - 1, ps = beats.filter((b) => b.k === k && b.type === 'p'), m = ps.length - 2;
beats.forEach((b) => { if (b.k === k && b.type !== 'p') b.q = b.type === 'end' || b.type === 'close' ? near[k - 1] : K[0]; });
ps.forEach((b, j) => { b.q = !j ? K[0] : j === ps.length - 1 ? near[k - 1] : n ? K[1 + (m <= n ? j - 1 : Math.floor((j - 1) * n / m))] : mid[k - 1]; });
}
beats[0].q = heroKeys[1];
if (low()) beats.forEach((b) => { b.q = b.k ? keys[b.k - 1][0] : heroKeys[0]; });   // [calm] one framing for a whole scene
const open = head.classList.contains('is-open');
beats.forEach((b) => { b.c.classList.remove('fm-long'); b.ht = b.t.offsetHeight; });
B = parseFloat(getComputedStyle(beats[1].t).bottom) || vh * .07;
const hold = Math.round(sv * .18), coarse = matchMedia('(pointer: coarse)').matches;
beats.forEach((b, i) => {
b.long = b.ht > sv * .56 || (b.type === 'head' && open); b.c.classList.toggle('fm-long', b.long);
if (b.type === 'head' && open) { b.c.style.removeProperty('--mt'); return; }
const prevLong = i && beats[i - 1].long;
b.c.style.setProperty('--mt', Math.round(b.long ? sv * .3 : !i ? (coarse ? sv + 6 : sv * .42) - B : (b.type === 'title' || b.type === 'end' || b.type === 'close' || prevLong ? sv * .1 : sv * .04 - hold) - b.ht) + 'px');
});
const y1 = scrollY, pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
beats.forEach((b) => {
const r = b.c.getBoundingClientRect(), T = r.top + y1;
if (b.long) { b.a = T + sv * .22; b.e = b.b = T + r.height + sv * .6; b.sp.style.scrollMarginTop = ''; b.c.style.scrollMarginTop = Math.round(vh - sv * .22 - 3 - pad) + 'px'; b.c.style.scrollMarginBottom = Math.round(vh * .7) + 'px'; }
else { b.c.style.scrollMarginTop = b.c.style.scrollMarginBottom = ''; b.a = T + b.ht + B; b.b = T + r.height + B; b.e = b.b - hold; b.sp.style.scrollMarginTop = Math.round(vh - b.ht - B - 3 - pad) + 'px'; }
});
beats.forEach((b) => { if (b.type === 'close') b.e = Infinity; });
const tb = beats.filter((b) => b.type === 'title');
cut = [sv, ...tb.map((b) => b.a - sv * .07)]; const last = beats[beats.length - 1]; cut.push(last.b + sv * .2);
tb.forEach((b) => { const sc = scenes[b.k - 1]; sc.style.scrollMarginTop = Math.round(sc.getBoundingClientRect().top + y1 - (b.a - vh + 3) - pad) + 'px'; });
heroH = hero.offsetHeight;
fitRail();
stageEnd = endSec ? endSec.getBoundingClientRect().top + y1 : Infinity; wrapH = wrap.offsetHeight; lastH = vh;
layers.forEach((l) => { if (l.k >= 0) pose(l, poseOf(l.k), false); if (l.deep) l.lv.size(); });
};
const srcOf = (k) => {
if (!k) return heroImg.currentSrc || heroImg.src;
if (window.SpritualDeepPic && window.SpritualDeepPic[0] === k) return window.SpritualDeepPic[1];   // [perf] the cut boot.js already asked for at a shared scene link
const im = $('.shot > img', scenes[k - 1]); if (!im) return heroImg.currentSrc || heroImg.src;
const set = (im.getAttribute('srcset') || '').split(',').map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).map(([u, w]) => [u, parseInt(w, 10) || 0]).sort((a, b) => a[1] - b[1]);
if (!set.length) return im.getAttribute('src');
if (window.SpritualNet) return window.SpritualNet.pick(set, cw, vw < 900);   // [perf] the same choice boot.js preloads; a width softer on a slow line
const need = cw * Math.min(devicePixelRatio || 1, vw < 900 ? 1 : 1.5) * .93;
return (set.find((x) => x[1] >= need) || set[set.length - 1])[0];
};
const TEMPO = { quiet: [1500, 1.3], fall: [560, .78], arrival: [1300, 1.15] };
const tempoOf = (k) => TEMPO[k >= 1 ? scenes[k - 1]?.dataset.tempo : ''] || [900, 1];
const lampX = (a, b) => (root.dataset.lamp === 'on' ? a : b);
const pose = (l, q, move) => {
if (!q) return;
move = move || soft;
const s = `translate3d(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px,0) scale(${q[2].toFixed(4)})`; if (l.s === s) return;
const far = l.q ? Math.hypot(q[0] - l.q[0], q[1] - l.q[1]) + Math.abs(q[2] - l.q[2]) * cw : 0;
l.cam.style.transitionDuration = move ? Math.round(clamp(1100 + far * 2.2, 1200, 2600) * tempoOf(l.k)[1] * lampX(1.35, 1)) + 'ms' : '0s';
l.cam.style.transform = s; l.s = s; l.q = q;
};
const poseOf = (k) => {
if (!k) return heroP > 0 && !low() ? heroKeys[1] : heroKeys[0];
const Y = scrollY + innerHeight; let q = null;
for (const b of beats) if (b.k === k) { q = b.q; if (Y <= b.e + 2) break; }
return q || keys[k - 1]?.[0];
};
const tier = () => { if (low() || root.dataset.lamp === 'on') return 0; /* [comfort] Night Lamp: no parallax, no scroll camera */ const m = navigator.deviceMemory || 4, c = navigator.hardwareConcurrency || 4; return m < 2 || c < 4 ? 0 : m >= 4 && window.WebGLRenderingContext && UI.livingJs ? 2 : 1; };
const flat = (l) => { if (l.deep) { l.lv.release(); l.deep = false; } };
const lower = () => { dzT--; gN = gSum = gSlow = 0; layers.forEach((l) => { flat(l); l.z = -1; if (!dzT) l.img.style.transform = ''; }); kick(); };
const deepen = (l) => {
const k = l.k, el = k ? scenes[k - 1] : hero, dp = el.dataset.depth, c = cen[k] || [.5, .42];
flat(l); l.z = -1; l.dp = !!dp; l.img.style.transform = ''; l.img.style.transformOrigin = `${(c[0] * 100).toFixed(1)}% ${(c[1] * 100).toFixed(1)}%`; l.amp = dp ? 1 : .6;
if (dzT < 2 || !dp) return;
if (!LV) { if (!lvAsk) { lvAsk = true; const js = d.createElement('script'); js.src = UI.livingJs; js.async = true; js.onload = () => { LV = window.SpritualLiving; if (active && !off) for (const x of layers) if (x.k >= 0) deepen(x); kick(); }; d.head.append(js); } return; }
l.lv ||= LV.make(); l.deep = l.lv.attach(l.cam, l.img, dp, null, 1, { c, px: vw < 900 ? 1.5e6 : 3.3e6, lost: () => { l.deep = false; if (dzT > 1) lower(); } });
};
const dolly = (l, p) => {
const z = Math.round(KZ * l.amp * p * 2e4) / 2e4; if (l.z === z) return; l.z = z;
if (l.deep) l.lv.set(z); else if (dzT < 2 || !l.dp) l.img.style.transform = z ? `scale(${(1 + z * .5).toFixed(5)})` : '';
};
const showPeek = (i) => {
clearTimeout(peekT); if (i === peekI) return; peekI = i;
if (i < 0) { peek.classList.remove('on'); return; }
const sc = scenes[i], im = $('.shot > img', sc), u = (im?.getAttribute('srcset') || '').split(',')[0].trim().split(/\s+/)[0] || im?.getAttribute('src') || '', pi = $('img', peek);
if (u && pi.getAttribute('src') !== u) pi.src = u;
$('i', peek).textContent = $('.scene-no', sc)?.textContent || ''; $('b', peek).textContent = $('h2', sc)?.textContent || '';
peek.style.setProperty('--py', Math.round(vw < 700 ? innerHeight - SV * .035 - rail.getBoundingClientRect().top : thread.offsetTop + links[i].offsetTop + links[i].offsetHeight / 2) + 'px'); peek.classList.add('on');
};
const scrub = (py) => {
const r = thread.getBoundingClientRect(), h = r.height / N, t = clamp((py - r.top - h / 2) / h, 0, N - .001), k = Math.floor(t) + 1, a = cut[k] + SV * .07 + 3;
freeT = performance.now() + 500;
scrollTo({ top: Math.max(0, a + (t - k + 1) * Math.max(0, cut[k + 1] - a - 4) - innerHeight), behavior: 'instant' }); showPeek(k - 1); wake();
};
const pre = (k) => { if (k >= 1 && k <= N) { const go = () => { const im = new Image(); im.src = srcOf(k); }; if (k === 1 && window.SpritualNet && window.SpritualNet.slow()) setTimeout(go, 3500); else go(); } };
const sharpen = (l, k) => {
const c = navigator.connection || {}; if (!k || vw >= 900 || l.deep || c.saveData || (window.SpritualNet && window.SpritualNet.slow()) || (c.effectiveType && c.effectiveType !== '4g') || (c.downlink != null && c.downlink < 5)) return;
const im = $('.shot > img', scenes[k - 1]); const set = (im?.getAttribute('srcset') || '').split(',').map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).map(([u, w]) => [u, parseInt(w, 10) || 0]).sort((a, b) => b[1] - a[1]);
const full = set[0] && set[0][0]; if (!full || l.img.getAttribute('src') === full) return;
setTimeout(() => { if (l.k !== k || !active || l.deep) return; const pic = new Image(); pic.src = full; (pic.decode ? pic.decode() : Promise.resolve()).then(() => { if (l.k === k && active && !l.deep && l.img.getAttribute('src') !== full) l.img.src = full; }).catch(() => {}); }, 1400);
};
const cutTo = (k) => {
if (busy || loading) { pending = k; return; }
if (layers[top].k === k) return;
const inc = layers[top ^ 1], out = layers[top], src = srcOf(k), was = first, dis = Math.round(tempoOf(k)[0] * lampX(1.6, 1));   // [comfort] dissolve length
loading = true; inc.k = k; if (inc.img.getAttribute('src') !== src) inc.img.src = src;
const ready = [inc.img.decode ? inc.img.decode().catch(() => {}) : 0, was && !k ? Promise.all(heroImg.getAnimations().map((a) => a.finished)).catch(() => {}) : 0];
Promise.race([Promise.all(ready), wait(4000)]).then(() => {
loading = false; if (!active) return;
pose(inc, poseOf(k), false); if (dzT) deepen(inc); inc.el.style.zIndex = 2; out.el.style.zIndex = 1; inc.el.style.setProperty('--dis', dis + 'ms'); inc.el.classList.toggle('fade', !was); inc.el.classList.add('on'); top ^= 1;
const done = () => { out.el.classList.remove('on', 'fade'); out.k = -1; flat(out); busy = false; if (pending != null) { const p = pending; pending = null; cutTo(p); } };
if (was) { first = false; live = true; root.classList.add('fm-live'); fitRail(); done(); kick(); }
else { busy = true; if (ctx.sound.on()) ctx.sound.swell?.(); setTimeout(done, dis + 40); }
pre(k + 1); sharpen(inc, k);
});
};
const at = () => { const Y = scrollY + innerHeight; let k = 0; while (k < N && Y >= cut[k + 1]) k++; return k + Math.min(.9999, clamp((Y - cut[k]) / Math.max(1, cut[k + 1] - cut[k]))); };
const light = (nb) => {
if (nb === onBeat) return;
if (onBeat) { onBeat.c.classList.remove('on'); gone = onBeat; }
if (nb) { nb.c.classList.remove('gone'); nb.c.classList.add('on'); if (gone === nb) gone = null; }
onBeat = nb; stage.classList.toggle('cb-on', !!nb && nb.type === 'close');   // [joyB] the closing beat's dark comes up after the painting has been held
if (!nb) return;
for (const l of layers) if (l.k === nb.k && nb.k) pose(l, nb.q, !low());
if (nb.type === 'end') endLamp?.classList.add('lit');
if (nb.type === 'close') { clearTimeout(cbT); cbT = setTimeout(() => { if (onBeat === nb && ctx.sound.on()) ctx.sound.bell?.(587, .06); }, still() ? 0 : 1700); }
if (nb.type === 'title' && ctx.sound.on() && performance.now() - lastBell > 5000) { lastBell = performance.now(); ctx.sound.bell?.(528, .05); }
};
const wake = (ms = 1700) => { clearTimeout(sleepT); sleepT = setTimeout(() => { awake = false; railSync(); }, ms); if (!awake) { awake = true; railSync(); } };
const closing = () => !!closeEl && closeEl.getBoundingClientRect().top < innerHeight * .78;   // [fixR] the closing beat's words are rising: the strip and the whisper step aside
const railSync = () => { if (!rail) return; const on = awake && live && !off && scrollY > heroH * .55 && scrollY + innerHeight * .6 < stageEnd && !closing(); if (on !== railIn) { railIn = on; rail.classList.toggle('is-in', on); } const gone = closing(); if (gone !== railGone) { railGone = gone; rail.classList.toggle('is-gone', gone); } };
let railGone = false;
window.SpritualFilmWake = (ms) => { if (active && live) wake(ms); };   // [offline-lang] type.js: after a language switch the rail shows for a moment, so the reader sees where the controls are
let litKey = '';
const draw = (now) => {
raf = 0; if (!active) return;
const y = scrollY, Y = y + innerHeight, target = at(), dt = Math.min(64, (now - lastT) || 16); lastT = now;
cur = cur < 0 || Math.abs(target - cur) > 1.5 ? target : cur + (target - cur) * (1 - Math.exp(-dt / 110));
if (Math.abs(target - cur) < .0004) cur = target;
const isOff = y > stageEnd;
if (isOff !== off) { off = isOff; stage.classList.toggle('is-off', off); rail.classList.toggle('is-off', off); document.documentElement.classList.toggle('fm-ended', off); if (dzT) for (const l of layers) if (off) flat(l); else if (l.k >= 0) deepen(l); }
if (!off) cutTo(Math.floor(target));
if (dzT && !off) {
const kf = Math.floor(target), fr = target - kf; for (const l of layers) if (l.k >= 0) dolly(l, l.k === kf ? fr : l.k < kf ? 1 : 0);
if (y !== lastY) { if (gPrev && now - gPrev < 100) { gSum += now - gPrev; if (++gN === 45) { if (gSum / 45 <= 22) gSlow = 0; else if (++gSlow > 1) lower(); gN = gSum = 0; } } gPrev = now; }
}
const cf = Math.round(clamp(1 - y / Math.max(1, heroH * .3)) * 25) / 25;
if (cf !== cardF) { cardF = cf; hero.style.setProperty('--cf', cf); hero.classList.toggle('fm-out', !cf); }
if (live) {
const hp = y > heroH * .35 ? 1 : 0; if (hp !== heroP) { heroP = hp; for (const l of layers) if (!l.k) pose(l, heroKeys[low() ? 0 : hp], !low()); }
let nb = onBeat && Y >= onBeat.a && Y <= onBeat.e ? onBeat : null;
if (!nb) for (const b of beats) if (Y >= b.a && Y <= b.e) { nb = b; break; }
light(nb);
if (gone && (Y >= gone.b - 2 || Y < gone.a)) { if (Y >= gone.b - 2) gone.c.classList.add('gone'); gone = null; }
const th = nb ? (nb.long ? VH * .8 : nb.ht + B + VH - innerHeight) : 0, key = th ? Math.round(th) + '|' + (nb ? nb.k : 0) : '';
if (key !== litKey) { litKey = key; if (th) { stage.style.setProperty('--th', Math.round(th) + 'px'); stage.style.setProperty('--t', tints[nb ? nb.k : 0]); } stage.classList.toggle('lit', !!th); }
if (y !== lastY) { if (lastY >= 0) wake(); lastY = y; } railSync();
ticks.forEach((t, j) => { const f = clamp(cur - (j + 1)).toFixed(1); if (t._f !== f) { t._f = f; t.style.setProperty('--f', f); } });
const tp = (Math.round(clamp((cur - 1) / Math.max(1, N - 1)) * 150) / 150).toFixed(4), nk = cur >= 1 ? Math.min(N, Math.floor(cur)) - 1 : -1;
if (tp !== lastP) { lastP = tp; thread.style.setProperty('--p', tp); }
if (nk !== nowK) { links[nowK]?.removeAttribute('aria-current'); links[nk]?.setAttribute('aria-current', 'step'); nowK = nk; keyHere(nk); }
}
if (cur !== target) raf = requestAnimationFrame(draw);
};
let kbAt = -1e9; addEventListener('keydown', (e) => { if (e.key === ' ' || /^(Page(Up|Down)|Arrow(Up|Down)|Home|End)$/.test(e.key)) kbAt = performance.now(); }, { passive: true });
const keyHere = (k) => { try {
const sc = scenes[k], a = d.activeElement; if (!sc || performance.now() - kbAt > 6000) return;
if (a && a !== d.body && a !== root) { const r = a.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) return; }
const had = sc.getAttribute('tabindex'); sc.tabIndex = -1; sc.focus({ preventScroll: true }); sc.blur();
if (had === null) sc.removeAttribute('tabindex'); else sc.setAttribute('tabindex', had);
} catch (x) { /* the starting point is a nicety */ } };
const kick = () => { if (!raf && active) raf = requestAnimationFrame(draw); };
let rt = 0, lastW = 0, ro = null;
const remeasure = () => { if (!active) return; measure(); kick(); };
const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (!sync() || (innerWidth === lastW && Math.abs(innerHeight - lastH) < 2 && Math.abs(stage.clientHeight - VH) < 2 && Math.abs(wrap.offsetHeight - wrapH) < 3)) return; lastW = innerWidth; remeasure(); }, 160); };
const sceneNow = () => (cur >= 1 ? Math.floor(cur) : 0);
const enable = () => {
if (active) return; const k = built ? ctx.current?.() : 0, deep = scrollY > innerHeight * .6;
active = true; root.classList.add('fm'); if (!built) build();
themes.forEach((m) => { m.content = '#0b0706'; });
css().then(() => {
if (!active) return;
dzT = tier(); measure(); lastW = innerWidth; cur = -1; first = true; top = 0; busy = loading = false; pending = null; onBeat = gone = null; litKey = ''; lastY = cardF = heroP = -1;
if (k && deep) scenes[k - 1].scrollIntoView({ block: 'start', behavior: 'instant' });
free(location.hash.slice(1));
window.SpritualTypePlace?.();   // [type] a language switch puts the page on the reader's paragraph before the film's first frame (assets/type.js)
draw(performance.now());
if (!ro && window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(wrap); }
});
};
const disable = () => {
if (!active) { root.classList.remove('fm', 'fm-live', 'fm-ended'); return; } const k = sceneNow();
active = live = false; cancelAnimationFrame(raf); raf = 0; root.classList.remove('fm', 'fm-live', 'fm-ended');
if (!built) return;
layers.forEach((l) => { l.el.classList.remove('on', 'fade'); l.k = -1; l.s = ''; l.q = null; flat(l); l.img.style.transform = ''; }); stage.classList.remove('lit', 'is-off'); document.documentElement.classList.remove('fm-ended'); rail.classList.remove('is-in', 'is-off'); railIn = awake = off = false; clearTimeout(sleepT);
beats.forEach((b) => { b.c.classList.remove('on', 'gone', 'fm-long'); b.c.style.removeProperty('--mt'); b.c.style.scrollMarginTop = b.c.style.scrollMarginBottom = b.sp.style.scrollMarginTop = ''; }); scenes.forEach((s) => { s.style.scrollMarginTop = ''; });
hero.style.removeProperty('--cf'); hero.classList.remove('fm-out');
head.classList.remove('is-open'); aboutBtn.setAttribute('aria-expanded', 'false'); onBeat = gone = null;
themes.forEach((m, i) => { m.content = themeWas[i]; });
if (k) scenes[k - 1].scrollIntoView({ block: 'start', behavior: 'instant' });
};
const sync = () => {
const c = can(); root.classList.toggle('fm-can', c);
if (want()) enable(); else { disable(); if (c && !built) css().then(() => { if (!built) build(); }); }
return active;
};
const reveal = (b, smooth) => scrollTo({ top: Math.max(0, b.a - innerHeight + 3), behavior: smooth && !still() ? 'smooth' : 'instant' });
const beatOf = (el) => beats.find((b) => b.t.contains(el));
window.SpritualFilmReveal = (el) => { const b = active && live && beatOf(el); if (!b) return false; if (b !== onBeat) reveal(b, true); return true; };
window.SpritualFilmAt = () => {
if (!active || !live || !beats.length) return null;
const Y = scrollY + innerHeight; let b = onBeat; if (!b) for (const x of beats) { if (Y >= x.a) b = x; else break; }
if (!b || !b.k) return null;
return { n: b.k, j: b.type === 'title' ? -1 : b.type === 'end' ? 9999 : beats.filter((x) => x.k === b.k && x.type === 'p').indexOf(b) };
};
window.SpritualFilmMeasure = () => remeasure();
window.SpritualFilmNow = () => (active && live ? { n: N, at: cur, ended: off, closing: closing() } : null);
new MutationObserver(() => {
if (!active || !built) return; const t = tier(); if (t === dzT) return;
if (!t) { dzT = 1; lower(); } else { dzT = t; layers.forEach((l) => { if (l.k >= 0) deepen(l); }); kick(); }
}).observe(root, { attributes: true, attributeFilter: ['data-lamp'] });
addEventListener('scroll', kick, { passive: true });
addEventListener('resize', onResize);
addEventListener('load', remeasure);
d.fonts?.ready?.then(remeasure);
new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-mode', 'data-read', 'data-motion', 'data-size'] });
let lowWas = low();
new MutationObserver(() => { if (low() === lowWas) return; lowWas = low(); if (!active || !built) return; dzT = tier(); layers.forEach((l) => { flat(l); l.z = -1; l.img.style.transform = ''; l.k >= 0 && deepen(l); }); soft = true; measure(); soft = false; kick(); }).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-light'] });
addEventListener('beforeprint', () => { printing = true; sync(); }); addEventListener('afterprint', () => { printing = false; sync(); });
for (const ev of ['touchstart', 'pointermove', 'keydown']) addEventListener(ev, () => { if (active && live) wake(); }, { passive: true });
d.addEventListener('focusin', (e) => { if (!active || !live || !e.target.closest) return; const b = beatOf(e.target); if (b && b !== onBeat && !(b.type === 'head' && b.long)) reveal(b); });
let keyAt = 0, keyI = -1;
d.addEventListener('keydown', (e) => {
if (!active || !live || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || scrollY > stageEnd - innerHeight * .5) return;
const t = e.target, fwd = e.key === 'PageDown' || e.key === 'ArrowDown' || (e.key === ' ' && !e.shiftKey), back = e.key === 'PageUp' || e.key === 'ArrowUp' || (e.key === ' ' && e.shiftKey);
if ((!fwd && !back) || d.querySelector('dialog[open], [popover]:popover-open') || (t.closest && t.closest('input, textarea, select, button, a, summary, [contenteditable], [role="button"]'))) return;
const Y = scrollY + innerHeight, now = performance.now();
let i = now - keyAt < 900 && keyI >= 0 ? keyI : onBeat ? beats.indexOf(onBeat) : -1;
if (i < 0) { i = beats.findIndex((b) => b.a > Y); i = fwd ? (i < 0 ? beats.length : i) - 1 : i < 0 ? beats.length : i; }
const nb = beats[i + (fwd ? 1 : -1)];
if (!nb) { if (fwd) return; e.preventDefault(); keyI = -1; scrollTo({ top: 0, behavior: still() ? 'instant' : 'smooth' }); return; }
e.preventDefault(); keyI = beats.indexOf(nb); keyAt = now;
reveal(nb, true);
});
const free = (id) => { let el = null; try { el = id && d.getElementById(decodeURIComponent(id)); } catch {} if (!active || !el || !endSec?.contains(el)) return; freeT = performance.now() + 1500; setTimeout(kick, 1550); };
d.addEventListener('click', (e) => { const a = e.target.closest?.('a[href^="#"]'); if (a) free(a.getAttribute('href').slice(1)); }, true);
addEventListener('hashchange', () => free(location.hash.slice(1)));
d.addEventListener('click', (e) => {
const lg = e.target.closest?.('[data-fm-lang]'); if (lg) { e.preventDefault(); d.querySelector('a.ed-lang[data-lang-switch]')?.click(); return; }
const t = e.target.closest?.('[data-fm], .fm-about, .cx-film-btns a[href="#page-1"]'); if (!t) return;
if (t.dataset.fm) { const p = prefs(); if (t.dataset.fm === 'off') p.film = 'off'; else delete p.film; store.set('prefs', p); sync(); if (!active) $('[data-fm="on"]')?.focus({ preventScroll: true }); return; }
if (!active) return;
if (t === aboutBtn) { const o = head.classList.toggle('is-open'); aboutBtn.setAttribute('aria-expanded', String(o)); measure(); if (o) scrollTo({ top: head.getBoundingClientRect().top + scrollY - innerHeight * .12, behavior: 'instant' }); else reveal(beats[0]); kick(); return; }
e.preventDefault();
const to = () => { intro.tabIndex = -1; intro.focus({ preventScroll: true }); }, go = () => { reveal(beats[0], true); to(); };
if (store.get('door', 0) || !live) return go();
window.SpritualDoor({ title, kicker, F, onChoice: (c) => { store.set('door', 1); ctx.sound.set(c === 'sound'); if (c === 'sound') ctx.sound.bell?.(660, .16); reveal(beats[0]); } }).then((c) => { if (c) to(); });
});
let lx = -.4, ly = -.4, ltx = -.4, lty = -.4, lr = 0, lidle = 0, lit = [];
const lstep = () => {
lr = 0; lx += (ltx - lx) * .16; ly += (lty - ly) * .16; const done = Math.abs(ltx - lx) + Math.abs(lty - ly) < .003; if (done) { lx = ltx; ly = lty; }
const T = built && active ? [rail, scenes[Math.max(0, sceneNow() - 1)]] : [scenes[0]], out = lx <= -.39;
for (const e of lit) if (out || !T.includes(e)) for (const v of ['--lx', '--ly', '--ln', '--lm', '--la']) e.style.removeProperty(v);
lit = out ? [] : T;
for (const e of lit) { e.style.setProperty('--lx', (lx * 100).toFixed(1) + '%'); e.style.setProperty('--ly', (ly * 100).toFixed(1) + '%'); e.style.setProperty('--ln', (lx * 2 - 1).toFixed(3)); e.style.setProperty('--lm', (ly * 2 - 1).toFixed(3)); e.style.setProperty('--la', (clamp((lx + .4) / .5) * .5).toFixed(3)); }
if (!done) lr = requestAnimationFrame(lstep);
};
const lamp = (x, y) => { if (still() || root.classList.contains('ep-lite')) return; ltx = clamp(x); lty = clamp(y); if (!lr) lr = requestAnimationFrame(lstep); clearTimeout(lidle); lidle = setTimeout(() => { ltx = lty = -.4; if (!lr) lr = requestAnimationFrame(lstep); }, 2600); };
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') lamp(e.clientX / innerWidth, e.clientY / innerHeight); }, { passive: true });
addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) lamp(t.clientX / innerWidth, t.clientY / innerHeight); }, { passive: true });
sync();
};
})();
