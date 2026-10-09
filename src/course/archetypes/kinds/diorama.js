// Archetyp `diorama` (Rätsel-Diorama, Welt 1: 1-Schatz „Pflaume und der Wolkenwürfel“; Präzisierung Ritt/Diorama):
//   createPlayer → DioramaController (Pflaume, springt nicht, 3,5 m/s)
//   createRig    → PflaumeRig (PflaumeAvatar mit Stirnlampe und Rucksack)
//   camera       → OrbitCamera (frei drehbar um den Würfel, 2 Zoomstufen, folgt leicht)
//   beforeStep   → Kamera drehen (Q/E bzw. ⟲ ⟳ gehalten, Wischen auf der rechten Bildhälfte, Test: setInput({ cam: ±1 })),
//                  Steuer-Gier = Kamera-Gier (Steuerung relativ zur Kamera)
//   afterStep    → Schatzstellen (stehen bleiben oder Aktion → Pflaume buddelt 3 Bitcoins aus), alle Sterne → Siegesablauf
//                  (victory), danach Ergebnis (Zeile „Schatz“ statt Zielmast) – alle Sterne werden gespeichert
//   render       → Glitzern über offenen Schatzstellen
// Level-Daten: LEVEL.diorama = { center: [x, y, z], camera: { yaw, pitch, dist: [überblick, nah], follow, fov },
//   props: [...] (archetypes/DioramaDeco.js: house, mushroom, banner, dig, cloudsea, islet) }.
// Test-Hilfen: arch.setOrbit(deg), arch.orbit, arch.info().

import Phaser from 'phaser';
import { DioramaController } from '../DioramaController.js';
import { PflaumeRig } from '../PflaumeRig.js';
import { OrbitCamera } from '../OrbitCamera.js';
import { buildDioramaProps } from '../DioramaDeco.js';
import { TOUCH_LAYOUT } from '../../input/CourseTouch.js';
import { GAME } from '../../../config.js';

const ROT_SPEED = 100;        // °/s (Tasten/Knöpfe gehalten)
const SWIPE_YAW = 0.45;       // °/Pixel (Logik-Pixel 480×270)
const SWIPE_PITCH = 0.25;

class DioramaArchetype {
  constructor(scene) {
    this.scene = scene;
    const level = scene.level;
    this.cfg = level.data.diorama ?? {};
    // Zier vor dem Levelaufbau, damit sie mit der statischen Geometrie verschmolzen wird
    buildDioramaProps(level, this.cfg.props ?? []);
    this.digs = (this.cfg.props ?? []).filter((p) => p.kind === 'dig').map((p) => ({ x: p.pos[0], y: p.pos[1], z: p.pos[2], t: 0, done: false }));
    level.onTreasureDone = () => this.finishTreasure();
    this.swipe = { dx: 0, dy: 0 };
    this.ptr = { swipe: null, camL: null, camR: null, lx: 0, ly: 0 };
    this.done = false;
    this.sparkT = 0;
  }

  createPlayer(level, opts) { return new DioramaController(level, opts); }
  createRig(view, player) { return new PflaumeRig(view, player); }

