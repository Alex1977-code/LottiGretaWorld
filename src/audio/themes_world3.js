// Kurs-Themen Welt 3 „Schnee und Eis“ – eigene Kompositionen im Stil des 90er-Eurodance
// (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Analyse der ersten Fassung (Rückmeldung des Auftraggebers: „nicht melodisch“): Viele Themen standen auf
// Kirchentonarten statt Dur/Moll (Lagune Des-Lydisch, Herbstwald A-Dorisch, Zug G-Mixolydisch, Kettenzaun
// D-Lydisch), das Spukhaus auf einem chromatischen Lamento-Bass mit Theremin in weiten Bögen. Die Melodie lag oft
// bei Nebenstimmen (fallende Glöckchen-Flocken, Blasen, Gitarren-Muster, Arpeggien in Sechzehnteln), der Lead
// spielte nur 8 von 16 Takten und meist lange Einzeltöne (Lagune, Kettenzaun) oder Riffs mit Tonwiederholungen
// (Bergrennen); der Pastell-Garten hatte gar keinen Lead. Einen wiederkehrenden Refrain gab es kaum.
//
// Neufassung nach der Musik-Richtlinie (wie Welt 2): Lieder in Dur/Moll mit Intro (Hook-Riff) → Strophe → Refrain
// (zweitaktige Hook, A A' A A'') → Überleitung, Eurodance-Akkordfolgen, Lead-Synth fast durchgehend. Welt-Farbe
// nur über Klang: Schlittenschellen und Glockenspiel (Schnee), Orgel und Theremin in Moll (Spukhaus), weicher
// Tiefpass und Blasen (Lagune), Gitarren-Zupfer (Herbstwald), Dampfpfeife und Tschu-ku-tschu (Zug), Glocken und
// helle Arpeggien (Kettenzaun).

