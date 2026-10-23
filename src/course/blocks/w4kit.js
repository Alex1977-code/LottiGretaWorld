// Gemeinsame Hilfen der Welt-4-Bausteine (blocks/types/w4_*.js, deco_w4.js, entities/kinds/w4_gimmicks.js). Liegt bewusst
// außerhalb von types/ (die Registry sammelt nur types/*.js).
//
//   beatClock(level)          Taktuhr des Levels für Piep-Blöcke, Roulette-Block u. ä. (eine je Level, level.beepClock):
//                             folgt der Taktuhr der laufenden Musik (music.beat(), Präzisierung Audio Welten 2–4), solange
//                             das Sync-Thema (Standard 'course_beep', LEVEL.beepTheme) spielt; sonst – und mit
//                             LEVEL.beepClock = 'level' – eine eigene Uhr auf der Simulationszeit (Tempo des Sync-Themas),
//                             die stetig an die letzte Zählzeit anschließt (Funkelstern-Thema, Musik aus, Tests).
//                             Felder: beat (Kommazahl), whole (ganze Zählzeit), source ('music'|'level'), bpm, every
//                             (switchEvery), warn (warnBeats), mode ('auto'|'music'|'level'), onBeat(fn) → abmelden,
//                             info(). Pieps (sfx 'beep' auf den Warn-Zählzeiten, 'beep_switch' beim Umschalten) spielt die
//                             Uhr nur, wenn sie nicht der Musik folgt (course_beep hat die Pieps schon in der Bell-Spur)
//                             und ein Baustein sie mit wantSounds() angefordert hat.
//   smoothPath(points)        Catmull-Rom-Pfad mit Bogenlänge: { L, at(s, out), tangent(s, out) }
//   figuresIn(level, box, eps) Figuren, deren Hüllquader den Quader { x0, x1, y0, y1, z0, z1 } durchdringen
//   pushOutOf(level, who, box, dt, speed)  sanft aus einem Quader schieben (Piep-Blöcke, die erscheinen)
//   glowSprite(...)           weiches additives Leuchten (Canvas-Textur) für Lava/Gift/Neon
//
// Taktuhr in Tests: entweder die Musik-Uhr steuern (window.__audio.music.setManualClock(true), music.play('course_beep'),
// music.advanceClock(s) vor __course.step(n)) oder level.beepClock.mode = 'level' setzen (dann zählt nur step()).

import * as THREE from 'three';
import { music } from '../../audio/index.js';
import { figures } from './w2kit.js';

export const BEEP_THEME = 'course_beep';

function themeSync(theme) {
  let info = null;
  try { info = music.themeInfo(theme); } catch { info = null; }
  return { bpm: info?.bpm || 120, every: info?.sync?.switchEvery ?? 8, warn: info?.sync?.warnBeats ?? 3 };
}

/** Taktuhr des Levels (eine je Level; der erste Aufruf meldet sie in level.onStep an). */
export function beatClock(level) {
  if (level.beepClock) return level.beepClock;
  const theme = level.data?.beepTheme ?? BEEP_THEME;
  const s = themeSync(theme);
  const clock = {
    theme, bpm: s.bpm, every: s.every, warn: s.warn,
    mode: level.data?.beepClock ?? 'auto',   // 'auto' | 'music' | 'level'
    beat: 0, whole: 0, source: 'level', started: false, sounds: 0, switches: 0,
    listeners: new Set(),
    onBeat(fn) { clock.listeners.add(fn); return () => clock.listeners.delete(fn); },
    wantSounds() { clock.sounds++; },
    /** Ganze Zählzeit k im Achterblock (0 … every−1) zur Zählzeit b (mit Versatz). */
    inCycle(b, every = clock.every) { const k = Math.floor(b) % every; return k < 0 ? k + every : k; },
    info() {
      return { beat: +clock.beat.toFixed(3), whole: clock.whole, source: clock.source, bpm: clock.bpm, every: clock.every, warn: clock.warn, mode: clock.mode, theme: clock.theme };
    },
    step(dt) {
      let mb = null;
      if (clock.mode !== 'level') { try { mb = music.beat(); } catch { mb = null; } }
      const fromMusic = !!mb && mb.playing && mb.bpm > 0 && (clock.mode === 'music' || mb.theme === clock.theme);
      if (fromMusic) { clock.beat = mb.beat; clock.bpm = mb.bpm; clock.source = 'music'; }
      else { clock.beat += dt * clock.bpm / 60; clock.source = 'level'; }
      const w = Math.floor(clock.beat + 1e-9);
      if (!clock.started) { clock.started = true; clock.whole = w; return; }
      if (w === clock.whole) return;
      clock.whole = w;
      const k = clock.inCycle(w);
      if (clock.sounds && clock.source === 'level') {
        if (k === 0) level.sfx('beep_switch');
        else if (k >= clock.every - clock.warn) level.sfx('beep');
      }
      for (const fn of [...clock.listeners]) fn(w, k);
    },
  };
  level.beepClock = clock;
  level.onStep((dt) => clock.step(dt));
  return clock;
}

