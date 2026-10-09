// Schranken der Kurs-Weltkarte: zwei Lagen Steinblöcke quer über eine Engstelle, vorn und hinten ein Schloss-Wappen.
// Kollision: ein hoher, unsichtbarer Quader über die ganze Engstelle (Kamera darf hindurch, kein Wandrutschen),
// damit niemand darüber springt. open(animate) entfernt die Kollision sofort; die Blöcke versinken nacheinander
// im Boden (Staub, Klang) – die Animation läuft im Simulationstakt (step), also deterministisch.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gateBlockGeo, gateEmblemGeo, lockGeo, vcol } from './props.js';

const SINK_TIME = 0.45;     // s je Block
const STAGGER = 0.12;       // s Versatz zwischen Blöcken

export class MapGate {
  /**
   * @param {object} level
   * @param {{ for: string, rect: number[], axis: 'x'|'z', id: string }} def (gateRects)
   * @param {number} groundY Bodenhöhe an der Schranke
   */
  constructor(level, def, groundY) {
    this.level = level;
    this.def = def;
    this.for = def.for;
    this.y = groundY;
    this.state = 'closed';      // closed | opening | open
    this.t = 0;
    const [x0, z0, x1, z1] = def.rect;
    this.center = { x: (x0 + x1) / 2, y: groundY, z: (z0 + z1) / 2 };
    // Kollision: über die Engstelle und etwas in die Ränder hinein
    const pad = 0.4;
    const along = def.axis; // Laufrichtung des Wegs
    const min = along === 'x' ? [x0, groundY - 1, z0 - pad] : [x0 - pad, groundY - 1, z0];
    const max = along === 'x' ? [x1, groundY + 40, z1 + pad] : [x1 + pad, groundY + 40, z1];
    this.shapeId = level.world.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, tag: 'gate', gate: def.for });
    // Darstellung
    this.group = new THREE.Group();
    this.group.name = `schranke:${def.for}`;
    const width = along === 'x' ? z1 - z0 : x1 - x0;
    const n = Math.max(1, Math.round(width));
    const step = width / n;
    // Blöcke als eine InstancedMesh (ein Zeichenaufruf), obere Lage zuerst (versinkt zuerst)
    this.blocks = [];
    for (const row of [1, 0]) {
      for (let i = 0; i < n; i++) {
        const u = -width / 2 + step * (i + 0.5);
        this.blocks.push({ x: along === 'x' ? 0 : u, z: along === 'x' ? u : 0, base: row, y: row, sx: along === 'x' ? 1 : step, sz: along === 'x' ? step : 1, visible: true });
      }
    }
    this.inst = new THREE.InstancedMesh(gateBlockGeo(), vcol(0.6), this.blocks.length);
    this.inst.castShadow = true; this.inst.receiveShadow = true;
    this.group.add(this.inst);
    this.placeBlocks();
    this.inst.computeBoundingSphere();
    this.inst.boundingSphere.radius += 2.5;   // Versinken bleibt im Culling-Bereich
    // Wappen beidseitig (Schloss) – beide Seiten in einer Geometrie
    const parts = [];
    for (const sd of [1, -1]) {
      const g = gateEmblemGeo().clone();
      g.rotateY(along === 'x' ? (sd > 0 ? Math.PI / 2 : -Math.PI / 2) : (sd > 0 ? 0 : Math.PI));
      g.translate(along === 'x' ? sd * 0.52 : 0, 1.05, along === 'x' ? 0 : sd * 0.52);
      parts.push(g);
    }
    this.emblemGeo = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    this.emblem = new THREE.Mesh(this.emblemGeo, vcol(0.4));
    this.group.add(this.emblem);
    // schwebendes Schloss über der Mitte (aus jeder Kamerarichtung lesbar)
    this.lock = new THREE.Mesh(lockGeo(), vcol(0.35));
    this.lock.castShadow = true;
    this.lock.position.set(0, 2.35, 0);
    this.lock.scale.setScalar(1.15);
    this.group.add(this.lock);
    this.group.position.set(this.center.x, groundY, this.center.z);
    level.view?.add(this.group);
  }

  get closed() { return this.state === 'closed'; }

  /** Öffnen: Kollision weg; animate → Blöcke versinken (Dauer duration()), sonst sofort weg. */
  open(animate = true) {
    if (this.state !== 'closed') return;
    if (this.shapeId !== null) { this.level.world.remove(this.shapeId); this.shapeId = null; }
    if (!animate) { this.finish(); return; }
    this.state = 'opening';
    this.t = 0;
    this.level.sfx('switch');
  }

  duration() { return SINK_TIME + STAGGER * (this.blocks.length - 1) + 0.2; }

  /** Darstellung je Bild (Schloss wiegt sich). */
  render(dt, t) {
    if (this.state !== 'closed' || !this.lock) return;
    this.lock.rotation.y = Math.sin(t * 1.2 + this.center.x) * 0.6;
    this.lock.position.y = 2.35 + Math.sin(t * 2 + this.center.z) * 0.08;
  }

  /** Simulationsschritt (Animation). */
  step(dt) {
    if (this.state !== 'opening') return;
    const prev = this.t;
    this.t += dt;
    const fx = this.level.effects;
    this.blocks.forEach((m, i) => {
      const t0 = i * STAGGER;
      if (prev < t0 && this.t >= t0) {
        fx?.dust({ x: this.center.x + m.x, y: this.y + 0.1, z: this.center.z + m.z }, 5, 1.2);
        if (i % 3 === 0) this.level.sfx('brickbreak');
      }
      const k = Math.min(1, Math.max(0, (this.t - t0) / SINK_TIME));
      m.y = m.base - k * k * 2.2 + Math.sin(k * Math.PI) * 0.15;
      m.visible = k < 1;
    });
    this.placeBlocks();
    const ek = Math.min(1, this.t / 0.5);
    this.emblem.scale.setScalar(Math.max(0.001, 1 + ek * 0.6 - ek * ek * 1.6));
    this.emblem.position.y = ek * 1.2;
    // Schloss springt auf und fliegt davon
    this.lock.position.y = 2.35 + ek * 2.5;
    this.lock.rotation.y += dt * 14;
    this.lock.scale.setScalar(Math.max(0.001, 1.15 * (1 - Math.max(0, this.t - 0.3) / 0.5)));
    if (this.t >= this.duration()) this.finish();
  }

  placeBlocks() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    this.blocks.forEach((b, i) => {
      p.set(b.x, b.y, b.z);
      sc.set(b.visible ? b.sx : 0.0001, b.visible ? 1 : 0.0001, b.visible ? b.sz : 0.0001);
      m.compose(p, q, sc);
      this.inst.setMatrixAt(i, m);
    });
    this.inst.instanceMatrix.needsUpdate = true;
  }

  finish() {
    this.state = 'open';
    this.group.parent?.remove(this.group);
  }

  dispose() {
    if (this.shapeId !== null) { this.level.world.remove(this.shapeId); this.shapeId = null; }
    this.group.parent?.remove(this.group);
    this.inst?.dispose();
    this.emblemGeo?.dispose();
  }
}
