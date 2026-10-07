// Avatare der Gegner (Super-Mario-3D-World-Look): Laufkäfer (walker) und hüpfender Pilz (hopper).
// Zustand vom Phaser-Sprite: obj.alive, Frame-Name ('walk0','walk1','squashed' | 'idle','squat','jump'),
// obj.flipY (weggeschleudert → auf dem Rücken), obj.body.velocity (Beinfrequenz), obj.alpha (Ausblenden).
//
// Aufbau beider Figuren:  model (Basisklasse: Blickrichtung/Neigung)
//                           └ pose  (Stauchung/Streckung, Drehpunkt = Fußpunkt)
//                               └ flip (Drehpunkt = Körpermitte, kippt bei flipY auf den Rücken)
//                                   └ parts (die eigentlichen Teile, Füße bei y = 0)
// Zeichenaufrufe: bewegte Kleinteile (Beine, Füße, Fühler) sind InstancedMeshes, statische Teile mit
// gleichem Material eine zusammengeführte Geometrie – 5 Zeichenaufrufe je Gegner (+ Schatten).

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';
import { stdMat, geo, canvasTexture, damp, dampVec, eyeMat, mergeGeos, setInstance, instanced } from '../lib/itemMaterials.js';

const TAU = Math.PI * 2;

/** Gemeinsamer Unterbau: pose → flip → parts, Ausblenden über alpha, Rückenlage bei flipY. */
class EnemyAvatar extends Avatar3D {
  constructor(view, obj) {
    super(view, obj);
    this.turnSpeed = 10;
  }

  /** Legt die Gruppenhierarchie an; pivotY = Höhe der Körpermitte (Drehpunkt der Rückenlage). */
  setupGroups(pivotY) {
    this.pose = new THREE.Group();
    this.flip = new THREE.Group();
    this.parts = new THREE.Group();
    this.flip.position.y = pivotY;
    this.parts.position.y = -pivotY;
    this.flip.add(this.parts);
    this.pose.add(this.flip);
    this.model.add(this.pose);
    this.targetScale = new THREE.Vector3(1, 1, 1);
  }

  /** Sichtbarkeit: Gegner verblassen (Phaser-Tween) – statt hart auszublenden, schrumpfen sie. */
  applyFade() {
    const o = this.obj;
    this.root.visible = o.visible && o.alpha > 0.03;
    return o.alpha;
  }

  /** Rückenlage (weggeschleudert) weich einnehmen. */
  applyFlip(dt) {
    this.flip.rotation.x = damp(this.flip.rotation.x, this.obj.flipY ? Math.PI : 0, 9, dt);
  }
}

// =============================================================================================
// Laufkäfer: runder Marienkäfer in Violett mit dunklen Punkten, kleiner Kopf mit Fühlern, sechs
// kurze Beinchen, große Augen. Höhe ≈ 0,9 Einheiten, Länge ≈ 1,2 (Hitbox 12x9 px bleibt in Phaser).
// =============================================================================================

const BUG = { shell: '#a24ee6', spot: '#35163f', seam: '#5e2a84', dark: 0x2e1838 };

function bugShellTexture() {
  return canvasTexture('bugShell', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = BUG.shell; ctx.fillRect(0, 0, w, h);
    // Naht vom Kopf (u 0,5) über den Scheitel (oben) zum Heck (u 0 / u 1)
    ctx.strokeStyle = BUG.seam; ctx.lineWidth = 5;
    for (const x of [0, w / 2, w]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    // Punkte: (u, Anteil der Kuppelhöhe 0 = Scheitel .. 1 = Saum, Winkelradius)
    const DOME = 0.62 * Math.PI;
    ctx.fillStyle = BUG.spot;
    for (const [u, f, a] of [[0.25, 0.3, 0.2], [0.75, 0.3, 0.2], [0.1, 0.62, 0.17], [0.9, 0.62, 0.17], [0.4, 0.66, 0.16], [0.6, 0.66, 0.16], [0.24, 0.85, 0.13], [0.76, 0.85, 0.13]]) {
      const theta = f * DOME;
      const ry = (a / DOME) * h, rx = (a / (TAU * Math.max(0.25, Math.sin(theta)))) * w;
      ctx.beginPath(); ctx.ellipse(u * w, f * h, Math.min(rx, w * 0.2), ry, 0, 0, TAU); ctx.fill();
    }
  });
}

