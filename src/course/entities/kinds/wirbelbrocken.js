// Wirbelbrocken – Endgegner Welt 2 (2-Panzer, Bossarena; Bauplan: „rennt im Kreis, versteckt sich im Panzer;
// 3× draufspringen“). Stämmiger Gürteltier-Raufbold mit Riesenfäusten in einer runden Arena.
//
// Ablauf je Runde (Phase = maxHp − hp + 1, jede Phase schneller und mit mehr Wirbeln):
//   run      läuft auf die nächste Figur zu (Phase 1/2/3: 4,5 / 5,5 / 6,5 m/s, 1,6 / 1,3 / 1,0 s)
//   spin     wirbelt mit ausgestreckten Fäusten (Reichweite 1,4 m = model userData.reach; Berührung schadet, auch
//            von oben) und wandert dabei auf die Figur zu – Phase 1: 1 Wirbel, 2: 2, 3: 3 (dazwischen kurz run)
//   stunned  danach schwindelig (1,6 / 1,5 / 1,4 s) – **verwundbar**: Draufspringen oder Stampfattacke = Treffer
//   hit      0,6 s Aufleuchten → hide: rollt sich zur Panzerkugel und saust durch die Arena (7 / 9 / 11 m/s,
//            2,6 / 3,0 / 3,4 s), prallt an der Arenagrenze und an Wänden ab; Berührung schadet (von oben: Abprall)
//   → run …  Nach dem dritten Treffer: defeated (2 s, kippt um, blinkt) → flee (1,2 s, springt davon) → gone.
// Treffer zählen nur im verwundbaren Fenster (stunned) – in run nur Abprall ohne Schaden. Eine Kanonenkugel des
// Kanonen-Helms (onCannon / onHit('cannon')) trifft in jedem Zustand außer hide/hit/intro (starker Treffer, 1 hp).
// Feuer, Krallen, Panzer, Explosionen, Funkelstern, Riesentrank zählen nicht (kein `enemy`).
//
// Boss-Archetyp (archetypes/kinds/boss.js, Schnittstelle wie baron.js): begin() Auftritt (intro 2,4 s: Sprung,
// Brüllen), reset() Kampf neu (Tod der Figur), state (wait … gone), stateT, hp, maxHp, phase, visible, home, half,
// carHits (immer 0), info(); ruft level.onBossHit(boss, 'stomp'|'cannon') und level.onBossDefeated(boss). Nach
// 'gone' öffnet der Archetyp die Warp-Box. Ohne Boss-Archetyp beginnt der Kampf, sobald eine Figur näher als wakeR m
// ist, und nach 'gone' erscheint drop (z. B. 'star:0') in der Arenamitte.
//
// Daten: { kind: 'wirbelbrocken', id: 'wirbel', pos: [x, y, z] (Startpunkt, Arenamitte als Standard),
//          arena?: { center: [x, y, z], r: 10 } (runde Kampffläche: Grenze für Lauf und Kugel), hp?: 3,
//          wakeR?: 9 (nur ohne Boss-Archetyp), drop?,
//          decoys?: true | [0, 1, 2] (Präzisierung Gegner Welt 6, 6-Panzer: Attrappen je Phase), ring?: 0.55 (· r), seed? }
// Modell 'wirbelbrocken' (state { anim: idle|run|spin|hide|hit|stunned|defeated, speed, hp, progress }).
//
// Mit Attrappen (decoys, Bauplan 6-Panzer „nach Treffer 1 Teleport mit 1 Attrappe, nach Treffer 2 mit 2; 3 Treffer“): statt
// der Panzerkugel nach einem Treffer **teleportiert** er (hit 0,6 s → teleport 0,5 s: wirbelt und schrumpft → hidden 0,5 s →
// appear 0,7 s: fällt auf einen Platz eines Rings (ring · r um die Arenamitte); auf den übrigen Plätzen erscheinen gleich viele
// **Attrappen** (Phase 2: 1, Phase 3: 2; Entität 'wirbelbrocken_attrappe', Modell gleichen Aussehens). Die Attrappen laufen,
// wirbeln (Fäuste verletzen) und taumeln im selben Takt wie er. **Nur das Original zählt**: Draufspringen/Stampfen auf eine
// Attrappe lässt sie in lila Rauch verpuffen (Abprall, kein Treffer), ebenso jeder Angriff; ein Treffer am Original lässt alle
// Attrappen verpuffen. Alle halten beim Laufen ≥ 2,6 m Abstand voneinander. Ansage beim ersten Teleport: „Nur der echte
// Wirbelbrocken zählt!“. Laufzeit zusätzlich: teleports,
// decoys (lebende Attrappen), decoysMade, decoysPopped.
// wirbelbrocken_attrappe – { kind: 'wirbelbrocken_attrappe', pos, owner (Wirbelbrocken) } (nur vom Wirbelbrocken erzeugt).

