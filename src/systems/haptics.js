// Haptisches Feedback (nur auf unterstützten Geräten).

let enabled = true;

export function setHapticsEnabled(v) { enabled = v; }

/** Vibriert kurz; pattern in ms (Zahl oder Array). Fehler werden ignoriert. */
export function vibrate(pattern = 15) {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (_) { /* ignorieren */ }
}
