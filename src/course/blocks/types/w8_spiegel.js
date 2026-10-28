// Welt-8-Baustein großer Spiegel (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-6 „großer Spiegel“, Stern 1: „Spiegelbild
// im großen Spiegel“).
//
// grosser_spiegel – großer Wandspiegel mit Goldrahmen: zeigt ein echtes Spiegelbild der Szene (Figuren, Gegner, Raum; eigene
//   Kamera, die an der Spiegelebene gespiegelt wird). Dazu eine „Spiegelwelt“: Dinge, die NUR im Spiegel zu sehen sind – ein
//   grüner Stern (im Raum unsichtbar, aber einsammelbar) und begehbare Platten/Stufen, die im Raum unsichtbar sind
//   (Zeichen-Ebene 5, die nur die Spiegelkamera sieht). Ist die Kamera weiter als `near` m entfernt (oder blickt sie auf die
//   Rückseite), zeichnet der Spiegel nicht (matte Silberfläche) – spart den zweiten Durchgang.
//   { type: 'grosser_spiegel', id, pos: [x, y, z] (Mitte der Unterkante der Spiegelfläche), size: [w, h] (Standard [6, 4]),
//     dir: [dx, dz] (Blickrichtung der Spiegelfläche; Standard [0, 1] = zur Kamera, +Z) | yaw, frame: true, res: 512 (Pixel
//     der längeren Seite), tint: 0xc8d8e8, near: 30, star: id (Stern aus LEVEL.stars mit { pos, id }) | { index, pos }
//     (wird hier erzeugt), parts: [{ pos, size }] (nur im Spiegel sichtbare, begehbare Platten), solid: true (Wand hinter dem
//     Spiegel 0,3 m tief, Kollision), reach: 24 (m – der Spiegel-Durchgang zeichnet nur, was so nah am Spiegel und vor ihm
//     liegt), look: 'eigen' }
//   level.named.get(id) = { active (zeichnet gerade), renders (Zahl der Spiegel-Durchgänge), star (Entität | null), parts,
//     inFront(x, z) (liegt der Punkt vor der Spiegelfläche?), mirror(x, y, z) → Spiegelpunkt, info() }; w8(level).mirrors.
//   MIRROR_LAYER (5): eigene Spiegelwelt-Objekte (z. B. ein Gegner, der nur im Spiegel zu sehen ist): obj.traverse(o =>
//   o.layers.set(MIRROR_LAYER)).
//   Modell: Registry 'spukspiegel' (violett-goldener Schnörkelrahmen mit Geisterkopf-Krone und Kerzen, Glas 2,2 × 3,05 m mit
//   rundem Bogen oben; state { star: false, glow: 1 }) – gleichmäßig auf die Glashöhe size[1] skaliert (s = h / 3,05), die
//   Glasbreite ist dann 0,72·h (size[0] gilt nicht); die Spiegelfläche hat dieselbe Bogenform, Sockel und Löwenfüße reichen
//   unter pos.y (1,05·s; im Boden versenkt – sichtbar mit pos.y = Boden + 1,05·s). Sonst (bzw. look: 'eigen') eigener
//   rechteckiger Goldrahmen mit Ornamenten.
//   Beispiel: { type: 'grosser_spiegel', id: 'spiegel', pos: [0, 0, -120], size: [7, 4.5], star: 'spiegelstern',
//              parts: [{ pos: [3, 1.2, -116], size: [1.4, 0.3, 1.4] }] }

import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex, box, addObject } from '../kit.js';
import { getModel } from '../../models/index.js';
import { w8, regModel, stdMat } from '../w8kit.js';

export const MIRROR_LAYER = 5;
const _c = new THREE.Vector3(), _n = new THREE.Vector3(), _s = new THREE.Sphere();

