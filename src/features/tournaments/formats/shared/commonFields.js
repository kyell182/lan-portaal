/** Instellingen die door meerdere vormen gedeeld worden. */
const bestOf = { key: 'bestOf', label: 'Best of (per match)', type: 'integer', min: 1, max: 9, default: 1 };

const leaguePoints = [
  { key: 'pointsWin', label: 'Punten bij winst', type: 'number', default: 3 },
  { key: 'pointsDraw', label: 'Punten bij gelijkspel', type: 'number', default: 1 },
  { key: 'pointsLoss', label: 'Punten bij verlies', type: 'number', default: 0 },
  { key: 'allowDraws', label: 'Gelijkspel toegestaan', type: 'boolean', default: true },
];

module.exports = { bestOf, leaguePoints };
