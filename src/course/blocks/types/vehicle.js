// Baustein `vehicle`: Fahrzeug (Panzer, Plattformwagen, Waggon, Kettenzaun) auch in LEVEL.segments verwendbar
// ({ type: 'vehicle', … } ≙ { kind: 'vehicle', … }). Parameter: entities/kinds/vehicle.js.
export const TYPES = { vehicle: (level, spec) => level.spawn('vehicle', spec) };
