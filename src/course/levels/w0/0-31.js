// Rummelwerkstatt (0-31): jedes neue Welt-8-Gimmick in einer Station mit Schild, Kameraschiene und benannten Punkten (marks)
// für tests/course_w8_blocks.mjs. Thema baronpark; mit ?theme=<name> lässt sich jedes Welt-8-Thema ansehen (rainfort, dunes,
// cookie, nightfort, dungeon, darkghost, inferno, baronpark). Level verläuft nach −Z; Plateaus mit Oberseite y = 0 (außer der
// Würfel-Grube). Der Abspann hat keine Station (er startet über ?credits=1 bzw. die Aktion { credits: true }).
//   S0  Start: Rummel-Kulisse (Torbogen, Buden, Wimpel, Glühbirnen, Ballons, Karussell)         z    6 …   −8
//   S1  Leuchtstege über dem Abgrund, Stampfstein, isolierte Treppe                             z   −8 …  −42
//   S2  Kristall-Felsklotz über Lava (versinkt am Ende)                                          z  −42 …  −62
//   S3  Würfel-Felsklotz mit zwei 3-m-Abstürzen, Treppe zurück                                   z  −62 … −112
//   S4  Steigbecken                                                                             z −112 … −134
//   S5  schwebende Wasserkörper über dem Abgrund                                                z −134 … −150
//   S6  Stachelblöcke blau/rot, Stachelwand                                                     z −150 … −186
//   S7  Keksräder (waagerecht/senkrecht), Keks-Zahnräder                                        z −186 … −208
//   S8  Schubfeld                                                                               z −208 … −236
//   S9  Riesenrad mit Schubser                                                                  z −236 … −270
//   S10 Lavabrocken-Regen                                                                       z −270 … −300
//   S11 großer Spiegel mit Spiegel-Stern und Spiegel-Stufen                                     z −300 … −326
//   S12 Fallblock-Brücke                                                                        z −326 … −344
//   S13 Super-POW-Block                                                                         z −344 … −376
//   S14 Ziel                                                                                    z −376 … −392

