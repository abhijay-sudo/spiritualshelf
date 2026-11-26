(() => {
const root = typeof self !== 'undefined' ? self : globalThis;
if (root.SpiritualLifeWorld) return;
const FIXED = 1 / 60, MAXSTEPS = 3, MAXACC = 0.05, G = 9.81, HDR = 6, STRIDE = 8, RHO = 1000;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const CW = [[0.5, 0.9, 0.55, 0.31, 0.9], [0.8, 2.1, 1.35, -0.43, 1.7], [0.35, 4.4, 2.9, 0.77, 3.1]], cv = [0, 0];
const curl = (x, y, t) => { let u = 0, v = 0; for (let j = 0; j < 3; j++) { const a = CW[j][0], kx = CW[j][1], ky = CW[j][2], w = CW[j][3], p = CW[j][4], A = Math.sin(kx * x + w * t + p), B = Math.sin(ky * y - w * 0.8 * t + p * 1.7), dA = Math.cos(kx * x + w * t + p), dB = Math.cos(ky * y - w * 0.8 * t + p * 1.7); u += a * A * ky * dB; v -= a * kx * dA * B; } cv[0] = u; cv[1] = v; return cv; };
const MOTION = { locked: 'eLOCKED', limited: 'eLIMITED', free: 'eFREE' };
const AXIS = { x: 'eX', y: 'eY', z: 'eZ', twist: 'eTWIST', swing1: 'eSWING1', swing2: 'eSWING2' };
const DRIVE = { x: 'eX', y: 'eY', z: 'eZ', twist: 'eTWIST', slerp: 'eSLERP', swing1: 'eSWING1', swing2: 'eSWING2' };
function create(engine, cfg0) {
const { P, physics, tol, dispatcher, E } = engine;
const cfg = Object.assign({ global: 64, perGroup: 24, maxGroups: 12, maxJoints: 24, maxTriggers: 12, groupBudgetMs: 0.8 }, cfg0 || {});
const nSlots = cfg.global | 0;
const state = new Float32Array(HDR + nSlots * STRIDE), slots = new Array(nSlots).fill(null);
const groups = new Map(), coll = new Int32Array(16).fill(0xffff), joints = new Map(), triggers = new Map(), fields = [], byPtr = new Map(), events = [];
const mats = new Map();
let sentOnce = false, wasQuiet = false, live = 0, simT = 0, acc = 0, steps = 0, idleSteps = 0, rejected = 0, dirty = true, disposed = false, stepLast = 0, awakeNow = 0, tmpT = null;
const ring = new Float32Array(240); let ri = 0, rn = 0;
const FE = E('PxForceModeEnum', 'eFORCE');
const tmpV = new P.PxVec3(0, 0, 0), tmpV2 = new P.PxVec3(0, 0, 0);
tmpT = new P.PxTransform(E('PxIDENTITYEnum', 'PxIdentity'));
const pose = (p, q) => { const a = tmpT.p, b = tmpT.q; a.x = p[0]; a.y = p[1]; a.z = p[2]; if (q) { b.x = q[0]; b.y = q[1]; b.z = q[2]; b.w = q[3]; } else { b.x = b.y = b.z = 0; b.w = 1; } return tmpT; };
const mkT = (p, q) => { const t = new P.PxTransform(E('PxIDENTITYEnum', 'PxIdentity')); t.p.x = p[0]; t.p.y = p[1]; t.p.z = p[2]; if (q) { t.q.x = q[0]; t.q.y = q[1]; t.q.z = q[2]; t.q.w = q[3]; } return t; };
const PF = (k) => E('PxPairFlagEnum', k), TRIG = PF('eTRIGGER_DEFAULT'), SOLID = PF('eSOLVE_CONTACT') | PF('eDETECT_DISCRETE_CONTACT');
const trigFound = PF('eNOTIFY_TOUCH_FOUND'), trigLost = PF('eNOTIFY_TOUCH_LOST');
const sd = new P.PxSceneDesc(tol); sd.gravity = new P.PxVec3(0, -G, 0); sd.cpuDispatcher = dispatcher;
const fsImpl = new P.PassThroughFilterShaderImpl(), ps = P.wrapPointer(fsImpl.ptr, P.PassThroughFilterShader);
fsImpl.filterShader = (a0, a1, a2, a3, a4, b0, b1) => {
const ga = a1 & 15, gb = b1 & 15;   // word0 of the shape's filter data: its group's bit index
if (!((coll[ga] >> gb) & 1) || !((coll[gb] >> ga) & 1)) { ps.outputPairFlags = 0; return 1; }   // 1 = eSUPPRESS: these two groups never meet
ps.outputPairFlags = ((a0 | b0) & 32) ? TRIG : SOLID; return 0;
};
P.setupPassThroughFilterShader(sd, ps);
const callback = new P.PxSimulationEventCallbackImpl();
callback.onTrigger = (pairs, count) => {
const arr = P.NativeArrayHelpers.prototype;
for (let i = 0; i < count; i++) {
const p = arr.getTriggerPairAt(pairs, i), s = byPtr.get(p.otherActor.ptr), tr = byPtr.get('t' + p.triggerActor.ptr); if (s === undefined || !slots[s]) continue;
const o = slots[s];
if (p.status === trigFound) { o.inTrig++; events.push({ e: 'enter', slot: s, trigger: tr }); } else if (p.status === trigLost) { o.inTrig = Math.max(0, o.inTrig - 1); events.push({ e: 'leave', slot: s, trigger: tr }); }
}
};
callback.onContact = () => {}; callback.onConstraintBreak = () => {}; callback.onWake = () => {}; callback.onSleep = () => {};
sd.simulationEventCallback = callback;
const scene = physics.createScene(sd);
const group = (m) => {
let g = groups.get(m.id);
if (!g) { if (groups.size >= cfg.maxGroups || groups.size >= 15) { events.push({ e: 'reject', what: 'group', id: m.id }); rejected++; return null; } g = { id: m.id, owner: m.owner || m.id, bit: groups.size, cap: 0, count: 0, awake: 0, ms: 0, throttled: false, over: 0, slots: [], ring: new Float32Array(180), ri: 0, rn: 0 }; groups.set(m.id, g); }
g.cap = Math.min(m.cap | 0 || cfg.perGroup, cfg.perGroup);
g.collide = m.collide || '*'; g.self = m.self !== false; rebuildMatrix(); return g;
};
const rebuildMatrix = () => {
coll.fill(0xffff);
for (const g of groups.values()) {
let mask = 0;
for (const h of groups.values()) { const ok = g === h ? g.self : g.collide === '*' || (Array.isArray(g.collide) && g.collide.includes(h.id)); if (ok) mask |= 1 << h.bit; }
coll[g.bit] = mask | (1 << 15);   // (bit 15: the world, which every group may touch)
}
coll[15] = 0xffff;
};
const material = (a) => { a = a || [0.5, 0.4, 0.1]; const k = a.join(','); let m = mats.get(k); if (!m) { m = physics.createMaterial(a[0], a[1], a[2]); mats.set(k, m); } return m; };
const geometry = (s) => (s.type === 'sphere' ? new P.PxSphereGeometry(s.r) : s.type === 'capsule' ? new P.PxCapsuleGeometry(s.r, s.hh) : new P.PxBoxGeometry(s.h[0], s.h[1], s.h[2]));
const volume = (s) => (s.type === 'sphere' ? (4 / 3) * Math.PI * s.r ** 3 : s.type === 'capsule' ? Math.PI * s.r * s.r * 2 * s.hh + (4 / 3) * Math.PI * s.r ** 3 : 8 * s.h[0] * s.h[1] * s.h[2]);
const spawn = (c) => {
const i = c.slot | 0, g = groups.get(c.group);
const no = (why) => { rejected++; events.push({ e: 'reject', slot: i, group: c.group, why }); };
if (i < 0 || i >= nSlots) return no('slot'); if (!g) return no('group'); if (slots[i]) drop(i, false);
if (g.count >= g.cap) return no('group cap'); if (live >= nSlots) return no('global cap');
const kind = c.kind === 'static' || c.kind === 'kinematic' ? c.kind : 'dynamic', s = c.shape || { type: 'sphere', r: 0.1 };
const geo = geometry(s), flags = new P.PxShapeFlags(E('PxShapeFlagEnum', 'eSIMULATION_SHAPE')), sh = physics.createShape(geo, material(c.mat), true, flags);
const fd = new P.PxFilterData(g.bit, 0, 0, 0); sh.setSimulationFilterData(fd); P.destroy(fd);
const tr = pose(c.pos || [0, 0, 0], c.quat), dens = c.density || 500;
const a = kind === 'static' ? P.CreateStaticFromShape(physics, tr, sh) : kind === 'kinematic' ? P.CreateKinematicFromShape(physics, tr, sh, dens) : P.CreateDynamicFromShape(physics, tr, sh, dens);
sh.release(); P.destroy(geo); P.destroy(flags);
let mass = 0;
if (kind === 'dynamic') {
const d = c.damp || [0.05, 0.1]; a.setLinearDamping(d[0]); a.setAngularDamping(d[1]); a.setSleepThreshold(c.sleep == null ? 0.02 : c.sleep);
a.setMaxLinearVelocity(c.maxV || 40); a.setMaxAngularVelocity(c.maxW || 30);
if (c.vel) { tmpV.x = c.vel[0]; tmpV.y = c.vel[1]; tmpV.z = c.vel[2]; a.setLinearVelocity(tmpV, true); }
if (c.ang) { tmpV2.x = c.ang[0]; tmpV2.y = c.ang[1]; tmpV2.z = c.ang[2]; a.setAngularVelocity(tmpV2, true); }
if (c.ccd) a.setRigidBodyFlag(E('PxRigidBodyFlagEnum', 'eENABLE_CCD'), true);
if (c.lockZ) a.setRigidDynamicLockFlag(E('PxRigidDynamicLockFlagEnum', 'eLOCK_LINEAR_Z'), true);   // (a real PhysX lock: the body moves in the plane of the page and still turns every way)
if (c.iters) a.setSolverIterationCounts(clamp(c.iters[0] | 0, 1, 64), clamp(c.iters[1] | 0, 1, 16));   // (a jointed chain of light capsules with stiff drives needs more solver iterations than the default 4 to hold its shape)
if (c.grav === 0) a.setActorFlag(E('PxActorFlagEnum', 'eDISABLE_GRAVITY'), true);   // (a body that is carried, not dropped: a bird in the air)
mass = a.getMass();
}
scene.addActor(a);
const vol = volume(s);
slots[i] = { actor: a, ptr: a.ptr, g, kind, s, vol, mass, wind: c.wind == null ? 1 : c.wind, born: simT, ttl: c.ttl || 0, inTrig: 0, seed: c.seed || 0, asleep: false, moved: true, joints: [] };
byPtr.set(a.ptr, i); g.count++; g.slots.push(i); live++; dirty = true; writeSlot(i, true);
};
const drop = (i, announce) => {
const o = slots[i]; if (!o) return;
for (const id of o.joints.slice()) killJoint(id);
byPtr.delete(o.ptr); scene.removeActor(o.actor); o.actor.release(); slots[i] = null; live--;
o.g.count--; const k = o.g.slots.indexOf(i); if (k >= 0) o.g.slots.splice(k, 1);
state[HDR + i * STRIDE + 7] = 0; if (announce) events.push({ e: 'gone', slot: i });
};
const writeSlot = (i, awake) => {
const o = slots[i], j = HDR + i * STRIDE; if (!o) return;
const T = o.actor.getGlobalPose(), p = T.p, q = T.q;
state[j] = p.x; state[j + 1] = p.y; state[j + 2] = p.z; state[j + 3] = q.x; state[j + 4] = q.y; state[j + 5] = q.z; state[j + 6] = q.w;
state[j + 7] = 1 + (awake ? 2 : 0) + (o.inTrig ? 4 : 0);
};
const move = (c) => {
const o = slots[c.slot]; if (!o) return; const tr = pose(c.pos || [0, 0, 0], c.quat);
if (o.kind === 'kinematic') o.actor.setKinematicTarget(tr); else if (o.kind === 'dynamic') { o.actor.setGlobalPose(tr, true); } else { o.actor.setGlobalPose(tr, false); }
o.moved = true; dirty = true;
};
const impulse = (c) => {
const o = slots[c.slot]; if (!o || o.kind !== 'dynamic') return;
if (c.f) { tmpV.x = c.f[0]; tmpV.y = c.f[1]; tmpV.z = c.f[2]; o.actor.addForce(tmpV, E('PxForceModeEnum', 'eIMPULSE'), true); }
if (c.t) { tmpV2.x = c.t[0]; tmpV2.y = c.t[1]; tmpV2.z = c.t[2]; o.actor.addTorque(tmpV2, E('PxForceModeEnum', 'eIMPULSE'), true); }
dirty = true;
};
const trigger = (c) => {
if (triggers.size >= cfg.maxTriggers) { rejected++; events.push({ e: 'reject', what: 'trigger', id: c.id }); return; }
const g = groups.get(c.group); if (!g) return; const s = c.shape || { type: 'box', h: [1, 1, 1] };
const geo = geometry(s), fl = new P.PxShapeFlags(E('PxShapeFlagEnum', 'eTRIGGER_SHAPE')), sh = physics.createShape(geo, material(), true, fl);
const fd = new P.PxFilterData(g.bit, 0, 0, 0); sh.setSimulationFilterData(fd); P.destroy(fd);
const a = physics.createRigidStatic(pose(c.pos || [0, 0, 0], c.quat)); a.attachShape(sh); scene.addActor(a); sh.release(); P.destroy(geo); P.destroy(fl);
triggers.set(c.id, a); byPtr.set('t' + a.ptr, c.id); dirty = true;
};
const killJoint = (id) => { const j = joints.get(id); if (!j) return; try { j.joint.release(); } catch (e) {} joints.delete(id); for (const s of j.slots) { const o = slots[s]; if (o) { const k = o.joints.indexOf(id); if (k >= 0) o.joints.splice(k, 1); } } if (j.anchor) { try { scene.removeActor(j.anchor); j.anchor.release(); } catch (e) {} } };
const joint = (c) => {
if (joints.size >= cfg.maxJoints || joints.has(c.id)) { rejected++; events.push({ e: 'reject', what: 'joint', id: c.id }); return; }
const b = slots[c.b], a = c.a >= 0 ? slots[c.a] : null; if (!b || (c.a >= 0 && !a)) return;
let anchor = null, a0 = a && a.actor;
if (!a0) { anchor = physics.createRigidStatic(pose(c.anchorPos || [0, 0, 0])); scene.addActor(anchor); a0 = anchor; }   // (the world: a static anchor with no shape)
const fa = mkT(c.fa ? c.fa.p : [0, 0, 0], c.fa && c.fa.q), fb = mkT(c.fb ? c.fb.p : [0, 0, 0], c.fb && c.fb.q);
let jt;
if (c.type === 'revolute') {
jt = P.RevoluteJointCreate(physics, a0, fa, b.actor, fb);
if (c.limit) { const l = new P.PxJointAngularLimitPair(c.limit[0], c.limit[1]); if (c.limitSpring) { l.stiffness = c.limitSpring[0]; l.damping = c.limitSpring[1]; } jt.setLimit(l); P.destroy(l); jt.setRevoluteJointFlag(E('PxRevoluteJointFlagEnum', 'eLIMIT_ENABLED'), true); }
if (c.drive) { jt.setDriveVelocity(c.drive.vel || 0, true); jt.setDriveForceLimit(c.drive.force == null ? 1e6 : c.drive.force); jt.setRevoluteJointFlag(E('PxRevoluteJointFlagEnum', 'eDRIVE_ENABLED'), true); }
} else {
jt = P.D6JointCreate(physics, a0, fa, b.actor, fb);
for (const k in AXIS) jt.setMotion(E('PxD6AxisEnum', AXIS[k]), E('PxD6MotionEnum', MOTION[(c.motion && c.motion[k]) || 'locked']));
if (c.twist) { const l = new P.PxJointAngularLimitPair(c.twist[0], c.twist[1]); jt.setTwistLimit(l); P.destroy(l); }
if (c.swing) { const l = new P.PxJointLimitCone(c.swing[0], c.swing[1]); if (c.limitSpring) { l.stiffness = c.limitSpring[0]; l.damping = c.limitSpring[1]; } jt.setSwingLimit(l); P.destroy(l); }
for (const d of c.drives || []) { const dr = new P.PxD6JointDrive(d.stiffness || 0, d.damping || 0, d.force == null ? 1e6 : d.force, !!d.accel); jt.setDrive(E('PxD6DriveEnum', DRIVE[d.axis || 'slerp']), dr); P.destroy(dr); }
if (c.drivePose) { const t = mkT(c.drivePose.p, c.drivePose.q); jt.setDrivePosition(t, true); P.destroy(t); }
}
P.destroy(fa); P.destroy(fb);
if (c.collide) jt.setConstraintFlag(E('PxConstraintFlagEnum', 'eCOLLISION_ENABLED'), true);
if (c.breakForce) jt.setBreakForce(c.breakForce[0], c.breakForce[1]);
const ss = [c.b]; if (a) ss.push(c.a); joints.set(c.id, { joint: jt, anchor, slots: ss, type: c.type || 'd6' }); for (const s of ss) slots[s].joints.push(c.id); dirty = true;
};
const jointSet = (c) => {
const j = joints.get(c.id); if (!j) return;
if (j.type === 'revolute') { if (c.vel != null) j.joint.setDriveVelocity(c.vel, true); }
else { if (c.drivePose) { const t = mkT(c.drivePose.p, c.drivePose.q); j.joint.setDrivePosition(t, true); P.destroy(t); } if (c.driveVel) { tmpV.x = c.driveVel[0]; tmpV.y = c.driveVel[1]; tmpV.z = c.driveVel[2]; tmpV2.x = c.driveVel[3] || 0; tmpV2.y = c.driveVel[4] || 0; tmpV2.z = c.driveVel[5] || 0; j.joint.setDriveVelocity(tmpV, tmpV2); } }
dirty = true;
};
const field = (c) => { const k = fields.findIndex((f) => f.id === c.id); const f = Object.assign({ on: true }, c); if (k >= 0) fields[k] = f; else fields.push(f); dirty = true; };
const applyFields = (env) => {
if (!fields.length) return;
for (const f of fields) {
if (!f.on) continue; const g = groups.get(f.group); if (!g || g.throttled) continue;
for (const i of g.slots) {
const o = slots[i]; if (!o || o.kind !== 'dynamic') continue;
const asleep = o.actor.isSleeping();
const T = o.actor.getGlobalPose(), p = T.p, q = T.q, lv = o.actor.getLinearVelocity(), av = o.actor.getAngularVelocity();
const x = p.x, y = p.y, z = p.z, vx = lv.x, vy = lv.y, vz = lv.z, m = o.mass;
let fx = 0, fy = 0, fz = 0, tx = 0, ty = 0, tz = 0;
if (f.region && (x < f.region[0] || x > f.region[3] || y < f.region[1] || y > f.region[4] || z < f.region[2] || z > f.region[5])) continue;
if (f.kind === 'wind') {
const gust = env && env.gust ? env.gust : 0, ph = simT * (f.freq || 0.9) + o.seed + x * 0.35 + z * 0.21, turb = (f.turb || 0) * Math.sin(ph) * (0.5 + 0.5 * Math.sin(simT * 0.37 + o.seed));
let ux = (f.dir ? f.dir[0] : 1) * (f.speed || 0) * (1 + (f.gustGain == null ? 0.6 : f.gustGain) * gust) + turb, uz = (f.dir ? f.dir[2] : 0) * (f.speed || 0) * (1 + (f.gustGain == null ? 0.6 : f.gustGain) * gust) + turb * 0.6, uy = f.lift ? f.lift * gust : 0;
if (f.gustAdd) ux += f.gustAdd * gust * gust * (env && env.gx != null ? env.gx : 1);   // (a flick or a scroll adds to the breeze, in the direction it came from; the square makes a gust a puff that is over in about a second and a half, not a long tail)
if (f.curl) { const c = curl(x, y, simT * (f.curl.speed || 1)); ux += c[0] * f.curl.amp; uy += c[1] * f.curl.amp; }
const k = (f.k == null ? 1.2 : f.k) * o.wind; fx = m * k * (ux - vx); fy = m * k * (uy - vy) * 0.4; fz = m * k * (uz - vz);
if (asleep && Math.hypot(fx, fz) / m < (f.wake == null ? 0.9 : f.wake)) continue;   // a breath too weak to move a resting body does not wake it
} else if (f.kind === 'plate') {
let ux = (f.dir ? f.dir[0] : 1) * (f.speed || 0), uy = 0; const gz = env && env.gust ? env.gust : 0;
if (f.gustAdd) ux += f.gustAdd * gz * gz * (env && env.gx != null ? env.gx : 1);
if (f.curl) { const c = curl(x, y, simT * (f.curl.speed || 1)); ux += c[0] * f.curl.amp; uy += c[1] * f.curl.amp; }
const rx = ux - vx, ry = uy - vy, rz = -vz, nx = 2 * (q.x * q.y - q.w * q.z), ny = 1 - 2 * (q.x * q.x + q.z * q.z), nz = 2 * (q.y * q.z + q.w * q.x), rn = rx * nx + ry * ny + rz * nz;
const kn = (f.kn == null ? 30 : f.kn) * o.wind, kt = (f.kt == null ? 6 : f.kt) * o.wind;
fx = m * (kn * rn * nx + kt * (rx - rn * nx)); fy = m * (kn * rn * ny + kt * (ry - rn * ny)); fz = m * (kn * rn * nz + kt * (rz - rn * nz));
if ((asleep || (vx * vx + vy * vy + vz * vz < 4e-4 && av.x * av.x + av.y * av.y + av.z * av.z < 0.01)) && Math.hypot(fx, fz) / m < (f.wake == null ? 4 : f.wake)) continue;   // (a petal at rest is left alone by a breath too weak to move it, so it can fall asleep, and a sleeping world costs nothing)
const k2 = m * (f.torque || 0) * 0.0007 * rn, ox = ny * rz - nz * ry, oy = nz * rx - nx * rz, oz = nx * ry - ny * rx;   // (n x rel: the axis that turns the face toward the flow)
tx = k2 * ox + m * (f.noise || 0) * 0.0007 * Math.sin(simT * 6.1 + o.seed * 2.3); ty = k2 * oy; tz = k2 * oz + m * (f.noise || 0) * 0.0007 * Math.sin(simT * 4.7 + o.seed * 1.1);
} else if (f.kind === 'wake') {
if (!f.p || !f.v) continue; const dx = x - f.p[0], dy = y - f.p[1], r = f.r || 0.8, q = Math.exp(-(dx * dx + dy * dy) / (r * r)); if (q < 0.02) continue;
const k = (f.k == null ? 5 : f.k) * q * o.wind; fx = m * k * (f.v[0] - vx); fy = m * k * (f.v[1] - vy) * 0.5;
} else if (f.kind === 'buoyancy') {
const surf = (f.y || 0) + (f.wave ? f.wave[0] * Math.sin(simT * f.wave[1] + x * f.wave[2] + z * f.wave[3]) : 0);
const bx = 2 * (q.x * q.y - q.w * q.z), by = 1 - 2 * (q.x * q.x + q.z * q.z), bz = 2 * (q.y * q.z + q.w * q.x);
const hh = o.s.type === 'sphere' ? o.s.r : o.s.type === 'capsule' ? Math.abs(2 * (q.x * q.y + q.w * q.z)) * o.s.hh + o.s.r : Math.abs(2 * (q.x * q.y + q.w * q.z)) * o.s.h[0] + Math.abs(by) * o.s.h[1] + Math.abs(2 * (q.y * q.z - q.w * q.x)) * o.s.h[2];
const sub = clamp((surf - (y - hh)) / (2 * hh), 0, 1); if (sub <= 0) continue;
const rho = f.rho || RHO; fy += rho * G * o.vol * sub;
const sp = Math.hypot(vx, vy, vz), rate = ((f.drag == null ? 3 : f.drag) + (f.drag2 == null ? 1.5 : f.drag2) * sp) * sub;
fx -= m * rate * vx; fy -= m * rate * vy; fz -= m * rate * vz;
const ad = (f.angDrag == null ? 2 : f.angDrag) * sub; tx -= m * ad * av.x * 0.02; ty -= m * ad * av.y * 0.02; tz -= m * ad * av.z * 0.02;
if (f.righting) { const wn2 = f.righting, I = m * 0.01, c = 2 * Math.sqrt(wn2) * 0.7; tx += I * (-wn2 * bz - c * av.x) * sub; tz += I * (wn2 * bx - c * av.z) * sub; }   // (a spring that turns the up axis back toward the world's up, damped)
} else if (f.kind === 'drag') {
const sp = Math.hypot(vx, vy, vz), rate = (f.c1 == null ? 0.2 : f.c1) + (f.c2 || 0) * sp; fx = -m * rate * vx; fy = -m * rate * vy; fz = -m * rate * vz;
if (asleep) continue;
}
if (fx || fy || fz) { tmpV.x = fx; tmpV.y = fy; tmpV.z = fz; o.actor.addForce(tmpV, FE, !asleep || Math.hypot(fx, fy, fz) / Math.max(m, 1e-6) > 0.9); }
if (tx || ty || tz) { tmpV2.x = tx; tmpV2.y = ty; tmpV2.z = tz; o.actor.addTorque(tmpV2, FE, !asleep); }
}
}
};
const attribute = (ms) => {
let tot = 0; for (const g of groups.values()) { g.awake = 0; }
for (let i = 0; i < nSlots; i++) { const o = slots[i]; if (o && o.kind === 'dynamic' && !o.asleep) { o.g.awake++; tot++; } }
awakeNow = tot;
for (const g of groups.values()) {
const share = tot ? ms * g.awake / tot : 0; g.ms = g.ms * 0.95 + share * 0.05;   // attributed in proportion to awake bodies: PhysX does not time groups
g.ring[g.ri] = share; g.ri = (g.ri + 1) % g.ring.length; if (g.rn < g.ring.length) g.rn++;   // (and kept, so the 95th percentile of a group's share can be shown)
if (!g.throttled && g.ms > cfg.groupBudgetMs && g.awake) { if (++g.over > 60) { g.throttled = true; events.push({ e: 'over', group: g.id, ms: +g.ms.toFixed(3) }); } } else if (g.ms <= cfg.groupBudgetMs * 0.6) g.over = 0;
}
};
const fixed = (env) => {
const a = performance.now(); dirty = false;
applyFields(env);
scene.simulate(FIXED); scene.fetchResults(true); simT += FIXED; steps++;
for (let i = 0; i < nSlots; i++) {
const o = slots[i]; if (!o) continue;
if (o.kind === 'dynamic') { const sl = o.actor.isSleeping(); if (!sl || !o.asleep) { writeSlot(i, !sl); } o.asleep = sl; if (!sl) dirty = true; }
else if (o.moved) { writeSlot(i, o.kind === 'kinematic'); o.moved = false; if (o.kind === 'kinematic') dirty = true; }
if (o.ttl && simT - o.born > o.ttl) drop(i, true);
}
const ms = performance.now() - a; stepLast = ms; ring[ri] = ms; ri = (ri + 1) % ring.length; if (rn < ring.length) rn++; attribute(ms);
};
const p95 = () => { if (!rn) return 0; const s = Array.from(ring.subarray(0, rn)).sort((x, y) => x - y); return s[Math.min(rn - 1, Math.floor(rn * 0.95))]; };
const mean = () => { let s = 0; for (let i = 0; i < rn; i++) s += ring[i]; return rn ? s / rn : 0; };
const cmd = (c) => {
switch (c.op) {
case 'group': group(c); break; case 'spawn': spawn(c); break; case 'remove': drop(c.slot, true); break; case 'move': move(c); break; case 'impulse': impulse(c); break;
case 'trigger': trigger(c); break; case 'joint': joint(c); break; case 'jointSet': jointSet(c); break; case 'jointKill': killJoint(c.id); break; case 'field': field(c); break;
case 'unthrottle': { const g = groups.get(c.group); if (g) { g.throttled = false; g.over = 0; } break; }
case 'clearGroup': { const g = groups.get(c.group); if (g) for (const s of g.slots.slice()) drop(s, true); break; }
}
};
const frame = (m) => {
for (const c of m.cmds || []) { try { cmd(c); } catch (e) { events.push({ e: 'error', op: c.op, msg: String(e && e.message || e).slice(0, 120) }); } }
acc += clamp(m.dt || 0, 0, MAXACC); let n = 0;
if (dirty || awakeNow > 0 || m.force) { while (acc >= FIXED && n < MAXSTEPS) { fixed(m.env); acc -= FIXED; n++; } if (acc >= FIXED) acc = 0; }
else { acc = 0; idleSteps++; stepLast = 0; }   // everything sleeps and nothing was asked: the world is not stepped, it costs nothing
const out = m.snap && m.snap.length === state.length ? m.snap : new Float32Array(state.length);
const quiet = !dirty && awakeNow === 0; if (quiet) stepLast = 0; const edge = quiet !== wasQuiet; wasQuiet = quiet;
out.set(state); out[0] = simT; out[1] = awakeNow; out[2] = live; out[3] = stepLast; out[4] = quiet ? 0 : 1; out[5] = steps;
const evs = events.splice(0, events.length);
return { snap: out, ev: evs, stats: m.stats || edge || evs.length || steps % 20 === 0 || !sentOnce ? (sentOnce = true, stats()) : null };
};
const stats = () => { const quiet = !dirty && awakeNow === 0; if (quiet) { stepLast = 0; for (const g of groups.values()) g.ms = 0; }   // (a world in which everything sleeps costs nothing, and says so)
return {  bodies: live, awake: awakeNow, active: !quiet, steps, idleSteps, stepMs: stepLast, stepMean: mean(), stepP95: p95(), rejected, joints: joints.size, triggers: triggers.size, fields: fields.length, t: simT,
groups: Array.from(groups.values()).map((g) => ({ id: g.id, owner: g.owner, count: g.count, cap: g.cap, awake: g.awake, ms: +g.ms.toFixed(4), p95: +gp95(g).toFixed(4), throttled: g.throttled })) }; };
const gp95 = (g) => { if (!g.rn || quietNow()) return 0; const a = Array.from(g.ring.subarray(0, g.rn)).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * 0.95))]; };
const quietNow = () => !dirty && awakeNow === 0;
const dispose = () => {
if (disposed) return; disposed = true;
for (const id of Array.from(joints.keys())) killJoint(id);
for (let i = 0; i < nSlots; i++) drop(i, false);
for (const a of triggers.values()) { try { scene.removeActor(a); a.release(); } catch (e) {} }
for (const m of mats.values()) { try { m.release(); } catch (e) {} }
try { scene.release(); } catch (e) {} try { P.destroy(callback); P.destroy(fsImpl); P.destroy(sd); P.destroy(tmpV); P.destroy(tmpV2); P.destroy(tmpT); } catch (e) {}
byPtr.clear(); groups.clear(); triggers.clear(); mats.clear(); fields.length = 0;
};
return { frame, stats, dispose, cfg, size: state.length, HDR, STRIDE };
}
root.SpiritualLifeWorld = { create, HDR, STRIDE, FIXED };
})();
