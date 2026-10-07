// 3D-Ansicht der Weltkarte (Three.js): eine kleine Hügelinsel im Stil der Oberwelt von
// Super Mario 3D World, über die die 3D-Figur der Heldin zwischen den Level-Punkten läuft.
// Die Spiellogik der Karte (Pfade, Freischaltung, Antippen, Tastatur, Figurwahl) bleibt in
// WorldMapScene/Phaser; diese Klasse
//  - zeichnet Insel, Wasser, Wege, Podeste, Deko, Himmel und die Heldin auf der 3D-Leinwand,
//  - blendet die 2D-Grafik der Karte für die Phaser-Kamera aus (Beschriftungen bleiben in Phaser),
//  - führt die Knoten-Container (Treffflächen + Beschriftung) jeden Frame an die projizierte
//    3D-Position, damit Tippen dort wirkt, wo man den Knoten sieht.
// Koordinaten: Kartenpixel (x, y) in 480x270 → X = x/16, Z = y/16 (Tiefe), Y = Geländehöhe.

import * as THREE from 'three';
import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { RENDER3D } from '../../render3d.js';
import { createAvatar } from '../avatars/index.js';
import { getRenderer, mountCanvas, layoutCanvas, hideCanvas } from '../renderer.js';
import { Island, U, CX, CZ, smoothstep, lerp } from './terrain.js';
import { rng, scatterTrees, scatterBushes, makeTreeMeshes, makeStones, makeFlowers, makeClouds, makeMountains, makeSky, makeWater, makeGlints } from './props.js';
import { buildPathMeshes, samplePaths, NodeMarkers, PODIUM_R } from './paths.js';

/** Kamera der Karte: Perspektive schräg von vorn-oben; der Bildausschnitt wird so gelegt, dass
 *  alle Knoten/Wege in `rect` (Kartenpixel) liegen – oben Platz für Titel/Porträts, unten für Info/Start. */
const MAP_CAM = {
  fov: 36,
  tilt: 38,                                      // Grad, Blick von oben
  rect: { x0: 70, x1: 410, y0: 104, y1: 212 },   // Zielfenster für Knoten (inkl. Fahnenspitzen) und Wege
  sway: 0.14,                                    // leichtes Schweben (Einheiten)
};

