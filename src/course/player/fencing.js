// Kettenzaun-Klettern (Präzisierung Motor Welt 3; Bauplan 3-2 „bewegliche Kettenzäune als Plattform, an denen man
// klettert“, Baustein „Bewegliche Plattform / Kettenzaun – fährt auf Bahn, teils mit Zaun zum Festhalten“).
//
// Zäune sind Entitäten (`kettenzaun`, `kettenplattform`, entities/kinds/kettenzaun.js); jede trägt sich in
// `level.fences` ein und liefert je Schritt:
//   fence.plane  = { x, y, z (Mitte der Unterkante in der Zaunebene), ax, az (Einheitsvektor entlang des Zauns),
//                    nx, nz (Normale der Vorderseite), w (Breite), h (Höhe) }
//   fence.mover  = { dx, dy, dz, vx, vy, vz, dyaw, cx, cz, t } – Bewegung dieses Schritts (t = level.time)
//   fence.shake(a), fence.alive/removed/hidden, fence.climbable (false = nicht kletterbar)
//
// Figur am Zaun: mode bleibt 'wall' (Kamera folgt senkrecht, Autoscroller/Squad behandeln sie wie an einer Wand),
// `player.fence = { obj, side (+1 Vorderseite, −1 Rückseite), t }`, state 'fence', `player.fenceMove = { x, y }`
// (−1..1, x = Bildschirm rechts, y = hoch). Greifen: in der Luft an den Zaun springen (Bewegung oder Stick zum Zaun,
// bzw. ihn berühren) oder am Boden Aktion vor dem Zaun. Am Zaun: Stick = klettern in der Zaunebene (MOVE.fenceSpeed),
// Sprung = abspringen (vom Zaun weg, Stick lenkt), Ducken = loslassen, Aktion = Faustschlag durch den Zaun
// (onHit('punch', figur) für Gegner bis MOVE.fencePunch um die Hand – auch auf der Rückseite), unten Boden = absteigen.
// Fährt der Zaun (eigener Pfad oder attach an ein Fahrzeug), fährt die Figur mit (fenceCarry vor der Bewegung).

import { MOVE, vFor } from './moveset.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const GAP = 0.08;   // Abstand Figur-Hülle ↔ Zaunebene

/** Lage eines Punktes relativ zum Zaun: u entlang, d vor (+) / hinter (−) der Ebene, v über der Unterkante. */
export function fenceLocal(fe, x, y, z, out = {}) {
  const P = fe.plane;
  const dx = x - P.x, dz = z - P.z;
  out.u = dx * P.ax + dz * P.az;
  out.d = dx * P.nx + dz * P.nz;
  out.v = y - P.y;
  return out;
}

const usable = (fe) => fe && fe.alive !== false && !fe.removed && !fe.hidden && fe.climbable !== false && fe.plane;
const L0 = {};

/** In der Luft: an einen Zaun springen? (nach der Bewegung aufgerufen) → true, wenn gegriffen. */
export function tryGrabFence(p, input, want) {
  const list = p.level.fences;
  if (!list?.length || p.grabCooldown > 0 || p.holding || p.skate || p.dead) return false;
  if (p.state === 'groundpound' || p.state === 'dive' || p.state === 'hurt') return false;
  const c = p.center();
  for (const fe of list) {
    if (!usable(fe)) continue;
    const P = fe.plane;
    const L = fenceLocal(fe, c.x, c.y, c.z, L0);
    if (Math.abs(L.d) > p.half.x + 0.32 || Math.abs(L.u) > P.w / 2 - 0.1) continue;
    // Körpermitte innerhalb der Zaunhöhe (Hände am Zaun; oben greift sie die Oberkante)
    if (L.v < 0.3 || L.v > P.h - 0.05) continue;
    const side = L.d >= 0 ? 1 : -1;
    const vInto = -side * (p.vel.x * P.nx + p.vel.z * P.nz);
    const sInto = want.mag > 0.3 ? -side * (want.x * P.nx + want.z * P.nz) : 0;
    const touching = Math.abs(L.d) <= p.half.x + 0.12;
    if (vInto < 0.8 && sInto < 0.35 && !touching) continue;
    grabFence(p, fe, side);
    return true;
  }
  return false;
}

