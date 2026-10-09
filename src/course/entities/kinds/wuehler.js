// Wühler (Bauplan 1-4: Hindernis im Fluss, auch in Erde). Taucht im Takt auf und wieder ab, abgetaucht wandert er
// auf seiner Bahn (nur die Brille schaut heraus – harmlos, nicht zu treffen). Aufgetaucht (pop + up) ist er ein
// Hindernis: Berührung verletzt, Draufspringen besiegt ihn (er fliegt heraus), ebenso Feuer, Krallen, Panzer,
// Wurf, Explosion, Riesentrank, Funkelstern.
// Für das Floß (Reit-Level): `e.up === true` heißt „aufgetaucht = Hindernis“ (e.kind === 'wuehler').
//
// Daten: { kind: 'wuehler', pos: [x, y, z] (y = Wasser-/Erdoberfläche), ground?: 'water'|'earth' (Standard 'water'),
//          path?: [[x,y,z], …] (Bahn, auf der er wandert; loop Standard ab 3 Punkten), speed?: 1.6 m/s,
//          hide?: 1.6 s (abgetaucht), up?: 1.4 s (aufgetaucht), phase?: 0..1 (Versatz im Takt), wake?, drop? }
// Zustände: hide → pop (0,35 s) → up → sink (0,3 s) → hide …; flipped.
// Modell 'wuehler' (opts { ground }, state { anim: hide|pop|idle }).

import { Enemy } from '../Enemy.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const T_POP = 0.35, T_SINK = 0.3;

class Wuehler extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'wuehler');
    this.half.set(0.32, 0.35, 0.32);
    this.shadow = 0.35;
    this.ground = spec.ground === 'earth' ? 'earth' : 'water';
    this.hideTime = spec.hide ?? 1.6;
    this.upTime = spec.up ?? 1.4;
    this.speed = spec.speed ?? 1.6;
    this.mover = spec.path?.length >= 2
      ? new PathMover(spec.path, { speed: this.speed, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0 })
      : null;
    if (this.mover) { const p = this.mover.pos; this.pos.set(p.x, p.y, p.z); }
    this.state = 'hide';
    // Versatz im Takt: phase 0..1 über den ganzen Zyklus
    const cycle = this.hideTime + T_POP + this.upTime + T_SINK;
    this.stateT = ((spec.phase ?? 0) % 1) * cycle;
    this.skipCycle(cycle);
    this.touch = this.up;
    if (level.view) this.setModel(getModel('wuehler', { ground: this.ground }));
  }

  /** stateT über die Zustandsgrenzen hinweg auflösen (Startversatz). */
  skipCycle() {
    const order = [['hide', this.hideTime], ['pop', T_POP], ['up', this.upTime], ['sink', T_SINK]];
    let i = 0;
    while (this.stateT > order[i][1]) { this.stateT -= order[i][1]; i = (i + 1) % 4; }
    this.state = order[i][0];
  }

  get up() { return this.state === 'pop' || this.state === 'up'; }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    if (this.state === 'hide' && this.mover) {
      const ox = this.pos.x, oz = this.pos.z;
      this.mover.step(dt);
      const p = this.mover.pos;
      this.pos.set(p.x, p.y, p.z);
      this.faceToward(p.x - ox, p.z - oz, dt, 8);
    }
    switch (this.state) {
      case 'hide':
        if (this.stateT > this.hideTime) { this.setState('pop'); this.splash(); }
        break;
      case 'pop':
        this.facePlayer(dt, 6);
        if (this.stateT > T_POP) this.setState('up');
        break;
      case 'up':
        this.facePlayer(dt, 4);
        if (this.stateT > this.upTime) this.setState('sink');
        break;
      case 'sink':
        if (this.stateT > T_SINK) { this.setState('hide'); this.splash(); }
        break;
      default: break;
    }
    this.touch = this.up;
    this.shadowVisible = this.up;
  }

  splash() {
    if (this.ground === 'water') this.level.effects?.splash(this.pos, this.pos.y);
    else this.level.effects?.dust(this.pos, 4);
  }

  onPlayer(player, contact) {
    if (!this.up) return 'none';
    return super.onPlayer(player, contact);
  }

  onStomp(player) { this.flip(player, 7); }

  onHit(kind, source) {
    if (!this.up || this.defeated) return;
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) > 0.8) return;
    this.flip(source, 8);
  }

  modelState() {
    const s = this.state;
    return { anim: s === 'pop' ? 'pop' : s === 'up' || s === 'flipped' ? 'idle' : 'hide' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }
}

export const KINDS = { wuehler: (level, spec) => new Wuehler(level, spec) };
