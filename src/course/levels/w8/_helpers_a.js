// Hilfen für die Welt-8-Level 8-1 „Stachelstege der Regenfestung“, 8-2 „Pflaumes Dünenrutsche“ und 8-3 „Keksräder in der
// Zuckerfabrik“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für diese drei Level –
// andere Welt-8-Level haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt sich über
// die offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build / LEVEL.setup) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer   isl, line, ring, arc, column, sign (aus den Welt-7-Hilfen), falle (Stachelfalle im Takt), punkt
//   2) Mechanik       (je Level weiter unten)
//   3) Kulisse        (je Level weiter unten)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte Kleinigkeiten
// sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { isl, line, ring, arc, column, sign } from '../w7/_helpers_a.js';
import { Bld, litTop, gradY } from '../w5/_helpers_b.js';

export { isl, line, ring, arc, column, sign, Bld, litTop, gradY };

const TAU = Math.PI * 2;

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Stachelfalle (Welt-7-Entität, frei stehend): Stahlplatte mit Lochraster, Stacheln fahren im Takt heraus. y = Oberseite. */
export const falle = (id, x, y, z, o = {}) => ({ kind: 'stachelfalle', id, pos: [x, y, z], size: o.size ?? [2.4, 2.2], period: o.period ?? 3.2, up: o.up ?? 1.2, warn: o.warn ?? 0.8, phase: o.phase ?? 0, ...(o.yaw !== undefined ? { yaw: o.yaw } : {}) });

// =====================================================================================================================
// 2) Mechanik
// =====================================================================================================================

/**
 * Fallblöcke ohne Wackel-Schwung (8-1 Stern 2): Ein wackelnder Fallblock (Baustein fallblock_bruecke) schüttelt sich mit
 * ±2,8 m/s; wer in dieser Zeit abspringt, erbte diese zufällige Seitengeschwindigkeit (der Hüpfer zum nächsten Block gelang
 * dann mal, mal nicht). Dieser Haken (LEVEL.setup, läuft nach dem Baustein) lässt die Figur weiter mitwackeln, gibt beim
 * Absprung aber keinen Schwung mehr mit. Nur dieses Level; der Baustein bleibt unverändert.
 */
export function fallblockRuhig(level, id) {
  const h = level.named.get(id);
  if (!h?.blocks) return;
  level.onStep(() => {
    for (const b of h.blocks) if (b.state === 'wackelt') { b.mb.mover.vx = 0; b.mb.mover.vz = 0; }
  });
}
