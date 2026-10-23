// Kurs-Themen Welt 4 „Canyon-Inselkette“ – eigene Kompositionen im Stil des 90er-Eurodance
// (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Analyse der ersten Fassung (Rückmeldung des Auftraggebers: „nicht melodisch“): Ruinenstadt in A-Phrygisch,
// Canyon dorisch, Giftwald mit chromatisch kriechendem Motiv, Lava-Burg mit Neapolitaner und Tritonus-Reibung –
// Farbe statt Harmonik. Die Melodie lag bei Pfiff/Flöte in langen Einzeltönen oder bei Riffs mit Tonwiederholungen,
// der Lead spielte meist nur 8 von 16 Takten (Piep-Blöcke: ein Takt Melodie, ein Takt liegender Ton), Twang-,
// Tropfen- und Harfen-Ostinati füllten den Rest; einen wiederkehrenden Refrain gab es nicht.
//
// Neufassung nach der Musik-Richtlinie (wie Welt 2 und 3): Lieder in Dur/Moll – Intro (Hook-Riff) → Strophe →
// Refrain (zweitaktige Hook, A A' A A'') → Überleitung –, Eurodance-Akkordfolgen, Lead-Synth fast durchgehend. Farbe
// nur über Klang: Western-Pfiff und Twang (Canyon), Gifttropfen (Giftwald), Piep-Glocken (Piep-Blöcke), Boing-Zupfer
// (Trampolin), Flöte, Harfe und Stammes-Toms (Ruinen), Burg-Orgel und Hoover-Riser (Lava-Burg).
//
// course_beep bleibt die Uhr der Piep-Blöcke: themeInfo('course_beep').sync = { switchEvery: 8, warnBeats: 3 },
// Umschalt-Piep G6 auf Zählzeit 0, 8, 16 … (mit Crash), Warn-Piep C6 auf 5, 6, 7 jedes Achterblocks – nur in der
// bell-Spur (die Piep-Blöcke spielen dann keine eigenen Pieps). Die Melodie hält in den Warn-Takten lange Töne und
// setzt keine Töne auf die Warn-Zählzeiten; die Akkorde enthalten im Umschalt-Takt G und im Warn-Takt C, so klingen
// die Pieps als Teil der Harmonie.

