// Alle Levels: Schlüssel → Builder-Funktion (liefert Tiled-JSON).
import { buildTestLevel } from './testlevel.js';
import { buildLevel1 } from './level1.js';

export const LEVELS = {
  test: { build: buildTestLevel, name: 'Testlevel', world: 1 },
  level1: { build: buildLevel1, name: 'Herbstwald', world: 1 },
};

export const DEFAULT_LEVEL = 'level1';
