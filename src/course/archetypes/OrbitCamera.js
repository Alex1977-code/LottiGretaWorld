// Orbit-Kamera der Rätsel-Dioramen (Archetyp `diorama`, Haken camera; Präzisierung Ritt/Diorama).
// Kreist frei (360°) um den Diorama-Mittelpunkt, schaut schräg von oben auf den ganzen Würfel und folgt der Figur
// leicht. Zwei Zoomstufen: 0 = Überblick (ganzer Würfel), 1 = nah (folgt der Figur stärker).
//
// Steuerung (der Archetyp speist sie in Simulationsschritten ein – deterministisch für Tests):
//   rotate(dirDegPerSec · dt)  stufenlos: Q/E gehalten bzw. ⟲ ⟳ gehalten (100°/s), Wischen rechts (0,4°/Pixel)
//   tilt(deg)                  Neigung 24°–70° (senkrechtes Wischen)
//   toggleZoom()               Z bzw. ⊕
// Gier wie CameraRig: 0 = Kamera bei +Z mit Blick nach −Z, positiv = Kamera nach +X; controlYaw() = Gier in rad
// (Steuerung relativ zur Kamera). Setzt rig.target (Sonne/Schattenbereich folgen).

import * as THREE from 'three';

const DEG = Math.PI / 180;
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));

export class OrbitCamera {
  /**
   * @param {object} view CourseView
   * @param {{ center: number[], yaw?: number, pitch?: number, dist?: number[], follow?: number[], fov?: number }} cfg
   */
  constructor(view, cfg = {}) {
    this.view = view;
    this.rig = view.rig;
    const c = cfg.center ?? [0, 0, 0];
    this.center = new THREE.Vector3(c[0], c[1], c[2]);
    this.yaw = cfg.yaw ?? 25;            // Grad (Simulation)
    this.pitch = cfg.pitch ?? 44;
    this.dists = cfg.dist ?? [34, 19];   // Überblick / nah
    this.follows = cfg.follow ?? [0.35, 0.8];
    this.fov = cfg.fov ?? 40;
    this.zoom = 0;
    this.cur = { yaw: this.yaw, pitch: this.pitch, dist: this.dists[0], follow: this.follows[0] };
    this.target = new THREE.Vector3().copy(this.center);
    this.inited = false;
    this.focus = null;                   // Siegesablauf: Kamera rückt an die Figur
  }

  rotate(deg) { this.yaw = ((this.yaw + deg) % 360 + 540) % 360 - 180; }
  tilt(deg) { this.pitch = Math.max(24, Math.min(70, this.pitch + deg)); }
  toggleZoom() { this.zoom = (this.zoom + 1) % this.dists.length; }
  setYaw(deg) { this.yaw = ((deg % 360) + 540) % 360 - 180; }
  controlYaw() { return this.yaw * DEG; }

  update(dt, player) {
    const cam = this.view.camera;
    const snap = !this.inited || dt <= 0;
    this.inited = true;
    const k = snap ? 1 : 1 - Math.exp(-10 * dt);
    // kürzester Weg um den Kreis
    let dy = this.yaw - this.cur.yaw;
    dy = ((dy % 360) + 540) % 360 - 180;
    this.cur.yaw += dy * k;
    this.cur.pitch += (this.pitch - this.cur.pitch) * k;
    const wantDist = this.focus ? this.dists[1] * 0.75 : this.dists[this.zoom];
    const wantFollow = this.focus ? 1 : this.follows[this.zoom];
    this.cur.dist = snap ? wantDist : damp(this.cur.dist, wantDist, 4, dt);
    this.cur.follow = snap ? wantFollow : damp(this.cur.follow, wantFollow, 4, dt);
    const p = player.pos;
    const f = this.cur.follow;
    const tx = this.center.x + (p.x - this.center.x) * f;
    const ty = this.center.y + (p.y + 0.6 - this.center.y) * f;
    const tz = this.center.z + (p.z - this.center.z) * f;
    if (snap) this.target.set(tx, ty, tz);
    else { this.target.x = damp(this.target.x, tx, 5, dt); this.target.y = damp(this.target.y, ty, 4, dt); this.target.z = damp(this.target.z, tz, 5, dt); }
    const yr = this.cur.yaw * DEG, pr = this.cur.pitch * DEG, d = this.cur.dist;
    cam.position.set(this.target.x + Math.sin(yr) * Math.cos(pr) * d, this.target.y + Math.sin(pr) * d, this.target.z + Math.cos(yr) * Math.cos(pr) * d);
    const rig = this.rig;
    if (rig.shakeAmt > 0.001) {
      cam.position.x += (Math.random() - 0.5) * rig.shakeAmt;
      cam.position.y += (Math.random() - 0.5) * rig.shakeAmt;
      rig.shakeAmt = damp(rig.shakeAmt, 0, 10, dt || 0.016);
    }
    cam.lookAt(this.target);
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
    rig.target.copy(this.target);
    rig.distNow = d;
  }

  info() { return { yaw: +this.yaw.toFixed(2), shown: +this.cur.yaw.toFixed(2), pitch: +this.pitch.toFixed(1), zoom: this.zoom, dist: +this.cur.dist.toFixed(2) }; }
}
