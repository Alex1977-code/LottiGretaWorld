// Kurs-Themen der Halloween-Sonderwelt „Kürbisinsel“ (Welt 31, Level H-1 … H-Burg) – eigene Kompositionen im Stil
// des 90er-Eurodance (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md) geschrieben, Maßstab Welt 1 und Welt 5: jedes Thema ist ein Lied
// in Dur oder Moll – Intro (Hook auf einer Farb-Stimme) → Strophe (tiefer, ruhiger) → Refrain (höher, zweitaktige Hook
// A A' A A'') → Überleitung (Breakdown, lange Töne, Riser) –, Eurodance-Akkordfolgen, der Lead-Synth trägt die Melodie
// fast durchgehend, Off-Beat-Stabs, Piano, Pad, Oktav-Bass, Four-on-the-floor. „Lustiger Grusel“ statt Horror: Moll und
// Gruselfarben ja, aber hüpfend, hell und tanzbar. Keine bekannten Halloween-/Grusel-Melodien (bewusst vermieden:
// Orgel-Mordent mit Tonleiter zum Leitton, Stufen-Staccato aufwärts in Moll, Pfeif-Motiv mit Quint und Wechselnote,
// Celesta-Figur mit Quint- und Terzsprung, Basslinien der bekannten Halloween-Hits).
//
// Hook-Profile (tests/audio.mjs vergleicht sie mit allen Themen der Welten 1–5 und untereinander – Einsatz + Intervall
// und Kontur ohne Rhythmus):
//   Kürbisfeld   Scotch-Snaps „di-DAA di-DAA“ zwei Stufen hinauf, dann schrittweise zurück; dieselbe Hook spielt die
//                Celesta im Intro in e-Moll (zwei Leiterstufen tiefer), der Refrain bringt sie hell in G-Dur
//   Dorf         „SÜ-ßes O-der SAU-res“: Trochäen in fallenden Terzen als Sequenz, die Antwort klingelt stufenweise
//                hinauf zur kleinen Septime
//   Friedhof     Auftakt aus zwei Achteln, Pause, synkopierter Hochton auf der „e“ nach Zählzeit 2, Tanzschritte zurück
//   Hexenturm    Wendeltreppe aus stapfenden Tonwiederholungen „da-da DAA“ den Moll-Akkord hinauf, Takt für Takt höher
//                (Gipfel a – c – e), die Antwort fällt zurück
//   Graf         Kopf des Baron-Brummbär-Motivs (course_boss, Bossstraße 1-Burg) „C . c Es C“, dann der Fledermaus-
//                Sprung zur Oktave (eine Sechzehntel vor Zählzeit 3) und ein Seufzer abwärts; die Antwort holt Atem;
//                im Intro spielt die Kirchenorgel das Baron-Motiv in doppelter Notenlänge
//   Karte        Wiegen: Anlauf über eine Quarte zum langen Ton, um ihn herum schaukeln; die Antwort sinkt in langen
//                Tönen (Spieluhr-Celesta in der Strophe)
// Beim Komponieren aufgefallen und ersetzt: die erste Hexenturm-Treppe (Quint hinauf, zwei Schritte hinab) hatte die
// Kontur von course_beep (50 %), der Fledermaus-Sprung genau auf Zählzeit 3 glich course_lavacastle (Einsatz +
// Intervall 47 %), die Dorf-Hook hatte zu viele Quartsprünge (Schritte 76 % statt ≥ 79 % wie Welt 1).
//
// Halloween-Farbe nur über Klang: Celesta, Glöckchen und hohles Kürbis-Klopfen (Kürbisfeld), Knochen-Xylofon,
// Pizzicato und Klapper-Hölzer (Dorf), Theremin, Orgel-Stabs und Friedhofsglocke (Nebelfriedhof), Cembalo, Glocken
// und Kessel-Blubbern (Hexenturm), Kirchenorgel, Chor-Pad, Turmglocke, Fledermaus-Flattern und Pauken (Gruselschloss),
// Spieluhr-Celesta, Pizzicato und Theremin-Tupfer (Karte).

