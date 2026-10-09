import { h, formatDate } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Toast } from '../../core/Toast.js';
import { adminEventContext } from '../context.js';

/** LAN-edities. Het actieve event is wat de publieke site standaard toont. */
export const eventsResource = {
  title: 'Events',
  singular: 'Event',
  endpoint: '/events',
  intro: 'Elke LAN-editie heeft eigen toernooien, zitplan en prijzen. Games, teams en spelers zijn gedeeld.',
  sort: (a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')),
  columns: [
    { label: 'Naam', value: (e) => e.name },
    { label: 'Start', value: (e) => formatDate(e.startDate) },
    { label: 'Locatie', value: (e) => e.location },
    { label: 'Status', value: (e) => (e.active ? h('span', { class: 'status active' }, 'Actief op de site') : '') },
  ],
  rowActions: (event, page) => [
    event.active ? null : h('button', {
      class: 'btn small',
      onclick: async () => {
        try {
          await api.post(`/events/${event.id}/activate`);
          Toast.show(`${event.name} staat nu op de publieke site`);
          page.reload();
        } catch (err) { Toast.error(err); }
      },
    }, 'Actief maken'),
    adminEventContext.id === event.id ? null : h('button', { class: 'btn small', onclick: () => adminEventContext.select(event.id) }, 'Beheren'),
  ],
  fields: () => [
    { key: 'name', label: 'Naam (bv. VIVES LAN Herfst 2026)', required: true },
    { key: 'tagline', label: 'Slogan' },
    { key: 'startDate', label: 'Start', type: 'datetime-local' },
    { key: 'endDate', label: 'Einde', type: 'datetime-local' },
    { key: 'location', label: 'Locatie' },
    { key: 'discordUrl', label: 'Discord-uitnodiging (https://discord.gg/...)', type: 'url' },
    { key: 'description', label: 'Beschrijving', type: 'textarea' },
    { key: 'active', label: 'Actief op de publieke site', type: 'checkbox' },
  ],
};
