import { h } from '../core/dom.js';

/** Overzicht van de criteria van een scorebord: waarmee verdien je punten? */
export class ScoreboardView {
  constructor(criteria) {
    this.criteria = criteria;
  }

  render() {
    if (!this.criteria.length) return h('div', { class: 'empty' }, 'Er zijn nog geen criteria. Kijk later opnieuw.');
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Criterium'), h('th', { class: 'num' }, 'Punten per eenheid'), h('th', { class: 'num' }, 'Maximum'))),
      h('tbody', {}, this.criteria.map((c) => h('tr', {},
        h('td', {}, c.label), h('td', { class: 'num' }, c.weight), h('td', { class: 'num' }, c.max ?? '–'))))));
  }
}
