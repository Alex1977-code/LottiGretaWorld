// Funkenblüte (Bauplan: „Feuerbälle, die springen“). Aktion wirft einen Feuerball (Entität 'fireball',
// entities/kinds/fireball.js) in Blickrichtung: er hüpft über den Boden, besiegt Gegner, zündet Kickbomben,
// verschwindet an Wänden/nach 1,5 s. Höchstens 2 gleichzeitig, 0,18 s zwischen zwei Würfen. Die Kostümfarbe
// übernimmt der Avatar über proxy.course.power === 'funken'; beim Wurf meldet HeroRig den Zustand 'throw'.

export const MAX_FIREBALLS = 2;

export const POWERS = {
  funken: {
    label: 'Funkenblüte',
    icon: 0xff5a2a,
    onAction(player) {
      const level = player.level;
      if (!level.hasKind('fireball') || player.fireCooldown > 0) return false;
      if (player.mode !== 'ground' && player.mode !== 'air') return false;
      if (player.state === 'groundpound' || player.state === 'dive' || player.state === 'hurt') return false;
      let n = 0;
      for (const e of level.entities) if (e.kind === 'fireball' && !e.removed && e.owner === player) n++;
      if (n >= MAX_FIREBALLS) return false;
      player.fireCooldown = 0.18;
      player.throwTime = 0.2; player.throwDur = 0.2;
      const f = player.facingVec();
      const y = player.pos.y + player.half.y * 1.1 - 0.2;
      level.spawn('fireball', { pos: [player.pos.x + f.x * 0.55, y, player.pos.z + f.z * 0.55], dir: [f.x, f.z], owner: player });
      level.sfx('fireball');
      return true;
    },
  },
};
