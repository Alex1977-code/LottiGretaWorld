// Musikstücke im Stil der 90er-Eurodance-Zeit – eigene Kompositionen (Stil ja, Zitat nein).
//
// Tonale Spuren: Takt-Strings aus "Note:Dauer" (Dauer in Sechzehnteln), Akkorde mit "+" ("A4+C5+E5:2"),
// "-" = Pause; jeder Takt hat 16 Sechzehntel. Spuren: lead (Hoover), stabs, piano, pad, bass,
// organ (Rechteck-Orgel), arp (Pluck-Arpeggio), echo (leise Verzögerungs-Noten), riser (Hoover-Riser),
// energy (nur beim Reiten hörbar). Drums: je Takt mehrere Ebenen à 16 Zeichen –
// k Kick, c Clap, s Snare, h Hat geschlossen, o Hat offen, r Crash, t Tom (Fill), "." nichts.
// Klangfarbe je Thema über `voice`, `kit` und `fx` (siehe Music.js); die Kurs-Themen nutzen das.
//
// Themen: world1, map, complete (Klassik-Spiel) und die Kurs-Themen course_grass, course_cave,
// course_circus, course_river, course_boss, course_arena, course_diorama, course_map, course_clear,
// course_star, course_gameover.

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

// ---- Bausteine der Kurs-Themen ----
const HOF = 'h.o.h.o.h.o.h.o.';  // geschlossen auf dem Schlag, offen auf jeder „und“ (luftig)
const CL4 = '............c...';  // Clap nur auf 4 (sanft)
/** Akkorde auf jeder Achtel-„und“ (House-Piano, Kirmes-Orgel „pa“); `last` ersetzt den letzten Schlag. */
const offbeat = (ch, last = ch) => `-:2 ${ch}:2 -:2 ${ch}:2 -:2 ${ch}:2 -:2 ${last}:2`;
/** Halbtakt-Wechsel der Offbeat-Akkorde (zwei Akkorde je Takt). */
const offbeat2 = (a, b) => `-:2 ${a}:2 -:2 ${a}:2 -:2 ${b}:2 -:2 ${b}:2`;
/** Hüpfender Oktav-Bass (punktiert): tief 3, hoch 1, tief 2, hoch 2 – zweimal. */
const bounce = (lo, hi) => `${lo}:3 ${hi}:1 ${lo}:2 ${hi}:2 ${lo}:3 ${hi}:1 ${lo}:2 ${hi}:2`;
/** Galopp-Bass: Grundton kurz auf dem Schlag, Oktave auf der „und“. */
const gallop = (lo, hi) => `${lo}:1 -:1 ${hi}:2 ${lo}:1 -:1 ${hi}:2 ${lo}:1 -:1 ${hi}:2 ${lo}:1 -:1 ${hi}:2`;
/** Humpa-Bass (Zirkus-Tuba): Grundton und Quinte im Wechsel, auf den Vierteln. */
const oompah = (root, fifth) => `${root}:2 -:2 ${fifth}:2 -:2 ${root}:2 -:2 ${fifth}:2 -:2`;
/** Sechzehntel-Arpeggio über vier Töne in fester Reihenfolge (Indizes 0–3). */
const ARP_ORDER = [0, 1, 2, 3, 1, 2, 3, 2, 0, 1, 2, 3, 2, 3, 1, 2];
const arp16 = (notes, order = ARP_ORDER) => order.map((i) => `${notes[i]}:1`).join(' ');
/** Spannungs-Ostinato in Sechzehnteln: Grundton pocht, dazwischen drei Nachbartöne. */
const ostinato = (r, a, b, c) => `${r}:1 ${r}:1 ${a}:1 ${r}:1 ${r}:1 ${b}:1 ${r}:1 ${a}:1 ${r}:1 ${r}:1 ${a}:1 ${r}:1 ${b}:1 ${r}:1 ${c}:1 ${b}:1`;
/** Achtel-Puls auf einem Ton (staccato). */
const pulse8 = (n) => `${n}:1 -:1 `.repeat(8).trim();
/** Ruhiger Bass: Grundton lang, kurzer Nachschlag, Quinte. */
const lazyBass = (r, f) => `${r}:6 -:2 ${r}:2 -:2 ${f}:2 -:2`;
/** Offbeat-Akkorde mit Sechzehntel-Schubs am Taktende (Piano-Stabs). */
const offPush = (ch) => `-:2 ${ch}:2 -:2 ${ch}:2 -:2 ${ch}:2 -:1 ${ch}:1 ${ch}:2`;

