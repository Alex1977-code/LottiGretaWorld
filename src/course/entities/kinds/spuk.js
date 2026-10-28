// Geister Welt 3 (3-3 Spukhaus): Spuk / Großspuk, Kreisgeist (einzeln und als Ring).
//
// spuk – schwebt frei (durch Wände) und **folgt der nächsten Figur, solange sie wegschaut**; schaut sie zu ihm
//   (Blickrichtung ±look Grad, level.isFacing des Motors bzw. eigene Rechnung über fig.yaw), hält er an, schlägt die
//   Händchen vors Gesicht und wird halb durchsichtig (shy). Der **Licht-Helm** (onLight) lässt ihn verblassen (fade)
//   und nach `fade` s Licht verschwinden (besiegt, sfx 'ghost'); ohne Licht erholt er sich langsam. Großspuk
//   (size ≈ 2,5) ist langsamer und braucht länger Licht. Jede Berührung verletzt (auch von oben). Feuer, Krallen,
//   Panzer, Wurf, Rutschen, Schwanzhieb, Kanonenkugel … gehen hindurch (er zuckt nur und versteckt sich kurz);
//   Funkelstern und Riesentrank vertreiben ihn.
//   Daten: { kind: 'spuk', pos (Unterkante beim Schweben), size?: 1 (Großspuk 2.5), speed?: 1.5 (Großspuk 0.9),
//            look?: 70 (Grad), sight?: 14 (folgt nur so nah), hover?: 0.45 (m über der Figur), fade?: 0.8 (Großspuk 2.2),
//            shyDelay?: 0.15 (s bis zum Verstecken), drop? }
//   Zustände: idle (weit weg) → chase ⇄ shy → fade (im Licht) → defeated (0,6 s) …; hit (0,4 s).
//   Laufzeit: light (aufsummierte Lichtzeit), lightCalls, chaseTime, shyTime, looked (Figur schaut gerade).
//   Modell 'spuk' (opts { size }, state { anim: chase|shy|fade|idle|hit|defeated }).
//
// kreisgeist – einzelner Kreisgeist: kreist um center (radius, speed m/s, cw, phase) bzw. fährt eine Bahn (path,
//   loop) oder schwebt an pos. Berührung verletzt (immer). **Licht** löst ihn nach fade s (0,6) auf; Funkelstern und
//   Riesentrank ebenso. Alles andere geht hindurch.
//   Daten: { kind: 'kreisgeist', pos?, center?: [x, y, z], radius?: 3, speed?: 1.6, cw?: false, phase?: 0..1, path?,
//            loop?, fade?: 0.6, drop? }   Modell 'kreisgeist' (state { anim: circle|peek|defeated }).
// kreisgeist_kreis – ganzer Ring aus count Kreisgeistern um pos (Unterkante = pos.y), gemeinsam gedreht; ein
//   Instanz-Modell (3 Zeichenaufrufe), jeder Geist ist eine eigene Entität ('kreisgeist_glied': Berührung, Licht,
//   Angriffe je Geist; erloschene fehlen im Ring, Modell-Maske alive). Schauen auf (peek), wenn eine Figur nah ist.
//   Daten: { kind: 'kreisgeist_kreis', id?, pos: [x, y, z] (Mitte), count?: 8, radius?: 3, speed?: 1.6 (m/s am Umfang),
//            cw?: false, phase?: 0..1 (Startdrehung), fade?: 0.6, peek?: 2.5 (m über den Ring hinaus) }
//   Laufzeit: angle, alive (Zahl), members (Entitäten), mask. Beispiel:
//     { kind: 'kreisgeist_kreis', pos: [0, 1.2, -40], count: 10, radius: 4, speed: 2 }
//
// Halloween-Optik (Präzisierung Gegner Halloween, additiv): alle drei Arten nehmen `halloween: true | false`; Standard ist
//   true in der Halloween-Welt (LEVEL.world 31, Id 'H-…' oder LEVEL.halloween: true), sonst false. Dann zeichnen sie die
//   Modelle 'spuk_halloween' (opts { size, hat: 'kuerbis' (Standard) | 'hexe' | 'kein' } – spec.hat), 'kreisgeist_halloween'
//   bzw. 'kreisgeist_kreis_halloween'. Verhalten unverändert. Laufzeit: halloween (bool).

import { EnemyW2, figures, activeFigure, looksAt, maskedFrom } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel, hasModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const HIT = 0.4, VANISH = 0.6;

/** Starke Wirkung gegen Geister: nur Funkelstern und Riesentrank. */
const BANISH = new Set(['star', 'mega']);

