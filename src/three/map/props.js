// Requisiten der 3D-Weltkarte im Spielzeug-Look: Herbstbäume (Stamm + Kugelkronen), Büsche,
// Steine, Blumentupfer, dicke weiche Wolken, ferne Pastellberge, Himmelsverlauf mit Sonne,
// Wasserfläche mit leichtem Wellengang und Glanzstreifen. Alles deterministisch (eigener
// Zufallsgenerator) und als InstancedMesh bzw. gemergte Geometrie – wenige Zeichenaufrufe.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WATER_Y, POND, CX, CZ, islandRadius } from './terrain.js';

/** Kleiner deterministischer Zufallsgenerator (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.real = (lo, hi) => lo + (hi - lo) * next();
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

/** Instanz-Matrix setzen (Position, Skalierung, Drehung um Y). */
export function setInstance(mesh, i, x, y, z, sx = 1, sy = sx, sz = sx, ry = 0) {
  _p.set(x, y, z); _s.set(sx, sy, sz); _e.set(0, ry, 0); _q.setFromEuler(_e);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
}

/** Geometrie mit konstanter Vertexfarbe versehen (zum Mergen mit vertexColors). */
export function colored(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Herbstpaletten (wie die 2D-Karte): [hell, mittel, dunkel]
export const CROWNS = {
  orange: [0xffcf7a, 0xf58f3a, 0xd9712a],
  red: [0xffa38a, 0xef5f44, 0xd04a36],
  gold: [0xfff0a6, 0xf6c54a, 0xdca838],
  green: [0xb9f286, 0x6cc74d, 0x56ad3c],
};
const TRUNK = 0x8a5a36;

/**
 * Bäume verteilen: Reihe am hinteren Inselrand plus Streuung über die Wiese.
 * isFree(X, Z) entscheidet, ob ein Baum dort stehen darf (Wege, Knoten, Sichtkorridore frei).
 */
export function scatterTrees(island, isFree, rnd) {
  const out = [];
  const pals = Object.keys(CROWNS);
  const tryAdd = (X, Z, s) => {
    if (!island.isMeadow(X, Z) || !isFree(X, Z, s)) return false;
    for (const t of out) if (Math.hypot(t.X - X, t.Z - Z) < (t.s + s) * 0.9) return false;
    out.push({ X, Z, s, pal: rnd.pick(pals), rot: rnd.real(0, Math.PI * 2) });
    return true;
  };
  // hintere Baumreihe (Waldrand)
  for (let X = -3; X < 33; X += rnd.real(1.3, 2.1)) tryAdd(X + rnd.real(-0.3, 0.3), rnd.real(-1.4, 1.2), rnd.real(0.9, 1.15));
  // Streuung
  for (let i = 0; i < 140 && out.length < 46; i++) tryAdd(rnd.real(-3, 33), rnd.real(1.2, 19), rnd.real(0.7, 1.0));
  return out;
}

/** Büsche verteilen: flache grüne Kugeln (werden mit den Baumkronen in einem InstancedMesh gezeichnet). */
export function scatterBushes(island, isFree, rnd) {
  const spots = [];
  for (let i = 0; i < 90 && spots.length < 26; i++) {
    const X = rnd.real(-3, 33), Z = rnd.real(0, 19), s = rnd.real(0.3, 0.5);
    if (!island.isMeadow(X, Z) || !isFree(X, Z, s * 0.6)) continue;
    spots.push({ X, Z, s, hex: rnd.pick([0x4fb236, 0x61c343, 0x3f9a2e]), rot: rnd.real(0, 3) });
  }
  return spots;
}

/** Stämme (InstancedMesh) sowie Kronen-Kugeln und Büsche (ein gemeinsames InstancedMesh mit Instanzfarbe). */
export function makeTreeMeshes(trees, bushes, island, track) {
  const trunkGeo = track(new THREE.CylinderGeometry(0.1, 0.15, 1, 8));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: TRUNK, roughness: 0.9 }));
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, Math.max(1, trees.length));
  const puffGeo = track(new THREE.SphereGeometry(1, 10, 7));
  const puffMat = track(new THREE.MeshStandardMaterial({ roughness: 0.75 }));
  const total = trees.length * 4 + bushes.length;
  const crowns = new THREE.InstancedMesh(puffGeo, puffMat, Math.max(1, total));
  const c = new THREE.Color();
  let k = 0;
  trees.forEach((t, i) => {
    const y = island.heightAt(t.X, t.Z) - 0.05;
    const s = t.s;
    setInstance(trunks, i, t.X, y + 0.45 * s, t.Z, s, 0.9 * s, s);
    const pal = CROWNS[t.pal];
    const puffs = [
      [0, 1.15, 0, 0.58, pal[1]],
      [0.34, 0.95, 0.2, 0.42, pal[1]],
      [-0.3, 0.98, -0.22, 0.4, pal[2]],
      [0.05, 1.55, -0.02, 0.38, pal[0]],
    ];
    for (const [px, py, pz, r, hex] of puffs) {
      const cs = Math.cos(t.rot), sn = Math.sin(t.rot);
      const rx = px * cs - pz * sn, rz = px * sn + pz * cs;
      setInstance(crowns, k, t.X + rx * s, y + py * s, t.Z + rz * s, r * s, r * s * 0.92, r * s);
      crowns.setColorAt(k++, c.setHex(hex));
    }
  });
  for (const b of bushes) {
    setInstance(crowns, k, b.X, island.heightAt(b.X, b.Z) + b.s * 0.35, b.Z, b.s, b.s * 0.7, b.s * 0.9, b.rot);
    crowns.setColorAt(k++, c.setHex(b.hex));
  }
  trunks.count = trees.length; crowns.count = total;
  trunks.instanceMatrix.needsUpdate = true; crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.castShadow = true; crowns.castShadow = true; crowns.receiveShadow = true;
  trunks.name = 'trunks'; crowns.name = 'crowns';
  return { trunks, crowns };
}

