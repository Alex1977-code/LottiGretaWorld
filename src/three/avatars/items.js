// Avatare der Level-Objekte (Super-Mario-3D-World-Look): Bitcoin-Münze, Schlüssel, Tor, Zielfahne,
// Dornen, Checkpoint, Beere, Feuerball. Alles aus Grundkörpern plus Canvas-Texturen (₿, Punkte,
// Verläufe); Materialien und Geometrien werden modulweit geteilt (lib/itemMaterials.js), statische
// Teile mit gleichem Material sind zu einer Geometrie zusammengeführt (wenige Zeichenaufrufe).
// Zustand vom Phaser-Sprite: Coin: obj.index, obj.alpha (gespeicherte Münze 0,45; Einsammeln → 0),
// Key: obj.collected (folgt der Heldin), Gate: Frame 'closed'|'open', Flag: Frames flag0..2,
// Checkpoint: Frame 'off'|'on', Berry: Frame 'berry_red'|'berry_blue'|'berry_yellow', Fireball: obj.dir.

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';
import { POWER_COLORS } from '../../gfx/palette.js';
import { stdMat, basicMat, geo, canvasTexture, metalMat, damp, glowTexture, sparkleTexture, mergeGeos, setInstance, instanced } from '../lib/itemMaterials.js';

const TAU = Math.PI * 2;

/** Objekte ohne Blickrichtung/Neigung (Skalierung der Sprites – z. B. Checkpoint-Freude – bleibt). */
class StaticAvatar extends Avatar3D {
  constructor(view, obj) { super(view, obj); this.usesFacing = false; this.usesAngle = false; this.turnSpeed = 0; }
}

// Gemeinsame Farben/Materialien
const GOLD = { color: 0xffc21a, metalness: 0.75, roughness: 0.28 };
const gold = (renderer) => metalMat('gold', GOLD, renderer, 1.1);
const stone = () => stdMat('stone', { color: 0xcfd2dd, roughness: 0.85 });
const wood = () => stdMat('wood', { color: 0xb97a3f, roughness: 0.7 });
const iron = (renderer) => metalMat('iron', { color: 0x4d5a68, metalness: 0.6, roughness: 0.45 }, renderer, 0.8);

// =============================================================================================
// Bitcoin-Münze: dicke orange Münze mit Randwulst, weißes ₿-Relief auf beiden Seiten, dreht sich um
// die Hochachse, wippt leicht, Glitzerstern. Durchmesser 0,8, Dicke 0,14, Mitte bei y ≈ 0,42.
// =============================================================================================

const BTC = { base: '#f7931a', white: '#fff8ee' };

/** ₿ (B mit je zwei Strichen oben/unten), Höhe ≈ 6 Einheiten um (0,0). */
function btcPath(ctx, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(-1.0, 2.3);
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(0.3, -2.3);
  ctx.arc(0.3, -1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 0);
  ctx.moveTo(-1.0, 0); ctx.lineTo(0.55, 0);
  ctx.arc(0.55, 1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 2.3);
  for (const x of [-0.35, 0.55]) { ctx.moveTo(x, -3.0); ctx.lineTo(x, -2.3); ctx.moveTo(x, 2.3); ctx.lineTo(x, 3.0); }
  ctx.stroke();
}

function coinFaceTexture() {
  return canvasTexture('coinFace', 256, 256, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2, r = w / 2;
    ctx.fillStyle = BTC.base; ctx.fillRect(0, 0, w, h);
    // Innenkante des Randwulsts: oben schattig, unten Lichtkante
    const ring = ctx.createLinearGradient(0, 0, 0, h);
    ring.addColorStop(0, 'rgba(120,55,0,0.45)'); ring.addColorStop(0.5, 'rgba(120,55,0,0.1)'); ring.addColorStop(1, 'rgba(255,230,190,0.35)');
    ctx.lineWidth = r * 0.12; ctx.strokeStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.93, 0, TAU); ctx.stroke();
    // ₿ als Relief: dunkler Schatten unten rechts, helle Kante oben links, weißes Symbol
    const s = r * 0.215, lw = 0.95;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.2); ctx.scale(s, s);
    ctx.save(); ctx.translate(0.17, 0.17); btcPath(ctx, 'rgba(110,50,0,0.6)', lw); ctx.restore();
    ctx.save(); ctx.translate(-0.09, -0.09); btcPath(ctx, 'rgba(255,235,200,0.7)', lw); ctx.restore();
    btcPath(ctx, BTC.white, lw);
    ctx.restore();
  });
}