/** Halloween-Welt? (LEVEL.halloween, Welt 31, Id 'H-…') */
export function isHalloweenLevel(level) {
  const d = level?.data ?? {};
  return d.halloween === true || d.world === 31 || /^H-/.test(String(d.id ?? level?.id ?? ''));
}
/** Halloween-Optik für diese Entität (spec.halloween, sonst nach Welt) und vorhandenes Modell. */
const halloweenOf = (level, spec, model) => (spec.halloween ?? isHalloweenLevel(level)) === true && hasModel(model);

// =====================================================================================================================
// Spuk / Großspuk
// =====================================================================================================================
class Spuk extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'spuk');
    this.size = spec.size ?? 1;
    const big = this.size > 1.5;
    this.half.set(0.42 * this.size, 0.48 * this.size, 0.42 * this.size);
    this.shadow = 0.4 * this.size;
    this.speed = spec.speed ?? (big ? 0.9 : 1.5);
    this.look = spec.look ?? 70;
    this.sight = spec.sight ?? 14;
    this.hover = spec.hover ?? 0.45;
    this.fade = spec.fade ?? (big ? 2.2 : 0.8);
    this.shyDelay = spec.shyDelay ?? 0.15;
    this.light = 0;
    this.lightCalls = 0;
    this.litAgo = 9;
    this.chaseTime = 0;
    this.shyTime = 0;
    this.looked = false;
    this.lookT = 0;
    this.hitT = 0;
    this.edges = false;
    this.baseY = this.pos.y;
    this.state = 'idle';
    this.halloween = halloweenOf(level, spec, 'spuk_halloween');
    if (level.view) this.setModel(this.halloween ? getModel('spuk_halloween', { size: this.size, hat: spec.hat }) : getModel('spuk', { size: this.size }));
    this.initShadows(1);
  }

  /** Licht-Helm: im Kegel verblasst er und löst sich nach fade s Licht auf. */
  onLight(dt, player) {
    if (this.defeated) return;
    this.lightCalls++;
    this.light += dt;
    this.litAgo = 0;
    if (this.state !== 'fade') this.setState('fade');
    if (this.light >= this.fade) this.vanish('light');
  }

  vanish(why) {
    if (this.defeated) return;
    this.vanishedBy = why;
    this.setState('defeated');
    this.touch = false;
    this.level.effects?.sparks(this.center(), 14);
    this.level.sfx('ghost');
    this.markDefeated();
  }

  update(dt) {
    this.stateT += dt;
    this.litAgo += dt;
    if (this.state === 'defeated') { if (this.stateT > VANISH) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    if (this.hitT > 0) this.hitT -= dt;
    // ohne Licht erholt er sich langsam
    if (this.litAgo > 0.4) this.light = Math.max(0, this.light - dt * 0.35);
    const p = this.player;
    const act = activeFigure(p);
    if (this.state === 'fade') {
      if (this.litAgo > 0.25) this.setState(act ? 'shy' : 'idle');
      this.drift(dt, p, 0);
      return;
    }
    // Pilz-Maske (Welt 6): eine zugewandte Figur mit Maske erkennt er nicht – er schwebt ruhig (idle statt shy/chase)
    if (!act || this.playerDist() > this.sight || maskedFrom(this.level, this, p)) {
      if (this.state !== 'idle') this.setState('idle');
      this.drift(dt, null, 0);
      return;
    }
    // Blick: schaut eine nahe Figur zu ihm? (die nächste; Klone ebenso, wenn kaum weiter weg)
    const c = this.center();
    let looked = false;
    const d0 = this.playerDist();
    for (const f of figures(this.level)) {
      if (!activeFigure(f)) continue;
      const d = Math.hypot(f.pos.x - c.x, f.pos.z - c.z);
      if (d > Math.max(1.5 * d0, d0 + 3)) continue;
      if (looksAt(this.level, f, c, this.look)) { looked = true; break; }
    }
    this.looked = looked;
    this.lookT = looked ? this.lookT + dt : 0;
    const shy = this.hitT > 0 || (looked && (this.lookT >= this.shyDelay || this.state === 'shy'));
    if (shy) {
      if (this.state !== 'shy') this.setState('shy');
      this.shyTime += dt;
      this.drift(dt, p, 0);
    } else {
      if (this.state !== 'chase') this.setState('chase');
      this.chaseTime += dt;
      this.drift(dt, p, this.speed);
    }
  }

  /** Schweben: waagerecht mit speed zur Figur, Höhe weich auf Figur + hover (sonst Ausgangshöhe). */
  drift(dt, p, speed) {
    let ty = this.baseY;
    if (p && activeFigure(p)) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (speed > 0 && d > 0.2) {
        const s = Math.min(speed * dt, d);
        this.pos.x += (dx / d) * s; this.pos.z += (dz / d) * s;
      }
      this.faceToward(dx, dz, dt, speed > 0 ? 6 : 3);
      ty = p.pos.y + this.hover - (this.size - 1) * 0.35;
    }
    this.pos.y += (ty - this.pos.y) * Math.min(1, dt * (speed > 0 ? 1.6 : 0.8));
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.star) { this.vanish('star'); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (BANISH.has(kind)) { this.vanish(kind); return; }
    // alles andere geht hindurch: zucken, kurz verstecken
    this.hitT = HIT;
    if (this.state !== 'shy') this.setState('shy');
    this.flinch = this.level.time;
  }

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated' };
    if (this.flinch !== undefined && this.level.time - this.flinch < HIT) return { anim: 'hit' };
    if (s === 'fade') return { anim: 'fade' };
    if (s === 'chase') return { anim: 'chase' };
    if (s === 'shy') return { anim: 'shy' };
    return { anim: 'idle' };
  }

  info() {
    return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), looked: this.looked, light: +this.light.toFixed(2), size: this.size, defeated: this.defeated, halloween: this.halloween };
  }
}

