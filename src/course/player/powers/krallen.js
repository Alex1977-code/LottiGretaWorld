// Krallen-Anzug (Bauplan: Wände hochklettern ca. 2 s, Tatzenhieb, Sturzflug-Angriff schräg nach unten).
// Klettern und Sturzflug setzt Player.js um (canClimb, onAirCrouch); der Tatzenhieb ist hier ein einfacher
// Treffer-Bereich vor der Figur – der Power-up-Agent kann Animation/Effekt verfeinern.

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
    /** Tatzenhieb: 0,25 s Trefferbereich 1 m vor der Figur. */
    onAction(player) {
      if (player.clawTime > 0) return false;
      player.clawTime = 0.25;
      player.attack('claw', 1.0, 0.25);
      player.level.sfx('claw');
      return true;
    },
  },
};
