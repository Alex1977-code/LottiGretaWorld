// Schlittschuh (Präzisierung Motor Welt 3; Bauplan 3-1 „Eisläufer-Pilzling … besiegt gibt er einen Schlittschuh“,
// 6-5 „Rätselbox mit Schlittschuh“, „Stachelplattform (mit Schlittschuh)“). Liegt/schwebt am Boden; Berührung → die
// Figur steigt hinein (player/skating.js: schnelles Gleiten mit Schwung, enge Kurven schwer, springen, auf Eis noch
// schneller, auf Stacheln sicher). Aussteigen mit Aktion bzw. Ducken + Sprung; ein Treffer wirft die Figur heraus und
// der Schlittschuh fliegt davon (kann wieder angezogen werden). Getragen zeichnet die Entität das Modell an den Füßen.
//
// Daten (items/enemies/blocks als kind, segments als type – blocks/types/schlittschuh.js):
//   { kind: 'schlittschuh', pos: [x, y, z] (Fußpunkt), yaw?, id?, hidden?,
//     respawn: 4   s – verloren (Absturz, Tod, im Wasser/Röhre zurückgelassen und außer Reichweite) → nach respawn s
//                  wieder am Startpunkt; 0 = verschwindet (Standard 0 für Schlittschuhe aus Blöcken/Gegnern) }
// Auch als Power-up-Name: content: 'schlittschuh' (?-Block), drop: 'schlittschuh' (Gegner, z. B. Eisläufer-Pilzling),
// { kind: 'powerup', power: 'schlittschuh' }, Aktion { power: 'schlittschuh' } – Level.spawn macht daraus diese
// Entität (mit emerge: steigt aus dem Block). Player.collectPowerup('schlittschuh') zieht direkt einen an.
// Laufzeit: rider (Figur | null), worn, lost; wear(player) → bool; release(player, how, source) (von skating.js).
// Modell: schlittschuhe (items_w3.js, state { anim: 'idle' | 'collected' }); getragen wird der Schwebe-Teil auf die
// Füße gesetzt (ohne Drehen/Wippen).

import { Gimmick, visDt } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { wearSkate } from '../../player/skating.js';

const TAU = Math.PI * 2;

