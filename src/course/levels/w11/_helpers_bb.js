// Hilfen für die Blumen-Remix-Level B-5 „Hasenhatz im Morgenrot“, B-6 „Grauspuk in der Mondscheinvilla“, B-7
// „Kanonenhelm-Tauchgang im Leuchtturmriff“ und B-8 „Turbo-Piep über dem Neonsteg“ (kein Level: exportiert kein LEVEL,
// die Level-Registry überspringt dieses Modul). Nur für diese vier Level – andere Remix-Level haben eigene Hilfsdateien;
// Basislevel und gemeinsame Dateien bleiben unverändert. Alles Level-Lokale hängt sich über die Remix-Haken
// (prebuild/build/setup, level.onStep) an.
//
//   line, ring, arc, isl        Münzen (Reihe, Ring, Bogen) bzw. Insel mit Oberkante top
//   sternHier(index, dy)        Belohnung (Aktion { fn }): versteckter Stern index erscheint dort, wo die Aktion ausgelöst wurde
//                               (B-5: der Riesenhase lässt Stern 0 an seiner Fangstelle zurück)

/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Insel über ihre Grundfläche x0..x1, zA..zB, Oberseite top, Höhe h. */
export function isl(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}

// =====================================================================================================================
// B-5: Stern an der Fangstelle
// =====================================================================================================================

/**
 * Aktion für Belohnungen (bunny reward, Kampfraum onClear …): der (versteckte) Stern index erscheint dy m über der Stelle,
 * an der die Aktion ausgelöst wurde (ctx.pos). Gibt es ihn noch nicht als Entität, entsteht er dort.
 */
export function sternHier(index, dy = 1) {
  return {
    fn(level, ctx) {
      if (level.runtime?.stars?.[index]) return;
      const p = ctx?.pos ? (Array.isArray(ctx.pos) ? ctx.pos : [ctx.pos.x, ctx.pos.y, ctx.pos.z]) : null;
      const at = p ? [p[0], p[1] + dy, p[2]] : null;
      const st = level.entities.find((e) => e.kind === 'star' && e.index === index && !e.removed);
      if (st) { if (st.hidden) st.reveal(at ?? undefined); else if (at) st.pos.set(at[0], at[1], at[2]); return; }
      level.spawn('star', { pos: at ?? [0, 0, 0], index });
      level.sfx?.('powerup_appear');
    },
  };
}
