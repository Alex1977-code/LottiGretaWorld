// Rollbarer Schneeball (Präzisierung Motor Welt 3; Bauplan 3-1 „Schneelandschaft; rollbare Schneebälle“).
// Hineinlaufen schiebt ihn an (Player.move → onPush), Angriffe (Schwanzhieb, Tatze, Faust, Panzer, Wurf, Rutschen)
// stoßen ihn kräftig weg. Er rollt mit wenig Reibung (Eis: kaum), hangabwärts schneller, wächst beim Rollen über
// Schnee (bis maxSize), besiegt Gegner, die er überrollt (onHit('throw', ball)), und zerbricht an Wänden (ab breakSpeed),
// durch Feuer, Stampfen von oben, Bombe, Riesentrank, Kanonenkugel oder im Wasser – dabei gibt er seinen Inhalt frei. Die Figur
// kann auf ihm stehen (Zylinder-Form mit mover: rollt er, trägt er sie mit).
//
// Daten (items/enemies/blocks als kind, segments als type – blocks/types/schneeball.js):
//   { kind: 'schneeball', pos: [x, y, z] (Auflagepunkt), size: 1 (Durchmesser, m), maxSize: 2,
//     grow: 'snow' (Standard: wächst auf Formen mit snow: true – Baustein schneefeld – und im Thema snow auf jedem
//           Boden außer Eis) | true (überall) | false (nie),
//     growRate: 0.06 (m Durchmesser je m Rollweg), content: 'coins:5' | 'star:1' | Power-up-Name | Aktion
//     (entities/gimmick.js; beim Zerbrechen), respawn: 0 (s – nach dem Zerbrechen wieder am Startpunkt, 0 = nie),
//     breakSpeed: 2.5 (m/s – Aufprall an einer Wand zerbricht ihn), kick: 8 (m/s nach einem Angriff), id?, hidden? }
// Laufzeit: size, rolled (m), broken, defeats (überrollte Gegner), shatter(), speed(); level.named.get(id).
// Modell: schneeball (items_w3.js, opts { size }, state { anim: 'idle' | 'roll' | 'break', roll, size }).

import { Gimmick, runAction, contentAction, visDt } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { surfaceNormal } from '../../physics/shapes.js';

const SNOW_THEMES = new Set(['snow', 'schnee', 'ice', 'eis']);
const KICK = new Set(['claw', 'punch', 'shell', 'throw', 'slide', 'bite', 'bump']);
const SHATTER = new Set(['fire', 'bomb', 'mega', 'cannon']);   // Stampfen: nur direkt von oben (onPound)
const N = { x: 0, y: 1, z: 0 };