/** Goldrahmen (lokal: Spiegelfläche in der XY-Ebene, Blick +Z, Ursprung Mitte Unterkante). */
function frameGeo(w, h) {
  const gold = lin(hex(0xe8b84a)), goldHi = lin(hex(0xfff0a8)), goldLo = lin(hex(0x8a5a1a));
  const parts = [];
  const T = 0.32, D = 0.28;
  const col = (g) => colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(goldLo, gold, smooth(-0.6, 0.6, n.z * 0.7 + n.y * 0.3), o));
  parts.push(col(box(w + T * 2, T, D, 0, -T / 2, 0, 0xe8b84a, { r: 0.08 })));
  parts.push(col(box(w + T * 2, T, D, 0, h + T / 2, 0, 0xe8b84a, { r: 0.08 })));
  parts.push(col(box(T, h, D, -w / 2 - T / 2, h / 2, 0, 0xe8b84a, { r: 0.08 })));
  parts.push(col(box(T, h, D, w / 2 + T / 2, h / 2, 0, 0xe8b84a, { r: 0.08 })));
  // Krone oben: Bogen mit Kugeln und einem Herz
  const arch = new THREE.TorusGeometry(Math.min(1.2, w * 0.22), 0.1, 6, 20, Math.PI);
  arch.translate(0, h + T, 0);
  parts.push(col(arch));
  for (const x of [-w / 2 - T / 2, w / 2 + T / 2]) for (const y of [-T / 2, h + T / 2]) {
    const b = new THREE.SphereGeometry(0.22, 10, 8);
    b.translate(x, y, 0.08);
    parts.push(colorize(b.toNonIndexed(), (p, n, o) => mixc(gold, goldHi, smooth(0, 1, n.z * 0.6 + n.y * 0.4), o)));
  }
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.25); heart.bezierCurveTo(0.45, 0.05, 0.25, 0.4, 0, 0.18); heart.bezierCurveTo(-0.25, 0.4, -0.45, 0.05, 0, -0.25);
  const hg = new THREE.ExtrudeGeometry(heart, { depth: 0.08, bevelEnabled: false });
  hg.translate(0, h + T + Math.min(1.2, w * 0.22) * 0.4, D / 2 - 0.04);
  parts.push(colorize(hg.index ? hg.toNonIndexed() : hg, (p, n, o) => mixc(lin(hex(0xc8304a)), lin(hex(0xff7a9a)), smooth(-0.2, 1, n.z), o)));
  // Rückwand
  parts.push(colorize(box(w + T * 2, h + T * 2, 0.08, 0, h / 2, -D / 2, 0x4a2a1a, { r: 0.02, seg: 0 }), (p, n, o) => { const c = lin(hex(0x4a2a1a)); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  return merge(parts);
}

export function buildGrosserSpiegel(level, spec) {
  const p = v3(spec.pos);
  const [w0, h] = spec.size ?? [6, 4];
  // Mit Modell: Glas wie im Spukspiegel (2,2 × 3,05, Bogen oben), gleichmäßig auf die Höhe skaliert
  const useModel = spec.frame !== false && regModel(spec, 'spukspiegel');
  const ms = h / 3.05;
  const w = useModel ? 2.2 * ms : w0;
  let dx = 0, dz = 1;
  if (Array.isArray(spec.dir)) { dx = spec.dir[0]; dz = spec.dir[1]; } else if (typeof spec.yaw === 'number') { dx = Math.cos(spec.yaw); dz = -Math.sin(spec.yaw); }
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const yaw = Math.atan2(dx, dz);   // Drehung um Y: lokal +Z → (dx, dz)
  const st = { active: false, renders: 0, star: null, resolved: false };
  // Kollision: dünne Wand hinter der Fläche (Figuren laufen nicht hindurch)
  if (spec.solid !== false) {
    const D = 0.3, cxw = p.x - dx * D / 2, czw = p.z - dz * D / 2;
    const hx = (Math.abs(dz) * w + Math.abs(dx) * D) / 2 + 0.3 * Math.abs(dz), hz = (Math.abs(dx) * w + Math.abs(dz) * D) / 2 + 0.3 * Math.abs(dx);
    level.world.add({ type: 'box', min: [cxw - hx, p.y, czw - hz], max: [cxw + hx, p.y + h, czw + hz], tag: 'spiegel' });
  }
  // Spiegelwelt: begehbare Platten (unsichtbar im Raum)
  const parts = (spec.parts ?? []).map((q) => {
    const pp = v3(q.pos), s = sz3(q.size, [1.4, 0.3, 1.4]);
    const shape = { type: 'box', min: [pp.x - s.x / 2, pp.y, pp.z - s.z / 2], max: [pp.x + s.x / 2, pp.y + s.y, pp.z + s.z / 2], tag: 'spiegelwelt' };
    level.world.add(shape);
    return { pos: pp, size: s, shape };
  });
  const mirror = (x, y, z) => { const d = (x - p.x) * dx + (z - p.z) * dz; return [x - 2 * d * dx, y, z - 2 * d * dz]; };
  const handle = {
    get active() { return st.active; }, get renders() { return st.renders; }, get star() { return st.star; }, parts,
    inFront: (x, z) => (x - p.x) * dx + (z - p.z) * dz > 0, mirror,
    info: () => ({ active: st.active, renders: st.renders, calls: st.lastCalls ?? 0, star: st.star ? { collected: !!st.star.removed || !st.star.alive, layer: MIRROR_LAYER } : null, parts: parts.length }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).mirrors.push(handle);

  /** Stern der Spiegelwelt finden/erzeugen und auf die Spiegel-Ebene legen (einmal, sobald er existiert). */
  const resolveStar = () => {
    if (st.resolved || spec.star === undefined || spec.star === null) return;
    let e = null;
    if (typeof spec.star === 'string') e = level.entities.find((q) => q.kind === 'star' && q.spec?.id === spec.star) ?? null;
    else if (typeof spec.star === 'object') e = level.spawn('star', { pos: spec.star.pos, index: spec.star.index ?? 0, instancing: false });
    if (!e) return;
    st.resolved = true;
    st.star = e;
    e.instancing = false;
    e.shadowVisible = false;
    const hideIn = () => e.model?.root?.traverse((o) => { o.layers.set(MIRROR_LAYER); });
    hideIn();
    st.layerFix = hideIn;
  };
  level.onStep(() => { if (!st.resolved) resolveStar(); });
  if (!level.view) return handle;

  // ---------------- Darstellung
  const view = level.view;
  const root = new THREE.Group();
  root.name = 'grosser_spiegel';
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = yaw;
  let frameModel = null;
  if (useModel) {
    frameModel = getModel('spukspiegel');
    frameModel.root.scale.setScalar(ms);
    frameModel.root.rotation.y = -Math.PI / 2;   // Modell blickt +X → lokal +Z
    frameModel.root.position.y = -1.05 * ms;     // Glas-Unterkante (Modell: 0,9 + 0,15) auf pos.y
    root.add(frameModel.root);
  } else if (spec.frame !== false) {
    const fm = new THREE.Mesh(frameGeo(w, h), stdMat('w8spiegel', { roughness: 0.35, metalness: 0.6 }));
    fm.castShadow = true; fm.receiveShadow = true;
    root.add(fm);
  }
  const res = spec.res ?? 512;
  const tw = w >= h ? res : Math.round(res * w / h), th = h >= w ? res : Math.round(res * h / w);
  // Spiegelfläche: Rechteck bzw. (Modell) Bogenform des Spukspiegel-Glases, Unterkante bei y = 0
  let glassGeo;
  if (useModel) {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, 0);
    glassGeo = new THREE.ShapeGeometry(sh, 24);
    glassGeo.translate(0, -h / 2, 0);
  } else glassGeo = new THREE.PlaneGeometry(w, h);
  const refl = new Reflector(glassGeo, { textureWidth: tw, textureHeight: th, color: hex(spec.tint, 0xc8d8e8), multisample: 0, clipBias: 0.003 });
  refl.position.set(0, h / 2, useModel ? 0.04 * ms : 0.02);
  refl.renderOrder = 1;
  root.add(refl);
  // Spiegelkamera sieht zusätzlich die Spiegelwelt (Ebene 5); Zeichenzahl des zweiten Durchgangs zur Bild-Statistik addieren
  const origCam = refl.getReflectionCamera.bind(refl);
  refl.getReflectionCamera = (cam) => { const rc = origCam(cam); rc.layers.mask = cam.layers.mask; rc.layers.enable(MIRROR_LAYER); return rc; };
  // Spiegel-Durchgang sparsam: alles, was weiter als reach m vom Spiegel entfernt ist oder ganz hinter der Spiegelebene liegt,
  // zeichnet die Spiegelkamera nicht (Zeichenaufrufe); Instanz-Gruppen und Figuren-Bündel (Skinning) bleiben
  const reach = spec.reach ?? 24;
  const hidden = [];
  const cullFar = (scene) => {
    const cx = p.x, cy = p.y + h / 2, cz = p.z;
    scene.traverse((o) => {
      if (!o.visible || o === refl || o.isInstancedMesh || o.isSkinnedMesh || !(o.isMesh || o.isPoints || o.isLine)) return;
      const g = o.geometry;
      if (!g?.attributes?.position || o.frustumCulled === false) return;
      if (!g.boundingSphere) g.computeBoundingSphere();
      _s.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
      const q = _s.center, d = Math.hypot(q.x - cx, q.y - cy, q.z - cz);
      const side = (q.x - cx) * dx + (q.z - cz) * dz;
      if (d - _s.radius > reach || side < -_s.radius - 0.5) { o.visible = false; hidden.push(o); }
    });
  };
  const origBefore = refl.onBeforeRender;
  refl.onBeforeRender = function (renderer, scene, camera, ...rest) {
    const info = renderer.info.render, c0 = info.calls, t0 = info.triangles, p0 = info.points, l0 = info.lines;
    cullFar(scene);
    try { origBefore.call(this, renderer, scene, camera, ...rest); } finally { for (const o of hidden) o.visible = true; hidden.length = 0; }
    st.lastCalls = info.calls;
    info.calls += c0; info.triangles += t0; info.points += p0; info.lines += l0;
    st.renders++;
  };
  // matte Silberfläche, wenn der Spiegel ruht
  const idle = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({ color: 0x9aaab8, roughness: 0.25, metalness: 0.7 }));
  idle.position.copy(refl.position);
  root.add(idle);
  // Spiegelwelt-Platten: nur auf Ebene 5 (sieht nur die Spiegelkamera)
  if (parts.length) {
    const gs = parts.map((q) => box(q.size.x, q.size.y, q.size.z, q.pos.x, q.pos.y + q.size.y / 2, q.pos.z, 0xb8f0ff, { r: 0.06, seg: 1, topColor: 0xf0ffff }));
    const pm = new THREE.Mesh(merge(gs), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: new THREE.Color(0x4ab8e8), emissiveIntensity: 0.6 }));
    pm.layers.set(MIRROR_LAYER);
    addObject(level, pm);
  }
  const near = spec.near ?? 30;
  addObject(level, root, (dt) => {
    frameModel?.update?.(dt, { star: false, glow: 1 });
    if (!st.resolved) resolveStar();
    else st.layerFix?.();
    const cam = view.camera;
    _c.set(p.x, p.y + h / 2, p.z);
    _n.set(dx, 0, dz);
    const rel = cam.position.clone().sub(_c);
    const on = rel.dot(_n) > 0 && rel.length() < near;
    st.active = on;
    refl.visible = on;
    idle.visible = !on;
  });
  return handle;
}

export const TYPES = { grosser_spiegel: buildGrosserSpiegel };
