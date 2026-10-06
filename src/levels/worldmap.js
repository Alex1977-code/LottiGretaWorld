// Weltkarte: Level-Punkte und Pfade. Positionen in Karten-Pixeln (480x270).
// Ein Pfad wird frei, wenn das Start-Level über den passenden Ausgang geschafft wurde.

export const WORLD = {
  name: 'Welt 1 – Herbstwald',
  nodes: [
    { key: 'level1', x: 70, y: 200 },
    { key: 'level2', x: 170, y: 150 },
    { key: 'level3', x: 290, y: 190 },
    { key: 'level4', x: 400, y: 110 },
  ],
  // points: Zwischenpunkte des Pfads (ohne Start/Ziel)
  edges: [
    { from: 'level1', to: 'level2', exit: 'normal', points: [{ x: 110, y: 195 }, { x: 140, y: 165 }] },
    { from: 'level2', to: 'level3', exit: 'normal', points: [{ x: 210, y: 160 }, { x: 250, y: 190 }] },
    { from: 'level3', to: 'level4', exit: 'normal', points: [{ x: 330, y: 170 }, { x: 370, y: 130 }] },
    // Geheimpfad: Level 1 → Level 3 (über die Baumwipfel)
    { from: 'level1', to: 'level3', exit: 'secret', points: [{ x: 120, y: 240 }, { x: 200, y: 245 }, { x: 260, y: 225 }] },
  ],
  start: 'level1',
};
