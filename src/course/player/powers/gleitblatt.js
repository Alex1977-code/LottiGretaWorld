// Gleitblatt (Bauplan „Tanuki-Blatt → Gleitblatt: Schwanzschlag, Gleiten, kurz zu Statue werden“; Präzisierung Motor
// Welt 3). Kostüm über proxy.course.power === 'gleitblatt' (Avatar).
//   - Aktion: Schwanzhieb rundum (MOVE.tailTime 0,32 s, Reichweite MOVE.tailReach 1,2 m um die Figur): trifft wie der
//     Tatzenhieb mit onHit('claw', figur) – besiegt Gegner, zerbricht Ziegel/Kisten, löst ?-Blöcke – plus Formen mit
//     `breakable` (owner.onHit('claw', figur, form)); attackInfo.style = 'tail', around = true. In der Luft bremst er
//     den Fall kurz (wie Gleiten). Zustand für den Avatar: 'tailswipe' (player.tailTime > 0).
//   - Gleiten: Sprung im Fall gehalten → Fallgeschwindigkeit höchstens MOVE.glideFall (2 m/s), leichte Vorwärtsfahrt
//     (MOVE.glideDrift); Player.updateAir (def.glide). Zustand 'glide'.
//   - Statue: Ducken + Aktion (in der Luft oder am Boden) → player/statue.js. Zustand 'statue'.
//   - Treffer: Power-up weg, Figur bleibt groß (Standard).

import { MOVE } from '../moveset.js';
import { startStatue } from '../statue.js';

/** Schwanzhieb rundum. true = ausgeführt. */
export function tailSwipe(player) {
  if (player.tailTime > 0) return false;
  if (player.mode !== 'ground' && player.mode !== 'air') return false;
  if (player.state === 'groundpound' || player.state === 'dive' || player.state === 'hurt') return false;
  const reach = MOVE.tailReach;
  player.tailTime = MOVE.tailTime;
  player.tailDur = MOVE.tailTime;
  player.attack('claw', reach, MOVE.tailTime * 0.85, { around: true, style: 'tail' });
  // Zerbrechliche Formen ohne eigene Entität (Bausteine mit owner.onHit) rundum
  const c = player.center();
  const hit = player.attackInfo.hit;
  for (const s of player.world.overlapAABB(c, { x: reach + player.half.x, y: player.half.y, z: reach + player.half.z })) {
    const o = s.owner;
    if (!s.breakable || !o?.onHit || hit.has(o)) continue;
    hit.add(o);
    o.onHit('claw', player, s);
  }
  player.level.effects?.ring({ x: player.pos.x, y: player.pos.y + 0.35, z: player.pos.z }, reach);
  player.level.sfx('claw');
  return true;
}

export const POWERS = {
  gleitblatt: {
    label: 'Gleitblatt',
    icon: 0x8fd83a,
    glide: true,
    onAction(player, input) {
      // Ducken + Aktion: Statue (nicht mit Last/Schlittschuh/am Zaun)
      if (input.crouch && (player.mode === 'air' || player.mode === 'ground') && player.statueCool <= 0
        && !player.holding && !player.skate && player.state !== 'hurt') {
        startStatue(player);
        return true;
      }
      return tailSwipe(player);
    },
  },
};
