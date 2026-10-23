// Wand-Laufflächen für Ameisen (4-1, Gegner-Agent): Datenformat, Abtasten und Ausrichten von Laufpfaden über Böden und
// senkrechte Wände. Nur Daten und Darstellungshilfe – das Verhalten (Laufen, Tragen der Figur, Umdrehen) baut der Gegner.
// Liegt bewusst außerhalb von types/ (die Registry sammelt nur types/*.js); der Baustein `ameisenweg` (types/w4_ants.js)
// legt benannte Pfade an und zeichnet auf Wunsch eine Ameisenspur.
//
// Datenformat (Level-Daten, alle Werte in Weltkoordinaten):
//   antpath: [[x, y, z, nx, ny, nz], …]   Fußpunkte auf der Lauffläche mit der Flächennormale (zeigt von der Fläche weg:
//            Boden [0, 1, 0], Vorderwand [0, 0, 1], Decke [0, −1, 0] …). Zwei aufeinanderfolgende Punkte an derselben
//            Stelle mit verschiedener Normale bilden eine Kante – dort kippt die Ameise (Normale wird über `round` m weich
//            überblendet). Ohne Normale ([x, y, z]) gilt [0, 1, 0].
//   oder { path: [...], loop: true }      loop: nach dem letzten Punkt zurück zum ersten (Rundweg)
//   oder 'id'                             benannter Pfad aus dem Baustein ameisenweg (level.named.get(id))
//
// API:
//   antPath(data, opts)          → Pfad { pts: [{ p, n }], segs, L, loop, round }   (data: Liste | { path, loop } | Pfad)
//   resolveAntPath(level, ref)   → Pfad oder null (ref: id | Liste | Objekt; Gegner: spec.antpath)
//   antPathAt(path, s, out)      → { pos, normal, tangent, s, face } bei Bogenlänge s (loop: s modulo L, sonst geklemmt);
//                                  face = Index des Punktes, dessen Fläche gilt
//   antOrient(normal, tangent, q) → Quaternion für ein Modell mit Blick +X und oben +Y (Fuß auf der Fläche)
//   placeOnAntPath(root, path, s, dir = 1)   Object3D an die Stelle s setzen und ausrichten (dir −1 = rückwärts laufend)
//   antPathOver({ pos, size }, { along: 'z', at, from: 3, to: 3 }) → Datenformat: über eine Wand/einen Block hinweg
//                                  (Boden davor → Vorderwand hoch → Oberseite → Rückwand runter → Boden dahinter)
//   antPathAround({ pos, size }, { along: 'z', at }) → Rundweg um den Block in der senkrechten Ebene (Vorderwand, Oberseite,
//                                  Rückwand, Unterseite) mit loop: true
// Beispiel (Gegner-Daten): { kind: 'ameisensoldat', antpath: 'wand1', speed: 2 } mit
//   { type: 'ameisenweg', id: 'wand1', over: { pos: [0, 1, -40], size: [4, 4, 2] }, at: 0.8 }

import * as THREE from 'three';

const UP = [0, 1, 0];

/** Datenformat → Pfad (Punkte mit Normalen, Bogenlänge). */
export function antPath(data, opts = {}) {
  if (data && data.pts && data.segs) return data;
  const list = Array.isArray(data) ? data : data?.path ?? [];
  const loop = !!(opts.loop ?? data?.loop);
  const pts = list.map((q) => ({
    p: new THREE.Vector3(q[0], q[1], q[2]),
    n: new THREE.Vector3(q[3] ?? UP[0], q[4] ?? UP[1], q[5] ?? UP[2]).normalize(),
  }));
  const segs = [];
  let L = 0;
  const n = pts.length;
  const last = loop ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = a.p.distanceTo(b.p);
    segs.push({ a, b, i, l, s0: L, corner: l < 1e-4 && a.n.dot(b.n) < 0.999 });
    L += l;
  }
  return { pts, segs, L, loop, round: opts.round ?? data?.round ?? 0.35 };
}

/** Pfad aus Gegner-/Level-Daten (id, Liste oder Objekt). */
export function resolveAntPath(level, ref) {
  if (!ref) return null;
  if (typeof ref === 'string') {
    const h = level?.named?.get(ref);
    return h?.path ?? null;
  }
  return antPath(ref);
}

const _n = new THREE.Vector3();