/** Steine: kleine, rundliche Brocken. */
export function makeStones(island, isFree, rnd, track) {
  const spots = [];
  for (let i = 0; i < 80 && spots.length < 14; i++) {
    const X = rnd.real(-2, 32), Z = rnd.real(0, 19), s = rnd.real(0.14, 0.3);
    if (!island.isMeadow(X, Z) || !isFree(X, Z, s)) continue;
    spots.push({ X, Z, s, hex: rnd.pick([0xb9bdc9, 0xa5aab8, 0xcfd3dc]) });
  }
  const mesh = new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(1, 1)), track(new THREE.MeshStandardMaterial({ roughness: 0.7 })), Math.max(1, spots.length));
  const c = new THREE.Color();
  spots.forEach((b, i) => {
    setInstance(mesh, i, b.X, island.heightAt(b.X, b.Z) + b.s * 0.45, b.Z, b.s, b.s * 0.75, b.s * 0.85, rnd.real(0, 3));
    mesh.setColorAt(i, c.setHex(b.hex));
  });
  mesh.count = spots.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = 'stones';
  return mesh;
}

/** Blumentupfer: Stängel mit farbigem Köpfchen (eine Geometrie, Farbe je Instanz). */
export function makeFlowers(island, isFree, rnd, track) {
  const stem = colored(new THREE.CylinderGeometry(0.02, 0.025, 0.22, 5).translate(0, 0.11, 0), 0x3f9a2e);
  const head = colored(new THREE.SphereGeometry(0.075, 8, 6).translate(0, 0.26, 0), 0xffffff);
  const geo = track(mergeGeometries([stem, head]));
  stem.dispose(); head.dispose();
  const mat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
  const spots = [];
  for (let i = 0; i < 220 && spots.length < 70; i++) {
    const X = rnd.real(-2, 32), Z = rnd.real(0, 19);
    if (!island.isMeadow(X, Z) || !isFree(X, Z, 0.1)) continue;
    spots.push({ X, Z, hex: rnd.pick([0xffffff, 0xffe066, 0xff9ec9, 0xffb46e]) });
  }
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, spots.length));
  const c = new THREE.Color();
  spots.forEach((f, i) => {
    setInstance(mesh, i, f.X, island.heightAt(f.X, f.Z) - 0.02, f.Z, 1, rnd.real(0.85, 1.2), 1);
    // Vertexfarbe (weiß am Kopf, grün am Stängel) × Instanzfarbe → Kopf nimmt die Instanzfarbe an
    mesh.setColorAt(i, c.setHex(f.hex));
  });
  mesh.count = spots.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.name = 'flowers';
  return mesh;
}

