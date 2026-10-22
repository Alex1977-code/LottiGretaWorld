// Eis für Entitäten (Präzisierung Motor Welt 3: „Gegner auf Eis rutschen ebenfalls“). Liegt außerhalb von kinds/ (die
// Registry sammelt nur kinds/*.js).
//
// CourseEntity.moveWithGravity ruft iceSlide(e, dt), solange die Entität auf einer Form mit `ice` steht: die von der KI
// gesetzte Geschwindigkeit (e.vel.x/z) gilt dann als Wunsch, die tatsächliche Geschwindigkeit (e._iceV) nähert sich ihr
// nur mit e.iceAccel (Standard ICE_ACCEL m/s²) – Anhalten, Wenden und Umkehren an Kanten rutschen nach (wer an einer
// Kante umdreht, kann hinunterrutschen). Danach steht in e.vel die tatsächliche Geschwindigkeit.
// Abschalten je Entität: `noIce = true` (z. B. eigene Eisläufer-Physik); anderer Wert: `iceAccel`.
// Abfrage für eigene KI: onIce(e) → true, wenn die Entität gerade auf Eis steht.

export const ICE_ACCEL = 3.5;

/** Steht die Entität auf Eis? */
export function onIce(e) { return !!(e.grounded && e.ground?.ice); }

/** Vor der Bewegung: Wunsch-Geschwindigkeit → träge tatsächliche Geschwindigkeit. */
export function iceSlide(e, dt) {
  const v = e._iceV ?? (e._iceV = { x: e.vel.x, z: e.vel.z });
  const tx = e.vel.x, tz = e.vel.z;
  const dx = tx - v.x, dz = tz - v.z, dl = Math.hypot(dx, dz), m = (e.iceAccel ?? ICE_ACCEL) * dt;
  if (dl > m) { v.x += (dx / dl) * m; v.z += (dz / dl) * m; } else { v.x = tx; v.z = tz; }
  e.vel.x = v.x; e.vel.z = v.z;
}

/** Nach der Bewegung (Wände haben die Geschwindigkeit begrenzt): Zustand übernehmen. */
export function iceAfterMove(e) {
  if (!e._iceV) return;
  e._iceV.x = e.vel.x; e._iceV.z = e.vel.z;
}
