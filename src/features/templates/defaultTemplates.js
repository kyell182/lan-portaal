/** Startset templates. Admins kunnen ze aanpassen, dupliceren of verwijderen. */
module.exports = [
  {
    name: 'Knock-out (BO1)',
    formatKey: 'single-elimination',
    participantType: 'team',
    description: 'Snelle knock-out, ideaal voor een avondtoernooi.',
    settings: { bestOf: 1, thirdPlaceMatch: false },
  },
  {
    name: 'Knock-out met kleine finale (BO3)',
    formatKey: 'single-elimination',
    participantType: 'team',
    description: 'Best of 3 en een match om de 3de plaats.',
    settings: { bestOf: 3, thirdPlaceMatch: true },
  },
  {
    name: 'Double elimination',
    formatKey: 'double-elimination',
    participantType: 'team',
    description: 'Iedereen krijgt een tweede kans via de losers-bracket.',
    settings: { bestOf: 1, grandFinalReset: true },
  },
  {
    name: 'Competitie 1v1',
    formatKey: 'round-robin',
    participantType: 'player',
    description: 'Iedereen tegen iedereen, 3-1-0 puntensysteem.',
    settings: { bestOf: 1, legs: 1 },
  },
  {
    name: 'Poules + knock-out',
    formatKey: 'groups-knockout',
    participantType: 'team',
    description: 'Groepsfase met 2 doorstoters per poule, daarna knock-out.',
    settings: { groupCount: 4, qualifiersPerGroup: 2, thirdPlaceMatch: true },
  },
  {
    name: 'Swiss (5 rondes)',
    formatKey: 'swiss',
    participantType: 'player',
    description: 'Voor grote groepen 1v1, zoals FIFA of fighting games.',
    settings: { rounds: 5, allowDraws: true },
  },
  {
    name: 'Battle royale (punten + kills)',
    formatKey: 'points',
    participantType: 'team',
    description: 'Punten per plaats plus 1 punt per kill.',
    settings: { rounds: 4, pointsTable: '15,12,10,8,6,4,2,1', bonusLabel: 'Kills', bonusPoints: 1 },
  },
  {
    name: 'Racing / Mario Kart',
    formatKey: 'points',
    participantType: 'player',
    description: 'F1-puntensysteem over meerdere races.',
    settings: { rounds: 4, pointsTable: '25,18,15,12,10,8,6,4,2,1', bonusLabel: 'Bonus', bonusPoints: 0 },
  },
];
