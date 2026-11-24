(function () {
var d = document, de = d.documentElement, U = JSON.parse(d.getElementById('ui').textContent).share, T = U.t;
var reader = d.querySelector('[data-reader]'), slug = reader.dataset.slug, title = reader.dataset.title, total = +reader.dataset.total || 1;
var lang = de.lang === 'hi' ? 'hi' : 'en', hi = lang === 'hi';
var watch = null; try { watch = JSON.parse(d.getElementById('watch-data').textContent); } catch (e) {}
var fmt = function (s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); };
var norm = function (s) { return String(s).replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim(); };
var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
var local = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
function paragraphs(sec) {
return [].slice.call(sec.querySelectorAll('.scene-text p[lang="' + lang + '"]')).map(function (p) { return norm(p.textContent); }).filter(Boolean);
}
var SS = window.spritualShare;
function sentences(paras) { return SS.sentences(paras); }
function allWords() { return [].slice.call(d.querySelectorAll('.scene-text p[lang="' + lang + '"]')).map(function (p) { return norm(p.textContent); }).join(' ¶ '); }
function sceneData(n) {
var sec = d.getElementById('page-' + n); if (!sec) return null;
var h = sec.querySelector('h2'), paras = paragraphs(sec), p0 = sec.querySelector('.scene-text p[lang="' + lang + '"]');
return { n: n, sec: sec, heading: norm(h ? h.textContent : ''), paras: paras, lines: sentences(paras), tint: (sec.dataset.tint || '18 10 7').split(/\s+/).map(Number), p0: p0 };
}
function selection() {
try { var s = String(getSelection()); return norm(s); } catch (e) { return ''; }
}
function link(n) {
var root = local ? location.origin + '/' + (hi ? 'hi/' : '') : U.live;
return U.key.indexOf(n) >= 0 ? root + 's/' + slug + '/' + n + '/' : root + U.path + '#page-' + n;
}
var imgCache = {};
function imageFor(n) {
var sc = watch && watch.scenes && watch.scenes[n - 1]; var url = '';
if (sc) {
var best = null; (sc.s || '').split(',').forEach(function (p) { var m = /^\s*(\S+)\s+(\d+)w/.exec(p); if (m && +m[2] <= 1700 && (!best || +m[2] > best.w)) best = { u: m[1], w: +m[2] }; });
url = (best && best.u) || sc.i || '';
}
if (!url) { var im = d.querySelector('#page-' + n + ' img'); url = im ? (im.currentSrc || im.src) : ''; }
if (!url) return Promise.resolve(null);
if (imgCache[url]) return imgCache[url];
return (imgCache[url] = new Promise(function (ok) {
var im = new Image(); im.decoding = 'async';
im.onload = function () { ok({ img: im, x: sc && sc.x != null ? sc.x / 100 : .5, y: sc && sc.y != null ? sc.y / 100 : .42, faces: (U.faces && U.faces[n]) || null }); };
im.onerror = function () { delete imgCache[url]; ok(null); };
im.src = url;
}));
}
function wrap(c, text, maxW) {
var words = text.split(' ');
if (words.length > 2) {
var tail = words[words.length - 2] + ' ' + words[words.length - 1];
if (c.measureText(tail).width < maxW) words.splice(words.length - 2, 2, tail);   // the last two words stay together
}
var greedy = function (w) {
var lines = [], cur = '';
words.forEach(function (x) { var t = cur ? cur + ' ' + x : x; if (cur && c.measureText(t).width > w) { lines.push(cur); cur = x; } else cur = t; });
if (cur) lines.push(cur); return lines;
};
var g = greedy(maxW); if (g.length < 2) return g;
var lo = maxW * .5, hi2 = maxW;   // the narrowest measure that still takes the same number of lines
for (var i = 0; i < 14; i++) { var mid = (lo + hi2) / 2; if (greedy(mid).length <= g.length) hi2 = mid; else lo = mid; }
return greedy(hi2);
}
function clearFaces(sx, cw, iw, fs, take) {
var lo = 0, hi = iw - cw, i, r0 = function (f) { return f.r / 1.15; };
for (i = 0; i < take; i++) { lo = Math.max(lo, fs[i].x + r0(fs[i]) - cw); hi = Math.min(hi, fs[i].x - r0(fs[i])); }
if (lo > hi) return sx;
sx = clamp(sx, lo, hi);
for (var pass = 0; pass < 3; pass++) {
var moved = false;
for (i = 0; i < fs.length; i++) {
var a = fs[i].x - r0(fs[i]), b = fs[i].x + r0(fs[i]);
if (!(b > sx + 1 && a < sx + cw - 1 && (a < sx - 1 || b > sx + cw + 1))) continue;
var best = null, opts = [[b - cw, a], [b, hi], [lo, a - cw]];
opts.forEach(function (o) { var l = Math.max(o[0], lo), h2 = Math.min(o[1], hi); if (l > h2) return; var c2 = clamp(sx, l, h2); if (best === null || Math.abs(c2 - sx) < Math.abs(best - sx)) best = c2; });
if (best !== null && Math.abs(best - sx) > .5) { sx = best; moved = true; }
}
if (!moved) break;
}
return sx;
}
function place(c, pic, w, h) {
var im = pic.img, iw = im.naturalWidth, ih = im.naturalHeight, s0 = Math.max(w / iw, h / ih), cw0 = w / s0, F = pic.faces, MG = .08;
var cap = Math.min(iw, w * ih / (.72 * h));   // pulled back no further than the picture keeping 72% of its height; the rest is the gradient
var cw = cw0, cx = pic.x * iw, cy = pic.y * ih, lo = 0, hi2 = 0, fs = null, take = 0;
if (F && F.length) {
fs = F.map(function (f) { var r = f[2] / 200 * iw * 1.15; return { x: f[0] / 100 * iw, y: f[1] / 100 * ih, r: r, z: f[2] }; }).sort(function (a, b) { return b.z - a.z; });
take = fs.length; var span, mnx, mxx;
for (; take >= 1; take--) {
var use = fs.slice(0, take); mnx = Math.min.apply(0, use.map(function (f) { return f.x - f.r; })); mxx = Math.max.apply(0, use.map(function (f) { return f.x + f.r; }));
span = (mxx - mnx) / (1 - 2 * MG);
if (span <= cap) break;
}
if (take < 1) { take = 1; use = fs.slice(0, 1); mnx = use[0].x - use[0].r; mxx = use[0].x + use[0].r; span = (mxx - mnx) / (1 - 2 * MG); }
cw = Math.min(iw, Math.max(cw0, span)); cx = (mnx + mxx) / 2;
var ys = use.map(function (f) { return f.y; }); cy = (Math.min.apply(0, ys) + Math.max.apply(0, ys)) / 2;
}
var s = w / cw, ch = Math.min(ih, h / s), sx = clamp(cx - cw / 2, 0, iw - cw), sy = clamp(cy - ch * .42, 0, ih - ch);
if (F && F.length) sx = clearFaces(sx, cw, iw, fs, take);
var dh = ch * s;   // shorter than the window when the painting was pulled back: the card's dark takes the rest,
var dy = Math.round(Math.max(0, h - dh) * .5);   // shared above and below so the picture floats in it, not hangs from the top
c.drawImage(im, sx, sy, cw, ch, 0, dy, w, dh);
var fb = F && F.length ? (fs[0].y + fs[0].r / 1.15 - sy) * s + dy : -1;
return { top: dy, bottom: dy + dh, pulled: cw > cw0 + 1, fb: fb };
}
function fontsFor(list) {
if (!d.fonts || !d.fonts.load) return Promise.resolve();
var all = Promise.all(list.map(function (f) { return d.fonts.load(f[0], f[1]).catch(function () {}); }));
return Promise.race([all, new Promise(function (ok) { setTimeout(ok, 2500); })]);
}
var show = function (x) { return x.replace(/\s+([\u0964\u0965])/g, '$1'); };
function layout(c, text, source, shape, fam, wt, lab) {
var W = 1080, H = shape === 'status' ? 1920 : 1350, pad = 92, tw = W - pad * 2, safeB = shape === 'status' ? 280 : 92;
var sizes = hi ? [34, 31, 28] : [31, 28, 25], srcSize = sizes[0], labLS = hi ? 0 : 3.2, srcLines, footSize = hi ? 32 : 30;
for (var si = 0; si < sizes.length; si++) {
srcSize = sizes[si]; labLS = hi ? 0 : 3.2 - si * .5;
c.font = '600 ' + srcSize + 'px ' + lab; if ('letterSpacing' in c) c.letterSpacing = labLS + 'px';
srcLines = wrap(c, hi ? source : source.toUpperCase(), tw - 6); if (srcLines.length <= 2) break;
}
srcLines = srcLines.slice(0, 3); if ('letterSpacing' in c) c.letterSpacing = '0px';
var footH = srcLines.length * (srcSize * 1.5) + 18 + footSize * 1.4;
var minPaint = shape === 'status' ? 820 : 600, maxS = shape === 'status' ? 68 : 58, minS = shape === 'status' ? 40 : 38, room = H - safeB - footH - 64 - 70 - minPaint;
var size = maxS, lines, lh, textH;
for (;; size -= 2) {
c.font = wt + ' ' + size + 'px ' + fam; lines = wrap(c, show(text), tw); lh = Math.round(size * (hi ? 1.62 : 1.36)); textH = lines.length * lh;
if ((textH <= room && !(lines.length > 1 && lines[lines.length - 1].indexOf(" ") < 0)) || size <= minS) break;
}
var footBottom = H - safeB, footTop = footBottom - footH, textBottom = footTop - 64, textTop = textBottom - textH, orn = textTop - 50;
return { W: W, H: H, pad: pad, tw: tw, size: size, lines: lines, lh: lh, textH: textH, srcSize: srcSize, footSize: footSize, labLS: labLS, srcLines: srcLines, footBottom: footBottom, footTop: footTop, textTop: textTop, orn: orn, paintH: Math.round(orn + 26), fits: textH <= room };
}
var faceOf = function (sc) { var cs = sc && sc.p0 ? getComputedStyle(sc.p0) : null; return { fam: (cs && cs.fontFamily) || (hi ? '"Tiro Devanagari Hindi", Georgia, serif' : 'Newsreader, Georgia, serif'), wt: Math.max(400, parseInt((cs && cs.fontWeight) || 400, 10) || 400), lab: hi ? '"Mukta", "Tiro Devanagari Hindi", sans-serif' : 'Newsreader, Georgia, serif' }; };
function paint(st) {
var sc = st.sc, cv = st.cv, f = faceOf(sc), c = cv.getContext('2d'), tint = 'rgb(' + sc.tint.join(',') + ')';
var L = layout(c, st.line, st.source, st.shape, f.fam, f.wt, f.lab), W = L.W, H = L.H, pad = L.pad, fam = f.fam, wt = f.wt, lab = f.lab;
var size = L.size, lines = L.lines, lh = L.lh, srcSize = L.srcSize, footSize = L.footSize, labLS = L.labLS, srcLines = L.srcLines, footBottom = L.footBottom, footTop = L.footTop, textTop = L.textTop, orn = L.orn, paintH = L.paintH;
cv.width = W; cv.height = H; c = cv.getContext('2d');
c.fillStyle = tint; c.fillRect(0, 0, W, H);
if (st.pic) {
var pl = place(c, st.pic, W, paintH), edge = Math.min(paintH, Math.round(pl.bottom));
var gH = Math.min(edge - pl.top, Math.round(H * .24)), rgb = sc.tint.join(',');
if (pl.fb > 0) gH = Math.max(Math.round(H * .07), Math.min(gH, Math.round((edge - pl.fb) * 1.5)));
var g = c.createLinearGradient(0, edge - gH, 0, edge);
[[0, 0], [.3, .2], [.58, .58], [.82, .9], [1, 1]].forEach(function (s) { g.addColorStop(s[0], 'rgba(' + rgb + ',' + s[1] + ')'); });
c.fillStyle = g; c.fillRect(0, edge - gH, W, gH + 1);
var tt = pl.top, tl = tt ? 240 : 150, tg = c.createLinearGradient(0, tt, 0, tt + tl); tg.addColorStop(0, 'rgba(' + rgb + ',' + (tt ? 1 : .38) + ')'); if (tt) { tg.addColorStop(.4, 'rgba(' + rgb + ',.6)'); tg.addColorStop(.75, 'rgba(' + rgb + ',.18)'); } tg.addColorStop(1, 'rgba(' + rgb + ',0)'); c.fillStyle = tg; c.fillRect(0, tt, W, tl);
}
c.fillStyle = '#e9c98c'; c.fillRect(pad, orn, 64, 2);
c.beginPath(); c.moveTo(pad + 76, orn + 1); c.lineTo(pad + 82, orn - 5); c.lineTo(pad + 88, orn + 1); c.lineTo(pad + 82, orn + 7); c.closePath(); c.fill();
c.fillStyle = '#fbeed2'; c.textBaseline = 'alphabetic'; c.font = wt + ' ' + size + 'px ' + fam;
lines.forEach(function (ln, i) { c.fillText(ln, pad, textTop + i * lh + lh * .5 + size * .33); });
c.fillStyle = '#e9c98c'; c.font = '600 ' + srcSize + 'px ' + lab; if ('letterSpacing' in c) c.letterSpacing = labLS + 'px';
srcLines.forEach(function (ln, i) { c.fillText(ln, pad, footTop + srcSize * 1.15 + i * srcSize * 1.5); });
if ('letterSpacing' in c) c.letterSpacing = '0px';
c.fillStyle = 'rgba(246,236,218,.74)'; c.font = '400 ' + footSize + 'px ' + lab;
c.fillText(T.footer, pad, footBottom - 4);
}
var dlg, el = {}, S = { n: 1, shape: 'chat', line: '', lines: [], sc: null, pic: null, token: 0, blob: null, opener: null, toastT: 0 };
var canShareFiles = function (f) { try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [f] })); } catch (e) { return false; } };
function build() {
if (dlg) return;
dlg = d.createElement('dialog'); dlg.className = 'shr'; dlg.tabIndex = -1; dlg.setAttribute('aria-labelledby', 'shr-h'); dlg.lang = lang;
dlg.innerHTML =
'<div class="shr-in">' +
'<header class="shr-head"><h2 id="shr-h">' + esc(T.title) + '</h2><button type="button" class="shr-x" data-shr-close aria-label="' + esc(T.close) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>' +
'<div class="shr-stage"><canvas class="shr-cv" role="img" width="1080" height="1350"></canvas><p class="shr-busy" role="status"></p></div>' +
'<div class="shr-ctl"><div class="shr-seg" role="group" aria-label="' + esc(T.shapeLabel) + '"><button type="button" data-shape="chat" aria-pressed="true">' + esc(T.chat) + '<small>' + esc(T.chatHint) + '</small></button><button type="button" data-shape="status" aria-pressed="false">' + esc(T.status) + '<small>' + esc(T.statusHint) + '</small></button></div>' +
'<p class="shr-k" id="shr-k">' + esc(T.lineLabel) + '</p><div class="shr-lines" role="radiogroup" aria-labelledby="shr-k"></div></div>' +
'<footer class="shr-act"><div class="shr-btns"><button type="button" class="shr-go" data-shr-go></button><button type="button" class="shr-alt" data-shr-save>' + esc(T.save) + '</button><button type="button" class="shr-alt" data-shr-copy>' + esc(T.copy) + '</button></div><p class="shr-toast" role="status" aria-live="polite"></p><p class="shr-note">' + esc(T.lead) + '</p></footer>' +
'</div>';
d.body.appendChild(dlg);
el.ctl = dlg.querySelector('.shr-ctl'); el.cv = dlg.querySelector('.shr-cv'); el.busy = dlg.querySelector('.shr-busy'); el.lines = dlg.querySelector('.shr-lines'); el.ctl.addEventListener('scroll', more, { passive: true }); addEventListener('resize', function () { if (dlg.open) more(); });
el.btns = dlg.querySelector('.shr-btns'); el.go = dlg.querySelector('[data-shr-go]'); el.toast = dlg.querySelector('.shr-toast'); el.save = dlg.querySelector('[data-shr-save]');
dlg.addEventListener('click', function (e) {
if (e.target === dlg || e.target.closest('[data-shr-close]')) return close();
var sh = e.target.closest('[data-shape]'); if (sh) return setShape(sh.dataset.shape);
var ln = e.target.closest('.shr-line'); if (ln) return pick(+ln.dataset.i);
if (e.target.closest('[data-shr-copy]')) return copyLink().then(function (ok) { say(ok ? T.copied : link(S.n)); });
if (e.target.closest('[data-shr-save]')) return save();
if (e.target.closest('[data-shr-go]')) return go();
});
dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
dlg.addEventListener('wheel', function (e) { if (e.target === dlg) e.preventDefault(); }, { passive: false });
el.lines.addEventListener('keydown', function (e) {
var k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!k) return;
e.preventDefault(); var i = clamp(S.lines.indexOf(S.line) + k, 0, S.lines.length - 1); pick(i); var b = el.lines.children[i]; if (b) { b.focus(); b.scrollIntoView({ block: 'nearest' }); }
});
}
function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function say(msg) { el.toast.textContent = msg; clearTimeout(S.toastT); S.toastT = setTimeout(function () { el.toast.textContent = ''; }, 3600); }
function more() { var c = el.ctl; c.classList.toggle('has-more', c.scrollHeight - c.scrollTop - c.clientHeight > 8); c.classList.toggle('has-above', c.scrollTop > 8); }
function reveal() {
var c = el.ctl, sel = el.lines.querySelector('[aria-checked="true"]'); c.scrollTop = 0;
if (sel) { var cr = c.getBoundingClientRect(), sr = sel.getBoundingClientRect(); if (sr.bottom > cr.bottom - 8 || sr.top < cr.top) c.scrollTop = Math.max(0, c.scrollTop + sr.top - cr.top - Math.min(48, cr.height * .2)); }
more();
}
function fillLines() {
el.lines.textContent = '';
S.lines.forEach(function (ln, i) {
var b = d.createElement('button'); b.type = 'button'; b.className = 'shr-line'; b.setAttribute('role', 'radio'); b.dataset.i = i; b.lang = lang;
b.setAttribute('aria-checked', String(ln === S.line)); b.tabIndex = ln === S.line ? 0 : -1;
var t = d.createElement('span'); t.textContent = show(ln); b.appendChild(t); el.lines.appendChild(b);
});
}
function pick(i) {
var ln = S.lines[i]; if (ln == null || ln === S.line) return; S.line = ln;
[].forEach.call(el.lines.children, function (b, j) { b.setAttribute('aria-checked', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
render();
}
function setShape(sh) {
if (sh === S.shape) return; S.shape = sh;
[].forEach.call(dlg.querySelectorAll('[data-shape]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.shape === sh)); });
render();
}
function render() {
var my = ++S.token; S.blob = null; el.go.disabled = true; el.save.disabled = true; dlg.classList.add('is-busy'); el.busy.textContent = T.preparing;
var sc = S.sc, line = S.line;
Promise.all([S.pic ? S.pic : imageFor(S.n).then(function (p) { S.pic = p; return p; }), fontsFor([[faceOf(sc).wt + ' 56px ' + faceOf(sc).fam, show(line)], [(hi ? '600 26px "Mukta"' : '600 26px Newsreader'), S.source + T.footer]])]).then(function () {
if (my !== S.token) return;
try { paint({ shape: S.shape, sc: sc, line: line, pic: S.pic, source: S.source, cv: el.cv }); } catch (e) { el.busy.textContent = T.failed; dlg.classList.remove('is-busy'); return; }
el.cv.setAttribute('aria-label', fmt(T.cardAlt, { line: show(line) }));
el.cv.classList.remove('is-new'); void el.cv.offsetWidth; el.cv.classList.add('is-new');
el.cv.toBlob(function (b) {
if (my !== S.token) return;
el.busy.textContent = ''; dlg.classList.remove('is-busy');
if (!b) { el.busy.textContent = T.failed; return; }
S.blob = b; S.file = null; try { S.file = new File([b], 'spiritual-' + slug + '-' + S.n + '.jpg', { type: 'image/jpeg' }); } catch (e) {}
var sm = S.file && canShareFiles(S.file) ? 'share' : 'save'; el.go.textContent = sm === 'share' ? T.share : T.save; el.go.dataset.mode = sm; el.btns.dataset.mode = sm;
el.save.hidden = sm === 'save'; el.go.disabled = false; el.save.disabled = false;
}, 'image/jpeg', .92);
});
}
function copyLink() {
var url = link(S.n);
if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(url).then(function () { return true; }, function () { return false; });
try { var t = d.createElement('textarea'); t.value = url; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0'; d.body.appendChild(t); t.select(); var ok = d.execCommand('copy'); t.remove(); return Promise.resolve(ok); } catch (e) { return Promise.resolve(false); }
}
function go() {
if (!S.blob) return;
if (el.go.dataset.mode === 'share' && S.file) {
var data = { files: [S.file], text: fmt(T.sharedText, { heading: S.sc.heading, title: title }) + '\n' + link(S.n) };
navigator.share(data).then(function () { say(T.sent); }, function (e) { if (e && e.name !== 'AbortError') save(); });
} else save();
}
function save() {
if (!S.blob) return;
var a = d.createElement('a'), u = URL.createObjectURL(S.blob); a.href = u; a.download = 'spiritual-' + slug + '-' + S.n + '.jpg'; d.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
copyLink().then(function (ok) { say(ok ? T.saved : T.copied); });
}
function open(o) {
var n = clamp(+o.scene || 1, 1, total), sc = sceneData(n); if (!sc) return false;
build(); S.n = n; S.sc = sc; S.pic = null; S.source = U.source + ' \u00B7 ' + fmt(T.atScene, { n: n }); S.opener = o.from || d.activeElement;
var want = norm(o.text || ''), sel = selection(), pool = sc.paras.join(' ¶ '), words = allWords(), lines = sc.lines.slice();
var chosen = '';
if (want && words.indexOf(want) >= 0) chosen = want;
else if (!want && sel && sel.length >= 8 && sel.length <= 360 && pool.indexOf(sel) >= 0) chosen = sel;
if (chosen && lines.indexOf(chosen) < 0) lines.unshift(chosen);
if (!lines.length) return false;
S.lines = lines; S.line = chosen || SS.pick(lines) || lines[0];
fillLines(); if (!dlg.open) { dlg.classList.remove('is-in'); dlg.showModal(); try { history.pushState({ shr: 1 }, '', location.href); pushed = true; } catch (e) {} }
el.cv.setAttribute('aria-label', ''); el.toast.textContent = '';
requestAnimationFrame(function () { requestAnimationFrame(function () { dlg.classList.add('is-in'); }); });
el.go.disabled = true; el.go.textContent = T.share; dlg.focus({ preventScroll: true });
render(); reveal();
return true;
}
var pushed = false;
addEventListener('popstate', function () { if (pushed && dlg && dlg.open) { pushed = false; close(true); } });
function close(fromBack) {
if (!dlg || !dlg.open) return;
if (pushed && fromBack !== true) { pushed = false; try { if (history.state && history.state.shr) history.back(); } catch (e) {} }
S.token++;
dlg.classList.remove('is-in');
var done = function () { if (dlg.open) dlg.close(); try { S.opener && S.opener.focus && S.opener.focus({ preventScroll: true }); } catch (e) {} };
if (matchMedia('(prefers-reduced-motion: reduce)').matches || de.dataset.motion === 'reduce') done(); else setTimeout(done, 340);
}
window.__spritualShareSheet = { open: open, link: link, _layout: function (text, shape) { var f = faceOf(S.sc || sceneData(1)); return layout(d.createElement('canvas').getContext('2d'), text, S.source || U.source, shape, f.fam, f.wt, f.lab); } };
})();