// =====================================================================================================================
// Kreisgeist (einzeln)
// =====================================================================================================================
class Kreisgeist extends EnemyW2 {
  constructor(level, spec, ring = null, index = 0) {
    super(level, spec, ring ? 'kreisgeist_glied' : 'kreisgeist');
    this.ring = ring;
    this.index = index;
    this.half.set(0.4, 0.4, 0.4);
    this.shadow = ring ? 0.32 : 0.38;
    this.speed = spec.speed ?? 1.6;
    this.fade = spec.fade ?? 0.6;
    this.light = 0;
    this.litAgo = 9;
    this.lightCalls = 0;
    this.wake = 0;
    this.state = 'circle';
    this.circle = null;
    this.mover = null;
    if (!ring) {
      if (spec.center) {
        const c = spec.center;
        this.circle = { x: c[0], y: c[1], z: c[2], r: spec.radius ?? 3, a: (spec.phase ?? 0) * TAU, s: spec.cw ? -1 : 1 };
        this.place();
      } else if (spec.path?.length >= 2) {
        this.mover = new PathMover(spec.path, { speed: this.speed, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.3, phase: spec.phase ?? 0 });
        const p = this.mover.pos; this.pos.set(p.x, p.y, p.z);
      }
      this.halloween = halloweenOf(level, spec, 'kreisgeist_halloween');
      if (level.view) this.setModel(getModel(this.halloween ? 'kreisgeist_halloween' : 'kreisgeist'));
      this.initShadows(1);
    }
  }

  place() {
    const c = this.circle;
    const x0 = this.pos.x, z0 = this.pos.z;
    this.pos.set(c.x + Math.cos(c.a) * c.r, c.y, c.z - Math.sin(c.a) * c.r);
    // Blick nach außen (wie im Ring-Modell)
    this.yaw = c.a;
    return Math.hypot(this.pos.x - x0, this.pos.z - z0);
  }

  onLight(dt, player) {
    if (this.defeated) return;
    this.lightCalls++;
    this.light += dt;
    this.litAgo = 0;
    if (this.light >= this.fade) this.vanish('light');
  }

  vanish(why) {
    if (this.defeated) return;
    this.vanishedBy = why;
    this.setState('defeated');
    this.touch = false;
    this.level.effects?.sparks(this.center(), 10);
    this.level.sfx('ghost');
    this.markDefeated();
    this.ring?.memberGone(this);
  }

  update(dt) {
    this.stateT += dt;
    this.litAgo += dt;
    if (this.state === 'defeated') { if (this.stateT > VANISH) this.kill(); return; }
    if (this.litAgo > 0.4) this.light = Math.max(0, this.light - dt * 0.5);
    if (this.ring) { this.ring.sync(); this.ring.placeMember(this); return; }
    if (this.circle) { this.circle.a += (this.circle.s * this.speed / this.circle.r) * dt; this.place(); }
    else if (this.mover) {
      const ox = this.pos.x, oz = this.pos.z;
      this.mover.step(dt);
      const p = this.mover.pos; this.pos.set(p.x, p.y, p.z);
      if (Math.abs(p.x - ox) + Math.abs(p.z - oz) > 1e-6) this.yaw = Math.atan2(-(p.z - oz), p.x - ox);
    }
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.star) { this.vanish('star'); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (BANISH.has(kind)) this.vanish(kind);
  }

