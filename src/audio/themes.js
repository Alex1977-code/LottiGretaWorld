// Musikstücke im Stil der 90er-Eurodance-Zeit – eigene Kompositionen (Stil ja, Zitat nein).
//
// Tonale Spuren: Takt-Strings aus "Note:Dauer" (Dauer in Sechzehnteln), Akkorde mit "+" ("A4+C5+E5:2"),
// "-" = Pause; jeder Takt hat 16 Sechzehntel. Spuren: lead (Hoover), stabs, piano, pad, bass,
// energy (nur beim Reiten hörbar). Drums: je Takt mehrere Ebenen à 16 Zeichen –
// k Kick, c Clap, s Snare, h Hat geschlossen, o Hat offen, r Crash, "." nichts.

// ---- Drum-Bausteine ----
const K4 = 'k...k...k...k...';   // Four-on-the-floor
const CL = '....c.......c...';   // Clap auf 2 und 4
const HH = 'hhohhhohhhohhhoh';   // Sechzehntel-Hats, offen auf den Offbeat-Achteln
const H8 = 'h.h.h.h.h.h.h.h.';   // Achtel-Hats (ruhiger)
const H8O = 'h.h.h.h.h.h.h.o.';  // Achtel-Hats, offen auf der „und“ von 4 (Karte)
const beat = (...extra) => [K4, CL, HH, ...extra];

// ---- Akkord-Voicings (A-Moll) ----
const Am = 'A3+C4+E4', Fd = 'A3+C4+F4', Gd = 'G3+B3+D4', E7 = 'G#3+B3+E4';       // Stabs (Mittellage)
const AmH = 'A4+C5+E5', FdH = 'A4+C5+F5', GdH = 'G4+B4+D5', E7H = 'G#4+B4+E5';   // Piano / hohe Stabs

const rest = (n) => Array(n).fill('-:16');
/** Oktav-Bass: Achtel im Wechsel tief/hoch, optional mit Sechzehntel-Schluss. */
const pump = (lo, hi, fill = false) => (fill
  ? `${lo}:2 ${hi}:2 ${lo}:2 ${hi}:2 ${lo}:2 ${hi}:2 ${lo}:1 ${lo}:1 ${hi}:1 ${hi}:1`
  : `${lo}:2 ${hi}:2 ${lo}:2 ${hi}:2 ${lo}:2 ${hi}:2 ${lo}:2 ${hi}:2`);
/** Synkopierter Stab-Rhythmus (Schläge auf 3, 6, 11), optional mit Auftakt. */
const stabBar = (ch, pickup = false) => (pickup ? `-:3 ${ch}:1 -:2 ${ch}:2 -:3 ${ch}:1 -:1 ${ch}:1 -:2` : `-:3 ${ch}:1 -:2 ${ch}:2 -:3 ${ch}:1 -:4`);
/** Rave-Piano im 3-3-2-Muster. */
const pianoBar = (ch) => `${ch}:3 ${ch}:3 ${ch}:2 ${ch}:3 ${ch}:3 ${ch}:2`;

