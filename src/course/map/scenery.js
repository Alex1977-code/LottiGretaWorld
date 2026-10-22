// Umgebung der Kurs-Weltkarte: Thema 'map' (Licht, Himmel, Nebel – meldet sich in der Themen-Tabelle an),
// Meer mit Farbverlauf (flach am Ufer türkis, draußen tiefblau), Schaumkanten an den Inselblöcken, Glitzern,
// treibende Wolken über dem Meer und kleine Nachbarinseln. Ferne Hügel/Berge liefert der Himmel des Motors
// (backdrop 'hills').
// Welt 2 (map.kit 'desert'): Thema 'map_desert' (warmes Licht, sandiger Horizont), Sand-Inselchen mit Palmen und
// ferne Tafelberge statt grüner Hügel. map.neighbors: [{ world, pos: [x, z], size, style: 'grass'|'desert' }] legt die
// Nachbarwelt als ferne Insel an den Horizont (dorthin führt die Glasröhre).

import * as THREE from 'three';
import { THEMES } from '../view/themes.js';
import { colorize, lin, mixc, smooth, merge, Rnd } from '../../three/world/geometry.js';
import { islandParts } from '../blocks/kit.js';
import { palmGeo, pyramidGeo, place } from './desert.js';

// Thema der Wüsteninsel (Welt 2): warmes Sonnenlicht, blasser, sandiger Horizont, Nebel ins Goldene.
if (!THEMES.map_desert) {
  THEMES.map_desert = {
    ...THEMES.grass,
    label: 'Weltkarte Wüste',
    sky: [[1, 0x2f86e0], [0.45, 0x58b2f4], [0.15, 0x9fd8f6], [0.04, 0xe8ecd8], [0, 0xfbe6c2], [-0.1, 0xead1a4], [-1, 0xc8ae84]],
    background: 0xf2e2c4,
    fog: { color: 0xf1e3c8, near: 80, far: 300 },
    hemi: { sky: 0xfff0d6, ground: 0xc89a5a, intensity: 1.3 },
    sun: { color: 0xfff0cc, intensity: 2.8, dir: [-0.5, 1, 0.42] },
    ground: null,
    clouds: false,
    backdrop: 'none',
    dirt: 0xd9a060, dirtDeep: 0xa86a3a, rockDeep: 0x7a4a2a,
  };
}

// Thema der Karte: wie 'grass', aber ohne tiefe Wiese (Meer statt Boden), weiterer Nebel, eigene Wolken.
if (!THEMES.map) {
  THEMES.map = {
    ...THEMES.grass,
    label: 'Weltkarte',
    background: 0xbfe6fb,
    fog: { color: 0xcde9fa, near: 70, far: 290 },
    hemi: { sky: 0xd2ecff, ground: 0x6f9e56, intensity: 1.35 },
    sun: { color: 0xfff0d6, intensity: 2.6, dir: [-0.45, 1, 0.55] },
    ground: null,
    clouds: false,
    backdrop: 'hills',
  };
}

const SEA_SHALLOW = 0x64dcef, SEA_MID = 0x2fb0ea, SEA_DEEP = 0x1a72cc;

/**
 * Meer, Schaum, Glitzern, Wolken, Nachbarinseln.
 * @param {import('../view/CourseView.js').CourseView} view
 * @param {object} map Weltdaten
 * @param {object} bounds Level-Umriss
 */
export class MapScenery {
  constructor(view, map, bounds) {
    this.view = view;
    this.group = new THREE.Group();
    this.group.name = 'karte:umgebung';
    this.own = [];
    this.time = 0;
    const rects = (map.ground ?? []).filter((b) => b.top > (map.sea ?? 0) - 0.2).map((b) => b.rect);
    this.rects = rects;
    this.sea = map.sea ?? 0;
    this.buildSea(bounds);
    this.buildFoam();
    this.buildGlints(bounds);
    this.kit = map.kit ?? 'grass';
    this.buildClouds(bounds);
    this.buildIslets(bounds);
    if (this.kit === 'desert') this.buildMesas(bounds);
    for (const nb of map.neighbors ?? []) this.buildNeighbor(nb);
    if (map.birds?.length) this.buildBirds(map.birds);
    view.three.add(this.group);
  }

  track(x) { this.own.push(x); return x; }

