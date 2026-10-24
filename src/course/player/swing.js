// Trapez-Schwingen der Spielfigur (Präzisierung Motor und Bausteine Welt 5; Bauplan 5-2 „Zirkus mit Trapezen“).
//
// Ein Trapez (Baustein `trapez`, blocks/types/w5_circus.js) ist ein Pendel: Aufhängung `pivot`, Seillänge `L` bis zur
// Stange, Schwingebene entlang `dir` (waagerechter Einheitsvektor), Winkel `theta` (rad, + = Stange vor der Aufhängung
// in Richtung dir), Winkelgeschwindigkeit `omega`. Es schwingt leer von selbst (Energie-Regelung auf `idleAmp`) und
// trägt sich in `level.trapezes` ein. Die Figur greift es im Sprung (Hände nahe der Stange), hängt im Skript-Modus
// (player.ride mit solo: true – Klone schwingen je für sich) mit state 'trapeze' darunter und schwingt mit:
//   - Stick in Schwungrichtung schaukelt auf (Ziel-Ausschlag +swing.pump °/s bis maxAmp), entgegen bremst ab.
//   - Sprung lässt los: Geschwindigkeit der Hände (Bahn der Stange) + Absprung (SWING.up nach oben, SWING.fwd in
//     Schwungrichtung) – bei ≈ 45° Ausschlag reicht das genau für den Schwungabstand 4–5 m zum nächsten Trapez.
//   - Ducken lässt fallen (nur die Bahngeschwindigkeit).
// Die Figur hängt mit den Händen an der Stange: Fußpunkt = Stange + (Körperhöhe + Armlänge) entlang des Seils;
// player.swingTilt = Seilwinkel (HeroRig neigt die Darstellung darum), player.swingVel = omega, player.trapeze = Trapez.
//
// API: tryGrabTrapeze(player, input) (aus Player.update in der Luft), trapezeCtl(trapez, player) (player.ride),
//      pendulumStep(t, dt) (Physik je Schritt; das Trapez ruft sie in level.onStep), SWING (Werte).

import { MOVE } from './moveset.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const SWING = {
  g: 22,              // m/s² Pendel-Schwerkraft (Periode 2π·√(L/g) ≈ 2,3 s bei 3 m)
  arm: 0.26,          // m Hände über dem Scheitel
  grabR: 0.8,         // m Hände ↔ Stange zum Greifen
  grabTime: 0.12,     // s Übergang in die Hängelage
  cool: 0.35,         // s nach dem Loslassen kein erneutes Greifen (dasselbe Trapez 0,6 s)
  riderAmp: 40,       // ° Ausschlag, auf den ein gegriffenes Trapez mindestens schwingt
  maxAmp: 66,         // ° größter Ausschlag (Aufschaukeln)
  minAmp: 8,          // ° kleinster Ausschlag (Abbremsen)
  pump: 26,           // °/s Ziel-Ausschlag je s mit voll ausgelenktem Stick in Schwungrichtung
  gain: 2.4,          // Energie-Regelung (1/s)
  up: 5,              // m/s Absprung nach oben
  fwd: 2,             // m/s Absprung in Schwungrichtung
  carry: 0.5,         // Anteil der Sprung-Geschwindigkeit (entlang dir), der beim Greifen in den Schwung geht
};

/** Pendel einen Schritt rechnen (Energie-Regelung auf den Ziel-Ausschlag t.targetAmp bzw. t.idleAmp). */
export function pendulumStep(t, dt) {
  const wn2 = (t.g ?? SWING.g) / t.L;
  const amp = (t.rider ? t.targetAmp : t.idleAmp) * DEG;
  const E = 0.5 * t.omega * t.omega + wn2 * (1 - Math.cos(t.theta));
  const Et = wn2 * (1 - Math.cos(amp));
  // Ohne Ausschlag (Stillstand) bekommt die Regelung einen winzigen Anstoß, sonst bleibt das Pendel stehen
  if (Math.abs(t.omega) < 1e-4 && Math.abs(t.theta) < 1e-4 && amp > 0) t.omega = 1e-3;
  const a = -wn2 * Math.sin(t.theta) + (t.gain ?? SWING.gain) * (Et - E) / Math.max(0.05, Et + 0.05) * Math.sign(t.omega) * Math.min(4, Math.abs(t.omega) + 0.6) - (t.damp ?? 0) * t.omega;
  t.omega += a * dt;
  t.theta += t.omega * dt;
}

