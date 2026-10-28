// Welt-8-Gimmicks als Entitäten (Präzisierung Motor und Bausteine Welt 8).
//
// Hüllen: die Welt-8-Bausteine leuchtsteg, kristall_felsklotz, steigbecken, wasserkoerper, stachelblock, stachelwand, keksrad,
//   keks_zahnrad, schubfeld, riesenrad, lavabrocken_regen, grosser_spiegel, super_pow_block, fallblock_bruecke sind auch als
//   kind in enemies/items erlaubt bzw. per level.spawn(kind, spec) zur Laufzeit erzeugbar (z. B. ein Boss lässt einen
//   Super-POW-Block erscheinen). Felder wie der gleichnamige Baustein; level.named.get(id) liefert den Griff des Bausteins.
//   Beispiel: { kind: 'super_pow_block', id: 'superpow', pos: [0, 3, -200], hidden: true }  → später { reveal: 'superpow' }
//
// abspann_ausloeser – unsichtbarer Auslöser für den Abspann (Präzisierung Abspann): betritt eine Figur den Kasten (bzw. per
//   Signal start()), startet der Abspann wie die Aktion { credits: true } (Standard 'nach-ziel': nach dem Ergebnis-Bildschirm
//   statt zur Weltkarte; 'sofort': gleich). { kind: 'abspann_ausloeser', pos: [x, y, z], size: [w, h, d] (Standard [4, 3, 4]),
//   when: 'nach-ziel' | 'sofort', id }

import { Gimmick } from '../gimmick.js';
import { requestCredits } from '../../credits.js';
import { figures } from '../../blocks/w8kit.js';
import { buildLeuchtsteg } from '../../blocks/types/w8_leuchtsteg.js';
import { buildKristallFelsklotz } from '../../blocks/types/w8_felsklotz.js';
import { buildSteigbecken, buildWasserkoerper } from '../../blocks/types/w8_wasser.js';
import { buildStachelblock, buildStachelwand } from '../../blocks/types/w8_stachel.js';
import { buildKeksrad, buildKeksZahnrad } from '../../blocks/types/w8_keks.js';
import { buildSchubfeld } from '../../blocks/types/w8_schubfeld.js';
import { buildRiesenrad } from '../../blocks/types/w8_riesenrad.js';
import { buildLavabrockenRegen } from '../../blocks/types/w8_lavaregen.js';
import { buildGrosserSpiegel } from '../../blocks/types/w8_spiegel.js';
import { buildSuperPowBlock } from '../../blocks/types/w8_pow.js';
import { buildFallblockBruecke } from '../../blocks/types/w8_fallblock.js';

const BUILD = {
  leuchtsteg: buildLeuchtsteg, kristall_felsklotz: buildKristallFelsklotz, steigbecken: buildSteigbecken, wasserkoerper: buildWasserkoerper,
  stachelblock: buildStachelblock, stachelwand: buildStachelwand, keksrad: buildKeksrad, keks_zahnrad: buildKeksZahnrad,
  schubfeld: buildSchubfeld, riesenrad: buildRiesenrad, lavabrocken_regen: buildLavabrockenRegen, grosser_spiegel: buildGrosserSpiegel,
  super_pow_block: buildSuperPowBlock, fallblock_bruecke: buildFallblockBruecke,
};

class BlockShell extends Gimmick {
  constructor(level, spec, kind) {
    super(level, { ...spec, hidden: false }, kind);
    this.touch = false;
    this.shadow = 0;
    this.handle = BUILD[kind]?.(level, { ...spec, type: kind }) ?? null;
    if (spec.id && this.handle) queueMicrotask(() => { if (level.named.get(spec.id) === this) level.named.set(spec.id, this.handle); });
  }
  info() { return this.handle?.info?.() ?? null; }
}

const shell = (kind) => (level, spec) => new BlockShell(level, spec, kind);

class AbspannAusloeser extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'abspann_ausloeser');
    this.touch = false;
    this.shadow = 0;
    const s = spec.size ?? [4, 3, 4];
    this.box = { x0: this.pos.x - s[0] / 2, x1: this.pos.x + s[0] / 2, y0: this.pos.y, y1: this.pos.y + s[1], z0: this.pos.z - s[2] / 2, z1: this.pos.z + s[2] / 2 };
    this.fired = false;
  }

  start() { this.fire(); }

  fire() {
    if (this.fired) return;
    this.fired = true;
    requestCredits(this.level, this.spec.when === 'sofort' ? 'sofort' : 'nach-ziel');
  }

  update() {
    if (this.fired || this.hidden) return;
    const b = this.box;
    for (const f of figures(this.level)) {
      if (f.pos.x > b.x0 && f.pos.x < b.x1 && f.pos.z > b.z0 && f.pos.z < b.z1 && f.pos.y > b.y0 - 0.2 && f.pos.y < b.y1) { this.fire(); return; }
    }
  }

  info() { return { fired: this.fired }; }
}

export const KINDS = {
  ...Object.fromEntries(Object.keys(BUILD).map((k) => [k, shell(k)])),
  abspann_ausloeser: (level, spec) => new AbspannAusloeser(level, spec),
};
