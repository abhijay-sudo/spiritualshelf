const K = 'spritual:tilt';
let on = false, fx = 0, fy = 0, tx = 0, ty = 0, seen = 0, lastAt = 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const targets = () => { const d = document; return [[d.querySelector('.cx-home .cx-open'), '--ox', '--oy'], [d.querySelector('[data-select]'), '--px', '--py']].filter((t) => t[0]); };
const angle = () => { try { return (screen.orientation && screen.orientation.angle) || window.orientation || 0; } catch (e) { return 0; } };
function onEvent(e) {
if (e.gamma == null || e.beta == null) return; seen++;
let g = e.gamma, b = e.beta - 55; const a = ((angle() % 360) + 360) % 360;   // 55 degrees: a phone held to read, not lying flat
if (a === 90) { [g, b] = [-b, g]; } else if (a === 270) { [g, b] = [b, -g]; } else if (a === 180) { g = -g; b = -b; }
tx = clamp(g / 32, -1, 1) * 0.5; ty = clamp(b / 32, -1, 1) * 0.5;
fx += (tx - fx) * 0.14; fy += (ty - fy) * 0.14;   // the low-pass: a hand's tremor does not reach the painting
const n = performance.now(); if (n - lastAt < 30) return; lastAt = n;   // 30 Hz is plenty for a slow lean
for (const [el, ax, ay] of targets()) { el.style.setProperty(ax, fx.toFixed(3)); el.style.setProperty(ay, fy.toFixed(3)); }
}
const vis = () => { if (document.hidden) removeEventListener('deviceorientation', onEvent); else if (on) addEventListener('deviceorientation', onEvent, { passive: true }); };
function begin() { if (on) return; on = true; fx = fy = tx = ty = 0; addEventListener('deviceorientation', onEvent, { passive: true }); document.addEventListener('visibilitychange', vis); }
export function stop() {
if (!on) return; on = false; removeEventListener('deviceorientation', onEvent); document.removeEventListener('visibilitychange', vis);
for (const [el, ax, ay] of targets()) { el.style.removeProperty(ax); el.style.removeProperty(ay); }
}
export const supported = () => typeof window.DeviceOrientationEvent !== 'undefined' && matchMedia('(pointer: coarse)').matches;
export const active = () => on;
const hears = (ms) => new Promise((res) => { seen = 0; const f = (e) => { if (e.gamma != null && e.beta != null) { removeEventListener('deviceorientation', f); res(true); } }; addEventListener('deviceorientation', f); setTimeout(() => { removeEventListener('deviceorientation', f); res(false); }, ms); });
export async function enable() {
const D = window.DeviceOrientationEvent; if (!supported()) return 'unsupported';
if (typeof D.requestPermission === 'function') { let r = 'denied'; try { r = await D.requestPermission(); } catch (e) { r = 'denied'; } if (r !== 'granted') return 'denied'; }
if (!(await hears(1600))) return 'unsupported';
try { sessionStorage.setItem(K, '1'); } catch (e) {} begin(); return 'on';
}
export function disable() { try { sessionStorage.removeItem(K); } catch (e) {} stop(); }
export async function restore() { try { if (sessionStorage.getItem(K) !== '1' || !supported()) return false; } catch (e) { return false; } if (!(await hears(1600))) return false; begin(); return true; }
