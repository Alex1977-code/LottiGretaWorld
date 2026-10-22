// Hackvogel (Bauplan Welt 2: „pickt im Takt nach vorn“, Konter: hinter ihm springen).
//
// Verhalten: steht (oder patrouilliert auf path) und hackt im festen Takt nach vorn: ausholen (wind 0,35 s, lehnt
// sich zurück und zittert – Ankündigung) → hacken (peck 0,1 s, der Meißelschnabel schlägt ≈ 1,05 m vor dem Fußpunkt
// in den Boden) → steckt fest (stuck, Standard 0,8 s, zerrt und zappelt) → zieht heraus (0,25 s) → Pause bis zum
// nächsten Takt. Mit track: true dreht er sich in der Pause zur nächsten Figur (sonst behält er seine Richtung).
// Der Schnabel trifft die Figur beim Hacken (Strecke Kopf → Spitze). Blöcke an der Schnabelspitze (Steinblock,
// Ziegel – Formen mit mega/breakable) zerhackt er (onHit('peck') und onHit('bomb'), Bauplan 2-1: eingeschlossener
// Hackvogel zerhackt seinen Block).
// Konter: Draufspringen besiegt ihn, wenn der Schnabel feststeckt oder man von hinten kommt; von vorn (Schnabel
// frei) prallt man nur ab. Seitlich/vorn = Treffer. Stampfattacke von oben, Feuer, Krallen, Panzer, Wurf, Explosion,
// Kanonenkugel, Riesentrank, Funkelstern besiegen ihn immer.
//
// Daten: { kind: 'hackvogel', pos, yaw?|dir? (Hack-Richtung), path?, loop?, speed?: 1.2 (Patrouille),
//          period?: 2.0 s (Takt: Beginn eines Hiebs bis zum nächsten, mindestens Hieb + 0,3 s), stuck?: 0.8 s,
//          phase?: 0..1 (Versatz im Takt),
//          track?: false, sight?: 9 m (hackt nur, wenn eine Figur so nah ist; 0 = immer), wake?, drop? }
// Zustände: idle (außer Reichweite) → walk|stand → wind → peck → stuck → pull → walk|stand …; squashed | flipped.
// Modell 'hackvogel' (state { anim: idle|walk|wind|peck|stuck|squashed, speed, progress }).
// Laufzeit: pecks (Zahl der Hiebe), beakTip() → Weltpunkt der Schnabelspitze (deterministisch).

import { EnemyW2, toWorld, figures, activeFigure, STRONG } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const WIND = 0.35, PECK = 0.1, PULL = 0.25;
const TIP = 1.05;           // Schnabelspitze vor dem Fußpunkt beim Hacken
const HEAD = { x: 0.32, y: 1.45 };   // Kopf (Schnabelwurzel) in Ruhe

