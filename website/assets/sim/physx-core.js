(() => {
const root = typeof self !== 'undefined' ? self : window;
if (root.SpiritualPhysX) return;
const FIXED = 1 / 60, MAXSTEPS = 3, MAXACC = 0.05, G = 9.81, RHO = 1000, ENVW = 5;
const KIND = { petal: 0, stone: 1 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const DEF = {
maxBodies: 24, groundY: -0.6, sinkY: -0.5,
bounds: { x: 8, zNear: 2.2, zFar: 40 },                 // the lake's walls, metres: invisible, soft, just outside the picture
sun: { x: 0, z: 18, hw: 0.9, hd: 14, top: 1.5 },        // the sun's reflection column (a trigger volume, no collision)
petal: { hx: 0.08, hy: 0.005, hz: 0.035, density: 300, life: 35 },
stone: { r: 0.04, density: 2600, life: 14 },
paddleR: 0.25, drift: 0.04,                              // drift: how much of the wind's speed the surface carries a floating body at
};
const merge = (a, b) => { const o = Object.assign({}, a); for (const k in b || {}) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] ? merge(a[k], b[k]) : b[k]; return o; };
const b64 = (hex) => { let s = ''; for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16)); return btoa(s); };
const decode = (v) => `${(v >>> 24) & 255}.${(v >>> 16) & 255}.${(v >>> 8) & 255}`;
async function create(cfg0) {
const cfg = merge(DEF, cfg0 || {});
const t0 = performance.now();
const init = { cache: 'default' }; if (cfg.wasmSha256) init.integrity = 'sha256-' + b64(cfg.wasmSha256);
const res = await fetch(cfg.wasm, init);
if (!res.ok) throw Object.assign(new Error('wasm http ' + res.status), { stage: 'fetch' });
const wasmBinary = await res.arrayBuffer();
if (cfg.wasmBytes && wasmBinary.byteLength !== cfg.wasmBytes) throw Object.assign(new Error('wasm size ' + wasmBinary.byteLength), { stage: 'integrity' });
const mod = await import(cfg.glue);
const P = await mod.default({ wasmBinary, locateFile: () => cfg.wasm });
const instantiateMs = performance.now() - t0;
const E = (en, k) => { const o = P[en]; if (o && k in o) return o[k]; const f = P['_emscripten_enum_' + en + '_' + k]; if (f) return f(); throw new Error('enum ' + en + '.' + k); };
const versionRaw = P.PHYSICS_VERSION, version = decode(versionRaw);
const heapBytes = () => (P.HEAPU8 ? P.HEAPU8.length : P.wasmMemory ? P.wasmMemory.buffer.byteLength : 0);
const allocator = new P.PxDefaultAllocator(), errCb = new P.PxDefaultErrorCallback();
const foundation = P.CreateFoundation(versionRaw, allocator, errCb);
const tol = new P.PxTolerancesScale(), physics = P.CreatePhysics(versionRaw, foundation, tol);
const dispatcher = P.DefaultCpuDispatcherCreate(0);   // zero worker threads: PhysX runs on this one thread
const arr = P.NativeArrayHelpers.prototype;   // (its functions are static)
const tmpV = new P.PxVec3(0, 0, 0), tmpV2 = new P.PxVec3(0, 0, 0), tmpT = new P.PxTransform(P.PxIDENTITYEnum ? E('PxIDENTITYEnum', 'PxIdentity') : undefined);
const mats = { petal: physics.createMaterial(0.3, 0.2, 0.15), stone: physics.createMaterial(0.5, 0.4, 0.2), wall: physics.createMaterial(0.1, 0.1, 0.25), ground: physics.createMaterial(0.6, 0.5, 0.0) };
const geoms = { petal: new P.PxBoxGeometry(cfg.petal.hx, cfg.petal.hy, cfg.petal.hz), stone: new P.PxSphereGeometry(cfg.stone.r), paddle: new P.PxSphereGeometry(cfg.paddleR) };
const FE = E('PxForceModeEnum', 'eFORCE');
const trigFound = E('PxPairFlagEnum', 'eNOTIFY_TOUCH_FOUND'), trigLost = E('PxPairFlagEnum', 'eNOTIFY_TOUCH_LOST');
const sceneFlagCCD = E('PxSceneFlagEnum', 'eENABLE_CCD'), bodyFlagCCD = E('PxRigidBodyFlagEnum', 'eENABLE_CCD');
const shapeFlag = (n) => E('PxShapeFlagEnum', n);
const slots = new Array(cfg.maxBodies).fill(null);   // { actor, ptr, kind, born, ttl, hy, r, mass, vol, armed, inSun, lastGlint, bounces, coolUntil, sunk }
const byPtr = new Map(), events = [];
let simT = 0, acc = 0, steps = 0, live = 0, paddle = null, paddleOn = false, disposed = false, sceneObj = null, cb = null, cbShapeNames = null;
const ring = new Float32Array(240); let ri = 0, rn = 0, stepLast = 0;
const makeScene = (withEvents) => {
const sd = new P.PxSceneDesc(tol);
sd.gravity = new P.PxVec3(0, -G, 0); sd.cpuDispatcher = dispatcher; if (!withEvents) sd.filterShader = P.DefaultFilterShader();
let callback = null, fsImpl = null;
if (withEvents) {
const PF = (k) => E('PxPairFlagEnum', k), TRIG = PF('eTRIGGER_DEFAULT'), SOLID = PF('eSOLVE_CONTACT') | PF('eDETECT_DISCRETE_CONTACT') | PF('eDETECT_CCD_CONTACT');
fsImpl = new P.PassThroughFilterShaderImpl(); const ps = P.wrapPointer(fsImpl.ptr, P.PassThroughFilterShader);
fsImpl.filterShader = (a0, a1, a2, a3, a4, b0) => { ps.outputPairFlags = ((a0 | b0) & 32) ? TRIG : SOLID; return 0; };
P.setupPassThroughFilterShader(sd, ps);
callback = new P.PxSimulationEventCallbackImpl();
callback.onTrigger = (pairs, count) => {
for (let i = 0; i < count; i++) {
const p = arr.getTriggerPairAt(pairs, i), s = byPtr.get(p.otherActor.ptr); if (s === undefined) continue;
const o = slots[s]; if (!o) continue;
if (p.status === trigFound) { o.inSun = true; if (simT - o.lastGlint > 0.5) { o.lastGlint = simT; events.push({ e: 'glint', slot: s }); } }
else if (p.status === trigLost) o.inSun = false;
}
};
callback.onContact = () => {}; callback.onConstraintBreak = () => {}; callback.onWake = () => {}; callback.onSleep = () => {};
sd.simulationEventCallback = callback;
}
const scene = physics.createScene(sd);
scene.setFlag(sceneFlagCCD, true);   // (CCD is switched on per body, and only for the stone)
return { scene, sd, callback, fsImpl };
};
const killScene = (S) => { S.scene.release(); if (S.callback) P.destroy(S.callback); if (S.fsImpl) P.destroy(S.fsImpl); P.destroy(S.sd); };
const pose = (x, y, z, qx = 0, qy = 0, qz = 0, qw = 1) => { const p = tmpT.p, q = tmpT.q; p.x = x; p.y = y; p.z = z; q.x = qx; q.y = qy; q.z = qz; q.w = qw; return tmpT; };
const statics = [];
const addStaticBox = (S, x, y, z, hx, hy, hz, mat) => { const g = new P.PxBoxGeometry(hx, hy, hz), a = P.CreateStatic(physics, pose(x, y, z), g, mat, new P.PxTransform(E('PxIDENTITYEnum', 'PxIdentity'))); S.scene.addActor(a); statics.push(a); P.destroy(g); return a; };
sceneObj = makeScene(true);
const scene = sceneObj.scene;
{
const pl = new P.PxPlane(0, 1, 0, -cfg.groundY), ground = P.CreatePlane(physics, pl, mats.ground); scene.addActor(ground); statics.push(ground); P.destroy(pl);
const b = cfg.bounds, zc = (b.zNear + b.zFar) / 2, hz = (b.zFar - b.zNear) / 2;
addStaticBox(sceneObj, -b.x - 0.5, 0.5, zc, 0.5, 1.5, hz, mats.wall); addStaticBox(sceneObj, b.x + 0.5, 0.5, zc, 0.5, 1.5, hz, mats.wall);
addStaticBox(sceneObj, 0, 0.5, b.zFar + 0.5, b.x + 1, 1.5, 0.5, mats.wall); addStaticBox(sceneObj, 0, 0.5, b.zNear - 0.5, b.x + 1, 1.5, 0.5, mats.wall);
const su = cfg.sun, g = new P.PxBoxGeometry(su.hw, (su.top + 0.4) / 2, su.hd);
const fl = new P.PxShapeFlags(shapeFlag('eTRIGGER_SHAPE')), sh = physics.createShape(g, mats.wall, true, fl);
const a = physics.createRigidStatic(pose(su.x, (su.top - 0.4) / 2, su.z)); a.attachShape(sh); scene.addActor(a); statics.push(a, sh); P.destroy(g); P.destroy(fl);
}
const kinds = { petal: () => ({ g: geoms.petal, m: mats.petal, d: cfg.petal.density, hy: cfg.petal.hy, r: 0, ttl: cfg.petal.life }), stone: () => ({ g: geoms.stone, m: mats.stone, d: cfg.stone.density, hy: cfg.stone.r, r: cfg.stone.r, ttl: cfg.stone.life }) };
const quatFromYawTilt = (yaw, tx, tz) => {   // q = yaw about y, then a small tilt about x, then about z
const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), cx = Math.cos(tx / 2), sx = Math.sin(tx / 2), cz = Math.cos(tz / 2), sz = Math.sin(tz / 2);
const rw = cx * cz, rx = sx * cz, ry = -sx * sz, rz = cx * sz;
return [cy * rx + sy * rz, cy * ry + sy * rw, cy * rz - sy * rx, cy * rw - sy * ry];
};
const spawn = (kind, c) => {
const i = c.slot | 0; if (i < 0 || i >= cfg.maxBodies) return;
if (slots[i]) drop(i, false);
const k = kinds[kind](); const q = quatFromYawTilt(c.yaw || 0, c.tilt || 0, (c.tilt || 0) * 0.6);
const a = P.CreateDynamic(physics, pose(c.x, c.y, c.z, q[0], q[1], q[2], q[3]), k.g, k.m, k.d);
a.setLinearDamping(0.02); a.setAngularDamping(kind === 'stone' ? 0.3 : 0.6); a.setSleepThreshold(0);   // forces keep it alive: it never sleeps
a.setMaxLinearVelocity(40); a.setMaxAngularVelocity(30);
if (kind === 'stone') a.setRigidBodyFlag(bodyFlagCCD, true);
tmpV.x = c.vx || 0; tmpV.y = c.vy || 0; tmpV.z = c.vz || 0; a.setLinearVelocity(tmpV, true);
tmpV2.x = c.sx || 0; tmpV2.y = c.sy || 0; tmpV2.z = c.sz || 0; a.setAngularVelocity(tmpV2, true);
scene.addActor(a);
const mass = a.getMass(), it = a.getMassSpaceInertiaTensor(), vol = kind === 'stone' ? (4 / 3) * Math.PI * k.r ** 3 : 8 * cfg.petal.hx * cfg.petal.hy * cfg.petal.hz;
slots[i] = { actor: a, ptr: a.ptr, kind, born: simT, ttl: c.ttl || k.ttl, hy: k.hy, r: k.r, mass, vol, I: (it.x + it.z) / 2, Iy: it.y, seed: c.seed || 0, armed: true, inSun: false, lastGlint: -9, bounces: 0, coolUntil: 0, sunk: false };
byPtr.set(a.ptr, i); live++;
};
const drop = (i, announce) => {
const o = slots[i]; if (!o) return;
byPtr.delete(o.ptr); scene.removeActor(o.actor); o.actor.release(); slots[i] = null; live--;
if (announce) events.push({ e: 'gone', slot: i });
};
const setPaddle = (m) => {
if (m.on && !paddle) { paddle = P.CreateKinematic(physics, pose(m.x, 0.05, m.z), geoms.paddle, mats.stone, 1); scene.addActor(paddle); paddleOn = true; }
else if (!m.on && paddle) { scene.removeActor(paddle); paddle.release(); paddle = null; paddleOn = false; }
if (paddle && m.on) { paddle.setKinematicTarget(pose(m.x, 0.05, m.z)); }
};
const forces = (env, dt) => {
for (let i = 0; i < slots.length; i++) {
const o = slots[i]; if (!o) continue;
const a = o.actor, T = a.getGlobalPose(), p = T.p, q = T.q;
const x = p.x, y = p.y, z = p.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
const lv = a.getLinearVelocity(), vx = lv.x, vy = lv.y, vz = lv.z;
const av = a.getAngularVelocity(), wx = av.x, wy = av.y, wz = av.z;
const e = i * ENVW, h = env ? env[e] : 0, sx = env ? env[e + 1] : 0, sz = env ? env[e + 2] : 0, ux = env ? env[e + 3] : 0, uz = env ? env[e + 4] : 0;
const bx = 2 * (qx * qy - qw * qz), by = 1 - 2 * (qx * qx + qz * qz), bz = 2 * (qy * qz + qw * qx);
let sub;
if (o.kind === 'stone') { const d = clamp(h - (y - o.r), 0, 2 * o.r); sub = (Math.PI * d * d * (3 * o.r - d) / 3) / o.vol; }
else sub = clamp((h - (y - o.hy * (0.5 + 0.5 * Math.abs(by)))) / (2 * o.hy), 0, 1);
let fx = 0, fy = 0, fz = 0, tx = 0, ty = 0, tz = 0;
const m = o.mass, hs = Math.hypot(vx, vz);
if (o.kind === 'stone' && sub > 0 && vy < 0 && simT >= o.coolUntil) {
const ang = Math.atan2(-vy, Math.max(hs, 1e-3));
if (ang < 0.35 && hs > 2.2 && o.bounces < 7) {
const e2 = 0.55; tmpV.x = vx * 0.86; tmpV.y = -vy * e2 + 0.15; tmpV.z = vz * 0.86; a.setLinearVelocity(tmpV, true);
o.bounces++; o.coolUntil = simT + 0.07; o.armed = false; events.push({ e: 'splash', slot: i, x, z, impulse: m * Math.abs(vy) * (1 + e2), skip: o.bounces });
continue;
}
}
if (sub > 0) {
fy += RHO * G * o.vol * sub;
const rx = vx - ux * cfg.drift, rz = vz - uz * cfg.drift;
if (o.kind === 'stone') {
const sp = Math.hypot(rx, vy, rz), rate = Math.min(22, 7 * sp) * sub;
fx -= m * rate * rx; fy -= m * rate * vy; fz -= m * rate * rz;
fy += m * G * 0.5 * clamp(hs / 6, 0, 1) * sub;   // planing: a fast flat stone is held up a little by the water it pushes
} else {
fx -= m * 2.5 * sub * rx; fz -= m * 2.5 * sub * rz; fy -= m * 14 * sub * vy;
fx += m * (-sx * 1.2) * sub; fz += m * (-sz * 1.2) * sub;   // the slope carries it gently downhill
const nl = Math.hypot(sx, 1, sz), nx = -sx / nl, ny = 1 / nl, nz = -sz / nl;
const wn2 = 144, I = o.I;   // a natural frequency of 12 rad/s, damped near 0.7
const cx2 = by * nz - bz * ny, cy2 = bz * nx - bx * nz, cz2 = bx * ny - by * nx;
tx += I * (wn2 * cx2 - 17 * wx) * sub; tz += I * (wn2 * cz2 - 17 * wz) * sub; ty += I * (wn2 * cy2) * sub - o.Iy * 4 * wy * sub;
}
}
const air = 1 - sub;
if (air > 0) {
if (o.kind === 'petal') {
const ph = simT * 8.2 + o.seed;
const ak = sub > 0.001 ? 0.1 : 1;   // (once it touches the water its sway and the wind's push are a tenth: it is mostly below the surface, and the water's drag rules)
fx += m * ((ux - vx) * 1.5 + 0.9 * Math.sin(ph)) * air * ak; fz += m * ((uz - vz) * 1.5 + 0.9 * Math.cos(ph * 0.83)) * air * ak; fy -= m * 6.5 * vy * air;
const I = o.I; tx += I * (25 * -bz - 6 * wx) * air; tz += I * (25 * bx - 6 * wz) * air; ty -= o.Iy * 2 * wy * air;
} else { fx += m * (ux - vx) * 0.05 * air; fz += m * (uz - vz) * 0.05 * air; }
}
if (fx || fy || fz) { tmpV.x = fx; tmpV.y = fy; tmpV.z = fz; a.addForce(tmpV, FE, true); }
if (tx || ty || tz) { tmpV2.x = tx; tmpV2.y = ty; tmpV2.z = tz; a.addTorque(tmpV2, FE, true); }
const low = y - (o.kind === 'stone' ? o.r : o.hy);
if (o.armed && low < h && vy < -0.25) { o.armed = false; events.push({ e: 'splash', slot: i, x, z, impulse: m * Math.abs(vy) }); }
else if (!o.armed && low > h + 0.02) o.armed = true;
o.x = x; o.y = y; o.z = z;
if (y < cfg.sinkY || (o.kind === 'stone' && y < -0.25 && !o.sunk)) { if (!o.sunk) { o.sunk = true; events.push({ e: 'sink', slot: i, x, z }); } if (y < cfg.sinkY) drop(i, true); }
else if (simT - o.born > o.ttl) drop(i, true);
}
};
const fixed = (env) => {
const a = performance.now();
forces(env, FIXED);
scene.simulate(FIXED); scene.fetchResults(true);
simT += FIXED; steps++;
const ms = performance.now() - a; stepLast = ms; ring[ri] = ms; ri = (ri + 1) % ring.length; if (rn < ring.length) rn++;
};
const p95 = () => { if (!rn) return 0; const s = Array.from(ring.subarray(0, rn)).sort((x, y) => x - y); return s[Math.min(rn - 1, Math.floor(rn * 0.95))]; };
const mean = () => { let s = 0; for (let i = 0; i < rn; i++) s += ring[i]; return rn ? s / rn : 0; };
const frame = (m, outPose) => {
for (const c of m.cmds || []) {
if (c.op === 'petal' || c.op === 'stone') spawn(c.op, c);
else if (c.op === 'remove') drop(c.slot, true);
else if (c.op === 'paddle') setPaddle(c);
}
acc += clamp(m.dt || 0, 0, MAXACC); let n = 0;
while (acc >= FIXED && n < MAXSTEPS) { fixed(m.env); acc -= FIXED; n++; }
if (acc >= FIXED) acc = 0;
const pose = outPose || new Float32Array(cfg.maxBodies * 8);
for (let i = 0; i < cfg.maxBodies; i++) {
const o = slots[i], j = i * 8;
if (!o) { pose[j + 7] = 0; continue; }
const T = o.actor.getGlobalPose(), p = T.p, q = T.q;
pose[j] = p.x; pose[j + 1] = p.y; pose[j + 2] = p.z; pose[j + 3] = q.x; pose[j + 4] = q.y; pose[j + 5] = q.z; pose[j + 6] = q.w;
pose[j + 7] = 1 + (o.kind === 'stone' ? 2 : 0) + (o.inSun ? 4 : 0);
}
const ev = events.splice(0, events.length);
return { pose, ev, stats: { steps, stepMs: stepLast, stepMean: mean(), stepP95: p95(), bodies: live, t: simT } };
};
const verify = (n) => {
n = clamp(n | 0 || 60, 1, 600);
const S = makeScene(false), y0 = 10, r = 0.1, g = new P.PxSphereGeometry(r), a = P.CreateDynamic(physics, pose(0, y0, 0), g, mats.stone, 1000);
a.setLinearDamping(0); a.setAngularDamping(0); S.scene.addActor(a);
for (let i = 0; i < n; i++) { S.scene.simulate(FIXED); S.scene.fetchResults(true); }
const y = a.getGlobalPose().p.y, vy = a.getLinearVelocity().y;
S.scene.removeActor(a); a.release(); P.destroy(g); killScene(S);
const yD = y0 - G * FIXED * FIXED * n * (n + 1) / 2, yC = y0 - 0.5 * G * (n * FIXED) ** 2, fall = y0 - yC;
const errDiscrete = Math.abs(y - yD), errContinuous = Math.abs(y - yC) / fall, vyExp = -G * n * FIXED;
const pass = errDiscrete < 1e-3 && errContinuous < 0.025 && Math.abs(vy - vyExp) < 1e-3 * Math.max(1, Math.abs(vyExp));
return { steps: n, dt: FIXED, g: G, y0, y, yDiscrete: yD, yContinuous: yC, errDiscrete, errContinuous, vy, vyExpected: vyExp, pass, tol: { discrete: 1e-3, continuous: 0.025 } };
};
const bench = (n, st) => {
n = clamp(n | 0 || 12, 1, 64); st = clamp(st | 0 || 240, 30, 2000);
const S = makeScene(false), acts = [], pl = new P.PxPlane(0, 1, 0, 0.6), gr = P.CreatePlane(physics, pl, mats.ground); S.scene.addActor(gr);
for (let i = 0; i < n; i++) { const a = P.CreateDynamic(physics, pose((i % 8) * 0.4 - 1.4, 1 + (i / 8 | 0) * 0.2, 5), geoms.petal, mats.petal, cfg.petal.density); S.scene.addActor(a); acts.push(a); }
const ts = [];
for (let i = 0; i < st; i++) { const a = performance.now(); S.scene.simulate(FIXED); S.scene.fetchResults(true); ts.push(performance.now() - a); }
for (const a of acts) { S.scene.removeActor(a); a.release(); } S.scene.removeActor(gr); gr.release(); P.destroy(pl); killScene(S);
ts.sort((x, y) => x - y); return { bodies: n, steps: st, meanMs: ts.reduce((s, v) => s + v, 0) / st, p95Ms: ts[Math.floor(st * 0.95)], maxMs: ts[st - 1] };
};
const info = () => ({
ready: !disposed, version, versionRaw, versionHex: '0x' + (versionRaw >>> 0).toString(16), packageVersion: cfg.packageVersion || '', wasmSha256: cfg.wasmSha256 || '', wasmBytes: wasmBinary.byteLength,
heapBytes: heapBytes(), instantiateMs, bodies: live, maxBodies: cfg.maxBodies, stepMsLast: stepLast, stepMsMean: mean(), stepMsP95: p95(), stepsTotal: steps, simTime: simT, paddle: paddleOn,
});
const dispose = () => {
if (disposed) return; disposed = true;
for (let i = 0; i < slots.length; i++) { const o = slots[i]; if (o) { try { scene.removeActor(o.actor); o.actor.release(); } catch (e) {} slots[i] = null; } }
if (paddle) { try { scene.removeActor(paddle); paddle.release(); } catch (e) {} paddle = null; }
for (const s of statics) { try { if (s.getType) { scene.removeActor(s); } s.release(); } catch (e) {} }
try { killScene(sceneObj); } catch (e) {}
for (const k in mats) { try { mats[k].release(); } catch (e) {} } for (const k in geoms) { try { P.destroy(geoms[k]); } catch (e) {} }
const T = (f) => { try { f(); } catch (e) {} };
T(() => P.destroy(tmpV)); T(() => P.destroy(tmpV2)); T(() => P.destroy(tmpT)); T(() => { if (dispatcher.release) dispatcher.release(); });
T(() => physics.release()); T(() => P.destroy(tol)); T(() => foundation.release()); T(() => P.destroy(errCb)); T(() => P.destroy(allocator));
byPtr.clear();
};
return { info, frame, verify, bench, dispose, KIND, ENVW, cfg };
}
root.SpiritualPhysX = { create, decode, KIND, ENVW };
})();