const LEG_HIPS = [];
for (let i = 0; i < 3; i++) for (const s of [1, -1]) LEG_HIPS.push({ x: -0.26 + i * 0.26, s, i });

export class WalkerAvatar extends EnemyAvatar {
  buildModel() {
    this.setupGroups(0.4);
    const P = this.parts;
    const shellMat = stdMat('bugShell', { map: bugShellTexture(), roughness: 0.32, metalness: 0 });
    const darkMat = stdMat('bugDark', { color: BUG.dark, roughness: 0.5 });

    // Panzer (Kuppel, reicht etwas unter den Äquator)
    this.shell = new THREE.Mesh(geo('bugShell', () => new THREE.SphereGeometry(0.5, 20, 14, 0, TAU, 0, 0.62 * Math.PI)), shellMat);
    this.shell.scale.set(1.0, 0.74, 0.9); this.shell.position.y = 0.4; this.shell.castShadow = true;
    // Bauch und Kopf (dunkel, ein Mesh)
    const body = new THREE.Mesh(geo('bugBody', () => mergeGeos([
      [new THREE.SphereGeometry(0.44, 16, 10), { pos: [0, 0.34, 0], scale: [1.0, 0.48, 0.86] }],
      [new THREE.SphereGeometry(0.19, 16, 12), { pos: [0.44, 0.36, 0] }],
      [new THREE.CylinderGeometry(0.12, 0.16, 0.12, 10), { pos: [0.33, 0.37, 0], rot: [0, 0, Math.PI / 2] }], // Halskragen
    ])), darkMat);
    // Augen (zwei Instanzen, blicken nach vorn)
    const eyes = instanced(geo('bugEye', () => new THREE.SphereGeometry(0.085, 16, 12)), eyeMat('bug', 0.5, 0.1), 2, 1.0, 0.45);
    setInstance(eyes, 0, 0.55, 0.43, 0.1); setInstance(eyes, 1, 0.55, 0.43, -0.1);
    eyes.instanceMatrix.needsUpdate = true;
    // Fühler: Stiel + Kugel (ein Geometriestück), Drehpunkt am Kopf, zwei Instanzen
    this.antennae = instanced(geo('bugAntenna', () => mergeGeos([
      [new THREE.CylinderGeometry(0.012, 0.016, 0.26, 6), { pos: [0, 0.13, 0] }],
      [new THREE.SphereGeometry(0.04, 10, 8), { pos: [0, 0.27, 0] }],
    ])), darkMat, 2, 1.0, 0.5);
    // Sechs Beinchen: Hüfte seitlich am Bauch, Kapsel zeigt schräg nach außen-unten
    this.legs = instanced(geo('bugLeg', () => {
      const g = new THREE.CapsuleGeometry(0.036, 0.16, 3, 8);
      g.rotateX(-0.55); g.translate(0, -0.09, 0.05); // Beinform relativ zur Hüfte (rechte Seite; links um Y gedreht)
      return g;
    }), darkMat, LEG_HIPS.length, 1.0, 0.3);
    P.add(this.shell, body, eyes, this.antennae, this.legs);
    this.walkPhase = Math.random() * TAU;
    this.legPose = LEG_HIPS.map(() => ({ swing: 0, spread: 0 }));
    this.animate(0.016, 0);
  }