class Hackvogel extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'hackvogel');
    this.half.set(0.38, 0.8, 0.38);
    this.shadow = 0.55;
    this.speed = spec.speed ?? 1.2;
    this.period = Math.max(WIND + PECK + PULL + 0.3, spec.period ?? 2.0);
    this.stuckTime = spec.stuck ?? 0.8;
    this.track = !!spec.track;
    this.sight = spec.sight ?? 9;
    this.cool = 0.4 + (spec.phase ?? 0) * this.period;  // s bis zum nächsten Ausholen
    this.pecks = 0;
    this.blocksHit = 0;
    this._tip = { x: 0, y: 0, z: 0 };
    this._seg = { x: 0, y: 0, z: 0 };
    if (level.view) this.setModel(getModel('hackvogel'));
    this.initShadows(2);
  }

  get rest() { return this.path ? 'walk' : 'stand'; }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState(this.rest);
        break;
      case 'walk':
      case 'stand':
        if (this.state === 'walk') this.walk(dt, this.speed); else this.stand(dt);
        if (this.track && this.canSee(this.sight || 12, 3)) this.facePlayer(dt, 3);
        if (this.cool > 0) this.cool -= dt;
        if (this.cool <= 0 && this.wantsPeck()) this.setState('wind');
        break;
      case 'wind':
        this.stand(dt);
        if (this.stateT >= WIND) { this.setState('peck'); this.level.sfx('peck'); }
        break;
      case 'peck':
        this.stand(dt);
        this.strike(Math.min(1, this.stateT / PECK));
        if (this.stateT >= PECK) {
          this.pecks++;
          this.chopBlocks();
          this.level.effects?.dust(this.beakTip(), 3, 0.5);
          this.setState('stuck');
        }
        break;
      case 'stuck':
        this.stand(dt);
        if (this.stateT < 0.08) this.strike(1);
        if (this.stateT >= this.stuckTime) this.setState('pull');
        break;
      case 'pull':
        this.stand(dt);
        if (this.stateT >= PULL) { this.setState(this.rest); this.cool = Math.max(0.3, this.period - (WIND + PECK + this.stuckTime + PULL)); }
        break;
      default: break;
    }
  }

  /** Hackt nur, wenn eine Figur in Sichtweite ist (sight 0 = immer). */
  wantsPeck() {
    if (!this.sight) return true;
    return this.canSee(this.sight, 4);
  }

  /** Schnabelspitze (Welt) beim Hacken bzw. Feststecken; sonst in Ruhe vor dem Kopf. */
  beakTip(out = this._tip) {
    const s = this.state;
    if (s === 'peck' || s === 'stuck') {
      const k = s === 'peck' ? Math.min(1, this.stateT / PECK) : 1;
      return toWorld(this.pos, this.yaw, 1.0 + (TIP - 1.0) * k, 1.45 * (1 - k) - 0.06 * k, 0, out);
    }
    return toWorld(this.pos, this.yaw, 1.0, 1.45, 0, out);
  }

  /** Schnabel-Strecke Kopf → Spitze trifft eine Figur (k = Fortschritt des Hiebs). */
  strike(k) {
    const tip = this.beakTip();
    const hx = this.pos.x + Math.cos(this.yaw) * HEAD.x, hz = this.pos.z - Math.sin(this.yaw) * HEAD.x, hy = this.pos.y + HEAD.y * (1 - 0.3 * k);
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      const c = p.center(), h = p.half;
      for (let i = 0; i <= 6; i++) {
        const u = 0.3 + (i / 6) * 0.7;
        const x = hx + (tip.x - hx) * u, y = hy + (tip.y - hy) * u, z = hz + (tip.z - hz) * u;
        if (Math.abs(x - c.x) < h.x + 0.08 && Math.abs(z - c.z) < h.z + 0.08 && Math.abs(y - c.y) < h.y + 0.08) { p.hurt(this); break; }
      }
    }
  }

  /** Blöcke an der Schnabelspitze zerhacken (Steinblock, Ziegel, Kiste …). */
  chopBlocks() {
    const tip = this.beakTip();
    const hx = this.pos.x + Math.cos(this.yaw) * 0.7, hz = this.pos.z - Math.sin(this.yaw) * 0.7;
    const done = new Set();
    for (const [x, y, z] of [[tip.x, tip.y + 0.15, tip.z], [hx, this.pos.y + 0.7, hz], [(tip.x + hx) / 2, this.pos.y + 0.35, (tip.z + hz) / 2]]) {
      for (const s of this.level.world.overlapAABB({ x, y, z }, { x: 0.12, y: 0.12, z: 0.12 })) {
        const o = s.owner;
        if (!o || o === this || done.has(o) || !(s.mega || s.breakable) || typeof o.onHit !== 'function') continue;
        done.add(o);
        o.onHit('peck', this, s);
        if (o.alive !== false && !o.removed) o.onHit('bomb', this, s);
        this.blocksHit++;
        this.level.sfx('brickbreak');
      }
    }
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.onStomp(player); return 'none'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (contact.fromAbove) {
      const f = this.facing(), dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
      const behind = dx * f.x + dz * f.z < 0.05;
      if (this.state === 'stuck' || this.state === 'pull' || behind) { this.onStomp(player); return 'stomp'; }
      this.level.sfx('bounce');
      return 'stomp';            // Schnabel frei, von vorn: nur Abprall
    }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'peck') return;
    if (STRONG.has(kind)) { this.flip(source); return; }
    super.onHit(kind, source);
  }

  modelState() {
    const s = this.state;
    if (s === 'wind') return { anim: 'wind', progress: Math.min(1, this.stateT / WIND) };
    if (s === 'peck') return { anim: 'peck', progress: Math.min(1, this.stateT / PECK) };
    if (s === 'stuck') return { anim: 'stuck' };
    if (s === 'squashed') return { anim: 'squashed' };
    if (s === 'walk') return { anim: 'walk', speed: this.speed };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() { return { state: this.state, pecks: this.pecks, blocks: this.blocksHit, defeated: this.defeated }; }
}

export const KINDS = { hackvogel: (level, spec) => new Hackvogel(level, spec) };
