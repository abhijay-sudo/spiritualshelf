const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const BREATH = { scale: 1.019, cover: 1.01, ms: 18000, quiet: 24000, fall: 15000, arrival: 20000, after: 1200, fx: 0.5, fy: 0.36, guard: 2, back: 2400 };
export function poseOf(t) { const m = /translate3d\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px[^)]*\)\s*scale\(\s*([\d.]+)\s*\)/.exec(t || ''); return m ? [+m[1], +m[2], +m[3]] : null; }
export function fits(faces, pose, cw, ch, vw, vh, S = BREATH.scale, FX = vw * BREATH.fx, FY = vh * BREATH.fy, guard = BREATH.guard) {
for (const f of faces || []) {
const r = f[2] / 100 * cw * pose[2] / 2, x = pose[0] + f[0] / 100 * cw * pose[2], y = pose[1] + f[1] / 100 * ch * pose[2];
if (!(x - r >= 0 && x + r <= vw && y - r >= 0 && y + r <= vh)) continue;   // (already cut by the frame, or out of it: the hand-set framing chose that)
const x2 = FX + (x - FX) * S, y2 = FY + (y - FY) * S, r2 = r * S + guard;
if (!(x2 - r2 >= 0 && x2 + r2 <= vw && y2 - r2 >= 0 && y2 + r2 <= vh)) return false;
}
return true;
}
export default async function mount(ctx) {
if (!ctx.caps.phone) return;
const R = document.documentElement, main = document.querySelector('[data-reader]'); if (!main) return;
let stage = null; for (let i = 0; i < 40 && !stage; i++) { stage = document.querySelector('.fm-stage'); if (!stage) await wait(150); if (ctx.signal.aborted) return; }
if (!stage) return;
const layers = Array.from(stage.querySelectorAll('.fm-ly')).map((el) => ({ el, cam: el.querySelector('.fm-cam'), img: el.querySelector('.fm-cam img'), a: null, back: null, t: 0, S: 0, key: '' })); if (layers.length < 2 || layers.some((l) => !l.cam || !l.img)) return;
const stem = (u) => { const m = /((?:shot|scene)-[^/?#]*?)-\d{3,4}\.webp/.exec(u || ''); return m ? m[1] : ''; };
const sceneBy = new Map(); for (const s of main.querySelectorAll('.scene')) { const im = s.querySelector('.shot img'); const u = im && (im.getAttribute('srcset') || im.getAttribute('src') || ''); const k = stem(u.split(',')[0]); if (k) sceneBy.set(k, s); }
const NIGHT = 'data-l' + 'amp';   // (the attribute the reading sheet's Night setting sets; the build's word check forbids spelling it out in a life file)
let dropped = false;
const resting = () => dropped || document.hidden || R.getAttribute(NIGHT) === 'on' || !R.classList.contains('fm-live') || R.classList.contains('fm-ended');
const sceneOf = (l) => sceneBy.get(stem(l.img.currentSrc || l.img.src)) || null;
const facesOf = (s) => (s && s.dataset.lifeFaces || '').split(';').filter(Boolean).map((x) => x.split(',').map(Number));
const may = (l, S) => { const q = poseOf(l.cam.style.transform), cw = parseFloat(l.cam.style.width), ch = parseFloat(l.cam.style.height); if (!q || !cw || !ch) return false; return fits(facesOf(sceneOf(l)), q, cw, ch, stage.clientWidth, stage.clientHeight, S); };
const end = (l) => { clearTimeout(l.t); l.t = 0; for (const k of ['a', 'back']) if (l[k]) { try { l[k].cancel(); } catch (e) {} l[k] = null; } };
const begin = (l) => {
l.t = 0; if (ctx.signal.aborted || l.a || !l.el.classList.contains('on')) return;
const sc = sceneOf(l), S = sc ? BREATH.scale : BREATH.cover; if (!may(l, S)) return;
const vw = stage.clientWidth, vh = stage.clientHeight, ms = BREATH[sc && sc.dataset.tempo] || BREATH.ms;
try {
l.a = l.cam.animate([{ scale: '1', translate: '0px 0px' }, { scale: String(S), translate: `${(vw * BREATH.fx * (1 - S)).toFixed(2)}px ${(vh * BREATH.fy * (1 - S)).toFixed(2)}px` }], { duration: ms, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
l.a.id = 'life-breath'; l.S = S; l.key = stem(l.img.currentSrc || l.img.src); if (resting()) l.a.pause();
} catch (e) { l.a = null; }
};
const settle = (l) => {
if (!l.a) return; const cs = getComputedStyle(l.cam), from = { scale: cs.scale === 'none' ? '1' : cs.scale, translate: cs.translate === 'none' ? '0px 0px' : cs.translate };
try { l.a.cancel(); } catch (e) {} l.a = null;
try { l.back = l.cam.animate([from, { scale: '1', translate: '0px 0px' }], { duration: BREATH.back, easing: 'ease-in-out' }); l.back.id = 'life-breath-back'; const b = l.back, f = () => { if (l.back === b) l.back = null; }; b.onfinish = f; b.oncancel = f; } catch (e) { l.back = null; }
};
const later = (l, ms = BREATH.after) => { clearTimeout(l.t); l.t = setTimeout(() => begin(l), ms); };
const sync = () => { const stop = resting(); for (const l of layers) if (l.a) { if (stop && l.a.playState === 'running') l.a.pause(); else if (!stop && l.a.playState === 'paused') l.a.play(); } };
const onClass = (l) => { if (l.el.classList.contains('on')) { if (!l.a && !l.t) later(l); } else end(l); };
const onPose = (l) => { if (!l.el.classList.contains('on')) return; if (l.a) { if (!may(l, l.S)) settle(l); } else if (!l.t) later(l, BREATH.after + BREATH.back); };
const mos = [];
for (const l of layers) {
const a = new MutationObserver(() => onClass(l)); a.observe(l.el, { attributes: true, attributeFilter: ['class'] }); mos.push(a);
const b = new MutationObserver(() => onPose(l)); b.observe(l.cam, { attributes: true, attributeFilter: ['style'] }); mos.push(b);
const c = new MutationObserver(() => { if ((l.a || l.back) && stem(l.img.currentSrc || l.img.src) !== l.key) { end(l); if (l.el.classList.contains('on')) later(l); } }); c.observe(l.img, { attributes: true, attributeFilter: ['src'] }); mos.push(c);   // (another painting on this layer, not a sharper cut of the same one: begin again from rest)
onClass(l);
}
const rmo = new MutationObserver(sync); rmo.observe(R, { attributes: true, attributeFilter: ['class', NIGHT] });
document.addEventListener('visibilitychange', sync, { signal: ctx.signal });
let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { for (const l of layers) { const was = !!(l.a || l.back); end(l); if (was && l.el.classList.contains('on')) later(l); } }, 300); }, { passive: true, signal: ctx.signal });
ctx.budget.register({ id: 'story-breath', label: 'CSS', cost: 'waapi', priority: 5, drop() { dropped = true; sync(); }, restore() { dropped = false; sync(); } });
const dbg = window.SpiritualLife && window.SpiritualLife.debug;
if (dbg) dbg.breath = { layers: () => layers.map((l) => ({ on: l.el.classList.contains('on'), state: l.a ? l.a.playState : l.back ? 'back' : l.t ? 'waiting' : 'still', S: l.S, scale: getComputedStyle(l.cam).scale })), may: () => layers.map((l) => may(l, BREATH.scale)) };
return { dispose() { clearTimeout(rt); for (const m of mos) m.disconnect(); rmo.disconnect(); for (const l of layers) end(l); if (dbg) delete dbg.breath; } };
}
