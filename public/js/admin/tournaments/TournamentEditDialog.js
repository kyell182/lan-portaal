import { h } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Modal } from '../../core/Modal.js';
import { FormBuilder } from '../../core/FormBuilder.js';
import { Toast } from '../../core/Toast.js';
import { toOptions } from '../resources/options.js';
import { SettingsForm } from './SettingsForm.js';

/** Toernooi bewerken. Instellingen en type deelnemers enkel voor de start. */
export class TournamentEditDialog {
  constructor(tournament, { games, formats }) {
    this.t = tournament;
    this.games = games;
    this.formats = formats;
  }

  open() {
    const draft = this.t.status === 'draft';
    const fields = [
      { key: 'name', label: 'Naam', required: true },
      { key: 'gameId', label: 'Game', type: 'select', options: toOptions(this.games) },
      { key: 'startTime', label: 'Start', type: 'datetime-local' },
      { key: 'location', label: 'Locatie / lokaal' },
      { key: 'description', label: 'Beschrijving / regels', type: 'textarea' },
    ];
    if (draft) fields.splice(2, 0, { key: 'participantType', label: 'Deelnemers zijn', type: 'select', required: true, options: [{ value: 'team', label: 'Teams' }, { value: 'player', label: 'Spelers' }] });
    const base = new FormBuilder(fields, this.t);
    const settings = draft ? new SettingsForm(this.formats, this.t.formatKey, this.t.settings) : null;

    new Modal({
      title: 'Toernooi bewerken',
      body: h('div', {}, base.el, settings ? settings.el : h('p', { class: 'muted' }, 'Instellingen zijn vergrendeld zolang het toernooi loopt.')),
      submitLabel: 'Wijzigingen opslaan',
      onSubmit: async () => {
        const body = settings ? { ...base.values(), settings: settings.values() } : base.values();
        await api.put(`/tournaments/${this.t.id}`, body);
        Toast.show('Opgeslagen');
      },
      onError: (err) => Toast.error(err),
    }).open();
  }
}
