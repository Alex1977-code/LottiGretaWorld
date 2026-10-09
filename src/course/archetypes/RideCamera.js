// Kamera des Reit-Levels (Archetyp `ride`, Haken camera): Verfolgerkamera hinter dem Floß entlang der mittleren
// Fließrichtung der nächsten ~26 m (RideController.camYaw, in Simulationsschritten geglättet – im Zickzack mittelt
// sie die Kehren heraus, in Kurven schwenkt sie mit). Neigung/Abstand/Blickhöhe/Vorausschau aus LEVEL.camera
// (CameraRig.railAt), Q/E und Zoom wie im Standard. Beim Sturz über die Klippe (player.plunging) steil von oben und
// weiter weg, folgt der Figur senkrecht. Setzt rig.target (Sonne/Schattenbereich folgen).

import * as THREE from 'three';

const DEG = Math.PI / 180;
const ZOOMS = [1, 0.74];
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class RideCamera {
  constructor(view) {
    this.view = view;
    this.rig = view.rig;
    this.target = new THREE.Vector3();
    this.lead = new THREE.Vector3();
    this.last = new THREE.Vector3();
    this.r = {};
    this.inited = false;
    this.yaw = 0; this.pitch = 42; this.dist = 13; this.anchorY = 0;
  }

  /** Gier der Steuerung (rad) für die Simulation: Floß-Kamera + Schiene + Spielerdrehung (Zielwerte). */
  controlYaw(p) {
    const r = this.rig.railAt(p.pos.x, p.pos.z, this._r ?? (this._r = {}));
    return (p.camYaw ?? 0) + (r.yaw + this.rig.userYawTarget) * DEG;
  }

  update(dt, p) {
    const rig = this.rig, cam = this.view.camera;
    const r = rig.railAt(p.pos.x, p.pos.z, this.r);
    rig.userYaw = damp(rig.userYaw, rig.userYawTarget, 6, dt);
    rig.zoom = damp(rig.zoom, ZOOMS[rig.zoomIndex], 5, dt);
    const snap = !this.inited || this.last.distanceTo(p.pos) > 9 || dt <= 0;
    this.inited = true;
    const wantYaw = (p.camYaw ?? 0) + (r.yaw + rig.userYaw) * DEG;
    let pitch = r.pitch, dist = r.dist * rig.zoom, ahead = r.ahead;
    if (p.plunging) { pitch = 64; dist = r.dist * 1.3; ahead = 0.5; }
    if (snap) {
      this.yaw = wantYaw; this.pitch = pitch; this.dist = dist; this.anchorY = p.pos.y; this.lead.set(0, 0, 0);
    } else {
      this.yaw += wrap(wantYaw - this.yaw) * (1 - Math.exp(-5 * dt));
      this.pitch = damp(this.pitch, pitch, p.plunging ? 1.8 : 3, dt);
      this.dist = damp(this.dist, dist, 2.5, dt);
    }
    // senkrecht: auf dem Wasser/zu Fuß folgen, beim Hüpfen ruhig bleiben, beim Absturz mitfallen
    const standing = p.mode === 'ground' || p.mode === 'swim' || p.mode === 'script' || p.mode === 'wall' || p.mode === 'stalk' || p.plunging;
    if (snap) this.anchorY = p.pos.y;
    else if (standing) this.anchorY = damp(this.anchorY, p.pos.y, p.plunging ? 9 : 5, dt);
    else if (p.pos.y > this.anchorY + 2.6) this.anchorY = p.pos.y - 2.6;
    else if (p.pos.y < this.anchorY - 0.6) this.anchorY = p.pos.y + 0.6;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const lx = clamp(p.vel.x * 0.18, -2.2, 2.2) * r.lead, lz = clamp(p.vel.z * 0.18, -2.2, 2.2) * r.lead;
    this.lead.x = damp(this.lead.x, lx, 2, dt); this.lead.z = damp(this.lead.z, lz, 2, dt);
    const tx = p.pos.x + fx * ahead + this.lead.x, ty = this.anchorY + r.height, tz = p.pos.z + fz * ahead + this.lead.z;
    if (snap) this.target.set(tx, ty, tz);
    else {
      this.target.x = damp(this.target.x, tx, 8, dt);
      this.target.y = damp(this.target.y, ty, p.plunging ? 10 : 5, dt);
      this.target.z = damp(this.target.z, tz, 8, dt);
    }
    const pr = this.pitch * DEG;
    cam.position.set(
      this.target.x + Math.sin(this.yaw) * Math.cos(pr) * this.dist,
      this.target.y + Math.sin(pr) * this.dist,
      this.target.z + Math.cos(this.yaw) * Math.cos(pr) * this.dist,
    );
    if (rig.shakeAmt > 0.001) {
      cam.position.x += (Math.random() - 0.5) * rig.shakeAmt;
      cam.position.y += (Math.random() - 0.5) * rig.shakeAmt;
      rig.shakeAmt = damp(rig.shakeAmt, 0, 10, dt || 0.016);
    }
    cam.lookAt(this.target);
    if (Math.abs(cam.fov - r.fov) > 0.01) { cam.fov = r.fov; cam.updateProjectionMatrix(); }
    rig.target.copy(this.target);
    rig.distNow = this.dist;
    Object.assign(rig.cur, r);
    this.last.copy(p.pos);
  }

  info() { return { yaw: +(this.yaw / DEG).toFixed(1), pitch: +this.pitch.toFixed(1), dist: +this.dist.toFixed(2) }; }
}
