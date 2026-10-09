// Sonder-Bausteine, die als Entität leben, auch in LEVEL.segments verwendbar machen ({ type: 'pow', … } ≙
// { kind: 'pow', … } in items/blocks). Parameter: siehe die jeweilige Datei unter entities/kinds/.
//   warpbox, task (warpbox.js) · pow (pow.js) · lantern (lantern.js) · starring, timering, pswitch (challenge.js)
//   bunny (bunny.js) · endlessblock, rouletteblock (specialblocks.js) · crate, chest (crate.js)
//   spotter, pixelegg (spotter.js) · itemtree (itemtree.js) · raft, speedwave (raft.js)
const KINDS = ['warpbox', 'task', 'pow', 'lantern', 'starring', 'timering', 'pswitch', 'bunny', 'endlessblock', 'rouletteblock', 'crate', 'chest', 'spotter', 'pixelegg', 'itemtree', 'raft', 'speedwave'];

export const TYPES = Object.fromEntries(KINDS.map((k) => [k, (level, spec) => level.spawn(k, spec)]));
