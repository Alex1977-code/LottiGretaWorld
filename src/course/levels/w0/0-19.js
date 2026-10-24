// Tempel des Kippquader-Königs (0-19): Testlevel für den Endgegner von 5-Burg (tests/course_w5_enemies.mjs) mit Archetyp
// 'boss'. Quadratische Tempel-Arena (20 × 20 m, Oberseite y = 2) über dem Abgrund: Kreuz aus zwei Inseln, die vier Ecken
// (4 × 4 m) sind Bruchplatten – nach Treffer 1 brechen die vorderen, nach Treffer 2 die hinteren weg (Bauplan). Zwei
// Begleit-Kippquader stehen links und rechts auf den Armen und kippen in Phase 3 mit. Der König steht hinten in der Mitte
// und blickt zur Figur; der Kampf beginnt beim Schritt vom Steg in die Arena. Nach dem Sieg: Stern vorn, Warp-Box hinten
// zum Zielplateau. Thema 'temple', Musik course_temple.

const Y = 2;
const A = 10;        // halbe Kantenlänge der Arena
const C = 4;         // Kantenlänge der Ecken

export const LEVEL = {
  id: '0-19',
  world: 0,
  title: 'Tempel des Kippquader-Königs',
  archetype: 'boss',
  theme: 'temple',
  music: 'course_temple',
  timeLimit: 400,
  start: { pos: [0, Y, 17], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 17], yaw: Math.PI / 2 }],
  camera: [
    { from: 26, to: -14, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -24, to: -60, pitch: 42, dist: 12.5, ahead: 2, area: [-20, 20] },
  ],
  boss: {
    id: 'koenig', name: 'Kippquader-König', speed: 0,
    trigger: { min: [-A, Y - 0.5, -A], max: [A, Y + 8, A - 0.6] },
    lock: { min: [-2.2, Y - 0.5, A + 0.2], max: [2.2, Y + 5, A + 0.8] },
    warp: 'warp_sieg', warpPos: [0, Y, -7.5], warpTo: [0, Y + 0.3, -40], frame: 0.45, musicAfter: 'course_temple',
    center: [0, Y, 0],
  },
  segments: [
    // Arena als Kreuz (die Ecken sind Bruchplatten), Steg, Zielplateau
    { type: 'island', pos: [0, -2, 0], size: [2 * A, Y + 2, 2 * A - 2 * C], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -2, 0], size: [2 * A - 2 * C, Y + 2, 2 * A], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -2, A + 4.5], size: [4.4, Y + 2, 9], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -1, -42], size: [14, Y + 1, 16], top: 'stone' },
    { type: 'killplane', y: -10 },
    // Begleit-Kippquader (kippen erst, wenn der König in Phase 3 kippt)
    { type: 'kippquader', id: 'kq_l', pos: [-8, Y, 1], size: [2, 4, 2], steps: ['+z', '-z'], start: 'signal', wait: 1.6, warn: 0.8, style: 'tempel' },
    { type: 'kippquader', id: 'kq_r', pos: [8, Y, -1], size: [2, 4, 2], steps: ['-z', '+z'], start: 'signal', wait: 1.6, warn: 0.8, style: 'tempel' },
    { type: 'deco_w5', shadow: false, items: [
      { kind: 'tempelsaeule', pos: [-1.75, Y, A + 8.4], height: 4.5, r: 0.45 }, { kind: 'tempelsaeule', pos: [1.75, Y, A + 8.4], height: 4.5, r: 0.45 },
      { kind: 'obelisk', pos: [-5, Y, -37], height: 5 }, { kind: 'obelisk', pos: [5, Y, -37], height: 5 },
    ] },
  ],
  enemies: [
    {
      kind: 'kippquader_koenig', id: 'koenig', pos: [0, Y, -5], dir: [0, 1], arena: { min: [-A, -A], max: [A, A] },
      corners: [['ecke_vl', 'ecke_vr'], ['ecke_hl', 'ecke_hr']], escorts: ['kq_l', 'kq_r'],
      star: { pos: [0, Y + 0.4, 6.5], index: 0 },
    },
  ],
  items: [
    { kind: 'bruchplatte', id: 'ecke_vl', pos: [-A + C / 2, Y, A - C / 2], size: [C, C] },
    { kind: 'bruchplatte', id: 'ecke_vr', pos: [A - C / 2, Y, A - C / 2], size: [C, C] },
    { kind: 'bruchplatte', id: 'ecke_hl', pos: [-A + C / 2, Y, -A + C / 2], size: [C, C] },
    { kind: 'bruchplatte', id: 'ecke_hr', pos: [A - C / 2, Y, -A + C / 2], size: [C, C] },
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, -7.5], target: [0, Y + 0.3, -40], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -44], r: 2.2, n: 8 },
  ],
  goal: [0, Y, -48],
  marks: { center: [0, Y, 0], start: [0, Y, 17], plateau: [0, Y, -40] },
};