/** Am Boden: Aktion vor einem Zaun greift ihn. → true, wenn gegriffen. */
export function grabFenceAction(p) {
  const list = p.level.fences;
  if (!list?.length || p.holding || p.skate || p.mode !== 'ground') return false;
  const c = p.center();
  const f = p.facingVec();
  for (const fe of list) {
    if (!usable(fe)) continue;
    const P = fe.plane;
    const L = fenceLocal(fe, c.x, c.y, c.z, L0);
    if (Math.abs(L.d) > p.half.x + 0.75 || Math.abs(L.u) > P.w / 2 - 0.2) continue;
    const feet = p.pos.y - P.y;
    if (feet < -0.35 || feet > P.h - 1.0) continue;
    const side = L.d >= 0 ? 1 : -1;
    if (-side * (f.x * P.nx + f.z * P.nz) < 0.5) continue;   // muss zum Zaun blicken
    grabFence(p, fe, side);
    p.pos.y += Math.max(0, 0.25 - feet);                       // ein Stück hinauf (Füße vom Boden)
    return true;
  }
  return false;
}

/** Zaun greifen (Seite side: +1 vor der Vorderseite, −1 dahinter). */
export function grabFence(p, fe, side) {
  const P = fe.plane;
  p.fence = { obj: fe, side, t: 0 };
  p.mode = 'wall';
  p.wallShape = fe.shape ?? null;
  p.wallNormal.set(side * P.nx, 0, side * P.nz);
  p.wallCoyote = 0;
  p.vel.set(0, 0, 0);
  p.gs = 0;
  p.setCrouch(false);
  p.jumpKind = null; p.variable = false;
  p.gliding = false;
  p.fenceMove.x = 0; p.fenceMove.y = 0;
  p.yaw = Math.atan2(side * P.nz, -side * P.nx);   // Blick zum Zaun
  p.setState('fence');
  snapToFence(p);
  fe.shake?.(0.25);
  p.level.sfx('fence');
}

/** Mitfahren: Bewegung des Zauns in diesem Schritt (vor der eigenen Bewegung). */
export function fenceCarry(p, dt) {
  const fe = p.fence?.obj;
  const m = fe?.mover;
  p.platformVel.set(0, 0, 0);
  if (!m || m.t !== p.level.time) return;
  if (m.dyaw) {
    const dx = p.pos.x - m.cx, dz = p.pos.z - m.cz;
    const ca = Math.cos(m.dyaw), sa = Math.sin(m.dyaw);
    p.pos.x = m.cx + dx * ca + dz * sa;
    p.pos.z = m.cz - dx * sa + dz * ca;
    p.yaw += m.dyaw;
  }
  p.pos.x += m.dx; p.pos.y += m.dy; p.pos.z += m.dz;
  p.platformVel.set(m.vx ?? m.dx / dt, m.vy ?? m.dy / dt, m.vz ?? m.dz / dt);
}

/** Schritt am Zaun (statt Player.updateWall): Eingaben → Geschwindigkeit in der Zaunebene. */
export function updateFence(p, dt, input, want) {
  const F = p.fence, fe = F.obj;
  if (!usable(fe)) { leaveFence(p); return; }
  F.t += dt;
  if (p.buffer > 0 && F.t > 0.08) { p.buffer = 0; fenceJump(p, want); return; }
  if (input.crouchPressed) { leaveFence(p); return; }
  const P = fe.plane;
  // Stick links/rechts = am Zaun entlang in Bildschirmrichtung, hoch/runter = klettern
  const cy = p.level.controlYaw ?? 0;
  const rx = Math.cos(cy), rz = -Math.sin(cy);
  const sA = rx * P.ax + rz * P.az >= 0 ? 1 : -1;
  let mx = input.moveX, my = input.moveY;
  if (Math.abs(mx) < 0.15) mx = 0;
  if (Math.abs(my) < 0.15) my = 0;
  const s = MOVE.fenceSpeed;
  const ua = mx * sA * s;
  p.vel.set(P.ax * ua, my * s, P.az * ua);
  p.fenceMove.x = mx; p.fenceMove.y = my;
  p.setState('fence');
}

/** Nach der Bewegung: an der Zaunebene halten, auf die Zaunfläche begrenzen; unter dem Zaun → loslassen. */
export function fenceAfterMove(p) {
  const F = p.fence;
  if (!F || p.mode !== 'wall') return;
  const fe = F.obj, P = fe.plane;
  if (p.pos.y + p.half.y * 2 < P.y + 0.45) { leaveFence(p); return; }   // Hände unter der Unterkante
  snapToFence(p);
}

