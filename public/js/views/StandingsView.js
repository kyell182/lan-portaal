import { h } from '../core/dom.js';

const NUMERIC = new Set(['place', 'played', 'wins', 'draws', 'losses', 'scoreFor', 'scoreAgainst', 'diff', 'points', 'buchholz', 'total', 'bonus']);

/** Toont één of meer klassementstabellen in het uniforme formaat van de API. */
export class StandingsView {
  constructor(tables) {
    this.tables = tables;
  }

  render() {
    if (!this.tables.length) return h('div', { class: 'empty' }, 'Het klassement verschijnt zodra het toernooi gestart is.');
    return h('div', {}, this.tables.map((t) => this.#table(t)));
  }

  #table(table) {
    const isNum = (key) => NUMERIC.has(key) || /^[rc]\d+$/.test(key);
    const cell = (tag, key, content) => h(tag, { class: isNum(key) ? 'num' : '' }, content);
    const head = h('tr', {}, table.columns.map((c) => cell('th', c.key, c.label)));
    const rows = table.rows.map((row) => h('tr', { class: row.place === 1 ? 'first' : '' },
      table.columns.map((c) => cell('td', c.key, StandingsView.#value(row[c.key])))));

    return h('section', { class: 'standings-table' },
      this.tables.length > 1 ? h('h3', {}, table.title) : null,
      h('div', { class: 'table-scroll' },
        h('table', { class: 'data' }, h('thead', {}, head), h('tbody', {}, rows))));
  }

  static #value(v) {
    if (v === null || v === undefined) return '–';
    return v;
  }
}