/** Stange (Mitte) des Trapezes → out {x, y, z}. */
export function barPos(t, out = { x: 0, y: 0, z: 0 }) {
  const s = Math.sin(t.theta), c = Math.cos(t.theta);
  out.x = t.pivot.x + t.dir.x * s * t.L;
  out.y = t.pivot.y - c * t.L;
  out.z = t.pivot.z + t.dir.z * s * t.L;
  return out;
}

/** Höhe der Hände über dem Fußpunkt (Körperhöhe + Arme). */
const reach = (p) => p.half.y * 2 + SWING.arm;

/** Fußpunkt der hängenden Figur (entlang des Seils unter der Stange). */
function hangPos(t, p, out) {
  barPos(t, out);
  const s = Math.sin(t.theta), c = Math.cos(t.theta), h = reach(p);
  out.x += t.dir.x * s * h; out.y -= c * h; out.z += t.dir.z * s * h;
  return out;
}

/**
 * In der Luft: nahes freies Trapez greifen (Hände ≤ grabR an der Stange, nicht beim Stampfen/Sturzflug/Treffer, ohne
 * Last/Helm-Flug, Sperre nach dem Loslassen). → true, wenn gegriffen.
 */
export function tryGrabTrapeze(p, input) {
  const L = p.level, list = L.trapezes;
  if (!list?.length || p.mode !== 'air' || p.dead || p.holding || p.skate) return false;
  if (p.state === 'groundpound' || p.state === 'dive' || p.state === 'hurt' || p.statue) return false;
  if ((p._trapezeFree ?? 0) > L.time) return false;
  const hx = p.pos.x, hy = p.pos.y + reach(p), hz = p.pos.z;
  const b = { x: 0, y: 0, z: 0 };
  let best = null, bd = Infinity;
  for (const t of list) {
    if (t.removed || t.hidden || (t.rider && t.rider !== p) || (p._trapezeLast === t && (p._trapezeAgain ?? 0) > L.time)) continue;
    barPos(t, b);
    // Abstand zur Stange (Strecke quer zur Schwingebene, halbe Breite t.w/2)
    const sx = -t.dir.z, sz = t.dir.x;
    const u = clamp((hx - b.x) * sx + (hz - b.z) * sz, -t.w / 2, t.w / 2);
    const cx = b.x + sx * u, cz = b.z + sz * u;
    const d = Math.hypot(hx - cx, (hy - b.y) * 1.15, hz - cz);
    if (d < SWING.grabR && d < bd) { bd = d; best = t; }
  }
  if (!best) return false;
  grabTrapeze(p, best);
  return true;
}

/** Trapez greifen: Schwung der Figur geht teilweise ins Pendel, dann gesteuerter Ablauf. */
export function grabTrapeze(p, t) {
  const along = p.vel.x * t.dir.x + p.vel.z * t.dir.z;
  t.omega += (SWING.carry * along) / t.L * Math.max(0.3, Math.cos(t.theta));
  t.rider = p;
  // Ziel-Ausschlag: mindestens riderAmp, sonst der aktuelle (aus Winkel und Tempo)
  const wn2 = (t.g ?? SWING.g) / t.L;
  const E = 0.5 * t.omega * t.omega + wn2 * (1 - Math.cos(t.theta));
  const cur = Math.acos(clamp(1 - E / wn2, -1, 1)) / DEG;
  t.targetAmp = clamp(Math.max(cur, t.riderAmp ?? SWING.riderAmp), SWING.minAmp, t.maxAmp ?? SWING.maxAmp);
  t.grabs = (t.grabs ?? 0) + 1;
  p.ride(trapezeCtl(t, p), { state: 'trapeze', kind: 'trapez', solo: true });
  p.trapeze = t;
  p.level.sfx('grab');
  p.level.sfx('swing');
  t.onGrab?.(p);
}