export class CoinAvatar extends StaticAvatar {
  buildModel() {
    const renderer = this.view.renderer;
    // eigene Material-Kopien: Deckkraft je Münze (gespeichert = geisterhaft, Einsammeln = Verblassen)
    this.bodyMat = this.track(metalMat('coinBody', { color: BTC.base, metalness: 0.55, roughness: 0.28, emissive: 0x2a1200 }, renderer, 1.0).clone());
    this.faceMat = this.track(metalMat('coinFace', { map: coinFaceTexture(), metalness: 0.35, roughness: 0.32, emissive: 0x1a0c00, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, renderer, 0.9).clone());
    this.spin = new THREE.Group();
    this.spin.position.y = 0.42;
    // Körper: Drehprofil (r, y) mit Randwulst und leicht vertieften Flächen, Achse zur Kamera gedreht
    const body = new THREE.Mesh(geo('coinBody', () => new THREE.LatheGeometry(
      [[0, 0.055], [0.29, 0.055], [0.32, 0.068], [0.36, 0.07], [0.385, 0.055], [0.4, 0.025], [0.4, -0.025], [0.385, -0.055], [0.36, -0.07], [0.32, -0.068], [0.29, -0.055], [0, -0.055]]
        .map(([x, y]) => new THREE.Vector2(x, y)), 44)), this.bodyMat);
    body.rotation.x = Math.PI / 2; body.castShadow = true;
    // beide ₿-Flächen in einem Mesh (Rückseite um Y gedreht → von hinten lesbar)
    const faces = new THREE.Mesh(geo('coinFaces', () => mergeGeos([
      [new THREE.CircleGeometry(0.305, 36), { pos: [0, 0, 0.058] }],
      [new THREE.CircleGeometry(0.305, 36), { pos: [0, 0, -0.058], rot: [0, Math.PI, 0] }],
    ])), this.faceMat);
    this.spin.add(body, faces);
    // Glitzerstern (vor der Münze, dreht nicht mit)
    this.sparkle = new THREE.Mesh(geo('sparkle', () => new THREE.PlaneGeometry(0.26, 0.26)),
      basicMat('sparkle', { map: sparkleTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparkle.position.set(0.2, 0.7, 0.45);
    this.model.add(this.spin, this.sparkle);
    this.phase = (this.obj.index ?? 0) * 1.3 + Math.random() * TAU;
  }

  animate(dt, t) {
    const o = this.obj;
    this.spin.rotation.y = t * 2.4 + this.phase;
    this.spin.position.y = 0.42 + Math.sin(t * 2.6 + this.phase) * 0.045;
    // Deckkraft aus dem Sprite (0,45 = schon gesammelt, Tween → 0 beim Einsammeln)
    const a = o.alpha;
    const ghost = a < 0.98;
    for (const m of [this.bodyMat, this.faceMat]) {
      m.transparent = ghost; m.opacity = a; m.depthWrite = !ghost;
    }
    this.root.visible = o.visible && a > 0.02;
    // Glitzern: kurzer Blitz alle ~2,5 s
    const k = Math.max(0, Math.sin(t * 2.5 + this.phase * 2));
    const s = Math.pow(k, 8) * (ghost ? 0.4 : 1);
    this.sparkle.scale.set(s, s, s);
    this.sparkle.rotation.z = t * 1.5;
    this.sparkle.visible = s > 0.02;
  }
}

// =============================================================================================
// Schlüssel: goldener Ring, Schaft, zweizackiger Bart – ein Mesh. Dreht sich langsam; eingesammelt
// schwebt er (Position von Phaser) hinter der Heldin und pendelt leicht. Höhe ≈ 0,78.
// =============================================================================================

export class KeyAvatar extends StaticAvatar {
  buildModel() {
    const key = new THREE.Mesh(geo('key', () => mergeGeos([
      [new THREE.TorusGeometry(0.15, 0.048, 10, 22), { pos: [0, 0.6, 0] }],
      [new THREE.CylinderGeometry(0.04, 0.046, 0.44, 10), { pos: [0, 0.23, 0] }],
      [new THREE.CylinderGeometry(0.065, 0.065, 0.035, 12), { pos: [0, 0.44, 0] }],
      [new THREE.BoxGeometry(0.15, 0.06, 0.05), { pos: [0.1, 0.08, 0] }],
      [new THREE.BoxGeometry(0.12, 0.06, 0.05), { pos: [0.085, 0.18, 0] }],
    ])), gold(this.view.renderer));
    key.castShadow = true;
    this.model.add(key);
    this.swing = 0;
  }

  animate(dt, t) {
    const c = this.obj.collected;
    this.model.rotation.y = t * (c ? 2.6 : 1.6);
    this.swing = damp(this.swing, c ? Math.sin(t * 3.2) * 0.22 : 0, 8, dt);
    this.model.rotation.z = this.swing;
  }
}

// =============================================================================================
// Tor: Steinbogen (zwei Pfosten + Bogen als ein extrudiertes Profil mit Öffnung, Schlussstein),
// Holztürblatt mit Eisenbändern und goldenem Schloss, Schwelle. 2 hoch, 1 breit. Frame 'open' →
// Türblatt schwingt weich nach innen, warmes Licht fällt aus dem Gang auf den Boden.
// =============================================================================================

function archShape(w, h, hole) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h); s.absarc(0, h, w, 0, Math.PI, false); s.lineTo(-w, 0);
  if (hole) {
    const p = new THREE.Path();
    p.moveTo(-hole[0], 0); p.lineTo(hole[0], 0); p.lineTo(hole[0], hole[1]); p.absarc(0, hole[1], hole[0], 0, Math.PI, false); p.lineTo(-hole[0], 0);
    s.holes.push(p);
  }
  return s;
}

/** Dunkler Gang mit warmem Lichtschein von unten (deckend – ersetzt beim Öffnen den dunklen Gang). */
function warmLightTexture() {
  return canvasTexture('gateLight', 64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#150d14'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.95, 0, w / 2, h * 0.95, h * 0.95);
    g.addColorStop(0, 'rgba(255,224,150,1)'); g.addColorStop(0.3, 'rgba(255,170,80,0.8)'); g.addColorStop(0.65, 'rgba(140,74,48,0.6)'); g.addColorStop(1, 'rgba(21,13,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

export class GateAvatar extends StaticAvatar {
  buildModel() {
    const renderer = this.view.renderer;
    // Steinbogen mit Öffnung, Schlussstein und Schwelle (ein Mesh)
    const frame = new THREE.Mesh(geo('gateFrame', () => mergeGeos([
      [new THREE.ExtrudeGeometry(archShape(0.5, 1.5, [0.33, 1.42]), { depth: 0.38, bevelEnabled: false, curveSegments: 16 }), { pos: [0, 0, -0.19] }],
      [new THREE.BoxGeometry(0.22, 0.24, 0.42), { pos: [0, 1.9, 0] }],
      [new THREE.BoxGeometry(1.1, 0.06, 0.6), { pos: [0, 0.03, 0.05] }],
    ])), stone());
    frame.castShadow = true; frame.receiveShadow = true;
    // Gang hinter der Tür: zu = dunkel, offen = warmer Lichtschein (Materialwechsel, eine Fläche)
    this.darkMat = basicMat('gateDark', { color: 0x150d14 });
    this.lightMat = basicMat('gateLight', { map: warmLightTexture() });
    this.back = new THREE.Mesh(geo('gateBack', () => {
      const g = new THREE.ShapeGeometry(archShape(0.34, 1.42, null), 12);
      const uv = g.attributes.uv; // UV auf 0..1 normieren (ShapeGeometry nutzt Weltkoordinaten)
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.34) / 0.68, uv.getY(i) / 1.76);
      return g;
    }), this.darkMat);
    this.back.position.z = -0.17;
    this.floorLight = new THREE.Mesh(geo('gateFloor', () => new THREE.PlaneGeometry(1.2, 0.9)), basicMat('gateFloorLight', { map: glowTexture(), color: 0xffb860, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    this.floorLight.rotation.x = -Math.PI / 2; this.floorLight.position.set(0, 0.075, 0.45); this.floorLight.visible = false;
    // Türblatt: Scharnier am linken Pfosten, schwingt nach hinten (−Z) auf
    this.hinge = new THREE.Group(); this.hinge.position.set(-0.32, 0, 0);
    const door = new THREE.Mesh(geo('gateDoor', () => new THREE.ExtrudeGeometry(archShape(0.31, 1.4, null), { depth: 0.07, bevelEnabled: false, curveSegments: 14 })), wood());
    door.position.set(0.32, 0, -0.035); door.castShadow = true;
    const details = new THREE.Mesh(geo('gateDetails', () => mergeGeos([
      [new THREE.BoxGeometry(0.014, 1.3, 0.076), { pos: [0.32 - 0.105, 0.66, 0] }],
      [new THREE.BoxGeometry(0.014, 1.3, 0.076), { pos: [0.32 + 0.105, 0.66, 0] }],
      [new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), { pos: [0.32 + 0.1, 0.8, 0.08], rot: [Math.PI / 2, 0, 0] }], // Schlüsselloch
    ])), stdMat('woodDark', { color: 0x5a3417, roughness: 0.8 }));
    const bands = new THREE.Mesh(geo('gateBands', () => mergeGeos([
      [new THREE.BoxGeometry(0.6, 0.09, 0.1), { pos: [0.32, 0.42, 0] }],
      [new THREE.BoxGeometry(0.6, 0.09, 0.1), { pos: [0.32, 1.12, 0] }],
    ])), iron(renderer));
    const lock = new THREE.Mesh(geo('gateLock', () => new THREE.BoxGeometry(0.16, 0.22, 0.06)), gold(renderer));
    lock.position.set(0.32 + 0.1, 0.78, 0.045);
    this.hinge.add(door, details, bands, lock);
    this.model.add(frame, this.back, this.floorLight, this.hinge);
    this.openAmount = 0;
  }

  animate(dt, t) {
    const open = this.frameName === 'open';
    this.openAmount = damp(this.openAmount, open ? 1 : 0, 5.5, dt);
    this.hinge.rotation.y = this.openAmount * 1.85;
    const lit = this.openAmount > 0.03;
    this.floorLight.visible = lit;
    this.back.material = lit ? this.lightMat : this.darkMat;
    if (lit) {
      const flicker = 0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 11.1) * 0.05;
      const k = Math.min(1, this.openAmount * 1.5) * flicker;
      this.lightMat.color.setScalar(k);
      this.floorLight.material.opacity = 0.6 * this.openAmount * flicker;
    }
  }
}

// =============================================================================================
// Zielfahne: cremefarbener Mast (2,2) auf Steinsockel, goldene Kugel oben, rote Fahne mit goldenem
// Blatt-Motiv, die als Vertex-Welle weht (PlaneGeometry 14x5, DoubleSide).
// =============================================================================================

function flagClothTexture() {
  return canvasTexture('flagCloth', 256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#e63a22'; ctx.fillRect(0, 0, w, h);
    // schmaler dunkler Saum am Mast, heller Streifen am Ende
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(120,20,10,0.35)'); g.addColorStop(0.15, 'rgba(120,20,10,0)'); g.addColorStop(0.85, 'rgba(255,170,60,0)'); g.addColorStop(1, 'rgba(255,170,60,0.3)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // goldenes Blatt in der Mitte
    ctx.save(); ctx.translate(w * 0.52, h * 0.5); ctx.rotate(0.55);
    const L = h * 0.62, W = h * 0.4;
    ctx.beginPath(); ctx.moveTo(0, -L / 2);
    ctx.quadraticCurveTo(W * 0.62, -L * 0.12, 0, L / 2); ctx.quadraticCurveTo(-W * 0.62, -L * 0.12, 0, -L / 2);
    ctx.closePath(); ctx.fillStyle = '#ffd24a'; ctx.fill();
    ctx.strokeStyle = 'rgba(190,110,0,0.75)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -L * 0.42); ctx.lineTo(0, L * 0.42); ctx.stroke();
    ctx.restore();
  });
}

export class FlagAvatar extends StaticAvatar {
  buildModel() {
    const renderer = this.view.renderer;
    const X = -0.3; // Mast steht links im Frame (Hitbox mittig)
    const pole = new THREE.Mesh(geo('flagPole', () => mergeGeos([
      [new THREE.CylinderGeometry(0.04, 0.055, 2.2, 10), { pos: [0, 1.1, 0] }],
      [new THREE.CylinderGeometry(0.2, 0.25, 0.14, 14), { pos: [0, 0.07, 0] }],
    ])), stdMat('cream', { color: 0xf3eee4, roughness: 0.5 }));
    pole.position.x = X; pole.castShadow = true; pole.receiveShadow = true;
    const top = new THREE.Mesh(geo('flagTop', () => mergeGeos([
      [new THREE.SphereGeometry(0.11, 16, 12), { pos: [0, 2.27, 0] }],
      [new THREE.TorusGeometry(0.05, 0.02, 8, 14), { pos: [0, 2.14, 0], rot: [Math.PI / 2, 0, 0] }],
    ])), gold(renderer));
    top.position.x = X;
    // Tuch: links am Mast, Welle läuft nach rechts
    this.clothGeo = this.track(new THREE.PlaneGeometry(0.98, 0.62, 14, 5));
    this.cloth = new THREE.Mesh(this.clothGeo, stdMat('flagCloth', { map: flagClothTexture(), roughness: 0.75, side: THREE.DoubleSide }));
    this.cloth.position.set(X + 0.49 + 0.03, 1.78, 0); this.cloth.castShadow = true;
    this.base0 = Float32Array.from(this.clothGeo.attributes.position.array);
    this.model.add(pole, top, this.cloth);
    this.phase = Math.random() * TAU;
  }

  animate(dt, t) {
    const pos = this.clothGeo.attributes.position, a = pos.array, b = this.base0;
    const w = 0.98, tt = t * 5.5 + this.phase;
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3], f = (x + w / 2) / w; // 0 am Mast … 1 am freien Ende
      const wave = Math.sin(f * 6.5 - tt) * 0.11 * f + Math.sin(f * 3.1 - tt * 0.7) * 0.04 * f;
      a[i * 3 + 2] = wave;
      a[i * 3 + 1] = b[i * 3 + 1] + Math.sin(f * 4 - tt * 0.9) * 0.025 * f - f * f * 0.05;
    }
    pos.needsUpdate = true;
    this.clothGeo.computeVertexNormals();
  }
}

// =============================================================================================
// Dornen: dunkle Brombeerranke (Schlauch entlang einer Kurve) über eine Tile-Breite mit hellen
// Dornenspitzen – ein Mesh mit Verlaufstextur (Ranke dunkel, Spitzen hell). Höhe ≈ 0,3. Wackelt leicht.
// =============================================================================================

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

function thornTexture() {
  return canvasTexture('thornTip', 8, 64, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#3f2412'); g.addColorStop(0.3, '#5a3a22'); g.addColorStop(0.55, '#b09a72'); g.addColorStop(1, '#fff8e8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

const THORN_SPIKES = [
  // x, z, Neigung z (rad), Neigung x (rad), Größe
  [-0.44, 0.02, 0.45, 0.1, 1.0], [-0.27, -0.06, -0.2, -0.25, 0.85], [-0.12, 0.08, 0.3, 0.3, 1.1],
  [0.04, -0.04, -0.35, -0.1, 0.9], [0.2, 0.06, 0.15, 0.3, 1.05], [0.35, -0.06, -0.45, -0.2, 0.9], [0.46, 0.03, 0.4, 0.15, 0.95],
];

function thornsGeometry() {
  return geo('thorns', () => {
    const pts = [[-0.52, 0.05, 0.04], [-0.32, 0.17, -0.07], [-0.1, 0.06, 0.1], [0.1, 0.18, -0.05], [0.3, 0.07, 0.08], [0.52, 0.15, -0.04]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const vine = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, 0.048, 6, false);
    const uv = vine.attributes.uv; // Ranke komplett dunkel: v auf den unteren Teil des Verlaufs legen
    for (let i = 0; i < uv.count; i++) uv.setY(i, 0.12);
    const parts = [[vine, {}]];
    for (const [x, z, rz, rx, s] of THORN_SPIKES) parts.push([new THREE.ConeGeometry(0.065, 0.32, 6), { pos: [x, 0.1 + 0.15 * s, z], rot: [rx, 0, rz], scale: s }]);
    return mergeGeos(parts);
  });
}
const thornsMaterial = () => stdMat('thorns', { map: thornTexture(), roughness: 0.6 });

/**
 * Alle Dornen einer Szene in EINER InstancedMesh (ein Zeichenaufruf statt bis zu 18 im Bild).
 * Jeder ThornsAvatar belegt einen Platz und schreibt je Frame seine Matrix hinein.
 */
const thornBatches = new WeakMap(); // THREE.Scene → ThornsBatch
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
class ThornsBatch {
  static get(scene) {
    let b = thornBatches.get(scene);
    if (!b) { b = new ThornsBatch(scene); thornBatches.set(scene, b); }
    return b;
  }
  constructor(scene, capacity = 96) {
    this.scene = scene; this.capacity = capacity; this.free = []; this.count = 0;
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
    this.mesh = new THREE.InstancedMesh(thornsGeometry(), thornsMaterial(), capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; // ein Aufruf für alle – lohnt sich immer
    this.mesh.receiveShadow = true;  // kein Schattenwurf: liegt flach am Boden
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, _zero);
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }
  acquire() { if (!this.free.length) return -1; this.count++; return this.free.pop(); }
  release(slot) {
    this.mesh.setMatrixAt(slot, _zero); this.mesh.instanceMatrix.needsUpdate = true;
    this.free.push(slot); this.count--;
    if (this.count <= 0) { this.scene.remove(this.mesh); this.mesh.dispose(); thornBatches.delete(this.scene); }
  }
  set(slot, m) { this.mesh.setMatrixAt(slot, m); this.mesh.instanceMatrix.needsUpdate = true; }
}

export class ThornsAvatar extends StaticAvatar {
  buildModel() {
    this.batch = ThornsBatch.get(this.view.three);
    this.slot = this.batch.acquire();
    if (this.slot < 0) { // Vorrat erschöpft (sehr viele Dornen): eigenes Mesh
      this.batch = null;
      this.model.add(new THREE.Mesh(thornsGeometry(), thornsMaterial()));
    }
    this.phase = this.obj.x * 0.37;
    this.rot = new THREE.Euler();
  }

  animate(dt, t) {
    this.rot.set(Math.sin(t * 1.7 + this.phase) * 0.02, 0, Math.sin(t * 2.3 + this.phase) * 0.02);
    if (!this.batch) { this.model.rotation.copy(this.rot); return; }
    // Weltlage aus root (in sync gesetzt) + Wackeln; unsichtbar = Größe 0
    _q.setFromEuler(this.rot);
    _s.setScalar(this.root.visible ? 1 : 0);
    this.batch.set(this.slot, _m.compose(this.root.position, _q, _s));
  }

  dispose() {
    super.dispose();
    if (this.batch && this.slot >= 0) { this.batch.release(this.slot); this.slot = -1; }
  }
}

// =============================================================================================
// Checkpoint: Holzpfosten auf Steinfuß, Laterne oben, Wimpel. 'off' = grau, 'on' = leuchtend grün
// (Emissive) mit weichem Schein; die kurze Freuden-Skalierung tweent Phaser (Basisklasse).
// =============================================================================================

export class CheckpointAvatar extends StaticAvatar {
  buildModel() {
    const X = -0.1;
    const post = new THREE.Mesh(geo('cpPost', () => new THREE.CylinderGeometry(0.07, 0.085, 1.76, 10)), wood());
    post.position.set(X, 0.88, 0); post.castShadow = true;
    // Steinfuß und Laternengehäuse (Sockelring, Dach, Knauf) – dunkel, ein Mesh
    const housing = new THREE.Mesh(geo('cpHousing', () => mergeGeos([
      [new THREE.CylinderGeometry(0.2, 0.25, 0.12, 14), { pos: [0, 0.06, 0] }],
      [new THREE.CylinderGeometry(0.19, 0.14, 0.06, 10), { pos: [0, 1.77, 0] }],
      [new THREE.ConeGeometry(0.22, 0.15, 10), { pos: [0, 2.14, 0] }],
      [new THREE.SphereGeometry(0.04, 8, 6), { pos: [0, 2.23, 0] }],
    ])), stdMat('lanternIron', { color: 0x3a3f4a, roughness: 0.6, metalness: 0.3 }));
    housing.position.x = X; housing.receiveShadow = true;
    this.offGlass = stdMat('lanternOff', { color: 0x9a9ca8, roughness: 0.35, metalness: 0.1 });
    this.onGlass = stdMat('lanternOn', { color: 0x7dff5e, emissive: 0x3ad62a, emissiveIntensity: 1.2, roughness: 0.3 });
    this.glass = new THREE.Mesh(geo('cpGlass', () => new THREE.CylinderGeometry(0.14, 0.17, 0.27, 10)), this.offGlass);
    this.glass.position.set(X, 1.935, 0);
    // Wimpel: Dreieck am Pfosten, zeigt nach rechts
    this.offCloth = stdMat('pennantOff', { color: 0xb0b3bf, roughness: 0.8, side: THREE.DoubleSide });
    this.onCloth = stdMat('pennantOn', { color: 0x5fe84a, emissive: 0x1e8a14, emissiveIntensity: 0.6, roughness: 0.7, side: THREE.DoubleSide });
    this.pennant = new THREE.Mesh(geo('cpPennant', () => {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.52, -0.14); s.lineTo(0, -0.34); s.lineTo(0, 0);
      return new THREE.ShapeGeometry(s);
    }), this.offCloth);
    this.pennant.position.set(X + 0.06, 1.62, 0); this.pennant.castShadow = true;
    // Schein um die Laterne (nur 'on')
    this.halo = new THREE.Mesh(geo('cpHalo', () => new THREE.PlaneGeometry(0.9, 0.9)), basicMat('haloGreen', { map: glowTexture(), color: 0x7dff5e, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
    this.halo.position.set(X, 1.93, 0.25); this.halo.visible = false;
    this.model.add(post, housing, this.glass, this.pennant, this.halo);
    this.onAmount = 0;
    this.phase = Math.random() * TAU;
  }

  animate(dt, t) {
    const on = this.frameName === 'on';
    this.glass.material = on ? this.onGlass : this.offGlass;
    this.pennant.material = on ? this.onCloth : this.offCloth;
    this.onAmount = damp(this.onAmount, on ? 1 : 0, 6, dt);
    this.halo.visible = this.onAmount > 0.03;
    const pulse = 1 + Math.sin(t * 4 + this.phase) * 0.08;
    this.halo.scale.setScalar(this.onAmount * pulse);
    this.halo.material.opacity = 0.55 * this.onAmount;
    // Wimpel: hängt schlaff (off) bzw. flattert (on)
    this.pennant.rotation.y = Math.sin(t * 6 + this.phase) * 0.25 * this.onAmount;
    this.pennant.rotation.z = -0.6 * (1 - this.onAmount) + Math.sin(t * 5.3 + this.phase) * 0.06 * this.onAmount;
  }
}

// =============================================================================================
// Beere: pralle Beere aus zwei Kugeln mit Stiel und Blatt, glänzend, in Rot/Blau/Gelb (POWER_COLORS).
// Auf-und-Ab tweent Phaser; hier nur eine langsame Drehung. Höhe ≈ 0,6.
// =============================================================================================

export class BerryAvatar extends StaticAvatar {
  buildModel() {
    const type = this.frameName.replace('berry_', '');
    const col = POWER_COLORS[type] ?? POWER_COLORS.none;
    const fruit = new THREE.Mesh(geo('berryFruit', () => mergeGeos([
      [new THREE.SphereGeometry(0.215, 18, 14), { pos: [0, 0.25, 0] }],
      [new THREE.SphereGeometry(0.165, 16, 12), { pos: [0.085, 0.34, 0.07] }],
    ])), stdMat(`berry:${type}`, { color: col.Z, roughness: 0.22, metalness: 0 }));
    fruit.castShadow = true;
    const green = new THREE.Mesh(geo('berryGreen', () => mergeGeos([
      [new THREE.CylinderGeometry(0.014, 0.022, 0.16, 6), { pos: [-0.01, 0.52, 0], rot: [0, 0, 0.2] }],
      [new THREE.SphereGeometry(0.1, 12, 8), { pos: [0.1, 0.55, 0.03], rot: [0, -0.3, -0.35], scale: [1.5, 0.22, 0.75] }],
    ])), stdMat('leafGreen', { color: 0x5fbf3e, roughness: 0.6 }));
    this.model.add(fruit, green);
    this.phase = Math.random() * TAU;
  }

  animate(dt, t) {
    this.model.rotation.y = t * 1.3 + this.phase;
  }
}

// =============================================================================================
// Feuerball: glühende Kugel (unbeleuchtet, gelb-weiß) mit Glut-Schein und flackerndem Schweif aus
// drei kleineren Kugeln (Instanzen) entgegen der Flugrichtung (obj.dir). Keine Schatten. Mitte y = 0,25.
// =============================================================================================

export class FireballAvatar extends StaticAvatar {
  buildModel() {
    this.core = new THREE.Mesh(geo('fireCore', () => new THREE.SphereGeometry(0.2, 14, 10)), basicMat('fireCore', { color: 0xfff0a0 }));
    this.core.position.y = 0.25;
    this.tail = instanced(geo('fireTail', () => new THREE.SphereGeometry(0.12, 10, 8)), basicMat('fireWarm', { color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false }), 3, 1.0, 0.3);
    this.glow = new THREE.Mesh(geo('fireGlow', () => new THREE.PlaneGeometry(1, 1)), basicMat('fireGlowMat', { map: glowTexture(), color: 0xff9a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }));
    this.glow.position.set(0, 0.25, 0.05);
    this.model.add(this.core, this.glow, this.tail);
    this.phase = Math.random() * TAU;
  }

  animate(dt, t) {
    const dir = this.obj.dir ?? 1;
    const flick = 1 + Math.sin(t * 31 + this.phase) * 0.12;
    this.core.scale.setScalar(flick);
    this.core.rotation.y = t * 6; this.core.rotation.x = t * 3;
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.26;
      const wob = Math.sin(t * 24 + i * 1.9 + this.phase);
      setInstance(this.tail, i, -dir * (0.2 + i * 0.15), 0.25 + 0.07 * i + wob * 0.04, wob * 0.03, 0, 0, 0, k * (0.85 + 0.25 * Math.sin(t * 37 + i * 2.3)));
    }
    this.tail.instanceMatrix.needsUpdate = true;
    this.glow.scale.setScalar(0.9 + Math.sin(t * 19 + this.phase) * 0.12);
  }
}
