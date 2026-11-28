const PRESS = '.cx-btn, .ed-btn, .btn, .save, .chip, .ed-menu-btn, .ed-icon, .cx-round, .dial-fab, .cx-sound, .ed-lang, .ed-saved, .ed-nav-btn, .link-btn, .chip-link, .card, .cx-poster, .cx-sel-tile';
export function mount(ctx) {
const d = document, R = d.documentElement, off = [];
const on = (t, e, f, o) => { t.addEventListener(e, f, o); off.push(() => t.removeEventListener(e, f, o)); };
if (!d.querySelector('[data-reader]') && CSS.supports && CSS.supports('animation-timeline: scroll()')) {
const bar = d.createElement('div'); bar.className = 'life-progress'; bar.setAttribute('aria-hidden', 'true'); bar.hidden = true; d.body.appendChild(bar);
const fit = () => { bar.hidden = (R.scrollHeight || 0) < innerHeight * 1.6; };
fit(); let ro = null; try { ro = new ResizeObserver(fit); ro.observe(d.body); } catch (e) {}
on(window, 'resize', fit, { passive: true });
ctx.dispose(() => { if (ro) ro.disconnect(); bar.remove(); });
}
const pool = []; let at = 0;
const ease = () => { const v = getComputedStyle(R).getPropertyValue('--life-ease-settle').trim(); return v || 'cubic-bezier(.16, 1, .3, 1)'; };
const ring = () => { if (pool.length < 3) { const el = d.createElement('div'); el.className = 'life-ripple'; el.setAttribute('aria-hidden', 'true'); d.body.appendChild(el); pool.push(el); } return pool[at++ % pool.length]; };
on(d, 'pointerdown', (e) => {
if (e.pointerType === 'mouse' || !e.isPrimary || e.button > 0) return;
const t = e.target; if (!t || !t.closest || !t.closest(PRESS) || t.closest('dialog, input, textarea, select')) return;
const el = ring(); el.style.translate = e.clientX + 'px ' + e.clientY + 'px';
try { el.getAnimations().forEach((a) => a.cancel()); el.animate([{ transform: 'scale(.25)', opacity: .9 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 520, easing: ease(), fill: 'none' }); } catch (x) {}
}, { passive: true, capture: true });
ctx.dispose(() => { for (const el of pool) { try { el.getAnimations().forEach((a) => a.cancel()); } catch (x) {} el.remove(); } });
try { if (sessionStorage.getItem('spritual:tilt') === '1' && ctx.core && ctx.core.orient) import(new URL(ctx.core.orient, d.baseURI).href).then((m) => { if (!ctx.signal.aborted) { m.restore(); ctx.dispose(() => m.stop()); } }).catch(() => {}); } catch (e) {}
return { dispose() { for (const f of off.splice(0)) f(); } };
}
export default mount;