const plat = (z0, z1, top = 0, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

export const LEVEL = {
  id: '0-31',
  world: 0,
  title: 'Rummelwerkstatt',
  archetype: 'parcours',
  theme: 'baronpark',
  music: 'course_finale',
  timeLimit: 999,
  start: { pos: [0, 0, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -8, pitch: 38, dist: 15 },
    { from: -8, to: -42, pitch: 46, dist: 15 },
    { from: -42, to: -62, pitch: 44, dist: 15 },
    { from: -62, to: -112, pitch: 42, dist: 16 },
    { from: -112, to: -134, pitch: 48, dist: 16 },
    { from: -134, to: -150, pitch: 40, dist: 15 },
    { from: -150, to: -186, pitch: 48, dist: 16 },
    { from: -186, to: -208, pitch: 46, dist: 15 },
    { from: -208, to: -236, pitch: 44, dist: 15 },
    { from: -236, to: -270, pitch: 16, dist: 27 },
    { from: -270, to: -300, pitch: 46, dist: 16 },
    { from: -300, to: -326, pitch: 16, dist: 11 },
    { from: -326, to: -344, pitch: 44, dist: 15 },
    { from: -344, to: -376, pitch: 34, dist: 15 },
    { from: -376, to: -394, pitch: 42, dist: 15 },
  ],
  segments: [
    // ---------------- S0 Start: Rummel
    plat(6, -8),
    sign(-7, 0, 1, 'Rummelwerkstatt'),
    { type: 'deco_w8', items: [
      { kind: 'torbogen', pos: [0, 0, -6.5], width: 7, height: 5, yaw: Math.PI / 2 },
      { kind: 'bude', pos: [-9, 0, -2], width: 3, color: 'rot', yaw: 0, solid: true }, { kind: 'bude', pos: [9, 0, -2], width: 3, color: 'gelb', yaw: Math.PI, solid: true },
      { kind: 'wimpel', from: [-11, 4, -6], to: [11, 4, -6], sag: 1 }, { kind: 'gluehbirnen', from: [-11, 4.5, 2], to: [11, 4.5, 2], sag: 1.1 },
      { kind: 'mast', pos: [-11, 0, -6], height: 4.2 }, { kind: 'mast', pos: [11, 0, -6], height: 4.2 }, { kind: 'mast', pos: [-11, 0, 2], height: 4.6 }, { kind: 'mast', pos: [11, 0, 2], height: 4.6 },
      { kind: 'ballons', pos: [5, 0, 1.5], n: 5 }, { kind: 'karussell', pos: [-16, -4, -2], radius: 3, height: 3.6, solid: false },
    ] },

    // ---------------- S1 Leuchtstege
    plat(-8, -12),
    sign(-11, 0, -9, 'Leuchtstege'),
    { type: 'leuchtsteg', id: 'steg1', pos: [0, -0.4, -18], size: [2.4, 0.4, 12] },
    { type: 'leuchtsteg', id: 'steg2', pos: [0, -0.4, -28], size: [10, 0.4, 8], color: 'tuerkis' },
    { type: 'leuchtsteg', id: 'treppe', from: [-7, 0.3, -26], to: [-10, 2.1, -32], n: 4, size: [1.6, 0.3, 1.4], color: 'rosa' },
    plat(-32, -42),
    { type: 'deco_w8', items: [{ kind: 'gluehbirnen', from: [-12, 3, -33], to: [12, 3, -33], sag: 0.6 }, { kind: 'mast', pos: [-12, 0, -33], height: 3.2 }, { kind: 'mast', pos: [12, 0, -33], height: 3.2 }] },

    // ---------------- S2 Kristall-Felsklotz
    sign(-11, 0, -39, 'Kristall-Felsklotz'),
    { type: 'lavaspiegel', mode: 'fest', pos: [0, -2, -52], size: [26, 1.5, 20] },
    { type: 'kristall_felsklotz', id: 'klotz1', pos: [0, -1.35, -44.2], path: [[0, -1.35, -50], [5, -1.35, -55], [5, -1.35, -59]], end: 'sinken', sinkDelay: 3, respawn: 3 },
    plat(-62, -68),

    // ---------------- S3 Würfel-Felsklotz mit Abstürzen
    sign(-11, 0, -64, 'Würfel-Felsklotz'),
    { type: 'lavaspiegel', mode: 'fest', pos: [0, -4, -73], size: [26, 1.65, 8] },
    { type: 'lavaspiegel', mode: 'fest', pos: [0, -7, -80.5], size: [26, 1.65, 7] },
    { type: 'lavaspiegel', mode: 'fest', pos: [0, -10, -89], size: [26, 1.65, 10] },
    { type: 'island', pos: [0, -12, -77.15], size: [26, 9.6, 0.6], under: 0, top: 'rock' },
    { type: 'island', pos: [0, -12, -84.15], size: [26, 6.6, 0.6], under: 0, top: 'rock' },
    { type: 'kristall_felsklotz', id: 'wuerfel', variant: 'wuerfel', pos: [0, -2.55, -70.6], color: 'blau',
      path: [[0, -2.55, -75.6], [0, -5.55, -75.8], [0, -5.55, -82.6], [0, -8.55, -82.8], [0, -8.55, -91]], speed: 2.6 },
    plat(-94, -100, -8),
    { type: 'stairs', pos: [0, -8, -100], dir: '-z', steps: 8, rise: 1, run: 1, width: 5, style: 'stone' },
    plat(-108, -114),

    // ---------------- S4 Steigbecken
    sign(-11, 0, -110, 'Steigbecken'),
    { type: 'island', pos: [0, -6, -122], size: [14, 2, 16], under: 0, top: 'stone' },
    { type: 'island', pos: [-10, -4, -122], size: [6, 4, 16], under: 0 },
    { type: 'island', pos: [10, -4, -122], size: [6, 4, 16], under: 0 },
    { type: 'steigbecken', id: 'becken', pos: [0, -4, -122], size: [14, 4.6, 16], low: 0.3, wait: 2.5, warn: 0.8, rise: 1.8, hold: 2.5, fall: 1.8 },
    plat(-130, -134),

    // ---------------- S5 schwebende Wasserkörper
    sign(-11, 0, -131, 'Wasserkörper'),
    { type: 'wasserkoerper', id: 'wuerfel1', pos: [0, 0.3, -138.5], size: [4, 4, 4] },
    { type: 'wasserkoerper', id: 'wuerfel2', parts: [{ pos: [-3, 1.5, -144.5], size: [3.5, 3.5, 4] }, { pos: [3, 1.5, -144.5], size: [3.5, 3.5, 4] }] },
    plat(-148, -186),

    // ---------------- S6 Stachelblöcke
    sign(-11, 0, -150, 'Stachelblöcke'),
    { type: 'stachelblock', id: 'blau1', pos: [-4, 0, -158], color: 'blau', move: [8, 0, 0], wait: 1.2, warn: 0.5 },
    { type: 'stachelblock', id: 'rot1', pos: [-5, 0, -166], color: 'rot', path: [[5, 0, -166], [5, 0, -171], [-5, 0, -171]], speed: 2.4 },
    { type: 'stachelwand', id: 'wand1', pos: [0, 0, -183], size: [14, 3, 1], move: [0, 0, 5], spikes: ['+z'], speed: 2, wait: 1.5 },
    { type: 'deco_w8', items: [{ kind: 'gitterfenster', pos: [-12.9, 0.5, -170], yaw: 0 }, { kind: 'saeule', pos: [11, 0, -160], height: 4 }, { kind: 'muscheln', pos: [9, 0, -175], n: 6 }] },

    // ---------------- S7 Keksräder
    sign(-11, 0, -187, 'Keksräder'),
    { type: 'keksrad', id: 'keks1', pos: [0, -0.6, -191.5], radius: 3, speed: 0.6 },
    { type: 'keksrad', id: 'keks2', axis: 'x', pos: [0, -2.2, -199], radius: 2.4, thick: 3, speed: 0.5 },
    { type: 'keks_zahnrad', id: 'zahn1', pos: [-7, -0.6, -195], radius: 2.2, teeth: 8, speed: -0.5 },
    { type: 'keks_zahnrad', id: 'zahn2', axis: 'x', pos: [7, -1, -197], radius: 2.6, teeth: 8, speed: 0.4 },
    plat(-204, -236),
    { type: 'deco_w8', items: [{ kind: 'keksstapel', pos: [-11, 0, -206], n: 4 }, { kind: 'ruehrschuessel', pos: [10, 0, -207] }, { kind: 'spritzbeutel', pos: [-9, 0, -214], height: 2.6 }, { kind: 'kruemel', pos: [6, 0, -212], n: 8 }] },

    // ---------------- S8 Schubfeld
    sign(-11, 0, -209, 'Schubfeld'),
    { type: 'schubfeld', id: 'schub1', pos: [0, 0, -218], size: [3, 4], dir: [0, -1], speed: 15 },
    { type: 'deco_w8', items: [{ kind: 'backofen', pos: [11, 0, -224], yaw: Math.PI, solid: true }] },

    // ---------------- S9 Riesenrad
    sign(-11, 0, -237, 'Riesenrad'),
    { type: 'riesenrad', id: 'rad', pos: [0, 9, -252], radius: 8, gondolas: 6, speed: 0.15, angle: -Math.PI / 2, ground: -6 },
    plat(-262, -300),

    // ---------------- S10 Lavabrocken-Regen
    sign(-11, 0, -271, 'Lavabrocken-Regen'),
    { type: 'lavabrocken_regen', id: 'regen', area: [-8, -292, 8, -278], period: 1.4, warn: 1.1, flight: 1.8, puddle: 1.2, start: { box: [-13, -1, -296, 13, 6, -274] }, seed: 3 },
    { type: 'deco_w8', items: [{ kind: 'bude', pos: [-11, 0, -290], color: 'lila', yaw: 0 }, { kind: 'achterbahn', from: [13, 4, -272], to: [13, 4, -298], hump: 3, ground: 0 }] },

    // ---------------- S11 großer Spiegel
    plat(-300, -326),
    sign(-11, 0, -302, 'Großer Spiegel'),
    { type: 'grosser_spiegel', id: 'spiegel', pos: [0, 0, -320], size: [8, 5], star: 'spiegelstern', parts: [{ pos: [4.5, 1.1, -312], size: [1.6, 0.3, 1.6] }, { pos: [6.3, 2.3, -314.6], size: [1.6, 0.3, 1.6] }] },
    { type: 'deco_w8', items: [{ kind: 'kerzenleuchter', pos: [-5, 0, -319] }, { kind: 'kerzenleuchter', pos: [5, 0, -319] }, { kind: 'standuhr', pos: [-9, 0, -318], solid: true }, { kind: 'bilderrahmen', pos: [-12.8, 1.2, -312], yaw: 0 }, { kind: 'spinnennetz', pos: [12.8, 4, -324], yaw: Math.PI }] },

    // ---------------- S12 Fallblock-Brücke
    sign(-11, 0, -324, 'Fallblock-Brücke'),
    { type: 'fallblock_bruecke', id: 'fallbr', from: [0, -0.6, -327.5], to: [0, -0.6, -342.5], size: [1.8, 0.6, 1.8], respawn: 4 },
    plat(-344, -394),

    // ---------------- S13 Super-POW-Block
    sign(-11, 0, -346, 'Super-POW-Block'),
    { type: 'super_pow_block', id: 'superpow', pos: [0, 2.3, -362], size: 3, hits: 4, onDone: { coins: 5 } },
    { type: 'deco_w8', items: [{ kind: 'lampions', from: [-10, 4.5, -354], to: [10, 4.5, -354], sag: 0.9 }, { kind: 'mast', pos: [-10, 0, -354], height: 4.6 }, { kind: 'mast', pos: [10, 0, -354], height: 4.6 }] },

    // Rand: Kulisse (nur Optik)
    { type: 'deco_w8', shadow: false, items: [
      { kind: 'achterbahn', from: [-20, 6, -60], to: [-20, 6, -120], hump: 4, ground: -8 },
      { kind: 'bude', pos: [-18, 0, -200], color: 'gruen', yaw: 0 }, { kind: 'ballons', pos: [18, 0, -330], n: 6 },
    ] },
  ],
  enemies: [
    { kind: 'stampfstein', id: 'stampf', pos: [3, 3.4, -28], size: [1.8, 2, 1.8], trigger: 1.0, wait: 1.2 },
    { kind: 'schubser', id: 'schub_rad', pos: [6.93, 12.05, -252], behavior: 'guard', sight: 2.5 },
  ],
  items: [
    { kind: 'coins', from: [-3, 0.5, -218], to: [-3, 0.5, -232], n: 5 },
  ],
  checkpoint: [0, 0, -152],
  stars: [
    [-10, 3.2, -32],
    [0, 7.6, -266],
    { pos: [6.3, 3.0, -314.6], id: 'spiegelstern' },
  ],
  goal: [0, 0, -388],
  marks: {
    start: [0, 0, -2],
    steg: [0, 0, -10], stegMitte: [0, 0.01, -18], stegFern: [0, 0.01, -23], stampf: [3, 0.01, -27], treppe: [-7, 0.6, -26],
    klotz: [0, 0, -40], klotzOben: [0, 0.1, -44.2],
    wuerfelStart: [0, 0, -66], wuerfelOben: [0, 0.1, -70.6], grube: [0, -8, -96],
    becken: [0, 0, -112], beckenGrund: [0, -3.95, -122], beckenRand: [-8, 0, -122],
    wuerfel: [0, 0, -132], wuerfelInnen: [0, 1.6, -138.5],
    stachel: [0, 0, -152], blauVorn: [-4, 0, -156.4], blauSeite: [-4, 0, -160.5],
    keks: [0, 0, -186], keks1Oben: [1.5, 0.05, -191.5], keks2Oben: [0, 0.3, -199],
    schub: [0, 0, -213], schubFeld: [0, 0, -216.5],
    rad: [0, 0, -240],
    regen: [0, 0, -272], regenMitte: [0, 0, -285],
    spiegel: [0, 0, -312.5], spiegelStufe: [4.5, 1.45, -312],
    fallbr: [0, 0, -325],
    pow: [0, 0, -358], powUnter: [0, 0, -362],
    goal: [0, 0, -384],
  },
};
