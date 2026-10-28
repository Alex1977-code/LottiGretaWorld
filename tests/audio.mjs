// Audio-Test: Kontext wird bei Nutzergeste freigeschaltet, Themen wechseln, Energie-Ebene beim Reiten,
// Stummschaltung wird gespeichert, keine Fehler. Zusätzlich wird jedes Thema offline gerendert und
// messbar geprüft (Spitzenpegel, RMS, Frequenzbänder, Beat-Periodizität, Knoten je Sekunde);
// die ersten 8 s von world1 landen als WAV in tests/out/world1.wav.
//
// Kurs-Modus: alle Kurs-Themen (docs/KURS-ARCHITEKTUR.md, Abschnitt Audio) werden auf Eckdaten (Tempo,
// Takte, Loop), Konsistenz und Messwerte geprüft – ganzer Loop gerendert, RMS im Bereich der bestehenden
// Themen –, die ersten 8 s der Welt-1-Themen landen als tests/out/<thema>.wav. Alle Effekte (Vertragsnamen und
// Klassik) werden live ausgelöst (keine Fehler, Knotenzahl je Effekt begrenzt, unbekannte Namen stumm) und
// offline vermessen (Spitze, Dauer, Lautheit K-gewichtet im Vergleich zu den bestehenden Effekten);
// tests/out/sfx_demo.wav enthält alle Effekte nacheinander mit 0,6 s Pause (Reihenfolge im Log).
//
// Welt 2–4 (Musik-Richtlinie des Auftraggebers: melodisch im 90er-Stil wie Welt 1): alle Themen mit denselben
// Messungen; Melodie-Prüfung aus den Themen-Daten, kalibriert an den Welt-1-Themen (Anteil der Takte mit
// Melodie, Schritte/kleine Sprünge, Tonumfang, wiederkehrende Refrain-Hook, Rhythmus-Wiederholung, leitereigene
// Töne ≥ 90 %, keine zwei ähnlichen Hooks, verschiedene Tonarten je Welt). Hörproben: je Thema 30 s ab der
// Strophe (Strophe → Refrain) als tests/out/<thema>_30s.wav, dazu tests/out/hoerprobe_welt2.wav (die sieben
// Welt-2-Themen je 15 s ab dem Refrain, 1 s Pause). Klon-Antwort der Spiegelfrucht und Piep-Takt von
// course_beep an den Themen-Daten geprüft; alle neuen Effekte live und offline, Hörprobe
// tests/out/sfx_demo_w2.wav. Taktuhr (music.beat()/onBeat()): vor der Freischaltung über die Ersatzuhr (Tempo,
// Abstand der Rückrufe, Abmelden), stetig beim Freischalten (Musik steigt im Takt ein), mit Ton (Tempo, Rückrufe
// im Takt der hörbaren Musik, Lage zum Sequencer), stumm, bei angehaltenem Kontext (Ersatzuhr übernimmt,
// danach Wiedereinstieg), Themenwechsel, Stopp und deterministisch über den Testhaken (setManualClock/advanceClock).
//
// Welt 5 („Lila Strand-Insel“, Welt-5-Liste im Vertrag): die zehn neuen Themen mit denselben Messungen und derselben
// Melodie-Prüfung; Tempo 128–150 BPM (nur der Goldzug schneller), Trapez im Dreier-Gefühl (Bass und Orgel gliedern den
// Takt 3+3+2 über dem Four-on-the-floor), Schleich-Festung gedämpft. Hook-Ähnlichkeit jetzt über alle Themen der Welten
// 1–5 (Einsatz + Intervall der zwei Refrain-Takte); die Welt-5-Hooks zusätzlich über die Kontur (Intervallfolge ohne
// Rhythmus) gegen alle Themen. Hörproben tests/out/<thema>_30s.wav (ab der Strophe) und tests/out/hoerprobe_welt5.wav
// (alle zehn Welt-5-Themen je 15 s ab dem Refrain).
//
// Halloween-Sonderwelt „Kürbisinsel“ (Welt 31, Vertrag am Ende von docs/KURS-ARCHITEKTUR.md): die sechs Themen mit
// denselben Messungen und derselben Melodie-Prüfung, Hook und Kontur eigenständig gegen alle Themen (Welten 1–5 und
// untereinander); Tempo 128–150 BPM (Gruselschloss 146–150, Karte 124–128), 16–32 Takte, Loop-Naht (Melodie-Sprung über
// die Naht ≤ Quinte, Wirbel im letzten Takt, Crash auf der Eins; gerendert ohne Einbruch oder Spitze an der Naht), Pegel
// wie Welt 5 (wenn beide Welten im selben Lauf gerendert werden). Klangfarben aus den Daten: Celesta spielt die
// Kürbisfeld-Hook im Intro in Moll, Knochen-Xylofon, Theremin mit weitem Vibrato, Cembalo, Kirchenorgel mit dem
// Baron-Brummbär-Motiv aus course_boss (doppelte Notenlänge), Refrain-Hook des Grafen mit dessen Kopf. Hörproben:
// tests/out/hw_<thema>_30s.wav (ab der Strophe) und tests/out/hoerprobe_halloween.wav (alle sechs je 15 s ab dem Refrain).
//
// Welt 6 („Wolkeninseln“, Welt-6-Liste im Vertrag): die neun neuen Themen mit denselben Messungen und derselben
// Melodie-Prüfung, Hook und Kontur eigenständig gegen alle Themen (Welten 1–6 und Halloween); Tempo 128–150 BPM
// (Wuschel-Mine 148–152, Karte 126–128), 16–32 Takte, Loop-Naht wie Halloween (Daten und gerendert), Pegel wie Welt 5
// (wenn beide Welten im selben Lauf gerendert werden). Klangfarben aus den Daten: Glas-Glocken (Glasröhren), Akkordeon,
// Schiffsglocke und Schunkel-Rhythmus (Geisterschiff), Bambusflöte, Koto, Gong und pentatonische Hook über Moll-Harmonik
// (Fernost), Marimba und Trommeln (Dschungel), Glöckchen, Schellen und Windböen (Wind-Schnee), Amboss, Metall und
// Förderband (Maschinenhalle), Zirkus-Orgel und Pauken (Würfelblase); die Arenen, 6-Haus und 6-Panzer nutzen vorhandene
// Themen. Hörproben: tests/out/w6_<thema>_30s.wav (ab der Strophe) und tests/out/hoerprobe_welt6.wav (alle neun je 15 s
// ab dem Refrain).
//
// Klänge Welt 6 und Halloween (vorher Ersatzklänge in blocks/w6kit.js bzw. blocks/hwkit.js): W6_SFX (gust, wind, rumble,
// door, poof, splash, bump, powerup_appear, gong) und HW_SFX (klingel, tuer, alle_tueren, kessel, blase, netz, laterne,
// laterne_aus, suessigkeit, muenzregen, buh, grabstein, kuerbis_platzt) – in der Effekt-Liste (engine.effects.w6/hw), live
// ausgelöst wie alle Effekte, offline mit denselben Maßstäben wie die Kurs-Effekte (Lautheit im Bereich der bestehenden,
// Spitze < 0,9, Dauer ≤ 1,6 s, ≤ 40 Knoten); Hörprobe tests/out/sfx_demo_w6.wav.
//
// Ergänzte Kurs-Effekte für vorher stumme Aufrufe (MORE_SFX, engine.effects.more: victory, fall, boost, skid, glide,
// wallslide, swim, fence, grab, swing, hop, dash, kick, dizzy, boomerang, dig, throw, fuse, burn, chain, alarm, flip, donut,
// pfiff, note0–note7): live ausgelöst wie alle Effekte, offline mit denselben Maßstäben (victory ≤ 1,5 s; über der
// Musik-Fanfare course_clear nur Jubel-Glitzer, live und offline geprüft), Hörprobe tests/out/sfx_demo_fehlende.wav (am
// Ende die Glitzer-Variante); Drosselung live (SFX_GAP: Wiederholung desselben Effekts innerhalb des Mindestabstands
// bleibt stumm, danach klingt er wieder). Teil „sfx“ prüft außerdem ohne Browser alle Aufrufnamen im Quellcode
// (tests/sfx_namen.mjs): kein aufgerufener Name ohne eigenen Effekt, alle dynamischen Stellen von Hand geprüft.
//
// Welt 7 („Lava-Festung“, Welt-7-Liste im Vertrag): die neun neuen Themen mit denselben Messungen und derselben
// Melodie-Prüfung, Hook und Kontur eigenständig gegen alle Themen (Welten 1–7 und Halloween); Tempo 128–150 BPM (Sprint
// 148–152, Lava-Burg 146–150, Karte 126–128), 16–32 Takte, Loop-Naht wie Welt 6 (Daten und gerendert), Pegel wie Welt 5
// (wenn beide Welten im selben Lauf gerendert werden). Klangfarben aus den Daten: Fanfaren-Bläser, Feuer-Whoosh,
// Feuerbälle und Knistern (Werfer-Festung), Steinglocken, großer Hall, Tropfen und Kipp-Schalter (Tempel), Countdown-
// Hook, Countdown-Piepser und Uhr-Ticken (Sprint), Bläser-Stabs und Stampf-Trommel (Schubser), Turm-Glockenspiel,
// Kettenrasseln, steigende Lava, Alarm-Sirene und Galopp-Treppe (Fluchtturm), gedämpfter Unterwasser-Klang, Blubbern
// und Rammstöße (Riff), Vulkan-Hörner, Taiko und Grollen (Vulkan-See), Kirchenorgel mit dem Baron-Brummbär-Motiv aus
// course_boss, Chor-Pad und Chor-Stimme (Lava-Burg); die Arenen und 7-Kapitän nutzen course_arena und course_diorama.
// Hörproben: tests/out/w7_<thema>_30s.wav (ab der Strophe) und tests/out/hoerprobe_welt7.wav (alle neun je 15 s ab dem
// Refrain).
//
// Welt 8 („Brummbär-Rummelplatz“, Welt-8-Liste im Vertrag, das Finale): die elf neuen Themen mit denselben Messungen und
// derselben Melodie-Prüfung, Hook und Kontur eigenständig gegen alle Themen (Welten 1–8 und Halloween); Tempo 128–150 BPM
// (Großer Turm 150, Abspann 124–128, Karte 126–128), 16–32 Takte (Abspann 32–48), Loop-Naht wie Welt 6 (Daten und gerendert)
// für alle außer dem Abspann – der spielt einmal (loop: false) und endet mit einem Schluss (Kadenz, langer Grundton,
// Schlussakkord, danach Stille; gerendert: der Nachklang verklingt). Pegel wie Welt 5. Klangfarben aus den Daten: Regen,
// Donner und Festungshörner (Regen-Festung), Wüstenflöte, Darbuka und Energie-Ebene (Dünen), Spieluhr, Glockenspiel und
// Fabrik-Klappern (Keks-Fabrik), Dampfstöße, Pfeife und Räder-Rhythmus (Baron-Express), Glas-Glocken, glitzernde
// Arpeggien und Leucht-Pings (Leuchtsteg), gedämpfter Unterwasser-Klang, Blubbern und Sonar (Wasserfestung), Celesta,
// Geisterbahn-Orgel und Theremin (Spukhaus), Kristall-Glocken, Hoover-Riser und Stampfen (Inferno), Kirchenorgel mit dem
// Baron-Brummbär-Motiv im Intro und als Gegenstimme unter der Heldenhook, Chor-Pad, Chor-Stimme, Turmglocke (Großer Turm),
// Zitate aus Welt 1 im Abspann (course_grass, world1), Drehorgel im „Umpa-pa“ (Karte); die Arenen und 8-Haus nutzen
// course_bossblob, course_boss und course_house. Hörproben: tests/out/w8_<thema>_30s.wav (ab der Strophe),
// tests/out/w8_abspann.wav (der ganze Abspann) und tests/out/hoerprobe_welt8.wav (alle elf je 15 s ab dem Refrain).
//
// Aufteilen (kürzere Läufe): AUDIO_PART=melodie,live,render,sfx (Standard: alles). „melodie“ läuft ohne Browser.
// AUDIO_THEMES=course_desert,course_space bzw. AUDIO_WORLD=1,2 (1 = Welt-1-Themen, halloween = Halloween-Welt 31, 6 = Welt 6, 7 = Welt 7, 8 = Welt 8)
// beschränken die Offline-Messung der Kurs-Themen; die Kurs-Themen werden je zwei gleichzeitig gerendert. Unter hoher
// Rechnerlast z.B. in zwei Läufen: AUDIO_PART=melodie,live,sfx und AUDIO_PART=render.
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';
import { THEMES } from '../src/audio/themes.js';
import { scanSfxNames } from './sfx_namen.mjs';
import { midi } from '../src/audio/Music.js';

const PORT = 4184;
const PARTS = (process.env.AUDIO_PART ?? 'melodie,live,render,sfx').split(',').map((s) => s.trim());
const want = (p) => PARTS.includes(p);
const ONLY = process.env.AUDIO_THEMES ? process.env.AUDIO_THEMES.split(',').map((s) => s.trim()) : null;
const HW = 31; // Halloween-Sonderwelt „Kürbisinsel“ (interne Weltnummer, Level H-1 …)
const WORLDS = process.env.AUDIO_WORLD ? process.env.AUDIO_WORLD.split(',').map((w) => (/^(h|hw|halloween)$/i.test(w.trim()) ? HW : Number(w))) : null; // Welt-1-Themen = 1
const { check, summary } = makeChecker();
const fmt = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : String(v));

