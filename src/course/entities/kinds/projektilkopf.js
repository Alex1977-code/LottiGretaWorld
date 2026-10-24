// Projektilkopf und Suchkopf (Bauplan Welt 2: „fliegt gerade / folgt Spieler“, Konter: ausweichen, draufspringen).
//
// projektilkopf: fliegt waagerecht geradeaus (speed m/s) – über Lücken, durch Einweg-Plattformen hindurch – und
//   zerplatzt an Wänden/Boden oder nach life s. Draufspringen: Abprall (hoch mit gehaltener Sprungtaste – Sprungbrett
//   über Lücken), der Kopf kippt mit der Nase nach unten und stürzt ab (besiegt). Mit ride: true trägt er eine
//   Einweg-Oberseite: man landet auf ihm, reitet mit und springt von ihm ab; erst die Stampfattacke wirft ihn ab.
//   Seitlich/vorn = Treffer. Krallen, Panzer, Wurf, Biss (Topfpflanze), Explosion, Kanonenkugel, Riesentrank,
//   Funkelstern besiegen ihn; Feuerbälle, Stampfwellen und POW prallen ab.
// suchkopf: wie projektilkopf (ohne ride), lenkt aber seek s lang zur nächsten Figur (turn rad/s, auch in der Höhe),
//   danach geht ihm der Antrieb aus: er stürzt ab und zerplatzt am Boden.
//
// Daten: { kind: 'projektilkopf' | 'suchkopf', pos: [x, y, z] (Unterkante; Mitte = y + 0,33), dir?: [dx, dz] | yaw,
//          speed?: 5.5 (Such 4.2), life?: 10 (Such 8) s, seek?: 4 s, turn?: 1.8 rad/s, ride?: false,
//          owner? (Kanone: deren Formen werden ignoriert), drop?,
//          breaks?: false | true | r (Welt 5: zertrümmert beim Aufprall Ziegel/Steinblöcke im Umkreis r, Standard 0,9 m) }
//   Beispiel: { kind: 'projektilkopf', pos: [-10, 2, -40], dir: [1, 0], ride: true, speed: 4 }
// Zustände: fly (die ersten 0,4 s Startflamme) → fall (abgestürzt/besiegt) | burst. Laufzeit: age.
// Modelle 'projektilkopf' / 'suchkopf' (state { anim: fly|launch|fall|seek }).

import { EnemyW2, wrapAngle, activeFigure } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const CY = 0.33;