// Wiese (G-Dur, iv-Moll als Färbung)
const gG = 'G3+B3+D4', gD = 'F#3+A3+D4', gEm = 'G3+B3+E4', gC = 'G3+C4+E4';
const gGH = 'G4+B4+D5', gDH = 'F#4+A4+D5', gEmH = 'G4+B4+E5', gCH = 'G4+C5+E5', gCmH = 'G4+C5+Eb5';
// Höhle (E-Moll/phrygisch): Tropfen und ihre geschriebenen Echos (eine punktierte Achtel später)
const drip = (a, b, c) => `${a}:1 -:5 ${b}:1 -:5 ${c}:1 -:3`;
const dripEcho = (a, b, c) => `-:3 ${a}:1 -:5 ${b}:1 -:5 ${c}:1`;
const caveBass = (r, o) => `${r}:4 -:2 ${r}:2 -:4 ${o}:2 ${r}:2`;
const CAVE = [K4, CL, 'h.h.h.h.h.h.h.o.'];
// Zirkus (C-Dur): Orgel-„pa“ in der Mittellage, Piano-Akkorde tief
const cC = 'G3+C4+E4', cAm = 'A3+C4+E4', cDm7 = 'A3+C4+F4', cG7 = 'G3+B3+F4', cC7 = 'G3+Bb3+E4', cF = 'A3+C4+F4', cFm = 'Ab3+C4+F4';
const pAm = 'A3+C4+E4', pD7 = 'F#3+A3+C4', pG = 'G3+B3+D4', pE7 = 'G#3+B3+D4', pDm7 = 'A3+C4+F4', pG7 = 'G3+B3+F4', pC = 'G3+C4+E4';
// Fluss (D-Dur): Arpeggio-Töne, Stabs, Energie-Stabs
const rD = ['D5', 'F#5', 'A5', 'D6'], rBm = ['B4', 'D5', 'F#5', 'B5'], rG = ['B4', 'D5', 'G5', 'B5'], rA = ['C#5', 'E5', 'A5', 'C#6'], rEm = ['B4', 'E5', 'G5', 'B5'];
const sG = 'G3+B3+D4', sA = 'A3+C#4+E4', sBm = 'B3+D4+F#4';
const eD = 'F#4+A4+D5', eBm = 'F#4+B4+D5', eG = 'G4+B4+D5', eA = 'E4+A4+C#5', eEm = 'E4+G4+B4';
const RIV = [K4, CL, HOF];
// Boss (C-Moll): harte Vierklang-Stabs
const bCm = 'G3+C4+Eb4+G4', bAb = 'Ab3+C4+Eb4+Ab4', bBb = 'Bb3+D4+F4+Bb4', bG = 'G3+B3+D4+G4', bDb = 'Ab3+Db4+F4+Ab4';
const hard = (ch) => `${ch}:1 -:2 ${ch}:1 -:2 ${ch}:1 -:3 ${ch}:1 -:1 ${ch}:1 -:3`;
const hardFill = (ch) => `${ch}:1 -:2 ${ch}:1 -:2 ${ch}:1 -:2 ${ch}:1 ${ch}:1 ${ch}:1 ${ch}:1 ${ch}:1 ${ch}:1 ${ch}:1`;
const hit = (ch) => `${ch}:1 -:5 ${ch}:1 -:9`;
// Arena (Fis-Moll)
const aFm = 'F#3+A3+C#4', aD = 'F#3+A3+D4', aE = 'E3+G#3+B3', aG = 'G3+B3+D4', aCs = 'F3+G#3+C#4';
const stutter = (ch) => `${ch}:2 -:2 ${ch}:2 -:2 ${ch}:1 ${ch}:1 ${ch}:1 ${ch}:1 -:4`;
// Diorama / Karte: sanfter Beat
const SOFT = ['k.......k.......', CL4, 'h.h.h.hhh.h.h.o.']; // leise Achtel-Hats, Sechzehntel-Tupfer, offen auf 4+
const KH = 'k.......k.......';
const mapBass = (r, f) => `${r}:4 -:2 ${r}:2 ${f}:4 -:2 ${r}:2`;
// Ziel-Fanfare (D-Dur)
const fD = 'D4+F#4+A4+D5', fA = 'C#4+E4+A4+C#5', fG = 'D4+G4+B4+D5', fDF = 'D4+F#4+A4+D5', fEm = 'E4+G4+B4+E5';
// Funkelstern (E-Dur): Glitzer-Arpeggien
const stE = ['B5', 'E6', 'G#6', 'B6'], stCsm = ['G#5', 'C#6', 'E6', 'G#6'], stA = ['A5', 'C#6', 'E6', 'A6'], stB = ['B5', 'D#6', 'F#6', 'B6'];

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

  // ============================ Kurs-Themen (3D-Kurs-Plattformer) ============================

  // Wiesen-Parcours: 140 BPM, G-Dur mit Moll-Färbung (iv-Moll Cm), 16 Takte, fröhlich-treibend.
  // Form: 4 Takte Intro (Piano-Offbeat-Stabs, hüpfender Oktav-Bass, Pad; G D Em C) | 8 Takte
  //       Hoover-Hook (G D Em C | G D C D; 2-taktiges Motiv, sequenziert) mit Stabs auf 2+ und 4+ |
  //       4 Takte Em C Cm D: Rave-Piano 3-3-2, lange Hoover-Töne, Eintrübung über Cm, Snare-Wirbel.
  course_grass: {
    bpm: 140,
    voice: { lead: { cutoff: 5200 }, piano: { volume: 0.11 } },
    lead: [
      ...rest(3),
      '-:10 D4:2 E4:2 F#4:2',
      'G4:2 B4:1 D5:1 -:1 D5:2 E5:1 D5:2 B4:2 A4:2 G4:2',
      'F#4:2 -:1 A4:1 D5:3 C#5:1 -:2 A4:2 F#4:1 -:1 A4:2',
      'G4:2 B4:1 E5:1 -:1 E5:2 F#5:1 E5:2 D5:2 B4:2 G4:2',
      'E5:3 D5:1 -:2 C5:2 B4:2 -:2 G4:1 A4:1 B4:2',
      'G4:2 B4:1 D5:1 -:1 D5:2 E5:1 D5:2 B4:2 A4:2 G4:2',
      'F#4:2 -:1 A4:1 D5:3 C#5:1 -:2 A4:2 F#4:1 -:1 A4:2',
      'G4:2 C5:1 E5:1 -:1 E5:2 G5:1 E5:2 D5:2 C5:2 E5:2',
      'F#5:3 E5:1 D5:2 -:2 A4:2 D5:2 F#5:2 A5:2',
      'G5:6 F#5:2 E5:4 B4:4',
      'C5:6 D5:2 E5:4 G5:4',
      'G5:6 F5:2 Eb5:4 C5:4',
      'F#5:6 E5:2 D5:8',
    ],
    stabs: [
      ...rest(4),
      `-:6 ${gG}:2 -:6 ${gG}:2`, `-:6 ${gD}:2 -:6 ${gD}:2`, `-:6 ${gEm}:2 -:6 ${gEm}:2`, `-:6 ${gC}:2 -:4 ${gC}:1 -:1 ${gC}:2`,
      `-:6 ${gG}:2 -:6 ${gG}:2`, `-:6 ${gD}:2 -:6 ${gD}:2`, `-:6 ${gC}:2 -:6 ${gC}:2`, `-:6 ${gD}:2 -:4 ${gD}:1 -:1 ${gD}:2`,
      ...rest(4),
    ],
    piano: [
      offPush(gGH), offPush(gDH), offPush(gEmH), offbeat(gCH),
      ...rest(8),
      pianoBar(gEmH), pianoBar(gCH), pianoBar(gCmH), `${gDH}:3 ${gDH}:3 ${gDH}:2 ${gDH}:8`,
    ],
    pad: [
      'G3+B3+D4:16', 'F#3+A3+D4:16', 'E3+G3+B3:16', 'E3+G3+C4:16',
      ...rest(8),
      'E3+G3+B3:16', 'E3+G3+C4:16', 'Eb3+G3+C4:16', 'D3+F#3+A3:16',
    ],
    bass: [
      bounce('G1', 'G2'), bounce('D2', 'D3'), bounce('E1', 'E2'), bounce('C2', 'C3'),
      bounce('G1', 'G2'), bounce('D2', 'D3'), bounce('E1', 'E2'), bounce('C2', 'C3'),
      bounce('G1', 'G2'), bounce('D2', 'D3'), bounce('C2', 'C3'), 'D2:3 D3:1 D2:2 D3:2 D2:2 B1:2 C#2:2 D#2:2',
      bounce('E1', 'E2'), bounce('C2', 'C3'), bounce('C2', 'C3'), 'D2:3 D3:1 D2:2 D3:2 D2:2 D3:2 -:4',
    ],
    drums: [
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhohhh..', '..............ss'],
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhohhh..', '..............ss'],
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhoh....', '............tttt'],
      beat('r...............'), beat(), beat(), [K4, '....c...........', 'h.h.h.h.........', '........ssssssss'],
    ],
  },

  // Höhle: 132 BPM, E-Moll mit phrygischer Färbung (F-Dur als bII), 16 Takte, gedämpft.
  // Form: 4 Takte Tropfen (Sinus-Plucks + geschriebene Echo-Noten eine punktierte Achtel später, tiefes
  //       Pad, weiche Kick; Em Em C B) | 8 Takte gedämpfter Hoover (Tiefpass ~1,3 kHz) mit Pausen für
  //       die Echos (Em C Am B | Em C F B) | 4 Takte Tropfen über Em F Em B, leiser Snare-Wirbel.
  //       Hall/Echo-Bus: Abgriffe 3 und 4 Sechzehntel, Rückkopplung über dunklen Tiefpass; Lead, Tropfen,
  //       Echo-Noten, Clap und etwas Pad hängen daran.
  course_cave: {
    bpm: 132,
    voice: {
      lead: { cutoff: 1300, voices: 3, volume: 0.17, q: 2 },
      arp: { type: 'sine', volume: 0.1, decay: 0.18 },
      echo: { type: 'sine', volume: 0.045, decay: 0.18 },
      pad: { bright: 0.7, volume: 0.06 },
      bass: { cutoff: 480, volume: 0.21 },
    },
    kit: {
      kick: { pitchStart: 115, pitchEnd: 42, click: 0.06, volume: 0.5, decay: 0.3 },
      clap: { volume: 0.24 },
      snare: { volume: 0.18 },
      hat: { volume: 0.24, off: 0.14 },
      open: { volume: 0.18 },
      tom: { freq: 120, volume: 0.32 },
    },
    fx: {
      lowpass: { lead: 1500 },
      delay: { steps: [3, 4], feedback: 0.5, lowpass: 1400, wet: 0.55, send: { lead: 0.5, arp: 0.7, echo: 0.6, clap: 0.4, pad: 0.15 } },
    },
    lead: [
      ...rest(4),
      'E4:3 G4:1 B4:4 -:2 A4:2 G4:4',
      'E4:3 G4:1 C5:4 -:2 B4:2 G4:4',
      'A4:3 C5:1 E5:4 -:2 D5:2 C5:2 B4:2',
      'B4:6 A4:2 F#4:4 D#4:4',
      'E4:3 G4:1 B4:4 -:2 A4:2 G4:4',
      'E4:3 G4:1 C5:4 -:2 B4:2 G4:4',
      'A4:3 C5:1 F5:4 -:2 E5:2 C5:4',
      'D#5:6 -:2 B4:4 F#4:4',
      ...rest(4),
    ],
    arp: [
      drip('B5', 'E6', 'G5'), drip('B5', 'E6', 'D6'), drip('G5', 'E6', 'C6'), drip('F#5', 'D#6', 'B5'),
      '-:8 B5:1 -:7', '-:8 G5:1 -:7', '-:8 C6:1 -:7', '-:8 D#6:1 -:7',
      '-:8 B5:1 -:7', '-:8 G5:1 -:7', '-:8 A5:1 -:7', '-:8 F#5:1 -:7',
      drip('B5', 'E6', 'G5'), drip('A5', 'F6', 'C6'), drip('B5', 'E6', 'D6'), drip('F#5', 'D#6', 'B5'),
    ],
    echo: [
      dripEcho('B5', 'E6', 'G5'), dripEcho('B5', 'E6', 'D6'), dripEcho('G5', 'E6', 'C6'), dripEcho('F#5', 'D#6', 'B5'),
      '-:11 B5:1 -:4', '-:11 G5:1 -:4', '-:11 C6:1 -:4', '-:11 D#6:1 -:4',
      '-:11 B5:1 -:4', '-:11 G5:1 -:4', '-:11 A5:1 -:4', '-:11 F#5:1 -:4',
      dripEcho('B5', 'E6', 'G5'), dripEcho('A5', 'F6', 'C6'), dripEcho('B5', 'E6', 'D6'), dripEcho('F#5', 'D#6', 'B5'),
    ],
    pad: [
      'B2+E3+G3:16', 'B2+E3+G3:16', 'C3+E3+G3:16', 'B2+D#3+F#3:16',
      'B2+E3+G3:16', 'C3+E3+G3:16', 'A2+C3+E3:16', 'B2+D#3+F#3:16',
      'B2+E3+G3:16', 'C3+E3+G3:16', 'A2+C3+F3:16', 'B2+D#3+F#3:16',
      'B2+E3+G3:16', 'A2+C3+F3:16', 'B2+E3+G3:16', 'B2+D#3+F#3:16',
    ],
    bass: [
      caveBass('E1', 'E2'), caveBass('E1', 'E2'), caveBass('C2', 'C3'), caveBass('B1', 'B2'),
      caveBass('E1', 'E2'), caveBass('C2', 'C3'), caveBass('A1', 'A2'), caveBass('B1', 'B2'),
      caveBass('E1', 'E2'), caveBass('C2', 'C3'), caveBass('F1', 'F2'), caveBass('B1', 'B2'),
      caveBass('E1', 'E2'), caveBass('F1', 'F2'), caveBass('E1', 'E2'), caveBass('B1', 'B2'),
    ],
    drums: [
      [...CAVE, 'r...............'], CAVE, CAVE, [K4, CL, 'h.h.h.h.h.h.....', '.............ttt'],
      CAVE, CAVE, CAVE, [K4, CL, 'h.h.h.h.h.h.....', '............tttt'],
      CAVE, CAVE, CAVE, [K4, CL, 'h.h.h.h.h.h.....', '.............ttt'],
      [...CAVE, 'r...............'], CAVE, CAVE, [K4, '....c...........', 'h.h.h.h.........', '........ssssssss'],
    ],
  },

  // Zirkuszelt: 138 BPM, C-Dur, 16 Takte, verspielt.
  // Form: 8 Takte Rave-Piano-Melodie mit chromatischen Nebennoten und Durchgängen über Kirmes-Orgel
  //       (Rechteck-Orgel) auf jeder „und“ und Humpa-Bass (C Am Dm7 G7 | C C7 F-Fm C-G7) |
  //       8 Takte Calliope: die Orgel singt die Melodie in Terzen, Piano-Akkorde auf der „und“
  //       (Am D7 G E7 | Am D7 Dm7-G7 C), Tom- und Snare-Fills.
  course_circus: {
    bpm: 138,
    voice: {
      piano: { volume: 0.13 },
      organ: { volume: 0.045, cutoff: 3600 },
    },
    kit: { tom: { freq: 210 } },
    piano: [
      'C5:1 -:1 E5:1 -:1 G5:2 F#5:1 G5:1 -:2 E5:2 C5:1 -:1 G4:2',
      'A4:1 -:1 C5:1 -:1 E5:2 D#5:1 E5:1 -:2 C5:2 A4:1 -:1 E4:2',
      'F4:1 F#4:1 G4:1 G#4:1 A4:2 C5:2 -:1 D5:1 -:1 F5:1 -:2 E5:1 D5:1',
      'C5:1 B4:1 -:1 G4:1 -:2 F5:2 E5:1 D#5:1 D5:1 -:1 B4:2 G4:2',
      'C5:1 -:1 E5:1 -:1 G5:2 F#5:1 G5:1 -:2 E5:2 C5:1 -:1 G4:2',
      'Bb4:1 -:1 C5:1 -:1 E5:2 G5:1 -:1 Bb5:2 A5:1 G5:1 E5:2 C5:2',
      'A4:1 C5:1 F5:2 E5:1 F5:1 A5:2 Ab5:2 F5:1 -:1 C5:1 Ab4:1 C5:2',
      'G4:1 -:1 C5:1 -:1 E5:1 D#5:1 E5:1 -:1 F5:1 -:1 D5:1 -:1 B4:1 -:1 G4:2',
      offbeat(pAm), offbeat(pD7), offbeat(pG), offbeat(pE7),
      offbeat(pAm), offbeat(pD7), offbeat2(pDm7, pG7), offbeat(pC),
    ],
    organ: [
      offbeat(cC), offbeat(cAm), offbeat(cDm7), offbeat(cG7),
      offbeat(cC), offbeat(cC7), offbeat2(cF, cFm), offbeat2(cC, cG7),
      'C5+E5:3 B4+D5:1 C5+E5:2 E5+A5:2 -:2 D5+F5:2 C5+E5:2 B4+D5:2',
      'A4+C5:3 G#4+B4:1 A4+C5:2 D5+F#5:4 C5+E5:2 A4+C5:2 F#4+A4:2',
      'B4+D5:3 A#4+C#5:1 B4+D5:2 D5+G5:4 -:2 B4+D5:2 G4+B4:2',
      'G#4+B4:2 A4+C5:1 A#4+C#5:1 B4+D5:4 D5+G#5:2 C5+E5:2 B4+D5:2 G#4+B4:2',
      'C5+E5:3 B4+D5:1 C5+E5:2 E5+A5:2 -:2 D5+F5:2 C5+E5:2 B4+D5:2',
      'A4+C5:3 G#4+B4:1 A4+C5:2 D5+F#5:2 E5+G5:2 F#5+A5:4 -:2',
      'F5+A5:2 E5+G5:1 D#5+F#5:1 D5+F5:4 B4+D5:2 C5+E5:1 C#5+F5:1 D5+F5:4',
      'C5+E5:4 -:2 G4+C5:1 -:1 C5+E5:2 -:2 G4+B4:1 A4+C5:1 B4+D5:2',
    ],
    bass: [
      oompah('C2', 'G1'), oompah('A1', 'E2'), oompah('D2', 'A1'), 'G1:2 -:2 D2:2 -:2 G1:2 -:2 A1:2 B1:2',
      oompah('C2', 'G1'), oompah('C2', 'G1'), oompah('F1', 'C2'), 'C2:2 -:2 G1:2 -:2 G1:2 -:2 D2:2 -:2',
      oompah('A1', 'E2'), oompah('D2', 'A1'), oompah('G1', 'D2'), 'E2:2 -:2 B1:2 -:2 E2:2 -:2 G#1:2 -:2',
      oompah('A1', 'E2'), oompah('D2', 'A1'), 'D2:2 -:2 A1:2 -:2 G1:2 -:2 D2:2 -:2', 'C2:2 -:2 G1:2 -:2 C2:2 -:2 G1:2 A1:1 B1:1',
    ],
    drums: [
      [K4, CL, H8, 'r...............'], [K4, CL, H8], [K4, CL, H8], [K4, CL, 'h.h.h.h.h.h.....', '............tttt'],
      [K4, CL, H8], [K4, CL, H8], [K4, CL, H8], [K4, CL, 'h.h.h.h.h.h.h...', '............ssss'],
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhoh....', '............tttt'],
      beat(), beat(), beat(), [K4, '....c...........', 'h.h.h.h.........', '........ssssssss'],
    ],
  },

  // Fluss (Reiten auf Pflaume): 142 BPM, D-Dur, 16 Takte, luftig und energiegeladen.
  // Form: 4 Takte Sechzehntel-Arpeggien (hohe Rechteck-Plucks mit kurzem Echo) über hellem Pad
  //       (D Bm G A) | 8 Takte Hoover-Hook über den weiterlaufenden Arpeggien (D A/C# Bm G | D A Em A) |
  //       4 Takte Offbeat-Stabs, Sechzehntel-Hats, Riser in den Loop (G A Bm A).
  //       Energie-Ebene beim Reiten: hohe Offbeat-Stabs.
  course_river: {
    bpm: 142,
    voice: {
      arp: { type: 'square', volume: 0.05, decay: 0.09 },
      pad: { bright: 1.3, volume: 0.045 },
      riser: { volume: 0.09 },
    },
    fx: {
      lowpass: { arp: 5000 },
      delay: { steps: 3, feedback: 0.3, lowpass: 3000, wet: 0.3, send: { arp: 0.5, lead: 0.2 } },
    },
    lead: [
      ...rest(4),
      'A4:2 D5:2 -:1 E5:1 F#5:2 -:2 E5:1 D5:1 E5:2 A4:2',
      'C#5:2 E5:2 -:1 F#5:1 E5:4 -:2 C#5:2 A4:2',
      'B4:2 D5:2 -:1 E5:1 F#5:2 -:2 A5:2 F#5:2 E5:2',
      'D5:2 B4:2 -:2 G5:2 F#5:2 E5:2 D5:2 E5:2',
      'A4:2 D5:2 -:1 E5:1 F#5:2 -:2 E5:1 D5:1 E5:2 A4:2',
      'C#5:2 E5:2 -:1 F#5:1 E5:4 -:2 C#5:2 A4:2',
      'B4:2 E5:2 -:1 F#5:1 G5:2 -:2 B5:2 A5:2 G5:2',
      'A5:4 G5:2 F#5:2 E5:4 C#5:2 E5:2',
      ...rest(4),
    ],
    arp: [
      arp16(rD), arp16(rBm), arp16(rG), arp16(rA),
      arp16(rD), arp16(rA), arp16(rBm), arp16(rG),
      arp16(rD), arp16(rA), arp16(rEm), arp16(rA),
      arp16(rG), arp16(rA), arp16(rBm), arp16(rA),
    ],
    stabs: [
      ...rest(12),
      offbeat(sG), offbeat(sA), offbeat(sBm), `-:2 ${sA}:2 -:2 ${sA}:2 -:8`,
    ],
    pad: [
      'D4+F#4+A4:16', 'D4+F#4+B4:16', 'D4+G4+B4:16', 'C#4+E4+A4:16',
      ...rest(8),
      'D4+G4+B4:16', 'C#4+E4+A4:16', 'D4+F#4+B4:16', 'C#4+E4+A4:16',
    ],
    riser: [...rest(15), 'A3:16'],
    bass: [
      pump('D2', 'D3'), pump('B1', 'B2'), pump('G1', 'G2'), pump('A1', 'A2', true),
      pump('D2', 'D3'), pump('C#2', 'C#3'), pump('B1', 'B2'), pump('G1', 'G2'),
      pump('D2', 'D3'), pump('A1', 'A2'), pump('E1', 'E2'), pump('A1', 'A2', true),
      pump('G1', 'G2'), pump('A1', 'A2'), pump('B1', 'B2'), 'A1:2 A2:2 A1:2 A2:2 -:8',
    ],
    energy: [
      ...[eD, eBm, eG, eA].map((c) => `-:2 ${c}:1 -:7 ${c}:1 -:3 ${c}:1 -:1`),
      ...[eD, eA, eBm, eG, eD, eA, eEm, eA].map((c) => `-:6 ${c}:1 -:7 ${c}:1 -:1`),
      ...[eG, eA, eBm, eA].map((c) => `-:2 ${c}:1 -:7 ${c}:1 -:3 ${c}:1 -:1`),
    ],
    drums: [
      [...RIV, 'r...............'], RIV, RIV, [K4, CL, 'h.o.h.o.h.o.....', '............ssss'],
      [...RIV, 'r...............'], RIV, RIV, [K4, CL, 'h.o.h.o.h.o.....', '............tttt'],
      [...RIV, 'r...............'], RIV, RIV, [K4, CL, 'h.o.h.o.h.o.....', '............ssss'],
      beat('r...............'), beat(), beat(), [K4, '....c...........', 'hhhhhhhh........', '........ssssssss'],
    ],
  },

  // Bossstraße: 145 BPM, C-Moll (harmonisch: G-Dur als Dominante, Des-Dur als Neapolitaner), 16 Takte.
  // Form: 4 Takte harte Vierklang-Stabs in Sechzehntel-Synkopen (Cm Ab Bb G), Hoover-Riser in Takt 4 |
  //       8 Takte Hoover-Riff (Cm Ab Bb G | Cm Ab Db G7b9) | 4 Takte Stabs, Snare auf den Offbeats,
  //       2-taktiger Riser über zwei Oktaven in den Loop. Galopp-Bass durchgehend – dringlich.
  course_boss: {
    bpm: 145,
    voice: {
      stabs: { volume: 0.17, cutoff: 7000, cutoffEnd: 2200 },
      riser: { volume: 0.1 },
    },
    kit: { snare: { volume: 0.3 }, tom: { freq: 160, volume: 0.45 } },
    lead: [
      ...rest(4),
      'C5:2 -:1 C5:1 Eb5:2 C5:2 G5:3 F5:1 Eb5:2 D5:2',
      'C5:2 -:1 C5:1 Eb5:2 C5:2 Ab5:3 G5:1 F5:2 Eb5:2',
      'D5:2 -:1 D5:1 F5:2 D5:2 Bb5:3 Ab5:1 G5:2 F5:2',
      'G5:3 F5:1 Eb5:2 D5:2 B4:4 -:2 G4:1 B4:1',
      'C5:2 -:1 C5:1 Eb5:2 C5:2 G5:3 F5:1 Eb5:2 D5:2',
      'C5:2 -:1 C5:1 Eb5:2 C5:2 Ab5:3 G5:1 F5:2 Eb5:2',
      'Db5:2 -:1 Db5:1 F5:2 Db5:2 Ab5:3 G5:1 F5:2 Db5:2',
      'B4:2 D5:2 F5:2 Ab5:2 G5:4 -:2 D5:2',
      ...rest(4),
    ],
    stabs: [
      hard(bCm), hard(bAb), hard(bBb), hardFill(bG),
      hit(bCm), hit(bAb), hit(bBb), hit(bG), hit(bCm), hit(bAb), hit(bDb), hit(bG),
      hard(bCm), hard(bAb), hard(bBb), hardFill(bG),
    ],
    riser: [...rest(3), 'G3:16', ...rest(10), 'C4:16', 'C5:16'],
    bass: [
      gallop('C2', 'C3'), gallop('Ab1', 'Ab2'), gallop('Bb1', 'Bb2'), gallop('G1', 'G2'),
      gallop('C2', 'C3'), gallop('Ab1', 'Ab2'), gallop('Bb1', 'Bb2'), gallop('G1', 'G2'),
      gallop('C2', 'C3'), gallop('Ab1', 'Ab2'), gallop('Db2', 'Db3'), gallop('G1', 'G2'),
      gallop('C2', 'C3'), gallop('Ab1', 'Ab2'), gallop('Bb1', 'Bb2'), 'G1:1 -:1 G2:2 G1:1 -:1 G2:2 -:8',
    ],
    drums: [
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhoh....', '............ssss'],
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhoh....', '............tttt'],
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhh......', '..........ssssss'],
      beat('r...............'), beat(), beat('..s...s...s...s.'), [K4, '....c...c...c...', 'h.h.h.h.........', '........ssssssss'],
    ],
  },

  // Gegner-Blockade (Arena): 140 BPM, Fis-Moll, 8 Takte, angespannt.
  // Form: 4 Takte pochendes Sägezahn-Ostinato hinter Tiefpass mit Akzent-Stabs, Achtel-Puls-Bass
  //       (F#m F#m D E) | 4 Takte lange, reibende Hoover-Töne darüber (F#m G=bII D C#=V; Maj7 über G,
  //       #11 über D), Snare-Wirbel in den Loop.
  course_arena: {
    bpm: 140,
    voice: {
      arp: { type: 'sawtooth', volume: 0.065, decay: 0.07 },
      lead: { cutoff: 3800 },
      stabs: { volume: 0.16 },
    },
    fx: { lowpass: { arp: 2400 } },
    arp: [
      ostinato('F#4', 'C#5', 'A4', 'G#4'), ostinato('F#4', 'C#5', 'A4', 'G#4'),
      ostinato('F#4', 'D5', 'A4', 'E4'), ostinato('E4', 'B4', 'G#4', 'F#4'),
      ostinato('F#4', 'C#5', 'A4', 'G#4'), ostinato('G4', 'D5', 'B4', 'A4'),
      ostinato('F#4', 'D5', 'A4', 'E4'), ostinato('G#4', 'C#5', 'F4', 'G#4'),
    ],
    lead: [
      ...rest(4),
      'C#5:6 D5:2 C#5:4 A4:4',
      'B4:6 D5:2 G5:4 F#5:4',
      'A5:6 G#5:2 F#5:4 D5:4',
      'F5:6 G#5:2 C#5:8',
    ],
    stabs: [
      `${aFm}:2 -:14`, `${aFm}:2 -:6 ${aFm}:2 -:6`, `${aD}:2 -:14`, stutter(aE),
      `${aFm}:2 -:14`, `${aG}:2 -:14`, `${aD}:2 -:14`, stutter(aCs),
    ],
    bass: [pulse8('F#1'), pulse8('F#1'), pulse8('D2'), pulse8('E2'), pulse8('F#1'), pulse8('G1'), pulse8('D2'), pulse8('C#2')],
    drums: [
      beat('r...............'), beat(), beat(), [K4, CL, 'hhohhhohhhoh....', '............ssss'],
      beat('r...............'), beat(), beat('..............tt'), [K4, CL, 'hhohhhoh........', '........ssssssss'],
    ],
  },

  // Rätsel-Diorama mit Pflaume: 112 BPM, F-Lydisch (H statt B – neugierig), 8 Takte, ruhig.
  // Form: Pad-Vierklänge (Fmaj7 G/F Em7 Am7 Dm7 G Fmaj7 Gsus4–G), Rave-Piano (weich) mit fragenden,
  //       aufwärts endenden Phrasen und sanftem Echo, vereinzelte Glöckchen-Plucks (Fundstücke),
  //       Kick auf 1 und 3, Clap auf 4, leise Achtel-Hats.
  course_diorama: {
    bpm: 112,
    voice: {
      piano: { volume: 0.12, cutoff: 3600, cutoffEnd: 1200 },
      pad: { volume: 0.05, bright: 0.9 },
      bass: { cutoff: 600, volume: 0.17 },
      arp: { type: 'triangle', volume: 0.08, decay: 0.25 },
    },
    kit: {
      kick: { volume: 0.45, pitchStart: 130, click: 0.15 },
      clap: { volume: 0.22 },
      hat: { volume: 0.3, off: 0.2 },
      open: { volume: 0.2 },
      tom: { freq: 150, volume: 0.3 },
    },
    fx: { delay: { steps: 3, feedback: 0.32, lowpass: 2600, wet: 0.4, send: { piano: 0.35, arp: 0.6 } } },
    piano: [
      'C5:2 -:1 F5:1 -:2 E5:2 -:2 A5:2 G5:2 -:2',
      'B4:2 -:1 D5:1 -:2 B5:2 -:2 A5:1 G5:1 D5:2 -:2',
      'E5:2 -:1 G5:1 -:2 B5:2 -:2 A5:2 E5:4',
      'C5:3 B4:1 A4:2 -:2 E5:2 -:2 G5:4',
      'F5:2 -:1 A5:1 -:2 C6:2 -:2 A5:1 F5:1 D5:4',
      'B4:2 -:1 D5:1 -:2 G5:2 -:2 F5:1 E5:1 D5:2 B4:2',
      'A4:2 -:1 C5:1 -:2 E5:2 -:2 G5:2 B5:4',
      'C6:6 B5:2 -:4 G5:1 A5:1 B5:2',
    ],
    pad: [
      'F3+A3+C4+E4:16', 'F3+G3+B3+D4:16', 'E3+G3+B3+D4:16', 'E3+G3+A3+C4:16',
      'D3+F3+A3+C4:16', 'D3+G3+B3:16', 'F3+A3+C4+E4:16', 'D3+G3+C4:8 D3+G3+B3:8',
    ],
    arp: ['-:16', '-:12 B6:1 -:3', '-:16', '-:14 E6:1 -:1', '-:16', '-:12 B6:1 -:1 D7:1 -:1', '-:16', '-:8 G6:1 -:1 B6:1 -:1 D7:1 -:3'],
    bass: [
      lazyBass('F2', 'C2'), lazyBass('F2', 'D2'), lazyBass('E2', 'B1'), lazyBass('A1', 'E2'),
      lazyBass('D2', 'A1'), lazyBass('G1', 'D2'), lazyBass('F2', 'C2'), 'G1:6 -:2 G1:2 -:2 D2:2 -:2',
    ],
    drums: [SOFT, SOFT, SOFT, SOFT, SOFT, SOFT, SOFT, ['k.......k.....k.', CL4, 'h.h.h.h.h.h.h.o.', '.............tt.']],
  },

  // Kurs-Weltkarte: 124 BPM, B-Dur, 8 Takte, freundliche Ballade/Breakdown.
  // Form: Pad (Bb F/A Gm Eb | Bb F Eb Fsus4–F), Rave-Piano-Melodie in Achteln mit leichtem Echo,
  //       weicher Bass, Kick auf 1 und 3, Clap auf 2 und 4, Achtel-Hats mit offener „und“ von 4.
  course_map: {
    bpm: 124,
    voice: {
      piano: { volume: 0.12, cutoff: 4200 },
      pad: { volume: 0.05 },
      bass: { cutoff: 700 },
    },
    fx: { delay: { steps: 3, feedback: 0.28, lowpass: 3000, wet: 0.3, send: { piano: 0.3 } } },
    piano: [
      'D5:2 F5:2 -:2 Bb5:2 A5:2 F5:2 -:2 D5:2',
      'C5:2 F5:2 -:2 A5:2 G5:2 F5:2 -:2 C5:2',
      'D5:2 G5:2 -:2 Bb5:2 A5:2 G5:2 F5:2 D5:2',
      'Eb5:4 G5:2 Bb5:2 -:2 C6:2 Bb5:4',
      'D5:2 F5:2 -:2 Bb5:2 C6:2 D6:2 -:2 Bb5:2',
      'A5:2 C6:2 -:2 A5:2 F5:4 C5:4',
      'G5:2 Bb5:2 -:2 G5:2 Eb5:2 G5:2 F5:2 Eb5:2',
      'F5:4 -:2 Eb5:2 D5:4 C5:4',
    ],
    pad: [
      'Bb3+D4+F4:16', 'A3+C4+F4:16', 'Bb3+D4+G4:16', 'Bb3+Eb4+G4:16',
      'Bb3+D4+F4:16', 'A3+C4+F4:16', 'Bb3+Eb4+G4:16', 'Bb3+C4+F4:8 A3+C4+F4:8',
    ],
    bass: [
      mapBass('Bb1', 'F2'), mapBass('A1', 'F2'), mapBass('G1', 'D2'), mapBass('Eb2', 'Bb1'),
      mapBass('Bb1', 'F2'), mapBass('F1', 'C2'), mapBass('Eb2', 'Bb1'), 'F1:4 -:2 F1:2 C2:4 -:2 F1:2',
    ],
    drums: [
      [KH, CL, H8O, 'r...............'], [KH, CL, H8O], [KH, CL, H8O], ['k.......k.....k.', CL, 'h.h.h.h.h.h.h.hh'],
      [KH, CL, H8O], [KH, CL, H8O], [KH, CL, H8O], ['k.......k.....k.', CL, 'h.h.h.h.h.h.hhhh'],
    ],
  },

  // Ziel erreicht: 140 BPM, D-Dur, 3 Takte, kein Loop – Stab-Fanfare mit Hoover-Melodie
  // (D–A–D | G D/F# Em A | D), Snare-Wirbel mit Riser im 2. Takt, Crash und Schlussakkord.
  course_clear: {
    bpm: 140,
    loop: false,
    voice: { stabs: { volume: 0.12 }, piano: { volume: 0.09 }, riser: { volume: 0.08 } },
    lead: ['A4:2 -:1 A4:1 D5:2 -:1 E5:1 F#5:4 E5:2 F#5:2', 'G5:4 F#5:2 E5:2 A5:6 -:2', 'D5:12 -:4'],
    // Schlussakkord über die Oktaven verteilt: Stab unter, Piano über dem gehaltenen Hoover-D5
    stabs: [`${fD}:2 -:1 ${fD}:1 ${fD}:2 -:1 ${fA}:1 ${fD}:4 ${fA}:2 ${fD}:2`, `${fG}:4 ${fDF}:2 ${fEm}:2 ${fA}:6 -:2`, 'A3+D4+F#4:8 -:8'],
    piano: ['-:16', '-:16', 'F#5+A5+D6:12 -:4'],
    riser: ['-:16', '-:8 A3:7 -:1', '-:16'], // endet kurz vor der Eins (sonst addiert er sich zur Spitze)
    bass: ['D2:2 -:1 D2:1 D2:2 -:1 A1:1 D2:4 A1:2 D2:2', 'G1:4 F#1:2 E1:2 A1:6 -:2', 'D2:8 -:8'],
    // Schluss-Eins nur mit Crash (Orchester-Hit-Charakter): Kick und Crash gemeinsam nach dem Wirbel
    // ergaben gemessen eine Spitze über 0 dBFS
    drums: [[K4, CL, HH, 'r...............'], [K4, CL, 'hhohhhoh........', '........ssssssss'], ['r...............']],
  },

  // Funkelstern (Unverwundbarkeit): 160 BPM, E-Dur, 4 Takte Loop, hektisch.
  // Form: E C#m A B – Glitzer-Arpeggien in Sechzehnteln (hohe, leise Rechteck-Plucks), Hoover-Hook im
  //       3-3-2-Rhythmus, Galopp-Bass, Sechzehntel-Hats, Crash auf jeder Eins, Wirbel in den Loop.
  course_star: {
    bpm: 160,
    voice: {
      lead: { voices: 3, volume: 0.17 },
      arp: { type: 'square', volume: 0.035, decay: 0.06 },
    },
    fx: { lowpass: { arp: 6000 } },
    lead: [
      'E5:3 G#5:3 B5:2 A5:3 G#5:3 F#5:2',
      'E5:3 G#5:3 C#6:2 B5:3 G#5:3 E5:2',
      'C#5:3 E5:3 A5:2 G#5:3 F#5:3 E5:2',
      'D#5:2 F#5:2 A5:2 B5:2 A5:2 F#5:2 D#5:2 B4:2',
    ],
    arp: [arp16(stE), arp16(stCsm), arp16(stA), arp16(stB)],
    bass: [gallop('E2', 'E3'), gallop('C#2', 'C#3'), gallop('A1', 'A2'), gallop('B1', 'B2')],
    drums: [beat('r...............'), beat('r...............'), beat('r...............'), [K4, CL, 'hhohhhohhhoh....', 'r...........ssss']],
  },

  // Spielende: 100 BPM, A-Moll, 2 Takte, kein Loop – absteigende Hoover-Linie über Rave-Piano-Akkorde
  // (Am G F E), Schlussakkord mit abwärts gleitendem Riser („die Energie geht aus“).
  course_gameover: {
    bpm: 100,
    loop: false,
    voice: {
      lead: { voices: 3, volume: 0.15, cutoff: 3000 },
      piano: { volume: 0.11 },
      riser: { glide: 0.5, volume: 0.07, noise: 0.03 },
    },
    lead: ['E5:4 D5:4 C5:4 B4:4', 'A4:10 -:6'],
    piano: ['A4+C5+E5:4 G4+B4+D5:4 F4+A4+C5:4 E4+G#4+B4:4', 'A3+C4+E4:10 -:6'],
    pad: ['-:16', 'A3+C4+E4:16'],
    riser: ['-:16', 'A4:12 -:4'],
    bass: ['A1:4 G1:4 F1:4 E1:4', 'A1:10 -:6'],
    drums: [['k...k...k...k...', H8], ['k...............', 'r...............']],
  },
};
