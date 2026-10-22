// Kurs-Themen Welt 3 „Schnee und Eis“ – eigene Kompositionen im Stil des 90er-Eurodance
// (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.

import { dr, K4, KH, CL, HH, H8, H8O, HOF, CR, rep, rest, mel, hit, pat, pump, gallop, bounce, offbeat, p332 } from './themeParts.js';

// ---------------------------------------------------------------- Schnee ----
// Es-Dur; Schlittenschellen in Achteln, Glöckchen-Flocken (spärlich fallende Glockentöne), weiches Rave-Piano.
const snFlake = (n) => pat(n, '0..1 ..2. .3.. 2...');
const snEb = ['Eb6', 'G6', 'Bb6', 'Eb7'], snCm = ['C6', 'Eb6', 'G6', 'C7'], snAb = ['C6', 'Eb6', 'Ab6', 'C7'], snBb = ['D6', 'F6', 'Bb6', 'D7'];
const SNOW = [K4, CL, dr('j.jj j.jj j.jj j.jj')];

// ---------------------------------------------------------------- Spukhaus ----
// h-Moll (harmonisch, Ais): Lamento-Bass (H Ais A Gis G Fis), Orgel-„pa“ auf der „und“, Theremin
// (Sinus mit weitem Vibrato und Gleiten), Cembalo-artige Plucks, langsame Standuhr (Tick/Tack in Vierteln).
const ghBm = 'F#3+B3+D4', ghBmA = 'F#3+A3+D4', ghGs = 'G#3+B3+D4', ghG = 'G3+B3+D4', ghFs7 = 'F#3+A#3+C#4+E4', ghEm = 'G3+B3+E4';
const ghBass = (r, o) => mel(`${r} ${o} ${r} ${o}`, 'x_.. x_.. x_.. x_..');
const GHOST = [K4, CL, H8, dr('x... x... x... x...')];

// ---------------------------------------------------------------- Pastell-Garten ----
// As-Dur, leicht und schnell: Rechteck-Pluck-Melodie in Achteln, Piano-Offbeats, Glöckchen-Gegenstimme.
const plAb = 'Ab4+C5+Eb5', plFm = 'Ab4+C5+F5', plDb = 'Ab4+Db5+F5', plEb = 'G4+Bb4+Eb5', plCm = 'G4+C5+Eb5', plBbm = 'F4+Bb4+Db5';
const plSpark = (n) => pat(n, '0123 1230 2301 3210');

// ---------------------------------------------------------------- Lagune ----
// Des-Dur mit lydischer Quarte (G): alles hinter Tiefpass wie unter Wasser, blubbernde Sinus-Plucks, die
// aufwärts gleiten, langes Echo; Kick auf 1 und 3.
const bubbles = [
  pat(['Ab5', 'Db6', 'F6', 'Ab6'], '0..1 .2.. ..0. 1.3.'),
  pat(['F5', 'Bb5', 'Db6', 'F6'], '.0.. 1..2 .3.. ..1.'),
  pat(['Gb5', 'Bb5', 'Db6', 'F6'], '0.1. ..2. ...3 .1..'),
  pat(['Ab5', 'C6', 'Eb6', 'Ab6'], '..0. 1... 2.3. ...1'),
];
const waBass = (a, b) => mel(`${a} ${b}`, 'x___ __.. x___ __..');
const WATER = [KH, CL, dr('h.h. h.h. h.h. h.o.')];

// ---------------------------------------------------------------- Bergrennen ----
// cis-Moll, 150 BPM, treibend: Hoover-Riff mit Tonwiederholungen (Motor dreht hoch), Galopp-Bass.
const raCsm = 'G#3+C#4+E4', raA = 'A3+C#4+E4', raE = 'G#3+B3+E4', raB = 'F#3+B3+D#4', raFsm = 'F#3+A3+C#4', raGs7 = 'G#3+C4+D#4+F#4';
const raArp = (n) => pat(n, '0012 0012 0312 0213');

// ---------------------------------------------------------------- Herbstwald ----
// A-Dorisch (Fis): warmer Hoover, Gitarren-artiger Sägezahn-Pluck in rollendem Muster, Offbeat-Piano.
const auGuit = (n) => pat(n, '0.12 .30. 12.3 0.21');
const auAm = ['A3', 'E4', 'G4', 'C5'], auD = ['A3', 'D4', 'F#4', 'A4'], auF = ['F3', 'C4', 'E4', 'A4'], auG = ['G3', 'D4', 'G4', 'B4'];
const auPAm = 'A4+C5+E5+G5', auPD = 'A4+D5+F#5', auPF = 'A4+C5+E5', auPG = 'B4+D5+G5', auPEm = 'B4+D5+G5';

// ---------------------------------------------------------------- Zug ----
// G-Mixolydisch (F): rollender „Tschu-ku-tschu“-Rhythmus (Hats und Bass in 1-0-1-1), Dampfpfeife.
const CHUG = [K4, CL, dr('h.hh h.hh h.hh h.hh'), dr('.... ...s .... ...s')];
const chug = (lo, hi) => mel(`${lo} ${lo} ${hi} ${lo} ${lo} ${hi} ${lo} ${lo} ${hi} ${lo} ${lo} ${hi}`, 'x.xx x.xx x.xx x.xx');
const trG = 'G3+B3+D4', trF = 'F3+A3+C4', trC = 'G3+C4+E4', trD = 'F#3+A3+D4', trEm = 'G3+B3+E4';

// ---------------------------------------------------------------- Himmels-Kettenzaun ----
// D-Lydisch (Gis): luftig – breite helle Pads, hohe Dreieck-Arpeggien, schwebender Hoover, Glocken.
const skArp = (n) => pat(n, '0123 1232 0123 3212');
const skD = ['D5', 'F#5', 'A5', 'D6'], skE = ['E5', 'G#5', 'B5', 'D6'], skBm = ['D5', 'F#5', 'B5', 'D6'], skG = ['D5', 'G5', 'B5', 'D6'], skA = ['E5', 'A5', 'C#6', 'E6'], skFsm = ['C#5', 'F#5', 'A5', 'C#6'], skEm = ['E5', 'G5', 'B5', 'E6'];
const SKY = [K4, CL, HOF];

