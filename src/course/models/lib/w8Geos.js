// Gemeinsame Teile der Welt-8-Modelle „Brummbär-Rummelplatz“ (src/course/models/kinds/*_w8.js, lib/instanced_w8.js).
// Ergänzt kit.js, ändert nichts daran. Figuren und Gimmicks nutzen die geteilten kit-Materialien (std, vcol, metal) und
// bekommen so den Spielzeug-Look; Kulisse nutzt kulMat8()/kulMetal8() (`toy: false`) und bleibt „backbar“
// (blocks/w2kit.js bakeModel: undurchsichtige, vertexgefärbte Meshes → Welt-Material, unbeleuchtete → Glüh-Material).
//
//  - W8                  Paletten (Rummel-Lack, Baron im Krallen-Anzug, Keks, Sand, Wasser, Stein, Kristall, Nacht)
//  - kulMat8 … glassMat8  Materialien (Kulisse ohne Spielzeug-Look, unbeleuchtet vertexgefärbt, additiv, Glas, Wasser)
//  - harvest(key, …)     baut ein vorhandenes Modell einmal, „erntet“ seine sichtbaren Meshes in zwei Sammel-Geometrien
//                        (beleuchtet mit Vertexfarben + unbeleuchtete Glanzpunkte) und entsorgt es wieder (Cache)
//  - recolor(g, fn)      Kopie einer vertexgefärbten Geometrie mit umgefärbten Ecken
//  - FRIENDS, friendGeo, friendFigure   die gefangenen Freunde (Krümel, Flocke, Hoppel, Fernglas-Kobold) als kleine
//                        Figuren aus den vorhandenen Modellen bunny_small/fairy_spotter (je 2 Meshes)
//  - cutSphere           Kugelschale ohne Ausschnitt (Kapuze, Glas)
//  - pennantShape, bulbGeo, stripesV  Rummel-Kleinteile
// Alle Geometrien liegen im Cache (kit.cached / memo) und werden nie entsorgt.

import {
  THREE, TAU, Build, cached, vcol, basic, std, metal, col, mix, clamp, smoothstep, placed, canvasTexture, puffyStarGeo,
  starShape, onEllipsoid, lerp,
} from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  W7, LAVA7, lavaKey, glow7, glow7T, add7, plain, fxPuffs, prog, num, ZERO, crestTexture, spikeCone, spikeV, fireballSet, FIRE7,
  flameGeo, lavaRingGeo, dropletGeo,
} from './w7Geos.js';
import { puffyGeo, gradV, heightV, ownMat, roundRectShape, mouthShape } from './w5Geos.js';
import { noise3, hash1, displace, lumpyEllipsoid } from './w4Geos.js';
import { taperTube, ellSurf, memo } from './hwGeos.js';
import { stick, Puffs, alongY } from './kit_w3.js';
import { fibDirs, superCube } from './w6Geos.js';
import { MODELS as P1 } from '../kinds/props.js';
import { MODELS as W7E } from '../kinds/enemies_w7.js';

export {
  W7, LAVA7, lavaKey, glow7, glow7T, add7, plain, fxPuffs, prog, num, ZERO, crestTexture, spikeCone, spikeV, fireballSet, FIRE7,
  flameGeo, lavaRingGeo, dropletGeo, puffyGeo, gradV, heightV, ownMat, roundRectShape, mouthShape, noise3, hash1, displace,
  lumpyEllipsoid, taperTube, ellSurf, memo, stick, Puffs, alongY, fibDirs, superCube,
};

