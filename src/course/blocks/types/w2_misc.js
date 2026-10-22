// Welt-2-Gimmicks, die als Entität leben (entities/kinds/w2_gimmicks.js), auch in LEVEL.segments verwendbar
// ({ type: 'roter_ring', … } ≙ { kind: 'roter_ring', … } in items/blocks). Parameter siehe dort:
//   kristallwand · antipp_block · antipp_muenze · wachs_block · roter_ring · rote_muenze · tuer · holz_silhouette ·
//   goldschalter
const KINDS = ['kristallwand', 'antipp_block', 'antipp_muenze', 'wachs_block', 'roter_ring', 'rote_muenze', 'tuer', 'holz_silhouette', 'goldschalter'];

export const TYPES = Object.fromEntries(KINDS.map((k) => [k, (level, spec) => level.spawn(k, spec)]));
