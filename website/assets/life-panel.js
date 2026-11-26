(() => {
const d = document, R = d.documentElement, P = d.querySelector('[data-life-panel]'); if (!P || P.dataset.ready) return; P.dataset.ready = '1';
let S = {}; try { S = JSON.parse(P.dataset.s || '{}'); } catch (e) {}
const G = () => window.SpiritualGPU, L = () => window.SpiritualLife;
const css = d.createElement('style'); css.textContent = `
.fx-life { margin: .75rem 0 0; padding: .75rem .9rem; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: .75rem; }
.fx-life-h { margin: 0 0 .4rem; font-weight: 600; font-size: .9rem; }
.fx-live { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; }
.fx-live li { display: grid; gap: .1rem; font-size: .86rem; line-height: 1.4; }
.fx-live b { font-weight: 600; } .fx-live span { opacity: .85; }
.fx-live li::before { content: attr(data-state); font-size: .72rem; letter-spacing: .02em; opacity: .75; }
.fx-live li[data-on="1"]::before { opacity: 1; color: var(--ui-ring, #a8620a); }
.fx-life .fx-tools { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .65rem; }
.fx-life .fx-tools button { font: inherit; font-size: .88rem; min-height: 44px; padding: .45rem .9rem; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
.fx-life .fx-tools button[aria-pressed="true"] { background: color-mix(in srgb, currentColor 12%, transparent); }
.fx-life .fx-say { margin: .5rem 0 0; font-size: .84rem; line-height: 1.45; opacity: .9; }
.fx-life .fx-say:empty { display: none; }`;
d.head.appendChild(css);
P.innerHTML = '<p class="fx-life-h"></p><ul class="fx-live" aria-live="polite"></ul><p class="fx-say fx-why"></p><div class="fx-tools"><button type="button" data-life-pause aria-pressed="false"></button><button type="button" data-life-tilt aria-pressed="false" hidden></button></div><p class="fx-say fx-tool" role="status"></p>';
const $ = (s) => P.querySelector(s), ul = $('.fx-live'), why = $('.fx-why'), say = $('.fx-tool'), bp = $('[data-life-pause]'), bt = $('[data-life-tilt]');
$('.fx-life-h').textContent = S.head || '';
const paused = () => R.hasAttribute('data-fx-paused');
const calm = () => R.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const light = () => !!R.dataset.light || R.classList.contains('ep-lite');
const saveData = () => !!(navigator.connection && navigator.connection.saveData);
const phone = () => matchMedia('(pointer: coarse)').matches;
const live = () => {
const fx = R.dataset.fx || 'off', st = R.dataset.fxState, px = R.dataset.fxPhysx, stillAll = calm() || light() || saveData() || paused();
const lf = L(), mounted = lf && lf.packages ? lf.packages().map((p) => p.id) : [];
const rows = [
{ k: 'water', on: !stillAll && fx !== 'off' && st === 'live', name: S.water, eng: S.shader },
{ k: 'bodies', on: !stillAll && px === 'ready' && (fx === 'ultra' || fx === 'rich'), name: S.bodies, eng: S.physx },
{ k: 'chrome', on: mounted.includes('chrome'), name: S.chrome, eng: S.spring },
];
ul.replaceChildren(...rows.map((r) => { const li = d.createElement('li'); li.dataset.k = r.k; li.dataset.on = r.on ? '1' : '0'; li.dataset.state = r.on ? S.on : S.idle; const b = d.createElement('b'), s = d.createElement('span'); b.textContent = r.name; s.textContent = r.eng; li.append(b, s); return li; }));
const w = paused() ? S.wPaused : calm() ? S.wCalm : R.dataset.light ? S.wLight : saveData() ? S.wSave : (G() && G().saver) ? S.wBatt : fx === 'off' && (G() && G().get && G().get() === 'off') ? S.wOff : phone() ? S.wPhone : '';
why.textContent = w || '';
bp.textContent = paused() ? S.resume : S.pause; bp.setAttribute('aria-pressed', paused() ? 'true' : 'false');
};
const tilt = (m) => { const on = m && m.active(); bt.textContent = on ? S.tiltOff : S.tilt; bt.setAttribute('aria-pressed', on ? 'true' : 'false'); };
let orient = null;
if (phone() && typeof window.DeviceOrientationEvent !== 'undefined' && P.dataset.orient) {
bt.hidden = false; bt.textContent = S.tilt;
import(new URL(P.dataset.orient, d.baseURI).href).then((m) => { orient = m; tilt(m); }).catch(() => { bt.hidden = true; });
}
bp.addEventListener('click', () => { const g = G(); if (g && g.pause) g.pause(!paused()); live(); say.textContent = paused() ? S.pauseNote : ''; });
bt.addEventListener('click', async () => {
if (!orient) return; say.textContent = '';
if (orient.active()) { orient.disable(); tilt(orient); return; }
const r = await orient.enable(); tilt(orient);
say.textContent = r === 'on' ? S.tiltOn : r === 'denied' ? S.tiltDenied : S.tiltNo;
});
const mo = new MutationObserver(live); mo.observe(R, { attributes: true, attributeFilter: ['data-fx', 'data-fx-state', 'data-fx-physx', 'data-life-state', 'data-fx-paused', 'data-motion', 'data-light', 'class'] });
const dl = P.closest('dialog'); if (dl) new MutationObserver(() => { if (dl.open) live(); }).observe(dl, { attributes: true, attributeFilter: ['open'] });
d.addEventListener('change', (e) => { if (e.target && e.target.name === 'fx') setTimeout(live, 400); }, true);
P.hidden = false; live();
})();
