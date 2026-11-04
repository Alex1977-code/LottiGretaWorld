// Welt Blume (Remix-Welt 2, Präfix B, Welt 11): B-9 „Feuertürme im Abendrot“ (Remix von 5-1), B-10 „Honigwaben am Taghimmel“
// (Remix von S-6), B-11 „Stachelstege im Suchlicht“ (Remix von 8-1 mit Suchscheinwerfern aus 5-7) und B-12 „Fünf Schlüssel im
// Sternenzelt“ (Boss-Marathon). Prüft je Level: Laden ohne Konsolenfehler/-warnungen, Daten (Welt 11, Titel, Thema mit
// Licht-Variante, Musik mit Klang-Variante im Musiksystem, Zeit, Sterne, kein Stempel), Remix-Regeln wirksam (Licht im Thema,
// Klang-Variante, Gegner entfernt/getauscht/neu, Zeitlimit), Gegenprobe: das Basislevel bleibt unverändert (Rohdaten vor/nach
// dem Auflösen, Basis lädt wie bisher), Routen-Bot Lotti und Greta von Start bis Ziel (echte Eingaben über
// __course.setInput/step, kein Teleport auf der Route), alle Sterne mit der echten Mechanik samt Gegenproben, Extras,
// Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera
// (tests/out/blume_c_*.png).
//
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_blume_c.mjs [B-9|B-10|B-11|B-12]
//   PARTS=load,base,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min, z. B. erst load,base,route,sweep, dann
//   targets,extra, dann shots) · HEROES=lotti,greta · ONLY=<Text|Text> · VERBOSE=1 · TRACE=1 · SHOTS=<Name|Name> · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Treffer-Versuche werden gezählt.
// Gegenproben, die einen Tod erwarten, laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PI = Math.PI;

// ====================================================================================================================
// Routen
// ====================================================================================================================
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, jumpZ, runUp, within, run, slow, max, land,
//   autoJump, stopIf, partial } · { wait } · { hop } · { crouch } · { star: i } · { chaseKind, ids } · { expect } · { until, max }
//   (Bedingung: Name aus COND oder Ausdruck '=…') · { warp: [x, z] } · { pipe: [x, z] } (Glasröhre) · { stompAll: Id-Anfang | [Ids] }
//   · { shootR: [Ids], dist } (Gegner radial anvisieren, Aktion: Feuerball/Sichel) · { fire: [x, z] } / { throwAt: [x, z] }
//   (zum Ziel drehen, Aktion) · { bounce: Id, to2 } (Sprung gehalten auf den Gegner, hoher Abprall) · { pound: [x, z] }
//   · { glide } · { power: Name } · { setTime: s } · { mark } · { kill: true }
const Y11 = 1;   // B-11: Laufhöhe der Festung
const Y12 = 2;   // B-12: Arenaboden
const Y9 = 1, SKY9 = 9, PX9 = 2.5, SX9 = 53.5, SZ9 = 9;   // B-9: Strand, Schwebeinsel, Glasröhre, schlafender Turm

