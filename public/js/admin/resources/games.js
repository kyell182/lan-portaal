import { h } from '../../core/dom.js';

const JOIN_METHODS = [
  { value: 'link', label: 'Link' },
  { value: 'code', label: 'Code' },
  { value: 'code+password', label: 'Code + wachtwoord' },
  { value: 'link+password', label: 'Link + wachtwoord' },
];

export const gamesResource = {
  title: 'Games',
  singular: 'Game',
  endpoint: '/games',
  intro: 'De games waarin toernooien gespeeld worden.',
  sort: (a, b) => a.name.localeCompare(b.name),
  columns: [
    { label: 'Naam', value: (g) => g.name },
    { label: 'Kleur', value: (g) => h('span', { style: { display: 'inline-block', width: '18px', height: '18px', borderRadius: '4px', background: g.color } }) },
    { label: 'Teamgrootte', value: (g) => g.teamSize },
    { label: 'Platform', value: (g) => g.platform },
    { label: 'Max. spelers', value: (g) => g.maxPlayers },
  ],
  fields: () => [
    { key: 'name', label: 'Naam', required: true },
    { key: 'shortName', label: 'Korte naam (bv. CS2)' },
    { key: 'teamSize', label: 'Spelers per team', type: 'number', min: 1, max: 20, default: 1 },
    { key: 'platform', label: 'Platform', default: 'PC' },
    { key: 'color', label: 'Kleur', type: 'color', default: '#e30613' },
    { key: 'description', label: 'Beschrijving', type: 'textarea' },
    { key: 'joinMethod', label: 'Hoe komen spelers binnen?', type: 'select', options: JOIN_METHODS },
    { key: 'maxPlayers', label: 'Max. spelers per room', type: 'number', min: 2, max: 1000 },
    { key: 'estMinutes', label: 'Geschatte duur per match (min)', type: 'number', min: 1, max: 60 },
    { key: 'needsOwnName', label: 'Speler heeft een eigen naam in dit spel (toont "Mijn naam in dit spel")', type: 'checkbox' },
    { key: 'hostSteps', label: 'Host-kaart: stappen (1 per regel)', type: 'textarea' },
    { key: 'hostSettings', label: 'Host-kaart: instellingen ("Label | Waarde | Toelichting" per regel, * vooraan = afwijking van de standaard)', type: 'textarea' },
    { key: 'testChecklist', label: 'Testen voor de start (1 per regel)', type: 'textarea' },
  ],
};
