// Kurs-Themen Welt 8 „Brummbär-Rummelplatz“ (Level 8-1 … 8-Burg, Abspann, Karte) – eigene Kompositionen im Stil des
// 90er-Eurodance (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md) geschrieben, Maßstab Welt 1 und Welt 7: jedes Thema ist ein Lied
// in Dur oder Moll – Intro (Hook auf einer Farb-Stimme) → Strophe (tiefer, ruhiger) → Refrain (höher, zweitaktige Hook
// A B A' B' …) → Überleitung (Breakdown, lange Töne, Riser) –, Eurodance-Akkordfolgen, der Lead-Synth trägt die Melodie
// fast durchgehend, Off-Beat-Stabs, Piano, Pad, Oktav-Bass, Four-on-the-floor. Das Finale ist länger (32 Takte, zweiter
// Refrain), der Abspann noch länger (40 Takte) und spielt einmal mit einem richtigen Schluss (`loop: false`). Die
// Welt-Farbe kommt nur aus dem Klang.
//
// Hook-Profile (tests/audio.mjs vergleicht sie mit allen Themen der Welten 1–8 und der Halloween-Welt – Einsatz +
// Intervall und Kontur ohne Rhythmus):
//   Regen-Festung    Donner-Ruf: punktierter Ton mit Wiederholung, Quintsprung hinauf, dann rieseln vier Sechzehntel
//                    wie Regentropfen um den Ton herab („CIS . cis GIS fis-e-dis-e cis h“)
//   Dünen-Abfahrt    Dünen-Schwung: der Dreiklang rutscht in Sechzehnteln hinab, Luft holen, dann in Achteln wieder
//                    hinauf („E' cis-a E A . cis h a“)
//   Keks-Fabrik      Spieluhr-Hüpfer: Ton, Nachschlag mit oberer Nebennote („A . a-b A“), dann der gebrochene Dreiklang
//                    hinab und wieder hinauf
//   Baron-Express    Kolben-Stoß: vier Sechzehntel auf einem Ton (der Dampf), Dreiklang hinauf, in langen Schritten zurück
//   Leuchtsteg       Leucht-Stufen: drei kurze Tritte den Dreiklang hinauf (jeder Tritt leuchtet), oben ein langer
//                    Leuchtton, dann sachte zwei Stufen hinab
//   Wasserfestung    Wellengang: langer Ton, zwei Sechzehntel-Seufzer, tief Luft holen, in Achteln zurück hinauf
//   Spukhaus         Kicher-Geist: „hi-hi-hi“ (Ton, Nachschlag mit Nebennote, Ton), dann auf Zehenspitzen hinab und
//                    eine kleine Drehung
//   Lava-Inferno     Felsklotz-Rollen: „da-da-DUM da-da-DUM“ – der Dreiklang rollt zweimal hinauf, dann in Achteln weiter
//   Großer Turm      Heldenruf für Lotti und Greta: der Dreiklang springt zum langen Gipfelton, die Antwort fällt in
//                    langen Schritten; darunter spielt die Kirchenorgel das Baron-Brummbär-Motiv als Gegenstimme
//   Abspann          Danke-Seufzer: drei Stufen hinab, eine Quarte tiefer Luft holen, in Achteln zurück hinauf – als
//                    Sequenz über I–V–vi–IV
//   Karte            Karussell: punktierte „Ka-rus-sell“-Schwünge um den Ton, ein Sprung, ein langer Ton
// Beim Komponieren aufgefallen und ersetzt: Sprünge über eine Sexte an den Taktgrenzen (Dünen-Intro, Express-Strophe,
// Inferno-Refrain und -Strophe) – die Takte beginnen jetzt dort, wo der vorige endet.
//
// Welt-Farbe nur über Klang: Regen-Tropfen (Sinus-Plinks), Regenrauschen (Schellen), Donner (abwärts gleitender Riser
// mit Rauschen, tiefe Toms) und Festungshörner (Regen-Festung); Wüstenflöte, Kanun-Zupfer, Darbuka und Schellen,
// Sandwehen, Energie-Ebene beim Reiten (Dünen); Spieluhr und Glockenspiel, Fabrik-Klappern (Holzblock, Zahnrad-Ticken),
// Förderband-Zupfer (Keks-Fabrik); Dampfstöße (Schellen „tsch-tsch“), Schienenstöße (Ticken), Dampfpfeife und Zugglocke
// (Baron-Express); glitzernde Sechzehntel-Arpeggien, Glas-Glocken, Leucht-Pings und Stampfstein-Schläge (Leuchtsteg);
// Tiefpass auf Piano/Pad/Stabs/Orgel, Blubbern, Wasserglocken und Sonar-Ping, Energie-Ebene beim Reiten (Wasserfestung);
// Geisterbahn-Orgel, Celesta, Geister-„Huuu“, Klopfen und Uhr-Ticken (Spukhaus); Kristall-Glocken, Hoover-Riser, Grollen
// und Stampfen (Lava-Inferno); Kirchenorgel, Chor-Pad, Chor-Stimme, Pauken, Turmglocke, Krallen-Kratzen (Großer Turm);
// Spieluhr, Flöte und Zitate aus Welt 1 (Abspann); Drehorgel im „Umpa-pa“, Karussell-Glöckchen und Schellen (Karte).

import {
  dr, K4, KH, CL, CL4, HH, H8, H8O, HOF, CR, rest, tr, octaves, chordBar, bassBar, padBar, pat, voicing,
  B_BOUNCE, B_PUMP, B_GALLOP, B_DRIVE, B_HALF, form, bySection, groove,
} from './themeParts.js';