import {
  dr, K4, KH, CL, HH, H8, H8O, HOF, CR, rep, rest, tr, octaves, chordBar, bassBar, padBar, pat, voicing,
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

// ================================================================ Schnee ====
// Es-Dur, 132 BPM. Intro Es c As B (Glockenspiel spielt die Hook) | Strophe c As Es B ×2 | Refrain Es c As B ×2 |
// Überleitung As B c B. Hook im 3-3-3-3-4-Querrhythmus („Flocken schweben“): Dreiklang aufwärts, Seufzer abwärts.
const snProg = ['Eb', 'Cm', 'Ab', 'Bb', ...rep(2, ['Cm', 'Ab', 'Eb', 'Bb']).flat(), ...rep(2, ['Eb', 'Cm', 'Ab', 'Bb']).flat(), 'Ab', 'Bb', 'Cm', 'Bb'];
const snHook = ['Eb5:3 G5:3 Bb5:3 Ab5:3 G5:4', 'C5:3 Eb5:3 G5:3 F5:3 Eb5:4', 'Eb5:3 Ab5:3 C6:3 Bb5:3 Ab5:4', 'F5:4 Eb5:4 D5:8'];
const snChorus = [...snHook, snHook[0], snHook[1], 'C5:3 Eb5:3 Ab5:3 G5:3 F5:4', 'D5:3 F5:3 Bb5:10'];
const snV = ['G4:4 C5:2 D5:2 Eb5:4 D5:2 C5:2', 'C5:4 Ab4:2 Bb4:2 C5:4 Eb5:4', 'Bb4:4 Eb5:2 F5:2 G5:4 F5:2 Eb5:2'];
const snVerse = [...snV, 'D5:6 C5:2 Bb4:8', ...snV, 'D5:4 C5:2 Bb4:2 C5:4 D5:4'];
const snBridge = ['Eb5:8 C5:8', 'F5:8 D5:8', 'G5:8 Eb5:8', 'F5:12 -:4'];
const SLEIGH = dr('j.jj j.jj j.jj j.jj');   // Schlittenschellen
const SNOW = [K4, CL, SLEIGH];
const SNOW_C = [K4, CL, SLEIGH, dr('..h. ..h. ..h. ..h.')];

// ================================================================ Spukhaus ====
// cis-Moll, 130 BPM. Intro cis A E H (die Orgel spielt die Hook) | Strophe cis cis fis Gis | cis cis A Gis (Orgel-
// Melodie) | Refrain cis A E H | cis A fis Gis (Lead, Orgel-„pa“ auf der „und“) | Überleitung A H cis Gis (Theremin).
const ghProg = ['C#m', 'A', 'E', 'B', 'C#m', 'C#m', 'F#m', 'G#', 'C#m', 'C#m', 'A', 'G#', 'C#m', 'A', 'E', 'B', 'C#m', 'A', 'F#m', 'G#', 'A', 'B', 'C#m', 'G#'];
const ghHook = ['E5:3 D#5:1 E5:2 G#5:2 C#6:4 -:2 B5:1 A5:1', 'A5:3 G#5:1 E5:2 C#5:2 A4:4 -:2 E5:1 G#5:1',
  'B5:3 A5:1 G#5:2 E5:2 B4:4 -:2 C#5:1 D#5:1', 'F#5:4 D#5:4 B4:4 -:4'];
const ghChorus = [...ghHook, ghHook[0], ghHook[1], 'A5:3 G#5:1 F#5:2 C#5:2 A4:4 -:2 B4:1 B#4:1', 'G#4:4 B#4:4 D#5:4 G#5:4'];
const ghV = ['C#5:2 E5:2 G#5:4 F#5:2 E5:2 D#5:4', 'E5:2 D#5:2 C#5:4 B4:2 C#5:2 G#4:4'];
const ghVerse = [...ghV, 'A4:2 C#5:2 F#5:4 E5:2 D#5:2 C#5:4', 'B#4:4 D#5:4 G#5:8', ...ghV, 'A4:2 C#5:2 E5:4 F#5:2 E5:2 C#5:4', 'D#5:4 B#4:4 G#4:4 -:2 D#5:1 D#5:1'];
const ghBridge = ['E5:8 C#5:8', 'F#5:8 D#5:8', 'G#5:8 E5:8', 'B#4:8 D#5:8'];
const CLOCK = dr('x... x... x... x...'); // Standuhr (Tick/Tack in Vierteln)
const GHOST = [K4, CL, H8, CLOCK];

// ================================================================ Pastell-Garten ====
// As-Dur, 148 BPM. Intro As Des f Es (Piano-Riff in Oktaven) | Strophe Des As Es f ×2 (IV–I–V–vi) | Refrain As Des f Es
// | As Des b Es | Überleitung Des Es f Es. Hook in punktierten Achteln mit Pausen („hüpfen über Beete“).
const plProg = ['Ab', 'Db', 'Fm', 'Eb', ...rep(2, ['Db', 'Ab', 'Eb', 'Fm']).flat(), 'Ab', 'Db', 'Fm', 'Eb', 'Ab', 'Db', 'Bbm', 'Eb', 'Db', 'Eb', 'Fm', 'Eb'];
const plHook = ['C6:2 -:1 Ab5:2 -:1 Eb5:2 F5:2 -:1 Ab5:2 -:1 Bb5:2', 'Ab5:2 -:1 F5:2 -:1 Db5:2 Eb5:2 -:1 F5:2 -:1 Ab5:2',
  'Ab5:2 -:1 F5:2 -:1 C5:2 Db5:2 -:1 F5:2 -:1 G5:2', 'Bb5:2 -:1 G5:2 -:1 Eb5:4 F5:2 G5:4'];
const plChorus = [...plHook, plHook[0], plHook[1], 'Db6:2 -:1 Bb5:2 -:1 F5:2 G5:2 -:1 Bb5:2 -:1 C6:2', 'Bb5:4 G5:2 Eb5:2 F5:2 G5:2 Bb5:4'];
const plV = ['F5:2 Eb5:2 Db5:2 Eb5:2 F5:4 Ab5:4', 'Eb5:2 Db5:2 C5:2 Db5:2 Eb5:4 C5:4', 'G5:2 F5:2 Eb5:2 F5:2 G5:4 Bb5:4'];
const plVerse = [...plV, 'Ab5:6 G5:2 F5:4 C5:4', ...plV, 'Ab5:4 G5:2 F5:2 C5:4 F5:4'];
const plBridge = ['F5:8 Ab5:8', 'G5:8 Bb5:8', 'C6:8 Ab5:8', 'Bb5:12 -:4'];

// ================================================================ Lagune ====
// Fis-Dur, 130 BPM, unter Wasser: alles hinter weichem Tiefpass, Blasen (Sinus-Plucks gleiten aufwärts), langes
// Echo – die Melodie bleibt klar vorn. Intro Fis Cis/Eis dis H | Strophe dis H Fis Cis ×2 | Refrain Fis Cis/Eis dis H |
// Fis Cis/Eis gis Cis (fallender Bass wie eine Strömung) | Überleitung H Cis dis Cis. Hook in Wellenbögen.
const waProg = ['F#', 'C#/F', 'D#m', 'B', ...rep(2, ['D#m', 'B', 'F#', 'C#']).flat(), 'F#', 'C#/F', 'D#m', 'B', 'F#', 'C#/F', 'G#m', 'C#', 'B', 'C#', 'D#m', 'C#'];
const waHook = ['C#5:4 F#5:2 G#5:2 A#5:6 G#5:2', 'G#5:4 F#5:2 F5:2 C#5:6 D#5:2', 'F#5:4 A#5:2 G#5:2 F#5:6 D#5:2', 'D#5:4 F#5:2 G#5:2 F#5:8'];
const waChorus = [...waHook, waHook[0], waHook[1], 'D#5:4 G#5:2 A#5:2 B5:6 A#5:2', 'G#5:4 F5:2 D#5:2 C#5:8'];
const waV = ['F#5:6 F5:2 D#5:4 A#4:4', 'D#5:6 C#5:2 B4:4 F#4:4', 'C#5:6 D#5:2 F#5:4 A#5:4'];
const waVerse = [...waV, 'G#5:8 F5:4 C#5:4', ...waV, 'G#5:6 F5:2 D#5:4 C#5:4'];
const waBridge = ['D#5:8 F#5:8', 'F5:8 G#5:8', 'F#5:8 A#5:8', 'G#5:12 -:4'];
const bubbles = (c) => pat(tones(c, 'F#5'), '0... ..1. .... 2...');
const WATER = [K4, CL, H8O];

// ================================================================ Bergrennen ====
// e-Moll, 150 BPM, treibend. Intro e C D H (Stabs im Hook-Rhythmus, Sechzehntel-Arpeggien) | Strophe e G C D | e G C H |
// Refrain e C D H | e C a H (i–VI–VII–V) | Überleitung C D e H. Hook mit „Motor“-Tonwiederholungen.
const raProg = ['Em', 'C', 'D', 'B', 'Em', 'G', 'C', 'D', 'Em', 'G', 'C', 'B', 'Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B', 'C', 'D', 'Em', 'B'];
const raHook = ['B4:2 E5:1 E5:1 G5:2 E5:1 E5:1 B5:4 G5:2 E5:2', 'A4:2 C5:1 C5:1 E5:2 C5:1 C5:1 G5:4 E5:2 C5:2',
  'A4:2 D5:1 D5:1 F#5:2 D5:1 D5:1 A5:4 F#5:2 D5:2', 'D#5:2 F#5:2 B5:4 A5:2 F#5:2 D#5:4'];
const raChorus = [...raHook, raHook[0], raHook[1], 'C5:2 E5:1 E5:1 A5:2 E5:1 E5:1 C6:4 A5:2 E5:2', 'B5:4 A5:2 F#5:2 D#5:2 F#5:2 B4:4'];
const raV = ['E5:2 -:2 E5:2 F#5:2 G5:4 F#5:2 E5:2', 'D5:2 -:2 D5:2 E5:2 G5:4 E5:2 D5:2', 'C5:2 -:2 C5:2 D5:2 E5:4 D5:2 C5:2'];
const raVerse = [...raV, 'D5:4 F#5:4 A5:6 -:2', ...raV, 'D#5:4 F#5:4 B4:4 -:4'];
const raBridge = ['G5:8 E5:8', 'A5:8 F#5:8', 'B5:8 G5:8', 'F#5:4 D#5:4 B4:8'];
const raArp = (c) => pat(tones(c, 'B4'), '0120 1201 2012 0120');

// ================================================================ Herbstwald ====
// D-Dur, 136 BPM, warm und rollend. Intro h G D A (Piano-Riff) | Strophe G A fis h | G A fis A | Refrain h G D A ×2
// (vi–IV–I–V) | Überleitung G A h A. Hook „rollt“: Auftakt-Achtel, Sprung zum langen Ton, rollender Abstieg.
const auProg = ['Bm', 'G', 'D', 'A', 'G', 'A', 'F#m', 'Bm', 'G', 'A', 'F#m', 'A', ...rep(2, ['Bm', 'G', 'D', 'A']).flat(), 'G', 'A', 'Bm', 'A'];
const auHook = ['D5:2 E5:1 F#5:1 B5:4 A5:2 F#5:1 E5:1 D5:4', 'D5:2 E5:1 G5:1 B5:4 A5:2 G5:1 F#5:1 E5:4',
  'F#5:2 G5:1 A5:1 D6:4 C#6:2 A5:1 G5:1 F#5:4', 'E5:2 F#5:1 G5:1 A5:4 G5:2 F#5:2 E5:4'];
const auChorus = [...auHook, auHook[0], auHook[1], 'A5:2 B5:1 C#6:1 D6:4 C#6:2 B5:1 A5:1 F#5:4', 'E5:4 C#5:4 A4:8'];
const auV = ['B4:4 D5:4 G5:2 F#5:2 D5:4', 'C#5:4 E5:4 A5:2 G5:2 E5:4', 'C#5:4 F#5:4 A5:2 F#5:2 C#5:4'];
const auVerse = [...auV, 'D5:6 C#5:2 B4:8', ...auV, 'C#5:4 E5:2 F#5:2 A5:8'];
const auBridge = ['B5:8 G5:8', 'C#6:8 A5:8', 'D6:8 B5:8', 'C#6:12 -:4'];
const guitar = (c) => pat(tones(c, 'D4'), '0.12 .20. 12.0 .21.');

// ================================================================ Zug ====
// C-Dur, 146 BPM, rollend. Intro C F G C (die Dampfpfeife spielt die Hook) | Strophe a F C G ×2 | Refrain C F G C |
// a F G G | Überleitung F G a G. Hook mit „Tschu-tschu“-Tonwiederholung; Bass und Hats im Tschu-ku-tschu-Rhythmus.
const trProg = ['C', 'F', 'G', 'C', ...rep(2, ['Am', 'F', 'C', 'G']).flat(), 'C', 'F', 'G', 'C', 'Am', 'F', 'G', 'G', 'F', 'G', 'Am', 'G'];
const trHook = ['E5:2 G5:1 G5:1 -:1 G5:1 A5:2 G5:2 E5:2 C5:4', 'F5:2 A5:1 A5:1 -:1 A5:1 C6:2 A5:2 F5:2 C5:4',
  'D5:2 G5:1 G5:1 -:1 G5:1 B5:2 A5:2 G5:2 D5:4', 'E5:4 F5:2 G5:2 C6:8'];
const trChorus = [...trHook, 'C5:2 E5:1 E5:1 -:1 E5:1 A5:2 G5:2 E5:2 C5:4', trHook[1], trHook[2], 'B4:4 D5:2 G5:2 B5:8'];
const trV = ['A4:3 B4:1 C5:2 E5:2 D5:2 C5:2 A4:4', 'A4:3 B4:1 C5:2 F5:2 E5:2 D5:2 C5:4', 'G4:3 A4:1 C5:2 E5:2 D5:2 C5:2 G4:4'];
const trVerse = [...trV, 'B4:4 D5:4 G5:8', ...trV, 'B4:4 D5:2 F5:2 G5:4 D5:4'];
const trBridge = ['A5:8 F5:8', 'B5:8 G5:8', 'C6:8 A5:8', 'B5:4 G5:4 D5:8'];
const CHUG = [K4, CL, dr('h.hh h.hh h.hh h.hh'), dr('.... ...s .... ...s')];

// ================================================================ Himmels-Kettenzaun ====
// B-Dur, 140 BPM, luftig. Intro B d Es F (Glocken spielen die Hook) | Strophe g Es B F ×2 | Refrain B d Es F | B d g F |
// Überleitung Es F g F. Hook mit großen, singbaren Schritten (Quarte, Quinte) und langen Tönen.
const skProg = ['Bb', 'Dm', 'Eb', 'F', ...rep(2, ['Gm', 'Eb', 'Bb', 'F']).flat(), 'Bb', 'Dm', 'Eb', 'F', 'Bb', 'Dm', 'Gm', 'F', 'Eb', 'F', 'Gm', 'F'];
const skHook = ['F5:4 Bb5:4 A5:2 Bb5:2 C6:4', 'D6:4 A5:4 F5:2 G5:2 A5:4', 'Bb5:4 G5:4 F5:2 G5:2 Bb5:4', 'C6:6 Bb5:2 A5:4 F5:4'];
const skChorus = [...skHook, skHook[0], skHook[1], 'Bb5:4 D6:4 C6:2 Bb5:2 G5:4', 'A5:4 C6:4 D6:2 C6:2 A5:4'];
const skV = ['D5:2 G5:2 A5:2 Bb5:4 A5:2 G5:4', 'Eb5:2 G5:2 A5:2 Bb5:2 G5:4 Eb5:4', 'D5:2 F5:2 G5:2 A5:2 Bb5:4 F5:4'];
const skVerse = [...skV, 'C5:4 F5:4 A5:8', ...skV, 'C6:4 A5:4 F5:4 -:4'];
const skBridge = ['G5:8 Bb5:8', 'A5:8 C6:8', 'Bb5:8 D6:8', 'C6:12 -:4'];
const skArp = (c) => pat(tones(c, 'D6'), '0120 1201 0120 1201');

// ================================================================ Karte Welt 3 ====
// F-Dur, 128 BPM, 16 Takte, ruhige Ballade: Strophe F a B C ×2 (Piano) | Refrain B C a d | B C F F (weicher Lead,
// IV–V–iii–vi). Kick auf 1 und 3, leise Schellen, Glöckchen-Tupfer.
const m3Prog = [...rep(2, ['F', 'Am', 'Bb', 'C']).flat(), 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'F', 'F'];
const m3Piano = ['A4:2 C5:2 F5:4 E5:2 F5:2 C5:4', 'A4:2 C5:2 E5:4 D5:2 E5:2 C5:4', 'Bb4:2 D5:2 F5:4 G5:2 F5:2 D5:4', 'G5:4 F5:2 E5:2 C5:8',
  'A4:2 C5:2 F5:4 E5:2 F5:2 C5:4', 'A4:2 C5:2 E5:4 D5:2 E5:2 C5:4', 'D5:2 F5:2 Bb5:4 A5:2 G5:2 F5:4', 'E5:4 G5:4 C6:8'];
const m3Lead = ['F5:6 D5:2 Bb4:4 D5:4', 'G5:6 E5:2 C5:4 E5:4', 'A5:6 G5:2 E5:4 C5:4', 'D5:4 E5:2 F5:2 A5:8',
  'F5:6 D5:2 Bb4:4 D5:4', 'G5:6 E5:2 C5:4 E5:4', 'A5:6 G5:2 F5:4 C5:4', 'F5:12 -:4'];
const W3MAP = [KH, CL, dr('j.j. j.j. j.j. j.j.')];

export const WORLD3_THEMES = {
  // Schneepark (3-1): 132 BPM, Es-Dur, 24 Takte, warm und glitzernd. Intro: Glockenspiel spielt die Hook über Pad und
  // Schlittenschellen | Strophe (c As Es B): ruhiger Lead in Vierteln, Piano auf der „und“ | Refrain (Es c As B,
  // I–vi–IV–V): Hook im Querrhythmus 3-3-3-3-4, Rave-Piano 3-3-2 | Überleitung: lange Töne, Glöckchen-Echo.
  course_snow: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4200, volume: 0.16 },
      bell: { volume: 0.1, decay: 0.6, ratio: 2.76, partial: 0.4 },
      arp: { type: 'sine', volume: 0.08, decay: 0.4 },
      piano: { volume: 0.1, cutoff: 3800, cutoffEnd: 1400 },
      pad: { volume: 0.05, bright: 1.1 },
      stabs: { volume: 0.11 },
      bass: { cutoff: 700, volume: 0.17 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { pitchStart: 130, click: 0.2, volume: 0.55 }, clap: { volume: 0.3 }, jingle: { volume: 0.22, off: 0.13 } },
    fx: { delay: { steps: 3, feedback: 0.35, lowpass: 3800, wet: 0.3, send: { bell: 0.55, arp: 0.6, lead: 0.2, clap: 0.2 } } },
    lead: [...rest(4), ...snVerse, ...snChorus, ...snBridge],
    bell: [...snHook, ...rest(20)],
    arp: [...rest(20), '-:8 Eb6:1 -:7', '-:8 F6:1 -:7', '-:8 G6:1 -:7', '-:8 Bb6:1 -:7'],
    piano: bySection(snProg, SONG, { intro: (c) => chordBar(c, LONG, 'G4'), verse: (c) => chordBar(c, OFF, 'G4'), chorus: (c) => chordBar(c, P332, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(snProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: snProg.map((c) => padBar(c)),
    riser: [...rest(23), 'Bb3:16'],
    bass: bySection(snProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, SNOW, [K4, CL, dr('j.jj j.jj jjjj jjjj')]), ...groove(4, SNOW, [K4, CL, SLEIGH, dr('.... .... .... .ttt')]),
      ...groove(4, SNOW, [K4, CL, dr('j.jj j.jj jjjj jjjj')], false), ...groove(4, SNOW_C, [K4, CL, SLEIGH, dr('.... .... .... tttt')]),
      ...groove(4, SNOW_C, [K4, CL, dr('j.jj j.jj jjjj jjjj')], false),
      [K4, CL, SLEIGH, CR], [K4, CL, SLEIGH], [K4, CL, SLEIGH], [K4, dr('.... c... .... ....'), dr('j.jj j.jj .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Spukhaus (3-3): 130 BPM, cis-Moll, 24 Takte, schaurig-niedlich. Intro: die Orgel spielt die Hook | Strophe (cis cis fis
  // Gis | cis cis A Gis): Orgel-Melodie, Piano auf der „und“, Standuhr | Refrain (cis A E H | cis A fis Gis): Lead-Hook mit
  // Wechselnote (E–Dis–E) und Sprung zur Oktave, Orgel-„pa“ auf der „und“ | Überleitung: Theremin singt lange Töne.
  course_ghost: {
    bpm: 130,
    voice: {
      lead: { ...SYNTH, cutoff: 3800, volume: 0.18 },
      organ: { volume: 0.06, cutoff: 2600 },
      whistle: { type: 'sine', volume: 0.13, vibrato: 40, rate: 6, slide: 2, attack: 0.06, gate: 0.95 },
      piano: { volume: 0.08, cutoff: 3600 },
      pad: { volume: 0.045, bright: 0.7 },
      bass: { cutoff: 650, volume: 0.18 },
      riser: { glide: 0.5, volume: 0.07, noise: 0.03 },
    },
    kit: { tick: { freq: 1500, volume: 0.1, decay: 0.05 }, clap: { volume: 0.3 }, hat: { volume: 0.28, off: 0.17 }, tom: { freq: 120, volume: 0.32 } },
    fx: { delay: { steps: [3, 4], feedback: 0.35, lowpass: 2400, wet: 0.35, send: { whistle: 0.45, clap: 0.35, organ: 0.15, lead: 0.15 } } },
    lead: [...rest(12), ...ghChorus, ...rest(4)],
    organ: bySection(ghProg, SONG, {
      intro: (c, i) => tr(ghHook, -12)[i],
      verse: (c, i) => tr(ghVerse, -12)[i],
      chorus: (c) => chordBar(c, OFF, 'G#3'),
      bridge: (c) => chordBar(c, 'x___ ____ x___ ____', 'G#3'),
    }),
    whistle: [...rest(20), ...ghBridge],
    piano: bySection(ghProg, SONG, { verse: (c) => chordBar(c, OFF, 'G#4') }),
    pad: bySection(ghProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'G#5:16'],
    bass: bySection(ghProg, SONG, { intro: (c) => bassBar(c, 'L_.. H_.. L_.. H_..'), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, GHOST, [K4, CL, H8, CLOCK, dr('.... .... .... .ttt')]), ...groove(4, GHOST, [K4, CL, H8, CLOCK, dr('.... .... .... tttt')]),
      ...groove(4, GHOST, [K4, CL, H8, CLOCK, dr('.... .... .... .ttt')], false), ...groove(4, [K4, CL, HH, CLOCK], [K4, CL, HH, CLOCK, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, CLOCK], [K4, CL, dr('hhoh hhoh hhoh ....'), CLOCK, dr('.... .... .... ssss')], false),
      [K4, CL, CLOCK, CR], [K4, CL, CLOCK], [K4, CL, H8, CLOCK], [K4, dr('.... c... .... ....'), CLOCK, dr('.... .... ssss ssss')],
    ],
  },

  // Pastell-Garten (3-4, nur 100 s): 148 BPM, As-Dur, 24 Takte, leicht und schnell. Intro: Piano-Riff in Oktaven |
  // Strophe (Des As Es f, IV–I–V–vi): Lead in Achteln, Piano auf der „und“ | Refrain (As Des f Es | As Des b Es): Hook in
  // punktierten Achteln, leise Rechteck-Glitzer-Arpeggien, Stabs | Überleitung: lange Töne, Riser.
  course_plaza: {
    bpm: 148,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.15 },
      arp: { type: 'square', volume: 0.04, decay: 0.08 },
      piano: { volume: 0.1, cutoff: 5000 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.04, bright: 1.3 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tom: { freq: 260, volume: 0.32 }, hat: { volume: 0.28, off: 0.17 } },
    fx: { lowpass: { arp: 5000 }, delay: { steps: 3, feedback: 0.25, lowpass: 4000, wet: 0.22, send: { arp: 0.35, lead: 0.15 } } },
    lead: [...rest(4), ...plVerse, ...plChorus, ...plBridge],
    piano: bySection(plProg, SONG, { intro: (c, i) => octaves(tr(plHook, -12))[i], verse: (c) => chordBar(c, OFF, 'G4'), chorus: (c) => chordBar(c, P332, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    arp: bySection(plProg, SONG, { chorus: (c) => pat(tones(c, 'Ab5'), '0.1. 2.1. 0.1. 2.1.') }),
    stabs: bySection(plProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(plProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'Eb4:16'],
    bass: bySection(plProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]), ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... .ttt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... ssss')], false), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... tttt tttt')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Rohr-Lagune (3-5, unter Wasser): 130 BPM, Fis-Dur, 24 Takte. Intro: das Piano spielt die Hook gedämpft in Oktaven |
  // Strophe (dis H Fis Cis): Lead in langen Bögen, Blasen | Refrain (Fis Cis/Eis dis H | Fis Cis/Eis gis Cis): Hook in
  // Wellenbögen über fallendem Bass | Überleitung: lange Töne. Weicher Tiefpass auf Piano, Pad und Stabs, Lead etwas
  // gedämpft (die Melodie bleibt klar), Blasen-Plucks gleiten aufwärts, langes Echo.
  course_water: {
    bpm: 130,
    voice: {
      lead: { ...SYNTH, cutoff: 2400, voices: 5, volume: 0.18, q: 1.5 },
      piano: { volume: 0.13, cutoff: 2600, cutoffEnd: 900 },
      pad: { volume: 0.055, bright: 0.7 },
      arp: { type: 'sine', volume: 0.09, decay: 0.06, glide: 1.7, glideTime: 0.05 },
      stabs: { volume: 0.12 },
      bass: { cutoff: 520, volume: 0.2 },
      riser: { volume: 0.06 },
    },
    kit: { kick: { pitchStart: 120, click: 0.08, volume: 0.55, decay: 0.3 }, clap: { volume: 0.26 }, hat: { volume: 0.28, off: 0.18 }, open: { volume: 0.16 } },
    fx: {
      lowpass: { piano: 1500, pad: 1300, stabs: 1400 },
      delay: { steps: [3, 5], feedback: 0.45, lowpass: 1800, wet: 0.4, send: { arp: 0.6, lead: 0.3, piano: 0.35, clap: 0.3 } },
    },
    lead: [...rest(4), ...waVerse, ...waChorus, ...waBridge],
    piano: bySection(waProg, SONG, { intro: (c, i) => octaves(tr(waHook, -12))[i], verse: (c) => chordBar(c, 'x__. ..x_ .... ....', 'F#4'), chorus: (c) => chordBar(c, OFF, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    arp: waProg.map(bubbles),
    stabs: bySection(waProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: waProg.map((c) => padBar(c)),
    riser: [...rest(23), 'C#4:16'],
    bass: bySection(waProg, SONG, { intro: (c) => bassBar(c, B_HALF), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, WATER, [K4, CL, dr('h.h. h.h. hhhh hhhh')]), ...groove(4, WATER, [K4, CL, H8O, dr('.... .... .... .ttt')]),
      ...groove(4, WATER, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... ssss')], false), ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HOF], [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... .... ssss')], false),
      [KH, CL, H8O, CR], [KH, CL, H8O], [K4, CL, H8O], [K4, dr('.... c... .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Bergrennen (3-6): 150 BPM, e-Moll, 24 Takte, treibend wie ein Kart-Rennen. Intro: Stabs im Hook-Rhythmus, Rechteck-
  // Arpeggien in Sechzehnteln, Galopp-Bass | Strophe (e G C D | e G C H): Lead mit Synkopen | Refrain (e C D H | e C a H):
  // Hook mit „Motor“-Tonwiederholungen | Überleitung: lange Töne über den Arpeggien, Riser in den Loop.
  course_race: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      arp: { type: 'square', volume: 0.035, decay: 0.06 },
      stabs: { volume: 0.12 },
      piano: { volume: 0.09 },
      pad: { volume: 0.04 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tom: { freq: 200, volume: 0.4 } },
    fx: { lowpass: { arp: 4500 } },
    lead: [...rest(4), ...raVerse, ...raChorus, ...raBridge],
    arp: bySection(raProg, SONG, { intro: raArp, chorus: raArp, bridge: raArp }),
    stabs: bySection(raProg, SONG, {
      intro: (c) => chordBar(c, 'x_.x x_.x x___ x_x_'),
      verse: (c) => chordBar(c, '..x. ..x. ..x. ..x.'),
      chorus: (c) => chordBar(c, ST24),
      bridge: (c) => chordBar(c, 'x..x ..x. .x.. x.x.'),
    }),
    piano: bySection(raProg, SONG, { chorus: (c) => chordBar(c, P332, 'G4') }),
    pad: bySection(raProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c) }),
    riser: [...rest(23), 'B3:16'],
    bass: bySection(raProg, SONG, { intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_GALLOP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... ssss')]), ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, dr('h.h. h.h. hh.. ....'), dr('.... .... ..ss ssss')], false), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, dr('..s. ..s. ..s. ..s.')], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Herbstwald-Schalttafeln (3-7): 136 BPM, D-Dur, 24 Takte, warm und rollend. Intro: Piano-Riff in Oktaven (h G D A) |
  // Strophe (G A fis h | G A fis A): Lead in Dreiklang-Bögen, Gitarren-Zupfer (Sägezahn hinter Tiefpass) im rollenden
  // Muster | Refrain (h G D A ×2, vi–IV–I–V): „rollende“ Hook, Piano 3-3-2 | Überleitung: lange Töne, Riser.
  course_autumn: {
    bpm: 136,
    voice: {
      lead: { ...SYNTH, cutoff: 3400, volume: 0.17 },
      arp: { type: 'sawtooth', volume: 0.06, decay: 0.12 },
      piano: { volume: 0.1, oscs: 1 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.045, bright: 0.85 },
      bass: { cutoff: 720 },
      riser: { volume: 0.07 },
    },
    kit: { clap: { volume: 0.32 }, tom: { freq: 170, volume: 0.36 } },
    fx: { lowpass: { arp: 2200 }, delay: { steps: 3, feedback: 0.3, lowpass: 2500, wet: 0.28, send: { arp: 0.4, lead: 0.18 } } },
    lead: [...rest(4), ...auVerse, ...auChorus, ...auBridge],
    piano: bySection(auProg, SONG, { intro: (c, i) => octaves(tr(auHook, -12))[i], chorus: (c) => chordBar(c, P332, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    arp: bySection(auProg, SONG, { verse: guitar, chorus: guitar, bridge: guitar }),
    stabs: bySection(auProg, SONG, { intro: (c) => chordBar(c, ST24), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(auProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'A3:16'],
    bass: bySection(auProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, H8O], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... .ttt')]), ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... ssss')], false), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ..tt tttt')], false),
      [K4, CL, H8O, CR], [K4, CL, H8O], [K4, CL, H8O], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Projektil-Express (3-Zug, Autoscroller + Boss Schattenläuferin): 146 BPM, C-Dur, 24 Takte, rollend. Intro: die
  // Dampfpfeife spielt die Hook (C F G C) | Strophe (a F C G ×2): Lead, Piano auf der „und“ | Refrain (C F G C | a F G G):
  // Hook mit „Tschu-tschu“-Tonwiederholung, Stabs | Überleitung: lange Töne, Pfeife. Hats und Bass im Tschu-ku-tschu.
  course_train: {
    bpm: 146,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.16 },
      whistle: { type: 'sine', volume: 0.13, vibrato: 10, rate: 5, slide: 0.6, attack: 0.02, gate: 0.85 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.04 },
      bass: { cutoff: 800, volume: 0.17 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, snare: { volume: 0.13 }, hat: { volume: 0.28, off: 0.16 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.25, send: { whistle: 0.4, lead: 0.12 } } },
    whistle: [...trHook, ...rest(16), '-:8 C6:8', '-:8 D6:8', '-:16', '-:16'],
    lead: [...rest(4), ...trVerse, ...trChorus, ...trBridge],
    piano: bySection(trProg, SONG, { intro: (c) => chordBar(c, OFF, 'G4'), verse: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(trProg, SONG, { chorus: (c) => chordBar(c, '..x. ..x. ..x. ..x.') }),
    pad: bySection(trProg, SONG, { intro: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'D4:16'],
    bass: bySection(trProg, SONG, { intro: (c) => bassBar(c, B_DRIVE), verse: (c) => bassBar(c, B_DRIVE), chorus: (c) => bassBar(c, B_DRIVE), bridge: (c, i) => bassBar(c, i < 3 ? B_DRIVE : 'L.LH L.LH .... ....') }),
    drums: [
      ...groove(4, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... .... ssss')]), ...groove(4, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... .... tttt')]),
      ...groove(4, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... ..ss ssss')], false), ...groove(4, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... .... tttt')]),
      ...groove(4, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... ..ss ssss')], false),
      [...CHUG, CR], CHUG, CHUG, [K4, dr('.... c... .... ....'), dr('h.hh h.hh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Himmels-Kettenzaun (3-2, Autoscroller im Himmel): 140 BPM, B-Dur, 24 Takte, luftig. Intro: Glocken spielen die Hook |
  // Strophe (g Es B F ×2): Lead, helle Pads | Refrain (B d Es F | B d g F, I–iii–IV–V): Hook mit Quart- und Quintschritten
  // und langen Tönen, hohe Dreieck-Arpeggien, offene Hats auf jeder „und“ | Überleitung: lange Töne, Glocken.
  course_skyway: {
    bpm: 140,
    voice: {
      lead: { ...SYNTH, cutoff: 4800, volume: 0.16 },
      bell: { volume: 0.1, decay: 0.55, ratio: 2.76, partial: 0.35 },
      arp: { type: 'triangle', volume: 0.05, decay: 0.1 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.1 },
      pad: { volume: 0.055, bright: 1.4 },
      riser: { volume: 0.07 },
    },
    kit: { clap: { volume: 0.3 }, open: { volume: 0.2 } },
    fx: { delay: { steps: [3, 4], feedback: 0.4, lowpass: 4200, wet: 0.32, send: { arp: 0.45, bell: 0.55, lead: 0.22 } } },
    lead: [...rest(4), ...skVerse, ...skChorus, ...skBridge],
    bell: [...skHook, ...rest(20)],
    arp: bySection(skProg, SONG, { chorus: skArp, bridge: skArp }),
    piano: bySection(skProg, SONG, { intro: (c) => chordBar(c, OFF, 'F4'), verse: (c) => chordBar(c, OFF, 'F4'), chorus: (c) => chordBar(c, P332, 'F4') }),
    stabs: bySection(skProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: skProg.map((c) => padBar(c, 'F3')),
    riser: [...rest(23), 'F4:16'],
    bass: bySection(skProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HOF], [K4, CL, dr('h.o. h.o. hhhh hhhh')]), ...groove(4, [K4, CL, HOF], [K4, CL, HOF, dr('.... .... .... .ttt')]),
      ...groove(4, [K4, CL, HOF], [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... .... ssss')], false), ...groove(4, [K4, CL, HOF], [K4, CL, dr('h.o. h.o. hhhh hhhh')]),
      ...groove(4, [K4, CL, HOF], [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... .... tttt')], false),
      [K4, CL, HOF, CR], [K4, CL, HOF], [K4, CL, HOF], [K4, dr('.... c... .... ....'), dr('h.o. h.o. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Weltkarte Welt 3: 128 BPM, F-Dur, 16 Takte, ruhige Eurodance-Ballade. Strophe (F a B C ×2): Piano-Melodie mit Echo |
  // Refrain (B C a d | B C F F, IV–V–iii–vi): weicher Lead, Piano auf der „und“. Kick auf 1 und 3, leise Schellen,
  // Glöckchen-Tupfer am Phrasenende.
  course_world3_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3000, volume: 0.17 },
      piano: { volume: 0.12, cutoff: 4000 },
      pad: { volume: 0.05 },
      bell: { volume: 0.06, decay: 0.6, ratio: 2.76, partial: 0.35 },
      bass: { cutoff: 650 },
    },
    kit: { jingle: { volume: 0.16, off: 0.1 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3200, wet: 0.3, send: { piano: 0.3, lead: 0.2, bell: 0.5 } } },
    piano: [...m3Piano, ...m3Prog.slice(8).map((c) => chordBar(c, OFF, 'E4'))],
    lead: [...rest(8), ...m3Lead],
    bell: ['-:12 C7:4', '-:16', '-:12 D7:4', '-:16', '-:12 A6:4', '-:16', '-:12 F6:4', '-:16', ...rest(8)],
    pad: m3Prog.map((c) => padBar(c)),
    bass: m3Prog.map((c) => bassBar(c, B_HALF)),
    drums: [[...W3MAP, CR], W3MAP, W3MAP, [KH, CL, dr('j.j. j.j. j.j. jjjj')], W3MAP, W3MAP, W3MAP, [KH, CL, dr('j.j. j.j. jjjj jjjj')],
      [...W3MAP, CR], W3MAP, W3MAP, [KH, CL, dr('j.j. j.j. j.j. jjjj')], W3MAP, W3MAP, W3MAP, [KH, CL, dr('j.j. j.j. jjjj jjjj')]],
  },
};
