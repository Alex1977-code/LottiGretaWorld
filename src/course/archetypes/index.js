// Registry der Level-Archetypen (arena, boss, ride, diorama …). Sammelt ./kinds/*.js automatisch: jedes Modul
// exportiert `ARCHETYPES = { name: (scene) => instance }`. Die Instanz darf diese Haken anbieten (alle optional):
//
//   createPlayer(level, opts) → Spielfigur (Standard: Player; opts = { hero, pos, yaw })
//   createRig(view, player)   → Darstellung der Figur mit update(dt, t) und dispose() (Standard: HeroRig)
//   setup()                   nach dem Aufbau (Level, Figur, Darstellung stehen; scene.level/player/view/rig)
//   beforeStep(dt, input)     vor jedem Simulationsschritt (1/120 s)
//   afterStep(dt, input)      nach jedem Simulationsschritt
//   render(dt, t)             je Bild vor dem Zeichnen
//   camera(dt, player, world) → true, wenn die Kamera vollständig selbst gesetzt wurde (z. B. Diorama-Orbit)
//   info()                    Zusatz für __course.state().archetype (Tests)
//   dispose()
//
// Ohne Eintrag (z. B. 'parcours') läuft das Level mit Standard-Figur und -Kamera.
const modules = import.meta.glob('./kinds/*.js', { eager: true });
const REGISTRY = {};
for (const [path, mod] of Object.entries(modules)) {
  for (const [name, factory] of Object.entries(mod.ARCHETYPES ?? {})) {
    if (REGISTRY[name]) console.warn(`[Archetypen] doppelter Name ${name} in ${path}`);
    REGISTRY[name] = factory;
  }
}
export function hasArchetype(name) { return !!REGISTRY[name]; }
export function listArchetypes() { return Object.keys(REGISTRY).sort(); }
/** Instanz des Archetyps für die Szene (oder null für Standard-Parcours). */
export function createArchetype(name, scene) {
  const f = REGISTRY[name];
  return f ? f(scene) : null;
}