import {
  dr, K4, KH, CL, HH, H8, H8O, HOF, CR, rest, tr, chordBar, bassBar, padBar, pat, voicing,
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

// ================================================================ Kürbisfeld im Abendrot ====
// e-Moll / G-Dur, 136 BPM, fröhlich-schaurig mit Dur/Moll-Wechsel. Intro e h C H (die Celesta spielt die Hook in Moll) |
// Strophe e C D H | e C a H (i–VI–VII–V, schleichend) | Refrain G D e C | G D C D (I–V–vi–IV, hell in G-Dur) |
// Überleitung C c G D (Dur → Moll auf demselben Akkord, IV–iv–I–V). Hook in Scotch-Snaps: „di-DAA di-DAA da-da DAA“.
const puProg = ['Em', 'Bm', 'C', 'B', 'Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B', 'G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'C', 'Cm', 'G', 'D'];
const puHook = ['B4:1 D5:3 D5:1 G5:3 F#5:2 E5:2 D5:4', 'A5:3 G5:1 F#5:2 D5:2 E5:2 F#5:2 D5:4',
  'B4:1 E5:3 E5:1 G5:3 F#5:2 E5:2 B4:4', 'G5:3 F#5:1 E5:2 C5:2 D5:2 E5:2 C5:4'];
const puChorus = [...puHook, puHook[0], puHook[1], 'C5:1 E5:3 E5:1 G5:3 A5:2 B5:2 C6:4', 'D6:3 C6:1 A5:2 F#5:2 E5:2 F#5:2 D5:4'];
// dieselbe Hook in e-Moll: jeder Ton zwei Leiterstufen tiefer (G-Dur-Hook → e-Moll), Takt 2 und 4 frei auf h und H
const puMinor = ['G4:1 B4:3 B4:1 E5:3 D5:2 C5:2 B4:4', 'F#5:3 E5:1 D5:2 B4:2 A4:2 B4:2 D5:4',
  'G4:1 C5:3 C5:1 E5:3 D5:2 C5:2 G4:4', 'F#5:3 E5:1 D#5:2 B4:2 D#5:4 F#5:4'];
const puV = ['B4:2 E5:2 -:1 E5:1 F#5:2 G5:4 F#5:2 E5:2', 'C5:2 E5:2 -:1 E5:1 D5:2 G5:4 E5:2 C5:2',
  'A4:2 D5:2 -:1 D5:1 E5:2 F#5:4 E5:2 D5:2', 'F#5:4 D#5:2 B4:2 D#5:4 -:4'];
const puVerse = [...puV, puV[0], puV[1], 'A4:2 C5:2 -:1 C5:1 D5:2 E5:4 D5:2 C5:2', 'F#5:4 D#5:2 B4:2 A4:4 -:2 A4:2'];
const puBridge = ['G5:6 E5:2 C5:8', 'G5:6 Eb5:2 C5:8', 'B4:4 D5:4 G5:8', 'F#5:6 E5:2 D5:4 -:4'];
const pluckOff = (c) => pat(tones(c, 'E4'), '..0. ..1. ..2. ..1.');
const sprinkle = (c) => pat(tones(c, 'E6'), '0.1. 2... 1.0. ....');   // Glöckchen
const KNOCK = dr('.... ..p. .... p..p');                              // hohles Kürbis-Klopfen
const PUMPKIN = [K4, CL, H8, KNOCK];

// ================================================================ Süßes-oder-Saures-Dorf ====
// F-Dur, 140 BPM, verspielt und hüpfend. Intro F C d B (das Knochen-Xylofon spielt die Hook) | Strophe d B F C | d B g C
// (vi–IV–I–V, „klopf . klopf .“ an jeder Tür) | Refrain F C d B | F C B C (I–V–vi–IV) | Überleitung g a B C. Hook:
// „SÜ-ßes O-der SAU-res“ als fallende Terzen in Trochäen (c-a, b-g, a-f), die Antwort klingelt hinauf.
const cvProg = ['F', 'C', 'Dm', 'Bb', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'C', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Gm', 'Am', 'Bb', 'C'];
const cvHook = ['C6:3 A5:1 Bb5:3 G5:1 A5:3 F5:1 -:2 G5:2', 'E5:2 G5:2 -:2 A5:2 Bb5:4 A5:2 G5:2',
  'A5:3 F5:1 G5:3 E5:1 F5:3 D5:1 -:2 E5:2', 'D5:2 F5:2 -:2 G5:2 Bb5:4 A5:2 Bb5:2'];
const cvChorus = [...cvHook, cvHook[0], 'E5:2 G5:2 -:2 A5:2 Bb5:4 C6:2 D6:2', 'D6:3 Bb5:1 C6:3 A5:1 Bb5:3 G5:1 -:2 G5:2', 'A5:2 Bb5:2 -:2 G5:2 E5:2 F5:2 G5:4'];
const cvV = ['D5:1 -:1 D5:1 -:1 E5:2 F5:2 A5:2 G5:2 F5:4', 'D5:1 -:1 D5:1 -:1 F5:2 G5:2 Bb5:2 A5:2 F5:4',
  'F5:1 -:1 F5:1 -:1 A5:2 Bb5:2 C6:2 Bb5:2 A5:4', 'G5:2 E5:2 G5:4 Bb5:2 G5:2 E5:4'];
const cvVerse = [...cvV, cvV[0], cvV[1], 'D5:1 -:1 D5:1 -:1 F5:2 G5:2 Bb5:2 A5:2 G5:4', 'E5:2 F5:2 G5:2 A5:2 Bb5:4 -:4'];
const cvBridge = ['Bb5:8 G5:8', 'A5:8 C6:8', 'Bb5:8 D6:8', 'C6:4 Bb5:4 G5:4 A5:2 Bb5:2'];
const cvIntro = [cvHook[0], cvHook[1], cvHook[2], 'D5:2 F5:2 -:2 G5:2 F5:4 D5:4'];   // Xylofon, Takt 4 führt zur Strophe
const pizzOff = (c) => pat(tones(c, 'A4'), '..0. ..1. ..2. ..1.');
const clatter = (c) => pat(tones(c, 'C5'), '0.1. 2.1. 0.12 ....');   // Knochen-Xylofon in der Überleitung
const KLAPPER = dr('..p. .p.p ..p. p.p.');                             // Klapper-Hölzer (Knochen)
const VILLAGE = [K4, CL, H8, KLAPPER];

// ================================================================ Nebelfriedhof ====
// g-Moll, 132 BPM, geheimnisvoll, aber tanzbar. Intro g Es B F (das Theremin spielt die Hook) | Strophe g g Es D | g g c
// D (i–VI–V, schleichend) | Refrain g Es B F | g Es c D (i–VI–III–VII | i–VI–iv–V) | Überleitung Es F g D (das Theremin
// singt). Hook: Auftakt aus zwei Achteln, Pause, synkopierter Hochton auf der „e“ nach Zählzeit 2, dann Tanzschritte
// zurück („b d . G—f g d c“). Orgel-Stabs auf der „und“, Friedhofsglocke alle vier Takte.
const gyProg = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Gm', 'Eb', 'D', 'Gm', 'Gm', 'Cm', 'D', 'Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D', 'Eb', 'F', 'Gm', 'D'];
const gyHook = ['Bb4:2 D5:2 -:1 G5:3 F5:2 G5:2 D5:2 C5:2', 'Bb4:2 Eb5:2 -:1 G5:3 F5:2 Eb5:2 D5:2 Bb4:2',
  'D5:2 F5:2 -:1 Bb5:3 A5:2 Bb5:2 F5:2 Eb5:2', 'C5:3 D5:1 F5:2 A5:2 G5:2 F5:2 C5:4'];
const gyChorus = [...gyHook, gyHook[0], gyHook[1], 'C5:2 Eb5:2 -:1 G5:3 F5:2 G5:2 Eb5:2 D5:2', 'F#5:2 A5:2 -:1 D6:3 C6:2 A5:2 F#5:2 D5:2'];
const gyV = ['G4:3 Bb4:1 -:2 D5:2 D5:2 C5:2 Bb4:4', 'G4:3 Bb4:1 -:2 D5:2 G5:2 F5:2 D5:4',
  'G4:3 Bb4:1 -:2 Eb5:2 G5:2 F5:2 Eb5:4', 'F#5:3 D5:1 -:2 A4:2 C5:2 A4:2 F#4:4'];
const gyVerse = [...gyV, gyV[0], gyV[1], 'G4:3 C5:1 -:2 Eb5:2 G5:2 F5:2 Eb5:4', 'A4:3 C5:1 -:2 D5:2 F#5:2 D5:2 A4:4'];
const gyBridge = ['G5:8 Bb5:8', 'A5:8 C6:8', 'Bb5:8 D6:8', 'C6:4 A5:4 F#5:4 D5:4'];
const gyIntro = [gyHook[0], gyHook[1], gyHook[2], 'C5:3 D5:1 F5:2 A5:2 G5:2 F5:2 C5:2 A4:2'];   // Theremin, Takt 4 führt zur Strophe
const TOLL = (c, i) => (i % 4 ? '-:16' : 'G3:16');                      // Friedhofsglocke auf G, alle vier Takte
const FOG = [K4, CL, HOF];

// ================================================================ Hexenturm ====
// a-Moll, 144 BPM, treibend. Intro a F C G (die Glocken spielen die Hook über dem Cembalo) | Strophe a a d E | a a F E
// (i–iv–V) | Refrain a F C G | a F d E (i–VI–III–VII | i–VI–iv–V) | Überleitung F G a E (Kessel-Blubbern, Besen-Riser).
// Hook als Wendeltreppe: stapfende Tonwiederholungen „da-da DAA da-da DAA da-da DAA“ den Moll-Akkord hinauf, Takt für
// Takt höher (Gipfel a – c – e), die Antwort fällt zurück. Strophe im Besen-Galopp „DAA da-da DAA DAA“.
const wtProg = ['Am', 'F', 'C', 'G', 'Am', 'Am', 'Dm', 'E', 'Am', 'Am', 'F', 'E', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E', 'F', 'G', 'Am', 'E'];
const wtHook = ['A4:1 A4:1 C5:2 C5:1 C5:1 E5:2 E5:1 E5:1 A5:3 G5:1 E5:2', 'C5:1 C5:1 F5:2 F5:1 F5:1 A5:2 A5:1 A5:1 C6:3 B5:1 A5:2',
  'E5:1 E5:1 G5:2 G5:1 G5:1 C6:2 C6:1 C6:1 E6:3 D6:1 C6:2', 'D6:3 C6:1 B5:2 G5:2 E5:2 D5:2 B4:4'];
const wtChorus = [...wtHook, wtHook[0], wtHook[1], 'D5:1 D5:1 F5:2 F5:1 F5:1 A5:2 A5:1 A5:1 D6:3 C6:1 A5:2', 'B5:3 A5:1 G#5:2 E5:2 G#5:2 B5:2 E5:4'];
const wtV = ['C5:2 E5:1 E5:1 D5:2 C5:2 A4:2 C5:1 D5:1 E5:4', 'C5:2 E5:1 E5:1 D5:2 C5:2 E5:2 E5:1 G5:1 A5:4',
  'D5:2 F5:1 F5:1 E5:2 D5:2 C5:2 D5:1 E5:1 F5:4', 'E5:2 G#5:1 G#5:1 A5:2 G#5:2 E5:2 D5:1 C5:1 B4:4'];
const wtVerse = [...wtV, wtV[0], wtV[1], 'A4:2 C5:1 C5:1 D5:2 C5:2 A4:2 C5:1 E5:1 F5:4', wtV[3]];
const wtBridge = ['A5:8 C6:8', 'B5:8 D6:8', 'C6:8 E6:8', 'D6:4 B5:4 G#5:4 E5:4'];
const cembalo = (c) => pat(tones(c, 'E4'), '0121 0121 0121 0121');   // Alberti-Bass des Cembalos in Sechzehnteln
const cembalo8 = (c) => pat(tones(c, 'E4'), '0.2. 1.2. 0.2. 1.2.');   // im Refrain in Achteln (Platz für die Hook)
const bubble = (c) => pat(tones(c, 'A3'), '0... ..1. .2.. 1...');      // Kessel-Blubbern (Sinus gleitet aufwärts)
const TOWER = [K4, CL, HH];

// ================================================================ Gruselschloss / Graf Brummbär ====
// c-Moll, 148 BPM, dramatisch. Intro c c As f-G (die Kirchenorgel spielt das Baron-Brummbär-Motiv aus course_boss in
// doppelter Notenlänge) | Strophe c c f G | c c As G (i–iv–V, Chor-Pad, Galopp-Bass) | Refrain c As Es B | c As f G
// (i–VI–III–VII | i–VI–iv–V) | Überleitung As B c G (Orgel-Akkorde, Turmglocke, Fledermaus-Flattern). Hook: Kopf des
// Baron-Motivs „C . c Es C“, der Fledermaus-Sprung zur Oktave kommt eine Sechzehntel vor Zählzeit 3, Seufzer abwärts;
// die Antwort holt Atem und sinkt in Vierteln.
const brProg = ['Cm', 'Cm', 'Ab', 'Fm G', 'Cm', 'Cm', 'Fm', 'G', 'Cm', 'Cm', 'Ab', 'G', 'Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G', 'Ab', 'Bb', 'Cm', 'G'];
// Baron-Brummbär-Motiv (course_boss, Lead Takt 5–6) in doppelter Notenlänge, am Ende auf G gewendet
const brBaron = ['C5:4 -:2 C5:2 Eb5:4 C5:4', 'G5:6 F5:2 Eb5:4 D5:4', 'C5:4 -:2 C5:2 Eb5:4 C5:4', 'Ab5:6 G5:2 F5:4 D5:4'];
const brHook = ['C5:2 -:1 C5:1 Eb5:2 C5:1 C6:3 Bb5:2 Ab5:2 G5:2', '-:2 Ab5:2 G5:2 F5:2 Eb5:4 C5:4',
  'Eb5:2 -:1 Eb5:1 G5:2 Eb5:1 Eb6:3 D6:2 C6:2 Bb5:2', '-:2 Bb5:2 Ab5:2 G5:2 F5:4 D5:4'];
const brChorus = [...brHook, brHook[0], brHook[1], 'C5:2 -:1 C5:1 F5:2 Ab5:1 C6:3 Bb5:2 Ab5:2 F5:2', 'G5:3 Ab5:1 G5:2 F5:2 Eb5:2 D5:2 B4:4'];
const brV = ['G4:4 C5:2 D5:2 Eb5:4 D5:2 C5:2', 'G4:4 C5:2 Eb5:2 G5:4 F5:2 Eb5:2', 'F5:4 Eb5:2 C5:2 Ab4:4 C5:2 F5:2', 'D5:4 B4:2 G4:2 B4:4 D5:4'];
const brVerse = [...brV, brV[0], brV[1], 'Ab4:4 C5:2 Eb5:2 Ab5:4 G5:2 F5:2', 'G5:4 F5:2 D5:2 B4:4 -:2 B4:2'];
const brBridge = ['C5:8 Eb5:8', 'D5:8 F5:8', 'Eb5:8 G5:8', 'D5:8 B4:8'];
const flutter = (c) => pat(tones(c, 'C6'), '0101 .... 1010 ....');   // Fledermaus-Flattern
const PAUKE = dr('t... .... t... ..t.');                               // Schloss-Pauken
const CASTLE = [K4, CL, HH];

// ================================================================ Weltkarte Halloween ====
// d-Moll, 126 BPM, 16 Takte, gemütlich-gruselig. Strophe d B F C | d B g A (die Spieluhr-Celesta singt, Pizzicato auf
// der „und“) | Refrain B F C d | B F g A (VI–III–VII–i, weicher Lead im Wiegen, Theremin-Tupfer). Kick auf 1 und 3.
const hmProg = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'Gm', 'A'];
const hmBox = ['D5:4 F5:2 A5:2 D6:4 C6:2 A5:2', 'Bb5:4 A5:2 F5:2 D5:4 F5:4', 'C5:4 F5:2 A5:2 C6:4 Bb5:2 A5:2', 'G5:4 E5:2 C5:2 E5:4 G5:4',
  'D5:4 F5:2 A5:2 D6:4 C6:2 A5:2', 'Bb5:4 A5:2 F5:2 D5:4 Bb4:4', 'G4:4 Bb4:2 D5:2 G5:4 F5:2 E5:2', 'E5:4 C#5:2 A4:2 C#5:4 E5:4'];
const hmLead = ['D5:3 F5:1 Bb5:4 A5:2 Bb5:2 C6:2 Bb5:2', 'A5:6 G5:2 F5:4 C5:4', 'C5:3 E5:1 G5:4 F5:2 G5:2 A5:2 G5:2', 'F5:6 E5:2 D5:4 A4:4',
  'D5:3 F5:1 Bb5:4 A5:2 Bb5:2 C6:2 Bb5:2', 'A5:6 G5:2 F5:4 C5:4', 'Bb4:3 D5:1 G5:4 F5:2 G5:2 A5:2 Bb5:2', 'A5:6 G5:2 E5:4 C#5:4'];
const HMAP = [KH, CL, H8O];

export const HALLOWEEN_THEMES = {
  // Kürbisfeld im Abendrot (H-1): 136 BPM, e-Moll/G-Dur, 24 Takte, fröhlich-schaurig. Intro (e h C H): die Celesta spielt
  // die Hook in e-Moll über Pad und Pluck | Strophe (e C D H | e C a H): Lead in der Mittellage, Zupfer auf der „und“,
  // hohles Kürbis-Klopfen | Refrain (G D e C | G D C D): dieselbe Hook hell in G-Dur, die Celesta funkelt eine Oktave
  // höher mit, Piano auf der „und“, Stabs | Überleitung (C c G D): lange Töne, Dur kippt nach Moll,
  // Glöckchen, Riser.
  course_pumpkin: {
    bpm: 136,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.15 },
      bell: { type: 'sine', volume: 0.1, decay: 0.55, ratio: 4, partial: 0.3 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.1 },
      echo: { type: 'sine', volume: 0.05, decay: 0.25 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.05, bright: 1.05 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tek: { freq: 480, volume: 0.22 }, tom: { freq: 180, volume: 0.34 }, hat: { volume: 0.25, off: 0.15 } },
    fx: { delay: { steps: 3, feedback: 0.32, lowpass: 3600, wet: 0.3, send: { bell: 0.4, echo: 0.5, lead: 0.15, tek: 0.2 } } },
    lead: [...rest(4), ...puVerse, ...puChorus, ...puBridge],
    bell: [...puMinor, ...rest(8), ...tr(puChorus, 12), ...rest(4)],
    echo: bySection(puProg, SONG, { bridge: sprinkle }),
    arp: bySection(puProg, SONG, { intro: pluckOff, verse: pluckOff }),
    piano: bySection(puProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(puProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(puProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'B3:16'],
    bass: bySection(puProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, PUMPKIN, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, PUMPKIN, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, KNOCK], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, KNOCK], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, KNOCK], FILL_S,
    ],
  },

  // Süßes-oder-Saures-Dorf (H-2): 140 BPM, F-Dur, 24 Takte, verspielt und hüpfend. Intro (F C d B): das Knochen-Xylofon
  // spielt die Hook | Strophe (d B F C | d B g C): Lead „klopf . klopf .“, Pizzicato auf der „und“, Klapper-Hölzer |
  // Refrain (F C d B | F C B C): Trochäen-Hook in fallenden Terzen, das Xylofon singt in den Ruf-Takten mit, Piano 3-3-2,
  // Stabs | Überleitung (g a B C): lange Töne, das Xylofon klappert Akkordtöne, Riser.
  course_candyvillage: {
    bpm: 140,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      bell: { type: 'triangle', volume: 0.13, decay: 0.12, ratio: 3, partial: 0.45 },
      arp: { type: 'triangle', volume: 0.09, decay: 0.05 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.045, bright: 1.15 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tek: { freq: 1700, volume: 0.15, off: 0.65 }, tom: { freq: 240, volume: 0.32 }, hat: { volume: 0.25, off: 0.15 } },
    fx: { delay: { steps: 3, feedback: 0.25, lowpass: 4000, wet: 0.24, send: { bell: 0.3, lead: 0.12, arp: 0.2 } } },
    lead: [...rest(4), ...cvVerse, ...cvChorus, ...cvBridge],
    bell: bySection(cvProg, SONG, { intro: (c, i) => cvIntro[i], chorus: (c, i) => ([0, 2, 4, 6].includes(i) ? cvChorus[i] : '-:16'), bridge: clatter }),
    arp: bySection(cvProg, SONG, { verse: pizzOff }),
    piano: bySection(cvProg, SONG, { intro: (c) => chordBar(c, OFF, 'A4'), chorus: (c) => chordBar(c, P332, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(cvProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(cvProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(cvProg, SONG, { intro: (c) => bassBar(c, B_BOUNCE), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, VILLAGE, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, VILLAGE, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, KLAPPER], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, KLAPPER], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, KLAPPER], FILL_S,
    ],
  },

  // Nebelfriedhof (H-3): 132 BPM, g-Moll, 24 Takte, geheimnisvoll, aber tanzbar. Intro (g Es B F): das Theremin spielt die
  // Hook, Orgel-Akkorde, Friedhofsglocke | Strophe (g g Es D | g g c D): Lead tief, Orgel-Stabs auf der „und“, Hats offen
  // auf der „und“ | Refrain (g Es B F | g Es c D): synkopierte Hook, das Theremin singt im zweiten Durchgang eine Oktave
  // tiefer mit, Orgel-Stabs, Piano 3-3-2 | Überleitung (Es F g D): das Theremin singt lange Töne, Nebel-Pad, Riser.
  course_graveyard: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4000, volume: 0.16 },
      whistle: { type: 'sine', volume: 0.14, vibrato: 45, rate: 5.5, slide: 3, attack: 0.07, gate: 0.95 },
      organ: { volume: 0.05, cutoff: 2400 },
      bell: { type: 'sine', volume: 0.09, decay: 1.2, ratio: 2.4, partial: 0.5 },
      piano: { volume: 0.07, oscs: 1, cutoff: 3600 },
      pad: { volume: 0.05, bright: 0.65 },
      bass: { volume: 0.18, cutoff: 800 },
      riser: { volume: 0.07, noise: 0.04 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, hat: { volume: 0.24, off: 0.15 }, open: { volume: 0.13, duration: 0.14 }, tom: { freq: 130, volume: 0.34 } },
    fx: { delay: { steps: [3, 4], feedback: 0.36, lowpass: 2600, wet: 0.34, send: { whistle: 0.45, lead: 0.15, pad: 0.2, bell: 0.3, clap: 0.2 } } },
    lead: [...rest(4), ...gyVerse, ...gyChorus, ...rest(4)],
    whistle: [...gyIntro, ...rest(12), ...tr(gyChorus.slice(4), -12), ...gyBridge],
    organ: bySection(gyProg, SONG, {
      intro: (c) => chordBar(c, LONG, 'G3'),
      verse: (c) => chordBar(c, '..x. ..x. ..x. ..x.', 'G3'),
      chorus: (c) => chordBar(c, '..x. ..x. ..x. .xx.', 'G3'),
      bridge: (c) => chordBar(c, 'x___ ____ x___ ____', 'G3'),
    }),
    bell: gyProg.map(TOLL),
    piano: bySection(gyProg, SONG, { chorus: (c) => chordBar(c, P332, 'G4') }),
    pad: gyProg.map((c) => padBar(c, 'D3')),
    riser: [...rest(23), 'D4:16'],
    bass: bySection(gyProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... .ttt')]),
      ...groove(4, FOG, [K4, CL, HOF, dr('.... .... .... tttt')]),
      ...groove(4, FOG, [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... ..tt tttt')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, HOF, CR], [K4, CL, HOF], [K4, CL, HOF], [K4, dr('.... c... .... ....'), dr('h.o. h.o. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Hexenturm (H-4, vertikal): 144 BPM, a-Moll, 24 Takte, treibend. Intro (a F C G): die Glocken spielen die Hook über dem
  // Cembalo | Strophe (a a d E | a a F E): Lead, Cembalo-Alberti in Sechzehnteln, treibender Bass | Refrain (a F C G | a F
  // d E): aufsteigende Wendeltreppen-Hook, die Glocken singen in den ersten Takten mit, Cembalo, Stabs | Überleitung (F G a
  // E): lange Töne, Kessel-Blubbern, Besen-Riser mit Rauschen.
  course_witchtower: {
    bpm: 144,
    voice: {
      lead: { ...SYNTH, cutoff: 4800, volume: 0.15 },
      bell: { volume: 0.09, decay: 0.5, ratio: 2.76, partial: 0.4 },
      arp: { type: 'sawtooth', volume: 0.045, decay: 0.09 },
      echo: { type: 'sine', volume: 0.07, decay: 0.12, glide: 1.7, glideTime: 0.1 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.045, bright: 0.9 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08, noise: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 160, volume: 0.36 } },
    fx: { lowpass: { arp: 4200 }, delay: { steps: 3, feedback: 0.3, lowpass: 3400, wet: 0.28, send: { bell: 0.4, echo: 0.4, lead: 0.14, arp: 0.15 } } },
    lead: [...rest(4), ...wtVerse, ...wtChorus, ...wtBridge],
    bell: [...wtHook, ...rest(8), wtChorus[0], wtChorus[1], ...rest(2), wtChorus[4], wtChorus[5], ...rest(6)],
    arp: bySection(wtProg, SONG, { intro: cembalo, verse: cembalo, chorus: cembalo8 }),
    echo: bySection(wtProg, SONG, { bridge: bubble }),
    piano: bySection(wtProg, SONG, { chorus: (c) => chordBar(c, OFF, 'E4'), bridge: (c) => chordBar(c, LONG, 'E4') }),
    stabs: bySection(wtProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(wtProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(22), 'A3:16', 'E4:16'],
    bass: bySection(wtProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_DRIVE), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, TOWER, [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, TOWER, [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ..tt tttt')], false),
      ...groove(4, TOWER, [K4, CL, HH, dr('.... .... .... ssss')]),
      ...groove(4, TOWER, [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8], FILL_S,
    ],
  },

  // Gruselschloss (H-Burg, Boss Graf Brummbär): 148 BPM, c-Moll, 24 Takte, dramatisch. Intro (c c As f-G): die Kirchenorgel
  // spielt das Baron-Brummbär-Motiv in doppelter Notenlänge, Turmglocke, Pauken | Strophe (c c f G | c c As G): Lead tief,
  // Chor-Pad, Galopp-Bass | Refrain (c As Es B | c As f G): Hook mit dem Kopf des Baron-Motivs und Fledermaus-Sprung,
  // Orgel-Akzente auf 1 und 3, Stabs, Piano auf der „und“, treibender Bass | Überleitung (As B c G): Orgel-Akkorde, Chor,
  // Turmglocke, Fledermaus-Flattern, Hoover-Riser über zwei Takte in den Loop.
  course_brummula: {
    bpm: 148,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.17 },
      organ: { volume: 0.06, cutoff: 2200 },
      bell: { type: 'sine', volume: 0.09, decay: 1.5, ratio: 2.4, partial: 0.5 },
      arp: { type: 'square', volume: 0.025, decay: 0.03 },
      stabs: { volume: 0.13, cutoff: 6000, cutoffEnd: 1600 },
      piano: { volume: 0.09 },
      pad: { volume: 0.06, bright: 0.85 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tom: { freq: 100, volume: 0.42 }, snare: { volume: 0.24 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { lowpass: { arp: 5000 }, delay: { steps: [3, 4], feedback: 0.34, lowpass: 2400, wet: 0.3, send: { organ: 0.2, bell: 0.4, pad: 0.2, lead: 0.14, tom: 0.15 } } },
    lead: [...rest(4), ...brVerse, ...brChorus, ...brBridge],
    organ: bySection(brProg, SONG, {
      intro: (c, i) => brBaron[i],
      chorus: (c) => chordBar(c, 'x___ .... x___ ....', 'G3'),
      bridge: (c) => chordBar(c, LONG, 'G3'),
    }),
    bell: bySection(brProg, SONG, { intro: (c, i) => (i % 2 ? '-:16' : 'C4:16'), bridge: (c, i) => (i % 2 ? '-:16' : `${tones(c, 'G3')[0]}:16`) }),
    arp: bySection(brProg, SONG, { bridge: flutter }),
    stabs: bySection(brProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    piano: bySection(brProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4') }),
    pad: bySection(brProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(22), 'G3:16', 'C4:14 -:2'],
    bass: bySection(brProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_GALLOP), chorus: (c) => bassBar(c, B_DRIVE), bridge: (c, i) => bassBar(c, i < 3 ? B_GALLOP : 'L.H_ L.H_ .... ....') }),
    drums: [
      [K4, PAUKE, CR], [K4, PAUKE], [K4, PAUKE, CL], [K4, CL, dr('.... .... tttt tttt')],
      ...groove(4, [...CASTLE.slice(0, 2), H8, PAUKE], [K4, CL, H8, dr('t... .... ..tt tttt')]),
      ...groove(4, [...CASTLE.slice(0, 2), H8, PAUKE], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('t... .... ..ss ssss')], false),
      ...groove(4, CASTLE, [K4, CL, HH, dr('t... .... tttt tttt')]),
      ...groove(4, CASTLE, [K4, CL, dr('hhoh hhoh hh.. ....'), dr('t... .... ..ss ssss')], false),
      [K4, PAUKE, CR], [K4, PAUKE], [K4, CL, PAUKE], [K4, dr('.... c... .... ....'), dr('tt.. tt.. ssss ssss')],
    ],
  },

  // Weltkarte Halloween: 126 BPM, d-Moll, 16 Takte, gemütlich-gruselig. Strophe (d B F C | d B g A): die Spieluhr-Celesta
  // singt, Pizzicato auf der „und“ | Refrain (B F C d | B F g A, VI–III–VII–i): weicher Lead im Wiegen, Piano auf der
  // „und“, das Theremin tupft lange Töne in die Antwort-Takte. Kick auf 1 und 3, Clap auf 2 und 4.
  course_halloween_map: {
    bpm: 126,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3000, volume: 0.18 },
      bell: { type: 'sine', volume: 0.11, decay: 0.6, ratio: 3, partial: 0.35 },
      whistle: { type: 'sine', volume: 0.1, vibrato: 35, rate: 5, slide: 2, attack: 0.1, gate: 0.9 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.06 },
      piano: { volume: 0.09, cutoff: 3800 },
      pad: { volume: 0.05, bright: 0.85 },
      bass: { cutoff: 650 },
    },
    kit: { hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: 3, feedback: 0.32, lowpass: 3000, wet: 0.32, send: { bell: 0.4, whistle: 0.4, lead: 0.2, piano: 0.2 } } },
    bell: [...hmBox, ...rest(8)],
    lead: [...rest(8), ...hmLead],
    whistle: [...rest(8), '-:16', '-:8 A5:8', '-:16', '-:8 F5:8', '-:16', '-:8 A5:8', '-:16', '-:8 E5:8'],
    arp: hmProg.map((c, i) => (i < 8 ? pat(tones(c, 'D4'), '..0. ..1. ..2. ..1.') : '-:16')),
    piano: [...rest(8), ...hmProg.slice(8).map((c) => chordBar(c, OFF, 'D4'))],
    pad: hmProg.map((c) => padBar(c)),
    bass: hmProg.map((c) => bassBar(c, B_HALF)),
    drums: [[...HMAP, CR], HMAP, HMAP, [KH, CL, dr('h.h. h.h. h.h. hhhh')], HMAP, HMAP, HMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...HMAP, CR], HMAP, HMAP, [KH, CL, dr('h.h. h.h. h.h. hhhh')], HMAP, HMAP, HMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')]],
  },
};
