import { h } from '../core/dom.js';

/** Rondes van een puntentoernooi met de uitslag per ronde. */
export class PointsRoundsView {
  constructor({ rounds, names, onRoundClick }) {
    this.rounds = rounds;
    this.names = names;
    this.onRoundClick = onRoundClick;
  }

  render() {
    return h('div', { class: 'grid-2' }, this.rounds.map((r) => this.#round(r)));
  }

  #round(round) {
    const entries = [...round.entries].sort((a, b) => a.place - b.place);
    return h('section', { class: 'panel' },
      h('div', { class: 'page-head' },
        h('h3', {}, round.label),
        this.onRoundClick ? h('button', { class: 'btn small', onclick: () => this.onRoundClick(round) }, round.status === 'done' ? 'Uitslag aanpassen' : 'Uitslag ingeven') : null),
      entries.length
        ? h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, h('th', { class: 'num' }, '#'), h('th', {}, 'Deelnemer'), h('th', { class: 'num' }, 'Bonus'), h('th', { class: 'num' }, 'Ptn'))),
          h('tbody', {}, entries.map((e) => h('tr', {},
            h('td', { class: 'num' }, e.place), h('td', {}, this.names.get(e.pid) || '?'), h('td', { class: 'num' }, e.bonus), h('td', { class: 'num' }, e.points)))))
        : h('p', { class: 'muted' }, 'Nog niet gespeeld.'));
  }
}
