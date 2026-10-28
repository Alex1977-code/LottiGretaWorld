// Kurs-Themen der Bonuswelt Stern „Sternenzelt“ (Level S-1 … S-9 und Karte; S-Kapitän spielt course_diorama) – eigene
// Kompositionen im Stil des 90er-Eurodance (Stil ja, Zitat nein; keine Anklänge an bekannte Weltraum- oder Galaxie-
// Spielmusik). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md) geschrieben, Maßstab Welt 1, Welt 7 und Welt 8: jedes Thema ist ein
// Lied in Dur oder Moll – Intro (Hook auf einer Farb-Stimme) → Strophe (tiefer, ruhiger) → Refrain (höher, Hook A B C D
// A B + zwei Schluss-Takte) → Überleitung (Breakdown, lange Töne, Sternschnuppen-Riser) –, Eurodance-Akkordfolgen, der
// Lead-Synth trägt die Melodie fast durchgehend, Off-Beat-Stabs, Piano, Pad, Oktav-Bass, Four-on-the-floor (Karte: Kick
// auf 1 und 3). Die Welt-Farbe kommt nur aus dem Klang: allen Themen gemeinsam sind Weltraum-Hall (Echo-Netz mit zwei
// Abgriffen), Kristall-Pads (helles Pad), Glitzer-Glocken bzw. Sternenglitzern, das Chor-„Aah“ (weiche Dreieck-Stimme mit
// langsamem Anschlag) und Sternschnuppen-Riser (Riser mit Rauschen) vor Refrain und Loop.
//
// Hook-Profile (tests/audio.mjs vergleicht sie mit allen Themen der Welten 1–8, der Halloween-Welt und untereinander –
// Einsatz + Intervall und Kontur ohne Rhythmus):
//   Regenbogenweg     Regenbogen-Bogen: der Dreiklang schießt in Sechzehnteln zur Oktave hinauf, oben ein langer
//                     Leuchtton, dann ein kleiner Schnörkel und sachte hinab („e-gis-h E' . . h cis-h gis“)
//   Planetoiden       Planeten-Sprung: punktierter Ton, Oktavsprung in einen langen schwebenden Ton, dann schwebt die
//                     Melodie über Terz und Nebennote zum Grundton hinab; die Antwort gleitet ohne Sprung
//   Walzen-Athletik   Walzen-Rollen: drei Sechzehntel rollen den Dreiklang hinab und noch einmal, dann hüpfen Achtel
//                     über die Nebennote zurück („f-d-b f-d-b d f g f d“)
//   Zielmast-Jagd     Hinterher: zwei Anlauf-Sechzehntel, dann greift die Melodie immer weiter hinauf (Terz, Quarte,
//                     Quinte); die Antwort fällt punktiert zurück
//   Blockland         Block-Treppe: drei Stufen hinauf, einen Schritt zurück, drei Stufen hinauf … bis zum langen
//                     Gipfelton; die Antwort steigt die Treppe hinab
//   Waben-Sternenweg  Summ-Waben: der Dreiklang hinauf, oben summt ein Sechzehntel-Triller (die Biene), dann zurück
//   Riesen-Dschungel  Riesenschritt: zwei schwere Viertel hinauf, ein kleines Stolpern hinab, dann ein Riesensprung
//   Nebelfriedhof     Schlotter-Schunkeln: punktierte „Hu-hu“-Schwünge mit der oberen Nebennote, in Terzen hinab
//   Kanonen-Weltraum  Laser-Pingpong: Quinte hinab und wieder hinauf („pju – pju“), dann landet die Melodie in Achteln
//   Karte             Sternenstaub: Ton mit Nachschlag und unterer Nebennote, eine Terz hinauf und sacht zurück
//
// Welt-Farbe je Thema: aufsteigende Regenbogen-Arpeggien, Glitzer-Glocken und Energie-Ebene beim Reiten (Regenbogenweg);
// Glockenspiel, Chor-Pad, weiter Hall und kreisende Planeten-Arpeggien (Planetoiden); Marimba, Holzblock, rollende
// Sechzehntel und Walzen-Rumpeln (Walzen-Athletik); Jagdhörner, Flügelschlag (Schellen-Flattern) und 150 BPM
// (Zielmast-Jagd); Rechteck-Lead und Puls-Stimme im Chip-Stil, Chip-Arpeggien und Rausch-Snare über Eurodance
// (Blockland); summende Bienen-Stimme (Sägezahn mit schnellem Vibrato hinter Tiefpass), Waben-Ostinato aus sechs Tönen und
// tiefes Brummen (Waben-Sternenweg); große Trommeln, Riesenschritte, Pizzicato-Bass und Riesen-Hörner (Riesen-Dschungel);
// Schellen, Celesta, Theremin-Hauch und Nebel-Pad (Nebelfriedhof); Arpeggiator, Laser-Stabs, Computer-Piepser und
// Kanonen-Schläge (Kanonen-Weltraum); Sternenstaub-Glöckchen und Chor-„Aah“ (Karte).

import {
  dr, K4, KH, CL, HH, H8, H8O, HOF, CR, rest, chordBar, bassBar, padBar, pat, voicing,
  B_BOUNCE, B_PUMP, B_GALLOP, B_DRIVE, B_HALF, form, bySection, groove,
} from './themeParts.js';

