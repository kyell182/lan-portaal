import { h } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Toast } from '../../core/Toast.js';
import { CriteriaDialog } from './CriteriaDialog.js';

/** Scorebord beheren: per deelnemer het aantal per criterium ingeven, criteria aanpassen, toernooi afsluiten. */
export class ScoreboardEditor {
  constructor(tournament) {
    this.t = tournament;
    this.inputs = new Map();
    this.dirty = false;
  }

  render() {
    const { criteria } = this.t.state;
    const finished = this.t.status === 'finished';
    return h('section', { class: 'panel' },
      h('div', { class: 'page-head' },
        h('div', {}, h('h3', {}, 'Punten toekennen'), h('div', { class: 'muted' }, 'Geef per deelnemer het aantal in; de punten volgen uit de criteria.')),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => new CriteriaDialog(this.t).open() }, 'Criteria beheren'),
          h('button', { class: 'btn', onclick: () => this.#setFinished(!finished) }, finished ? 'Heropenen' : 'Toernooi afsluiten'),
          criteria.length ? h('button', { class: 'btn primary', onclick: () => this.#save() }, 'Punten opslaan') : null)),
      criteria.length ? this.#table(criteria) : h('div', { class: 'empty' }, 'Voeg eerst criteria toe via "Criteria beheren".'));
  }

  #table(criteria) {
    const head = h('tr', {}, h('th', {}, 'Deelnemer'), criteria.map((c) => h('th', { class: 'num' }, `${c.label} (×${c.weight})`)));
    const rows = this.t.participants.map((p) => h('tr', {}, h('td', {}, p.name), criteria.map((c) => h('td', { class: 'num' }, this.#input(p.id, c)))));
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data' }, h('thead', {}, head), h('tbody', {}, rows)));
  }

  #input(pid, criterion) {
    const input = h('input', {
      type: 'number', step: 'any', class: 'score-input', value: this.t.state.scores[pid]?.[criterion.id] ?? '',
      'aria-label': `${criterion.label} voor ${this.t.participants.find((p) => p.id === pid).name}`,
      oninput: () => { this.dirty = true; },
    });
    this.inputs.set(`${pid}:${criterion.id}`, input);
    return input;
  }

  async #save() {
    const entries = this.t.participants.map((p) => ({
      pid: p.id,
      values: Object.fromEntries(this.t.state.criteria.map((c) => [c.id, this.inputs.get(`${p.id}:${c.id}`).value])),
    }));
    await this.#call(() => api.post(`/tournaments/${this.t.id}/matches/scores/result`, { entries }), 'Punten opgeslagen');
    this.dirty = false;
  }

  #setFinished(finished) {
    return this.#call(() => api.post(`/tournaments/${this.t.id}/matches/status/result`, { finished }), finished ? 'Toernooi afgesloten' : 'Toernooi heropend');
  }

  async #call(fn, message) {
    try {
      await fn();
      Toast.show(message);
    } catch (err) {
      Toast.error(err);
    }
  }
}