/** Lage auf dem Pfad bei Bogenlänge s. */
export function antPathAt(path, s, out = { pos: new THREE.Vector3(), normal: new THREE.Vector3(), tangent: new THREE.Vector3(), s: 0, face: 0 }) {
  const { segs, L } = path;
  if (!segs.length) {
    const p0 = path.pts[0];
    if (p0) { out.pos.copy(p0.p); out.normal.copy(p0.n); } else { out.pos.set(0, 0, 0); out.normal.set(0, 1, 0); }
    out.tangent.set(1, 0, 0); out.s = 0; out.face = 0;
    return out;
  }
  if (path.loop && L > 0) s = ((s % L) + L) % L; else s = Math.max(0, Math.min(L, s));
  out.s = s;
  // Segment mit Länge > 0 finden, das s enthält
  let k = segs.length - 1;
  for (let i = 0; i < segs.length; i++) { const g = segs[i]; if (g.l > 1e-4 && s <= g.s0 + g.l + 1e-9) { k = i; break; } }
  let g = segs[k];
  if (g.l <= 1e-4) { for (let i = segs.length - 1; i >= 0; i--) if (segs[i].l > 1e-4) { k = i; g = segs[i]; break; } }
  const t = g.l > 0 ? Math.max(0, Math.min(1, (s - g.s0) / g.l)) : 0;
  out.pos.copy(g.a.p).lerp(g.b.p, t);
  out.tangent.copy(g.b.p).sub(g.a.p).normalize();
  out.face = g.i;
  // Normale: die der Fläche (a.n); an Kanten (Null-Segmente direkt davor/danach) weich überblenden
  out.normal.copy(g.a.n);
  const r = path.round;
  const prev = segs[(k - 1 + segs.length) % segs.length], next = segs[(k + 1) % segs.length];
  if (prev && prev.corner && (k > 0 || path.loop)) {
    const d = s - g.s0;
    if (d < r) { const w = 0.5 + 0.5 * (d / r); _n.copy(prev.a.n).lerp(g.a.n, smooth01(w)); out.normal.copy(_n.normalize()); }
  }
  if (next && next.corner && (k < segs.length - 1 || path.loop)) {
    const d = g.s0 + g.l - s;
    if (d < r) { const w = 0.5 - 0.5 * (d / r); _n.copy(g.a.n).lerp(next.b.n, smooth01(w)); out.normal.copy(_n.normalize()); }
  }
  return out;
}

function smooth01(x) { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); }

const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();

/** Quaternion: Modell blickt nach +X (tangent), oben +Y (normal). */
export function antOrient(normal, tangent, q = new THREE.Quaternion()) {
  _y.copy(normal).normalize();
  _x.copy(tangent).addScaledVector(_y, -tangent.dot(_y));
  if (_x.lengthSq() < 1e-8) _x.set(1, 0, 0).addScaledVector(_y, -_y.x);
  _x.normalize();
  _z.crossVectors(_x, _y).normalize();
  _m.makeBasis(_x, _y, _z);
  return q.setFromRotationMatrix(_m);
}

const _at = { pos: new THREE.Vector3(), normal: new THREE.Vector3(), tangent: new THREE.Vector3(), s: 0, face: 0 };

/** Object3D an Stelle s auf den Pfad setzen und ausrichten (dir −1: läuft rückwärts). */
export function placeOnAntPath(root, path, s, dir = 1) {
  antPathAt(path, s, _at);
  root.position.copy(_at.pos);
  if (dir < 0) _at.tangent.negate();
  antOrient(_at.normal, _at.tangent, root.quaternion);
  return _at;
}

/** Wand/Block (pos = Mitte der Unterseite, size [w, h, d]) überqueren: Daten im antpath-Format. */
export function antPathOver(box, opts = {}) {
  const p = box.pos, s = box.size;
  const along = opts.along === 'x' ? 'x' : 'z';
  const from = opts.from ?? 3, to = opts.to ?? 3;
  const y0 = p[1], y1 = p[1] + s[1];
  if (along === 'z') {
    const x = opts.at ?? p[0], zf = p[2] + s[2] / 2, zb = p[2] - s[2] / 2;
    return [
      [x, y0, zf + from, 0, 1, 0], [x, y0, zf, 0, 1, 0], [x, y0, zf, 0, 0, 1], [x, y1, zf, 0, 0, 1], [x, y1, zf, 0, 1, 0],
      [x, y1, zb, 0, 1, 0], [x, y1, zb, 0, 0, -1], [x, y0, zb, 0, 0, -1], [x, y0, zb, 0, 1, 0], [x, y0, zb - to, 0, 1, 0],
    ];
  }
  const z = opts.at ?? p[2], xl = p[0] - s[0] / 2, xr = p[0] + s[0] / 2;
  return [
    [xl - from, y0, z, 0, 1, 0], [xl, y0, z, 0, 1, 0], [xl, y0, z, -1, 0, 0], [xl, y1, z, -1, 0, 0], [xl, y1, z, 0, 1, 0],
    [xr, y1, z, 0, 1, 0], [xr, y1, z, 1, 0, 0], [xr, y0, z, 1, 0, 0], [xr, y0, z, 0, 1, 0], [xr + to, y0, z, 0, 1, 0],
  ];
}

/** Rundweg um einen (schwebenden) Block in der senkrechten Ebene: { path, loop: true }. */
export function antPathAround(box, opts = {}) {
  const p = box.pos, s = box.size;
  const along = opts.along === 'x' ? 'x' : 'z';
  const y0 = p[1], y1 = p[1] + s[1];
  if (along === 'z') {
    const x = opts.at ?? p[0], zf = p[2] + s[2] / 2, zb = p[2] - s[2] / 2;
    return { loop: true, path: [
      [x, y0, zf, 0, 0, 1], [x, y1, zf, 0, 0, 1], [x, y1, zf, 0, 1, 0], [x, y1, zb, 0, 1, 0],
      [x, y1, zb, 0, 0, -1], [x, y0, zb, 0, 0, -1], [x, y0, zb, 0, -1, 0], [x, y0, zf, 0, -1, 0],
    ] };
  }
  const z = opts.at ?? p[2], xl = p[0] - s[0] / 2, xr = p[0] + s[0] / 2;
  return { loop: true, path: [
    [xl, y0, z, -1, 0, 0], [xl, y1, z, -1, 0, 0], [xl, y1, z, 0, 1, 0], [xr, y1, z, 0, 1, 0],
    [xr, y1, z, 1, 0, 0], [xr, y0, z, 1, 0, 0], [xr, y0, z, 0, -1, 0], [xl, y0, z, 0, -1, 0],
  ] };
}
