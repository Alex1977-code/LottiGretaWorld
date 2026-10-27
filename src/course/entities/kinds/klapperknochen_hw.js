// Klapperknochen – niedliches Skelett der Halloween-Welt „Kürbisinsel“ (H-3 Nebelfriedhof). Eigene Figur.
//
// Läuft klappernd hin und her (Patrouille mit Umkehr an Kanten/Wänden; behavior 'chase': folgt einer Figur ≤ sight m).
// **Draufspringen** (Abprall) bzw. Stampfattacke auf den stehenden Klapperknochen → er **fällt zu einem Knochenhaufen
// zusammen** (collapse 0,5 s). Der Haufen ist **harmlos und begehbar** (Berührung tut nichts, man läuft hindurch). Nach
// pile s (Standard 4, gezählt ab dem Zusammenfallen) **setzt er sich klappernd wieder zusammen**: zuerst **zittern die
// Knochen** (warn s, Standard 0,8 – Vorwarnung, Klapper-Geräusch), dann rebuild (0,8 s, harmlos) und er läuft weiter.
// Eine Stampfattacke auf den Stehenden wirft ihn nur um (ihre eigene Stampfwelle zählt dann nicht).
// **Endgültig besiegt** nur durch: **Stampfattacke auf den Haufen** (bzw. Stampfwelle daneben, solange er liegt), Feuer,
// Krallen (Tatzenhieb/Sturzflug), Panzer, Explosion, Kanonenkugel, Funkelstern, Riesentrank, Rutschen → defeated (zerfällt
// und verblasst, 0,9 s), Beute drop. Seitliche Berührung des stehenden Klapperknochens verletzt.
//
// Daten: { kind: 'klapperknochen', pos, path?, loop?, dir?, speed?: 1.2, behavior?: 'walk' | 'chase', sight?: 6,
//          chaseSpeed?: 1.6, pile?: 4 (s bis zum Wiederaufbau), warn?: 0.8 (s Zittern davor), wake?, edges?, drop? }
// Zustände: idle → walk ⇄ collapse (0,5 s) → pile → shiver (warn s) → rebuild (0,8 s) → walk; defeated (0,9 s, dann weg).
// Laufzeit: collapses, rebuilds, pileLeft (s bis zum Wiederaufbau), info(). Hülle stehend 0,6 × 1,1 × 0,6 m, liegend
// 0,9 × 0,36 × 0,9 m. Modell 'klapperknochen' (state { anim: walk|idle|collapse|pile|rebuild|defeated, speed, progress }).

import { EnemyW2, clamp, STRONG } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const COLLAPSE = 0.5, REBUILD = 0.8, DEFEAT = 0.9;
/** Diese Treffer besiegen ihn immer (auch stehend). */
const FINAL = new Set(['fire', 'claw', 'shell', 'cannon', 'slide', 'punch', ...STRONG]);
const LYING = new Set(['collapse', 'pile', 'shiver']);

