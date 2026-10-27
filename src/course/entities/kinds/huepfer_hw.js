// Hüpfende Gegner der Halloween-Welt „Kürbisinsel“: Kürbling (+ Riesenkürbling) und Hexenhut-Hüpfer. Eigene Figuren.
//
// Gemeinsam: Sie bewegen sich nur in **Hüpfern** (echte Bögen mit Schwerkraft – die Trefferzone springt mit): ducken
// (0,1 s) → Bogen (Höhe height, Weite hop) → landen (0,1 s) → Pause (pause s) → nächster Hüpfer. behavior 'chase'
// (Standard ohne path): hüpft auf die nächste Figur zu, sobald sie ≤ sight m nah ist, sonst hüpft er auf der Stelle bzw.
// patrouilliert; 'patrol' (Standard mit path): Bahn hin und her bzw. dir mit Umkehr an Kanten/Wänden. An Kanten springt er
// nie hinunter (edges: false erlaubt es). Berührung von der Seite verletzt.
//
// kuerbling – hüpfender Orange-Kürbis mit Blatt-Mütze. **Draufspringen** (oder Stampfattacke, Sturzflug, Feuer, Krallen,
//   Panzer, Explosion, Stern, Riese, Kopfstoß von unten) → **zerplatzt** in Schalenstücke und Kerne (0,7 s) und lässt
//   coins Bitcoins (Standard 1) fallen; Abprall beim Draufspringen.
//   Variante **Riesenkürbling** (riese: true bzw. kind 'riesenkuerbling'; ×1,8, hp 2): der erste Treffer drückt ihn platt
//   (0,6 s, Abprall, dann hüpft er schneller weiter), der zweite lässt ihn zerplatzen – heraus springen **3 kleine
//   Kürblinge** (fliegen im Bogen nach außen und hüpfen dann los). Explosion/Stern/Riese zerplatzen ihn ganz (ohne Kleine).
//   Daten: { kind: 'kuerbling', pos, riese?: false, behavior?: 'chase' | 'patrol', sight?: 7, hop?: 1.1 (m je Hüpfer;
//            Riese 1.4), height?: 0.5 (Riese 0.7), pause?: 0.35 (Riese 0.5), coins?: 1 (Riese: 2 + je 1 von den Kleinen),
//            kids?: 3 (Riese), path?, loop?, dir?, wake?, edges?, drop?,
//            vel?: [vx, vy, vz] (startet im Flug; landet und hüpft los), fromDoor?: id | true (Süßigkeiten-Tür der
//            Bausteine: ohne vel hüpft er in Blickrichtung dir aus der Tür – 2,2 m/s vor, 5,5 m/s hoch) }
//   Zustände: idle → rest ⇄ crouch → air → land; hurt (Riese, 0,6 s); burst (0,7 s, dann weg). Art (e.kind) des Riesen:
//   'riesenkuerbling'.
//   Laufzeit: hops, hp, kids (Entitäten der Kleinen), info(). Modell 'kuerbling' (state { anim: idle|hop|squashed|burst,
//   progress, height: 0 – die Höhe kommt aus der Simulation }).
//
// hexenhut_huepfer – lila Hexenhut auf Ringelbeinen. Hüpft wie der Kürbling unter seiner großen Krempe. **Von oben trifft
//   nur, wer ihn erwischt, solange er am Boden ist** (ducken, landen, Pause) → platt (besiegt, Abprall). **In der Luft
//   federt die Krempe ab**: kein Treffer, aber ein hoher Abprall nach oben (bounce m/s, Standard 14 – zum Erreichen hoher
//   Plattformen nutzbar). Seitlich verletzt. Feuer, Krallen, Panzer, Explosion, Stern, Riese besiegen ihn immer.
//   Daten: { kind: 'hexenhut_huepfer', pos, behavior?: 'chase' | 'patrol', sight?: 7, hop?: 1.3, height?: 0.8,
//            pause?: 0.55, bounce?: 14, path?, loop?, dir?, wake?, edges?, drop?, vel?, fromDoor? }
//   Laufzeit: hops, brimBounces (Abpraller an der Krempe), info(). Modell 'hexenhut_huepfer' (state { anim:
//   idle|hop|squashed, progress, height: 0 }).

