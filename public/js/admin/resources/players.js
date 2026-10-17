import { h } from '../../core/dom.js';

export const playersResource = {
  title: 'Spelers',
  singular: 'Speler',
  endpoint: '/players',
  scoped: true,
  intro: 'Publiek zijn enkel gamertag, naam en opleiding zichtbaar. E-mail, toestel en socials zijn alleen voor admins.',
  sort: (a, b) => a.nickname.localeCompare(b.nickname),
  extraActions: () => [
    h('a', { class: 'btn', href: '#/checkin' }, 'Check-in'),
    h('a', { class: 'btn', href: '#/spelers/importeren' }, 'Importeren'),
  ],
  columns: [
    { label: 'Gamertag', value: (p) => p.nickname },
    { label: 'Naam', value: (p) => [p.firstName, p.lastName].filter(Boolean).join(' ') },
    { label: 'Opleiding', value: (p) => p.studyProgram },
    { label: 'Toestel', value: (p) => p.device },
    { label: 'E-mail', value: (p) => p.email },
    { label: 'Ingecheckt', value: (p) => (p.checkedIn ? 'Ja' : '') },
  ],
  fields: () => [
    { key: 'nickname', label: 'Gamertag (3-16 tekens: letters, cijfers, _)', required: true },
    { key: 'firstName', label: 'Voornaam', required: true },
    { key: 'lastName', label: 'Achternaam', required: true },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'studyProgram', label: 'Opleiding / klas' },
    { key: 'device', label: 'Toestel (laptop, pc, ...)' },
    { key: 'tieBreakRank', label: 'Tie-break plaats (uitslag 1-tegen-1, laagste wint)', type: 'number', min: 1 },
    { key: 'checkedIn', label: 'Ingecheckt', type: 'checkbox' },
    { key: 'notes', label: 'Notities (enkel admins)', type: 'textarea' },
  ],
};
