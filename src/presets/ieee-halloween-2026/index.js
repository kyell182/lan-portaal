const games = require('./games');
const { EVENT, TOURNAMENTS } = require('./tournaments');

/** Voorbeeld-preset: het IEEE Halloween-toernooi (6 rondes). Eenmalig; het portaal zelf is voor elke LAN bruikbaar. */
module.exports = {
  id: 'ieee-halloween-2026',
  label: 'IEEE LAN Party Halloween 2026 (6 rondes, groepen en zaal)',
  event: EVENT,
  games,
  tournaments: TOURNAMENTS,
};
