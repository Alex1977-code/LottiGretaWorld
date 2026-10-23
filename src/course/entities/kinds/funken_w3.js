// Elektro-Gegner Welt 3 (3-7 Schalttafeln): Funkenläufer und Funkenkäfer.
//
// funkenlaeufer – leuchtende Elektrokugel, saust unermüdlich an Blockkanten und Schienen entlang: auf einer Bahn
//   (path / rail, Runde ab 3 Punkten), rund um den oberen Rand eines Blocks (block: { pos, size } – pos = Mitte der
//   Unterseite wie bei Bausteinen) oder im Kreis (center + radius). Unverwundbar: Draufspringen, Feuer, Krallen …
//   prallen ab; nur Funkelstern und Riesentrank vertreiben ihn. Jede Berührung verletzt (auch von oben).
//   Mit count > 1 laufen mehrere hintereinander (Abstand spacing m entlang der Bahn).
//   Daten: { kind: 'funkenlaeufer', path?|rail?: [[x,y,z], …] (y = Unterkante = Laufebene), loop?, block?: { pos, size },
//            center?, radius?: 2.5, cw?: false, speed?: 3, phase?: 0..1, count?: 1, spacing?: 2, wait?: 0 (Pendel) }
//   Zustände: run | flipped. Laufzeit: s (Bahnweg). Modell 'funkenlaeufer' (state { anim: run|idle, speed }).
//
// funkenkaefer – fliegender Käfer mit Glühbirnen-Hinterleib: fliegt auf einer Bahn (path, y = Flughöhe), kreist um
//   center oder schwebt an pos. Ist eine Figur in Sichtweite (waagerecht sight, unter ihm), lädt er auf (charge 0,6 s:
//   Birne blitzt, Fühler knistern) und **stürzt sich** geradlinig auf ihre Stelle (dive m/s, ≤ 1,2 s, endet an
//   fester Geometrie), schwebt kurz und kehrt zur Bahn zurück (cooldown s Pause). Draufspringen besiegt ihn (fällt
//   herunter), ebenso Feuer, Krallen, Panzer, Wurf, Rutschen, Schwanzhieb, Kanone … Seitliche Berührung und der
//   Sturzflug verletzen.
//   Daten: { kind: 'funkenkaefer', pos?, path?, loop?, center?, radius?: 2.5, speed?: 2.2, sight?: 6, dive?: 8.5,
//            charge?: 0.6, cooldown?: 2.0, phase?: 0..1, wake?, drop? }
//   Zustände: fly → charge → dive → recover (0,4 s) → back → fly …; squashed | flipped. Laufzeit: dives.
//   Modell 'funkenkaefer' (state { anim: fly|charge|squashed }).

import * as THREE from 'three';
import { EnemyW2, activeFigure } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;

function circlePath(c, r, n = 24, cw = false) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU * (cw ? -1 : 1);
    pts.push([c[0] + Math.cos(a) * r, c[1], c[2] - Math.sin(a) * r]);
  }
  return pts;
}

/** Rand der Oberseite eines Blocks (pos = Mitte der Unterseite, size [w, h, d]) als Runde. */
function blockPath(b, cw = false) {
  const [x, y, z] = b.pos, [w, h, d] = b.size ?? [2, 1, 2];
  const t = y + h, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const pts = [[x0, t, z1], [x1, t, z1], [x1, t, z0], [x0, t, z0]];
  return cw ? pts.reverse() : pts;
}

