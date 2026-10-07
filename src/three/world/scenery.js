// Hintergrund der 3D-Welt in echter Tiefe: Himmelskuppel mit Verlauf, Sonne mit Glühen, driftende
// Wolken, Wiese hinter dem Boden, Herbstbäume in zwei Reihen, Hügel in drei Ebenen, ferne Berge.
// Alles einmal gebaut, deterministisch verteilt und in X-Abschnitte gebündelt (Frustum-Culling).
// Die Parallaxe entsteht durch die Perspektive von selbst; Nebel lässt die Tiefe weich auslaufen.

import * as THREE from 'three';
import { colorize, flat, merge, lin, mixc, Rnd, smooth } from './geometry.js';
import { PAL } from './materials.js';
import { Z_BACK, GRASS_LIFT } from './layout.js';
import { RENDER3D } from '../../render3d.js';

const SCENERY_CHUNK = 48;
const SKY_R = 230;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

export class Scenery {
  /**
   * @param {import('./terrain.js').LevelGrid} grid
   * @param {{group: THREE.Group, track: Function, mats: object}} ctx
   * @param {import('../View3D.js').View3D} view
   */
  constructor(grid, ctx, view) {
    this.ctx = ctx;
    this.view = view;
    this.meadowY = -grid.baseTop + GRASS_LIFT;
    this.xa = grid.x0 - 70; this.xb = grid.x1 + 70;
    this.buildSky();
    this.buildMeadow();
    this.buildNear();
    this.buildFar();
    this.buildClouds();
  }

  // ---------------------------------------------------------------- Himmel und Sonne

  buildSky() {
    const scene = this.view.three;
    scene.background = new THREE.Color(PAL.horizon);
    scene.fog = new THREE.Fog(PAL.fog, RENDER3D.fogNear, RENDER3D.fogFar);
    this.skyGroup = new THREE.Group();
    this.ctx.group.add(this.skyGroup);
    // Kuppel: Verlauf über die Höhe (Stützstellen in PAL.skyStops)
    const stops = PAL.skyStops.map(([t, c]) => [t, lin(c)]);
    const dome = colorize(new THREE.SphereGeometry(SKY_R, 24, 14), (p, n, o) => {
      const t = p.y / SKY_R;
      let i = 0;
      while (i < stops.length - 2 && t < stops[i + 1][0]) i++;
      const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
      mixc(c0, c1, smooth(t0, t1, t), o);
    });
    const domeMat = this.ctx.track(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.dome = new THREE.Mesh(this.ctx.track(dome), domeMat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    this.skyGroup.add(this.dome);
    // Sonne: helle Scheibe + weiches Glühen (additiver Sprite)
    const sunPos = new THREE.Vector3(-62, 9, -205);
    const disc = new THREE.Mesh(this.ctx.track(new THREE.CircleGeometry(9, 32)), this.ctx.track(new THREE.MeshBasicMaterial({ color: PAL.sun, fog: false })));
    disc.position.copy(sunPos);
    disc.renderOrder = -9;
    this.skyGroup.add(disc);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const c2 = canvas.getContext('2d');
    const grad = c2.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 250, 225, 0.95)');
    grad.addColorStop(0.25, 'rgba(255, 236, 180, 0.45)');
    grad.addColorStop(0.6, 'rgba(255, 220, 150, 0.12)');
    grad.addColorStop(1, 'rgba(255, 210, 140, 0)');
    c2.fillStyle = grad; c2.fillRect(0, 0, 128, 128);
    const tex = this.ctx.track(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    const glowMat = this.ctx.track(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.7 }));
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(52, 52, 1);
    glow.position.copy(sunPos).add(new THREE.Vector3(0, 0, 2));
    glow.renderOrder = -8;
    this.skyGroup.add(glow);
    this.skyGroup.position.set(0, this.meadowY + 4, 0);
  }

  // ---------------------------------------------------------------- Wiese

  buildMeadow() {
    const w = this.xb - this.xa + 400, d = 300;
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate((this.xa + this.xb) / 2, this.meadowY - 0.01, Z_BACK - d / 2);
    const mesh = new THREE.Mesh(this.ctx.track(flat(g, lin(PAL.meadow))), this.ctx.mats.world);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    this.ctx.group.add(mesh);
  }

  // ---------------------------------------------------------------- Bäume und nahe Hügel

