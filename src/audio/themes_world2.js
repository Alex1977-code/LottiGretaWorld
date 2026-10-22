// Kurs-Themen Welt 2 „Wüste mit Sandblöcken“ – eigene Kompositionen im Stil des 90er-Eurodance
// (Stil ja, Zitat nein). Format und Spuren siehe themes.js / Music.js, Bausteine in themeParts.js.

import { dr, K4, KH, CL, HH, H8, H8O, HUP, CR, rep, rest, mel, hit, pat, tr, shift, pump, gallop, bounce, walk, offbeat, p332 } from './themeParts.js';

// ---------------------------------------------------------------- Wüste ----
// D-Hidschas (D Es Fis G A B C – übermäßige Sekunde Es–Fis): Akkorde D, Es (bII), c-Moll, g-Moll.
const dD = 'D4+F#4+A4', dEb = 'Eb4+G4+Bb4', dCm = 'C4+Eb4+G4', dGm = 'D4+G4+Bb4';
const callD = mel('D5 Eb5 D5 F#5 G5 F#5 A5 G5 F#5 Eb5 D5', 'xxx. xxx. x_xx x_x_');
const callEb = mel('Eb5 F#5 Eb5 G5 A5 G5 Bb5 A5 G5 F#5 Eb5', 'xxx. xxx. x_xx x_x_');
const callCm = mel('C5 Eb5 C5 G5 F#5 G5 Bb5 A5 G5 F#5 Eb5', 'xxx. xxx. x_xx x_x_');
const callEnd = mel('A5 G5 F#5 Eb5 D5 C5 D5', 'xxxx x_.. x.x_ ____');
const desBass = {
  D: mel('D2 D3 D2 Eb2 D2 A1 C2', 'x_xx ..x_ x_.x x___'),
  Eb: mel('Eb2 Eb3 Eb2 D2 Eb2 Bb1 D2', 'x_xx ..x_ x_.x x___'),
  Cm: mel('C2 C3 C2 D2 C2 G1 Bb1', 'x_xx ..x_ x_.x x___'),
  Gm: mel('G1 G2 G1 A1 G1 D2 F#2', 'x_xx ..x_ x_.x x___'),
  CmD: mel('C2 C3 C2 D2 D3 A1 C2', 'x_xx ..x_ x_.x x___'),
};
const DARB = [K4, CL, dr('...d ..d. ...d ..d.'), dr('..p. ...p ..p. .p.p'), dr('..j. ..j. ..j. ..jj')];
const DARB_FILL = [K4, CL, dr('...d ..d. .... ....'), dr('..p. ...p pppp pppp'), dr('..j. ..j. .... ....')];

// ---------------------------------------------------------------- Weltraum ----
// E-Lydisch (Ais statt A): Emaj7, Fis/E (Lydische II über liegendem E), cis-Moll9, gis-Moll7, Amaj7 (geborgt), H.
const spArp = {
  E: ['E5', 'G#5', 'B5', 'D#6'], Fs: ['F#5', 'A#5', 'C#6', 'E6'], Cs: ['C#5', 'E5', 'G#5', 'D#6'],
  Gs: ['G#5', 'B5', 'D#6', 'F#6'], A: ['A5', 'C#6', 'E6', 'G#6'], B: ['B5', 'E6', 'F#6', 'B6'],
};
const sparkle = (n) => pat(n, '0123 2103 1230 3210');
const spPad = ['E3+G#3+B3+D#4:16', 'E3+A#3+C#4+F#4:16', 'E3+G#3+B3+D#4:16', 'E3+A#3+C#4+F#4:16',
  'C#3+G#3+B3+D#4:16', 'F#3+G#3+B3+D#4:16', 'E3+G#3+A3+C#4:16', 'E3+F#3+B3:8 D#3+F#3+B3:8'];
const spBass = {
  E: mel('E2 B1', 'x___ __.. x___ __..'), Cs: mel('C#2 G#1', 'x___ __.. x___ __..'),
  Gs: mel('G#1 D#2', 'x___ __.. x___ __..'), A: mel('A1 E2', 'x___ __.. x___ __..'),
  B: mel('B1 F#2', 'x___ __.. x___ __..'),
};
const SPACE = [KH, CL, dr('h.h. h.h. h.h. h.o.')];

