// Zentrale Spiel- und Physik-Konfiguration.
// Alle Werte in Pixel bzw. Pixel/Sekunde (bei 480x270, 16px-Tiles).

export const GAME = {
  width: 480,
  height: 270,
  tile: 16,
};

export const PHYSICS = {
  // Grundschwerkraft (Welt). Wird beim Fallen zusätzlich verstärkt (fallMultiplier).
  gravity: 1000,
  // Maximale Fallgeschwindigkeit ohne Schirm
  maxFallSpeed: 380,
};

export const PIP = {
  // --- Hitbox (im 20x20-Frame) ---
  bodyWidth: 10,
  bodyHeight: 14,
  bodyOffsetX: 5,
  bodyOffsetY: 6,

  // --- Laufen ---
  runSpeed: 125,          // Höchstgeschwindigkeit am Boden
  groundAccel: 900,       // Beschleunigung am Boden
  groundDecel: 1300,      // Abbremsen ohne Eingabe (Boden)
  turnBoost: 1.6,         // Faktor beim Richtungswechsel (schnelles Umdrehen)
  airAccel: 650,          // Beschleunigung in der Luft
  airDecel: 250,          // Abbremsen in der Luft ohne Eingabe (Schwung bleibt)
  airMaxSpeed: 135,       // Luft darf etwas schneller sein als Boden

  // --- Springen ---
  jumpVelocity: 345,      // Absprunggeschwindigkeit (positiv notiert, wirkt nach oben)
  jumpCutVelocity: 150,   // Bei frühem Loslassen wird die Aufwärtsgeschw. hierauf gekappt
  fallMultiplier: 1.3,    // Schwerkraft-Faktor beim Fallen (knackigeres Gefühl)
  apexGravityMult: 0.7,   // Weniger Schwerkraft nahe dem Scheitelpunkt ("Hang time")
  apexThreshold: 40,      // |vy| unter diesem Wert gilt als Scheitelpunkt
  coyoteTime: 100,        // ms nach Verlassen der Kante, in denen noch gesprungen werden darf
  jumpBuffer: 120,        // ms, die ein Sprungbefehl vorgemerkt bleibt

  // --- Blätterschirm (Gleiten) ---
  glideFallSpeed: 42,     // Ziel-Sinkgeschwindigkeit beim Gleiten
  glideOpenLerp: 14,      // Wie schnell die Sinkgeschw. auf den Zielwert geht (1/s)
  glideAccel: 420,        // Horizontale Beschleunigung beim Gleiten
  glideMaxSpeed: 140,     // Horizontale Höchstgeschwindigkeit beim Gleiten
  glideDecel: 60,         // Sehr wenig Luftwiderstand beim Gleiten
  glideMinFallSpeed: 20,  // Gleiten erst ab dieser Fallgeschwindigkeit möglich (nicht beim Aufstieg)

  // --- Sturzflug ---
  diveAccel: 2200,        // Wie schnell der Sturzflug Fahrt aufnimmt
  diveMaxSpeed: 420,      // Höchstgeschwindigkeit im Sturzflug
  diveSteerAccel: 300,    // Seitliche Steuerbarkeit im Sturzflug
  diveMinDepth: 24,       // Mindest-Sturztiefe für einen Aufschwung

  // --- Aufschwung nach Sturzflug ---
  swoopEfficiency: 0.8,   // Anteil der Sturztiefe, der in Höhe zurückgewonnen wird
  swoopMaxVelocity: 360,  // Obergrenze der Aufwärtsgeschwindigkeit nach dem Sturz
  swoopSpeedBoost: 55,    // Horizontaler Schub in Blickrichtung beim Hochziehen
  swoopMaxSpeed: 200,     // Horizontale Obergrenze nach dem Aufschwung
  swoopAirDecel: 120,     // Abbremsen während des Aufschwungs

  // --- Sonstiges ---
  landDustMinSpeed: 120,  // Ab dieser Fallgeschwindigkeit gibt es Staub beim Landen
  hardLandSpeed: 300,     // Ab hier gibt es Vibration/größeren Staub
};

export const CAMERA = {
  lerpX: 0.12,
  lerpY: 0.10,
  lookAhead: 40,          // Vorausschauen in Laufrichtung (Pixel)
  lookAheadLerp: 0.06,    // Wie weich sich der Blick verschiebt
  deadzoneWidth: 20,
  deadzoneHeight: 40,
};

export const INPUT = {
  swipeThreshold: 28,     // Pixel Fingerbewegung für Wisch nach unten
  swipeTime: 220,         // ms, in denen der Wisch passieren muss
  stickRadius: 28,        // Radius des virtuellen Sticks (CSS-Pixel im Spiel-Maßstab)
  stickDeadzone: 0.18,
};

export const DEBUG = {
  startEnabled: false,
};
