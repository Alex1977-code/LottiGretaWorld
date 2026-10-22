// Hüpfmaus und Stachel-Hüpfmaus (Bauplan Welt 2: „springt im Takt mit Spieler“, Konter: springen – stachelige
// Variante: nicht!).
//
// Läuft/patrouilliert mit kleinen Hüpfern (alle hopEvery s ≈ 0,25 m). Springt die nächste Figur (in sight m)
// ab, springt die Maus im selben Schritt mit (jump m hoch, Standard 1,6) – wer gleichzeitig mit ihr springt, landet
// leicht auf ihr bzw. muss den Sprung abpassen. In der Luft und bei der Landung zeigt das Modell die Hüpfpose.
// hüpfmaus: Draufspringen besiegt (platt), seitlich = Treffer; alles andere wie beim Pilzling.
// hüpfmaus_stachel: Stachelhelm – von oben (auch Stampfattacke darauf) verletzt sie die Figur. Besiegt nur durch
//   Feuer, Wurf (geworfener Rollpilz/Topfpflanze), Panzer, Tatzenhieb, Krallen-Sturzflug, Stampfwelle daneben
//   (Stampfattacke ≤ 1,6 m neben ihr), Explosion, Kanonenkugel, Riesentrank, Funkelstern.
//
// Daten: { kind: 'huepfmaus' | 'huepfmaus_stachel', pos, path?, loop?, dir?, speed?: 1.4, jump?: 1.6 m,
//          sight?: 8 m (springt mit, wenn eine Figur so nah ist), hopEvery?: 0.55 s, edges?, wake?, drop? }
// Zustände: idle → walk ⇄ hop (kleiner Hüpfer) | jump (Mitsprung) → land (0,18 s) → walk …; squashed | flipped.
// Laufzeit: jumps (Zahl der Mitsprünge). Modelle 'huepfmaus' / 'huepfmaus_stachel'
// (state { anim: idle|walk|hop|land|squashed|stunned, speed, progress }).

import { EnemyW2, figures, playerJumped, STRONG } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const G = 40;
const HOP_VY = Math.sqrt(2 * G * 0.25);

class Huepfmaus extends EnemyW2 {
  constructor(level, spec, spiky) {
    super(level, spec, spiky ? 'huepfmaus_stachel' : 'huepfmaus');
    this.spiky = spiky;
    this.half.set(0.28, spiky ? 0.38 : 0.34, 0.28);
    this.shadow = 0.36;
    this.speed = spec.speed ?? 1.4;
    this.jumpH = spec.jump ?? 1.6;
    this.sight = spec.sight ?? 8;
    this.hopEvery = spec.hopEvery ?? 0.55;
    this.hopT = this.hopEvery * 0.5;
    this.jumps = 0;
    this.airT = 0;
    this.flight = 0.5;
    if (level.view) this.setModel(getModel(this.kind));
    this.initShadows(1);
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    // Mitsprung: springt eine Figur in Sichtweite ab, springt die Maus mit (auch aus einem kleinen Hüpfer heraus)
    if (this.state !== 'idle' && this.state !== 'jump' && this.grounded && this.figureJumped()) this.leap(this.jumpH, 'jump');
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        break;
      case 'walk':
        this.walk(dt, this.speed);
        this.hopT -= dt;
        if (this.hopT <= 0 && this.grounded) { this.hopT = this.hopEvery; this.leap(0.25, 'hop'); }
        break;
      case 'hop':
      case 'jump': {
        this.airT += dt;
        this.walk(dt, this.state === 'jump' ? this.speed * 0.6 : this.speed);
        if (this.grounded && this.airT > 0.05) { this.setState('land'); if (this.jumpH > 1) this.level.effects?.dust(this.pos, 2, 0.5); }
        break;
      }
      case 'land':
        this.walk(dt, this.speed * 0.3);
        if (this.stateT >= 0.18) this.setState('walk');
        break;
      default: break;
    }
  }

  figureJumped() {
    for (const p of figures(this.level)) {
      if (!playerJumped(p)) continue;
      if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.sight && Math.abs(p.pos.y - this.pos.y) < 4) return true;
    }
    return false;
  }

  leap(h, state) {
    this.vel.y = h > 0.3 ? Math.sqrt(2 * G * h) : HOP_VY;
    this.flight = (2 * this.vel.y) / G;
    this.grounded = false;
    this.airT = 0;
    this.setState(state);
    if (state === 'jump') { this.jumps++; this.level.sfx('hop'); }
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.slideAttack(player, contact)) return 'none';
    if (this.spiky) return 'hurt';
    return super.onPlayer(player, contact);
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (STRONG.has(kind)) { this.flip(source); return; }
    if (kind === 'pound') {
      // Stampfwelle daneben: auf gleicher Höhe besiegt (Stachel: wegfliegen, sonst platt)
      if (source && Math.abs(source.pos.y - this.pos.y) < 0.8) { if (this.spiky) this.flip(source); else { this.squash(); this.level.sfx('stomp'); } }
      return;
    }
    this.flip(source);
  }

  modelState() {
    const s = this.state;
    if (s === 'hop' || s === 'jump') return { anim: 'hop', progress: Math.min(1, this.airT / Math.max(0.1, this.flight)) };
    if (s === 'land') return { anim: 'land' };
    if (s === 'walk') return { anim: 'walk', speed: this.speed };
    if (s === 'squashed') return { anim: 'squashed' };
    if (s === 'flipped') return { anim: 'stunned' };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() { return { state: this.state, jumps: this.jumps, y: +this.pos.y.toFixed(2), defeated: this.defeated }; }
}

export const KINDS = {
  huepfmaus: (level, spec) => new Huepfmaus(level, spec, false),
  huepfmaus_stachel: (level, spec) => new Huepfmaus(level, spec, true),
};
