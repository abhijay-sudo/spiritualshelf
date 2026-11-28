(() => {
const d = document, root = d.documentElement;
const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const weak = (navigator.deviceMemory || 8) < 2 || (navigator.hardwareConcurrency || 8) < 3;
const still = () => weak || root.dataset.motion === 'reduce' || !!root.dataset.light || root.classList.contains('ep-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'spritual:ty-lang';
window.SpritualType = ({ UI = {}, say = () => {} } = {}) => {
if (window.SpritualType.on) return; window.SpritualType.on = true;
const reader = $('[data-reader]'), scenes = reader ? $$('.scene', reader) : [];
const filmOn = () => root.classList.contains('fm') && root.classList.contains('fm-live');
let cssReady = false;
const css = new Promise((res) => {
if (!UI.typeCss) return res();
const l = d.createElement('link'); l.rel = 'stylesheet'; l.href = UI.typeCss; l.addEventListener('load', res, { once: true }); l.addEventListener('error', res, { once: true }); setTimeout(res, 4000); d.head.append(l);
}).then(() => { cssReady = true; });
const live = new Set(); let raf = 0, last = 0;
const tick = (now) => {
raf = 0; const dt = Math.min(64, now - last || 16); last = now; let more = false;
for (const it of live) { if (it.step(now, dt)) more = true; else if (it.done) live.delete(it); }
if (more) raf = requestAnimationFrame(tick);
};
const kick = () => { if (!raf && live.size) { last = performance.now(); raf = requestAnimationFrame(tick); } };
addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick, { passive: true });
const beatMo = 'MutationObserver' in window ? new MutationObserver(kick) : null;
const onBeat = (el) => { if (el && beatMo) beatMo.observe(el, { attributes: true, attributeFilter: ['class'] }); };
const watch = (els, onIn, margin = '0px') => { if (!('IntersectionObserver' in window)) return null; const io = new IntersectionObserver((es) => es.forEach((en) => onIn(en.target, en.isIntersecting)), { rootMargin: margin }); els.forEach((el) => io.observe(el)); return io; };
const inkTitles = () => {
if (still()) return;
const vh = innerHeight;
const items = $$('.scene .shot-card h2, .mx-ep-t').filter((el) => el.getBoundingClientRect().top > vh * .96 && el.textContent.trim()).map((el) => {
const o = { el, p: 0, n: 0, lh: 0, pad: 0, w: 0, t0: 0, done: false, beat: el.closest('.shot') };
const SIDES = ['top', 'right', 'bottom', 'left'];
const room = (on) => { for (const k of ['padding', 'margin']) for (const sd of SIDES) el.style.removeProperty(`${k}-${sd}`); if (!on) return; const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 16; SIDES.forEach((sd, i) => { const add = fs * (i % 2 ? .45 : .5), pd = parseFloat(cs.getPropertyValue(`padding-${sd}`)) || 0, mg = parseFloat(cs.getPropertyValue(`margin-${sd}`)) || 0; el.style.setProperty(`padding-${sd}`, (pd + add).toFixed(2) + 'px', 'important'); el.style.setProperty(`margin-${sd}`, (mg - add).toFixed(2) + 'px', 'important'); }); };
const measure = () => {
room(true);
const cs = getComputedStyle(el); o.pad = parseFloat(cs.paddingTop) || 0; o.lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.15;
o.n = Math.max(1, Math.round((el.clientHeight - o.pad - (parseFloat(cs.paddingBottom) || 0)) / o.lh)); o.w = el.clientWidth;
o.dur = clamp(420 + el.textContent.trim().length * 34, 700, 1900);
};
const paint = () => {
const ov = .5, L = [];
for (let i = 0; i < o.n; i++) {
const s = (clamp(o.p * o.n - i) * 126).toFixed(1), top = i ? o.pad + i * o.lh - ov : 0, h = i === o.n - 1 ? 9999 : (i ? o.lh + 2 * ov : o.pad + o.lh + ov);
L.push(`linear-gradient(97deg,#000 ${(s - 26).toFixed(1)}%,transparent ${s}%) 0 ${top.toFixed(1)}px/100% ${h === 9999 ? '9999px' : h.toFixed(1) + 'px'} no-repeat`);
}
const v = L.join(','); el.style.setProperty('-webkit-mask', v); el.style.setProperty('mask', v);
};
const finish = () => { o.p = 1; o.done = true; el.style.removeProperty('-webkit-mask'); el.style.removeProperty('mask'); room(false); el.classList.remove('ty-ink'); io?.unobserve(el); };
o.finish = finish;
o.step = (now, dt) => {
if (o.done) return false;
if (still()) { finish(); return false; }
if (el.clientWidth !== o.w) measure();
let target;
if (filmOn() && o.beat?.classList.contains('fm-beat')) target = o.beat.classList.contains('on') ? 1 : o.p;
else target = clamp((innerHeight * .93 - el.getBoundingClientRect().top) / (innerHeight * .26));
if (target > o.p) {
if (!o.t0) { o.t0 = now; measure(); }
if (now - o.t0 > 180) o.p = Math.min(target, o.p + dt / o.dur);
if (now - o.t0 > 5000) o.p = 1;
if (o.p >= 1) { finish(); return false; }
paint(); return true;
}
return false;
};
el.classList.add('ty-ink'); measure(); paint(); onBeat(o.beat);
return o;
});
const byEl = new Map(items.map((o) => [o.el, o]));
const io = watch(items.map((o) => o.el), (el, isIn) => { const o = byEl.get(el); if (!o || o.done) return; o.active = isIn; if (isIn) { live.add(o); kick(); } else if (o.p === 0) live.delete(o); }, '10% 0px 10% 0px');
if (!io) items.forEach((o) => o.finish());
const words = $$('.cx-film-title .wr');
const put = () => words.forEach((w) => w.classList.add('ty-done'));
if (words.length) { const lastW = words[words.length - 1]; const a = lastW.getAnimations?.().find((x) => x.animationName === 'ty-ink-w'); if (a) a.finished.then(put, put); else setTimeout(put, 2600); }
};
const kinetic = () => {
const els = $$('.ty-k'); if (!els.length || still()) return;
const items = els.map((el) => {
const o = { el, k: 0, shown: -1, t0: 0, beat: el.closest('.pair') };
const set = () => { const v = Math.round(o.k * 200) / 200; if (v !== o.shown) { o.shown = v; el.style.setProperty('--k', v); } };
o.step = (now, dt) => {
let target;
if (filmOn() && o.beat?.classList.contains('fm-beat')) {
const on = o.beat.classList.contains('on');
if (!on) { o.k = 0; o.t0 = 0; set(); return false; }
if (!o.t0) o.t0 = now;
if (now - o.t0 > 900) o.k = Math.min(1, o.k + dt / 2200);
set(); return o.k < 1;
} else {
const r = el.getBoundingClientRect(); const t = clamp((innerHeight * .78 - r.top) / (innerHeight * .34)); target = t * t * (3 - 2 * t);
o.k += (target - o.k) * (1 - Math.exp(-dt / 160)); if (Math.abs(target - o.k) < .004) o.k = target;
}
set(); return o.k !== target;
};
onBeat(o.beat); return o;
});
const byEl = new Map(items.map((o) => [o.el, o]));
watch(els, (el, isIn) => { const o = byEl.get(el); o.active = isIn; if (isIn) { live.add(o); kick(); } else { live.delete(o); } }, '20% 0px 20% 0px');
};
const metre = () => {
const verses = $$('.st-v').filter((v) => $('.ty-m:not(.ty-m-s)', v)); if (!verses.length || still()) return;
const U = 135;   // one count, in milliseconds: a light syllable is one count, a heavy one two (the cited rule)
const prep = (v) => { if (v.dataset.tyM) return; v.dataset.tyM = '1'; let t = 0; for (const line of $$('.ty-m', v)) { for (const m of $$('i, b', line)) { m.style.setProperty('--d', Math.round(t * U) + 'ms'); t += m.tagName === 'B' ? 2 : 1; } t += 3; } };
let now = null;
const play = (v) => { if (still()) return; prep(v); if (now && now !== v) now.classList.remove('ty-play'); v.classList.remove('ty-play'); void v.offsetWidth; v.classList.add('ty-play'); now = v; };
root.style.setProperty('--ty-u', U + 'ms');
watch(verses, (v, isIn) => { if (isIn) play(v); else { v.classList.remove('ty-play'); if (now === v) now = null; } }, '-30% 0px -52% 0px');
};
let open = null, gid = 0;
const stageBump = (h) => {
const st = $('.fm-stage'); if (!st || !filmOn()) return null; const was = st.style.getPropertyValue('--th'); const n = parseFloat(was); if (!n) return null;
const now = Math.round(n + h) + 'px'; st.style.setProperty('--th', now); return { st, was, now };
};
const remeasure = () => { for (const ms of [120, 600]) setTimeout(() => window.SpritualFilmMeasure?.(), ms); };
const closeGloss = (instant) => {
const o = open; if (!o) return; open = null;
o.btn.setAttribute('aria-expanded', 'false'); o.btn.removeAttribute('aria-controls');
if (o.bump && o.bump.st.style.getPropertyValue('--th') === o.bump.now) o.bump.st.style.setProperty('--th', o.bump.was);
const quick = instant || still() || !cssReady || (o.film && !o.lift && !window.SpritualFilmMeasure), L = o.lift;
if (L) { L.beat.classList.toggle('ty-lift', !quick); L.pin(false); L.box.style.removeProperty('translate'); }
const gone = () => { const par = o.el.parentNode; o.el.remove(); par?.normalize(); if (L) { void L.beat.offsetHeight; L.beat.classList.remove('ty-lift'); } if (o.film) remeasure(); };
if (quick) return gone();
o.el.classList.remove('is-open'); let did = false; const end = () => { if (!did) { did = true; gone(); } };
o.el.addEventListener('transitionend', (e) => { if (e.target === o.el) end(); }); setTimeout(end, 420);
};
const lineEnd = (btn, host) => {
const anchor = btn.closest('.term-w') || btn, a = anchor.getBoundingClientRect(), mid = a.top + a.height * .6;
const r = d.createRange();
const lower = (node) => {
if (node.nodeType === 3) {
const re = /\S+/g; let m;
while ((m = re.exec(node.data))) { r.setStart(node, m.index); r.setEnd(node, m.index + 1); const q = r.getClientRects()[0]; if (q && q.top > mid) return { node, at: m.index }; }
return null;
}
if (node.nodeType !== 1 || node.classList.contains('ty-gloss')) return null;
const q = node.getClientRects()[0]; if (!q) return null;
if (q.top > mid) return { node, at: -1 };
if (node.matches('.term, .term-w, button')) return null;
for (const c of node.childNodes) { const hit = lower(c); if (hit) return hit; }
return null;
};
for (let n = anchor; n && n !== host; n = n.parentNode) for (let s = n.nextSibling; s; s = s.nextSibling) { const hit = lower(s); if (hit) return hit; }
return null;
};
const part = (cls, text, k) => { if (!text) return null; const s = d.createElement('span'); s.className = cls; if (k) { const b = d.createElement('span'); b.className = 'ty-g-k'; b.textContent = k + ' '; s.append(b); } s.append(text); return s; };
const glossFn = (btn, def) => {
if (!cssReady || !def || !btn.isConnected) return false;
if (open && open.btn === btn) { closeGloss(); return true; }
const host = btn.closest('p, li, dd, blockquote'); if (!host) return false;
closeGloss(true);
const el = d.createElement('span'); el.className = 'ty-gloss'; el.id = 'ty-gloss-' + (++gid); el.setAttribute('role', 'note');
const inn = d.createElement('span'); inn.className = 'ty-gloss-in'; const c = d.createElement('span'); c.className = 'ty-gloss-c'; inn.append(c); el.append(inn);
const head = d.createElement('span'); head.className = 'ty-g-t'; const b = d.createElement('b'); b.textContent = def.term; head.append(b);
if (def.deva && def.deva !== def.term) { const s = d.createElement('span'); s.lang = 'hi'; s.className = 'ty-g-deva'; s.textContent = def.deva; head.append(' ', s); }
if (def.translit) { const s = d.createElement('i'); s.textContent = def.translit; head.append(' ', s); }
c.append(head);
if (def.who && window.SpritualWho) c.append(window.SpritualWho.card(def));   // [learn] a person's card: their line, their ties in this story, the way to their page
else for (const x of [part('ty-g-l', def.literal, UI.lensLiteral), part('ty-g-d', def.def), part('ty-g-c', def.context, def.ctxLabel), part('ty-g-s', def.source?.label, UI.lensSource)]) if (x) c.append(x);
const hit = lineEnd(btn, host);
if (!hit) host.append(el); else if (hit.at >= 0) { const tail = hit.at ? hit.node.splitText(hit.at) : hit.node; tail.parentNode.insertBefore(el, tail); } else hit.node.parentNode.insertBefore(el, hit.node);
$$('.term[aria-expanded="true"]').forEach((t) => t.setAttribute('aria-expanded', 'false'));
btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-controls', el.id);
const film = filmOn(), beat = film ? btn.closest('.fm-beat') : null, pin = beat ? parseFloat(getComputedStyle(beat, '::before').height) : NaN, pinned = !!beat && !beat.classList.contains('fm-long') && pin > 0;
const settle = film && !pinned ? window.SpritualFilmMeasure : null, quick = still() || (film && !pinned && !settle);
let lift = null, gain = inn.scrollHeight;
if (pinned) {
const box = btn.closest('.fm-t') || host, h0 = box.offsetHeight, foot = box.getBoundingClientRect().bottom, was = beat.style.getPropertyValue('--fm-pin');
const setPin = (on) => { if (on) beat.style.setProperty('--fm-pin', (pin - gain) + 'px'); else if (was) beat.style.setProperty('--fm-pin', was); else beat.style.removeProperty('--fm-pin'); };
el.classList.add('is-open', 'is-still'); gain = Math.min(box.offsetHeight - h0, pin); setPin(true);
const rise = Math.max(0, Math.round((box.getBoundingClientRect().bottom - foot) * 100) / 100);
setPin(false); el.classList.remove('is-open'); void el.offsetHeight; el.classList.remove('is-still');
lift = { beat, box, pin: setPin };
beat.classList.toggle('ty-lift', !quick); void beat.offsetHeight; setPin(true); if (rise) box.style.setProperty('translate', `0 ${-rise}px`);
}
open = { btn, el, film, lift, y: scrollY, bump: stageBump(gain) };
if (quick) el.classList.add('is-open', 'is-still'); else { void el.offsetHeight; el.classList.add('is-open'); }
if (settle) { let did = false; const end = () => { if (!did) { did = true; remeasure(); } }; el.addEventListener('transitionend', (e) => { if (e.target === el && e.propertyName.startsWith('grid')) end(); }); setTimeout(end, quick ? 0 : 460); }
say(`${def.term}: ${def.def}`);
return true;
};
const gloss = () => {
if (!$('.term')) return;
const seenTerm = {}; $$('.term').forEach((t) => { const k = t.dataset.term; if (seenTerm[k]) t.setAttribute('tabindex', '-1'); else seenTerm[k] = 1; });
css.then(() => { window.SpritualTypeGloss = glossFn; });
d.addEventListener('click', (e) => {
if (!open) return; const t = e.target;
if (t.closest?.('.ty-gloss')) { open.btn.setAttribute('aria-expanded', 'true'); return; }
if (!t.closest?.('.term')) closeGloss();
});
d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { const b = open.btn; closeGloss(); b.focus({ preventScroll: true }); } });
let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; closeGloss(true); } });
addEventListener('scroll', () => { if (open && root.classList.contains('fm') && Math.abs(scrollY - open.y) > 6) closeGloss(true); }, { passive: true });
};
const language = () => {
if (!reader || !scenes.length) return;
const slug = reader.dataset.slug; let mine = false;
for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(ev, () => { mine = true; }, { once: true, passive: true });
addEventListener('pageshow', () => root.classList.remove('ty-leave'));
if (UI.samePath) $$('[data-lang-switch]').forEach((a) => a.addEventListener('click', (e) => {
if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
const at = filmOn() ? window.SpritualFilmAt?.() : null;
let href = a.href; if (at) { href = href.split('#')[0] + '#page-' + at.n; a.href = href; }
const m = href.match(/#page-(\d+)$/); if (!m) return;
const n = +m[1], sc = scenes[n - 1]; if (!sc) return;
let j = -1, y = 0; const pairs = $$('.scene-text > .pair', sc);
if (filmOn()) { if (at) j = Math.min(at.j, pairs.length - 1); else { const on = $('.fm-beat.on', sc); j = on ? pairs.indexOf(on) : -1; } }
else {
const line = innerHeight * .3; j = pairs.findIndex((p) => p.getBoundingClientRect().bottom > line);
if (j < 0) j = pairs.length - 1; else if (j === 0 && pairs[0].getBoundingClientRect().top > innerHeight * .62) j = -1;
const el = j >= 0 ? pairs[j] : $('.shot-card h2', sc) || sc; y = Math.round(el.getBoundingClientRect().top);
}
try { sessionStorage.setItem(KEY, JSON.stringify({ slug, n, j, y, t: Date.now() })); } catch { return; }
if (still() || !cssReady) return;
e.preventDefault(); root.classList.add('ty-leave'); setTimeout(() => { location.href = href; }, 280);
}));
let st = null; try { st = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch {}
const late = () => performance.now() > 1150;
const fade = (was, cls) => { if (!root.classList.contains(was)) return; root.classList.remove(was); if (!still() && !late() && !(cls === 'ty-in' && /^lang/.test(root.dataset.vt || ''))) { root.classList.add(cls); setTimeout(() => root.classList.remove(cls), 520); } };
const paint = () => fade('ty-arr', 'ty-in');
const release = () => { paint(); fade('ty-arw', 'ty-inw'); };
const sc = st && st.slug === slug && Date.now() - st.t < 20000 && new RegExp('#page-' + st.n + '$').test(location.hash) ? scenes[st.n - 1] : null;
if (!sc) return release();
root.classList.add('ty-held');   // site.js leaves the placing to this script from here on
const pairs = $$('.scene-text > .pair', sc);
const aim = () => {
if (root.classList.contains('fm')) {
const host = st.j >= 0 && pairs[st.j] ? pairs[st.j] : $('.shot', sc), sp = (host && $(':scope > .fm-sp', host)) || sc;
return { host, el: host ? (st.j >= 0 && pairs[st.j] ? $(':scope > p', host) : $('.shot-card', host)) : null, off: sp.getBoundingClientRect().top, go: () => sp.scrollIntoView({ block: 'start', behavior: 'instant' }) };
}
const el = st.j >= 0 && pairs[st.j] ? $(':scope > p', pairs[st.j]) : $('.shot-card h2', sc) || sc, want = clamp(st.y, 64, innerHeight * .7), off = el.getBoundingClientRect().top - want;
return { el, off, go: () => scrollTo({ top: Math.max(0, scrollY + off), behavior: 'instant' }) };
};
const t0 = performance.now();
let shown = false;
let yT = null, fixes = 0;
let shownAt = 0;
const place = (again) => { if (mine || (shown && !again)) return; try { aim().go(); yT = scrollY; } catch {} };
window.SpritualTypePlace = place;
const guard = () => { if (mine || fixes > 12 || (shown && performance.now() - shownAt > 1500)) return removeEventListener('scroll', guard); if (yT != null && Math.abs(scrollY - yT) > 8) { fixes++; place(true); } };
addEventListener('scroll', guard, { passive: true });
if (!mine && !root.classList.contains('fm')) sc.scrollIntoView({ block: 'start', behavior: 'instant' });
const settled = () => !root.classList.contains('fm') || $$('.fm-stage .on img').length < 2;
const ready = () => new Promise((res) => { const go = () => { if (!root.classList.contains('fm') || root.classList.contains('fm-live') || performance.now() - t0 > 2200) res(); else setTimeout(go, 40); }; go(); });
Promise.all([ready(), css]).then(() => {
let calm = 0, n = 0;
const show = () => {
if (shown) return; shown = true; shownAt = performance.now(); const el = aim().el;
if (el && !still() && !late()) { const cls = 'ty-form-o'; el.classList.add(cls); const off = () => el.classList.remove(cls); el.addEventListener('animationend', off, { once: true }); setTimeout(off, 1400); }
release(); window.SpritualFilmWake?.(2600);
};
const hold = () => {
if (mine) return show();
const a = aim(), film = root.classList.contains('fm'), ok = film && a.host ? a.host.classList.contains('on') : Math.abs(a.off) <= 1.5;
if (!ok) { calm = 0; if (!film || n % 3 === 0) place(); } else if (settled()) calm++;
if ((ok || n) && settled()) paint();
if (calm >= 3 || n > 30) show();
if (++n < 70 && !(calm > 20 && d.readyState === 'complete')) setTimeout(hold, 60);
};
hold();
});
};
language(); gloss();
css.then(() => { inkTitles(); kinetic(); metre(); });
};
})();
