// Gemeinsame Farben: nur noch die Beeren-Kräfte (färben Pflaumes Flecken, Beeren und HUD-Symbol).
// Alle Spritesheets und das Tileset bringen ihre eigene Palette mit (src/gfx/sprites/*.js, tiles.js).

// Ersetzen 'Z' (Grundton) und 'z' (Glanz) in den Varianten-Frames
export const POWER_COLORS = {
  none:   { Z: '#b47fe6', z: '#d9b8f0' },
  red:    { Z: '#e0393f', z: '#ff8a8a' },
  blue:   { Z: '#3a78e0', z: '#9cc4ff' },
  yellow: { Z: '#f0bd3a', z: '#fff0a0' },
};