const ROUTES = {
  'B-9': {
    base: '5-1',
    start: [0, Y9, 10],
    meta: { title: 'Feuertürme im Abendrot', stars: 3, time: 100, theme: 'beach@abend', music: 'course_beach', variant: 'abend', archetype: 'parcours', light: 'abend' },
    enemies: { pilzlingsturm: 5, feuer_werfer: 4, schluesselmuenze: 0, rammbock_bulle: 0, sandtaucher: 0, strandfackel: 4, kampfraum: 1, warpbox: 2, task: 0, checkpoint: 0 },
    baseEnemies: { pilzlingsturm: 0, feuer_werfer: 0, schluesselmuenze: 5, rammbock_bulle: 4, sandtaucher: 4, warpbox: 2 },
    remixChecks: [
      { name: 'nur Strand und Schwebeinsel (kein Ritt, kein Kontrollpunkt, keine Schlüsselmünzen), vier Pilzlingstürme aus je 4 Pilzlingen mit Feuer-Werfer als Reiter, schlafender Dreierturm (wake 0), Kampfraum über Türme und Werfer, Ziel-Warp-Box verborgen, vier Strandfackeln, sieben Zeit-Uhren je +10 s, Zielmast auf der Schwebeinsel',
        ok: (r) => r.b9 && r.b9.towers === 'turm_l:4+feuer_werfer,turm_m:4+feuer_werfer,turm_hain:4+feuer_werfer,turm_r:4+feuer_werfer' && r.b9.sleeper?.count === 3 && r.b9.sleeper.wake === 0
          && r.b9.room === 8 && r.b9.warpHidden && r.b9.torches === 4 && r.b9.clocks === 7 && r.b9.clockSec === 10 && !r.b9.ride && r.b9.archetype === 'parcours' && r.b9.keys === 0
          && r.b9.goalY === SKY9 && r.b9.cp === null && r.b9.star0hidden && r.rtLimit === 100 },
    ],
    main: [
      { name: '?-Block mit Funkenblüte', to: [-2, 3.4], within: 0.2, run: false }, { hop: 26 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 },
      { expect: 'funken' },
      { name: 'Zeit-Uhr', to: [-9, 6], within: 0.6 },
      { name: 'Feuerturm links (Turm, dann Werfer)', shootR: ['turm_l', 'werfer_l'], dist: 4.6, gap: 34 },
      { name: 'Zeit-Uhr', to: [-22, -4], within: 0.6 },
      { to: [-13, -10.4], within: 0.8 },
      { name: 'Zeit-Uhr', to: [-6, -9.5], within: 0.6 },
      { name: 'Feuerturm Mitte (vom Ufer aus)', shootR: ['turm_m', 'werfer_m'], dist: 4.4, gap: 34 },
      { to: [-1, 2], within: 0.8 },
      { name: 'Zeit-Uhr', to: [9, 6.5], within: 0.6 },
      { to: [14.2, 12.4], within: 0.6 },
      { name: 'Feuerturm Palmenhain (von hinten)', shootR: ['turm_hain', 'werfer_hain'], dist: 4.0, gap: 34 },
      { name: 'Zeit-Uhr', to: [24.5, 2.5], within: 0.6 },
      { name: 'Feuerturm rechts', shootR: ['turm_r', 'werfer_r'], dist: 4.6, gap: 34 },
      { until: 'warpOffen9', max: 240 },
      { to: [25.4, -13.4], within: 0.8 },
      { name: 'Zeit-Uhr im Flachwasser', to: [6, -16.5], within: 0.6 },
      { to: [1, -20.4], within: 0.4, run: false },
      { name: 'Ziel-Warp-Box', warp: [1, -23] },
      { expect: 'onIsle9' },
      { to: [0, -46.5], jump: 12, within: 0.5 },
      { name: 'Zielmast', to: [0, -53.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'vier Feuertürme samt Werfern mit Feuerbällen besiegt (Kampfraum frei), Warp-Box zur Schwebeinsel, sechs Zeit-Uhren eingesammelt, Restzeit > 20 s',
        ok: (r) => r.mech.stomped.filter((x) => x.startsWith('turm_')).length === 4 && r.room === 'done' && r.mech.warps === 1 && r.clocks >= 6 && r.rt.time > 20 },
    ],
    targets: [
      { name: 'Stern 0: mit der Funkenblüte die vier Strandfackeln links anzünden – der Stern erscheint zwischen ihnen', star: 0, from: [-27, Y9, -1.6], place: { power: 'funken' },
        legs: [{ expect: 'stern0Versteckt' },
          { to: [-30.2, -4.4], within: 0.3, run: false }, { fire: [-33.2, -4.4], after: 50 },
          { to: [-29.4, -11.6], within: 0.3, run: false }, { fire: [-32.4, -11.8], after: 50 },
          { to: [-27.6, -12.0], within: 0.3, run: false }, { fire: [-24.6, -12.2], after: 50 },
          { to: [-26.4, -5.2], within: 0.3, run: false }, { fire: [-23.4, -5.2], after: 50 },
          { expect: 'fackelnAn' }, { until: 'stern0Sichtbar', max: 120 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Feuer (an die Fackeln laufen, draufspringen, stampfen)', star: 0, expectNot: true, from: [-30, Y9, -2], heroes: ['lotti'],
        legs: [{ to: [-33.2, -4.4], within: 0.4, max: 200, partial: true }, { pound: [-33.2, -4.4] }, { to: [-23.4, -5.2], within: 0.4, max: 400, partial: true }, { hop: 30 }, { wait: 60 }, { expect: 'fackelnAus' }] },
      { name: 'Stern 1: Glasröhre in der Mitte hinauf – das Ende schießt einen auf die Wolke, dort liegt der Stern', star: 1, from: [PX9, Y9, -1],
        legs: [{ pipe: [PX9, -4.4] }, { expect: 'aufWolke' }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Glasröhre (Sprung unter der Wolke)', star: 1, expectNot: true, from: [PX9 + 2.2, Y9, -15.2], heroes: ['lotti'],
        legs: [{ hop: 40 }, { wait: 30 }, { to: [PX9 + 1.4, -14.6], jump: 40, jumpAt: 0.5, within: 0.4, run: false, max: 200, partial: true }, { wait: 60 }] },
      { name: 'Stern 2: rechts auf den schlafenden Dreierturm springen (Sprung gehalten) – der hohe Abprall reicht bis zum Stern', star: 2, from: [SX9, Y9, SZ9 + 1.6],
        legs: [{ expect: 'turmSchlaeft' }, { bounce: 'schlafturm' }, { wait: 30 }], shot: 'stern2',
        mech: (r) => r.mech.bounces >= 1, mechText: (r) => `Abprall ${r.mech.bounces}, Scheitel y ${r.mech.apex?.toFixed(2)}` },
      { name: 'Stern 2 nicht ohne den Turm (Sprung daneben)', star: 2, expectNot: true, from: [SX9 - 1.1, Y9, SZ9], heroes: ['lotti'],
        legs: [{ hop: 40 }, { wait: 40 }] },
    ],
    extra: [
      { name: 'Ziel-Warp-Box bleibt verborgen, solange Feuertürme stehen', from: [1, Y9, -18.6], heroes: ['lotti'],
        legs: [{ expect: 'warpZu9' }, { to: [1, -23], jump: 30, within: 0.3, run: false, max: 300, partial: true }, { wait: 60 }, { expect: 'nichtAufInsel9' }] },
      { name: 'Feuer-Werfer reitet oben auf dem Turm und fällt mit ihm herab (Feuerbälle nehmen je eine Stufe)', from: [-19.4, Y9, 0.6], heroes: ['lotti'], place: { power: 'funken' },
        legs: [{ expect: 'werferOben' }, { shootR: ['turm_l'], dist: 4.6, gap: 34 }, { wait: 60 }, { expect: 'werferUnten' }] },
      { name: 'Zeit-Uhr: +10 s; nach einem Neustart liegen alle Uhren wieder da', from: [-9, Y9, 8.4], heroes: ['lotti'],
        legs: [{ mark: true }, { to: [-9, 5.2], within: 0.4, run: false }, { expect: '=L.runtime.timeLeft > window.__mark.time + 9' }, { expect: '=named("uhren").got === 1' },
          { kill: true }, { wait: 420 }, { expect: '=!P().dead && named("uhren").items.every((i) => !i.taken)' }] },
      { name: 'Zeitablauf: nach 100 s ohne Uhren ist der Versuch vorbei', from: [0, Y9, 10], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ setTime: 1.5 }, { wait: 300 }], mech: (r) => r.cause === 'time', mechText: (r) => `Ursache ${r.cause}` },
      { name: 'Schlafender Turm: Draufspringen nimmt eine Stufe, nach 2,4 s ist er wieder ein Dreierturm; er fällt nie ganz um', from: [SX9, Y9, SZ9 + 1.6], heroes: ['lotti'],
        legs: [{ bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { expect: '=ent("schlafturm").count === 2' }, { wait: 420 }, { expect: '=ent("schlafturm").count === 3' },
          { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] },
          { expect: '=!!ent("schlafturm") && ent("schlafturm").count >= 1 && !ent("schlafturm").defeated' }] },
      { name: 'Krümel feiert in seiner Wandhöhle (keine Käfer), dort liegt eine Zeit-Uhr', from: [48, Y9, 3.6], heroes: ['lotti'],
        legs: [{ expect: '=named("kruemel").state === "happy"' }, { mark: true }, { to: [48, -6], within: 0.5, run: false }, { expect: '=L.runtime.timeLeft > window.__mark.time + 7' }] },
    ],
    shots: [
      ['start', [0, Y9, 10]],
      ['fackeln', [-28.4, Y9, -3.2]],
      ['turm_links', [-19.4, Y9, 10.6]],
      ['roehre', [PX9, Y9, 0.4]],
      ['wolke', [PX9, 8.4, -14.6]],
      ['hain', [16.4, Y9, 12.4]],
      ['rechts', [30.6, Y9, 1.4]],
      ['schlafturm', [SX9 - 2, Y9, 13.4]],
      ['hoehle', [48, Y9, -3]],
      ['sandbank', [1, Y9, -18.6]],
      ['insel', [0, SKY9, -45]],
    ],
  },
  'B-10': {
    base: 'S-6',
    start: [0, 0, 0],
    meta: { title: 'Honigwaben am Taghimmel', stars: 3, time: 400, theme: 'honeycomb@tag', music: 'course_honeycomb', variant: 'tag', archetype: 'parcours', light: 'tag' },
    enemies: { stachelkugler: 2, brummer: 6, krabbelkaefer: 12, flatterkaefer: 6, feuer_schnappblume: 4, kampfraum: 1, checkpoint: 2 },
    baseEnemies: { stachelkugler: 0, brummer: 4, krabbelkaefer: 12 },
    remixChecks: [
      { name: 'Taghimmel statt Weltraum (keine Planeten, Raketen, Kometen, Sternenstaub; Wolkenberge darunter), schwerer: mehr Lava-Waben (90 statt 67), Eis-Wurfplatz am Lavafeld, Stachelwalzen × 1,5, fliegende Blöcke × 1,35, Flatterkäfer-Runde gibt ein Extraleben statt eines Sterns',
        ok: (r) => r.b10 && r.b10.space === 0 && r.b10.wolken >= 8 && r.b10.lava === 90 && r.b10.eisWurf && r.b10.walzen === '1.95,-1.95,2.4' && r.b10.movers === '2.43,2.43,2.16,2.16' && r.b10.runde === 'oneup' },
    ],
    main: [
      { name: 'Wurfsichel aus dem ?-Block am Start', grabQ: [-2.83, -4.9], back: [-2.83, -2.5] },
      { expect: 'sichel' },
      { name: 'Startwabe', to: [-1.4, -12.6], within: 0.6 },
      { name: 'linker Weg', to: [-4.3, -18.6], within: 0.6 },
      { name: 'Stachelkugler am linken Weg (Wurfsichel)', shootR: ['sk_gabel'], dist: 4.4, gap: 40, aim: 0.06 },
      { to: [-4.3, -32], within: 0.7 }, { to: [-1.4, -40], within: 0.7 }, { to: [-4.3, -48], within: 0.7 }, { to: [-2.8, -55], within: 0.7 },
      { name: 'vor Walze 1', to: [0, -58.6], within: 0.5 },
      { name: 'über Walze 1', to: [0, -66.2], jump: 30, jumpAt: 7.4, within: 0.8 },
      { to: [0, -68.6], within: 0.5 },
      { name: 'über Walze 2', to: [0, -76], jump: 30, jumpAt: 7.4, within: 0.8 },
      { name: 'über Walze 3', to: [0, -83.6], jump: 30, jumpAt: 7.4, within: 0.8 },
      { name: 'Röhren-Plattform', to: [0, -86.8], within: 0.4 },
      { name: 'Glasröhre über den Lavasee', pipe: [0, -88.6] },
      { expect: '=P().pos.z < -110 && P().pos.z > -127' },
      { name: 'Kontrollpunkt Spiegelfrucht-Insel', to: [0, -120.5], within: 0.6 },
      { name: 'Käferfeld', to: [0, -135], within: 0.7 },
      { name: 'Stachelkugler im Käferfeld (Wurfsichel)', shootR: ['sk_feld'], dist: 4.6, gap: 40, aim: 0.06 },
      { to: [0, -160], within: 0.7 }, { to: [0, -171], within: 0.7 },
      { name: 'mittlerer Splitterweg', to: [0, -178.6], within: 0.5 },
      { name: 'über die Lava-Hürde', to: [0, -184.6], jump: 30, jumpAt: 3.2, within: 0.7 },
      { to: [0, -203], within: 0.5 },
      { name: 'über die zweite Lava-Hürde', to: [0, -209.2], jump: 30, jumpAt: 3.2, within: 0.7 },
      { to: [0, -221], within: 0.7 },
      { name: 'Kontrollpunkt Wabenfläche', to: [0, -224], within: 0.6 },
      { name: 'Wabenfläche', to: [0, -250], within: 0.7 }, { to: [2.8, -270], within: 0.6 }, { to: [2.8, -279.5], within: 0.6 },
      { name: 'Turmsockel', to: [-5.8, -295.6], within: 0.4, run: false },
      { name: 'flinke Treppe', steps: 'treppe' },
      { name: 'auf den Turm', to: [2.3, -298.4], jump: 30, jumpAt: 6, within: 0.6, run: false },
      { name: 'Zielmast', to: [0, -298], within: 0.2, run: false },
    ],
    routeChecks: [
      { name: 'Glasröhre gefahren, beide Stachelkugler mit der Wurfsichel besiegt, über die Lava-Hürden gesprungen', ok: (r) => r.mech.pipes >= 1 && r.mech.stomped.includes('sk_gabel') && r.mech.stomped.includes('sk_feld') },
    ],
    targets: [
      { name: 'Stern 0: auf den Schwebeblock nahe dem Start springen und die Wurfsichel hinaus ins All werfen', star: 0, from: [-4.2, 0, -4.9], place: { power: 'sichel' },
        legs: [{ to: [-6.2, -4.6], within: 0.3, run: false }, { name: 'auf den Schwebeblock', to: [-10.4, -4.2], jump: 30, jumpAt: 5, within: 0.4, run: false },
          { to: [-11.2, -4.2], within: 0.2, run: false, slow: 0.4 }, { sichelAt: [-17.4, -4.2] }, { expect: '=P().mode === "ground" && P().pos.y > 1.2' }], shot: 'stern0' },
      { name: 'Stern 0 nicht vom Waben-Rand aus (die Sichel fliegt zu tief)', star: 0, expectNot: true, from: [-6.4, 0, -4.2], heroes: ['lotti'], place: { power: 'sichel', yaw: PI },
        legs: [{ sichelAt: [-17.4, -4.2] }] },
      { name: 'Stern 1: von der Röhren-Plattform auf die Glasröhre klettern, oben über den Lavasee balancieren, am Scheitel hochspringen', star: 1, from: [2.8, 0, -88.4],
        legs: [{ to: [2.8, -90.8], within: 0.3, run: false }, { name: 'auf die Röhre', to: [0, -92.2], jump: 30, jumpAt: 3, within: 0.4, run: false },
          { expect: '=P().mode === "ground" && P().ground?.tag === "glasspipe"' }, { to: [0, -101], within: 0.25, run: false, slow: 0.6 }, { hop: 30 },
          { to: [0, -109.4], within: 0.4, run: false, slow: 0.6 }, { to: [0, -113.8], within: 0.6, run: false }, { expect: '=P().pos.z < -110 && !P().dead' }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne die Röhre (Sprung von der Plattform)', star: 1, expectNot: true, from: [0, 0, -90.8], heroes: ['lotti'], invuln: false,
        legs: [{ hop: 40 }, { wait: 60 }] },
      { name: 'Stern 2: Wurfsichel (Kontrollpunkt-Block), von der Eiswabe am rechten Rand des Lavafelds hinüberwerfen', star: 2, from: [0, 0, -224],
        legs: [{ grabQ: [2.83, -226.3], back: [2.83, -223.9] }, { to: [1.2, -262.4], within: 0.3, run: false }, { to: [-1.2, -262.4], within: 0.25, run: false, slow: 0.35 }, { wait: 60 },
          { expect: '=P().ground?.tag === "wabe-eis"' }, { sichelAt: [-7.07, -262.39] }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Wurfsichel von der Eiswabe aus', star: 2, expectNot: true, from: [-1.2, 0, -262.4], heroes: ['lotti'], place: { yaw: PI },
        legs: [{ wait: 120 }, { action: 4 }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Stachelkugler: Draufspringen verletzt (nur Sichel oder drüberspringen)', from: [-4.3, 0, -18.6], heroes: ['lotti'], invuln: false,
        legs: [{ stompAll: ['sk_gabel'], max: 160, partial: true }], mech: (r) => r.mech.hurts >= 1 && !!r.alive, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Lava-Hürde auf dem mittleren Splitterweg: Hineinlaufen verletzt', from: [0, 0, -178.4], heroes: ['lotti'], invuln: false,
        legs: [{ to: [0, -181.5], within: 0.3, run: false, max: 200, partial: true }, { wait: 40 }], mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Flatterkäfer-Runde im Käferfeld: alle besiegt → Extraleben', from: [0, 0, -137], heroes: ['lotti'], expectLives: 1,
        legs: [{ stompAll: 'fk_' }, { wait: 60 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Wurfsichel aus dem ?-Block am Start', from: [-2.83, 0, -2.5], heroes: ['lotti'],
        legs: [{ grabQ: [-2.83, -4.9], back: [-2.83, -2.5] }, { expect: 'sichel' }] },
    ],
    shots: [
      ['start', [0, 0, 0]],
      ['schwebeblock', [-10.2, 1.3, -4.2]],
      ['gabel', [-1.4, 0, -14]],
      ['walzen', [0, 0, -70]],
      ['roehre', [0, 0, -87]],
      ['roehre_oben', [0, 3.3, -99]],
      ['kaefer', [0, 0, -140]],
      ['splitter', [0, 0, -180]],
      ['flaeche', [0, 0, -240]],
      ['lavafeld', [-1.2, 0, -262.4]],
      ['turm', [0, 0, -288]],
    ],
  },
  'B-11': {
    base: '8-1',
    start: [0, Y11, 6],
    meta: { title: 'Stachelstege im Suchlicht', stars: 3, time: 400, theme: 'rainfort@nacht', music: 'course_rainfort', variant: 'nacht', archetype: 'parcours', light: 'nacht' },
    enemies: { stachelfalle: 7, feuer_werfer: 4, knochenflieger_gruppe: 5, warpbox: 8, task: 1 },
    baseEnemies: { stachelfalle: 7, feuer_werfer: 3 },
    remixChecks: [
      { name: 'vier Suchscheinwerfer über den Stachelstegen (folgen der Figur nicht), sieben Stachelfallen unter Licht-Steuerung, blaue Stege, drei orange Schwebeplattformen × 1,6 (die mittlere 4,4 m groß), Feuer-Werfer am Ende von Abschnitt 1, Säule der Basis entfernt, zwei neue Kletter-Säulen, Wachstube ohne Stern, Bröckelblock-Brücke',
        ok: (r) => r.b11 && r.b11.lights === 4 && r.b11.track === false && r.b11.groups === 4 && r.b11.traps === 7 && r.b11.speeds === '3.84,3.84,2.88' && r.b11.waits === '1,1.26' && r.b11.big === 4.4
          && r.b11.tinted === 3 && r.b11.werfer0 && r.b11.walls === '-19,-3.4,-5' && r.b11.taskStar === null && r.b11.broeckel === 3 },
    ],
    main: [
      { name: 'Torhof', to: [0, -5], within: 0.6 },
      { name: 'Steg 1: über die Stachelfalle springen', to: [0, -10.2], within: 0.4, run: false },
      { to: [0, -16.4], jump: 30, jumpAt: 7, within: 0.6, run: false },
      { name: 'Turm 1', to: [0, -25.6], within: 0.5 },
      { name: 'Steg 2: drei Fallen', to: [0, -28.8], within: 0.4, run: false },
      { to: [0, -33.5], jump: 24, jumpAt: 6, within: 0.5, run: false },
      { to: [0, -38.5], jump: 24, jumpAt: 6, within: 0.5, run: false },
      { to: [0, -43.8], jump: 24, jumpAt: 6, within: 0.5, run: false },
      { name: 'Turm 2', to: [0, -47.2], within: 0.5 },
      { name: 'Feuer-Werfer am Ende von Abschnitt 1', stompAll: 'werfer0' },
      { name: 'Warp-Box über den Graben', warp: [2.5, -50.5] },
      { expect: '=P().pos.z < -66 && P().pos.z > -80' },
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
      { name: 'Kontrollpunkt', to: [0, -157.5], within: 0.6 },
      { to: [0, -164], within: 0.6 },
      { name: 'Knochenflieger-Strecke', to: [0, -179], within: 0.6 },
      { name: 'Platz der Keil-Gruppe', to: [0, -191], within: 0.6 },
      { name: 'Steg 3: zwei Fallen', to: [0, -194.4], within: 0.4, run: false },
      { to: [0, -200], jump: 24, jumpAt: 6, within: 0.5, run: false },
      { to: [0, -206.8], jump: 24, jumpAt: 7, within: 0.5, run: false },
      { name: 'Platz der Ring-Gruppe', to: [0, -219], within: 0.6 },
      { to: [0, -235.2], within: 0.4, run: false },
      { name: 'orange Schwebeplattform 1', block: 'schwebe1', board: [0, -238.2], exit: [0, -247.2] },
      { name: 'große orange Stachelplattform', block: 'schwebe2', board: [0, -251.2], exit: [8, -251.2] },
      { name: 'orange Schwebeplattform 3 (ohne Pause)', block: 'schwebe3', board: [8, -255.4], exit: [8, -262.4], moving: true },
      { to: [8, -266.5], jump: 20, within: 0.5, run: false },
      { name: 'Warp-Box zum Zielturm', warp: [8, -269] },
      { name: 'Zielmast', to: [0, -299.4], within: 0.2 },
    ],
    routeChecks: [
      { name: 'drei Warp-Boxen, vier Feuer-Werfer besiegt, drei orange Schwebeplattformen, über alle Stachelfallen gesprungen', ok: (r) => r.mech.warps === 3 && ['werfer0', 'werfer1', 'werfer2', 'werfer3'].every((id) => r.mech.stomped.includes(id)) && r.log.filter((l) => l[0] === 'stachelblock').length === 3 },
    ],
    targets: [
      { name: 'Stern 0: Krallen-Anzug aus dem ?-Block auf Turm 1, über Steg 2, am Ende von Abschnitt 1 die Säule links vom Feuer-Werfer hinauf', star: 0, from: [0, Y11, -22.4],
        legs: [{ grabQ: [2.6, -24.4], back: [2.6, -22.4] }, { expect: 'krallen' }, { to: [0, -28.8], within: 0.4, run: false },
          { to: [0, -33.5], jump: 24, jumpAt: 6, within: 0.5, run: false }, { to: [0, -38.5], jump: 24, jumpAt: 6, within: 0.5, run: false }, { to: [0, -43.8], jump: 24, jumpAt: 6, within: 0.5, run: false },
          { to: [-3.4, -46.4], within: 0.3, run: false }, { climb: [-3.4, -49.6], top: Y11 + 6.6, then: [-3.4, -49.6] }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Krallen-Anzug (an der Säule nur Wandrutschen)', star: 0, expectNot: true, from: [-3.4, Y11, -46.6], heroes: ['lotti'],
        legs: [{ climb: [-3.4, -49.6], top: Y11 + 6.6, max: 400, partial: true }, { wait: 30 }] },
      { name: 'Stern 1: Krallen-Anzug am Kontrollpunkt, nach dem Kontrollpunkt die Säule am Platz der Keil-Gruppe hinauf', star: 1, from: [0, Y11, -157],
        legs: [{ grabQ: [-2.5, -152], back: [-2.5, -154.4] }, { expect: 'krallen' }, { to: [0, -164], within: 0.6 }, { to: [0, -179], within: 0.6 },
          { to: [-5.0, -185.8], within: 0.3, run: false }, { climb: [-5.0, -188.8], top: Y11 + 6.6, then: [-5.0, -188.8] }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Krallen-Anzug', star: 1, expectNot: true, from: [-5.0, Y11, -185.8], heroes: ['lotti'],
        legs: [{ climb: [-5.0, -188.8], top: Y11 + 6.6, max: 400, partial: true }, { wait: 30 }] },
      { name: 'Stern 2: auf der großen Stachelplattform warten, nach links über die Bröckelblock-Brücke auf den Säulenkopf, Warp-Box zurück', star: 2, from: [0, Y11, -235.2],
        legs: [{ block: 'schwebe1', board: [0, -238.2], exit: [0, -247.2] }, { block: 'schwebe2', board: [0, -251.2], exit: [0, -251.2] },
          { to: [-3.8, -251.2], jump: 14, jumpAt: 1.9, within: 1.0, run: true }, { to: [-6.2, -251.2], jump: 16, jumpAt: 2.6, within: 1.0, run: true },
          { to: [-8.6, -251.2], jump: 16, jumpAt: 2.6, within: 1.0, run: true }, { to: [-11.9, -251.2], jump: 24, jumpAt: 3.4, within: 0.4, run: true, stopIf: '=P().pos.z > -240' }, { wait: 200 },
          { expect: '=Math.abs(P().pos.z + 232) < 2 && !P().dead' }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Bröckelblöcke (Sprung von der großen Plattform zum Säulenkopf)', star: 2, expectNot: true, from: [0, Y11, -235.2], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ block: 'schwebe1', board: [0, -238.2], exit: [0, -247.2] }, { block: 'schwebe2', board: [0, -251.2], exit: [0, -251.2] },
          { to: [-11.9, -251.2], jump: 40, jumpAt: 13, within: 0.4, max: 300, partial: true }, { wait: 240 }] },
    ],
    extra: [
      { name: 'Suchscheinwerfer: im Lichtfleck fährt die Stachelfalle aus und bleibt draußen (länger als ihr Takt)', from: [0, Y11, 4], heroes: ['lotti'],
        legs: [{ until: '=named("suchlichtFallen").stuck("falle1")', max: 2400 }, { mark: true },
          { until: '=!named("suchlichtFallen").stuck("falle1")', max: 2400 }, { expect: '=L.time - window.__mark.t > 3.4' }] },
      { name: 'Entdeckt: wer ins Licht läuft, lässt alle drei Fallen von Steg 2 ausfahren', from: [0, Y11, -26], heroes: ['lotti'],
        legs: [{ until: '=Math.hypot(named("licht_steg2").spot.x, named("licht_steg2").spot.z + 29.6) < 1', max: 2400 }, { to: [0, -29.6], within: 0.4, run: false, max: 200 },
          { until: '=named("licht_steg2").alarms > 0', max: 240 }, { wait: 70 }, { expect: '=["falle2", "falle3", "falle4"].every((id) => ent(id).state === "up")' }] },
      { name: 'Stachelfalle im Licht verletzt, wer draufsteht', from: [0, Y11, -10.6], heroes: ['lotti'], invuln: false, anyAlive: true,
        legs: [{ until: '=named("suchlichtFallen").stuck("falle1") && ent("falle1").state === "up"', max: 2400 }, { to: [0, -13], within: 0.3, run: false, max: 200, partial: true }, { wait: 40 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Bröckelblock fällt nach dem Betreten und kommt nach 4 s wieder (Rückweg über die Warp-Box auf dem Säulenkopf)', from: [0, Y11, -235.2], heroes: ['lotti'],
        legs: [{ block: 'schwebe1', board: [0, -238.2], exit: [0, -247.2] }, { block: 'schwebe2', board: [0, -251.2], exit: [0, -251.2] }, { to: [-3.8, -251.2], jump: 14, jumpAt: 1.9, within: 1.0, run: true },
          { to: [-6.2, -251.2], jump: 16, jumpAt: 2.6, within: 1.0, run: true }, { to: [-8.6, -251.2], jump: 16, jumpAt: 2.6, within: 1.0, run: true },
          { to: [-11.9, -251.2], jump: 24, jumpAt: 3.4, within: 0.4, run: true, stopIf: '=P().pos.z > -240' }, { wait: 30 }, { expect: '=named("broeckel").blocks[0].state !== "fest"' }, { wait: 520 }, { expect: '=named("broeckel").blocks[0].state === "fest"' }] },
      { name: 'Wachstube (Rätselbox auf der Kletterwand): Wache besiegen → Extraleben statt Stern', from: [-19, Y11 + 9, -152.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ warp: [-19, -153.5] }, { until: '=P().pos.x > 80', max: 600 }, { to: [88, -150], within: 0.5, run: false }, { stompAll: 'wache' }, { wait: 120 }, { chaseKind: 'powerup', max: 1200 }] },
    ],
    shots: [
      ['start', [0, Y11, 6]],
      ['steg1', [0, Y11, -6]],
      ['steg2', [0, Y11, -26.4]],
      ['turm2', [0, Y11, -44]],
      ['werfer', [0, Y11, -86]],
      ['cp', [0, Y11, -150]],
      ['keil', [0, Y11, -183]],
      ['steg3', [0, Y11, -192]],
      ['schwebe', [0, Y11, -234]],
      ['broeckel', [-6.2, Y11, -248.6]],
      ['ziel', [0, Y11, -294]],
    ],
  },
  'B-12': {
    start: [0, Y12, 8.5],
    meta: { title: 'Fünf Schlüssel im Sternenzelt', stars: 3, time: 500, theme: 'bossblitz', music: 'course_bossblitz', variant: null, archetype: 'boss' },
    enemies: { kippquader_koenig: 1, schattenlaeuferin: 1, lavafelsen_koenig: 1, wirbelbrocken: 1, schlangenkoenig: 2, boss_gruppe: 1, wuerfelblase: 1, bossblitz_box: 6, bossblitz_hub: 1, bruchplatte: 4 },
    remixChecks: [
      { name: 'Hub 20 × 20 m mit sechs Warp-Boxen (die der Würfelblase verschlossen), unten links Kippquader-König, oben links Schattenläuferin, oben rechts Lavafelsen-König, unten rechts Wirbelbrocken, Mitte beide Schlangenkönige (Gruppe), sechs Kämpfe im Archetyp boss, Schlüssel 0/5, 500 s',
        ok: (r) => r.b12 && r.b12.boxes === 'hub_kq:-6,5.5,hub_schatten:-6,-5.5,hub_lava:6,-5.5,hub_wirbel:6,5.5,hub_koenige:0,0,hub_blase:0,-7.5' && r.b12.locked === 'hub_blase'
          && r.b12.need === 5 && r.b12.keys === 0 && r.b12.bosses === 'kq,schatten,lava,wirbel,koenige,blase' && r.b12.group === 'sk_gruen,sk_rosa' && r.b12.hubSize === '20x20' && r.b12.multi && r.rtLimit === 500 },
    ],
    main: [
      { name: 'Box unten links: Kippquader-König', warp: [-6, 5.5] },
      { engage: 'kq', center: [-80, 40] }, { fight: 'kq', center: [-80, 40] }, { keyBack: 'kq' },
      { name: 'Box oben links: Schattenläuferin', warp: [-6, -5.5] },
      { engage: 'schatten', center: [-80, -50] }, { fight: 'schatten', center: [-80, -50], ring: 5 }, { keyBack: 'schatten' },
      { name: 'Box oben rechts: Lavafelsen-König', warp: [6, -5.5] },
      { engage: 'lava', center: [80, -50] }, { fight: 'lava', center: [80, -50] }, { star: 0 }, { keyBack: 'lava' },
      { name: 'Box unten rechts: Wirbelbrocken', warp: [6, 5.5] },
      { engage: 'wirbel', center: [80, 40] }, { fight: 'wirbel', center: [80, 40], ring: 6 }, { keyBack: 'wirbel' },
      { name: 'Box in der Mitte: Schlangenkönige', warp: [0, 0] },
      { engage: 'koenige', center: [0, -110] }, { fight: 'koenige', center: [0, -110] }, { star: 1 }, { keyBack: 'koenige' },
      { until: 'blaseOffen', max: 240 },
      { name: 'letzte Box: Würfelblase', warp: [0, -7.5] },
      { engage: 'blase', center: [0, 110] }, { fight: 'blase' }, { star: 2 }, { keyBack: 'blase' },
      { name: 'Zielmast', to: [0, 146], within: 0.3 },
    ],
    routeChecks: [
      { name: 'alle sechs Kämpfe gewonnen, fünf Schlüssel, sechs Rück-Warp-Boxen, alle drei Sterne, Restzeit > 0', ok: (r) => r.mech.keys === 5 && r.mech.warps === 12 && r.rt.stars.slice(0, 3).every(Boolean) && r.rt.time > 0 },
      { name: 'Würfelblase mit mehr, schnelleren Schockwellen (≥ 3 je Landung, erste ≥ 9 m/s)', ok: (r) => r.mech.bosses?.blase?.multi && r.mech.bosses.blase.waves >= 3 && r.mech.bosses.blase.maxSpeed >= 9 },
    ],
    targets: [
      { name: 'Stern 0: Lavafelsen-König mit geworfenen Lavabrocken besiegen – erst danach erscheint der Stern in der Arena', star: 0, from: [0, Y12, 8.5],
        legs: [{ warp: [6, -5.5] }, { engage: 'lava', center: [80, -50] }, { expect: '=!L.entities.some((e) => e.kind === "star" && e.index === 0 && !e.removed)' },
          { fight: 'lava', center: [80, -50] }, { star: 0 }], shot: 'stern0',
        mech: (r) => r.mech.bosses?.lava?.throws >= 3, mechText: (r) => `Würfe ${r.mech.bosses?.lava?.throws}` },
      { name: 'Stern 0 nicht ohne Sieg (im Kampf kein Stern)', star: 0, expectNot: true, from: [0, Y12, 8.5], heroes: ['lotti'],
        legs: [{ warp: [6, -5.5] }, { engage: 'lava', center: [80, -50] }, { wait: 900 }] },
      { name: 'Stern 1: beide Schlangenkönige zugleich besiegen (6 Kopftreffer vom Teller aus) – dann der Stern', star: 1, from: [0, Y12, 8.5],
        legs: [{ warp: [0, 0] }, { engage: 'koenige', center: [0, -110] }, { expect: '=!L.entities.some((e) => e.kind === "star" && e.index === 1 && !e.removed)' },
          { fight: 'koenige', center: [0, -110] }, { star: 1 }], shot: 'stern1',
        mech: (r) => r.mech.bosses?.koenige?.hits === 6, mechText: (r) => `Treffer ${r.mech.bosses?.koenige?.hits}/6` },
      { name: 'Stern 1 nicht ohne Sieg (im Kampf kein Stern)', star: 1, expectNot: true, from: [0, Y12, 8.5], heroes: ['lotti'],
        legs: [{ warp: [0, 0] }, { engage: 'koenige', center: [0, -110] }, { wait: 900 }] },
      { name: 'Stern 2: letzte Box (Schlüssel gutgeschrieben) – Würfelblase besiegen, Stern, Rück-Warp-Box zum Zielplatz', star: 2, from: [0, Y12, 8.5],
        legs: [{ grantKeys: true }, { expect: 'blaseOffen' }, { to: [3.4, 3], within: 0.6 }, { to: [3, -5.6], within: 0.6 }, { warp: [0, -7.5] }, { engage: 'blase', center: [0, 110] }, { fight: 'blase' }, { star: 2 }, { keyBack: 'blase' },
          { expect: '=P().pos.z > 140' }], shot: 'stern2' },
    ],
    extra: [
      { name: 'Letzte Box bleibt verschlossen, solange Schlüssel fehlen', from: [0, Y12, -4.6], heroes: ['lotti'],
        legs: [{ expect: '=!!named("hub_blase").locked' }, { to: [0, -7.5], jump: 30, jumpAt: 2, within: 0.3, run: false, max: 300, partial: true }, { wait: 90 }, { expect: '=Math.abs(P().pos.z) < 12 && named("hub_blase").entered === 0' }] },
      { name: 'Erledigte Box ist zu: nach dem Sieg über den Kippquader-König führt sie nicht mehr hinein', from: [0, Y12, 8.5], heroes: ['lotti'],
        legs: [{ warp: [-6, 5.5] }, { engage: 'kq', center: [-80, 40] }, { fight: 'kq', center: [-80, 40] }, { keyBack: 'kq' }, { to: [-3.4, 5.5], within: 0.4, run: false },
          { mark: true }, { to: [-6, 5.5], jump: 30, jumpAt: 2.4, within: 0.3, run: false, max: 300, partial: true }, { wait: 120 },
          { expect: '=named("hub_kq").done && Math.abs(P().pos.x) < 12' }] },
      { name: 'Tod im Kampf: Neustart am Eingang des Raums, der Kampf beginnt von vorn, gesammelte Schlüssel bleiben', from: [0, Y12, 8.5], heroes: ['lotti'],
        legs: [{ warp: [-6, 5.5] }, { engage: 'kq', center: [-80, 40] }, { fight: 'kq', center: [-80, 40] }, { keyBack: 'kq' }, { warp: [6, 5.5] }, { engage: 'wirbel', center: [80, 40] },
          { fight: 'wirbel', center: [80, 40], ring: 6, untilHp: 2 }, { expect: '=named("wirbel").hp === 2' },
          { kill: true }, { wait: 600 }, { expect: '=!P().dead && Math.abs(P().pos.x - 80) < 2 && Math.abs(P().pos.z - 48.6) < 2' },
          { expect: '=named("wirbel").hp === 3 && named("hub").keys === 1' }] },
      { name: 'Die Uhr läuft im Hub weiter (500 s für alles)', from: [0, Y12, 8.5], heroes: ['lotti'],
        legs: [{ mark: true }, { wait: 360 }, { expect: '=window.__mark.time - L.runtime.timeLeft > 2.9' }] },
    ],
    shots: [
      ['hub', [0, Y12, 8.5]],
      ['hub_boxen', [0, Y12, 2]],
      ['kq', { legs: [{ warp: [-6, 5.5] }, { engage: 'kq', center: [-80, 40] }, { wait: 300 }] }],
      ['schatten', { legs: [{ warp: [-6, -5.5] }, { engage: 'schatten', center: [-80, -50] }, { wait: 420 }] }],
      ['lava', { legs: [{ warp: [6, -5.5] }, { engage: 'lava', center: [80, -50] }, { wait: 520 }] }],
      ['wirbel', { legs: [{ warp: [6, 5.5] }, { engage: 'wirbel', center: [80, 40] }, { wait: 420 }] }],
      ['koenige', { legs: [{ warp: [0, 0] }, { engage: 'koenige', center: [0, -110] }, { wait: 700 }] }],
      ['blase', { legs: [{ grantKeys: true }, { to: [3.4, 3], within: 0.6 }, { to: [3, -5.6], within: 0.6 }, { warp: [0, -7.5] }, { engage: 'blase', center: [0, 110] }, { to: [0, 114.5], within: 0.6, run: false }, { until: '=named("blase").state === "grest"', max: 120 * 20 }, { wait: 50 }] }],
      ['hub_erledigt', { legs: [{ grantKeys: true }, { wait: 120 }] }],
      ['zielplatz', [0, Y12, 152]],
    ],
  },
};


// ====================================================================================================================
// Prüfstand
// ====================================================================================================================
const PORT = 5025;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split("|").some((o) => t.name.includes(o))) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,base,route,sweep,targets,extra,shots').split(','));
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
    // allgemein
    funken: () => P().power === 'funken',
    sichel: () => P().power === 'sichel',
    krallen: () => P().power === 'krallen',
    goal: () => L.runtime.status === 'goal' || L.runtime.status === 'done',
    playing: () => L.runtime.status === 'play',
    stern0Versteckt: () => L.entities.some((e) => e.kind === 'star' && e.index === 0 && e.hidden && !e.removed),
    stern0Sichtbar: () => !!L.runtime.stars[0] || L.entities.some((e) => e.kind === 'star' && e.index === 0 && !e.hidden && !e.removed),
    stern1Sichtbar: () => !!L.runtime.stars[1] || L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && !e.removed),
    stern2Sichtbar: () => !!L.runtime.stars[2] || L.entities.some((e) => e.kind === 'star' && e.index === 2 && !e.hidden && !e.removed),
    // B-12
    blaseOffen: () => !named('hub_blase')?.locked && !!named('hub')?.open,
    // B-9
    warpOffen9: () => !named('warp1')?.hidden,
    warpZu9: () => !!named('warp1')?.hidden,
    onIsle9: () => P().pos.z < -36 && P().pos.y > 8.5 && !P().dead,
    nichtAufInsel9: () => P().pos.z > -32 && !P().dead,
    fackelnAn: () => L.entities.filter((e) => e.kind === 'strandfackel' && e.lit).length === 4,
    fackelnAus: () => L.entities.filter((e) => e.kind === 'strandfackel' && e.lit).length === 0,
    aufWolke: () => onGround() && P().pos.y > 8 && Math.abs(P().pos.z + 14.4) < 2,
    turmSchlaeft: () => { const e = ent('schlafturm'); return !!e && e.state === 'idle' && e.count === 3; },
    werferOben: () => { const t = ent('turm_l'), w = ent('werfer_l'); return !!t && !!w && w.pos.y > t.pos.y + 2.4; },
    werferUnten: () => { const t = L.entities.find((e) => e.spec?.id === 'turm_l'), w = ent('werfer_l'); return (!t || t.defeated || t.removed) && !!w && w.pos.y < 2.4; },
  };
  // Bedingung: Name aus COND oder Ausdruck '=…' (P, L, named, ent, c, onGround, at im Zugriff)
  const cond = (k) => (k.startsWith('=') ? Function('P', 'L', 'named', 'ent', 'c', 'onGround', 'at', `return (${k.slice(1)});`)(P, L, named, ent, c, onGround, at) : COND[k]());
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
        if (o.house && L.house && L.house.phase !== 'play') { log.push(['Raum vorbei', L.house.phase]); break; }
        if (p.dead || L.runtime.status !== 'play') {
          if (Lg.until && cond(Lg.until)) { log.push(['bis', Lg.until, 0]); continue; }
          if (!(Lg.wait || Lg.expect || Lg.until)) break;
        }
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 40; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
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
        // ------------------------------------------------ Kampf-Raum: Gegner der Reihe nach auf Abstand dist anvisieren (radial heran bzw. zurück), zu ihm
        // drehen, Aktion (Feuerball mit der Funkenblüte, Tatzenhieb mit dem Krallen-Anzug); visible: nur solange er verwundbar ist
        if (Lg.shootR) {
          const ids = Lg.shootR, done = [];
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          const alive = (e) => e && e.alive && !e.defeated && !e.removed;
          for (const id of ids) {
            const e = ent(id);
            if (!alive(e)) { if (e) done.push(id); continue; }
            let k = 0, shots = 0, cool = 0;
            const want = Lg.dist ?? 4.5;
            for (; k < (Lg.max ?? 1100) && alive(e) && !p.dead && !(o.house && L.house?.phase !== 'play'); k++) {
              if (cool > 0) cool--;
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode !== 'ground') { tick({}); continue; }
              const tooFar = d > want + (Lg.slack ?? 0.6), tooNear = d < (Lg.min ?? want - (Lg.slack ?? 0.6));
              if (tooFar || tooNear) { const s = tooFar ? 1 : -1; tick({ ...this.stick(dx * s, dz * s, Math.max(0.3, Math.min(1, Math.abs(d - want) / 1.2))), run: !!Lg.run }); continue; }
              const yawWant = Math.atan2(-dz, dx);
              if (Math.abs(wrap(yawWant - p.yaw)) > (Lg.aim ?? 0.08)) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              if (Lg.visible && !e.vulnerable) { tick({}); continue; }
              if (cool <= 0) { tick({ action: true }); shots++; cool = Lg.gap ?? 30; continue; }
              tick({});
            }
            if (!alive(e)) { done.push(id); mech.stomped.push(id); }
            log.push(['anvisiert', id, !alive(e), shots, k, e.count ?? e.hp ?? null, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]);
          }
          for (let i = 0; i < 20; i++) tick({});
          if (done.length < ids.length && !Lg.partial) log.push(['FEHLER: nicht alle besiegt', ids.filter((x) => !done.includes(x)).join(' ')]);
          continue;
        }
        // ------------------------------------------------ Stampfattacke auf Köpfe (Rankenschnapper: e.head) bzw. Gegner der Reihe nach
        if (Lg.poundOn) {
          const done = [];
          for (const id of Lg.poundOn) {
            const e = ent(id);
            let tries = 0;
            while (e && e.alive && !e.defeated && !e.removed && tries++ < (Lg.tries ?? 4) && !p.dead && !(o.house && L.house?.phase !== 'play')) {
              const tgt = () => e.head ?? e.pos;
              // Anlauf: in back m Abstand vor dem Kopf stehen (auf der Seite der Figur)
              for (let k = 0; k < 400; k++) {
                const h = tgt(), dx = h.x - p.pos.x, dz = h.z - p.pos.z, d = Math.hypot(dx, dz);
                if (p.mode === 'ground' && d < (Lg.back ?? 1.6) + 0.3 && d > (Lg.back ?? 1.6) - 0.5) break;
                if (p.mode !== 'ground') { tick({}); continue; }
                const s = d > (Lg.back ?? 1.6) ? 1 : -1;
                tick({ ...this.stick(dx * s, dz * s, Math.max(0.3, Math.min(1, Math.abs(d - (Lg.back ?? 1.6))))), run: false });
              }
              let k = 0, pounding = false;
              for (; k < 400; k++) {
                const h = tgt(), dx = h.x - p.pos.x, dz = h.z - p.pos.z, d = Math.hypot(dx, dz);
                if (k > 5 && p.mode === 'ground') break;
                if (!pounding && k > 8 && d < 0.35 && p.vel.y < 3 && p.pos.y > h.y + 0.2) pounding = true;
                tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(h.x, h.z, 0, 0, 3, 6) : this.stick(dx, dz, 1)), jump: k < 34, run: false });
              }
              for (let q = 0; q < (Lg.after ?? 12); q++) tick({});
            }
            if (!e || !e.alive || e.defeated || e.removed) { done.push(id); mech.stomped.push(id); }
            log.push(['stampfattacke', id, !e || !e.alive || e.defeated || e.removed, tries]);
          }
          if (done.length < Lg.poundOn.length && !Lg.partial) log.push(['FEHLER: nicht alle besiegt', Lg.poundOn.filter((x) => !done.includes(x)).join(' ')]);
          continue;
        }
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
              if (p.mode === 'air' && (e.kind === 'rollpilz' || Lg.stampf) && d < 0.55 && p.vel.y < 1.5 && p.pos.y > e.pos.y + 0.9) { pounds++; tick({ crouch: true }); continue; }
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
        // ------------------------------------------------ auf einen Gegner springen (Sprung gehalten → hoher Abprall), danach zu to2 lenken
        if (Lg.bounce) {
          const e = ent(Lg.bounce);
          const c0 = e?.count ?? 0, h0 = e?.hits ?? 0;
          let k = 0, bounced = false, fell = false, apex = p.pos.y;
          const y0 = p.pos.y;
          for (; k < (Lg.max ?? 420) && e && !p.dead; k++) {
            apex = Math.max(apex, p.pos.y);
            if (k > 5 && p.mode === 'ground') break;
            if (p.mode === 'air' && p.vel.y < -1 && apex > y0 + 0.5) fell = true;
            if (!bounced && ((e.count ?? 0) < c0 || (e.hits ?? 0) > h0 || (fell && p.vel.y > 8 && p.pos.y > y0 + 1.2))) bounced = true;
            const [tx, tz] = bounced && Lg.to2 ? Lg.to2 : [e.pos.x, e.pos.z];
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.2, Lg.vmax ?? 6) : this.stick(e.pos.x - p.pos.x, e.pos.z - p.pos.z, 1)), jump: Lg.hold !== false || k < 14, run: false });
          }
          mech.bounces = (mech.bounces ?? 0) + (bounced ? 1 : 0);
          mech.apex = Math.max(mech.apex ?? -99, apex);
          log.push(['abprall', Lg.bounce, bounced, +apex.toFixed(2), k, e?.count]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel auf einen Punkt werfen (zum Ziel drehen, Aktion), Rückkehr abwarten (wie course_sc)
        if (Lg.sichelAt) {
          const [tx, tz] = Lg.sichelAt;
          let k = 0;
          for (; k < 200 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995) break;
            tick({ ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          mech.throws++;
          for (let n = 0; n < (Lg.wait ?? 240); n++) tick({});
          log.push(['sichel', `${Lg.sichelAt}`, k, p.power, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen: darunter hüpfen, zurücktreten, auf den Block springen (wie course_sc)
        if (Lg.grabQ) {
          const [bx, bz] = Lg.grabQ;
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
          log.push(['power', Lg.grabQ.join(','), p.power, tries]);
          if (p.power === pw0) log.push(['FEHLER: Power-up nicht geholt', Lg.grabQ]);
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ flinke Treppe (S-6): Stufe für Stufe hinaufspringen, solange sie da sind (wie course_sc)
        if (Lg.steps) {
          const h = L.named.get(Lg.steps);
          for (let i = 0; i < h.steps.length && !p.dead; i++) {
            const st = h.steps[i];
            for (let w = 0; w < 600 && !st.up && !p.dead; w++) tick({});
            let n = 0, air = false;
            for (; n < 300 && !p.dead; n++) {
              const dx = st.x - p.pos.x, dz = st.z - p.pos.z, d = Math.hypot(dx, dz);
              if (air && p.mode === 'ground') break;
              if (p.mode === 'air') { air = true; tick({ ...(p.pos.y > st.y + 0.1 || p.vel.y < 0 ? this.airSteer(st.x, st.z, 0, 0, 4, 6) : this.airSteer(p.pos.x + dx * 0.25, p.pos.z + dz * 0.25, 0, 0, 2, 3)), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 1.5)), jump: true, run: false });
            }
            for (let w = 0; w < 6; w++) tick({});
            log.push(['stufe', i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.ground?.tag ?? '']);
            if (Math.abs(p.pos.y - st.y) > 0.15) { log.push(['FEHLER: Stufe verfehlt', i]); break; }
          }
          continue;
        }
        // ------------------------------------------------ Stachelblock-Schwebeplattform bzw. mover (Id): am Einstieg warten, aufspringen, mitfahren (wie course_w8a)
        if (Lg.block) {
          const h = L.named.get(Lg.block);
          const mb = h.mb ?? { get pos() { return h.pm.pos; }, get top() { return h.shape.max[1]; }, mover: h.mover };
          const [ax, az] = Lg.board, [ex, ez] = Lg.exit;
          const atB = (x, z, r = 0.25) => Math.hypot(mb.pos.x - x, mb.pos.z - z) < r;
          let k = 0;
          const ready = (x, z) => (Lg.moving || !h.mb ? atB(x, z, 0.45) : atB(x, z) && h.state === 'wartet');
          for (; k < 2400 && !ready(ax, az); k++) tick({});
          let n = 0;
          for (; n < 300 && !p.dead; n++, k++) {
            const dx = mb.pos.x - p.pos.x, dz = mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.5 && p.mode === 'ground' && Math.abs(p.pos.y - mb.top) < 0.2) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6) : this.stick(dx, dz, 1)), run: false, jump: p.mode === 'ground' && d < (Lg.jumpAt ?? 3.6) && n < 400 });
          }
          for (n = 0; n < 2400 && !p.dead && !ready(ex, ez); n++, k++) {
            const dx = mb.pos.x - p.pos.x, dz = mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.15 && p.mode === 'ground' ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {});
          }
          log.push(['stachelblock', Lg.block, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ mit dem Krallen-Anzug an einer Wand hinauf: zur Wand springen und dagegen drücken (wie course_w8a)
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let k = 0, top = false;
          for (; k < (Lg.max ?? 900) && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.pos.y > (Lg.top ?? 99) - 0.1 && p.mode === 'ground') { top = true; break; }
            if (p.mode === 'wall') { mech.climbs = (mech.climbs ?? 0) + 1; tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: false, jump: p.mode === 'ground' ? d < (Lg.jumpAt ?? 1.6) : p.vel.y > 0 });
          }
          if (Lg.then) for (let n = 0; n < 300 && !p.dead; n++, k++) { const dx = Lg.then[0] - p.pos.x, dz = Lg.then[1] - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.3 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d))), run: false }); }
          log.push(['klettern', `${Lg.climb}`, top, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!top && !Lg.partial) log.push(['FEHLER: Wand nicht erklommen', Lg.climb]);
          continue;
        }
        // ================================================ B-12 Boss-Marathon (echte Eingaben)
        // { engage: Id } vom Ankunftspunkt in die Arena gehen, bis der Archetyp den Kampf mit Id beginnt
        if (Lg.engage) {
          const A = c.arch, b = named(Lg.engage);
          const cen = Lg.center;
          let k = 0;
          for (; k < 900 && !(A.started && A.cfg?.id === Lg.engage) && !p.dead; k++) tick({ ...this.stick(cen[0] - p.pos.x, cen[1] - p.pos.z, 0.7), run: false });
          log.push(['Kampf beginnt', Lg.engage, A.started && A.cfg?.id === Lg.engage, k, b?.state]);
          if (!(A.started && A.cfg?.id === Lg.engage)) { log.push(['FEHLER: Kampf nicht begonnen', Lg.engage]); break; }
          continue;
        }
        // { keyBack: Id } Schlüssel nach dem Sieg holen (aufsteigen lassen, hinlaufen), dann in die Rück-Warp-Box springen
        if (Lg.keyBack) {
          const H = named('hub'), f = H.fights.find((x) => x.boss === Lg.keyBack);
          let k = 0;
          for (; k < 120 * 10 && !(f.retBox && !f.retBox.hidden && (f.final || (f.key && f.key.state === 'idle') || f.keyGot)); k++) tick({});
          if (!f.final && !f.keyGot && f.key) {
            const kp = f.key.pos;
            for (let n = 0; n < 900 && !f.keyGot && !p.dead; n++) {
              const dx = kp.x - p.pos.x, dz = kp.z - p.pos.z, d = Math.hypot(dx, dz);
              tick({ ...this.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: false, jump: p.mode === 'ground' && d < 0.8 && (n % 50) < 14 });
            }
          }
          for (let n = 0; n < 40; n++) tick({});
          const rb = f.retBox;
          let rode = false;
          if (rb) {
            const r0 = mech.rides;
            for (let n = 0; n < 900 && !p.dead; n++) {
              const dx = rb.pos.x - p.pos.x, dz = rb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              tick({ ...(p.mode === 'air' ? this.airSteer(rb.pos.x, rb.pos.z, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump: p.mode === 'ground' ? d < 2.0 : p.vel.y > 0, run: false });
              if (mech.rides > r0) { rode = true; break; }
            }
            for (let n = 0; n < 60; n++) tick({});
          }
          if (rode) mech.warps++;
          mech.keys = H.keys;
          log.push(['Schlüssel und zurück', Lg.keyBack, !!f.keyGot, rode, H.keys, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]);
          if ((!f.final && !f.keyGot) || !rode) { log.push(['FEHLER: Schlüssel/Rück-Warp-Box', Lg.keyBack]); break; }
          continue;
        }
        // { fight: 'kq' } Kippquader-König (wie course_w5d): auf das Rückenfeld springen, wenn er liegt; aus der Kipp-Fläche gehen;
        // über Schockwellen springen
        if (Lg.fight === 'kq') {
          const b = named('kq');
          const [CX, CZ] = Lg.center;
          const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]];
          const hp0 = b.hp;
          let k = 0, jumpsOnBack = 0, waveJumps = 0;
          const inRect = (r, m = 0) => p.pos.x > r.x0 - m && p.pos.x < r.x1 + m && p.pos.z > r.z0 - m && p.pos.z < r.z1 + m;
          for (; k < 120 * 160 && b.state !== 'gone' && !p.dead; k++) {
            const s = b.state;
            const wv = (b.waves ?? []).find((w) => Math.abs(Math.hypot(p.pos.x - w.x, p.pos.z - w.z) - w.r) < 1.1);
            if (wv && p.mode === 'ground') { waveJumps++; for (let j = 0; j < 16; j++) tick({ jump: true }); continue; }
            if (s === 'lie' && b.stateT > 0.15) {
              const f = b.backField();
              const D = DIRS[b.facing], Pp = [-D[1], D[0]];
              const side = (p.pos.x - f.x) * Pp[0] + (p.pos.z - f.z) * Pp[1] >= 0 ? 1 : -1;
              const ax = f.x + Pp[0] * side * 2.7, az = f.z + Pp[1] * side * 2.7;
              const da = Math.hypot(ax - p.pos.x, az - p.pos.z);
              if (p.mode === 'ground' && p.ground?.owner !== b && (da > 0.4 || Math.hypot(p.vel.x, p.vel.z) > 1.5)) { tick(da > 0.4 ? { ...this.stick(ax - p.pos.x, az - p.pos.z, Math.min(1, da / 1.5)), run: da > 3 } : {}); continue; }
              const h0 = b.hp;
              for (let j = 0; j < 160; j++) {
                const steer = p.mode === 'air' && p.pos.y > b.pos.y + 1.9 ? this.airSteer(f.x, f.z, 0, 0, 3.4, 7) : {};
                tick({ ...steer, jump: j < 26, run: false });
                if (b.hp < h0 || (j > 8 && p.mode === 'ground')) break;
              }
              jumpsOnBack++;
              for (let j = 0; j < 40 && b.state === 'hit'; j++) tick({});
              continue;
            }
            const r = s === 'warn' || s === 'tilt' ? b.lieRect() : null;
            if (r && inRect(r, 0.9)) {
              const D = DIRS[b.facing], Pp = [-D[1], D[0]];
              const side = (p.pos.x - b.pos.x) * Pp[0] + (p.pos.z - b.pos.z) * Pp[1] >= 0 ? 1 : -1;
              let tx = p.pos.x + Pp[0] * side * 3, tz = p.pos.z + Pp[1] * side * 3;
              if (Math.abs(tx - CX) > 5.5 || Math.abs(tz - CZ) > 5.5) { tx = p.pos.x - Pp[0] * side * 3; tz = p.pos.z - Pp[1] * side * 3; }
              tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 1), run: true });
              continue;
            }
            const hx = CX, hz = CZ + 3.5;
            const dx = hx - p.pos.x, dz = hz - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.8 ? { ...this.stick(dx, dz, Math.min(1, d / 2)), run: false } : {});
          }
          for (let i = 0; i < 240 && b.state !== 'gone'; i++) tick({});
          mech.bosses = { ...(mech.bosses ?? {}), kq: { hits: hp0 - b.hp, state: b.state, jumpsOnBack, waveJumps, time: +(k / 120).toFixed(1) } };
          log.push(['Kippquader-König', JSON.stringify(mech.bosses.kq)]);
          if (b.state !== 'gone') { log.push(['FEHLER: Kippquader-König nicht besiegt', b.state, b.hp]); break; }
          continue;
        }
        // { fight: 'schatten' | 'wirbel' } Draufspringen, wenn verwundbar (Schattenläuferin: vulnerable; Wirbelbrocken: stunned);
        // sonst Abstand halten (im Kreis um die Arenamitte, weg vom Boss und von Attrappen)
        if (Lg.fight === 'schatten' || Lg.fight === 'wirbel') {
          const b = named(Lg.fight);
          const [CX, CZ] = Lg.center;
          const hp0 = b.hp;
          let k = 0, j0 = -1, stomps = 0;
          const open = () => (Lg.fight === 'wirbel' ? b.state === 'stunned' : b.vulnerable && b.state !== 'appear');
          for (; k < 120 * 200 && b.state !== 'gone' && !b.defeated && !p.dead && !(Lg.untilHp !== undefined && b.hp <= Lg.untilHp); k++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            let inp;
            if (open() || (j0 >= 0 && p.mode === 'air')) {
              if (p.mode === 'ground' && (j0 < 0 || k - j0 > 30) && d < (Lg.at ?? 2.3)) { j0 = k; stomps++; }
              const jump = j0 >= 0 && k - j0 < 26;
              const ev = b.vel ?? { x: 0, z: 0 };
              inp = p.mode === 'air' ? { ...this.airSteer(b.pos.x + ev.x * 0.15, b.pos.z + ev.z * 0.15, ev.x, ev.z, 4, 8), jump } : { ...this.stick(dx, dz, 1), run: d > 3, jump };
              if (p.mode === 'ground' && j0 >= 0 && k - j0 > 30) j0 = -1;
            } else {
              j0 = -1;
              const rx = p.pos.x - CX, rz = p.pos.z - CZ, rr = Math.hypot(rx, rz) || 1;
              let ax = 0, az = 0, dmin = Infinity;
              for (const e of L.entities) {
                if (e.removed || !(e === b || (/attrappe|klon|clone/.test(e.kind) && e.alive))) continue;
                const ex = p.pos.x - e.pos.x, ez = p.pos.z - e.pos.z, ed = Math.max(0.5, Math.hypot(ex, ez));
                dmin = Math.min(dmin, ed);
                ax += ex / (ed * ed * ed); az += ez / (ed * ed * ed);
              }
              const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
              const want = Lg.ring ?? 5.5;
              const tx = -rz / rr, tz = rx / rr, sg = tx * ax + tz * az >= 0 ? 1 : -1;
              const kr = (want - rr) * 0.45;
              const wx = ax * 0.7 + sg * tx * 0.9 + (rx / rr) * kr, wz = az * 0.7 + sg * tz * 0.9 + (rz / rr) * kr;
              inp = { ...this.stick(wx, wz, dmin < 6 ? 1 : 0.4), run: dmin < 4 };
              if (p.mode === 'air' && p.vel.y > 0) inp.jump = true;
            }
            tick(inp);
          }
          if (Lg.untilHp !== undefined) { log.push([Lg.fight, 'bis hp', b.hp]); continue; }
          for (let i = 0; i < 600 && b.state !== 'gone'; i++) tick({});
          mech.bosses = { ...(mech.bosses ?? {}), [Lg.fight]: { hits: hp0 - b.hp, state: b.state, stomps, time: +(k / 120).toFixed(1) } };
          log.push([Lg.fight, JSON.stringify(mech.bosses[Lg.fight])]);
          if (b.state !== 'gone') { log.push(['FEHLER: Boss nicht besiegt', Lg.fight, b.state, b.hp]); break; }
          continue;
        }
        // { fight: 'lava' } Lavafelsen-König: Lavabrocken betäuben (draufspringen), aufheben (Aktion), auf den König werfen (Aktion)
        if (Lg.fight === 'lava') {
          const b = named('lava');
          const [CX, CZ] = Lg.center;
          const hp0 = b.hp;
          let k = 0, throws = 0, grabs = 0, stomps = 0, j0 = -1, cur = null;
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          const free = (e) => e.kind === 'lavabrocken' && !e.removed && !e.defeated && e.alive && e.state !== 'burst' && e.state !== 'thrown' && !e.carrier && e.state !== 'air';
          for (; k < 120 * 200 && b.state !== 'gone' && !p.dead; k++) {
            if (p.holding) {
              const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode !== 'ground') { tick({}); continue; }
              if (d > 6.5) { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
              if (d < 2.6) { tick({ ...this.stick(-dx, -dz, 1), run: false }); continue; }
              const yawWant = Math.atan2(-dz, dx);
              if (Math.abs(wrap(yawWant - p.yaw)) > 0.12) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              if (b.state === 'hit' || b.state === 'spin' || b.state === 'intro') { tick({}); continue; }
              tick({ action: true }); throws++;
              for (let q = 0; q < 20; q++) tick({});
              continue;
            }
            // Ziel festhalten (betäubte zuerst), bis es getragen wird oder weg ist
            if (!cur || !free(cur)) {
              const list = L.entities.filter(free).sort((a2, c2) => ((a2.state === 'stunned' ? 0 : 5) + Math.hypot(a2.pos.x - p.pos.x, a2.pos.z - p.pos.z)) - ((c2.state === 'stunned' ? 0 : 5) + Math.hypot(c2.pos.x - p.pos.x, c2.pos.z - p.pos.z)));
              cur = list[0] ?? null;
            }
            const e = cur;
            if (!e) {
              // warten: Abstand zum König halten (Kreis um die Mitte)
              const rx = p.pos.x - CX, rz = p.pos.z - CZ, rr = Math.hypot(rx, rz) || 1;
              const ex = p.pos.x - b.pos.x, ez = p.pos.z - b.pos.z, ed = Math.max(0.5, Math.hypot(ex, ez));
              const wx = ex / ed * (ed < 5 ? 1 : 0.2) + (-rz / rr) * 0.6 + (6 - rr) / rr * rx * 0.4, wz = ez / ed * (ed < 5 ? 1 : 0.2) + (rx / rr) * 0.6 + (6 - rr) / rr * rz * 0.4;
              tick({ ...this.stick(wx, wz, 0.8), run: false });
              continue;
            }
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            // Ausweichpunkt neben dem Ziel: weg von den übrigen Brocken (zur Arenamitte hin)
            let ox = CX - e.pos.x, oz = CZ - e.pos.z;
            for (const o2 of L.entities) if (o2 !== e && o2.kind === 'lavabrocken' && !o2.removed && Math.hypot(o2.pos.x - e.pos.x, o2.pos.z - e.pos.z) < 2.5) { ox += (e.pos.x - o2.pos.x) * 2; oz += (e.pos.z - o2.pos.z) * 2; }
            const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
            if (e.state === 'stunned' || e.state === 'getup') {
              // in der Luft: neben den Brocken lenken (sonst federt man auf ihm immer wieder hoch)
              if (p.mode !== 'ground') { tick(this.airSteer(e.pos.x + ox * 1.1, e.pos.z + oz * 1.1, 0, 0, 4, 5)); continue; }
              if (d > 0.85) { tick({ ...this.stick(dx, dz, Math.max(0.3, Math.min(1, d / 1.2))), run: false }); continue; }
              const yawWant = Math.atan2(-dz, dx);
              if (Math.abs(wrap(yawWant - p.yaw)) > 0.15) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              tick({ action: true }); tick({});
              if (p.holding) grabs++;
              continue;
            }
            // wach: draufspringen (betäuben); nach dem Abprall neben ihn lenken
            if (p.mode === 'ground' && (j0 < 0 || k - j0 > 34) && d < 2.0) { j0 = k; stomps++; }
            const jump = j0 >= 0 && k - j0 < 18;
            if (p.mode === 'air' && p.vel.y > 7 && k - j0 > 20) { tick(this.airSteer(e.pos.x + ox * 1.1, e.pos.z + oz * 1.1, 0, 0, 4, 5)); continue; }
            tick(p.mode === 'air' ? { ...this.airSteer(e.pos.x, e.pos.z, e.vel?.x ?? 0, e.vel?.z ?? 0, 4, 7), jump } : { ...this.stick(dx, dz, 1), run: false, jump });
          }
          for (let i = 0; i < 600 && b.state !== 'gone'; i++) tick({});
          mech.bosses = { ...(mech.bosses ?? {}), lava: { hits: hp0 - b.hp, state: b.state, throws, grabs, stomps, time: +(k / 120).toFixed(1) } };
          log.push(['Lavafelsen-König', JSON.stringify(mech.bosses.lava)]);
          if (b.state !== 'gone') { log.push(['FEHLER: Lavafelsen-König nicht besiegt', b.state, b.hp]); break; }
          continue;
        }
        // { fight: 'koenige' } zwei Schlangenkönige (wie course_w8d): im Fenster auf den Teller unter dem Kopf, von dort auf den Kopf;
        // sonst ausweichen (Kreis um die Mitte, weg von Landemarken der Steine)
        if (Lg.fight === 'koenige') {
          const G = named('koenige'), K = [named('sk_gruen'), named('sk_rosa')];
          const [CX, CZ] = Lg.center;
          const hp0 = G.hp;
          let n = 0, plateJumps = 0, headJumps = 0, j0 = -99, standN = 0, phase = 'evade', cur = null;
          const winOf = (b) => b.hp > 0 && (b.state === 'lean' || b.state === 'summon') && b.target && b.target.state === 'up' && !b.target.broken;
          for (; n < 120 * 300 && G.state !== 'gone' && !p.dead; n++) {
            if (!cur || !winOf(cur)) cur = K.find((b) => winOf(b) && b.state === 'lean') ?? K.find(winOf) ?? null;
            let inp = {};
            if (cur) {
              const t = cur.target;
              const onPlate = p.mode === 'ground' && p.ground?.owner === t;
              if (onPlate) {
                standN++;
                if (standN > 3) { j0 = n; headJumps++; standN = 0; phase = 'kopf'; }
                inp = { jump: n - j0 < 32 };
              } else if (p.mode === 'air' && phase === 'kopf') {
                const h = cur.headWorld({});
                inp = { ...(p.vel.y < 3 ? this.airSteer(h.x, h.z, 0, 0, 3.4, 6) : {}), jump: n - j0 < 32 };
              } else {
                standN = 0;
                const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, d = Math.hypot(dx, dz);
                if (p.mode === 'ground') {
                  phase = 'teller';
                  if (d < 1.7 && n - j0 > 40) { j0 = n; plateJumps++; }
                  inp = { ...this.stick(dx, dz, d > 1.2 ? 1 : 0.5), jump: n - j0 < 30 };
                } else {
                  inp = { ...(p.pos.y > t.plateTop + 0.2 || p.vel.y < 0 ? this.airSteer(t.pos.x, t.pos.z, 0, 0, 3.6, 6) : this.stick(dx, dz, 0.6)), jump: n - j0 < 30 };
                }
              }
            } else {
              phase = 'evade';
              standN = 0;
              const rx = p.pos.x - CX, rz = p.pos.z - CZ, rr = Math.hypot(rx, rz) || 1;
              let ax = -rz / rr * 0.5, az = rx / rr * 0.5;
              ax += (8.5 - rr) / rr * rx * 0.35; az += (8.5 - rr) / rr * rz * 0.35;
              const push = (x, z, R2, w = 1) => { const ex = p.pos.x - x, ez = p.pos.z - z, ed = Math.max(0.3, Math.hypot(ex, ez)); if (ed < R2) { ax += (ex / ed) * w * (R2 - ed) / R2 * 3; az += (ez / ed) * w * (R2 - ed) / R2 * 3; } };
              for (const b of K) {
                for (const m of b.markers?.list ?? []) push(m.x, m.z, 2.2, 1.5);
                push(b.pos.x, b.pos.z, 3.4, 1.5);
                if (b.state === 'strike') { const h = b.headWorld({}); push(h.x, h.z, 3.2, 2); }
              }
              inp = { ...this.stick(ax, az, Math.min(1, Math.hypot(ax, az))), run: false };
              if (p.mode === 'air' && p.vel.y > 0 && n - j0 < 32) inp.jump = true;
            }
            tick(inp);
          }
          for (let i = 0; i < 600 && G.state !== 'gone'; i++) tick({});
          mech.bosses = { ...(mech.bosses ?? {}), koenige: { hits: hp0 - G.hp, max: G.maxHp, state: G.state, plateJumps, headJumps, time: +(n / 120).toFixed(1) } };
          log.push(['Schlangenkönige', JSON.stringify(mech.bosses.koenige)]);
          if (G.state !== 'gone') { log.push(['FEHLER: Schlangenkönige nicht besiegt', G.state, G.hp]); break; }
          continue;
        }
        // { fight: 'blase' } Würfelblase (wie course_w8d): in der Flucht auf den Hut springen; sonst im Kreis ausweichen, kurz vor
        // jeder Schockwelle hochspringen
        if (Lg.fight === 'blase') {
          const b = named('blase');
          const A = b.arena;
          let j0 = -1, stomps = 0, jumps = 0, n = 0;
          const waveSeen = new Set();
          const hp0 = b.hp;
          const waveList = () => { for (const w of b.goldWaves ?? []) waveSeen.add(w); for (const e of L.entities) if (e.kind === 'schockwelle' && e.owner === b && !e.removed) waveSeen.add(e); return [...(b.waves ?? []), ...(b.goldWaves ?? []).filter((w) => !w.removed).map((w) => ({ x: w.pos.x, z: w.pos.z, r: w.r ?? 0 }))]; };
          for (; n < 120 * 300 && b.state !== 'gone' && !p.dead; n++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            let inp;
            if (b.vulnerable || (b.state === 'flee' && b.grace > 0)) {
              if (p.mode === 'ground' && j0 < 0 && d < 2.2 && b.vulnerable) { j0 = n; stomps++; }
              const jump = j0 >= 0 && n - j0 < 20;
              inp = p.mode === 'air' ? { ...this.airSteer(b.pos.x, b.pos.z, b.vel.x, b.vel.z, 4, 9), jump } : { ...this.stick(dx, dz, 1), run: d > 2.5, jump };
              if (p.mode === 'ground' && j0 >= 0 && n - j0 > 26) j0 = -1;
            } else {
              j0 = -1;
              const rx = p.pos.x - A.x, rz = p.pos.z - A.z, rr = Math.hypot(rx, rz) || 1;
              let ax = -rz / rr * 0.6, az = rx / rr * 0.6;
              ax += (6.5 - rr) / rr * rx * 0.35; az += (6.5 - rr) / rr * rz * 0.35;
              const push = (x, z, R2, w = 1) => { const ex = p.pos.x - x, ez = p.pos.z - z, ed = Math.max(0.3, Math.hypot(ex, ez)); if (ed < R2) { ax += (ex / ed) * w * (R2 - ed) / R2 * 3; az += (ez / ed) * w * (R2 - ed) / R2 * 3; } };
              const giant = /^g/.test(b.state) || b.state === 'form';
              if (giant) push(b.pos.x, b.pos.z, (b.S ?? 3) / 2 + 3.2, 1.5);
              if (b.jump && (b.state === 'gcrouch' || b.state === 'gair')) push(b.jump.x1, b.jump.z1, (b.S ?? 3) / 2 + 2.6, 2);
              for (const e of b.bits ?? []) if (!e.removed && !e.defeated && e.alive) push(e.pos.x, e.pos.z, 1.6, 0.8);
              inp = { ...this.stick(ax, az, Math.min(1, Math.hypot(ax, az))), run: false };
              for (const w of waveList()) {
                const wd = Math.hypot(p.pos.x - w.x, p.pos.z - w.z);
                if (p.mode === 'ground' && w.r < wd && wd - w.r < 1.3) { inp.jump = true; jumps++; }
              }
              if (p.mode === 'air' && p.vel.y > 0) inp.jump = true;
            }
            tick(inp);
          }
          for (let i = 0; i < 600 && b.state !== 'gone'; i++) tick({});
          mech.bosses = { ...(mech.bosses ?? {}), blase: { hits: hp0 - b.hp, state: b.state, multi: !!b.multi, waves: waveSeen.size, maxSpeed: +Math.max(0, ...[...waveSeen].map((w) => w.speed ?? 0)).toFixed(2), waveHits: b.waveHits ?? 0, stomps, jumps, time: +(n / 120).toFixed(1) } };
          log.push(['Würfelblase', JSON.stringify(mech.bosses.blase)]);
          if (b.state !== 'gone') { log.push(['FEHLER: Würfelblase nicht besiegt', b.state, b.hp]); break; }
          continue;
        }
        // ------------------------------------------------ B-12 (Prüfkürzel): Schlüssel der fünf freien Kämpfe gutschreiben (wie course_bonus_enemies) – nur für Ziele hinter der letzten Box
        if (Lg.grantKeys) {
          const H = named('hub');
          for (const f of H.fights) if (!f.final) { f.won = true; f.keyGot = true; f.done = true; f.box?.markDone(); }
          H.keys = H.need;
          for (let n = 0; n < 240 && !H.open; n++) tick({});
          log.push(['Schlüssel gutgeschrieben', H.keys, H.open]);
          continue;
        }
        // ------------------------------------------------ Restzeit setzen (Zeitablauf prüfen)
        if (Lg.setTime !== undefined) { L.runtime.timeLeft = Lg.setTime; log.push(['Restzeit', Lg.setTime]); continue; }
        if (Lg.mark) { window.__mark = { t: L.time, time: L.runtime.timeLeft, coins: L.runtime.coins, ...(typeof Lg.mark === 'object' ? Lg.mark : {}) }; continue; }
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
          if (Lg.stopIf && cond(Lg.stopIf)) break;
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
      return { alive: !!L.entities.find((e) => e.spec?.id === 'sk_gabel' && !e.removed && !e.defeated), log, autoJumps, steps, time: steps / 120, clocks: L.named.get('uhren')?.got ?? 0, room: L.named.get('feuertuerme')?.state ?? null, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, cause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
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
        if (window.__trace && n % 30 === 0) (window.__clog ??= []).push([n, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1), p.state, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), e.state ?? '']);
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
    cond: (k) => cond(k),
    /** Remix-Kennwerte des laufenden Levels (je Level im Test ausgewertet). */
    remixInfo() {
      const d = L.data;
      const calls = window.__audio?.music?.__calls ?? [];
      return {
        kinds: this.kinds(), remix: d.remix ?? null, theme: d.theme, light: c.view.theme.light ?? null, music: d.music, variant: d.musicVariant ?? null,
        call: calls.filter((x) => x[0] === d.music).slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
        stamp: !!d.stamp, stars: (d.stars ?? []).length, starSlots: L.runtime.stars.length, bossStars: (d.enemies ?? []).filter((e) => e.star).length, world: d.world, title: d.title, timeLimit: d.timeLimit, rtLimit: L.runtime.timeLimit,
        b12: d.id === 'B-12' ? {
          boxes: L.entities.filter((e) => e.kind === 'bossblitz_box').map((e) => `${e.spec.id}:${+(e.pos.x - 0).toFixed(1)},${+e.pos.z.toFixed(1)}`).join(','),
          locked: L.entities.filter((e) => e.kind === 'bossblitz_box' && e.locked).map((e) => e.spec.id).join(','),
          need: named('hub')?.need ?? null, keys: named('hub')?.keys ?? null, bosses: (d.bosses ?? []).map((b) => b.id).join(','),
          group: (named('koenige')?.spec?.members ?? []).join(','), hubSize: (d.segments.find((q) => q.id === 'hub')?.size ?? []).join('x'),
          multi: (named('blase')?.spec?.waves ?? 0) >= 3,
        } : null,
        b11: d.id === 'B-11' ? {
          lights: (L.searchlights ?? []).length, track: (d.segments ?? []).filter((q) => q.type === 'suchscheinwerfer').every((q) => q.track === false) ? false : true,
          groups: named('suchlichtFallen')?.info().groups ?? 0, traps: named('suchlichtFallen')?.info().traps ?? 0,
          speeds: ['schwebe1', 'schwebe2', 'schwebe3'].map((id) => +(d.segments.find((q) => q.id === id)?.speed ?? 0).toFixed(2)).join(','),
          waits: ['schwebe1', 'schwebe2'].map((id) => +(d.segments.find((q) => q.id === id)?.wait ?? 0).toFixed(2)).join(','),
          big: d.segments.find((q) => q.id === 'schwebe2')?.size?.[0] ?? null,
          tinted: c.view.frameFns.filter((f) => f.obj?.name === 'stachelblock' && f.obj.userData.orange).length,
          werfer0: !!ent('werfer0'), walls: d.segments.filter((q) => q.type === 'wall' && q.climbable).map((q) => q.pos[0]).join(','),
          taskStar: d.items.find((i) => i.id === 'raetsel2')?.task?.star ?? null, broeckel: named('broeckel')?.blocks?.length ?? 0,
        } : null,
        b10: d.id === 'B-10' ? {
          space: (d.segments ?? []).filter((q) => q.type === 'deco_star').reduce((a, q) => a + (q.items ?? []).filter((i) => ['planet', 'rakete', 'komet', 'sterne'].includes(i.kind)).length, 0),
          wolken: (d.segments ?? []).filter((q) => q.type === 'deco_w6').reduce((a, q) => a + (q.items ?? []).filter((i) => i.kind === 'wolkenberg').length, 0),
          lava: (L.star?.combs ?? []).reduce((a, h) => a + (h.cells ?? []).filter((c) => c.type === 'lava').length, 0),
          eisWurf: (L.star?.combs ?? []).some((h) => (h.cells ?? []).some((c) => c.type === 'eis' && Math.abs(c.x + 1.41) < 0.2 && Math.abs(c.z + 262.39) < 0.2)),
          walzen: ['walze1', 'walze2', 'walze3'].map((id) => +named(id)?.speed?.toFixed(2)).join(','),
          movers: ['flug1', 'flug2', 'flug3', 'flug4'].map((id) => +(d.segments.find((q) => q.id === id)?.speed ?? 0).toFixed(2)).join(','),
          runde: d.items.find((i) => i.id === 'kaeferrunde')?.onClear?.power ?? null,
        } : null,
        b9: d.id === 'B-9' ? {
          towers: L.entities.filter((e) => e.kind === 'pilzlingsturm' && !e.removed && e.rider).map((e) => `${e.spec.id}:${e.max}+${e.rider.kind}`).join(','),
          sleeper: (() => { const e = ent('schlafturm'); return e ? { count: e.count, state: e.state, wake: e.spec.wake } : null; })(),
          warpHidden: !!named('warp1')?.hidden, room: named('feuertuerme')?.ids?.length ?? 0,
          torches: L.entities.filter((e) => e.kind === 'strandfackel').length, clocks: named('uhren')?.items?.length ?? 0, clockSec: named('uhren')?.sec ?? 0,
          ride: !!d.ride, archetype: d.archetype, keys: L.entities.filter((e) => e.kind === 'schluesselmuenze' && !e.removed).length,
          goalY: d.goal?.pos?.[1] ?? null, cp: d.checkpoint ?? null, star0hidden: !!d.stars?.[0]?.hidden,
        } : null,
      };
    },
  };
  window.__bc = W;
  return Object.keys(W);
}


