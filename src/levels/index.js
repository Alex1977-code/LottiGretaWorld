// Alle Levels: Schlüssel → Builder-Funktion (liefert Tiled-JSON).
import { buildTestLevel } from './testlevel.js';
import { buildLevel1 } from './level1.js';
import { buildGeneratedLevel } from './generated.js';

export const LEVELS = {
  test: { build: buildTestLevel, name: 'Testlevel', world: 1 },
  level1: { build: buildLevel1, name: 'Herbstwald', world: 1 },
  level2: { build: () => buildGeneratedLevel('pilzhain', { name: 'Pilzhain', width: 240, pits: 0.3, platforms: 0.6, enemies: 0.6 }), name: 'Pilzhain', world: 1 },
  level3: { build: () => buildGeneratedLevel('wipfelpfad', { name: 'Wipfelpfad', width: 280, pits: 0.5, platforms: 0.8, enemies: 0.5, secret: true }), name: 'Wipfelpfad', world: 1 },
  level4: { build: () => buildGeneratedLevel('bachlauf', { name: 'Bachlauf', width: 300, pits: 0.7, platforms: 0.5, enemies: 0.7 }), name: 'Bachlauf', world: 1 },
};

export const DEFAULT_LEVEL = 'level1';
