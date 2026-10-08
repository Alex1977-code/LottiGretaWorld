// Basisklasse aller Kurs-Entitäten (Gegner, Items, Blöcke, Checkpoint, Zielmast …).
//
// Felder (Vertrag): pos (Fußpunkt, Vector3), vel, half (AABB-Halbmaße), yaw, alive, model ({root, update,
// dispose}). Zusätzlich (Präzisierung Motor):
//   level        Level-Laufzeit (world, view, player, spawn, sfx, effects, runtime …)
//   spec         Daten aus dem Level
//   kind         Art (Registry-Name)
//   enemy        true für Gegner (Power-up-Berührung: Funkelstern/Riesentrank besiegen ihn)
//   touch        false = keine Spieler-Berührung prüfen (Standard true)
//   shadow       Radius des Schatten-Blobs (0 = keiner)
//   grounded     nach moveWithGravity()
//   removed      wird nach dem Schritt entfernt (dispose)
//
// Methoden: update(dt), onPlayer(player, contact) → 'stomp'|'hurt'|'collect'|'none', onStomp(player),
// onHit(kind, source) mit kind ∈ fire|claw|shell|pound|mega|star|bump, dispose().
// Hilfen: center(), moveWithGravity(dt, opts), turnAtEdges(), setModel(model), syncModel(), kill(),
// addShape(shape) (Kollisionsform mit owner = this, wird beim Entfernen gelöscht).
//
// contact (von der Level-Laufzeit): { fromAbove, pound, dive, star, dx, dz, speed }
//   fromAbove: Figur fällt und war im Schritt davor mit den Füßen über der oberen Hälfte → draufgesprungen.
//
// Ergänzungen (Präzisierung Gegner/Power-ups, additiv):
//   carryable    true → die Figur kann das Objekt aufheben (Aktion in Reichweite) und werfen
//   carrier      Figur, die das Objekt gerade trägt (sonst null)
//   onPickup(player), onThrow(player, { dir: {x, z}, gentle }), onDrop(player)   Trage-Hooks
//   followCarrier()  im update() aufrufen, solange carrier gesetzt ist (Lage über dem Kopf der Figur)
//   overlaps(other), distanceTo(x, y, z)   AABB-Hilfen (Berührung, Explosionsradius)

import * as THREE from 'three';

const GRAVITY = 40;