// ---------------------------------------------------------------- Schattenspiel ----
// g-Moll; Pizzicato-Ostinato (gebrochene Akkorde, Achtel staccato), die Melodie hat einen „Schatten“:
// dieselben Töne eine Achtel später, leiser und dunkler (echo-Spur, Hall).
const shOst = (n) => pat(n, '0.1. 2.1. 3.1. 2.1.');
const shGm = ['G4', 'Bb4', 'D5', 'G5'], shEb = ['G4', 'Bb4', 'Eb5', 'G5'], shD = ['F#4', 'A4', 'D5', 'F#5'], shCm = ['G4', 'C5', 'Eb5', 'G5'];
const shMelody = [
  mel('G4 Bb4 D5 C#5 D5 Bb4 G4 A4 Bb4', 'x.x. x.xx ..x. x.xx'),
  mel('C5 Eb5 G5 F#5 G5 Eb5 C5 D5 Eb5', 'x.x. x.xx ..x. x.xx'),
  mel('Bb4 Eb5 G5 Bb5 A5 G5 F5 Eb5', 'x.x. x.x. xxx. x...'),
  mel('D5 C5 Bb4 A4 F#4 G4 A4', 'x.x. x.x. x... x.x.'),
];
const shLead = [
  mel('C5 Eb5 G5 F5 Eb5', 'x__x __x_ x_x_ ____'),
  mel('D5 Bb4 G4 A4 Bb4', 'x__x __x_ x_x_ ____'),
  mel('C5 Eb5 Ab5 G5 F5 Eb5', 'x__x __x_ x_x_ x_._'),
  mel('D5 F#5 A5 C6 Bb5 A5', 'x__x __x_ x___ x_x_'),
];
const SHADOW = [K4, CL, H8O];

// ---------------------------------------------------------------- Rollhügel ----
// F-Dur, hüpfend: punktierte Hoover-Hook mit Oktavsprüngen, Tom-Rollen am Phrasenende, Glockenspiel.
const hF = 'A3+C4+F4', hC = 'G3+C4+E4', hDm = 'A3+D4+F4', hBb = 'Bb3+D4+F4';
const hFH = 'A4+C5+F5', hCH = 'G4+C5+E5', hDmH = 'A4+D5+F5', hBbH = 'Bb4+D5+F5';
const offPush = (ch) => hit(ch, '..x_ ..x_ ..x_ .xx_');
const ROLL = (fill) => [K4, CL, dr('hhoh hhoh hhoh hh..'), dr(fill)];

// ---------------------------------------------------------------- Spiegelfrucht ----
// A-Dur, Kanon über einer zweitaktigen Harmonie (A E/Gis | fis D E): vier zweitaktige Phrasen, die
// zueinander passen; jede neue Stimme ist ein „Klon“, der zwei Takte später dieselbe Folge spielt.
const P1 = [mel('C#5 B4', 'x___ ____ x___ ____'), mel('A4 F#4 G#4', 'x___ ____ x___ x___')];
const P2 = [mel('E5 C#5 B4 E5', 'x___ x___ x___ x___'), mel('C#5 A4 F#5 E5', 'x___ x___ x___ x___')];
const P3 = [mel('A5 G#5 A5 E5 G#5 F#5 E5 B4', 'x_x_ x_x_ x_x_ x_x_'), mel('C#5 E5 A5 F#5 D5 F#5 E5 G#5', 'x_x_ x_x_ x_x_ x_x_')];
const P4 = [mel('C#6 B5 A5 B5 C#6 E6 B5 A5 G#5 A5 B5 E5', 'xxxx x_x_ xxxx x_x_'), mel('A5 G#5 F#5 G#5 A5 C#6 D6 C#6 B5 A5 G#5 B5', 'xxxx x_x_ xxxx x_x_')];
const canon = [...P1, ...P2, ...P3, ...P4, ...P1, ...P2, ...P3, ...P4];
const chBassA = mel('A1 A2 A1 A2 G#1 G#2 G#1 G#2', 'x_x_ x_x_ x_x_ x_x_');
const chBassB = mel('F#1 F#2 F#1 F#2 D2 D3 E2 E3', 'x_x_ x_x_ x_x_ x_x_');

// ---------------------------------------------------------------- Panzerzug ----
// f-Moll, Marsch: punktierte Hoover-Melodie, harte Blech-Stabs, Marschtrommel-Rudimente auf der Snare.
const tFm = 'F3+Ab3+C4+F4', tDb = 'F3+Ab3+Db4+F4', tEb = 'G3+Bb3+Eb4+G4', tC = 'G3+C4+E4+G4', tBbm = 'F3+Bb3+Db4+F4', tAb = 'Ab3+C4+Eb4+Ab4';
const march = (ch) => hit(ch, 'x__x x... x__x x.x.');
const marchHard = (ch) => hit(ch, 'x.xx .x.x x.xx .xxx');
const MARCH = [K4, CL, HUP, dr('s..s s.s. s..s ss.s')];

// ---------------------------------------------------------------- Prüfungs-Haus ----
// b-Moll, 4 Takte, hektisch: Uhr-Ticken (Tick/Tack in Achteln), Sägezahn-Ostinato, Alarm-Hoover.
const hoBbm = 'F3+Bb3+Db4', hoGb = 'Gb3+Bb3+Db4', hoEbm = 'Gb3+Bb3+Eb4', hoF = 'F3+A3+C4+Eb4';
const TICK = dr('x.x. x.x. x.x. x.x.');

