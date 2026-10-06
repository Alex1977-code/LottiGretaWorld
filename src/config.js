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
  // Absolute Obergrenze der Physik (Sturzflug, Stampfsprung)
  hardMaxSpeed: 700,
};

export const LOTTI = {
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

export const ENEMIES = {
  walkerSpeed: 30,          // Laufkäfer: Laufgeschwindigkeit
  hopperIdleTime: 900,      // Pilz: Wartezeit zwischen Sprüngen (ms)
  hopperSquatTime: 220,     // Pilz: Ducken vor dem Sprung (ms)
  hopperJumpVelocity: 230,  // Pilz: Absprunggeschwindigkeit
  hopperSpeedX: 55,         // Pilz: horizontale Sprunggeschwindigkeit
  hopperSightRange: 140,    // Pilz: ab dieser Entfernung springt er Richtung Lotti
  stompTolerance: 10,       // Pixel, die Lottis Füße unter der Gegner-Oberkante sein dürfen
  stompBounce: 210,         // Abprall nach Draufspringen
  stompBounceHeld: 320,     // Abprall, wenn Sprungtaste gehalten wird
  hitstop: 50,              // Freeze-Frame beim Besiegen (ms)
};

export const GRETA = {
  bodyWidth: 14,          // Hitbox Lotti+Greta beim Huckepack-Tragen
  bodyHeight: 26,
  bodyOffsetX: 3,
  bodyOffsetY: 6,
  freeBodyWidth: 12,      // Hitbox Greta allein
  freeBodyHeight: 18,
  walkSpeed: 22,          // Umherlaufen ohne Reiter
  idleTime: 1400,         // Pause zwischen Spaziergängen (ms)
  fleeSpeed: 115,         // Fluchtgeschwindigkeit
  fleeTime: 3000,         // ms Flucht, danach verschwindet Greta
  fleeHopVelocity: 130,   // kleine Panik-Hüpfer
  fleeHopInterval: 260,
  mountCooldown: 600,     // ms nach der Flucht, bevor Lotti wieder aufsteigen kann
  mountHop: 160,          // kleiner Hüpfer beim Aufsteigen
  throwOffVelocityX: 90,  // Lotti wird beim Treffer abgeworfen
  throwOffVelocityY: 240,
  // Rote Beere: Feuerball
  fireSpeed: 230,
  fireLift: 40,           // leichter Bogen nach oben
  fireBounce: 0.55,
  fireCooldown: 320,      // ms
  fireLifetime: 1300,     // ms
  // Blaue Beere: Schweben
  hoverTime: 3000,        // ms Schwebezeit pro Flug (füllt sich am Boden auf)
  hoverLerp: 16,          // wie schnell das Sinken gestoppt wird (1/s)
  hoverSink: 6,           // minimale Sinkgeschwindigkeit beim Schweben
  // Gelbe Beere: Stampfsprung
  stompSpeed: 540,
  stompRadius: 40,        // Gegner in diesem Umkreis werden erwischt
  stompShake: 0.012,
  stompLock: 160,         // ms Steuer-Sperre nach dem Aufprall
};

export const DAMAGE = {
  invincibleTime: 1500,     // Unverwundbarkeit nach Treffer (ms)
  knockbackX: 150,
  knockbackY: 220,
  controlLock: 220,         // ms ohne Steuerung nach Treffer
  blinkInterval: 80,
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
  swipeTime: 300,         // ms, in denen der Wisch passieren muss
  stickRadius: 28,        // Radius des virtuellen Sticks (CSS-Pixel im Spiel-Maßstab)
  stickDeadzone: 0.15,
};

export const DEBUG = {
  startEnabled: false,
};
