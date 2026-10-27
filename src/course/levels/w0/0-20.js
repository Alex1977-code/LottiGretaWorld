// Halloween-Werkstatt (0-20): jeder Halloween-Baustein der „Kürbisinsel“ in einer Station mit Schild, Kameraschiene und
// benannten Punkten (marks) für tests/course_hw_blocks.mjs. Thema graveyard (Mondnacht); mit ?theme=<name> lässt sich jedes
// Halloween-Thema ansehen (pumpkin, pumpkin_night, candyvillage, graveyard, witchtower, castle_night). Level verläuft nach
// −Z; Plateaus mit Oberseite y = 1.
//   S0  Start: Kürbisfeld-Kulisse, Süßigkeiten                               z    6 …   −6
//   S1  Laternenlicht: Laterne aufheben → Geisterplattformen über dem Abgrund; z   −6 …  −52
//       Laternenpfahl (blinkt) beleuchtet eine zweite Geisterbrücke
//   S2  Besen-Plattform über die Schlucht (fliegt los, wenn man draufsteht)    z  −52 …  −78
//   S3  Hexenkessel (hoher Sprung, Blubber), Zaubertrank-Blasen,               z  −78 … −100
//       Spinnennetz-Trampolin
//   S4  Kürbis-Kanone (30 m)                                                  z −100 … −140
//   S5  Süßes-oder-Saures-Gasse: drei Türen (Bitcoins, Süßes, Kürbling)        z −140 … −170
//   S6  Riesenkürbisse rollen aus dem Spender den Hang hinab                  z −170 … −200
//   S7  Grabstein-Schalter (Weg erscheint; Zeit-Schalter mit Laterne)         z −200 … −232
//   S8  Glibberbach: Floßfahrt mit Pflaume                                    z −232 … −290
//   S9  Nebelfeld und Kulissen-Schau                                          z −290 … −312
//   S10 Ziel                                                                  z −312 … −324