const SYNTH = { sub: false, bend: 0.985, detune: 10 };  // Lead-Synth (siehe Welt 2)
const OFF = '..x_ ..x_ ..x_ ..x_';
const ST24 = '.... ..x_ .... ..x_';
const LONG = 'x_______ x_______';
const SONG = form({ intro: 4, verse: 8, chorus: 8, bridge: 4 });
const tones = (c, lo) => voicing(c, lo).split('+');
const BREAK_BASS = (c, i) => bassBar(c, i < 3 ? B_HALF : 'L_H_ L_H_ ____ ____');
const FILL_S = [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')]; // Wirbel in den Loop
/** Refrain aus vier Hook-Takten: A B C D A B + zwei eigene Schluss-Takte. */
const chorusOf = (hook, x, y) => [...hook, hook[0], hook[1], x, y];

// ---- Weltraum-Farben (allen Sternenzelt-Themen gemeinsam) ----
const AAH = { type: 'triangle', volume: 0.07, vibrato: 10, rate: 5, slide: 0, attack: 0.3, gate: 0.98 };   // Chor-„Aah“
const GLITTER = { type: 'sine', volume: 0.05, decay: 0.3 };                                                // Sternenglitzern
const glitter = (c, lo = 'E6') => pat(tones(c, lo), '.... .... ..2. 1.0.');   // Glitzer-Tupfer am Phrasen-Ende

// ================================================================ Regenbogenweg (S-1, Reitfahrt) ====
// E-Dur, 140 BPM, strahlend. Intro E gis A H (die Glitzer-Glocken spielen die Hook über Regenbogen-Arpeggien) | Strophe
// cis A E H | cis A fis H (vi–IV–I–V | vi–IV–ii–V, Sternenglitzern) | Refrain E gis A H | E gis fis H (I–iii–IV–V – der
// Bass steigt wie ein Regenbogen; I–iii–ii–V) | Überleitung A H cis H (das Chor-„Aah“ singt). Energie-Ebene beim Reiten.
const rbProg = ['E', 'G#m', 'A', 'B', 'C#m', 'A', 'E', 'B', 'C#m', 'A', 'F#m', 'B', 'E', 'G#m', 'A', 'B', 'E', 'G#m', 'F#m', 'B', 'A', 'B', 'C#m', 'B'];
const rbHook = ['E5:1 G#5:1 B5:1 E6:5 B5:2 C#6:1 B5:1 G#5:4', 'D#5:1 G#5:1 B5:1 D#6:5 B5:2 C#6:1 B5:1 G#5:4',
  'C#5:1 E5:1 A5:1 C#6:5 A5:2 B5:1 A5:1 E5:4', 'D#5:1 F#5:1 B5:1 D#6:5 B5:2 C#6:1 B5:1 F#5:4'];
const rbChorus = chorusOf(rbHook, 'C#5:1 F#5:1 A5:1 C#6:5 A5:2 B5:1 A5:1 F#5:4', 'D#5:1 F#5:1 B5:1 D#6:5 B5:2 A5:2 F#5:2 D#5:2');
const rbV = ['C#5:2 D#5:2 E5:3 D#5:1 C#5:2 B4:2 C#5:4', 'A4:2 B4:2 C#5:3 B4:1 A4:2 G#4:2 A4:4', 'B4:2 C#5:2 E5:3 D#5:1 E5:2 F#5:2 G#5:4', 'F#5:2 E5:2 D#5:3 C#5:1 B4:2 C#5:2 D#5:4'];
const rbVerse = [...rbV, rbV[0], rbV[1], 'A4:2 B4:2 C#5:3 B4:1 A4:2 B4:2 C#5:4', 'D#5:2 E5:2 F#5:3 E5:1 D#5:2 C#5:2 D#5:4'];
const rbBridge = ['E5:8 C#5:8', 'D#5:8 F#5:8', 'E5:8 G#5:8', 'F#5:8 D#5:8'];
const rbChoir = ['C#6:16', 'D#6:16', 'E6:16', 'D#6:16'];
const rainbow = (c) => pat([...tones(c, 'E4'), ...tones(c, 'E5')], '0123 45.. 0123 45..');   // Regenbogen-Arpeggio hinauf
const SPARKS = dr('..j. ..j. ..j. .jj.');                                                       // Glitzer-Schellen

// ================================================================ Planetoiden (S-2) ====
// As-Dur, 132 BPM, weit und schwebend. Intro As Es f Des (das Glockenspiel spielt die Hook, Chor-„Aah“) | Strophe f Des As Es |
// f Des b Es (vi–IV–I–V | vi–IV–ii–V, kreisende Planeten-Arpeggien) | Refrain As Es f Des | As Es Des Es (I–V–vi–IV |
// I–V–IV–V, das Glockenspiel singt mit) | Überleitung Des Es f Es. Pad in allen Takten, weiter Hall.
const gxProg = ['Ab', 'Eb', 'Fm', 'Db', 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Bbm', 'Eb', 'Ab', 'Eb', 'Fm', 'Db', 'Ab', 'Eb', 'Db', 'Eb', 'Db', 'Eb', 'Fm', 'Eb'];
const gxHook = ['Eb5:3 Eb6:5 C6:2 Db6:2 C6:2 Ab5:2', 'Bb5:6 C6:2 Bb5:2 G5:2 Eb5:4',
  'C5:3 C6:5 Ab5:2 Bb5:2 Ab5:2 F5:2', 'F5:2 Ab5:2 Db6:4 Ab5:2 Bb5:2 Ab5:4'];
const gxChorus = chorusOf(gxHook, 'Ab5:3 Db6:5 Ab5:2 Bb5:2 Ab5:2 F5:2', 'Eb5:2 G5:2 Bb5:4 G5:2 Ab5:2 G5:2 Eb5:2');
const gxIntro = [gxHook[0], gxHook[1], 'C5:3 F5:5 Ab5:2 Bb5:2 Ab5:2 F5:2', 'F5:2 Ab5:2 Db6:4 Ab5:2 F5:2 Db5:4'];   // Takt 4 führt zur Strophe
const gxV = ['C5:4 Bb4:2 Ab4:2 C5:6 Bb4:2', 'Ab4:4 Bb4:2 C5:2 Db5:6 C5:2', 'C5:4 Db5:2 C5:2 Eb5:6 Db5:2', 'Bb4:4 C5:2 Bb4:2 G4:8'];
const gxVerse = [...gxV, gxV[0], gxV[1], 'Db5:4 C5:2 Bb4:2 Db5:6 C5:2', 'Bb4:4 C5:2 Db5:2 Eb5:4 G5:4'];
const gxBridge = ['F5:8 Ab5:8', 'G5:8 Bb5:8', 'Ab5:8 C6:8', 'Bb5:8 G5:8'];
const gxChoir = ['Ab5:16', 'Bb5:16', 'C6:16', 'Bb5:16'];
const orbit = (c) => pat(tones(c, 'Ab4'), '0.1. 2.1. 0.1. 2.1.');   // kreisende Planeten (Sinus-Zupfer)

// ================================================================ Walzen-Athletik (S-3) ====
// B-Dur, 142 BPM, hölzern. Intro B g Es F (die Marimba spielt die Hook) | Strophe Es F d g | Es F c F (IV–V–iii–vi |
// IV–V–ii–V, rollende Holz-Sechzehntel, Holzblock) | Refrain B g Es F | B g c F (I–vi–IV–V | I–vi–ii–V, die Marimba
// spielt mit, Walzen-Rumpeln) | Überleitung Es F g F.
const rrProg = ['Bb', 'Gm', 'Eb', 'F', 'Eb', 'F', 'Dm', 'Gm', 'Eb', 'F', 'Cm', 'F', 'Bb', 'Gm', 'Eb', 'F', 'Bb', 'Gm', 'Cm', 'F', 'Eb', 'F', 'Gm', 'F'];
const rrHook = ['F5:1 D5:1 Bb4:1 F5:1 D5:1 Bb4:1 D5:2 F5:2 G5:2 F5:2 D5:2', 'D5:1 Bb4:1 G4:1 D5:1 Bb4:1 G4:1 Bb4:2 D5:2 G5:2 A5:2 Bb5:2',
  'Bb5:1 G5:1 Eb5:1 Bb5:1 G5:1 Eb5:1 G5:2 Bb5:2 C6:2 Bb5:2 G5:2', 'C6:1 A5:1 F5:1 C6:1 A5:1 F5:1 F5:2 A5:2 G5:2 F5:2 Eb5:2'];
const rrChorus = chorusOf(rrHook, 'G5:1 Eb5:1 C5:1 G5:1 Eb5:1 C5:1 C5:2 Eb5:2 G5:2 Bb5:2 G5:2', 'C6:1 A5:1 F5:1 C6:1 A5:1 F5:1 A5:2 C6:2 A5:2 F5:2 C5:2');
const rrV = ['Eb5:2 -:1 Bb4:1 Eb5:2 F5:2 G5:4 F5:2 Eb5:2', 'C5:2 -:1 A4:1 C5:2 D5:2 F5:4 Eb5:2 C5:2', 'A4:2 -:1 F4:1 A4:2 C5:2 D5:4 C5:2 A4:2', 'Bb4:2 -:1 G4:1 Bb4:2 C5:2 D5:4 C5:2 Bb4:2'];
const rrVerse = [...rrV, rrV[0], rrV[1], 'G4:2 -:1 Eb4:1 G4:2 Bb4:2 C5:4 Bb4:2 G4:2', 'A4:2 -:1 F4:1 A4:2 C5:2 F5:4 Eb5:2 D5:2'];
const rrBridge = ['Eb5:8 G5:8', 'F5:8 A5:8', 'G5:8 Bb5:8', 'A5:8 F5:8'];
const roll = (c) => pat(tones(c, 'Bb4'), '0120 1201 2012 0120');   // rollende Holz-Sechzehntel
const WOOD = dr('p..p ..p. p..p ..p.');                              // Holzblock 3-3-2
const RUMBLE = dr('d... ..d. d.d. ..d.');                            // Walzen-Rumpeln

// ================================================================ Zielmast-Jagd (S-4) ====
// D-Dur, 150 BPM, Verfolgung. Intro D h G A (die Jagdhörner spielen die Hook) | Strophe h G D A | h G e A (vi–IV–I–V |
// vi–IV–ii–V, Flügelschlag) | Refrain D h G A | D h e A (I–vi–IV–V | I–vi–ii–V, Galopp-Bass, Hörner-Stöße) | Überleitung
// G A h A.
const gpProg = ['D', 'Bm', 'G', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'A', 'D', 'Bm', 'G', 'A', 'D', 'Bm', 'Em', 'A', 'G', 'A', 'Bm', 'A'];
const gpHook = ['D5:1 D5:1 F#5:2 E5:1 E5:1 G5:2 F#5:1 F#5:1 A5:2 B5:2 A5:2', 'D6:3 C#6:1 B5:2 F#5:2 B5:3 A5:1 F#5:4',
  'B4:1 B4:1 D5:2 C#5:1 C#5:1 E5:2 D5:1 D5:1 F#5:2 G5:2 F#5:2', 'C#6:3 B5:1 A5:2 E5:2 A5:3 G5:1 E5:4'];
const gpChorus = chorusOf(gpHook, 'E5:1 E5:1 G5:2 F#5:1 F#5:1 A5:2 G5:1 G5:1 B5:2 A5:2 G5:2', 'C#6:3 B5:1 A5:2 E5:2 A5:3 G5:1 E5:4');
const gpV = ['D5:2 C#5:2 B4:2 C#5:2 D5:4 F#5:2 E5:2', 'D5:2 C#5:2 B4:2 C#5:2 D5:4 G5:2 F#5:2', 'F#5:2 E5:2 D5:2 E5:2 F#5:4 A5:2 F#5:2', 'E5:2 D5:2 C#5:2 D5:2 E5:4 A5:2 G5:2'];
const gpVerse = [...gpV, gpV[0], gpV[1], 'E5:2 D5:2 B4:2 D5:2 E5:4 G5:2 E5:2', 'E5:2 D5:2 C#5:2 D5:2 E5:4 A5:2 G5:2'];
const gpBridge = ['D5:8 B4:8', 'C#5:8 E5:8', 'D5:8 F#5:8', 'E5:8 C#5:8'];
const FLAP = dr('..jj .... ..jj ....');                              // Flügelschlag (flapp-flapp)

// ================================================================ Blockland (S-5, Retro) ====
// C-Dur, 144 BPM, Retro. Intro C a F G (der Rechteck-Lead spielt die Hook) | Strophe F G e a | F G d G (IV–V–iii–vi |
// IV–V–ii–V, Chip-Arpeggien) | Refrain C a F G | C a d G (I–vi–IV–V | I–vi–ii–V, der Rechteck-Lead spielt mit) |
// Überleitung F G a G (die Puls-Stimme singt mit Chip-Vibrato).
const blProg = ['C', 'Am', 'F', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'Dm', 'G', 'C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G', 'F', 'G', 'Am', 'G'];
const blHook = ['E5:1 F5:1 G5:2 F5:1 G5:1 A5:2 G5:1 A5:1 B5:2 C6:4', 'C6:1 B5:1 A5:2 B5:1 A5:1 G5:2 A5:1 G5:1 E5:2 -:2 E5:2',
  'A4:1 B4:1 C5:2 B4:1 C5:1 D5:2 C5:1 D5:1 E5:2 F5:4', 'B5:1 A5:1 G5:2 A5:1 G5:1 F5:2 G5:1 F5:1 D5:2 -:2 D5:2'];
const blChorus = chorusOf(blHook, 'A5:1 G5:1 F5:2 G5:1 F5:1 E5:2 F5:1 E5:1 D5:2 -:2 D5:2', 'B4:1 C5:1 D5:2 C5:1 D5:1 E5:2 D5:1 E5:1 F5:2 G5:4');
const blV = ['A4:2 C5:2 F5:2 C5:2 A4:2 C5:2 F5:4', 'B4:2 D5:2 G5:2 D5:2 B4:2 D5:2 B4:4', 'G4:2 B4:2 E5:2 B4:2 G4:2 B4:2 E5:4', 'A4:2 C5:2 E5:2 C5:2 A4:2 C5:2 E5:4'];
const blVerse = [...blV, blV[0], blV[1], 'A4:2 D5:2 F5:2 D5:2 A4:2 D5:2 F5:4', 'B4:2 D5:2 G5:2 D5:2 B4:2 D5:2 D5:4'];
const blBridge = ['A5:8 F5:8', 'G5:8 B5:8', 'A5:8 E5:8', 'D5:8 B4:8'];
const blPulse = ['C6:8 A5:8', 'B5:8 D6:8', 'C6:8 A5:8', 'B5:8 G5:8'];
const chip = (c) => pat([...tones(c, 'C5'), tones(c, 'C6')[0]], '0123 0123 0123 0123');   // Chip-Arpeggio
const NOISE = dr('.... s... .... s...');                                                    // Rausch-Snare zum Clap

// ================================================================ Waben-Sternenweg (S-6, Draufsicht) ====
// fis-Moll, 136 BPM, geheimnisvoll. Intro fis D A E (die summende Bienen-Stimme spielt die Hook) | Strophe fis fis D E |
// fis fis h Cis (i–VI–VII | i–iv–V, tiefes Brummen) | Refrain fis D A E | fis D h Cis (i–VI–III–VII | i–VI–iv–V,
// Waben-Ostinato) | Überleitung D E fis Cis.
const hcProg = ['F#m', 'D', 'A', 'E', 'F#m', 'F#m', 'D', 'E', 'F#m', 'F#m', 'Bm', 'C#', 'F#m', 'D', 'A', 'E', 'F#m', 'D', 'Bm', 'C#', 'D', 'E', 'F#m', 'C#'];
const hcHook = ['F#5:2 A5:2 C#6:1 B5:1 C#6:1 B5:1 C#6:2 B5:2 A5:2 E5:2', 'D5:2 F#5:2 A5:1 G#5:1 A5:1 G#5:1 A5:2 F#5:2 D5:2 C#5:2',
  'C#5:2 E5:2 A5:1 G#5:1 A5:1 G#5:1 A5:2 E5:2 C#5:2 B4:2', 'B4:2 E5:2 G#5:1 F#5:1 G#5:1 F#5:1 G#5:2 E5:2 B4:2 C#5:2'];
const hcChorus = chorusOf(hcHook, 'B4:2 D5:2 F#5:1 E5:1 F#5:1 E5:1 F#5:2 D5:2 B4:2 C#5:2', 'C#5:2 E#5:2 G#5:1 F#5:1 G#5:1 F#5:1 G#5:2 E#5:2 C#5:2 G#4:2');
const hcV = ['C#5:4 A4:2 F#4:2 A4:4 C#5:2 B4:2', 'A4:4 C#5:2 E5:2 F#5:4 E5:2 C#5:2', 'D5:4 A4:2 F#4:2 A4:4 D5:2 C#5:2', 'B4:4 G#4:2 E4:2 G#4:4 B4:2 C#5:2'];
const hcVerse = [...hcV, hcV[0], hcV[1], 'D5:4 B4:2 F#4:2 B4:4 D5:2 C#5:2', 'C#5:4 G#4:2 E#4:2 G#4:4 C#5:2 E#5:2'];
const hcBridge = ['A4:8 D5:8', 'B4:8 E5:8', 'C#5:8 F#5:8', 'E#5:8 C#5:8'];
const hex = (c) => pat(tones(c, 'C#5'), '0121 0201 2102 0121');      // Waben-Ostinato: sechs Töne im Kreis über 16 Schritte
const hum = (c) => `${tones(c, 'F#3')[0]}:16`;                       // tiefes Brummen (Grundton)

// ================================================================ Riesen-Dschungel (S-7) ====
// c-Moll, 130 BPM, tief und gewichtig. Intro c As Es B (die Riesen-Hörner spielen die Hook, große Trommeln) | Strophe
// c c As B | c c f G (i–VI–VII | i–iv–V, Pizzicato-Bass und -Zupfer, Riesenschritte) | Refrain c As Es B | c As f G
// (i–VI–III–VII | i–VI–iv–V) | Überleitung As B c G.
const gtProg = ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G', 'Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G', 'Ab', 'Bb', 'Cm', 'G'];
const gtHook = ['G4:4 C5:4 Eb5:2 D5:1 C5:1 G5:4', 'Eb5:4 C5:4 Ab4:2 Bb4:1 C5:1 Eb5:4', 'Bb4:4 Eb5:4 G5:2 F5:1 Eb5:1 Bb5:4', 'F5:4 D5:4 Bb4:2 C5:1 Bb4:1 F4:4'];
const gtChorus = chorusOf(gtHook, 'C5:4 F5:4 Ab5:2 G5:1 F5:1 C5:4', 'B4:4 D5:4 G5:2 F5:1 D5:1 B4:4');
const gtV = ['C5:3 Bb4:1 C5:4 Eb5:2 D5:2 C5:4', 'Eb5:3 D5:1 Eb5:4 G5:2 F5:2 Eb5:4', 'C5:3 Bb4:1 Ab4:4 C5:2 Bb4:2 Ab4:4', 'Bb4:3 C5:1 D5:4 F5:2 Eb5:2 D5:4'];
const gtVerse = [...gtV, gtV[0], gtV[1], 'C5:3 Bb4:1 Ab4:4 C5:2 Bb4:2 Ab4:4', 'B4:3 C5:1 D5:4 G5:2 F5:2 D5:4'];
const gtBridge = ['C5:8 Eb5:8', 'D5:8 F5:8', 'Eb5:8 G5:8', 'D5:8 B4:8'];
const pizz = (c) => pat(tones(c, 'C4'), '0.1. 2.1. 0.1. 2.1.');     // Pizzicato-Zupfer
const GIANT = dr('d... .... d... ....');                             // Riesenschritte (große Trommel)

// ================================================================ Nebelfriedhof (S-8, Geister im Schnee) ====
// h-Moll, 134 BPM, gruselig-lustig in Winterfarbe. Intro h e A D (die Celesta spielt die Hook) | Strophe h h G Fis |
// h h e Fis (i–VI–V | i–iv–V, Schleichen im Nebel, Schellen) | Refrain h e A D | h e Fis h (i–iv–VII–III | i–iv–V–i,
// die Celesta spielt mit) | Überleitung G A h Fis (der Theremin-Hauch singt). Nebel-Pad.
const fbProg = ['Bm', 'Em', 'A', 'D', 'Bm', 'Bm', 'G', 'F#', 'Bm', 'Bm', 'Em', 'F#', 'Bm', 'Em', 'A', 'D', 'Bm', 'Em', 'F#', 'Bm', 'G', 'A', 'Bm', 'F#'];
const fbHook = ['B5:3 F#5:1 D5:4 B4:2 C#5:2 D5:2 F#5:2', 'B5:3 G5:1 E5:4 B4:2 D5:2 E5:2 G5:2', 'A5:3 E5:1 C#5:4 A4:2 B4:2 C#5:2 E5:2', 'A5:3 F#5:1 D5:4 A4:2 B4:2 D5:2 F#5:2'];
const fbChorus = chorusOf(fbHook, 'A#5:3 F#5:1 C#5:4 A#4:2 C#5:2 E5:2 F#5:2', 'B5:3 F#5:1 D5:4 B4:2 C#5:2 D5:2 B4:2');
const fbV = ['B4:2 -:2 D5:2 -:2 F#5:2 E5:2 D5:2 C#5:2', 'B4:2 -:2 D5:2 -:2 F#5:2 G5:2 F#5:2 D5:2', 'B4:2 -:2 D5:2 -:2 G5:2 F#5:2 D5:2 B4:2', 'A#4:2 -:2 C#5:2 -:2 F#5:2 E5:2 C#5:2 A#4:2'];
const fbVerse = [...fbV, fbV[0], fbV[1], 'B4:2 -:2 E5:2 -:2 G5:2 F#5:2 E5:2 B4:2', 'A#4:2 -:2 C#5:2 -:2 E5:2 F#5:2 A#5:2 F#5:2'];
const fbBridge = ['B4:8 D5:8', 'C#5:8 E5:8', 'D5:8 F#5:8', 'F#5:8 A#5:8'];
const fbBoo = ['D6:16', 'E6:16', 'F#6:16', 'E6:8 C#6:8'];
const SLEIGH = dr('j.j. ..j. j.j. ..jj');                            // Schlittenschellen

// ================================================================ Kanonen-Weltraum (S-9) ====
// e-Moll, 146 BPM, futuristisch. Intro e C G D (die Computer-Piepser spielen die Hook) | Strophe e e C D | e e a H (i–VI–VII
// | i–iv–V, Arpeggiator, Kanonen-Schläge) | Refrain e C G D | e C a H (i–VI–III–VII | i–VI–iv–V, Laser-Stabs) |
// Überleitung C D e H.
const csProg = ['Em', 'C', 'G', 'D', 'Em', 'Em', 'C', 'D', 'Em', 'Em', 'Am', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B', 'C', 'D', 'Em', 'B'];
const csHook = ['B5:1 E5:1 B5:2 G5:2 F#5:2 E5:4 D5:2 E5:2', 'G5:1 C5:1 G5:2 E5:2 D5:2 C5:4 D5:2 E5:2',
  'G5:1 D5:1 G5:2 B5:2 A5:2 G5:4 F#5:2 G5:2', 'A5:1 D5:1 A5:2 F#5:2 E5:2 D5:4 E5:2 F#5:2'];
const csChorus = chorusOf(csHook, 'E5:1 A4:1 E5:2 C5:2 B4:2 A4:4 B4:2 C5:2', 'F#5:1 B4:1 F#5:2 D#5:2 E5:2 F#5:4 D#5:2 B4:2');
const csV = ['E5:2 E5:2 G5:2 F#5:2 E5:4 D5:2 E5:2', 'E5:2 E5:2 G5:2 A5:2 B5:4 A5:2 G5:2', 'E5:2 E5:2 G5:2 F#5:2 E5:4 D5:2 C5:2', 'D5:2 D5:2 F#5:2 E5:2 D5:4 E5:2 F#5:2'];
const csVerse = [...csV, csV[0], csV[1], 'E5:2 E5:2 A5:2 G5:2 E5:4 D5:2 C5:2', 'D#5:2 D#5:2 F#5:2 E5:2 D#5:4 E5:2 F#5:2'];
const csBridge = ['E5:8 G5:8', 'F#5:8 A5:8', 'G5:8 B5:8', 'B5:8 F#5:8'];
const arpeggiator = (c) => pat([...tones(c, 'E4'), tones(c, 'E5')[0]], '0123 2101 2321 0123');
const laser = (c) => pat(tones(c, 'E6'), '..0. .... ..1. ....');    // Laser-Stabs („pju“, gleiten hinab)
const CANNON = dr('d... .... .... ..d.');                             // Kanonen-Schläge

// ================================================================ Karte Welt Stern ====
// Des-Dur, 126 BPM, 16 Takte, ruhig-staunend. Strophe Des b Ges As | Des b es As (I–vi–IV–V | I–vi–ii–V): das Piano singt
// die Melodie, Kick auf 1 und 3 | Refrain Ges As f b | Ges As Des Des (IV–V–iii–vi | IV–V–I): der Lead singt die
// Sternenstaub-Hook, Piano auf der „und“. Sternenstaub-Glöckchen in den Phrasen-Enden, Chor-„Aah“ im Refrain.
const msProg = ['Db', 'Bbm', 'Gb', 'Ab', 'Db', 'Bbm', 'Ebm', 'Ab', 'Gb', 'Ab', 'Fm', 'Bbm', 'Gb', 'Ab', 'Db', 'Db'];
const msPiano = ['Ab4:4 Db5:4 F5:6 Eb5:2', 'Db5:4 F5:2 Db5:2 Bb4:6 C5:2', 'Db5:4 Bb4:2 Db5:2 Gb5:6 F5:2', 'Eb5:4 C5:2 Ab4:2 Eb5:8',
  'Ab4:4 Db5:4 F5:6 Eb5:2', 'Db5:4 F5:2 Db5:2 Bb4:6 C5:2', 'Eb5:4 Gb5:2 Eb5:2 Bb4:6 C5:2', 'Eb5:4 C5:2 Eb5:2 Ab5:4 -:4'];
const msHook = ['Gb5:2 Gb5:1 F5:1 Gb5:4 Bb5:2 Gb5:2 Db5:4', 'Ab5:2 Ab5:1 Gb5:1 Ab5:4 C6:2 Ab5:2 Eb5:4',
  'F5:2 F5:1 Eb5:1 F5:4 Ab5:2 F5:2 C5:4', 'Db5:2 Db5:1 C5:1 Db5:4 F5:2 Db5:2 F5:4'];
const msLead = [...msHook, msHook[0], msHook[1], 'F5:2 F5:1 Eb5:1 F5:4 Ab5:2 F5:2 Db5:4', 'F5:4 Db5:4 Ab4:8'];
const stardust = (c) => pat(tones(c, 'Db6'), '.... .... ..2. 1.0.');   // Sternenstaub-Glöckchen
const STMAP = [KH, CL, H8O];

export const STAR_THEMES = {
  // Regenbogenweg (S-1, Regenbogen-Plattformen, Trapeze, Reitfahrt auf dem schwimmenden Reittier, Fackelplatz, Münzregen):
  // 140 BPM, E-Dur, 24 Takte, strahlend. Intro (E gis A H): die Glitzer-Glocken spielen die Hook über aufsteigenden
  // Regenbogen-Arpeggien | Strophe (cis A E H | cis A fis H): Lead in der Mittellage, Sternenglitzern, Glitzer-Schellen |
  // Refrain (E gis A H | E gis fis H): Regenbogen-Bogen, Arpeggien, Piano auf der „und“, Stabs, Galopp-Bass | Überleitung
  // (A H cis H): lange Töne, das Chor-„Aah“ singt, Sternschnuppe in den Loop. Energie-Ebene beim Reiten.
  course_rainbow: {
    bpm: 140,
    energyDouble: 1,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      bell: { type: 'sine', volume: 0.11, decay: 0.5, ratio: 5.4, partial: 0.3 },
      arp: { type: 'triangle', volume: 0.055, decay: 0.09 },
      echo: GLITTER,
      whistle: AAH,
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.055, bright: 1.2 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07, noise: 0.12 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, jingle: { volume: 0.08, off: 0.06, duration: 0.06 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 120, volume: 0.36 } },
    fx: { delay: { steps: [3, 4], feedback: 0.36, lowpass: 3400, wet: 0.3, send: { bell: 0.4, arp: 0.3, echo: 0.5, whistle: 0.4, lead: 0.12, pad: 0.15 } } },
    bell: [...rbHook, ...rest(20)],
    lead: [...rest(4), ...rbVerse, ...rbChorus, ...rbBridge],
    arp: bySection(rbProg, SONG, { intro: rainbow, chorus: rainbow, bridge: rainbow }),
    echo: bySection(rbProg, SONG, { verse: (c) => glitter(c) }),
    whistle: [...rest(20), ...rbChoir],
    piano: bySection(rbProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G#4'), bridge: (c) => chordBar(c, LONG, 'G#4') }),
    stabs: bySection(rbProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(rbProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 B3:8', ...rest(10), 'E3:16', 'B3:14 -:2'],
    bass: bySection(rbProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_GALLOP), bridge: BREAK_BASS }),
    energy: rbProg.map((c) => chordBar(c, '..x. .... ..x. ....', 'E4')),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8, SPARKS], [K4, CL, H8, SPARKS, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8, SPARKS], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ssss ssss')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, SPARKS], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, SPARKS], FILL_S,
    ],
  },

  // Planetoiden (S-2, kippende Drehplatten, Plattenbahnen, Boost-Strecke, Plattentreppe, Schachbrett): 132 BPM, As-Dur,
  // 24 Takte, weit und schwebend. Intro (As Es f Des): das Glockenspiel spielt die Hook, Chor-„Aah“ | Strophe (f Des As Es |
  // f Des b Es): Lead tief und ruhig, kreisende Planeten-Arpeggien | Refrain (As Es f Des | As Es Des Es): Planeten-Sprung
  // mit Oktavsprung, das Glockenspiel singt mit, Piano auf der „und“, Stabs | Überleitung (Des Es f Es): lange Töne, Chor.
  // Pad in allen Takten, weiter Hall.
  course_galaxy: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4400, volume: 0.16 },
      bell: { type: 'sine', volume: 0.09, decay: 0.8, ratio: 2.76, partial: 0.4 },
      arp: { type: 'sine', volume: 0.07, decay: 0.2 },
      whistle: AAH,
      piano: { volume: 0.08 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 1.15 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07, noise: 0.12 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.28 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 110, volume: 0.36 } },
    fx: { delay: { steps: [3, 4], feedback: 0.45, lowpass: 3000, wet: 0.38, send: { bell: 0.45, arp: 0.35, whistle: 0.5, lead: 0.18, pad: 0.25, clap: 0.15 } } },
    bell: [...gxIntro, ...rest(8), ...gxChorus, ...rest(4)],
    lead: [...rest(4), ...gxVerse, ...gxChorus, ...gxBridge],
    arp: bySection(gxProg, SONG, { verse: orbit, bridge: orbit }),
    whistle: [...gxProg.slice(0, 4).map((c) => `${tones(c, 'Ab4')[1]}:16`), ...rest(16), ...gxChoir],
    piano: bySection(gxProg, SONG, { chorus: (c) => chordBar(c, OFF, 'Ab4'), bridge: (c) => chordBar(c, LONG, 'Ab4') }),
    stabs: bySection(gxProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: gxProg.map((c) => padBar(c)),
    riser: [...rest(11), '-:8 Eb3:8', ...rest(10), 'Ab3:16', 'Eb3:14 -:2'],
    bass: bySection(gxProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_HALF), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, HOF], [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, HOF, CR], [K4, CL, HOF], [K4, CL, HOF], FILL_S,
    ],
  },

  // Walzen-Athletik (S-3, Holz-Athletik mit rollenden Schienenwalzen, Walzentrio, Walzenaufstieg, große Walze): 142 BPM,
  // B-Dur, 24 Takte, hölzern-perkussiv. Intro (B g Es F): die Marimba spielt die Hook, Holzblock | Strophe (Es F d g |
  // Es F c F): Lead hölzern gestoßen, rollende Holz-Sechzehntel, Holzblock 3-3-2 | Refrain (B g Es F | B g c F): Walzen-
  // Rollen, die Marimba spielt mit, Walzen-Rumpeln, Piano auf der „und“ | Überleitung (Es F g F): lange Töne, Holz-Wirbel.
  course_rollingride: {
    bpm: 142,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.16 },
      bell: { type: 'sine', volume: 0.12, decay: 0.22, ratio: 3.9, partial: 0.4 },
      arp: { type: 'triangle', volume: 0.07, decay: 0.06 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.05, bright: 1.1 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07, noise: 0.1 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.3 }, tek: { volume: 0.2, freq: 1300 }, doum: { freq: 140, volume: 0.24, decay: 0.15 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 160, volume: 0.36 } },
    fx: { delay: { steps: [3, 4], feedback: 0.3, lowpass: 3200, wet: 0.25, send: { bell: 0.3, lead: 0.12, arp: 0.2, pad: 0.15 } } },
    bell: [...rrHook, ...rest(8), ...rrChorus, ...rest(4)],
    lead: [...rest(4), ...rrVerse, ...rrChorus, ...rrBridge],
    arp: bySection(rrProg, SONG, { verse: roll, bridge: roll }),
    piano: bySection(rrProg, SONG, { chorus: (c) => chordBar(c, OFF, 'Bb4'), bridge: (c) => chordBar(c, LONG, 'Bb4') }),
    stabs: bySection(rrProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(rrProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 F3:8', ...rest(10), 'Bb3:16', 'F3:14 -:2'],
    bass: bySection(rrProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8, WOOD], [K4, CL, H8, WOOD, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8, WOOD], [K4, CL, H8, WOOD, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8, WOOD], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, RUMBLE], [K4, CL, HH, RUMBLE, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, RUMBLE], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, WOOD, CR], [K4, CL, H8, WOOD], [K4, CL, H8, RUMBLE], FILL_S,
    ],
  },

  // Zielmast-Jagd (S-4, der Zielmast bekommt Flügel und fliegt davon, Boost-Pfeile, Glotzfische, Donut-Felder, 100 s):
  // 150 BPM, D-Dur, 24 Takte, schnell. Intro (D h G A): die Jagdhörner spielen die Hook | Strophe (h G D A | h G e A): Lead
  // in Achteln, Flügelschlag, Pump-Bass | Refrain (D h G A | D h e A): Hinterher-Hook, Galopp-Bass, Hörner-Stöße, Piano auf
  // der „und“, Sechzehntel-Hats | Überleitung (G A h A): lange Töne über Piano-Akkorden, Sternschnuppe in den Loop.
  course_goalpole: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.17 },
      organ: { volume: 0.055, cutoff: 2600, gate: 0.9 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.12, cutoff: 6000, cutoffEnd: 1600 },
      pad: { volume: 0.05, bright: 1.1 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08, noise: 0.12 },
    },
    kit: { kick: { volume: 0.55 }, clap: { volume: 0.3 }, jingle: { volume: 0.1, off: 0.08, duration: 0.1 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 110, volume: 0.4 } },
    fx: { delay: { steps: [3, 4], feedback: 0.32, lowpass: 3000, wet: 0.26, send: { organ: 0.2, lead: 0.12, pad: 0.15, jingle: 0.3 } } },
    lead: [...rest(4), ...gpVerse, ...gpChorus, ...gpBridge],
    organ: bySection(gpProg, SONG, {
      intro: (c, i) => gpHook[i],
      chorus: (c) => chordBar(c, 'x__x __x_ .... ....', 'F#3'),
    }),
    piano: bySection(gpProg, SONG, { chorus: (c) => chordBar(c, OFF, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    stabs: bySection(gpProg, SONG, { intro: (c) => chordBar(c, '.... ..x. .... ..x.'), verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(gpProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 A3:8', ...rest(10), 'D3:16', 'A3:14 -:2'],
    bass: bySection(gpProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_DRIVE), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, H8, FLAP], [K4, CL, H8, FLAP, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8, FLAP], [K4, CL, H8, FLAP, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8, FLAP], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, FLAP], [K4, CL, HH, dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH, FLAP], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, FLAP], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Blockland (S-5, Retro-Blockland aus Riesenblöcken, Grasinseln, Laufbomben, wachsende ?-Türme, 5 Schlüsselmünzen):
  // 144 BPM, C-Dur, 24 Takte, Retro-Farbe. Intro (C a F G): der Rechteck-Lead spielt die Hook | Strophe (F G e a | F G d G):
  // Lead hüpft über den Dreiklang, Chip-Arpeggien in Sechzehnteln | Refrain (C a F G | C a d G): Block-Treppe, der
  // Rechteck-Lead spielt mit, Piano auf der „und“, Rausch-Snare zum Clap | Überleitung (F G a G): lange Töne, die Puls-
  // Stimme singt mit Chip-Vibrato darüber. Eurodance-Fundament bleibt (Four-on-the-floor, Oktav-Bass, Stabs).
  course_blockland: {
    bpm: 144,
    voice: {
      lead: { ...SYNTH, cutoff: 4200, volume: 0.15 },
      organ: { volume: 0.05, cutoff: 6500, gate: 0.6, octave: false },
      arp: { type: 'square', volume: 0.04, decay: 0.05 },
      whistle: { type: 'square', volume: 0.04, vibrato: 25, rate: 6, slide: 0, attack: 0.01, gate: 0.9 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.05, bright: 1.1 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07, noise: 0.1 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.28 }, snare: { volume: 0.16 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 140, volume: 0.36 } },
    fx: { lowpass: { arp: 4500, whistle: 3500 }, delay: { steps: [3, 4], feedback: 0.28, lowpass: 3200, wet: 0.24, send: { organ: 0.2, whistle: 0.3, lead: 0.1, arp: 0.15 } } },
    organ: bySection(blProg, SONG, { intro: (c, i) => blHook[i], chorus: (c, i) => blChorus[i] }),
    lead: [...rest(4), ...blVerse, ...blChorus, ...blBridge],
    arp: bySection(blProg, SONG, { verse: chip }),
    whistle: [...rest(20), ...blPulse],
    piano: bySection(blProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(blProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(blProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 G3:8', ...rest(10), 'C4:16', 'G3:14 -:2'],
    bass: bySection(blProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8, NOISE], [K4, CL, H8, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8, NOISE], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ssss ssss')], false),
      ...groove(4, [K4, CL, HH, NOISE], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, NOISE], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8, NOISE], FILL_S,
    ],
  },

  // Waben-Sternenweg (S-6, Draufsicht, Waben-Plattformen aus Lava und Eis, Brummer; auch B-10 bei Tag): 136 BPM, fis-Moll,
  // 24 Takte, summend und geheimnisvoll. Intro (fis D A E): die summende Bienen-Stimme spielt die Hook über dem Waben-
  // Ostinato | Strophe (fis fis D E | fis fis h Cis): Lead tief, tiefes Brummen | Refrain (fis D A E | fis D h Cis): Summ-
  // Waben, Waben-Ostinato, Piano auf der „und“, Stabs | Überleitung (D E fis Cis): lange Töne, Brummen, Sternschnuppe.
  course_honeycomb: {
    bpm: 136,
    voice: {
      lead: { ...SYNTH, cutoff: 4400, volume: 0.16 },
      whistle: { type: 'sawtooth', volume: 0.07, vibrato: 30, rate: 11, slide: 0, attack: 0.02, gate: 0.92 },
      arp: { type: 'triangle', volume: 0.06, decay: 0.09 },
      organ: { volume: 0.045, cutoff: 900, octave: false, gate: 0.98 },
      piano: { volume: 0.08 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { volume: 0.18 },
      riser: { volume: 0.07, noise: 0.12 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.28 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 120, volume: 0.36 } },
    fx: { lowpass: { whistle: 1800 }, delay: { steps: [3, 4], feedback: 0.4, lowpass: 2800, wet: 0.32, send: { arp: 0.35, whistle: 0.3, lead: 0.15, pad: 0.2 } } },
    whistle: [...hcHook, ...rest(20)],
    lead: [...rest(4), ...hcVerse, ...hcChorus, ...hcBridge],
    arp: bySection(hcProg, SONG, { intro: hex, chorus: hex, bridge: hex }),
    organ: bySection(hcProg, SONG, { verse: hum, bridge: hum }),
    piano: bySection(hcProg, SONG, { chorus: (c) => chordBar(c, OFF, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(hcProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(hcProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 C#4:8', ...rest(10), 'F#3:16', 'C#4:14 -:2'],
    bass: bySection(hcProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, HOF, CR], [K4, CL, HOF], [K4, CL, HOF], FILL_S,
    ],
  },

  // Riesen-Dschungel (S-7, alles übergroß, Riesen-Pilzlingstürme, Großrollpilze, Riesentrank-Feld, Unterwasser mit
  // Strömungen): 130 BPM, c-Moll, 24 Takte, tief und gewichtig. Intro (c As Es B): die Riesen-Hörner spielen die Hook, große
  // Trommeln | Strophe (c c As B | c c f G): Lead tief, Pizzicato-Bass und -Zupfer, Riesenschritte | Refrain (c As Es B |
  // c As f G): Riesenschritt-Hook, Hörner-Akkorde, Piano auf der „und“, hüpfender Bass | Überleitung (As B c G): lange
  // Töne über Piano-Akkorden, Trommelwirbel.
  course_grotto: {
    bpm: 130,
    voice: {
      lead: { ...SYNTH, cutoff: 3600, volume: 0.17 },
      organ: { volume: 0.06, cutoff: 1800, gate: 0.9 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.06 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.055, bright: 0.85 },
      bass: { volume: 0.19, cutoff: 800 },
      riser: { volume: 0.07, noise: 0.1 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.28 }, doum: { freq: 55, volume: 0.36, decay: 0.35 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 72, volume: 0.44 } },
    fx: { delay: { steps: [3, 4], feedback: 0.34, lowpass: 2400, wet: 0.28, send: { organ: 0.2, lead: 0.14, arp: 0.15, tom: 0.2, doum: 0.15 } } },
    organ: bySection(gtProg, SONG, {
      intro: (c, i) => gtHook[i],
      chorus: (c) => chordBar(c, 'x___ .... x___ ....', 'G3'),
      bridge: (c) => chordBar(c, LONG, 'G3'),
    }),
    lead: [...rest(4), ...gtVerse, ...gtChorus, ...gtBridge],
    arp: bySection(gtProg, SONG, { verse: pizz }),
    piano: bySection(gtProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(gtProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(gtProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 G3:8', ...rest(10), 'C3:16', 'G3:14 -:2'],
    bass: bySection(gtProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, 'L_.. H_.. L_.. H_..'), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      [K4, CL, H8, dr('d... ..d. d... ....'), CR], [K4, CL, H8, dr('d... ..d. d... ....')], [K4, CL, H8, dr('d... ..d. d... ....')], [K4, CL, H8, dr('d... .... tttt tttt')],
      ...groove(4, [K4, CL, H8, GIANT], [K4, CL, H8, GIANT, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8, GIANT], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, GIANT], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, GIANT], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, GIANT, CR], [K4, CL, H8, GIANT], [K4, CL, H8, dr('d... ..d. d... ....')], [K4, dr('.... c... .... ....'), dr('d... .... .... ....'), dr('.... .... tttt ssss')],
    ],
  },

  // Nebelfriedhof (S-8, verschneiter Spukfriedhof im Nebel, Floßfahrt über den Giftsumpf, Nebelplattformen): 134 BPM,
  // h-Moll, 24 Takte, gruselig-lustig in Winterfarbe. Intro (h e A D): die Celesta spielt die Hook | Strophe (h h G Fis |
  // h h e Fis): Lead schleicht in Achteln, Schlittenschellen, der Theremin-Hauch seufzt | Refrain (h e A D | h e Fis h):
  // Schlotter-Schunkeln, die Celesta spielt mit, Piano auf der „und“, Stabs | Überleitung (G A h Fis): lange Töne, der
  // Theremin-Hauch singt. Nebel-Pad hinter Tiefpass mit viel Hall.
  course_fogbog: {
    bpm: 134,
    voice: {
      lead: { ...SYNTH, cutoff: 4200, volume: 0.16 },
      bell: { type: 'sine', volume: 0.1, decay: 0.45, ratio: 4, partial: 0.35 },
      whistle: { type: 'sine', volume: 0.06, vibrato: 45, rate: 5, slide: 4, attack: 0.3, gate: 0.95 },
      piano: { volume: 0.08 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.06, bright: 0.6 },
      bass: { volume: 0.18 },
      riser: { volume: 0.06, noise: 0.12 },
    },
    kit: { kick: { volume: 0.54 }, clap: { volume: 0.28 }, jingle: { volume: 0.1, off: 0.07, duration: 0.09 }, hat: { volume: 0.22, off: 0.14 }, tom: { freq: 120, volume: 0.36 } },
    fx: { lowpass: { pad: 1500 }, delay: { steps: [3, 4], feedback: 0.42, lowpass: 2600, wet: 0.34, send: { bell: 0.4, whistle: 0.5, pad: 0.3, lead: 0.14, jingle: 0.2 } } },
    bell: [...fbHook, ...rest(8), ...fbChorus, ...rest(4)],
    lead: [...rest(4), ...fbVerse, ...fbChorus, ...fbBridge],
    whistle: [...rest(4), 'F#5:12 -:4', ...rest(3), 'F#5:12 -:4', ...rest(11), ...fbBoo],
    piano: bySection(fbProg, SONG, { intro: (c) => chordBar(c, '.... ..x. .... ..x.', 'A4'), chorus: (c) => chordBar(c, OFF, 'A4'), bridge: (c) => chordBar(c, LONG, 'A4') }),
    stabs: bySection(fbProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(fbProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 F#3:8', ...rest(10), 'B3:16', 'F#3:14 -:2'],
    bass: bySection(fbProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, 'L_.. H_.. F_.. H_..'), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8, SLEIGH], [K4, CL, H8, SLEIGH, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8, SLEIGH], [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8, SLEIGH], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. tttt')], false),
      ...groove(4, [K4, CL, HH, SLEIGH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, SLEIGH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8, SLEIGH], [K4, CL, H8], FILL_S,
    ],
  },

  // Kanonen-Weltraum (S-9, Kanonen-Helm, Schienenbrett-Fahrt, Kanonenkugel-Wand, Unterwassertunnel, Weichen umschießen):
  // 146 BPM, e-Moll, 24 Takte, futuristisch. Intro (e C G D): die Computer-Piepser spielen die Hook über dem Arpeggiator |
  // Strophe (e e C D | e e a H): Lead in Achteln, Arpeggiator, Kanonen-Schläge | Refrain (e C G D | e C a H): Laser-
  // Pingpong, Laser-Stabs, Piano auf der „und“, treibender Bass | Überleitung (C D e H): lange Töne, Kanonen-Wirbel.
  course_cosmic: {
    bpm: 146,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.16 },
      bell: { type: 'sine', volume: 0.09, decay: 0.25, ratio: 2, partial: 0.3 },
      arp: { type: 'sawtooth', volume: 0.045, decay: 0.06 },
      echo: { type: 'square', volume: 0.04, decay: 0.08, glide: 0.35, glideTime: 0.09 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.12, cutoff: 6500, cutoffEnd: 1600 },
      pad: { volume: 0.05, bright: 1.2 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08, noise: 0.12 },
    },
    kit: { kick: { volume: 0.55 }, clap: { volume: 0.3 }, doum: { freq: 50, volume: 0.36, decay: 0.3 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 70, volume: 0.42 } },
    fx: { lowpass: { arp: 2600 }, delay: { steps: [3, 4], feedback: 0.34, lowpass: 3200, wet: 0.28, send: { bell: 0.35, echo: 0.4, arp: 0.2, lead: 0.12, doum: 0.2 } } },
    bell: [...csHook, ...rest(20)],
    lead: [...rest(4), ...csVerse, ...csChorus, ...csBridge],
    arp: bySection(csProg, SONG, { intro: arpeggiator, verse: arpeggiator, chorus: arpeggiator }),
    echo: bySection(csProg, SONG, { chorus: laser }),
    piano: bySection(csProg, SONG, { chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(csProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(csProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 B3:8', ...rest(10), 'E3:16', 'B3:14 -:2'],
    bass: bySection(csProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_DRIVE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8, CANNON], [K4, CL, H8, CANNON, dr('.... .... .... t.tt')]),
      ...groove(4, [K4, CL, H8, CANNON], [K4, CL, H8, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8, CANNON], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, CANNON], [K4, CL, HH, dr('.... .... .... ssss')]),
      ...groove(4, [K4, CL, HH, CANNON], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, H8, CANNON, CR], [K4, CL, H8], [K4, CL, H8, CANNON], [K4, dr('.... c... .... ....'), dr('d... .... .... ....'), dr('.... .... tttt ssss')],
    ],
  },

  // Weltkarte Welt Stern „Sternenzelt“: 126 BPM, Des-Dur, 16 Takte, ruhig-staunend. Strophe (Des b Ges As | Des b es As): das
  // Piano singt die Melodie über dem Kristall-Pad, Kick auf 1 und 3 | Refrain (Ges As f b | Ges As Des Des): der Lead singt
  // die Sternenstaub-Hook, Piano-Akkorde auf der „und“, das Chor-„Aah“ liegt darunter. Sternenstaub-Glöckchen in den
  // Phrasen-Enden, Clap auf 2 und 4.
  course_worldstar_map: {
    bpm: 126,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3200, volume: 0.17 },
      piano: { volume: 0.12, cutoff: 3800 },
      bell: { type: 'sine', volume: 0.07, decay: 0.7, ratio: 5.4, partial: 0.3 },
      whistle: AAH,
      pad: { volume: 0.05, bright: 1.1 },
      bass: { cutoff: 600 },
    },
    kit: { hat: { volume: 0.22, off: 0.14 }, tom: { freq: 120, volume: 0.3 } },
    fx: { delay: { steps: [3, 4], feedback: 0.38, lowpass: 3000, wet: 0.32, send: { piano: 0.25, bell: 0.45, lead: 0.18, whistle: 0.4, pad: 0.2 } } },
    piano: [...msPiano, ...msProg.slice(8).map((c) => chordBar(c, OFF, 'Ab4'))],
    lead: [...rest(8), ...msLead],
    bell: msProg.map((c, i) => (i % 2 ? stardust(c) : '-:16')),
    whistle: [...rest(8), ...msProg.slice(8).map((c) => `${tones(c, 'Db4')[1]}:16`)],
    pad: msProg.map((c) => padBar(c)),
    bass: msProg.map((c) => bassBar(c, B_HALF)),
    drums: [[...STMAP, CR], STMAP, STMAP, [KH, CL, H8O, dr('.... .... .... .ttt')], STMAP, STMAP, STMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...STMAP, CR], STMAP, STMAP, [KH, CL, H8O, dr('.... .... .... .ttt')], STMAP, STMAP, STMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')]],
  },
};
