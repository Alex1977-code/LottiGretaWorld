// Spielfigur der Rätsel-Dioramen (Archetyp `diorama`, Präzisierung Ritt/Diorama): Pflaume als Schatzsucherin.
// Unterklasse von Player mit eingeschränktem Bewegungsset:
//   - kann nicht springen (Sprung, Ducken, Rennen, Aktion werden ausgeblendet), läuft langsamer (3,5 m/s),
//   - geht kleine Stufen (≤ 0,3 m, Rampen) hinauf, fällt an Kanten hinunter (Fall in die Tiefe ist harmlos;
//     unter LEVEL.killY = Absturz ins Leere → Neustart),
//   - Treffer wie gewohnt (Puffer: groß → klein → Tod), aber sanfter Rückstoß (kein Hinausschleudern über Kanten),
//   - auf Gegner fallen federt nur leicht ab,
//   - Siegesablauf `startTreasure()` (Skript, Zustand victory) – der Archetyp ruft ihn beim 5. Stern.
// Zusatzfelder: digging (Buddeln an Schatzstellen, setzt der Archetyp), treasure (Siegesablauf läuft).

import { Player } from '../player/Player.js';
import { MOVE } from '../player/moveset.js';

export const DIORAMA = {
  walk: 3.5,        // m/s
  knock: 2.2,       // m/s Rückstoß bei Treffer (waagerecht)
  knockUp: 4.2,     // m/s nach oben
  bounce: 5,        // m/s Abprall nach einem Fall auf einen Gegner
  victory: 2.6,     // s Siegesablauf bis zum Ergebnis
};

export class DioramaController extends Player {
  constructor(level, opts = {}) {
    super(level, opts);
    this.digging = false;
    this.treasure = false;
    this._inp = {};
  }

  /** Pflaume ist für beide Heldinnen gleich: eigenes, langsames Tempo. */
  setHero(key) {
    super.setHero(key);
    this.speedMult = DIORAMA.walk / MOVE.walk;
    this.jumpMult = 1;
    this.airMult = 0.6;
    this.fallMult = 1;
  }

  update(dt, input) {
    const inp = this._inp;
    Object.assign(inp, input);
    inp.jump = false; inp.jumpPressed = false; inp.jumpReleased = false;
    inp.crouch = false; inp.crouchPressed = false; inp.run = false; inp.actionPressed = false;
    this.buffer = 0;
    super.update(dt, inp);
  }

  hurt(source) {
    const hit = super.hurt(source);
    if (hit && !this.dead && this.mode === 'air') {
      const l = Math.hypot(this.vel.x, this.vel.z) || 1;
      this.vel.x = (this.vel.x / l) * DIORAMA.knock;
      this.vel.z = (this.vel.z / l) * DIORAMA.knock;
      this.vel.y = DIORAMA.knockUp;
      this.airMax = DIORAMA.knock;
    }
    return hit;
  }

  bounceOff() {
    this.vel.y = DIORAMA.bounce;
    this.mode = 'air';
    this.airMax = Math.max(this.hSpeed(), 1);
    this.enterAir('stomp', false);
    this.setState('jump');
  }

  /** Alle Sterne gefunden: Freudensprung, danach meldet der Ablauf `level.onTreasureDone`. */
  startTreasure() {
    if (this.treasure || this.dead) return;
    this.treasure = true;
    this.mode = 'script';
    this.script = { type: 'treasure', t: 0 };
    this.vel.set(0, 0, 0);
    this.gs = 0;
    this.setState('victory');
    this.level.sfx('victory');
  }

  updateScript(dt, input) {
    const sc = this.script;
    if (sc?.type === 'treasure') {
      sc.t += dt;
      // auf dem Boden halten
      const hit = this.world.raycastDown(this.pos.x, this.pos.y + 0.5, this.pos.z, 3);
      if (hit) this.pos.y = hit.y;
      if (sc.t >= DIORAMA.victory && !sc.done) { sc.done = true; this.level.onTreasureDone?.(); }
      return;
    }
    super.updateScript(dt, input);
  }

  info() {
    const i = super.info();
    i.digging = !!this.digging;
    i.treasure = !!this.treasure;
    return i;
  }
}
