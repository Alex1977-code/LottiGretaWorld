// Kurs-Themen Welt 2 „Wüste mit Sandblöcken“ – eigene Kompositionen im Stil des 90er-Eurodance
// (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.
//
// Analyse der ersten Fassung (Rückmeldung des Auftraggebers: „nicht melodisch“): Die Themen bauten auf
// Modi und Farbskalen statt auf Dur/Moll-Harmonik (Wüste D-Hidschas mit übermäßiger Sekunde, Weltraum
// E-Lydisch, Karte mit phrygischer bII), auf Motiven und Ostinati statt auf Liedmelodien (Wüsten-Rufmotiv,
// Pizzicato-Ostinato im Schattenspiel, Uhr-Ostinato im Haus) und auf Satztechnik statt Hook (Spiegelfrucht als
// vierstimmiger Kanon, Schatten-Melodie mit Echo-Stimme). Der Lead spielte meist nur 4–8 von 16 Takten, oft in
// großen Sprüngen (Glocken in Dezimen, Oktavsprung-Hook) oder liegenden Einzeltönen; einen wiederkehrenden,
// singbaren Refrain gab es kaum.
//
// Neufassung nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md), Maßstab Welt 1: jedes Thema ist ein Lied in
// Dur oder Moll – Intro (Riff = Refrain-Hook auf Piano/Glocke/Stabs) → Strophe (tiefer, ruhiger) → Refrain
// (höher, zweitaktige Hook A A' A A'') → Überleitung (Breakdown, lange Lead-Töne, Riser) –, Akkordfolgen der
// Eurodance-Zeit, Lead-Synth (Supersaw ohne Hoover-Brummen) trägt die Melodie fast durchgehend, Off-Beat-Stabs,
// Rave-Piano, Pad, Oktav-Bass, Four-on-the-floor. Der Welt-Charakter kommt nur aus Klangfarben und Percussion.

import {
  dr, K4, KH, CL, HH, H8, H8O, CR, rep, rest, tr, octaves, chordBar, bassBar, padBar, pat, voicing,
  B_BOUNCE, B_PUMP, B_GALLOP, B_HALF, form, bySection, groove,
} from './themeParts.js';

// Lead-Synth: Supersaw ohne Oktave darunter, kaum Tonhöhen-Slide (der Hoover bleibt Akzent: Riser)
const SYNTH = { sub: false, bend: 0.985, detune: 10 };
// Begleit-Raster
const OFF = '..x_ ..x_ ..x_ ..x_';      // Akkorde auf jeder „und“
const P332 = 'x__x __x_ x__x __x_';     // Rave-Piano 3-3-2
const ST24 = '.... ..x_ .... ..x_';     // Stabs auf 2+ und 4+
const LONG = 'x_______ x_______';       // Breakdown: halbe Noten
const SONG = form({ intro: 4, verse: 8, chorus: 8, bridge: 4 });

