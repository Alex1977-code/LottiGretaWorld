// Gerüst für Funkenblüte, Riesentrank und Funkelstern. Die Wirkungen sind bewusst einfach gehalten; der
// Power-up-Agent ersetzt/ergänzt sie (eigene Dateien unter player/powers/ überschreiben nicht – Namen sind
// eindeutig; zum Verfeinern diese Datei bearbeiten).
//  - funken: Aktion wirft einen Feuerball, sobald es die Entität 'fireball' gibt (entities/kinds/).
//  - riese:  10 s groß (Darstellung ×2,4), zerbricht `breakable`-Formen und besiegt Gegner bei Berührung.
//  - stern:  10 s unverwundbar, Berührung besiegt Gegner.

export const POWERS = {
  funken: {
    label: 'Funkenblüte',
    icon: 0xff5a2a,
    onAction(player) {
      const level = player.level;
      if (!level.hasKind('fireball')) return false;
      if (player.fireCooldown > 0) return false;
      player.fireCooldown = 0.3;
      const f = player.facingVec();
      level.spawn('fireball', { pos: [player.pos.x + f.x * 0.6, player.pos.y + 0.6, player.pos.z + f.z * 0.6], dir: [f.x, f.z], owner: player });
      level.sfx('fireball');
      return true;
    },
  },
  riese: {
    label: 'Riesentrank',
    icon: 0xc04cff,
    duration: 10,
    scale: 2.4,
    onGain(player) { player.level.sfx('powerup'); },
    update(player) {
      // Alles Zerbrechliche in Reichweite zertrümmern
      const c = player.center();
      const hits = player.world.overlapAABB({ x: c.x, y: c.y + 0.6, z: c.z }, { x: 1.0, y: 1.4, z: 1.0 });
      for (const s of hits) if (s.breakable && s.owner?.onHit) s.owner.onHit('mega', player);
    },
    onTouchEntity(player, entity) { entity.onHit?.('mega', player); return 'none'; },
  },
  stern: {
    label: 'Funkelstern',
    icon: 0xfff04a,
    duration: 10,
    invulnerable: true,
    onTouchEntity(player, entity) { entity.onHit?.('star', player); return 'none'; },
  },
};
