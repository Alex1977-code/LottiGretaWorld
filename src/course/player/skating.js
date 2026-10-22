// Schlittschuh (Präzisierung Motor Welt 3; Bauplan 3-1 „Eisläufer-Pilzling … besiegt gibt er einen Schlittschuh“,
// 6-5 „Stachelplattform mit Schlittschuh“). Die Figur steigt in den Schlittschuh (Entität `schlittschuh`,
// entities/kinds/schlittschuh.js) wie in einen Reit-Schuh und bleibt in ihren normalen Modi (ground/air): nur das
// Bodenverhalten ändert sich. Physik hier, der Player ruft sie über `player.skate` auf.
//
//   - sehr schnelles Gleiten mit Schwung: die Geschwindigkeit ist ein Vektor; Anschieben in Blickrichtung, langes
//     Ausrollen, Quergeschwindigkeit baut sich nur langsam ab (Driften), Lenken wird mit dem Tempo träger
//     (MOVE.skateTurn / (1 + v / skateTurnFall)) → enge Kurven sind schwer; Stick entgegen = Bremsen (kein Schleudern)
//   - auf Eis (Form ice) höheres Tempo, weniger Reibung, mehr Driften; hangabwärts schneller
//   - Springen mit dem vollen Schwung (keine Saltos/Weitsprünge), Landen behält den Schwung
//   - auf Stacheln sicher: Stachelboden (Formflag `spikes`) verletzt nicht; Gegner mit Stacheln lassen sich von oben
//     zertreten (Level.contacts → skateContact)
//   - Absteigen: Aktion (aussteigen, kleiner Hüpfer) oder Ducken + Sprung (Absprung); ein Treffer wirft die Figur heraus
//     (der Schlittschuh fängt den Treffer ab: kein Größen-/Power-up-Verlust, Rückstoß, 1,5 s unverwundbar)
//   - Röhre, Glasröhre/Kanone, Zielmast, Reittier, Bohnenranke, Schwimmen, Tod lassen den Schlittschuh zurück
//
// Darstellung: Player.state 'skate' am Boden (HeroRig → proxy.course.state 'skate', proxy.course.speed, skates: true);
// in der Luft die normalen Sprungzustände (proxy.course.skates bleibt true).

import { MOVE, vFor } from './moveset.js';
import { surfaceNormal } from '../physics/shapes.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const turnToward = (a, b, max) => { const d = wrap(b - a); return Math.abs(d) <= max ? b : a + Math.sign(d) * max; };

const N = { x: 0, y: 1, z: 0 };

/** Bodenschritt auf dem Schlittschuh (statt Player.updateGround). */
export function skateGround(p, dt, input, want) {
  // Sprung bzw. Ducken + Sprung = Absteigen mit Absprung
  if (p.buffer > 0) {
    p.buffer = 0;
    if (input.crouch) { leaveSkate(p, 'jump'); return; }
    skateJump(p);
    return;
  }
  if (p.crouching) p.setCrouch(false);
  const ice = !!p.ground?.ice;
  const sm = p.speedMult;
  const vmax = (ice ? MOVE.skateMaxIce : MOVE.skateMax) * sm;
  let vx = p.vel.x, vz = p.vel.z;
  const sp = Math.hypot(vx, vz);
  // Lenken (träge bei Tempo); Stick entgegen der Fahrt = Bremsen
  let push = 0, brake = false;
  if (want.mag > 0.2) {
    const wantYaw = Math.atan2(-want.z, want.x);
    const diff = Math.abs(wrap(wantYaw - p.yaw));
    if (diff > 2.3 && sp > 1.5) brake = true;
    else {
      p.yaw = turnToward(p.yaw, wantYaw, (MOVE.skateTurn / (1 + sp / MOVE.skateTurnFall)) * dt);
      push = clamp(want.mag / 0.85, 0, 1) * (diff < 1.2 ? 1 : 0.4);
    }
  }
  const f = p.facingVec();
  let along = vx * f.x + vz * f.z;
  let lx = vx - f.x * along, lz = vz - f.z * along;
  // Quergeschwindigkeit (Driften) baut sich langsam ab
  const lat = Math.hypot(lx, lz);
  if (lat > 1e-5) { const nl = Math.max(0, lat - (ice ? MOVE.skateGripIce : MOVE.skateGrip) * dt); lx *= nl / lat; lz *= nl / lat; }
  // Vorwärts: Anschieben, Ausrollen, Bremsen
  if (brake) along = approach(along, 0, MOVE.skateBrake * dt);
  else if (push > 0) {
    const target = (input.run ? vmax : vmax * 0.8) * push;
    if (along < target) along = Math.min(target, along + (ice ? MOVE.skateAccelIce : MOVE.skateAccel) * dt);
    else along = approach(along, target, (ice ? MOVE.skateFrictionIce : MOVE.skateFriction) * dt);
  } else along = approach(along, 0, (ice ? MOVE.skateFrictionIce : MOVE.skateFriction) * dt);
  vx = f.x * along + lx; vz = f.z * along + lz;
  // hangabwärts schneller
  if (p.ground?.type === 'ramp') {
    const n = surfaceNormal(p.ground, N);
    vx += n.x * MOVE.skateSlope * dt; vz += n.z * MOVE.skateSlope * dt;
  }
  const v = Math.hypot(vx, vz);
  if (v > vmax * 1.15) { vx *= (vmax * 1.15) / v; vz *= (vmax * 1.15) / v; }
  p.vel.x = vx; p.vel.z = vz; p.vel.y = -2;
  p.gs = Math.max(0, vx * f.x + vz * f.z);
  if (p.state !== 'land' || p.landTime <= 0) p.setState('skate');
  if (v > 4 && (p.time % 0.12) < dt) p.level.effects?.sparks?.({ x: p.pos.x - f.x * 0.3, y: p.pos.y + 0.05, z: p.pos.z - f.z * 0.3 }, 1);
}