  animate(dt, t) {
    const o = this.obj;
    const alpha = this.applyFade();
    const squashed = this.frameName === 'squashed';
    const vx = o.body ? Math.abs(o.body.velocity.x) : 0;
    const moving = o.alive && vx > 2;
    if (moving) this.walkPhase += dt * (6 + vx * 0.22);
    const sw = moving ? Math.sin(this.walkPhase) : 0;

    // Körper: Stauchung (platt) oder lebendiges Wippen; beim Verblassen schrumpfen
    const fade = o.alive ? 1 : alpha;
    if (squashed) this.targetScale.set(1.3 * fade, 0.25, 1.3 * fade);
    else this.targetScale.set(fade, (1 + (moving ? Math.abs(sw) * 0.04 : Math.sin(t * 3 + this.walkPhase) * 0.02)) * fade, fade);
    dampVec(this.pose.scale, this.targetScale.x, this.targetScale.y, this.targetScale.z, 22, dt);
    this.applyFlip(dt);

    // Beine: Dreibein-Gang (Vorder-/Hinterbein einer Seite gegen Mittelbein), auf dem Rücken zappeln, platt gespreizt
    const flail = o.flipY ? Math.sin(t * 26) * 0.9 : 0;
    for (let k = 0; k < LEG_HIPS.length; k++) {
      const { x, s, i } = LEG_HIPS[k];
      const lp = this.legPose[k];
      const phase = (i % 2 ? -1 : 1) * (s > 0 ? 1 : -1);
      let swing = sw * 0.55 * phase + flail * (i % 2 ? -1 : 1);
      let spread = 0;
      if (squashed) { swing = (i - 1) * 0.9; spread = -1.0; }
      lp.swing = damp(lp.swing, swing, 20, dt);
      lp.spread = damp(lp.spread, spread, 20, dt);
      // rechte Seite (s = 1) direkt, linke Seite um Y gedreht (Schwung und Spreizung dann gespiegelt)
      setInstance(this.legs, k, x, 0.2, s * 0.3, lp.spread * s, s > 0 ? 0 : Math.PI, lp.swing * s);
    }
    this.legs.instanceMatrix.needsUpdate = true;
    // Fühler wippen
    const wag = Math.sin(t * 5 + this.walkPhase) * 0.18 + sw * 0.1;
    const hy = squashed ? 0.2 : 0.5, hx = squashed ? 0.6 : 0.5, tilt = squashed ? -1.3 : -0.55;
    setInstance(this.antennae, 0, hx, hy, 0.07, 0.35, 0, tilt + wag);
    setInstance(this.antennae, 1, hx, hy, -0.07, -0.35, 0, tilt - wag * 0.8);
    this.antennae.instanceMatrix.needsUpdate = true;
  }
}

// =============================================================================================
// Hüpfender Pilz: roter Hut mit weißen Punkten, cremefarbener Stiel mit grimmigem Gesicht,
// dunkle Füße. Höhe ≈ 1 Einheit (Hitbox 12x14 px). Frames: idle (Atmen), squat (gestaucht),
// jump (gestreckt, Füße angezogen), squashed (platt).
// =============================================================================================

const SHROOM = { cap: '#e8392e', dot: '#fff6ea', stem: 0xf6e9cf, foot: 0x4a2d5c, ink: 0x2e1a3a };

function capTexture() {
  return canvasTexture('hopperCap', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = SHROOM.cap; ctx.fillRect(0, 0, w, h);
    const DOME = 0.5 * Math.PI;
    ctx.fillStyle = SHROOM.dot;
    // Scheitelpunkt = oberste Zeilen rundum, darunter ein Ring aus Punkten (u, Anteil Kuppelhöhe, Winkelradius)
    ctx.fillRect(0, 0, w, h * 0.11);
    for (const [u, f, a] of [[0.1, 0.5, 0.2], [0.42, 0.5, 0.18], [0.72, 0.52, 0.2], [0.26, 0.82, 0.14], [0.58, 0.84, 0.13], [0.9, 0.8, 0.15]]) {
      const theta = f * DOME;
      const ry = (a / DOME) * h, rx = (a / (TAU * Math.sin(theta))) * w;
      ctx.beginPath(); ctx.ellipse(u * w, f * h, Math.min(rx, w * 0.22), ry, 0, 0, TAU); ctx.fill();
    }
  });
}