// ---- Kurs-Themen: Eckdaten ----
// Vertragsnamen (docs/KURS-ARCHITEKTUR.md, Abschnitt Audio) plus Ziel, Funkelstern, Spielende.
const CONTRACT_THEMES = ['course_grass', 'course_cave', 'course_circus', 'course_river', 'course_boss', 'course_arena', 'course_diorama', 'course_map'];
// Welt 2–4: has = Spuren, die das Thema prägen; drums = Schlagzeug-Zeichen; fx = Effekt-Bus; Melodie-Angaben:
// key = Tonart (Moll mit „m“), mel = Melodie-Spuren (erste = Haupt-Stimme), hook = erster Refrain-Takt (0-basiert),
// preview = Starttakt der 30-s-Hörprobe (Strophe), world = Welt (Sammel-Hörprobe, Tonarten je Welt)
const COURSE_THEMES = {
  course_grass: { bpm: 140, bars: [16, 16], loop: true },
  course_cave: { bpm: 132, bars: [16, 16], loop: true, fx: 'delay' },
  course_circus: { bpm: 138, bars: [16, 16], loop: true, organ: true },
  course_river: { bpm: 142, bars: [16, 16], loop: true, energy: true },
  course_boss: { bpm: 145, bars: [16, 16], loop: true, riser: true },
  course_arena: { bpm: 140, bars: [8, 8], loop: true },
  course_diorama: { bpm: 112, bars: [8, 16], loop: true, beatMult: 2 }, // Kick auf 1 und 3
  course_map: { bpm: 124, bars: [8, 16], loop: true, beatMult: 2 },
  course_clear: { bars: [2, 3], loop: false, noBeat: true },
  course_star: { bpm: 160, bars: [4, 4], loop: true },
  course_gameover: { bars: [1, 3], loop: false, noBeat: true },
  // Welt 2
  course_desert: { bpm: 136, bars: [24, 24], loop: true, has: ['lead', 'piano', 'arp', 'stabs'], drums: 'dpj', key: 'Bm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 2 },
  course_space: { bpm: 132, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'pad'], fx: 'delay', key: 'E', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 2 },
  course_shadow: { bpm: 134, bars: [24, 24], loop: true, has: ['lead', 'piano', 'arp'], fx: 'delay', key: 'Gm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 2 },
  course_hills: { bpm: 144, bars: [24, 24], loop: true, has: ['lead', 'piano', 'bell'], drums: 't', key: 'F', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 2 },
  course_cherry: { bpm: 138, bars: [24, 24], loop: true, has: ['lead', 'piano', 'bell', 'organ'], key: 'A', mel: ['lead', 'piano', 'bell'], hook: 12, preview: 4, world: 2 },
  course_tank: { bpm: 140, bars: [24, 24], loop: true, has: ['lead', 'stabs'], drums: 's', key: 'Fm', mel: ['lead'], hook: 12, preview: 4, world: 2 },
  course_house: { bpm: 172, bars: [8, 8], loop: true, has: ['lead', 'stabs'], drums: 'x', key: 'Dm', mel: ['lead'], hook: 0, preview: 0, world: 2 },
  course_world2_map: { bpm: 128, bars: [16, 16], loop: true, beatMult: 2, drums: 'dp', key: 'G', mel: ['lead', 'piano'], hook: 8, preview: 0, world: 2, map: true },
  // Welt 3
  course_snow: { bpm: 132, bars: [24, 24], loop: true, has: ['lead', 'bell', 'pad', 'piano', 'arp'], drums: 'j', fx: 'delay', key: 'Eb', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 3 },
  course_ghost: { bpm: 130, bars: [24, 24], loop: true, has: ['lead', 'organ', 'whistle'], drums: 'x', key: 'C#m', mel: ['lead', 'organ', 'whistle'], hook: 12, preview: 4, world: 3 },
  course_plaza: { bpm: 148, bars: [24, 24], loop: true, has: ['lead', 'piano', 'arp'], key: 'Ab', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 3 },
  course_water: { bpm: 130, bars: [24, 24], loop: true, has: ['lead', 'arp', 'piano'], fx: 'lowpass', key: 'F#', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 3 },
  course_race: { bpm: 150, bars: [24, 24], loop: true, has: ['lead', 'arp', 'stabs', 'riser'], key: 'Em', mel: ['lead'], hook: 12, preview: 4, world: 3 },
  course_autumn: { bpm: 136, bars: [24, 24], loop: true, has: ['lead', 'arp', 'piano'], key: 'D', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 3 },
  course_train: { bpm: 146, bars: [24, 24], loop: true, has: ['whistle', 'lead'], drums: 's', key: 'C', mel: ['lead', 'whistle'], hook: 12, preview: 4, world: 3 },
  course_skyway: { bpm: 140, bars: [24, 24], loop: true, has: ['pad', 'arp', 'lead', 'bell'], key: 'Bb', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 3 },
  // Welt 4
  course_canyon: { bpm: 138, bars: [24, 24], loop: true, has: ['whistle', 'arp', 'lead'], drums: 's', key: 'Am', mel: ['lead', 'whistle'], hook: 12, preview: 4, world: 4 },
  course_poison: { bpm: 134, bars: [24, 24], loop: true, has: ['lead', 'arp', 'stabs'], key: 'F#m', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 4 },
  course_beep: { bpm: 128, bars: [24, 24], loop: true, has: ['bell', 'lead', 'piano'], drums: 'x', key: 'Cm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 4 },
  course_bounce: { bpm: 142, bars: [24, 24], loop: true, has: ['lead', 'arp', 'piano'], key: 'Db', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 4 },
  course_ruins: { bpm: 132, bars: [24, 24], loop: true, has: ['whistle', 'arp', 'lead'], drums: 't', key: 'Dm', mel: ['lead', 'whistle'], hook: 12, preview: 4, world: 4 },
  course_lavacastle: { bpm: 148, bars: [24, 24], loop: true, has: ['organ', 'stabs', 'lead', 'riser'], key: 'Ebm', mel: ['lead', 'organ'], hook: 12, preview: 4, world: 4 },
  // Karten
  course_world3_map: { bpm: 128, bars: [16, 16], loop: true, beatMult: 2, drums: 'j', key: 'F', mel: ['lead', 'piano'], hook: 8, preview: 0, world: 3, map: true },
  course_world4_map: { bpm: 128, bars: [16, 16], loop: true, beatMult: 2, has: ['whistle', 'lead'], key: 'E', mel: ['lead', 'whistle'], hook: 8, preview: 0, world: 4, map: true },
  // Welt 5
  course_beach: { bpm: 132, bars: [24, 24], loop: true, energy: true, has: ['lead', 'bell', 'arp', 'piano', 'energy'], drums: 'jpd', fx: 'delay', key: 'D', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 5 },
  course_trapeze: { bpm: 138, bars: [24, 24], loop: true, has: ['lead', 'organ', 'whistle'], drums: 'o', key: 'F', mel: ['lead', 'organ', 'whistle'], hook: 12, preview: 4, world: 5 },
  course_bluelava: { bpm: 150, bars: [16, 16], loop: true, has: ['lead', 'piano', 'arp', 'bell', 'riser'], key: 'Gm', mel: ['lead', 'piano'], hook: 6, preview: 2, world: 5 },
  course_savanna: { bpm: 130, bars: [24, 24], loop: true, has: ['whistle', 'lead', 'arp'], drums: 'dpjt', fx: 'delay', key: 'A', mel: ['lead', 'whistle'], hook: 12, preview: 4, world: 5 },
  course_mine: { bpm: 136, bars: [24, 24], loop: true, has: ['lead', 'piano', 'bass', 'riser'], drums: 'xt', key: 'Dm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 5 },
  course_cake: { bpm: 144, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'echo'], drums: 'p', key: 'E', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 5 },
  course_sneak: { bpm: 130, bars: [24, 24], loop: true, has: ['lead', 'piano', 'arp', 'riser'], drums: 'xp', fx: 'lowpass', key: 'Bbm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 5 },
  course_goldtrain: { bpm: 156, bars: [24, 24], loop: true, has: ['lead', 'bell', 'whistle', 'arp', 'riser'], key: 'B', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 5 },
  course_temple: { bpm: 146, bars: [24, 24], loop: true, has: ['lead', 'bell', 'stabs', 'riser'], drums: 't', key: 'G#m', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 5 },
  course_world5_map: { bpm: 128, bars: [16, 16], loop: true, beatMult: 2, has: ['lead', 'piano', 'bell'], drums: 'jp', key: 'C', mel: ['lead', 'piano'], hook: 8, preview: 0, world: 5, map: true },
  // Halloween-Sonderwelt „Kürbisinsel“ (Welt 31)
  course_pumpkin: { bpm: 136, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'echo', 'piano', 'stabs'], drums: 'p', fx: 'delay', key: 'Em', mel: ['lead', 'bell'], hook: 12, preview: 4, world: HW },
  course_candyvillage: { bpm: 140, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'piano', 'stabs'], drums: 'p', key: 'F', mel: ['lead', 'bell'], hook: 12, preview: 4, world: HW },
  course_graveyard: { bpm: 132, bars: [24, 24], loop: true, has: ['lead', 'whistle', 'organ', 'bell', 'piano'], fx: 'delay', key: 'Gm', mel: ['lead', 'whistle'], hook: 12, preview: 4, world: HW },
  course_witchtower: { bpm: 144, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'echo', 'riser'], key: 'Am', mel: ['lead', 'bell'], hook: 12, preview: 4, world: HW },
  course_brummula: { bpm: 148, bars: [24, 24], loop: true, has: ['lead', 'organ', 'pad', 'bell', 'stabs', 'riser'], drums: 't', key: 'Cm', mel: ['lead', 'organ'], hook: 12, preview: 4, world: HW },
  course_halloween_map: { bpm: 126, bars: [16, 16], loop: true, beatMult: 2, has: ['lead', 'bell', 'whistle', 'arp'], key: 'Dm', mel: ['lead', 'bell'], hook: 8, preview: 0, world: HW, map: true },
  // Welt 6 „Wolkeninseln“
  course_clearpipe: { bpm: 140, bars: [24, 24], loop: true, has: ['lead', 'bell', 'echo', 'arp', 'piano', 'stabs', 'riser'], drums: 'd', fx: 'delay', key: 'G', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 6 },
  course_wreck: { bpm: 132, bars: [24, 24], loop: true, has: ['lead', 'organ', 'bell', 'whistle', 'piano', 'stabs'], drums: 'x', fx: 'delay', key: 'Em', mel: ['lead', 'organ'], hook: 12, preview: 4, world: 6 },
  course_fareast: { bpm: 140, bars: [24, 24], loop: true, has: ['lead', 'whistle', 'arp', 'bell', 'piano', 'stabs'], drums: 'p', fx: 'lowpass', key: 'Bm', mel: ['lead', 'whistle'], hook: 12, preview: 4, world: 6 },
  course_jungle: { bpm: 136, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'echo', 'piano', 'stabs'], drums: 'dpjt', fx: 'delay', key: 'F', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 6 },
  course_snowwind: { bpm: 134, bars: [24, 24], loop: true, has: ['lead', 'bell', 'echo', 'arp', 'pad', 'riser', 'piano'], drums: 'j', fx: 'delay', key: 'A', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 6 },
  course_factory: { bpm: 144, bars: [24, 24], loop: true, has: ['lead', 'piano', 'arp', 'bell', 'stabs', 'riser'], drums: 'xt', fx: 'lowpass', key: 'Dm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 6 },
  course_fuzzymine: { bpm: 150, bars: [24, 24], loop: true, has: ['lead', 'piano', 'arp', 'stabs', 'riser'], drums: 'xt', key: 'Cm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 6 },
  course_bossblob: { bpm: 146, bars: [24, 24], loop: true, has: ['lead', 'organ', 'echo', 'stabs', 'piano', 'riser'], drums: 't', key: 'Gm', mel: ['lead', 'organ'], hook: 12, preview: 4, world: 6 },
  course_world6_map: { bpm: 128, bars: [16, 16], loop: true, beatMult: 2, has: ['lead', 'piano', 'bell', 'arp'], key: 'D', mel: ['lead', 'piano'], hook: 8, preview: 0, world: 6, map: true },
  // Welt 7 „Lava-Festung“
  course_fortfire: { bpm: 142, bars: [24, 24], loop: true, has: ['lead', 'organ', 'echo', 'piano', 'stabs', 'riser'], drums: 'j', fx: 'delay', key: 'Dm', mel: ['lead', 'organ'], hook: 12, preview: 4, world: 7 },
  course_switchruins: { bpm: 134, bars: [24, 24], loop: true, has: ['lead', 'bell', 'whistle', 'echo', 'arp', 'piano', 'stabs', 'pad'], drums: 'x', fx: 'delay', key: 'F#m', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 7 },
  course_redhot: { bpm: 150, bars: [24, 24], loop: true, has: ['lead', 'piano', 'bell', 'arp', 'stabs', 'riser'], drums: 'x', key: 'E', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 7 },
  course_bluebelt: { bpm: 138, bars: [24, 24], loop: true, has: ['lead', 'stabs', 'piano', 'arp', 'pad'], drums: 'd', key: 'F', mel: ['lead', 'stabs'], hook: 12, preview: 4, world: 7 },
  course_traptower: { bpm: 146, bars: [24, 24], loop: true, has: ['lead', 'bell', 'whistle', 'arp', 'piano', 'stabs', 'riser'], drums: 'j', key: 'Bm', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 7 },
  course_rammreef: { bpm: 132, bars: [24, 24], loop: true, has: ['lead', 'bell', 'echo', 'arp', 'piano', 'stabs', 'pad'], drums: 'd', fx: 'lowpass', key: 'Eb', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 7 },
  course_volcano: { bpm: 140, bars: [24, 24], loop: true, has: ['lead', 'organ', 'stabs', 'piano', 'riser'], drums: 't', fx: 'delay', key: 'Em', mel: ['lead', 'organ'], hook: 12, preview: 4, world: 7 },
  course_keep: { bpm: 148, bars: [24, 24], loop: true, has: ['lead', 'organ', 'whistle', 'pad', 'stabs', 'riser'], drums: 'tj', key: 'Cm', mel: ['lead', 'organ'], hook: 12, preview: 4, world: 7 },
  course_world7_map: { bpm: 126, bars: [16, 16], loop: true, beatMult: 2, has: ['lead', 'piano', 'echo', 'arp'], key: 'Gm', mel: ['lead', 'piano'], hook: 8, preview: 0, world: 7, map: true },
  // Welt 8 „Brummbär-Rummelplatz“ (full = ganzes Stück als Hörprobe, kein Loop)
  course_rainfort: { bpm: 140, bars: [24, 24], loop: true, has: ['lead', 'organ', 'echo', 'piano', 'stabs', 'pad', 'riser'], drums: 'jt', fx: 'delay', key: 'C#m', mel: ['lead', 'organ'], hook: 12, preview: 4, world: 8 },
  course_dunes: { bpm: 144, bars: [24, 24], loop: true, energy: true, has: ['lead', 'whistle', 'arp', 'piano', 'stabs', 'riser', 'energy'], drums: 'dpj', fx: 'delay', key: 'A', mel: ['lead', 'whistle'], hook: 12, preview: 4, world: 8 },
  course_cookie: { bpm: 138, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'echo', 'piano', 'stabs'], drums: 'px', fx: 'delay', key: 'F', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 8 },
  course_baronexpress: { bpm: 146, bars: [24, 24], loop: true, has: ['lead', 'piano', 'whistle', 'bell', 'stabs', 'riser'], drums: 'jx', fx: 'delay', key: 'Gm', mel: ['lead', 'piano'], hook: 12, preview: 4, world: 8 },
  course_footlight: { bpm: 136, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'echo', 'piano', 'stabs', 'pad'], drums: 'd', fx: 'delay', key: 'Em', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 8 },
  course_dungeon: { bpm: 130, bars: [24, 24], loop: true, energy: true, has: ['lead', 'bell', 'echo', 'whistle', 'arp', 'organ', 'piano', 'stabs', 'pad', 'energy'], drums: 'd', fx: 'lowpass', key: 'Fm', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 8 },
  course_beamdark: { bpm: 132, bars: [24, 24], loop: true, has: ['lead', 'bell', 'organ', 'whistle', 'piano', 'stabs'], drums: 'px', fx: 'delay', key: 'Am', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 8 },
  course_inferno: { bpm: 150, bars: [24, 24], loop: true, has: ['lead', 'bell', 'arp', 'piano', 'stabs', 'riser'], drums: 'dt', key: 'Dm', mel: ['lead', 'bell'], hook: 12, preview: 4, world: 8 },
  course_finale: { bpm: 150, bars: [32, 32], loop: true, has: ['lead', 'organ', 'whistle', 'bell', 'arp', 'pad', 'stabs', 'piano', 'riser'], drums: 'tj', fx: 'delay', key: 'Cm', mel: ['lead'], hook: 12, preview: 4, world: 8 },
  course_abspann: { bpm: 126, bars: [40, 40], loop: false, has: ['lead', 'bell', 'whistle', 'piano', 'stabs', 'pad'], fx: 'delay', key: 'G', mel: ['lead', 'bell'], hook: 12, preview: 0, full: true, world: 8 },
  course_world8_map: { bpm: 128, bars: [16, 16], loop: true, has: ['lead', 'organ', 'bell', 'piano'], drums: 'j', fx: 'delay', key: 'Eb', mel: ['lead', 'organ'], hook: 8, preview: 0, world: 8, map: true },
};
// Musiknamen Welt 2–4 (Auftrag/Vertrag) und Karten-Themen je Welt
const CONTRACT_THEMES_W = ['course_desert', 'course_space', 'course_shadow', 'course_hills', 'course_cherry', 'course_tank', 'course_house',
  'course_snow', 'course_ghost', 'course_plaza', 'course_water', 'course_race', 'course_autumn', 'course_train', 'course_skyway',
  'course_canyon', 'course_poison', 'course_beep', 'course_bounce', 'course_ruins', 'course_lavacastle',
  'course_world2_map', 'course_world3_map', 'course_world4_map'];
// Musiknamen Welt 5 (Welt-5-Liste im Vertrag) und die Welt-5-Karte
const CONTRACT_THEMES_W5 = ['course_beach', 'course_trapeze', 'course_bluelava', 'course_savanna', 'course_mine', 'course_cake', 'course_sneak',
  'course_goldtrain', 'course_temple', 'course_world5_map'];
// Musiknamen der Halloween-Welt (Vertrag: Level-Liste „Kürbisinsel“) und ihre Karte
const CONTRACT_THEMES_H = ['course_pumpkin', 'course_candyvillage', 'course_graveyard', 'course_witchtower', 'course_brummula', 'course_halloween_map'];
// Musiknamen Welt 6 (Welt-6-Liste im Vertrag) und die Welt-6-Karte; Arenen, 6-Haus und 6-Panzer nutzen vorhandene Themen
const CONTRACT_THEMES_W6 = ['course_clearpipe', 'course_wreck', 'course_fareast', 'course_jungle', 'course_snowwind', 'course_factory',
  'course_fuzzymine', 'course_bossblob', 'course_world6_map'];
const REUSED_W6 = ['course_arena', 'course_house', 'course_tank'];
// Musiknamen Welt 7 (Welt-7-Liste im Vertrag) und die Welt-7-Karte; die Arenen und 7-Kapitän nutzen vorhandene Themen
const CONTRACT_THEMES_W7 = ['course_fortfire', 'course_switchruins', 'course_redhot', 'course_bluebelt', 'course_traptower', 'course_rammreef',
  'course_volcano', 'course_keep', 'course_world7_map'];
const REUSED_W7 = ['course_arena', 'course_diorama'];
// Musiknamen Welt 8 (Welt-8-Liste im Vertrag) mit Abspann und Karte; 8-A, 8-B und 8-Haus nutzen vorhandene Themen
const CONTRACT_THEMES_W8 = ['course_rainfort', 'course_dunes', 'course_cookie', 'course_baronexpress', 'course_footlight', 'course_dungeon',
  'course_beamdark', 'course_inferno', 'course_finale', 'course_abspann', 'course_world8_map'];
const REUSED_W8 = ['course_bossblob', 'course_boss', 'course_house'];
const BEEP_BPM = THEMES.course_beep.bpm;

