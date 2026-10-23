// Himmel und Hintergrund der Kurs-Level: Kuppel mit Farbverlauf (folgt der Kamera), Sonne mit Glühen,
// treibende Wolken (eine InstancedMesh), ferne Hügelkette und tiefe Wiese unter den schwebenden Inseln
// (je ein verschmolzenes Mesh). Alles deterministisch (Rnd) und nach dem Level-Umriss ausgelegt.
//
// Wolken je Level (Präzisierung „Leistung und Level-Haken 2“), LEVEL.sky.clouds:
//   true/undefined = wie das Thema · false = keine · 'above' = nur die Wolken über dem Level · 'below' = nur die unter
//   den Inseln · Zahl = so viele (gleiche Verteilung) · Liste [{ pos: [x, y, z], size: 6, drift: 0.5 }] = eigene Wolken
//   (treiben mit drift m/s nach +X). Gezeichnet werden je Bild nur Wolken im Bild (view.optimize).

import * as THREE from 'three';
import { colorize, merge, lin, mixc, Rnd, smooth } from '../../three/world/geometry.js';

const SKY_R = 330;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

export class Sky {
  /** @param {import('./CourseView.js').CourseView} view */
  constructor(view, theme) {
    this.view = view;
    this.theme = theme;
    this.group = new THREE.Group();
    this.group.name = 'himmel';
    view.three.add(this.group);
    this.disposables = [];
    const scene = view.three;
    scene.background = new THREE.Color(theme.background);
    scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
    this.buildDome();
    this.clouds = null;
    this.cloudData = [];
    this.cloudN = 0;
    this._frustum = new THREE.Frustum();
    this._sph = new THREE.Sphere();
  }

  track(x) { this.disposables.push(x); return x; }

