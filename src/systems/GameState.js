// Spielzustand über Szenen hinweg (Phaser Registry). Standardwerte zentral.

export const STATE_KEYS = {
  hearts: 'hearts',
  maxHearts: 'maxHearts',
  coins: 'coins',
};

export const DEFAULTS = {
  hearts: 3,
  maxHearts: 3,
  coins: 0,
};

/** Setzt fehlende Werte in der Registry auf die Standardwerte. */
export function initGameState(registry) {
  for (const [k, v] of Object.entries(DEFAULTS)) {
    if (!registry.has(k)) registry.set(k, v);
  }
}
