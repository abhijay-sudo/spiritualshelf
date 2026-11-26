export default function mount(ctx) {
const d = document, root = d.documentElement;
const sel = d.querySelector('main.cx-home .cx-select[data-select]');
const grid = sel && sel.querySelector('[data-sel-grid]');
if (!sel || !grid) return null;
const { budget, layout, signal } = ctx;
const hSel = layout.track(sel), hGrid = layout.track(grid);
const sc = () => { try { return ctx.bus.state.sy; } catch (e) { return 0; } };
const rects = () => {
const a = hSel.rect(), b = hGrid.rect(); if (!a || !b) return null;
const dy = sc() - scrollY;   // (the cache is shifted by the bus's last scroll reading: correct it to the live scroll, which costs no layout)
const fix = (r) => ({ left: r.left, top: r.top + dy, width: r.w, height: r.h });
return { sel: fix(a), grid: fix(b) };
};
const drop = new Set(); let swaps = 0;
const publish = () => { const v = ['tilt', 'lean', 'dolly'].filter((k) => drop.has(k)).join(' '); if (v) root.dataset.lsDrop = v; else delete root.dataset.lsDrop; };
const eff = (name, priority, label) => budget.register({ id: 'select-' + name, label: label || 'spring/ODE', cost: 'css', priority, drop() { drop.add(name); publish(); }, restore() { drop.delete(name); publish(); } });
const hTilt = eff('tilt', 3), hLean = eff('lean', 4), hDolly = eff('dolly', 5);
const mo = new MutationObserver(() => { swaps++; try { budget.mark('swap'); } catch (e) { /* an older budget */ } });
mo.observe(sel, { attributes: true, attributeFilter: ['class'] });
const api = { rects, stats: () => ({ swaps, drop: Array.from(drop), effects: [hTilt.id, hLean.id, hDolly.id] }) };
window.LifeSelect = api;
signal.addEventListener('abort', () => { mo.disconnect(); });
return {
dispose() {
if (window.LifeSelect === api) delete window.LifeSelect;
mo.disconnect(); hSel.dispose(); hGrid.dispose(); drop.clear(); delete root.dataset.lsDrop;
},
};
}
