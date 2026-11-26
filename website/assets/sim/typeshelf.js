// Spiritual [life] sim/typeshelf: the pure part of the title as a physical surface (assets/life-typeshelf.js mounts it). A few petals fall through the home's
// opening, land on the tops of the words of its title and its tagline, rest there, slide off and fade. The words are real PhysX static boxes (one box per word,
// measured from the page's own text), the petals are real PhysX rigid bodies (thin boxes held to the plane of the page with a real PhysX lock flag), and the air
// they fall through is our own JavaScript force on them (assets/sim/life-world.js, the 'plate' field: PhysX has no air). Nothing is drawn here: this file only
// does the arithmetic (which boxes, how a petal is turned into a CSS matrix, how hard to nudge a resting petal toward the nearer end of its word).
// The world: metres, x to the right, y up, origin at the top-left of the opening; one metre is 200 css pixels (a petal is about 18 px across).
export const PPM = 200, G = 9.81;
export const PETAL = { hx: 0.05, hy: 0.0015, hz: 0.03, density: 300, damp: [0.02, 0.15], sleep: 0.003, mat: [0.4, 0.26, 0], life: 16, fadeIn: 0.5, fadeOut: 1.6, cell: 24, tilt: 0.75, lift: 5 };   // tilt: the camera looks down by this many radians; lift: css px the shelf sits above the ink, the petal's own apparent depth
export const BOX_CAP = 20, PETAL_CAP = 10;
export const FIELD = { kind: 'plate', dir: [1, 0, 0], kn: 30, kt: 6, torque: 1200, noise: 300, curl: { amp: 0.1, speed: 1 }, gustAdd: 2.5, wake: 4 };
const mass = () => PETAL.density * 8 * PETAL.hx * PETAL.hy * PETAL.hz;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// css px (host coordinates) <-> world metres
export const toWorld = (x, y, o) => { o[0] = x / PPM; o[1] = -y / PPM; return o; };

// the boxes from the measured words: { x, y, w, h } in css px (the ink box: top at the top of the glyphs, bottom on the baseline). At most BOX_CAP, the highest
// lines first (a petal meets them first anyway), and any box too small to hold a petal's footprint is dropped.
export function pickBoxes(words, cap = BOX_CAP) {
  const ok = words.filter((w) => w.w >= 10 && w.h >= 4 && isFinite(w.x + w.y + w.w + w.h));
  ok.sort((a, b) => a.y - b.y || a.x - b.x); return ok.slice(0, cap);
}
// a box as a PhysX static box: centre and half sizes in metres, at least 3 cm thick (it reaches down into the word, so a petal can never pass through)
export const boxSpec = (b) => { const hh = Math.max(0.03, b.h / 2 / PPM), top = -(b.y - PETAL.lift) / PPM; return { pos: [(b.x + b.w / 2) / PPM, top - hh, 0], half: [b.w / 2 / PPM, hh, 0.3] }; };

// where and how a petal starts: above one of the boxes, inside its width, high enough to take a second or two to fall (never above the page's header)
export function startAbove(box, top, rnd, boxes) {
  const x = box.x + 14 + rnd() * Math.max(1, box.w - 28);
  // high enough to take a second or two to fall, never above the header, and never inside another word: below any box in the same column that is above the target
  let y = Math.max(top, box.y - 190 - rnd() * 40);
  for (const o of boxes) if (o !== box && x > o.x - 6 && x < o.x + o.w + 6 && o.y + o.h <= box.y + 2 && o.y - 40 < y && o.y + o.h + 30 > y) y = o.y + o.h + 30;
  const yaw = rnd() * Math.PI * 2, tx = (rnd() - 0.5) * 0.9, tz = (rnd() - 0.5) * 0.9;
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), cx = Math.cos(tx / 2), sx = Math.sin(tx / 2), cz = Math.cos(tz / 2), sz = Math.sin(tz / 2);   // yaw about y, then a tilt about x and z
  const rw = cx * cz, rx = sx * cz, ry = -sx * sz, rz = cx * sz;
  return { x, y, quat: [cy * rx + sy * rz, cy * ry + sy * rw, cy * rz - sy * rx, cy * rw - sy * ry] };
}

// how fast to push a resting petal along its word so that it reaches the nearer end and slides off it: Coulomb friction stops it after v^2 / (2 mu g)
export function shove(px, box) {
  const wx = px / PPM, l = box.x / PPM, r = (box.x + box.w) / PPM, dl = wx - l, dr = r - wx, dir = dl < dr ? -1 : 1, d = Math.min(dl, dr), mu = PETAL.mat[1];
  const v = clamp(Math.sqrt(2 * mu * G * (d + 0.05)) * 1.7 + 0.35, 0.4, 2.0);
  return { dir, v, impulse: [dir * v * mass(), 0.0004, 0] };
}

// a petal's quaternion and position (world metres) as a CSS matrix3d for an element of PETAL.cell x (cell * 0.68) pixels whose centre is the origin:
// the element's right is the petal's local x, its down is the petal's local z, seen by a camera that looks down by PETAL.tilt radians
export function petalMatrix(q, wx, wy, out) {
  const x = q[0], y = q[1], z = q[2], w = q[3], ct = Math.cos(PETAL.tilt), st = Math.sin(PETAL.tilt);
  const ex = [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)], ez = [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)];   // the local x and z in the world
  const sx = (2 * PETAL.hx * PPM) / PETAL.cell, sz = (2 * PETAL.hz * PPM) / (PETAL.cell * 0.7);
  // screen (css px, y down): X -> X, Y -> -Y cos(t) , Z -> Z sin(t) ... a vector (a, b, c) of the world lands at (a, -b cos t + c sin t)
  out[0] = ex[0] * sx; out[1] = (-ex[1] * ct + ex[2] * st) * sx; out[2] = 0; out[3] = 0;
  out[4] = ez[0] * sz; out[5] = (-ez[1] * ct + ez[2] * st) * sz; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
  out[12] = wx * PPM; out[13] = -wy * PPM + 0; out[14] = 0; out[15] = 1;
  return out;
}
export const alphaAt = (age) => Math.min(1, age / PETAL.fadeIn) * (1 - clamp((age - (PETAL.life - PETAL.fadeOut)) / PETAL.fadeOut, 0, 1));
