// Maße und Zellarten der 3D-Welt (von Terrain, Props und Szenerie gemeinsam genutzt).

export const EXT_X = 12;        // seitliche Fortsetzung des Bodens (Tiles)
export const EXT_Y = 3;         // Felsschicht unter dem Level (Zeilen)
export const Z_BACK = -5;       // Rückseite des Bodens
export const Z_FRONT = 1;       // vordere Kante des Bodens (Spielebene Z = 0 liegt vorn-mittig)
export const CHUNK = 32;        // Abschnittsbreite fürs Frustum-Culling (Tiles)
export const GRASS_LIFT = 0.03; // Grasdecke ragt so weit über die Tile-Oberkante

export const CELL = { EMPTY: 0, GROUND: 1, CAVE: 2, ROCK: 3, BRICK: 4, BRICK_ALT: 5, PLATFORM: 6, DECO: 7 };
