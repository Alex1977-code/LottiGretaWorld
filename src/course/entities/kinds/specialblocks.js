// Besondere Blöcke (Sonder-Bausteine), je 1-m-Würfel, pos = Mitte der Unterseite, Kopfstoß von unten (oder Stampfen
// von oben) löst sie aus. Gegner obendrauf bekommen onHit('bump').
//
// endlessblock – Dauer-Münzblock: jeder Treffer gibt eine Münze, solange der nächste Treffer innerhalb von `window`
//   Sekunden folgt (zwölf Zeit-Perlen am Rand zeigen die Restzeit). Wartet man zu lange (oder ist max erreicht),
//   wird er zum leeren Block.
//   { kind: 'endlessblock', pos, window: 1.2 (s), max: 40 (Münzen), id?, hidden? }
//   Beispiel: { kind: 'endlessblock', pos: [0, 3.4, -12] }
//
// rouletteblock – Roulette-Block (1-5): Glaswürfel, in dem der Inhalt im Takt wechselt; der Treffer gibt den gerade
//   gezeigten Inhalt (Power-up steigt heraus, Münzen/1-Up sofort), danach leer.
//   { kind: 'rouletteblock', pos, contents: ['wachstumsbeere', 'krallen', 'funken', 'stern'] (Power-up-Namen,
//     'coin', 'coins:5', 'oneup'), period: 0.5 (s je Inhalt), id?, hidden? }
//   Beispiel: { kind: 'rouletteblock', pos: [4, 3.4, -30], contents: ['krallen', 'funken', 'oneup'] }
// Modelle 'endless_block', 'roulette_block' (Inhalt: Power-up-Modelle darin), leer: 'used_block'.

import { Gimmick, runAction, contentAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { powerupModel } from '../visuals.js';
import { normalizePower } from '../../player/powers.js';

class SpecialBlock extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.half.set(0.5, 0.5, 0.5);
    this.touch = false;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], tag: `block:${kind}` });
    this.n = 0;
    this.anim = 'idle';
    this.used = false;
  }

  /** Gegner/Items obendrauf anstoßen. */
  bumpTop() {
    this.n++;
    this.anim = 'bump';
    const top = { x: this.pos.x, y: this.pos.y + 1, z: this.pos.z };
    for (const e of this.level.entities) {
      if (!e.alive || e === this) continue;
      if (Math.abs(e.pos.x - top.x) < 0.8 && Math.abs(e.pos.z - top.z) < 0.8 && Math.abs(e.pos.y - top.y) < 0.35) e.onHit?.('bump', this);
    }
  }

  onPound(player) { this.onBump(player); }

  coinPop() {
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.coinPop({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z });
  }
}

class EndlessBlock extends SpecialBlock {
  constructor(level, spec) {
    super(level, spec, 'endlessblock');
    this.window = spec.window ?? 1.2;
    this.max = spec.max ?? 40;
    this.count = 0;
    this.timer = 0;
    if (level.view) this.setModel(getModel('endless_block'));
  }

  onBump() {
    this.bumpTop();
    if (this.used || this.hidden) { this.level.sfx('blockhit'); return; }
    this.coinPop();
    this.count++;
    this.timer = this.window;
    if (this.count >= this.max) this.finish();
  }

  finish() {
    this.used = true;
    this.timer = 0;
    this.level.sfx('blockhit');
  }

  update(dt) {
    if (this.used || this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) this.finish();
  }

  modelState() { return { anim: this.used ? 'used' : this.anim, timer: this.window > 0 ? this.timer / this.window : 0, n: this.n }; }
}

class RouletteBlock extends SpecialBlock {
  constructor(level, spec) {
    super(level, spec, 'rouletteblock');
    this.contents = (spec.contents ?? ['wachstumsbeere', 'krallen', 'funken', 'stern']).map((c) => contentAction(c));
    this.period = spec.period ?? 0.5;
    this.icons = [];
    if (level.view) {
      this.setModel(getModel('roulette_block'));
      const inner = this.model.root.userData.inner ?? this.model.root;
      for (const c of this.contents) {
        let icon;
        if (c?.power) icon = powerupModel(normalizePower(c.power));
        else icon = getModel('coin');
        icon.root.scale.setScalar(0.72);
        icon.root.visible = false;
        inner.add(icon.root);
        this.icons.push(icon);
      }
    }
  }

  get current() { return Math.floor(this.level.time / this.period) % Math.max(1, this.contents.length); }

  onBump() {
    this.bumpTop();
    if (this.used || this.hidden) { this.level.sfx('blockhit'); return; }
    this.used = true;
    const c = this.contents[this.current];
    const top = [this.pos.x, this.pos.y + 1, this.pos.z];
    if (c?.power) {
      this.level.spawn('powerup', { pos: top, power: normalizePower(c.power), emerge: true });
      this.level.sfx('powerup_appear');
    } else runAction(this.level, c, { pos: top, source: this });
    this.level.sfx('blockhit');
    // leerer Block statt Glaswürfel
    if (this.level.view) {
      for (const ic of this.icons) ic.dispose?.();
      this.icons = [];
      this.setModel(getModel('used_block'));
    }
  }

  render(dt, t) {
    super.render(dt, t);
    if (this.used || !this.icons.length) return;
    const cur = this.current;
    this.icons.forEach((ic, i) => {
      ic.root.visible = i === cur;
      if (i === cur) { ic.root.rotation.y = t * 2; ic.update?.(dt, { anim: 'idle' }); }
    });
  }

  modelState() { return { anim: this.anim === 'bump' ? 'bump' : 'idle', n: this.n }; }

  dispose() {
    for (const ic of this.icons) ic.dispose?.();
    this.icons = [];
    super.dispose();
  }
}

export const KINDS = {
  endlessblock: (level, spec) => new EndlessBlock(level, spec),
  rouletteblock: (level, spec) => new RouletteBlock(level, spec),
};
