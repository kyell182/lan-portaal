import { h, mount, formatDate } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Page } from '../../core/Page.js';
import { Modal } from '../../core/Modal.js';
import { FormBuilder } from '../../core/FormBuilder.js';
import { Toast } from '../../core/Toast.js';
import { STATUS_LABEL } from '../../views/TournamentRows.js';
import { toOptions, nameOf } from '../resources/options.js';
import { adminEventContext } from '../context.js';

/** Overzicht van toernooien in het beheer + nieuw toernooi aanmaken vanuit een template. */
export class TournamentsAdminPage extends Page {
  get watches() { return ['tournaments', 'games', 'templates']; }

  async load() {
    const [tournaments, games, templates] = await Promise.all([api.get(`/tournaments${adminEventContext.query()}`), api.get('/games'), api.get('/templates')]);
    return { tournaments, games, templates };
  }

  draw({ tournaments, games, templates }) {
    this.games = games;
    this.templates = templates;
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h2', {}, 'Toernooien'), adminEventContext.current ? h('div', { class: 'meta' }, adminEventContext.current.name) : null),
        h('button', { class: 'btn primary', onclick: () => this.#create() }, 'Nieuw toernooi')),
      tournaments.length ? this.#table(tournaments) : h('div', { class: 'empty' }, 'Nog geen toernooien. Maak er een aan vanuit een template.'));
  }

  #table(tournaments) {
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, ['Naam', 'Game', 'Start', 'Deelnemers', 'Status', ''].map((l) => h('th', {}, l)))),
      h('tbody', {}, tournaments.map((t) => h('tr', {},
        h('td', {}, h('a', { href: `#/toernooien/${t.id}` }, t.name)),
        h('td', {}, nameOf(this.games, t.gameId)),
        h('td', {}, formatDate(t.startTime)),
        h('td', {}, t.participants.length),
        h('td', {}, h('span', { class: `status ${t.status}` }, STATUS_LABEL[t.status])),
        h('td', { class: 'num' }, h('a', { class: 'btn small', href: `#/toernooien/${t.id}` }, 'Beheren')))))));
  }

  #create() {
    if (!this.templates.length) return Toast.show('Maak eerst een template aan', { error: true });
    const form = new FormBuilder([
      { key: 'name', label: 'Naam van het toernooi', required: true },
      { key: 'templateId', label: 'Template', type: 'select', required: true, options: toOptions(this.templates) },
      { key: 'gameId', label: 'Game', type: 'select', options: toOptions(this.games) },
      { key: 'startTime', label: 'Start', type: 'datetime-local' },
      { key: 'location', label: 'Locatie / lokaal' },
      { key: 'description', label: 'Beschrijving / regels', type: 'textarea' },
    ]);
    new Modal({
      title: 'Nieuw toernooi',
      body: form.el,
      submitLabel: 'Toernooi aanmaken',
      onSubmit: async () => {
        const created = await api.post('/tournaments', { ...form.values(), eventId: adminEventContext.id });
        location.hash = `#/toernooien/${created.id}`;
      },
      onError: (err) => Toast.error(err),
    }).open();
  }
}
