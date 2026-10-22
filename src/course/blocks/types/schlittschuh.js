// Baustein `schlittschuh` (Präzisierung Motor Welt 3): Schlittschuh als Entität (entities/kinds/schlittschuh.js) –
// { type: 'schlittschuh', pos, yaw?, respawn?: 4, id?, hidden? } ≙ { kind: 'schlittschuh', … }.
// Als Power-up-Name auch in Blöcken/Beute/Aktionen: content: 'schlittschuh', drop: 'schlittschuh', { power: 'schlittschuh' }.

export const TYPES = { schlittschuh: (level, spec) => level.spawn('schlittschuh', spec) };
