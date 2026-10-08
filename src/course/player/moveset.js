// Bewegungswerte der Spielfigur im Kurs-Modus (Meter, Sekunden). Abgestimmt nach dem Bauplan
// („kleines, präzises Bewegungsset“): schnelles Anlaufen, knackige Sprünge mit kurzer Schwebe am
// Scheitel, deutlich schwereres Fallen, kurze Bremswege. Sprunghöhen werden als Höhe angegeben und in
// Absprunggeschwindigkeiten umgerechnet (v = √(2·g·h)), damit die Tabelle direkt lesbar bleibt.
// Heldinnen-Unterschiede (HERO_VARIANTS): Lotti Sprunghöhe ×1,08; Greta Tempo ×1,12, Luftsteuerung ×1,4,
// Fallschwerkraft ×0,75 (springt weiter).

export const MOVE = {
  // --- Laufen ---
  walk: 6.0,              // m/s (Stick / Pfeiltasten)
  run: 10.0,              // m/s (Rennen gehalten bzw. Stick ≥ 85 %)
  accel: 34,              // m/s² bis Gehtempo
  accelRun: 13,           // m/s² vom Geh- zum Renntempo (Rennen „baut sich auf“)
  decel: 42,              // m/s² ohne Eingabe
  overDecel: 9,           // m/s² Abbau von Übertempo (Boost-Pfeil, Rennen losgelassen)
  turnSlow: 26,           // rad/s Drehung bei langsamem Tempo
  turnFast: 9,            // rad/s Drehung bei Renntempo
  skidMin: 5.0,           // ab diesem Tempo löst eine Umkehr (> 125°) Schleudern aus
  skidDecel: 46,          // m/s² Bremsen beim Schleudern
  iceAccel: 6,            // m/s² auf Eis (Beschleunigen und Bremsen)

  // --- Springen ---
  gUp: 27,                // m/s² Schwerkraft beim Steigen mit gehaltener Taste
  gRelease: 38,           // m/s² Schwerkraft beim Steigen nach Loslassen (variable Höhe: Tipp ≈ 2,5 m)
  gFall: 50,              // m/s² Schwerkraft beim Fallen
  apexBand: 1.6,          // |vy| unter diesem Wert: Scheitel …
  apexMult: 0.6,          // … mit verringerter Schwerkraft (Schwebegefühl)
  maxFall: 24,            // m/s Endgeschwindigkeit
  jump1: 3.5,             // m Sprunghöhe im Stand (gehalten); kurz getippt ≈ 2,5 m
  jump1Run: 0.05,         // m zusätzliche Höhe je m/s Anlauf (Renntempo → ≈ 4 m)
  jump2: 4.5,             // m zweiter Sprung der Kette
  jump3: 5.6,             // m Dreifachsprung (mit Salto)
  chainWindow: 0.22,      // s nach der Landung für den nächsten Kettensprung
  chainMinSpeed: 3.5,     // m/s Mindesttempo für Kettensprünge
  backflip: 5.0,          // m Rückwärtssalto (fest, nicht variabel)
  backflipBack: 2.6,      // m/s nach hinten
  sideflip: 4.6,          // m Seitwärtssalto
  sideflipSpeed: 3.2,     // m/s in neue Richtung
  longjumpSpeed: 12.0,    // m/s Weitsprung (mindestens; aus höherem Tempo ×1,1, max. 14)
  longjumpVy: 8.6,        // m/s Absprung nach oben
  gLong: 30,              // m/s² Schwerkraft im Weitsprung (flache, lange Kurve ≈ 7 m)
  airAccel: 15,           // m/s² Luftsteuerung (× airSpeedMult der Heldin)
  airDrag: 1.5,           // m/s² Luftwiderstand ohne Eingabe
  airTurn: 7,             // rad/s Drehung in der Luft
  coyote: 0.1,            // s Sprung noch möglich nach Verlassen einer Kante
  buffer: 0.13,           // s Sprung vor der Landung vorgemerkt
  landTime: 0.08,         // s Landepose (Bewegung bleibt frei)

  // --- Wand ---
  wallSlide: 3.4,         // m/s maximale Rutschgeschwindigkeit an der Wand
  wallJump: 3.2,          // m Wandsprung-Höhe
  wallJumpSpeed: 7.5,     // m/s von der Wand weg
  wallJumpLock: 0.22,     // s ohne Luftsteuerung nach dem Wandsprung
  wallCoyote: 0.1,        // s Wandsprung noch nach Ablösen
  climbSpeed: 4.6,        // m/s Klettern mit Krallen-Anzug
  climbTime: 2.0,         // s Kletterdauer je Bodenkontakt
  ledgeHop: 7.5,          // m/s Hüpfer über die Mauerkante

  // --- Stampfen, Ducken, Rutschen ---
  poundSpin: 0.22,        // s Drehung in der Luft vor dem Sturz
  poundSpeed: 26,         // m/s Fallgeschwindigkeit
  poundLand: 0.22,        // s Landestarre
  slideMin: 3.0,          // m/s ab diesem Tempo wird Ducken zum Rutschen
  slideDecel: 6,          // m/s² Rutschen auf ebenem Boden
  slideSlopeAccel: 22,    // m/s² hangabwärts beim Rutschen (× Neigung)
  slideTurn: 2.2,         // rad/s Lenken beim Rutschen
  slopeSlide: 0.75,       // tan(Neigung) ab der man ohne Ducken abrutscht (≈ 37°)
  crouchHalf: 0.3,        // halbe Höhe geduckt (groß)

  // --- Krallen-Sturzflug ---
  diveSpeed: 11,          // m/s vorwärts
  diveVy: -10,            // m/s abwärts

  // --- Bohnenranke, Schwimmen ---
  stalkSpeed: 4.4,        // m/s auf und ab
  stalkTurn: 2.8,         // rad/s um die Ranke
  swimSpeed: 4.5,         // m/s
  swimAccel: 10,          // m/s²
  swimStroke: 5.5,        // m/s Schwimmzug nach oben
  swimExit: 10.5,         // m/s Sprung aus dem Wasser
  swimSink: 3.5,          // m/s Abtauchen (Ducken)
  buoyancy: 10,           // m/s² Auftrieb unter der Oberfläche

  // --- Treffer ---
  invuln: 1.5,            // s unverwundbar nach Treffer (Blinken)
  hurtTime: 0.35,         // s ohne Steuerung
  stompBounce: 9.5,       // m/s Abprall vom Gegner
  stompBounceHeld: 13,    // m/s Abprall mit gehaltener Sprungtaste
};

/** Hitbox (Halbmaße): groß 0,6 × 0,95 × 0,6, klein 0,6 × 0,65 × 0,6. */
export const HITBOX = { big: { x: 0.3, y: 0.475, z: 0.3 }, small: { x: 0.3, y: 0.325, z: 0.3 } };

/** Absprunggeschwindigkeit für eine Sprunghöhe bei Schwerkraft g. */
export const vFor = (height, g = MOVE.gUp) => Math.sqrt(2 * g * height);
