const TEMPLATE = Object.freeze({
  GROUPS: 'LAN Groepsronde',
  GROUPS_TWO_MATCHES: 'LAN Groepsronde (2 matches)',
  ROOM: 'LAN Zaalronde',
  FINALE: 'LAN Finale op stand',
  SOCIAL: 'LAN Social bonus',
});

const EVENT = {
  name: 'IEEE LAN Party Halloween 2026',
  tagline: 'Game, Pizza & Chill',
  startDate: '2026-10-22T20:30',
  location: 'Stuvo VIVES Brugge',
  theme: 'halloween',
  description: 'IEEE LAN Party Halloween Edition: zes rondes, pizza in de pauze en een prijsuitreiking rond 22:20.',
  active: true,
};

/** Zes rondes (tijden zijn een richtlijn) plus de social bonus, die niet in het algemeen klassement als ronde telt. */
const TOURNAMENTS = [
  { name: 'Ronde 1: Skribbl.io', game: 'Skribbl.io', template: TEMPLATE.GROUPS, roundNo: 1, startTime: '2026-10-22T20:30', countsForOverall: true },
  { name: 'Ronde 2: PopSauce', game: 'PopSauce', template: TEMPLATE.ROOM, roundNo: 2, startTime: '2026-10-22T20:43', countsForOverall: true },
  { name: 'Ronde 3: Smash Karts', game: 'Smash Karts', template: TEMPLATE.GROUPS_TWO_MATCHES, roundNo: 3, startTime: '2026-10-22T20:56', countsForOverall: true },
  { name: 'Ronde 4: Tetr.io', game: 'Tetr.io', template: TEMPLATE.ROOM, roundNo: 4, startTime: '2026-10-22T21:40', countsForOverall: true },
  { name: 'Ronde 5: Krunker', game: 'Krunker', template: TEMPLATE.GROUPS, roundNo: 5, startTime: '2026-10-22T21:53', countsForOverall: true },
  { name: 'Ronde 6: Curve Fever', game: 'Curve Fever', template: TEMPLATE.FINALE, roundNo: 6, startTime: '2026-10-22T22:06', countsForOverall: true },
  { name: 'Social bonus', template: TEMPLATE.SOCIAL },
];

module.exports = { EVENT, TOURNAMENTS };
