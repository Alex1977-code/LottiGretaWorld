// Baustein `schneeball` (Präzisierung Motor Welt 3): rollbarer Schneeball als Entität (entities/kinds/schneeball.js) –
// { type: 'schneeball', … } ≙ { kind: 'schneeball', … }. Parameter siehe dort: pos (Auflagepunkt), size (1), maxSize (2),
// grow ('snow' | true | false), growRate, content, respawn, breakSpeed, kick, id, hidden.
// Mehrere auf einmal: { type: 'schneeball', balls: [[x, y, z], …], size?, … } (gemeinsame Felder für alle; ids id0, id1 …).

function snowballs(level, spec) {
  if (!Array.isArray(spec.balls)) return level.spawn('schneeball', spec);
  const { balls, ...rest } = spec;
  return balls.map((p, i) => level.spawn('schneeball', { ...rest, pos: p, id: spec.id ? `${spec.id}${i}` : undefined }));
}

export const TYPES = { schneeball: snowballs };
