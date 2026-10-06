// Kleine Mathe-Helfer für Bewegung.

/** Nähert current um höchstens maxDelta an target an. */
export function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

/** Exponentielle Annäherung (framerate-unabhängig). rate in 1/s. */
export function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function sign(v) {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}
