// LOTTI & GRETA als Windows-Programm: ein Fenster, das den Web-Build (desktop/app, Kopie von dist/) zeigt.
// Die Dateien kommen über das eigene Schema app://spiel/ direkt von der Platte (fester Ursprung: der Spielstand in
// localStorage bleibt erhalten; kein Netz nötig). Start im Vollbild, F11 schaltet um, Alt+F4 beendet. Controller
// (Bluetooth/USB/Streaming) bedienen das ganze Spiel (src/systems/gamepad.js).
const { app, BrowserWindow, protocol, net, Menu, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, 'app');
const START = 'app://spiel/index.html';

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);

// nur ein Fenster: ein zweiter Start holt das laufende nach vorn
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360,
    backgroundColor: '#1a1a2e', autoHideMenuBar: true, show: false,
    title: 'Lotti und Greta',
    icon: path.join(ROOT, 'icons', 'icon-512.png'),
    // autoplayPolicy: Ton ohne Mausklick (wer nur mit dem Controller spielt, klickt nie); backgroundThrottling aus: das Spiel
    // läuft weiter, wenn das Fenster beim Streaming nicht im Vordergrund ist
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
  });
  Menu.setApplicationMenu(null);
  // Start im Vollbild (Spielen am Fernseher / über Streaming ohne Tastatur); F11 schaltet aufs Fenster zurück
  win.once('ready-to-show', () => { win.maximize(); win.setFullScreen(process.env.LOTTI_WINDOW !== '1'); win.show(); });
  win.webContents.on('before-input-event', (ev, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); ev.preventDefault(); }
  });
  // fremde Adressen nie im Spielfenster öffnen
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (ev, url) => { if (!url.startsWith('app://spiel/')) ev.preventDefault(); });
  win.on('closed', () => { win = null; });
  win.loadURL(START + (process.env.LOTTI_QUERY ? `?${process.env.LOTTI_QUERY}` : ''));
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(ROOT, p));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return new Response('', { status: 403 });
    return net.fetch(pathToFileURL(file).toString()).catch(() => new Response('', { status: 404 }));
  });
  createWindow();
});
