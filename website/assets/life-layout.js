const VIRAMA = /[्্੍્୍்్್്]$/, JOIN = /^[‌‍\p{M}]/u;
export function createLayout(bus) {
const handles = new Set(), reads = [], writes = [];
let raf = 0, dirtyAll = true, io = null, ro = null, disposed = false;
const ac = new AbortController(), sig = { signal: ac.signal, passive: true };
const frame = () => {
raf = 0; if (disposed) return;
const rs = reads.splice(0), ws = writes.splice(0);
for (const r of rs) { try { r.res(r.fn()); } catch (e) { r.rej(e); } }   // every read first ...
if (dirtyAll) { dirtyAll = false; for (const h of handles) h.dirty = true; }
for (const h of handles) if (h.dirty && h.alive) measure(h);
for (const w of ws) { try { w.res(w.fn()); } catch (e) { w.rej(e); } }   // ... then every write
};
const schedule = () => { if (!raf && !disposed) raf = requestAnimationFrame(frame); };
const q = (list, fn) => new Promise((res, rej) => { list.push({ fn, res, rej }); schedule(); });
const measure = (h) => { const b = h.el.getBoundingClientRect(); h.page = { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; h.dirty = false; h.fresh = true; };
const invalidate = () => { dirtyAll = true; schedule(); };
ro = new ResizeObserver(() => invalidate());
io = new IntersectionObserver((es) => { for (const e of es) { for (const h of handles) if (h.el === e.target) { h.ratio = e.intersectionRatio; h.visible = e.isIntersecting; const b = e.boundingClientRect; h.page = { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; h.dirty = false; h.fresh = true; h.listeners.forEach((f) => { try { f(h); } catch (x) {} }); } } }, { threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] });
ro.observe(document.documentElement);
addEventListener('resize', invalidate, sig); addEventListener('spritual:layout', invalidate, sig); addEventListener('load', invalidate, sig);
try { document.fonts && document.fonts.ready.then(invalidate); document.fonts && document.fonts.addEventListener('loadingdone', invalidate, { signal: ac.signal }); } catch (e) { /* no font events: the resize paths still cover it */ }
const track = (el) => {
const h = { el, page: null, dirty: true, fresh: false, alive: true, visible: false, ratio: 0, listeners: new Set(),
rect() { if (!h.page) { schedule(); return null; } if (h.dirty) schedule(); const y = h.page.y - (bus ? bus.state.sy : scrollY); return { x: h.page.x, y, w: h.page.w, h: h.page.h, top: y, left: h.page.x, right: h.page.x + h.page.w, bottom: y + h.page.h }; },
onChange(f) { h.listeners.add(f); return () => h.listeners.delete(f); },
dispose() { h.alive = false; handles.delete(h); if (!Array.from(handles).some((x) => x.el === el)) { ro.unobserve(el); io.unobserve(el); } } };
const twin = Array.from(handles).find((x) => x.el === el && x.alive); if (twin) { h.visible = twin.visible; h.ratio = twin.ratio; if (twin.page) { h.page = Object.assign({}, twin.page); h.dirty = false; h.fresh = true; } }
handles.add(h); ro.observe(el); io.observe(el); if (!twin || !twin.page) h.dirty = true; schedule(); return h;
};
const graphemes = (text, lang) => {
const seg = new Intl.Segmenter(lang || undefined, { granularity: 'grapheme' }), out = [];
for (const g of seg.segment(text)) {
const prev = out[out.length - 1];
if (prev && (VIRAMA.test(prev.s) || JOIN.test(g.segment))) { prev.s += g.segment; } else out.push({ s: g.segment, i: g.index });
}
return out.map((g) => ({ text: g.s, index: g.i }));
};
const textNodes = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) }), a = []; while (w.nextNode()) a.push(w.currentNode); return a; };
const words = (el, lang) => {
const out = [], lg = lang || el.lang || document.documentElement.lang || undefined, seg = new Intl.Segmenter(lg, { granularity: 'word' }), r = document.createRange(), sx = scrollX, sy = scrollY; let line = -1, lastTop = null;
for (const n of textNodes(el)) {
for (const w of seg.segment(n.nodeValue)) {
if (!w.isWordLike) continue; r.setStart(n, w.index); r.setEnd(n, w.index + w.segment.length);
const rects = Array.from(r.getClientRects()).filter((b) => b.width > 0).map((b) => ({ x: b.left + sx, y: b.top + sy, w: b.width, h: b.height })); if (!rects.length) continue;
if (lastTop === null || Math.abs(rects[0].y - lastTop) > rects[0].h * 0.5) { line++; lastTop = rects[0].y; }
out.push({ text: w.segment, node: n, start: w.index, end: w.index + w.segment.length, rects, line });
}
}
return out;
};
const letters = (word, lang) => {
const r = document.createRange(), sx = scrollX, sy = scrollY, out = [];
for (const g of graphemes(word.text, lang)) { r.setStart(word.node, word.start + g.index); r.setEnd(word.node, word.start + g.index + g.text.length); const b = r.getBoundingClientRect(); out.push({ text: g.text, x: b.left + sx, y: b.top + sy, w: b.width, h: b.height }); }
return out;
};
const dispose = () => { disposed = true; if (raf) cancelAnimationFrame(raf); ac.abort(); ro.disconnect(); io.disconnect(); handles.clear(); reads.length = writes.length = 0; };
return { track, read: (fn) => q(reads, fn), write: (fn) => q(writes, fn), invalidate, words, letters, graphemes, dispose, get tracked() { return handles.size; } };
}