  /** Baum: Stamm + drei Kugelkronen in einer Herbstfarbe. */
  tree(x, z, h, rnd, hazed) {
    const parts = [];
    const trunkH = h * 0.42, rTrunk = 0.09 * h;
    const trunk = new THREE.CylinderGeometry(rTrunk * 0.75, rTrunk, trunkH, 7, 1, true);
    trunk.translate(x, this.meadowY + trunkH / 2, z);
    const td = lin(PAL.trunkDark), tl = lin(PAL.trunk);
    parts.push(colorize(trunk, (p, n, o) => mixc(td, tl, smooth(this.meadowY, this.meadowY + trunkH, p.y), o)));
    const pal = rnd.pick(PAL.crowns);
    const light = lin(pal[0]), mid = lin(pal[1]), dark = lin(pal[2]);
    const haze = lin(PAL.horizon);
    const R = h * 0.26;
    const crowns = [[0, trunkH + R * 1.1, 0, R * 1.15], [-R * 0.75, trunkH + R * 0.55, R * 0.25, R * 0.85], [R * 0.7, trunkH + R * 0.7, -R * 0.2, R * 0.9]];
    for (const [dx, dy, dz, r] of crowns) {
      const s = new THREE.SphereGeometry(r, 9, 6);
      s.translate(x + dx, this.meadowY + dy, z + dz);
      parts.push(colorize(s, (p, n, o) => {
        if (n.y >= 0) mixc(mid, light, smooth(0, 0.9, n.y), o); else mixc(mid, dark, smooth(0, -0.9, n.y), o);
        if (hazed) mixc(o, haze, 0.12, o);
      }));
    }
    return merge(parts);
  }

  /** Hügel: flache Kugel, Mittelpunkt leicht unter der Wiese; `vary` verschiebt den Farbton leicht. */
  hill(x, z, rx, ry, rz, topHex, baseHex, vary = 0) {
    const g = new THREE.SphereGeometry(1, 18, 10);
    g.scale(rx, ry, rz);
    g.translate(x, this.meadowY - ry * 0.18, z);
    const top = lin(topHex), base = lin(baseHex);
    const k = [1 + vary * 0.5, 1 + vary * 0.25, 1 - vary * 0.6];
    return colorize(g, (p, n, o) => { mixc(base, top, smooth(-0.1, 0.9, n.y), o); o[0] *= k[0]; o[1] *= k[1]; o[2] *= k[2]; });
  }

  /** Busch: zwei bis drei Kugeln ohne Stamm (Unterholz hinter der Bodenkante). */
  bush(x, z, r, rnd) {
    const pal = rnd.pick(PAL.crowns);
    const light = lin(pal[0]), mid = lin(pal[1]), dark = lin(pal[2]);
    const parts = [];
    for (const [dx, dy, dz, k] of [[0, 0.55, 0, 1], [-0.7, 0.4, 0.2, 0.75], [0.65, 0.42, -0.15, 0.7]]) {
      const s = new THREE.SphereGeometry(r * k, 9, 6);
      s.translate(x + dx * r, this.meadowY + dy * r, z + dz * r);
      parts.push(colorize(s, (p, n, o) => (n.y >= 0 ? mixc(mid, light, smooth(0, 0.9, n.y), o) : mixc(mid, dark, smooth(0, -0.9, n.y), o))));
    }
    return merge(parts);
  }

  buildNear() {
    const chunks = new Map();
    const part = (x, g) => { const k = Math.floor(x / SCENERY_CHUNK); if (!chunks.has(k)) chunks.set(k, []); chunks.get(k).push(g); };
    const rnd = new Rnd(0xbeef);
    for (let x = this.xa; x < this.xb; x += rnd.real(10, 16)) {
      const rx = rnd.real(7, 11);
      part(x, this.hill(x, rnd.real(-16, -24), rx, rnd.real(4, 7), rx * 0.8, PAL.hillNearTop, PAL.hillNearBase, rnd.real(-0.08, 0.08)));
    }
    for (let x = this.xa - 10; x < this.xb + 10; x += rnd.real(18, 26)) {
      const rx = rnd.real(12, 18);
      part(x, this.hill(x, rnd.real(-34, -44), rx, rnd.real(7, 11), rx * 0.8, PAL.hillMidTop, PAL.hillMidBase, rnd.real(-0.06, 0.06)));
    }
    for (let x = this.xa + 2; x < this.xb; x += rnd.real(7, 12)) part(x, this.tree(x, rnd.real(-7.6, -9.5), rnd.real(3.8, 5.4), rnd, false));
    for (let x = this.xa; x < this.xb; x += rnd.real(5.5, 9)) part(x, this.tree(x, rnd.real(-11.5, -14), rnd.real(5.2, 7.2), rnd, true));
    for (let x = this.xa + 1; x < this.xb; x += rnd.real(4, 9)) part(x, this.bush(x, rnd.real(-6.2, -7.4), rnd.real(0.5, 0.9), rnd));
    for (const parts of chunks.values()) {
      const g = merge(parts);
      if (!g) continue;
      const mesh = new THREE.Mesh(this.ctx.track(g), this.ctx.mats.world);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.ctx.group.add(mesh);
    }
  }

