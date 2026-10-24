// Kurs-Themen Welt 5 „Lila Strand-Insel“ – eigene Kompositionen im Stil des 90er-Eurodance
// (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Von Anfang an nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md) geschrieben, Maßstab Welt 1 und die
// neu komponierten Welten 2–4: jedes Thema ist ein Lied in Dur oder Moll – Intro (Hook-Riff auf einer
// Farb-Stimme) → Strophe (tiefer, ruhiger) → Refrain (höher, zweitaktige Hook A A' A A'') → Überleitung
// (Breakdown, lange Töne, Riser) –, Eurodance-Akkordfolgen, der Lead-Synth trägt die Melodie fast durchgehend,
// Off-Beat-Stabs, Piano, Pad, Oktav-Bass, Four-on-the-floor. Jede Hook hat ihr eigenes Rhythmus-Profil
// (Calypso-Wiege, Dreier-Schwung, Sechzehntel-Zellen, lange Rufe, Sechzehntel-Auftakte, Hüpf-Punktierung,
// Einsatz nach der Eins, Galopp-Aufstieg, Fanfare mit Vorschlägen) und ihre eigene Kontur; die Hook-Prüfung in
// tests/audio.mjs vergleicht sie mit allen Themen der Welten 1–5.
//
// Welt-Farbe nur über Klang: Steel-Drum und Marimba, Shaker, Claves und Congas (Strand, Karte), Kalliope-Orgel,
// Lotus-Flöte (Pfeife mit Glissando) und Dreier-Hats (Trapez), kalte Glas-Pings und Lava-Blubbern (blaue Lava),
// Penny-Whistle, Kalimba und Djembe (Savanne), hüpfender Riff-Bass und Spitzhacken-Klinken (Höhle), Glockenspiel,
// Pizzicato und Holzblock (Torte), gedämpfte Stimmen, Uhr-Ticken und Suchlicht-Riser (Schleich-Festung),
// Glitzer-Glocken und Dampfpfeife (Goldzug), Tempel-Gong, Chor-Pad und Taiko-Toms (Tempel).

