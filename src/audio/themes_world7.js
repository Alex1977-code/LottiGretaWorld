// Kurs-Themen Welt 7 „Lava-Festung“ (Level 7-1 … 7-Burg) – eigene Kompositionen im Stil des 90er-Eurodance (Stil ja,
// Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md) geschrieben, Maßstab Welt 1 und Welt 6: jedes Thema ist ein Lied
// in Dur oder Moll – Intro (Hook auf einer Farb-Stimme) → Strophe (tiefer, ruhiger) → Refrain (höher, zweitaktige Hook
// A A' A A'') → Überleitung (Breakdown, lange Töne, Riser) –, Eurodance-Akkordfolgen, der Lead-Synth trägt die Melodie
// fast durchgehend, Off-Beat-Stabs, Piano, Pad, Oktav-Bass, Four-on-the-floor. Die Lava-Welt ist überwiegend Moll, aber
// hüpfend und kindgerecht; die Welt-Farbe kommt nur aus dem Klang.
//
// Hook-Profile (tests/audio.mjs vergleicht sie mit allen Themen der Welten 1–7 und der Halloween-Welt – Einsatz +
// Intervall und Kontur ohne Rhythmus):
//   Werfer-Festung  Fanfare: Quarte hinauf, Synkope auf der Wiederholung („a-D . d-F E . d C D“), die Antwort springt
//                   wieder eine Quarte hinauf und fällt in die Pause – zwei Anläufe wie zwei Feuerstöße
//   Dunkler Tempel  Ruf und Echo: jeder Ton hallt eine Sechzehntel später leise nach („CIS-cis . a H-h . gis“), die
//                   Terzen-Kette fällt, die Antwort sinkt in einen langen Ton
//   Sprint          Countdown: Sechzehntel-Paare auf einer Tonleiter abwärts („drei-drei, zwei-zwei, eins-eins“), dann
//                   „LOS!“ – ein Dreiklang-Sprung zum hohen Ton und zurück
//   Schubser-Band   Stampfen in Vierteln den Dreiklang hinauf, dann „ba-da-di“ zurück auf die Sekunde – Bläser-Ruf
//   Fluchtturm      Galopp-Treppe: Achtel + zwei Sechzehntel, Stufe für Stufe eine Oktave hinauf; die Antwort rutscht ab
//                   und klettert gleich wieder; der Refrain endet höher als er begann
//   Rammfisch-Riff  „Blubb-blubb“: zwei Sechzehntel auf einem Ton, Luft holen, dann gemütlich drei Stufen hinauf zum
//                   langen Ton (Terz → Quinte → Septime der Kette)
//   Vulkan-See      Ausbruch: zwei schwere Viertel, ein Sechzehntel-Lauf schießt hinauf zum langen Gipfelton; die
//                   Antwort rollt hinab wie Lava
//   Lava-Burg       3+3+2-Stöße auf einem Ton mit Nebennote („G . . g . . as G F Es D“), die Antwort eine Stufe tiefer;
//                   im Intro spielt die Orgel das Baron-Brummbär-Motiv aus course_boss (Lead Takt 5–8) unverändert
//   Karte           Schaukeln: Quarte und Terz hinauf zum langen Ton, um den Grundton mit dem Leitton kreisen, die
//                   Antwort sinkt und steigt in Sechzehnteln zurück
// Beim Komponieren aufgefallen und ersetzt: eine Festungs-Hook im Rhythmus 3-1-2-2-4 hatte die Kontur von course_tank
// (60 %), eine Vulkan-Hook aus langen Tönen die von course_autumn/course_graveyard (75 %), eine Karten-Hook die von
// course_wreck (60 %), eine Tempel-Hook mit Wechselnote und Terz den Kopf von course_goldtrain (45 %) und eine Turm-Hook
// im Terzen-Zickzack die Kletter-Hook von course_fuzzymine (55 %).
//
// Welt-Farbe nur über Klang: Fanfaren-Bläser (gedämpfte Rechteck-Orgel), Feuer-Whoosh (kurze Riser mit Rauschen),
// fallende Feuerbälle und Knistern (Werfer-Festung), Steinglocken mit unharmonischem Teilton, großer Hall, Tropfen,
// Tempelflöte und klackende Kipp-Schalter (dunkler Tempel), Uhr-Ticken, Countdown-Piepser und Renn-Arpeggio (Sprint),
// Bläser-Stabs und Stampf-Trommel (Schubser), Turm-Glockenspiel, Kettenrasseln der Seilbahn, Alarm-Sirene und Lava-
// Riser (Fluchtturm), gedämpfter Unterwasser-Klang, Wasserglocken, Blubbern und dumpfe Rammstöße (Riff), Vulkan-Hörner,
// Taiko-Trommeln und Grollen (Vulkan-See), Kirchenorgel, Chor-Pad, Chor-Stimme, Pauken und Kettenrasseln des Kampfwagens
// (Lava-Burg), Lava-Blubbern und fernes Grollen (Karte).