class Projektil extends EnemyW2 {
  constructor(level, spec, seek) {
    super(level, spec, seek ? 'suchkopf' : 'projektilkopf');
    this.seeker = seek;
    this.half.set(0.42, CY, 0.42);
    this.shadow = 0.38;
    this.wake = 0;
    this.edges = false;
    this.speed = spec.speed ?? (seek ? 4.2 : 5.5);
    this.life = spec.life ?? (seek ? 8 : 10);
    this.seekTime = spec.seek ?? 4;
    this.turnRate = spec.turn ?? 1.8;
    this.owner = spec.owner ?? null;
    this.ride = !seek && !!spec.ride;
    this.age = 0;
    this.state = 'fly';
    this.pitch = 0;
    this.burst = false;
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    this._ign = (s) => s.owner === this || (this.owner && s.owner === this.owner) || !!s.oneWay;
    this.shapeId = null;
    if (this.ride) {
      this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
      this.shapeId = this.addShape({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], oneWay: true, mover: this.mover, camIgnore: true, tag: 'projektilkopf' });
      this.syncShape();
    }
    if (level.view) this.setModel(getModel(this.kind));
    this.initShadows(1);
  }

  syncShape() {
    const sh = this.shapeId !== null ? this.level.world.get(this.shapeId) : null;
    if (!sh) return;
    const p = this.pos;
    sh.min = [p.x - 0.45, p.y + 0.45, p.z - 0.45];
    sh.max = [p.x + 0.45, p.y + CY * 2, p.z + 0.45];
    this.level.world.update(this.shapeId);
  }

  update(dt) {
    this.stateT += dt;
    this.age += dt;
    if (this.state === 'fall') { this.fallStep(dt); return; }
    if (this.updateDefeat(dt)) return;
    if (this.age > this.life) { this.pop(false); return; }
    if (this.seeker) {
      if (this.age < this.seekTime) this.steer(dt);
      else { this.startFall(false); return; }
    }
    const x0 = this.pos.x, y0 = this.pos.y, z0 = this.pos.z;
    this.dir.x = Math.cos(this.yaw); this.dir.z = -Math.sin(this.yaw);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.dir.x * this.speed * dt, y: this.vel.y * dt, z: this.dir.z * this.speed * dt }, { step: 0, ignore: this._ign });
    this.pos.set(c.x, c.y - CY, c.z);
    if (res.hitWall || res.ceiling || (res.grounded && this.vel.y < -0.01)) { this.pop(true); return; }
    if (this.pos.y < this.level.killY) { this.kill(); return; }
    if (this.mover) {
      const m = this.mover;
      m.dx = this.pos.x - x0; m.dy = this.pos.y - y0; m.dz = this.pos.z - z0;
      m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt;
      this.syncShape();
    }
  }

  /** Suchkopf: Gier und Höhe zur nächsten Figur nachführen. */
  steer(dt) {
    const p = this.player;
    if (!activeFigure(p)) { this.vel.y = 0; return; }
    const want = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
    const d = wrapAngle(want - this.yaw);
    const m = this.turnRate * dt;
    this.yaw += Math.max(-m, Math.min(m, d));
    const dy = p.pos.y + p.half.y - (this.pos.y + CY);
    this.vel.y = Math.max(-1.5, Math.min(1.5, dy * 2));
  }

  /** Absturz (Antrieb aus bzw. besiegt): Nase nach unten, Schwerkraft, zerplatzt am Boden. */
  startFall(defeated) {
    if (defeated) this.markDefeated();
    this.setState('fall');
    this.touch = false;
    this.removeShapes();
    this.shapeId = null;
    this.vel.set(this.dir.x * this.speed * 0.35, defeated ? 2 : 0, this.dir.z * this.speed * 0.35);
  }

  fallStep(dt) {
    this.vel.y = Math.max(this.vel.y - 30 * dt, -20);
    this.pitch = Math.min(1.3, this.pitch + dt * 3);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0, ignore: this._ign });
    this.pos.set(c.x, c.y - CY, c.z);
    if (res.grounded || res.hitWall || this.stateT > 3 || this.pos.y < this.level.killY) this.pop(true);
  }

  /** Zerplatzen (Wand, Boden, Lebensende). */
  pop(fx) {
    if (this.removed) return;
    this.burst = true;
    if (fx && this.spec.breaks) this.smash();
    if (fx) {
      this.level.effects?.sparks(this.center(), 10);
      this.level.effects?.dust(this.pos, 5, 1.1);
      this.level.sfx('blockhit');
    }
    this.kill();
  }

  /**
   * Welt 5 (5-7, breaks): beim Aufprall zertrümmert der Kopf Zerbrechliches im Umkreis (breakable/mega: Ziegel, graue
   * Steinblöcke, lila Ziegel …) wie eine kleine Explosion – onHit('bomb', kopf, form); kopf.blast = { x, y, z, r }.
   */
  smash() {
    const c = this.center(), r = Number(this.spec.breaks) > 0 ? Number(this.spec.breaks) : 0.9;
    this.blast = { x: c.x, y: c.y, z: c.z, r };
    const done = new Set();
    for (const s of this.level.world.overlapAABB(c, { x: r + 0.25, y: r + 0.25, z: r + 0.25 })) {
      const o = s.owner;
      if (!o || o === this || o === this.owner || done.has(o) || !(s.breakable || s.mega)) continue;
      done.add(o);
      o.onHit?.('bomb', this, s);
    }
  }

  /** Steht eine Figur auf dem Reit-Kopf? */
  riding(player) { return this.ride && player.mode === 'ground' && player.ground?.owner === this; }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'fall') return 'none';
    if (this.riding(player)) {
      if (contact.pound || player.state === 'groundpound') { this.startFall(true); this.level.sfx('stomp'); }
      return 'none';
    }
    if (this.ride && player.pos.y >= this.pos.y + CY * 2 - 0.12 && player.vel.y <= 0.5) return 'none';
    if (contact.pound) { this.startFall(true); return 'none'; }
    if (contact.fromAbove) { this.startFall(true); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'fall') return;
    if (kind === 'fire' || kind === 'pound' || kind === 'bump') return;
    this.level.effects?.sparks(this.center(), 8);
    this.startFall(true);
  }

  modelState() {
    if (this.state === 'fall') return { anim: 'fall' };
    if (this.age < 0.4) return { anim: 'launch' };
    return { anim: this.seeker ? 'seek' : 'fly' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    if (this.state === 'fall') { r.rotation.z = -this.pitch; r.position.y += Math.sin(this.pitch) * 0.2; }
    else r.rotation.z = Math.atan2(this.vel.y, this.speed) * 0.8;
  }

  info() { return { state: this.state, age: +this.age.toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), yaw: +this.yaw.toFixed(3), defeated: this.defeated }; }
}

export const KINDS = {
  projektilkopf: (level, spec) => new Projektil(level, spec, false),
  suchkopf: (level, spec) => new Projektil(level, spec, true),
};