  buildDome() {
    const stops = this.theme.sky.map(([t, c]) => [t, lin(c)]);
    const dome = colorize(new THREE.SphereGeometry(SKY_R, 24, 14), (p, n, o) => {
      const t = p.y / SKY_R;
      let i = 0;
      while (i < stops.length - 2 && t < stops[i + 1][0]) i++;
      const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
      mixc(c0, c1, smooth(t0, t1, t), o);
    });
    const mat = this.track(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.dome = new THREE.Mesh(this.track(dome), mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    this.domeGroup = new THREE.Group();
    this.domeGroup.add(this.dome);
    if (this.theme.sunDisc) {
      const d = new THREE.Vector3(...this.theme.sun.dir).normalize();
      // Sonne im Hintergrund (Blick nach −Z): Richtung zur Sonne, aber vor die Kamera gelegt
      const sunPos = new THREE.Vector3(d.x * 0.6, 0.22, -1).normalize().multiplyScalar(SKY_R * 0.9);
      const disc = new THREE.Mesh(this.track(new THREE.CircleGeometry(11, 32)), this.track(new THREE.MeshBasicMaterial({ color: 0xfff7d2, fog: false, depthWrite: false })));
      disc.position.copy(sunPos);
      disc.lookAt(0, 0, 0);
      disc.renderOrder = -9;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const c2 = canvas.getContext('2d');
      const grad = c2.createRadialGradient(64, 64, 2, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 250, 225, 0.95)');
      grad.addColorStop(0.25, 'rgba(255, 236, 180, 0.45)');
      grad.addColorStop(0.6, 'rgba(255, 220, 150, 0.12)');
      grad.addColorStop(1, 'rgba(255, 210, 140, 0)');
      c2.fillStyle = grad; c2.fillRect(0, 0, 128, 128);
      const tex = this.track(new THREE.CanvasTexture(canvas));
      tex.colorSpace = THREE.SRGBColorSpace;
      const glow = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.75 })));
      glow.scale.set(70, 70, 1);
      glow.position.copy(sunPos).multiplyScalar(0.98);
      glow.renderOrder = -8;
      this.domeGroup.add(disc, glow);
    }
    this.group.add(this.domeGroup);
  }

  /** Nach dem Levelaufbau: Wolken, Hügel und Wiese um den Level-Umriss legen. */
  fit(bounds) {
    const th = this.theme;
    const rnd = new Rnd(0x5eed);
    const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
    const cx = (x0 + x1) / 2;
    const yBase = Math.min(bounds.min.y, 0);
    if (th.ground) {
      const w = (x1 - x0) + 700, d = (z1 - z0) + 700;
      const g = new THREE.PlaneGeometry(w, d, 1, 1);
      g.rotateX(-Math.PI / 2);
      g.translate(cx, th.ground.y + yBase, (z0 + z1) / 2);
      const col = lin(th.ground.color);
      const mesh = new THREE.Mesh(this.track(colorize(g, (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; })), this.view.mats.world);
      mesh.receiveShadow = false;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
    }
    if (th.backdrop === 'hills') this.buildHills(bounds, rnd, yBase);
    else if (typeof th.buildBackdrop === 'function') th.buildBackdrop(this, bounds, rnd, yBase);   // eigene Kulisse (Welt-2-Themen)
    const opt = this.view.data?.sky?.clouds;
    if (opt === false) return;
    if (th.clouds || (opt !== undefined && opt !== true)) this.buildClouds(bounds, rnd, opt);
  }

  buildHills(bounds, rnd, yBase) {
    const parts = [];
    const th = this.theme;
    const gy = (th.ground?.y ?? -30) + yBase;
    const hill = (x, z, rx, ry, rz, top, base) => {
      const g = new THREE.SphereGeometry(1, 16, 9);
      g.scale(rx, ry, rz);
      g.translate(x, gy - ry * 0.15, z);
      const a = lin(top), b = lin(base);
      parts.push(colorize(g, (p, n, o) => mixc(b, a, smooth(-0.1, 0.9, n.y), o)));
    };
    const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
    // Seitliche Hügel und Berge entlang des Levels, ferne Kette hinter dem Ziel
    for (const side of [-1, 1]) {
      const xs = side < 0 ? x0 - 70 : x1 + 70;
      for (let z = z1 + 40; z > z0 - 60; z -= rnd.real(28, 42)) {
        const r = rnd.real(26, 40);
        hill(xs + side * rnd.real(0, 30), z, r, rnd.real(30, 48), r * 0.9, 0x9ee07a, 0x4f9e48);
      }
    }
    for (let x = x0 - 120; x < x1 + 120; x += rnd.real(30, 44)) {
      const r = rnd.real(30, 46);
      hill(x, z0 - rnd.real(110, 150), r, rnd.real(40, 70), r * 0.8, 0xbfe2c8, 0x86b896);
    }
    const mb = lin(0xaac4e8), ms = lin(0xf1f6fd);
    for (let x = x0 - 160; x < x1 + 160; x += rnd.real(40, 60)) {
      const r = rnd.real(36, 52), h = rnd.real(70, 100);
      const g = new THREE.SphereGeometry(1, 14, 10);
      g.scale(r, h, r * 0.8);
      const z = z0 - rnd.real(200, 240);
      g.translate(x, gy - 6, z);
      parts.push(colorize(g, (p, n, o) => mixc(mb, ms, smooth(0.62, 0.92, (p.y - gy + 6) / h), o)));
    }
    const g = merge(parts);
    if (!g) return;
    const mesh = new THREE.Mesh(this.track(g), this.view.mats.world);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
  }

  buildClouds(bounds, rnd, opt) {
    const parts = [];
    const white = lin(0xffffff), shade = lin(0xd4e3f3);
    for (const [x, y, z, r] of [[0, 0, 0, 1], [-0.95, -0.12, 0.1, 0.72], [0.95, -0.1, -0.1, 0.78], [-0.35, 0.32, -0.2, 0.68], [0.45, 0.36, 0.15, 0.62]]) {
      const s = new THREE.SphereGeometry(r, 8, 6);
      s.translate(x, y, z);
      parts.push(colorize(s, (p, n, o) => mixc(shade, white, smooth(-0.7, 0.5, n.y), o)));
    }
    const g = merge(parts);
    g.scale(1, 0.72, 1);
    g.computeBoundingSphere();
    this.cloudSphere = g.boundingSphere;
    const n = typeof opt === 'number' ? Math.max(0, Math.round(opt)) : Array.isArray(opt) ? opt.length : 22;
    const mat = this.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
    this.clouds = new THREE.InstancedMesh(this.track(g), mat, n);
    this.clouds.frustumCulled = false;
    const x0 = bounds.min.x - 60, x1 = bounds.max.x + 60, z0 = bounds.min.z - 80, z1 = bounds.max.z + 30;
    // Die Kamera blickt steil (45–55°) von oben: die meisten Wolken treiben unter den Inseln,
    // einige seitlich darüber
    for (let i = 0; i < (Array.isArray(opt) ? 0 : n); i++) {
      const above = i % 4 === 0;
      const side = i % 2 ? 1 : -1;
      this.cloudData.push({
        above,
        x: above ? (side < 0 ? rnd.real(x0 - 30, x0 + 20) : rnd.real(x1 - 20, x1 + 30)) : rnd.real(x0 - 20, x1 + 20),
        y: above ? bounds.max.y + rnd.real(4, 16) : bounds.min.y - rnd.real(9, 24),
        z: rnd.real(z0, z1), s: rnd.real(4, 8), sy: rnd.real(0.8, 1.1), v: rnd.real(0.3, 0.8),
        xa: x0 - 40, xb: x1 + 40,
      });
    }
    if (opt === 'above') this.cloudData = this.cloudData.filter((c) => c.above);
    else if (opt === 'below') this.cloudData = this.cloudData.filter((c) => !c.above);
    else if (Array.isArray(opt)) {
      for (const c of opt) {
        const p = c.pos ?? c;
        this.cloudData.push({ x: p[0], y: p[1], z: p[2], s: c.size ?? 6, sy: c.sy ?? 1, v: c.drift ?? 0.5, xa: x0 - 40, xb: x1 + 40 });
      }
    }
    this.placeClouds();
    this.group.add(this.clouds);
  }

  /** Wolken in die Instanzen schreiben – mit Sparmaßnahmen (view.optimize, Kamera übergeben) nur die im Bild. */
  placeClouds(camera = null) {
    const pick = !!camera && this.view.optimize;
    const F = this._frustum, S = this._sph, c0 = this.cloudSphere;
    if (pick) {
      camera.updateMatrixWorld();
      F.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    }
    let k = 0;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      if (pick) {
        S.center.set(c.x + c0.center.x * c.s, c.y + c0.center.y * c.s * c.sy, c.z + c0.center.z * c.s);
        S.radius = c0.radius * c.s * Math.max(1, c.sy);
        if (!F.intersectsSphere(S)) continue;
      }
      _p.set(c.x, c.y, c.z); _s.set(c.s, c.s * c.sy, c.s);
      _m.compose(_p, _q, _s);
      this.clouds.setMatrixAt(k++, _m);
    }
    this.clouds.count = k;
    this.cloudN = k;
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  update(dt, camera) {
    this.domeGroup.position.copy(camera.position);
    this.theme.updateBackdrop?.(this, dt, camera);   // eigene Kulisse animieren (Welt-2-Themen)
    if (this.clouds) {
      for (const c of this.cloudData) { c.x += c.v * dt; if (c.x > c.xb) c.x = c.xa; }
      this.placeClouds(camera);
    }
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const d of this.disposables) d.dispose?.();
    this.disposables.length = 0;
  }
}
