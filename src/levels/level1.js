// Level 1 „Herbstwald“ – ca. 2 Minuten. Normaler Ausgang: Fahne am Ende.
// Geheimer Ausgang: Schlüssel in der Höhle unter dem Waldboden, Tor auf der Anhöhe.
import { Grid } from './grid.js';
import { asciiToTiled } from './tiled.js';

export function buildLevel1() {
  const W = 300, H = 27, FLOOR = 22; // Boden: Zeilen 22..26 (Höhle nutzt 23..25)
  const g = new Grid(W, H);
  const pit = (x0, x1) => g.rect(x0, FLOOR, x1, H - 1, '.');
  const hill = (x0, x1, top) => g.rect(x0, top, x1, FLOOR - 1, '#');
  const plat = (x0, x1, row) => g.hline(x0, x1, row, '=');
  const thorns = (x0, x1, row = FLOOR - 1) => g.hline(x0, x1, row, '^');

  g.rect(0, FLOOR, W - 1, H - 1, '#');

  // ---------- A: Waldwiese (0-34) – Laufen, Springen, erste Gefahr ----------
  g.set(3, FLOOR - 1, 'P');
  g.set(14, FLOOR - 1, 'k');
  hill(20, 23, FLOOR - 2);
  plat(26, 28, FLOOR - 5);
  g.set(27, FLOOR - 6, 'o');            // Münze 1
  thorns(31, 32);

  // ---------- B: Baumstümpfe & Greta (35-75) ----------
  hill(38, 40, FLOOR - 1);
  hill(41, 43, FLOOR - 2);
  hill(44, 47, FLOOR - 3);
  g.set(46, FLOOR - 4, 'F');            // Greta wartet auf dem Plateau
  hill(48, 50, FLOOR - 2);
  hill(51, 53, FLOOR - 1);
  g.set(56, FLOOR - 2, 'R');            // rote Beere
  plat(57, 58, FLOOR - 3);              // Stufe hinauf aufs Steindach
  g.set(60, FLOOR - 1, 'm');
  g.hline(62, 68, FLOOR - 5, 'B');      // Steinreihe als Dach
  g.set(65, FLOOR - 1, 'k');
  plat(66, 68, FLOOR - 8);
  plat(71, 73, FLOOR - 10);
  g.set(72, FLOOR - 11, 'o');           // Münze 2 (hoch)

  // ---------- C: Lücken & Gleitflug (76-125) ----------
  pit(78, 80);
  pit(86, 89);
  g.set(92, FLOOR - 1, 'm');
  pit(95, 99);
  plat(101, 102, FLOOR - 3);
  plat(103, 104, FLOOR - 6);
  hill(105, 107, FLOOR - 9);            // Turm als Absprung
  pit(108, 122);                        // breite Schlucht – Gleiten!
  g.set(115, FLOOR - 7, 'o');           // Münze 3 schwebt über der Schlucht
  thorns(125, 126);

  // ---------- D: Checkpoint (126-140) ----------
  g.set(129, FLOOR - 1, 'C');
  g.set(134, FLOOR - 2, 'U');           // blaue Beere
  g.set(138, FLOOR - 1, 'k');

  // ---------- E: Baumkronen (141-195) ----------
  plat(143, 146, FLOOR - 3);
  plat(149, 152, FLOOR - 6);
  plat(155, 158, FLOOR - 9);
  plat(161, 166, FLOOR - 12);
  g.set(163, FLOOR - 13, 'm');
  g.set(164, FLOOR - 15, 'o');          // Münze 4 ganz oben
  plat(170, 173, FLOOR - 9);
  plat(177, 180, FLOOR - 6);
  plat(184, 187, FLOOR - 3);
  thorns(150, 154);
  thorns(160, 167);
  thorns(174, 178);
  g.set(190, FLOOR - 1, 'k');

  // ---------- F: Große Schlucht (196-226) ----------
  g.set(198, FLOOR - 2, 'Y');           // gelbe Beere
  pit(203, 210);
  hill(211, 213, FLOOR - 2);            // Pfeiler in der Mitte
  pit(214, 224);
  thorns(226, 227);

  // ---------- G: Höhle mit Schlüssel (228-268) ----------
  g.rect(229, FLOOR + 1, 263, H - 2, '.');   // Höhle (3 Tiles hoch), Boden bleibt
  g.hline(232, 234, FLOOR, 'B');             // zerbrechbare Decke (Stampfsprung)
  g.set(230, FLOOR + 3, 'K');                // Schlüssel ganz links in der Höhle
  thorns(245, 246, FLOOR + 3);
  g.set(254, FLOOR + 3, 'k');
  // Treppe aus der Höhle (je eine Stufe)
  g.rect(263, FLOOR, 263, H - 2, '.');
  g.rect(264, FLOOR, 264, FLOOR + 2, '.');
  g.rect(265, FLOOR, 265, FLOOR + 1, '.');
  g.set(266, FLOOR, '.');
  g.set(236, FLOOR - 1, 'm');
  g.set(250, FLOOR - 1, 'k');

  // ---------- H: Ziel (269-299) ----------
  plat(271, 272, FLOOR - 3);
  plat(275, 277, FLOOR - 6);
  g.set(276, FLOOR - 7, 'o');           // Münze 5
  g.set(269, FLOOR - 1, 'k');
  hill(283, 287, FLOOR - 3);
  g.set(285, FLOOR - 4, 'G');           // Tor (geheimer Ausgang) auf der Anhöhe
  g.set(291, FLOOR - 1, 'm');
  g.set(295, FLOOR - 1, 'X');           // Zielfahne
  g.rect(W - 2, FLOOR - 8, W - 1, FLOOR - 1, 'B');

  return asciiToTiled(g.toRows(), { name: 'Herbstwald' });
}