import { EnemyW2, clamp, STRONG } from '../EnemyW2.js';
import { spawnLoot } from '../Enemy.js';
import { getModel } from '../../models/index.js';

const G = 22;                       // Schwerkraft im Hüpfer (weiche Bögen)
const CROUCH = 0.1, LAND = 0.1, BURST = 0.7, HURT = 0.6;

class HwHuepfer extends EnemyW2 {
  constructor(level, spec, kind, d) {
    super(level, spec, kind);
    this.hopLen = spec.hop ?? d.hop;
    this.hopH = spec.height ?? d.height;
    this.pause = spec.pause ?? d.pause;
    this.sight = spec.sight ?? 7;
    this.behavior = spec.behavior ?? (this.path ? 'patrol' : 'chase');
    this.hops = 0;
    this.airT = 0.5;
    this.state = 'idle';
    // Start im Flug: vel bzw. aus einer Süßigkeiten-Tür (fromDoor: hüpft in Blickrichtung dir heraus)
    const v0 = Array.isArray(spec.vel) ? spec.vel : spec.fromDoor ? [this.dir.x * 2.2, 5.5, this.dir.z * 2.2] : null;
    if (v0) {
      this.vel.set(v0[0], v0[1], v0[2]);
      this.state = 'air';
      this.airT = Math.max(0.3, (2 * Math.max(1, v0[1])) / G);
      this.grounded = false;
      this.wake = Math.max(this.wake, 999);
    }
  }

