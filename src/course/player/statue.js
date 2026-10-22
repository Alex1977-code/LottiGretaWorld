// Statue des Gleitblatts (Präzisierung Motor Welt 3; Bauplan „Gleitblatt: … kurz zu Statue werden“).
// Ducken + Aktion (in der Luft, auch am Boden) → die Figur wird zur Steinstatue:
//   - fällt senkrecht wie ein Stampfer (MOVE.statueFall); die Landung zerbricht Zerbrechliches wie die Stampfattacke
//     (nicht breakable 'bomb'/'cannon'), löst onPound/pound aus, Stampfwelle level.attackArea(pos, 1,4, 'pound'),
//     Gegner, auf die sie fällt, bekommen onHit('pound', figur)
//   - unverwundbar und für Gegner unsichtbar: mode 'script' (script.type 'statue') → Treffer wirkungslos, keine
//     Berührungen, Enemy.playerActive()/activeFigure() liefern false, mehrere Figuren: nearestPlayer überspringt sie
//   - dauert, solange Ducken gehalten wird (mindestens MOVE.statueMin, höchstens MOVE.statueTime ≈ 3 s), danach
//     MOVE.statueCool Pause; Plattformen tragen mit; Lava/Absturz-Ebenen töten weiterhin, Wasser beendet sie
// Darstellung: state 'statue', phase = Anteil der Höchstdauer (HeroRig → proxy.course.state 'statue').

import { MOVE } from './moveset.js';

const IGNORE_SAND = (s) => !!(s.quicksand || s.quicksandFloor);

/** Statue beginnen. */
export function startStatue(p) {
  const air = p.mode !== 'ground';
  p.dropHeld();
  p.fence = null;
  p.gliding = false;
  p.attackInfo = null;
  p.tailTime = 0;
  p.setCrouch(false);
  p.mode = 'script';
  p.script = { type: 'statue', t: 0, grounded: !air, ground: air ? null : p.ground, hit: new Set(), impacts: 0 };
  p.vel.set(0, air ? Math.min(0, p.vel.y) - 3 : -2, 0);
  p.gs = 0;
  p.setState('statue');
  p.level.sfx('groundpound');
  p.level.effects?.dust(p.pos, 6, 0.9);
}

/** Schritt als Statue (Player.updateScript). */
export function updateStatue(p, dt, input, sc) {
  if (sc.t >= MOVE.statueTime || (sc.t >= MOVE.statueMin && !input.crouch)) { endStatue(p, sc); return; }
  // Plattformen/Förderbänder tragen mit
  if (sc.grounded && sc.ground) { p.ground = sc.ground; p.applyCarry(dt); }
  p.vel.x = 0; p.vel.z = 0;
  if (sc.grounded) p.vel.y = -2;
  else p.vel.y = Math.max(p.vel.y - 70 * dt, -MOVE.statueFall);
  const fall = -p.vel.y;
  const c = p.center();
  const res = p.world.moveAABB(c, p.half, { x: 0, y: p.vel.y * dt, z: 0 }, {
    step: 0.05, snap: sc.grounded ? 0.3 : 0, ignore: p.world.hasQuicksand ? IGNORE_SAND : null,
  });
  p.pos.set(c.x, c.y - p.half.y, c.z);
  // Gegner unter der fallenden Statue
  if (!sc.grounded && fall > 3) {
    for (const e of p.level.entities) {
      if (!e.enemy || !e.alive || e.removed || e.defeated || e.touch === false || sc.hit.has(e)) continue;
      const ec = e.center();
      if (Math.abs(ec.x - c.x) > p.half.x + e.half.x || Math.abs(ec.z - c.z) > p.half.z + e.half.z) continue;
      if (Math.abs(ec.y - c.y) > p.half.y + e.half.y + 0.05) continue;
      sc.hit.add(e);
      e.onHit?.('pound', p);
    }
  }
  if (res.grounded) {
    const was = sc.grounded;
    sc.grounded = true;
    sc.ground = res.ground;
    p.ground = res.ground;
    if (!was && fall > 4 && impact(p, res, sc)) { sc.grounded = false; p.vel.y = -MOVE.statueFall * 0.6; }
  } else if (sc.grounded) {
    sc.grounded = false;   // Kante/Plattform weg → fällt weiter
    sc.ground = null;
  }
  // Gefahren: Lava/Abgrund tötet, Wasser beendet die Statue
  for (const s of p.world.overlapAABB(p.center(), p.half)) {
    if (s.kill && p.pos.y <= s.top + 0.02) { p.die(s.kill === 'lava' || s.lava ? 'lava' : 'fall'); return; }
    if (s.water && p.center().y < s.top - 0.05) { endStatue(p, sc); return; }
  }
  p.setState('statue');
  p.phase = Math.min(1, sc.t / MOVE.statueTime);
}

/** Landung der fallenden Statue: wie die Stampfattacke. true = etwas zerbrochen (fällt weiter). */
function impact(p, res, sc) {
  let broke = false;
  for (const s of res.hits) {
    if (Math.abs(s.top - p.pos.y) > 0.06 && s.type !== 'ramp') continue;
    if (s.breakable && s.breakable !== 'bomb' && s.breakable !== 'cannon') { s.owner?.onHit?.('pound', p); broke = true; }
    else { s.owner?.onPound?.(p, s); s.pound?.(p, s); }
  }
  sc.impacts++;
  if (broke) { p.level.sfx('brickbreak'); return true; }
  p.level.attackArea?.(p.pos, 1.4, 'pound', p);
  p.level.effects?.ring(p.pos, 1.5);
  p.level.shake?.(0.3);
  p.level.sfx('land');
  return false;
}

/** Statue beenden → wieder normal (am Boden stehend bzw. fallend). */
export function endStatue(p, sc = p.script) {
  const grounded = !!sc?.grounded;
  p.script = null;
  p.statueCool = MOVE.statueCool;
  p.invuln = Math.max(p.invuln, 0.25);
  p.phase = 0;
  if (grounded) {
    p.mode = 'ground';
    p.ground = sc.ground;
    p.gs = 0;
    p.vel.set(0, -2, 0);
    p.setState('idle');
  } else {
    p.mode = 'air';
    p.enterAir(null, false);
    p.setState('fall');
    p.airMax = Math.max(p.hSpeed(), MOVE.walk * p.speedMult * 0.6);
  }
  p.level.effects?.dust(p.pos, 5, 0.8);
  p.level.sfx('step');
}
