/** Het event en de zes rondes (plus social bonus) van het IEEE Halloween-toernooi. Tijden zijn een richtlijn. */
const EVENT = {
  name: 'IEEE LAN Party Halloween 2026',
  tagline: 'Game, Pizza & Chill',
  startDate: '2026-10-22T20:30',
  location: 'Stuvo VIVES Brugge',
  theme: 'halloween',
  description: 'IEEE LAN Party Halloween Edition: zes rondes, pizza in de pauze en een prijsuitreiking rond 22:20.',
  active: true,
};

const TEMPLATE = Object.freeze({
  GROUPS: 'LAN Groepsronde',
  GROUPS_TWO_MATCHES: 'LAN Groepsronde (2 matches)',
  ROOM: 'LAN Zaalronde',
  FINALE: 'LAN Finale op stand',
  SOCIAL: 'LAN Social bonus',
});

const ROUNDS = [
  { roundNo: 1, game: 'Skribbl.io', template: TEMPLATE.GROUPS, startTime: '2026-10-22T20:30' },
  { roundNo: 2, game: 'PopSauce', template: TEMPLATE.ROOM, startTime: '2026-10-22T20:43' },
  { roundNo: 3, game: 'Smash Karts', template: TEMPLATE.GROUPS_TWO_MATCHES, startTime: '2026-10-22T20:56' },
  { roundNo: 4, game: 'Tetr.io', template: TEMPLATE.ROOM, startTime: '2026-10-22T21:40' },
  { roundNo: 5, game: 'Krunker', template: TEMPLATE.GROUPS, startTime: '2026-10-22T21:53' },
  { roundNo: 6, game: 'Curve Fever', template: TEMPLATE.FINALE, startTime: '2026-10-22T22:06' },
];

const SOCIAL_BONUS = { name: 'Social bonus', template: TEMPLATE.SOCIAL };

module.exports = { EVENT, ROUNDS, SOCIAL_BONUS };
