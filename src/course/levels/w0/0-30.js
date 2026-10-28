// Werferturm-Arena (0-30): kleine Arena mit einem Werferturm (Feuer-Werfer obenauf) und einem Pilzling – ohne
// level-lokale Hilfe. Prüft in tests/course_motor_fixes.mjs (Präzisierung „Motor-Feinschliff nach Welt 6“), dass der
// Arena-Neustart nach einem Tod genau einen Turm mit einem Werfer baut (Reiter-Spec mit `kind` und `spawnedBy`), den
// Werfer mitzählt und keine Warnung „unbekannte Entität“ ausgibt.

export const LEVEL = {
  id: '0-30',
  world: 0,
  title: 'Werferturm-Arena',
  archetype: 'arena',
  theme: 'grass',
  music: 'course_arena',
  timeLimit: 300,
  starSlots: 1,
  killY: -8,
  start: { pos: [0, 1, 8], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 46, dist: 20, x: 0, xLock: 0.35, ahead: 1.2, lead: 0.5, height: 2 }],
  arena: { enemies: 'all', star: [0, 1.6, 0], starIndex: 0, intro: '', center: [0, 1, -2] },
  segments: [
    { type: 'island', pos: [0, -3, -2], size: [24, 4, 24], under: 0 },
  ],
  enemies: [
    { kind: 'werferturm', id: 'turm', pos: [0, 1, -6], count: 4, riderId: 'reiter', speed: 0, sight: 12, throwSight: 12, first: 30, wake: 40 },
    { kind: 'pilzling', id: 'pilz', pos: [6, 1, -6], speed: 0, wake: 999 },
  ],
  stars: [],
  marks: { start: [0, 1, 8], center: [0, 1, -2] },
};