  /** Bewegung in der Luft und am Boden; erledigt = true (zerplatzt, platt …). */
  hopStep(dt) {
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('rest');
        return;
      case 'rest':
        this.stand(dt);
        if (this.stateT >= this.pause) this.startHop();
        return;
      case 'crouch':
        this.stand(dt);
        if (this.stateT >= CROUCH) this.launch();
        return;
      case 'air': {
        const res = this.moveWithGravity(dt, { gravity: G, step: 0.2 });
        if (this.removed) return;
        if (res.hitWall) { this.vel.x = 0; this.vel.z = 0; if (this.behavior === 'patrol') this.turn(res); }
        if (this.grounded && this.stateT > 0.05) { this.vel.x = 0; this.vel.z = 0; this.setState('land'); this.onLand(); }
        return;
      }
      case 'land':
        this.stand(dt);
        if (this.stateT >= LAND) this.setState('rest');
        return;
      default: this.stand(dt);
    }
  }

  onLand() {}

  /** Richtung für den nächsten Hüpfer wählen (Figur bzw. Bahn), ducken. */
  startHop() {
    this.hopDir = { x: this.dir.x, z: this.dir.z, s: 1 };
    if (this.behavior === 'chase' && this.canSee(this.sight, 3)) {
      const t = this.toPlayer(this._tp ?? (this._tp = {}));
      this.dir.x = t.x; this.dir.z = t.z;
      this.hopDir = { x: t.x, z: t.z, s: Math.min(1, t.d / this.hopLen) };
    } else if (this.path) {
      // Bahn: genau auf den Wegpunkt hüpfen, dann zum nächsten
      let tp = this.path[this.target], d = Math.hypot(tp.x - this.pos.x, tp.z - this.pos.z);
      if (d < 0.3) { this.nextTarget(); tp = this.path[this.target]; d = Math.hypot(tp.x - this.pos.x, tp.z - this.pos.z); }
      if (d > 1e-3) { this.dir.x = (tp.x - this.pos.x) / d; this.dir.z = (tp.z - this.pos.z) / d; }
      this.hopDir = { x: this.dir.x, z: this.dir.z, s: Math.min(1, d / this.hopLen) };
    } else if (this.behavior === 'patrol') {
      this.hopDir = { x: this.dir.x, z: this.dir.z, s: 1 };
    } else {
      this.hopDir = { x: this.dir.x, z: this.dir.z, s: 0 };   // ohne Ziel: auf der Stelle
    }
    // Kante voraus? Patrouille dreht um, Verfolger hüpft auf der Stelle
    if (this.edges && this.hopDir.s > 0 && !this.groundAhead(this.hopDir.x, this.hopDir.z, this.hopLen * this.hopDir.s, 1.2)) {
      if (this.behavior === 'patrol' || !this.canSee(this.sight, 3)) { this.turn(); this.hopDir.x = this.dir.x; this.hopDir.z = this.dir.z; }
      if (!this.groundAhead(this.hopDir.x, this.hopDir.z, this.hopLen * this.hopDir.s, 1.2)) this.hopDir.s = 0;
    }
    this.setState('crouch');
  }

  launch() {
    const vy = Math.sqrt(2 * G * this.hopH);
    this.airT = (2 * vy) / G;
    const v = (this.hopLen * this.hopDir.s) / this.airT;
    this.vel.set(this.hopDir.x * v, vy, this.hopDir.z * v);
    this.grounded = false;
    this.hops++;
    this.setState('air');
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    this.hopStep(dt);
    if (this.state !== 'air') this.faceToward(this.dir.x, this.dir.z, dt, 8);
    else this.faceToward(this.vel.x, this.vel.z, dt, 8);
  }

  /** Modell-Fortschritt im Hüpf-Zyklus (Modell: ducken 0–0,15, Bogen 0,15–0,85, landen 0,85–1). */
  hopProgress() {
    const s = this.state;
    if (s === 'crouch') return clamp(this.stateT / CROUCH, 0, 1) * 0.15;
    if (s === 'air') return 0.15 + clamp(this.stateT / this.airT, 0, 1) * 0.7;
    if (s === 'land') return 0.85 + clamp(this.stateT / LAND, 0, 1) * 0.15;
    return null;
  }

  modelState() {
    const p = this.hopProgress();
    if (p !== null) return { anim: 'hop', progress: p, height: 0 };
    if (this.state === 'squashed') return { anim: 'squashed' };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() {
    return {
      state: this.state, hops: this.hops, defeated: this.defeated, grounded: this.grounded,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

// =====================================================================================================================
// Kürbling / Riesenkürbling
// =====================================================================================================================
class Kuerbling extends HwHuepfer {
  constructor(level, spec) {
    const riese = !!spec.riese;
    super(level, spec, riese ? 'riesenkuerbling' : 'kuerbling', riese ? { hop: 1.4, height: 0.7, pause: 0.5 } : { hop: 1.1, height: 0.5, pause: 0.35 });
    this.riese = riese;
    this.scale = riese ? 1.8 : 1;
    this.half.set(0.34 * this.scale, 0.36 * this.scale, 0.34 * this.scale);
    this.shadow = 0.42 * this.scale;
    this.maxHp = riese ? 2 : 1;
    this.hp = this.maxHp;
    this.coins = spec.coins ?? (riese ? 2 : 1);
    this.kidsN = riese ? (spec.kids ?? 3) : 0;
    this.kids = [];
    this.bursted = false;
    if (level.view) {
      this.setModel(getModel('kuerbling'));
      this.model.root.scale.setScalar(this.scale);
    }
    this.initShadows(2);
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'burst') { this.stand(dt); if (this.stateT >= BURST) this.kill(); return; }
    if (this.state === 'hurt') {
      this.stand(dt);
      if (this.stateT >= HURT) { this.touch = true; this.setState('rest'); }
      return;
    }
    if (this.updateDefeat(dt)) return;
    this.hopStep(dt);
    if (this.state !== 'air') this.faceToward(this.dir.x, this.dir.z, dt, 8);
    else this.faceToward(this.vel.x, this.vel.z, dt, 8);
  }

  /** Treffer: Riese verliert einen Punkt (platt, dann schneller), sonst zerplatzt er. */
  hit(source, strong = false) {
    if (this.defeated || this.state === 'burst' || this.state === 'hurt') return false;
    if (strong) this.hp = 0; else this.hp--;
    if (this.hp > 0) {
      this.setState('hurt');
      this.vel.set(0, 0, 0);
      this.pause *= 0.6;
      this.hopLen *= 1.15;
      this.level.effects?.dust(this.pos, 6, 1.2);
      this.level.sfx('blockhit');
      return true;
    }
    this.burst(!strong);
    return true;
  }

  /** Zerplatzen: Kerne/Schalen (Modell), Bitcoins, beim Riesen drei Kleine. */
  burst(withKids = true) {
    if (this.bursted) return;
    this.bursted = true;
    this.setState('burst');
    this.touch = false;
    this.vel.set(0, 0, 0);
    const c = this.center();
    this.level.sfx('brickbreak');
    this.level.effects?.sparks(c, 8);
    this.level.effects?.debris?.(c, 0xff8a1a, 6);
    if (this.coins > 0) spawnLoot(this.level, this.coins === 1 ? 'coin' : `coins:${this.coins}`, this.pos.x, this.pos.y, this.pos.z);
    if (this.riese && withKids) {
      for (let i = 0; i < this.kidsN; i++) {
        const a = this.yaw + Math.PI / 2 + (i / this.kidsN) * Math.PI * 2;
        const dx = Math.cos(a), dz = -Math.sin(a);
        const k = this.level.spawn('kuerbling', {
          pos: [this.pos.x + dx * 0.4, this.pos.y + 0.4, this.pos.z + dz * 0.4], vel: [dx * 2.6, 6.5, dz * 2.6],
          dir: [dx, dz], sight: this.sight, behavior: 'chase', coins: 1,
        });
        if (k) this.kids.push(k);
      }
    }
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'burst') return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (this.state === 'hurt') return contact.fromAbove ? 'stomp' : 'none';
    if (contact.pound) { this.hit(player); return 'none'; }
    if (contact.fromAbove) { this.hit(player); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'burst') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    this.hit(source, STRONG.has(kind));
  }

  modelState() {
    if (this.state === 'burst') return { anim: 'burst', progress: Math.min(1, this.stateT / BURST) };
    if (this.state === 'hurt') return { anim: 'squashed' };
    return super.modelState();
  }

  info() { return { ...super.info(), riese: this.riese, hp: this.hp, kids: this.kids.length }; }
}

// =====================================================================================================================
// Hexenhut-Hüpfer
// =====================================================================================================================
class Hexenhut extends HwHuepfer {
  constructor(level, spec) {
    super(level, spec, 'hexenhut_huepfer', { hop: 1.3, height: 0.8, pause: 0.55 });
    this.half.set(0.4, 0.46, 0.4);
    this.shadow = 0.5;
    this.boost = spec.bounce ?? 14;
    this.brimBounces = 0;
    this.grace = 0;
    this.wobble = 0;
    if (level.view) this.setModel(getModel('hexenhut_huepfer'));
    this.initShadows(2);
  }

  /** In der Luft (Krempe federt ab)? */
  get airborne() { return this.state === 'air' && !this.grounded; }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.grace > 0 && player.vel.y > 0) return 'none';   // gerade von der Krempe abgeprallt
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.fromAbove || contact.pound) {
      if (this.airborne) {
        // Krempe federt: hoher Abprall, kein Treffer
        player.bounceOff?.(player.input ?? {});
        if (player.vel) player.vel.y = Math.max(player.vel.y, this.boost);
        this.brimBounces++;
        this.wobble = 0.35;
        this.grace = 0.3;
        this.vel.y = Math.min(this.vel.y, -1);
        this.level.sfx('bounce');
        this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.half.y * 2, z: this.pos.z }, 4);
        return 'none';
      }
      this.squash(0.7);
      if (contact.pound) this.level.sfx('stomp');   // sonst spielt die Laufzeit 'stomp' zum Abprall
      return contact.pound ? 'none' : 'stomp';
    }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  update(dt) {
    if (this.wobble > 0) this.wobble = Math.max(0, this.wobble - dt);
    if (this.grace > 0) this.grace -= dt;
    super.update(dt);
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'pound') {
      if (source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
      if (!this.airborne) { this.squash(0.7); this.level.sfx('stomp'); }
      return;
    }
    if (kind === 'bump') { if (!this.airborne) this.flip(source); return; }
    this.flip(source);
  }

  modelState() {
    if (this.state === 'squashed') return { anim: 'squashed' };
    const st = super.modelState();
    // Krempe federt nach einem Abpraller: kurz gestaucht (Landephase des Modells)
    if (this.wobble > 0) return { anim: 'hop', progress: 0.85 + (1 - this.wobble / 0.35) * 0.15, height: 0 };
    return st;
  }

  info() { return { ...super.info(), brimBounces: this.brimBounces, airborne: this.airborne }; }
}

export const KINDS = {
  kuerbling: (level, spec) => new Kuerbling(level, spec),
  riesenkuerbling: (level, spec) => new Kuerbling(level, { ...spec, riese: true }),
  hexenhut_huepfer: (level, spec) => new Hexenhut(level, spec),
};