function snapToFence(p) {
  const F = p.fence, fe = F.obj, P = fe.plane;
  const L = fenceLocal(fe, p.pos.x, p.pos.y, p.pos.z, L0);
  const umax = Math.max(0, P.w / 2 - 0.3);
  const u = clamp(L.u, -umax, umax);
  const dist = p.half.x + GAP;
  const top = P.y + P.h - p.half.y * 2 + 0.3;   // Hände an der Oberkante
  if (p.pos.y > top) { p.pos.y = top; if (p.vel.y > 0) p.vel.y = 0; }
  p.pos.x = P.x + P.ax * u + P.nx * F.side * dist;
  p.pos.z = P.z + P.az * u + P.nz * F.side * dist;
  p.yaw = Math.atan2(F.side * P.nz, -F.side * P.nx);
  p.wallNormal.set(F.side * P.nx, 0, F.side * P.nz);
}

/** Abspringen: vom Zaun weg (Stick lenkt, nicht in den Zaun), Sprunghöhe MOVE.fenceJump. */
export function fenceJump(p, want) {
  const F = p.fence, P = F.obj.plane;
  const ox = F.side * P.nx, oz = F.side * P.nz;
  let vx = ox * MOVE.fenceAway, vz = oz * MOVE.fenceAway;
  if (want.mag > 0.3) {
    let wx = want.x, wz = want.z;
    const d = wx * ox + wz * oz;
    if (d < 0) { wx -= ox * d; wz -= oz * d; }
    vx += wx * 3; vz += wz * 3;
  }
  const pv = p.platformVel;
  p.fence = null;
  p.mode = 'air';
  p.vel.set(vx + pv.x, vFor(MOVE.fenceJump * p.jumpMult) + Math.max(0, pv.y), vz + pv.z);
  p.yaw = Math.atan2(-vz, vx);
  p.airMax = Math.max(Math.hypot(vx, vz), MOVE.walk * p.speedMult);
  p.grabCooldown = 0.35;
  p.wallCoyote = 0;
  p.enterAir('jump', true);
  p.level.notifyJump?.(p, 'fence');
  p.coyote = 0;
  p.level.sfx('jump');
}

/** Loslassen (Ducken, Treffer, Zaun weg, unter der Unterkante). */
export function leaveFence(p) {
  const F = p.fence;
  p.fence = null;
  if (p.mode !== 'wall') return;
  p.mode = 'air';
  let vx = 0, vz = 0;
  if (F?.obj?.plane) { vx = F.side * F.obj.plane.nx * 0.6; vz = F.side * F.obj.plane.nz * 0.6; }
  p.vel.set(vx + p.platformVel.x, Math.min(0, p.vel.y), vz + p.platformVel.z);
  p.airMax = Math.max(p.hSpeed(), 1);
  p.grabCooldown = 0.35;
  p.jumpKind = null; p.variable = false;
  p.setState('fall');
}

/**
 * Faustschlag durch den Zaun (Aktion am Zaun): trifft Gegner (enemy oder onPunch) bis MOVE.fencePunch um die Hand in
 * der Zaunebene – auf beiden Seiten – mit onHit('punch', figur). Liefert die Zahl der Treffer.
 */
export function fencePunch(p) {
  const F = p.fence;
  if (!F || p.punchTime > 0) return 0;
  p.punchTime = MOVE.fencePunchTime;
  const fe = F.obj, P = fe.plane;
  const c = p.center();
  const L = fenceLocal(fe, c.x, c.y, c.z, L0);
  const hx = c.x - P.nx * L.d, hz = c.z - P.nz * L.d, hy = c.y + 0.1;
  let n = 0;
  for (const e of p.level.entities) {
    if (!e.alive || e.removed || e === fe || e.carrier || e.defeated) continue;
    if (!(e.enemy || e.onPunch) || !e.onHit) continue;
    if (e.distanceTo(hx, hy, hz) > MOVE.fencePunch) continue;
    if (e.onPunch) e.onPunch(p); else e.onHit('punch', p);
    n++;
  }
  fe.shake?.(0.45);
  p.level.effects?.sparks({ x: hx, y: hy, z: hz }, 5);
  p.level.sfx('claw');
  return n;
}
