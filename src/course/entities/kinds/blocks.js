// Blöcke (LEVEL.blocks): 1-m-Würfel, pos = Mitte der Unterseite.
//   question  ?-Block. content: 'coin' (Standard) | 'coins:5' | { coins: 5 } | Power-up-Name
//             (wachstumsbeere, krallen/krallenAnzug, funken, riese, stern, oneup). Von unten stoßen oder von oben
//             stampfen gibt den Inhalt frei, danach 'used'.
//   brick     Ziegel: groß von unten → zerbricht, klein → wackelt; Stampfen zerbricht immer. Mit content
//             verhält er sich wie ein ?-Block (sieht aber wie ein Ziegel aus).
//   hidden    unsichtbar und nur von unten fest; Kopfstoß macht ihn sichtbar (content, Standard 'coin').
//   used      leerer, fester Block.
//   coinblock Mehrfach-Münzblock: je Stoß eine Münze, bis count (Standard 8) erreicht ist.
//   crystal   Kristallblock: nur Stampfen (oder Riesentrank) zerbricht ihn.
// Darstellung über Instanz-Pools je Optik (Modelle question_block, brick_block, used_block, crystal_block,
// wenn vorhanden – sonst eigene Vorlage). Gegner auf einem gestoßenen Block bekommen onHit('bump').

import { CourseEntity } from '../CourseEntity.js';
import { blockTemplate } from '../visuals.js';
import { normalizePower } from '../../player/powers.js';

function parseContent(c, kind) {
  if (c === undefined || c === null) return kind === 'coinblock' ? { coins: 8 } : (kind === 'brick' ? null : { coins: 1 });
  if (typeof c === 'object') return { coins: c.coins ?? 0, power: c.power ? normalizePower(c.power) : null };
  if (c === 'coin') return { coins: 1 };
  const m = /^coins?:(\d+)$/.exec(c);
  if (m) return { coins: +m[1] };
  return { power: normalizePower(c) };
}

class Block extends CourseEntity {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.touch = false;
    this.half.set(0.5, 0.5, 0.5);
    this.content = parseContent(spec.content ?? (kind === 'coinblock' ? { coins: spec.count ?? 8 } : undefined), kind);
    this.look = kind === 'hidden' ? null : kind === 'coinblock' ? 'coinblock' : kind;
    this.bumpT = 0;
    this.coinTimer = 0;
    const p = this.pos;
    this.shapeId = this.addShape({
      type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5],
      breakable: kind === 'brick' || kind === 'crystal', fromBelowOnly: kind === 'hidden', tag: `block:${kind}`,
    });
    this.idx = -1;
    this.setLook(this.look);
  }

  setLook(look) {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    this.look = look;
    if (!look || !this.level.view) return;
    this.pool = this.level.view.pool(`block:${look}`, () => blockTemplate(look), { castShadow: true, capacity: 32 });
    this.idx = this.pool.alloc();
    this.render(0, 0);
  }

  update(dt) {
    if (this.bumpT > 0) this.bumpT = Math.max(0, this.bumpT - dt);
    if (this.coinTimer > 0) this.coinTimer -= dt;
  }

  render() {
    if (this.idx < 0) return;
    const k = this.bumpT > 0 ? Math.sin((1 - this.bumpT / 0.18) * Math.PI) * 0.32 : 0;
    this.pool.set(this.idx, this.pos.x, this.pos.y + k, this.pos.z, 0, 1);
  }

  /** Stoß von unten (Kopf der Figur). */
  onBump(player) {
    const kind = this.kind;
    if (kind === 'crystal' || kind === 'used') { this.level.sfx('blockhit'); this.bumpT = kind === 'used' ? 0 : 0.18; return; }
    if (kind === 'brick' && !this.content) {
      if (player.big) { this.break(); return; }
      this.bump(); this.level.sfx('blockhit'); return;
    }
    if (kind === 'hidden') { this.reveal(); }
    this.release('up');
  }

  /** Von oben gestampft (nicht zerbrechliche Blöcke). */
  onPound(player) {
    if (this.kind === 'question' || this.kind === 'coinblock' || (this.kind === 'brick' && this.content)) this.release('up');
  }

  onHit(kind) {
    if (kind === 'pound' || kind === 'mega') {
      if (this.kind === 'brick' || this.kind === 'crystal') this.break();
      else if (kind === 'mega' && this.kind !== 'used') this.break();
    }
  }

  reveal() {
    const s = this.level.world.get(this.shapeId);
    if (s) { s.fromBelowOnly = false; this.level.world.update(this.shapeId); }
    this.kind = 'question';
    this.setLook('question');
  }

  bump() {
    this.bumpT = 0.18;
    // Gegner/Items auf dem Block anstoßen
    const top = { x: this.pos.x, y: this.pos.y + 1, z: this.pos.z };
    for (const e of this.level.entities) {
      if (!e.alive || e === this) continue;
      if (Math.abs(e.pos.x - top.x) < 0.8 && Math.abs(e.pos.z - top.z) < 0.8 && Math.abs(e.pos.y - top.y) < 0.35) e.onHit?.('bump', this);
    }
  }

  /** Inhalt freigeben (Münze, Mehrfachmünze, Power-up), danach leer. */
  release() {
    const c = this.content;
    this.bump();
    if (!c) { this.level.sfx('blockhit'); return; }
    const top = { x: this.pos.x, y: this.pos.y + 1, z: this.pos.z };
    if (c.power) {
      this.level.spawn('powerup', { pos: [top.x, top.y, top.z], power: c.power, emerge: true });
      this.level.sfx('powerup_appear');
      c.power = null;
    } else if (c.coins > 0) {
      c.coins--;
      this.level.addCoins(1);
      this.level.sfx('coin');
      this.level.effects?.coinPop({ x: top.x, y: top.y, z: top.z });
    }
    if (!c.power && !(c.coins > 0)) { this.content = null; this.kind = 'used'; this.setLook('used'); }
    else this.level.sfx('blockhit');
  }

  break() {
    if (!this.alive) return;
    this.bump();
    this.removeShapes();
    this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + 0.3, z: this.pos.z }, this.kind === 'crystal' ? 0x9fe8ff : 0xd8743a, 8);
    this.level.sfx('brickbreak');
    if (this.content?.power) this.level.spawn('powerup', { pos: [this.pos.x, this.pos.y, this.pos.z], power: this.content.power });
    this.kill();
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

const make = (kind) => (level, spec) => new Block(level, spec, kind);

export const KINDS = {
  question: make('question'),
  brick: make('brick'),
  hidden: make('hidden'),
  used: make('used'),
  coinblock: make('coinblock'),
  crystal: make('crystal'),
};
