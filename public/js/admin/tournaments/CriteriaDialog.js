import { h, mount } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Modal } from '../../core/Modal.js';
import { Toast } from '../../core/Toast.js';

/** Criteria van een scorebord toevoegen, hernoemen, herwegen of verwijderen (ook tijdens het toernooi). */
export class CriteriaDialog {
  constructor(tournament) {
    this.t = tournament;
    this.rows = tournament.state.criteria.map((c) => ({ ...c }));
  }

  open() {
    this.list = h('div', { class: 'criteria-grid' });
    this.#draw();
    new Modal({
      title: 'Criteria beheren',
      body: h('div', {},
        h('p', { class: 'muted' }, 'Punten = aantal × punten per eenheid. Een maximum kapt het aantal af (leeg = onbeperkt). Verwijderde criteria wissen ook hun toegekende punten.'),
        this.list,
        h('button', { class: 'btn small', type: 'button', onclick: () => this.#add() }, 'Criterium toevoegen')),
      submitLabel: 'Criteria opslaan',
      onSubmit: async () => {
        await api.post(`/tournaments/${this.t.id}/matches/criteria/result`, { criteria: this.rows });
        Toast.show('Criteria opgeslagen');
      },
      onError: (err) => Toast.error(err),
    }).open();
  }

  #add() {
    this.rows.push({ label: '', weight: 1, max: null });
    this.#draw();
  }

  #remove(row) {
    this.rows = this.rows.filter((r) => r !== row);
    this.#draw();
  }

  #draw() {
    mount(this.list,
      h('span', { class: 'muted' }, 'Naam'), h('span', { class: 'muted' }, 'Ptn/eenheid'), h('span', { class: 'muted' }, 'Max'), h('span'),
      this.rows.map((row) => this.#row(row)));
  }

  #row(row) {
    const field = (key, attrs) => h('input', { value: row[key] ?? '', 'aria-label': key, oninput: (e) => { row[key] = e.target.value; }, ...attrs });
    return [
      field('label', { maxlength: 40, required: true, placeholder: 'bv. Social gelikt' }),
      field('weight', { type: 'number', step: 'any', required: true }),
      field('max', { type: 'number', min: 0, step: 'any' }),
      h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Verwijderen', onclick: () => this.#remove(row) }, '×'),
    ];
  }
}
