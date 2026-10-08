// 3D-Ansicht eines Kurs-Levels: nutzt den gemeinsamen Renderer (src/three/renderer.js, Leinwand unter der
// transparenten Phaser-Leinwand), baut Szene, Kamera (CameraRig), Licht und Himmel je Thema, verschmilzt
// statische Level-Geometrie (StaticBatcher), zeichnet Schatten-Blobs und Partikel.
//
// Schnittstelle für Bausteine/Entitäten (Präzisierung Motor):
//   view.three, view.camera, view.renderer          (auch für createAvatar)
//   view.theme                                      Farben des Themas (themes.js)
//   view.mats.world|stone|glow                      gemeinsame Vertexfarben-Materialien
//   view.addStatic(geometry, { material, castShadow, receiveShadow })   wird verschmolzen (Weltkoordinaten)
//   view.add(object3D, updateFn?)                   eigenes Objekt (bewegt/animiert); updateFn(dt, t) je Bild
//   view.remove(object3D)
//   view.onFrame(fn) → Abmelde-Funktion             je Bild fn(dt, t)
//   view.pool(name, makeTemplate, opts)             InstancePool (einmal je Name)
//   view.shadows.add({ pos, radius, alive })        Schatten-Blob
//   view.effects.dust|sparks|debris|splash|ring|coinPop(...)
//   view.addLantern(x, y, z)                        Laternenlicht (Thema cave)

import * as THREE from 'three';
import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { RENDER3D } from '../../render3d.js';
import { getRenderer, mountCanvas, layoutCanvas, hideCanvas, adaptQuality } from '../../three/renderer.js';
import { getTheme } from './themes.js';
import { Sky } from './Sky.js';
import { StaticBatcher } from './StaticBatcher.js';
import { InstancePool } from './InstancePool.js';
import { BlobShadows } from './BlobShadows.js';
import { CourseEffects } from './Effects.js';
import { CameraRig } from './CameraRig.js';

const SHADOW_R = 22;
const MAX_LANTERNS = 4;

export class CourseView {
  /**
   * @param {Phaser.Scene} scene CourseScene
   * @param {object} data LEVEL
   */
  constructor(scene, data) {
    this.scene = scene;
    this.game = scene.game;
    this.three = new THREE.Scene();
    this.three.name = `kurs:${data.id}`;
    this.theme = getTheme(data.theme);
    this.time = 0;
    this.frame = 0;
    this.layout = { w: 0, h: 0 };
    this.frameFns = [];
    this.pools = new Map();
    this.lanterns = [];

    const { renderer, canvas } = getRenderer();
    this.renderer = renderer;
    this.canvas = canvas;
    mountCanvas(this.game, canvas);

    this.camera = new THREE.PerspectiveCamera(40, GAME.width / GAME.height, 0.3, 700);
    this.rig = new CameraRig(this.camera, data.camera);

    this.mats = {
      world: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }),
      stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    this.buildLights();
    this.sky = new Sky(this, this.theme);
    this.static = new StaticBatcher(this);
    this.shadows = new BlobShadows(this);
    this.effects = new CourseEffects(this);

