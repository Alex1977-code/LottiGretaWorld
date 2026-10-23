// Welt-4-Gimmicks, die als Entität leben (entities/kinds/w4_gimmicks.js), auch in LEVEL.segments verwendbar
// ({ type: 'stachelstange', … } ≙ { kind: 'stachelstange', … } in items/blocks/enemies). Parameter siehe dort:
//   stachelstange · roulette_block · sternring · sternmuenze
const KINDS = ['stachelstange', 'roulette_block', 'sternring', 'sternmuenze'];

export const TYPES = Object.fromEntries(KINDS.map((k) => [k, (level, spec) => level.spawn(k, spec)]));
