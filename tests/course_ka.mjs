// Welt Krone, Level K-1 „Siegerstraße über dem Wolkenmeer“ (der lange Champion-Kurs, ≈ 950 m ohne Kontrollpunkt und Power-ups,
// vier Warp-Boxen): Schiebeblock-Auftakt mit Krakenpilzen, Aufzugsschacht (Glasröhre, Aufzüge, schmale Stege mit rennenden
// Pilzlingen, Feuer-Werfer), Piep-Block-Strecke im doppelten Tempo, Glasröhren-Kanone in die Zauberarena (Bröckelblöcke, drei
// Zauberkröten, vier Feuerstäbe), graue Plattformen (Pendelstacheln, Stachelwalzen, Wuschel-Schwärme, Topf-Schnappblume),
// Wandsprung-Turm (Federplattform, Wandsprünge, Hörner-Ameisen als Stufen, Rankenschnapper-Kette), drei schwebende Wasserwürfel
// mit blauen und roten Stachelblöcken, Boost-Finale (Feuerring-Schockwellen, fünf Schlüsselmünzen, Warp-Box 4) und der goldene
// Zielmast mit Feier:
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen, kein Kontrollpunkt, keine
// Power-ups), Routen-Bot (Lotti und Greta von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben –
// kein Teleport auf der Route), alle Sterne, der Stempel und die Geheimnisse mit der echten Mechanik samt Gegenproben,
// Extraleben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera
// (tests/out/ka_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_ka.mjs
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · SEC=s1…s6 (nur dieser Abschnitt der Route, Start an seinem from; s3+ = ab s3
//   bis zum Ziel) · VULN=1 (Route verwundbar – zeigt, wo der Bot ohne Ausweichen getroffen wird) · SWEEP_STEP=12 (m zwischen den
//   Messpunkten) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1 (Zeichenaufrufe je Objekt
//   bei den Bildern) · TRACE=1 (Spur der Figur)
// Laufzeiten (gemessen): load,route,sweep ≈ 2 min · targets,extra ≈ 1,2 min · shots ≈ 4 min (zusammen ≈ 7 min).
// Die Taktuhr der Piep-Blöcke läuft im Test auf der Simulationszeit (level.beepClock.mode 'level'); dass sie im Spiel der Musik
// folgt, prüft der Teil load mit manueller Musik-Uhr.
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf } ·
// { wait } · { hop } · { crouch } · { star: i } · { stamp: true } · { chaseKind, ids } · { expect } · { until } (Name aus COND
// oder Ausdruck '=…') · { warp: [x, z] } · { pound: [x, z] } · { stompAll: Id-Anfang } · { place } · { die } · { path } ·
// { upOnto: [x, z, top] } · { pipe: [x, z] }
const ROUTES = {
  'K-1': {
    start: [0, 0, 6],
    meta: { stars: 3, time: 500, theme: 'skyway', music: 'course_champion', archetype: 'parcours', world: 12, maxTime: 480 },
    enemies: { krakenpilz: 6, pilzling: 4, feuer_werfer: 3, zauberkroete: 3, ameisensoldat_horn_strom: 2, rankenschnapper: 3, feuerring: 9, topfpflanze: 2 },
    main: [
      // ---------------------------------------------- 1 Schiebeblock-Auftakt
      { sec: 's1', from: [0, 0, 6] },
      { name: 'Startplatz', to: [0, -4.5], within: 0.3, run: false },
      { name: 'Block A', to: [0, -9.6], jump: 24, within: 0.6, run: false },
      { to: [0, -10.5], within: 0.3, run: false },
      { name: 'Schiebeblock 1', board: 's1', at: [0, -15.5] },
      { name: 'Block B', to: [0, -21.6], jump: 20, within: 0.6, run: false },
      { to: [0, -22.5], within: 0.3, run: false },
      { name: 'Schiebeblock 2 (Krakenpilz)', board: 's2', at: [0, -27.5], aimAt: 'kp_s2' },
      { name: 'Rastinsel 1', to: [0, -33.6], jump: 20, within: 0.6, run: false },
      { to: [0, -41.5], within: 0.3, run: false },
      { name: 'Block C', to: [0, -46.6], jump: 26, within: 0.6, run: false },
      { to: [0, -47.5], within: 0.3, run: false },
      { name: 'Schiebeblock 3', board: 's3', at: [0, -52.5] },
      { name: 'Schiebeblock 4 (Krakenpilz)', board: 's4', at: [0, -58.5], edge: [0, -1.05], settle: 4, aimAt: 'kp_s4' },
      { name: 'Block D', to: [0, -64.6], jump: 26, jumpAt: 5, within: 0.6, run: false },
      { to: [0, -65.5], within: 0.3, run: false },
      { name: 'Rastinsel 2', to: [0, -70.6], jump: 24, within: 0.6, run: false },
      { to: [0, -79.5], within: 0.3, run: false },
      { name: 'Block E', to: [0, -84.6], jump: 24, within: 0.6, run: false },
      { to: [0, -85.5], within: 0.3, run: false },
      { name: 'Fahrblock (Krakenpilz)', board: 's5', at: [0, -90.5], aimAt: 'kp_s5' },
      { name: 'mitfahren', ride: 's5', stop: [0, -98.5], edge: [0, -1.1] },
      { name: 'Block F', to: [0, -104.6], jump: 30, within: 0.6, run: false },
      { to: [0, -105.5], within: 0.3, run: false },
      { name: 'Schiebeblock 6 (Krakenpilz)', board: 's6', at: [0, -110.5], aimAt: 'kp_s6', after: [0, -1.1], settle: 50 },
      { name: 'Endinsel 1', to: [0, -116.6], jump: 26, within: 0.6, run: false },
      // ---------------------------------------------- 2 Aufzugsschacht
      { sec: 's2', from: [0, 3, -118] },
      { name: 'Glasröhre zum Aufzugsschacht', pipe: [0, -123] },
      { expect: '=at(-2.6, 2.6, 9.5, -135, -142)' },
      { to: [0, -140.4], within: 0.3, run: false },
      { name: 'Aufzug 1', board: 'lift1', at: [0, -143.3], y: 9.5 },
      { name: 'hinauf', ride: 'lift1', untilY: 16.5 },
      { name: 'Steg 1', to: [0, -147], within: 0.4, run: false },
      { name: 'rennende Pilzlinge auf Steg 1', stompAll: 'lauf1' },
      { stompAll: 'lauf2' },
      { to: [0, -161], within: 0.4, run: false },
      { name: 'Feuer-Werfer 1', stompAll: 'werfer1' },
      { to: [0, -167.4], within: 0.3, run: false },
      { name: 'Aufzug 2', board: 'lift2', at: [0, -170.3], y: 16.5 },
      { name: 'hinauf', ride: 'lift2', untilY: 22.5 },
      { name: 'Steg 2', to: [0, -174], within: 0.4, run: false },
      { name: 'rennende Pilzlinge auf Steg 2', stompAll: 'lauf3' },
      { stompAll: 'lauf4' },
      { to: [0, -189], within: 0.4, run: false },
      { name: 'Feuer-Werfer 2', stompAll: 'werfer2' },
      { to: [0, -195.4], within: 0.3, run: false },
      { name: 'Aufzug 3', board: 'lift3', at: [0, -198.3], y: 22.5 },
      { name: 'hinauf', ride: 'lift3', untilY: 28.5 },
      { name: 'Gipfel', to: [0, -202.5], within: 0.4, run: false },
      { name: 'Feuer-Werfer 3', stompAll: 'werfer3' },
      { name: 'Warp-Box 1', warp: [0, -210.4] },
      { expect: '=at(-3.6, 3.6, 13.5, -216, -228)' },
      // ---------------------------------------------- 3 Piep-Block-Strecke (Wechsel jeden Takt) und Zauberarena
      { sec: 's3', from: [0, 14, -221.4] },
      { to: [0, -226.5], within: 0.3, run: false },
      { name: 'Piep rot 1', beep: 'rot', need: 1.0, to: [0, -234], within: 0.5 },
      { name: 'Piep blau 2', beep: 'blau', need: 1.3, to: [0, -240.2], within: 0.4, run: false },
      { name: 'Piep rot 3 (Sprung im Wechsel)', beep: 'rot', lead: 0.3, to: [0, -243.5], jump: 18, within: 0.6, run: false },
      { to: [0, -248], within: 0.4 },
      { name: 'Piep-Treppe rot', beep: 'rot', need: 1.1, to: [0, -251.3], jump: 30, within: 0.4, run: false },
      { name: 'Piep-Treppe blau (Sprung im Wechsel)', beep: 'blau', lead: 0.3, to: [0, -254.3], jump: 34, within: 0.5, run: false },
      { name: 'Rastinsel 4', to: [-2, -266.4], within: 0.3, run: false },
      { name: 'Zickzack rot', beep: 'rot', need: 1.0, to: [-1, -272], within: 0.4 },
      { name: 'Zickzack blau (Sprung im Wechsel)', beep: 'blau', lead: 0.3, to: [2, -272.5], jump: 18, within: 0.5, run: false },
      { to: [1, -278], within: 0.4 },
      { name: 'Zickzack rot (Sprung im Wechsel)', beep: 'rot', lead: 0.3, to: [-2, -278.5], jump: 18, within: 0.5, run: false },
      { to: [-1, -284], within: 0.4 },
      { to: [0, -284.6], within: 0.3, run: false },
      { name: 'Trittstein 1 (blau)', beep: 'blau', need: 1.2, to: [0, -288], jump: 22, within: 0.5, run: false },
      { name: 'Trittstein 2 (rot)', beep: 'rot', lead: 0.3, to: [0, -292.5], jump: 22, within: 0.5, run: false },
      { name: 'Trittstein 3 (blau)', beep: 'blau', lead: 0.3, to: [0, -297], jump: 22, within: 0.5, run: false },
      { name: 'Kanonen-Insel', to: [0, -302], jump: 22, within: 0.5, run: false },
      { name: 'Glasröhren-Kanone in die Zauberarena', pipe: [0, -305.4] },
      { expect: '=at(-12.5, 12.5, 13.5, -349, -356)' },
      { name: 'drei Zauberkröten', toads: ['zk1', 'zk2', 'zk3'], center: [0, -362] },
      { name: 'Warp-Box 2', warp: [0, -362] },
      { expect: '=at(-4.6, 4.6, 8.5, -384, -396)' },
      // ---------------------------------------------- 4 Graue Plattformen
      { sec: 's4', from: [0, 9, -389] },
      { to: [0, -394.5], within: 0.3, run: false },
      { name: 'Grau 1 (Pendelstachel)', to: [0, -400], jump: 24, within: 0.6, run: false },
      { to: [0, -401.6], within: 0.3, run: false },
      { name: 'graue Fähre', board: 'g2', at: [0, -406.5] },
      { ride: 'g2', stop: [0, -413.5], edge: [0, -1.1] },
      { name: 'Grau 3 (Wuschel-Kreis)', to: [0, -419.5], jump: 26, within: 0.6, run: false },
      { to: [0, -421.6], within: 0.3, run: false },
      { name: 'Grau 4 (Pendelstachel)', to: [0, -427], jump: 24, within: 0.6, run: false },
      { to: [0, -428.6], within: 0.3, run: false },
      { name: 'Grau 5', to: [0, -433.2], jump: 24, within: 0.6, run: false },
      { name: 'über Stachelwalze 1', to: [0, -438], jump: 34, jumpAt: 3.6, within: 0.6 },
      { name: 'über Stachelwalze 2', to: [0, -443.2], jump: 34, jumpAt: 3.6, within: 0.6, run: false },
      { name: 'Querfahrer', board: 'g6', at: [0, -447], pause: -1, tol: 0.35, after: [0, -1.4], settle: 36 },
      { name: 'Erholungsinsel', to: [0, -451.6], jump: 22, within: 0.6, run: false },
      { to: [0, -459.6], within: 0.3, run: false },
      { name: 'Pendelstufe 1', to: [0, -464.5], jump: 24, within: 0.6, run: false },
      { to: [0, -465.6], within: 0.3, run: false },
      { name: 'Pendelstufe 2', to: [0, -470.5], jump: 26, within: 0.6, run: false },
      { to: [0, -471.6], within: 0.3, run: false },
      { name: 'Pendelstufe 3', to: [0, -476.5], jump: 26, within: 0.6, run: false },
      { to: [0, -477.6], within: 0.3, run: false },
      { name: 'lange Fähre (Wuschel-Schwarm)', board: 'g9', at: [0, -482.5] },
      { ride: 'g9', stop: [0, -494.5], edge: [0, -1.1] },
      { name: 'Grau 10', to: [0, -500], jump: 24, within: 0.6, run: false },
      { to: [0, -501.6], within: 0.3, run: false },
      { name: 'schmaler Steg (zwei Pendelstacheln)', to: [0, -506], jump: 22, within: 0.5, run: false },
      { to: [0, -516.5], within: 0.4, run: false },
      { name: 'Sternplatz', to: [0, -522], jump: 22, within: 0.6, run: false },
      { to: [1.5, -537], within: 0.5 },
      { name: 'Warp-Box 3', warp: [0, -541.4] },
      { expect: '=at(-6, 6, 3.5, -555, -569)' },
      // ---------------------------------------------- 5 Wandsprung-Turm und Wasserwürfel
      { sec: 's5', from: [0, 4, -560] },
      { to: [0, -562.2], within: 0.3, run: false },
      { name: 'Federplattform', spring: [0, -565.6], to: [0, -571.4], steerY: 12, top: 11 },
      { name: 'Wandsprung-Schacht', wallclimb: { dir: 1, until: 20.8, z: -571.6, then: [0, -577.5], top: 20 } },
      { to: [0, -577.5], within: 0.4, run: false },
      { name: 'Hörner-Ameise an der Turmwand', ant: 'ameisensoldat_horn', stand: [-2.2, -580.1], fy: [20.2, 21.0], top: 28 },
      { to: [-1.1, -589.1], within: 0.3, run: false },
      { name: 'Rankenschnapper 1', vine: 'ranke1', to: [-2.4, -589.1] },
      { name: 'Rankenschnapper 2', vine: 'ranke2', to: [0, -589.1], need: 0.8 },
      { name: 'Rankenschnapper 3', vine: 'ranke3', to: [2.4, -589.1], need: 0.8 },
      { name: 'Turmspitze', to: [2, -592.5], jump: 30, within: 0.6, run: false, y: 35 },
      { to: [0, -596.4], within: 0.3, run: false },
      { name: 'Kopfsprung in Wasserwürfel 1', to: [0, -601.5], jump: 16, within: 0.8, land: false, run: false },
      { name: 'blauer Balken 1', bar: 'sb1', at: [0, -603.6], past: [0, -608.6], ys: [28, 32.6], gapHi: 33.4, gapLo: 29.2 },
      { name: 'blauer Balken 2', bar: 'sb2', at: [0, -611.6], past: [0, -616.6], ys: [28, 32.6], gapHi: 33.4, gapLo: 29.2 },
      { name: 'blauer Balken 3', bar: 'sb3', at: [0, -619.6], past: [0, -624.6], ys: [28, 32.6], gapHi: 33.4, gapLo: 29.2 },
      { swimTo: [[0, 34.4, -627.4]] },
      { name: 'Aussprung auf Sims 1', to: [0, -631.5], within: 0.6, y: 35.4 },
      { to: [0, -636.4], within: 0.3, run: false },
      { name: 'Wasserwürfel 2 (rote Stachelblöcke)', to: [0, -641.5], jump: 16, within: 0.8, land: false, run: false },
      { swimTo: [[0, 31.6, -645], [0, 31.6, -663], [0, 34.9, -667.4]] },
      { name: 'Aussprung auf Sims 2', to: [0, -671.5], within: 0.6, y: 35.9 },
      { to: [0, -676.4], within: 0.3, run: false },
      { name: 'Wasserwürfel 3', to: [0, -681.5], jump: 16, within: 0.8, land: false, run: false },
      { name: 'blauer Balken 6', bar: 'sb6', at: [0, -683.6], past: [0, -688.6], ys: [29, 33.6], gapHi: 34.4, gapLo: 30.2 },
      { swimTo: [[0, 34.4, -694], [0, 35.4, -704.4]] },
      { name: 'Aussprung auf die Röhren-Insel', to: [0, -709], within: 0.6, y: 35.9 },
      { name: 'Glasröhre zum Boost-Finale', pipe: [0, -716.6] },
      { expect: '=at(-3.2, 3.2, 11.5, -735, -745)' },
      // ---------------------------------------------- 6 Boost-Finale: Feuerring-Schockwellen, fünf Schlüsselmünzen, Warp-Box 4
      { sec: 's6', from: [0, 12, -742] },
      { name: 'Boost-Bahn', to: [2.5, -766.6], within: 0.5 },
      { to: [2.5, -767], within: 0.3, run: false },
      { name: 'Schlüssel 1: Seitensims links', to: [-10, -767], jump: 30, jumpAt: 7.4, within: 0.8 },
      { expect: '=L.keys?.krone?.n === 1' },
      { to: [-11.6, -767], within: 0.3, run: false },
      { name: 'zurück auf die Bahn', to: [-1, -769], jump: 30, jumpAt: 6.6, within: 0.8 },
      { name: 'Boost vor der Lücke', to: [0, -804], jump: 26, jumpAt: 14, within: 1.2 },
      { name: 'Schlüssel 2: über der Schockwelle', to: [0, -816], jump: 26, jumpAt: 4.5, within: 0.8 },
      { expect: '=L.keys?.krone?.n === 2' },
      { to: [-2.5, -829], within: 0.3, run: false },
      { name: 'Schlüssel 3: Seitensims rechts', to: [10, -829], jump: 30, jumpAt: 7.6, within: 0.8 },
      { to: [11.6, -829], within: 0.3, run: false },
      { expect: '=L.keys?.krone?.n === 3' },
      { name: 'zurück auf die Bahn', to: [1, -831], jump: 30, jumpAt: 6.6, within: 0.8 },
      { name: 'Boost über die zweite Lücke', to: [0, -864], jump: 26, jumpAt: 14, within: 1.2 },
      { to: [0, -876.5], within: 0.3, run: false },
      { name: 'Schlüssel 4: auf dem Goldblock', to: [0, -880], jump: 34, within: 0.5, y: 14.4, run: false },
      { expect: '=L.keys?.krone?.n === 4' },
      { name: 'hinab und weiter', to: [0, -888], jump: 20, within: 0.8 },
      { name: 'Rampe zum Platz', to: [0, -918], within: 0.6 },
      { name: 'Schlüssel 5 auf dem Platz', to: [-6, -931], within: 0.4 },
      { expect: '=L.keys?.krone?.n === 5' },
      { until: '=ent(\'warp4\') && !ent(\'warp4\').hidden', max: 240 },
      { name: 'Warp-Box 4 zum Siegerplatz', warp: [0, -933.6] },
      { expect: '=at(-9, 9, 23.5, -957, -975)' },
      { to: [0, -974.4], within: 0.3, run: false },
      { name: 'Goldtreppe', to: [0, -976.6], jump: 20, within: 0.5, run: false },
      { to: [0, -979.6], jump: 20, within: 0.5, run: false },
      { to: [0, -982.6], jump: 20, within: 0.5, run: false },
      { to: [0, -986], jump: 20, within: 0.5, run: false },
      { name: 'goldener Zielmast', to: [0, -989.6], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 0: hinter der Piep-Block-Strecke über zwei Piep-Blöcke (rot, im Wechsel blau) zum Sternsockel', star: 0, from: [-2.6, 16, -308],
        legs: [{ to: [-2.9, -311.6], within: 0.25, run: false }, { beep: 'rot', need: 1.1, to: [-3.8, -314.6], jump: 22, within: 0.5, run: false },
          { beep: 'blau', lead: 0.3, to: [-6.6, -317.2], jump: 22, within: 0.5, run: false }, { to: [-10, -321], jump: 26, within: 0.6, run: false }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne die Piep-Blöcke (vom Inselrand zum Sockel zu weit)', star: 0, expectNot: true, allowFail: true, from: [-4.4, 16, -311.4], heroes: ['lotti'],
        legs: [{ to: [-10, -321], jump: 40, within: 0.6, run: true, max: 300 }] },
      { name: 'Stern 1: Topf-Schnappblume von der Erholungsinsel zum Sternplatz tragen, sie frisst den Wuschel-Ring', star: 1, from: [1.4, 9, -457.4],
        legs: [{ pickUp: 'topf2' }, { to: [0, -459.6], within: 0.3, run: false },
          { to: [0, -464.5], jump: 24, within: 0.6, run: false }, { to: [0, -465.6], within: 0.3, run: false },
          { to: [0, -470.5], jump: 26, within: 0.6, run: false }, { to: [0, -471.6], within: 0.3, run: false },
          { to: [0, -476.5], jump: 26, within: 0.6, run: false }, { to: [0, -477.6], within: 0.3, run: false },
          { board: 'g9', at: [0, -482.5] }, { ride: 'g9', stop: [0, -494.5], edge: [0, -1.1] },
          { to: [0, -500], jump: 24, within: 0.6, run: false }, { to: [0, -501.6], within: 0.3, run: false },
          { to: [0, -506], jump: 22, within: 0.5, run: false }, { to: [0, -516.5], within: 0.4, run: false },
          { to: [0, -522], jump: 22, within: 0.6, run: false },
          { name: 'zum Wuschel-Ring', to: [-0.6, -531], within: 0.3, run: false, slow: 0.5 },
          { feed: 'w_stern', face: [-3.4, -531], max: 2400 },
          { star: 1 }], mech: (r) => r.mech.eaten >= 8, mechText: (r) => `gefressen ${r.mech.eaten ?? 0}`, shot: 'stern1' },
      { name: 'Wuschel-Ring ohne Topf-Schnappblume: Hineinlaufen verletzt', star: 1, secret: true, from: [-0.6, 10.5, -526], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ to: [-3.4, -531], within: 0.3, run: false, max: 400 }, { wait: 30 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Stern 2: hinter dem Platz über den Goldsteg zwischen den Schockwellen zum Sockel', star: 2, from: [0, 16, -934.8],
        legs: [{ to: [0, -936.6], within: 0.3, run: false }, { ring: 'fr9', to: [0, -946.6] }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: auf der zweiten Stufe der Goldtreppe rechts hochspringen', stamp: true, from: [3.3, 24, -973],
        legs: [{ to: [3.3, -974.4], within: 0.3, run: false }, { to: [3.3, -976.5], jump: 20, within: 0.4, run: false }, { to: [3.3, -979.5], jump: 20, within: 0.4, run: false }, { hop: 30 }], shot: 'stempel' },
      { name: 'Stempel nicht im Vorbeigehen auf der Treppenmitte', stamp: true, expectNot: true, from: [0, 24, -973], heroes: ['lotti'],
        legs: [{ to: [0, -974.4], within: 0.3, run: false }, { to: [0, -976.6], jump: 20, within: 0.5, run: false }, { to: [0, -979.6], jump: 20, within: 0.5, run: false }, { to: [0, -982.6], jump: 20, within: 0.5, run: false }] },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block auf Rastinsel 2', from: [-2.5, 2, -75.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-2.5, -77], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block auf dem Aufzugs-Gipfel', from: [-3, 29, -209.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-3, -211], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block auf der Erholungsinsel', from: [2.5, 9, -455.9], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [2.5, -457.5], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Hörner-Ameise trägt die Figur verwundbar ohne Treffer die Turmwand hinauf', from: [0, 20, -577.5], heroes: ['lotti', 'greta'], invuln: false,
        legs: [{ ant: 'ameisensoldat_horn', stand: [-2.2, -580.1], fy: [20.2, 21.0], top: 28 }],
        mech: (r) => r.mech.hurts === 0 && r.pos[1] > 27.5, mechText: (r) => `Treffer ${r.mech.hurts}, y ${r.pos[1].toFixed(1)}` },
      { name: 'Hörner-Ameise am Boden: wer ihr von oben auf das Horn springt, wird getroffen', from: [0, 28, -586], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ until: '=L.entities.some((e) => e.kind === \'ameisensoldat_horn\' && e.normal.y > 0.9 && e.foot.x < 0 && e.foot.z < -583)', max: 1200 }, { stompAll: 'zz_keiner' }, { chaseKind: 'ameisensoldat_horn', max: 300 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Piep-Blöcke: wer auf Rot stehen bleibt, fällt beim Wechsel', from: [0, 14, -230], heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
        legs: [{ beep: 'rot', need: 1.2, to: [0, -230], within: 0.3, run: false }, { wait: 520 }],
        mech: (r) => r.dead || (r.rt.deaths ?? 0) > 0, mechText: (r) => (r.dead || (r.rt.deaths ?? 0) > 0 ? 'gefallen' : 'steht noch') },
      { name: 'Warp-Box 2 bleibt verborgen, solange eine Zauberkröte übrig ist', from: [0, 14, -351.6], heroes: ['lotti'],
        legs: [{ toads: ['zk1', 'zk2'], center: [0, -362] }, { wait: 60 }, { expect: '=ent(\'warp2\').hidden' }] },
      { name: 'Warp-Box 4 bleibt mit vier Schlüsselmünzen verborgen', from: [0, 16, -919], heroes: ['lotti'],
        legs: [{ to: [0, -931], within: 0.4 }, { wait: 60 }, { expect: '=ent(\'warp4\').hidden && (L.keys?.krone?.n ?? 0) === 0' }, { to: [-6, -931], within: 0.4 }, { wait: 30 }, { expect: '=(L.keys?.krone?.n ?? 0) === 1 && ent(\'warp4\').hidden' }] },
      { name: 'kein Kontrollpunkt: ein Sturz in den grauen Plattformen führt zurück an den Start', from: [0, 9, -420], heroes: ['lotti'], invuln: false,
        legs: [{ die: 'fall' }, { expect: '=Math.hypot(P().pos.x, P().pos.z - 6) < 1.5 && P().pos.y < 1' }] },
      { name: 'Feuerstab in der Zauberarena streift die Ecken des Mittelsockels', from: [-1.25, 14, -363.25], heroes: ['lotti'], invuln: false, allowFail: true, expectAlive: false,
        legs: [{ wait: 600 }], mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Pendelstachel über dem schmalen Steg verletzt, wer stehen bleibt', from: [0, 10.5, -508.5], heroes: ['lotti'], invuln: false, allowFail: true, expectAlive: false,
        legs: [{ wait: 500 }], mech: (r) => r.mech.hurts >= 1 || (r.rt.deaths ?? 0) > 0, mechText: (r) => `Treffer ${r.mech.hurts}, Stürze ${r.rt.deaths ?? 0}` },
      { name: 'Siegesfeier am goldenen Zielmast: Konfetti und Feuerwerk', from: [0, 28, -987], heroes: ['lotti'],
        legs: [{ to: [0, -989.6], within: 0.2 }, { tail: 230 }],
        mech: (r) => r.mech.feier?.fired && r.mech.feier.bursts >= 3 && r.mech.feier.confetti >= 3, mechText: (r) => JSON.stringify(r.mech.feier ?? {}), shot: 'feier' },
    ],
    shots: [
      ['start', [0, 0, 6]],
      ['schiebe1', [0, 0, -10]],
      ['rast1', [0, 0, -36]],
      ['schiebe3', [0, 1, -47.5]],
      ['rast2', [0, 2, -74]],
      ['fahrblock', [0, 2, -85]],
      ['endinsel1', [0, 3, -118]],
      ['schacht_a', [0, 10, -139]],
      ['steg1', [0, 17, -150]],
      ['sims_b', [0, 17, -165]],
      ['gipfel', [0, 29, -203]],
      ['takt', [0, 14, -222]],
      ['piep', [0, 14, -234]],
      ['treppe', [0, 14, -248]],
      ['zickzack', [-2, 18, -265]],
      ['trittsteine', [0, 18, -284]],
      ['kanone', [0, 16, -303]],
      ['stern0', [-2.8, 16, -311]],
      ['arena', [0, 14, -352]],
      ['arena2', [10, 14, -368]],
      ['grau0', [0, 9, -389]],
      ['grau', [0, 9, -420]],
      ['walzen', [0, 9, -433]],
      ['erholung', [0, 9, -455]],
      ['pendelstufen', [0, 9.5, -464.5]],
      ['steg', [0, 10.5, -506]],
      ['sternplatz', [0, 10.5, -524]],
      ['turmfuss', [0, 4, -560]],
      ['schacht', [0, 11, -570]],
      ['ameisen', [0, 20, -578]],
      ['ranken', [0, 28, -585]],
      ['turmspitze', [0, 35, -594]],
      ['wasser1', [0, 35, -596]],
      ['wasser2', [0, 35.5, -633]],
      ['roehreninsel', [0, 36, -710]],
      ['boost', [0, 12, -745]],
      ['boost2', [0, 12, -815]],
      ['boost3', [0, 12, -875]],
      ['platz', [0, 16, -920]],
      ['sieger', [0, 24, -962]],
      ['ziel', [0, 28, -986]],
    ],
  },
};

const PORT = 5045;
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
  // Taktuhr der Piep-Blöcke: im Test nur die Simulationszeit (die Musik-Uhr läuft in Echtzeit, step() nicht)
  if (c.level.beepClock) c.level.beepClock.mode = 'level';
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
      const aliveOf = (kind) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && !e.defeated).length;
      const tint0 = aliveOf('tintling'), turm0 = aliveOf('kanone_turm');
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const tick = (inp) => {
        const q = P();
        if (hold) for (const f of L.players ?? [q]) f.invuln = Math.max(f.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((q.hurtTries ?? 0) > lastHurts) {
          lastHurts = q.hurtTries; mech.hurtList.push(`${q.lastHurt}@${q.pos.x.toFixed(0)},${q.pos.y.toFixed(0)},${q.pos.z.toFixed(0)}`);
          if (!hold) log.push(['TREFFER', q.lastHurt, +q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), +q.vel.y.toFixed(2), q.mode, ...(L.entities.filter((e) => e.kind === q.lastHurt && e.alive).map((e) => [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2), +(e.half?.y ?? 0).toFixed(2)]).sort((a, b) => Math.hypot(a[0] - q.pos.x, a[2] - q.pos.z) - Math.hypot(b[0] - q.pos.x, b[2] - q.pos.z)).slice(0, 2))]);
        }
        if (q.mode === 'ground' && !q.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(q.pos.x - t[0], q.pos.z - t[2]) > 7 || Math.abs(q.pos.y - t[1]) > 2) track.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.state, q.power, q.helmet ?? '-', q.ground?.tag ?? '', L.piep ? [...L.piep.groups.values()].map((g) => g.color[0] + (g.on ? 1 : 0)).join('') : '']);
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
      const pos = () => [+P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)];
      // Fahrblock, auf dem die Figur gerade steht (Mitte halten, solange sie darauf steht)
      let curMover = null, aimToad = null;
      const keepOn = (h, off = null) => {
        const q = P();
        if (!h || q.mode !== 'ground' || q.ground !== h.shape) return {};
        const cx = (h.shape.min[0] + h.shape.max[0]) / 2 + (off?.[0] ?? 0), cz = (h.shape.min[2] + h.shape.max[2]) / 2 + (off?.[1] ?? 0), d = Math.hypot(cx - q.pos.x, cz - q.pos.z);
        return d > 0.15 ? { ...this.stick(cx - q.pos.x, cz - q.pos.z, Math.min(0.6, d)), run: false } : {};
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
        // Nachlauf nach dem Ziel (Feier): Schritte auch außerhalb des Spielzustands
        if (Lg.tail) { for (let i = 0; i < Lg.tail; i++) { c.setInput({}); c.step(1); steps++; } continue; }
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.place) { this.place(Lg.place, { hero: p.hero, settle: 10, power: p.power !== 'none' ? p.power : undefined }); log.push(['gesetzt', ...Lg.place]); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until, P().mode, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
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
        // ================================================ K-1: eigene Beine
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (Ankunft: Fahrt im Skript-Modus)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          const r0 = mech.rides;
          let k = 0;
          for (; k < 900 && mech.rides === r0 && !P().dead; k++) {
            const q = P(); const dx = tx - q.pos.x, dz = tz - q.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: false, jump: !!Lg.jumpIn && k % 40 < 12 });
          }
          settle();
          if (mech.rides > r0) mech.pipes = (mech.pipes ?? 0) + 1;
          log.push(['röhre', `${Lg.pipe}`, mech.rides > r0, k, ...pos()]);
          if (mech.rides === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf einen Fahrblock (mover-Id) springen, sobald er an at [x, z] (bzw. y) steht
        if (Lg.board) {
          const h = ent(Lg.board), pm = h.pm, sh = h.shape;
          const [ax, az] = Lg.at;
          const cx = () => (sh.min[0] + sh.max[0]) / 2, cz = () => (sh.min[2] + sh.max[2]) / 2;
          const ready = () => Math.hypot(pm.pos.x - ax, pm.pos.z - az) < (Lg.tol ?? 0.15) && (Lg.y === undefined || Math.abs(pm.pos.y - Lg.y) < 0.15) && pm.pause > (Lg.pause ?? 0.5);
          let k = 0;
          for (; k < (Lg.max ?? 3000) && !ready() && !P().dead; k++) tick(keepOn(curMover, Lg.edge));
          let n = 0, left = false;
          for (; n < 300 && !P().dead; n++, k++) {
            const q = P();
            if (left && (q.mode === 'ground' || q.mode === 'swim')) break;
            if (q.mode !== 'ground') left = true;
            const foe = Lg.aimAt ? L.entities.find((e) => e.spec?.id === Lg.aimAt && e.alive && !e.removed && !e.defeated) : null;
            const ax2 = foe ? foe.pos.x : cx(), az2 = foe ? foe.pos.z : cz();
            const st = q.mode === 'air' ? this.airSteer(ax2, az2, h.mover.vx, h.mover.vz, 3.6, 8) : this.stick(ax2 - q.pos.x, az2 - q.pos.z, 1);
            tick({ ...st, jump: n < (Lg.jump ?? 22), run: false });
          }
          for (let i = 0; i < (Lg.settle ?? 24) && !P().dead; i++, k++) tick(keepOn(h, Lg.after));
          const ok = P().mode === 'ground' && P().ground === sh;
          curMover = h;
          log.push([Lg.name ?? 'aufgesprungen', Lg.board, ok, k, ...pos()]);
          if (!ok) log.push(['FEHLER: nicht auf dem Fahrblock', Lg.board]);
          continue;
        }
        // ------------------------------------------------ auf dem Fahrblock mittig mitfahren, bis er an until [x, z] bzw. untilY ist
        if (Lg.ride) {
          const h = ent(Lg.ride), pm = h.pm;
          const done = () => (!Lg.stop || Math.hypot(pm.pos.x - Lg.stop[0], pm.pos.z - Lg.stop[1]) < 0.15) && (Lg.untilY === undefined || pm.pos.y >= Lg.untilY - 0.05);
          let k = 0;
          for (; k < (Lg.max ?? 3000) && !done() && !P().dead; k++) tick(keepOn(h, Lg.edge));
          log.push(['mitgefahren', Lg.ride, k, ...pos()]);
          continue;
        }
        // ------------------------------------------------ Piep-Blöcke: auf den Takt warten (beep = Farbe), dann wie ein Wegpunkt-Bein weiter
        //   ohne lead: warten, bis die Farbe fest ist und noch need s bleibt (vom festen Boden); mit lead: springen, wenn die Farbe
        //   noch fehlt und der Wechsel in lead s kommt (Landung nach dem Umschalten)
        if (Lg.beep) {
          const clk = L.beepClock, sys = L.piep;
          const grp = [...sys.groups.values()].find((g) => g.color === Lg.beep);
          const st = () => sys.stateAt(grp, clk.beat);
          const tNext = () => (grp.every - st().k) * 60 / clk.bpm;
          let k = 0;
          const ok = () => (Lg.lead !== undefined ? !st().on && tNext() <= Lg.lead : st().on && tNext() >= (Lg.need ?? 1));
          for (; k < 2400 && !ok() && !P().dead; k++) tick({});
          log.push(['takt', Lg.beep, k, +tNext().toFixed(2), ...pos()]);
          curMover = null;
        }
        // ------------------------------------------------ Feuerring (Id, Puls): warten, bis die Flammen erloschen sind, dann wie ein Wegpunkt-Bein weiter
        if (Lg.ring) {
          const f = L.entities.find((e) => e.spec?.id === Lg.ring);
          let k = 0;
          for (; k < 1200 && f && (f.flameH ?? 0) > 0.05 && !P().dead; k++) tick({});
          for (; k < 1200 && f && (f.flameH ?? 0) <= 0.05 && (f.ring ?? 0) > 1 && !P().dead; k++) tick({});
          log.push(['feuerring', Lg.ring, k, +(f?.ring ?? 0).toFixed(2), ...pos()]);
        }
        // ------------------------------------------------ Topf-Schnappblume tragen und zum Wuschel-Ring (Id-Anfang) blicken, bis er aufgefressen ist
        if (Lg.feed) {
          const [fx, fz] = Lg.face;
          const ring0 = L.entities.filter((e) => e.kind === 'wuschel' && String(e.spec?.id ?? '').startsWith(Lg.feed));
          const left = () => ring0.filter((e) => e.alive && !e.removed && e.state !== 'gone').length;
          let k = 0;
          for (; k < (Lg.max ?? 2400) && left() > 0 && !P().dead; k++) {
            const q = P(), fv = q.facingVec(), dx = fx - q.pos.x, dz = fz - q.pos.z, l = Math.hypot(dx, dz) || 1;
            tick((fv.x * dx + fv.z * dz) / l < 0.99 ? { ...this.stick(dx, dz, 0.12), run: false } : {});
          }
          mech.eaten = ring0.length - left();
          log.push(['gefressen', Lg.feed, mech.eaten, ring0.length, k, !!P().holding]);
          continue;
        }
        // ------------------------------------------------ Zauberkröten (Ids) besiegen: nächsten Auftrittspunkt vorhersehen, hinstellen, draufspringen
        if (Lg.toads) {
          const toads = Lg.toads.map((id) => L.entities.find((e) => e.spec?.id === id)).filter(Boolean);
          const alive = () => toads.filter((t) => !t.defeated && !t.removed && t.state !== 'poof');
          const [mx, mz] = Lg.center;
          // Wege über den Marmorring statt quer über das Bröckelfeld (Innenfeld |dx|, |dz| < ringIn)
          const RI = (Lg.ringIn ?? 7) + 0.45, RC = Lg.ringMid ?? 9.75;
          const inside = (x, z) => Math.abs(x - mx) < RI && Math.abs(z - mz) < RI;
          const crosses = (ax, az, bx, bz) => { for (let t = 0.04; t < 1; t += 0.04) if (inside(ax + (bx - ax) * t, az + (bz - az) * t)) return true; return false; };
          const corners = [[mx - RC, mz + RC], [mx + RC, mz + RC], [mx + RC, mz - RC], [mx - RC, mz - RC]];
          const via = (tx, tz) => {
            const q = P();
            if (!crosses(q.pos.x, q.pos.z, tx, tz)) return [tx, tz];
            let best = null, bd = Infinity;
            for (const [cx, cz] of corners) {
              if (crosses(q.pos.x, q.pos.z, cx, cz)) continue;
              const d = Math.hypot(cx - q.pos.x, cz - q.pos.z) + Math.hypot(tx - cx, tz - cz) + (crosses(cx, cz, tx, tz) ? 12 : 0);
              if (d < bd) { bd = d; best = [cx, cz]; }
            }
            return best ?? [tx, tz];
          };
          let k = 0, jumps = 0;
          for (; k < (Lg.max ?? 12000) && alive().length && !P().dead; k++) {
            const q = P();
            const vis = alive().filter((t) => t.state !== 'hidden' && t.state !== 'vanish').sort((a, b) => Math.hypot(a.pos.x - q.pos.x, a.pos.z - q.pos.z) - Math.hypot(b.pos.x - q.pos.x, b.pos.z - q.pos.z));
            if (q.mode === 'air' && aimToad) { tick({ ...this.airSteer(aimToad.pos.x, aimToad.pos.z, 0, 0, 4, 7), jump: q.vel.y > 0 }); continue; }
            aimToad = null;
            if (vis.length) {
              const t = vis[0], dx = t.pos.x - q.pos.x, dz = t.pos.z - q.pos.z, d = Math.hypot(dx, dz);
              if (d < (Lg.jumpAt ?? 3.2) && q.mode === 'ground' && !crosses(q.pos.x, q.pos.z, t.pos.x, t.pos.z)) { aimToad = t; jumps++; tick({ ...this.stick(dx, dz, 0.6), jump: true, run: false }); continue; }
              const [gx, gz] = via(t.pos.x, t.pos.z);
              tick({ ...this.stick(gx - q.pos.x, gz - q.pos.z, 1), run: d > 3 });
              continue;
            }
            // keine sichtbar: die Kröte, die als Nächste erscheint, an ihrem nächsten Punkt erwarten (2,9 m davor zur Mitte hin)
            const nx = alive().filter((t) => t.state === 'hidden').sort((a, b) => (a.wait - a.stateT) - (b.wait - b.stateT))[0];
            if (!nx) { tick({}); continue; }
            let i = (nx.spot + 1) % nx.spots.length;
            for (let g = 0; g < nx.spots.length; g++) { const s = nx.spots[i]; if (Math.hypot(q.pos.x - s.x, q.pos.z - s.z) >= 2.5 || nx.spots.length === 1) break; i = (i + 1) % nx.spots.length; }
            // Wartepunkt 2,9 m neben dem Auftrittspunkt auf dem Ring: Nord-/Südseite längs X (zur Mitte), West-/Ostseite längs Z
            const s = nx.spots[i], ns = Math.abs(s.z - mz) > (Lg.ringIn ?? 7);
            const wx = ns ? s.x + (s.x > 0.1 ? -2.9 : 2.9) : s.x, wz = ns ? s.z : s.z + (s.z <= mz ? 2.9 : -2.9);
            const wd = Math.hypot(wx - q.pos.x, wz - q.pos.z);
            const [gx, gz] = via(wx, wz), gd = Math.hypot(gx - q.pos.x, gz - q.pos.z);
            tick(wd > 0.3 ? { ...this.stick(gx - q.pos.x, gz - q.pos.z, Math.min(1, Math.max(0.3, gd / 1.5))), run: wd > 3 } : {});
          }
          for (let i = 0; i < 30; i++) tick({});
          mech.toads = toads.length - alive().length;
          log.push(['zauberkröten', mech.toads, jumps, k, ...pos()]);
          if (alive().length) log.push(['FEHLER: Zauberkröten übrig', alive().map((t) => t.spec?.id).join(',')]);
          continue;
        }
        // ------------------------------------------------ Federplattform: draufspringen, im Abprall Sprung halten und zum Ziel lenken
        if (Lg.spring) {
          const [fx, fz] = Lg.spring, [tx, tz] = Lg.to;
          let k = 0, bounced = false;
          for (; k < 600 && !P().dead; k++) {
            const q = P();
            if (bounced && q.mode === 'ground') break;
            if (q.vel.y > 12) bounced = true;
            const st = q.mode === 'air' ? (bounced && q.pos.y > (Lg.steerY ?? -99) ? this.airSteer(tx, tz, 0, 0, 2.6, 7) : this.airSteer(fx, fz, 0, 0, 4, 6)) : this.stick(fx - q.pos.x, fz - q.pos.z, 1);
            tick({ ...st, jump: q.mode === 'ground' ? !bounced : true, run: false });
          }
          log.push(['feder', bounced, k, ...pos()]);
          if (Lg.top !== undefined && P().pos.y < Lg.top - 0.2) log.push(['FEHLER: Federsprung zu kurz', +P().pos.y.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wandsprung-Kette zwischen zwei Wänden (dir ±1 = erste Wand), bis Höhe until, dann zu then
        if (Lg.wallclimb) {
          const w = Lg.wallclimb;
          let dir = w.dir, last = false, phase = 'in', top = false, n = 0;
          const zfix = () => (w.z === undefined ? 0 : Math.max(-1, Math.min(1, ((w.z - P().pos.z) * 3 - P().vel.z) * 0.5)));
          for (; n < (w.max ?? 1500) && !P().dead; n++) {
            const q = P();
            if (phase === 'in') {
              const j = q.mode === 'ground' ? (n % 36) < 20 : q.vel.y > 0;
              tick({ ...this.stick(dir, zfix(), 1), jump: j, run: false });
              last = j;
              if (P().mode === 'wall') phase = 'chain';
            } else if (q.mode === 'wall' && !top) {
              if (last) { tick({ x: 0, y: 0, jump: false }); last = false; }
              else { tick({ x: 0, y: 0, jump: true }); last = true; if (P().mode !== 'wall') dir = -dir; }
            } else {
              top = top || q.pos.y >= w.until;
              let inp = this.stick(dir, zfix(), 1);
              if (top && w.then) {
                const vx = (w.then[0] - q.pos.x) * 2.5 - q.vel.x, vz = (w.then[1] - q.pos.z) * 2.5 - q.vel.z;
                inp = Math.hypot(vx, vz) < 0.3 ? { x: 0, y: 0 } : this.stick(vx, vz, 1);
              } else if (top) inp = { x: 0, y: 0 };
              tick({ ...inp, jump: !top, run: false });
              last = !top;
              if (P().mode === 'ground' && phase === 'chain') break;
            }
          }
          log.push(['wandsprung', top, n, ...pos()]);
          if (w.top !== undefined && P().pos.y < w.top - 0.2) log.push(['FEHLER: Wandsprung zu kurz', +P().pos.y.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Hörner-Ameise an der Wand besteigen (steigend, Fuß in fy), mitfahren bis top, dann absteigen zu off
        if (Lg.ant) {
          const ants = () => L.entities.filter((e) => e.kind === Lg.ant && e.alive && !e.removed && !e.defeated && e.boxId !== null);
          const [wx, wz] = Lg.stand;
          const settleAt = () => { goTo(wx, wz, 0.12, 0.5); for (let i = 0; i < 90 && P().hSpeed() > 0.05; i++) tick({}); };
          settleAt();
          let on = null, k = 0, tries = 0;
          for (; k < (Lg.max ?? 6000) && !on && !P().dead; k++) {
            const q = P();
            const a = ants().find((e) => e.onWall && (e.mover?.vy ?? 0) > 0.2 && e.foot.y > Lg.fy[0] && e.foot.y < Lg.fy[1] && Math.abs((e.box.min.x + e.box.max.x) / 2 - q.pos.x) < (Lg.reach ?? 1.2));
            if (!a) { tick({}); continue; }
            tries++;
            let j = 0, left = false;
            for (; j < 220; j++, k++) {
              const cx = (a.box.min.x + a.box.max.x) / 2, cz = (a.box.min.z + a.box.max.z) / 2;
              // erst über den Rücken lenken, wenn die Füße über dem Reit-Quader sind (sonst streift man das Horn)
              const above = P().pos.y > a.box.max.y + (Lg.clear ?? 0.3);
              const st = P().mode === 'air' ? (above ? this.airSteer(cx, cz, a.mover?.vx ?? 0, a.mover?.vz ?? 0, 4, 6) : this.airSteer(wx, wz, 0, 0, 4, 2)) : { x: 0, y: 0 };
              tick({ ...st, jump: j < (Lg.hold ?? 30), run: false });
              if (P().mode === 'air') left = true;
              if (a.riding(P())) { on = a; break; }
              if (left && P().mode === 'ground') break;
            }
            log.push(['ameise', a.spec?.id ?? '?', !!on, j, +a.foot.y.toFixed(2), ...pos()]);
            if (!on) { if (tries > 8) break; settleAt(); }
          }
          if (!on) { log.push(['FEHLER: Ameise nicht bestiegen']); break; }
          let r = 0;
          const onAnt = () => String(P().ground?.tag ?? '').startsWith('ameisensoldat');
          for (; r < 3000 && !P().dead; r++) {
            if (P().pos.y > Lg.top - 0.3 && P().mode === 'ground') break;
            if (!onAnt() && P().mode === 'ground') { log.push(['FEHLER: von der Ameise gefallen', r, P().ground?.tag ?? '-']); break; }
            const g = P().ground, q = P();
            const cx = g?.min ? (g.min[0] + g.max[0]) / 2 : q.pos.x, cz = g?.min ? (g.min[2] + g.max[2]) / 2 : q.pos.z, d = Math.hypot(cx - q.pos.x, cz - q.pos.z);
            tick(d > 0.06 && onAnt() ? { ...this.stick(cx - q.pos.x, cz - q.pos.z, Math.min(0.5, d * 2)), run: false } : {});
          }
          mech.antRides = (mech.antRides ?? 0) + 1;
          log.push(['ameise oben', r, ...pos()]);
          continue;
        }
        // ------------------------------------------------ Rankenschnapper (Id): warten, bis er ausgewachsen ist (noch hold s), auf seinen Körper springen
        if (Lg.vine) {
          const v = L.entities.find((e) => e.spec?.id === Lg.vine);
          const [tx, tz] = Lg.to;
          const T = v.times, holdEnd = T.wait + T.out + T.hold;
          const left = () => (v.t >= T.wait + T.out && v.t < holdEnd ? holdEnd - v.t : v.t < T.wait + T.out ? -1 : -1);
          let k = 0;
          for (; k < 2400 && !(v.grow > 0.98 && left() > (Lg.need ?? 1.4)) && !P().dead; k++) tick({});
          let n = 0, air = false;
          for (; n < 300 && !P().dead; n++, k++) {
            const q = P();
            if (air && q.mode === 'ground') break;
            if (q.mode !== 'ground') air = true;
            const rising = q.vel.y > (Lg.steerAt ?? 99);
            tick({ ...(q.mode === 'air' ? (rising ? { x: 0, y: 0 } : this.airSteer(tx, tz, 0, 0, 4, 6)) : this.stick(tx - q.pos.x, tz - q.pos.z, 0.4)), jump: n < (Lg.jump ?? 30), run: false });
          }
          for (let i = 0; i < 6; i++) tick({});
          const ok = P().mode === 'ground' && P().ground?.tag === 'ranke';
          log.push(['ranke', Lg.vine, ok, k, ...pos()]);
          if (!ok && !Lg.soft) log.push(['FEHLER: nicht auf der Ranke', Lg.vine, P().ground?.tag ?? '-']);
          continue;
        }
        // ------------------------------------------------ blauer Stachelbalken (Id) im Wasserwürfel: vor ihm schweben (at), warten, bis er an einem
        //   Ende hält, dann durch die freie Lücke (oben bzw. unten) hindurch nach past schwimmen
        if (Lg.bar) {
          const h = ent(Lg.bar), mb = h.mb;
          const [ax, az] = Lg.at, [bx, bz] = Lg.past, [lo, hi] = Lg.ys;   // ys: [y unten, y oben] des Balkens an den Enden
          const swimTo = (tx, ty, tz, n0 = 600) => {
            let n = 0;
            for (; n < n0 && !P().dead; n++) {
              const q = P(); const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz), dy = ty - q.pos.y;
              if (d < 0.45 && Math.abs(dy) < 0.4) break;
              tick({ ...(d > 0.12 ? this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.2))) : {}), crouch: q.mode === 'swim' && dy < -0.25, jump: q.mode === 'swim' && dy > 0.35 && (n % 16) < 6 });
            }
            return n;
          };
          let k = swimTo(ax, Lg.wy ?? (lo + hi) / 2 + 1, az);
          let gapY = null;
          for (let n = 0; n < 2400 && !P().dead; n++, k++) {
            const st = h.state, y = mb.pos.y;
            if (st === 'wartet' && Math.abs(y - lo) < 0.1) { gapY = Lg.gapHi; break; }
            if (st === 'wartet' && Math.abs(y - hi) < 0.1) { gapY = Lg.gapLo; break; }
            const q = P(); const dy = (Lg.wy ?? (lo + hi) / 2 + 1) - q.pos.y;
            tick({ crouch: dy < -0.25, jump: dy > 0.35 && (n % 16) < 6 });
          }
          k += swimTo(ax, gapY, az, 300);
          k += swimTo(bx, gapY, bz, 600);
          log.push(['balken', Lg.bar, gapY, k, P().mode, ...pos()]);
          continue;
        }
        // ------------------------------------------------ Schwimmen im Wasserwürfel: Punkte [x, y, z] (y null = egal); am Ende optional Aussprung
        if (Lg.swimTo) {
          let k = 0;
          for (const [px, py, pz] of Lg.swimTo) {
            for (let n = 0; n < 1200 && !P().dead; n++, k++) {
              const q = P();
              const dx = px - q.pos.x, dz = pz - q.pos.z, d = Math.hypot(dx, dz), dy = py === null ? 0 : py - q.pos.y;
              if (d < (Lg.within ?? 0.7) && Math.abs(dy) < 0.5) break;
              const sw = q.mode === 'swim';
              tick({ ...(d > 0.15 ? this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5))) : {}), crouch: sw && dy < -0.3, jump: sw ? dy > 0.4 && (n % 20) < 6 : q.mode === 'ground' && n < 2 });
            }
          }
          log.push(['tauchen', Lg.swimTo.length, k, P().mode, ...pos()]);
          continue;
        }

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
                tick({ ...(ok ? {} : this.stick(ddx, ddz, 0.12)), crouch: dy < -0.15, jump: dy > 0.15 });
              }
              for (let s = 0; s < (opt.shots ?? 0); s++) { for (let w = 0; w < 30; w++) { const dy = py - P().pos.y; tick({ crouch: dy < -0.12, jump: dy > 0.12, action: w === 0 }); } mech.shots++; }
            }
          }
          log.push(['tauchen', Lg.swim.length, k, P().mode, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
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
        if (!Lg.to) continue;
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
          const highEnough = Lg.y === undefined || q.pos.y > Lg.y - 0.3;
          const doneL = dist < within && highEnough && (!holdJ || Lg.land === false || (landed && (q.mode === 'ground' || q.mode === 'swim')));
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
          const swimJ = q.mode === 'swim' && Lg.swimJump !== false && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (P().mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      const q = P();
      mech.hurts = (L.players ?? [q]).reduce((a, f) => a + (f.hurtTries ?? 0), 0);
      { const fe = L.named.get('siegesfeier'); if (fe) mech.feier = { fired: fe.fired, bursts: fe.bursts, confetti: fe.confetti }; }
      // Trefferversuche je Quelle (Art@gerundeter Ort), zusammengefasst
      mech.hurtBy = {};
      for (const h of mech.hurtList) { const k = h.replace(/,(-?\d+),(-?\d+)$/, (m, y, z) => `,${Math.round(+z / 10) * 10}`); mech.hurtBy[k] = (mech.hurtBy[k] ?? 0) + 1; }
      mech.lives = L.runtime.save?.lives;
      mech.keys = L.keys?.tor?.n ?? 0;
      mech.tintlinge = tint0 - aliveOf('tintling');
      mech.tuerme = turm0 - aliveOf('kanone_turm');
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
  window.__ka = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__ka[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}ka_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__ka.detail());
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
    // Abschlussprüfung: kein Kontrollpunkt, keine Power-ups (nur Bitcoins und Extraleben), vier Warp-Boxen, Piep-Takt der Levelmusik
    const rules = await sc(() => {
      const L = window.__course.level, d = L.data;
      const pow = d.blocks.map((b) => b.content).filter((c) => c !== undefined && !/^coins?(:\d+)?$/.test(String(c)) && c !== 'oneup');
      const items = d.items.filter((i) => i.kind === 'powerup' && i.power !== 'oneup').length + L.entities.filter((e) => e.kind === 'checkpoint' || e.kind === 'powerup').length;
      return { cp: d.checkpoint ?? null, pow, items, warps: L.entities.filter((e) => e.kind === 'warpbox').length, beep: L.beepClock?.theme, every: [...(L.piep?.groups.values() ?? [])].map((g) => g.every) };
    });
    check(`${id}: kein Kontrollpunkt, keine Power-ups, vier Warp-Boxen (${JSON.stringify({ ...rules, every: undefined })})`, rules.cp === null && rules.pow.length === 0 && rules.items === 0 && rules.warps === 4);
    check(`${id}: Piep-Blöcke im Takt der Levelmusik course_champion, Wechsel alle 4 Zählzeiten (doppeltes Tempo)`, rules.beep === 'course_champion' && rules.every.length > 0 && rules.every.every((e) => e === 4));
    // wie im Spiel: Musik-Uhr (manuell im Gleichschritt mit der Simulation) – die Taktuhr folgt der Musik, Wechsel auf Taktanfängen
    const sync = await sc(() => {
      const c = window.__course, L = c.level, m = window.__audio?.music, clk = L.beepClock;
      if (!m || !clk) return null;
      m.setManualClock(true); m.stop(); m.play('course_champion');
      clk.mode = 'auto';
      const g = [...L.piep.groups.values()].find((x) => x.color === 'rot');
      let switches = 0, onBar = 0, prev = g.on;
      for (let i = 0; i < 1200; i++) {
        m.advanceClock(1 / 120); c.step(1);
        if (g.on !== prev) { switches++; prev = g.on; const b = m.beat().beat; if (Math.abs(b - Math.round(b / 4) * 4) < 0.08) onBar++; }
      }
      const out = { source: clk.source, bpm: clk.bpm, switches, onBar };
      m.stop(); m.setManualClock(false); clk.mode = 'level';
      return out;
    });
    check(`${id}: Taktuhr folgt der Musik (10 s: ${JSON.stringify(sync)})`, !!sync && sync.source === 'music' && sync.bpm === 150 && sync.switches >= 5 && sync.onBar === sync.switches);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    // SEC=<Name> fährt nur den Abschnitt ab dem Bein mit sec: Name (bis zum nächsten sec-Bein; Name+ = bis zum Ende)
    let legs = R.main, from = R.start;
    if (process.env.SEC) {
      const nm = process.env.SEC.replace('+', ''), i0 = legs.findIndex((l) => l.sec === nm);
      let i1 = process.env.SEC.endsWith('+') ? legs.length : legs.findIndex((l, k) => k > i0 && l.sec);
      if (i1 < 0) i1 = legs.length;
      from = legs[i0].from; legs = legs.slice(i0, i1);
    }
    await W('place', from, { hero, settle: 2 });
    const res = await W('drive', legs, process.env.VULN ? { invuln: false } : {});
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
    // der Kurs ist ≈ 1 km lang: Messpunkte mindestens SWEEP_STEP m (Standard 12) auseinander bzw. bei Höhenwechsel
    const STEP = Number(process.env.SWEEP_STEP ?? 12), pts = [];
    for (const pt of sweepTrack) { const l = pts[pts.length - 1]; if (!l || Math.hypot(pt[0] - l[0], pt[2] - l[2]) >= STEP || Math.abs(pt[1] - l[1]) > 3) pts.push(pt); }
    for (const pt of pts) {
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
