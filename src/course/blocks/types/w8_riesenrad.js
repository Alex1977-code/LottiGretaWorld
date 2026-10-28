// Welt-8-Baustein Riesenrad (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-Burg „Riesenrad (ca. 30 m Durchmesser):
// Plattformen mit 4 Schubsern; Seilbahn weiter“).
//
// riesenrad – großes Rad, das sich langsam um seine waagerechte Achse dreht. An den Speichen hängen waagerechte Gondel-Plattformen
//   (bleiben immer waagerecht), die Figuren und Gegner tragen und mitnehmen – Schubser (schubser) stehen darauf und fahren mit.
//   Kranz mit Glühbirnen (Lauflicht), Nabe mit Brummbär-Stern, Ständer bis zum Boden.
//   { type: 'riesenrad', id, pos: [x, y, z] (Achsmitte), radius: 12, gondolas: 8, axis: 'z' (Rad steht quer: Ebene XY, Blick
//     von der Kamera aufs Rad) | 'x' (Ebene YZ), speed: 0.12 (rad/s; + = gegen den Uhrzeigersinn, von +Achse gesehen),
//     angle: 0, size: [3.2, 0.45, 2.6] (Gondel-Plattform w, h, d), hang: 1.4 (m unter dem Aufhängepunkt), stand: true
//     (Ständer bis ground), ground: y (Standard pos.y − radius − 2), lights: true, idle: false, look: 'eigen' }
//   level.named.get(id) = { angle, speed, gondolas: [{ mb, x, y, z }], carried() (Figuren auf Gondeln), start(), stop(),
//     reverse(), info() }; w8(level).wheels. Kollision: Gondeln als MovingBox (mover, tag 'riesenrad-gondel').
//   Modelle: Registry 'riesenrad' (Rad mit Ständer, ohne Gondeln: { radius, spokes, stand, height (Achshöhe über ground) },
//   Ursprung Achsmitte, Achse lokal Z; state { angle }) und 'riesenrad_gondel' ({ size: [w, h, d] }, Ursprung Mitte der
//   Unterseite) – sonst eigene Geometrie.
//   Beispiel: { type: 'riesenrad', id: 'rad', pos: [0, 14, -150], radius: 12, gondolas: 8, speed: 0.12 }

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex, addObject, addStatic } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { w8, figures, regModel, stdMat, TAU } from '../w8kit.js';

const GONDOLA_COLORS = [0xff5a6a, 0xffc23a, 0x5ad0ff, 0x8ae05a, 0xc87aff, 0xff9a3a];
const C = (h) => lin(hex(h));

function rod(a, b, r, col, seg = 6) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  const c = C(col), dk = mixc(c, [0, 0, 0], 0.35, [0, 0, 0]);
  return colorize(g.toNonIndexed(), (p, n, o) => mixc(dk, c, smooth(-0.6, 0.8, n.y * 0.6 + n.z * 0.4), o));
}

