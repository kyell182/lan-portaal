const ieeeHalloween2026 = require('./ieee-halloween-2026');

/**
 * Alle beschikbare presets. Een preset is een kant-en-klare inrichting (event, games, toernooien) voor één LAN.
 * Een nieuwe preset toevoegen = een map met een index.js in dezelfde vorm en hier registreren.
 */
const PRESETS = [ieeeHalloween2026];

module.exports = {
  list: () => PRESETS.map(({ id, label }) => ({ id, label })),
  get: (id) => PRESETS.find((preset) => preset.id === id) ?? null,
};
