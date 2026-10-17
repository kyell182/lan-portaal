/** Velden die een import kan vullen, met trefwoorden om kolommen automatisch te herkennen. */
export const IMPORT_FIELDS = [
  { key: 'socialsClaimed', label: 'Welke socials volgt de speler', keywords: ['welke', 'volg', 'platform', 'sociale'] },
  { key: 'nickname', label: 'Gamertag', required: true, keywords: ['gamertag', 'nickname', 'pseudoniem', 'bijnaam'] },
  { key: 'firstName', label: 'Voornaam', required: true, keywords: ['voornaam', 'first name', 'firstname'] },
  { key: 'lastName', label: 'Achternaam', required: true, keywords: ['achternaam', 'familienaam', 'last name', 'lastname'] },
  { key: 'email', label: 'E-mail', keywords: ['mail'] },
  { key: 'studyProgram', label: 'Opleiding / klas', keywords: ['opleiding', 'studie', 'richting', 'klas'] },
  { key: 'device', label: 'Toestel', keywords: ['toestel', 'device', 'laptop'] },
  { key: 'instagram', label: 'Instagram-naam', keywords: ['instagram'] },
  { key: 'tiktok', label: 'TikTok-naam', keywords: ['tiktok'] },
  { key: 'facebook', label: 'Facebook-naam', keywords: ['facebook'] },
  { key: 'linkedin', label: 'LinkedIn-naam', keywords: ['linkedin'] },
];