/** Rad (lokal: Achse Z, Ursprung Achsmitte): Doppelkranz, Speichen, Nabe; Glühbirnen getrennt (leuchtend). */
function wheelGeo(R, spokes, depth) {
  const parts = [], bulbs = [];
  for (const z of [-depth / 2, depth / 2]) {
    const rim = new THREE.TorusGeometry(R, 0.18, 6, 64);
    rim.translate(0, 0, z);
    parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(C(0xb83a6a), C(0xff8ab8), smooth(-0.5, 0.9, n.y * 0.5 + n.z * 0.5), o)));
    const inner = new THREE.TorusGeometry(R * 0.55, 0.1, 5, 40);
    inner.translate(0, 0, z);
    parts.push(colorize(inner.toNonIndexed(), (p, n, o) => mixc(C(0x3a4ab8), C(0x8a9aff), smooth(-0.5, 0.9, n.y), o)));
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * TAU;
      parts.push(rod([0, 0, z], [Math.cos(a) * R, Math.sin(a) * R, z], 0.08, 0xf0e8f8));
      // Kreuzstreben zwischen den Speichen
      const b = ((i + 0.5) / spokes) * TAU;
      parts.push(rod([Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, z], [Math.cos(b) * R, Math.sin(b) * R, z], 0.05, 0xd8c8e8));
    }
  }
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * TAU;
    parts.push(rod([Math.cos(a) * R, Math.sin(a) * R, -depth / 2], [Math.cos(a) * R, Math.sin(a) * R, depth / 2], 0.09, 0xffd23a));
  }
  const hub = new THREE.CylinderGeometry(R * 0.08 + 0.4, R * 0.08 + 0.4, depth + 0.6, 16);
  hub.rotateX(Math.PI / 2);
  parts.push(colorize(hub.toNonIndexed(), (p, n, o) => mixc(C(0x8a6a2a), C(0xffd23a), smooth(-0.5, 0.9, n.y * 0.5 + Math.abs(n.z) * 0.5), o)));
  // Stern auf der Nabe (Kamera-Seite)
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 0.32 : 0.75; if (k) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const star = new THREE.ShapeGeometry(sh);
  star.translate(0, 0, depth / 2 + 0.32);
  bulbs.push(colorize(star.toNonIndexed(), (p, n, o) => { const c = C(0xfff0a0); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  return { body: merge(parts), star: merge(bulbs) };
}

export function buildRiesenrad(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 12;
  const n = Math.max(2, spec.gondolas ?? 8);
  const axis = spec.axis === 'x' ? 'x' : 'z';
  const gs = sz3(spec.size, [3.2, 0.45, 2.6]);
  const hang = spec.hang ?? 1.4;
  const groundY = spec.ground ?? p.y - R - 2;
  const st = { angle: spec.angle ?? 0, speed: spec.speed ?? 0.12, running: !spec.idle };
  // Gondel-Lage zum Winkel a (Ebene der Drehung: X-Y bei axis 'z', Z-Y bei axis 'x')
  const place = (a) => {
    const u = Math.cos(a) * R, v = Math.sin(a) * R;
    return axis === 'z' ? { x: p.x + u, y: p.y + v - hang, z: p.z } : { x: p.x, y: p.y + v - hang, z: p.z - u };
  };
  const gondolas = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    const q = place(a0 + st.angle);
    const mb = new MovingBox(level, q.x, q.y, q.z, gs.x, gs.y, gs.z, { tag: 'riesenrad-gondel' });
    gondolas.push({ a0, mb, i });
  }
  const handle = {
    get angle() { return st.angle; }, get speed() { return st.speed; }, gondolas, radius: R, axis,
    carried: () => gondolas.reduce((s, g) => s + g.mb.carried(level), 0),
    start() { st.running = true; }, stop() { st.running = false; }, reverse() { st.speed = -st.speed; },
    info: () => ({ angle: +st.angle.toFixed(3), speed: st.speed, gondolas: gondolas.map((g) => [+g.mb.pos.x.toFixed(2), +g.mb.pos.y.toFixed(2), +g.mb.pos.z.toFixed(2)]), carried: handle.carried() }),
  };
  for (const g of gondolas) g.mb.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).wheels.push(handle);
  level.onStep((dt) => {
    if (st.running) st.angle += st.speed * dt;
    for (const g of gondolas) { const q = place(g.a0 + st.angle); g.mb.moveTo(q.x, q.y, q.z, dt); }
  });

  if (!level.view) return handle;
  // ---------------- Darstellung
  const depth = Math.max(1.2, gs.z * 0.6);
  const root = new THREE.Group();
  root.name = 'riesenrad';
  root.position.set(p.x, p.y, p.z);
  if (axis === 'x') root.rotation.y = Math.PI / 2;
  const spin = new THREE.Group();
  root.add(spin);
  let model = null;
  if (regModel(spec, 'riesenrad')) {
    model = getModel('riesenrad', { radius: R, spokes: n, stand: spec.stand !== false, height: p.y - groundY });
    root.add(model.root);
  } else {
    const g = wheelGeo(R, n, depth);
    const body = new THREE.Mesh(g.body, stdMat('w8rad', { roughness: 0.5, metalness: 0.2 }));
    body.castShadow = true;
    spin.add(body);
    if (g.star) spin.add(new THREE.Mesh(g.star, level.view.mats.glow));
    // Ständer (statisch): zwei A-Böcke vor und hinter dem Rad
    if (spec.stand !== false) {
      const sp = [];
      const H = p.y - groundY;
      for (const z of [-depth / 2 - 0.5, depth / 2 + 0.5]) {
        for (const sx of [-1, 1]) {
          const a = [0, 0, z], b = [sx * H * 0.45, -H, z];
          const g2 = rod(a, b, 0.22, 0x6a4a8a, 7);
          sp.push(g2);
        }
        sp.push(rod([-H * 0.25, -H * 0.55, z], [H * 0.25, -H * 0.55, z], 0.12, 0x6a4a8a));
      }
      const sg = merge(sp);
      if (axis === 'x') sg.rotateY(Math.PI / 2);
      sg.translate(p.x, p.y, p.z);
      addStatic(level, sg);
    }
  }
  // Glühbirnen am Kranz (eine InstancedMesh, Lauflicht über die Farbe je Instanz)
  let bulbs = null;
  const NB = spec.lights === false ? 0 : Math.round(R * 4);
  if (NB) {
    bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NB * 2);
    const M = new THREE.Matrix4();
    let k = 0;
    for (const z of [-depth / 2, depth / 2]) for (let i = 0; i < NB; i++) {
      const a = (i / NB) * TAU;
      M.makeTranslation(Math.cos(a) * (R + 0.22), Math.sin(a) * (R + 0.22), z);
      bulbs.setMatrixAt(k++, M);
    }
    bulbs.frustumCulled = false;
    spin.add(bulbs);
  }
  // Gondeln: Plattform + Aufhängung (InstancedMesh je Teil)
  const plat = [];
  let gm = null;
  if (regModel(spec, 'riesenrad_gondel')) {
    gm = gondolas.map(() => { const m = getModel('riesenrad_gondel', { size: [gs.x, gs.y, gs.z] }); level.view.add(m.root); return m; });
  } else {
    for (let i = 0; i < Math.min(n, GONDOLA_COLORS.length); i++) {
      const col = GONDOLA_COLORS[i];
      const parts = [];
      const base = new THREE.BoxGeometry(gs.x, gs.y, gs.z);
      base.translate(0, gs.y / 2, 0);
      parts.push(colorize(base.toNonIndexed(), (q, nn, o) => (nn.y > 0.5 ? mixc(C(col), [1, 1, 1], 0.25, o) : mixc(C(col), [0, 0, 0], 0.25, o))));
      // Geländer an der Rückseite und Bügel zum Aufhängepunkt
      const rail = new THREE.BoxGeometry(gs.x, 0.5, 0.08);
      rail.translate(0, gs.y + 0.25, -gs.z / 2 + 0.06);
      parts.push(colorize(rail.toNonIndexed(), (q, nn, o) => { const c = C(0xf6f0ff); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
      for (const sx of [-1, 1]) parts.push(rod([sx * gs.x * 0.45, gs.y, -gs.z * 0.3], [0, hang, -gs.z * 0.3], 0.05, 0xd8d0e8));
      const roof = new THREE.ConeGeometry(gs.x * 0.35, 0.45, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(0, hang + 0.2, -gs.z * 0.3);
      parts.push(colorize(roof.toNonIndexed(), (q, nn, o) => mixc(C(col), [1, 1, 1], 0.4, o)));
      plat.push(merge(parts));
    }
  }
  const gMeshes = plat.map((g) => {
    const cnt = Math.ceil(n / plat.length);
    const im = new THREE.InstancedMesh(g, stdMat('w8gondel', { roughness: 0.45 }), cnt);
    im.castShadow = true;
    im.frustumCulled = false;
    level.view.add(im);
    return im;
  });
  const M = new THREE.Matrix4(), col = new THREE.Color(), hold = {};
  let t = 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, hold, dt);
    t += d;
    spin.rotation.z = axis === 'z' ? st.angle : st.angle;
    model?.update?.(d, { angle: st.angle });
    if (bulbs) {
      for (let i = 0; i < bulbs.count; i++) {
        const on = ((i + Math.floor(t * 6)) % 4) < 2;
        col.setHex(on ? (i % 3 === 0 ? 0xfff0a0 : i % 3 === 1 ? 0xff8ac8 : 0x9af0ff) : 0x6a5a40);
        bulbs.setColorAt(i, col);
      }
      bulbs.instanceColor.needsUpdate = true;
    }
    if (gm) gondolas.forEach((g, i) => { gm[i].root.position.set(g.mb.pos.x, g.mb.pos.y, g.mb.pos.z); if (axis === 'x') gm[i].root.rotation.y = Math.PI / 2; });
    else {
      const cnt = new Array(gMeshes.length).fill(0);
      for (const g of gondolas) {
        const k = g.i % gMeshes.length;
        M.makeRotationY(axis === 'x' ? Math.PI / 2 : 0);
        M.setPosition(g.mb.pos.x, g.mb.pos.y, g.mb.pos.z);
        gMeshes[k].setMatrixAt(cnt[k]++, M);
      }
      gMeshes.forEach((im, k) => { im.count = cnt[k]; im.instanceMatrix.needsUpdate = true; });
    }
  });
  return handle;
}

export const TYPES = { riesenrad: buildRiesenrad };
