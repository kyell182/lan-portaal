import { loadLookups, toOptions, nameOf } from './options.js';

const nick = (p) => p.nickname;

export const teamsResource = {
  title: 'Teams',
  singular: 'Team',
  endpoint: '/teams',
  watches: ['teams', 'players'],
  sort: (a, b) => a.name.localeCompare(b.name),
  loadContext: () => loadLookups('players'),
  columns: [
    { label: 'Naam', value: (t) => (t.tag ? `[${t.tag}] ${t.name}` : t.name) },
    { label: 'Spelers', value: (t, ctx) => t.playerIds.map((id) => nameOf(ctx.players, id, nick)).join(', ') },
    { label: 'Captain', value: (t, ctx) => nameOf(ctx.players, t.captainId, nick) },
  ],
  fields: (ctx) => [
    { key: 'name', label: 'Teamnaam', required: true },
    { key: 'tag', label: 'Tag (max 8 tekens)' },
    { key: 'playerIds', label: 'Spelers', type: 'multi', options: toOptions(ctx.players, nick) },
    { key: 'captainId', label: 'Captain', type: 'select', options: toOptions(ctx.players, nick) },
  ],
};