// ================================================================ Wüste ====
// h-Moll, 136 BPM. Intro Hm G D A | Strophe Hm A G Fis ×2 | Refrain Hm G D A | Hm G Em Fis | Überleitung G A Hm Fis.
const desProg = ['Bm', 'G', 'D', 'A', ...rep(2, ['Bm', 'A', 'G', 'F#']).flat(), 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#', 'G', 'A', 'Bm', 'F#'];
// Hook: 3-3-2-Abstieg, Pause, Achtel-Aufstieg („Ha – ha – ho, da da da“)
const desHook = [
  'B5:3 A5:3 F#5:2 -:2 D5:2 E5:2 F#5:2', 'G5:3 F#5:3 D5:2 -:2 B4:2 D5:2 E5:2',
  'A5:3 G5:3 F#5:2 -:2 D5:2 E5:2 F#5:2', 'E5:3 C#5:3 A4:2 -:2 C#5:2 E5:2 A5:2',
];
const desChorus = [...desHook, desHook[0], desHook[1], 'G5:3 F#5:3 E5:2 -:2 B4:2 C#5:2 D5:2', 'F#5:6 E5:2 C#5:4 A#4:4'];
const desV = ['D5:2 C#5:2 D5:2 F#5:4 E5:2 D5:2 C#5:2', 'E5:4 C#5:2 A4:4 -:2 B4:2 C#5:2', 'D5:2 B4:2 D5:2 G5:4 F#5:2 E5:2 D5:2'];
const desVerse = [...desV, 'C#5:4 A#4:2 F#4:6 -:2 C#5:1 D5:1', ...desV, 'A#4:2 C#5:2 E5:2 F#5:6 -:2 A5:2'];
const desBridge = ['G5:6 F#5:2 E5:8', 'F#5:6 E5:2 C#5:8', 'D5:6 C#5:2 B4:8', 'A#4:4 C#5:4 F#5:4 -:4'];
// Darbuka (Doum/Tek) statt Hi-Hats, Schellenkranz im Refrain
const DOUM = dr('...d ..d. ...d ..d.'), TEK = dr('..p. ...p ..p. .p.p');
const DES = [K4, CL, DOUM, TEK];
const DES_C = [K4, CL, DOUM, TEK, dr('..j. ..j. ..j. ..j.')];
const DES_FILL = [K4, CL, dr('...d ..d. .... ....'), dr('..p. ...p pp.p pppp')];

// ================================================================ Weltraum ====
// E-Dur, 132 BPM. Intro E H cis A (Glocken spielen die Hook) | Strophe cis A E H ×2 | Refrain E H cis A | E H A H |
// Überleitung cis A E H.
const spProg = ['E', 'B', 'C#m', 'A', ...rep(2, ['C#m', 'A', 'E', 'B']).flat(), 'E', 'B', 'C#m', 'A', 'E', 'B', 'A', 'B', 'C#m', 'A', 'E', 'B'];
// Hook: Aufschwung zum langen Ton, sanfter Abstieg („schwerelos“)
const spHook = ['E5:2 F#5:2 G#5:6 B5:2 G#5:2 F#5:2', 'F#5:2 G#5:2 F#5:4 D#5:4 B4:4', 'E5:2 F#5:2 G#5:6 C#6:2 B5:2 G#5:2', 'A5:4 G#5:2 F#5:2 E5:8'];
const spChorus = [...spHook, spHook[0], spHook[1], 'A5:2 B5:2 C#6:6 B5:2 A5:2 G#5:2', 'F#5:4 G#5:2 A5:2 B5:8'];
const spV = ['C#5:3 B4:1 C#5:2 E5:2 -:2 C#5:2 B4:2 G#4:2', 'A4:3 G#4:1 A4:2 C#5:2 -:2 E5:2 C#5:2 A4:2', 'G#4:3 F#4:1 G#4:2 B4:2 -:2 E5:2 D#5:2 B4:2'];
const spVerse = [...spV, 'D#5:6 C#5:2 B4:4 F#4:4', ...spV, 'B4:2 C#5:2 D#5:2 E5:2 F#5:4 -:2 D#5:2'];
const spBridge = ['G#5:8 E5:8', 'A5:8 C#6:8', 'B5:8 G#5:8', 'F#5:12 -:4'];
const spSpark = (c) => pat(voicing(c, 'E5').split('+'), '0.1. 2.1. 0.1. 2.1.');
const SPACE = [K4, CL, H8O];
const SPACE_C = [K4, CL, HH];

// ================================================================ Schattenspiel ====
// g-Moll, 134 BPM. Intro g c F B | Strophe g Es F D ×2 | Refrain g c F B | g c D D | Überleitung Es F g D.
// Hook auf Zehenspitzen: „tipp . tipp . tapp tapp“, dieselbe Figur tiefer als Antwort; der „Schatten“ ist ein Echo
// (punktierte Achtel) auf dem gedämpften Lead.
const shProg = ['Gm', 'Cm', 'F', 'Bb', ...rep(2, ['Gm', 'Eb', 'F', 'D']).flat(), 'Gm', 'Cm', 'F', 'Bb', 'Gm', 'Cm', 'D', 'D', 'Eb', 'F', 'Gm', 'D'];
const shHook = [
  'G5:1 -:1 G5:1 -:1 F5:2 D5:2 Bb4:1 -:1 Bb4:1 -:1 C5:2 D5:2', 'Eb5:1 -:1 Eb5:1 -:1 D5:2 C5:2 G4:1 -:1 G4:1 -:1 A4:2 Bb4:2',
  'F5:1 -:1 F5:1 -:1 Eb5:2 C5:2 A4:1 -:1 A4:1 -:1 Bb4:2 C5:2', 'D5:3 C5:1 Bb4:2 D5:2 F5:6 -:2',
];
const shChorus = [...shHook, shHook[0], shHook[1], 'F#5:1 -:1 F#5:1 -:1 G5:2 A5:2 D5:1 -:1 D5:1 -:1 C5:2 A4:2', 'D5:4 A4:4 F#4:4 -:2 G4:1 A4:1'];
const shV = ['D5:4 Bb4:2 G4:2 A4:2 Bb4:2 C5:2 D5:2', 'Eb5:4 D5:2 C5:2 Bb4:4 G4:4', 'C5:4 A4:2 F4:2 G4:2 A4:2 Bb4:2 C5:2'];
const shVerse = [...shV, 'D5:4 C5:2 A4:2 F#4:8', ...shV, 'A4:2 C5:2 D5:2 F#5:2 A5:4 -:2 F#5:2'];
const shBridge = ['Bb4:6 C5:2 Eb5:8', 'C5:6 D5:2 F5:8', 'D5:6 F5:2 G5:8', 'F#5:8 A5:4 -:4'];
const SHADOW = [K4, CL, H8O];

// ================================================================ Rollhügel ====
// F-Dur, 144 BPM. Intro F C d B (Glockenspiel spielt die Hook) | Strophe d B F C ×2 | Refrain F C d B | F C B C |
// Überleitung B C d C. Hüpfende, punktierte Hook; Tom-Rollen am Phrasenende („rollende Hügel“).
const hiProg = ['F', 'C', 'Dm', 'Bb', ...rep(2, ['Dm', 'Bb', 'F', 'C']).flat(), 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Bb', 'C', 'Dm', 'C'];
const hiHook = ['C5:3 F5:1 -:2 F5:2 G5:3 A5:1 -:2 F5:2', 'G5:3 E5:1 -:2 C5:2 D5:3 E5:1 -:2 C5:2', 'A5:3 F5:1 -:2 D5:2 E5:3 F5:1 -:2 A5:2', 'Bb5:3 A5:1 G5:2 F5:2 D5:4 -:2 C5:2'];
const hiChorus = [...hiHook, hiHook[0], hiHook[1], 'D5:3 F5:1 -:2 Bb5:2 A5:3 G5:1 -:2 F5:2', 'G5:3 A5:1 G5:2 E5:2 C5:6 -:2'];
const hiV = ['D5:2 E5:2 F5:2 E5:2 D5:4 A4:4', 'Bb4:2 C5:2 D5:2 C5:2 Bb4:4 F4:4', 'C5:2 D5:2 E5:2 F5:2 G5:4 A5:4'];
const hiVerse = [...hiV, 'G5:6 F5:2 E5:4 C5:4', ...hiV, 'E5:2 F5:2 G5:2 A5:2 Bb5:4 G5:4'];
const hiBridge = ['F5:6 D5:2 Bb4:8', 'G5:6 E5:2 C5:8', 'A5:6 F5:2 D5:8', 'G5:6 A5:2 Bb5:4 C6:4'];
const ROLL = (fill) => [K4, CL, dr('hhoh hhoh hhoh hh..'), dr(fill)];

// ================================================================ Spiegelfrucht ====
// A-Dur, 138 BPM. Intro D E cis fis | Strophe A fis D E ×2 | Refrain D E cis fis | D E A A (IV–V–iii–vi) |
// Überleitung fis D E E: der Lead singt, das Glockenspiel antwortet als „Klon“ mit derselben Phrase.
const chProg = ['D', 'E', 'C#m', 'F#m', ...rep(2, ['A', 'F#m', 'D', 'E']).flat(), 'D', 'E', 'C#m', 'F#m', 'D', 'E', 'A', 'A', 'F#m', 'D', 'E', 'E'];
const chHook = ['F#5:1 A5:1 D6:2 C#6:2 A5:2 -:2 B5:2 A5:2 F#5:2', 'E5:1 G#5:1 B5:2 A5:2 G#5:2 -:2 A5:2 G#5:2 E5:2',
  'C#5:1 E5:1 G#5:2 B5:2 C#6:2 -:2 B5:2 G#5:2 E5:2', 'F#5:1 A5:1 C#6:2 B5:2 A5:2 G#5:2 F#5:2 E5:4'];
const chChorus = [...chHook, chHook[0], chHook[1], 'C#6:1 D6:1 E6:2 C#6:2 A5:2 -:2 B5:2 C#6:2 A5:2', 'A5:8 E5:4 C#5:4'];
const chV = ['C#5:2 E5:2 A5:2 G#5:2 A5:4 E5:4', 'C#5:2 F#5:2 A5:2 G#5:2 F#5:4 C#5:4', 'D5:2 F#5:2 A5:2 B5:2 A5:2 F#5:2 D5:2 F#5:2'];
const chVerse = [...chV, 'E5:4 G#5:4 B5:6 -:2', ...chV, 'B5:4 G#5:2 E5:2 F#5:2 G#5:2 A5:2 -:2'];
const chCall = ['C#6:4 A5:4 F#5:8', 'B5:4 G#5:4 E5:8'];

// ================================================================ Panzerzug ====
// f-Moll, 140 BPM. Intro f Des As Es (Blech-Stabs im Hook-Rhythmus, Marschtrommel) | Strophe f b Es As | f b Es C |
// Refrain f Des As Es | f Des Es C | Überleitung Des Es f C. Punktierte Marsch-Hook.
const taProg = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Bbm', 'Eb', 'Ab', 'Fm', 'Bbm', 'Eb', 'C', 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Eb', 'C', 'Db', 'Eb', 'Fm', 'C'];
const taHook = ['C5:2 F5:2 F5:3 G5:1 Ab5:4 G5:2 F5:2', 'Ab5:2 F5:2 Db5:3 Eb5:1 F5:4 Eb5:2 Db5:2', 'Eb5:2 Ab5:2 Ab5:3 Bb5:1 C6:4 Bb5:2 Ab5:2', 'Bb5:3 G5:1 Eb5:2 G5:2 Bb5:4 -:4'];
const taChorus = [...taHook, taHook[0], taHook[1], 'Eb5:2 G5:2 G5:3 Ab5:1 Bb5:4 Ab5:2 G5:2', 'G5:4 E5:4 C5:4 -:2 C5:1 C5:1'];
const taV = ['F4:2 Ab4:2 C5:4 Bb4:2 Ab4:2 F4:4', 'F4:2 Bb4:2 Db5:4 C5:2 Bb4:2 F4:4', 'G4:2 Bb4:2 Eb5:4 F5:2 Eb5:2 Bb4:4'];
const taVerse = [...taV, 'Eb5:3 Db5:1 C5:2 Bb4:2 Ab4:4 -:4', ...taV, 'C5:2 E5:2 G5:4 F5:2 E5:2 C5:4'];
const taBridge = ['Ab5:8 F5:8', 'Bb5:8 G5:8', 'C6:8 Ab5:8', 'G5:4 E5:4 C5:8'];
const MARCH = [K4, CL, dr('..h. ..h. ..h. ..h.'), dr('s..s s.s. s..s ss.s')];
const MARCH_C = [K4, CL, HH, dr('.... s... .... s...')]; // Refrain: Snare zum Clap auf 2 und 4

// ================================================================ Prüfungs-Haus ====
// d-Moll, 172 BPM, 8 Takte (ein Raum = 10 s): d B C A | d B g A – rennende Achtel-Melodie über Uhr-Ticken.
const hoProg = ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'Gm', 'A'];
const hoLead = [
  'D5:2 E5:2 F5:2 D5:2 A5:4 G5:2 F5:2', 'D5:2 E5:2 F5:2 G5:2 Bb5:4 A5:2 G5:2', 'E5:2 F5:2 G5:2 A5:2 C6:4 Bb5:2 A5:2', 'C#6:2 Bb5:2 A5:2 G5:2 F5:2 E5:2 C#5:2 E5:2',
  'D5:2 E5:2 F5:2 D5:2 A5:4 G5:2 F5:2', 'D5:2 E5:2 F5:2 G5:2 Bb5:4 A5:2 G5:2', 'Bb5:2 A5:2 G5:2 D5:2 Bb4:2 D5:2 G5:2 Bb5:2', 'A5:4 E5:2 C#5:2 A4:4 -:4',
];
const TICK = dr('x.x. x.x. x.x. x.x.');

