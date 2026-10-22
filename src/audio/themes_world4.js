// Kurs-Themen Welt 4 „Canyon-Inselkette“ – eigene Kompositionen im Stil des 90er-Eurodance
// (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.

import { dr, K4, KH, CL, HH, H8, H8O, HUP, CR, rep, rest, mel, hit, pat, pump, gallop, bounce, offbeat, p332 } from './themeParts.js';

// ---------------------------------------------------------------- Canyon ----
// d-Moll (dorisch, H): Western-Pfiff (Sinus, wenig Vibrato), Twang-Pluck im Galopp mit kurzem Echo,
// leichte Marschtrommel der Ameisensoldaten.
const twang = (a, b, c, d) => mel(`${a} ${a} ${b} ${a} ${a} ${c} ${a} ${a} ${b} ${a} ${c} ${d}`, 'x.xx x.xx x.xx x.xx');
const CANYON = [K4, CL, H8, dr('s..s ..s. s..s ..s.')];
const caDm = 'A3+D4+F4', caC = 'G3+C4+E4', caBb = 'Bb3+D4+F4', caA = 'A3+C#4+E4', caGm = 'Bb3+D4+G4', caF = 'A3+C4+F4';

// ---------------------------------------------------------------- Giftwasser-Wald ----
// es-Moll: chromatisch kriechendes Hoover-Motiv (Ranken), Gifttropfen (Plucks gleiten abwärts),
// gedämpfte „Wah“-Stabs auf der „und“, synkopierter Bass.
const poDrops = [
  pat(['Bb5', 'Gb5', 'Eb6'], '..0. .... .1.. ..2.'),
  pat(['Cb6', 'Ab5', 'Eb6'], '.0.. ..1. .... 2...'),
  pat(['Bb5', 'Eb6', 'Gb5'], '...0 .... 1... .2..'),
  pat(['Ab5', 'D6', 'F5'], '..0. ...1 .... ..2.'),
];
const poBass = (r, o, a, b) => mel(`${r} ${r} ${o} ${a} ${b} ${a}`, 'x..x ..x. x.x. .x..');
const poEbm = 'Gb3+Bb3+Db4+Eb4', poAbm = 'Gb3+Cb4+Eb4+Ab4', poCb = 'Gb3+Bb3+Eb4', poBb7 = 'F3+Ab3+D4', poDb = 'F3+Ab3+Db4', poFo = 'F3+Ab3+Cb4+Eb4';
const POISON = [K4, CL, dr('hhoh hhoh hhoh hhoh')];

// ---------------------------------------------------------------- Piep-Blöcke ----
// c-Moll, 120 BPM: klarer Viertel-Puls (Kick und Holzklick auf jeder Zählzeit). Spiel-Takt: die Blöcke
// schalten alle 8 Zählzeiten (2 Takte) um – auf der Eins jedes ungeraden Takts erklingt der Umschalt-Piep
// (G6, mit Crash), auf den Zählzeiten 2, 3, 4 des Takts davor dreimal der Warn-Piep (C6).
const BEEP_ON = mel('G6', 'x... .... .... ....');           // Umschalt-Takt: Piep auf der Eins
const BEEP_WARN = mel('C6 C6 C6', '.... x... x... x...');    // Warn-Takt: Piep auf 2, 3, 4
const PULSE = dr('x... x... x... x...');
const BEEP_A = [K4, CL, HUP, PULSE, CR], BEEP_B = [K4, CL, HUP, PULSE];
const bpArp = (n) => pat(n, '0.1. 2.1. 0.1. 2.3.');

// ---------------------------------------------------------------- Trampolin-Athletik ----
// B-Dur: Hook mit Oktavsprüngen, „Boing“-Plucks (gleiten aufwärts) auf der „und“, hüpfender Bass.
const boing = (n) => pat(n, '..0. ..1. ..2. ..1.');
const boBb = 'Bb3+D4+F4', boF = 'A3+C4+F4', boGm = 'Bb3+D4+G4', boEb = 'Bb3+Eb4+G4', boDm = 'A3+D4+F4';
const boBbH = 'Bb4+D5+F5', boFH = 'A4+C5+F5', boGmH = 'Bb4+D5+G5', boEbH = 'Bb4+Eb5+G5';

