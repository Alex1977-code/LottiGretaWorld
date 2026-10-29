// Themen der Bonuswelten Pilz „Pilz-Remix“, Blume „Blumen-Remix“ und Krone „Kronen-Gipfel“: die drei Weltkarten, der
// Boss-Marathon B-12 und der Champion-Kurs K-1 – eigene Kompositionen im Stil des 90er-Eurodance (Stil ja, Zitat nein;
// keine fremde oder bekannte Spielmusik, kein Baron-Brummbär-Motiv). Format und Spuren siehe themes.js / Music.js,
// Bausteine in themeParts.js. Die Remix-Level selbst spielen die Musik ihres Basislevels mit einer Klang-Variante
// (`music.play(thema, { variant })`, Varianten in AudioEngine.js) – hier stehen nur die neuen Stücke.
//
// Nach der Musik-Richtlinie (docs/KURS-ARCHITEKTUR.md) geschrieben, Maßstab Welt 1, Welt 8 und Stern: jedes Stück ist ein
// Lied in Dur oder Moll mit klarer, singbarer Hook, Eurodance-Akkordfolgen, Off-Beat-Stabs, Piano, Pad, Oktav-Bass und
// Four-on-the-floor; die Karten haben 16 Takte (Strophe → Refrain ab Takt 9), der Boss-Marathon 24 Takte (Intro → Strophe
// → Refrain ab Takt 13 → Überleitung), der Champion-Kurs 32 Takte mit zweitem Refrain. Die Welt-Farbe kommt nur aus dem
// Klang.
//
// Hook-Profile (tests/audio.mjs vergleicht sie mit allen Themen der Welten 1–8, der Halloween-Welt, der Welt Stern und
// untereinander – Einsatz + Intervall und Kontur ohne Rhythmus):
//   Pilz-Remix      Stotter-Hook: „(-)Pi-Pi-Pilz“ – nach einer Sechzehntel Pause dreimal derselbe Ton in Sechzehnteln (wie
//                   ein hängender Plattenspieler), Sprung hinauf, zwei Schritte zurück, Luft holen, in Achteln wieder hinauf
//   Blumen-Remix    (siehe unten)
//   Kronen-Gipfel   Krönungs-Dreiklang: der Dreiklang steigt in Achteln zum langen Gipfelton, oben ein Doppelschlag von
//                   unten in Sechzehnteln (die Krone wird aufgesetzt), dann eine Terz hinab
//   Boss-Marathon   Blitz-Zickzack: die Melodie zuckt in Achteln wie ein Blitz hinab (Terz runter, Sekunde rauf …),
//                   dann ein Seufzer auf den Grundton
//   Champion        Siegerruf: Quinte hinauf in einen langen Ton, dann Stufe für Stufe bis zur Oktave; die Antwort fällt
//                   vom Gipfel zurück

import {
  dr, K4, KH, CL, H8, H8O, HH, CR, rest, chordBar, bassBar, padBar, pat, voicing,
  B_BOUNCE, B_PUMP, B_GALLOP, B_DRIVE, B_HALF, form, bySection, groove,
} from './themeParts.js';

const SYNTH = { sub: false, bend: 0.985, detune: 10 };  // Lead-Synth (siehe Welt 2)
const OFF = '..x_ ..x_ ..x_ ..x_';
const ST24 = '.... ..x_ .... ..x_';
const LONG = 'x_______ x_______';
const SONG = form({ intro: 4, verse: 8, chorus: 8, bridge: 4 });
const CHAMP = form({ intro: 4, verse: 8, chorus: 8, bridge: 4, chorus2: 8 });
const MAP = form({ verse: 8, chorus: 8 });
const tones = (c, lo) => voicing(c, lo).split('+');
const BREAK_BASS = (c, i) => bassBar(c, i < 3 ? B_HALF : 'L_H_ L_H_ ____ ____');
const FILL_S = [K4, dr('.... c... .... ....'), dr('h.h. h.h. .... ....'), dr('.... .... ssss ssss')]; // Wirbel in den Loop
/** Refrain aus vier Hook-Takten: A B C D A B + zwei eigene Schluss-Takte. */
const chorusOf = (hook, x, y) => [...hook, hook[0], hook[1], x, y];
const AAH = { type: 'triangle', volume: 0.07, vibrato: 10, rate: 5, slide: 0, attack: 0.3, gate: 0.98 };   // Chor-„Aah“

