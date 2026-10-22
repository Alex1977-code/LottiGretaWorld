// Feuer-Schnappblume (Bauplan Welt 2/2-Panzer: Feuer-Schnappblume – zielt und spuckt Feuer).
//
// Steht fest (Topf, Boden oder Röhre; bewegte Plattformen tragen sie mit). Ist eine Figur in range m, dreht sie sich
// zu ihr und neigt den Kopf (aim) – nach pause s spuckt sie (spit 0,8 s: Backen aufblasen = Ankündigung, bei 50 %
// verlässt die Feuerkugel das Maul = model.mouth()). Die Feuerkugel (entities/kinds/geschosse.js, mode 'straight')
// fliegt gerade auf die Stelle zu, an der die Figur beim Ausholen war, und verlischt am ersten Hindernis. Mit
// burst > 1 spuckt sie mehrere hintereinander (je 0,8 s).
// Konter: Feuer, Wurf (Rollpilz/Topfpflanze), Stampfwelle daneben (≤ 1,6 m), Panzer, Tatzenhieb, Krallen-Sturzflug,
// Explosion, Kanonenkugel, Riesentrank, Funkelstern besiegen sie (hp Treffer, danach 1,1 s Schonzeit). Der glühende
// Kopf verletzt bei jeder Berührung – auch von oben.
//
// Daten: { kind: 'feuer_schnappblume', pos, base?: 'pot'|'ground'|'pipe' (Standard 'pot'), yaw?|dir? (Ruhe-Blick),
//          range?: 9 m, pause?: 1.4 s, burst?: 1, speed?: 5.5 m/s (Feuerkugel), hp?: 1, drop? }
//   Beispiel: { kind: 'feuer_schnappblume', pos: [3, 2.2, -50], base: 'pipe', range: 10 }
// Zustände: idle → aim → spit → aim … | hit (0,5 s) | retreat (besiegt, sinkt in 0,6 s weg). Laufzeit: spits.
// Modell 'feuer_schnappblume' (opts { base }, state { anim: idle|aim|spit|retreat|hit, aim, progress }).