/** Dicke weiche Wolken (eine gemergte Form, je Instanz gestreckt), driften langsam nach rechts. */
export function makeClouds(rnd, track) {
  const parts = [];
  const puffs = [[0, 0, 0, 1], [1.1, -0.1, 0.1, 0.8], [-1.0, -0.15, -0.1, 0.75], [0.5, 0.45, -0.2, 0.7], [-0.4, 0.4, 0.2, 0.65], [1.9, -0.3, 0, 0.5], [-1.8, -0.3, 0.1, 0.5]];
  for (const [x, y, z, r] of puffs) parts.push(new THREE.SphereGeometry(r, 10, 7).scale(1, 0.72, 1).translate(x, y, z));
  const geo = track(mergeGeometries(parts));
  parts.forEach((g) => g.dispose());
  const mat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x6688aa, emissiveIntensity: 0.12 }));
  const list = [];
  // vor der Himmelskulisse (Z > SKY_Z), in zwei Höhen – weiter hinten kleiner
  for (let i = 0; i < 7; i++) {
    const z = rnd.real(-3.2, -7.2);
    list.push({ x: rnd.real(-18, 48), y: rnd.real(3.2, 5.8), z, s: rnd.real(0.55, 0.95) * (1 - (-z - 3) * 0.06), sx: rnd.real(1.1, 1.6), speed: rnd.real(0.1, 0.25) });
  }
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  mesh.name = 'clouds';
  const update = (dt) => {
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      c.x += c.speed * dt;
      if (c.x > 50) c.x = -20;
      setInstance(mesh, i, c.x, c.y, c.z, c.s * c.sx, c.s, c.s);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}

/** Ferne Pastellhügel hinter der Insel: weiche Kuppen (gestauchte Halbkugeln) in zwei Reihen, mit Luft dazwischen. */
export function makeMountains(rnd, track) {
  const parts = [];
  const add = (x, z, r, h, hex) => parts.push(colored(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(r, h, r * 0.8).translate(x, WATER_Y - 0.4, z), hex));
  // hintere Reihe (direkt vor der Himmelskulisse): hell, zarte Kuppenlinie
  for (let x = -24; x < 56; x += rnd.real(4.5, 7)) add(x + rnd.real(-1, 1), rnd.real(-7.4, -8.1), rnd.real(3.2, 5.2), rnd.real(1.7, 2.7), rnd.pick([0xaec8f0, 0xbdd3f4]));
  // vordere Reihe: kleiner, etwas satter – mit Lücken, damit die hintere Reihe durchscheint
  for (let x = -20; x < 52; x += rnd.real(7, 11)) add(x + rnd.real(-1, 1), rnd.real(-5.8, -6.8), rnd.real(2.0, 3.4), rnd.real(0.9, 1.6), rnd.pick([0x8fb3e8, 0x9dbdec]));
  const geo = track(mergeGeometries(parts));
  parts.forEach((g) => g.dispose());
  // unbeleuchtet (flache Pastell-Silhouetten wie im Vorbild), Nebel sorgt für Tiefe
  const mat = track(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'mountains';
  return mesh;
}

/**
 * Himmel: große Kulisse hinter der Insel mit Vertex-Verlauf (zart am Horizont, kräftig oben)
 * plus Sonne (Scheibe und weicher Schein). Ohne Nebel, damit der Verlauf klar bleibt.
 */
export const SKY_Z = -8.5; // Kulisse steht knapp hinter der Insel (Diorama) – weiter hinten läge sie unter dem Wasserhorizont

export function makeSky(track) {
  const w = 160, h = 40, y0 = WATER_Y - 2; // Unterkante unter Wasser, damit keine Fuge entsteht
  // Verlauf, Sonne und Schein in eine Leinwand-Textur malen (ein Zeichenaufruf für den ganzen Himmel).
  // Sichtbar ist von der Kamera aus etwa Y 0 … 7 – der Verlauf liegt in diesem Bereich.
  const cw = 1024, ch = 256;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  const py = (y) => (1 - (y - y0) / h) * ch; // Welt-Y → Textur-Y
  const grad = ctx.createLinearGradient(0, py(h + y0), 0, py(y0));
  grad.addColorStop(0, '#2f8fe8');
  grad.addColorStop(0.55, '#4aa8f2');     // Y ≈ 16
  grad.addColorStop(0.8, '#8fd2ff');      // Y ≈ 6
  grad.addColorStop(0.93, '#c9e6fb');     // Y ≈ 0.8
  grad.addColorStop(1, '#dcebf8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);
  // Sonne rechts der Titelzeile (X ≈ CX + 12, Y ≈ 4.3)
  const sx = ((CX + 12 - (CX - w / 2)) / w) * cw, sy = py(4.3);
  const r = (1.1 / w) * cw;
  const glow = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4);
  glow.addColorStop(0, 'rgba(255, 244, 190, 0.8)');
  glow.addColorStop(0.45, 'rgba(255, 240, 180, 0.28)');
  glow.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#fff8d0';
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  const tex = track(new THREE.CanvasTexture(cv));
  tex.colorSpace = THREE.SRGBColorSpace;
  const backdrop = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map: tex, fog: false })));
  backdrop.position.set(CX, y0 + h / 2, SKY_Z);
  backdrop.name = 'sky';
  return backdrop;
}