// ---- Melodie-Prüfung (aus den Themen-Daten, ohne Browser) ----
// Maßstab Welt 1: dieselben Kennzahlen der Welt-1-Themen (Melodie-Spuren und erster Hook-Takt je Thema).
const W1_MELODY = {
  world1: { key: 'Am', mel: ['lead'], hook: 4 }, course_grass: { key: 'G', mel: ['lead'], hook: 4 },
  course_cave: { key: 'Em', mel: ['lead'], hook: 4 }, course_circus: { key: 'C', mel: ['piano', 'organ'], hook: 0 },
  course_river: { key: 'D', mel: ['lead'], hook: 4 }, course_boss: { key: 'Cm', mel: ['lead'], hook: 4 },
  course_arena: { key: 'F#m', mel: ['lead'], hook: 4 }, course_diorama: { key: 'F', mel: ['piano'], hook: 0 },
  course_map: { key: 'Bb', mel: ['piano'], hook: 0 },
};
const TONAL = ['lead', 'energy', 'stabs', 'piano', 'pad', 'bass', 'organ', 'arp', 'echo', 'riser', 'bell', 'whistle'];
const barCount = (th) => Math.max(...[...TONAL, 'drums'].map((k) => (th[k] ?? []).length));
/** Melodie-Linie: Einzeltöne und Zweiklänge (oberer Ton) der Melodie-Spuren, bei gleichem Einsatz der höchste Ton. */
function melodyLine(th, tracks) {
  const ev = [];
  for (const k of tracks) {
    let pos = 0;
    for (const bar of th[k] ?? []) {
      for (const tok of bar.trim().split(/\s+/)) {
        const [n, d] = tok.split(':');
        if (n !== '-') { const ns = n.split('+').map(midi); if (ns.length <= 2) ev.push({ step: pos, dur: +d, note: Math.max(...ns) }); }
        pos += +d;
      }
    }
  }
  ev.sort((p, q) => p.step - q.step || q.note - p.note);
  return ev.filter((e, i) => i === 0 || ev[i - 1].step !== e.step);
}
const SCALE = { dur: [0, 2, 4, 5, 7, 9, 11], moll: [0, 2, 3, 5, 7, 8, 10, 11] }; // Moll: natürlich + Leitton
function scaleOf(key) {
  const m = /^([A-G][#b]?)(m?)$/.exec(key);
  const root = midi(`${m[1]}4`) % 12;
  return new Set(SCALE[m[2] ? 'moll' : 'dur'].map((s) => (root + s) % 12));
}
const shareOf = (arr, fn) => arr.filter(fn).length / Math.max(1, arr.length);
/** Kennzahlen der Melodie eines Themas. */
function melodyStats(th, { mel: tracks, key, hook }) {
  const bars = barCount(th), line = melodyLine(th, tracks), main = melodyLine(th, [tracks[0]]).map((e) => e.note);
  const sounding = new Uint8Array(bars * 16);
  for (const e of line) for (let s = e.step; s < Math.min(bars * 16, e.step + e.dur); s++) sounding[s] = 1;
  let withMel = 0;
  for (let b = 0; b < bars; b++) { let n = 0; for (let s = b * 16; s < b * 16 + 16; s++) n += sounding[s]; if (n >= 4) withMel++; }
  // Intervalle innerhalb der Phrasen (Pause kürzer als ein Takt)
  const iv = [];
  for (let i = 1; i < line.length; i++) if (line[i].step - (line[i - 1].step + line[i - 1].dur) < 16) iv.push(Math.abs(line[i].note - line[i - 1].note));
  const scale = scaleOf(key);
  // Takt-Muster: Einsätze mit Tonklasse (oktavgleich: das Intro-Riff eine Oktave tiefer zählt als Hook) bzw. nur Einsätze
  const barSig = (b, withPitch) => line.filter((e) => e.step >= b * 16 && e.step < b * 16 + 16).map((e) => `${e.step - b * 16}${withPitch ? `:${e.note % 12}` : ''}`);
  const sigs = Array.from({ length: bars }, (_, b) => barSig(b, true).join(' '));
  const rhy = Array.from({ length: bars }, (_, b) => barSig(b, false).join(' '));
  const melBars = sigs.map((_, b) => b).filter((b) => barSig(b, false).length >= 2);
  const h = line.filter((e) => e.step >= hook * 16 && e.step < hook * 16 + 32);
  return {
    bars, notes: line.length, barShare: withMel / bars,
    steps: shareOf(iv, (x) => x <= 4), leaps: shareOf(iv, (x) => x > 7), maxLeap: Math.max(0, ...iv),
    range: main.length ? Math.max(...main) - Math.min(...main) : 0,
    diatonic: shareOf(line, (e) => scale.has(e.note % 12)),
    hookCount: sigs.filter((s) => s === sigs[hook]).length,
    rhythmRep: shareOf(melBars, (b) => melBars.some((o) => o !== b && rhy[o] === rhy[b])),
    hookSig: h.map((e) => `${e.step - hook * 16}:${e.note - h[0].note}`), // zwei Takte ab Refrain: Einsatz und Abstand zum ersten Ton
    hookNotes: h.map((e) => e.note),                                       // dieselben Töne (für die Kontur)
  };
}
const noteList = (bars) => {
  const out = [];
  let pos = 0;
  for (const bar of bars) for (const tok of bar.trim().split(/\s+/)) { const [n, d] = tok.split(':'); if (n !== '-') out.push([pos, n.split('+').map(midi).join('+')]); pos += +d; }
  return out;
};
const layers = (bar) => (Array.isArray(bar) ? bar : [bar]);
/** Loop-Naht aus den Daten: Melodie-Sprung über die Naht ≤ Quinte, Wirbel im letzten Takt, Crash auf der Eins. */
function checkSeam(n) {
  const th = THEMES[n], spec = COURSE_THEMES[n], line = melodyLine(th, spec.mel), bars = barCount(th);
  const seam = line.length ? Math.abs(line[0].note - line[line.length - 1].note) : 99;
  const gap = line.length ? line[0].step + bars * 16 - (line[line.length - 1].step + line[line.length - 1].dur) : 99;
  const fill = layers(th.drums[bars - 1]).some((l) => /[st]/.test(l.slice(8))), crash = layers(th.drums[0]).some((l) => l[0] === 'r');
  check(`${n}: Loop-Naht – Melodie springt über die Naht ${seam} HT (≤ 7, Lücke ${gap} Sechzehntel), Wirbel im letzten Takt, Crash auf der Eins`, seam <= 7 && fill && crash);
}
const median = (xs) => { const s = [...xs].sort((p, q) => p - q); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const mean = (xs) => xs.reduce((p, q) => p + q, 0) / xs.length;

if (want('melodie')) {
  const w1 = Object.entries(W1_MELODY).map(([n, spec]) => ({ name: n, ...melodyStats(THEMES[n], spec) }));
  const row = (r) => `${r.name.padEnd(18)} ${String(r.bars).padStart(2)} Takte, Melodie in ${fmt(r.barShare * 100, 0).padStart(3)} % der Takte, Intervalle ≤ 4 HT ${fmt(r.steps * 100, 0)} %, > 7 HT ${fmt(r.leaps * 100, 0)} % (max ${r.maxLeap}), Umfang ${r.range} HT, leitereigen ${fmt(r.diatonic * 100, 0)} %, Hook ${r.hookCount}×, Rhythmus-Wdh. ${fmt(r.rhythmRep * 100, 0)} %`;
  console.log('\nMelodie Welt 1 (Maßstab):');
  for (const r of w1) console.log(`   ${row(r)}`);
  const lim = {
    barShare: mean(w1.map((r) => r.barShare)),      // Anteil der Takte mit Melodie: mindestens Welt-1-Mittel
    steps: Math.min(...w1.map((r) => r.steps)),     // Schritte und kleine Sprünge: mindestens wie das schwächste Welt-1-Thema
    leaps: Math.max(...w1.map((r) => r.leaps)),     // große Sprünge (> Quinte): höchstens wie in Welt 1
    rhythmRep: median(w1.map((r) => r.rhythmRep)),  // Rhythmus-Wiederholung: mindestens Welt-1-Median
    range: 24,                                      // Haupt-Stimme singbar: höchstens zwei Oktaven (Welt 1: bis ${max})
  };
  console.log(`   Grenzen: Melodie-Takte ≥ ${fmt(lim.barShare * 100, 0)} %, ≤ 4 HT ≥ ${fmt(lim.steps * 100, 0)} %, > 7 HT ≤ ${fmt(lim.leaps * 100, 0)} %, Rhythmus-Wdh. ≥ ${fmt(lim.rhythmRep * 100, 0)} %, Umfang ≤ ${lim.range} HT (Welt 1 bis ${Math.max(...w1.map((r) => r.range))}), leitereigen ≥ 90 %, Hook ≥ 2×`);
  const fresh = Object.entries(COURSE_THEMES).filter(([n, s]) => s.key && THEMES[n]).map(([n, s]) => ({ name: n, spec: s, ...melodyStats(THEMES[n], s) }));
  console.log('Melodie Welt 2–8 und Halloween:');
  for (const r of fresh) console.log(`   ${row(r)}  [${r.spec.key}, ${THEMES[r.name].bpm} BPM]`);
  for (const r of fresh) {
    check(`${r.name}: Melodie in ${fmt(r.barShare * 100, 0)} % der Takte (Welt 1 im Mittel ${fmt(lim.barShare * 100, 0)} %)`, r.barShare >= lim.barShare - 1e-9);
    check(`${r.name}: überwiegend Schritte und kleine Sprünge (≤ 4 HT ${fmt(r.steps * 100, 0)} %, > 7 HT ${fmt(r.leaps * 100, 0)} %), Umfang ${r.range} HT`, r.steps >= lim.steps && r.leaps <= lim.leaps && r.range <= lim.range);
    check(`${r.name}: Refrain-Hook kehrt wieder (${r.hookCount}×), Rhythmus-Wiederholung ${fmt(r.rhythmRep * 100, 0)} %`, r.hookCount >= 2 && r.rhythmRep >= lim.rhythmRep);
    check(`${r.name}: ${fmt(r.diatonic * 100, 0)} % der Melodietöne leitereigen in ${r.spec.key}`, r.diatonic >= 0.9);
  }
  // Abwechslung: keine zwei Hooks gleichen sich – alle Themen der Welten 1–8 und der Halloween-Welt paarweise, in beide
  // Richtungen (Anteil gemeinsamer Einsätze mit gleichem Abstand zum ersten Ton in den zwei Refrain-Takten). Die Hooks
  // der Welten 5, 6, 7 und 8 und der Halloween-Welt zusätzlich über die Kontur gegen alle Themen: Intervallfolge ohne
  // Rhythmus, Anteil gemeinsamer Vierton-Figuren (drei aufeinanderfolgende Intervalle) – so fällt auch eine umrhythmisierte
  // oder versetzte Melodie auf. (Unter den Themen der Welten 1–4 erreicht die Kontur bis 60 %; diese Themen bleiben
  // unverändert, geprüft wird sie für Welt 5, 6, 7, 8 und die Halloween-Welt.)
  const every = [...w1.map((r) => ({ ...r, spec: { world: 1 } })), ...fresh];
  const simSig = (p, q) => { const A = new Set(p.hookSig); return q.hookSig.filter((x) => A.has(x)).length / Math.max(A.size, q.hookSig.length); };
  const figures = (ns) => { const iv = ns.slice(1).map((n, i) => n - ns[i]); return iv.slice(2).map((_, i) => iv.slice(i, i + 3).join(',')); };
  const simShape = (p, q) => { const A = figures(p.hookNotes), B = new Set(figures(q.hookNotes)); return A.filter((x) => B.has(x)).length / Math.max(1, A.length); };
  const both = (f, p, q) => Math.max(f(p, q), f(q, p));
  let worst = { sim: 0 }, oldShape = { sim: 0 };
  for (let i = 0; i < every.length; i++) {
    for (let j = i + 1; j < every.length; j++) {
      const sim = both(simSig, every[i], every[j]);
      if (sim > worst.sim) worst = { sim, a: every[i].name, b: every[j].name };
      const shape = both(simShape, every[i], every[j]);
      if (every[i].spec.world < 5 && every[j].spec.world < 5 && shape > oldShape.sim) oldShape = { sim: shape, a: every[i].name, b: every[j].name };
    }
  }
  check(`Hooks verschieden (Welt 1–8 und Halloween, ${every.length} Themen): größte Ähnlichkeit zweier Refrain-Hooks ${fmt(worst.sim * 100, 0)} % (${worst.a} / ${worst.b}) < 50 %`, worst.sim < 0.5);
  console.log(`   Kontur der Hooks unter den Themen der Welten 1–4: höchstens ${fmt(oldShape.sim * 100, 0)} % (${oldShape.a} / ${oldShape.b})`);
  for (const r of fresh.filter((x) => [5, 6, 7, 8, HW].includes(x.spec.world))) {
    const others = every.filter((o) => o.name !== r.name);
    const top = (f) => others.map((o) => ({ o: o.name, v: both(f, r, o) })).sort((p, q) => q.v - p.v)[0];
    const x = top(simSig), y = top(simShape);
    check(`${r.name}: Hook eigenständig gegen alle Themen – Einsatz+Intervall höchstens ${fmt(x.v * 100, 0)} % (${x.o}), Kontur höchstens ${fmt(y.v * 100, 0)} % (${y.o}), je < 50 %`, x.v < 0.5 && y.v < 0.5);
  }
  for (const w of [2, 3, 4, 5, 6, 7, 8, HW]) {
    const keys = fresh.filter((r) => r.spec.world === w).map((r) => r.spec.key);
    if (keys.length) check(`${w === HW ? 'Halloween-Welt' : `Welt ${w}`}: jede Melodie in eigener Tonart (${keys.join(', ')})`, new Set(keys).size === keys.length);
  }

  // Welt 5 aus den Themen-Daten: Tempo, Dreier-Gefühl des Trapezes, gedämpfte Schleich-Festung
  check(`Welt 5: alle ${CONTRACT_THEMES_W5.length} Themen der Welt-5-Liste vorhanden`, CONTRACT_THEMES_W5.every((n) => THEMES[n] && COURSE_THEMES[n]?.world === 5));
  const w5bpm = CONTRACT_THEMES_W5.map((n) => `${n.replace('course_', '')} ${THEMES[n].bpm}`);
  check(`Welt 5: Tempo 128–150 BPM, nur der Goldzug schneller (${w5bpm.join(', ')})`, CONTRACT_THEMES_W5.every((n) => (n === 'course_goldtrain' ? THEMES[n].bpm > 150 : THEMES[n].bpm >= 128 && THEMES[n].bpm <= 150)));
  const onsets = (bar) => noteList([bar]).map(([p]) => p).join(',');
  const tz = THEMES.course_trapeze, tzVerse = [4, 5, 6, 7, 8, 9, 10, 11];
  check('course_trapeze: Dreier-Gefühl – in der Strophe Bass auf 0, 6, 12 und Orgel auf 2, 4, 8, 10, 14 (3+3+2 Achtel) über Kick auf 0, 4, 8, 12', tzVerse.every((b) => onsets(tz.bass[b]) === '0,6,12' && onsets(tz.organ[b]) === '2,4,8,10,14')
    && tzVerse.every((b) => tz.drums[b].some((l) => l === 'k...k...k...k...')));
  const sn = THEMES.course_sneak;
  check('course_sneak: gedämpft (Tiefpass ≤ 1800 Hz auf Piano, Stabs und Pad, Lead weich ≤ 3 kHz), Echo auf dem Lead', ['piano', 'stabs', 'pad'].every((k) => sn.fx.lowpass[k] <= 1800) && sn.voice.lead.cutoff <= 3000 && sn.fx.delay.send.lead > 0);

  // Halloween-Welt aus den Themen-Daten: Vollständigkeit, Tempo, Länge, Loop-Naht, Klangfarben, Baron-Brummbär-Motiv
  console.log('\nHalloween-Welt „Kürbisinsel“:');
  check(`Halloween: alle ${CONTRACT_THEMES_H.length} Themen der Level-Liste vorhanden (${CONTRACT_THEMES_H.join(', ')})`, CONTRACT_THEMES_H.every((n) => THEMES[n] && COURSE_THEMES[n]?.world === HW));
  const hwBpm = (n) => (n === 'course_halloween_map' ? [124, 128] : n === 'course_brummula' ? [146, 150] : [128, 150]);
  check(`Halloween: Tempo 128–150 BPM, Gruselschloss 146–150, Karte 124–128 (${CONTRACT_THEMES_H.map((n) => `${n.replace('course_', '')} ${THEMES[n].bpm}`).join(', ')})`, CONTRACT_THEMES_H.every((n) => THEMES[n].bpm >= hwBpm(n)[0] && THEMES[n].bpm <= hwBpm(n)[1]));
  check(`Halloween: 16–32 Takte (${CONTRACT_THEMES_H.map((n) => barCount(THEMES[n])).join(', ')})`, CONTRACT_THEMES_H.every((n) => barCount(THEMES[n]) >= 16 && barCount(THEMES[n]) <= 32));
  // Loop-Naht: der letzte Melodieton führt ohne großen Sprung in den ersten (über die Naht), der letzte Takt hat einen
  // Wirbel (Snare/Tom in der zweiten Takthälfte), die Eins des Loops einen Crash
  for (const n of CONTRACT_THEMES_H) checkSeam(n);
  // Kürbisfeld: die Celesta spielt die Refrain-Hook im Intro in e-Moll – gleicher Rhythmus, jeder Ton zwei Leiterstufen tiefer
  const pu = THEMES.course_pumpkin, puScale = [...scaleOf('G')].sort((p, q) => p - q);
  const degree = (m) => Math.floor(m / 12) * 7 + puScale.indexOf(m % 12);
  const minorShift = [[0, 12], [2, 14]].every(([a, b]) => {
    const x = noteList([pu.bell[a]]), y = noteList([pu.lead[b]]);
    return x.length === y.length && x.length >= 6 && x.every(([p, m], i) => p === y[i][0] && degree(+y[i][1]) - degree(+m) === 2);
  });
  check('course_pumpkin: Dur/Moll-Wechsel – die Celesta spielt die G-Dur-Hook im Intro in e-Moll (gleicher Rhythmus, je Ton zwei Leiterstufen tiefer)', minorShift && pu.voice.bell.ratio >= 3);
  const cv = THEMES.course_candyvillage, gy = THEMES.course_graveyard, wt = THEMES.course_witchtower, br = THEMES.course_brummula;
  check('course_candyvillage: Knochen-Xylofon (holziger Dreieck-Anschlag, kurz ≤ 0,15 s) spielt die Hook im Intro', cv.voice.bell.type === 'triangle' && cv.voice.bell.decay <= 0.15 && cv.bell[0] === cv.lead[12]);
  check('course_graveyard: Theremin mit weitem Vibrato (≥ 30 Cent) spielt die Hook im Intro, Orgel-Stabs auf der „und“', gy.voice.whistle.vibrato >= 30 && gy.whistle[0] === gy.lead[12]
    && noteList([gy.organ[4]]).map(([p]) => p).join() === '2,6,10,14');
  check('course_witchtower: Cembalo (gezupfter Sägezahn, kurz) in Sechzehnteln, Glocken spielen die Hook im Intro, aufsteigende Hook (Gipfel je Takt höher)', wt.voice.arp.type === 'sawtooth' && wt.voice.arp.decay <= 0.12
    && noteList([wt.arp[4]]).length === 16 && wt.bell[0] === wt.lead[12] && [12, 13, 14].every((b, i, a) => i === 0 || Math.max(...noteList([wt.lead[b]]).map(([, m]) => +m)) > Math.max(...noteList([wt.lead[a[i - 1]]]).map(([, m]) => +m))));
  // Graf Brummbär: die Kirchenorgel spielt im Intro das Baron-Motiv aus course_boss (Lead Takt 5) in doppelter Notenlänge,
  // die Refrain-Hook beginnt mit dessen Kopf (vier Einsätze mit gleichen Intervallen) – eigenständig bleibt sie trotzdem (oben)
  const baron = noteList([THEMES.course_boss.lead[4]]), organ = noteList(br.organ.slice(0, 2));
  const head = (ns) => ns.slice(0, 4).map(([p, m]) => `${p}:${+m - +ns[0][1]}`).join(' ');
  check(`course_brummula: Kirchenorgel spielt im Intro das Baron-Brummbär-Motiv (course_boss) in doppelter Notenlänge (${baron.length} Töne)`, baron.length === 8
    && organ.length === baron.length && organ.every(([p, m], i) => p === 2 * baron[i][0] && m === baron[i][1]) && br.voice.organ.cutoff <= 2600);
  check(`course_brummula: Refrain-Hook beginnt mit dem Kopf des Baron-Motivs (${head(baron)}), Chor-Pad, Turmglocke`, head(noteList([br.lead[12]])) === head(baron) && br.pad.filter((b) => b !== '-:16').length >= 20 && noteList(br.bell).length >= 4);

  // Welt 6 aus den Themen-Daten: Vollständigkeit, Tempo, Länge, Loop-Naht, Klangfarben (Welt-Charakter nur über den Klang)
  console.log('\nWelt 6 „Wolkeninseln“:');
  check(`Welt 6: alle ${CONTRACT_THEMES_W6.length} Themen der Welt-6-Liste vorhanden (${CONTRACT_THEMES_W6.join(', ')})`, CONTRACT_THEMES_W6.every((n) => THEMES[n] && COURSE_THEMES[n]?.world === 6));
  check(`Welt 6: Arenen, 6-Haus und 6-Panzer nutzen vorhandene Themen (${REUSED_W6.join(', ')})`, REUSED_W6.every((n) => THEMES[n] && COURSE_THEMES[n]));
  const w6Bpm = (n) => (n === 'course_world6_map' ? [126, 128] : n === 'course_fuzzymine' ? [148, 152] : [128, 150]);
  check(`Welt 6: Tempo 128–150 BPM, Wuschel-Mine 148–152, Karte 126–128 (${CONTRACT_THEMES_W6.map((n) => `${n.replace('course_', '')} ${THEMES[n].bpm}`).join(', ')})`, CONTRACT_THEMES_W6.every((n) => THEMES[n].bpm >= w6Bpm(n)[0] && THEMES[n].bpm <= w6Bpm(n)[1]));
  check(`Welt 6: 16–32 Takte (${CONTRACT_THEMES_W6.map((n) => barCount(THEMES[n])).join(', ')})`, CONTRACT_THEMES_W6.every((n) => barCount(THEMES[n]) >= 16 && barCount(THEMES[n]) <= 32));
  for (const n of CONTRACT_THEMES_W6) checkSeam(n);
  const T6 = Object.fromEntries(CONTRACT_THEMES_W6.map((n) => [n, THEMES[n]]));
  const sameNotes = (a, b, semis = 0) => { const x = noteList([a]), y = noteList([b]); return x.length >= 5 && x.length === y.length && x.every(([p, m], i) => p === y[i][0] && +m === +y[i][1] + semis); };
  const onsetsOf = (bar) => noteList([bar]).map(([p]) => p).join(',');
  const pcs = (bars) => noteList(bars).flatMap(([, m]) => m.split('+').map((x) => +x % 12));
  const roots = (bars) => bars.map((b) => noteList([b])[0]?.[1] % 12);
  {
    const t = T6.course_clearpipe;
    check('course_clearpipe: Glas-Glocken (Sinus, hoher unharmonischer Teilton ≥ 4,5) spielen die Hook im Intro und singen im Refrain eine Oktave höher, gläserne Tropfen in der Strophe, Röhren-Plopp', t.voice.bell.type === 'sine' && t.voice.bell.ratio >= 4.5 && !Number.isInteger(t.voice.bell.ratio)
      && sameNotes(t.bell[0], t.lead[12]) && [12, 13, 16, 17].every((b) => sameNotes(t.bell[b], t.lead[b], 12)) && [4, 5, 6].every((b) => noteList([t.echo[b]]).length > 0) && t.drums.some((bar) => layers(bar).some((l) => l.includes('d'))));
  }
  {
    const t = T6.course_wreck, strikes = t.bell.filter((b) => b !== '-:16');
    check('course_wreck: Akkordeon (gedämpfte Orgel ≤ 2600 Hz) spielt die Hook im Intro, Schiffsglocke im Doppelschlag alle vier Takte, Schunkel-Rhythmus 3+1 im Refrain, Humpa-Bass in der Strophe', t.voice.organ.cutoff <= 2600 && sameNotes(t.organ[0], t.lead[12])
      && strikes.length === 6 && strikes.every((b) => noteList([b]).length === 2) && [12, 13, 14, 15].every((b) => onsetsOf(t.lead[b]) === '0,3,4,7,8,11,12') && [4, 5, 6, 7].every((b) => onsetsOf(t.bass[b]) === '0,4,8,12'));
  }
  {
    const t = T6.course_fareast, pent = new Set(['B', 'D', 'E', 'F#', 'A'].map((n) => midi(`${n}4`) % 12));
    const hookPcs = pcs(t.lead.slice(12, 14)), chorusRoots = roots(t.bass.slice(12, 16)).join(',');
    check(`course_fareast: Bambusflöte (Sinus, Vibrato, Gleiten) spielt die Hook im Intro, Koto (gezupfter Sägezahn hinter Tiefpass) antwortet in der Strophe, Gong; Hook (zwei Refrain-Takte) pentatonisch (${hookPcs.filter((p) => pent.has(p)).length}/${hookPcs.length}) über i–VI–III–VII (Bass ${chorusRoots})`,
      t.whistle[0] === t.lead[12] && t.voice.whistle.vibrato >= 15 && t.voice.whistle.slide >= 1 && t.voice.arp.type === 'sawtooth' && t.fx.lowpass.arp <= 4000 && [4, 5, 6].every((b) => noteList([t.arp[b]]).length === 3)
      && t.voice.bell.decay >= 1 && noteList(t.bell).every(([, m]) => +m <= midi('C3')) && hookPcs.every((p) => pent.has(p)) && chorusRoots === [11, 7, 2, 9].join(','));
  }
  {
    const t = T6.course_jungle;
    check('course_jungle: Marimba (Teilton ≈ 4, kurz) spielt die Hook im Intro und in den Ruf-Takten, Congas, Bongos, Schüttelrohr, Urwald-Trommeln, Vogel-Zwitschern (Sinus gleitet aufwärts)', t.voice.bell.ratio >= 3.5 && t.voice.bell.ratio <= 4.5 && t.voice.bell.decay <= 0.3
      && t.bell[0] === t.lead[12] && [12, 14, 16].every((b) => t.bell[b] === t.lead[b]) && ['d', 'p', 'j', 't'].every((ch) => t.drums.some((bar) => layers(bar).some((l) => l.includes(ch)))) && t.voice.echo.glide > 1 && noteList(t.echo).length >= 8);
  }
  {
    const t = T6.course_snowwind, gusts = noteList(t.riser).length;
    check(`course_snowwind: Glöckchen spielen die Hook im Intro und funkeln im Refrain eine Oktave höher, Schlittenschellen, Wind-Pad in allen Takten, ${gusts} Windböen (Riser mit Rauschen)`, t.bell[0] === t.lead[12] && sameNotes(t.bell[12], t.lead[12], 12)
      && t.drums.some((bar) => layers(bar).some((l) => /jj/.test(l))) && t.pad.every((b) => b !== '-:16') && gusts >= 6 && t.voice.riser.noise >= 0.05);
  }
  {
    const t = T6.course_factory, anvils = noteList(t.bell);
    check(`course_factory: Amboss (unharmonischer Teilton, kurz) ${anvils.length}×, Metall-Klirren, Förderband in Sechzehnteln im Refrain, das Piano spielt die Stampf-Hook im Intro in Oktaven`, t.voice.bell.ratio > 3 && t.voice.bell.decay <= 0.3 && anvils.length >= 8
      && t.drums.some((bar) => layers(bar).some((l) => l.includes('x'))) && noteList([t.arp[12]]).length === 16 && noteList([t.piano[0]]).every(([, m]) => m.split('+').length === 2) && sameNotes(t.piano[0].replace(/[A-G][#b]?\d\+/g, ''), t.lead[12]));
  }
  {
    const t = T6.course_fuzzymine;
    check('course_fuzzymine: treibend – Galopp-Bass und Sechzehntel-Hats im Refrain, Wuschel-Brummen in der Strophe, das Piano spielt die Kletter-Hook im Intro in Oktaven, Hook klettert (Gipfel am Taktende)', [12, 13, 14, 15].every((b) => t.drums[b].some((l) => l === 'hhohhhohhhohhhoh'))
      && onsetsOf(t.bass[12]) === '0,2,4,6,8,10,12,14' && noteList([t.arp[4]]).length >= 6 && sameNotes(t.piano[0].replace(/[A-G][#b]?\d\+/g, ''), t.lead[12])
      && Math.max(...noteList([t.lead[12]]).map(([, m]) => +m)) === +noteList([t.lead[12]]).at(-1)[1]);
  }
  {
    const t = T6.course_bossblob;
    check('course_bossblob: Zirkus-Orgel (hell ≥ 3000 Hz) spielt die Wabbel-Hook im Intro und „pa-pa“ im Refrain, Pauken, Stabs, Riser über zwei Takte', t.voice.organ.cutoff >= 3000 && sameNotes(t.organ[0], t.lead[12])
      && onsetsOf(t.organ[12]) === '2,6,10,13,14' && t.drums.slice(0, 4).some((bar) => layers(bar).some((l) => l.includes('t'))) && noteList(t.riser).length === 2);
  }
  {
    const t = T6.course_world6_map;
    check('course_world6_map: gemütlich – Kick auf 1 und 3, Piano-Melodie in der Strophe, Lead im Refrain, Glas-Windspiel in den Phrasen-Enden', t.drums.every((bar) => layers(bar)[0].startsWith('k.......k'))
      && t.piano.slice(0, 8).every((b) => noteList([b]).length >= 4) && t.lead.slice(8).every((b) => noteList([b]).length >= 4) && noteList(t.bell).length >= 8);
  }

  // Welt 7 aus den Themen-Daten: Vollständigkeit, Tempo, Länge, Loop-Naht, Klangfarben (Welt-Charakter nur über den Klang)
  console.log('\nWelt 7 „Lava-Festung“:');
  check(`Welt 7: alle ${CONTRACT_THEMES_W7.length} Themen der Welt-7-Liste vorhanden (${CONTRACT_THEMES_W7.join(', ')})`, CONTRACT_THEMES_W7.every((n) => THEMES[n] && COURSE_THEMES[n]?.world === 7));
  check(`Welt 7: Arenen und 7-Kapitän nutzen vorhandene Themen (${REUSED_W7.join(', ')})`, REUSED_W7.every((n) => THEMES[n] && COURSE_THEMES[n]));
  const w7Bpm = (n) => (n === 'course_world7_map' ? [126, 128] : n === 'course_redhot' ? [148, 152] : n === 'course_keep' ? [146, 150] : [128, 150]);
  check(`Welt 7: Tempo 128–150 BPM, Sprint 148–152, Lava-Burg 146–150, Karte 126–128 (${CONTRACT_THEMES_W7.map((n) => `${n.replace('course_', '')} ${THEMES[n].bpm}`).join(', ')})`, CONTRACT_THEMES_W7.every((n) => THEMES[n].bpm >= w7Bpm(n)[0] && THEMES[n].bpm <= w7Bpm(n)[1]));
  check(`Welt 7: 16–32 Takte (${CONTRACT_THEMES_W7.map((n) => barCount(THEMES[n])).join(', ')})`, CONTRACT_THEMES_W7.every((n) => barCount(THEMES[n]) >= 16 && barCount(THEMES[n]) <= 32));
  for (const n of CONTRACT_THEMES_W7) checkSeam(n);
  const T7 = Object.fromEntries(CONTRACT_THEMES_W7.map((n) => [n, THEMES[n]]));
  const tops = (bar) => bar.replace(/[A-G][#b]?\d\+/g, '');   // obere Töne eines Oktav-Riffs („B4+B5:1“ → „B5:1“)
  const pitches = (bar) => noteList([bar]).map(([, m]) => +m);
  {
    const t = T7.course_fortfire, whoosh = noteList(t.riser).length;
    check(`course_fortfire: Fanfaren-Bläser (gedämpfte Orgel ≤ 3000 Hz) spielen die Hook im Intro und stoßen im Refrain, ${whoosh}× Feuer-Whoosh (Riser mit Rauschen) vor den Abschnitten, Feuerbälle fallen (Gleiten abwärts), Knistern; Ruf und Antwort springen eine Quarte hinauf`,
      t.voice.organ.cutoff <= 3000 && sameNotes(t.organ[0], t.lead[12]) && sameNotes(t.organ[1], t.lead[13]) && noteList([t.organ[12]]).length === 3 && noteList([t.organ[12]]).every(([, m]) => m.split('+').length === 3)
      && whoosh >= 5 && t.voice.riser.noise >= 0.08 && t.voice.echo.glide < 1 && noteList(t.echo).length >= 8 && t.drums.some((bar) => layers(bar).some((l) => l.includes('j')))
      && [12, 13].every((b) => pitches(t.lead[b])[1] - pitches(t.lead[b])[0] === 5));
  }
  {
    const t = T7.course_switchruins, tolls = noteList(t.bell.slice(4)).length;
    const echoPairs = (bar) => { const ns = noteList([bar]); return ns[0][1] === ns[1][1] && ns[1][0] === 3 && ns[3][1] === ns[4][1] && ns[3][0] === 8 && ns[4][0] === 11; };
    check(`course_switchruins: Steinglocken (unharmonischer Teilton, Ausklang ≥ 1 s) spielen die Hook im Intro eine Oktave tiefer und läuten ${tolls}× in Strophe und Überleitung, großer Hall (Rückkopplung ≥ 0,45, nass ≥ 0,4), Tropfen, Tempelflöte, Kipp-Schalter; Ruf-und-Echo-Hook (jeder Ruf hallt eine Sechzehntel später auf demselben Ton nach)`,
      !Number.isInteger(t.voice.bell.ratio) && t.voice.bell.decay >= 1 && [0, 1, 2].every((b) => sameNotes(t.bell[b], t.lead[12 + b], -12)) && tolls >= 4
      && t.fx.delay.feedback >= 0.45 && t.fx.delay.wet >= 0.4 && noteList(t.echo).length >= 8 && noteList(t.whistle).length >= 4 && t.drums.some((bar) => layers(bar).some((l) => l.includes('x')))
      && [12, 14, 16].every((b) => echoPairs(t.lead[b])));
  }
  {
    const t = T7.course_redhot, beeps = t.bell.map(pitches);
    const countdown = (bar) => { const ns = noteList([bar]); return ns.length >= 8 && [0, 2, 4].every((k) => ns[k][1] === ns[k + 1][1] && ns[k + 1][0] - ns[k][0] === 1) && +ns[0][1] > +ns[2][1] && +ns[2][1] > +ns[4][1]; };
    check('course_redhot: Countdown-Hook (Sechzehntel-Paare stufenweise abwärts) im Refrain, im Intro spielt sie das Piano in Oktaven; Countdown-Piepser vor Refrain und Loop (dreimal derselbe Ton, „LOS“ eine Quarte höher auf der Eins), Uhr-Ticken in der ganzen Strophe, Renn-Arpeggio und Galopp-Bass im Refrain',
      [12, 14, 16].every((b) => countdown(t.lead[b])) && noteList([t.piano[0]]).every(([, m]) => m.split('+').length === 2) && sameNotes(tops(t.piano[0]), t.lead[12])
      && [11, 23].every((b) => beeps[b].length === 3 && new Set(beeps[b]).size === 1) && [[0, 23], [12, 11]].every(([go, pre]) => beeps[go].length === 1 && beeps[go][0] - beeps[pre][0] === 5)
      && t.drums.slice(4, 12).every((bar) => layers(bar).some((l) => l === 'x...x...x...x...')) && noteList([t.arp[12]]).length >= 8 && onsetsOf(t.bass[12]) === '0,2,4,6,8,10,12,14');
  }
  {
    const t = T7.course_bluebelt;
    check('course_bluebelt: Bläser-Stabs (gedämpfte Sägezahn-Akkorde) spielen die Hook im Intro in Oktaven und stoßen im Refrain, Stampf-Trommel (tief ≤ 90 Hz) in Strophe und Refrain, stampfender Oktav-Bass; Hook stampft in Vierteln (Einsätze 0, 4, 8, 10, 11, 12)',
      noteList([t.stabs[0]]).every(([, m]) => m.split('+').length === 2) && sameNotes(tops(t.stabs[0]), t.lead[12]) && t.voice.stabs.cutoff <= 4500 && noteList([t.stabs[12]]).length >= 3
      && t.kit.doum.freq <= 90 && [4, 8, 12, 16].every((b) => layers(t.drums[b]).some((l) => l.includes('d'))) && onsetsOf(t.bass[4]) === '0,4,8,12,14'
      && [12, 13, 16, 17].every((b) => onsetsOf(t.lead[b]) === '0,4,8,10,11,12'));
  }
  {
    const t = T7.course_traptower, peak = (b) => Math.max(...pitches(t.lead[b])), h = pitches(t.lead[12]);
    check(`course_traptower: Turm-Glockenspiel spielt die Hook im Intro, Herzklopf-Ostinato und Kettenrasseln in der Strophe, die Lava steigt (${noteList(t.riser).length} Riser), Alarm-Sirene (weites, schnelles Vibrato) in der Überleitung; Galopp-Treppe (Achtel + zwei Sechzehntel) klettert eine Oktave, der Refrain steigt höher und höher`,
      sameNotes(t.bell[0], t.lead[12]) && sameNotes(t.bell[2], t.lead[14]) && noteList([t.arp[4]]).length >= 8 && t.drums.slice(4, 12).filter((bar) => layers(bar).some((l) => l.includes('j'))).length >= 6
      && noteList(t.riser).length >= 6 && t.voice.whistle.vibrato >= 30 && t.voice.whistle.rate >= 6 && noteList(t.whistle).length >= 4
      && [12, 14].every((b) => onsetsOf(t.lead[b]) === '0,2,3,4,6,7,8,10,11,12') && h.at(-1) - h[0] === 12 && h.every((m, i) => i === 0 || m >= h[i - 1]) && peak(14) > peak(12) && peak(18) > peak(14));
  }
  {
    const t = T7.course_rammreef;
    check('course_rammreef: gedämpft (Tiefpass ≤ 1800 Hz auf Piano, Pad, Stabs und Perlen, Lead weich ≤ 3 kHz, viel Hall), Wasserglocken spielen die Hook im Intro, Blubbern (Sinus gleitet aufwärts) in Strophe und Überleitung, dumpfe Rammstöße – trotzdem tanzbar (Kick auf jedem Viertel in allen Takten); jeder Hook-Takt beginnt mit „Blubb-blubb“ (zwei Sechzehntel auf einem Ton)',
      ['piano', 'pad', 'stabs', 'arp'].every((k) => t.fx.lowpass[k] <= 1800) && t.voice.lead.cutoff <= 3000 && t.fx.delay.wet >= 0.35 && sameNotes(t.bell[0], t.lead[12])
      && t.voice.echo.glide > 1 && noteList(t.echo).length >= 40 && t.drums.some((bar) => layers(bar).some((l) => l.includes('d')))
      && t.drums.every((bar) => layers(bar)[0] === 'k...k...k...k...') && [12, 13, 14, 15].every((b) => { const ns = noteList([t.lead[b]]); return ns[0][1] === ns[1][1] && ns[1][0] === 1; }));
  }
  {
    const t = T7.course_volcano, rumbles = noteList(t.riser).length, a = pitches(t.lead[12]), b = pitches(t.lead[13]);
    const taikoBars = t.drums.filter((bar) => layers(bar).some((l) => l.slice(0, 8).includes('t'))).length;
    check(`course_volcano: Vulkan-Hörner (dunkle Orgel ≤ 2000 Hz) spielen die Hook im Intro, Taiko (tiefe Toms ≤ 80 Hz) in ${taikoBars} Takten auch auf der ersten Takthälfte, ${rumbles}× Grollen (Riser abwärts); Ausbruch-Hook: Sechzehntel-Lauf hinauf zum langen Gipfelton, die Antwort rollt hinab`,
      t.voice.organ.cutoff <= 2000 && sameNotes(t.organ[0], t.lead[12]) && t.kit.tom.freq <= 80 && taikoBars >= 16 && rumbles >= 3 && t.voice.riser.glide < 1
      && a[6] === Math.max(...a) && a.slice(1, 7).every((m, i) => m >= a[i]) && b.slice(2, 6).every((m, i) => m < b[i + 1]));
  }
  {
    const t = T7.course_keep, baron = noteList(THEMES.course_boss.lead.slice(4, 8)), organ = noteList(t.organ.slice(0, 4));
    check(`course_keep: Kirchenorgel (≤ 2600 Hz) spielt im Intro das Baron-Brummbär-Motiv aus course_boss (Lead Takt 5–8, ${baron.length} Töne, Note für Note), Orgel-Akkorde im Refrain, Chor-Pad in allen Takten, Chor-Stimme in der Überleitung, Pauken, Kettenrasseln; Hook in 3+3+2-Stößen`,
      t.voice.organ.cutoff <= 2600 && baron.length >= 20 && organ.length === baron.length && organ.every(([p, m], i) => p === baron[i][0] && m === baron[i][1])
      && noteList([t.organ[12]]).every(([, m]) => m.split('+').length >= 3) && t.pad.every((bar) => bar !== '-:16') && noteList(t.whistle).length >= 4
      && t.drums.slice(0, 3).every((bar) => layers(bar).some((l) => l.slice(0, 8).includes('t'))) && t.drums.some((bar) => layers(bar).some((l) => l.includes('j')))
      && [12, 13, 16, 17].every((bar) => onsetsOf(t.lead[bar]).startsWith('0,3,6,8')));
  }
  {
    const t = T7.course_world7_map;
    check('course_world7_map: bedrohlich-gemütlich in Moll – Kick auf 1 und 3, Piano-Melodie in der Strophe, Lead im Refrain, Lava-Blubbern (Sinus gleitet aufwärts) in den Phrasen-Pausen, fernes Grollen (tiefe Toms ≤ 90 Hz)', t.drums.every((bar) => layers(bar)[0].startsWith('k.......k'))
      && t.piano.slice(0, 8).every((b) => noteList([b]).length >= 4) && t.lead.slice(8).every((b) => noteList([b]).length >= 4) && t.voice.echo.glide > 1 && noteList(t.echo).length >= 8 && t.kit.tom.freq <= 90);
  }

  // Welt 8 aus den Themen-Daten: Vollständigkeit, Tempo, Länge, Loop-Naht, Abspann mit Schluss und Welt-1-Zitaten, Finale mit
  // Baron-Brummbär-Motiv als Gegenstimme, Klangfarben (Welt-Charakter nur über den Klang)
  console.log('\nWelt 8 „Brummbär-Rummelplatz“:');
  check(`Welt 8: alle ${CONTRACT_THEMES_W8.length} Themen der Welt-8-Liste vorhanden (${CONTRACT_THEMES_W8.join(', ')})`, CONTRACT_THEMES_W8.every((n) => THEMES[n] && COURSE_THEMES[n]?.world === 8));
  check(`Welt 8: Arenen 8-A/8-B und 8-Haus nutzen vorhandene Themen (${REUSED_W8.join(', ')})`, REUSED_W8.every((n) => THEMES[n] && COURSE_THEMES[n]));
  const w8Bpm = (n) => (n === 'course_world8_map' ? [126, 128] : n === 'course_abspann' ? [124, 128] : n === 'course_finale' ? [150, 150] : [128, 150]);
  check(`Welt 8: Tempo 128–150 BPM, Großer Turm 150, Abspann 124–128, Karte 126–128 (${CONTRACT_THEMES_W8.map((n) => `${n.replace('course_', '')} ${THEMES[n].bpm}`).join(', ')})`, CONTRACT_THEMES_W8.every((n) => THEMES[n].bpm >= w8Bpm(n)[0] && THEMES[n].bpm <= w8Bpm(n)[1]));
  const w8Bars = (n) => (n === 'course_abspann' ? [32, 48] : [16, 32]);
  check(`Welt 8: 16–32 Takte, Abspann 32–48 (${CONTRACT_THEMES_W8.map((n) => barCount(THEMES[n])).join(', ')})`, CONTRACT_THEMES_W8.every((n) => barCount(THEMES[n]) >= w8Bars(n)[0] && barCount(THEMES[n]) <= w8Bars(n)[1]));
  const LOOPED_W8 = CONTRACT_THEMES_W8.filter((n) => THEMES[n].loop !== false);
  check('Welt 8: alle Themen laufen im Loop, nur der Abspann spielt einmal (loop: false)', LOOPED_W8.length === CONTRACT_THEMES_W8.length - 1 && THEMES.course_abspann.loop === false);
  for (const n of LOOPED_W8) checkSeam(n);
  const T8 = Object.fromEntries(CONTRACT_THEMES_W8.map((n) => [n, THEMES[n]]));
  const hasDrum = (t, ch) => t.drums.some((bar) => layers(bar).some((l) => l.includes(ch)));
  {
    const t = T8.course_rainfort, drops = noteList(t.echo).length, thunder = noteList(t.riser).length;
    check(`course_rainfort: Festungshörner (gedämpfte Orgel ≤ 3000 Hz) spielen die Hook im Intro, ${drops} Regentropfen (Sinus gleitet abwärts), Regenrauschen (Schellen) in Intro, Strophe und Überleitung, ${thunder}× Donner (Riser gleitet abwärts, mit Rauschen), Donnerschlag auf tiefen Toms (≤ 80 Hz); Donner-Ruf: punktierter Ton mit Wiederholung, Quintsprung, vier Sechzehntel`,
      t.voice.organ.cutoff <= 3000 && [0, 1, 2].every((b) => sameNotes(t.organ[b], t.lead[12 + b])) && t.voice.echo.type === 'sine' && t.voice.echo.glide < 1 && drops >= 40
      && [0, 4, 8, 20].every((b) => layers(t.drums[b]).some((l) => l.includes('j'))) && t.voice.riser.glide < 1 && t.voice.riser.noise >= 0.1 && thunder >= 4 && t.kit.tom.freq <= 80
      && [12, 13, 14, 15, 16, 17, 18, 19].every((b) => onsetsOf(t.lead[b]).startsWith('0,3,4,8,9,10,11')) && [12, 13, 14, 16, 17, 18, 19].every((b) => pitches(t.lead[b])[2] - pitches(t.lead[b])[1] === 7));
  }
  {
    const t = T8.course_dunes;
    check('course_dunes: Wüstenflöte (Sinus, Vibrato, Gleiten) spielt die Hook im Intro, Kanun-Zupfer (Sägezahn hinter Tiefpass) in der Strophe, Darbuka (Doum und Tek), Schellenkranz, Sandwehen (Riser mit Rauschen), Galopp-Bass im Refrain; Energie-Ebene beim Reiten (Lead-Doppelung, Offbeat-Stabs); Dünen-Schwung: drei Sechzehntel-Stufen hinab, in Achteln wieder hinauf',
      [0, 1, 2].every((b) => sameNotes(t.whistle[b], t.lead[12 + b])) && t.voice.whistle.vibrato >= 15 && t.voice.whistle.slide >= 1 && t.voice.arp.type === 'sawtooth' && t.fx.lowpass.arp <= 3200
      && [4, 5, 6].every((b) => noteList([t.arp[b]]).length >= 6) && ['d', 'p', 'j'].every((ch) => hasDrum(t, ch)) && t.voice.riser.noise >= 0.1
      && onsetsOf(t.bass[12]) === '0,2,4,6,8,10,12,14' && t.energyDouble === 1 && noteList(t.energy).length >= 24
      && [12, 13, 14, 15].every((b) => { const p = pitches(t.lead[b]); return p[0] > p[1] && p[1] > p[2] && p[2] > p[3] && p[4] > p[3]; }));
  }
  {
    const t = T8.course_cookie;
    check('course_cookie: Spieluhr (Sinus, unharmonischer Teilton, kurz) spielt die Hook im Intro, das Glockenspiel im Refrain eine Oktave höher, Förderband-Zupfer in der Strophe, Fabrik-Klappern (Holzblock) und Zahnrad-Ticken; Spieluhr-Hüpfer: Ton, Nachschlag, obere Nebennote',
      t.voice.bell.type === 'sine' && !Number.isInteger(t.voice.bell.ratio) && t.voice.bell.decay <= 0.5 && [0, 1, 2].every((b) => sameNotes(t.bell[b], t.lead[12 + b])) && [12, 13, 16, 17].every((b) => sameNotes(t.bell[b], t.lead[b], 12))
      && [4, 5, 6, 7].every((b) => noteList([t.arp[b]]).length === 8) && ['p', 'x'].every((ch) => hasDrum(t, ch))
      && [12, 13, 14, 15, 16, 17, 18, 19].every((b) => { const ns = noteList([t.lead[b]]); return onsetsOf(t.lead[b]).startsWith('0,2,3,4') && ns[0][1] === ns[1][1] && +ns[2][1] > +ns[1][1]; })
      && [12, 13, 14, 16, 17, 18].every((b) => { const ns = noteList([t.lead[b]]); return ns[3][1] === ns[0][1]; }));
  }
  {
    const t = T8.course_baronexpress, whistles = noteList(t.whistle).length, chug = 'j.jjj.jjj.jjj.jj';
    check(`course_baronexpress: das Piano spielt die Hook im Intro in Oktaven, Dampfstöße (Schellen „tsch – tsch-tsch“) in ${t.drums.filter((bar) => layers(bar).includes(chug)).length} Takten, Schienenstöße (Ticken) in der Strophe, ${whistles} Dampfpfiffe, Zugglocke, Räder-Rhythmus 3-3-2 in der Strophe, Galopp-Bass im Refrain; Kolben-Stoß: vier Sechzehntel auf einem Ton, dann der Dreiklang hinauf`,
      noteList([t.piano[0]]).every(([, m]) => m.split('+').length === 2) && [0, 1, 2].every((b) => sameNotes(tops(t.piano[b]), t.lead[12 + b]))
      && t.drums.filter((bar) => layers(bar).includes(chug)).length >= 20 && t.drums.slice(4, 12).filter((bar) => layers(bar).some((l) => l.includes('x'))).length >= 6 && whistles >= 3 && noteList(t.bell).length >= 4
      && [4, 5, 6, 7, 8, 9, 10].every((b) => onsetsOf(t.lead[b]) === '0,3,6,8,11,14') && onsetsOf(t.bass[12]) === '0,2,4,6,8,10,12,14'
      && [12, 13, 14, 15, 16, 17, 18, 19].every((b) => { const ns = noteList([t.lead[b]]); return onsetsOf(t.lead[b]).startsWith('0,1,2,3,4') && new Set(ns.slice(0, 4).map(([, m]) => m)).size === 1 && +ns[4][1] > +ns[3][1] && +ns[5][1] > +ns[4][1]; }));
  }
  {
    const t = T8.course_footlight;
    check('course_footlight: Glas-Glocken (Sinus, hoher unharmonischer Teilton) spielen die Hook im Intro, glitzernde Sechzehntel-Arpeggien (Sinus mit Echo) in Intro, Refrain und Überleitung, Leucht-Pings (gleiten aufwärts) und Stampfstein-Schläge in der Strophe; Leucht-Stufen: drei kurze Tritte den Dreiklang hinauf, dann der lange Leuchtton',
      t.voice.bell.ratio >= 4.5 && !Number.isInteger(t.voice.bell.ratio) && [0, 1, 2, 3].every((b) => sameNotes(t.bell[b], t.lead[12 + b])) && t.voice.arp.type === 'sine' && t.fx.delay.send.arp > 0
      && [0, 12, 20].every((b) => noteList([t.arp[b]]).length >= 10) && t.voice.echo.glide > 1 && noteList(t.echo).length >= 8 && t.drums.slice(4, 12).filter((bar) => layers(bar).some((l) => l[0] === 'd')).length >= 6
      && [12, 13, 14, 15, 16, 17, 18, 19].every((b) => { const ns = noteList([t.lead[b]]); return onsetsOf(t.lead[b]).startsWith('0,2,4,6') && +ns[1][1] > +ns[0][1] && +ns[2][1] > +ns[1][1] && Math.abs(+ns[3][1] - +ns[2][1]) <= 5; }));
  }
  {
    const t = T8.course_dungeon;
    check('course_dungeon: gedämpft (Tiefpass ≤ 1800 Hz auf Piano, Pad, Stabs, Orgel und Perlen, Lead weich ≤ 3 kHz, viel Hall), Wasserglocken spielen die Hook im Intro, Blubbern (Sinus gleitet aufwärts), Sonar-Ping in der Strophe, dumpfer Wellenschlag – trotzdem tanzbar (Kick auf jedem Viertel in allen Takten); Energie-Ebene beim Reiten; Wellengang: langer Ton, zwei Sechzehntel-Seufzer, tiefer Ton, in Achteln hinauf',
      ['piano', 'pad', 'stabs', 'organ', 'arp'].every((k) => t.fx.lowpass[k] <= 1800) && t.voice.lead.cutoff <= 3000 && t.fx.delay.wet >= 0.35 && [0, 1, 2, 3].every((b) => sameNotes(t.bell[b], t.lead[12 + b]))
      && t.voice.echo.glide > 1 && noteList(t.echo).length >= 40 && noteList(t.whistle).length >= 2 && hasDrum(t, 'd') && t.drums.every((bar) => layers(bar)[0] === 'k...k...k...k...') && noteList(t.energy).length >= 24
      && [12, 13, 14, 15, 16, 17].every((b) => onsetsOf(t.lead[b]) === '0,6,7,8,12,14'));
  }
  {
    const t = T8.course_beamdark;
    check('course_beamdark: Celesta (Sinus, Teilton 3, kurz) spielt die Hook im Intro und im Refrain eine Oktave höher mit, Geisterbahn-Orgel auf der „und“ im Refrain, Geister-„Huuu“ (Theremin, weites Vibrato) in der Überleitung, Standuhr-Ticken und Klopfen, Pizzicato-Bass in der Strophe; Kicher-Geist: Ton, Nachschlag mit Nebennote, Ton („hi-hi-hi“)',
      t.voice.bell.ratio === 3 && t.voice.bell.decay <= 0.6 && [0, 1, 2, 3].every((b) => sameNotes(t.bell[b], t.lead[12 + b])) && [12, 14, 16].every((b) => sameNotes(t.bell[b], t.lead[b], 12))
      && onsetsOf(t.organ[12]) === '2,6,10,14' && t.voice.whistle.vibrato >= 30 && noteList(t.whistle).length >= 4 && ['x', 'p'].every((ch) => hasDrum(t, ch)) && onsetsOf(t.bass[4]) === '0,4,8,12'
      && [12, 13, 14, 16, 17, 18].every((b) => { const ns = noteList([t.lead[b]]); return onsetsOf(t.lead[b]).startsWith('0,2,3,4') && ns[1][1] === ns[0][1] && ns[3][1] === ns[0][1] && Math.abs(+ns[2][1] - +ns[1][1]) <= 2; }));
  }
  {
    const t = T8.course_inferno;
    const roll = (b) => { const ns = noteList([t.lead[b]]); return onsetsOf(t.lead[b]).startsWith('0,1,2,4,5,6') && ns[0][1] === ns[3][1] && ns[1][1] === ns[4][1] && ns[2][1] === ns[5][1] && +ns[1][1] > +ns[0][1] && +ns[2][1] > +ns[1][1]; };
    check(`course_inferno: Kristall-Glocken (Sinus, hoher unharmonischer Teilton) spielen die Hook im Intro, ${noteList(t.riser).length} Hoover-Riser (alle vier Takte im Refrain), Stampfen und Grollen (tiefe Trommeln ≤ 90 Hz), Galopp-Bass und Rave-Piano 3-3-2 im Refrain; Felsklotz-Rollen: „da-da-DUM da-da-DUM“ – derselbe Dreiklang zweimal hinauf`,
      t.voice.bell.ratio >= 4.5 && [0, 1, 2, 3].every((b) => sameNotes(t.bell[b], t.lead[12 + b])) && noteList(t.riser).length >= 5 && t.kit.doum.freq <= 90 && t.kit.tom.freq <= 90
      && hasDrum(t, 'd') && onsetsOf(t.bass[12]) === '0,2,4,6,8,10,12,14' && onsetsOf(t.piano[12]) === '0,3,6,8,11,14' && [12, 13, 14, 15, 16, 17, 18, 19].every(roll));
  }
  {
    // Großer Turm: die Kirchenorgel spielt im Intro das Baron-Brummbär-Motiv aus course_boss (Lead Takt 5–8) Note für Note und
    // in beiden Refrains als Gegenstimme eine Oktave tiefer; die Heldenhook darüber ist eigenständig (oben) und steigt über
    // den Dreiklang zum langen Gipfelton, der höher liegt als jeder Ton der Gegenstimme im selben Takt
    const t = T8.course_finale, baron = noteList(THEMES.course_boss.lead.slice(4, 8)), intro = noteList(t.organ.slice(0, 4));
    const lower = (from) => { const ns = noteList(t.organ.slice(from, from + 4)); return ns.length === baron.length && ns.every(([p, m], i) => p === baron[i][0] && +m === +baron[i][1] - 12); };
    const hero = (b) => { const ns = noteList([t.lead[b]]).map(([, m]) => +m); return ns[1] > ns[0] && ns[2] > ns[1] && ns[3] > ns[2] && /^\S+:2 \S+:1 \S+:1 \S+:6/.test(t.lead[b]) && ns[3] > Math.max(...pitches(t.organ[b])); };
    check(`course_finale: 32 Takte mit zweitem Refrain; die Kirchenorgel (≤ 2600 Hz) spielt im Intro das Baron-Brummbär-Motiv aus course_boss (Lead Takt 5–8, ${baron.length} Töne, Note für Note) und in beiden Refrains eine Oktave tiefer als Gegenstimme unter der Heldenhook; Chor-Pad in allen Takten, Chor-Stimme in der Überleitung, Pauken im Intro, Turmglocke, Glockenspiel im zweiten Refrain`,
      barCount(t) === 32 && t.voice.organ.cutoff <= 2600 && baron.length >= 20 && intro.length === baron.length && intro.every(([p, m], i) => p === baron[i][0] && m === baron[i][1])
      && [12, 16, 24, 28].every(lower) && t.pad.every((bar) => bar !== '-:16') && noteList(t.whistle.slice(20, 24)).length >= 4
      && t.drums.slice(0, 3).every((bar) => layers(bar).some((l) => l.slice(0, 8).includes('t'))) && noteList(t.bell).length >= 4 && [24, 25, 28, 29].every((b) => sameNotes(t.arp[b], t.lead[b], 12)));
    check('course_finale: Heldenhook – der Dreiklang springt zum langen Gipfelton, über der Baron-Gegenstimme (Refrain-Takte 1, 3, 5)', [12, 14, 16, 24, 26, 28].every(hero));
  }
  {
    // Abspann: einmal (kein Loop), Schluss e C D G mit langem Grundton, Schlussakkord, Becken auf der Eins und Stille danach;
    // Zitate aus Welt 1 (eigene Kompositionen des Projekts): das Glockenspiel spielt course_grass Lead Takt 5–8 eine Oktave höher,
    // der Lead das Riff von world1 Lead Takt 5–8 eine Quinte höher (a-Moll → e-Moll, leitereigen in G-Dur)
    const t = T8.course_abspann, last = barCount(t) - 1, endLead = noteList([t.lead[last]]), endPiano = noteList([t.piano[last]]);
    const g = midi('G4') % 12, lastDrums = layers(t.drums[last]);
    const endRoots = roots(t.bass.slice(last - 3)).join(',');
    check(`course_abspann: Schluss – Bass ${endRoots} (e C D G), der Lead hält den Grundton ab der Eins (≥ 3 Zählzeiten), G-Dur-Schlussakkord im Piano, Becken und Kick nur auf der Eins, danach Stille (${fmt(barCount(t) * 4 * 60 / t.bpm, 0)} s)`,
      t.loop === false && endRoots === [4, 0, 2, 7].join(',') && endLead.length === 1 && endLead[0][0] === 0 && +endLead[0][1] % 12 === g && /:1[2-6]/.test(t.lead[last])
      && endPiano.length === 1 && new Set(endPiano[0][1].split('+').map((x) => +x % 12)).size === 3 && endPiano[0][1].split('+').every((x) => [g, (g + 4) % 12, (g + 7) % 12].includes(+x % 12))
      && lastDrums.some((l) => l[0] === 'r') && lastDrums.every((l) => /^[kr]?\.+$/.test(l)));
    check('course_abspann: Erinnerung an Welt 1 – das Glockenspiel spielt die Hook von course_grass (Lead Takt 5–8) eine Oktave höher, danach der Lead das Riff von world1 (Lead Takt 5–8) eine Quinte höher; die eigene Hook im Refrain bleibt eigenständig (oben)',
      [0, 1, 2, 3].every((i) => sameNotes(t.bell[20 + i], THEMES.course_grass.lead[4 + i], 12)) && [0, 1, 2, 3].every((i) => sameNotes(t.lead[24 + i], THEMES.world1.lead[4 + i], 7))
      && t.lead.slice(20, 24).every((b) => b === '-:16') && roots(t.bass.slice(20, 28)).join(',') === [7, 2, 4, 0, 4, 4, 0, 2].join(','));
    check('course_abspann: warm – Spieluhr spielt die Hook im Intro, Glockenspiel eine Oktave höher und Flöte im zweiten Refrain, Pad in allen Takten', [0, 1, 2].every((b) => sameNotes(t.bell[b], t.lead[12 + b]))
      && [28, 29, 32, 33].every((b) => sameNotes(t.bell[b], t.lead[b], 12)) && noteList(t.whistle.slice(28, 36)).length >= 12 && t.pad.every((bar) => bar !== '-:16'));
  }
  {
    const t = T8.course_world8_map;
    check('course_world8_map: Rummelplatz – Four-on-the-floor (weicher Kick) in allen Takten, die Drehorgel (helle Orgel ≥ 3000 Hz) singt die Strophe, „Umpa-pa“ (Bass auf der Eins, Piano-Akkorde auf 2 und 3), im Refrain der Lead mit der Karussell-Hook und die Drehorgel auf der „und“, Karussell-Glöckchen, Schellen',
      t.drums.every((bar) => layers(bar)[0] === 'k...k...k...k...') && t.kit.kick.volume < 0.5 && t.voice.organ.cutoff >= 3000
      && t.organ.slice(0, 8).every((b) => noteList([b]).length >= 4 && noteList([b]).every(([, m]) => !m.includes('+'))) && t.lead.slice(8).every((b) => noteList([b]).length >= 4)
      && t.piano.slice(0, 8).every((b) => onsetsOf(b) === '4,8') && t.bass.every((b) => onsetsOf(b).startsWith('0,')) && onsetsOf(t.organ[8]) === '2,6,10,14'
      && noteList(t.bell).length >= 8 && hasDrum(t, 'j') && [8, 9, 10, 11].every((b) => onsetsOf(t.lead[b]) === '0,3,4,6,9,10,12'));
  }
}

const BROWSER = ['live', 'render', 'sfx'].some(want);
const stop = BROWSER ? await startServer(PORT) : () => {};
const { browser, page, errors } = BROWSER ? await launchBrowser() : { browser: null, page: null, errors: [] };
if (BROWSER) await loadGame(page, PORT, errors, stop, 'test');
const sc = (fn, arg) => page.evaluate(fn, arg);
const audio = () => sc(() => { const a = window.__audio; return { ctx: a.engine.ctx ? a.engine.ctx.state : 'none', ready: a.engine.ready, theme: a.music.current, drums: a.music.drums, muted: a.engine.muted, pending: a.music.pending ?? null, energy: a.music.energyGain ? a.music.energyGain.gain.value : null }; });

/** Läuft im Browser: Thema offline rendern und vermessen (optional ein übergebenes Themen-Objekt und ein Ausschnitt als WAV). */
async function analyzeInPage({ name, seconds, energy, wantWav, beatMult = 1, wavSeconds = Infinity, theme = null, excerpt = null, seamAt = null, tailFrom = null }) {
  const r = await window.__audio.music.renderTheme(name, seconds, { energy, theme });
  const x = r.buffer.getChannelData(0), sr = r.sampleRate;
  let peak = 0, sum = 0, peakAt = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) { peak = a; peakAt = i / sr; } sum += x[i] * x[i]; }
  const rms = Math.sqrt(sum / x.length);
  // Nachklang (optional, Stücke ohne Loop): RMS ab `tailFrom` bis zum Pufferende
  let tail = null;
  if (tailFrom !== null) { const from = Math.min(x.length - 1, Math.round(tailFrom * sr)); let q = 0; for (let i = from; i < x.length; i++) q += x[i] * x[i]; tail = Math.sqrt(q / Math.max(1, x.length - from)); }

  // Loop-Naht (optional): RMS je Zählzeit (Fenster = ein Schlag ab dem Themenstart) in den zwei Schlägen vor und nach
  // der Naht gegen den Median aller Schläge, Spitze ±0,25 s um die Naht
  let seam = null;
  if (seamAt !== null) {
    const wn = Math.round(60 / r.bpm * sr), wins = [];
    for (let i = Math.round(0.02 * sr); i + wn <= x.length; i += wn) { let q = 0; for (let j = i; j < i + wn; j++) q += x[j] * x[j]; wins.push({ t: (i + wn / 2) / sr, rms: Math.sqrt(q / wn) }); }
    const med = [...wins].sort((p, q) => p.rms - q.rms)[Math.floor(wins.length / 2)].rms;
    const near = wins.filter((w) => Math.abs(w.t - seamAt) <= 2 * 60 / r.bpm);
    let seamPeak = 0;
    for (let i = Math.max(0, Math.round((seamAt - 0.25) * sr)); i < Math.min(x.length, Math.round((seamAt + 0.25) * sr)); i++) seamPeak = Math.max(seamPeak, Math.abs(x[i]));
    seam = { at: seamAt, median: med, minNear: Math.min(...near.map((w) => w.rms)), maxNear: Math.max(...near.map((w) => w.rms)), peak: seamPeak };
  }

  // Spektrum: FFT (8192, Hann), Leistung über alle Rahmen gemittelt
  const N = 8192;
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const fft = (re, im) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < half; k++) {
          const a = i + k, b = a + half;
          const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  };
  const power = new Float64Array(N / 2), re = new Float64Array(N), im = new Float64Array(N);
  for (let off = 0; off + N <= x.length; off += N) {
    for (let i = 0; i < N; i++) { re[i] = x[off + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) power[k] += re[k] * re[k] + im[k] * im[k];
  }
  const binHz = sr / N;
  const bandPower = (lo, hi) => { let s = 0; for (let k = Math.ceil(lo / binHz); k < Math.min(N / 2, Math.floor(hi / binHz)); k++) s += power[k]; return s; };
  const total = bandPower(20, sr / 2);
  const bands = {};
  for (const [k, lo, hi] of [['bass', 40, 150], ['mid', 200, 2500], ['high', 6000, sr / 2]]) {
    const share = bandPower(lo, hi) / total;
    bands[k] = { share, dB: 20 * Math.log10(rms * Math.sqrt(share) + 1e-9) }; // Pegel des Bandes in dBFS
  }

  // Beat-Periodizität: Hüllkurve (RMS je 5 ms, Mittelwert abgezogen) → normierte Autokorrelation
  const w = Math.round(sr * 0.005), env = [];
  for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = 0; j < w; j++) s += x[i + j] * x[i + j]; env.push(Math.sqrt(s / w)); }
  const mean = env.reduce((a, b) => a + b, 0) / env.length;
  for (let i = 0; i < env.length; i++) env[i] -= mean;
  let e0 = 0; for (const v of env) e0 += v * v;
  const ac = (lag) => { let s = 0; for (let i = 0; i + lag < env.length; i++) s += env[i] * env[i + lag]; return s / e0; };
  // Gesucht wird das Maximum rund um den Kick-Abstand (beatMult Schläge): zwischen 0,6- und 1,4-facher Periode,
  // damit weder das Achtel darunter noch die doppelte Periode darüber gezählt wird
  const rate = sr / w;
  const beat = 60 / r.bpm * beatMult;
  let bestLag = 0, best = -Infinity;
  for (let lag = Math.round(0.6 * beat * rate); lag <= Math.round(1.4 * beat * rate); lag++) { const v = ac(lag); if (v > best) { best = v; bestLag = lag; } }
  const acBeat = ac(Math.round(beat * rate)), acEighth = ac(Math.round(beat / 2 * rate)), acOff = ac(Math.round(beat * 0.75 * rate));

  const pcm16 = (from, n) => {
    const pcm = new Int16Array(Math.max(0, Math.min(x.length - from, n)));
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(x[from + i] * 32767)));
    const bytes = new Uint8Array(pcm.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const wav = wantWav ? pcm16(0, Math.round(Math.min(seconds, wavSeconds) * sr)) : null;
  const excerptWav = excerpt ? pcm16(Math.round(excerpt.from * sr), Math.round(excerpt.seconds * sr)) : null;
  return { name, seconds, bpm: r.bpm, bars: r.bars, sampleRate: sr, peak, peakAt, rms, seam, tail, bands, beatLag: bestLag / rate, beatExpected: beat, acBest: best, acBeat, acEighth, acOff, nodesPerSecond: r.nodesPerSecond, oscPerSecond: r.oscillatorsPerSecond, inGameLevel: r.inGameLevel, wav, excerptWav };
}

/**
 * Läuft im Browser: alle Effekte offline rendern (Effekt-Bus 0,5 wie im Spiel) und vermessen –
 * Spitze, hörbare Dauer, Lautheit (K-Gewichtung nach BS.1770 genähert: Hochpass 38 Hz + Höhenregal
 * +4 dB ab 1,7 kHz; Maximum über 100-ms-Fenster, in LUFS-ähnlicher Skala), Knotenzahl.
 * Baut daraus die Demo (Effekt, 0,6 s Pause, nächster Effekt …) als 16-Bit-PCM (Base64).
 */
async function sfxInPage({ order, gap, opts }) {
  const fx = window.__audio.engine.effects;
  const rendered = await fx.render(order, { seconds: 1.8, opts: opts ?? {} });
  const sr = rendered[0].sampleRate;
  const biquad = (x, [b0, b1, b2, a0, a1, a2]) => {
    const y = new Float64Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  };
  const shelf = (f0, dB) => {
    const A = Math.pow(10, dB / 40), w = 2 * Math.PI * f0 / sr, c = Math.cos(w), al = Math.sin(w) / 2 * Math.SQRT2, s = 2 * Math.sqrt(A) * al;
    return [A * ((A + 1) + (A - 1) * c + s), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - s), (A + 1) - (A - 1) * c + s, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - s];
  };
  const hp = (f0, q) => {
    const w = 2 * Math.PI * f0 / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    return [(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al];
  };
  const stats = [], parts = [];
  for (const r of rendered) {
    const x = r.samples;
    let peak = 0, last = 0;
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (a > 0.001) last = i; }
    const k = biquad(biquad(x, shelf(1681, 4)), hp(38, 0.5));
    const win = Math.round(0.1 * sr), hop = Math.round(0.01 * sr);
    let best = 0;
    for (let i = 0; i + win <= k.length; i += hop) { let s = 0; for (let j = i; j < i + win; j++) s += k[j] * k[j]; best = Math.max(best, s / win); }
    const duration = last / sr;
    stats.push({ name: r.name, peak, duration, loudness: -0.691 + 10 * Math.log10(best + 1e-12), nodes: r.nodes, oscillators: r.oscillators });
    parts.push(x.subarray(0, Math.min(x.length, last + Math.round(0.03 * sr))));
  }
  // Demo zusammensetzen: Effekt, dann `gap` Sekunden Stille
  const gapN = Math.round(gap * sr);
  const total = parts.reduce((n, p) => n + p.length + gapN, gapN);
  const pcm = new Int16Array(total);
  const starts = [];
  let pos = gapN;
  for (const p of parts) {
    starts.push(pos / sr);
    for (let i = 0; i < p.length; i++) pcm[pos + i] = Math.max(-32768, Math.min(32767, Math.round(p[i] * 32767)));
    pos += p.length + gapN;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { sampleRate: sr, stats, starts, seconds: total / sr, wav: btoa(s) };
}

function writeWav(path, pcmBase64, sr) {
  const pcm = Buffer.isBuffer(pcmBase64) ? pcmBase64 : Buffer.from(pcmBase64, 'base64');
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([h, pcm]));
}

/** Thema ab Takt `bar` beginnen lassen (alle Spuren gleich lang, daher einfache Drehung der Takt-Listen). */
function rotateTheme(th, bar) {
  const out = { ...th };
  for (const k of [...TONAL, 'drums']) if (Array.isArray(th[k]) && th[k].length) out[k] = [...th[k].slice(bar), ...th[k].slice(0, bar)];
  return out;
}

/**
 * onBeat-Serie auswerten: lückenlose Zählzeiten, Felder, Median der Einzelabstände (robust gegen einzelne
 * Hänger des Hauptthreads unter Last), größte Abweichung, Verzug. `gridErr`: Rückrufzeit minus gemeldetem
 * Verzug muss exakt im Raster der Zählzeiten liegen (jeder Rückruf meldet seine Zählzeit richtig, auch wenn er
 * verspätet kommt).
 */
function beatSeries(hits, bpm) {
  const spb = 60 / bpm;
  const consecutive = hits.length > 0 && hits.every((h, i) => i === 0 || h.beat === hits[i - 1].beat + 1);
  const fields = hits.every((h) => h.bar === Math.floor(h.beat / 4) && h.inBar === h.beat % 4 && h.bpm === bpm);
  const gaps = hits.slice(1).map((h, i) => (h.t - hits[i].t) / 1000).sort((p, q) => p - q);
  const interval = gaps.length ? (gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2) : NaN;
  const jitter = gaps.reduce((m, g) => Math.max(m, Math.abs(g - spb)), 0);
  const at = (h) => h.t / 1000 - h.late; // Zeitpunkt der Zählzeit laut Rückruf
  const gridErr = hits.reduce((m, h) => Math.max(m, Math.abs(at(h) - at(hits[0]) - (h.beat - hits[0].beat) * spb)), 0);
  const lates = hits.map((h) => h.late).sort((p, q) => p - q);
  return { n: hits.length, consecutive, fields, interval, intervalErr: Math.abs(interval - spb) / spb, jitter, gridErr, lateMedian: lates[Math.floor(lates.length / 2)] ?? NaN, lateMax: lates[lates.length - 1] ?? NaN };
}
const beatOk = (b) => b.bar === Math.floor(b.beat / 4) && Math.abs(b.phase - (b.beat - Math.floor(b.beat))) < 1e-9 && b.inBar === Math.floor(b.beat) % 4;

const MAX_SFX_NODES = 40;
const CONTRACT_SFX = ['jump', 'jump2', 'jump3', 'backflip', 'longjump', 'walljump', 'groundpound', 'slide', 'land', 'coin', 'star', 'stamp',
  'powerup', 'powerdown', 'oneup', 'blockhit', 'brickbreak', 'pipe', 'checkpoint', 'goalpole', 'timewarn', 'claw', 'fireball', 'stomp',
  'hurt', 'die', 'switch', 'bounce'];
const WORLD_SFX = ['clone', 'clone_lost', 'helm_on', 'helm_off', 'cannon', 'propeller', 'light', 'quicksand', 'sand_crumble', 'peck', 'bullet',
  'boss_hit', 'boss_spin', 'house_tick', 'room_clear', 'ice_slide', 'snowball', 'ghost', 'splash_big', 'train_whistle', 'beep', 'beep_switch'];
const W6_SFX = ['gust', 'wind', 'rumble', 'door', 'poof', 'splash', 'bump', 'powerup_appear', 'gong'];
const HW_SFX = ['klingel', 'tuer', 'alle_tueren', 'kessel', 'blase', 'netz', 'laterne', 'laterne_aus', 'suessigkeit', 'muenzregen', 'buh',
  'grabstein', 'kuerbis_platzt'];
const W6HW_SFX = [...W6_SFX, ...HW_SFX];
const MORE_SFX = ['victory', 'fall', 'boost', 'skid', 'glide', 'wallslide', 'swim', 'fence', 'grab', 'swing', 'hop', 'dash', 'kick',
  'dizzy', 'boomerang', 'dig', 'throw', 'fuse', 'burn', 'chain', 'alarm', 'flip', 'donut', 'pfiff', ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `note${i}`)];

const infos = BROWSER ? await sc((names) => names.map((n) => window.__audio.music.themeInfo(n)), Object.keys(COURSE_THEMES)) : [];

if (want('live')) {
  // ---- Live: Freischaltung, Themen, Energie-Ebene, Stummschaltung ----
  let a = await audio();
  console.log('vor Geste:', JSON.stringify(a));
  check('Vor der ersten Geste kein AudioContext', a.ctx === 'none' && a.pending === 'world1');

  // Taktuhr vor der Freischaltung: Ersatzuhr über performance.now() mit dem Tempo des angeforderten Themas.
  // Die Spielszene steht währenddessen (der Ablauf danach – Pflaume, Gegner – bleibt wie ohne diese Messung).
  const pre = await sc(async () => {
    const m = window.__audio.music;
    window.__game.scene.pause('Play');
    const b0 = m.beat(), t0 = performance.now();
    const hits = [];
    const off = m.onBeat((ev) => hits.push({ ...ev, t: performance.now() }));
    await new Promise((r) => setTimeout(r, 4000));
    const b1 = m.beat(), t1 = performance.now();
    off();
    const n = hits.length;
    await new Promise((r) => setTimeout(r, 600));
    window.__game.scene.resume('Play');
    return { b0, b1, dt: (t1 - t0) / 1000, hits, extra: hits.length - n, ctx: !!window.__audio.engine.ctx };
  });
  const ps = beatSeries(pre.hits, 140);
  console.log(`Taktuhr ohne Freischaltung: ${JSON.stringify(pre.b0)} → Zählzeit ${fmt(pre.b1.beat)} nach ${fmt(pre.dt)} s`);
  console.log(`   onBeat ${ps.n}× (Zählzeiten ${pre.hits.map((h) => h.beat).join(',')}), Abstand (Median) ${fmt(ps.interval)} s, größte Abweichung ${fmt(ps.jitter * 1000, 1)} ms, Raster ±${fmt(ps.gridErr * 1000, 2)} ms, Verzug Median ${fmt(ps.lateMedian * 1000, 1)} ms, max ${fmt(ps.lateMax * 1000, 1)} ms`);
  check('Taktuhr ohne Freischaltung: Ersatzuhr läuft mit dem angeforderten Thema (world1, 140 BPM, playing, Quelle ersatz)', !pre.ctx && pre.b0.playing && pre.b0.source === 'ersatz' && pre.b0.bpm === 140 && pre.b0.theme === 'world1');
  check(`Taktuhr ohne Freischaltung: beat() steigt mit dem Tempo (${fmt((pre.b1.beat - pre.b0.beat) / pre.dt)} statt ${fmt(140 / 60)} Zählzeiten/s)`, Math.abs((pre.b1.beat - pre.b0.beat) / pre.dt - 140 / 60) < 140 / 60 * 0.03);
  check('Taktuhr: bar, phase und inBar passen zur Zählzeit', beatOk(pre.b0) && beatOk(pre.b1));
  check(`onBeat über die Ersatzuhr: ${ps.n} lückenlose Zählzeiten im Abstand ${fmt(ps.interval)} s (erwartet ${fmt(60 / 140)} s ±3 %), jede im Raster (±${fmt(ps.gridErr * 1000, 2)} ms)`, ps.n >= 7 && ps.consecutive && ps.fields && ps.intervalErr < 0.03 && ps.gridErr < 0.003);
  check(`onBeat über die Ersatzuhr pünktlich (Verzug Median ${fmt(ps.lateMedian * 1000, 1)} ms < 25 ms)`, ps.lateMedian < 0.025);
  check('onBeat: Abmelden beendet die Rückrufe', pre.extra === 0);

  const beforeUnlock = await sc(() => ({ b: window.__audio.music.beat(), t: performance.now() }));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  a = await audio();
  console.log('nach Geste:', JSON.stringify(a));
  check('Geste schaltet Audio frei', a.ctx === 'running' && a.ready);
  // Lage der Musik zur Uhr: Zählzeit der Uhr zur Planungszeit des nächsten Sequencer-Schritts ↔ dieser Schritt
  const clockPos = () => sc(() => {
    const m = window.__audio.music, e = window.__audio.engine, c = m.clock, th = m.theme, seq = m.seq;
    const at = c.b0 + (seq.time - c.t0) * c.bpm / 60;
    const d = ((at * 4 - seq.step) % th.length + th.length) % th.length;
    return { b: m.beat(), t: performance.now(), offsetSteps: Math.min(d, th.length - d), latency: e.now - e.audibleTime() };
  });
  const afterUnlock = await clockPos();
  const expectUnlock = beforeUnlock.b.beat + (afterUnlock.t - beforeUnlock.t) / 1000 * 140 / 60;
  console.log(`Freischaltung: Zählzeit vorher ${fmt(beforeUnlock.b.beat)}, nachher ${fmt(afterUnlock.b.beat)} (erwartet ${fmt(expectUnlock)}), Quelle ${afterUnlock.b.source}, Ausgabelatenz ${fmt(afterUnlock.latency * 1000, 1)} ms`);
  check(`Freischaltung: Taktuhr springt nicht (Zählzeit ${fmt(afterUnlock.b.beat)} statt ${fmt(expectUnlock)}), Quelle jetzt audio`, afterUnlock.b.source === 'audio' && Math.abs(afterUnlock.b.beat - expectUnlock) < 0.12);
  check(`Freischaltung: Musik steigt im Takt der Uhr ein (Sequencer ${fmt(afterUnlock.offsetSteps, 4)} Sechzehntel neben der Uhr)`, afterUnlock.offsetSteps < 0.01);
  check(`Hörbare Zeit berücksichtigt die Ausgabelatenz (${fmt(afterUnlock.latency * 1000, 1)} ms, 0–500 ms)`, afterUnlock.latency >= 0 && afterUnlock.latency < 0.5);
  check('Welt-Thema läuft', a.theme === 'world1');
  check('Ohne Pflaume keine Energie-Ebene', a.drums === false && a.energy !== null && a.energy < 0.05);

  const graph = await sc(() => { const e = window.__audio.engine, m = window.__audio.music; const t = m.theme.tracks; return { comp: e.musicComp && e.musicComp.constructor.name, level: e.musicBus.gain.value, sfx: e.sfxBus.gain.value, tracks: Object.keys(t), chord: t.stabs.events[0]?.notes.length, drumKinds: [...new Set(t.drums.events.map((d) => d.kind))].sort().join(''), bars: m.theme.bars, bpm: m.theme.bpm, validation: m.validateThemes() }; });
  console.log('Musik-Kette:', JSON.stringify(graph));
  check('Musik läuft über Kompressor/Limiter, Pegel 0,22–0,3', graph.comp === 'DynamicsCompressorNode' && graph.level >= 0.22 && graph.level <= 0.3 && graph.sfx === 0.5);
  check('Spuren lead/stabs/piano/pad/bass/energy/drums vorhanden', ['lead', 'stabs', 'piano', 'pad', 'bass', 'energy', 'drums'].every((k) => graph.tracks.includes(k)));
  check('Akkord-Parser: Stab mit 3 Tönen', graph.chord === 3);
  check('Drums nutzen Kick, Clap, Snare, Hat zu/offen, Crash', graph.drumKinds === 'chkors');
  check('world1: 140 BPM, 16 Takte', graph.bpm === 140 && graph.bars === 16);
  check('Alle Themen konsistent (gleich lange Spuren, 16 Sechzehntel je Takt)', graph.validation.length === 0);
  if (graph.validation.length) console.log('  ', graph.validation.join('\n   '));

  // Effekte auslösen: Sprung, Gleiten
  await page.keyboard.down('Space'); await page.waitForTimeout(700); await page.keyboard.up('Space');

  // Aufsteigen → Energie-Ebene an
  await sc(() => { const s = window.__game.scene.getScene('Play'); const m = s.mounts.getChildren()[0]; s.hero.body.reset(m.x, m.y - 24); });
  // auf das Aufsteigen warten (unter Last laufen die Physik-Bilder langsamer), dann die Einblendung der Energie-Ebene
  await page.waitForFunction(() => window.__audio.music.drums, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  a = await audio();
  console.log('auf Pflaume:', JSON.stringify(a));
  check('Auf Pflaume kommt die Energie-Ebene dazu', a.drums === true && a.energy > 0.5);

  // CPU-Last: erzeugte Knoten je Sekunde im Live-Kontext (mit Energie-Ebene, inkl. Effekten)
  const s0 = await sc(() => ({ ...window.__audio.engine.stats, t: window.__audio.engine.now }));
  await page.waitForTimeout(2500);
  const s1 = await sc(() => ({ ...window.__audio.engine.stats, t: window.__audio.engine.now }));
  const liveRate = (s1.nodes - s0.nodes) / (s1.t - s0.t), liveOsc = (s1.oscillators - s0.oscillators) / (s1.t - s0.t);
  console.log(`Live: ${fmt(liveRate, 1)} Knoten/s, ${fmt(liveOsc, 1)} Oszillatoren/s über ${fmt(s1.t - s0.t, 2)} s`);
  check('Live unter 120 Knoten/s', liveRate > 20 && liveRate < 120);

  // Stummschalten (M) und speichern
  // auf den neuen Zustand warten statt fester 100 ms; geht ein Tastendruck unter Rechnerlast verloren (die Tastatur-
  // Verarbeitung des Spiels verschluckt gelegentlich einen schnellen zweiten Druck), wird er einmal wiederholt
  const pressMute = async (want) => {
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('m');
      const ok = await page.waitForFunction((v) => window.__audio.engine.muted === v, want, { timeout: 1500 }).then(() => true, () => false);
      if (ok) return;
    }
  };
  await pressMute(true);
  a = await audio();
  check('M schaltet stumm', a.muted === true && (await sc(() => localStorage.getItem('lotti-greta-muted'))) === '1');
  await pressMute(false);
  check('M schaltet wieder an', (await audio()).muted === false);

  // Zur Weltkarte: Karten-Thema
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await sc(() => window.__game.scene.getScene('Pause').toMap());
  await page.waitForTimeout(500);
  a = await audio();
  check('Weltkarte spielt das Karten-Thema', a.theme === 'map' && a.drums === false);

  // Levelende-Thema: spielt und endet von selbst (kein Loop)
  await sc(() => window.__audio.music.play('complete'));
  await page.waitForTimeout(200);
  check('Levelende-Thema läuft', (await audio()).theme === 'complete');
  await page.waitForTimeout(4000);
  check('Levelende-Thema endet von selbst', (await audio()).theme === null);
  await sc(() => window.__audio.music.play('map'));

  // ---- Kurs-Themen: Eckdaten, Validierung, live abspielen ----
  console.log('\nKurs-Themen:');
  for (const i of infos) if (i) console.log(`   ${i.name.padEnd(16)} ${i.bpm} BPM, ${i.bars} Takte, ${fmt(i.seconds, 2)} s, Loop ${i.loop}, Spuren ${i.tracks.join('/')}, Drums ${i.drumKinds}${i.fx.length ? `, Effekte ${i.fx.join('+')}` : ''}${i.energy ? ', Energie-Ebene' : ''}`);
  check('Alle Kurs-Themen aus dem Vertrag vorhanden', CONTRACT_THEMES.every((n) => infos.some((i) => i && i.name === n)));
  for (const [name, spec] of Object.entries(COURSE_THEMES)) {
    const i = infos.find((x) => x && x.name === name);
    check(`${name}: vorhanden, ${spec.bpm ?? '?'} BPM, ${spec.bars.join('–')} Takte, ${spec.loop ? 'Loop' : 'kein Loop'}`, !!i
      && (spec.bpm === undefined || i.bpm === spec.bpm) && Number.isInteger(i.bars) && i.bars >= spec.bars[0] && i.bars <= spec.bars[1] && i.loop === spec.loop);
  }
  check('course_cave: Hall/Echo-Bus (fx.delay)', infos.find((i) => i?.name === 'course_cave')?.fx.includes('delay'));
  check('course_circus: Rechteck-Orgel-Spur', infos.find((i) => i?.name === 'course_circus')?.tracks.includes('organ'));
  check('course_river: schnelle Arpeggien und Energie-Ebene', infos.find((i) => i?.name === 'course_river')?.tracks.includes('arp') && infos.find((i) => i?.name === 'course_river')?.energy);
  check('course_boss: Hoover-Riser und Stabs', ['riser', 'stabs'].every((k) => infos.find((i) => i?.name === 'course_boss')?.tracks.includes(k)));
  check('course_clear: höchstens 3 Takte, kein Loop', infos.find((i) => i?.name === 'course_clear')?.bars <= 3);
  check(`Alle ${CONTRACT_THEMES_W.length} Themen für Welt 2–4 vorhanden`, CONTRACT_THEMES_W.every((n) => infos.some((i) => i && i.name === n)));
  check(`Alle ${CONTRACT_THEMES_H.length} Themen der Halloween-Welt vorhanden (themeInfo)`, CONTRACT_THEMES_H.every((n) => infos.some((i) => i && i.name === n)));
  check(`Alle ${CONTRACT_THEMES_W6.length} Themen der Welt 6 vorhanden (themeInfo)`, CONTRACT_THEMES_W6.every((n) => infos.some((i) => i && i.name === n)));
  check(`Alle ${CONTRACT_THEMES_W7.length} Themen der Welt 7 vorhanden (themeInfo)`, CONTRACT_THEMES_W7.every((n) => infos.some((i) => i && i.name === n)));
  check(`Alle ${CONTRACT_THEMES_W8.length} Themen der Welt 8 vorhanden (themeInfo), der Abspann spielt einmal (${fmt(infos.find((i) => i?.name === 'course_abspann')?.seconds ?? 0, 1)} s)`, CONTRACT_THEMES_W8.every((n) => infos.some((i) => i && i.name === n))
    && infos.find((i) => i?.name === 'course_abspann')?.loop === false);
  for (const [name, spec] of Object.entries(COURSE_THEMES)) {
    if (!spec.has && !spec.drums && !spec.fx) continue;
    const i = infos.find((x) => x && x.name === name);
    check(`${name}: Spuren ${(spec.has ?? []).join('/') || '–'}, Schlagzeug ${spec.drums ?? '–'}, Effekt ${spec.fx ?? '–'}`, !!i
      && (spec.has ?? []).every((k) => i.tracks.includes(k)) && [...(spec.drums ?? '')].every((ch) => i.drumKinds.includes(ch)) && (!spec.fx || i.fx.includes(spec.fx)));
  }
  // Klangfarbe aus den Daten: Lagune blubbert (Plucks gleiten aufwärts), Gifttropfen gleiten abwärts, Spukhaus-Theremin mit weitem Vibrato
  check('course_water: blubbernde Plucks (glide > 1), weicher Tiefpass auf Piano/Pad, Lead gedämpft, aber klar (2–3 kHz)', THEMES.course_water.voice.arp.glide > 1
    && ['piano', 'pad'].every((k) => THEMES.course_water.fx.lowpass[k] <= 1600) && THEMES.course_water.voice.lead.cutoff >= 2000 && THEMES.course_water.voice.lead.cutoff <= 3000);
  check('course_poison: Gifttropfen gleiten abwärts (glide < 1)', THEMES.course_poison.voice.arp.glide < 1);
  check('course_ghost: Theremin mit weitem Vibrato (≥ 30 Cent)', THEMES.course_ghost.voice.whistle.vibrato >= 30);
  // Lead-Synth ab Welt 2: Melodie ohne Hoover-Brummen (Oktave darunter aus), der Hoover bleibt Akzent
  const synthLeads = Object.keys(COURSE_THEMES).filter((n) => COURSE_THEMES[n].key && THEMES[n].lead);
  check(`Lead-Synth statt Hoover in ${synthLeads.length} neuen Themen (sub: false)`, synthLeads.length > 0 && synthLeads.every((n) => THEMES[n].voice?.lead?.sub === false));

  // Spiegelfrucht: in der Überleitung antwortet das Glockenspiel als „Klon“ einen Takt später mit derselben Phrase
  const ch = THEMES.course_cherry;
  const cloneOk = [20, 22].every((b) => {
    const call = noteList([ch.lead[b]]).map(([p, n]) => `${p}:${n}`), echo = noteList([ch.bell[b + 1]]).map(([p, n]) => `${p}:${n}`);
    return call.length >= 3 && call.join() === echo.join() && noteList([ch.lead[b + 1]]).length === 0;
  });
  check('course_cherry: Klon-Antwort – das Glockenspiel wiederholt die Lead-Phrase der Überleitung einen Takt später, Ton für Ton', cloneOk);

  // Piep-Takt: Umschalten alle 8 Zählzeiten, auf der Eins der Umschalt-Piep (G6) mit Crash, auf den 3 Zählzeiten davor der Warn-Piep (C6)
  const beepInfo = infos.find((i) => i?.name === 'course_beep');
  const beeps = noteList(THEMES.course_beep.bell).map(([p, n]) => ({ beat: p / 4, note: +n }));
  const beepPlan = [];
  for (let b = 0; b < beepInfo.bars * 4; b++) { const k = b % 8; if (k === 0) beepPlan.push({ beat: b, note: midi('G6') }); else if (k >= 5) beepPlan.push({ beat: b, note: midi('C6') }); }
  const crashBars = THEMES.course_beep.drums.map((bar, i) => (Array.isArray(bar) ? bar : [bar]).some((l) => l[0] === 'r') ? i : -1).filter((i) => i >= 0);
  check(`course_beep: Spiel-Takt ${JSON.stringify(beepInfo?.sync)} (Umschalten alle 8 Zählzeiten, 3 Warn-Pieps)`, beepInfo?.sync?.switchEvery === 8 && beepInfo?.sync?.warnBeats === 3);
  check(`course_beep: ${beeps.length} Pieps genau auf dem Spiel-Takt (Umschalt-Piep G6 auf jeder 8. Zählzeit, Warn-Piep C6 auf den 3 davor), Crash auf jedem Umschalten`, beeps.length === beepPlan.length
    && beeps.every((x, i) => x.beat === beepPlan[i].beat && x.note === beepPlan[i].note) && crashBars.length === beepInfo.bars / 2 && crashBars.every((b) => b % 2 === 0));

  // Der Validator selbst: krumme Takte, ungleich lange Spuren, falsche Drum-Länge und Tippfehler werden gemeldet
  const bad = await sc(() => window.__audio.music.validateThemes({
    kaputt: { bpm: 120, lead: ['C4:15', 'C4:16'], bass: ['C2:16'], drums: ['k...k...k...k..'], fx: { delay: { send: { leed: 1 } } } },
  }));
  console.log('Validator (absichtlich kaputtes Thema):\n   ' + bad.join('\n   '));
  check('Themen-Validierung meldet krumme Takte, ungleiche Spuren, Drum-Länge und unbekannte Spur', bad.length >= 4
    && bad.some((m) => m.includes('15 statt 16')) && bad.some((m) => m.includes('unterschiedlich lang')) && bad.some((m) => m.includes('leed')));

  // Jedes Kurs-Thema live kurz anspielen (Wechsel ohne Fehler, Effekt-Busse werden angelegt)
  const liveThemes = await sc(async (names) => {
    const m = window.__audio.music, out = [];
    for (const n of names) {
      m.play(n);
      await new Promise((r) => setTimeout(r, 250));
      out.push({ name: n, current: m.current, fxNodes: m.fx ? m.fx.nodes.length : 0 });
    }
    m.play('gibtEsNicht');
    const unknown = m.current;
    m.play('toString');
    return { out, unknown, unknown2: m.current };
  }, Object.keys(COURSE_THEMES));
  check('Alle Kurs-Themen spielen live', liveThemes.out.every((x) => x.current === x.name));
  check('Höhle legt Hall/Echo-Bus an, Wiese nicht', liveThemes.out.find((x) => x.name === 'course_cave').fxNodes > 0 && liveThemes.out.find((x) => x.name === 'course_grass').fxNodes === 0);
  check('Unbekanntes Thema: Stille statt Fehler', liveThemes.unknown === null && liveThemes.unknown2 === null);
  for (const name of ['course_clear', 'course_gameover']) {
    const secs = infos.find((i) => i?.name === name).seconds;
    await sc((n) => window.__audio.music.play(n), name);
    await page.waitForTimeout(200);
    const running = (await audio()).theme === name;
    await page.waitForTimeout(secs * 1000 + 600);
    check(`${name} spielt und endet von selbst (${fmt(secs, 2)} s)`, running && (await audio()).theme === null);
  }
  // Abspann (kein Loop, ≈ 76 s) auf der Testuhr: er endet von selbst – beat().playing wird false und die Zählzeit bleibt am
  // Ende stehen, onBeat meldet jede Zählzeit bis zur letzten und danach keine mehr (daran kann die Abspann-Szene das Ende
  // der Musik abwarten; Dauer vorab über themeInfo('course_abspann').seconds)
  const absp = await sc(() => {
    const m = window.__audio.music, beats = [];
    m.setManualClock(true);
    m.play('course_abspann');
    const off = m.onBeat((ev) => beats.push(ev.beat));
    const mid = m.advanceClock(40), end = m.advanceClock(40), after = m.advanceClock(5);
    off();
    const info = m.themeInfo('course_abspann');
    m.setManualClock(false);
    m.play('map');
    return { mid: mid.playing && mid.theme === 'course_abspann', end: { playing: end.playing, beat: end.beat, loopBeats: end.loopBeats }, after: after.beat, beats, seconds: info.seconds };
  });
  check(`course_abspann endet von selbst (Testuhr): nach 40 s läuft er, nach 80 s playing false bei Zählzeit ${absp.end.beat} = Ende (${absp.end.loopBeats}), onBeat ${absp.beats.length}× lückenlos bis ${absp.beats.at(-1)}, danach Stille (${fmt(absp.seconds, 1)} s)`,
    absp.mid && !absp.end.playing && absp.end.beat === absp.end.loopBeats && absp.after === absp.end.beat && absp.beats.length === absp.end.loopBeats
    && absp.beats.every((b, i) => b === i) && Math.abs(absp.seconds - absp.end.loopBeats * 60 / THEMES.course_abspann.bpm) < 1e-6);
  await sc(() => window.__audio.music.play('map'));

  // ---- Taktuhr mit Ton: Tempo, onBeat im Takt der hörbaren Musik, stumm, angehaltener Kontext, Wechsel, Stopp ----
  const live = await sc(async () => {
    const m = window.__audio.music, e = window.__audio.engine;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const pos = () => { const c = m.clock, th = m.theme, seq = m.seq; const at = c.b0 + (seq.time - c.t0) * c.bpm / 60; const d = ((at * 4 - seq.step) % th.length + th.length) % th.length; return Math.min(d, th.length - d); };
    const snap = () => ({ b: m.beat(), t: performance.now() });
    m.play('course_beep');
    await wait(300);
    const r0 = snap();
    const hits = [];
    const off = m.onBeat((ev) => hits.push({ ...ev, t: performance.now(), audible: e.audibleTime() }));
    await wait(4000);
    off();
    const r1 = snap();
    const c = m.clock;
    const audibleLag = hits.map((h) => h.audible - (c.t0 + (h.beat - c.b0) * 60 / c.bpm)); // hörbar seit … s
    const offset1 = pos();
    e.setMuted(true);
    const m0 = snap();
    await wait(1000);
    const m1 = snap();
    e.setMuted(false);
    const s0 = snap();
    await e.ctx.suspend();
    await wait(700);
    const s1 = snap();
    await e.ctx.resume();
    await wait(400);
    const s2 = snap();
    const offset2 = pos();
    m.play('course_race');
    await wait(250);
    const race = m.beat();
    m.stop();
    const st0 = m.beat();
    await wait(200);
    const st1 = m.beat();
    const noop = typeof m.onBeat(42);
    m.play('map');
    return { r0, r1, hits, audibleLag, offset1, m0, m1, s0, s1, s2, offset2, race, st0, st1, noop };
  });
  const bps = BEEP_BPM / 60; // Zählzeiten je Sekunde
  const rate = (x, y) => (y.b.beat - x.b.beat) / ((y.t - x.t) / 1000);
  const ls = beatSeries(live.hits, BEEP_BPM);
  const lagSorted = [...live.audibleLag].sort((p, q) => p - q);
  console.log(`\nTaktuhr mit Ton (course_beep, ${BEEP_BPM} BPM): Start ${JSON.stringify(live.r0.b)}`);
  console.log(`   Tempo ${fmt(rate(live.r0, live.r1))} Zählzeiten/s; onBeat ${ls.n}×, Abstand (Median) ${fmt(ls.interval)} s, größte Abweichung ${fmt(ls.jitter * 1000, 1)} ms, Raster ±${fmt(ls.gridErr * 1000, 2)} ms, Verzug Median ${fmt(ls.lateMedian * 1000, 1)} ms, max ${fmt(ls.lateMax * 1000, 1)} ms`);
  console.log(`   Rückruf nach dem Hörbarwerden der Zählzeit: ${fmt(lagSorted[0] * 1000, 1)} … ${fmt(lagSorted[lagSorted.length - 1] * 1000, 1)} ms; Sequencer neben der Uhr ${fmt(live.offset1, 4)} Sechzehntel`);
  console.log(`   stumm: ${fmt(rate(live.m0, live.m1))} Zählzeiten/s; Kontext angehalten: ${fmt(rate(live.s0, live.s1))} Zählzeiten/s (Quelle ${live.s1.b.source}), danach Quelle ${live.s2.b.source}, Zählzeit ${fmt(live.s2.b.beat)} (erwartet ${fmt(live.s1.b.beat + (live.s2.t - live.s1.t) / 1000 * bps)}), Sequencer neben der Uhr ${fmt(live.offset2, 4)}`);
  check(`Taktuhr mit Ton: course_beep startet bei Zählzeit 0 mit ${BEEP_BPM} BPM auf der hörbaren Uhr`, live.r0.b.theme === 'course_beep' && live.r0.b.bpm === BEEP_BPM && live.r0.b.source === 'audio' && live.r0.b.playing && live.r0.b.beat < 1.5 && beatOk(live.r0.b));
  check(`Taktuhr mit Ton: beat() steigt mit dem Tempo (${fmt(rate(live.r0, live.r1))} statt ${fmt(bps)} Zählzeiten/s)`, Math.abs(rate(live.r0, live.r1) - bps) < bps * 0.03);
  check(`onBeat mit Ton: ${ls.n} lückenlose Zählzeiten im Abstand ${fmt(ls.interval)} s (erwartet ${fmt(1 / bps)} s ±3 %), jede im Raster (±${fmt(ls.gridErr * 1000, 2)} ms)`, ls.n >= 6 && ls.consecutive && ls.fields && ls.intervalErr < 0.03 && ls.gridErr < 0.01);
  check(`onBeat synchron zur hörbaren Musik: Rückruf 0–40 ms nach dem Hörbarwerden (Median ${fmt(lagSorted[Math.floor(lagSorted.length / 2)] * 1000, 1)} ms), Sequencer exakt auf der Uhr`, lagSorted[0] >= -0.002 && lagSorted[Math.floor(lagSorted.length / 2)] < 0.04 && live.offset1 < 0.01);
  check(`Stummgeschaltet läuft die Taktuhr weiter (${fmt(rate(live.m0, live.m1))} Zählzeiten/s, Quelle ${live.m1.b.source})`, Math.abs(rate(live.m0, live.m1) - bps) < bps * 0.05 && live.m1.b.source === 'audio');
  check(`Kontext angehalten: Ersatzuhr übernimmt stetig (${fmt(rate(live.s0, live.s1))} Zählzeiten/s, Quelle ${live.s1.b.source})`, live.s1.b.source === 'ersatz' && Math.abs(rate(live.s0, live.s1) - bps) < bps * 0.06);
  check('Kontext fortgesetzt: Uhr wieder hörbar, ohne Sprung, Musik im Takt der Uhr', live.s2.b.source === 'audio' && Math.abs(live.s2.b.beat - (live.s1.b.beat + (live.s2.t - live.s1.t) / 1000 * bps)) < 0.15 && live.offset2 < 0.01);
  check(`Themenwechsel: Zählung beginnt neu im Tempo des neuen Themas (course_race, ${live.race.bpm} BPM, Zählzeit ${fmt(live.race.beat)})`, live.race.theme === 'course_race' && live.race.bpm === THEMES.course_race.bpm && live.race.beat < 1);
  check('stop(): Taktuhr steht (playing false, Zählzeit fest)', !live.st0.playing && live.st0.beat === live.st1.beat && !live.st1.playing);
  check('onBeat ohne Funktion: Abmelden-Funktion ohne Wirkung', live.noop === 'function');

  // Testhaken: virtuelle Uhr, deterministisch vorgespult (1/60 s je Bild wie die Spiel-Schritte)
  const man = await sc(() => {
    const m = window.__audio.music, r = {};
    m.stop();
    r.on = m.setManualClock(true);
    m.play('course_beep');
    const evs = [];
    const off = m.onBeat((ev) => evs.push(ev));
    const samples = [];
    for (let i = 1; i <= 594; i++) { m.advanceClock(1 / 60); if (i % 60 === 0) samples.push(m.beat()); }
    off();
    r.end0 = m.beat();
    m.advanceClock(2);
    r.after = evs.length;
    r.end = m.beat();
    r.manual = m.manualClock;
    r.off = m.setManualClock(false);
    r.cont = m.beat();
    r.evs = evs;
    r.samples = samples;
    m.play('map');
    return r;
  });
  const manBeats = Math.floor(9.9 * bps + 1e-9) + 1; // Zählzeiten 0 … floor(9,9 s · Tempo)
  console.log(`Testhaken: ${man.evs.length} Rückrufe in 9,9 s virtueller Zeit (Zählzeiten ${man.evs[0]?.beat}…${man.evs[man.evs.length - 1]?.beat}), Proben ${man.samples.map((b) => fmt(b.beat, 2)).join(' ')}`);
  check('Testhaken: setManualClock(true) schaltet die virtuelle Uhr ein', man.on === true && man.manual === true && man.off === false);
  check(`Testhaken: 9,9 s bei ${BEEP_BPM} BPM ergeben genau die Zählzeiten 0–${manBeats - 1} in Reihenfolge, mit Takt/Zählzeit im Takt`, man.evs.length === manBeats && man.evs.every((ev, i) => ev.beat === i && ev.bar === Math.floor(i / 4) && ev.inBar === i % 4 && ev.theme === 'course_beep' && ev.late >= 0 && ev.late < 1 / 60 + 1e-9));
  check(`Testhaken: beat() nach jeder virtuellen Sekunde genau ${fmt(bps, 3)}, ${fmt(2 * bps, 3)}, … Zählzeiten`, man.samples.length === 9 && man.samples.every((b, k) => Math.abs(b.beat - bps * (k + 1)) < 1e-6 && b.source === 'ersatz' && b.playing && beatOk(b)));
  check(`Testhaken: nach dem Abmelden keine Rückrufe mehr; Zählzeit läuft weiter (+${fmt(2 * bps, 2)} in 2 s)`, man.after === manBeats && Math.abs(man.end.beat - man.end0.beat - 2 * bps) < 1e-6);
  check(`Testhaken aus: Zählzeit läuft stetig weiter (${fmt(man.end.beat)} → ${fmt(man.cont.beat)})`, Math.abs(man.cont.beat - man.end.beat) < 0.1 && man.cont.playing);

  // ---- Effekte live: alle Namen auslösen, Knoten je Effekt zählen, unbekannte Namen stumm ----
  const liveSfx = await sc(async () => {
    const e = window.__audio.engine, fx = e.effects, nodes = {}, unknown = {};
    for (const n of fx.names) {
      const a = e.stats.nodes; // synchron gemessen: der Sequencer läuft nur in Timer-Rückrufen
      fx.play(n);
      nodes[n] = e.stats.nodes - a;
      await new Promise((r) => setTimeout(r, 40));
    }
    for (const n of ['gibtEsNicht', 'toString', '__proto__', 'constructor', 'hasOwnProperty', '', undefined, null, 42]) {
      const a = e.stats.nodes;
      try { fx.play(n); unknown[String(n)] = e.stats.nodes - a; } catch (err) { unknown[String(n)] = `Fehler: ${err.message}`; }
    }
    // Drosselung: Wiederholung innerhalb des Mindestabstands bleibt stumm, danach klingt der Effekt wieder. Je Auslösung
    // Knoten und Kontextzeit (unter Last können Wartezeiten länger werden – die Prüfung folgt den tatsächlichen Zeiten).
    const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
    const playN = (n) => { const a = e.stats.nodes, t = e.now; fx.play(n); return { nodes: e.stats.nodes - a, t }; };
    const gap = { swim: fx.gap?.swim ?? 0, def: fx.gapDefault ?? 0 };
    await wait(0.6);
    const throttle = { swim: [playN('swim'), playN('swim')], coin: [playN('coin'), playN('coin')] };
    await wait(gap.swim * 0.3);
    throttle.swim.push(playN('swim'));
    await wait(gap.swim + 0.05);
    throttle.swim.push(playN('swim'));
    await wait(gap.def + 0.05);
    throttle.coin.push(playN('coin'));
    // Siegespose über der Musik-Fanfare course_clear: nur Jubel-Glitzer (weniger Knoten als die volle Fanfare)
    const m = window.__audio.music, prev = m.current;
    await wait((fx.gap?.victory ?? 1) + 0.05);
    m.play('course_clear');
    const victoryOverFanfare = { theme: m.current, nodes: playN('victory').nodes };
    if (prev) m.play(prev); else m.stop();
    return { names: fx.names, course: fx.course, world: fx.world, w6: fx.w6 ?? [], hw: fx.hw ?? [], more: fx.more ?? [], nodes, unknown, gap, throttle, victoryOverFanfare };
  });
  check(`Effekt-Liste enthält die ${MORE_SFX.length} ergänzten Kurs-Effekte (engine.effects.more)`,
    MORE_SFX.every((n) => liveSfx.names.includes(n)) && MORE_SFX.every((n) => liveSfx.more.includes(n)) && liveSfx.more.length === MORE_SFX.length);
  // Erwartung je Auslösung aus den Kontextzeiten: klingt genau dann, wenn seit der letzten hörbaren Auslösung ≥ Abstand vergangen ist
  const rule = (list, g) => { let last = -Infinity; return list.every((x) => { const ok = x.t - last >= g ? x.nodes > 0 : x.nodes === 0; if (x.nodes > 0) last = x.t; return ok; }); };
  const th = liveSfx.throttle, fmtTh = (list) => list.map((x) => `${x.nodes}@${fmt(x.t - list[0].t, 2)}s`).join(' / ');
  console.log(`Drosselung: swim (Abstand ${liveSfx.gap.swim} s) Knoten ${fmtTh(th.swim)}; coin (Abstand ${liveSfx.gap.def} s) Knoten ${fmtTh(th.coin)}`);
  check(`Drosselung: swim sofort wiederholt stumm, innerhalb von ${liveSfx.gap.swim} s stumm, danach wieder hörbar`,
    liveSfx.gap.swim >= 0.1 && th.swim[0].nodes > 0 && th.swim[1].nodes === 0 && th.swim[3].nodes > 0 && rule(th.swim, liveSfx.gap.swim));
  check(`Drosselung: derselbe Effekt im selben Augenblick klingt einmal (coin ${th.coin.map((x) => x.nodes).join(' / ')}), danach wieder`,
    liveSfx.gap.def > 0 && liveSfx.gap.def <= 0.05 && th.coin[0].nodes > 0 && th.coin[1].nodes === 0 && th.coin[2].nodes > 0 && rule(th.coin, liveSfx.gap.def));
  const vf = liveSfx.victoryOverFanfare;
  check(`victory über course_clear: nur Jubel-Glitzer (${vf.nodes} statt ${liveSfx.nodes.victory} Knoten, Thema ${vf.theme})`,
    vf.theme === 'course_clear' && vf.nodes > 0 && vf.nodes < liveSfx.nodes.victory);
  check(`Effekt-Liste enthält alle ${WORLD_SFX.length} Namen für Welt 2–4`, WORLD_SFX.every((n) => liveSfx.names.includes(n)) && WORLD_SFX.every((n) => liveSfx.world.includes(n)) && liveSfx.world.length === WORLD_SFX.length);
  check('Effekt-Liste enthält alle Vertragsnamen', CONTRACT_SFX.every((n) => liveSfx.names.includes(n)) && CONTRACT_SFX.every((n) => liveSfx.course.includes(n)) && liveSfx.course.length === CONTRACT_SFX.length);
  const heavy = Object.entries(liveSfx.nodes).filter(([, n]) => !(n > 0 && n <= MAX_SFX_NODES));
  console.log(`Effekte live: ${Object.keys(liveSfx.nodes).length} ausgelöst, Knoten je Effekt ${Math.min(...Object.values(liveSfx.nodes))}–${Math.max(...Object.values(liveSfx.nodes))}`);
  check(`Alle Effekte erzeugen Knoten, höchstens ${MAX_SFX_NODES} je Effekt${heavy.length ? ` (auffällig: ${heavy.map(([k, n]) => `${k}=${n}`).join(', ')})` : ''}`, heavy.length === 0);
  console.log('Unbekannte Namen:', JSON.stringify(liveSfx.unknown));
  check('Unbekannte Effekt-Namen bleiben stumm (kein Fehler, keine Knoten)', Object.values(liveSfx.unknown).every((v) => v === 0));
  await page.waitForTimeout(1500);
  check('Effekte live ohne Konsolenfehler', errors.length === 0);
}

if (want('render')) {
  // ---- Offline: Themen rendern und vermessen ----
  const results = {};
  for (const job of [
    { name: 'world1', seconds: 8, energy: false, wantWav: true },
    { name: 'world1', seconds: 8, energy: true, label: 'world1+energy' },
    { name: 'map', seconds: 8, energy: false, beatMult: 2 }, // Kick auf 1 und 3 → Kick-Abstand = 2 Schläge
    { name: 'complete', seconds: 3.5, energy: false },
  ]) {
    const r = await sc(analyzeInPage, job);
    const label = job.label ?? job.name;
    results[label] = r;
    const b = r.bands;
    console.log(`\n[${label}] ${r.bpm} BPM, ${r.bars} Takte, ${r.seconds} s offline (Mix hinter Kompressor, Pegel 1; im Spiel ×${r.inGameLevel})`);
    console.log(`   Spitze ${fmt(r.peak)}  RMS ${fmt(r.rms)} (im Spiel ${fmt(r.rms * r.inGameLevel)})  Knoten/s ${fmt(r.nodesPerSecond, 1)}  Oszillatoren/s ${fmt(r.oscPerSecond, 1)}`);
    console.log(`   Bänder: Bass 40–150 Hz ${fmt(b.bass.dB, 1)} dBFS (${fmt(b.bass.share * 100, 1)} %), Mitten 200–2500 Hz ${fmt(b.mid.dB, 1)} dBFS (${fmt(b.mid.share * 100, 1)} %), Höhen >6 kHz ${fmt(b.high.dB, 1)} dBFS (${fmt(b.high.share * 100, 1)} %)`);
    console.log(`   Beat: Autokorrelations-Maximum bei ${fmt(r.beatLag)} s (erwartet ${fmt(r.beatExpected)} s = ${job.beatMult ?? 1}·60/${r.bpm}); AK(Kick-Abstand) ${fmt(r.acBeat, 2)}, AK(halber) ${fmt(r.acEighth, 2)}, AK(3/4) ${fmt(r.acOff, 2)}`);
    if (r.wav) { writeWav(`${OUT}${job.name}.wav`, r.wav, r.sampleRate); console.log(`   WAV: ${OUT}${job.name}.wav`); }
  }
  for (const [label, r] of Object.entries(results)) {
    const b = r.bands;
    check(`${label}: kein Clipping (Spitze ${fmt(r.peak)} < 0,98)`, r.peak < 0.98);
    check(`${label}: RMS im Bereich 0,08–0,25 (${fmt(r.rms)})`, r.rms >= 0.08 && r.rms <= 0.25);
    check(`${label}: Bass, Mitten und Höhen deutlich vorhanden`, b.bass.dB > -30 && b.mid.dB > -30 && b.high.dB > -42);
    check(`${label}: unter 120 Knoten/s (${fmt(r.nodesPerSecond, 1)})`, r.nodesPerSecond < 120);
    if (label !== 'complete') {
      check(`${label}: Beat-Periodizität am Kick-Abstand ${fmt(r.beatExpected)} s (${fmt(r.beatLag)} s)`, Math.abs(r.beatLag - r.beatExpected) <= r.beatExpected * 0.03 && r.acBeat > r.acOff);
    }
  }

  // ---- Offline: Kurs-Themen (ganzer Loop) rendern und vermessen; Welt-1-Themen: erste 8 s als WAV, Welt 2–4: 30-s-Hörprobe
  // ab der Strophe (das Thema wird dafür gedreht – Messung über den ganzen Loop bleibt gleich) und 15 s ab dem Refrain
  const refRms = ['world1', 'map', 'complete'].map((n) => results[n].rms);
  const rmsLo = Math.min(...refRms) / Math.SQRT2, rmsHi = Math.max(...refRms) * Math.SQRT2; // bestehende Themen ±3 dB
  console.log(`\nKurs-Themen offline (RMS-Bereich = bestehende Themen ±3 dB: ${fmt(rmsLo)}–${fmt(rmsHi)})`);
  const courseResults = {}, refrains = {};
  const PREVIEW = 30, REFRAIN = 15;
  const COLLECT = { 2: (sp) => !sp.map, 5: () => true, 6: () => true, 7: () => true, 8: () => true, [HW]: () => true }; // Sammel-Hörproben: Welt 2 ohne Karte, Welt 5–8 und Halloween mit allen Themen
  // Halloween: tests/out/hw_<thema>_30s.wav, Welt 6, 7 und 8: tests/out/w6_<thema>_30s.wav, w7_… bzw. w8_<thema>_30s.wav
  const wavName = (name, spec) => (spec.world === HW ? `hw_${name.replace('course_', '')}` : [6, 7, 8].includes(spec.world) ? `w${spec.world}_${name.replace('course_', '')}` : name);
  const jobs = [];
  for (const [name, spec] of Object.entries(COURSE_THEMES)) {
    if (ONLY && !ONLY.includes(name)) continue;
    if (WORLDS && !WORLDS.includes(spec.world ?? 1)) continue;
    const info = infos.find((i) => i?.name === name);
    const full = !!spec.full;                       // ganzes Stück als Hörprobe (Abspann, kein Loop)
    const preview = spec.preview !== undefined && !full;
    const barSec = info.seconds / info.bars;
    // Halloween, Welt 6, 7 und 8: 2 s über das Loop-Ende hinaus rendern, damit die Naht (letzter Takt → erster Takt) im Puffer liegt
    const seam = [HW, 6, 7, 8].includes(spec.world) && info.loop;
    const seconds = info.loop ? Math.max(8, info.seconds + (seam ? 2 : 0), preview ? PREVIEW : 0) : info.seconds + 0.6;
    const theme = preview ? rotateTheme(THEMES[name], spec.preview) : null;
    const excerpt = (preview || full) && COLLECT[spec.world]?.(spec) ? { from: ((spec.hook - (spec.preview ?? 0) + info.bars) % info.bars) * barSec, seconds: REFRAIN } : null;
    const seamAt = seam ? 0.02 + ((info.bars - (spec.preview ?? 0)) % info.bars || info.bars) * barSec : null;
    const tailFrom = info.loop ? null : 0.02 + info.seconds + 0.25;   // kein Loop: Nachklang nach dem Schluss
    jobs.push({ job: { name, seconds, energy: false, wantWav: true, wavSeconds: full ? Infinity : preview ? PREVIEW : 8, beatMult: spec.beatMult ?? 1, theme, excerpt, seamAt, tailFrom }, spec, info, preview });
    if (spec.energy) jobs.push({ job: { name, seconds, energy: true, wantWav: false, beatMult: spec.beatMult ?? 1, label: `${name}+energy` }, spec, info, preview: false });
  }
  // je zwei Themen gleichzeitig rendern (jeder OfflineAudioContext rechnet in einem eigenen Audio-Thread)
  const t0 = Date.now();
  for (let k = 0; k < jobs.length; k += 2) {
    const pair = jobs.slice(k, k + 2);
    const rs = await Promise.all(pair.map(({ job }) => sc(analyzeInPage, job)));
    pair.forEach(({ job, spec, info, preview }, j) => {
      const r = rs[j], name = job.name, label = job.label ?? name;
      courseResults[label] = { ...r, spec, wav: null, excerptWav: null };
      const b = r.bands;
      console.log(`\n[${label}] ${r.bpm} BPM, ${r.bars} Takte, ${fmt(r.seconds, 2)} s offline (${info.loop ? 'ganzer Loop' : 'ganzes Stück'}${job.theme ? `, ab Takt ${spec.preview + 1}` : ''})`);
      console.log(`   Spitze ${fmt(r.peak)} bei ${fmt(r.peakAt, 2)} s  RMS ${fmt(r.rms)} (im Spiel ${fmt(r.rms * r.inGameLevel)})  Knoten/s ${fmt(r.nodesPerSecond, 1)}  Oszillatoren/s ${fmt(r.oscPerSecond, 1)}`);
      console.log(`   Bänder: Bass ${fmt(b.bass.dB, 1)} dBFS (${fmt(b.bass.share * 100, 1)} %), Mitten ${fmt(b.mid.dB, 1)} dBFS (${fmt(b.mid.share * 100, 1)} %), Höhen ${fmt(b.high.dB, 1)} dBFS (${fmt(b.high.share * 100, 2)} %)`);
      if (!spec.noBeat) console.log(`   Beat: AK-Maximum bei ${fmt(r.beatLag)} s (erwartet ${fmt(r.beatExpected)} s = ${job.beatMult}·60/${r.bpm}); AK(Kick-Abstand) ${fmt(r.acBeat, 2)}, AK(halber) ${fmt(r.acEighth, 2)}, AK(3/4) ${fmt(r.acOff, 2)}`);
      if (r.seam) console.log(`   Loop-Naht bei ${fmt(r.seam.at, 2)} s: RMS je Schlag (2 vor, 2 nach) ${fmt(r.seam.minNear)}–${fmt(r.seam.maxNear)} (Median aller Schläge ${fmt(r.seam.median)}), Spitze ±0,25 s ${fmt(r.seam.peak)}`);
      if (r.tail !== null) console.log(`   Schluss: RMS ab ${fmt(job.tailFrom, 2)} s (0,25 s nach dem Ende) ${fmt(r.tail, 4)} = ${fmt(r.tail / r.rms * 100, 1)} % des Gesamt-RMS`);
      if (r.wav) {
        const file = `${OUT}${wavName(name, spec)}${preview ? '_30s' : ''}.wav`;
        writeWav(file, r.wav, r.sampleRate);
        console.log(`   WAV: ${file}${preview ? ` (${PREVIEW} s ab Takt ${spec.preview + 1}: Strophe → Refrain ab Takt ${spec.hook + 1})` : spec.full ? ` (ganzes Stück, ${fmt(r.seconds, 1)} s)` : ''}`);
      }
      if (r.excerptWav) refrains[name] = { pcm: Buffer.from(r.excerptWav, 'base64'), sr: r.sampleRate };
    });
  }
  console.log(`\n(${jobs.length} Kurs-Themen offline vermessen in ${fmt((Date.now() - t0) / 1000, 0)} s)`);
  for (const [label, r] of Object.entries(courseResults)) {
    const b = r.bands;
    check(`${label}: kein Clipping (Spitze ${fmt(r.peak)} < 0,98)`, r.peak < 0.98);
    check(`${label}: RMS ${fmt(r.rms)} im Bereich der bestehenden Themen`, r.rms >= rmsLo && r.rms <= rmsHi);
    check(`${label}: Bass, Mitten und Höhen vorhanden`, b.bass.dB > -30 && b.mid.dB > -30 && b.high.dB > -42);
    check(`${label}: unter 120 Knoten/s (${fmt(r.nodesPerSecond, 1)})`, r.nodesPerSecond < 120);
    if (!r.spec.noBeat) {
      check(`${label}: Beat-Periodizität am Kick-Abstand ${fmt(r.beatExpected)} s (${fmt(r.beatLag)} s)`, Math.abs(r.beatLag - r.beatExpected) <= r.beatExpected * 0.03 && r.acBeat > r.acOff);
    }
    if (r.seam) {
      check(`${label}: Loop-Naht ohne Einbruch und ohne Spitze (RMS je Schlag an der Naht ≥ 50 % des Medians: ${fmt(r.seam.minNear)} / ${fmt(r.seam.median)}, Spitze ${fmt(r.seam.peak)} < 0,98)`, r.seam.minNear >= 0.5 * r.seam.median && r.seam.peak < 0.98);
    }
    if (r.tail !== null && r.spec.full) {
      check(`${label}: endet mit einem Schluss – 0,25 s nach dem Ende ist der Nachklang verklungen (RMS ${fmt(r.tail / r.rms * 100, 1)} % des Gesamt-RMS < 5 %)`, r.tail < 0.05 * r.rms);
    }
  }
  // Pegel der Halloween- und der Welt-6- bis Welt-8-Themen wie Welt 5 (nur wenn die Welten in diesem Lauf gerendert wurden):
  // Median von RMS und Spitze je Welt, Abstand höchstens 1,5 dB
  const byWorld = (w) => Object.values(courseResults).filter((r) => r.spec.world === w && !r.spec.map);
  const db = (a, b) => 20 * Math.log10(a / b);
  for (const [w, label] of [[HW, 'Halloween'], [6, 'Welt 6'], [7, 'Welt 7'], [8, 'Welt 8']]) {
    if (!byWorld(5).length || !byWorld(w).length) continue;
    const lv = (x, k) => median(byWorld(x).map((r) => r[k]));
    console.log(`\nPegel (ohne Karten): Welt 5 RMS-Median ${fmt(lv(5, 'rms'))}, Spitze-Median ${fmt(lv(5, 'peak'))}; ${label} RMS-Median ${fmt(lv(w, 'rms'))}, Spitze-Median ${fmt(lv(w, 'peak'))}`);
    check(`${label}-Pegel wie Welt 5: RMS ${fmt(db(lv(w, 'rms'), lv(5, 'rms')), 1)} dB, Spitze ${fmt(db(lv(w, 'peak'), lv(5, 'peak')), 1)} dB (je höchstens ±1,5 dB)`, Math.abs(db(lv(w, 'rms'), lv(5, 'rms'))) <= 1.5 && Math.abs(db(lv(w, 'peak'), lv(5, 'peak'))) <= 1.5);
  }

  // Sammel-Hörproben: Welt 2 (die sieben Kurs-Themen), Welt 5 (alle zehn Themen), Welt 6 und 7 (je alle neun), Welt 8 (alle
  // elf) und die Halloween-Welt (alle sechs) je 15 s ab dem Refrain (0,3 s ausgeblendet), 1 s Pause dazwischen
  for (const [w, count] of [[2, 7], [5, 10], [6, 9], [7, 9], [8, 11], [HW, 6]]) {
    const names = Object.entries(COURSE_THEMES).filter(([, sp]) => sp.world === w && COLLECT[w](sp)).map(([n]) => n);
    if (!names.every((n) => refrains[n])) continue;
    const sr = refrains[names[0]].sr, gap = Buffer.alloc(sr * 2), parts = [gap], order = [];
    let t = 1;
    for (const n of names) {
      const pcm = Buffer.from(refrains[n].pcm), samples = pcm.length / 2, fade = Math.round(0.3 * sr);
      for (let i = 0; i < fade; i++) { const k = samples - fade + i; pcm.writeInt16LE(Math.round(pcm.readInt16LE(k * 2) * (1 - i / fade)), k * 2); }
      parts.push(pcm, gap);
      order.push(`${fmt(t, 1)} s ${n}`);
      t += samples / sr + 1;
    }
    const file = `${OUT}hoerprobe_${w === HW ? 'halloween' : `welt${w}`}.wav`;
    writeWav(file, Buffer.concat(parts), sr);
    console.log(`\nSammel-Hörprobe: ${file} (${fmt(t, 1)} s): ${order.join(', ')}`);
    check(`Sammel-Hörprobe ${w === HW ? 'Halloween' : `Welt ${w}`} mit allen ${names.length} Themen je ${REFRAIN} s ab dem Refrain geschrieben`, order.length === count);
  }

  // ---- Hall/Echo-Bus wirkt: ein einzelner Tropfen mit den Höhlen-Einstellungen, mit und ohne fx ----
  // Trocken ist der Pluck nach ~0,45 s verklungen; mit Echo-Bus muss im Folgetakt deutlich Energie bleiben.
  const cave = THEMES.course_cave;
  const echoProbe = await sc(async ({ voice, fx }) => {
    const m = window.__audio.music;
    const tail = async (withFx) => {
      const th = { bpm: 132, voice, fx: withFx ? fx : undefined, arp: ['B5:1 -:15', '-:16'] };
      const r = await m.renderTheme('echo-probe', 4, { theme: th });
      const x = r.buffer.getChannelData(0), sr = r.sampleRate;
      const bar = 60 / 132 * 4;
      let s = 0, n = 0;
      for (let i = Math.floor((0.02 + 0.6) * sr); i < Math.floor((0.02 + 2 * bar) * sr); i++) { s += x[i] * x[i]; n++; }
      return Math.sqrt(s / n);
    };
    return { dry: await tail(false), wet: await tail(true) };
  }, { voice: cave.voice, fx: cave.fx });
  console.log(`\nEcho-Bus (Höhle): Nachklang-RMS ab 0,6 s trocken ${echoProbe.dry.toExponential(2)}, mit fx ${echoProbe.wet.toExponential(2)}`);
  check('Höhle: Hall/Echo-Bus erzeugt hörbaren Nachklang (mind. 20 dB über trocken)', echoProbe.wet > 0.002 && echoProbe.wet > echoProbe.dry * 10);
}

if (want('sfx')) {
  // ---- Offline: Effekte vermessen, Demo schreiben ----
  const names = await sc(() => window.__audio.engine.effects.names);
  const lists6 = await sc(() => { const f = window.__audio.engine.effects; return { w6: f.w6 ?? [], hw: f.hw ?? [] }; });
  check(`Welt-6- und Halloween-Klänge sind eigene Effekte (${W6HW_SFX.length} Namen in engine.effects.names/w6/hw)`,
    W6HW_SFX.every((n) => names.includes(n)) && W6_SFX.every((n) => lists6.w6.includes(n)) && HW_SFX.every((n) => lists6.hw.includes(n)));
  const order = [...CONTRACT_SFX, ...names.filter((n) => !CONTRACT_SFX.includes(n) && !WORLD_SFX.includes(n) && !W6HW_SFX.includes(n) && !MORE_SFX.includes(n))];
  const demo = await sc(sfxInPage, { order, gap: 0.6 });
  writeWav(`${OUT}sfx_demo.wav`, demo.wav, demo.sampleRate);
  // Bezug: bestehende, unveränderte Klassik-Effekte für Spielereignisse (ohne die bewusst leisen Umgebungs- und
  // Menü-Geräusche glideOpen, dive, vanish, hover, step, select, pause)
  const REF_SFX = ['jump', 'land', 'hardLand', 'stomp', 'hurt', 'fireball', 'die', 'bigCoin', 'berry', 'key', 'gate', 'slam', 'mount', 'panic', 'swoop'];
  const byName = Object.fromEntries(demo.stats.map((s) => [s.name, s]));
  const refL = REF_SFX.map((n) => byName[n].loudness).sort((p, q) => p - q);
  const refMedian = refL[Math.floor(refL.length / 2)];
  const loLim = refL[0] - 1, hiLim = refL[refL.length - 1] + 1;
  console.log(`\nEffekte offline (Effekt-Bus 0,5): Lautheit der bestehenden Effekte ${fmt(refL[0], 1)} … ${fmt(refL[refL.length - 1], 1)} LUFS (Median ${fmt(refMedian, 1)}); erlaubt ${fmt(loLim, 1)} … ${fmt(hiLim, 1)}`);
  console.log(`Demo: ${OUT}sfx_demo.wav (${fmt(demo.seconds, 1)} s, je Effekt + 0,6 s Pause), Reihenfolge:`);
  order.forEach((n, i) => {
    const s = byName[n];
    console.log(`   ${String(i + 1).padStart(2)}. ${fmt(demo.starts[i], 2).padStart(6)} s  ${n.padEnd(12)} Dauer ${fmt(s.duration, 2)} s  Spitze ${fmt(s.peak, 2)}  Lautheit ${fmt(s.loudness, 1)} LUFS  Knoten ${s.nodes}${CONTRACT_SFX.includes(n) ? '' : '  (Klassik)'}`);
  });
  const courseL = CONTRACT_SFX.map((n) => byName[n].loudness).sort((p, q) => p - q);
  const courseMedian = courseL[Math.floor(courseL.length / 2)];
  check(`Kurs-Effekte gleich laut wie die bestehenden (Median ${fmt(courseMedian, 1)} vs. ${fmt(refMedian, 1)} LUFS, ±2 dB)`, Math.abs(courseMedian - refMedian) <= 2);
  for (const n of CONTRACT_SFX) {
    const s = byName[n];
    check(`sfx ${n}: Lautheit ${fmt(s.loudness, 1)} LUFS im Bereich, Spitze ${fmt(s.peak, 2)} < 0,9, Dauer ${fmt(s.duration, 2)} s, ${s.nodes} Knoten`,
      s.loudness >= loLim && s.loudness <= hiLim && s.peak < 0.9 && s.duration > 0.04 && s.duration <= 1.6 && s.nodes <= MAX_SFX_NODES);
  }

  // Effekte Welt 2–4: eigene Hörprobe, gleiche Maßstäbe wie die Kurs-Effekte
  const demoW = await sc(sfxInPage, { order: WORLD_SFX, gap: 0.6 });
  writeWav(`${OUT}sfx_demo_w2.wav`, demoW.wav, demoW.sampleRate);
  console.log(`\nEffekte Welt 2–4: ${OUT}sfx_demo_w2.wav (${fmt(demoW.seconds, 1)} s, je Effekt + 0,6 s Pause), Reihenfolge:`);
  const byNameW = Object.fromEntries(demoW.stats.map((x) => [x.name, x]));
  WORLD_SFX.forEach((n, i) => {
    const x = byNameW[n];
    console.log(`   ${String(i + 1).padStart(2)}. ${fmt(demoW.starts[i], 2).padStart(6)} s  ${n.padEnd(14)} Dauer ${fmt(x.duration, 2)} s  Spitze ${fmt(x.peak, 2)}  Lautheit ${fmt(x.loudness, 1)} LUFS  Knoten ${x.nodes}`);
  });
  const worldL = WORLD_SFX.map((n) => byNameW[n].loudness).sort((p, q) => p - q);
  const worldMedian = worldL[Math.floor(worldL.length / 2)];
  check(`Effekte Welt 2–4 gleich laut wie die bestehenden (Median ${fmt(worldMedian, 1)} vs. ${fmt(refMedian, 1)} LUFS, ±2 dB)`, Math.abs(worldMedian - refMedian) <= 2);
  for (const n of WORLD_SFX) {
    const x = byNameW[n];
    check(`sfx ${n}: Lautheit ${fmt(x.loudness, 1)} LUFS im Bereich, Spitze ${fmt(x.peak, 2)} < 0,9, Dauer ${fmt(x.duration, 2)} s, ${x.nodes} Knoten`,
      x.loudness >= loLim && x.loudness <= hiLim && x.peak < 0.9 && x.duration > 0.04 && x.duration <= 1.6 && x.nodes <= MAX_SFX_NODES);
  }

  // Effekte Welt 6 und Halloween: eigene Hörprobe, gleiche Maßstäbe
  const demo6 = await sc(sfxInPage, { order: W6HW_SFX, gap: 0.6 });
  writeWav(`${OUT}sfx_demo_w6.wav`, demo6.wav, demo6.sampleRate);
  console.log(`\nEffekte Welt 6 und Halloween: ${OUT}sfx_demo_w6.wav (${fmt(demo6.seconds, 1)} s, je Effekt + 0,6 s Pause), Reihenfolge:`);
  const byName6 = Object.fromEntries(demo6.stats.map((x) => [x.name, x]));
  W6HW_SFX.forEach((n, i) => {
    const x = byName6[n];
    console.log(`   ${String(i + 1).padStart(2)}. ${fmt(demo6.starts[i], 2).padStart(6)} s  ${n.padEnd(15)} Dauer ${fmt(x.duration, 2)} s  Spitze ${fmt(x.peak, 2)}  Lautheit ${fmt(x.loudness, 1)} LUFS  Knoten ${x.nodes}`);
  });
  const l6 = W6HW_SFX.map((n) => byName6[n].loudness).sort((p, q) => p - q);
  const median6 = l6[Math.floor(l6.length / 2)];
  check(`Effekte Welt 6/Halloween gleich laut wie die bestehenden (Median ${fmt(median6, 1)} vs. ${fmt(refMedian, 1)} LUFS, ±2 dB)`, Math.abs(median6 - refMedian) <= 2);
  for (const n of W6HW_SFX) {
    const x = byName6[n];
    check(`sfx ${n}: Lautheit ${fmt(x.loudness, 1)} LUFS im Bereich, Spitze ${fmt(x.peak, 2)} < 0,9, Dauer ${fmt(x.duration, 2)} s, ${x.nodes} Knoten`,
      x.loudness >= loLim && x.loudness <= hiLim && x.peak < 0.9 && x.duration > 0.04 && x.duration <= 1.6 && x.nodes <= MAX_SFX_NODES);
  }

  // Ergänzte Kurs-Effekte (vorher stumme Aufrufe): eigene Hörprobe, gleiche Maßstäbe; Siegesfanfare höchstens 1,5 s
  const moreList = await sc(() => window.__audio.engine.effects.more ?? []);
  check(`Ergänzte Kurs-Effekte sind eigene Effekte (${MORE_SFX.length} Namen in engine.effects.names/more)`,
    MORE_SFX.every((n) => names.includes(n) && moreList.includes(n)));
  const demoM = await sc(sfxInPage, { order: MORE_SFX, gap: 0.6 });
  // am Ende der Hörprobe: victory in der Variante über der Musik-Fanfare (course_clear läuft) – nur Jubel-Glitzer
  const demoV = await sc(sfxInPage, { order: ['victory'], gap: 0.6, opts: { overFanfare: true } });
  writeWav(`${OUT}sfx_demo_fehlende.wav`, Buffer.concat([Buffer.from(demoM.wav, 'base64'), Buffer.from(demoV.wav, 'base64')]), demoM.sampleRate);
  console.log(`\nErgänzte Kurs-Effekte: ${OUT}sfx_demo_fehlende.wav (${fmt(demoM.seconds + demoV.seconds, 1)} s, je Effekt + 0,6 s Pause), Reihenfolge:`);
  const byNameM = Object.fromEntries(demoM.stats.map((x) => [x.name, x]));
  MORE_SFX.forEach((n, i) => {
    const x = byNameM[n];
    console.log(`   ${String(i + 1).padStart(2)}. ${fmt(demoM.starts[i], 2).padStart(6)} s  ${n.padEnd(10)} Dauer ${fmt(x.duration, 2)} s  Spitze ${fmt(x.peak, 2)}  Lautheit ${fmt(x.loudness, 1)} LUFS  Knoten ${x.nodes}`);
  });
  const v2 = demoV.stats[0];
  console.log(`   ${String(MORE_SFX.length + 1).padStart(2)}. ${fmt(demoM.seconds + demoV.starts[0], 2).padStart(6)} s  victory über course_clear (overFanfare)  Dauer ${fmt(v2.duration, 2)} s  Spitze ${fmt(v2.peak, 2)}  Lautheit ${fmt(v2.loudness, 1)} LUFS  Knoten ${v2.nodes}`);
  check(`sfx victory über course_clear: Lautheit ${fmt(v2.loudness, 1)} LUFS im Bereich, Spitze ${fmt(v2.peak, 2)} < 0,9, Dauer ${fmt(v2.duration, 2)} s ≤ 1,0, ${v2.nodes} Knoten (weniger als die Fanfare)`,
    v2.loudness >= loLim && v2.loudness <= hiLim && v2.peak < 0.9 && v2.duration > 0.04 && v2.duration <= 1.0 && v2.nodes < byNameM.victory.nodes);
  const lM = MORE_SFX.map((n) => byNameM[n].loudness).sort((p, q) => p - q);
  const medianM = lM[Math.floor(lM.length / 2)];
  check(`Ergänzte Kurs-Effekte gleich laut wie die bestehenden (Median ${fmt(medianM, 1)} vs. ${fmt(refMedian, 1)} LUFS, ±2 dB)`, Math.abs(medianM - refMedian) <= 2);
  for (const n of MORE_SFX) {
    const x = byNameM[n], maxDur = n === 'victory' ? 1.5 : 1.6;
    check(`sfx ${n}: Lautheit ${fmt(x.loudness, 1)} LUFS im Bereich, Spitze ${fmt(x.peak, 2)} < 0,9, Dauer ${fmt(x.duration, 2)} s (≤ ${fmt(maxDur, 1)}), ${x.nodes} Knoten`,
      x.loudness >= loLim && x.loudness <= hiLim && x.peak < 0.9 && x.duration > 0.04 && x.duration <= maxDur && x.nodes <= MAX_SFX_NODES);
  }

  // Bestandsaufnahme (ohne Browser): jeder im Quellcode aufgerufene Klangname hat einen eigenen Effekt
  const scan = scanSfxNames({ known: names });
  const nCalls = [...scan.calls.values()].reduce((sum, w) => sum + w.length, 0);
  console.log(`\nKlangnamen im Quellcode (tests/sfx_namen.mjs): ${scan.calls.size} Namen an ${nCalls} Stellen, ${scan.dynamic.length} dynamische Stellen`);
  check(`Jeder aufgerufene Klangname hat einen eigenen Effekt${scan.missing.length ? ` (fehlt: ${scan.missing.map((m) => `${m.name} ${m.where[0]}`).join(', ')})` : ''}`,
    scan.missing.length === 0 && nCalls >= 150);
  check(`Dynamische Klangnamen von Hand geprüft${scan.unchecked.length ? ` (ungeprüft: ${scan.unchecked.map((d) => `${d.where} ${d.expr}`).join('; ')})` : ''}, keine unbekannte Abspiel-Funktion`,
    scan.unchecked.length === 0 && scan.unknownFns.length === 0);
}

// Sequencer läuft weiter ohne Fehler
if (BROWSER) {
  await page.waitForTimeout(1000);
  check('Keine Audio-Fehler in der Konsole', errors.length === 0);
  await browser.close();
}
stop();
process.exit(summary(errors) ? 0 : 1);
