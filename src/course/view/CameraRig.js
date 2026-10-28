// Kamera des Kurs-Modus: schräg von hinten oben (Neigung 45–55°, Abstand 12–16 m) mit Kameraschienen
// aus LEVEL.camera, weich überblendet; Spieler kann ±30° drehen (Q/E, Touch ⟲ ⟳) und zwischen 2
// Zoomstufen wechseln (Z, Touch); weiches Folgen mit Vorausschau in Bewegungsrichtung; senkrecht an der
// letzten Standhöhe verankert (Sprünge bleiben ruhig im Bild); nie in fester Geometrie (Strahl zur
// Kamera, bei Verdeckung näher heran).
//
// Kameraschiene (Präzisierung Motor), Einträge in LEVEL.camera:
//   { from, to,           z-Bereich (Reihenfolge egal; Level verlaufen nach −Z)
//     pitch: 45,          Neigung in Grad (Blick nach unten)
//     dist: 13,           Abstand Kamera–Ziel in m
//     yaw: 0,             Grad; 0 = hinter der Figur (+Z) mit Blick nach −Z, positiv = Kamera nach rechts (+X)
//     fov: 38,            vertikaler Öffnungswinkel in Grad
//     x: null,            fester X-Wert des Blickziels (seitlich fixieren); xLock 0..1 Stärke (Standard 1)
//     height: 1.0,        Blickziel über dem Fußpunkt (m)
//     lead: 1,            Faktor der Vorausschau
//     ahead: 2.0,         Blickziel so viele m vor der Figur (Blickrichtung der Kamera) → Figur im unteren
//                         Bilddrittel, mehr Sicht nach vorn
//     area: [xMin, xMax]  optional: Abschnitt gilt nur in diesem X-Bereich (z. B. Bonusraum abseits) }
// Power-ups können den Abstand vergrößern: player.powerDef.camZoom (Riesentrank 1,4) wird weich überblendet
// (powerZoom, Präzisierung Gegner/Power-ups).
// Zwischen Abschnitten wird über BLEND m überblendet. Die Steuerungs-Gier (controlYaw) kommt
// unverzögert aus der Schiene + Spielerdrehung, damit die Simulation deterministisch bleibt.
//
// Mehrere Figuren (Präzisierung Motor Welt 2, Spiegelfrucht): Hat player.level.players mehr als eine Figur,
// folgt die Kamera dem Schwerpunkt der aktiven Figuren (Tempo = Mittel, Standhöhe/Modus von der Haupt-Figur)
// und zoomt mit der Streuung (größter waagerechter Abstand zum Schwerpunkt) weich heraus: ab 1,5 m, bis ×1,35 bei
// 10,5 m (groupZoom). Weiter zurückgefallene Figuren gehen in der Simulation verloren (player/Squad.js).
//
// Kamera-Hindernisse (Präzisierung „Motor-Feinschliff nach Welt 6“): der Strahl prüft die echte Form
// (CollisionWorld.raycastCam – Rampen als Keil, Zylinder rund; an Hängen rückt die Kamera nicht mehr heran, `camIgnore`
// auf Rampen ist nicht mehr nötig); kleine, frei stehende Hindernisse (alle Kanten ≤ SMALL m, seitlich ohne feste
// Nachbarn – z. B. ein einzelner ?-Block, Ziegel, eine Kiste) nahe der Figur (≤ SMALL_NEAR m vom Kopf) ziehen die Kamera
// nicht heran – sie verdecken nur kurz einen kleinen Bildteil. Reihen und Mauern aus Blöcken zählen weiter.

import * as THREE from 'three';

export const CAM_DEFAULT = { pitch: 45, dist: 13, yaw: 0, fov: 38, x: null, xLock: 1, height: 1.0, lead: 1, ahead: 2.0 };
const BLEND = 8;
const SMALL = 2.2, SMALL_NEAR = 5;   // kleine Hindernisse nahe der Figur übergehen (m)
const USER_STEP = 15, USER_MAX = 30;
const ZOOMS = [1, 0.74];
const DEG = Math.PI / 180;
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