/** Sprung auf dem Schlittschuh: voller Schwung, Höhe wie ein Laufsprung. */
export function skateJump(p) {
  const pv = p.platformVel;
  const sp = Math.hypot(p.vel.x, p.vel.z);
  p.vel.y = vFor((MOVE.jump1 + MOVE.jump1Run * Math.min(sp, 10)) * p.jumpMult);
  p.vel.x += pv.x; p.vel.z += pv.z; if (pv.y > 0) p.vel.y += pv.y;
  p.airMax = Math.max(sp, MOVE.walk * p.speedMult);
  p.enterAir('jump', true);
  p.coyote = 0;
  p.level.sfx('jump');
  p.level.effects?.dust(p.pos, 3);
}

/** In den Schlittschuh steigen (Entität ruft das bei Berührung). false, wenn es gerade nicht geht. */
export function wearSkate(p, skate) {
  if (!skate || p.skate || p.dead || p.removedFigure) return false;
  if (p.mode !== 'ground' && p.mode !== 'air') return false;
  if (p.state === 'groundpound' || p.state === 'dive' || p.state === 'hurt') return false;
  p.skate = skate;
  p.setCrouch(false);
  if (p.mode === 'ground') p.setState('skate');
  p.level.sfx('mount');
  p.level.effects?.sparks?.({ x: p.pos.x, y: p.pos.y + 0.2, z: p.pos.z }, 8);
  return true;
}

/**
 * Aus dem Schlittschuh: how 'off' (Aktion: aussteigen, kleiner Hüpfer nach vorn), 'jump' (Ducken + Sprung: Absprung),
 * 'hit' (Treffer: Schlittschuh fliegt davon, Rückstoß macht hurt), 'gone' (Röhre, Tod, Neustart … ohne Bewegung).
 */
export function leaveSkate(p, how = 'off', source = null) {
  const sk = p.skate;
  if (!sk) return null;
  p.skate = null;
  sk.release?.(p, how, source);
  if (how === 'off') {
    const f = p.facingVec();
    p.vel.set(p.vel.x * 0.3 + f.x * 1.5, 5.5, p.vel.z * 0.3 + f.z * 1.5);
    p.airMax = Math.max(p.hSpeed(), 2);
    p.enterAir('jump', false);
    p.level.sfx('jump');
  } else if (how === 'jump') {
    p.vel.set(p.vel.x * 0.6, vFor(MOVE.jump1 * p.jumpMult), p.vel.z * 0.6);
    p.airMax = Math.max(p.hSpeed(), MOVE.walk * p.speedMult);
    p.enterAir('jump', true);
    p.level.sfx('jump');
  }
  return sk;
}

/**
 * Berührung eines Gegners von oben auf dem Schlittschuh (Level.contacts): Stachel-Gegner, die beim Draufspringen
 * verletzen würden, werden zertreten (onHit('pound')) – „auf Stacheln sicher“. undefined = Standard.
 */
export function skateContact(p, e, contact) {
  if (!p.skate || !contact.fromAbove || !e.enemy || e.defeated) return undefined;
  const r = e.onPlayer(p, contact);
  if (r === 'hurt') { e.onHit?.('pound', p); return 'stomp'; }
  return r;
}