// ================================================================ Karte Welt Pilz „Pilz-Remix“ ====
// G-Dur, 128 BPM, 16 Takte, verspielt – „bekannte Orte, neu gemischt“. Strophe G D e C | G D C D (I–V–vi–IV | I–V–IV–V):
// das Piano hüpft die Melodie über den Dreiklang, Stotter-Stabs am Phrasen-Ende, Scratch-Anklänge („wikka-wikka“: ein
// Sägezahn-Zupfer gleitet hinauf, ein kurzer Riser hinab) | Refrain e C G D | e C D G (vi–IV–I–V | vi–IV–V–I): der Lead
// singt die Stotter-Hook, Stotter-Stabs am Taktende, Piano auf der „und“, hüpfender Bass. Weicher Four-on-the-floor.
const pzProg = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'];
const pzPiano = ['D5:2 B4:2 G4:2 B4:2 D5:3 E5:1 D5:4', 'A4:2 F#4:2 D4:2 F#4:2 A4:3 B4:1 A4:4', 'B4:2 G4:2 E4:2 G4:2 B4:3 C5:1 B4:4', 'C5:2 E5:2 G5:2 E5:2 C5:3 D5:1 E5:4',
  'D5:2 B4:2 G4:2 B4:2 D5:3 E5:1 D5:4', 'A4:2 F#4:2 D4:2 F#4:2 A4:3 B4:1 A4:4', 'C5:2 A4:2 C5:2 E5:2 G5:3 F#5:1 E5:4', 'F#5:2 E5:2 D5:2 A4:2 D5:3 E5:1 F#5:4'];
const pzHook = ['-:1 B5:1 B5:1 B5:1 E6:2 D6:1 B5:1 -:2 G5:2 B5:2 G5:2', '-:1 G5:1 G5:1 G5:1 C6:2 B5:1 G5:1 -:2 E5:2 G5:2 C6:2',
  '-:1 D6:1 D6:1 D6:1 B5:2 A5:1 G5:1 -:2 B5:2 G5:2 A5:2', '-:1 F#5:1 F#5:1 F#5:1 A5:2 G5:1 F#5:1 -:2 D5:2 F#5:2 A5:2'];
const pzLead = chorusOf(pzHook, '-:1 A5:1 A5:1 A5:1 D6:2 C6:1 A5:1 -:2 F#5:2 A5:2 F#5:2', 'G5:2 A5:2 B5:2 A5:2 G5:8');
const STUTTER = '.... ..x. ..xx xx..';                                   // Stotter-Stabs („ta-ta-ta-ta“)
const pop = (c) => pat(tones(c, 'G5'), '.... .... ..2. 1.0.');            // Glockenspiel-Tupfer am Phrasen-Ende
const PZMAP = [K4, CL, dr('..h. ..h. ..h. ..o.')];