// ------------------------------------------------------------------ Paletten
export const W8 = {
  // Rummel-Lack
  red: 0xe8283a, redHi: 0xff7a7a, redLow: 0x8a0e1e, yellow: 0xffd23a, yellowHi: 0xfff2a8, yellowLow: 0xd8900e,
  teal: 0x22c4c0, tealHi: 0x9af2e6, tealLow: 0x0a7480, purple: 0x6a2aa8, purpleHi: 0xa86ae8, purpleLow: 0x2e0e58,
  pink: 0xff5aa8, pinkHi: 0xffb8dc, blue: 0x3a6ae8, blueHi: 0x9ac0ff, orange: 0xff8a1a, green: 0x3ec44a,
  white: 0xfff8f0, cream: 0xfff3df, ink: 0x1e1428, gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xb87a0a,
  wood: 0xc8884a, woodHi: 0xe8b070, woodLow: 0x7a4a22, iron: 0x3c3c50, ironHi: 0x7a7a96, ironLow: 0x1c1c28,
  // Baron im Krallen-Anzug (violetter Overall mit Flieder-Ringeln, Creme-Bündchen, rosa Ballen, Elfenbein-Krallen)
  fur: 0x8a5230, furHi: 0xb8784a, furDark: 0x5a3218, muzzle: 0xf0caa0, nose: 0x1a1210, stache: 0x2e1a0e,
  suit: 0x5e2a8e, suitHi: 0x9a58d0, suitLow: 0x2e0e52, stripe: 0xd2b0f4, pad: 0xff9cb6, claw: 0xfffaf0, clawLow: 0xe0d0b8,
  hat: 0x1e1a26, hatHi: 0x4a4458, band: 0xe0262a, bow: 0xe0262a, mouth: 0x5a1020, tongue: 0xff7a8a, tooth: 0xffffff,
  // Keks-Fabrik
  dough: 0xe0a050, doughHi: 0xffd590, doughLow: 0x9a5a22, choco: 0x5a2a14, chocoHi: 0x8a4a2a, icing: 0xfff4fa,
  icingPink: 0xff8ac8, icingMint: 0x7ae8c8, icingBlue: 0x8ac8ff,
  // Sand / Wüste
  sand: 0xf0c878, sandHi: 0xfff0b8, sandLow: 0xc88a44, sandDark: 0x8a5a2a,
  // Wasser
  water: 0x3aa8ff, waterHi: 0xb8eeff, waterLow: 0x1a4ab8, waterDeep: 0x0e2a7a,
  // Stein (Regenfestung, Unterwasser)
  stone: 0x7a7a90, stoneHi: 0xb8b8cc, stoneLow: 0x3a3a4e, wet: 0x4e5a72, wetHi: 0x8a9ab8, moss: 0x5a9a4a, mossHi: 0x9ad870,
  // Kristall-Felsklotz
  rock: 0x6a5a7a, rockHi: 0x9a8aae, rockLow: 0x2e2438, crystal: 0x9a6aff, crystalHi: 0xeadcff, crystalTeal: 0x3ae8e0, crystalTealHi: 0xc8fff8,
  // Nacht / Leuchtsteg
  night: 0x1a1430, glowBlue: 0x3ab8ff, glowBlueHi: 0xc8f0ff, bulb: 0xfff2b0, bulbWarm: 0xffc860,
};