import { EnemyW2, localOffset, toWorld, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const SPIT = 0.8, RELEASE = 0.4;
const TOP = { pot: 0.38, ground: 0.1, pipe: 0 };

class FeuerSchnappblume extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'feuer_schnappblume');
    this.base = ['pot', 'ground', 'pipe'].includes(spec.base) ? spec.base : 'pot';
    const top = TOP[this.base];
    this.half.set(0.34, (top + 0.95) / 2, 0.34);
    this.shadow = 0.45;
    this.wake = 0;
    this.hp = spec.hp ?? 1;
    this.range = spec.range ?? 9;
    this.pause = spec.pause ?? 1.4;
    this.burst = Math.max(1, spec.burst ?? 1);
    this.shotSpeed = spec.speed ?? 5.5;
    this.restYaw = this.yaw;
    this.tilt = 0;
    this.invuln = 0;
    this.left = 0;
    this.spits = 0;
    this.released = false;
    this.aimAt = null;
    let model = null;
    if (level.view) model = this.setModel(getModel('feuer_schnappblume', { base: this.base }));
    this.mouthOff = localOffset(`fsb:${this.base}`, model, { anim: 'spit', progress: 0.5, aim: 0 }, (o) => model.mouth(o), { x: 0.45, y: top + 0.55, z: 0 });
    if (model) model.update(0.01, { anim: 'idle' });
    this.initShadows(3);
  }

  get progress() { return this.state === 'spit' ? Math.min(1, this.stateT / SPIT) : 0; }

  /** Weltpunkt vor dem Maul (mit Kopfneigung). */
  mouth(out = {}) {
    const m = this.mouthOff;
    const r = Math.hypot(m.x, 0.28);
    return toWorld(this.pos, this.yaw, m.x, m.y + Math.sin(this.tilt) * r, m.z, out);
  }

  update(dt) {
    this.stateT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.stand(dt);
    if (this.state === 'retreat') { if (this.stateT > 0.6) this.kill(); return; }
    if (this.state === 'flipped') { this.state = 'retreat'; this.stateT = 0; return; }
    const near = this.poundLandedNear(1.6);
    if (near) this.onHit('pound', near);
    if (this.state === 'retreat') return;
    const sees = () => this.canSee(this.range, 5);
    switch (this.state) {
      case 'idle':
        this.faceToward(Math.cos(this.restYaw), -Math.sin(this.restYaw), dt, 2);
        this.tilt += (0 - this.tilt) * Math.min(1, dt * 3);
        if (sees()) this.setState('aim');
        break;
      case 'aim':
        this.track(dt, 6);
        if (!this.canSee(this.range + 0.5, 5)) this.setState('idle');
        else if (this.stateT > this.pause) { this.left = this.burst; this.startSpit(); }
        break;
      case 'spit':
        if (this.stateT < RELEASE * 0.75) this.track(dt, 4);
        if (!this.released && this.stateT >= RELEASE) { this.released = true; this.spit(); }
        if (this.stateT >= SPIT) {
          this.left--;
          if (this.left > 0 && sees()) this.startSpit();
          else this.setState(sees() ? 'aim' : 'idle');
        }
        break;
      case 'hit':
        if (this.stateT > 0.5) this.setState(sees() ? 'aim' : 'idle');
        break;
      default: break;
    }
  }

  /** Zur Figur drehen und den Kopf neigen. */
  track(dt, rate) {
    const p = this.player;
    if (!p) return;
    this.facePlayer(dt, rate);
    const m = this.mouth({});
    const c = p.center();
    const want = clamp(Math.atan2(c.y - m.y, Math.hypot(c.x - m.x, c.z - m.z)), -1, 0.8);
    this.tilt += (want - this.tilt) * Math.min(1, dt * rate);
    this.aimAt = { x: c.x, y: c.y, z: c.z };
  }

  startSpit() {
    this.setState('spit');
    this.released = false;
  }

  spit() {
    const m = this.mouth({});
    const t = this.aimAt ?? (this.player ? this.player.center() : { x: m.x + Math.cos(this.yaw), y: m.y, z: m.z - Math.sin(this.yaw) });
    let dx = t.x - m.x, dy = t.y - m.y, dz = t.z - m.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    const s = this.shotSpeed;
    this.level.spawn('feuerkugel', { pos: [m.x, m.y - 0.17, m.z], vel: [dx * s, dy * s, dz * s], mode: 'straight', owner: this });
    this.spits++;
    this.level.sfx('fireball');
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'retreat') return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'retreat') return;
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    if (kind === 'bump') return;
    if (kind === 'mega' || kind === 'star' || kind === 'cannon' || kind === 'bomb') { this.hp = 0; this.defeat(); return; }
    if (this.invuln > 0) return;
    this.hp--;
    if (this.hp <= 0) { this.defeat(); return; }
    this.setState('hit');
    this.invuln = 1.1;
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.mouth({}), 8);
  }

  defeat() {
    this.setState('retreat');
    this.touch = false;
    this.level.sfx('stomp');
    const m = this.mouth({});
    this.level.effects?.sparks(m, 14);
    this.level.effects?.debris(m, 0xff4a1a, 6);
    this.markDefeated();
  }

  modelState() {
    const s = this.state;
    if (s === 'spit') return { anim: 'spit', aim: this.tilt, progress: this.progress };
    if (s === 'aim') return { anim: 'aim', aim: this.tilt };
    if (s === 'retreat') return { anim: 'retreat' };
    if (s === 'hit') return { anim: 'hit', progress: Math.min(1, this.stateT / 0.5) };
    return { anim: 'idle', aim: this.tilt };
  }

  info() { return { state: this.state, spits: this.spits, hp: this.hp, tilt: +this.tilt.toFixed(3), defeated: this.defeated }; }
}

export const KINDS = { feuer_schnappblume: (level, spec) => new FeuerSchnappblume(level, spec) };
