import { h } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Modal } from '../../core/Modal.js';
import { Toast } from '../../core/Toast.js';

/** Uitslag van één match ingeven: scores, of een winnaar aanduiden (bv. forfait). */
export class ResultDialog {
  constructor(tournament, match, names) {
    this.t = tournament;
    this.match = match;
    this.names = names;
  }

  open() {
    const [a, b] = this.match.slots;
    this.inputs = [a, b].map((slot) => h('input', { type: 'number', min: 0, value: slot.score ?? '', required: true, 'aria-label': `Score ${this.names.get(slot.pid)}` }));
    const body = h('div', {},
      h('p', { class: 'muted' }, `${this.match.label}${this.t.settings.bestOf > 1 ? `, best of ${this.t.settings.bestOf}` : ''}`),
      h('div', { class: 'entry-grid', style: { gridTemplateColumns: '1fr 90px' } },
        [a, b].map((slot, i) => [h('strong', {}, this.names.get(slot.pid)), this.inputs[i]])),
      h('p', { class: 'muted', style: { marginTop: '16px' } }, 'Of duid een winnaar aan zonder score:'),
      h('div', { class: 'actions' }, [a, b].map((slot) => h('button', { class: 'btn small', type: 'button', onclick: () => this.#save({ winner: slot.pid }) }, `${this.names.get(slot.pid)} wint`))));

    this.modal = new Modal({
      title: 'Uitslag ingeven',
      body,
      submitLabel: 'Uitslag opslaan',
      onSubmit: () => this.#submit({ scores: this.inputs.map((i) => Number(i.value)) }),
      onError: (err) => Toast.error(err),
    }).open();
  }

  async #save(payload) {
    try {
      await this.#submit(payload);
      this.modal.close();
    } catch (err) {
      Toast.error(err);
    }
  }

  async #submit(payload) {
    await api.post(`/tournaments/${this.t.id}/matches/${this.match.id}/result`, payload);
    Toast.show('Uitslag opgeslagen');
  }
}