export class CourseEntity {
  constructor(level, spec = {}, kind = 'entity') {
    this.level = level;
    this.spec = spec;
    this.kind = kind;
    const p = spec.pos ?? [0, 0, 0];
    this.pos = new THREE.Vector3(p[0], p[1], p[2]);
    this.vel = new THREE.Vector3();
    this.half = new THREE.Vector3(0.4, 0.4, 0.4);
    this.yaw = spec.yaw ?? 0;
    this.alive = true;
    this.removed = false;
    this.model = null;
    this.enemy = false;
    this.touch = true;
    this.shadow = 0;
    this.grounded = false;
    this.ground = null;
    this.shapes = [];
    this.carryable = false;
    this.carrier = null;
    this._c = new THREE.Vector3();
  }

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + this.half.y, this.pos.z); }

  /** Modell setzen (getModel-Ergebnis) und der Szene hinzufügen. */
  setModel(model) {
    if (this.model) { this.level.view.remove(this.model.root); this.model.dispose?.(); }
    this.model = model;
    if (model) { this.level.view.add(model.root); this.syncModel(); }
    return model;
  }

  /** Modell an pos/yaw ausrichten (je Bild von der Laufzeit aufgerufen). */
  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
  }

  /** Darstellung je Bild (dt real) – Standard: Modell nachführen und animieren. */
  render(dt, t) {
    this.syncModel();
    this.model?.update?.(dt, this.modelState?.() ?? {});
  }

  update(dt) {}

  onPlayer(player, contact) { return 'none'; }
  onStomp(player) {}
  onHit(kind, source) {}

  /** Kollisionsform mit owner = this anmelden. */
  addShape(shape) {
    shape.owner = this;
    const id = this.level.world.add(shape);
    this.shapes.push(id);
    return id;
  }

  removeShapes() {
    for (const id of this.shapes) this.level.world.remove(id);
    this.shapes.length = 0;
  }

  /**
   * Schwerkraft + Bewegung mit Kollision (Gegner, laufende Items). opts: gravity, step, snap.
   * Setzt grounded/ground, liefert das moveAABB-Ergebnis. Bewegte Plattformen nehmen mit.
   */
  moveWithGravity(dt, opts = {}) {
    const g = this.ground;
    if (this.grounded && g?.mover) { const m = g.mover; this.pos.x += m.dx; this.pos.y += m.dy; this.pos.z += m.dz; }
    if (this.grounded && g?.conveyor) { this.pos.x += g.conveyor.x * dt; this.pos.z += g.conveyor.z * dt; }
    this.vel.y = Math.max(this.vel.y - (opts.gravity ?? GRAVITY) * dt, -24);
    if (this.grounded && this.vel.y < -2) this.vel.y = -2;
    const c = this.center();
    const own = new Set(this.shapes);
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, {
      step: opts.step ?? 0.25, snap: this.grounded ? (opts.snap ?? 0.3) : 0, ignore: own.size ? (s) => own.has(s.id) : null,
    });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.grounded = res.grounded;
    this.ground = res.ground;
    if (res.grounded && this.vel.y < 0) this.vel.y = 0;
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    if (res.hitWall) {
      const n = res.wallNormal, d = this.vel.x * n.x + this.vel.z * n.z;
      if (d < 0) { this.vel.x -= n.x * d; this.vel.z -= n.z * d; }
    }
    // Tod in Lava/Abgrund
    if (this.pos.y < this.level.killY) this.kill();
    return res;
  }

  /** Steht vor der Bewegungsrichtung (Abstand ahead) Boden? (Kanten-Erkennung für Patrouillen) */
  groundAhead(dx, dz, ahead = 0.6, drop = 1.2) {
    const l = Math.hypot(dx, dz) || 1;
    const x = this.pos.x + (dx / l) * (this.half.x + ahead), z = this.pos.z + (dz / l) * (this.half.z + ahead);
    const hit = this.level.world.raycastDown(x, this.pos.y + 0.5, z, drop + 0.5);
    return !!hit && !hit.shape.kill;
  }

  // ------------------------------------------------------------------ AABB-Hilfen (additiv)

  /** Berühren sich die Hüllquader (pos = Fußpunkt, half = Halbmaße) von this und other? */
  overlaps(other, pad = 0) {
    const a = this.pos, b = other.pos, ha = this.half, hb = other.half;
    return Math.abs(a.x - b.x) <= ha.x + hb.x + pad && Math.abs(a.z - b.z) <= ha.z + hb.z + pad
      && Math.abs((a.y + ha.y) - (b.y + hb.y)) <= ha.y + hb.y + pad;
  }

  /** Abstand eines Punktes zum Hüllquader (0 = innen). */
  distanceTo(x, y, z) {
    const h = this.half, p = this.pos;
    const dx = Math.max(0, Math.abs(x - p.x) - h.x), dy = Math.max(0, Math.abs(y - (p.y + h.y)) - h.y), dz = Math.max(0, Math.abs(z - p.z) - h.z);
    return Math.hypot(dx, dy, dz);
  }

  // ------------------------------------------------------------------ Tragen/Werfen (additiv)

  onPickup(player) {}
  /** Geworfen: o = { dir: {x, z} Blickrichtung, gentle: true = nur absetzen (Ducken + Aktion) }. */
  onThrow(player, o) {
    if (o.gentle) { this.vel.set(o.dir.x * 1.2, 1.5, o.dir.z * 1.2); return; }
    this.vel.set(o.dir.x * 8 + player.vel.x * 0.3, 5, o.dir.z * 8 + player.vel.z * 0.3);
  }
  /** Fallen gelassen (Treffer der Figur, Neustart). */
  onDrop(player) { this.vel.set(0, 2, 0); }

  /**
   * Getragen: Lage über dem Kopf der Figur übernehmen (player.holdPoint). Hat die Figur losgelassen (Treffer,
   * Neustart, Teleport), wird onDrop gerufen und false geliefert.
   */
  followCarrier() {
    const p = this.carrier;
    if (!p) return false;
    if (p.holding !== this || p.dead || this.removed) {
      this.carrier = null;
      if (p.holding === this) p.holding = null;
      this.onDrop(p);
      return false;
    }
    p.holdPoint(this, this.pos);
    this.vel.copy(p.vel);
    this.yaw = p.yaw;
    this.grounded = false;
    return true;
  }

  /** Aus dem Spiel nehmen (nach dem Schritt entfernt). */
  kill() {
    if (this.removed) return;
    this.alive = false;
    this.removed = true;
  }

  dispose() {
    this.removeShapes();
    if (this.model) { this.level.view.remove(this.model.root); this.model.dispose?.(); this.model = null; }
  }
}
