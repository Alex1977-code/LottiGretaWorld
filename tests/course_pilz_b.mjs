// Welt Pilz (Remix-Welt 1, Präfix P): P-5 „Werfertrubel im Sonnensaal“ (Remix von 6-3), P-6 „Riesenwracks im Morgenwind“
// (Remix von 6-2), P-7 „Sinkschollen über dem Blauglutsee“ (Remix von 7-4) und P-Haus „Haus Zehnkampf“ (Kampf-Haus,
// 10 Räume à 10 s). Prüft je Level: Laden ohne Konsolenfehler/-warnungen, Daten (Welt 10, Titel, Thema mit Licht-Variante,
// Musik mit Klang-Variante, Zeit, Sterne, kein Stempel), Remix-Regeln wirksam (Licht im Thema, Klang-Variante im Musiksystem,
// Gegner entfernt/getauscht/neu, Zeitlimit), Gegenprobe: das Basislevel bleibt unverändert (Rohdaten vor/nach dem Auflösen,
// Basis lädt wie bisher), Routen-Bot Lotti und Greta von Start bis Ziel (echte Eingaben über __course.setInput/step, kein
// Teleport auf der Route), alle Sterne mit der echten Mechanik samt Gegenproben, Extras, Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/pilz_b_*.png).
//
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_pilz_b.mjs [P-5|P-6|P-7|P-Haus]
//   PARTS=load,base,route,sweep,targets,extra,shots,haus,haus-extra (Standard alle; je Lauf ≤ 10 min, z. B. erst
//   load,base,route,sweep, dann targets,extra, dann shots) · HEROES=lotti,greta · ONLY=<Text> · VERBOSE=1 · TRACE=1 ·
//   SHOTS=<Name|Name> · DETAIL=1 · RAUM=n (nur dieser Raum im Haus)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Treffer-Versuche werden gezählt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PI = Math.PI;

// ====================================================================================================================
// Routen
// ====================================================================================================================
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, jumpZ, runUp, within, run, slow, max, land,
//   autoJump, stopIf, partial } · { wait } · { hop } · { crouch } · { star: i } · { chaseKind, ids } · { expect } · { until, max }
//   · { warp: [x, z] } · { pipe: [x, z] } (Glasröhre) · { push: Id, dir, center, centerZ, room, roomZ, edges } (Schubser)
//   · { stompAll: Id-Anfang | [Ids], lineUp } · { tap: Id } · { action: n } · { prop: [x, z], rise } (Propeller-Helm)
//   · { glide: [x, z], from? } (Sprung mit gehaltener Taste, Gleitblatt) · { waitPlat: Id } · { waitPend: Id } · { waitZyl: Id }
//   · { grab: Id } (Wurfball aufheben) · { throwAt: [x, y, z] } (werfen) · { pound: [x, z] } · { kill: true } · { power: Name }
//   · { fightRoom: true } (Kampf-Haus: alle Gegner des Raums besiegen)
const Y7 = 1.5, PT7 = 1.0, FX7 = 60;
const WX6 = -110, BUG6 = 5, TT6 = 8.5, LX6 = 100;   // P-6: Wrack 2/4 (x), hohes Vorderdeck, Mastturm, Laderaum