/** Wasser: große Fläche mit sanftem Wellengang (Vertex-Animation) – leicht durchscheinend. */
export function makeWater(track) {
  const geo = track(new THREE.PlaneGeometry(120, 90, 48, 36));
  geo.rotateX(-Math.PI / 2);
  geo.translate(CX, 0, CZ - 6);
  const base = geo.attributes.position.array.slice();
  const mat = track(new THREE.MeshStandardMaterial({ color: 0x3fb0f2, roughness: 0.32, metalness: 0.05, transparent: true, opacity: 0.84 }));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_Y;
  mesh.receiveShadow = true;
  mesh.name = 'water';
  const pos = geo.attributes.position;
  const update = (t) => {
    const a = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      a[i * 3 + 1] = 0.045 * Math.sin(x * 0.9 + t * 1.3) * Math.cos(z * 0.7 - t * 0.9) + 0.03 * Math.sin((x + z) * 1.7 + t * 1.9);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  update(0);
  return { mesh, update };
}

/** Glanzstreifen auf dem Wasser (wie die weißen Lichter der 2D-Karte), pulsieren leicht. */
export function makeGlints(rnd, track) {
  const list = [];
  // Teich
  list.push({ x: POND.X - 1.0, z: POND.Z - 0.35, w: 1.2, d: 0.12, ph: 0 });
  list.push({ x: POND.X + 0.9, z: POND.Z + 0.35, w: 0.7, d: 0.09, ph: 1.7 });
  // Küste und offenes Wasser
  for (let i = 0; i < 16; i++) {
    const x = rnd.real(-10, 40), z = rnd.real(-12, 24);
    if (islandRadius(x, z) < 1.2) { i--; continue; }
    list.push({ x, z, w: rnd.real(0.6, 1.8), d: rnd.real(0.08, 0.14), ph: rnd.real(0, 6) });
  }
  const mesh = new THREE.InstancedMesh(track(new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2)), track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })), list.length);
  mesh.name = 'glints';
  const update = (t) => {
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      const k = 0.8 + 0.25 * Math.sin(t * 1.1 + g.ph);
      setInstance(mesh, i, g.x + 0.15 * Math.sin(t * 0.5 + g.ph), WATER_Y + 0.06, g.z, g.w * k, 1, g.d);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}
