// Kurs-Themen Welt 6 „Wolkeninseln“ (Himmel/Wolken, Wasser; Level 6-1 … 6-C) – eigene Kompositionen im Stil des
// 90er-Eurodance (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md) geschrieben, Maßstab Welt 1 und Welt 5: jedes Thema ist ein Lied
// in Dur oder Moll – Intro (Hook auf einer Farb-Stimme) → Strophe (tiefer, ruhiger) → Refrain (höher, zweitaktige Hook
// A A' A A'') → Überleitung (Breakdown, lange Töne, Riser) –, Eurodance-Akkordfolgen, der Lead-Synth trägt die Melodie
// fast durchgehend, Off-Beat-Stabs, Piano, Pad, Oktav-Bass, Four-on-the-floor. Die Welt-Farbe kommt nur aus dem Klang;
// in der Fernost-Halle ist die Pentatonik Farbe der Melodie über gewöhnlicher Moll-Harmonik (i–VI–III–VII).
//
// Hook-Profile (tests/audio.mjs vergleicht sie mit allen Themen der Welten 1–6 und der Halloween-Welt – Einsatz +
// Intervall und Kontur ohne Rhythmus):
//   Glasröhren   „Röhrenpost“: Anlauf über zwei Sechzehntel zum langen Ton, Luft holen, dann ploppen Sechzehntel-Paare
//                („a-g A“) wie Kugeln aus der Röhre; die Antwort sinkt und ploppt zurück
//   Geisterschiff Schaukeln im punktierten Schunkel-Rhythmus: Grundton – Quarte tiefer – zurück, dann die Terz hinauf und
//                einen Schritt zurück, das Schiff legt sich in die andere Richtung
//   Fernost      pentatonischer Fächer: Wechselnote unter dem Ton („fis-e-FIS“), Sprung zur Quinte, langer Gipfel, die
//                Antwort fällt pentatonisch zurück
//   Dschungel    „ba-NA-na“-Hüpfer: Achtel, zwei Sechzehntel abwärts, Absprung zur Quarte tiefer, dann über eine
//                Sechzehntel-Synkope („d-f . g“) hinauf zum langen Ton – wie Lianen-Schwingen
//   Wind-Schnee  „Bimmel“-Hook: langer Ton, zwei Glöckchen-Sechzehntel auf demselben Ton, Schritt; abwärts im Ruf, aufwärts
//                in der Antwort
//   Maschinenhalle Stampfen im Stakkato („da-da . da . da . DA“), dann rollt die Phrase wie ein Förderband hinab
//   Wuschel-Flucht Kletter-Zickzack: zwei Schritte hinauf, einer zurück, Takt für Takt höher – die Flucht nach oben; die
//                Antwort rutscht stufenweise ab
//   Würfelblase  Wabbel-Terzen in Sechzehnteln („d-b-d-b“) wie zitterndes Gelee, dann die Quarte hinauf mit Leitton-Drehung
//                (fis – a – G)
//   Karte        schwebend: Anlauf über Quarte und Terz zum Gipfel, sanftes Schaukeln darum, die Antwort atmet aus
// Beim Komponieren aufgefallen und ersetzt: eine Schunkel-Hook mit Tonwiederholung und kleiner Terz glich dem Kopf des
// Baron-Brummbär-Motivs (course_boss, 63 %), eine zweite course_tank (79 %); die erste Glasröhren-Hook hatte die Kontur
// von course_skyway und course_cave (57 %), die erste Fabrik-Hook den Rhythmus von course_cave (53 %), die erste
// Wind-Hook (fallende Terzen-Zickzacks) das Profil der Dorf-Hook (course_candyvillage), die erste Karten-Hook die Kontur
// von course_bluelava (56 %).
//
// Welt-Farbe nur über Klang: Glas-Glocken mit hohem, unharmonischem Teilton, gläserne Tropfen und Röhren-Plopp
// (Glasröhren), Akkordeon (gedämpfte Rechteck-Orgel), Schiffsglocke im Doppelschlag („Glasen“), knarrende Planken und
// Geisterstimme (Geisterschiff), Bambusflöte mit Gleiten und Vibrato, Koto (gezupfter Sägezahn hinter Tiefpass), Gong
// und Holzblock (Fernost-Halle), Marimba, Congas, Bongos, Schüttelrohr, Urwald-Trommeln und Vogel-Zwitschern
// (Dschungel), Glöckchen, Schlittenschellen, Wind-Pad und Windböen-Riser mit Rauschen (Wind-Schnee), Amboss, Metall-
// Klirren und Förderband-Ostinato, Dampf-Riser (Maschinenhalle), Wuschel-Brummen, Spitzhacken-Ticken und dumpfe
// Quetscher (Wuschel-Mine), Zirkus-Orgel, Pauken und Gelee-Blubbern (Würfelblase), Glas-Windspiel (Karte).

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