import { EnemyW2, figures, activeFigure, clamp } from '../EnemyW2.js';
import { spawnLoot } from '../Enemy.js';
import { getModel } from '../../models/index.js';
import { bossManaged, Lcg } from '../w6help.js';

const INTRO = 2.4, HIT = 0.6, DEFEAT = 2.0, FLEE = 1.2, GAP = 0.5;
const TELE = 0.5, HIDDEN = 0.5, APPEAR = 0.7, POOF = 0.5;
const TAU = Math.PI * 2;
const REACH = 1.4;
const PHASES = [
  null,
  { run: 4.5, runT: 1.6, spins: 1, spinT: 2.2, spinSpeed: 2.2, hide: 7, hideT: 2.6, stun: 1.6 },
  { run: 5.5, runT: 1.3, spins: 2, spinT: 1.9, spinSpeed: 2.8, hide: 9, hideT: 3.0, stun: 1.5 },
  { run: 6.5, runT: 1.0, spins: 3, spinT: 1.7, spinSpeed: 3.4, hide: 11, hideT: 3.4, stun: 1.4 },
];

class Wirbelbrocken extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'wirbelbrocken');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.half.set(0.72, 1.05, 0.72);
    this.shadow = 0.95;
    this.home = this.pos.clone();
    const a = spec.arena ?? {};
    const c = a.center ?? [this.home.x, this.home.y, this.home.z];
    this.arena = { x: c[0], y: c[1], z: c[2], r: a.r ?? 10 };
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.carHits = 0;
    this.hits = 0;
    this.hitLog = [];
    this.spinsLeft = 0;
    this.spinsDone = 0;
    this.hides = 0;
    this.visible = true;
    this.wakeR = spec.wakeR ?? 9;
    this.state = 'wait';
    this.stateT = 0;
    this.clock = 0;
    this.yaw = -Math.PI / 2;          // Blick zur Kamera (+Z)
    this.rollDir = { x: 0, z: 1 };
    this.dropped = false;
    // Attrappen (Welt 6): Anzahl je Phase
    this.decoyN = spec.decoys === true ? [0, 1, 2] : Array.isArray(spec.decoys) ? spec.decoys : null;
    this.decoyList = [];
    this.teleports = 0;
    this.decoysMade = 0;
    this.decoysPopped = 0;
    this.rnd = new Lcg(spec.seed ?? 0x77b0b0);
    if (level.view) this.setModel(getModel(spec.decoyOf ? 'wirbelbrocken_attrappe' : 'wirbelbrocken'));
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  get P() { return PHASES[this.phase]; }
  /** Steuert ein Boss-Archetyp diesen Endgegner? */
  get managed() { return bossManaged(this.level, this.spec.id); }

  setState(s) { this.state = s; this.stateT = 0; }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('intro');
    this.vel.set(0, 0, 0);
    this.facePlayerNow();
    this.level.sfx('boss_spin');
  }

  reset() {
    this.popDecoys(false);
    this.teleports = 0;
    this.hp = this.maxHp;
    this.defeated = false;
    this.hits = 0;
    this.spinsLeft = 0;
    this.visible = true;
    this.touch = true;
    this.fellOut = false;
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.half.y = 1.05;
    this.yaw = -Math.PI / 2;
    if (this.model) this.model.root.visible = true;
    this.setState('wait');
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    this.clock += dt;
    this.syncArchPhase();
    switch (this.state) {
      case 'wait':
        this.stand(dt);
        if (!this.managed) {
          for (const p of figures(this.level)) if (activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.wakeR) { this.begin(); break; }
        }
        return;
      case 'intro':
        if (this.stateT > 0.35 && this.stateT - dt <= 0.35) { this.vel.y = 9; this.grounded = false; }
        this.vel.x = 0; this.vel.z = 0;
        this.moveWithGravity(dt);
        this.facePlayer(dt, 6);
        if (this.stateT > 0.9 && this.grounded && !this.landed) { this.landed = true; this.level.shake(0.4); this.level.effects?.dust(this.pos, 10, 1.8); this.level.sfx('slam'); }
        if (this.stateT >= INTRO) { this.landed = false; this.startRun(); }
        return;
      case 'run':
        this.chaseStep(dt, this.P.run);
        if (this.stateT >= (this.spinsLeft > 0 && this.spinsDone > 0 ? GAP : this.P.runT)) this.startSpin();
        return;
      case 'spin':
        this.chaseStep(dt, this.P.spinSpeed);
        this.spinHurt();
        if (this.stateT >= this.P.spinT) {
          this.spinsLeft--;
          this.spinsDone++;
          if (this.spinsLeft > 0) this.setState('run');
          else { this.setState('stunned'); this.level.sfx('dizzy'); }
        }
        return;
      case 'stunned':
        this.stand(dt);
        if (this.stateT >= this.P.stun) this.startRun();
        return;
      case 'hit':
        this.stand(dt);
        if (this.stateT >= HIT) {
          if (this.hp <= 0) this.setState('defeated');
          else if (this.decoyN) this.startTeleport();
          else this.startHide();
        }
        return;
      case 'teleport':
        this.stand(dt);
        if (this.stateT >= TELE) { this.visible = false; this.setState('hidden'); }
        return;
      case 'hidden':
        if (this.stateT >= HIDDEN) this.appear();
        return;
      case 'appear':
        this.vel.x = 0; this.vel.z = 0;
        this.moveWithGravity(dt);
        this.facePlayer(dt, 6);
        if (this.grounded && !this.landed) { this.landed = true; this.level.shake(0.25); this.level.effects?.dust(this.pos, 8, 1.4); this.level.sfx('slam'); }
        if (this.stateT >= APPEAR) { this.landed = false; this.startRun(); }
        return;
      case 'hide':
        this.roll(dt);
        if (this.stateT >= this.P.hideT) { this.half.y = 1.05; this.vel.y = 6; this.grounded = false; this.startRun(); }
        return;
      case 'defeated':
        this.stand(dt);
        if (this.stateT >= DEFEAT) { this.setState('flee'); this.vel.set(0, 12, 0); this.grounded = false; this.level.sfx('swoop'); }
        return;
      case 'flee':
        this.vel.y -= 30 * dt;
        this.pos.y += this.vel.y * dt;
        this.pos.z -= 6 * dt;
        if (this.stateT >= FLEE) this.vanish();
        return;
      default: break;
    }
  }

  /** Ohne Phasen-Ansage „Feuerspur“ (Baron): der Archetyp kennt Phase 3 schon, eigene Ansage. */
  syncArchPhase() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this || this.phase !== 3 || this.state === 'hit' || arch.seenPhase === 3) return;
    arch.seenPhase = 3;
    arch.hud?.banner?.('Jetzt wirbelt er wie wild!', { hold: 1.5, size: 14, color: '#ffb040' });
  }

  startRun() {
    this.spinsLeft = this.P.spins;
    this.spinsDone = 0;
    this.setState('run');
  }

  startSpin() {
    this.setState('spin');
    this.level.sfx('boss_spin');
  }

  startHide() {
    this.hides++;
    this.half.y = 0.75;
    const p = this.player;
    let dx = 0, dz = 1;
    if (p) { dx = p.pos.x - this.pos.x; dz = p.pos.z - this.pos.z; }
    if (Math.hypot(dx, dz) < 0.5) {
      // Figur steht (nach dem Treffer) auf ihm: zur Arenamitte bzw. in Blickrichtung losrollen
      dx = this.arena.x - this.pos.x; dz = this.arena.z - this.pos.z;
      if (Math.hypot(dx, dz) < 1) { dx = Math.cos(this.yaw); dz = -Math.sin(this.yaw); }
    }
    const l = Math.hypot(dx, dz) || 1;
    // leicht schräg zur Figur, damit die Kugel durch die Arena prallt
    const a = 0.45 * (this.hides % 2 ? 1 : -1), c = Math.cos(a), s = Math.sin(a);
    this.rollDir.x = (dx / l) * c - (dz / l) * s; this.rollDir.z = (dx / l) * s + (dz / l) * c;
    this.setState('hide');
    this.level.sfx('boss_spin');
  }

  facePlayerNow() {
    const p = this.player;
    if (p) this.yaw = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
  }

  /** Auf die nächste Figur zu, innerhalb der Arena. */
  chaseStep(dt, speed) {
    const p = this.player;
    let vx = 0, vz = 0;
    if (activeFigure(p)) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.4) { vx = (dx / d) * speed; vz = (dz / d) * speed; }
      if (this.state !== 'spin') this.faceToward(dx, dz, dt, 8);
    }
    this.vel.x = vx; this.vel.z = vz;
    this.moveWithGravity(dt);
    this.separate();
    this.keepInside(1.0);
  }

  /** Mit Attrappen (Welt 6): Original und Attrappen halten Abstand (≥ 2,6 m), sonst liefen alle zur Figur ineinander. */
  separate() {
    const boss = this.owner ?? this;
    const list = boss.decoyList;
    if (!list?.length) return;
    const MIN = 2.6;
    for (const o of [boss, ...list]) {
      if (o === this || o.removed || o.state === 'poof' || !o.visible) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d >= MIN) continue;
      const ux = d > 1e-3 ? dx / d : Math.cos(this.yaw + 1.3), uz = d > 1e-3 ? dz / d : -Math.sin(this.yaw + 1.3);
      const k = (MIN - d) * 0.5;
      this.pos.x += ux * k; this.pos.z += uz * k;
    }
  }

  /** Grenze der runden Arena (Mitte, r − margin). true = an der Grenze. */
  keepInside(margin) {
    const A = this.arena;
    const dx = this.pos.x - A.x, dz = this.pos.z - A.z, d = Math.hypot(dx, dz), R = A.r - margin;
    if (d <= R) return false;
    this.pos.x = A.x + (dx / d) * R; this.pos.z = A.z + (dz / d) * R;
    return true;
  }

  /** Panzerkugel: saust geradeaus, prallt an Arenagrenze und Wänden ab. */
  roll(dt) {
    const sp = this.P.hide;
    this.vel.x = this.rollDir.x * sp; this.vel.z = this.rollDir.z * sp;
    const res = this.moveWithGravity(dt, { step: 0.3 });
    let bounced = false;
    if (res.hitWall && res.wallNormal) {
      const n = res.wallNormal, d = this.rollDir.x * n.x + this.rollDir.z * n.z;
      if (d < 0) { this.rollDir.x -= 2 * d * n.x; this.rollDir.z -= 2 * d * n.z; bounced = true; }
    }
    const A = this.arena;
    const dx = this.pos.x - A.x, dz = this.pos.z - A.z, d = Math.hypot(dx, dz);
    if (d > A.r - 0.8) {
      const nx = dx / d, nz = dz / d, dot = this.rollDir.x * nx + this.rollDir.z * nz;
      if (dot > 0) { this.rollDir.x -= 2 * dot * nx; this.rollDir.z -= 2 * dot * nz; bounced = true; }
      this.keepInside(0.8);
    }
    if (bounced) {
      const l = Math.hypot(this.rollDir.x, this.rollDir.z) || 1;
      this.rollDir.x /= l; this.rollDir.z /= l;
      this.level.sfx('blockhit');
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.5, z: this.pos.z }, 5);
      this.level.shake(0.12);
    }
    this.yaw = Math.atan2(-this.rollDir.z, this.rollDir.x);
  }

  /** Wirbelnde Fäuste treffen Figuren im Umkreis REACH. */
  spinHurt() {
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d > REACH + p.half.x) continue;
      if (p.pos.y > this.pos.y + 1.75 || p.pos.y + p.half.y * 2 < this.pos.y + 0.35) continue;
      p.hurt(this);
    }
  }

  // ------------------------------------------------------------------ Attrappen (Welt 6)

  /** Nach einem Treffer: verpuffen (statt Panzerkugel), auf einem Ring-Platz mit Attrappen wieder erscheinen. */
  startTeleport() {
    this.teleports++;
    this.half.y = 1.05;
    this.setState('teleport');
    this.level.sfx('vanish');
    this.level.effects?.dust(this.pos, 10, 1.4);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 12);
    if (this.teleports === 1) {
      const arch = this.level.archetype;
      if (arch?.boss === this) arch.hud?.banner?.('Nur der echte Wirbelbrocken zählt!', { hold: 2.0, size: 13, y: 0.36, color: '#d8b0ff' });
    }
  }

  appear() {
    const n = Math.max(0, Math.round(this.decoyN?.[Math.min(this.decoyN.length - 1, this.phase - 1)] ?? 0));
    const A = this.arena, R = A.r * (this.spec.ring ?? 0.55);
    const k = n + 1, rot = this.rnd.real(0, TAU), me = this.rnd.int(k);
    const spots = [];
    for (let i = 0; i < k; i++) { const a = rot + (i / k) * TAU; spots.push([A.x + Math.cos(a) * R, A.z - Math.sin(a) * R]); }
    const [mx, mz] = spots[me];
    this.pos.set(mx, A.y + 3, mz);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.visible = true;
    this.touch = true;
    this.landed = false;
    this.facePlayerNow();
    this.setState('appear');
    this.level.sfx('boss_spin');
    for (let i = 0; i < k; i++) {
      if (i === me) continue;
      const d = this.level.spawn('wirbelbrocken_attrappe', { pos: [spots[i][0], A.y + 3, spots[i][1]], owner: this, arena: { center: [A.x, A.y, A.z], r: A.r }, hp: this.maxHp });
      if (!d) continue;
      d.hp = this.hp;
      this.decoyList.push(d);
      this.decoysMade++;
    }
  }

  /** Alle Attrappen verpuffen lassen (Treffer am Original, Sieg; Neustart: sofort weg). */
  popDecoys(anim = true) {
    for (const d of this.decoyList) if (!d.removed) { if (anim) d.poof(false); else d.kill(); }
    this.decoyList.length = 0;
  }

  get decoys() { return this.decoyList.filter((d) => !d.removed && d.state !== 'poof').length; }

  // ------------------------------------------------------------------ Treffer

  get vulnerable() { return this.state === 'stunned'; }

  takeHit(where) {
    if (this.hp <= 0) return;
    this.hp--;
    this.hits++;
    this.hitLog.push({ where, t: +this.level.time.toFixed(2), hp: this.hp, state: this.state, decoys: this.decoys });
    this.popDecoys();
    this.setState('hit');
    this.vel.set(0, 0, 0);
    this.half.y = 1.05;
    this.level.sfx('boss_hit');
    this.level.sfx('stomp');
    this.level.shake(0.5);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 2, z: this.pos.z }, 18);
    this.level.onBossHit?.(this, where);
    if (this.hp <= 0) {
      this.defeated = true;
      this.touch = false;
      this.level.onBossDefeated?.(this);
    }
  }

  onCannon(ball) {
    if (this.state === 'wait' || this.state === 'intro' || this.state === 'hide' || this.state === 'hit' || this.state === 'teleport' || this.state === 'hidden' || this.hp <= 0 || !this.visible) {
      if (this.state === 'hide') { this.level.effects?.sparks(this.center(), 6); this.level.sfx('blockhit'); }
      return;
    }
    this.takeHit('cannon');
  }

  onHit(kind, source) {
    if (kind === 'cannon') this.onCannon(source);
    // alles andere zählt nicht (Feuer, Krallen, Panzer, Explosion, Stern, Riese)
  }

  onPlayer(player, contact) {
    if (!this.visible || this.hp <= 0) return 'none';
    switch (this.state) {
      case 'hit': case 'defeated': case 'flee': case 'gone': case 'teleport': case 'hidden': return 'none';
      case 'appear':
        if (contact.fromAbove || contact.pound) { this.level.sfx('bounce'); return 'stomp'; }
        return 'none';
      case 'stunned':
        if (contact.pound) { this.takeHit('stomp'); return 'none'; }
        if (contact.fromAbove) { this.takeHit('stomp'); return 'stomp'; }
        return 'none';                       // schwindelig harmlos
      case 'spin': return 'hurt';
      default:
        if (contact.fromAbove || contact.pound) { this.level.sfx('bounce'); return 'stomp'; }
        return 'hurt';
    }
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.touch = false;
    if (this.model) this.model.root.visible = false;
    this.level.effects?.dust(this.pos, 12, 1.6);
    if (!this.managed && !this.dropped && this.spec.drop) {
      this.dropped = true;
      spawnLoot(this.level, this.spec.drop, this.arena.x, this.arena.y + 0.5, this.arena.z);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state, hp = Math.max(0, this.hp);
    if (s === 'run') return { anim: 'run', speed: this.P.run, hp };
    if (s === 'spin') return { anim: 'spin', hp };
    if (s === 'hide') return { anim: 'hide', speed: this.P.hide, hp };
    if (s === 'hit') return { anim: 'hit', progress: Math.min(1, this.stateT / HIT), hp };
    if (s === 'stunned') return { anim: 'stunned', hp };
    if (s === 'defeated' || s === 'flee') return { anim: 'defeated', hp };
    if (s === 'teleport') return { anim: 'spin', hp };
    return { anim: 'idle', hp };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.visible;
    // Teleport (Welt 6): wirbelnd schrumpfen
    const k = this.state === 'teleport' ? Math.max(0.001, 1 - this.stateT / TELE) : 1;
    this.model.root.scale.setScalar(k);
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, hits: this.hits, hides: this.hides,
      spins: this.spinsDone, vulnerable: this.vulnerable, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2),
      teleports: this.teleports, decoys: this.decoys, decoysMade: this.decoysMade, decoysPopped: this.decoysPopped,
    };
  }

  dispose() {
    this.popDecoys(false);
    super.dispose();
  }
}

