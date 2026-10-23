// Schneesäule (Bauplan Welt 3: „segmentierter Kaktus“, Konter: Segmente einzeln wegschlagen).
//
// Gestapelte Schneeball-Segmente mit Eisstacheln, oben ein Kopf. Wandert (geradeaus, auf path) oder folgt der nächsten
// Figur (behavior 'chase'). Jeder Treffer nimmt **ein** Segment ab – das unterste zuerst, der Kopf sinkt nach und geht
// zuletzt: Draufspringen auf den Kopf (Abprall), Stampfattacke, Krallen/Tatzenhieb, Panzer, Wurf (Schneeball,
// Topfpflanze), Biss, Rutschen, Schwanzhieb und unbekannte Angriffsarten. **Feuer schmilzt** die ganze Säule auf
// einmal (Dampf), ebenso starke Treffer (Kanonenkugel, Explosion, Riesentrank, Funkelstern). Nach jedem Treffer ist sie
// 0,45 s unempfindlich (staucht sich). Seitliche Berührung (Stacheln) verletzt. Lava/Absturz wie Welt 2.
//
// Daten: { kind: 'schneesaeule', pos, segments?: 4 (3–5, Kopf mitgezählt), behavior?: 'walk' | 'chase' (Standard
//          'walk'), speed?: 0.9, chaseSpeed?: 1.4, sight?: 8, path?, loop?, dir?, edges?, wake?, drop? }
//   Beispiel: { kind: 'schneesaeule', pos: [0, 1, -20], segments: 5, behavior: 'chase' }
// Zustände: idle → walk | chase → hit (0,45 s) → … → melt | squashed (letztes Segment) | flipped.
// Laufzeit: segments (übrig, inkl. Kopf), maxSegments, lost (abgeschlagene Segmente), melted.
// Modell 'schneesaeule' (opts { segments }, state { anim: walk|idle|hit|defeated, speed, segments });
// Höhe = root.userData.height(segments).

import { EnemyW2, STRONG, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const HIT = 0.45, DEFEAT = 1.2;
const SEG_R = 0.29, SEG_SY = 0.86, SEG_STEP = 0.45, HEAD_R = 0.34;
/** Höhe der Kopfoberkante bei k Segmenten (wie das Modell). */
const heightOf = (k) => SEG_R * SEG_SY + (k - 1) * SEG_STEP + HEAD_R * 0.95;

class Schneesaeule extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'schneesaeule');
    this.maxSegments = clamp(Math.round(spec.segments ?? 4), 3, 5);
    this.segments = this.maxSegments;
    this.lost = 0;
    this.melted = false;
    this.speed = spec.speed ?? 0.9;
    this.chaseSpeed = spec.chaseSpeed ?? 1.4;
    this.behavior = spec.behavior ?? 'walk';
    this.sight = spec.sight ?? 8;
    this.shadow = 0.42;
    this.guard = 0;
    this.sizeUp();
    if (level.view) {
      this.setModel(getModel('schneesaeule', { segments: this.maxSegments }));
      const h = this.model?.root?.userData?.height;
      if (typeof h === 'function') this.heightFn = h;
    }
    this.initShadows(2);
  }

  /** Hülle an die Zahl der Segmente anpassen (Kopf sinkt nach). */
  sizeUp() {
    const h = (this.heightFn ?? heightOf)(this.segments);
    this.half.set(0.32, h / 2, 0.32);
  }

  update(dt) {
    this.stateT += dt;
    if (this.guard > 0) this.guard -= dt;
    if (this.state === 'melt') {
      this.stand(dt);
      if (this.stateT > DEFEAT) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        break;
      case 'walk':
        this.walk(dt, this.speed);
        if (this.behavior === 'chase' && this.canSee(this.sight, 2.5)) this.setState('chase');
        break;
      case 'chase':
        this.chase(dt, this.chaseSpeed);
        if (!this.canSee(this.sight * 1.6, 3.5)) this.setState('walk');
        break;
      case 'hit':
        this.stand(dt);
        if (this.stateT >= HIT) this.setState(this.behavior === 'chase' && this.canSee(this.sight, 2.5) ? 'chase' : 'walk');
        break;
      default: break;
    }
  }

  /** Ein Segment abschlagen (das unterste; der Kopf geht zuletzt). true = Säule besiegt. */
  loseSegment(source, how = 'hit') {
    if (this.defeated || this.guard > 0) return false;
    this.lost++;
    this.level.sfx('snowball');
    const y = this.pos.y + SEG_R * SEG_SY;
    this.level.effects?.debris({ x: this.pos.x, y, z: this.pos.z }, 0xeef6ff, 8);
    this.level.effects?.dust(this.pos, 4, 0.8);
    if (this.segments <= 1) {
      this.segments = 0;
      if (how === 'stomp') this.squash(DEFEAT); else this.flip(source, 6);
      return true;
    }
    this.segments--;
    this.sizeUp();
    this.guard = HIT;
    this.setState('hit');
    return false;
  }

  /** Feuer/starke Treffer: ganze Säule schmilzt bzw. zerfällt. */
  melt(source, steam = true) {
    if (this.defeated) return;
    this.melted = steam;
    this.lost += this.segments;
    this.setState('melt');
    this.touch = false;
    this.vel.set(0, 0, 0);
    if (steam) {
      this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + this.half.y, z: this.pos.z }, 10, 1.4);
      this.level.sfx('fireball');
    } else this.level.effects?.debris(this.center(), 0xeef6ff, 14);
    this.level.sfx('snowball');
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.loseSegment(player, 'stomp'); return 'none'; }
    if (contact.fromAbove) { this.loseSegment(player, 'stomp'); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.guard > 0 && this.state === 'hit') return 'none';   // staucht sich gerade (kurz harmlos)
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'fire') { this.melt(source, true); return; }
    if (STRONG.has(kind)) { this.melt(source, false); return; }
    if (kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    this.loseSegment(source, 'hit');
  }

  modelState() {
    const s = this.state;
    const seg = Math.max(1, this.segments);
    if (s === 'melt' || s === 'squashed' || s === 'flipped') return { anim: 'defeated', segments: Math.max(1, this.segments || 1) };
    if (s === 'hit') return { anim: 'hit', segments: seg };
    if (s === 'walk' || s === 'chase') return { anim: 'walk', speed: s === 'chase' ? this.chaseSpeed : this.speed, segments: seg };
    return { anim: 'idle', segments: seg };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    // Schmelzen: sackt in sich zusammen
    if (this.state === 'melt') { const k = Math.min(1, this.stateT / DEFEAT); r.scale.set(1 + k * 0.4, Math.max(0.05, 1 - k), 1 + k * 0.4); }
    else r.scale.set(1, 1, 1);
  }

  info() {
    return { state: this.state, segments: this.segments, max: this.maxSegments, lost: this.lost, melted: this.melted, h: +(this.half.y * 2).toFixed(2), defeated: this.defeated };
  }
}

export const KINDS = { schneesaeule: (level, spec) => new Schneesaeule(level, spec) };
