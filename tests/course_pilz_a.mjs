// Welt Pilz (Remix-Welt 1), Level P-1 „Mondscheinwalzen am Mühlenhügel“ (Remix von 2-4), P-2 „Stachelranken im Abendrot“
// (Remix von 1-3), P-3 „Spukfloß im Finsterdschungel“ (Remix von 6-4) und P-4 „Schattenspuk-Gerangel“ (Remix von 2-3):
// Laden ohne Konsolenfehler/-warnungen, Gegenprobe „Basislevel unverändert“, Remix-Regeln wirksam (Licht, Klang-Variante,
// Gegnertausch, Zeit, entfernte/neue Objekte), Routen-Bot (Lotti und Greta von Start bis Ziel, deterministisch über
// __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne und Geheimnisse mit der echten Mechanik
// samt Gegenproben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der
// Spielkamera (tests/out/pilz_a_*.png).
// Aufruf (nach npm run build): node tests/course_pilz_a.mjs [P-1|P-2|P-3|P-4]   (Port 5035 + PORT_BASE)
//   PARTS=load,rules,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller und Trefferversuche werden gezählt), damit Geometrie und Mechanik geprüft werden; Gegenproben
// laufen verwundbar. Die Zeit läuft auf der Route mit (Remix-Zeitlimits gelten wirklich).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf,
// airK/airMax (Luftlenkung: Stärke, Höchsttempo m/s) }
// · { wait } · { hop } · { crouch } (Röhre) · { star: i } · { chaseKind, ids } · { expect } · { until } (Name aus COND oder
// Ausdruck '=…') · { warp: [x, z] } · { pipe: [x, z] } (Glasröhre) · { stompAll: Id-Anfang } · { pound: [x, z] } ·
// { stomp: true } (Sprung + Stampfen auf der Stelle) · { climb: [x, z], top } (Krallen-Anzug an einer Wand) · { grab: [x, z] }
// (Power-up aus einem ?-Block) · { tiles: [[x, z] …] } · { plank: Id, pick } / { toPlank } / { ridePlank, until } (Riesenrad) ·
// { long: [x, z] } (Weitsprung) · { throwAt: [x, z], wait } (Wurfsichel) · { dropHelmet: true } (Ducken + Aktion: Helm absetzen) ·
// { face: [dx, dz], exact: true } (genau ausrichten – Kanonen-Helm) · { timeLeft: s } (Restzeit setzen, nur Ziele)
const YU = 6, YD = -14, YG = 10;
// P-1: Sternmünzen rund um den Stufenhügel (7, −74) und hinauf auf die oberste Terrasse
const RING_COINS = [141.4, 192.9, 244.3, 295.7, 347.1, 38.6, 90].map((a) => [7 + 4.4 * Math.cos(a * Math.PI / 180), -74 + 4.4 * Math.sin(a * Math.PI / 180)]);
const RING_CLIMB = [{ to: [7, -68.8], within: 0.3, run: false }, { to: [7, -70.9], jump: 16, within: 0.3, run: false },
  { to: [7, -71.8], jump: 16, within: 0.3, run: false }, { to: [7, -73.8], jump: 20, within: 0.3, run: false }, { to: [7, -74], within: 0.2, run: false }];
