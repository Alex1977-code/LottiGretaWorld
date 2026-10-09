// 1-Schatz „Pflaume und der Wolkenwürfel“ (Archetyp diorama, Thema diorama, Musik course_diorama) – Rätsel-Diorama nach
// dem Bauplan (1-Kapitän): Pflaume als Schatzsucherin (springt nicht, 3,5 m/s) in einem schwebenden Graswürfel,
// ca. 30 × 30 m, ca. 12 m hoch (Unterkante y −4, Hügelkuppe y 8,4). Kamera frei drehbar. 5 Sterne, 9 Krabbelkäfer.
//   Stern 1  Fuß-Plattform (y 0): liegt im Gras unter der gelben, fahrenden Plattform (vorne rechts).
//   Stern 2  Hügelweg (Rampe rechts) hinauf (y 3), mit der gelben Plattform die 3-m-Lücke zur Mitte überqueren.
//   Stern 3  Hinter Stern 2: mit der zweiten Plattform über die Schlucht durch das linke Loch in den Innenhof.
//   Stern 4  Durch das rechte Loch (Treppe im Berg) auf den obersten Hügel – Krabbelkäfer kreisen um die Kuppe.
//   Stern 5  An den Krabbelkäfern vorbei auf den schmalen Sims an der Rückseite (1 m breit, ringsum Abgrund).
// Der 5. Stern (alle fünf gefunden) beendet das Level. Schatzstellen (rotes Kreuz): stehen bleiben → Pflaume buddelt.
// Koordinaten: Würfel x −15 … 15, z −15 … 15 (vorn = +z, zur Kamera), Ebenen y 0 / 3 / 7.