const SYNTH = { sub: false, bend: 0.985, detune: 10 };  // Lead-Synth (siehe Welt 2)
const OFF = '..x_ ..x_ ..x_ ..x_';
const P332 = 'x__x __x_ x__x __x_';
const ST24 = '.... ..x_ .... ..x_';
const LONG = 'x_______ x_______';
const SONG = form({ intro: 4, verse: 8, chorus: 8, bridge: 4 });
const tones = (c, lo) => voicing(c, lo).split('+');
const BREAK_BASS = (c, i) => bassBar(c, i < 3 ? B_HALF : 'L_H_ L_H_ ____ ____');
const FILL_S = [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')]; // Wirbel in den Loop
/** Refrain aus vier Hook-Takten: A B C D A B + zwei eigene Schluss-Takte. */
const chorusOf = (hook, x, y) => [...hook, hook[0], hook[1], x, y];

// ================================================================ Regen-Festung (8-1) ====
// cis-Moll, 140 BPM, düster-heroisch. Intro cis A E Gis (die Festungshörner spielen die Hook, Donner) | Strophe cis cis A H |
// cis cis fis Gis (i–VI–VII | i–iv–V, Regen) | Refrain cis A E H | cis A fis Gis (i–VI–III–VII | i–VI–iv–V) | Überleitung
// A H cis Gis. Hook „Donner-Ruf“: punktierter Ton mit Wiederholung, Quintsprung, vier Sechzehntel rieseln herab.
const rfProg = ['C#m', 'A', 'E', 'G#', 'C#m', 'C#m', 'A', 'B', 'C#m', 'C#m', 'F#m', 'G#', 'C#m', 'A', 'E', 'B', 'C#m', 'A', 'F#m', 'G#', 'A', 'B', 'C#m', 'G#'];
const rfHook = ['C#5:3 C#5:1 G#5:4 E5:1 F#5:1 E5:1 D#5:1 C#5:2 B4:2', 'A4:3 A4:1 E5:4 C#5:1 D#5:1 C#5:1 B4:1 A4:4',
  'E5:3 E5:1 B5:4 G#5:1 A5:1 G#5:1 F#5:1 E5:4', 'D#5:3 D#5:1 F#5:4 D#5:1 E5:1 D#5:1 C#5:1 B4:4'];
const rfChorus = chorusOf(rfHook, 'F#5:3 F#5:1 C#6:4 A5:1 B5:1 A5:1 G#5:1 F#5:4', 'G#5:3 G#5:1 D#6:4 B#5:1 C#6:1 B#5:1 A5:1 G#5:4');
const rfIntro = [rfHook[0], rfHook[1], rfHook[2], 'D#5:3 D#5:1 G#5:4 F#5:1 E5:1 D#5:1 C#5:1 B#4:4'];   // Takt 4 führt zur Strophe
const rfV = ['G#4:4 G#4:2 C#5:2 B4:2 A4:2 G#4:4', 'E4:4 E4:2 G#4:2 A4:2 B4:2 C#5:4', 'C#5:4 C#5:2 E5:2 D#5:2 C#5:2 A4:4', 'B4:4 B4:2 D#5:2 F#5:2 E5:2 D#5:4'];
const rfVerse = [...rfV, rfV[0], rfV[1], 'A4:4 A4:2 C#5:2 F#5:2 E5:2 C#5:4', 'B#4:4 B#4:2 D#5:2 G#5:2 F#5:2 D#5:4'];
const rfBridge = ['C#5:8 E5:8', 'D#5:8 F#5:8', 'E5:8 G#5:8', 'D#5:8 B#4:8'];
const RAIN_R = ['.0.. ..1. .... 2..0', '...1 .0.. ..2. ....', '..0. ...2 .1.. ..0.', '.2.. 0... ..1. ...2'];
const rain = (c, i) => pat(tones(c, 'C#6'), RAIN_R[i % 4]);                 // Regentropfen (Sinus gleitet leicht abwärts)
const RAINN = dr('j.j. j.j. j.j. j.jj');                                     // Regenrauschen
const THUNDER = dr('t.tt .... .... ....');                                  // Donnerschlag (tiefe Toms)
const RAINFORT = [K4, CL, HH, RAINN];

// ================================================================ Dünen-Abfahrt (8-2, Reiten) ====
// A-Dur, 144 BPM, schwungvoll. Intro A E fis D (die Wüstenflöte spielt die Hook eine Oktave tiefer) | Strophe fis D A E |
// fis D h E (vi–IV–I–V, Kanun-Zupfer, Darbuka) | Refrain A E fis D | A E D E (I–V–vi–IV | I–V–IV–V, Galopp-Bass) |
// Überleitung D E fis E (Sandwehen). Energie-Ebene beim Reiten: Lead eine Oktave höher, Offbeat-Stabs. Hook
// „Dünen-Schwung“: der Dreiklang rutscht in Sechzehnteln hinab, dann in Achteln wieder hinauf.
const dnProg = ['A', 'E', 'F#m', 'D', 'F#m', 'D', 'A', 'E', 'F#m', 'D', 'Bm', 'E', 'A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'E', 'D', 'E', 'F#m', 'E'];
const dnHook = ['E6:2 C#6:1 A5:1 E5:2 A5:2 -:2 C#6:2 B5:2 A5:2', 'B5:2 G#5:1 E5:1 B4:2 E5:2 -:2 G#5:2 F#5:2 E5:2',
  'C#6:2 A5:1 F#5:1 C#5:2 F#5:2 -:2 A5:2 B5:2 C#6:2', 'D6:2 A5:1 F#5:1 D5:2 F#5:2 -:2 A5:2 B5:2 C#6:2'];   // D endet auf cis → zurück zum E
const dnChorus = chorusOf(dnHook, 'A5:2 F#5:1 D5:1 A4:2 D5:2 -:2 F#5:2 A5:2 B5:2', 'B5:2 G#5:1 E5:1 B4:2 E5:2 -:2 G#5:2 B5:2 D6:2');
const dnIntro = dnHook;   // die Flöte spielt die Hook eine Oktave tiefer, endet auf cis → Strophe
const dnV = ['C#5:3 B4:1 A4:2 C#5:2 F#5:4 E5:2 C#5:2', 'D5:3 C#5:1 B4:2 D5:2 F#5:4 E5:2 D5:2', 'C#5:3 B4:1 A4:2 C#5:2 E5:4 D5:2 C#5:2', 'B4:3 A4:1 G#4:2 B4:2 E5:4 -:4'];
const dnVerse = [...dnV, dnV[0], dnV[1], 'D5:3 C#5:1 B4:2 D5:2 F#5:4 D5:2 B4:2', 'G#4:3 A4:1 B4:2 E5:2 G#5:4 B5:4'];
const dnBridge = ['D6:8 A5:8', 'B5:8 G#5:8', 'A5:8 C#6:8', 'B5:8 G#5:8'];
const DARB = dr('d..p ..p. d.d. p...');                                     // Darbuka (Doum-Tek)
const SHAKE = dr('..j. ..j. ..j. .jj.');                                    // Schellenkranz
const DUNE = [K4, CL, H8, DARB];

// ================================================================ Keks-Fabrik (8-3) ====
// F-Dur, 138 BPM, verspielt. Intro F d B C (die Spieluhr spielt die Hook) | Strophe B C a d | B C g C (IV–V–iii–vi | IV–V–
// ii–V, Förderband-Zupfer, Zahnrad-Ticken) | Refrain F d B C | F d g C (I–vi–IV–V | I–vi–ii–V; das Glockenspiel spielt die
// Hook eine Oktave höher mit, Holzblock-Klappern) | Überleitung B C d C. Hook „Spieluhr-Hüpfer“: Ton, Nachschlag mit
// oberer Nebennote, gebrochener Dreiklang hinab und wieder hinauf.
const ckProg = ['F', 'Dm', 'Bb', 'C', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Gm', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'Bb', 'C', 'Dm', 'C'];
const ckHook = ['A5:1 -:1 A5:1 Bb5:1 A5:2 C6:2 A5:2 F5:2 G5:2 E5:2', 'F5:1 -:1 F5:1 G5:1 F5:2 A5:2 F5:2 D5:2 E5:2 F5:2',
  'Bb5:1 -:1 Bb5:1 C6:1 Bb5:2 D6:2 Bb5:2 F5:2 G5:2 A5:2', 'G5:1 -:1 G5:1 A5:1 Bb5:2 G5:2 E5:2 G5:2 C6:4'];
const ckChorus = chorusOf(ckHook, 'G5:1 -:1 G5:1 A5:1 G5:2 Bb5:2 G5:2 D5:2 E5:2 F5:2', 'E5:1 -:1 E5:1 F5:1 G5:2 C6:2 Bb5:2 G5:2 E5:2 C5:2');
const ckIntro = [ckHook[0], ckHook[1], ckHook[2], 'G5:1 -:1 G5:1 A5:1 Bb5:2 G5:2 E5:2 C5:2 E5:2 G5:2'];   // Takt 4 führt zur Strophe
const ckV = ['F5:2 D5:2 F5:2 D5:2 Bb4:4 C5:2 D5:2', 'E5:2 C5:2 E5:2 C5:2 G4:4 A4:2 Bb4:2', 'C5:2 A4:2 C5:2 E5:2 A5:4 G5:2 E5:2', 'F5:2 D5:2 F5:2 A5:2 D5:4 -:4'];
const ckVerse = [...ckV, ckV[0], ckV[1], 'D5:2 Bb4:2 D5:2 G5:2 Bb5:4 A5:2 G5:2', 'E5:2 G5:2 C6:2 Bb5:2 G5:4 E5:2 G5:2'];
const ckBridge = ['D5:8 F5:8', 'E5:8 G5:8', 'F5:8 A5:8', 'G5:8 E5:8'];
const belt = (c) => pat(tones(c, 'F4'), '0.1. 2.1. 0.1. 2.1.');             // Förderband (Zupfer in Achteln)
const CLACK = dr('..p. .p.. ..p. p.p.');                                    // Holzblock-Klappern der Maschinen
const GEAR = dr('x.x. x.x. x.x. x.x.');                                     // Zahnrad-Ticken (Tick – Tack)
const COOKIE = [K4, CL, H8, CLACK];

// ================================================================ Baron-Express (8-Zug) ====
// g-Moll, 146 BPM, treibend. Intro g Es B F (das Piano spielt die Hook in Oktaven, Dampfpfeife) | Strophe g F Es D | g F c D
// (i–VII–VI–V | i–VII–iv–V, Räder im 3-3-2, Schienenstöße) | Refrain g Es B F | g Es c D (i–VI–III–VII | i–VI–iv–V,
// Galopp-Bass, Dampfstöße) | Überleitung Es F g D (Pfeife, Zugglocke). Hook „Kolben-Stoß“: vier Sechzehntel auf einem Ton,
// der Dreiklang hinauf, in langen Schritten zurück.
const bxProg = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Cm', 'D', 'Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D', 'Eb', 'F', 'Gm', 'D'];
const bxHook = ['D5:1 D5:1 D5:1 D5:1 G5:2 Bb5:2 A5:3 G5:1 F5:2 D5:2', 'Eb5:1 Eb5:1 Eb5:1 Eb5:1 G5:2 Bb5:2 G5:3 F5:1 Eb5:2 Bb4:2',
  'F5:1 F5:1 F5:1 F5:1 Bb5:2 D6:2 C6:3 Bb5:1 A5:2 F5:2', 'C5:1 C5:1 C5:1 C5:1 F5:2 A5:2 C6:3 Bb5:1 A5:2 F5:2'];
const bxChorus = chorusOf(bxHook, 'C5:1 C5:1 C5:1 C5:1 Eb5:2 G5:2 C6:3 Bb5:1 G5:2 Eb5:2', 'D5:1 D5:1 D5:1 D5:1 F#5:2 A5:2 D6:3 C6:1 A5:2 F#5:2');
const bxV = ['G4:3 Bb4:3 D5:2 C5:3 Bb4:3 A4:2', 'F4:3 A4:3 C5:2 Bb4:3 A4:3 F4:2', 'G4:3 Bb4:3 Eb5:2 D5:3 C5:3 Bb4:2', 'A4:3 F#4:3 A4:2 D5:3 C5:3 A4:2'];
const bxVerse = [...bxV, bxV[0], bxV[1], 'G4:3 C5:3 Eb5:2 D5:3 C5:3 G4:2', 'F#4:3 A4:3 C5:2 D5:4 -:4'];
const bxBridge = ['G5:8 Bb5:8', 'A5:8 C6:8', 'Bb5:8 D6:8', 'A5:8 F#5:8'];
const PFIFF = 'D6:6 -:2 Bb5:8';                                             // Dampfpfeife (gleitet von unten in den Ton)
const CHUG = dr('j.jj j.jj j.jj j.jj');                                     // Dampfstöße „tsch – tsch-tsch“
const RAILS = dr('x... ...x x... ....');                                    // Schienenstöße „ta – tam“
const EXPRESS = [K4, CL, H8, CHUG, RAILS];

// ================================================================ Leuchtsteg (8-4, Nacht-Festung) ====
// e-Moll, 136 BPM, geheimnisvoll. Intro e a D G (die Glas-Glocken spielen die Hook) | Strophe e e C D | e e a H (i–VI–VII |
// i–iv–V, Stampfstein-Schläge, Leucht-Pings) | Refrain e a D G | e a C H (i–iv–VII–III | i–iv–VI–V) | Überleitung C D e H.
// Glitzernde Sechzehntel-Arpeggien. Hook „Leucht-Stufen“: drei kurze Tritte den Dreiklang hinauf, ein langer Leuchtton,
// dann sachte hinab.
const flProg = ['Em', 'Am', 'D', 'G', 'Em', 'Em', 'C', 'D', 'Em', 'Em', 'Am', 'B', 'Em', 'Am', 'D', 'G', 'Em', 'Am', 'C', 'B', 'C', 'D', 'Em', 'B'];
const flHook = ['B4:1 -:1 E5:1 -:1 G5:1 -:1 B5:4 A5:1 G5:1 F#5:2 E5:2', 'C5:1 -:1 E5:1 -:1 A5:1 -:1 C6:4 B5:1 A5:1 E5:2 C5:2',
  'D5:1 -:1 F#5:1 -:1 A5:1 -:1 D6:4 C6:1 B5:1 A5:2 F#5:2', 'G5:1 -:1 B5:1 -:1 D6:1 -:1 B5:4 A5:1 G5:1 F#5:2 D5:2'];
const flChorus = chorusOf(flHook, 'E5:1 -:1 G5:1 -:1 C6:1 -:1 E6:4 D6:1 C6:1 B5:2 G5:2', 'D#5:1 -:1 F#5:1 -:1 B5:1 -:1 A5:4 G5:1 F#5:1 D#5:2 B4:2');
const flV = ['E5:2 -:2 G5:2 F#5:2 E5:4 B4:4', 'E5:2 -:2 G5:2 A5:2 B5:4 G5:4', 'C5:2 -:2 E5:2 D5:2 C5:4 G4:4', 'D5:2 -:2 F#5:2 E5:2 D5:4 A4:4'];
const flVerse = [...flV, flV[0], flV[1], 'A4:2 -:2 C5:2 B4:2 A4:4 E5:4', 'D#5:2 -:2 F#5:2 E5:2 D#5:4 A4:4'];
const flBridge = ['E5:8 G5:8', 'F#5:8 A5:8', 'G5:8 B5:8', 'F#5:8 D#5:8'];
const glitter = (c) => pat(tones(c, 'E5'), '0.12 .0.2 1.20 .1.2');           // glitzernde Arpeggien (Sinus, Echo)
const ping = (c) => pat(tones(c, 'B5'), '.... .... .... ..0.');              // Leucht-Ping am Phrasen-Ende (gleitet hinauf)
const STAMP = dr('d... .... .... ....');                                    // Stampfstein schlägt auf – der Steg leuchtet
const NIGHT = [K4, CL, HOF, STAMP];

// ================================================================ Wasserfestung (8-5, unter Wasser) ====
// f-Moll, 130 BPM, gedämpft und blubbernd. Intro f Des As Es (die Wasserglocken spielen die Hook) | Strophe f f Des Es |
// f f b C (i–VI–VII | i–iv–V, Blubbern, Sonar-Ping) | Refrain f Des As Es | f Des b C (i–VI–III–VII | i–VI–iv–V, Festungs-
// Orgel tief) | Überleitung Des Es f C. Alles hinter Tiefpass, viel Hall. Energie-Ebene beim Reiten (kurzer Pflaume-
// Abschnitt). Hook „Wellengang“: langer Ton, zwei Sechzehntel-Seufzer, tief Luft holen, in Achteln zurück hinauf.
const dgProg = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Fm', 'Db', 'Eb', 'Fm', 'Fm', 'Bbm', 'C', 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Bbm', 'C', 'Db', 'Eb', 'Fm', 'C'];
const dgHook = ['Ab5:6 G5:1 F5:1 C5:4 Eb5:2 F5:2', 'Ab5:6 Bb5:1 Ab5:1 F5:4 Db5:2 F5:2', 'C6:6 Bb5:1 Ab5:1 Eb5:4 F5:2 G5:2', 'Bb5:6 Ab5:1 G5:1 Eb5:4 F5:2 G5:2'];
const dgChorus = chorusOf(dgHook, 'Bb5:6 C6:1 Db6:1 Bb5:4 F5:2 Ab5:2', 'G5:6 Ab5:1 G5:1 E5:4 G5:2 C6:2');
const dgV = ['C5:2 Ab4:2 F4:2 Ab4:2 C5:4 Db5:2 C5:2', 'F5:2 C5:2 Ab4:2 C5:2 F5:4 G5:2 Ab5:2', 'F5:2 Db5:2 Ab4:2 Db5:2 F5:4 Eb5:2 Db5:2', 'Eb5:2 Bb4:2 G4:2 Bb4:2 Eb5:4 F5:2 G5:2'];
const dgVerse = [...dgV, dgV[0], dgV[1], 'F5:2 Db5:2 Bb4:2 Db5:2 F5:4 Eb5:2 Db5:2', 'C5:2 E5:2 G5:2 Bb5:2 C6:4 -:4'];
const dgBridge = ['F5:8 Ab5:8', 'G5:8 Bb5:8', 'Ab5:8 C6:8', 'G5:8 E5:8'];
const bubble = (c) => pat(tones(c, 'F4'), '.0.. 1.2. .... 0..1');            // Blubbern (Sinus gleitet aufwärts)
const pearl = (c) => pat(tones(c, 'Ab4'), '..0. ..1. ..2. ..1.');            // Perlen auf der „und“
const SONAR = (c, i) => (i % 4 === 0 ? 'F6:2 -:14' : '-:16');                // Sonar-Ping alle vier Takte (hallt nach)
const SURGE = dr('.... ..d. .... d...');                                    // dumpfer Wellenschlag
const DUNGEON = [K4, CL, HOF, SURGE];

// ================================================================ Spukhaus (8-6) ====
// a-Moll, 132 BPM, gruselig-lustig. Intro a d G C (die Celesta spielt die Hook) | Strophe a a F E | a a d E (i–VI–V |
// i–iv–V, Pizzicato-Bass, Klopfen, Uhr-Ticken) | Refrain a d G C | a d E a (i–iv–VII–III | i–iv–V–i, Geisterbahn-Orgel auf der
// „und“, Celesta eine Oktave höher) | Überleitung F G a E (das Geister-„Huuu“ singt). Hook „Kicher-Geist“: „hi-hi-hi“,
// dann auf Zehenspitzen hinab und eine kleine Drehung.
const bdProg = ['Am', 'Dm', 'G', 'C', 'Am', 'Am', 'F', 'E', 'Am', 'Am', 'Dm', 'E', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'E', 'Am', 'F', 'G', 'Am', 'E'];
const bdHook = ['E5:2 E5:1 F5:1 E5:2 C5:2 A4:2 B4:1 C5:1 D5:2 B4:2', 'F5:2 F5:1 G5:1 F5:2 D5:2 A4:2 B4:1 C5:1 D5:2 F5:2',
  'G5:2 G5:1 A5:1 G5:2 D5:2 B4:2 C5:1 D5:1 B4:2 G4:2', 'E5:2 E5:1 F5:1 G5:2 E5:2 C5:2 D5:1 E5:1 D5:2 C5:2'];
const bdChorus = chorusOf(bdHook, 'G#5:2 G#5:1 A5:1 G#5:2 E5:2 B4:2 C5:1 D5:1 E5:2 D5:2', 'C5:2 C5:1 B4:1 A4:2 E5:2 A5:4 -:4');
const bdV = ['A4:3 A4:1 C5:2 E5:2 D5:3 C5:1 B4:2 C5:2', 'A4:3 A4:1 C5:2 E5:2 A5:4 G5:2 E5:2', 'F5:3 E5:1 D5:2 C5:2 A4:4 C5:2 F5:2', 'E5:3 D5:1 C5:2 B4:2 G#4:4 B4:2 E5:2'];
const bdVerse = [...bdV, bdV[0], bdV[1], 'D5:3 D5:1 F5:2 A5:2 G5:3 F5:1 E5:2 D5:2', 'E5:3 F5:1 E5:2 D5:2 B4:4 D5:2 E5:2'];
const bdBridge = ['A4:8 C5:8', 'B4:8 D5:8', 'C5:8 E5:8', 'D5:8 B4:8'];
const BOO = ['A5:16', 'B5:16', 'C6:16', 'B5:8 G#5:8'];                       // Geister-„Huuu“ (Theremin) in der Überleitung
const KNOCK = dr('.... .... .... .p.p');                                    // Klopf-klopf
const CLOCK = dr('x... x... x... x...');                                    // Standuhr im Spukhaus
const SPOOK = [K4, CL, H8, CLOCK, KNOCK];

// ================================================================ Lava-Inferno (8-7) ====
// d-Moll, 150 BPM, schnell und dramatisch. Intro d B F C (die Kristall-Glocken spielen die Hook) | Strophe d d B C | d d g A
// (i–VI–VII | i–iv–V, Stampfen, Grollen) | Refrain d B F C | d B g A (i–VI–III–VII | i–VI–iv–V, Galopp-Bass, Hoover-Riser
// alle vier Takte) | Überleitung B C d A. Hook „Felsklotz-Rollen“: „da-da-DUM da-da-DUM“, der Dreiklang rollt zweimal
// hinauf, dann in Achteln weiter.
const ifProg = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Bb', 'C', 'Dm', 'A'];
const ifHook = ['D5:1 F5:1 A5:2 D5:1 F5:1 A5:2 G5:2 F5:2 E5:2 F5:2', 'Bb4:1 D5:1 F5:2 Bb4:1 D5:1 F5:2 G5:2 F5:2 D5:2 C5:2',
  'F5:1 A5:1 C6:2 F5:1 A5:1 C6:2 Bb5:2 A5:2 G5:2 F5:2', 'C5:1 E5:1 G5:2 C5:1 E5:1 G5:2 Bb5:2 A5:2 G5:2 E5:2'];
const ifChorus = chorusOf(ifHook, 'G4:1 Bb4:1 D5:2 G4:1 Bb4:1 D5:2 F5:2 E5:2 D5:2 Bb4:2', 'A4:1 C#5:1 E5:2 A4:1 C#5:1 E5:2 G5:2 F5:2 E5:2 C#5:2');
const ifV = ['A4:2 A4:2 D5:2 E5:2 F5:4 E5:2 D5:2', 'A4:2 A4:2 D5:2 E5:2 F5:4 G5:2 A5:2', 'F5:2 F5:2 D5:2 F5:2 Bb5:4 A5:2 F5:2', 'E5:2 E5:2 C5:2 E5:2 G5:4 F5:2 E5:2'];
const ifVerse = [...ifV, ifV[0], ifV[1], 'D5:2 D5:2 Bb4:2 D5:2 G5:4 F5:2 D5:2', 'C#5:2 C#5:2 A4:2 C#5:2 E5:4 G5:2 E5:2'];
const ifBridge = ['D5:8 F5:8', 'E5:8 G5:8', 'F5:8 A5:8', 'E5:8 C#5:8'];
const POUND = dr('d... ..d. d... ....');                                    // Stampfen auf dem Felsklotz
const RUMBLE_T = dr('.... .... .... ..tt');                                 // Grollen der Lava
const INFERNO = [K4, CL, HH, POUND];

// ================================================================ Großer Turm (8-Burg, Finale) ====
// c-Moll, 150 BPM, 32 Takte, das größte Stück. Intro c As B G (die Kirchenorgel spielt das Baron-Brummbär-Motiv aus
// course_boss, Lead Takt 5–8, Note für Note; Pauken, Turmglocke) | Strophe c c As B | c c f G (i–VI–VII | i–iv–V, Galopp,
// Krallen-Kratzen) | Refrain c As B G | c As B G (i–VI–VII–V, die Heldenhook für Lotti und Greta, darunter spielt die Orgel
// das Baron-Motiv eine Oktave tiefer als Gegenstimme) | Überleitung As B f G (Chor-Stimme, Turmglocke, Riser) | zweiter
// Refrain wie der erste, das Glockenspiel singt die Heldenhook eine Oktave höher mit. Chor-Pad in allen Takten.
const FINAL = form({ intro: 4, verse: 8, chorus: 8, bridge: 4, chorus2: 8 });
const fnProg = ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G', 'Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Bb', 'G',
  'Ab', 'Bb', 'Fm', 'G', 'Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Bb', 'G'];
// Baron-Brummbär-Motiv: course_boss, Lead Takt 5–8 (Cm As B G) – Note für Note
const fnBaron = ['C5:2 -:1 C5:1 Eb5:2 C5:2 G5:3 F5:1 Eb5:2 D5:2', 'C5:2 -:1 C5:1 Eb5:2 C5:2 Ab5:3 G5:1 F5:2 Eb5:2',
  'D5:2 -:1 D5:1 F5:2 D5:2 Bb5:3 Ab5:1 G5:2 F5:2', 'G5:3 F5:1 Eb5:2 D5:2 B4:4 -:2 G4:1 B4:1'];
const fnHook = ['C5:2 Eb5:1 G5:1 C6:6 D6:2 Eb6:2 D6:2', 'C6:4 Bb5:2 Ab5:2 Eb5:4 F5:2 G5:2',
  'D5:2 F5:1 Bb5:1 D6:6 C6:2 Bb5:2 D6:2', 'B5:4 C6:2 D6:2 G5:4 F5:2 D5:2'];
const fnChorus = chorusOf(fnHook, 'D5:2 F5:1 Bb5:1 D6:4 Eb6:2 D6:2 C6:2 Bb5:2', 'B5:4 G5:2 F5:2 D5:4 B4:2 D5:2');
const fnV = ['G4:2 G4:1 G4:1 C5:2 D5:2 Eb5:4 D5:2 C5:2', 'G4:2 G4:1 G4:1 C5:2 D5:2 Eb5:4 F5:2 G5:2',
  'Ab5:2 Ab5:1 Ab5:1 G5:2 F5:2 Eb5:4 C5:2 Eb5:2', 'F5:2 F5:1 F5:1 D5:2 Bb4:2 F5:4 Eb5:2 D5:2'];
const fnVerse = [...fnV, fnV[0], fnV[1], 'C5:2 C5:1 C5:1 F5:2 G5:2 Ab5:4 G5:2 F5:2', 'G5:2 G5:1 G5:1 F5:2 D5:2 B4:4 -:4'];
const fnBridge = ['C5:8 Eb5:8', 'D5:8 F5:8', 'C5:8 F5:8', 'D5:8 B4:8'];
const fnChoir = ['Eb5:16', 'F5:16', 'Ab5:16', 'G5:8 B5:8'];                  // Chor-Stimme („Aah“) in der Überleitung
const TOLL = (c, i) => ([0, 12, 20, 24].includes(i) ? 'C3:16' : '-:16');     // Turmglocke vor den großen Abschnitten
const PAUKE8 = dr('t... .... t.t. ....');
const CLAW = dr('..j. .... ..jj ....');                                      // Krallen-Kratzen am Turm
const TOWER8 = [K4, CL, H8, CLAW];

// ================================================================ Abspann ====
// G-Dur, 126 BPM, 40 Takte, kein Loop: warm, fröhlich, nostalgisch. Intro G D e C (die Spieluhr spielt die Hook) |
// Strophe e C G D | e C a D | Refrain G D e C | G D C D (I–V–vi–IV | I–V–IV–V – dieselbe Folge wie course_grass) |
// Erinnerung: das Glockenspiel spielt die Hook von course_grass (Lead Takt 5–8, eine Oktave höher, Welt 1 „Wiesen-Parcours“),
// danach der Lead das Riff von world1 (Lead Takt 5–8, eine Quinte höher von a-Moll nach e-Moll) | zweiter Refrain, das
// Glockenspiel singt eine Oktave höher mit, die Flöte darunter | Schluss e C D G: Trugschluss, dann die Kadenz und ein
// langer G-Dur-Akkord mit Becken – danach Stille. Hook „Danke-Seufzer“ als Sequenz über die Akkordfolge.
const ABSP = form({ intro: 4, verse: 8, chorus: 8, memory: 8, chorus2: 8, ending: 4 });
const abProg = ['G', 'D', 'Em', 'C', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D', 'G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D',
  'G', 'D', 'Em', 'C', 'Em', 'Em', 'C', 'D', 'G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'Em', 'C', 'D', 'G'];
const abHook = ['B5:3 A5:1 G5:2 D5:2 -:2 G5:2 A5:2 B5:2', 'A5:3 G5:1 F#5:2 D5:2 -:2 F#5:2 G5:2 A5:2',
  'G5:3 F#5:1 E5:2 B4:2 -:2 E5:2 F#5:2 G5:2', 'E5:3 F#5:1 G5:2 C6:2 -:2 B5:2 A5:2 G5:2'];
const abChorus = chorusOf(abHook, 'E5:3 D5:1 C5:2 G4:2 -:2 C5:2 D5:2 E5:2', 'F#5:4 G5:2 A5:2 D6:4 C6:2 A5:2');
const abIntro = [abHook[0], abHook[1], abHook[2], 'E5:3 F#5:1 G5:2 C6:2 -:2 B5:2 A5:2 F#5:2'];   // Takt 4 führt zur Strophe
const abV = ['B4:2 B4:2 E5:2 G5:2 F#5:4 E5:2 B4:2', 'C5:2 C5:2 E5:2 G5:2 A5:4 G5:2 E5:2', 'B4:2 B4:2 D5:2 G5:2 F#5:4 D5:2 B4:2', 'A4:2 A4:2 D5:2 F#5:2 E5:4 D5:2 A4:2'];
const abVerse = [...abV, abV[0], abV[1], 'C5:2 C5:2 E5:2 A5:2 G5:4 E5:2 C5:2', 'A4:2 C5:2 D5:2 F#5:2 A5:4 -:4'];
// Zitate aus Welt 1 (eigene Kompositionen des Projekts): course_grass Lead Takt 5–8 (G D e C) eine Oktave höher …
const abGrass = tr(['G4:2 B4:1 D5:1 -:1 D5:2 E5:1 D5:2 B4:2 A4:2 G4:2', 'F#4:2 -:1 A4:1 D5:3 C#5:1 -:2 A4:2 F#4:1 -:1 A4:2',
  'G4:2 B4:1 E5:1 -:1 E5:2 F#5:1 E5:2 D5:2 B4:2 G4:2', 'E5:3 D5:1 -:2 C5:2 B4:2 -:2 G4:1 A4:1 B4:2'], 12);
// … und das Riff von world1, Lead Takt 5–8 (a a F G), eine Quinte höher (e e C D)
const abWorld1 = tr(['A4:2 A4:1 -:1 C5:2 E5:2 -:1 D5:1 C5:2 A4:2 G4:2', 'A4:2 -:2 E5:2 D5:2 C5:3 A4:1 -:2 G4:1 A4:1',
  'A4:2 A4:1 -:1 C5:2 F5:2 -:1 E5:1 C5:2 A4:2 F4:2', 'G4:2 -:2 D5:2 B4:2 G4:3 -:1 B4:2 D5:2'], 7);
const abEnding = ['B5:3 A5:1 G5:2 E5:2 -:2 G5:2 A5:2 B5:2', 'C6:3 B5:1 A5:2 E5:2 -:2 G5:2 A5:2 C6:2', 'B5:4 A5:4 F#5:4 A5:4', 'G5:12 -:4'];
const abFlute = ['D5:8 B4:8', 'D5:8 A4:8', 'B4:8 G4:8', 'C5:8 E5:8', 'D5:8 B4:8', 'D5:8 A4:8', 'C5:8 G4:8', 'A4:8 F#4:8'];   // Flöte im zweiten Refrain
const ABS = [K4, CL, H8O];

// ================================================================ Karte Welt 8 ====
// Es-Dur, 128 BPM, 16 Takte, Rummelplatz. Strophe Es c As B | Es c f B (I–vi–IV–V | I–vi–ii–V): die Drehorgel singt im
// Walzer-Schwung (lang – kurz – kurz), Bass auf der Eins, Piano-Akkorde auf 2 und 3 („Umpa-pa“) | Refrain As B g c |
// As B Es Es (IV–V–iii–vi | IV–V–I): der Lead singt die Karussell-Hook, die Drehorgel macht „pa-pa“, Karussell-Glöckchen.
// Four-on-the-floor (weich), Schellen, Clap auf 2 und 4. Hook „Karussell“: punktierte Schwünge um den Ton, Sprung, langer Ton.
const m8Prog = ['Eb', 'Cm', 'Ab', 'Bb', 'Eb', 'Cm', 'Fm', 'Bb', 'Ab', 'Bb', 'Gm', 'Cm', 'Ab', 'Bb', 'Eb', 'Eb'];
const m8Organ = ['Eb5:4 F5:2 G5:2 Bb5:6 G5:2', 'G5:4 F5:2 Eb5:2 C5:6 Eb5:2', 'F5:4 G5:2 Ab5:2 C6:6 Ab5:2', 'G5:4 F5:2 Eb5:2 D5:4 F5:4',
  'Eb5:4 F5:2 G5:2 Bb5:6 G5:2', 'G5:4 Ab5:2 G5:2 Eb5:6 C5:2', 'F5:4 Ab5:2 G5:2 F5:6 Ab5:2', 'G5:4 F5:2 Eb5:2 D5:4 F5:4'];
const m8Hook = ['Ab5:3 G5:1 Ab5:2 C6:3 Bb5:1 Ab5:2 Eb5:4', 'F5:3 Eb5:1 F5:2 Bb5:3 Ab5:1 G5:2 D5:4',
  'G5:3 F5:1 G5:2 D6:3 C6:1 Bb5:2 G5:4', 'Eb5:3 D5:1 Eb5:2 G5:3 F5:1 Eb5:2 C5:4'];
const m8Lead = [...m8Hook, m8Hook[0], m8Hook[1], 'G5:3 F5:1 G5:2 Bb5:3 Ab5:1 G5:2 Eb5:4', 'Bb4:4 Eb5:2 G5:2 Eb5:8'];
const chime = (c) => pat(tones(c, 'Bb5'), '.... .... .... 2.1.');            // Karussell-Glöckchen am Phrasen-Ende
const W8MAP = [K4, CL, H8O, dr('..j. ..j. ..j. ..j.')];

export const WORLD8_THEMES = {
  // Regen-Festung (8-1, Stachelbrücken im Takt, Feuer-Werfer, Knochenflieger): 140 BPM, cis-Moll, 24 Takte, düster-
  // heroisch. Intro (cis A E Gis): Donnerschlag, die Festungshörner spielen die Hook, Regentropfen | Strophe (cis cis A H |
  // cis cis fis Gis): Lead tief, Regen und Regenrauschen | Refrain (cis A E H | cis A fis Gis): Donner-Ruf, Hörner-Akkorde,
  // Piano auf der „und“, Stabs, treibender Bass | Überleitung (A H cis Gis): lange Töne über Hörner-Akkorden, Regen, Donner
  // in den Loop.
  course_rainfort: {
    bpm: 140,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.16 },
      organ: { volume: 0.06, cutoff: 2400, gate: 0.9 },
      echo: { type: 'sine', volume: 0.05, decay: 0.05, glide: 0.85, glideTime: 0.04 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11, cutoff: 5500, cutoffEnd: 1500 },
      pad: { volume: 0.055, bright: 0.8 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08, glide: 0.5, noise: 0.14 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, jingle: { volume: 0.06, off: 0.045, duration: 0.05 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 72, volume: 0.44 } },
    fx: { delay: { steps: [3, 4], feedback: 0.35, lowpass: 2600, wet: 0.3, send: { echo: 0.5, organ: 0.15, lead: 0.14, riser: 0.3, tom: 0.2 } } },
    lead: [...rest(4), ...rfVerse, ...rfChorus, ...rfBridge],
    organ: bySection(rfProg, SONG, {
      intro: (c, i) => rfIntro[i],
      chorus: (c) => chordBar(c, 'x__x __x_ .... ....', 'G#3'),
      bridge: (c) => chordBar(c, LONG, 'G#3'),
    }),
    echo: bySection(rfProg, SONG, { intro: rain, verse: rain, bridge: rain }),
    piano: bySection(rfProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G#4'), bridge: (c) => chordBar(c, LONG, 'G#4') }),
    stabs: bySection(rfProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(rfProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: rfProg.map((c, i) => ([0, 20].includes(i) ? 'C#3:16' : [11, 23].includes(i) ? '-:8 G#3:8' : '-:16')),
    bass: bySection(rfProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_DRIVE), bridge: BREAK_BASS }),
    drums: [
      [K4, CL, H8, RAINN, THUNDER, CR], [K4, CL, H8, RAINN], [K4, CL, H8, RAINN], [K4, CL, H8, RAINN, dr('.... .... .... t.tt')],
      ...groove(4, RAINFORT, [K4, CL, HH, RAINN, dr('.... .... .... tttt')]),
      ...groove(4, RAINFORT, [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... tttt tttt')], false),
      [K4, CL, HH, THUNDER, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')],
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, RAINN, THUNDER, CR], [K4, CL, H8, RAINN], [K4, CL, H8, RAINN], [K4, dr('.... c... .... ....'), RAINN, dr('.... .... tttt tttt')],
    ],
  },

  // Dünen-Abfahrt (8-2, Reiten auf Pflaume, Schubfelder, Sandflosser, Baron-Sandstatuen): 144 BPM, A-Dur, 24 Takte,
  // schwungvoll. Intro (A E fis D): die Wüstenflöte spielt die Hook eine Oktave tiefer, Darbuka | Strophe (fis D A E |
  // fis D h E): Lead in der Mittellage, Kanun-Zupfer, Schellenkranz | Refrain (A E fis D | A E D E): Dünen-Schwung,
  // Galopp-Bass, Piano auf der „und“, Stabs | Überleitung (D E fis E): lange Töne, die Flöte singt, Sandwehen (Riser mit
  // Rauschen). Energie-Ebene beim Reiten: Lead eine Oktave höher gedoppelt, Offbeat-Stabs.
  course_dunes: {
    bpm: 144,
    energyDouble: 1,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      whistle: { type: 'sine', volume: 0.12, vibrato: 22, rate: 5.5, slide: 2, attack: 0.04, gate: 0.9 },
      arp: { type: 'sawtooth', volume: 0.05, decay: 0.08 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07, noise: 0.12 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, doum: { freq: 95, volume: 0.3, decay: 0.2 }, tek: { volume: 0.18, freq: 820 }, jingle: { volume: 0.11, off: 0.08, duration: 0.09 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 120, volume: 0.36 } },
    fx: { lowpass: { arp: 2800 }, delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.26, send: { whistle: 0.4, lead: 0.12, arp: 0.25 } } },
    whistle: [...tr(dnIntro, -12), ...rest(16), '-:8 F#5:8', '-:8 E5:8', '-:8 A5:8', '-:8 E5:8'],   // Überleitung: unter dem Lead
    lead: [...rest(4), ...dnVerse, ...dnChorus, ...dnBridge],
    arp: bySection(dnProg, SONG, { verse: (c) => pat(tones(c, 'A4'), '0.1. 2.1. 0.12 .1..') }),
    piano: bySection(dnProg, SONG, { chorus: (c) => chordBar(c, OFF, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(dnProg, SONG, { intro: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(dnProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 E3:8', ...rest(10), 'A3:16', 'E3:14 -:2'],
    bass: bySection(dnProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_GALLOP), bridge: BREAK_BASS }),
    energy: dnProg.map((c) => chordBar(c, '..x. .... ..x. ..x.', 'A4')),
    drums: [
      ...groove(4, [K4, CL, H8, DARB], [K4, CL, H8, DARB, dr('.... .... .... t.tt')]),
      ...groove(4, [...DUNE, SHAKE], [K4, CL, H8, SHAKE, dr('.... .... ..tt tttt')]),
      ...groove(4, [...DUNE, SHAKE], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ssss ssss')], false),
      ...groove(4, [K4, CL, HH, DARB], [K4, CL, HH, DARB, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, DARB], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, SHAKE, CR], [K4, CL, H8, SHAKE], [K4, CL, H8, DARB], FILL_S,
    ],
  },

  // Keks-Fabrik (8-3, drehende Kekse und Keks-Zahnräder, Riesenschnappblumen, Hörner-Ameisen): 138 BPM, F-Dur, 24 Takte,
  // verspielt. Intro (F d B C): die Spieluhr spielt die Hook | Strophe (B C a d | B C g C): Lead in Achteln, Förderband-
  // Zupfer, Zahnrad-Ticken | Refrain (F d B C | F d g C): Spieluhr-Hüpfer, das Glockenspiel spielt die Hook eine Oktave höher
  // mit, Holzblock-Klappern, Piano auf der „und“ | Überleitung (B C d C): lange Töne, Spieluhr-Tupfer, Riser.
  course_cookie: {
    bpm: 138,
    voice: {
      lead: { ...SYNTH, cutoff: 4800, volume: 0.16 },
      bell: { type: 'sine', volume: 0.12, decay: 0.4, ratio: 4.2, partial: 0.35 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.07 },
      echo: { type: 'sine', volume: 0.06, decay: 0.3 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.05 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tek: { volume: 0.17, freq: 1150 }, tick: { freq: 2000, volume: 0.09, decay: 0.03 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 150, volume: 0.36 } },
    fx: { delay: { steps: 3, feedback: 0.28, lowpass: 3400, wet: 0.25, send: { bell: 0.35, echo: 0.4, lead: 0.12, arp: 0.2 } } },
    bell: bySection(ckProg, SONG, {
      intro: (c, i) => ckIntro[i],
      chorus: (c, i) => ([0, 1, 4, 5].includes(i) ? tr([ckChorus[i]], 12)[0] : '-:16'),
    }),
    echo: bySection(ckProg, SONG, { bridge: (c) => pat(tones(c, 'C6'), '0... ..1. 2... ..1.') }),   // Spieluhr-Tupfer
    lead: [...rest(4), ...ckVerse, ...ckChorus, ...ckBridge],
    arp: bySection(ckProg, SONG, { verse: belt }),
    piano: bySection(ckProg, SONG, { chorus: (c) => chordBar(c, OFF, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(ckProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(ckProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(ckProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8, GEAR], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8, GEAR], [K4, CL, H8, GEAR, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8, GEAR], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, CLACK], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, CLACK], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [...COOKIE, CR], COOKIE, COOKIE, FILL_S,
    ],
  },

  // Baron-Express (8-Zug, Hackvogel-Wagen, Wasserbecken, Schattenläuferin): 146 BPM, g-Moll, 24 Takte, treibend. Intro
  // (g Es B F): das Piano spielt die Hook in Oktaven, die Dampfpfeife ruft | Strophe (g F Es D | g F c D): Lead im Räder-
  // Rhythmus 3-3-2, Dampfstöße und Schienenstöße, Zugglocke | Refrain (g Es B F | g Es c D): Kolben-Stoß-Hook, Galopp-Bass,
  // Piano auf der „und“, Stabs, Pfeife | Überleitung (Es F g D): lange Töne, Pfeife, Riser über zwei Takte.
  course_baronexpress: {
    bpm: 146,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      piano: { volume: 0.1 },
      whistle: { type: 'triangle', volume: 0.07, vibrato: 8, rate: 6, slide: 3, attack: 0.05, gate: 0.95 },
      bell: { type: 'sine', volume: 0.09, decay: 0.5, ratio: 2.76, partial: 0.4 },
      stabs: { volume: 0.12, cutoff: 5500, cutoffEnd: 1500 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08, noise: 0.1 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, jingle: { volume: 0.12, off: 0.065, duration: 0.06 }, tick: { freq: 1500, volume: 0.1, decay: 0.04 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 110, volume: 0.4 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.26, send: { whistle: 0.4, bell: 0.35, lead: 0.12 } } },
    lead: [...rest(4), ...bxVerse, ...bxChorus, ...bxBridge],
    piano: bySection(bxProg, SONG, { intro: (c, i) => octaves(tr(bxHook, -12))[i], chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    whistle: bxProg.map((c, i) => ([0, 12, 20].includes(i) ? PFIFF : '-:16')),
    bell: bySection(bxProg, SONG, { verse: (c, i) => (i % 4 === 0 ? 'D6:2 D6:2 -:12' : '-:16') }),
    stabs: bySection(bxProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(bxProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 D4:8', ...rest(10), 'G3:16', 'D4:14 -:2'],
    bass: bySection(bxProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_DRIVE), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, H8, CHUG], [K4, CL, H8, CHUG, dr('.... .... .... t.tt')]),
      ...groove(4, EXPRESS, [K4, CL, H8, CHUG, dr('.... .... ..tt tttt')]),
      ...groove(4, EXPRESS, [K4, CL, dr('h.h. h.h. h.h. ....'), CHUG, dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, CHUG], [K4, CL, HH, CHUG, dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH, CHUG], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, H8, CHUG, CR], [K4, CL, H8, CHUG], [K4, CL, H8, RAILS], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Leuchtsteg (8-4, Nacht-Festung, unsichtbare Stege leuchten um die Figur und bei Aufschlägen): 136 BPM, e-Moll, 24 Takte,
  // geheimnisvoll. Intro (e a D G): die Glas-Glocken spielen die Hook, glitzernde Arpeggien | Strophe (e e C D | e e a H):
  // Lead tief, Stampfstein-Schläge, Leucht-Pings | Refrain (e a D G | e a C H): Leucht-Stufen, glitzernde Sechzehntel,
  // Piano auf der „und“, Stabs | Überleitung (C D e H): lange Töne, Scheinwerfer-Schwenk (Riser mit Rauschen).
  course_footlight: {
    bpm: 136,
    voice: {
      lead: { ...SYNTH, cutoff: 4400, volume: 0.17 },
      bell: { type: 'sine', volume: 0.1, decay: 0.6, ratio: 5.4, partial: 0.3 },
      arp: { type: 'sine', volume: 0.06, decay: 0.07 },
      echo: { type: 'sine', volume: 0.06, decay: 0.12, glide: 1.5, glideTime: 0.08 },
      piano: { volume: 0.08, cutoff: 3800 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 0.7 },
      bass: { volume: 0.17 },
      riser: { volume: 0.06, noise: 0.1 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.28 }, doum: { freq: 70, volume: 0.32, decay: 0.25 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 120, volume: 0.36 } },
    fx: { lowpass: { arp: 5000 }, delay: { steps: [3, 4], feedback: 0.4, lowpass: 3000, wet: 0.35, send: { bell: 0.45, arp: 0.35, echo: 0.5, lead: 0.16, clap: 0.2 } } },
    bell: [...flHook, ...rest(20)],
    lead: [...rest(4), ...flVerse, ...flChorus, ...flBridge],
    arp: bySection(flProg, SONG, { intro: glitter, chorus: glitter, bridge: glitter }),
    echo: bySection(flProg, SONG, { verse: ping }),
    piano: bySection(flProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(flProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(flProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 B3:8', ...rest(8), 'E3:16', ...rest(2), 'B3:14 -:2'],
    bass: bySection(flProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... t.tt')]),
      ...groove(4, NIGHT, [K4, CL, HOF, STAMP, dr('.... .... .... tttt')]),
      ...groove(4, NIGHT, [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, HOF, STAMP, CR], [K4, CL, HOF], [K4, CL, HOF, STAMP], FILL_S,
    ],
  },

  // Wasserfestung (8-5, unter Wasser, Steigbecken, schwebende Wasserkörper, Stachelblöcke, kurzer Pflaume-Abschnitt):
  // 130 BPM, f-Moll, 24 Takte, gedämpft und blubbernd. Intro (f Des As Es): die Wasserglocken spielen die Hook | Strophe
  // (f f Des Es | f f b C): Lead tief, Blubbern, Sonar-Ping alle vier Takte, dumpfer Wellenschlag | Refrain (f Des As Es |
  // f Des b C): Wellengang-Hook, Festungs-Orgel, Perlen auf der „und“, gedämpftes Piano | Überleitung (Des Es f C): lange
  // Töne, Blubbern, Wasser-Riser. Piano, Pad, Stabs, Orgel und Perlen hinter Tiefpass, Lead weich, viel Hall – trotzdem
  // Four-on-the-floor. Energie-Ebene beim Reiten: Offbeat-Stabs.
  course_dungeon: {
    bpm: 130,
    voice: {
      lead: { ...SYNTH, cutoff: 2500, volume: 0.17 },
      bell: { type: 'sine', volume: 0.12, decay: 0.5, ratio: 2.0, partial: 0.25 },
      echo: { type: 'sine', volume: 0.07, decay: 0.08, glide: 1.8, glideTime: 0.06 },
      whistle: { type: 'sine', volume: 0.06, vibrato: 0, rate: 5, slide: 0, attack: 0.005, gate: 0.6 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.1 },
      organ: { volume: 0.05, cutoff: 1500 },
      piano: { volume: 0.1 },
      stabs: { volume: 0.12 },
      pad: { volume: 0.06 },
      bass: { volume: 0.19, cutoff: 700 },
      riser: { volume: 0.06, noise: 0.1 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.26 }, doum: { freq: 80, volume: 0.3, decay: 0.2 }, hat: { volume: 0.18, off: 0.12 }, tom: { freq: 110, volume: 0.36 } },
    fx: { lowpass: { piano: 1500, pad: 1400, stabs: 1600, arp: 1800, organ: 1400 }, delay: { steps: [3, 4], feedback: 0.45, lowpass: 1800, wet: 0.4, send: { bell: 0.5, lead: 0.25, echo: 0.6, whistle: 0.7, arp: 0.3 } } },
    bell: [...dgHook, ...rest(20)],
    lead: [...rest(4), ...dgVerse, ...dgChorus, ...dgBridge],
    echo: bySection(dgProg, SONG, { intro: bubble, verse: bubble, bridge: bubble }),
    whistle: bySection(dgProg, SONG, { verse: SONAR }),
    arp: bySection(dgProg, SONG, { chorus: pearl }),
    organ: bySection(dgProg, SONG, { chorus: (c) => chordBar(c, LONG, 'F3') }),
    piano: bySection(dgProg, SONG, { intro: (c) => chordBar(c, OFF, 'Ab4'), chorus: (c) => chordBar(c, OFF, 'Ab4'), bridge: (c) => chordBar(c, LONG, 'Ab4') }),
    stabs: bySection(dgProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(dgProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(dgProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    energy: dgProg.map((c) => chordBar(c, '..x. ..x. ..x. ..x.', 'F4')),
    drums: [
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... t.tt')]),
      ...groove(4, DUNGEON, [K4, CL, HOF, dr('.... .... .... tttt')]),
      ...groove(4, DUNGEON, [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, H8, SURGE], [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8, SURGE], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, HOF, CR], [K4, CL, HOF], [K4, CL, HOF, SURGE], FILL_S,
    ],
  },

  // Spukhaus (8-6, stockdunkel, Licht-Helm, Aufzugfahrten, großer Spiegel, Großspuk): 132 BPM, a-Moll, 24 Takte, gruselig-
  // lustig. Intro (a d G C): die Celesta spielt die Hook, Standuhr tickt | Strophe (a a F E | a a d E): Lead tief,
  // Pizzicato-Bass, Klopf-klopf | Refrain (a d G C | a d E a): Kicher-Geist-Hook, Geisterbahn-Orgel auf der „und“, die
  // Celesta spielt eine Oktave höher mit | Überleitung (F G a E): lange Töne, das Geister-„Huuu“ (Theremin) singt darüber.
  course_beamdark: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4200, volume: 0.17 },
      bell: { type: 'sine', volume: 0.11, decay: 0.5, ratio: 3, partial: 0.3 },
      organ: { volume: 0.05, cutoff: 2800 },
      whistle: { type: 'sine', volume: 0.08, vibrato: 45, rate: 5, slide: 5, attack: 0.2, gate: 0.95 },
      piano: { volume: 0.08 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 0.7 },
      bass: { volume: 0.18 },
      riser: { volume: 0.06, noise: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.28 }, tek: { volume: 0.2, freq: 600 }, tick: { freq: 1200, volume: 0.1, decay: 0.05 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 130, volume: 0.36 } },
    fx: { delay: { steps: [3, 4], feedback: 0.4, lowpass: 2600, wet: 0.32, send: { bell: 0.4, whistle: 0.5, organ: 0.2, lead: 0.15, tek: 0.3 } } },
    bell: bySection(bdProg, SONG, { intro: (c, i) => bdHook[i], chorus: (c, i) => ([0, 2, 4].includes(i) ? tr([bdChorus[i]], 12)[0] : '-:16') }),
    lead: [...rest(4), ...bdVerse, ...bdChorus, ...bdBridge],
    organ: bySection(bdProg, SONG, { chorus: (c) => chordBar(c, OFF, 'A3'), bridge: (c) => chordBar(c, LONG, 'A3') }),
    whistle: [...rest(20), ...BOO],
    piano: bySection(bdProg, SONG, { intro: (c) => chordBar(c, '.... ..x. .... ..x.', 'A4'), verse: (c) => chordBar(c, '..x. .... ..x. ....', 'A4') }),
    stabs: bySection(bdProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(bdProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'E3:16'],
    bass: bySection(bdProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, 'L_.. H_.. F_.. H_..'), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8, CLOCK], [K4, CL, H8, CLOCK, dr('.... .... .... t.tt')]),
      ...groove(4, SPOOK, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, SPOOK, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, KNOCK], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, KNOCK], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8, CLOCK], [K4, CL, H8, KNOCK], FILL_S,
    ],
  },

  // Lava-Inferno (8-7, Kristall-Felsklötze rollen über die Lava): 150 BPM, d-Moll, 24 Takte, schnell und dramatisch. Intro
  // (d B F C): die Kristall-Glocken spielen die Hook, Stabs | Strophe (d d B C | d d g A): Lead in Achteln, Stampfen, Grollen,
  // Pumpbass | Refrain (d B F C | d B g A): Felsklotz-Hook, Galopp-Bass, Rave-Piano 3-3-2, Stabs, Sechzehntel-Hats, Hoover-
  // Riser alle vier Takte | Überleitung (B C d A): lange Töne über Piano-Akkorden, Riser über zwei Takte.
  course_inferno: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.17 },
      bell: { type: 'sine', volume: 0.1, decay: 0.45, ratio: 5.4, partial: 0.35 },
      arp: { type: 'sawtooth', volume: 0.045, decay: 0.05 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.13, cutoff: 6500, cutoffEnd: 1600 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.55 }, clap: { volume: 0.3 }, doum: { freq: 65, volume: 0.34, decay: 0.22 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 80, volume: 0.42 } },
    fx: { lowpass: { arp: 3000 }, delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.25, send: { bell: 0.35, lead: 0.12, riser: 0.2, tom: 0.15 } } },
    bell: [...ifHook, ...rest(20)],
    lead: [...rest(4), ...ifVerse, ...ifChorus, ...ifBridge],
    arp: bySection(ifProg, SONG, { chorus: (c) => pat(tones(c, 'D4'), '0.1. 2.1. 0.1. 2.12') }),
    piano: bySection(ifProg, SONG, { chorus: (c) => chordBar(c, P332, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(ifProg, SONG, { intro: (c) => chordBar(c, 'x... .... .... ..x.'), verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(ifProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 A3:8', ...rest(3), '-:8 A3:8', ...rest(3), '-:8 A3:8', ...rest(2), 'D3:16', 'A3:14 -:2'],
    bass: bySection(ifProg, SONG, { intro: (c) => bassBar(c, B_DRIVE), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [...INFERNO, RUMBLE_T], [K4, CL, H8, dr('.... .... ..tt tttt')]),
      ...groove(4, [...INFERNO, RUMBLE_T], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, POUND], [K4, CL, HH, dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH, POUND], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, POUND], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Großer Turm (8-Burg, Rummelplatz um den Turm, Riesenrad, Baron Brummbär im Krallen-Anzug, Super-POW-Block): 150 BPM,
  // c-Moll, 32 Takte, das größte und dramatischste Stück. Intro (c As B G): die Kirchenorgel spielt das Baron-Brummbär-Motiv
  // aus course_boss (Lead Takt 5–8) Note für Note, Pauken, Turmglocke | Strophe (c c As B | c c f G): Lead im Galopp,
  // Krallen-Kratzen, Stabs auf der „und“ | Refrain (c As B G | c As B G): die eigene Heldenhook für Lotti und Greta, darunter
  // die Orgel mit dem Baron-Motiv eine Oktave tiefer als Gegenstimme, Stabs, Piano auf der „und“, treibender Bass |
  // Überleitung (As B f G): lange Töne, die Chor-Stimme singt, Turmglocke, Riser über zwei Takte | zweiter Refrain: wie der
  // erste, das Glockenspiel singt die Heldenhook eine Oktave höher mit, Pauken. Chor-Pad in allen Takten.
  course_finale: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.17 },
      organ: { volume: 0.055, cutoff: 2200 },
      whistle: { type: 'triangle', volume: 0.07, vibrato: 12, rate: 5, slide: 0, attack: 0.25, gate: 0.98 },
      bell: { type: 'sine', volume: 0.09, decay: 1.4, ratio: 2.4, partial: 0.5 },
      arp: { type: 'sine', volume: 0.06, decay: 0.3 },
      stabs: { volume: 0.12, cutoff: 6000, cutoffEnd: 1600 },
      piano: { volume: 0.08 },
      pad: { volume: 0.055, bright: 0.85 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tom: { freq: 92, volume: 0.42 }, snare: { volume: 0.24 }, jingle: { volume: 0.08, off: 0.06, duration: 0.05 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: [3, 4], feedback: 0.34, lowpass: 2400, wet: 0.3, send: { organ: 0.18, whistle: 0.35, pad: 0.2, bell: 0.3, arp: 0.3, lead: 0.12, tom: 0.15 } } },
    lead: [...rest(4), ...fnVerse, ...fnChorus, ...fnBridge, ...fnChorus],
    organ: bySection(fnProg, FINAL, {
      intro: (c, i) => fnBaron[i],
      chorus: (c, i) => tr(fnBaron, -12)[i % 4],
      bridge: (c) => chordBar(c, 'x_______ ....x___', 'G3'),
      chorus2: (c, i) => tr(fnBaron, -12)[i % 4],
    }),
    arp: bySection(fnProg, FINAL, { chorus2: (c, i) => ([0, 1, 4, 5].includes(i) ? tr([fnChorus[i]], 12)[0] : '-:16') }),   // Glockenspiel
    whistle: [...rest(20), ...fnChoir, ...rest(8)],
    bell: fnProg.map(TOLL),
    stabs: bySection(fnProg, FINAL, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24), chorus2: (c) => chordBar(c, ST24) }),
    piano: bySection(fnProg, FINAL, { chorus: (c) => chordBar(c, OFF, 'G4'), chorus2: (c) => chordBar(c, OFF, 'G4') }),
    pad: fnProg.map((c) => padBar(c)),
    riser: [...rest(11), '-:8 G3:8', ...rest(10), 'G3:16', 'C4:14 -:2', ...rest(7), '-:8 G3:8'],
    bass: bySection(fnProg, FINAL, {
      intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_GALLOP), chorus: (c) => bassBar(c, B_DRIVE),
      bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....'), chorus2: (c) => bassBar(c, B_DRIVE),
    }),
    drums: [
      [K4, PAUKE8, CR], [K4, PAUKE8], [K4, PAUKE8, CL], [K4, CL, dr('.... .... tttt tttt')],
      ...groove(4, TOWER8, [K4, CL, H8, dr('t... .... ..tt tttt')]),
      ...groove(4, TOWER8, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('t... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, HH, dr('t... .... tttt tttt')]),
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('t... .... ..ss ssss')], false),
      [K4, PAUKE8, CR], [K4, PAUKE8], [K4, CL, PAUKE8], [K4, dr('.... c... .... ....'), dr('tt.. tt.. ssss ssss')],
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, HH, dr('t... .... tttt tttt')]),
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('tt.. tt.. ssss ssss')], false),
    ],
  },

  // Abspann (nach dem Sieg über Baron Brummbär): 126 BPM, G-Dur, 40 Takte, kein Loop – das Stück endet mit einem Schluss.
  // Intro (G D e C): die Spieluhr spielt die Hook über Pad und Piano, Kick auf 1 und 3 | Strophe (e C G D | e C a D): Lead
  // in der Mittellage, Piano auf der „und“ | Refrain (G D e C | G D C D): Danke-Hook, Stabs, Piano, hüpfender Bass |
  // Erinnerung (G D e C | e e C D): das Glockenspiel spielt die Hook von course_grass (Welt 1) eine Oktave höher, danach der
  // Lead das Riff von world1 in e-Moll | zweiter Refrain: Glockenspiel eine Oktave höher dazu, die Flöte singt darunter |
  // Schluss (e C D G): Trugschluss, Kadenz, langer G-Dur-Akkord mit Becken, dann Stille. Dauer ≈ 76 s.
  course_abspann: {
    bpm: 126,
    loop: false,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3800, volume: 0.17 },
      bell: { type: 'sine', volume: 0.1, decay: 0.6, ratio: 3.9, partial: 0.3 },
      whistle: { type: 'sine', volume: 0.07, vibrato: 14, rate: 5, slide: 1, attack: 0.12, gate: 0.95 },
      piano: { volume: 0.1, cutoff: 4200 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 0.85 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.27 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 140, volume: 0.34 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3200, wet: 0.3, send: { bell: 0.4, whistle: 0.35, piano: 0.2, lead: 0.15 } } },
    bell: bySection(abProg, ABSP, {
      intro: (c, i) => abIntro[i],
      memory: (c, i) => (i < 4 ? abGrass[i] : '-:16'),
      chorus2: (c, i) => ([0, 1, 4, 5].includes(i) ? tr([abChorus[i]], 12)[0] : '-:16'),
      ending: (c, i) => (i === 3 ? 'G4:16' : '-:16'),   // letzter Spieluhr-Ton unter dem Schlusston
    }),
    lead: [...rest(4), ...abVerse, ...abChorus, ...rest(4), ...abWorld1, ...abChorus, ...abEnding],
    whistle: bySection(abProg, ABSP, { chorus2: (c, i) => abFlute[i] }),
    piano: bySection(abProg, ABSP, {
      intro: (c) => chordBar(c, LONG, 'G4'),
      verse: (c) => chordBar(c, OFF, 'G4'),
      chorus: (c) => chordBar(c, P332, 'G4'),
      memory: (c) => chordBar(c, OFF, 'G4'),
      chorus2: (c) => chordBar(c, P332, 'G4'),
      ending: (c, i) => (i === 3 ? 'G4+B4+D5+G5:12 -:4' : chordBar(c, i === 2 ? 'x___ x___ x___ x___' : OFF, 'G4')),
    }),
    stabs: bySection(abProg, ABSP, { chorus: (c) => chordBar(c, ST24), chorus2: (c) => chordBar(c, ST24) }),
    pad: abProg.map((c, i) => (i === 39 ? 'G3+B3+D4:16' : padBar(c))),
    riser: [...rest(27), '-:8 D4:8', ...rest(12)],
    bass: bySection(abProg, ABSP, {
      intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_BOUNCE),
      memory: (c) => bassBar(c, B_PUMP), chorus2: (c) => bassBar(c, B_BOUNCE),
      ending: (c, i) => (i === 3 ? 'G1:12 -:4' : bassBar(c, i === 2 ? 'L___ H___ L___ H___' : B_BOUNCE)),
    }),
    drums: [
      [KH, H8O, CR], [KH, CL4, H8O], [KH, CL4, H8O], [KH, CL, H8O, dr('.... .... .... t.tt')],
      ...groove(4, ABS, [K4, CL, H8O, dr('.... .... .... tttt')]),
      ...groove(4, ABS, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ssss ssss')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, dr('h.h. h.h. h.h. h.h.'), dr('.... .... ..ss ssss')], [dr('k... .... .... ....'), CR],
    ],
  },

  // Weltkarte Welt 8 „Brummbär-Rummelplatz“: 128 BPM, Es-Dur, 16 Takte, Jahrmarkt-Schwung. Strophe (Es c As B | Es c f B): die
  // Drehorgel singt die Melodie im Walzer-Schwung, „Umpa-pa“ (Bass auf der Eins, Piano-Akkorde auf 2 und 3) | Refrain (As B
  // g c | As B Es Es): der Lead singt die Karussell-Hook, die Drehorgel macht „pa-pa“ auf der „und“, Karussell-Glöckchen in
  // den Phrasen-Enden. Four-on-the-floor (weicher Kick), Clap auf 2 und 4, Schellen.
  course_world8_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3600, volume: 0.17 },
      organ: { volume: 0.055, cutoff: 3400, gate: 0.85 },
      bell: { type: 'sine', volume: 0.08, decay: 0.4, ratio: 2.76, partial: 0.35 },
      piano: { volume: 0.1, cutoff: 3600 },
      pad: { volume: 0.045, bright: 0.85 },
      bass: { cutoff: 650 },
    },
    kit: { kick: { volume: 0.46 }, clap: { volume: 0.24 }, jingle: { volume: 0.09, off: 0.07, duration: 0.08 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 150, volume: 0.3 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.28, send: { organ: 0.2, bell: 0.4, lead: 0.18 } } },
    organ: [...m8Organ, ...m8Prog.slice(8).map((c) => chordBar(c, OFF, 'G4'))],
    lead: [...rest(8), ...m8Lead],
    bell: m8Prog.map((c, i) => (i % 2 ? chime(c) : '-:16')),
    piano: m8Prog.map((c, i) => (i < 8 ? chordBar(c, '.... x_.. x_.. ....', 'G3') : '-:16')),
    pad: m8Prog.map((c) => padBar(c)),
    bass: m8Prog.map((c) => bassBar(c, 'L___ .... .... F_..')),
    drums: [[...W8MAP, CR], W8MAP, W8MAP, [K4, CL, H8O, dr('.... .... .... .ttt')], W8MAP, W8MAP, W8MAP, [K4, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...W8MAP, CR], W8MAP, W8MAP, [K4, CL, H8O, dr('.... .... .... .ttt')], W8MAP, W8MAP, W8MAP, [K4, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')]],
  },
};
