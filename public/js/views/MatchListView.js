import { h } from '../core/dom.js';
import { MatchCard, BYE } from './MatchCard.js';

/** Lijst van matches per ronde/speeldag (competitie, poules, Swiss). */
export class MatchListView {
  constructor({ matches, names, onMatchClick, groupBy = (m) => m.label }) {
    this.matches = matches;
    this.names = names;
    this.onMatchClick = onMatchClick;
    this.groupBy = groupBy;
  }

  render() {
    const groups = new Map();
    for (const m of this.matches) {
      const key = this.groupBy(m);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    return h('div', {}, [...groups.entries()].map(([title, matches]) => h('section', { class: 'round-block' },
      h('h3', {}, title),
      h('div', { class: 'match-rows' }, matches.map((m) => this.#row(m))))));
  }

  #row(m) {
    const [a, b] = m.slots;
    const clickable = this.onMatchClick && !m.auto;
    const cls = (pid) => (m.status === 'done' && m.winner === pid ? 'won' : '');
    const result = m.status === 'done'
      ? (b.pid === BYE ? 'bye' : `${a.score ?? (m.winner === a.pid ? 'W' : '-')} – ${b.score ?? (m.winner === b.pid ? 'W' : '-')}`)
      : 'vs';
    return h('div', {
      class: `match-row${clickable ? ' clickable' : ''}`,
      tabindex: clickable ? 0 : null,
      role: clickable ? 'button' : null,
      onclick: clickable ? () => this.onMatchClick(m) : null,
      onkeydown: clickable ? (e) => { if (e.key === 'Enter') this.onMatchClick(m); } : null,
    },
    h('span', { class: `home ${cls(a.pid)}` }, MatchCard.label(a.pid, this.names)),
    h('span', { class: 'result' }, result),
    h('span', { class: cls(b.pid) }, MatchCard.label(b.pid, this.names)));
  }
}
