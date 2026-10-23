// Hilfen für das Welt-2-Finale 2-Panzer „Brummbärs Panzerparade“ (kein Level: exportiert kein LEVEL, die
// Level-Registry überspringt dieses Modul). Enthält
//   1) die Konvoi-Rechnung (Bildfenster und Panzer, Konvoi-Koordinate c → Weltlage beim Fahrtbeginn),
//   2) level-lokale Entitäten (Panzerluke, Holzwand mit Baron-Gesicht, Metalltor, Wimpel, Staubfahnen,
//      Fluchtszene des Barons) und
//   3) die Haken des Levels:
//      · `panzerBuild(level)` beim Aufbau – die erste Laterne (Baustein `lantern`, `lit: true`, Aktion `onLit` als
//        Funktion) ruft ihn vor allen anderen Bausteinen: Abendrot (färbt Inseln, Himmel, Kulisse) und der in die
//        statische Geometrie gebackene Festungspanzer; beides geht nach dem Verschmelzen nicht mehr,
//      · `panzerSetup(level)` = `LEVEL.setup` (offizieller Level-Haken nach dem Aufbau, Code je Schritt über
//        level.onStep): lokale Teile aus LEVEL.panzer, Mitfahr-Regeln für die Welt-2-Gimmicks auf den fahrenden
//        Panzern, Luke, Ansagen, Baron-Flucht mit Kameraschwenk.
//      Es werden keine gemeinsamen Dateien verändert.
//
// Konvoi-Koordinate c: Meter entlang des Panzerzugs nach vorn (−Z) ab dem Heck des ersten Panzers, gemessen beim
// Fahrtbeginn (Weltlage z = −c). Alle Panzer fahren mit VT, das Bildfenster schneller (VW): es gleitet mit
// VW − VT ≈ 2,2 m/s am Zug entlang nach vorn. Am Ende halten Fenster und Panzer gemeinsam (Fenstermitte über dem
// Kommandopanzer), die Luke darauf öffnet sich und führt in die Bossarena.

import * as THREE from 'three';
import { ScrollWindow } from '../../archetypes/ScrollWindow.js';
import { Gimmick, runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { pipeGeo } from '../../blocks/types/pipe.js';
import { bakeModel } from '../../blocks/w2kit.js';
import { DESERT_THEME } from '../../view/theme_desert.js';
import { colorize, merge, lin } from '../../../three/world/geometry.js';

// ====================================================================== 1) Konvoi-Rechnung

export const VT = 3.0;          // m/s Panzer
export const VW = 5.2;          // m/s Bildfenster
export const ZP = 20;           // Fensterpfad beginnt bei z = 20 (Pfadlänge s = ZP − z)
export const CW0 = 6;           // Fenstermitte beim Start (Konvoi-Koordinate)
export const CEND = 176;        // Fenstermitte am Ende (über dem Kommandopanzer)
export const DELAY = 2;         // s bis zur Abfahrt
export const ACCEL = 6;
const BRAKE = 3;

/**
 * Fensterfahrt so bestimmen, dass die Fenstermitte beim Halt genau über CEND steht (Panzer fahren VT ab der Abfahrt).
 * Rechnet das Bildfenster mit derselben Mathematik wie das Spiel (ScrollWindow) – Ergebnis: Ende des Fensters (Pfad-
 * länge) und Fahrtdauer bis zum Halt; die Panzer halten nach RIDE Metern (weich gebremst, kurz nach dem Fenster).
 */
function solveRide() {
  let travel = (CEND - CW0) * VW / (VW - VT);
  let T = 0;
  for (let k = 0; k < 8; k++) {
    const w = new ScrollWindow({ path: [[0, 0, ZP], [0, 0, -3000]], start: ZP + CW0, end: ZP + CW0 + travel, speed: VW, accel: ACCEL, delay: 0 });
    let n = 0;
    while (w.state !== 'done' && n < 120 * 600) { w.step(1 / 120); n++; }
    T = w.clock;
    const cw = CW0 + travel - VT * T;
    travel += CEND - cw;
  }
  return { travel, T };
}
const SOLVED = solveRide();
export const RIDE_T = SOLVED.T;                         // s Fahrt (Fenster) bis zum Halt
export const WIN_END = ZP + CW0 + SOLVED.travel;        // Pfadlänge des Fensterendes
export const RIDE = VT * SOLVED.T + (VT * VT) / (2 * BRAKE) / 2;   // m Fahrstrecke der Panzer bis zum Halt

/** Weltpunkt (Fahrtbeginn) zu Konvoi-Koordinate c, seitlich x, Höhe y. */
export const P = (c, x = 0, y = 0) => [x, y, -c];

/** Weltlage (Fahrtbeginn) eines Panzers bzw. Punkt auf ihm: dc entlang (vorn +), dx seitlich, y Höhe. */
export function onTank(t, dc, dx, y) { return [t.x + dx, y, -(t.c + dc)]; }

/**
 * Panzer als Baustein: t = { id, c (Mitte), len, w, h (Deckhöhe), x (Spur), color, parts: [{ dc, dx, y, size, color }] }.
 * Teile in Panzer-Koordinaten (dc nach vorn, dx rechts, y über der Fahrebene).
 */
export function tank(t) {
  const parts = (t.parts ?? []).map((q) => ({ pos: [q.dx ?? 0, q.y ?? t.h, -(q.dc ?? 0)], size: q.size, color: q.color, solid: q.solid, climbable: q.climbable, tag: q.tag }));
  return {
    type: 'vehicle', id: t.id, style: 'tank', size: [t.w, t.h, t.len], at: ZP + t.c, speed: VT, stop: ZP + t.c + RIDE, brake: BRAKE,
    offset: [t.x ?? 0, 0], color: t.color ?? 'rot', parts,
  };
}

// ====================================================================== 2) Level-lokale Entitäten

/** Lokale Entität anmelden (wie level.spawn, ohne Registry). */
export function spawnLocal(level, e) {
  level.entities.push(e);
  if (e.spec?.id) level.named.set(e.spec.id, e);
  if (e.shadow > 0 && level.view) level.view.shadows.add({ pos: e.pos, radius: e.shadow, alive: () => !e.removed, visible: () => e.alive && e.shadowVisible !== false });
  return e;
}

function owned(obj) { obj.traverse?.((o) => { if (o.isMesh || o.isInstancedMesh) o.userData.owned = true; }); return obj; }

/**
 * Panzerluke: rot-goldene Röhre mit Klappdeckel auf dem Kommandopanzer. Solange der Zug fährt, ist der Deckel zu;
 * beim Halt (Fenster `done`) springt er auf, ein Pfeil hüpft darüber – Ducken auf der Röhre → Bossarena.
 * { id, pos, attach, target: Röhren-Id | [x, y, z], height 1.1, radius 0.85 }
 */
class Luke extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'panzerluke');
    this.R = spec.radius ?? 0.85;
    this.H = spec.height ?? 1.1;
    this.touch = false;
    this.open = false;
    this.openK = 0;
    this.knock = 0;
    const self = this;
    this.info = {
      pipe: true, enterRadius: this.R * 0.7,
      get x() { return self.pos.x; }, get z() { return self.pos.z; }, get top() { return self.pos.y + self.H; },
      enter: (pl) => self.enter(pl),
    };
    const p = this.pos;
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: this.R + 0.08, y0: p.y, y1: p.y + this.H, pipe: this.info, tag: 'panzerluke' });
    if (level.view) this.buildView();
  }

  buildView() {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.15 });
    const body = new THREE.Mesh(pipeGeo(0, 0, 0, this.H, this.R, 0xc0283a), mat);
    body.castShadow = true; body.receiveShadow = true;
    // Deckel: Scharnier hinten, Goldplatte mit Tatzen-Wappen (Ringe), klappt nach hinten auf
    this.lid = new THREE.Group();
    this.lid.position.set(0, this.H + 0.02, -this.R * 0.92);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.3, metalness: 0.7, emissive: 0x2a1a00 });
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(this.R * 0.98, this.R * 0.98, 0.12, 28), lidMat);
    disk.position.set(0, 0.06, this.R * 0.92);
    const paw = new THREE.Mesh(new THREE.TorusGeometry(this.R * 0.45, 0.06, 6, 20), new THREE.MeshStandardMaterial({ color: 0x7a1220, roughness: 0.5 }));
    paw.rotation.x = Math.PI / 2; paw.position.set(0, 0.13, this.R * 0.92);
    disk.castShadow = true;
    this.lid.add(disk, paw);
    // Pfeil (erscheint beim Öffnen)
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    this.arrow = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), arrowMat);
    cone.rotation.x = Math.PI;
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), arrowMat);
    stem.position.y = 0.42;
    this.arrow.add(cone, stem);
    this.arrow.visible = false;
    root.add(body, this.lid, this.arrow);
    owned(root);                       // Geometrien/Materialien gibt die Ansicht am Levelende frei
    this.setModel({ root, update: () => {}, dispose: () => {} });
  }

  setOpen(on) {
    if (this.open === on) return;
    this.open = on;
    if (on) {
      this.level.sfx('gate');
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.H + 0.4, z: this.pos.z }, 14);
    }
  }

  enter(pl) {
    if (!this.open) { if (this.knock <= 0) { this.knock = 0.5; this.level.sfx('blockhit'); } return; }
    const t = this.spec.target;
    const o = typeof t === 'string' ? this.level.named.get(t) : null;
    pl.enterPipe({ x: this.pos.x, z: this.pos.z, top: this.pos.y + this.H, exit: o?.pipe ? o : { pos: Array.isArray(t) ? t : [this.pos.x, this.pos.y + 3, this.pos.z] } });
  }

  update(dt) {
    if (this.knock > 0) this.knock -= dt;
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (!this.model) return;
    this.syncModel();
    this.openK += ((this.open ? 1 : 0) - this.openK) * Math.min(1, dt * 6);
    this.lid.rotation.x = -this.openK * 1.9;
    this.arrow.visible = this.openK > 0.5;
    this.arrow.position.set(0, this.H + 1.3 + Math.abs(Math.sin(t * 4)) * 0.35, 0);
    this.arrow.rotation.y = t * 1.5;
  }
}