  render(dt, t) {
    if (this.ring) return;            // Ring zeichnet alle Glieder als Instanzen
    super.render(dt, t);
  }

  modelState() {
    if (this.state === 'defeated') return { anim: 'defeated' };
    const p = this.player;
    const near = activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 2.5;
    return { anim: near ? 'peek' : 'circle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    // im Licht durchscheinend flimmern (Modell hat kein eigenes Verblassen)
    const k = this.litAgo < 0.15 ? Math.min(1, this.light / this.fade) : 0;
    this.model.root.scale.setScalar(1 - k * 0.35);
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), light: +this.light.toFixed(2), defeated: this.defeated, halloween: !!(this.halloween ?? this.ring?.halloween) }; }
}

// =====================================================================================================================
// Kreisgeist-Ring (Steuerung + Instanz-Modell; Glieder sind eigene Entitäten)
// =====================================================================================================================
class KreisgeistKreis extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'kreisgeist_kreis');
    this.enemy = false;
    this.touch = false;
    this.shadow = 0;
    this.count = Math.max(1, Math.min(40, Math.round(spec.count ?? 8)));
    this.radius = Math.max(0.5, spec.radius ?? 3);
    this.speed = spec.speed ?? 1.6;
    this.dirSign = spec.cw ? -1 : 1;
    this.angle = (spec.phase ?? 0) * TAU;
    this.peekR = spec.peek ?? 2.5;
    this.center0 = this.pos.clone();
    this.half.set(this.radius + 0.4, 0.4, this.radius + 0.4);
    this.t = level.time;
    this.yaw = 0;
    this.mask = 0;
    this.members = [];
    this.peek = false;
    this.halloween = halloweenOf(level, spec, 'kreisgeist_kreis_halloween');
    if (level.view) this.setModel(getModel(this.halloween ? 'kreisgeist_kreis_halloween' : 'kreisgeist_kreis', { count: this.count, radius: this.radius }));
    const ms = { speed: this.speed, fade: spec.fade };
    for (let i = 0; i < this.count; i++) {
      const g = new Kreisgeist(level, { ...ms, pos: [this.pos.x, this.pos.y, this.pos.z], id: spec.id ? `${spec.id}_${i}` : undefined }, this, i);
      // als eigene Entität anmelden (Berührung, Licht, Angriffe, Schatten)
      level.entities.push(g);
      if (g.spec.id) level.named.set(g.spec.id, g);
      if (g.shadow > 0 && level.view) level.view.shadows.add({ pos: g.pos, radius: g.shadow, alive: () => !g.removed, visible: () => g.alive });
      this.members.push(g);
      this.mask |= 1 << i;
      this.placeMember(g);
    }
  }

  /** Drehung einmal je Simulationsschritt weiterrücken (wer zuerst fragt, rechnet). */
  sync() {
    const now = this.level.time;
    if (now === this.t) return;
    const dt = now - this.t;
    this.t = now;
    this.angle += this.dirSign * (this.speed / this.radius) * dt;
  }

  /** Lage des Glieds i (wie im Modell: x = cos a · R, z = sin a · R). */
  placeMember(g) {
    const a = this.angle + (g.index / this.count) * TAU;
    g.pos.set(this.pos.x + Math.cos(a) * this.radius, this.pos.y, this.pos.z + Math.sin(a) * this.radius);
    g.yaw = -a;
  }

  memberGone(g) {
    this.mask &= ~(1 << g.index);
  }

  update(dt) {
    this.sync();
    const p = this.player;
    this.peek = activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.radius + this.peekR;
    if (this.members.every((m) => m.removed)) super.kill();
  }

  get aliveCount() { return this.members.filter((m) => !m.defeated).length; }

  /** Ring weg (Neustart einer Arena/eines Raums): Glieder mitnehmen. */
  kill() {
    for (const m of this.members) m.kill();
    super.kill();
  }

  onPlayer() { return 'none'; }
  onHit() {}

  modelState() { return { anim: this.peek ? 'peek' : 'circle', angle: this.angle, alive: this.mask }; }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = 0;
  }

  info() { return { angle: +this.angle.toFixed(3), alive: this.aliveCount, count: this.count, mask: this.mask, peek: this.peek, halloween: this.halloween }; }
}

export const KINDS = {
  spuk: (level, spec) => new Spuk(level, spec),
  kreisgeist: (level, spec) => new Kreisgeist(level, spec),
  kreisgeist_kreis: (level, spec) => new KreisgeistKreis(level, spec),
};