// =====================================================================================================================
// Funkenläufer
// =====================================================================================================================
class Funkenlaeufer extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'funkenlaeufer');
    this.half.set(0.28, 0.3, 0.28);
    this.shadow = 0.3;
    this.speed = spec.speed ?? 3;
    this.wake = 0;
    this.state = 'run';
    this.mover = null;
    let pts = spec.path ?? spec.rail ?? null, loop = spec.loop;
    if (spec.block) { pts = blockPath(spec.block, !!spec.cw); loop = true; }
    else if (spec.center) { pts = circlePath(spec.center, spec.radius ?? 2.5, 28, !!spec.cw); loop = true; }
    if (pts?.length >= 2) {
      this.mover = new PathMover(pts, { speed: this.speed, mode: (loop ?? pts.length >= 3) ? 'loop' : 'pingpong', wait: spec.wait ?? 0, phase: (((spec.phase ?? 0) % 1) + 1) % 1 });
      const p = this.mover.pos; this.pos.set(p.x, p.y, p.z);
    }
    if (level.view) this.setModel(getModel('funkenlaeufer'));
  }

  get s() { return this.mover?.s ?? 0; }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    if (!this.mover) return;
    const x0 = this.pos.x, z0 = this.pos.z;
    this.mover.step(dt);
    const p = this.mover.pos;
    this.pos.set(p.x, p.y, p.z);
    const dx = p.x - x0, dz = p.z - z0;
    if (dx * dx + dz * dz > 1e-9) this.yaw = Math.atan2(-dz, dx);
  }

  onPlayer() { return this.defeated ? 'none' : 'hurt'; }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'mega' || kind === 'star') this.flip(source, 7);
    else if (kind !== 'bump' && kind !== 'pound') { this.level.effects?.sparks(this.center(), 4); }
  }

  modelState() { return { anim: this.state === 'run' ? 'run' : 'idle', speed: this.speed }; }

  info() { return { state: this.state, s: +this.s.toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

function makeLaeufer(level, spec) {
  const n = Math.max(1, Math.round(spec.count ?? 1));
  const first = new Funkenlaeufer(level, { ...spec, count: 1 });
  if (n > 1 && first.mover) {
    const L = first.mover.length || 1, sp = spec.spacing ?? 2;
    for (let i = 1; i < n; i++) level.spawn('funkenlaeufer', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, phase: (spec.phase ?? 0) - (i * sp) / L });
  }
  return first;
}

// =====================================================================================================================
// Funkenkäfer
// =====================================================================================================================
class Funkenkaefer extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'funkenkaefer');
    this.half.set(0.3, 0.32, 0.3);
    this.shadow = 0.35;
    this.speed = spec.speed ?? 2.2;
    this.sight = spec.sight ?? 6;
    this.diveSpeed = spec.dive ?? 8.5;
    this.chargeT = spec.charge ?? 0.6;
    this.coolTime = spec.cooldown ?? 2.0;
    this.cool = 0.8;
    this.dives = 0;
    this.mover = null;
    this.circle = null;
    if (spec.path?.length >= 2) {
      this.mover = new PathMover(spec.path, { speed: this.speed, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.2, phase: spec.phase ?? 0 });
    } else if (spec.center) {
      const c = spec.center;
      this.circle = { x: c[0], y: c[1], z: c[2], r: spec.radius ?? 2.5, a: (spec.phase ?? 0) * TAU };
    }
    this.home = new THREE.Vector3();
    this.homeAt(0);
    this.pos.copy(this.home);
    this.aim = new THREE.Vector3();
    this.state = 'fly';
    if (level.view) this.setModel(getModel('funkenkaefer'));
  }

  homeAt(dt) {
    if (this.mover) { if (dt) this.mover.step(dt); const p = this.mover.pos; this.home.set(p.x, p.y, p.z); }
    else if (this.circle) {
      const c = this.circle;
      c.a += (this.speed / c.r) * dt;
      this.home.set(c.x + Math.cos(c.a) * c.r, c.y, c.z - Math.sin(c.a) * c.r);
    } else if (!dt) this.home.copy(this.pos);
    return this.home;
  }

  update(dt) {
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    if (this.state === 'squashed') {
      this.vel.x = 0; this.vel.z = 0;
      this.moveWithGravity(dt);
      if ((this.grounded && this.stateT > 0.35) || this.stateT > 1.6) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    const p = this.player;
    switch (this.state) {
      case 'fly': {
        const ox = this.pos.x, oz = this.pos.z;
        this.homeAt(dt);
        this.pos.set(this.home.x, this.home.y + Math.sin(this.level.time * 3.5) * 0.06, this.home.z);
        const dx = this.pos.x - ox, dz = this.pos.z - oz;
        if (dx * dx + dz * dz > 1e-8) this.faceToward(dx, dz, dt, 8);
        if (this.cool <= 0 && activeFigure(p) && this.canSee(this.sight, 9) && p.pos.y < this.pos.y + 0.6) { this.setState('charge'); this.level.sfx('beep'); }
        break;
      }
      case 'charge':
        this.facePlayer(dt, 12);
        if (this.stateT > this.chargeT) this.startDive();
        break;
      case 'dive': {
        this.pos.addScaledVector(this.aim, this.diveSpeed * dt);
        const hit = this.level.world.overlapAABB(this.center(), this.half, { filter: (s) => s.solid && !s.oneWay });
        if (hit.length || this.stateT > 1.2) {
          if (hit.length) this.pos.addScaledVector(this.aim, -this.diveSpeed * dt);
          this.level.effects?.sparks(this.center(), 6);
          this.setState('recover');
        }
        break;
      }
      case 'recover':
        if (this.stateT > 0.4) this.setState('back');
        break;
      case 'back': {
        const dx = this.home.x - this.pos.x, dy = this.home.y - this.pos.y, dz = this.home.z - this.pos.z;
        const d = Math.hypot(dx, dy, dz), step = 4 * dt;
        if (d <= step) { this.pos.copy(this.home); this.setState('fly'); this.cool = this.coolTime; }
        else { this.pos.x += (dx / d) * step; this.pos.y += (dy / d) * step; this.pos.z += (dz / d) * step; this.faceToward(dx, dz, dt, 8); }
        break;
      }
      default: break;
    }
  }

  startDive() {
    const p = this.player;
    if (!activeFigure(p)) { this.setState('back'); return; }
    const c = this.center();
    this.aim.set(p.pos.x - c.x, p.pos.y + p.half.y - c.y, p.pos.z - c.z).normalize();
    if (this.aim.y > -0.12) { this.aim.y = -0.12; this.aim.normalize(); }
    this.faceToward(this.aim.x, this.aim.z, 1, 1);
    this.dives++;
    this.setState('dive');
    this.level.sfx('dive');
  }

  onStomp() {
    if (this.defeated) return;
    this.squash(1.6);
    this.state = 'squashed';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.8) return;
    this.flip(source);
  }

  modelState() {
    const s = this.state;
    if (s === 'charge') return { anim: 'charge' };
    if (s === 'squashed' || s === 'flipped') return { anim: 'squashed' };
    return { anim: 'fly' };
  }

  info() { return { state: this.state, dives: this.dives, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

export const KINDS = {
  funkenlaeufer: makeLaeufer,
  funkenkaefer: (level, spec) => new Funkenkaefer(level, spec),
};