/**
 * Holzwand mit Baron-Gesicht (Modell holzwand_boss): steht als Rückwand einer Kammer auf einem Panzer, Vorderseite +Z
 * (zur Kamera). Nur Kanonenkugeln (Kanonen-Helm), Explosionen und Riesentrank schaden ihr; nach `hits` Treffern
 * (Risse!) fliegen die Bretter weg und `content` (Aktion) wird ausgeführt. Stampfen, Tatze, Feuer klopfen nur.
 * { id, pos (Mitte der Unterseite), size: [w, h, d], hits: 3, content, attach }
 */
const BREAK = new Set(['cannon', 'bomb', 'mega']);
const THUD = new Set(['pound', 'claw', 'fire', 'shell', 'bite', 'throw', 'bump']);
class BrummWand extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'brummwand');
    const [W, H, T] = spec.size ?? [3, 3, 0.4];
    this.W = W; this.H = H; this.T = T;
    this.half.set(W / 2, H / 2, Math.max(0.3, T / 2));
    this.touch = false;
    this.maxHp = spec.hits ?? 3;
    this.hp = this.maxHp;
    this.anim = 'idle';
    this.animT = 0;
    this.broken = false;
    this.breakT = 0;
    this.yaw = -Math.PI / 2;     // Modell blickt nach +X → Vorderseite nach +Z
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - W / 2, p.y, p.z - T / 2], max: [p.x + W / 2, p.y + H, p.z + T / 2], breakable: 'cannon', tag: 'brummwand' });
    if (level.view) this.setModel(getModel('holzwand_boss', { width: W, height: H, thick: T }));
  }

  onHit(kind) {
    if (this.broken || this.hidden || !this.alive) return;
    if (BREAK.has(kind)) {
      this.hp = kind === 'cannon' ? this.hp - 1 : 0;
      this.level.shake(0.18);
      this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + this.H * 0.5, z: this.pos.z + 0.3 }, 0xd8a060, 5);
      if (this.hp <= 0) { this.smash(); return; }
      this.setAnim('hit');
      this.level.sfx('blockhit');
      return;
    }
    if (THUD.has(kind)) { this.setAnim('hit'); this.level.sfx('blockhit'); }
  }

  setAnim(a) { this.anim = a; this.animT = 0; this.flip = !this.flip; }

  smash() {
    this.broken = true;
    this.removeShapes();
    this.setAnim('break');
    const p = this.pos;
    for (let i = 0; i < Math.ceil(this.H); i++) this.level.effects?.debris({ x: p.x, y: p.y + i + 0.3, z: p.z }, 0xc98a4a, 6);
    this.level.effects?.dust(p, 10, 1.6);
    this.level.sfx('brickbreak');
    this.level.shake(0.35);
    if (this.spec.content) runAction(this.level, this.spec.content, { pos: [p.x, p.y + 0.3, p.z - 1], source: this });
  }

  update(dt) {
    this.animT += dt;
    if (this.anim === 'hit' && this.animT > 0.4) this.anim = 'idle';
    if (this.broken) { this.breakT += dt; if (this.breakT > 1.6) this.kill(); }
  }

  modelState() {
    // gleiche Animation zweimal hintereinander: einen Schritt „idle“ dazwischen (Modell-Uhr startet neu)
    const a = this.anim === 'hit' && this.animT < 0.02 && this._last === 'hit' ? 'idle' : this.anim;
    this._last = a;
    return { anim: a, damage: 1 - this.hp / this.maxHp };
  }

  info() { return { hp: this.hp, broken: this.broken, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

/**
 * Metalltor (Modell metalltor) quer über ein Panzerdeck, Durchgang entlang Z: Pfeiler, Sturz und Torblatt sind fest.
 * Eine Kanonenkugel (oder Explosion/Riesentrank) aufs Torblatt → es fährt in den Boden; sonst führt der Weg über die
 * Holzkisten davor und über den Sturz (Stempel). { id, pos (Mitte unten), width, height, attach }
 */
class Metalltor extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'metalltor');
    const W = this.W = spec.width ?? 3.4, H = this.H = spec.height ?? 3.2;
    this.half.set(W / 2 + 0.6, (H + 0.8) / 2, 0.45);
    this.touch = false;
    this.yaw = -Math.PI / 2;
    this.opened = false;
    this.openK = 0;
    this.shakeT = 0;
    const p = this.pos;
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? p.x - W / 2 - 0.6 : p.x + W / 2, x1 = x0 + 0.6;
      this.addShape({ type: 'box', min: [x0, p.y, p.z - 0.35], max: [x1, p.y + H + 0.8, p.z + 0.35], tag: 'tor:pfeiler' });
    }
    this.addShape({ type: 'box', min: [p.x - W / 2 - 0.7, p.y + H, p.z - 0.4], max: [p.x + W / 2 + 0.7, p.y + H + 0.8, p.z + 0.4], tag: 'tor:sturz' });
    this.panelId = this.addShape({ type: 'box', min: [p.x - W / 2, p.y, p.z - 0.14], max: [p.x + W / 2, p.y + H, p.z + 0.14], tag: 'tor:blatt' });
    if (level.view) this.setModel(getModel('metalltor', { width: W, height: H }));
  }

  onHit(kind) {
    if (this.opened) return;
    if (BREAK.has(kind)) this.openGate();
    else if (THUD.has(kind)) { this.shakeT = 0.35; this.level.sfx('blockhit'); }
  }

  openGate() {
    if (this.opened) return;
    this.opened = true;
    const i = this.shapes.indexOf(this.panelId);
    if (i >= 0) { this.level.world.remove(this.panelId); this.shapes.splice(i, 1); }
    this.level.sfx('gate');
    this.level.shake(0.25);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.H * 0.5, z: this.pos.z + 0.3 }, 16);
  }

  update(dt) { if (this.shakeT > 0) this.shakeT -= dt; }

  modelState() { return { open: this.opened ? 1 : 0, anim: this.shakeT > 0 ? 'shake' : 'idle' }; }

  info() { return { opened: this.opened, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

// ---------------------------------------------------------------------- Wimpel auf den Panzern

function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#b01e2e'; g.fillRect(0, 0, 128, 96);
  g.fillStyle = '#ffc21a'; g.fillRect(0, 0, 128, 7); g.fillRect(0, 89, 128, 7);
  // Zylinder des Barons
  g.fillStyle = '#1e1a26'; g.fillRect(46, 14, 36, 30); g.fillRect(36, 42, 56, 8);
  g.fillStyle = '#e0262a'; g.fillRect(46, 36, 36, 6);
  // goldene Tatze
  g.fillStyle = '#ffc21a';
  g.beginPath(); g.ellipse(64, 70, 14, 11, 0, 0, Math.PI * 2); g.fill();
  for (const [x, y] of [[46, 58], [56, 52], [72, 52], [82, 58]]) { g.beginPath(); g.ellipse(x, y, 5, 6.5, 0, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Baron-Wimpel an den Panzern: ein Instanz-Mast + ein Instanz-Tuch für alle (2 Zeichenaufrufe), Tuch weht. */
class FlagSet {
  constructor(level, list) {
    this.level = level;
    this.list = list;                     // [{ veh, dx, dc, y, h }]
    const n = list.length;
    const poleG = new THREE.CylinderGeometry(0.05, 0.06, 1, 6);
    poleG.translate(0, 0.5, 0);
    this.poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3e4a, roughness: 0.4, metalness: 0.5 });
    this.poles = new THREE.InstancedMesh(poleG, this.poleMat, n);
    this.tex = flagTexture();
    this.clothG = new THREE.PlaneGeometry(1.25, 0.9, 10, 3);
    this.clothG.translate(0.625, -0.45, 0);
    this.base = this.clothG.attributes.position.array.slice();
    this.clothMat = new THREE.MeshLambertMaterial({ map: this.tex, side: THREE.DoubleSide });
    this.cloth = new THREE.InstancedMesh(this.clothG, this.clothMat, n);
    for (const m of [this.poles, this.cloth]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3();
    this.e = new THREE.Euler();
    owned(this.poles); owned(this.cloth);
    level.view.add(this.poles);
    level.view.add(this.cloth, (dt, t) => this.update(dt, t));
  }

  update(dt, t) {
    // Tuch weht (alle gleich, leicht versetzt durch die Drehung je Mast)
    const pos = this.clothG.attributes.position, a = pos.array, b = this.base;
    for (let i = 0; i < a.length; i += 3) {
      const u = b[i] / 1.25;
      a[i + 2] = Math.sin(t * 7 - u * 5) * 0.13 * u + Math.sin(t * 11 - u * 9) * 0.04 * u;
      a[i + 1] = b[i + 1] - u * u * 0.06;
    }
    pos.needsUpdate = true;
    this.list.forEach((f, i) => {
      const v = f.veh, rot = v.rot ?? 0, c = Math.cos(rot), s = Math.sin(rot);
      const lx = f.dx, lz = -f.dc;
      const x = v.pos.x + lx * c + lz * s, z = v.pos.z - lx * s + lz * c, y = v.pos.y + f.y;
      this.p.set(x, y, z); this.q.identity(); this.s.set(1, f.h, 1);
      this.m.compose(this.p, this.q, this.s);
      this.poles.setMatrixAt(i, this.m);
      // Fahrtwind von vorn links: Tuch weht nach hinten rechts (schräg zur Kamera, gut lesbar)
      this.e.set(0, rot - 0.75 + Math.sin(t * 1.3 + i) * 0.08, 0);
      this.q.setFromEuler(this.e); this.p.set(x, y + f.h - 0.02, z); this.s.set(1, 1, 1);
      this.m.compose(this.p, this.q, this.s);
      this.cloth.setMatrixAt(i, this.m);
    });
    this.poles.instanceMatrix.needsUpdate = true;
    this.cloth.instanceMatrix.needsUpdate = true;
    // weit weg vom Zug (Bossarena, Oase): nicht zeichnen
    const tg = this.level.view.rig?.target;
    const near = !tg || this.list.some((f) => Math.abs(f.veh.pos.z - tg.z) < 45 && Math.abs(f.veh.pos.x - tg.x) < 40);
    this.poles.visible = near; this.cloth.visible = near;
  }

  dispose() { this.tex.dispose(); this.clothMat.dispose(); this.poleMat.dispose(); }
}

// ---------------------------------------------------------------------- Staubfahnen und Funken

/** Sandstaub hinter den Ketten fahrender Panzer (ein Instanz-Mesh, nur in Kameranähe), dazu Kettenfunken. */
class DustTrails {
  constructor(level, vehicles) {
    this.level = level;
    this.vehicles = vehicles;
    const N = this.N = 170;
    this.items = Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }));
    this.next = 0;
    this.geo = new THREE.IcosahedronGeometry(0.5, 0);
    // ungeleuchtet: die Wölkchen stehen meist auf der Schattenseite (Abendsonne von vorn) und würden sonst grau
    this.mat = new THREE.MeshBasicMaterial({ color: 0xcf9460, transparent: true, opacity: 0.5, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, N);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.m = new THREE.Matrix4(); this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3();
    for (let i = 0; i < N; i++) this.mesh.setMatrixAt(i, this.zero);
    this.acc = 0; this.sparkT = 0;
    owned(this.mesh);
    level.view.add(this.mesh, (dt) => this.update(dt));
  }

  emit(x, y, z, k) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.N;
    it.x = x + (Math.random() - 0.5) * 0.5; it.y = y; it.z = z;
    it.vx = (Math.random() - 0.5) * 1.2 * k; it.vy = 0.5 + Math.random() * 0.7; it.vz = 0.6 + Math.random() * 0.8;
    it.max = it.life = 1.4 + Math.random() * 0.8; it.s = 0.55 + Math.random() * 0.4;
  }

  update(dt) {
    if (!dt) return;
    dt = Math.min(dt, 0.1);
    const tg = this.level.view.rig?.target;
    this.acc += dt;
    this.sparkT -= dt;
    // je 1/10 s ein Wölkchen je Kette der nahen, fahrenden Panzer
    while (this.acc > 1 / 10) {
      this.acc -= 1 / 10;
      for (const v of this.vehicles) {
        if (v.removed || v.speedNow < 0.5) continue;
        if (tg && Math.abs(v.pos.z - tg.z) > 34) continue;
        const hw = v.size.w / 2 - 0.36, back = v.size.d / 2 + 0.2;
        for (const sx of [-1, 1]) this.emit(v.pos.x + sx * hw, v.pos.y + 0.35, v.pos.z + back, 1);
      }
    }
    // Kettenfunken (Metall auf Stein): ab und zu an einem nahen Laufrad
    if (this.sparkT <= 0) {
      this.sparkT = 0.22 + Math.random() * 0.3;
      const near = this.vehicles.filter((v) => !v.removed && v.speedNow > 0.5 && tg && Math.abs(v.pos.z - tg.z) < 22);
      const v = near[Math.floor(Math.random() * near.length)];
      if (v) {
        const sx = Math.random() < 0.5 ? -1 : 1;
        this.level.effects?.sparks({ x: v.pos.x + sx * (v.size.w / 2), y: v.pos.y + 0.5, z: v.pos.z + (Math.random() - 0.5) * v.size.d * 0.8 }, 3);
      }
    }
    let alive = 0;
    for (let i = 0; i < this.N; i++) {
      const it = this.items[i];
      if (it.life <= 0) continue;
      it.life -= dt;
      if (it.life <= 0) { this.mesh.setMatrixAt(i, this.zero); continue; }
      alive++;
      const k = Math.exp(-1.6 * dt);
      it.vx *= k; it.vz *= k; it.vy *= Math.exp(-0.8 * dt);
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
      const t = 1 - it.life / it.max;
      const sc = it.s * (0.6 + t * 1.8) * Math.min(1, (it.life / it.max) * 3);
      this.p.set(it.x, it.y, it.z); this.s.set(sc, sc * 0.8, sc);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = alive > 0;           // kein Zeichenaufruf, solange kein Staub fliegt (Zughalt, Arena)
  }

  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

// ---------------------------------------------------------------------- Fluchtszene des Barons

/**
 * Nach dem Sieg über Wirbelbrocken braust Baron Brummbär im roten Sportwagen heran, schimpft, sammelt seinen
 * Raufbold ein und flieht in den Sonnenuntergang (Staub, Funken). Rein darstellerisch; Kamera schwenkt kurz mit.
 * cfg = { from, stop, away: [x, y, z] }
 */
class BaronFlucht {
  constructor(level, cfg) {
    this.level = level;
    this.cfg = cfg;
    this.t = -1;
    this.state = 'wait';
    this.said = false;
    if (level.view) {
      this.model = getModel('baron_brummbaer', { withCar: true });
      this.model.root.visible = false;
      level.view.add(owned(this.model.root));
    }
    this.pos = new THREE.Vector3(...cfg.from);
    this.yaw = 0;
    this.speed = 0;
  }

  start() { if (this.state === 'wait') { this.state = 'in'; this.t = 0; } }

  reset() { this.state = 'wait'; this.t = -1; this.said = false; if (this.model) this.model.root.visible = false; }

  /** Simulationsschritt (deterministisch, Levelzeit). */
  step(dt) {
    if (this.state === 'wait' || this.state === 'gone') return;
    this.t += dt;
    const c = this.cfg, from = c.from, stop = c.stop, away = c.away;
    const lerp3 = (a, b, k) => this.pos.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
    const ease = (x) => 1 - (1 - x) * (1 - x);
    if (this.state === 'in') {
      const k = Math.min(1, this.t / 2.2);
      lerp3(from, stop, ease(k));
      this.yaw = Math.atan2(-(stop[2] - from[2]), stop[0] - from[0]);
      this.speed = (1 - k) * 12;
      this.dust(1);
      if (k >= 1) { this.state = 'stop'; this.t = 0; }
    } else if (this.state === 'stop') {
      this.speed = 0;
      if (!this.said && this.t > 0.2) {
        this.said = true;
        const hud = this.level.archetype?.hud;
        hud?.banner?.('Baron Brummbär: „Grrr! Das zahl ich dir heim!“', { hold: 2.4, size: 11, color: '#ffb0a0', y: 0.22 });
        this.level.sfx('panic');
      }
      // dreht sich zur Flucht
      const want = Math.atan2(-(away[2] - stop[2]), away[0] - stop[0]);
      this.yaw += (want - this.yaw) * Math.min(1, dt * 3) * (this.t > 1.4 ? 1 : 0);
      if (this.t > 2.2) { this.state = 'away'; this.t = 0; this.level.sfx('swoop'); }
    } else if (this.state === 'away') {
      const k = Math.min(1, this.t / 3.2);
      lerp3(stop, away, k * k);
      this.yaw = Math.atan2(-(away[2] - stop[2]), away[0] - stop[0]);
      this.speed = 4 + k * 22;
      this.dust(2);
      if (k >= 1) { this.state = 'gone'; if (this.model) this.model.root.visible = false; }
    }
  }

  dust(n) { if (this.level.view && Math.random() < 0.6) this.level.effects?.dust({ x: this.pos.x - Math.cos(this.yaw) * 2.2, y: this.pos.y, z: this.pos.z + Math.sin(this.yaw) * 2.2 }, n, 1.4); }

  get active() { return this.state === 'in' || this.state === 'stop' || this.state === 'away'; }

  render(dt) {
    if (!this.model) return;
    const r = this.model.root;
    r.visible = this.active;
    if (!r.visible) return;
    r.position.copy(this.pos);
    r.rotation.y = this.yaw;
    this.model.update(Math.min(dt, 0.1), { anim: this.state === 'stop' ? 'stunned' : 'drive', speed: this.speed, steer: 0 });
  }
}

// ---------------------------------------------------------------------- Sichtweite der Kulisse (Budget)

/**
 * Die statische Geometrie wird je 32-m-Abschnitt entlang z verschmolzen – auf der breiten Strecke (Felsinseln,
 * Festungsplateau, Oase) werden die Abschnitte groß. Je Bild: Abschnitte, die ganz im Nebel liegen (weiter als
 * fog.far von der Kamera), nicht zeichnen; Sonnenschatten werfen nur Abschnitte nahe am Blickziel (Schattenbereich
 * ±22 m). Spart vor allem den Festungsabschnitt (≈ 100 k Dreiecke) während der Fahrt.
 */
class StaticCull {
  constructor(level) {
    this.level = level;
    const view = level.view;
    this.items = (view.static?.meshes ?? []).map((m) => {
      m.geometry.computeBoundingBox();
      return { m, b: m.geometry.boundingBox.clone(), cast: m.castShadow, stone: m.name === 'statisch:stone' };
    });
    // Sichtpyramide gegen den Quader prüfen: die Begrenzungskugel großer Abschnitte (Festung + Oase ≈ 60 k Dreiecke)
    // schneidet die Pyramide auch dann, wenn der flache Blick (40°) längst nur noch Treibsand zeigt
    this.frustum = new THREE.Frustum();
    this.pv = new THREE.Matrix4();
    view.onFrame(() => this.update());
  }

  arena() { return this.level.scroll?.state === 'done'; }

  update() {
    const view = this.level.view, camera = view.camera, cam = camera.position, tg = view.rig.target;
    const far = (view.three.fog?.far ?? 300) - 30;   // dort ist alles schon fast ganz im Nebel
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (const it of this.items) {
      const b = it.b;
      const tx = Math.max(b.min.x - tg.x, 0, tg.x - b.max.x), tz = Math.max(b.min.z - tg.z, 0, tg.z - b.max.z);
      // während der Fahrt ist die ganze statische Geometrie Kulisse (gespielt wird auf den Panzern): kein
      // Sonnenschatten; in der Festung (nach dem Halt) wirft nur der Geschützturm (Stein: Sockel, Gitter) Schatten
      it.m.castShadow = it.cast && it.stone && this.arena() && Math.hypot(tx, tz) < 30;
      const dx = Math.max(b.min.x - cam.x, 0, cam.x - b.max.x), dy = Math.max(b.min.y - cam.y, 0, cam.y - b.max.y), dz = Math.max(b.min.z - cam.z, 0, cam.z - b.max.z);
      it.m.visible = Math.hypot(dx, dy, dz) < far && (it.m.castShadow || this.frustum.intersectsBox(b));
    }
  }
}

// ====================================================================== 3) Abendrot (Thema desert, Abendstimmung)

/** Abendvariante des Wüsten-Themas (eigenes Objekt; das gemeinsame Thema `desert` bleibt unverändert). */
export const DESERT_EVENING = {
  ...DESERT_THEME,
  label: 'Wüste im Abendrot',
  sky: [[1, 0x221a50], [0.55, 0x3e2f78], [0.3, 0x86497e], [0.15, 0xd8666a], [0.06, 0xff9250], [0, 0xffbd6a], [-0.08, 0xe08858], [-1, 0x6e3a34]],
  background: 0xf09a66,
  fog: { color: 0xe49276, near: 70, far: 285 },
  hemi: { sky: 0xffcfb0, ground: 0x9a5a48, intensity: 1.5 },
  sun: { color: 0xffae74, intensity: 2.9, dir: [-0.5, 0.78, 0.32] },
  ground: { color: 0xb87048, y: -30 },
  grassTop: 0xf2c07a, grassTop2: 0xe6b06a, grassRim: 0xffdca4, grassSide: 0xd09456,
  dirt: 0xcc7446, dirtDeep: 0x96482c, rock: 0xbc6c48, rockDeep: 0x7c3e2a,
  stone: 0xf0d2a4, stoneDark: 0xc49868,
  clouds: false,              // Wolken lägen unter dem Treibsandmeer (Kamera blickt steil hinab) – sparen
  buildBackdrop(sky, bounds, rnd, yBase) { eveningBackdrop(sky, bounds, rnd, yBase); },
};

/**
 * Sparsame Kulisse fürs Abendrot: geschichtete Tafelberge links und rechts des Treibsandmeers und eine Wand aus
 * Tafelbergen hinter der Festung (ein Mesh, ≈ 4 k Dreiecke statt des Dünenkranzes – die Kamera blickt im Ritt steil
 * hinab, vom Horizont ist wenig zu sehen).
 */
function eveningBackdrop(sky, bounds, rnd, yBase) {
  const gy = (sky.theme.ground?.y ?? -30) + yBase;
  const bands = [0xc0582c, 0x9e4428, 0xd87a4a, 0x7e3424, 0xb4502a].map(lin);
  const cap = lin(0xf0a064), shade = lin(0x5a2a2a);
  const parts = [];
  const mesa = (x, z, r, h) => {
    const g = new THREE.CylinderGeometry(r * 0.8, r, h, 9, 5);
    g.translate(x, gy + h / 2 - 2, z);
    parts.push(colorize(g, (p, n, out) => {
      if (n.y > 0.7) { out[0] = cap[0]; out[1] = cap[1]; out[2] = cap[2]; return; }
      const b = bands[Math.abs(Math.floor((p.y - gy) / 5)) % bands.length];
      const k = 0.62 + 0.38 * Math.max(0, n.z * 0.6 - n.x * 0.4 + 0.4);   // Abendlicht von vorn links
      out[0] = b[0] * k + shade[0] * (1 - k) * 0.3; out[1] = b[1] * k + shade[1] * (1 - k) * 0.3; out[2] = b[2] * k + shade[2] * (1 - k) * 0.3;
    }));
  };
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  for (const side of [-1, 1]) {
    for (let z = z1 + 20; z > z0 - 40; z -= rnd.real(38, 56)) {
      const x = side < 0 ? x0 - rnd.real(35, 80) : x1 + rnd.real(35, 80);
      mesa(x, z, rnd.real(10, 20), rnd.real(38, 58));
    }
  }
  for (let x = x0 - 60; x < x1 + 60; x += rnd.real(24, 34)) mesa(x, z0 - rnd.real(40, 75), rnd.real(14, 24), rnd.real(48, 72));
  const g = merge(parts);
  if (!g) return;
  const mesh = new THREE.Mesh(sky.track(g), sky.view.mats.world);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  sky.group.add(mesh);
}

/** Treibsand im Abendlicht: dunklere, gewellte Körnung mit Windrippeln (zeichnet die Textur des Bausteins neu). */
function paintQuicksand(level, id) {
  const q = level.named.get(id);
  const tex = q?.mesh?.material?.map;
  const cv = tex?.image;
  if (!cv?.getContext) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = '#bf7c42'; g.fillRect(0, 0, W, H);
  // weiche Flecken (Windschatten, nasser Sand) – nahtlos gekachelt
  const blot = (x, y, r, col) => {
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  };
  for (let i = 0; i < 6; i++) blot(rnd() * W, rnd() * H, 18 + rnd() * 22, 'rgba(110,52,22,0.24)');
  for (let i = 0; i < 4; i++) blot(rnd() * W, rnd() * H, 14 + rnd() * 18, 'rgba(255,214,160,0.2)');
  // Windrippel quer zur Fahrt (hell/dunkel): ungleiche Abstände, zwei Wellen je Linie (ganzzahlige Frequenzen →
  // nahtlos), oben/unten wiederholt
  const RIP = 7;
  for (let k = 0; k < RIP; k++) {
    const base = ((k + (rnd() - 0.5) * 0.5) * H) / RIP, a1 = 2 + rnd() * 3, a2 = 0.8 + rnd() * 1.2;
    const f1 = 1 + Math.floor(rnd() * 3), f2 = 4 + Math.floor(rnd() * 4), p1 = rnd() * 6.28, p2 = rnd() * 6.28;
    const lw = 1.6 + rnd() * 1.4;
    for (const [dy, col, w] of [[0, 'rgba(255,214,150,0.3)', lw], [lw + 0.6, 'rgba(110,52,20,0.24)', lw * 0.8]]) {
      g.strokeStyle = col; g.lineWidth = w;
      for (const oy of [-H, 0, H]) {
        g.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const u = (x / W) * Math.PI * 2;
          const y = base + oy + dy + Math.sin(u * f1 + p1) * a1 + Math.sin(u * f2 + p2) * a2;
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
    }
  }
  for (let i = 0; i < 420; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(90,40,14,0.22)' : 'rgba(255,230,180,0.26)';
    g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.5 + rnd() * 1.1, 0, Math.PI * 2); g.fill();
  }
  tex.repeat.set(q.mesh.geometry.parameters.width / 6, q.mesh.geometry.parameters.height / 6);
  tex.needsUpdate = true;
  q.mesh.material.color?.set?.(0xffffff);
  q.mesh.material.roughness = 1;
}

function applyEvening(level) {
  const v = level.view;
  if (!v) return;
  const th = DESERT_EVENING;
  v.theme = th;
  if (v.three.background?.isColor) v.three.background.set(th.background);
  if (v.three.fog) { v.three.fog.color.set(th.fog.color); v.three.fog.near = th.fog.near; v.three.fog.far = th.fog.far; }
  v.hemi?.color.set(th.hemi.sky); v.hemi?.groundColor.set(th.hemi.ground); if (v.hemi) v.hemi.intensity = th.hemi.intensity;
  v.sun?.color.set(th.sun.color); if (v.sun) v.sun.intensity = th.sun.intensity;
  v.sunDir?.set(...th.sun.dir).normalize();
  const sky = v.sky;
  if (sky) {
    sky.theme = th;
    if (sky.domeGroup) sky.group.remove(sky.domeGroup);
    sky.buildDome();
  }
}

// ====================================================================== 4) Level-Haken

const ADOPT = new Set(['powerup', 'star', 'coin', 'rote_muenze', 'helm_kanone']);

/** Fahrzeug unter einem Punkt (Grundriss + 0,4 m, über dem Deck) oder null. */
function vehicleUnder(vehicles, p, below = 0.6) {
  let best = null, bd = Infinity;
  for (const v of vehicles) {
    if (v.removed) continue;
    const hx = v.size.w / 2 + 0.4, hz = v.size.d / 2 + 0.4;
    if (Math.abs(p.x - v.pos.x) > hx || Math.abs(p.z - v.pos.z) > hz) continue;
    const top = v.pos.y + v.size.h;
    if (p.y < top - below || p.y > top + 9) continue;
    const d = Math.abs(p.y - top);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

/** Nächstes Fahrzeug entlang des Zugs (für Dinge über einer Lücke). */
function vehicleNearest(vehicles, p) {
  let best = null, bd = Infinity;
  for (const v of vehicles) {
    if (v.removed) continue;
    const d = Math.max(0, Math.abs(p.z - v.pos.z) - v.size.d / 2) + Math.max(0, Math.abs(p.x - v.pos.x) - v.size.w / 2) * 0.5;
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

function attachTo(e, v) {
  if (!v || !e.spec) return;
  e.spec.attach = v.spec.id;
  v.scanned = -1;                  // Fahrzeug liest seine Unterobjekte neu
}

/**
 * Aufbau-Haken (Laterne `onLit`, beim Levelaufbau vor allen weiteren Bausteinen) – nur, was vor dem Verschmelzen der
 * statischen Geometrie geschehen muss: das Abendrot (seine Gelände-Farben färben die Inseln, Himmel und Kulisse werden
 * damit gebaut) und der Festungspanzer unter der Arena (als Kulisse in die statische Geometrie gebacken).
 */
export function panzerBuild(level) {
  if (level._panzerBuilt) return;
  level._panzerBuilt = true;
  applyEvening(level);
  // Festungspanzer (Kulisse, in die statische Geometrie verschmolzen) mit begehbarem Deck
  const F = level.data.panzer?.fortress;
  if (F) {
    const [x, y, z] = F.pos;
    bakeModel(level, 'panzer_fahrzeug', { length: F.length, width: F.width, deck: F.deck, color: F.color ?? 'rot' }, x, y, z, Math.PI / 2, 1, { speed: 0 });
    level.world.add({ type: 'box', min: [x - F.width / 2, y, z - F.length / 2], max: [x + F.width / 2, y + F.deck, z + F.length / 2], tag: 'festungspanzer' });
  }
}

/**
 * Level-Haken `LEVEL.setup(level, scene)` (einmal nach Aufbau von Level, Figur, Kamera und Archetyp; Präzisierung
 * „Level-Haken“):
 *  - lokale Teile aus LEVEL.panzer bauen (Luke, Holzwand, Metalltor, Wimpel, Staub, Baron-Szene),
 *  - Mitfahr-Regeln (je Schritt über level.onStep, vor Figur und Fahrzeugen):
 *      · Marschblock-Kolonnen mit `ride: '<Panzer>'` marschieren auf dem fahrenden Deck (Bahn wandert mit),
 *      · roter Ring mit `attach`: rote Münzen erscheinen auf den Panzern und fahren mit,
 *      · neu entstandene Dinge über einem Deck (Power-ups aus ?-Blöcken, Sterne aus Kisten, abgeworfene Helme,
 *        1-up des Rings) fahren mit diesem Panzer mit,
 *      · Kanonen-Helme liegen an ihren Stellen auf den Panzern bereit (nach dem Aufheben bzw. nach einem Neustart
 *        liegt nach `every` s wieder einer dort),
 *  - Wirbelbrocken-Ansage in Phase 3 auch im Autoscroller (Archetyp-Kombination `with: 'boss'`),
 *  - Luke öffnet sich beim Halt, Ansagen (Kanonen-Helm, Luke), Baron-Flucht nach dem Sieg.
 */
export function panzerSetup(level) {
  if (level._panzer) return;
  panzerBuild(level);              // falls die Aufbau-Laterne fehlt (Abendrot dann ohne eigene Gelände-Farben)
  const cfg = level.data.panzer ?? {};
  const st = level._panzer = { cfg, init: false, vehicles: [], seen: new WeakSet(), helmets: [], said: {}, luke: null, flucht: null, rings: [] };

  // Phase-3-Ansage des Wirbelbrockens: LEVEL.boss.phaseBanners (Motor); archetype.boss/seenPhase zeigen im Autoscroller
  // auf den Zusatz-Archetyp (Motor)

  // Lokale Entitäten (die Panzer lesen ihre Unterobjekte beim nächsten Schritt neu ein: `attach`)
  if (cfg.luke) st.luke = spawnLocal(level, new Luke(level, cfg.luke));
  for (const w of cfg.walls ?? []) spawnLocal(level, new BrummWand(level, w));
  for (const g of cfg.gates ?? []) spawnLocal(level, new Metalltor(level, g));
  if (cfg.baron) st.flucht = new BaronFlucht(level, cfg.baron);

  // Neustart: Helme wieder bereitlegen, Baron-Szene zurück
  const rt = level.runtime;
  const respawn = rt.respawn.bind(rt);
  rt.respawn = (...a) => {
    respawn(...a);
    for (const h of st.helmets) h.wait = h.every;      // fehlt einer, liegt er sofort wieder bereit
    if (st.flucht && !level.archetype?.sub?.won) st.flucht.reset();
  };

  // Sieg über den Boss → Baron-Szene
  const prevDef = level.onBossDefeated;
  level.onBossDefeated = (b) => { prevDef?.(b); st.flucht?.start(); };

  initLate(level, st);
  level.onStep((dt) => stepPanzer(level, st, dt));
  if (level.view) level.view.onFrame((dt) => st.flucht?.render(dt));
  wrapCamera(level, st);
}

/** Einmalig nach dem Aufbau: Mitfahr-Regeln an die gebauten Fahrzeuge, Gegner und Gimmicks hängen, Darstellung. */
function initLate(level, st) {
  st.init = true;
  const cfg = st.cfg;
  st.vehicles = level.entities.filter((e) => e.kind === 'vehicle');
  for (const e of level.entities) st.seen.add(e);
  const byId = (id) => level.named.get(id);
  // Marschblock-Kolonnen auf Panzern: Bahnpunkte wandern mit der Lage des Panzers
  for (const e of level.entities) {
    if (e.kind !== 'marschblock' || !e.spec?.ride || !e.column || e.column._ride) continue;
    const v = byId(e.spec.ride);
    if (!v) continue;
    const col = e.column, p0 = v.pos.clone(), slot = col.slot.bind(col);
    col._ride = v;
    col.slot = (i, out) => { slot(i, out); out.x += v.pos.x - p0.x; out.y += v.pos.y - p0.y; out.z += v.pos.z - p0.z; return out; };
  }
  // Roter Ring auf einem Panzer: Münzen relativ zum Panzer, jede fährt auf dem Panzer unter ihr mit
  for (const e of level.entities) {
    if (e.kind !== 'roter_ring' || !e.spec?.attach) continue;
    const v = byId(e.spec.attach);
    if (!v) continue;
    const p0 = v.pos.clone(), spots0 = e.spots.map((s) => s.slice()), begin = e.begin.bind(e);
    e.begin = () => {
      const dx = v.pos.x - p0.x, dy = v.pos.y - p0.y, dz = v.pos.z - p0.z;
      e.spots = spots0.map((s) => [s[0] + dx, s[1] + dy, s[2] + dz]);
      begin();
      for (const c of e.coins) { attachTo(c, vehicleNearest(st.vehicles, c.pos)); st.seen.add(c); }
    };
    st.rings.push(e);
  }
  // Kanonen-Helm-Stellen
  for (const h of cfg.helmets ?? []) {
    const v = byId(h.on);
    if (!v) continue;
    st.helmets.push({ v, dx: h.dx ?? 0, dc: h.dc ?? 0, y: h.y ?? v.size.h, every: h.every ?? 6, id: h.id, ent: null, wait: 0 });
  }
  if (level.view) {
    if (cfg.quicksand) paintQuicksand(level, cfg.quicksand);
    const flags = [];
    for (const f of cfg.flags ?? []) { const v = byId(f.on); if (v) flags.push({ veh: v, dx: f.dx ?? 0, dc: f.dc ?? 0, y: f.y ?? v.size.h, h: f.h ?? 2.2 }); }
    if (flags.length) st.flagSet = new FlagSet(level, flags);
    st.dust = new DustTrails(level, st.vehicles);
    st.cull = new StaticCull(level);
    // Schattenpass sparen (Budget < 130 Aufrufe): Ketten und Laufräder der Panzer liegen unter dem Aufbau und werfen
    // keinen Sonnenschatten; Welt-2-Gegner mit Schatten-Stufen nur mit ihrem größten Teil; die Marschblock-Kolonnen
    // (eine Instanz-Gruppe für alle) nur mit ihrem Schatten-Blob.
    for (const v of st.vehicles) v.model?.root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
    for (const e of level.entities) if (e.shadowMeshes?.length > 1) { for (const m of e.shadowMeshes.slice(1)) m.castShadow = false; e.shadowMeshes = e.shadowMeshes.slice(0, 1); }
    const marsch = [];
    level.view.three.traverse((o) => { if (o.name === 'instanzen:marschblock') marsch.push(o); });
    if (marsch.length) level.view.onFrame(() => { for (const r of marsch) r.traverse((m) => { if (m.isMesh) m.castShadow = false; }); });
  }
}

function stepPanzer(level, st, dt) {
  const w = level.scroll;
  // neue Dinge über einem Deck fahren mit (Power-up aus ?-Block, Stern aus Kiste, abgeworfener Helm, 1-up)
  const ents = level.entities;
  for (let i = ents.length - 1; i >= 0; i--) {
    const e = ents[i];
    if (st.seen.has(e)) continue;
    st.seen.add(e);
    if (!ADOPT.has(e.kind) || e.spec?.attach || e.removed) continue;
    attachTo(e, vehicleUnder(st.vehicles, e.pos));
  }
  // Kanonen-Helme bereitlegen
  for (const h of st.helmets) {
    if (h.ent && !h.ent.removed && h.ent.alive) continue;
    h.ent = null;
    if (h.spawned) { h.wait += dt; if (h.wait < h.every) continue; }
    const c = Math.cos(h.v.rot ?? 0), s = Math.sin(h.v.rot ?? 0), lz = -h.dc;
    const pos = [h.v.pos.x + h.dx * c + lz * s, h.v.pos.y + h.y + 0.02, h.v.pos.z - h.dx * s + lz * c];
    const e = level.spawn('helm_kanone', { pos, id: h.id, attach: h.v.spec.id, yaw: -Math.PI / 2 });
    if (e) { h.ent = e; st.seen.add(e); h.v.scanned = -1; if (h.spawned) { e.popT = 0.45; level.effects?.sparks({ x: pos[0], y: pos[1] + 0.3, z: pos[2] }, 10); } }
    h.spawned = true;
    h.wait = 0;
  }
  // Ansagen
  const p = level.player;
  const hud = level.archetype?.hud;
  if (p && p.helmet === 'kanone' && !st.said.helm) {
    st.said.helm = true;
    hud?.banner?.('Kanonen-Helm! Er feuert von selbst.', { hold: 2.2, size: 13, y: 0.32, color: '#ffe066' });
  }
  // Luke öffnet sich beim Halt
  if (st.luke) {
    const open = !!w && w.state === 'done';
    if (open && !st.luke.open) { st.luke.setOpen(true); st.lukeT = 0; }
    else if (!open && st.luke.open) st.luke.setOpen(false);
    // Ansage nach „Endstation!“ (sonst überdeckt sie sie)
    if (st.luke.open && !st.said.luke && (st.lukeT += dt) > 1.7) {
      st.said.luke = true;
      if (p && Math.abs(p.pos.z - st.luke.pos.z) < 30) hud?.banner?.('Ab durch die Luke!', { hold: 2.0, size: 13, y: 0.38, color: '#ffe066' });
    }
  }
  st.flucht?.step(dt);
}

/** Kamera: während der Baron-Szene schwenkt das Blickziel zum Sportwagen (nach der Kamera des Archetyps). */
function wrapCamera(level, st) {
  const arch = level.archetype;
  if (!arch?.camera) return;
  const cam = arch.camera.bind(arch);
  let k = 0;
  arch.camera = (dt, player, world) => {
    const r = cam(dt, player, world);
    const f = st.flucht;
    const want = f && f.active && f.state !== 'away' ? 0.7 : f && f.state === 'away' && f.t < 1.8 ? 0.55 : 0;
    k += (want - k) * Math.min(1, dt * 2.5);
    // nach der Szene und weit weg (Warp-Box zur Oase): sofort normale Kamera, kein Nachziehen zum Fluchtpunkt
    if (f && !f.active && Math.hypot(player.pos.x - f.cfg.stop[0], player.pos.z - f.cfg.stop[2]) > 30) k = 0;
    if (k > 0.01 && f) {
      const rig = level.view.rig;
      rig.target.set(rig.target.x + (f.pos.x - rig.target.x) * k, rig.target.y + (f.pos.y + 1.5 - rig.target.y) * k, rig.target.z + (f.pos.z - rig.target.z) * k);
      rig.distNow += (22 - rig.distNow) * k;
      rig.place(rig.cur, dt);
    }
    return r;
  };
}
