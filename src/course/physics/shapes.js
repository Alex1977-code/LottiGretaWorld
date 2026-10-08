// Formen der Kollisionswelt (Kurs-Modus): Normalisierung und Geometrie-Abfragen.
//
// Formen (Meter, Y oben):
//   box   { type:'box',  min:[x,y,z], max:[x,y,z] }                    achsenparalleler Quader
//   ramp  { type:'ramp', min, max, axis:'x'|'z', dir:+1|-1, low? }     Quader mit schräger Oberseite:
//          die Oberseite steigt entlang `axis` in Richtung `dir` von `low` (absolute Höhe, Standard min.y)
//          auf max.y an. Die Unterseite ist min.y, die Seiten sind senkrecht.
//   cyl   { type:'cyl',  x, z, r, y0, y1 }                              senkrechter Zylinder
// min/max dürfen Arrays oder {x,y,z}-Objekte sein.
//
// Flags (alle optional): solid (Standard true, außer bei water/kill/trigger ohne solid), oneWay,
// climbable, kill, water, bounce, conveyor {x,z}, ice, hit(callback), breakable, mover, owner,
// fromBelowOnly (unsichtbarer Block: nur von unten fest), trigger (nicht fest, nur für overlapAABB),
// boost {x,z,speed}, beanstalk, pipe, camIgnore (Kamera darf hindurch), noWallSlide.
//
// Intern bekommt jede Form numerische Grenzen x0..z1 (AABB) und – je Typ – Hilfswerte.

const vx = (v) => (Array.isArray(v) ? v[0] : v.x);
const vy = (v) => (Array.isArray(v) ? v[1] : v.y);
const vz = (v) => (Array.isArray(v) ? v[2] : v.z);

/** Rechnet die numerischen Grenzen einer Form (nach add/update). */
export function normalize(s) {
  if (s.type === 'cyl') {
    s.x0 = s.x - s.r; s.x1 = s.x + s.r;
    s.z0 = s.z - s.r; s.z1 = s.z + s.r;
    s.top = s.y1;
    s.bot = s.y0;
  } else {
    if (!s.min || !s.max) throw new Error(`Form ${s.type} braucht min/max`);
    s.x0 = Math.min(vx(s.min), vx(s.max)); s.x1 = Math.max(vx(s.min), vx(s.max));
    s.y0 = Math.min(vy(s.min), vy(s.max)); s.y1 = Math.max(vy(s.min), vy(s.max));
    s.z0 = Math.min(vz(s.min), vz(s.max)); s.z1 = Math.max(vz(s.min), vz(s.max));
    s.top = s.y1;
    s.bot = s.y0;
    if (s.type === 'ramp') {
      s.axis = s.axis === 'x' ? 'x' : 'z';
      s.dir = s.dir < 0 ? -1 : 1;
      s.lowY = s.low ?? s.y0;
      const len = s.axis === 'x' ? s.x1 - s.x0 : s.z1 - s.z0;
      s.slope = (s.y1 - s.lowY) / Math.max(1e-6, len); // tan(Neigung)
      s.steep = s.slope > 1.2;                           // > 50°: nicht begehbar (wirkt bergauf als Wand)
    } else {
      s.type = 'box';
    }
  }
  if (s.solid === undefined) s.solid = !(s.water || s.kill || s.trigger || s.beanstalk);
  return s;
}

/** Höhe der Oberseite an (x, z) – bei Rampen am auf die Grundfläche geklemmten Punkt. */
export function topAt(s, x, z) {
  if (s.type !== 'ramp') return s.top;
  let t;
  if (s.axis === 'x') t = (Math.min(s.x1, Math.max(s.x0, x)) - s.x0) / Math.max(1e-6, s.x1 - s.x0);
  else t = (Math.min(s.z1, Math.max(s.z0, z)) - s.z0) / Math.max(1e-6, s.z1 - s.z0);
  if (s.dir < 0) t = 1 - t;
  return s.lowY + (s.y1 - s.lowY) * t;
}

/** Liegt der Punkt (x, z) auf der Grundfläche? */
export function containsXZ(s, x, z, eps = 0) {
  if (s.type === 'cyl') { const dx = x - s.x, dz = z - s.z; return dx * dx + dz * dz <= (s.r + eps) * (s.r + eps); }
  return x >= s.x0 - eps && x <= s.x1 + eps && z >= s.z0 - eps && z <= s.z1 + eps;
}

/** Überlappt die Grundfläche das Rechteck [cx±hx] × [cz±hz] (mit Mindestüberlappung eps)? */
export function overlapXZ(s, cx, cz, hx, hz, eps = 1e-5) {
  if (s.type === 'cyl') {
    const px = Math.max(cx - hx, Math.min(s.x, cx + hx));
    const pz = Math.max(cz - hz, Math.min(s.z, cz + hz));
    const dx = px - s.x, dz = pz - s.z;
    const r = s.r - eps;
    return dx * dx + dz * dz < r * r;
  }
  return cx + hx > s.x0 + eps && cx - hx < s.x1 - eps && cz + hz > s.z0 + eps && cz - hz < s.z1 - eps;
}

/** Oberseite unter einem Rechteck (Rampe: am Mittelpunkt, auf die Form geklemmt). */
export function topUnder(s, cx, cz) {
  return s.type === 'ramp' ? topAt(s, cx, cz) : s.top;
}

/** Steigung der Rampe (Höhe je Meter) in Bewegungsrichtung (dx, dz) – positiv = bergauf. */
export function rampRise(s, dx, dz) {
  if (s.type !== 'ramp') return 0;
  const along = s.axis === 'x' ? dx : dz;
  return along * s.dir * s.slope;
}

/** Normale der Oberseite (für Hangrutschen): {x, y, z} normiert. */
export function surfaceNormal(s, out = { x: 0, y: 1, z: 0 }) {
  if (s.type !== 'ramp') { out.x = 0; out.y = 1; out.z = 0; return out; }
  const k = s.slope;
  const inv = 1 / Math.sqrt(1 + k * k);
  out.x = s.axis === 'x' ? -s.dir * k * inv : 0;
  out.z = s.axis === 'z' ? -s.dir * k * inv : 0;
  out.y = inv;
  return out;
}

/** Schnittpunkt eines Strahls mit der AABB der Form (Slab-Test); liefert t in [0, 1] oder -1. */
export function segmentAABB(s, ax, ay, az, bx, by, bz) {
  let t0 = 0, t1 = 1;
  const d = [bx - ax, by - ay, bz - az];
  const o = [ax, ay, az];
  const lo = [s.x0, s.bot, s.z0], hi = [s.x1, s.top, s.z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return -1;
    } else {
      let ta = (lo[i] - o[i]) / d[i], tb = (hi[i] - o[i]) / d[i];
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return -1;
    }
  }
  return t0;
}