/**
 * Attrappe des Wirbelbrockens (Welt 6): sieht gleich aus, läuft/wirbelt/taumelt im Takt des Originals (eigene Lage), verletzt
 * mit den Fäusten; jede Berührung von oben bzw. jeder Angriff lässt sie verpuffen (zählt nicht als Treffer).
 */
class WirbelAttrappe extends Wirbelbrocken {
  constructor(level, spec) {
    super(level, { ...spec, decoys: null, decoyOf: true });
    this.kind = 'wirbelbrocken_attrappe';
    this.owner = spec.owner ?? null;
    this.decoy = true;
    this.boss = false;
    this.state = 'appear';
    this.stateT = 0;
    this.landed = false;
  }

  get phase() { return this.owner ? this.owner.phase : super.phase; }
  get managed() { return true; }
  syncArchPhase() {}

  update(dt) {
    this.stateT += dt;
    const o = this.owner;
    if (this.state === 'poof') { if (this.stateT >= POOF) this.kill(); return; }
    if (!o || o.removed || !['appear', 'run', 'spin', 'stunned'].includes(o.state)) { this.poof(false); return; }
    // im Takt des Originals
    if (o.state !== this.state && o.state !== 'appear') { this.state = o.state; this.stateT = o.stateT; this.spinsLeft = o.spinsLeft; this.spinsDone = o.spinsDone; }
    switch (this.state) {
      case 'appear':
        this.vel.x = 0; this.vel.z = 0;
        this.moveWithGravity(dt);
        this.facePlayer(dt, 6);
        if (this.grounded && !this.landed) { this.landed = true; this.level.effects?.dust(this.pos, 6, 1.2); }
        return;
      case 'run': this.chaseStep(dt, this.P.run); return;
      case 'spin': this.chaseStep(dt, this.P.spinSpeed); this.spinHurt(); return;
      default: this.stand(dt);
    }
  }