import {
  dr, K4, KH, CL, HH, H8, CR, rest, tr, octaves, chordBar, bassBar, padBar, pat, voicing,
  B_BOUNCE, B_PUMP, B_GALLOP, B_HALF, form, bySection, groove,
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

// ================================================================ Sonnenstrand ====
// D-Dur, 132 BPM. Intro D h G A (die Steel-Drum spielt die Hook) | Strophe G A fis h | G A h A (IV–V–iii–vi) |
// Refrain D h G A | D h e A (I–vi–IV–V) | Überleitung e fis G A. Hook als Calypso-Wiege: „da DAA-di da DAA-di da da“
// (Sechzehntel-Vorschlag vor der Zählzeit), die Antwort wiederholt die Figur eine Terz tiefer.
const beProg = ['D', 'Bm', 'G', 'A', 'G', 'A', 'F#m', 'Bm', 'G', 'A', 'Bm', 'A', 'D', 'Bm', 'G', 'A', 'D', 'Bm', 'Em', 'A', 'Em', 'F#m', 'G', 'A'];
const beHook = ['F#5:2 A5:3 B5:1 A5:2 F#5:3 E5:1 D5:2 E5:2', 'D5:2 F#5:3 G5:1 F#5:2 D5:3 C#5:1 B4:2 C#5:2',
  'B4:2 D5:3 E5:1 G5:2 B5:3 A5:1 G5:2 E5:2', 'E5:4 D5:2 C#5:2 A4:4 -:2 C#5:1 E5:1'];
const beChorus = [...beHook, beHook[0], beHook[1], 'E5:2 G5:3 A5:1 B5:2 G5:3 F#5:1 E5:2 G5:2', 'A5:4 G5:2 F#5:2 E5:4 C#5:4'];
const beV = ['B4:4 A4:2 G4:2 A4:2 B4:2 D5:4', 'C#5:4 B4:2 A4:2 B4:2 C#5:2 E5:4', 'F#5:4 E5:2 C#5:2 A4:4 C#5:4'];
const beVerse = [...beV, 'D5:6 C#5:2 B4:8', beV[0], beV[1], 'D5:4 C#5:2 B4:2 F#5:4 D5:4', 'E5:4 C#5:2 D5:2 E5:4 -:2 E5:2'];
const beBridge = ['B4:8 E5:8', 'C#5:8 F#5:8', 'D5:8 G5:8', 'C#5:6 E5:2 A5:8'];
const marimba = (c) => pat(tones(c, 'D4'), '0.2. 1.2. 0.2. 1.2.');
const marimbaOff = (c) => pat(tones(c, 'F#4'), '..0. ..1. ..2. ..1.');   // Marimba auf der „und“ (Strophe)
const CLAVE = [dr('p... ..p. .... p...'), dr('.... p... p... ....')];                // 3-2-Son-Clave über zwei Takte
const CONGA = dr('.... ..d. .... ..dd');
const SHAKE = dr('j.j. j.j. j.j. j.j.');
const beach = (i, extra = []) => [K4, CL, SHAKE, CLAVE[i % 2], CONGA, ...extra];

// ================================================================ Zirkus-Trapez ====
// F-Dur, 138 BPM, im Dreier-Schwung: Melodie, Bass und Kalliope-Orgel gliedern den Takt 3+3+2 Achtel (Gruppen von
// 6 + 6 + 4 Sechzehnteln) über dem durchlaufenden Four-on-the-floor – das schwingt wie ein Trapez. Intro F a B C
// (die Orgel spielt die Hook) | Strophe d B F C | d B g C (vi–IV–I–V) | Refrain F a B C | F a g C (I–iii–IV–V) |
// Überleitung B C d C (die Lotus-Flöte gleitet in jeden Ton: „fliegen“). Hook „Taaa di-da TAAA di-da ta-ta“:
// zweimal aufwärts schwingen (das Trapez holt Schwung), die Antwort schwingt abwärts.
const tzProg = ['F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'C', 'F', 'Am', 'Bb', 'C', 'F', 'Am', 'Gm', 'C', 'Bb', 'C', 'Dm', 'C'];
const tzHook = ['C5:4 F5:1 G5:1 A5:4 F5:1 G5:1 A5:2 C6:2', 'C6:4 A5:1 G5:1 E5:4 G5:1 F5:1 E5:2 C5:2',
  'D5:4 F5:1 G5:1 Bb5:4 F5:1 G5:1 Bb5:2 D6:2', 'C6:4 Bb5:1 A5:1 G5:4 E5:1 F5:1 G5:4'];
const tzChorus = [...tzHook, tzHook[0], tzHook[1], 'Bb5:4 A5:1 G5:1 D5:4 E5:1 F5:1 G5:2 Bb5:2', 'C6:4 Bb5:1 A5:1 G5:4 E5:1 D5:1 C5:4'];
const tzV = ['A4:2 Bb4:2 C5:2 D5:4 C5:2 A4:4', 'Bb4:2 C5:2 D5:2 F5:4 D5:2 Bb4:4', 'A4:2 Bb4:2 C5:2 F5:4 E5:2 C5:4'];
const tzVerse = [...tzV, 'E5:6 D5:6 C5:4', tzV[0], tzV[1], 'Bb4:2 C5:2 D5:2 G5:4 F5:2 D5:4', 'E5:4 D5:1 C5:1 G4:4 A4:2 Bb4:4'];
const tzBridge = ['D5:6 F5:6 Bb5:4', 'E5:6 G5:6 C6:4', 'F5:6 A5:6 D6:4', 'C6:6 Bb5:6 G5:4'];
const OOMPA = '..x. x... x.x. ..x.';        // Orgel „pa-pa“ auf den Achteln 2 und 3 jeder Dreiergruppe
const TZ_HAT = dr('o.h. h.o. h.h. o.h.');     // offen auf dem Beginn jeder Dreiergruppe (0, 6, 12)
const TRAPEZ = [K4, CL, TZ_HAT];

// ================================================================ Blaue Lava ====
// g-Moll, 150 BPM, 16 Takte, kurz und hektisch (100-s-Level). Intro g F (das Piano spielt die Hook) | Strophe c g Es D |
// Refrain g F Es D ×2 (andalusische Kadenz, die Hook steigt als Sequenz mit ihr ab) | Überleitung Es D. Hook aus
// Sechzehntel-Zellen „di-di-DA di-di-DA di-di-DA da da“ – rennend, aber singbar.
const BL_SONG = form({ intro: 2, verse: 4, chorus: 8, bridge: 2 });
const blProg = ['Gm', 'F', 'Cm', 'Gm', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D', 'Eb', 'D'];
const blHook = ['G5:1 A5:1 Bb5:2 A5:1 G5:1 F#5:2 G5:1 A5:1 Bb5:2 D6:2 Bb5:2', 'F5:1 G5:1 A5:2 G5:1 F5:1 Eb5:2 F5:1 G5:1 A5:2 C6:2 A5:2',
  'Eb5:1 F5:1 G5:2 F5:1 Eb5:1 D5:2 Eb5:1 F5:1 G5:2 Bb5:2 G5:2', 'F#5:2 G5:2 A5:2 Bb5:2 A5:4 F#5:2 D5:2'];
const blChorus = [...blHook, blHook[0], blHook[1], blHook[2], 'D6:2 C6:2 Bb5:2 A5:2 G5:4 F#5:2 D5:2'];
const blVerse = ['G4:2 C5:2 D5:2 Eb5:2 D5:4 C5:4', 'Bb4:2 D5:2 C5:2 Bb4:2 A4:4 G4:4', 'G4:2 Bb4:2 C5:2 D5:2 Eb5:4 G5:4', 'F#5:2 A5:2 G5:2 F#5:2 D5:4 F#5:4'];
const blBridge = ['G5:8 Bb5:8', 'A5:8 F#5:4 D5:4'];
const plop = (c) => pat(tones(c, 'G3'), '..0. ..1. ..0. ..2.');     // Lava-Blubbern (Sinus gleitet abwärts)

// ================================================================ Savanne ====
// A-Dur, 130 BPM, weit und offen. Intro D A E fis (die Penny-Whistle spielt die Hook über Djembe und Kalimba) |
// Strophe fis D A E | fis D h E (vi–IV–I–V) | Refrain D A E fis | D A E E (IV–I–V–vi) | Überleitung h cis D E.
// Hook als Ruf über die Weite: pentatonischer Lauf hinauf zum langen Ton („e fis a h – DEEE“), die Antwort läuft
// hinab; dieselbe Figur als Sequenz über D – A – E – fis.
const svProg = ['D', 'A', 'E', 'F#m', 'F#m', 'D', 'A', 'E', 'F#m', 'D', 'Bm', 'E', 'D', 'A', 'E', 'F#m', 'D', 'A', 'E', 'E', 'Bm', 'C#m', 'D', 'E'];
const svHook = ['E5:2 F#5:2 A5:2 B5:2 -:2 D6:6', 'C#6:2 B5:2 A5:2 F#5:2 -:2 E5:6', 'B4:2 C#5:2 E5:2 F#5:2 -:2 G#5:6', 'A5:2 G#5:2 F#5:2 E5:2 -:2 C#5:6'];
const svChorus = [...svHook, svHook[0], svHook[1], 'B4:2 C#5:2 E5:2 F#5:2 -:2 B5:6', 'B5:2 A5:2 G#5:2 F#5:2 -:2 E5:6'];
const svV = ['C#5:4 A4:2 F#4:2 A4:2 B4:2 C#5:4', 'D5:4 C#5:2 A4:2 F#4:2 A4:2 B4:4', 'C#5:4 E5:2 F#5:2 E5:2 C#5:2 A4:4'];
const svVerse = [...svV, 'B4:6 G#4:2 B4:4 -:4', svV[0], svV[1], 'D5:4 C#5:2 B4:2 A4:2 B4:2 D5:4', 'E5:4 D5:2 B4:2 G#4:4 B4:2 D5:2'];
const svBridge = ['F#5:8 D5:8', 'G#5:8 E5:8', 'A5:8 F#5:8', 'B5:8 G#5:4 E5:4'];
const kalimba = (c) => pat(tones(c, 'C#5'), '0.1. .2.0 ..1. 2...');
const DJEMBE = [dr('d..d ..d. d... ..d.'), dr('..p. .p.p ..p. .pp.')];
const SAV = [K4, ...DJEMBE, dr('j.j. j.j. j.j. j.j.')];
const SAV_C = [K4, CL, ...DJEMBE, dr('j.j. j.j. j.j. j.j.')];

// ================================================================ Zündkopf-Höhle ====
// d-Moll, 136 BPM, verschmitzt und Bass-lastig: ein hüpfender Riff-Bass (Grundton, Quinte, Oktave mit
// Sechzehntel-Vorschlägen) trägt das Stück. Intro d g C F (das Piano spielt die Hook) | Strophe d d B A | d d g A |
// Refrain d g C F | d g A A (i–iv–VII–III, Quintfall) | Überleitung B C d A (Zündschnur-Zischen = Riser). Hook
// „DA . di-DA . di-DA di-di DA“: Dreiklang hinauf mit Sechzehntel-Vorschlägen, verschmitzt zurück.
const miProg = ['Dm', 'Gm', 'C', 'F', 'Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'Gm', 'A', 'Dm', 'Gm', 'C', 'F', 'Dm', 'Gm', 'A', 'A', 'Bb', 'C', 'Dm', 'A'];
const miHook = ['D5:2 -:1 F5:1 A5:2 -:1 F5:1 G5:2 F5:1 E5:1 D5:2 -:2', 'Bb4:2 -:1 D5:1 G5:2 -:1 D5:1 F5:2 E5:1 D5:1 Bb4:2 -:2',
  'C5:2 -:1 E5:1 G5:2 -:1 E5:1 F5:2 E5:1 D5:1 C5:2 -:2', 'A5:2 -:1 G5:1 F5:2 -:1 E5:1 D5:2 C5:2 A4:2 C5:2'];
const miChorus = [...miHook, miHook[0], miHook[1], 'C#5:2 -:1 E5:1 A5:2 -:1 G5:1 F5:2 E5:1 D5:1 C#5:2 -:2', 'E5:1 -:1 C#5:1 -:1 A4:2 -:6 G4:1 A4:1 C#5:1 -:1'];
const miV = ['F4:2 A4:2 -:2 D5:2 C5:2 A4:2 -:4', 'F4:2 A4:2 -:2 D5:2 E5:2 F5:2 -:4', 'D5:2 Bb4:2 -:2 F4:2 G4:2 Bb4:2 -:4', 'C#5:2 E5:2 -:2 A5:2 G5:2 E5:2 C#5:4'];
const miVerse = [...miV, miV[0], miV[1], 'D5:2 Bb4:2 -:2 G4:2 A4:2 Bb4:2 -:4', 'E5:2 C#5:2 -:2 A4:2 C#5:2 E5:2 -:2 C#5:2'];
const miBridge = ['F5:8 D5:8', 'G5:8 E5:8', 'A5:8 F5:8', 'E5:8 C#5:8'];
const MI_BASS = 'L_.L F_.L H_L_ F_H_';   // Riff-Bass: tief, Vorschlag, Quinte, Oktave
const PICK = dr('...x .... ..x. ...x');   // Spitzhacken-Klinken
const MINE = [K4, CL, H8, PICK];

// ================================================================ Torten-Welt ====
// E-Dur, 144 BPM, zuckersüß. Intro E A cis H (das Glockenspiel spielt die Hook) | Strophe A H gis cis | A H fis H
// (IV–V–iii–vi) | Refrain E A cis H | E A fis H (I–IV–vi–V) | Überleitung A H cis H. Hook in gebrochenen Terzen
// aufwärts – „e gis fis a gis h cis h“, Stockwerk für Stockwerk die Torte hinauf –, die Antwort mit Seufzer; das
// Glockenspiel singt im Refrain mit, Pizzicato tupft auf der „und“.
const caProg = ['E', 'A', 'C#m', 'B', 'A', 'B', 'G#m', 'C#m', 'A', 'B', 'F#m', 'B', 'E', 'A', 'C#m', 'B', 'E', 'A', 'F#m', 'B', 'A', 'B', 'C#m', 'B'];
const caHook = ['E5:2 G#5:2 F#5:2 A5:2 G#5:2 B5:2 C#6:2 B5:2', 'C#6:3 B5:1 A5:2 E5:2 F#5:4 -:2 E5:1 D#5:1',
  'C#5:2 E5:2 D#5:2 F#5:2 E5:2 G#5:2 A5:2 G#5:2', 'F#5:3 E5:1 D#5:2 B4:2 D#5:4 F#5:4'];
const caChorus = [...caHook, caHook[0], caHook[1], 'F#5:2 A5:2 G#5:2 B5:2 A5:2 C#6:2 B5:2 A5:2', 'B5:4 A5:2 F#5:2 D#5:4 B4:4'];
const caV = ['C#5:2 E5:2 A5:3 G#5:1 F#5:2 E5:2 C#5:4', 'D#5:2 F#5:2 B5:3 A5:1 G#5:2 F#5:2 D#5:4', 'B4:2 D#5:2 G#5:3 F#5:1 E5:2 D#5:2 B4:4'];
const caVerse = [...caV, 'C#5:4 E5:4 G#5:8', caV[0], caV[1], 'A4:2 C#5:2 F#5:3 E5:1 C#5:2 B4:2 A4:4', 'B4:2 D#5:2 F#5:2 A5:2 G#5:4 A5:4'];
const caBridge = ['E5:8 C#5:8', 'F#5:8 D#5:8', 'G#5:8 E5:8', 'D#5:4 F#5:4 A5:8'];
const pizz = (c) => pat(tones(c, 'G#4'), '..0. ..1. ..2. ..1.');
const sprinkle = (c) => pat(tones(c, 'E6'), '0.1. 2... 1.0. ....');
const WOOD = dr('...p ..p. ...p .p..');   // Holzblock
const CAKE = [K4, CL, H8, WOOD];

// ================================================================ Schleich-Festung ====
// b-Moll, 130 BPM, geheimnisvoll und gedämpft, aber mit Hook. Intro b Ges es F (das gedämpfte Piano spielt die Hook) |
// Strophe b b Ges F | b b es F (pochender Bass, Pizzicato auf Zehenspitzen, Uhr-Ticken) | Refrain b Ges es F ×2
// (i–VI–iv–V) | Überleitung Ges As b F (Suchlicht = Riser). Hook schleicht in Sechzehntel-Paaren zu langen Tönen:
// „b-c DEEES . c-des FAA . es-des“, die langen Töne hallen im Echo nach; die Antwort schleicht zurück.
const snProg = ['Bbm', 'Gb', 'Ebm', 'F', 'Bbm', 'Bbm', 'Gb', 'F', 'Bbm', 'Bbm', 'Ebm', 'F', 'Bbm', 'Gb', 'Ebm', 'F', 'Bbm', 'Gb', 'Ebm', 'F', 'Gb', 'Ab', 'Bbm', 'F'];
const snHook = ['Bb4:1 C5:1 Db5:4 -:2 C5:1 Db5:1 F5:3 -:1 Eb5:1 Db5:1', 'Bb4:1 C5:1 Db5:4 -:2 Eb5:1 Db5:1 Bb4:3 -:1 Gb4:1 Ab4:1',
  'Bb4:1 C5:1 Eb5:4 -:2 Db5:1 Eb5:1 Gb5:3 -:1 F5:1 Eb5:1', 'A4:4 C5:4 F5:4 Eb5:2 C5:2'];
const snChorus = [...snHook, snHook[0], snHook[1], 'Eb5:1 F5:1 Gb5:4 -:2 F5:1 Gb5:1 Bb5:3 -:1 Ab5:1 Gb5:1', 'F5:4 Eb5:2 C5:2 A4:4 C5:4'];
const snV = ['F4:2 Bb4:2 Db5:2 C5:2 Bb4:4 -:4', 'F4:2 Bb4:2 Db5:2 Eb5:2 F5:4 -:4', 'Gb5:2 F5:2 Db5:2 Bb4:2 Db5:4 -:4', 'C5:2 A4:2 F4:4 -:4 A4:2 C5:2'];
const snVerse = [...snV, snV[0], snV[1], 'Gb5:2 F5:2 Eb5:2 Bb4:2 Eb5:4 -:4', 'Eb5:2 C5:2 A4:2 F4:2 A4:4 -:4'];
const snBridge = ['Db5:8 Bb4:8', 'Eb5:8 C5:8', 'F5:8 Db5:8', 'C5:8 A4:4 -:4'];
const tiptoe = (c) => pat(tones(c, 'F4'), '0.1. 0.2. 0.1. 0.2.');
const CLOCK = dr('x... x... x... x...');
const RIM = dr('.... p... .... p...');
const SNEAK = [K4, RIM, dr('h.o. h.o. h.o. h.o.'), CLOCK];
const SNEAK_C = [K4, CL, HH, CLOCK];

// ================================================================ Goldzug ====
// H-Dur, 156 BPM, euphorisch. Intro H Fis gis E (Dampfpfeife und Glitzer-Glocken) | Strophe H dis E Fis ×2
// (I–iii–IV–V) | Refrain H Fis gis E | H Fis E Fis (I–V–vi–IV) | Überleitung gis E H Fis (Hoover-Riser, Wirbel).
// Hook im Galopp: „Faa-di fa ha DEE-di cis HAAA“ – die Tonleiter hinauf zum Grundton, Sprung zur Terz, Lösung.
const goProg = ['B', 'F#', 'G#m', 'E', 'B', 'D#m', 'E', 'F#', 'B', 'D#m', 'E', 'F#', 'B', 'F#', 'G#m', 'E', 'B', 'F#', 'E', 'F#', 'G#m', 'E', 'B', 'F#'];
const goHook = ['F#5:3 G#5:1 A#5:2 B5:2 D#6:3 C#6:1 B5:4', 'A#5:3 B5:1 C#6:2 A#5:2 F#5:3 G#5:1 A#5:4',
  'B5:3 C#6:1 D#6:2 B5:2 G#5:3 A#5:1 B5:4', 'G#5:3 F#5:1 E5:2 G#5:2 B5:4 G#5:2 E5:2'];
const goChorus = [...goHook, goHook[0], goHook[1], 'G#5:3 A#5:1 B5:2 C#6:2 E6:3 D#6:1 C#6:4', 'C#6:3 B5:1 A#5:2 F#5:2 A#5:8'];
const goV = ['F#4:2 B4:2 C#5:2 D#5:4 C#5:2 B4:4', 'F#4:2 A#4:2 C#5:2 D#5:4 F#5:2 D#5:4', 'G#4:2 B4:2 E5:2 F#5:4 E5:2 B4:4'];
const goVerse = [...goV, 'A#4:4 C#5:4 F#5:6 -:2', goV[0], goV[1], 'G#4:2 B4:2 E5:2 G#5:4 F#5:2 E5:4', 'C#5:4 D#5:2 E5:2 F#5:4 -:2 E5:2'];
const goBridge = ['D#5:8 G#5:8', 'E5:8 G#5:8', 'F#5:8 B5:8', 'A#5:8 C#6:8'];
const glitter = (c) => pat(tones(c, 'D#6'), '0120 1201 0120 1201');
const CHUG = dr('h.hh h.hh h.hh h.hh');
const GOLD = [K4, CL, CHUG];

// ================================================================ Ruinen-Tempel ====
// gis-Moll, 146 BPM, dramatisch. Intro gis E H Fis (Tempel-Gong, Stabs im Hook-Rhythmus) | Strophe gis gis cis Dis |
// gis gis E Dis (i–iv–V) | Refrain gis E H Fis | gis E cis Dis (i–VI–III–VII) | Überleitung E Fis gis Dis. Hook als
// Moll-Fanfare in zwei Anläufen: lange Töne, jeweils über zwei Sechzehntel-Vorschläge angesprungen („DIIIS gis-ais
// HAAA cis-dis“), dann der Gipfel „EEE dis-E H GIS“.
const teProg = ['G#m', 'E', 'B', 'F#', 'G#m', 'G#m', 'C#m', 'D#', 'G#m', 'G#m', 'E', 'D#', 'G#m', 'E', 'B', 'F#', 'G#m', 'E', 'C#m', 'D#', 'E', 'F#', 'G#m', 'D#'];
const teHook = ['D#5:6 G#5:1 A#5:1 B5:6 C#6:1 D#6:1', 'E6:4 D#6:2 E6:2 B5:4 G#5:4', 'F#5:6 G#5:1 A#5:1 B5:6 C#6:1 D#6:1', 'B5:4 A#5:2 F#5:2 C#5:4 D#5:4'];
const teChorus = [...teHook, teHook[0], teHook[1], 'E5:6 G#5:1 A#5:1 B5:6 C#6:1 D#6:1', 'D#6:4 A#5:2 G5:2 D#5:4 G5:4'];
const teV = ['D#5:4 B4:2 G#4:2 A#4:2 B4:2 D#5:4', 'E5:4 D#5:2 B4:2 A#4:2 G#4:2 F#4:4', 'E5:4 C#5:2 G#4:2 A#4:2 B4:2 C#5:4'];
const teVerse = [...teV, 'A#4:4 G4:4 A#4:6 -:2', teV[0], teV[1], 'G#4:2 B4:2 E5:4 D#5:2 B4:2 G#4:4', 'G4:4 A#4:2 D#5:2 G5:4 -:2 A#4:2'];
const teBridge = ['E5:8 G#5:8', 'F#5:8 A#5:8', 'G#5:8 B5:8', 'A#5:4 G5:4 D#5:8'];
const TAIKO = dr('t... ..t. t... t.t.');
const TEMPLE = [K4, CL, H8, TAIKO];

// ================================================================ Karte Welt 5 ====
// C-Dur, 128 BPM, 16 Takte, freundlich. Strophe C e F G | C e d G (Piano-Melodie, Marimba auf der „und“) | Refrain
// F G e a | F G C C (IV–V–iii–vi, weicher Lead in der Calypso-Wiege, Steel-Drum-Tupfer). Kick auf 1 und 3, Shaker, Claves.
const m5Prog = ['C', 'Em', 'F', 'G', 'C', 'Em', 'Dm', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];
const m5Piano = ['G4:2 C5:2 E5:3 D5:1 C5:2 E5:2 G5:4', 'B4:2 E5:2 G5:3 F5:1 E5:2 D5:2 B4:4', 'A4:2 C5:2 F5:3 E5:1 D5:2 F5:2 A5:4', 'G5:4 F5:2 E5:2 D5:8',
  'G4:2 C5:2 E5:3 D5:1 C5:2 E5:2 G5:4', 'B4:2 E5:2 G5:3 F5:1 E5:2 D5:2 B4:4', 'A4:2 D5:2 F5:3 E5:1 D5:2 C5:2 A4:4', 'B4:4 D5:4 G5:8'];
const m5Lead = ['F5:2 A5:2 G5:3 F5:1 E5:2 F5:2 C5:4', 'G5:2 B5:2 A5:3 G5:1 F5:2 G5:2 D5:4', 'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 B4:4', 'C5:2 E5:2 A5:6 G5:2 E5:4',
  'F5:2 A5:2 G5:3 F5:1 E5:2 F5:2 C5:4', 'G5:2 B5:2 A5:3 G5:1 F5:2 G5:2 D5:4', 'E5:2 G5:2 C6:3 B5:1 A5:2 G5:2 E5:4', 'D5:4 E5:4 C5:8'];
const W5MAP = [KH, CL, dr('j.j. j.j. j.j. j.j.'), dr('p... ..p. .... p...')];

export const WORLD5_THEMES = {
  // Sonnenstrand (5-1, Strand mit Höhlenfluss): 132 BPM, D-Dur, 24 Takte, fröhlich. Intro: die Steel-Drum spielt die
  // Hook über Marimba und Pad | Strophe (G A fis h | G A h A): Lead in der Mittellage, Marimba auf der „und“ | Refrain (D h G A | D h e A, I–vi–IV–V): Calypso-Hook, die Steel-Drum singt eine Oktave tiefer mit, Piano
  // auf der „und“, Stabs | Überleitung: lange Töne, Marimba, Riser. Shaker, 3-2-Clave und Congas statt Hi-Hats.
  course_beach: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.15 },
      bell: { type: 'triangle', volume: 0.11, decay: 0.3, ratio: 2, partial: 0.55 },
      arp: { type: 'sine', volume: 0.09, decay: 0.08 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.045, bright: 1.1 },
      riser: { volume: 0.07 },
    },
    kit: { tek: { freq: 2500, volume: 0.13 }, doum: { freq: 190, volume: 0.26, decay: 0.18 }, jingle: { volume: 0.16 }, tom: { freq: 320, volume: 0.3 }, clap: { volume: 0.28 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3200, wet: 0.28, send: { bell: 0.35, arp: 0.3, lead: 0.15 } } },
    lead: [...rest(4), ...beVerse, ...beChorus, ...beBridge],
    bell: bySection(beProg, SONG, { intro: (c, i) => beHook[i], chorus: (c, i) => tr(beChorus, -12)[i] }),
    arp: bySection(beProg, SONG, { intro: marimba, verse: marimbaOff, bridge: marimba }),
    piano: bySection(beProg, SONG, { chorus: (c) => chordBar(c, OFF, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    stabs: bySection(beProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(beProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'A3:16'],
    bass: bySection(beProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      [K4, SHAKE, CLAVE[0], CR], [K4, SHAKE, CLAVE[1]], [K4, SHAKE, CLAVE[0], CONGA], [K4, CL, SHAKE, CLAVE[1], dr('.... .... .... t.tt')],
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => (i === 0 ? [...beach(0), CR] : beach(i))), beach(1, [dr('.... .... ..t. tttt')]),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => (i === 0 ? [...beach(0), CR] : beach(i))), beach(1, [dr('.... .... t.t. tttt')]),
      [K4, CL, SHAKE, CLAVE[0], CR], [K4, CL, SHAKE, CLAVE[1]], [K4, CL, SHAKE, CLAVE[0], CONGA], [K4, dr('.... c... .... ....'), dr('j.j. j.j. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Zirkus-Trapez (5-2): 138 BPM, F-Dur, 24 Takte, schwungvoll im Dreier-Gefühl über Four-on-the-floor. Intro: die
  // Kalliope-Orgel spielt die Hook | Strophe (d B F C | d B g C): Lead in Achtel-Dreiergruppen, Orgel „pa-pa“ und Bass
  // auf den Gruppen-Anfängen (0, 6, 12) | Refrain (F a B C | F a g C): Hook schwingt auf und ab, Humpa-Bass in
  // Dreiern, Stabs | Überleitung: die Lotus-Flöte gleitet in lange Töne („fliegen“), Wirbel und Tusch in den Loop.
  course_trapeze: {
    bpm: 138,
    voice: {
      lead: { ...SYNTH, cutoff: 4800, volume: 0.15 },
      organ: { volume: 0.05, cutoff: 3400, octave: false },
      whistle: { type: 'sine', volume: 0.14, vibrato: 18, rate: 6, slide: 7, attack: 0.04, gate: 0.94 },
      piano: { volume: 0.09, oscs: 1 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.045 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, snare: { volume: 0.2 }, open: { volume: 0.14, duration: 0.12 }, hat: { volume: 0.24, off: 0.16 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.28, send: { whistle: 0.4, lead: 0.15, organ: 0.12 } } },
    lead: [...rest(4), ...tzVerse, ...tzChorus, ...rest(4)],
    organ: bySection(tzProg, SONG, { intro: (c, i) => tzHook[i], verse: (c) => chordBar(c, OOMPA, 'A3'), chorus: (c) => chordBar(c, OOMPA, 'A3') }),
    whistle: [...rest(20), ...tzBridge],
    piano: bySection(tzProg, SONG, { chorus: (c) => chordBar(c, 'x_____ x_____ x___', 'F4'), bridge: (c) => chordBar(c, 'x_____ x_____ x___', 'F4') }),
    stabs: bySection(tzProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(tzProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(tzProg, SONG, {
      intro: (c) => bassBar(c, 'L___ __F_ ____ H___'),
      verse: (c) => bassBar(c, 'L___ __F_ ____ H___'),
      chorus: (c) => bassBar(c, 'L_H_ H_L_ H_H_ L_H_'),
      bridge: (c, i) => bassBar(c, i < 3 ? 'L___ __F_ ____ H___' : 'L_H_ H_L_ ____ ____'),
    }),
    drums: [
      ...groove(4, TRAPEZ, [K4, CL, dr('o.h. h.o. h.h. ....'), dr('.... .... .... ssss')]),
      ...groove(4, TRAPEZ, [K4, CL, TZ_HAT, dr('.... .... ..s. .s.s')]),
      ...groove(4, TRAPEZ, [K4, CL, dr('o.h. h.o. h.h. ....'), dr('.... .... ssss ssss')], false),
      ...groove(4, [K4, CL, TZ_HAT, dr('.... ..s. .... ....')], [K4, CL, TZ_HAT, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, TZ_HAT, dr('.... ..s. .... ....')], [K4, CL, dr('o.h. h.o. h.h. ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, TZ_HAT, CR], [K4, CL, TZ_HAT], [K4, CL, TZ_HAT], [K4, dr('.... c... .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Blaue Lava (5-3, unterirdisch, nur 100 s): 150 BPM, g-Moll, 16 Takte, kurz und hektisch. Intro: das Piano spielt
  // die Hook in Oktaven, Lava-Blubbern | Strophe (c g Es D): Lead, Piano auf der „und“ | Refrain (g F Es D ×2): Hook aus
  // Sechzehntel-Zellen als absteigende Sequenz, kalte Glas-Pings, Galopp-Bass, Stabs, Sechzehntel-Hats | Überleitung:
  // lange Töne, Hoover-Riser in den Loop.
  course_bluelava: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 4800, volume: 0.17 },
      piano: { volume: 0.1 },
      arp: { type: 'sine', volume: 0.1, decay: 0.12, glide: 0.5, glideTime: 0.1 },
      bell: { type: 'sine', volume: 0.06, decay: 0.25, ratio: 3.4, partial: 0.5 },
      stabs: { volume: 0.12, cutoff: 5500, cutoffEnd: 1400 },
      pad: { volume: 0.045, bright: 0.8 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tom: { freq: 150, volume: 0.36 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 2600, wet: 0.3, send: { bell: 0.5, arp: 0.3, lead: 0.12 } } },
    lead: [...rest(2), ...blVerse, ...blChorus, ...blBridge],
    piano: bySection(blProg, BL_SONG, { intro: (c, i) => octaves(tr(blHook, -12))[i], verse: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    arp: bySection(blProg, BL_SONG, { intro: plop, verse: plop, bridge: plop }),
    bell: bySection(blProg, BL_SONG, { chorus: (c) => pat(tones(c, 'D6'), '.... ..0. .... ..1.') }),
    stabs: bySection(blProg, BL_SONG, { intro: (c) => chordBar(c, 'x..x ..x. ..x. x...'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(blProg, BL_SONG, { verse: (c) => padBar(c, 'D3'), chorus: (c) => padBar(c, 'D3'), bridge: (c) => padBar(c, 'D3') }),
    riser: [...rest(15), 'D4:16'],
    bass: bySection(blProg, BL_SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 1 ? B_GALLOP : 'L.H_ L.H_ .... ....') }),
    drums: [
      [K4, CL, HH, CR], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')],
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..tt tttt')],
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..tt tttt')], false),
      [K4, CL, HH, CR], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Savannenberge (5-4): 130 BPM, A-Dur, 24 Takte, weit und offen. Intro: die Penny-Whistle spielt die Hook über
  // Djembe (Bass- und Slap-Schläge), Kalimba und weitem Pad | Strophe (fis D A E | fis D h E): Lead in der Mittellage,
  // Kalimba-Ostinato, Trommel-Antworten in den Phrasenpausen | Refrain (D A E fis | D A E E): Ruf-Hook als Sequenz,
  // Clap dazu, Piano auf der „und“, Stabs | Überleitung: lange Töne, die Whistle antwortet, großer Tom-Wirbel.
  course_savanna: {
    bpm: 130,
    voice: {
      lead: { ...SYNTH, cutoff: 4400, volume: 0.15 },
      whistle: { type: 'triangle', volume: 0.15, vibrato: 12, rate: 5.5, slide: 2, attack: 0.03, gate: 0.9 },
      arp: { type: 'sine', volume: 0.08, decay: 0.16 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 1.25 },
      bass: { cutoff: 700 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.55 }, doum: { volume: 0.34, freq: 92, decay: 0.32 }, tek: { volume: 0.18, freq: 820, off: 0.7 }, jingle: { volume: 0.14 }, tom: { freq: 120, volume: 0.42 }, clap: { volume: 0.28 } },
    fx: { delay: { steps: [3, 6], feedback: 0.38, lowpass: 3000, wet: 0.32, send: { whistle: 0.4, arp: 0.45, lead: 0.18, pad: 0.2, tom: 0.15 } } },
    whistle: [...svHook, ...rest(16), '-:16', '-:8 B5:4 G#5:4', '-:16', '-:8 B5:8'],
    lead: [...rest(4), ...svVerse, ...svChorus, ...svBridge],
    arp: bySection(svProg, SONG, { intro: kalimba, verse: kalimba, bridge: kalimba }),
    piano: bySection(svProg, SONG, { chorus: (c) => chordBar(c, OFF, 'E4') }),
    stabs: bySection(svProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: svProg.map((c) => padBar(c)),
    riser: [...rest(23), 'E4:16'],
    bass: bySection(svProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, SAV, [K4, ...DJEMBE, dr('.... .... t.t. tttt')]),
      ...groove(4, SAV, [K4, ...DJEMBE, dr('.... .... .... t.tt')]),
      ...groove(4, SAV, [K4, CL, ...DJEMBE, dr('.... .... tttt tttt')], false),
      ...groove(4, SAV_C, [K4, CL, ...DJEMBE, dr('.... .... .... tttt')]),
      ...groove(4, SAV_C, [K4, CL, ...DJEMBE, dr('.... .... t.tt tttt')], false),
      [K4, ...DJEMBE, CR], [K4, ...DJEMBE], [K4, CL, ...DJEMBE], [K4, dr('.... c... .... ....'), dr('d..d ..d. .... ....'), dr('.... .... tttt tttt')],
    ],
  },

  // Zündkopf-Höhle (5-5, POW-Blöcke, lila Ziegelwand): 136 BPM, d-Moll, 24 Takte, verschmitzt und Bass-lastig. Intro:
  // das Piano spielt die Hook in Oktaven über dem Riff-Bass | Strophe (d d B A | d d g A): der Riff-Bass führt, der
  // Lead antwortet in kurzen Phrasen, Spitzhacken-Klinken | Refrain (d g C F | d g A A): Hook mit Sechzehntel-
  // Vorschlägen als Quintfall-Sequenz, Stabs auf der „und“ | Überleitung: lange Töne, die Zündschnur zischt (Riser
  // mit Rauschen) in den Loop.
  course_mine: {
    bpm: 136,
    voice: {
      lead: { ...SYNTH, cutoff: 3800, volume: 0.16 },
      piano: { volume: 0.1, cutoff: 3800 },
      stabs: { volume: 0.11, cutoff: 4000, cutoffEnd: 1000 },
      pad: { volume: 0.04, bright: 0.75 },
      bass: { volume: 0.22, cutoff: 1150 },
      riser: { volume: 0.08, noise: 0.06 },
    },
    kit: { kick: { volume: 0.56, pitchStart: 140 }, clap: { volume: 0.3 }, tick: { freq: 3400, volume: 0.09, decay: 0.05 }, tom: { freq: 110, volume: 0.38 }, hat: { volume: 0.24, off: 0.15 } },
    fx: { delay: { steps: [3, 4], feedback: 0.3, lowpass: 2200, wet: 0.3, send: { lead: 0.15, tick: 0.5, clap: 0.25 } } },
    lead: [...rest(4), ...miVerse, ...miChorus, ...miBridge],
    piano: bySection(miProg, SONG, { intro: (c, i) => octaves(tr(miHook, -12))[i], chorus: (c) => chordBar(c, '..x. ..x. ..x. ..x.', 'F4'), bridge: (c) => chordBar(c, LONG, 'F4') }),
    stabs: bySection(miProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(miProg, SONG, { verse: (c) => padBar(c, 'D3'), chorus: (c) => padBar(c, 'D3'), bridge: (c) => padBar(c, 'D3') }),
    riser: [...rest(22), 'A3:16', 'D4:16'],
    bass: bySection(miProg, SONG, { intro: (c) => bassBar(c, MI_BASS), verse: (c) => bassBar(c, MI_BASS), chorus: (c) => bassBar(c, MI_BASS), bridge: (c, i) => bassBar(c, i < 3 ? 'L___ __L. F___ H___' : 'L_.L F_.L ____ ____') }),
    drums: [
      ...groove(4, [K4, CL, PICK], [K4, CL, PICK, dr('.... .... .... t.tt')]),
      ...groove(4, MINE, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, MINE, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..tt tttt')], false),
      ...groove(4, [K4, CL, HH, PICK], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, PICK], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, PICK, CR], [K4, CL, PICK], [K4, CL, H8, PICK], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('...x ...x xxxx xxxx')],
    ],
  },

  // Torten-Welt (5-6, Rot-Blau-Flipper): 144 BPM, E-Dur, 24 Takte, zuckersüß und verspielt. Intro: das Glockenspiel
  // spielt die Hook | Strophe (A H gis cis | A H fis H): Lead, Pizzicato auf der „und“, Holzblock | Refrain (E A cis H |
  // E A fis H): Hook in gebrochenen Terzen, das Glockenspiel singt in den Hook-Takten mit, Piano 3-3-2, Stabs |
  // Überleitung: lange Töne, Zuckerstreusel (hohe Glocken-Arpeggien), Riser.
  course_cake: {
    bpm: 144,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.15 },
      bell: { volume: 0.09, decay: 0.45, ratio: 2.76, partial: 0.35 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.06 },
      echo: { type: 'sine', volume: 0.05, decay: 0.2 },
      piano: { volume: 0.08, oscs: 1, cutoff: 5000 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.045, bright: 1.2 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tek: { freq: 1500, volume: 0.16 }, tom: { freq: 260, volume: 0.32 }, hat: { volume: 0.26, off: 0.16 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 4200, wet: 0.28, send: { bell: 0.45, echo: 0.5, lead: 0.15 } } },
    lead: [...rest(4), ...caVerse, ...caChorus, ...caBridge],
    bell: [...caHook, ...rest(8), caChorus[0], caChorus[1], ...rest(2), caChorus[4], caChorus[5], ...rest(6)],
    echo: bySection(caProg, SONG, { bridge: sprinkle }),
    arp: bySection(caProg, SONG, { verse: pizz }),
    piano: bySection(caProg, SONG, { intro: (c) => chordBar(c, OFF, 'G#4'), chorus: (c) => chordBar(c, P332, 'G#4'), bridge: (c) => chordBar(c, LONG, 'G#4') }),
    stabs: bySection(caProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(caProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'B3:16'],
    bass: bySection(caProg, SONG, { intro: (c) => bassBar(c, B_BOUNCE), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, CAKE, [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, CAKE, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, WOOD], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, WOOD], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, WOOD], FILL_S,
    ],
  },

  // Schleich-Festung (5-7, Suchscheinwerfer): 130 BPM, b-Moll, 24 Takte, geheimnisvoll, gedämpft, aber mit Hook. Intro:
  // das gedämpfte Piano spielt die Hook in Oktaven | Strophe (b b Ges F | b b es F): Lead tief und leise, Pizzicato auf
  // Zehenspitzen, pochender Oktav-Bass, Rim-Klick statt Clap, Uhr-Ticken | Refrain (b Ges es F ×2): Hook in Sechzehntel-Paaren, die
  // langen Töne hallen im Echo nach, Sechzehntel-Hats, Clap | Überleitung: Suchlicht-Riser über die vier Takte.
  // Tiefpass auf Piano, Stabs und Pad, Lead weich (2,4 kHz) – die Melodie bleibt vorn.
  course_sneak: {
    bpm: 130,
    voice: {
      lead: { ...SYNTH, cutoff: 2600, volume: 0.18, q: 2 },
      piano: { volume: 0.12, cutoff: 2600, cutoffEnd: 900 },
      arp: { type: 'triangle', volume: 0.09, decay: 0.05 },
      stabs: { volume: 0.12, cutoff: 2600, cutoffEnd: 700 },
      pad: { volume: 0.05, bright: 0.6 },
      bass: { cutoff: 560, volume: 0.2 },
      riser: { volume: 0.06, glide: 1.5, noise: 0.05 },
    },
    kit: { kick: { pitchStart: 125, click: 0.12, volume: 0.52 }, clap: { volume: 0.26 }, tek: { freq: 900, volume: 0.18 }, tick: { freq: 1800, volume: 0.08, decay: 0.04 }, hat: { volume: 0.22, off: 0.14 }, open: { volume: 0.12 }, tom: { freq: 120, volume: 0.32 } },
    fx: {
      lowpass: { piano: 1800, stabs: 1600, pad: 1400 },
      delay: { steps: 3, feedback: 0.4, lowpass: 1800, wet: 0.38, send: { lead: 0.35, arp: 0.3, tek: 0.3, clap: 0.3 } },
    },
    lead: [...rest(4), ...snVerse, ...snChorus, ...snBridge],
    piano: bySection(snProg, SONG, { intro: (c, i) => octaves(tr(snHook, -12))[i], chorus: (c) => chordBar(c, OFF, 'F4'), bridge: (c) => chordBar(c, LONG, 'F4') }),
    arp: bySection(snProg, SONG, { verse: tiptoe, bridge: tiptoe }),
    stabs: bySection(snProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: snProg.map((c) => padBar(c, 'D3')),
    riser: [...rest(20), 'F3:16', 'Bb3:16', 'C4:16', 'F4:16'],
    bass: bySection(snProg, SONG, { intro: (c) => bassBar(c, 'L_.. L_.. L_.. L_..'), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_PUMP), bridge: (c) => bassBar(c, 'L_.. L_.. L_.. L_..') }),
    drums: [
      ...groove(4, [K4, RIM, CLOCK], [K4, RIM, CLOCK, dr('.... .... .... ..tt')]),
      ...groove(4, SNEAK, [K4, RIM, dr('h.o. h.o. h.o. ....'), CLOCK, dr('.... .... .... .ttt')]),
      ...groove(4, SNEAK, [K4, RIM, dr('h.o. h.o. h.o. ....'), CLOCK, dr('.... .... .... tttt')], false),
      ...groove(4, SNEAK_C, [K4, CL, dr('hhoh hhoh hhoh ....'), CLOCK, dr('.... .... .... tttt')]),
      ...groove(4, SNEAK_C, [K4, CL, dr('hhoh hhoh hhoh ....'), CLOCK, dr('.... .... ..ss ssss')], false),
      [K4, RIM, CLOCK, CR], [K4, RIM, CLOCK], [K4, RIM, CLOCK, dr('h.o. h.o. h.o. h.o.')], [K4, dr('.... c... .... ....'), CLOCK, dr('.... .... ssss ssss')],
    ],
  },

  // Goldzug (5-Zug, Bonus-Autoscroller voller Münzen): 156 BPM, H-Dur, 24 Takte, euphorisch und schnell. Intro: die
  // Dampfpfeife ruft, Glitzer-Glocken spielen die Hook | Strophe (H dis E Fis ×2): Lead, Piano auf der „und“,
  // Tschu-ku-Hats | Refrain (H Fis gis E | H Fis E Fis): Galopp-Hook zum Grundton hinauf, Glitzer-Arpeggien, Rave-Piano
  // 3-3-2, Stabs | Überleitung: lange, steigende Töne, Hoover-Riser über zwei Takte, Wirbel.
  course_goldtrain: {
    bpm: 156,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.15 },
      bell: { volume: 0.08, decay: 0.35, ratio: 2.76, partial: 0.35 },
      whistle: { type: 'sine', volume: 0.12, vibrato: 10, rate: 5, slide: 0.6, attack: 0.02, gate: 0.85 },
      arp: { type: 'square', volume: 0.03, decay: 0.06 },
      piano: { volume: 0.08, oscs: 1 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.04, bright: 1.2 },
      bass: { volume: 0.17, cutoff: 820 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, hat: { volume: 0.26, off: 0.15 }, tom: { freq: 210, volume: 0.36 } },
    fx: { lowpass: { arp: 5500 }, delay: { steps: 3, feedback: 0.28, lowpass: 4000, wet: 0.25, send: { bell: 0.45, whistle: 0.35, arp: 0.3, lead: 0.12 } } },
    whistle: [...rest(20), 'D#6:6 -:2 D#6:6 -:2', '-:16', 'D#6:6 -:2 F#6:8', '-:16'],
    bell: [...goHook, ...rest(20)],
    lead: [...rest(4), ...goVerse, ...goChorus, ...goBridge],
    arp: bySection(goProg, SONG, { chorus: glitter }),
    piano: bySection(goProg, SONG, { intro: (c) => chordBar(c, OFF, 'F#4'), verse: (c) => chordBar(c, OFF, 'F#4'), chorus: (c) => chordBar(c, P332, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    stabs: bySection(goProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(goProg, SONG, { intro: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(22), 'F#3:16', 'B3:14 -:2'],
    bass: bySection(goProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L_H_ L_H_ .... ....') }),
    drums: [
      ...groove(4, GOLD, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... .... ssss')]),
      ...groove(4, GOLD, [K4, CL, CHUG, dr('.... .... .... tttt')]),
      ...groove(4, GOLD, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, CHUG, CR], [K4, CL, CHUG], [K4, CL, CHUG, dr('..s. ..s. ..s. ..s.')], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Ruinen-Tempel (5-Burg, Boss Kippquader-König): 146 BPM, gis-Moll, 24 Takte, dramatisch. Intro: harte Stabs im
  // Hook-Rhythmus, Tempel-Gong, Taiko-Toms | Strophe (gis gis cis Dis | gis gis E Dis): Lead tief, Chor-Pad, Galopp-Bass
  // | Refrain (gis E H Fis | gis E cis Dis): Moll-Fanfare mit Vorschlägen, Stabs auf der Eins, Piano auf der „und“ |
  // Überleitung: lange Töne über Gong und Chor, Hoover-Riser über zwei Takte in den Loop.
  course_temple: {
    bpm: 146,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.17 },
      bell: { volume: 0.12, decay: 1.1, ratio: 2.4, partial: 0.5 },
      stabs: { volume: 0.14, cutoff: 6500, cutoffEnd: 1800 },
      piano: { volume: 0.08, oscs: 1 },
      pad: { volume: 0.06, bright: 1.15 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tom: { freq: 95, volume: 0.42 }, snare: { volume: 0.24 } },
    fx: { delay: { steps: [3, 4], feedback: 0.35, lowpass: 2400, wet: 0.3, send: { bell: 0.4, lead: 0.15, tom: 0.15, pad: 0.15 } } },
    lead: [...rest(4), ...teVerse, ...teChorus, ...teBridge],
    bell: bySection(teProg, SONG, { intro: (c, i) => (i % 2 ? '-:16' : `${tones(c, 'G#2')[0]}:16`), verse: (c, i) => (i % 4 ? '-:16' : 'G#2:16'), chorus: (c, i) => (i % 4 ? '-:16' : 'G#2:16'), bridge: (c) => `${tones(c, 'D#2')[0]}:16` }),
    stabs: bySection(teProg, SONG, {
      intro: (c) => chordBar(c, 'x_____ xxx_____ xx', 'G#3'),
      chorus: (c) => chordBar(c, 'x... .... x... ....', 'G#3'),
      bridge: (c) => chordBar(c, 'x.xx .x.x x.xx .x..', 'G#3'),
    }),
    piano: bySection(teProg, SONG, { intro: (c, i) => octaves(tr(teHook, -12))[i], chorus: (c) => chordBar(c, OFF, 'G#4') }),
    pad: bySection(teProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(22), 'D#3:16', 'G#3:14 -:2'],
    bass: bySection(teProg, SONG, { intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_GALLOP), chorus: (c) => bassBar(c, B_PUMP), bridge: (c, i) => bassBar(c, i < 3 ? B_GALLOP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, TAIKO], [K4, dr('t... ..t. tttt tttt')]),
      ...groove(4, TEMPLE, [K4, CL, H8, dr('t... ..t. ..tt tttt')]),
      ...groove(4, TEMPLE, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('t... ..t. ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, TAIKO], [K4, CL, HH, dr('t... ..t. tttt tttt')]),
      ...groove(4, [K4, CL, HH, TAIKO], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('t... ..t. ..ss ssss')], false),
      [K4, TAIKO, CR], [K4, TAIKO], [K4, CL, TAIKO], [K4, dr('.... c... .... ....'), dr('tt.. tt.. ssss ssss')],
    ],
  },

  // Weltkarte Welt 5: 128 BPM, C-Dur, 16 Takte, freundlich. Strophe (C e F G | C e d G): Piano-Melodie mit leichtem Echo,
  // Marimba auf der „und“ | Refrain (F G e a | F G C C, IV–V–iii–vi): weicher Lead in der Calypso-Wiege, Piano auf der
  // „und“, Steel-Drum-Tupfer am Phrasenende. Kick auf 1 und 3, Clap auf 2 und 4, Shaker und Clave.
  course_world5_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3000, volume: 0.17 },
      piano: { volume: 0.12, cutoff: 4000 },
      bell: { type: 'triangle', volume: 0.08, decay: 0.3, ratio: 2, partial: 0.55 },
      arp: { type: 'sine', volume: 0.07, decay: 0.08 },
      pad: { volume: 0.05 },
      bass: { cutoff: 650 },
    },
    kit: { tek: { freq: 2500, volume: 0.11 }, jingle: { volume: 0.13 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.3, send: { piano: 0.3, lead: 0.2, bell: 0.4 } } },
    piano: [...m5Piano, ...m5Prog.slice(8).map((c) => chordBar(c, OFF, 'E4'))],
    lead: [...rest(8), ...m5Lead],
    bell: [...rest(8), '-:12 C6:2 E6:2', '-:16', '-:12 B5:2 G5:2', '-:16', '-:12 A5:2 C6:2', '-:16', '-:12 E6:2 G6:2', '-:16'],
    arp: m5Prog.map((c, i) => (i < 8 ? pat(tones(c, 'E4'), '..0. ..1. ..2. ..1.') : '-:16')),
    pad: m5Prog.map((c) => padBar(c)),
    bass: m5Prog.map((c) => bassBar(c, B_HALF)),
    drums: [[...W5MAP, CR], W5MAP, W5MAP, [KH, CL, dr('j.j. j.j. jjjj jjjj'), dr('.... p... p... ....')],
      W5MAP, W5MAP, W5MAP, [KH, CL, dr('j.j. j.j. j.j. jjjj'), dr('.... p... p... ....')],
      [...W5MAP, CR], W5MAP, W5MAP, [KH, CL, dr('j.j. j.j. jjjj jjjj'), dr('.... p... p... ....')],
      W5MAP, W5MAP, W5MAP, [KH, CL, dr('j.j. j.j. j.j. jjjj'), dr('.... p... p... ....')]],
  },
};
