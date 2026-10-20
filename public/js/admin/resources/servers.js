export const serversResource = {
  title: 'Servers',
  singular: 'Server',
  endpoint: '/servers',
  scoped: true,
  watches: ['servers'],
  intro: 'Tegels met servergegevens (bv. Minecraft) die buiten de toernooien om getoond worden.',
  sort: (a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name),
  columns: [
    { label: 'Naam', value: (s) => s.name },
    { label: 'Adres', value: (s) => s.address },
    { label: 'Volgorde', value: (s) => s.order },
  ],
  fields: () => [
    { key: 'name', label: 'Naam', required: true },
    { key: 'address', label: 'Adres (bv. mc.lan:25565)' },
    { key: 'password', label: 'Wachtwoord (enkel zichtbaar voor ingelogde spelers)' },
    { key: 'imageUrl', label: 'Afbeelding (URL)', type: 'url' },
    { key: 'description', label: 'Beschrijving', type: 'textarea' },
    { key: 'details', label: 'Extra gegevens (één per regel, "Label: waarde")', type: 'textarea' },
    { key: 'order', label: 'Volgorde (laag eerst)', type: 'number', min: 0, default: 0 },
  ],
};