class Snowball extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'schneeball');
    this.size0 = Math.max(0.4, spec.size ?? 1);
    this.size = this.size0;
    this.maxSize = Math.max(this.size0, spec.maxSize ?? 2);
    this.grow = spec.grow ?? 'snow';
    this.growRate = spec.growRate ?? 0.06;
    this.breakSpeed = spec.breakSpeed ?? 2.5;
    this.kickSpeed = spec.kick ?? 8;
    this.respawn = spec.respawn ?? 0;
    this.home = this.pos.clone();
    this.roll = 0;
    this.rolled = 0;
    this.broken = false;
    this.brokeT = 0;
    this.defeats = 0;
    this.shadow = this.size0 * 0.5;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
    this._touch = false;   // Berührung über die Kollisionsform (Schieben, Draufstehen)
    this.setHalf();
    this.shape = this.addSolid({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: 0.5, y0: 0, y1: 1, noStep: true, camIgnore: true, mover: this.mover, tag: 'schneeball' });
    this.placeShape();
    this.ignoreOwn = (s) => s.owner === this || !!s.quicksand || !!s.quicksandFloor;
    if (level.view) this.setModel(getModel('schneeball', { size: this.size0 }));
  }

  setHalf() {
    const r = this.size / 2;
    this.half.set(r * 0.82, r, r * 0.82);
    this.shadow = r * 0.95;
  }

  placeShape() {
    const s = this.shape, r = this.size / 2;
    s.x = this.pos.x; s.z = this.pos.z; s.r = r * 0.86; s.y0 = this.pos.y; s.y1 = this.pos.y + this.size * 0.97;
    if (this.shapes.length) this.level.world.update(s.id);
  }

  speed() { return Math.hypot(this.vel.x, this.vel.z); }

  snowy(g) {
    if (!g || g.ice || this.grow === false) return false;
    if (this.grow === true || g.snow) return true;
    return SNOW_THEMES.has(this.level.data?.theme) && !g.noSnow;
  }

  /** Gewicht: größere Bälle lassen sich schwerer anschieben/wegstoßen. */
  heft() { return 1 / (0.6 + 0.4 * this.size); }

  /** Von Player.move: Figur läuft mit speed m/s in Richtung dir hinein. */
  onPush(player, dir, speed) {
    if (this.broken || this.hidden) return;
    let dx = this.pos.x - player.pos.x, dz = this.pos.z - player.pos.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) { dx = dir.x; dz = dir.z; } else { dx /= l; dz /= l; }
    const want = Math.min(10, (Math.max(speed, player.hSpeed()) * 1.12 + 0.6) * this.heft());
    const along = this.vel.x * dx + this.vel.z * dz;
    if (along < want) { this.vel.x += dx * (want - along); this.vel.z += dz * (want - along); }
    this.pushes = (this.pushes ?? 0) + 1;
  }

  onHit(kind, source) {
    if (this.broken || this.hidden) return;
    if (SHATTER.has(kind)) { this.shatter(); return; }
    if (!KICK.has(kind) || !source?.pos) return;
    let dx = this.pos.x - source.pos.x, dz = this.pos.z - source.pos.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) { const f = source.facingVec?.() ?? { x: 1, z: 0 }; dx = f.x; dz = f.z; } else { dx /= l; dz /= l; }
    const v = this.kickSpeed * this.heft();
    this.vel.x = dx * v; this.vel.z = dz * v;
    this.vel.y = Math.max(this.vel.y, 2);
    this.grounded = false;
    this.level.sfx('snowball');
  }

  /** Von oben gestampft (Player.land) → zerplatzt. */
  onPound() { this.shatter(); }

  /** Zerbrechen: Form weg, Inhalt frei, Modell 'break'; mit respawn später wieder am Startpunkt. */
  shatter() {
    if (this.broken) return;
    this.broken = true;
    this.brokeT = 0;
    this.vel.set(0, 0, 0);
    this.setSolid(false);
    this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + this.size * 0.5, z: this.pos.z }, 0xf4f8ff, 10);
    this.level.sfx('snowball');
    this.level.sfx('brickbreak');
    const act = contentAction(this.spec.content, null);
    if (act) runAction(this.level, act, { pos: [this.pos.x, this.pos.y + this.size * 0.5, this.pos.z], source: this });
    this.spec = { ...this.spec, content: null };   // Inhalt nur einmal
  }

  reset() {
    this.broken = false;
    this.size = this.size0;
    this.setHalf();
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.roll = 0;
    this.grounded = false;
    this.setSolid(true);
    this.placeShape();
    this.popT = 0.45;
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.size * 0.5, z: this.pos.z }, 10);
  }

  update(dt) {
    const m = this.mover;
    m.dx = m.dy = m.dz = m.vx = m.vy = m.vz = 0;
    if (this.hidden) return;
    if (this.broken) {
      this.brokeT += dt;
      if (this.brokeT > 0.9 + this.respawn && this.respawn > 0) this.reset();
      else if (this.brokeT > 0.9 && this.respawn <= 0) this.kill();
      return;
    }
    const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z;
    const g = this.grounded ? this.ground : null;
    // Plattformen tragen mit
    if (g?.mover && g.owner !== this) { this.pos.x += g.mover.dx; this.pos.y += g.mover.dy; this.pos.z += g.mover.dz; }
    // Reibung (Eis kaum, Schnee wenig) und Hang
    if (g) {
      const fr = g.ice ? 0.35 : this.snowy(g) ? 1.3 : 2.4;
      const hv = this.speed();
      if (hv > 1e-4) { const nv = Math.max(0, hv - fr * dt); this.vel.x *= nv / hv; this.vel.z *= nv / hv; }
      if (g.type === 'ramp') { const n = surfaceNormal(g, N); this.vel.x += n.x * 16 * dt; this.vel.z += n.z * 16 * dt; }
    }
    this.vel.y = Math.max(this.vel.y - 30 * dt, -24);
    if (this.grounded && this.vel.y < -2) this.vel.y = -2;
    const hv0 = this.speed();
    const vx0 = this.vel.x, vz0 = this.vel.z;
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, {
      step: Math.min(0.35, this.size * 0.25), snap: this.grounded ? 0.3 : 0, ignore: this.ignoreOwn,
    });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.grounded = res.grounded;
    this.ground = res.ground;
    if (res.grounded && this.vel.y < 0) this.vel.y = 0;
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    if (res.hitWall) {
      const n = res.wallNormal, into = -(vx0 * n.x + vz0 * n.z);
      const w = res.wallShape;
      const tall = w && !w.oneWay && w.top > this.pos.y + this.size * 0.3;
      if (into > this.breakSpeed && tall && hv0 > this.breakSpeed) { this.shatter(); return; }
      const d = this.vel.x * n.x + this.vel.z * n.z;
      if (d < 0) { this.vel.x -= n.x * d * 1.25; this.vel.z -= n.z * d * 1.25; }   // leicht abprallen
    }
    // Wasser schmilzt ihn, Absturz
    if (this.level.waterAt?.(this.pos.x, this.pos.y + this.size * 0.5, this.pos.z)) { this.shatter(); return; }
    if (this.pos.y < this.level.killY) { this.shatter(); return; }
    const hv = this.speed();
    // Gegner überrollen
    if (hv > 1.2) {
      for (const e of this.level.entities) {
        if (!e.enemy || !e.alive || e.removed || e.defeated || e.touch === false || e === this) continue;
        if (!this.overlaps(e, 0.05)) continue;
        e.onHit?.('throw', this);
        this.defeats++;
        this.level.sfx('stomp');
      }
    }
    // Rollen, Wachsen auf Schnee
    const dist = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (dist > 1e-5) {
      this.rolled += dist;
      this.roll += dist / (this.size / 2);
      if (hv > 0.2) this.yaw = Math.atan2(-this.vel.z, this.vel.x);
      if (this.grounded && this.size < this.maxSize && this.snowy(this.ground)) {
        this.size = Math.min(this.maxSize, this.size + this.growRate * dist);
        this.setHalf();
      }
    }
    this.placeShape();
    m.dx = this.pos.x - ox; m.dy = this.pos.y - oy; m.dz = this.pos.z - oz;
    m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt;
    m.cx = this.pos.x; m.cz = this.pos.z;
  }

  modelState() {
    return { anim: this.broken ? 'break' : this.speed() > 0.3 ? 'roll' : 'idle', roll: this.roll, size: this.size };
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    const m = this.model;
    if (!m) return;
    m.root.visible = !this.hidden;
    if (this.hidden) return;
    m.root.position.copy(this.pos);
    // Modell rollt um seine Querachse (+X = Rollrichtung): Blick in Rollrichtung
    m.root.rotation.y = this.yaw;
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    m.root.scale.setScalar(k < 1 ? Math.max(0.05, Math.sin(k * Math.PI * 0.5)) : 1);
    m.update?.(dt, this.modelState());
  }

  info() {
    return { x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), size: +this.size.toFixed(3), speed: +this.speed().toFixed(2), rolled: +this.rolled.toFixed(2), broken: this.broken, defeats: this.defeats };
  }
}

export const KINDS = {
  schneeball: (level, spec) => new Snowball(level, spec),
};