class Klapperknochen extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'klapperknochen');
    this.shadow = 0.4;
    this.speed = spec.speed ?? 1.2;
    this.chaseSpeed = spec.chaseSpeed ?? 1.6;
    this.behavior = spec.behavior ?? 'walk';
    this.sight = spec.sight ?? 6;
    this.pileTime = spec.pile ?? 4;
    this.warnTime = spec.warn ?? 0.8;
    this.collapses = 0;
    this.rebuilds = 0;
    this.rattleT = 0;
    this.grace = 0;
    this.poundGuard = 0;
    this.state = 'idle';
    this.standHalf();
    if (level.view) this.setModel(getModel('klapperknochen'));
    this.initShadows(2);
  }

  standHalf() { this.half.set(0.3, 0.55, 0.3); }
  pileHalf() { this.half.set(0.45, 0.18, 0.45); }

  get lying() { return LYING.has(this.state); }
  /** s bis zum Wiederaufbau (liegend), sonst 0. */
  get pileLeft() { return this.lying ? Math.max(0, this.pileTime - this.lieT) : 0; }

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.poundGuard > 0) this.poundGuard -= dt;
    if (this.rattleT > 0) this.rattleT -= dt;
    if (this.state === 'defeated') { this.stand(dt); if (this.stateT >= DEFEAT) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    if (this.lying) this.lieT += dt;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        return;
      case 'walk':
        if (this.behavior === 'chase' && this.canSee(this.sight, 2)) this.chase(dt, this.chaseSpeed);
        else this.walk(dt, this.speed);
        return;
      case 'collapse':
        this.stand(dt);
        if (this.stateT >= COLLAPSE) this.setState('pile');
        return;
      case 'pile':
        this.stand(dt);
        if (this.lieT >= this.pileTime - this.warnTime) { this.setState('shiver'); this.level.sfx('blockhit'); }
        return;
      case 'shiver':
        this.stand(dt);
        if (this.rattleT <= 0) { this.rattleT = 0.27; this.level.sfx('step'); }
        if (this.lieT >= this.pileTime) { this.setState('rebuild'); this.standHalf(); this.level.sfx('switch'); }
        return;
      case 'rebuild':
        this.stand(dt);
        if (this.stateT >= REBUILD) { this.rebuilds++; this.grace = 0.35; this.setState('walk'); }
        return;
      default: this.stand(dt);
    }
  }

  /** Zusammenfallen (Draufspringen, Stampfattacke auf den Stehenden). */
  collapse() {
    if (this.defeated || this.lying) return false;
    this.collapses++;
    this.lieT = 0;
    this.vel.x = 0; this.vel.z = 0;
    this.pileHalf();
    this.setState('collapse');
    this.level.sfx('blockhit');
    this.level.effects?.dust(this.pos, 5, 0.9);
    return true;
  }

  /** Endgültig besiegt: zerfällt und verblasst. */
  finish(source) {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.level.sfx('vanish');
    this.level.effects?.sparks(this.center(), 10);
    this.level.effects?.dust(this.pos, 8, 1.1);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.lying) {
      // Haufen: harmlos und begehbar – nur die Stampfattacke besiegt ihn
      if (contact.pound && this.poundGuard <= 0) { this.finish(player); return 'none'; }
      if (contact.fromAbove && this.rattleT <= 0) { this.rattleT = 0.4; this.level.sfx('step'); }
      return 'none';
    }
    if (this.state === 'rebuild') {
      if (contact.fromAbove || contact.pound) { this.collapse(); return contact.pound ? 'none' : 'stomp'; }
      return 'none';
    }
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.collapse(); this.poundGuard = 0.4; return 'none'; }
    if (contact.fromAbove) { this.collapse(); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.grace > 0) return 'none';
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (FINAL.has(kind)) { this.finish(source); return; }
    if (kind === 'pound') {
      if (source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.8) return;
      if (this.poundGuard > 0) return;   // Stampfwelle derselben Stampfattacke, die ihn gerade umgeworfen hat
      if (this.lying) this.finish(source); else this.collapse();
      return;
    }
    if (kind === 'bump' && !this.lying) { this.collapse(); return; }
    if (kind === 'throw') { if (this.lying) this.finish(source); else this.collapse(); }
  }

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated', progress: Math.min(1, this.stateT / DEFEAT) };
    if (s === 'collapse') return { anim: 'collapse', progress: Math.min(1, this.stateT / COLLAPSE) };
    if (s === 'pile' || s === 'shiver') return { anim: 'pile' };
    if (s === 'rebuild') return { anim: 'rebuild', progress: Math.min(1, this.stateT / REBUILD) };
    if (s === 'walk') return { anim: 'walk', speed: Math.hypot(this.vel.x, this.vel.z) || this.speed };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    // Vorwarnung: die Knochen zittern (stärker kurz vor dem Aufstehen)
    if (this.state === 'shiver') {
      const k = 0.02 + 0.03 * clamp(this.stateT / this.warnTime, 0, 1), t = this.level.time;
      r.position.x += Math.sin(t * 71) * k; r.position.z += Math.cos(t * 59) * k;
      r.position.y += Math.abs(Math.sin(t * 43)) * k;
    }
  }

  info() {
    return {
      state: this.state, collapses: this.collapses, rebuilds: this.rebuilds, defeated: this.defeated, lying: this.lying,
      pileLeft: +this.pileLeft.toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { klapperknochen: (level, spec) => new Klapperknochen(level, spec) };
