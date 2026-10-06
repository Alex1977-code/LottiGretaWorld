// Musikstücke als Pattern-Strings: "Note:Dauer" in Sechzehnteln, "-" = Pause.
// Jede Spur ist ein Array von Takten (4/4). Kanäle: lead, arp, bass, drums.
// Drums: k = Kick, s = Snare, h = Hi-Hat, "." = nichts (16 Zeichen je Takt).

export const THEMES = {
  // Welt 1 – Herbstwald: freundlich, F-Dur, 8 Takte
  world1: {
    bpm: 128,
    lead: [
      'F4:4 A4:4 C5:4 A4:4',
      'Bb4:2 A4:2 G4:4 F4:8',
      'D4:4 F4:4 A4:4 F4:4',
      'G4:2 A4:2 Bb4:4 C5:8',
      'C5:4 D5:4 C5:4 A4:4',
      'Bb4:4 A4:4 G4:8',
      'F4:4 G4:4 A4:4 Bb4:4',
      'C5:8 F4:6 -:2',
    ],
    arp: [
      'F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 C6:2 A5:2',
      'Bb5:2 D6:2 F6:2 D6:2 F5:2 A5:2 C6:2 A5:2',
      'D5:2 F5:2 A5:2 F5:2 D5:2 F5:2 A5:2 F5:2',
      'G5:2 Bb5:2 D6:2 Bb5:2 C6:2 E6:2 G6:2 E6:2',
      'F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 C6:2 A5:2',
      'Bb5:2 D6:2 F6:2 D6:2 G5:2 Bb5:2 D6:2 Bb5:2',
      'F5:2 A5:2 C6:2 A5:2 Bb5:2 D6:2 F6:2 D6:2',
      'C6:2 E6:2 G6:2 E6:2 F5:2 A5:2 C6:2 A5:2',
    ],
    bass: [
      'F2:4 -:2 C3:2 F2:4 -:2 C3:2',
      'Bb2:4 -:2 F3:2 F2:4 -:2 C3:2',
      'D2:4 -:2 A2:2 D2:4 -:2 A2:2',
      'G2:4 -:2 D3:2 C3:4 -:2 G2:2',
      'F2:4 -:2 C3:2 F2:4 -:2 C3:2',
      'Bb2:4 -:2 F3:2 G2:4 -:2 D3:2',
      'F2:4 -:2 C3:2 Bb2:4 -:2 F3:2',
      'C3:4 -:2 G2:2 F2:8',
    ],
    drums: [
      'k.h.s.h.k.h.s.h.',
      'k.h.s.h.k.h.s.hh',
      'k.h.s.h.k.h.s.h.',
      'k.h.s.h.k.k.s.hh',
      'k.h.s.h.k.h.s.h.',
      'k.h.s.h.k.h.s.hh',
      'k.h.s.h.k.h.s.h.',
      'k.h.s.h.kkhhs.ss',
    ],
  },

  // Weltkarte: ruhig, 4 Takte, ohne Drums
  map: {
    bpm: 96,
    lead: [
      'A4:4 C5:4 E5:8',
      'D5:4 C5:4 A4:8',
      'F4:4 A4:4 C5:8',
      'G4:4 E4:4 A4:8',
    ],
    arp: [
      'A3:4 E4:4 A4:4 E4:4',
      'F3:4 C4:4 F4:4 C4:4',
      'F3:4 C4:4 F4:4 C4:4',
      'E3:4 B3:4 E4:4 B3:4',
    ],
    bass: [
      'A2:8 A2:8',
      'F2:8 F2:8',
      'F2:8 F2:8',
      'E2:8 E2:8',
    ],
    drums: ['................', '................', '................', '................'],
  },

  // Levelende: kurze Fanfare (nicht wiederholt)
  complete: {
    bpm: 140,
    loop: false,
    lead: ['C5:2 E5:2 G5:2 C6:6 G5:2 C6:2', 'E6:4 -:12'],
    arp: ['C4:2 E4:2 G4:2 C5:10', 'E5:4 -:12'],
    bass: ['C3:8 G2:8', 'C3:8 -:8'],
    drums: ['k...s...k...s...', 'k...............'],
  },
};