// ================================================================ Karte Welt Blume „Blumen-Remix“ ====
// A-Dur, 126 BPM, 16 Takte, blumig-fröhlich. Strophe A E fis D | A E D E (I–V–vi–IV | I–V–IV–V): die Flöte singt die
// Melodie, Glockenspiel-Tupfer, Kick auf 1 und 3 | Refrain D E cis fis | D E A A (IV–V–iii–vi | IV–V–I): der Lead singt die
// Blüten-Hook, das Glockenspiel spielt sie eine Oktave höher mit, Piano auf der „und“, Schellen.
const bmProg = ['A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'E', 'D', 'E', 'C#m', 'F#m', 'D', 'E', 'A', 'A'];
const bmFlute = ['C#5:2 D5:2 E5:2 A5:2 G#5:4 E5:4', 'B4:2 C#5:2 E5:2 G#5:2 F#5:4 E5:4', 'C#5:2 E5:2 F#5:2 A5:2 G#5:4 F#5:4', 'D5:2 E5:2 F#5:2 A5:2 F#5:4 D5:4',
  'C#5:2 D5:2 E5:2 A5:2 G#5:4 E5:4', 'B4:2 C#5:2 E5:2 G#5:2 F#5:4 E5:4', 'A4:2 B4:2 D5:2 F#5:2 E5:4 D5:4', 'E5:2 F#5:2 G#5:2 B5:2 A5:4 G#5:4'];
const bmHook = ['A5:1 G#5:1 A5:1 B5:1 C#6:2 E6:2 D6:2 C#6:2 A5:4', 'G#5:1 F#5:1 G#5:1 A5:1 B5:2 E6:2 C#6:2 B5:2 G#5:4',
  'E5:1 D#5:1 E5:1 F#5:1 G#5:2 C#6:2 B5:2 A5:2 G#5:4', 'A5:2 C#6:2 B5:2 A5:2 F#5:4 E5:4'];
const bmLead = chorusOf(bmHook, 'A5:1 G#5:1 A5:1 B5:1 C#6:2 E6:2 D6:2 C#6:2 B5:4', 'A5:4 G#5:2 F#5:2 E5:8');
const petals = (c) => pat(tones(c, 'A5'), '.... ..0. .... 1.2.');           // Glockenspiel-Tupfer (Blütenblätter)
const BMMAP = [KH, CL, H8O, dr('..j. ..j. ..j. ..j.')];

// ================================================================ Karte Welt Krone „Kronen-Gipfel“ ====
// B-Dur, 128 BPM, 16 Takte, feierlich. Strophe B F g Es | B F Es F (I–V–vi–IV | I–V–IV–V): die Fanfaren spielen die
// Melodie im Fanfaren-Rhythmus, Pauken, Kick auf 1 und 3 | Refrain Es F d g | Es F B B (IV–V–iii–vi | IV–V–I): der Lead
// singt die Krönungs-Hook, der Chor singt „Aah“, Fanfaren-Stöße, Piano auf der „und“.
const kgProg = ['Bb', 'F', 'Gm', 'Eb', 'Bb', 'F', 'Eb', 'F', 'Eb', 'F', 'Dm', 'Gm', 'Eb', 'F', 'Bb', 'Bb'];
const kgFanfare = ['F4:3 F4:1 Bb4:4 D5:3 C5:1 Bb4:4', 'A4:3 A4:1 C5:4 F5:3 Eb5:1 C5:4', 'Bb4:3 Bb4:1 D5:4 G5:3 F5:1 D5:4', 'G4:3 G4:1 Bb4:4 Eb5:3 D5:1 Bb4:4',
  'F4:3 F4:1 Bb4:4 D5:3 C5:1 Bb4:4', 'A4:3 A4:1 C5:4 F5:3 Eb5:1 C5:4', 'G4:3 G4:1 Bb4:4 Eb5:3 F5:1 G5:4', 'A5:3 G5:1 F5:4 C5:4 Eb5:4'];
const kgHook = ['Eb5:2 G5:2 Bb5:6 A5:1 Bb5:1 C6:1 Bb5:1 C6:2', 'C6:2 A5:2 F5:6 E5:1 F5:1 G5:1 F5:1 E5:2',
  'D5:2 F5:2 A5:6 G5:1 A5:1 Bb5:1 A5:1 F5:2', 'G5:4 F5:2 D5:2 Bb4:4 D5:4'];
const kgLead = chorusOf(kgHook, 'D5:2 F5:2 Bb5:6 A5:1 Bb5:1 C6:1 Bb5:1 F5:2', 'D5:4 Eb5:2 C5:2 Bb4:8');
const PAUKE = dr('t... .... t.t. ....');
const KGMAP = [KH, CL, H8O, PAUKE];

// ================================================================ Boss-Marathon B-12 (Nacht-Weltraum) ====
// f-Moll, 148 BPM, 24 Takte, treibend und dramatisch. Intro f Des Es C (die Weltraum-Hörner spielen die Hook) | Strophe
// f f Des Es | f f b C (i–VI–VII | i–iv–V, Arpeggiator, Galopp-Bass) | Refrain f Des As Es | f Des b C (i–VI–III–VII |
// i–VI–iv–V, Blitz-Hook, Hörner-Stöße, Piano auf der „und“, treibender Bass) | Überleitung Des Es f C (lange Töne,
// Sternschnuppe, Pauken-Wirbel). Weltraum-Hall, Blitz-Einschläge (Crash und tiefer Schlag), Sternenglitzern.
const bbProg = ['Fm', 'Db', 'Eb', 'C', 'Fm', 'Fm', 'Db', 'Eb', 'Fm', 'Fm', 'Bbm', 'C', 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Bbm', 'C', 'Db', 'Eb', 'Fm', 'C'];
const bbHook = ['C6:2 Ab5:2 Bb5:2 G5:2 Ab5:3 Bb5:1 C6:4', 'Db6:2 Bb5:2 C6:2 Ab5:2 Bb5:3 C6:1 Db6:4',
  'Eb6:2 C6:2 Db6:2 Bb5:2 C6:3 Bb5:1 Ab5:4', 'G5:2 Eb5:2 F5:2 G5:2 Bb5:4 G5:4'];
const bbChorus = chorusOf(bbHook, 'Db6:2 Bb5:2 C6:2 Ab5:2 Bb5:3 Ab5:1 F5:4', 'E5:2 G5:2 Bb5:2 G5:2 C6:4 -:4');
const bbIntro = [bbHook[0], bbHook[1], bbHook[3], 'E5:2 G5:2 Bb5:2 G5:2 E5:4 C5:4'];
const bbV = ['F4:2 Ab4:2 C5:2 Ab4:2 Bb4:2 C5:2 Ab4:4', 'F4:2 Ab4:2 C5:2 Db5:2 C5:2 Bb4:2 Ab4:4', 'F4:2 Ab4:2 Db5:2 Ab4:2 Bb4:2 C5:2 Db5:4', 'Eb5:2 Db5:2 C5:2 Bb4:2 G4:2 Bb4:2 G4:4'];
const bbVerse = [...bbV, bbV[0], bbV[1], 'F4:2 Bb4:2 Db5:2 Bb4:2 C5:2 Db5:2 F5:4', 'C5:2 E5:2 G5:2 E5:2 G5:2 Bb5:2 G5:4'];
const bbBridge = ['F5:8 Ab5:8', 'G5:8 Bb5:8', 'Ab5:8 C6:8', 'G5:8 Bb5:8'];
const bbArp = (c) => pat([...tones(c, 'F4'), tones(c, 'F5')[0]], '0123 2101 2321 0123');   // Arpeggiator
const STRIKE = dr('d... .... .... ....');                                                    // Blitz-Einschlag (tief)
const BOSS = [K4, CL, H8];

// ================================================================ Champion-Kurs K-1 (Abschlussprüfung) ====
// D-Dur, 150 BPM, 32 Takte, das triumphalste Stück. Intro D A h G (die Fanfaren spielen die Hook, Pauken) | Strophe
// h G D A | h G e A (vi–IV–I–V | vi–IV–ii–V, Lead treibend, Stabs auf der „und“) | Refrain D A h G | D A G A (I–V–vi–IV |
// I–V–IV–V, Siegerruf, Fanfaren-Stöße, Chor, Piano, treibender Bass) | Überleitung G A h A (der Chor singt, Glocke,
// Riser) | zweiter Refrain: das Glockenspiel singt die Hook eine Oktave höher mit, Pauken. Chor-Pad in allen Takten.
const chProg = ['D', 'A', 'Bm', 'G', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'A', 'D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A',
  'G', 'A', 'Bm', 'A', 'D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'];
const chHook = ['D5:2 F#5:1 F#5:1 A5:2 A5:2 D6:6 C#6:2', 'C#6:2 B5:1 B5:1 A5:2 A5:2 E5:6 F#5:2',
  'B4:2 D5:1 D5:1 F#5:2 F#5:2 B5:6 A5:2', 'G5:2 F#5:1 F#5:1 D5:2 D5:2 B4:6 D5:2'];
const chChorus = chorusOf(chHook, 'B4:2 D5:1 D5:1 G5:2 G5:2 B5:6 A5:2', 'C#6:2 B5:1 B5:1 A5:2 A5:2 E5:4 C#5:4');
const chIntro = [chHook[0], chHook[1], chHook[2], 'G5:2 F#5:1 F#5:1 D5:2 D5:2 B4:4 C#5:4'];
const chV = ['D5:2 C#5:1 B4:1 C#5:2 D5:2 F#5:2 E5:2 D5:4', 'B4:2 A4:1 G4:1 A4:2 B4:2 D5:2 E5:2 D5:4', 'F#5:2 E5:1 D5:1 E5:2 F#5:2 A5:2 G5:2 F#5:4', 'E5:2 D5:1 C#5:1 D5:2 E5:2 G5:2 F#5:2 E5:4'];
const chVerse = [...chV, chV[0], chV[1], 'G5:2 F#5:1 E5:1 F#5:2 G5:2 B5:2 A5:2 G5:4', 'E5:2 F#5:1 G5:1 A5:2 G5:2 F#5:2 E5:2 C#5:4'];
const chBridge = ['D5:8 G5:8', 'E5:8 A5:8', 'F#5:8 B5:8', 'A5:8 E5:8'];
const chChoir = ['B5:16', 'C#6:16', 'D6:16', 'C#6:8 E6:8'];
const PAUKE8 = dr('t... .... t.t. ....');

export const BONUS_THEMES = {
  // Weltkarte Welt Pilz „Pilz-Remix“: 128 BPM, G-Dur, 16 Takte, verspielt. Strophe (G D e C | G D C D): das Piano hüpft die
  // Melodie, Glockenspiel-Tupfer, Stotter-Stabs und Scratch-Anklänge („wikka-wikka“) am Ende jeder Vier-Takt-Phrase |
  // Refrain (e C G D | e C D G): der Lead singt die Stotter-Hook, Stotter-Stabs, Piano auf der „und“. Weicher
  // Four-on-the-floor, Hats auf der „und“, hüpfender Bass.
  course_worldpilz_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3800, volume: 0.17 },
      piano: { volume: 0.11, cutoff: 4200 },
      stabs: { volume: 0.1, cutoff: 5500, cutoffEnd: 1500 },
      bell: { type: 'sine', volume: 0.07, decay: 0.3, ratio: 3.9, partial: 0.35 },
      echo: { type: 'sawtooth', volume: 0.05, decay: 0.06, glide: 2.4, glideTime: 0.07 },   // Scratch hinauf
      riser: { volume: 0.06, glide: 0.35, noise: 0.07 },                                                     // Scratch hinab
      pad: { volume: 0.045, bright: 1 },
      bass: { cutoff: 700 },
    },
    kit: { kick: { volume: 0.46 }, clap: { volume: 0.24 }, hat: { volume: 0.22, off: 0.16 }, tom: { freq: 150, volume: 0.3 } },
    fx: { lowpass: { echo: 3000 }, delay: { steps: 3, feedback: 0.28, lowpass: 3000, wet: 0.26, send: { piano: 0.15, bell: 0.35, lead: 0.15, echo: 0.3, riser: 0.25 } } },
    piano: bySection(pzProg, MAP, { verse: (c, i) => pzPiano[i], chorus: (c) => chordBar(c, OFF, 'G4') }),
    lead: [...rest(8), ...pzLead],
    stabs: pzProg.map((c, i) => (i % 4 === 3 ? chordBar(c, STUTTER) : i >= 8 ? chordBar(c, ST24) : '-:16')),
    bell: bySection(pzProg, MAP, { verse: (c, i) => (i % 4 === 1 ? pop(c) : '-:16') }),
    echo: pzProg.map((c, i) => (i % 4 === 3 ? '-:12 E4:1 -:1 G4:1 -:1' : '-:16')),
    riser: pzProg.map((c, i) => (i % 4 === 3 ? '-:13 B4:1 -:1 D5:1' : '-:16')),
    pad: pzProg.map((c) => padBar(c)),
    bass: bySection(pzProg, MAP, { verse: (c) => bassBar(c, B_HALF), chorus: (c) => bassBar(c, B_BOUNCE) }),
    drums: [[...PZMAP, CR], PZMAP, PZMAP, [K4, CL, dr('..h. ..h. ..h. ....'), dr('.... .... .... .ttt')], PZMAP, PZMAP, PZMAP, [K4, CL, dr('..h. ..h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...PZMAP, CR], PZMAP, PZMAP, [K4, CL, dr('..h. ..h. ..h. ....'), dr('.... .... .... .ttt')], PZMAP, PZMAP, PZMAP, FILL_S],
  },

  // Weltkarte Welt Blume „Blumen-Remix“: 126 BPM, A-Dur, 16 Takte, blumig-fröhlich. Strophe (A E fis D | A E D E): die
  // Flöte singt die Melodie, Glockenspiel-Tupfer wie Blütenblätter, Kick auf 1 und 3 | Refrain (D E cis fis | D E A A): der
  // Lead singt die Blüten-Hook, das Glockenspiel spielt sie eine Oktave höher mit, Piano auf der „und“. Schellen auf der
  // „und“, Clap auf 2 und 4.
  course_worldblume_map: {
    bpm: 126,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3400, volume: 0.16 },
      whistle: { type: 'sine', volume: 0.13, vibrato: 14, rate: 5.5, slide: 1, attack: 0.04, gate: 0.92 },   // Flöte
      bell: { type: 'sine', volume: 0.08, decay: 0.5, ratio: 2.76, partial: 0.4 },                          // Glockenspiel
      piano: { volume: 0.1, cutoff: 4000 },
      pad: { volume: 0.045, bright: 1.1 },
      bass: { cutoff: 650 },
    },
    kit: { hat: { volume: 0.22, off: 0.14 }, jingle: { volume: 0.08, off: 0.06, duration: 0.06 }, tom: { freq: 140, volume: 0.3 } },
    fx: { delay: { steps: 3, feedback: 0.3, lowpass: 3200, wet: 0.28, send: { whistle: 0.3, bell: 0.4, lead: 0.15, piano: 0.15 } } },
    whistle: [...bmFlute, ...rest(8)],
    lead: [...rest(8), ...bmLead],
    bell: bySection(bmProg, MAP, {
      verse: (c, i) => (i % 2 ? petals(c) : '-:16'),
      chorus: (c, i) => (i < 6 ? bmLead[i].replace(/([A-G][#b]?)(\d)/g, (m, n, o) => `${n}${+o + 1}`) : '-:16'),
    }),
    piano: bySection(bmProg, MAP, { verse: (c) => chordBar(c, '.... ..x. .... ..x.', 'A4'), chorus: (c) => chordBar(c, OFF, 'A4') }),
    pad: bmProg.map((c) => padBar(c)),
    bass: bmProg.map((c) => bassBar(c, B_HALF)),
    drums: [[...BMMAP, CR], BMMAP, BMMAP, [KH, CL, H8O, dr('.... .... .... .ttt')], BMMAP, BMMAP, BMMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...BMMAP, CR], BMMAP, BMMAP, [KH, CL, H8O, dr('.... .... .... .ttt')], BMMAP, BMMAP, BMMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... ..tt tttt')]],
  },

  // Weltkarte Welt Krone „Kronen-Gipfel“: 128 BPM, B-Dur, 16 Takte, feierlich. Strophe (B F g Es | B F Es F): die Fanfaren
  // spielen die Melodie im Fanfaren-Rhythmus (lang – kurz – lang), Pauken, Kick auf 1 und 3 | Refrain (Es F d g | Es F B
  // B): der Lead singt die Krönungs-Hook, der Chor singt „Aah“, Fanfaren-Stöße, Piano auf der „und“.
  course_worldkrone_map: {
    bpm: 128,
    voice: {
      lead: { ...SYNTH, voices: 3, cutoff: 3600, volume: 0.17 },
      organ: { volume: 0.055, cutoff: 2600, gate: 0.9 },   // Fanfaren
      whistle: AAH,
      piano: { volume: 0.1, cutoff: 3800 },
      pad: { volume: 0.05, bright: 0.95 },
      bass: { cutoff: 650 },
    },
    kit: { hat: { volume: 0.22, off: 0.14 }, tom: { freq: 95, volume: 0.36 } },
    fx: { delay: { steps: [3, 4], feedback: 0.32, lowpass: 2800, wet: 0.28, send: { organ: 0.2, whistle: 0.4, lead: 0.15, pad: 0.15, tom: 0.15 } } },
    organ: bySection(kgProg, MAP, { verse: (c, i) => kgFanfare[i], chorus: (c) => chordBar(c, 'x__x __x_ .... ....', 'F3') }),
    lead: [...rest(8), ...kgLead],
    whistle: [...rest(8), ...kgProg.slice(8).map((c) => `${tones(c, 'D5')[0]}:16`)],
    piano: bySection(kgProg, MAP, { verse: (c) => chordBar(c, '.... ..x. .... ..x.', 'F4'), chorus: (c) => chordBar(c, OFF, 'F4') }),
    pad: kgProg.map((c) => padBar(c)),
    bass: kgProg.map((c) => bassBar(c, B_HALF)),
    drums: [[...KGMAP, CR], KGMAP, KGMAP, [KH, CL, H8O, dr('.... .... .... .ttt')], KGMAP, KGMAP, KGMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... .... .ttt')],
      [...KGMAP, CR], KGMAP, KGMAP, [KH, CL, H8O, dr('.... .... .... .ttt')], KGMAP, KGMAP, KGMAP, [KH, CL, dr('h.h. h.h. hhhh hhhh'), dr('.... .... ..tt tttt')]],
  },

  // Boss-Marathon B-12 (Hub mit sechs Warp-Boxen im Weltraum bei Nacht, fünf Bosse, dann die Würfelblase): 148 BPM, f-Moll,
  // 24 Takte, treibend und dramatisch. Intro (f Des Es C): die Weltraum-Hörner spielen die Hook, Blitz-Einschlag | Strophe
  // (f f Des Es | f f b C): Lead treibend, Arpeggiator, Galopp-Bass | Refrain (f Des As Es | f Des b C): Blitz-Zickzack-Hook,
  // Hörner-Stöße, Piano auf der „und“, Sechzehntel-Hats, treibender Bass, Sternenglitzern | Überleitung (Des Es f C):
  // lange Töne, Sternschnuppe in den Loop. Weltraum-Hall in allen Takten.
  course_bossblitz: {
    bpm: 148,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.17 },
      organ: { volume: 0.055, cutoff: 2400, gate: 0.9 },   // Weltraum-Hörner
      arp: { type: 'sawtooth', volume: 0.045, decay: 0.06 },
      bell: { type: 'sine', volume: 0.05, decay: 0.3, ratio: 5.4, partial: 0.3 },   // Sternenglitzern
      piano: { volume: 0.09 },
      stabs: { volume: 0.12, cutoff: 6000, cutoffEnd: 1600 },
      pad: { volume: 0.05, bright: 1.1 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08, noise: 0.12 },
    },
    kit: { kick: { volume: 0.55 }, clap: { volume: 0.3 }, doum: { freq: 48, volume: 0.36, decay: 0.35 }, hat: { volume: 0.24, off: 0.15 }, tom: { freq: 80, volume: 0.42 } },
    fx: { lowpass: { arp: 2600 }, delay: { steps: [3, 4], feedback: 0.36, lowpass: 3000, wet: 0.3, send: { organ: 0.2, bell: 0.4, arp: 0.2, lead: 0.13, pad: 0.15, doum: 0.2 } } },
    organ: bySection(bbProg, SONG, { intro: (c, i) => bbIntro[i], chorus: (c) => chordBar(c, 'x__x __x_ .... ....', 'F3'), bridge: (c) => chordBar(c, LONG, 'F3') }),
    lead: [...rest(4), ...bbVerse, ...bbChorus, ...bbBridge],
    arp: bySection(bbProg, SONG, { verse: bbArp, chorus: bbArp }),
    bell: bySection(bbProg, SONG, { chorus: (c, i) => (i % 2 ? pat(tones(c, 'C6'), '.... .... ..2. 1.0.') : '-:16') }),
    piano: bySection(bbProg, SONG, { chorus: (c) => chordBar(c, OFF, 'F4'), bridge: (c) => chordBar(c, LONG, 'F4') }),
    stabs: bySection(bbProg, SONG, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24) }),
    pad: bySection(bbProg, SONG, { intro: (c) => padBar(c), verse: (c) => padBar(c), bridge: (c) => padBar(c) }),
    riser: [...rest(11), '-:8 C4:8', ...rest(10), 'F3:16', 'C4:14 -:2'],
    bass: bySection(bbProg, SONG, { intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_GALLOP), chorus: (c) => bassBar(c, B_DRIVE), bridge: BREAK_BASS }),
    drums: [
      [K4, CL, H8, STRIKE, CR], [K4, CL, H8], [K4, CL, H8, STRIKE], [K4, CL, dr('h.h. h.h. .... ....'), dr('.... .... tttt tttt')],
      ...groove(4, BOSS, [...BOSS, dr('.... .... .... t.tt')]),
      ...groove(4, BOSS, [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, STRIKE], [K4, CL, HH, dr('.... .... .... tttt')]),
      ...groove(4, [K4, CL, HH, STRIKE], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('.... .... ..ss ssss')], false),
      [K4, CL, H8, STRIKE, CR], [K4, CL, H8], [K4, CL, H8, STRIKE], [K4, dr('.... c... .... ....'), dr('d... .... .... ....'), dr('.... .... tttt ssss')],
    ],
  },

  // Champion-Kurs K-1 (≈ 900 m ohne Checkpoint, fast alle Gimmicks des Spiels hintereinander – die Abschlussprüfung): 150 BPM,
  // D-Dur, 32 Takte, das triumphalste Stück. Intro (D A h G): die Fanfaren spielen die Hook, Pauken | Strophe (h G D A |
  // h G e A): Lead treibend, Stabs auf der „und“, Galopp-Bass | Refrain (D A h G | D A G A): Siegerruf, Fanfaren-Stöße,
  // Piano auf der „und“, Chor, treibender Bass | Überleitung (G A h A): der Chor singt, Siegesglocke, Riser über zwei Takte |
  // zweiter Refrain: wie der erste, das Glockenspiel singt die Hook eine Oktave höher mit, Pauken. Chor-Pad in allen Takten.
  course_champion: {
    bpm: 150,
    voice: {
      lead: { ...SYNTH, cutoff: 5200, volume: 0.17 },
      organ: { volume: 0.06, cutoff: 2800, gate: 0.9 },     // Fanfaren
      whistle: AAH,                                            // Chor
      bell: { type: 'sine', volume: 0.09, decay: 1.3, ratio: 2.4, partial: 0.5 },   // Siegesglocke
      arp: { type: 'sine', volume: 0.06, decay: 0.3 },        // Glockenspiel im zweiten Refrain
      piano: { volume: 0.09 },
      stabs: { volume: 0.12, cutoff: 6000, cutoffEnd: 1600 },
      pad: { volume: 0.055, bright: 1 },
      bass: { volume: 0.17 },
      riser: { volume: 0.08, noise: 0.1 },
    },
    kit: { kick: { volume: 0.55 }, clap: { volume: 0.3 }, tom: { freq: 95, volume: 0.42 }, hat: { volume: 0.24, off: 0.15 }, crash: { volume: 0.2 } },
    fx: { delay: { steps: [3, 4], feedback: 0.32, lowpass: 3000, wet: 0.28, send: { organ: 0.18, whistle: 0.4, bell: 0.35, arp: 0.3, lead: 0.12, pad: 0.15, tom: 0.15 } } },
    organ: bySection(chProg, CHAMP, {
      intro: (c, i) => chIntro[i],
      chorus: (c) => chordBar(c, 'x__x __x_ .... ....', 'F#3'),
      bridge: (c) => chordBar(c, LONG, 'F#3'),
      chorus2: (c) => chordBar(c, 'x__x __x_ x... ....', 'F#3'),
    }),
    lead: [...rest(4), ...chVerse, ...chChorus, ...chBridge, ...chChorus],
    whistle: bySection(chProg, CHAMP, { chorus: (c) => `${tones(c, 'D5')[0]}:16`, bridge: (c, i) => chChoir[i], chorus2: (c) => `${tones(c, 'D5')[0]}:16` }),
    arp: bySection(chProg, CHAMP, { chorus2: (c, i) => (i < 6 ? chChorus[i].replace(/([A-G][#b]?)(\d)/g, (m, n, o) => `${n}${+o + 1}`) : '-:16') }),
    bell: chProg.map((c, i) => ([0, 12, 20, 24].includes(i) ? 'D5:16' : '-:16')),
    stabs: bySection(chProg, CHAMP, { verse: (c) => chordBar(c, '.... ..x. .... ..x.'), chorus: (c) => chordBar(c, ST24), chorus2: (c) => chordBar(c, ST24) }),
    piano: bySection(chProg, CHAMP, { chorus: (c) => chordBar(c, OFF, 'F#4'), bridge: (c) => chordBar(c, LONG, 'F#4'), chorus2: (c) => chordBar(c, OFF, 'F#4') }),
    pad: chProg.map((c) => padBar(c)),
    riser: [...rest(11), '-:8 A3:8', ...rest(10), 'A3:16', 'D4:14 -:2', ...rest(7), '-:8 A3:8'],
    bass: bySection(chProg, CHAMP, {
      intro: (c) => bassBar(c, B_PUMP), verse: (c) => bassBar(c, B_GALLOP), chorus: (c) => bassBar(c, B_DRIVE),
      bridge: (c, i) => bassBar(c, i < 3 ? B_PUMP : 'L.H_ L.H_ .... ....'), chorus2: (c) => bassBar(c, B_DRIVE),
    }),
    drums: [
      [K4, PAUKE8, CR], [K4, PAUKE8, CL], [K4, PAUKE8, CL], [K4, CL, dr('.... .... tttt tttt')],
      ...groove(4, [K4, CL, H8], [K4, CL, H8, dr('.... .... ..tt tttt')]),
      ...groove(4, [K4, CL, H8], [K4, CL, dr('h.h. h.h. h.h. ....'), dr('.... .... ..ss ssss')], false),
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, HH, dr('t... .... tttt tttt')]),
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('t... .... ..ss ssss')], false),
      [K4, PAUKE8, CR], [K4, PAUKE8, CL], [K4, CL, PAUKE8], [K4, dr('.... c... .... ....'), dr('tt.. tt.. ssss ssss')],
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, HH, dr('t... .... tttt tttt')]),
      ...groove(4, [K4, CL, HH, PAUKE8], [K4, CL, dr('hhoh hhoh hh.. ....'), dr('tt.. tt.. ssss ssss')], false),
    ],
  },
};
