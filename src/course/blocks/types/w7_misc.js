// Welt-7-Entitäts-Gimmicks auch als `type` in segments (Präzisierung Motor und Bausteine Welt 7): lavablase, druckknopf,
// kiste_wasser – Felder wie die gleichnamige Entität (entities/kinds/w7_gimmicks.js). Mehrere auf einmal:
// { type: 'lavablase', list: [[x, y, z], { pos, phase }, …], …gemeinsame Felder } bzw. { type: 'kiste_wasser', kisten: [...] }.
//   Beispiel: { type: 'lavablase', height: 4, period: 3, list: [{ pos: [-3, 0, -50], phase: 0 }, { pos: [3, 0, -50], phase: 0.5 }] }

const spawnAs = (kind, listKey) => (level, spec) => {
  const { type, [listKey]: list, ...rest } = spec;
  if (Array.isArray(list)) {
    let first = null;
    for (const it of list) {
      const one = Array.isArray(it) ? { ...rest, pos: it } : { ...rest, ...it };
      if (first && !Array.isArray(it) && it.id === undefined) delete one.id;
      else if (first && Array.isArray(it)) delete one.id;
      const e = level.spawn(kind, one);
      first ??= e;
    }
    return first;
  }
  return level.spawn(kind, rest);
};

export const TYPES = {
  lavablase: spawnAs('lavablase', 'list'),
  druckknopf: spawnAs('druckknopf', 'list'),
  kiste_wasser: spawnAs('kiste_wasser', 'kisten'),
};
