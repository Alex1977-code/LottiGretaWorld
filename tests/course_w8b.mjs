// Welt 8, Level 8-Zug „Brummbär-Express im Abendrot“ (Autoscroller + Boss: Fahrt-Illusion, Hackvogel-Wagen mit Schubsern,
// Wasserbecken mit Wutkaulquappen, Mini-Pilzling-Salon mit Hebeblock, Hammer-Werfer vor der Bossröhre, Schattenläuferin 2),
// 8-4 „Glimmstege der Mitternachtsfestung“ (unsichtbare Leuchtstege, Stampfsteine, Knochenflieger, Stachelwalzen,
// Kanonengasse) und 8-5 „Flutverlies der Brummbär-Festung“ (Steigbecken, Wasserkörper, Stachelblöcke, Pflaume-Ritt,
// Fallblock-Brücke, Stachelwände, Wolkenkanone in den Münzhimmel):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle
// Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120
// inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w8b_<Level>_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w8b.mjs [8-Zug|8-4|8-5]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Gegenproben
// laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump,
// stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } · { chaseKind, ids } ·
// { expect: Bedingung } · { until: Bedingung } · { warp: [x, z] } (auf eine Warp-Box springen) · { stompAll: Id-Anfang } ·
// { pound: [x, z], above } (Sprung mit Stampfattacke) · { mount: [x, z] } / { ride: [[z, lat], …] } (Pflaume) ·
// { coins: [[x, z, jump?], …] } (Münzen nacheinander einsammeln) · { swimTo: [x, y, z] } (unter Wasser schwimmen)
const RX4 = 80;
const ROUTES = {
  '8-4': {
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'nightfort', music: 'course_footlight', archetype: 'parcours' },
    enemies: { stampfstein: 5, knochenflieger_gruppe: 2, kanone_turm: 3 },
    main: [
      { name: 'Stampfstein-Steg: an der Laufseite entlang', to: [-1, -3], within: 0.5 },
      { to: [-1, -14.6], within: 0.5, run: false },
      { to: [-1, -16.8], within: 0.5, run: false }, { to: [7, -16.8], within: 0.5, run: false },
      { to: [7, -32.6], within: 0.5, run: false }, { to: [-4, -32.8], within: 0.5, run: false },
      { to: [-4, -49.8], within: 0.5, run: false }, { to: [0, -50], within: 0.5, run: false },
      { name: 'Knochenflieger-Steg', to: [0, -71.8], within: 0.5, run: false }, { to: [-5, -71.8], within: 0.5, run: false },
      { to: [-5, -85.8], within: 0.5, run: false }, { to: [2, -85.8], within: 0.5, run: false },
      { to: [2, -97], within: 0.5, run: false },
      { name: 'Laternenhof (Kontrollpunkt)', to: [0, -103.5], within: 0.6 },
      { name: 'Stachelwalzen', to: [0, -112.6], within: 0.3, run: false },
      { to: [0, -121.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [0, -128.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [3, -131.2], within: 0.4, run: false }, { to: [3, -135.6], within: 0.3, run: false },
      { to: [3, -144.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [3, -154.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [3, -160.2], within: 0.4, run: false }, { to: [-1.6, -160.4], within: 0.4, run: false },
      { name: 'Kanonengasse 1 (am Rand an den Projektilköpfen vorbei)', to: [-1.6, -189], within: 0.5, run: false },
      { name: 'Zwischenhof', to: [-2.6, -193], within: 0.5, run: false }, { to: [-1.2, -199], within: 0.5, run: false },
      { name: 'Kanonengasse 2 (Suchköpfe)', to: [0, -212.8], within: 0.5 }, { to: [5, -212.8], within: 0.5, run: false },
      { to: [5, -225.8], within: 0.5 }, { to: [0, -225.8], within: 0.5, run: false }, { to: [0, -232.6], within: 0.5, run: false },
      { name: 'Warp-Box zum Zielturm', warp: [0, -235.6] },
      { expect: 'zielturm' },
      { name: 'Zielmast', to: [0, -279], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Warp-Box benutzt, Stampfsteine sind gelandet und haben den Steg aufleuchten lassen', ok: (r) => r.mech.warps === 1 && r.mech.lands >= 3 && r.mech.impacts >= 3 },
    ],
    targets: [
      { name: 'Stern 1: Sprung vom türkisen Steg zum Stern über dem Abgrund – isolierter Steg trägt', star: 0, from: [-5, 0, -76],
        legs: [{ to: [-3.8, -80], within: 0.3, run: false }, { to: [-10.4, -80], jump: 40, jumpAt: 4.0, within: 0.4, run: true }, { wait: 20 }, { expect: 'aufIso' }, { star: 0 }], shot: 'stern1' },
      { name: 'Stern 2: Sternring am Laternenhof – acht Sternmünzen, ein Teil auf der unsichtbaren Schleife', star: 1, from: [0, 0, -103.5],
        legs: [{ to: [-2, -98.8], within: 0.4, run: false }, { to: [-2, -102.6], within: 0.4, run: false },
          { coins: [[-2.6, -106], [0, -104, 30], [2.6, -101], [5, -100.5], [6.6, -102.6], [6.6, -105.6], [5, -107.5], [2.6, -108]] }, { wait: 40 }, { star: 1 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne alle Sternmünzen (Zeit läuft ab)', star: 1, expectNot: true, from: [0, 0, -103.5], heroes: ['lotti'],
        legs: [{ to: [-2, -98.8], within: 0.4, run: false }, { to: [-2, -102.6], within: 0.4, run: false }, { coins: [[-2.6, -106], [2.6, -101]] }, { wait: 120 * 16 }] },
      { name: 'Stempel: unsichtbare Treppe rechts vom Zwischenhof hinauf', stamp: true, from: [3, 0, -195],
        legs: [{ to: [4.6, -195], within: 0.3, run: false }, ...[7.2, 9.2, 11.2, 13.2, 15.2].map((x) => ({ to: [x, -195], jump: 26, within: 0.35, run: false }))], shot: 'stempel' },
      { name: 'Stern 3: Rätselbox hinter dem Stempel → Stampfstein-Kammer, an den Stampfsteinen vorbei', star: 2, from: [15.2, 3.75, -195],
        legs: [{ to: [17, -195], within: 0.3, run: false }, { warp: [18.8, -195] }, { expect: 'kammer' },
          { to: [RX4 - 1, -189.6], within: 0.4, run: false }, { to: [RX4 - 1, -198.8], within: 0.4, run: false }, { to: [RX4 + 5.9, -198.8], within: 0.4, run: false },
          { to: [RX4 + 5.9, -208.5], within: 0.4, run: false }, { star: 2 }], shot: 'stern3' },
    ],
    extra: [
      { name: 'Leuchtsteg: unsichtbar abseits der Figur, Stampfstein-Aufschlag lässt ihn weit voraus aufleuchten', from: [-1, 0, -3], heroes: ['lotti'],
        legs: [{ probe: 'vorher' }, { to: [-1, -8.8], within: 0.3, run: false }, { wait: 130 }, { probe: 'nachher' }],
        mech: (r) => r.mech.probe.vorher < 0.1 && r.mech.probe.nachher > 0.5, mechText: (r) => `Steg 7 m voraus: vorher ${r.mech.probe.vorher}, nach dem Aufschlag ${r.mech.probe.nachher}` },
      { name: 'Leuchtsteg: Stampfattacke lässt ihn aufleuchten', from: [0, 0, -60], heroes: ['lotti'],
        legs: [{ probe2: 'vorher' }, { pound: [0, -60.5] }, { wait: 10 }, { probe2: 'nachher' }],
        mech: (r) => r.mech.probe.vorher < 0.1 && r.mech.probe.nachher > 0.5, mechText: (r) => `Steg 6 m entfernt: vorher ${r.mech.probe.vorher}, nachher ${r.mech.probe.nachher}` },
      { name: 'Extraleben: unsichtbarer Block hinten am Burgbalkon', from: [3.6, 0, 5.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [3.6, 7.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Funkenblüte aus dem ?-Block am Start', from: [2.4, 0, 4.5], heroes: ['lotti'],
        legs: [{ to: [2.4, 2.5], within: 0.2, run: false }, { hop: 20 }, { to: [2.4, 4.8], within: 0.3, run: false }, { to: [2.4, 2.5], jump: 40, jumpAt: 1.6, within: 0.3, run: false }, { wait: 30 }, { expect: 'funken' }] },
    ],
    shots: [
      ['start', [0, 0, 5]],
      ['stampf', [-1, 0, -8]],
      ['zickzack', [7, 0, -24]],
      ['knochen', [-5, 0, -76]],
      ['hof', [0, 0, -103.5]],
      ['walzen', [0, 0, -114]],
      ['walzen2', [3, 0, -137]],
      ['gasse1', [-1.6, 0, -175], 300],
      ['zwischenhof', [0, 0, -195]],
      ['treppe', [9, 1.35, -195]],
      ['gasse2', [0, 0, -205], 360],
      ['kammer', [RX4, 0, -188]],
      ['ziel', [0, 0, -268]],
    ],
  },
};

// 8-Zug: Wagen wie im Level (wagenreihe ab z 0 nach −Z, Kupplung 0,6 m), Drehbühne des Parallelzugs
const ZG = (() => {
  let z = 0;
  const o = {};
  for (const [id, len] of [['aussicht', 10], ['k1', 10], ['f1', 10], ['k2', 10], ['f2', 10], ['k3', 10], ['f3', 10], ['t1', 12], ['f4', 8], ['t2', 12],
    ['salon', 18], ['f5', 6], ['gepaeck', 12], ['f6', 10], ['tender', 6.5], ['lok', 8.6]]) { o[id] = { z0: z, z1: z - len, cz: z - len / 2 }; z -= len + 0.6; }
  return o;
})();
const ZD = 1.4, ZR = 3.75, ZGD = 4.4, BX = 120, BY = 1.6, BZ = -150, BR = 9.2;
const HZ8 = ZG.salon.z0 - 11, LZ8 = ZG.gepaeck.z0 - 1.8, PZ8 = ZG.f6.z1 + 1.6;
ROUTES['8-Zug'] = {
  start: [3.6, 1.4, -1.0],
  meta: { stars: 3, time: 400, theme: 'train', music: 'course_baronexpress', archetype: 'autoscroller' },
  enemies: { hackvogel: 4, schubser: 3, wutkaulquappe: 4, pilzling: 5, feuer_werfer: 2, schattenlaeuferin: 1 },
  named: ['hebeblock', 'deckel', 'p_boss', 'p_buehne', 'schatten', 'warp_sieg'],
  shotWin: true,
  maxDefault: 4800,
  main: [
    { name: 'Einsteigen: auf den Balkon', to: [0.5, -1.0], within: 0.35, run: false }, { until: 'abfahrt', max: 600 },
    { name: 'Kofferstapel aufs Dach', to: [-1.0, -0.8], jump: 24, within: 0.3, run: false }, { to: [-0.4, -3.6], jump: 40, within: 0.5, run: false },
    { expect: 'aufDach' },
    { name: 'Stern 1 vorn auf dem Aussichtswagen', to: [0, -9.4], within: 0.4, run: false },
    { name: 'Hackvogel k1 rechts passieren', to: [1.15, -11.6], within: 0.4, run: false }, { to: [1.15, -20.2], within: 0.4, run: false },
    { name: 'f1: über die Steinblöcke', to: [1.0, -22.0], within: 0.5, run: false }, { to: [1.0, -26.8], jump: 40, jumpAt: 2.8, within: 0.5, run: false },
    { to: [0.1, -28.4], within: 0.35, run: false },
    { name: 'k2: aufs Dach', to: [0.6, -34.0], jump: 40, jumpAt: 3.6, within: 0.5, run: false }, { expect: 'aufDach' },
    { to: [0.85, -41.2], within: 0.4, run: false },
    { name: 'Gitterwagen f2: über die Schubser', dodge: ['sb1', 'sb2'], to: [0, -51.4], within: 0.5 },
    { name: 'k3: aufs Dach', to: [-0.85, -55.8], jump: 40, jumpAt: 3.6, within: 0.5, run: false }, { expect: 'aufDach' },
    { to: [-0.85, -62.4], within: 0.4, run: false },
    { name: 'Gitterwagen f3', dodge: ['sb3'], to: [0, -70.4], within: 0.5 },
    { name: 'Becken t1: über die Schwimmkisten', to: [0.85, ZG.t1.z0 - 3.4], jump: 40, jumpAt: 5.0, within: 0.35, run: false },
    { to: [-0.85, ZG.t1.z0 - 7.9], jump: 40, jumpAt: 4.8, within: 0.35, run: false },
    { to: [0.3, ZG.f4.z0 - 1.4], jump: 40, jumpAt: 6.4, within: 0.5, run: false },
    { name: 'Kontrollwagen', to: [0.9, -88.8], within: 0.4, run: false }, { to: [0.4, -93.4], within: 0.4, run: false },
    { name: 'Becken t2: über die Schwimmkisten', to: [-0.85, ZG.t2.z0 - 3.2], jump: 40, jumpAt: 5.4, within: 0.35, run: false },
    { to: [0.85, ZG.t2.z0 - 7.2], jump: 40, jumpAt: 4.6, within: 0.35, run: false },
    { name: 'zum Salon', to: [0, ZG.t2.z1 - 0.3], jump: 30, jumpAt: 5.2, within: 0.5, run: false },
    { name: 'Salon', to: [0, -110.0], within: 0.5, run: false }, { to: [0, -126.4], within: 0.5, run: false },
    { name: 'Kistentreppe', to: [-0.9, -127.3], within: 0.3, run: false }, { to: [-0.9, -128.5], jump: 24, within: 0.35, run: false },
    { to: [-0.9, -130.1], jump: 24, within: 0.35, run: false }, { to: [0.6, -134.8], jump: 40, within: 0.5, run: false },
    { name: 'Gepäckwagen-Dach', to: [0.6, -144.6], within: 0.4, run: false }, { to: [0.6, -146.8], within: 0.4, run: false },
    { name: 'Hammer-Werfer', stompAll: 'hammer' },
    { name: 'Halt abwarten', until: 'halt', max: 6000 },
    { name: 'Bossröhre', to: [0, PZ8], jump: 30, within: 0.3, run: false }, { crouch: 12 }, { expect: 'buehne' },
    { name: 'Drehbühne', to: [BX, BZ + 3], within: 0.6, run: false },
    { name: 'Schattenläuferin 2', boss: 'schatten', center: [BX, BZ + 2] },
    { name: 'Warp-Box zum Zielwagen', warp: [BX, BZ] }, { expect: 'zielwagen' },
    { name: 'Zielmast', to: [BX, -167.2], within: 0.2 },
  ],
  routeChecks: [
    { name: 'Stern 1 auf dem Dach eingesammelt, Bossröhre benutzt, Schattenläuferin mit drei Sprüngen aufs Original besiegt, Warp-Box zum Zielwagen',
      ok: (r) => r.rt.stars?.[0] === true && r.mech.pipes >= 1 && r.mech.bossHits === 3 && r.mech.warps === 1 },
  ],
  targets: [
    { name: 'Stern 1: gleich nach dem Einsteigen über den Kofferstapel aufs Dach des Aussichtswagens', star: 0, from: [0.5, ZD, -1.0],
      legs: [{ until: 'abfahrt', max: 600 }, { to: [-1.0, -0.8], jump: 24, within: 0.3, run: false }, { to: [-0.4, -3.6], jump: 40, within: 0.5, run: false },
        { to: [0, -8.6], within: 0.4, run: false }, { star: 0 }], shot: 'stern1' },
    { name: 'Stern 2: Sternring auf dem Kontrollwagen – acht Sternmünzen bis übers zweite Becken', star: 1, from: [0.4, ZD, ZG.f4.z0 - 4], place: { win: 'auto' },
      legs: [{ to: [-0.8, ZG.f4.z0 - 5.6], within: 0.3, run: false },
        { coins: [[-0.8, ZG.f4.z0 - 7.2], [0, ZG.t2.z0 - 0.15, 1]] },
        { to: [0.7, ZG.t2.z0 - 2.2], within: 0.35, run: false, swimJump: false, land: false }, { to: [-0.7, ZG.t2.z0 - 4.2], within: 0.35, run: false, swimJump: false },
        { to: [0, ZG.t2.z0 - 6.2], within: 0.35, run: false, swimJump: false }, { to: [0.7, ZG.t2.z0 - 8.2], within: 0.35, run: false, swimJump: false },
        { to: [-0.5, ZG.t2.z0 - 10.2], within: 0.35, run: false, swimJump: false },
        { leap: [0, ZG.t2.z1 + 0.15], from: [0, ZG.t2.z1 + 0.9], over: 3.6 }, { wait: 30 }, { star: 1 }], shot: 'stern2' },
    { name: 'Stern 2 nicht ohne alle Sternmünzen (Zeit läuft ab)', star: 1, expectNot: true, from: [0.4, ZD, ZG.f4.z0 - 4], place: { win: 'auto' }, heroes: ['lotti'],
      legs: [{ to: [-0.8, ZG.f4.z0 - 5.6], within: 0.3, run: false }, { wait: 120 * 15 }] },
    { name: 'Stempel: Klavier → Hebeblock, Stampfen fährt ihn durch die Deckenluke in die Glaskuppel', stamp: true, from: [0, ZD, HZ8 + 5.5], place: { win: 'auto' },
      legs: [{ to: [-1.1, HZ8 + 3.4], within: 0.3, run: false }, { to: [-1.1, HZ8 + 1.9], jump: 24, within: 0.3, run: false },
        { to: [-0.8, HZ8 + 1.4], within: 0.2, run: false }, { to: [0, HZ8], jump: 30, jumpAt: 1.7, within: 0.3, run: false },
        { pound: [0, HZ8], above: 4.3 }, { wait: 240 }], mech: (r) => r.mech.lifted === true, shot: 'stempel' },
    { name: 'Stempel nicht ohne Stampfen (Luke bleibt zu, auch beim Sprung vom Hebeblock)', stamp: true, expectNot: true, from: [0, ZD, HZ8 + 5.5], place: { win: 'auto' }, heroes: ['lotti'],
      legs: [{ to: [-1.1, HZ8 + 3.4], within: 0.3, run: false }, { to: [-1.1, HZ8 + 1.9], jump: 24, within: 0.3, run: false },
        { to: [0, HZ8], jump: 30, within: 0.3, run: false }, { hop: 40 }, { hop: 40 }, { expect: 'lukeZu' }] },
    { name: 'Stern 3: durch die goldene Luke in den Gepäckgang, am Feuer-Werfer vorbei', star: 2, from: [0.6, ZGD, ZG.gepaeck.z0 - 0.6], place: { win: 'auto' },
      legs: [{ to: [-0.8, LZ8], within: 0.3, run: false }, { until: 'gang', max: 240 }, { expect: 'gang' }, { stompAll: 'werfer_gang' },
        { star: 2 }, { name: 'durch die Vordertür hinaus', to: [0, ZG.f6.z0 - 1.0], within: 0.5, run: false }], shot: 'stern3' },
  ],
  extra: [
    { name: 'Fahrt-Illusion: der Bahnsteig fährt nach dem Einsteigen davon', from: [0.5, ZD, -1.0], heroes: ['lotti'],
      legs: [{ until: 'abfahrt', max: 600 }, { wait: 120 * 6 }, { expect: 'bahnsteigWeg' }] },
    { name: 'Becken t1 schwimmend: Münzen unter Wasser, Wutkaulquappen', from: [0, ZD, ZG.f3.z1 + 3.4], place: { win: 'auto' }, heroes: ['lotti'], expectCoins: 4,
      legs: [{ to: [0, -77.0], jump: 40, jumpAt: 5.2, within: 0.8, run: false, land: false }, { to: [0, -84.6], within: 0.6, run: false, swimJump: false },
        { leap: [0, -88.4], from: [0, -85.2], over: 3.8 }] },
    { name: 'Funkenblüte aus dem ?-Block über dem Balkon', from: [0.4, ZD, -0.4], heroes: ['lotti'],
      legs: [{ to: [0.4, -1.1], within: 0.2, run: false }, { hop: 20 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 }, { expect: 'funken' }] },
    { name: 'Hackvogel hackt die Steinblock-Ladung auf (Münzen)', from: [1.0, ZD, ZG.f1.z0 - 2.4], place: { win: 26 }, heroes: ['lotti'],
      legs: [{ wait: 120 * 4 }, { expect: 'steinAuf' }] },
    { name: 'Krallen-Anzug aus dem ?-Block im Salon', from: [0.8, ZD, ZG.salon.z0 - 4.0], place: { win: 'auto' }, heroes: ['lotti'],
      legs: [{ to: [0.8, ZG.salon.z0 - 5.0], within: 0.2, run: false }, { hop: 20 }, { wait: 40 }, { to: [-1.2, ZG.salon.z0 - 5.0], within: 0.2, run: false },
        { name: 'seitlich auf den Block, Anzug greifen', to: [0.8, ZG.salon.z0 - 5.0], jump: 40, jumpAt: 1.3, within: 0.3, run: false }, { wait: 20 }, { expect: 'krallen8' }] },
    { name: 'Bossröhre vor dem Halt verschlossen (Deckel)', from: [0, 2.4, PZ8], place: { win: 156.2 }, heroes: ['lotti'],
      legs: [{ crouch: 12 }, { expect: 'deckelZu' }], mech: (r) => r.pos[0] < 5, mechText: (r) => `x ${r.pos[0].toFixed(1)}` },
    { name: 'Extraleben: unsichtbarer Block über dem Tender (nach dem Halt)', from: [0, 3.0, ZG.tender.z0 - 1.2], place: { win: 1e9 }, heroes: ['lotti'], expectLives: 1,
      legs: [{ to: [0, ZG.tender.cz], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
  ],
  shots: [
    ['start', [3.6, 1.4, -1.0], 0, null, Math.PI],
    ['balkon', [0.4, ZD, -1.0]],
    ['k1', [1.1, ZR, ZG.k1.z0 - 2]],
    ['f1', [1.0, ZD, ZG.f1.z0 - 1]],
    ['f2', [0, ZR, ZG.k2.z1 + 1.5]],
    ['f2deck', [0, ZD, ZG.f2.z0 - 0.9]],
    ['k3', [0, ZR, ZG.k3.z0 - 2]],
    ['becken', [0, 3.4, ZG.t1.z0 - 0.15]],
    ['cp', [0.9, ZD, ZG.f4.z0 - 3]],
    ['salontuer', [0, 3.4, ZG.t2.z1 + 0.2]],
    ['salon', [0, ZD, ZG.salon.z0 - 2]],
    ['hebeblock', [-1.1, 2.6, HZ8 + 1.9]],
    ['f5', [0.3, ZD, ZG.f5.z0 - 1.0]],
    ['gepaeck', [-0.9, ZGD, ZG.gepaeck.z0 - 0.8]],
    ['gang', [0, ZD, LZ8 - 2]],
    ['roehre', [0, ZD, ZG.f6.z0 - 2]],
    ['lok', [0, 3.0, ZG.tender.cz]],
    ['buehne', [BX, BY, BZ + BR - 3]],
    ['ziel', [BX, ZD, -163]],
  ],
};

const FL5 = 1.0, HX5 = 40;
ROUTES['8-5'] = {
  start: [0, 0, 6],
  meta: { stars: 3, time: 400, theme: 'dungeon', music: 'course_dungeon', archetype: 'parcours_ride' },
  named: ['becken', 'wuerfel1', 'wuerfel2', 'wuerfel3', 'blau1', 'blau2', 'blau3', 'blau4', 'rot1', 'rot2', 'rot3', 'wand', 'bruecke', 'oben'],
  main: [
    { name: 'Flutsaal: Niedrigwasser abwarten, hinab ins Becken', to: [0, -5], within: 0.5, run: false }, { until: 'niedrig', max: 1800 },
    { to: [0, -27.4], within: 0.5, run: false, swimJump: false },
    { name: 'Hochwasser abwarten (das Wasser hebt die Heldin)', until: 'hochwasser', max: 1800 },
    { name: 'aus dem Hochwasser auf die Ausgangskante', leap: [0, -32.5], from: [0, -29.2], over: 1.15 }, { expect: 'kante' },
    { name: 'Wasserkörper 1', to: [0, -39.4], within: 0.4, run: false }, { to: [0, -43.4], jump: 30, within: 0.6, run: false, land: false },
    { name: 'Wasserkörper 2', leap: [1.5, -49.2] }, { name: 'Wasserkörper 3', leap: [-0.5, -54.8] }, { name: 'auf den Kontrollpunkt', leap: [0, -60.5] },
    { expect: 'cpHof' },
    { name: 'Kontrollpunkt', to: [0, -65], within: 0.6, run: false },
    { name: 'blaue Stachelblöcke', cross: 'blau1', z0: -73.6, z1: -79.6 }, { cross: 'blau2', z0: -80.1, z1: -85.8 },
    { cross: 'blau3', z0: -86.2, z1: -92 }, { cross: 'blau4', z0: -92.2, z1: -98.4 },
    { name: 'zum Steg', to: [0, -100.4], within: 0.4, run: false },
    { name: 'auf Pflaume', mount: [0, -106] },
    { name: 'Kanal', ride: [[-101, 0], [-114, 0], [-118, 1.3], [-124, 1.0], [-131, -0.2], [-136, -1.3], [-140, 0], [-150, 0]] },
    { name: 'Fallblock-Brücke (rennen)', to: [0, -153.2], within: 0.4, run: false }, { to: [0, -170], within: 0.6, run: true },
    { expect: 'rotHalle' },
    { name: 'rote Stachelblöcke: rechts vorbei', to: [3.6, -172], within: 0.4, run: false }, { to: [3.6, -188.3], within: 0.4, run: false },
    { to: [-3.6, -188.4], within: 0.4, run: false }, { to: [-3.6, -196.2], within: 0.4, run: false },
    { cross: 'rot3', z0: -196.6, z1: -201.4 },
    { name: 'Stachelwand-Gang', follow: 'wand', exit: [6.2, -231.2] },
    { name: 'Endsaal', to: [9, -243.6], within: 0.4, run: false }, { to: [9, -246], jump: 30, within: 0.25, run: false }, { crouch: 12 },
    { expect: 'seeufer' },
    { name: 'Zielmast', to: [0, -292], within: 0.2 },
  ],
  routeChecks: [
    { name: 'mit dem Hochwasser hinauf, drei Wasserkörper, Ritt auf Pflaume', ok: (r) => r.mech.swims >= 2 && r.mech.ride > 120 * 5 && !r.log.some((l) => l[0] === 'FEHLER: Bedingung') },
  ],
  targets: [
    { name: 'Stern 1: unsichtbare Wand an der Ausgangskante mit dem Krallen-Anzug hinauf', star: 0, from: [0, FL5, -35], place: { power: 'krallen' },
      legs: [{ climb: [6.0, -35], face: [1, 0], top: FL5 + 8 }, { to: [8.4, -35], within: 0.4, run: false }, { star: 0 }], shot: 'stern1' },
    { name: 'Stern 1 nicht ohne Krallen-Anzug (an der Wand rutscht man hinab)', star: 0, expectNot: true, from: [0, FL5, -35], heroes: ['lotti'],
      legs: [{ climb: [6.0, -35], face: [1, 0], top: FL5 + 8, max: 300, soft: true }, { wait: 60 }], mech: (r) => r.pos[1] < FL5 + 4, mechText: (r) => `y ${r.pos[1].toFixed(1)}` },
    { name: 'Stern 2: Bogenwand nach dem Ritt hinauf, über die verschwindenden Fallblöcke', star: 1, from: [0, FL5, -151.3], place: { power: 'krallen' },
      legs: [{ climb: [-5.0, -151.3], face: [-1, 0], top: FL5 + 7 }, { to: [-7.8, -152.4], within: 0.4, run: false },
        { to: [-7.8, -155], jump: 30, within: 0.35, run: false }, { to: [-7.8, -157.8], jump: 30, within: 0.35, run: false },
        { to: [-7.8, -160.6], jump: 30, within: 0.35, run: false }, { to: [-7.8, -163.4], jump: 30, within: 0.35, run: false },
        { to: [-7.8, -166.2], jump: 30, within: 0.4, run: false }, { star: 1 }], shot: 'stern2' },
    { name: 'Stempel: auf dem blauen Stachelblock mitfahren, oben links in die Nische', stamp: true, from: [3, FL5, -79.4],
      legs: [{ onBlock: 'blau2', side: 1 }, { niche: [-6.2, -83], block: 'blau2' }, { to: [-6.6, -83], within: 0.3, run: false }], shot: 'stempel' },
    { name: 'Stern 3: Wolkenkanone im Endsaal → Münzhimmel', star: 2, from: [10, FL5, -236],
      legs: [{ warp: [14, -238] }, { expect: 'himmel' }, { to: [HX5, -249.8], within: 0.3, run: false }, { to: [HX5, -256], jump: 30, jumpAt: 5.4, within: 0.4, run: false },
        { to: [HX5 + 1, -257.2], within: 0.3, run: false }, { to: [HX5 + 4, -262], jump: 30, jumpAt: 5, within: 0.4, run: false },
        { to: [HX5 + 3.2, -263.2], within: 0.3, run: false }, { to: [HX5, -268], jump: 30, jumpAt: 5.2, within: 0.4, run: false },
        { to: [HX5 - 1, -269.4], within: 0.3, run: false }, { to: [HX5 - 4, -274], jump: 30, jumpAt: 5, within: 0.4, run: false },
        { to: [HX5 - 3.2, -275.2], within: 0.3, run: false }, { to: [HX5, -279.6], jump: 30, jumpAt: 5, within: 0.4, run: false }, { star: 2 },
        { to: [HX5, -282.2], jump: 30, within: 0.25, run: false }, { crouch: 12 }, { expect: 'seeufer' }], shot: 'stern3' },
  ],
  extra: [
    { name: 'Krallen-Anzug aus dem ?-Block am Start', from: [2.6, 0, 3.4], heroes: ['lotti'],
      legs: [{ to: [2.6, 1.5], within: 0.2, run: false }, { hop: 20 }, { to: [2.6, 3.8], within: 0.3, run: false }, { to: [2.6, 1.5], jump: 40, jumpAt: 1.6, within: 0.3, run: false }, { wait: 30 }, { expect: 'krallen' }] },
    { name: 'Steigbecken: bei Niedrigwasser kommt man von der Beckensohle nicht auf die Kante', from: [0, -6, -28.4], heroes: ['lotti'],
      legs: [{ until: 'niedrig', max: 1800 }, { to: [0, -30.6], jump: 40, within: 0.3, run: false, max: 200, autoJump: false, land: false }, { wait: 60 }],
      mech: (r) => r.pos[1] < 0, mechText: (r) => `y ${r.pos[1].toFixed(1)}`, allowFail: true },
    { name: 'Extraleben: unsichtbarer Block im Endsaal', from: [12, FL5, -234], heroes: ['lotti'], expectLives: 1,
      legs: [{ to: [12, -232], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
  ],
  shots: [
    ['start', [0, 0, 6]],
    ['flutsaal', [0, 0, -4]],
    ['kante', [0, 1.0, -34]],
    ['wuerfel', [0, 1.0, -39]],
    ['cp', [0, 1.0, -66]],
    ['blau', [0, 1.0, -72]],
    ['steg', [0, 1.0, -100.6]],
    ['halle', [0, 1.0, -151]],
    ['bruecke', [0, 1.0, -152.6]],
    ['rot', [3.6, 1.0, -176]],
    ['wand', [0, 1.0, -202]],
    ['endsaal', [10, 1.0, -232]],
    ['himmel', [40, 42, -250]],
    ['ziel', [0, 1.0, -276]],
  ],
};

const PORT = 4860;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((o) => t.name.includes(o))) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,shots').split(','));
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
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    // 8-4
    zielturm: () => at(-7, 7, -0.5, -258, -288),
    kammer: () => at(70, 92, -0.5, -180, -214),
    aufIso: () => P().pos.x < -8.9 && P().pos.y > -0.2 && P().mode === 'ground',
    funken: () => P().power === 'funken',
    // 8-5
    krallen: () => P().power === 'krallen',
    hochwasser: () => { const b = L.named.get('becken'); return !!b && b.state === 'oben'; },
    niedrig: () => { const b = L.named.get('becken'); return !!b && b.state === 'unten'; },
    kante: () => at(-6, 6.1, 0.6, -29.5, -40.5) && P().mode === 'ground',
    cpHof: () => at(-5, 5, 0.6, -57.4, -70.5),
    rotHalle: () => at(-6, 6, 0.6, -168, -201),
    seeufer: () => at(-7, 7, 0.6, -265, -301),
    himmel: () => P().pos.x > 30 && P().pos.y > 40,
    // 8-Zug
    abfahrt: () => !!L.scroll && L.scroll.state !== 'wait',
    halt: () => !!L.scroll && L.scroll.state === 'done',
    aufDach: () => P().pos.y > 3.6 && P().mode === 'ground',
    buehne: () => P().pos.x > 105 && P().pos.x < 135 && P().pos.y > 1.2,
    zielwagen: () => P().pos.x > 115 && P().pos.z < -160 && P().pos.y > 1.2,
    gang: () => P().pos.y < 2.2 && P().pos.y > 1.2 && P().pos.z < -133.4 && P().pos.z > -145,
    lukeZu: () => { const h = L.named.get('hebeblock'); return !!h && !h.lukeOpen; },
    deckelZu: () => { const h = L.named.get('deckel'); return !!h && !h.open; },
    krallen8: () => P().power === 'krallen',
    bahnsteigWeg: () => { let z = -99; c.level.world.forEach((q) => { if (q.tag === 'bahnsteig') z = q.z0; }); return z > 20; },
    steinAuf: () => L.entities.filter((e) => e.kind === 'steinblock' && !e.removed && e.alive !== false).length < 3,
  };
  const W = {
    /** Autoscroller (8-Zug): Bildfenster auf Pfadlänge s stellen ('auto': Figur bei pos knapp vor der Mitte); Fahrt läuft. */
    win(pos, o = {}) {
      const w = L.scroll;
      if (!w) return null;
      let s = o.win === 'auto' ? 10 - pos[2] - 1.5 : o.win;
      s = Math.max(w.s0, Math.min(w.s1, s));
      w.s = s; w.travel = s - w.s0; w.triggered = true; w.waitT = 99;
      w.state = s >= w.s1 - 1e-6 ? 'done' : 'run';
      w.speed = w.state === 'run' ? w.speedAt(s) : 0;
      w.clock = o.clock ?? Math.max(4, s * 0.6);
      w.refresh();
      const a = c.arch;
      if (a && 'camK' in a) { a.ended = w.state === 'done'; a.camK = a.ended ? 0 : 1; a.snap = w.snapshot(); }
      return w.info();
    },
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      if (o.win !== undefined) this.win(pos, o);
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
    /** Lenkung in der Luft: Wunschgeschwindigkeit zum Ziel (tx, tz) plus Mitbewegung (vx, vz). */
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    /** Sichtbarkeit des Leuchtstegs (Id) an einem Punkt (0..1). */
    stegVis(id, x, y, z) { const h = L.named.get(id); return h ? +h.visibleAt(x, y, z).toFixed(2) : -1; },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, warps: 0, rides: 0, ride: 0, stomped: [], hurtList: [], probe: {}, lands: 0, impacts: 0, pipes: 0, swims: 0, climbs: 0 };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const stones = L.entities.filter((e) => e.kind === 'stampfstein');
      const stoneState = new Map(stones.map((e) => [e, e.state]));
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.riding) mech.ride++;
        for (const e of stones) { const s0 = stoneState.get(e); if (e.state !== s0) { if (e.state === 'land') mech.lands++; stoneState.set(e, e.state); } }
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead && !p.riding) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !p.riding && p.script?.type !== 'mount' && p.script?.type !== 'dismount' && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play' && !p.riding) { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && p.mode !== 'swim' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        // ------------------------------------------------ Messpunkte (8-4): Steg 7 m voraus bzw. 6 m neben der Figur
        if (Lg.probe) { mech.probe[Lg.probe] = this.stegVis('steg_a', -1, 0, p.pos.z - 7); continue; }
        if (Lg.probe2) { mech.probe[Lg.probe2] = this.stegVis('steg_b', 0, 0, -66.5); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) {
          const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null });
          const left = L.entities.filter((e) => e.kind === Lg.chaseKind && !e.removed).map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1), e.state ?? '']);
          log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power, JSON.stringify(left)]);
          continue;
        }
        // ------------------------------------------------ Münzen nacheinander einsammeln (optional mit Sprung)
        if (Lg.coins) {
          for (const [tx, tz, jmp = 0] of Lg.coins) {
            let k = 0;
            for (; k < 600 && !p.dead; k++) {
              const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
              if (d < 0.35 && (!jmp || ((p.mode === 'ground' || p.mode === 'swim') && k > 30))) break;
              const jump = jmp && p.mode === 'ground' && d < 1.2 ? true : jmp && p.mode === 'air' && p.vel.y > 0;
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d / 1.2)))), run: false, jump: !!jump });
            }
            log.push(['münze', tx, tz, k]);
          }
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
            for (; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
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
        // ------------------------------------------------ zu Pflaume ins Wasser springen (Station)
        if (Lg.mount) {
          let k = 0;
          for (; k < 400 && !p.riding; k++) {
            const r = p.raftPos;
            const tx = r ? r.x : Lg.mount[0], tz = r ? r.z : Lg.mount[1];
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, 1)), jump: k % 60 < 24, run: false });
          }
          log.push(['aufgestiegen', !!p.riding, k, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!p.riding) log.push(['FEHLER: nicht aufgestiegen']);
          continue;
        }
        // ------------------------------------------------ Pflaume lenken: Seitenlage je z, Sprung in Bereichen, bis zum Absteigen
        if (Lg.ride) {
          const keys = Lg.ride;
          const latAt = (z) => {
            if (z >= keys[0][0]) return keys[0][1];
            for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (z <= a[0] && z >= b[0]) { const t = (a[0] - z) / (a[0] - b[0]); return a[1] + (b[1] - a[1]) * t; } }
            return keys[keys.length - 1][1];
          };
          let k = 0;
          for (; k < (Lg.max ?? 9000); k++) {
            if (p.dead) break;
            if (p.dismounted && !p.riding && p.mode === 'ground') break;
            if (!p.riding) { tick({}); continue; }
            const f = L.river.sample(p.pos.x, p.pos.z, {}, p.pos.y);
            const lat = latAt(p.pos.z);
            const q = f.ch.at(f.s + 3.5, {});
            const tx = q.x + q.rx * lat, tz = q.z + q.rz * lat;
            const jumpHere = (Lg.jump ?? []).some(([z0, z1]) => p.pos.z <= z0 && p.pos.z >= z1);
            const st = this.stick(tx - p.pos.x, tz - p.pos.z, 1);
            tick({ x: st.x, y: st.y * (Lg.push ?? 0.3), jump: jumpHere });
          }
          (mech.rideStops ??= []).push(+p.pos.z.toFixed(2));
          log.push(['ritt', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, !!p.dismounted]);
          if (!p.dismounted && !Lg.partial) log.push(['FEHLER: Ritt nicht beendet']);
          continue;
        }
        // ------------------------------------------------ schwimmend an die Oberfläche, Aussprung, in der Luft zum Ziel (Wasser/Boden)
        if (Lg.leap) {
          const [tx, tz] = Lg.leap;
          let k = 0;
          for (let q = 0; q < 240 && p.mode === 'air' && !p.dead; q++) tick({});
          // an die Oberfläche und zum Rand des Wasserkörpers auf der Zielseite schwimmen (bzw. zur Stelle from), dann Aussprung
          // mit Schwung in Zielrichtung
          const wb = !Lg.from && p.water && p.water.x1 !== undefined ? p.water : null;
          const x0 = Lg.from ? Lg.from[0] : wb ? Math.max(wb.x0 + 0.7, Math.min(wb.x1 - 0.7, tx)) : p.pos.x;
          const z0 = Lg.from ? Lg.from[1] : wb ? Math.max(wb.z0 + 0.7, Math.min(wb.z1 - 0.7, tz)) : p.pos.z;
          for (; k < 900 && p.mode === 'swim' && !p.dead; k++) {
            const dx = x0 - p.pos.x, dz = z0 - p.pos.z, d = Math.hypot(dx, dz);
            const top = p.water ? p.water.top - (p.pos.y + p.half.y) < 0.45 : false;
            const go = d < (Lg.from ? 0.5 : 1.3) && top && k > 10;
            const st = Lg.from ? this.stick(dx, dz, Math.min(1, d)) : go ? this.stick(tx - p.pos.x, tz - p.pos.z, 1) : this.stick(dx, dz, 1);
            tick({ ...st, jump: go && k % 12 < 4 });
          }
          let j = 0;
          // erst steigen (über die Kante), dann zum Ziel lenken
          for (; j < 400 && (p.mode === 'air' || p.mode === 'wall') && !p.dead; j++) {
            const up = Lg.over !== undefined && p.pos.y < Lg.over && p.vel.y > 0;
            tick({ ...(up ? this.airSteer(x0, z0, 0, 0, 3.2, 2) : this.airSteer(tx, tz, 0, 0, 3.2, 6.5)), jump: p.vel.y > 0 });
          }
          settle();
          if (p.mode === 'swim') mech.swims++;
          log.push(['aussprung', `${Lg.leap}`, k, j, p.mode, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ an einem quer fahrenden Stachelblock vorbei: Seite gegenüber seinem Ziel
        // wählen, warten, bis er dort hält (bzw. weit genug weg ist), dann durch seine Spur
        if (Lg.cross) {
          const b = L.named.get(Lg.cross);
          const bx = () => b.mb.pos.x;
          let prev = bx(), dir = 0, k = 0;
          const goTo = (gx, gz, within, maxN, run = false) => { let n = 0; for (; n < maxN && !p.dead; n++) { const dx = gx - p.pos.x, dz = gz - p.pos.z, d = Math.hypot(dx, dz); if (d < within && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.max(0.25, Math.min(1, d / 1.0))), run }); } return n; };
          for (; k < 1200 && !dir; k++) { tick({}); const x = bx(); if (Math.abs(x - prev) > 1e-4) dir = Math.sign(x - prev); prev = x; }
          const lane = -dir * 3.6;
          goTo(lane, Lg.z0, 0.35, 400);
          let w = 0;
          for (; w < 1600 && !p.dead; w++) {
            const x = bx(), mv = x - prev; prev = x;
            const far = Math.abs(x - lane) > 4.6;
            const away = b.color === 'rot' ? (Math.sign(mv) === Math.sign(x - lane) || Math.abs(x - lane) > 6.2) : b.state === 'wartet';
            if (far && away) break;
            tick({});
          }
          const n = goTo(lane, Lg.z1, 0.45, 400, true);
          log.push(['vorbei', Lg.cross, dir, lane, k, w, n, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ hinter der zurückweichenden Stachelwand her bis zum Ausgang
        if (Lg.follow) {
          const wall = L.named.get(Lg.follow);
          const wz = () => wall.mb.pos.z;
          let prev = wz(), k = 0;
          for (; k < 2400; k++) { tick({}); const z = wz(); if (z < prev - 1e-4 && z < -212) break; prev = z; }
          const [ex, ez] = Lg.exit;
          let j = 0;
          for (; j < 2400 && !p.dead; j++) {
            const home = wz() < -232.6;
            const tz = home ? ez : Math.max(ez, wz() + 2.8);
            const atExitZ = home && Math.abs(p.pos.z - ez) < 0.8;
            const gx = atExitZ ? ex : 0, gz = tz;
            const dx = gx - p.pos.x, dz = gz - p.pos.z, d = Math.hypot(dx, dz);
            if (atExitZ && d < 0.4) break;
            tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run: false });
          }
          log.push(['stachelwand', k, j, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2), +wz().toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Krallen-Anzug: an die Wand laufen, springen, hinaufklettern
        if (Lg.climb) {
          const [wx, wz] = Lg.climb;
          const fx = Lg.face?.[0] ?? 0, fz = Lg.face?.[1] ?? -1;
          let n = 0;
          for (; n < 600; n++) { const dx = wx - fx * 1.2 - p.pos.x, dz = wz - fz * 1.2 - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.2 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run: false }); }
          let k = 0, climbed = false;
          for (; k < (Lg.max ?? 900); k++) {
            if (p.dead) break;
            tick({ ...this.stick(fx, fz, 1), jump: p.mode === 'ground' && k % 40 < 10 });
            if (p.state === 'climb') climbed = true;
            if (p.mode === 'ground' && p.pos.y > Lg.top - 0.2) break;
          }
          if (climbed) mech.climbs++;
          log.push(['Krallen', k, climbed, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.power]);
          if (p.pos.y < Lg.top - 0.2) { log.push([Lg.soft ? 'nicht erklommen (erwartet)' : 'FEHLER: Wand nicht erklommen', Lg.climb]); if (!Lg.soft) break; }
          continue;
        }
        // ------------------------------------------------ auf einen quer fahrenden Block (Oberseite) springen, wenn er auf seiner Seite hält
        if (Lg.onBlock) {
          const b = L.named.get(Lg.onBlock);
          let k = 0;
          for (; k < 1600 && !(b.state === 'wartet' && Math.sign(b.mb.pos.x) === Lg.side && Math.abs(b.mb.pos.x) > 2.9); k++) tick({});
          let j = 0, on = false;
          for (; j < 300 && !p.dead; j++) {
            const tx = b.mb.pos.x, tz = b.mb.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 5) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: j < 34, run: false });
            if (j > 8 && p.mode === 'ground') { on = p.ground?.owner === b || p.ground?.tag === 'stachelblock'; break; }
          }
          log.push(['auf Block', Lg.onBlock, k, j, on, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) log.push(['FEHLER: nicht auf dem Block']);
          continue;
        }
        // ------------------------------------------------ vom Block (wenn er auf der anderen Seite hält) in die Nische springen
        if (Lg.niche) {
          const b = L.named.get(Lg.block);
          let k = 0;
          for (; k < 1600 && !(b.state === 'wartet' && b.mb.pos.x < -2.9); k++) tick({ ...this.stick(b.mb.pos.x - p.pos.x, b.mb.pos.z - p.pos.z, Math.min(0.6, Math.hypot(b.mb.pos.x - p.pos.x, b.mb.pos.z - p.pos.z))) });
          const [tx, tz] = Lg.niche;
          let j = 0;
          for (; j < 300 && !p.dead; j++) {
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 5) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: j < 40, run: false });
            if (j > 8 && p.mode === 'ground') break;
          }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['Nische', k, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ 8-Zug: zum Ziel, dabei über einen Schubser in Zielrichtung springen
        if (Lg.dodge) {
          const ids = [].concat(Lg.dodge);
          const [tx, tz] = Lg.to;
          let k = 0, jumps = 0, hold = 0;
          for (; k < (Lg.max ?? 2400) && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (d < (Lg.within ?? 0.5) && p.mode === 'ground') break;
            if (p.mode === 'ground' && hold <= 0) for (const e of L.entities) {
              if (!ids.includes(e.spec?.id) || e.defeated || e.removed) continue;
              const ex = e.pos.x - p.pos.x, ez = e.pos.z - p.pos.z, ed = Math.hypot(ex, ez);
              const ahead = (ex * dx + ez * dz) / (d || 1) > 0;
              if (ahead && ed < (Lg.at ?? 2.6) && Math.abs(e.pos.y - p.pos.y) < 1) { hold = 36; jumps++; break; }
            }
            const jump = hold > 0;
            if (hold > 0) hold--;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.6, 6.5) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d / 1.2)))), jump, run: false });
          }
          log.push(['ausgewichen', Lg.dodge, k, jumps, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (k >= (Lg.max ?? 2400)) { log.push(['FEHLER: Schubser-Wagen nicht durchquert', Lg.dodge]); break; }
          continue;
        }
        // ------------------------------------------------ 8-Zug: Kampf gegen die Schattenläuferin (echte Eingaben: aufs Original springen)
        if (Lg.boss) {
          const b = L.named.get(Lg.boss);
          const [cx, cz] = Lg.center;
          let k = 0, jumps = 0, hold = 0;
          const hp0 = b.hp;
          for (; k < (Lg.max ?? 120 * 180) && !p.dead && b.state !== 'gone'; k++) {
            let tx = cx, tz = cz;
            const vul = b.vulnerable && b.state !== 'appear';
            if (vul) { tx = b.pos.x; tz = b.pos.z; }
            const d = Math.hypot(tx - p.pos.x, tz - p.pos.z);
            if (vul && p.mode === 'ground' && d < (Lg.at ?? 2.2)) { hold = 30; jumps++; }
            const jump = hold > 0;
            if (hold > 0) hold--;
            const ev = b.vel ?? { x: 0, z: 0 };
            tick({ ...(p.mode === 'air' ? this.airSteer(tx + ev.x * 0.15, tz + ev.z * 0.15, vul ? ev.x : 0, vul ? ev.z : 0, 3.6, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, d > 0.4 ? 1 : 0.3)), jump, run: false });
          }
          mech.bossHits = hp0 - b.hp;
          log.push(['Endgegner', k, jumps, b.state, b.hp, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (b.state !== 'gone' && b.state !== 'flee' && b.state !== 'defeated') { log.push(['FEHLER: Endgegner nicht besiegt', b.state, b.hp]); break; }
          for (let q = 0; q < 120 * 4 && b.state !== 'gone'; q++) tick({});
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? o.maxDefault ?? 900;
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
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && Lg.swimJump !== false && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      { const h = L.named.get('hebeblock'); if (h) mech.lifted = h.lifts > 0; }
      mech.lives = L.runtime.save?.lives;
      mech.impacts = window.__w8impacts?.() ?? 0;
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  // Zähler der Aufschläge (Welt-8-Sammelstelle, falls vorhanden)
  window.__w8impacts = () => L._w8?.impacts ?? L.w8?.impacts ?? 0;
  window.__w8b = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w8b[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w8b_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w8b.detail());
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
    const starsOk = meta.stars === R.meta.stars && kinds.stamp === 1;
    check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      starsOk && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    if (R.named) {
      const miss = await sc((ids) => ids.filter((x) => !window.__course.level.named.get(x)), R.named);
      check(`${id}: Bausteine ${R.named.join(', ')} vorhanden${miss.length ? ` (fehlt: ${miss.join(', ')})` : ''}`, miss.length === 0);
    }
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, { maxDefault: R.maxDefault });
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
      await W('place', pt, { settle: 6, ...(R.shotWin ? { win: pt[0] > 50 ? 1e9 : 'auto' } : {}) });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    const avg = per.reduce((a, q) => a + q[1], 0) / Math.max(1, per.length), avgT = per.reduce((a, q) => a + q[2], 0) / Math.max(1, per.length);
    console.log(`  Messgang: ${per.length} Punkte, Zeichenaufrufe Ø ${avg.toFixed(1)} (max ${worst.calls}), Dreiecke Ø ${Math.round(avgT / 1000)} k (max ${Math.round(worst.tris / 1000)} k)`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln, maxDefault: R.maxDefault });
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
      const res = await W('drive', t.legs, { invuln: t.invuln, maxDefault: R.maxDefault });
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

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw, ...(R.shotWin && name !== 'start' ? { win: pos[0] > 50 ? 1e9 : 'auto' } : {}) });
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
