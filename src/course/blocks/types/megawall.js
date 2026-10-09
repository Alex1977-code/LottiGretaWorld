// Baustein `megawall`: graue Blockwand (1-Burg, 1-1 Steinblöcke hinter der Brücke) aus 1-m-Hartstein-Blöcken.
// Nur eine Bombe (level.attackArea(pos, r, 'bomb') – Kickbombe des Gegner-Agenten) oder der Riesentrank zerstört
// sie; Stampfen, Krallen, Feuer und Sprünge prallen ab. Je Spalte eine Entität 'megacolumn' (zerfällt als Ganzes,
// damit keine Blöcke schweben) – eine Explosion trifft alle Spalten im Radius.
//
// Parameter:
//   pos:       [x, y, z]  Mitte der Unterseite;  size: [w, h, d] in ganzen Metern (Standard [4, 3, 1])
//   breakable: 'bomb' (Standard)   Flag der Kollisionsformen (Player.land stampft 'bomb' nicht durch)
//   onBreak:   Aktion (entities/gimmick.js) beim ersten zerstörten Teil, z. B. { sfx: 'gate' }
//   id:        Name → level.named: { columns, broken }
// Beispiel: { type: 'megawall', pos: [4, 1, -88], size: [4, 3, 1] }   (dahinter der Stempel)

import { v3, sz3 } from '../kit.js';
import { runAction } from '../../entities/gimmick.js';

export function buildMegaWall(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [4, 3, 1]);
  const w = Math.max(1, Math.round(s.x)), h = Math.max(1, Math.round(s.y)), d = Math.max(1, Math.round(s.z));
  const wall = {
    columns: [], broken: 0,
    onColumnBroken(col) {
      this.broken++;
      if (this.broken === 1) runAction(level, spec.onBreak, { pos: [col.pos.x, col.pos.y, col.pos.z], source: this });
    },
  };
  for (let ix = 0; ix < w; ix++) {
    for (let iz = 0; iz < d; iz++) {
      const e = level.spawn('megacolumn', { pos: [p.x - w / 2 + ix + 0.5, p.y, p.z - d / 2 + iz + 0.5], height: h, breakable: spec.breakable ?? 'bomb', wall });
      if (e) wall.columns.push(e);
    }
  }
  if (spec.id) level.named.set(spec.id, wall);
  return wall;
}

export const TYPES = { megawall: buildMegaWall };
