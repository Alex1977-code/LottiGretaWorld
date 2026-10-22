// Schnappblume und Riesenschnappblume (Bauplan: „statisch, schnappt“, Konter: Feuer / Stampfen von der Seite;
// Riesen-Variante: großer Radius, mehrfach treffen).
//
// Verhalten: steht fest (Topf, Boden oder Röhre; bewegte Plattformen tragen sie mit). Kommt die Figur in Reichweite,
// dreht sie sich zu ihr und schnappt im Takt: ausholen (Kopf zurück, Maul auf – Ankündigung) → zuschnappen nach
// vorn → zurück → Pause. Getroffen wird nur, wer das sichtbare Maul berührt: Kopfkugel an der vom Modell gemessenen
// Stelle (vorgestreckt ≈ 0,36 m × Größe vor der Mitte, Radius 0,38 m × Größe; Maulspitze ≈ 0,75 m bzw. 2,1 m bei der
// Riesin), nur solange der Kopf vorn ist (52–74 % des Zyklus), gegen die Hülle der Figur (nächster Punkt).
// Konter (Rückmeldung Auftraggeber): Draufspringen und Stampfen *auf* den Kopf treffen (Abprall; die Riesin braucht
// 3 Treffer, danach kurz unverwundbar – weitere Sprünge prallen nur ab). Außerdem Feuerball, Tatzenhieb,
// Krallen-Sturzflug, Panzer, Wurf, Explosion, Stampfattacke direkt *neben* ihr (bis 1,6 m vom Rand),
// Riesentrank/Funkelstern. Seitlich hineinlaufen verletzt weiterhin.
//
// Daten: { kind: 'schnappblume', pos, base?: 'pot'|'ground'|'pipe' (Standard 'pot'), yaw?|dir? (Ruhe-Blick),
//          range?: 3.4 m (ab hier dreht sie sich zur Figur und schnappt), pause?: 0.7 s (zwischen zwei Schnappern),
//          hp?: 1, drop? }
//        { kind: 'riesenschnappblume', pos, base?: 'ground', range?: 7, pause?: 0.9, hp?: 3, drop? }
// Zustände: idle → aim (dreht sich zur Figur, Pause) → snap (Zyklus 0,8 s bzw. 1,2 s; Treffer bei 52–74 %) →
// aim … | hit (0,5 s zuckt, danach 0,6 s unverwundbar) | retreat (besiegt: sinkt in 0,6 s weg).
// Modelle 'schnappblume' / 'riesenschnappblume' (opts { base }, state { anim: idle|snap|retreat|hit, progress }).

import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

const BASE_TOP = { pot: 0.38, ground: 0.1, pipe: 0 };
// Kopfkugel relativ zur Stängel-Oberkante (je Meter Größe), gemessen am Modell: Ruhe vs. vorgestreckt
const HEAD = { rest: { f: 0.06, y: 0.46 }, lunge: { f: 0.36, y: 0.27 }, r: 0.38 };
const STRIKE = [0.52, 0.74];

class Schnappblume extends Enemy {
  constructor(level, spec, giant) {
    super(level, spec, giant ? 'riesenschnappblume' : 'schnappblume');
    this.giant = giant;
    this.scale = giant ? 2.8 : 1;
    this.base = ['pot', 'ground', 'pipe'].includes(spec.base) ? spec.base : giant ? 'ground' : 'pot';
    const top = BASE_TOP[this.base] * this.scale;
    this.top = top;                                  // Stängel-Oberkante über dem Fußpunkt
    this.headR = HEAD.r * this.scale;
    this.hp = spec.hp ?? (giant ? 3 : 1);
    this.range = spec.range ?? (giant ? 7 : 3.4);
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

  /** Kopfmitte (Welt), k = 0 (Ruhe) … 1 (vorgestreckt). */
  headPos(k = 0) {
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    const f = (HEAD.rest.f + (HEAD.lunge.f - HEAD.rest.f) * k) * this.scale;
    const h = this._head;
    h.x = this.pos.x + fx * f; h.z = this.pos.z + fz * f;
    h.y = this.pos.y + this.top + (HEAD.rest.y + (HEAD.lunge.y - HEAD.rest.y) * k) * this.scale;
    return h;
  }

  update(dt) {
    this.stateT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.stand(dt);
    if (this.state === 'retreat') { if (this.stateT > 0.6) this.kill(); return; }
    if (this.state === 'flipped') { this.state = 'retreat'; this.stateT = 0; return; }
    // Stampfattacke direkt neben der Blume
    if (this.poundLandedNear(1.6)) this.onHit('pound', this.level.nearestPlayer(this.pos));
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
        if (p >= STRIKE[0] && p <= STRIKE[1]) this.strike();
        if (p >= 1) this.setState(this.canSee(this.range + 0.5, 3 * this.scale) ? 'aim' : 'idle');
        break;
      }
      case 'hit':
        if (this.stateT > 0.5) this.setState(this.canSee(this.range, 3 * this.scale) ? 'aim' : 'idle');
        break;
      default: break;
    }
  }

  /** Zuschnappen: Kopf vorn → jede Figur, deren Hülle die Kopfkugel berührt, wird getroffen. */
  strike() {
    const h = this.headPos(1);
    for (const p of this.level.players ?? [this.level.player]) {
      if (!p || p.dead || p.removedFigure) continue;
      const c = p.center(), e = p.half;
      const dx = Math.max(0, Math.abs(c.x - h.x) - e.x), dy = Math.max(0, Math.abs(c.y - h.y) - e.y), dz = Math.max(0, Math.abs(c.z - h.z) - e.z);
      if (dx * dx + dy * dy + dz * dz < this.headR * this.headR) p.hurt(this);
    }
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'retreat') return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (contact.fromAbove || contact.pound) {        // auf den Kopf springen/stampfen = Treffer, immer mit Abprall
      if (this.invuln <= 0) this.onHit('stomp', player);
      return 'stomp';
    }
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