export class HopperAvatar extends EnemyAvatar {
  buildModel() {
    this.setupGroups(0.5);
    const P = this.parts;
    const capMat = stdMat('hopperCap', { map: capTexture(), roughness: 0.3, metalness: 0, side: THREE.DoubleSide });
    const stemMat = stdMat('hopperStem', { color: SHROOM.stem, roughness: 0.55 });
    const footMat = stdMat('hopperFoot', { color: SHROOM.foot, roughness: 0.6 });
    const inkMat = stdMat('hopperInk', { color: SHROOM.ink, roughness: 0.5 });

    // Stiel (Kapsel) – empfängt den Schatten des Huts
    this.stem = new THREE.Mesh(geo('hopperStem', () => new THREE.CapsuleGeometry(0.21, 0.34, 4, 14)), stemMat);
    this.stem.position.y = 0.4; this.stem.receiveShadow = true; // Schatten wirft der Hut
    // Hut: Kuppel (beidseitig, damit die Unterseite in Rückenlage nicht fehlt)
    this.cap = new THREE.Mesh(geo('hopperDome', () => new THREE.SphereGeometry(0.54, 22, 12, 0, TAU, 0, 0.5 * Math.PI)), capMat);
    this.cap.position.y = 0.62; this.cap.scale.set(1, 0.8, 1); this.cap.castShadow = true;
    // Gesicht: Augen (Instanzen), zornige Brauen + Schmollmund (ein Mesh). Wie in der 2D-Vorlage schaut
    // es zur Kamera (+Z) und dreht sich leicht in Laufrichtung – die Gruppe gleicht die Blickdrehung aus.
    this.face = new THREE.Group();
    const eyes = instanced(geo('hopperEye', () => new THREE.SphereGeometry(0.075, 16, 12)), eyeMat('hopper', 0.46, 0.05), 2, 1.0, 0.5);
    setInstance(eyes, 0, 0.09, 0.5, 0.2, 0, -Math.PI / 2); setInstance(eyes, 1, -0.09, 0.5, 0.2, 0, -Math.PI / 2);
    eyes.instanceMatrix.needsUpdate = true;
    const ink = new THREE.Mesh(geo('hopperInk', () => mergeGeos([
      [new THREE.BoxGeometry(0.12, 0.03, 0.035), { pos: [-0.09, 0.59, 0.245], rot: [0, 0, -0.6] }],
      [new THREE.BoxGeometry(0.12, 0.03, 0.035), { pos: [0.09, 0.59, 0.245], rot: [0, 0, 0.6] }],
      [new THREE.TorusGeometry(0.05, 0.014, 6, 10, Math.PI), { pos: [0, 0.355, 0.225] }],
    ])), inkMat);
    this.face.add(eyes, ink);
    // Füße (zwei Instanzen, bewegen sich je Pose)
    this.feet = instanced(geo('hopperFoot', () => { const g = new THREE.SphereGeometry(0.1, 12, 8); g.scale(1.3, 0.6, 1.1); return g; }), footMat, 2, 1.0, 0.2);
    P.add(this.stem, this.cap, this.face, this.feet);
    this.breath = Math.random() * TAU;
    this.capScale = new THREE.Vector3(1, 1, 1);
    this.footY = 0.06; this.footZ = 0.15;
    this.animate(0.016, 0);
  }

  animate(dt, t) {
    const o = this.obj;
    const alpha = this.applyFade();
    const f = this.frameName;
    const fade = o.alive ? 1 : alpha;
    let feetY = 0.06, feetZ = 0.15, capY = 0.62;
    const cs = this.capScale;
    if (f === 'squashed') { this.targetScale.set(1.3 * fade, 0.25, 1.3 * fade); cs.set(1.15, 0.6, 1.15); feetZ = 0.24; }
    else if (f === 'squat') { this.targetScale.set(1.2, 0.72, 1.2); cs.set(1.12, 0.78, 1.12); feetZ = 0.2; }
    else if (f === 'jump') { this.targetScale.set(0.9, 1.14, 0.9); cs.set(0.94, 1.1, 0.94); feetY = 0.17; feetZ = 0.1; capY = 0.64; }
    else { // idle: Atmen
      const b = Math.sin(t * 3.2 + this.breath);
      this.targetScale.set(1 - b * 0.015, 1 + b * 0.03, 1 - b * 0.015); cs.set(1 + b * 0.02, 1 - b * 0.02, 1 + b * 0.02);
    }
    dampVec(this.pose.scale, this.targetScale.x, this.targetScale.y, this.targetScale.z, 18, dt);
    dampVec(this.cap.scale, cs.x, cs.y * 0.8, cs.z, 18, dt);
    this.cap.position.y = damp(this.cap.position.y, capY, 18, dt);
    this.footY = damp(this.footY, feetY, 18, dt);
    this.footZ = damp(this.footZ, feetZ, 18, dt);
    setInstance(this.feet, 0, 0.02, this.footY, this.footZ);
    setInstance(this.feet, 1, 0.02, this.footY, -this.footZ);
    this.feet.instanceMatrix.needsUpdate = true;
    this.face.rotation.y = -this.yaw + this.facing * 0.45;
    this.applyFlip(dt);
  }
}
