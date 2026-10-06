// Querformat-Hinweis: Im Hochformat wird ein Overlay gezeigt und das Spiel pausiert.

export function setupOrientationHint(game) {
  const el = document.getElementById('rotate-hint');
  if (!el) return;
  let paused = false;

  const check = () => {
    const portrait = window.innerHeight > window.innerWidth;
    el.classList.toggle('visible', portrait);
    if (portrait && !paused) {
      paused = true;
      for (const key of ['Play', 'UI']) if (game.scene.isActive(key)) game.scene.pause(key);
    } else if (!portrait && paused) {
      paused = false;
      for (const key of ['Play', 'UI']) if (game.scene.isPaused(key)) game.scene.resume(key);
    }
  };

  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', () => setTimeout(check, 100));
  game.events.once('ready', check);
  check();
}
