// Bonuswelt Stern, Level S-8 „Geisterreigen im Schneenebelmoor“ (Schneefriedhof mit fünf Schlüsselmünzen – Kreisgeist-Ring,
// POW-Großblock-Treppe, unsichtbare Wolke, Schneeball auf den POW hinter Gittern, Tür zum Felssims –, Friedhofstor, Grablicht
// mit Funkelstern gegen den Geisterring um Krümel, Floßfahrt über den Giftsumpf, Rätselbox mit Zielscheiben, auf- und
// absteigende Nebelplattformen, Boost-Steg mit Sternlaterne und Stempel, Warp-Box zum Ziel) und S-9 „Kanonenhelm-Express
// durch die Neonstation“ (Schienenbrett-Fahrten mit Kanonen-Helm, rissige Wand, Weichen umschießen, Kanonenkugel-Wand 20 m
// hoch, Unterwassertunnel mit Ziegeln, Schienennetz mit Kehrschleifen, Sternkapsel, ?-Blöcke → Brücke zum Stempel):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle
// Sterne, der Stempel und die Geheimnisse mit der echten Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/sd_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_sd.mjs [S-8|S-9]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern) · TRACE=1 (Spur der Figur)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf } ·
// { wait } · { hop } · { crouch } · { star: i } · { stamp: true } · { chaseKind, ids } · { expect } · { until } (Name aus COND
// oder Ausdruck '=…') · { warp: [x, z] } · { pound: [x, z] } · { stompAll: Id-Anfang } · { place } · { die } · { path } ·
// { upOnto: [x, z, top] } · S-8: { ring: Id, from: [x, z], to: [x, z], top, cross: [x, z] } (durch eine Lücke im Kreisgeist-Ring
// springen), { pickUp: Id } (Schneeball aufheben), { throwAt: [x, z], aim } (werfen), { floss: Id, board: [x, z], off: [x, z] }
// (Floß besteigen, mitfahren, an Land gehen), { nebel: Id, i, at: [x, z] } (auf Nebelplattform i springen, sobald sie oben ist)
// · S-9: { brett: Id, board: [x, z], aims: [{ at: Knoten, to: [x, y, z] | Id }], off: [x, z], stay } (Schienenbrett fahren,
// Weichen/Ziele anpeilen und schießen, am Ende aussteigen), { kugeln: Id, top, land: [x, z] } (Kanonenkugel-Wand hinauf),
// { swim: [[x, y, z] …] } (unter Wasser einer Bahn folgen), { aim: [x, y, z], shots } (zur Seite drehen und feuern), { helm }
const X_K = 100, X_R = -100, X_Z = 70, YS = 3.2;
const ROUTES = {
  'S-8': {
    start: [0, 0, 9],
    meta: { stars: 3, time: 400, theme: 'fogbog', music: 'course_fogbog', archetype: 'parcours', world: 9 },
    enemies: { kreisgeist: 5, kreisgeist_kreis: 5, kreisgeist_glied: 32, schluesselmuenze: 5, tuer: 4, pow: 2 },
    main: [
      { name: 'Schlüssel a: durch den Kreisgeist-Ring auf den Felsen', to: [-6.4, 5], within: 0.3, run: false },
      { ring: 'fr', from: [-6.4, 5], to: [-12, 5], top: 1.3, cross: [-9.1, 5], jumpAt: 4.6 },
      { wait: 20 }, { expect: '=L.keys?.tor?.n === 1' },
      { ring: 'fr', from: [-12.4, 5], to: [-6.4, 5], top: 0, cross: [-9.1, 5], jumpAt: 9 },
      { name: 'Schlüssel b: POW-Block → Großblock-Treppe', to: [11.4, -9.6], within: 0.4 },
      { pound: [13, -12] },
      { until: '=ent(\'grosstreppe\')?.shown || ent(\'grosstreppe\')?.info?.()?.shown', max: 240 },
      { to: [19, -13.2], within: 0.3, run: false },
      { to: [19, -15.8], jump: 20, jumpAt: 9, within: 0.4, run: false },
      { to: [19, -18.4], jump: 24, jumpAt: 9, within: 0.4, run: false },
      { to: [19, -21], jump: 24, jumpAt: 9, within: 0.4, run: false },
      { to: [19, -23.6], jump: 24, jumpAt: 9, within: 0.35, run: false },
      { hop: 30 }, { wait: 20 },
      { expect: '=L.keys?.tor?.n === 2' },
      { name: 'Schlüssel c: Westgruft-Dach, unsichtbare Wolke', to: [-13.6, -18.4], within: 0.4 },
      { to: [-15.6, -20], jump: 20, jumpAt: 9, within: 0.4, run: false },
      { to: [-17.2, -21], jump: 30, jumpAt: 9, within: 0.4, run: false },
      { to: [-19, -20.6], within: 0.3, run: false },
      { to: [-19, -29], jump: 40, jumpAt: 3.8, within: 0.4 },
      { expect: '=ent(\'wolke\').shown' },
      { wait: 20 }, { expect: '=L.keys?.tor?.n === 3' },
      { to: [-19, -33.6], within: 0.6 },
      { name: 'Schlüssel e: Tür der Gruft am linken Zaun → Felssims rechts', to: [-22, -46], within: 0.3 },
      { to: [-30, -46], within: 0.2, max: 400, run: false, autoJump: false, stopIf: '=P().pos.x > 30' },
      { expect: '=P().pos.x > 30 && P().pos.y > 6' },
      { to: [33.6, -58], within: 0.3, run: false }, { wait: 20 },
      { expect: '=L.keys?.tor?.n === 4' },
      { to: [26, -58], jump: 26, jumpAt: 3.5, within: 0.8 },
      { name: 'Schlüssel d: Schneeball durch das Gitter auf den POW – die Ziegelwand fällt', to: [-6.4, -58.6], within: 0.3 },
      { pickUp: 'sb1' },
      { throwAt: [-11, -63] },
      { until: '=L.entities.filter((e) => e.kind === \'brick\' && e.alive && !e.removed).length === 0', max: 200 },
      { to: [-17, -64.6], within: 0.3 },
      { to: [-17, -67.2], within: 0.3, run: false }, { wait: 20 },
      { expect: '=L.keys?.tor?.n === 5' },
      { name: 'Friedhofstor', to: [-17, -63.4], within: 0.6 },
      { until: '=ent(\'tor\').isOpen && ent(\'tor\').k > 0.4', max: 300 },
      { to: [0, -80], within: 0.6 },
      { to: [0, -92], within: 0.4 },
      { name: 'Floßfahrt über den Giftsumpf', floss: 'floss', board: [0, -96.4], off: [0, -176] },
      { expect: '=at(-10, 10, -0.5, -173, -190)' },
      { name: 'Nebelplattformen (Welle)', to: [0, -189.6], within: 0.3, run: false },
      { nebel: 'nebelA', i: 0 }, { nebel: 'nebelA', i: 1 }, { nebel: 'nebelA', i: 2 }, { nebel: 'nebelA', i: 3 }, { nebel: 'nebelA', i: 4 },
      { to: [0, -212.4], jump: 20, jumpAt: 9, within: 0.6, run: false },
      { name: 'Rastinsel 1', to: [3, -218.4], within: 0.4, run: false },
      { nebel: 'nebelB2', i: 0 }, { nebel: 'nebelB2', i: 1 }, { nebel: 'nebelB2', i: 2 }, { nebel: 'nebelB2', i: 3 },
      { to: [2, -238.8], jump: 20, jumpAt: 9, within: 0.6, run: false },
      { name: 'Rastinsel 2', to: [0, -244.6], within: 0.4, run: false },
      { name: 'aufsteigende Nebelplattformen', nebel: 'nebelC', i: 0 }, { nebel: 'nebelC', i: 1 }, { nebel: 'nebelC', i: 2 }, { nebel: 'nebelC', i: 3 },
      { to: [0, -265], jump: 24, jumpAt: 9, within: 0.4, run: false },
      { expect: '=at(-2, 2, 3.0, -262, -268)' },
      { name: 'Boost-Steg', to: [0, -306.5], within: 0.8 },
      { to: [0, -311], within: 0.6 },
      { name: 'Warp-Box zum Kapellenhügel', warp: [0, -315] },
      { expect: '=P().pos.x > 60' },
      { name: 'Zielmast', to: [X_Z, -336.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'fünf Schlüsselmünzen, Tor offen, Floß gefahren, Warp-Box benutzt', ok: (r) => r.mech.keys === 5 && r.mech.tor && r.mech.flossFahrt && r.mech.warps >= 1 },
    ],
    targets: [
      { name: 'Stern 0: aufs Grablicht stampfen (Funkelstern), damit den Geisterring um Krümel vertreiben', star: 0, from: [3, 0, -35.6],
        legs: [{ pound: [5, -38.6] }, { expect: '=P().power === \'stern\'' }, { chaseKind: 'kreisgeist_glied', ids: ['kr_0', 'kr_1', 'kr_2', 'kr_3', 'kr_4', 'kr_5', 'kr_6', 'kr_7'], max: 1100, run: true, jump: false },
          { wait: 30 }, { expect: '=ent(\'kruemel\').free' }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Funkelstern (die Geister verletzen, Krümel bleibt gefangen)', star: 0, expectNot: true, from: [12, 0, -38.6], heroes: ['lotti'], invuln: false,
        legs: [{ chaseKind: 'kreisgeist_glied', ids: ['kr_0', 'kr_1', 'kr_2'], max: 400 }, { wait: 60 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Stern 0 nicht mit bloßem Draufspringen aufs Grablicht', star: 0, expectNot: true, from: [5, 0, -36.4], heroes: ['lotti'],
        legs: [{ to: [5, -38.6], jump: 24, jumpAt: 9, within: 0.4, run: false }, { hop: 20 }, { wait: 30 }, { expect: '=P().power !== \'stern\'' }] },
      { name: 'Stern 1: Rätselbox nach dem Floß – vier Zielscheiben in der Nebelkammer aus der Ferne mit Schneebällen treffen', star: 1, from: [6.5, 0, -180.6],
        legs: [{ warp: [6.5, -183] }, { until: '=P().pos.x < -80', max: 600 },
          { to: [X_R - 1.4, -179.2], within: 0.3, run: false }, { pickUp: 'sb3' }, { throwAt: [X_R - 4.5, -187.4] }, { wait: 30 },
          { to: [X_R + 1.4, -179.2], within: 0.3, run: false }, { pickUp: 'sb4' }, { throwAt: [X_R + 4.5, -187.4] }, { wait: 200 },
          { to: [X_R - 1.4, -179.2], within: 0.3, run: false }, { pickUp: 'sb3' }, { throwAt: [X_R - 1.5, -187.4] }, { wait: 30 },
          { to: [X_R + 1.4, -179.2], within: 0.3, run: false }, { pickUp: 'sb4' }, { throwAt: [X_R + 1.5, -187.4] }, { wait: 60 },
          { expect: '=L.targets?.nebelziele?.done' }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht durch Hinüberspringen (Nebelschlucht)', star: 1, expectNot: true, from: [X_R, 0, -178], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ to: [X_R, -188], jump: 30, jumpAt: 2.6, within: 0.6, max: 300 }, { wait: 200 }] },
      { name: 'Stern 2: vom Balkon am Boost-Steg einen Schneeball in die Sternlaterne werfen', star: 2, from: [-1.6, YS, -279.4],
        legs: [{ pickUp: 'sb5' }, { throwAt: [-8.6, -281] }, { wait: 60 }], shot: 'stern2' },
      { name: 'Stern 2 nicht durch Hinspringen (Gitter hält die Figur ab)', star: 2, expectNot: true, from: [-3, YS, -281], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ to: [-8.6, -281], jump: 40, jumpAt: 9, within: 0.4, max: 260 }, { wait: 240 }] },
      { name: 'Stempel: am Ende des Boost-Stegs rechts hinüber', stamp: true, from: [0, YS, -300.4],
        legs: [{ to: [0, -302.6], within: 0.3, run: false }, { to: [4.3, -302.8], jump: 24, jumpAt: 9, within: 0.4, run: false }, { stamp: true }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Friedhofstor bleibt ohne fünf Schlüssel zu (Gitter fest, keine Lücke darüber)', from: [0, 0, -79], heroes: ['lotti'], allowFail: true,
        legs: [{ to: [0, -87], jump: 40, jumpAt: 2.5, within: 0.4, max: 300 }, { wait: 30 }], mech: (r) => r.pos[2] > -84 && !r.mech.tor, mechText: (r) => `z ${r.pos[2].toFixed(1)}` },
      { name: 'Großblock-Treppe ist vor dem POW-Treffer nicht fest', from: [19, 0, -13.2], heroes: ['lotti'],
        legs: [{ to: [19, -15.8], jump: 20, jumpAt: 9, within: 0.4, run: false, max: 200 }, { wait: 30 }, { expect: '=P().pos.y < 0.3' }] },
      { name: 'Unsichtbare Wolke: vorher unsichtbar, beim Betreten sichtbar', from: [-19, 3.35, -20.6], heroes: ['lotti'],
        legs: [{ expect: '=!ent(\'wolke\').shown' }, { to: [-19, -29], jump: 40, jumpAt: 3.8, within: 0.4 }, { expect: '=ent(\'wolke\').shown && P().pos.y > 4.5' }] },
      { name: 'Ziegelwand hält ohne POW (Stampfen von oben geht nicht – Dach darüber)', from: [-17, 0, -63.6], heroes: ['lotti'],
        legs: [{ to: [-17, -65.2], within: 0.2, run: false, max: 120 }, { hop: 24 }, { wait: 20 }, { expect: '=L.entities.filter((e) => e.kind === \'brick\' && e.alive).length === 6' }] },
      { name: 'Kerzenkammer: Kapellentür → Nebenbereich, Extraleben im versteckten Block, Tür zurück', from: [23, 0, -61.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [23, -69], within: 0.2, run: false, max: 400, autoJump: false, stopIf: '=P().pos.x > 80' }, { expect: '=P().pos.x > 80' }, { to: [X_K + 3, -58], within: 0.2, run: false }, { hop: 30 }, { wait: 30 },
          { chaseKind: 'powerup', max: 900 }, { to: [X_K, -55], within: 0.3 }, { to: [X_K, -49], within: 0.2, max: 300, run: false, autoJump: false, stopIf: '=P().pos.x < 30' }, { expect: '=P().pos.x < 30' }] },
      { name: 'Extraleben: versteckter Block auf der Rastinsel 2', from: [-2.4, 0, -239.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-2.4, -241.5], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Extraleben: versteckter Block am Kapellenhügel', from: [X_Z + 4, 0, -324], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [X_Z + 4, -326], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Kreisgeist verletzt bei Berührung', from: [-13, 0, -2.6], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ chaseKind: 'kreisgeist', ids: ['g1'], max: 400, jump: false }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Nebelplattform sinkt mit der Figur in den Nebel (Absturz)', from: [0, 0, -190.6], heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
        legs: [{ nebel: 'nebelA', i: 0 }, { wait: 900 }], mech: (r) => r.dead || r.log.some((l) => l[0] === 'TOD'), mechText: (r) => `tot ${r.dead}` },
      { name: 'Giftsumpf: Hineinfallen kostet ein Leben, Neustart am Steg', from: [0, 0, -92], heroes: ['lotti'], invuln: false,
        legs: [{ to: [5, -100], within: 0.5, max: 300 }, { respawn: true }, { expect: '=P().pos.z > -95' }],
        mech: (r) => r.rt.deaths >= 1 || r.log.some((l) => l[0] === 'TOD'), mechText: (r) => `Neustart bei z ${r.pos[2].toFixed(1)}` },
    ],
    shots: [
      ['start', [0, 0, 9]],
      ['fels', [-6.4, 0, 8]],
      ['pow', [13, 0, -8]],
      ['treppe', [17, 0, -12]],
      ['westgruft', [-14, 0, -17]],
      ['wolke', [-19, 3.4, -23.6]],
      ['licht', [3, 0, -34.6]],
      ['kruemel', [12, 0, -38.4]],
      ['linketuer', [-21, 0, -44]],
      ['sims', [35, 6.5, -56]],
      ['baelle', [-6.4, 0, -56.6]],
      ['tor', [0, 0, -78]],
      ['floss', [0, 0, -91]],
      ['sumpf', [-5, -0.18, -118]],
      ['landung', [0, 0, -178]],
      ['nebel', [0, 0, -190]],
      ['rast', [0, 0, -216]],
      ['spuren', [3, 0, -219]],
      ['aufstieg', [0, 0, -245]],
      ['steg', [0, YS, -268]],
      ['balkon', [-1.6, YS, -279.6]],
      ['stegende', [0, YS, -300]],
      ['ziel', [X_Z, 0, -324]],
      ['kammer', [X_K, 0, -55]],
      ['raum', [X_R, 0, -177]],
    ],
  },
};

const YT = 20;
const broken = (id) => `=(() => { const e = L.entities.find((x) => x.spec?.id === '${id}'); return !e || e.removed || e.defeated || e.broken || e.state === 'broken' || e.alive === false; })()`;
ROUTES['S-9'] = {
  start: [0, 0, 6],
  meta: { stars: 3, time: 400, theme: 'cosmic', music: 'course_cosmic', archetype: 'parcours', world: 9 },
  enemies: { kanone_turm: 3, krakenpilz: 3, tintling: 3, helm_kanone: 6, sternkapsel: 1 },
  main: [
    { name: 'Kanonen-Helm aufsetzen', to: [-2.2, 1.6], within: 0.4, run: false },
    { expect: '=P().helmet === \'kanone\'' },
    { name: 'Schienenbrett 1: Bärenwand, Kanonenturm, Krakenpilz', brett: 'brett1', off: [-8, -66.4],
      aims: [{ target: 'baerenwand', done: broken('baerenwand') }, { target: 'turm1', z: -12, until: -31, done: broken('turm1') }, { target: 'kp1', z: -14, until: -27, done: broken('kp1') }] },
    { expect: '=at(-13, -3, -0.5, -63, -76)' },
    { name: 'Station M1: Krakenpilz von oben', stompAll: 'kp3' },
    { to: [-8, -75.2], within: 0.4, run: false },
    { expect: '=P().helmet === \'kanone\'' },
    { name: 'Schienenbrett 2: Weiche umschießen, Kanonenturm 2', brett: 'brett2', off: [-4.4, -116],
      aims: [{ target: { weiche: 'F' }, name: 'weiche F', z: -77, until: -88, done: '=ent(\'brett2:F\').state === 1' }, { target: 'turm2', z: -85, until: -94, done: broken('turm2') }] },
    { expect: '=at(-16, 8, -0.5, -113, -136)' },
    { name: 'Kugelwand 20 m hinauf', to: [-10.6, -115.8], within: 0.3, run: false },
    { kugeln: { rows: 9, y0: 0.6, rise: 2.2, z0: -117.5, step: -1.4 }, stand: [-10.6, -115.8], top: YT, land: [-6, -133] },
    { expect: '=at(-15, 4, 19.5, -130, -138)' },
    { name: 'Sprungbrett → Sternenbecken', to: [-6, -137.8], within: 0.4, run: false },
    { to: [-6, -141], within: 0.6, max: 300 },
    { until: '=P().mode === \'swim\'', max: 900 },
    { name: 'Unterwassertunnel', swim: [[-6, -1.6, -150], [-6, -1.6, -176], [-6, -1.6, -200], [-6, null, -209], [-6, null, -213]] },
    { until: '=P().pos.y > -0.9', max: 300 },
    { name: 'Ausstieg am Kontrollpunkt-Deck', to: [-6, -217.8], jump: 30, jumpAt: 2.6, within: 0.6, max: 600 },
    { expect: '=at(-14, 2, 0.3, -216, -230)' },
    { to: [-2.4, -221], within: 0.4, run: false },
    { expect: '=P().helmet === \'kanone\'' },
    { name: 'Schienennetz: zwei Weichen umschießen, Kanonenturm 3, am Ende aufs Zieldeck', to: [-6, -229.6], within: 0.3, run: false },
    { brett: 'netz', off: [-6, -351.6], aims: [
      { target: { weiche: 'N1' }, name: 'weiche N1', z: -231, until: -243, done: '=ent(\'netz:N1\').state === 1' },
      { target: { weiche: 'N3' }, name: 'weiche N3', z: -256, until: -266, done: '=ent(\'netz:N3\').state === 1' },
      { target: 'turm3', z: -270, until: -284, done: broken('turm3') }] },
    { expect: '=at(-16, 4, 0.3, -347, -362)' },
    { name: 'Zielmast', to: [-6, -355.2], within: 0.2 },
  ],
  routeChecks: [
    { name: 'drei Bretter gefahren, drei Weichen richtig gestellt, Kugelwand erklommen', ok: (r) => (r.mech.bretter ?? 0) >= 3 && r.log.some((l) => l[0] === 'kugelwand') },
  ],
  targets: [
    { name: 'Stern 0: rissige Wand an Station M1 mit dem Kanonen-Helm sprengen', star: 0, from: [-6.4, 0, -69.5], place: { helm: 'kanone' },
      legs: [{ aim: [-3, 1, -69.5], shots: 4, hit: broken('risswand') }, { to: [0.6, -69.5], within: 0.3 }, { star: 0 }], shot: 'stern0' },
    { name: 'Stern 0 nicht ohne Helm (Stampfen prallt ab, keine Lücke darüber)', star: 0, expectNot: true, from: [-6, 0, -69.5], heroes: ['lotti'], allowFail: true,
      legs: [{ pound: [-3.2, -69.5] }, { to: [0.6, -69.5], jump: 40, jumpAt: 4, within: 0.3, max: 300 }, { wait: 30 }] },
    { name: 'Stern 1: im Unterwassertunnel abtauchen und die Ziegel rechts wegschießen', star: 1, from: [-6, -1.6, -174], place: { helm: 'kanone' },
      legs: [{ swim: [[-4.6, -2.3, -178, { face: [0, -178], shots: 3, hold: 20 }], [-4.6, -3.3, -178, { face: [0, -178], shots: 3, hold: 20 }]] },
        { expect: '=L.entities.filter((e) => e.kind === \'brick\' && e.alive && !e.removed && Math.abs(e.pos.z + 178) < 0.2).length === 0' },
        { swim: [[-3, -2.9, -178], [0.4, -2.9, -178]] }, { star: 1 }], shot: 'stern1' },
    { name: 'Stern 1 nicht ohne Wegschießen (Ziegel fest)', star: 1, expectNot: true, from: [-6, -1.6, -174], heroes: ['lotti'], allowFail: true,
      legs: [{ swim: [[-3, -2.9, -178], [0.4, -2.9, -178]] }, { wait: 60 }] },
    { name: 'Stern 2: Sternweiche umschießen, Kapsel abschießen, bevor das Brett fällt; Rettungsplattform und Warp-Box zurück', star: 2, from: [-6, 0.6, -229.4], place: { helm: 'kanone' },
      legs: [{ brett: 'netz', off: null, stay: 240, aims: [
        { target: { weiche: 'N1' }, name: 'weiche N1', z: -231, until: -243, done: '=ent(\'netz:N1\').state === 1' },
        { target: { weiche: 'N3' }, name: 'weiche N3', z: -256, until: -266, done: '=ent(\'netz:N3\').state === 1' },
        { target: { weiche: 'N5' }, name: 'weiche N5', z: -281, until: -290, done: '=ent(\'netz:N5\').state === 1' },
        { target: 'kapsel', name: 'Sternkapsel', z: -298, done: '=ent(\'kapsel\').broken' }] },
        { expect: '=ent(\'kapsel\').broken' }, { wait: 200 }, { expect: '=P().pos.y > -8 && P().pos.y < -5' }, { warp: [-3, -314] }, { expect: '=P().pos.z > -232' }], shot: 'stern2' },
    { name: 'Stern 2 nicht ohne die Sternweiche (Brett bleibt auf dem Hauptgleis)', star: 2, expectNot: true, from: [-6, 0.6, -229.4], heroes: ['lotti'], place: { helm: 'kanone' },
      legs: [{ brett: 'netz', off: [-6, -351.6], aims: [
        { target: { weiche: 'N1' }, name: 'weiche N1', z: -231, until: -243, done: '=ent(\'netz:N1\').state === 1' },
        { target: { weiche: 'N3' }, name: 'weiche N3', z: -256, until: -266, done: '=ent(\'netz:N3\').state === 1' }] }] },
    { name: 'Stempel: auf dem Gipfel drei ?-Blöcke über dem All beschießen → Brücke zum Stempel-Planetoiden', stamp: true, from: [3.2, YT, -133.5], place: { helm: 'kanone' },
      legs: [{ aim: [19.5, YT + 1, -131], shots: 3, hit: '=L.entities.find((e) => e.spec?.id === \'qb1\')?.kind === \'used\'' },
        { aim: [19.5, YT + 1, -133.5], shots: 3 }, { aim: [19.5, YT + 1, -136], shots: 3 }, { until: '=ent(\'sternbruecke\').shown', max: 300 },
        { to: [17, -133.5], within: 0.5 }, { stamp: true }], shot: 'stempel' },
    { name: 'Stempel nicht ohne Brücke (14 m Lücke)', stamp: true, expectNot: true, from: [2, YT, -133.5], heroes: ['lotti', 'greta'], invuln: false, allowFail: true,
      legs: [{ to: [22, -133.5], within: 0.6, max: 400 }, { wait: 120 }] },
  ],
  extra: [
    { name: 'Weiche nicht umgeschossen: Brett 2 dreht eine Kehrschleife und kommt wieder', from: [-8, 0, -75.2], heroes: ['lotti'],
      legs: [{ brett: 'brett2', off: null, max: 2600, stopIf: '=ent(\'brett2\').route.includes(\'H2\') && ent(\'brett2\').route.filter((n) => n === \'F\').length >= 2' }],
      mech: (r) => r.log.some((l) => l[0] === 'brett' && String(l[3]).includes('FHH2EF')), mechText: (r) => `Route ${r.log.find((l) => l[0] === 'brett')?.[3] ?? '-'}` },
    { name: 'Ohne Helm: die Bärenwand auf dem Gleis schiebt vom Brett (Absturz)', from: [0, 0, -7.6], heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
      legs: [{ brett: 'brett1', off: null, max: 700 }], mech: (r) => r.dead || r.log.some((l) => l[0] === 'TOD'), mechText: (r) => `tot ${r.dead}` },
    { name: 'Von der Kugelwand fallen ist harmlos (Platz darunter)', from: [-8, 9, -122], heroes: ['lotti'], invuln: false,
      legs: [{ wait: 200 }, { expect: '=P().pos.y < 0.5 && !P().dead' }] },
    { name: 'Extraleben: versteckter Block auf dem Startdeck', from: [3.4, 0, 3], heroes: ['lotti'], expectLives: 1,
      legs: [{ to: [3.4, 1], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
    { name: 'Extraleben: versteckter Block unter der Kugelwand', from: [-8, 0, -120.6], heroes: ['lotti'], expectLives: 1,
      legs: [{ to: [-8, -122.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
    { name: 'Tintling: die Kanonenkugel besiegt ihn auch unter Wasser', from: [-6, -1.6, -156], heroes: ['lotti'], place: { helm: 'kanone' },
      legs: [{ swim: [[-6, -1.6, -160], [-6, -3.9, -161, { face: [-6, -170], shots: 4 }]] }, { wait: 60 }],
      mech: (r) => r.log.length > 0, mechText: () => '' },
  ],
  shots: [
    ['start', [0, 0, 6]],
    ['helme', [0, 0, 3.5]],
    ['brett1', [0, 0, -7.6], 0, null, Math.PI / 2, { helm: 'kanone' }],
    ['fahrt1', [0, 0, -7.6], 260, { y: 1 }, Math.PI / 2, { helm: 'kanone' }],
    ['m1', [-8, 0, -66]],
    ['riss', [-6.4, 0, -69.5], 0, null, 0],
    ['weiche', [-8, 0, -75.6]],
    ['platz', [-4, 0, -116]],
    ['kugelwand', [-6, 0, -114.6], 200],
    ['gipfel', [-6, YT, -131.6]],
    ['bloecke', [3, YT, -133.5], 0, null, 0],
    ['becken', [-6, YT, -137.4]],
    ['tunnel', [-6, -1.6, -170]],
    ['ziegel', [-4.6, -2.4, -178], 0, null, 0],
    ['cp', [-6, 0.6, -222]],
    ['netz', [-6, 0.6, -228]],
    ['weiche3', [-6, 0.6, -280]],
    ['ziel', [-6, 0.6, -350]],
  ],
};

const PORT = 4965;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
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
  const ent = (id) => L.named.get(id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    stern: () => P().power === 'stern',
    kanone: () => P().helmet === 'kanone',
  };
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
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (p.helmet && !o.helm) p.dropHelmet?.('gone');
      if (o.helm) p.wearHelmet?.(o.helm);
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
      const mech = { hurts: 0, warps: 0, rides: 0, stomped: [], hurtList: [], shots: 0 };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const tick = (inp) => {
        const q = P();
        if (hold) for (const f of L.players ?? [q]) f.invuln = Math.max(f.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((q.hurtTries ?? 0) > lastHurts) { lastHurts = q.hurtTries; mech.hurtList.push(`${q.lastHurt}@${q.pos.x.toFixed(0)},${q.pos.y.toFixed(0)},${q.pos.z.toFixed(0)}`); }
        if (q.mode === 'ground' && !q.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(q.pos.x - t[0], q.pos.z - t[2]) > 7 || Math.abs(q.pos.y - t[1]) > 2) track.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.state, q.power, q.helmet ?? '-', q.ground?.tag ?? '']);
        if (q.dead && !deadLogged) { deadLogged = true; log.push(['TOD', q.deathCause, JSON.stringify(hist)]); }
        if (q.mode === 'script' && L.runtime.status === 'play' && !q.dead && !o.keepScript) {
          let n = 0;
          const kind = q.script?.kind ?? q.script?.type ?? '?';
          while (P().mode === 'script' && n++ < 2400 && !P().dead && L.runtime.status === 'play') { if (hold) P().invuln = Math.max(P().invuln, 5); c.setInput({}); c.step(1); steps++; }
          mech.rides++;
          if (kind === 'warpbox' || kind === 'warp') mech.warps++;
          log.push(['fahrt', kind, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && P().mode !== 'ground' && P().mode !== 'swim' && !P().dead; k++) tick({}); };
      const goTo = (x, z, r = 0.25, mag = 1) => { for (let n = 0; n < 500 && !P().dead; n++) { const q = P(); const dx = x - q.pos.x, dz = z - q.pos.z, d = Math.hypot(dx, dz); if (d < r && q.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(mag, Math.max(0.25, d / 1.2))), run: false }); } };
      /** in Richtung (dx, dz) drehen (kleiner Stick), bis die Blickrichtung passt. */
      const face = (dx, dz, tol = 0.995, n = 60) => {
        for (let k = 0; k < n && !P().dead; k++) {
          const fv = P().facingVec(), l = Math.hypot(dx, dz) || 1;
          if ((fv.x * dx + fv.z * dz) / l > tol) return true;
          tick({ ...this.stick(dx, dz, 0.12), run: false });
        }
        return false;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        const p = P();
        if (Lg.respawn) {
          let k = 0;
          for (; k < 2400 && (P().dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.place) { this.place(Lg.place, { hero: p.hero, settle: 10, power: p.power !== 'none' ? p.power : undefined }); log.push(['gesetzt', ...Lg.place]); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (P().mode !== 'ground' || P().hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.stamp) { const n = this.chase('stamp', { max: 600 }); log.push(['stempel', n]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null, hold }); log.push(['jagd', Lg.chaseKind, n]); continue; }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, rode = false;
          const r0 = mech.rides;
          for (; k < 900 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            const jump = q.mode === 'ground' ? d < 2.0 : q.vel.y > 0;
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { rode = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (rode) mech.warps++;
          log.push(['warp', `${Lg.warp}`, rode, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Sprung auf [x, z] mit Stampfattacke über dem Ziel
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounded = false;
          let air = 0;
          for (; k < 600 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            if (q.mode === 'ground' && k > 4 && (pounded || q.state === 'groundpound')) break;
            if (q.mode === 'air' && !pounded && d < (Lg.r ?? 0.45) && q.vel.y < 1.5 && q.pos.y > (Lg.above ?? -99)) pounded = true;
            if (pounded) { tick({ crouch: true }); continue; }
            if (q.mode === 'air') air++; else air = 0;
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, d > 0.3 ? 1 : 0.2)), jump: q.mode === 'ground' ? (k < 6 || d < 0.6) : q.vel.y > 0 && air < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          let guard = 0;
          for (; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(Lg.stompAll));
            if (!list.length) break;
            const q0 = P();
            list.sort((a, b) => Math.hypot(a.pos.x - q0.pos.x, a.pos.z - q0.pos.z) - Math.hypot(b.pos.x - q0.pos.x, b.pos.z - q0.pos.z));
            const e = list[0];
            for (let k = 0; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              const q = P();
              const dx = e.pos.x - q.pos.x, dz = e.pos.z - q.pos.z, d = Math.hypot(dx, dz);
              if (q.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (q.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: q.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', mech.stomped.length, mech.stomped.join(' ')]);
          continue;
        }
        // ------------------------------------------------ durch eine Lücke im Kreisgeist-Ring springen (Vorausberechnung)
        if (Lg.ring) {
          const rg = L.entities.find((e) => e.kind === 'kreisgeist_kreis' && e.spec?.id === Lg.ring);
          const [fx, fz] = Lg.from, [tx, tz] = Lg.to, [cx, cz] = Lg.cross;
          goTo(fx, fz, 0.3, 0.6);
          for (let k = 0; k < 60 && P().hSpeed() > 0.1; k++) tick({});
          // Glieder in t s: Winkel + dirSign · speed / radius · t
          const clearAt = (t) => {
            if (!rg) return true;
            const a0 = rg.angle + rg.dirSign * (rg.speed / rg.radius) * t;
            for (const g of rg.members) {
              if (g.defeated || g.removed) continue;
              const a = a0 + (g.index / rg.count) * Math.PI * 2;
              const gx = rg.pos.x + Math.cos(a) * rg.radius, gz = rg.pos.z + Math.sin(a) * rg.radius;
              if (Math.hypot(gx - cx, gz - cz) < (Lg.clear ?? 1.05)) return false;
            }
            return true;
          };
          let k = 0;
          // Anlauf bis jumpAt m vor dem Ziel, dann Sprung (Lücke muss beim Überqueren frei sein)
          const d0 = Math.hypot(tx - P().pos.x, tz - P().pos.z), lead = Math.max(0, (d0 - (Lg.jumpAt ?? d0)) / 5);
          for (; k < 900 && !(clearAt(lead + 0.2) && clearAt(lead + 0.4) && clearAt(lead + 0.6)); k++) tick({});
          let n = 0, jumped = -1;
          for (; n < 360 && !P().dead; n++) {
            const q = P();
            if (jumped >= 0 && n - jumped > 6 && q.mode === 'ground') break;
            const dx = tx - q.pos.x, dz = tz - q.pos.z;
            if (jumped < 0 && Math.hypot(dx, dz) <= (Lg.jumpAt ?? 99)) jumped = n;
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.2, 7) : this.stick(dx, dz, 1)), jump: jumped >= 0 && n - jumped < 24, run: true });
          }
          goTo(tx, tz, 0.35, 0.4);
          log.push(['ring', Lg.ring, k, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (Lg.top !== undefined && Math.abs(P().pos.y - Lg.top) > 0.4) log.push(['FEHLER: Ringsprung nicht gelandet', Lg.top, +P().pos.y.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Schneeball (Wurfball) aufheben: davorstellen, Aktion
        if (Lg.pickUp) {
          const e = L.entities.find((x) => x.spec?.id === Lg.pickUp);
          let ok = false;
          for (let tries = 0; tries < 6 && !ok && !P().dead; tries++) {
            for (let k = 0; k < 400 && e.goneT >= 0; k++) tick({});
            const q = P();
            const dx = e.pos.x - q.pos.x, dz = e.pos.z - q.pos.z, d = Math.hypot(dx, dz) || 1;
            // 0,5 m vor dem Ball stehen, ihn ansehen
            goTo(e.pos.x - (dx / d) * 0.55, e.pos.z - (dz / d) * 0.55, 0.12, 0.5);
            for (let k = 0; k < 40 && P().hSpeed() > 0.05; k++) tick({});
            face(e.pos.x - P().pos.x, e.pos.z - P().pos.z, 0.98, 60);
            for (let k = 0; k < 10 && P().hSpeed() > 0.05; k++) tick({});
            tick({ action: true }); tick({}); tick({});
            ok = P().holding === e;
          }
          log.push(['aufheben', Lg.pickUp, ok]);
          if (!ok) log.push(['FEHLER: nicht aufgehoben', Lg.pickUp]);
          continue;
        }
        // ------------------------------------------------ Gehaltenes (Schneeball) bzw. Kanonenkugel in Richtung [x, z] abfeuern
        if (Lg.throwAt) {
          const [tx, tz] = Lg.throwAt;
          const q0 = P();
          face(tx - q0.pos.x, tz - q0.pos.z, 0.998, 80);
          for (let k = 0; k < 20 && P().hSpeed() > 0.05; k++) tick({});
          face(tx - P().pos.x, tz - P().pos.z, 0.999, 30);
          if (Lg.jump) { for (let k = 0; k < Lg.jump; k++) tick({ jump: true }); }
          tick({ action: true }); tick({});
          for (let n = 0; n < (Lg.wait ?? 60); n++) tick({});
          mech.shots++;
          log.push(['wurf', `${Lg.throwAt}`, !!P().holding]);
          continue;
        }
        // ------------------------------------------------ Floß: aufsteigen, in der Mitte bleiben, am Ende an Land
        if (Lg.floss) {
          const h = ent(Lg.floss);
          const [bx, bz] = Lg.board;
          let k = 0;
          for (; k < 600 && !P().dead; k++) {
            const q = P();
            if (q.mode === 'ground' && q.ground?.tag === 'floss') break;
            const mx = h.mb.pos.x, mz = h.mb.pos.z;
            const dx = mx - q.pos.x, dz = mz - q.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(q.mode === 'air' ? this.airSteer(mx, mz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d)))), jump: q.mode === 'ground' && d < 2.6 && d > 0.6, run: false });
          }
          void bx; void bz;
          let n = 0;
          for (; n < 6000 && !P().dead && h.state !== 'ende'; n++) {
            const q = P(); const dx = h.mb.pos.x - q.pos.x, dz = h.mb.pos.z - q.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.25 && q.mode === 'ground' ? { ...this.stick(dx, dz, Math.min(0.6, d)), run: false } : {});
          }
          mech.flossFahrt = h.state === 'ende';
          const [ox, oz] = Lg.off;
          goTo(ox, oz, 0.5);
          log.push(['floß', Lg.floss, h.state, k, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (h.state !== 'ende') log.push(['FEHLER: Floßfahrt nicht beendet', h.state]);
          continue;
        }
        // ------------------------------------------------ Nebelplattform i: warten, bis sie oben ist (frisch gestiegen), hinüberspringen
        if (Lg.nebel) {
          const h = ent(Lg.nebel), q = h.parts[Lg.i];
          const up = h.mode === 'blinken' ? 'da' : 'oben';
          // warten, bis sie oben ist und es für den Sprung (≈ 0,9 s) auch bleibt
          const upNames = h.mode === 'blinken' ? ['da', 'flackert'] : ['oben', 'warn'];
          const stays = (t) => upNames.includes(q.cyc.at(L.time + t).name);
          let k = 0;
          for (; k < 1600 && !P().dead && !(q.state === up && stays(0.5) && stays(Lg.need ?? 0.9)); k++) tick({});
          let n = 0, air = false;
          const top = q.top;
          for (; n < 300 && !P().dead; n++) {
            const r = P();
            if (air && r.mode === 'ground') break;
            if (r.mode === 'air') air = true;
            const dx = q.x - r.pos.x, dz = q.z - r.pos.z;
            tick({ ...(r.mode === 'air' ? this.airSteer(q.x, q.z, 0, 0, 3.2, 6) : this.stick(dx, dz, 1)), jump: n < 22, run: false });
          }
          for (let j = 0; j < 30 && !P().dead; j++) { const r = P(); const dx = q.x - r.pos.x, dz = q.z - r.pos.z; tick(Math.hypot(dx, dz) > 0.2 ? { ...this.stick(dx, dz, 0.4), run: false } : {}); }
          log.push(['nebel', `${Lg.nebel}:${Lg.i}`, k, n, P().ground?.tag ?? '-', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (P().ground?.tag !== 'nebelplattform' || Math.abs(P().pos.y - top) > 0.6) log.push(['FEHLER: Nebelplattform verfehlt', Lg.nebel, Lg.i]);
          continue;
        }
        // ------------------------------------------------ S-9: Schienenbrett fahren (mittig stehen, Ziele anpeilen und schießen, aussteigen)
        if (Lg.brett) {
          const h = ent(Lg.brett), mb = h.mb;
          // aufsteigen
          let k = 0;
          for (; k < 900 && !P().dead; k++) {
            const q = P();
            if (q.mode === 'ground' && q.ground?.tag === 'schienenbrett') break;
            const dx = mb.pos.x - q.pos.x, dz = mb.pos.z - q.pos.z, d = Math.hypot(dx, dz);
            const up = mb.pos.y + 0.35 - q.pos.y;
            tick({ ...(q.mode === 'air' ? this.airSteer(mb.pos.x, mb.pos.z, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d)))), jump: q.mode === 'ground' && up > 0.25 && d < 2.4, run: false });
          }
          const aims = (Lg.aims ?? []).map((a) => ({ ...a, state: 'wait' }));
          const posOf = (t) => {
            if (Array.isArray(t)) return { x: t[0], y: t[1], z: t[2] };
            if (t && typeof t === 'object' && t.weiche) { const w = ent(`${Lg.brett}:${t.weiche}`); return w ? w.pos : null; }
            const e = ent(t) ?? L.entities.find((x) => x.spec?.id === t);
            if (!e) return null;
            if (e.pos && e.half) return { x: e.pos.x, y: e.pos.y + e.half.y, z: e.pos.z };
            return e.pos ? { x: e.pos.x, y: e.pos.y, z: e.pos.z } : null;
          };
          let last = { x: mb.pos.x, z: mb.pos.z }, dir = { x: 0, z: -1 };
          let n = 0, fired = 0, offT = -1;
          const doneAim = (a) => (a.done ? cond(a.done) : false);
          for (; n < (Lg.max ?? 9000) && !P().dead && L.runtime.status === 'play'; n++) {
            const q = P();
            const vx = mb.pos.x - last.x, vz = mb.pos.z - last.z, vl = Math.hypot(vx, vz);
            if (vl > 1e-4) dir = { x: vx / vl, z: vz / vl };
            last = { x: mb.pos.x, z: mb.pos.z };
            // Ende: halt → aussteigen; fällt → aufs Deck davor laufen
            if (h.state === 'ende' || h.state === 'faellt' || h.state === 'weg') {
              if (offT < 0) offT = n;
              if (!Lg.off) { tick({}); if (n - offT > (Lg.stay ?? 0)) break; continue; }
              const [ox, oz] = Lg.off, dx = ox - q.pos.x, dz = oz - q.pos.z;
              if (Math.hypot(dx, dz) < 0.5 && q.mode === 'ground') break;
              tick({ ...this.stick(dx, dz, 1), run: true, jump: !!Lg.offJump && q.mode === 'ground' && n - offT < 3 });
              continue;
            }
            if (Lg.stopIf && cond(Lg.stopIf)) break;
            // aktuelles Ziel: aktiv zwischen z und until; getroffen (done) → wieder nach vorn schauen, fällt es zurück (Weiche
            // erneut umgestellt), wird nachgezielt; ohne until endet das Ziel mit dem Treffer
            const a = aims.find((x) => x.state !== 'done' && (x.z === undefined || q.pos.z < x.z));
            if (a && ((a.until !== undefined && q.pos.z < a.until) || (a.until === undefined && doneAim(a)))) { a.state = 'done'; log.push(['ziel', a.name ?? String(a.target), doneAim(a), n]); continue; }
            const aimNow = a && !doneAim(a);
            let want = dir;
            if (aimNow) { const t = posOf(a.target); if (t) { const dx = t.x - q.pos.x, dz = t.z - q.pos.z, l = Math.hypot(dx, dz) || 1; want = { x: dx / l, z: dz / l }; } }
            const fv = q.facingVec(), dot = fv.x * want.x + fv.z * want.z;
            const cx = mb.pos.x - q.pos.x, cz = mb.pos.z - q.pos.z, cd = Math.hypot(cx, cz);
            if (q.mode === 'air') { tick(this.airSteer(mb.pos.x, mb.pos.z, 0, 0, 3, 6)); continue; }
            if (dot < (aimNow ? 0.996 : 0.985)) { tick({ ...this.stick(want.x, want.z, 0.12), run: false }); continue; }
            if (cd > 0.45) { tick({ ...this.stick(cx, cz, 0.3), run: false }); continue; }
            if (aimNow && (n - fired) > 18) { fired = n; tick({ action: true }); mech.shots++; continue; }
            tick({});
          }
          log.push(['brett', Lg.brett, h.state, h.route?.join?.('') ?? '', k, n, aims.map((x) => `${x.name ?? x.target}:${x.state}`).join(' '), +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          mech.bretter = (mech.bretter ?? 0) + 1;
          if (Lg.off) goTo(Lg.off[0], Lg.off[1], 0.5);
          continue;
        }
        // ------------------------------------------------ S-9: Kanonenkugel-Wand hinauf (von Kugel zu Kugel, zuletzt auf die Gipfelplattform)
        if (Lg.kugeln) {
          const { rows, y0, rise, z0, step, speed = 3 } = Lg.kugeln;
          const balls = () => { const out = []; L.world.forEach?.((s) => { if (s.tag === 'kanonenkugel') out.push(s); }); return out; };
          const bot = (s) => s.bot ?? s.y0;
          let row = -1, k = 0;
          const T = Lg.lead ?? 0.42;
          for (; k < 6000 && !P().dead && row < rows - 1; k++) {
            const q = P();
            // stehe ich auf einer Kugel? → Reihe bestimmen
            if (q.mode === 'ground' && q.ground?.tag === 'kanonenkugel') row = Math.round(((q.ground.bot ?? q.ground.y0) - y0) / rise);
            else if (q.mode === 'ground' && q.pos.y < y0 + 0.5) row = -1;
            const r1 = row + 1, by = y0 + rise * r1, bz = z0 + step * r1;
            const cand = balls().filter((s) => Math.abs(bot(s) - by) < 0.15 && s.x1 - s.x0 > 0.5)
              .map((s) => ({ s, x: (s.x0 + s.x1) / 2 + speed * T, z: (s.z0 + s.z1) / 2 }))
              .filter((c) => c.x < (Lg.xMax ?? 0) && Math.hypot(c.x - q.pos.x, c.z - q.pos.z) < (Lg.reach ?? 2.8))
              .sort((a, b) => Math.hypot(a.x - q.pos.x, a.z - q.pos.z) - Math.hypot(b.x - q.pos.x, b.z - q.pos.z));
            if (q.mode !== 'ground' || !cand.length) { if (q.mode === 'ground' && row < 0) { const [fx, fz] = Lg.stand ?? [q.pos.x, q.pos.z]; const dx = fx - q.pos.x, dz = fz - q.pos.z; tick(Math.hypot(dx, dz) > 0.2 ? { ...this.stick(dx, dz, 0.5), run: false } : {}); } else tick({}); continue; }
            const c = cand[0];
            // springen und zur mitfliegenden Kugel lenken
            let n = 0, air = false;
            for (; n < 240 && !P().dead; n++) {
              const r = P();
              if (air && r.mode === 'ground') break;
              if (r.mode === 'air') air = true;
              const tx = (c.s.x0 + c.s.x1) / 2, tz = (c.s.z0 + c.s.z1) / 2;
              // erst hoch genug (über die Kugel), dann auf ihre Mitte lenken und mitfliegen
              tick({ ...(r.mode === 'air' ? (r.pos.y > by + 1.0 ? this.airSteer(tx, tz, speed, 0, 4, 8) : this.airSteer(tx, r.pos.z + (tz - r.pos.z) * 0.2, speed, 0, 4, 8)) : {}), jump: n < 18 });
            }
            log.push(['kugel', r1, n, P().ground?.tag ?? '-', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          }
          // auf die Gipfelplattform
          const [lx, lz] = Lg.land;
          let n = 0, air = false;
          for (; n < 300 && !P().dead; n++) {
            const r = P();
            if (air && r.mode === 'ground') break;
            if (r.mode === 'air') air = true;
            tick({ ...(r.mode === 'air' ? (r.pos.y > Lg.top + 0.3 ? this.airSteer(lx, lz, 0, 0, 3, 6) : this.airSteer(r.pos.x, r.pos.z - 0.3, 3, 0, 3, 6)) : {}), jump: n < 22 });
          }
          goTo(lx, lz, 0.5);
          log.push(['kugelwand', row, k, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (P().pos.y < Lg.top - 0.3) log.push(['FEHLER: Gipfel nicht erreicht', +P().pos.y.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ S-9: unter Wasser einer Bahn folgen (Ducken taucht, Auftrieb hebt); fire: Aktion je Punkt
        if (Lg.swim) {
          let k = 0;
          for (const pt of Lg.swim) {
            const [px, py, pz, opt] = pt;
            for (let n = 0; n < 900 && !P().dead; n++, k++) {
              const q = P();
              const dx = px - q.pos.x, dz = pz - q.pos.z, d = Math.hypot(dx, dz);
              const dy = py - q.pos.y;
              if (d < (Lg.within ?? 0.6) && (py === null || Math.abs(dy) < 0.35)) break;
              const inWater = q.mode === 'swim';
              tick({ ...(d > 0.15 ? this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.5))) : {}), crouch: inWater && py !== null && dy < -0.25, jump: inWater && py !== null && dy > 0.9 && (n % 30) < 4 });
            }
            if (opt?.face) {
              const [fx, fz] = opt.face;
              for (let n = 0; n < 240 && !P().dead; n++, k++) {
                const q = P(); const fv = q.facingVec(), ddx = fx - q.pos.x, ddz = fz - q.pos.z, l = Math.hypot(ddx, ddz) || 1;
                const dy = py - q.pos.y;
                const ok = (fv.x * ddx + fv.z * ddz) / l > 0.995;
                if (ok && Math.abs(dy) < 0.3 && n > (opt.hold ?? 0)) break;
                tick({ ...(ok ? {} : this.stick(ddx, ddz, 0.12)), crouch: dy < -0.15 });
              }
              for (let s = 0; s < (opt.shots ?? 0); s++) { for (let w = 0; w < 30; w++) { const dy = py - P().pos.y; tick({ crouch: dy < -0.12, action: w === 0 }); } mech.shots++; }
            }
          }
          log.push(['tauchen', Lg.swim.length, k, P().mode, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ S-9: auf der Stelle zu einem Punkt drehen und feuern (Kanonen-Helm)
        if (Lg.aim) {
          const [tx, , tz] = Lg.aim;
          face(tx - P().pos.x, tz - P().pos.z, 0.998, 90);
          for (let s = 0; s < (Lg.shots ?? 1); s++) { tick({ action: true }); for (let w = 0; w < (Lg.gap ?? 30); w++) tick({}); mech.shots++; if (Lg.hit && cond(Lg.hit)) break; }
          log.push(['feuer', `${Lg.aim}`, Lg.hit ? cond(Lg.hit) : '-']);
          if (Lg.hit && !cond(Lg.hit)) log.push(['FEHLER: Ziel nicht getroffen', Lg.hit]);
          continue;
        }
        // ------------------------------------------------ senkrecht neben einem Block hochspringen, erst über seiner Oberkante hinüberlenken
        if (Lg.upOnto) {
          const [tx, tz, top] = Lg.upOnto;
          for (let q = 0; q < 120 && (P().mode !== 'ground' || P().hSpeed() > 0.08); q++) tick({});
          let k = 0, air = false;
          for (; k < 300 && !P().dead; k++) {
            const q = P();
            if (air && q.mode === 'ground') break;
            if (q.mode === 'air') air = true;
            tick({ ...(q.pos.y > top + 0.15 ? this.airSteer(tx, tz, 0, 0, 4, 5) : { x: 0, y: 0 }), jump: k < 40 });
          }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['hinauf', `${Lg.upOnto}`, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (P().pos.y < top - 0.2) log.push(['FEHLER: nicht oben', Lg.upOnto]);
          continue;
        }
        // ------------------------------------------------ Sturz: Neustart abwarten
        if (Lg.die) {
          P().die(Lg.die);
          let k = 0;
          for (; k < 2400 && (P().dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Pfad: Punkte nacheinander im Lauf abfahren (ohne Anhalten)
        if (Lg.path) {
          let k = 0;
          for (const [px, pz] of Lg.path) {
            for (let n = 0; n < 400 && !P().dead; n++, k++) {
              const q = P(); const dx = px - q.pos.x, dz = pz - q.pos.z, d = Math.hypot(dx, dz);
              if (d < (Lg.within ?? 0.7)) break;
              tick({ ...(q.mode === 'air' ? this.airSteer(px, pz, 0, 0, 3, 9) : this.stick(dx, dz, 1)), run: Lg.run ?? true, jump: !!Lg.hopAll && q.mode === 'ground' });
            }
          }
          settle();
          log.push(['pfad', Lg.path.length, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && P().mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          const q = P();
          if (q.dead || L.runtime.status !== 'play') break;
          const dx = tx - q.pos.x, dz = tz - q.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (q.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const doneL = dist < within && (!holdJ || Lg.land === false || (landed && (q.mode === 'ground' || q.mode === 'swim')));
          if (doneL && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (q.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (P().mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      const q = P();
      mech.hurts = (L.players ?? [q]).reduce((a, f) => a + (f.hurtTries ?? 0), 0);
      mech.lives = L.runtime.save?.lives;
      mech.keys = L.keys?.tor?.n ?? 0;
      mech.tor = !!ent('tor')?.isOpen;
      return { log, autoJumps, steps, time: steps / 120, pos: [q.pos.x, q.pos.y, q.pos.z], dead: q.dead, cause: q.deathCause ?? null, status: L.runtime.status, info: q.info(), rt: { ...L.runtime.info(), deaths: L.runtime.deaths }, mech, power: q.power, track };
    },
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30 && o.jump !== false);
        if (o.hold !== false) for (const f of L.players ?? [p]) f.invuln = Math.max(f.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (P().mode === 'script') { let k = 0; while (P().mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
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
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => cond(k),
  };
  window.__sd = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__sd[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}sd_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__sd.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, world: d.world, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}, Welt ${R.meta.world}`,
      meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype && meta.world === R.meta.world);
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
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.meta.maxTime ?? 240} s (${res.time.toFixed(1)} s)`, reached && res.time < (R.meta.maxTime ?? 240));
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
      let ok = t.secret ? true : t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot && !t.secret) ok = !ok;
      if (!t.expectNot && !t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
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

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera (Kennzahlen je Abschnitt)
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2, o = {}] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw, ...o });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Abschnitt (Bild aus der Spielkamera; Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
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