const lerpAngle = (a, b, t) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export class MapView3D {
  /** @param {import('../../scenes/WorldMapScene.js').WorldMapScene} scene */
  constructor(scene) {
    this.scene = scene;
    this.game = scene.game;
    this.phaserCam = scene.cameras.main;
    this.three = new THREE.Scene();
    this.time = 0;
    this.frame = 0;
    this.layout = { w: 0, h: 0 };
    this.disposables = [];
    this.heroScreen = { x: 0, y: 0 }; // projizierte Figur (Kartenpixel) für den Tipp-Test
    this.heroYaw = -Math.PI / 2;      // Blick zur Kamera
    this.heroLast = { x: scene.hero?.x ?? 0, y: scene.hero?.y ?? 0 };

    const { renderer, canvas } = getRenderer();
    this.renderer = renderer;
    this.canvas = canvas;
    mountCanvas(this.game, canvas);

    this.camera = new THREE.PerspectiveCamera(MAP_CAM.fov, GAME.width / GAME.height, 0.5, 220);
    this.camBase = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();

    this.buildSky();
    this.buildLights();
    this.island = new Island();
    this.three.add(this.island.mesh);
    this.buildWater();
    this.paths = null;
    this.updatePaths();
    this.markers = new NodeMarkers(this, this.island);
    this.three.add(this.markers.group);
    this.buildProps();

    this.heroAvatar = null;
    this.syncHero(0);

    this.hidePhaserGraphics();
    this.frameCamera();

    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    scene.events.on(Phaser.Scenes.Events.RENDER, this.render, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.onResize = () => this.syncLayout(true);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    window.addEventListener('resize', this.onResize);

    this.syncLayout(true);
    this.postUpdate();
    window.__mapView3d = this; // Tests/Fehlersuche
  }

  track(x) { this.disposables.push(x); return x; }

  // ---------- Aufbau ----------

  buildSky() {
    this.three.background = new THREE.Color(0x8fd2ff);
    this.three.fog = new THREE.Fog(0xd6ebf9, 36, 95);
    this.sky = makeSky((x) => this.track(x));
    this.three.add(this.sky);
    const rnd = rng(1337);
    this.mountains = makeMountains(rnd, (x) => this.track(x));
    this.three.add(this.mountains);
    this.clouds = makeClouds(rnd, (x) => this.track(x));
    this.three.add(this.clouds.mesh);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xd8ecff, 0x6a9a48, 0.95);
    this.sun = new THREE.DirectionalLight(0xfff3dc, 2.1);
    this.sun.castShadow = RENDER3D.shadows;
    this.sun.position.set(CX - 14, 24, CZ + 12);
    this.sun.target.position.set(CX, 0.8, CZ);
    const sc = this.sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 19; sc.bottom = -19; sc.near = 4; sc.far = 70;
    this.sun.shadow.mapSize.set(RENDER3D.shadowMapSize, RENDER3D.shadowMapSize);
    this.sun.shadow.bias = -0.0012;
    this.sun.shadow.normalBias = 0.025;
    this.three.add(this.hemi, this.sun, this.sun.target);
  }

  buildWater() {
    this.water = makeWater((x) => this.track(x));
    this.three.add(this.water.mesh);
    this.glints = makeGlints(rng(77), (x) => this.track(x));
    this.three.add(this.glints.mesh);
  }

  /** Bäume, Büsche, Steine, Blumen – nie auf Wegen/Knoten und nicht vor den Knoten (Sichtkorridor). */
  buildProps() {
    const rnd = rng(4242);
    const pathPts = samplePaths(this.scene);
    const nodes = this.island.nodes;
    const tilt = Math.tan(THREE.MathUtils.degToRad(MAP_CAM.tilt));
    const isFree = (X, Z, r) => {
      for (const n of nodes) {
        if (Math.hypot(X - n.X, Z - n.Z) < 2.3 + r) return false;
        // vor dem Knoten (näher an der Kamera) würde die Krone den Knoten verdecken
        if (Math.abs(X - n.X) < 1.9 + r && Z > n.Z && Z < n.Z + 2.2 / tilt + 2.2) return false;
      }
      for (const p of pathPts) {
        if (Math.hypot(X - p.X, Z - p.Z) < 0.95 + r) return false;
        if (Math.abs(X - p.X) < 0.9 + r && Z > p.Z && Z < p.Z + 1.7 / tilt + 0.8) return false;
      }
      return true;
    };
    const trees = scatterTrees(this.island, isFree, rnd);
    const bushFree = (X, Z, r) => isFree(X, Z, r) && trees.every((t) => Math.hypot(t.X - X, t.Z - Z) > t.s * 0.9 + r);
    const bushes = scatterBushes(this.island, bushFree, rnd);
    // Kronen und Büsche teilen sich ein InstancedMesh (Kugeln mit Instanzfarbe)
    const { trunks, crowns } = makeTreeMeshes(trees, bushes, this.island, (x) => this.track(x));
    const stones = makeStones(this.island, bushFree, rnd, (x) => this.track(x));
    const flowerFree = (X, Z, r) => trees.every((t) => Math.hypot(t.X - X, t.Z - Z) > t.s * 0.7)
      && nodes.every((n) => Math.hypot(X - n.X, Z - n.Z) > 1.5)
      && pathPts.every((p) => Math.hypot(X - p.X, Z - p.Z) > 0.6);
    const flowers = makeFlowers(this.island, flowerFree, rnd, (x) => this.track(x));
    this.props = new THREE.Group();
    this.props.name = 'props';
    this.props.add(trunks, crowns, stones, flowers);
    this.three.add(this.props);
    this.treeCount = trees.length;
  }

  /** Wege neu bauen (nach Freischaltung). */
  updatePaths() {
    if (this.paths) {
      this.three.remove(this.paths);
      this.paths.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }
    this.paths = buildPathMeshes(this.scene, (X, Z) => this.island.heightAt(X, Z), (x) => x);
    this.three.add(this.paths);
    this.markers?.refresh();
  }

  /** Neu freigeschalteten Knoten hüpfen lassen. */
  hopNode(key) { this.markers.hop(key); }

  /** 2D-Grafik der Karte für die Phaser-Kamera ausblenden (Beschriftungen bleiben sichtbar). */
  hidePhaserGraphics() {
    const s = this.scene;
    const hide = [];
    if (s.bgImage) hide.push(s.bgImage);
    if (s.pathGfx) hide.push(s.pathGfx);
    if (s.hero) hide.push(s.hero);
    for (const c of Object.values(s.nodeSprites ?? {})) {
      const p = c.parts ?? {};
      if (p.flag) hide.push(p.flag);
      if (p.key) hide.push(p.key);
      // Der Knoten-Kreis trägt die Trefffläche: Phaser nimmt nur Objekte für die Eingabe, die die
      // Kamera auch zeichnet (willRender) – deshalb nicht ausblenden, sondern ohne Füllung/Rand lassen.
      if (p.base) { p.base.setFillStyle(); p.base.setStrokeStyle(); }
    }
    this.phaserCam.ignore(hide);
  }

  // ---------- Kamera ----------

  /** Höhe, auf der die Figur steht: Gelände, auf den Podesten deren Oberseite. */
  groundHeight(X, Z) {
    let y = this.island.heightAt(X, Z);
    this.island.nodes.forEach((n, i) => {
      const d = Math.hypot(X - n.X, Z - n.Z);
      if (d < PODIUM_R + 0.35) y = Math.max(y, lerp(y, this.markers.topY(i), smoothstep(PODIUM_R + 0.35, PODIUM_R - 0.05, d)));
    });
    return y;
  }

  /** Blickrichtung der Kamera (fest), Position so wählen, dass alle Punkte im Zielfenster liegen. */
  frameCamera() {
    const tilt = THREE.MathUtils.degToRad(MAP_CAM.tilt);
    const dir = new THREE.Vector3(0, -Math.sin(tilt), -Math.cos(tilt)); // Blick nach hinten-unten
    const pois = [];
    this.island.nodes.forEach((n, i) => {
      const y = this.markers.topY(i);
      pois.push(new THREE.Vector3(n.X - PODIUM_R, y, n.Z), new THREE.Vector3(n.X + PODIUM_R, y, n.Z), new THREE.Vector3(n.X, y, n.Z + PODIUM_R), new THREE.Vector3(n.X, y + 1.35, n.Z - 0.45));
    });
    for (const p of samplePaths(this.scene)) pois.push(new THREE.Vector3(p.X, this.island.heightAt(p.X, p.Z), p.Z));
    const r = MAP_CAM.rect;
    const target = new THREE.Vector3();
    for (const p of pois) target.add(p);
    target.multiplyScalar(1 / pois.length);
    let dist = 40;
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(right, dir).normalize(); // Bildschirm-oben
    const v = new THREE.Vector3();
    for (let it = 0; it < 14; it++) {
      this.camera.position.copy(target).addScaledVector(dir, -dist);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of pois) {
        v.copy(p).project(this.camera);
        const x = ((v.x + 1) / 2) * GAME.width, y = ((1 - v.y) / 2) * GAME.height;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      const s = Math.max((x1 - x0) / (r.x1 - r.x0), (y1 - y0) / (r.y1 - r.y0));
      const pxPerUnit = GAME.height / (2 * dist * Math.tan(THREE.MathUtils.degToRad(MAP_CAM.fov) / 2));
      const dcx = (x0 + x1) / 2 - (r.x0 + r.x1) / 2, dcy = (y0 + y1) / 2 - (r.y0 + r.y1) / 2;
      target.addScaledVector(right, dcx / pxPerUnit).addScaledVector(up, -dcy / pxPerUnit);
      dist *= 1 + (s - 1) * 0.9;
    }
    this.camBase.copy(target).addScaledVector(dir, -dist);
    this.camTarget.copy(target);
    this.camDist = dist;
    this.updateCamera(0);
  }

  /** Leichtes, langsames Schweben – reine Verschiebung, die Projektion wird jeden Frame nachgeführt. */
  updateCamera(t) {
    const a = MAP_CAM.sway;
    const ox = Math.sin(t * 0.37) * a, oy = Math.sin(t * 0.53 + 1.0) * a * 0.6;
    this.camera.position.set(this.camBase.x + ox, this.camBase.y + oy, this.camBase.z);
    this.camera.lookAt(this.camTarget.x + ox, this.camTarget.y + oy, this.camTarget.z);
    this.camera.updateMatrixWorld();
  }

  /** 3D-Punkt → Kartenpixel (480x270). */
  project(X, Y, Z) {
    const p = _v.set(X, Y, Z).project(this.camera);
    return { x: ((p.x + 1) / 2) * GAME.width, y: ((1 - p.y) / 2) * GAME.height };
  }

  syncLayout(force = false) {
    layoutCanvas(this.game, this.renderer, this.canvas, this.camera, this.layout, force);
  }

  // ---------- Je Frame ----------

  /** Heldin: Avatar erzeugen/wechseln, Position aus Kartenpixeln auf das Gelände legen, Blickrichtung. */
  syncHero(dt) {
    const hero = this.scene.hero;
    if (!hero) return;
    if (this.heroAvatar && this.heroAvatar.textureKey !== hero.texture.key) { // Lotti ↔ Greta
      this.three.remove(this.heroAvatar.root);
      this.heroAvatar.dispose();
      this.heroAvatar = null;
    }
    if (!this.heroAvatar) {
      const av = createAvatar(this, hero);
      if (!av) return;
      av.usesFacing = false;
      this.heroAvatar = av;
      this.three.add(av.root);
    }
    const av = this.heroAvatar;
    av.sync(dt, this.time);
    // Fußpunkt auf der Karte: Sprite steht 10 px über dem Knoten (siehe WorldMapScene.walkTo)
    const X = hero.x * U, Z = (hero.y + 10) * U;
    const Y = this.groundHeight(X, Z);
    av.root.position.set(X, Y, Z);
    // Blickrichtung aus der Laufrichtung in der Ebene (Modelle blicken nach +X); im Stand zur Kamera (+Z)
    const mx = hero.x - this.heroLast.x, mz = hero.y - this.heroLast.y;
    this.heroLast.x = hero.x; this.heroLast.y = hero.y;
    const want = Math.hypot(mx, mz) > 0.05 ? Math.atan2(-mz, mx) : -Math.PI / 2;
    this.heroYaw = dt > 0 ? lerpAngle(this.heroYaw, want, Math.min(1, 10 * dt)) : want;
    av.model.rotation.y = this.heroYaw;
    const hp = this.project(X, Y + 0.75, Z);
    this.heroScreen.x = hp.x; this.heroScreen.y = hp.y;
  }

  /** Knoten-Container (Treffflächen + Beschriftung) an die projizierte Podest-Oberseite legen. */
  syncNodes() {
    const sprites = this.scene.nodeSprites ?? {};
    this.island.nodes.forEach((n, i) => {
      const c = sprites[n.key];
      if (!c) return;
      const p = this.project(n.X, this.markers.topY(i) + 0.02, n.Z);
      c.setPosition(p.x, p.y);
    });
  }

  postUpdate() {
    const delta = Math.min(this.game.loop.delta, 50);
    const dt = delta / 1000;
    this.time += dt;
    this.frame++;
    if ((this.frame & 31) === 0) this.syncLayout();
    this.updateCamera(this.time);
    this.markers.update(dt, this.time);
    this.syncHero(dt);
    this.syncNodes();
    this.water.update(this.time);
    this.glints.update(this.time);
    this.clouds.update(dt);
  }

  render() {
    this.renderer.render(this.three, this.camera);
  }

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    this.scene.events.off(Phaser.Scenes.Events.RENDER, this.render, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    window.removeEventListener('resize', this.onResize);
    if (this.heroAvatar) { this.heroAvatar.dispose(); this.heroAvatar = null; }
    this.markers.dispose();
    if (this.paths) this.paths.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    this.island.dispose();
    for (const d of this.disposables) d.dispose?.();
    this.disposables.length = 0;
    this.sun.shadow.map?.dispose();
    this.three.clear();
    hideCanvas(this.renderer, this.canvas);
    if (window.__mapView3d === this) window.__mapView3d = null;
  }
}

const _v = new THREE.Vector3();
