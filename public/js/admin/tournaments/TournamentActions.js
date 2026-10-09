import { h } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Modal } from '../../core/Modal.js';
import { Toast } from '../../core/Toast.js';

const ADVANCE_LABEL = {
  swiss: 'Volgende ronde koppelen',
  'groups-knockout': 'Knock-out starten',
  points: 'Ronde toevoegen',
};

/** Knoppen bovenaan een toernooi: bewerken, starten, volgende ronde, terugzetten, verwijderen. */
export class TournamentActions {
  constructor(tournament, { onEdit, onDeleted }) {
    this.t = tournament;
    this.onEdit = onEdit;
    this.onDeleted = onDeleted;
  }

  render() {
    const t = this.t;
    return h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: this.onEdit }, 'Bewerken'),
      t.status === 'draft' ? h('button', { class: 'btn primary', onclick: () => this.#start() }, 'Toernooi starten') : null,
      t.canAdvance ? h('button', { class: 'btn primary', onclick: () => this.#advance() }, ADVANCE_LABEL[t.formatKey] || 'Volgende ronde') : null,
      t.status !== 'draft' ? h('button', { class: 'btn', onclick: () => this.#reset() }, 'Terugzetten naar voorbereiding') : null,
      h('button', { class: 'btn danger', onclick: () => this.#delete() }, 'Verwijderen'));
  }

  #start() {
    const shuffle = h('input', { type: 'checkbox' });
    new Modal({
      title: 'Toernooi starten',
      body: h('div', {},
        h('p', {}, `${this.t.participants.length} deelnemers. Na de start kan je enkel nog namen aanpassen.`),
        h('label', { class: 'field check' }, shuffle, h('span', {}, 'Willekeurige seeding (anders de volgorde uit de deelnemerslijst)'))),
      submitLabel: 'Starten',
      onSubmit: async () => {
        await api.post(`/tournaments/${this.t.id}/start`, { shuffle: shuffle.checked });
        Toast.show('Toernooi gestart');
      },
      onError: (err) => Toast.error(err),
    }).open();
  }

  async #advance() {
    await this.#call(() => api.post(`/tournaments/${this.t.id}/advance`), 'Klaar');
  }

  async #reset() {
    if (!confirm('Alle uitslagen worden gewist en het toernooi gaat terug naar de voorbereiding. Doorgaan?')) return;
    await this.#call(() => api.post(`/tournaments/${this.t.id}/reset`), 'Teruggezet');
  }

  async #delete() {
    if (!confirm(`Toernooi "${this.t.name}" definitief verwijderen?`)) return;
    if (await this.#call(() => api.delete(`/tournaments/${this.t.id}`), 'Verwijderd')) this.onDeleted();
  }

  async #call(fn, message) {
    try {
      await fn();
      Toast.show(message);
      return true;
    } catch (err) {
      Toast.error(err);
      return false;
    }
  }
}