export const THEMES = {
  // Welt 1 – Herbstwald: 140 BPM, A-Moll, 16 Takte.
  // Form: 4 Takte Beat + Bass + Stabs | 8 Takte Hoover-Riff (2-taktiges Motiv, Variation über F/G und F/E)
  //       | 4 Takte Rave-Piano (Am F G E) mit Breakdown-Andeutung und Snare-Wirbel im letzten Takt.
  world1: {
    bpm: 140,
    energyDouble: 1, // beim Reiten: Lead eine Oktave höher gedoppelt
    lead: [
      ...rest(4),
      // Motiv (Am | Am)
      'A4:2 A4:1 -:1 C5:2 E5:2 -:1 D5:1 C5:2 A4:2 G4:2',
      'A4:2 -:2 E5:2 D5:2 C5:3 A4:1 -:2 G4:1 A4:1',
      // Variation (F | G)
      'A4:2 A4:1 -:1 C5:2 F5:2 -:1 E5:1 C5:2 A4:2 F4:2',
      'G4:2 -:2 D5:2 B4:2 G4:3 -:1 B4:2 D5:2',
      // Motiv (Am | Am), Schluss variiert
      'A4:2 A4:1 -:1 C5:2 E5:2 -:1 D5:1 C5:2 A4:2 G4:2',
      'A4:2 -:2 E5:2 D5:2 C5:3 A4:1 -:2 E4:1 G4:1',
      // Variation (F | E)
      'A4:2 A4:1 -:1 C5:2 F5:2 -:1 E5:1 C5:2 A4:2 F4:2',
      'E5:2 -:2 B4:2 E5:2 G#4:3 -:1 B4:2 E5:1 -:1',
      ...rest(3),
      '-:8 E5:8', // Riser in den Loop
    ],
    stabs: [
      stabBar(Am), stabBar(Am), stabBar(Fd), stabBar(Gd, true),
      `-:6 ${Am}:2 -:8`, `-:6 ${Am}:2 -:8`, `-:6 ${Fd}:2 -:8`, `-:6 ${Gd}:2 -:4 ${Gd}:1 -:1 ${Gd}:2`,
      `-:6 ${Am}:2 -:8`, `-:6 ${Am}:2 -:8`, `-:6 ${Fd}:2 -:8`, `-:6 ${E7}:2 -:4 ${E7}:1 -:1 ${E7}:2`,
      ...rest(4),
    ],
    piano: [
      ...rest(12),
      pianoBar(AmH), pianoBar(FdH), pianoBar(GdH), `${E7H}:3 ${E7H}:3 ${E7H}:2 ${E7H}:8`,
    ],
    pad: [
      ...rest(12),
      'A3+C4+E4:16', 'F3+A3+C4:16', 'G3+B3+D4:16', 'E3+G#3+B3:16',
    ],
    bass: [
      pump('A1', 'A2'), pump('A1', 'A2'), pump('F1', 'F2'), pump('G1', 'G2', true),
      pump('A1', 'A2'), pump('A1', 'A2'), pump('F1', 'F2'), pump('G1', 'G2', true),
      pump('A1', 'A2'), pump('A1', 'A2'), pump('F1', 'F2'), pump('E1', 'E2', true),
      pump('A1', 'A2'), pump('F1', 'F2'), pump('G1', 'G2'), 'E1:2 E2:2 E1:2 E2:2 -:8',
    ],
    // Energie-Ebene (Reiten): Offbeat-Stabs in Intro und Piano-Teil; im Riff doppelt der Lead (energyDouble)
    energy: [
      `-:2 ${AmH}:1 -:7 ${AmH}:1 -:3 ${AmH}:1 -:1`, `-:2 ${AmH}:1 -:7 ${AmH}:1 -:3 ${AmH}:1 -:1`,
      `-:2 ${FdH}:1 -:7 ${FdH}:1 -:3 ${FdH}:1 -:1`, `-:2 ${GdH}:1 -:7 ${GdH}:1 -:3 ${GdH}:1 -:1`,
      ...rest(8),
      `-:2 ${AmH}:1 -:7 ${AmH}:1 -:5`, `-:2 ${FdH}:1 -:7 ${FdH}:1 -:5`, `-:2 ${GdH}:1 -:7 ${GdH}:1 -:5`, `-:2 ${E7H}:1 -:7 ${E7H}:1 -:5`,
    ],
    drums: [
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhohhh..', '..............ss'],
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhohh...', '.............sss'],
      beat(), beat(), beat(), [K4, CL, 'hhohhhohhhoh....', '............ssss'],
      beat('r...............'), beat(), [K4, CL, H8], [K4, '....c...........', 'h.h.h.h.........', '........ssssssss'],
    ],
  },

  // Weltkarte: 128 BPM, D-Moll (Dm Bb F C), 8 Takte – ruhige Eurodance-Ballade/Breakdown:
  // Pad-Akkorde, Rave-Piano-Hook (4 Takte Akkord-Figur, 4 Takte Melodie), sanfter Beat, sparsamer Bass.
  map: {
    bpm: 128,
    pad: [
      'D4+F4+A4:16', 'Bb3+D4+F4:16', 'A3+C4+F4:16', 'G3+C4+E4:16',
      'D4+F4+A4:16', 'Bb3+D4+F4:16', 'A3+C4+F4:16', 'G3+C4+E4:16',
    ],
    piano: [
      '-:2 D4+F4+A4:2 -:2 D4+F4+A4:2 -:1 D4+F4+A4:1 -:2 F4+A4+D5:4',
      '-:2 D4+F4+Bb4:2 -:2 D4+F4+Bb4:2 -:1 F4+Bb4+D5:1 -:2 D4+F4+Bb4:4',
      '-:2 C4+F4+A4:2 -:2 C4+F4+A4:2 -:1 C4+F4+A4:1 -:2 F4+A4+C5:4',
      '-:2 C4+E4+G4:2 -:2 C4+E4+G4:2 -:1 E4+G4+C5:1 -:2 G4+C5+E5:4',
      'A4:2 -:2 D5:2 F5:2 E5:2 -:2 D5:4',
      '-:2 F5:2 D5:2 -:2 C5:2 D5:2 Bb4:4',
      'A4:2 -:2 C5:2 F5:2 E5:2 -:2 C5:4',
      '-:2 G5:2 E5:2 -:2 D5:2 E5:2 C5:2 -:2',
    ],
    bass: [
      'D2:6 -:4 D2:2 -:4', 'Bb1:6 -:4 Bb1:2 -:4', 'F2:6 -:4 F2:2 -:4', 'C2:6 -:4 C2:2 -:4',
      'D2:6 -:4 D2:2 -:4', 'Bb1:6 -:4 Bb1:2 -:4', 'F2:6 -:4 F2:2 -:4', 'C2:6 -:4 C2:2 -:2 A1:2',
    ],
    drums: [
      ['k.......k.......', CL, H8O, 'r...............'],
      ['k.......k.......', CL, H8O], ['k.......k.......', CL, H8O], ['k.......k.......', CL, H8O],
      ['k.......k.......', CL, H8O], ['k.......k.......', CL, H8O], ['k.......k.......', CL, H8O],
      ['k.......k.......', CL, 'h.h.h.h.h.h.hhhh'],
    ],
  },

  // Levelende: 140 BPM, 2 Takte, nicht wiederholt – Stab-Fanfare (i–bVII–bVI–V: Am G F E),
  // Snare-Wirbel, Crash und kurzer Hoover-Schlusston.
  complete: {
    bpm: 140,
    loop: false,
    stabs: [
      'A3+C4+E4+A4:3 G3+B3+D4+G4:3 F3+A3+C4+F4:2 E3+G#3+B3+E4:8',
      'A3+C4+E4+A4:4 -:12',
    ],
    lead: ['-:16', 'A4:8 -:8'],
    piano: ['-:16', `${AmH}:8 -:8`],
    bass: ['A1:3 G1:3 F1:2 E1:4 E2:4', 'A1:8 -:8'],
    drums: [
      [K4, '........ssssssss'],
      ['k...............', 'r...............'],
    ],
  },
};
