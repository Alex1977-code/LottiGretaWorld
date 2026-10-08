// Umgebung der Kurs-Weltkarte: Thema 'map' (Licht, Himmel, Nebel – meldet sich in der Themen-Tabelle an),
// Meer mit Farbverlauf (flach am Ufer türkis, draußen tiefblau), Schaumkanten an den Inselblöcken, Glitzern,
// treibende Wolken über dem Meer und kleine Nachbarinseln. Ferne Hügel/Berge liefert der Himmel des Motors
// (backdrop 'hills').

import * as THREE from 'three';
import { THEMES } from '../view/themes.js';
import { colorize, lin, mixc, smooth, merge, Rnd } from '../../three/world/geometry.js';
import { islandParts } from '../blocks/kit.js';

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
    this.buildClouds(bounds);
    this.buildIslets(bounds);
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
    const nx = Math.ceil(w / 3.5), nz = Math.ceil(d / 3.5);
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
      const s = new THREE.SphereGeometry(r, 10, 7);
      s.translate(x, y, z);
      parts.push(colorize(s, (p, n, o) => mixc(shade, white, smooth(-0.7, 0.5, n.y), o)));
    }
    const g = merge(parts);
    g.scale(1, 0.7, 1);
    const rnd = new Rnd(0xc10d);
    const data = [];
    for (let i = 0; i < 60 && data.length < 18; i++) {
      const x = rnd.real(b.min.x - 50, b.max.x + 50), z = rnd.real(b.min.z - 40, b.max.z + 30);
      if (this.distToLand(x, z) < 10) continue;
      data.push({ x, y: rnd.real(5, 11), z, s: rnd.real(2.6, 5), v: rnd.real(0.25, 0.6), xa: b.min.x - 70, xb: b.max.x + 70 });
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

  update(dt) {
    this.time += dt;
    const t = this.time;
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
    for (const x of this.own) x.dispose?.();
    this.own.length = 0;
  }
}
