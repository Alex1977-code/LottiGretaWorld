// Hangeln am Deckengitter (Präzisierung Motor und Bausteine Welt 6; Bauplan 6-4 „viele Klettergitter“, Klettergitter an
// Decken). Wandgitter nutzen das Zaun-Klettern (player/fencing.js, level.fences); hier nur das Hängen UNTER einem
// waagerechten Gitter.
//
// Deckengitter (Baustein `klettergitter` mit mode 'decke', blocks/types/w6_grid.js) tragen sich in `level.hangGrids` ein:
//   grid = { x0, x1, z0, z1 (Rechteck der Gitterebene), y (Höhe der Gitterebene), alive, hidden, shake(a)?, mover? }
//   mover (optional, fahrendes Gitter) = { dx, dy, dz, t } wie beim Zaun (fenceCarry).
// Figur am Deckengitter: mode bleibt 'wall' (wie am Zaun: Kamera, Autoscroller, Klone behandeln sie wie an einer Wand),
// `player.hang = { obj, t }`, state **'hang'**, `player.hangMove = { x, y }` (−1..1 Stick, x = Bildschirm rechts,
// y = Bildschirm hoch/vor). Greifen: im Sprung von unten mit den Händen ans Gitter (Hände ≤ HANG.grab unter/über der
// Ebene, nicht beim Stampfen/Sturzflug/Treffer, ohne Last). Am Gitter: Stick = hangeln in der Ebene (HANG.speed,
// kamerabezogen), Sprung oder Ducken = loslassen (fallen), am Rand bleibt die Figur hängen (kein Absturz aus Versehen).
// Treffer/Tod lösen sie (Player.knockback/die). Berührungen mit Gegnern laufen normal weiter.
// Fußpunkt der hängenden Figur: Gitterebene − (Körperhöhe + HANG.arm) – die Hände liegen am Gitter (wie am Trapez).
//
// API: tryGrabHang(player, input, want) (Player.update in der Luft), updateHang(player, dt, input, want) (Player.updateWall),
//      hangAfterMove(player) (nach der Bewegung), leaveHang(player), HANG (Werte).

export const HANG = {
  speed: 3.0,     // m/s hangeln
  arm: 0.2,       // m Hände über dem Scheitel
  grab: 0.55,     // m: Hände so weit unter der Gitterebene (bzw. 0,25 m darüber) greifen
  edge: 0.2,      // m Abstand der Figurmitte zum Gitterrand
  cool: 0.4,      // s nach dem Loslassen kein erneutes Greifen
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const usable = (g) => g && g.alive !== false && !g.removed && !g.hidden;
const handsY = (p) => p.pos.y + p.half.y * 2 + HANG.arm;

/** In der Luft: von unten ans Deckengitter greifen? → true, wenn gegriffen. */
export function tryGrabHang(p, input, want) {
  const list = p.level.hangGrids;
  if (!list?.length || p.grabCooldown > 0 || p.holding || p.skate || p.dead || p.hang) return false;
  if (p.state === 'groundpound' || p.state === 'dive' || p.state === 'hurt') return false;
  const hy = handsY(p);
  for (const g of list) {
    if (!usable(g)) continue;
    if (p.pos.x < g.x0 + 0.05 || p.pos.x > g.x1 - 0.05 || p.pos.z < g.z0 + 0.05 || p.pos.z > g.z1 - 0.05) continue;
    if (hy < g.y - HANG.grab || hy > g.y + 0.25) continue;
    if (p.vel.y < -6 && hy < g.y - 0.2) continue;   // schnell vorbeifallend: nicht greifen
    grabHang(p, g);
    return true;
  }
  return false;
}

export function grabHang(p, g) {
  p.hang = { obj: g, t: 0 };
  p.fence = null;
  p.mode = 'wall';
  p.wallShape = null;
  p.wallNormal.set(0, 0, 1);
  p.wallCoyote = 0;
  p.vel.set(0, 0, 0);
  p.gs = 0;
  p.setCrouch(false);
  p.jumpKind = null; p.variable = false;
  p.gliding = false;
  p.buffer = 0;
  if (!p.hangMove) p.hangMove = { x: 0, y: 0 };
  p.hangMove.x = 0; p.hangMove.y = 0;
  p.setState('hang');
  snap(p);
  g.shake?.(0.25);
  p.level.sfx('fence');
}

/** Mitfahren mit einem fahrenden Gitter (vor der Bewegung). */
function carry(p) {
  const m = p.hang?.obj?.mover;
  p.platformVel.set(0, 0, 0);
  if (!m || m.t !== p.level.time) return;
  p.pos.x += m.dx; p.pos.y += m.dy; p.pos.z += m.dz;
}

/** Schritt am Deckengitter (statt Player.updateWall): Stick → Geschwindigkeit in der Ebene. */
export function updateHang(p, dt, input, want) {
  const H = p.hang, g = H.obj;
  if (!usable(g)) { leaveHang(p); return; }
  H.t += dt;
  carry(p);
  if ((p.buffer > 0 && H.t > 0.12) || input.crouchPressed) { p.buffer = 0; leaveHang(p); return; }
  const mag = want.mag > 0.12 ? Math.min(1, want.mag / 0.85) : 0;
  p.vel.set(want.x * HANG.speed * mag, 0, want.z * HANG.speed * mag);
  if (mag > 0) p.yaw = Math.atan2(-want.z, want.x);
  p.hangMove.x = Math.abs(input.moveX) > 0.12 ? input.moveX : 0;
  p.hangMove.y = Math.abs(input.moveY) > 0.12 ? input.moveY : 0;
  p.setState('hang');
}

/** Nach der Bewegung: an die Gitterebene hängen, auf das Rechteck begrenzen. */
export function hangAfterMove(p) {
  if (!p.hang || p.mode !== 'wall') return;
  snap(p);
}

function snap(p) {
  const g = p.hang.obj, e = HANG.edge;
  p.pos.x = clamp(p.pos.x, g.x0 + e, g.x1 - e);
  p.pos.z = clamp(p.pos.z, g.z0 + e, g.z1 - e);
  p.pos.y = g.y - p.half.y * 2 - HANG.arm;
}

/** Loslassen (Sprung, Ducken, Treffer, Gitter weg). */
export function leaveHang(p) {
  const H = p.hang;
  p.hang = null;
  if (p.mode !== 'wall') return;
  p.mode = 'air';
  p.vel.set(p.vel.x * 0.5, -0.5, p.vel.z * 0.5);
  p.airMax = Math.max(p.hSpeed(), 1.5);
  p.grabCooldown = HANG.cool;
  p.jumpKind = null; p.variable = false;
  p.setState('fall');
  H?.obj?.shake?.(0.15);
}
