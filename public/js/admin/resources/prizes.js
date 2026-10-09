import { api } from '../../core/Api.js';
import { toOptions, nameOf } from './options.js';
import { adminEventContext } from '../context.js';

export const prizesResource = {
  title: 'Prijzen & shop',
  singular: 'Item',
  endpoint: '/prizes',
  scoped: true,
  watches: ['prizes', 'tournaments'],
  intro: 'Prijzen per toernooi en plaats, of shop-items met prijs en voorraad.',
  loadContext: async () => ({ tournaments: await api.get(`/tournaments${adminEventContext.query()}`) }),
  sort: (a, b) => a.kind.localeCompare(b.kind) || (a.place || 99) - (b.place || 99),
  columns: [
    { label: 'Naam', value: (p) => p.name },
    { label: 'Soort', value: (p) => (p.kind === 'shop' ? 'Shop' : 'Prijs') },
    { label: 'Toernooi', value: (p, ctx) => nameOf(ctx.tournaments, p.tournamentId) },
    { label: 'Plaats', value: (p) => (p.place ? `${p.place}e` : '') },
    { label: 'Prijs / voorraad', value: (p) => (p.kind === 'shop' ? `€ ${p.price ?? 0} – ${p.quantity} st.` : `${p.quantity} st.`) },
    { label: 'Gewonnen door', value: (p) => p.awardedTo },
  ],
  fields: (ctx) => [
    { key: 'name', label: 'Naam', required: true },
    { key: 'kind', label: 'Soort', type: 'select', required: true, default: 'prijs', options: [{ value: 'prijs', label: 'Prijs' }, { value: 'shop', label: 'Shop-item' }] },
    { key: 'tournamentId', label: 'Toernooi', type: 'select', options: toOptions(ctx.tournaments) },
    { key: 'place', label: 'Voor plaats', type: 'number', min: 1 },
    { key: 'price', label: 'Prijs in € (shop)', type: 'number', min: 0, step: '0.01' },
    { key: 'quantity', label: 'Aantal / voorraad', type: 'number', min: 0, default: 1 },
    { key: 'sponsor', label: 'Sponsor' },
    { key: 'imageUrl', label: 'Afbeelding (URL)', type: 'url' },
    { key: 'description', label: 'Beschrijving', type: 'textarea' },
    { key: 'awardedTo', label: 'Gewonnen door' },
  ],
};
