// Farbpalette des Spiels (kräftige 16-Bit-Anmutung).
// Buchstaben werden in den Pixel-Art-Strings verwendet.

export const PAL = {
  '.': null,        // transparent
  // Figuren (Lotti & Greta)
  'B': '#4a230a',   // Umriss dunkelbraun
  'b': '#7a3f12',   // Stiefel braun
  'R': '#d8333a',   // Haarschleife rot
  '1': '#b5893a',   // Lotti: Haar dunkelblond
  '2': '#dcb45e',   // Lotti: Haar Glanz
  '3': '#86602a',   // Lotti: Haar Schatten
  '4': '#f6d3ad',   // Haut
  '5': '#dfa884',   // Haut Schatten
  '6': '#3f7fc4',   // Lotti: Kleid blau
  '7': '#2a5a93',   // Lotti: Kleid dunkel
  '8': '#f3df96',   // Greta: Haar hellblond
  '9': '#fff6cf',   // Greta: Haar Glanz
  '0': '#d8ba6c',   // Greta: Haar Schatten
  'O': '#d9742a',   // (frei) orange
  'o': '#f3b36a',   // (frei) hell-orange
  'H': '#a7b8c8',   // (frei) hellgrau
  'h': '#5c6b7c',   // (frei) dunkelgrau
  'W': '#ffffff',   // Auge weiß
  'K': '#120a06',   // Pupille
  // Blätterschirm
  'L': '#c7471f',   // Blatt rot-orange
  'l': '#e8862c',   // Blatt hell
  'G': '#6d8a2b',   // Blattstiel grün
  'D': '#7a2a12',   // Blatt Umriss
  // Tiles
  'g': '#74a832',   // Gras hell
  'q': '#4f7d24',   // Gras dunkel
  'd': '#8d5a2b',   // Erde
  'e': '#6b3f1c',   // Erde dunkel
  'f': '#a86f3a',   // Erde hell (Steinchen)
  'r': '#c9542a',   // Herbstblatt rot
  'y': '#e9a53a',   // Herbstblatt gelb
  's': '#8c8f99',   // Stein hell
  't': '#5f626b',   // Stein dunkel
  'u': '#b3b6bf',   // Stein Glanz
  'w': '#9a6b3a',   // Holz
  'v': '#6e4a25',   // Holz dunkel
  'x': '#c9955c',   // Holz hell
  // Gegner: Laufkäfer
  'E': '#6e1b28',   // Panzer dunkel
  'c': '#c2383f',   // Panzer rot
  'n': '#ec7a72',   // Panzer Glanz
  'k': '#1c1a26',   // Beine/Kopf
  // Gegner: hüpfender Pilz
  'M': '#4a3580',   // Hut dunkel
  'm': '#6f52b8',   // Hut violett
  'Y': '#f3d35a',   // Punkte gelb
  'S': '#e8d9b8',   // Stiel hell
  'T': '#c9b68f',   // Stiel dunkel
  // Greta (trägt Lotti huckepack)
  'V': '#3b2460',   // (frei) dunkelviolett
  'v': '#8a4fc9',   // (frei) violett
  'Z': '#b47fe6',   // Gretas Kleid (wird je nach Beeren-Kraft umgefärbt)
  'z': '#d9b8f0',   // Kleid-Glanz / Beeren-Glanz
  'A': '#e2c8f5',   // (frei) helles Lila
  'I': '#6ea8ff',   // Zauberflügel hellblau (blaue Beere)
  // Feuerball
  'F': '#ff8c2a',   // Feuer orange
  'f': '#ffd36a',   // Feuer gelb
  // Gold (Münzen, Schlüssel)
  'J': '#f2c230',   // Gold
  'j': '#fff2a8',   // Gold Glanz
  'i': '#a8761a',   // Gold dunkel
  // HUD
  'P': '#e8405a',   // Herz
  'p': '#ff9fb0',   // Herz Glanz
  'Q': '#4a1a2a',   // Herz leer
};

// Himmel/Hintergrund-Farben für den Herbstwald
export const SKY = {
  top: '#2b3a7a',
  bottom: '#f0a06a',
  farHills: '#6a4a8a',
  midTrees: '#8a4a5a',
  nearBush: '#5a3a2a',
  nearLeaf: '#b85a2a',
};

// Farben der Beeren-Kräfte (ersetzen 'Z'/'z' in Gretas Kleid und in den Beeren)
export const POWER_COLORS = {
  none:   { Z: '#b47fe6', z: '#d9b8f0' },
  red:    { Z: '#e0393f', z: '#ff8a8a' },
  blue:   { Z: '#3a78e0', z: '#9cc4ff' },
  yellow: { Z: '#f0bd3a', z: '#fff0a0' },
};