export class CameraRig {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {object[]} sections LEVEL.camera
   */
  constructor(camera, sections = []) {
    this.camera = camera;
    this.sections = (sections ?? []).map((s) => ({ ...CAM_DEFAULT, ...s, zMin: Math.min(s.from ?? 1e9, s.to ?? -1e9), zMax: Math.max(s.from ?? 1e9, s.to ?? -1e9) }));
    this.userYaw = 0; this.userYawTarget = 0;
    this.zoomIndex = 0; this.zoom = 1;
    this.powerZoom = 1;
    this.target = new THREE.Vector3();
    this.lead = new THREE.Vector3();
    this.anchorY = 0;
    this.distNow = 14;
    this.cur = { ...CAM_DEFAULT };
    this.shakeAmt = 0;
    this.frozen = false;
    this.groupZoom = 1;
    this.spread = 0;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._h = new THREE.Vector3();
    this._focus = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), mode: 'ground', half: null, dead: false, deathCause: null, powerDef: null };
  }

  /**
   * Blickpunkt-Quelle: die Figur selbst oder – bei mehreren Figuren – ein Ersatzobjekt im Schwerpunkt der aktiven
   * Figuren (pos, vel, mode, half, dead, deathCause, powerDef). Setzt this.spread (m).
   */
  focusOf(player) {
    const list = player?.level?.players;
    this.spread = 0;
    if (!list || list.length <= 1) return player;
    const f = this._focus;
    f.pos.set(0, 0, 0); f.vel.set(0, 0, 0);
    let n = 0;
    for (const p of list) {
      if (p.dead || p.hidden || (p.mode === 'script' && p !== player)) continue;
      f.pos.add(p.pos); f.vel.add(p.vel); n++;
    }
    if (!n) return player;
    f.pos.multiplyScalar(1 / n); f.vel.multiplyScalar(1 / n);
    for (const p of list) {
      if (p.dead || p.hidden || (p.mode === 'script' && p !== player)) continue;
      this.spread = Math.max(this.spread, Math.hypot(p.pos.x - f.pos.x, p.pos.z - f.pos.z));
    }
    // senkrecht verankert an der Haupt-Figur (Standhöhe), nicht am Mittel der Sprünge
    f.pos.y = player.pos.y;
    f.mode = player.mode; f.half = player.half; f.dead = player.dead; f.deathCause = player.deathCause; f.powerDef = player.powerDef;
    return f;
  }

  /** Überblendete Schienenwerte an (x, z). Reine Funktion (Tests, controlYaw). */
  railAt(x, z, out = {}) {
    let wsum = 0;
    const acc = { pitch: 0, dist: 0, yaw: 0, fov: 0, height: 0, lead: 0, ahead: 0, lx: 0, lw: 0 };
    let nearest = null, nd = Infinity;
    for (const s of this.sections) {
      if (s.area && (x < s.area[0] || x > s.area[1])) continue;
      const d = z < s.zMin ? s.zMin - z : z > s.zMax ? z - s.zMax : 0;
      if (d < nd) { nd = d; nearest = s; }
      const w = d === 0 ? 1 : 1 - smooth(d / BLEND);
      if (w <= 0) continue;
      wsum += w;
      acc.pitch += s.pitch * w; acc.dist += s.dist * w; acc.yaw += s.yaw * w; acc.fov += s.fov * w;
      acc.height += s.height * w; acc.lead += s.lead * w; acc.ahead += s.ahead * w;
      if (s.x !== null && s.x !== undefined) { acc.lx += s.x * w * s.xLock; acc.lw += w * s.xLock; }
    }
    if (wsum <= 0) {
      const s = nearest ?? CAM_DEFAULT;
      Object.assign(out, { pitch: s.pitch, dist: s.dist, yaw: s.yaw, fov: s.fov, height: s.height, lead: s.lead, ahead: s.ahead, lockX: s.x ?? null, lockW: s.x != null ? s.xLock : 0 });
      return out;
    }
    out.pitch = acc.pitch / wsum; out.dist = acc.dist / wsum; out.yaw = acc.yaw / wsum; out.fov = acc.fov / wsum;
    out.height = acc.height / wsum; out.lead = acc.lead / wsum; out.ahead = acc.ahead / wsum;
    out.lockW = acc.lw / wsum; out.lockX = acc.lw > 0 ? acc.lx / acc.lw : null;
    return out;
  }

  /** Gier der Steuerung (rad): Schiene + Spielerdrehung (Zielwert, unverzögert). */
  controlYaw(pos) {
    return (this.railAt(pos.x, pos.z, this._rail ?? (this._rail = {})).yaw + this.userYawTarget) * DEG;
  }

  rotate(dir) { this.userYawTarget = Math.max(-USER_MAX, Math.min(USER_MAX, this.userYawTarget + dir * USER_STEP)); }
  toggleZoom() { this.zoomIndex = (this.zoomIndex + 1) % ZOOMS.length; }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }

  /** Sofort auf die Figur setzen (Start, Teleport, Neustart). */
  snap(player) {
    const fp = this.focusOf(player);
    const pp = fp.pos;
    this.lead.set(0, 0, 0);
    this.anchorY = pp.y;
    const r = this.railAt(pp.x, pp.z, this.cur);
    this.userYaw = this.userYawTarget;
    this.zoom = ZOOMS[this.zoomIndex];
    this.powerZoom = player.powerDef?.camZoom ?? 1;
    this.groupZoom = this.groupZoomFor(this.spread);
    const yaw = (r.yaw + this.userYaw) * DEG;
    this.target.set(this.lockedX(pp.x - Math.sin(yaw) * r.ahead, r), pp.y + r.height, pp.z - Math.cos(yaw) * r.ahead);
    this.distNow = r.dist * this.zoom * this.powerZoom * this.groupZoom;
    this.place(r, 0);
  }

  /** Zoom-Faktor aus der Streuung der Figuren (1 … 1,35). */
  groupZoomFor(spread) { return 1 + Math.max(0, Math.min(1, (spread - 1.5) / 9)) * 0.35; }

  lockedX(px, r) { return r.lockX === null || r.lockX === undefined ? px : px + (r.lockX - px) * r.lockW; }

  update(dt, player, world) {
    // Archetyp mit eigener Kamera (z. B. Diorama-Orbit): setzt Kamera selbst und gibt true zurück
    if (this.custom && this.custom(dt, player, world)) return;
    const fp = this.focusOf(player);   // Figur oder Schwerpunkt mehrerer Figuren
    const p = fp.pos;
    const r = this.railAt(p.x, p.z, this.cur);
    this.userYaw = damp(this.userYaw, this.userYawTarget, 6, dt);
    this.zoom = damp(this.zoom, ZOOMS[this.zoomIndex], 5, dt);
    this.powerZoom = damp(this.powerZoom, player.powerDef?.camZoom ?? 1, 2.5, dt);
    this.groupZoom = damp(this.groupZoom, this.groupZoomFor(this.spread), 2.5, dt);
    const frozen = player.dead && player.deathCause === 'fall';
    if (!frozen) {
      // Vorausschau in Bewegungsrichtung (weich, begrenzt)
      const lx = Math.max(-3.2, Math.min(3.2, fp.vel.x * 0.3)) * r.lead;
      const lz = Math.max(-3.2, Math.min(3.2, fp.vel.z * 0.3)) * r.lead;
      this.lead.x = damp(this.lead.x, lx, 2.2, dt);
      this.lead.z = damp(this.lead.z, lz, 2.2, dt);
      // Senkrecht: an der Standhöhe verankert, folgt nur bei deutlichem Steigen/Fallen
      const standing = player.mode === 'ground' || player.mode === 'wall' || player.mode === 'stalk' || player.mode === 'swim' || player.mode === 'script';
      // player.camTrack > 0 (1/s): schnelles Nachführen in schnellen Flügen (Röhrenkanone, Präzisierung Welt 5)
      const track = player.camTrack > 0 ? player.camTrack : 0;
      if (standing) this.anchorY = damp(this.anchorY, p.y, Math.max(6, track), dt);
      else if (p.y > this.anchorY + 2.6) this.anchorY = p.y - 2.6;
      else if (p.y < this.anchorY - 0.5) this.anchorY = p.y + 0.5;
      const yaw = (r.yaw + this.userYaw) * DEG;
      const tx = this.lockedX(p.x + this.lead.x - Math.sin(yaw) * r.ahead, r), ty = this.anchorY + r.height, tz = p.z + this.lead.z - Math.cos(yaw) * r.ahead;
      this.target.x = damp(this.target.x, tx, Math.max(8, track), dt);
      this.target.y = damp(this.target.y, ty, Math.max(5, track), dt);
      this.target.z = damp(this.target.z, tz, Math.max(8, track), dt);
    }
    // Kamera nicht in Geometrie: Strahl vom Kopf der Figur zur Wunschposition. Ist er verdeckt, rückt die
    // Kamera auf ihrer Achse näher ans Ziel, bis der Kopf wieder frei sichtbar ist (höchstens bis 3 m).
    const want = r.dist * this.zoom * this.powerZoom * this.groupZoom;
    let dist = want;
    if (world && !frozen) {
      const dir = this.offsetDir(r, this._a);
      const head = this._h.set(p.x, p.y + player.half.y * 2 + 0.15, p.z);
      for (let k = 0; k < 8; k++) {
        const d = want * (1 - k * 0.11);
        const end = this._b.copy(this.target).addScaledVector(dir, d);
        if (!this.blocked(world, head, end)) { dist = d; break; }
        dist = Math.max(3, d);
      }
    }
    this.distNow = dist < this.distNow ? damp(this.distNow, dist, 18, dt) : damp(this.distNow, dist, 3, dt);
    this.place(r, dt);
  }

  /**
   * Verdeckt etwas den Strahl Kopf → Kamera? Echte Formen (raycastCam); kleine Formen nahe dem Kopf zählen nicht.
   * Ältere Welten ohne raycastCam (Test-Attrappen): Hüllquader wie bisher.
   */
  blocked(world, a, b) {
    if (!world.raycastCam) return !!world.raycast(a, b);
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    let skip = null;
    for (let k = 0; k < 6; k++) {
      const h = world.raycastCam(a, b, skip);
      if (!h) return false;
      const s = h.shape;
      const small = s.x1 - s.x0 <= SMALL && s.z1 - s.z0 <= SMALL && s.top - s.bot <= SMALL;
      if (!small || h.t * len > SMALL_NEAR || !this.isolated(world, s)) return true;
      (skip ??= new Set()).add(s);
    }
    return false;
  }

  /** Kleine Form ohne feste seitliche Nachbarn (Boden darunter, Decke darüber zählen nicht)? */
  isolated(world, s) {
    if (!world.overlapAABB) return true;
    const c = this._ic ?? (this._ic = { x: 0, y: 0, z: 0 }), hh = this._ih ?? (this._ih = { x: 0, y: 0, z: 0 });
    c.x = (s.x0 + s.x1) / 2; c.y = (s.bot + s.top) / 2; c.z = (s.z0 + s.z1) / 2;
    hh.x = (s.x1 - s.x0) / 2 + 0.15; hh.y = Math.max(0.01, (s.top - s.bot) / 2 - 0.06); hh.z = (s.z1 - s.z0) / 2 + 0.15;
    for (const o of world.overlapAABB(c, hh)) {
      if (o !== s && o.solid && !o.camIgnore && !o.oneWay && !o.fromBelowOnly && !o.trigger) return false;
    }
    return true;
  }

  /** Einheitsvektor vom Ziel zur Kamera. */
  offsetDir(r, out) {
    const pitch = r.pitch * DEG, yaw = r.yaw * DEG + this.userYaw * DEG;
    return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  }

  place(r, dt) {
    const cam = this.camera;
    const dir = this.offsetDir(r, this._a);
    cam.position.copy(this.target).addScaledVector(dir, this.distNow);
    if (this.shakeAmt > 0.001) {
      cam.position.x += (Math.random() - 0.5) * this.shakeAmt;
      cam.position.y += (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt = damp(this.shakeAmt, 0, 10, dt || 0.016);
    }
    cam.lookAt(this.target);
    if (Math.abs(cam.fov - r.fov) > 0.01) { cam.fov = r.fov; cam.updateProjectionMatrix(); }
  }

  info() {
    return { pitch: +this.cur.pitch?.toFixed(2), dist: +this.distNow.toFixed(2), yaw: +(this.cur.yaw + this.userYaw).toFixed(2), zoom: this.zoomIndex, target: this.target.toArray().map((v) => +v.toFixed(2)), group: +this.groupZoom.toFixed(3), spread: +this.spread.toFixed(2) };
  }
}