/** Gesteuerter Ablauf am Trapez (player.ride): Hängen, Aufschaukeln, Loslassen. */
export function trapezeCtl(t, p) {
  const from = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
  const q = { x: 0, y: 0, z: 0 };
  let k = 0, how = null, startT = 0;
  return {
    step(pl, dt, input, sc) {
      if (t.removed || t.hidden) { how = 'drop'; return true; }
      startT += dt;
      // Stick → Welt (relativ zur Kamera), Anteil entlang der Schwingebene
      const cy = pl.level.controlYaw ?? 0, c = Math.cos(cy), s = Math.sin(cy);
      const wx = c * input.moveX - s * input.moveY, wz = -s * input.moveX - c * input.moveY;
      const along = clamp(wx * t.dir.x + wz * t.dir.z, -1, 1);
      if (Math.abs(along) > 0.2) {
        const withSwing = Math.sign(along) === Math.sign(t.omega || along);
        t.targetAmp = clamp(t.targetAmp + (withSwing ? 1 : -1.3) * SWING.pump * Math.abs(along) * dt, SWING.minAmp, t.maxAmp ?? SWING.maxAmp);
      }
      hangPos(t, pl, q);
      k = Math.min(1, startT / SWING.grabTime);
      const e = k * k * (3 - 2 * k);
      pl.pos.set(from.x + (q.x - from.x) * e, from.y + (q.y - from.y) * e, from.z + (q.z - from.z) * e);
      const v = t.L * t.omega, cth = Math.cos(t.theta), sth = Math.sin(t.theta);
      pl.vel.set(t.dir.x * v * cth, v * sth, t.dir.z * v * cth);
      // Blick in die Schwingebene (zur Seite, in die die Stick-/Schwungrichtung zeigt), Neigung entlang des Seils
      pl.yaw = Math.atan2(-t.dir.z, t.dir.x);
      pl.swingTilt = t.theta * e;
      pl.swingVel = t.omega;
      pl.phase = clamp(Math.abs(t.theta) / ((t.maxAmp ?? SWING.maxAmp) * DEG), 0, 1);
      pl.setState('trapeze');
      if (startT > 0.08 && input.jumpPressed) { how = 'jump'; return true; }
      if (startT > 0.08 && input.crouchPressed) { how = 'drop'; return true; }
      return false;
    },
    exit(pl) {
      const v = t.L * t.omega, cth = Math.cos(t.theta), sth = Math.sin(t.theta);
      let vx = t.dir.x * v * cth, vy = v * sth, vz = t.dir.z * v * cth;
      t.rider = null;
      t.releases = (t.releases ?? 0) + 1;
      pl.trapeze = null;
      pl.swingTilt = 0; pl.swingVel = 0; pl.phase = 0;
      pl._trapezeFree = pl.level.time + SWING.cool;
      pl._trapezeLast = t; pl._trapezeAgain = pl.level.time + 0.6;
      if (how === 'jump') {
        const sg = Math.sign(t.omega) || 1;
        vx += t.dir.x * SWING.fwd * sg; vz += t.dir.z * SWING.fwd * sg; vy = Math.max(vy, 0) + SWING.up;
        pl.vel.set(vx, vy, vz);
        pl.enterAir('jump', true);
        pl.airMax = Math.max(Math.hypot(vx, vz), MOVE.walk * pl.speedMult);
        if (Math.hypot(vx, vz) > 0.5) pl.yaw = Math.atan2(-vz, vx);
        pl.level.sfx('jump2');
        pl.level.notifyJump?.(pl, 'trapeze');
      } else {
        pl.vel.set(vx, Math.min(vy, 2), vz);
        pl.enterAir(null, false);
        pl.setState('fall');
      }
      t.onRelease?.(pl, how);
    },
  };
}