export const WORLD3_THEMES = {
  // Schneepark (3-1): 128 BPM, Es-Dur, 16 Takte, warm und glitzernd.
  // Form: 4 Takte Pads mit fallenden Glöckchen-Flocken und Schlittenschellen (Es c As B) | 8 Takte weiches
  //       Rave-Piano trägt die Melodie (Es g As B | c As Es/G f7–B) | 4 Takte Piano-Akkorde 3-3-2 mit
  //       Glockenspiel-Melodie (As B g–c f7–B7), Snare-Wirbel in den Loop.
  course_snow: {
    bpm: 128,
    voice: {
      bell: { volume: 0.07, decay: 0.6, ratio: 2.76, partial: 0.4 },
      piano: { volume: 0.12, cutoff: 3800, cutoffEnd: 1400 },
      pad: { volume: 0.055, bright: 1.1 },
      bass: { cutoff: 650, volume: 0.19 },
    },
    kit: { kick: { pitchStart: 130, click: 0.2, volume: 0.58 }, clap: { volume: 0.3 }, jingle: { volume: 0.22, off: 0.13 } },
    fx: { delay: { steps: 3, feedback: 0.35, lowpass: 3800, wet: 0.35, send: { bell: 0.55, piano: 0.25, clap: 0.2 } } },
    bell: [
      snFlake(snEb), snFlake(snCm), snFlake(snAb), snFlake(snBb),
      ...rest(8),
      mel('C7 Bb6 Ab6 Eb6', 'x___ x___ x___ x___'), mel('D7 C7 Bb6 F6', 'x___ x___ x___ x___'),
      mel('Bb6 G6 Eb7 C7', 'x___ x___ x___ x___'), mel('Ab6 F6 D6 Bb5', 'x___ x___ x___ x___'),
    ],
    piano: [
      ...rest(4),
      mel('G5 Bb5 Eb6 D6 Bb5 G5', 'x__x __x_ x_x_ x___'),
      mel('F5 G5 Bb5 D6 C6 Bb5', 'x__x __x_ x_x_ x___'),
      mel('Eb5 F5 Ab5 C6 Bb5 Ab5', 'x__x __x_ x_x_ x___'),
      mel('G5 F5 D5 Bb4', 'x___ x_x_ x___ ____'),
      mel('G5 Bb5 C6 D6 Eb6 D6', 'x__x __x_ x_x_ x___'),
      mel('C6 Bb5 Ab5 Eb5 F5 Ab5', 'x__x __x_ x_x_ x___'),
      mel('G5 Bb5 Eb6 G6 F6 Eb6', 'x__x __x_ x_x_ x___'),
      mel('Ab5 G5 F5 D5', 'x___ x_x_ x___ ____'),
      p332('Ab4+C5+Eb5'), p332('Bb4+D5+F5'), mel('Bb4+D5+G5 Bb4+D5+G5 Bb4+D5+G5 C5+Eb5+G5 C5+Eb5+G5 C5+Eb5+G5', 'x__x __x_ x__x __x_'), mel('Ab4+C5+F5 Ab4+C5+F5 Ab4+D5+F5 Ab4+D5+F5', 'x__x ____ x__x ____'),
    ],
    pad: [
      'Eb3+G3+Bb3:16', 'Eb3+G3+C4:16', 'Eb3+Ab3+C4:16', 'D3+F3+Bb3:16',
      'Eb3+G3+Bb3:16', 'D3+G3+Bb3:16', 'Eb3+Ab3+C4:16', 'D3+F3+Bb3:16',
      'Eb3+G3+C4:16', 'Eb3+Ab3+C4:16', 'Eb3+G3+Bb3:16', 'Eb3+F3+Ab3:8 D3+F3+Bb3:8',
      'Eb3+Ab3+C4:16', 'D3+F3+Bb3:16', 'D3+G3+Bb3:8 Eb3+G3+C4:8', 'Eb3+F3+Ab3:8 D3+F3+Ab3:8',
    ],
    bass: [
      bounce('Eb2', 'Eb3'), bounce('C2', 'C3'), bounce('Ab1', 'Ab2'), bounce('Bb1', 'Bb2'),
      bounce('Eb2', 'Eb3'), bounce('G1', 'G2'), bounce('Ab1', 'Ab2'), bounce('Bb1', 'Bb2'),
      bounce('C2', 'C3'), bounce('Ab1', 'Ab2'), bounce('G1', 'G2'), mel('F1 F2 F1 F2 Bb1 Bb2 Bb1 Bb2', 'x__x x_x_ x__x x_x_'),
      bounce('Ab1', 'Ab2'), bounce('Bb1', 'Bb2'), mel('G1 G2 G1 G2 C2 C3 C2 C3', 'x__x x_x_ x__x x_x_'), mel('F1 F2 F1 F2 Bb1 Bb2', 'x__x x_x_ x__x ....'),
    ],
    drums: [
      [...SNOW, CR], SNOW, SNOW, [K4, CL, dr('j.jj j.jj jjjj jjjj')],
      [...SNOW, CR], SNOW, SNOW, [K4, CL, dr('j.jj j.jj j.jj j...'), dr('.... .... .... .ttt')],
      [...SNOW, CR], SNOW, SNOW, [K4, CL, dr('j.jj j.jj jjjj jjjj')],
      [...SNOW, CR], SNOW, SNOW, [K4, dr('.... c... .... ....'), dr('j.jj j.jj .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Spukhaus (3-3): 122 BPM, h-Moll harmonisch, 16 Takte, schaurig-niedlich.
  // Form: 4 Takte Orgel-„pa“ auf der „und“ über dem Lamento-Bass (h h/Ais h/A gis-halbvermindert), Cembalo-Plucks,
  //       langsame Standuhr | 8 Takte Theremin-Melodie mit weiten Vibrato-Bögen (G Fis7 e–Fis7 h | h h/Ais h/A gis)
  //       | 4 Takte Orgel-Melodie in Terzen (G e C=Neapolitaner Fis7), „Buuh“-Riser abwärts in den Loop.
  course_ghost: {
    bpm: 122,
    voice: {
      organ: { volume: 0.042, cutoff: 2200 },
      whistle: { type: 'sine', volume: 0.11, vibrato: 45, rate: 6.2, slide: 3, attack: 0.08, gate: 0.97 },
      arp: { type: 'sawtooth', volume: 0.05, decay: 0.08 },
      bass: { cutoff: 600, volume: 0.2 },
      pad: { volume: 0.04, bright: 0.7 },
      riser: { glide: 0.5, volume: 0.07, noise: 0.03 },
    },
    kit: { tick: { freq: 1500, volume: 0.1, decay: 0.05 }, clap: { volume: 0.28 }, hat: { volume: 0.3, off: 0.18 }, tom: { freq: 120, volume: 0.32 } },
    fx: {
      lowpass: { arp: 3000 },
      delay: { steps: [3, 4], feedback: 0.45, lowpass: 2200, wet: 0.45, send: { whistle: 0.45, clap: 0.5, arp: 0.3, organ: 0.15 } },
    },
    organ: [
      offbeat(ghBm), offbeat(ghBm), offbeat(ghBmA), offbeat(ghGs),
      offbeat(ghG), offbeat(ghFs7), mel(`${ghEm} ${ghEm} ${ghFs7} ${ghFs7}`, '..x_ ..x_ ..x_ ..x_'), offbeat(ghBm),
      offbeat(ghBm), offbeat(ghBm), offbeat(ghBmA), offbeat(ghGs),
      mel('B4+D5 D5+G5 B4+D5 A4+C5 B4+D5', 'x__x __x_ x___ x___'),
      mel('G4+B4 B4+E5 G4+B4 F#4+A4 G4+B4', 'x__x __x_ x___ x___'),
      mel('E4+G4 G4+C5 C5+E5 B4+D5 G4+C5', 'x__x __x_ x___ x___'),
      mel('A#4+C#5 C#5+E5 A#4+C#5 F#4+A#4', 'x___ x___ x___ x___'),
    ],
    whistle: [
      ...rest(4),
      mel('D6 B5 G5', 'x___ ____ x___ x___'),
      mel('A#5 C#6 E6', 'x___ ____ x___ x___'),
      mel('G6 F#6 E6 C#6', 'x___ x___ x___ x___'),
      mel('D6 B5', 'x___ ____ ____ x___'),
      mel('F#5 B5 D6 C#6 B5', 'x___ x___ x_x_ x___'),
      mel('A#5 C#6 F#6 E6 C#6', 'x___ x___ x_x_ x___'),
      mel('A5 D6 F#6 G6 F#6', 'x___ x___ x_x_ x___'),
      mel('F#6 D6 B5 G#5', 'x___ x___ x___ x___'),
      ...rest(4),
    ],
    arp: [
      pat(['B4', 'D5', 'F#5', 'B5'], '0123 2101 2321 0123'), pat(['A#4', 'C#5', 'F#5', 'A#5'], '0123 2101 2321 0123'),
      pat(['A4', 'D5', 'F#5', 'A5'], '0123 2101 2321 0123'), pat(['G#4', 'B4', 'D5', 'F#5'], '0123 2101 2321 0123'),
      ...rest(12),
    ],
    pad: [...rest(4), 'G3+B3+D4:16', 'F#3+A#3+C#4:16', 'G3+B3+E4:8 F#3+A#3+C#4:8', 'F#3+B3+D4:16', 'F#3+B3+D4:16', 'F#3+A#3+C#4:16', 'F#3+A3+D4:16', 'G#3+B3+D4:16', ...rest(4)],
    riser: [...rest(15), 'F#5:16'],
    bass: [
      ghBass('B1', 'B2'), ghBass('A#1', 'A#2'), ghBass('A1', 'A2'), ghBass('G#1', 'G#2'),
      ghBass('G1', 'G2'), ghBass('F#1', 'F#2'), mel('G1 G2 F#1 F#2', 'x_.. x_.. x_.. x_..'), ghBass('B1', 'B2'),
      ghBass('B1', 'B2'), ghBass('A#1', 'A#2'), ghBass('A1', 'A2'), ghBass('G#1', 'G#2'),
      ghBass('G1', 'G2'), ghBass('E1', 'E2'), ghBass('C2', 'C3'), mel('F#1 F#2 F#1', 'x_.. x_.. x___ ....'),
    ],
    drums: [
      [...GHOST, CR], GHOST, GHOST, [K4, CL, H8, dr('x... x... x... x...'), dr('.... .... .... .ttt')],
      [...GHOST, CR], GHOST, GHOST, [K4, CL, H8, dr('x... x... x... x...'), dr('.... .... .... tttt')],
      [...GHOST, CR], GHOST, GHOST, [K4, CL, H8, dr('x... x... x... x...'), dr('.... .... .... .ttt')],
      [...GHOST, CR], GHOST, GHOST, [K4, dr('.... c... .... ....'), dr('x... x... x... x...')],
    ],
  },

  // Pastell-Garten (3-4, nur 100 s): 152 BPM, As-Dur, 16 Takte, leicht und schnell – ohne Hoover.
  // Form: 4 Takte Glitzer-Arpeggien (Rechteck-Plucks) und Piano-Offbeats (As f Des Es) | 8 Takte Pluck-Melodie
  //       in hüpfenden Achteln (As c Des Es | f Des As/C b–Es) | 4 Takte Glöckchen-Gegenstimme über Piano 3-3-2
  //       (Des Es c–f B7–Es), Tom-Rolle.
  course_plaza: {
    bpm: 152,
    voice: {
      arp: { type: 'square', volume: 0.07, decay: 0.1 },
      piano: { volume: 0.1, oscs: 1, cutoff: 5200 },
      bell: { volume: 0.065, decay: 0.35, ratio: 2.76, partial: 0.35 },
      pad: { volume: 0.04, bright: 1.3 },
    },
    kit: { tom: { freq: 260, volume: 0.32 }, hat: { volume: 0.3, off: 0.18 } },
    fx: { lowpass: { arp: 5200 }, delay: { steps: 3, feedback: 0.25, lowpass: 4000, wet: 0.25, send: { arp: 0.35, bell: 0.4 } } },
    arp: [
      plSpark(['Ab5', 'C6', 'Eb6', 'Ab6']), plSpark(['F5', 'Ab5', 'C6', 'F6']), plSpark(['F5', 'Ab5', 'Db6', 'F6']), plSpark(['G5', 'Bb5', 'Eb6', 'G6']),
      mel('Eb5 Ab5 C6 Eb6 C6 Ab5 Bb5 C6', 'x.x. x.x_ x.x. x_x_'),
      mel('Eb6 D6 C6 G5 Eb5 G5 C6 D6', 'x.x. x.x_ x.x. x_x_'),
      mel('F5 Ab5 Db6 F6 Eb6 Db6 C6 Db6', 'x.x. x.x_ x.x. x_x_'),
      mel('Eb6 Bb5 G5 Eb5 G5 Bb5 Eb6', 'x_x_ x_x_ x_x_ x___'),
      mel('C6 Ab5 F5 Ab5 C6 F6 Eb6 C6', 'x.x. x.x_ x.x. x_x_'),
      mel('Db6 F6 Ab6 F6 Db6 Ab5 Bb5 C6', 'x.x. x.x_ x.x. x_x_'),
      mel('Eb6 C6 Ab5 Eb5 Ab5 C6 Eb6 Ab6', 'x.x. x.x_ x.x. x_x_'),
      mel('Db6 Bb5 F5 Bb5 G5 Bb5 Eb6', 'x.x. x.x_ x_x_ x___'),
      plSpark(['F5', 'Ab5', 'Db6', 'F6']), plSpark(['G5', 'Bb5', 'Eb6', 'G6']), plSpark(['G5', 'C6', 'Eb6', 'G6']), pat(['F5', 'Ab5', 'Bb5', 'D6'], '0123 1230 2301 3...'),
    ],
    piano: [
      offbeat(plAb), offbeat(plFm), offbeat(plDb), offbeat(plEb),
      offbeat(plAb), offbeat(plCm), offbeat(plDb), offbeat(plEb),
      offbeat(plFm), offbeat(plDb), offbeat(plAb), mel(`${plBbm} ${plBbm} ${plEb} ${plEb}`, '..x_ ..x_ ..x_ ..x_'),
      p332(plDb), p332(plEb), mel(`${plCm} ${plCm} ${plCm} ${plFm} ${plFm} ${plFm}`, 'x__x __x_ x__x __x_'), mel('Ab4+Bb4+D5 Ab4+Bb4+D5 Ab4+Bb4+D5 G4+Bb4+Eb5', 'x__x __x_ x___ ____'),
    ],
    bell: [...rest(12), mel('F6 Ab6 Db7 C7', 'x_x_ x___ x___ ____'), mel('G6 Bb6 Eb7 D7', 'x_x_ x___ x___ ____'), mel('G6 C7 Ab6 F6', 'x___ x___ x___ x___'), mel('D7 Ab6 G6 Eb6', 'x___ x___ x___ x___')],
    pad: [
      'Ab3+C4+Eb4:16', 'Ab3+C4+F4:16', 'Ab3+Db4+F4:16', 'G3+Bb3+Eb4:16',
      ...rest(8),
      'Ab3+Db4+F4:16', 'G3+Bb3+Eb4:16', 'G3+C4+Eb4:8 Ab3+C4+F4:8', 'Ab3+Bb3+D4:8 G3+Bb3+Eb4:8',
    ],
    bass: [
      bounce('Ab1', 'Ab2'), bounce('F1', 'F2'), bounce('Db2', 'Db3'), bounce('Eb2', 'Eb3'),
      bounce('Ab1', 'Ab2'), bounce('C2', 'C3'), bounce('Db2', 'Db3'), bounce('Eb2', 'Eb3'),
      bounce('F1', 'F2'), bounce('Db2', 'Db3'), bounce('C2', 'C3'), mel('Bb1 Bb2 Bb1 Bb2 Eb2 Eb3 Eb2 Eb3', 'x__x x_x_ x__x x_x_'),
      bounce('Db2', 'Db3'), bounce('Eb2', 'Eb3'), mel('C2 C3 C2 C3 F1 F2 F1 F2', 'x__x x_x_ x__x x_x_'), mel('Bb1 Bb2 Bb1 Bb2 Eb2 Eb3', 'x__x x_x_ x__x ....'),
    ],
    drums: [
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, HH],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... .ttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, dr('.... c... .... ....'), dr('hhoh hhoh .... ....'), dr('.... .... tttt tttt')],
    ],
  },

  // Rohr-Lagune (3-5, unter Wasser): 118 BPM, Des-Dur mit lydischer Quarte, 16 Takte, Kick auf 1 und 3.
  // Form: 4 Takte gedämpfte Piano-Akkorde (Desmaj7 b7 Gesmaj7 Assus–As) und Blasen (Sinus-Plucks gleiten aufwärts)
  //       | 8 Takte Hoover hinter Tiefpass (~1 kHz, wie durchs Wasser gehört) in langen Bögen (Desmaj7 f7 Gesmaj7
  //       es7–As | b7 Gesmaj7 Des/F es7–As) | 4 Takte Piano und Blasen (Gesmaj7 As f7–b7 es7–As7).
  //       Langes Echo (Abgriffe 3 und 5 Sechzehntel) auf Blasen, Lead und Piano.
  course_water: {
    bpm: 118,
    voice: {
      lead: { cutoff: 1000, voices: 3, volume: 0.2, q: 1.5 },
      piano: { volume: 0.13, cutoff: 2200, cutoffEnd: 800 },
      pad: { volume: 0.055, bright: 0.7 },
      arp: { type: 'sine', volume: 0.1, decay: 0.06, glide: 1.7, glideTime: 0.05 },
      bass: { cutoff: 480, volume: 0.22 },
    },
    kit: { kick: { pitchStart: 120, click: 0.08, volume: 0.56, decay: 0.3 }, clap: { volume: 0.24 }, hat: { volume: 0.32, off: 0.2 }, open: { volume: 0.18 } },
    fx: {
      lowpass: { lead: 1100, piano: 1500, pad: 1300 },
      delay: { steps: [3, 5], feedback: 0.5, lowpass: 1800, wet: 0.45, send: { arp: 0.6, lead: 0.35, piano: 0.4, clap: 0.3 } },
    },
    lead: [
      ...rest(4),
      mel('F5 Ab5 C6 Ab5', 'x___ ____ x_x_ x___'),
      mel('Ab5 G5 F5 Eb5', 'x___ ____ x_x_ x___'),
      mel('Db5 F5 Bb5 Ab5', 'x___ ____ x_x_ x___'),
      mel('Gb5 F5 Eb5 C5', 'x___ __x_ x___ x___'),
      mel('Db6 C6 Bb5 F5', 'x___ ____ x_x_ x___'),
      mel('Bb5 Ab5 F5 Db5', 'x___ ____ x_x_ x___'),
      mel('Ab5 F5 Db6 C6', 'x___ ____ x_x_ x___'),
      mel('Bb5 Ab5 Gb5 Eb5', 'x___ __x_ x___ x___'),
      ...rest(4),
    ],
    piano: [
      hit('Ab4+C5+F5', 'x__. ..x_ .... ....'), hit('Ab4+Db5+F5', 'x__. ..x_ .... ....'), hit('Bb4+Db5+F5', 'x__. ..x_ .... ....'), mel('Ab4+Db5+Eb5 Ab4+C5+Eb5', 'x__. ..x_ .... ....'),
      ...rest(8),
      hit('Bb4+Db5+F5', 'x__. ..x_ .... ....'), hit('Ab4+C5+Eb5', 'x__. ..x_ .... ....'), mel('Ab4+C5+Eb5 Ab4+Db5+F5', 'x__. .... x__. ....'), mel('Gb4+Bb4+Db5 Gb4+C5+Eb5', 'x__. .... x__. ....'),
    ],
    arp: rep(4, bubbles).flat(),
    pad: [
      'Db3+F3+Ab3+C4:16', 'Db3+F3+Ab3+Bb3:16', 'Db3+F3+Bb3:16', 'Db3+Eb3+Ab3:8 C3+Eb3+Ab3:8',
      'Db3+F3+Ab3+C4:16', 'C3+Eb3+F3+Ab3:16', 'Db3+F3+Bb3:16', 'Db3+Gb3+Bb3:8 C3+Eb3+Ab3:8',
      'Db3+F3+Ab3+Bb3:16', 'Db3+F3+Bb3:16', 'C3+F3+Ab3:16', 'Db3+Gb3+Bb3:8 C3+Eb3+Ab3:8',
      'Db3+F3+Bb3:16', 'C3+Eb3+Ab3:16', 'C3+Eb3+Ab3:8 Db3+F3+Bb3:8', 'Db3+Gb3+Bb3:8 C3+Gb3+Ab3:8',
    ],
    bass: [
      waBass('Db2', 'Ab1'), waBass('Bb1', 'F2'), waBass('Gb1', 'Db2'), waBass('Ab1', 'Ab1'),
      waBass('Db2', 'Ab1'), waBass('F1', 'C2'), waBass('Gb1', 'Db2'), waBass('Eb2', 'Ab1'),
      waBass('Bb1', 'F2'), waBass('Gb1', 'Db2'), waBass('F1', 'Db2'), waBass('Eb2', 'Ab1'),
      waBass('Gb1', 'Db2'), waBass('Ab1', 'Eb2'), waBass('F1', 'Bb1'), waBass('Eb2', 'Ab1'),
    ],
    drums: [
      [...WATER, CR], WATER, WATER, WATER, [...WATER, CR], WATER, WATER, [KH, CL, dr('h.h. h.h. hhhh hhhh')],
      [...WATER, CR], WATER, WATER, WATER, [...WATER, CR], WATER, WATER, [KH, dr('.... c... .... ....'), dr('h.h. h.h. h.h. o...')],
    ],
  },

  // Bergrennen (3-6): 150 BPM, cis-Moll, 16 Takte, treibend wie ein Kart-Rennen.
  // Form: 4 Takte Rechteck-Arpeggien in Sechzehnteln, Offbeat-Stabs, Galopp-Bass (cis A E H) | 8 Takte
  //       Hoover-Riff mit Tonwiederholungen „Motor dreht hoch“ (cis A fis Gis7 | cis A E H) | 4 Takte harte
  //       Synkopen-Stabs und Arpeggien (A H cis Gis7), Riser über den Schlusstakt.
  course_race: {
    bpm: 150,
    voice: {
      arp: { type: 'square', volume: 0.045, decay: 0.07 },
      lead: { cutoff: 5000 },
      stabs: { volume: 0.13 },
      riser: { volume: 0.08 },
    },
    kit: { tom: { freq: 200, volume: 0.4 } },
    fx: { lowpass: { arp: 4500 } },
    arp: [
      raArp(['C#5', 'E5', 'G#5', 'C#6']), raArp(['C#5', 'E5', 'A5', 'C#6']), raArp(['B4', 'E5', 'G#5', 'B5']), raArp(['B4', 'D#5', 'F#5', 'B5']),
      ...rest(8),
      raArp(['C#5', 'E5', 'A5', 'C#6']), raArp(['B4', 'D#5', 'F#5', 'B5']), raArp(['C#5', 'E5', 'G#5', 'C#6']), raArp(['C5', 'D#5', 'F#5', 'G#5']),
    ],
    lead: [
      ...rest(4),
      mel('C#5 C#5 E5 C#5 G#5 F#5 E5 D#5 E5', 'x.xx x_x_ x_x_ x_x_'),
      mel('C#5 C#5 E5 C#5 A5 G#5 F#5 E5 F#5', 'x.xx x_x_ x_x_ x_x_'),
      mel('A4 A4 C#5 A4 F#5 E5 C#5 B4 C#5', 'x.xx x_x_ x_x_ x_x_'),
      mel('G#4 C5 D#5 F#5 G#5 F#5 D#5 C5', 'x_x_ x_x_ x_x_ x_x_'),
      mel('C#5 C#5 E5 C#5 G#5 F#5 E5 D#5 E5', 'x.xx x_x_ x_x_ x_x_'),
      mel('C#5 C#5 E5 C#5 A5 G#5 F#5 E5 F#5', 'x.xx x_x_ x_x_ x_x_'),
      mel('B4 B4 E5 B4 G#5 F#5 E5 D#5 E5', 'x.xx x_x_ x_x_ x_x_'),
      mel('D#5 F#5 B5 A5 G#5 F#5 D#5 B4', 'x_x_ x_x_ x_x_ x_x_'),
      ...rest(4),
    ],
    stabs: [
      ...[raCsm, raA, raE, raB].map((c) => hit(c, '..x. ..x. ..x. ..x.')),
      ...[raCsm, raA, raFsm, raGs7, raCsm, raA, raE, raB].map((c) => hit(c, '.... ..x_ .... ..x_')),
      ...[raA, raB, raCsm].map((c) => hit(c, 'x..x ..x. .x.. x.x.')), hit(raGs7, 'x..x ..x. .... ....'),
    ],
    riser: [...rest(15), 'G#3:16'],
    bass: [
      gallop('C#2', 'C#3'), gallop('A1', 'A2'), gallop('E2', 'E3'), gallop('B1', 'B2'),
      gallop('C#2', 'C#3'), gallop('A1', 'A2'), gallop('F#1', 'F#2'), gallop('G#1', 'G#2'),
      gallop('C#2', 'C#3'), gallop('A1', 'A2'), gallop('E2', 'E3'), gallop('B1', 'B2'),
      gallop('A1', 'A2'), gallop('B1', 'B2'), gallop('C#2', 'C#3'), mel('G#1 G#2 G#1 G#2', 'x.x_ x.x_ .... ....'),
    ],
    drums: [
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... ssss')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH, dr('..s. ..s. ..s. ..s.')], [K4, dr('.... c... .... ....'), dr('hhhh hhhh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Herbstwald-Schalttafeln (3-7): 134 BPM, A-Dorisch (Fis), 16 Takte, warm und rollend.
  // Form: 4 Takte Gitarren-Pluck (Sägezahn, Tiefpass) im rollenden Muster über a7 D a7 D, Piano-Offbeats |
  //       8 Takte warmer Hoover (Fmaj7 G a7 D | Fmaj7 G e7 a7), Piano-Stabs auf den „Weichen“ (2+ und 4+) |
  //       4 Takte Gitarre und Piano 3-3-2 (F G e–a D), Snare-Wirbel.
  course_autumn: {
    bpm: 134,
    voice: {
      arp: { type: 'sawtooth', volume: 0.07, decay: 0.12 },
      lead: { cutoff: 3000, volume: 0.17 },
      piano: { volume: 0.1, oscs: 1 },
      pad: { volume: 0.045, bright: 0.85 },
      bass: { cutoff: 700 },
    },
    kit: { tom: { freq: 170, volume: 0.36 } },
    fx: { lowpass: { arp: 2200 }, delay: { steps: 3, feedback: 0.3, lowpass: 2500, wet: 0.3, send: { arp: 0.4, lead: 0.2 } } },
    arp: [auGuit(auAm), auGuit(auD), auGuit(auAm), auGuit(auD), ...rest(8), auGuit(auF), auGuit(auG), pat(['E3', 'B3', 'E4', 'A4'], '0.12 .30. 12.3 0.21'), auGuit(auD)],
    lead: [
      ...rest(4),
      mel('A4 C5 E5 F5 E5 C5', 'x__x __x_ x_x_ x___'),
      mel('B4 D5 G5 F#5 D5 B4', 'x__x __x_ x_x_ x___'),
      mel('C5 E5 A5 G5 E5 D5', 'x__x __x_ x_x_ x___'),
      mel('F#5 E5 D5 A4', 'x___ x_x_ x___ ____'),
      mel('A5 G5 F5 E5 C5 E5', 'x__x __x_ x_x_ x___'),
      mel('G5 F#5 D5 B4 D5 G5', 'x__x __x_ x_x_ x___'),
      mel('E5 G5 B5 A5 G5 D5', 'x__x __x_ x_x_ x___'),
      mel('E5 C5 A4', 'x___ x___ x___ ____'),
      ...rest(4),
    ],
    piano: [
      offbeat(auPAm), offbeat(auPD), offbeat(auPAm), hit(auPD, '..x_ ..x_ ..x_ .xx_'),
      ...[auPF, auPG, auPAm, auPD, auPF, auPG, auPEm, auPAm].map((c) => hit(c, '.... ..x_ .... ..x_')),
      p332(auPF), p332(auPG), mel(`${auPEm} ${auPEm} ${auPEm} ${auPAm} ${auPAm} ${auPAm}`, 'x__x __x_ x__x __x_'), hit(auPD, 'x__x __x_ x___ ____'),
    ],
    pad: [
      'A3+C4+E4+G4:16', 'A3+D4+F#4:16', 'A3+C4+E4+G4:16', 'A3+D4+F#4:16',
      'A3+C4+E4:16', 'B3+D4+G4:16', 'A3+C4+E4+G4:16', 'A3+D4+F#4:16',
      'A3+C4+E4:16', 'B3+D4+G4:16', 'B3+D4+E4+G4:16', 'A3+C4+E4+G4:16',
      'A3+C4+F4:16', 'B3+D4+G4:16', 'B3+E4+G4:8 A3+C4+E4:8', 'A3+D4+F#4:16',
    ],
    bass: [
      bounce('A1', 'A2'), bounce('D2', 'D3'), bounce('A1', 'A2'), bounce('D2', 'D3'),
      bounce('F1', 'F2'), bounce('G1', 'G2'), bounce('A1', 'A2'), bounce('D2', 'D3'),
      bounce('F1', 'F2'), bounce('G1', 'G2'), bounce('E1', 'E2'), bounce('A1', 'A2'),
      bounce('F1', 'F2'), bounce('G1', 'G2'), mel('E1 E2 E1 E2 A1 A2 A1 A2', 'x__x x_x_ x__x x_x_'), mel('D2 D3 D2 D3', 'x__x x_x_ .... ....'),
    ],
    drums: [
      [K4, CL, H8O, CR], [K4, CL, H8O], [K4, CL, H8O], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... .ttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, dr('hhoh hhoh hhoh ....'), dr('.... .... .... ssss')],
      [K4, CL, H8O, CR], [K4, CL, H8O], [K4, CL, H8O], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Projektil-Express (3-Zug, Autoscroller + Boss Schattenläuferin): 146 BPM, G-Mixolydisch, 16 Takte, rollend.
  // Form: 4 Takte „Tschu-ku-tschu“: Hats und Bass in 1-0-1-1, Dampfpfeife (Sinus mit Gleiten) über G F C G |
  //       8 Takte schaukelnder Hoover-Riff (G F C D | e C F D), Offbeat-Stabs ab Takt 9 | 4 Takte Stabs und
  //       Pfeife (G F C D), Riser in den Loop.
  course_train: {
    bpm: 146,
    voice: {
      whistle: { type: 'sine', volume: 0.1, vibrato: 10, rate: 5, slide: 2, attack: 0.04 },
      lead: { cutoff: 4400 },
      stabs: { volume: 0.12 },
      bass: { cutoff: 800 },
      riser: { volume: 0.08 },
    },
    kit: { snare: { volume: 0.14 }, hat: { volume: 0.3, off: 0.16 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.3, send: { whistle: 0.45 } } },
    whistle: [
      mel('D6 B5', 'x___ __.. x___ ____'), '-:16', '-:16', mel('D6 B5', '.... .... x_.. x___'),
      ...rest(8),
      mel('D6 B5', 'x___ __.. x___ ____'), '-:16', mel('E6 C6', 'x___ __.. x___ ____'), mel('F#6 D6', 'x___ __.. x___ ....'),
    ],
    lead: [
      ...rest(4),
      mel('D5 G5 A5 B5 A5 G5 F5 G5', 'x_x_ x_xx _x_x x___'),
      mel('C5 F5 G5 A5 G5 F5 E5 F5', 'x_x_ x_xx _x_x x___'),
      mel('E5 G5 A5 C6 B5 A5 G5 E5', 'x_x_ x_xx _x_x x___'),
      mel('F#5 A5 D6 C6 A5', 'x_x_ x___ x_x_ ____'),
      mel('E5 G5 B5 A5 G5 E5 D5 E5', 'x_x_ x_xx _x_x x___'),
      mel('E5 G5 C6 B5 A5 G5 E5 G5', 'x_x_ x_xx _x_x x___'),
      mel('F5 A5 C6 Bb5 A5 G5 F5 A5', 'x_x_ x_xx _x_x x___'),
      mel('A5 F#5 D5 A4 D5', 'x_x_ x___ x_x_ ____'),
      ...rest(4),
    ],
    stabs: [
      ...rest(8),
      ...[trEm, trC, trF, trD].map((c) => hit(c, '..x. ..x. ..x. ..x.')),
      ...[trG, trF, trC].map((c) => hit(c, 'x..x ..x. ..x. x...')), hit(trD, 'x..x ..x. .... ....'),
    ],
    pad: ['G3+B3+D4:16', 'F3+A3+C4:16', 'G3+C4+E4:16', 'G3+B3+D4:16', ...rest(12)],
    riser: [...rest(15), 'D4:16'],
    bass: [
      chug('G1', 'G2'), chug('F1', 'F2'), chug('C2', 'C3'), chug('G1', 'G2'),
      chug('G1', 'G2'), chug('F1', 'F2'), chug('C2', 'C3'), chug('D2', 'D3'),
      chug('E1', 'E2'), chug('C2', 'C3'), chug('F1', 'F2'), chug('D2', 'D3'),
      chug('G1', 'G2'), chug('F1', 'F2'), chug('C2', 'C3'), mel('D2 D2 D3 D2 D2 D3', 'x.xx x.xx .... ....'),
    ],
    drums: [
      [...CHUG, CR], CHUG, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... .... ssss')],
      [...CHUG, CR], CHUG, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... .... tttt')],
      [...CHUG, CR], CHUG, CHUG, [K4, CL, dr('h.hh h.hh h.hh ....'), dr('.... .... ..ss ssss')],
      [...CHUG, CR], CHUG, CHUG, [K4, dr('.... c... .... ....'), dr('h.hh h.hh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Himmels-Kettenzaun (3-2, Autoscroller im Himmel): 136 BPM, D-Lydisch (Gis), 16 Takte, luftig.
  // Form: 4 Takte helle Pads und Dreieck-Arpeggien (D E/D D E/D – die lydische Quarte hebt ab) | 8 Takte
  //       schwebender Hoover in großen Tönen (h G D/Fis Asus–A | D E/D fis G) | 4 Takte Glocken über den
  //       Arpeggien (e7 A h–G E/D), offene Hats auf jeder „und“.
  course_skyway: {
    bpm: 136,
    voice: {
      arp: { type: 'triangle', volume: 0.065, decay: 0.1 },
      lead: { cutoff: 4800, volume: 0.16 },
      pad: { volume: 0.055, bright: 1.4 },
      bell: { volume: 0.06, decay: 0.55, ratio: 2.76, partial: 0.35 },
    },
    kit: { open: { volume: 0.2 } },
    fx: { delay: { steps: [3, 4], feedback: 0.4, lowpass: 4200, wet: 0.35, send: { arp: 0.45, bell: 0.55, lead: 0.25 } } },
    arp: [
      skArp(skD), skArp(skE), skArp(skD), skArp(skE),
      skArp(skBm), skArp(skG), skArp(skD), skArp(skA),
      skArp(skD), skArp(skE), skArp(skFsm), skArp(skG),
      skArp(skEm), skArp(skA), skArp(skBm), skArp(skE),
    ],
    lead: [
      ...rest(4),
      mel('F#5 B5 D6 C#6', 'x___ x___ x___ x___'),
      mel('B5 A5 G5 D5', 'x___ ____ x_x_ x___'),
      mel('A5 F#5 D6 E6', 'x___ x___ x___ x___'),
      mel('D6 C#6', 'x___ ____ x___ ____'),
      mel('F#6 E6 D6 A5', 'x___ x___ x_x_ ____'),
      mel('G#5 B5 E6 D6', 'x___ x___ x___ x___'),
      mel('C#6 A5 F#5 A5', 'x___ x___ x___ x___'),
      mel('B5 D6 G6 F#6', 'x___ x___ x_x_ ____'),
      ...rest(4),
    ],
    bell: [...rest(12), mel('B6 G6 E6 G6', 'x___ x___ x___ x___'), mel('C#7 A6 E6 A6', 'x___ x___ x___ x___'), mel('D7 B6 G6 B6', 'x___ x___ x___ x___'), mel('G#6 E6 B5', 'x___ x___ x___ ____')],
    pad: [
      'D4+F#4+A4:16', 'D4+E4+G#4+B4:16', 'D4+F#4+A4:16', 'D4+E4+G#4+B4:16',
      'D4+F#4+B4:16', 'D4+G4+B4:16', 'D4+F#4+A4:16', 'D4+E4+A4:8 C#4+E4+A4:8',
      'D4+F#4+A4:16', 'D4+E4+G#4+B4:16', 'C#4+F#4+A4:16', 'D4+G4+B4:16',
      'D4+E4+G4+B4:16', 'C#4+E4+A4:16', 'D4+F#4+B4:8 D4+G4+B4:8', 'D4+E4+G#4+B4:16',
    ],
    bass: [
      pump('D2', 'D3'), pump('D2', 'D3'), pump('D2', 'D3'), pump('D2', 'D3'),
      pump('B1', 'B2'), pump('G1', 'G2'), pump('F#1', 'F#2'), pump('A1', 'A2'),
      pump('D2', 'D3'), pump('D2', 'D3'), pump('F#1', 'F#2'), pump('G1', 'G2'),
      pump('E1', 'E2'), pump('A1', 'A2'), mel('B1 B2 B1 B2 G1 G2 G1 G2', 'x_x_ x_x_ x_x_ x_x_'), pump('D2', 'D3'),
    ],
    drums: [
      [...SKY, CR], SKY, SKY, [K4, CL, dr('h.o. h.o. hhhh hhhh')],
      [...SKY, CR], SKY, SKY, [K4, CL, dr('h.o. h.o. h.o. ....'), dr('.... .... .... .ttt')],
      [...SKY, CR], SKY, SKY, [K4, CL, dr('h.o. h.o. hhhh hhhh')],
      [...SKY, CR], SKY, SKY, [K4, dr('.... c... .... ....'), dr('h.o. h.o. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Weltkarte Welt 3: 116 BPM, F-Dur, 8 Takte, ruhig und freundlich – Kick auf 1 und 3, Clap auf 2 und 4.
  // Form: Pads (F a/E d B | F/A g7 B–C F–C), Piano-Melodie in Vierteln mit Glöckchen-Tupfern, leise Schellen.
  course_world3_map: {
    bpm: 116,
    voice: {
      piano: { volume: 0.12, cutoff: 4000 },
      pad: { volume: 0.05 },
      bell: { volume: 0.05, decay: 0.6, ratio: 2.76, partial: 0.35 },
      bass: { cutoff: 650 },
    },
    kit: { jingle: { volume: 0.16, off: 0.1 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3200, wet: 0.3, send: { piano: 0.3, bell: 0.5 } } },
    piano: [
      mel('C5 F5 A5 G5 F5', 'x___ x___ x_x_ x___'),
      mel('E5 A5 C6 B5 A5', 'x___ x___ x_x_ x___'),
      mel('D5 F5 A5 G5 F5', 'x___ x___ x_x_ x___'),
      mel('D5 F5 Bb5 A5', 'x___ x___ x___ x___'),
      mel('A5 C6 F6 E6 C6', 'x___ x___ x_x_ x___'),
      mel('Bb5 A5 G5 F5 D5', 'x___ x___ x_x_ x___'),
      mel('D5 F5 E5 G5', 'x___ x___ x___ x___'),
      mel('F5 E5 C5', 'x___ ____ x___ x___'),
    ],
    bell: ['-:12 C7:4', '-:16', '-:12 A6:4', '-:16', '-:12 F7:4', '-:16', '-:8 E7:4 G7:4', '-:16'],
    pad: ['F3+A3+C4:16', 'E3+A3+C4:16', 'D3+F3+A3:16', 'D3+F3+Bb3:16', 'C3+F3+A3:16', 'D3+F3+Bb3:16', 'D3+F3+Bb3:8 E3+G3+C4:8', 'F3+A3+C4:8 E3+G3+C4:8'],
    bass: [
      mel('F2 C2', 'x___ __.. x___ __..'), mel('E2 A1', 'x___ __.. x___ __..'), mel('D2 A1', 'x___ __.. x___ __..'), mel('Bb1 F2', 'x___ __.. x___ __..'),
      mel('A1 F2', 'x___ __.. x___ __..'), mel('G1 D2', 'x___ __.. x___ __..'), mel('Bb1 C2', 'x___ __.. x___ __..'), mel('F2 C2', 'x___ __.. x___ __..'),
    ],
    drums: [
      [KH, CL, dr('j.j. j.j. j.j. j.j.'), CR], [KH, CL, dr('j.j. j.j. j.j. j.j.')], [KH, CL, dr('j.j. j.j. j.j. j.j.')], [KH, CL, dr('j.j. j.j. j.j. jjjj')],
      [KH, CL, dr('j.j. j.j. j.j. j.j.')], [KH, CL, dr('j.j. j.j. j.j. j.j.')], [KH, CL, dr('j.j. j.j. j.j. j.j.')], [KH, CL, dr('j.j. j.j. jjjj jjjj')],
    ],
  },
};
