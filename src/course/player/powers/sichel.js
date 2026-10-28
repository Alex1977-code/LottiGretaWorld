// Wurfsichel (Bauplan „Bumerangblume → Wurfsichel: Bumerang, sammelt Münzen ein“; Präzisierung Motor und Bausteine Welt 7).
// Kostüm-Zustand über player.power === 'sichel' (Avatar/HeroRig: proxy.course.power = 'sichel'); beim Wurf meldet HeroRig
// wie bei allen Würfen den Zustand 'throw' (player.throwTime > 0, Dauer player.throwDur).
//
// Aktion wirft eine Sichel (Entität 'wurfsichel', entities/kinds/w7_gimmicks.js) in Blickrichtung: sie fliegt mit leichtem
// Bogen bis ≈ 7,5 m (bzw. bis zur ersten Wand), kehrt zurück und wird gefangen. Unterwegs trifft sie Gegner
// (onHit('throw', sichel) bzw. onSichelHit), sammelt Münzen/Sterne/Stempel/Power-ups für die Werferin ein, löst ?-Blöcke,
// POW, Druckschalter und Druckknöpfe aus. Laden: je Figur höchstens SICHEL_MAX Sicheln gleichzeitig (Standard 1, wie der
// Bumerang im Vorbild) – erst nach dem Fangen (oder wenn die Sichel nach 3,5 s verloren geht) wirft die Figur wieder;
// danach SICHEL_COOLDOWN s Abklingzeit. Klone (Spiegelfrucht) werfen je eine eigene Sichel.
//
// Schnittstelle für Figuren-Agenten / HUD:
//   player.power === 'sichel'           Kostüm (Name im Spiel „Wurfsichel“, def.label)
//   player.sichelFlying                 Zahl der Sicheln dieser Figur in der Luft (0 = in der Hand → Kostüm zeigt sie)
//   player.sichelReady                  true, wenn ein Wurf jetzt ginge (HUD dimmt das Symbol sonst)
//   player.sichelCatch                  Zähler gefangener Sicheln (Fang-Animation: Wechsel des Zählers)
//   def.hudDraw(g, x, y, player)        HUD-Symbol (CourseUIScene ruft es statt des Farbkreises)
// Modelle: 'wurfsichel_item' (Item), 'wurfsichel_geschoss' (fliegende Sichel, state { spin }), 'wurfsichel_kostuem'
// (Kostüm-Teil, übernimmt der Figuren-Agent).

export const SICHEL_MAX = 1;
export const SICHEL_COOLDOWN = 0.2;

function flying(player) {
  let n = 0;
  for (const e of player.level.entities) if (e.kind === 'wurfsichel' && !e.removed && e.owner === player) n++;
  return n;
}

export const POWERS = {
  sichel: {
    label: 'Wurfsichel',
    icon: 0xffc23a,
    onGain(player) { player.sichelCatch ??= 0; },
    update(player) {
      player.sichelFlying = flying(player);
      player.sichelReady = player.sichelFlying < SICHEL_MAX && !(player.fireCooldown > 0);
    },
    onAction(player) {
      const level = player.level;
      if (!level.hasKind('wurfsichel') || player.fireCooldown > 0) return false;
      if (player.mode !== 'ground' && player.mode !== 'air') return false;
      if (player.state === 'groundpound' || player.state === 'dive' || player.state === 'hurt') return false;
      if (flying(player) >= SICHEL_MAX) return false;
      player.fireCooldown = SICHEL_COOLDOWN;
      player.throwTime = 0.25; player.throwDur = 0.25;
      const f = player.facingVec();
      // Wurf über Kopfhöhe (Mitte der Sichel ≈ 0,9 m bei großer Figur): trifft Gegner, Münzen und tief hängende Blöcke
      const y = player.pos.y + player.half.y * 1.9 - 0.16;
      level.spawn('wurfsichel', { pos: [player.pos.x + f.x * 0.5, y, player.pos.z + f.z * 0.5], dir: [f.x, f.z], owner: player });
      player.sichelFlying = flying(player);
      player.sichelReady = false;
      level.sfx('boomerang');
      return true;
    },
    /** HUD-Symbol: goldene Sichel (Bogen) mit rosa Blütenpunkt; blass, solange sie fliegt. */
    hudDraw(g, x, y, player) {
      const a = player.sichelFlying > 0 ? 0.35 : 1;
      // Sichel-Mond: äußerer Bogen im Uhrzeigersinn, innerer (versetzt) zurück – gefüllt; helle Schneide außen
      const p0 = Math.PI * 0.2, p1 = Math.PI * 1.45;
      g.fillStyle(0xffc23a, a);
      g.beginPath(); g.arc(x, y, 6.4, p0, p1, false); g.arc(x + 1.6, y - 0.9, 4.4, p1 - 0.1, p0 + 0.15, true); g.closePath(); g.fillPath();
      g.lineStyle(1, 0xffffff, 0.95 * a); g.beginPath(); g.arc(x, y, 6.6, p0 + 0.1, p1 - 0.1, false); g.strokePath();
      g.fillStyle(0xff6ab0, a); g.fillCircle(x + 1.2, y - 0.6, 1.7);
    },
    hudKey: (player) => (player.sichelFlying > 0 ? 'f' : 'r'),
  },
};
