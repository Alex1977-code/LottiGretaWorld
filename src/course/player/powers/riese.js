// Riesentrank (Bauplan: „10 s riesig, zerstört alles“). 10 s lang ×2,4 groß (Darstellung; die Kollisions-Hülle
// bleibt, damit die Figur nicht in der Geometrie hängen bleibt), unverwundbar. Ein Wirkbereich so groß wie der
// Riesenkörper (2 × 2,5 × 2 m, leicht nach vorn) zertrümmert alle Formen mit `breakable` oder `mega` (Ziegel,
// Kristall, graue Steinblöcke, ?-Blöcke über onHit('mega')), zerschlägt Stampfsteine und besiegt jeden Gegner,
// den er berührt. Die Kamera zoomt heraus (camZoom, CameraRig). Am Ende: Rückverwandlung (Geräusch, Funken,
// 1 s Blinken/unverwundbar).

const BODY = { x: 1.0, y: 1.2, z: 1.0 };   // Halbmaße; Unterkante 0,1 m über den Füßen (der Boden bleibt heil)

export const POWERS = {
  riese: {
    label: 'Riesentrank',
    icon: 0xc04cff,
    duration: 10,
    scale: 2.4,
    camZoom: 1.4,
    invulnerable: true,
    onGain(player) {
      player.level.shake(0.35);
      player.level.effects?.sparks(player.center(), 20);
    },
    update(player) {
      if (player.dead) return;
      const f = player.facingVec();
      const c = { x: player.pos.x + f.x * 0.3, y: player.pos.y + 0.1 + BODY.y, z: player.pos.z + f.z * 0.3 };
      const done = new Set();
      let broke = false;
      for (const s of player.world.overlapAABB(c, BODY)) {
        const o = s.owner;
        if (!o?.onHit || done.has(o)) continue;
        if (!(s.breakable || s.mega || o.enemy || String(s.tag ?? '').startsWith('block:'))) continue;
        done.add(o);
        o.onHit('mega', player, s);
        broke = true;
      }
      // Gegner im Riesenkörper
      for (const e of player.level.entities) {
        if (!e.enemy || !e.alive || e.removed || e.defeated || e.touch === false || done.has(e)) continue;
        if (Math.abs(e.pos.x - c.x) > BODY.x + e.half.x || Math.abs(e.pos.z - c.z) > BODY.z + e.half.z) continue;
        if (Math.abs(e.pos.y + e.half.y - c.y) > BODY.y + e.half.y) continue;
        e.onHit?.('mega', player);
      }
      if (broke) player.level.shake(0.15);
    },
    onTouchEntity(player, entity) { entity.onHit?.('mega', player); return 'none'; },
    onLose(player) {
      player.level.sfx('powerdown');
      player.level.effects?.sparks(player.center(), 14);
      player.invuln = Math.max(player.invuln, 1.0);
    },
  },
};