class Skate extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'schlittschuh');
    this.half.set(0.32, 0.3, 0.32);
    this.shadow = 0.35;
    this.home = this.pos.clone();
    this.homeYaw = spec.yaw ?? 0;
    this.rider = null;
    this.cool = 0;
    this.respawn = spec.respawn ?? (spec.emerge ? 0 : 4);
    this.lostT = 0;
    this.lost = false;
    this.floats = true;
    this.floatDepth = 0.12;
    this.spin = 0;
    this.emerge = spec.emerge ? 0.6 : 0;
    this.baseY = this.pos.y;
    if (this.emerge) { this.pos.y -= 0.85; this._touch = false; }
    if (spec.vel) this.vel.set(spec.vel[0] ?? 0, spec.vel[1] ?? 0, spec.vel[2] ?? 0);
    if (level.view) this.setModel(getModel('schlittschuhe'));
  }

  get worn() { return !!this.rider; }
  get shadowVisible() { return !this.hidden && !this.rider; }

  update(dt) {
    if (this.hidden) return;
    if (this.cool > 0) this.cool -= dt;
    const r = this.rider;
    if (r) {
      if (r.skate !== this || r.dead || r.removedFigure) { this.release(r, 'gone'); return; }
      this.pos.copy(r.pos);
      this.yaw = r.yaw;
      this.vel.set(0, 0, 0);
      return;
    }
    if (this.emerge > 0) {
      this.emerge -= dt;
      this.pos.y = this.baseY - 0.85 * Math.max(0, this.emerge / 0.6);
      if (this.emerge <= 0) { this.pos.y = this.baseY; this._touch = true; this.grounded = false; }
      return;
    }
    // liegt/rutscht/fliegt (nach einem Treffer) – Reibung am Boden
    if (this.grounded) {
      const k = this.ground?.ice ? 0.6 : 6;
      const s = Math.hypot(this.vel.x, this.vel.z);
      if (s > 1e-4) { const ns = Math.max(0, s - k * dt); this.vel.x *= ns / s; this.vel.z *= ns / s; }
    }
    this.moveWithGravity(dt);
    if (this.removed) return;   // unter killY
    if (this.spinV) { this.spin += this.spinV * dt; this.spinV *= Math.exp(-2 * dt); if (Math.abs(this.spinV) < 0.1) this.spinV = 0; }
    // verloren: zurück an den Startpunkt (oder weg)
    if (this.lost) {
      this.lostT += dt;
      if (this.lostT >= Math.max(0.5, this.respawn)) this.goHome();
    }
  }

  /** Unter killY gefallen → statt zu verschwinden: Startpunkt (respawn) bzw. weg. */
  kill() {
    if (this.respawn > 0 && !this.removed) { this.lost = true; this.lostT = this.respawn; this.goHome(); return; }
    super.kill();
  }

  goHome() {
    if (this.respawn <= 0) { super.kill(); return; }
    this.lost = false;
    this.lostT = 0;
    this.pos.copy(this.home);
    this.yaw = this.homeYaw;
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.popT = 0.45;
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.3, z: this.pos.z }, 8);
  }

  /** Figur zieht den Schlittschuh an. */
  wear(player) {
    if (this.rider || this.hidden || this.removed || this.emerge > 0) return false;
    if (!wearSkate(player, this)) return false;
    this.rider = player;
    this._touch = false;
    this.lost = false;
    this.lostT = 0;
    this.spinV = 0;
    return true;
  }

  /** Von skating.js: Figur steigt aus (how 'off' | 'jump' | 'hit' | 'gone' | 'lost'). */
  release(player, how = 'off', source = null) {
    if (this.rider !== player) return;
    this.rider = null;
    if (player.skate === this) player.skate = null;
    this._touch = true;
    this.cool = how === 'hit' ? 1.2 : 0.7;
    this.pos.copy(player.pos);
    this.grounded = false;
    if (how === 'hit') {
      // fliegt im Bogen davon (weg von der Gefahr)
      let ax = -Math.cos(player.yaw), az = Math.sin(player.yaw);
      if (source?.pos) { ax = player.pos.x - source.pos.x; az = player.pos.z - source.pos.z; }
      const l = Math.hypot(ax, az) || 1;
      this.vel.set((ax / l) * 3.2, 6.5, (az / l) * 3.2);
      this.spinV = 14;
      this.level.sfx('helm_off');
    } else if (how === 'off' || how === 'jump') {
      this.vel.set(player.vel.x * 0.5, 0, player.vel.z * 0.5);
    } else this.vel.set(0, 0, 0);
    if (how === 'lost' || how === 'gone') { this.lost = how === 'lost'; this.lostT = 0; }
  }

  onPlayer(player) {
    if (this.cool > 0 || this.rider || player.skate) return 'none';
    return this.wear(player) ? 'collect' : 'none';
  }

  /** Schwanzhieb/Tatze/Feuer stoßen ihn ein Stück weg. */
  onHit(kind, source) {
    if (this.rider || this.hidden) return;
    if (kind === 'claw' || kind === 'punch' || kind === 'shell' || kind === 'pound') {
      let ax = this.pos.x - (source?.pos?.x ?? this.pos.x), az = this.pos.z - (source?.pos?.z ?? this.pos.z);
      const l = Math.hypot(ax, az) || 1;
      this.vel.set((ax / l) * 2.5, 3, (az / l) * 2.5);
      this.grounded = false;
    }
  }

  modelState() { return { anim: 'idle' }; }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    const m = this.model;
    if (!m) return;
    m.root.visible = !this.hidden;
    if (this.hidden) return;
    const r = this.rider;
    m.update?.(dt, { anim: 'idle' });
    const spinJ = m.root.children[0];
    if (r) {
      // an den Füßen: Schwebe-Gelenk ohne Drehen/Wippen, Kufen auf dem Boden, Blick in Laufrichtung, ohne Funkeln
      if (spinJ) { spinJ.rotation.set(0, 0, 0); spinJ.position.y = 0.04; spinJ.scale.setScalar(1); }
      for (let i = 1; i < m.root.children.length; i++) m.root.children[i].visible = false;
      m.root.position.copy(r.pos);
      m.root.rotation.y = r.yaw;
      m.root.scale.setScalar(r.big ? 0.95 : 0.7);
      m.root.visible = !r.hidden && !(r.invuln > 0 && Math.floor(t * 16) % 2 === 0);
      return;
    }
    if (spinJ && this.spinV) spinJ.rotation.z = this.spin % TAU;
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.yaw;
    m.root.scale.setScalar(k < 1 ? Math.max(0.05, Math.sin(k * Math.PI * 0.5)) : 1);
  }
}

export const KINDS = {
  schlittschuh: (level, spec) => new Skate(level, spec),
};