  /** Verpuffen (lila Rauch); popped = von der Figur aufgelöst. */
  poof(popped = true) {
    if (this.state === 'poof' || this.removed) return;
    this.setState('poof');
    this.touch = false;
    if (popped && this.owner) this.owner.decoysPopped++;
    this.level.sfx('vanish');
    this.level.effects?.sparks(this.center(), 8);
  }

  onCannon() { this.poof(); }

  onHit(kind) { if (kind !== 'bump') this.poof(); }

  onPlayer(player, contact) {
    if (this.state === 'poof' || !this.visible) return 'none';
    if (contact.fromAbove || contact.pound) { this.poof(); return contact.pound ? 'none' : 'stomp'; }
    if (this.state === 'stunned' || this.state === 'appear') return 'none';
    return 'hurt';
  }

  modelState() {
    if (this.state === 'poof') return { anim: 'poof', progress: Math.min(1, this.stateT / POOF) };
    return super.modelState();
  }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    this.model.root.visible = true;
    this.model.root.scale.setScalar(1);
  }

  info() { return { state: this.state, decoy: true, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2) }; }

  dispose() {
    this.removeShapes();
    if (this.model) { this.level.view.remove(this.model.root); this.model.dispose?.(); this.model = null; }
  }
}

export const KINDS = {
  wirbelbrocken: (level, spec) => new Wirbelbrocken(level, spec),
  wirbelbrocken_attrappe: (level, spec) => new WirbelAttrappe(level, spec),
};
