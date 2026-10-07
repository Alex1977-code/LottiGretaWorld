// 3D-Ansicht der Spielszene (Three.js). Die Spiellogik – Phaser Arcade in 480x270 Weltpixeln –
// bleibt unverändert. Diese Klasse:
//  - legt eine eigene WebGL-Leinwand (#gl3d) unter die transparente Phaser-Leinwand,
//  - führt die 3D-Kamera mit der Phaser-Kamera (worldView) mit,
//  - baut das Level als 3D-Welt (World3D) und spiegelt jedes Phaser-Sprite in einen Avatar
//    (Figuren, Gegner, Objekte), der Position, Blickrichtung und Zustand übernimmt,
//  - blendet die Phaser-Grafik der gespiegelten Objekte aus (camera.ignore), die Phaser-Objekte
//    selbst bleiben für Physik, Animation und Kollision vollständig aktiv.
// Koordinaten: 1 Einheit = 1 Tile (16 px). X = px/16, Y = -py/16, Spielebene bei Z = 0.

import * as THREE from 'three';
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { RENDER3D } from '../render3d.js';
import { createAvatar } from './avatars/index.js';
import { World3D } from './world/World3D.js';
import { Effects3D } from './Effects3D.js';
import { getRenderer, mountCanvas, layoutCanvas, hideCanvas } from './renderer.js';

/** Weltpixel → 3D-Einheiten. */
export const U = 1 / GAME.tile;
export const toX = (px) => px * U;
export const toY = (py) => -py * U;

export class View3D {
  /** @param {Phaser.Scene} scene Play-Szene (map und groundLayer müssen existieren) */
  constructor(scene) {
    this.scene = scene;
    this.game = scene.game;
    this.phaserCam = scene.cameras.main;
    this.three = new THREE.Scene();
    this.avatars = new Map();      // Phaser-Objekt → Avatar
    this.time = 0;
    this.frame = 0;
    this.layout = { w: 0, h: 0 };

    const { renderer, canvas } = getRenderer();
    this.renderer = renderer;
    this.canvas = canvas;
    mountCanvas(this.game, canvas);

    this.camera = new THREE.PerspectiveCamera(RENDER3D.fov, GAME.width / GAME.height, 0.5, 300);
    this.target = new THREE.Vector3();
    // Abstand so, dass bei Z = 0 genau die 270 Weltpixel Höhe der Phaser-Kamera sichtbar sind
    this.distance = ((GAME.height * U) / 2) / Math.tan(THREE.MathUtils.degToRad(RENDER3D.fov) / 2) * RENDER3D.zoom;

    this.world = new World3D(this, scene.map, scene.groundLayer);
    this.effects = new Effects3D(this);

    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    scene.events.on(Phaser.Scenes.Events.RENDER, this.render, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.onResize = () => this.syncLayout(true);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    window.addEventListener('resize', this.onResize);

    this.syncLayout(true);
    this.updateCamera();
    window.__view3d = this; // Tests/Fehlersuche
  }

  /** Lage und Größe der 3D-Leinwand an die Phaser-Leinwand angleichen. */
  syncLayout(force = false) {
    layoutCanvas(this.game, this.renderer, this.canvas, this.camera, this.layout, force);
  }

  /** 3D-Kamera aus dem sichtbaren Ausschnitt der Phaser-Kamera ableiten (Zoom ist herausgerechnet). */
  updateCamera() {
    const v = this.phaserCam.worldView;
    const cx = v.x + v.width / 2, cy = v.y + v.height / 2;
    this.target.set(toX(cx), toY(cy), 0);
    const tilt = THREE.MathUtils.degToRad(RENDER3D.tilt);
    const d = this.distance;
    this.camera.position.set(this.target.x, this.target.y + d * Math.sin(tilt), d * Math.cos(tilt));
    this.camera.lookAt(this.target);
  }

  /** Nach dem Spiel-Update: neue Phaser-Objekte entdecken, spiegeln und für die Phaser-Kamera ausblenden. */
  postUpdate() {
    const list = this.scene.children.list;
    for (let i = 0; i < list.length; i++) {
      const obj = list[i];
      if (obj.__view3d !== undefined) continue;
      if (obj.texture) {
        // Sprite/Image/TileSprite: Avatar erzeugen (null = nur ausblenden, z. B. Blätterschirm)
        const av = createAvatar(this, obj);
        obj.__view3d = av ?? false;
        this.phaserCam.ignore(obj);
        if (av) { this.avatars.set(obj, av); this.three.add(av.root); }
      } else if (obj instanceof Phaser.Tilemaps.TilemapLayer || obj instanceof Phaser.GameObjects.Particles.ParticleEmitter) {
        obj.__view3d = false;
        this.phaserCam.ignore(obj);
      }
      // Graphics/Text (Debug) bleiben in Phaser sichtbar
    }
  }

  /** Beim Rendern der Phaser-Szene: Avatare abgleichen und 3D-Bild zeichnen. */
  render() {
    const delta = Math.min(this.game.loop.delta, 50);
    const dt = delta / 1000;
    this.time += dt;
    this.frame++;
    if ((this.frame & 31) === 0) this.syncLayout();
    this.updateCamera();

    for (const [obj, av] of this.avatars) {
      if (!obj.scene) { // zerstört
        this.three.remove(av.root);
        av.dispose();
        this.avatars.delete(obj);
        continue;
      }
      if (av.textureKey !== obj.texture.key) { // Figur gewechselt (Lotti ↔ Greta)
        this.three.remove(av.root);
        av.dispose();
        const neu = createAvatar(this, obj);
        if (neu) { this.avatars.set(obj, neu); this.three.add(neu.root); obj.__view3d = neu; }
        else { this.avatars.delete(obj); obj.__view3d = false; }
        continue;
      }
      av.sync(dt, this.time);
    }
    this.world.update(dt, this.time);
    this.effects.update(dt);
    this.renderer.render(this.three, this.camera);
  }

  /** Weltposition (Pixel) → Bildschirmposition in Phaser-Weltpixeln des sichtbaren Ausschnitts (für 2D-Overlays). */
  project(px, py, pz = 0) {
    const p = new THREE.Vector3(toX(px), toY(py), pz).project(this.camera);
    const v = this.phaserCam.worldView;
    return { x: v.x + ((p.x + 1) / 2) * v.width, y: v.y + ((1 - p.y) / 2) * v.height };
  }

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    this.scene.events.off(Phaser.Scenes.Events.RENDER, this.render, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    window.removeEventListener('resize', this.onResize);
    for (const av of this.avatars.values()) av.dispose();
    this.avatars.clear();
    this.effects.dispose();
    this.world.dispose();
    this.three.clear();
    // Leinwand leeren und verstecken (die nächste Szene zeigt sie bei Bedarf wieder)
    hideCanvas(this.renderer, this.canvas);
    if (window.__view3d === this) window.__view3d = null;
  }
}
