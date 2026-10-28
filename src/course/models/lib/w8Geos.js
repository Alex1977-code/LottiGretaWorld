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