export const LEVEL = {
  id: '1-Schatz',
  world: 1,
  title: 'Pflaume und der Wolkenwürfel',
  archetype: 'diorama',
  theme: 'diorama',
  music: 'course_diorama',
  timeLimit: 400,
  killY: -14,
  start: { pos: [-9, 0, 11], yaw: Math.PI / 2 },
  diorama: {
    center: [0, 2.5, 0],
    camera: { yaw: 28, pitch: 46, dist: [36, 15], follow: [0.3, 0.9], fov: 40 },
    props: [
      // Häuschen, Pilze, Wimpel
      { kind: 'house', pos: [-11.2, 0, 3.4], yaw: 0.35, size: [3.2, 2.4, 3], roof: 0xe8483a },
      { kind: 'house', pos: [-3.2, 7, -8.4], yaw: 0.25, size: [2.6, 2, 2.4], roof: 0x3a8bff, wall: 0xfff8e8 },
      { kind: 'mushroom', pos: [-13.4, 0, 9], size: 0.7 }, { kind: 'mushroom', pos: [-12.6, 0, 9.8], size: 0.45, color: 0xffb02a },
      { kind: 'mushroom', pos: [3.5, 0, 13.6], size: 0.55 }, { kind: 'mushroom', pos: [-1.2, 3, -5.4], size: 0.5, color: 0xa865ff },
      { kind: 'mushroom', pos: [-8.8, 3, -12.8], size: 0.6 }, { kind: 'mushroom', pos: [7, 7.88, -9.6], size: 0.4, color: 0xffb02a },
      { kind: 'banner', pos: [14.2, 3, -5.4], color: 0xff7ac0 }, { kind: 'banner', pos: [-14.3, 7, -14.3], color: 0xffd23a, yaw: 0.6 },
      { kind: 'banner', pos: [14.3, 0, 14.3], color: 0x3a8bff },
      // Schatzstellen
      { kind: 'dig', pos: [-4.5, 0, 7.5] }, { kind: 'dig', pos: [13.2, 3, -4.6] }, { kind: 'dig', pos: [-8.2, 3, -12.6] }, { kind: 'dig', pos: [-0.6, 7, -11.4] },
      // Wolkenmeer unter dem Würfel, schwebende Inselchen in der Ferne
      { kind: 'cloudsea', pos: [0, -13, 0], r: 46, n: 52 },
      { kind: 'islet', pos: [-31, 2, -18], size: 3.4 }, { kind: 'islet', pos: [28, -2, 16], size: 2.6 }, { kind: 'islet', pos: [24, 6, -30], size: 3 },
      { kind: 'islet', pos: [-26, -4, 24], size: 2.2 },
    ],
  },
  segments: [
    // ---------------- Würfelkörper und Fuß-Plattform F (y 0)
    { type: 'island', pos: [0, -4, 7], size: [30, 4, 16], under: 0 },
    { type: 'island', pos: [5.5, -4, -3.5], size: [19, 4, 5], under: 0 },
    // Hecke an der Vorderkante und links (Startbereich ohne Absturz)
    { type: 'wall', pos: [-1.5, 0, 14.6], size: [27, 0.9, 0.8], style: 'grass' },
    { type: 'wall', pos: [-14.6, 0, 6.9], size: [0.8, 0.9, 14.6], style: 'grass' },
    { type: 'wall', pos: [-9.5, 0, -0.6], size: [11, 0.9, 0.8], style: 'grass' },
    // ---------------- Hügelweg (Rampe rechts) und Mitte M / rechter Absatz R (y 3)
    { type: 'ramp', pos: [12.5, 0, 8], size: [5, 3, 12], axis: 'z', dir: -1 },
    { type: 'island', pos: [1.5, 0, -3.5], size: [11, 3, 5], under: 0 },
    { type: 'island', pos: [12.5, 0, -2], size: [5, 3, 8], under: 0 },
    // gelbe fahrende Plattform 1: Lücke zwischen R und M ↔ über der Fuß-Plattform (Stern 1 darunter)
    { type: 'mover', id: 'gelb1', path: [[8.5, 2.6, -3.5], [8.5, 2.6, 6.2]], size: [2.7, 0.4, 2.6], speed: 1.6, wait: 2.4, color: 'yellow' },
    // ---------------- Berg (y 7) mit rechtem Loch (Treppe) und linkem Loch (Durchfahrt zum Innenhof)
    { type: 'island', pos: [-2.75, -4, -10.5], size: [8.5, 11, 9], under: 0 },
    { type: 'island', pos: [9.75, -4, -10.5], size: [10.5, 11, 9], under: 0 },
    { type: 'island', pos: [3, -4, -13.3], size: [3, 11, 3.4], under: 0 },
    { type: 'island', pos: [3, -4, -8.8], size: [3, 7, 5.6], under: 0 },
    { type: 'stairs', pos: [3, 3, -6], dir: '-z', steps: 16, rise: 0.25, run: 0.35, width: 3, style: 'grass' },
    { type: 'island', pos: [3, 6, -6.75], size: [3, 1, 1.5], under: 0 },
    // Innenhof links (y 3) mit Rückwand = Sims (y 7), linker Wand, Schlitz für Plattform 2
    { type: 'island', pos: [-11, -4, -14.5], size: [8, 11, 1], under: 0 },
    { type: 'island', pos: [-14.5, -4, -10], size: [1, 11, 8], under: 0 },
    { type: 'island', pos: [-10.5, -4, -12.45], size: [7, 7, 3.1], under: 0 },
    { type: 'island', pos: [-13.25, -4, -9.7], size: [1.5, 7, 2.4], under: 0 },
    { type: 'island', pos: [-8.25, -4, -9.7], size: [2.5, 7, 2.4], under: 0 },
    { type: 'island', pos: [-13.25, -4, -7.25], size: [1.5, 11, 2.5], under: 0 },
    { type: 'island', pos: [-8.25, -4, -7.25], size: [2.5, 11, 2.5], under: 0 },
    { type: 'island', pos: [-11, 6, -7.25], size: [3, 1, 2.5], under: 0 },
    // gelbe fahrende Plattform 2: Mitte → über die Schlucht → durch das linke Loch in den Innenhof
    { type: 'mover', id: 'gelb2', path: [[-5.35, 2.6, -3.5], [-11, 2.6, -3.5], [-11, 2.6, -9.7]], size: [2.4, 0.4, 2.4], speed: 1.6, wait: 2.4, color: 'yellow' },
    // oberster Hügel (Kuppe) mit Stern 4
    { type: 'mound', pos: [9, 7, -10.5], radius: 3.4, height: 1.4 },
    // ---------------- Zier
    { type: 'deco', items: [
      { kind: 'tree', pos: [-13, 0, 13], size: 3.4, color: 'green' }, { kind: 'tree', pos: [6.5, 0, 12.5], size: 3, color: 'green' },
      { kind: 'tree', pos: [-6.3, 7, -6.7], size: 2.8, color: 'autumn' }, { kind: 'tree', pos: [14, 7, -8], size: 2.6, color: 'green' },
      { kind: 'bush', pos: [-6.5, 0, 13.8], size: 0.6 }, { kind: 'bush', pos: [0.5, 0, 0.6], size: 0.5 }, { kind: 'bush', pos: [6.3, 3, -1.6], size: 0.45 },
      { kind: 'flowers', pos: [-1, 0, 10.5], size: [4, 2], n: 12 }, { kind: 'flowers', pos: [4.5, 0, 3.5], size: [3, 2], n: 8 },
      { kind: 'flowers', pos: [12.5, 3, 0.2], size: [3, 2], n: 6 }, { kind: 'flowers', pos: [-12.5, 3, -11.6], size: [2, 1.5], n: 6 },
      { kind: 'flowers', pos: [-5.2, 7, -11.4], size: [2.4, 2], n: 8 },
      { kind: 'lantern', pos: [9.6, 0, 13.6] }, { kind: 'lantern', pos: [-3.6, 3, -1.4] }, { kind: 'lantern', pos: [5, 7, -6.6] },
      { kind: 'lantern', pos: [-7.4, 7, -14.4] }, { kind: 'lantern', pos: [-7.6, 3, -11.4] },
      { kind: 'rock', pos: [-14, 3, -13.4], size: 0.4 }, { kind: 'rock', pos: [1, 7, -14.2], size: 0.5 },
      { kind: 'fence', from: [-14.2, 0, 14.1], to: [-10.2, 0, 14.1] },
    ] },
    { type: 'sign', pos: [-7, 0, 12.6], text: 'Schatzsuche!', yaw: 0.25 },
  ],
  items: [
    { kind: 'coins', from: [-6, 0.2, 11], to: [6, 0.2, 11], n: 5 },
    { kind: 'coins', from: [12.5, 1.2, 11], to: [12.5, 2.6, 4], n: 4 },
    { kind: 'coins', pos: [-11, 3.2, -12.4], r: 1.2, n: 5 },
    { kind: 'coins', from: [-5, 7.2, -14.5], to: [-12, 7.2, -14.5], n: 4 },
    { kind: 'chest', pos: [-13.3, 0, 7.6], content: 'coins:5', yaw: 1.2 },
    { kind: 'chest', pos: [13.6, 3, 1.2], content: 'coins:5', yaw: -1.6 },
    { kind: 'spotter', pos: [14, 7, -6.6], yaw: 2.4 },
  ],
  enemies: [
    // Innenhof (1)
    { kind: 'krabbelkaefer', path: [[-13.2, 3.5, -12.6], [-8, 3.5, -12.6]], speed: 1.6, color: 'red' },
    // Mitte vor dem rechten Loch (2)
    { kind: 'krabbelkaefer', path: [[-3.2, 3.5, -5.2], [6.4, 3.5, -5.2]], speed: 1.8, count: 2, spacing: 1.5, color: 'blue' },
    // um die Kuppe (4)
    { kind: 'krabbelkaefer', path: [[13.2, 7.5, -10.5], [12, 7.5, -7.5], [9, 7.5, -6.3], [6, 7.5, -7.5], [4.8, 7.5, -10.5], [6, 7.5, -13.5], [9, 7.5, -14.7], [12, 7.5, -13.5]], speed: 2, count: 4, spacing: 6.5, color: 'yellow' },
    // vor dem Sims (2)
    { kind: 'krabbelkaefer', path: [[-6.4, 7.5, -13.4], [0.4, 7.5, -13.4]], speed: 1.7, count: 2, spacing: 1.5, color: 'pink' },
  ],
  stars: [
    [8.5, 0, 6.2],          // 1: im Gras unter der gelben Plattform (vordere Halteposition)
    [4.6, 3, -4.1],          // 2: Mitte, gleich hinter der Lücke
    [-11, 3, -12.8],         // 3: Innenhof hinter dem linken Loch
    [9, 8.4, -10.5],         // 4: auf der Kuppe des obersten Hügels
    [-14.5, 7, -14.5],       // 5: am Ende des schmalen Simses
  ],
  marks: {
    start: [-9, 0, 11], star1: [8.5, 0, 6.2], rampTop: [12.5, 3, 0.5], gapR: [10.6, 3, -3.5], p1: [8.5, 3.05, -3.5],
    midP2: [-3.4, 3, -3.5], p2: [-5.35, 3.05, -3.5], court: [-11, 3, -11.6], stairsFoot: [3, 3, -5.4], top: [3, 7, -12.4],
    sims: [-6.6, 7, -14.5], star5: [-14.5, 7, -14.5], void: [-9.5, 0.5, -3.5],
  },
};
