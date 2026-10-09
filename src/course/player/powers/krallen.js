// Krallen-Anzug (Bauplan: Wände hochklettern ca. 2 s, Tatzenhieb, Sturzflug-Angriff schräg nach unten).
// Klettern an `climbable`-Wänden und den Sturzflug setzt Player.js um (canClimb, onAirCrouch → startDive: Angriff
// 'claw' vor der Figur bis zur Landung). Hier: der Tatzenhieb (Aktion) – 0,3 s Angriff 1,1 m vor der Figur
// (onHit('claw'): besiegt Gegner, kickt Panzer/Kickbomben, zerbricht Ziegel, löst ?-Blöcke aus) mit kurzem
// Ausfallschritt nach vorn; in der Luft ohne Ausfallschritt. Der Avatar bekommt dabei den Zustand 'claw'.

export const POWERS = {
  krallen: {
    label: 'Krallen-Anzug',
    icon: 0xffb52e,
    canClimb: true,
    /** Ducken in der Luft mit Richtung → Sturzflug statt Stampfattacke. */
    onAirCrouch(player, input) {
      if (input.mag < 0.3 && player.hSpeed() < 3) return false;
      player.startDive();
      return true;
    },
    /** Tatzenhieb (Aktion): Trefferbereich vor der Figur, zerbricht Zerbrechliches. */
    onAction(player) {
      if (player.clawTime > 0) return false;
      if (player.mode !== 'ground' && player.mode !== 'air') return false;
      if (player.state === 'groundpound' || player.state === 'dive' || player.state === 'hurt') return false;
      player.clawTime = 0.3;
      player.attack('claw', 1.1, 0.22);
      if (player.mode === 'ground' && player.state !== 'crouch' && player.state !== 'slide') player.gs = Math.max(player.gs, 3);
      // Zerbrechliche Formen ohne eigene Entität (Bausteine mit owner.onHit) vor der Figur
      const f = player.facingVec();
      const c = { x: player.pos.x + f.x * (player.half.x + 0.55), y: player.pos.y + player.half.y, z: player.pos.z + f.z * (player.half.z + 0.55) };
      for (const s of player.world.overlapAABB(c, { x: 0.55, y: player.half.y, z: 0.55 })) {
        const o = s.owner;
        if (!s.breakable || !o?.onHit || player.attackInfo.hit.has(o)) continue;
        player.attackInfo.hit.add(o);
        o.onHit('claw', player, s);
      }
      player.level.effects?.sparks({ x: c.x, y: c.y + 0.1, z: c.z }, 4);
      player.level.sfx('claw');
      return true;
    },
  },
};
