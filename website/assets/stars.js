(() => {
const sky = document.querySelector('[data-stars]'); if (!sky) return;
const root = document.documentElement;
const off = () => sky.classList.add('is-off');
if (root.classList.contains('ep-lite')) return off();
const stage = sky.querySelector('[data-st-stage]'); const cv = stage.querySelector('canvas'); const ctx = cv.getContext && cv.getContext('2d');
if (!ctx || !window.ResizeObserver) return off();
sky.classList.add('is-on');
const calm = () => root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
const UI = JSON.parse(sky.querySelector('[data-st-ui]').textContent);
const hi = root.lang === 'hi';
const boxEl = stage.parentNode; const zoomEl = sky.querySelector('.st-zoom'); const card = sky.querySelector('[data-st-card]'); const live = sky.querySelector('[data-st-live]');
const TAU = Math.PI * 2; const GOLD = '243,196,126';
const realms = [...document.querySelectorAll('.st-realm')].map((el) => ({ id: el.dataset.realm, hw: +el.dataset.hw, hh: +el.dataset.hh, name: el.querySelector('.st-h3').firstChild.textContent.trim(), cx: 0, cy: 0, a: 1 }));
const nodes = []; const byId = {};
for (const el of document.querySelectorAll('.st-p')) {
const d = el.dataset; const a = el.querySelector('.st-p-a');
const n = { id: d.id, el, i: nodes.length, realm: realms.find((r) => r.id === el.closest('.st-realm').dataset.realm), lx: +d.x, ly: +d.y, r: +d.r, tier: d.tier, light: d.light, cell: +d.cell,
name: el.querySelector('.st-p-n').textContent, other: d.o, en: d.en, href: a.getAttribute('href'), title: el.querySelector('.st-p-k')?.textContent || '', line: el.querySelector('.st-p-l').textContent,
ties: [...el.querySelectorAll('.st-ties > li')].map((li) => ({ k: li.dataset.k, ph: li.dataset.ph })), withs: [...el.querySelectorAll('.st-with a')].map((x) => ({ k: x.dataset.k, n: +x.dataset.n })),
x: 0, y: 0, ph: (nodes.length * 2.399) % TAU, sp: 0.38 + ((nodes.length * 7) % 11) * 0.02, near: null, lab: null };
nodes.push(n); byId[n.id] = n;
}
if (!nodes.length) return off();
const short = (n) => n.name.replace(/\s*\(.*\)$/, '');
const named = []; const withs = []; const seen = new Set();
for (const n of nodes) for (const t of n.ties) { const m = byId[t.k]; if (!m) continue; const key = n.i < m.i ? n.i + '-' + m.i : m.i + '-' + n.i; if (!seen.has(key)) { seen.add(key); named.push({ a: n, b: m, bow: (n.i + m.i) % 2 ? 1 : -1 }); } }
for (const n of nodes) for (const t of n.withs) { const m = byId[t.k]; if (!m || m.i < n.i) continue; if (!seen.has(n.i + '-' + m.i)) withs.push({ a: n, b: m, n: t.n, bow: (n.i + m.i) % 2 ? 1 : -1 }); }
for (const n of nodes) { n.near = new Set([...n.ties.map((t) => t.k), ...n.withs.map((t) => t.k)]); n.kin = new Set(n.ties.map((t) => t.k)); }
let W = 0; let H = 0; let CW = 0; let CH = 0; let MG = 0; let lazy = false; let dpr = 1; let wide = null; const dc = { x: 0, y: 0, k: 1 }; let box = { x0: 0, y0: 0, x1: 1, y1: 1 };
const cam = { x: 0, y: 0, k: 1 }; const to = { x: 0, y: 0, k: 1 }; let ease = 0.3; let kMin = 0.2; const K_MAX = 1.7;
const arrange = () => {
const gap = 90; let c = 0;
if (wide) { const tot = realms.reduce((s, r) => s + r.hw * 2, 0) + gap * (realms.length - 1); c = -tot / 2; realms.forEach((r, i) => { r.cx = c + r.hw; r.cy = i % 2 ? -36 : 24; c += r.hw * 2 + gap; }); }
else { const tot = realms.reduce((s, r) => s + r.hh * 2 + 60, 0) + gap * (realms.length - 1); c = -tot / 2; realms.forEach((r) => { r.cx = 0; r.cy = c + 60 + r.hh; c += r.hh * 2 + 60 + gap; }); }
for (const n of nodes) { n.x = n.realm.cx + n.lx; n.y = n.realm.cy + n.ly; }
box = { x0: Math.min(...realms.map((r) => r.cx - r.hw)), x1: Math.max(...realms.map((r) => r.cx + r.hw)), y0: Math.min(...realms.map((r) => r.cy - r.hh - 60)), y1: Math.max(...realms.map((r) => r.cy + r.hh)) };
};
const fit = (b, pad) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, k: Math.min(K_MAX, (W - pad * 2) / (b.x1 - b.x0), (H - pad * 2 - 40) / (b.y1 - b.y0)) });
const realmBox = (r) => ({ x0: r.cx - r.hw, x1: r.cx + r.hw, y0: r.cy - r.hh - 60, y1: r.cy + r.hh });
const frameRealm = (r) => {
const top = H * 0.08 + 6; const bot = H * 0.08; const b = realmBox(r); const k = Math.min(K_MAX, Math.max(wide ? 0.66 : 0.74, Math.min((W - 40) / (b.x1 - b.x0), (H - top - bot) / (b.y1 - b.y0))));
return { x: r.cx, y: (b.y1 - b.y0) * k <= H - top - bot ? (b.y0 + b.y1) / 2 + (bot - top) / 2 / k : b.y0 + (H / 2 - top) / k, k };
};
const clampCam = (c) => {
c.k = Math.max(kMin, Math.min(K_MAX, c.k)); const hw = W / 2 / c.k * 0.2; const hh = H / 2 / c.k * 0.5;
c.x = box.x0 + hw > box.x1 - hw ? (box.x0 + box.x1) / 2 : Math.max(box.x0 + hw, Math.min(box.x1 - hw, c.x)); c.y = box.y0 + hh > box.y1 - hh ? (box.y0 + box.y1) / 2 : Math.max(box.y0 + hh, Math.min(box.y1 - hh, c.y)); return c;
};
const go = (c, t = 0.42) => { Object.assign(to, clampCam(c)); ease = t; if (calm()) Object.assign(cam, to); if (sheet && !pts.size && to.k / sheet.kb > 1.4) bake(); wake(); };
const home = () => frameRealm(realms[0]);
const tether = () => {
const hw = Math.max(20, W / 2 - 44) / to.k; const hh = Math.max(20, H / 2 - H * 0.08 - 40) / to.k; let best = null; let bd = 1e18;
for (const p of nodes) { const dx = Math.max(0, Math.abs(p.x - to.x) - hw); const dy = Math.max(0, Math.abs(p.y - to.y) - hh); const d = dx * dx + dy * dy; if (!d) return; if (d < bd) { bd = d; best = p; } }
const dx = best.x - to.x; const dy = best.y - to.y;
go({ x: to.x + Math.sign(dx) * Math.max(0, Math.abs(dx) - hw * 0.55), y: to.y + Math.sign(dy) * Math.max(0, Math.abs(dy) - hh * 0.55), k: to.k }, 0.5);
};
let faces = null; let fresh = false; let cell = 0; const cols = +sky.dataset.cols || 10;
const loadFaces = (src, then) => {
if (!src) return; const ok = (pic) => { if (faces && faces.width > pic.width) return; faces = pic; cell = pic.width / cols; if (W) { if (sheet && sheet.had) { fresh = true; wake(); } else bake(); } then && then(); };
const plain = () => { const im = new Image(); im.decoding = 'async'; im.onload = () => ok(im); im.src = src; };
if (window.createImageBitmap && window.fetch) fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject())).then((bl) => createImageBitmap(bl)).then(ok, plain); else plain();
};
let hd = weak || !sky.dataset.atlasHd;
const wantHd = () => { if (hd) return; hd = true; setTimeout(() => (window.requestIdleCallback || setTimeout)(() => loadFaces(sky.dataset.atlasHd)), 900); };
for (const ev of ['pointerup', 'keyup']) sky.addEventListener(ev, wantHd, { capture: true, passive: true });
loadFaces(sky.dataset.atlas, () => { if (matchMedia('(hover: hover) and (pointer: fine)').matches) (window.requestIdleCallback || setTimeout)(wantHd); });
const halo = document.createElement('canvas'); halo.width = halo.height = 128;
{ const g = halo.getContext('2d'); const gr = g.createRadialGradient(64, 64, 18, 64, 64, 64); gr.addColorStop(0, `rgba(${GOLD},.5)`); gr.addColorStop(0.45, `rgba(${GOLD},.16)`); gr.addColorStop(1, `rgba(${GOLD},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
const font = getComputedStyle(sky.closest('.st-page').querySelector('.st-h1')).fontFamily; const SIZE = { legend: hi ? 16.5 : 15.5, lead: hi ? 15 : 14, cast: hi ? 14 : 13 };
let labels = null;
let sheet = null; let baking = 0;
const bake = () => {
const job = ++baking; const had = !!faces; const kb = to.k; const d = dpr; const pad = 2; const cellPx = Math.ceil(44 * 2 * kb * d) + pad * 2; const per = Math.max(1, Math.floor(2048 / cellPx)); const c = document.createElement('canvas');
c.width = Math.min(nodes.length, per) * cellPx; c.height = Math.ceil(nodes.length / per) * cellPx; const g = c.getContext('2d'); g.imageSmoothingQuality = 'medium'; let i = 0;
const some = () => {
if (job !== baking) return; const end = sheet ? Math.min(nodes.length, i + 6) : nodes.length;
for (; i < end; i++) {
const n = nodes[i]; const r = n.r * kb * d; const x = (n.i % per) * cellPx + cellPx / 2; const y = Math.floor(n.i / per) * cellPx + cellPx / 2;
if (faces && n.cell >= 0) g.drawImage(faces, (n.cell % cols) * cell, Math.floor(n.cell / cols) * cell, cell, cell, x - r, y - r, r * 2, r * 2); else { g.fillStyle = '#2a1b11'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
g.beginPath(); g.arc(x, y, r - 0.6 * d, 0, TAU); g.strokeStyle = n.light; g.globalAlpha = 0.72; g.lineWidth = (n.tier === 'cast' ? 1 : 1.4) * d; g.stroke(); g.globalAlpha = 1;
}
if (i < nodes.length) return requestAnimationFrame(some);
sheet = { c, kb, cellPx, per, dpr: d, had }; wake();
};
some();
};
let labelJob = 0;
const makeLabels = () => {
const job = ++labelJob; const s = Math.min(2, dpr); const rowH = hi ? 30 : 24; const SH = 1024 / s; const c = document.createElement('canvas'); c.width = 1024; c.height = Math.ceil(rowH * s * 20); const g = c.getContext('2d');
g.scale(s, s); g.textBaseline = 'middle'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(10,6,4,.82)'; g.fillStyle = '#f6ead9'; let x = 0; let y = 0; let i = 0; const lab = [];
const some = () => {
if (job !== labelJob) return;
for (const end = Math.min(nodes.length, i + 12); i < end; i++) { const n = nodes[i]; g.font = `500 ${SIZE[n.tier]}px ${font}`; const w = Math.ceil(g.measureText(short(n)).width) + 12; if (x + w > SH) { x = 0; y += rowH; } lab[i] = { x, y, w, h: rowH }; g.strokeText(short(n), x + w / 2, y + rowH / 2 + 1); g.fillText(short(n), x + w / 2, y + rowH / 2 + 1); x += w; }
if (i < nodes.length) return requestAnimationFrame(some);
nodes.forEach((n, j) => { n.lab = lab[j]; }); labels = { c, s }; wake();
};
requestAnimationFrame(some);
};
let sel = null; let hover = null; let kbd = false; let born = 0; let fr = null; let pressed = ''; let zr = null; let loose = false;
const focusOf = () => sel || hover;
const sx = (x) => (x - dc.x) * dc.k + CW / 2; const sy = (y) => (y - dc.y) * dc.k + CH / 2;
const curve = (e, t) => { const ax = e.a.px; const ay = e.a.py; const bx = e.b.px; const by = e.b.py; const mx = (ax + bx) / 2 - (by - ay) * 0.1 * e.bow; const my = (ay + by) / 2 + (bx - ax) * 0.1 * e.bow; if (t == null) { ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); return null; } const u = 1 - t; return [u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by]; };
const hit = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const edgeA = (x0, x1) => { const g = Math.min(W * 0.05, 36); return clamp01((Math.min(x0 - MG, MG + W - x1) - g * 0.4) / g); };
const titles = []; const placed = []; const byRank = [...nodes].sort((a, b) => b.r - a.r || a.i - b.i);
const draw = (now) => {
dc.x = cam.x; dc.y = cam.y; dc.k = cam.k; const t = now / 1000; const still = calm(); const f = focusOf(); const k = dc.k;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, CW, CH);
const far = clamp01((0.3 - k) / 0.08); const ra = Math.max(clamp01((0.95 - k) / 0.3) * 0.5 * (f ? 0.35 : 1), far * 0.94); titles.length = 0;
if (ra > 0.01) {
const small = W < 500; const base = Math.max(13, Math.min(small ? 22 : 30, 46 * k)); const fs = base + ((small ? 19 : 22) - base) * far;
ctx.fillStyle = `rgb(${GOLD})`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.font = `500 ${fs.toFixed(1)}px ${font}`; try { ctx.letterSpacing = hi ? '0px' : '0.14em'; } catch (e) {}
for (const r of realms) {
const s = hi ? r.name : r.name.toUpperCase(); const w = ctx.measureText(s).width + 10; const h = fs * (hi ? 1.5 : 1.1); const x = sx(r.cx); const y = sy(r.cy - (r.hh + 26) * (1 - far));
const a = ra * r.a * edgeA(x - w / 2, x + w / 2) * clamp01((y - h / 2 - MG - H * 0.07) / 10) * clamp01((MG + H * 0.93 - y - h / 2) / 10);
if (a < 0.02 || (zr && hit(x - w / 2, y - h / 2, w, h, zr[0] + MG, zr[1] + MG, zr[2], zr[3]))) continue;
ctx.globalAlpha = a; if (far > 0.05) { ctx.lineWidth = 4; ctx.strokeStyle = `rgba(10,6,4,${(0.85 * far).toFixed(2)})`; ctx.strokeText(s, x, y); } ctx.fillText(s, x, y); titles.push([x - w / 2, y - h / 2, w, h]);
}
try { ctx.letterSpacing = '0px'; } catch (e) {}
}
const age = (now - born) / 1000;
for (const n of nodes) { const dx = still ? 0 : Math.sin(t * n.sp + n.ph) * 3; const dy = still ? 0 : Math.cos(t * n.sp * 0.8 + n.ph * 1.7) * 3; n.px = sx(n.x + dx); n.py = sy(n.y + dy); n.pr = n.r * k; n.vis = n.px > -n.pr - 80 && n.px < CW + n.pr + 80 && n.py > -n.pr - 40 && n.py < CH + n.pr + 40; n.in = still ? 1 : Math.max(0, Math.min(1, age * 1.6 - n.i * 0.012)); }
const seenE = (e) => e.a.vis || e.b.vis;
ctx.lineCap = 'round';
if (!f) {
const ag = Math.min(1, age) * (1 - 0.6 * far); const part = realms.some((r) => r.a < 0.995);
for (const r of part ? realms : [null]) {
const mine = (e) => !r || (e.a.realm.a <= e.b.realm.a ? e.a.realm : e.b.realm) === r; ctx.globalAlpha = ag * (r ? 0.22 + 0.78 * r.a : 1);
ctx.beginPath(); for (const e of withs) if (e.n > 1 && mine(e) && seenE(e)) curve(e); ctx.strokeStyle = 'rgba(243,231,215,.055)'; ctx.lineWidth = 1; ctx.stroke();
ctx.beginPath(); for (const e of named) if (mine(e) && seenE(e)) curve(e); ctx.strokeStyle = `rgba(${GOLD},.34)`; ctx.lineWidth = 1.1; ctx.stroke();
}
} else {
ctx.globalAlpha = 1; ctx.beginPath(); for (const e of named) if (e.a !== f && e.b !== f && seenE(e)) curve(e); ctx.strokeStyle = `rgba(${GOLD},.07)`; ctx.lineWidth = 1; ctx.stroke();
ctx.beginPath(); for (const e of withs) if (e.a === f || e.b === f) curve(e); ctx.strokeStyle = 'rgba(243,231,215,.2)'; ctx.lineWidth = 1; ctx.stroke();
ctx.beginPath(); for (const e of named) if (e.a === f || e.b === f) curve(e); ctx.strokeStyle = `rgba(${GOLD},.18)`; ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = `rgba(255,224,170,.95)`; ctx.lineWidth = 1.6; ctx.stroke();
if (!still) { ctx.fillStyle = '#fff3da'; let j = 0; for (const e of named) if (e.a === f || e.b === f) { let u = (t * 0.32 + j++ * 0.27) % 1; if (e.b === f) u = 1 - u; const p = curve(e, u); ctx.globalAlpha = Math.sin(Math.PI * (e.b === f ? 1 - u : u)) * 0.9; ctx.beginPath(); ctx.arc(p[0], p[1], 2.1, 0, TAU); ctx.fill(); } }
}
const lit = (n) => !f || n === f || f.near.has(n.id);
for (let pass = 0; pass < 2; pass++) for (const n of nodes) {
if (!n.vis || (pass === 0) === (f ? lit(n) : false)) continue;
const a = n.in * (lit(n) ? 1 : 0.16) * (f && lit(n) ? 1 : 0.3 + 0.7 * n.realm.a) * (1 - 0.5 * far); if (a <= 0.01) continue; const r = n.pr * (n === f ? 1.1 : 1);
if (n.tier === 'legend' || n === f) { ctx.globalAlpha = a * (n === f ? 1 : 0.8); const hr = r * (n === f ? 2.5 : 2.1); ctx.drawImage(halo, n.px - hr, n.py - hr, hr * 2, hr * 2); }
ctx.globalAlpha = a;
if (sheet) { const q = sheet.cellPx; const h = q / sheet.dpr * (k / sheet.kb) * (n === f ? 1.1 : 1) / 2; ctx.drawImage(sheet.c, (n.i % sheet.per) * q, Math.floor(n.i / sheet.per) * q, q, q, n.px - h, n.py - h, h * 2, h * 2); }
if (n === f) { ctx.beginPath(); ctx.arc(n.px, n.py, r - 0.5, 0, TAU); ctx.strokeStyle = n.light; ctx.lineWidth = 2; ctx.stroke(); }
if (n === f && kbd && document.activeElement === stage) { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(n.px, n.py, r + 5, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
}
if (labels) {
placed.length = 0; for (const t of titles) placed.push(t); if (zr) placed.push([zr[0] + MG, zr[1] + MG, zr[2], zr[3]]);
const order = f ? [f, ...nodes.filter((n) => n !== f && f.kin.has(n.id)), ...nodes.filter((n) => n !== f && !f.kin.has(n.id) && f.near.has(n.id))] : byRank;
for (const n of order) {
if (!n.vis || n.in < 0.5) continue; if (!f && n.tier === 'cast' && n.pr < 15.5) continue; if (!f && n.tier === 'lead' && n.pr < 14) continue;
const L = n.lab; const r = n.pr * (n === f ? 1.1 : 1); const lx = n.px - L.w / 2; const ly = n.py + r + 3;
const la = (f ? 1 : n.realm.a * (1 - far)) * edgeA(lx + 4, lx + L.w - 4) * clamp01((ly + 4 - MG - H * 0.05) / 8) * clamp01((MG + H * 0.95 - ly - L.h + 4) / 8); if (la < 0.05) continue;
const ty = ly + L.h / 2 - 7; let ok = true; for (const p of placed) if (hit(lx, ty, L.w, 14, p[0], p[1], p[2], p[3])) { ok = false; break; }
if (ok && n !== f) for (const m of nodes) if (m !== n && m.vis && (!f || lit(m)) && hit(lx + 6, ty + 1, L.w - 12, 12, m.px - m.pr * 0.8, m.py - m.pr * 0.8, m.pr * 1.6, m.pr * 1.6)) { ok = false; break; }
if (!ok) continue; placed.push([lx, ty, L.w, 14]);
ctx.globalAlpha = n.in * la * (f && n !== f && !f.kin.has(n.id) ? 0.7 : 1); ctx.drawImage(labels.c, L.x * labels.s, L.y * labels.s, L.w * labels.s, L.h * labels.s, lx, ly, L.w, L.h);
}
}
ctx.globalAlpha = 1;
};
let raf = 0; let last = 0; let busy = 0; let rebake = 0; let shown = true; let dirty = true; let since = 0; let slow = 0; let moved = ''; const vel = { x: 0, y: 0 };
const wake = () => { dirty = true; busy = performance.now() + 900; if (!raf && shown) raf = requestAnimationFrame(frame); };
const frame = (now) => {
raf = 0; const gap = now - last; const dt = Math.min(0.05, gap / 1000 || 0.016); last = now;
if (Math.abs(vel.x) + Math.abs(vel.y) > 2) { to.x -= vel.x * dt / cam.k; to.y -= vel.y * dt / cam.k; clampCam(to); const fr = Math.exp(-dt / 0.28); vel.x *= fr; vel.y *= fr; cam.x = to.x; cam.y = to.y; busy = now + 300; }
const a = ease ? 1 - Math.exp(-dt / ease) : 1; const dx = to.x - cam.x; const dy = to.y - cam.y; const dk = to.k - cam.k;
const moving = Math.abs(dx) * cam.k > 0.3 || Math.abs(dy) * cam.k > 0.3 || Math.abs(dk) > 0.0008;
if (moving) { cam.x += dx * a; cam.y += dy * a; cam.k += dk * a; busy = now + 300; }
else { cam.x = to.x; cam.y = to.y; cam.k = to.k; if (sheet && !pts.size && (Math.abs(cam.k / sheet.kb - 1) > 0.04 || sheet.dpr !== dpr) && !rebake) rebake = setTimeout(() => { rebake = 0; if (Math.abs(to.k / sheet.kb - 1) > 0.04 || sheet.dpr !== dpr) bake(); }, 160); }
for (const r of realms) { const tg = !fr || r === fr ? 1 : 0; if (r.a !== tg) { r.a = calm() || Math.abs(tg - r.a) < 0.01 ? tg : r.a + (tg - r.a) * Math.min(1, dt * 5); busy = now + 300; dirty = true; } }
if (fresh && !moving && !pts.size && Math.abs(vel.x) + Math.abs(vel.y) <= 2) { fresh = false; bake(); }
if (loose && !moving && !pts.size && Math.abs(vel.x) + Math.abs(vel.y) <= 2) { loose = false; if (!sel) tether(); }
const active = now < busy || now - born < 2600; const held = pts.size > 0;
if (!lazy && since === 0 && active && gap < 200) { slow = gap > 24 ? slow + 1 : Math.max(0, slow - 1); if (slow > 14) { lazy = true; size(true); } }
const s = cam.k / dc.k; const tx = (dc.x - cam.x) * cam.k; const ty = (dc.y - cam.y) * cam.k; const same = Math.abs(s - 1) < 0.0005 && Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05;
const edge = Math.abs(tx) > s * CW / 2 - W / 2 - 4 || Math.abs(ty) > s * CH / 2 - H / 2 - 4 || s > 1.3 || s < 0.8;
const every = !lazy ? (active ? 1 : 2) : held ? 1e9 : active && !same ? 5 : 6;
since++;
if (dirty && (!lazy || same || !held) || edge || since >= every) {
if (calm() && !dirty && same) { /* still: nothing to redraw */ } else { draw(now); const tr = MG ? `translate3d(${-MG}px,${-MG}px,0)` : ''; if (moved !== tr) cv.style.transform = moved = tr; }
dirty = false; since = 0;
} else if (!same) { const tr = `translate3d(${(tx - MG).toFixed(2)}px,${(ty - MG).toFixed(2)}px,0) scale(${s.toFixed(4)})`; if (tr !== moved) cv.style.transform = moved = tr; }
if (shown && (active || !calm())) raf = requestAnimationFrame(frame);
};
new IntersectionObserver((es) => { shown = es[0].isIntersecting && !document.hidden; if (shown) wake(); }).observe(sky);
document.addEventListener('visibilitychange', () => { shown = !document.hidden; if (shown) wake(); });
let first = true;
const size = (force) => {
const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
const d = Math.min(lazy ? 1.5 : 2, window.devicePixelRatio || 1); const w = r.width > r.height * 1.15;
if (!force && r.width === W && r.height === H && d === dpr) return;
W = r.width; H = r.height; dpr = d; MG = lazy ? 110 : 0; CW = W + MG * 2; CH = H + MG * 2;
cv.style.width = CW + 'px'; cv.style.height = CH + 'px'; cv.style.transform = moved = MG ? `translate3d(${-MG}px,${-MG}px,0)` : ''; cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
{ const z = zoomEl.getBoundingClientRect(); zr = z.width ? [z.left - r.left - 8, z.top - r.top - 8, z.width + 16, z.height + 16] : null; }
if (w !== wide) { wide = w; arrange(); kMin = fit(box, 28).k * 0.85; const h = sel ? { x: sel.x, y: sel.y, k: cam.k } : home(); Object.assign(to, clampCam(h)); Object.assign(cam, to); if (!sel) { pressRealm(realms[0].id); for (const q of realms) q.a = q === fr ? 1 : 0; } if (first && !calm()) { cam.k = to.k * 0.94; ease = 0.9; } }
else { kMin = fit(box, 28).k * 0.85; clampCam(to); }
if (first) { first = false; born = performance.now(); bake(); if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(makeLabels); else makeLabels(); } else if (force) bake();
wake();
};
new ResizeObserver(() => size(false)).observe(stage);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
let cardFor = null; let cardPeek = null;
let liftPx = 0; let liftF = 0; let liftT = 0;
const lift = () => {
let px = 0; const b = !card.hidden && document.querySelector('.cx-consent:not([hidden])');
if (b && getComputedStyle(b).visibility !== 'hidden') { const br = b.getBoundingClientRect(); const xr = boxEl.getBoundingClientRect(); const cr = card.getBoundingClientRect(); if (br.right > cr.left && br.left < cr.right && br.top < xr.bottom && br.bottom > xr.top) px = Math.round(Math.min(xr.height * 0.5, xr.bottom - br.top + 8)); }
if (px !== liftPx) { liftPx = px; sky.style.setProperty('--st-lift', px + 'px'); }
};
const barOn = () => { const b = document.querySelector('.cx-consent:not([hidden])'); return b && getComputedStyle(b).visibility !== 'hidden' ? b.getBoundingClientRect() : null; };
const reveal = () => {
const xr = boxEl.getBoundingClientRect(); const br = barOn(); const floor = (br && br.width > innerWidth * 0.6 ? br.top : innerHeight) - 8; const d = xr.bottom - floor;
const by = d > 1 ? Math.min(d, xr.top - 72) : xr.top < 72 ? xr.top - 72 : 0; if (Math.abs(by) > 1) window.scrollBy({ top: by, behavior: calm() ? 'instant' : 'smooth' });
};
const liftSoon = () => { if (card.hidden && !liftPx) return; if (!liftF) liftF = requestAnimationFrame(() => { liftF = 0; lift(); }); clearTimeout(liftT); liftT = setTimeout(lift, 480); };
addEventListener('scroll', liftSoon, { passive: true }); addEventListener('resize', liftSoon); document.addEventListener('click', liftSoon);
const showCard = (n, peek) => {
if (!n) { card.hidden = true; cardFor = null; return; }
if (cardFor === n && cardPeek === peek) return; cardFor = n; cardPeek = peek;
card.textContent = ''; card.classList.toggle('is-peek', peek); card.hidden = false; card.scrollTop = 0;
const top = el('div', 'st-card-top'); const pic = el('span', 'st-card-pic'); const face = n.el.querySelector('.st-face > *'); if (face) { const c = face.cloneNode(true); c.querySelector('img')?.removeAttribute('loading'); pic.append(c); }
if (n.id === 'vishvamitra' || n.id === 'shurpanakha') pic.style.filter = getComputedStyle(n.el.querySelector('.st-face img')).filter;
const h = el('h2', 'st-card-n', n.name); h.id = 'st-card-n'; const o = el('span', '', n.other); o.lang = hi ? 'en' : 'hi'; h.append(o);
top.append(pic, h, el('p', 'st-card-k', n.title)); card.append(top, el('p', 'st-card-l', n.line)); card.classList.remove('is-more');
card.setAttribute('aria-labelledby', 'st-card-n'); lift();
if (peek) return;
const more = el('div', 'st-card-more'); const open = el('a', 'st-card-open', fill(UI.open, { name: short(n) })); open.href = n.href; more.append(open);
const x = el('button', 'st-card-x', '×'); x.type = 'button'; x.setAttribute('aria-label', UI.close); x.addEventListener('click', () => { pick(null); stage.focus({ preventScroll: true }); });
if (n.ties.length || n.withs.length) {
more.append(el('h3', 'st-card-h', UI.ties)); const ul = el('ul', 'st-card-ties');
const row = (k, phrase, cls) => { const m = byId[k]; if (!m) return; const li = el('li', cls); const [pre, post] = phrase.split('{n}'); const b = el('button', '', short(m)); b.type = 'button'; b.addEventListener('click', () => { pick(m, { by: 'card' }); }); if (pre) li.append(pre); li.append(b); if (post) li.append(post); ul.append(li); };
for (const t of n.ties) row(t.k, t.ph, 'is-named');
for (const t of n.withs) if (!n.kin.has(t.k)) row(t.k, '{n} · ' + (t.n === 1 ? UI.with1 : fill(UI.withN, { n: t.n })), 'is-with');
more.append(ul);
}
card.append(x, more);
card.append(el('span', 'st-card-fade')); moreCheck();
};
const moreCheck = () => { card.classList.toggle('is-more', card.scrollHeight - card.clientHeight - card.scrollTop > 6); };
card.addEventListener('scroll', moreCheck, { passive: true }); addEventListener('resize', moreCheck);
const say = (s) => { live.textContent = ''; setTimeout(() => { live.textContent = s; }, 60); };
const pressRealm = (id) => { pressed = id; fr = realms.find((r) => r.id === id) || null; remember(); for (const b of sky.querySelectorAll('[data-st-go]')) b.setAttribute('aria-pressed', String(b.dataset.stGo === id)); wake(); };
const free = () => { if (pressed) pressRealm(''); };
const goRealm = (r) => { pick(null); go(r ? frameRealm(r) : fit(box, 28), 0.55); pressRealm(r ? r.id : 'all'); sky.classList.add('is-used'); reveal(); };
const realmAt = (cx, cy) => { const q = stage.getBoundingClientRect(); const x = (cx - q.left - W / 2) / cam.k + cam.x; const y = (cy - q.top - H / 2) / cam.k + cam.y; return realms.find((r) => Math.abs(x - r.cx) < r.hw + 30 && y > r.cy - r.hh - 70 && y < r.cy + r.hh + 30) || null; };
const remember = () => { try { const u = new URL(location.href); if (sel) u.searchParams.set('p', sel.id); else u.searchParams.delete('p'); if (pressed && pressed !== 'all') u.searchParams.set('r', pressed); else u.searchParams.delete('r'); history.replaceState(history.state, '', u); } catch (e) {} };
const pick = (n, { by = 'tap', travel = true } = {}) => {
sel = n; hover = null; sky.classList.add('is-used'); showCard(n, false); pressRealm(''); remember();
if (n) {
const narrow = W <= 700; const k = Math.max(Math.min(cam.k, 1.25), narrow ? 0.82 : 0.95);
if (travel) go({ x: n.x - (narrow ? 0 : Math.min(140, W * 0.1) / k), y: n.y + (narrow ? H * 0.25 / k : 0), k }, 0.42);
reveal();
say(`${n.name}. ${n.title ? n.title + '. ' : ''}${n.ties.map((t) => t.ph.replace('{n}', short(byId[t.k] || n))).join('; ')}`);
if (by === 'card' || by === 'find') card.querySelector('.st-card-open')?.focus({ preventScroll: true });
}
wake();
};
const at = (cx, cy, slop) => { const r = stage.getBoundingClientRect(); const x = (cx - r.left - W / 2) / cam.k + cam.x; const y = (cy - r.top - H / 2) / cam.k + cam.y; let best = null; let bd = 1e9; for (const n of nodes) { const d = Math.hypot(n.x - x, n.y - y); if (d < n.r + slop / cam.k && d < bd) { bd = d; best = n; } } return best; };
const zoomAt = (px, py, mul, t = 0.18) => { free(); loose = true; const k = Math.max(kMin, Math.min(K_MAX, to.k * mul)); const wx = (px - W / 2) / to.k + to.x; const wy = (py - H / 2) / to.k + to.y; go({ x: wx - (px - W / 2) / k, y: wy - (py - H / 2) / k, k }, t); };
const pts = new Map(); let drag = null; let pinch = 0;
stage.addEventListener('pointerdown', (e) => {
if (e.button) return; kbd = false; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { stage.setPointerCapture(e.pointerId); } catch (err) {}
vel.x = vel.y = 0; drag = { x: e.clientX, y: e.clientY, moved: false, t: performance.now(), touch: e.pointerType !== 'mouse' };
if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag.moved = true; }
});
stage.addEventListener('pointermove', (e) => {
const p = pts.get(e.pointerId);
if (!p) { if (e.pointerType === 'mouse') { const n = at(e.clientX, e.clientY, 4); if (n !== hover) { hover = n; stage.classList.toggle('is-over', !!n); if (!sel) showCard(n, true); wake(); } } return; }
const dx = e.clientX - p.x; const dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = stage.getBoundingClientRect(); if (pinch) { ease = 0; zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch, 0); to.x -= dx / 2 / to.k; to.y -= dy / 2 / to.k; Object.assign(cam, clampCam(to)); } pinch = d; sky.classList.add('is-used'); return; }
if (!drag) return;
if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < (drag.touch ? 8 : 4)) return;
if (!drag.moved) { drag.moved = true; stage.classList.add('is-drag'); sky.classList.add('is-used'); free(); if (hover) { hover = null; if (!sel) showCard(null); } }
const wy = to.y - dy / cam.k; to.x -= dx / cam.k; to.y = wy; clampCam(to); cam.x = to.x; cam.y = to.y;
if (drag.touch) { const over = (wy - to.y) * cam.k; if (Math.abs(over) > 0.5 && Math.abs(dy) > Math.abs(dx)) { window.scrollBy({ top: over, behavior: 'instant' }); drag.pass = performance.now(); } } const now = performance.now(); const dt = Math.max(8, now - drag.t) / 1000; drag.t = now; vel.x = vel.x * 0.6 + dx / dt * 0.25; vel.y = vel.y * 0.6 + dy / dt * 0.25; wake();
});
const up = (e) => {
if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); pinch = 0; stage.classList.remove('is-drag');
if (pts.size) { drag = { moved: true, t: performance.now() }; vel.x = vel.y = 0; return; }
const d = drag; drag = null; if (!d) return; loose = true;
if (!d.moved && e.type === 'pointerup') {
vel.x = vel.y = 0; const n = at(e.clientX, e.clientY, d.touch ? 12 : 4); const r = cam.k < 0.24 && (d.touch || !n) ? realmAt(e.clientX, e.clientY) : null;
if (r) goRealm(r); else if (n) pick(n); else if (sel) pick(null);
} else if (d.pass && performance.now() - d.pass < 90) { if (!calm() && Math.abs(vel.y) > 160) window.scrollBy({ top: -vel.y * 0.28, behavior: 'smooth' }); vel.x = vel.y = 0; }
else if (performance.now() - d.t > 90 || calm()) vel.x = vel.y = 0;
wake();
};
stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && hover) { hover = null; stage.classList.remove('is-over'); if (!sel) showCard(null); wake(); } });
stage.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.012), 0.1); sky.classList.add('is-used'); }, { passive: false });
stage.addEventListener('dblclick', (e) => { const r = stage.getBoundingClientRect(); if (!at(e.clientX, e.clientY, 4)) zoomAt(e.clientX - r.left, e.clientY - r.top, 1.5, 0.3); });
stage.addEventListener('keydown', (e) => {
const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
if (dir) {
e.preventDefault(); kbd = true; let cur = sel;
if (!cur) { let bd = 1e9; for (const n of nodes) { const d = Math.hypot(n.x - cam.x, n.y - cam.y) - n.r * 2; if (d < bd) { bd = d; cur = n; } } return pick(cur, { by: 'key' }); }
let best = null; let bs = 1e9; for (const n of nodes) { if (n === cur) continue; const dx = n.x - cur.x; const dy = n.y - cur.y; const along = dx * dir[0] + dy * dir[1]; if (along <= 0) continue; const side = Math.abs(dx * dir[1] - dy * dir[0]); const s = along + side * 2.2; if (side < along * 1.6 && s < bs) { bs = s; best = n; } }
if (best) pick(best, { by: 'key' });
} else if (e.key === 'Enter' || e.key === ' ') { if (sel) { e.preventDefault(); card.querySelector('.st-card-open')?.focus({ preventScroll: true }); } }
else if (e.key === 'Escape') { if (sel) { e.preventDefault(); pick(null); } }
else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(W / 2, H / 2, 1.35, 0.3); }
else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(W / 2, H / 2, 1 / 1.35, 0.3); }
else if (e.key === 'Home' || e.key === '0') { e.preventDefault(); pick(null); go(fit(box, 28), 0.5); pressRealm('all'); }
});
card.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); pick(null); stage.focus({ preventScroll: true }); } });
sky.addEventListener('click', (e) => {
const g = e.target.closest('[data-st-go]'); const z = e.target.closest('[data-st-zoom]');
if (g) goRealm(realms.find((x) => x.id === g.dataset.stGo));
if (z) { zoomAt(W / 2, H / 2, +z.dataset.stZoom > 0 ? 1.4 : 1 / 1.4, 0.3); sky.classList.add('is-used'); }
});
const form = sky.querySelector('[data-st-find]'); const q = form.querySelector('input');
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const find = () => { const s = norm(q.value); if (!s) return; const keys = (n) => [n.name, n.other, n.en].map(norm); const n = nodes.find((x) => keys(x).includes(s)) || nodes.find((x) => keys(x).some((v) => v.startsWith(s))) || nodes.find((x) => keys(x).some((v) => v.includes(s))); if (n) { pick(n, { by: 'find' }); q.value = ''; } else say(UI.none); };
form.addEventListener('submit', (e) => { e.preventDefault(); find(); });
q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } });
q.addEventListener('change', () => { const s = norm(q.value); if (nodes.some((n) => norm(n.name) === s)) find(); });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', wake);
try { const u = new URL(location.href); const pid = u.searchParams.get('p'), rid = u.searchParams.get('r'); if (pid && byId[pid]) pick(byId[pid], { by: 'link' }); else if (rid && realms.some((r) => r.id === rid)) goRealm(realms.find((r) => r.id === rid)); } catch (e) {}
})();
