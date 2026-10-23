// Welt-3-Gimmicks, die als Entität leben (entities/kinds/w3_gimmicks.js, w3_snow.js), auch in LEVEL.segments verwendbar
// ({ type: 'schaltblock', … } ≙ { kind: 'schaltblock', … } in items/blocks). Parameter siehe dort:
//   schaltblock · buecherregal · bilderrahmen · zielmast_spuk · spuk_tuer · wasserschalter · goldring · wandriss ·
//   kurbelrad · schneeblock · eisblock · eiszapfen · schneehaufen · tanne
const KINDS = ['schaltblock', 'buecherregal', 'bilderrahmen', 'zielmast_spuk', 'spuk_tuer', 'wasserschalter', 'goldring', 'wandriss',
  'kurbelrad', 'schneeblock', 'eisblock', 'eiszapfen', 'schneehaufen', 'tanne'];

export const TYPES = Object.fromEntries(KINDS.map((k) => [k, (level, spec) => level.spawn(k, spec)]));
