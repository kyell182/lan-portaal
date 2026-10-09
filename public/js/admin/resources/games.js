import { h } from '../../core/dom.js';

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
  ],
  fields: () => [
    { key: 'name', label: 'Naam', required: true },
    { key: 'shortName', label: 'Korte naam (bv. CS2)' },
    { key: 'teamSize', label: 'Spelers per team', type: 'number', min: 1, max: 20, default: 1 },
    { key: 'platform', label: 'Platform', default: 'PC' },
    { key: 'color', label: 'Kleur', type: 'color', default: '#e30613' },
    { key: 'description', label: 'Beschrijving', type: 'textarea' },
  ],
};