import {
  dr, K4, KH, CL, HH, H8, H8O, HOF, CR, rest, tr, octaves, chordBar, bassBar, padBar, pat, voicing,
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

// ================================================================ Werfer-Festung (7-1) ====
// d-Moll, 142 BPM, heroisch. Intro d B C A (die Fanfaren-Bläser spielen die Hook) | Strophe d C B A | d C g A (i–VII–VI–V,
// Marsch-Punktierung, Feuerbälle fallen in die Phrasen-Pausen) | Refrain d B C d | d B g A (i–VI–VII–i | i–VI–iv–V) |
// Überleitung B C d A (Bläser-Akkorde). Feuer-Whoosh vor jedem Abschnitt. Hook: „a-D . d-F E . d C D“ – Quarte hinauf,
// synkopierte Wiederholung, Drehung um den Grundton; die Antwort springt wieder eine Quarte hinauf („F-B . a G F“).
const ffProg = ['Dm', 'Bb', 'C', 'A', 'Dm', 'C', 'Bb', 'A', 'Dm', 'C', 'Gm', 'A', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'Gm', 'A', 'Bb', 'C', 'Dm', 'A'];
const ffHook = ['A4:2 D5:2 -:1 D5:1 F5:2 E5:3 D5:1 C5:2 D5:2', 'F5:2 Bb5:2 -:1 A5:1 G5:2 F5:3 D5:1 -:2 A4:2',
  'G4:2 C5:2 -:1 C5:1 E5:2 D5:3 C5:1 Bb4:2 C5:2', 'F5:2 A5:2 -:1 G5:1 F5:2 E5:3 D5:1 -:2 A4:2'];
const ffChorus = [...ffHook, ffHook[0], ffHook[1], 'D5:2 G5:2 -:1 G5:1 Bb5:2 A5:3 G5:1 F5:2 G5:2', 'E5:2 A5:2 -:1 G5:1 F5:2 E5:3 C#5:1 -:2 E5:2'];
const ffIntro = [ffHook[0], ffHook[1], ffHook[2], 'E5:2 A5:2 -:1 G5:1 F5:2 E5:3 C#5:1 -:2 A4:2'];   // Takt 4 führt zur Strophe
const ffV = ['D5:3 D5:1 F5:2 E5:2 D5:4 -:2 A4:2', 'C5:3 C5:1 E5:2 D5:2 C5:4 -:2 G4:2', 'Bb4:3 Bb4:1 D5:2 C5:2 Bb4:4 -:2 F4:2', 'A4:3 C#5:1 E5:2 G5:2 F5:4 E5:2 C#5:2'];
const ffVerse = [...ffV, ffV[0], ffV[1], 'Bb4:3 C5:1 D5:2 F5:2 G5:4 F5:2 D5:2', 'E5:3 F5:1 E5:2 D5:2 C#5:4 -:4'];
const ffBridge = ['D5:8 F5:8', 'E5:8 G5:8', 'F5:8 A5:8', 'E5:8 C#5:8'];
const fireball = (c) => pat(tones(c, 'A5'), '.... .... .... 2.0.');          // Feuerbälle (Sägezahn gleitet abwärts)
const CRACKLE = dr('...j ..j. .j.. ...j');                                    // Feuer-Knistern
const FORT = [K4, CL, H8, CRACKLE];

// ================================================================ Dunkler Tempel (7-2) ====
// fis-Moll, 134 BPM, geheimnisvoll. Intro fis h E Cis (die Steinglocken spielen die Hook eine Oktave tiefer) | Strophe
// fis fis D E | fis fis h Cis (i–VI–VII | i–iv–V, Tropfen) | Refrain fis h E A | fis h D Cis (i–iv–VII–III | i–iv–VI–V)
// | Überleitung D E fis Cis (die Tempelflöte singt, Steinglocken). Großer Hall. Hook „Ruf und Echo“: jeder Ton hallt eine
// Sechzehntel später nach – „CIS-cis . a H-h . gis“ –, die Terzen-Kette fällt, die Antwort sinkt in einen langen Ton.
const srProg = ['F#m', 'Bm', 'E', 'C#', 'F#m', 'F#m', 'D', 'E', 'F#m', 'F#m', 'Bm', 'C#', 'F#m', 'Bm', 'E', 'A', 'F#m', 'Bm', 'D', 'C#', 'D', 'E', 'F#m', 'C#'];
const srHook = ['C#6:3 C#6:1 -:2 A5:2 B5:3 B5:1 -:2 G#5:2', 'A5:3 A5:1 -:2 F#5:2 D5:4 -:2 F#5:2',
  'B5:3 B5:1 -:2 G#5:2 E5:3 E5:1 -:2 B5:2', 'C#6:3 C#6:1 -:2 A5:2 E5:4 -:2 G#5:2'];
const srChorus = [...srHook, srHook[0], srHook[1], 'A5:3 A5:1 -:2 F#5:2 B5:3 B5:1 -:2 A5:2', 'G#5:3 G#5:1 -:2 E#5:2 C#5:4 -:2 E#5:2'];
const srIntro = [srHook[0], srHook[1], srHook[2], 'G#5:3 G#5:1 -:2 E#5:2 G#5:4 -:2 B5:2'];   // Takt 4 führt zur Strophe
const srV = ['C#5:4 B4:2 A4:2 C#5:4 F#5:2 E5:2', 'C#5:4 B4:2 A4:2 G#4:4 A4:2 B4:2', 'A4:4 B4:2 C#5:2 D5:4 F#5:2 E5:2', 'E5:4 D5:2 C#5:2 B4:4 G#4:2 B4:2'];
const srVerse = [...srV, srV[0], srV[1], 'B4:4 C#5:2 D5:2 F#5:4 E5:2 D5:2', 'C#5:4 E#5:2 G#5:2 C#6:4 B5:2 G#5:2'];
const srBridge = ['F#5:8 A5:8', 'G#5:8 B5:8', 'A5:8 C#6:8', 'G#5:8 E#5:8'];
const drop = (c) => pat(tones(c, 'C#6'), '.... ..0. .... ...1');              // Tropfen (Sinus) in den Phrasen-Pausen
const STONE = (c, i) => (i % 4 ? '-:16' : `${tones(c, 'F#3')[0]}:16`);         // Steinglocke alle vier Takte
const SWITCH = dr('.... ...x .... .x..');                                     // Kipp-Schalter klacken
const RUIN = [K4, CL, H8, SWITCH];

// ================================================================ Sprint (7-3) ====
// E-Dur, 150 BPM, treibend. Intro E cis A H (das Piano spielt die Hook in Oktaven) | Strophe cis A E H | cis A fis H (vi–IV–
// I–V, Arpeggio-Zickzack, Uhr-Ticken) | Refrain E cis A H | E cis fis H (I–vi–IV–V | I–vi–ii–V) | Überleitung A H cis H.
// Countdown-Piepser vor dem Refrain und vor dem Loop („piep, piep, piep – LOS“ auf der Eins). Hook „Countdown“:
// Sechzehntel-Paare die Tonleiter hinab („H-h a-a gis-gis Fis E“), dann „LOS!“ – der Dreiklang springt zum hohen E.
const rhProg = ['E', 'C#m', 'A', 'B', 'C#m', 'A', 'E', 'B', 'C#m', 'A', 'F#m', 'B', 'E', 'C#m', 'A', 'B', 'E', 'C#m', 'F#m', 'B', 'A', 'B', 'C#m', 'B'];
const rhHook = ['B5:1 B5:1 -:2 A5:1 A5:1 -:2 G#5:1 G#5:1 -:2 F#5:2 E5:2', 'G#5:2 B5:2 E6:4 -:2 D#6:2 C#6:2 B5:2',
  'C#6:1 C#6:1 -:2 B5:1 B5:1 -:2 A5:1 A5:1 -:2 G#5:2 F#5:2', 'A5:2 B5:2 D#6:4 -:2 C#6:2 B5:2 A5:2'];
const rhChorus = [...rhHook, rhHook[0], rhHook[1], 'A5:1 A5:1 -:2 G#5:1 G#5:1 -:2 F#5:1 F#5:1 -:2 E5:2 C#5:2', 'D#5:2 F#5:2 B5:4 -:2 A5:2 G#5:2 F#5:2'];
const rhIntro = [rhHook[0], rhHook[1], rhHook[2], 'A5:2 B5:2 D#6:4 -:2 C#6:2 A5:2 F#5:2'];   // Takt 4 führt zur Strophe
const rhV = ['G#5:2 E5:2 C#5:2 E5:2 G#5:4 F#5:2 E5:2', 'A5:2 E5:2 C#5:2 E5:2 A5:4 G#5:2 E5:2', 'G#5:2 E5:2 B4:2 E5:2 G#5:4 F#5:2 E5:2', 'F#5:2 D#5:2 B4:2 D#5:2 F#5:4 -:4'];
const rhVerse = [...rhV, rhV[0], rhV[1], 'A5:2 F#5:2 C#5:2 F#5:2 A5:4 G#5:2 F#5:2', 'F#5:2 D#5:2 B4:2 D#5:2 F#5:2 A5:2 B5:4'];
const rhBridge = ['E5:8 A5:8', 'F#5:8 B5:8', 'G#5:8 C#6:8', 'B5:8 A5:8'];
const BEEPS = '-:4 B5:4 B5:4 B5:4';                                            // Countdown: piep, piep, piep …
const GO = 'E6:4 -:12';                                                        // … LOS (auf der Eins)
const TICK = dr('x... x... x... x...');                                       // Uhr: Tick – Tack
const RACE = [K4, CL, H8, TICK];

// ================================================================ Schubser-Band (7-4) ====
// F-Dur, 138 BPM, stampfend. Intro F C d B (die Bläser-Stabs spielen die Hook in Oktaven) | Strophe d B F C | d B g C
// (vi–IV–I–V, Stampf-Trommel) | Refrain F C d B | F C B C (I–V–vi–IV | I–V–IV–V, Bläser-Stabs auf der Eins und der „und“) |
// Überleitung B C d C. Hook: Stampfen in Vierteln den Dreiklang hinauf, „ba-da-di“ zurück auf die Sekunde („F A C b-a G“).
const bbProg = ['F', 'C', 'Dm', 'Bb', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'C', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Bb', 'C', 'Dm', 'C'];
const bbHook = ['F5:4 A5:4 C6:2 Bb5:1 A5:1 G5:4', 'E5:4 G5:4 C6:2 Bb5:1 A5:1 G5:4',
  'D5:4 F5:4 A5:2 G5:1 F5:1 E5:4', 'D5:4 F5:4 Bb5:2 C6:1 Bb5:1 A5:4'];
const bbChorus = [...bbHook, bbHook[0], bbHook[1], 'D5:4 F5:4 Bb5:2 A5:1 G5:1 F5:4', 'E5:4 G5:4 C6:2 Bb5:1 A5:1 G5:2 E5:2'];
const bbIntro = [bbHook[0], bbHook[1], bbHook[2], 'Bb5:4 F5:4 D5:2 C5:1 Bb4:1 C5:4'];   // Takt 4 führt zur Strophe
const bbV = ['A4:2 D5:2 D5:2 E5:2 F5:4 E5:2 D5:2', 'Bb4:2 D5:2 D5:2 E5:2 F5:4 D5:2 Bb4:2', 'C5:2 F5:2 F5:2 G5:2 A5:4 G5:2 F5:2', 'G5:2 E5:2 C5:2 E5:2 D5:4 -:2 C5:2'];
const bbVerse = [...bbV, bbV[0], bbV[1], 'Bb4:2 D5:2 D5:2 F5:2 G5:4 F5:2 D5:2', 'E5:2 G5:2 Bb5:2 G5:2 E5:4 -:4'];
const bbBridge = ['D5:8 F5:8', 'E5:8 G5:8', 'F5:8 A5:8', 'G5:8 E5:8'];
const BRASS = 'x... ..x_ .... x.x.';                                           // Bläser-Stabs im Refrain
const STOMP = dr('d... .... d.d. ....');                                      // Stampf-Trommel
const B_STOMP = 'L__. H__. L__. H_H_';                                        // stampfender Oktav-Bass
const BELT = [K4, CL, H8, STOMP];

// ================================================================ Fluchtturm (7-5, vertikal) ====
// h-Moll, 146 BPM, aufsteigend. Intro h A D A (das Turm-Glockenspiel spielt die Hook) | Strophe h h G A | h h e Fis (i–VI–
// VII | i–iv–V, Herzklopf-Ostinato, Kettenrasseln der Seilbahn, die Lava steigt alle vier Takte) | Refrain h A D A | h A e
// Fis (i–VII–III–VII | i–VII–iv–V) | Überleitung G A h Fis (Alarm-Sirene, Riser über zwei Takte). Hook „Galopp-Treppe“:
// Achtel + zwei Sechzehntel Stufe für Stufe eine Oktave hinauf; die Antwort rutscht ab und klettert gleich wieder.
const ttProg = ['Bm', 'A', 'D', 'A', 'Bm', 'Bm', 'G', 'A', 'Bm', 'Bm', 'Em', 'F#', 'Bm', 'A', 'D', 'A', 'Bm', 'A', 'Em', 'F#', 'G', 'A', 'Bm', 'F#'];
const ttHook = ['B4:2 C#5:1 D5:1 D5:2 E5:1 F#5:1 F#5:2 G5:1 A5:1 B5:4', 'A5:2 G5:1 F#5:1 F#5:2 E5:1 D5:1 E5:2 F#5:1 G5:1 A5:4',
  'D5:2 E5:1 F#5:1 F#5:2 G5:1 A5:1 A5:2 B5:1 C#6:1 D6:4', 'C#6:2 B5:1 A5:1 A5:2 G5:1 F#5:1 E5:2 D5:1 C#5:1 A4:4'];
const ttChorus = [...ttHook, ttHook[0], ttHook[1], 'E5:2 F#5:1 G5:1 G5:2 A5:1 B5:1 B5:2 C#6:1 D6:1 E6:4', 'C#6:2 A#5:1 F#5:1 F#5:2 E5:1 C#5:1 C#5:2 A#4:1 C#5:1 F#5:4'];
const ttIntro = [ttHook[0], ttHook[1], ttHook[2], 'C#6:2 B5:1 A5:1 A5:2 G5:1 F#5:1 E5:2 D5:1 C#5:1 E5:4'];   // Takt 4 führt zur Strophe
const ttV = ['D5:2 D5:2 C#5:2 D5:2 F#5:4 E5:2 D5:2', 'D5:2 D5:2 C#5:2 D5:2 B4:4 A4:2 B4:2', 'D5:2 D5:2 E5:2 F#5:2 G5:4 F#5:2 E5:2', 'E5:2 E5:2 F#5:2 G5:2 A5:4 G5:2 E5:2'];
const ttVerse = [...ttV, ttV[0], ttV[1], 'B4:2 B4:2 C#5:2 D5:2 E5:4 F#5:2 G5:2', 'F#5:2 E5:2 C#5:2 A#4:2 F#4:4 A#4:4'];
const ttBridge = ['D5:8 B4:8', 'E5:8 C#5:8', 'F#5:8 D5:8', 'C#5:8 A#4:8'];
const heartbeat = (c) => pat(tones(c, 'B3'), '0.00 ..1. 0.00 ..2.');       // Herzklopf-Ostinato (Sägezahn hinter Tiefpass)
const CHAIN = dr('..j. ..j. ..jj ..j.');                                      // Kettenrasseln der Seilbahn
const TOWER = [K4, CL, H8, CHAIN];

// ================================================================ Rammfisch-Riff (7-6, unter Wasser) ====
// Es-Dur, 132 BPM, gedämpft und tanzbar. Intro Es B c B (die Wasserglocken spielen die Hook) | Strophe c As Es B | c As f B
// (vi–IV–I–V, Blubbern, dumpfe Rammstöße) | Refrain Es B c As | Es B As B (I–V–vi–IV | I–V–IV–V) | Überleitung As B c B.
// Alles hinter Tiefpass, viel Hall. Hook „Blubb-blubb“: zwei Sechzehntel auf einem Ton, Luft holen, dann gemütlich drei
// Stufen hinauf zum langen Ton („G-g . es F G BBB“).
const rrProg = ['Eb', 'Bb', 'Cm', 'Bb', 'Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'Bb', 'Eb', 'Bb', 'Cm', 'Ab', 'Eb', 'Bb', 'Ab', 'Bb', 'Ab', 'Bb', 'Cm', 'Bb'];
const rrHook = ['G5:1 G5:1 -:2 Eb5:2 F5:2 G5:2 Bb5:6', 'Ab5:1 Ab5:1 -:2 F5:2 G5:2 Ab5:2 F5:6',
  'Eb5:1 Eb5:1 -:2 C5:2 D5:2 Eb5:2 G5:6', 'F5:1 F5:1 -:2 Ab5:2 G5:2 F5:2 Eb5:6'];
const rrChorus = [...rrHook, rrHook[0], rrHook[1], 'C6:1 C6:1 -:2 Ab5:2 Bb5:2 C6:2 Eb6:6', 'D6:1 D6:1 -:2 Bb5:2 Ab5:2 F5:2 D5:6'];
const rrIntro = [rrHook[0], rrHook[1], rrHook[2], 'D5:1 D5:1 -:2 Bb4:2 C5:2 D5:2 Bb4:6'];   // Takt 4 führt zur Strophe
const rrV = ['G4:2 C5:2 -:2 C5:2 Eb5:2 D5:2 C5:4', 'Ab4:2 C5:2 -:2 C5:2 Eb5:2 F5:2 Eb5:4', 'Bb4:2 Eb5:2 -:2 Eb5:2 G5:2 F5:2 Eb5:4', 'F5:2 D5:2 -:2 Bb4:2 D5:2 C5:2 Bb4:4'];
const rrVerse = [...rrV, rrV[0], rrV[1], 'Ab4:2 C5:2 -:2 C5:2 F5:2 Eb5:2 C5:4', 'D5:2 F5:2 -:2 Bb4:2 D5:2 Eb5:2 F5:4'];
const rrBridge = ['C5:8 Eb5:8', 'D5:8 F5:8', 'Eb5:8 G5:8', 'F5:8 D5:8'];
const bubbles = (c) => pat(tones(c, 'Eb4'), '.0.. 1..2 .... 0.1.');         // Blubbern (Sinus gleitet aufwärts)
const pearls = (c) => pat(tones(c, 'G4'), '..0. ..1. ..2. ..1.');            // Perlen auf der „und“
const RAM = dr('.... ..d. .... d.d.');                                        // dumpfe Rammstöße
const REEF = [K4, CL, H8, RAM];

// ================================================================ Vulkan-See (7-7) ====
// e-Moll, 140 BPM, mächtig. Intro e C G H (die Vulkan-Hörner spielen die Hook, Taiko, Grollen) | Strophe e e C D | e e a H
// (i–VI–VII | i–iv–V, breite Viertel) | Refrain e C G D | e C a H (i–VI–III–VII | i–VI–iv–V, Taiko durchgehend) |
// Überleitung C D e H. Hook „Ausbruch“: zwei schwere Viertel, ein Sechzehntel-Lauf schießt zum langen Gipfelton, die
// Antwort rollt hinab („E E fis-g-a-h EEE d | C C h-a-g-e AAA g“).
const voProg = ['Em', 'C', 'G', 'B', 'Em', 'Em', 'C', 'D', 'Em', 'Em', 'Am', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B', 'C', 'D', 'Em', 'B'];
const voHook = ['E5:2 E5:2 F#5:1 G5:1 A5:1 B5:1 E6:6 D6:2', 'C6:2 C6:2 B5:1 A5:1 G5:1 E5:1 A5:6 G5:2',
  'D5:2 D5:2 E5:1 F#5:1 G5:1 A5:1 D6:6 C6:2', 'B5:2 B5:2 A5:1 G5:1 F#5:1 D5:1 G5:6 F#5:2'];
const voChorus = [...voHook, voHook[0], voHook[1], 'C5:2 C5:2 D5:1 E5:1 F#5:1 G5:1 C6:6 B5:2', 'A5:2 A5:2 G5:1 F#5:1 E5:1 D#5:1 F#5:6 D#5:2'];
const voIntro = [voHook[0], voHook[1], voHook[2], voChorus[7]];   // Takt 4 führt zur Strophe
const voV = ['B4:4 E5:2 E5:2 G5:4 F#5:2 E5:2', 'B4:4 E5:2 E5:2 D5:4 B4:2 D5:2', 'C5:4 E5:2 E5:2 G5:4 A5:2 G5:2', 'F#5:4 E5:2 D5:2 A4:4 D5:2 F#5:2'];
const voVerse = [...voV, voV[0], voV[1], 'C5:4 E5:2 E5:2 A5:4 G5:2 E5:2', 'D#5:4 F#5:2 A5:2 B5:4 A5:2 F#5:2'];
const voBridge = ['E5:8 G5:8', 'F#5:8 A5:8', 'G5:8 B5:8', 'A5:8 F#5:8'];
const TAIKO = dr('t..t ..t. tt.. t.t.');                                      // Taiko: DON . . DON . . DON . do-ko . DON . DON
const TAIKO_V = dr('t... ..t. .... t...');
const RUMBLE = (c, i) => ([0, 12, 20].includes(i) ? 'E3:16' : '-:16');       // Grollen (Riser abwärts)
const LAKE = [K4, CL, H8, TAIKO_V];

// ================================================================ Lava-Burg (7-Burg, Baron im Kampfwagen) ====
// c-Moll, 148 BPM, dramatisch. Intro c As B G (die Kirchenorgel spielt das Baron-Brummbär-Motiv aus course_boss, Lead
// Takt 5–8, unverändert) | Strophe c c f G | c c As G (i–iv–V, Kampfwagen-Galopp, Kettenrasseln) | Refrain c B As G |
// c B f G (i–VII–VI–V, Andalusische Kadenz | i–VII–iv–V; Orgel-Akkorde, Chor-Pad) | Überleitung As B c G (Chor-Stimme,
// Orgel, Riser über zwei Takte). Hook: 3+3+2-Stöße auf einem Ton mit oberer Nebennote, dann stufenweise hinab
// („G . . g . . as G F Es D“), die Antwort dieselbe Figur eine Quarte tiefer auf B („D . . d . . es D C F“); Takt 3 bringt
// die Hook auf As (Gipfel), Takt 4 die Dominante.
const kpProg = ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Cm', 'Fm', 'G', 'Cm', 'Cm', 'Ab', 'G', 'Cm', 'Bb', 'Ab', 'G', 'Cm', 'Bb', 'Fm', 'G', 'Ab', 'Bb', 'Cm', 'G'];
// Baron-Brummbär-Motiv: course_boss, Lead Takt 5–8 (Cm As B G) – Note für Note
const kpBaron = ['C5:2 -:1 C5:1 Eb5:2 C5:2 G5:3 F5:1 Eb5:2 D5:2', 'C5:2 -:1 C5:1 Eb5:2 C5:2 Ab5:3 G5:1 F5:2 Eb5:2',
  'D5:2 -:1 D5:1 F5:2 D5:2 Bb5:3 Ab5:1 G5:2 F5:2', 'G5:3 F5:1 Eb5:2 D5:2 B4:4 -:2 G4:1 B4:1'];
const kpHook = ['G5:3 G5:3 Ab5:2 G5:2 F5:2 Eb5:2 D5:2', 'D5:3 D5:3 Eb5:2 D5:2 C5:2 F5:4',
  'Ab5:3 Ab5:3 Bb5:2 Ab5:2 G5:2 F5:2 Eb5:2', 'F5:3 F5:3 Eb5:2 D5:2 B4:2 D5:2 F5:2'];
const kpChorus = [...kpHook, kpHook[0], kpHook[1], 'Ab5:3 Ab5:3 G5:2 F5:2 Eb5:2 D5:2 C5:2', 'B4:3 B4:3 C5:2 D5:2 F5:2 Eb5:2 D5:2'];
const kpV = ['C5:2 C5:1 C5:1 Eb5:2 Eb5:1 Eb5:1 G5:4 F5:2 Eb5:2', 'C5:2 C5:1 C5:1 Eb5:2 Eb5:1 Eb5:1 D5:4 C5:2 G4:2',
  'C5:2 C5:1 C5:1 F5:2 F5:1 F5:1 Ab5:4 G5:2 F5:2', 'D5:2 D5:1 D5:1 B4:2 B4:1 B4:1 G4:4 B4:2 D5:2'];
const kpVerse = [...kpV, kpV[0], kpV[1], 'C5:2 C5:1 C5:1 Eb5:2 Eb5:1 Eb5:1 Ab5:4 G5:2 F5:2', 'D5:2 D5:1 D5:1 F5:2 F5:1 F5:1 G5:4 -:4'];
const kpBridge = ['Eb5:8 C5:8', 'F5:8 D5:8', 'G5:8 Eb5:8', 'F5:8 D5:8'];
const kpChoir = ['C5:16', 'D5:16', 'Eb5:16', 'D5:8 B4:8'];                    // Chor-Stimme („Aah“) in der Überleitung
const PAUKE = dr('t... .... t.t. ....');
const RATTLE = dr('.j.j .j.j .j.j .jjj');                                     // Kettenrasseln des Kampfwagens
const KEEP = [K4, CL, H8, RATTLE];

// ================================================================ Karte Welt 7 ====
// g-Moll, 126 BPM, 16 Takte, bedrohlich-gemütlich. Strophe g F Es D | g F Es D (i–VII–VI–V, das Piano singt gebrochene
// Akkorde, Pizzicato auf der „und“) | Refrain g Es B F | g Es c D (i–VI–III–VII | i–VI–iv–V, weicher Lead schaukelt um den
// Grundton, Lava blubbert tief in den Phrasen-Pausen). Kick auf 1 und 3, fernes Grollen (tiefe Toms) am Phrasen-Ende.
// Die Strophe steigt Takt für Takt eine Stufe hinab (gebrochene Akkorde mit Durchgang).
const m7Prog = ['Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D', 'Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D'];
const m7Piano = ['G4:2 Bb4:2 D5:2 C5:2 Bb4:4 D5:4', 'C5:2 A4:2 F4:2 G4:2 A4:4 C5:4', 'Bb4:2 G4:2 Eb4:2 F4:2 G4:4 Bb4:4', 'A4:2 F#4:2 D4:2 E4:2 F#4:4 A4:4',
  'G4:2 Bb4:2 D5:2 C5:2 Bb4:4 D5:4', 'C5:2 A4:2 F4:2 G4:2 A4:4 C5:4', 'Bb4:2 G4:2 Eb4:2 F4:2 G4:4 Bb4:4', 'A4:2 C5:2 D5:2 C5:2 D5:4 -:4'];
const m7Lead = ['D5:3 G5:1 Bb5:4 A5:2 G5:2 F#5:2 G5:2', 'G5:3 Eb5:1 Bb4:4 -:2 C5:1 D5:1 Eb5:4', 'D5:3 F5:1 Bb5:4 A5:2 G5:2 F5:2 D5:2', 'F5:3 C5:1 A4:4 -:2 Bb4:1 C5:1 D5:4',
  'D5:3 G5:1 Bb5:4 A5:2 G5:2 F#5:2 G5:2', 'G5:3 Eb5:1 Bb4:4 -:2 C5:1 D5:1 Eb5:4', 'Eb5:3 G5:1 C6:4 Bb5:2 A5:2 G5:2 Eb5:2', 'F#5:3 D5:1 A4:4 -:2 A4:1 C5:1 D5:4'];
const lavaBlubb = (c) => pat(tones(c, 'G3'), '.... ..0. .... .1..');         // Lava blubbert tief (Sinus gleitet aufwärts)
const W7MAP = [KH, CL, H8O];

export const WORLD7_THEMES = {
  // Werfer-Festung (7-1, blaue Lava, Feuerstäbe, Pilzlingstürme): 142 BPM, d-Moll, 24 Takte, heroisch. Intro (d B C A): die
  // Fanfaren-Bläser spielen die Hook, Piano auf der „und“ | Strophe (d C B A | d C g A): Lead im Marsch-Punkt, Feuerbälle
  // fallen in die Phrasen-Pausen, Knistern | Refrain (d B C d | d B g A): Fanfaren-Hook, Bläser-Stöße, Rave-Piano 3-3-2,
  // Stabs, treibender Bass | Überleitung (B C d A): lange Töne über Bläser-Akkorden. Feuer-Whoosh vor jedem Abschnitt.
  course_fortfire: {
    bpm: 142,
    voice: {
      lead: { ...SYNTH, cutoff: 4800, volume: 0.16 },
      organ: { volume: 0.06, cutoff: 2600, gate: 0.9 },
      echo: { type: 'sawtooth', volume: 0.045, decay: 0.12, glide: 0.5, glideTime: 0.14 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11, cutoff: 5500, cutoffEnd: 1500 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07, noise: 0.12 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, jingle: { volume: 0.1, off: 0.08, duration: 0.05 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 120, volume: 0.36 } },
    fx: { lowpass: { echo: 2600 }, delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.28, send: { organ: 0.15, echo: 0.4, lead: 0.14, riser: 0.2 } } },
    lead: [...rest(4), ...ffVerse, ...ffChorus, ...ffBridge],
    organ: bySection(ffProg, SONG, {
      intro: (c, i) => ffIntro[i],
      chorus: (c) => chordBar(c, 'x__x __x_ .... ....', 'A3'),
      bridge: (c) => chordBar(c, LONG, 'A3'),
    }),
    echo: bySection(ffProg, SONG, { verse: fireball }),
    piano: bySection(ffProg, SONG, { intro: (c) => chordBar(c, OFF, 'A4'), chorus: (c) => chordBar(c, P332, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(ffProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(ffProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(3), '-:8 D4:8', ...rest(7), '-:8 D4:8', ...rest(3), '-:8 A3:8', ...rest(3), '-:8 D4:8', ...rest(3), 'D4:16'],
    bass: bySection(ffProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_DRIVE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... t.tt')]),
      ...groove(4, FORT, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, FORT, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CRACKLE, CR], [K4, CL, H8, CRACKLE], [K4, CL, H8], FILL_S,
    ],
  },

  // Dunkler Tempel (7-2, Kipp-Schaltfelder, Fackeln): 134 BPM, fis-Moll, 24 Takte, geheimnisvoll. Intro (fis h E Cis): die
  // Steinglocken spielen die Hook eine Oktave tiefer | Strophe (fis fis D E | fis fis h Cis): Lead tief, Tropfen, Kipp-
  // Schalter klacken, Steinglocke alle vier Takte | Refrain (fis h E A | fis h D Cis): Ruf-und-Echo-Hook, Mechanik-Puls
  // auf der „und“, Piano, Stabs | Überleitung (D E fis Cis): lange Töne, die Tempelflöte singt darüber, Steinglocken.
  course_switchruins: {
    bpm: 134,
    voice: {
      lead: { ...SYNTH, cutoff: 4000, volume: 0.15 },
      bell: { type: 'triangle', volume: 0.13, decay: 1.2, ratio: 2.32, partial: 0.45 },
      whistle: { type: 'sine', volume: 0.08, vibrato: 18, rate: 4.5, slide: 2, attack: 0.12, gate: 0.95 },
      echo: { type: 'sine', volume: 0.05, decay: 0.15 },
      arp: { type: 'sawtooth', volume: 0.04, decay: 0.07 },
      piano: { volume: 0.08, cutoff: 3600 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 0.75 },
      riser: { volume: 0.06, noise: 0.06 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.28 }, tick: { freq: 1500, volume: 0.1, decay: 0.05 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 130, volume: 0.34 } },
    fx: { lowpass: { arp: 1800 }, delay: { steps: [3, 4], feedback: 0.48, lowpass: 2000, wet: 0.42, send: { bell: 0.55, lead: 0.28, echo: 0.6, whistle: 0.5, tick: 0.4, clap: 0.25, pad: 0.15 } } },
    bell: bySection(srProg, SONG, { intro: (c, i) => tr(srIntro, -12)[i], verse: STONE, bridge: (c) => `${tones(c, 'F#3')[0]}:16` }),
    lead: [...rest(4), ...srVerse, ...srChorus, ...srBridge],
    whistle: [...rest(20), '-:8 C#6:8', '-:8 D6:8', '-:8 E6:8', '-:8 C#6:8'],
    echo: bySection(srProg, SONG, { verse: drop }),
    arp: bySection(srProg, SONG, { chorus: (c) => pat(tones(c, 'F#4'), '..0. ..1. ..2. ..1.') }),
    piano: bySection(srProg, SONG, { chorus: (c) => chordBar(c, OFF, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    stabs: bySection(srProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(srProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C#4:16'],
    bass: bySection(srProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, RUIN, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, RUIN, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, SWITCH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, SWITCH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, SWITCH], FILL_S,
    ],
  },

  // Sprint (7-3, 100 s, Boost-Pfeile, Stachelwalzen): 150 BPM, E-Dur, 24 Takte, treibend. Intro (E cis A H): das Piano spielt
  // die Countdown-Hook in Oktaven, Sechzehntel-Hats | Strophe (cis A E H | cis A fis H): Lead im Arpeggio-Zickzack, Uhr-
  // Ticken, Pumpbass, Countdown-Piepser vor dem Refrain | Refrain (E cis A H | E cis fis H): Countdown-Hook, Renn-Arpeggio,
  // Galopp-Bass, Stabs, Piano auf der „und“ | Überleitung (A H cis H): lange Töne, Riser über zwei Takte, Piepser in den Loop.
  course_redhot: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 5200, volume: 0.17 },
      piano: { volume: 0.1 },
      bell: { type: 'square', volume: 0.045, decay: 0.12, ratio: 2, partial: 0.2 },
      arp: { type: 'sawtooth', volume: 0.04, decay: 0.05 },
      stabs: { volume: 0.12, cutoff: 5500, cutoffEnd: 1400 },
      pad: { volume: 0.045, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tick: { freq: 2400, volume: 0.1, decay: 0.04 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 100, volume: 0.4 } },
    fx: { lowpass: { arp: 3200 }, delay: { steps: 3, feedback: 0.28, lowpass: 3000, wet: 0.25, send: { lead: 0.12, bell: 0.3, arp: 0.2 } } },
    lead: [...rest(4), ...rhVerse, ...rhChorus, ...rhBridge],
    piano: bySection(rhProg, SONG, { intro: (c, i) => octaves(tr(rhIntro, -12))[i], chorus: (c) => chordBar(c, OFF, 'G#4'), bridge: (c) => chordBar(c, LONG, 'G#4') }),
    bell: rhProg.map((c, i) => ([11, 23].includes(i) ? BEEPS : [0, 12].includes(i) ? GO : '-:16')),
    arp: bySection(rhProg, SONG, { chorus: (c) => pat(tones(c, 'E4'), '0.1. 2.1. 0.1. 2.1.') }),
    stabs: bySection(rhProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(rhProg, SONG, { verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 B3:8', ...rest(10), 'E3:16', 'B3:14 -:2'],
    bass: bySection(rhProg, SONG, { intro: (c) => bassBar(c, B_DRIVE), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, RACE, [K4, CL, H8, TICK, dr('.... .... ..tt tttt')]),
      ...groove(4, RACE, [K4, CL, dr('h.h. h.h. h.h. ....'), TICK, dr('.... .... ssss ssss')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, TICK], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Schubser-Band (7-4, blaue Lava, Pfeilplattformen, Schubser): 138 BPM, F-Dur, 24 Takte, stampfend. Intro (F C d B): die
  // Bläser-Stabs spielen die Hook in Oktaven | Strophe (d B F C | d B g C): Lead in Achteln, Stampf-Trommel, stampfender
  // Oktav-Bass, Pluck auf der „und“ | Refrain (F C d B | F C B C): Stampf-Hook, Bläser-Stabs, Piano auf der „und“ |
  // Überleitung (B C d C): lange Töne, Bläser-Akkorde, Riser.
  course_bluebelt: {
    bpm: 138,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.16 },
      stabs: { volume: 0.12, cutoff: 3800, cutoffEnd: 1600 },
      piano: { volume: 0.08 },
      arp: { type: 'triangle', volume: 0.07, decay: 0.08 },
      pad: { volume: 0.05 },
      bass: { volume: 0.18 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, doum: { freq: 70, volume: 0.34, decay: 0.22 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 110, volume: 0.38 } },
    fx: { delay: { steps: 3, feedback: 0.28, lowpass: 3000, wet: 0.25, send: { lead: 0.14, stabs: 0.12, arp: 0.25 } } },
    lead: [...rest(4), ...bbVerse, ...bbChorus, ...bbBridge],
    stabs: bySection(bbProg, SONG, {
      intro: (c, i) => octaves(tr(bbIntro, -12))[i],
      verse: (c) => chordBar(c, '.... ..x. .... ..x.'),
      chorus: (c) => chordBar(c, BRASS),
      bridge: (c) => chordBar(c, 'x... .... x... ....'),
    }),
    piano: bySection(bbProg, SONG, { chorus: (c) => chordBar(c, OFF, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    arp: bySection(bbProg, SONG, { verse: (c) => pat(tones(c, 'F4'), '..0. ..1. ..2. ..1.') }),
    pad: bySection(bbProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(bbProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_STOMP), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8, STOMP], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, BELT, [K4, CL, H8, STOMP, dr('.... .... .... tttt')]),
      ...groove(4, BELT, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, STOMP], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, STOMP], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, STOMP], FILL_S,
    ],
  },

  // Fluchtturm (7-5, vertikal, Seilbahn, Giftnebel und steigende Lava): 146 BPM, h-Moll, 24 Takte, aufsteigend. Intro
  // (h A D A): das Turm-Glockenspiel spielt die Hook | Strophe (h h G A | h h e Fis): Lead mit pochenden Tonwiederholungen,
  // Herzklopf-Ostinato, Kettenrasseln, die Lava steigt (Riser alle vier Takte) | Refrain (h A D A | h A e Fis): Galopp-
  // Treppe, Piano auf der „und“, Stabs | Überleitung (G A h Fis): lange Töne, die Alarm-Sirene steigt, Riser über zwei Takte.
  course_traptower: {
    bpm: 146,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      bell: { type: 'sine', volume: 0.11, decay: 0.35, ratio: 3.0, partial: 0.35 },
      whistle: { type: 'triangle', volume: 0.07, vibrato: 45, rate: 7, slide: 3, attack: 0.1, gate: 0.95 },
      arp: { type: 'sawtooth', volume: 0.045, decay: 0.06 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07, noise: 0.06 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, jingle: { volume: 0.12, off: 0.1, duration: 0.08 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 110, volume: 0.4 } },
    fx: { lowpass: { arp: 2400 }, delay: { steps: 3, feedback: 0.3, lowpass: 3200, wet: 0.26, send: { bell: 0.4, whistle: 0.4, lead: 0.12 } } },
    bell: [...ttIntro, ...rest(20)],
    lead: [...rest(4), ...ttVerse, ...ttChorus, ...ttBridge],
    whistle: [...rest(20), '-:8 F#5:8', '-:8 G5:8', '-:8 A5:8', '-:8 A#5:8'],
    arp: bySection(ttProg, SONG, { verse: heartbeat, chorus: (c) => pat(tones(c, 'B3'), '..0. ..1. ..2. ..1.') }),
    piano: bySection(ttProg, SONG, { chorus: (c) => chordBar(c, OFF, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    stabs: bySection(ttProg, SONG, { intro: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(ttProg, SONG, { verse: (c) => padBar(c, 'D3'), chorus: (c) => padBar(c, 'D3'), bridge: (c) => padBar(c, 'D3') }),
    riser: [...rest(7), '-:8 F#3:8', ...rest(3), '-:8 F#3:8', ...rest(3), '-:8 F#3:8', ...rest(3), '-:8 F#3:8', ...rest(2), 'B3:16', 'F#3:14 -:2'],
    bass: bySection(ttProg, SONG, { intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_DRIVE), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, TOWER, [K4, CL, H8, dr('.... .... ..tt tttt')]),
      ...groove(4, TOWER, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, H8, CHAIN, CR], [K4, CL, H8, CHAIN], [K4, CL, HH], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Rammfisch-Riff (7-6, unter Wasser, Vulkaninsel): 132 BPM, Es-Dur, 24 Takte, gedämpft und tanzbar. Intro (Es B c B): die
  // Wasserglocken spielen die Hook | Strophe (c As Es B | c As f B): Lead tief, Blubbern, dumpfe Rammstöße | Refrain (Es B c
  // As | Es B As B): „Blubb-blubb“-Hook, Perlen auf der „und“, gedämpftes Piano, Stabs | Überleitung (As B c B): lange
  // Töne, Blubbern, Wasser-Riser. Piano, Pad, Stabs und Perlen hinter Tiefpass, Lead weich, viel Hall – trotzdem
  // Four-on-the-floor.
  course_rammreef: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 2600, volume: 0.17 },
      bell: { type: 'sine', volume: 0.12, decay: 0.5, ratio: 2.0, partial: 0.25 },
      echo: { type: 'sine', volume: 0.07, decay: 0.08, glide: 1.8, glideTime: 0.06 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.1 },
      piano: { volume: 0.1 },
      stabs: { volume: 0.12 },
      pad: { volume: 0.06 },
      bass: { volume: 0.19, cutoff: 700 },
      riser: { volume: 0.06, noise: 0.1 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.26 }, doum: { freq: 90, volume: 0.3, decay: 0.18 }, hat: { volume: 0.18, off: 0.12 }, tom: { freq: 120, volume: 0.36 } },
    fx: { lowpass: { piano: 1500, pad: 1400, stabs: 1600, arp: 1800 }, delay: { steps: [3, 4], feedback: 0.45, lowpass: 1800, wet: 0.4, send: { bell: 0.5, lead: 0.25, echo: 0.6, arp: 0.3 } } },
    bell: [...rrIntro, ...rest(20)],
    lead: [...rest(4), ...rrVerse, ...rrChorus, ...rrBridge],
    echo: bySection(rrProg, SONG, { verse: bubbles, bridge: bubbles }),
    arp: bySection(rrProg, SONG, { chorus: pearls }),
    piano: bySection(rrProg, SONG, { intro: (c) => chordBar(c, OFF, 'G4'), chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(rrProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(rrProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'Bb3:16'],
    bass: bySection(rrProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, REEF, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, REEF, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HOF, RAM], [K4, CL, HOF, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HOF, RAM], [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, RAM], FILL_S,
    ],
  },

  // Vulkan-See (7-7, steigende/sinkende Lava, Fontänen, Lavadrachen): 140 BPM, e-Moll, 24 Takte, mächtig. Intro (e C G H):
  // die Vulkan-Hörner spielen die Hook, Taiko, Grollen | Strophe (e e C D | e e a H): Lead in breiten Vierteln, Taiko auf
  // 1 und 2+, Stabs | Refrain (e C G D | e C a H): Ausbruch-Hook, Taiko durchgehend, Stabs auf 1, 2+ und 4+, Piano auf
  // der „und“ | Überleitung (C D e H): lange Töne über Hörner-Akkorden, Grollen, Taiko-Wirbel in den Loop.
  course_volcano: {
    bpm: 140,
    voice: {
      lead: { ...SYNTH, cutoff: 4400, volume: 0.16 },
      organ: { volume: 0.06, cutoff: 1600, gate: 0.92 },
      stabs: { volume: 0.13, cutoff: 6000, cutoffEnd: 1500 },
      piano: { volume: 0.09 },
      pad: { volume: 0.06, bright: 0.9 },
      bass: { volume: 0.18 },
      riser: { volume: 0.08, glide: 0.5, noise: 0.1 },
    },
    kit: { kick: { volume: 0.56 }, clap: { volume: 0.3 }, tom: { freq: 72, volume: 0.46 }, snare: { volume: 0.24 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: [3, 4], feedback: 0.32, lowpass: 2400, wet: 0.28, send: { organ: 0.15, lead: 0.14, tom: 0.15, riser: 0.3 } } },
    lead: [...rest(4), ...voVerse, ...voChorus, ...voBridge],
    organ: bySection(voProg, SONG, { intro: (c, i) => voIntro[i], bridge: (c) => chordBar(c, LONG, 'G3') }),
    stabs: bySection(voProg, SONG, {
      intro: (c) => chordBar(c, 'x... .... .... ....', 'G3'),
      verse: (c) => chordBar(c, '.... ..x. .... ..x.'),
      chorus: (c) => chordBar(c, 'x... ..x. .... ..x.'),
    }),
    piano: bySection(voProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4') }),
    pad: bySection(voProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: voProg.map(RUMBLE),
    bass: bySection(voProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_DRIVE), bridge: (c, i) => bassBar(c, i < 3 ? B_HALF : 'L.H_ L.H_ .... ....') }),
    drums: [
      [K4, TAIKO, CR], [K4, TAIKO], [K4, TAIKO, CL], [K4, CL, dr('.... .... tttt tttt')],
      ...groove(4, LAKE, [K4, CL, H8, dr('t... .... ..tt tttt')]),
      ...groove(4, LAKE, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('t... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, TAIKO], [K4, CL, HH, dr('t..t .... tttt tttt')]),
      ...groove(4, [K4, CL, HH, TAIKO], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('t..t .... ..ss ssss')], false),
      [K4, TAIKO, CR], [K4, TAIKO], [K4, CL, TAIKO], [K4, dr('.... c... .... ....'), dr('t..t tt.. ssss ssss')],
    ],
  },

  // Lava-Burg (7-Burg, Lavablasen, Zugbrücke; Boss Baron Brummbär im Kampfwagen): 148 BPM, c-Moll, 24 Takte, dramatisch.
  // Intro (c As B G): die Kirchenorgel spielt das Baron-Brummbär-Motiv aus course_boss, Pauken, Galopp-Bass | Strophe (c c f
  // G | c c As G): Lead im Kampfwagen-Galopp, Kettenrasseln, Stabs auf der „und“ | Refrain (c B As G | c B f G): 3-3-2-Hook,
  // Orgel-Akkorde, Stabs, Piano auf der „und“, treibender Bass | Überleitung (As B c G): lange Töne, die Chor-Stimme singt
  // darunter, Orgel-Akkorde, Pauken, Riser über zwei Takte. Chor-Pad in allen Takten.
  course_keep: {
    bpm: 148,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.17 },
      organ: { volume: 0.06, cutoff: 2200 },
      whistle: { type: 'triangle', volume: 0.07, vibrato: 12, rate: 5, slide: 0, attack: 0.25, gate: 0.98 },
      stabs: { volume: 0.13, cutoff: 6000, cutoffEnd: 1600 },
      piano: { volume: 0.09 },
      pad: { volume: 0.055, bright: 0.85 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tom: { freq: 95, volume: 0.42 }, snare: { volume: 0.24 }, jingle: { volume: 0.09, off: 0.07, duration: 0.05 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: [3, 4], feedback: 0.34, lowpass: 2400, wet: 0.3, send: { organ: 0.2, whistle: 0.35, pad: 0.2, lead: 0.14, tom: 0.15 } } },
    lead: [...rest(4), ...kpVerse, ...kpChorus, ...kpBridge],
    organ: bySection(kpProg, SONG, {
      intro: (c, i) => kpBaron[i],
      chorus: (c) => chordBar(c, LONG, 'G3'),
      bridge: (c) => chordBar(c, 'x_______ ....x___', 'G3'),
    }),
    whistle: [...rest(20), ...kpChoir],
    stabs: bySection(kpProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    piano: bySection(kpProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4') }),
    pad: kpProg.map((c) => padBar(c)),
    riser: [...rest(11), '-:8 G3:8', ...rest(10), 'G3:16', 'C4:14 -:2'],
    bass: bySection(kpProg, SONG, { intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_GALLOP), chorus: (c) => bassBar(c, B_DRIVE), bridge: (c, i) => bassBar(c, i < 3 ? B_GALLOP : 'L.H_ L.H_ .... ....') }),
    drums: [
      [K4, PAUKE, CR], [K4, PAUKE], [K4, PAUKE, CL], [K4, CL, dr('.... .... tttt tttt')],
      ...groove(4, KEEP, [K4, CL, H8, dr('t... .... ..tt tttt')]),
      ...groove(4, KEEP, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('t... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, PAUKE], [K4, CL, HH, dr('t... .... tttt tttt')]),
      ...groove(4, [K4, CL, HH, PAUKE], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('t... .... ..ss ssss')], false),
      [K4, PAUKE, CR], [K4, PAUKE], [K4, CL, PAUKE], [K4, dr('.... c... .... ....'), dr('tt.. tt.. ssss ssss')],
    ],
  },

  // Weltkarte Welt 7: 126 BPM, g-Moll, 16 Takte, bedrohlich-gemütlich. Strophe (g F Es D | g F Es D): das Piano singt
  // gebrochene Akkorde, Pluck auf der „und“ | Refrain (g Es B F | g Es c D): weicher Lead schaukelt, Piano auf der „und“,
  // Lava blubbert tief in den Phrasen-Pausen. Kick auf 1 und 3, Clap auf 2 und 4, fernes Grollen (tiefe Toms) am
  // Phrasen-Ende.
  course_world7_map: {
    bpm: 126,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 2800, volume: 0.17 },
      piano: { volume: 0.12, cutoff: 3800 },
      echo: { type: 'sine', volume: 0.07, decay: 0.12, glide: 1.6, glideTime: 0.08 },
      arp: { type: 'triangle', volume: 0.07, decay: 0.08 },
      pad: { volume: 0.05, bright: 0.8 },
      bass: { cutoff: 600 },
    },
    kit: { hat: { volume: 0.24, off: 0.15 }, tom: { freq: 80, volume: 0.32 } },
    fx: { delay: { steps: 3, feedback: 0.32, lowpass: 2800, wet: 0.3, send: { piano: 0.3, lead: 0.2, echo: 0.4 } } },
    piano: [...m7Piano, ...m7Prog.slice(8).map((c) => chordBar(c, OFF, 'D4'))],
    lead: [...rest(8), ...m7Lead],
    echo: m7Prog.map((c, i) => (i < 8 ? '-:16' : lavaBlubb(c))),
    arp: m7Prog.map((c, i) => (i < 8 ? pat(tones(c, 'D4'), '..0. ..1. ..2. ..1.') : '-:16')),
    pad: m7Prog.map((c) => padBar(c)),
    bass: m7Prog.map((c) => bassBar(c, B_HALF)),
    drums: [[...W7MAP, CR], W7MAP, W7MAP, [KH, CL, H8O, dr('.... .... .... .ttt')], W7MAP, W7MAP, W7MAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...W7MAP, CR], W7MAP, W7MAP, [KH, CL, H8O, dr('.... .... .... .ttt')], W7MAP, W7MAP, W7MAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')]],
  },
};
