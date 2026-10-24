// Welt-5-Gimmicks, die als Entität leben (entities/kinds/w5_gimmicks.js), auch in LEVEL.segments verwendbar
// ({ type: 'schluesselmuenze', … } ≙ { kind: 'schluesselmuenze', … } in items/blocks/enemies). Parameter siehe dort:
//   schluesselmuenze · schiebekugel
// Mehrere Schlüsselmünzen auf einmal: { type: 'schluesselmuenzen', group, onAll, of, coins: [[x, y, z], …] }.
const KINDS = ['schluesselmuenze', 'schiebekugel'];

export const TYPES = {
  ...Object.fromEntries(KINDS.map((k) => [k, (level, spec) => level.spawn(k, spec)])),
  schluesselmuenzen: (level, spec) => (spec.coins ?? []).map((pos, i) => level.spawn('schluesselmuenze', { group: spec.group, of: spec.of, onAll: i === 0 ? spec.onAll : undefined, pos })),
};