    this.onResize = () => this.syncLayout(true);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    window.addEventListener('resize', this.onResize);
    this.syncLayout(true);
  }

  buildLights() {
    const th = this.theme;
    this.hemi = new THREE.HemisphereLight(th.hemi.sky, th.hemi.ground, th.hemi.intensity);
    this.sun = new THREE.DirectionalLight(th.sun.color, th.sun.intensity);
    this.sunDir = new THREE.Vector3(...th.sun.dir).normalize();
    this.sun.castShadow = RENDER3D.shadows && th.shadows;
    const sc = this.sun.shadow.camera;
    sc.left = -SHADOW_R; sc.right = SHADOW_R; sc.top = SHADOW_R; sc.bottom = -SHADOW_R; sc.near = 1; sc.far = 120;
    this.sun.shadow.mapSize.set(RENDER3D.shadowMapSize, RENDER3D.shadowMapSize);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.texel = (2 * SHADOW_R) / RENDER3D.shadowMapSize;
    this.three.add(this.hemi, this.sun, this.sun.target);
    if (th.playerLight) {
      const l = th.playerLight;
      this.playerLight = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
      this.three.add(this.playerLight);
    }
    if (th.lanternLight) {
      const l = th.lanternLight;
      for (let i = 0; i < MAX_LANTERNS; i++) {
        const pl = new THREE.PointLight(l.color, 0, l.distance, 2);
        this.three.add(pl);
        this.lanterns.push({ light: pl, pos: null });
      }
      this.lanternSpots = [];
    }
  }

  // ------------------------------------------------------------------ Schnittstelle für Bausteine

  addStatic(geometry, opts) { this.static.add(geometry, opts); }

  add(obj, update) {
    this.three.add(obj);
    if (update) this.frameFns.push({ obj, fn: update });
    return obj;
  }

  remove(obj) {
    obj.parent?.remove(obj);
    this.frameFns = this.frameFns.filter((f) => f.obj !== obj);
  }

  onFrame(fn) {
    const e = { obj: null, fn };
    this.frameFns.push(e);
    return () => { this.frameFns = this.frameFns.filter((f) => f !== e); };
  }

  /** Instanz-Pool je Name (Vorlage wird beim ersten Aufruf gebaut). */
  pool(name, makeTemplate, opts = {}) {
    let p = this.pools.get(name);
    if (!p) {
      p = new InstancePool(this.three, makeTemplate(), { name, ...opts });
      this.pools.set(name, p);
    }
    return p;
  }

  /** Laternenlicht an (x, y, z) – im Thema cave leuchten die nächsten MAX_LANTERNS. */
  addLantern(x, y, z) { this.lanternSpots?.push(new THREE.Vector3(x, y, z)); }

  /** Nach dem Levelaufbau: verschmelzen, Hintergrund auslegen. */
  finalize(bounds) {
    this.static.build();
    this.sky.fit(bounds);
    this.bounds = bounds;
  }

  // ------------------------------------------------------------------ Je Bild

  syncLayout(force = false) {
    layoutCanvas(this.game, this.renderer, this.canvas, this.camera, this.layout, force);
  }

  /** Kamera, Licht, Himmel, Animationen, Blobs, Partikel – dann zeichnen. */
  render(dt, player, world) {
    this.time += dt;
    this.frame++;
    if (adaptQuality(this.game.loop.delta)) this.syncLayout(true);
    else if ((this.frame & 31) === 0) this.syncLayout();
    if (player) this.rig.update(dt, player, world);
    // Sonne und Schattenbereich folgen dem Kameraziel (auf Texel gerastert gegen Flimmern)
    const tg = this.rig.target;
    const t = this.texel;
    const x = Math.round(tg.x / t) * t, y = Math.round(tg.y / t) * t, z = Math.round(tg.z / t) * t;
    this.sun.target.position.set(x, y, z - 4);
    this.sun.position.set(x + this.sunDir.x * 50, y + this.sunDir.y * 50, z - 4 + this.sunDir.z * 50);
    if (this.playerLight && player) this.playerLight.position.set(player.pos.x, player.pos.y + 3.2, player.pos.z + 1.4);
    if (this.lanternSpots?.length) this.updateLanterns(tg);
    this.sky.update(dt, this.camera);
    for (const f of this.frameFns) f.fn(dt, this.time);
    if (world) this.shadows.update(world);
    this.effects.update(dt);
    this.renderer.setClearColor(this.theme.background, 1);
    this.renderer.render(this.three, this.camera);
  }

  updateLanterns(tg) {
    const spots = this.lanternSpots.slice().sort((a, b) => a.distanceToSquared(tg) - b.distanceToSquared(tg));
    const l = this.theme.lanternLight;
    this.lanterns.forEach((ln, i) => {
      const s = spots[i];
      if (s) { ln.light.position.copy(s); ln.light.intensity = l.intensity; } else ln.light.intensity = 0;
    });
  }

  /** Bildschirmposition (480x270-Logik) eines Weltpunkts – für HUD-Marker. */
  project(x, y, z) {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((p.x + 1) / 2) * GAME.width, y: ((1 - p.y) / 2) * GAME.height, visible: p.z < 1 };
  }

  stats() {
    const i = this.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, staticMeshes: this.static.stats.meshes, staticParts: this.static.stats.parts };
  }

  dispose() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    window.removeEventListener('resize', this.onResize);
    for (const p of this.pools.values()) p.dispose();
    this.pools.clear();
    this.static.dispose();
    this.shadows.dispose();
    this.effects.dispose();
    this.sky.dispose();
    this.sun.shadow.map?.dispose();
    for (const m of Object.values(this.mats)) m.dispose();
    // Übrige Geometrien/Materialien der Bausteine freigeben (geteilte Avatar-Caches nicht anfassen)
    this.three.traverse((o) => {
      if (o.userData?.owned) { o.geometry?.dispose?.(); if (o.material && !Array.isArray(o.material)) o.material.dispose?.(); }
    });
    this.three.clear();
    hideCanvas(this.renderer, this.canvas);
  }
}
