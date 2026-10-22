// Bausteine `kettenzaun` und `kettenplattform` (Präzisierung Motor Welt 3): kletterbarer Kettenzaun bzw. Himmels-Plattform
// mit Kletterzaun als Entität (entities/kinds/kettenzaun.js) – { type: 'kettenzaun', … } ≙ { kind: 'kettenzaun', … }.
// Parameter siehe dort: pos, size, yaw, path/speed/mode/wait/phase/idle/once, attach (Fahrzeug), solid, climbable, id,
// hidden; Plattform zusätzlich fence, fenceHeight.
// Beispiel: { type: 'kettenzaun', id: 'zaun1', pos: [0, 1, -20], size: [4, 3.5], path: [[0, 1, -20], [6, 1, -20]], speed: 1.5 }

export const TYPES = {
  kettenzaun: (level, spec) => level.spawn('kettenzaun', spec),
  kettenplattform: (level, spec) => level.spawn('kettenplattform', spec),
};
