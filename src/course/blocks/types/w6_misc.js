// Welt-6-Entitäts-Gimmicks auch als `type` in segments (Präzisierung Motor und Bausteine Welt 6): stachelkugel,
// stachelkugel_quelle, wurfball, zielscheibe, pilz_maske, riesenfrageblock – Felder wie die gleichnamige Entität
// (entities/kinds/w6_gimmicks.js). Mehrere auf einmal: { type: 'wurfball', balls: [[x, y, z], …] } bzw. für Zielscheiben
// { type: 'zielscheibe', group, onAll, targets: [{ pos, yaw }, …] }.

const spawnAs = (kind, listKey) => (level, spec) => {
  const { type, [listKey]: list, ...rest } = spec;
  if (Array.isArray(list)) {
    let first = null;
    for (const it of list) {
      const one = Array.isArray(it) ? { ...rest, pos: it } : { ...rest, ...it };
      // id nur am ersten Eintrag (sonst überschreiben sich die Namen); onAll nur einmal je Gruppe
      if (first) { delete one.id; if (kind === 'zielscheibe') delete one.onAll; }
      const e = level.spawn(kind, one);
      first ??= e;
    }
    return first;
  }
  return level.spawn(kind, rest);
};

export const TYPES = {
  stachelkugel: spawnAs('stachelkugel', 'balls'),
  stachelkugel_quelle: spawnAs('stachelkugel_quelle', 'list'),
  wurfball: spawnAs('wurfball', 'balls'),
  zielscheibe: spawnAs('zielscheibe', 'targets'),
  pilz_maske: spawnAs('pilz_maske', 'list'),
  riesenfrageblock: spawnAs('riesenfrageblock', 'blocks'),
};