  // ---------------------------------------------------------------- Ferne Hügel und Berge

  buildFar() {
    const rnd = new Rnd(0xf00d);
    const parts = [];
    for (let x = this.xa - 20; x < this.xb + 20; x += rnd.real(26, 36)) {
      const rx = rnd.real(18, 26);
      parts.push(this.hill(x, rnd.real(-62, -76), rx, rnd.real(10, 14), rx * 0.8, PAL.hillFarTop, PAL.hillFarBase));
    }
    // Berge: hohe, runde Kuppen mit Schneekappe (weich, kein Papier-Zackenkamm)
    const mb = lin(PAL.mountain), ms = lin(PAL.mountainSnow);
    for (let x = this.xa - 40; x < this.xb + 40; x += rnd.real(22, 32)) {
      const r = rnd.real(16, 24), h = rnd.real(13, 19);
      const g = new THREE.SphereGeometry(1, 16, 12);
      g.scale(r, h, r * 0.8); g.translate(x, this.meadowY - 4, rnd.real(-115, -140));
      const y0 = this.meadowY - 4;
      parts.push(colorize(g, (p, n, o) => mixc(mb, ms, smooth(0.6, 0.92, (p.y - y0) / h), o)));
    }
    const g = merge(parts);
    const mesh = new THREE.Mesh(this.ctx.track(g), this.ctx.mats.world);
    mesh.matrixAutoUpdate = false;
    this.ctx.group.add(mesh);
  }

  // ---------------------------------------------------------------- Wolken

  buildClouds() {
    const parts = [];
    const white = lin(PAL.cloud), shade = lin(PAL.cloudShade);
    for (const [x, y, z, r] of [[0, 0, 0, 1], [-0.95, -0.12, 0.1, 0.72], [0.95, -0.1, -0.1, 0.78], [-0.35, 0.32, -0.2, 0.68], [0.45, 0.36, 0.15, 0.62]]) {
      const s = new THREE.SphereGeometry(r, 10, 7);
      s.translate(x, y, z);
      parts.push(colorize(s, (p, n, o) => mixc(shade, white, smooth(-0.7, 0.5, n.y), o)));
    }
    const g = merge(parts);
    g.scale(1, 0.75, 1);
    const n = 14;
    this.clouds = new THREE.InstancedMesh(this.ctx.track(g), this.ctx.mats.world, n);
    this.clouds.frustumCulled = false;
    this.clouds.castShadow = false; this.clouds.receiveShadow = false;
    const rnd = new Rnd(0xc10d);
    this.cloudData = [];
    for (let i = 0; i < n; i++) {
      this.cloudData.push({ x: rnd.real(this.xa, this.xb), y: this.meadowY + rnd.real(11, 24), z: rnd.real(-45, -85), s: rnd.real(2.2, 4), sy: rnd.real(0.8, 1.1), v: rnd.real(0.25, 0.6) });
    }
    this.placeClouds();
    this.ctx.group.add(this.clouds);
  }

  placeClouds() {
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      _p.set(c.x, c.y, c.z); _s.set(c.s, c.s * c.sy, c.s);
      _m.compose(_p, _q, _s);
      this.clouds.setMatrixAt(i, _m);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  /** Je Frame: Himmel folgt der Kamera in X, Wolken driften. */
  update(dt, t, target) {
    this.skyGroup.position.x = target.x;
    for (const c of this.cloudData) {
      c.x += c.v * dt;
      if (c.x > this.xb + 10) c.x = this.xa - 10;
    }
    this.placeClouds();
  }
}
