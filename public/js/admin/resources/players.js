export const playersResource = {
  title: 'Spelers',
  singular: 'Speler',
  endpoint: '/players',
  intro: 'Publiek is enkel de nickname en opleiding zichtbaar.',
  sort: (a, b) => a.nickname.localeCompare(b.nickname),
  columns: [
    { label: 'Nickname', value: (p) => p.nickname },
    { label: 'Naam', value: (p) => [p.firstName, p.lastName].filter(Boolean).join(' ') },
    { label: 'Opleiding', value: (p) => p.studyProgram },
    { label: 'E-mail', value: (p) => p.email },
  ],
  fields: () => [
    { key: 'nickname', label: 'Nickname', required: true },
    { key: 'firstName', label: 'Voornaam' },
    { key: 'lastName', label: 'Achternaam' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'studyProgram', label: 'Opleiding / klas' },
    { key: 'notes', label: 'Notities (enkel admins)', type: 'textarea' },
  ],
};