  setup() {
    const sc = this.scene;
    this.level = sc.level;
    this.player = sc.player;
    this.view = sc.view;
    this.orbit = new OrbitCamera(sc.view, { center: this.cfg.center ?? [0, 2, 0], ...(this.cfg.camera ?? {}) });
    const kb = sc.input.keyboard;
    if (kb) {
      const KC = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys({ q: KC.Q, e: KC.E }, false);
    }
    this.onDown = (p) => this.pointerDown(p);
    this.onMove = (p) => this.pointerMove(p);
    this.onUp = (p) => this.pointerUp(p);
    sc.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    sc.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    sc.input.on(Phaser.Input.Events.POINTER_UP, this.onUp);
    sc.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp);
    // Ergebnis: „Schatz gefunden“ statt Zielmast-Punkten
    const orig = sc.onLevelDone.bind(sc);
    sc.onLevelDone = (result) => orig({ ...result, pole: null, points: 0, top: false });
    this.level.controlYaw = this.orbit.controlYaw();
    // Kleine Entitäten ohne Sonnenschatten (Schatten-Blobs bleiben): der ganze Würfel ist im Bild, 9 Käfer à 5 Teile
    // würden sonst den Schattenpass sprengen (Budget < 120 Zeichenaufrufe)
    const NO_SHADOW = new Set(['krabbelkaefer', 'star', 'chest', 'spotter', 'coin']);
    for (const e of this.level.entities) if (NO_SHADOW.has(e.kind)) e.model?.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  }

  // ------------------------------------------------------------------ Eingabe (Kamera)

  logical(p) {
    const s = this.scene.scale;
    return { x: (p.x / (s.width || GAME.width)) * GAME.width, y: (p.y / (s.height || GAME.height)) * GAME.height };
  }

  pointerDown(p) {
    const { x, y } = this.logical(p);
    const L = TOUCH_LAYOUT;
    const near = (b, extra) => Math.hypot(x - b.x, y - b.y) <= b.r + extra;
    if (near(L.camL, 5)) { this.ptr.camL = p.id; return; }
    if (near(L.camR, 5)) { this.ptr.camR = p.id; return; }
    if (near(L.zoom, 5) || near(L.A, 12) || near(L.B, 9) || near(L.Y, 9)) return;
    if (x > GAME.width * 0.5 && y > 34 && this.ptr.swipe === null) { this.ptr.swipe = p.id; this.ptr.lx = x; this.ptr.ly = y; }
  }

  pointerMove(p) {
    if (p.id !== this.ptr.swipe) return;
    const { x, y } = this.logical(p);
    this.swipe.dx += (x - this.ptr.lx) * SWIPE_YAW;
    this.swipe.dy += (y - this.ptr.ly) * SWIPE_PITCH;
    this.ptr.lx = x; this.ptr.ly = y;
  }

  pointerUp(p) {
    if (p.id === this.ptr.swipe) this.ptr.swipe = null;
    if (p.id === this.ptr.camL) this.ptr.camL = null;
    if (p.id === this.ptr.camR) this.ptr.camR = null;
  }

  beforeStep(dt, input) {
    const o = this.orbit;
    let dir = 0;
    if (this.keys?.q.isDown || this.ptr.camL !== null) dir -= 1;
    if (this.keys?.e.isDown || this.ptr.camR !== null) dir += 1;
    const ov = this.scene.cinput.override;
    if (ov?.cam) dir += ov.cam;
    if (dir) o.rotate(dir * ROT_SPEED * dt);
    if (this.swipe.dx || this.swipe.dy) { o.rotate(-this.swipe.dx); o.tilt(this.swipe.dy); this.swipe.dx = 0; this.swipe.dy = 0; }
    if (input.zoom) o.toggleZoom();
    this.level.controlYaw = o.controlYaw();
  }

  afterStep(dt, input) {
    const p = this.player, rt = this.level.runtime;
    // Schatzstellen: stehen bleiben (oder Aktion) → buddeln → 3 Bitcoins
    let digging = false;
    if (!p.dead && p.mode === 'ground' && !p.treasure) {
      for (const d of this.digs) {
        if (d.done) continue;
        const near = Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 0.95 && Math.abs(p.pos.y - d.y) < 0.6;
        const still = Math.hypot(p.vel.x, p.vel.z) < 0.6;
        if (near && (still || input.actionPressed)) {
          d.t += dt * (input.actionPressed ? 4 : 1);
          digging = true;
          if (d.t >= 1.1) {
            d.done = true;
            this.level.addCoins(3);
            for (let k = 0; k < 3; k++) this.level.effects?.coinPop({ x: d.x + (k - 1) * 0.35, y: d.y + 0.2, z: d.z });
            this.level.effects?.dust({ x: d.x, y: d.y, z: d.z }, 6);
            this.level.sfx('coin');
          }
        } else d.t = Math.max(0, d.t - dt * 2);
      }
    }
    p.digging = digging;
    // alle Sterne gefunden → Siegesablauf
    if (!this.done && rt.status === 'play' && !p.dead) {
      const n = this.level.data.stars?.length ?? 5;
      if (rt.stars.slice(0, n).every(Boolean)) {
        this.done = true;
        p.startTreasure();
        this.orbit.focus = true;
        this.level.effects?.sparks({ x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 24);
      }
    }
  }

  finishTreasure() {
    const rt = this.level.runtime;
    if (rt.status !== 'play' && rt.status !== 'goal') return;
    rt.status = 'goal';
    rt.pole = null;
    rt.points = 0;
    rt.finish();
  }

  render(dt) {
    this.sparkT -= dt;
    if (this.sparkT > 0) return;
    this.sparkT = 0.45;
    for (const d of this.digs) if (!d.done) this.level.effects?.sparks({ x: d.x, y: d.y + 0.25, z: d.z }, 2);
  }

  camera(dt, player) {
    this.orbit.update(dt, player);
    return true;
  }

  setOrbit(deg) { this.orbit.setYaw(deg); this.level.controlYaw = this.orbit.controlYaw(); }

  info() {
    const rt = this.level?.runtime;
    return {
      orbit: this.orbit?.info(), stars: rt ? rt.stars.filter(Boolean).length : 0, digs: this.digs.filter((d) => d.done).length,
      treasure: !!this.player?.treasure, done: this.done,
    };
  }

  dispose() {
    const inp = this.scene.input;
    if (this.onDown) {
      inp.off(Phaser.Input.Events.POINTER_DOWN, this.onDown);
      inp.off(Phaser.Input.Events.POINTER_MOVE, this.onMove);
      inp.off(Phaser.Input.Events.POINTER_UP, this.onUp);
      inp.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp);
    }
    if (this.keys) { try { inp.keyboard?.removeKey(this.keys.q, false); inp.keyboard?.removeKey(this.keys.e, false); } catch (_) { /* Szene endet */ } }
  }
}

export const ARCHETYPES = { diorama: (scene) => new DioramaArchetype(scene) };
