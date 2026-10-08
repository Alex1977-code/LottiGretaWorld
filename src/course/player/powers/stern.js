// Funkelstern (Bauplan: „10 s unverwundbar“). 10 s lang unverwundbar, jede Berührung besiegt Gegner
// (onHit('star'); auch Stampfsteine), Lauf- und Renntempo ×1,25, Glitzern um die Figur. Während der Wirkung spielt
// die Musik 'course_star', danach wieder die Levelmusik (LEVEL.music). Ein Wächter (level.onStep) stellt Tempo
// und Musik zurück, sobald das Power-up endet – egal wie (Ablauf, Tod/Neustart, anderes Power-up).
// level.musicNow hält das zuletzt gewählte Thema (für Tests).

import { music } from '../../../audio/index.js';

export const STAR_SPEED = 1.25;

export const POWERS = {
  stern: {
    label: 'Funkelstern',
    icon: 0xfff04a,
    duration: 10,
    invulnerable: true,
    onGain(player) {
      const level = player.level;
      player.speedMult = player.variant.speedMult * STAR_SPEED;
      music.play('course_star');
      level.musicNow = 'course_star';
      if (player._starWatch) return;
      let done = false;
      const off = level.onStep(() => {
        if (done || player.power === 'stern') return;
        done = true;
        player.speedMult = player.variant.speedMult;
        const back = level.data.music ?? 'course_grass';
        music.play(back);
        level.musicNow = back;
        player._starWatch = null;
        // Abmelden erst nach dem laufenden Schritt (die onStep-Liste wird gerade durchlaufen)
        queueMicrotask(off);
      });
      player._starWatch = off;
    },
    update(player, dt) {
      player._starFx = (player._starFx ?? 0) - dt;
      if (player._starFx <= 0) {
        player._starFx = 0.09;
        const c = player.center();
        player.level.effects?.sparks({ x: c.x + (Math.random() - 0.5) * 0.6, y: c.y + (Math.random() - 0.3) * 0.8, z: c.z + (Math.random() - 0.5) * 0.6 }, 1);
      }
    },
    onTouchEntity(player, entity) { entity.onHit?.('star', player); return 'none'; },
  },
};