// ------------------------------------------------------------------ Materialien
/** Kulissen-Material (vertexgefärbt, ohne Spielzeug-Look, backbar). */
export const kulMat8 = (r = 0.75) => vcol(r, { toy: false }, 'w8kul');
/** Kulissen-Material doppelseitig (Fahnen, Wimpel, Planen). */
export const kulMat8D = () => vcol(0.75, { toy: false, side: THREE.DoubleSide }, 'w8kulD');
/** Kulissen-Metall (ohne Spielzeug-Look). */
export const kulMetal8 = () => vcol(0.36, { toy: false, metalness: 0.45 }, 'w8kulmetal');
/** Unbeleuchtet, vertexgefärbt (Glühbirnen, Glut, Leuchtschrift). */
export const glow8 = () => basic('vcol:w8glow', { vertexColors: true, toneMapped: false });
/** Additiver Schein (Farbe fest). */
export const add8 = (key, color, opacity = 0.7) => basic(`w8add:${key}`, { color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
/** Glas (durchsichtig, spiegelt die Umgebung): Freunde-Glas, Splitter. */
export const glassMat8 = () => metal('w8glass', { color: 0xe4f6ff, transparent: true, opacity: 0.26, metalness: 0.2, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide, emissive: 0x0a2232 }, 1.4);
/** Wasser (durchsichtig, leicht leuchtend, doppelseitig – man taucht hinein). */
export const waterMat8 = () => std('w8water', { color: 0x46b4ff, transparent: true, opacity: 0.42, roughness: 0.06, depthWrite: false, side: THREE.DoubleSide, emissive: 0x08305a });

// ------------------------------------------------------------------ Ernte vorhandener Modelle
const _hsl = { h: 0, s: 0, l: 0 };
/**
 * Baut ein vorhandenes Modell einmal (Math.random fest auf 0 → gleiche Pose), bringt es mit pose(model) in Haltung,
 * sammelt alle sichtbaren Meshes (auch Instanzen; ohne Effekt-Puffs und Sprites) relativ zur Wurzel und liefert
 * { lit, hl, box }: lit = beleuchtete Teile mit Vertexfarben (Materialfarbe eingerechnet), hl = unbeleuchtete weiße
 * Glanzpunkte (MeshBasicMaterial ohne Vertexfarben); durchscheinende/additive Teile fallen weg. Das Modell wird entsorgt.
 */
export function harvest(key, build, pose) {
  return memo(`w8:harvest:${key}`, () => {
    const rnd = Math.random;
    let m;
    try {
      Math.random = () => 0;
      m = build();
      pose?.(m);
    } finally { Math.random = rnd; }
    const root = m.root;
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.setScalar(1);
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert();
    const lit = [], hl = [];
    const M = new THREE.Matrix4(), I = new THREE.Matrix4();
    root.traverse((o) => {
      if (!o.isMesh || o.userData.fx) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!mat || mat.transparent || mat.visible === false) return;
      const isHl = mat.isMeshBasicMaterial;
      const mats = [];
      M.multiplyMatrices(inv, o.matrixWorld);
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, I); if (Math.abs(I.determinant()) > 1e-9) mats.push(M.clone().multiply(I)); }
      } else mats.push(M.clone());
      for (const X of mats) {
        let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
        if (!g.attributes.normal) g.computeVertexNormals();
        const n = g.attributes.position.count, c = mat.color ?? new THREE.Color(1, 1, 1);
        const arr = new Float32Array(n * 3);
        const old = mat.vertexColors && g.attributes.color ? g.attributes.color.array : null;
        for (let i = 0; i < n; i++) {
          arr[i * 3] = old ? old[i * 3] * c.r : c.r; arr[i * 3 + 1] = old ? old[i * 3 + 1] * c.g : c.g; arr[i * 3 + 2] = old ? old[i * 3 + 2] * c.b : c.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        g.applyMatrix4(X);
        (isHl ? hl : lit).push(g);
      }
    });
    m.dispose();
    const merge = (list) => {
      if (!list.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([], 3)); g.setAttribute('color', new THREE.Float32BufferAttribute([], 3)); return g; }
      const g = mergeGeometries(list, false); for (const x of list) x.dispose(); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
    };
    const out = { lit: merge(lit), hl: merge(hl) };
    out.box = out.lit.boundingBox ? out.lit.boundingBox.clone() : new THREE.Box3();
    return out;
  });
}