// ================================================================ Glasröhren-Bergland ====
// G-Dur, 140 BPM, luftig. Intro G h C D (die Glas-Glocken spielen die Hook) | Strophe e C G D | e C a D (vi–IV–I–V) |
// Refrain G h C D | G h a D (I–iii–IV–V) | Überleitung C D e D. Hook „Röhrenpost“: „h-d G HAAA . a-g A D“ – Anlauf zum
// langen Ton, Luft holen, Sechzehntel-Paare ploppen; die Antwort sinkt und ploppt zurück.
const cpProg = ['G', 'Bm', 'C', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D', 'G', 'Bm', 'C', 'D', 'G', 'Bm', 'Am', 'D', 'C', 'D', 'Em', 'D'];
const cpHook = ['B4:1 D5:1 G5:2 B5:4 -:2 A5:1 G5:1 A5:2 D5:2', 'F#5:4 E5:1 D5:1 E5:2 -:2 D5:1 B4:1 D5:4',
  'C5:1 E5:1 G5:2 C6:4 -:2 B5:1 A5:1 B5:2 E5:2', 'F#5:4 E5:1 D5:1 E5:2 -:2 F#5:1 G5:1 A5:4'];
const cpChorus = [...cpHook, cpHook[0], cpHook[1], 'A4:1 C5:1 E5:2 A5:4 -:2 G5:1 F#5:1 G5:2 C5:2', 'F#5:4 E5:1 D5:1 E5:2 -:2 D5:1 E5:1 F#5:4'];
const cpIntro = [cpHook[0], cpHook[1], cpHook[2], 'F#5:4 E5:1 D5:1 E5:2 -:2 D5:1 C5:1 A4:4'];   // Takt 4 führt zur Strophe
const cpV = ['B4:2 D5:2 E5:3 D5:1 B4:4 -:2 G4:2', 'C5:2 D5:2 E5:3 D5:1 C5:4 -:2 E5:2', 'D5:2 E5:2 G5:3 F#5:1 D5:4 -:2 B4:2'];
const cpVerse = [...cpV, 'A4:2 B4:2 D5:2 E5:2 F#5:4 E5:2 D5:2', cpV[0], cpV[1], 'C5:2 D5:2 E5:3 G5:1 A5:4 -:2 G5:2', 'F#5:4 E5:2 D5:2 A4:2 B4:2 C5:4'];
const cpBridge = ['E5:8 G5:8', 'F#5:8 A5:8', 'G5:8 B5:8', 'A5:6 F#5:2 D5:4 -:4'];
const glassDrop = (c) => pat(tones(c, 'B5'), '.... .... .... 20..');      // gläserne Tropfen in der Phrasen-Pause
const glassArp = (c) => pat(tones(c, 'G5'), '0120 1201 0120 1201');      // Glas-Arpeggio in der Überleitung
const softOff = (c) => pat(tones(c, 'D4'), '..0. ..1. ..2. ..1.');
const PLOP = dr('.... .... .... ..d.');                                    // Röhren-Plopp
const PIPE = [K4, CL, HOF, PLOP];

// ================================================================ Geisterschiffe ====
// e-Moll, 132 BPM, schunkelnd. Intro e C G D (das Akkordeon spielt die Hook) | Strophe e e a H | e e C H (i–iv–V) |
// Refrain e C G D | e C a H (i–VI–III–VII | i–VI–iv–V) | Überleitung C D e H (die Geisterstimme summt dazu). Hook im
// punktierten Schunkel-Rhythmus (3+1 Sechzehntel): „E-h E-g Fis-e H“ – das Schiff schaukelt eine Quarte hinab und zurück,
// steigt zur Terz und legt sich auf die andere Seite.
const wrProg = ['Em', 'C', 'G', 'D', 'Em', 'Em', 'Am', 'B', 'Em', 'Em', 'C', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B', 'C', 'D', 'Em', 'B'];
const wrHook = ['E5:3 B4:1 E5:3 G5:1 F#5:3 E5:1 B4:4', 'E5:3 C5:1 E5:3 G5:1 A5:3 G5:1 E5:4',
  'D5:3 B4:1 D5:3 G5:1 F#5:3 E5:1 D5:4', 'F#5:3 D5:1 F#5:3 A5:1 G5:3 F#5:1 D5:4'];
const wrChorus = [...wrHook, wrHook[0], wrHook[1], 'E5:3 C5:1 E5:3 A5:1 G5:3 E5:1 C5:4', 'D#5:3 B4:1 D#5:3 F#5:1 A5:3 F#5:1 D#5:4'];
const wrV = ['B4:2 B4:2 G4:2 B4:2 E5:4 D5:2 B4:2', 'E5:2 E5:2 D5:2 E5:2 G5:4 F#5:2 E5:2', 'C5:2 C5:2 A4:2 C5:2 E5:4 D5:2 C5:2', 'B4:2 B4:2 D#5:2 F#5:2 A5:4 F#5:2 D#5:2'];
const wrVerse = [...wrV, wrV[0], wrV[1], 'C5:2 C5:2 E5:2 G5:2 E5:4 D5:2 C5:2', 'B4:2 D#5:2 F#5:2 D#5:2 B4:4 D#5:4'];
const wrBridge = ['G5:8 E5:8', 'A5:8 F#5:8', 'B5:8 G5:8', 'F#5:8 D#5:8'];
const GLASEN = (c, i) => (i % 4 ? '-:16' : 'B5:2 B5:14');   // Schiffsglocke im Doppelschlag, alle vier Takte
const CREAK = dr('.... ..x. .... ...x');                     // knarrende Planken
const SHIP = [K4, CL, H8, CREAK];

// ================================================================ Fernost-Halle ====
// h-Moll, 140 BPM. Intro h G D A (die Bambusflöte spielt die Hook, die Koto zupft) | Strophe h h G A | h h e Fis
// (i–VI–VII | i–iv–V; die Koto antwortet in den Phrasen-Pausen) | Refrain h G D A | h G e Fis (i–VI–III–VII | i–VI–iv–V)
// | Überleitung G A h Fis (die Flöte singt allein, Gong). Hook pentatonisch über Eurodance-Harmonik: „Fis-e-FIS a HAAA
// a e“ – Wechselnote unter dem Ton, Sprung zum Gipfel, die Antwort fällt pentatonisch zurück.
const feProg = ['Bm', 'G', 'D', 'A', 'Bm', 'Bm', 'G', 'A', 'Bm', 'Bm', 'Em', 'F#', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#', 'G', 'A', 'Bm', 'F#'];
const feHook = ['F#5:3 E5:1 F#5:2 A5:2 B5:4 A5:2 E5:2', 'F#5:3 E5:1 D5:2 E5:2 B4:4 D5:4',
  'A5:3 F#5:1 A5:2 B5:2 D6:4 B5:2 F#5:2', 'A5:3 F#5:1 E5:2 F#5:2 C#5:4 E5:4'];
const feChorus = [...feHook, feHook[0], feHook[1], 'E5:3 D5:1 E5:2 G5:2 B5:4 G5:2 E5:2', 'F#5:3 E5:1 C#5:2 E5:2 A#4:4 C#5:4'];
const feV = ['D5:2 B4:2 D5:2 E5:2 F#5:4 -:4', 'A5:2 F#5:2 E5:2 D5:2 B4:4 -:4', 'D5:2 B4:2 D5:2 E5:2 G5:4 -:4', 'E5:2 C#5:2 A4:2 C#5:2 E5:4 -:4'];
const feVerse = [...feV, feV[0], feV[1], 'E5:2 G5:2 E5:2 D5:2 B4:4 -:4', 'A#4:2 C#5:2 E5:2 C#5:2 F#5:4 -:4'];
const feBridge = ['D5:6 B4:2 D5:4 E5:4', 'E5:6 C#5:2 E5:4 F#5:4', 'F#5:6 D5:2 F#5:4 A5:4', 'A#5:6 F#5:2 C#5:4 E5:4'];   // Flöte allein
const koto = (c) => pat(tones(c, 'B4'), '0.1. 2.1. 0.2. 1.2.');
const kotoAnswer = (c) => pat(tones(c, 'D5'), '.... .... ..2. 1.0.');   // Koto in den Phrasen-Pausen der Strophe
const GONG = (c, i) => ([0, 4, 12, 20].includes(i) ? 'B2:16' : '-:16');
const WOODBLOCK = dr('...p ..p. ...p .p..');
const HALL = [K4, CL, H8, WOODBLOCK];

// ================================================================ Dschungel ====
// F-Dur, 136 BPM, verspielt. Intro F d B C (die Marimba spielt die Hook) | Strophe d B F C | d B g C (vi–IV–I–V) |
// Refrain F d B C | F d g C (I–vi–IV–V) | Überleitung B C d C (Vogel-Zwitschern). Hook „ba-NA-na“-Hüpfer: „F a-g F C
// d-f . g AAA“ – Sechzehntel-Paare abwärts, Absprung, Synkope, langer Ton; wie Lianen-Schwingen.
const juProg = ['F', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'Bb', 'C', 'Dm', 'C'];
const juHook = ['F5:2 A5:1 G5:1 F5:2 C5:2 D5:1 F5:1 -:1 G5:1 A5:4', 'A5:2 C6:1 Bb5:1 A5:2 F5:2 G5:1 A5:1 -:1 F5:1 D5:4',
  'D5:2 F5:1 E5:1 D5:2 Bb4:2 C5:1 D5:1 -:1 E5:1 F5:4', 'E5:2 G5:1 F5:1 E5:2 C5:2 D5:1 E5:1 -:1 F5:1 G5:4'];
const juChorus = [...juHook, juHook[0], juHook[1], 'Bb4:2 D5:1 C5:1 Bb4:2 G4:2 A4:1 Bb4:1 -:1 C5:1 D5:4', juHook[3]];
const juIntro = [juHook[0], juHook[1], juHook[2], 'E5:2 G5:1 F5:1 E5:2 C5:2 D5:1 C5:1 -:1 Bb4:1 A4:4'];   // Takt 4 führt zur Strophe
const juV = ['A4:2 D5:2 -:2 D5:2 F5:2 E5:2 D5:4', 'Bb4:2 D5:2 -:2 D5:2 F5:2 G5:2 F5:4', 'C5:2 F5:2 -:2 F5:2 A5:2 G5:2 F5:4', 'G5:2 E5:2 -:2 C5:2 E5:2 D5:2 C5:4'];
const juVerse = [...juV, juV[0], juV[1], 'Bb4:2 D5:2 -:2 G5:2 F5:2 E5:2 D5:4', 'C5:2 E5:2 -:2 G5:2 E5:2 D5:2 E5:4'];
const juBridge = ['D5:8 F5:8', 'E5:8 G5:8', 'F5:8 A5:8', 'G5:6 E5:2 C5:4 -:4'];
const marimbaOff = (c) => pat(tones(c, 'F4'), '0.2. .1.2 0.2. .1..');
const chirp = (c) => pat(tones(c, 'C7'), '.... ..2. .... .1.0');           // Vogel-Zwitschern (Sinus gleitet aufwärts)
const CONGA = dr('.... ..d. ..d. d.d.');
const BONGO = dr('..p. .p.. ..pp .p..');
const SHAKE = dr('j.j. j.j. j.j. j.j.');
const JUNGLE = [K4, CL, CONGA, BONGO, SHAKE];

// ================================================================ Wind-Schnee ====
// A-Dur, 134 BPM, hell und windig. Intro A E fis D (die Glöckchen spielen die Hook) | Strophe D E cis fis | D E h E
// (IV–V–iii–vi) | Refrain A E fis D | A E D E (I–V–vi–IV) | Überleitung D E fis E (Windböen). „Bimmel“-Hook: langer
// Ton, zwei Glöckchen-Sechzehntel auf einem Ton, Schritt – im Ruf abwärts („EEE cis-cis A HAAA gis-gis E“), in der
// Antwort aufwärts.
const swProg = ['A', 'E', 'F#m', 'D', 'D', 'E', 'C#m', 'F#m', 'D', 'E', 'Bm', 'E', 'A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'E', 'D', 'E', 'F#m', 'E'];
const swHook = ['E6:4 C#6:1 C#6:1 A5:2 B5:4 G#5:1 G#5:1 E5:2', 'E5:4 G#5:1 G#5:1 B5:2 C#6:4 B5:1 A5:1 G#5:2',
  'C#6:4 A5:1 A5:1 F#5:2 G#5:4 E5:1 E5:1 C#5:2', 'D5:4 F#5:1 F#5:1 A5:2 B5:4 A5:1 F#5:1 E5:2'];
const swChorus = [...swHook, swHook[0], swHook[1], 'D6:4 B5:1 B5:1 A5:2 F#5:4 E5:1 E5:1 D5:2', 'E5:4 G#5:1 G#5:1 B5:2 E6:4 D6:1 C#6:1 B5:2'];
const swV = ['F#5:2 E5:2 D5:4 -:2 A4:2 D5:2 E5:2', 'G#5:2 F#5:2 E5:4 -:2 B4:2 E5:2 F#5:2', 'G#5:2 F#5:2 E5:4 -:2 C#5:2 E5:2 G#5:2'];
const swVerse = [...swV, 'A5:2 G#5:2 F#5:4 -:4 E5:2 C#5:2', swV[0], swV[1], 'F#5:2 E5:2 D5:4 -:2 B4:2 D5:2 F#5:2', 'G#5:2 F#5:2 E5:4 -:2 G#5:2 B5:2 D6:2'];
const swBridge = ['F#5:8 A5:8', 'G#5:8 B5:8', 'A5:8 C#6:8', 'G#5:8 B5:8'];
const ice = (c) => pat(tones(c, 'E6'), '0... ..1. .2.. ....');             // Eiskristall-Glitzern
const snowOff = (c) => pat(tones(c, 'E4'), '..0. ..1. ..2. ..1.');
const SLEIGH = dr('j.jj j.jj j.jj j.jj');                                  // Schlittenschellen
const SNOW = [K4, CL, H8, SLEIGH];

// ================================================================ Maschinenhalle ====
// d-Moll, 144 BPM, mechanisch. Intro d B F C (das Piano spielt die Hook in Oktaven) | Strophe d d g A | d d B A (i–iv–V)
// | Refrain d B F C | d B g A (i–VI–III–VII | i–VI–iv–V) | Überleitung B C d A (Dampf-Riser). Hook: Stampfen im
// Stakkato „da-da . da . da . DA“, dann rollt die Phrase wie ein Förderband hinab; Amboss auf der „und“ von 4.
const faProg = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Dm', 'Gm', 'A', 'Dm', 'Dm', 'Bb', 'A', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Bb', 'C', 'Dm', 'A'];
const faHook = ['D5:1 D5:1 -:1 F5:1 -:1 A5:1 -:1 A5:1 G5:2 F5:2 E5:2 C5:2', 'D5:1 D5:1 -:1 F5:1 -:1 Bb5:1 -:1 Bb5:1 A5:4 F5:4',
  'C5:1 C5:1 -:1 F5:1 -:1 A5:1 -:1 A5:1 G5:2 F5:2 E5:2 C5:2', 'E5:1 E5:1 -:1 G5:1 -:1 C6:1 -:1 C6:1 Bb5:4 G5:4'];
const faChorus = [...faHook, faHook[0], faHook[1], 'D5:1 D5:1 -:1 G5:1 -:1 Bb5:1 -:1 Bb5:1 A5:2 G5:2 F5:2 D5:2', 'C#5:1 C#5:1 -:1 E5:1 -:1 A5:1 -:1 A5:1 G5:4 E5:4'];
const faIntro = [faHook[0], faHook[1], faHook[2], 'E5:1 E5:1 -:1 G5:1 -:1 C6:1 -:1 C6:1 Bb5:2 G5:2 E5:2 C5:2'];   // Takt 4 führt zur Strophe
const faV = ['A4:2 D5:2 D5:2 E5:2 F5:4 E5:2 D5:2', 'A4:2 D5:2 D5:2 E5:2 F5:4 A5:2 F5:2', 'D5:2 G5:2 G5:2 F5:2 D5:4 Bb4:2 G4:2', 'A4:2 C#5:2 C#5:2 D5:2 E5:4 -:4'];
const faVerse = [...faV, faV[0], faV[1], 'D5:2 F5:2 F5:2 E5:2 D5:4 Bb4:2 G4:2', 'A4:2 C#5:2 C#5:2 D5:2 E5:4 C#5:4'];
const faBridge = ['D5:8 F5:8', 'E5:8 G5:8', 'F5:8 A5:8', 'E5:8 C#5:8'];
const belt = (c) => pat(tones(c, 'A3'), '0.1. 0.2. 0.1. 0.2.');            // Förderband-Ostinato
const belt16 = (c) => pat(tones(c, 'A3'), '0101 0201 0101 0201');
const ANVIL = (c, i) => (i % 2 ? '-:14 A6:2' : '-:16');                    // Amboss auf der „und“ von 4, jeden zweiten Takt
const METAL = dr('...x ..x. ...x .xx.');                                     // Metall-Klirren
const FACTORY = [K4, CL, H8, METAL];

// ================================================================ Wuschel-Mine (vertikale Flucht) ====
// c-Moll, 150 BPM, treibend. Intro c As Es B (das Piano spielt die Hook in Oktaven) | Strophe c c As B | c c f G (i–VI–VII
// | i–iv–V, Achtel-Puls) | Refrain c As Es B | c As f G (i–VI–III–VII | i–VI–iv–V) | Überleitung As B c G (Riser über zwei
// Takte). Hook als Kletter-Zickzack in Sechzehnteln – zwei Schritte hinauf, einer zurück, bis zum langen Gipfelton –, die
// Antwort rutscht stufenweise ab.
const fmProg = ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G', 'Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G', 'Ab', 'Bb', 'Cm', 'G'];
const fmHook = ['G4:1 C5:1 Bb4:1 D5:1 C5:2 Eb5:2 D5:1 F5:1 Eb5:2 G5:4', 'Ab5:2 G5:2 F5:2 Eb5:2 C5:4 -:2 Eb5:2',
  'Bb4:1 Eb5:1 D5:1 F5:1 Eb5:2 G5:2 F5:1 Ab5:1 G5:2 Bb5:4', 'C6:2 Bb5:2 Ab5:2 G5:2 F5:4 -:2 D5:2'];
const fmChorus = [...fmHook, fmHook[0], fmHook[1], 'C5:1 F5:1 Eb5:1 G5:1 F5:2 Ab5:2 G5:1 Bb5:1 Ab5:2 C6:4', 'B5:2 Ab5:2 G5:2 F5:2 D5:4 -:2 B4:2'];
const fmV = ['C5:2 C5:2 Eb5:2 C5:2 G5:4 F5:2 Eb5:2', 'D5:2 D5:2 Eb5:2 F5:2 G5:4 Eb5:2 C5:2', 'C5:2 C5:2 Eb5:2 F5:2 Ab5:4 G5:2 F5:2', 'D5:2 D5:2 F5:2 G5:2 F5:4 Eb5:2 D5:2'];
const fmVerse = [...fmV, fmV[0], fmV[1], 'C5:2 C5:2 F5:2 G5:2 Ab5:4 G5:2 F5:2', 'D5:2 B4:2 D5:2 F5:2 G5:4 D5:2 B4:2'];
const fmBridge = ['C5:8 Eb5:8', 'D5:8 F5:8', 'Eb5:8 G5:8', 'D5:8 B4:8'];
const fuzz = (c) => pat(tones(c, 'C4'), '0.0. 0.1. 0.0. 0.2.');            // Wuschel-Brummen
const PICKAXE = dr('...x .... ..x. ...x');
const CRUSH = dr('.... .... .... t...');                                     // Quetschblock
const ESCAPE = [K4, CL, HH, PICKAXE];

// ================================================================ Würfelblase (Zirkuszelt) ====
// g-Moll, 146 BPM, dramatisch. Intro g Es B F (die Zirkus-Orgel spielt die Hook, Pauken) | Strophe g g c D | g g Es D
// (i–iv–V, Marsch-Achtel) | Refrain g Es B F | g Es c D (i–VI–III–VII | i–VI–iv–V) | Überleitung Es F g D (Orgel-
// Akkorde, Riser über zwei Takte). Hook: Wabbel-Terzen in Sechzehnteln „d-b-d-b D“ (zitterndes Gelee), dann die Quarte
// hinauf und die Leitton-Drehung „fis – a – G“.
const bbProg = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Gm', 'Cm', 'D', 'Gm', 'Gm', 'Eb', 'D', 'Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D', 'Eb', 'F', 'Gm', 'D'];
const bbHook = ['D5:1 Bb4:1 D5:1 Bb4:1 D5:2 G5:2 F#5:2 A5:2 G5:4', 'G5:1 Eb5:1 G5:1 Eb5:1 G5:2 Bb5:2 A5:2 G5:2 Eb5:4',
  'F5:1 D5:1 F5:1 D5:1 F5:2 Bb5:2 A5:2 C6:2 Bb5:4', 'A5:1 F5:1 A5:1 F5:1 A5:2 C6:2 Bb5:2 G5:2 F5:4'];
const bbChorus = [...bbHook, bbHook[0], bbHook[1], 'Eb5:1 C5:1 Eb5:1 C5:1 Eb5:2 G5:2 F5:2 Eb5:2 C5:4', 'F#5:1 D5:1 F#5:1 D5:1 F#5:2 A5:2 C6:2 Bb5:2 A5:4'];
const bbV = ['Bb4:2 A4:2 Bb4:2 D5:2 G5:4 D5:4', 'Eb5:2 D5:2 C5:2 Bb4:2 D5:4 G4:4', 'C5:2 Bb4:2 C5:2 Eb5:2 G5:4 Eb5:4', 'D5:2 F#5:2 A5:2 F#5:2 D5:4 A4:4'];
const bbVerse = [...bbV, bbV[0], bbV[1], 'Eb5:2 D5:2 Eb5:2 G5:2 Bb5:4 G5:4', 'C6:2 A5:2 F#5:2 A5:2 D5:4 C5:4'];
const bbBridge = ['G5:8 Bb5:8', 'A5:8 C6:8', 'Bb5:8 D6:8', 'A5:8 F#5:8'];
const blubb = (c) => pat(tones(c, 'G4'), '..0. .... ..1. ..2.');             // Gelee-Blubbern (Sinus gleitet abwärts)
const PAUKEN = dr('t... ..t. .... t...');
const TENT = [K4, CL, HH];

// ================================================================ Karte Welt 6 ====
// D-Dur, 128 BPM, 16 Takte, gemütlich-luftig. Strophe D A h G | D A G A (das Piano singt, Pluck auf der „und“) | Refrain
// G A fis h | G A D D (IV–V–iii–vi, weicher Lead schwebt über Quarte und Terz zum Gipfel, das Glas-Windspiel tupft in die
// Phrasen-Enden). Kick auf 1 und 3.
const m6Prog = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D'];
const m6Piano = ['A4:4 D5:2 F#5:2 E5:6 D5:2', 'E5:4 C#5:2 A4:2 B4:6 C#5:2', 'D5:4 F#5:2 B5:2 A5:6 F#5:2', 'G5:4 F#5:2 E5:2 D5:4 B4:4',
  'A4:4 D5:2 F#5:2 E5:6 D5:2', 'E5:4 C#5:2 A4:2 B4:6 C#5:2', 'B4:4 D5:2 G5:2 F#5:6 E5:2', 'E5:4 C#5:2 E5:2 A5:6 -:2'];
const m6Lead = ['D5:2 G5:2 B5:3 A5:1 G5:2 A5:2 B5:4', 'C#6:4 A5:2 E5:2 -:2 E5:1 F#5:1 A5:4', 'C#5:2 F#5:2 A5:3 F#5:1 E5:2 F#5:2 A5:4', 'B5:4 F#5:2 D5:2 -:2 D5:1 E5:1 F#5:4',
  'D5:2 G5:2 B5:3 A5:1 G5:2 A5:2 B5:4', 'C#6:4 A5:2 E5:2 -:2 E5:1 F#5:1 A5:4', 'A4:2 D5:2 F#5:3 E5:1 D5:2 E5:2 F#5:4', 'E5:4 D5:2 C#5:2 D5:4 -:4'];
const W6MAP = [KH, CL, H8O];

export const WORLD6_THEMES = {
  // Glasröhren-Bergland (6-1): 140 BPM, G-Dur, 24 Takte, luftig. Intro (G h C D): die Glas-Glocken spielen die Hook,
  // Pluck auf der „und“, Röhren-Whoosh in die Strophe | Strophe (e C G D | e C a D): Lead in der Mittellage, gläserne
  // Tropfen in den Phrasen-Pausen, Röhren-Plopp | Refrain (G h C D | G h a D): „Röhrenpost“-Hook, die Glas-Glocken singen
  // eine Oktave höher mit, Rave-Piano 3-3-2, Stabs | Überleitung (C D e D): lange Töne über einem Glas-Arpeggio, Riser.
  course_clearpipe: {
    bpm: 140,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.15 },
      bell: { type: 'sine', volume: 0.09, decay: 0.6, ratio: 5.4, partial: 0.3 },
      echo: { type: 'sine', volume: 0.05, decay: 0.3 },
      arp: { type: 'triangle', volume: 0.06, decay: 0.1 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.05, bright: 1.3 },
      riser: { volume: 0.07, noise: 0.06 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, doum: { freq: 260, volume: 0.22, decay: 0.1 }, hat: { volume: 0.25, off: 0.15 }, open: { volume: 0.14, duration: 0.14 }, tom: { freq: 220, volume: 0.32 } },
    fx: { delay: { steps: 3, feedback: 0.35, lowpass: 4200, wet: 0.3, send: { bell: 0.45, echo: 0.6, arp: 0.35, lead: 0.15 } } },
    lead: [...rest(4), ...cpVerse, ...cpChorus, ...cpBridge],
    bell: [...cpIntro, ...rest(8), ...tr(cpChorus, 12), ...rest(4)],
    echo: bySection(cpProg, SONG, { verse: glassDrop }),
    arp: bySection(cpProg, SONG, { intro: softOff, verse: softOff, bridge: glassArp }),
    piano: bySection(cpProg, SONG, { intro: (c) => chordBar(c, OFF, 'G4'), chorus: (c) => chordBar(c, P332, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(cpProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(cpProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(3), '-:8 D4:8', ...rest(19), 'D4:16'],
    bass: bySection(cpProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... t.tt')]),
      ...groove(4, PIPE, [K4, CL, HOF, dr('.... .... .... tttt')]),
      ...groove(4, PIPE, [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, PLOP], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, PLOP], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, HOF, CR], [K4, CL, HOF], [K4, CL, HOF, PLOP], FILL_S,
    ],
  },

  // Geisterschiffe (6-2): 132 BPM, e-Moll, 24 Takte, schunkelnd. Intro (e C G D): das Akkordeon spielt die Hook,
  // Schiffsglocke im Doppelschlag | Strophe (e e a H | e e C H): Lead erzählt in Achteln, Akkordeon „pa“ auf der „und“,
  // Humpa-Bass, knarrende Planken | Refrain (e C G D | e C a H): Schaukel-Hook im punktierten Schunkel-Rhythmus, Akkordeon
  // mit Schubs, Piano 3-3-2, Stabs | Überleitung (C D e H): lange Töne, die Geisterstimme summt Terzen darüber, Wellen-Riser.
  course_wreck: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4200, volume: 0.15 },
      organ: { volume: 0.05, cutoff: 2200, gate: 0.9 },
      bell: { type: 'sine', volume: 0.08, decay: 1.0, ratio: 2.4, partial: 0.5 },
      whistle: { type: 'sine', volume: 0.08, vibrato: 40, rate: 5, slide: 3, attack: 0.15, gate: 0.95 },
      piano: { volume: 0.07, oscs: 1, cutoff: 3600 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.05, bright: 0.8 },
      bass: { volume: 0.18, cutoff: 800 },
      riser: { volume: 0.06, noise: 0.06 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tick: { freq: 700, volume: 0.08, decay: 0.05 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 140, volume: 0.34 } },
    fx: { delay: { steps: [3, 4], feedback: 0.34, lowpass: 2600, wet: 0.3, send: { organ: 0.15, bell: 0.4, whistle: 0.45, lead: 0.15, tick: 0.3 } } },
    lead: [...rest(4), ...wrVerse, ...wrChorus, ...wrBridge],
    organ: bySection(wrProg, SONG, {
      intro: (c, i) => wrHook[i],
      verse: (c) => chordBar(c, '..x. ..x. ..x. ..x.', 'G3'),
      chorus: (c) => chordBar(c, '..x. ..x. ..x. .xx.', 'G3'),
      bridge: (c) => chordBar(c, LONG, 'G3'),
    }),
    bell: wrProg.map(GLASEN),
    whistle: [...rest(20), '-:8 G5:8', '-:8 A5:8', '-:8 B5:8', '-:8 B5:8'],
    piano: bySection(wrProg, SONG, { chorus: (c) => chordBar(c, P332, 'G4') }),
    stabs: bySection(wrProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(wrProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'B3:16'],
    bass: bySection(wrProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, 'L_.. F_.. L_.. F_..'), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, SHIP, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, SHIP, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, CREAK], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, CREAK], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, CREAK], FILL_S,
    ],
  },

  // Fernost-Halle (6-3, Schiebetüren, Gong): 140 BPM, h-Moll, 24 Takte. Intro (h G D A): die Bambusflöte spielt die Hook,
  // die Koto zupft, Gong | Strophe (h h G A | h h e Fis): Lead, die Koto antwortet in den Phrasen-Pausen, Holzblock |
  // Refrain (h G D A | h G e Fis): pentatonische Fächer-Hook, Piano auf der „und“, Stabs | Überleitung (G A h Fis): die
  // Flöte singt allein, Koto-Arpeggio, Gong, Riser. Pentatonik nur als Farbe der Melodie, Harmonik i–VI–III–VII.
  course_fareast: {
    bpm: 140,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.15 },
      whistle: { type: 'sine', volume: 0.14, vibrato: 22, rate: 5, slide: 2, attack: 0.04, gate: 0.9 },
      arp: { type: 'sawtooth', volume: 0.05, decay: 0.16 },
      bell: { type: 'sine', volume: 0.13, decay: 1.6, ratio: 2.2, partial: 0.6 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.05 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tek: { freq: 1300, volume: 0.16 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 110, volume: 0.4 } },
    fx: { lowpass: { arp: 3200 }, delay: { steps: 3, feedback: 0.35, lowpass: 3200, wet: 0.3, send: { whistle: 0.4, arp: 0.35, bell: 0.3, lead: 0.15 } } },
    whistle: [...feHook, ...rest(16), ...feBridge],
    lead: [...rest(4), ...feVerse, ...feChorus, ...rest(4)],
    arp: bySection(feProg, SONG, { intro: koto, verse: kotoAnswer, bridge: koto }),
    bell: feProg.map(GONG),
    piano: bySection(feProg, SONG, { chorus: (c) => chordBar(c, OFF, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    stabs: bySection(feProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(feProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'F#3:16'],
    bass: bySection(feProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, HALL, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, HALL, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, WOODBLOCK], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, WOODBLOCK], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, WOODBLOCK], FILL_S,
    ],
  },

  // Dschungel (6-4, Floßfahrt im Giftsee, Lianen): 136 BPM, F-Dur, 24 Takte, verspielt. Intro (F d B C): die Marimba
  // spielt die Hook | Strophe (d B F C | d B g C): Lead mit Synkope, Marimba-Begleitung, Congas und Bongos | Refrain
  // (F d B C | F d g C): Hüpfer-Hook, die Marimba singt in den Ruf-Takten mit, Piano auf der „und“, Stabs | Überleitung
  // (B C d C): lange Töne, Vogel-Zwitschern, Marimba, Urwald-Trommeln in den Loop.
  course_jungle: {
    bpm: 136,
    voice: {
      lead: { ...SYNTH, cutoff: 4800, volume: 0.15 },
      bell: { type: 'sine', volume: 0.13, decay: 0.22, ratio: 3.9, partial: 0.35 },
      arp: { type: 'sine', volume: 0.09, decay: 0.1 },
      echo: { type: 'sine', volume: 0.04, decay: 0.06, glide: 1.6, glideTime: 0.05 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.045, bright: 1.1 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.28 }, doum: { freq: 150, volume: 0.28, decay: 0.2 }, tek: { freq: 900, volume: 0.16, off: 0.75 }, jingle: { volume: 0.15 }, tom: { freq: 130, volume: 0.4 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3400, wet: 0.28, send: { bell: 0.35, echo: 0.5, arp: 0.25, lead: 0.15 } } },
    lead: [...rest(4), ...juVerse, ...juChorus, ...juBridge],
    bell: bySection(juProg, SONG, { intro: (c, i) => juIntro[i], chorus: (c, i) => ([0, 2, 4].includes(i) ? juChorus[i] : '-:16') }),
    arp: bySection(juProg, SONG, { verse: marimbaOff, bridge: marimbaOff }),
    echo: bySection(juProg, SONG, { bridge: chirp }),
    piano: bySection(juProg, SONG, { intro: (c) => chordBar(c, OFF, 'A4'), chorus: (c) => chordBar(c, OFF, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(juProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(juProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(juProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CONGA, SHAKE], [K4, CONGA, SHAKE, dr('.... .... t.t. tttt')]),
      ...groove(4, JUNGLE, [K4, CL, CONGA, SHAKE, dr('.... .... .... tttt')]),
      ...groove(4, JUNGLE, [K4, CL, CONGA, dr('.... .... tttt tttt')], false),
      ...groove(4, [K4, CL, HH, CONGA, BONGO], [K4, CL, HH, CONGA, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, CONGA, BONGO], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CONGA, SHAKE, CR], [K4, CONGA, BONGO, SHAKE], [K4, CL, CONGA, BONGO, SHAKE], [K4, dr('.... c... .... ....'), dr('..d. ..d. .... ....'), dr('.... .... tttt tttt')],
    ],
  },

  // Wind-Schnee (6-5, Eisseen, Pustewolken, Windböen): 134 BPM, A-Dur, 24 Takte, hell und windig. Intro (A E fis D): die
  // Glöckchen spielen die Hook über dem Wind-Pad | Strophe (D E cis fis | D E h E): Lead, Pluck auf der „und“,
  // Schlittenschellen, Windböen am Phrasen-Ende | Refrain (A E fis D | A E D E): „Bimmel“-Hook, die Glöckchen funkeln eine
  // Oktave höher mit, Rave-Piano 3-3-2, Stabs | Überleitung (D E fis E): lange Töne, Eiskristall-Glitzern, Windböen.
  course_snowwind: {
    bpm: 134,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.15 },
      bell: { volume: 0.08, decay: 0.4, ratio: 2.76, partial: 0.35 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.08 },
      echo: { type: 'sine', volume: 0.05, decay: 0.3 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 0.7 },
      riser: { volume: 0.05, glide: 1.3, noise: 0.08 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, jingle: { volume: 0.17, off: 0.1 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 200, volume: 0.32 } },
    fx: { delay: { steps: 3, feedback: 0.36, lowpass: 3800, wet: 0.32, send: { bell: 0.45, echo: 0.5, lead: 0.15, pad: 0.2, riser: 0.3 } } },
    lead: [...rest(4), ...swVerse, ...swChorus, ...swBridge],
    bell: [...swHook, ...rest(8), ...tr(swChorus.slice(0, 2), 12), ...rest(2), ...tr(swChorus.slice(4, 6), 12), ...rest(6)],
    echo: bySection(swProg, SONG, { bridge: ice }),
    arp: bySection(swProg, SONG, { verse: snowOff }),
    piano: bySection(swProg, SONG, { intro: (c) => chordBar(c, OFF, 'E4'), chorus: (c) => chordBar(c, P332, 'E4'), bridge: (c) => chordBar(c, LONG, 'E4') }),
    stabs: bySection(swProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: swProg.map((c) => padBar(c)),
    riser: [...rest(3), '-:8 E4:8', ...rest(3), '-:8 E4:8', ...rest(3), '-:8 E4:8', ...rest(8), 'E4:16', '-:8 E4:8', 'E4:16', 'A4:16'],
    bass: bySection(swProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, SNOW, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, SNOW, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, SLEIGH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, SLEIGH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, SLEIGH], FILL_S,
    ],
  },

  // Maschinenhalle (6-6, vertikal, Förderbänder, Projektil-Kanonen): 144 BPM, d-Moll, 24 Takte, mechanisch. Intro (d B F C):
  // das Piano spielt die Stampf-Hook in Oktaven über dem Förderband-Ostinato | Strophe (d d g A | d d B A): Lead in
  // gleichmäßigen Achteln, Förderband, Metall-Klirren, Amboss | Refrain (d B F C | d B g A): Stakkato-Hook, Förderband in
  // Sechzehnteln, Stabs, Piano auf der „und“ | Überleitung (B C d A): lange Töne, Dampf-Riser mit Rauschen.
  course_factory: {
    bpm: 144,
    voice: {
      lead: { ...SYNTH, cutoff: 4400, volume: 0.16 },
      piano: { volume: 0.09, cutoff: 3800 },
      arp: { type: 'sawtooth', volume: 0.035, decay: 0.05 },
      bell: { type: 'triangle', volume: 0.06, decay: 0.25, ratio: 4.2, partial: 0.6 },
      stabs: { volume: 0.11, cutoff: 5000, cutoffEnd: 1200 },
      pad: { volume: 0.04, bright: 0.8 },
      bass: { volume: 0.2, cutoff: 1000 },
      riser: { volume: 0.07, noise: 0.08 },
    },
    kit: { kick: { volume: 0.56 }, clap: { volume: 0.3 }, tick: { freq: 3800, volume: 0.09, decay: 0.04 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 120, volume: 0.38 } },
    fx: { lowpass: { arp: 2600 }, delay: { steps: [3, 4], feedback: 0.3, lowpass: 2400, wet: 0.28, send: { bell: 0.35, tick: 0.4, lead: 0.12, clap: 0.2 } } },
    lead: [...rest(4), ...faVerse, ...faChorus, ...faBridge],
    piano: bySection(faProg, SONG, { intro: (c, i) => octaves(tr(faIntro, -12))[i], chorus: (c) => chordBar(c, OFF, 'F4'), bridge: (c) => chordBar(c, LONG, 'F4') }),
    arp: bySection(faProg, SONG, { intro: belt, verse: belt, chorus: belt16 }),
    bell: bySection(faProg, SONG, { verse: ANVIL, chorus: ANVIL }),
    stabs: bySection(faProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(faProg, SONG, { verse: (c) => padBar(c, 'D3'), chorus: (c) => padBar(c, 'D3'), bridge: (c) => padBar(c, 'D3') }),
    riser: [...rest(22), 'A3:16', 'D4:16'],
    bass: bySection(faProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_DRIVE), chorus: (c) => bassBar(c, B_PUMP), bridge: (c, i) => bassBar(c, i < 3 ? B_HALF : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, METAL], [K4, CL, METAL, dr('.... .... .... t.tt')]),
      ...groove(4, FACTORY, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, FACTORY, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..tt tttt')], false),
      ...groove(4, [K4, CL, HH, METAL], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, METAL], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, METAL, CR], [K4, CL, METAL], [K4, CL, H8, METAL], [K4, dr('.... c... .... ....'), dr('...x ..x. xxxx xxxx'), dr('.... .... ssss ssss')],
    ],
  },

  // Wuschel-Mine (6-7, vertikaler Autoscroller, die Wuschel-Horde jagt von unten): 150 BPM, c-Moll, 24 Takte, treibend.
  // Intro (c As Es B): das Piano spielt die Kletter-Hook in Oktaven, Galopp-Bass | Strophe (c c As B | c c f G): Lead im
  // Achtel-Puls, Wuschel-Brummen, Spitzhacken-Ticken, Quetscher | Refrain (c As Es B | c As f G): Zickzack-Hook nach oben,
  // Sechzehntel-Hats, Stabs, Piano auf der „und“ | Überleitung (As B c G): lange Töne, Hoover-Riser über zwei Takte.
  course_fuzzymine: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 5000, volume: 0.17 },
      piano: { volume: 0.1 },
      arp: { type: 'sawtooth', volume: 0.045, decay: 0.06 },
      stabs: { volume: 0.12, cutoff: 5500, cutoffEnd: 1400 },
      pad: { volume: 0.045, bright: 0.85 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tick: { freq: 3400, volume: 0.09, decay: 0.05 }, tom: { freq: 90, volume: 0.42 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { lowpass: { arp: 3000 }, delay: { steps: 3, feedback: 0.28, lowpass: 2800, wet: 0.26, send: { lead: 0.12, tick: 0.4, arp: 0.2 } } },
    lead: [...rest(4), ...fmVerse, ...fmChorus, ...fmBridge],
    piano: bySection(fmProg, SONG, { intro: (c, i) => octaves(tr(fmHook, -12))[i], chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    arp: bySection(fmProg, SONG, { verse: fuzz }),
    stabs: bySection(fmProg, SONG, { intro: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(fmProg, SONG, { verse: (c) => padBar(c, 'D3'), chorus: (c) => padBar(c, 'D3'), bridge: (c) => padBar(c, 'D3') }),
    riser: [...rest(22), 'G3:16', 'C4:14 -:2'],
    bass: bySection(fmProg, SONG, { intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [...ESCAPE, CRUSH], [K4, CL, HH, dr('.... .... ..tt tttt')]),
      ...groove(4, [...ESCAPE, CRUSH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, PICKAXE], [K4, CL, HH, dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH, PICKAXE], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, dr('..s. ..s. ..s. ..s.')], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Würfelblase (6-C, Boss im Zirkuszelt): 146 BPM, g-Moll, 24 Takte, dramatisch. Intro (g Es B F): die Zirkus-Orgel
  // spielt die Wabbel-Hook, Pauken | Strophe (g g c D | g g Es D): Lead im Marsch, Stabs auf der „und“, Gelee-Blubbern,
  // Galopp-Bass | Refrain (g Es B F | g Es c D): Wabbel-Hook, Zirkus-Orgel „pa-pa“ auf der „und“, Stabs, Piano 3-3-2,
  // treibender Bass | Überleitung (Es F g D): Orgel-Akkorde, Pauken, Hoover-Riser über zwei Takte in den Loop.
  course_bossblob: {
    bpm: 146,
    voice: {
      lead: { ...SYNTH, cutoff: 4800, volume: 0.17 },
      organ: { volume: 0.05, cutoff: 3600 },
      echo: { type: 'sine', volume: 0.07, decay: 0.1, glide: 0.6, glideTime: 0.08 },
      stabs: { volume: 0.13, cutoff: 6500, cutoffEnd: 1800 },
      piano: { volume: 0.09 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tom: { freq: 95, volume: 0.42 }, snare: { volume: 0.24 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: [3, 4], feedback: 0.32, lowpass: 2800, wet: 0.28, send: { organ: 0.15, echo: 0.4, lead: 0.14, tom: 0.15 } } },
    lead: [...rest(4), ...bbVerse, ...bbChorus, ...bbBridge],
    organ: bySection(bbProg, SONG, {
      intro: (c, i) => bbHook[i],
      chorus: (c) => chordBar(c, '..x. ..x. ..x. .xx.', 'G3'),
      bridge: (c) => chordBar(c, LONG, 'G3'),
    }),
    echo: bySection(bbProg, SONG, { verse: blubb }),
    stabs: bySection(bbProg, SONG, { intro: (c) => chordBar(c, 'x... .... .... ..x.', 'G3'), verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    piano: bySection(bbProg, SONG, { chorus: (c) => chordBar(c, P332, 'G4') }),
    pad: bySection(bbProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(22), 'D3:16', 'G3:14 -:2'],
    bass: bySection(bbProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_GALLOP), chorus: (c) => bassBar(c, B_DRIVE), bridge: (c, i) => bassBar(c, i < 3 ? B_GALLOP : 'L.H_ L.H_ .... ....') }),
    drums: [
      [K4, PAUKEN, CR], [K4, PAUKEN], [K4, PAUKEN, CL], [K4, CL, dr('.... .... tttt tttt')],
      ...groove(4, [K4, CL, H8, PAUKEN], [K4, CL, H8, dr('t... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8, PAUKEN], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('t... .... ..ss ssss')], false),
      ...groove(4, TENT, [K4, CL, HH, dr('t... .... tttt tttt')]),
      ...groove(4, TENT, [K4, CL, dr('hhoh hhoh hh.. ....'), dr('t... .... ..ss ssss')], false),
      [K4, PAUKEN, CR], [K4, PAUKEN], [K4, CL, PAUKEN], [K4, dr('.... c... .... ....'), dr('tt.. tt.. ssss ssss')],
    ],
  },

  // Weltkarte Welt 6: 128 BPM, D-Dur, 16 Takte, gemütlich-luftig. Strophe (D A h G | D A G A): das Piano singt, Pluck auf
  // der „und“ | Refrain (G A fis h | G A D D, IV–V–iii–vi): weicher Lead schwebt, Piano auf der „und“, das Glas-Windspiel
  // tupft in die Phrasen-Enden. Kick auf 1 und 3, Clap auf 2 und 4, Achtel-Hats offen auf 4+.
  course_world6_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3000, volume: 0.17 },
      piano: { volume: 0.12, cutoff: 4000 },
      bell: { type: 'sine', volume: 0.07, decay: 0.5, ratio: 5.4, partial: 0.25 },
      arp: { type: 'sine', volume: 0.07, decay: 0.1 },
      pad: { volume: 0.05, bright: 1.2 },
      bass: { cutoff: 650 },
    },
    kit: { hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: 3, feedback: 0.32, lowpass: 3400, wet: 0.3, send: { piano: 0.3, lead: 0.2, bell: 0.45 } } },
    piano: [...m6Piano, ...m6Prog.slice(8).map((c) => chordBar(c, OFF, 'F#4'))],
    lead: [...rest(8), ...m6Lead],
    bell: [...rest(8), '-:12 D6:2 B5:2', '-:16', '-:12 C#6:2 A5:2', '-:16', '-:12 D6:2 B5:2', '-:16', '-:12 A5:2 F#5:2', '-:16'],
    arp: m6Prog.map((c, i) => (i < 8 ? pat(tones(c, 'E4'), '..0. ..1. ..2. ..1.') : '-:16')),
    pad: m6Prog.map((c) => padBar(c)),
    bass: m6Prog.map((c) => bassBar(c, B_HALF)),
    drums: [[...W6MAP, CR], W6MAP, W6MAP, [KH, CL, dr('h.h. h.h. h.h. hhhh')], W6MAP, W6MAP, W6MAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...W6MAP, CR], W6MAP, W6MAP, [KH, CL, dr('h.h. h.h. h.h. hhhh')], W6MAP, W6MAP, W6MAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')]],
  },
};