const ROUTES = {
  'P-5': {
    base: '6-3',
    start: [0, 1, 7],
    meta: { title: 'Werfertrubel im Sonnensaal', stars: 3, time: 400, theme: 'fareast@tag', music: 'course_fareast', variant: null, archetype: 'parcours', light: 'tag' },
    enemies: { feuer_werfer: 4, stachelwerfer: 0, pilzling: 2, rollpilz: 2, krallen_pilzling: 1, stachelkugel: 1, stampfstein: 3, schluesselmuenze: 5, wurfball: 3, goal: 0, fliegender_zielmast: 1 },
    baseEnemies: { stachelwerfer: 3, pilzling: 3, schluesselmuenze: 5, goal: 1 },
    remixChecks: [
      { name: 'Werfer statt Stachelwerfern (Bumerang im Erdgeschoss, zwei Hammer im 1. Stock, Feuer im 2. Stock), Warp-Box hinaus versteckt bis zu fünf Schlüsselmünzen, kein Zielmast am Boden – er fliegt pendelnd',
        ok: (r) => r.p5.werfer === 'bumerang,hammer,hammer,feuer' && r.p5.aussenHidden && r.p5.pole === 'pendel' && r.p5.keys === 5 && r.p5.plug && r.p5.schatten },
    ],
    main: [
      { name: 'vor Tür 1', to: [0, -4.6], within: 0.4, run: false },
      { name: 'Tür 1 antippen', tap: 'tuer1', after: 90 },
      { to: [0, -11.2], within: 0.4, run: false },
      { name: 'Tür 2 antippen', tap: 'tuer2', after: 90 },
      { to: [0, -18.2], within: 0.4, run: false },
      { name: 'Tür 3 antippen', tap: 'tuer3', after: 90 },
      { to: [0, -24], within: 0.4, run: false },
      { name: 'rote Röhre', to: [0, -25.5], jump: 24, within: 0.25, run: false },
      { crouch: 4 },
      { expect: 'inHall' },
      { name: 'Pilz-Maske am Saaleingang', to: [-19.5, -43.4], within: 0.3, run: false },
      { wait: 10 },
      { expect: 'masked' },
      { name: '?-Block mit Funkenblüte', to: [-14, -42.8], within: 0.2, run: false }, { hop: 26 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 },
      { expect: 'funken' },
      { name: 'Erdgeschoss: Bumerang-Werfer, Rollpilz, Krallen-Pilzling mit Feuerbällen', shoot: ['w_eg_b', 'r1', 'k1'], z: -44.5 },
      { name: 'Schlüssel 1 am Fuß der Treppe', to: [18.8, -45.8], within: 0.3, run: false },
      { to: [24.4, -48.6], within: 0.4, run: false },
      { name: 'Treppe zum 1. Stock', to: [16.5, -48.6], within: 0.5 },
      { wait: 30 },
      { expect: 'onF2' },
      { name: '1. Stock: zwei Hammer-Werfer, Pilzling', shoot: ['w_1_h1', 'p2', 'w_1_h2'], z: -44.5 },
      { to: [10, -46.4], within: 0.3 },
      { name: 'Tür 1a antippen', tap: 't1a', after: 120 },
      { name: 'Schlüssel 3 in der Nische', to: [10, -51.7], within: 0.3, run: false },
      { to: [10, -46.2], within: 0.4, run: false },
      { name: 'Schlüssel 2 zwischen den Hammer-Werfern', to: [-5, -44.5], within: 0.3, run: false },
      { to: [-23, -44.5], within: 0.6 },
      { to: [-24.4, -48.6], within: 0.4, run: false },
      { name: 'Treppe zum 2. Stock', to: [-16.5, -48.6], within: 0.5 },
      { wait: 30 },
      { expect: 'onF3' },
      { name: '2. Stock: Feuer-Werfer', shoot: ['w_2_f'], z: -44.5 },
      { to: [-6, -46.4], within: 0.3, run: false },
      { name: 'Tür 2a antippen: Schattenblock-Wand', tap: 't2a', after: 120 },
      { expect: 'schattenDa' },
      { name: 'Pilzling und Rollpilz', shoot: ['p3', 'r2'], z: -44.5 },
      { to: [6, -46.4], within: 0.3, run: false },
      { name: 'Tür 2c und zwei Scheinwände', tap: 't2c', after: 120 }, { tap: 'schein1', after: 110 }, { tap: 'schein2', after: 110 },
      { name: 'Schlüssel 4 hinter den Scheinwänden', to: [6, -53.2], within: 0.4, run: false },
      { to: [6, -46.4], within: 0.4, run: false },
      { name: 'Gong im 2. Stock', to: [19.2, -44.5], within: 0.4, run: false }, { tap: 'gong', after: 90 },
      { expect: 'schattenWeg' },
      { to: [-6, -46.4], within: 0.4 },
      { name: 'Schlüssel 5 hinter der Schattenblock-Wand', to: [-6, -52.1], within: 0.3, run: false },
      { to: [-6, -46.4], within: 0.4, run: false },
      { expect: 'keys5' }, { expect: 'aussenOffen' },
      { to: [20.4, -46.9], within: 0.5 },
      { name: 'Warp-Box zum Tempel', to: [23.4, -48.6], jump: 30, within: 0.3, run: false, stopIf: 'onExterior' },
      { wait: 40 },
      { expect: 'onExterior' },
      { name: 'Checkpoint', to: [0, -76.8], within: 0.6 },
      { to: [0, -83], within: 0.4, run: false },
      { name: 'Dachfirst (zwischen den Stampfsteinen)', to: [0, -101.5], within: 0.4 },
      { name: 'Propeller-Helm', to: [3, -105], within: 0.25, run: false },
      { wait: 10 },
      { expect: 'propeller' },
      { to: [0, -109.3], within: 0.3, run: false },
      { name: 'über die Lücke', prop: [0, -120.5], rise: 40 },
      { expect: 'onE3' },
      { to: [0, -126.6], within: 0.4, run: false },
      { name: 'Dachstufe 1', to: [0, -129.8], jump: 30, within: 0.5, run: false },
      { name: 'Dachstufe 2', to: [0, -133.3], jump: 30, within: 0.5, run: false },
      { name: 'oberstes Dach', to: [0, -136.2], jump: 30, within: 0.6, run: false },
      { to: [-5, -135.4], within: 0.4, run: false },
      { name: 'Wolke', to: [-5, -138.2], jumpAt: 2.2, jump: 30, within: 0.6, run: false },
      { expect: 'onMastWolke' },
      { name: 'fliegenden Zielmast fangen', catchPole: 'flugmast', hold: [-5, -138.4], reach: 3.4 },
    ],
    routeChecks: [
      { name: 'drei Schiebetüren, Röhre in den Saal, alle fünf Schlüsselmünzen, Schattenblock-Wand per Gong, Propeller-Flug, Zielmast im Flug gefangen', ok: (r) => r.mech.taps >= 9 && r.mech.props === 1 && r.mech.stomped.length >= 8 && r.rt.pole !== null && r.rt.pole !== undefined },
      { name: 'ohne einen Treffer-Versuch (Pilz-Maske: zugewandte Werfer werfen nicht)', ok: (r) => r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 0: Wurfball im 2. Stock auf die Stachelkugel werfen – sie platzt aus der Glasröhre, durch die Röhre auf den Sternbalkon, Warp-Box zurück', star: 0, from: [-8.2, 11, -42.8], place: { helmet: 'maske' },
        legs: [{ expect: 'pfropfenDa' }, { grab: 'ball_2' }, { to: [-10.6, -42.7], within: 0.3, run: false }, { throwAt: [-16, -42.7], after: 60 }, { expect: 'pfropfenWeg' },
          { pipe: [-15.6, -42.7] }, { expect: 'onBalkon' }, { star: 0 }, { warp: [-32.8, -42.9] }, { expect: 'onF3back' }], shot: 'stern0' },
      { name: 'Stern 0 auch mit der Funkenblüte (Feuerball sprengt die Stachelkugel)', star: 0, from: [-11, 11, -42.7], place: { power: 'funken', helmet: 'maske' }, heroes: ['greta'],
        legs: [{ fire: [-16, -42.7], after: 90 }, { expect: 'pfropfenWeg' }, { pipe: [-15.6, -42.7] }, { expect: 'onBalkon' }, { star: 0 }] },
      { name: 'Stern 0 nicht ohne Ball oder Feuer (die Stachelkugel verstopft die Röhre)', star: 0, expectNot: true, from: [-12, 11, -42.7], heroes: ['lotti'], place: { helmet: 'maske' },
        legs: [{ pipe: [-16, -42.7], max: 300, partial: true }, { wait: 60 }, { expect: 'pfropfenDa' }] },
      { name: 'Stern 1: Sternring auf der Ankunftsterrasse – acht grüne Münzen in 12 s (zwei hoch über dem Weg)', star: 1, from: [0, 12, -75.5],
        legs: [{ expect: 'stern1Versteckt' }, { to: [-3.2, -72.6], within: 0.4, run: false }, { until: 'ringLaeuft', max: 120 },
          { to: [-4.2, -70.4], within: 0.5 }, { to: [-6, -75.6], within: 0.5 }, { to: [-1, -80.2], within: 0.5 }, { to: [0, -78], jumpAt: 0.9, jump: 30, within: 0.5 },
          { to: [3, -77.8], within: 0.5 }, { to: [6, -75.4], within: 0.5 }, { to: [3.8, -70.4], within: 0.5 }, { to: [0, -73.6], jumpAt: 0.9, jump: 30, within: 0.5 },
          { chaseKind: 'starcoin', max: 600, run: true },
          { until: 'stern1Sichtbar', max: 240 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Sternring', star: 1, expectNot: true, from: [0, 12, -73.5], heroes: ['lotti'],
        legs: [{ to: [0, -74.6], within: 0.3, run: false }, { hop: 30 }, { wait: 30 }] },
      { name: 'Stern 2: Gong nach dem Checkpoint → Warp-Box in den Münzraum, goldener Gong zeigt den Stern', star: 2, from: [2.4, 12, -79.2],
        legs: [{ expect: 'muenzwarpZu' }, { tap: 'terrassengong', after: 80 }, { expect: 'muenzwarpOffen' }, { warp: [-3.4, -80.6] }, { expect: 'inGarden' },
          { to: [100, -119.6], within: 0.4 }, { tap: 'goldgong', after: 80 }, { until: 'stern2Sichtbar', max: 200 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne den Gong (Warp-Box verborgen)', star: 2, expectNot: true, from: [-1.2, 12, -80.6], heroes: ['lotti'],
        legs: [{ to: [-3.4, -80.6], jump: 30, within: 0.3, run: false, max: 240, partial: true }, { wait: 60 }, { expect: 'onExterior' }] },
    ],
    extra: [
      { name: 'Warp-Box hinaus erst mit fünf Schlüsselmünzen (ohne bleibt sie verborgen)', from: [20.4, 11, -46.9], heroes: ['lotti'], place: { helmet: 'maske' },
        legs: [{ expect: 'aussenZu' }, { to: [23.4, -48.6], jump: 30, within: 0.3, run: false, max: 240, partial: true }, { wait: 60 }, { expect: 'onF3' }] },
      { name: 'Schattenblock-Wand: Schlüssel 5 erst nach dem Gongschlag', from: [-6, 11, -46.4], heroes: ['lotti'], place: { helmet: 'maske' },
        legs: [{ tap: 't2a', after: 120 }, { to: [-6, -52.1], within: 0.3, run: false, max: 240, partial: true }, { expect: 'vorSchatten' }, { to: [19.2, -44.5], within: 0.4 }, { tap: 'gong', after: 90 },
          { to: [-6, -46.4], within: 0.4 }, { to: [-6, -52.1], within: 0.3, run: false }, { expect: 'schluessel5' }] },
      { name: 'Pilz-Maske: zugewandter Hammer-Werfer wirft nicht – ohne Maske schon', from: [8.5, 6, -44.5], heroes: ['lotti'], place: { yaw: Math.PI, helmet: 'maske' },
        legs: [{ expect: 'merkeWuerfe' }, { wait: 420 }, { expect: 'hammerStill' }, { unmask: true }, { expect: 'merkeWuerfe' }, { wait: 480 }, { expect: 'hammerWirft' }] },
      { name: 'Werfer zielen nur auf ihr Stockwerk (unter dem Hammer-Werfer im Erdgeschoss: kein Wurf)', from: [3, 1, -44.5], heroes: ['lotti'],
        legs: [{ expect: 'merkeWuerfe' }, { wait: 600 }, { expect: 'hammerStill' }] },
      { name: 'Flug-Zielmast: vom obersten Dach aus nicht zu fangen – nur über die Wolken', from: [-5, 19.8, -139.4], heroes: ['lotti'],
        legs: [{ catchPole: 'flugmast', hold: [-5, -139.4], reach: 3, max: 1400 }, { expect: 'playing' }] },
      { name: 'Münzraum voller Bitcoins', from: [100, 0, -100.5], heroes: ['lotti'], expectCoins: 30,
        legs: [{ chaseKind: 'coin', max: 4000, run: true }] },
    ],
    shots: [
      ['start', [0, 1, 7]],
      ['saal_eg', [-14, 1, -44.5]],
      ['saal_1st', [6, 6, -44.5]],
      ['saal_2st_rohr', [-10, 11, -44.5]],
      ['nische_2a', [-6, 11, -47.5]],
      ['saal_gong', [17, 11, -44.5]],
      ['balkon', [-31, 11, -45]],
      ['ankunft', [0, 12, -74]],
      ['helme', [0, 12, -104]],
      ['oberstes_dach', [0, 19.8, -136]],
      ['wolke', [-5, 22.1, -138.2]],
      ['muenzraum', [100, 0, -104]],
    ],
  },
  'P-6': {
    base: '6-2',
    start: [0, 1, 6],
    meta: { title: 'Riesenwracks im Morgenwind', stars: 3, time: 400, theme: 'wreck@morgen', music: 'course_wreck', variant: null, archetype: 'parcours', light: 'morgen' },
    enemies: { spuk: 0, schubser: 13, krakenpilz: 3, pustewolke: 3, walzenwerfer: 1, kreisgeist_kreis: 2, warpbox: 10, starring: 1, steinblock: 30 },
    baseEnemies: { spuk: 2, schubser: 3, krakenpilz: 0, pustewolke: 0, warpbox: 6 },
    remixChecks: [
      { name: 'keine Spuke, Stern-Aufgabe des Schubsers entfernt, fünf Warp-Fahrten (Wrackfelsen → Wrack 2, Vorderdeck → Laderaum, Laderaum → Checkpoint, Bugfelsen → Wrack 4, Wrack 4 → Mastturm), acht Schubser auf Wrack 4 in einer Gruppe',
        ok: (r) => r.p6 && r.p6.chain === 'w_lr>w2_ein,w2_aus>lr_in,lr_out>cp_in,w_ziel>w4_ein,w4_aus>ziel_in' && r.p6.turm && !r.p6.aufgabeStern && r.p6.gruppe === 8 && r.p6.w4Hidden },
    ],
    main: [
      { name: 'Sternring am Anleger', to: [-2.6, 3.6], within: 0.4, run: false },
      { until: 'ringLaeuft', max: 120 },
      { to: [-2.2, -1.5], within: 0.5 }, { to: [2.2, -4.2], within: 0.5 },
      { to: [0, -5.8], within: 0.3, run: false }, { wait: 8 },
      { name: 'Kippschiff 1', to: [0, -8.6], jump: 20, within: 0.6, run: false },
      { to: [-1.6, -10.5], within: 0.3, run: false },
      { to: [1.6, -14.5], within: 0.3, run: false },
      { to: [0, -19.4], jumpAt: 0.9, jump: 30, within: 0.6, run: false },
      { to: [-0.8, -21.6], within: 0.5, run: false },
      { to: [0, -22.8], within: 0.4, run: false },
      { name: '1-m-Kippsteg', to: [0, -33.2], within: 0.4, run: false },
      { chaseKind: 'starcoin', max: 600, run: false },
      { until: 'stern0Sichtbar', max: 240 },
      { name: 'Stern 0 vom Sternring', star: 0 },
      { name: 'Pustewolke über Kippschiff 2', stompAll: ['pw1'] },
      { to: [0, -38], within: 0.5, run: false },
      { name: 'Schubser auf Kippschiff 2', push: 'schubser2', dir: [1, 0], centerZ: -42, roomZ: 4 },
      { to: [0, -49.2], within: 0.4, run: false },
      { name: 'Warp-Box 1 zu Wrack 2', warp: [0, -54.6] },
      { expect: 'onW2' },
      { to: [WX6, -2], within: 0.5, run: false },
      { name: 'auf Wrack 2', to: [WX6, -5.6], jump: 14, within: 0.6, run: false },
      { name: 'mittschiffs zwischen den beiden Schubsern hindurch (außer Sicht)', to: [WX6, -24], within: 0.5, run: false },
      { name: 'Pustewolke am Bug', stompAll: ['pw2'] },
      { to: [WX6, -32.6], within: 0.5, run: false },
      { until: 'liftUnten', max: 900 },
      { name: 'Hebebühne', to: [WX6, -36.4], within: 0.5 },
      { until: 'liftOben', max: 900 },
      { name: 'hohes Vorderdeck', to: [WX6, -39.0], within: 0.4, run: false },
      { name: 'Krakenpilz auf dem Vorderdeck: ausweichen, dann draufspringen', stompAll: ['kp2'], bait: [WX6, -39.0], dodge: [WX6 + 1.5, -40.3] },
      { to: [WX6, -41.2], within: 0.4, run: false },
      { expect: 'onBug2' },
      { name: 'Warp-Box 2 in den Laderaum', warp: [WX6, -43.6] },
      { expect: 'laderaum6' },
      { to: [LX6 + 4, -12], within: 0.6, run: false },
      { to: [LX6 + 6, -20], within: 0.6, run: false },
      { name: 'am Loch vorbei', to: [LX6 + 6, -29.2], within: 0.5, run: false },
      { name: 'gefluteter Laderaum (ohne Spuke)', to: [LX6 + 6, -44.6], within: 0.8, max: 2400 },
      { to: [LX6 + 6, -48], jump: 20, within: 0.6, run: false },
      { to: [LX6 + 6, -56.5], within: 0.6, run: false },
      { name: 'Warp-Box 3 hinaus', warp: [LX6, -59.4] },
      { expect: 'cpInsel6' },
      { name: 'Krakenpilz am Checkpoint: ausweichen, dann draufspringen', stompAll: ['kp3'], bait: [-1.2, -78.6], dodge: [0.5, -79.6] },
      { name: 'Checkpoint', to: [0, -80], within: 0.6 },
      { to: [0, -85.6], within: 0.4, run: false },
      { name: 'kippende Trümmer: Brücke 1', to: [0, -96.9], within: 0.4, run: false },
      { name: 'Brücke 2 (Gegenwind)', to: [0, -107.8], within: 0.4, run: false },
      { name: 'Pustewolke über der Pfahlinsel', stompAll: ['pw3'] },
      { to: [0, -110.4], within: 0.4, run: false },
      { name: 'Brücke 3', to: [0, -121.6], within: 0.4, run: false },
      { name: 'Schubser 1 vom Trümmerschiff', push: 'boss1', dir: [-1, 0] },
      { name: 'Schubser 2 vom Trümmerschiff', push: 'boss2', dir: [1, 0] },
      { until: 'zielOffen6', max: 240 },
      { to: [0, -139.6], within: 0.4, run: false },
      { name: 'Warp-Box 4 zu Wrack 4', warp: [0, -145.4] },
      { expect: 'onW4' },
      { to: [WX6, -119.6], within: 0.5, run: false },
      { name: 'auf Wrack 4', to: [WX6, -123.2], jump: 14, within: 0.6, run: false },
      { name: 'Wrack 4: Schubser 1', push: 's4_1', dir: [-1, 0], center: WX6, room: 3 },
      { name: 'Schubser 2', push: 's4_2', dir: [1, 0], center: WX6, room: 3 },
      { name: 'Schubser 3', push: 's4_3', dir: [-1, 0], center: WX6, room: 3 },
      { name: 'Schubser 4', push: 's4_4', dir: [1, 0], center: WX6, room: 3 },
      { name: 'Schubser 5', push: 's4_5', dir: [-1, 0], center: WX6, room: 3 },
      { name: 'Schubser 6', push: 's4_6', dir: [1, 0], center: WX6, room: 3 },
      { name: 'Schubser 7', push: 's4_7', dir: [-1, 0], center: WX6, room: 3 },
      { name: 'Schubser 8', push: 's4_8', dir: [1, 0], center: WX6, room: 3 },
      { dump: 'schubser' }, { until: 'w4Offen', max: 240 },
      { to: [WX6, -149.4], within: 0.5, run: false },
      { name: 'Bugfelsen', to: [WX6, -153], jump: 14, within: 0.6, run: false },
      { name: 'Warp-Box 5 auf den Mastturm', warp: [WX6, -155.4] },
      { expect: 'onTurm' },
      { to: [0, -165], within: 0.4, run: false },
      { name: 'Kippplattform', to: [0, -170.8], within: 0.4, run: false },
      { name: 'Sprung zur Mastspitze', to: [0, -173], jump: 30, within: 0.2, run: false },
    ],
    routeChecks: [
      { name: 'fünf Warp-Fahrten, Sternring (Stern 0), Hebebühne, 11 Schubser ins Meer gestoßen (8 auf Wrack 4), Mastspitze (Extraleben)', ok: (r) => r.mech.warps === 5 && r.rt.stars[0] && r.mech.pushedOff === 11 && r.rt.pole >= 0.95 },
      { name: 'ohne einen Treffer-Versuch', ok: (r) => r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 0: Sternring am Anleger – acht Sternmünzen über Anleger, Kippschiff 1 und Kippsteg in 15 s', star: 0, from: [-2.6, 1, 5.4],
        legs: [{ expect: 'stern0Versteckt' }, { to: [-2.6, 3.6], within: 0.4, run: false }, { until: 'ringLaeuft', max: 120 },
          { to: [-2.2, -1.5], within: 0.5 }, { to: [2.2, -4.2], within: 0.5 }, { to: [0, -5.8], within: 0.3, run: false }, { wait: 8 },
          { to: [0, -8.6], jump: 20, within: 0.6, run: false }, { to: [-1.6, -10.5], within: 0.3, run: false }, { to: [1.6, -14.5], within: 0.3, run: false },
          { to: [0, -19.4], jumpAt: 0.9, jump: 30, within: 0.6, run: false }, { to: [-0.8, -21.6], within: 0.5, run: false },
          { to: [0, -22.8], within: 0.4, run: false }, { to: [0, -33.2], within: 0.4, run: false }, { dump: 'starcoin' },
          { chaseKind: 'starcoin', max: 600, run: false }, { until: 'stern0Sichtbar', max: 240 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Sternring', star: 0, expectNot: true, from: [0, 1, -34.6], heroes: ['lotti'],
        legs: [{ to: [0, -36.2], within: 0.3, run: false }, { hop: 30 }, { wait: 30 }] },
      { name: 'Stern 1: schmaler Steg rechts der Warp-Box auf dem Vorderdeck von Wrack 2', star: 1, from: [WX6 + 2, BUG6, -42.5],
        legs: [{ to: [WX6 + 4.6, -42.5], within: 0.3, run: false }, { to: [WX6 + 13.6, -42.5], within: 0.3, run: false, slow: 0.7 }, { star: 1 },
          { to: [WX6 + 4, -42.5], within: 0.4, run: false, slow: 0.7 }, { expect: 'onBug2' }], shot: 'stern1' },
      { name: 'Stern 1 nicht vom Deck von Wrack 2 aus (4 m darunter)', star: 1, expectNot: true, from: [WX6 + 4, 1, -31], heroes: ['lotti'],
        legs: [{ to: [WX6 + 5, -33], within: 0.3, run: false }, { hop: 30 }, { wait: 30 }] },
      { name: 'Stern 2: Riesentrank aus dem ?-Block auf Wrack 2, als Riese über den langen Steg, die Steinblock-Wand zertrümmern', star: 2, from: [WX6 - 2.6, 1, -8.6],
        legs: [{ to: [WX6 - 2.6, -10.5], within: 0.2, run: false }, { hop: 26 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 }, { expect: 'riese' },
          { to: [WX6 - 5.6, -16], within: 0.4 }, { to: [WX6 - 18, -16], within: 0.4 }, { to: [WX6 - 20, -16], within: 0.4, max: 300, partial: true }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Riesentrank (die Steinblock-Wand hält)', star: 2, expectNot: true, from: [WX6 - 16, 1, -16], heroes: ['lotti'],
        legs: [{ to: [WX6 - 20, -16], within: 0.3, max: 300, partial: true }, { hop: 40 }, { wait: 30 }, { expect: 'wandSteht' }] },
    ],
    extra: [
      { name: 'Geheimnis: Münzen unter dem gehobenen Wrackheck auf der Sandbank', from: [4.2, 1, -4.4], heroes: ['lotti'], expectCoins: 5,
        legs: [{ to: [7.6, -4.4], jump: 20, within: 0.5, run: false }, { to: [9, -3.2], within: 0.4, run: false }, { to: [9, -5.6], within: 0.4, run: false },
          { to: [10.2, -4.4], within: 0.4, run: false }, { to: [7.8, -4.4], within: 0.4, run: false }] },
      { name: 'Geheimnis: unsichtbarer Extraleben-Block vorn an Wrack 2', from: [WX6, BUG6, -44.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [WX6, -45.2], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Geheimnis: unsichtbarer Riesentrank-Block auf Wrack 4 – der Riese wirft Schubser bei Berührung um', from: [WX6, 1, -122.2], heroes: ['lotti'],
        legs: [{ to: [WX6, -123.6], within: 0.2, run: false }, { hop: 30 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 }, { expect: 'riese' },
          { chaseKind: 'schubser', ids: ['s4_2', 's4_1'], max: 900 }, { wait: 30 }, { expect: 'zweiS4Weg' }] },
      { name: 'Warp-Box auf Wrack 4 verborgen, solange Schubser an Bord sind', from: [WX6, 1, -153], heroes: ['lotti'],
        legs: [{ expect: 'w4Zu' }, { to: [WX6, -155.4], jump: 30, within: 0.3, run: false, max: 300 }, { wait: 60 }, { expect: 'nichtTurm' }] },
      { name: 'Hebebühne fährt allein auf und ab (kein Festsitzen nach einem Sturz)', from: [WX6 + 3, BUG6, -40.4], heroes: ['lotti'],
        legs: [{ until: 'liftOben', max: 900 }, { until: 'liftUnten', max: 900 }, { until: 'liftOben', max: 900 }] },
    ],
    shots: [
      ['start', [0, 1, 6]],
      ['wrackheck', [7.4, 1, -1]],
      ['schiff1', [0, 1, -11]],
      ['wrackfelsen', [0, 1, -51]],
      ['wrack2', [WX6, 1, 2]],
      ['wrack2_deck', [WX6, 1, -16]],
      ['riesensteg', [WX6 - 12, 1, -16]],
      ['hebebuehne', [WX6, 1, -32]],
      ['vorderdeck', [WX6, BUG6, -41]],
      ['laderaum', [LX6, 4, -12]],
      ['checkpoint', [0, 1, -78]],
      ['truemmer', [0, 1, -100]],
      ['wrack4', [WX6, 1, -118]],
      ['wrack4_deck', [WX6, 1, -131]],
      ['mastturm', [0, TT6, -162.6]],
      ['maststeg', [0, TT6, -168]],
    ],
  },
  'P-7': {
    base: '7-4',
    start: [0, Y7, 6],
    meta: { title: 'Sinkschollen über dem Blauglutsee', stars: 3, time: 400, theme: 'bluelava@nacht', music: 'course_bluebelt', variant: 'nacht', archetype: 'parcours', light: 'nacht' },
    enemies: { schubser: 0, knochenflieger: 0 },
    baseEnemies: { schubser: 6, knochenflieger: 5 },
    remixChecks: [
      { name: 'keine Schubser und keine Knochenflieger, Pfeilplattformen aus der Lava durch 14 Sinkschollen ersetzt (die drei aus der Mauer bleiben), Gleitblatt statt Wurfsichel in den ?-Blöcken, Rätselbox ohne Aufgabe',
        ok: (r) => r.kinds.schubser === undefined && r.schollen === 14 && r.pfeil === 3 && r.qGleit === 3 && r.qSichel === 0 && !r.rbTask },
    ],
    main: [
      { name: 'Hofkante', to: [0, -6.3], within: 0.4, run: false },
      { name: 'Sinkscholle 1', to: [-1.2, -10.2], jump: 20, within: 0.8, run: false },
      { to: [1.2, -13.8], jump: 20, within: 0.8, run: false },
      { to: [-1.2, -17.4], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau A', to: [0, -22], jump: 20, within: 0.8, run: false },
      { name: 'Pendel 1', waitPend: 'pd1', to: [0, -26], within: 0.5, run: true },
      { name: 'Pendel 2', waitPend: 'pd2', to: [0.5, -29.6], within: 0.6, run: true }, { to: [0.5, -30.5], within: 0.4, run: false },
      { to: [1.5, -33.4], jump: 20, within: 0.8, run: false },
      { to: [-0.5, -37.6], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau B', to: [1, -42.5], jump: 20, within: 0.8, run: false },
      { to: [3, -43], within: 0.6, run: false }, { to: [3, -47.6], within: 0.5, run: false },
      { to: [-1.5, -49], within: 0.5, run: false }, { to: [-1.5, -55.3], within: 0.4, run: false }, { to: [2, -55.4], within: 0.4, run: false },
      { to: [3, -58.6], jump: 20, within: 0.8, run: false },
      { to: [1, -62.6], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau C', to: [-1.5, -67.5], jump: 20, within: 0.8, run: false },
      { to: [-1.6, -76.4], within: 0.4, run: false },
      { name: 'Brücken-Pendel', waitPend: 'pd3', far: 3.2, to: [0, -80.1], within: 0.4, run: true },
      { waitPend: 'pd4', far: 3.2, to: [0, -84.5], within: 0.5, run: true },
      { name: 'Checkpoint', to: [0, -86.6], within: 0.5 },
      { to: [1.4, -88.6], within: 0.4, run: false }, { to: [1.4, -91.6], within: 0.4, run: false }, { to: [0.5, -92.6], within: 0.4, run: false },
      { name: 'Zylinder 1', to: [0, -96.5], jump: 20, within: 0.9, run: false },
      { to: [0, -101.5], jumpZ: -97.4, jump: 24, within: 0.9, run: true },
      { name: 'Steinbau E', to: [3, -102], within: 0.5, run: false }, { to: [3, -105.6], within: 0.4, run: false },
      { to: [-3, -105.9], within: 0.4, run: false }, { to: [-3, -110.4], within: 0.4, run: false }, { to: [4.4, -111.6], within: 0.4, run: false },
      { name: 'Mauer-Pfeilplattformen', waitPlat: 'pw1', to: [5, -114.5], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pw2', to: [5, -118], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pw3', to: [5, -121.5], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau F', to: [4, -124], jump: 20, within: 0.8, run: false },
      { to: [-3.4, -128.4], within: 0.5, run: false }, { to: [-3.4, -132.6], within: 0.4, run: false },
      { name: 'Stachel-Zylinder 2', waitZyl: 'zyl2', to: [0, -136.5], jump: 20, within: 0.9, run: false },
      { to: [0, -141], jumpZ: -137.4, jump: 24, within: 0.9, run: true },
      { name: 'Pendel G', waitPend: 'pd5', far: 3.2, to: [0, -144], within: 0.4, run: true },
      { waitPend: 'pd6', far: 3.2, to: [0, -147.6], within: 0.4, run: true },
      { name: 'Zylinder 3', to: [0, -151.5], jump: 20, within: 0.9, run: false },
      { to: [0, -156], jumpZ: -152.4, jump: 24, within: 0.9, run: true },
      { name: 'Steinbau H', to: [3, -156.6], within: 0.4, run: false }, { to: [3, -159.8], within: 0.4, run: false },
      { to: [-3, -159.9], within: 0.4, run: false }, { to: [-1, -162.6], within: 0.4, run: false },
      { name: 'Zylinder 4', to: [0, -166.5], jump: 20, within: 0.9, run: false },
      { to: [0, -171], jumpZ: -167.4, jump: 24, within: 0.9, run: true },
      { name: 'Steinbau I', to: [3, -171.6], within: 0.4, run: false }, { to: [3, -175], within: 0.4, run: false },
      { to: [-3, -175.2], within: 0.4, run: false }, { to: [-3, -178.2], within: 0.4, run: false },
      { name: 'Röhre zum Finale', to: [0, -181], jump: 20, within: 0.3, run: false }, { crouch: 20 },
      { expect: 'onFinale7' },
      { to: [62.5, -182], within: 0.4, run: false }, { to: [62.5, -184.7], within: 0.4, run: false },
      { to: [57.5, -184.9], within: 0.4, run: false }, { to: [58.5, -189.3], within: 0.4, run: false },
      { name: 'Kippplattform', to: [60, -193], jump: 16, within: 0.6, run: false },
      { to: [60, -203.6], within: 0.5, run: false },
      { name: 'Sinkschollen zum Zielhof', to: [59, -207.6], jump: 22, within: 0.8, run: false },
      { to: [61, -211.6], jump: 20, within: 0.8, run: false },
      { to: [59, -215.6], jump: 20, within: 0.8, run: false },
      { to: [60, -220.5], jump: 20, within: 0.8, run: false },
      { name: 'Zielmast', to: [60, -227.5], within: 0.2 },
    ],
    routeChecks: [
      { name: 'über alle zehn Sinkschollen des Hauptwegs (jede einmal belastet), ohne einen Treffer-Versuch', ok: (r) => r.mech.schollen >= 10 && r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 0: über die Seitensäule auf die sinkenden Schollen links vom Start, auf der zweiten hochspringen', star: 0, from: [-3, Y7, 0],
        legs: [{ to: [-5.4, -1.5], within: 0.3, run: false }, { to: [-8.2, -1.5], jump: 24, within: 0.6, run: false },
          { to: [-11.8, -3.6], jump: 26, within: 0.8, run: false }, { to: [-15.2, -7.6], jump: 28, within: 0.8, run: false }, { hop: 30 },
          { to: [-11.8, -3.6], jump: 28, within: 0.9, run: false }, { to: [-8.2, -1.5], jump: 30, within: 0.7, run: false }, { to: [-4.5, -1.5], jump: 24, within: 0.8, run: false },
          { expect: 'onStartYard' }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne die Schollen (Sprung von der Seitensäule)', star: 0, expectNot: true, from: [-8.2, Y7 + 0.6, -1.5], heroes: ['lotti'], invuln: false,
        legs: [{ to: [-15.2, -7.6], jump: 40, within: 0.5, max: 300, land: false, partial: true }, { wait: 200 }] },
      { name: 'Stern 1: Seitenweg G → Scholle → Walzeninsel, im Sprung über die Stachelwalze, Scholle → Steinbau H', star: 1, from: [0, Y7, -145],
        legs: [{ to: [-4.3, -145.5], within: 0.4, run: false }, { to: [-8.1, -144.5], jump: 24, within: 0.8, run: false },
          { to: [-9.75, -148.6], jump: 24, within: 0.6, run: false }, { to: [-9.75, -155], jumpZ: -149.9, jump: 34, within: 0.6, run: true },
          { to: [-8.1, -159], jump: 24, within: 0.8, run: false }, { to: [-3.6, -159], jump: 28, within: 0.6, run: true }, { expect: 'onH7' }], shot: 'stern1',
        mech: (r) => r.mech.hurts === 0, mechText: (r) => `Treffer-Versuche ${r.mech.hurts}` },
      { name: 'Stern 1 nicht auf dem Hauptweg über Zylinder 3', star: 1, expectNot: true, from: [0, Y7, -147.6], heroes: ['lotti'],
        legs: [{ to: [0, -151.4], jump: 20, within: 0.9, run: false }, { to: [0, -156], jumpZ: -152.4, jump: 24, within: 0.9, run: true }] },
      { name: 'Stern 2: Gleitblatt aus dem ?-Block auf Steinbau I, vom Röhrendach hinter die Röhre gleiten – die unsichtbare Plattform erscheint, Warp-Box zurück', star: 2, from: [3.5, Y7, -170.8],
        legs: [{ to: [3.5, -171.6], within: 0.2, run: false }, { hop: 30 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 }, { expect: 'gleitblatt' },
          { to: [1.4, -178.6], within: 0.4, run: false }, { to: [0, -181], jump: 20, within: 0.3, run: false }, { expect: 'onPipe7' },
          { glide: [0, -202.2], runUp: 0 }, { wait: 12 }, { expect: 'geheimSichtbar' }, { star: 2 }, { until: 'zurueckDa', max: 120 }, { warp: [1.7, -203.6] }, { expect: 'onI7' }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Gleitblatt (Sprung vom Röhrendach fällt in die Lava)', star: 2, expectNot: true, from: [0, Y7 + 1.4, -181], heroes: ['lotti'], invuln: false,
        legs: [{ glide: [0, -202.2], hold: false }, { wait: 240 }] },
    ],
    extra: [
      { name: 'Sinkscholle versinkt mit der Figur in der Lava (stehen bleiben)', from: [0, Y7, -6.3], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [-1.2, -10.2], jump: 20, within: 0.6, run: false }, { wait: 700 }], mech: (r) => r.cause === 'lava', mechText: (r) => `${r.cause}` },
      { name: 'Sinkscholle steigt ohne Last wieder auf', from: [0, Y7, -6.3], heroes: ['lotti'],
        legs: [{ to: [-1.2, -10.2], jump: 20, within: 0.6, run: false }, { wait: 90 }, { expect: 's1Tiefer' }, { to: [0, -5.8], jump: 20, within: 0.8, run: false }, { wait: 300 }, { expect: 's1Oben' }] },
      { name: 'Gleitblatt aus dem ?-Block am Start (früher Wurfsichel)', from: [3, Y7, 5], heroes: ['lotti'],
        legs: [{ to: [3, 4], within: 0.2, run: false }, { hop: 30 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 }, { expect: 'gleitblatt' }] },
      { name: 'Kippplattform neigt sich ohne Schubser unter der Figur', from: [60, Y7, -191], heroes: ['lotti'],
        place: { settle: 4 }, legs: [{ to: [60, -191.4], within: 0.3, run: false }, { wait: 240 }, { expect: 'kippVorn' }] },
      { name: 'Rätselbox führt in den Münzraum (ohne Aufgabe, kein Stern)', from: [2.4, Y7, -75.9], heroes: ['lotti'],
        legs: [{ warp: [4.2, -75.6] }, { expect: 'inRaetsel7' }, { chaseKind: 'coin', max: 900 }, { warp: [100, -65.2] }, { expect: 'backFromRaetsel7' }], expectCoins: 6 },
    ],
    shots: [
      ['start', [0, Y7, 6]],
      ['sternkette', [-6, Y7, 0]],
      ['schollen', [0, Y7, -6]],
      ['steinbau_b', [1, Y7, -44]],
      ['steinbau_c', [-1.5, Y7, -66.5]],
      ['checkpoint', [0, Y7, -86]],
      ['zylinder', [0, Y7, -110]],
      ['walzeninsel', [-4.5, Y7, -146]],
      ['steinbau_i', [3, Y7, -171]],
      ['roehrendach', [0, Y7 + 1.4, -181]],
      ['finale', [60, Y7, -186]],
      ['kipp', [60, Y7, -200]],
      ['ziel', [60, Y7, -222]],
    ],
  },
};

// ====================================================================================================================
// Prüfstand
// ====================================================================================================================
const PORT = 4995;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split("|").some((o) => t.name.includes(o))) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,base,route,sweep,targets,extra,shots,haus,haus-extra').split(','));
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
  const PI = Math.PI;
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const named = (id) => L.named.get(id);
  const ent = (id) => L.entities.find((e) => e.spec?.id === id && !e.removed);
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? src?.tag ?? String(src); return orig(src); };
  };
  wrapHurt();
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const onGround = () => P().mode === 'ground' && !P().dead;
  const COND = {
    // P-5 (wie course_w6b für 6-3)
    inHall: () => P().pos.z < -40 && P().pos.z > -53 && Math.abs(P().pos.x) < 26,
    onF2: () => P().mode === 'ground' && Math.abs(P().pos.y - 6) < 0.3 && P().pos.z < -40,
    onF3: () => P().mode === 'ground' && Math.abs(P().pos.y - 11) < 0.3 && P().pos.z < -40,
    onExterior: () => P().pos.z < -66 && P().pos.y > 11.5 && Math.abs(P().pos.x) < 20,
    propeller: () => P().helmet === 'propeller',
    onE3: () => P().mode === 'ground' && Math.abs(P().pos.y - 12) < 0.3 && P().pos.z < -117.8 && P().pos.z > -128.2,
    masked: () => P().helmet === 'maske' && !!P().masked,
    funken: () => P().power === 'funken',
    stern1Versteckt: () => L.entities.some((e) => e.kind === 'star' && e.index === 1 && e.hidden && !e.removed),
    vorSchatten: () => P().pos.z > -51.2 && (L.keys?.saal?.n ?? 0) === 0,
    schluessel5: () => (L.keys?.saal?.n ?? 0) === 1,
    schattenDa: () => !!named('schattenwand') && named('schattenwand').want !== false,
    schattenWeg: () => named('schattenwand')?.want === false,
    keys5: () => (L.keys?.saal?.n ?? 0) >= 5,
    aussenOffen: () => !named('aussen')?.hidden,
    aussenZu: () => !!named('aussen')?.hidden,
    onMastWolke: () => onGround() && P().pos.y > 21.5 && /wolke/.test(P().ground?.tag ?? ''),
    pfropfenWeg: () => !!named('pfropfen:pfropfen')?.popped,
    pfropfenDa: () => !named('pfropfen:pfropfen')?.popped,
    onBalkon: () => onGround() && P().pos.x < -27.8 && Math.abs(P().pos.y - 11) < 0.3,
    onF3back: () => onGround() && Math.abs(P().pos.y - 11) < 0.3 && P().pos.x > -18 && P().pos.z < -40,
    muenzwarpZu: () => !!named('muenzwarp')?.hidden,
    muenzwarpOffen: () => !named('muenzwarp')?.hidden,
    inGarden: () => P().pos.x > 85 && P().pos.z < -95,
    stern2Sichtbar: () => !!L.runtime.stars[2] || L.entities.some((e) => e.kind === 'star' && e.index === 2 && !e.hidden && !e.removed),
    stern1Sichtbar: () => !!L.runtime.stars[1] || L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && !e.removed),
    ringLaeuft: () => L.entities.some((e) => e.kind === 'starcoin' && !e.removed && !e.hidden),
    hammerStill: () => (ent('w_1_h1')?.throws ?? 0) === (window.__thr0 ?? 0),
    hammerWirft: () => (ent('w_1_h1')?.throws ?? 0) > (window.__thr0 ?? 0),
    merkeWuerfe: () => { window.__thr0 = ent('w_1_h1')?.throws ?? 0; return true; },
    goal: () => L.runtime.status === 'goal' || L.runtime.status === 'done',
    playing: () => L.runtime.status === 'play',
    // P-6
    onW2: () => P().pos.x < -90 && P().pos.z > -50 && !P().dead,
    onBug2: () => onGround() && Math.abs(P().pos.y - 5) < 0.4 && P().pos.x < -90 && P().pos.z < -38.4,
    laderaum6: () => P().pos.x > 85 && P().pos.z > -20,
    cpInsel6: () => at(-7, 7, 0.5, -73, -87),
    zielOffen6: () => !named('w_ziel')?.hidden,
    onW4: () => P().pos.x < -90 && P().pos.z < -100 && !P().dead,
    w4Offen: () => !named('w4_aus')?.hidden,
    w4Zu: () => !!named('w4_aus')?.hidden,
    onTurm: () => onGround() && P().pos.y > 8.2 && P().pos.y < 10 && Math.abs(P().pos.z + 162.6) < 3,
    nichtTurm: () => !(Math.abs(P().pos.y - 8.5) < 0.6 && Math.abs(P().pos.z + 162.6) < 3) && P().pos.x < -90,
    liftUnten: () => (named('hebebuehne')?.pm.pos.y ?? 9) < 0.55,
    liftOben: () => (named('hebebuehne')?.pm.pos.y ?? 0) > 4.45,
    stern0Versteckt: () => L.entities.some((e) => e.kind === 'star' && e.index === 0 && e.hidden && !e.removed),
    stern0Sichtbar: () => !!L.runtime.stars[0] || L.entities.some((e) => e.kind === 'star' && e.index === 0 && !e.hidden && !e.removed),
    riese: () => P().power === 'riese',
    wandSteht: () => L.entities.filter((e) => e.kind === 'steinblock' && !e.removed && !e.broken && e.alive !== false).length === 30,
    zweiS4Weg: () => ['s4_1', 's4_2'].every((id) => { const e = L.entities.find((x) => x.spec?.id === id); return !e || e.defeated || e.removed || !e.alive; }),
    // P-7
    onFinale7: () => at(53, 67, 1, -175, -191),
    onStartYard: () => onGround() && at(-6, 6, 1.2, 10, -7),
    onH7: () => onGround() && at(-5.2, 5.2, 1.2, -155, -163),
    onPipe7: () => onGround() && P().pos.y > 2.6 && Math.abs(P().pos.z + 181) < 1,
    onI7: () => onGround() && at(-6, 6, 1.2, -170, -184),
    gleitblatt: () => P().power === 'gleitblatt',
    geheimSichtbar: () => !!named('geheim')?.shown,
    zurueckDa: () => !named('geheim_zurueck')?.hidden,
    s1Tiefer: () => named('s1').top < named('s1').top0 - 0.2,
    s1Oben: () => named('s1').top > named('s1').top0 - 0.01,
    kippVorn: () => Math.abs(named('kipp')?.angle ?? 0) > 2,
    inRaetsel7: () => P().pos.x > 85,
    backFromRaetsel7: () => at(-4, 6, 1, -65, -78),
  };
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      if (p.helmet) p.dropHelmet?.('gone');
      p.holding = null;
      p.reset(pos, o.yaw ?? PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (o.helmet) p.wearHelmet(o.helmet);
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
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, taps: 0, props: 0, glides: 0, throws: 0, stomped: [], hurtList: [], schollen: 0 };
      const foes0 = L.entities.filter((e) => e.enemy && e.alive && !e.defeated);
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const schollenSeen = new Set();
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); if (window.__trace) log.push(['TREFFER', p.lastHurt, steps, JSON.stringify(hist.slice(-12))]); }
        if (p.mode === 'ground' && p.ground?.tag === 'sinkscholle' && !schollenSeen.has(p.ground)) { schollenSeen.add(p.ground); mech.schollen++; }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '', +Math.hypot(p.vel.x, p.vel.z).toFixed(1)]);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript && p.script?.type !== 'house') {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play' && p.script?.type !== 'house') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasspipe' || kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') {
          if (Lg.until && COND[Lg.until]?.()) { log.push(['bis', Lg.until, 0]); continue; }
          if (!(Lg.wait || Lg.expect || Lg.until)) break;
        }
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 40; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.kill) { p.invuln = 0; p.die('fall'); log.push(['tot gesetzt']); continue; }
        // ------------------------------------------------ Knochenflieger abwarten: stehen bleiben, beim Sturzflug hochspringen (Reflex) – er landet unter der Figur
        if (Lg.waitFlier) {
          const e = ent(Lg.waitFlier);
          let k = 0;
          for (; k < (Lg.max ?? 900) && e && e.alive && !e.defeated && !e.removed && !p.dead; k++) tick(p.mode === 'air' ? this.airSteer(Lg.hold?.[0] ?? p.pos.x, Lg.hold?.[1] ?? p.pos.z, 0, 0, 3, 4) : {});
          const ok = !e || !e.alive || e.defeated || e.removed;
          if (ok) mech.stomped.push(Lg.waitFlier);
          log.push(['flieger', Lg.waitFlier, ok, k]);
          for (let q = 0; q < 200 && p.mode !== 'ground' && !p.dead; q++) tick(this.airSteer(Lg.hold?.[0] ?? p.pos.x, Lg.hold?.[1] ?? p.pos.z, 0, 0, 3, 4));
          continue;
        }
        if (Lg.power) { p.setPower(Lg.power); log.push(['power', Lg.power]); continue; }
        if (Lg.dump) { log.push(['übrig', Lg.dump, L.entities.filter((e) => e.kind === Lg.dump && e.alive && !e.removed && !e.hidden).map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1)])]); continue; }
        if (Lg.unmask) { p.dropHelmet?.('gone'); log.push(['Maske ab', p.helmet ?? null]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.action) { for (let k = 0; k < Lg.action; k++) tick({ action: k % 2 === 0 }); log.push(['aktion', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.helmet]); continue; }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: Lg.max ?? 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Bildschirm-Tipp auf ein Antipp-Ziel (wie ein Finger)
        if (Lg.tap) {
          const h = named(Lg.tap);
          const t = L.taps?.targets.find((x) => x.owner === h);
          c.snapCamera();
          const sp = t ? L.taps.screenPos(t) : null;
          const before = JSON.stringify(h?.info?.() ?? null);
          if (sp?.visible) L.taps.tapScreen(sp.x, sp.y);
          for (let k = 0; k < (Lg.after ?? 60); k++) tick({});
          const after = JSON.stringify(h?.info?.() ?? null);
          mech.taps++;
          log.push(['antippen', Lg.tap, sp ? [Math.round(sp.x), Math.round(sp.y), sp.visible] : null, after]);
          if (!h || before === after) log.push(['FEHLER: Antippen ohne Wirkung', Lg.tap]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.rides;
          let k = 0;
          for (; k < (Lg.max ?? 900) && mech.rides === r0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: Lg.run ?? false, jump: !!Lg.jump && p.mode === 'ground' && Math.hypot(dx, dz) < (Lg.jumpAt ?? 1.6) });
          }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.rides > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.rides === r0 && !Lg.partial) { log.push(['FEHLER: Glasröhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
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
          if (!rode && !Lg.partial) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Gleitflug: Anlauf, Sprung (Taste gehalten), im Fall weiter halten
        if (Lg.glide) {
          const [tx, tz] = Lg.glide;
          const holdAll = Lg.hold !== false;
          let k = 0, air = false;
          const y0 = p.pos.y;
          for (; k < 1500 && !p.dead; k++) {
            if (air && p.mode === 'ground') break;
            if (p.mode === 'air') air = true;
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            const st = p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.2, 10) : this.stick(dx, dz, 1);
            tick({ ...st, run: true, jump: holdAll ? true : k < 30 });
          }
          if (air) mech.glides++;
          log.push(['gleiten', air, k, +y0.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '', p.state]);
          continue;
        }
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounding = false;
          for (; k < 400; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.4 && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 34, run: false });
          }
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        // ------------------------------------------------ Propeller-Helm: hochfliegen, mit gehaltener Aktion hinübergleiten
        if (Lg.prop) {
          const [tx, tz] = Lg.prop;
          if (p.helmet !== 'propeller') log.push(['FEHLER: kein Propeller-Helm']);
          tick({ action: true });
          let k = 0, apex = p.pos.y, via = Lg.via ?? null;
          for (; k < 1500; k++) {
            apex = Math.max(apex, p.pos.y);
            if (via && Math.hypot(via[0] - p.pos.x, via[1] - p.pos.z) < 0.6 && p.vel.y <= 0.5) via = null;
            const [gx, gz] = via ?? [tx, tz];
            const rising = p.vel.y > 0 && k < (Lg.rise ?? 60);
            const steer = rising && Lg.straight ? {} : this.airSteer(gx, gz, 0, 0, 2.2, Lg.vmax ?? 6);
            tick({ ...steer, run: true });
            if (k > 10 && p.mode === 'ground') break;
          }
          mech.props++;
          log.push(['Propeller', k, +apex.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.ground?.tag]);
          continue;
        }
        // ------------------------------------------------ Gegner (Ids bzw. Id-Anfang) nacheinander von oben besiegen (wie course_w6b:
        // Rollpilz per Stampfattacke; lineUp: Blick bleibt zum Gegner – mit Pilz-Maske sieht ein zugewandter Werfer die Figur nicht)
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          const done = [];
          let guard = 0;
          for (; guard < 60; guard++) {
            const want = (e) => (Array.isArray(pre) ? pre.includes(e.spec?.id) : String(e.spec?.id ?? '').startsWith(pre));
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && want(e));
            if (!list.length) break;
            if (Array.isArray(pre)) list.sort((a, b) => pre.indexOf(a.spec?.id) - pre.indexOf(b.spec?.id));
            else list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            let k = 0, jl = false, pounds = 0, phase = 0;
            // side (m): Werfer von vorn (zur Kamera, quer zu seinem Tänzeln) anspringen – vor ihm stehen bleiben, senkrecht
            // hochspringen, im Fallen auf ihn lenken (mit Pilz-Maske sieht er die zugewandte Figur nicht)
            const sideOn = Lg.side && e.kind === 'feuer_werfer';
            // Krakenpilz (bait: [x, z] Köderpunkt am Rand seiner Sicht, dodge: [x, z] Ausweichpunkt quer zur Wurflinie): hingehen, warten,
            // bis er spuckt, zur Seite treten (das Steinchen landet auf der alten Stelle), warten, bis es zerbröselt – dann anspringen
            if (Lg.bait && e.kind === 'krakenpilz' && !e.__baited) {
              e.__baited = true;
              const s0 = e.spits ?? 0;
              const goTo = ([x, z], run, max) => { for (let q = 0; q < max && !p.dead; q++) { const gx = x - p.pos.x, gz = z - p.pos.z, gd = Math.hypot(gx, gz); if (gd < 0.3 && p.mode === 'ground') break; tick(p.mode === 'ground' ? { ...this.stick(gx, gz, Math.max(0.3, Math.min(1, gd))), run } : {}); } };
              goTo(Lg.bait, false, 600);
              let q = 0;
              for (; q < 900 && (e.stones?.length ?? 0) === 0 && e.alive && !e.defeated; q++) tick({});
              goTo(Lg.dodge, true, 240);
              for (let w = 0; w < 600 && (e.stones?.length ?? 0) > 0; w++) tick({});
              log.push(['köder', e.spec?.id, (e.spits ?? 0) - s0, q]);
            }
            for (; k < (Lg.max ?? 1800) && e.alive && !e.defeated && !e.removed; k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (sideOn) {
                if (p.mode === 'ground' && phase === 2) phase = 0;
                if (phase === 0) {
                  const qx = e.pos.x - p.pos.x, qz = e.pos.z + Lg.side - p.pos.z, qd = Math.hypot(qx, qz);
                  if (qd < 0.35 && p.mode === 'ground' && Math.hypot(p.vel.x, p.vel.z) < 0.4) { phase = 1; tick({ jump: true }); continue; }
                  tick(p.mode === 'ground' ? (qd > 0.12 ? { ...this.stick(qx, qz, Math.max(0.2, Math.min(1, qd / 1.2))), run: false } : {}) : {}); continue;
                }
                if (phase >= 1) {
                  phase = 2;
                  const up = p.vel.y > 1.5;
                  tick({ ...(up ? {} : this.airSteer(e.pos.x, e.pos.z, 0, 0, 4, 5)), jump: p.vel.y > 0 }); continue;
                }
              }
              // Flieger (Knochenflieger vom Podest, wie course_w7b): Sprung gehalten, sobald er nah ist
              if (Lg.fly && p.mode === 'ground') { tick(d < 2.0 ? { ...this.stick(dx, dz, 0.5), jump: true, run: false } : { ...this.stick(Lg.hold ? Lg.hold[0] - p.pos.x : 0, Lg.hold ? Lg.hold[1] - p.pos.z : 0, Lg.hold ? 0.6 : 0), run: false }); continue; }
              if (p.mode === 'ground' && d < (Lg.near ?? 2.2) && !e.overhead) { jl = !jl; tick({ ...this.stick(dx, dz, 0.5), jump: jl, run: false }); continue; }
              jl = false;
              // Rollpilz (und mit pound jeder Gegner): Stampfattacke – einfaches Draufspringen legt ihn nur auf den Rücken
              if (p.mode === 'air' && (e.kind === 'rollpilz' || Lg.pound) && d < 0.55 && p.vel.y < 1.5 && p.pos.y > e.pos.y + 0.9) { pounds++; tick({ crouch: true }); continue; }
              if (p.mode === 'air' && Lg.lineUp) { tick({ ...(d > 0.08 ? this.stick(dx, dz, Math.min(1, d / 1.5)) : {}), jump: p.vel.y > 0 }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              if (d < 3 && e.overhead) { tick({}); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) { mech.stomped.push(e.spec?.id); done.push(e.spec?.id); }
            else break;
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', done.join(' ')]);
          if (!done.length && !Lg.partial) log.push(['FEHLER: nichts besiegt', `${pre}`]);
          continue;
        }
        // ------------------------------------------------ mit der Funkenblüte schießen: auf gleicher Höhe Abstand dist halten, zum Gegner
        // drehen, Feuerbälle werfen, bis er besiegt ist (Ids der Reihe nach)
        if (Lg.shoot) {
          const ids = Array.isArray(Lg.shoot) ? Lg.shoot : [Lg.shoot];
          const done = [];
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          for (const id of ids) {
            const e = ent(id);
            if (!e) continue;
            let k = 0, shots = 0, cool = 0;
            for (; k < (Lg.max ?? 1500) && e.alive && !e.defeated && !e.removed && !p.dead; k++) {
              if (cool > 0) cool--;
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              const want = Lg.dist ?? 4.5;
              // Stelle auf der Laufachse des Stockwerks (z der Figur bleibt, x im Abstand want vom Gegner, auf der Seite der Figur)
              const sx = e.pos.x + Math.sign(p.pos.x - e.pos.x || 1) * want, sz = Lg.z ?? p.pos.z;
              const ex = sx - p.pos.x, ez = sz - p.pos.z, ed = Math.hypot(ex, ez);
              if (p.mode !== 'ground') { tick({}); continue; }
              if (ed > 0.5 && d > want - 1) { tick({ ...this.stick(ex, ez, Math.max(0.25, Math.min(1, ed / 1.2))), run: false }); continue; }
              const yawWant = Math.atan2(-dz, dx);
              if (Math.abs(wrap(yawWant - p.yaw)) > 0.06) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              if (cool <= 0) { tick({ action: true }); shots++; cool = Lg.gap ?? 36; continue; }
              tick({});
            }
            if (!e.alive || e.defeated || e.removed) { done.push(id); mech.stomped.push(id); }
            log.push(['geschossen', id, !e.alive || e.defeated || e.removed, shots, k]);
          }
          for (let i = 0; i < 40; i++) tick({});
          if (done.length < ids.length && !Lg.partial) log.push(['FEHLER: nicht alle besiegt', ids.filter((x) => !done.includes(x)).join(' ')]);
          continue;
        }
        // ------------------------------------------------ Wurfball aufheben (hingehen, zu ihm drehen, Aktion)
        if (Lg.grab) {
          const b = named(Lg.grab) ?? ent(Lg.grab);
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          let n = 0;
          for (; n < 600 && b && !p.holding && !p.dead; n++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.85 && p.mode === 'ground') {
              const err = Math.abs(wrap(Math.atan2(-dz, dx) - p.yaw));
              if (err > 0.08) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              tick({ action: true }); tick({});
              continue;
            }
            tick({ ...this.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: false });
          }
          log.push(['ball', Lg.grab, p.holding === b, n]);
          if (p.holding !== b) log.push(['FEHLER: Ball nicht aufgehoben', Lg.grab]);
          continue;
        }
        // ------------------------------------------------ in Richtung des Ziels drehen und werfen (Ball bzw. mit fire: Feuerball)
        if (Lg.throwAt || Lg.fire) {
          const [tx, tz] = Lg.throwAt ?? Lg.fire;
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          for (let n = 0; n < 60; n++) {
            const want = Math.atan2(-(tz - p.pos.z), tx - p.pos.x);
            if (n >= 8 && Math.abs(wrap(want - p.yaw)) < 0.025) break;
            tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 0.35) });
          }
          for (let q = 0; q < (Lg.times ?? 1); q++) { tick({ action: true }); for (let w = 0; w < (Lg.gap ?? 2); w++) tick({}); }
          mech.throws++;
          for (let w = 0; w < (Lg.after ?? 90); w++) tick({});
          log.push(['wurf', `${tx},${tz}`, Lg.fire ? 'feuer' : 'ball', +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ fliegenden Zielmast abpassen: warten, bis er heranschwingt, dann hochspringen
        if (Lg.catchPole) {
          const m = ent(Lg.catchPole);
          let k = 0, jumped = 0;
          for (; k < (Lg.max ?? 2400) && m && L.runtime.status === 'play' && !p.dead; k++) {
            const px = m.pos.x, pz = m.pos.z, d = Math.hypot(px - p.pos.x, pz - p.pos.z);
            const vx = (m.pos.x - (m.__px ?? m.pos.x)) * 120; m.__px = m.pos.x;
            const coming = Math.sign(p.pos.x - px) === Math.sign(vx) || Math.abs(vx) < 0.1;
            if (p.mode === 'ground' && d < (Lg.reach ?? 4.2) && coming && Math.abs(px + vx * 0.45 - p.pos.x) < 1.2) { jumped++; tick({ ...this.stick(px - p.pos.x, pz - p.pos.z, 0.8), jump: true }); continue; }
            if (p.mode === 'air') { tick({ ...this.airSteer(px + vx * 0.2, pz, 0, 0, 3, 6), jump: true }); continue; }
            const hx = Lg.hold?.[0] ?? p.pos.x, hz = Lg.hold?.[1] ?? p.pos.z, hd = Math.hypot(hx - p.pos.x, hz - p.pos.z);
            tick(hd > 0.3 ? this.stick(hx - p.pos.x, hz - p.pos.z, Math.min(1, hd)) : {});
          }
          log.push(['zielmast', Lg.catchPole, k, jumped, L.runtime.status, m?.state]);
          continue;
        }
        // ------------------------------------------------ Schubser in Richtung dir stoßen (wie course_w7b)
        if (Lg.push) {
          const e = L.entities.find((x) => x.spec?.id === Lg.push);
          const dl = Math.hypot(Lg.dir[0], Lg.dir[1]) || 1;
          let dx = Lg.dir[0] / dl, dz = Lg.dir[1] / dl;
          const cx = Lg.center ?? 0, cz = Lg.centerZ ?? null, room = Lg.room ?? 2.2;
          const clampX = (x) => Math.max(cx - room, Math.min(cx + room, x));
          const clampZ = (z) => (cz === null ? z : Math.max(cz - (Lg.roomZ ?? room), Math.min(cz + (Lg.roomZ ?? room), z)));
          let tries = 0;
          const gone = () => !e || !e.alive || e.removed || e.defeated || e.state === 'defeated' || e.state === 'fall' || e.pos.y < e.spec.pos[1] - 1.2;
          const dodge = () => {
            if (p.mode !== 'ground') return false;
            const threat = L.entities.some((x) => x.kind === 'schubser' && x.alive && !x.defeated && x.state === 'charge'
              && Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z) < 3.2 && ((p.pos.x - x.pos.x) * (x.vel?.x ?? 0) + (p.pos.z - x.pos.z) * (x.vel?.z ?? 0)) > 0);
            if (!threat) return false;
            for (let q = 0; q < 30; q++) tick({ jump: true });
            for (let q = 0; q < 200 && p.mode !== 'ground' && !p.dead; q++) tick({ ...this.airSteer(clampX(p.pos.x), clampZ(p.pos.z), 0, 0, 2, 3) });
            mech.dodged = (mech.dodged ?? 0) + 1;
            return true;
          };
          for (; tries < (Lg.tries ?? 12) && !gone() && !p.dead; tries++) {
            if (Lg.edges) { dx = (e.pos.x - Lg.edges[0]) < (Lg.edges[1] - e.pos.x) ? -1 : 1; dz = 0; }
            else if (Lg.auto !== false) {
              const ox = e.pos.x - cx, oz = cz === null ? 0 : e.pos.z - cz;
              if (Math.abs(ox) > 0.5 && Math.abs(ox) >= Math.abs(oz)) { dx = Math.sign(ox); dz = 0; } else if (cz !== null && Math.abs(oz) > 0.5) { dx = 0; dz = Math.sign(oz); }
            }
            for (let k = 0; k < 500 && !gone(); k++) {
              if (dodge()) continue;
              const ax = clampX(e.pos.x - dx * (Lg.back ?? 2.6)), az = clampZ(e.pos.z - dz * (Lg.back ?? 2.6));
              const qx = ax - p.pos.x, qz = az - p.pos.z, d = Math.hypot(qx, qz);
              if (d < 0.6 && p.mode === 'ground' && e.state !== 'warn' && e.state !== 'charge') break;
              tick({ ...this.stick(qx, qz, Math.min(1, Math.max(0.5, d / 1.0))), run: d > 2 });
            }
            const p0 = e.pushes ?? 0;
            let pounding = false;
            for (let k = 0; k < 220 && !gone() && (e.pushes ?? 0) === p0 && !p.dead; k++) {
              const tx = clampX(e.pos.x - dx * 0.3), tz = clampZ(e.pos.z - dz * 0.3);
              const hd = Math.hypot(tx - p.pos.x, tz - p.pos.z);
              if (!pounding && k > 6 && hd < 0.45 && p.vel.y < 3 && p.pos.y > e.pos.y + 1.2) pounding = true;
              if (pounding) { tick({ crouch: true }); continue; }
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, e.vel?.x ?? 0, e.vel?.z ?? 0, 3.4, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: k < 26, run: false });
            }
            for (let k = 0; k < 240 && p.mode !== 'ground' && !p.dead; k++) tick({ ...this.airSteer(clampX(p.pos.x), clampZ(p.pos.z), 0, 0, 3, 5) });
            for (let k = 0; k < 150 && !gone(); k++) {
              const ox = p.pos.x - cx, oz = cz === null ? 0 : p.pos.z - cz;
              tick(p.mode === 'ground' && (Math.abs(ox) > 1.2 || Math.abs(oz) > 1.2) ? this.stick(-ox, -oz, 0.6) : {});
            }
          }
          for (let k = 0; k < 120 && e?.alive && !e?.removed && !e?.defeated; k++) tick({});
          // zurück zur Mitte (schwankendes Deck: nicht an der Kante stehen bleiben)
          if (Lg.center !== undefined) for (let k = 0; k < 160 && !p.dead && Math.abs(p.pos.x - cx) > 1.2; k++) tick(p.mode === 'ground' ? this.stick(cx - p.pos.x, 0, 0.8) : {});
          if (gone()) mech.pushedOff = (mech.pushedOff ?? 0) + 1;
          log.push(['schubser', Lg.push, gone(), tries, e?.state, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!gone() && !Lg.partial) { log.push(['FEHLER: Schubser nicht hinuntergestoßen', Lg.push]); break; }
          continue;
        }
        // ------------------------------------------------ warten: Pfeilplattform oben, Pendel weit weg, Zylinder-Stacheln weg
        if (Lg.waitPlat) {
          const h = named(Lg.waitPlat);
          let k = 0;
          if (Lg.fresh) for (; k < 1500 && h.state === 'oben'; k++) tick({});
          for (; k < 1500 && h.state !== 'oben'; k++) tick({});
          log.push(['plattform', Lg.waitPlat, k, h.state]);
        }
        if (Lg.waitPend) {
          const h = named(Lg.waitPend);
          const far = Lg.far ?? 3;
          let k = 0;
          let prev = Math.abs(h.ball.x - p.pos.x);
          for (; k < 900; k++) { tick({}); const d = Math.abs(h.ball.x - p.pos.x); if (d > far && d >= prev) break; prev = d; }
          log.push(['pendel', Lg.waitPend, k, +h.ball.x.toFixed(2)]);
        }
        if (Lg.waitZyl) {
          const h = named(Lg.waitZyl);
          const rows = h.info().rows, sp = h.speed, ahead = Lg.ahead ?? 1.8;
          const danger = () => {
            for (let i = 0; i < rows; i++) {
              const s = h.spikeAt(i);
              const a = Math.atan2(s.u, s.v) * Math.sign(sp || 1);
              if (a > -0.6 - Math.abs(sp) * ahead && a < 0.6) return true;
            }
            return false;
          };
          let k = 0;
          for (; k < 1800 && danger(); k++) tick({});
          log.push(['zylinder', Lg.waitZyl, k]);
        }
        if (!Lg.to) continue;
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        const late = !!Lg.jumpAt || Lg.jumpZ !== undefined || Lg.runUp !== undefined;
        let best = Infinity, still = 0, auto = 0, j0 = late ? null : 0;
        if (holdJ && !late) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
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
          if (p.mode === 'air' && holdJ && j0 !== null && Lg.steer !== false) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else if (p.mode === 'air' && Lg.steer === false) st = {};
          else if (p.mode === 'air') st = this.airSteer(tx, tz, 0, 0, 2.6, Lg.run === false ? 6.5 : 10);   // Reflex-/Nachsprung: nicht übers Ziel hinaus
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && ((Lg.jumpAt && dist <= Lg.jumpAt) || (Lg.jumpZ !== undefined && p.pos.z <= Lg.jumpZ)
            || (Lg.runUp !== undefined && p.mode === 'ground' && ((p.vel.x * dx + p.vel.z * dz) / Math.max(0.01, dist) > Lg.runUp || i > 40)))) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max && !Lg.partial) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.defeated = foes0.filter((e) => e.defeated || !e.alive || e.removed).length;
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, cause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z) + Math.abs(x.pos.y - p.pos.y) * 0.5; if (d < best) { best = d; e = x; } }
        if (!e || best > (o.range ?? 40)) break;
        if (e.touch === false && kind === 'star') { p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); continue; }
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        p.invuln = Math.max(p.invuln, 5);
        // hoch oben (z. B. Power-up auf dem ?-Block): erst seitlich wegtreten, dann von der Seite anspringen
        if (dy > 1.6 && p.mode === 'ground' && dist < 1.25) { c.setInput({ ...this.stick(dist > 0.05 ? -dx : 1, dist > 0.05 ? -dz : 0, 0.6) }); c.step(1); continue; }
        if (dy > 1.6 && p.mode === 'air') { c.setInput({ ...this.airSteer(e.pos.x, e.pos.z, 0, 0, 3, 4), jump: p.vel.y > 0 }); c.step(1); continue; }
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200 && L.runtime.status === 'play' && p.script?.type !== 'house') { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt (Name der nächsten benannten Hülle bzw. Entitäts-Art): Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; let nm = null; for (let q = o; q; q = q.parent) if (q.name) { nm = q.name.replace(/:\d+$/, ''); break; } return nm ?? o.type; };
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
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
    /** Remix-Kennwerte des laufenden Levels (je Level im Test ausgewertet). */
    remixInfo() {
      const d = L.data;
      const calls = window.__audio?.music?.__calls ?? [];
      const w7 = L.w7 ?? {};
      return {
        kinds: this.kinds(), remix: d.remix ?? null, theme: d.theme, light: c.view.theme.light ?? null, music: d.music, variant: d.musicVariant ?? null,
        call: calls.filter((x) => x[0] === d.music).slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
        stamp: !!d.stamp, stars: (d.stars ?? []).length, world: d.world, title: d.title, timeLimit: d.timeLimit, rtLimit: L.runtime.timeLimit,
        schollen: [...L.named.values()].filter((h) => h?.shape?.tag === 'sinkscholle').length,
        pfeil: (w7.arrows ?? []).length,
        qGleit: d.blocks.filter((b) => b.kind === 'question' && b.content === 'gleitblatt').length,
        qSichel: d.blocks.filter((b) => b.kind === 'question' && b.content === 'sichel').length,
        rbTask: !!d.items.find((i) => i.id === 'rb2')?.task,
        house: L.house ? { rooms: L.house.rooms } : null,
        p6: d.id === 'P-6' ? {
          chain: ['w_lr', 'w2_aus', 'lr_out', 'w_ziel', 'w4_aus'].map((id) => `${id}>${d.items.find((i) => i.id === id)?.target}`).join(','),
          turm: Math.abs((d.items.find((i) => i.id === 'ziel_in')?.pos?.[1] ?? 0) - 8.5) < 0.01,
          aufgabeStern: !!d.items.find((i) => i.id === 'aufgabe_stern'),
          gruppe: L.entities.filter((e) => e.kind === 'schubser' && e.group === 'wrack4').length,
          w4Hidden: !!named('w4_aus')?.hidden,
        } : null,
        p5: d.id === 'P-5' ? {
          werfer: L.entities.filter((e) => e.kind === 'feuer_werfer' && !e.removed).sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x).map((e) => e.weapon ?? e.spec.weapon ?? e.spec.kind?.replace('_werfer', '')).join(','),
          aussenHidden: !!named('aussen')?.hidden, pole: ent('flugmast')?.mode ?? null, keys: L.entities.filter((e) => e.kind === 'schluesselmuenze' && !e.removed).length,
          plug: !!ent('pfropfen') && !named('pfropfen:pfropfen')?.popped, schatten: !!named('schattenwand'),
        } : null,
      };
    },
  };
  window.__pb = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__pb[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}pilz_b_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__pb.detail());
    console.log(`      ${name}:`);
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

  // ------------------------------------------------ Laden, Daten, Remix-Regeln
  if (PARTS.has('load')) {
    const r = await W('remixInfo');
    console.log(`  „${r.title}“, Welt ${r.world}, Thema ${r.theme} (Licht ${r.light}), Musik ${r.music}/${r.variant} → ${JSON.stringify(r.call)} (music.variant ${r.mVariant}), ${r.timeLimit} s, Entitäten: ${JSON.stringify(r.kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const M = R.meta;
    const starsOk = M.archetype === 'house' ? (r.house?.rooms === M.stars) : r.stars === M.stars;
    check(`${id}: „${M.title}“, Welt 10, ${M.stars} Sterne, kein Stempel, ${M.time ? `${M.time} s, ` : ''}Thema ${M.theme}, Musik ${M.music}${M.variant ? ` (Variante ${M.variant})` : ''}`,
      r.title === M.title && r.world === 10 && starsOk && !r.stamp && (r.kinds.stamp ?? 0) === 0 && (!M.time || r.timeLimit === M.time) && r.theme === M.theme && r.music === M.music && (r.variant ?? null) === (M.variant ?? null));
    if (R.base) {
      check(`${id}: Remix von ${R.base} über remixOf (LEVEL.remix.base = ${r.remix?.base})`, r.remix?.base === R.base && !r.remix?.missing);
      if (M.light) check(`${id}: Licht-Variante ${M.light} wirksam (Thema ${r.theme}, Ansicht ${r.light})`, r.light === M.light);
      check(`${id}: Musik spielt ${M.music}${M.variant ? ` mit Klang-Variante ${M.variant}` : ' ohne Variante'} (music.play ${JSON.stringify(r.call)})`,
        !!r.call && (M.variant ? r.call[1]?.variant === M.variant && r.mVariant === M.variant : !r.call[1]?.variant));
    }
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${r.kinds[kind] ?? 0})`, (r.kinds[kind] ?? 0) === n);
    for (const m of R.remixChecks ?? []) check(`${id}: ${m.name}`, m.ok(r));
  }

  // ------------------------------------------------ Gegenprobe: das Basislevel bleibt unverändert
  if (PARTS.has('base') && R.base) {
    const g = await sc((b) => {
      const CL = window.__courseLevels;
      const raw = CL.raw(b);
      const snap = (o) => JSON.stringify(o, (k, v) => (typeof v === 'function' ? `fn:${v.name}` : v));
      const before = snap(raw);
      const rawR = CL.raw(window.__course.level.data.id);
      CL.refreshRemix(rawR);
      CL.get(window.__course.level.data.id);
      const after = snap(raw);
      return { same: before === after, len: before.length, theme: raw.theme, music: raw.music, variant: raw.musicVariant ?? null, remix: raw.remix ?? null, stamp: !!raw.stamp, stars: (raw.stars ?? []).length, title: raw.title };
    }, R.base);
    check(`${id}: Gegenprobe – Rohdaten von ${R.base} bleiben beim Auflösen des Remix unverändert (${g.len} Zeichen, „${g.title}“, Thema ${g.theme}, Stempel ${g.stamp})`, g.same && !g.remix && g.variant === null && g.stamp);
    await load(R.base);
    const b = await W('remixInfo');
    const baseErr = errors.slice();
    const be = R.baseEnemies ?? {};
    const ok = Object.entries(be).every(([k, n]) => (b.kinds[k] ?? 0) === n);
    check(`${id}: Gegenprobe – ${R.base} lädt wie bisher (Thema ${b.theme}, Musik ${b.music} ohne Variante, Stempel, ${JSON.stringify(Object.fromEntries(Object.keys(be).map((k) => [k, b.kinds[k] ?? 0])))})`,
      ok && !b.remix && !b.variant && b.stamp && (b.kinds.stamp ?? 0) === 1 && baseErr.length === 0);
    loaded = null;
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
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.meta.time} s (${res.time.toFixed(1)} s)`, reached && res.time < R.meta.time);
    check(`${id}: ${hero} – Protokoll ohne Fehler`, !res.log.some((l) => String(l[0]).startsWith('FEHLER')));
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
    const avg = per.reduce((a, q) => a + q[1], 0) / Math.max(1, per.length);
    console.log(`  Messgang: ${per.length} Punkte, Ø ${avg.toFixed(0)} Aufrufe, max ${worst.calls} / ${Math.round(worst.tris / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (Ø ${avg.toFixed(0)}, max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = rt.stars[t.star];
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
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = PI / 2] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(30)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
