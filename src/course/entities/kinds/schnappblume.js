// Schnappblume und Riesenschnappblume (Bauplan: „statisch, schnappt“, Konter: Feuer / Stampfen von der Seite;
// Riesen-Variante: großer Radius, mehrfach treffen).
//
// Verhalten: steht fest (Topf, Boden oder Röhre; bewegte Plattformen tragen sie mit). Kommt die Figur in Reichweite,
// dreht sie sich zu ihr und schnappt im Takt: ausholen (Kopf zurück, Maul auf – Ankündigung) → zuschnappen nach
// vorn (Treffer im Kopfbereich, reach m weit) → zurück → Pause. Entscheidung (dokumentiert): der Kopf ist stachelig
// und beißt auch nach oben – Draufspringen und Stampfen *auf* die Blume verletzen die Figur. Verwundbar ist sie
// nur seitlich bzw. aus der Ferne: Feuerball, Tatzenhieb, Krallen-Sturzflug, Panzer, Wurf, Explosion,
// Stampfattacke direkt *neben* ihr (bis 1,6 m vom Rand), Riesentrank/Funkelstern.
//
// Daten: { kind: 'schnappblume', pos, base?: 'pot'|'ground'|'pipe' (Standard 'pot'), yaw?|dir? (Ruhe-Blick),
//          range?: 3.4 m (ab hier schnappt sie), reach?: 1.35 m (Kopf vor der Mitte beim Zuschnappen),
//          pause?: 0.7 s (zwischen zwei Schnappern), hp?: 1, drop? }
//        { kind: 'riesenschnappblume', pos, base?: 'ground', range?: 7, reach?: 3.3, pause?: 0.9, hp?: 3, drop? }
// Zustände: idle → aim (dreht sich zur Figur, Pause) → snap (Zyklus 0,8 s bzw. 1,2 s; Treffer bei 42–62 %) →
// aim … | hit (0,5 s zuckt, danach 0,6 s unverwundbar) | retreat (besiegt: sinkt in 0,6 s weg).
// Modelle 'schnappblume' / 'riesenschnappblume' (opts { base }, state { anim: idle|snap|retreat|hit, progress }).

import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

const BASE_TOP = { pot: 0.38, ground: 0.1, pipe: 0 };

class Schnappblume extends Enemy {
  constructor(level, spec, giant) {
    super(level, spec, giant ? 'riesenschnappblume' : 'schnappblume');
    this.giant = giant;
    this.scale = giant ? 2.8 : 1;
    this.base = ['pot', 'ground', 'pipe'].includes(spec.base) ? spec.base : giant ? 'ground' : 'pot';
    const top = BASE_TOP[this.base] * this.scale;
    this.headY = top + 0.62 * this.scale;            // Kopfmitte über dem Fußpunkt
    this.headR = giant ? 0.85 : 0.36;
    this.hp = spec.hp ?? (giant ? 3 : 1);
    this.range = spec.range ?? (giant ? 7 : 3.4);
    this.reach = spec.reach ?? (giant ? 3.3 : 1.35);
    this.pause = spec.pause ?? (giant ? 0.9 : 0.7);
    this.cycle = giant ? 1.2 : 0.8;
    this.restYaw = this.yaw;
    this.invuln = 0;
    this.half.set(giant ? 0.85 : 0.32, (top + 0.85 * this.scale) / 2, giant ? 0.85 : 0.32);
    this.shadow = giant ? 1.3 : 0.45;
    this.wake = spec.wake ?? 30;
    this._head = { x: 0, y: 0, z: 0 };
    if (level.view) this.setModel(getModel(this.kind, { base: this.base }));
  }

  get progress() { return this.state === 'snap' ? Math.min(1, this.stateT / this.cycle) : 0; }

  /** Kopfmitte (Welt), k = 0 … 1 Anteil der Vorwärts-Reichweite. */
  headPos(k = 0) {
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    const h = this._head;
    h.x = this.pos.x + fx * this.reach * k; h.z = this.pos.z + fz * this.reach * k;
    h.y = this.pos.y + this.headY - 0.2 * this.scale * k;
    return h;
  }

  update(dt) {
    this.stateT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.stand(dt);
    if (this.state === 'retreat') { if (this.stateT > 0.6) this.kill(); return; }
    if (this.state === 'flipped') { this.state = 'retreat'; this.stateT = 0; return; }
    // Stampfattacke direkt neben der Blume
    if (this.poundLandedNear(1.6)) this.onHit('pound', this.level.player);
    if (this.state === 'retreat') return;
    switch (this.state) {
      case 'idle':
        this.faceToward(Math.cos(this.restYaw), -Math.sin(this.restYaw), dt, 2);
        if (this.canSee(this.range, 3 * this.scale)) this.setState('aim');
        break;
      case 'aim':
        this.facePlayer(dt, 6);
        if (!this.canSee(this.range + 0.5, 3 * this.scale)) this.setState('idle');
        else if (this.stateT > this.pause) this.setState('snap');
        break;
      case 'snap': {
        const p = this.progress;
        if (p < 0.4) this.facePlayer(dt, 3);       // beim Ausholen noch nachführen, dann festgelegt
        if (p >= 0.42 && p <= 0.62) this.strike(Math.min(1, (p - 0.4) / 0.12));
        if (p >= 1) this.setState(this.canSee(this.range + 0.5, 3 * this.scale) ? 'aim' : 'idle');
        break;
      }
      case 'hit':
        if (this.stateT > 0.5) this.setState(this.canSee(this.range, 3 * this.scale) ? 'aim' : 'idle');
        break;
      default: break;
    }
  }

  /** Zuschnappen: Kopf vorn → Figur in Kopfnähe wird getroffen. */
  strike(k) {
    const p = this.level.player;
    if (!p || p.dead) return;
    const h = this.headPos(k);
    const c = p.center();
    if (Math.hypot(c.x - h.x, c.y - h.y, c.z - h.z) < this.headR + 0.4) p.hurt(this);
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'retreat') return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'retreat') return;
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    if (kind === 'mega' || kind === 'star') { this.hp = 0; this.defeat(); return; }
    if (this.invuln > 0) return;
    this.hp--;
    if (this.hp <= 0) { this.defeat(); return; }
    this.setState('hit');
    this.invuln = 1.1;
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.headPos(0), 8);
  }

  defeat() {
    this.setState('retreat');
    this.touch = false;
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.headPos(0), 14);
    this.level.effects?.debris(this.headPos(0), 0x8a3ad8, this.giant ? 10 : 6);
    this.markDefeated();
  }

  modelState() {
    const s = this.state;
    if (s === 'snap') return { anim: 'snap', progress: this.progress };
    if (s === 'retreat') return { anim: 'retreat' };
    if (s === 'hit') return { anim: 'hit', progress: Math.min(1, this.stateT / 0.5) };
    return { anim: 'idle' };
  }
}

export const KINDS = {
  schnappblume: (level, spec) => new Schnappblume(level, spec, false),
  riesenschnappblume: (level, spec) => new Schnappblume(level, spec, true),
};