// ---------------------------------------------------------------- Ruinenstadt ----
// A-Phrygisch (B): Stammes-Toms, Flöte (Dreieck mit leichtem Vibrato), Harfen-Plucks, Bordun-Pad.
const RUINS = [K4, CL, H8, dr('t.t. ..t. .tt. ..t.')];
const ruHarp = (n) => pat(n, '0123 4321 0123 4321');

// ---------------------------------------------------------------- Lava-Burg ----
// e-Moll harmonisch (Dis): Burg-Orgel, harte Stabs, Hoover-Riff mit Tonwiederholungen, F-Dur als
// Neapolitaner (Tritonus-Reibung zu H7).
const lvEm = 'G3+B3+E4', lvC = 'G3+C4+E4', lvAm = 'A3+C4+E4', lvB7 = 'F#3+A3+B3+D#4';
const lvEmS = 'E3+G3+B3+E4', lvCS = 'E3+G3+C4+E4', lvAmS = 'E3+A3+C4+E4', lvB7S = 'D#3+F#3+A3+B3', lvFS = 'F3+A3+C4+F4';

export const WORLD4_THEMES = {
  // Ameisen-Canyon (4-1): 132 BPM, d-Moll dorisch, 16 Takte, Western-Eurodance.
  // Form: 4 Takte Twang-Pluck im Galopp (d C B A) mit Slapback-Echo, Marschtrommel der Ameisen | 8 Takte
  //       Western-Pfiff (Sinus, leichtes Vibrato) über d C g A7 | d F C A, Piano-Stabs | 4 Takte Twang und
  //       harte Stabs (B C d A7), Riser in den Loop.
  course_canyon: {
    bpm: 132,
    voice: {
      whistle: { type: 'sine', volume: 0.12, vibrato: 12, rate: 5.5, slide: 1, attack: 0.03 },
      arp: { type: 'sawtooth', volume: 0.065, decay: 0.09 },
      piano: { volume: 0.1, oscs: 1 },
      stabs: { volume: 0.13 },
      pad: { volume: 0.045 },
      riser: { volume: 0.08 },
    },
    kit: { snare: { volume: 0.12 } },
    fx: { lowpass: { arp: 2600 }, delay: { steps: 2, feedback: 0.25, lowpass: 2600, wet: 0.35, send: { arp: 0.5, whistle: 0.3 } } },
    arp: [
      twang('D4', 'A4', 'F4', 'E4'), twang('C4', 'G4', 'E4', 'D4'), twang('Bb3', 'F4', 'D4', 'C4'), twang('A3', 'E4', 'C#4', 'E4'),
      ...rest(8),
      twang('Bb3', 'F4', 'D4', 'C4'), twang('C4', 'G4', 'E4', 'D4'), twang('D4', 'A4', 'F4', 'E4'), twang('A3', 'E4', 'C#4', 'G4'),
    ],
    whistle: [
      ...rest(4),
      mel('A4 D5 F5 E5 D5', 'x__x ____ x__x x___'),
      mel('C5 E5 G5 F5 E5', 'x__x ____ x__x x___'),
      mel('D5 G5 Bb5 A5 G5', 'x__x ____ x__x x___'),
      mel('A5 G5 E5 C#5', 'x___ ____ x_x_ x___'),
      mel('D6 C6 A5 F5 A5', 'x__x ____ x__x x___'),
      mel('C6 A5 F5 G5 A5', 'x__x ____ x__x x___'),
      mel('G5 E5 C5 D5 E5', 'x__x ____ x__x x___'),
      mel('C#5 E5 A5', 'x___ x___ x___ ____'),
      ...rest(4),
    ],
    piano: [...rest(4), ...[caDm, caC, caGm, caA, caDm, caF, caC, caA].map((c) => hit(c, '.... ..x_ .... ..x_')), ...rest(4)],
    stabs: [...rest(12), ...[caBb, caC, caDm].map((c) => hit(c, 'x..x ..x. .x.. x.x.')), hit(caA, 'x..x ..x. .... ....')],
    pad: [
      'A3+D4+F4:16', 'G3+C4+E4:16', 'Bb3+D4+F4:16', 'A3+C#4+E4:16',
      'A3+D4+F4:16', 'G3+C4+E4:16', 'Bb3+D4+G4:16', 'G3+C#4+E4:16',
      'A3+D4+F4:16', 'A3+C4+F4:16', 'G3+C4+E4:16', 'A3+C#4+E4:16',
      ...rest(4),
    ],
    riser: [...rest(15), 'A3:16'],
    bass: [
      gallop('D2', 'D3'), gallop('C2', 'C3'), gallop('Bb1', 'Bb2'), gallop('A1', 'A2'),
      gallop('D2', 'D3'), gallop('C2', 'C3'), gallop('G1', 'G2'), gallop('A1', 'A2'),
      gallop('D2', 'D3'), gallop('F1', 'F2'), gallop('C2', 'C3'), gallop('A1', 'A2'),
      gallop('Bb1', 'Bb2'), gallop('C2', 'C3'), gallop('D2', 'D3'), mel('A1 A2 A1 A2', 'x.x_ x.x_ .... ....'),
    ],
    drums: [
      [...CANYON, CR], CANYON, CANYON, [K4, CL, H8, dr('s..s ..s. ssss ssss')],
      [...CANYON, CR], CANYON, CANYON, [K4, CL, H8, dr('s..s ..s. .... ....'), dr('.... .... .... tttt')],
      [...CANYON, CR], CANYON, CANYON, [K4, CL, H8, dr('s..s ..s. ssss ssss')],
      [...CANYON, CR], CANYON, [K4, CL, HH, dr('s..s ..s. s..s ..s.')], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Giftwasser-Wald (4-2, Rankenschnapper): 130 BPM, es-Moll, 16 Takte, schleichend-giftig.
  // Form: 4 Takte Gifttropfen (Sinus-Plucks gleiten abwärts) und gedämpfte Wah-Stabs über synkopiertem Bass
  //       (es7 es7 Ces D=B7… B7) | 8 Takte Hoover kriecht chromatisch hoch wie eine Ranke (es7 as7 Cesmaj7 B7 |
  //       as7 es7 f-halbvermindert–B7 es) | 4 Takte Tropfen, Stabs, Tom-Fill (Ces Des as7 B7).
  course_poison: {
    bpm: 130,
    voice: {
      lead: { cutoff: 3400 },
      arp: { type: 'sine', volume: 0.11, decay: 0.09, glide: 0.55, glideTime: 0.09 },
      stabs: { volume: 0.13, cutoff: 2200, cutoffEnd: 500 },
      bass: { cutoff: 620, volume: 0.21 },
      pad: { volume: 0.045, bright: 0.7 },
    },
    kit: { tom: { freq: 140, volume: 0.36 }, hat: { volume: 0.26, off: 0.16 } },
    fx: { delay: { steps: 3, feedback: 0.42, lowpass: 2000, wet: 0.4, send: { arp: 0.6, stabs: 0.2, lead: 0.2 } } },
    arp: [...poDrops, ...rest(8), ...poDrops],
    lead: [
      ...rest(4),
      mel('Eb5 E5 F5 Gb5 F5 Eb5 Db5 Eb5', 'x_x_ x_x_ x__x x_x_'),
      mel('Ab5 A5 Bb5 Cb6 Bb5 Ab5 Gb5 Ab5', 'x_x_ x_x_ x__x x_x_'),
      mel('Gb5 Bb5 Eb6 Db6 Bb5 Gb5', 'x__x __x_ x_x_ x___'),
      mel('F5 Ab5 D5 F5 Ab5 Bb5', 'x__x __x_ x_x_ x___'),
      mel('Cb6 Bb5 Ab5 Gb5 Ab5 Cb6 Bb5 Ab5', 'x_x_ x_x_ x__x x_x_'),
      mel('Gb5 F5 Eb5 Db5 Eb5 Gb5 F5 Eb5', 'x_x_ x_x_ x__x x_x_'),
      mel('Eb5 F5 Ab5 Cb6 Bb5 Ab5 F5 D5', 'x_x_ x_x_ x_x_ x_x_'),
      mel('Eb5 Bb4 Eb5', 'x___ x___ x___ ____'),
      ...rest(4),
    ],
    stabs: [
      ...[poEbm, poEbm, poCb, poBb7].map((c) => hit(c, '..x. ...x ..x. .x..')),
      ...[poEbm, poAbm, poCb, poBb7, poAbm, poEbm].map((c) => hit(c, '.... ..x. .... ..x.')), mel(`${poFo} ${poBb7}`, '.... ..x. .... ..x.'), hit(poEbm, '.... ..x. .... ....'),
      ...[poCb, poDb, poAbm].map((c) => hit(c, '..x. ...x ..x. .x..')), hit(poBb7, '..x. ...x .... ....'),
    ],
    pad: [
      'Gb3+Bb3+Db4:16', 'Gb3+Bb3+Db4:16', 'Gb3+Bb3+Eb4:16', 'F3+Ab3+D4:16',
      ...rest(8),
      'Gb3+Bb3+Eb4:16', 'F3+Ab3+Db4:16', 'Gb3+Cb4+Eb4:16', 'F3+Ab3+D4:16',
    ],
    bass: [
      poBass('Eb2', 'Eb3', 'Db3', 'Bb1'), poBass('Eb2', 'Eb3', 'Db3', 'Bb1'), poBass('Cb2', 'Cb3', 'Bb2', 'Gb1'), poBass('Bb1', 'Bb2', 'Ab2', 'F1'),
      poBass('Eb2', 'Eb3', 'Db3', 'Bb1'), poBass('Ab1', 'Ab2', 'Gb2', 'Eb2'), poBass('Cb2', 'Cb3', 'Bb2', 'Gb1'), poBass('Bb1', 'Bb2', 'Ab2', 'F1'),
      poBass('Ab1', 'Ab2', 'Gb2', 'Eb2'), poBass('Eb2', 'Eb3', 'Db3', 'Bb1'), mel('F1 F1 F2 Bb1 Bb2 Bb1', 'x..x ..x. x.x. .x..'), poBass('Eb2', 'Eb3', 'Db3', 'Bb1'),
      poBass('Cb2', 'Cb3', 'Bb2', 'Gb1'), poBass('Db2', 'Db3', 'Cb3', 'Ab1'), poBass('Ab1', 'Ab2', 'Gb2', 'Eb2'), mel('Bb1 Bb1 Bb2', 'x..x ..x. .... ....'),
    ],
    drums: [
      [...POISON, CR], POISON, POISON, [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... .ttt')],
      [...POISON, CR], POISON, POISON, [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')],
      [...POISON, CR], POISON, POISON, [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... .ttt')],
      [...POISON, CR], POISON, POISON, [K4, dr('.... c... .... ....'), dr('hhoh hhoh .... ....'), dr('.... .... tttt tttt')],
    ],
  },

  // Piep-Block-Himmelsweg (4-3): 120 BPM, c-Moll, 16 Takte – die Musik ist die Uhr der Piep-Blöcke.
  // Spiel-Takt (sync): Umschalten alle 8 Zählzeiten (Eins der Takte 1, 3, 5 …), Warn-Piep auf den 3 Zählzeiten
  // davor. Form: zweitaktige Blöcke c As Es G | c f As–B G; 4 Takte Puls, Pieps, Bass, Rechteck-Arpeggio |
  //       8 Takte Hoover-Melodie im Umschalt-Takt, im Warn-Takt nur ein liegender Ton (die Pieps bleiben frei) |
  //       4 Takte Stabs auf den Vierteln. Kick und Holzklick auf jeder Zählzeit, Crash auf jedem Umschalten.
  course_beep: {
    bpm: 120,
    sync: { switchEvery: 8, warnBeats: 3 },
    voice: {
      bell: { type: 'sine', volume: 0.1, decay: 0.09, ratio: 2, partial: 0.3 },
      arp: { type: 'square', volume: 0.04, decay: 0.08 },
      lead: { cutoff: 3600, volume: 0.15 },
      stabs: { volume: 0.12 },
      pad: { volume: 0.045 },
    },
    kit: { tick: { freq: 1100, volume: 0.09, decay: 0.04 }, crash: { volume: 0.12 }, hat: { volume: 0.26 } },
    fx: { lowpass: { arp: 3000 } },
    bell: rep(8, [BEEP_ON, BEEP_WARN]).flat(),
    arp: [
      bpArp(['C4', 'G4', 'Eb4', 'Bb4']), bpArp(['C4', 'G4', 'Eb4', 'C5']), bpArp(['C4', 'Ab4', 'Eb4', 'G4']), bpArp(['C4', 'Ab4', 'Eb4', 'C5']),
      ...rest(8),
      bpArp(['C4', 'Ab4', 'Eb4', 'G4']), bpArp(['D4', 'Bb4', 'F4', 'Ab4']), bpArp(['D4', 'B4', 'G4', 'F4']), bpArp(['D4', 'B4', 'G4', 'D5']),
    ],
    lead: [
      ...rest(4),
      mel('Bb4 Eb5 G5 Bb5 Ab5 G5', 'x_x_ x_x_ x___ x___'), 'G5:16',
      mel('B4 D5 G5 F5 D5 B4', 'x_x_ x_x_ x___ x___'), 'D5:16',
      mel('C5 Eb5 G5 F5 Eb5 D5', 'x_x_ x_x_ x___ x___'), 'C5:16',
      mel('C5 F5 Ab5 G5 F5 Eb5', 'x_x_ x_x_ x___ x___'), 'F5:16',
      ...rest(4),
    ],
    stabs: [...rest(12), ...['Ab3+C4+Eb4', 'Bb3+D4+F4', 'G3+B3+D4', 'G3+B3+D4'].map((c) => hit(c, 'x... x... x... x...'))],
    pad: [
      'G3+C4+Eb4:16', 'G3+C4+Eb4:16', 'Ab3+C4+Eb4:16', 'Ab3+C4+Eb4:16',
      'G3+Bb3+Eb4:16', 'G3+Bb3+Eb4:16', 'G3+B3+D4:16', 'G3+B3+D4:16',
      'G3+C4+Eb4:16', 'G3+C4+Eb4:16', 'Ab3+C4+F4:16', 'Ab3+C4+F4:16',
      ...rest(4),
    ],
    bass: [
      pump('C2', 'C3'), pump('C2', 'C3'), pump('Ab1', 'Ab2'), pump('Ab1', 'Ab2'),
      pump('Eb2', 'Eb3'), pump('Eb2', 'Eb3'), pump('G1', 'G2'), pump('G1', 'G2'),
      pump('C2', 'C3'), pump('C2', 'C3'), pump('F1', 'F2'), pump('F1', 'F2'),
      pump('Ab1', 'Ab2'), pump('Bb1', 'Bb2'), pump('G1', 'G2'), pump('G1', 'G2'),
    ],
    drums: rep(8, [BEEP_A, BEEP_B]).flat(),
  },

  // Trampolin-Athletik (4-4): 140 BPM, B-Dur, 16 Takte, federnd.
  // Form: 4 Takte Piano-Offbeats und „Boing“-Plucks (Dreieck, gleitet aufwärts) auf der „und“ (B F/A g Es) |
  //       8 Takte Hoover-Hook mit Oktavsprüngen (B F/A g F | Es F d g) | 4 Takte Piano 3-3-2 mit Boing-Plucks
  //       (Es F B/D–Es F7), Tom-Sprünge.
  course_bounce: {
    bpm: 140,
    voice: {
      arp: { type: 'triangle', volume: 0.1, decay: 0.1, glide: 1.5, glideTime: 0.08 },
      lead: { cutoff: 5000 },
      piano: { volume: 0.095 },
      stabs: { volume: 0.11 },
    },
    kit: { tom: { freq: 250, volume: 0.36 } },
    arp: [
      boing(['F5', 'Bb5', 'D6']), boing(['F5', 'A5', 'C6']), boing(['G5', 'Bb5', 'D6']), boing(['G5', 'Bb5', 'Eb6']),
      ...rest(8),
      boing(['G5', 'Bb5', 'Eb6']), boing(['F5', 'A5', 'C6']), boing(['F5', 'Bb5', 'D6']), boing(['F5', 'A5', 'Eb6']),
    ],
    lead: [
      ...rest(4),
      mel('Bb4 Bb5 F5 D5 F5 Bb5', 'x_x_ ..x_ x_x_ x___'),
      mel('A4 A5 F5 C5 F5 A5', 'x_x_ ..x_ x_x_ x___'),
      mel('G4 G5 D5 Bb4 D5 G5', 'x_x_ ..x_ x_x_ x___'),
      mel('F5 G5 A5 C6', 'x___ x___ x___ x___'),
      mel('Eb5 Eb6 Bb5 G5 Bb5 Eb6', 'x_x_ ..x_ x_x_ x___'),
      mel('F5 F6 C6 A5 C6 F6', 'x_x_ ..x_ x_x_ x___'),
      mel('D5 D6 A5 F5 A5 D6', 'x_x_ ..x_ x_x_ x___'),
      mel('G5 F5 D5 Bb4', 'x___ x___ x___ x___'),
      ...rest(4),
    ],
    piano: [
      offbeat(boBbH), offbeat(boFH), offbeat(boGmH), hit(boEbH, '..x_ ..x_ ..x_ .xx_'),
      ...rest(8),
      p332(boEbH), p332(boFH), mel(`${'Bb4+D5+F5'} ${'Bb4+D5+F5'} ${'Bb4+D5+F5'} ${boEbH} ${boEbH} ${boEbH}`, 'x__x __x_ x__x __x_'), hit('A4+C5+Eb5+F5', 'x__x __x_ x___ ____'),
    ],
    stabs: [...rest(4), ...[boBb, boF, boGm, boF, boEb, boF, boDm, boGm].map((c) => hit(c, '.... ..x_ .... ..x_')), ...rest(4)],
    pad: ['Bb3+D4+F4:16', 'A3+C4+F4:16', 'Bb3+D4+G4:16', 'Bb3+Eb4+G4:16', ...rest(8), 'Bb3+Eb4+G4:16', 'A3+C4+F4:16', 'Bb3+D4+F4:8 Bb3+Eb4+G4:8', 'A3+C4+Eb4+F4:16'],
    bass: [
      bounce('Bb1', 'Bb2'), bounce('A1', 'A2'), bounce('G1', 'G2'), bounce('Eb2', 'Eb3'),
      bounce('Bb1', 'Bb2'), bounce('A1', 'A2'), bounce('G1', 'G2'), bounce('F1', 'F2'),
      bounce('Eb2', 'Eb3'), bounce('F1', 'F2'), bounce('D2', 'D3'), bounce('G1', 'G2'),
      bounce('Eb2', 'Eb3'), bounce('F1', 'F2'), mel('D2 D3 D2 D3 Eb2 Eb3 Eb2 Eb3', 'x__x x_x_ x__x x_x_'), mel('F1 F2 F1 F2', 'x__x x_x_ .... ....'),
    ],
    drums: [
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... t.t.')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... t.t. t.t.')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, dr('.... c... .... ....'), dr('hhoh hhoh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Ruinenstadt (4-5): 128 BPM, A-Phrygisch (B), 16 Takte, geheimnisvoll.
  // Form: 4 Takte Harfen-Plucks (Dreieck) und Stammes-Toms über Bordun-Pad (a B a g–a) | 8 Takte Flöte
  //       (Dreieck mit leichtem Vibrato) über a B C B | F g B a | 4 Takte Hoover-Riff in Phrygisch (d B g a),
  //       Riser in den Loop.
  course_ruins: {
    bpm: 128,
    voice: {
      whistle: { type: 'triangle', volume: 0.13, vibrato: 14, rate: 5, slide: 1, attack: 0.04 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.2 },
      lead: { cutoff: 3800, volume: 0.16 },
      pad: { volume: 0.05, bright: 0.8 },
      bass: { cutoff: 600 },
      riser: { volume: 0.07 },
    },
    kit: { tom: { freq: 150, volume: 0.34 }, hat: { volume: 0.26, off: 0.16 } },
    fx: { delay: { steps: [3, 4], feedback: 0.4, lowpass: 2600, wet: 0.35, send: { arp: 0.5, whistle: 0.35, tom: 0.15 } } },
    arp: [
      ruHarp(['A4', 'C5', 'E5', 'A5', 'C6']), ruHarp(['Bb4', 'D5', 'F5', 'Bb5', 'D6']), ruHarp(['A4', 'C5', 'E5', 'A5', 'C6']), ruHarp(['G4', 'Bb4', 'D5', 'G5', 'A5']),
      ...rest(12),
    ],
    whistle: [
      ...rest(4),
      mel('E5 F5 E5 C5 A4', 'x__x x___ x___ x___'),
      mel('D5 F5 Bb5 A5 F5', 'x__x x___ x_x_ ____'),
      mel('E5 G5 C6 Bb5 G5', 'x__x x___ x_x_ ____'),
      mel('F5 D5 Bb4', 'x___ x___ x___ ____'),
      mel('A5 G5 F5 C5 F5', 'x__x x___ x___ x___'),
      mel('Bb5 A5 G5 D5 G5', 'x__x x___ x___ x___'),
      mel('F5 Bb5 D6 C6 Bb5', 'x__x x___ x_x_ ____'),
      mel('A5 Bb5 A5 E5', 'x__x x___ x___ ____'),
      ...rest(4),
    ],
    lead: [
      ...rest(12),
      mel('D5 F5 A5 Bb5 A5', 'x_x_ x_x_ x___ ____'),
      mel('Bb5 A5 F5 D5', 'x_x_ x_x_ ____ ____'),
      mel('G5 Bb5 D6 C6 Bb5', 'x_x_ x_x_ x___ ____'),
      mel('A5 Bb5 A5', 'x___ x___ x___ ____'),
    ],
    pad: [
      'A3+E4:16', 'Bb3+F4:16', 'A3+E4:16', 'G3+D4:8 A3+E4:8',
      'A3+C4+E4:16', 'Bb3+D4+F4:16', 'G3+C4+E4:16', 'Bb3+D4+F4:16',
      'A3+C4+F4:16', 'Bb3+D4+G4:16', 'Bb3+D4+F4:16', 'A3+C4+E4:16',
      'A3+D4+F4:16', 'Bb3+D4+F4:16', 'Bb3+D4+G4:16', 'A3+C4+E4:16',
    ],
    riser: [...rest(15), 'E3:16'],
    bass: [
      ...[['A1', 'A2'], ['Bb1', 'Bb2'], ['A1', 'A2'], ['G1', 'A1'], ['A1', 'A2'], ['Bb1', 'Bb2'], ['C2', 'C3'], ['Bb1', 'Bb2'],
        ['F1', 'F2'], ['G1', 'G2'], ['Bb1', 'Bb2'], ['A1', 'A2'], ['D2', 'D3'], ['Bb1', 'Bb2'], ['G1', 'G2'], ['A1', 'A2']]
        .map(([r, o]) => mel(`${r} ${r} ${o} ${r} ${o}`, 'x__x __x_ x___ x___')),
    ],
    drums: [
      [...RUINS, CR], RUINS, RUINS, [K4, CL, H8, dr('t.t. ..t. tttt tttt')],
      [...RUINS, CR], RUINS, RUINS, [K4, CL, H8, dr('t.t. ..t. .tt. tttt')],
      [...RUINS, CR], RUINS, RUINS, [K4, CL, H8, dr('t.t. ..t. tttt tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Lavafelsen-Burg (4-Burg, Boss Lavafelsen-König): 148 BPM, e-Moll harmonisch, 16 Takte, wuchtig.
  // Form: 4 Takte Burg-Orgel auf der „und“ und harte Stabs (e C a H7) | 8 Takte Hoover-Riff mit
  //       Tonwiederholungen (e C F=Neapolitaner H7 | a e C–F H7), Galopp-Bass | 4 Takte gehaltene Orgel,
  //       harte Synkopen-Stabs, Tom-Fills, Riser über zwei Takte in den Loop.
  course_lavacastle: {
    bpm: 148,
    voice: {
      organ: { volume: 0.04, cutoff: 2600 },
      stabs: { volume: 0.15, cutoff: 6500, cutoffEnd: 1800 },
      lead: { cutoff: 4600 },
      riser: { volume: 0.08 },
    },
    kit: { tom: { freq: 140, volume: 0.42 }, snare: { volume: 0.28 } },
    organ: [
      offbeat(lvEm), offbeat(lvC), offbeat(lvAm), offbeat(lvB7),
      ...rest(8),
      `${lvEm}:16`, `${lvC}:16`, `${lvAm}:8 ${lvB7}:8`, `${lvB7}:16`,
    ],
    lead: [
      ...rest(4),
      mel('E5 E5 G5 E5 B5 A5 G5 F#5', 'x.xx x_x_ x_x_ x___'),
      mel('E5 E5 G5 E5 C6 B5 A5 G5', 'x.xx x_x_ x_x_ x___'),
      mel('F5 F5 A5 F5 C6 Bb5 A5 F5', 'x.xx x_x_ x_x_ x___'),
      mel('D#5 F#5 A5 B5 A5 F#5 D#5', 'x_x_ x_x_ x_x_ x___'),
      mel('A5 A5 C6 A5 E6 D6 C6 B5', 'x.xx x_x_ x_x_ x___'),
      mel('G5 G5 B5 G5 E6 D6 B5 G5', 'x.xx x_x_ x_x_ x___'),
      mel('E5 G5 C6 F5 A5 C6', 'x_x_ x___ x_x_ x___'),
      mel('B5 A5 F#5 D#5 B4', 'x_x_ x_x_ x___ ____'),
      ...rest(4),
    ],
    stabs: [
      ...[lvEmS, lvCS, lvAmS].map((c) => hit(c, 'x..x ..x. ..x. x...')), hit(lvB7S, 'x..x ..x. x.x. xxxx'),
      ...[lvEmS, lvCS, lvFS, lvB7S, lvAmS, lvEmS].map((c) => hit(c, 'x... .... x... ....')), mel(`${lvCS} ${lvFS}`, 'x... .... x... ....'), hit(lvB7S, 'x... .... x... ....'),
      ...[lvEmS, lvCS, lvAmS].map((c) => hit(c, 'x.xx .x.x x.xx .x..')), hit(lvB7S, 'x.xx .x.x .... ....'),
    ],
    riser: [...rest(14), 'B3:16', 'E4:14 -:2'],
    bass: [
      gallop('E2', 'E3'), gallop('C2', 'C3'), gallop('A1', 'A2'), gallop('B1', 'B2'),
      gallop('E2', 'E3'), gallop('C2', 'C3'), gallop('F1', 'F2'), gallop('B1', 'B2'),
      gallop('A1', 'A2'), gallop('E2', 'E3'), mel('C2 C3 C2 C3 F1 F2 F1 F2', 'x.x_ x.x_ x.x_ x.x_'), gallop('B1', 'B2'),
      gallop('E2', 'E3'), gallop('C2', 'C3'), mel('A1 A2 A1 A2 B1 B2 B1 B2', 'x.x_ x.x_ x.x_ x.x_'), mel('B1 B2 B1 B2', 'x.x_ x.x_ .... ....'),
    ],
    drums: [
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... ..tt tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, dr('..s. ..s. ..s. ..s.')], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Weltkarte Welt 4: 122 BPM, A-Dur, 8 Takte, ruhig – Kick auf 1 und 3, Clap auf 2 und 4.
  // Form: Pads (A E/Gis fis D | A/Cis h7 D–E A–E), Western-Pfiff als Melodie, leise Twang-Plucks auf der „und“.
  course_world4_map: {
    bpm: 122,
    voice: {
      whistle: { type: 'sine', volume: 0.11, vibrato: 10, rate: 5.2, slide: 1 },
      arp: { type: 'sawtooth', volume: 0.05, decay: 0.08 },
      pad: { volume: 0.05 },
      bass: { cutoff: 650 },
    },
    fx: { lowpass: { arp: 2400 }, delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.3, send: { whistle: 0.3, arp: 0.4 } } },
    whistle: [
      mel('E5 A5 C#6 B5 A5', 'x___ x___ x_x_ x___'),
      mel('B5 G#5 E5 F#5', 'x___ x___ x___ x___'),
      mel('A5 C#6 F#6 E6 C#6', 'x___ x___ x_x_ x___'),
      mel('D6 C#6 A5', 'x___ ____ x___ x___'),
      mel('E5 A5 E6 D6 C#6', 'x___ x___ x_x_ x___'),
      mel('D6 C#6 B5 A5 F#5', 'x___ x___ x_x_ x___'),
      mel('F#5 A5 G#5 B5', 'x___ x___ x___ x___'),
      mel('C#6 B5 A5', 'x___ x___ x___ ____'),
    ],
    arp: ['A3+E4', 'G#3+E4', 'A3+F#4', 'A3+F#4', 'A3+E4', 'A3+D4', 'A3+F#4', 'A3+E4'].map((c) => hit(c, '..x. ..x. ..x. ..x.')),
    pad: ['A3+C#4+E4:16', 'G#3+B3+E4:16', 'F#3+A3+C#4:16', 'F#3+A3+D4:16', 'A3+C#4+E4:16', 'F#3+A3+D4:16', 'F#3+A3+D4:8 G#3+B3+E4:8', 'A3+C#4+E4:8 G#3+B3+E4:8'],
    bass: [
      mel('A1 E2', 'x___ __.. x___ __..'), mel('G#1 E2', 'x___ __.. x___ __..'), mel('F#1 C#2', 'x___ __.. x___ __..'), mel('D2 A1', 'x___ __.. x___ __..'),
      mel('C#2 A1', 'x___ __.. x___ __..'), mel('B1 F#1', 'x___ __.. x___ __..'), mel('D2 E2', 'x___ __.. x___ __..'), mel('A1 E2', 'x___ __.. x___ __..'),
    ],
    drums: [
      [KH, CL, H8O, CR], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, dr('h.h. h.h. h.h. hhhh')],
      [KH, CL, H8O], [KH, CL, H8O], [KH, CL, H8O], [KH, CL, dr('h.h. h.h. hhhh hhhh')],
    ],
  },
};
