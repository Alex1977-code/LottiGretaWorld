// Gemeinsame Hilfen für die Level-Daten von Welt 1 (kein Level: exportiert kein LEVEL, die Level-Registry
// überspringt dieses Modul). Alles liefert reine Daten im Format von docs/KURS-ARCHITEKTUR.md.

/**
 * Insel über ihre Grundfläche: x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h (Unterkante top − h).
 * o: weitere Felder des Bausteins (top: 'stone'|'sand', under, color …).
 */
export function isl(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}

/**
 * Grasinsel mit Rasenmuster (Schachbrett-Felder, deco_w1 'checker') – Wiesen-Look von Welt 1.
 * Liefert zwei Bausteine (mit ... in segments einfügen).
 */
export function lawn(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return [
    isl(x0, x1, zA, zB, top, h, o),
    { type: 'deco_w1', kind: 'checker', pos: [(x0 + x1) / 2, top, (z0 + z1) / 2], size: [x1 - x0, z0 - z1], cell: o.cell ?? 2 },
  ];
}

/** Münzen in einer Reihe (Loader-Format). */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });

/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });

/** Münzbogen von a nach b (Fußpunkte) mit Scheitel h über der Verbindungslinie – zeigt einen Sprung an. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

/** Senkrechte Münzsäule (z. B. an einer Kletterwand). */
export function column(x, z, y0, y1, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'coin', pos: [x, y0 + ((y1 - y0) * i) / Math.max(1, n - 1), z] });
  return out;
}

/** Zierliste des Grund-Bausteins `deco`. */
export const deco = (items) => ({ type: 'deco', items });

/** Zierliste der Welt-1-Ergänzung `deco_w1` (Glockenblumen, Pilze, Schilder, Schilf …). */
export const decoW1 = (items) => ({ type: 'deco_w1', items });

/** Zaun entlang eines Linienzugs (Punkte [x, z]) auf Bodenhöhe y. */
export function fence(points, y) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) out.push({ kind: 'fence', from: [points[i][0], y, points[i][1]], to: [points[i + 1][0], y, points[i + 1][1]] });
  return out;
}
