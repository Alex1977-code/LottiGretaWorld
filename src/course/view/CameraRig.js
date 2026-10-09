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

import * as THREE from 'three';

export const CAM_DEFAULT = { pitch: 45, dist: 13, yaw: 0, fov: 38, x: null, xLock: 1, height: 1.0, lead: 1, ahead: 2.0 };
const BLEND = 8;
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
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._h = new THREE.Vector3();
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
    this.lead.set(0, 0, 0);
    this.anchorY = player.pos.y;
    const r = this.railAt(player.pos.x, player.pos.z, this.cur);
    this.userYaw = this.userYawTarget;
    this.zoom = ZOOMS[this.zoomIndex];
    this.powerZoom = player.powerDef?.camZoom ?? 1;
    const yaw = (r.yaw + this.userYaw) * DEG;
    this.target.set(this.lockedX(player.pos.x - Math.sin(yaw) * r.ahead, r), player.pos.y + r.height, player.pos.z - Math.cos(yaw) * r.ahead);
    this.distNow = r.dist * this.zoom * this.powerZoom;
    this.place(r, 0);
  }

  lockedX(px, r) { return r.lockX === null || r.lockX === undefined ? px : px + (r.lockX - px) * r.lockW; }

  update(dt, player, world) {
    // Archetyp mit eigener Kamera (z. B. Diorama-Orbit): setzt Kamera selbst und gibt true zurück
    if (this.custom && this.custom(dt, player, world)) return;
    const p = player.pos;
    const r = this.railAt(p.x, p.z, this.cur);
    this.userYaw = damp(this.userYaw, this.userYawTarget, 6, dt);
    this.zoom = damp(this.zoom, ZOOMS[this.zoomIndex], 5, dt);
    this.powerZoom = damp(this.powerZoom, player.powerDef?.camZoom ?? 1, 2.5, dt);
    const frozen = player.dead && player.deathCause === 'fall';
    if (!frozen) {
      // Vorausschau in Bewegungsrichtung (weich, begrenzt)
      const lx = Math.max(-3.2, Math.min(3.2, player.vel.x * 0.3)) * r.lead;
      const lz = Math.max(-3.2, Math.min(3.2, player.vel.z * 0.3)) * r.lead;
      this.lead.x = damp(this.lead.x, lx, 2.2, dt);
      this.lead.z = damp(this.lead.z, lz, 2.2, dt);
      // Senkrecht: an der Standhöhe verankert, folgt nur bei deutlichem Steigen/Fallen
      const standing = player.mode === 'ground' || player.mode === 'wall' || player.mode === 'stalk' || player.mode === 'swim' || player.mode === 'script';
      if (standing) this.anchorY = damp(this.anchorY, p.y, 6, dt);
      else if (p.y > this.anchorY + 2.6) this.anchorY = p.y - 2.6;
      else if (p.y < this.anchorY - 0.5) this.anchorY = p.y + 0.5;
      const yaw = (r.yaw + this.userYaw) * DEG;
      const tx = this.lockedX(p.x + this.lead.x - Math.sin(yaw) * r.ahead, r), ty = this.anchorY + r.height, tz = p.z + this.lead.z - Math.cos(yaw) * r.ahead;
      this.target.x = damp(this.target.x, tx, 8, dt);
      this.target.y = damp(this.target.y, ty, 5, dt);
      this.target.z = damp(this.target.z, tz, 8, dt);
    }
    // Kamera nicht in Geometrie: Strahl vom Kopf der Figur zur Wunschposition. Ist er verdeckt, rückt die
    // Kamera auf ihrer Achse näher ans Ziel, bis der Kopf wieder frei sichtbar ist (höchstens bis 3 m).
    const want = r.dist * this.zoom * this.powerZoom;
    let dist = want;
    if (world && !frozen) {
      const dir = this.offsetDir(r, this._a);
      const head = this._h.set(p.x, p.y + player.half.y * 2 + 0.15, p.z);
      for (let k = 0; k < 8; k++) {
        const d = want * (1 - k * 0.11);
        const end = this._b.copy(this.target).addScaledVector(dir, d);
        if (!world.raycast(head, end)) { dist = d; break; }
        dist = Math.max(3, d);
      }
    }
    this.distNow = dist < this.distNow ? damp(this.distNow, dist, 18, dt) : damp(this.distNow, dist, 3, dt);
    this.place(r, dt);
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
    return { pitch: +this.cur.pitch?.toFixed(2), dist: +this.distNow.toFixed(2), yaw: +(this.cur.yaw + this.userYaw).toFixed(2), zoom: this.zoomIndex, target: this.target.toArray().map((v) => +v.toFixed(2)) };
  }
}