const allErrors = [];
let loaded = null;
const SAVE = 'lotti-greta-course-v1';
async function load(id, o = {}) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !o.fresh) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    if (o.fresh) {
      // frischer Spielstand (Kampf-Haus: Ergebnis wird gespeichert)
      await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
      await page.evaluate((k) => localStorage.removeItem(k), SAVE);
    }
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
  if (o.hero) await sc((h) => { const c = window.__course; c.player.setHero(h); c.level.runtime.save.lives = 9; }, o.hero);
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__bc[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}blume_c_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__bc.detail());
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
    // Boss-Marathon: die Sterne geben die Endgegner (spec.star), LEVEL.stars bleibt leer
    const starsOk = M.archetype === 'boss' ? r.bossStars === M.stars && r.starSlots === M.stars : r.stars === M.stars;
    check(`${id}: „${M.title}“, Welt 11, ${M.stars} Sterne, kein Stempel, ${M.time ? `${M.time} s, ` : ''}Thema ${M.theme}, Musik ${M.music}${M.variant ? ` (Variante ${M.variant})` : ''}`,
      r.title === M.title && r.world === 11 && starsOk && !r.stamp && (r.kinds.stamp ?? 0) === 0 && (!M.time || r.timeLimit === M.time) && r.theme === M.theme && r.music === M.music && (r.variant ?? null) === (M.variant ?? null));
    if (R.base) {
      check(`${id}: Remix von ${R.base} über remixOf (LEVEL.remix.base = ${r.remix?.base})`, r.remix?.base === R.base && !r.remix?.missing);
      if (M.light) check(`${id}: Licht-Variante ${M.light} wirksam (Thema ${r.theme}, Ansicht ${r.light})`, r.light === M.light);
      check(`${id}: Musik spielt ${M.music}${M.variant ? ` mit Klang-Variante ${M.variant}` : ' ohne Variante'} (music.play ${JSON.stringify(r.call)})`,
        !!r.call && (M.variant ? r.call[1]?.variant === M.variant && r.mVariant === M.variant : !r.call[1]?.variant));
    }
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${r.kinds[kind] ?? 0})`, (r.kinds[kind] ?? 0) === n);
    for (const m of R.remixChecks ?? []) check(`${id}: ${m.name}`, m.ok(r));
  }

  // ------------------------------------------------ Probe (Fehlersuche): PROBE='{"from":[x,y,z],"place":{…},"legs":[…],"dump":"js"}'
  if (process.env.PROBE) {
    const pr = JSON.parse(process.env.PROBE);
    for (const hero of HEROES) {
      await load(id);
      await W('place', pr.from ?? R.start, { hero, settle: 10, ...(pr.place ?? {}) });
      if (pr.pre) await sc((js) => Function('c', 'L', 'P', js)(window.__course, window.__course.level, () => window.__course.player), pr.pre);
      const res = await W('drive', pr.legs, { invuln: pr.invuln });
      for (const l of res.log) if (process.env.TRACE || l[0] !== 'spur') console.log('     ', JSON.stringify(l));
      console.log(`  ${hero}: ${res.time.toFixed(1)} s, Status ${res.status}, Ende ${res.pos.map((v) => v.toFixed(2)).join(', ')}, tot ${res.dead} ${res.cause ?? ''}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}, Sterne ${res.rt.stars}`);
      if (pr.dump) console.log('  dump', JSON.stringify(await sc((js) => Function('c', 'L', 'P', `return (${js});`)(window.__course, window.__course.level, () => window.__course.player), pr.dump)));
      if (pr.shot) await shot(`probe_${pr.shot}`);
    }
    continue;
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
      if (t.expectAlive !== false && !t.anyAlive) ok = ok && !res.dead;
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
    // Beine statt Lage (Boss-Marathon): frisch laden, vom Start aus fahren (Warp-Box, Kampf beginnen …), dann das Bild
    if (pos.legs) {
      await load(id);
      await W('place', R.start, { settle: 10 });
      const res = await W('drive', pos.legs, {});
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) for (const l of res.log) if (l[0] !== 'spur') console.log('     ', JSON.stringify(l));
      await shot(`${id}_${name}`);
      continue;
    }
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