/** Kopie einer vertexgefärbten Geometrie; fn(color: THREE.Color (linear), hsl {h,s,l} in sRGB) → Farbe oder null (bleibt). */
export function recolor(g0, fn) {
  const g = g0.clone();
  const C = g.attributes.color;
  const arr = C.array.slice();
  const c = new THREE.Color();
  for (let i = 0; i < arr.length; i += 3) {
    c.setRGB(arr[i], arr[i + 1], arr[i + 2]);
    c.getHSL(_hsl, THREE.SRGBColorSpace);
    const r = fn(c, _hsl);
    if (r) { const rc = r.isColor ? r : col(r); arr[i] = rc.r; arr[i + 1] = rc.g; arr[i + 2] = rc.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.computeBoundingSphere();
  return g;
}
/** Helligkeit (sRGB-L) → Verlauf lo … hi (für Sand-/Stein-Statuen aus vorhandenen Figuren). */
export const toneMap = (lo, mid, hi, l0 = 0.15, l1 = 0.85) => (c, h) => {
  const t = clamp((h.l - l0) / (l1 - l0), 0, 1);
  return t < 0.5 ? mix(lo, mid, smoothstep(t * 2)) : mix(mid, hi, smoothstep((t - 0.5) * 2));
};

// ------------------------------------------------------------------ Die gefangenen Freunde
/**
 * Freunde der Reise (Welt 1–7 befreit): drei Häschen aus dem vorhandenen Modell bunny_small (Krümel karamell mit rotem
 * Halstuch – das Original, Flocke schneeweiß mit hellblauem, Hoppel silbergrau mit grünem Halstuch) und der Fernglas-Kobold
 * (fairy_spotter). Höhe ≈0,5 m (Häschen) bzw. ≈0,9 m (Kobold mit Mütze), Blick +X, Ursprung = Fußpunkt.
 */
export const FRIENDS = {
  kruemel: { name: 'Krümel', base: 'bunny' },
  flocke: { name: 'Flocke', base: 'bunny', fur: [0xb8c4dc, 0xffffff], scarf: 0x3aa8ff },
  hoppel: { name: 'Hoppel', base: 'bunny', fur: [0x5e5870, 0xd8d0e4], scarf: 0x38c048 },
  kobold: { name: 'Fernglas-Kobold', base: 'kobold' },
};
export const FRIEND_KEYS = Object.keys(FRIENDS);
const bunnyBase = () => harvest('bunny', () => P1.bunny_small(), (m) => m.update(0, { anim: 'idle', outfit: 'none' }));
const koboldBase = () => harvest('kobold', () => P1.fairy_spotter(), (m) => { for (let i = 0; i < 30; i++) m.update(0.1, { anim: 'idle' }); });
/** Geometrien eines Freundes { lit, hl, height } (gecacht). */
export function friendGeo(key) {
  const F = FRIENDS[key] ?? FRIENDS.kruemel;
  return memo(`w8:friend:${FRIENDS[key] ? key : 'kruemel'}`, () => {
    const base = F.base === 'kobold' ? koboldBase() : bunnyBase();
    let lit = base.lit;
    if (F.fur) {
      lit = recolor(base.lit, (c, h) => {
        const hue = h.h * 360;
        if (hue > 15 && hue < 56 && h.s > 0.2) return mix(F.fur[0], F.fur[1], smoothstep((h.l - 0.42) / 0.52));
        if ((hue < 13 || hue > 352) && h.s > 0.5 && h.l > 0.4) return mix(F.scarf, 0xffffff, 0).clone().multiplyScalar(0.7 + h.l * 0.5);
        return null;
      });
    }
    lit.computeBoundingBox();
    return { lit, hl: base.hl, height: lit.boundingBox.max.y };
  });
}
/** Kleine Figur eines Freundes (Gruppe mit 2 Meshes: Körper, Glanzpunkte), userData.height. */
export function friendFigure(key, shadow = true) {
  const g = friendGeo(key);
  const grp = new THREE.Group();
  const body = new THREE.Mesh(g.lit, vcol(0.5, {}, 'w8friend'));
  body.castShadow = shadow;
  const hl = new THREE.Mesh(g.hl, basic('white', { color: 0xffffff }));
  grp.add(body, hl);
  grp.userData.height = g.height;
  grp.name = `freund:${key}`;
  return grp;
}

// ------------------------------------------------------------------ Knochenflieger-Teile (Gruppe, Instanzen)
/**
 * Teile des vorhandenen Knochenfliegers (enemies_w7.js) für Gruppen und Instanzen: core = Rumpf, Kopf, Schnabel, Augen
 * ({ lit, hl } geerntet, Flügel ausgeblendet), wings = [{ geo, at }] für +Z und −Z (Schulter-Gelenk at, Flügel-Geometrie
 * geteilt). Ursprung = Körpermitte, Blick +X.
 */
export function kfParts() {
  return memo('w8:kfparts', () => {
    let wings = [];
    const core = harvest('knochenflieger:core', () => W7E.knochenflieger(), (m) => {
      m.update(0, { anim: 'fly', flap: 0.5 });
      const pose = m.root.children[0];
      wings = pose.children.slice(2, 4).map((j) => ({ geo: j.children[0].geometry, at: j.position.clone() }));
      for (const j of pose.children.slice(2, 4)) j.visible = false;
    });
    return { core, wings };
  });
}

/**
 * Sparsamer Knochenflieger (für Gruppen und Instanzen, ≈1,3 k Dreiecke): dieselbe Gestaltung wie das Welt-7-Modell (runder
 * Schädel mit Knochenkamm, große Augen in pflaumendunklen Höhlen, langer Schnabel mit goldener Spitze, Rippen-Brustkorb,
 * Fächer-Schwanz, Beinchen; Flügel aus Fingerknochen), Augen samt Glanzpunkten in der Rumpf-Geometrie.
 * core = Rumpf + Kopf, wings = [{ geo, at }] für +Z und −Z (Schulter at). Ursprung = Körpermitte, Blick +X.
 */
export function kfLoParts() {
  return memo('w8:kflo', () => {
    const bone = { v: (x, y, z, nx, ny) => mix(W7.boneLow, W7.boneHi, smoothstep(ny * 0.55 + 0.45)) };
    const sock = { v: (x, y, z, nx, ny) => mix(W7.socket, W7.socketHi, smoothstep(ny * 0.5 + 0.5)) };
    const b = new Build();
    // Brustkorb: dunkler Raum, zwei Rippenbögen, Brustbein, Wirbel
    b.sphere(1, sock, { s: [0.19, 0.155, 0.145] }, 8, 6);
    for (const [x, k] of [[0.08, 0.95], [-0.06, 0.85]]) b.torus(1, 0.18, bone, { p: [x, 0, 0], r: [0, Math.PI / 2, 0], s: [0.165 * k, 0.172 * k, 0.172 * k] }, 4, 8);
    b.capsule(0.035, 0.2, bone, { p: [0.02, -0.145, 0], r: [0, 0, Math.PI / 2] }, 1, 5);
    for (let i = 0; i < 2; i++) b.sphere(0.045, bone, { p: [0.08 - i * 0.14, 0.165, 0] }, 5, 3);
    // Schwanzfächer, Beinchen
    for (const [z, y, x] of [[0, 0.09, -0.56], [0.15, 0.06, -0.5], [-0.15, 0.06, -0.5]]) {
      const a = new THREE.Vector3(-0.2, 0, z * 0.15), c = new THREE.Vector3(x, y, z), d = c.clone().sub(a);
      b.capsule(0.025, d.length(), bone, { p: a.clone().add(c).multiplyScalar(0.5).toArray(), r: [0, 0, 0] }, 1, 5);
      b.parts[b.parts.length - 1].applyMatrix4(new THREE.Matrix4());
      const last = b.parts.pop();
      last.translate(...a.clone().add(c).multiplyScalar(-0.5).toArray());
      last.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), new THREE.Vector3(1, 1, 1)));
      b.parts.push(last);
    }
    for (const s of [1, -1]) { b.capsule(0.022, 0.17, bone, { p: [-0.03, -0.22, s * 0.075] }, 1, 5); b.sphere(1, W7.boneLow, { p: [0.01, -0.32, s * 0.08], s: [0.06, 0.025, 0.05] }, 5, 3); }
    // Kopf: Schädel, Augenhöhlen mit Augen, Brauen, Kamm, Schnabel
    const HC = [0.3, 0.14, 0], HRd = [0.2, 0.185, 0.19];
    b.sphere(1, bone, { p: HC, s: HRd }, 10, 7);
    for (const s of [1, -1]) {
      const h = onEllipsoid(HC, HRd, s * 0.5, 0.12);
      const n = h.n.clone(), p0 = h.p.clone();
      b.add(new THREE.SphereGeometry(1, 6, 4), sock, placed(p0.clone().addScaledVector(n, -0.02), n, new THREE.Vector3(0.1, 0.11, 0.04)));
      const d = n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.3).normalize();
      b.add(new THREE.SphereGeometry(1, 7, 4), 0xffffff, placed(p0.clone().addScaledVector(d, 0.0), d, new THREE.Vector3(0.068, 0.078, 0.04)));
      b.add(new THREE.SphereGeometry(1, 6, 4), 0xff7a1a, placed(p0.clone().addScaledVector(d, 0.022), d, new THREE.Vector3(0.04, 0.045, 0.025)));
      b.add(new THREE.SphereGeometry(1, 5, 3), 0x15101c, placed(p0.clone().addScaledVector(d, 0.034), d, new THREE.Vector3(0.024, 0.028, 0.015)));
      b.add(new THREE.SphereGeometry(1, 4, 2), 0xffffff, placed(p0.clone().addScaledVector(d, 0.045).add(new THREE.Vector3(0, 0.012, -s * 0.01)), d, new THREE.Vector3(0.011, 0.013, 0.006)));
      const br = onEllipsoid(HC, HRd, s * 0.5, 0.52);
      b.capsule(0.03, 0.12, bone, { p: br.p.toArray(), r: [Math.PI / 2 - s * 0.45, -s * 0.35, 0], order: 'YXZ' }, 1, 5);
    }
    for (let i = 0; i < 3; i++) { const h = onEllipsoid(HC, HRd, Math.PI, 1.2 - i * 0.28); b.capsule(0.034 - i * 0.004, 0.09 - i * 0.015, bone, { p: h.p.clone().addScaledVector(h.n, 0.04).toArray(), r: [0, 0, 0.85 - i * 0.32] }, 1, 5); }
    const beak = [[0, 0], [0.085, 0.0], [0.07, 0.14], [0.045, 0.27], [0.015, 0.35], [0, 0.375]];
    const bg = new THREE.LatheGeometry(beak.map(([r, y]) => new THREE.Vector2(r, y)), 6); bg.scale(1, 1, 0.8);
    b.add(bg, { v: (x, y) => mix(0xffe2a0, 0xffb84a, smoothstep((y - 0.2) / 0.17)) }, { p: [0.44, 0.1, 0], r: [0, 0, -Math.PI / 2 - 0.12] });
    const jg = new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.04, 0.15], [0.01, 0.25], [0, 0.27]].map(([r, y]) => new THREE.Vector2(r, y)), 6); jg.scale(1, 1, 0.75);
    b.add(jg, { v: (x, y) => mix(W7.boneLow, 0xffe2a0, smoothstep(y / 0.27)) }, { p: [0.43, 0.06, 0], r: [0, 0, -Math.PI / 2 + 0.12] });
    const core = b.geometry();
    const wing = (s) => {
      const w = new Build();
      const W = new THREE.Vector3(0.02, 0.06, s * 0.28);
      const seg = (a, c, r, knob) => {
        const d = c.clone().sub(a), len = d.length();
        const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 2), 1, 4);
        w.add(g, bone, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
        if (knob) w.sphere(r * 1.35, bone, { p: c.toArray() }, 4, 2);
      };
      seg(new THREE.Vector3(0, 0, s * 0.02), W, 0.04, true);
      for (const [x, y, z] of [[0.02, 0.1, 0.72], [-0.13, 0.08, 0.68], [-0.27, 0.05, 0.58], [-0.36, 0.02, 0.43]]) seg(W, new THREE.Vector3(x, y, s * z), 0.032, true);
      return w.geometry();
    };
    return { core, wings: [{ geo: wing(1), at: new THREE.Vector3(0.06, 0.12, 0.15) }, { geo: wing(-1), at: new THREE.Vector3(0.06, 0.12, -0.15) }] };
  });
}

