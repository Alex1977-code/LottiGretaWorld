// Service Worker registrieren (nur im Produktions-Build, nicht im Dev-Server).

export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* offline-Funktion optional */ });
  });
}
