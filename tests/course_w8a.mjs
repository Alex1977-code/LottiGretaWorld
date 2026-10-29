// Welt 8, Level 8-1 „Stachelstege der Regenfestung“ (Stachelfallen im Takt, Feuer-Werfer, Knochenflieger-Gruppen, Kletter-
// Säule, Rätselbox, Fallblöcke, Stachel-Schwebeplattformen, Warp-Boxen), 8-2 „Pflaumes Dünenrutsche“ (Ritt auf Pflaume durch
// die Dünen: Schubfelder, Sandflosser, Sandskulpturen, Baron-Sandstatuen, unsichtbare Wolken) und 8-3 „Keksräder in der
// Zuckerfabrik“ (drehende Kekse und Keks-Zahnräder, Riesenschnappblumen, Zahnradwand, Hörner-Ameisen-Straße, Kuchenplattform):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle
// Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120
// inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w8a_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w8a.mjs [8-1|8-2|8-3]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern) · TRACE=1 (Spur der Figur)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Gegenproben
// laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump,
// stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } · { chaseKind, ids } ·
// { expect: Bedingung } · { until: Bedingung } (Name aus COND oder Ausdruck '=…') · { warp: [x, z] } (auf eine Warp-Box
// springen) · { stompAll: Id-Anfang } · { pound: [x, z] } (Stampfattacke) · { climb: [x, z], top } (mit dem Krallen-Anzug an
// einer Wand hinauf) · { trap: Id } (warten, bis die Stachelfalle eingefahren bleibt, dann darüber)
const Y = 1;
const BX = 90;
const T3 = 16, RX3 = 70;
const ROUTES = {
  '8-3': {
    start: [0, Y, 6],
    meta: { stars: 3, time: 400, theme: 'cookie', music: 'course_cookie', archetype: 'parcours' },
    enemies: { riesenschnappblume: 2, ameisen_reihe: 4, bunny: 1 },
    main: [
      { name: 'Startplatz', to: [0, -4.4], within: 0.5 },
      { name: 'Drehkeks 1', to: [0, -10.4], jump: 20, jumpAt: 9, within: 0.8 },
      { to: [0, -12.6], within: 0.4, run: false },
      { name: 'Drehkeks 2', to: [0, -18.6], jump: 24, jumpAt: 9, within: 0.8 },
      { to: [0, -20.8], within: 0.4, run: false },
      { name: 'Platz 1', to: [-1.5, -26], jump: 24, jumpAt: 9, within: 0.8 },
      { name: 'an Riesenschnappblume 1 vorbei', to: [-2.5, -33.4], within: 0.5 },
      { name: 'Keks-Zahnrad A', to: [0, -39.4], jump: 24, jumpAt: 9, within: 0.8 },
      { to: [0, -41.4], within: 0.4, run: false },
      { name: 'Keks-Zahnrad B', to: [0, -44.7], jump: 16, jumpAt: 9, within: 0.8 },
      { to: [0, -46.8], within: 0.4, run: false },
      { name: 'Platz 2', to: [2.5, -52], jump: 24, jumpAt: 9, within: 0.8 },
      { name: 'an Riesenschnappblume 2 vorbei', to: [2.5, -61.4], within: 0.5 },
      { name: 'Laufkeks 1', to: [2.5, -66], jump: 20, jumpAt: 9, within: 0.8 },
      { to: [2.5, -67.4], within: 0.4 },
      { name: 'Laufkeks 2', to: [2.5, -73.6], jump: 24, jumpAt: 9, within: 0.8 },
      { to: [2.5, -75], within: 0.4 },
      { name: 'Platz 3', to: [2.5, -80], jump: 24, jumpAt: 9, within: 0.6 },
      { to: [-0.2, -90.4], within: 0.4 },
      { name: 'Zahnradwand 1 (Paternoster)', gear: 'wand1', board: [-0.2, -90.4], off: Y + 5.6, to: [-1.8, -91], max: 2.2, reach: 1.8, hold: 6 },
      { to: [-2.9, -90.6], within: 0.3, run: false },
      { name: 'Zahnrad-Stufe 1', cog: 'stufe1', to: [-6, -90.2] },
      { name: 'Zahnrad-Stufe 2', cog: 'stufe2', to: [-1.5, -90.2] },
      { name: 'Zahnrad-Stufe 3', cog: 'stufe3', to: [3, -90.2] },
      { name: 'Zahnrad-Stufe 4', cog: 'stufe4', to: [7.5, -90.2] },
      { name: 'auf die Wand', cog: null, to: [7.5, -94.5], top: 16 },
      { expect: '=P().pos.y > 15.5' },
      { name: 'Kontrollpunkt oben', to: [0, -104], within: 0.6 },
      { to: [0, -115.4], within: 0.4 },
      { name: 'Ameisen-Reihe 1', ants: 'reihe1', at: [0, -115.6], to: [0, -120.6] },
      { name: 'Ameisen-Reihe 2 (zwei Spuren)', ants: 'reihe2', at: [0, -133.4], to: [0, -138.8] },
      { name: 'Ameisen-Reihe 3', ants: 'reihe3', at: [0, -151.6], to: [0, -156.6] },
      { name: 'Ameisen-Reihe 4 (zwei Spuren)', ants: 'reihe4', at: [0, -169.4], to: [0, -174.8] },
      { to: [0, -186], within: 0.5 },
      { name: 'Kanonen-Glasröhre zur Zielplattform', pipe: [0, -188.6] },
      { expect: '=at(-8, 8, Y + 7.5, -222, -238)' },
      { name: 'Zielmast', to: [0, -231.4], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 0: hinter Riesenschnappblume 2 über zwei Kekse, Weitsprung durch den Stern', star: 0, from: [2, Y, -53],
        legs: [{ to: [-5.2, -61.2], within: 0.4 }, { to: [-9.6, -64.4], jump: 20, jumpAt: 9, within: 0.6 }, { to: [-10.7, -65], within: 0.25, run: false },
          { to: [-13.4, -66.4], jump: 16, jumpAt: 9, within: 0.6 }, { to: [-12.5, -66.1], within: 0.2, run: false }, { long: [-21, -69.1], runup: 15 }], shot: 'stern0', mech: (r) => !r.dead, mechText: (r) => (r.dead ? 'abgestürzt' : 'auf dem Landekeks') },
      { name: 'Stern 0 mit der Wurfsichel vom zweiten Keks aus', star: 0, from: [2, Y, -53], place: { power: 'sichel' },
        legs: [{ to: [-5.2, -61.2], within: 0.4 }, { to: [-9.6, -64.4], jump: 20, jumpAt: 9, within: 0.6 }, { to: [-10.7, -65], within: 0.25, run: false },
          { to: [-13.4, -66.4], jump: 16, jumpAt: 9, within: 0.6 }, { throwAt: [-17.9, -68] }] },
      { name: 'Stern 0 nicht mit einem normalen Sprung (vom Keks aus zu kurz)', star: 0, expectNot: true, from: [2, Y, -53], heroes: ['lotti'],
        legs: [{ to: [-5.2, -61.2], within: 0.4 }, { to: [-9.6, -64.4], jump: 20, jumpAt: 9, within: 0.6 }, { to: [-10.7, -65], within: 0.25, run: false },
          { to: [-13.4, -66.4], jump: 16, jumpAt: 9, within: 0.6 }, { to: [-12.6, -66.1], within: 0.25, run: false }, { to: [-21, -69.1], jump: 40, jumpAt: 12, within: 0.6, max: 240 }] },
      { name: 'Stern 1: Loch der dritten Ameisen-Reihe, Rätselbox im Fach, im Keks-Raum auf den großen Drehkeks', star: 1, from: [-2, T3, -148.6],
        legs: [{ ants: 'reihe3', at: [-4.8, -152.6], to: [-7.2, -154.2] }, { until: '=P().pos.y < 13 && P().mode === \'ground\'', max: 300 }, { warp: [-10.6, -155.6] },
          { until: '=P().pos.x > 50', max: 600 }, { to: [RX3, -131.3], within: 0.3 }, { wait: 30 }, { to: [RX3, -134.4], jump: 20, jumpAt: 9, within: 0.6 },
          { to: [RX3, -135.4], within: 0.25, run: false }, { to: [RX3, -141], jump: 24, jumpAt: 9, within: 0.8 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stempel: ins Loch der ersten Ameisen-Reihe – Fach mit dem Stempel', stamp: true, from: [4, T3, -112.6],
        legs: [{ ants: 'reihe1', at: [7.2, -115.6], to: [7.2, -118.2] }, { until: '=P().pos.y < 13 && P().mode === \'ground\'', max: 300 }, { to: [10.4, -120.4], within: 0.3 }], shot: 'stempel' },
      { name: 'Stern 2: hinter dem Zielmast hinab auf die Kuchenplattform, Hasen fangen, Röhre zurück', star: 2, from: [-5, Y + 8, -224],
        legs: [{ to: [-5, -228], within: 0.4 }, { to: [-3, -252], jump: 30, jumpAt: 14.8, within: 0.8 }, { expect: '=at(-6, 6, Y - 4.5, -248, -262)' },
          { chaseKind: 'bunny', max: 2400, jump: false }, { until: '=L.runtime.stars[2] || L.entities.some((e) => e.kind === \'star\' && e.index === 2 && !e.hidden && e.alive)', max: 600 }, { star: 2 },
          { to: [3.4, -249.4], within: 0.3, run: false }, { to: [3.4, -251.6], jump: 24, jumpAt: 9, within: 0.3, run: false }, { wait: 20 }, { crouch: 20 }, { expect: '=at(-8, 8, Y + 7.5, -222, -238)' }], shot: 'stern2' },
    ],
    extra: [
      { name: 'Wurfsichel aus dem ?-Block am Start', from: [-2.5, Y, 1.2], heroes: ['lotti'],
        legs: [{ grab: [-2.5, -1] }, { expect: 'sichel' }] },
      { name: 'Hörner-Ameise: Draufspringen verletzt (Horn)', from: [0, T3, -114.6], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ until: '=L.entities.some((e) => e.kind === \'ameisensoldat_horn\' && Math.abs(e.pos.z + 118) < 1 && Math.abs(e.pos.x) < 1.2)', max: 900 },
          { to: [0, -118], jump: 30, jumpAt: 9, within: 0.4, max: 200 }, { wait: 60 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Stempel-Fach: Röhre zurück auf die Ameisenstraße', from: [9.2, T3 - 4.6, -116.4], heroes: ['lotti'],
        legs: [{ to: [11, -116.2], within: 0.3, run: false }, { to: [11, -114], jump: 24, jumpAt: 9, within: 0.3, run: false }, { wait: 20 }, { crouch: 20 }, { expect: '=P().pos.y > 15.5' }] },
      { name: 'Rätselbox-Fach: Röhre zurück auf die Ameisenstraße', from: [-7.4, T3 - 4.6, -151.6], heroes: ['lotti'],
        legs: [{ to: [-5.6, -151.6], within: 0.3, run: false }, { to: [-5.6, -149.6], jump: 24, jumpAt: 9, within: 0.3, run: false }, { wait: 20 }, { crouch: 20 }, { expect: '=P().pos.y > 15.5' }] },
      { name: 'Extraleben: unsichtbarer Block im Stempel-Fach', from: [11.2, T3 - 4.6, -120.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [11.2, -122.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block im Keks-Raum', from: [RX3 + 6.5, Y, -125], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [RX3 + 6.5, -127], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Riesenschnappblume 1 beißt, wer zu nahe kommt', from: [3.4, Y, -26], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ to: [6.2, -29.2], within: 0.3, run: false, max: 300 }, { wait: 240 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
    ],
    shots: [
      ['start', [0, Y, 6]],
      ['keks', [0, Y, -5]],
      ['platz1', [0, Y, -25]],
      ['zahn', [0, Y, -33.5]],
      ['platz2', [0, Y, -51]],
      ['sternluecke', [-9.6, Y, -64.4]],
      ['wand', [0, Y, -82]],
      ['wand2', [-5, Y + 5.6, -91]],
      ['oben', [0, T3, -100]],
      ['ameisen', [0, T3, -112]],
      ['reihe2', [0, T3, -131]],
      ['fach1', [8, T3 - 4.6, -116]],
      ['fach2', [-8, T3 - 4.6, -152]],
      ['ende', [0, T3, -184]],
      ['ziel', [0, Y + 8, -224]],
      ['kuchen', [0, Y - 4, -250]],
      ['raum', [RX3, Y, -126]],
    ],
  },
  '8-2': {
    start: 'start',
    meta: { stars: 3, time: 400, theme: 'dunes', music: 'course_dunes', archetype: 'ride' },
    enemies: { sandflosser: 10, flatterkaefer: 1, baron_sandstatue: 10, pilzling_sandskulptur: 6 },
    main: [
      { name: 'Aufsteigen am Steg', mount: true },
      { name: 'Startmulde und erste Abfahrt', pflaume: 'main', lat: 0, z: -105 },
      { name: 'Käferschlucht (Rampe in der Mitte)', pflaume: 'main', lat: 0, z: -142 },
      { name: 'zweite Abfahrt', pflaume: 'main', lat: 0, z: -226 },
      { name: 'Statuenfeld bis zum Strand', pflaume: 'main', lat: [[-226, 0], [-244, -1.5], [-252, -1.5], [-262, 0]], z: -400, beach: true },
      { name: 'Zielmast', to: [0, -337.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Sandfiguren im Ritt gerammt, Schubfelder beschleunigen Pflaume', ok: (r) => r.mech.statues >= 1 && r.mech.schub >= 4 },
    ],
    targets: [
      { name: 'Stern 0: Stern-Sandflosser in der Startmulde – kurz vor dem Auftauchen hüpfen, beim Herausspringen draufspringen', star: 0, from: 'start',
        legs: [{ mount: true }, { flosser: 'sf_stern' }, { rideStar: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Hüpfer (geradeaus durch die Mulde)', star: 0, expectNot: true, from: 'start', heroes: ['lotti'],
        legs: [{ mount: true }, { pflaume: 'main', lat: 0, z: -32 }] },
      { name: 'Stern 1: Rampe links nehmen, auf der Rampe springen, in der Luft auf den Flatterkäfer lenken', star: 1, from: 'cp1',
        legs: [{ kaefer: 'kaefer_stern', lat: -1.0, at: -122.4 }, { rideStar: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht mit dem geraden Rampensprung', star: 1, expectNot: true, from: 'cp1', heroes: ['lotti'],
        legs: [{ kaefer: 'kaefer_stern', lat: 0, at: -122.4, steer: false }, { pflaume: 'main', lat: 0, z: -140 }] },
      { name: 'Stern 2: im Statuenfeld nach rechts zur großen Statue, sie zerbröselt, Stern im Sandstrom einholen', star: 2, from: 'field',
        legs: [{ pflaume: 'main', lat: [[-229, 0], [-258, 5.5], [-266, 7], [-280, 7]], z: -273 }, { rideStar: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht auf der Mittellinie', star: 2, expectNot: true, from: 'field', heroes: ['lotti'],
        legs: [{ pflaume: 'main', lat: 0, z: -400, beach: true }] },
      { name: 'Stempel: in der Oase über die unsichtbaren Wolken zwischen den Statuen, ?-Block stoßen, hinauf zum Stempel', stamp: true, from: [0, -8.15, -306],
        legs: [{ to: [-3, -315], within: 0.3, run: false }, { to: [-3, -317.6], jump: 24, jumpAt: 9, within: 0.35, run: false },
          { to: [0, -319.6], jump: 30, jumpAt: 9, within: 0.35, run: false }, { to: [3, -317.6], jump: 30, jumpAt: 9, within: 0.35, run: false },
          { to: [0, -315.6], jump: 30, jumpAt: 9, within: 0.3, run: false }, { hop: 20 }, { to: [1.0, -315.6], within: 0.1, run: false },
          { upOnto: [0, -315.6, -8.15 + 11.45] }], shot: 'stempel' },
      { name: 'Stempel erscheint erst nach dem Stoß gegen den ?-Block', stamp: true, expectNot: true, from: [0, -8.15, -306], heroes: ['lotti'],
        legs: [{ to: [-3, -315], within: 0.3, run: false }, { to: [-3, -317.6], jump: 24, jumpAt: 9, within: 0.35, run: false },
          { to: [0, -319.6], jump: 30, jumpAt: 9, within: 0.35, run: false }, { to: [3, -317.6], jump: 30, jumpAt: 9, within: 0.35, run: false },
          { to: [0, -315.6], jump: 30, jumpAt: 9, within: 0.3, run: false }, { to: [1.2, -315.6], within: 0.12, run: false }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Extraleben: Felsentor-Arm links (Sandsteinbogen)', from: 'descent2', heroes: ['lotti'], expectLives: 1,
        legs: [{ pflaume: 'main', lat: [[-145, 0], [-156, -3]], z: -160 }, { pflaume: 'arm', lat: 0, z: -205 }] },
      { name: 'Extraleben: unsichtbarer Block in der Oase', from: [7, -8.15, -331], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [7, -333], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 500 }] },
      { name: 'Oase: unsichtbare Leitplanke – zu Fuß nicht zurück in den Sandstrom', from: [0, -8.15, -298], heroes: ['lotti'],
        legs: [{ to: [0, -288], within: 0.3, max: 240 }], allowFail: true,
        mech: (r) => r.pos[2] < -293 && r.info.mode === 'ground', mechText: (r) => `z ${r.pos[2].toFixed(1)}` },
      { name: 'Pilzling-Sandskulptur im Ritt rammen: zerbröselt, Münzen', from: 'neck', heroes: ['lotti'], expectCoins: 3,
        legs: [{ pflaume: 'main', lat: [[-30, 0], [-37, -2.6], [-42, -2.6]], z: -44 }],
        mech: (r) => r.mech.skulpturen >= 1, mechText: (r) => `Skulpturen ${r.mech.skulpturen}` },
      { name: 'Kontrollpunkt im Ritt: nach einem Sturz geht es auf Pflaume im Strom weiter', from: 'cp1', heroes: ['lotti'],
        legs: [{ pflaume: 'main', lat: 0, z: -114 }, { die: 'hit' }, { expect: '=P().pos.z < -95 && P().pos.z > -112 && P().riding' }] },
    ],
    shots: [
      ['start', 'start'],
      ['mulde', 'basin', 30],
      ['abfahrt1', 'neck', 160],
      ['rampe', 'ramp', 120],
      ['schlucht', 'gorge', 60],
      ['abfahrt2', 'descent2', 120],
      ['arm', 'arm', 100],
      ['statuenfeld', 'field', 120],
      ['sternstatue', 'vorStatue', 0],
      ['oase', 'beach'],
    ],
  },
  '8-1': {
    start: [0, Y, 6],
    meta: { stars: 3, time: 400, theme: 'rainfort', music: 'course_rainfort', archetype: 'parcours' },
    enemies: { feuer_werfer: 3, stachelfalle: 7, knochenflieger_gruppe: 5, knochenflieger_glied: 25 },
    main: [
      { name: 'Torhof', to: [0, -5], within: 0.6 },
      { name: 'Steg 1: Stachelfalle im Takt', trap: 'falle1', at: [0, -9.6], to: [0, -18.5] },
      { name: 'Turm 1', to: [0, -25.6], within: 0.5 },
      { name: 'Steg 2: Fallen-Welle', trap: 'falle2', at: [0, -28.4], to: [0, -33.5] },
      { trap: 'falle3', at: [0, -33.5], to: [0, -38.5] },
      { trap: 'falle4', at: [0, -38.5], to: [0, -44] },
      { name: 'Turm 2', to: [0, -47.5], within: 0.5 },
      { name: 'Warp-Box über den Graben', warp: [2.5, -50.5] },
      { expect: 'ankunft' },
      { to: [0, -81.2], within: 0.4 },
      { name: '3-m-Lücke', to: [0, -86.5], jump: 24, jumpAt: 9, within: 0.6 },
      { name: 'Feuer-Werfer 1', stompAll: 'werfer1' },
      { to: [0, -97.3], within: 0.3 },
      { name: 'Lücke zum Steg', to: [0, -103.5], jump: 24, jumpAt: 9, within: 0.6 },
      { to: [0, -106.3], within: 0.3 },
      { name: 'Lücke zu Werfer-Platz 2', to: [0, -112.5], jump: 24, jumpAt: 9, within: 0.6 },
      { name: 'Feuer-Werfer 2', stompAll: 'werfer2' },
      { to: [0, -122], within: 0.5 },
      { name: 'Hammer-Werfer', stompAll: 'werfer3' },
      { name: 'Warp-Box zur Kontrollpunkt-Insel', warp: [2.5, -129] },
      { expect: 'cp81' },
      { name: 'Kontrollpunkt', to: [0, -157.5], within: 0.6 },
      { to: [0, -164], within: 0.6 },
      { name: 'Knochenflieger-Strecke', to: [0, -179], within: 0.6 },
      { name: 'Platz der Keil-Gruppe', to: [0, -191], within: 0.6 },
      { name: 'Steg mit zwei Fallen', trap: 'falle5', at: [0, -194.6], to: [0, -200] },
      { trap: 'falle6', at: [0, -200], to: [0, -206.5] },
      { name: 'Platz der Ring-Gruppe', to: [0, -219], within: 0.6 },
      { to: [0, -235.2], within: 0.4, run: false },
      { name: 'Stachel-Schwebeplattform 1', block: 'schwebe1', board: [0, -238.2], exit: [0, -247.2] },
      { name: 'Stachel-Schwebeplattform 2', block: 'schwebe2', board: [0, -251.2], exit: [8, -251.2] },
      { name: 'Stachel-Schwebeplattform 3 (rot, ohne Pause)', block: 'schwebe3', board: [8, -255.4], exit: [8, -262.4], moving: true },
      { to: [8, -266.5], jump: 20, within: 0.5, run: false },
      { expect: 'schwebeturm' },
      { name: 'Warp-Box zum Zielturm', warp: [8, -269] },
      { expect: 'zielturm' },
      { name: 'Zielmast', to: [0, -299.4], within: 0.2 },
    ],
    routeChecks: [
      { name: 'drei Warp-Boxen, drei Werfer besiegt, drei Stachel-Schwebeplattformen', ok: (r) => r.mech.warps === 3 && r.mech.stomped.length >= 3 && r.log.filter((l) => l[0] === 'stachelblock').length === 3 },
    ],
    targets: [
      { name: 'Stern 0: Krallen-Anzug aus dem ?-Block, links vom ersten Feuer-Werfer die Säule hinauf', star: 0, from: [0, Y, -70.5],
        legs: [{ grab: [2.2, -73] }, { expect: 'krallen' },
          { to: [0, -81.2], within: 0.4 }, { to: [0, -86.5], jump: 24, jumpAt: 9, within: 0.6 },
          { to: [0, -90.4], within: 0.4 }, { to: [-4.4, -92.6], within: 0.3, run: false }, { climb: [-4.4, -95.6], top: Y + 7, then: [-4.4, -95.6] }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Krallen-Anzug (an der Säule nur Wandrutschen)', star: 0, expectNot: true, from: [-4.4, Y, -92.4], heroes: ['lotti'],
        legs: [{ climb: [-4.4, -95.6], top: Y + 7, max: 400 }, { wait: 30 }], mech: (r) => r.pos[1] < Y + 3, mechText: (r) => `y ${r.pos[1].toFixed(1)}` },
      { name: 'Stern 1: Krallen-Anzug am Kontrollpunkt, Kletterwand hinter dem Stempel, Rätselbox, Wache besiegen', star: 1, from: [0, Y, -157],
        legs: [{ grab: [-2.5, -152] }, { expect: 'krallen' },
          { to: [-7.5, -149.5], within: 0.4 }, { trap: 'falle7', at: [-9.2, -149.5], to: [-15, -149.5] }, { to: [-19, -149.6], within: 0.3, run: false },
          { climb: [-19, -152.6], top: Y + 9 }, { warp: [-19, -153.5] }, { until: 'bonus', max: 600 }, { to: [BX - 2, -150], within: 0.5, run: false },
          { name: 'Wache', stompAll: 'wache' }, { until: 'stern1da', max: 900 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Wache-Besiegen (Rätselbox allein reicht nicht)', star: 1, expectNot: true, from: [-19, Y + 9, -152.4], heroes: ['lotti'],
        legs: [{ warp: [-19, -153.5] }, { until: 'bonus', max: 600 }, { to: [BX - 2, -150], within: 0.5, run: false }, { wait: 240 }] },
      { name: 'Stern 2: nach der Keil-Gruppe über die einzelnen Fallblöcke hinaus', star: 2, from: [0, Y, -183],
        legs: [{ to: [6.4, -186], within: 0.3 }, { to: [9.4, -186], jump: 20, jumpAt: 9, within: 0.5 }, { to: [12, -186.3], jump: 20, jumpAt: 9, within: 0.5 },
          { to: [14.6, -186], jump: 20, jumpAt: 9, within: 0.5 }, { to: [17.2, -186.3], jump: 20, jumpAt: 9, within: 0.5 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: vom Kontrollpunkt nach Südwesten, an der Stachelfalle vorbei zum Stempel-Turm', stamp: true, from: [0, Y, -157],
        legs: [{ to: [-7.5, -149.5], within: 0.4 }, { trap: 'falle7', at: [-9.2, -149.5], to: [-15, -149.5] }, { to: [-19, -146.6], within: 0.3 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Stachelfalle verletzt, wer ohne Abwarten darüberläuft', from: [0, Y, -27.4], heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
        legs: [{ until: '=ent(\'falle2\').state === \'warn\'', max: 900 }, { to: [0, -31], within: 0.3, run: false, max: 200 }, { wait: 150 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Graben nach Turm 2 zu breit zum Springen (nur die Warp-Box)', from: [0, Y, -46], heroes: ['lotti', 'greta'], expectAlive: false, allowFail: true,
        legs: [{ to: [-2.2, -53.6], within: 0.3, run: true }, { to: [-2.2, -72], jump: 40, jumpAt: 20, within: 0.6, max: 300 }],
        mech: (r) => r.dead, mechText: (r) => (r.dead ? 'abgestürzt' : `z ${r.pos[2].toFixed(1)}`) },
      { name: 'Keil-Gruppe: Knochenflieger im Sturzflug von oben treffen – Knochenhaufen, setzt sich nach 4 s neu zusammen', from: [0, Y, -186], heroes: ['lotti'],
        legs: [{ diveStomp: 'kg_keil', at: [0, -186], max: 3000 }, { until: '=ent(\'kg_keil\').members.some((m) => m.state === \'rebuild\') || ent(\'kg_keil\').rebuilds > 0', max: 900 }],
        mech: (r) => r.mech.piles >= 1 && !r.log.some((l) => String(l[0]).startsWith('FEHLER')), mechText: (r) => `Haufen ${r.mech.piles}` },
      { name: 'Keil-Gruppe: Stampfattacke auf den Knochenhaufen besiegt endgültig', from: [0, Y, -186], heroes: ['lotti'],
        legs: [{ diveStomp: 'kg_keil', at: [0, -186], max: 3000, finish: true }],
        mech: (r) => (r.mech.gone ?? 0) >= 1, mechText: (r) => `endgültig ${r.mech.gone ?? 0}` },
      { name: 'Extraleben: unsichtbarer Block am Torhof', from: [5.5, Y, 9.8], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [5.5, 8], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block in der Wachstube', from: [BX + 6, Y, -154], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [BX + 6, -156], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
    ],
    shots: [
      ['start', [0, Y, 6]],
      ['steg1', [0, Y, -7]],
      ['steg2', [0, Y, -26]],
      ['turm2', [0, Y, -46]],
      ['ankunft', [0, Y, -71]],
      ['werfer1', [0, Y, -86]],
      ['werfer2', [0, Y, -107]],
      ['cp', [0, Y, -150]],
      ['stempel', [-12, Y, -149.5]],
      ['bonus', [BX - 2, Y, -148]],
      ['keil', [0, Y, -170]],
      ['fall', [6, Y, -186]],
      ['ring', [0, Y, -205]],
      ['schwebe', [0, Y, -231]],
      ['schwebe2', [0, Y, -240]],
      ['ziel', [0, Y, -290]],
    ],
  },
};

const PORT = 4850;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,arena,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const wegDa = (id) => { const h = L.named.get(id); return !!h && h.parts > 0 && h.shown >= h.parts; };
  const COND = {
    // 8-1
    turm2: () => at(-5, 5, 0.5, -45, -54),
    ankunft: () => at(-5, 5, 0.5, -69, -77),
    platz3: () => at(-5, 5, 0.5, -125, -132),
    cp81: () => at(-8, 8, 0.5, -147, -165),
    schwebeturm: () => at(3, 13, 0.5, -264.4, -273),
    zielturm: () => at(-6, 6, 0.5, -288, -304),
    bonus: () => P().pos.x > 60 && P().pos.y > 0.5,
    krallen: () => P().power === 'krallen',
    stern1da: () => L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && e.alive),
    funken: () => P().power === 'funken',
    sichel: () => P().power === 'sichel',
  };
  /** Bedingung: Name aus COND oder Ausdruck '=…' (Variablen P, L, ent, at). */
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', 'Y', `return (${k.slice(1)});`)(P, L, ent, at, 1) : COND[k]());
  const W = {
    place(pos, o = {}) {
      const p = P();
      if (typeof pos === 'string') pos = L.data.marks[pos];
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L.runtime.status = 'play';
      L.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      wrapHurt();
      p.hurtTries = 0;
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    /** Ritt (8-2): Wunsch längs der Strömung f (−1 bremsen … +1 schieben) und quer (−1 links … +1 rechts) → Stick. */
    rideStick(f, along, lat) {
      const wx = f.dx * along - f.dz * lat, wz = f.dz * along + f.dx * lat;
      const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      const x = co * wx - si * wz, y = -si * wx - co * wz;
      const m = Math.max(1, Math.abs(x), Math.abs(y));
      return { x: x / m, y: y / m };
    },
    /** Lenkung in der Luft: Wunschgeschwindigkeit zum Ziel (tx, tz) plus Mitbewegung (vx, vz). */
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, keys: 0, pipes: 0, warps: 0, rides: 0, stomped: [], hurtList: [] };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasnetz' || kind === 'glasspipe' || kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ warten, bis Stachelkugeln (Ids) nicht mehr nahe am Weg sind
        if (Lg.clear) {
          const [cx, cz] = Lg.at, r = Lg.r ?? 3;
          const near = () => Lg.clear.some((id) => { const e = ent(id); return e && e.alive && !e.removed && Math.hypot(e.pos.x - cx, e.pos.z - cz) < r; });
          let k = 0, prev = null, ok = 0;
          // erst warten, bis die Kugeln weg sind und sich entfernen
          for (; k < 900; k++) {
            const d = Lg.clear.map((id) => { const e = ent(id); return e ? Math.hypot(e.pos.x - cx, e.pos.z - cz) : 99; });
            const away = prev ? d.every((v, i) => v >= prev[i] - 1e-4 || v > r + 3) : false;
            prev = d;
            if (!near() && away) { if (++ok > 3) break; } else ok = 0;
            tick({});
          }
          log.push(['frei', Lg.clear.join(','), k]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: false, jump: Lg.jumpIn && k % 40 < 12 });
          }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box / Wolkenkanone springen und mitfahren
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, rode = false;
          const r0 = mech.rides;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const jump = p.mode === 'ground' ? d < 2.0 : p.vel.y > 0;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { rode = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (rode) mech.warps++;
          log.push(['warp', `${Lg.warp}`, rode, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box/Kanone nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Schubser in Richtung dir vom Schiff stoßen (Anlauf von der Gegenseite)
        if (Lg.push) {
          const e = L.entities.find((x) => x.spec?.id === Lg.push);
          const dl = Math.hypot(Lg.dir[0], Lg.dir[1]) || 1;
          let dx = Lg.dir[0] / dl, dz = Lg.dir[1] / dl;
          const cx = Lg.center ?? 0;   // Schiffsmitte (x): Anlaufpunkt nie näher als 1,3 m an die Deckkante
          let tries = 0;
          const gone = () => !e || !e.alive || e.removed || e.defeated || e.state === 'defeated' || e.state === 'fall' || e.pos.y < (e.home?.y ?? 0) - 1.5;
          for (; tries < 10 && !gone() && !p.dead; tries++) {
            // auf die Gegenseite des Schubsers gehen (nah, damit die Figur nicht an die Deckkante gerät)
            // zur näheren Deckkante stoßen
            if (Math.abs(e.pos.x - cx) > 0.4) { dx = Math.sign(e.pos.x - cx); dz = 0; }
            // Anlauf zügig: auf die Gegenseite (≈ 2,6 m vor ihm, nie näher als 1,3 m an die Deckkante), von dort gleich abspringen
            const dodge = () => {
              // rammt er heran: hochspringen und über ihn hinweg (er rauscht darunter durch), dann zur Mitte zurück
              if (e.state !== 'charge' || Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > 3.2 || p.mode !== 'ground') return false;
              for (let q = 0; q < 30; q++) tick({ jump: true });
              for (let q = 0; q < 200 && p.mode !== 'ground' && !p.dead; q++) tick({ ...this.airSteer(Math.max(cx - 1.4, Math.min(cx + 1.4, p.pos.x)), p.pos.z, 0, 0, 2, 3) });
              mech.dodged = (mech.dodged ?? 0) + 1;
              return true;
            };
            for (let k = 0; k < 500 && !gone(); k++) {
              if (dodge()) continue;
              const ax = Math.max(cx - 2.2, Math.min(cx + 2.2, e.pos.x - dx * (Lg.back ?? 2.6))), az = e.pos.z - dz * (Lg.back ?? 2.6);
              const qx = ax - p.pos.x, qz = az - p.pos.z, d = Math.hypot(qx, qz);
              if (d < 0.6 && p.mode === 'ground' && e.state !== 'warn' && e.state !== 'charge') break;
              tick({ ...this.stick(qx, qz, Math.min(1, Math.max(0.5, d / 1.0))), run: d > 2 });
            }
            const p0 = e.pushes ?? 0;
            // Sprung auf ihn (Ziel knapp vor seiner Mitte auf unserer Seite), über ihm Stampfattacke → er rutscht in dir
            let pounding = false;
            for (let k = 0; k < 220 && !gone() && (e.pushes ?? 0) === p0 && !p.dead; k++) {
              const tx = Math.max(cx - 2.4, Math.min(cx + 2.4, e.pos.x - dx * 0.3)), tz = e.pos.z - dz * 0.3;
              const hd = Math.hypot(tx - p.pos.x, tz - p.pos.z);
              if (!pounding && k > 6 && hd < 0.45 && p.vel.y < 3 && p.pos.y > e.pos.y + 1.2) pounding = true;
              if (pounding) { tick({ crouch: true }); continue; }
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, e.vel?.x ?? 0, e.vel?.z ?? 0, 3.4, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: k < 26, run: false });
            }
            // nach dem Stoß in der Luft zur Deckmitte lenken, dann kurz warten
            for (let k = 0; k < 240 && p.mode !== 'ground' && !p.dead; k++) tick({ ...this.airSteer(Math.max(cx - 1.6, Math.min(cx + 1.6, p.pos.x)), p.pos.z, 0, 0, 3, 5) });
            // warten, dabei nicht an die Deckkante rutschen (zur Mitte zurück)
            for (let k = 0; k < 150 && !gone(); k++) {
              const off = p.pos.x - cx;
              tick(p.mode === 'ground' && Math.abs(off) > 1.2 ? this.stick(-off, 0, 0.6) : {});
            }
          }
          for (let k = 0; k < 120 && e?.alive && !e?.removed && !e?.defeated; k++) tick({});
          if (gone()) mech.pushedOff = (mech.pushedOff ?? 0) + 1;
          log.push(['schubser', Lg.push, gone(), tries, e?.state, e?.fellBy, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!gone()) { log.push(['FEHLER: Schubser nicht hinuntergestoßen', Lg.push]); break; }
          continue;
        }
        // ------------------------------------------------ durch die Lücke eines Kreisgeist-Rings zum Ziel (Lücke vorausrechnen)
        if (Lg.ringGap) {
          const ring = L.entities.find((x) => x.spec?.id === Lg.ringGap);
          const members = () => (ring?.members ?? []).filter((x) => x.alive && !x.removed);
          const [tx, tz] = Lg.to;
          // warten, bis auf dem Weg zum Ziel kein Geist näher als 1,35 m kommt (Vorausschau 1,2 s mit Ringdrehung)
          const safe = () => {
            const c = ring.pos, w = (ring.speed ?? 1.6) / Math.max(0.1, ring.radius ?? 3) * (ring.cw ? -1 : 1);
            const vx = 0, vz = 0; void vx; void vz;
            for (let t = 0; t <= 1.2; t += 0.1) {
              const k = Math.min(1, t / 0.9), px = p.pos.x + (tx - p.pos.x) * k, pz = p.pos.z + (tz - p.pos.z) * k;
              for (const m of members()) {
                const a0 = Math.atan2(m.pos.z - c.z, m.pos.x - c.x), r = Math.hypot(m.pos.x - c.x, m.pos.z - c.z);
                for (const sg of [1, -1]) {
                  const a = a0 + sg * w * t;
                  if (Math.hypot(c.x + Math.cos(a) * r - px, c.z + Math.sin(a) * r - pz) < 1.35) return false;
                }
              }
            }
            return true;
          };
          let k = 0;
          for (; k < 1200 && !safe(); k++) tick({});
          let j = 0;
          for (; j < 400 && !p.dead; j++) {
            const qx = tx - p.pos.x, qz = tz - p.pos.z, d = Math.hypot(qx, qz);
            if (d < 0.4 && p.mode === 'ground') break;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(qx, qz, 1)), run: true });
          }
          log.push(['ringlücke', Lg.ringGap, k, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Lücke zwischen kreisenden Gegnern (Art kind nahe near) abwarten
        if (Lg.gap) {
          const [cx, cz, cr] = Lg.near, [tx, tz] = Lg.to;
          const foes = () => L.entities.filter((x) => x.kind === Lg.gap && x.alive && !x.removed && Math.hypot(x.pos.x - cx, x.pos.z - cz) < cr);
          // Vorausschau: Gegner auf ihrer Kreisbahn um near (Winkelgeschwindigkeit aus zwei aufeinanderfolgenden Schritten)
          const prevA = new Map();
          const safe = () => {
            const d0 = Math.hypot(tx - p.pos.x, tz - p.pos.z), T = d0 / 6.5 + 0.35;
            const list = foes().map((m) => {
              const rx = m.pos.x - cx, rz = m.pos.z - cz, a = Math.atan2(rz, rx);
              let w = 0;
              if (prevA.has(m)) { let da = a - prevA.get(m); if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; w = da * 60; }
              prevA.set(m, a);
              return { a, r: Math.hypot(rx, rz), w };
            });
            if (!list.length) return true;
            if (list.some((f) => f.w === 0)) return false;   // erst nach zwei Schritten urteilen
            for (let t = 0; t <= T + 0.3; t += 0.1) {
              const k = Math.min(1, t / T), px = p.pos.x + (tx - p.pos.x) * k, pz = p.pos.z + (tz - p.pos.z) * k;
              for (const f of list) {
                const a = f.a + f.w * t;
                if (Math.hypot(cx + Math.cos(a) * f.r - px, cz + Math.sin(a) * f.r - pz) < (Lg.clear ?? 1.5)) return false;
              }
            }
            return true;
          };
          let k = 0;
          for (; k < 1200 && !safe(); k++) tick({});
          let j = 0;
          for (; j < 400 && !p.dead; j++) {
            const qx = tx - p.pos.x, qz = tz - p.pos.z, d = Math.hypot(qx, qz);
            if (d < (Lg.within ?? 0.4) && p.mode === 'ground') break;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(qx, qz, 1)), run: true });
          }
          log.push(['lücke', Lg.gap, k, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          let guard = 0;
          for (; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre));
            if (!list.length) break;
            list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            let k = 0;
            const pu0 = e.pushes ?? 0;
            for (; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              if (Lg.max && (e.pushes ?? 0) > pu0) { mech.bounced = (mech.bounced ?? 0) + 1; break; }
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
            if (Lg.max && guard + 1 >= Lg.max) break;
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', mech.stomped.length, mech.stomped.join(' ')]);
          continue;
        }
        // ------------------------------------------------ Sprung auf [x, z] mit Stampfattacke über dem Ziel
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounded = false;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && k > 4 && (pounded || p.state === 'groundpound')) break;
            if (p.mode === 'air' && !pounded && d < 0.25 && p.vel.y < 1.5 && p.pos.y > (Lg.above ?? -99)) { pounded = true; }
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Feuerbälle (Funkenblüte) auf ein Ziel (Id), bis es getroffen ist
        if (Lg.fire) {
          const e = L.named.get(Lg.fire);
          const done = () => !e || !e.alive || e.removed || e.defeated || e.lit;
          let k = 0, shots = 0;
          for (; k < (Lg.max ?? 1500) && !done() && !p.dead; k++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const want = Lg.dist ?? 3.5;
            if (d > want + 0.6 || p.mode !== 'ground') { tick({ ...this.stick(dx, dz, Math.min(1, (d - want) / 1.5 + 0.3)), run: false }); continue; }
            // zum Ziel drehen (kleiner Schritt), dann werfen
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot < 0.97) { tick({ ...this.stick(dx, dz, 0.12), run: false }); continue; }
            const fire = k % 24 === 0;
            if (fire) shots++;
            tick({ action: fire });
          }
          for (let i = 0; i < 30; i++) tick({});
          log.push(['feuer', Lg.fire, done(), shots, k]);
          if (!done()) log.push(['FEHLER: Ziel nicht getroffen', Lg.fire]);
          continue;
        }
        // ------------------------------------------------ Fahrplattform (mover-Id): warten, aufsteigen, mitfahren, absteigen
        if (Lg.ride) {
          const m = L.named.get(Lg.ride);
          const sh = m.shape;
          const cz = () => (sh.z0 + sh.z1) / 2, cx = () => (sh.x0 + sh.x1) / 2, top = () => sh.y1;
          const [ax, az] = Lg.board, [bx, bz] = Lg.to;
          let k = 0;
          // warten, bis die Plattform am Einstieg steht
          for (; k < 2400 && Math.hypot(cx() - ax, cz() - az) > 0.4; k++) tick({});
          for (let n = 0; n < 300 && !p.dead; n++, k++) {
            const dx = cx() - p.pos.x, dz = cz() - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.35 && p.mode === 'ground' && Math.abs(p.pos.y - top()) < 0.2) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(cx(), cz(), 0, 0, 4, 6) : this.stick(dx, dz, Math.min(1, d))), run: false, jump: d < 2.2 && p.mode === 'ground' && p.pos.y < top() - 0.3 });
          }
          // mitfahren, bis die Plattform am Ausstieg ist
          for (let n = 0; n < 2400 && !p.dead && Math.hypot(cx() - Lg.exit[0], cz() - Lg.exit[1]) > 0.4; n++, k++) tick({ ...this.stick(cx() - p.pos.x, cz() - p.pos.z, Math.min(1, Math.hypot(cx() - p.pos.x, cz() - p.pos.z))), run: false });
          for (let n = 0; n < 300 && !p.dead; n++, k++) {
            const dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.5 && p.mode === 'ground') break;
            tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3, 6) : this.stick(dx, dz, 1)), run: false, jump: n < 20 });
          }
          log.push(['fahrt', Lg.ride, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ alle Felder (Liste [x, z]) betreten
        if (Lg.tiles) {
          for (const [tx, tz] of Lg.tiles) {
            for (let n = 0; n < 400 && !p.dead; n++) {
              const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
              if (d < 0.3) break;
              tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.2))), run: false });
            }
            for (let n = 0; n < 6; n++) tick({});
          }
          log.push(['felder', Lg.tiles.length, Lg.group ? L.named.get(Lg.group)?.done : null]);
          continue;
        }
        // ------------------------------------------------ Schiebekugel über Wegpunkte rollen (Figur stellt sich dahinter)
        if (Lg.roll) {
          const ball = L.named.get(Lg.roll);
          let k = 0;
          for (const [wx, wz, near = 0.5] of Lg.via) {
            for (let n = 0; n < 2400 && !p.dead; n++, k++) {
              const bx = ball.pos.x, bz = ball.pos.z;
              const dx = wx - bx, dz = wz - bz, d = Math.hypot(dx, dz);
              if (d < near) break;
              const ux = dx / d, uz = dz / d, R = ball.size / 2 + 0.55;
              const sx = bx - ux * R, sz = bz - uz * R;            // Schiebepunkt hinter der Kugel
              const qx = sx - p.pos.x, qz = sz - p.pos.z, q = Math.hypot(qx, qz);
              // Abstand der Figur zur Schiebelinie: liegt sie seitlich, erst um die Kugel herum (Abstand halten)
              const rx = p.pos.x - bx, rz = p.pos.z - bz, along = rx * ux + rz * uz;
              if (q > 0.35 || along > -R + 0.2) {
                let gx = qx, gz = qz;
                const rl = Math.hypot(rx, rz);
                if (rl < R + 0.3 && along > -R + 0.4) { gx = rx / rl; gz = rz / rl; gx += -ux * 0.6; gz += -uz * 0.6; }   // vom Ball weg
                tick({ ...this.stick(gx, gz, Math.min(1, Math.max(0.35, q / 1.2))), run: false });
              } else {
                const sp = Math.min(1, Math.max(0.25, d / 3)) * (Lg.slow ?? 0.6);
                tick({ ...this.stick(ux + (sx - p.pos.x) * 0.8, uz + (sz - p.pos.z) * 0.8, sp), run: false });
              }
            }
          }
          for (let i = 0; i < 120; i++) tick({});
          log.push(['kugel', Lg.roll, k, +ball.pos.x.toFixed(2), +ball.pos.z.toFixed(2), ball.resets ?? 0]);
          continue;
        }
        // ------------------------------------------------ Stachelfalle: an [x, z] warten, bis sie lange genug eingefahren bleibt, dann zu to
        if (Lg.trap) {
          const tr = L.named.get(Lg.trap) ?? L.entities.find((e) => e.spec?.id === Lg.trap);
          const [ax, az] = Lg.at, [bx, bz] = Lg.to;
          for (let n = 0; n < 400 && !p.dead; n++) {
            const dx = ax - p.pos.x, dz = az - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.3 && p.mode === 'ground') break;
            tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false });
          }
          const need = Lg.need ?? (Math.hypot(bx - ax, bz - az) / 8 + 0.25);
          const left = () => {
            const per = Math.max(tr.upT + tr.warnT + 0.4, tr.period), t = (tr.clock + tr.phase * per) % per;
            return tr.upK > 0.01 ? -1 : (per - tr.upT) - t;
          };
          let k = 0;
          for (; k < 1200 && left() < need; k++) tick({});
          let j = 0;
          for (; j < 400 && !p.dead; j++) {
            const dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz);
            if (d < (Lg.within ?? 0.4) && p.mode === 'ground') break;
            tick({ ...this.stick(dx, dz, 1), run: true });
          }
          log.push(['falle', Lg.trap, k, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Stachelblock-Schwebeplattform (Id): am Einstieg warten, aufspringen, mitfahren
        if (Lg.block) {
          const h = L.named.get(Lg.block);
          const mb = h.mb;
          const [ax, az] = Lg.board, [ex, ez] = Lg.exit;
          const at = (x, z, r = 0.25) => Math.hypot(mb.pos.x - x, mb.pos.z - z) < r;
          let k = 0;
          // warten, bis der Block am Einstieg hält
          const ready = (x, z) => (Lg.moving ? at(x, z, 0.45) : at(x, z) && h.state === 'wartet');
          for (; k < 2400 && !ready(ax, az); k++) tick({});
          // aufspringen (Mitte der Oberseite)
          let n = 0;
          for (; n < 300 && !p.dead; n++, k++) {
            const dx = mb.pos.x - p.pos.x, dz = mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.5 && p.mode === 'ground' && Math.abs(p.pos.y - mb.top) < 0.2) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6) : this.stick(dx, dz, 1)), run: false, jump: p.mode === 'ground' && d < (Lg.jumpAt ?? 3.6) && n < 400 });
          }
          // mitfahren bis zum Ausstieg (Mitte halten)
          for (n = 0; n < 2400 && !p.dead && !ready(ex, ez); n++, k++) {
            const dx = mb.pos.x - p.pos.x, dz = mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.15 && p.mode === 'ground' ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {});
          }
          log.push(['stachelblock', Lg.block, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Weitsprung: Anlauf Richtung Ziel, ducken (Rutschen), springen; in der Luft zum Ziel lenken
        if (Lg.long) {
          const [tx, tz] = Lg.long;
          let k = 0, longed = false;
          const ru = Lg.runup ?? 10;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (k > ru + 20 && p.mode === 'ground') break;
            if (p.state === 'longjump') longed = true;
            if (p.mode === 'air') { tick({ ...this.airSteer(tx, tz, 0, 0, 2.5, 14) }); continue; }
            const crouch = k >= ru && k < ru + 3, jump = k >= ru + 2 && k < ru + 6;
            tick({ ...this.stick(dx, dz, 1), run: true, crouch, jump });
          }
          log.push(['weitsprung', `${Lg.long}`, longed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel auf einen Punkt werfen (zum Ziel drehen, Aktion), Rückkehr abwarten
        if (Lg.throwAt) {
          const [tx, tz] = Lg.throwAt;
          let k = 0;
          for (; k < 200 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995) break;
            tick({ ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          for (let n = 0; n < (Lg.wait ?? 240); n++) tick({});
          log.push(['sichel', `${Lg.throwAt}`, k, p.power]);
          continue;
        }
        // ------------------------------------------------ Ameisen-Reihe (Id der ameisen_reihe) queren: Lücke abwarten, dann hinüber
        if (Lg.ants) {
          const row = L.named.get(Lg.ants);
          const [ax, az] = Lg.at, [bx, bz] = Lg.to;
          const dirx = Math.sign(row.to.x - row.from.x) || 1;
          const rz = row.from.z;
          for (let n = 0; n < 400 && !p.dead; n++) { const dx = ax - p.pos.x, dz = az - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.3 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); }
          const ants = () => L.entities.filter((e) => (e.kind === 'ameisensoldat_horn' || e.kind === 'ameisensoldat') && e.alive && !e.removed && Math.abs(e.pos.z - rz) < 2.2);
          // sicher: die nächste herankommende Ameise ist noch ≥ near m entfernt, die eben vorbeigelaufene ≥ 0,9 m weiter
          const near = Lg.near ?? 2.0;
          const safe = () => ants().every((e) => { const dx = e.pos.x - p.pos.x; const appr = dx * dirx < 0; return Math.abs(dx) > (appr ? near : 0.9); });
          let k = 0, ok = 0;
          for (; k < 1500; k++) { if (safe()) { if (++ok > 2) break; } else ok = 0; tick({}); }
          let j = 0;
          for (; j < 400 && !p.dead; j++) { const dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.4 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, 1), run: true }); }
          log.push(['ameisen', Lg.ants, k, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Knochenflieger einer Gruppe im Sturzflug von oben treffen (Reflexsprung), optional stampfen
        if (Lg.diveStomp) {
          const g = L.named.get(Lg.diveStomp);
          const piles0 = g.members.filter((m) => m.state === 'bones').length;
          let k = 0, tries = 0, hit = false;
          const last = new Map();
          const JD = Lg.jumpDist ?? 2.2, JH = Lg.jumpH ?? 2.4;
          for (; k < (Lg.max ?? 2400) && !p.dead && !hit; k++) {
            const dv = g.members.filter((m) => m.state === 'dive' && !m.defeated);
            let m = null, best = 99;
            for (const q of dv) { const d = Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z); const l = last.get(q); const down = l && q.pos.y < l.y - 1e-3; if (down && d < best) { best = d; m = q; } }
            for (const q of g.members) last.set(q, { x: q.pos.x, y: q.pos.y, z: q.pos.z });
            if (m && p.mode === 'ground' && best < JD && m.pos.y - p.pos.y < JH) {
              tries++;
              const mm = m;
              for (let n = 0; n < 200 && !p.dead; n++, k++) {
                if (n > 8 && p.mode === 'ground') break;
                const l = last.get(mm) ?? mm.pos, vx = (mm.pos.x - l.x) * 120, vz = (mm.pos.z - l.z) * 120;
                last.set(mm, { x: mm.pos.x, y: mm.pos.y, z: mm.pos.z });
                tick({ ...(p.mode === 'air' ? this.airSteer(mm.pos.x, mm.pos.z, vx, vz, 4, 7) : {}), jump: n < (Lg.hold ?? 18) });
              }
              hit = g.members.filter((q) => q.state === 'bones').length > piles0;
            } else {
              const [hx, hz] = Lg.at; const dx = hx - p.pos.x, dz = hz - p.pos.z, d = Math.hypot(dx, dz);
              tick(d > 0.4 && p.mode === 'ground' ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {});
            }
          }
          mech.piles = g.members.filter((q) => q.state === 'bones').length;
          log.push(['knochen', Lg.diveStomp, hit, tries, k, mech.piles]);
          if (hit && Lg.finish) {
            // auf einen Knochenhaufen springen und stampfen → endgültig
            const pile = g.members.find((q) => q.state === 'bones');
            for (let n = 0; n < 300 && pile && pile.state === 'bones' && !p.dead; n++, k++) {
              const dx = pile.pos.x - p.pos.x, dz = pile.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'air' && d < 0.4 && p.vel.y < 1) { tick({ crouch: true }); continue; }
              tick({ ...(p.mode === 'air' ? this.airSteer(pile.pos.x, pile.pos.z, 0, 0, 4, 6) : this.stick(dx, dz, 1)), run: false, jump: p.mode === 'ground' && d < 1.4 });
            }
            for (let n = 0; n < 60; n++) tick({});
            mech.gone = g.members.filter((q) => q.state === 'gone' || q.defeated).length;
            log.push(['haufen', mech.gone]);
          }
          continue;
        }
        // ------------------------------------------------ liegendes Zahnrad als Stufe: von der aktuellen Stelle hinauf springen, dann zur Mitte
        if (Lg.cog !== undefined) {
          const h = Lg.cog ? L.named.get(Lg.cog) : null;
          const [tx, tz] = Lg.to;
          const top0 = p.pos.y;
          let k = 0, landed = false;
          const ru = Lg.runup ?? 8;
          // kurzer Anlauf Richtung Ziel (Schwung vom vorigen Bein und vom Drehteller abbauen), dann Sprung
          for (; k < 300 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (k > ru + 12 && p.mode === 'ground') { landed = p.pos.y > top0 + 0.8; break; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 7) : this.stick(dx, dz, 1)), run: false, jump: k >= ru && k < ru + 40 });
          }
          // auf dem Drehteller zur Mitte (Drehung nimmt mit)
          for (let n = 0; n < 120 && !p.dead && h; n++, k++) { const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.4) break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d))), run: false }); }
          log.push(['stufe', Lg.cog, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!landed || (Lg.top && p.pos.y < Lg.top - 0.2)) log.push(['FEHLER: Stufe nicht erreicht', Lg.cog]);
          continue;
        }
        // ------------------------------------------------ stehendes Keks-Zahnrad (Paternoster): auf einen steigenden Zahn springen, mitfahren, oben abspringen
        if (Lg.gear) {
          const h = L.named.get(Lg.gear);
          const [bx, bz] = Lg.board, [tx, tz] = Lg.to;
          const tops = () => h.teeth.map((t, i) => ({ i, x: t.x, y: t.y + 0.45, z: t.z }));
          let prev = tops();
          let k = 0, tooth = null;
          // zum Einstieg
          for (let n = 0; n < 400 && !p.dead; n++, k++) { const dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.25 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); prev = tops(); }
          // warten auf einen steigenden Zahn knapp über der Standhöhe nahe am Einstieg
          for (; k < 3000 && !tooth && !p.dead; k++) {
            const cur = tops();
            const c = cur.find((t, i) => t.y > prev[i].y && t.y > p.pos.y + (Lg.min ?? 0.6) && t.y < p.pos.y + (Lg.max ?? 1.4) && Math.abs(t.x - p.pos.x) < (Lg.reach ?? 1.6));
            prev = cur;
            if (c) { tooth = c.i; log.push(['zahnwahl', c.i, +c.x.toFixed(2), +c.y.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), p.state]); } else tick({});
          }
          // aufspringen und mitfahren (Zahnmitte halten)
          let on = false;
          for (let n = 0; n < 2400 && tooth !== null && !p.dead; n++, k++) {
            const t = tops()[tooth];
            const dx = t.x - p.pos.x, dz = t.z - p.pos.z, d = Math.hypot(dx, dz);
            if (!on && p.mode === 'ground' && Math.abs(p.pos.y - t.y) < 0.15 && d < 0.7) on = true;
            if (on && t.y >= (Lg.off ?? 99)) break;
            if (!on) tick({ ...(p.mode === 'air' ? this.airSteer(t.x, t.z, 0, 0, 4, 6) : this.stick(dx, dz, 1)), run: false, jump: n < (Lg.hold ?? 40) });
            else tick(d > 0.12 ? { ...this.stick(dx, dz, Math.min(1, d * 1.5)), run: false } : {});
          }
          // abspringen zum Ziel: erst auf dem Zahn Anlauf nehmen (Richtung Ziel), dann springen
          let j = 0;
          const run0 = Lg.runup ?? 9;
          for (; j < 400 && !p.dead; j++, k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (j > run0 + 10 && p.mode === 'ground') break;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 8) : this.stick(dx, dz, 1)), run: false, jump: j >= run0 && j < run0 + 30 });
          }
          log.push(['zahnrad', Lg.gear, tooth, on, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) log.push(['FEHLER: Zahn nicht erreicht', Lg.gear]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen: darunter hüpfen, zurücktreten, auf den Block springen
        if (Lg.grab) {
          const [bx, bz] = Lg.grab;
          const back = Lg.back ?? [bx, bz + 2.2];
          const goTo = (x, z, r = 0.2) => { for (let n = 0; n < 400 && !p.dead; n++) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz); if (d < r && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); } };
          const pw0 = p.power;
          goTo(bx, bz);
          for (let k = 0; k < 90 && p.hSpeed() > 0.2; k++) tick({});
          for (let k = 0; k < 20; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          for (let k = 0; k < 60; k++) tick({});
          let tries = 0;
          for (; tries < 4 && p.power === pw0 && !p.dead; tries++) {
            goTo(back[0], back[1]);
            for (let k = 0; k < 40; k++) tick({});
            for (let k = 0; k < 240 && !p.dead; k++) {
              const dx = bx - p.pos.x, dz = bz - p.pos.z;
              if (k > 10 && p.mode === 'ground') break;
              tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3, 4) : this.stick(dx, dz, 0.5)), jump: k < 40, run: false });
            }
            for (let k = 0; k < 30; k++) tick({});
          }
          log.push(['power', Lg.grab.join(','), p.power, tries]);
          if (p.power === pw0) log.push(['FEHLER: Power-up nicht geholt', Lg.grab]);
          // vom Block herunter (nach back)
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ mit dem Krallen-Anzug an einer Wand hinauf: zur Wand springen und dagegen drücken
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let k = 0, top = false;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.pos.y > (Lg.top ?? 99) - 0.1 && p.mode === 'ground') { top = true; break; }
            if (p.mode === 'wall') { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
            tick({ ...(p.mode === 'air' ? this.stick(dx, dz, 1) : this.stick(dx, dz, 1)), run: false, jump: p.mode === 'ground' ? d < (Lg.jumpAt ?? 1.6) : p.vel.y > 0 });
          }
          // auf der Oberseite zur Mitte
          if (Lg.then) for (let n = 0; n < 300 && !p.dead; n++, k++) { const dx = Lg.then[0] - p.pos.x, dz = Lg.then[1] - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.3 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d))), run: false }); }
          log.push(['klettern', `${Lg.climb}`, top, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!top) log.push(['FEHLER: Wand nicht erklommen', Lg.climb]);
          continue;
        }
        // ------------------------------------------------ Sturz (Ursache die): Neustart abwarten (gleiches Level, Kontrollpunkt)
        if (Lg.die) {
          p.die(Lg.die);
          let k = 0;
          for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), !!p.riding]);
          continue;
        }
        // ------------------------------------------------ 8-2 Pflaume: am Steg zum wartenden Blatt laufen (Aufsteigen)
        if (Lg.mount) {
          let k = 0;
          for (; k < 1500 && !p.riding && !p.dead; k++) {
            const r = p.raftPos, dx = r.x - p.pos.x, dz = r.z - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: false });
          }
          for (let q = 0; q < 10; q++) tick({});
          log.push(['aufgestiegen', !!p.riding, k, +p.pos.z.toFixed(2)]);
          if (!p.riding) { log.push(['FEHLER: nicht aufgestiegen']); break; }
          continue;
        }
        // ------------------------------------------------ 8-2 Pflaume: Autopilot im Sandstrom (Seitenlage lat bzw. [[z, lat], …]) bis z
        if (Lg.pflaume) {
          const ch = L.river.channel(Lg.pflaume);
          const latAt = (z) => {
            const t = Lg.lat;
            if (!Array.isArray(t)) return t ?? 0;
            for (let i = 0; i < t.length - 1; i++) { const a = t[i], b = t[i + 1]; if (z <= a[0] && z >= b[0]) return a[1] + (b[1] - a[1]) * ((a[0] - z) / (a[0] - b[0])); }
            return z > t[0][0] ? t[0][1] : t[t.length - 1][1];
          };
          let k = 0;
          for (; k < (Lg.max ?? 20000) && p.riding && !p.dead && p.pos.z > Lg.z; k++) {
            const q = ch.nearest(p.pos.x, p.pos.z, {});
            const f = L.river.sample(p.pos.x, p.pos.z, {});
            tick({ ...this.rideStick(f, Lg.along ?? 0, Math.max(-1, Math.min(1, (latAt(p.pos.z) - q.lat) * 0.8))), jump: !!Lg.hold });
          }
          // Strand: absteigen abwarten
          if (Lg.beach) for (let q = 0; q < 600 && (p.riding || p.mode !== 'ground') && !p.dead; q++, k++) {
            const f = L.river.sample(p.pos.x, p.pos.z, {});
            tick(p.riding ? this.rideStick(f, 0.5, 0) : {});
          }
          log.push(['ritt', Lg.pflaume, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), !!p.riding, p.mode]);
          if (p.dead) log.push(['FEHLER: im Ritt gestorben', p.deathCause]);
          continue;
        }
        // ------------------------------------------------ 8-2 Stern-Sandflosser: zur nächsten Auftauchstelle, kurz davor hüpfen, beim Auftauchen draufspringen
        if (Lg.flosser) {
          const e = L.entities.find((x) => x.spec?.id === Lg.flosser);
          const LAND = 0.25, lead = Lg.lead ?? 0.5, lag = Lg.lag ?? 0.07;
          let k = 0, hold = 0, hops = 0;
          const plan = (f) => {
            let px, pz, t;
            if (e.state === 'warn') { px = e.pos.x; pz = e.pos.z; t = e.warnT - e.stateT; }
            else if (e.state === 'swim') { px = e.pos.x; pz = e.pos.z; t = Math.max(0, e.swimTime - e.clock) + e.warnT; }
            else if (e.state === 'land') { px = e.pos.x; pz = e.pos.z; t = (LAND - e.stateT) + e.swimTime + e.warnT; }
            else if (e.state === 'jump') { px = e.jump.bx; pz = e.jump.bz; t = (e.jump.T - e.stateT) + LAND + e.swimTime + e.warnT; }
            else return null;
            for (let n = 0; n < 6; n++) {
              const odd = n % 2 === 1;
              const x = odd ? 2 * e.home.x - px : px, z = odd ? 2 * e.home.z - pz : pz, tt = t + n * e.every;
              const dA = (x - p.pos.x) * f.dx + (z - p.pos.z) * f.dz;
              const v = dA / (tt + lag);
              if (v >= f.speed * 0.72 && v <= f.speed * 1.3) return { x, z, t: tt, dA, v, n };
            }
            return { x: px, z: pz, t, dA: 0, v: f.speed * 0.65, n: -1 };
          };
          for (; k < (Lg.max ?? 4000) && p.riding && !p.dead && !e.defeated; k++) {
            const f = L.river.sample(p.pos.x, p.pos.z, {});
            const pl = plan(f);
            if (!pl) { tick({}); continue; }
            const rx = -f.dz, rz = f.dx;
            const latErr = (pl.x - p.pos.x) * rx + (pl.z - p.pos.z) * rz;
            const va = p.vel.x * f.dx + p.vel.z * f.dz;
            const along = pl.n < 0 ? -1 : Math.max(-1, Math.min(1, (pl.v / f.speed - 1) / 0.35 + (pl.v - va) * 0.6));
            if (hold > 0) hold--;
            if (pl.n === 0 && p.mode === 'ground' && pl.t <= lead && pl.t > lead - 0.06 && Math.abs(pl.dA) < 3) { hold = 40; hops++; }
            tick({ ...this.rideStick(f, along, Math.max(-1, Math.min(1, latErr * 0.9))), jump: hold > 0 });
          }
          log.push(['flosser', Lg.flosser, e.defeated, hops, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!e.defeated) log.push(['FEHLER: Sandflosser nicht besiegt', Lg.flosser]);
          continue;
        }
        // ------------------------------------------------ 8-2 Flatterkäfer: Rampe auf Seitenlage lat, auf der Rampe springen, in der Luft zum Käfer lenken
        if (Lg.kaefer) {
          const e = L.entities.find((x) => x.spec?.id === Lg.kaefer);
          const ch = L.river.channel(Lg.ch ?? 'main');
          let k = 0, air = false, steer = Lg.steer !== false;
          for (; k < (Lg.max ?? 1500) && p.riding && !p.dead && e.alive && !e.defeated && e.state === 'move'; k++) {
            const f = L.river.sample(p.pos.x, p.pos.z, {});
            if (!air && p.mode === 'ground') {
              const q = ch.nearest(p.pos.x, p.pos.z, {});
              tick({ ...this.rideStick(f, Lg.along ?? 0, Math.max(-1, Math.min(1, ((Lg.lat ?? -1) - q.lat) * 0.9))), jump: !!p.onRamp && p.pos.z < (Lg.at ?? 0) });
              continue;
            }
            air = true;
            if (p.mode === 'ground') break;
            const rx = -f.dz, rz = f.dx;
            const dL = (e.pos.x - p.pos.x) * rx + (e.pos.z - p.pos.z) * rz;
            tick({ ...this.rideStick(f, 0, steer ? Math.max(-1, Math.min(1, dL * 1.6)) : 0), jump: true });
          }
          for (let q = 0; q < 240 && p.mode !== 'ground' && !p.dead; q++) tick({});
          log.push(['käfer', Lg.kaefer, !!e.defeated || e.state !== 'move', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ 8-2 treibenden Stern im Sandstrom einholen (bremsen/beschleunigen, quer lenken)
        if (Lg.rideStar !== undefined) {
          const idx = Lg.rideStar;
          const got = () => !!L.runtime.stars[idx];
          let k = 0;
          for (; k < (Lg.max ?? 2400) && !got() && p.riding && !p.dead; k++) {
            const f = L.river.sample(p.pos.x, p.pos.z, {});
            const s = L.entities.find((x) => x.kind === 'star' && x.index === idx && x.alive && !x.removed && !x.hidden && x.touch !== false);
            if (!s) { tick(this.rideStick(f, Lg.along ?? 0, 0)); continue; }
            const rx = -f.dz, rz = f.dx;
            const dA = (s.pos.x - p.pos.x) * f.dx + (s.pos.z - p.pos.z) * f.dz, dL = (s.pos.x - p.pos.x) * rx + (s.pos.z - p.pos.z) * rz;
            tick({ ...this.rideStick(f, Math.max(-1, Math.min(1, dA * 0.8)), Math.max(-1, Math.min(1, dL * 0.9))), jump: s.pos.y - p.pos.y > 1.1 && Math.hypot(dA, dL) < 1.6 && p.mode === 'ground' });
          }
          log.push(['stern-ritt', idx, got(), k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ senkrecht neben einem Block hochspringen, erst über seiner Oberkante hinüberlenken
        if (Lg.upOnto) {
          const [tx, tz, top] = Lg.upOnto;
          for (let q = 0; q < 120 && (p.mode !== 'ground' || p.hSpeed() > 0.08); q++) tick({});
          let k = 0, air = false;
          for (; k < 300 && !p.dead; k++) {
            if (air && p.mode === 'ground') break;
            if (p.mode === 'air') air = true;
            const over = p.pos.y > top + 0.15, dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(over ? this.airSteer(tx, tz, 0, 0, 4, 5) : { x: 0, y: 0 }), jump: k < 40 });
          }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['hinauf', `${Lg.upOnto}`, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (p.pos.y < top - 0.2) log.push(['FEHLER: nicht oben', Lg.upOnto]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.keys = L.keys?.tor?.n ?? 0;
      mech.lives = L.runtime.save?.lives;
      mech.lit = L.entities.filter((e) => e.kind === 'fackelschale' && e.lit).length;
      mech.weg1 = wegDa('s1');
      mech.laengs = L.named.get('laengsblock')?.shown === true;
      mech.mulde = L.named.get('mulde')?.done === true;
      // 8-2: im Ritt gerammte Sandfiguren, Schubfeld-Treffer
      mech.statues = L.entities.filter((e) => e.kind === 'baron_sandstatue' && e.broken && e.by === 'ritt').length;
      mech.skulpturen = L.entities.filter((e) => e.kind === 'pilzling_sandskulptur' && e.broken).length;
      mech.schub = [1, 2, 3, 4, 5].reduce((a, i) => a + (L.named.get(`schub${i}`)?.hits ?? 0), 0);
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt (Name der nächsten benannten Hülle bzw. Entitäts-Art): Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
      const acc = new Map();
      const orig = r.renderBufferDirect;
      r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
        const t0 = r.info.render.triangles;
        orig.call(this, camera, scene, geometry, material, object, group);
        const key = `${scene ? '' : 'S:'}${label(object)}`;
        const a = acc.get(key) ?? { calls: 0, tris: 0 };
        a.calls++; a.tris += r.info.render.triangles - t0;
        acc.set(key, a);
      };
      const f0 = v.frame;
      const wait = () => {
        if (v.frame < f0 + 1) { requestAnimationFrame(wait); return; }
        r.renderBufferDirect = orig;
        res([...acc.entries()].map(([k, a]) => [k, a.calls, a.tris]).sort((x, y) => y[1] - x[1] || y[2] - x[2]).slice(0, 40));
      };
      requestAnimationFrame(wait);
    }),
    arch: () => c.state().archetype,
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    /** Gegner e mit echter Eingabe anlaufen und draufspringen (in der Luft auf ihn lenken). → { ok, steps } */
    jumpOn(e, o = {}) {
      const p = P();
      let n = 0;
      const done = o.until ?? ((x) => x.defeated || x.removed || !x.alive);
      for (; n < (o.max ?? 2400) && !done(e) && !p.dead; n++) {
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        let inp;
        if (p.mode === 'air') {
          const vx = dx * 4 + (e.vel?.x ?? 0), vz = dz * 4 + (e.vel?.z ?? 0), ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
          inp = { ...(el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : {}), jump: p.vel.y > 0 };
        } else {
          const jump = d < (o.at ?? 2.0) && Math.abs(e.pos.y - p.pos.y) < 1.2;
          const high = e.pos.y - p.pos.y > 1.2 && d < 2.6;
          inp = { ...this.stick(dx, dz, 1), run: d > 3, jump: jump || high };
        }
        if (o.safe) p.invuln = Math.max(p.invuln, 3);
        c.setInput(inp); c.step(1);
      }
      c.setInput({}); c.step(3);
      return { ok: done(e), steps: n };
    },
    /** Arena-Kampf gegen den Lavafelsen-König mit echter Eingabe: Brocken betäuben, aufheben, werfen; rollt er heran, ausweichen. */
    bossFight(id, o = {}) {
      const p = P(), b = L.named.get(id), log = [], hits = [];
      let throws = 0;
      const t0 = L.time;
      let maxFish = 0, fishJumps = 0;
      const fishNow = () => L.entities.filter((e) => e.kind === 'platschfisch' && !e.removed && e.alive && !e.isSource);
      const tick = (inp) => {
        p.invuln = Math.max(p.invuln, 5); c.setInput(inp); c.step(1);
        const f = fishNow(); maxFish = Math.max(maxFish, f.length); fishJumps = Math.max(fishJumps, f.reduce((a, e) => a + (e.jumps ?? 0), 0));
      };
      const dist = (e) => Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      const brocken = () => L.entities.filter((e) => e.kind === 'lavabrocken' && !e.removed && !e.defeated && e.alive && e.owner === b);
      const danger = () => (b.state === 'roll' && dist(b) < 5) || (b.state === 'spin' && dist(b) < 3.2);
      const dodge = () => {
        const l = Math.hypot(b.vel.x, b.vel.z) || 1;
        let sx = -b.vel.z / l, sz = b.vel.x / l;
        const rx = p.pos.x - b.pos.x, rz = p.pos.z - b.pos.z;
        if (b.state === 'spin' || l < 0.5) { sx = rx; sz = rz; } else if (sx * rx + sz * rz < 0) { sx = -sx; sz = -sz; }
        const pr = Math.hypot(p.pos.x, p.pos.z + 0.6);
        if (pr > 8.2) { sx = sx * 0.3 - p.pos.x / pr; sz = sz * 0.3 - (p.pos.z + 0.6) / pr; }
        tick({ ...this.stick(sx, sz, 1), run: true });
      };
      for (let i = 0; i < 900 && b.state === 'wait'; i++) tick({ ...this.stick(-p.pos.x, -1 - p.pos.z, 0.7), run: false });
      const fighting = () => b.state !== 'gone' && b.state !== 'defeated' && !p.dead && L.runtime.status === 'play';
      for (let guard = 0; guard < 40 && fighting(); guard++) {
        if (o.stopAfterHits && hits.length >= o.stopAfterHits) break;
        // 1) einen Brocken am Boden betäuben (draufspringen) und aufheben
        if (!p.holding) {
          let br = null;
          for (let i = 0; i < 1800 && !br && fighting(); i++) {
            br = brocken().filter((e) => e.grounded && e.state !== 'air' && Math.hypot(e.pos.x, e.pos.z + 0.6) < 9.5).sort((a, q) => dist(a) - dist(q))[0] ?? null;
            if (!br) { if (danger()) dodge(); else tick({}); }
          }
          if (!br) { log.push(['kein Brocken', b.state]); continue; }
          for (let i = 0; i < 700 && br.state !== 'stunned' && !br.removed && fighting(); i++) {
            if (danger() && p.mode === 'ground') { dodge(); continue; }
            const dx = br.pos.x - p.pos.x, dz = br.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'air') {
              const vx = dx * 4 + (br.vel?.x ?? 0), vz = dz * 4 + (br.vel?.z ?? 0), ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
              tick({ ...(el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : {}), jump: p.vel.y > 0 });
            } else tick({ ...this.stick(dx, dz, 1), run: d > 3, jump: d < 1.9 });
          }
          if (br.removed || br.state !== 'stunned') { log.push(['nicht betäubt', br.state]); continue; }
          let dbg = null;
          for (let i = 0; i < 500 && p.holding !== br && !br.removed && br.state === 'stunned' && fighting(); i++) {
            if (p.mode !== 'ground') {
              // nach dem Abprall neben dem Brocken landen (zur Arenamitte hin), nicht wieder auf ihm
              let ax = -br.pos.x, az = -0.6 - br.pos.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
              tick(this.airSteer(br.pos.x + ax * 1.2, br.pos.z + az * 1.2, 0, 0, 4, 5));
              continue;
            }
            if (danger()) { dodge(); continue; }
            const dx = br.pos.x - p.pos.x, dz = br.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            dbg = [+d.toFixed(2), +dot.toFixed(2), p.state, br.carryable, br.canCarry?.(p), +(br.pos.y - p.pos.y).toFixed(2)];
            if (d > 0.85) { tick({ ...this.stick(dx, dz, Math.min(1, d / 1.5 + 0.2)), run: false }); continue; }
            if (dot < 0.9) { tick({ ...this.stick(dx, dz, 0.15), run: false }); continue; }
            tick({ action: i % 8 === 0 });
          }
          if (p.holding !== br) { log.push(['nicht aufgehoben', br.state, dbg]); continue; }
          log.push(['Brocken', +(L.time - t0).toFixed(1)]);
        }
        // 2) werfen, sobald der König nicht rollt/wirbelt: auf 3–5 m heran, zielen, Aktion
        const hp0 = b.hp;
        let thrown = false;
        for (let i = 0; i < 3000 && p.holding && fighting(); i++) {
          if (!['summon', 'rest'].includes(b.state)) { if (danger()) dodge(); else tick({}); continue; }
          const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          if (d > 5) { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
          if (d < 3) { tick({ ...this.stick(-dx, -dz, 1), run: false }); continue; }
          const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
          if (dot < 0.97) { tick({ ...this.stick(dx, dz, 0.12), run: false }); continue; }
          tick({ action: true }); throws++; thrown = true; tick({});
        }
        for (let i = 0; i < 160 && b.hp === hp0 && thrown; i++) tick({});
        if (b.hp < hp0) hits.push(+(L.time - t0).toFixed(1));
        log.push(['Wurf', throws, b.hp, b.state]);
      }
      // 3) Sieg: Stern abwarten und einsammeln
      if (!o.stopAfterHits) {
        for (let i = 0; i < 900 && !this.arch().starTouch && !p.dead; i++) tick({});
        const star = L.entities.find((x) => x.kind === 'star' && x.alive);
        if (star) this.drive([{ to: [star.pos.x, star.pos.z], within: 0.2, run: true, max: 900 }], {});
        for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
      }
      c.setInput({});
      return { maxFish, fishJumps, fishAfter: fishNow().length, gone: b.state === 'gone' || b.hp === 0, hits, throws, time: +(L.time - t0).toFixed(1), got: !!L.runtime.stars[0], finished: !!c.finished,
        save: this.save().levels?.[L.id] ?? null, hurts: p.hurtTries ?? 0, log };
    },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => cond(k),
  };
  window.__w8 = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
    try {
      await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
    } catch {
      console.log(`Level ${id} startet nicht. Konsole:`);
      for (const x of errors) console.log('  ', x);
      return false;
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w8[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w8a_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w8.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); continue; }
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, slots: d.starSlots ?? null }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const starsOk = R.meta.arena ? meta.slots === 1 : (meta.stars === R.meta.stars && kinds.stamp === 1);
    check(`${id}: ${R.meta.stars} Stern(e)${R.meta.arena ? '' : ', Stempel'}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      starsOk && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    const per = [];
    for (const pt of sweepTrack) {
      await W('place', pt, { settle: 6 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Arena 7-A: Kampf gegen den Glutkönig mit echter Eingabe, Tod setzt zurück, Zeitlimit
  if (R.meta.arena && PARTS.has('arena') && !ONLY) {
    for (const hero of HEROES) {
      await load(id);
      await W('place', R.start, { hero, settle: 2 });
      const r = await W('bossFight', R.meta.boss, {});
      console.log(`  ${hero} Kampf: ${JSON.stringify({ ...r, log: undefined })}`);
      if (process.env.VERBOSE) for (const l of r.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${hero} besiegt den Glutkönig mit drei geworfenen Lavabrocken (${r.throws} Würfe, Treffer ${r.hits.join('/')}, ${r.time} s)`, r.gone && r.hits.length === 3);
      check(`${id}: ${hero} – Platschfische springen rings um den Kessel (bis zu ${r.maxFish} gleichzeitig, ≥ ${r.fishJumps} Sprünge; nach dem Sieg ${r.fishAfter})`, r.maxFish >= 2 && r.fishAfter === 0);
      check(`${id}: ${hero} Stern in der Mitte, Ziel nach ${r.time} s (< 200 s), gespeichert`, r.got && r.finished && r.time < 200 && r.save?.done === true);
      if (hero === HEROES[0]) { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}w8a_${id}_ergebnis.png` }); }
    }
    // Nur geworfene Lavabrocken treffen: Draufspringen und Feuerbälle zählen nicht
    await load(id);
    let r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w8, p = c.player, b = L.named.get('koenig');
      W.place([0, 2, 6], { power: 'funken' });
      p.invuln = 1e9;
      for (let i = 0; i < 600 && b.state === 'wait'; i++) { c.setInput(W.stick(0, -1, 0.6)); c.step(1); }
      c.setInput({});
      for (let i = 0; i < 1200 && b.state !== 'rest'; i++) c.step(1);
      const hp0 = b.hp;
      // Feuerbälle auf den König
      for (let i = 0; i < 240; i++) { const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z; c.setInput({ ...W.stick(dx, dz, i % 30 < 3 ? 0.2 : 0), action: i % 30 === 5 }); c.step(1); }
      const afterFire = b.hp;
      for (let i = 0; i < 1200 && b.state !== 'rest'; i++) c.step(1);
      const j = W.jumpOn(b, { safe: true, max: 400, until: () => false });
      return { hp0, afterFire, afterJump: b.hp, state: b.state, j: j.steps };
    });
    check(`${id}: Feuerbälle und Draufspringen schaden dem König nicht (${r.hp0} → ${r.afterFire} → ${r.afterJump})`, r.hp0 === 3 && r.afterFire === 3 && r.afterJump === 3);
    // Tod setzt den Kampf zurück
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w8, p = c.player, b = L.named.get('koenig');
      W.place([0, 2, 9.4], {});
      const res = W.bossFight('koenig', { stopAfterHits: 1 });
      const before = { hp: b.hp, state: b.state };
      p.invuln = 0;
      p.die('fall');
      for (let i = 0; i < 600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(30);
      return { hits: res.hits.length, before, hp: b.hp, state: b.state, brocken: L.entities.filter((e) => e.kind === 'lavabrocken' && !e.removed).length, left: W.arch().left };
    });
    check(`${id}: Tod setzt den Kampf zurück (vorher ${r.before.hp}/3, danach ${r.hp}/3, ${r.state}, Brocken ${r.brocken})`, r.hits === 1 && r.before.hp === 2 && r.hp === 3 && r.state === 'wait' && r.brocken === 0 && r.left === 1);
    // Zeitlimit 200 s: Zeit um → Tod
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      const h = p.hurt; p.hurt = () => false;
      let dead = false, cause = null;
      for (let i = 0; i < 201 * 120 && !dead; i++) { c.step(1); if (p.dead) { dead = true; cause = p.deathCause; } }
      p.hurt = h;
      return { dead, cause, t: +L.time.toFixed(1) };
    });
    check(`${id}: nach 200 s ist die Zeit um (${r.cause} bei ${r.t} s)`, r.dead && r.cause === 'time');
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);