const ROUTES = {
  'P-1': {
    base: '2-4',
    start: [0, YU, -26.5],
    meta: { stars: 3, time: 30, theme: 'grass@nacht', music: 'course_hills', variant: 'nacht', archetype: 'parcours', baseTheme: 'grass', baseMusic: 'course_hills', baseTime: 500 },
    enemies: { huepfmaus: 0, stachelkugler: 4 },
    main: [
      { name: 'Rollhügel', to: [0, -31] },
      { name: 'Hügelwalze 1', to: [0, -40.4] },
      { to: [0, -44] },
      { name: 'Hügelwalze 2', to: [0, -53.6] },
      { to: [0, -57] },
      { name: 'Hügelwalze 3', to: [0, -67] },
      { name: 'Grashügel', to: [-1, -86] },
      { name: 'an der Mühle', to: [-1.6, -100] },
      { name: 'Röhre hinab', to: [-1.6, -105.4], jump: 26, within: 0.3, run: false },
      { crouch: 4 },
      { name: 'Mühlenkeller', to: [0, -241] },
      { to: [0, -249.4] },
      { name: 'Zahnrad 1', to: [0, -254], jump: 40, within: 0.4 },
      { to: [-1.0, -255.3], within: 0.3, run: false },
      { name: 'Zahnrad 2', to: [-4.5, -260], jump: 40, within: 0.4 },
      { to: [-3.5, -261.2], within: 0.3, run: false },
      { name: 'Zahnrad 3', to: [1, -266.5], jump: 40, within: 0.4 },
      { to: [0.8, -268.1], within: 0.3, run: false },
      { name: 'Stehendes Rad', to: [0, -272.6], jump: 40, within: 0.5 },
      { to: [0, -273.8], within: 0.3 },
      { name: 'Boden B', to: [0, -279.2], jump: 40 },
      { to: [0, -284], within: 0.5 },
      { name: 'Radkante', to: [0, -303.7], within: 0.25, run: false },
      { plank: 'rad1', pick: [-0.28, -0.12] },
      { name: 'Riesenrad 1', toPlank: true, jump: 12, within: 0.6, run: false },
      { ridePlank: true, until: [2.8, 3.0] },
      { plank: 'rad2', pick: [-0.5, 0.0] },
      { name: 'Riesenrad 2', toPlank: true, jump: 26, within: 0.6, run: false },
      { ridePlank: true, until: [2.6, 2.8] },
      { name: 'Ausgang', to: [0, -325.4], jump: 40 },
      { to: [0, -327], within: 0.5 },
      { name: 'Röhre zum Ziel', to: [0, -329.6], jump: 30, within: 0.3, run: false },
      { crouch: 4 },
      { name: 'Zielkuppe', to: [0, -392] },
      { name: 'Zielmast', to: [0, -400.3], jump: 40, within: 0.3 },
    ],
    routeChecks: [
      { name: 'Zeit-Uhren unterwegs eingesammelt (Ideallinie), Restzeit am Ziel > 0', ok: (r) => r.mech.clocks >= 7 && r.rt.time > 0 },
    ],
    targets: [
      { name: 'Stern 0: Sternring über der dritten Hügelwalze anspringen, acht Sternmünzen rund um den Stufenhügel und oben drauf in 12 s', star: 0, from: [0, YU, -55.5], timeLeft: 30,
        legs: [{ to: [0, -60.6], within: 0.4 }, { to: [0, -63.6], jump: 30, within: 0.5, land: false }, { until: '=ent(\'sternring\').state === \'active\'', max: 200 },
          ...RING_COINS.map((q) => ({ to: q, within: 0.4 })), ...RING_CLIMB, { expect: '=ent(\'sternring\').state === \'done\'' }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Sternring (gleiche Runde um den Hügel, Ring nicht berührt)', star: 0, expectNot: true, from: [0, YU, -66], heroes: ['lotti'], timeLeft: 30,
        legs: [...RING_COINS.map((q) => ({ to: q, within: 0.4 })), ...RING_CLIMB, { wait: 60 }], mech: (r) => r.named?.state === 'idle', mechText: (r) => `Ring ${r.named?.state}`, named: 'sternring' },
      { name: 'Stern 1: oberer Weg im Mühlenkeller – Kiste, Sims und Bretter an der rechten Wand', star: 1, from: [3.5, YD, -244], timeLeft: 30,
        legs: [{ to: [5.2, -246.2], within: 0.3, run: false }, { to: [6.4, -247.6], jump: 24, within: 0.4, run: false },
          { to: [6.5, -251.2], jump: 30, within: 0.4, run: false }, { to: [6.5, -255.6], jump: 30, within: 0.4, run: false },
          { to: [6.5, -260], jump: 30, within: 0.4, run: false }, { to: [6.5, -264.4], jump: 30, within: 0.4, run: false },
          { to: [6.5, -268.8], jump: 30, within: 0.4, run: false }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht vom unteren Weg (Zahnrad 3, Sprung zu kurz)', star: 1, expectNot: true, from: [1, YD - 0.3, -266.5], heroes: ['lotti'], timeLeft: 30,
        legs: [{ to: [6.5, -268.8], jump: 40, within: 0.4, max: 200, land: false }, { wait: 90 }] },
      { name: 'Stern 2: unterer Weg – Kristalldeckel stampfen, Röhre, alle Farbfelder', star: 2, from: [1.8, YD, -290], timeLeft: 30,
        legs: [{ to: [5, -290], jump: 34, within: 0.25, run: false }, { to: [5, -290], within: 0.1, run: false, slow: 0.4 }, { wait: 40 },
          { stomp: true }, { wait: 40 },
          { to: [5, -290], jump: 26, within: 0.2, run: false }, { wait: 10 }, { crouch: 4 }, { wait: 30 }, { expect: '=P().pos.x > 50' },
          ...[-287.6, -289.6, -291.6, -293.6].flatMap((z, r) => [57, 59, 61, 63].map((x) => ({ to: [r % 2 ? 63 - (x - 57) : x, z], within: 0.4, run: false }))),
          { wait: 40 }, { star: 2 }], shot: 'stern2' },
    ],
    extra: [
      { name: 'Zeitdruck: ohne Zeit-Uhren ist die Zeit vor dem Ziel um (gleiche Route, Uhren schon weg)', heroes: ['lotti'], from: [0, YU, -26.5], noClocks: true, legsFrom: 'main', expectAlive: false, allowFail: true,
        mech: (r) => r.deathCause === 'time' && r.status !== 'goal' && r.status !== 'done', mechText: (r) => `${r.deathCause} bei z ${r.pos[2].toFixed(0)}` },
      { name: 'Zeit-Uhr: +5 s Restzeit (Gegenprobe daneben: nur die Zeit läuft)', heroes: ['lotti'], from: [3, YU, -31], probe: 'clock' },
      { name: 'Stachel-Hüpfmaus: Draufspringen verletzt', from: [-5, YU, -27.6], heroes: ['lotti'], invuln: false, allowFail: true, timeLeft: 30,
        legs: [{ jumpOnKind: 'huepfmaus_stachel', max: 600 }, { wait: 30 }], mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Stachelkugler: rollt den Grashügel hinab', from: [-1, YU, -70], heroes: ['lotti'], probe: 'kugler' },
      { name: 'Neustart nach einem Sturz: alle Zeit-Uhren wieder da, Zeit wieder 30 s', from: [0, YU, -30], heroes: ['lotti'], probe: 'respawn' },
    ],
    shots: [
      ['start', [0, YU, -26.5]],
      ['walze1', [0, YU + 1.5, -33.6]],
      ['ring', [0, YU, -56]],
      ['huegel', [2, YU, -72]],
      ['muehle', [0, YU, -97]],
      ['keller', [0, YD, -236]],
      ['oben', [6.5, YD + 4.5, -260]],
      ['zahnraeder', [0, YD, -249]],
      ['kristall', [1.8, YD, -287]],
      ['raeder', [0, YD, -303]],
      ['ausgang', [0, YD, -325]],
      ['ziel', [0, YG, -388]],
      ['farbraum', [60, YD, -284]],
    ],
  },
};

// P-2: gemeinsame Beine (Glockenhain vom Rankenplateau bis zum Glockenplatz; Krallen-Anzug nötig)
const YP2 = 30, YW2 = 24, YG2 = 42.5, YS2 = 50;
const BELL_TREES = [
  { name: 'Absprung zum Glockenbaum 1', to: [-3.5, -180.1], within: 0.25, run: false },
  { name: 'Glockenbaum 1 (Krallen)', climb: [-3.5, -184.2], top: YP2 + 4.5, jumpAt: 4.4 },
  { to: [-2.3, -185.4], within: 0.3, run: false },
  { name: 'Glockenbaum 2 (Krallen)', climb: [1.5, -189.2], top: YP2 + 8.5, jumpAt: 5.6 },
  { to: [0.3, -190.4], within: 0.3, run: false },
  { name: 'Glockenbaum 3 (Krallen)', climb: [-2.5, -194.6], top: YP2 + 12.5, jumpAt: 5.6 },
  { to: [-1.8, -195.4], within: 0.3, run: false },
  { name: 'Glockenplatz', to: [-1.5, -199.6], jump: 24, within: 0.5, run: false },
];
ROUTES['P-2'] = {
  base: '1-3',
  start: [0, 0, 6],
  meta: { stars: 3, time: 500, theme: 'grass@abend', music: 'course_grass', variant: 'abend', archetype: 'parcours' },
  enemies: { riesenschnappblume: 0, stachelkugler: 4, walzenwerfer: 2, schluesselmuenze: 5, stachelring: 5, bossblitz_box: 1, task: 0 },
  main: [
    { name: 'Schlüssel 1 hinter dem Start', to: [5.8, 9.4], within: 0.35, run: false },
    { name: 'Startplatz', to: [0, -8], run: true },
    { name: 'Schnappblumenfeld', to: [0, -21] },
    { to: [3.5, -44.3] },
    { name: 'Stufe zum POW-Hang', to: [5, -49.5], jump: 24, within: 0.5 },
    { name: 'Riesenblock-Treppe am Hang', to: [7, -52.6], within: 0.4, run: false },
    { to: [7, -55.5], jump: 24, within: 0.5, run: false },
    { to: [7, -60], jump: 24, within: 0.5, run: false },
    { to: [7, -64.5], jump: 24, within: 0.5, run: false },
    { to: [7, -69], jump: 24, within: 0.5, run: false },
    { name: 'Plateau oben', to: [7, -74.5], jump: 20, within: 0.5 },
    { name: 'Krallen-Pilzling am Ranken-Fuß', defeat: 'krallen_pilzling', near: [-1, -76.5], r: 5 },
    { to: [-3, -77.5], within: 0.4 },
    { name: 'Ranke an der Felswand', stalk: [-3, -80.45] },
    { climbStalk: true },
    { name: 'Wolkenstart', jumpOff: [-3, -84] },
    { to: [-0.6, -87.6], within: 0.3 }, { to: [-1, -92], jump: 30, within: 0.6, run: false },
    { to: [0.1, -93.2], within: 0.3 }, { to: [2.5, -98.5], jump: 30, within: 0.6, run: false },
    { to: [1.6, -99.7], within: 0.3 }, { to: [-1.5, -105], jump: 30, within: 0.6, run: false },
    { to: [-0.7, -106.3], within: 0.3 }, { to: [1.5, -111.5], jump: 30, within: 0.6, run: false },
    { name: 'Krallen-Pilzling auf der Wolke', defeat: 'krallen_pilzling', near: [1.5, -111.5], r: 2.6 },
    { to: [1.5, -112.9], within: 0.3 }, { to: [1.5, -118.5], jump: 30, within: 0.6, run: false },
    { name: 'Krallen-Pilzling auf der Holzbrücke', defeat: 'krallen_pilzling', near: [1.5, -121], r: 5 },
    { name: 'Holzbrücke', to: [1.5, -127] },
    { name: 'Doppelhügel', to: [0.3, -136] },
    { name: 'unter den unsichtbaren Block', to: [-6.2, -145.2], within: 0.2, run: false },
    { hop: 26 },
    { to: [-6.2, -141.6], within: 0.25, run: false },
    { name: 'auf den Block', to: [-6.2, -145.2], jump: 30, jumpAt: 3.3, within: 0.3, run: false },
    { expect: '=P().pos.y > 19.9' },
    { name: 'Schlüssel 3 über der Wandnische', to: [-8.5, -148.6], jump: 30, within: 0.3, run: false },
    { expect: '=P().pos.y > 21.3' },
    { to: [-8.5, -146.2], within: 0.4, run: false },
    { to: [-4.5, -146.2], within: 0.5 },
    { name: 'zur Riesenblock-Treppe', to: [-3.5, -152] },
    { to: [-3.5, -155.5], jump: 24, within: 0.5 }, { to: [-1.4, -157], within: 0.3 }, { to: [2.5, -159.5], jump: 24, within: 0.5 },
    { to: [0.4, -161], within: 0.3 }, { to: [-3.5, -163.5], jump: 24, within: 0.5 }, { to: [-1.4, -165], within: 0.3 },
    { to: [2.5, -167.5], jump: 24, within: 0.5 },
    { name: 'Schlüssel 2 am Fuß der dritten Ranke', to: [2.5, -169.6], within: 0.3, run: false },
    { name: 'dritte Ranke', stalk: [2.5, -171.05] },
    { climbStalk: true },
    { name: 'Rankenplateau', jumpOff: [0, -174] },
    { name: 'Krallen-Anzug', grab: [-4, -173.6], back: [-4, -175.6] },
    { expect: 'krallen' },
    ...BELL_TREES,
    { name: 'Schlüssel 4 auf der Plattform', to: [3.6, -198.9], within: 0.3, run: false },
    { to: [7.2, -197.4], jump: 24, within: 0.4, run: false },
    { to: [5.8, -198.4], within: 0.3, run: false },
    { to: [3.4, -199.2], jump: 24, within: 0.4, run: false },
    { to: [-4, -200.6], within: 0.5 },
    { name: 'letzte Ranke', to: [-10.5, -195.2], within: 0.4 },
    { stalk: [-10.5, -193.6] },
    { climbStalk: true },
    { name: 'Schlüssel 5 auf der Wolke', jumpOff: [-12, -194.6] },
    { expect: '=L.keys?.schluessel?.done === true' },
    { name: 'zurück zum Glockenplatz', to: [-5, -199], within: 0.6 },
    { name: 'Ziel-Warp-Box', warp: [1.6, -201.4] },
    { expect: '=P().pos.y > 49' },
    { name: 'Zielmast', to: [0, -211.9], within: 0.2 },
  ],
  routeChecks: [
    { name: 'alle fünf Schlüsselmünzen, drei Glockenbäume geklettert (Glocken geläutet), Warp-Box geöffnet', ok: (r) => r.mech.climbs === 3 && r.mech.warps === 1 && r.mech.bells?.every((n) => n >= 1) },
    { name: 'an den Ranken Stachelringe abgewartet (eingefahren vorbei)', ok: (r) => r.mech.ringWaits > 0 && !r.mech.hurtList.some((h) => h.startsWith('stachelring')) },
  ],
  targets: [
    { name: 'Stern 0: dritte Ranke ganz hinauf (Stachelringe abwarten), hinter der Spitze abspringen', star: 0, from: [2.5, 25, -169.4],
      legs: [{ stalk: [2.5, -171.05] }, { climbStalk: true }, { jumpOff: [2.5, -172.6], hold: 40 }, { wait: 30 }], shot: 'stern0' },
    { name: 'Stern 0 nicht vom Rankenplateau aus (Sprung zu niedrig)', star: 0, expectNot: true, from: [2.5, YP2, -172.4], heroes: ['lotti'],
      legs: [{ hop: 40 }, { wait: 20 }] },
    { name: 'Stern 1: hinter Stern 0 die Ziegel der Nische zerkratzen (Krallen-Anzug), Röhre → P-Schalter-Raum, alle blauen Münzen', star: 1, from: [2.5, YP2, -175.4], place: { power: 'krallen' },
      legs: [{ to: [2.5, -176.5], within: 0.2, run: false }, { swipe: [0, -1], n: 2 }, { expect: '=!L.entities.some((e) => e.kind === \'brick\' && e.alive && Math.abs(e.pos.x - 2.5) < 0.1 && Math.abs(e.pos.y - 30) < 0.1 && Math.abs(e.pos.z + 177.7) < 0.1)' },
        { to: [2.5, -178.1], within: 0.25, run: false }, { to: [2.5, -179.2], jump: 20, within: 0.2, run: false }, { wait: 10 }, { crouch: 6 }, { until: '=P().pos.x > 55 && P().mode === \'ground\'', max: 900 },
        { to: [68.4, -66.2], within: 0.3, run: false }, { to: [70, -67], jump: 24, within: 0.3, run: false }, { wait: 10 },
        { to: [70, -63.1], within: 0.35 }, { to: [70, -61.8], jump: 24, within: 0.4, run: false },
        { to: [73.5, -61], within: 0.4 }, { to: [74, -63.9], within: 0.3 }, { to: [74, -66], jump: 24, within: 0.4, run: false },
        { to: [76.5, -70], within: 0.4 }, { to: [71.9, -74.2], within: 0.3 }, { to: [70, -75.5], jump: 24, within: 0.4, run: false },
        { to: [67.9, -74], within: 0.3 }, { to: [66, -72], jump: 24, within: 0.4, run: false },
        { to: [63.5, -66], within: 0.4 }, { to: [66, -63.5], within: 0.4 }, { star: 1 }], shot: 'stern1' },
    { name: 'Stern 2: letzte Ranke hinauf, auf die Wolke, über ihr springen', star: 2, from: [-10.5, YG2, -195.4],
      legs: [{ stalk: [-10.5, -193.6] }, { climbStalk: true }, { jumpOff: [-12, -194.6] }, { hop: 40 }, { star: 2 }], shot: 'stern2' },
    { name: 'Stern 2 nicht vom Glockenplatz aus (ohne Ranke)', star: 2, expectNot: true, from: [-12, YG2, -195.4], heroes: ['lotti'],
      legs: [{ to: [-12, -194.6], within: 0.2, run: false }, { hop: 40 }, { wait: 30 }] },
  ],
  extra: [
    { name: 'Geheimnis: ohne Tatzenhieb versperren die Ziegel die Röhre (die Figur kommt nicht in die Nische)', from: [2.5, YP2, -175.4], heroes: ['lotti'],
      legs: [{ to: [2.5, -179.2], within: 0.2, run: false, max: 300, autoJump: false }, { crouch: 6 }, { wait: 30 }], allowFail: true,
      mech: (r) => r.pos[0] < 10 && r.pos[2] > -178.3, mechText: (r) => `z ${r.pos[2].toFixed(1)}` },
    { name: 'Schlüsselmünze 3 nicht ohne die unsichtbaren Blöcke (Sprung vom Boden aufs Nischendach zu hoch)', from: [-8.5, 17, -145.6], heroes: ['lotti', 'greta'],
      legs: [{ to: [-8.5, -148.4], jump: 40, within: 0.3, max: 240, land: false }, { wait: 60 }], mech: (r) => r.keys === 0 && r.pos[1] < 18, mechText: (r) => `Schlüssel ${r.keys}, y ${r.pos[1].toFixed(1)}` },
    { name: 'Ziel-Warp-Box bleibt mit vier Schlüsseln zu (Ansage), mit dem fünften springt das Schloss auf', from: [1.6, YG2, -199.6], heroes: ['lotti'], probe: 'box' },
    { name: 'Glockenbaum ohne Krallen-Anzug: nur Wandrutschen, die Figur landet auf dem Wurzelboden', from: [-3.5, YP2, -180.1], heroes: ['lotti'],
      legs: [{ climb: [-3.5, -184.2], top: YP2 + 4.5, jumpAt: 4.4 }, { wait: 60 }], allowFail: true, mech: (r) => r.pos[1] < YW2 + 0.5 && r.pos[1] > YW2 - 0.5, mechText: (r) => `y ${r.pos[1].toFixed(1)}` },
    { name: 'Stachelring: wer ohne Abwarten an ihm vorbeiklettert, wird getroffen', from: [-3, 9, -77.8], heroes: ['lotti'], invuln: false, allowFail: true, expectAlive: true,
      legs: [{ stalk: [-3, -80.45] }, { until: '=ent(\'ring_fels\').state === \'warn\'', max: 900 }, { climbStalk: true, noWait: true, max: 240 }, { wait: 60 }],
      mech: (r) => r.mech.hurts >= 1 && r.ring?.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}`, named: 'ring_fels' },
    { name: 'Stachelkugler rollen den POW-Hang hinab', from: [7, 3, -50], heroes: ['lotti'], probe: 'kuglerHang' },
    { name: 'Walzenwerfer oben am POW-Hang wirft Stachelwalzen', from: [-2, 9, -74], heroes: ['lotti'], probe: 'werfer' },
  ],
  shots: [
    ['start', [0, 0, 6]],
    ['hang', [3, 3, -50]],
    ['ranke2', [-3, 9, -77]],
    ['doppelhuegel', [0, 17, -136]],
    ['nische', [-7, 17, -143]],
    ['treppe', [0, 17, -153]],
    ['ranke3', [2.5, 25, -169.4]],
    ['plateau', [0, YP2, -173]],
    ['hain', [-3.5, YP2, -179.8]],
    ['krone2', [1.5, YP2 + 8.5, -189.2]],
    ['glockenplatz', [0, YG2, -199.5]],
    ['wolke', [-12, YS2, -194.6]],
    ['gipfel', [0, YS2, -206.5]],
    ['praum', [66, 0, -64]],
  ],
};

ROUTES['P-3'] = {
  base: '6-4',
  start: [0, 1, 6],
  meta: { stars: 3, time: 400, theme: 'jungle@dunkel', music: 'course_jungle', variant: 'dunkel', archetype: 'parcours' },
  enemies: { brummer: 0, rankenschnapper: 0, spuk: 8, kreisgeist: 5, helm_licht: 7, kettenzaun: 3, kampfraum: 1, lichtplattform: 1, starring: 0 },
  main: [
    { name: 'Licht-Helm am Start', to: [-0.8, 2.8], within: 0.3, run: false },
    { expect: '=P().helmet === \'licht\'' },
    { name: 'Steg', to: [0, -6.9], within: 0.4, run: false },
    { name: 'auf Floß 1', board: 'floss1' },
    { name: 'Floßstrecke I (Spuke ins Licht nehmen)', raft: 'floss1' },
    { name: 'an Land', to: [-1, -99.4], within: 0.5, run: false },
    { name: 'Checkpoint', to: [-2, -100.6], within: 0.6, run: false },
    { to: [0, -113.4], within: 0.4, run: false },
    { name: 'auf Floß 2', board: 'floss2' },
    { name: 'Floßstrecke II (Kreisgeister) und Abwärtsströmung', raft: 'floss2' },
    { name: 'Landeinsel', to: [0, -250.4], within: 0.5, run: false },
    { name: 'drei Großspuke im Licht auflösen', lightAll: ['ende1', 'ende2', 'ende3'] },
    { until: '=!ent(\'warp\').hidden', max: 240 },
    { name: 'Ziel-Warp-Box', warp: [5, -256] },
    { expect: '=P().pos.y > 8.5' },
    { name: 'Zielmast', to: [0, -296.4], within: 0.2 },
  ],
  routeChecks: [
    { name: 'beide Floßstrecken gefahren, Geister auf dem Weg ins Licht genommen (≥ 4 aufgelöst), drei Großspuke besiegt, Warp-Box benutzt', ok: (r) => r.mech.rafts === 2 && r.mech.looks > 0 && r.mech.ghostsGone >= 7 && r.mech.banished === 3 && r.mech.warps === 1 },
  ],
  targets: [
    { name: 'Stern 0: über der Kettenreihe – an den ersten Kettenzaun springen, von Zaun zu Zaun, oben über dem letzten springen', star: 0, from: [-5, 1, -6.2],
      legs: [{ fence: [-5, -10.6], jumpAt: 4 }, { fenceTo: [-6.0, 2.4] }, { fenceHop: [-8.2, -10.6] }, { fenceTo: [-9.2, 2.4] }, { fenceHop: [-11.4, -10.6] },
        { fenceTo: [-11.4, 3.0] }, { fenceHop: [-11.4, -13.2], seek: [-11.4, 5.9, -10.6], hold: 40 }, { wait: 60 }, { star: 0 }], shot: 'stern0' },
    { name: 'Stern 0 nicht vom Ufer aus (Sprung zu kurz und zu niedrig)', star: 0, expectNot: true, from: [-9, 1, -6.2], heroes: ['lotti'],
      legs: [{ to: [-11.4, -10.2], jump: 40, within: 0.3, max: 240, land: false }, { wait: 120 }] },
    { name: 'Stern 1: vom Floß auf die unsichtbare Plattform über dem Weg springen, Stern holen, zurück aufs Floß', star: 1, from: [0, 1, -6.9], place: { helmet: 'licht' },
      legs: [{ board: 'floss1' }, { raft: 'floss1', until: '=ent(\'floss1\').mb.pos.z < -32.6' }, { to: [-5, -35], jump: 40, within: 0.5, land: true },
        { expect: '=P().pos.y > 3.5' }, { to: [-5, -40.4], within: 0.3, run: false }, { star: 1 },
        { until: '=ent(\'floss1\').mb.pos.z < -40.5', max: 900 }, { board: 'floss1' }, { raft: 'floss1', until: '=ent(\'floss1\').mb.pos.z < -50' }], shot: 'stern1' },
    { name: 'Stern 1 nicht ohne Sprung (das Floß fährt unter der Plattform durch)', star: 1, expectNot: true, from: [0, 1, -6.9], heroes: ['lotti'],
      legs: [{ board: 'floss1' }, { raft: 'floss1', until: '=ent(\'floss1\').mb.pos.z < -48' }] },
    { name: 'Stern 2: über der Ziel-Warp-Box per Wandsprung (zwischen den Felswänden)', star: 2, from: [5, -3, -253.4],
      legs: [{ to: [5, -256], within: 0.2, run: false }, { wallclimb: { dir: 1, until: -3 + 7.4, z: -256, then: [5, -256], max: 900 } }, { star: 2 }], shot: 'stern2' },
    { name: 'Stern 2 nicht ohne Wandsprünge (einfacher Sprung zwischen den Wänden)', star: 2, expectNot: true, from: [5, -3, -253.4], heroes: ['lotti'],
      legs: [{ to: [5, -256], within: 0.2, run: false }, { hop: 40 }, { wait: 30 }] },
  ],
  extra: [
    { name: 'Ziel-Warp-Box bleibt verborgen, solange ein Großspuk übrig ist (zwei besiegt), erscheint nach dem dritten', from: [0, -3, -250.4], heroes: ['lotti'], place: { helmet: 'licht' },
      legs: [{ lightAll: ['ende1', 'ende2'] }, { wait: 120 }, { expect: '=ent(\'warp\').hidden === true' }, { lightAll: ['ende3'] }, { until: '=!ent(\'warp\').hidden', max: 240 }],
      mech: (r) => r.mech.banished === 1 && !r.log.some((l) => String(l[0]).startsWith('FEHLER')), mechText: (r) => `zuletzt besiegt ${r.mech.banished}` },
    { name: 'Großspuk: Draufspringen hilft nicht (verletzt), nur Licht', from: [-2, -3, -252], heroes: ['lotti'], invuln: false, allowFail: true,
      legs: [{ jumpOnKind: 'spuk', max: 600 }, { wait: 30 }], mech: (r) => r.mech.hurts >= 1 && r.ghostAlive, mechText: (r) => `Treffer ${r.mech.hurts}` , ghost: 'ende1' },
    { name: 'Lichtkegel macht die unsichtbare Plattform sichtbar (Fahrt auf Floß 1 mit Licht-Helm)', from: [0, 1, -6.9], heroes: ['lotti'], place: { helmet: 'licht' },
      legs: [{ board: 'floss1' }, { raft: 'floss1', until: '=ent(\'floss1\').mb.pos.z < -31' },
        { face: [0, -1], n: 12, pause: 60 },
        { raft: 'floss1', until: '=ent(\'floss1\').mb.pos.z < -33.5' }], named: 'lichtsteg',
      mech: (r) => r.ring?.lightTime > 0.3, mechText: (r) => `Lichtzeit ${r.ring?.lightTime} s, lit ${r.ring?.lit}` },
    { name: 'Gegenprobe: ohne Licht-Helm bleibt die Plattform unsichtbar', from: [0, 1, -6.9], heroes: ['lotti'],
      legs: [{ board: 'floss1' }, { raft: 'floss1', until: '=ent(\'floss1\').mb.pos.z < -33' }], named: 'lichtsteg',
      mech: (r) => r.ring?.lightTime === 0 && r.ring?.lit < 0.05, mechText: (r) => `Lichtzeit ${r.ring?.lightTime} s` },
    { name: 'Licht-Helm am Start liegt nach dem Aufheben wieder da (vier Helme, Nachschub)', from: [0, 1, 6], heroes: ['lotti'], probe: 'helme' },
  ],
  shots: [
    ['start', [0, 1, 6]],
    ['kette', [-4, 1, -6]],
    ['floss1', [0, 1.2, -9.5], 560, { raft: 'floss1' }],
    ['cp', [-2, 1, -100]],
    ['landeinsel', [0, -3, -251]],
    ['ziel', [0, 9, -284]],
  ],
};

// ------------------------------------------------------------------ P-4 (Basis 2-3: nur die Schattenbühne)
const Z4 = -87.5;
/** Bedingung: alle genannten Gegner besiegt (oder entfernt). */
const dead4 = (ids) => `=[${ids.map((i) => `'${i}'`).join(', ')}].every((i) => { const e = ent(i); return !e || e.defeated || e.removed || !e.alive; })`;
const P4_ALL = ['g_p1', 'g_k1', 'g_s1', 'grosser_turm', 'g_pk', 'g_p3', 'riese', 'g_p4', 'g_p5', 'g_s2', 'g_k2'];
ROUTES['P-4'] = {
  base: '2-3',
  start: [0, 2.5, -74.4],
  meta: { stars: 3, time: 100, theme: 'shadow', music: 'course_shadow', variant: 'schnell', archetype: 'parcours' },
  enemies: { pilzlingsturm: 1, pilzling: 4, krallen_pilzling: 2, panzerkroete: 1, schnappblume: 2, riesenschnappblume: 1, feuer_schnappblume: 0, wuschel: 2,
    helm_kanone: 3, kampfraum: 1, warpbox: 1, crate: 0, checkpoint: 0 },
  main: [
    { name: 'Kanonen-Helm im Gang', to: [0, -78.6], within: 0.3, run: false },
    { expect: '=P().helmet === \'kanone\'' },
    { name: 'Bühne', to: [0.6, Z4], within: 0.3, run: false },
    { face: [1, 0], exact: true },
    { name: 'erste Bohlen freischießen (Pilzling, Krallen-Pilzling, Schnappblume)', until: dead4(['g_p1', 'g_k1', 'g_s1']), max: 1200 },
    { to: [9.4, Z4] },
    { name: 'Schattenplatte A', to: [12.3, Z4], jump: 40 },
    { name: 'Wuschel oben, dann im Abstieg unten abwarten', until: '=ent(\'wu_a\').pos.y > 6.6', max: 900 }, { until: '=ent(\'wu_a\').pos.y < 2.4', max: 900 },
    { name: 'Schattenplatte B', to: [15.9, Z4], jump: 40 },
    { name: 'Schattenplatte C', to: [19.5, Z4], jump: 40 },
    { face: [1, 0], exact: true },
    { name: 'großen Turm umschießen', until: dead4(['grosser_turm']), max: 1500 },
    { name: 'Bühnenboden 2', to: [22.6, Z4], jump: 16 },
    { face: [1, 0], exact: true },
    { name: 'Panzerkröte', until: dead4(['g_pk']), max: 900 },
    { to: [28.4, Z4] },
    { name: 'über die Falltür', to: [32.6, Z4], jump: 40 },
    { face: [1, 0], exact: true },
    { name: 'Riesenschnappblume (drei Treffer) und Pilzlinge', until: dead4(['g_p3', 'riese', 'g_p4', 'g_p5', 'g_s2']), max: 2400 },
    { to: [41, Z4] },
    { name: 'Krallen-Pilzling am Bühnenende', until: dead4(['g_k2']), max: 900 },
    { expect: dead4(P4_ALL) },
    { name: 'Bühnenboden 4', to: [47.4, Z4] },
    { to: [53.2, Z4], within: 0.25, run: false },
    { name: 'Wuschel oben, dann im Abstieg unten abwarten', until: '=ent(\'wu_b\').pos.y > 7.0', max: 900 }, { until: '=ent(\'wu_b\').pos.y < 4.4', max: 900 },
    { name: 'Schattenstufe H', to: [55.3, Z4], jump: 40, within: 0.3 },
    { name: 'Schattenstufe I', to: [58.2, Z4], jump: 40 },
    { name: 'Podest', to: [59.85, Z4], jump: 40, within: 0.3 },
    { until: '=!ent(\'warp_ziel\').hidden', max: 240 },
    { name: 'Ziel-Warp-Box', warp: [65.2, Z4] },
    { expect: '=P().pos.x > 74' },
    { name: 'Zielmast', to: [91, -88], within: 0.2 },
  ],
  routeChecks: [
    { name: 'alle 11 Gegner der Bühne besiegt (Kampfraum frei), Turm mit dem Kanonen-Helm umgeworfen, Warp-Box benutzt, < 100 s', ok: (r) => r.mech.raum?.state === 'done' && r.mech.raum?.total === 11 && r.mech.towerDown && r.mech.warps === 1 && r.time < 100 },
  ],
  targets: [
    { name: 'Stern 0: Wurfsichel aus dem ?-Block holen, Kanonen-Helm absetzen, vom unsichtbaren Sims durch den Schlitz der unsichtbaren Loge über der Tür werfen', star: 0, from: [46.6, 2.5, Z4], place: { helmet: 'kanone' },
      legs: [{ face: [1, 0], exact: true }, { until: dead4(['g_s2', 'g_k2']), max: 1200 }, { to: [50.6, Z4], within: 0.2, run: false }, { hop: 30 }, { to: [49.2, Z4], within: 0.2, run: false },
        { name: 'auf den ?-Block (Wurfsichel)', to: [50.6, Z4], jump: 60, airMax: 1.6, within: 0.3 }, { chaseKind: 'powerup', max: 600 }, { expect: 'sichel' },
        { to: [53.4, Z4] }, { to: [55.3, Z4], jump: 40, within: 0.3 }, { until: '=ent(\'wu_b\').pos.y > 7.0', max: 900 }, { until: '=ent(\'wu_b\').pos.y < 3.2', max: 900 }, { to: [58.2, Z4], jump: 40 }, { to: [59.85, Z4], jump: 40, within: 0.3 },
        { name: 'Sims links der Loge', to: [61.0, Z4], jump: 40, within: 0.25 }, { expect: '=P().pos.y > 9.7' },
        { dropHelmet: true }, { expect: '=!P().helmet' }, { throwAt: [70, Z4], wait: 200 }], shot: 'stern0' },
    { name: 'Stern 0 nicht ohne Wurfsichel (die Loge ist zu, der Schlitz zu eng – Sprünge vom Sims und vom Dach)', star: 0, expectNot: true, from: [61.0, 9.85, Z4], heroes: ['lotti'],
      legs: [{ to: [63.4, Z4], jump: 40, within: 0.3, max: 240, land: false }, { wait: 60 }, { to: [63.4, Z4], within: 0.3, max: 300 }, { crouch: 30 }, { to: [61.4, Z4], within: 0.3, max: 300 }, { wait: 60 }] },
    { name: 'Stern 0 nicht mit der Sichel vom Podest aus (zu tief: sie prallt an der Loge ab)', star: 0, expectNot: true, from: [60.6, 7, Z4], heroes: ['lotti'], place: { power: 'sichel' },
      legs: [{ throwAt: [70, Z4], wait: 200 }, { hop: 40 }, { throwAt: [70, Z4], wait: 200 }] },
    { name: 'Stern 1: links vom großen Turm – Turm umschießen, von Schattenplatte C auf die unsichtbare Stufe springen', star: 1, from: [19.5, 3.6, Z4], place: { helmet: 'kanone' },
      legs: [{ face: [1, 0], exact: true }, { until: dead4(['grosser_turm']), max: 1500 }, { to: [20.3, Z4], within: 0.15, run: false },
        { name: 'unsichtbare Stufe', to: [23.1, Z4], jump: 60, airMax: 4, within: 0.3 }], shot: 'stern1' },
    { name: 'Stern 1 nicht von den Bohlen aus (die unsichtbare Stufe hält den Kopf auf)', star: 1, expectNot: true, from: [23.6, 2.5, Z4], heroes: ['lotti'],
      legs: [{ hop: 60 }, { to: [23.1, Z4], jump: 60, within: 0.2, max: 300, land: false }, { wait: 60 }] },
    { name: 'Stern 2: Sims rechts vom Turm – von der ersten Schattenplatte über der Riesenschnappblume hinüberspringen', star: 2, from: [32.6, 2.5, Z4], place: { helmet: 'kanone' },
      legs: [{ to: [34, Z4], jump: 40, within: 0.3 }, { expect: '=P().pos.y > 4.8' }, { to: [34.7, Z4], within: 0.15, run: false },
        { name: 'Sims', to: [30.6, Z4], jump: 60, jumpAt: 3.1, airMax: 3.5, within: 0.3 }], shot: 'stern2' },
    { name: 'Stern 2 nicht von den Bohlen aus (Sims zu hoch)', star: 2, expectNot: true, from: [32.0, 2.5, Z4], heroes: ['lotti'],
      legs: [{ to: [30.4, Z4], jump: 60, within: 0.3, max: 300, land: false }, { wait: 90 }] },
  ],
  extra: [
    { name: 'Ziel-Warp-Box bleibt verborgen, solange ein Gegner übrig ist (Turm steht), erscheint nach dem letzten', from: [19.5, 3.6, Z4], heroes: ['lotti'], probe: 'p4raum' },
    { name: 'Großer Turm: Stampfen/Draufspringen geht nicht (18,8 m hoch), Panzer/Feuer nehmen je eine Stufe, die Kanonenkugel wirft ihn ganz um', from: [19.5, 3.6, Z4], heroes: ['lotti'], probe: 'p4turm' },
    { name: 'Kanonen-Helm im Gang liegt nach dem Aufheben wieder da', from: [0, 2.5, -74.4], heroes: ['lotti'], probe: 'p4helm' },
    { name: 'Unterbühne (Falltür): über die Stufe unter der Falltür wieder hinauf auf die Bohlen', from: [27.4, -1.5, Z4], heroes: ['lotti', 'greta'],
      legs: [{ to: [29.6, Z4], within: 0.25, run: false }, { to: [30.25, Z4], jump: 30, within: 0.3 }, { expect: '=P().pos.y > -0.4' }, { to: [32.4, Z4], jump: 60, within: 0.4 }, { expect: '=P().pos.y > 2.4' }] },
    { name: 'Route auch verwundbar gefahren: kein Treffer (Helm bleibt auf), alle besiegt, Ziel in < 100 s', from: [0, 2.5, -74.4], legsFrom: 'main', invuln: false,
      mech: (r) => r.status === 'goal' && r.mech.hurts === 0 && r.mech.raum?.state === 'done' && r.time < 100, mechText: (r) => `${r.time.toFixed(1)} s, Treffer ${r.mech.hurts}` },
  ],
  shots: [
    ['start', [0, 2.5, -74.4]],
    ['buehne', [1, 2.5, Z4]],
    ['turm', [19.5, 3.6, Z4]],
    ['falltuer', [27, 2.5, Z4]],
    ['riese', [33, 2.5, Z4]],
    ['sichelblock', [47.4, 2.5, Z4]],
    ['podest', [60.2, 7, Z4]],
    ['logensims', [61, 9.85, Z4]],
    ['ziel', [83, 2.5, -88]],
  ],
};

const PORT = 5035;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,rules,route,sweep,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

// Musik-Aufrufe mitschneiden (music.play(name, opts)): window.__audio wird in main.js gesetzt → Setter umhüllt play
await page.addInitScript(() => {
  let a;
  Object.defineProperty(window, '__audio', {
    configurable: true,
    get() { return a; },
    set(v) {
      a = v;
      const m = v?.music;
      if (m && !m.__spy) { const orig = m.play.bind(m); m.__calls = []; m.play = (n, o) => { m.__calls.push([n, o ?? null]); return orig(n, o); }; m.__spy = true; }
    },
  });
});

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const TAU = Math.PI * 2;
  const norm = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a <= -Math.PI) a += TAU; return a; };
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? src?.type ?? src?.constructor?.name ?? String(src); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null;
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    krallen: () => P().power === 'krallen',
    funken: () => P().power === 'funken',
    sichel: () => P().power === 'sichel',
  };
  /** Bedingung: Name aus COND oder Ausdruck '=…' (Variablen P, L, ent, at). */
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', `return (${k.slice(1)});`)(P, L, ent, at) : COND[k]());
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
      if (p.helmet) { p.helmet = null; p.helmetFx = null; }
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (o.helmet) p.wearHelmet(o.helmet);
      L.runtime.status = 'play';
      if (o.timeLeft) L.runtime.timeLeft = o.timeLeft;
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
    /** Steg-Winkel eines Riesenrads (normiert auf (−π, π]). */
    plankAngle(id, i) { const h = L.named.get(id); return norm(h.angle + (i / h.planks.length) * TAU); },
    clocksTaken() { const h = L.named.get('uhren'); return h ? h.items.filter((i) => i.taken).length : 0; },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, stomped: [], hurtList: [] };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let rode = false, plank = null;
      const clocks0 = this.clocksTaken();
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (window.__trace && steps % 8 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, inp?.jump ? 'J' : '']);
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist.slice(-8))]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'glasnetz' || kind === 'glasspipe' || kind === 'pipe') mech.pipes++;
          mech.rides++;
          rode = true;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      const goTo = (x, z, r = 0.25) => { for (let n = 0; n < 400 && !p.dead; n++) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz); if (d < r && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); } };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        rode = false;
        if (Lg.wait && !Lg.to && !Lg.throwAt) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.face) {
          const y0 = p.yaw;
          if (Lg.exact) {
            // genau ausrichten (Kanonen-Helm: die Kugel fliegt in Blickrichtung) – kleine Lenkung, bis die Blickrichtung passt
            for (let i = 0; i < 240; i++) { const fv = p.facingVec(), l = Math.hypot(Lg.face[0], Lg.face[1]); if ((fv.x * Lg.face[0] + fv.z * Lg.face[1]) / l > 0.9998 && i >= 4) break; tick({ ...this.stick(Lg.face[0], Lg.face[1], Lg.mag ?? 0.16), run: false }); }
            for (let i = 0; i < (Lg.pause ?? 6); i++) tick({});
            log.push(['blick', `${Lg.face}`, +y0.toFixed(2), +p.yaw.toFixed(3)]);
            continue;
          }
          for (let i = 0; i < (Lg.n ?? 10); i++) tick({ ...this.stick(Lg.face[0], Lg.face[1], Lg.mag ?? 0.35), run: false });
          for (let i = 0; i < (Lg.pause ?? 30); i++) tick({});
          log.push(['blick', `${Lg.face}`, +y0.toFixed(2), +p.yaw.toFixed(2)]);
          continue;
        }
        if (Lg.log) { log.push(['wert', Lg.log, JSON.stringify(new Function('P', 'L', 'ent', `return (${Lg.log});`)(P, L, ent))]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until && !Lg.ridePlank && !Lg.raft) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.stomp) {
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: true });
          for (let k = 0; k < 30; k++) tick({});
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Münzen einer Herausforderung (Art) der Reihe nach einsammeln (nächste zuerst)
        if (Lg.coins) {
          let k = 0, nPrev = -1;
          const alive = () => L.entities.filter((e) => e.kind === Lg.coins && e.alive && !e.removed && !e.hidden);
          for (; k < (Lg.max ?? 2400) && alive().length && !p.dead; k++) {
            if (alive().length !== nPrev) { nPrev = alive().length; log.push(['münze', nPrev, k, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), alive().map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1)]).slice(0, 3)]); }
            const list = alive();
            list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz), dy = e.pos.y - p.pos.y;
            const jump = (dy > 0.9 && d < 3.2) || (p.mode === 'air' && p.vel.y > 0 && dy > 0.4);
            tick({ ...(p.mode === 'air' ? this.airSteer(e.pos.x, e.pos.z, 0, 0, 3.4, 9) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), run: d > 2.5, jump });
          }
          log.push(['münzen', Lg.coins, k, alive().length]);
          if (alive().length) log.push(['FEHLER: Münzen übrig', alive().length]);
          continue;
        }
        // ------------------------------------------------ auf einen Gegner der Art springen (Treffer zählen)
        if (Lg.jumpOnKind) {
          const e = L.entities.filter((x) => x.kind === Lg.jumpOnKind && x.alive && !x.removed).sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))[0];
          if (!e) { log.push(['FEHLER: kein Gegner', Lg.jumpOnKind]); continue; }
          const r = this.jumpOn(e, { max: Lg.max ?? 600, until: () => (p.hurtTries ?? 0) > 0 || p.dead });
          log.push(['draufspringen', Lg.jumpOnKind, r.ok, r.steps]);
          continue;
        }
        // ------------------------------------------------ Gegner einer Art nahe near (Radius r) besiegen (draufspringen)
        if (Lg.defeat) {
          const [nx, nz] = Lg.near, rr = Lg.r ?? 5;
          let n = 0;
          for (let guard = 0; guard < 8; guard++) {
            const e = L.entities.filter((x) => x.kind === Lg.defeat && x.alive && !x.removed && !x.defeated && Math.hypot(x.pos.x - nx, x.pos.z - nz) < rr)
              .sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))[0];
            if (!e) break;
            this.jumpOn(e, { max: 900, tick });
            if (!e.alive || e.defeated || e.removed) { n++; mech.stomped.push(Lg.defeat); }
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['besiegt', Lg.defeat, n]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !p.dead; k++) { const dx = tx - p.pos.x, dz = tz - p.pos.z; tick({ ...this.stick(dx, dz, 1), run: false }); }
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, ok = false;
          const r0 = mech.rides;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const jump = p.mode === 'ground' ? d < 2.0 : p.vel.y > 0;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { ok = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (ok) mech.warps++;
          log.push(['warp', `${Lg.warp}`, ok, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!ok) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          for (let guard = 0; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre));
            if (!list.length) break;
            list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            this.jumpOn(e, { max: 900, tick });
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
            if (p.mode === 'air' && !pounded && d < 0.25 && p.vel.y < 1.5 && p.pos.y > (Lg.above ?? -99)) pounded = true;
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Riesenrad: auf einen Steg im Winkelbereich warten / mitfahren
        if (Lg.plank) {
          const h = L.named.get(Lg.plank);
          let n = 0, idx = -1;
          for (; n < 2400 && !p.dead && L.runtime.status === 'play'; n++) {
            for (let i = 0; i < h.planks.length; i++) { const a = this.plankAngle(Lg.plank, i); if (a >= Lg.pick[0] && a <= Lg.pick[1]) { idx = i; break; } }
            if (idx >= 0) break;
            tick({});
          }
          plank = { id: Lg.plank, i: idx };
          log.push(['steg', Lg.plank, idx, n]);
          if (idx < 0) { log.push(['FEHLER: kein Steg', li]); break; }
          continue;
        }
        if (Lg.ridePlank) {
          const b = L.named.get(plank.id).planks[plank.i];
          let n = 0;
          for (; n < 2400 && !p.dead && L.runtime.status === 'play'; n++) {
            const a = this.plankAngle(plank.id, plank.i);
            if (a >= Lg.until[0] && a <= Lg.until[1]) break;
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.45 ? { ...this.stick(dx, dz, Math.min(0.5, d)), run: false } : {});
          }
          log.push(['mitfahren', plank.id, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ alle Felder (Liste [x, z]) betreten
        if (Lg.tiles) {
          for (const [tx, tz] of Lg.tiles) goTo(tx, tz, 0.3);
          log.push(['felder', Lg.tiles.length]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen
        if (Lg.grab) {
          const [bx, bz] = Lg.grab;
          const back = Lg.back ?? [bx, bz + 2.2];
          const pw0 = p.power;
          goTo(bx, bz, 0.2);
          for (let k = 0; k < 90 && p.hSpeed() > 0.2; k++) tick({});
          for (let k = 0; k < 20; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          for (let k = 0; k < 60; k++) tick({});
          let tries = 0;
          for (; tries < 4 && p.power === pw0 && !p.dead; tries++) {
            goTo(back[0], back[1], 0.2);
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
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ mit dem Krallen-Anzug an einer Wand hinauf
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let k = 0, top = false;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.pos.y > (Lg.top ?? 99) - 0.1 && p.mode === 'ground') { top = true; break; }
            if (p.mode === 'wall') { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: false, jump: p.mode === 'ground' ? d < (Lg.jumpAt ?? 1.6) : p.vel.y > 0 });
          }
          if (Lg.then) goTo(Lg.then[0], Lg.then[1], 0.3);
          mech.climbs = (mech.climbs ?? 0) + (top ? 1 : 0);
          log.push(['klettern', `${Lg.climb}`, top, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.power]);
          if (!top) log.push(['FEHLER: Wand nicht erklommen', Lg.climb]);
          continue;
        }
        // ------------------------------------------------ an eine Bohnenranke springen/laufen (bis die Figur daran hängt)
        if (Lg.stalk) {
          const [tx, tz] = Lg.stalk;
          let k = 0;
          for (; k < (Lg.max ?? 400) && p.mode !== 'stalk' && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 5) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.2)))), run: false, jump: p.mode === 'ground' && d < 1.3 && (!!Lg.jump || (dz > 0.3 && k > 30)) });
          }
          log.push(['ranke', `${Lg.stalk}`, p.mode === 'stalk', k, +p.pos.y.toFixed(2)]);
          if (p.mode !== 'stalk') { log.push(['FEHLER: Ranke nicht gegriffen', Lg.stalk]); break; }
          continue;
        }
        // ------------------------------------------------ an der Ranke hinauf; Stachelringe abwarten (eingefahren vorbei)
        if (Lg.climbStalk) {
          let k = 0, still = 0, lastY = p.pos.y, waits = 0;
          const rings = L.entities.filter((e) => e.kind === 'stachelring' && p.stalk && Math.hypot(e.pos.x - p.stalk.x, e.pos.z - p.stalk.z) < 0.3);
          for (; k < (Lg.max ?? 3000) && p.mode === 'stalk' && !p.dead; k++) {
            const head = p.pos.y + p.half.y * 2, feet = p.pos.y;
            // nächster Ring über/an der Figur: Unterkante des Rings bis 1,3 m über dem Kopf bzw. noch nicht ganz passiert
            const r = rings.find((e) => { const y0 = e.pos.y, y1 = e.pos.y + e.half.y * 2; return y0 - head < 1.3 && y1 > feet - 0.05; });
            let go = true;
            if (r) {
              const t = r.phaseT(), left = r.state === 'ein' ? (r.period - r.warn) - t : -1;
              const inside = r.pos.y - head < 0.05;
              if (!inside && left < 0.75 && !Lg.noWait) go = false;   // noch unter dem Ring: warten, bis er lange genug eingefahren bleibt
            }
            if (go) tick({ x: 0, y: 1 }); else { waits++; tick({}); }
            if (go) { if (p.pos.y <= lastY + 1e-4) still++; else still = 0; }
            lastY = p.pos.y;
            if (still > 8) break;
          }
          mech.ringWaits = (mech.ringWaits ?? 0) + waits;
          log.push(['ranke hinauf', k, waits, +p.pos.y.toFixed(2), p.mode]);
          if (p.mode !== 'stalk') log.push(['FEHLER: von der Ranke gefallen', p.mode]);
          continue;
        }
        // ------------------------------------------------ von der Ranke abspringen (Stick zum Ziel), in der Luft hinlenken, landen
        if (Lg.jumpOff) {
          const [tx, tz] = Lg.jumpOff;
          let k = 0;
          tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 1), jump: true });
          for (; k < 400 && p.mode !== 'ground' && !p.dead; k++) tick({ ...this.airSteer(tx, tz, 0, 0, 3, 6), jump: k < (Lg.hold ?? 30) });
          log.push(['abgesprungen', `${Lg.jumpOff}`, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          continue;
        }
        // ------------------------------------------------ auf ein Floß springen (bis die Figur darauf steht)
        if (Lg.board) {
          const f = L.named.get(Lg.board);
          let k = 0, on = false;
          for (; k < 600 && !on && !p.dead; k++) {
            const q = f.mb.pos, dx = q.x - p.pos.x, dz = q.z - p.pos.z, d = Math.hypot(dx, dz);
            on = p.mode === 'ground' && p.ground?.tag === 'floss' && d < 0.9;
            if (on) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(q.x, q.z, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d))), jump: p.mode === 'ground' ? d < 3.2 && d > 0.9 : p.vel.y > 0, run: false });
          }
          log.push(['auf dem Floß', Lg.board, on, k]);
          if (!on) log.push(['FEHLER: nicht auf das Floß', Lg.board]);
          continue;
        }
        // ------------------------------------------------ auf dem Floß mitfahren (Mitte halten); mit Licht-Helm zum nächsten Geist
        // schauen (der Lichtkegel löst ihn auf), sonst Spuke ansehen (sie erstarren) – bis zum Ende bzw. Bedingung
        if (Lg.raft) {
          const f = L.named.get(Lg.raft);
          let k = 0, lost = false, prev = null, rvx = 0, rvz = 0, looks = 0;
          const GHOST = new Set(['spuk', 'kreisgeist']);
          for (; k < (Lg.max ?? 9000) && !p.dead; k++) {
            if (Lg.until && cond(Lg.until)) break;
            if (!Lg.until && f.state === 'ende' && p.mode === 'ground') break;
            const q = f.mb.pos;
            if (prev) { rvx = (q.x - prev[0]) * 120; rvz = (q.z - prev[1]) * 120; }
            prev = [q.x, q.z];
            let g = null, gd = 7.5;
            for (const e of L.entities) {
              if (!GHOST.has(e.kind) || !e.alive || e.removed || e.defeated || e.state === 'defeated') continue;
              const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
              if (d < gd && Math.abs(e.pos.y - p.pos.y) < 5) { gd = d; g = e; }
            }
            const dx = q.x - p.pos.x, dz = q.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'air') { tick({ ...this.airSteer(q.x, q.z, rvx, rvz, 3, 7) }); continue; }
            if (g && d < 0.7) {
              // zum Geist drehen (kleiner Stick, fast auf der Stelle), Mitte halten
              const fv = p.facingVec(), gx = g.pos.x - p.pos.x, gz = g.pos.z - p.pos.z, gl = Math.hypot(gx, gz) || 1;
              const dot = (fv.x * gx + fv.z * gz) / gl;
              looks++;
              tick(dot < 0.96 ? { ...this.stick(gx, gz, 0.14), run: false } : {});
              continue;
            }
            if (d <= 0.12) {
              // in Fahrtrichtung schauen (wie ein Kind auf dem Floß), sonst stillstehen
              const sp = Math.hypot(rvx, rvz), fv = p.facingVec();
              const dot = sp > 0.5 ? (fv.x * rvx + fv.z * rvz) / sp : 1;
              tick(dot < 0.9 ? { ...this.stick(rvx, rvz, 0.14), run: false } : {});
            } else tick({ ...this.stick(dx, dz, Math.min(0.75, d * 1.2)), run: false });
            if (p.mode === 'ground' && p.ground?.tag !== 'floss') { lost = true; break; }
          }
          mech.rafts = (mech.rafts ?? 0) + 1;
          mech.looks = (mech.looks ?? 0) + looks;
          log.push(['Floßfahrt', Lg.raft, k, f.state, looks, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (lost || p.dead || (!Lg.until && f.state !== 'ende')) log.push(['FEHLER: Floßfahrt', Lg.raft, lost, p.ground?.tag]);
          continue;
        }
        // ------------------------------------------------ Geister (Ids) mit dem Licht-Helm auflösen: hingehen (≈ 4 m), anschauen, warten
        if (Lg.lightAll) {
          let k = 0;
          const alive = () => Lg.lightAll.map((id) => ent(id)).filter((e) => e && e.alive && !e.removed && e.state !== 'defeated');
          for (; k < (Lg.max ?? 6000) && alive().length && !p.dead; k++) {
            const list = alive().sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            const gx = e.pos.x - p.pos.x, gz = e.pos.z - p.pos.z, gl = Math.hypot(gx, gz) || 1;
            const fv = p.facingVec(), dot = (fv.x * gx + fv.z * gz) / gl;
            if (gl > (Lg.dist ?? 4.5)) { tick({ ...this.stick(gx, gz, Math.min(1, (gl - 3.5) / 2 + 0.3)), run: false }); continue; }
            if (gl < 1.8) { tick({ ...this.stick(-gx, -gz, 0.7), run: false }); continue; }
            tick(dot < 0.97 ? { ...this.stick(gx, gz, 0.14), run: false } : {});
          }
          mech.banished = Lg.lightAll.length - alive().length;
          log.push(['Licht', Lg.lightAll.join(','), k, mech.banished, p.helmet]);
          if (alive().length) log.push(['FEHLER: Geister übrig', alive().length]);
          continue;
        }
        // ------------------------------------------------ Wandsprung-Kette zwischen zwei Wänden (erste Wand in Richtung dir = ±1 entlang X)
        if (Lg.wallclimb) {
          const w = Lg.wallclimb;
          let dir = w.dir, last = false, phase = 'in', top = false, k = 0, jumps = 0;
          const zfix = () => (w.z === undefined ? 0 : Math.max(-1, Math.min(1, ((w.z - p.pos.z) * 3 - p.vel.z) * 0.5)));
          const inp = (wx, wz) => (Math.hypot(wx, wz) < 0.02 ? { x: 0, y: 0 } : this.stick(wx, wz, Math.min(1, Math.hypot(wx, wz))));
          for (; k < (w.max ?? 900) && !p.dead; k++) {
            if (phase === 'in') { tick({ ...inp(dir, zfix()), jump: k < 24 }); last = k < 24; if (p.mode === 'wall') phase = 'chain'; }
            else if (p.mode === 'wall' && !top) {
              if (last) { tick({}); last = false; } else { tick({ jump: true }); last = true; jumps++; if (p.mode !== 'wall') dir = -dir; }
            } else {
              top = top || p.pos.y >= w.until;
              let i2 = inp(dir, zfix());
              if (top && w.then) { const vx = (w.then[0] - p.pos.x) * 2.5 - p.vel.x, vz = (w.then[1] - p.pos.z) * 2.5 - p.vel.z; i2 = inp(vx, vz); }
              else if (top) i2 = { x: 0, y: 0 };
              tick({ ...i2, jump: !top });
              last = !top;
              if (p.mode === 'ground' && phase === 'chain') break;
            }
            if (w.stop && cond(w.stop)) top = true;
          }
          log.push(['wandsprünge', jumps, k, top, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Kettenzaun/Klettergitter: hinspringen und greifen
        if (Lg.fence) {
          const [tx, tz] = Lg.fence;
          let k = 0;
          for (; k < 300 && !p.fence && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, 1)), jump: p.mode === 'ground' ? d < (Lg.jumpAt ?? 4) : p.vel.y > 0, run: false });
          }
          log.push(['zaun', `${Lg.fence}`, !!p.fence, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!p.fence) { log.push(['FEHLER: Zaun nicht gegriffen', Lg.fence]); break; }
          continue;
        }
        // ------------------------------------------------ am Zaun klettern bis (x, y) (Stick in der Zaunebene; Bildschirm rechts = +X)
        if (Lg.fenceTo) {
          const [tx, ty] = Lg.fenceTo;
          let k = 0;
          for (; k < 1200 && p.fence && !p.dead; k++) {
            const ex = tx - p.pos.x, ey = ty - p.pos.y;
            if (Math.abs(ex) < 0.2 && Math.abs(ey) < 0.2) break;
            tick({ x: Math.max(-1, Math.min(1, ex * 2)), y: Math.max(-1, Math.min(1, ey * 2)) });
          }
          log.push(['am zaun', `${Lg.fenceTo}`, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), !!p.fence]);
          continue;
        }
        // ------------------------------------------------ vom Zaun abspringen (Stick zum Ziel), in der Luft hinlenken – bis zum nächsten Zaun bzw. Boden
        if (Lg.fenceHop) {
          const [tx, tz] = Lg.fenceHop;
          const from = p.fence?.obj ?? null;
          let k = 0;
          tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 1), jump: true });
          for (; k < 300 && !p.dead; k++) {
            if (p.fence && p.fence.obj !== from) break;
            if (p.mode === 'ground') break;
            if (Lg.seek && Math.hypot(Lg.seek[0] - p.pos.x, Lg.seek[2] - p.pos.z) < 0.6 && Math.abs(Lg.seek[1] - p.pos.y) < 1.4) { tick({ jump: k < 30 }); continue; }
            tick({ ...this.airSteer(tx, tz, 0, 0, 3, 6), jump: k < (Lg.hold ?? 30) });
          }
          log.push(['zaunsprung', `${Lg.fenceHop}`, k, !!p.fence, p.fence?.obj?.spec?.id ?? null, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          continue;
        }
        // ------------------------------------------------ Tatzenhieb (Krallen-Anzug) in Richtung [dx, dz]
        if (Lg.swipe) {
          const [dx, dz] = Lg.swipe;
          for (let n = 0; n < 12; n++) tick({ ...this.stick(dx, dz, 0.15), run: false });
          for (let n = 0; n < (Lg.n ?? 2); n++) { tick({ action: true }); for (let q = 0; q < 40; q++) tick({}); }
          log.push(['tatzenhieb', `${Lg.swipe}`, p.power]);
          continue;
        }
        // ------------------------------------------------ Weitsprung
        if (Lg.long) {
          const [tx, tz] = Lg.long;
          let k = 0, longed = false;
          const ru = Lg.runup ?? 10;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (k > ru + 20 && p.mode === 'ground') break;
            if (p.state === 'longjump') longed = true;
            if (p.mode === 'air') { tick({ ...this.airSteer(tx, tz, 0, 0, 2.5, 14) }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: true, crouch: k >= ru && k < ru + 3, jump: k >= ru + 2 && k < ru + 6 });
          }
          log.push(['weitsprung', `${Lg.long}`, longed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Trage-Helm absetzen (Ducken + Aktion)
        if (Lg.dropHelmet) {
          const h0 = p.helmet;
          for (let k = 0; k < 12; k++) tick({ crouch: true });
          tick({ crouch: true, action: true });
          for (let k = 0; k < 20; k++) tick({ crouch: true });
          for (let k = 0; k < 30; k++) tick({});
          log.push(['helm ab', h0, p.helmet]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel auf einen Punkt werfen, Rückkehr abwarten
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
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        const target = () => {
          if (Lg.toPlank) { const b = L.named.get(plank.id).planks[plank.i]; return [b.pos.x, b.pos.z]; }
          return [Lg.to[0] ?? p.pos.x, Lg.to[1]];
        };
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          if (rode && Lg.endOnRide !== false && (Lg.endOnRide || Lg.toPlank)) break;
          const [tx, tz] = target();
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, Lg.airK ?? 2.6, Lg.airMax ?? 11);
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
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, +L.runtime.timeLeft.toFixed(1)]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.clocks = this.clocksTaken() - clocks0;
      mech.ghostsGone = L.entities.filter((e) => (e.kind === 'spuk' || e.kind === 'kreisgeist') && (!e.alive || e.removed || e.state === 'defeated')).length + (L.data.id === 'P-3' ? 13 - L.entities.filter((e) => e.kind === 'spuk' || e.kind === 'kreisgeist').length : 0);
      mech.bells = ['baum1', 'baum2', 'baum3'].map((id) => L.named.get(id)?.rung ?? null).filter((v) => v !== null);
      mech.lives = L.runtime.save?.lives;
      mech.raum = L.entities.find((e) => e.kind === 'kampfraum' && !e.removed)?.info?.() ?? null;
      { const t = ent('grosser_turm'); mech.towerDown = L.data.id === 'P-4' ? (!t || t.defeated || t.removed) : null; }
      return { log, autoJumps, steps, time: steps / 120, keys: L.keys?.schluessel?.n ?? 0, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, deathCause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
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
    /** Gegner e mit echter Eingabe anlaufen und draufspringen (in der Luft auf ihn lenken). → { ok, steps } */
    jumpOn(e, o = {}) {
      const p = P();
      let n = 0;
      const done = o.until ?? ((x) => x.defeated || x.removed || !x.alive);
      const tick = o.tick ?? ((inp) => { c.setInput(inp); c.step(1); });
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
        tick(inp);
      }
      c.setInput({}); c.step(3);
      return { ok: done(e), steps: n };
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt: Aufrufe, Dreiecke. */
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) if (!e.removed) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = ent(id); return e?.info?.() ?? (e ? { state: e.state ?? null } : null); },
    noClocks() { const h = L.named.get('uhren'); if (h) for (const it of h.items) { it.taken = true; it.pop = 1; } },
    cond: (k) => cond(k),
  };
  window.__pa = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__pa[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}pilz_a_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__pa.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ------------------------------------------------------------------ Remix-Regeln je Level (Daten + Laufzeit, Gegenprobe Basis)
const RULES = {
  'P-1': async (R) => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, CL = window.__courseLevels;
      const base = CL.get('2-4'), raw = CL.raw('P-1');
      const calls = window.__audio?.music?.__calls ?? [];
      const ents = (k) => L.entities.filter((e) => e.kind === k && !e.removed);
      let deep = 0, meadow = 0;
      L.world.forEach?.((s) => { if (s.kill) return; if (s.z0 > -24.4 && s.min?.[1] >= 0) meadow++; if (s.y1 < -30) deep++; });
      return {
        stub: CL.isRemix(raw) && raw.remix.base === '2-4' && !raw.segments, remix: L.data.remix, theme: L.data.theme, light: c.view.theme.light,
        hemi: c.view.theme.hemi.intensity, moon: !!c.view.sky.lightMoon, starsSky: !!c.view.sky.lightStars,
        music: L.data.music, variant: L.data.musicVariant, call: calls.filter((x) => x[0] === 'course_hills').slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
        limit: L.runtime.timeLimit, cp: ents('checkpoint').length, stamp: ents('stamp').length, maus: ents('huepfmaus').length, stachel: ents('huepfmaus_stachel').length,
        kugler: ents('stachelkugler').length, ring: ents('roter_ring').length, starring: ents('starring').length, schalter: ents('figurenschalter').length,
        pipesMeadow: !!L.named.get('g_links') || !!L.named.get('g_rechts'), meadowEnts: L.entities.filter((e) => !e.removed && e.pos.z > -24 && e.kind !== 'zeituhren').map((e) => e.kind),
        clocks: L.named.get('uhren')?.items.length ?? 0, sec: L.named.get('uhren')?.sec,
        baseTheme: base.theme, baseMusic: base.music, baseVariant: base.musicVariant ?? null, baseLimit: base.timeLimit, baseMaus: base.enemies.filter((e) => e.kind === 'huepfmaus').length,
        baseCp: !!base.checkpoint, baseStamp: !!base.stamp, baseRing: base.items.some((i) => i.kind === 'roter_ring'), baseRemix: base.remix ?? null, baseTitle: base.title,
        baseKugler: base.enemies.filter((e) => e.kind === 'stachelkugler').length, baseClocks: base.segments.filter((s) => s.type === 'zeituhren').length,
        title: L.data.title,
      };
    });
    console.log(`  Remix: Basis ${r.remix.base}, ${r.remix.cut} weggeschnitten, ${r.remix.removed} entfernt, ${r.remix.replaced} ersetzt, ${r.remix.added} neu; Thema ${r.theme} (Himmelslicht ${r.hemi}, Mond ${r.moon}, Sterne ${r.starsSky}); Musik ${JSON.stringify(r.call)} → ${r.mVariant}`);
    check('P-1: Remix-Platzhalter (remixOf, Basis 2-4), eigener Titel', r.stub && r.title === 'Mondscheinwalzen am Mühlenhügel');
    check('P-1: Nacht-Beleuchtung (Thema grass@nacht: dunkles Himmelslicht, Mond, Sterne)', r.theme === 'grass@nacht' && r.light === 'nacht' && r.hemi < 0.8 && r.moon && r.starsSky);
    check('P-1: Musik der Basis mit Klang-Variante nacht → music.play(\'course_hills\', { variant: \'nacht\' })', r.music === 'course_hills' && r.variant === 'nacht' && r.call?.[1]?.variant === 'nacht' && r.mVariant === 'nacht');
    check(`P-1: Zeitdruck 30 s, ${r.clocks} Zeit-Uhren (+${r.sec} s), kein Checkpoint, kein Stempel`, r.limit === 30 && r.clocks >= 8 && r.sec === 5 && r.cp === 0 && r.stamp === 0);
    check(`P-1: Stachel-Hüpfmäuse statt Hüpfmäusen (${r.maus} → ${r.stachel}), ${r.kugler} Stachelkugler, Sternring statt rotem Ring`, r.maus === 0 && r.stachel >= 12 && r.kugler === 4 && r.ring === 0 && r.starring === 1);
    check(`P-1: kürzer – Graswiese mit Glasröhren und Figurenschaltern entfällt (Entitäten dort: ${r.meadowEnts.length})`, !r.pipesMeadow && r.schalter === 0 && r.meadowEnts.length === 0 && r.remix.cut > 20);
    check('P-1: Gegenprobe Basis 2-4 unverändert (Thema, Musik ohne Variante, 500 s, Hüpfmäuse, Checkpoint, Stempel, roter Ring, ohne Uhren/Kugler/Remix-Feld)',
      r.baseTheme === 'grass' && r.baseMusic === 'course_hills' && r.baseVariant === null && r.baseLimit === 500 && r.baseMaus === 6 && r.baseCp && r.baseStamp && r.baseRing
      && r.baseKugler === 0 && r.baseClocks === 0 && r.baseRemix === null && r.baseTitle === 'Hügelmühle');
  },
};

RULES['P-2'] = async () => {
  const r = await sc(() => {
    const c = window.__course, L = c.level, CL = window.__courseLevels;
    const base = CL.get('1-3'), raw = CL.raw('P-2');
    const calls = window.__audio?.music?.__calls ?? [];
    const ents = (k) => L.entities.filter((e) => e.kind === k && !e.removed);
    const stalk3 = L.data.segments.find((s) => s.type === 'beanstalk' && Math.abs(s.pos[2] + 171.05) < 0.01);
    const summit = L.world.raycastDown(0, 70, -211, 40);
    const climbs = []; L.world.forEach?.((s) => { if (s.tag === 'glockenbaum' && s.climbable) climbs.push(s.id); });
    return {
      stub: CL.isRemix(raw) && raw.remix.base === '1-3' && !raw.segments, theme: L.data.theme, light: c.view.theme.light, sunDisc: c.view.theme.sunDisc,
      music: L.data.music, variant: L.data.musicVariant, call: calls.filter((x) => x[0] === 'course_grass').slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
      limit: L.runtime.timeLimit, boss: ents('riesenschnappblume').length, task: ents('task').length, bridge: L.data.segments.some((s) => s.type === 'bridge' && Math.abs(s.from?.[1] - 30) < 0.1),
      kugler: ents('stachelkugler').length, werfer: ents('walzenwerfer').length, keys: ents('schluesselmuenze').length, box: L.named.get('zielbox')?.locked, rings: ents('stachelring').length,
      trees: ['baum1', 'baum2', 'baum3'].map((id) => L.named.get(id)?.top), climbs: climbs.length, stalk3: stalk3?.height, summitY: summit?.y, goalY: L.entities.find((e) => e.kind === 'goal')?.pos.y,
      oldPipe: !!L.named.get('zuPRaum'), newPipe: L.named.get('zuPRaum2') ? L.data.segments.find((x) => x.id === 'zuPRaum2')?.target : null, stamp: ents('stamp').length, claw: L.data.blocks.find((b) => b.kind === 'question' && Math.abs(b.pos[2] + 173.6) < 0.1)?.content,
      baseTheme: base.theme, baseVariant: base.musicVariant ?? null, baseBoss: base.enemies.some((e) => e.kind === 'riesenschnappblume'), baseBridge: base.segments.some((s) => s.type === 'bridge' && s.from?.[1] === 30),
      baseStalk3: base.segments.find((s) => s.type === 'beanstalk' && Math.abs(s.pos[2] + 171.05) < 0.01)?.height, baseGoalY: base.goal.pos[1], baseStamp: !!base.stamp, baseRemix: base.remix ?? null,
      baseKeys: base.items.filter((i) => i.kind === 'schluesselmuenze').length, baseFunken: base.blocks.find((b) => b.kind === 'question' && Math.abs(b.pos[2] + 173.8) < 0.1)?.content, baseTitle: base.title,
    };
  });
  console.log(`  Remix: ${JSON.stringify({ theme: r.theme, call: r.call, trees: r.trees, summitY: r.summitY, goalY: r.goalY, climbs: r.climbs, stalk3: r.stalk3, oldPipe: r.oldPipe, newPipe: r.newPipe, claw: r.claw })}`);
  check('P-2: Remix-Platzhalter (Basis 1-3), eigener Titel; Sonnenuntergang (grass@abend, Sonnenscheibe)', r.stub && r.theme === 'grass@abend' && r.light === 'abend' && r.sunDisc);
  check('P-2: Musik der Basis mit Klang-Variante abend → music.play(\'course_grass\', { variant: \'abend\' })', r.music === 'course_grass' && r.variant === 'abend' && r.call?.[1]?.variant === 'abend' && r.mVariant === 'abend');
  check(`P-2: Gipfelbrücke und Riesenschnappblume ersetzt durch 3 Glockenbäume (Kletterstämme ${r.climbs}, Kronen ${r.trees.join('/')})`, !r.bridge && r.boss === 0 && r.task === 0 && r.trees.every((t) => t > 30) && r.climbs === 3);
  check(`P-2: neu ${r.kugler} Stachelkugler, ${r.werfer} Walzenwerfer, ${r.rings} Stachelringe, 5 Schlüsselmünzen, Ziel-Warp-Box verschlossen, 500 s, kein Stempel`, r.kugler === 4 && r.werfer === 2 && r.rings === 5 && r.keys === 5 && r.box === true && r.limit === 500 && r.stamp === 0);
  check(`P-2: Gipfel 10 m höher (y ${r.summitY}), dritte Ranke ${r.stalk3} m, Röhre zum P-Schalter-Raum in der Rankennische statt in der POW-Nische, Krallen-Anzug vor dem Glockenhain`, Math.abs(r.summitY - 50) < 0.05 && Math.abs(r.goalY - 50) < 0.05 && r.stalk3 === 11.6 && !r.oldPipe && r.newPipe === 'pRaumEin' && r.claw === 'krallenAnzug');
  check('P-2: Gegenprobe Basis 1-3 unverändert (Thema grass, Riesenschnappblume, Gipfelbrücke, Ranke 6,6 m, Gipfel y 40, Stempel, Funkenblüte, ohne Schlüssel/Remix-Feld)',
    r.baseTheme === 'grass' && r.baseVariant === null && r.baseBoss && r.baseBridge && r.baseStalk3 === 6.6 && r.baseGoalY === 40 && r.baseStamp && r.baseRemix === null && r.baseKeys === 0 && r.baseFunken === 'funken' && r.baseTitle === 'Kraxelei am Klötzchenberg');
};

RULES['P-3'] = async () => {
  const r = await sc(() => {
    const c = window.__course, L = c.level, CL = window.__courseLevels;
    const base = CL.get('6-4'), raw = CL.raw('P-3');
    const calls = window.__audio?.music?.__calls ?? [];
    const ents = (k) => L.entities.filter((e) => e.kind === k && !e.removed);
    return {
      stub: CL.isRemix(raw) && raw.remix.base === '6-4' && !raw.segments, theme: L.data.theme, light: c.view.theme.light, hemi: c.view.theme.hemi.intensity, pl: c.view.theme.playerLight?.intensity ?? 0,
      fogFar: c.view.theme.fog?.far, music: L.data.music, variant: L.data.musicVariant, call: calls.filter((x) => x[0] === 'course_jungle').slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
      spuk: ents('spuk').length, gross: ents('spuk').filter((e) => (e.spec.size ?? 1) > 2).length, kreis: ents('kreisgeist').length, brummer: ents('brummer').length, ranken: ents('rankenschnapper').length,
      helme: ents('helm_licht').filter((e) => e.pos.z > 0).length, helmeAll: ents('helm_licht').length, warpHidden: L.named.get('warp')?.hidden, raum: L.named.get('grossspuke')?.ids ?? L.named.get('grossspuke')?.spec?.ids,
      stamp: ents('stamp').length, ring: ents('starring').length, limit: L.runtime.timeLimit,
      baseTheme: base.theme, baseVariant: base.musicVariant ?? null, baseBrummer: base.enemies.filter((e) => e.kind === 'brummer').length, baseRanken: base.enemies.filter((e) => e.kind === 'rankenschnapper').length,
      baseWarpHidden: !!base.items.find((i) => i.id === 'warp')?.hidden, baseRing: base.items.some((i) => i.kind === 'starring'), baseStamp: !!base.stamp, baseRemix: base.remix ?? null, baseSpuk: base.enemies.some((e) => e.kind === 'spuk'), baseTitle: base.title,
    };
  });
  console.log(`  Remix: ${JSON.stringify({ theme: r.theme, hemi: r.hemi, pl: r.pl, fog: r.fogFar, call: r.call, spuk: r.spuk, gross: r.gross, kreis: r.kreis })}`);
  check('P-3: Remix-Platzhalter (Basis 6-4), eigener Titel; stockdunkel (jungle@dunkel: kaum Grundlicht, naher Nebel, kräftiges Figurenlicht)', r.stub && r.theme === 'jungle@dunkel' && r.light === 'dunkel' && r.hemi < 0.3 && r.pl >= 20 && r.fogFar < 60);
  check('P-3: Musik der Basis mit Klang-Variante dunkel → music.play(\'course_jungle\', { variant: \'dunkel\' })', r.music === 'course_jungle' && r.variant === 'dunkel' && r.call?.[1]?.variant === 'dunkel' && r.mVariant === 'dunkel');
  check(`P-3: 4 Licht-Helme am Start (${r.helme}, insgesamt ${r.helmeAll}), Spuke ${r.spuk - r.gross} + Großspuke ${r.gross} + Kreisgeister ${r.kreis} statt Brummer und Rankenschnapper`, r.helme === 4 && r.helmeAll === 7 && r.gross === 5 && r.spuk === 8 && r.kreis === 5 && r.brummer === 0 && r.ranken === 0);
  check('P-3: Ziel-Warp-Box anfangs verborgen (erscheint nach den drei Großspuken), kein Sternenring, kein Stempel, 400 s', r.warpHidden === true && r.ring === 0 && r.stamp === 0 && r.limit === 400);
  check('P-3: Gegenprobe Basis 6-4 unverändert (Thema jungle, ohne Variante, 4 Brummer, 6 Rankenschnapper, Warp-Box sichtbar, Sternenring, Stempel, keine Spuke)',
    r.baseTheme === 'jungle' && r.baseVariant === null && r.baseBrummer === 4 && r.baseRanken === 6 && !r.baseWarpHidden && r.baseRing && r.baseStamp && r.baseRemix === null && !r.baseSpuk && r.baseTitle === 'Floßfahrt durch den Giftsee-Dschungel');
};

RULES['P-4'] = async () => {
  const r = await sc(() => {
    const c = window.__course, L = c.level, CL = window.__courseLevels;
    const base = CL.get('2-3'), raw = CL.raw('P-4');
    const calls = window.__audio?.music?.__calls ?? [];
    const ents = (k) => L.entities.filter((e) => e.kind === k && !e.removed);
    const t = L.named.get('grosser_turm') ?? ents('pilzlingsturm')[0];
    const raum = ents('kampfraum')[0];
    const wall = L.data.segments.find((x) => x.id === 'sw_buehne');
    const baseWall = base.segments.find((x) => x.id === 'sw_buehne');
    return {
      stub: CL.isRemix(raw) && raw.remix.base === '2-3' && !raw.segments, title: L.data.title, theme: L.data.theme,
      music: L.data.music, variant: L.data.musicVariant, call: calls.filter((x) => x[0] === 'course_shadow').slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
      limit: L.runtime.timeLimit, cp: ents('checkpoint').length, stamp: ents('stamp').length, start: L.data.start.pos, remix: L.data.remix,
      far: L.entities.filter((e) => !e.removed && (e.pos.z > -70 || e.pos.x > 72) && !['goal', 'coin', 'warpbox', 'kampfraum'].includes(e.kind)).map((e) => e.kind),
      doors: ents('tuer').map((e) => [e.spec.id, e.locked, e.spec.target ?? null]), rb: ents('warpbox').map((e) => e.spec.id), movers: L.data.segments.filter((x) => x.type === 'mover').length,
      tower: t ? { count: t.count, h: +(t.half.y * 2).toFixed(2), topple: [...t.topple] } : null, kanonen: ents('helm_kanone').length,
      raum: raum ? { ids: raum.ids?.length ?? 0, onClear: raum.spec.onClear } : null, warpHidden: L.named.get('warp_ziel')?.hidden ?? ents('warpbox')[0]?.hidden,
      feuer: ents('feuer_schnappblume').length, oneup: ents('hidden').filter((e) => e.spec?.content === 'oneup').length, tree: wall?.casters?.filter((q) => q.pos[0] === 65).length,
      loge: L.data.segments.find((x) => x.id === 'sw_loge')?.parts?.length ?? 0, sims: !!L.data.segments.find((x) => x.id === 'sw_sims'),
      baseTitle: base.title, baseLimit: base.timeLimit, baseCp: !!base.checkpoint, baseStamp: !!base.stamp, baseVariant: base.musicVariant ?? null, baseRemix: base.remix ?? null,
      baseTower: base.enemies.some((e) => e.kind === 'pilzlingsturm'), baseDoor: base.segments.find((x) => x.id === 'tuer_a')?.target, baseOneup: base.blocks.some((b) => b.content === 'oneup'),
      baseFeuer: base.enemies.filter((e) => e.kind === 'feuer_schnappblume').length, baseWuschel: base.enemies.filter((e) => e.kind === 'wuschel').length, baseTree: baseWall?.casters?.filter((q) => q.pos[0] === 65).length,
    };
  });
  console.log(`  Remix: ${JSON.stringify({ call: r.call, cut: r.remix.cut, kept: r.remix.kept, removed: r.remix.removed, added: r.remix.added, tower: r.tower, doors: r.doors, far: r.far, raum: r.raum })}`);
  check('P-4: Remix-Platzhalter (Basis 2-3), eigener Titel, Thema der Basis (shadow)', r.stub && r.title === 'Schattenspuk-Gerangel' && r.theme === 'shadow');
  check('P-4: Musik der Basis mit Klang-Variante schnell → music.play(\'course_shadow\', { variant: \'schnell\' })', r.music === 'course_shadow' && r.variant === 'schnell' && r.call?.[1]?.variant === 'schnell' && r.mVariant === 'schnell');
  check(`P-4: nur der Schatten-Abschnitt (Start im Gang z ${r.start[2]}, ${r.remix.cut} Objekte weggeschnitten, keine Fahrplattformen, keine Rätselbox, Tür verschlossen), 100 s, kein Checkpoint, kein Stempel`,
    r.start[2] < -72 && r.remix.cut > 100 && r.movers === 0 && r.rb.length === 1 && r.rb[0] === 'warp_ziel' && r.far.length === 0 && r.doors.length === 1 && r.doors[0][1] === true && r.doors[0][2] === null
    && r.limit === 100 && r.cp === 0 && r.stamp === 0);
  check(`P-4: Pilzlingsturm aus 30 Pilzlingen (${r.tower?.count}, ${r.tower?.h} m hoch; Kanonenkugel wirft ihn um), ${r.kanonen} Kanonen-Helme`, r.tower?.count === 30 && r.tower.h > 18.5 && r.tower.topple.includes('cannon') && r.kanonen === 3);
  check(`P-4: Kampfraum über alle ${r.raum?.ids} Gegner → Ziel-Warp-Box (anfangs verborgen); Feuer-Schnappblume und Extraleben-Block entfallen, Schatten-Baum versetzt; Loge (${r.loge} Teile) und Sims unsichtbar`,
    r.raum?.ids === 11 && r.raum.onClear?.reveal === 'warp_ziel' && r.warpHidden === true && r.feuer === 0 && r.oneup === 0 && r.tree === 0 && r.loge === 5 && r.sims);
  check('P-4: Gegenprobe Basis 2-3 unverändert (400 s, Checkpoint, Stempel, ohne Variante/Turm, Tür → tuer_b, Extraleben-Block, 4 Feuer-Schnappblumen, 11 Wuschel, Schatten-Baum bei x 65)',
    r.baseTitle === 'Scherenschnittkeller' && r.baseLimit === 400 && r.baseCp && r.baseStamp && r.baseVariant === null && r.baseRemix === null && !r.baseTower && r.baseDoor === 'tuer_b' && r.baseOneup
    && r.baseFeuer === 4 && r.baseWuschel === 11 && r.baseTree === 2);
};

// ------------------------------------------------------------------ Sonder-Proben (extra[].probe)
const PROBES = {
  p4raum: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa, p = c.player;
      W.place([19.5, 3.6, -87.5], { settle: 4, invuln: 99, yaw: 0 });
      const raum = L.entities.find((e) => e.kind === 'kampfraum');
      const box = L.named.get('warp_ziel');
      c.step(5);
      const s0 = raum.info();
      // alle außer dem Turm per Skript besiegen (Funkelstern-Treffer)
      for (const id of ['g_p1', 'g_k1', 'g_s1', 'g_pk', 'g_p3', 'riese', 'g_p4', 'g_p5', 'g_s2', 'g_k2']) L.named.get(id)?.onHit?.('star', p);
      for (let i = 0; i < 120; i++) { c.setInput({}); c.step(1); }
      const s1 = raum.info(), h1 = box.hidden;
      // jetzt den Turm mit dem Kanonen-Helm umschießen (die Figur schaut nach rechts, der Helm feuert von selbst)
      p.wearHelmet('kanone');
      let k = 0;
      for (; k < 1500 && raum.state !== 'done'; k++) { p.invuln = 99; c.setInput({}); c.step(1); }
      for (let i = 0; i < 30; i++) c.step(1);
      return { s0, s1, h1, k, s2: raum.info(), h2: box.hidden };
    });
    console.log(`     Kampfraum: ${JSON.stringify(r)}`);
    return r.s0.state === 'active' && r.s0.total === 11 && r.s1.left === 1 && r.h1 === true && r.s2.state === 'done' && r.h2 === false;
  },
  p4turm: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa, p = c.player;
      W.place([19.5, 3.6, -87.5], { settle: 4, invuln: 99, yaw: 0 });
      const t = L.named.get('grosser_turm');
      const n0 = t.count, h0 = +(t.half.y * 2).toFixed(2);
      t.onHit('shell', p); for (let i = 0; i < 90; i++) c.step(1);
      const n1 = t.count;
      t.onHit('fire', p); for (let i = 0; i < 90; i++) c.step(1);
      const n2 = t.count;
      p.wearHelmet('kanone');
      let k = 0;
      for (; k < 1500 && !t.defeated; k++) { p.invuln = 99; c.setInput({}); c.step(1); }
      return { n0, h0, n1, n2, k, defeated: !!t.defeated, state: t.state, nEnd: t.count };
    });
    console.log(`     Turm: ${JSON.stringify(r)}`);
    return r.n0 === 30 && r.h0 > 18.5 && r.n1 === 29 && r.n2 === 28 && r.defeated && r.nEnd >= 27;
  },
  p4helm: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa, p = c.player;
      const helms = () => L.entities.filter((e) => e.kind === 'helm_kanone' && e.alive && !e.removed && Math.hypot(e.pos.x, e.pos.z + 78.6) < 1.5).length;
      W.place([0, 2.5, -74.4], { settle: 2 });
      const n0 = helms();
      for (let i = 0; i < 200 && !p.helmet; i++) { c.setInput(W.stick(0, -1, 0.6)); c.step(1); }
      c.setInput({});
      const worn = p.helmet, n1 = helms();
      for (let i = 0; i < 120 * 6.5; i++) c.step(1);
      return { n0, worn, n1, n2: helms() };
    });
    console.log(`     Kanonen-Helm: ${JSON.stringify(r)}`);
    return r.n0 === 1 && r.worn === 'kanone' && r.n1 === 0 && r.n2 === 1;
  },
  helme: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa, p = c.player;
      const helms = () => L.entities.filter((e) => e.kind === 'helm_licht' && e.alive && !e.removed && Math.hypot(e.pos.x, e.pos.z - 2.5) < 4).length;
      const n0 = helms();
      W.place([-0.8, 1, 3.6], { settle: 2 });
      for (let i = 0; i < 60 && !p.helmet; i++) { c.setInput(W.stick(0, -1, 0.5)); c.step(1); }
      c.setInput({});
      const worn = p.helmet;
      const n1 = helms();
      for (let i = 0; i < 120 * 6; i++) c.step(1);
      return { n0, worn, n1, n2: helms() };
    });
    console.log(`     Helme: ${JSON.stringify(r)}`);
    return r.n0 === 4 && r.worn === 'licht' && r.n1 === 3 && r.n2 === 4;
  },
  box: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa, p = c.player;
      const coins = L.entities.filter((e) => e.kind === 'schluesselmuenze');
      W.place([1.6, 42.5, -199.6], { settle: 10 });
      for (const k of coins.filter((e) => e.spec.id !== 'key5')) k.onPlayer?.(p, {});
      c.step(5);
      const box = L.named.get('zielbox');
      const n4 = L.keys?.schluessel?.n, locked4 = box.locked;
      const d4 = W.drive([{ warp: [1.6, -201.4] }], {});
      const stayed = p.pos.y < 44 && p.pos.y > 42 && d4.mech.warps === 0;
      const banner = c.level.hudBanner ?? null;
      const k5 = coins.find((e) => e.spec.id === 'key5');
      k5.onPlayer?.(p, {});
      c.step(200);
      const locked5 = box.locked, done = L.keys?.schluessel?.done;
      W.place([1.6, 42.5, -199.6], { settle: 10 });
      const d5 = W.drive([{ warp: [1.6, -201.4] }], {});
      return { n4, locked4, stayed, locked5, done, warped: d5.mech.warps === 1 && p.pos.y > 49, y: +p.pos.y.toFixed(1) };
    });
    console.log(`     Box: ${JSON.stringify(r)}`);
    return r.n4 === 4 && r.locked4 && r.stayed && !r.locked5 && r.done && r.warped;
  },
  kuglerHang: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa;
      W.place([7, 3, -50], { settle: 2, invuln: 99 });
      const es = ['sk_hang1', 'sk_hang2'].map((id) => L.entities.find((x) => x.spec?.id === id));
      const z0 = es.map((e) => e.pos.z), y0 = es.map((e) => e.pos.y);
      let down = 0, vmax = 0;
      for (let i = 0; i < 360; i++) { c.step(1); for (const e of es) { if (e.downhill) down++; vmax = Math.max(vmax, e.speedNow ?? 0); } }
      return { dz: es.map((e, i) => +(e.pos.z - z0[i]).toFixed(1)), dy: es.map((e, i) => +(e.pos.y - y0[i]).toFixed(1)), down, vmax: +vmax.toFixed(1) };
    });
    console.log(`     Kugler am Hang: ${JSON.stringify(r)}`);
    return r.down > 30 && r.dy.every((d) => d < -1.5) && r.dz.every((d) => d > 4) && r.vmax > 4;
  },
  werfer: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa;
      W.place([-2, 9, -74], { settle: 2, invuln: 99 });
      const e = L.entities.find((x) => x.spec?.id === 'ww_hang');
      let walzen = 0;
      for (let i = 0; i < 720; i++) { c.step(1); walzen = Math.max(walzen, L.entities.filter((x) => x.kind === 'stachelwalze' && x.alive && !x.removed).length); }
      return { throws: e.throws ?? e.info?.().throws, walzen };
    });
    console.log(`     Walzenwerfer: ${JSON.stringify(r)}`);
    return r.throws >= 1 && r.walzen >= 1;
  },
  clock: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa, p = c.player;
      W.place([3, 6, -31], { settle: 2, timeLeft: 20 });
      const a = L.runtime.timeLeft;
      for (let i = 0; i < 60; i++) c.step(1);
      const b = L.runtime.timeLeft;
      // zur ersten Uhr über der ersten Walze (echte Eingabe: hinüberlaufen, am Kamm springen)
      const h = L.named.get('uhren'), it = h.items[0];
      const got0 = h.items.filter((x) => x.taken).length;
      let before = L.runtime.timeLeft, after = before;
      for (let i = 0; i < 400 && !it.taken; i++) { const dx = it.x - p.pos.x, dz = it.z - p.pos.z; before = L.runtime.timeLeft; c.setInput({ ...W.stick(dx, dz, 1), jump: Math.hypot(dx, dz) < 2.4 }); c.step(1); after = L.runtime.timeLeft; }
      c.setInput({});
      return { near: +(b - a).toFixed(2), taken: it.taken, gain: +(after - before).toFixed(2), got: h.items.filter((x) => x.taken).length - got0 };
    });
    console.log(`     Uhr: daneben ${r.near} s, beim Berühren ${r.gain} s, ${r.got} Uhr`);
    return r.near < 0 && r.taken && r.gain > 4.9 && r.gain < 5.01 && r.got === 1;
  },
  kugler: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa;
      W.place([-1, 6, -70], { settle: 2, invuln: 99, timeLeft: 30 });
      const e = L.entities.find((x) => x.spec?.id === 'sk_huegel');
      const z0 = e.pos.z, y0 = e.pos.y;
      let downhill = false, vmax = 0;
      for (let i = 0; i < 240; i++) { c.step(1); if (e.downhill) downhill = true; vmax = Math.max(vmax, e.speedNow ?? 0); }
      return { dz: +(e.pos.z - z0).toFixed(2), dy: +(e.pos.y - y0).toFixed(2), downhill, vmax: +vmax.toFixed(2), state: e.state };
    });
    console.log(`     Kugler: ${JSON.stringify(r)}`);
    return r.downhill && r.dy < -0.3 && r.vmax > 2.3;
  },
  respawn: async () => {
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__pa, p = c.player;
      W.place([0, 6, -30], { settle: 2, timeLeft: 25 });
      const h = L.named.get('uhren');
      h.items[0].taken = true; h.items[1].taken = true;
      const before = h.items.filter((x) => x.taken).length;
      p.invuln = 0;
      p.die('fall');
      let k = 0;
      for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); }
      c.step(10);
      return { before, after: h.items.filter((x) => x.taken).length, time: +L.runtime.timeLeft.toFixed(1), at: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)], resets: h.resets ?? 0 };
    });
    console.log(`     Neustart: ${JSON.stringify(r)}`);
    return r.before === 2 && r.after === 0 && r.time > 29 && Math.abs(r.at[2] + 26.5) < 1 && r.resets >= 1;
  },
};

for (const id of LEVELS) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); continue; }
  console.log(`\nLevel ${id}`);
  loaded = null;
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, variant: d.musicVariant, archetype: d.archetype, stars: d.stars.length, world: d.world }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music} (${meta.variant}), Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('      ', e);
    check(`${id}: Welt 10, ${R.meta.stars} Sterne, kein Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music} + ${R.meta.variant}, Archetyp ${R.meta.archetype}`,
      meta.world === 10 && meta.stars === R.meta.stars && !kinds.stamp && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music
      && meta.variant === R.meta.variant && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }
  if (PARTS.has('rules') && RULES[id]) await RULES[id](R);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast), Zeit läuft mit
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Restzeit ${res.rt.time} s, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined, stomped: res.mech.stomped.length })}`);
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
      await W('place', pt, { settle: 6, timeLeft: 99 });
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

  // ------------------------------------------------ Sterne und Geheimnisse
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, timeLeft: t.timeLeft ?? null, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      if (t.named) res.named = await W('named', t.named);
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : t.ok ? await t.ok(res) : false;
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
      if (t.probe) {
        const ok = await PROBES[t.probe](t, hero);
        check(`${id}: ${t.name} (${hero})`, !!ok);
        continue;
      }
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: t.legsFrom ? 2 : 10, timeLeft: t.timeLeft ?? null, ...(t.place ?? {}) });
      if (t.noClocks) await W('noClocks');
      const legs = t.legsFrom ? R[t.legsFrom] : t.legs;
      const res = await W('drive', legs, { invuln: t.invuln });
      if (t.named) res.ring = await W('named', t.named);
      if (t.ghost) res.ghostAlive = await sc((id) => { const e = window.__course.level.entities.find((x) => x.spec?.id === id); return !!e && e.alive && !e.removed && e.state !== 'defeated'; }, t.ghost);
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
    await W('place', pos, { settle: 10, yaw, timeLeft: 99 });
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