// ------------------------------------------------------------------ Pfade

/** Glatter Pfad durch die Punkte (Catmull-Rom, Bogenlänge): { L, at(s, out), tangent(s, out), points }. */
export function smoothPath(points, closed = false) {
  const P = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  if (P.length === 1) P.push(P[0].clone());
  const curve = P.length > 2 ? new THREE.CatmullRomCurve3(P, closed, 'centripetal', 0.5) : new THREE.LineCurve3(P[0], P[1]);
  const L = curve.getLength();
  return {
    L, curve, points: P,
    at(s, out = new THREE.Vector3()) { return L > 1e-6 ? curve.getPointAt(Math.min(1, Math.max(0, s / L)), out) : out.copy(P[0]); },
    tangent(s, out = new THREE.Vector3()) { return L > 1e-6 ? curve.getTangentAt(Math.min(1, Math.max(0, s / L)), out) : out.set(1, 0, 0); },
  };
}

// ------------------------------------------------------------------ Herausschieben

/** Steckt der Hüllquader (pos = Fußpunkt, half) im Quader b (Durchdringung > eps)? */
export function penetrates(pos, half, b, eps = 0.02) {
  return pos.x + half.x > b.x0 + eps && pos.x - half.x < b.x1 - eps
    && pos.z + half.z > b.z0 + eps && pos.z - half.z < b.z1 - eps
    && pos.y + 2 * half.y > b.y0 + eps && pos.y < b.y1 - eps;
}

/** Figuren (auch Klone), die im Quader b stecken. */
export function figuresIn(level, b, eps = 0.02) {
  return figures(level).filter((p) => p.mode !== 'script' && penetrates(p.pos, p.half, b, eps));
}

const _c = new THREE.Vector3(), _d = new THREE.Vector3();

/**
 * Figur/Gegner `who` (pos = Fußpunkt, half) sanft aus dem Quader b schieben: nach oben, wenn die Füße im oberen Teil
 * stecken (≤ 0,65 m), nach unten, wenn nur der Kopf knapp hineinragt, sonst zur nächsten Seite. Bewegung mit Kollision
 * (andere Formen bleiben fest), höchstens speed·dt je Schritt. Liefert true, solange noch geschoben wird.
 */
export function pushOutOf(level, who, b, dt, speed = 7) {
  const p = who.pos, h = who.half;
  if (!penetrates(p, h, b)) return false;
  const up = b.y1 - p.y, down = p.y + 2 * h.y - b.y0;
  const sides = [
    [(p.x + h.x) - b.x0, -1, 0], [b.x1 - (p.x - h.x), 1, 0],
    [(p.z + h.z) - b.z0, 0, -1], [b.z1 - (p.z - h.z), 0, 1],
  ].sort((a, c) => a[0] - c[0]);
  let dx = 0, dy = 0, dz = 0, dist;
  if (up <= 0.65) { dy = 1; dist = up + 0.02; }
  else if (down <= 0.4 && down < sides[0][0]) { dy = -1; dist = down + 0.02; }
  else { dx = sides[0][1]; dz = sides[0][2]; dist = sides[0][0] + 0.03; }
  const m = Math.min(dist, speed * dt);
  _c.set(p.x, p.y + h.y, p.z);
  _d.set(dx * m, dy * m, dz * m);
  level.world.moveAABB(_c, h, _d, { step: 0 });
  p.set(_c.x, _c.y - h.y, _c.z);
  if (who.vel) {
    if (dy > 0 && who.vel.y < 0) who.vel.y = 0;
    if (dx && Math.sign(who.vel.x) !== dx) who.vel.x = 0;
    if (dz && Math.sign(who.vel.z) !== dz) who.vel.z = 0;
  }
  return true;
}

// ------------------------------------------------------------------ Leuchten

let glowTex = null;
/** Weiche, runde Leucht-Textur (geteilt). */
export function glowTexture() {
  if (glowTex) return glowTex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Additives Leucht-Sprite (Farbe, Größe m). */
export function glowSprite(color, size = 2, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

/** Deterministische Zahl 0..1 aus Koordinaten. */
export function hash01(a, b = 0, c = 0) {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