import {
  dr, K4, KH, CL, HH, H8, H8O, HUP, CR, rep, rest, mel, tr, octaves, chordBar, bassBar, padBar, pat, voicing,
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

// ================================================================ Canyon ====
// a-Moll, 138 BPM, Western-Eurodance. Intro a F G E (der Western-Pfiff spielt die Hook) | Strophe a d G C | a d G E |
// Refrain a F G E | a F d E (i–VI–VII–V) | Überleitung F G a E (Pfiff). Hook im Galopp-Rhythmus.
const caProg = ['Am', 'F', 'G', 'E', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G', 'E', 'Am', 'F', 'G', 'E', 'Am', 'F', 'Dm', 'E', 'F', 'G', 'Am', 'E'];
const caHook = ['A4:2 C5:1 D5:1 E5:2 A5:2 G5:2 E5:1 D5:1 E5:4', 'F5:2 E5:1 D5:1 C5:2 A4:2 C5:2 D5:1 E5:1 F5:4',
  'G5:2 F5:1 E5:1 D5:2 B4:2 D5:2 E5:1 F5:1 G5:4', 'B5:4 G#5:2 E5:2 D5:2 B4:2 G#4:4'];
const caChorus = [...caHook, caHook[0], caHook[1], 'D5:2 F5:1 G5:1 A5:2 D6:2 C6:2 A5:1 G5:1 A5:4', 'E5:2 G#5:1 A5:1 B5:4 G#5:2 E5:2 B4:4'];
const caV = ['E5:4 C5:2 A4:2 B4:2 C5:2 D5:2 E5:2', 'F5:4 D5:2 A4:2 C5:2 D5:2 E5:2 F5:2', 'D5:4 B4:2 G4:2 A4:2 B4:2 C5:2 D5:2'];
const caVerse = [...caV, 'E5:6 D5:2 C5:8', ...caV, 'B4:4 D5:2 E5:2 G#5:4 -:2 G#4:2'];
const caBridge = ['A5:8 F5:8', 'B5:8 G5:8', 'C6:8 A5:8', 'B5:8 G#5:8'];
const twang = (c) => pat(tones(c, 'A3'), '0.00 1.00 2.00 1.00');
const CANYON = [K4, CL, H8, dr('s..s ..s. s..s ..s.')];

// ================================================================ Giftwasser-Wald ====
// fis-Moll, 134 BPM, schleichend. Intro fis h E A (Piano-Riff) | Strophe fis D E fis | fis D E Cis | Refrain fis h E A |
// fis h Cis Cis (i–iv–VII–III) | Überleitung D E fis Cis. Hook beginnt nach der Eins (Pause, dann Aufgang) – „schleicht“.
const poProg = ['F#m', 'Bm', 'E', 'A', 'F#m', 'D', 'E', 'F#m', 'F#m', 'D', 'E', 'C#', 'F#m', 'Bm', 'E', 'A', 'F#m', 'Bm', 'C#', 'C#', 'D', 'E', 'F#m', 'C#'];
const poHook = ['-:2 C#5:2 F#5:2 A5:2 -:2 G#5:2 F#5:2 E5:2', '-:2 D5:2 F#5:2 B5:2 -:2 A5:2 F#5:2 D5:2', '-:2 B4:2 E5:2 G#5:2 -:2 F#5:2 E5:2 D5:2', 'C#5:4 E5:4 A5:6 -:2'];
const poChorus = [...poHook, poHook[0], poHook[1], '-:2 C#5:2 F5:2 G#5:2 -:2 B5:2 G#5:2 F5:2', 'G#5:4 F5:4 C#5:8'];
const poV = ['F#5:3 E5:1 C#5:2 A4:2 B4:2 C#5:2 A4:4', 'F#5:3 E5:1 D5:2 A4:2 B4:2 D5:2 F#5:4', 'E5:3 D5:1 B4:2 G#4:2 A4:2 B4:2 E5:4'];
const poVerse = [...poV, 'C#5:6 B4:2 A4:4 F#4:4', ...poV, 'G#4:4 B4:2 C#5:2 F5:4 G#5:4'];
const poBridge = ['F#5:8 A5:8', 'G#5:8 B5:8', 'A5:8 C#6:8', 'B5:4 G#5:4 F5:8'];
const drops = (c) => pat(tones(c, 'C#6'), '..0. .... .1.. ..2.');

// ================================================================ Piep-Blöcke ====
// c-Moll, 128 BPM. Zweitaktige Blöcke = Spiel-Takt (8 Zählzeiten): Umschalt-Takt (Piep G6 auf der Eins, Akkord mit G:
// c, Es, G) und Warn-Takt (Pieps C6 auf 2, 3, 4, Akkord mit C: As, f, c). Intro c As c As | Strophe Es As c f Es As G As |
// Refrain c As Es f c As G c | Überleitung Es f G As. Hook: Lauf zum langen Ton im Umschalt-Takt, im Warn-Takt
// ein liegender Ton mit Auftakt auf der „und“ von 4 (die Pieps bleiben frei).
const bpProg = ['Cm', 'Ab', 'Cm', 'Ab', 'Eb', 'Ab', 'Cm', 'Fm', 'Eb', 'Ab', 'G', 'Ab', 'Cm', 'Ab', 'Eb', 'Fm', 'Cm', 'Ab', 'G', 'Cm', 'Eb', 'Fm', 'G', 'Ab'];
const bpHook = ['Eb5:4 D5:2 C5:2 G5:6 F5:2', 'Eb5:12 -:2 F5:2', 'G5:4 F5:2 Eb5:2 Bb5:6 Ab5:2', 'F5:12 -:2 G5:2'];
const bpChorus = [...bpHook, bpHook[0], 'C6:12 -:2 Bb5:2', 'D6:4 C6:2 B5:2 G5:6 F5:2', 'Eb5:12 -:2 D5:2'];
const bpVerse = ['G4:2 Bb4:2 Eb5:4 D5:2 Eb5:2 F5:4', 'C5:12 -:2 Bb4:2', 'G4:2 C5:2 Eb5:4 D5:2 C5:2 D5:4', 'Ab4:12 -:2 G4:2',
  'G4:2 Bb4:2 Eb5:4 D5:2 Eb5:2 F5:4', 'C5:12 -:2 Bb4:2', 'B4:2 D5:2 G5:4 F5:2 D5:2 B4:4', 'C5:12 -:2 D5:2'];
const bpBridge = ['G5:16', 'Ab5:12 -:2 G5:2', 'B5:16', 'C6:12 -:4'];
const BEEP_ON = mel('G6', 'x... .... .... ....');          // Umschalt-Takt: Piep auf der Eins
const BEEP_WARN = mel('C6 C6 C6', '.... x... x... x...');   // Warn-Takt: Piep auf 2, 3, 4
const PULSE = dr('x... x... x... x...');
const BEEP_A = [K4, CL, HUP, PULSE, CR], BEEP_B = [K4, CL, HUP, PULSE];
const bpArp = (c) => pat(tones(c, 'C4'), '0.1. 2.1. 0.1. 2.1.');

// ================================================================ Trampolin-Athletik ====
// Des-Dur, 142 BPM, federnd. Intro Des Ges b As (Piano-Riff) | Strophe b Ges Des As ×2 | Refrain Des Ges b As |
// Des Ges es As (I–IV–vi–V) | Überleitung Ges As b As. Hook „hüpft“: zwei Töne, Pause, Aufschwung, Pause.
const boProg = ['Db', 'Gb', 'Bbm', 'Ab', ...rep(2, ['Bbm', 'Gb', 'Db', 'Ab']).flat(), 'Db', 'Gb', 'Bbm', 'Ab', 'Db', 'Gb', 'Ebm', 'Ab', 'Gb', 'Ab', 'Bbm', 'Ab'];
const boHook = ['Ab4:2 Db5:2 -:2 Db5:2 F5:2 Ab5:2 -:2 F5:2', 'Bb4:2 Db5:2 -:2 Db5:2 Gb5:2 Bb5:2 -:2 Ab5:2',
  'Bb4:2 Db5:2 -:2 Db5:2 F5:2 Bb5:2 -:2 Ab5:2', 'Ab5:4 Gb5:2 F5:2 Eb5:4 C5:4'];
const boChorus = [...boHook, boHook[0], boHook[1], 'Bb4:2 Eb5:2 -:2 Eb5:2 Gb5:2 Bb5:2 -:2 Gb5:2', 'Eb5:4 F5:2 Gb5:2 Ab5:8'];
const boV = ['Bb4:3 Db5:1 F5:2 Db5:2 Eb5:3 F5:1 Db5:4', 'Bb4:3 Db5:1 Gb5:2 F5:2 Eb5:3 Db5:1 Bb4:4', 'Ab4:3 Db5:1 F5:2 Eb5:2 Db5:3 Eb5:1 F5:4'];
const boVerse = [...boV, 'Eb5:6 C5:2 Ab4:8', ...boV, 'Eb5:4 F5:2 Gb5:2 Ab5:4 -:2 Ab4:2'];
const boBridge = ['Bb5:8 Gb5:8', 'C6:8 Ab5:8', 'Db6:8 Bb5:8', 'C6:8 Eb5:8'];
const boing = (c) => pat(tones(c, 'Ab5'), '..0. ..1. ..2. ..1.');

// ================================================================ Ruinenstadt ====
// d-Moll, 132 BPM, geheimnisvoll, aber singbar. Intro d g C F (die Flöte spielt die Hook) | Strophe d B F C | d B g A |
// Refrain d g C F | d g A A (i–iv–VII–III) | Überleitung B C d A (Flöte). Hook: langer Ton, dann stufenweiser Abstieg.
const ruProg = ['Dm', 'Gm', 'C', 'F', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Dm', 'Gm', 'C', 'F', 'Dm', 'Gm', 'A', 'A', 'Bb', 'C', 'Dm', 'A'];
const ruHook = ['A5:6 G5:2 F5:2 E5:2 D5:4', 'Bb5:6 A5:2 G5:2 F5:2 D5:4', 'G5:6 F5:2 E5:2 D5:2 C5:4', 'A5:4 C6:4 F5:8'];
const ruChorus = [...ruHook, ruHook[0], ruHook[1], 'E5:4 A5:4 C#6:8', 'A5:6 G5:2 E5:4 C#5:4'];
const ruV = ['D5:2 E5:2 F5:4 E5:2 D5:2 A4:4', 'Bb4:2 C5:2 D5:4 C5:2 Bb4:2 F4:4', 'A4:2 Bb4:2 C5:4 D5:2 C5:2 A4:4'];
const ruVerse = [...ruV, 'G4:2 A4:2 C5:4 E5:4 G5:4', ruV[0], ruV[1], 'Bb4:2 C5:2 D5:4 F5:2 E5:2 D5:4', 'C#5:4 E5:4 A5:8'];
const ruBridge = ['F5:8 D5:8', 'G5:8 E5:8', 'A5:8 F5:8', 'E5:8 C#5:8'];
const harp = (c) => pat(tones(c, 'D5'), '0120 1201 0120 1201');
const RUINS = [K4, CL, H8, dr('t.t. ..t. .tt. ..t.')];

// ================================================================ Lava-Burg ====
// es-Moll, 148 BPM, wuchtig. Intro es Ces Des B (die Burg-Orgel spielt die Hook) | Strophe es es as B | es es Ces B |
// Refrain es Ces Des B | es Ces as B (i–VI–VII–V) | Überleitung Ces Des es B. Hook: Tonwiederholung als Auftakt, Dreiklang
// aufwärts zur Oktave – heroisch in Moll. Harte Stabs, Galopp-Bass, Hoover-Riser über zwei Takte in den Loop.
const lvProg = ['Ebm', 'Cb', 'Db', 'Bb', 'Ebm', 'Ebm', 'Abm', 'Bb', 'Ebm', 'Ebm', 'Cb', 'Bb', 'Ebm', 'Cb', 'Db', 'Bb', 'Ebm', 'Cb', 'Abm', 'Bb', 'Cb', 'Db', 'Ebm', 'Bb'];
const lvHook = ['Eb5:2 -:1 Eb5:1 Gb5:2 Bb5:2 Eb6:4 Db6:4', 'Cb6:4 Bb5:2 Gb5:2 Eb5:4 Gb5:4', 'Db5:2 -:1 Db5:1 F5:2 Ab5:2 Db6:4 Cb6:4', 'Bb5:4 Ab5:2 F5:2 D5:8'];
const lvChorus = [...lvHook, lvHook[0], lvHook[1], 'Eb5:2 -:1 Eb5:1 Ab5:2 Cb6:2 Eb6:4 Db6:4', 'D6:4 Bb5:4 F5:4 D5:4'];
const lvV = ['Bb4:4 Eb5:2 F5:2 Gb5:4 F5:2 Eb5:2', 'Gb5:4 F5:2 Eb5:2 Db5:4 Bb4:4'];
const lvVerse = [...lvV, 'Cb5:4 Eb5:2 F5:2 Gb5:4 F5:2 Eb5:2', 'D5:4 F5:4 Bb5:8', ...lvV, 'Eb5:4 Gb5:2 Ab5:2 Bb5:4 Gb5:4', 'F5:4 D5:4 Bb4:4 -:2 Bb4:1 Bb4:1'];
const lvBridge = ['Gb5:8 Eb5:8', 'Ab5:8 F5:8', 'Bb5:8 Gb5:8', 'D5:8 F5:8'];

// ================================================================ Karte Welt 4 ====
// E-Dur, 128 BPM, 16 Takte, ruhig: Strophe E H cis A | E H A H (Western-Pfiff singt) | Refrain A H gis cis | A H E E
// (weicher Lead, Piano auf der „und“). Kick auf 1 und 3, leise Twang-Zupfer.
const m4Prog = ['E', 'B', 'C#m', 'A', 'E', 'B', 'A', 'B', 'A', 'B', 'G#m', 'C#m', 'A', 'B', 'E', 'E'];
const m4Whistle = ['E5:2 F#5:2 G#5:4 F#5:2 E5:2 B4:4', 'D#5:2 E5:2 F#5:4 E5:2 D#5:2 B4:4', 'C#5:2 D#5:2 E5:4 D#5:2 C#5:2 G#4:4', 'C#5:2 B4:2 A4:4 B4:2 C#5:2 E5:4',
  'E5:2 F#5:2 G#5:4 F#5:2 E5:2 B4:4', 'D#5:2 E5:2 F#5:4 E5:2 D#5:2 B4:4', 'A4:2 B4:2 C#5:4 E5:2 F#5:2 E5:4', 'F#5:6 E5:2 D#5:8'];
const m4Lead = ['E5:2 F#5:2 A5:4 G#5:2 F#5:2 E5:4', 'F#5:2 G#5:2 B5:4 A5:2 G#5:2 F#5:4', 'D#5:2 E5:2 G#5:4 F#5:2 E5:2 D#5:4', 'E5:2 F#5:2 G#5:4 C#6:8',
  'E5:2 F#5:2 A5:4 G#5:2 F#5:2 E5:4', 'F#5:2 G#5:2 B5:4 A5:2 G#5:2 F#5:4', 'G#5:2 F#5:2 E5:4 B4:4 E5:4', 'E5:12 -:4'];

export const WORLD4_THEMES = {
  // Ameisen-Canyon (4-1): 138 BPM, a-Moll, 24 Takte, Western-Eurodance. Intro: der Western-Pfiff spielt die Hook über
  // Twang-Zupfer im Galopp | Strophe (a d G C | a d G E): Lead, Piano auf der „und“ | Refrain (a F G E | a F d E): Hook im
  // Galopp-Rhythmus, Stabs, leichte Marschtrommel der Ameisen | Überleitung: der Pfiff singt lange Töne.
  course_canyon: {
    bpm: 138,
    voice: {
      lead: { ...SYNTH, cutoff: 4400, volume: 0.16 },
      whistle: { type: 'sine', volume: 0.13, vibrato: 12, rate: 5.5, slide: 1, attack: 0.03, gate: 0.9 },
      arp: { type: 'sawtooth', volume: 0.05, decay: 0.09 },
      piano: { volume: 0.09, oscs: 1 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.045 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, snare: { volume: 0.11 } },
    fx: { lowpass: { arp: 2600 }, delay: { steps: 2, feedback: 0.25, lowpass: 2600, wet: 0.3, send: { arp: 0.45, whistle: 0.3, lead: 0.12 } } },
    whistle: [...caHook, ...rest(16), ...caBridge],
    lead: [...rest(4), ...caVerse, ...caChorus, ...rest(4)],
    arp: bySection(caProg, SONG, { intro: twang, verse: twang, chorus: twang }),
    piano: bySection(caProg, SONG, { verse: (c) => chordBar(c, OFF, 'G4'), chorus: (c) => chordBar(c, P332, 'G4'), bridge: (c) => chordBar(c, LONG, 'G4') }),
    stabs: bySection(caProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(caProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'E4:16'],
    bass: bySection(caProg, SONG, { intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_GALLOP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, CANYON, [K4, CL, H8, dr('s..s ..s. ssss ssss')]), ...groove(4, CANYON, [K4, CL, H8, dr('s..s ..s. .... ....'), dr('.... .... .... tttt')]),
      ...groove(4, CANYON, [K4, CL, H8, dr('s..s ..s. ssss ssss')], false), ...groove(4, [K4, CL, HH, dr('s... .... s..s ....')], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, dr('s... .... s..s ....')], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ssss ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Giftwasser-Wald (4-2, Rankenschnapper): 134 BPM, fis-Moll, 24 Takte, schleichend-giftig, aber eingängig. Intro: Piano-
  // Riff in Oktaven | Strophe (fis D E fis | fis D E Cis): Lead, gedämpfte Stabs auf der „und“ | Refrain (fis h E A |
  // fis h Cis Cis): die Hook „schleicht“ nach der Eins los, Gifttropfen (Sinus-Plucks gleiten abwärts) | Überleitung.
  course_poison: {
    bpm: 134,
    voice: {
      lead: { ...SYNTH, cutoff: 3800, volume: 0.17 },
      arp: { type: 'sine', volume: 0.08, decay: 0.09, glide: 0.55, glideTime: 0.09 },
      piano: { volume: 0.1, cutoff: 3600 },
      stabs: { volume: 0.12, cutoff: 2400, cutoffEnd: 600 },
      pad: { volume: 0.045, bright: 0.7 },
      bass: { cutoff: 650, volume: 0.19 },
      riser: { volume: 0.07 },
    },
    kit: { clap: { volume: 0.3 }, tom: { freq: 140, volume: 0.36 }, hat: { volume: 0.26, off: 0.16 } },
    fx: { delay: { steps: 3, feedback: 0.38, lowpass: 2000, wet: 0.35, send: { arp: 0.6, stabs: 0.2, lead: 0.18 } } },
    lead: [...rest(4), ...poVerse, ...poChorus, ...poBridge],
    piano: bySection(poProg, SONG, { intro: (c, i) => octaves(tr(poHook, -12))[i], chorus: (c) => chordBar(c, P332, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4') }),
    arp: bySection(poProg, SONG, { intro: drops, chorus: drops, bridge: drops }),
    stabs: bySection(poProg, SONG, { verse: (c) => chordBar(c, '..x. ...x ..x. .x..'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(poProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C#4:16'],
    bass: bySection(poProg, SONG, { intro: (c) => bassBar(c, 'L..H ..L. L.H. .H..'), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... .ttt')]), ...groove(4, [K4, CL, H8O], [K4, CL, H8O, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8O], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... .ttt')], false), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... tttt tttt')], false),
      [K4, CL, H8O, CR], [K4, CL, H8O], [K4, CL, H8O], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Piep-Block-Himmelsweg (4-3): 128 BPM, c-Moll, 24 Takte – die Musik ist die Uhr der Piep-Blöcke (Spiel-Takt siehe
  // Kopf). Intro: Piano-Riff (c As c As) | Strophe (Es As c f Es As G As): ruhiger Lead | Refrain (c As Es f c As G c):
  // Hook mit Lauf und langem Ton im Umschalt-Takt, liegendem Ton im Warn-Takt | Überleitung (Es f G As): lange Töne.
  // Kick und Holzklick auf jeder Zählzeit, Crash auf jedem Umschalten, leise Rechteck-Arpeggien im Hintergrund.
  course_beep: {
    bpm: 128,
    sync: { switchEvery: 8, warnBeats: 3 },
    voice: {
      lead: { ...SYNTH, cutoff: 3800, volume: 0.16 },
      bell: { type: 'sine', volume: 0.12, decay: 0.09, ratio: 2, partial: 0.3 },
      arp: { type: 'square', volume: 0.035, decay: 0.08 },
      piano: { volume: 0.1 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.045 },
      riser: { volume: 0.06 },
    },
    kit: { tick: { freq: 1100, volume: 0.09, decay: 0.04 }, crash: { volume: 0.12 }, clap: { volume: 0.3 }, hat: { volume: 0.26 } },
    fx: { lowpass: { arp: 3000 } },
    bell: rep(12, [BEEP_ON, BEEP_WARN]).flat(),
    lead: [...rest(4), ...bpVerse, ...bpChorus, ...bpBridge],
    piano: bySection(bpProg, SONG, { intro: (c, i) => octaves(tr([bpHook[0], bpHook[1], bpHook[0], 'C6:12 -:2 Bb5:2'], -12))[i], verse: (c) => chordBar(c, OFF, 'G4'), chorus: (c) => chordBar(c, OFF, 'G4'), bridge: (c) => chordBar(c, 'x___ ____ ____ ____', 'G4') }),
    arp: bySection(bpProg, SONG, { verse: bpArp, chorus: bpArp }),
    stabs: bySection(bpProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(bpProg, SONG, { intro: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'G3:16'],
    bass: bySection(bpProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: (c) => bassBar(c, B_PUMP) }),
    drums: rep(12, [BEEP_A, BEEP_B]).flat(),
  },

  // Trampolin-Athletik (4-4): 142 BPM, Des-Dur, 24 Takte, federnd. Intro: Piano-Riff in Oktaven, „Boing“-Zupfer (Dreieck,
  // gleiten aufwärts) auf der „und“ | Strophe (b Ges Des As ×2): punktierter Lead | Refrain (Des Ges b As | Des Ges es As):
  // Hook „hüpft“ (zwei Töne, Pause, Aufschwung), Stabs | Überleitung: lange Töne, Tom-Sprünge.
  course_bounce: {
    bpm: 142,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.1, glide: 1.5, glideTime: 0.08 },
      piano: { volume: 0.1 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.045 },
      bass: { volume: 0.17 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tom: { freq: 250, volume: 0.34 } },
    lead: [...rest(4), ...boVerse, ...boChorus, ...boBridge],
    piano: bySection(boProg, SONG, { intro: (c, i) => octaves(tr(boHook, -12))[i], verse: (c) => chordBar(c, OFF, 'F4'), chorus: (c) => chordBar(c, P332, 'F4'), bridge: (c) => chordBar(c, LONG, 'F4') }),
    arp: bySection(boProg, SONG, { intro: boing, chorus: boing, bridge: boing }),
    stabs: bySection(boProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(boProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'Ab3:16'],
    bass: bySection(boProg, SONG, { intro: (c) => bassBar(c, B_BOUNCE), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_BOUNCE), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... t.t.')]), ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... t.t. t.t.')], false), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... t.t. t.t.')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Ruinenstadt (4-5): 132 BPM, d-Moll, 24 Takte, geheimnisvoll, aber singbar. Intro: die Flöte (Dreieck mit Vibrato)
  // spielt die Hook über Harfen-Zupfern | Strophe (d B F C | d B g A): Lead, Stammes-Toms | Refrain (d g C F | d g A A,
  // i–iv–VII–III): Hook mit langem Ton und stufenweisem Abstieg | Überleitung: die Flöte singt lange Töne, Riser.
  course_ruins: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4000, volume: 0.16 },
      whistle: { type: 'triangle', volume: 0.15, vibrato: 14, rate: 5, slide: 1, attack: 0.04, gate: 0.92 },
      arp: { type: 'triangle', volume: 0.06, decay: 0.18 },
      piano: { volume: 0.09 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.05, bright: 0.8 },
      bass: { cutoff: 650 },
      riser: { volume: 0.07 },
    },
    kit: { clap: { volume: 0.3 }, tom: { freq: 150, volume: 0.32 }, hat: { volume: 0.26, off: 0.16 } },
    fx: { delay: { steps: [3, 4], feedback: 0.35, lowpass: 2600, wet: 0.3, send: { arp: 0.45, whistle: 0.35, lead: 0.15, tom: 0.12 } } },
    whistle: [...ruHook, ...rest(16), ...ruBridge],
    lead: [...rest(4), ...ruVerse, ...ruChorus, ...rest(4)],
    arp: bySection(ruProg, SONG, { intro: harp, verse: harp, bridge: harp }),
    piano: bySection(ruProg, SONG, { verse: (c) => chordBar(c, OFF, 'F4'), chorus: (c) => chordBar(c, P332, 'F4') }),
    stabs: bySection(ruProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: ruProg.map((c) => padBar(c)),
    riser: [...rest(23), 'E3:16'],
    bass: bySection(ruProg, SONG, { intro: (c) => bassBar(c, 'L__H __L_ L___ H___'), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP), bridge: BREAK_BASS }),
    drums: [
      ...groove(4, RUINS, [K4, CL, H8, dr('t.t. ..t. tttt tttt')]), ...groove(4, RUINS, [K4, CL, H8, dr('t.t. ..t. .tt. tttt')]),
      ...groove(4, RUINS, [K4, CL, H8, dr('t.t. ..t. tttt tttt')], false), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... tttt tttt')], false),
      [...RUINS, CR], RUINS, RUINS, [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Lavafelsen-Burg (4-Burg, Boss Lavafelsen-König): 148 BPM, es-Moll, 24 Takte, dramatisch. Intro: die Burg-Orgel spielt
  // die Hook über harten Stabs | Strophe (es es as B | es es Ces B): Lead, Orgel auf der „und“ | Refrain (es Ces Des B |
  // es Ces as B): heroische Hook (Tonwiederholung, Dreiklang zur Oktave), Galopp-Bass, Stabs | Überleitung: Orgel-Akkorde,
  // lange Töne, Hoover-Riser über zwei Takte.
  course_lavacastle: {
    bpm: 148,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.17 },
      organ: { volume: 0.05, cutoff: 2600 },
      stabs: { volume: 0.14, cutoff: 6500, cutoffEnd: 1800 },
      piano: { volume: 0.09 },
      pad: { volume: 0.045 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.52 }, clap: { volume: 0.3 }, tom: { freq: 140, volume: 0.4 }, snare: { volume: 0.26 } },
    lead: [...rest(4), ...lvVerse, ...lvChorus, ...lvBridge],
    organ: bySection(lvProg, SONG, { intro: (c, i) => tr(lvHook, -12)[i], verse: (c) => chordBar(c, OFF, 'Gb3'), bridge: (c) => chordBar(c, LONG, 'Gb3') }),
    stabs: bySection(lvProg, SONG, {
      intro: (c) => chordBar(c, 'x..x ..x. ..x. x...', 'G3'),
      chorus: (c) => chordBar(c, 'x... .... x... ....', 'G3'),
      bridge: (c) => chordBar(c, 'x.xx .x.x x.xx .x..', 'G3'),
    }),
    piano: bySection(lvProg, SONG, { chorus: (c) => chordBar(c, OFF, 'F4') }),
    pad: bySection(lvProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c) }),
    riser: [...rest(22), 'Bb3:16', 'Eb4:14 -:2'],
    bass: bySection(lvProg, SONG, { intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_GALLOP), bridge: (c, i) => bassBar(c, i < 3 ? B_GALLOP : 'L.H_ L.H_ .... ....') }),
    drums: [
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]), ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, dr('h.h. h.h. hh.. ....'), dr('.... .... ..ss ssss')], false), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, dr('..s. ..s. ..s. ..s.')], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Weltkarte Welt 4: 128 BPM, E-Dur, 16 Takte, ruhige Ballade. Strophe (E H cis A | E H A H): der Western-Pfiff singt,
  // Twang-Zupfer auf der „und“ | Refrain (A H gis cis | A H E E): weicher Lead, Piano auf der „und“. Kick auf 1 und 3.
  course_world4_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3000, volume: 0.19 },
      whistle: { type: 'sine', volume: 0.15, vibrato: 10, rate: 5.2, slide: 1 },
      arp: { type: 'sawtooth', volume: 0.045, decay: 0.08 },
      piano: { volume: 0.1 },
      pad: { volume: 0.05 },
      bass: { cutoff: 650 },
    },
    fx: { lowpass: { arp: 2400 }, delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.3, send: { whistle: 0.3, lead: 0.2, arp: 0.4 } } },
    whistle: [...m4Whistle, ...rest(8)],
    lead: [...rest(8), ...m4Lead],
    arp: m4Prog.map((c, i) => (i < 8 ? chordBar(c, '..x. ..x. ..x. ..x.', 'E3') : '-:16')),
    piano: [...rest(8), ...m4Prog.slice(8).map((c) => chordBar(c, OFF, 'E4'))],
    pad: m4Prog.map((c) => padBar(c)),
    bass: m4Prog.map((c) => bassBar(c, B_HALF)),
    drums: [[KH, CL, H8O, CR], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, dr('h.h. h.h. h.h. hhhh')], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, dr('h.h. h.h. hhhh hhhh')],
      [KH, CL, H8O, CR], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, dr('h.h. h.h. h.h. hhhh')], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, dr('h.h. h.h. hhhh hhhh')]],
  },
};