  /** Abstand eines Punkts zum nächsten Inselblock (0 innen). */
  distToLand(x, z) {
    let d = Infinity;
    for (const r of this.rects) {
      const dx = Math.max(r[0] - x, 0, x - r[2]), dz = Math.max(r[1] - z, 0, z - r[3]);
      d = Math.min(d, Math.hypot(dx, dz));
    }
    return d;
  }

  buildSea(b) {
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    const w = b.max.x - b.min.x + 120, d = b.max.z - b.min.z + 120;
    const nx = Math.ceil(w / 4.5), nz = Math.ceil(d / 4.5);
    const g = new THREE.PlaneGeometry(w, d, nx, nz);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, this.sea, cz);
    const sh = lin(SEA_SHALLOW), mid = lin(SEA_MID), deep = lin(SEA_DEEP);
    const sea = colorize(g, (p, n, o) => {
      const dist = this.distToLand(p.x, p.z);
      if (dist < 9) mixc(sh, mid, smooth(0.5, 9, dist), o);
      else mixc(mid, deep, smooth(9, 50, dist), o);
    });
    const mat = this.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.05 }));
    const inner = new THREE.Mesh(this.track(sea), mat);
    inner.receiveShadow = true;
    inner.name = 'meer';
    // äußeres Meer bis zum Horizont (eine Fläche, Nebel blendet aus)
    const og = new THREE.PlaneGeometry(2400, 2400, 1, 1);
    og.rotateX(-Math.PI / 2);
    og.translate(cx, this.sea - 0.03, cz);
    const outer = new THREE.Mesh(this.track(og), this.track(new THREE.MeshStandardMaterial({ color: SEA_DEEP, roughness: 0.3, metalness: 0.05 })));
    outer.name = 'meer:fern';
    for (const m of [inner, outer]) { m.matrixAutoUpdate = false; m.updateMatrix(); this.group.add(m); }
  }

  /** Weiße Schaumränder rund um alle Blöcke (auf Wasserhöhe; an Land von den Blöcken verdeckt). */
  buildFoam() {
    const parts = [];
    const white = lin(0xffffff);
    for (const r of this.rects) {
      const [x0, z0, x1, z1] = r;
      const w = 0.7, y = this.sea + 0.025;
      const strips = [
        [x0 - w, z0 - w, x1 + w, z0], [x0 - w, z1, x1 + w, z1 + w],
        [x0 - w, z0, x0, z1], [x1, z0, x1 + w, z1],
      ];
      for (const [a, b, c, d] of strips) {
        const g = new THREE.PlaneGeometry(c - a, d - b, 1, 1);
        g.rotateX(-Math.PI / 2);
        g.translate((a + c) / 2, y, (b + d) / 2);
        parts.push(colorize(g, (p, n, o) => { o[0] = white[0]; o[1] = white[1]; o[2] = white[2]; }));
      }
    }
    const g = merge(parts);
    if (!g) return;
    this.foamMat = this.track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false }));
    const m = new THREE.Mesh(this.track(g), this.foamMat);
    m.renderOrder = 1;
    m.name = 'schaum';
    m.matrixAutoUpdate = false; m.updateMatrix();
    this.group.add(m);
  }

  buildGlints(b) {
    const rnd = new Rnd(0x91a7);
    const list = [];
    for (let i = 0; i < 90 && list.length < 46; i++) {
      const x = rnd.real(b.min.x - 40, b.max.x + 40), z = rnd.real(b.min.z - 40, b.max.z + 40);
      if (this.distToLand(x, z) < 2.5) continue;
      list.push({ x, z, w: rnd.real(0.8, 2.2), d: rnd.real(0.1, 0.18), ph: rnd.real(0, 6.28), sp: rnd.real(0.8, 1.6) });
    }
    const geo = this.track(new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2));
    const mat = this.track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    this.glints = new THREE.InstancedMesh(geo, mat, list.length);
    this.glints.frustumCulled = false;
    this.glints.renderOrder = 1;
    this.glintData = list;
    this.placeGlints(0);
    this.group.add(this.glints);
  }

  placeGlints(t) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    this.glintData.forEach((g, i) => {
      const k = 0.35 + 0.65 * Math.max(0, Math.sin(t * g.sp + g.ph));
      p.set(g.x + Math.sin(t * 0.3 + g.ph) * 0.4, this.sea + 0.03, g.z);
      s.set(g.w * k, 1, g.d * (0.6 + k * 0.4));
      m.compose(p, q, s);
      this.glints.setMatrixAt(i, m);
    });
    this.glints.instanceMatrix.needsUpdate = true;
  }

  buildClouds(b) {
    const parts = [];
    const white = lin(0xffffff), shade = lin(0xd4e3f3);
    for (const [x, y, z, r] of [[0, 0, 0, 1], [-0.95, -0.12, 0.1, 0.72], [0.95, -0.1, -0.1, 0.78], [-0.35, 0.32, -0.2, 0.68], [0.45, 0.36, 0.15, 0.62]]) {
      const s = new THREE.SphereGeometry(r, 8, 5);
      s.translate(x, y, z);
      parts.push(colorize(s, (p, n, o) => mixc(shade, white, smooth(-0.7, 0.5, n.y), o)));
    }
    const g = merge(parts);
    g.scale(1, 0.7, 1);
    const rnd = new Rnd(0xc10d);
    const data = [];
    for (let i = 0; i < 60 && data.length < 14; i++) {
      const x = rnd.real(b.min.x - 50, b.max.x + 50), z = rnd.real(b.min.z - 40, b.max.z + 30);
      if (this.distToLand(x, z) < 10) continue;
      data.push({ x, y: rnd.real(5, 11), z, s: rnd.real(2.6, 5), v: rnd.real(0.25, 0.6), xa: b.min.x - 70, xb: b.max.x + 70 });
    }
    // hohe Wolken am Horizont (nur beim flachen Anflug zu sehen)
    for (let i = 0; i < 7; i++) {
      data.push({ x: rnd.real(b.min.x - 160, b.max.x + 160), y: rnd.real(28, 60), z: b.min.z - rnd.real(90, 220), s: rnd.real(9, 18), v: rnd.real(0.5, 1.2), xa: b.min.x - 220, xb: b.max.x + 220 });
    }
    this.clouds = new THREE.InstancedMesh(this.track(g), this.track(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x6f7f90, emissiveIntensity: 0.35 })), data.length);
    this.clouds.castShadow = true;
    this.clouds.frustumCulled = false;
    this.cloudData = data;
    this.placeClouds();
    this.group.add(this.clouds);
  }

  placeClouds() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    this.cloudData.forEach((c, i) => {
      p.set(c.x, c.y, c.z); s.set(c.s, c.s, c.s);
      m.compose(p, q, s);
      this.clouds.setMatrixAt(i, m);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  /** Kleine Nachbarinseln mit Baum (nur Optik). */
  buildIslets(b) {
    const rnd = new Rnd(0x15e7);
    const theme = this.view.theme;
    const parts = [];
    let n = 0;
    for (let i = 0; i < 80 && n < 9; i++) {
      const x = rnd.real(b.min.x - 55, b.max.x + 55), z = rnd.real(b.min.z - 50, b.max.z + 45);
      const w = rnd.real(4, 9), d = rnd.real(4, 8);
      if (this.distToLand(x, z) < 18 + Math.max(w, d)) continue;
      const top = rnd.real(0.6, 2.2);
      if (this.kit === 'desert') {
        for (const g of islandParts(x - w / 2, -2, z - d / 2, x + w / 2, top, z + d / 2, theme, { under: 0, rnd, top: 'sand' })) parts.push(g);
        parts.push(place(palmGeo(rnd.real(3.6, 4.8), rnd.real(0.5, 1.3), rnd.int(1, 999)), x + rnd.real(-1, 1), top, z + rnd.real(-1, 1), rnd.real(0, 6)));
        this.rects.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
        n++;
        continue;
      }
      for (const g of islandParts(x - w / 2, -2, z - d / 2, x + w / 2, top, z + d / 2, theme, { under: 0, rnd })) parts.push(g);
      // Baum
      const th = rnd.real(3, 4.5);
      const trunk = new THREE.CylinderGeometry(0.22, 0.3, th * 0.45, 7, 1, true);
      trunk.translate(x, top + th * 0.22, z);
      const tc = lin(0x7a4a2a);
      parts.push(colorize(trunk, (p, nn, o) => { o[0] = tc[0]; o[1] = tc[1]; o[2] = tc[2]; }));
      const crown = new THREE.SphereGeometry(th * 0.3, 10, 7);
      crown.translate(x, top + th * 0.62, z);
      const cl = lin(rnd.frac() < 0.5 ? 0xffb347 : 0x6cc74d), cd = lin(rnd.frac() < 0.5 ? 0xd06a28 : 0x3d8f32);
      parts.push(colorize(crown, (p, nn, o) => mixc(cd, cl, smooth(-0.6, 0.8, nn.y), o)));
      this.rects.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
      n++;
    }
    for (const g of parts) this.view.addStatic(g, { castShadow: true });
  }

  /** Ferne Tafelberge und Dünen hinter dem Meer (Wüstenwelt, statt grüner Hügel). */
  buildMesas(b) {
    const rnd = new Rnd(0x3e5a);
    const parts = [];
    const bands = [0xe9b46e, 0xd99a58, 0xf0c98a, 0xcf8c4e].map(lin);
    const mesa = (x, z, r, h) => {
      const n = Math.max(2, Math.round(h / 4));
      for (let i = 0; i < n; i++) {
        const g = new THREE.CylinderGeometry(r * (1 - (i + 1) * 0.05), r * (1 - i * 0.05), h / n, 9, 1);
        const c = bands[(i + Math.floor(x)) & 3];
        colorize(g, (p, nn, o) => { const k = nn.y > 0.5 ? 1.12 : 1; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; });
        g.translate(x, -2 + (h / n) * (i + 0.5), z);
        parts.push(g);
      }
    };
    for (let x = b.min.x - 160; x < b.max.x + 160; x += rnd.real(34, 52)) mesa(x, b.min.z - rnd.real(150, 210), rnd.real(14, 24), rnd.real(16, 30));
    for (const side of [-1, 1]) {
      for (let z = b.max.z + 40; z > b.min.z - 120; z -= rnd.real(40, 60)) {
        const x = side < 0 ? b.min.x - rnd.real(130, 170) : b.max.x + rnd.real(130, 170);
        mesa(x, z, rnd.real(12, 20), rnd.real(12, 24));
      }
    }
    const g = merge(parts);
    if (!g) return;
    const m = new THREE.Mesh(this.track(g), this.view.mats.world);
    m.matrixAutoUpdate = false; m.updateMatrix();
    m.name = 'tafelberge';
    this.group.add(m);
  }

  /** Nachbarwelt als ferne Insel (Ziel der Glasröhre): grüne Blockinsel mit Burg oder Sandinsel mit Pyramide. */
  buildNeighbor(nb) {
    const [x, z] = nb.pos;
    const [w, d] = nb.size ?? [60, 40];
    const theme = this.view.theme;
    const rnd = new Rnd(0x4e1b + (nb.world ?? 0) * 17);
    const parts = [];
    const desert = nb.style === 'desert';
    const blocks = [[-0.5, -0.5, 0.5, 0.5, 2.5], [-0.35, -0.42, 0.1, 0.1, 6], [0.05, -0.3, 0.38, 0.2, 4.5]];
    for (const [a, c, e, f, top] of blocks) {
      const g = islandParts(x + a * w, -3, z + c * d, x + e * w, top, z + f * d, desert ? { ...theme, dirt: 0xd9a060, dirtDeep: 0xa86a3a } : THEMES.grass, { under: 0, rnd, top: desert ? 'sand' : 'grass', cell: 4 });
      parts.push(...g);
    }
    if (desert) {
      parts.push(place(pyramidGeo(18, 13, 6), x - 0.12 * w, 6, z - 0.15 * d));
      for (let i = 0; i < 4; i++) parts.push(place(palmGeo(5, 0.8, i + 3), x + rnd.real(-0.4, 0.4) * w, 2.5, z + rnd.real(0.25, 0.45) * d, rnd.real(0, 6)));
    } else {
      for (let i = 0; i < 6; i++) {
        const tx = x + rnd.real(-0.45, 0.45) * w, tz = z + rnd.real(0.15, 0.45) * d;
        const crown = new THREE.SphereGeometry(rnd.real(1.8, 2.6), 9, 6);
        crown.translate(tx, 2.5 + 3.2, tz);
        const cl = lin(rnd.frac() < 0.5 ? 0xffb347 : 0x6cc74d);
        parts.push(colorize(crown, (p, nn, o) => mixc(mixc(cl, [0, 0, 0], 0.35, [0, 0, 0]), cl, smooth(-0.6, 0.8, nn.y), o)));
      }
      // kleine Burg mit rotem Dach (Baron Brummbär) auf dem Hochplateau
      const keep = new THREE.BoxGeometry(6, 6, 5);
      keep.translate(x - 0.12 * w, 6 + 3, z - 0.16 * d);
      const st = lin(0x6e6683);
      parts.push(colorize(keep, (p, nn, o) => { o[0] = st[0]; o[1] = st[1]; o[2] = st[2]; }));
      const roof = new THREE.ConeGeometry(4.2, 4, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(x - 0.12 * w, 6 + 8, z - 0.16 * d);
      const rc = lin(0xc4304e);
      parts.push(colorize(roof, (p, nn, o) => { o[0] = rc[0]; o[1] = rc[1]; o[2] = rc[2]; }));
    }
    for (const g of parts) { g.deleteAttribute?.('uv'); }
    const g = merge(parts);
    if (!g) return;
    const m = new THREE.Mesh(this.track(g), this.view.mats.world);
    m.matrixAutoUpdate = false; m.updateMatrix();
    m.name = `nachbarwelt:${nb.world}`;
    this.group.add(m);
    this.rects.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  }

  /** Segelnde Vögel (Hackvögel) über der Insel: birds = [{ c: [x, y, z], r, n }] – eine InstancedMesh für alle. */
  buildBirds(list) {
    const b = [];
    const body = new THREE.SphereGeometry(0.28, 7, 5); body.scale(1.6, 0.8, 0.8);
    const head = new THREE.SphereGeometry(0.17, 6, 4); head.translate(0.48, 0.1, 0);
    const beak = new THREE.ConeGeometry(0.06, 0.28, 4); beak.rotateZ(-Math.PI / 2); beak.translate(0.72, 0.08, 0);
    const wing = (s) => { const g = new THREE.BoxGeometry(0.55, 0.05, 1.5); g.translate(0, 0.08, s * 0.85); g.rotateX(s * -0.25); return g; };
    const tail = new THREE.BoxGeometry(0.4, 0.04, 0.3); tail.translate(-0.55, 0.02, 0);
    const purple = lin(0x5a3a7a), light = lin(0x8a6ab8), orange = lin(0xffb43a), white = lin(0xf6f0ff);
    const paint = (g, c) => colorize(g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; });
    b.push(paint(body, purple), paint(head, light), paint(beak, orange), paint(wing(1), light), paint(wing(-1), light), paint(tail, purple));
    const g = merge(b);
    this.birdData = [];
    for (const { c, r, n = 2 } of list) for (let i = 0; i < n; i++) this.birdData.push({ c, r: r * (1 - i * 0.18), ph: (i / n) * Math.PI * 2, sp: 0.32 + i * 0.05 });
    this.birds = new THREE.InstancedMesh(this.track(g), this.track(new THREE.MeshLambertMaterial({ vertexColors: true })), this.birdData.length);
    this.birds.castShadow = true;
    this.birds.frustumCulled = false;
    void white;
    this.group.add(this.birds);
    this.placeBirds(0);
  }

  placeBirds(t) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    this.birdData.forEach((d, i) => {
      const a = d.ph + t * d.sp;
      p.set(d.c[0] + Math.cos(a) * d.r, d.c[1] + Math.sin(t * 0.7 + i) * 0.6, d.c[2] + Math.sin(a) * d.r);
      // Blick entlang der Flugbahn (gegen den Uhrzeigersinn von oben), in die Kurve gelegt
      e.set(-0.32, Math.atan2(-Math.cos(a), -Math.sin(a)), 0.05 * Math.sin(t * 2 + i), 'YXZ');
      q.setFromEuler(e);
      s.set(1, 1, 1 + Math.sin(t * 3 + i) * 0.04);
      m.compose(p, q, s);
      this.birds.setMatrixAt(i, m);
    });
    this.birds.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    if (this.birds) this.placeBirds(t);
    if (this.foamMat) this.foamMat.opacity = 0.42 + 0.18 * Math.sin(t * 1.6);
    if (this.glints) this.placeGlints(t);
    if (this.clouds) {
      for (const c of this.cloudData) { c.x += c.v * dt; if (c.x > c.xb) c.x = c.xa; }
      this.placeClouds();
    }
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.glints?.dispose();
    this.clouds?.dispose();
    this.birds?.dispose();
    for (const x of this.own) x.dispose?.();
    this.own.length = 0;
  }
}