const plat = (z0, z1, top = 1, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

export const LEVEL = {
  id: '0-20',
  world: 0,
  title: 'Halloween-Werkstatt',
  archetype: 'parcours',
  theme: 'graveyard',
  music: 'course_grass',
  timeLimit: 999,
  candyHud: true,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -6, pitch: 42, dist: 14 },
    { from: -6, to: -52, pitch: 46, dist: 15 },
    { from: -52, to: -78, pitch: 42, dist: 15 },
    { from: -78, to: -100, pitch: 36, dist: 16, height: 2.5 },
    { from: -100, to: -140, pitch: 40, dist: 16 },
    { from: -140, to: -170, pitch: 44, dist: 14 },
    { from: -170, to: -200, pitch: 46, dist: 16 },
    { from: -200, to: -232, pitch: 46, dist: 15 },
    { from: -232, to: -290, pitch: 42, dist: 14, ahead: 2.4 },
    { from: -290, to: -330, pitch: 42, dist: 15 },
  ],
  segments: [
    // ---------------- S0 Start
    plat(6, -6),
    sign(-7, 1, 0, 'Halloween-Werkstatt'),
    { type: 'deco_hw', items: [
      { kind: 'kuerbisse', pos: [-9, 1, 1], size: [6, 8], n: 7, faces: 0.5 },
      { kind: 'vogelscheuche', pos: [9.5, 1, -1], size: 1 },
      { kind: 'strohballen', pos: [8, 1, 3.5], form: 'eckig', yaw: 0.3 },
      { kind: 'strohballen', pos: [10.5, 1, 3], form: 'rund', yaw: 1.2 },
      { kind: 'kuerbislaterne', pos: [-4, 1, -4.5], size: 0.8 },
      { kind: 'kuerbis', pos: [4.5, 1, -3.5], size: 1.3, face: 'grinsen', color: 'orange', shape: 'dick' },
    ] },

    // ---------------- S1 Laternenlicht
    plat(-6, -14),
    sign(-10, 1, -7, 'Laternenlicht'),
    { type: 'laternenlicht', radius: 5 },
    { type: 'geisterplattform', id: 'geist1', light: 'laterne', from: [0, 0.5, -16.5], to: [0, 0.5, -26.5], n: 4, size: [2.6, 0.5, 2.4] },
    plat(-28, -34),
    // Laternenpfahl auf einer Felsnadel mitten in der Schlucht: blinkt (flackert vor dem Ausgehen) – nur er zeigt die blaue Brücke
    { type: 'island', pos: [-5.2, -5, -40], size: [1.6, 6, 1.6], under: 0, top: 'rock' },
    { type: 'laternenpfahl', id: 'pfahl1', pos: [-5.2, 1, -40], radius: 6, blink: [4, 2.5], yaw: 0, style: 'laterne' },
    { type: 'geisterplattform', id: 'geist2', light: 'pfahl', from: [0, 0.5, -36.5], to: [0, 0.5, -43.5], n: 3, size: [2.6, 0.5, 2.4], color: 'blau' },
    plat(-46, -52),
    { type: 'deco_hw', items: [
      { kind: 'grabsteine', pos: [-10, 1, -10], size: [5, 6], n: 3 },
      { kind: 'krummer_baum', pos: [10, 1, -10], height: 5.5 },
      { kind: 'spinnweben', pos: [9.6, 3.6, -10], size: 1.3, yaw: 0.6 },
      { kind: 'grabstein', pos: [9, 1, -30.5], style: 'kreuz' },
      { kind: 'grabstein', pos: [7, 1, -31.5], style: 'rund' },
    ] },

    // ---------------- S2 Besen
    sign(-10, 1, -47, 'Besen-Plattform'),
    { type: 'besen_plattform', id: 'besen', path: [[0, 0.65, -54.5], [0, 1.4, -61], [0, 0.65, -67.5]], start: 'stand', speed: 2.6, wait: 1.2 },
    plat(-70, -78),

    // ---------------- S3 Hexenkessel
    plat(-78, -100),
    sign(-11, 1, -79, 'Hexenkessel'),
    { type: 'hexenkessel', id: 'kessel', pos: [0, 1, -84], size: 2.2, height: 1.2, jump: 7.5 },
    { type: 'platform', pos: [0, 7.4, -90.5], size: [4, 0.6, 3.5], style: 'stone' },
    { type: 'hexenkessel', id: 'kessel2', pos: [7, 1, -93], size: 2, color: 'lila', potions: { every: 2.4, rise: 1.6, height: 7, size: 1.8, max: 3 } },
    { type: 'spinnennetz_trampolin', id: 'netz', pos: [-7, 1, -91], size: [3, 3], height: 1, jump: 5.5 },
    { type: 'deco_hw', items: [
      { kind: 'kerzen', pos: [-11, 1, -84], n: 5, size: 1.3 },
      { kind: 'kerzen', pos: [11, 1, -84], n: 4, size: 1.1 },
      { kind: 'spinnweben', pos: [-12.5, 3, -98], size: 1.6, yaw: 0.3 },
    ] },

    // ---------------- S4 Kürbis-Kanone
    plat(-100, -108),
    sign(-11, 1, -101, 'Kürbis-Kanone'),
    { type: 'kuerbis_kanone', id: 'kanone', pos: [0, 1, -104.5], to: [0, 1, -134] },
    plat(-130, -140),
    { type: 'deco_hw', items: [{ kind: 'maisfeld', pos: [-9, 1, -135], size: [6, 6], n: 8 }, { kind: 'kuerbisse', pos: [9, 1, -135], size: [6, 6], n: 6 }] },

    // ---------------- S5 Süßes-oder-Saures-Gasse
    plat(-140, -170),
    sign(-4, 1, -141, 'Süßes oder Saures'),
    { type: 'suessigkeiten_tuer', id: 'tuer1', pos: [-8, 1, -148], yaw: 0, content: 'muenzen', n: 5, color: 'lila', onAll: { coins: 5 } },
    { type: 'suessigkeiten_tuer', id: 'tuer2', pos: [8, 1, -154], yaw: Math.PI, content: 'suesses', n: 6, color: 'orange' },
    { type: 'suessigkeiten_tuer', id: 'tuer3', pos: [-8, 1, -162], yaw: 0, content: 'kuerbling', color: 'gruen', enemy: { path: [[-5.5, 1, -162], [-1, 1, -162]] } },
    { type: 'deco_hw', items: [
      { kind: 'zaun', from: [-12.5, 1, -142], to: [-12.5, 1, -168], style: 'holz' },
      { kind: 'kuerbislaterne', pos: [-5.6, 1, -146.4], size: 0.6 },
      { kind: 'kuerbislaterne', pos: [5.6, 1, -155.6], size: 0.6 },
      { kind: 'suessigkeiten', pos: [11, 1, -164], size: 1.2 },
      { kind: 'fledermaus_girlande', from: [-6, 4.5, -158], to: [6, 4.5, -158], n: 7 },
    ] },

    // ---------------- S6 Riesenkürbisse
    plat(-170, -200),
    sign(-4, 1, -171, 'Riesenkürbis'),
    { type: 'island', pos: [-14.5, 0, -186], size: [5, 4, 8], under: 0 },
    { type: 'ramp', pos: [-8, 1, -186], size: [8, 3, 8], axis: 'x', dir: -1 },
    { type: 'riesenkuerbis_roll', id: 'spender', pos: [-12.6, 4, -186], dir: [1, 0], every: 4, first: 1, max: 2, size: 1.8, speed: 2.5, start: 'near', near: 22 },

    // ---------------- S7 Grabstein-Schalter
    plat(-200, -210),
    sign(-11, 1, -201, 'Grabstein-Schalter'),
    { type: 'grabstein_schalter', id: 'schalter', pos: [-4, 1, -205], on: { reveal: 'grabweg' }, signal: 'grabstein' },
    { type: 'appear', id: 'grabweg', style: 'stone', parts: [{ pos: [0, 0.5, -212.5], size: [3, 0.5, 3] }, { pos: [0, 0.5, -216], size: [3, 0.5, 3] }, { pos: [0, 0.5, -219.5], size: [3, 0.5, 3] }] },
    { type: 'grabstein_schalter', id: 'zeitschalter', pos: [5, 1, -205], time: 5, on: { start: 'pfahl2' }, off: { stop: 'pfahl2' } },
    { type: 'laternenpfahl', id: 'pfahl2', pos: [9, 1, -208.5], on: false, radius: 4.5, style: 'laterne' },
    plat(-222, -232),

    // ---------------- S8 Glibberbach
    plat(-232, -238),
    sign(-6, 1, -233, 'Glibberbach'),
    { type: 'glibberbach', id: 'glibber', path: [[0, -0.5, -239], [0, -0.5, -252], [2.5, -0.6, -262], [0, -0.6, -276]], width: 6, bank: 3, bankH: 1.5, speed: 3, open: ['start', 'end'] },
    plat(-277, -290),

    // ---------------- S9 Nebel und Kulisse
    plat(-290, -312),
    sign(-11, 1, -291, 'Nebel und Kulisse'),
    { type: 'nebel', pos: [0, 1, -301], size: [24, 18], height: 1.4 },
    { type: 'deco_hw', items: [
      { kind: 'grabsteine', pos: [-8, 1, -300], size: [6, 10], n: 5 },
      { kind: 'krumme_baeume', pos: [9, 1, -302], size: [5, 14], n: 2 },
      { kind: 'zaun', from: [-12, 1, -293], to: [-12, 1, -310], style: 'eisen' },
      { kind: 'kerzen', pos: [3.5, 1, -296], n: 4 },
      { kind: 'suessigkeiten', pos: [-3.5, 1, -308], size: 1 },
      { kind: 'kuerbislaterne', pos: [4, 1, -308], mount: 'pfahl' },
      { kind: 'strohballen', pos: [-10, 1, -308.5], form: 'rund' },
      { kind: 'maisstaude', pos: [11, 1, -296] },
    ] },

    // ---------------- S10 Ziel
    plat(-312, -324),
  ],
  items: [
    { kind: 'laterne', pos: [0, 1, -11] },
    { kind: 'suessigkeiten', from: [-3, 1, -2], to: [3, 1, -2], n: 4 },
    { kind: 'suessigkeiten', pos: [0, 1, -296], r: 2.4, n: 6 },
    // Floß mit Pflaume am Glibberbach
    { kind: 'raft', id: 'floss', pos: [0, -0.5, -241.5], yaw: -Math.PI / 2, exit: [0, -0.6, -276], exitR: 0.9 },
  ],
  checkpoint: [[0, 1, -116], [0, 1, -235]],
  stars: [
    [0, 8.6, -90.5],
    [9, 2.4, -208],
    [0, 2.4, -216],
  ],
  goal: [0, 1, -318],
  marks: {
    start: [0, 1, 0], laterne: [0, 1, -9], geist1: [0, 1, -12.5], geist1a: [0, 1.05, -16.5], geistMitte: [0, 1.05, -19.833],
    pfahl: [0, 1, -32], geist2: [0, 1.05, -36.5], geist2b: [0, 1.05, -40], besen0: [0, 1, -50], besen: [0, 1.1, -54.5], besenEnde: [0, 1, -71],
    kessel: [0, 1, -81], kesselTop: [0, 2.3, -84], kessel2: [7, 1, -89], netz: [-7, 2.1, -91], kanone: [0, 1, -102],
    kanoneZiel: [0, 1, -134], tueren: [0, 1, -144], tuer1: [-6.6, 1, -148], tuer2: [6.6, 1, -154], tuer3: [-6.6, 1, -162],
    kuerbis: [0, 1, -178], kuerbisBahn: [-2, 1, -186], schalter: [-4, 1.4, -205], schalterBlick: [-1, 1, -202.5], grabweg: [0, 1, -216], zeitschalter: [5, 1.4, -205],
    glibber: [0, 1, -236], glibberMitte: [0, 1, -250], glibberEnde: [0, 1, -280], nebel: [0, 1, -298], goal: [0, 1, -314],
  },
};