/**
 * Einfache Vereinfachung durch Ecken-Bündelung (Zellgröße cell, Meter): gleiche Zelle → eine Ecke (gemittelte Lage und
 * Farbe), entartete Dreiecke fallen weg; Normalen neu (weich). Für dichte, geerntete Figuren in Kulissen/Statuen.
 */
export function clusterSimplify(g0, cell = 0.05) {
  const P = g0.attributes.position, C = g0.attributes.color;
  const key = (i) => `${Math.round(P.getX(i) / cell)},${Math.round(P.getY(i) / cell)},${Math.round(P.getZ(i) / cell)}`;
  const map = new Map(), acc = [];
  const idOf = (i) => {
    const k = key(i);
    let id = map.get(k);
    if (id === undefined) { id = acc.length; map.set(k, id); acc.push([0, 0, 0, 0, 0, 0, 0]); }
    const a = acc[id];
    a[0] += P.getX(i); a[1] += P.getY(i); a[2] += P.getZ(i);
    if (C) { a[3] += C.getX(i); a[4] += C.getY(i); a[5] += C.getZ(i); }
    a[6]++;
    return id;
  };
  const tris = [];
  for (let i = 0; i < P.count; i += 3) {
    const a = idOf(i), b = idOf(i + 1), c = idOf(i + 2);
    if (a !== b && b !== c && a !== c) tris.push(a, b, c);
  }
  const pos = new Float32Array(acc.length * 3), colr = new Float32Array(acc.length * 3);
  acc.forEach((a, i) => { pos[i * 3] = a[0] / a[6]; pos[i * 3 + 1] = a[1] / a[6]; pos[i * 3 + 2] = a[2] / a[6]; colr[i * 3] = a[3] / a[6]; colr[i * 3 + 1] = a[4] / a[6]; colr[i * 3 + 2] = a[5] / a[6]; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  g.setIndex(tris);
  g.computeVertexNormals();
  const out = g.toNonIndexed(); g.dispose();
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}

// ------------------------------------------------------------------ Formen
/**
 * Kugelschale (Einheitskugel, ws × hs Segmente), nur Dreiecke, deren Schwerpunkt-Richtung keep(dx, dy, dz) erfüllt.
 * Nicht indiziert; Normalen nach außen.
 */
export function cutSphere(keep, ws = 32, hs = 20) {
  const g0 = new THREE.SphereGeometry(1, ws, hs);
  const g = g0.toNonIndexed(); g0.dispose();
  const P = g.attributes.position, N = g.attributes.normal;
  const pos = [], nor = [];
  for (let i = 0; i < P.count; i += 3) {
    const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
    const l = Math.hypot(cx, cy, cz) || 1;
    if (!keep(cx / l, cy / l, cz / l)) continue;
    for (let k = 0; k < 3; k++) { pos.push(P.getX(i + k), P.getY(i + k), P.getZ(i + k)); nor.push(N.getX(i + k), N.getY(i + k), N.getZ(i + k)); }
  }
  g.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
/** Wimpel-Dreieck (Spitze unten), Breite w, Höhe h, Oberkante bei y = 0. */
export function pennantShape(w = 0.4, h = 0.5) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.quadraticCurveTo(w * 0.12, -h * 0.5, 0, -h); s.quadraticCurveTo(-w * 0.12, -h * 0.5, -w / 2, 0);
  return s;
}
/** Senkrechte Lack-Streifen (Zelt, Bude): n Streifen rundum (Winkel um Y). */
export const stripesV = (a, b, n = 12) => (x, y, z) => ((Math.floor(((Math.atan2(z, x) / TAU) + 1) * n) % 2) ? col(a) : col(b));
/** Glühbirne (Kugel, Mitte im Ursprung) mit Fassung darüber – Fassung separat: bulbSocket. */
export const bulbGeo = (r = 0.09, lo = false) => cached(`w8:bulb:${r}:${lo}`, () => new Build().sphere(r, { v: (x, y, z, nx, ny) => mix(W8.bulbWarm, W8.bulb, smoothstep(ny * 0.6 + 0.6)) }, {}, lo ? 8 : 12, lo ? 6 : 8).geometry());
/** Halbe Brummbär-Medaille (gold, Bärenkopf mit Zylinder) als flaches Relief in XY, Fläche +Z, Ø ≈ 2·r. */
export function bearEmblem(b, o, r = 0.3, base = W8.gold, dark = 0x2a1418) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...(o.p ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.r ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
  const add = (g, c, p, s, rz = 0) => {
    const X = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), new THREE.Vector3(...s));
    b.add(g, c, m.clone().multiply(X));
  };
  const disc = () => { const g = new THREE.CylinderGeometry(1, 1, 1, 24); g.rotateX(Math.PI / 2); return g; };
  add(disc(), base, [0, 0, 0], [r, r, r * 0.16]);
  add(disc(), dark, [0, 0, r * 0.06], [r * 0.84, r * 0.84, r * 0.1]);
  // Bärenkopf: Ohren, Kopf, Zylinder, Monokel
  for (const s of [1, -1]) add(new THREE.SphereGeometry(1, 10, 8), base, [s * r * 0.36, r * 0.12, r * 0.12], [r * 0.15, r * 0.15, r * 0.06]);
  add(new THREE.SphereGeometry(1, 16, 10), base, [0, -r * 0.12, r * 0.12], [r * 0.42, r * 0.38, r * 0.08]);
  add(new THREE.BoxGeometry(1, 1, 1), base, [0, r * 0.38, r * 0.12], [r * 0.4, r * 0.32, r * 0.06]);
  add(new THREE.BoxGeometry(1, 1, 1), base, [0, r * 0.22, r * 0.12], [r * 0.62, r * 0.07, r * 0.06]);
  add(new THREE.SphereGeometry(1, 10, 6), dark, [0, -r * 0.24, r * 0.17], [r * 0.16, r * 0.1, r * 0.04]);
  for (const s of [1, -1]) add(new THREE.SphereGeometry(1, 8, 6), dark, [s * r * 0.15, -r * 0.04, r * 0.17], [r * 0.055, r * 0.055, r * 0.03]);
  add(new THREE.TorusGeometry(1, 0.18, 6, 16), dark, [r * 0.15, -r * 0.04, r * 0.18], [r * 0.1, r * 0.1, r * 0.1]);
  return b;
}
/** Lineare Interpolation von [x,y,z]-Listen. */
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export { THREE, TAU, Build, cached, vcol, basic, std, metal, col, mix, clamp, smoothstep, placed, canvasTexture, puffyStarGeo, starShape, onEllipsoid, lerp };