// ================================================================ Karte Welt 2 ====
// G-Dur, 128 BPM, 16 Takte, ruhige Eurodance-Ballade: Strophe G D e C | G D C D (Piano-Melodie) |
// Refrain e C G D | e C a D (weicher Lead). Kick auf 1 und 3, leise Darbuka.
const m2Prog = ['G', 'D/F#', 'Em', 'C', 'G', 'D', 'C', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D'];
const m2Piano = [
  'B4:2 D5:2 G5:4 F#5:2 E5:2 D5:4', 'A4:2 D5:2 F#5:4 E5:2 D5:2 A4:4', 'B4:2 E5:2 G5:4 F#5:2 E5:2 B4:4', 'C5:2 E5:2 G5:4 A5:2 G5:2 E5:4',
  'B4:2 D5:2 G5:4 F#5:2 E5:2 D5:4', 'A4:2 D5:2 F#5:4 A5:2 G5:2 F#5:4', 'G5:2 E5:2 C5:4 E5:2 D5:2 C5:4', 'D5:4 E5:2 F#5:2 A5:8',
];
const m2Lead = ['B5:6 A5:2 G5:4 E5:4', 'G5:6 F#5:2 E5:4 C5:4', 'D5:2 G5:2 B5:4 A5:2 G5:2 D5:4', 'F#5:6 E5:2 D5:4 A4:4',
  'B5:6 A5:2 G5:4 E5:4', 'G5:6 F#5:2 E5:4 C5:4', 'C5:2 E5:2 A5:4 G5:2 E5:2 C5:4', 'D5:4 F#5:4 A5:8'];
const W2MAP = [KH, CL, dr('d... .... d... ....'), dr('..p. ..p. ..p. .pp.'), H8O];

export const WORLD2_THEMES = {
  // Wüstenschlucht (2-1): 136 BPM, h-Moll, 24 Takte. Intro: das Piano spielt die Refrain-Hook eine Oktave tiefer
  // über Stabs und Oktav-Pump | Strophe (Hm A G Fis, andalusische Kadenz): Lead in der Mittellage, eine Oud-artige
  // Sägezahn-Zupfe spielt gebrochene Akkorde auf der „und“ | Refrain (Hm G D A | Hm G Em Fis): Hook im
  // 3-3-2-Rhythmus, Stabs auf 2+ und 4+, Rave-Piano 3-3-2, Schellenkranz | Überleitung: lange Lead-Töne, Riser.
  // Wüstenfarbe nur über Darbuka (Doum/Tek statt Hi-Hats), Oud-Zupfe und Schellen.
  course_desert: {
    bpm: 136,
    voice: {
      lead: { ...SYNTH, cutoff: 4200, volume: 0.16 },
      piano: { volume: 0.1 },
      arp: { type: 'sawtooth', volume: 0.055, decay: 0.13 },
      stabs: { volume: 0.12 },
      pad: { volume: 0.045, bright: 0.8 },
      bass: { cutoff: 760 },
      riser: { volume: 0.08 },
    },
    kit: { doum: { volume: 0.34, freq: 98 }, tek: { volume: 0.2, off: 0.75 }, jingle: { volume: 0.2, off: 0.14 }, clap: { volume: 0.32 } },
    fx: {
      lowpass: { arp: 2600 },
      delay: { steps: 3, feedback: 0.3, lowpass: 2500, wet: 0.3, send: { arp: 0.45, lead: 0.2, tek: 0.15 } },
    },
    lead: [...rest(4), ...desVerse, ...desChorus, ...desBridge],
    piano: bySection(desProg, SONG, {
      intro: (c, i) => octaves(tr(desHook, -12))[i],
      chorus: (c) => chordBar(c, P332, 'F#4'),
      bridge: (c) => chordBar(c, LONG, 'F#4'),
    }),
    arp: bySection(desProg, SONG, { verse: (c) => pat(voicing(c, 'F#4').split('+'), '..0. ..1. ..2. ..1.') }),
    stabs: bySection(desProg, SONG, { intro: (c) => chordBar(c, '...x ..x_ ...x ....'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(desProg, SONG, { verse: (c) => padBar(c, 'D3'), chorus: (c) => padBar(c, 'D3'), bridge: (c) => padBar(c, 'D3') }),
    riser: [...rest(23), 'F#3:16'],
    bass: bySection(desProg, SONG, {
      intro: (c) => bassBar(c, B_PUMP),
      verse: (c) => bassBar(c, B_BOUNCE),
      chorus: (c) => bassBar(c, B_PUMP),
      bridge: (c, i) => bassBar(c, i < 3 ? B_HALF : 'L_H_ L_H_ ____ ____'),
    }),
    drums: [
      ...groove(4, DES, DES_FILL), ...groove(4, DES, DES_FILL), ...groove(4, DES, DES_FILL, false),
      ...groove(4, DES_C, DES_FILL), ...groove(4, DES_C, DES_FILL, false),
      [K4, CL, DOUM, CR], [K4, CL, DOUM], [K4, CL, DOUM, TEK], [K4, dr('.... c... .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Weltraum (2-2): 132 BPM, E-Dur, 24 Takte. Intro: Glocken spielen die Hook über E H cis A | Strophe (cis A E H):
  // Lead in der Mittellage, Piano auf der „und“ | Refrain (E H cis A | E H A H, I–V–vi–IV): Hook mit Aufschwung
  // zum langen Ton, leise Dreieck-Arpeggien und Glocken-Hall im Hintergrund | Überleitung: lange, hohe Lead-Töne.
  // Weltraumfarbe über Glocken, Arpeggien und den langen Hall (punktierte Achtel + punktierte Viertel).
  course_space: {
    bpm: 132,
    voice: {
      lead: { ...SYNTH, cutoff: 4000, volume: 0.16 },
      bell: { volume: 0.1, decay: 0.7, ratio: 2.76, partial: 0.3 },
      arp: { type: 'triangle', volume: 0.06, decay: 0.14 },
      piano: { volume: 0.095, cutoff: 4200 },
      pad: { volume: 0.055, bright: 1.2 },
      stabs: { volume: 0.11 },
      bass: { cutoff: 700 },
      riser: { volume: 0.07 },
    },
    kit: { clap: { volume: 0.32 }, hat: { volume: 0.26, off: 0.17 }, open: { volume: 0.18 } },
    fx: { delay: { steps: [3, 6], feedback: 0.45, lowpass: 3200, wet: 0.4, send: { bell: 0.6, arp: 0.5, lead: 0.22, pad: 0.2, clap: 0.2 } } },
    lead: [...rest(4), ...spVerse, ...spChorus, ...spBridge],
    bell: [...tr(spHook, 12), ...rest(20)],
    arp: bySection(spProg, SONG, { chorus: spSpark, bridge: spSpark }),
    piano: bySection(spProg, SONG, { intro: (c) => chordBar(c, OFF, 'G#4'), verse: (c) => chordBar(c, OFF, 'G#4'), chorus: (c) => chordBar(c, P332, 'G#4') }),
    stabs: bySection(spProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(spProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'B3:16'],
    bass: bySection(spProg, SONG, {
      intro: (c) => bassBar(c, B_HALF),
      verse: (c) => bassBar(c, B_BOUNCE),
      chorus: (c) => bassBar(c, B_PUMP),
      bridge: (c, i) => bassBar(c, i < 3 ? B_HALF : 'L_H_ L_H_ ____ ____'),
    }),
    drums: [
      ...groove(4, SPACE, [K4, CL, dr('h.h. h.h. hhhh hhhh')]), ...groove(4, SPACE, [K4, CL, H8O, dr('.... .... .... .ttt')]),
      ...groove(4, SPACE, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... ssss')], false),
      ...groove(4, SPACE_C, [K4, CL, HH, dr('.... .... .... .ttt')]), ...groove(4, SPACE_C, [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')], false),
      [KH, CL, H8O, CR], [KH, CL, H8O], [K4, CL, H8O], [K4, dr('.... c... .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Schattenspiel (2-3, unterirdisch): 134 BPM, g-Moll, 24 Takte. Intro: das Piano spielt die Hook staccato eine
  // Oktave tiefer | Strophe (g Es F D): Lead in der Mittellage, Pizzicato-Zupfer auf der „und“ | Refrain (g c F B |
  // g c D D, i–iv–VII–III): Hook auf Zehenspitzen mit „Schatten“ (Echo eine punktierte Achtel später) | Überleitung
  // (Es F g D): aufsteigende lange Töne. Gedämpfte Klangfarben (Tiefpass), die Melodie bleibt vorn.
  course_shadow: {
    bpm: 134,
    voice: {
      lead: { ...SYNTH, cutoff: 2600, volume: 0.18, q: 2 },
      piano: { volume: 0.11, cutoff: 3200, cutoffEnd: 1100 },
      arp: { type: 'triangle', volume: 0.09, decay: 0.07 },
      stabs: { volume: 0.12, cutoff: 3000, cutoffEnd: 900 },
      pad: { volume: 0.045, bright: 0.65 },
      bass: { cutoff: 600, volume: 0.2 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { pitchStart: 120, click: 0.1, volume: 0.52 }, clap: { volume: 0.26 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 130, volume: 0.32 } },
    fx: {
      lowpass: { stabs: 1900 },
      delay: { steps: 3, feedback: 0.3, lowpass: 1800, wet: 0.4, send: { lead: 0.35, arp: 0.3, clap: 0.35 } },
    },
    lead: [...rest(4), ...shVerse, ...shChorus, ...shBridge],
    piano: bySection(shProg, SONG, {
      intro: (c, i) => octaves(tr(shHook, -12))[i],
      chorus: (c) => chordBar(c, P332, 'F4'),
      bridge: (c) => chordBar(c, LONG, 'F4'),
    }),
    arp: bySection(shProg, SONG, { verse: (c) => pat(voicing(c, 'G4').split('+'), '..0. ..1. ..2. ..1.') }),
    stabs: bySection(shProg, SONG, { intro: (c) => chordBar(c, '..x. ..x. ..x. ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(shProg, SONG, { verse: (c) => padBar(c, 'D3'), chorus: (c) => padBar(c, 'D3'), bridge: (c) => padBar(c, 'D3') }),
    riser: [...rest(23), 'D4:16'],
    bass: bySection(shProg, SONG, {
      intro: (c) => bassBar(c, 'L_.. H_.. L_.. H_..'),
      verse: (c) => bassBar(c, B_BOUNCE),
      chorus: (c) => bassBar(c, B_PUMP),
      bridge: (c, i) => bassBar(c, i < 3 ? B_HALF : 'L_H_ L_H_ ____ ____'),
    }),
    drums: [
      ...groove(4, SHADOW, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... .ttt')]),
      ...groove(4, SHADOW, [K4, CL, H8O, dr('.... .... .... tttt')]), ...groove(4, SHADOW, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... .ttt')], false),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')]), ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..tt tttt')], false),
      [K4, CL, H8O, CR], [K4, CL, H8O], [K4, CL, H8O], [K4, dr('.... c... .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Rollhügel (2-4): 144 BPM, F-Dur, 24 Takte, fröhlich-hüpfend. Intro: Glockenspiel spielt die Hook (F C d B) über
  // Piano-Offbeats | Strophe (d B F C): Lead in Achteln, Piano 3-3-2 | Refrain (F C d B | F C B C): punktierte
  // Hook („hüpf – hüpf“), Stabs auf 2+ und 4+, Tom-Rollen am Phrasenende | Überleitung: lange Töne, Riser.
  course_hills: {
    bpm: 144,
    voice: {
      lead: { ...SYNTH, cutoff: 5000, volume: 0.16 },
      bass: { volume: 0.16 },
      piano: { volume: 0.1 },
      bell: { volume: 0.1, decay: 0.35, ratio: 2.76, partial: 0.4 },
      stabs: { volume: 0.12 },
      pad: { volume: 0.045 },
      riser: { volume: 0.08 },
    },
    kit: { kick: { volume: 0.5 }, clap: { volume: 0.3 }, tom: { freq: 230, volume: 0.36 } },
    lead: [...rest(4), ...hiVerse, ...hiChorus, ...hiBridge],
    bell: [...tr(hiHook, 12), ...rest(20)],
    piano: bySection(hiProg, SONG, { intro: (c) => chordBar(c, '..x_ ..x_ ..x_ .xx_', 'F4'), verse: (c) => chordBar(c, P332, 'F4'), chorus: (c) => chordBar(c, OFF, 'F4'), bridge: (c) => chordBar(c, LONG, 'F4') }),
    stabs: bySection(hiProg, SONG, { chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(hiProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(hiProg, SONG, {
      intro: (c) => bassBar(c, B_BOUNCE), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_BOUNCE),
      bridge: (c, i) => bassBar(c, i < 3 ? B_HALF : 'L__H L_H_ ____ ____'),
    }),
    drums: [
      ...groove(4, [K4, CL, HH], ROLL('.... .... .... ..tt')), ...groove(4, [K4, CL, HH], ROLL('.... .... .... tttt')),
      ...groove(4, [K4, CL, HH], ROLL('.... .... .... tttt'), false), ...groove(4, [K4, CL, HH], ROLL('.... .... t.t. tttt')),
      ...groove(4, [K4, CL, HH], ROLL('.... .... .... tttt'), false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Spiegelfrucht-Pass (2-5, rosa Grasland): 138 BPM, A-Dur, 24 Takte, verspielt. Intro: das Piano spielt die Hook
  // (D E cis fis) | Strophe (A fis D E): Lead mit Dreiklang-Aufgängen, Orgel auf der „und“ | Refrain (D E cis fis |
  // D E A A, IV–V–iii–vi): Hook mit Sechzehntel-Auftakt | Überleitung: der Lead singt eine Phrase, das Glockenspiel
  // antwortet als „Klon“ mit derselben Phrase (Spiegelfrucht).
  course_cherry: {
    bpm: 138,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.15 },
      piano: { volume: 0.1, cutoff: 4500 },
      bell: { volume: 0.075, decay: 0.45, ratio: 2.76, partial: 0.3 },
      organ: { volume: 0.035, cutoff: 2600 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.045 },
      riser: { volume: 0.07 },
    },
    kit: { tom: { freq: 240, volume: 0.3 }, hat: { volume: 0.28, off: 0.17 } },
    fx: { delay: { steps: 3, feedback: 0.28, lowpass: 3500, wet: 0.28, send: { bell: 0.45, lead: 0.15 } } },
    lead: [...rest(4), ...chVerse, ...chChorus, chCall[0], '-:16', chCall[1], '-:16'],
    bell: [...rest(21), chCall[0], '-:16', chCall[1].replace('E5:8', 'E5:4 -:4')],
    piano: bySection(chProg, SONG, {
      intro: (c, i) => octaves(tr(chHook, -12))[i],
      chorus: (c) => chordBar(c, P332, 'F#4'),
      bridge: (c) => chordBar(c, LONG, 'F#4'),
    }),
    organ: bySection(chProg, SONG, { verse: (c) => chordBar(c, OFF, 'G#4') }),
    stabs: bySection(chProg, SONG, { intro: (c) => chordBar(c, ST24), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(chProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'E4:16'],
    bass: bySection(chProg, SONG, {
      intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_BOUNCE), chorus: (c) => bassBar(c, B_PUMP),
      bridge: (c, i) => bassBar(c, i < 3 ? B_HALF : 'L_H_ L_H_ ____ ____'),
    }),
    drums: [
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... .... ..tt')]), ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... .ttt')], false), ...groove(4, [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... ssss')], false),
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, H8], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Panzerzug (2-Panzer, Autoscroller + Boss Wirbelbrocken): 140 BPM, f-Moll, 24 Takte, marschierend. Intro:
  // Blech-Stabs im Rhythmus der Hook, Marschtrommel | Strophe (f b Es As | f b Es C): Lead in Dreiklängen |
  // Refrain (f Des As Es | f Des Es C, i–VI–III–VII): punktierte Marsch-Hook („ta-ta taaa-ta“), Stabs auf den Vierteln
  // | Überleitung (Des Es f C): lange Töne über Marschtrommel, Hoover-Riser in den Loop.
  course_tank: {
    bpm: 140,
    voice: {
      lead: { ...SYNTH, cutoff: 4600, volume: 0.16 },
      bass: { volume: 0.16 },
      stabs: { volume: 0.14, cutoff: 6500, cutoffEnd: 1800 },
      piano: { volume: 0.095 },
      pad: { volume: 0.045 },
      riser: { volume: 0.09 },
    },
    kit: { kick: { volume: 0.5 }, snare: { volume: 0.13 }, tom: { freq: 150, volume: 0.4 }, clap: { volume: 0.28 } },
    lead: [...rest(4), ...taVerse, ...taChorus, ...taBridge],
    stabs: bySection(taProg, SONG, {
      intro: (c) => chordBar(c, 'x_x_ x__x x___ x_x_', 'F3'),
      verse: (c) => chordBar(c, '.... x... .... x...', 'F3'),
      chorus: (c) => chordBar(c, 'x... x... x... x...', 'F3'),
      bridge: (c) => chordBar(c, 'x__x x... x__x x.x.', 'F3'),
    }),
    piano: bySection(taProg, SONG, { verse: (c) => chordBar(c, OFF, 'F4'), chorus: (c) => chordBar(c, OFF, 'F4') }),
    pad: bySection(taProg, SONG, { verse: (c) => padBar(c), chorus: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(23), 'C4:16'],
    bass: bySection(taProg, SONG, {
      intro: (c) => bassBar(c, B_GALLOP), verse: (c) => bassBar(c, B_PUMP), chorus: (c) => bassBar(c, B_PUMP),
      bridge: (c, i) => bassBar(c, i < 3 ? B_GALLOP : 'L.H_ L.H_ .... ....'),
    }),
    drums: [
      ...groove(4, MARCH, [K4, CL, dr('..h. ..h. .... ....'), dr('s..s s.s. ssss ssss')]),
      ...groove(4, MARCH, [K4, CL, dr('..h. ..h. ..h. ..h.'), dr('s..s s.s. s.ss ssss')]),
      ...groove(4, MARCH, [K4, CL, dr('..h. ..h. ..h. ..h.'), dr('s..s s.s. tttt tttt')], false),
      ...groove(4, MARCH_C, [K4, CL, HH, dr('.... s... ssss ssss')]),
      ...groove(4, MARCH_C, [K4, CL, HH, dr('.... s... tttt tttt')], false),
      [...MARCH, CR], MARCH, [K4, CL, HH, dr('s.s. s.s. s.s. ssss')], [K4, dr('.... c... .... ....'), dr('ssss ssss ssss ssss')],
    ],
  },

  // Prüfungs-Haus (2-Haus, 5 Räume à 10 s): 172 BPM, d-Moll, 8 Takte – schnell und hektisch, aber mit Melodie:
  // rennende Achtel-Hook (d B C A | d B g A) über Uhr-Ticken (Tick/Tack in Achteln), Galopp-Bass, Stabs auf der „und“.
  course_house: {
    bpm: 172,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 4600, volume: 0.19 },
      stabs: { volume: 0.11 },
      pad: { volume: 0.04 },
      riser: { volume: 0.07 },
    },
    kit: { tick: { volume: 0.13 }, snare: { volume: 0.22 } },
    lead: hoLead,
    stabs: hoProg.map((c) => chordBar(c, '..x. ..x. ..x. ..x.')),
    pad: hoProg.map((c) => padBar(c)),
    riser: [...rest(7), 'A3:13 -:3'],
    bass: hoProg.map((c) => bassBar(c, B_GALLOP)),
    drums: [[K4, CL, TICK, CR], [K4, CL, TICK], [K4, CL, TICK], [K4, CL, TICK, dr('.... .... .... ..o.')],
      [K4, CL, TICK, CR], [K4, CL, TICK], [K4, CL, TICK], [K4, CL, TICK, dr('.... .... .sss ssss')]],
  },

  // Weltkarte Welt 2: 128 BPM, G-Dur, 16 Takte, ruhige Eurodance-Ballade. Strophe (G D/Fis e C | G D C D): Piano-
  // Melodie in Dreiklang-Bögen mit leichtem Echo | Refrain (e C G D | e C a D): weicher Lead singt, Piano auf der „und“.
  // Kick auf 1 und 3, Clap auf 2 und 4, leise Darbuka (Doum/Tek) als Wüstenfarbe.
  course_world2_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3000, volume: 0.17 },
      piano: { volume: 0.12, cutoff: 4000 },
      pad: { volume: 0.05 },
      bass: { cutoff: 650 },
    },
    kit: { doum: { volume: 0.26, freq: 100 }, tek: { volume: 0.14, off: 0.7 }, hat: { volume: 0.3, off: 0.2 }, open: { volume: 0.2 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.3, send: { piano: 0.3, lead: 0.2, tek: 0.2 } } },
    piano: [...m2Piano, ...m2Prog.slice(8).map((c) => chordBar(c, '..x_ ..x_ ..x_ ..x_', 'E4'))],
    lead: [...rest(8), ...m2Lead],
    pad: m2Prog.map((c) => padBar(c)),
    bass: m2Prog.map((c) => bassBar(c, B_HALF)),
    drums: [[...W2MAP, CR], W2MAP, W2MAP, [KH, CL, dr('d... .... d... ....'), dr('..p. ..p. pppp pppp'), H8],
      W2MAP, W2MAP, W2MAP, [KH, CL, dr('d... .... d... ....'), dr('..p. ..p. ..p. pppp'), H8],
      [...W2MAP, CR], W2MAP, W2MAP, [KH, CL, dr('d... .... d... ....'), dr('..p. ..p. pppp pppp'), H8],
      W2MAP, W2MAP, W2MAP, [KH, CL, dr('d... .... d... ....'), dr('..p. ..p. ..p. pppp'), H8]],
  },
};