// ---------------------------------------------------------------- Karte Welt 2 ----
// G-Dur mit einem Hauch Wüste (As-Dur als phrygische bII), leise Darbuka.
const W2MAP = [KH, CL, dr('...d .... ...d ....'), dr('..p. ..p. ..p. .pp.'), H8O];

export const WORLD2_THEMES = {
  // Wüstenschlucht (2-1): 136 BPM, D-Hidschas (orientalisch: kleine Sekunde Es und übermäßige Sekunde Es–Fis), 16 Takte.
  // Form: 4 Takte Darbuka-Groove (Doum/Tek zwischen der Four-on-the-floor-Kick) über liegendem D–A-Bordun,
  //       Oud-artiger Sägezahn-Pluck mit Ruf-Motiv (D Es D C–D) und Hidschas-Bass-Riff | 8 Takte
  //       Schlangenbeschwörer-Hoover (D Es D c–D | D Es g D), Stabs auf 2+ und 4+ | 4 Takte Stabs in
  //       Synkopen über Es D c D, Ruf-Motiv kehrt zurück, Darbuka-Wirbel und Riser in den Loop.
  course_desert: {
    bpm: 136,
    voice: {
      lead: { cutoff: 4200 },
      arp: { type: 'sawtooth', volume: 0.06, decay: 0.13 },
      pad: { volume: 0.05, bright: 0.8 },
      bass: { cutoff: 760 },
      stabs: { volume: 0.13 },
      riser: { volume: 0.08 },
    },
    kit: { doum: { volume: 0.34, freq: 98 }, tek: { volume: 0.2, off: 0.75 }, jingle: { volume: 0.26, off: 0.2 }, clap: { volume: 0.32 } },
    fx: {
      lowpass: { arp: 2800 },
      delay: { steps: 3, feedback: 0.35, lowpass: 2400, wet: 0.35, send: { arp: 0.5, lead: 0.25, tek: 0.15 } },
    },
    arp: [callD, callEb, callD, callEnd, ...rest(8), callEb, callD, callCm, callEnd],
    lead: [
      ...rest(4),
      mel('D5 Eb5 F#5 G5 F#5 Eb5 D5 A4 C5', 'x_xx x_xx x___ ..xx'),
      mel('Eb5 D5 Eb5 F#5 G5 F#5 Eb5', 'x__x x_x_ x___ x_x_'),
      mel('A5 Bb5 A5 G5 F#5 G5 A5 F#5 G5', 'x_xx x_x_ x_x_ ..xx'),
      mel('A5 G5 F#5 Eb5 D5', 'x__x x_x_ x___ ___.'),
      mel('D5 Eb5 F#5 G5 F#5 Eb5 D5 A4 C5', 'x_xx x_xx x___ ..xx'),
      mel('Eb5 D5 Eb5 F#5 A5 Bb5 A5', 'x__x x_x_ x___ x_x_'),
      mel('Bb5 A5 G5 F#5 G5 A5 Bb5 A5', 'x__x x_x_ x_x_ x_x_'),
      mel('F#5 Eb5 D5 C5 D5', 'x_x_ x_x_ x___ ___.'),
      ...rest(4),
    ],
    stabs: [
      ...rest(4),
      ...[dD, dEb, dD].map((c) => hit(c, '.... ..x_ .... ..x_')), mel(`${dCm} ${dD}`, '.... ..x_ .... ..x_'),
      ...[dD, dEb, dGm, dD].map((c) => hit(c, '.... ..x_ .... ..x_')),
      ...[dEb, dD, dCm].map((c) => hit(c, 'x..x ..x. .x.. x.x.')), hit(dD, 'x..x ..x. .... ....'),
    ],
    pad: [
      ...rep(4, 'D3+A3:16'),
      'D3+F#3+A3:16', 'Eb3+G3+Bb3:16', 'D3+F#3+A3:16', 'C3+Eb3+G3:8 D3+F#3+A3:8',
      'D3+F#3+A3:16', 'Eb3+G3+Bb3:16', 'D3+G3+Bb3:16', 'D3+F#3+A3:16',
      'Eb3+G3+Bb3:16', 'D3+F#3+A3:16', 'C3+Eb3+G3:16', 'D3+A3:16',
    ],
    riser: [...rest(15), 'A3:16'],
    bass: [
      desBass.D, desBass.Eb, desBass.D, desBass.CmD,
      desBass.D, desBass.Eb, desBass.D, desBass.CmD,
      desBass.D, desBass.Eb, desBass.Gm, desBass.D,
      desBass.Eb, desBass.D, desBass.Cm, mel('D2 D3 D2 Eb2', 'x_xx ..x_ .... ....'),
    ],
    drums: [
      [...DARB, CR], DARB, DARB, DARB_FILL,
      [...DARB, CR], DARB, DARB, DARB_FILL,
      [...DARB, CR], DARB, DARB, DARB_FILL,
      [...DARB, CR], DARB, DARB, [K4, dr('.... c... .... ....'), dr('pppp pppp pppp pppp')],
    ],
  },

  // Weltraum (2-2): 124 BPM, E-Lydisch (schwebend), 16 Takte, halbes Tempo-Gefühl (Kick auf 1 und 3).
  // Form: 4 Takte Pads (Emaj7 Fis/E – die lydische Quarte Ais leuchtet) mit Sinus-Arpeggien im langen Hall |
  //       4 Takte Glocken-Melodie in großen Sprüngen (cis9 gis7 Amaj7 Hsus–H) | 4 Takte Glocken und Arpeggien
  //       über Emaj7 Fis/E | 4 Takte gefilterter Hoover in langen Tönen, Riser in den Loop.
  //       Hall: zwei Abgriffe (punktierte Achtel und Halbe), lange Rückkopplung.
  course_space: {
    bpm: 124,
    voice: {
      arp: { type: 'triangle', volume: 0.07, decay: 0.16 },
      bell: { volume: 0.075, decay: 0.8, ratio: 2.76, partial: 0.35 },
      pad: { volume: 0.06, bright: 1.2 },
      lead: { cutoff: 1900, voices: 3, volume: 0.15 },
      bass: { cutoff: 520, volume: 0.22 },
      riser: { volume: 0.07 },
    },
    kit: { kick: { pitchStart: 130, click: 0.12, volume: 0.55 }, clap: { volume: 0.3 }, hat: { volume: 0.26, off: 0.18 }, open: { volume: 0.18 } },
    fx: {
      lowpass: { lead: 2400 },
      delay: { steps: [6, 8], feedback: 0.55, lowpass: 3200, wet: 0.5, send: { arp: 0.55, bell: 0.7, pad: 0.2, clap: 0.35, lead: 0.3 } },
    },
    arp: [
      sparkle(spArp.E), sparkle(spArp.Fs), sparkle(spArp.E), sparkle(spArp.Fs),
      ...rest(4),
      sparkle(spArp.E), sparkle(spArp.Fs), sparkle(spArp.E), sparkle(spArp.Fs),
      sparkle(spArp.Cs), sparkle(spArp.Gs), sparkle(spArp.A), pat(spArp.B, '0123 2103 1230 ....'),
    ],
    bell: [
      ...rest(4),
      mel('G#5 D#6 E6 C#6', 'x___ x___ x_x_ ____'),
      mel('B5 F#6 D#6', 'x___ x___ x___ ____'),
      mel('C#6 E6 G#6 E6', 'x___ x___ x_x_ ____'),
      mel('F#6 E6 D#6', 'x___ ____ x___ x___'),
      mel('G#6 F#6 E6 D#6 B5', 'x___ x_x_ x___ x___'),
      mel('A#5 C#6 F#6 E6', 'x___ x___ x_x_ ____'),
      mel('D#6 B5 G#5 B5', 'x___ x___ x_x_ ____'),
      mel('C#6 A#5 F#5', 'x___ ____ x___ x___'),
      ...rest(4),
    ],
    lead: [...rest(12), 'E5:16', 'D#5:16', 'C#5:8 E5:8', 'F#5:8 D#5:8'],
    pad: [...spPad, ...spPad],
    riser: [...rest(15), 'B3:16'],
    bass: [
      spBass.E, spBass.E, spBass.E, spBass.E, spBass.Cs, spBass.Gs, spBass.A, spBass.B,
      spBass.E, spBass.E, spBass.E, spBass.E, spBass.Cs, spBass.Gs, spBass.A, mel('B1 B1', 'x___ __.. x___ __..'),
    ],
    drums: [
      [...SPACE, CR], SPACE, SPACE, SPACE, [...SPACE, CR], SPACE, SPACE, [KH, CL, dr('h.h. h.h. hhhh hhhh')],
      [...SPACE, CR], SPACE, SPACE, SPACE, [...SPACE, CR], SPACE, SPACE, [KH, dr('.... .... .... ....'), dr('h.h. h.h. h.h. o...')],
    ],
  },

  // Schattenspiel (2-3, unterirdisch): 126 BPM, g-Moll, 16 Takte, gedämpft.
  // Form: 4 Takte Pizzicato-Ostinato (kurze Dreieck-Plucks, g g Es D) über gestoßenem Lauf-Bass, weicher Kick |
  //       4 Takte Pizzicato-Melodie auf Zehenspitzen (g c Es D) mit ihrem Schatten eine Achtel später |
  //       4 Takte gedämpfter Hoover (Tiefpass ~1,3 kHz) mit Schatten (c g As=bII D7) | 4 Takte Ostinato,
  //       gedämpfte Offbeat-Stabs (g Es c D), Tom-Fill.
  course_shadow: {
    bpm: 126,
    voice: {
      arp: { type: 'triangle', volume: 0.11, decay: 0.07 },
      echo: { type: 'triangle', volume: 0.05, decay: 0.07 },
      lead: { cutoff: 1300, voices: 3, volume: 0.17, q: 2 },
      bass: { cutoff: 520, volume: 0.22 },
      pad: { volume: 0.045, bright: 0.6 },
      stabs: { volume: 0.12, cutoff: 2600, cutoffEnd: 900 },
    },
    kit: {
      kick: { pitchStart: 110, pitchEnd: 44, click: 0.05, volume: 0.5, decay: 0.28 },
      clap: { volume: 0.22 },
      hat: { volume: 0.22, off: 0.14 },
      open: { volume: 0.15 },
      tom: { freq: 130, volume: 0.32 },
    },
    fx: {
      lowpass: { lead: 1300, stabs: 1700, echo: 1800 },
      delay: { steps: 3, feedback: 0.4, lowpass: 1500, wet: 0.45, send: { arp: 0.25, echo: 0.6, clap: 0.45, lead: 0.3 } },
    },
    arp: [shOst(shGm), shOst(shGm), shOst(shEb), shOst(shD), ...shMelody, ...rest(4), shOst(shGm), shOst(shEb), shOst(shCm), shOst(shD)],
    echo: [...rest(4), ...shift([...shMelody, ...shLead], 2, false), ...rest(4)],
    lead: [...rest(8), ...shLead, ...rest(4)],
    stabs: [...rest(12), ...['G3+Bb3+D4', 'G3+Bb3+Eb4', 'G3+C4+Eb4', 'F#3+A3+D4'].map((c) => hit(c, '..x. ..x. ..x. ..x.'))],
    pad: [
      'G2+D3+G3:16', 'G2+D3+Bb3:16', 'G2+Eb3+Bb3:16', 'F#2+D3+A3:16',
      'G2+D3+Bb3:16', 'G2+C3+Eb3:16', 'G2+Eb3+Bb3:16', 'F#2+D3+A3:16',
      'G2+C3+Eb3:16', 'G2+D3+Bb3:16', 'Ab2+C3+Eb3:16', 'F#2+C3+D3:16',
      'G2+D3+Bb3:16', 'G2+Eb3+Bb3:16', 'G2+C3+Eb3:16', 'F#2+D3+A3:16',
    ],
    bass: [
      walk('G1', 'D2', 'Bb1', 'D2'), walk('G1', 'D2', 'Bb1', 'A1'), walk('Eb2', 'Bb1', 'G1', 'Bb1'), walk('D2', 'A1', 'F#1', 'A1'),
      walk('G1', 'D2', 'Bb1', 'D2'), walk('C2', 'G1', 'Eb2', 'G1'), walk('Eb2', 'Bb1', 'G1', 'Bb1'), walk('D2', 'A1', 'F#1', 'A1'),
      walk('C2', 'G1', 'Eb2', 'G1'), walk('G1', 'D2', 'Bb1', 'D2'), walk('Ab1', 'Eb2', 'C2', 'Eb2'), walk('D2', 'A1', 'C2', 'F#1'),
      walk('G1', 'D2', 'Bb1', 'D2'), walk('Eb2', 'Bb1', 'G1', 'Bb1'), walk('C2', 'G1', 'Eb2', 'G1'), mel('D2 A1 D2', 'x_.. x_.. x___ ....'),
    ],
    drums: [
      [...SHADOW, CR], SHADOW, SHADOW, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... .ttt')],
      [...SHADOW, CR], SHADOW, SHADOW, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... tttt')],
      [...SHADOW, CR], SHADOW, SHADOW, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... .... .ttt')],
      [...SHADOW, CR], SHADOW, SHADOW, [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Rollhügel (2-4): 144 BPM, F-Dur, 16 Takte, fröhlich-hüpfend.
  // Form: 4 Takte Piano-Offbeats mit Schubs, hüpfender Oktav-Bass (F C/E d B) | 8 Takte punktierte Hoover-Hook
  //       mit Oktavsprüngen (F C/E d B | F C B C), Stabs auf 2+ und 4+, Tom-Rollen am Phrasenende („rollende
  //       Hügel“) | 4 Takte Rave-Piano 3-3-2 mit Glockenspiel-Gegenstimme (d B F/A–g C), Snare-Wirbel.
  course_hills: {
    bpm: 144,
    voice: {
      lead: { cutoff: 5000 },
      piano: { volume: 0.11 },
      bell: { volume: 0.06, decay: 0.35, ratio: 2.76, partial: 0.4 },
      stabs: { volume: 0.13 },
    },
    kit: { tom: { freq: 230, volume: 0.36 } },
    lead: [
      ...rest(3),
      mel('F4 G4 A4 Bb4', '.... .... x_x_ x_x_'),
      mel('C5 F5 A5 G5 F5 C5', 'x__x ..x_ x__x ..x_'),
      mel('C5 E5 G5 C6 Bb5 A5 G5', 'x__x ..x_ x__x x_x_'),
      mel('D5 F5 A5 D6 C6 A5 F5', 'x__x ..x_ x__x x_x_'),
      mel('Bb4 D5 F5 Bb5 A5 G5 F5 G5', 'x__x x_x_ x_x_ x_x_'),
      mel('C5 F5 A5 G5 F5 C5', 'x__x ..x_ x__x ..x_'),
      mel('E5 G5 C6 E6 D6 C6 G5', 'x__x ..x_ x__x x_x_'),
      mel('D5 F5 Bb5 D6 C6 Bb5 F5', 'x__x ..x_ x__x x_x_'),
      mel('G5 A5 Bb5 C6 C5', 'x___ x_x_ x___ ..x_'),
      ...rest(4),
    ],
    piano: [
      offPush(hFH), offPush(hCH), offPush(hDmH), offbeat(hBbH),
      ...rest(8),
      p332(hDmH), p332(hBbH), mel(`${hFH} ${hFH} ${hFH} ${'Bb4+D5+G5'} ${'Bb4+D5+G5'} ${'Bb4+D5+G5'}`, 'x__x __x_ x__x __x_'), hit(hCH, 'x__x __x_ x___ ____'),
    ],
    bell: [...rest(12), mel('A6 F6 D6 F6 A6 C7', 'x.x. x.x. x___ x___'), mel('D7 Bb6 F6 D6', 'x.x. x.x_ ____ ____'), mel('C7 A6 F6 A6 G6 Bb6', 'x.x. x.x. x___ x___'), mel('C7 G6 E6 C6', 'x.x. x.x_ ____ ____')],
    stabs: [...rest(4), ...[hF, hC, hDm, hBb, hF, hC, hBb, hC].map((c) => hit(c, '.... ..x_ .... ..x_')), ...rest(4)],
    pad: [
      'F3+A3+C4:16', 'E3+G3+C4:16', 'D3+F3+A3:16', 'D3+F3+Bb3:16',
      ...rest(8),
      'D3+F3+A3:16', 'D3+F3+Bb3:16', 'C3+F3+A3:8 D3+G3+Bb3:8', 'E3+G3+C4:16',
    ],
    bass: [
      bounce('F1', 'F2'), bounce('E1', 'E2'), bounce('D2', 'D3'), bounce('Bb1', 'Bb2'),
      bounce('F1', 'F2'), bounce('E1', 'E2'), bounce('D2', 'D3'), bounce('Bb1', 'Bb2'),
      bounce('F1', 'F2'), bounce('C2', 'C3'), bounce('Bb1', 'Bb2'), mel('C2 C3 C2 C3 C2 C3 D2 E2', 'x__x x_x_ x_x_ x_x_'),
      bounce('D2', 'D3'), bounce('Bb1', 'Bb2'), mel('A1 A2 A1 A2 G1 G2 G1 G2', 'x__x x_x_ x__x x_x_'), mel('C2 C3 C2 C3', 'x__x x_x_ .... ....'),
    ],
    drums: [
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], ROLL('.... .... .... ..tt'),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], ROLL('.... .... .... tttt'),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], ROLL('.... .... .... tttt'),
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Spiegelfrucht-Pass (2-5, rosa Grasland): 132 BPM, A-Dur, 16 Takte, verspielt – ein Kanon, dessen Stimmen
  // sich „klonen“: über der zweitaktigen Harmonie A E/Gis | fis D E spielt das Piano vier zueinander passende
  // Phrasen (Halbe, Viertel, Achtel, Sechzehntel); zwei Takte später setzt das Glockenspiel als Klon eine
  // Oktave höher mit derselben Folge ein, nach vier Takten die Orgel eine Oktave tiefer; ab Takt 13 singt
  // der Hoover die Viertel-Phrase dazu. Zum Loop-Anfang verschwinden die Klone wieder.
  course_cherry: {
    bpm: 132,
    voice: {
      piano: { volume: 0.12, oscs: 1, cutoff: 4500 },
      bell: { volume: 0.06, decay: 0.4, ratio: 2.76, partial: 0.3 },
      organ: { volume: 0.04, cutoff: 2400, octave: false, gate: 0.8 },
      lead: { voices: 3, volume: 0.13, cutoff: 3800 },
      pad: { volume: 0.04 },
      stabs: { volume: 0.1 },
    },
    kit: { tom: { freq: 240, volume: 0.3 }, hat: { volume: 0.28, off: 0.17 } },
    fx: { delay: { steps: 3, feedback: 0.25, lowpass: 3500, wet: 0.25, send: { bell: 0.4, piano: 0.2 } } },
    piano: canon,
    bell: shift(tr(canon, 12), 32, false),
    organ: shift(tr(canon, -12), 64, false),
    lead: [...rest(12), ...P2, ...P2],
    stabs: [...rest(8), ...rep(2, [mel('A3+C#4+E4 G#3+B3+E4', '.... ..x. .... ..x.'), mel('F#3+A3+C#4 G#3+B3+E4', '.... ..x. .... ..x.')]).flat(),
      ...rep(2, [mel('A3+C#4+E4 A3+C#4+E4 G#3+B3+E4 G#3+B3+E4', '..x. ..x. ..x. ..x.'), mel('F#3+A3+C#4 F#3+A3+C#4 F#3+A3+D4 G#3+B3+E4', '..x. ..x. ..x. ..x.')]).flat()],
    pad: rep(8, ['A3+C#4+E4:8 G#3+B3+E4:8', 'F#3+A3+C#4:8 F#3+A3+D4:4 G#3+B3+E4:4']).flat(),
    bass: rep(8, [chBassA, chBassB]).flat(),
    drums: [
      [K4, CL, H8, CR], [K4, CL, H8], [K4, CL, HH], [K4, CL, HH, dr('.... .... .... ..tt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, HH, dr('.... .... .... tttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, CL, HH, dr('.... .... .... .ttt')],
      [K4, CL, HH, CR], [K4, CL, HH], [K4, CL, HH], [K4, dr('.... c... .... ....'), dr('hhoh hhoh .... ....'), dr('.... .... ssss ssss')],
    ],
  },

  // Panzerzug (2-Panzer, Autoscroller + Boss Wirbelbrocken): 138 BPM, f-Moll, 16 Takte, marschierend.
  // Form: 4 Takte Marsch: harte Vierklang-Stabs im Marschrhythmus (f Des Es C), Marschtrommel-Rudimente |
  //       8 Takte punktierte Hoover-Marschmelodie (f Des b C | f As Des C), Stabs auf den Vierteln |
  //       4 Takte Stabs in Sechzehntel-Synkopen (Des Es f C), anschwellender Wirbel und Riser in den Loop.
  course_tank: {
    bpm: 138,
    voice: {
      stabs: { volume: 0.16, cutoff: 7000, cutoffEnd: 2000 },
      lead: { cutoff: 4600 },
      riser: { volume: 0.09 },
    },
    kit: { snare: { volume: 0.15 }, tom: { freq: 150, volume: 0.42 }, clap: { volume: 0.34 } },
    lead: [
      ...rest(4),
      mel('C5 C5 F5 Ab5 G5 F5', 'x__x x___ x__x x___'),
      mel('F5 Eb5 Db5 Ab4 Ab4 Bb4', 'x__x x___ x___ ..xx'),
      mel('Bb4 Db5 F5 Bb5 Ab5 F5', 'x__x x___ x__x x___'),
      mel('G5 F5 E5 C5 E5 G5', 'x__x x___ x_x_ x___'),
      mel('C5 C5 F5 Ab5 G5 F5', 'x__x x___ x__x x___'),
      mel('C5 Eb5 Ab5 C6 Bb5 Ab5', 'x__x x___ x__x x___'),
      mel('Ab5 F5 Db5 F5 Ab5 Db6', 'x__x x___ x_x_ x___'),
      mel('C6 Bb5 G5 E5 G5', 'x___ x_x_ x___ x___'),
      ...rest(4),
    ],
    stabs: [
      march(tFm), march(tDb), march(tEb), march(tC),
      ...[tFm, tDb, tBbm, tC, tFm, tAb, tDb, tC].map((c) => hit(c, 'x... x... x... x...')),
      marchHard(tDb), marchHard(tEb), marchHard(tFm), hit(tC, 'x.xx .x.x .... ....'),
    ],
    riser: [...rest(15), 'C4:16'],
    bass: [
      pump('F1', 'F2'), pump('Db2', 'Db3'), pump('Eb2', 'Eb3'), pump('C2', 'C3'),
      pump('F1', 'F2'), pump('Db2', 'Db3'), pump('Bb1', 'Bb2'), pump('C2', 'C3'),
      pump('F1', 'F2'), pump('Ab1', 'Ab2'), pump('Db2', 'Db3'), pump('C2', 'C3'),
      gallop('Db2', 'Db3'), gallop('Eb2', 'Eb3'), gallop('F1', 'F2'), mel('C2 C3 C2 C3', 'x.x_ x.x_ .... ....'),
    ],
    drums: [
      [...MARCH, CR], MARCH, MARCH, [K4, CL, HUP, dr('s..s s.s. ssss ssss')],
      [...MARCH, CR], MARCH, MARCH, [K4, CL, HUP, dr('s..s s.s. s.ss ssss')],
      [...MARCH, CR], MARCH, MARCH, [K4, CL, HUP, dr('s..s s.s. tttt tttt')],
      [...MARCH, CR], MARCH, [K4, CL, HH, dr('s.s. s.s. s.s. ssss')], [K4, dr('.... c... .... ....'), dr('ssss ssss ssss ssss')],
    ],
  },

  // Prüfungs-Haus (2-Haus, 5 Räume à 10 s): 168 BPM, b-Moll, 4 Takte, kurz und hektisch.
  // Form: b Ges es F – Uhr-Ticken in Achteln (Tick/Tack), pochendes Sägezahn-Ostinato hinter Tiefpass,
  //       Alarm-Hoover (kleine Sekunde F–Ges), Stabs in Synkopen, Galopp-Bass; Takt 4 Riser und Wirbel.
  course_house: {
    bpm: 168,
    voice: {
      arp: { type: 'sawtooth', volume: 0.06, decay: 0.06 },
      lead: { voices: 3, volume: 0.15, cutoff: 4200 },
      stabs: { volume: 0.13 },
      riser: { volume: 0.07 },
    },
    kit: { tick: { volume: 0.14 }, hat: { volume: 0.22 }, snare: { volume: 0.22 } },
    fx: { lowpass: { arp: 2200 } },
    arp: [
      pat(['Bb4', 'F5', 'Db5', 'C5'], '0010 2010 0010 3020'),
      pat(['Bb4', 'Gb5', 'Db5', 'C5'], '0010 2010 0010 3020'),
      pat(['Bb4', 'Gb5', 'Eb5', 'Db5'], '0010 2010 0010 3020'),
      pat(['A4', 'F5', 'C5', 'Eb5'], '0010 2010 0010 3020'),
    ],
    lead: [
      mel('F5 Gb5 F5 Gb5 F5 Db5', 'x_x_ x_x_ x___ x___'),
      mel('F5 Gb5 F5 Gb5 Bb5 Db6', 'x_x_ x_x_ x___ x___'),
      mel('Eb5 Gb5 Bb5 Gb5 Eb5 Db5', 'x_x_ x_x_ x___ x___'),
      mel('C5 Eb5 F5 A5', 'x___ x___ x___ x___'),
    ],
    stabs: [hit(hoBbm, 'x..x ..x. .... ....'), hit(hoGb, 'x..x ..x. .... ....'), hit(hoEbm, 'x..x ..x. .... ....'), hit(hoF, 'x... x... x... ....')],
    riser: ['-:16', '-:16', '-:16', 'F3:13 -:3'],
    bass: [gallop('Bb1', 'Bb2'), gallop('Gb1', 'Gb2'), gallop('Eb2', 'Eb3'), gallop('F1', 'F2')],
    drums: [[K4, CL, TICK, CR], [K4, CL, TICK, dr('.... .... .... ..o.')], [K4, CL, TICK], [K4, CL, TICK, dr('.... .... .sss ssss')]],
  },

  // Weltkarte Welt 2: 120 BPM, G-Dur mit Wüstenfarbe (As-Dur als bII), 8 Takte, ruhig und freundlich –
  // Kick auf 1 und 3, Clap auf 2 und 4, leise Darbuka (Doum/Tek).
  // Form: Pads (G e C D | G As C–D G), Piano-Melodie in Vierteln, im 6. Takt die orientalische Wendung über As.
  course_world2_map: {
    bpm: 120,
    voice: {
      piano: { volume: 0.12, cutoff: 4000 },
      pad: { volume: 0.05 },
      bass: { cutoff: 650 },
    },
    kit: { doum: { volume: 0.26, freq: 100 }, tek: { volume: 0.14, off: 0.7 }, hat: { volume: 0.3, off: 0.2 }, open: { volume: 0.2 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.3, send: { piano: 0.3, tek: 0.2 } } },
    piano: [
      mel('D5 G5 B5 A5 G5', 'x___ x___ x_x_ x___'),
      mel('E5 G5 B5 A5 G5', 'x___ x___ x_x_ x___'),
      mel('E5 G5 C6 B5 A5', 'x___ x___ x_x_ x___'),
      mel('F#5 A5 D6 C6', 'x___ x___ x___ x___'),
      mel('B5 D6 G6 F#6 D6', 'x___ x___ x_x_ x___'),
      mel('C6 Eb6 Ab5 G5', 'x___ x___ x___ x___'),
      mel('E5 G5 F#5 A5', 'x___ x___ x___ x___'),
      mel('G5 D5 B4', 'x___ ____ x___ x___'),
    ],
    pad: ['G3+B3+D4:16', 'G3+B3+E4:16', 'G3+C4+E4:16', 'F#3+A3+D4:16', 'G3+B3+D4:16', 'Ab3+C4+Eb4:16', 'G3+C4+E4:8 F#3+A3+D4:8', 'G3+B3+D4:16'],
    bass: [
      mel('G1 D2', 'x___ __.. x___ __..'), mel('E2 B1', 'x___ __.. x___ __..'), mel('C2 G1', 'x___ __.. x___ __..'), mel('D2 A1', 'x___ __.. x___ __..'),
      mel('G1 D2', 'x___ __.. x___ __..'), mel('Ab1 Eb2', 'x___ __.. x___ __..'), mel('C2 D2', 'x___ __.. x___ __..'), mel('G1 D2', 'x___ __.. x___ __..'),
    ],
    drums: [[...W2MAP, CR], W2MAP, W2MAP, [KH, CL, dr('...d .... ...d ....'), dr('..p. ..p. pppp pppp'), H8], W2MAP, W2MAP, W2MAP, [KH, CL, dr('...d .... ...d ....'), dr('..p. ..p. ..p. pppp'), H8]],
  },
};
