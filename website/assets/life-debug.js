export function mountDebug({ life, budget, physics, state }) {
const host = document.createElement('div'), root = host.attachShadow({ mode: 'open' }), el = document.createElement('pre');
host.setAttribute('aria-hidden', 'true'); host.setAttribute('data-life-debug', ''); host.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483000;pointer-events:none;contain:layout style paint';
el.style.cssText = 'margin:0;max-width:min(76ch,calc(100vw - 16px));font:11px/1.35 ui-monospace,Menlo,monospace;color:#f3e7cf;background:rgba(20,14,8,.78);padding:6px 8px;border-radius:4px;white-space:pre-wrap;overflow-wrap:anywhere';
root.appendChild(el); document.body.appendChild(host);
const paint = () => {
const s = budget.stats(), f = s.frames, lt = s.longTasks, w = s.worker, P = physics ? physics.info() : null, L = [];
L.push(`LIFE ${state.tier} | ${state.mounted.length} package${state.mounted.length === 1 ? '' : 's'}${state.failed.length ? ' | ' + state.failed.length + ' failed' : ''}`);
L.push(`frames p50 ${f.p50} p95 ${f.p95} max ${f.max} ms (${f.fps} fps, n ${f.n})`);
L.push(`long tasks ${lt.supported ? lt.total : 'n/a'} (sweep ${lt.sweep}, swap ${lt.swap}, >100 ms ${lt.over100}, max ${lt.maxMs} ms)`);
if (P) L.push(`PhysX world: ${P.ready ? 'up' : P.dead ? 'DOWN' : 'starting'} | ${w ? w.bodies : 0} bodies, ${w ? w.awake : 0} awake | step ${w ? w.stepMs : 0} ms (p95 ${w ? w.p95 : 0}) | idle steps ${w ? w.idleSteps : 0} | refused ${P.rejected}`);
L.push('effects (cost class, label, priority, ms)');
for (const e of s.effects) L.push(` ${e.dropped ? 'x' : '-'} ${e.owner} [${e.cost}] ${e.label} p${e.priority} ${e.ms == null ? 'compositor' : e.ms + ' ms'}${e.bodies ? ' ' + e.bodies + ' bodies' : ''}`);
if (!s.effects.length) L.push(' (none registered)');
if (P && P.stats) { L.push('groups (bodies/cap, awake, attributed ms and its p95)'); for (const g of P.stats.groups) L.push(` ${g.id} ${g.count}/${g.cap} awake ${g.awake} ${g.ms} ms (p95 ${g.p95 == null ? '-' : g.p95})${g.throttled ? ' THROTTLED' : ''}`); }
L.push(`governor: slow windows ${s.governor.slowWins}, calm ${s.governor.goodS}s, dropped [${s.governor.dropped.join(', ')}]`);
const lg = s.governor.log; if (lg.length) L.push(' last: ' + lg[lg.length - 1].what + ' (' + lg[lg.length - 1].why + ')');
el.textContent = L.join('\n');
};
paint(); const iv = setInterval(paint, 250);
return { dispose() { clearInterval(iv); host.remove(); } };
}
