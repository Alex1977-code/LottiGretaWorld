// Welt-Warp aus einem Kurs-Level (Bauplan 1-2: „geheime Röhre (nur mit Krallen erreichbar) als Welt-Warp“; im Vorbild
// schaltet sie die nächste Welt frei). Schnittstelle im Level-Datenformat: Röhre (Baustein `pipe`) mit `warpWorld: n`:
//
//   { type: 'pipe', id: 'p_world2', pos, height, target: 'p_w2_in', warpWorld: 2 }
//
// Die Röhre funktioniert wie jede Warp-Röhre (hinab, Teleport zum target); im Moment des Teleports schaltet sie die Welt
// n frei (courseSave.openWorld(n)) und beendet das Level ohne Zielmast: Die Szene blendet zur Kurs-Karte über, die mit
// { warpWorld: n } in Welt n startet – die Figur kommt dort durch die Glasröhre am Start der Insel an.
// Im Testbetrieb (manueller Takt, setManual) bleibt die Szene stehen: state().worldWarp meldet den Warp, der Test
// entscheidet selbst (wie beim Spielende).

import Phaser from 'phaser';
import { courseSave } from '../level/CourseSave.js';

/** Nach dem Levelaufbau aufrufen (CourseScene.create): Röhren mit warpWorld verdrahten. */
export function installWorldWarps(scene) {
  const level = scene.level;
  for (const seg of level?.data?.segments ?? []) {
    if (seg?.type !== 'pipe' || !seg.warpWorld || !seg.id) continue;
    const info = level.named.get(seg.id);
    if (info) info.onWarp = () => worldWarp(scene, seg.warpWorld);
  }
}

function worldWarp(scene, world) {
  if (scene.worldWarp) return;
  courseSave.openWorld(world);
  scene.worldWarp = world;
  scene.level?.sfx('oneup');
  if (scene.manual) return;
  scene.finished = true;
  const cam = scene.cameras.main;
  cam.fadeOut(420, 255, 255, 255);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.exitToMap({ warpWorld: world }));
}
